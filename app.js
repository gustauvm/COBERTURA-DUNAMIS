// Estado da Aplicação
let currentData = [];
let currentGroup = '';
let currentTab = 'busca'; // 'busca' ou 'unidades'
let hiddenUnits = new Set(); // Armazena postos ocultos na busca
let unitMetadata = {}; // Armazena rótulos das unidades
let collaboratorEdits = {}; // Armazena edições locais de colaboradores (Chave: RE)
let changeHistory = []; // Log de alterações
let minimizedUnits = new Set(); // Armazena unidades minimizadas
let lastUpdatedAt = null; // Timestamp da última carga de dados
const NEXTI_AVAILABLE = false; // Nesta fase, a API Nexti NÃO deve ser chamada
let unitAddressDb = { entries: [], address_map: {}, address_map_norm: {} };
let unitGeoCache = {};
let shadowReady = false;
let shadowSyncTimer = null;
let shadowAutoPullTimer = null;
let shadowAutoPullBound = false;
let shadowDirty = false;
let shadowStatus = {
    available: false,
    lastPull: null,
    lastPush: null,
    pending: false,
    error: null
};
let lastShadowToastAt = 0;
let avisos = [];
let avisosSeenIds = new Set();
let allCollaboratorsCache = { items: null, updatedAt: 0 };
let exportUnitTarget = null;
let ftLaunches = [];
let currentLancamentosTab = 'dashboard';
let ftFilter = { from: '', to: '', status: 'all' };
let ftReasons = [];
let lastFtCreatedId = null;
let ftSyncTimer = null;
let ftLastSyncAt = null;
let searchFilterStatus = 'all'; // all | plantao | folga | ft | afastado
let searchHideAbsence = false;
let currentContext = null;
let contextBound = false;
let reciclagemData = {};
let reciclagemLoadedAt = null;
let reciclagemTemplates = [];
let reciclagemTab = 'colab';
let reciclagemOverrides = {};
let reciclagemHistory = [];
let reciclagemNotes = {};
let reciclagemOnlyExpired = false;
let reciclagemRenderCache = [];

// ==========================================================================
// 🔐 GERENCIAMENTO & AUTENTICAÇÃO (SITE-ONLY)
// ==========================================================================

const SiteAuth = {
    logged: false,
    mode: 'view', // 'view' | 'edit'
    user: null,
    re: null,
    role: 'viewer', // 'viewer' | 'admin' | 'supervisor' | 'master'
    admins: []
};

const ROLE_LABELS = {
    master: 'Master',
    admin: 'Admin',
    supervisor: 'Supervisor',
    viewer: 'Colaborador'
};

function isAdminRole() {
    return SiteAuth.logged && (SiteAuth.role === 'admin' || SiteAuth.role === 'master');
}

function getUserGroupKey() {
    if (!SiteAuth.re) return currentGroup || 'todos';
    const byCurrent = currentData.find(c => c.re === SiteAuth.re || c.re?.endsWith(SiteAuth.re));
    if (byCurrent?.grupo) return byCurrent.grupo;
    const cached = (allCollaboratorsCache.items || []).find(c => c.re === SiteAuth.re || c.re?.endsWith(SiteAuth.re));
    if (cached?.grupo) return cached.grupo;
    return currentGroup || 'todos';
}

function getGroupOptionsHtml() {
    if (isAdminRole()) {
        return `
            <option value="all">Todos os Grupos</option>
            <option value="bombeiros">Bombeiros</option>
            <option value="servicos">Serviços</option>
            <option value="seguranca">Segurança</option>
            <option value="rb">RB Facilities</option>
        `;
    }
    const groupKey = getUserGroupKey();
    if (!groupKey || groupKey === 'todos') return `<option value="all">Todos os Grupos</option>`;
    return `<option value="${groupKey}">${groupKey.toUpperCase()}</option>`;
}

function updateBreadcrumb() {
    const groupEl = document.getElementById('breadcrumb-group');
    const tabEl = document.getElementById('breadcrumb-tab');
    const updatedEl = document.getElementById('breadcrumb-updated');
    const groupPillEl = document.getElementById('breadcrumb-group-pill');
    if (!groupEl || !tabEl) return;
    const groupLabelMap = {
        todos: 'Todos os Grupos',
        bombeiros: 'Bombeiros',
        servicos: 'Serviços',
        seguranca: 'Segurança',
        rb: 'RB Facilities'
    };
    const tabLabelMap = {
        busca: 'Busca Rápida',
        unidades: 'Unidades',
        avisos: 'Avisos',
        lancamentos: 'Lançamentos',
        config: 'Configuração'
    };
    const groupLabel = groupLabelMap[currentGroup] || (currentGroup ? currentGroup.toUpperCase() : 'Grupo');
    const tabLabel = tabLabelMap[currentTab] || 'Seção';
    groupEl.textContent = groupLabel;
    tabEl.textContent = tabLabel;
    if (groupPillEl) groupPillEl.textContent = `Grupo: ${groupLabel}`;
    if (updatedEl) {
        updatedEl.textContent = lastUpdatedAt
            ? `Atualizado: ${lastUpdatedAt.toLocaleString()}`
            : '';
    }
}

function updateSearchFilterUI() {
    document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
        const key = btn.getAttribute('data-filter');
        const active = key === searchFilterStatus;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const hideBtn = document.querySelector('.filter-chip[data-hide]');
    if (hideBtn) {
        hideBtn.classList.toggle('active', searchHideAbsence);
        hideBtn.setAttribute('aria-pressed', searchHideAbsence ? 'true' : 'false');
    }
    const filterWrap = document.querySelector('.search-filters');
    if (filterWrap) {
        const hasActive = searchFilterStatus !== 'all' || searchHideAbsence;
        filterWrap.classList.toggle('filters-active', hasActive);
    }
}

function setSearchFilterStatus(status) {
    searchFilterStatus = status;
    updateSearchFilterUI();
    realizarBusca();
}

function toggleSearchHideAbsence() {
    searchHideAbsence = !searchHideAbsence;
    updateSearchFilterUI();
    realizarBusca();
}

function toggleConfigCard(btn) {
    const card = btn?.closest('.config-card');
    if (!card) return;
    card.classList.toggle('collapsed');
}

function toggleCompactMode() {
    const isOn = document.body.classList.toggle('compact-mode');
    localStorage.setItem('compactMode', isOn ? '1' : '0');
}

function clearContextBar() {
    currentContext = null;
    renderContextBar();
}

function setContextUnit(unitName) {
    if (!unitName) return;
    currentContext = { type: 'unit', unitName };
    renderContextBar();
}

function setContextCollab(re) {
    if (!re) return;
    currentContext = { type: 'collab', re };
    renderContextBar();
}

function renderContextBar() {
    const bar = document.getElementById('context-bar');
    if (!bar) return;
    if (!currentContext) {
        bar.classList.add('hidden');
        bar.innerHTML = '';
        return;
    }

    if (currentContext.type === 'unit') {
        const unitName = currentContext.unitName;
        const unitJs = JSON.stringify(unitName);
        const canEdit = SiteAuth.mode === 'edit';
        bar.innerHTML = `
            <div class="context-bar-inner">
                <div class="context-title">Unidade: <strong>${unitName}</strong></div>
                <div class="context-actions">
                    <button class="context-action" onclick="openAvisosForUnit(${unitJs})">Avisos</button>
                    <button class="context-action" onclick="exportUnitPrompt(${unitJs})">Exportar</button>
                    <button class="context-action" onclick="openEditUnitModal(${unitJs})" ${canEdit ? '' : 'disabled'}>Editar</button>
                </div>
                <button class="context-close" onclick="clearContextBar()">Fechar</button>
            </div>
        `;
        bar.classList.remove('hidden');
        return;
    }

    if (currentContext.type === 'collab') {
        const item = currentData.find(c => c.re === currentContext.re || c.re?.endsWith(currentContext.re))
            || (allCollaboratorsCache.items || []).find(c => c.re === currentContext.re || c.re?.endsWith(currentContext.re));
        if (!item) {
            clearContextBar();
            return;
        }
        const nameJs = JSON.stringify(item.nome || 'Colaborador');
        const phoneJs = JSON.stringify(item.telefone || '');
        const unitJs = JSON.stringify(item.posto || '');
        const canEdit = SiteAuth.mode === 'edit';
        bar.innerHTML = `
            <div class="context-bar-inner">
                <div class="context-title">Colaborador: <strong>${item.nome}</strong> (${item.re})</div>
                <div class="context-actions">
                    <button class="context-action" onclick="openPhoneModal(${nameJs}, ${phoneJs})">Contato</button>
                    <button class="context-action" onclick="navigateToUnit(${unitJs})">Unidade</button>
                    <button class="context-action" onclick="openEditModal(${item.id})" ${canEdit ? '' : 'disabled'}>Editar</button>
                </div>
                <button class="context-close" onclick="clearContextBar()">Fechar</button>
            </div>
        `;
        bar.classList.remove('hidden');
        return;
    }
}

function bindContextSelection() {
    if (contextBound) return;
    contextBound = true;
    document.addEventListener('click', (e) => {
        if (e.target.closest('.context-bar')) return;
        const unitTitle = e.target.closest('.unit-title');
        if (unitTitle && !e.target.closest('.unit-actions')) {
            const unitSection = unitTitle.closest('.unit-section');
            const unitName = unitSection?.getAttribute('data-unit-name');
            if (unitName) setContextUnit(unitName);
            return;
        }
        const card = e.target.closest('.result-card');
        if (card && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) {
            const re = card.getAttribute('data-collab-re');
            if (re) setContextCollab(re);
        }
    });
}

function flashAvisoCard(id) {
    const el = document.querySelector(`[data-aviso-id="${id}"]`);
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 1400);
}

function flashLancamentoCard(id) {
    const el = document.querySelector(`[data-ft-id="${id}"]`);
    if (!el) return;
    el.classList.remove('pulse');
    void el.offsetWidth;
    el.classList.add('pulse');
    setTimeout(() => el.classList.remove('pulse'), 1400);
}

function canViewAvisoItem(item) {
    if (!SiteAuth.logged) return false;
    if (isAdminRole()) return true;
    return !!(item?.assignedToRe && SiteAuth.re && item.assignedToRe === SiteAuth.re);
}

function filterAvisosByVisibility(items) {
    return (items || []).filter(canViewAvisoItem);
}

function loadLocalState() {
    try {
        const edits = localStorage.getItem('collaboratorEdits');
        const units = localStorage.getItem('unitMetadata');
        const history = localStorage.getItem('changeHistory');
        if (edits) collaboratorEdits = JSON.parse(edits) || {};
        if (units) unitMetadata = JSON.parse(units) || {};
        if (history) changeHistory = JSON.parse(history) || [];
    } catch {}
}

function loadAvisos() {
    try {
        const stored = localStorage.getItem('avisos');
        avisos = stored ? JSON.parse(stored) || [] : [];
    } catch {
        avisos = [];
    }
    try {
        const seen = localStorage.getItem('avisosSeen');
        const list = seen ? JSON.parse(seen) || [] : [];
        avisosSeenIds = new Set(list);
    } catch {
        avisosSeenIds = new Set();
    }
}

function saveAvisos(silent = false) {
    localStorage.setItem('avisos', JSON.stringify(avisos));
    localStorage.setItem('avisosSeen', JSON.stringify(Array.from(avisosSeenIds)));
    scheduleShadowSync('avisos', { silent, notify: !silent });
    updateAvisosUI();
}

function loadFtLaunches() {
    try {
        const stored = localStorage.getItem('ftLaunches');
        ftLaunches = stored ? JSON.parse(stored) || [] : [];
    } catch {
        ftLaunches = [];
    }
    ftLaunches.forEach(item => {
        if (!item.status) item.status = 'pending';
        if (item.status === 'confirmed') item.status = 'submitted';
        if (!item.updatedAt) item.updatedAt = item.createdAt || new Date().toISOString();
    });
}

function saveFtLaunches(silent = false) {
    localStorage.setItem('ftLaunches', JSON.stringify(ftLaunches));
    scheduleShadowSync('ft', { silent, notify: !silent });
    updateLancamentosUI();
}

function loadFtReasons() {
    try {
        const stored = localStorage.getItem('ftReasons');
        ftReasons = stored ? JSON.parse(stored) || [] : [];
    } catch {
        ftReasons = [];
    }
    if (!ftReasons.length) {
        ftReasons = CONFIG?.ftReasons ? JSON.parse(JSON.stringify(CONFIG.ftReasons)) : [];
    }
}

function saveFtReasons(silent = false) {
    localStorage.setItem('ftReasons', JSON.stringify(ftReasons));
    scheduleShadowSync('ft-reasons', { silent, notify: !silent });
}

function saveLocalState(silent = false) {
    localStorage.setItem('collaboratorEdits', JSON.stringify(collaboratorEdits));
    localStorage.setItem('unitMetadata', JSON.stringify(unitMetadata));
    localStorage.setItem('changeHistory', JSON.stringify(changeHistory));
    scheduleShadowSync('local-save', { silent, notify: !silent });
}

function clearLocalState() {
    collaboratorEdits = {};
    unitMetadata = {};
    changeHistory = [];
    localStorage.removeItem('collaboratorEdits');
    localStorage.removeItem('unitMetadata');
    localStorage.removeItem('changeHistory');
}

function shadowEnabled() {
    return !!(CONFIG?.shadow?.webAppUrl);
}

