(function (global) {
    'use strict';

    /* ═══════════════════════════════════════════
       DOMAIN DEFINITIONS & CONSTANTS
       ═══════════════════════════════════════════ */
    var DOMAIN_DEFS = [
        { key: 'home', label: 'Inicio Operacional', icon: '\u26A1' },
        { key: 'operations', label: 'Operacao ao Vivo', icon: '\uD83D\uDCCB' },
        { key: 'force-map', label: 'Mapa Forca', icon: '\uD83D\uDDFA' },
        { key: 'coverage', label: 'Cobertura e Movimentacoes', icon: '\uD83D\uDD04' },
        { key: 'comms', label: 'Comunicacao e Conferencias', icon: '\uD83D\uDCE8' },
        { key: 'compliance', label: 'Conformidade', icon: '\uD83D\uDEE1' },
        { key: 'analytics', label: 'Inteligencia Gerencial', icon: '\uD83D\uDCC8' },
        { key: 'admin', label: 'Administracao', icon: '\u2699' }
    ];
    var REALTIME_TABLES = ['colaboradores', 'unidades', 'checklist_campaigns', 'checklist_submissions',
        'checklist_issues', 'reassignment_requests', 'vehicle_usage', 'movement_executions',
        'saved_views', 'activity_feed', 'audit_log'];
    var UI_PREFS_KEY = 'dunamis-platform-next-ui';
    var ROLE_CAN_VIEW_ALL = { administrador: true, gerencia: true, coordenador: true };

    var STATE = {
        booted: false, activeDomain: 'home', query: '', statusFilter: 'all',
        commandOpen: false, commandIndex: 0,
        drawer: null, drawerEditing: false, drawerTab: 'summary',
        drawerSupport: { loading: false, comments: [], attachments: [], feed: [], audit: [] },
        modal: null, loading: true, refreshTimer: null, realtimeUnsubs: [],
        sessionUser: null, profile: null,
        operationsSort: { col: 'name', asc: true },
        operationsPage: 0, PAGE_SIZE: 50,
        datasets: {
            collaborators: [], units: [], campaigns: [], submissions: [],
            issues: [], reassignments: [], executions: [], vehicleUsage: [],
            profiles: [], savedViews: [], health: null,
            pendingMutations: 0, lastSyncAt: null
        }
    };

    /* ═══════════════════════════════════════════
       UTILITY HELPERS
       ═══════════════════════════════════════════ */
    function getRoot() { return document.getElementById('platform-root'); }
    function getToastRegion() { return document.getElementById('platform-toast-region'); }

    function getClient() {
        if (!global.supabase || !global.CONFIG?.supabase?.url || !global.CONFIG?.supabase?.anonKey)
            throw new Error('Supabase nao configurado.');
        if (!global.__dunamisSupabaseClient)
            global.__dunamisSupabaseClient = global.supabase.createClient(
                global.CONFIG.supabase.url, global.CONFIG.supabase.anonKey, { auth: { persistSession: true } });
        return global.__dunamisSupabaseClient;
    }
    function getAuthService() { return global.DunamisAuthService; }
    function getService() { return global.DunamisSupabaseService; }

    function escapeHtml(v) {
        return String(v == null ? '' : v).replace(/&/g,'&amp;').replace(/</g,'&lt;')
            .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
    }

    function pickFirst(row, keys, fb) {
        for (var i = 0; i < keys.length; i++) {
            var v = row ? row[keys[i]] : null;
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return fb == null ? '' : fb;
    }

    function normalizeText(v) {
        return String(v || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    }

    function titleCase(v) {
        return String(v || '').toLowerCase().split(/\s+/).filter(Boolean)
            .map(function(p) { return p.charAt(0).toUpperCase() + p.slice(1); }).join(' ');
    }

    function formatNumber(v) { return new Intl.NumberFormat('pt-BR').format(Number.isFinite(v) ? v : 0); }

    function formatDateTime(v) {
        if (!v) return '--';
        var d = new Date(v);
        return Number.isNaN(d.getTime()) ? '--' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(d);
    }

    function formatDate(v) {
        if (!v) return '--';
        var d = new Date(v);
        return Number.isNaN(d.getTime()) ? '--' : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(d);
    }

    function showToast(msg, type) {
        var r = getToastRegion(); if (!r) return;
        var t = document.createElement('div');
        t.className = 'platform-toast ' + (type || 'info');
        t.textContent = String(msg || 'Operacao concluida.');
        r.appendChild(t);
        setTimeout(function() { t.remove(); }, 3600);
    }

    function saveUiPrefs() {
        try { localStorage.setItem(UI_PREFS_KEY, JSON.stringify({
            activeDomain: STATE.activeDomain, query: STATE.query, statusFilter: STATE.statusFilter
        })); } catch(_) {}
    }

    function loadUiPrefs() {
        try { var raw = JSON.parse(localStorage.getItem(UI_PREFS_KEY) || '{}');
            if (raw.activeDomain) STATE.activeDomain = String(raw.activeDomain);
            if (raw.query) STATE.query = String(raw.query);
            if (raw.statusFilter) STATE.statusFilter = String(raw.statusFilter);
        } catch(_) {}
    }

    function canViewAllGroups() { return !!ROLE_CAN_VIEW_ALL[String(STATE.profile?.role || '').toLowerCase()]; }

    function inferGroup(row) {
        var explicit = normalizeText(pickFirst(row, ['grupo', 'group_key', 'group', 'shared_group'], ''));
        if (explicit) return explicit;
        var haystack = normalizeText([pickFirst(row, ['unidade_de_negocio', 'empresa', 'cliente', 'cargo', 'posto'], ''),
            pickFirst(row, ['nome', 'colaborador'], '')].join(' '));
        var rules = Array.isArray(global.CONFIG?.groupRules) ? global.CONFIG.groupRules : [];
        for (var i = 0; i < rules.length; i++) {
            var patterns = Array.isArray(rules[i]?.patterns) ? rules[i].patterns : [];
            for (var c = 0; c < patterns.length; c++)
                if (haystack.indexOf(normalizeText(patterns[c])) >= 0) return String(rules[i].key || '').toLowerCase();
        }
        return 'todos';
    }

    function allowedGroups() {
        if (canViewAllGroups()) return [];
        var g = STATE.profile?.groups;
        return Array.isArray(g) && g.length ? g.map(function(x) { return normalizeText(x); }).filter(Boolean) : [];
    }

    function shouldIncludeGroup(group) {
        var a = allowedGroups(); if (!a.length) return true;
        return a.indexOf(normalizeText(group || 'todos')) >= 0;
    }

    /* ═══════════════════════════════════════════
       NORMALIZERS
       ═══════════════════════════════════════════ */
    function normalizeCollaborator(row) {
        var s = normalizeOperationalStatus(row);
        return {
            id: String(pickFirst(row, ['id','matricula','re_padrao','re','colaborador'], '')),
            re: String(pickFirst(row, ['re_padrao','re','matricula','re_folha'], '')),
            name: String(pickFirst(row, ['nome','colaborador'], 'Sem nome')),
            phone: String(pickFirst(row, ['telefone','celular','whatsapp'], '')),
            unit: String(pickFirst(row, ['posto','unidade','unidade_de_negocio'], 'Sem posto')),
            schedule: String(pickFirst(row, ['escala','turno','horario'], '--')),
            role: String(pickFirst(row, ['cargo','funcao'], 'Operacao')),
            group: inferGroup(row), status: s,
            risk: computeCollaboratorRisk(row, s), raw: row || {}
        };
    }

    function normalizeUnit(row) {
        var n = String(pickFirst(row, ['posto','nome','unidade','cliente'], 'Sem unidade'));
        return {
            id: String(pickFirst(row, ['id','posto','nome'], n)), name: n,
            client: String(pickFirst(row, ['cliente','empresa','unidade_de_negocio'], '--')),
            supervisor: String(pickFirst(row, ['supervisor','responsavel','gestor'], '--')),
            expected: inferExpectedHeadcount(row), group: inferGroup(row), raw: row || {}
        };
    }

    function normalizeWorkflow(row, type) {
        return {
            id: String(pickFirst(row, ['id','public_token'], '')), type: type,
            tableName: workflowTableName(type),
            title: String(pickFirst(row, ['title','campaign_name','summary','placa','vehicle_plate'], titleCase(type))),
            status: String(pickFirst(row, ['status','workflow_status','state'], 'open')),
            group: inferGroup(row),
            unit: String(pickFirst(row, ['unit','posto','target_unit','origem','destino'], '')),
            owner: String(pickFirst(row, ['owner_name','requested_by','driver_name','created_by'], 'Equipe')),
            updatedAt: String(pickFirst(row, ['updated_at','created_at','submitted_at'], '')),
            raw: row || {}
        };
    }

    function workflowTableName(type) {
        var m = { campaign:'checklist_campaigns', issue:'checklist_issues',
            reassignment:'reassignment_requests', execution:'movement_executions', vehicle:'vehicle_usage' };
        return m[type] || '';
    }

    function normalizeOperationalStatus(row) {
        var raw = normalizeText(pickFirst(row, ['status_operacional','status','situacao'], ''));
        if (raw.indexOf('afast') >= 0 || raw.indexOf('licen') >= 0) return 'afastado';
        if (raw.indexOf('ft') >= 0) return 'ft';
        if (raw.indexOf('folga') >= 0 || raw.indexOf('descanso') >= 0) return 'folga';
        var scale = normalizeText(pickFirst(row, ['escala','turno'], ''));
        if (scale.indexOf('folga') >= 0) return 'folga';
        return 'plantao';
    }

    function inferExpectedHeadcount(row) {
        var keys = ['efetivo_previsto','headcount','quantidade_prevista','qtd_prevista','efetivo','previstos'];
        for (var i = 0; i < keys.length; i++) {
            var n = Number(row ? row[keys[i]] : NaN);
            if (Number.isFinite(n) && n > 0) return n;
        }
        return 0;
    }

    function computeCollaboratorRisk(row, status) {
        if (status === 'afastado') return 'high';
        var dateKeys = Object.keys(row || {}).filter(function(k) {
            var n = normalizeText(k);
            return n.indexOf('venc') >= 0 || n.indexOf('valid') >= 0 || n.indexOf('expir') >= 0;
        });
        var now = Date.now();
        for (var i = 0; i < dateKeys.length; i++) {
            var rv = row[dateKeys[i]]; if (!rv) continue;
            var p = new Date(rv); if (Number.isNaN(p.getTime())) continue;
            var diff = Math.round((p.getTime() - now) / 86400000);
            if (diff < 0) return 'high';
            if (diff <= 20) return 'medium';
        }
        return status === 'ft' ? 'medium' : 'low';
    }

    function statusLabel(s) { return { afastado:'Afastado', folga:'Folga', ft:'FT' }[s] || 'Plantao'; }
    function statusBadge(s) { return 'badge-' + s; }
    function riskLabel(r) { return { high:'Critico', medium:'Atencao' }[r] || 'Estavel'; }
    function riskBadge(r) { return 'badge-' + r; }

    /* ═══════════════════════════════════════════
       DATA MANAGEMENT
       ═══════════════════════════════════════════ */
    function debounceRefresh(ms) {
        clearTimeout(STATE.refreshTimer);
        STATE.refreshTimer = setTimeout(function() {
            refreshAllData(true).catch(function(e) { showToast(String(e?.message||e), 'error'); });
        }, ms || 120);
    }

    async function safeFetchAll(table) {
        var svc = getService();
        if (!svc || typeof svc.fetchAllRows !== 'function') return [];
        try { return await svc.fetchAllRows({ table: table, select: '*', pageSize: 1000, timeoutMs: 30000 }); }
        catch(e) { if (isMissingRelationError(e)) return []; throw e; }
    }

    async function safeList(table, opts) {
        var svc = getService();
        if (!svc || typeof svc.list !== 'function') return [];
        try { return await svc.list(table, opts || {}); }
        catch(e) { if (isMissingRelationError(e)) return []; throw e; }
    }

    function isMissingRelationError(e) {
        var c = String(e?.code || ''), m = normalizeText(e?.message || e || '');
        return c === '42P01' || m.indexOf('does not exist') >= 0 || m.indexOf('nao existe') >= 0;
    }

    async function fetchOrCreateProfile(user) {
        var client = getClient();
        try {
            var existing = await client.from('profiles').select('*').eq('id', user.id).maybeSingle();
            if (!existing.error && existing.data) {
                existing.data.groups = Array.isArray(existing.data.groups) ? existing.data.groups : [];
                return existing.data;
            }
        } catch(e) { if (!isMissingRelationError(e)) throw e; }
        var isBootstrap = Array.isArray(global.CONFIG?.auth?.bootstrapAdmins) &&
            global.CONFIG.auth.bootstrapAdmins.some(function(em) { return normalizeText(em) === normalizeText(user.email); });
        var draft = { id: user.id, email: user.email || '', role: isBootstrap ? 'administrador' : 'operacional', groups: [] };
        try {
            var created = await client.from('profiles').upsert(draft).select('*').maybeSingle();
            if (!created.error && created.data) { created.data.groups = Array.isArray(created.data.groups) ? created.data.groups : []; return created.data; }
        } catch(_) {}
        return draft;
    }

    async function refreshAllData(force) {
        STATE.loading = true; renderApp();
        var svc = getService();
        var results = await Promise.all([
            safeFetchAll('colaboradores'), safeFetchAll('unidades'),
            safeList('checklist_campaigns', { select:'*', orderBy:'updated_at', ascending:false, limit:60 }),
            safeList('checklist_submissions', { select:'*', orderBy:'updated_at', ascending:false, limit:100 }),
            safeList('checklist_issues', { select:'*', orderBy:'updated_at', ascending:false, limit:60 }),
            safeList('reassignment_requests', { select:'*', orderBy:'updated_at', ascending:false, limit:60 }),
            safeList('movement_executions', { select:'*', orderBy:'updated_at', ascending:false, limit:40 }),
            safeList('vehicle_usage', { select:'*', orderBy:'updated_at', ascending:false, limit:40 }),
            canViewAllGroups() ? safeList('profiles', { select:'*', orderBy:'updated_at', ascending:false, limit:100 }) : Promise.resolve([]),
            svc && typeof svc.listSavedViews === 'function' ? svc.listSavedViews().catch(function(){return[];}) : Promise.resolve([]),
            svc && typeof svc.healthCheck === 'function' ? svc.healthCheck().catch(function(){return null;}) : Promise.resolve(null),
            svc && typeof svc.getPendingMutationCount === 'function' ? Promise.resolve(svc.getPendingMutationCount()) : Promise.resolve(0)
        ]);

        var collabs = (results[0]||[]).map(normalizeCollaborator).filter(function(x){return shouldIncludeGroup(x.group);});
        var units = (results[1]||[]).map(normalizeUnit).filter(function(x){return shouldIncludeGroup(x.group);});
        var campaigns = (results[2]||[]).map(function(r){return normalizeWorkflow(r,'campaign');}).filter(function(x){return shouldIncludeGroup(x.group);});
        var submissions = results[3] || [];
        var issues = (results[4]||[]).map(function(r){return normalizeWorkflow(r,'issue');}).filter(function(x){return shouldIncludeGroup(x.group);});
        var reassignments = (results[5]||[]).map(function(r){return normalizeWorkflow(r,'reassignment');}).filter(function(x){return shouldIncludeGroup(x.group);});
        var executions = (results[6]||[]).map(function(r){return normalizeWorkflow(r,'execution');}).filter(function(x){return shouldIncludeGroup(x.group);});
        var vehicleUsage = (results[7]||[]).map(function(r){return normalizeWorkflow(r,'vehicle');}).filter(function(x){return shouldIncludeGroup(x.group);});

        STATE.datasets.collaborators = collabs;
        STATE.datasets.units = hydrateUnitsWithCoverage(units, collabs, issues);
        STATE.datasets.campaigns = campaigns;
        STATE.datasets.submissions = submissions;
        STATE.datasets.issues = issues;
        STATE.datasets.reassignments = reassignments;
        STATE.datasets.executions = executions;
        STATE.datasets.vehicleUsage = vehicleUsage;
        STATE.datasets.profiles = Array.isArray(results[8]) ? results[8] : [];
        STATE.datasets.savedViews = Array.isArray(results[9]) ? results[9] : [];
        STATE.datasets.health = results[10] || null;
        STATE.datasets.pendingMutations = Number(results[11] || 0);
        STATE.datasets.lastSyncAt = new Date().toISOString();
        STATE.loading = false;
        if (force) showToast('Dados sincronizados com Supabase.', 'success');
        renderApp();
    }

    function hydrateUnitsWithCoverage(units, collabs, issues) {
        var counts = {};
        collabs.forEach(function(c) {
            var k = c.unit; counts[k] = counts[k] || { total:0, ft:0, away:0 };
            counts[k].total++; if (c.status==='ft') counts[k].ft++;
            if (c.status==='afastado'||c.status==='folga') counts[k].away++;
        });
        var issueCounts = {};
        (issues||[]).forEach(function(i) { var k = i.unit||'Sem unidade'; issueCounts[k] = (issueCounts[k]||0)+1; });
        return units.map(function(u) {
            var cv = counts[u.name]||{total:0,ft:0,away:0};
            var exp = u.expected||cv.total; var gap = exp - cv.total;
            var risk = gap > 0 || (issueCounts[u.name]||0) > 0 ? (gap >= 2 ? 'high' : 'medium') : 'low';
            return Object.assign({}, u, { actual:cv.total, gap:gap, ft:cv.ft, away:cv.away, issueCount:issueCounts[u.name]||0, risk:risk });
        }).sort(function(a,b) { return (b.gap||0) - (a.gap||0); });
    }

    function filteredCollaborators() {
        var q = normalizeText(STATE.query), s = STATE.statusFilter;
        var list = STATE.datasets.collaborators.filter(function(c) {
            if (s !== 'all' && c.status !== s) return false;
            if (!q) return true;
            return normalizeText([c.name,c.re,c.unit,c.role,c.group].join(' ')).indexOf(q) >= 0;
        });
        var col = STATE.operationsSort.col, asc = STATE.operationsSort.asc;
        list.sort(function(a,b) {
            var va = String(a[col]||'').toLowerCase(), vb = String(b[col]||'').toLowerCase();
            return asc ? va.localeCompare(vb) : vb.localeCompare(va);
        });
        return list;
    }

    /* ═══════════════════════════════════════════
       WORKFLOW HELPERS
       ═══════════════════════════════════════════ */
    function generatePublicToken() { return 'pub-' + Math.random().toString(36).slice(2,10) + Date.now().toString(36); }
    function buildPublicWorkflowUrl(token) { return token ? global.location.origin + global.location.pathname + '?public-token=' + encodeURIComponent(token) : ''; }
    function getPublicTokenFromUrl() { var p = new global.URLSearchParams(global.location.search||''); return p.get('public-token')||p.get('token')||''; }
    function parseFieldValue(raw) {
        var t = String(raw==null?'':raw).trim(); if(!t) return '';
        if(t==='true') return true; if(t==='false') return false; if(t==='null') return null;
        if(/^-?\d+(\.\d+)?$/.test(t)) return Number(t);
        try { if((t[0]==='{'||t[0]==='[')) return JSON.parse(t); } catch(_){}
        return t;
    }

    function workflowStatusOptions(entity) {
        if (!entity) return [];
        var map = {
            campaign: { draft:[{l:'Ativar',v:'active'}], active:[{l:'Encerrar',v:'closed'}] },
            issue: { 'new':[{l:'Triar',v:'triage'}], triage:[{l:'Resolver',v:'resolved'}], approved:[{l:'Resolver',v:'resolved'}], executing:[{l:'Resolver',v:'resolved'}] },
            reassignment: { 'new':[{l:'Triagem',v:'triage'}], triage:[{l:'Enviar aprovacao',v:'pending_approval'}], pending_approval:[{l:'Aprovar',v:'approved'},{l:'Rejeitar',v:'rejected'}], approved:[{l:'Executar',v:'executing'}], executing:[{l:'Concluir',v:'resolved'}] },
            execution: { pending:[{l:'Iniciar',v:'running'}], running:[{l:'Concluir',v:'done'}] },
            vehicle: { open:[{l:'Em rota',v:'in_route'}], in_route:[{l:'Fechar',v:'closed'}] }
        };
        var m = map[entity.type]; if (!m) return [];
        return (m[entity.status]||[]).map(function(x){return{label:x.l,value:x.v};});
    }

    async function updateWorkflowStatus(status) {
        var svc = getService(), entity = findDrawerEntity();
        if (!svc||!entity||STATE.drawer?.type!=='workflow') return;
        var payload = { status: status };
        if (entity.type==='reassignment') {
            if(status==='pending_approval') payload.approval_stage='supervisor';
            if(status==='approved') { payload.approval_stage='approved'; payload.approved_at=new Date().toISOString(); }
            if(status==='rejected') payload.approval_stage='rejected';
            if(status==='resolved') payload.executed_at=new Date().toISOString();
        }
        if(entity.type==='issue'&&status==='resolved') payload.resolved_at=new Date().toISOString();
        if(entity.type==='execution'&&status==='done') payload.completed_at=new Date().toISOString();
        await svc.updateWorkflowRecord(entity.tableName, entity.id, payload);
        if(typeof svc.logAudit==='function') svc.logAudit({entityType:'workflow',entityId:entity.id,action:'status_change',nextValue:payload}).catch(function(){});
        if(typeof svc.createActivityFeed==='function') svc.createActivityFeed({entityType:'workflow',entityId:entity.id,action:'status_change',unit:entity.unit||null,summary:'Status atualizado para '+titleCase(status),payload:payload}).catch(function(){});
        await refreshAllData(false);
        openDrawer('workflow', entity.id);
        showToast('Workflow atualizado.', 'success');
    }

    async function submitCampaignComposer(form) {
        var svc = getService();
        if(!svc||typeof svc.createWorkflowRecord!=='function'){showToast('Servico indisponivel.','error');return;}
        var pub = form.get('public_enabled')==='true', token = pub ? generatePublicToken() : null;
        var payload = {
            campaign_type:String(form.get('campaign_type')||'documents_collaborator'),
            title:String(form.get('title')||'').trim(), description:String(form.get('description')||'').trim(),
            group_key:STATE.profile?.groups?.[0]||null, unit:String(form.get('unit')||'').trim()||null,
            target_role:String(form.get('target_role')||'').trim()||null,
            target_re:String(form.get('target_re')||'').trim()||null,
            target_name:String(form.get('target_name')||'').trim()||null,
            target_email:String(form.get('target_email')||'').trim()||null,
            due_at:String(form.get('due_at')||'').trim()||null, status:'draft',
            public_enabled:pub, public_token:token,
            form_schema:{sections:['confirmacao','divergencia','observacoes','evidencias'],version:1},
            payload:pub?{publicUrl:buildPublicWorkflowUrl(token)}:{}
        };
        if(!payload.title){showToast('Informe o titulo.','info');return;}
        await svc.createWorkflowRecord('checklist_campaigns', payload);
        closeModal(); await refreshAllData(false);
        showToast(pub?'Campanha criada com link publico.':'Campanha criada.','success');
    }

    async function submitReassignmentComposer(form) {
        var svc = getService();
        if(!svc||typeof svc.createWorkflowRecord!=='function'){showToast('Servico indisponivel.','error');return;}
        var payload = {
            requester_profile_id:STATE.profile?.id||STATE.sessionUser?.id||null,
            requester_role:STATE.profile?.role||'operacional',
            collab_re:String(form.get('collab_re')||'').trim(),
            collab_name:String(form.get('collab_name')||'').trim()||null,
            from_unit:String(form.get('from_unit')||'').trim()||null,
            to_unit:String(form.get('to_unit')||'').trim()||null,
            from_schedule:String(form.get('from_schedule')||'').trim()||null,
            to_schedule:String(form.get('to_schedule')||'').trim()||null,
            movement_type:String(form.get('movement_type')||'remanejamento'),
            reason:String(form.get('reason')||'').trim(),
            has_coverage:form.get('has_coverage')==='true',
            impacts_ft:form.get('impacts_ft')==='true',
            impacts_meal:form.get('impacts_meal')==='true',
            impacts_transport:form.get('impacts_transport')==='true',
            approval_required:form.get('approval_required')!=='false',
            approval_stage:form.get('approval_required')==='false'?'not_required':'draft',
            status:'new', payload:{requestedFromShell:'platform-rebuild'}
        };
        if(!payload.collab_re){showToast('Informe ao menos o RE.','info');return;}
        await svc.createWorkflowRecord('reassignment_requests', payload);
        closeModal(); await refreshAllData(false);
        showToast('Solicitacao criada.','success');
    }

    async function submitVehicleComposer(form) {
        var svc = getService();
        if(!svc||typeof svc.createWorkflowRecord!=='function'){showToast('Servico indisponivel.','error');return;}
        var payload = {
            vehicle_plate:String(form.get('vehicle_plate')||'').trim().toUpperCase(),
            driver_name:String(form.get('driver_name')||'').trim()||null,
            driver_re:String(form.get('driver_re')||'').trim()||null,
            role_label:String(form.get('role_label')||'').trim()||null,
            group_key:STATE.profile?.groups?.[0]||null,
            unit:String(form.get('unit')||'').trim()||null,
            route_plan:String(form.get('route_plan')||'').trim()||null,
            odometer_start:Number(form.get('odometer_start'))||null,
            start_time:new Date().toISOString(), status:'open',
            checklist:{}, payload:{requestedFromShell:'platform-rebuild'}
        };
        if(!payload.vehicle_plate){showToast('Informe a placa.','info');return;}
        await svc.createWorkflowRecord('vehicle_usage', payload);
        closeModal(); await refreshAllData(false);
        showToast('Registro de veiculo criado.','success');
    }

    /* ═══════════════════════════════════════════
       DRAWER / ENTITY SUPPORT
       ═══════════════════════════════════════════ */
    function openDrawer(type, id) {
        STATE.drawer = { type:type, id:String(id) }; STATE.drawerEditing = false; STATE.drawerTab = 'summary';
        STATE.drawerSupport = { loading:type!=='workflow', comments:[], attachments:[], feed:[], audit:[] };
        renderApp();
        hydrateDrawerSupport().catch(function(){STATE.drawerSupport={loading:false,comments:[],attachments:[],feed:[],audit:[]};renderApp();});
    }
    function closeDrawer() { STATE.drawer = null; STATE.drawerEditing = false; STATE.drawerSupport = { loading:false, comments:[], attachments:[], feed:[], audit:[] }; renderApp(); }
    function openModal(type) { STATE.modal = { type:type }; renderApp(); }
    function closeModal() { STATE.modal = null; renderApp(); }

    function findDrawerEntity() {
        if (!STATE.drawer) return null;
        if (STATE.drawer.type==='unit') return STATE.datasets.units.find(function(x){return String(x.id)===String(STATE.drawer.id);})||null;
        if (STATE.drawer.type==='workflow') return STATE.datasets.campaigns.concat(STATE.datasets.issues,STATE.datasets.reassignments,STATE.datasets.executions,STATE.datasets.vehicleUsage).find(function(x){return String(x.id)===String(STATE.drawer.id);})||null;
        return STATE.datasets.collaborators.find(function(x){return String(x.id)===String(STATE.drawer.id);})||null;
    }

    function getEntitySupportType(t) { return t==='unit'?'unit':t==='workflow'?'workflow':'collaborator'; }
    function getEntityRecordId(t, e) {
        if(!e) return '';
        if(t==='unit') return String(pickFirst(e.raw||e,['posto','nome','id'],e.name||e.id||''));
        if(t==='workflow') return String(e.id||pickFirst(e.raw||e,['id','public_token'],''));
        return String(pickFirst(e.raw||e,['re_padrao','re','matricula','id'],e.id||''));
    }

    async function hydrateDrawerSupport() {
        if(!STATE.drawer) return;
        var entity = findDrawerEntity();
        if(!entity||STATE.drawer.type==='workflow'){STATE.drawerSupport={loading:false,comments:[],attachments:[],feed:[],audit:[]};renderApp();return;}
        STATE.drawerSupport = {loading:true,comments:[],attachments:[],feed:[],audit:[]}; renderApp();
        var et = getEntitySupportType(STATE.drawer.type), eid = getEntityRecordId(STATE.drawer.type, entity);
        var reqs = [
            safeList('entity_comments',{select:'*',filters:[{column:'entity_type',value:et},{column:'entity_id',value:eid}],orderBy:'created_at',ascending:false,limit:20}),
            safeList('attachments',{select:'*',filters:[{column:'entity_type',value:et},{column:'entity_id',value:eid}],orderBy:'created_at',ascending:false,limit:20}),
            safeList('activity_feed',{select:'*',filters:[{column:'entity_type',value:et},{column:'entity_id',value:eid}],orderBy:'created_at',ascending:false,limit:20}),
            safeList('audit_log',{select:'*',filters:[{column:'entity_type',value:et},{column:'entity_id',value:eid}],orderBy:'created_at',ascending:false,limit:20})
        ];
        var res = await Promise.all(reqs.map(function(r){return Promise.resolve(r).catch(function(){return[]});}));
        if(!STATE.drawer) return;
        STATE.drawerSupport = {loading:false, comments:res[0]||[], attachments:res[1]||[], feed:res[2]||[], audit:res[3]||[]};
        renderApp();
    }

    async function saveCurrentView() {
        var svc = getService();
        if(!svc||typeof svc.saveSavedView!=='function'){showToast('Servico indisponivel.','error');return;}
        var dom = DOMAIN_DEFS.find(function(d){return d.key===STATE.activeDomain;});
        var title = global.prompt('Nome da view salva:', dom?.label||'View');
        if(!title) return;
        await svc.saveSavedView('platform-shell', title, {domain:STATE.activeDomain,query:STATE.query,statusFilter:STATE.statusFilter}, {isDefault:false,visibilityScope:'private'});
        await refreshAllData(false);
        showToast('View salva.','success');
    }

    function applySavedViewById(id) {
        var v = STATE.datasets.savedViews.find(function(x){return String(x.id)===String(id||'');});
        if(!v){showToast('Selecione uma view.','info');return;}
        var f = v.filters||{};
        if(f.domain) STATE.activeDomain = String(f.domain);
        STATE.query = String(f.query||''); STATE.statusFilter = String(f.statusFilter||'all');
        saveUiPrefs(); renderApp();
    }

    /* ═══════════════════════════════════════════
       COMPUTED DATA
       ═══════════════════════════════════════════ */
    function buildMetrics() {
        var wf = filteredCollaborators(), units = STATE.datasets.units;
        var riskUnits = units.filter(function(u){return u.risk!=='low';}).length;
        var openIssues = STATE.datasets.issues.filter(function(i){return i.status!=='resolved'&&i.status!=='cancelled';}).length;
        var activeMoves = STATE.datasets.reassignments.filter(function(r){return r.status!=='resolved'&&r.status!=='cancelled'&&r.status!=='rejected';}).length;
        var plantao = wf.filter(function(c){return c.status==='plantao';}).length;
        var ftCount = wf.filter(function(c){return c.status==='ft';}).length;
        var awayCount = wf.filter(function(c){return c.status==='afastado';}).length;
        return {
            total:wf.length, plantao:plantao, ft:ftCount, away:awayCount,
            riskUnits:riskUnits, units:units.length,
            openIssues:openIssues, activeMoves:activeMoves,
            campaigns:STATE.datasets.campaigns.length, submissions:STATE.datasets.submissions.length,
            vehicles:STATE.datasets.vehicleUsage.filter(function(v){return v.status==='open'||v.status==='in_route';}).length,
            highRisk:STATE.datasets.collaborators.filter(function(c){return c.risk==='high';}).length
        };
    }

    function topSignals() {
        return STATE.datasets.issues.slice(0,4).concat(STATE.datasets.reassignments.slice(0,4))
            .sort(function(a,b){return new Date(b.updatedAt||0).getTime()-new Date(a.updatedAt||0).getTime();}).slice(0,6);
    }

    function analyticsSeries() {
        var byGroup = {};
        STATE.datasets.collaborators.forEach(function(c) {
            byGroup[c.group] = byGroup[c.group]||{total:0,away:0,ft:0,risk:0};
            byGroup[c.group].total++; if(c.status!=='plantao') byGroup[c.group].away++;
            if(c.status==='ft') byGroup[c.group].ft++;
            if(c.risk!=='low') byGroup[c.group].risk++;
        });
        return Object.keys(byGroup).map(function(g) {
            var v = byGroup[g], score = v.total ? Math.max(0, 100-Math.round((v.away/v.total)*100)) : 0;
            return { label:titleCase(g), total:v.total, away:v.away, ft:v.ft, risk:v.risk, score:score };
        }).sort(function(a,b){return b.total-a.total;});
    }

    function commandItems() {
        var q = normalizeText(STATE.query);
        var items = DOMAIN_DEFS.map(function(d) {
            return { id:'d-'+d.key, title:d.label, sub:'Navegar', icon:d.icon,
                action:function(){STATE.activeDomain=d.key;STATE.commandOpen=false;saveUiPrefs();renderApp();}};
        });
        items = items.concat(filteredCollaborators().slice(0,8).map(function(c) {
            return { id:'c-'+c.id, title:c.name, sub:c.unit+' \u00B7 RE '+c.re, icon:'\uD83D\uDC64',
                action:function(){openDrawer('collaborator',c.id);STATE.commandOpen=false;}};
        }));
        items = items.concat(STATE.datasets.units.slice(0,6).map(function(u) {
            return { id:'u-'+u.id, title:u.name, sub:u.client, icon:'\uD83C\uDFE2',
                action:function(){openDrawer('unit',u.id);STATE.commandOpen=false;}};
        }));
        if (!q) return items;
        return items.filter(function(i){return normalizeText(i.title+' '+i.sub).indexOf(q) >= 0;});
    }

    /* ═══════════════════════════════════════════
       RENDER: LOGIN
       ═══════════════════════════════════════════ */
    function renderLogin() {
        var root = getRoot(); if(!root) return;
        root.innerHTML =
            '<div class="login-shell">'+
                '<div class="login-hero">'+
                    '<div class="login-brand">'+
                        '<div class="brand-mark"><img class="brand-logo" src="images/logo-dunamis-servicos.png" alt="Dunamis"><div><strong>Dunamis</strong><span>Control Center</span></div></div>'+
                        '<h1 class="login-headline">Plataforma operacional de campo</h1>'+
                        '<p class="login-copy">Dispatch, mapa forca, conferencias, cobertura e inteligencia gerencial em um unico sistema. Construido sobre Supabase com dados em tempo real.</p>'+
                    '</div>'+
                    '<div class="hero-grid">'+
                        '<div class="hero-card"><span>Operacao</span><h3>Centro de comando</h3><p>Efetivo, postos e cobertura em grade unica.</p></div>'+
                        '<div class="hero-card"><span>Conferencias</span><h3>Workflows formais</h3><p>Campanhas, divergencias e remanejamentos auditaveis.</p></div>'+
                        '<div class="hero-card"><span>Gerencia</span><h3>Mapa Forca + BI</h3><p>Auditoria global e indicadores de desempenho.</p></div>'+
                    '</div>'+
                '</div>'+
                '<div class="login-panel-wrap">'+
                    '<div class="login-form-panel">'+
                        '<div><span class="eyebrow">Acesso seguro</span><h2>Entrar na plataforma</h2><p class="helper">Use seu login Supabase para acessar o sistema.</p></div>'+
                        '<form id="platform-login-form">'+
                            '<div class="field"><label>E-mail</label><input id="platform-email" name="email" type="email" autocomplete="username" placeholder="voce@dunamis.com"></div>'+
                            '<div class="field"><label>Senha</label><input id="platform-password" name="password" type="password" autocomplete="current-password" placeholder="Sua senha"></div>'+
                            '<label class="remember-row"><input id="platform-remember" type="checkbox"><span>Manter-me conectado</span></label>'+
                            '<div class="button-row"><button class="btn-primary" type="submit">Entrar</button><button class="btn-ghost" type="button" data-action="forgot-password">Esqueci a senha</button></div>'+
                        '</form>'+
                    '</div>'+
                '</div>'+
            '</div>';
        var form = document.getElementById('platform-login-form');
        if(form) form.addEventListener('submit', onLoginSubmit, {once:true});
        var forgot = root.querySelector('[data-action="forgot-password"]');
        if(forgot) forgot.addEventListener('click', onPasswordReset, {once:true});
    }

    async function onLoginSubmit(e) {
        e.preventDefault();
        var auth = getAuthService(), email = document.getElementById('platform-email')?.value.trim()||'',
            pw = document.getElementById('platform-password')?.value||'',
            remember = document.getElementById('platform-remember')?.checked||false;
        if(!auth){showToast('Auth indisponivel.','error');renderLogin();return;}
        try {
            await auth.login(email,pw);
            if(remember) {
                try { localStorage.setItem('dunamis-remember-me','1'); } catch(e){}
            } else {
                try { localStorage.removeItem('dunamis-remember-me'); } catch(e){}
                try { sessionStorage.setItem('dunamis-active-session','1'); } catch(e){}
            }
            showToast('Sessao autenticada.','success');
        }
        catch(err) { showToast(String(err?.message||'Falha no login.'),'error'); renderLogin(); }
    }

    async function onPasswordReset() {
        var email = document.getElementById('platform-email')?.value.trim()||'';
        if(!email){showToast('Informe o e-mail.','info');renderLogin();return;}
        try { var client = getClient(); await client.auth.resetPasswordForEmail(email, {redirectTo:global.location.origin+global.location.pathname});
            showToast('E-mail de reset enviado.','success'); } catch(err) { showToast(String(err?.message||'Falha.'),'error'); }
        renderLogin();
    }

    /* ═══════════════════════════════════════════
       RENDER: PUBLIC CAMPAIGN
       ═══════════════════════════════════════════ */
    async function renderPublicCampaignPage() {
        var token = getPublicTokenFromUrl(); if(!token) return false;
        var root = getRoot(); if(!root) return true;
        root.innerHTML = '<div class="public-page"><div class="public-card"><div class="loading-state"><div class="loading-spinner"></div><p>Carregando conferencia...</p></div></div></div>';
        var camps = await safeList('checklist_campaigns',{select:'*',filters:[{column:'public_token',value:token},{column:'public_enabled',value:true}],limit:1});
        var camp = camps&&camps[0];
        if(!camp){root.innerHTML='<div class="public-page"><div class="public-card"><h2>Link indisponivel</h2><p class="helper">Conferencia nao encontrada ou token invalido.</p></div></div>';return true;}
        root.innerHTML =
            '<div class="public-page"><div class="public-card">'+
                '<span class="eyebrow">Conferencia publica</span>'+
                '<h1>'+escapeHtml(camp.title||'Checklist operacional')+'</h1>'+
                '<p class="helper">'+escapeHtml(camp.description||'Preencha e envie para a operacao.')+'</p>'+
                '<div class="public-stats"><div class="ps-item"><small>Tipo</small><strong>'+escapeHtml(titleCase(camp.campaign_type||'campanha'))+'</strong></div><div class="ps-item"><small>Unidade</small><strong>'+escapeHtml(camp.unit||'--')+'</strong></div><div class="ps-item"><small>Prazo</small><strong>'+escapeHtml(formatDateTime(camp.due_at))+'</strong></div></div>'+
                '<form id="public-campaign-form">'+
                    '<div class="form-grid">'+
                        '<div class="field"><label>Conferencia confirmada?</label><select name="confirmed" class="form-input"><option value="sim">Sim</option><option value="nao">Nao</option></select></div>'+
                        '<div class="field"><label>Existe divergencia?</label><select name="discrepancy" class="form-input"><option value="nao">Nao</option><option value="sim">Sim</option></select></div>'+
                        '<div class="field"><label>Efetivo atual</label><input name="actualHeadcount" type="number" min="0" placeholder="0" class="form-input"></div>'+
                        '<div class="field full"><label>Observacoes</label><textarea name="notes" rows="3" placeholder="Descreva a situacao" class="form-input form-textarea"></textarea></div>'+
                        '<div class="field full"><label>Evidencia</label><textarea name="evidence" rows="2" placeholder="Link, foto ou referencia" class="form-input form-textarea"></textarea></div>'+
                    '</div>'+
                    '<div class="button-row" style="margin-top:12px"><button class="btn-primary" type="submit">Enviar conferencia</button></div>'+
                '</form>'+
            '</div></div>';
        var form = document.getElementById('public-campaign-form');
        if(form) form.addEventListener('submit', function(ev) {
            ev.preventDefault();
            var fd = new FormData(form), svc = getService(); if(!svc) return;
            var ans = {confirmed:String(fd.get('confirmed')||''),discrepancy:String(fd.get('discrepancy')||''),notes:String(fd.get('notes')||''),evidence:String(fd.get('evidence')||''),actualHeadcount:String(fd.get('actualHeadcount')||'')};
            svc.createChecklistSubmission({campaign_id:camp.id,submission_type:'public_link',target_name:camp.target_name||null,target_re:camp.target_re||null,unit:camp.unit||null,status:ans.discrepancy==='sim'?'triage':'received',answers:ans,evidences:ans.evidence?[{label:'evidence',value:ans.evidence}]:[],summary:{hasDiscrepancy:ans.discrepancy==='sim',campaignType:camp.campaign_type,submittedVia:'public_link'}})
            .then(function(){
                if(ans.discrepancy==='sim'&&typeof svc.createChecklistIssue==='function')
                    return svc.createChecklistIssue({campaign_id:camp.id,issue_type:camp.campaign_type,title:'Divergencia via link publico',description:ans.notes||'Divergencia.',severity:camp.campaign_type==='unit_conference'?'high':'normal',group_key:camp.group_key||null,unit:camp.unit||null,collab_re:camp.target_re||null,status:'new',payload:{answers:ans,publicToken:token}});
            }).then(function(){
                root.innerHTML='<div class="public-page"><div class="public-card"><h2>Resposta enviada</h2><p class="helper">Conferencia registrada e encaminhada para triagem.</p></div></div>';
            }).catch(function(err){showToast(String(err?.message||'Falha.'),'error');});
        }, {once:true});
        return true;
    }

    /* ═══════════════════════════════════════════
       RENDER: HOME DOMAIN
       ═══════════════════════════════════════════ */
    function renderHomeDomain() {
        var m = buildMetrics(), sigs = topSignals();
        var signalHtml = sigs.length ? sigs.map(function(s) {
            var type = s.issue_type ? 'issue' : 'reassignment';
            var dot = type === 'issue' ? 'var(--red)' : 'var(--amber)';
            var title = s.title || s.reason || 'Sem titulo';
            var sub = s.unit || s.group_key || '';
            return '<div class="signal-item" data-action="open-drawer" data-entity="'+(type==='issue'?'issue':'reassignment')+'" data-id="'+escapeHtml(s.id)+'"><span class="si-dot" style="background:'+dot+'"></span><div class="si-body"><strong>'+escapeHtml(title)+'</strong><small>'+escapeHtml(sub)+' \u00B7 '+escapeHtml(formatDateTime(s.updatedAt||s.createdAt))+'</small></div><span class="badge badge-'+(s.status==='new'||s.status==='open'?'warn':'muted')+'">'+escapeHtml(statusLabel(s.status))+'</span></div>';
        }).join('') : '<div class="empty-state">Sem sinais recentes.</div>';

        var riskUnitsHtml = STATE.datasets.units.filter(function(u){return u.risk!=='low';}).slice(0,6).map(function(u) {
            return '<div class="aside-item" data-action="open-drawer" data-entity="unit" data-id="'+escapeHtml(u.id)+'"><span class="badge badge-'+riskBadge(u.risk)+'">\u25CF</span><div><strong>'+escapeHtml(u.name)+'</strong><small>'+escapeHtml(riskLabel(u.risk))+' \u00B7 '+escapeHtml(u.client||'--')+'</small></div></div>';
        }).join('') || '<div class="empty-state">Nenhuma unidade em risco.</div>';

        return '<div class="domain-header"><h1>Inicio Operacional</h1><p class="helper">Resumo do efetivo, alertas e indicadores criticos.</p></div>'+
            '<div class="metrics-row">'+
                '<div class="metric-card accent-blue"><div class="mc-value">'+formatNumber(m.total)+'</div><div class="mc-label">Colaboradores</div><div class="mc-sub">'+m.plantao+' plantao \u00B7 '+m.ft+' FT \u00B7 '+m.away+' afastados</div></div>'+
                '<div class="metric-card accent-green"><div class="mc-value">'+formatNumber(m.units)+'</div><div class="mc-label">Unidades</div><div class="mc-sub">'+m.riskUnits+' em risco</div></div>'+
                '<div class="metric-card accent-amber"><div class="mc-value">'+formatNumber(m.activeMoves)+'</div><div class="mc-label">Movimentacoes</div><div class="mc-sub">pendentes ativas</div></div>'+
                '<div class="metric-card accent-red"><div class="mc-value">'+formatNumber(m.openIssues)+'</div><div class="mc-label">Divergencias</div><div class="mc-sub">abertas / em triagem</div></div>'+
                '<div class="metric-card accent-purple"><div class="mc-value">'+formatNumber(m.campaigns)+'</div><div class="mc-label">Campanhas</div><div class="mc-sub">'+m.submissions+' submissoes</div></div>'+
                '<div class="metric-card accent-cyan"><div class="mc-value">'+formatNumber(m.vehicles)+'</div><div class="mc-label">Veiculos ativos</div><div class="mc-sub">em rota ou abertos</div></div>'+
            '</div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Sinais & Alertas</h3><span class="badge badge-muted">'+sigs.length+'</span></div><div class="signal-list">'+signalHtml+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Unidades em Risco</h3></div><div class="panel-body">'+riskUnitsHtml+'</div></div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: OPERATIONS DOMAIN
       ═══════════════════════════════════════════ */
    function renderOperationsDomain() {
        var list = filteredCollaborators(), total = list.length;
        var start = STATE.operationsPage * STATE.PAGE_SIZE, end = Math.min(start + STATE.PAGE_SIZE, total);
        var page = list.slice(start, end), pages = Math.max(1, Math.ceil(total / STATE.PAGE_SIZE));

        var rows = page.map(function(c) {
            return '<tr data-action="open-drawer" data-entity="collaborator" data-id="'+escapeHtml(c.id)+'">'+
                '<td><strong>'+escapeHtml(c.name)+'</strong></td>'+
                '<td>'+escapeHtml(c.re||'--')+'</td>'+
                '<td>'+escapeHtml(c.unit||'--')+'</td>'+
                '<td>'+escapeHtml(titleCase(c.group||'--'))+'</td>'+
                '<td><span class="badge badge-'+statusBadge(c.status)+'">'+escapeHtml(statusLabel(c.status))+'</span></td>'+
                '<td><span class="badge badge-'+riskBadge(c.risk)+'">'+escapeHtml(riskLabel(c.risk))+'</span></td>'+
                '<td>'+escapeHtml(c.role||'--')+'</td>'+
            '</tr>';
        }).join('');

        var sortOptions = [{k:'name',l:'Nome'},{k:'unit',l:'Unidade'},{k:'status',l:'Status'},{k:'risk',l:'Risco'}];
        var sortBtns = sortOptions.map(function(s) {
            var active = STATE.operationsSort === s.k;
            return '<button class="chip'+(active?' chip-active':'')+'" data-action="sort-ops" data-sort="'+s.k+'">'+s.l+'</button>';
        }).join('');

        return '<div class="domain-header"><div><h1>Operacao ao Vivo</h1><p class="helper">'+total+' colaboradores \u00B7 Pagina '+(STATE.operationsPage+1)+'/'+pages+'</p></div>'+
            '<div class="toolbar"><input class="search-input" type="search" placeholder="Buscar por nome, RE, unidade..." value="'+escapeHtml(STATE.search)+'" data-action="search-ops"><div>'+sortBtns+'</div></div></div>'+
            '<div class="table-wrap"><table class="data-table"><thead><tr>'+
            '<th>Nome</th><th>RE</th><th>Unidade</th><th>Grupo</th><th>Status</th><th>Risco</th><th>Funcao</th></tr></thead>'+
            '<tbody>'+(rows||'<tr><td colspan="7"><div class="empty-state">Sem dados.</div></td></tr>')+'</tbody></table></div>'+
            '<div class="pagination">'+
                '<button class="btn-ghost btn-sm" data-action="ops-prev"'+(STATE.operationsPage<=0?' disabled':'')+'>Anterior</button>'+
                '<span class="page-indicator">'+(STATE.operationsPage+1)+' / '+pages+'</span>'+
                '<button class="btn-ghost btn-sm" data-action="ops-next"'+(STATE.operationsPage>=pages-1?' disabled':'')+'>Proxima</button>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: FORCE MAP DOMAIN
       ═══════════════════════════════════════════ */
    function renderForceMapDomain() {
        var units = STATE.datasets.units.slice().sort(function(a,b) {
            var riskOrder = {high:0,medium:1,low:2};
            return (riskOrder[a.risk]||2) - (riskOrder[b.risk]||2);
        });
        var highCount = units.filter(function(u){return u.risk==='high';}).length;
        var medCount = units.filter(function(u){return u.risk==='medium';}).length;

        var cards = units.map(function(u) {
            var eff = u.currentHeadcount||0, exp = u.expectedHeadcount||0;
            var pct = exp > 0 ? Math.round((eff/exp)*100) : 100;
            return '<div class="force-card risk-'+u.risk+'" data-action="open-drawer" data-entity="unit" data-id="'+escapeHtml(u.id)+'">'+
                '<div class="fc-header"><h4>'+escapeHtml(u.name)+'</h4><span class="badge badge-'+riskBadge(u.risk)+'">'+escapeHtml(riskLabel(u.risk))+'</span></div>'+
                '<div class="fc-client">'+escapeHtml(u.client||'--')+'</div>'+
                '<div class="fc-stats">'+
                    '<div class="fc-stat"><span class="fc-stat-val">'+eff+'</span><span class="fc-stat-lbl">Efetivo</span></div>'+
                    '<div class="fc-stat"><span class="fc-stat-val">'+exp+'</span><span class="fc-stat-lbl">Esperado</span></div>'+
                    '<div class="fc-stat"><span class="fc-stat-val">'+pct+'%</span><span class="fc-stat-lbl">Cobertura</span></div>'+
                '</div>'+
                '<div class="fc-bar"><div class="fc-bar-fill" style="width:'+Math.min(100,pct)+'%"></div></div>'+
            '</div>';
        }).join('');

        return '<div class="domain-header"><div><h1>Mapa Forca</h1><p class="helper">'+units.length+' unidades mapeadas</p></div></div>'+
            '<div class="metrics-row">'+
                '<div class="metric-card accent-red"><div class="mc-value">'+highCount+'</div><div class="mc-label">Risco alto</div></div>'+
                '<div class="metric-card accent-amber"><div class="mc-value">'+medCount+'</div><div class="mc-label">Risco medio</div></div>'+
                '<div class="metric-card accent-green"><div class="mc-value">'+(units.length-highCount-medCount)+'</div><div class="mc-label">Cobertos</div></div>'+
            '</div>'+
            '<div class="force-grid">'+cards+'</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: COVERAGE DOMAIN
       ═══════════════════════════════════════════ */
    function renderCoverageDomain() {
        var reassignments = STATE.datasets.reassignments.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});
        var moves = STATE.datasets.movements.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});
        var vehicleUsage = STATE.datasets.vehicleUsage.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});

        var rRows = reassignments.slice(0,15).map(function(r) {
            return '<div class="queue-item" data-action="open-drawer" data-entity="reassignment" data-id="'+escapeHtml(r.id)+'">'+
                '<div class="qi-icon qi-reassignment">\uD83D\uDD04</div>'+
                '<div class="qi-body"><strong>'+escapeHtml(r.reason||'Remanejamento')+'</strong><small>'+escapeHtml(r.unit||'--')+' \u00B7 '+escapeHtml(formatDate(r.createdAt))+'</small></div>'+
                '<span class="badge badge-'+statusBadge(r.status)+'">'+escapeHtml(statusLabel(r.status))+'</span></div>';
        }).join('') || '<div class="empty-state">Sem remanejamentos.</div>';

        var mRows = moves.slice(0,15).map(function(mv) {
            return '<div class="queue-item" data-action="open-drawer" data-entity="movement" data-id="'+escapeHtml(mv.id)+'">'+
                '<div class="qi-icon qi-movement">\u27A1\uFE0F</div>'+
                '<div class="qi-body"><strong>'+escapeHtml(mv.movement_type||'Movimentacao')+'</strong><small>'+escapeHtml(mv.origin_unit||'--')+' \u2192 '+escapeHtml(mv.destination_unit||'--')+'</small></div>'+
                '<span class="badge badge-'+statusBadge(mv.status)+'">'+escapeHtml(statusLabel(mv.status))+'</span></div>';
        }).join('') || '<div class="empty-state">Sem movimentacoes.</div>';

        var vRows = vehicleUsage.slice(0,10).map(function(v) {
            return '<div class="queue-item" data-action="open-drawer" data-entity="vehicle" data-id="'+escapeHtml(v.id)+'">'+
                '<div class="qi-icon qi-vehicle">\uD83D\uDE97</div>'+
                '<div class="qi-body"><strong>'+escapeHtml(v.vehicle_name||v.vehicle_plate||'Veiculo')+'</strong><small>'+escapeHtml(v.driver_name||'--')+' \u00B7 '+escapeHtml(v.unit||'--')+'</small></div>'+
                '<span class="badge badge-'+statusBadge(v.status)+'">'+escapeHtml(statusLabel(v.status))+'</span></div>';
        }).join('') || '<div class="empty-state">Sem veiculos em uso.</div>';

        return '<div class="domain-header"><div><h1>Cobertura & Movimentacoes</h1><p class="helper">Remanejamentos, execucoes e veiculos.</p></div>'+
            '<div class="toolbar"><button class="btn-primary btn-sm" data-action="compose" data-compose="reassignment">\u002B Remanejamento</button>'+
            '<button class="btn-secondary btn-sm" data-action="compose" data-compose="vehicle">\u002B Veiculo</button></div></div>'+
            '<div class="three-col">'+
                '<div class="panel"><div class="panel-header"><h3>Remanejamentos</h3><span class="badge badge-muted">'+reassignments.length+'</span></div><div class="queue-list">'+rRows+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Movimentacoes</h3><span class="badge badge-muted">'+moves.length+'</span></div><div class="queue-list">'+mRows+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Veiculos</h3><span class="badge badge-muted">'+vehicleUsage.length+'</span></div><div class="queue-list">'+vRows+'</div></div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: COMMS DOMAIN
       ═══════════════════════════════════════════ */
    function renderCommsDomain() {
        var camps = STATE.datasets.campaigns.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});
        var issues = STATE.datasets.issues.slice().sort(function(a,b){return new Date(b.createdAt||0)-new Date(a.createdAt||0);});

        var campRows = camps.slice(0,20).map(function(c) {
            var subCount = STATE.datasets.submissions.filter(function(s){return s.campaign_id===c.id;}).length;
            var issueCount = issues.filter(function(i){return i.campaign_id===c.id;}).length;
            return '<div class="queue-item" data-action="open-drawer" data-entity="campaign" data-id="'+escapeHtml(c.id)+'">'+
                '<div class="qi-icon qi-campaign">\uD83D\uDCE8</div>'+
                '<div class="qi-body"><strong>'+escapeHtml(c.title||'Campanha')+'</strong><small>'+escapeHtml(titleCase(c.campaign_type||'--'))+' \u00B7 '+escapeHtml(c.unit||'--')+' \u00B7 '+escapeHtml(formatDate(c.createdAt))+'</small></div>'+
                '<div class="qi-badges"><span class="badge badge-info">'+subCount+' resp.</span>'+(issueCount?'<span class="badge badge-warn">'+issueCount+' div.</span>':'')+'<span class="badge badge-'+statusBadge(c.status)+'">'+escapeHtml(statusLabel(c.status))+'</span></div></div>';
        }).join('') || '<div class="empty-state">Nenhuma campanha.</div>';

        var issueRows = issues.filter(function(i){return i.status!=='resolved'&&i.status!=='cancelled';}).slice(0,10).map(function(i) {
            return '<div class="queue-item" data-action="open-drawer" data-entity="issue" data-id="'+escapeHtml(i.id)+'">'+
                '<div class="qi-icon qi-issue">\u26A0\uFE0F</div>'+
                '<div class="qi-body"><strong>'+escapeHtml(i.title||'Divergencia')+'</strong><small>'+escapeHtml(i.unit||i.group_key||'--')+' \u00B7 '+escapeHtml(i.severity||'normal')+'</small></div>'+
                '<span class="badge badge-'+statusBadge(i.status)+'">'+escapeHtml(statusLabel(i.status))+'</span></div>';
        }).join('') || '<div class="empty-state">Sem divergencias abertas.</div>';

        return '<div class="domain-header"><div><h1>Comunicacao & Conferencias</h1><p class="helper">Campanhas, submissoes e divergencias.</p></div>'+
            '<div class="toolbar"><button class="btn-primary btn-sm" data-action="compose" data-compose="campaign">\u002B Campanha</button></div></div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Campanhas</h3><span class="badge badge-muted">'+camps.length+'</span></div><div class="queue-list">'+campRows+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Divergencias Abertas</h3><span class="badge badge-muted">'+issues.filter(function(i){return i.status!=='resolved'&&i.status!=='cancelled';}).length+'</span></div><div class="queue-list">'+issueRows+'</div></div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: COMPLIANCE DOMAIN
       ═══════════════════════════════════════════ */
    function renderComplianceDomain() {
        var collabs = filteredCollaborators();
        var highR = collabs.filter(function(c){return c.risk==='high';});
        var medR = collabs.filter(function(c){return c.risk==='medium';});

        var riskList = highR.concat(medR).slice(0,20).map(function(c) {
            return '<div class="compliance-item" data-action="open-drawer" data-entity="collaborator" data-id="'+escapeHtml(c.id)+'">'+
                '<div class="ci-level risk-'+c.risk+'"></div>'+
                '<div class="ci-body"><strong>'+escapeHtml(c.name)+'</strong><small>RE '+escapeHtml(c.re||'--')+' \u00B7 '+escapeHtml(c.unit||'--')+' \u00B7 '+escapeHtml(statusLabel(c.status))+'</small></div>'+
                '<span class="badge badge-'+riskBadge(c.risk)+'">'+escapeHtml(riskLabel(c.risk))+'</span></div>';
        }).join('') || '<div class="empty-state">Todos em conformidade.</div>';

        var unitRisks = STATE.datasets.units.filter(function(u){return u.risk!=='low';}).slice(0,10).map(function(u) {
            return '<div class="compliance-item" data-action="open-drawer" data-entity="unit" data-id="'+escapeHtml(u.id)+'">'+
                '<div class="ci-level risk-'+u.risk+'"></div>'+
                '<div class="ci-body"><strong>'+escapeHtml(u.name)+'</strong><small>'+escapeHtml(u.client||'--')+'</small></div>'+
                '<span class="badge badge-'+riskBadge(u.risk)+'">'+escapeHtml(riskLabel(u.risk))+'</span></div>';
        }).join('') || '<div class="empty-state">Unidades cobertas.</div>';

        var total = collabs.length, conform = total - highR.length - medR.length;
        var pct = total ? Math.round((conform/total)*100) : 100;

        return '<div class="domain-header"><div><h1>Conformidade</h1><p class="helper">Auditoria e conformidade do efetivo.</p></div></div>'+
            '<div class="metrics-row">'+
                '<div class="metric-card accent-green"><div class="mc-value">'+pct+'%</div><div class="mc-label">Conformidade</div><div class="mc-sub">'+conform+'/'+total+' regulares</div></div>'+
                '<div class="metric-card accent-red"><div class="mc-value">'+highR.length+'</div><div class="mc-label">Risco alto</div></div>'+
                '<div class="metric-card accent-amber"><div class="mc-value">'+medR.length+'</div><div class="mc-label">Risco medio</div></div>'+
            '</div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Colaboradores em Risco</h3></div><div class="compliance-list">'+riskList+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Unidades em Risco</h3></div><div class="compliance-list">'+unitRisks+'</div></div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: ANALYTICS DOMAIN
       ═══════════════════════════════════════════ */
    function renderAnalyticsDomain() {
        var series = analyticsSeries(), m = buildMetrics();
        var maxTotal = Math.max.apply(null, series.map(function(s){return s.total;})) || 1;

        var barRows = series.map(function(s) {
            var pct = Math.round((s.total/maxTotal)*100);
            return '<div class="bar-row"><span class="bar-label">'+escapeHtml(s.label)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--blue)"></div></div><span class="bar-value">'+s.total+'</span></div>';
        }).join('') || '<div class="empty-state">Sem dados.</div>';

        var scoreRows = series.map(function(s) {
            var color = s.score >= 80 ? 'var(--green)' : s.score >= 60 ? 'var(--amber)' : 'var(--red)';
            return '<div class="bar-row"><span class="bar-label">'+escapeHtml(s.label)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+s.score+'%;background:'+color+'"></div></div><span class="bar-value">'+s.score+'%</span></div>';
        }).join('');

        var awayRows = series.map(function(s) {
            var pct = Math.round((s.away/Math.max(s.total,1))*100);
            return '<div class="bar-row"><span class="bar-label">'+escapeHtml(s.label)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--amber)"></div></div><span class="bar-value">'+s.away+'</span></div>';
        }).join('');

        var riskRows = series.map(function(s) {
            var pct = Math.round((s.risk/Math.max(s.total,1))*100);
            return '<div class="bar-row"><span class="bar-label">'+escapeHtml(s.label)+'</span><div class="bar-track"><div class="bar-fill" style="width:'+pct+'%;background:var(--red)"></div></div><span class="bar-value">'+s.risk+'</span></div>';
        }).join('');

        return '<div class="domain-header"><h1>Inteligencia Gerencial</h1><p class="helper">Indicadores consolidados por grupo e operacao.</p></div>'+
            '<div class="kpi-strip">'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.total)+'</div><div class="kpi-lbl">Efetivo total</div></div>'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.plantao)+'</div><div class="kpi-lbl">Em plantao</div></div>'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.ft)+'</div><div class="kpi-lbl">Faltas / FT</div></div>'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.highRisk)+'</div><div class="kpi-lbl">Risco alto</div></div>'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.openIssues)+'</div><div class="kpi-lbl">Divergencias</div></div>'+
                '<div class="kpi-card"><div class="kpi-val">'+formatNumber(m.campaigns)+'</div><div class="kpi-lbl">Campanhas</div></div>'+
            '</div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Efetivo por Grupo</h3></div><div class="bar-chart">'+barRows+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Score de Cobertura</h3></div><div class="bar-chart">'+scoreRows+'</div></div>'+
            '</div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Ausencias</h3></div><div class="bar-chart">'+awayRows+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Em Risco</h3></div><div class="bar-chart">'+riskRows+'</div></div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: ADMIN DOMAIN
       ═══════════════════════════════════════════ */
    function renderAdminDomain() {
        var pendingMutations = 0;
        try { var svc = getService(); if(svc) pendingMutations = svc.getPendingMutationCount(); } catch(e) {}
        var savedViews = STATE.datasets.savedViews || [];
        var profiles = STATE.datasets.profiles || [];

        var viewList = savedViews.map(function(v) {
            return '<div class="aside-item"><strong>'+escapeHtml(v.name||'Vista')+'</strong><small>'+escapeHtml(v.entity_type||'--')+' \u00B7 '+escapeHtml(formatDate(v.created_at))+'</small><button class="btn-ghost btn-xs" data-action="apply-saved-view" data-view-id="'+escapeHtml(v.id)+'">Aplicar</button></div>';
        }).join('') || '<div class="empty-state">Nenhuma vista salva.</div>';

        var profileRows = profiles.slice(0,10).map(function(p) {
            return '<tr><td>'+escapeHtml(p.display_name||p.email||'--')+'</td><td>'+escapeHtml(p.role||'--')+'</td><td>'+escapeHtml(p.group_key||'--')+'</td><td>'+escapeHtml(formatDate(p.updated_at))+'</td></tr>';
        }).join('');

        return '<div class="domain-header"><h1>Administracao</h1><p class="helper">Configuracoes do sistema, perfis e auditoria.</p></div>'+
            '<div class="metrics-row">'+
                '<div class="metric-card accent-green"><div class="mc-value">\u2713</div><div class="mc-label">Sistema online</div></div>'+
                '<div class="metric-card accent-'+(pendingMutations>0?'amber':'blue')+'"><div class="mc-value">'+pendingMutations+'</div><div class="mc-label">Mutacoes offline</div></div>'+
                '<div class="metric-card accent-purple"><div class="mc-value">'+profiles.length+'</div><div class="mc-label">Perfis</div></div>'+
                '<div class="metric-card accent-cyan"><div class="mc-value">'+savedViews.length+'</div><div class="mc-label">Vistas salvas</div></div>'+
            '</div>'+
            '<div class="two-col">'+
                '<div class="panel"><div class="panel-header"><h3>Vistas Salvas</h3></div><div class="panel-body">'+viewList+'</div></div>'+
                '<div class="panel"><div class="panel-header"><h3>Perfis</h3></div>'+
                    '<div class="table-wrap"><table class="data-table compact"><thead><tr><th>Nome</th><th>Papel</th><th>Grupo</th><th>Atualizado</th></tr></thead>'+
                    '<tbody>'+(profileRows||'<tr><td colspan="4"><div class="empty-state">Sem perfis.</div></td></tr>')+'</tbody></table></div>'+
                '</div>'+
            '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: DOMAIN ROUTER
       ═══════════════════════════════════════════ */
    function renderDomain() {
        switch(STATE.activeDomain) {
            case 'home': return renderHomeDomain();
            case 'operations': return renderOperationsDomain();
            case 'forceMap': return renderForceMapDomain();
            case 'coverage': return renderCoverageDomain();
            case 'comms': return renderCommsDomain();
            case 'compliance': return renderComplianceDomain();
            case 'analytics': return renderAnalyticsDomain();
            case 'admin': return renderAdminDomain();
            default: return renderHomeDomain();
        }
    }

    /* ═══════════════════════════════════════════
       RENDER: DRAWER (entity detail)
       ═══════════════════════════════════════════ */
    function renderDrawer() {
        if (!STATE.drawerOpen || !STATE.drawerEntity) return '';
        var ent = findDrawerEntity(STATE.drawerEntity, STATE.drawerId);
        if (!ent) return '<div class="drawer-overlay" data-action="close-drawer"><div class="drawer-panel"><div class="empty-state">Entidade nao encontrada.</div></div></div>';

        var type = STATE.drawerEntity, tabs = ['Detalhes','Atividade','Suporte'];
        var activeTab = STATE.drawerTab || 0;
        var tabBtns = tabs.map(function(t,i) {
            return '<button class="drawer-tab'+(i===activeTab?' active':'')+'" data-action="drawer-tab" data-tab="'+i+'">'+t+'</button>';
        }).join('');

        var detailHtml = '', title = '', subtitle = '';

        if (type === 'collaborator') {
            title = ent.name || 'Colaborador';
            subtitle = 'RE '+escapeHtml(ent.re||'--')+' \u00B7 '+escapeHtml(ent.unit||'--');
            detailHtml =
                '<div class="drawer-section"><h4>Informacoes</h4><div class="drawer-field-grid">'+
                    '<div class="df"><span class="df-label">Nome</span><span class="df-value">'+escapeHtml(ent.name||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">RE</span><span class="df-value">'+escapeHtml(ent.re||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Unidade</span><span class="df-value">'+escapeHtml(ent.unit||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Grupo</span><span class="df-value">'+escapeHtml(titleCase(ent.group||'--'))+'</span></div>'+
                    '<div class="df"><span class="df-label">Funcao</span><span class="df-value">'+escapeHtml(ent.role||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Status</span><span class="df-value"><span class="badge badge-'+statusBadge(ent.status)+'">'+escapeHtml(statusLabel(ent.status))+'</span></span></div>'+
                    '<div class="df"><span class="df-label">Risco</span><span class="df-value"><span class="badge badge-'+riskBadge(ent.risk)+'">'+escapeHtml(riskLabel(ent.risk))+'</span></span></div>'+
                    '<div class="df"><span class="df-label">Turno</span><span class="df-value">'+escapeHtml(ent.shift||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Escala</span><span class="df-value">'+escapeHtml(ent.schedule||'--')+'</span></div>'+
                '</div></div>';
        } else if (type === 'unit') {
            title = ent.name || 'Unidade';
            subtitle = escapeHtml(ent.client||'--');
            var eff = ent.currentHeadcount||0, exp = ent.expectedHeadcount||0, pct = exp ? Math.round((eff/exp)*100) : 100;
            detailHtml =
                '<div class="drawer-section"><h4>Cobertura</h4><div class="drawer-field-grid">'+
                    '<div class="df"><span class="df-label">Efetivo</span><span class="df-value">'+eff+' / '+exp+' ('+pct+'%)</span></div>'+
                    '<div class="df"><span class="df-label">Cliente</span><span class="df-value">'+escapeHtml(ent.client||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Risco</span><span class="df-value"><span class="badge badge-'+riskBadge(ent.risk)+'">'+escapeHtml(riskLabel(ent.risk))+'</span></span></div>'+
                    '<div class="df"><span class="df-label">Contrato</span><span class="df-value">'+escapeHtml(ent.contract_type||'--')+'</span></div>'+
                    '<div class="df"><span class="df-label">Endereco</span><span class="df-value">'+escapeHtml(ent.address||'--')+'</span></div>'+
                '</div></div>';
        } else {
            title = ent.title || ent.reason || ent.vehicle_name || type;
            subtitle = escapeHtml(ent.unit||ent.group_key||'--');
            var fields = Object.keys(ent).filter(function(k){return k!=='id'&&typeof ent[k]!=='object';}).slice(0,12);
            detailHtml = '<div class="drawer-section"><h4>Campos</h4><div class="drawer-field-grid">'+
                fields.map(function(k) {
                    return '<div class="df"><span class="df-label">'+escapeHtml(titleCase(k.replace(/_/g,' ')))+'</span><span class="df-value">'+escapeHtml(String(ent[k]||'--'))+'</span></div>';
                }).join('')+'</div></div>';
        }

        var supportHtml = '';
        var supType = getEntitySupportType(type), supId = getEntityRecordId(ent, type);
        if (activeTab === 2) {
            supportHtml = '<div class="drawer-section"><h4>Comentarios</h4><div class="drawer-support-placeholder"><div class="empty-state">Carregando suporte...</div></div></div>';
            setTimeout(function(){hydrateDrawerSupport(supType, supId);},100);
        }

        var activityHtml = '';
        if (activeTab === 1) {
            activityHtml = '<div class="drawer-section"><h4>Historico</h4><div class="empty-state">Sem atividade registrada.</div></div>';
        }

        var statusOptions = '';
        if (type !== 'collaborator' && type !== 'unit') {
            var opts = workflowStatusOptions(type);
            if (opts.length > 0) {
                statusOptions = '<div class="drawer-section"><h4>Alterar Status</h4><div class="status-actions">'+
                    opts.map(function(o) {
                        return '<button class="btn-ghost btn-sm" data-action="update-workflow-status" data-entity="'+escapeHtml(type)+'" data-id="'+escapeHtml(ent.id)+'" data-new-status="'+escapeHtml(o.value)+'">'+escapeHtml(o.label)+'</button>';
                    }).join('')+'</div></div>';
            }
        }

        var content = activeTab === 0 ? detailHtml + statusOptions : activeTab === 1 ? activityHtml : supportHtml;

        return '<div class="drawer-overlay" data-action="close-drawer">'+
            '<div class="drawer-panel" onclick="event.stopPropagation()">'+
                '<div class="drawer-header"><div><h2>'+escapeHtml(title)+'</h2><small>'+subtitle+'</small></div><button class="btn-icon" data-action="close-drawer">\u2715</button></div>'+
                '<div class="drawer-tabs">'+tabBtns+'</div>'+
                '<div class="drawer-body">'+content+'</div>'+
            '</div></div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: COMMAND PALETTE
       ═══════════════════════════════════════════ */
    function renderCommandPalette() {
        if (!STATE.commandOpen) return '';
        var items = commandItems();
        var list = items.map(function(it) {
            return '<div class="cmd-item" data-cmd-id="'+escapeHtml(it.id)+'"><span class="cmd-icon">'+it.icon+'</span><div class="cmd-text"><strong>'+escapeHtml(it.title)+'</strong><small>'+escapeHtml(it.sub)+'</small></div></div>';
        }).join('') || '<div class="empty-state">Nenhum resultado.</div>';

        return '<div class="command-overlay" data-action="close-command">'+
            '<div class="command-box" onclick="event.stopPropagation()">'+
                '<input class="command-input" type="text" placeholder="Buscar dominio, colaborador, unidade..." value="'+escapeHtml(STATE.query)+'" autofocus>'+
                '<div class="command-list">'+list+'</div>'+
                '<div class="command-footer"><kbd>Esc</kbd> fechar \u00B7 <kbd>\u2191\u2193</kbd> navegar \u00B7 <kbd>Enter</kbd> selecionar</div>'+
            '</div></div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: COMPOSE MODAL
       ═══════════════════════════════════════════ */
    function renderComposeModal() {
        if (!STATE.composeOpen || !STATE.composeType) return '';
        var type = STATE.composeType, title='', formHtml='';

        var unitOpts = STATE.datasets.units.map(function(u){return '<option value="'+escapeHtml(u.name)+'">'+escapeHtml(u.name)+'</option>';}).join('');
        var groupOpts = (global.DUNAMIS_CONFIG?.groupRules?Object.keys(global.DUNAMIS_CONFIG.groupRules):[]).map(function(g){return '<option value="'+escapeHtml(g)+'">'+escapeHtml(titleCase(g))+'</option>';}).join('');

        if (type === 'campaign') {
            title = 'Nova Campanha';
            formHtml =
                '<div class="form-grid">'+
                    '<div class="field"><label>Titulo</label><input name="title" class="form-input" placeholder="Titulo da campanha" required></div>'+
                    '<div class="field"><label>Tipo</label><select name="campaign_type" class="form-input"><option value="document_conference">Conferencia Documental</option><option value="unit_conference">Conferencia de Unidade</option><option value="leader_conference">Conferencia de Lideranca</option></select></div>'+
                    '<div class="field"><label>Unidade</label><select name="unit" class="form-input"><option value="">Selecione</option>'+unitOpts+'</select></div>'+
                    '<div class="field"><label>Grupo</label><select name="group_key" class="form-input"><option value="">Todos</option>'+groupOpts+'</select></div>'+
                    '<div class="field full"><label>Descricao</label><textarea name="description" class="form-input form-textarea" rows="3" placeholder="Instrucoes da campanha"></textarea></div>'+
                    '<div class="field"><label>Prazo</label><input name="due_at" type="datetime-local" class="form-input"></div>'+
                    '<div class="field"><label>Habilitar link publico</label><select name="public_enabled" class="form-input"><option value="false">Nao</option><option value="true">Sim</option></select></div>'+
                '</div>';
        } else if (type === 'reassignment') {
            title = 'Novo Remanejamento';
            formHtml =
                '<div class="form-grid">'+
                    '<div class="field"><label>Motivo</label><select name="reason" class="form-input">'+(global.DUNAMIS_CONFIG?.ftReasons||[]).map(function(r){return '<option value="'+escapeHtml(r)+'">'+escapeHtml(titleCase(r))+'</option>';}).join('')+'</select></div>'+
                    '<div class="field"><label>Unidade</label><select name="unit" class="form-input"><option value="">Selecione</option>'+unitOpts+'</select></div>'+
                    '<div class="field"><label>Grupo</label><select name="group_key" class="form-input"><option value="">Todos</option>'+groupOpts+'</select></div>'+
                    '<div class="field full"><label>Descricao</label><textarea name="description" class="form-input form-textarea" rows="3"></textarea></div>'+
                    '<div class="field"><label>Quantidade</label><input name="requested_count" type="number" min="1" class="form-input" value="1"></div>'+
                '</div>';
        } else if (type === 'vehicle') {
            title = 'Controle de Veiculo';
            formHtml =
                '<div class="form-grid">'+
                    '<div class="field"><label>Placa</label><input name="vehicle_plate" class="form-input" placeholder="ABC-1234" required></div>'+
                    '<div class="field"><label>Nome do veiculo</label><input name="vehicle_name" class="form-input" placeholder="Ex: Van 01"></div>'+
                    '<div class="field"><label>Motorista</label><input name="driver_name" class="form-input" placeholder="Nome do motorista"></div>'+
                    '<div class="field"><label>Unidade</label><select name="unit" class="form-input"><option value="">Selecione</option>'+unitOpts+'</select></div>'+
                    '<div class="field"><label>Tipo de uso</label><select name="usage_type" class="form-input"><option value="cobertura">Cobertura</option><option value="transporte">Transporte</option><option value="emergencia">Emergencia</option><option value="outro">Outro</option></select></div>'+
                    '<div class="field"><label>KM Saida</label><input name="km_out" type="number" min="0" class="form-input"></div>'+
                    '<div class="field full"><label>Observacoes</label><textarea name="notes" class="form-input form-textarea" rows="2"></textarea></div>'+
                '</div>';
        }

        return '<div class="modal-overlay" data-action="close-modal">'+
            '<div class="modal-box" onclick="event.stopPropagation()">'+
                '<div class="modal-header"><h2>'+escapeHtml(title)+'</h2><button class="btn-icon" data-action="close-modal">\u2715</button></div>'+
                '<form id="compose-form">'+formHtml+
                '<div class="modal-footer"><button class="btn-ghost" type="button" data-action="close-modal">Cancelar</button><button class="btn-primary" type="submit">Criar</button></div>'+
                '</form>'+
            '</div></div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: SHELL (main layout)
       ═══════════════════════════════════════════ */
    function renderShell() {
        var domains = DOMAIN_DEFS.map(function(d) {
            var active = STATE.activeDomain === d.key;
            return '<button class="domain-btn'+(active?' active':'')+'" data-action="navigate" data-domain="'+d.key+'" title="'+escapeHtml(d.label)+'"><span class="domain-icon">'+d.icon+'</span><span class="domain-label">'+escapeHtml(d.label)+'</span></button>';
        }).join('');

        var profile = STATE.profile;
        var userName = profile?.display_name || profile?.email || 'Usuario';
        var userRole = profile?.role || 'operador';

        return '<div class="platform-shell">'+
            '<nav class="sidebar">'+
                '<div class="sidebar-header">'+
                    '<img class="sidebar-logo" src="images/logo-dunamis-servicos.png" alt="Dunamis">'+
                    '<div><strong>Dunamis</strong><small>Control Center</small></div>'+
                '</div>'+
                '<div class="domain-nav">'+domains+'</div>'+
                '<div class="sidebar-footer">'+
                    '<div class="sidebar-user"><div class="user-avatar">'+escapeHtml(userName.charAt(0).toUpperCase())+'</div><div class="user-info"><strong>'+escapeHtml(userName)+'</strong><small>'+escapeHtml(titleCase(userRole))+'</small></div></div>'+
                    '<button class="btn-ghost btn-xs" data-action="logout" title="Sair">Sair</button>'+
                '</div>'+
            '</nav>'+
            '<main class="shell-main">'+
                '<header class="topbar">'+
                    '<button class="btn-icon mobile-menu-btn" data-action="toggle-mobile-menu">\u2630</button>'+
                    '<div class="topbar-left"><h2 class="topbar-title">'+escapeHtml(DOMAIN_DEFS.find(function(d){return d.key===STATE.activeDomain;})?.label||'Inicio')+'</h2></div>'+
                    '<div class="topbar-right">'+
                        '<button class="btn-ghost btn-sm" data-action="open-command" title="Paleta de comandos (Ctrl+K)">\uD83D\uDD0D Buscar</button>'+
                        '<button class="btn-ghost btn-sm" data-action="refresh-data" title="Atualizar dados">\u21BB</button>'+
                    '</div>'+
                '</header>'+
                '<section class="content-area" id="domain-content">'+renderDomain()+'</section>'+
            '</main>'+
            renderDrawer()+renderCommandPalette()+renderComposeModal()+
        '</div>';
    }

    /* ═══════════════════════════════════════════
       RENDER: APP (entry point)
       ═══════════════════════════════════════════ */
    function renderApp() {
        var root = getRoot(); if(!root) return;
        if(!STATE.authenticated) { renderLogin(); return; }
        if(STATE.loading) {
            root.innerHTML = '<div class="loading-shell"><div class="loading-spinner"></div><p>Carregando plataforma...</p></div>';
            return;
        }
        root.innerHTML = renderShell();
        bindShellEvents();
    }

    /* ═══════════════════════════════════════════
       EVENT HANDLING
       ═══════════════════════════════════════════ */
    function bindShellEvents() {
        var root = getRoot(); if(!root) return;

        // Delegated click handler
        root.addEventListener('click', function(e) {
            var target = e.target.closest('[data-action]');
            if(target) { e.preventDefault(); handleAction(target); }
            // Command palette item
            var cmd = e.target.closest('[data-cmd-id]');
            if(cmd) {
                var items = commandItems(), id = cmd.getAttribute('data-cmd-id');
                var match = items.find(function(x){return x.id===id;});
                if(match && match.action) match.action();
            }
        });

        // Search input
        var searchInput = root.querySelector('[data-action="search-ops"]');
        if(searchInput) {
            searchInput.addEventListener('input', function(e) {
                STATE.search = e.target.value; STATE.operationsPage = 0;
                debounceRefresh();
            });
        }

        // Command palette input
        var cmdInput = root.querySelector('.command-input');
        if(cmdInput) {
            cmdInput.addEventListener('input', function(e) {
                STATE.query = e.target.value;
                var list = root.querySelector('.command-list');
                if(list) {
                    var items = commandItems();
                    list.innerHTML = items.map(function(it) {
                        return '<div class="cmd-item" data-cmd-id="'+escapeHtml(it.id)+'"><span class="cmd-icon">'+it.icon+'</span><div class="cmd-text"><strong>'+escapeHtml(it.title)+'</strong><small>'+escapeHtml(it.sub)+'</small></div></div>';
                    }).join('') || '<div class="empty-state">Nenhum resultado.</div>';
                }
            });
            cmdInput.focus();
        }

        // Compose form
        var composeForm = document.getElementById('compose-form');
        if(composeForm) {
            composeForm.addEventListener('submit', function(ev) {
                ev.preventDefault();
                var fd = new FormData(composeForm);
                if(STATE.composeType==='campaign') submitCampaignComposer(fd);
                else if(STATE.composeType==='reassignment') submitReassignmentComposer(fd);
                else if(STATE.composeType==='vehicle') submitVehicleComposer(fd);
            }, {once:true});
        }
    }

    function handleAction(el) {
        var action = el.getAttribute('data-action');
        switch(action) {
            case 'navigate':
                STATE.activeDomain = el.getAttribute('data-domain') || 'home';
                STATE.operationsPage = 0; STATE.search = '';
                saveUiPrefs(); renderApp(); break;
            case 'open-command':
                STATE.commandOpen = true; STATE.query = ''; renderApp(); break;
            case 'close-command':
                STATE.commandOpen = false; STATE.query = ''; renderApp(); break;
            case 'open-drawer':
                openDrawer(el.getAttribute('data-entity'), el.getAttribute('data-id')); break;
            case 'close-drawer':
                closeDrawer(); break;
            case 'drawer-tab':
                STATE.drawerTab = parseInt(el.getAttribute('data-tab'))||0; renderApp(); break;
            case 'compose':
                STATE.composeOpen = true; STATE.composeType = el.getAttribute('data-compose'); renderApp(); break;
            case 'close-modal':
                closeModal(); break;
            case 'sort-ops':
                STATE.operationsSort = el.getAttribute('data-sort')||'name'; STATE.operationsPage = 0; renderApp(); break;
            case 'ops-prev':
                if(STATE.operationsPage > 0) { STATE.operationsPage--; renderApp(); } break;
            case 'ops-next':
                STATE.operationsPage++; renderApp(); break;
            case 'refresh-data':
                refreshAllData(); break;
            case 'apply-saved-view':
                applySavedViewById(el.getAttribute('data-view-id')); break;
            case 'update-workflow-status':
                updateWorkflowStatus(el.getAttribute('data-entity'), el.getAttribute('data-id'), el.getAttribute('data-new-status')); break;
            case 'toggle-mobile-menu':
                var sidebar = document.querySelector('.sidebar');
                if(sidebar) sidebar.classList.toggle('sidebar-open');
                break;
            case 'logout':
                (async function() {
                    try {
                        localStorage.removeItem('dunamis-remember-me');
                        sessionStorage.removeItem('dunamis-active-session');
                    } catch(e){}
                    try {
                        var auth = getAuthService();
                        if(auth) await auth.logout();
                        else { var c = getClient(); if(c) await c.auth.signOut(); }
                    } catch(e) {}
                    STATE.authenticated = false; STATE.profile = null; renderApp();
                })(); break;
            case 'forgot-password':
                onPasswordReset(); break;
            default: break;
        }
    }

    function bindKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            if(e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                STATE.commandOpen = !STATE.commandOpen;
                STATE.query = ''; renderApp();
            }
            if(e.key === 'Escape') {
                if(STATE.commandOpen) { STATE.commandOpen = false; STATE.query = ''; renderApp(); }
                else if(STATE.composeOpen) { closeModal(); }
                else if(STATE.drawerOpen) { closeDrawer(); }
            }
        });
    }

    /* ═══════════════════════════════════════════
       REALTIME + LIFECYCLE
       ═══════════════════════════════════════════ */
    var realtimeSubs = [];

    function cleanupRealtime() {
        realtimeSubs.forEach(function(unsub) { try { if(typeof unsub==='function') unsub(); } catch(e){} });
        realtimeSubs = [];
    }

    function ensureRealtime() {
        cleanupRealtime();
        var svc = getService(); if(!svc || typeof svc.subscribeToTable !== 'function') return;
        REALTIME_TABLES.forEach(function(t) {
            try {
                var unsub = svc.subscribeToTable(t, function() {
                    debounceRefresh();
                });
                if(typeof unsub === 'function') realtimeSubs.push(unsub);
            } catch(e) {}
        });
    }

    /* ═══════════════════════════════════════════
       HANDLE SESSION (auth state change)
       ═══════════════════════════════════════════ */
    async function handleSession(session) {
        if(!session) {
            STATE.authenticated = false; STATE.profile = null;
            cleanupRealtime(); renderApp(); return;
        }
        STATE.authenticated = true;
        try { STATE.profile = await fetchOrCreateProfile(session); }
        catch(e) { STATE.profile = {email:session.user?.email||'',role:'viewer',group_key:null}; }

        loadUiPrefs();
        STATE.loading = true; renderApp();
        try { await refreshAllData(); } catch(e) {}
        STATE.loading = false;
        ensureRealtime();
        renderApp();
    }

    /* ═══════════════════════════════════════════
       BOOT
       ═══════════════════════════════════════════ */
    async function boot() {
        // Public page check
        try { var isPublic = await renderPublicCampaignPage(); if(isPublic) return; } catch(e) {}

        // Session persistence: if user didn't check "remember me",
        // sign out when the browser is reopened (new browser session)
        var rememberMe = false;
        try { rememberMe = localStorage.getItem('dunamis-remember-me') === '1'; } catch(e){}
        var activeSession = false;
        try { activeSession = sessionStorage.getItem('dunamis-active-session') === '1'; } catch(e){}
        if(!rememberMe && !activeSession) {
            // New browser session without "remember me" → clear any stale session
            try {
                var preClient = getClient();
                var preSession = await preClient.auth.getSession();
                if(preSession?.data?.session) {
                    await preClient.auth.signOut();
                }
            } catch(e){}
        }

        bindKeyboardShortcuts();

        // Periodically process offline queue
        setInterval(function() {
            try { var svc = getService(); if(svc) svc.processPendingQueue(); } catch(e) {}
        }, 30000);

        // Auth service integration
        var authService = getAuthService();
        if(authService && typeof authService.onAuthStateChange === 'function') {
            authService.onAuthStateChange(function(_event, session) { handleSession(session); });
            var initial = await authService.getSession?.();
            if(initial?.data?.session) { await handleSession(initial.data.session); }
            else { STATE.authenticated = false; renderApp(); }
            return;
        }

        // Direct Supabase auth fallback
        var client = getClient();
        if(client) {
            client.auth.onAuthStateChange(function(_event, session) { handleSession(session); });
            var sess = await client.auth.getSession();
            if(sess?.data?.session) { await handleSession(sess.data.session); }
            else { STATE.authenticated = false; renderApp(); }
            return;
        }

        STATE.authenticated = false; renderApp();
    }

    // Start
    if(typeof document !== 'undefined') {
        if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
        else boot();
    }

})(typeof window !== 'undefined' ? window : globalThis);