async function shadowRequest(action, payload = {}) {
    if (!shadowEnabled()) return null;
    const url = CONFIG.shadow.webAppUrl;
    const body = {
        action,
        token: CONFIG.shadow.token || '',
        payload
    };
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body)
        });
        const text = await response.text();
        try {
            return JSON.parse(text);
        } catch {}
    } catch {}

    if (action === 'pull') {
        try {
            const qs = new URLSearchParams({
                action,
                token: CONFIG.shadow.token || ''
            });
            const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}${qs.toString()}`, {
                method: 'GET',
                cache: 'no-store'
            });
            const text = await response.text();
            return JSON.parse(text);
        } catch {}
    }

    return null;
}

function buildShadowState() {
    return {
        collaboratorEdits,
        unitMetadata,
        changeHistory,
        localCollaborators: getLocalCollaborators(),
        avisos,
        ftLaunches,
        ftReasons,
        adminUsers: SiteAuth.admins,
        reciclagemTemplates,
        reciclagemOverrides,
        reciclagemHistory,
        reciclagemNotes,
        unitGeoCache,
        updatedAt: new Date().toISOString()
    };
}

function applyShadowState(state) {
    if (!state) return;
    collaboratorEdits = state.collaboratorEdits || {};
    unitMetadata = state.unitMetadata || {};
    changeHistory = Array.isArray(state.changeHistory) ? state.changeHistory : [];
    if (Array.isArray(state.ftReasons)) {
        ftReasons = state.ftReasons;
        saveFtReasons(true);
    }
    if (Array.isArray(state.adminUsers)) {
        SiteAuth.admins = normalizeAdmins(state.adminUsers);
        saveAdmins(true);
    }
    if (Array.isArray(state.reciclagemTemplates)) {
        reciclagemTemplates = state.reciclagemTemplates;
        saveReciclagemTemplates(true);
    }
    if (state.reciclagemOverrides && typeof state.reciclagemOverrides === 'object') {
        reciclagemOverrides = state.reciclagemOverrides;
        saveReciclagemOverrides(true);
    }
    if (Array.isArray(state.reciclagemHistory)) {
        reciclagemHistory = state.reciclagemHistory;
        saveReciclagemHistory(true);
    }
    if (state.reciclagemNotes && typeof state.reciclagemNotes === 'object') {
        reciclagemNotes = state.reciclagemNotes;
        saveReciclagemNotes(true);
    }
    if (state.unitGeoCache && typeof state.unitGeoCache === 'object') {
        unitGeoCache = state.unitGeoCache;
        localStorage.setItem('unitGeoCache', JSON.stringify(unitGeoCache));
    }
    if (Array.isArray(state.avisos)) {
        mergeAvisosFromShadow(state.avisos);
    }
    if (Array.isArray(state.ftLaunches)) {
        mergeFtLaunchesFromShadow(state.ftLaunches);
    }
    if (Array.isArray(state.localCollaborators)) {
        saveLocalCollaborators(state.localCollaborators, true);
    }
    saveLocalState(true);
    renderAuditList();
    updateAvisosUI();
}

function scheduleShadowSync(reason, options = {}) {
    if (!shadowEnabled()) return;
    if (!options.silent && options.notify !== false) shadowDirty = true;
    if (shadowSyncTimer) clearTimeout(shadowSyncTimer);
    shadowSyncTimer = setTimeout(() => {
        shadowPushAll(reason);
    }, 700);
}

function startShadowAutoPull() {
    if (!shadowEnabled()) return;
    if (shadowAutoPullTimer) clearInterval(shadowAutoPullTimer);
    shadowAutoPullTimer = setInterval(() => {
        shadowPullState(false);
    }, 90000);

    if (shadowAutoPullBound) return;
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            shadowPullState(false);
        }
    });
    shadowAutoPullBound = true;
}

async function shadowPullState(showToastOnFail = false) {
    if (!shadowEnabled()) return false;
    try {
        const result = await shadowRequest('pull');
        if (!result || !result.ok) throw new Error('Shadow pull failed');
        applyShadowState(result.state || {});
        shadowStatus.available = true;
        shadowStatus.lastPull = new Date();
        shadowStatus.error = null;
        shadowReady = true;
        updateShadowStatusUI();
        return true;
    } catch (err) {
        shadowStatus.error = 'Falha ao carregar shadow';
        updateShadowStatusUI();
        if (showToastOnFail) showToast("Falha ao carregar o banco shadow.", "error");
        return false;
    }
}

async function shadowPushAll(reason = '') {
    if (!shadowEnabled()) return false;
    try {
        const state = buildShadowState();
        const result = await shadowRequest('push_all', { state, reason });
        if (!result || !result.ok) throw new Error('Shadow push failed');
        shadowStatus.available = true;
        shadowStatus.lastPush = new Date();
        shadowStatus.pending = false;
        shadowStatus.error = null;
        updateShadowStatusUI();
        const now = Date.now();
        if (shadowDirty && now - lastShadowToastAt > 5000) {
            showToast("Alteração salva.", "success");
            lastShadowToastAt = now;
        }
        shadowDirty = false;
        return true;
    } catch {
        shadowStatus.pending = true;
        shadowStatus.error = 'Falha ao salvar no shadow';
        updateShadowStatusUI();
        return false;
    }
}

async function shadowPushHistory(reason = '') {
    if (!shadowEnabled()) {
        showToast("Shadow não configurado.", "error");
        return false;
    }
    try {
        const result = await shadowRequest('push_history', { history: changeHistory, reason });
        if (!result || !result.ok) throw new Error('Shadow history push failed');
        shadowStatus.available = true;
        shadowStatus.lastPush = new Date();
        shadowStatus.pending = false;
        shadowStatus.error = null;
        updateShadowStatusUI();
        return true;
    } catch {
        shadowStatus.pending = true;
        shadowStatus.error = 'Falha ao salvar histórico no shadow';
        updateShadowStatusUI();
        return false;
    }
}

async function shadowPushSnapshot(reason = '') {
    if (!shadowEnabled()) {
        showToast("Shadow não configurado.", "error");
        return false;
    }
    if (!currentData || currentData.length === 0) {
        showToast("Carregue uma base antes de importar snapshot.", "error");
        return false;
    }
    try {
        const result = await shadowRequest('push_snapshot', {
            snapshot: currentData,
            group: currentGroup,
            reason
        });
        if (!result || !result.ok) throw new Error('Shadow snapshot push failed');
        shadowStatus.available = true;
        shadowStatus.lastPush = new Date();
        shadowStatus.pending = false;
        shadowStatus.error = null;
        updateShadowStatusUI();
        showToast("Snapshot da base enviado para o shadow.", "success");
        return true;
    } catch {
        shadowStatus.pending = true;
        shadowStatus.error = 'Falha ao enviar snapshot para o shadow';
        updateShadowStatusUI();
        showToast("Falha ao enviar snapshot para o shadow.", "error");
        return false;
    }
}

async function shadowResetAll() {
    if (!shadowEnabled()) {
        showToast("Shadow não configurado.", "error");
        return;
    }
    const confirmReset = confirm("Tem certeza que deseja zerar o banco shadow? Isso apagará alterações e histórico globais.");
    if (!confirmReset) return;
    try {
        const result = await shadowRequest('reset');
        if (!result || !result.ok) throw new Error('Shadow reset failed');
        clearLocalState();
        saveLocalCollaborators([]);
        if (ftLaunches.length) {
            await shadowRequest('push_all', {
                state: {
                    collaboratorEdits: {},
                    unitMetadata: {},
                    changeHistory: [],
                    localCollaborators: [],
                    avisos: [],
                    ftLaunches
                },
                reason: 'ft-restore'
            });
        }
        shadowStatus.available = true;
        shadowStatus.lastPush = new Date();
        shadowStatus.pending = false;
        shadowStatus.error = null;
        updateShadowStatusUI();
        showToast("Banco shadow zerado.", "success");
        if (currentGroup) loadGroup(currentGroup);
    } catch {
        shadowStatus.error = 'Falha ao zerar o shadow';
        updateShadowStatusUI();
        showToast("Falha ao zerar o banco shadow.", "error");
    }
}

function updateShadowStatusUI() {
    const el = document.getElementById('shadowStatus');
    const indicator = document.getElementById('shadow-indicator');
    if (!el) return;
    if (!shadowEnabled()) {
        el.innerHTML = `<div class="shadow-status off">Shadow não configurado.</div>`;
        if (indicator) indicator.classList.add('hidden');
        return;
    }
    const pull = shadowStatus.lastPull ? shadowStatus.lastPull.toLocaleString() : 'nunca';
    const push = shadowStatus.lastPush ? shadowStatus.lastPush.toLocaleString() : 'nunca';
    const pending = shadowStatus.pending ? 'Sim' : 'Não';
    const err = shadowStatus.error ? `<div class="shadow-status error">${shadowStatus.error}</div>` : '';
    el.innerHTML = `
        <div class="shadow-status ok">Shadow: ${shadowStatus.available ? 'Ativo' : 'Indisponível'}</div>
        <div class="shadow-meta">Último pull: ${pull}</div>
        <div class="shadow-meta">Último push: ${push}</div>
        <div class="shadow-meta">Pendências: ${pending}</div>
        ${err}
    `;

    if (indicator) {
        const isOffline = !shadowStatus.available || !!shadowStatus.error;
        if (isOffline || shadowStatus.pending) {
            indicator.textContent = shadowStatus.pending ? 'Shadow offline • pendências' : 'Shadow offline';
            indicator.classList.remove('hidden');
        } else {
            indicator.classList.add('hidden');
        }
    }
}

async function shadowPullAndReload() {
    if (!shadowEnabled()) {
        showToast("Shadow não configurado.", "error");
        return;
    }
    const ok = await shadowPullState(true);
    if (ok && currentGroup) {
        loadGroup(currentGroup);
    }
}

function loadAuthFromStorage() {
    const keep = localStorage.getItem('keepLogged') === '1';
    const hash = localStorage.getItem('authHash');
    if (!keep || !hash) return;
    const admin = SiteAuth.admins.find(a => a.hash === hash);
    if (!admin) return;
    SiteAuth.logged = true;
    SiteAuth.user = admin.name;
    SiteAuth.role = admin.role || 'admin';
    SiteAuth.mode = (SiteAuth.role === 'supervisor') ? 'observe' : 'edit';
    try {
        const decoded = atob(hash);
        const parts = decoded.split(':');
        SiteAuth.re = parts[0] || null;
    } catch {}
    if (SiteAuth.role !== 'supervisor') document.body.classList.add('mode-edit');
    document.getElementById('config-login')?.classList.add('hidden');
    document.getElementById('config-content')?.classList.remove('hidden');
    updateMenuStatus();
}

function saveAuthToStorage(authHash = null, keepOverride = null) {
    const keep = typeof keepOverride === 'boolean'
        ? keepOverride
        : document.getElementById('keepLogged')?.checked;
    if (!keep) {
        localStorage.setItem('keepLogged', '0');
        localStorage.removeItem('authHash');
        localStorage.removeItem('authUser');
        localStorage.removeItem('authRe');
        return;
    }
    const hash = authHash || (SiteAuth.admins.find(a => a.name === SiteAuth.user)?.hash || '');
    localStorage.setItem('keepLogged', '1');
    localStorage.setItem('authHash', hash);
    localStorage.setItem('authUser', SiteAuth.user || '');
    localStorage.setItem('authRe', SiteAuth.re || '');
}

// Inicializa admins (Hardcoded na primeira carga, depois localStorage)
function initAdmins() {
    const stored = localStorage.getItem('adminUsers');
    if (stored) {
        SiteAuth.admins = normalizeAdmins(JSON.parse(stored));
        saveAdmins();
        return;
    }

    SiteAuth.admins = [
        { hash: btoa('7164:0547'), name: 'GUSTAVO CORTES BRAGA', re: '7164', role: 'master', master: true },
        { hash: btoa('4648:4643'), name: 'MOISÉS PEREIRA FERNANDES', re: '4648', role: 'admin' },
        { hash: btoa('3935:1288'), name: 'WAGNER MONTEIRO', re: '3935', role: 'admin' }
    ];

    saveAdmins();
}

function saveAdmins(silent = false) {
    localStorage.setItem('adminUsers', JSON.stringify(SiteAuth.admins));
    scheduleShadowSync('admin-users', { silent, notify: !silent });
}

function decodeAdminHash(hash) {
    try {
        const decoded = atob(hash);
        const parts = decoded.split(':');
        return { re: parts[0] || '', pass: parts[1] || '' };
    } catch {
        return { re: '', pass: '' };
    }
}

function normalizeAdmins(list) {
    return (list || []).map(a => {
        const data = decodeAdminHash(a.hash || '');
        const re = a.re || data.re || '';
        let role = a.role || 'admin';
        if (role === 'observer') role = 'supervisor';
        const master = a.master || re === '7164';
        return {
            hash: a.hash,
            name: a.name,
            re,
            role: master ? 'master' : role,
            master: master
        };
    });
}

// Ícones SVG para substituir emojis
const ICONS = {
    search: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
    building: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="12" y1="22" x2="12" y2="22.01"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>`,
    edit: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    eye: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`,
    eyeOff: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    sun: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`,
    moon: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`,
    settings: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    download: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`,
    history: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    chevronUp: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>`,
    chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
    arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    crown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l4 4 4-6 4 6 4-4 4 5-2 8H4l-2-8z"></path><path d="M5 20h14"></path></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>`,
    launch: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9"></path><path d="M6 12H4a2 2 0 0 0-2 2v5"></path><rect x="2" y="3" width="7" height="10" rx="1"></rect><path d="M5 7h2"></path><path d="M5 10h2"></path></svg>`,
    recycle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6v6h-6"></path><path d="M3 18v-6h6"></path><path d="M20 9a8 8 0 0 0-14.4-3.6L3 8"></path><path d="M4 15a8 8 0 0 0 14.4 3.6L21 16"></path></svg>`,
    whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`
};

const PROMPT_TEMPLATES = [
    {
        title: 'Cobertura por proximidade',
        text: 'Quem pode cobrir a falta do RE (RE) hoje, que trabalha mais perto?'
    },
    {
        title: 'Cobertura por nome',
        text: 'Quem pode cobrir a falta de (NOME) hoje, que trabalha mais perto?'
    },
    {
        title: 'Cobertura por unidade',
        text: 'Preciso de alguém para cobrir o posto (UNIDADE) hoje. Quem está de folga?'
    },
    {
        title: 'Contato rápido',
        text: 'Qual o contato/WhatsApp do RE (RE)?'
    },
    {
        title: 'Contato por nome',
        text: 'Qual o contato/WhatsApp de (NOME)?'
    },
    {
        title: 'Horário e escala',
        text: 'Qual o horário e escala do RE (RE)?'
    },
    {
        title: 'Horário por nome',
        text: 'Qual o horário e escala de (NOME)?'
    },
    {
        title: 'Busca por unidade',
        text: 'Listar colaboradores da unidade (UNIDADE).'
    },
    {
        title: 'Plantão hoje',
        text: 'Quem está em plantão hoje na unidade (UNIDADE)?'
    },
    {
        title: 'Folga hoje',
        text: 'Quem está de folga hoje na unidade (UNIDADE)?'
    },
    {
        title: 'Afastamentos',
        text: 'Quem está afastado ou de férias na unidade (UNIDADE)?'
    },
    {
        title: 'Contagem geral',
        text: 'Quantos colaboradores estão em plantão hoje na unidade (UNIDADE)?'
    },
    {
        title: 'Endereço da unidade',
        text: 'Qual é o endereço do posto (UNIDADE)?'
    },
    {
        title: 'Sugestão rápida',
        text: 'Sugira um colaborador disponível para cobertura no posto (UNIDADE) hoje.'
    }
];

const SEARCH_TOKENS = [
    { key: 'RE', label: 'RE' },
    { key: 'UNIDADE', label: 'Unidade/Posto' },
    { key: 'NOME', label: 'Nome do colaborador' },
    { key: 'GRUPO', label: 'Grupo (BOMBEIROS/SERVIÇOS/SEGURANÇA/RB)' }
];

// Elementos DOM
const gateway = document.getElementById('gateway');
const appContainer = document.getElementById('app-container');
const appTitle = document.getElementById('app-title');
const contentArea = document.getElementById('content-area');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    localStorage.setItem('aiSearchEnabled', '0'); // Modo IA sempre inicia desativado
    initAdmins();
    loadLocalState();
    loadAvisos();
    loadFtLaunches();
    loadFtReasons();
    loadReciclagemTemplates();
    loadReciclagemOverrides();
    loadReciclagemHistory();
    loadReciclagemNotes();
    loadReciclagemData(false);
    loadAuthFromStorage();
    loadUnitAddressDb();
    shadowPullState(false);
    startShadowAutoPull();
    document.body.classList.add('on-gateway');
    renderGateway();
    updateMenuStatus();
    updateLastUpdatedDisplay();
});

// Botão de Scroll Top
window.onscroll = function() {
    const btn = document.getElementById("scroll-top-btn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.classList.add("show");
    } else {
        btn.classList.remove("show");
    }
};

// 1. Renderizar Gateway
function renderGateway() {
    gateway.innerHTML = `
        <h2>Selecione a Unidade</h2>
        <div class="gateway-grid">
            ${createCard('Dunamis Bombeiros', CONFIG.images.bombeiros, 'bombeiros')}
            ${createCard('Dunamis Serviços', CONFIG.images.servicos, 'servicos')}
            ${createCard('Dunamis Segurança', CONFIG.images.seguranca, 'seguranca')}
            ${createCard('RB Facilities', CONFIG.images.rb, 'rb')}
            <div class="gateway-card gateway-card-general" onclick="loadGroup('todos')">
                <div class="gateway-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 3a15 15 0 0 1 0 18"></path>
                        <path d="M3 12h18"></path>
                    </svg>
                </div>
                <h3>Visualização Geral</h3>
                <p>Todas as unidades</p>
            </div>
        </div>
        <div class="gateway-links">
            <button class="btn" onclick="openDunamisProjects()">Clique aqui para conferir os outros sites Dunamis IA</button>
        </div>
    `;
}

function createCard(title, imgPath, key) {
    return `
        <div class="gateway-card" onclick="loadGroup('${key}')">
            <img src="${imgPath}" alt="${title}">
            <h3>${title}</h3>
        </div>
    `;
}

function openDunamisProjects() {
    const page = `
        <html>
            <head>
                <title>Dunamis IA - Projetos</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    body { font-family: Arial, sans-serif; background:#f6f7fb; margin:0; padding:30px; }
                    h1 { color:#002d72; margin-bottom:10px; }
                    .card { background:#fff; border:1px solid #e5e7eb; border-radius:10px; padding:16px; margin:12px 0; }
                    a { color:#0b4fb3; text-decoration:none; font-weight:bold; }
                    a:hover { text-decoration:underline; }
                </style>
            </head>
            <body>
                <h1>Dunamis IA - Projetos</h1>
                <div class="card"><a href="https://gustauvm.github.io/PORTAL-DE-TROCA/gateway.html" target="_blank">Portal de Trocas</a></div>
                <div class="card"><a href="https://gustauvm.pythonanywhere.com/" target="_blank">Organizador de Relatório Nexti por RE</a></div>
                <div class="card"><a href="https://dunamis.squareweb.app/" target="_blank">Conversor de Planilhas - Movimentação Diária</a></div>
                <div class="card"><a href="https://gustauvm.github.io/ENDERECOS-DUNAMIS/" target="_blank">Endereços das Unidades</a></div>
            </body>
        </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
        w.document.write(page);
        w.document.close();
    }
}

// 2. Carregar Dados (Integração Google Sheets)
async function loadGroup(groupKey) {
    currentGroup = groupKey;
    
    // UI Feedback
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    appContainer.style.display = 'block';
    contentArea.innerHTML = '<div class="loading">Carregando dados do Google Sheets...</div>';

    await shadowPullState(false);
    
    // Verificar se existem edições locais
    let keepChanges = false;
    const hasLocalChanges = Object.keys(collaboratorEdits).length > 0
        || Object.keys(unitMetadata).length > 0
        || getLocalCollaborators().length > 0;
    if (shadowEnabled()) {
        keepChanges = hasLocalChanges;
    } else if (hasLocalChanges) {
        keepChanges = confirm("Existem alterações locais salvas (edições de colaboradores ou unidades). Deseja mantê-las sobre os dados da planilha?");
        if (!keepChanges) {
            clearLocalState();
            saveLocalCollaborators([]);
        }
    }

    // ----------------------------------------------------------------------
    // 🔄 MODO API NEXTI
    // ----------------------------------------------------------------------
    if (CONFIG.useApiNexti && NEXTI_AVAILABLE) {
        try {
            const nextiData = await fetchAllNextiPersons();
            
            // Filtra os dados se um grupo específico for selecionado (Lógica de filtro pode precisar de ajuste conforme dados reais)
            let filteredData = nextiData;
            if (groupKey !== 'todos') {
                // Exemplo: Filtrar por Unidade de Negócio se o nome contiver a chave do grupo
                filteredData = nextiData.filter(p => p.businessUnitName && p.businessUnitName.toLowerCase().includes(groupKey));
            }

            let items = mapNextiToAppFormat(filteredData, groupKey, keepChanges);

            // 🔄 Status real do dia via eventos
            const eventsMap = await fetchNextiEventsForDate(new Date());
            if (eventsMap) {
                applyNextiEventsToItems(items, eventsMap);
            }
            
            // 🔄 Sincronização de Afastamentos (Camada Nova)
            items = await enrichWithNextiAbsences(items);
            
            currentData = items.map((item, idx) => ({ ...item, id: idx }));
            lastUpdatedAt = new Date();
            
            appTitle.innerText = `Gerenciamento de Efetivos - ${groupKey === 'todos' ? 'Geral' : groupKey.toUpperCase()} (API)`;
            renderDashboard();
            updateLastUpdatedDisplay();
            return;
        } catch (error) {
            console.error("Erro na API Nexti:", error);
            showToast("Erro ao carregar dados da API. Verifique o console.", "error");
            if (CONFIG.disableCsvFallback) {
                resetToGateway();
                return;
            }
        }
    }

    // ----------------------------------------------------------------------
    // 📄 MODO PLANILHA CSV (LEGADO)
    // ----------------------------------------------------------------------
    // Carregar dados de telefones
    const phoneCsv = await fetchSheetData(CONFIG.sheets.phones);
    const phoneMap = processPhoneData(phoneCsv);

    currentData = [];
    
    if (groupKey === 'todos') {
        const keys = Object.keys(CONFIG.sheets).filter(k => k !== 'phones');
        const promises = keys.map(async (key) => {
            const csv = await fetchSheetData(CONFIG.sheets[key]);
            if (csv) {
                const rows = parseCSV(csv);
                if (rows.length > 0) rows.shift();
                // Vincula telefones automáticos para todos os grupos
                return mapRowsToObjects(rows, key, keepChanges, phoneMap);
            }
            return [];
        });
        
        const results = await Promise.all(promises);
        let allItems = [];
        results.forEach(items => allItems = allItems.concat(items));

        allItems = mergeLocalCollaborators(allItems, 'todos');
        
        currentData = allItems.map((item, idx) => ({ ...item, id: idx }));
        lastUpdatedAt = new Date();
        appTitle.innerText = 'Gerenciamento de Efetivos - Geral';
    } else {
        const csv = await fetchSheetData(CONFIG.sheets[groupKey]);
        if (csv) {
            const rows = parseCSV(csv);
            if (rows.length > 0) rows.shift();
            // Vincula telefones automáticos para todos os grupos
            let items = mapRowsToObjects(rows, groupKey, keepChanges, phoneMap);
            items = mergeLocalCollaborators(items, groupKey);
            currentData = items.map((item, idx) => ({ ...item, id: idx }));
            lastUpdatedAt = new Date();
        }
        appTitle.innerText = `Gerenciamento de Efetivos - ${groupKey.toUpperCase()}`;
    }

    renderDashboard();
    updateLastUpdatedDisplay();
}

// 3. Voltar ao Gateway
function resetToGateway() {
    appContainer.style.display = 'none';
    gateway.classList.remove('hidden');
    document.body.classList.add('on-gateway');
    document.body.classList.remove('utility-open');
    currentData = [];
    currentGroup = '';
    hiddenUnits.clear();
    minimizedUnits.clear();
    // Não limpamos unitMetadata e collaboratorEdits aqui para permitir persistência na sessão
}

async function getAllCollaborators() {
    const ttl = 5 * 60 * 1000;
    if (allCollaboratorsCache.items && (Date.now() - allCollaboratorsCache.updatedAt) < ttl) {
        return allCollaboratorsCache.items;
    }
    try {
        const phoneCsv = await fetchSheetData(CONFIG.sheets.phones);
        const phoneMap = processPhoneData(phoneCsv);
        const keys = Object.keys(CONFIG.sheets).filter(k => k !== 'phones');
        const results = await Promise.all(keys.map(async (key) => {
            const csv = await fetchSheetData(CONFIG.sheets[key]);
            if (!csv) return [];
            const rows = parseCSV(csv);
            if (rows.length > 0) rows.shift();
            return mapRowsToObjects(rows, key, false, phoneMap);
        }));
        let allItems = [];
        results.forEach(items => allItems = allItems.concat(items));
        allItems = mergeLocalCollaborators(allItems, 'todos');
        allCollaboratorsCache = {
            items: allItems.map((item, idx) => ({ ...item, id: idx })),
            updatedAt: Date.now()
        };
        return allCollaboratorsCache.items;
    } catch {
        return currentData || [];
    }
}

// ==========================================================================
// 📌 LÓGICA DE PROCESSAMENTO DE DADOS
// ==========================================================================

// Função para buscar todos os colaboradores da API Nexti (Paginação)
async function fetchAllNextiPersons() {
    let allPersons = [];
    let page = 0;
    let last = false;
    const size = 100; // Busca em lotes de 100

    while (!last) {
        const response = await fetch(`${CONFIG.api.baseUrl}/persons/all?page=${page}&size=${size}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.api.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Erro API: ${response.status}`);

        const data = await response.json();
        if (data.content) {
            allPersons = allPersons.concat(data.content);
        }
        
        last = data.last;
        page++;
    }
    return allPersons;
}

// Adaptador: Transforma JSON da Nexti no formato interno do App
function mapNextiToAppFormat(nextiPersons, groupTag, keepChanges) {
    return nextiPersons.map(p => {
        const re = (p.enrolment || '').trim();

        // Se optou por manter alterações e existe edição para este RE, usa a edição
        if (keepChanges && collaboratorEdits[re]) {
            return { ...collaboratorEdits[re], grupo: groupTag };
        }

        // Extração de Tipo de Escala (Lógica mantida do original)
        let rawEscala = p.nameSchedule || '';
        let tipoEscala = extrairTipoEscala(rawEscala);

        // Mapeamento de campos API -> App
        return {
            nome: (p.name || '').trim().toUpperCase(),
            re: re,
            posto: (p.workplaceName || '').trim().toUpperCase() || 'N/I',
            grupoLabel: (groupTag || '').trim().toUpperCase(),
            escala: rawEscala.replace("PRE-ASSINALADO", "").replace("12x36", "").replace("5x2", "").replace("6x1", "").trim(),
            tipoEscala: tipoEscala,
            // Tenta usar rotationCode da API, senão fallback para 1
            turma: p.rotationCode ? parseInt(p.rotationCode) : 1, 
            rotulo: '', 
            rotuloInicio: '',
            rotuloFim: '',
            rotuloDetalhe: '',
            grupo: groupTag,
            // API já fornece telefone, não precisa de map externo
            telefone: (p.phone || p.phone2 || '').replace(/\D/g, ''),
            _nextiId: p.id // ID interno para busca de afastamentos
        };
    }).filter(item => item && item.nome && item.re);
}

function mapRowsToObjects(rows, groupTag, keepChanges, phoneMap) {
    return rows.map((cols) => {
        if (cols.length < 6) return null; // Garante mínimo de colunas

        const re = (cols[5] || '').trim();
        const nome = (cols[4] || '').trim().toUpperCase();
        const posto = (cols[7] || '').trim().toUpperCase();
        const reNorm = re.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (nome === 'COLABORADOR' && reNorm === 'MATRICULA' && posto === 'POSTO') return null;
        
        // Se optou por manter alterações e existe edição para este RE, usa a edição
        if (keepChanges && collaboratorEdits[re]) {
            return { ...collaboratorEdits[re], grupo: groupTag }; // Mantém grupo atual
        }

        const telefone = findPhone(re, nome, phoneMap);
        const grupoLabel = (cols[0] || '').trim().toUpperCase();

        // Extração de Tipo de Escala (12x36, 5x2, etc)
        let rawEscala = cols[2] || '';
        let tipoEscala = extrairTipoEscala(rawEscala);

        const obj = {
            // ID será atribuído depois
            nome: nome,
            re: (cols[5] || '').trim(),
            posto: posto || 'N/I',
            grupoLabel: grupoLabel,
            escala: rawEscala.replace("PRE-ASSINALADO", "").replace("12x36", "").replace("5x2", "").replace("6x1", "").trim(),
            tipoEscala: tipoEscala,
            turma: parseInt(cols[3]) || 1, // Padrão 1 se falhar, igual ao original
            rotulo: '', // Campo para afastamentos/rótulos
            rotuloInicio: '',
            rotuloFim: '',
            rotuloDetalhe: '', // Descrição para 'Outros'
            grupo: groupTag,
            telefone: telefone
        };

        return obj;
    }).filter(item => item && item.nome && item.re); // Filtra linhas inválidas
}

// ==========================================================================
// 🔌 ADAPTER API NEXTI
// ==========================================================================

// Busca todos os colaboradores (com paginação automática)
async function fetchNextiPeople() {
    let allPersons = [];
    let page = 0;
    let hasMore = true;
    const size = 100;

    while (hasMore) {
        const response = await fetch(`${CONFIG.api.baseUrl}/persons/all?page=${page}&size=${size}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.api.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`Erro API: ${response.status}`);

        const data = await response.json();
        if (data.content && Array.isArray(data.content)) {
            allPersons = allPersons.concat(data.content);
            hasMore = !data.last;
            page++;
        } else {
            hasMore = false;
        }
    }
    return allPersons;
}

function extrairTipoEscala(rawEscala) {
    if (!rawEscala) return '';
    const matchEscala = rawEscala.match(/(12[xX]36|5[xX]2|6[xX]1)/i);
    return matchEscala ? matchEscala[0].toUpperCase() : '';
}


// ==========================================================================
// ⏱️ STATUS REAL DO DIA (NEXTI)
// ==========================================================================

async function fetchNextiEventsForDate(date) {
    try {
        const ref = formatNextiDate(date);
        const response = await fetch(`${CONFIG.api.baseUrl}/timetrackings/eventsperday/${ref}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.api.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) return null;

        const data = await response.json();
        const events = Array.isArray(data.value) ? data.value : [];
        const map = {};

        events.forEach(ev => {
            if (ev && ev.personId != null) {
                map[String(ev.personId)] = ev;
            }
        });

        return map;
    } catch (e) {
        console.error("Erro ao buscar eventos do dia (Nexti)", e);
        return null;
    }
}

function applyNextiEventsToItems(items, eventsMap) {
    if (!items || !eventsMap) return items;
    items.forEach(item => {
        if (!item || item._nextiId == null) return;
        const key = String(item._nextiId);
        if (eventsMap[key]) {
            item._nextiHasEvent = true;
            item._nextiEventType = (eventsMap[key].timeTrackingTypeName || '').toUpperCase();
        }
    });
    return items;
}

// ==========================================================================
// 🏥 GESTÃO DE AFASTAMENTOS (NEXTI)
// ==========================================================================

let absenceSituationsCache = null;

async function fetchAbsenceSituations() {
    if (absenceSituationsCache) return absenceSituationsCache;
    try {
        const response = await fetch(`${CONFIG.api.baseUrl}/absencesituations/all?size=1000`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${CONFIG.api.token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) return {};
        const data = await response.json();
        const map = {};
        if (data.content) {
            data.content.forEach(s => {
                map[s.id] = s.name.toUpperCase();
                map[s.externalId] = s.name.toUpperCase();
            });
        }
        absenceSituationsCache = map;
        return map;
    } catch (e) {
        console.error("Erro ao buscar situações de ausência", e);
        return {};
    }
}

async function enrichWithNextiAbsences(items) {
    if (!items || items.length === 0) return items;
    
    const situationsMap = await fetchAbsenceSituations();
    const now = new Date();
    // Janela de busca: Hoje +/- 45 dias para garantir cobertura
    const startWindow = new Date(now); startWindow.setDate(now.getDate() - 45);
    const endWindow = new Date(now); endWindow.setDate(now.getDate() + 45);
    
    const startStr = formatNextiDate(startWindow);
    const finishStr = formatNextiDate(endWindow);
    
    // Processamento em lotes para não sobrecarregar o browser
    const chunkSize = 20;
    for (let i = 0; i < items.length; i += chunkSize) {
        const chunk = items.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (item) => {
            if (!item._nextiId) return;
            try {
                const url = `${CONFIG.api.baseUrl}/absences/person/${item._nextiId}/start/${startStr}/finish/${finishStr}`;
                const res = await fetch(url, {
                    headers: { 'Authorization': `Bearer ${CONFIG.api.token}` }
                });
                if (res.ok) {
                    const data = await res.json();
                    const absences = data.content || [];
                    const activeAbsence = absences.find(a => isAbsenceActiveToday(a));
                    
                    if (activeAbsence) {
                        const name = situationsMap[activeAbsence.absenceSituationId] || 'AFASTADO';
                        applyAbsenceLabel(item, activeAbsence, name);
                    }
                }
            } catch (err) { /* Ignora erro individual */ }
        }));
    }
    return items;
}

function isAbsenceActiveToday(absence) {
    const start = parseNextiDate(absence.startDateTime);
    const end = parseNextiDate(absence.finishDateTime);
    const today = new Date();
    today.setHours(0,0,0,0);
    const todayEnd = new Date(today); todayEnd.setHours(23,59,59,999);
    return start <= todayEnd && end >= today;
}

function applyAbsenceLabel(item, absence, name) {
    let rotulo = 'AFASTADO';
    const upperName = name.toUpperCase();
    if (upperName.includes('FÉRIAS') || upperName.includes('FERIAS')) rotulo = 'FÉRIAS';
    else if (upperName.includes('ATESTADO')) rotulo = 'ATESTADO';
    else if (upperName.includes('FOLGA') && upperName.includes('TRABALHADA')) rotulo = 'FT';
    
    item.rotulo = rotulo;
    item.rotuloInicio = parseNextiDate(absence.startDateTime).toISOString().slice(0,10);
    item.rotuloFim = parseNextiDate(absence.finishDateTime).toISOString().slice(0,10);
    item.rotuloDetalhe = upperName;
    item._nextiAbsence = true;
}

function formatNextiDate(date) {
    const dd = String(date.getDate()).padStart(2, '0');
    const MM = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}${MM}${yyyy}000000`;
}

function parseNextiDate(str) {
    if (!str || str.length < 8) return new Date();
    const d = str.substring(0, 2);
    const m = str.substring(2, 4);
    const y = str.substring(4, 8);
    return new Date(`${y}-${m}-${d}T00:00:00`);
}

// Transforma o JSON da API no formato exato usado pelo App (Adapter)
function mapNextiData(persons, groupTag, keepChanges) {
    return persons.map(p => {
        const re = (p.enrolment || '').trim();

        // Mantém edições locais se existirem
        if (keepChanges && collaboratorEdits[re]) {
            return { ...collaboratorEdits[re], grupo: groupTag };
        }

        // Lógica de extração de escala (idêntica ao CSV)
        let rawEscala = p.nameSchedule || '';
        let tipoEscala = extrairTipoEscala(rawEscala);

        return {
            nome: (p.name || '').trim().toUpperCase(),
            re: re,
            posto: (p.workplaceName || '').trim().toUpperCase() || 'N/I',
            escala: rawEscala.replace("PRE-ASSINALADO", "").replace("12x36", "").replace("5x2", "").replace("6x1", "").trim(),
            tipoEscala: tipoEscala,
            turma: p.rotationCode ? parseInt(p.rotationCode) : 1, // Fallback para 1 se nulo
            rotulo: '', // API /persons/all não traz afastamentos por padrão, manter vazio para edição manual ou futuro endpoint
            rotuloInicio: '',
            rotuloFim: '',
            rotuloDetalhe: '',
            grupo: groupTag, // Atribui o grupo selecionado
            telefone: (p.phone || p.phone2 || '').replace(/\D/g, '') // Usa telefone da API
        };
    }).filter(item => item && item.nome && item.re);
}

function processPhoneData(csvText) {
    if (!csvText) return [];
    const rows = parseCSV(csvText);
    if (rows.length === 0) return [];

    // Tenta identificar colunas pelo cabeçalho
    const headers = rows[0].map(h => h.toUpperCase());
    let idxRE = headers.findIndex(h => h.includes('RE') || h.includes('MATRICULA'));
    let idxPhone = headers.findIndex(h => h.includes('TELEFONE') || h.includes('CELULAR') || h.includes('WHATSAPP') || h.includes('CONTATO'));
    let idxName = headers.findIndex(h => h.includes('NOME') || h.includes('COLABORADOR') || h.includes('FUNCIONARIO'));

    // Fallback se não encontrar headers
    if (idxRE === -1) idxRE = 1;
    if (idxPhone === -1) idxPhone = 2;
    if (idxName === -1) idxName = 0;

    rows.shift(); // Remove header

    return rows.map(cols => ({
        re: (cols[idxRE] || '').trim(),
        phone: (cols[idxPhone] || '').replace(/\D/g, ''), // Apenas números
        name: (cols[idxName] || '').trim().toUpperCase()
    })).filter(p => p.re && p.phone);
}

function findPhone(colabRE, colabName, phoneList) {
    if (!phoneList || !colabRE) return '';
    
    // Normaliza REs removendo tudo que não é letra ou número para comparação
    const cleanColabRE = colabRE.replace(/[^a-zA-Z0-9]/g, '');
    
    // Normaliza nome para comparação (remove acentos)
    const normColabName = colabName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const colabFirstName = normColabName.split(' ')[0];

    // 1. Tentativa de Match Exato (nos dados limpos)
    let match = phoneList.find(p => {
        const cleanP_RE = p.re.replace(/[^a-zA-Z0-9]/g, '');
        return cleanP_RE === cleanColabRE;
    });
    
    // 2. Tentativa de Match Parcial (Sufixo/Contém)
    if (!match) {
        match = phoneList.find(p => {
            const cleanP_RE = p.re.replace(/[^a-zA-Z0-9]/g, '');
            
            // Garante tamanho mínimo para evitar falsos positivos e verifica inclusão
            if (cleanP_RE.length >= 3 && (
                cleanColabRE.endsWith(cleanP_RE) || 
                cleanP_RE.endsWith(cleanColabRE) ||
                cleanColabRE.includes(cleanP_RE) || 
                cleanP_RE.includes(cleanColabRE)
            )) {
                // Validação secundária por nome (primeiro nome normalizado)
                const normPName = p.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
                const pFirstName = normPName.split(' ')[0];
                
                return pFirstName && colabFirstName && pFirstName === colabFirstName;
            }
            return false;
        });
    }

    return match ? match.phone : '';
}

// 4. Renderizar Dashboard (Sistema de Abas)
function renderDashboard() {
    const canManageLancamentos = isAdminRole();
    contentArea.innerHTML = `
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span id="breadcrumb-group"></span>
                <span class="breadcrumb-sep">›</span>
                <span id="breadcrumb-tab"></span>
            </div>
            <div class="breadcrumb-meta">
                <span id="breadcrumb-updated" class="breadcrumb-updated"></span>
                <span id="breadcrumb-group-pill" class="group-pill"></span>
            </div>
        </div>
        <!-- Navegação de Abas -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('busca')">${ICONS.search} Busca Rápida</button>
            <button class="tab-btn" onclick="switchTab('unidades')">${ICONS.building} Unidades</button>
            ${SiteAuth.logged ? `<button class="tab-btn" onclick="switchTab('avisos')">${ICONS.bell} Avisos <span id="avisos-tab-badge" class="tab-badge hidden">0</span></button>` : ''}
            <button class="tab-btn" onclick="switchTab('reciclagem')">${ICONS.recycle} Reciclagem</button>
            <button class="tab-btn" onclick="switchTab('lancamentos')">${ICONS.launch} Lançamentos</button>
            <button class="tab-btn" onclick="switchTab('config')">${ICONS.settings} Configuração</button>
        </div>

        <!-- Conteúdo das Abas -->
        <div id="tab-content-busca" class="tab-content">
            <div class="search-container">
                <div class="search-bar">
                    <button id="ai-search-btn" class="ai-toggle" onclick="toggleAiSearchButton()">IA: OFF</button>
                    <input type="text" id="search-input" class="search-input" 
                           placeholder="Digite nome, RE ou unidade..." autocomplete="off">
                </div>
                <div id="search-suggestions" class="search-suggestions hidden"></div>
                <div class="search-filters">
                    <button class="filter-chip active" data-filter="all" onclick="setSearchFilterStatus('all')">Todos</button>
                    <button class="filter-chip" data-filter="plantao" onclick="setSearchFilterStatus('plantao')">Plantão</button>
                    <button class="filter-chip" data-filter="folga" onclick="setSearchFilterStatus('folga')">Folga</button>
                    <button class="filter-chip" data-filter="ft" onclick="setSearchFilterStatus('ft')">FT</button>
                    <button class="filter-chip" data-filter="afastado" onclick="setSearchFilterStatus('afastado')">Afastados</button>
                    <button class="filter-chip" data-hide="1" onclick="toggleSearchHideAbsence()">Sem afastamento</button>
                </div>
            </div>
            <div id="search-results" class="results-grid"></div>
        </div>

        <div id="tab-content-unidades" class="tab-content hidden">
            <!-- Barra de Estatísticas -->
            <div id="stats-bar" class="stats-bar"></div>
            <!-- Controles -->
            <div class="search-container">
                <div class="search-bar">
                    <input type="text" id="unit-search-input" class="search-input" 
                        placeholder="🔍 Buscar unidade..." autocomplete="off">
                </div>
                <div class="search-filters unit-filters">
                    ${currentGroup === 'todos' ? `
                        <select id="unit-group-filter" class="filter-select" onchange="renderizarUnidades()">
                            <option value="all">Todos os Grupos</option>
                            <option value="bombeiros">Bombeiros</option>
                            <option value="servicos">Serviços</option>
                            <option value="seguranca">Segurança</option>
                            <option value="rb">RB Facilities</option>
                        </select>
                    ` : ''}
                    <select id="unit-status-filter" class="filter-select" onchange="renderizarUnidades()">
                        <option value="all">Todos os Status</option>
                        <option value="plantao">Em Plantão</option>
                        <option value="folga">De Folga</option>
                    </select>
                    <select id="unit-label-filter" class="filter-select" onchange="renderizarUnidades()">
                        <option value="all">Todos os Rótulos</option>
                        <option value="none">Sem Rótulo</option>
                        <option value="FÉRIAS">Férias</option>
                        <option value="ATESTADO">Atestado</option>
                        <option value="AFASTADO">Afastado</option>
                        <option value="FT">FT</option>
                        <option value="TROCA">Troca</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                    <button class="btn btn-secondary btn-small" onclick="openExportModal()">
                        ${ICONS.download} Exportar
                    </button>
                    <button class="btn btn-secondary btn-small" onclick="openHistoryModal()">
                        ${ICONS.history} Histórico
                    </button>
                </div>
            </div>
            <div id="units-list"></div>
        </div>

        <div id="tab-content-avisos" class="tab-content hidden">
            <div class="avisos-shell">
                <div class="avisos-panel">
                <div class="avisos-header">
                        <h3>Avisos</h3>
                        <div class="avisos-header-actions">
                            <span id="avisos-assignee-summary" class="avisos-summary"></span>
                            <button class="btn btn-secondary btn-small" onclick="exportarAvisosMensal()">Relatório mensal</button>
                            <button class="btn btn-secondary btn-small" onclick="openLembreteForm()">Novo Lembrete</button>
                            ${isAdminRole() ? `<button class="btn btn-small" onclick="openAvisoForm()">Novo Aviso</button>` : ''}
                        </div>
                    </div>
                    <div class="avisos-filters">
                        <select id="aviso-group-filter" class="filter-select" onchange="renderAvisos()">
                            ${getGroupOptionsHtml()}
                        </select>
                        <select id="aviso-status-filter" class="filter-select" onchange="renderAvisos()">
                            <option value="all" selected>Todos</option>
                            <option value="pending">Pendentes</option>
                            <option value="done">Concluídos</option>
                        </select>
                        <select id="aviso-assignee-filter" class="filter-select" onchange="renderAvisos()"></select>
                        <select id="aviso-priority-filter" class="filter-select" onchange="renderAvisos()">
                            <option value="all">Todas as Prioridades</option>
                            <option value="leve">Leve</option>
                            <option value="normal">Normal</option>
                            <option value="urgente">Urgente</option>
                        </select>
                        <select id="aviso-unit-filter" class="filter-select" onchange="renderAvisos()"></select>
                    </div>
                    <div id="avisos-list" class="avisos-list"></div>
                </div>

                <div class="avisos-form hidden" id="aviso-form">
                    <div class="form-header">
                        <h4>Novo Aviso</h4>
                        <button class="btn btn-secondary btn-small" onclick="closeAvisoForm()">Fechar</button>
                    </div>
                    <div class="form-group">
                        <label>Destinar para</label>
                        <select id="aviso-assignee-select"></select>
                    </div>
                    <div class="form-group">
                        <label>Formato</label>
                        <select id="aviso-type" onchange="updateAvisoType()">
                            <option value="full" selected>Aviso completo</option>
                            <option value="simple">Mensagem simples</option>
                        </select>
                    </div>
                    <div class="form-group aviso-advanced">
                        <label>Grupo</label>
                        <select id="aviso-group-select"></select>
                    </div>
                    <div class="form-group aviso-advanced">
                        <label>Tipo</label>
                        <select id="aviso-scope-select" onchange="updateAvisoScope()">
                            <option value="unit">Unidade</option>
                            <option value="collab">Colaborador</option>
                        </select>
                    </div>
                    <div class="form-group aviso-advanced">
                        <label>Unidade</label>
                        <select id="aviso-unit-select"></select>
                    </div>
                    <div class="form-group hidden aviso-advanced" id="aviso-collab-group">
                        <label>Buscar colaborador (RE ou nome)</label>
                        <input type="text" id="aviso-collab-search" placeholder="Digite RE ou nome">
                        <label>Colaborador</label>
                        <select id="aviso-collab-select"></select>
                    </div>
                    <div class="form-group aviso-advanced">
                        <label>Prioridade</label>
                        <select id="aviso-priority-select">
                            <option value="leve">Leve</option>
                            <option value="normal" selected>Normal</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Assunto</label>
                        <input type="text" id="aviso-title" placeholder="Ex: Troca de posto">
                    </div>
                    <div class="form-group">
                        <label>Mensagem</label>
                        <textarea id="aviso-message" rows="4" placeholder="Digite o aviso"></textarea>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-secondary btn-small" onclick="sendReminderWhatsapp()">Enviar no WhatsApp</button>
                    </div>
                    <button class="btn" onclick="createAviso()">Salvar Aviso</button>
                </div>
                <div class="avisos-form hidden" id="lembrete-form">
                    <div class="form-header">
                        <h4>Novo Lembrete</h4>
                        <button class="btn btn-secondary btn-small" onclick="closeLembreteForm()">Fechar</button>
                    </div>
                    <div class="form-group">
                        <label>Destinar para</label>
                        <select id="reminder-assignee-select"></select>
                    </div>
                    <div class="form-group">
                        <label>Grupo</label>
                        <select id="reminder-group-select"></select>
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select id="reminder-scope-select" onchange="updateLembreteScope()">
                            <option value="unit">Unidade</option>
                            <option value="collab">Colaborador</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Unidade</label>
                        <select id="reminder-unit-select"></select>
                    </div>
                    <div class="form-group hidden" id="reminder-collab-group">
                        <label>Buscar colaborador (RE ou nome)</label>
                        <input type="text" id="reminder-collab-search" placeholder="Digite RE ou nome">
                        <label>Colaborador</label>
                        <select id="reminder-collab-select"></select>
                    </div>
                    <div class="form-group">
                        <label>Prioridade</label>
                        <select id="reminder-priority-select">
                            <option value="leve">Leve</option>
                            <option value="normal" selected>Normal</option>
                            <option value="urgente">Urgente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Data/Hora do lembrete</label>
                        <input type="datetime-local" id="reminder-at">
                    </div>
                    <div class="form-group">
                        <label>Tipo</label>
                        <select id="reminder-type">
                            <option value="single">Único</option>
                            <option value="recurring">Recorrente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Recorrência</label>
                        <select id="reminder-every">
                            <option value="daily">Diário</option>
                            <option value="weekly">Semanal</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Assunto</label>
                        <input type="text" id="reminder-title" placeholder="Ex: Revisar troca de posto">
                    </div>
                    <div class="form-group">
                        <label>Mensagem</label>
                        <textarea id="reminder-message" rows="4" placeholder="Digite o lembrete"></textarea>
                    </div>
                    <div class="form-group">
                        <button class="btn btn-secondary btn-small" onclick="sendAvisoWhatsapp()">Enviar no WhatsApp</button>
                    </div>
                    <button class="btn" onclick="createReminder()">Salvar Lembrete</button>
                </div>
            </div>
        </div>

        <div id="tab-content-reciclagem" class="tab-content hidden">
            <div class="reciclagem-shell">
                <div class="reciclagem-header">
                    <h3>Reciclagem</h3>
                    <div class="reciclagem-actions">
                        <button class="btn btn-secondary btn-small" onclick="loadReciclagemData(true); renderReciclagem();">Atualizar</button>
                        ${isAdminRole() ? `<button class="btn btn-secondary btn-small" onclick="toggleReciclagemTemplatesPanel()">Editar mensagens</button>` : ''}
                        ${isAdminRole() ? `<button class="btn btn-secondary btn-small" onclick="toggleReciclagemHistory()">Histórico</button>` : ''}
                    </div>
                </div>
                <div id="reciclagem-summary" class="reciclagem-summary"></div>
                <div class="reciclagem-tabs">
                    <button class="reciclagem-tab active" onclick="switchReciclagemTab('colab')">Colaboradores</button>
                    <button class="reciclagem-tab" onclick="switchReciclagemTab('unit')">Unidades</button>
                </div>
                <div class="reciclagem-filters">
                    <input type="text" id="reciclagem-search" class="search-input" placeholder="Buscar por nome, RE ou unidade...">
                    <select id="reciclagem-sheet-filter" class="filter-select"></select>
                    <select id="reciclagem-status-filter" class="filter-select">
                        <option value="all">Todos os status</option>
                        <option value="ok">Em dia</option>
                        <option value="due">Próximo do vencimento</option>
                        <option value="expired">Vencido</option>
                        <option value="unknown">Sem data</option>
                    </select>
                    <button id="reciclagem-only-expired" class="btn btn-secondary btn-small" onclick="toggleReciclagemOnlyExpired()">Somente vencidos</button>
                </div>
                <div class="reciclagem-quick">
                    <span>Rápidos:</span>
                    <button class="filter-chip" data-status="expired" onclick="setReciclagemStatusFilter('expired')">Vencidos</button>
                    <button class="filter-chip" data-status="due" onclick="setReciclagemStatusFilter('due')">Próximos</button>
                    <button class="filter-chip" data-status="ok" onclick="setReciclagemStatusFilter('ok')">Em dia</button>
                    <button class="filter-chip" data-status="all" onclick="setReciclagemStatusFilter('all')">Limpar</button>
                </div>
                <div id="reciclagem-templates-panel" class="reciclagem-templates hidden">
                    <div class="reciclagem-templates-header">
                        <strong>Mensagens de renovação</strong>
                        <button class="btn-mini btn-secondary" onclick="toggleReciclagemTemplatesPanel()">Fechar</button>
                    </div>
                    <div id="reciclagem-templates-list" class="reciclagem-templates-list"></div>
                    <div class="reciclagem-templates-form">
                        <input type="text" id="reciclagem-template-id" placeholder="ID (ex: aso_mesat)">
                        <input type="text" id="reciclagem-template-label" placeholder="Título">
                        <textarea id="reciclagem-template-text" rows="3" placeholder="Mensagem"></textarea>
                        <button class="btn btn-secondary btn-small" onclick="addReciclagemTemplate()">Adicionar modelo</button>
                    </div>
                </div>
                <div id="reciclagem-history-panel" class="reciclagem-history hidden">
                    <div class="reciclagem-templates-header">
                        <strong>Histórico de alterações</strong>
                        <button class="btn-mini btn-secondary" onclick="toggleReciclagemHistory()">Fechar</button>
                    </div>
                    <div id="reciclagem-history-list" class="reciclagem-templates-list"></div>
                </div>
                <div id="reciclagem-list" class="reciclagem-list"></div>
                <div id="reciclagem-type-counts" class="reciclagem-type-counts"></div>
            </div>
        </div>

        <div id="tab-content-lancamentos" class="tab-content hidden">
            <div class="lancamentos-shell">
                <div class="lancamentos-header">
                    <h3>Lançamentos de FT</h3>
                    <div class="lancamentos-actions">
                        <button class="btn btn-secondary btn-small" onclick="syncFtFormResponses()" ${canManageLancamentos ? '' : 'disabled'}>Sincronizar confirmações</button>
                        <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Dashboard</button>
                        <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Histórico</button>
                        <button class="btn btn-small" onclick="switchLancamentosTab('novo')" ${canManageLancamentos ? '' : 'disabled'}>Novo Lançamento</button>
                    </div>
                </div>
                <div id="lancamentos-panel-dashboard" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-historico" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-novo" class="lancamentos-panel hidden">
                    <div class="form-group">
                        <label>Buscar colaborador (RE ou nome)</label>
                        <input type="text" id="ft-search" placeholder="Digite RE ou nome">
                        <select id="ft-collab-select"></select>
                    </div>
                    <div class="form-group">
                        <label>Unidade atual</label>
                        <input type="text" id="ft-unit-current" disabled>
                    </div>
                    <div class="form-group">
                        <label>Unidade FT</label>
                        <select id="ft-unit-target"></select>
                    </div>
                    <div class="form-group">
                        <label>Data da FT</label>
                        <input type="date" id="ft-date">
                    </div>
                    <div class="form-group">
                        <label>Horário / Escala</label>
                        <select id="ft-shift"></select>
                    </div>
                    <div class="form-group">
                        <label>Motivo</label>
                        <select id="ft-reason"></select>
                        <input type="text" id="ft-reason-other" class="hidden" placeholder="Descreva o motivo">
                    </div>
                    <div class="form-group">
                        <label>Cobrindo quem</label>
                        <input type="text" id="ft-covering-search" placeholder="Digite RE ou nome">
                        <select id="ft-covering-select"></select>
                        <input type="text" id="ft-covering-other" placeholder="Outro (se não estiver na lista)">
                    </div>
                    <div class="form-group">
                        <label>Observações</label>
                        <textarea id="ft-notes" class="ft-textarea" rows="3" placeholder="Digite observações..."></textarea>
                    </div>
                    <div class="form-group">
                        <button class="btn" onclick="createFtLaunch()">Salvar Lançamento</button>
                    </div>
                    <div class="ft-actions">
                        <div class="ft-actions-title">Após salvar</div>
                        <button class="btn btn-secondary btn-small" onclick="copyFtLastLink()" id="ft-copy-last" disabled>Copiar link de confirmação</button>
                        <button class="btn btn-secondary btn-small" onclick="sendFtLastWhatsapp()" id="ft-send-last" disabled>Enviar no WhatsApp</button>
                    </div>
                    <div class="hint" id="ft-form-hint"></div>
                </div>
            </div>
        </div>

        <div id="tab-content-config" class="tab-content hidden">
            <div class="config-shell">
                <div id="config-login" class="config-gate">
                    <div class="config-card">
                        <div class="config-card-header">
                            <div class="card-title">Acesso Administrativo</div>
                            <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                        </div>
                        <div class="config-card-body">
                            <div class="field-row">
                                <label>RE (últimos 4)</label>
                                <input type="text" id="loginRe" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <div class="field-row">
                                <label>CPF (primeiros 4)</label>
                                <input type="password" id="loginCpf" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <label style="font-size:0.8rem; color:#666; display:block; margin-bottom:10px;">
                                <input type="checkbox" id="keepLogged"> Manter-me conectado neste dispositivo
                            </label>
                            <button class="btn" onclick="loginSite()">Entrar</button>
                            <div class="hint">Somente administradores podem acessar as configurações.</div>
                        </div>
                    </div>
                </div>

                <div id="config-content" class="hidden">
                        <div class="config-tabs">
                            <button class="config-tab active" onclick="switchConfigTab('access')">Acesso</button>
                            <button class="config-tab" onclick="switchConfigTab('datasource')">Fonte de Banco de Dados</button>
                            <button class="config-tab" onclick="switchConfigTab('ft')">FT</button>
                        </div>

                    <div id="config-pane-access" class="config-pane">
                        <div class="config-card">
                            <div class="config-card-header">
                                <div class="card-title">Login</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div id="statusSection">
                                    <div class="status-block">
                                        <div class="status-row"><span>Usuário</span><span id="userRe"></span></div>
                                        <div class="status-row"><span>Modo</span><span id="siteMode"></span></div>
                                    </div>
                                    <div class="actions">
                                        <button class="btn" onclick="toggleEditMode()">Alternar Modo Edição</button>
                                        <button class="btn btn-secondary" onclick="logoutSite()">Sair</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                    <div class="config-card hidden" id="adminTools">
                        <div class="config-card-header">
                            <div class="card-title">Admin</div>
                            <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                        </div>
                        <div class="config-card-body">
                            <div class="sub-title">Administradores</div>
                            <div id="adminList" class="admin-list"></div>

                            <div class="divider"></div>
                            <div class="sub-title">Adicionar administrador</div>
                            <div class="field-row">
                                <label>RE</label>
                                <input type="text" id="cfg-admin-re" placeholder="0000">
                            </div>
                            <div class="field-row">
                                <label>CPF (4 primeiros)</label>
                                <input type="password" id="cfg-admin-cpf" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <button class="btn" onclick="addAdminFromConfig()">Adicionar Admin</button>

                            <div class="divider"></div>
                            <div class="sub-title">Adicionar supervisor (somente avisos)</div>
                            <div class="field-row">
                                <label>RE</label>
                                <input type="text" id="cfg-supervisor-re" placeholder="0000">
                            </div>
                            <div class="field-row">
                                <label>CPF (4 primeiros)</label>
                                <input type="password" id="cfg-supervisor-cpf" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <button class="btn" onclick="addSupervisorFromConfig()">Adicionar Supervisor</button>

                            <div class="divider"></div>
                            <div class="sub-title">Alterar senha de outro usuário (Admin Master)</div>
                            <div class="field-row">
                                <label>Usuário</label>
                                <select id="cfg-reset-user"></select>
                            </div>
                            <div class="field-row">
                                <label>Nova senha (4 dígitos)</label>
                                <input type="password" id="cfg-reset-pass" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <div class="field-row">
                                <label>Confirmar nova senha</label>
                                <input type="password" id="cfg-reset-pass-confirm" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <button class="btn" onclick="changeOtherAdminPassword()">Alterar Senha</button>

                            <div class="divider"></div>
                            <div class="sub-title">Adicionar colaborador (local)</div>
                            <div class="field-row">
                                <label>RE</label>
                                <input type="text" id="cfg-re" placeholder="0000">
                            </div>
                            <button class="btn" onclick="addLocalCollaboratorFromConfig()">Adicionar Colaborador</button>
                            <div class="hint">Senha padrão do colaborador: 4 primeiros dígitos do CPF (sem pontuação).</div>

                            <div class="divider"></div>

                            <div class="sub-title">Alterar senha (local)</div>
                            <div class="field-row">
                                <label>Nova senha (4 dígitos)</label>
                                <input type="password" id="cfg-new-pass" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <div class="field-row">
                                <label>Confirmar nova senha</label>
                                <input type="password" id="cfg-new-pass-confirm" maxlength="4" inputmode="numeric" placeholder="0000">
                            </div>
                            <button class="btn" onclick="changeLocalAdminPassword()">Alterar Senha</button>
                            <div class="hint">Senha local é usada apenas no site.</div>
                        </div>
                    </div>

                </div>

                    <div id="config-pane-datasource" class="config-pane hidden">
                        <div class="config-card">
                            <div class="config-card-header">
                                <div class="card-title">Modo de Banco de Dados</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div class="field-row">
                                    <label><input type="checkbox" id="useNextiToggle" onchange="toggleSource('nexti')"> Fonte principal: Nexti</label>
                                </div>
                                <div class="field-row">
                                    <label><input type="checkbox" id="disableCsvToggle" onchange="toggleSource('csv')"> Fallback: usar Planilhas (CSV) se Nexti falhar</label>
                                </div>
                            </div>
                        </div>

                        <div class="config-card">
                            <div class="config-card-header">
                                <div class="card-title">Status das Fontes</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div id="sourceStatus" class="source-status"></div>
                                <div id="dataSourceList" class="source-list"></div>
                            </div>
                        </div>

                        <div class="config-card">
                            <div class="config-card-header">
                                <div class="card-title">Sincronização (Shadow)</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div id="shadowStatus" class="shadow-status-block"></div>
                                <div class="config-note">Manter alterações (padrão): carrega a base original e aplica as alterações do shadow por cima. Nada é apagado.</div>
                                <div class="config-note">Importar base atual para o shadow: grava a base atual do site no banco shadow. Útil para criar um snapshot global. Pode sobrescrever versões anteriores.</div>
                                <div class="config-note">Zerar banco shadow: apaga todas as alterações e histórico global. O site volta a usar apenas a base original.</div>
                                <div class="config-note">Sincronizar histórico: força a regravação do histórico do site no banco shadow. Não altera a base original.</div>
                                <div class="actions" id="shadowActions">
                                    <button class="btn" onclick="shadowPullAndReload()">Aplicar alterações do shadow agora</button>
                                    <button class="btn btn-secondary" onclick="shadowPushSnapshot()">Importar base atual para o shadow</button>
                                    <button class="btn btn-danger" onclick="shadowResetAll()">Resetar banco de dados (shadow)</button>
                                    <button class="btn btn-secondary" onclick="shadowPushHistory()">Sincronizar histórico</button>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="config-pane-ft" class="config-pane hidden">
                        <div class="config-card">
                            <div class="config-card-header">
                                <div class="card-title">Configurações de FT</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div class="hint">Edite motivos e mantenha o padrão de lançamentos.</div>
                            </div>
                        </div>
                        <div class="config-card" id="ftReasonsCard">
                            <div class="config-card-header">
                                <div class="card-title">Motivos de FT</div>
                                <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                            </div>
                            <div class="config-card-body">
                                <div id="ftReasonsList" class="admin-list"></div>
                                <div class="divider"></div>
                                <div class="field-row">
                                    <label>Novo motivo</label>
                                    <input type="text" id="ft-reason-new" placeholder="Ex: Treinamento">
                                </div>
                                <button class="btn btn-secondary" onclick="addFtReason()">Adicionar motivo</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Edição -->
        <div id="edit-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.edit} Editar Colaborador</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeEditModal()">Fechar</button>
                        <button class="btn btn-compact" onclick="salvarEdicao()">Salvar</button>
                    </div>
                </div>
                
                <input type="hidden" id="edit-id">

                <div class="form-group">
                    <label>Nome Completo</label>
                    <input type="text" id="edit-nome">
                </div>
                <div class="form-grid">
                    <div class="form-group"><label>RE</label><input type="text" id="edit-re"></div>
                    <div class="form-group"><label>Posto (Unidade)</label><select id="edit-posto"></select></div>
                    <div class="form-group"><label>Telefone</label><input type="text" id="edit-telefone" placeholder="(11) 99999-9999"></div>
                </div>
                <div class="form-grid">
                    <div class="form-group"><label>Escala (Horário)</label><select id="edit-escala"></select></div>
                    <div class="form-group">
                        <label>Regra de Plantão</label>
                        <select id="edit-turma">
                            <option value="1">Plantão ÍMPAR</option>
                            <option value="2">Plantão PAR</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>Rótulo / Afastamento (Múltipla Escolha)</label>
                    <div id="edit-rotulo-container" class="checkbox-group">
                        <label><input type="checkbox" value="FÉRIAS"> Férias</label>
                        <label><input type="checkbox" value="ATESTADO"> Atestado</label>
                        <label><input type="checkbox" value="AFASTADO"> Afastamento</label>
                        <label><input type="checkbox" value="FT"> FT</label>
                        <label><input type="checkbox" value="TROCA"> Troca</label>
                        <label><input type="checkbox" value="OUTRO"> Outro</label>
                    </div>
                </div>
                <div id="div-rotulo-desc" class="form-group hidden">
                    <label>Descrição (Outros)</label>
                    <input type="text" id="edit-rotulo-desc" placeholder="Ex: Curso, Licença...">
                </div>
                <div class="form-grid">
                    <div class="form-group"><label>Início (Opcional)</label><input type="date" id="edit-inicio"></div>
                    <div class="form-group"><label>Fim (Opcional)</label><input type="date" id="edit-fim"></div>
                </div>

                <div class="modal-actions" style="justify-content: space-between;">
                    <button class="btn" style="background-color: #dc3545; width: auto;" onclick="removerColaborador()">Excluir</button>
                    <button class="btn btn-secondary" style="width: auto;" onclick="closeEditModal()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- Modal de Edição de Unidade -->
        <div id="edit-unit-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.settings} Editar Unidade</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeEditUnitModal()">Fechar</button>
                        <button class="btn btn-compact" onclick="salvarEdicaoUnidade()">Salvar</button>
                    </div>
                </div>
                <input type="hidden" id="edit-unit-old-name">
                
                <div class="form-group">
                    <label>Nome da Unidade</label>
                    <input type="text" id="edit-unit-new-name">
                </div>

                <div class="form-group">
                    <label>Rótulo da Unidade (Múltipla Escolha)</label>
                    <div id="edit-unit-rotulo-container" class="checkbox-group">
                        <label><input type="checkbox" value="REFEICAO"> Refeição no Local</label>
                        <label><input type="checkbox" value="VT"> Vale Transporte</label>
                        <label><input type="checkbox" value="OUTRO"> Outro</label>
                    </div>
                </div>
                <div id="div-unit-rotulo-desc" class="form-group hidden">
                    <label>Descrição (Outros)</label>
                    <input type="text" id="edit-unit-rotulo-desc" placeholder="Ex: Fretado, Insalubridade...">
                </div>
                
                <div class="add-member-section" style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 15px;">
                    <h4>Adicionar Colaborador</h4>
                    <div class="form-grid">
                        <div class="form-group"><input type="text" id="new-colab-nome" placeholder="Nome Completo"></div>
                        <div class="form-group"><input type="text" id="new-colab-re" placeholder="RE"></div>
                        <div class="form-group"><input type="text" id="new-colab-telefone" placeholder="Celular"></div>
                        <div class="form-group">
                            <select id="new-colab-horario">
                                <option value="">Selecione o horário</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select id="new-colab-turma">
                                <option value="1">Plantão ÍMPAR</option>
                                <option value="2">Plantão PAR</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select id="new-colab-unidade">
                                <option value="">Unidade atual</option>
                            </select>
                        </div>
                    </div>
                    <button class="btn btn-small" onclick="adicionarColaboradorNaUnidade()">Adicionar</button>
                </div>

                <div class="bulk-actions-section">
                    <h4>Ações em Massa</h4>
                    <div class="bulk-controls">
                        <select id="bulk-action-select">
                            <option value="">-- Selecione uma ação --</option>
                            <option value="move">Mover para outra Unidade</option>
                            <option value="scale">Alterar Escala</option>
                        </select>
                        <input type="text" id="bulk-action-value" placeholder="Nova Unidade ou Escala" style="display:none;">
                        <select id="bulk-unit-select" style="display:none; width: 100%;"></select>
                        <select id="bulk-scale-select" style="display:none; width: 100%;"></select>
                        <button class="btn btn-small" onclick="executarAcaoEmMassa()">Aplicar</button>
                    </div>
                    <div class="unit-members-list" id="unit-members-list">
                        <!-- Lista com checkboxes -->
                    </div>
                </div>

            </div>
        </div>

        <!-- Modal de Histórico -->
        <div id="history-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${ICONS.history} Histórico de Alterações</h3>
                    <button class="close-modal" onclick="closeHistoryModal()">${ICONS.close}</button>
                </div>
                <div id="history-actions" class="history-actions"></div>
                <div id="history-list" class="unit-members-list" style="max-height: 400px;"></div>
            </div>
        </div>

        <!-- Modal de Opções de Contato -->
        <div id="phone-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 350px; text-align: center;">
                <div class="modal-header" style="justify-content: center; border: none; padding-bottom: 0;">
                    <h3 id="phone-modal-title">Contato</h3>
                </div>
                <p id="phone-modal-number" style="color: #666; margin-bottom: 20px;"></p>
                <div style="display: flex; flex-direction: column; gap: 10px;">
                    <button class="btn whatsapp-btn" onclick="contactWhatsApp()">${ICONS.whatsapp} WhatsApp</button>
                    <button class="btn" onclick="contactCall()">${ICONS.phone} Ligar</button>
                    <button class="btn btn-secondary" onclick="closePhoneModal()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- Modal de Exportação -->
        <div id="export-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${ICONS.download} Exportação</h3>
                    <button class="close-modal" onclick="closeExportModal()">${ICONS.close}</button>
                </div>

                <div class="export-grid">
                    <div class="export-col">
                        <h4>Planilhas</h4>
                        <button class="btn" onclick="exportarSomentePlantao()">Exportar Somente Plantão (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarSomenteFolga()">Exportar Somente Folga (XLSX)</button>
                        <button class="btn" onclick="exportarBaseAtualizada()">Baixar Base Atualizada (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarResumo()">Baixar Resumo (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarTudo()">Baixar Completo (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarCSVAtualizado()">Baixar CSV Atualizado</button>
                        <button class="btn btn-secondary" onclick="exportarGraficos()">Baixar Dados p/ Gráficos (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarRelatorioIA()">Baixar Relatório IA (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarResumoGerencial()">Baixar Resumo Gerencial (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarHistoricoDetalhado()">Baixar Histórico Detalhado (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarRelatorioTexto()">Baixar Relatório Texto (TXT)</button>
                        <h4 style="margin-top:16px;">PDFs</h4>
                        <button class="btn btn-secondary" onclick="exportarPDFResumoExecutivo()">Gerar PDF - Resumo Executivo</button>
                        <button class="btn btn-secondary" onclick="exportarPDFHistorico()">Gerar PDF - Histórico</button>
                    </div>
                    <div class="export-col">
                        <h4>Conteúdo</h4>
                        <p class="export-note">Base Atualizada contém o banco original com as alterações do shadow aplicadas.</p>
                        <p class="export-note">Resumo inclui totais por unidade, status e rótulos.</p>
                        <p class="export-note">Completo inclui todas as abas: Base, Resumo, Unidades, Rótulos e Histórico.</p>
                        <p class="export-note">Dados p/ Gráficos traz séries prontas para gráfico de plantão x folga e top unidades.</p>
                        <p class="export-note">Relatório IA gera observações automáticas sobre cobertura e rótulos (shadow).</p>
                        <p class="export-note">Resumo Gerencial traz visão executiva, por grupo/unidade/status/rótulo e indicadores.</p>
                        <p class="export-note">Histórico Detalhado organiza ações por responsável, data e tipo de alteração.</p>
                        <p class="export-note">Relatório Texto gera um resumo pronto para envio à gerência.</p>
                        <p class="export-note">PDFs geram versões prontas para apresentação (resumo e histórico).</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Exportação Unidade -->
        <div id="export-unit-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 420px;">
                <div class="modal-header">
                    <h3>${ICONS.download} Exportar Unidade</h3>
                    <button class="close-modal" onclick="closeExportUnitModal()">${ICONS.close}</button>
                </div>
                <div class="export-grid">
                    <button class="btn btn-secondary" onclick="confirmExportUnit('xlsx')">Exportar XLSX</button>
                    <button class="btn btn-secondary" onclick="confirmExportUnit('csv')">Exportar CSV</button>
                </div>
                <p class="export-note" id="export-unit-note"></p>
            </div>
        </div>

        <!-- Modal de Ajuda Rápida -->
        <div id="help-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Ajuda rápida</h3>
                    <button class="close-modal" onclick="closeHelpModal()">${ICONS.close}</button>
                </div>
                <div class="help-content">
                    <div class="help-section">
                        <h4>Busca rápida</h4>
                        <ul>
                            <li>Digite nome, RE ou unidade para localizar colaboradores.</li>
                            <li>Os resultados aparecem instantaneamente conforme você digita.</li>
                            <li>Use o botão de WhatsApp para contato rápido quando disponível.</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>Unidades</h4>
                        <ul>
                            <li>Filtre por grupo e por status (Plantão/Folga) quando necessário.</li>
                            <li>Clique no nome da unidade para expandir ou recolher a lista.</li>
                            <li>Use “Histórico” para revisar alterações locais feitas no site.</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>Dicas úteis</h4>
                        <ul>
                            <li>“Atualizado em” mostra quando os dados foram carregados.</li>
                            <li>“Imprimir visão atual” gera uma saída simples para impressão.</li>
                            <li>As alterações são sincronizadas no banco shadow quando configurado.</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Prompts -->
        <div id="prompts-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header sticky-modal-header">
                    <h3>Dicas de prompts (copiar e colar)</h3>
                    <button class="close-modal" onclick="closePromptsModal()">${ICONS.close}</button>
                </div>
                <div class="help-content">
                    <div class="help-section">
                        <p>Modelos prontos. Substitua (RE) e (UNIDADE). A busca IA atualiza em tempo real.</p>
                    </div>
                    <div id="prompt-templates" class="prompt-list"></div>
                </div>
            </div>
        </div>

        <!-- Modal Reciclagem -->
        <div id="reciclagem-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.edit} Editar Reciclagem</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeReciclagemModal()">Fechar</button>
                        <button class="btn btn-compact" onclick="saveReciclagemEdit()">Salvar</button>
                    </div>
                </div>
                <input type="hidden" id="reciclagem-edit-key">
                <input type="hidden" id="reciclagem-edit-target">
                <div class="form-group">
                    <label>Tipo</label>
                    <input type="text" id="reciclagem-edit-type" disabled>
                </div>
                <div class="form-group">
                    <label>Referência</label>
                    <input type="text" id="reciclagem-edit-ref" disabled>
                </div>
                <div class="form-group">
                    <label>Validade (dd/mm/aaaa)</label>
                    <input type="text" id="reciclagem-edit-date" placeholder="Ex: 31/12/2026">
                </div>
                <div class="hint">Alteração local. Integração com planilha não configurada.</div>
            </div>
        </div>
        <div id="reciclagem-note-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.edit} Observação da Reciclagem</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeReciclagemNoteModal()">Fechar</button>
                        <button class="btn btn-compact" onclick="saveReciclagemNote()">Salvar</button>
                    </div>
                </div>
                <input type="hidden" id="reciclagem-note-target">
                <div class="form-group">
                    <label>Colaborador</label>
                    <input type="text" id="reciclagem-note-ref" disabled>
                </div>
                <div class="form-group">
                    <label>Observação</label>
                    <textarea id="reciclagem-note-text" rows="4" placeholder="Ex: Reciclagem já agendada para 10/02/2026. Aguardando realização."></textarea>
                </div>
                <div class="hint">Observação visível para todos.</div>
            </div>
        </div>
    `;

    if (SiteAuth.logged) {
        document.getElementById('config-login')?.classList.add('hidden');
        document.getElementById('config-content')?.classList.remove('hidden');
    } else {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    updateMenuStatus();
    updateAiSearchButton();
    renderPromptTemplates();

    // Configurar evento de busca
    const searchInput = document.getElementById('search-input');
    const triggerSearch = () => realizarBusca();
    searchInput.addEventListener('input', triggerSearch);
    searchInput.addEventListener('change', triggerSearch);
    searchInput.addEventListener('keyup', triggerSearch);
    searchInput.addEventListener('compositionend', triggerSearch);
    searchInput.addEventListener('input', () => handleSearchTokenSuggest());
    searchInput.addEventListener('click', () => handleSearchTokenSuggest());
    searchInput.addEventListener('keyup', () => handleSearchTokenSuggest());
    
    // Configurar eventos dos filtros
    document.querySelectorAll('input[name="filterStatus"]').forEach(radio => {
        radio.addEventListener('change', () => realizarBusca());
    });

    // Configurar busca de unidades
    const unitSearchInput = document.getElementById('unit-search-input');
    unitSearchInput.addEventListener('input', () => renderizarUnidades());

    
    const bulkSelect = document.getElementById('bulk-action-select');
    if(bulkSelect) {
        bulkSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            const input = document.getElementById('bulk-action-value');
            const unitSelect = document.getElementById('bulk-unit-select');
            const scaleSelect = document.getElementById('bulk-scale-select');
            
            // Reset displays
            input.style.display = 'none';
            unitSelect.style.display = 'none';
            scaleSelect.style.display = 'none';

            if (val === 'move') {
                unitSelect.style.display = 'block';
                // Popular unidades
                const units = [...new Set(currentData.map(d => d.posto))].sort();
                unitSelect.innerHTML = '<option value="">-- Selecione a Unidade --</option>' + units.map(u => `<option value="${u}">${u}</option>`).join('');
            } else if (val === 'scale') {
                scaleSelect.style.display = 'block';
                // Popular escalas
                const scales = [...new Set(currentData.map(d => d.escala))].sort();
                scaleSelect.innerHTML = '<option value="">-- Selecione a Escala --</option>' + scales.map(s => `<option value="${s}">${s}</option>`).join('');
            }
        });
    }

    searchInput.focus(); // Foco automático

    // Renderizar lista de unidades (já deixa pronto, mas oculto)
    renderizarUnidades();
    const avisoGroupSelect = document.getElementById('aviso-group-select');
    if (avisoGroupSelect) {
        avisoGroupSelect.addEventListener('change', hydrateAvisoForm);
    }
    const reminderGroupSelect = document.getElementById('reminder-group-select');
    if (reminderGroupSelect) {
        reminderGroupSelect.addEventListener('change', hydrateLembreteForm);
    }
    const avisoCollabSearch = document.getElementById('aviso-collab-search');
    if (avisoCollabSearch) {
        avisoCollabSearch.addEventListener('input', filterAvisoCollabs);
    }
    const avisoCollabSelect = document.getElementById('aviso-collab-select');
    if (avisoCollabSelect) {
        avisoCollabSelect.addEventListener('change', syncAvisoUnitWithCollab);
    }
    const reminderCollabSearch = document.getElementById('reminder-collab-search');
    if (reminderCollabSearch) {
        reminderCollabSearch.addEventListener('input', filterLembreteCollabs);
    }
    const reminderCollabSelect = document.getElementById('reminder-collab-select');
    if (reminderCollabSelect) {
        reminderCollabSelect.addEventListener('change', syncLembreteUnitWithCollab);
    }
    const ftSearch = document.getElementById('ft-search');
    if (ftSearch) {
        ftSearch.addEventListener('input', filterFtCollabs);
    }
    const ftCollabSelect = document.getElementById('ft-collab-select');
    if (ftCollabSelect) {
        ftCollabSelect.addEventListener('change', syncFtUnitWithCollab);
    }
    const ftCoveringSearch = document.getElementById('ft-covering-search');
    if (ftCoveringSearch) {
        ftCoveringSearch.addEventListener('input', filterFtCovering);
    }
    const ftCoveringSelect = document.getElementById('ft-covering-select');
    if (ftCoveringSelect) {
        ftCoveringSelect.addEventListener('change', syncFtCoveringSelection);
    }
    const ftUnitTarget = document.getElementById('ft-unit-target');
    if (ftUnitTarget) {
        ftUnitTarget.dataset.auto = '1';
        ftUnitTarget.addEventListener('change', () => {
            ftUnitTarget.dataset.auto = '0';
        });
    }
    const ftShift = document.getElementById('ft-shift');
    if (ftShift) {
        ftShift.dataset.auto = '1';
        ftShift.addEventListener('change', () => {
            ftShift.dataset.auto = '0';
        });
    }
    initAvisosFilters();
    updateAvisosUI();
}

function switchTab(tabName) {
    if (tabName === 'avisos' && !SiteAuth.logged) {
        showToast("Faça login para acessar os avisos.", "error");
        return;
    }
    currentTab = tabName;
    
    // Atualiza botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined' && event?.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`)?.classList.add('active');
    }

    // Atualiza conteúdo
    document.getElementById('tab-content-busca').classList.add('hidden');
    document.getElementById('tab-content-unidades').classList.add('hidden');
    document.getElementById('tab-content-avisos').classList.add('hidden');
    document.getElementById('tab-content-reciclagem').classList.add('hidden');
    document.getElementById('tab-content-lancamentos')?.classList.add('hidden');
    document.getElementById('tab-content-config').classList.add('hidden');
    
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');

    if (tabName === 'config' && !SiteAuth.logged) {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    if (tabName === 'busca') {
        document.getElementById('search-input').focus();
    }
    if (tabName === 'avisos') {
        renderAvisos();
    }
    if (tabName === 'reciclagem') {
        renderReciclagem();
    }
    if (tabName === 'lancamentos') {
        renderLancamentos();
    } else if (ftSyncTimer) {
        clearInterval(ftSyncTimer);
        ftSyncTimer = null;
    }

    clearContextBar();
    updateBreadcrumb();
}

function switchConfigTab(tabName) {
    document.querySelectorAll('.config-tab').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined' && event?.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.config-tab[onclick="switchConfigTab('${tabName}')"]`)?.classList.add('active');
    }
    document.getElementById('config-pane-access').classList.add('hidden');
    document.getElementById('config-pane-datasource').classList.add('hidden');
    document.getElementById('config-pane-ft')?.classList.add('hidden');
    document.getElementById(`config-pane-${tabName}`)?.classList.remove('hidden');
}

// 5. Lógica da Busca Rápida
function realizarBusca() {
    const termo = document.getElementById('search-input').value;
    const filterStatus = searchFilterStatus || 'all';
    const hideAbsence = !!searchHideAbsence;
    const resultsContainer = document.getElementById('search-results');
    
    if (!termo && filterStatus === 'all') {
        resultsContainer.innerHTML = '<p class="empty-state">Digite para buscar ou selecione um filtro...</p>';
        return;
    }

    if (isAiSearchEnabled()) {
        const handled = aiAssistSearch(termo, resultsContainer, filterStatus, hideAbsence);
        if (handled) return;
        aiRemoteSearch(termo, resultsContainer, filterStatus, hideAbsence)
            .then(remoteHandled => {
                if (!remoteHandled) runStandardSearch(termo, resultsContainer, filterStatus, hideAbsence);
            });
        return;
    }

    runStandardSearch(termo, resultsContainer, filterStatus, hideAbsence);
}

function runStandardSearch(termo, resultsContainer, filterStatus, hideAbsence) {
    const termoLimpo = termo.toUpperCase();
    
    let resultados = currentData.filter(item => {
        // Verifica se o posto está oculto
        if (hiddenUnits.has(item.posto)) return false;

        return (item.nome && item.nome.includes(termoLimpo)) || 
               (item.re && item.re.includes(termoLimpo)) || 
               (item.posto && item.posto.includes(termoLimpo));
    });

    // Filtro de Status
    if (filterStatus !== 'all') {
        resultados = resultados.filter(item => {
            const statusInfo = getStatusInfo(item);
            const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
            if (filterStatus === 'plantao') return isPlantao;
            if (filterStatus === 'folga') return !isPlantao;
            if (filterStatus === 'ft') return statusInfo.text.includes('FT');
            if (filterStatus === 'afastado') return !!item.rotulo;
            return true;
        });
    }

    // Filtro de Afastamentos
    if (hideAbsence) {
        resultados = resultados.filter(item => !item.rotulo);
    }

    if (resultados.length === 0) {
        resultsContainer.innerHTML = '<p class="empty-state">Nenhum resultado encontrado.</p>';
        return;
    }

    resultsContainer.innerHTML = resultados.map(item => {
        const statusInfo = getStatusInfo(item);
        const turnoInfo = getTurnoInfo(item.escala);
        const retornoInfo = item.rotulo && item.rotuloFim ? `<span class="return-date">Retorno: ${formatDate(item.rotuloFim)}</span>` : '';
        const ftRelation = getFtRelationInfo(item.re);
        const ftRelationHtml = ftRelation
            ? `<div class="ft-link ${ftRelation.type}"><strong>FT:</strong> ${ftRelation.type === 'covering' ? 'Cobrindo' : 'Coberto por'} ${ftRelation.label}${ftRelation.unit ? ` • ${ftRelation.unit}` : ''}</div>`
            : '';
        const recSummary = getReciclagemSummaryForCollab(item.re, item.nome);
        const recIcon = recSummary
            ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
            : '';
        
        // Tratamento de Múltiplos Rótulos
        let rotulosHtml = '';
        if (item.rotulo) {
            const rotulos = item.rotulo.split(',');
            rotulosHtml = rotulos.map(r => {
                let display = r;
                if (r === 'OUTRO' && item.rotuloDetalhe) {
                    display = item.rotuloDetalhe;
                }
                // Mapeamento de nomes amigáveis se necessário, ou usar o valor direto
                const map = { 'FÉRIAS': 'Férias', 'ATESTADO': 'Atestado', 'AFASTADO': 'Afastado', 'FT': 'FT', 'TROCA': 'Troca' };
                return `<span class="label-badge">${map[r] || display}</span>`;
            }).join('');
        }

        // Cor de fundo baseada no status
        const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
        const isAfastado = ['FÉRIAS', 'ATESTADO', 'AFASTADO'].includes(statusInfo.text);
        const bgClass = isPlantao ? 'bg-plantao' : (isAfastado ? 'bg-afastado' : 'bg-folga');

        const homenageado = isHomenageado(item);
        const nomeDisplay = homenageado ? `${item.nome} ✨` : item.nome;
        return `
            <div class="result-card ${bgClass} ${homenageado ? 'card-homenageado' : ''}" data-collab-re="${item.re}" style="border-left: 5px solid ${statusInfo.color}">
                <div class="card-header">
                    <div class="header-left">
                        <span class="colaborador-nome ${homenageado ? 'homenageado-nome' : ''}">${nomeDisplay}</span>
                        ${recIcon}
                        ${getPendingAvisosByCollaborator(item.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag">Aviso</span>` : ''}
                        ${getPendingRemindersByCollaborator(item.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag reminder">Lembrete</span>` : ''}
                        <span class="status-badge" style="background-color: ${statusInfo.color}">${statusInfo.text}</span>
                        ${rotulosHtml}
                        ${retornoInfo}
                    </div>
                    <div class="header-right">
                        <button class="edit-btn-icon" onclick="openEditModal(${item.id})">${ICONS.edit}</button>
                        <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal('${item.nome}', '${item.telefone || ''}')" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                    </div>
                </div>
                <div class="card-details-grid">
                    <div><strong>RE:</strong> ${item.re}</div>
                    <div><strong>Posto:</strong> <span class="unit-link" onclick="navigateToUnit('${item.posto}')">${item.posto}</span></div>
                    <div><strong>Grupo:</strong> ${item.grupoLabel || 'N/I'}</div>
                    <div><strong>Escala:</strong> ${item.tipoEscala ? `<span class="scale-badge">${item.tipoEscala}</span>` : ''}</div>
                    <div>   
                        <strong>Horário:</strong> ${item.escala || 'N/I'} 
                        ${turnoInfo ? `<div style="margin-top: 4px;">${turnoInfo}</div>` : ''}
                    </div>
                    ${ftRelationHtml}
                </div>
            </div>
        `;
    }).join('');
}

// 6. Lógica de Unidades
function renderizarUnidades() {
    const unitsContainer = document.getElementById('units-list');
    const filterTerm = document.getElementById('unit-search-input')?.value.toUpperCase() || '';
    const groupFilter = document.getElementById('unit-group-filter')?.value || 'all';
    const statusFilter = document.getElementById('unit-status-filter')?.value || 'all';
    const labelFilter = document.getElementById('unit-label-filter')?.value || 'all';
    
    // Atualizar Estatísticas
    atualizarEstatisticas(currentData, groupFilter);

    // Filtrar dados base
    let filteredData = currentData;
    if (groupFilter !== 'all') {
        filteredData = filteredData.filter(item => item.grupo === groupFilter);
    }

    // Agrupar por Posto
    const grupos = {};
    filteredData.forEach(item => {
        if (!grupos[item.posto]) grupos[item.posto] = [];
        grupos[item.posto].push(item);
    });

    // Ordenar postos alfabeticamente
    let postosOrdenados = Object.keys(grupos).sort();

    // Filtrar se houver busca
    if (filterTerm) postosOrdenados = postosOrdenados.filter(p => p.includes(filterTerm));

    const unitBlocks = postosOrdenados.map(posto => {
        const efetivo = grupos[posto];
        // Ordenar alfabeticamente
        efetivo.sort((a, b) => a.nome.localeCompare(b.nome));

        // Separar times
        const timePlantao = efetivo.filter(p => {
            const s = getStatusInfo(p);
            const isPlantao = s.text.includes('PLANTÃO') || s.text.includes('FT');
            return (statusFilter === 'all' || statusFilter === 'plantao') && isPlantao;
        });
        const timeFolga = efetivo.filter(p => {
            const s = getStatusInfo(p);
            const isFolga = !s.text.includes('PLANTÃO') && !s.text.includes('FT');
            return (statusFilter === 'all' || statusFilter === 'folga') && isFolga;
        });

        const applyLabelFilter = (list) => {
            if (labelFilter === 'all') return list;
            if (labelFilter === 'none') return list.filter(p => !p.rotulo);
            return list.filter(p => (p.rotulo || '').split(',').includes(labelFilter));
        };
        const filteredPlantao = applyLabelFilter(timePlantao);
        const filteredFolga = applyLabelFilter(timeFolga);
        if (filteredPlantao.length === 0 && filteredFolga.length === 0) return '';

        const safeId = 'unit-' + posto.replace(/[^a-zA-Z0-9]/g, '-');
        const isHidden = hiddenUnits.has(posto);
        const isMinimized = minimizedUnits.has(posto);

        // Lógica de exibição de múltiplos rótulos da unidade
        const meta = unitMetadata[posto] || {};
        let rotuloUnitHtml = '';
        if (meta.rotulo) {
            const rotulos = meta.rotulo.split(',');
            rotuloUnitHtml = rotulos.map(r => {
                const map = { 'REFEICAO': 'Refeição no Local', 'VT': 'Vale Transporte' };
                let text = (r === 'OUTRO' && meta.detalhe) ? meta.detalhe : (map[r] || r);
                return `<span class="unit-label-badge">${text}</span>`;
            }).join('');
        }

        const hasUnitLabel = !!meta.rotulo;
        const avisosPendentes = getPendingAvisosByUnit(posto, groupFilter === 'all' ? 'todos' : groupFilter);
        const lembretesPendentes = getPendingRemindersByUnit(posto, groupFilter === 'all' ? 'todos' : groupFilter);
        const avisosBadge = avisosPendentes > 0
            ? `<span class="unit-aviso-badge">${avisosPendentes} pend.</span>`
            : '';
        const lembretesBadge = lembretesPendentes > 0
            ? `<span class="unit-reminder-badge">${lembretesPendentes} lemb.</span>`
            : '';
        return `
            <div class="unit-section ${hasUnitLabel ? 'unit-labeled' : ''}" id="${safeId}" data-unit-name="${posto}">
                <h3 class="unit-title">
                    <span>${posto} <span class="count-badge">${efetivo.length}</span> ${rotuloUnitHtml} ${avisosBadge} ${lembretesBadge}</span>
                    <div class="unit-actions">
                        <button class="action-btn" onclick="openAvisosForUnit('${posto}')" title="Avisos da unidade">
                            ${ICONS.bell}
                        </button>
                        <button class="action-btn" onclick="exportUnitPrompt('${posto}')" title="Exportar unidade">
                            ${ICONS.download}
                        </button>
                        <button class="action-btn" onclick="openEditUnitModal('${posto}')" title="Editar Unidade">
                            ${ICONS.settings}
                        </button>
                        <button class="action-btn" onclick="toggleUnitMinimize('${posto}')" title="${isMinimized ? 'Expandir' : 'Minimizar'}">
                            ${isMinimized ? ICONS.chevronDown : ICONS.chevronUp}
                        </button>
                        <button class="action-btn ${isHidden ? 'hidden-unit' : ''}" onclick="toggleUnitVisibility('${posto}')" title="${isHidden ? 'Mostrar na busca' : 'Ocultar da busca'}">
                            ${isHidden ? ICONS.eyeOff : ICONS.eye}
                        </button>
                    </div>
                </h3>
                
                <div class="unit-teams-container ${isMinimized ? 'hidden' : ''}">
                    <!-- Time Plantão -->
                    <div class="team-block team-plantao">
                        <h4 class="team-header header-plantao">EM PLANTÃO (${filteredPlantao.length})</h4>
                        ${renderUnitTable(filteredPlantao)}
                    </div>

                    <!-- Time Folga -->
                    <div class="team-block team-folga">
                        <h4 class="team-header header-folga">NA FOLGA (${filteredFolga.length})</h4>
                        ${renderUnitTable(filteredFolga)}
                    </div>
                </div>
            </div>
        `;
    }).filter(Boolean);

    unitsContainer.innerHTML = unitBlocks.join('');
}

function atualizarEstatisticas(dados, groupFilter) {
    const statsContainer = document.getElementById('stats-bar');
    
    // Filtra pelo grupo se necessário para a estatística
    let dadosFiltrados = dados;
    if (groupFilter && groupFilter !== 'all') {
        dadosFiltrados = dados.filter(d => d.grupo === groupFilter);
    }

    const total = dadosFiltrados.length;
    const plantao = dadosFiltrados.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT')).length;
    const folga = dadosFiltrados.filter(d => !getStatusInfo(d).text.includes('PLANTÃO') && !getStatusInfo(d).text.includes('FT')).length;

    statsContainer.innerHTML = `
        <div class="stat-card total">
            <h4>Total Efetivo</h4>
            <div class="stat-value">${total}</div>
        </div>
        <div class="stat-card plantao">
            <h4>Em Plantão</h4>
            <div class="stat-value">${plantao}</div>
        </div>
        <div class="stat-card folga">
            <h4>Na Folga</h4>
            <div class="stat-value">${folga}</div>
        </div>
    `;
}


function updateLastUpdatedDisplay() {
    updateBreadcrumb();
}

// ==========================================================================
// 📌 RECICLAGEM
// ==========================================================================

function loadReciclagemTemplates() {
    try {
        const stored = localStorage.getItem('reciclagemTemplates');
        reciclagemTemplates = stored ? JSON.parse(stored) || [] : [];
    } catch {
        reciclagemTemplates = [];
    }
    if (!reciclagemTemplates.length) {
        reciclagemTemplates = CONFIG?.reciclagem?.renewalTemplates
            ? JSON.parse(JSON.stringify(CONFIG.reciclagem.renewalTemplates))
            : [];
    }
}

function saveReciclagemTemplates(silent = false) {
    localStorage.setItem('reciclagemTemplates', JSON.stringify(reciclagemTemplates));
    scheduleShadowSync('reciclagem-templates', { silent, notify: !silent });
}

function loadReciclagemOverrides() {
    try {
        const stored = localStorage.getItem('reciclagemOverrides');
        reciclagemOverrides = stored ? JSON.parse(stored) || {} : {};
    } catch {
        reciclagemOverrides = {};
    }
}

function saveReciclagemOverrides(silent = false) {
    localStorage.setItem('reciclagemOverrides', JSON.stringify(reciclagemOverrides));
    scheduleShadowSync('reciclagem-overrides', { silent, notify: !silent });
}

function loadReciclagemHistory() {
    try {
        const stored = localStorage.getItem('reciclagemHistory');
        reciclagemHistory = stored ? JSON.parse(stored) || [] : [];
    } catch {
        reciclagemHistory = [];
    }
}

function saveReciclagemHistory(silent = false) {
    localStorage.setItem('reciclagemHistory', JSON.stringify(reciclagemHistory));
    scheduleShadowSync('reciclagem-history', { silent, notify: !silent });
}

function loadReciclagemNotes() {
    try {
        const stored = localStorage.getItem('reciclagemNotes');
        reciclagemNotes = stored ? JSON.parse(stored) || {} : {};
    } catch {
        reciclagemNotes = {};
    }
}

function saveReciclagemNotes(silent = false) {
    localStorage.setItem('reciclagemNotes', JSON.stringify(reciclagemNotes));
    scheduleShadowSync('reciclagem-notes', { silent, notify: !silent });
}

function buildReciclagemCsvUrl(sheetKey) {
    const base = CONFIG?.reciclagem?.baseCsvUrl || '';
    const sheet = CONFIG?.reciclagem?.sheets?.[sheetKey];
    if (!sheet) return '';
    if (sheet.csvUrl) return sheet.csvUrl;
    if (!base) return '';
    if (!sheet.gid) return base;
    return `${base}${base.includes('?') ? '&' : '?'}gid=${sheet.gid}`;
}

function parseDateFlexible(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (!raw) return null;
    if (raw.includes('/')) {
        const parts = raw.split('/');
        if (parts.length >= 3) {
            const d = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const y = parseInt(parts[2], 10);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) {
                if (m > 12 && d <= 12) return new Date(y, d - 1, m); // mm/dd/yyyy
                if (d > 12 && m <= 12) return new Date(y, m - 1, d); // dd/mm/yyyy
                return new Date(y, m - 1, d);
            }
        }
    }
    if (raw.includes('-')) {
        const parts = raw.split('-');
        if (parts.length >= 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(d) && !isNaN(m) && !isNaN(y)) return new Date(y, m - 1, d);
        }
    }
    const date = new Date(raw);
    return isNaN(date.getTime()) ? null : date;
}

function addYears(date, years) {
    const d = new Date(date.getTime());
    d.setFullYear(d.getFullYear() + years);
    return d;
}

function normalizeHeader(value) {
    return String(value || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function findHeaderIndex(headers, terms) {
    return headers.findIndex(h => terms.some(t => h.includes(t)));
}

function parseReciclagemCsv(csvText, sheetKey) {
    if (!csvText) return [];
    const rows = parseCSV(csvText);
    if (!rows.length) return [];
    let headerIndex = -1;
    for (let i = 0; i < Math.min(rows.length, 5); i++) {
        const joined = rows[i].map(h => normalizeHeader(h)).join(' ');
        if (joined.includes('RE') && (joined.includes('COLABORADOR') || joined.includes('NOME') || joined.includes('MATRICULA'))) {
            headerIndex = i;
            break;
        }
    }
    if (headerIndex === -1) headerIndex = 0;
    const headers = rows[headerIndex].map(h => normalizeHeader(h));
    const dataRows = rows.slice(headerIndex + 1);
    const idxRe = findHeaderIndex(headers, ['RE', 'MATRICULA']);
    const idxName = findHeaderIndex(headers, ['NOME', 'COLABORADOR', 'FUNCIONARIO']);
    const idxUnit = findHeaderIndex(headers, ['UNIDADE', 'POSTO']);
    const idxVenc = findHeaderIndex(headers, ['VENC', 'VALID', 'VALIDADE', 'TERMINO', 'FIM']);
    const idxData = findHeaderIndex(headers, ['DATA', 'INICIO']);
    const sheet = CONFIG?.reciclagem?.sheets?.[sheetKey];
    const biennial = !!sheet?.biennial;

    return dataRows.map(cols => {
        const re = idxRe >= 0 ? String(cols[idxRe] || '').trim() : '';
        const name = idxName >= 0 ? String(cols[idxName] || '').trim() : '';
        const unit = idxUnit >= 0 ? String(cols[idxUnit] || '').trim() : '';
        const vencRaw = idxVenc >= 0 ? String(cols[idxVenc] || '').trim() : '';
        const dataRaw = idxData >= 0 ? String(cols[idxData] || '').trim() : '';
        const vencDate = parseDateFlexible(vencRaw);
        const dataDate = vencDate ? null : parseDateFlexible(dataRaw);
        const baseDate = vencDate || dataDate;
        const expiry = baseDate ? (vencDate ? baseDate : addYears(baseDate, biennial ? 2 : 1)) : null;
        return {
            re,
            name,
            unit,
            dateRaw: vencRaw || dataRaw || '',
            expiry,
            expiryIso: expiry ? expiry.toISOString().slice(0, 10) : ''
        };
    }).filter(r => r.re || r.name || r.unit);
}

function normalizeReValueLoose(value) {
    if (value == null) return '';
    return String(value).replace(/[^a-zA-Z0-9]/g, '');
}

function findReciclagemEntry(entries, collabRe, collabName) {
    const cleanRe = normalizeReValueLoose(collabRe || '');
    const normName = (collabName || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    const firstName = normName.split(' ')[0];

    let match = entries.find(p => normalizeReValueLoose(p.re) === cleanRe);
    if (!match && cleanRe.length >= 3) {
        match = entries.find(p => {
            const cleanP = normalizeReValueLoose(p.re);
            if (!cleanP) return false;
            const ok = cleanRe.endsWith(cleanP) || cleanP.endsWith(cleanRe) || cleanRe.includes(cleanP) || cleanP.includes(cleanRe);
            if (!ok) return false;
            const normPName = (p.name || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
            const pFirstName = normPName.split(' ')[0];
            return pFirstName && firstName && pFirstName === firstName;
        });
    }
    return match || null;
}

function findReciclagemUnitEntry(entries, unitName) {
    const target = normalizeUnitKey(unitName || '');
    return entries.find(e => normalizeUnitKey(e.unit || '') === target) || null;
}

function getReciclagemOverride(sheetKey, targetKey) {
    const bucket = reciclagemOverrides?.[sheetKey] || {};
    return bucket[targetKey] || null;
}

function getReciclagemNote(targetKey) {
    return reciclagemNotes?.[targetKey] || '';
}

function setReciclagemNote(targetKey, note) {
    reciclagemNotes[targetKey] = note;
    saveReciclagemNotes();
}

function setReciclagemOverride(sheetKey, targetKey, data) {
    if (!reciclagemOverrides[sheetKey]) reciclagemOverrides[sheetKey] = {};
    reciclagemOverrides[sheetKey][targetKey] = data;
    saveReciclagemOverrides();
}

function calcReciclagemStatus(expiry) {
    if (!expiry) return { status: 'unknown', days: null };
    const today = new Date();
    const diffMs = expiry.getTime() - today.getTime();
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    if (days < 0) return { status: 'expired', days };
    const alertDays = CONFIG?.reciclagem?.alertDays ?? 30;
    if (days <= alertDays) return { status: 'due', days };
    return { status: 'ok', days };
}

function getReciclagemSummaryForCollab(re, name) {
    const sheets = CONFIG?.reciclagem?.sheets || {};
    const keys = Object.keys(sheets).filter(k => sheets[k].match !== 'unit');
    if (!reciclagemLoadedAt || !keys.length) {
        return { status: 'unknown', title: 'Reciclagem: sem dados' };
    }
    let counts = { ok: 0, due: 0, expired: 0, unknown: 0 };
    let hasAny = false;
    const detailLines = [];
    keys.forEach(key => {
        const entries = reciclagemData[key]?.entries || [];
        const entry = findReciclagemEntry(entries, re, name);
        const override = getReciclagemOverride(key, re);
        const expiry = entry?.expiry || (override?.expiry ? parseDateFlexible(override.expiry) : null);
        if (!expiry && !entry) {
            detailLines.push(`${getReciclagemSheetLabel(key)}: sem dados`);
            return;
        }
        hasAny = true;
        if (!expiry) {
            counts.unknown += 1;
            detailLines.push(`${getReciclagemSheetLabel(key)}: sem data`);
            return;
        }
        const statusInfo = calcReciclagemStatus(expiry);
        counts[statusInfo.status] = (counts[statusInfo.status] || 0) + 1;
        const dateStr = formatDateOnly(expiry);
        const statusLabel = statusInfo.status === 'expired'
            ? 'vencido'
            : (statusInfo.status === 'due' ? 'próximo' : 'em dia');
        detailLines.push(`${getReciclagemSheetLabel(key)}: ${statusLabel} (${dateStr})`);
    });

    if (!hasAny) {
        return { status: 'unknown', title: 'Reciclagem: sem dados' };
    }
    const parts = [];
    if (counts.expired) parts.push(`${counts.expired} vencida(s)`);
    if (counts.due) parts.push(`${counts.due} próxima(s)`);
    if (counts.ok) parts.push(`${counts.ok} em dia`);
    if (!parts.length && counts.unknown) parts.push(`sem data`);
    const status = counts.expired ? 'expired' : (counts.due ? 'due' : (counts.ok ? 'ok' : 'unknown'));
    return {
        status,
        title: detailLines.length
            ? `Reciclagem:\n${detailLines.join('\n')}`
            : `Reciclagem: ${parts.join(', ') || 'sem dados'}`
    };
}

async function loadReciclagemData(force = false) {
    if (!force && reciclagemLoadedAt) return;
    const sheets = CONFIG?.reciclagem?.sheets || {};
    const keys = Object.keys(sheets);
    const results = {};
    for (const key of keys) {
        const url = buildReciclagemCsvUrl(key);
        if (!url) {
            results[key] = { entries: [], error: 'URL não configurada' };
            continue;
        }
        const csv = await fetchSheetData(url);
        if (!csv) {
            results[key] = { entries: [], error: 'Falha ao carregar' };
            continue;
        }
        results[key] = { entries: parseReciclagemCsv(csv, key), error: null };
    }
    reciclagemData = results;
    reciclagemLoadedAt = new Date();
}

function getReciclagemSheetLabel(key) {
    const map = {
        ASO: 'ASO',
        REQUALIFICACAO: 'RECICLAGEM',
        NR10: 'NR 10',
        NR20: 'NR 20',
        NR33: 'NR 33',
        NR35: 'NR 35',
        DEA: 'DEA',
        HELIPONTO: 'Heliponto',
        UNIFORME: 'UNIFORME',
        PCMSO: 'PCMSO',
        PGR: 'PGR'
    };
    return map[key] || key;
}

function buildReciclagemMessage(templateId, item) {
    const tmpl = reciclagemTemplates.find(t => t.id === templateId);
    if (!tmpl) return '';
    const dateStr = item?.expiry ? formatDateOnly(item.expiry) : (item?.expiryIso || '');
    return tmpl.text
        .replace(/{NOME}/g, item?.name || '')
        .replace(/{RE}/g, item?.re || '')
        .replace(/{TIPO}/g, item?.typeLabel || '')
        .replace(/{VENCIMENTO}/g, dateStr || '');
}

function openReciclagemWhatsapp(templateId, item) {
    const text = buildReciclagemMessage(templateId, item);
    if (!text) {
        showToast("Selecione um modelo de mensagem.", "error");
        return;
    }
    const phone = item?.phone || '';
    const url = buildWhatsUrl(phone, text);
    window.open(url, '_blank');
}

function copyReciclagemMessage(templateId, item) {
    const text = buildReciclagemMessage(templateId, item);
    if (!text) {
        showToast("Selecione um modelo de mensagem.", "error");
        return;
    }
    copyTextToClipboard(text);
}

function getReciclagemSheetKeysForTab(tab) {
    const sheets = CONFIG?.reciclagem?.sheets || {};
    const keys = Object.keys(sheets);
    if (tab === 'unit') return keys.filter(k => sheets[k].match === 'unit');
    return keys.filter(k => sheets[k].match !== 'unit');
}

function applyReciclagemFilters(items, term) {
    let list = items;
    if (term) {
        const up = term.toUpperCase();
        list = list.filter(i => (i.name || '').toUpperCase().includes(up)
            || (i.re || '').toUpperCase().includes(up)
            || (i.unit || '').toUpperCase().includes(up));
    }
    return list;
}

function switchReciclagemTab(tab) {
    reciclagemTab = tab;
    document.querySelectorAll('.reciclagem-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.reciclagem-tab[onclick="switchReciclagemTab('${tab}')"]`)?.classList.add('active');
    renderReciclagem();
}

function toggleReciclagemOnlyExpired() {
    reciclagemOnlyExpired = !reciclagemOnlyExpired;
    const btn = document.getElementById('reciclagem-only-expired');
    if (btn) btn.classList.toggle('active', reciclagemOnlyExpired);
    renderReciclagem();
}

function setReciclagemStatusFilter(value) {
    const statusSelect = document.getElementById('reciclagem-status-filter');
    if (!statusSelect) return;
    statusSelect.value = value;
    renderReciclagem();
}

function focusReciclagemUnit(unit) {
    const searchInput = document.getElementById('reciclagem-search');
    if (!searchInput) return;
    searchInput.value = unit || '';
    renderReciclagem();
}

function renderReciclagemSkeleton(list, count = 5) {
    list.innerHTML = Array.from({ length: count }).map(() => `
        <div class="reciclagem-card skeleton-card">
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-60"></div>
        </div>
    `).join('');
}

function bindReciclagemActions(list) {
    if (!list || list.dataset.bound) return;
    list.addEventListener('click', (event) => {
        const btn = event.target.closest('.reciclagem-action');
        if (!btn) return;
        const idx = parseInt(btn.dataset.index, 10);
        if (!Number.isFinite(idx)) return;
        const item = reciclagemRenderCache[idx];
        if (!item) return;
        const select = document.getElementById(`reciclagem-template-${idx}`);
        const templateId = select?.value || '';
        if (btn.dataset.action === 'send') {
            openReciclagemWhatsapp(templateId, item);
        }
        if (btn.dataset.action === 'copy') {
            copyReciclagemMessage(templateId, item);
        }
    });
    list.dataset.bound = '1';
}

function copyTextToClipboard(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Mensagem copiada.", "success");
        }).catch(() => {
            fallbackCopy(text);
        });
        return;
    }
    fallbackCopy(text);
}

function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'absolute';
    area.style.left = '-9999px';
    document.body.appendChild(area);
    area.select();
    try {
        document.execCommand('copy');
        showToast("Mensagem copiada.", "success");
    } catch {
        showToast("Não foi possível copiar.", "error");
    }
    document.body.removeChild(area);
}

function getUniqueReciclagemCollabs(list) {
    const map = new Map();
    list.forEach(collab => {
        const key = normalizeReValueLoose(collab.re) || (collab.nome || '').toUpperCase().trim();
        if (!key) return;
        if (!map.has(key)) {
            map.set(key, { ...collab });
            return;
        }
        const existing = map.get(key);
        map.set(key, {
            ...existing,
            ...collab,
            nome: existing.nome || collab.nome || '',
            re: existing.re || collab.re || '',
            telefone: existing.telefone || collab.telefone || '',
            posto: existing.posto || collab.posto || ''
        });
    });
    return Array.from(map.values());
}

function getPhoneForCollab(re) {
    const direct = currentData.find(c => c.re === re);
    if (direct?.telefone) return direct.telefone;
    const all = allCollaboratorsCache?.items || [];
    const found = all.find(c => c.re === re);
    return found?.telefone || '';
}

function getCollabStatusFromDetails(details) {
    if (!details || !details.length) return 'unknown';
    if (details.some(d => d.status === 'expired')) return 'expired';
    if (details.some(d => d.status === 'due')) return 'due';
    if (details.some(d => d.status === 'ok')) return 'ok';
    return 'unknown';
}

async function renderReciclagem() {
    const list = document.getElementById('reciclagem-list');
    if (!list) return;
    const typeCountsEl = document.getElementById('reciclagem-type-counts');
    if (typeCountsEl) typeCountsEl.innerHTML = '';
    renderReciclagemSkeleton(list, 6);
    bindReciclagemActions(list);
    try {
        await loadReciclagemData(false);
    } catch (err) {
        console.error('Erro ao carregar reciclagem:', err);
        list.innerHTML = `<div class="empty-state">Erro ao carregar reciclagem.</div>`;
        return;
    }

    let sheetSelect, statusSelect, searchInput, keys;
    try {
        sheetSelect = document.getElementById('reciclagem-sheet-filter');
        statusSelect = document.getElementById('reciclagem-status-filter');
        searchInput = document.getElementById('reciclagem-search');
        keys = getReciclagemSheetKeysForTab(reciclagemTab);
    } catch (err) {
        console.error('Erro ao preparar filtros de reciclagem:', err);
        list.innerHTML = `<div class="empty-state">Erro ao carregar reciclagem.</div>`;
        return;
    }
    if (sheetSelect && !sheetSelect.dataset.ready) {
        sheetSelect.addEventListener('change', renderReciclagem);
        sheetSelect.dataset.ready = '1';
    }
    if (statusSelect && !statusSelect.dataset.ready) {
        statusSelect.addEventListener('change', renderReciclagem);
        statusSelect.dataset.ready = '1';
    }
    if (searchInput && !searchInput.dataset.ready) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchInput._timer);
            searchInput._timer = setTimeout(renderReciclagem, 200);
        });
        searchInput.dataset.ready = '1';
    }

    if (sheetSelect) {
        sheetSelect.innerHTML = `<option value="all">Todas as reciclagens</option>` +
            keys.map(k => `<option value="${k}">${getReciclagemSheetLabel(k)}</option>`).join('');
    }

    const sheetFilter = sheetSelect?.value || 'all';
    const statusFilter = statusSelect?.value || 'all';
    const term = searchInput?.value.trim() || '';
    const onlyExpiredBtn = document.getElementById('reciclagem-only-expired');
    if (onlyExpiredBtn) onlyExpiredBtn.classList.toggle('active', reciclagemOnlyExpired);
    document.querySelectorAll('.reciclagem-quick .filter-chip').forEach(chip => {
        const isActive = chip.dataset.status === statusFilter;
        chip.classList.toggle('active', isActive);
    });

    const items = [];
    if (reciclagemTab === 'unit') {
        const units = [...new Set(currentData.map(c => c.posto).filter(Boolean))].sort();
        const sheetKeys = sheetFilter === 'all' ? keys : [sheetFilter];
        units.forEach(unit => {
            const detailItems = [];
            sheetKeys.forEach(key => {
                const entries = reciclagemData[key]?.entries || [];
                const entry = findReciclagemUnitEntry(entries, unit);
                const override = getReciclagemOverride(key, normalizeUnitKey(unit));
                const expiry = override?.expiry ? parseDateFlexible(override.expiry) : (entry?.expiry || null);
                if (!expiry && !entry) {
                    detailItems.push({
                        key,
                        label: getReciclagemSheetLabel(key),
                        status: 'unknown',
                        expiry: null,
                        dateLabel: 'Sem dados'
                    });
                    return;
                }
                if (!expiry) {
                    detailItems.push({
                        key,
                        label: getReciclagemSheetLabel(key),
                        status: 'unknown',
                        expiry: null,
                        dateLabel: 'sem data'
                    });
                    return;
                }
                const statusInfo = calcReciclagemStatus(expiry);
                detailItems.push({
                    key,
                    label: getReciclagemSheetLabel(key),
                    status: statusInfo.status,
                    expiry,
                    dateLabel: formatDateOnly(expiry)
                });
            });
            items.push({
                type: 'ALL',
                typeLabel: 'Documentos',
                unit,
                status: 'mixed',
                detailItems,
                collabStatus: getCollabStatusFromDetails(detailItems),
                match: 'unit'
            });
        });
    } else {
        const sheetKeys = sheetFilter === 'all' ? keys : [sheetFilter];
        const uniqueCollabs = getUniqueReciclagemCollabs(currentData);
        uniqueCollabs.forEach(collab => {
            let counts = { ok: 0, due: 0, expired: 0, unknown: 0 };
            let hasAny = false;
            const detailItems = [];
            sheetKeys.forEach(key => {
                const entries = reciclagemData[key]?.entries || [];
                const entry = findReciclagemEntry(entries, collab.re, collab.nome);
                const override = getReciclagemOverride(key, collab.re);
                const expiry = entry?.expiry || (override?.expiry ? parseDateFlexible(override.expiry) : null);
                if (!expiry && !entry) {
                    detailItems.push({
                        key,
                        label: getReciclagemSheetLabel(key),
                        status: 'unknown',
                        expiry: null,
                        dateLabel: 'Sem dados'
                    });
                    return;
                }
                hasAny = true;
                if (!expiry) {
                    counts.unknown += 1;
                    detailItems.push({
                        key,
                        label: getReciclagemSheetLabel(key),
                        status: 'unknown',
                        expiry: null,
                        dateLabel: 'sem data'
                    });
                    return;
                }
                const statusInfo = calcReciclagemStatus(expiry);
                counts[statusInfo.status] = (counts[statusInfo.status] || 0) + 1;
                detailItems.push({
                    key,
                    label: getReciclagemSheetLabel(key),
                    status: statusInfo.status,
                    expiry,
                    dateLabel: formatDateOnly(expiry)
                });
            });
            if (!hasAny) {
                items.push({
                    type: 'ALL',
                    typeLabel: 'Reciclagens',
                    name: collab.nome,
                    re: collab.re,
                    phone: getPhoneForCollab(collab.re) || '',
                    unit: collab.posto || '',
                    status: 'unknown',
                    days: null,
                    expiry: null,
                    expiryIso: '',
                    summary: 'Sem dados',
                    detailItems,
                    collabStatus: 'unknown',
                    match: 're'
                });
                return;
            }
            const parts = [];
            const typeParts = [];
            if (counts.expired) parts.push(`${counts.expired} vencida(s)`);
            if (counts.due) parts.push(`${counts.due} próxima(s)`);
            if (counts.ok) parts.push(`${counts.ok} em dia`);
            if (!parts.length && counts.unknown) parts.push('sem data');
            detailItems.forEach(item => {
                const statusLabel = item.status === 'expired'
                    ? 'vencido'
                    : (item.status === 'due' ? 'próximo' : (item.status === 'ok' ? 'em dia' : 'sem data'));
                typeParts.push(`${item.label}: ${statusLabel} (${item.dateLabel})`);
            });
            items.push({
                type: 'ALL',
                typeLabel: 'Reciclagens',
                name: collab.nome,
                re: collab.re,
                phone: getPhoneForCollab(collab.re) || '',
                unit: collab.posto || '',
                status: 'mixed',
                days: null,
                expiry: null,
                expiryIso: '',
                summary: parts.join(', '),
                summaryDetail: typeParts.join(' | '),
                detailItems,
                collabStatus: getCollabStatusFromDetails(detailItems),
                match: 're'
            });
        });
    }

    const filtered = applyReciclagemFilters(items, term);
    const filteredByDetail = filtered.filter(item => {
        if (reciclagemTab !== 'colab') {
            if (reciclagemOnlyExpired && item.status !== 'expired') return false;
            if (statusFilter && statusFilter !== 'all' && item.status !== statusFilter) return false;
            return true;
        }
        if (!item.detailItems || !item.detailItems.length) {
            return !reciclagemOnlyExpired && (statusFilter === 'all' || statusFilter === 'unknown');
        }
        if (reciclagemOnlyExpired) {
            return item.collabStatus === 'expired';
        }
        if (statusFilter && statusFilter !== 'all') {
            return item.collabStatus === statusFilter;
        }
        return true;
    });
    const summaryEl = document.getElementById('reciclagem-summary');
    if (summaryEl) {
        summaryEl.innerHTML = '';
        summaryEl.classList.add('hidden');
    }
    if (typeCountsEl) {
        const typeCounts = {};
        if (reciclagemTab === 'colab') {
            filteredByDetail.forEach(item => {
                (item.detailItems || []).forEach(d => {
                    if (!typeCounts[d.label]) typeCounts[d.label] = { expired: 0, due: 0, ok: 0, unknown: 0 };
                    typeCounts[d.label][d.status] = (typeCounts[d.label][d.status] || 0) + 1;
                });
            });
        } else {
            filteredByDetail.forEach(item => {
                const label = item.typeLabel || item.type;
                if (!typeCounts[label]) typeCounts[label] = { expired: 0, due: 0, ok: 0, unknown: 0 };
                typeCounts[label][item.status] = (typeCounts[label][item.status] || 0) + 1;
            });
        }
        const rows = Object.keys(typeCounts).map(label => {
            const c = typeCounts[label];
            return `<div class="reciclagem-type-chip">
                <strong>${label}</strong>
                <span class="expired">${c.expired || 0} vencidos</span>
                <span class="due">${c.due || 0} próximos</span>
                <span class="ok">${c.ok || 0} em dia</span>
            </div>`;
        }).join('');
        typeCountsEl.innerHTML = rows ? `<div class="reciclagem-type-counts-inner">${rows}</div>` : '';
    }
    if (!filteredByDetail.length) {
        list.innerHTML = `<p class="empty-state">Nenhum registro encontrado.</p>`;
        reciclagemRenderCache = [];
        return;
    }

    reciclagemRenderCache = filteredByDetail;
    list.innerHTML = filteredByDetail.map((item, idx) => {
        const statusLabel = {
            ok: 'Em dia',
            due: 'Próximo',
            expired: 'Vencido',
            unknown: 'Sem data',
            mixed: 'Detalhado'
        }[item.status] || 'N/I';
        const dateLabel = item.expiry ? formatDateOnly(item.expiry) : 'N/I';
        const canEdit = SiteAuth.mode === 'edit';
        const actionKey = item.match === 'unit' ? normalizeUnitKey(item.unit) : item.re;
        const selectId = `reciclagem-template-${idx}`;
        const note = item.match === 're' ? getReciclagemNote(item.re) : '';
        const templateSelect = item.match === 're'
            ? `<select id="${selectId}" class="reciclagem-template">
                    <option value="">Mensagem</option>
                    ${reciclagemTemplates.map(t => `<option value="${t.id}">${t.label}</option>`).join('')}
               </select>
               <div class="reciclagem-action-buttons">
                    <button class="btn-mini btn-secondary reciclagem-action" data-action="send" data-index="${idx}">Enviar</button>
                    <button class="btn-mini btn-secondary reciclagem-action" data-action="copy" data-index="${idx}">Copiar</button>
                    <button class="btn-mini btn-secondary obs-inline" title="${note ? note : 'Sem observação.'}" onclick="openReciclagemNoteModal('${item.re}', '${item.name}')">Obs</button>
               </div>`
            : '';
        const canEditRec = item.match === 'unit' && canEdit && item.type !== 'ALL';
        const badge = (item.match === 're' && (item.detailItems || []).some(d => d.status === 'expired'))
            ? `<span class="reciclagem-badge" title="Vencido"></span>`
            : '';
        const detailLines = item.match === 're'
            ? (item.detailItems || []).map(d => {
                const statusLabel = d.status === 'expired'
                    ? 'Vencido'
                    : (d.status === 'due' ? 'Próximo' : (d.status === 'ok' ? 'Em dia' : 'Sem data'));
                return `
                    <div class="reciclagem-line status-${d.status}">
                        <span class="reciclagem-line-label">${d.label}</span>
                        <span class="reciclagem-line-date">${d.dateLabel}</span>
                        <span class="reciclagem-line-status">${statusLabel}</span>
                    </div>
                `;
            }).join('')
            : '';
        if (item.match === 'unit') {
            const unitChips = (item.detailItems || []).map(d => {
                return `
                    <div class="reciclagem-chip status-${d.status}">
                        <div class="chip-label">${d.label}</div>
                        <div class="chip-date">${d.dateLabel}</div>
                    </div>
                `;
            }).join('');
            return `
                <div class="reciclagem-card status-${item.status} compact thin">
                    <div class="reciclagem-top">
                        <div class="reciclagem-left">
                            <div class="reciclagem-id">
                                <div class="reciclagem-title">
                                    <strong>${item.unit}</strong>
                                </div>
                                <div class="reciclagem-re">Documentação da unidade</div>
                            </div>
                        </div>
                        <div class="reciclagem-right">
                            <div class="reciclagem-chips">
                                ${unitChips}
                            </div>
                            <div class="reciclagem-footer">
                                <span>Aplicável a todos os grupos</span>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
        const chips = (item.detailItems || []).map(d => {
            const statusLabel = d.status === 'expired'
                ? 'Vencido'
                : (d.status === 'due' ? 'Próximo' : (d.status === 'ok' ? 'Em dia' : 'Sem data'));
            return `
                <div class="reciclagem-chip status-${d.status}">
                    <div class="chip-label">${d.label}</div>
                    <div class="chip-date">${d.dateLabel}</div>
                </div>
            `;
        }).join('');
        return `
            <div class="reciclagem-card status-${item.status} compact thin">
                <div class="reciclagem-top">
                    <div class="reciclagem-left">
                        <div class="reciclagem-id">
                            <div class="reciclagem-title">
                                <strong>${item.name}</strong>
                            </div>
                            <div class="reciclagem-re">RE ${item.re} ${badge}</div>
                        </div>
                        <div class="reciclagem-obs-text" title="${note ? note : 'Sem observação.'}">
                            ${note ? note : 'Sem observação.'}
                        </div>
                        <div class="reciclagem-actions-row">
                            ${templateSelect ? `<div class="reciclagem-actions compact">${templateSelect}</div>` : ''}
                        </div>
                    </div>
                    <div class="reciclagem-right">
                        <div class="reciclagem-chips">
                            ${chips}
                        </div>
                        <div class="reciclagem-footer">
                            <button class="reciclagem-unit-pill" onclick="focusReciclagemUnit('${item.unit || ''}')">Unidade: ${item.unit || 'N/I'}</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openReciclagemModal(sheetKey, targetKey, matchType, label) {
    if (!(SiteAuth.logged && SiteAuth.mode === 'edit')) {
        showToast("Apenas admins podem editar.", "error");
        return;
    }
    if (sheetKey === 'ALL') {
        showToast("Selecione uma reciclagem específica para editar.", "info");
        return;
    }
    document.getElementById('reciclagem-edit-key').value = sheetKey;
    document.getElementById('reciclagem-edit-target').value = targetKey;
    document.getElementById('reciclagem-edit-type').value = getReciclagemSheetLabel(sheetKey);
    document.getElementById('reciclagem-edit-ref').value = `${label || ''}${matchType === 'unit' ? '' : ` (${targetKey})`}`;
    const override = getReciclagemOverride(sheetKey, targetKey);
    document.getElementById('reciclagem-edit-date').value = override?.expiry || '';
    document.getElementById('reciclagem-modal')?.classList.remove('hidden');
}

function closeReciclagemModal() {
    document.getElementById('reciclagem-modal')?.classList.add('hidden');
}

function openReciclagemNoteModal(targetKey, name) {
    if (!(SiteAuth.logged && SiteAuth.mode === 'edit')) {
        showToast("Apenas admins podem editar.", "error");
        return;
    }
    document.getElementById('reciclagem-note-target').value = targetKey;
    document.getElementById('reciclagem-note-ref').value = `${name || ''} (${targetKey})`;
    document.getElementById('reciclagem-note-text').value = getReciclagemNote(targetKey) || '';
    document.getElementById('reciclagem-note-modal')?.classList.remove('hidden');
}

function closeReciclagemNoteModal() {
    document.getElementById('reciclagem-note-modal')?.classList.add('hidden');
}

function saveReciclagemNote() {
    if (!(SiteAuth.logged && SiteAuth.mode === 'edit')) return;
    const targetKey = document.getElementById('reciclagem-note-target').value;
    const note = document.getElementById('reciclagem-note-text').value.trim();
    setReciclagemNote(targetKey, note);
    closeReciclagemNoteModal();
    renderReciclagem();
    showToast("Observação salva.", "success");
}

function saveReciclagemEdit() {
    if (!(SiteAuth.logged && SiteAuth.mode === 'edit')) return;
    const sheetKey = document.getElementById('reciclagem-edit-key').value;
    const targetKey = document.getElementById('reciclagem-edit-target').value;
    const dateStr = document.getElementById('reciclagem-edit-date').value.trim();
    if (!dateStr) {
        showToast("Informe a validade.", "error");
        return;
    }
    const prev = getReciclagemOverride(sheetKey, targetKey)?.expiry || '';
    setReciclagemOverride(sheetKey, targetKey, {
        expiry: dateStr,
        updatedBy: SiteAuth.user || 'Admin',
        updatedAt: new Date().toISOString()
    });
    reciclagemHistory.unshift({
        at: new Date().toISOString(),
        by: SiteAuth.user || 'Admin',
        sheet: sheetKey,
        target: targetKey,
        from: prev,
        to: dateStr
    });
    saveReciclagemHistory();
    closeReciclagemModal();
    renderReciclagem();
    showToast("Reciclagem atualizada (local).", "success");
}

function toggleReciclagemTemplatesPanel() {
    if (!isAdminRole()) return;
    const panel = document.getElementById('reciclagem-templates-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    renderReciclagemTemplatesPanel();
}

function toggleReciclagemHistory() {
    if (!isAdminRole()) return;
    const panel = document.getElementById('reciclagem-history-panel');
    if (!panel) return;
    panel.classList.toggle('hidden');
    const list = document.getElementById('reciclagem-list');
    if (list) list.classList.toggle('hidden', !panel.classList.contains('hidden'));
    const counts = document.getElementById('reciclagem-type-counts');
    if (counts) counts.classList.toggle('hidden', !panel.classList.contains('hidden'));
    renderReciclagemHistory();
}

function renderReciclagemHistory() {
    const list = document.getElementById('reciclagem-history-list');
    if (!list) return;
    if (!reciclagemHistory.length) {
        list.innerHTML = `<div class="admin-empty">Nenhuma alteração registrada.</div>`;
        return;
    }
    const rows = reciclagemHistory.slice(0, 40).map(h => `
        <div class="reciclagem-template-row">
            <div>
                <strong>${getReciclagemSheetLabel(h.sheet)} • ${h.target}</strong>
                <div class="hint">${formatAvisoDate(h.at)} — ${h.by}</div>
                <div class="hint">De: ${h.from || 'N/I'} → Para: ${h.to}</div>
            </div>
        </div>
    `).join('');
    list.innerHTML = rows;
}

function renderReciclagemTemplatesPanel() {
    const list = document.getElementById('reciclagem-templates-list');
    if (!list) return;
    if (!reciclagemTemplates.length) {
        list.innerHTML = `<div class="admin-empty">Nenhum modelo cadastrado.</div>`;
        return;
    }
    list.innerHTML = reciclagemTemplates.map((t, idx) => `
        <div class="reciclagem-template-row">
            <div>
                <strong>${t.label}</strong>
                <div class="hint">${t.text}</div>
            </div>
            <button class="btn-mini btn-secondary" onclick="removeReciclagemTemplate(${idx})">Excluir</button>
        </div>
    `).join('');
}

function addReciclagemTemplate() {
    if (!isAdminRole()) return;
    const id = document.getElementById('reciclagem-template-id')?.value.trim();
    const label = document.getElementById('reciclagem-template-label')?.value.trim();
    const text = document.getElementById('reciclagem-template-text')?.value.trim();
    if (!id || !label || !text) {
        showToast("Preencha ID, título e mensagem.", "error");
        return;
    }
    if (reciclagemTemplates.some(t => t.id === id)) {
        showToast("ID já existe.", "error");
        return;
    }
    reciclagemTemplates.push({ id, label, text });
    saveReciclagemTemplates();
    document.getElementById('reciclagem-template-id').value = '';
    document.getElementById('reciclagem-template-label').value = '';
    document.getElementById('reciclagem-template-text').value = '';
    renderReciclagemTemplatesPanel();
    renderReciclagem();
}

function removeReciclagemTemplate(idx) {
    if (!isAdminRole()) return;
    if (!confirm('Remover modelo?')) return;
    reciclagemTemplates.splice(idx, 1);
    saveReciclagemTemplates();
    renderReciclagemTemplatesPanel();
    renderReciclagem();
}

function printCurrentView() {
    window.print();
}

function openHelpModal() {
    document.getElementById('help-modal')?.classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal')?.classList.add('hidden');
}

function openPromptsModal() {
    document.getElementById('prompts-modal')?.classList.remove('hidden');
}

function closePromptsModal() {
    document.getElementById('prompts-modal')?.classList.add('hidden');
}

function renderPromptTemplates() {
    const container = document.getElementById('prompt-templates');
    if (!container) return;
    container.innerHTML = PROMPT_TEMPLATES.map((p, idx) => `
        <div class="prompt-card">
            <div class="prompt-title">${p.title}</div>
            <div class="prompt-text" id="prompt-text-${idx}">${p.text}</div>
            <button class="btn btn-secondary btn-small" onclick="copyPrompt(${idx})">Copiar</button>
        </div>
    `).join('');
}

function copyPrompt(index) {
    const text = PROMPT_TEMPLATES[index]?.text || '';
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
        showToast("Prompt copiado.", "success");
    }).catch(() => {
        showToast("Não foi possível copiar.", "error");
    });
}

function handleSearchTokenSuggest() {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    if (!input || !list) return;
    const value = input.value;
    const cursor = input.selectionStart ?? value.length;
    const left = value.slice(0, cursor);
    const openIdx = left.lastIndexOf('(');
    const closeIdx = left.lastIndexOf(')');
    if (openIdx < 0 || openIdx < closeIdx) {
        list.classList.add('hidden');
        return;
    }
    const fragment = left.slice(openIdx + 1).trim().toUpperCase();
    const unitMatches = getUnitSuggestions(fragment);
    const nameMatches = getNameSuggestions(fragment);
    const tokenMatches = SEARCH_TOKENS.filter(t => t.key.startsWith(fragment));
    const matches = unitMatches.length
        ? unitMatches
        : (nameMatches.length ? nameMatches : tokenMatches.map(t => ({ value: t.key, label: t.label })));
    if (!matches.length) {
        list.classList.add('hidden');
        return;
    }
    list.innerHTML = matches.map(m => `
        <button type="button" class="suggest-item" onclick="applySearchToken('${m.value}')">
            <strong>${m.value}</strong> <span>${m.label || 'Unidade'}</span>
        </button>
    `).join('');
    list.classList.remove('hidden');
}

function applySearchToken(token) {
    const input = document.getElementById('search-input');
    const list = document.getElementById('search-suggestions');
    if (!input) return;
    const value = input.value;
    const cursor = input.selectionStart ?? value.length;
    const left = value.slice(0, cursor);
    const right = value.slice(cursor);
    const openIdx = left.lastIndexOf('(');
    if (openIdx < 0) return;
    const before = value.slice(0, openIdx + 1);
    const after = right.startsWith(')') ? right.slice(1) : right;
    const newValue = `${before}${token})${after}`;
    const newCursor = (before + token + ')').length;
    input.value = newValue;
    input.setSelectionRange(newCursor, newCursor);
    if (list) list.classList.add('hidden');
    input.focus();
    realizarBusca();
}

function getUnitSuggestions(fragment) {
    const term = (fragment || '').trim().toUpperCase();
    if (!term) return [];
    const units = [...new Set(currentData.map(d => d.posto).filter(Boolean))];
    return units
        .filter(u => u.toUpperCase().includes(term))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .slice(0, 8)
        .map(u => ({ value: u, label: 'Unidade' }));
}

function getNameSuggestions(fragment) {
    const term = (fragment || '').trim().toUpperCase();
    if (!term || term.length < 2) return [];
    const names = [...new Set(currentData.map(d => d.nome).filter(Boolean))];
    return names
        .filter(n => n.toUpperCase().includes(term))
        .sort((a, b) => a.localeCompare(b, 'pt-BR'))
        .slice(0, 8)
        .map(n => ({ value: n, label: 'Nome' }));
}

function toggleUnitVisibility(posto) {
    if (hiddenUnits.has(posto)) {
        hiddenUnits.delete(posto);
    } else {
        hiddenUnits.add(posto);
    }
    // Re-renderiza para atualizar ícones e estado
    renderizarUnidades();
}

function toggleUnitMinimize(posto) {
    if (minimizedUnits.has(posto)) {
        minimizedUnits.delete(posto);
    } else {
        minimizedUnits.add(posto);
    }
    renderizarUnidades();
}

function renderUnitTable(lista) {
    if (lista.length === 0) return '<p class="empty-team">Ninguém neste status.</p>';
    
    return `
        <div class="unit-table-wrapper">
            <table class="unit-table">
                <thead>
                    <tr>
                        <th>Colaborador</th>
                        <th>RE</th>
                        <th>Escala</th>
                        <th style="width: 80px;">Ações</th>
                    </tr>
                </thead>
                <tbody>
                    ${lista.map(p => {
                        const homenageado = isHomenageado(p);
                        const nomeDisplay = homenageado ? `${p.nome} ✨` : p.nome;
                        const recSummary = getReciclagemSummaryForCollab(p.re, p.nome);
                        const recIcon = recSummary
                            ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
                            : '';
                        return `
                            <tr class="${homenageado ? 'homenageado-row' : ''}">
                                <td>
                                    <div class="colab-cell">
                                        <strong class="${homenageado ? 'homenageado-nome' : ''}">${nomeDisplay}</strong>
                                        ${recIcon}
                                        ${getPendingAvisosByCollaborator(p.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag">Aviso</span>` : ''}
                                        ${getPendingRemindersByCollaborator(p.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag reminder">Lembrete</span>` : ''}
                                        ${p.rotulo ? `
                                            ${p.rotulo.split(',').map(r => `
                                                <span class="mini-label">
                                                    ${(r === 'OUTRO' && p.rotuloDetalhe) ? p.rotuloDetalhe : r}
                                                </span>
                                            `).join('')}
                                            ${p.rotuloFim ? `<span class="mini-date">Até ${formatDate(p.rotuloFim)}</span>` : ''}
                                        ` : ''}
                                    </div>
                                </td>
                                <td>${p.re}</td>
                                <td>
                                    ${p.tipoEscala ? `<div style="font-weight:bold; font-size:0.8rem;">${p.tipoEscala}</div>` : ''}
                                    <div>${p.escala}</div>
                                    ${getTurnoInfo(p.escala) ? `<div style="margin-top: 4px;">${getTurnoInfo(p.escala)}</div>` : ''}
                                </td>
                                <td style="text-align: center;">
                                    <button class="edit-btn-icon small" onclick="openEditModal(${p.id})">${ICONS.edit}</button>
                                    <button class="edit-btn-icon small ${p.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal('${p.nome}', '${p.telefone || ''}')" title="${p.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                                </td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function navigateToUnit(posto) {
    switchTab('unidades');
    const safeId = 'unit-' + posto.replace(/[^a-zA-Z0-9]/g, '-');
    // Pequeno delay para garantir a troca de aba
    setTimeout(() => {
        const element = document.getElementById(safeId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('highlight-unit');
            setTimeout(() => element.classList.remove('highlight-unit'), 2000);
        }
    }, 100);
}

function getTurnoInfo(escala) {
    if (!escala) return '';
    const hora = parseInt(escala.substring(0, 2));
    if (isNaN(hora)) return '';
    
    // Heurística simples: 06-11 é Diurno, 18-22 é Noturno
    if (hora >= 5 && hora < 18) return `<span class="shift-badge day">${ICONS.sun} Diurno</span>`;
    return `<span class="shift-badge night">${ICONS.moon} Noturno</span>`;
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    return `${parts[2]}/${parts[1]}`;
}

// Função robusta para ler CSV do Google Sheets (lida com aspas e vírgulas internas)
function parseCSV(text) {
    const rows = [];
    let currentRow = [];
    let currentCell = '';
    let insideQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const nextChar = text[i + 1];

        if (char === '"') {
            if (insideQuotes && nextChar === '"') {
                currentCell += '"';
                i++; 
            } else {
                insideQuotes = !insideQuotes;
            }
        } else if (char === ',' && !insideQuotes) {
            currentRow.push(currentCell.trim());
            currentCell = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
            if (char === '\r' && nextChar === '\n') i++;
            if (currentCell || currentRow.length > 0) {
                currentRow.push(currentCell.trim());
                rows.push(currentRow);
            }
            currentRow = [];
            currentCell = '';
        } else {
            currentCell += char;
        }
    }
    if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell.trim());
        rows.push(currentRow);
    }
    return rows;
}

// ==========================================================================
// 📌 LÓGICA DE EDIÇÃO E STATUS
// ==========================================================================

function getStatusInfo(item) {
    // 1. Verifica Rótulos Especiais (Prioridade)
    if (item.rotulo) {
        const r = item.rotulo;
        if (r === 'FÉRIAS' || r === 'ATESTADO' || r === 'AFASTADO') {
            return { text: r, color: '#0f766e' }; // Verde azulado (afastamento)
        }
        if (r === 'FT') {
            return { text: 'PLANTÃO EXTRA (FT)', color: '#002D72' }; // Azul Dunamis
        }
    }

    // 2. Status real do dia (quando houver evento na API)
    if (item._nextiHasEvent) {
        return { text: 'PLANTÃO', color: '#dc3545' }; // Vermelho
    }

    // 2. Verifica Escala Padrão
    const trabalha = verificarEscala(item.turma);
    if (trabalha) return { text: 'PLANTÃO', color: '#dc3545' }; // Vermelho
    return { text: 'FOLGA', color: '#28a745' }; // Verde
}

function toggleAiSearchButton() {
    const enabled = !isAiSearchEnabled();
    localStorage.setItem('aiSearchEnabled', enabled ? '1' : '0');
    updateAiSearchButton();
}

function isAiSearchEnabled() {
    return localStorage.getItem('aiSearchEnabled') === '1';
}

function updateAiSearchButton() {
    const btn = document.getElementById('ai-search-btn');
    if (!btn) return;
    const enabled = isAiSearchEnabled();
    btn.textContent = enabled ? 'IA: ON' : 'IA: OFF';
    btn.classList.toggle('active', enabled);
}

function aiAssistSearch(query, container, filterStatus, hideAbsence) {
    const intent = interpretAiQuery(query);
    const q = intent.normalized;
    if (!q) return false;

    const isQuestion = intent.isQuestion;
    const mentionsLeader = intent.mentionsLeader;
    const mentionsUnit = intent.mentionsUnit;
    const mentionsCover = intent.mentionsCover;
    const mentionsProximity = intent.mentionsProximity;
    const mentionsOnDuty = intent.mentionsOnDuty;
    const mentionsOff = intent.mentionsOff;
    const mentionsAbsence = intent.mentionsAbsence;
    const mentionsPhone = intent.mentionsPhone;
    const mentionsSchedule = intent.mentionsSchedule;
    const mentionsCount = intent.mentionsCount;
    const targetRe = intent.targetRe;
    const targetName = intent.targetName;

    if (isQuestion && mentionsLeader && mentionsUnit) {
        const unitName = extractUnitName(q);
        if (!unitName) return false;

        const matchedUnit = findUnitByName(unitName);
        if (!matchedUnit) {
            container.innerHTML = `<p class="empty-state">Não encontrei a unidade "${unitName}".</p>`;
            return true;
        }

        const meta = unitMetadata[matchedUnit] || {};
        if (!meta.responsavel) {
            container.innerHTML = `<p class="empty-state">Unidade "${matchedUnit}" sem responsável definido.</p>`;
            return true;
        }

        container.innerHTML = `
            <div class="result-card">
                <h4>${matchedUnit}</h4>
                <div class="meta">Líder/Responsável</div>
                <div class="member-name">${meta.responsavel}</div>
                <div class="member-re">Resposta gerada pelo assistente de busca</div>
            </div>
        `;
        return true;
    }

    if (isQuestion && mentionsCover) {
        if (!targetRe && !targetName) return false;

        const target = targetRe
            ? currentData.find(d => d.re === targetRe || d.re?.endsWith(targetRe))
            : findPersonByName(targetName || '');
        if (!target) {
            container.innerHTML = `<p class="empty-state">Não encontrei o colaborador informado.</p>`;
            return true;
        }

        if (mentionsProximity) {
            handleCoverageProximityAsync(target, container);
            return true;
        }

        const sameUnit = currentData.filter(d => d.posto === target.posto);
        const available = sameUnit.filter(d => isDisponivelParaCobrir(d));
        const list = (available.length ? available : sameUnit).slice(0, 8);
        const title = `Sugestões de cobertura`;

        container.innerHTML = `
            <div class="result-card">
                <h4>${title}</h4>
                <div class="meta">Colaborador alvo (RE ${target.re}): ${target.nome} — Unidade: ${target.posto}</div>
            </div>
            ${list.map(p => renderAiResultCard(p, target)).join('')}
        `;
        return true;
    }

    // Intenção: informações por RE ou nome
    const re = targetRe || extractRe(q);
    const byName = !re ? findPersonByName(q) : null;
    const target = re ? currentData.find(d => d.re === re || d.re?.endsWith(re)) : byName;
    if (target && (mentionsPhone || mentionsSchedule || q.startsWith('quem') || q.startsWith('qual'))) {
        const results = applyAiFilters([target], filterStatus, hideAbsence);
        if (!results.length) {
            container.innerHTML = `<p class="empty-state">Nenhum resultado com os filtros atuais.</p>`;
            return true;
        }
        container.innerHTML = results.map(p => renderAiResultCard(p, target)).join('');
        return true;
    }

    // Intenção: listar por unidade
    if (isQuestion && mentionsUnit) {
        const unitName = extractUnitName(q);
        if (!unitName) return false;
        const matchedUnit = findUnitByName(unitName);
        if (!matchedUnit) {
            container.innerHTML = `<p class="empty-state">Não encontrei a unidade "${unitName}".</p>`;
            return true;
        }
        let list = currentData.filter(d => d.posto === matchedUnit);
        if (mentionsOnDuty) list = list.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT'));
        if (mentionsOff) list = list.filter(d => getStatusInfo(d).text.includes('FOLGA'));
        if (mentionsAbsence) list = list.filter(d => d.rotulo);
        list = applyAiFilters(list, filterStatus, hideAbsence);
        if (!list.length) {
            container.innerHTML = `<p class="empty-state">Nenhum resultado com os filtros atuais.</p>`;
            return true;
        }
        container.innerHTML = `
            <div class="result-card">
                <h4>Unidade: ${matchedUnit}</h4>
                <div class="meta">Resultado gerado pelo assistente para a unidade informada.</div>
            </div>
            ${list.slice(0, 20).map(p => renderAiResultCard(p, p)).join('')}
        `;
        return true;
    }

    // Intenção: listas gerais
    if (isQuestion && (mentionsOnDuty || mentionsOff || mentionsAbsence)) {
        let list = [...currentData];
        if (mentionsOnDuty) list = list.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT'));
        if (mentionsOff) list = list.filter(d => getStatusInfo(d).text.includes('FOLGA'));
        if (mentionsAbsence) list = list.filter(d => d.rotulo);
        list = applyAiFilters(list, filterStatus, hideAbsence);
        if (!list.length) {
            container.innerHTML = `<p class="empty-state">Nenhum resultado com os filtros atuais.</p>`;
            return true;
        }
        container.innerHTML = list.slice(0, 20).map(p => renderAiResultCard(p, p)).join('');
        return true;
    }

    // Intenção: contagem
    if (isQuestion && mentionsCount) {
        const unitName = extractUnitName(q);
        let list = [...currentData];
        if (unitName) {
            const matchedUnit = findUnitByName(unitName);
            if (matchedUnit) list = list.filter(d => d.posto === matchedUnit);
        }
        if (mentionsOnDuty) list = list.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT'));
        if (mentionsOff) list = list.filter(d => getStatusInfo(d).text.includes('FOLGA'));
        if (mentionsAbsence) list = list.filter(d => d.rotulo);
        list = applyAiFilters(list, filterStatus, hideAbsence);
        container.innerHTML = `<p class="empty-state">Total encontrado: ${list.length} (unidade/status conforme solicitado)</p>`;
        return true;
    }

    return false;
}

const AI_STUDIO_ENDPOINT = 'https://apigooglestudio.gustavo-dac.workers.dev/';

function buildAiDataSummary(list, limit = 300) {
    const rows = list.slice(0, limit).map(item => {
        const re = item.re || '';
        const nome = item.nome || '';
        const posto = item.posto || '';
        const grupo = item.grupoLabel || '';
        return `${re} | ${nome} | ${posto} | ${grupo}`;
    });
    return rows.join('\n');
}

function extractJsonFromText(text) {
    if (!text) return null;
    const firstArray = text.indexOf('[');
    const firstObj = text.indexOf('{');
    const start = firstArray >= 0 ? firstArray : firstObj;
    if (start < 0) return null;
    const end = Math.max(text.lastIndexOf(']'), text.lastIndexOf('}'));
    if (end < 0) return null;
    const slice = text.slice(start, end + 1);
    try { return JSON.parse(slice); } catch { return null; }
}

function normalizeReValue(value) {
    if (value == null) return null;
    const str = String(value).replace(/\D/g, '');
    return str || null;
}

function parseAiReList(text) {
    const json = extractJsonFromText(text);
    if (Array.isArray(json)) return json.map(normalizeReValue).filter(Boolean);
    if (json && Array.isArray(json.res)) return json.res.map(normalizeReValue).filter(Boolean);
    if (json && Array.isArray(json.re_list)) return json.re_list.map(normalizeReValue).filter(Boolean);
    const fallback = [];
    const regex = /(?:re\s*)?([0-9]{3,6})/gi;
    let m;
    while ((m = regex.exec(text || '')) !== null) {
        const val = normalizeReValue(m[1]);
        if (val) fallback.push(val);
    }
    return fallback;
}

async function aiRemoteSearch(query, container, filterStatus, hideAbsence) {
    const prompt = [
        'RETORNE APENAS JSON.',
        'Formato esperado: {"res":["RE1","RE2","RE3"]}.',
        'Use apenas REs presentes na lista.',
        'Se não encontrar, retorne {"res":[]}.'
    ].join(' ');
    const data = `${prompt}\n\n${buildAiDataSummary(currentData)}`;

    try {
        container.innerHTML = '<p class="empty-state">Buscando com IA...</p>';
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 6000);
        const resp = await fetch(AI_STUDIO_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, data }),
            signal: controller.signal
        });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const json = await resp.json();
        const text = json?.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const reList = parseAiReList(text);
        if (!reList.length) {
            renderAiFallbackResponse(query, container, 'Não encontrei resultados diretos com os dados atuais.');
            return true;
        }

        let results = currentData.filter(item => reList.includes(item.re) || reList.some(r => item.re?.endsWith(r)));
        results = applyAiFilters(results, filterStatus, hideAbsence);
        if (!results.length) return false;
        container.innerHTML = results.slice(0, 20).map(p => renderAiResultCard(p, p)).join('');
        return true;
    } catch (e) {
        console.error('Erro IA remota:', e);
        renderAiFallbackResponse(query, container, 'Não consegui conectar com a IA agora.');
        return true;
    }
}

function renderAiFallbackResponse(query, container, note) {
    container.innerHTML = `
        <div class="result-card">
            <h4>Resposta IA</h4>
            <p>Não consegui interpretar completamente: “${query}”.</p>
            <p>${note}</p>
            <p>Dica: informe RE, nome ou unidade para respostas mais precisas.</p>
        </div>
    `;

    updateSearchFilterUI();
    updateBreadcrumb();
    bindContextSelection();
    renderContextBar();
}

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('compactMode') === '1') {
        document.body.classList.add('compact-mode');
    }
});

function extractUnitName(text) {
    const patterns = [
        /unidade\s+do\s+(.+)/,
        /unidade\s+da\s+(.+)/,
        /unidade\s+de\s+(.+)/,
        /posto\s+(.+)/
    ];
    for (const p of patterns) {
        const m = text.match(p);
        if (m && m[1]) {
            const raw = m[1]
                .replace(/[(){}[\]]/g, ' ')
                .replace(/[^a-z0-9\s]/gi, ' ')
                .replace(/\s+/g, ' ')
                .trim();
            return raw.toUpperCase();
        }
    }
    return null;
}

function extractRe(text) {
    const m = text.match(/re\s*([0-9]{3,6})/i);
    return m ? m[1] : null;
}

function normalizeText(text) {
    return (text || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}

function extractNameInParens(text) {
    const raw = (text || '');
    const match = raw.match(/\(([^)]+)\)/);
    if (!match || !match[1]) return null;
    const value = match[1].replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    return value ? value.toUpperCase() : null;
}

function extractNameFromQuery(text) {
    const raw = (text || '').toLowerCase();
    if (!raw) return null;
    const cleaned = raw
        .replace(/\bre\b\s*[0-9]{3,6}/gi, ' ')
        .replace(/\bmatricula\b\s*[0-9]{3,6}/gi, ' ')
        .replace(/\b(unidade|posto|cobrir|cobertura|falta|faltou|substituir|substituicao|troca|remanejar|remanejamento|plantao|folga|hoje|perto|proximo|mais)\b/gi, ' ')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    if (!cleaned) return null;
    return cleaned.toUpperCase();
}

function extractReAdvanced(text) {
    const raw = normalizeText(text);
    const direct = raw.match(/re\s*([0-9]{3,6})/i);
    if (direct) return direct[1];
    const matricula = raw.match(/matricula\s*([0-9]{3,6})/i);
    if (matricula) return matricula[1];
    const maybe = raw.match(/\b([0-9]{3,6})\b/);
    return maybe ? maybe[1] : null;
}

function interpretAiQuery(query) {
    const normalized = normalizeText((query || '').trim());
    const isQuestion = normalized.includes('?') ||
        normalized.startsWith('quem') ||
        normalized.startsWith('qual') ||
        normalized.startsWith('listar') ||
        normalized.startsWith('mostre') ||
        normalized.startsWith('mostrar') ||
        normalized.startsWith('preciso') ||
        normalized.startsWith('precisamos');

    const mentionsLeader = /(lider|responsavel|chefe)/.test(normalized);
    const mentionsUnit = /(unidade|posto)/.test(normalized);
    const mentionsCover = /(cobrir|cobertura|substituir|substituicao|troca|remanejar|remanejamento|cobertura|falta)/.test(normalized);
    const mentionsProximity = /(proximidade|perto|prox|proximo|mais perto|mais proximo|distancia)/.test(normalized);
    const mentionsOnDuty = /(plantao|em plantao|trabalhando|em serviço|em servico)/.test(normalized);
    const mentionsOff = /(folga|disponivel|disponiveis|liberado|livre)/.test(normalized);
    const mentionsAbsence = /(afastado|afastamento|ferias|atestado|licenca)/.test(normalized);
    const mentionsPhone = /(telefone|whatsapp|contato)/.test(normalized);
    const mentionsSchedule = /(escala|horario|turno)/.test(normalized);
    const mentionsCount = /(quantos|total|quantidade)/.test(normalized);
    const targetRe = extractReAdvanced(query);
    const targetName = extractNameInParens(query) || extractNameFromQuery(query);

    return {
        normalized,
        isQuestion,
        mentionsLeader,
        mentionsUnit,
        mentionsCover,
        mentionsProximity,
        mentionsOnDuty,
        mentionsOff,
        mentionsAbsence,
        mentionsPhone,
        mentionsSchedule,
        mentionsCount,
        targetRe,
        targetName
    };
}

function normalizeUnitKey(text) {
    return (text || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase()
        .replace(/[^A-Z0-9\\s]/g, ' ')
        .replace(/\\s+/g, ' ')
        .trim();
}

function buildUnitKeyVariants(name) {
    const base = normalizeUnitKey(name);
    const variants = new Set([base]);
    if (base.startsWith('RB ')) variants.add(base.replace(/^RB\\s+/, '').trim());
    if (base.startsWith('DUNAMIS ')) variants.add(base.replace(/^DUNAMIS\\s+/, '').trim());
    if (base.startsWith('HOSPITAL ')) variants.add(base.replace(/^HOSPITAL\\s+/, '').trim());
    return Array.from(variants).filter(Boolean);
}

async function loadUnitAddressDb() {
    try {
        const resp = await fetch('unit_addresses.json', { cache: 'no-store' });
        if (!resp.ok) return;
        unitAddressDb = await resp.json();
        const normMap = {};
        (unitAddressDb.entries || []).forEach(e => {
            const key = normalizeUnitKey(e.nome);
            if (key && e.endereco) normMap[key] = e.endereco;
        });
        unitAddressDb.address_map_norm = normMap;
    } catch {}

    try {
        unitGeoCache = JSON.parse(localStorage.getItem('unitGeoCache') || '{}') || {};
    } catch {
        unitGeoCache = {};
    }

    try {
        const geoResp = await fetch('unit_geo_cache.json', { cache: 'no-store' });
        if (geoResp.ok) {
            const pre = await geoResp.json();
            unitGeoCache = { ...pre, ...unitGeoCache };
        }
    } catch {}
}

function getAddressForUnit(unitName) {
    const map = unitAddressDb?.address_map_norm || {};
    const variants = buildUnitKeyVariants(unitName);
    for (const key of variants) {
        if (map[key]) return map[key];
    }
    const entries = unitAddressDb?.entries || [];
    const base = normalizeUnitKey(unitName);
    if (base.length >= 5) {
        const direct = entries.find(e => normalizeUnitKey(e.nome) === base && e.endereco);
        if (direct) return direct.endereco;
        const contains = entries.find(e => normalizeUnitKey(e.nome).includes(base) && e.endereco);
        if (contains) return contains.endereco;
    }
    return null;
}

async function getCoordsForAddress(address) {
    if (!address) return null;
    if (unitGeoCache[address]) return unitGeoCache[address];
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || !data.length) return null;
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;
        unitGeoCache[address] = coords;
        localStorage.setItem('unitGeoCache', JSON.stringify(unitGeoCache));
        scheduleShadowSync('unit-geo-cache', { silent: true });
        return coords;
    } catch {
        return null;
    }
}

function calcDistanceKm(a, b) {
    const toRad = (d) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(b.lat - a.lat);
    const dLon = toRad(b.lon - a.lon);
    const lat1 = toRad(a.lat);
    const lat2 = toRad(b.lat);
    const sinLat = Math.sin(dLat / 2);
    const sinLon = Math.sin(dLon / 2);
    const h = sinLat * sinLat + Math.cos(lat1) * Math.cos(lat2) * sinLon * sinLon;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

async function handleCoverageProximityAsync(target, container) {
    container.innerHTML = '<p class="empty-state">Calculando proximidade por endereços...</p>';

    const targetAddress = getAddressForUnit(target.posto);
    const targetCoords = await getCoordsForAddress(targetAddress);

    let candidates = currentData.filter(d => d.re !== target.re && isDisponivelParaCobrir(d));
    if (!candidates.length) {
        container.innerHTML = `<div class="result-card"><h4>Resposta IA</h4><p>Não encontrei colaboradores de folga no momento para cobrir o RE ${target.re}.</p></div>`;
        return;
    }

    if (!targetAddress || !targetCoords) {
        const sameUnit = candidates.filter(d => d.posto === target.posto).slice(0, 6);
        const list = sameUnit.length ? sameUnit : candidates.slice(0, 6);
        container.innerHTML = `
            <div class="result-card">
                <h4>Sugestões de cobertura</h4>
                <div class="meta">Colaborador alvo (RE ${target.re}): ${target.nome}. Endereço da unidade (${target.posto}) indisponível; usando disponibilidade e unidade.</div>
            </div>
            ${list.map(p => renderAiResultCard(p, target)).join('')}
        `;
        return;
    }

    const enriched = [];
    for (const cand of candidates) {
        const addr = getAddressForUnit(cand.posto);
        const coords = await getCoordsForAddress(addr);
        if (!coords) continue;
        const dist = calcDistanceKm(targetCoords, coords);
        enriched.push({ ...cand, _distanceKm: dist });
    }

    if (!enriched.length) {
        container.innerHTML = `
            <div class="result-card">
                <h4>Sugestões de cobertura</h4>
                <div class="meta">Colaborador alvo (RE ${target.re}): ${target.nome}. Não consegui geocodificar endereços suficientes; mostrando colaboradores de folga.</div>
            </div>
            ${candidates.slice(0, 6).map(p => renderAiResultCard(p, target)).join('')}
        `;
        return;
    }

    enriched.sort((a, b) => a._distanceKm - b._distanceKm);
    const list = enriched.slice(0, 6).map(p => {
        p._distanceKm = Math.round(p._distanceKm * 10) / 10;
        return p;
    });

    container.innerHTML = `
        <div class="result-card">
            <h4>Sugestões de cobertura por proximidade</h4>
            <div class="meta">Colaborador alvo (RE ${target.re}): ${target.nome} — Unidade: ${target.posto}. Distância estimada entre postos.</div>
        </div>
        ${list.map(p => renderAiResultCard(p, target)).join('')}
    `;
}

function findPersonByName(query) {
    const cleaned = normalizeText(query).replace(/[^a-z0-9\s]/g, ' ').trim();
    if (!cleaned) return null;
    const parts = cleaned.split(/\s+/).filter(Boolean);
    if (!parts.length) return null;
    return currentData.find(p => {
        const name = normalizeText(p.nome);
        return parts.every(part => name.includes(part));
    }) || null;
}

function applyAiFilters(list, filterStatus, hideAbsence) {
    let filtered = list;
    if (filterStatus === 'plantao') {
        filtered = filtered.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT'));
    } else if (filterStatus === 'folga') {
        filtered = filtered.filter(d => getStatusInfo(d).text.includes('FOLGA'));
    } else if (filterStatus === 'ft') {
        filtered = filtered.filter(d => getStatusInfo(d).text.includes('FT'));
    } else if (filterStatus === 'afastado') {
        filtered = filtered.filter(d => !!d.rotulo);
    }
    if (hideAbsence) {
        filtered = filtered.filter(d => !d.rotulo);
    }
    return filtered;
}

function isDisponivelParaCobrir(item) {
    const status = getStatusInfo(item).text;
    if (status.includes('FOLGA')) return true;
    return false;
}

function buildAiReason(candidate, target) {
    const status = getStatusInfo(candidate).text;
    const parts = [];
    if (status.includes('FOLGA')) parts.push('está de folga hoje');
    if (candidate.posto === target.posto) parts.push(`atua na mesma unidade (${candidate.posto})`);
    if (candidate._distanceKm != null) parts.push(`está a ~${candidate._distanceKm} km da unidade do colaborador RE ${target.re}`);
    if (!parts.length) parts.push('disponibilidade verificada pela escala e status atual');
    return `Motivo: ${parts.join(' e ')}.`;
}

function isHomenageado(item) {
    const re = String(item?.re || '').replace(/\\D/g, '');
    if (re === '8204341') return true;
    const nome = String(item?.nome || item?.name || '').toUpperCase();
    return nome.includes('ADRIANO ANTUONO');
}

function getFtRelationInfo(re) {
    if (!re) return null;
    const active = ftLaunches.filter(item => item.status === 'submitted' || item.status === 'launched');
    const covering = active.find(item => item.collabRe === re);
    if (covering) {
        const targetName = covering.coveringName ||
            (covering.coveringOther && covering.coveringOther !== 'Não se aplica' ? covering.coveringOther : '') ||
            (covering.coveringRe ? `RE ${covering.coveringRe}` : '');
        return {
            type: 'covering',
            label: targetName || 'N/I',
            unit: covering.unitTarget || covering.unitCurrent || ''
        };
    }
    const covered = active.find(item => item.coveringRe === re);
    if (covered) {
        const covererName = covered.collabName || (covered.collabRe ? `RE ${covered.collabRe}` : '');
        return {
            type: 'covered',
            label: covererName || 'N/I',
            unit: covered.unitTarget || covered.unitCurrent || ''
        };
    }
    return null;
}

function renderAiResultCard(item, target) {
    const statusInfo = getStatusInfo(item);
    const turnoInfo = getTurnoInfo(item.escala);
    const retornoInfo = item.rotulo && item.rotuloFim ? `<span class="return-date">Retorno: ${formatDate(item.rotuloFim)}</span>` : '';
    const ftRelation = getFtRelationInfo(item.re);
    const ftRelationHtml = ftRelation
        ? `<div class="ft-link ${ftRelation.type}"><strong>FT:</strong> ${ftRelation.type === 'covering' ? 'Cobrindo' : 'Coberto por'} ${ftRelation.label}${ftRelation.unit ? ` • ${ftRelation.unit}` : ''}</div>`
        : '';
    const recSummary = getReciclagemSummaryForCollab(item.re, item.nome);
    const recIcon = recSummary
        ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
        : '';
    let rotulosHtml = '';
    if (item.rotulo) {
        const rotulos = item.rotulo.split(',');
        rotulosHtml = rotulos.map(r => {
            let display = r;
            if (r === 'OUTRO' && item.rotuloDetalhe) {
                display = item.rotuloDetalhe;
            }
            const map = { 'FÉRIAS': 'Férias', 'ATESTADO': 'Atestado', 'AFASTADO': 'Afastado', 'FT': 'FT', 'TROCA': 'Troca' };
            return `<span class="label-badge">${map[r] || display}</span>`;
        }).join('');
    }
    const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
    const isAfastado = ['FÉRIAS', 'ATESTADO', 'AFASTADO'].includes(statusInfo.text);
    const bgClass = isPlantao ? 'bg-plantao' : (isAfastado ? 'bg-afastado' : 'bg-folga');
    const reason = buildAiReason(item, target);

    const homenageado = isHomenageado(item);
    const nomeDisplay = homenageado ? `${item.nome} ✨` : item.nome;
    return `
        <div class="result-card ${bgClass} ${homenageado ? 'card-homenageado' : ''}" data-collab-re="${item.re}" style="border-left: 5px solid ${statusInfo.color}">
            <div class="card-header">
                <div class="header-left">
                    <span class="colaborador-nome ${homenageado ? 'homenageado-nome' : ''}">${nomeDisplay}</span>
                    ${recIcon}
                    ${getPendingAvisosByCollaborator(item.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag">Aviso</span>` : ''}
                    ${getPendingRemindersByCollaborator(item.re, currentGroup || 'todos') > 0 ? `<span class="colab-flag reminder">Lembrete</span>` : ''}
                    <span class="status-badge" style="background-color: ${statusInfo.color}">${statusInfo.text}</span>
                    ${rotulosHtml}
                    ${retornoInfo}
                </div>
                <div class="header-right">
                    <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal('${item.nome}', '${item.telefone || ''}')" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                </div>
            </div>
            <div class="card-details-grid">
                <div><strong>RE:</strong> ${item.re}</div>
                <div><strong>Posto:</strong> <span class="unit-link" onclick="navigateToUnit('${item.posto}')">${item.posto}</span></div>
                <div><strong>Grupo:</strong> ${item.grupoLabel || 'N/I'}</div>
                <div><strong>Escala:</strong> ${item.tipoEscala ? `<span class="scale-badge">${item.tipoEscala}</span>` : ''}</div>
                <div>
                    <strong>Horário:</strong> ${item.escala || 'N/I'}
                    ${turnoInfo ? `<div style="margin-top: 4px;">${turnoInfo}</div>` : ''}
                </div>
                ${ftRelationHtml}
                <div class="ai-reason">${reason}</div>
            </div>
        </div>
    `;
}

function findUnitByName(name) {
    const units = [...new Set(currentData.map(d => d.posto).filter(Boolean))];
    const normTarget = normalizeUnitKey(name);
    const direct = units.find(u => normalizeUnitKey(u) === normTarget);
    if (direct) return direct;
    return units.find(u => normalizeUnitKey(u).includes(normTarget));
}

function openEditModal(id) {
    if (SiteAuth.mode !== 'edit') return;
    const item = currentData.find(d => d.id === id);
    if (!item) return;

    document.getElementById('edit-id').value = item.id;
    document.getElementById('edit-nome').value = item.nome;
    document.getElementById('edit-re').value = item.re;
    document.getElementById('edit-telefone').value = item.telefone || '';
    document.getElementById('edit-turma').value = item.turma;
    document.getElementById('edit-inicio').value = item.rotuloInicio || '';
    document.getElementById('edit-fim').value = item.rotuloFim || '';
    document.getElementById('edit-rotulo-desc').value = item.rotuloDetalhe || '';

    // Configurar Checkboxes de Rótulo
    setupCheckboxGroup('edit-rotulo-container', item.rotulo || '', toggleRotuloDesc);

    // Preencher Select de Postos (Unidades)
    const postosUnicos = [...new Set(currentData.map(d => d.posto).filter(Boolean))].sort();
    const postoSelect = document.getElementById('edit-posto');
    postoSelect.innerHTML = postosUnicos.map(p => `<option value="${p}">${p}</option>`).join('');
    // Garante que o valor atual esteja selecionado (mesmo se não estiver na lista por algum motivo)
    if (!postosUnicos.includes(item.posto)) postoSelect.innerHTML += `<option value="${item.posto}">${item.posto}</option>`;
    postoSelect.value = item.posto;

    // Preencher Select de Escalas (Horários)
    const escalasUnicas = [...new Set(currentData.map(d => d.escala).filter(Boolean))].sort();
    const escalaSelect = document.getElementById('edit-escala');
    escalaSelect.innerHTML = escalasUnicas.map(e => `<option value="${e}">${e}</option>`).join('');
    if (!escalasUnicas.includes(item.escala)) escalaSelect.innerHTML += `<option value="${item.escala}">${item.escala}</option>`;
    escalaSelect.value = item.escala;

    document.getElementById('edit-modal').classList.remove('hidden');
    toggleRotuloDesc(); // Atualiza visibilidade do campo extra
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

function setupCheckboxGroup(containerId, currentValues, changeCallback) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    const values = currentValues.split(',');
    
    checkboxes.forEach(cb => {
        cb.checked = values.includes(cb.value);
        cb.onchange = changeCallback;
    });
}

function getCheckboxValues(containerId) {
    const container = document.getElementById(containerId);
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    return Array.from(checkboxes).map(cb => cb.value).join(',');
}

function toggleRotuloDesc() {
    const rotulos = getCheckboxValues('edit-rotulo-container');
    const divDesc = document.getElementById('div-rotulo-desc');
    if (rotulos.includes('OUTRO')) divDesc.classList.remove('hidden');
    else divDesc.classList.add('hidden');
}

function salvarEdicao() {
    const id = parseInt(document.getElementById('edit-id').value);
    const item = currentData.find(d => d.id === id);
    const responsavel = SiteAuth.user || 'Admin';
    
    if (item) {
        const before = JSON.parse(JSON.stringify(item));
        const hasNextiAbsence = item._nextiAbsence === true;

        item.nome = document.getElementById('edit-nome').value.toUpperCase();
        item.re = document.getElementById('edit-re').value;
        item.telefone = document.getElementById('edit-telefone').value.replace(/\D/g, ''); // Salva apenas números
        item.posto = document.getElementById('edit-posto').value.toUpperCase();
        item.escala = document.getElementById('edit-escala').value;
        item.turma = parseInt(document.getElementById('edit-turma').value);

        // Rótulos vindos da Nexti não podem ser editados manualmente
        if (!hasNextiAbsence) {
            item.rotulo = getCheckboxValues('edit-rotulo-container');
            item.rotuloInicio = document.getElementById('edit-inicio').value;
            item.rotuloFim = document.getElementById('edit-fim').value;
            item.rotuloDetalhe = document.getElementById('edit-rotulo-desc').value;
        }

        // Salvar edição localmente
        collaboratorEdits[item.re] = { ...item };
        saveLocalState();

        // Registrar histórico
        const after = JSON.parse(JSON.stringify(item));
        const changes = buildColabChanges(before, after);
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: responsavel,
            acao: "Edição de Colaborador",
            detalhe: `Editou ${item.nome} (${item.re})`,
            target: { re: item.re, nome: item.nome },
            changes,
            before,
            after,
            undo: { type: 'edit_colab', before, after }
        });
        saveLocalState();

        // Atualiza a visualização
        if (currentTab === 'busca') {
            const termo = document.getElementById('search-input').value;
            realizarBusca(termo);
        } else {
            renderizarUnidades();
        }
        
        closeEditModal();
        showToast("Colaborador atualizado com sucesso!", "success");
    }
}

// ==========================================================================
// 📌 EDIÇÃO DE UNIDADE
// ==========================================================================

function openEditUnitModal(postoName) {
    if (SiteAuth.mode !== 'edit') return;
    document.getElementById('edit-unit-old-name').value = postoName;
    document.getElementById('edit-unit-new-name').value = postoName;

    // Carregar metadados existentes
    const meta = unitMetadata[postoName] || {};
    
    setupCheckboxGroup('edit-unit-rotulo-container', meta.rotulo || '', toggleUnitRotuloDesc);
    document.getElementById('edit-unit-rotulo-desc').value = meta.detalhe || '';
    toggleUnitRotuloDesc();
    
    // Populate members list
    const membersList = document.getElementById('unit-members-list');
    const members = currentData.filter(d => d.posto === postoName).sort((a,b) => a.nome.localeCompare(b.nome));
    
    membersList.innerHTML = members.map(m => `
        <div class="member-item">
            <label>
                <input type="checkbox" class="bulk-check" value="${m.id}">
                <span class="member-name">${m.nome}</span>
                <span class="member-re">${m.re}</span>
            </label>
        </div>
    `).join('');

    // Populate add-collaborator selects
    populateAddColabSelects(postoName);

    document.getElementById('edit-unit-modal').classList.remove('hidden');
}

function closeEditUnitModal() {
    document.getElementById('edit-unit-modal').classList.add('hidden');
}

function populateAddColabSelects(postoName) {
    const escalasUnicas = [...new Set(currentData.map(d => d.escala).filter(Boolean))].sort();
    const postosUnicos = [...new Set(currentData.map(d => d.posto).filter(Boolean))].sort();

    const horarioSelect = document.getElementById('new-colab-horario');
    if (horarioSelect) {
        horarioSelect.innerHTML = `<option value="">Selecione o horário</option>` +
            escalasUnicas.map(e => `<option value="${e}">${e}</option>`).join('');
    }

    const unidadeSelect = document.getElementById('new-colab-unidade');
    if (unidadeSelect) {
        unidadeSelect.innerHTML = `<option value="">Unidade atual</option>` +
            postosUnicos.map(p => `<option value="${p}">${p}</option>`).join('');
        unidadeSelect.value = postoName || '';
    }
}

function toggleUnitRotuloDesc() {
    const rotulos = getCheckboxValues('edit-unit-rotulo-container');
    const divDesc = document.getElementById('div-unit-rotulo-desc');
    if (rotulos.includes('OUTRO')) divDesc.classList.remove('hidden');
    else divDesc.classList.add('hidden');
}

function salvarEdicaoUnidade() {
    const oldName = document.getElementById('edit-unit-old-name').value;
    const newName = document.getElementById('edit-unit-new-name').value.toUpperCase().trim();
    const rotulo = getCheckboxValues('edit-unit-rotulo-container');
    const detalhe = document.getElementById('edit-unit-rotulo-desc').value;
    const responsavel = SiteAuth.user || 'Admin';
    const metaBefore = unitMetadata[oldName] ? { ...unitMetadata[oldName] } : null;

    // Atualizar chave dos metadados se o nome mudar
    if (newName && newName !== oldName) {
        const affectedIds = currentData.filter(item => item.posto === oldName).map(item => item.id);
        const metaSnapshot = { ...unitMetadata };
        if (unitMetadata[oldName]) {
            unitMetadata[newName] = unitMetadata[oldName];
            delete unitMetadata[oldName];
        }

        // Atualiza colaboradores
        currentData.forEach(item => {
            if (item.posto === oldName) {
                item.posto = newName;
            }
        });
        
        renderizarUnidades();
        showToast("Nome da unidade atualizado!", "success");
        
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: responsavel,
            acao: "Renomear Unidade",
            detalhe: `Renomeou ${oldName} para ${newName}`,
            target: { unidade: newName },
            changes: [{ label: 'Unidade', from: oldName, to: newName }],
            undo: { type: 'rename_unit', oldName, newName, affectedIds, metaSnapshot }
        });
    }

    // Salvar novos metadados
    const targetName = newName || oldName;
    unitMetadata[targetName] = { rotulo, detalhe, responsavel };
    saveLocalState();

    if (!newName || newName === oldName) {
        const metaAfter = unitMetadata[targetName];
        const metaChanges = [];
        if ((metaBefore?.rotulo || '') !== (metaAfter?.rotulo || '')) {
            metaChanges.push({ label: 'Rótulo', from: metaBefore?.rotulo || '—', to: metaAfter?.rotulo || '—' });
        }
        if ((metaBefore?.detalhe || '') !== (metaAfter?.detalhe || '')) {
            metaChanges.push({ label: 'Detalhe', from: metaBefore?.detalhe || '—', to: metaAfter?.detalhe || '—' });
        }
        if (metaChanges.length) {
            changeHistory.unshift({
                data: new Date().toLocaleString(),
                responsavel: responsavel,
                acao: "Atualização de Rótulo",
                detalhe: `Atualizou rótulos da unidade ${targetName}`,
                target: { unidade: targetName },
                changes: metaChanges,
                undo: { type: 'update_unit_labels', unitName: targetName, metaBefore }
            });
            saveLocalState();
        }
    }

    // Histórico de rótulo não é crítico se o nome não mudou, mas podemos logar se quiser
    renderizarUnidades();
    closeEditUnitModal();
}

function executarAcaoEmMassa() {
    const action = document.getElementById('bulk-action-select').value;
    let value = '';
    
    if (action === 'move') {
        value = document.getElementById('bulk-unit-select').value;
    } else if (action === 'scale') {
        value = document.getElementById('bulk-scale-select').value;
    } else {
        value = document.getElementById('bulk-action-value').value.toUpperCase().trim();
    }

    const checkboxes = document.querySelectorAll('.bulk-check:checked');
    
    if (!action || !value || checkboxes.length === 0) {
        showToast("Selecione uma opção válida e escolha colaboradores.", "error");
        return;
    }

    const ids = Array.from(checkboxes).map(cb => parseInt(cb.value));
    
    const beforeItems = currentData.filter(item => ids.includes(item.id)).map(item => ({
        id: item.id,
        posto: item.posto,
        escala: item.escala
    }));

    currentData.forEach(item => {
        if (ids.includes(item.id)) {
            if (action === 'move') item.posto = value;
            if (action === 'scale') item.escala = value;
        }
    });

    showToast(`${checkboxes.length} colaboradores atualizados!`, "success");
    changeHistory.unshift({
        data: new Date().toLocaleString(),
        responsavel: SiteAuth.user || 'Admin',
        acao: "Ação em Massa",
        detalhe: `${checkboxes.length} colaboradores atualizados (${action === 'move' ? 'Unidade' : 'Escala'}: ${value})`,
        undo: { type: 'bulk_update', items: beforeItems, actionLabel: action }
    });
    saveLocalState();
    renderizarUnidades();
    closeEditUnitModal();
}

function removerColaborador() {
    const responsavel = SiteAuth.user || 'Admin';

    const id = parseInt(document.getElementById('edit-id').value);
    if(confirm("Tem certeza que deseja remover este colaborador permanentemente?")) {
        const item = currentData.find(d => d.id === id);
        currentData = currentData.filter(d => d.id !== id);
        closeEditModal();
        if (currentTab === 'busca') {
            realizarBusca();
        } else {
            renderizarUnidades();
        }
        showToast("Colaborador removido.", "success");

        // Log
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: responsavel,
            acao: "Exclusão",
            detalhe: `Removeu ${item ? item.nome : 'Colaborador'} do sistema`,
            target: item ? { re: item.re, nome: item.nome } : null,
            undo: item ? { type: 'remove_colab', item } : null
        });
        saveLocalState();
    }
}

function adicionarColaboradorNaUnidade() {
    const nome = document.getElementById('new-colab-nome').value.toUpperCase().trim();
    const re = document.getElementById('new-colab-re').value.trim();
    const telefone = document.getElementById('new-colab-telefone').value.replace(/\D/g, '');
    const horario = document.getElementById('new-colab-horario').value.trim();
    const turma = parseInt(document.getElementById('new-colab-turma')?.value || '1');
    const postoInput = document.getElementById('new-colab-unidade').value.toUpperCase().trim();
    const posto = postoInput || document.getElementById('edit-unit-old-name').value;

    if(!nome || !re) {
        showToast("Preencha Nome e RE.", "error");
        return;
    }

    const newId = currentData.length > 0 ? Math.max(...currentData.map(d => d.id)) + 1 : 1;
    
    // Tenta herdar o grupo de alguém da mesma unidade
    const existingMember = currentData.find(d => d.posto === posto);
    const grupo = existingMember ? existingMember.grupo : (currentGroup !== 'todos' ? currentGroup : 'bombeiros');
    const tipoEscala = extrairTipoEscala(horario);

    const newItem = {
        id: newId,
        nome: nome,
        re: re,
        posto: posto,
        escala: horario,
        tipoEscala: tipoEscala,
        turma: Number.isFinite(turma) ? turma : 1,
        rotulo: '',
        rotuloInicio: '',
        rotuloFim: '',
        rotuloDetalhe: '',
        grupo: grupo,
        telefone: telefone
    };
    currentData.push(newItem);

    document.getElementById('new-colab-nome').value = '';
    document.getElementById('new-colab-re').value = '';
    document.getElementById('new-colab-telefone').value = '';
    document.getElementById('new-colab-horario').value = '';
    document.getElementById('new-colab-turma').value = '1';
    document.getElementById('new-colab-unidade').value = '';
    
    // Atualiza a lista no modal e no fundo
    renderizarUnidades();
    
    // Atualiza lista do modal manualmente para não fechar
    const membersList = document.getElementById('unit-members-list');
    const members = currentData.filter(d => d.posto === posto).sort((a,b) => a.nome.localeCompare(b.nome));
    membersList.innerHTML = members.map(m => `
        <div class="member-item">
            <label>
                <input type="checkbox" class="bulk-check" value="${m.id}">
                <span class="member-name">${m.nome}</span>
                <span class="member-re">${m.re}</span>
            </label>
        </div>
    `).join('');
    
    showToast("Colaborador adicionado!", "success");

    changeHistory.unshift({
        data: new Date().toLocaleString(),
        responsavel: "Sistema (Adição Rápida)",
        acao: "Adição",
        detalhe: `Adicionou ${nome} em ${posto}`,
        target: { re, nome },
        undo: { type: 'add_colab', item: newItem }
    });
    saveLocalState();
}

function scrollToTop() {
    window.scrollTo({top: 0, behavior: 'smooth'});
}

function toggleUtilityButtons() {
    document.body.classList.toggle('utility-open');
}


// ==========================================================================
// 📌 UTILITÁRIOS GERAIS
// ==========================================================================

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${message}</span>`;
    
    container.appendChild(toast);

    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function exportarDadosExcel() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }

    // Preparar dados para o Excel
    const dadosFormatados = currentData.map(item => {
        const status = getStatusInfo(item);
        return {
            "Nome": item.nome,
            "RE": item.re,
            "Unidade": item.posto,
            "Escala": item.escala,
            "Turma": item.turma === 1 ? "Ímpar" : "Par",
            "Status": status.text,
            "Rótulo": item.rotulo || "",
            "Detalhe Rótulo": item.rotuloDetalhe || "",
            "Início Afastamento": item.rotuloInicio ? formatDate(item.rotuloInicio) : "",
            "Fim Afastamento": item.rotuloFim ? formatDate(item.rotuloFim) : ""
        };
    });

    // Criar Worksheet
    const ws = XLSX.utils.json_to_sheet(dadosFormatados);
    
    // Ajustar largura das colunas
    const wscols = [{wch: 30}, {wch: 10}, {wch: 20}, {wch: 15}, {wch: 10}, {wch: 15}, {wch: 15}, {wch: 20}, {wch: 15}, {wch: 15}];
    ws['!cols'] = wscols;

    // Criar Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Efetivo");

    // Exportar arquivo
    XLSX.writeFile(wb, `efetivo_dunamis_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Excel gerado com sucesso!", "success");
}

function exportarDadosCSV() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }

    const headers = ["Nome", "RE", "Posto", "Escala", "Turma", "Status", "Rótulo"];
    const rows = currentData.map(item => [
        `"${item.nome}"`,
        `"${item.re}"`,
        `"${item.posto}"`,
        `"${item.escala}"`,
        item.turma,
        getStatusInfo(item).text,
        item.rotulo || ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `efetivo_dunamis_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast("Download iniciado!", "success");
}

// ==========================================================================
// 📌 HISTÓRICO
// ==========================================================================

function openHistoryModal() {
    const list = document.getElementById('history-list');
    const actions = document.getElementById('history-actions');
    if (actions) {
        const canUndo = changeHistory.length > 0 && !!changeHistory[0]?.undo;
        actions.innerHTML = `
            <button class="btn btn-secondary btn-small" onclick="undoLastChange()" ${canUndo ? '' : 'disabled'}>
                Desfazer última alteração
            </button>
        `;
    }
    if (changeHistory.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhuma alteração registrada nesta sessão.</p>';
    } else {
        list.innerHTML = changeHistory.map(h => renderHistoryEntry(h)).join('');
    }
    document.getElementById('history-modal').classList.remove('hidden');
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
}

function renderHistoryEntry(h) {
    const meta = `${h.data || ''} • <strong>${h.responsavel || 'N/I'}</strong>`;
    const detail = h.detalhe ? `<div class="history-detail">${h.detalhe}</div>` : '';
    const changes = Array.isArray(h.changes) && h.changes.length
        ? `<ul class="history-changes">${h.changes.map(c => `
                <li><strong>${c.label}:</strong> ${c.from} → ${c.to}</li>
            `).join('')}</ul>`
        : '';
    return `
        <div class="history-entry">
            <div class="history-meta">${meta}</div>
            <div class="history-title">${h.acao || 'Alteração'}</div>
            ${detail}
            ${changes}
        </div>
    `;
}

function formatChangeValue(value) {
    if (value === undefined || value === null || value === '') return '—';
    if (Array.isArray(value)) return value.join(', ');
    return String(value);
}

function formatPhoneNumber(phone) {
    if (!phone) return '';
    const clean = phone.replace(/\D/g, '');
    if (clean.length === 11) return clean.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
    if (clean.length === 10) return clean.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
    return clean;
}

function buildColabChanges(before, after) {
    const fields = [
        { key: 'nome', label: 'Nome' },
        { key: 're', label: 'RE' },
        { key: 'telefone', label: 'Telefone', format: formatPhoneNumber },
        { key: 'posto', label: 'Unidade' },
        { key: 'escala', label: 'Horário' },
        { key: 'turma', label: 'Turma' },
        { key: 'rotulo', label: 'Rótulo' },
        { key: 'rotuloDetalhe', label: 'Detalhe do Rótulo' },
        { key: 'rotuloInicio', label: 'Início Afastamento' },
        { key: 'rotuloFim', label: 'Fim Afastamento' }
    ];
    const changes = [];
    fields.forEach(f => {
        const fromRaw = before?.[f.key];
        const toRaw = after?.[f.key];
        const fromVal = f.format ? f.format(fromRaw) : formatChangeValue(fromRaw);
        const toVal = f.format ? f.format(toRaw) : formatChangeValue(toRaw);
        if (fromVal !== toVal) {
            changes.push({ key: f.key, label: f.label, from: fromVal, to: toVal });
        }
    });
    return changes;
}

function undoLastChange() {
    if (!changeHistory.length || !changeHistory[0]?.undo) {
        showToast("Nenhuma alteração para desfazer.", "info");
        return;
    }
    if (!confirm("Deseja desfazer a última alteração registrada?")) return;
    const undo = changeHistory[0].undo;

    if (undo.type === 'edit_colab') {
        const before = undo.before;
        const after = undo.after;
        const idx = currentData.findIndex(d => d.id === before.id);
        if (idx >= 0) currentData[idx] = { ...before };
        if (after?.re && after.re !== before.re) delete collaboratorEdits[after.re];
        collaboratorEdits[before.re] = { ...before };
        saveLocalState();
        renderizarUnidades();
        if (currentTab === 'busca') realizarBusca(document.getElementById('search-input')?.value || '');
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu edição de ${before.nome} (${before.re})`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Última edição desfeita.", "success");
        return;
    }

    if (undo.type === 'remove_colab') {
        const item = undo.item;
        if (!currentData.find(d => d.id === item.id)) currentData.push({ ...item });
        collaboratorEdits[item.re] = { ...item };
        saveLocalState();
        renderizarUnidades();
        if (currentTab === 'busca') realizarBusca(document.getElementById('search-input')?.value || '');
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu exclusão de ${item.nome} (${item.re})`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Exclusão desfeita.", "success");
        return;
    }

    if (undo.type === 'add_colab') {
        const item = undo.item;
        currentData = currentData.filter(d => d.id !== item.id);
        delete collaboratorEdits[item.re];
        saveLocalState();
        renderizarUnidades();
        if (currentTab === 'busca') realizarBusca(document.getElementById('search-input')?.value || '');
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu adição de ${item.nome} (${item.re})`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Adição desfeita.", "success");
        return;
    }

    if (undo.type === 'rename_unit') {
        const { oldName, newName, affectedIds, metaSnapshot } = undo;
        currentData.forEach(item => {
            if (affectedIds.includes(item.id)) item.posto = oldName;
        });
        unitMetadata = { ...metaSnapshot };
        saveLocalState();
        renderizarUnidades();
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu renomeação da unidade ${newName} para ${oldName}`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Renomeação desfeita.", "success");
        return;
    }

    if (undo.type === 'update_unit_labels') {
        const { unitName, metaBefore } = undo;
        if (metaBefore) unitMetadata[unitName] = metaBefore;
        saveLocalState();
        renderizarUnidades();
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu rótulo da unidade ${unitName}`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Rótulo desfeito.", "success");
        return;
    }

    if (undo.type === 'bulk_update') {
        undo.items.forEach(prev => {
            const item = currentData.find(d => d.id === prev.id);
            if (!item) return;
            item.posto = prev.posto;
            item.escala = prev.escala;
        });
        saveLocalState();
        renderizarUnidades();
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: SiteAuth.user || 'Admin',
            acao: "Desfazer",
            detalhe: `Reverteu ação em massa (${undo.actionLabel || 'atualização'})`
        });
        saveLocalState();
        openHistoryModal();
        showToast("Ação em massa desfeita.", "success");
        return;
    }

    showToast("Não foi possível desfazer esta alteração.", "error");
}

// ==========================================================================
// 📌 AVISOS
// ==========================================================================

function openAvisosTab() {
    if (!SiteAuth.logged) {
        showToast("Faça login para acessar os avisos.", "error");
        return;
    }
    if (!appContainer || appContainer.style.display === 'none') return;
    closeAvisosMini();
    switchTab('avisos');
}

function updateAvisosUI() {
    const bell = document.getElementById('avisos-bell');
    const badge = document.getElementById('avisos-badge');
    const tabBadge = document.getElementById('avisos-tab-badge');
    const pendingCount = getAvisosPendingCount(currentGroup);
    const alertCount = getAvisosAlertCount(currentGroup);

    if (bell) {
        bell.classList.toggle('hidden', !SiteAuth.logged);
        bell.classList.toggle('has-pending', alertCount > 0);
    }
    if (badge) {
        if (alertCount > 0) {
            badge.textContent = alertCount;
            badge.classList.remove('hidden');
        } else {
            badge.classList.add('hidden');
        }
    }
    if (tabBadge) {
        if (alertCount > 0) {
            tabBadge.textContent = alertCount;
            tabBadge.classList.remove('hidden');
        } else {
            tabBadge.classList.add('hidden');
        }
    }
    renderAvisosMini();
}

function updateLancamentosUI() {
    if (currentTab === 'lancamentos') {
        renderLancamentos();
    }
}

function getAvisosPendingCount(groupKey) {
    const items = getAvisosByGroup(groupKey).filter(a => a.status === 'pending');
    return items.length;
}

function getAvisosAlertCount(groupKey) {
    if (!SiteAuth.logged || !SiteAuth.re) return 0;
    const items = getAvisosByGroup(groupKey)
        .filter(a => a.status === 'pending' && a.assignedToRe === SiteAuth.re);
    return items.length;
}

function getAvisosByGroup(groupKey) {
    let base = avisos;
    if (groupKey && groupKey !== 'todos' && groupKey !== 'all') {
        base = base.filter(a => a.group === groupKey);
    }
    return filterAvisosByVisibility(base);
}

function getPendingAvisosByUnit(unitName, groupKey) {
    return getAvisosByGroup(groupKey)
        .filter(a => a.unit === unitName && a.status === 'pending')
        .length;
}

function getPendingAvisosByCollaborator(re, groupKey) {
    return getAvisosByGroup(groupKey)
        .filter(a => a.collabRe === re && a.status === 'pending')
        .length;
}

function getPendingRemindersByUnit(unitName, groupKey) {
    return getAvisosByGroup(groupKey)
        .filter(a => a.unit === unitName && a.status === 'pending' && a.reminderEnabled)
        .length;
}

function getPendingRemindersByCollaborator(re, groupKey) {
    return getAvisosByGroup(groupKey)
        .filter(a => a.collabRe === re && a.status === 'pending' && a.reminderEnabled)
        .length;
}

function getPendingByAssignee(re) {
    return avisos.filter(a => a.assignedToRe === re && a.status === 'pending').length;
}

function initAvisosFilters() {
    const unitFilter = document.getElementById('aviso-unit-filter');
    const groupFilter = document.getElementById('aviso-group-filter');
    const assigneeFilter = document.getElementById('aviso-assignee-filter');
    if (groupFilter) {
        if (!isAdminRole()) {
            const userGroup = getUserGroupKey();
            if (userGroup && userGroup !== 'todos') groupFilter.value = userGroup;
            groupFilter.disabled = true;
        } else if (currentGroup !== 'todos') {
            groupFilter.value = currentGroup;
        }
    }
    if (unitFilter) {
        unitFilter.innerHTML = `<option value="all">Todas as Unidades</option>`;
    }
    updateAvisoAssigneeFilter();
    refreshAvisoUnitFilterOptions();
    updateAvisoAssignees();
}

function updateAvisoAssigneeFilter() {
    const assigneeFilter = document.getElementById('aviso-assignee-filter');
    if (!assigneeFilter) return;
    if (!isAdminRole() && SiteAuth.re) {
        assigneeFilter.innerHTML = `<option value="${SiteAuth.re}">Somente meus</option>`;
        assigneeFilter.value = SiteAuth.re;
        assigneeFilter.disabled = true;
        return;
    }
    assigneeFilter.disabled = false;
    assigneeFilter.innerHTML = `<option value="all">Todos os responsáveis</option>` +
        SiteAuth.admins.map(a => `<option value="${a.re}">${a.name}</option>`).join('');
}

function refreshAvisoUnitFilterOptions() {
    const unitFilter = document.getElementById('aviso-unit-filter');
    if (!unitFilter) return;
    const groupFilter = document.getElementById('aviso-group-filter')?.value || currentGroup || 'todos';
    const units = [...new Set(currentData
        .filter(d => groupFilter === 'todos' || groupFilter === 'all' || d.grupo === groupFilter)
        .map(d => d.posto)
        .filter(Boolean))].sort();
    unitFilter.innerHTML = `<option value="all">Todas as Unidades</option>` + units.map(u => `<option value="${u}">${u}</option>`).join('');
}

function renderAvisoCard(a) {
    return `
        <div class="aviso-card ${a.status === 'pending' ? 'pending' : 'done'} ${isAvisoOverdue(a) ? 'overdue' : ''}" data-aviso-id="${a.id}">
            <div class="aviso-meta">
                <span class="aviso-priority ${a.priority}">${a.priority.toUpperCase()}</span>
                <span>${formatAvisoDate(a.createdAt)}</span>
                <span>${a.group?.toUpperCase() || 'GERAL'}</span>
            </div>
            <div class="aviso-scope">
                ${a.unit ? `<strong>Unidade:</strong> ${a.unit}` : ''}
                ${a.collabName ? `<span> • <strong>Colaborador:</strong> ${a.collabName} (${a.collabRe})</span>` : ''}
            </div>
            <div class="aviso-flags">
                ${a.simple ? `<span class="aviso-flag simple">Mensagem</span>` : ''}
                ${a.collabRe ? `<span class="aviso-flag">Colaborador</span>` : ''}
                ${a.reminderEnabled ? `<span class="aviso-flag reminder">Lembrete</span>` : ''}
                ${a.assignedToName ? `<span class="aviso-flag assigned">Destinado: ${a.assignedToName}</span>` : ''}
            </div>
            <div class="aviso-title">${a.title || 'Aviso'}</div>
            ${a.reminderEnabled && a.reminderNextAt ? `<div class="aviso-reminder-meta">Lembrete: ${formatAvisoDate(a.reminderNextAt)}</div>` : ''}
            <div class="aviso-message">${a.message}</div>
            <div class="aviso-footer">
                <span>Por ${a.createdBy || 'Sistema'}</span>
                <div class="aviso-actions">
                    ${a.reminderEnabled ? `
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${a.id}', 30)">+30m</button>
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${a.id}', 120)">+2h</button>
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${a.id}', 1440)">+1d</button>
                    ` : ''}
                    <select class="aviso-status-select" onchange="setAvisoStatus('${a.id}', this.value)">
                        <option value="pending" ${a.status === 'pending' ? 'selected' : ''}>Pendente</option>
                        <option value="done" ${a.status === 'done' ? 'selected' : ''}>Concluído</option>
                    </select>
                </div>
            </div>
            <div class="aviso-timeline">
                <span>Criado: ${formatAvisoDate(a.createdAt)}</span>
                ${a.status === 'done' && a.doneAt ? `<span>• Concluído: ${formatAvisoDate(a.doneAt)} (${a.doneBy || 'Sistema'})</span>` : ''}
            </div>
        </div>
    `;
}

function renderAvisos() {
    const list = document.getElementById('avisos-list');
    const summary = document.getElementById('avisos-assignee-summary');
    if (!list) return;
    if (!SiteAuth.logged) {
        list.innerHTML = `<p class="empty-state">Faça login para ver os avisos.</p>`;
        if (summary) summary.textContent = '';
        return;
    }
    refreshAvisoUnitFilterOptions();

    const groupFilter = document.getElementById('aviso-group-filter')?.value || currentGroup || 'todos';
    const statusFilter = document.getElementById('aviso-status-filter')?.value || 'pending';
    const assigneeFilter = document.getElementById('aviso-assignee-filter')?.value || 'all';
    const priorityFilter = document.getElementById('aviso-priority-filter')?.value || 'all';
    const unitFilter = document.getElementById('aviso-unit-filter')?.value || 'all';

    let items = getAvisosByGroup(groupFilter === 'all' ? 'todos' : groupFilter);
    if (statusFilter !== 'all') items = items.filter(a => a.status === statusFilter);
    if (assigneeFilter !== 'all') items = items.filter(a => a.assignedToRe === assigneeFilter);
    if (priorityFilter !== 'all') items = items.filter(a => a.priority === priorityFilter);
    if (unitFilter !== 'all') items = items.filter(a => a.unit === unitFilter);

    if (summary && SiteAuth.re) {
        const mine = getPendingByAssignee(SiteAuth.re);
        summary.textContent = mine ? `Pendências comigo: ${mine}` : '';
    }

    if (!items.length) {
        list.innerHTML = `<p class="empty-state">Nenhum aviso encontrado.</p>`;
        return;
    }

    const sorted = items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (statusFilter === 'all') {
        const pendingItems = sorted.filter(a => a.status === 'pending');
        const doneItems = sorted.filter(a => a.status !== 'pending');
        list.innerHTML = `
            <div class="avisos-section">
                <div class="avisos-section-title">Pendentes (${pendingItems.length})</div>
                <div class="avisos-section-body">
                    ${pendingItems.length ? pendingItems.map(renderAvisoCard).join('') : `<p class="empty-state">Nenhum aviso pendente.</p>`}
                </div>
            </div>
            <div class="avisos-section">
                <div class="avisos-section-title">Concluídos (${doneItems.length})</div>
                <div class="avisos-section-body">
                    ${doneItems.length ? doneItems.map(renderAvisoCard).join('') : `<p class="empty-state">Nenhum aviso concluído.</p>`}
                </div>
            </div>
        `;
        return;
    }
    list.innerHTML = sorted.map(renderAvisoCard).join('');
}

function isAvisoOverdue(aviso) {
    if (aviso.status !== 'pending') return false;
    if (aviso.reminderEnabled && aviso.reminderNextAt) {
        const nextAt = new Date(aviso.reminderNextAt).getTime();
        if (nextAt && Date.now() > nextAt) return true;
    }
    if (aviso.priority !== 'urgente') return false;
    const createdAt = new Date(aviso.createdAt).getTime();
    if (!createdAt) return false;
    const diffHours = (Date.now() - createdAt) / 36e5;
    return diffHours >= 2;
}

function formatAvisoDate(value) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value || '';
    }
}

function formatDateOnly(value) {
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value || '';
    }
}

function openAvisoForm() {
    if (!isAdminRole()) {
        showToast("Apenas admins podem criar avisos.", "error");
        return;
    }
    const form = document.getElementById('aviso-form');
    if (!form) return;
    form.classList.remove('hidden');
    document.getElementById('lembrete-form')?.classList.add('hidden');
    hydrateAvisoForm();
}

function closeAvisoForm() {
    const form = document.getElementById('aviso-form');
    if (!form) return;
    form.classList.add('hidden');
}

function openLembreteForm() {
    if (!SiteAuth.logged) {
        showToast("Faça login para criar lembretes.", "error");
        return;
    }
    const form = document.getElementById('lembrete-form');
    if (!form) return;
    form.classList.remove('hidden');
    document.getElementById('aviso-form')?.classList.add('hidden');
    hydrateLembreteForm();
    updateLembreteScope();
}

function closeLembreteForm() {
    const form = document.getElementById('lembrete-form');
    if (!form) return;
    form.classList.add('hidden');
}

function hydrateAvisoForm() {
    const groupSelect = document.getElementById('aviso-group-select');
    const unitSelect = document.getElementById('aviso-unit-select');
    const collabSelect = document.getElementById('aviso-collab-select');
    const assigneeSelect = document.getElementById('aviso-assignee-select');

    if (groupSelect) {
        if (isAdminRole()) {
            groupSelect.innerHTML = `
                <option value="bombeiros">Bombeiros</option>
                <option value="servicos">Serviços</option>
                <option value="seguranca">Segurança</option>
                <option value="rb">RB Facilities</option>
            `;
        } else {
            const userGroup = getUserGroupKey();
            groupSelect.innerHTML = `<option value="${userGroup}">${userGroup.toUpperCase()}</option>`;
        }
        groupSelect.disabled = !isAdminRole();
    }

    const groupValue = groupSelect?.value || currentGroup;
    const units = [...new Set(currentData.filter(d => d.grupo === groupValue).map(d => d.posto).filter(Boolean))].sort();
    if (unitSelect) {
        unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    }

    const collabs = currentData.filter(d => d.grupo === groupValue).sort((a,b) => a.nome.localeCompare(b.nome));
    if (collabSelect) {
        collabSelect.innerHTML = collabs.map(c => `<option value="${c.re}" data-search="${c.nome} ${c.re}">${c.nome} (${c.re})</option>`).join('');
    }

    if (assigneeSelect) {
        assigneeSelect.innerHTML = SiteAuth.admins.map(a => `
            <option value="${a.re}">${a.name} (${a.role === 'supervisor' ? 'Supervisor' : 'Admin'})</option>
        `).join('');
        if (SiteAuth.re) assigneeSelect.value = SiteAuth.re;
        assigneeSelect.disabled = !isAdminRole();
    }
    updateAvisoType();
}

function updateAvisoScope() {
    const scope = document.getElementById('aviso-scope-select')?.value || 'unit';
    const collabGroup = document.getElementById('aviso-collab-group');
    if (!collabGroup) return;
    collabGroup.classList.toggle('hidden', scope !== 'collab');
    if (scope === 'collab') syncAvisoUnitWithCollab();
}

function updateAvisoType() {
    const type = document.getElementById('aviso-type')?.value || 'full';
    const advancedBlocks = document.querySelectorAll('.aviso-advanced');
    advancedBlocks.forEach(el => {
        if (type === 'simple') {
            el.classList.add('hidden');
        } else if (el.id !== 'aviso-collab-group') {
            el.classList.remove('hidden');
        }
    });
    if (type === 'simple') {
        const scope = document.getElementById('aviso-scope-select');
        if (scope) scope.value = 'unit';
    }
    if (type !== 'simple') updateAvisoScope();
}

function updateAvisoAssignees() {
    const select = document.getElementById('aviso-assignee-select');
    if (!select) return;
    select.innerHTML = SiteAuth.admins.map(a => `
        <option value="${a.re}">${a.name} (${a.role === 'supervisor' ? 'Supervisor' : 'Admin'})</option>
    `).join('');
    if (SiteAuth.re) select.value = SiteAuth.re;
    select.disabled = !isAdminRole();
}

function hydrateLembreteForm() {
    const groupSelect = document.getElementById('reminder-group-select');
    const unitSelect = document.getElementById('reminder-unit-select');
    const collabSelect = document.getElementById('reminder-collab-select');
    const assigneeSelect = document.getElementById('reminder-assignee-select');

    if (groupSelect) {
        if (isAdminRole()) {
            groupSelect.innerHTML = `
                <option value="bombeiros">Bombeiros</option>
                <option value="servicos">Serviços</option>
                <option value="seguranca">Segurança</option>
                <option value="rb">RB Facilities</option>
            `;
        } else {
            const userGroup = getUserGroupKey();
            groupSelect.innerHTML = `<option value="${userGroup}">${userGroup.toUpperCase()}</option>`;
        }
        groupSelect.disabled = !isAdminRole();
    }

    const groupValue = groupSelect?.value || currentGroup;
    const units = [...new Set(currentData.filter(d => d.grupo === groupValue).map(d => d.posto).filter(Boolean))].sort();
    if (unitSelect) {
        unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    }

    const collabs = currentData.filter(d => d.grupo === groupValue).sort((a,b) => a.nome.localeCompare(b.nome));
    if (collabSelect) {
        collabSelect.innerHTML = collabs.map(c => `<option value="${c.re}" data-search="${c.nome} ${c.re}">${c.nome} (${c.re})</option>`).join('');
    }

    if (assigneeSelect) {
        assigneeSelect.innerHTML = SiteAuth.admins.map(a => `
            <option value="${a.re}">${a.name} (${a.role === 'supervisor' ? 'Supervisor' : 'Admin'})</option>
        `).join('');
        if (SiteAuth.re) assigneeSelect.value = SiteAuth.re;
        assigneeSelect.disabled = !isAdminRole();
    }
}

function filterAvisoCollabs() {
    const input = document.getElementById('aviso-collab-search');
    const select = document.getElementById('aviso-collab-select');
    const scopeSelect = document.getElementById('aviso-scope-select');
    if (!input || !select) return;
    const term = input.value.trim().toUpperCase();
    if (term && scopeSelect && scopeSelect.value !== 'collab') {
        scopeSelect.value = 'collab';
        updateAvisoScope();
    }
    const options = Array.from(select.options);
    let firstMatch = null;
    options.forEach(opt => {
        const hay = (opt.getAttribute('data-search') || '').toUpperCase();
        const match = !term || hay.includes(term);
        opt.hidden = !match;
        if (match && !firstMatch) firstMatch = opt;
        if (term && hay.startsWith(term)) firstMatch = opt;
    });
    if (firstMatch) select.value = firstMatch.value;
    syncAvisoUnitWithCollab();
}

function updateLembreteScope() {
    const scope = document.getElementById('reminder-scope-select')?.value || 'unit';
    const collabGroup = document.getElementById('reminder-collab-group');
    if (!collabGroup) return;
    collabGroup.classList.toggle('hidden', scope !== 'collab');
    if (scope === 'collab') syncLembreteUnitWithCollab();
}

function filterLembreteCollabs() {
    const input = document.getElementById('reminder-collab-search');
    const select = document.getElementById('reminder-collab-select');
    const scopeSelect = document.getElementById('reminder-scope-select');
    if (!input || !select) return;
    const term = input.value.trim().toUpperCase();
    if (term && scopeSelect && scopeSelect.value !== 'collab') {
        scopeSelect.value = 'collab';
        updateLembreteScope();
    }
    const options = Array.from(select.options);
    let firstMatch = null;
    options.forEach(opt => {
        const hay = (opt.getAttribute('data-search') || '').toUpperCase();
        const match = !term || hay.includes(term);
        opt.hidden = !match;
        if (match && !firstMatch) firstMatch = opt;
        if (term && hay.startsWith(term)) firstMatch = opt;
    });
    if (firstMatch) select.value = firstMatch.value;
    syncLembreteUnitWithCollab();
}

function syncAvisoUnitWithCollab() {
    const collabSelect = document.getElementById('aviso-collab-select');
    const unitSelect = document.getElementById('aviso-unit-select');
    if (!collabSelect || !unitSelect) return;
    const collab = currentData.find(c => c.re === collabSelect.value);
    if (collab?.posto) unitSelect.value = collab.posto;
}

function syncLembreteUnitWithCollab() {
    const collabSelect = document.getElementById('reminder-collab-select');
    const unitSelect = document.getElementById('reminder-unit-select');
    if (!collabSelect || !unitSelect) return;
    const collab = currentData.find(c => c.re === collabSelect.value);
    if (collab?.posto) unitSelect.value = collab.posto;
}

function createAviso() {
    if (!(SiteAuth.logged)) {
        showToast("Faça login para criar avisos.", "error");
        return;
    }
    if (!isAdminRole()) {
        showToast("Apenas admins podem criar avisos.", "error");
        return;
    }
    const avisoType = document.getElementById('aviso-type')?.value || 'full';
    const assigneeRe = document.getElementById('aviso-assignee-select')?.value || '';
    const assignee = SiteAuth.admins.find(a => a.re === assigneeRe);
    const group = avisoType === 'simple'
        ? (currentGroup || 'todos')
        : (document.getElementById('aviso-group-select')?.value || currentGroup);
    const scope = avisoType === 'simple'
        ? 'unit'
        : (document.getElementById('aviso-scope-select')?.value || 'unit');
    const unit = avisoType === 'simple'
        ? ''
        : (document.getElementById('aviso-unit-select')?.value || '');
    const collabRe = avisoType === 'simple'
        ? ''
        : (document.getElementById('aviso-collab-select')?.value || '');
    const collab = currentData.find(c => c.re === collabRe);
    const priority = avisoType === 'simple'
        ? 'normal'
        : (document.getElementById('aviso-priority-select')?.value || 'normal');
    const title = document.getElementById('aviso-title')?.value.trim();
    const message = document.getElementById('aviso-message')?.value.trim();
    const reminderEnabled = false;
    const reminderAt = '';
    const reminderType = 'single';
    const reminderEvery = 'daily';

    if (!message) {
        showToast("Digite a mensagem do aviso.", "error");
        return;
    }

    const item = {
        id: `av-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        group,
        unit,
        collabRe: scope === 'collab' ? collabRe : '',
        collabName: scope === 'collab' ? (collab?.nome || '') : '',
        assignedToRe: assignee?.re || '',
        assignedToName: assignee?.name || '',
        priority,
        title,
        message,
        simple: avisoType === 'simple',
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: SiteAuth.user || 'Sistema',
        reminderEnabled: reminderEnabled,
        reminderType: reminderType,
        reminderEvery: reminderEvery,
        reminderNextAt: reminderEnabled ? (reminderAt || new Date().toISOString()) : null
    };

    avisos.unshift(item);
    avisosSeenIds.add(item.id);
    saveAvisos();
    renderAvisos();
    flashAvisoCard(item.id);
    closeAvisoForm();
    showToast("Aviso registrado.", "success");
    playAvisoSound(priority);
}

function createReminder() {
    if (!(SiteAuth.logged)) {
        showToast("Faça login para criar lembretes.", "error");
        return;
    }
    const assigneeReRaw = document.getElementById('reminder-assignee-select')?.value || '';
    const assigneeRe = isAdminRole() ? assigneeReRaw : (SiteAuth.re || assigneeReRaw);
    if (!assigneeRe) {
        showToast("Selecione um responsável.", "error");
        return;
    }
    const assignee = SiteAuth.admins.find(a => a.re === assigneeRe);
    const group = document.getElementById('reminder-group-select')?.value || currentGroup;
    const scope = document.getElementById('reminder-scope-select')?.value || 'unit';
    const unit = document.getElementById('reminder-unit-select')?.value || '';
    const collabRe = document.getElementById('reminder-collab-select')?.value || '';
    const collab = currentData.find(c => c.re === collabRe);
    const priority = document.getElementById('reminder-priority-select')?.value || 'normal';
    const title = document.getElementById('reminder-title')?.value.trim();
    const message = document.getElementById('reminder-message')?.value.trim();
    const reminderAt = document.getElementById('reminder-at')?.value || '';
    const reminderType = document.getElementById('reminder-type')?.value || 'single';
    const reminderEvery = document.getElementById('reminder-every')?.value || 'daily';

    if (!message) {
        showToast("Digite a mensagem do lembrete.", "error");
        return;
    }
    if (scope === 'collab' && !collabRe) {
        showToast("Selecione o colaborador do lembrete.", "error");
        return;
    }
    if (scope === 'unit' && !unit) {
        showToast("Selecione a unidade do lembrete.", "error");
        return;
    }

    const item = {
        id: `av-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        group,
        unit,
        collabRe: scope === 'collab' ? collabRe : '',
        collabName: scope === 'collab' ? (collab?.nome || '') : '',
        assignedToRe: assignee?.re || '',
        assignedToName: assignee?.name || '',
        priority,
        title,
        message,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: SiteAuth.user || 'Sistema',
        reminderEnabled: true,
        reminderType: reminderType,
        reminderEvery: reminderEvery,
        reminderNextAt: reminderAt || new Date().toISOString()
    };

    avisos.unshift(item);
    avisosSeenIds.add(item.id);
    saveAvisos();
    renderAvisos();
    flashAvisoCard(item.id);
    closeLembreteForm();
    showToast("Lembrete registrado.", "success");
    playAvisoSound(priority);
}

function toggleAvisoStatus(id) {
    const item = avisos.find(a => a.id === id);
    if (!item) return;
    const next = item.status === 'pending' ? 'done' : 'pending';
    setAvisoStatus(id, next);
}

function setAvisoStatus(id, status) {
    const item = avisos.find(a => a.id === id);
    if (!item) return;
    item.status = status === 'done' ? 'done' : 'pending';
    item.doneAt = item.status === 'done' ? new Date().toISOString() : null;
    item.doneBy = item.status === 'done' ? (SiteAuth.user || 'Admin') : null;
    if (item.status === 'done') {
        item.reminderNextAt = null;
    }
    saveAvisos();
    renderAvisos();
    flashAvisoCard(item.id);
}

function snoozeAviso(id, minutes) {
    const item = avisos.find(a => a.id === id);
    if (!item) return;
    const base = item.reminderNextAt ? new Date(item.reminderNextAt) : new Date();
    const next = new Date(base.getTime() + minutes * 60000);
    item.reminderEnabled = true;
    item.reminderNextAt = next.toISOString();
    saveAvisos();
    renderAvisos();
    showToast("Lembrete adiado.", "success");
}

function sendAvisoWhatsapp() {
    const title = document.getElementById('aviso-title')?.value.trim();
    const message = document.getElementById('aviso-message')?.value.trim();
    if (!message) {
        showToast("Digite a mensagem do aviso.", "error");
        return;
    }
    const text = [title, message].filter(Boolean).join(' - ');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function sendReminderWhatsapp() {
    const title = document.getElementById('reminder-title')?.value.trim();
    const message = document.getElementById('reminder-message')?.value.trim();
    if (!message) {
        showToast("Digite a mensagem do lembrete.", "error");
        return;
    }
    const text = [title, message].filter(Boolean).join(' - ');
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
}

function toggleAvisosMini() {
    const box = document.getElementById('avisos-mini');
    if (!box) return;
    box.classList.toggle('hidden');
    renderAvisosMini();
}

function closeAvisosMini() {
    document.getElementById('avisos-mini')?.classList.add('hidden');
}

function renderAvisosMini() {
    const list = document.getElementById('avisos-mini-list');
    if (!list) return;
    if (!SiteAuth.logged) {
        list.innerHTML = `<div class="avisos-mini-empty">Faça login para ver avisos.</div>`;
        return;
    }
    const groupKey = currentGroup || 'todos';
    let items = getAvisosByGroup(groupKey).filter(a => a.status === 'pending');
    if (SiteAuth.re) {
        items = items.filter(a => a.assignedToRe === SiteAuth.re);
    }
    items = items
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5);
    if (!items.length) {
        list.innerHTML = `<div class="avisos-mini-empty">Sem pendências.</div>`;
        return;
    }
    list.innerHTML = items.map(a => `
        <div class="avisos-mini-item ${isAvisoOverdue(a) ? 'overdue' : ''}">
            <div class="mini-title">${a.title || 'Aviso'}</div>
            <div class="mini-meta">${a.unit || 'Geral'} • ${formatAvisoDate(a.createdAt)}${a.assignedToName ? ` • ${a.assignedToName}` : ''}</div>
        </div>
    `).join('');
}

function exportarAvisosMensal() {
    const groupFilter = document.getElementById('aviso-group-filter')?.value || currentGroup || 'todos';
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    const items = getAvisosByGroup(groupFilter === 'all' ? 'todos' : groupFilter)
        .filter(a => {
            const dt = new Date(a.createdAt);
            return dt.getMonth() === month && dt.getFullYear() === year;
        });

    if (!items.length) {
        showToast("Nenhum aviso no mês atual.", "info");
        return;
    }

    const byUnit = {};
    items.forEach(a => {
        const key = a.unit || 'Geral';
        if (!byUnit[key]) byUnit[key] = { Unidade: key, Total: 0, Pendentes: 0, Urgentes: 0 };
        byUnit[key].Total += 1;
        if (a.status === 'pending') byUnit[key].Pendentes += 1;
        if (a.priority === 'urgente') byUnit[key].Urgentes += 1;
    });

    const rows = Object.values(byUnit).sort((a,b) => b.Total - a.Total);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Avisos por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(items), "Avisos Detalhados");
    const tag = `${year}-${String(month + 1).padStart(2, '0')}`;
    XLSX.writeFile(wb, `avisos_${tag}.xlsx`);
    showToast("Relatório mensal de avisos gerado.", "success");
}

function openAvisosForUnit(unitName) {
    switchTab('avisos');
    const unitFilter = document.getElementById('aviso-unit-filter');
    const groupFilter = document.getElementById('aviso-group-filter');
    if (unitFilter) unitFilter.value = unitName;
    if (groupFilter && currentGroup && currentGroup !== 'todos') groupFilter.value = currentGroup;
    renderAvisos();
}

function mergeAvisosFromShadow(remoteAvisos) {
    const byId = {};
    avisos.forEach(a => { byId[a.id] = a; });
    remoteAvisos.forEach(a => { byId[a.id] = a; });
    const merged = Object.values(byId);
    const newItems = merged.filter(a => !avisosSeenIds.has(a.id));
    avisos = merged;
    newItems.forEach(a => {
        avisosSeenIds.add(a.id);
        playAvisoSound(a.priority);
    });
    saveAvisos(true);
}

function mergeFtLaunchesFromShadow(remoteLaunches) {
    const byId = {};
    ftLaunches.forEach(a => { byId[a.id] = a; });
    remoteLaunches.forEach(a => {
        const existing = byId[a.id];
        if (!existing) {
            byId[a.id] = a;
            return;
        }
        const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const eTime = new Date(existing.updatedAt || existing.createdAt || 0).getTime();
        byId[a.id] = aTime >= eTime ? a : existing;
    });
    ftLaunches = Object.values(byId).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    saveFtLaunches(true);
}

function playAvisoSound(priority) {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const beep = (delayMs, freq) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = freq;
            o.type = 'sine';
            o.connect(g);
            g.connect(ctx.destination);
            const now = ctx.currentTime + delayMs / 1000;
            g.gain.setValueAtTime(0.001, now);
            g.gain.exponentialRampToValueAtTime(0.2, now + 0.02);
            g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
            o.start(now);
            o.stop(now + 0.3);
        };
        if (priority === 'urgente') {
            beep(0, 800);
            beep(400, 800);
            beep(800, 800);
        } else {
            beep(0, 600);
        }
    } catch {}
}

// ==========================================================================
// 📌 LANÇAMENTOS DE FT
// ==========================================================================

function switchLancamentosTab(tab) {
    if (tab === 'novo' && !isAdminRole()) {
        showToast("Apenas admins podem criar lançamentos.", "error");
        tab = 'dashboard';
    }
    currentLancamentosTab = tab;
    renderLancamentos();
}

async function hydrateFtCollabs() {
    const select = document.getElementById('ft-collab-select');
    if (!select) return;
    const list = await getAllCollaborators();
    const collabs = (list || [])
        .filter(c => !currentGroup || currentGroup === 'todos' || c.grupo === currentGroup)
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome));
    select.innerHTML = collabs.map(c => `<option value="${c.re}" data-search="${c.nome} ${c.re}" data-unit="${c.posto || ''}">${c.nome} (${c.re})</option>`).join('');
}

async function hydrateFtUnitsScales() {
    const unitSelect = document.getElementById('ft-unit-target');
    const scaleSelect = document.getElementById('ft-shift');
    if (!unitSelect || !scaleSelect) return;
    const list = await getAllCollaborators();
    const filtered = (list || []).filter(c => !currentGroup || currentGroup === 'todos' || c.grupo === currentGroup);
    const units = [...new Set(filtered.map(c => c.posto).filter(Boolean))].sort();
    const scales = [...new Set(filtered.map(c => c.escala).filter(Boolean))].sort();
    unitSelect.innerHTML = units.map(u => `<option value="${u}">${u}</option>`).join('');
    scaleSelect.innerHTML = scales.map(s => `<option value="${s}">${s}</option>`).join('');
}

async function hydrateFtCovering() {
    const select = document.getElementById('ft-covering-select');
    if (!select) return;
    const list = await getAllCollaborators();
    const collabs = (list || [])
        .filter(c => !currentGroup || currentGroup === 'todos' || c.grupo === currentGroup)
        .slice()
        .sort((a, b) => a.nome.localeCompare(b.nome));
    const options = [`<option value="NA" data-search="NA">Não se aplica</option>`]
        .concat(collabs.map(c => `<option value="${c.re}" data-search="${c.nome} ${c.re}" data-phone="${c.telefone || ''}">${c.nome} (${c.re})</option>`));
    select.innerHTML = options.join('');
}

function hydrateFtReasons() {
    const select = document.getElementById('ft-reason');
    if (!select) return;
    const items = ftReasons.length ? ftReasons : (CONFIG?.ftReasons || []);
    select.innerHTML = items.map(r => `<option value="${r.value}">${r.label}</option>`).join('');
    select.addEventListener('change', handleFtReasonChange);
    handleFtReasonChange();
}

function handleFtReasonChange() {
    const select = document.getElementById('ft-reason');
    const other = document.getElementById('ft-reason-other');
    if (!select || !other) return;
    other.classList.toggle('hidden', select.value !== 'outro');
}

function getFtReasonLabel(value, other) {
    if (value === 'outro' && other) return other;
    const found = ftReasons.find(r => r.value === value);
    return found ? found.label : value;
}

function filterFtCovering() {
    const input = document.getElementById('ft-covering-search');
    const select = document.getElementById('ft-covering-select');
    if (!input || !select) return;
    const term = input.value.trim().toUpperCase();
    const options = Array.from(select.options);
    let firstMatch = null;
    options.forEach(opt => {
        const hay = (opt.getAttribute('data-search') || '').toUpperCase();
        const match = !term || hay.includes(term);
        opt.hidden = !match;
        if (match && !firstMatch) firstMatch = opt;
        if (term && hay.startsWith(term)) firstMatch = opt;
    });
    if (firstMatch) select.value = firstMatch.value;
}

function syncFtCoveringSelection() {
    const other = document.getElementById('ft-covering-other');
    if (other) other.value = '';
}

function filterFtCollabs() {
    const input = document.getElementById('ft-search');
    const select = document.getElementById('ft-collab-select');
    if (!input || !select) return;
    const term = input.value.trim().toUpperCase();
    const options = Array.from(select.options);
    let firstMatch = null;
    options.forEach(opt => {
        const hay = (opt.getAttribute('data-search') || '').toUpperCase();
        const match = !term || hay.includes(term);
        opt.hidden = !match;
        if (match && !firstMatch) firstMatch = opt;
        if (term && hay.startsWith(term)) firstMatch = opt;
    });
    if (firstMatch) select.value = firstMatch.value;
    syncFtUnitWithCollab();
}

function syncFtUnitWithCollab() {
    const select = document.getElementById('ft-collab-select');
    const unitCurrent = document.getElementById('ft-unit-current');
    const unitTarget = document.getElementById('ft-unit-target');
    const shiftSelect = document.getElementById('ft-shift');
    if (!select || !unitCurrent) return;
    const opt = select.selectedOptions?.[0];
    const unit = opt?.getAttribute('data-unit') || '';
    const collab = (allCollaboratorsCache.items || []).find(c => c.re === select.value);
    unitCurrent.value = unit;
    if (unitTarget) {
        const auto = unitTarget.dataset.auto !== '0';
        if (auto && unit) unitTarget.value = unit;
    }
    if (shiftSelect && collab?.escala) {
        const autoShift = shiftSelect.dataset.auto !== '0';
        if (autoShift) shiftSelect.value = collab.escala;
    }
}

function getFtFormConfig(data) {
    const forms = CONFIG?.ftForms || {};
    const group = data?.group || currentGroup || 'todos';
    if (currentGroup === 'todos' && forms.geral) return forms.geral;
    if (group && group !== 'todos' && forms[group]) return forms[group];
    return forms.geral || forms.todos || null;
}

function getFtFormLink(data) {
    const form = getFtFormConfig(data);
    if (!form?.formUrl) return '';
    const entries = form.entries || {};
    const params = new URLSearchParams();
    const setIf = (key, value) => {
        if (!key) return;
        if (value == null) return;
        params.set(key, value);
    };
    const reasonText = getFtReasonLabel(data.reason, data.reasonOther);
    const coveringText = data.coveringOther
        ? data.coveringOther
        : (data.coveringName ? `${data.coveringName} (${data.coveringRe})` : data.coveringRe);
    setIf(entries.name, data.collabName);
    setIf(entries.re, data.collabRe);
    setIf(entries.unitCurrent, data.unitCurrent);
    setIf(entries.unitTarget, data.unitTarget);
    setIf(entries.date, data.date);
    setIf(entries.shift, data.shift);
    setIf(entries.reason, reasonText);
    setIf(entries.covering, coveringText);
    setIf(entries.notes, data.notes);
    setIf(entries.createdBy, data.createdBy);
    setIf(entries.ftId, data.id);
    const qs = params.toString();
    return qs ? `${form.formUrl}?${qs}` : form.formUrl;
}

function formatFtDate(value) {
    if (!value) return '';
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return value;
    }
}

function applyFtFilters(list) {
    let items = list.slice();
    if (ftFilter.from) items = items.filter(i => (i.date || '').slice(0,10) >= ftFilter.from);
    if (ftFilter.to) items = items.filter(i => (i.date || '').slice(0,10) <= ftFilter.to);
    if (ftFilter.status !== 'all') items = items.filter(i => i.status === ftFilter.status);
    return items;
}

function renderLancamentos() {
    const panelDashboard = document.getElementById('lancamentos-panel-dashboard');
    const panelHistorico = document.getElementById('lancamentos-panel-historico');
    const panelNovo = document.getElementById('lancamentos-panel-novo');
    if (!panelDashboard || !panelHistorico || !panelNovo) return;

    panelDashboard.classList.add('hidden');
    panelHistorico.classList.add('hidden');
    panelNovo.classList.add('hidden');

    if (currentLancamentosTab === 'dashboard') {
        panelDashboard.classList.remove('hidden');
        renderLancamentosDashboard();
    } else if (currentLancamentosTab === 'historico') {
        panelHistorico.classList.remove('hidden');
        renderLancamentosHistorico();
    } else {
        panelNovo.classList.remove('hidden');
        renderLancamentosNovo();
    }

    if (!ftSyncTimer) {
        ftSyncTimer = setInterval(() => {
            if (currentTab === 'lancamentos') syncFtFormResponses(true);
        }, 120000);
    }
}

function getFtResponseUrls() {
    const forms = CONFIG?.ftForms || {};
    return Object.entries(forms)
        .map(([group, cfg]) => ({ group, url: cfg?.responsesCsv || '' }))
        .filter(item => item.url);
}

async function syncFtFormResponses(silent = false) {
    const sources = getFtResponseUrls();
    if (!sources.length) {
        if (!silent) showToast("Configure as planilhas de respostas (CSV) para sincronizar.", "info");
        return;
    }
    const ids = new Set();
    for (const src of sources) {
        try {
            const csv = await fetchSheetData(src.url);
            if (!csv) continue;
            const rows = parseCSV(csv);
            if (!rows.length) continue;
            const header = rows[0].map(h => String(h).toLowerCase());
            let idx = header.findIndex(h => h.includes('ft id'));
            if (idx < 0) idx = header.findIndex(h => h.includes('ft') && h.includes('id'));
            if (idx < 0) continue;
            for (let i = 1; i < rows.length; i++) {
                const id = rows[i][idx];
                if (id) ids.add(String(id).trim());
            }
        } catch {}
    }
    if (!ids.size) {
        if (!silent) showToast("Nenhuma confirmação encontrada.", "info");
        return;
    }
    let updated = 0;
    ftLaunches.forEach(item => {
        if (item.status === 'pending' && ids.has(item.id)) {
            setFtStatus(item, 'submitted');
            updated++;
        }
    });
    if (updated) {
        saveFtLaunches();
        showToast("Confirmações atualizadas.", "success");
    } else if (!silent) {
        showToast("Nenhuma FT nova confirmada.", "info");
    }
    ftLastSyncAt = new Date().toISOString();
}

async function renderLancamentosNovo() {
    await hydrateFtCollabs();
    await hydrateFtUnitsScales();
    await hydrateFtCovering();
    hydrateFtReasons();
    const select = document.getElementById('ft-collab-select');
    if (select && select.options.length && !select.value) {
        select.selectedIndex = 0;
    }
    syncFtUnitWithCollab();
    const coveringSelect = document.getElementById('ft-covering-select');
    if (coveringSelect && coveringSelect.options.length && !coveringSelect.value) {
        coveringSelect.selectedIndex = 0;
    }
    updateFtFormHint();
    updateFtPostActions();
}

function updateFtFormHint() {
    const hint = document.getElementById('ft-form-hint');
    if (!hint) return;
    const form = getFtFormConfig(buildFtFromForm());
    if (!form?.formUrl) {
        hint.textContent = 'Configure o link do Google Forms em config.js para gerar o link de confirmação.';
        return;
    }
    hint.textContent = 'Link de confirmação será gerado automaticamente ao salvar.';
}

function renderLancamentosDashboard() {
    const panel = document.getElementById('lancamentos-panel-dashboard');
    if (!panel) return;

    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const items = applyFtFilters(ftLaunches);
    const pending = items.filter(i => i.status === 'pending').length;
    const submitted = items.filter(i => i.status === 'submitted').length;
    const launched = items.filter(i => i.status === 'launched').length;
    const totalMonth = items.filter(i => (i.date || '').startsWith(monthKey)).length;

    const byUnit = {};
    items.forEach(i => {
        const unit = i.unitTarget || i.unitCurrent || 'N/I';
        byUnit[unit] = (byUnit[unit] || 0) + 1;
    });
    const topUnits = Object.entries(byUnit).sort((a, b) => b[1] - a[1]).slice(0, 5);

    const byPerson = {};
    items.forEach(i => {
        const name = i.collabName || 'N/I';
        byPerson[name] = (byPerson[name] || 0) + 1;
    });
    const topPeople = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 5);

    panel.innerHTML = `
        <div class="lancamentos-filters">
            <div class="form-group">
                <label>De</label>
                <input type="date" id="ft-filter-from" value="${ftFilter.from}">
            </div>
            <div class="form-group">
                <label>Até</label>
                <input type="date" id="ft-filter-to" value="${ftFilter.to}">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="ft-filter-status">
                    <option value="all" ${ftFilter.status === 'all' ? 'selected' : ''}>Todos</option>
                    <option value="pending" ${ftFilter.status === 'pending' ? 'selected' : ''}>Pendentes</option>
                    <option value="submitted" ${ftFilter.status === 'submitted' ? 'selected' : ''}>Confirmados (Forms)</option>
                    <option value="launched" ${ftFilter.status === 'launched' ? 'selected' : ''}>Lançados no Nexti</option>
                </select>
            </div>
            <div class="form-group">
                <label>Última sync</label>
                <div class="ft-sync-info">${ftLastSyncAt ? formatFtDate(ftLastSyncAt) : '—'}</div>
            </div>
        </div>
        <div class="lancamentos-cards">
            <div class="lanc-card"><div class="label">Pendentes</div><div class="value">${pending}</div></div>
            <div class="lanc-card"><div class="label">Confirmados (Forms)</div><div class="value">${submitted}</div></div>
            <div class="lanc-card"><div class="label">Lançados no Nexti</div><div class="value">${launched}</div></div>
            <div class="lanc-card"><div class="label">Total no mês</div><div class="value">${totalMonth}</div></div>
        </div>
        ${getFtResponseUrls().length ? '' : '<p class="empty-state">Para confirmação automática, publique a planilha de respostas (CSV) e preencha em config.js.</p>'}
        <div class="lancamentos-grid">
            <div class="lanc-panel">
                <h4>Top Unidades</h4>
                ${topUnits.map(([unit, count]) => `<div class="lanc-row"><span>${unit}</span><strong>${count}</strong></div>`).join('') || '<div class="empty-state">Sem dados.</div>'}
            </div>
            <div class="lanc-panel">
                <h4>Top Colaboradores</h4>
                ${topPeople.map(([name, count]) => `<div class="lanc-row"><span>${name}</span><strong>${count}</strong></div>`).join('') || '<div class="empty-state">Sem dados.</div>'}
            </div>
        </div>
    `;

    document.getElementById('ft-filter-from')?.addEventListener('change', (e) => {
        ftFilter.from = e.target.value || '';
        renderLancamentosDashboard();
    });
    document.getElementById('ft-filter-to')?.addEventListener('change', (e) => {
        ftFilter.to = e.target.value || '';
        renderLancamentosDashboard();
    });
    document.getElementById('ft-filter-status')?.addEventListener('change', (e) => {
        ftFilter.status = e.target.value || 'all';
        renderLancamentosDashboard();
    });
}

function renderLancamentosHistorico() {
    const panel = document.getElementById('lancamentos-panel-historico');
    if (!panel) return;
    if (!ftLaunches.length) {
        panel.innerHTML = `<p class="empty-state">Nenhum lançamento registrado.</p>`;
        return;
    }
    const items = applyFtFilters(ftLaunches).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    panel.innerHTML = `
        <div class="lancamentos-filters">
            <div class="form-group">
                <label>De</label>
                <input type="date" id="ft-filter-from-h" value="${ftFilter.from}">
            </div>
            <div class="form-group">
                <label>Até</label>
                <input type="date" id="ft-filter-to-h" value="${ftFilter.to}">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="ft-filter-status-h">
                    <option value="all" ${ftFilter.status === 'all' ? 'selected' : ''}>Todos</option>
                    <option value="pending" ${ftFilter.status === 'pending' ? 'selected' : ''}>Pendentes</option>
                    <option value="submitted" ${ftFilter.status === 'submitted' ? 'selected' : ''}>Confirmados (Forms)</option>
                    <option value="launched" ${ftFilter.status === 'launched' ? 'selected' : ''}>Lançados no Nexti</option>
                </select>
            </div>
        </div>
        ${items.map(item => {
            const statusText = item.status === 'launched'
                ? 'LANÇADO NO NEXTI'
                : (item.status === 'submitted' ? 'CONFIRMADO (Forms)' : 'AGUARDANDO CONFIRMAÇÃO');
            const canLaunch = item.status === 'submitted' && isAdminRole();
            const launched = item.status === 'launched';
            return `
        <div class="lancamento-card" data-ft-id="${item.id}">
            <div class="lancamento-meta">
                <span class="lancamento-date">${formatFtDate(item.createdAt)}</span>
                <span class="lancamento-status status-${item.status}">${statusText}</span>
            </div>
            <div class="lancamento-steps">
                <span class="step ${item.createdAt ? 'done' : ''}">Criada</span>
                <span class="step ${item.linkSentAt ? 'done' : ''}">Link enviado</span>
                <span class="step ${item.status === 'submitted' || item.status === 'launched' ? 'done' : ''}">Confirmado pelo colaborador</span>
                <span class="step ${item.status === 'launched' ? 'done' : ''}">Lançado no Nexti</span>
            </div>
            <div class="lancamento-title">${item.collabName || 'Colaborador'} (${item.collabRe})</div>
            <div class="lancamento-details">
                <div><strong>Unidade:</strong> ${item.unitTarget || item.unitCurrent || 'N/I'}</div>
                <div><strong>Data:</strong> ${item.date || 'N/I'} • <strong>Escala:</strong> ${item.shift || 'N/I'}</div>
                <div><strong>Motivo:</strong> ${getFtReasonLabel(item.reason, item.reasonOther) || 'N/I'} • <strong>Cobrindo:</strong> ${item.coveringOther || (item.coveringName ? `${item.coveringName} (${item.coveringRe})` : (item.coveringRe || '-'))}</div>
                <div><strong>Responsável:</strong> ${item.createdBy || 'Admin'}</div>
            </div>
            <div class="lancamento-actions">
                <button class="btn-mini btn-secondary" onclick="copyFtLinkById('${item.id}')">Copiar link</button>
                <button class="btn-mini btn-secondary" onclick="sendFtWhatsappById('${item.id}')">WhatsApp</button>
                <button class="btn-mini ${launched ? 'btn-ok' : 'btn-secondary'}" onclick="markFtLaunched('${item.id}')" ${canLaunch ? '' : 'disabled'}>${launched ? 'Lançado no Nexti' : 'Marcar Lançado no Nexti'}</button>
                <button class="btn-mini btn-danger" onclick="deleteFtLaunch('${item.id}')" ${isAdminRole() ? '' : 'disabled'}>Remover</button>
            </div>
        </div>
    `;
        }).join('')}
    `;

    document.getElementById('ft-filter-from-h')?.addEventListener('change', (e) => {
        ftFilter.from = e.target.value || '';
        renderLancamentosHistorico();
    });
    document.getElementById('ft-filter-to-h')?.addEventListener('change', (e) => {
        ftFilter.to = e.target.value || '';
        renderLancamentosHistorico();
    });
    document.getElementById('ft-filter-status-h')?.addEventListener('change', (e) => {
        ftFilter.status = e.target.value || 'all';
        renderLancamentosHistorico();
    });
}

function buildFtFromForm() {
    const select = document.getElementById('ft-collab-select');
    const collabRe = select?.value || '';
    const collabName = select?.selectedOptions?.[0]?.text?.split('(')[0]?.trim() || '';
    const unitCurrent = document.getElementById('ft-unit-current')?.value.trim() || '';
    const unitTarget = document.getElementById('ft-unit-target')?.value.trim() || '';
    const date = document.getElementById('ft-date')?.value || '';
    const shift = document.getElementById('ft-shift')?.value.trim() || '';
    const reason = document.getElementById('ft-reason')?.value || '';
    const reasonOther = document.getElementById('ft-reason-other')?.value.trim() || '';
    const coveringSelect = document.getElementById('ft-covering-select');
    const coveringRe = coveringSelect?.value || '';
    const coveringName = coveringSelect?.selectedOptions?.[0]?.text?.split('(')[0]?.trim() || '';
    const coveringOther = document.getElementById('ft-covering-other')?.value.trim() || '';
    const notes = document.getElementById('ft-notes')?.value.trim() || '';
    let group = currentGroup || '';
    const collab = currentData.find(c => c.re === collabRe) || (allCollaboratorsCache.items || []).find(c => c.re === collabRe);
    const coveringCollab = (allCollaboratorsCache.items || []).find(c => c.re === coveringRe);
    if (collab?.grupo) group = collab.grupo;
    const resolvedUnitCurrent = unitCurrent || collab?.posto || '';
    let resolvedCoveringRe = coveringRe;
    let resolvedCoveringOther = coveringOther;
    if (coveringRe === 'NA') {
        resolvedCoveringRe = '';
        resolvedCoveringOther = 'Não se aplica';
    }
    return {
        collabRe,
        collabName: collab?.nome || collabName,
        collabPhone: collab?.telefone || '',
        unitCurrent: resolvedUnitCurrent,
        unitTarget,
        date,
        shift,
        reason,
        reasonOther,
        coveringRe: resolvedCoveringRe,
        coveringName: coveringCollab?.nome || coveringName,
        coveringPhone: coveringCollab?.telefone || '',
        coveringOther: resolvedCoveringOther,
        notes,
        group
    };
}

function createFtLaunch() {
    if (!(SiteAuth.logged && SiteAuth.role !== 'supervisor')) {
        showToast("Apenas admins podem lançar FT.", "error");
        return;
    }
    const data = buildFtFromForm();
    if (!data.collabRe) {
        showToast("Selecione o colaborador.", "error");
        return;
    }
    if (!data.date) {
        showToast("Informe a data da FT.", "error");
        return;
    }
    if (!data.unitTarget) {
        showToast("Informe a unidade FT.", "error");
        return;
    }
    if (data.reason === 'outro' && !data.reasonOther) {
        showToast("Descreva o motivo da FT.", "error");
        return;
    }
    const item = {
        id: `ft-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
        status: 'pending',
        createdAt: new Date().toISOString(),
        createdBy: SiteAuth.user || 'Admin',
        ...data
    };
    item.updatedAt = item.createdAt;
    item.formLink = getFtFormLink(item);
    ftLaunches.unshift(item);
    saveFtLaunches();
    showToast("FT lançada com sucesso.", "success");
    lastFtCreatedId = item.id;
    updateFtPostActions();
    setTimeout(() => flashLancamentoCard(item.id), 100);
}

function updateFtPostActions() {
    const copyBtn = document.getElementById('ft-copy-last');
    const sendBtn = document.getElementById('ft-send-last');
    const enabled = !!lastFtCreatedId;
    if (copyBtn) copyBtn.disabled = !enabled;
    if (sendBtn) sendBtn.disabled = !enabled;
}

function copyFtLastLink() {
    if (!lastFtCreatedId) {
        showToast("Salve o lançamento primeiro.", "error");
        return;
    }
    copyFtLinkById(lastFtCreatedId);
}

function sendFtLastWhatsapp() {
    if (!lastFtCreatedId) {
        showToast("Salve o lançamento primeiro.", "error");
        return;
    }
    sendFtWhatsappById(lastFtCreatedId);
}

function copyFtLinkById(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item) return;
    const link = item.formLink || getFtFormLink(item);
    if (!link) {
        showToast("Configure o Google Forms para gerar o link.", "error");
        return;
    }
    item.linkSentAt = item.linkSentAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    navigator.clipboard?.writeText(link);
    saveFtLaunches();
    showToast("Link copiado.", "success");
}

function sendFtWhatsappById(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item) return;
    const link = item.formLink || getFtFormLink(item);
    if (!link) {
        showToast("Configure o Google Forms para gerar o link.", "error");
        return;
    }
    const reasonText = getFtReasonLabel(item.reason, item.reasonOther);
    const coveringText = item.coveringOther
        ? item.coveringOther
        : (item.coveringName ? `${item.coveringName} (${item.coveringRe})` : item.coveringRe);
    const text = `FT confirmação\n${item.collabName} (${item.collabRe})\nUnidade: ${item.unitTarget || item.unitCurrent}\nData: ${item.date}\nEscala: ${item.shift}\nMotivo: ${reasonText}\nCobrindo: ${coveringText || '-'}\nLink: ${link}`;
    const url = buildWhatsUrl(item.collabPhone, text);
    item.linkSentAt = item.linkSentAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    saveFtLaunches();
    window.open(url, '_blank');
}

function buildWhatsUrl(phone, text) {
    if (!phone) return `https://wa.me/?text=${encodeURIComponent(text)}`;
    const clean = String(phone).replace(/\D/g, '');
    if (clean.length >= 10) {
        const withCountry = clean.startsWith('55') ? clean : `55${clean}`;
        return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
    }
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

function applyFtToCollaborator(item) {
    if (!item?.collabRe || !item?.date) return;
    const base = currentData.find(c => c.re === item.collabRe) || (allCollaboratorsCache.items || []).find(c => c.re === item.collabRe);
    const edit = base ? { ...base } : (collaboratorEdits[item.collabRe] || { re: item.collabRe, nome: item.collabName });
    if (edit.rotulo && edit.rotulo !== 'FT') return;
    edit.rotulo = 'FT';
    edit.rotuloInicio = item.date;
    edit.rotuloFim = item.date;
    edit.rotuloDetalhe = item.unitTarget || '';
    collaboratorEdits[item.collabRe] = edit;
    const live = currentData.find(c => c.re === item.collabRe);
    if (live) {
        live.rotulo = 'FT';
        live.rotuloInicio = item.date;
        live.rotuloFim = item.date;
        live.rotuloDetalhe = item.unitTarget || '';
    }
    saveLocalState();
}

function removeFtFromCollaborator(item) {
    if (!item?.collabRe) return;
    const edit = collaboratorEdits[item.collabRe];
    if (!edit) return;
    if (edit.rotulo === 'FT' && edit.rotuloInicio === item.date && edit.rotuloFim === item.date) {
        delete edit.rotulo;
        delete edit.rotuloInicio;
        delete edit.rotuloFim;
        delete edit.rotuloDetalhe;
        collaboratorEdits[item.collabRe] = edit;
        const live = currentData.find(c => c.re === item.collabRe);
        if (live && live.rotulo === 'FT' && live.rotuloInicio === item.date && live.rotuloFim === item.date) {
            delete live.rotulo;
            delete live.rotuloInicio;
            delete live.rotuloFim;
            delete live.rotuloDetalhe;
        }
        saveLocalState();
    }
}

function setFtStatus(item, status) {
    item.status = status;
    item.updatedAt = new Date().toISOString();
    if (status === 'submitted' || status === 'launched') {
        applyFtToCollaborator(item);
    } else if (status === 'pending') {
        removeFtFromCollaborator(item);
    }
}

async function markFtLaunched(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item || item.status !== 'submitted') return;
    setFtStatus(item, 'launched');
    saveFtLaunches();
    renderLancamentosHistorico();
    setTimeout(() => flashLancamentoCard(item.id), 100);
    showToast("FT marcada como lançada no Nexti.", "success");
}

function deleteFtLaunch(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item) return;
    if (!confirm('Remover lançamento de FT?')) return;
    removeFtFromCollaborator(item);
    ftLaunches = ftLaunches.filter(i => i.id !== id);
    saveFtLaunches();
    renderLancamentosHistorico();
    showToast("Lançamento removido.", "success");
}

// ==========================================================================
// 📌 CONTATO (WHATSAPP / TELEFONE)
// ==========================================================================

let currentContactPhone = '';

function openPhoneModal(name, phone) {
    currentContactPhone = phone;
    document.getElementById('phone-modal-title').innerText = name.split(' ')[0]; // Primeiro nome
    
    const numberEl = document.getElementById('phone-modal-number');
    const whatsappBtn = document.querySelector('#phone-modal .whatsapp-btn');
    const callBtn = document.querySelector('#phone-modal button[onclick="contactCall()"]');

    if (phone) {
        // Formatação flexível (10 ou 11 dígitos)
        let formatted = phone;
        if (phone.length === 11) {
            formatted = phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
        } else if (phone.length === 10) {
            formatted = phone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
        }
        numberEl.innerText = formatted;
        numberEl.style.color = '#666';
        
        whatsappBtn.disabled = false;
        whatsappBtn.style.opacity = '1';
        whatsappBtn.style.cursor = 'pointer';
        
        callBtn.disabled = false;
        callBtn.style.opacity = '1';
        callBtn.style.cursor = 'pointer';
    } else {
        numberEl.innerText = "Telefone não vinculado";
        numberEl.style.color = '#dc3545';
        
        whatsappBtn.disabled = true;
        whatsappBtn.style.opacity = '0.5';
        whatsappBtn.style.cursor = 'not-allowed';
        
        callBtn.disabled = true;
        callBtn.style.opacity = '0.5';
        callBtn.style.cursor = 'not-allowed';
    }

    document.getElementById('phone-modal').classList.remove('hidden');
}

function closePhoneModal() {
    document.getElementById('phone-modal').classList.add('hidden');
    currentContactPhone = '';
}

function contactWhatsApp() {
    if (!currentContactPhone) return;
    const formatted = currentContactPhone.length <= 11 ? '55' + currentContactPhone : currentContactPhone;
    // Prefer deep link to app on mobile
    window.location.href = `whatsapp://send?phone=${formatted}`;
    // Fallback to wa.me after a short delay
    setTimeout(() => {
        window.open(`https://wa.me/${formatted}`, '_blank');
    }, 600);
}

function contactCall() {
    if (!currentContactPhone) return;
    window.location.href = `tel:${currentContactPhone}`;
}

// Fechar modal ao clicar fora
window.onclick = function(event) {
    const modal = document.getElementById('edit-modal');
    if (event.target == modal) closeEditModal();
}

function verificarEscala(turma) {
    // 🔴 REGRA ABSOLUTA: Lógica de escala (turma 1 = dias ímpares / turma 2 = dias pares)
    const hoje = new Date().getDate();
    const isImpar = hoje % 2 !== 0;
    
    // Compara com número (já convertido no parse) ou string
    if (turma == 1) return isImpar;
    if (turma == 2) return !isImpar;
    return false; // Padrão se não for 1 ou 2
}

// ==========================================================================
// ⚙️ FUNÇÕES DE GERENCIAMENTO
// ==========================================================================

function toggleManagementMenu() {
    const menu = document.getElementById('managementMenu');
    if (!menu) return;
    menu.classList.toggle('hidden');
    updateMenuStatus();
}

// ==========================================================================
// 📦 EXPORTAÇÃO AVANÇADA
// ==========================================================================

function buildExportRows() {
    return currentData.map(item => {
        const status = getStatusInfo(item);
        return {
            "Nome": item.nome,
            "RE": item.re,
            "Unidade": item.posto,
            "Escala": item.escala,
            "Turma": item.turma === 1 ? "Ímpar" : "Par",
            "Status": status.text,
            "Rótulo": item.rotulo || "",
            "Detalhe Rótulo": item.rotuloDetalhe || "",
            "Início Afastamento": item.rotuloInicio ? formatDate(item.rotuloInicio) : "",
            "Fim Afastamento": item.rotuloFim ? formatDate(item.rotuloFim) : ""
        };
    });
}

function buildExportRowsFor(items) {
    return (items || []).map(item => {
        const status = getStatusInfo(item);
        return {
            "Nome": item.nome,
            "RE": item.re,
            "Unidade": item.posto,
            "Escala": item.escala,
            "Turma": item.turma === 1 ? "Ímpar" : "Par",
            "Status": status.text,
            "Rótulo": item.rotulo || "",
            "Detalhe Rótulo": item.rotuloDetalhe || "",
            "Início Afastamento": item.rotuloInicio ? formatDate(item.rotuloInicio) : "",
            "Fim Afastamento": item.rotuloFim ? formatDate(item.rotuloFim) : ""
        };
    });
}

function buildResumoRows() {
    const byUnit = {};
    const byRotulo = {};

    currentData.forEach(item => {
        const status = getStatusInfo(item).text.includes('PLANTÃO') || getStatusInfo(item).text.includes('FT') ? 'PLANTÃO' : 'FOLGA';
        const unidade = item.posto || 'N/I';

        byUnit[unidade] = byUnit[unidade] || { unidade, total: 0, plantao: 0, folga: 0 };
        byUnit[unidade].total += 1;
        if (status === 'PLANTÃO') byUnit[unidade].plantao += 1;
        else byUnit[unidade].folga += 1;

        if (item.rotulo) {
            byRotulo[item.rotulo] = (byRotulo[item.rotulo] || 0) + 1;
        }
    });

    const unitRows = Object.values(byUnit).map(u => ({
        "Unidade": u.unidade,
        "Total": u.total,
        "Plantão": u.plantao,
        "Folga": u.folga
    }));

    const rotuloRows = Object.keys(byRotulo).map(r => ({
        "Rótulo": r,
        "Quantidade": byRotulo[r]
    }));

    return { unitRows, rotuloRows };
}

function isPlantaoStatus(item) {
    const text = getStatusInfo(item).text || '';
    return text.includes('PLANTÃO') || text.includes('FT');
}

function buildStatusRows(items) {
    const plantao = items.filter(i => isPlantaoStatus(i)).length;
    const folga = items.length - plantao;
    return [
        { "Status": "PLANTÃO", "Quantidade": plantao },
        { "Status": "FOLGA", "Quantidade": folga }
    ];
}

function buildGroupRows(items) {
    const byGroup = {};
    items.forEach(item => {
        const group = (item.grupo || 'N/I').toUpperCase();
        if (!byGroup[group]) byGroup[group] = { Grupo: group, Total: 0, Plantao: 0, Folga: 0 };
        byGroup[group].Total += 1;
        if (isPlantaoStatus(item)) byGroup[group].Plantao += 1;
        else byGroup[group].Folga += 1;
    });
    return Object.values(byGroup);
}

function buildResponsavelRows(history) {
    const byUser = {};
    (history || []).forEach(h => {
        const name = (h.responsavel || 'N/I').toUpperCase();
        byUser[name] = (byUser[name] || 0) + 1;
    });
    return Object.keys(byUser).map(k => ({ "Responsável": k, "Quantidade": byUser[k] }))
        .sort((a,b) => b.Quantidade - a.Quantidade);
}

function buildAcaoRows(history) {
    const byAction = {};
    (history || []).forEach(h => {
        const action = (h.acao || 'N/I').toUpperCase();
        byAction[action] = (byAction[action] || 0) + 1;
    });
    return Object.keys(byAction).map(k => ({ "Ação": k, "Quantidade": byAction[k] }))
        .sort((a,b) => b.Quantidade - a.Quantidade);
}

function buildHistoryRows(history) {
    return (history || []).map(h => ({
        "Data": h.data || '',
        "Responsável": h.responsavel || '',
        "Ação": h.acao || '',
        "Detalhe": h.detalhe || '',
        "Alterações": Array.isArray(h.changes) && h.changes.length
            ? h.changes.map(c => `${c.label}: ${c.from} → ${c.to}`).join(' | ')
            : ''
    }));
}

function buildHistoryByDayRows(history) {
    const byDay = {};
    (history || []).forEach(h => {
        const day = (h.data || '').split(',')[0].trim() || 'N/I';
        byDay[day] = (byDay[day] || 0) + 1;
    });
    return Object.keys(byDay).map(d => ({ "Data": d, "Quantidade": byDay[d] }))
        .sort((a,b) => (a.Data || '').localeCompare(b.Data || ''));
}

function exportarBaseAtualizada() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const rows = buildExportRows();
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Base Atualizada");
    XLSX.writeFile(wb, `base_atualizada_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Base atualizada gerada.", "success");
}

function exportarSomentePlantao() {
    const items = currentData.filter(i => isPlantaoStatus(i));
    if (!items.length) {
        showToast("Não há colaboradores em plantão.", "info");
        return;
    }
    const rows = buildExportRowsFor(items);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Somente Plantao");
    XLSX.writeFile(wb, `somente_plantao_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Exportação de plantão gerada.", "success");
}

function exportarSomenteFolga() {
    const items = currentData.filter(i => !isPlantaoStatus(i));
    if (!items.length) {
        showToast("Não há colaboradores de folga.", "info");
        return;
    }
    const rows = buildExportRowsFor(items);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Somente Folga");
    XLSX.writeFile(wb, `somente_folga_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Exportação de folga gerada.", "success");
}

function exportarResumo() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), "Resumo por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rotuloRows), "Resumo por Rótulo");
    XLSX.writeFile(wb, `resumo_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Resumo gerado.", "success");
}

function exportarTudo() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const rows = buildExportRows();
    const { unitRows, rotuloRows } = buildResumoRows();
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Base Atualizada");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), "Resumo por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rotuloRows), "Resumo por Rótulo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(changeHistory), "Historico Global");
    XLSX.writeFile(wb, `exportacao_completa_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Exportação completa gerada.", "success");
}

function exportUnitPrompt(posto) {
    openExportUnitModal(posto);
}

function openExportUnitModal(posto) {
    exportUnitTarget = posto;
    const modal = document.getElementById('export-unit-modal');
    const note = document.getElementById('export-unit-note');
    if (note) note.textContent = posto ? `Unidade selecionada: ${posto}` : '';
    modal?.classList.remove('hidden');
}

function closeExportUnitModal() {
    document.getElementById('export-unit-modal')?.classList.add('hidden');
    exportUnitTarget = null;
}

function confirmExportUnit(format) {
    if (!exportUnitTarget) {
        showToast("Selecione uma unidade para exportar.", "error");
        return;
    }
    closeExportUnitModal();
    exportUnitData(exportUnitTarget, format);
}

function exportUnitData(posto, format = 'xlsx') {
    const items = currentData.filter(i => i.posto === posto);
    if (!items.length) {
        showToast("Nenhum colaborador encontrado nesta unidade.", "error");
        return;
    }
    if (format === 'csv') {
        const headers = ["Nome", "RE", "Posto", "Escala", "Turma", "Status", "Rótulo"];
        const rows = items.map(item => [
            `"${item.nome}"`,
            `"${item.re}"`,
            `"${item.posto}"`,
            `"${item.escala}"`,
            item.turma,
            getStatusInfo(item).text,
            item.rotulo || ""
        ]);
        const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `unidade_${posto.replace(/\s+/g,'_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`;
        link.click();
        showToast("CSV da unidade gerado.", "success");
        return;
    }

    const rows = buildExportRowsFor(items);
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Unidade");
    XLSX.writeFile(wb, `unidade_${posto.replace(/\s+/g,'_').toLowerCase()}_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("XLSX da unidade gerado.", "success");
}

function exportarCSVAtualizado() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const headers = ["Nome", "RE", "Posto", "Escala", "Turma", "Status", "Rótulo"];
    const rows = currentData.map(item => [
        `"${item.nome}"`,
        `"${item.re}"`,
        `"${item.posto}"`,
        `"${item.escala}"`,
        item.turma,
        getStatusInfo(item).text,
        item.rotulo || ""
    ]);

    const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `base_atualizada_${new Date().toISOString().slice(0,10)}.csv`;
    link.click();
    showToast("CSV atualizado gerado.", "success");
}

function exportarGraficos() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const statusRows = [
        { "Status": "PLANTÃO", "Quantidade": currentData.filter(d => getStatusInfo(d).text.includes('PLANTÃO') || getStatusInfo(d).text.includes('FT')).length },
        { "Status": "FOLGA", "Quantidade": currentData.filter(d => !getStatusInfo(d).text.includes('PLANTÃO') && !getStatusInfo(d).text.includes('FT')).length }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusRows), "Status");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), "Unidades");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rotuloRows), "Rotulos");
    XLSX.writeFile(wb, `dados_graficos_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Dados para gráficos gerados.", "success");
}

function exportarRelatorioIA() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const topUnits = unitRows.sort((a,b) => b.Total - a.Total).slice(0, 5);
    const topRotulos = rotuloRows.sort((a,b) => b.Quantidade - a.Quantidade).slice(0, 5);
    const report = [
        { "Resumo": "Relatório gerado localmente (sem backend)", "Detalhe": new Date().toLocaleString() },
        { "Resumo": "Total de colaboradores", "Detalhe": currentData.length },
        { "Resumo": "Top 5 Unidades por efetivo", "Detalhe": topUnits.map(u => `${u.Unidade} (${u.Total})`).join('; ') },
        { "Resumo": "Top 5 Rótulos", "Detalhe": topRotulos.map(r => `${r["Rótulo"]} (${r["Quantidade"]})`).join('; ') }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(report), "Relatorio IA");
    XLSX.writeFile(wb, `relatorio_ia_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Relatório IA gerado.", "success");
}

function exportarResumoGerencial() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const groupRows = buildGroupRows(currentData);
    const statusRows = buildStatusRows(currentData);
    const responsavelRows = buildResponsavelRows(changeHistory);
    const acaoRows = buildAcaoRows(changeHistory);

    const resumoGeral = [
        { "Indicador": "Data do relatório", "Valor": new Date().toLocaleString() },
        { "Indicador": "Total de colaboradores", "Valor": currentData.length },
        { "Indicador": "Total de unidades", "Valor": unitRows.length },
        { "Indicador": "Total de alterações (histórico)", "Valor": changeHistory.length }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumoGeral), "Resumo Geral");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statusRows), "Por Status");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(groupRows), "Por Grupo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(unitRows), "Por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rotuloRows), "Por Rótulo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responsavelRows), "Responsáveis");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acaoRows), "Ações");
    XLSX.writeFile(wb, `resumo_gerencial_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Resumo gerencial gerado.", "success");
}

function exportarHistoricoDetalhado() {
    if (changeHistory.length === 0) {
        showToast("Não há histórico para exportar.", "error");
        return;
    }
    const historyRows = buildHistoryRows(changeHistory);
    const responsavelRows = buildResponsavelRows(changeHistory);
    const acaoRows = buildAcaoRows(changeHistory);
    const byDayRows = buildHistoryByDayRows(changeHistory);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(historyRows), "Historico");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(responsavelRows), "Por Responsavel");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(acaoRows), "Por Acao");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byDayRows), "Por Dia");
    XLSX.writeFile(wb, `historico_detalhado_${new Date().toISOString().slice(0,10)}.xlsx`);
    showToast("Histórico detalhado gerado.", "success");
}

function exportarRelatorioTexto() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const groupRows = buildGroupRows(currentData);
    const statusRows = buildStatusRows(currentData);
    const responsavelRows = buildResponsavelRows(changeHistory).slice(0, 10);
    const topUnits = unitRows.sort((a,b) => b.total - a.total).slice(0, 10);
    const topRotulos = rotuloRows.sort((a,b) => b.Quantidade - a.Quantidade).slice(0, 10);

    const lines = [];
    lines.push("RELATÓRIO EXECUTIVO - GERENCIAMENTO DE EFETIVOS");
    lines.push(`Gerado em: ${new Date().toLocaleString()}`);
    lines.push("");
    lines.push(`Total de colaboradores: ${currentData.length}`);
    lines.push(`Total de unidades: ${unitRows.length}`);
    lines.push(`Total de alterações (histórico): ${changeHistory.length}`);
    lines.push("");
    lines.push("Status:");
    statusRows.forEach(r => lines.push(`- ${r.Status}: ${r.Quantidade}`));
    lines.push("");
    lines.push("Por Grupo:");
    groupRows.forEach(r => lines.push(`- ${r.Grupo}: ${r.Total} (Plantão ${r.Plantao} / Folga ${r.Folga})`));
    lines.push("");
    lines.push("Top 10 Unidades por efetivo:");
    topUnits.forEach(u => lines.push(`- ${u.unidade}: ${u.total}`));
    lines.push("");
    lines.push("Top 10 Rótulos:");
    topRotulos.forEach(r => lines.push(`- ${r["Rótulo"]}: ${r.Quantidade}`));
    lines.push("");
    lines.push("Top Responsáveis (Histórico):");
    responsavelRows.forEach(r => lines.push(`- ${r["Responsável"]}: ${r.Quantidade}`));

    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `relatorio_executivo_${new Date().toISOString().slice(0,10)}.txt`;
    link.click();
    showToast("Relatório texto gerado.", "success");
}

function exportarPDFResumoExecutivo() {
    if (currentData.length === 0) {
        showToast("Não há dados para exportar.", "error");
        return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Biblioteca de PDF não carregada.", "error");
        return;
    }
    const { unitRows, rotuloRows } = buildResumoRows();
    const groupRows = buildGroupRows(currentData);
    const statusRows = buildStatusRows(currentData);
    const topUnits = unitRows.sort((a,b) => b.total - a.total).slice(0, 8);
    const topRotulos = rotuloRows.sort((a,b) => b.Quantidade - a.Quantidade).slice(0, 8);

    const doc = new window.jspdf.jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 14;
    doc.setFontSize(14);
    doc.text("Resumo Executivo - Gerenciamento de Efetivos", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, y);
    y += 8;
    doc.text(`Total de colaboradores: ${currentData.length}`, 14, y);
    y += 6;
    doc.text(`Total de unidades: ${unitRows.length}`, 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.text("Status", 14, y);
    y += 6;
    doc.setFontSize(10);
    statusRows.forEach(r => {
        doc.text(`- ${r.Status}: ${r.Quantidade}`, 16, y);
        y += 5;
    });

    y += 4;
    doc.setFontSize(11);
    doc.text("Por Grupo", 14, y);
    y += 6;
    doc.setFontSize(10);
    groupRows.forEach(r => {
        doc.text(`- ${r.Grupo}: ${r.Total} (Plantão ${r.Plantao} / Folga ${r.Folga})`, 16, y);
        y += 5;
        if (y > 270) { doc.addPage(); y = 14; }
    });

    y += 4;
    doc.setFontSize(11);
    doc.text("Top Unidades", 14, y);
    y += 6;
    doc.setFontSize(10);
    topUnits.forEach(u => {
        doc.text(`- ${u.unidade}: ${u.total}`, 16, y);
        y += 5;
        if (y > 270) { doc.addPage(); y = 14; }
    });

    y += 4;
    doc.setFontSize(11);
    doc.text("Top Rótulos", 14, y);
    y += 6;
    doc.setFontSize(10);
    topRotulos.forEach(r => {
        doc.text(`- ${r["Rótulo"]}: ${r.Quantidade}`, 16, y);
        y += 5;
        if (y > 270) { doc.addPage(); y = 14; }
    });

    doc.save(`resumo_executivo_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("PDF gerado.", "success");
}

function exportarPDFHistorico() {
    if (changeHistory.length === 0) {
        showToast("Não há histórico para exportar.", "error");
        return;
    }
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Biblioteca de PDF não carregada.", "error");
        return;
    }
    const doc = new window.jspdf.jsPDF();
    let y = 14;
    doc.setFontSize(14);
    doc.text("Histórico de Alterações (Resumo)", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleString()}`, 14, y);
    y += 8;
    const entries = changeHistory.slice(0, 40);
    entries.forEach(h => {
        const line = `${h.data || ''} - ${h.responsavel || ''} - ${h.acao || ''}`;
        doc.text(line, 14, y);
        y += 5;
        if (y > 275) { doc.addPage(); y = 14; }
    });
    doc.save(`historico_${new Date().toISOString().slice(0,10)}.pdf`);
    showToast("PDF gerado.", "success");
}

function openExportModal() {
    document.getElementById('export-modal')?.classList.remove('hidden');
}

function closeExportModal() {
    document.getElementById('export-modal')?.classList.add('hidden');
}

function loginSite() {
    const re = document.getElementById('loginRe').value.trim();
    const cpf = document.getElementById('loginCpf').value.trim();

    if (!re || !cpf) {
        alert('Preencha RE e CPF');
        return;
    }

    const hash = btoa(re + ":" + cpf);
    const admin = SiteAuth.admins.find(a => a.hash === hash);

    if (!admin) {
        alert('Acesso negado');
        return;
    }

    SiteAuth.logged = true;
    SiteAuth.user = admin.name;
    SiteAuth.re = re;
    SiteAuth.role = admin.role || 'admin';
    SiteAuth.mode = (SiteAuth.role === 'supervisor') ? 'observe' : 'edit';
    
    // Ativa modo edição visualmente
    if (SiteAuth.role !== 'supervisor') document.body.classList.add('mode-edit');

    document.getElementById('config-login')?.classList.add('hidden');
    document.getElementById('config-content')?.classList.remove('hidden');

    const keepLogged = document.getElementById('keepLogged')?.checked === true;
    saveAuthToStorage(hash, keepLogged);
    renderDashboard();
    switchTab('config');
    renderAdminList();
    renderAuditList();

    showToast("Login efetuado com sucesso, agora você está no modo editor.", "success");
}

function logoutSite() {
    SiteAuth.logged = false;
    SiteAuth.user = null;
    SiteAuth.re = null;
    SiteAuth.mode = 'view';
    SiteAuth.role = 'viewer';
    
    document.body.classList.remove('mode-edit');

    document.getElementById('config-login')?.classList.remove('hidden');
    document.getElementById('config-content')?.classList.add('hidden');

    renderDashboard();
    switchTab('config');
    localStorage.setItem('keepLogged', '0');
    localStorage.removeItem('authHash');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authRe');
}

function toggleEditMode() {
    if (!SiteAuth.logged || SiteAuth.role === 'supervisor') return;

    SiteAuth.mode = SiteAuth.mode === 'edit' ? 'view' : 'edit';
    
    document.body.classList.toggle('mode-edit', SiteAuth.mode === 'edit');
    updateMenuStatus();
}

function renderAdminList() {
    const list = document.getElementById('adminList');
    if (!list) return;

    const admins = SiteAuth.admins.filter(a => a.role !== 'supervisor');
    const supervisors = SiteAuth.admins.filter(a => a.role === 'supervisor');

    const adminRows = admins.map(a => {
        const roleLabel = a.master ? 'Master' : (ROLE_LABELS[a.role] || 'Admin');
        return `
        <div class="admin-row">
            <span class="admin-name gold">${ICONS.crown} ${a.name}</span>
            <span class="admin-role">${roleLabel}</span>
            <button onclick="removeAdmin('${a.hash}')" class="btn-mini btn-danger">X</button>
        </div>
    `;
    }).join('');

    const supervisorRows = supervisors.map(a => `
        <div class="admin-row supervisor">
            <span class="admin-name gold">${a.name}</span>
            <span class="admin-role">${ROLE_LABELS[a.role] || 'Supervisor'}</span>
            <button onclick="removeAdmin('${a.hash}')" class="btn-mini btn-danger">X</button>
        </div>
    `).join('');

    list.innerHTML = `
        <div class="admin-section">
            <div class="admin-section-title">Admins</div>
            ${adminRows || '<div class="admin-empty">Nenhum admin cadastrado.</div>'}
        </div>
        <div class="admin-section">
            <div class="admin-section-title">Supervisores</div>
            ${supervisorRows || '<div class="admin-empty">Nenhum supervisor cadastrado.</div>'}
        </div>
    `;

    updateAdminResetOptions();
    updateAvisoAssigneeFilter();
}

function renderFtReasonsConfig() {
    const list = document.getElementById('ftReasonsList');
    if (!list) return;
    const rows = ftReasons.map((r, idx) => `
        <div class="admin-row">
            <span class="admin-name">${r.label || r.value}</span>
            <button onclick="removeFtReason(${idx})" class="btn-mini btn-danger">X</button>
        </div>
    `).join('');
    list.innerHTML = rows || '<div class="admin-empty">Nenhum motivo cadastrado.</div>';
}

function addFtReason() {
    if (!(SiteAuth.logged && SiteAuth.role !== 'supervisor')) return;
    const input = document.getElementById('ft-reason-new');
    const label = input?.value.trim();
    if (!label) return;
    const value = label.toLowerCase().replace(/\s+/g, '_');
    if (ftReasons.some(r => r.value === value)) {
        showToast("Esse motivo já existe.", "info");
        return;
    }
    ftReasons.push({ value, label });
    saveFtReasons();
    renderFtReasonsConfig();
    input.value = '';
}

function removeFtReason(idx) {
    if (!(SiteAuth.logged && SiteAuth.role !== 'supervisor')) return;
    if (!confirm('Remover motivo?')) return;
    ftReasons.splice(idx, 1);
    saveFtReasons();
    renderFtReasonsConfig();
}

async function addAdminFromConfig() {
    if (!(SiteAuth.logged && SiteAuth.role !== 'supervisor')) {
        showToast("Apenas admins podem adicionar.", "error");
        return;
    }
    const re = document.getElementById('cfg-admin-re')?.value.trim();
    const cpf = document.getElementById('cfg-admin-cpf')?.value.trim();
    if (!re || !cpf) {
        showToast("Informe RE e CPF.", "error");
        return;
    }
    const list = await getAllCollaborators();
    const person = list?.find(p => p.re === re || p.re?.endsWith(re));
    if (!person) {
        showToast("Colaborador não encontrado na base.", "error");
        return;
    }
    const hash = btoa(re + ":" + cpf);
    if (SiteAuth.admins.some(a => a.hash === hash)) {
        showToast("Este admin já existe.", "info");
        return;
    }
    SiteAuth.admins.push({ hash, name: person.nome, re, role: 'admin' });
    SiteAuth.admins = normalizeAdmins(SiteAuth.admins);
    saveAdmins();
    renderAdminList();
    document.getElementById('cfg-admin-re').value = '';
    document.getElementById('cfg-admin-cpf').value = '';
    showToast("Administrador adicionado.", "success");
}

async function addSupervisorFromConfig() {
    if (!(SiteAuth.logged && SiteAuth.role !== 'supervisor')) {
        showToast("Apenas admins podem adicionar.", "error");
        return;
    }
    const re = document.getElementById('cfg-supervisor-re')?.value.trim();
    const cpf = document.getElementById('cfg-supervisor-cpf')?.value.trim();
    if (!re || !cpf) {
        showToast("Informe RE e CPF.", "error");
        return;
    }
    const list = await getAllCollaborators();
    const person = list?.find(p => p.re === re || p.re?.endsWith(re));
    if (!person) {
        showToast("Colaborador não encontrado na base.", "error");
        return;
    }
    const hash = btoa(re + ":" + cpf);
    if (SiteAuth.admins.some(a => a.hash === hash)) {
        showToast("Este supervisor já existe.", "info");
        return;
    }
    SiteAuth.admins.push({ hash, name: person.nome, re, role: 'supervisor' });
    SiteAuth.admins = normalizeAdmins(SiteAuth.admins);
    saveAdmins();
    renderAdminList();
    document.getElementById('cfg-supervisor-re').value = '';
    document.getElementById('cfg-supervisor-cpf').value = '';
    showToast("Supervisor adicionado.", "success");
}

function removeAdmin(hash) {
    if (!confirm('Remover administrador?')) return;
    SiteAuth.admins = SiteAuth.admins.filter(a => a.hash !== hash);
    saveAdmins();
    renderAdminList();
}

function updateAdminResetOptions() {
    const select = document.getElementById('cfg-reset-user');
    if (!select) return;
    const options = SiteAuth.admins.map(a => ({
        hash: a.hash,
        label: `${a.name} (${a.role === 'supervisor' ? 'Supervisor' : (a.master ? 'Master' : 'Admin')})`
    }));
    select.innerHTML = options.map(o => `<option value="${o.hash}">${o.label}</option>`).join('');
}

function changeOtherAdminPassword() {
    if (!SiteAuth.logged || SiteAuth.re !== '7164') {
        showToast("Apenas o Admin Master pode alterar senhas.", "error");
        return;
    }
    const targetHash = document.getElementById('cfg-reset-user')?.value;
    const newPass = document.getElementById('cfg-reset-pass')?.value.trim();
    const confirmPass = document.getElementById('cfg-reset-pass-confirm')?.value.trim();
    if (!targetHash || !newPass || newPass.length !== 4) {
        showToast("Informe a senha com 4 dígitos.", "error");
        return;
    }
    if (newPass !== confirmPass) {
        showToast("A confirmação da senha não confere.", "error");
        return;
    }

    const target = SiteAuth.admins.find(a => a.hash === targetHash);
    if (!target) {
        showToast("Usuário não encontrado.", "error");
        return;
    }
    const decoded = decodeAdminHash(target.hash);
    if (!decoded.re) {
        showToast("Não foi possível identificar o RE.", "error");
        return;
    }

    target.hash = btoa(`${decoded.re}:${newPass}`);
    SiteAuth.admins = normalizeAdmins(SiteAuth.admins);
    saveAdmins();
    renderAdminList();
    document.getElementById('cfg-reset-pass').value = '';
    document.getElementById('cfg-reset-pass-confirm').value = '';
    showToast(`Senha atualizada para ${target.name}.`, "success");
}

function updateMenuStatus() {
    const userReEl = document.getElementById('userRe');
    const siteModeEl = document.getElementById('siteMode');
    const sourceStatusEl = document.getElementById('sourceStatus');
    const nextiActive = CONFIG.useApiNexti && NEXTI_AVAILABLE;
    const adminToolsEl = document.getElementById('adminTools');
    const shadowActionsEl = document.getElementById('shadowActions');
    
    if (userReEl) {
        userReEl.innerHTML = SiteAuth.logged
            ? `<span style="color:#28a745">●</span> ${SiteAuth.user}`
            : `<span style="color:#666">●</span> Desconectado`;
    }

    if (siteModeEl) {
        if (SiteAuth.role === 'supervisor') {
            siteModeEl.innerHTML = `<span class="status-badge-menu view">SUPERVISOR</span>`;
        } else {
            siteModeEl.innerHTML = SiteAuth.mode === 'edit'
                ? `<span class="status-badge-menu edit">EDIÇÃO</span>`
                : `<span class="status-badge-menu view">VISUALIZAÇÃO</span>`;
        }
    }
    
    if (sourceStatusEl) {
        sourceStatusEl.innerHTML = `
            <div>Fonte atual: CSV</div>
            <div>Nexti: ${nextiActive ? '🟢 Ativo' : '🔴 Inativo'}</div>
            <div>CSV: 🟢 Ativo</div>
        `;
    }

    const keepLoggedEl = document.getElementById('keepLogged');
    if (keepLoggedEl) {
        keepLoggedEl.checked = localStorage.getItem('keepLogged') === '1';
    }

    if (adminToolsEl) {
        adminToolsEl.classList.toggle('hidden', !(SiteAuth.logged && SiteAuth.mode === 'edit' && SiteAuth.role !== 'supervisor'));
    }
    const ftPane = document.getElementById('config-pane-ft');
    if (ftPane && SiteAuth.logged && SiteAuth.mode === 'edit' && SiteAuth.role !== 'supervisor') {
        renderFtReasonsConfig();
    }
    if (shadowActionsEl) {
        shadowActionsEl.classList.toggle('hidden', !(SiteAuth.logged && SiteAuth.mode === 'edit'));
    }

    if (document.getElementById('useNextiToggle')) {
        document.getElementById('useNextiToggle').checked = nextiActive;
        document.getElementById('useNextiToggle').disabled = !NEXTI_AVAILABLE;
    }

    document.getElementById('disableCsvToggle') &&
        (document.getElementById('disableCsvToggle').checked = CONFIG.disableCsvFallback);

    renderDataSourceList();
    updateShadowStatusUI();
    updateAvisosUI();
}

// Toggle de Fonte de Dados (Apenas altera flags)
function toggleSource(type) {
    if (type === 'nexti') {
        CONFIG.useApiNexti = document.getElementById('useNextiToggle').checked;
    }
    if (type === 'csv') {
        CONFIG.disableCsvFallback = document.getElementById('disableCsvToggle').checked;
    }
    updateMenuStatus();
}

function renderAuditList() {
    const list = document.getElementById('auditList');
    if (!list) return;

    if (changeHistory.length > 0) {
        list.innerHTML = changeHistory.slice(0, 20).map(h => `
            <div style="padding:5px;border-bottom:1px solid #333;font-size:0.8rem">
                🟢 Shadow (global)<br>
                <strong>${h.responsavel}</strong> — ${h.acao}<br>
                <span style="color:#999">${h.detalhe}</span>
            </div>
        `).join('');
        return;
    }

    const edits = Object.keys(collaboratorEdits || {});
    const units = Object.keys(unitMetadata || {});
    
    if (edits.length === 0 && units.length === 0) {
        list.innerHTML = '<div style="color:#777;font-style:italic">Nenhuma alteração registrada.</div>';
        return;
    }

    let html = '';

    edits.forEach(re => {
        html += `
            <div style="padding:5px;border-bottom:1px solid #333;font-size:0.8rem">
                🟢 ${collaboratorEdits[re].nome}<br>
                <span style="color:#999">RE ${re} — alteração local</span>
            </div>
        `;
    });
    
    units.forEach(u => {
        html += `
            <div style="padding:5px;border-bottom:1px solid #333;font-size:0.8rem">
                🟡 Unidade ${u}<br>
                <span style="color:#999">Metadados locais</span>
            </div>
        `;
    });

    list.innerHTML = html;
}

function getLocalCollaborators() {
    const stored = localStorage.getItem('localCollaborators');
    if (!stored) return [];
    try { return JSON.parse(stored) || []; } catch { return []; }
}

function saveLocalCollaborators(list, silent = false) {
    localStorage.setItem('localCollaborators', JSON.stringify(list));
    scheduleShadowSync('local-collaborators', { silent });
}

function mergeLocalCollaborators(items, groupKey) {
    const locals = getLocalCollaborators();
    if (!locals.length) return items;

    const filtered = groupKey === 'todos'
        ? locals
        : locals.filter(l => l.grupo === groupKey);

    const existing = new Set(items.map(i => i.re));
    const extras = filtered.filter(l => !existing.has(l.re));
    return items.concat(extras);
}

function addLocalCollaboratorFromConfig() {
    if (!(SiteAuth.logged && SiteAuth.mode === 'edit')) {
        showToast("Apenas admins em modo edição podem adicionar.", "error");
        return;
    }

    const re = document.getElementById('cfg-re').value.trim();
    if (!re) {
        showToast("Informe o RE do colaborador.", "error");
        return;
    }

    const existing = currentData.find(d => d.re === re || d.re?.endsWith(re));
    if (!existing) {
        showToast("Colaborador não encontrado na base carregada.", "error");
        return;
    }

    const locals = getLocalCollaborators();
    if (locals.some(l => l.re === existing.re)) {
        showToast("Colaborador já está no cadastro local.", "info");
        return;
    }

    const newItem = { ...existing };
    locals.push(newItem);
    saveLocalCollaborators(locals);

    document.getElementById('cfg-re').value = '';

    renderizarUnidades();
    if (currentTab === 'busca') realizarBusca();

    changeHistory.unshift({
        data: new Date().toLocaleString(),
        responsavel: SiteAuth.user || 'Admin',
        acao: "Adição",
        detalhe: `Adicionou ${newItem.nome} (RE ${newItem.re}) localmente`
    });

    saveLocalState();
    renderAuditList();
    showToast("Colaborador adicionado localmente.", "success");
}

function changeLocalAdminPassword() {
    if (!SiteAuth.logged || !SiteAuth.re) {
        showToast("Faça login para alterar a senha.", "error");
        return;
    }

    const newPass = document.getElementById('cfg-new-pass').value.trim();
    const confirmPass = document.getElementById('cfg-new-pass-confirm').value.trim();
    if (!newPass || newPass.length !== 4) {
        showToast("Informe 4 dígitos.", "error");
        return;
    }
    if (newPass !== confirmPass) {
        showToast("A confirmação da senha não confere.", "error");
        return;
    }

    const admin = SiteAuth.admins.find(a => a.name === SiteAuth.user);
    if (!admin) {
        showToast("Admin não encontrado.", "error");
        return;
    }

    admin.hash = btoa(`${SiteAuth.re}:${newPass}`);
    saveAdmins();
    if (localStorage.getItem('keepLogged') === '1') {
        localStorage.setItem('authHash', admin.hash);
        localStorage.setItem('authUser', SiteAuth.user || '');
        localStorage.setItem('authRe', SiteAuth.re || '');
    }
    document.getElementById('cfg-new-pass').value = '';
    document.getElementById('cfg-new-pass-confirm').value = '';
    showToast("Senha local alterada com sucesso.", "success");
}

function renderDataSourceList() {
    const list = document.getElementById('dataSourceList');
    if (!list) return;

    const labels = {
        bombeiros: 'Planilha Bombeiros',
        servicos: 'Planilha Serviços',
        seguranca: 'Planilha Segurança',
        rb: 'Planilha RB',
        phones: 'Planilha Telefones'
    };

    const sources = Object.keys(CONFIG.sheets || {}).map(key => ({
        name: labels[key] || `Planilha ${key}`,
        status: 'ATIVO',
        url: toSourceViewUrl(CONFIG.sheets[key])
    }));

    sources.push({ name: 'Nexti API', status: NEXTI_AVAILABLE ? 'ATIVO' : 'INATIVO' });
    sources.push({ name: 'PASTA DO GOOGLE DRIVE', status: 'ATIVO', url: 'https://drive.google.com/drive/folders/1d-z_dHoqrjygeEv1CvL9JRJSjkJcs02m?usp=sharing' });

    list.innerHTML = sources.map(s => {
        if (s.url) {
            return `
                <details class="source-item">
                    <summary>
                        <span>${s.name}</span>
                        <span class="source-pill ${s.status === 'ATIVO' ? 'ok' : 'off'}">${s.status}</span>
                    </summary>
                    <div class="source-link">
                        <a href="${s.url}" target="_blank" rel="noopener noreferrer">Abrir fonte (planilha)</a>
                    </div>
                </details>
            `;
        }
        return `
            <div class="source-row">
                <span>${s.name}</span>
                <span class="source-pill ${s.status === 'ATIVO' ? 'ok' : 'off'}">${s.status}</span>
            </div>
        `;
    }).join('');
}

function toSourceViewUrl(url) {
    if (!url) return url;
    if (url.includes('output=csv')) {
        return url.replace('output=csv', 'pubhtml');
    }
    return url;
}
