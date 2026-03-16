let currentData=[],currentGroup="",currentTab="busca",hiddenUnits=new Set,unitMetadata={},collaboratorEdits={},changeHistory=[],detailPageState=null,detailPageInnerTab="info",minimizedUnits=new Set,lastUpdatedAt=null,unitAddressDb={entries:[],address_map:{},address_map_norm:{}},unitGeoCache={},collaboratorAddressMap={},collaboratorAddressLoaded=!1,collaboratorAddressUpdatedAt=null,substituteTargetRe="",substituteProximityMode="posto",substituteSearchSeq=0,osrmRouteCache=new Map,osrmTableCache=new Map,routeMapInstance=null,routeMapLayer=null,routeMapMarkers=[],routeMapSeq=0,routeModalState=null,addressModalState={mode:"unit",filter:"",collabRe:"",collabName:"",unitName:""},ftPreviewModalState={mode:"collab",re:"",name:"",unit:"",groupKey:"",monthKey:"",selectedDate:""},performanceModalState={re:"",name:""},autoEscalaTimer=null,autoEscalaBound=!1,avisos=[],avisosSeenIds=new Set,allCollaboratorsCache={items:null,updatedAt:0},supaUnitsCache={items:null,updatedAt:0},profilesCache={items:[],updatedAt:0},supabaseHealth={status:"idle",source:"none",lastAttemptAt:null,lastSuccessAt:null,lastCount:0,lastError:""};const SUPABASE_CONFIG=typeof CONFIG<"u"&&CONFIG?.supabase?CONFIG.supabase:{url:"",anonKey:""};let supabaseClient=typeof window<"u"&&window.supabase&&SUPABASE_CONFIG?.url&&SUPABASE_CONFIG?.anonKey?window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey,{auth:{persistSession:!0}}):null;const dataLayer=typeof window<"u"&&window.DunamisDataLayer?window.DunamisDataLayer:null,SUPABASE_TABLES=Object.freeze({colaboradores:"colaboradores",unidades:"unidades",profiles:"profiles",ft_launches:"ft_launches",ft_audit_trail:"ft_audit_trail",avisos:"avisos",change_history:"change_history",app_settings:"app_settings"}),SUPABASE_CACHE_TTL_MS=180*1e3,RECICLAGEM_CACHE_TTL_MS=1800*1e3,COLLAB_SNAPSHOT_KEY="collabSnapshotV4";let exportUnitTarget=null,ftLaunches=[],ftAuditTrail=[],trocaLaunches=[],currentLancamentosMode="ft",currentLancamentosTab="diaria",ftFilter={from:"",to:"",status:"all"},ftHistoryFilter={search:"",unit:"",collab:"",sort:"date_desc",grouped:!0},ftHistoryExpanded=new Set,trocaHistoryFilter={search:"",unit:"",status:"all",sort:"date_desc"},lancamentosPlanningState={ft:{range:"week",anchor:"",selected:""},troca:{range:"week",anchor:"",selected:""}},ftReasons=[],lastFtCreatedId=null,dailySnapshotInProgress=!1,reminderCheckTimer=null,reminderAlertsHidden=!1,searchFilterStatus="all",searchHideAbsence=!1,searchDateFilter={from:"",to:""},unitDateFilter={from:"",to:""},currentContext=null,contextBound=!1,reciclagemData={},reciclagemLoadedAt=null,reciclagemTemplates=[],reciclagemTab="colab",reciclagemOverrides={},reciclagemHistory=[],reciclagemNotes={},reciclagemOnlyExpired=!1,reciclagemRenderCache=[],escalaInvertidaByGroup={},escalaInvertidaAutoMonth=null,reciclagemSyncTimer=null,supervisaoMenu=null,supervisaoHistory=[],supervisaoFavorites=new Set,supervisaoUsage={},preRegisteredEmails=[],supervisaoFilter="internal",supervisaoSearchTerm="",supervisaoChannelPrefs={},supervisaoEditingId=null,supervisaoOpenMessages=new Set,gerenciaDataCache=[],gerenciaFilter={group:"all",from:"",to:""},commandPaletteState={open:!1,activeIndex:0,filtered:[]};const SEARCH_DEBOUNCE_MS=250,FT_AUDIT_MAX_ITEMS=1200,SEARCH_PAGE_SIZE=50;let searchInputComposing=!1,searchInputDebounceId=null,searchAdvancedOpen=!1,searchRecentTerms=[],searchSortBy="relevance",searchSortAsc=!0,searchGroupBy="none",searchViewMode="cards",searchSelectedIds=new Set,searchSelectAll=!1,searchFilterGroup="all",searchFilterCargo="all",searchFilterEscala="all",searchRenderedCount=0,searchTotalFiltered=0,searchFilteredCache=[],searchCurrentTerms=[],searchLastRawResults=[],collaboratorFavorites=new Set,uiTooltipInitialized=!1,activeTooltipEl=null,activeTooltipTarget=null,appLifecycleBound=!1,utilityDrawerOpen=!1,modalA11yBound=!1,globalShortcutsBound=!1;const APP_TIMERS=Object.freeze({reciclagemSync:"reciclagem-sync",reminderCheck:"reminder-check",autoEscala:"auto-escala",searchDebounce:"search-debounce"}),APP_LOG_LEVELS=Object.freeze({error:0,warn:1,info:2,debug:3}),APP_LOG_LEVEL=APP_LOG_LEVELS.info,AppTimerManager={timers:new Map,setInterval(e,t,a){this.clear(e);const o=setInterval(t,a);return this.timers.set(e,{kind:"interval",id:o}),o},setTimeout(e,t,a){this.clear(e);const o=setTimeout(()=>{this.timers.delete(e),t()},a);return this.timers.set(e,{kind:"timeout",id:o}),o},clear(e){const t=this.timers.get(e);t&&(t.kind==="interval"?clearInterval(t.id):clearTimeout(t.id),this.timers.delete(e))},clearAll(){Array.from(this.timers.keys()).forEach(e=>this.clear(e))}},AppEventManager={listeners:[],_normalizeOptions(e){return e??!1},_sameOptions(e,t){return e===t?!0:!e||!t?!1:typeof e=="boolean"||typeof t=="boolean"?e===t:!!e.capture==!!t.capture&&!!e.once==!!t.once&&!!e.passive==!!t.passive},on(e,t,a,o=!1,n={}){if(!e||typeof e.addEventListener!="function"||typeof a!="function")return null;const s=this._normalizeOptions(o),i=n.scope||"global",r=n.key||"";if(r){const l=this.listeners.find(c=>c.scope===i&&c.key===r);if(l)return l.handler}return e.addEventListener(t,a,s),this.listeners.push({target:e,type:t,handler:a,options:s,scope:i,key:r}),a},once(e,t,a,o=!1,n={}){if(!e||typeof a!="function")return null;const s=i=>{this.off(e,t,s,o),a(i)};return this.on(e,t,s,o,n)},off(e,t,a,o=!1){const n=this._normalizeOptions(o),s=this.listeners.findIndex(r=>r.target===e&&r.type===t&&r.handler===a&&this._sameOptions(r.options,n));if(s<0)return;const i=this.listeners[s];i.target.removeEventListener(i.type,i.handler,i.options),this.listeners.splice(s,1)},offScope(e){const t=[];this.listeners.forEach(a=>{a.scope===e?a.target.removeEventListener(a.type,a.handler,a.options):t.push(a)}),this.listeners=t},offAll(){this.listeners.forEach(e=>{e.target.removeEventListener(e.type,e.handler,e.options)}),this.listeners=[]}},AppStateManager={bindings:new Map,subscribers:new Map,register(e,t,a,o={}){!e||typeof t!="function"||typeof a!="function"||this.bindings.set(e,{getter:t,setter:a,validator:typeof o.validator=="function"?o.validator:null})},has(e){return this.bindings.has(e)},get(e,t=void 0){const a=this.bindings.get(e);if(!a)return t;try{return a.getter()}catch{return t}},set(e,t,a={}){const o=this.bindings.get(e);if(!o||o.validator&&!o.validator(t))return!1;const n=this.get(e);return o.setter(t),a.silent||this._notify(e,this.get(e),n),!0},patch(e={},t={}){!e||typeof e!="object"||Object.keys(e).forEach(a=>{this.set(a,e[a],t)})},snapshot(e=null){const t=Array.isArray(e)&&e.length?e:Array.from(this.bindings.keys()),a={};return t.forEach(o=>{a[o]=this.get(o)}),a},subscribe(e,t){if(!e||typeof t!="function")return()=>{};const a=this.subscribers.get(e)||[];return a.push(t),this.subscribers.set(e,a),()=>{const o=this.subscribers.get(e)||[];this.subscribers.set(e,o.filter(n=>n!==t))}},_notify(e,t,a){(this.subscribers.get(e)||[]).forEach(n=>{try{n(t,a,e)}catch{}})}},AppCacheManager={stores:new Map,defineStore(e,t={}){if(!e)return null;const a=this.stores.get(e),o=Number.isFinite(t.ttlMs)?t.ttlMs:0;if(a)return a.ttlMs=o,a;const n={name:e,ttlMs:o,items:new Map};return this.stores.set(e,n),n},ensureStore(e){return this.stores.get(e)||this.defineStore(e,{})},set(e,t,a,o={}){const n=this.ensureStore(e);if(!n)return a;const s=Number.isFinite(o.ttlMs)?o.ttlMs:n.ttlMs,i=s>0?Date.now()+s:0;return n.items.set(String(t),{value:a,expiresAt:i}),a},get(e,t,a=void 0){const o=this.stores.get(e);if(!o)return a;const n=o.items.get(String(t));return n?n.expiresAt>0&&n.expiresAt<Date.now()?(o.items.delete(String(t)),a):n.value:a},has(e,t){return this.get(e,t,void 0)!==void 0},delete(e,t){const a=this.stores.get(e);a&&a.items.delete(String(t))},clear(e){const t=this.stores.get(e);t&&t.items.clear()},clearAll(){this.stores.forEach(e=>e.items.clear())},entries(e){const t=this.stores.get(e);if(!t)return[];const a=Date.now(),o=[];return t.items.forEach((n,s)=>{n.expiresAt>0&&n.expiresAt<a||o.push([s,n.value])}),o}};let appStateBindingsReady=!1,appCacheHydrated=!1;function registerAppStateBindings(){if(appStateBindingsReady)return;appStateBindingsReady=!0;const e=(t,a,o,n=null)=>{AppStateManager.register(t,a,o,n?{validator:n}:{})};e("currentData",()=>currentData,t=>{currentData=Array.isArray(t)?t:[]},Array.isArray),e("currentGroup",()=>currentGroup,t=>{currentGroup=String(t||"")}),e("currentTab",()=>currentTab,t=>{currentTab=String(t||"busca")}),e("hiddenUnits",()=>hiddenUnits,t=>{hiddenUnits=t instanceof Set?t:new Set(t||[])}),e("unitMetadata",()=>unitMetadata,t=>{unitMetadata=t&&typeof t=="object"?t:{}}),e("collaboratorEdits",()=>collaboratorEdits,t=>{collaboratorEdits=t&&typeof t=="object"?t:{}}),e("changeHistory",()=>changeHistory,t=>{changeHistory=Array.isArray(t)?t:[]},Array.isArray),e("minimizedUnits",()=>minimizedUnits,t=>{minimizedUnits=t instanceof Set?t:new Set(t||[])}),e("lastUpdatedAt",()=>lastUpdatedAt,t=>{lastUpdatedAt=t||null}),e("unitGeoCache",()=>unitGeoCache,t=>{unitGeoCache=t&&typeof t=="object"?t:{}}),e("allCollaboratorsCache",()=>allCollaboratorsCache,t=>{allCollaboratorsCache=t&&typeof t=="object"?t:{items:null,updatedAt:0}}),e("avisos",()=>avisos,t=>{avisos=Array.isArray(t)?t:[]},Array.isArray),e("ftLaunches",()=>ftLaunches,t=>{ftLaunches=Array.isArray(t)?t:[]},Array.isArray),e("ftAuditTrail",()=>ftAuditTrail,t=>{ftAuditTrail=Array.isArray(t)?t:[]},Array.isArray),e("trocaLaunches",()=>trocaLaunches,t=>{trocaLaunches=Array.isArray(t)?t:[]},Array.isArray),e("searchFilterStatus",()=>searchFilterStatus,t=>{searchFilterStatus=String(t||"all")}),e("searchHideAbsence",()=>searchHideAbsence,t=>{searchHideAbsence=!!t}),e("searchDateFilter",()=>searchDateFilter,t=>{searchDateFilter=t&&typeof t=="object"?t:{from:"",to:""}}),e("unitDateFilter",()=>unitDateFilter,t=>{unitDateFilter=t&&typeof t=="object"?t:{from:"",to:""}}),e("reciclagemData",()=>reciclagemData,t=>{reciclagemData=t&&typeof t=="object"?t:{}}),e("reciclagemLoadedAt",()=>reciclagemLoadedAt,t=>{reciclagemLoadedAt=t||null}),e("reciclagemRenderCache",()=>reciclagemRenderCache,t=>{reciclagemRenderCache=Array.isArray(t)?t:[]},Array.isArray),e("commandPaletteState",()=>commandPaletteState,t=>{commandPaletteState=t&&typeof t=="object"?t:{open:!1,activeIndex:0,filtered:[]}})}function ensureCoreCacheStores(){AppCacheManager.defineStore("all-collaborators",{ttlMs:300*1e3}),AppCacheManager.defineStore("unit-geo",{ttlMs:0}),AppCacheManager.defineStore("osrm-route",{ttlMs:0}),AppCacheManager.defineStore("osrm-table",{ttlMs:0}),AppCacheManager.defineStore("reciclagem-render",{ttlMs:0})}function hydrateManagedCachesFromLegacy(){ensureCoreCacheStores();const e=Date.now();if(allCollaboratorsCache?.items&&Array.isArray(allCollaboratorsCache.items)){const t=Math.max(0,e-Number(allCollaboratorsCache.updatedAt||0)),a=Math.max(1,300*1e3-t);AppCacheManager.set("all-collaborators","items",allCollaboratorsCache.items,{ttlMs:a})}unitGeoCache&&typeof unitGeoCache=="object"&&Object.entries(unitGeoCache).forEach(([t,a])=>{!t||!a||AppCacheManager.set("unit-geo",t,a)}),osrmRouteCache instanceof Map&&osrmRouteCache.forEach((t,a)=>{!a||!t||AppCacheManager.set("osrm-route",a,t)}),osrmTableCache instanceof Map&&osrmTableCache.forEach((t,a)=>{!a||!t||AppCacheManager.set("osrm-table",a,t)}),Array.isArray(reciclagemRenderCache)&&AppCacheManager.set("reciclagem-render","items",reciclagemRenderCache)}function initializeCoreManagers(){registerAppStateBindings(),ensureCoreCacheStores(),appCacheHydrated||(hydrateManagedCachesFromLegacy(),appCacheHydrated=!0)}function getAppState(e,t=void 0){return initializeCoreManagers(),AppStateManager.get(e,t)}function setAppState(e,t,a={}){return initializeCoreManagers(),AppStateManager.set(e,t,a)}function getCachedAllCollaborators(){initializeCoreManagers();const e=AppCacheManager.get("all-collaborators","items",null);return Array.isArray(e)?e:null}function setCachedAllCollaborators(e,t=300*1e3){initializeCoreManagers(),Array.isArray(e)&&(AppCacheManager.set("all-collaborators","items",e,{ttlMs:t}),allCollaboratorsCache={items:e,updatedAt:Date.now()})}function getCachedUnitGeo(e){initializeCoreManagers();const t=String(e||"");if(!t)return null;const a=AppCacheManager.get("unit-geo",t,null);if(a)return a;const o=unitGeoCache[t];return o?(AppCacheManager.set("unit-geo",t,o),o):null}function setCachedUnitGeo(e,t){initializeCoreManagers();const a=String(e||"");!a||!t||(AppCacheManager.set("unit-geo",a,t),unitGeoCache[a]=t)}function getCachedOsrmTable(e){initializeCoreManagers();const t=AppCacheManager.get("osrm-table",e,null);if(t)return t;if(osrmTableCache.has(e)){const a=osrmTableCache.get(e);return AppCacheManager.set("osrm-table",e,a),a}return null}function setCachedOsrmTable(e,t){initializeCoreManagers(),!(!e||!t)&&(AppCacheManager.set("osrm-table",e,t),osrmTableCache.set(e,t))}function getCachedOsrmRoute(e){initializeCoreManagers();const t=AppCacheManager.get("osrm-route",e,null);if(t)return t;if(osrmRouteCache.has(e)){const a=osrmRouteCache.get(e);return AppCacheManager.set("osrm-route",e,a),a}return null}function setCachedOsrmRoute(e,t){initializeCoreManagers(),!(!e||!t)&&(AppCacheManager.set("osrm-route",e,t),osrmRouteCache.set(e,t))}function clearAllAppTimers(e={}){AppTimerManager.clearAll(),reciclagemSyncTimer=null,reminderCheckTimer=null,autoEscalaTimer=null,searchInputDebounceId=null,e.clearEvents&&AppEventManager.offAll()}function bindAppLifecycle(){appLifecycleBound||(appLifecycleBound=!0,initializeCoreManagers(),AppEventManager.on(window,"beforeunload",()=>clearAllAppTimers({clearEvents:!0}),!1,{scope:"lifecycle",key:"beforeunload-clear-all"}),AppEventManager.on(window,"error",e=>{const t=e?.error||new Error(e?.message||"Unhandled error event");AppErrorHandler.capture(t,{scope:"window-error",file:e?.filename||"",line:e?.lineno||0,col:e?.colno||0},{silent:!0})},!1,{scope:"lifecycle",key:"window-error-capture"}),AppEventManager.on(window,"unhandledrejection",e=>{const t=e?.reason instanceof Error?e.reason:new Error(String(e?.reason||"Unhandled promise rejection"));AppErrorHandler.capture(t,{scope:"window-unhandledrejection"},{silent:!0})},!1,{scope:"lifecycle",key:"window-unhandledrejection-capture"}))}function scheduleSearchExecution(){AppTimerManager.clear(APP_TIMERS.searchDebounce);const e=document.getElementById("search-input")?.value||"";(!!String(e).trim()||searchFilterStatus!=="all"||hasDateRangeFilter(searchDateFilter))&&!isSubstituteSearchEnabled()&&renderSearchLoadingSkeleton(),searchInputDebounceId=AppTimerManager.setTimeout(APP_TIMERS.searchDebounce,()=>{searchInputDebounceId=null,!searchInputComposing&&realizarBusca()},SEARCH_DEBOUNCE_MS)}function flushSearchExecution(){AppTimerManager.clear(APP_TIMERS.searchDebounce),searchInputDebounceId=null,realizarBusca()}function clearTabScopedTimers(e=""){String(e||"")!=="busca"&&(AppTimerManager.clear(APP_TIMERS.searchDebounce),searchInputDebounceId=null,searchInputComposing=!1)}const AppLogger={log(e,t,a){if((APP_LOG_LEVELS[e]??APP_LOG_LEVELS.info)>APP_LOG_LEVEL)return;const s=`[${new Date().toISOString()}] [${String(e||"info").toUpperCase()}] ${t}`;if(a!==void 0){e==="error"?console.error(s,a):e==="warn"?console.warn(s,a):console.log(s,a);return}e==="error"?console.error(s):e==="warn"?console.warn(s):console.log(s)},error(e,t){this.log("error",e,t)},warn(e,t){this.log("warn",e,t)},info(e,t){this.log("info",e,t)},debug(e,t){this.log("debug",e,t)}},AppErrorHandler={capture(e,t={},a={}){const o=t?.scope||"app",n=e instanceof Error?e:new Error(String(e||"Erro desconhecido")),s={scope:o,message:n.message,stack:n.stack||"",context:t};return a.silent?AppLogger.debug(`${o}: ${n.message}`,s):AppLogger.error(`${o}: ${n.message}`,s),a.toastMessage&&typeof showToast=="function"&&showToast(a.toastMessage,"error"),s}};typeof window<"u"&&(window.AppLogger=AppLogger,window.AppErrorHandler=AppErrorHandler,window.AppTimerManager=AppTimerManager,window.AppEventManager=AppEventManager,window.AppState=AppStateManager,window.AppCache=AppCacheManager);function validateReciclagemEntry(e){if(!e||typeof e!="object")return!1;const t=normalizeReValueLoose(e.re||""),a=String(e.name||"").trim(),o=String(e.unit||"").trim();return!(!t&&!a&&!o||e.expiry&&!(e.expiry instanceof Date)||e.expiry instanceof Date&&Number.isNaN(e.expiry.getTime()))}const SiteAuth={logged:!1,mode:"view",user:null,re:null,role:"operacional",email:null,id:null,groups:[],profile:null,admins:[]},ROLE_LABELS={visitante:"Visitante",operacional:"Operacional",supervisor:"Supervisor",coordenador:"Coordenador",gerencia:"Ger\xEAncia",administrador:"Administrador"},ROLE_PERMS={visitante:{canEdit:!1,canManageUsers:!1,canViewAllGroups:!1},operacional:{canEdit:!1,canManageUsers:!1,canViewAllGroups:!1},supervisor:{canEdit:!0,canManageUsers:!1,canViewAllGroups:!1},coordenador:{canEdit:!0,canManageUsers:!1,canViewAllGroups:!0},gerencia:{canEdit:!0,canManageUsers:!1,canViewAllGroups:!0},administrador:{canEdit:!0,canManageUsers:!0,canViewAllGroups:!0}};function getRolePerms(e){return ROLE_PERMS[e]||ROLE_PERMS.operacional}function canEditBase(){return SiteAuth.logged&&getRolePerms(SiteAuth.role).canEdit}function canManageUsers(){return SiteAuth.logged&&getRolePerms(SiteAuth.role).canManageUsers}function canViewAllGroups(){return SiteAuth.logged&&getRolePerms(SiteAuth.role).canViewAllGroups}function isSupabaseReady(){if(!supabaseClient&&typeof window<"u"&&window.supabase&&SUPABASE_CONFIG?.url&&SUPABASE_CONFIG?.anonKey)try{supabaseClient=window.supabase.createClient(SUPABASE_CONFIG.url,SUPABASE_CONFIG.anonKey,{auth:{persistSession:!0}})}catch{}return!!supabaseClient}function isBootstrapAdmin(e){const t=CONFIG?.auth?.bootstrapAdmins||[],a=String(e||"").trim().toLowerCase();return!!a&&t.some(o=>String(o||"").trim().toLowerCase()===a)}function normalizeProfileGroups(e){return Array.isArray(e)?e.map(t=>String(t||"").trim().toLowerCase()).filter(Boolean):e==null?[]:typeof e=="string"?e.split(",").map(t=>t.trim().toLowerCase()).filter(Boolean):[]}function resetAuthState(){SiteAuth.logged=!1,SiteAuth.user=null,SiteAuth.re=null,SiteAuth.role="visitante",SiteAuth.email=null,SiteAuth.id=null,SiteAuth.groups=[],SiteAuth.profile=null,SiteAuth.admins=[],SiteAuth.mode="view",document.body.classList.remove("mode-edit"),updateAuthUiState(),_cleanupRealtimeSubscriptions()}function updateAuthUiState(){const e=document.getElementById("config-login"),t=document.getElementById("config-content");!e||!t||(SiteAuth.logged?(e.classList.add("hidden"),t.classList.remove("hidden")):(e.classList.remove("hidden"),t.classList.add("hidden")))}async function loadOrCreateProfile(e){if(!isSupabaseReady()||!e?.id)return null;try{const{data:t,error:a}=await supabaseClient.from(SUPABASE_TABLES.profiles).select("*").eq("id",e.id).maybeSingle();if(a&&a.code!=="PGRST116")return a.code==="42P01"&&showToast("Tabela profiles n\xE3o existe no Supabase.","warning"),null;if(t)return t;const o=(preRegisteredEmails||[]).find(l=>String(l?.email||"").toLowerCase()===String(e.email||"").toLowerCase()),n=isBootstrapAdmin(e.email)?"administrador":o?.role||"visitante",s=o?.groups||[],i={id:e.id,email:e.email||"",role:n,groups:s},r=await supabaseClient.from(SUPABASE_TABLES.profiles).insert(i).select("*").maybeSingle();return r.error?i:r.data||i}catch{return null}}async function fetchCollaboratorByEmail(e){if(!isSupabaseReady()||!e)return null;try{const{data:t,error:a}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).select("*").ilike("email_login",String(e).trim()).maybeSingle();return a?null:t?mapSupabaseCollaboratorRow(t):null}catch{return null}}async function fetchProfiles(e=!1){if(!isSupabaseReady())return[];if(!canManageUsers())return[];const t=Date.now();if(!e&&profilesCache.items.length&&t-profilesCache.updatedAt<SUPABASE_CACHE_TTL_MS)return profilesCache.items;try{let o=[],n=0,s=null;for(;;){const{data:i,error:r}=await supabaseClient.from(SUPABASE_TABLES.profiles).select("*").range(n,n+1e3-1);if(r){s=r;break}if(o=o.concat(i||[]),!i||i.length<1e3)break;n+=1e3}return s?(AppErrorHandler.capture(s,{scope:"fetch-profiles"},{silent:!0}),profilesCache.items||[]):(profilesCache={items:o,updatedAt:t},profilesCache.items)}catch(a){return AppErrorHandler.capture(a,{scope:"fetch-profiles"},{silent:!0}),profilesCache.items||[]}}async function refreshAssignableUsers(e=!1){if(!SiteAuth.logged){SiteAuth.admins=[];return}if(canManageUsers()){const t=await fetchProfiles(e);SiteAuth.admins=(t||[]).map(a=>({id:a.id,name:a.display_name||a.email||"Usu\xE1rio",re:a.re_padrao||a.matricula||"",role:a.role||"operacional",email:a.email||"",groups:normalizeProfileGroups(a.groups)}));return}SiteAuth.admins=[{id:SiteAuth.id,name:SiteAuth.user||SiteAuth.email||"Usu\xE1rio",re:SiteAuth.re||"",role:SiteAuth.role||"operacional",email:SiteAuth.email||""}]}async function applyAuthSession(e,t={}){if(!e?.user){resetAuthState(),updateMenuStatus();return}const a=e.user;SiteAuth.logged=!0,SiteAuth.id=a.id,SiteAuth.email=a.email||"";const o=await loadOrCreateProfile(a);SiteAuth.profile=o;const n=o?.role||(isBootstrapAdmin(a.email)?"administrador":"visitante");SiteAuth.role=n,SiteAuth.groups=normalizeProfileGroups(o?.groups);const s=await fetchCollaboratorByEmail(a.email||"");if(s){if(SiteAuth.user=s.nome||s.colaborador||a.email,SiteAuth.re=s.re||s.re_padrao||s.matricula||"",!SiteAuth.groups.length&&s.grupo&&s.grupo!=="todos"&&(SiteAuth.groups=[s.grupo]),o?.id){const i={};!o.display_name&&s.nome&&(i.display_name=s.nome),!o.matricula&&s.matricula&&(i.matricula=s.matricula),!o.re_padrao&&s.re_padrao&&(i.re_padrao=s.re_padrao),Object.keys(i).length&&supabaseClient.from(SUPABASE_TABLES.profiles).update(i).eq("id",o.id).then(()=>{}).catch(r=>AppErrorHandler.capture(r,{scope:"profile-update"},{silent:!0}))}}else SiteAuth.user=o?.display_name||a.email||"Usu\xE1rio",SiteAuth.re=o?.re_padrao||o?.matricula||"";SiteAuth.mode=canEditBase()?"edit":"view",document.body.classList.toggle("mode-edit",SiteAuth.mode==="edit"),updateAuthUiState(),await refreshAssignableUsers(!0),updateMenuStatus(),_setupRealtimeSubscriptions(),CONFIG?.auth?.requireLogin&&showGatewayScreen()}async function handlePasswordRecovery(){const e=prompt("Digite a nova senha:");if(!e||e.length<6){showToast("Senha inv\xE1lida. Use pelo menos 6 caracteres.","error");return}const{error:t}=await supabaseClient.auth.updateUser({password:e});if(t){showToast("Falha ao atualizar senha.","error");return}showToast("Senha atualizada com sucesso.","success")}async function initSupabaseAuth(){if(isSupabaseReady()){if(localStorage.getItem("sessionOnly")==="1"&&!sessionStorage.getItem("sessionActive")){await supabaseClient.auth.signOut(),localStorage.removeItem("sessionOnly");return}try{const{data:e}=await supabaseClient.auth.getSession();e?.session&&(await applyAuthSession(e.session,{silent:!0}),clearSearchStateAfterAuth())}catch{}supabaseClient.auth.onAuthStateChange(async(e,t)=>{try{if(e==="PASSWORD_RECOVERY"){await handlePasswordRecovery();return}if(e==="SIGNED_OUT"||!t){resetAuthState(),updateMenuStatus();return}await applyAuthSession(t,{event:e})}catch(a){AppErrorHandler.capture(a,{scope:"auth-state-change"},{silent:!0})}})}}const ROADMAP_ITEMS=[{title:"Supabase como fonte \xFAnica",status:"concluido",area:"Base de dados",detail:"Leitura e grava\xE7\xE3o centralizada de colaboradores e unidades."},{title:"Auth + perfis + permiss\xF5es",status:"andamento",area:"Seguran\xE7a",detail:"Login com e-mail/senha, roles e grupos por usu\xE1rio."},{title:"Confer\xEAncia de documentos",status:"planejado",area:"Opera\xE7\xE3o",detail:"Checklist de dados/documentos para cada colaborador."},{title:"Confer\xEAncia de postos",status:"planejado",area:"Supervis\xE3o",detail:"Valida\xE7\xE3o de efetivo por posto com justificativas."},{title:"Solicita\xE7\xE3o de remanejamento",status:"planejado",area:"Processos",detail:"Fluxo de pedidos e aprova\xE7\xF5es com impacto em FT/VT."},{title:"Controle de ve\xEDculos",status:"planejado",area:"Frota",detail:"Registro de uso, rota e hor\xE1rios por supervisor/coordenador."}],CONTEXT_HELP_CONTENT={gateway:{title:"P\xE1gina Inicial",lines:["Selecione um grupo para abrir a opera\xE7\xE3o.","Use Supervis\xE3o para links e mensagens r\xE1pidas.","Ger\xEAncia est\xE1 em placeholder at\xE9 pr\xF3xima evolu\xE7\xE3o."]},busca:{title:"Busca R\xE1pida",lines:["Pesquise por nome, RE ou unidade.","Use filtros por status e per\xEDodo de FT.","Bot\xE3o de mapa vermelho indica endere\xE7o n\xE3o cadastrado."]},unidades:{title:"Unidades",lines:["Visualize plant\xE3o e folga por unidade.","Use o mapa para endere\xE7o, copiar e abrir rota.","Resumo semanal FT aparece no topo de cada unidade."]},avisos:{title:"Avisos",lines:["Acompanhe pend\xEAncias e respons\xE1veis.","Use lembretes para follow-up autom\xE1tico.","Filtre por unidade para a\xE7\xE3o r\xE1pida."]},reciclagem:{title:"Reciclagem",lines:["Filtre por tipo, status e colaborador.","Cards focam na execu\xE7\xE3o sem resumo KPI.","Use exporta\xE7\xE3o para relat\xF3rios externos."]},lancamentos:{title:"Lan\xE7amentos",lines:["Aba Di\xE1ria prioriza execu\xE7\xE3o do dia.","Dashboard mant\xE9m vis\xE3o gerencial de FT/Troca.","Hist\xF3rico concentra auditoria e corre\xE7\xF5es."]},config:{title:"Configura\xE7\xE3o",lines:["Valide fontes antes da opera\xE7\xE3o.","Roadmap mostra evolu\xE7\xE3o e status interno.","Snapshot di\xE1rio aumenta seguran\xE7a de restaura\xE7\xE3o."]},supervisao:{title:"Supervis\xE3o",lines:["Acesso r\xE1pido a mensagens e links padr\xE3o.","Favoritos e hist\xF3rico aceleram atendimento.","Use filtros por p\xFAblico para reduzir ru\xEDdo."]},gerencia:{title:"Ger\xEAncia",lines:["Menu em modo placeholder conforme solicitado.","Estrutura preservada para retomada futura."]}};function isAdminRole(){return SiteAuth.logged&&(SiteAuth.role==="administrador"||SiteAuth.role==="gerencia")}function getGroupLabelMap(){const e={todos:"Todos os Grupos"};return(CONFIG?.groupRules||[]).forEach(t=>{t?.key&&(e[t.key]=t.label||t.key)}),e}function getAllowedGroups(){const t=(CONFIG?.groupRules||[]).map(a=>a.key).filter(Boolean);return!SiteAuth.logged||canViewAllGroups()?t:Array.isArray(SiteAuth.groups)&&SiteAuth.groups.length?SiteAuth.groups.filter(a=>t.includes(a)):t}function getUserGroupKey(){if(SiteAuth.logged&&Array.isArray(SiteAuth.groups)&&SiteAuth.groups.length===1)return SiteAuth.groups[0];if(SiteAuth.re){const e=currentData.find(a=>a.re===SiteAuth.re||a.re?.endsWith(SiteAuth.re));if(e?.grupo)return e.grupo;const t=(allCollaboratorsCache.items||[]).find(a=>a.re===SiteAuth.re||a.re?.endsWith(SiteAuth.re));if(t?.grupo)return t.grupo}return currentGroup||"todos"}function getGroupOptionsHtml(){const e=getGroupLabelMap(),t=getAllowedGroups();if(canViewAllGroups())return'<option value="all">Todos os Grupos</option>'+t.map(a=>`<option value="${a}">${e[a]||a.toUpperCase()}</option>`).join("");if(!t.length)return'<option value="all">Todos os Grupos</option>';if(t.length===1){const a=t[0];return`<option value="${a}">${e[a]||a.toUpperCase()}</option>`}return'<option value="all">Todos os Grupos</option>'+t.map(a=>`<option value="${a}">${e[a]||a.toUpperCase()}</option>`).join("")}function updateBreadcrumb(){const e=document.getElementById("breadcrumb-group"),t=document.getElementById("breadcrumb-tab"),a=document.getElementById("breadcrumb-context"),o=document.getElementById("breadcrumb-updated"),n=document.getElementById("breadcrumb-group-pill");if(!e||!t)return;const s=getGroupLabelMap(),i={busca:"Busca R\xE1pida",unidades:"Unidades",gerencia:"Ger\xEAncia",supervisao:"Supervis\xE3o",avisos:"Avisos",lancamentos:"Lan\xE7amentos",config:"Configura\xE7\xE3o"},r=s[currentGroup]||(currentGroup?currentGroup.toUpperCase():"Grupo"),l=i[currentTab]||"Se\xE7\xE3o";if(e.textContent=`Gateway \u203A ${r}`,t.textContent=l,a){const c=currentContext?.unit?`Unidade: ${currentContext.unit}`:currentContext?.re?`RE ${currentContext.re}`:"Vis\xE3o geral";a.textContent=c}n&&(n.textContent=`Grupo: ${r}`),o&&(o.textContent=lastUpdatedAt?`Atualizado: ${lastUpdatedAt.toLocaleString()}`:"")}function saveSearchRecentTerms(){}function pushSearchRecentTerm(){}function saveCollaboratorFavorites(){try{localStorage.setItem("collabFavorites",JSON.stringify(Array.from(collaboratorFavorites)))}catch{}}function isCollaboratorFavorite(e){const t=normalizeFtRe(e);return t?collaboratorFavorites.has(t):!1}function toggleCollaboratorFavorite(e){const t=normalizeFtRe(e);if(!t)return;collaboratorFavorites.has(t)?collaboratorFavorites.delete(t):collaboratorFavorites.add(t),saveCollaboratorFavorites();const a=document.getElementById("search-input")?.value||"";runStandardSearch(a,document.getElementById("search-results"),searchFilterStatus||"all",!!searchHideAbsence)}function clearSearchInput(){const e=document.getElementById("search-input");if(!e)return;e.value="",searchFilterGroup="all",searchFilterCargo="all",searchFilterEscala="all",searchFilterStatus="all",searchHideAbsence=!1;const t=document.getElementById("search-group-filter"),a=document.getElementById("search-cargo-filter"),o=document.getElementById("search-escala-filter"),n=document.getElementById("search-autocomplete"),s=document.getElementById("search-clear-btn");t&&(t.value="all"),a&&(a.value="all"),o&&(o.value="all"),n&&n.classList.add("hidden"),s&&s.classList.add("hidden"),realizarBusca()}function clearSearchStateAfterAuth(){const e=document.getElementById("search-input");e&&(e.value="");const t=document.getElementById("search-clear-btn");t&&t.classList.add("hidden");const a=document.getElementById("search-autocomplete");a&&a.classList.add("hidden"),searchFilterGroup="all",searchFilterCargo="all",searchFilterEscala="all",searchFilterStatus="all",searchHideAbsence=!1;const o=new URLSearchParams(window.location.search);if(o.has("q")||o.has("filter")||o.has("grupo")){o.delete("q"),o.delete("filter"),o.delete("grupo"),o.get("tab")==="busca"&&o.delete("tab");const s=o.toString()?`${window.location.pathname}?${o.toString()}`:window.location.pathname;history.replaceState(null,"",s)}document.getElementById("search-results")&&realizarBusca()}function setSearchFilterGroup(e){searchFilterGroup=e,updateSearchFilterUI(),realizarBusca()}function setSearchFilterCargo(e){searchFilterCargo=e,updateSearchFilterUI(),realizarBusca()}function setSearchFilterEscala(e){searchFilterEscala=e,updateSearchFilterUI(),realizarBusca()}function populateSearchFilterDropdowns(){const e=[...new Set(currentData.map(n=>n.cargo).filter(Boolean))].sort(),t=[...new Set(currentData.map(n=>n.escala).filter(Boolean))].sort(),a=document.getElementById("search-cargo-filter"),o=document.getElementById("search-escala-filter");a&&(a.innerHTML='<option value="all">Todos os Cargos</option>'+e.map(n=>`<option value="${n}">${n}</option>`).join("")),o&&(o.innerHTML='<option value="all">Todas as Escalas</option>'+t.map(n=>`<option value="${n}">${n}</option>`).join(""))}function renderSearchAutocomplete(){}function applyAutocomplete(){}function hideSearchAutocomplete(){}function applySearchDeepLink(){const e=new URLSearchParams(window.location.search),t=e.get("q"),a=e.get("filter"),o=e.get("grupo");if(e.get("tab")==="busca"||t||a){if(t){const s=document.getElementById("search-input");s&&(s.value=t)}a&&["all","plantao","folga","ft","afastado","favorites"].includes(a)&&(searchFilterStatus=a),o&&(searchFilterGroup=o),switchTab("busca"),realizarBusca()}}function updateSearchDeepLink(){const e=document.getElementById("search-input"),t=e?e.value.trim():"",a=new URLSearchParams;t&&a.set("q",t),searchFilterStatus!=="all"&&a.set("filter",searchFilterStatus),searchFilterGroup!=="all"&&a.set("grupo",searchFilterGroup),a.toString()&&a.set("tab","busca");const o=a.toString()?`${window.location.pathname}?${a.toString()}`:window.location.pathname;history.replaceState(null,"",o)}function getRelativeTimeLabel(e){if(!(e instanceof Date)||Number.isNaN(e.getTime()))return"sem atualiza\xE7\xE3o";const t=Date.now()-e.getTime(),a=Math.max(0,Math.floor(t/6e4));if(a<1)return"agora";if(a<60)return`h\xE1 ${a} min`;const o=Math.floor(a/60);return o<24?`h\xE1 ${o}h`:`h\xE1 ${Math.floor(o/24)}d`}function updateSearchSummary(e=0,t=0){const a=document.getElementById("search-summary");if(!a)return;(!Number.isFinite(e)||e<0)&&(e=0),(!Number.isFinite(t)||t<0)&&(t=currentData.length);const o=getRelativeTimeLabel(lastUpdatedAt);a.innerHTML=`
        <span><strong>${e}</strong> de <strong>${t}</strong> colaborador(es)</span>
        <span class="search-summary-meta">Atualizado ${o}</span>
    `,a.classList.toggle("hidden",!1)}function renderSearchLoadingSkeleton(){const e=document.getElementById("search-results");e&&(e.innerHTML=`
        <div class="search-skeleton-grid" aria-hidden="true">
            <div class="skeleton-card">
                <div class="skeleton-line w-40"></div>
                <div class="skeleton-line w-90"></div>
                <div class="skeleton-line w-70"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-line w-60"></div>
                <div class="skeleton-line w-90"></div>
                <div class="skeleton-line w-70"></div>
            </div>
            <div class="skeleton-card">
                <div class="skeleton-line w-40"></div>
                <div class="skeleton-line w-90"></div>
                <div class="skeleton-line w-70"></div>
            </div>
        </div>
    `)}function applyRequiredFieldHints(){["aviso-assignee-select","aviso-message","reminder-assignee-select","reminder-message","ft-unit-target","ft-date","ft-shift","ft-reason"].forEach(t=>{const a=document.getElementById(t);if(!(a instanceof HTMLElement))return;"required"in a&&(a.required=!0);const n=a.closest(".form-group")?.querySelector("label");if(!n||n.querySelector(".required-mark"))return;const s=document.createElement("span");s.className="required-mark",s.textContent="*",n.appendChild(s)})}function renderSearchRecentPanel(){}function applyRecentSearch(){}function getFavoriteCollaboratorsByTerm(e=""){const t=String(e||"").trim().toUpperCase();return(currentData||[]).filter(o=>o&&isCollaboratorFavorite(o.re)).filter(o=>t?o.nome&&o.nome.includes(t)||o.re&&o.re.includes(t)||o.posto&&o.posto.includes(t):!0).sort((o,n)=>String(o.nome||"").localeCompare(String(n.nome||""),"pt-BR"))}function renderSearchFavoritesPanel(e=""){const t=document.getElementById("search-favorites"),a=document.getElementById("search-favorites-list");if(!t||!a)return;const o=getFavoriteCollaboratorsByTerm(e).slice(0,8);if(!o.length){t.classList.add("hidden");return}a.innerHTML=o.map(n=>`
        <div class="search-favorite-item">
            <span>${escapeHtml(n.nome||"N/I")} (${escapeHtml(n.re||"N/I")})</span>
            <button type="button" class="btn-mini btn-secondary" onclick="focusFavoriteCollaborator('${escapeHtml(n.re||"")}')">Abrir</button>
        </div>
    `).join(""),t.classList.remove("hidden")}function focusFavoriteCollaborator(e){const t=document.getElementById("search-input");if(!t)return;const a=(currentData||[]).find(o=>matchesRe(o?.re,e));a&&(t.value=a.re||a.nome||"",flushSearchExecution())}function toggleSearchAdvanced(){searchAdvancedOpen=!searchAdvancedOpen;const e=document.getElementById("search-advanced-panel");e&&e.classList.toggle("hidden",!searchAdvancedOpen)}function toggleInvertPanelOpen(){const e=document.getElementById("invert-plantao-panel");if(!e)return;if(!e.classList.contains("hidden")){e.classList.add("hidden");return}const t=!currentGroup||currentGroup==="todos",a=t?null:getGroupLabelMap()[currentGroup]||currentGroup,o=t?"todos os colaboradores de <strong>todos os grupos</strong>":`todos os colaboradores do grupo <strong>${escapeHtml(a)}</strong>`,n=(CONFIG?.groupRules||[]).map(r=>r?.key).filter(Boolean),i=(t?n.length>0&&n.every(r=>isGroupInvertido(r)):isGroupInvertido(currentGroup))?"PLANT\xC3O voltar\xE1 a aparecer como <strong>PLANT\xC3O</strong> e FOLGA como <strong>FOLGA</strong>.":"PLANT\xC3O passar\xE1 a aparecer como <strong>FOLGA</strong> e FOLGA como <strong>PLANT\xC3O</strong>.";e.innerHTML=`
        <div class="bip-panel-inner">
            <span class="bip-panel-icon">\u21C4</span>
            <span class="bip-text">Afeta ${o}. ${i}</span>
            <div class="bip-panel-actions">
                <button class="btn btn-danger" onclick="confirmInvertPlantao()">Confirmar</button>
                <button class="btn btn-secondary" onclick="document.getElementById('invert-plantao-panel').classList.add('hidden')">Cancelar</button>
            </div>
        </div>
    `,e.classList.remove("hidden")}function confirmInvertPlantao(){toggleEscalaInvertida(currentGroup);const e=document.getElementById("invert-plantao-panel");e&&e.classList.add("hidden"),currentTab==="collab-detail"&&detailPageState?.item&&renderCollabDetailPage(findCollaboratorById(detailPageState.item.id??detailPageState.item.re))}function applySearchDatePreset(e){const t=getTodayKey();if(e==="today"){setSearchDateFilter(t,t);return}if(e==="week"){setSearchDateFilter(getDateKeyWithOffset(t,-6),t);return}if(e==="month"){const a=getMonthRangeByDateKey(t).start;setSearchDateFilter(a,t);return}clearSearchDateFilter()}function syncUtilityDrawer(){const e=document.getElementById("utility-drawer"),t=document.getElementById("utility-menu-btn");e&&(e.classList.toggle("hidden",!utilityDrawerOpen),e.setAttribute("aria-hidden",utilityDrawerOpen?"false":"true"),document.body.classList.toggle("utility-open",utilityDrawerOpen),t&&t.setAttribute("aria-expanded",utilityDrawerOpen?"true":"false"))}function openUtilityDrawer(){utilityDrawerOpen=!0,syncUtilityDrawer()}function closeUtilityDrawer(){utilityDrawerOpen=!1,syncUtilityDrawer()}function toggleUtilityDrawer(){utilityDrawerOpen=!utilityDrawerOpen,syncUtilityDrawer()}function closeTopVisibleModal(){const e=Array.from(document.querySelectorAll(".modal")).filter(a=>!a.classList.contains("hidden"));return e.length?(e[e.length-1].classList.add("hidden"),!0):!1}function syncModalOpenState(){const e=!!document.querySelector(".modal:not(.hidden)");document.body.classList.toggle("modal-open",e)}function bindModalA11y(){if(modalA11yBound)return;modalA11yBound=!0,new MutationObserver(t=>{t.some(a=>a.target instanceof HTMLElement&&a.target.classList.contains("modal"))&&syncModalOpenState()}).observe(document.body,{subtree:!0,attributes:!0,attributeFilter:["class"]}),AppEventManager.on(document,"click",t=>{const a=t.target;a instanceof HTMLElement&&a.classList.contains("modal")&&(a.classList.add("hidden"),syncModalOpenState())},!1,{scope:"modals",key:"modal-backdrop-close"}),AppEventManager.on(document,"keydown",t=>{if(t.key==="Escape"&&!commandPaletteState.open){if(closeTopVisibleModal()){t.preventDefault(),syncModalOpenState();return}utilityDrawerOpen&&(t.preventDefault(),closeUtilityDrawer())}},!1,{scope:"modals",key:"modal-escape-close"}),syncModalOpenState()}function computeSearchFilterCounts(e=""){const t=String(e||"").toUpperCase().trim().split(/\s+/).filter(Boolean),a=t.map(s=>normalizeSearchText(s));let o=(currentData||[]).filter(s=>!(!s||hiddenUnits.has(s.posto)||t.length&&scoreSearchMatch(s,t,a)<=0||searchHideAbsence&&s.rotulo||searchFilterGroup&&searchFilterGroup!=="all"&&s.grupo!==searchFilterGroup||searchFilterCargo&&searchFilterCargo!=="all"&&(s.cargo||"").toUpperCase()!==searchFilterCargo.toUpperCase()||searchFilterEscala&&searchFilterEscala!=="all"&&(s.escala||"")!==searchFilterEscala));hasDateRangeFilter(searchDateFilter)&&(o=o.filter(s=>matchesFtDateFilterForCollaborator(s.re,searchDateFilter)));const n={all:o.length,plantao:0,folga:0,ft:0,afastado:0,favorites:0,noAbsence:0};return o.forEach(s=>{const i=getStatusInfoForFilter(s),r=String(i?.text||""),l=r.includes("PLANT\xC3O")||r.includes("FT");l&&(n.plantao+=1),l||(n.folga+=1),r.includes("FT")&&(n.ft+=1),s.rotulo&&(n.afastado+=1),isCollaboratorFavorite(s.re)&&(n.favorites+=1),s.rotulo||(n.noAbsence+=1)}),n}function updateFilterChipCountLabel(e,t){if(!e)return;e.dataset.baseLabel||(e.dataset.baseLabel=e.textContent.trim().replace(/\(\d+\)$/g,"").trim());const a=e.dataset.baseLabel||"";let o=e.querySelector(".chip-count");o||(o=document.createElement("span"),o.className="chip-count"),o.textContent=String(Number.isFinite(t)?t:0),e.replaceChildren(document.createTextNode(`${a} `),o)}function updateSearchFilterUI(){const e=document.getElementById("search-input")?.value||"",t=computeSearchFilterCounts(e);document.querySelectorAll(".filter-chip[data-filter]").forEach(n=>{const s=n.getAttribute("data-filter"),i=s===searchFilterStatus;n.classList.toggle("active",i),n.setAttribute("aria-pressed",i?"true":"false"),updateFilterChipCountLabel(n,t[s]||0)});const a=document.querySelector(".filter-chip[data-hide]");a&&(a.classList.toggle("active",searchHideAbsence),a.setAttribute("aria-pressed",searchHideAbsence?"true":"false"),updateFilterChipCountLabel(a,t.noAbsence||0));const o=document.querySelector(".search-filters, .search-filters-compact");if(o){const n=searchFilterStatus!=="all"||searchHideAbsence;o.classList.toggle("filters-active",n)}}function setSearchFilterStatus(e){searchFilterStatus=e,updateSearchFilterUI(),realizarBusca()}function toggleSearchHideAbsence(){searchHideAbsence=!searchHideAbsence,updateSearchFilterUI(),realizarBusca()}function setSearchDateFilter(e,t){const a=normalizeDateRange(e,t);searchDateFilter.from=a.from,searchDateFilter.to=a.to;const o=document.getElementById("search-date-from"),n=document.getElementById("search-date-to");o&&o.value!==searchDateFilter.from&&(o.value=searchDateFilter.from),n&&n.value!==searchDateFilter.to&&(n.value=searchDateFilter.to),updateSearchFilterUI(),realizarBusca()}function clearSearchDateFilter(){setSearchDateFilter("","")}function setUnitDateFilter(e,t){const a=normalizeDateRange(e,t);unitDateFilter.from=a.from,unitDateFilter.to=a.to;const o=document.getElementById("unit-date-from"),n=document.getElementById("unit-date-to");o&&o.value!==unitDateFilter.from&&(o.value=unitDateFilter.from),n&&n.value!==unitDateFilter.to&&(n.value=unitDateFilter.to),renderizarUnidades()}function clearUnitDateFilter(){setUnitDateFilter("","")}function toggleSubstituteSearchButton(){}function isSubstituteSearchEnabled(){return!1}function updateSubstituteSearchButton(){}function getSubstituteTarget(){return null}function setSubstituteTarget(){}function clearSubstituteTarget(){}function setSubstituteProximity(){}function updateSubstitutePanel(){}function toggleConfigCard(e){const t=e?.closest(".config-card");t&&t.classList.toggle("collapsed")}function toggleCompactMode(){const e=document.body.classList.toggle("compact-mode");localStorage.setItem("compactMode",e?"1":"0")}function clearContextBar(){currentContext=null;const e=document.getElementById("context-bar");e&&(e.classList.add("hidden"),e.innerHTML="")}function setContextUnit(e){}function setContextCollab(e){}function renderContextBar(){}function bindContextSelection(){contextBound||(contextBound=!0,AppEventManager.on(document,"click",e=>{const t=e.target.closest(".result-card");if(t&&!e.target.closest("button")&&!e.target.closest("a")&&!e.target.closest("select")){const a=t.getAttribute("data-collab-re");a&&isSubstituteSearchEnabled()&&!getSubstituteTarget()&&void 0}},!1,{scope:"context",key:"context-selection-click"}))}function flashAvisoCard(e){const t=document.querySelector(`[data-aviso-id="${e}"]`);t&&(t.classList.remove("pulse"),t.offsetWidth,t.classList.add("pulse"),setTimeout(()=>t.classList.remove("pulse"),1400))}function flashLancamentoCard(e){const t=document.querySelector(`[data-ft-id="${e}"]`);t&&(t.classList.remove("pulse"),t.offsetWidth,t.classList.add("pulse"),setTimeout(()=>t.classList.remove("pulse"),1400))}function canViewAvisoItem(e){return SiteAuth.logged?isAdminRole()?!0:!!(e?.assignedToRe&&SiteAuth.re&&e.assignedToRe===SiteAuth.re):!1}function filterAvisosByVisibility(e){return(e||[]).filter(canViewAvisoItem)}function loadLocalState(){try{const e=localStorage.getItem("collaboratorEdits"),t=localStorage.getItem("unitMetadata"),a=localStorage.getItem("changeHistory");e&&(collaboratorEdits=JSON.parse(e)||{}),t&&(unitMetadata=JSON.parse(t)||{}),a&&(changeHistory=JSON.parse(a)||[])}catch{}try{const e=localStorage.getItem("escalaInvertidaByGroup");if(e!==null)escalaInvertidaByGroup=JSON.parse(e)||{};else{const t=localStorage.getItem("escalaInvertida");if(t!==null){const a=t==="1";(CONFIG?.groupRules||[]).forEach(o=>{o?.key&&(escalaInvertidaByGroup[o.key]=a)})}}}catch{}try{const e=localStorage.getItem("escalaInvertidaAutoMonth");if(e!==null&&e!==""){const t=parseInt(e,10);Number.isNaN(t)||(escalaInvertidaAutoMonth=t)}}catch{}try{const e=localStorage.getItem("collabFavorites"),t=e?JSON.parse(e)||[]:[];collaboratorFavorites=new Set(Array.isArray(t)?t.map(a=>normalizeFtRe(a)).filter(Boolean):[])}catch{collaboratorFavorites=new Set}supabaseClient&&SiteAuth.logged&&(loadChangeHistoryFromSupabase(),_loadAllAppSettings())}function loadAvisos(){try{const e=localStorage.getItem("avisos");avisos=e?JSON.parse(e)||[]:[]}catch{avisos=[]}try{const e=localStorage.getItem("avisosSeen"),t=e?JSON.parse(e)||[]:[];avisosSeenIds=new Set(t)}catch{avisosSeenIds=new Set}supabaseClient&&SiteAuth.logged&&loadAvisosFromSupabase().then(e=>{e&&updateAvisosUI()})}function saveAvisos(e=!1){localStorage.setItem("avisos",JSON.stringify(avisos)),localStorage.setItem("avisosSeen",JSON.stringify(Array.from(avisosSeenIds))),scheduleLocalSync("avisos",{silent:e,notify:!e}),updateAvisosUI()}function clearAvisos(){if(!isAdminRole()){showToast("Apenas admins podem limpar os avisos.","error");return}confirm("Limpar todos os avisos? Esta a\xE7\xE3o n\xE3o pode ser desfeita.")&&(avisos=[],avisosSeenIds=new Set,saveAvisos(),showToast("Avisos limpos.","success"),renderAvisos())}function getFtItemUpdatedTime(e){const t=new Date(e?.updatedAt||0).getTime();if(t)return t;const a=new Date(e?.requestedAt||0).getTime();return a||new Date(e?.createdAt||0).getTime()||0}function buildFtDedupKey(e){const t=String(e?.id||"").trim(),a=normalizeFtDateKey(e?.date)||"",o=normalizeFtRe(e?.collabRe)||normalizeText(e?.collabName||""),n=normalizeUnitKey(e?.unitTarget||e?.unitCurrent||""),s=normalizeFtRe(e?.coveringRe)||normalizeText(e?.coveringOther||e?.coveringName||""),i=String(e?.ftTime||"").trim().toUpperCase(),r=String(e?.shift||"").trim().toUpperCase(),l=normalizeText(e?.reasonRaw||e?.reasonOther||e?.reason||""),c=normalizeText(e?.reasonDetail||""),d=[a,o,n,s,r,i,l,c].filter(Boolean).join("|");return d||(t?`id:${t}`:["ft",e?.createdAt||"",e?.collabName||"",e?.unitTarget||""].join("|"))}function buildFtStatusConflictKey(e){const t=String(e?.id||"").trim(),a=normalizeFtDateKey(e?.date)||"",o=normalizeFtRe(e?.collabRe)||normalizeText(e?.collabName||""),n=normalizeUnitKey(e?.unitTarget||e?.unitCurrent||""),s=String(e?.shift||"").trim().toUpperCase(),i=[a,o,n,s].filter(Boolean).join("|");return i||(t?`id:${t}`:["ft-status",e?.createdAt||"",e?.collabName||"",e?.unitTarget||""].join("|"))}function buildFtStatusConflictVariant(e){const t=getFtStatusConflictParts(e);return[t.timeKey||"-",t.coveringKey||"-",t.reasonKey||"-"].join("|")}function getFtStatusConflictParts(e){return{timeKey:String(e?.ftTime||"").trim().toUpperCase(),coveringKey:normalizeFtRe(e?.coveringRe)||normalizeText(e?.coveringOther||e?.coveringName||""),reasonKey:normalizeText(e?.reasonRaw||e?.reasonOther||e?.reason||"")}}function isFtPendingEquivalent(e,t){const a=getFtStatusConflictParts(e),o=getFtStatusConflictParts(t),n=!a.timeKey||a.timeKey===o.timeKey,s=!a.coveringKey||a.coveringKey===o.coveringKey,i=!a.reasonKey||a.reasonKey===o.reasonKey;return n&&s&&i}function reconcileFtStatusConflicts(e=[]){const t=new Map;(e||[]).forEach(o=>{if(!o)return;const n=buildFtStatusConflictKey(o);t.has(n)||t.set(n,[]),t.get(n).push(o)});const a=[];return t.forEach(o=>{const n=o.filter(l=>l?.status==="submitted"||l?.status==="launched");if(!n.length){a.push(...o);return}const s=new Map;n.forEach(l=>{const c=buildFtStatusConflictVariant(l),d=s.get(c);s.set(c,pickPreferredFtItem(d,l))});const i=Array.from(s.values());a.push(...i),o.filter(l=>l?.status==="pending").forEach(l=>{i.some(d=>isFtPendingEquivalent(l,d))||a.push(l)})}),a}function pickPreferredFtItem(e,t){if(!e)return t;const a=getFtStatusRank(e?.status),o=getFtStatusRank(t?.status);if(o!==a)return o>a?t:e;const n=getFtItemUpdatedTime(e),s=getFtItemUpdatedTime(t);if(s!==n)return s>n?t:e;const i=e?.source==="supabase"?1:0,r=t?.source==="supabase"?1:0;return r!==i?r>i?t:e:t}function dedupeFtLaunches(e=[]){const t=new Map;(e||[]).forEach(n=>{if(!n)return;const s=buildFtDedupKey(n),i=t.get(s);t.set(s,pickPreferredFtItem(i,n))});const a=Array.from(t.values());return reconcileFtStatusConflicts(a).sort((n,s)=>getFtItemUpdatedTime(s)-getFtItemUpdatedTime(n))}function normalizeFtLaunchEntries(e=[]){const t=(e||[]).map(a=>{if(!a)return null;const o={...a};o.status||(o.status="pending"),o.status==="confirmed"&&(o.status="submitted"),["pending","submitted","launched"].includes(o.status)||(o.status=normalizeFtStatus(o.status)),o.updatedAt||(o.updatedAt=o.createdAt||new Date().toISOString());const n=normalizeFtDateKey(o.date);return n&&(o.date=n),o}).filter(Boolean);return dedupeFtLaunches(t)}function runFtIntegrityCheck(e="runtime"){const t=Array.isArray(ftLaunches)?ftLaunches:[];if(!t.length)return{ok:!0,duplicates:0,statusConflicts:0};const a=new Set;let o=0;t.forEach(r=>{const l=buildFtDedupKey(r);a.has(l)?o+=1:a.add(l)});const n=new Map;t.forEach(r=>{const l=buildFtStatusConflictKey(r);n.has(l)||n.set(l,[]),n.get(l).push(r)});let s=0;n.forEach(r=>{const l=r.filter(d=>d?.status==="submitted"||d?.status==="launched");if(!l.length)return;r.filter(d=>d?.status==="pending").forEach(d=>{l.some(g=>isFtPendingEquivalent(d,g))&&(s+=1)})});const i=o===0&&s===0;return i?AppLogger.debug("FT integrity check OK",{context:e,total:t.length}):AppLogger.warn("FT integrity check detected inconsistencies",{context:e,duplicates:o,statusConflicts:s,total:t.length}),{ok:i,duplicates:o,statusConflicts:s}}function buildFtAuditEntryKey(e){const t=String(e?.id||"").trim();if(t)return`id:${t}`;const a=e?.item||{},o=String(a?.ftId||"").trim(),n=String(e?.ts||"").trim(),s=String(e?.event||"").trim(),i=String(e?.nextStatus||"").trim(),r=String(e?.origin||"").trim(),l=String(e?.actor||"").trim();return[o,n,s,i,r,l].join("|")}function buildFtAuditItemSnapshot(e){if(!e||typeof e!="object")return null;const t=normalizeFtDateKey(e.date)||String(e.date||"").trim();return{ftId:String(e.id||e.ftId||"").trim(),date:t||"",collabRe:String(e.collabRe||"").trim(),collabName:String(e.collabName||"").trim(),unit:String(e.unitTarget||e.unitCurrent||e.unit||"").trim(),status:normalizeFtStatus(e.status||"pending"),source:String(e.source||"").trim(),sourceGroup:String(e.sourceGroup||e.group||"").trim(),shift:String(e.shift||"").trim(),ftTime:String(e.ftTime||"").trim()}}function normalizeFtAuditTrail(e=[]){const t=new Map;return(e||[]).forEach(a=>{if(!a||typeof a!="object")return;const o=String(a.ts||a.timestamp||"").trim(),n=Date.parse(o),s=Number.isFinite(n)?new Date(n).toISOString():new Date().toISOString(),i=String(a.event||"status_change").trim()||"status_change",r=String(a.origin||"system").trim()||"system",l=String(a.actor||"").trim(),c=a.prevStatus?normalizeFtStatus(a.prevStatus):"",d=a.nextStatus?normalizeFtStatus(a.nextStatus):"",p=String(a.note||"").trim(),g=buildFtAuditItemSnapshot(a.item||a.itemSnapshot||null),m={id:String(a.id||"").trim(),ts:s,event:i,origin:r,actor:l,prevStatus:c,nextStatus:d,note:p,item:g},f=buildFtAuditEntryKey(m),u=t.get(f);(!u||Date.parse(m.ts)>Date.parse(u.ts))&&t.set(f,m)}),Array.from(t.values()).sort((a,o)=>Date.parse(o.ts)-Date.parse(a.ts)).slice(0,FT_AUDIT_MAX_ITEMS)}function loadFtAuditTrail(){try{const e=localStorage.getItem("ftAuditTrail"),t=e?JSON.parse(e)||[]:[];ftAuditTrail=normalizeFtAuditTrail(t)}catch{ftAuditTrail=[]}supabaseClient&&SiteAuth.logged&&loadFtAuditFromSupabase()}function saveFtAuditTrail(e=!1){ftAuditTrail=normalizeFtAuditTrail(ftAuditTrail),localStorage.setItem("ftAuditTrail",JSON.stringify(ftAuditTrail)),scheduleLocalSync("ft-audit",{silent:e,notify:!e})}function resolveFtAuditActor(e={}){const t=String(e.actor||"").trim();if(t)return t;if(SiteAuth?.logged&&SiteAuth?.user)return SiteAuth.user;const a=String(e.origin||"").trim();return a==="sheet_sync"?"Importa\xE7\xE3o legada":a==="form_response_sync"?"Confirma\xE7\xE3o legada":"Sistema"}function getFtAuditOriginLabel(e=""){const t=String(e||"").trim().toLowerCase();return t==="manual"?"Lan\xE7amento manual":t==="sheet_sync"?"Integra\xE7\xE3o legada":t==="form_response_sync"?"Confirma\xE7\xE3o legada":t==="manual_delete"?"Remo\xE7\xE3o manual":t==="manual_restore"?"Restaura\xE7\xE3o manual":"Sistema"}function getFtStatusAuditLabel(e=""){const t=normalizeFtStatus(e||"");return t==="launched"?"Lan\xE7ada":t==="submitted"?"Confirmada":"Pendente"}function getFtAuditEventLabel(e=""){const t=String(e||"").trim().toLowerCase();return t==="status_change"?"Mudan\xE7a de status":t==="created"?"Cria\xE7\xE3o":t==="removed"?"Remo\xE7\xE3o":t==="restored"?"Restaura\xE7\xE3o":"Evento"}function logFtAudit(e,t,a={}){const o=String(e||"status_change").trim()||"status_change",n=buildFtAuditItemSnapshot(a.itemOverride||t||null),s={id:`ft-audit-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,ts:new Date().toISOString(),event:o,origin:String(a.origin||"system").trim()||"system",actor:resolveFtAuditActor(a),prevStatus:a.prevStatus?normalizeFtStatus(a.prevStatus):"",nextStatus:a.nextStatus?normalizeFtStatus(a.nextStatus):"",note:String(a.note||"").trim(),item:n};return a.sourceGroup&&s.item&&(s.item.sourceGroup=String(a.sourceGroup||"").trim()),ftAuditTrail.unshift(s),ftAuditTrail.length>FT_AUDIT_MAX_ITEMS&&(ftAuditTrail=ftAuditTrail.slice(0,FT_AUDIT_MAX_ITEMS)),saveFtAuditTrail(!0),s}function getLatestFtAuditEntry(e=""){const t=String(e||"").trim();return t&&(ftAuditTrail||[]).find(a=>String(a?.item?.ftId||"").trim()===t)||null}function formatFtAuditEntrySummary(e){if(!e)return"";const t=e.ts?formatFtDateTime(e.ts):"",a=getFtAuditOriginLabel(e.origin),o=getFtAuditEventLabel(e.event),n=String(e.actor||"").trim()||"Sistema",s=e.prevStatus?getFtStatusAuditLabel(e.prevStatus):"",i=e.nextStatus?getFtStatusAuditLabel(e.nextStatus):"",r=s&&i?`${s} -> ${i}`:i||s,l=r?` (${r})`:"",c=e.note?` \u2022 ${e.note}`:"";return[t,a,`${o}${l}`,n].filter(Boolean).join(" \u2022 ")+c}function loadFtLaunches(){try{const e=localStorage.getItem("ftLaunches");ftLaunches=e?JSON.parse(e)||[]:[]}catch{ftLaunches=[]}ftLaunches=normalizeFtLaunchEntries(ftLaunches),runFtIntegrityCheck("load-ft-launches"),supabaseClient&&SiteAuth.logged&&loadFtLaunchesFromSupabase().then(e=>{e&&(runFtIntegrityCheck("load-ft-supabase"),updateLancamentosUI())})}function saveFtLaunches(e=!1){ftLaunches=normalizeFtLaunchEntries(ftLaunches),runFtIntegrityCheck("save-ft-launches"),localStorage.setItem("ftLaunches",JSON.stringify(ftLaunches)),scheduleLocalSync("ft",{silent:e,notify:!e}),updateLancamentosUI()}function loadFtReasons(){try{const e=localStorage.getItem("ftReasons");ftReasons=e?JSON.parse(e)||[]:[]}catch{ftReasons=[]}ftReasons.length||(ftReasons=CONFIG?.ftReasons?JSON.parse(JSON.stringify(CONFIG.ftReasons)):[])}function saveFtReasons(e=!1){localStorage.setItem("ftReasons",JSON.stringify(ftReasons)),scheduleLocalSync("ft-reasons",{silent:e,notify:!e})}function saveLocalState(e=!1){localStorage.setItem("collaboratorEdits",JSON.stringify(collaboratorEdits)),localStorage.setItem("unitMetadata",JSON.stringify(unitMetadata)),localStorage.setItem("changeHistory",JSON.stringify(changeHistory)),scheduleLocalSync("local-save",{silent:e,notify:!e})}function saveEscalaInvertida(e=!1){localStorage.setItem("escalaInvertidaByGroup",JSON.stringify(escalaInvertidaByGroup)),typeof escalaInvertidaAutoMonth=="number"?localStorage.setItem("escalaInvertidaAutoMonth",String(escalaInvertidaAutoMonth)):localStorage.removeItem("escalaInvertidaAutoMonth"),scheduleLocalSync("escala-invertida",{silent:e,notify:!e})}function clearLocalState(){collaboratorEdits={},unitMetadata={},changeHistory=[],ftAuditTrail=[],localStorage.removeItem("collaboratorEdits"),localStorage.removeItem("unitMetadata"),localStorage.removeItem("changeHistory"),localStorage.removeItem("ftAuditTrail")}function scheduleLocalSync(e,t={}){if(!supabaseClient||!SiteAuth.logged)return;const a=t.silent!==!1;scheduleLocalSync._timer&&clearTimeout(scheduleLocalSync._timer),scheduleLocalSync._pending=scheduleLocalSync._pending||new Set,scheduleLocalSync._pending.add(e),scheduleLocalSync._timer=setTimeout(async()=>{const o=Array.from(scheduleLocalSync._pending);scheduleLocalSync._pending.clear();for(const n of o)try{await _syncToSupabase(n,a)}catch(s){AppErrorHandler.capture(s,{scope:`sync-${n}`},{silent:!0})}},500)}function _ftLaunchToRow(e){return{id:e.id,collab_re:e.collabRe||"",collab_name:e.collabName||"",collab_phone:e.collabPhone||"",unit_current:e.unitCurrent||"",unit_target:e.unitTarget||"",ft_date:e.date||"",shift:e.shift||"",reason:e.reason||"",reason_other:e.reasonOther||"",reason_raw:e.reasonRaw||"",reason_detail:e.reasonDetail||"",covering_re:e.coveringRe||"",covering_name:e.coveringName||"",covering_phone:e.coveringPhone||"",covering_other:e.coveringOther||"",notes:e.notes||"",group:e.group||"",source_group:e.sourceGroup||"",status:e.status||"pending",source:e.source||"",created_at:e.createdAt||new Date().toISOString(),updated_at:e.updatedAt||new Date().toISOString(),requested_at:e.requestedAt||null,created_by:e.createdBy||"",form_link:e.formLink||"",link_sent_at:e.linkSentAt||null,ft_time:e.ftTime||""}}function _rowToFtLaunch(e){return{id:e.id,collabRe:e.collab_re||"",collabName:e.collab_name||"",collabPhone:e.collab_phone||"",unitCurrent:e.unit_current||"",unitTarget:e.unit_target||"",date:e.ft_date||"",shift:e.shift||"",reason:e.reason||"",reasonOther:e.reason_other||"",reasonRaw:e.reason_raw||"",reasonDetail:e.reason_detail||"",coveringRe:e.covering_re||"",coveringName:e.covering_name||"",coveringPhone:e.covering_phone||"",coveringOther:e.covering_other||"",notes:e.notes||"",group:e.group||"",sourceGroup:e.source_group||"",status:e.status||"pending",source:e.source||"",createdAt:e.created_at||"",updatedAt:e.updated_at||"",requestedAt:e.requested_at||"",createdBy:e.created_by||"",formLink:e.form_link||"",linkSentAt:e.link_sent_at||"",ftTime:e.ft_time||""}}function _avisoToRow(e){return{id:e.id,group:e.group||"",unit:e.unit||"",collab_re:e.collabRe||"",collab_name:e.collabName||"",assigned_to_re:e.assignedToRe||"",assigned_to_name:e.assignedToName||"",priority:e.priority||"normal",title:e.title||"",message:e.message||"",simple:!!e.simple,status:e.status||"pending",created_at:e.createdAt||new Date().toISOString(),created_by:e.createdBy||"",reminder_enabled:!!e.reminderEnabled,reminder_type:e.reminderType||"",reminder_every:e.reminderEvery||"",reminder_next_at:e.reminderNextAt||null,done_at:e.doneAt||null,done_by:e.doneBy||""}}function _rowToAviso(e){return{id:e.id,group:e.group||"",unit:e.unit||"",collabRe:e.collab_re||"",collabName:e.collab_name||"",assignedToRe:e.assigned_to_re||"",assignedToName:e.assigned_to_name||"",priority:e.priority||"normal",title:e.title||"",message:e.message||"",simple:!!e.simple,status:e.status||"pending",createdAt:e.created_at||"",createdBy:e.created_by||"",reminderEnabled:!!e.reminder_enabled,reminderType:e.reminder_type||"",reminderEvery:e.reminder_every||"",reminderNextAt:e.reminder_next_at||null,doneAt:e.done_at||null,doneBy:e.done_by||""}}function _ftAuditToRow(e){return{id:e.id,ts:e.ts||new Date().toISOString(),event:e.event||"",origin:e.origin||"",actor:e.actor||"",prev_status:e.prevStatus||"",next_status:e.nextStatus||"",note:e.note||"",item:e.item||null}}function _rowToFtAudit(e){return{id:e.id,ts:e.ts||"",event:e.event||"",origin:e.origin||"",actor:e.actor||"",prevStatus:e.prev_status||"",nextStatus:e.next_status||"",note:e.note||"",item:e.item||null}}function _changeHistoryToRow(e){return{data:e.data||"",responsavel:e.responsavel||"",acao:e.acao||"",detalhe:e.detalhe||"",target:e.target||null,changes:e.changes||null,before_snapshot:e.before||null,after_snapshot:e.after||null,undo:e.undo||null}}function _rowToChangeHistory(e){return{data:e.data||"",responsavel:e.responsavel||"",acao:e.acao||"",detalhe:e.detalhe||"",target:e.target||null,changes:e.changes||null,before:e.before_snapshot||null,after:e.after_snapshot||null,undo:e.undo||null}}async function _syncToSupabase(e,t){if(supabaseClient)switch(e){case"ft":await _syncFtLaunches();break;case"ft-audit":await _syncFtAuditTrail();break;case"avisos":await _syncAvisos();break;case"local-save":await _syncChangeHistory();break;case"ft-reasons":await _syncAppSetting("ftReasons",ftReasons);break;case"escala-invertida":await _syncAppSetting("escalaInvertida",{byGroup:escalaInvertidaByGroup,autoMonth:escalaInvertidaAutoMonth});break;case"admin-users":await _syncAppSetting("adminUsers",SiteAuth.admins||[]);break;case"reciclagem-templates":try{await _syncAppSetting("reciclagemTemplates",JSON.parse(localStorage.getItem("reciclagemTemplates")||"[]"))}catch{}break;case"reciclagem-overrides":try{await _syncAppSetting("reciclagemOverrides",JSON.parse(localStorage.getItem("reciclagemOverrides")||"{}"))}catch{}break;case"reciclagem-history":try{await _syncAppSetting("reciclagemHistory",JSON.parse(localStorage.getItem("reciclagemHistory")||"[]"))}catch{}break;case"reciclagem-notes":try{await _syncAppSetting("reciclagemNotes",JSON.parse(localStorage.getItem("reciclagemNotes")||"{}"))}catch{}break;case"supervisao-menu":try{await _syncAppSetting("supervisaoMenu",JSON.parse(localStorage.getItem("supervisaoMenu")||"[]"))}catch{}break;case"supervisao-history":try{await _syncAppSetting("supervisaoHistory",JSON.parse(localStorage.getItem("supervisaoHistory")||"[]"))}catch{}break;case"local-collaborators":try{await _syncAppSetting("localCollaborators",JSON.parse(localStorage.getItem("localCollaborators")||"[]"))}catch{}break;case"pre-registered-emails":await _syncAppSetting("preRegisteredEmails",preRegisteredEmails||[]);break;default:break}}async function _syncAppSetting(e,t){if(!supabaseClient)return;const{error:a}=await supabaseClient.from(SUPABASE_TABLES.app_settings).upsert({key:e,value:t,updated_by:SiteAuth.user||SiteAuth.email||""},{onConflict:"key"});a&&AppErrorHandler.capture(a,{scope:`sync-setting-${e}`},{silent:!0})}async function _loadAppSetting(e){if(supabaseClient)try{const{data:t,error:a}=await supabaseClient.from(SUPABASE_TABLES.app_settings).select("value").eq("key",e).maybeSingle();if(a)throw a;return t?.value}catch(t){AppErrorHandler.capture(t,{scope:`load-setting-${e}`},{silent:!0});return}}async function _loadAllAppSettings(){if(!(!supabaseClient||!SiteAuth.logged))try{const{data:e,error:t}=await supabaseClient.from(SUPABASE_TABLES.app_settings).select("key, value");if(t)throw t;if(!e||!e.length)return;for(const a of e)try{switch(a.key){case"ftReasons":Array.isArray(a.value)&&a.value.length&&(ftReasons=a.value,localStorage.setItem("ftReasons",JSON.stringify(ftReasons)));break;case"escalaInvertida":if(a.value&&typeof a.value=="object"){if(a.value.byGroup&&typeof a.value.byGroup=="object")escalaInvertidaByGroup=a.value.byGroup;else if(typeof a.value.value=="boolean"){const o=a.value.value;(CONFIG?.groupRules||[]).forEach(n=>{n?.key&&(escalaInvertidaByGroup[n.key]=o)})}typeof a.value.autoMonth=="number"&&(escalaInvertidaAutoMonth=a.value.autoMonth),localStorage.setItem("escalaInvertidaByGroup",JSON.stringify(escalaInvertidaByGroup))}break;case"adminUsers":Array.isArray(a.value)&&a.value.length&&(SiteAuth.admins=a.value,localStorage.setItem("adminUsers",JSON.stringify(SiteAuth.admins)));break;case"reciclagemTemplates":localStorage.setItem("reciclagemTemplates",JSON.stringify(a.value||[]));break;case"reciclagemOverrides":localStorage.setItem("reciclagemOverrides",JSON.stringify(a.value||{}));break;case"reciclagemHistory":localStorage.setItem("reciclagemHistory",JSON.stringify(a.value||[]));break;case"reciclagemNotes":localStorage.setItem("reciclagemNotes",JSON.stringify(a.value||{}));break;case"supervisaoMenu":localStorage.setItem("supervisaoMenu",JSON.stringify(a.value||[]));break;case"supervisaoHistory":localStorage.setItem("supervisaoHistory",JSON.stringify(a.value||[]));break;case"localCollaborators":localStorage.setItem("localCollaborators",JSON.stringify(a.value||[]));break;case"preRegisteredEmails":preRegisteredEmails=a.value||[],localStorage.setItem("preRegisteredEmails",JSON.stringify(preRegisteredEmails));break}}catch{}}catch(e){AppErrorHandler.capture(e,{scope:"load-all-settings"},{silent:!0})}}async function _syncFtLaunches(){if(!supabaseClient)return;const e=(ftLaunches||[]).map(_ftLaunchToRow);if(!e.length)return;const{error:t}=await supabaseClient.from(SUPABASE_TABLES.ft_launches).upsert(e,{onConflict:"id"});t&&AppErrorHandler.capture(t,{scope:"sync-ft-launches"},{silent:!0})}async function _syncFtAuditTrail(){if(!supabaseClient)return;const e=(ftAuditTrail||[]).slice(0,50).map(_ftAuditToRow);if(!e.length)return;const{error:t}=await supabaseClient.from(SUPABASE_TABLES.ft_audit_trail).upsert(e,{onConflict:"id"});t&&AppErrorHandler.capture(t,{scope:"sync-ft-audit"},{silent:!0})}async function _syncAvisos(){if(!supabaseClient)return;const e=(avisos||[]).map(_avisoToRow);if(!e.length)return;const{error:t}=await supabaseClient.from(SUPABASE_TABLES.avisos).upsert(e,{onConflict:"id"});t&&AppErrorHandler.capture(t,{scope:"sync-avisos"},{silent:!0})}async function _syncChangeHistory(){if(!supabaseClient)return;const e=(changeHistory||[]).slice(0,5);if(!e.length)return;const t=e.map(_changeHistoryToRow),{error:a}=await supabaseClient.from(SUPABASE_TABLES.change_history).insert(t);a&&(String(a.message||"").includes("duplicate")||AppErrorHandler.capture(a,{scope:"sync-change-history"},{silent:!0}))}async function loadFtLaunchesFromSupabase(){if(!supabaseClient)return!1;try{let t=[],a=0;for(;;){const{data:o,error:n}=await supabaseClient.from(SUPABASE_TABLES.ft_launches).select("*").range(a,a+1e3-1);if(n)throw n;if(t=t.concat(o||[]),!o||o.length<1e3)break;a+=1e3}if(t.length)return ftLaunches=t.map(_rowToFtLaunch),ftLaunches=normalizeFtLaunchEntries(ftLaunches),localStorage.setItem("ftLaunches",JSON.stringify(ftLaunches)),!0}catch(e){AppErrorHandler.capture(e,{scope:"load-ft-supabase"},{silent:!0})}return!1}async function loadAvisosFromSupabase(){if(!supabaseClient)return!1;try{let t=[],a=0;for(;;){const{data:o,error:n}=await supabaseClient.from(SUPABASE_TABLES.avisos).select("*").range(a,a+1e3-1);if(n)throw n;if(t=t.concat(o||[]),!o||o.length<1e3)break;a+=1e3}if(t.length)return avisos=t.map(_rowToAviso),localStorage.setItem("avisos",JSON.stringify(avisos)),!0}catch(e){AppErrorHandler.capture(e,{scope:"load-avisos-supabase"},{silent:!0})}return!1}async function loadFtAuditFromSupabase(){if(!supabaseClient)return!1;try{const{data:e,error:t}=await supabaseClient.from(SUPABASE_TABLES.ft_audit_trail).select("*").order("ts",{ascending:!1}).limit(FT_AUDIT_MAX_ITEMS);if(t)throw t;if(e&&e.length)return ftAuditTrail=e.map(_rowToFtAudit),ftAuditTrail=normalizeFtAuditTrail(ftAuditTrail),localStorage.setItem("ftAuditTrail",JSON.stringify(ftAuditTrail)),!0}catch(e){AppErrorHandler.capture(e,{scope:"load-ft-audit-supabase"},{silent:!0})}return!1}async function loadChangeHistoryFromSupabase(){if(!supabaseClient)return!1;try{const{data:e,error:t}=await supabaseClient.from(SUPABASE_TABLES.change_history).select("*").order("created_at",{ascending:!1}).limit(200);if(t)throw t;if(e&&e.length)return changeHistory=e.map(_rowToChangeHistory),localStorage.setItem("changeHistory",JSON.stringify(changeHistory)),!0}catch(e){AppErrorHandler.capture(e,{scope:"load-history-supabase"},{silent:!0})}return!1}let _realtimeChannel=null;function _setupRealtimeSubscriptions(){if(supabaseClient){_cleanupRealtimeSubscriptions();try{_realtimeChannel=supabaseClient.channel("dunamis-realtime").on("postgres_changes",{event:"*",schema:"public",table:SUPABASE_TABLES.colaboradores},()=>{invalidateCollaboratorsCache(),fetchSupabaseCollaborators(!0).then(e=>{e&&e.length&&(currentData=e,realizarBusca(),renderizarUnidades())})}).on("postgres_changes",{event:"*",schema:"public",table:SUPABASE_TABLES.unidades},()=>{supaUnitsCache={items:null,updatedAt:0},fetchSupabaseUnits(!0).then(()=>renderizarUnidades())}).on("postgres_changes",{event:"*",schema:"public",table:SUPABASE_TABLES.ft_launches},()=>{loadFtLaunchesFromSupabase().then(e=>{e&&updateLancamentosUI()})}).on("postgres_changes",{event:"*",schema:"public",table:SUPABASE_TABLES.avisos},()=>{loadAvisosFromSupabase().then(e=>{e&&updateAvisosUI()})}).on("postgres_changes",{event:"*",schema:"public",table:SUPABASE_TABLES.app_settings},()=>{_loadAllAppSettings()}).subscribe()}catch(e){AppErrorHandler.capture(e,{scope:"realtime-setup"},{silent:!0})}}}function _cleanupRealtimeSubscriptions(){if(_realtimeChannel&&supabaseClient){try{supabaseClient.removeChannel(_realtimeChannel)}catch{}_realtimeChannel=null}}function getDailySnapshotKey(e=new Date){const t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),o=String(e.getDate()).padStart(2,"0");return`${t}-${a}-${o}`}function buildSafetySnapshotState(){return{capturedAt:new Date().toISOString(),group:currentGroup||"todos",collaboratorEdits:collaboratorEdits||{},unitMetadata:unitMetadata||{},changeHistory:changeHistory||[],avisos:avisos||[],ftLaunches:ftLaunches||[],ftAuditTrail:ftAuditTrail||[],trocaLaunches:trocaLaunches||[],currentData:currentData||[]}}function saveDailyLocalSnapshot(e){const t="dailySafetySnapshots",o=(()=>{try{const s=localStorage.getItem(t);return s?JSON.parse(s)||{}:{}}catch{return{}}})();o[e]=buildSafetySnapshotState();const n=Object.keys(o).sort();for(;n.length>20;){const s=n.shift();s&&delete o[s]}localStorage.setItem(t,JSON.stringify(o))}async function runDailySafetySnapshot(e={}){const t=!!e.force,a=!!e.notify||t;if(dailySnapshotInProgress)return!1;const o=getDailySnapshotKey(new Date),n="dailySafetySnapshot:last";if(!t&&localStorage.getItem(n)===o||!currentData?.length&&!ftLaunches.length&&!trocaLaunches.length)return!1;dailySnapshotInProgress=!0;try{return saveDailyLocalSnapshot(o),localStorage.setItem(n,o),a&&showToast(`Snapshot di\xE1rio criado (${o}).`,"success"),!0}finally{dailySnapshotInProgress=!1}}function loadAuthFromStorage(){const e=localStorage.getItem("keepLogged")==="1",t=localStorage.getItem("authHash");if(!e||!t)return;const a=SiteAuth.admins.find(o=>o.hash===t);if(a){SiteAuth.logged=!0,SiteAuth.user=a.name,SiteAuth.role=a.role||"admin",SiteAuth.mode=SiteAuth.role==="supervisor"?"observe":"edit";try{const n=atob(t).split(":");SiteAuth.re=n[0]||null}catch{}SiteAuth.role!=="supervisor"&&document.body.classList.add("mode-edit"),document.getElementById("config-login")?.classList.add("hidden"),document.getElementById("config-content")?.classList.remove("hidden"),updateMenuStatus()}}function saveAuthToStorage(e=null,t=null){if(!(typeof t=="boolean"?t:document.getElementById("keepLogged")?.checked)){localStorage.setItem("keepLogged","0"),localStorage.removeItem("authHash"),localStorage.removeItem("authUser"),localStorage.removeItem("authRe");return}const o=e||SiteAuth.admins.find(n=>n.name===SiteAuth.user)?.hash||"";localStorage.setItem("keepLogged","1"),localStorage.setItem("authHash",o),localStorage.setItem("authUser",SiteAuth.user||""),localStorage.setItem("authRe",SiteAuth.re||"")}function initAdmins(){const e=localStorage.getItem("adminUsers");if(e){SiteAuth.admins=normalizeAdmins(JSON.parse(e)),saveAdmins(!0);return}SiteAuth.admins=[{hash:btoa("7164:0547"),name:"GUSTAVO CORTES BRAGA",re:"7164",role:"master",master:!0},{hash:btoa("4648:4643"),name:"MOIS\xC9S PEREIRA FERNANDES",re:"4648",role:"admin"},{hash:btoa("3935:1288"),name:"WAGNER MONTEIRO",re:"3935",role:"admin"}],saveAdmins(!0)}function saveAdmins(e=!1){localStorage.setItem("adminUsers",JSON.stringify(SiteAuth.admins)),scheduleLocalSync("admin-users",{silent:e,notify:!e})}function decodeAdminHash(e){try{const a=atob(e).split(":");return{re:a[0]||"",pass:a[1]||""}}catch{return{re:"",pass:""}}}function normalizeAdmins(e){return(e||[]).map(t=>{const a=decodeAdminHash(t.hash||""),o=t.re||a.re||"";let n=t.role||"admin";n==="observer"&&(n="supervisor");const s=t.master||o==="7164";return{hash:t.hash,name:t.name,re:o,role:s?"master":n,master:s}})}const ICONS={search:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>',building:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><line x1="9" y1="22" x2="9" y2="22.01"></line><line x1="15" y1="22" x2="15" y2="22.01"></line><line x1="12" y1="22" x2="12" y2="22.01"></line><line x1="12" y1="2" x2="12" y2="22"></line></svg>',edit:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>',details:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>',eye:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>',eyeOff:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>',close:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>',sun:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>',moon:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>',settings:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>',download:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>',history:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>',chevronUp:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>',chevronDown:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>',mapPin:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.686-6-11a6 6 0 1 1 12 0c0 5.314-6 11-6 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>',arrowUp:'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>',crown:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l4 4 4-6 4 6 4-4 4 5-2 8H4l-2-8z"></path><path d="M5 20h14"></path></svg>',bell:'<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>',launch:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9"></path><path d="M6 12H4a2 2 0 0 0-2 2v5"></path><rect x="2" y="3" width="7" height="10" rx="1"></rect><path d="M5 7h2"></path><path d="M5 10h2"></path></svg>',recycle:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6v6h-6"></path><path d="M3 18v-6h6"></path><path d="M20 9a8 8 0 0 0-14.4-3.6L3 8"></path><path d="M4 15a8 8 0 0 0 14.4 3.6L21 16"></path></svg>',performance:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="20"></line><rect x="6" y="11" width="3" height="6" rx="1"></rect><rect x="11" y="8" width="3" height="9" rx="1"></rect><rect x="16" y="5" width="3" height="12" rx="1"></rect></svg>',whatsapp:'<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>',phone:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>',shield:'<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>',star:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>',starFilled:'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>'},PROMPT_TEMPLATES=[{title:"Cobertura por proximidade",text:"Quem pode cobrir a falta do RE (RE) hoje, que trabalha mais perto?"},{title:"Cobertura por nome",text:"Quem pode cobrir a falta de (NOME) hoje, que trabalha mais perto?"},{title:"Cobertura por unidade",text:"Preciso de algu\xE9m para cobrir o posto (UNIDADE) hoje. Quem est\xE1 de folga?"},{title:"Contato r\xE1pido",text:"Qual o contato/WhatsApp do RE (RE)?"},{title:"Contato por nome",text:"Qual o contato/WhatsApp de (NOME)?"},{title:"Hor\xE1rio e escala",text:"Qual o hor\xE1rio e escala do RE (RE)?"},{title:"Hor\xE1rio por nome",text:"Qual o hor\xE1rio e escala de (NOME)?"},{title:"Busca por unidade",text:"Listar colaboradores da unidade (UNIDADE)."},{title:"Plant\xE3o hoje",text:"Quem est\xE1 em plant\xE3o hoje na unidade (UNIDADE)?"},{title:"Folga hoje",text:"Quem est\xE1 de folga hoje na unidade (UNIDADE)?"},{title:"Afastamentos",text:"Quem est\xE1 afastado ou de f\xE9rias na unidade (UNIDADE)?"},{title:"Contagem geral",text:"Quantos colaboradores est\xE3o em plant\xE3o hoje na unidade (UNIDADE)?"},{title:"Endere\xE7o da unidade",text:"Qual \xE9 o endere\xE7o do posto (UNIDADE)?"},{title:"Sugest\xE3o r\xE1pida",text:"Sugira um colaborador dispon\xEDvel para cobertura no posto (UNIDADE) hoje."}],SEARCH_TOKENS=[{key:"RE",label:"RE"},{key:"UNIDADE",label:"Unidade/Posto"},{key:"NOME",label:"Nome do colaborador"},{key:"GRUPO",label:"Grupo (BOMBEIROS/SERVI\xC7OS/SEGURAN\xC7A/RB)"}],SUPERVISAO_CATEGORIES={internal:{label:"Supervis\xE3o (interno)",badge:"Interno",description:"Links de uso interno da supervis\xE3o."},colab:{label:"Para colaboradores",badge:"Colaboradores",description:"Links e mensagens para encaminhar aos colaboradores."},guide:{label:"Guias e tutoriais",badge:"Guia",description:"Passo a passo e orienta\xE7\xF5es r\xE1pidas."}},SUPERVISAO_DEFAULT_MENU={meta:{version:1,updatedAt:null,updatedBy:"Sistema"},items:[{id:"sup_abertura_vagas",category:"internal",type:"link",title:"Abertura de vagas",description:"Solicita\xE7\xE3o de abertura de vagas (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/9919638656"},{id:"sup_aso",category:"internal",type:"link",title:"ASO",description:"Solicita\xE7\xF5es de ASO (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/8482734576"},{id:"sup_uniforme",category:"internal",type:"link",title:"Pedido de uniforme (patrimonial)",description:"Solicita\xE7\xE3o de uniforme (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/9918758426"},{id:"sup_ferias",category:"internal",type:"link",title:"Programa\xE7\xE3o de f\xE9rias",description:"Planejamento e programa\xE7\xE3o de f\xE9rias (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/9919803699"},{id:"sup_permuta",category:"internal",type:"link",title:"Permuta",description:"Solicita\xE7\xF5es de permuta (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/9919342909"},{id:"sup_reclamacao_salarial",category:"internal",type:"link",title:"Reclama\xE7\xE3o salarial",description:"Registro interno de reclama\xE7\xF5es salariais (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/8625263513"},{id:"sup_vt",category:"internal",type:"link",title:"Solicita\xE7\xE3o de VT",description:"Solicita\xE7\xF5es de vale-transporte (Monday).",link:"https://grupodunamiscoorp.monday.com/boards/8482137289"},{id:"sup_visita_diaria",category:"internal",type:"link",title:"Visita di\xE1ria",description:"Workspace de visita di\xE1ria (Monday).",link:"https://grupodunamiscoorp.monday.com/workspaces/9709048"},{id:"colab_vt",category:"colab",type:"message",title:"VT \u2013 Aderir ou Cancelar",description:"Solicita\xE7\xE3o ou cancelamento do vale-transporte.",emailTo:"dp@grupodunamis.com.br",emailSubject:"Solicita\xE7\xE3o/Cancelamento de VT",channels:{whatsapp:`\u{1F4E9} VT \u2013 Aderir ou Cancelar

Ol\xE1! Para aderir ou cancelar o Vale-Transporte, siga os passos abaixo:

1) Solicite o formul\xE1rio "Solicita\xE7\xE3o de VT" com o DP.
2) Preencha todas as informa\xE7\xF5es e marque a op\xE7\xE3o desejada:
- Opto pela utiliza\xE7\xE3o do Vale-Transporte (aderir)
- N\xC3O opto pela utiliza\xE7\xE3o do Vale-Transporte (cancelar)

Ap\xF3s o preenchimento, envie para:
\u{1F4E7} dp@grupodunamis.com.br

No corpo do e-mail, informe:
Nome:
RE:
Unidade:

Atenciosamente,
Grupo Dunamis`,email:`Prezados(as),

Para aderir ou cancelar o Vale-Transporte, siga as instru\xE7\xF5es abaixo:

1) Solicite o formul\xE1rio "Solicita\xE7\xE3o de VT" com o DP.
2) Preencha todas as informa\xE7\xF5es e assinale a op\xE7\xE3o desejada:
- Opto pela utiliza\xE7\xE3o do Vale-Transporte (aderir)
- N\xC3O opto pela utiliza\xE7\xE3o do Vale-Transporte (cancelar)

Ap\xF3s o preenchimento, envie para dp@grupodunamis.com.br informando:
Nome completo:
RE:
Unidade:

Atenciosamente,
Grupo Dunamis`}},{id:"colab_ferias",category:"colab",type:"message",title:"Programa\xE7\xE3o de f\xE9rias",description:"Formul\xE1rio de f\xE9rias para colaboradores.",link:"https://wkf.ms/4n1kC8T",message:`Prezados(as),

Pedimos que preencham o link de ferias abaixo:
https://wkf.ms/4n1kC8T

Favor assinar o recibo e enviar em PDF.

Atenciosamente,
Grupo Dunamis`},{id:"colab_cracha",category:"colab",type:"message",title:"Crach\xE1 com c\xF3digo de barras",description:"Solicita\xE7\xE3o de crach\xE1 com c\xF3digo de barras.",link:"https://wkf.ms/4eO1dW0",message:`Prezados(as),

Para solicitar o cracha com codigo de barras, preencha o link abaixo:
https://wkf.ms/4eO1dW0

As informacoes serao analisadas e, apos a confeccao, o cracha sera entregue no posto em ate 30 dias.
Obs.: a solicitacao deve ser feita apos o termino do periodo de experiencia (90 dias).

Atenciosamente,
Grupo Dunamis`},{id:"colab_reclamacao_salarial",category:"colab",type:"message",title:"Reclama\xE7\xE3o salarial",description:"Formul\xE1rio de revis\xE3o salarial.",link:"https://wkf.ms/4hcdd3n",message:`Ola, tudo bem?

Pedimos que os questionamentos sobre revisao salarial sejam enviados pelo formulario abaixo:
https://wkf.ms/4hcdd3n

As informacoes serao analisadas pela Coordenacao e retornaremos em breve.

Atenciosamente,
Grupo Dunamis`},{id:"colab_holerite",category:"colab",type:"message",title:"Cadastro de holerites",description:"Instru\xE7\xF5es para cadastro do holerite.",emailTo:"denize@grupodunamis.com.br",emailCc:"cassia@grupodunamis.com.br",emailSubject:"Cadastro de holerite",channels:{whatsapp:`Para cadastro do holerite:

Envie um e-mail com:
Nome completo:
RE:
E-mail para cadastro:

Para: denize@grupodunamis.com.br
Cc: cassia@grupodunamis.com.br

Voc\xEA receber\xE1 um link para baixar o app e cadastrar uma senha.
Se j\xE1 enviou e-mail anteriormente, favor reenviar.`,email:`Prezados(as),

Solicito o cadastro do holerite com as informa\xE7\xF5es abaixo:

Nome completo:
RE:
E-mail para cadastro:

Atenciosamente,
`}},{id:"colab_ft",category:"colab",type:"message",title:"Solicita\xE7\xE3o de FT",description:"Formul\xE1rio para solicita\xE7\xE3o de FT.",link:"https://forms.gle/UKrZnFqFWYU4risGA",message:`Solicitacao de FT

Para solicitar FT, preencha o formulario:
https://forms.gle/UKrZnFqFWYU4risGA`},{id:"colab_curriculo",category:"colab",type:"message",title:"Envio de curr\xEDculo (v\xEDdeo)",description:"Envio de v\xEDdeo curr\xEDculo.",link:"https://wkf.ms/3YqtzPm",links:[{label:"Exemplo de v\xEDdeo",url:"https://youtube.com/shorts/9k_3tj4_hVE?feature=share"}],message:`Ola!

Por gentileza, envie um video curriculo pelo link:
https://wkf.ms/3YqtzPm

Tempo maximo: 2 minutos.

Exemplo de apresentacao:
https://youtube.com/shorts/9k_3tj4_hVE?feature=share

Boa sorte!`},{id:"colab_troca_folga",category:"colab",type:"message",title:"Troca de folga",description:"Formul\xE1rio para troca de folga.",link:"https://forms.gle/tWXgUt6koiZTXvEP7",message:`Solicitacao de troca de folga

Preencha o formulario:
https://forms.gle/tWXgUt6koiZTXvEP7`},{id:"colab_exercicio_tecnico_fev_2026",category:"colab",type:"message",title:"Exerc\xEDcio t\xE9cnico \u2013 Fevereiro/2026",description:"Avalia\xE7\xE3o mensal de fevereiro.",link:"https://forms.gle/ekp5worSjxvmt6NSA",message:`Exercicio tecnico - Fevereiro/2026

Segue o link para a avaliacao deste mes:
https://forms.gle/ekp5worSjxvmt6NSA

Boa sorte!
Coordenacao Dunamis`}]},gateway=document.getElementById("gateway"),appContainer=document.getElementById("app-container"),appTitle=document.getElementById("app-title"),APP_VERSION="v4",contentArea=document.getElementById("content-area"),AppBootstrapper={booted:!1,_runStep(e,t){try{const a=t();a&&typeof a.then=="function"&&a.catch(o=>{AppErrorHandler.capture(o,{scope:`bootstrap:${e}`},{silent:!0})})}catch(a){AppErrorHandler.capture(a,{scope:`bootstrap:${e}`},{silent:!0})}},boot(){this.booted||(this.booted=!0,this._runStep("core",()=>{bindAppLifecycle(),initializeCoreManagers(),AppLogger.info("App boot",{version:APP_VERSION}),localStorage.getItem("compactMode")==="1"&&document.body.classList.add("compact-mode"),localStorage.setItem("aiSearchEnabled","0"),localStorage.setItem("substituteSearchEnabled","0");try{const e=localStorage.getItem("substituteProximityMode");(e==="off"||e==="posto"||e==="endereco"||e==="rota")&&(substituteProximityMode=e)}catch{}}),this._runStep("local-state",()=>{loadLocalState(),hydrateManagedCachesFromLegacy(),loadAvisos(),loadFtAuditTrail(),loadFtLaunches(),refreshFtLabelsForToday(),loadFtReasons(),loadReciclagemTemplates(),loadReciclagemOverrides(),loadReciclagemHistory(),loadReciclagemNotes(),loadSupervisaoMenu(),loadSupervisaoHistory(),loadSupervisaoFavorites(),loadSupervisaoUsage(),loadSupervisaoChannelPrefs()}),this._runStep("monitors",()=>{startAutoEscalaMonitor(),startReminderMonitor()}),this._runStep("resources",()=>{loadUnitAddressDb(),loadCollaboratorAddressDb()}),this._runStep("auth",()=>initSupabaseAuth()),this._runStep("ui",()=>{document.body.classList.add("on-gateway"),renderGateway(),document.getElementById("context-help-panel")?.remove(),ensureCommandPalette(),bindModalA11y(),bindGlobalShortcuts(),initSmartTooltips(),registerPwaSupport(),updateMenuStatus(),updateLastUpdatedDisplay()}))}};typeof window<"u"&&(window.AppBootstrapper=AppBootstrapper),document.addEventListener("DOMContentLoaded",()=>{AppBootstrapper.boot()});function registerPwaSupport(){!("serviceWorker"in navigator)||!(window.location.protocol==="https:"||window.location.hostname==="localhost")||navigator.serviceWorker.register("./sw.js").catch(()=>{})}function openTabFromCommand(e,t){const a=()=>{switchTab(e),typeof t=="function"&&t()},o=currentGroup||"todos";if(appContainer.style.display==="none"||!document.getElementById(`tab-content-${e}`)){loadGroup(o).then(a).catch(()=>{});return}a()}function getCommandPaletteCommands(){const e=[],t=(a,o,n)=>e.push({label:a,keywords:o,action:n});return t("Abrir Busca R\xE1pida","busca pesquisar colaborador",()=>openTabFromCommand("busca")),t("Abrir Unidades","unidades postos",()=>openTabFromCommand("unidades")),t("Abrir Avisos","avisos pendencias lembretes",()=>openTabFromCommand("avisos")),t("Abrir Reciclagem","reciclagem validade",()=>openTabFromCommand("reciclagem")),t("Abrir Lan\xE7amentos","ft lancamentos diaria",()=>openTabFromCommand("lancamentos")),t("Abrir Configura\xE7\xE3o","configuracao settings",()=>openTabFromCommand("config")),t("Lan\xE7amentos \u2022 Aba Di\xE1ria","lancamentos diaria foco dia",()=>{openTabFromCommand("lancamentos",()=>switchLancamentosTab("diaria"))}),t("Lan\xE7amentos \u2022 Indicadores FT","lancamentos dashboard ft",()=>{openTabFromCommand("lancamentos",()=>switchLancamentosTab("dashboard"))}),t("Lan\xE7amentos \u2022 Planejamento","lancamentos planejamento semanal mensal",()=>{openTabFromCommand("lancamentos",()=>switchLancamentosTab("planejamento"))}),t("Lan\xE7amentos \u2022 Troca de folga","lancamentos troca erros",()=>{openTabFromCommand("lancamentos",()=>switchLancamentosMode("troca"))}),t("Abrir Supervis\xE3o","supervisao menu links",()=>openSupervisaoPage()),t("Abrir Ger\xEAncia","gerencia placeholder",()=>openGerenciaPage()),t("Voltar para P\xE1gina Inicial","inicio home gateway",()=>resetToGateway()),t("Criar Snapshot Di\xE1rio Agora","snapshot backup restore",()=>runDailySafetySnapshot({force:!0})),e}function renderCommandPaletteList(e=""){const t=document.getElementById("command-palette-list");if(!t)return;const a=normalizeText(e||""),n=getCommandPaletteCommands().filter(s=>{const i=normalizeText(`${s.label} ${s.keywords}`);return!a||i.includes(a)});if(commandPaletteState.filtered=n,commandPaletteState.activeIndex>=n.length&&(commandPaletteState.activeIndex=Math.max(n.length-1,0)),!n.length){t.innerHTML='<div class="command-item empty">Nenhum comando encontrado.</div>';return}t.innerHTML=n.map((s,i)=>`
        <button class="command-item ${i===commandPaletteState.activeIndex?"active":""}" data-command-idx="${i}" type="button">
            <span>${s.label}</span>
        </button>
    `).join("")}function closeCommandPalette(){const e=document.getElementById("command-palette");e&&(e.classList.add("hidden"),commandPaletteState.open=!1)}function executeCommandPaletteSelection(){const e=commandPaletteState.filtered?.[commandPaletteState.activeIndex];e&&(closeCommandPalette(),e.action())}function openCommandPalette(){const e=document.getElementById("command-palette"),t=document.getElementById("command-palette-input");!e||!t||(e.classList.remove("hidden"),commandPaletteState.open=!0,commandPaletteState.activeIndex=0,t.value="",renderCommandPaletteList(""),setTimeout(()=>t.focus(),0))}function ensureCommandPalette(){if(document.getElementById("command-palette"))return;const e=document.createElement("div");e.id="command-palette",e.className="command-palette hidden",e.innerHTML=`
        <div class="command-backdrop" data-close="1"></div>
        <div class="command-dialog" role="dialog" aria-modal="true" aria-label="Modo comando">
            <div class="command-header">
                <strong>Modo Comando</strong>
                <span>Ctrl+K</span>
            </div>
            <input id="command-palette-input" class="search-input" type="text" placeholder="Digite um comando...">
            <div id="command-palette-list" class="command-list"></div>
        </div>
    `,document.body.appendChild(e),e.addEventListener("click",a=>{const o=a.target;if(!(o instanceof HTMLElement))return;if(o.dataset.close==="1"){closeCommandPalette();return}const n=o.closest(".command-item[data-command-idx]");if(!n)return;const s=Number(n.getAttribute("data-command-idx"));Number.isFinite(s)&&(commandPaletteState.activeIndex=s,executeCommandPaletteSelection())});const t=e.querySelector("#command-palette-input");t&&(t.addEventListener("input",()=>{commandPaletteState.activeIndex=0,renderCommandPaletteList(t.value)}),t.addEventListener("keydown",a=>{const o=commandPaletteState.filtered?.length||0;if(a.key==="ArrowDown"){if(a.preventDefault(),!o)return;commandPaletteState.activeIndex=(commandPaletteState.activeIndex+1)%o,renderCommandPaletteList(t.value)}else if(a.key==="ArrowUp"){if(a.preventDefault(),!o)return;commandPaletteState.activeIndex=(commandPaletteState.activeIndex-1+o)%o,renderCommandPaletteList(t.value)}else a.key==="Enter"?(a.preventDefault(),executeCommandPaletteSelection()):a.key==="Escape"&&(a.preventDefault(),closeCommandPalette())})),AppEventManager.on(document,"keydown",a=>{if((a.ctrlKey||a.metaKey)&&a.key.toLowerCase()==="k"){a.preventDefault(),commandPaletteState.open?closeCommandPalette():openCommandPalette();return}a.key==="Escape"&&commandPaletteState.open&&(a.preventDefault(),closeCommandPalette())},!1,{scope:"command-palette",key:"command-palette-shortcut"})}function isTypingTarget(e){if(!(e instanceof HTMLElement))return!1;const t=String(e.tagName||"").toLowerCase();return t==="input"||t==="textarea"||t==="select"?!0:e.isContentEditable===!0}function bindGlobalShortcuts(){globalShortcutsBound||(globalShortcutsBound=!0,AppEventManager.on(document,"keydown",e=>{if(commandPaletteState.open)return;const t=isTypingTarget(e.target),a=String(e.key||"");if((e.ctrlKey||e.metaKey)&&a.toLowerCase()==="k"){e.preventDefault(),switchTab("busca");const o=document.getElementById("search-input");o&&(o.focus(),o.select());return}if(a==="Escape"&&t&&e.target.id==="search-input"){e.preventDefault(),clearSearchInput(),e.target.blur();return}if(!t&&a==="?"){e.preventDefault(),openHelpModal();return}if(!t&&a==="/"&&currentTab==="busca"){e.preventDefault();const o=document.getElementById("search-input");o&&(o.focus(),o.select());return}if(!t&&a.toLowerCase()==="f"&&currentTab==="busca"){e.preventDefault(),toggleSearchAdvanced();return}if(!t&&a.toLowerCase()==="p"&&e.altKey){e.preventDefault(),printCurrentView();return}},!1,{scope:"shortcuts",key:"shortcuts-global"}))}window.onscroll=function(){const e=document.getElementById("scroll-top-btn");document.body.scrollTop>300||document.documentElement.scrollTop>300?e.classList.add("show"):e.classList.remove("show")};function openSupervisaoPage(){clearTabScopedTimers("supervisao"),appContainer.style.display="block",gateway.classList.add("hidden"),document.body.classList.remove("on-gateway"),closeUtilityDrawer(),setAppState("currentTab","supervisao",{silent:!0}),contentArea.innerHTML=`
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>P\xE1gina inicial</span>
                <span class="breadcrumb-sep">\u203A</span>
                <span>Supervis\xE3o</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Acesso direto</span>
            </div>
        </div>
        ${getSupervisaoShellHtml()}
    `,clearContextBar(),bindSupervisaoEvents(),renderSupervisao(),renderSupervisaoAdminList(),renderSupervisaoHistory(),updateSupervisaoEditorVisibility(),updateSupervisaoAdminStatus()}async function openGerenciaPage(e={}){clearTabScopedTimers("gerencia"),appContainer.style.display="block",gateway.classList.add("hidden"),document.body.classList.remove("on-gateway"),closeUtilityDrawer(),setAppState("currentTab","gerencia",{silent:!0}),contentArea.innerHTML=`
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>P\xE1gina inicial</span>
                <span class="breadcrumb-sep">\u203A</span>
                <span>Ger\xEAncia</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Placeholder</span>
            </div>
        </div>
        <div class="gateway-gerencia-card">
            <strong>Ger\xEAncia</strong>
            <p>Em breve: painel gerencial.</p>
        </div>
    `,clearContextBar()}function getGerenciaDataSource(){return gerenciaDataCache&&gerenciaDataCache.length?gerenciaDataCache:currentData||[]}function getGerenciaFilteredWorkforce(){const e=getGerenciaDataSource();return gerenciaFilter.group&&gerenciaFilter.group!=="all"?e.filter(t=>t.grupo===gerenciaFilter.group):e.slice()}function getGerenciaFilteredFtItems(){const e=normalizeDateRange(gerenciaFilter.from,gerenciaFilter.to);return getFtOperationalItems(ftLaunches).filter(t=>{if(gerenciaFilter.group&&gerenciaFilter.group!=="all"&&t?.group&&t.group!==gerenciaFilter.group)return!1;if(!hasDateRangeFilter(e))return!0;const a=normalizeFtDateKey(t?.date);return isDateInsideRange(a,e.from,e.to)})}function getGerenciaGroupRows(e){const t={};return(e||[]).forEach(a=>{const o=a?.grupo||"N/I";t[o]=(t[o]||0)+1}),Object.entries(t).sort((a,o)=>o[1]-a[1]).map(([a,o])=>({label:String(a).toUpperCase(),value:o}))}function buildGerenciaWeekProjectionHtml(e){const t=normalizeFtDateKey(gerenciaFilter.from)||getTodayKey(),a=getFtOperationalItems(ftLaunches),o=[];for(let n=0;n<7;n++){const s=getDateKeyWithOffset(t,n),i=a.filter(p=>e&&e!=="all"&&p?.group&&p.group!==e?!1:normalizeFtDateKey(p?.date)===s),r=resolveFtPreviewFromItems(i),l=new Date(`${s}T00:00:00`),c=Number.isNaN(l.getTime())?s:["DOM","SEG","TER","QUA","QUI","SEX","S\xC1B"][l.getDay()],d=r.code==="V"?"v":r.code==="E"?"e":r.code==="D"?"d":"none";o.push(`
            <div class="gerencia-day-chip ${d}" title="${formatFtDate(s)}: ${r.count?`${r.count} FT`:"Sem FT"}">
                <div class="day">${c}</div>
                <div class="code">${r.code}</div>
                <div class="count">${r.count||0}</div>
            </div>
        `)}return`<div class="gerencia-day-grid">${o.join("")}</div>`}function setGerenciaDateRangePreset(e){const t=new Date;if(e==="today"){const a=toDateInputValue(t);gerenciaFilter.from=a,gerenciaFilter.to=a}else if(e==="7d"){const a=new Date(t);a.setDate(t.getDate()-6),gerenciaFilter.from=toDateInputValue(a),gerenciaFilter.to=toDateInputValue(t)}else if(e==="next7"){const a=new Date(t);a.setDate(t.getDate()+6),gerenciaFilter.from=toDateInputValue(t),gerenciaFilter.to=toDateInputValue(a)}else e==="clear"&&(gerenciaFilter.from="",gerenciaFilter.to="");renderGerenciaDashboard()}function bindGerenciaFilters(){const e=document.getElementById("gerencia-group-filter"),t=document.getElementById("gerencia-date-from"),a=document.getElementById("gerencia-date-to");if(e&&e.addEventListener("change",()=>{gerenciaFilter.group=e.value||"all",renderGerenciaDashboard()}),t&&a){const o=()=>{const n=normalizeDateRange(t.value,a.value);gerenciaFilter.from=n.from,gerenciaFilter.to=n.to,renderGerenciaDashboard()};t.addEventListener("change",o),a.addEventListener("change",o)}}async function refreshGerenciaDashboard(){await openGerenciaPage({forceReload:!0})}function renderGerenciaDashboard(){const e=getGerenciaDataSource(),t=getGerenciaFilteredWorkforce(),a=getGerenciaFilteredFtItems(),o=buildFtDashboardStats(a),n=t.length,s=t.filter(f=>{const u=getStatusInfo(f).text;return u.includes("PLANT\xC3O")||u.includes("FT")}).length,i=t.filter(f=>{const u=getStatusInfo(f).text;return!u.includes("PLANT\xC3O")&&!u.includes("FT")}).length,r=getGerenciaGroupRows(e).slice(0,6),l={};t.forEach(f=>{const u=f?.posto||"N/I";l[u]=(l[u]||0)+1});const c=Object.entries(l).sort((f,u)=>u[1]-f[1]).slice(0,8).map(([f,u])=>({label:f,value:u})),d=o.topPendingUnits||[],p=getGerenciaGroupRows(e).filter(f=>f.label!=="N/I"),g=['<option value="all">Todos os grupos</option>'].concat(p.map(f=>{const u=f.label.toLowerCase();return`<option value="${u}" ${gerenciaFilter.group===u?"selected":""}>${f.label}</option>`})),m=hasDateRangeFilter(gerenciaFilter)?`${gerenciaFilter.from||"..."} at\xE9 ${gerenciaFilter.to||"..."}`:"Sem recorte de data";contentArea.innerHTML=`
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>P\xE1gina inicial</span>
                <span class="breadcrumb-sep">\u203A</span>
                <span>Ger\xEAncia</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Recorte: ${m}</span>
            </div>
        </div>
        <section class="gerencia-shell">
            <div class="gerencia-header">
                <h3>Central Gerencial de Coberturas</h3>
                <p>Indicadores consolidados para decis\xF5es r\xE1pidas de escala, risco e produtividade.</p>
            </div>
            <div class="gerencia-filters">
                <select id="gerencia-group-filter" class="filter-select">${g.join("")}</select>
                <input type="date" id="gerencia-date-from" value="${gerenciaFilter.from||""}">
                <input type="date" id="gerencia-date-to" value="${gerenciaFilter.to||""}">
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('today')">Hoje</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('7d')">\xDAlt. 7 dias</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('next7')">Pr\xF3x. 7 dias</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('clear')">Limpar datas</button>
                <button class="btn btn-secondary btn-small" onclick="refreshGerenciaDashboard()">Atualizar n\xFAmeros</button>
            </div>
            <div class="lancamentos-kpi gerencia-kpi">
                <div class="kpi-card"><div class="kpi-label">Efetivo filtrado</div><div class="kpi-value">${n}</div><div class="kpi-sub">Colaboradores no recorte</div></div>
                <div class="kpi-card"><div class="kpi-label">Plant\xE3o hoje</div><div class="kpi-value">${s}</div><div class="kpi-sub">Status operacional atual</div></div>
                <div class="kpi-card"><div class="kpi-label">Folga hoje</div><div class="kpi-value">${i}</div><div class="kpi-sub">Reserva potencial</div></div>
                <div class="kpi-card"><div class="kpi-label">FT no per\xEDodo</div><div class="kpi-value">${o.total}</div><div class="kpi-sub">Todas as solicita\xE7\xF5es</div></div>
                <div class="kpi-card"><div class="kpi-label">Pend\xEAncias FT</div><div class="kpi-value">${o.pending}</div><div class="kpi-sub">Aguardando lan\xE7amento</div></div>
                <div class="kpi-card"><div class="kpi-label">Taxa de lan\xE7amento</div><div class="kpi-value">${o.launchRate}%</div><div class="kpi-sub">Efici\xEAncia de lan\xE7amento</div></div>
            </div>
            <div class="lancamentos-report-grid gerencia-grid">
                <div class="report-card">
                    <div class="report-title">Efetivo por Grupo</div>
                    <div class="report-list">${buildReportRows(r)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Unidades com maior efetivo</div>
                    <div class="report-list">${buildReportRows(c)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">FT por Unidade</div>
                    <div class="report-list">${buildReportRows(o.topUnits||[])}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Pend\xEAncias por Unidade</div>
                    <div class="report-list">${buildReportRows(d)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Motivos de FT</div>
                    <div class="report-list">${buildReportRows(o.topReasons||[])}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Radar pr\xF3ximos 7 dias (V/E/D)</div>
                    <div class="report-list">
                        ${buildGerenciaWeekProjectionHtml(gerenciaFilter.group)}
                    </div>
                </div>
            </div>
        </section>
    `,bindGerenciaFilters(),updateLastUpdatedDisplay(),clearContextBar()}function toggleEditModeFromSupervisao(){toggleEditMode(),updateSupervisaoAdminStatus(),renderSupervisaoAdminList(),renderSupervisaoHistory()}async function openSupervisaoUnitEditor(){if(SiteAuth.mode!=="edit"){showToast("Ative o modo edi\xE7\xE3o para alterar unidades.","error");return}const t=document.getElementById("supervisao-unit-input")?.value.trim();if(!t){showToast("Informe a unidade para editar.","error");return}const a=findUnitByName(t)||t.toUpperCase();!currentData||currentData.length===0?await loadGroup("todos"):renderDashboard(),switchTab("unidades"),openEditUnitModal(a)}function updateSupervisaoAdminStatus(){const e=document.getElementById("supervisao-admin-user"),t=document.getElementById("supervisao-admin-role"),a=document.getElementById("supervisao-admin-mode");if(!e||!t||!a)return;if(!SiteAuth.logged){e.textContent="\u2014",t.textContent="\u2014",a.textContent="VISUALIZA\xC7\xC3O",a.className="status-badge-menu view";return}const o=ROLE_LABELS[SiteAuth.role]||"Usu\xE1rio",n=SiteAuth.mode==="edit"?"EDI\xC7\xC3O":"VISUALIZA\xC7\xC3O";e.textContent=SiteAuth.user||"Admin",t.textContent=o.toUpperCase(),a.textContent=n,a.className=`status-badge-menu ${SiteAuth.mode==="edit"?"edit":"view"}`}function getSupervisaoAdminHtml(){const e=SiteAuth.logged,t=isAdminRole(),a=canEditSupervisao();return`
        <details class="supervisao-admin-panel">
            <summary>Menu de edi\xE7\xE3o</summary>
            <div class="supervisao-admin-body">
                ${e?`
                    <div class="supervisao-admin-status">
                        <div><span>Usu\xE1rio</span><strong id="supervisao-admin-user">\u2014</strong></div>
                        <div><span>Perfil</span><strong id="supervisao-admin-role">\u2014</strong></div>
                        <div><span>Modo</span><strong id="supervisao-admin-mode" class="status-badge-menu view">VISUALIZA\xC7\xC3O</strong></div>
                    </div>
                    <div class="supervisao-admin-actions">
                        <button class="btn btn-secondary btn-small" onclick="toggleEditModeFromSupervisao()">Alternar modo</button>
                        <button class="btn btn-secondary btn-small" onclick="logoutSite({ target: 'supervisao' })">Sair</button>
                    </div>
                    ${a?"":'<div class="hint">Para editar, esteja logado como admin e ative o modo edi\xE7\xE3o.</div>'}
                    ${e&&!t?'<div class="hint">Seu perfil n\xE3o permite editar o menu de Supervis\xE3o.</div>':""}
                `:`
                    <div class="supervisao-admin-login">
                        <div class="field-row">
                            <label>E-mail</label>
                            <input type="email" id="supervisao-login-email" placeholder="seu@email.com">
                        </div>
                        <div class="field-row">
                            <label>Senha</label>
                            <input type="password" id="supervisao-login-password" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">
                        </div>
                        <div class="field-row field-row-check">
                            <label class="check-label"><input type="checkbox" id="keepLoggedCheck" checked> Permanecer conectado</label>
                        </div>
                        <div class="actions">
                            <button class="btn" onclick="loginSite({ source: 'supervisao', target: 'supervisao' })">Entrar</button>
                            <button class="btn btn-secondary btn-small" onclick="signupSite({ source: 'supervisao' })">Criar conta</button>
                            <button class="btn btn-secondary btn-small" onclick="requestPasswordReset({ source: 'supervisao' })">Esqueci senha</button>
                        </div>
                        <div class="hint">Somente perfis autorizados podem editar.</div>
                    </div>
                `}

                ${e&&t?`
                    <div class="supervisao-admin-grid">
                        <div class="supervisao-admin-section-title">Conte\xFAdo do menu</div>
                        <div class="supervisao-admin-card tone-primary">
                            <div class="supervisao-admin-card-header">
                                <strong>Editor principal</strong>
                            </div>
                            <div class="hint">Crie ou atualize links e mensagens principais.</div>
                            <input type="hidden" id="supervisao-editor-id">
                            <div class="field-row">
                                <label>Se\xE7\xE3o</label>
                                <select id="supervisao-editor-category">
                                    <option value="internal">Supervis\xE3o (interno)</option>
                                    <option value="colab">Colaboradores</option>
                                    <option value="guide">Guias e tutoriais</option>
                                </select>
                            </div>
                            <div class="field-row">
                                <label>Tipo</label>
                                <select id="supervisao-editor-type" onchange="updateSupervisaoEditorVisibility()">
                                    <option value="message">Mensagem</option>
                                    <option value="link">Link</option>
                                </select>
                            </div>
                            <div class="field-row">
                                <label>T\xEDtulo</label>
                                <input type="text" id="supervisao-editor-title" placeholder="Ex: Programa\xE7\xE3o de f\xE9rias">
                            </div>
                            <div class="field-row">
                                <label>Descri\xE7\xE3o</label>
                                <input type="text" id="supervisao-editor-description" placeholder="Resumo curto do item">
                            </div>
                            <div class="field-row">
                                <label>Link principal (opcional)</label>
                                <input type="text" id="supervisao-editor-link" placeholder="https://...">
                            </div>
                            <div class="field-row">
                                <label>Links extras (um por linha: R\xF3tulo | URL)</label>
                                <textarea id="supervisao-editor-links" rows="3" placeholder="Exemplo | https://..."></textarea>
                            </div>
                            <div id="supervisao-editor-message-group">
                                <div class="field-row">
                                    <label>Mensagem (WhatsApp)</label>
                                    <textarea id="supervisao-editor-message-whatsapp" rows="4" placeholder="Digite a mensagem"></textarea>
                                </div>
                                <div class="field-row">
                                    <label>Mensagem (E-mail)</label>
                                    <textarea id="supervisao-editor-message-email" rows="4" placeholder="Opcional"></textarea>
                                </div>
                                <div class="field-row">
                                    <label>E-mail destino</label>
                                    <input type="text" id="supervisao-editor-email-to" placeholder="exemplo@dominio.com">
                                </div>
                                <div class="field-row">
                                    <label>Cc (opcional)</label>
                                    <input type="text" id="supervisao-editor-email-cc" placeholder="copiar@dominio.com">
                                </div>
                                <div class="field-row">
                                    <label>Assunto do e-mail</label>
                                    <input type="text" id="supervisao-editor-email-subject" placeholder="Assunto">
                                </div>
                            </div>
                            <div class="field-row">
                                <label>Imagens (uma por linha)</label>
                                <textarea id="supervisao-editor-images" rows="3" placeholder="images/exemplo.jpg"></textarea>
                            </div>
                            <div class="field-row">
                                <label>Validade (opcional)</label>
                                <input type="date" id="supervisao-editor-expires">
                            </div>
                            <div class="actions">
                                <button class="btn" onclick="saveSupervisaoItem()">Salvar item</button>
                                <button class="btn btn-secondary" onclick="resetSupervisaoEditor()">Limpar</button>
                            </div>
                        </div>

                        <div class="supervisao-admin-card tone-blue">
                            <div class="supervisao-admin-card-header">
                                <strong>Itens cadastrados</strong>
                                <button class="btn btn-secondary btn-small" onclick="resetSupervisaoEditor()">Novo item</button>
                            </div>
                            <div class="hint">Organize rapidamente tudo que est\xE1 publicado.</div>
                            <div id="supervisao-admin-list" class="supervisao-admin-list"></div>
                        </div>

                        <div class="supervisao-admin-section-title">Opera\xE7\xE3o e hist\xF3rico</div>
                        <div class="supervisao-admin-card tone-sky">
                            <div class="supervisao-admin-card-header">
                                <strong>Unidades e colaboradores</strong>
                            </div>
                            <div class="hint">Abra uma unidade para adicionar/remover colaboradores.</div>
                            <div class="field-row">
                                <label>Unidade</label>
                                <input type="text" id="supervisao-unit-input" placeholder="Digite o nome da unidade">
                            </div>
                            <div class="actions">
                                <button class="btn btn-secondary btn-small" onclick="openSupervisaoUnitEditor()">Abrir edi\xE7\xE3o da unidade</button>
                            </div>
                            <div class="hint">A edi\xE7\xE3o abrir\xE1 na tela de Unidades (base geral).</div>
                        </div>

                        <div class="supervisao-admin-card tone-green">
                            <div class="supervisao-admin-card-header">
                                <strong>Hist\xF3rico</strong>
                            </div>
                            <div id="supervisao-history-list" class="supervisao-history-list"></div>
                        </div>
                    </div>
                `:""}
            </div>
        </details>
    `}function getSupervisaoShellHtml(){return`
        <div class="supervisao-shell">
            <div class="supervisao-header">
                <div>
                    <h3>Supervis\xE3o</h3>
                    <p>Links internos e mensagens prontas para enviar aos colaboradores.</p>
                </div>
                <div id="supervisao-updated" class="supervisao-meta"></div>
            </div>
            <div class="supervisao-toolbar">
                <input type="text" id="supervisao-search" class="search-input" placeholder="Buscar link ou mensagem...">
                <div class="supervisao-switch">
                    <div class="supervisao-switch-label">P\xFAblico principal</div>
                    <div class="supervisao-switch-group">
                        <button class="switch-btn" data-supervisao-filter="internal">Supervis\xE3o</button>
                        <button class="switch-btn" data-supervisao-filter="colab">Colaboradores</button>
                    </div>
                </div>
                <div class="supervisao-switch-hint">Selecione quem ver\xE1 o conte\xFAdo principal antes dos filtros extras.</div>
                <div class="supervisao-filters">
                    <button class="filter-chip" data-supervisao-filter="guide">Guias</button>
                    <button class="filter-chip" data-supervisao-filter="favorites">Favoritos</button>
                    <button class="filter-chip" data-supervisao-filter="used">Mais usados</button>
                    ${isAdminRole()?'<button class="filter-chip" data-supervisao-filter="expired">Expirados</button>':""}
                </div>
            </div>
            <div id="supervisao-top-used" class="supervisao-top-used hidden"></div>
            <div id="supervisao-sections"></div>
            ${getSupervisaoAdminHtml()}
        </div>
    `}function renderGateway(){if(CONFIG?.auth?.requireLogin&&!SiteAuth.logged){showLoginScreen();return}const e=getAllowedGroups(),t=getGroupLabelMap(),a={bombeiros:"Dunamis Bombeiros",servicos:"Dunamis Servi\xE7os",seguranca:"Dunamis Seguran\xE7a",rb:"RB Facilities"},o=(CONFIG?.groupRules||[]).map(s=>s.key).filter(s=>e.includes(s)).map(s=>createCard(a[s]||t[s]||s,(CONFIG.images||{})[s],s)).join(""),n=e.length>1||canViewAllGroups();gateway.innerHTML=`
        <h2>Selecione a Unidade</h2>
        <div class="gateway-grid">
            ${o}
            ${n?`
            <div class="gateway-card gateway-card-general" onclick="loadGroup('todos')">
                <div class="gateway-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <circle cx="12" cy="12" r="9"></circle>
                        <path d="M12 3a15 15 0 0 1 0 18"></path>
                        <path d="M3 12h18"></path>
                    </svg>
                </div>
                <h3>Visualiza\xE7\xE3o Geral</h3>
                <p>Todas as unidades</p>
            </div>`:""}
        </div>
        <div class="gateway-access-grid">
            <div class="gateway-card gateway-card-access" onclick="openSupervisaoPage()">
                <div class="gateway-icon">
                    ${ICONS.shield}
                </div>
                <h3>Supervis\xE3o</h3>
                <p>Links e mensagens para supervisores.</p>
            </div>
            <div class="gateway-card gateway-card-access" onclick="openGerenciaPage()">
                <div class="gateway-icon">
                    ${ICONS.settings}
                </div>
                <h3>Ger\xEAncia</h3>
                <p>Placeholder.</p>
            </div>
        </div>
        <div class="gateway-links">
            <button class="btn" onclick="openDunamisProjects()">Clique aqui para conferir os outros sites Dunamis IA</button>
        </div>
        ${SiteAuth.logged?`<div class="gateway-logout"><button class="btn btn-secondary btn-small" onclick="logoutSite({ target: 'gateway' })">Sair da conta (${escapeHtml(SiteAuth.email||"")})</button></div>`:""}
    `}function showLoginScreen(){appContainer.style.display="none",gateway.classList.remove("hidden"),document.body.classList.add("on-gateway"),gateway.innerHTML=`
        <div class="config-shell" style="width:100%;max-width:640px;">
            <div id="config-login" class="config-gate">
                <div class="config-card">
                    <div class="config-card-header">
                        <div class="card-title">Acesso ao Sistema</div>
                    </div>
                    <div class="config-card-body">
                        <div class="field-row">
                            <label>E-mail</label>
                            <input type="email" id="loginEmail" placeholder="seu@email.com">
                        </div>
                        <div class="field-row">
                            <label>Senha</label>
                            <input type="password" id="loginPassword" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">
                        </div>
                        <div class="field-row field-row-check">
                            <label class="check-label"><input type="checkbox" id="keepLoggedCheck" checked> Permanecer conectado</label>
                        </div>
                        <div class="actions">
                            <button class="btn" onclick="loginSite({ target: 'gateway' })">Entrar</button>
                            <button class="btn btn-secondary btn-small" onclick="signupSite()">Criar conta</button>
                            <button class="btn btn-secondary btn-small" onclick="requestPasswordReset()">Esqueci senha</button>
                        </div>
                        <div class="hint">Fa\xE7a login para liberar o acesso \xE0s unidades.</div>
                    </div>
                </div>
            </div>
        </div>
    `}function showGatewayScreen(){gateway.classList.remove("hidden"),appContainer.style.display="none",document.body.classList.add("on-gateway"),renderGateway()}function createCard(e,t,a){return`
        <div class="gateway-card" onclick="loadGroup('${a}')">
            <img src="${t}" alt="${e}" loading="lazy">
            <h3>${e}</h3>
        </div>
    `}function setAppTitle(e,t=""){if(!appTitle)return;const a=t?` ${t}`:"";appTitle.innerHTML=`${e}${a}`}function openDunamisProjects(){const e=`
        <html>
            <head>
                <title>Dunamis IA - Projetos</title>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <style>
                    :root {
                        --blue: #0b4fb3;
                        --deep: #002d72;
                        --bg: #eef2f8;
                        --card: #ffffff;
                        --shadow: 0 12px 30px rgba(15, 23, 42, 0.12);
                    }
                    * { box-sizing: border-box; }
                    body {
                        font-family: "Segoe UI", "Poppins", Arial, sans-serif;
                        background: radial-gradient(1200px 600px at 10% -10%, #dbe7ff, transparent 60%),
                                    radial-gradient(900px 500px at 90% 0%, #f0f7ff, transparent 60%),
                                    var(--bg);
                        margin: 0;
                        color: #0f172a;
                    }
                    .wrap {
                        max-width: 980px;
                        margin: 0 auto;
                        padding: 32px 20px 48px;
                    }
                    .hero {
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        margin-bottom: 22px;
                    }
                    h1 {
                        font-size: clamp(1.6rem, 2.8vw, 2.4rem);
                        color: var(--deep);
                        margin: 0;
                    }
                    .subtitle {
                        font-size: clamp(0.95rem, 2vw, 1.1rem);
                        color: #475569;
                    }
                    .grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
                        gap: 14px;
                    }
                    .card {
                        background: var(--card);
                        border: 1px solid #e2e8f0;
                        border-radius: 16px;
                        padding: 18px;
                        box-shadow: var(--shadow);
                        display: flex;
                        flex-direction: column;
                        gap: 8px;
                        min-height: 140px;
                    }
                    .card h2 {
                        font-size: 1.05rem;
                        margin: 0;
                        color: #0f172a;
                    }
                    .card p {
                        margin: 0;
                        color: #64748b;
                        font-size: 0.92rem;
                    }
                    .card a {
                        margin-top: auto;
                        display: inline-flex;
                        align-items: center;
                        gap: 6px;
                        color: var(--blue);
                        font-weight: 700;
                        text-decoration: none;
                    }
                    .card a:hover {
                        text-decoration: underline;
                    }
                </style>
            </head>
            <body>
                <div class="wrap">
                    <div class="hero">
                        <h1>Dunamis IA - Projetos</h1>
                        <div class="subtitle">Acesse rapidamente as ferramentas e pain\xE9is dispon\xEDveis.</div>
                    </div>
                    <div class="grid">
                        <div class="card">
                            <h2>Portal de Trocas</h2>
                            <p>Gest\xE3o de trocas e coberturas com fluxo organizado.</p>
                            <a href="https://gustauvm.github.io/PORTAL-DE-TROCA/gateway.html" target="_blank">Abrir projeto \u2192</a>
                        </div>
                        <div class="card">
                            <h2>Relat\xF3rio por RE</h2>
                            <p>Organizador de relat\xF3rio com foco em RE.</p>
                            <a href="https://gustauvm.pythonanywhere.com/" target="_blank">Abrir projeto \u2192</a>
                        </div>
                        <div class="card">
                            <h2>Endere\xE7os das Unidades</h2>
                            <p>Consulte endere\xE7os oficiais das unidades Dunamis.</p>
                            <a href="https://gustauvm.github.io/ENDERECOS-DUNAMIS/" target="_blank">Abrir projeto \u2192</a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `,t=window.open("","_blank");t&&(t.document.write(e),t.document.close())}function normalizeGroupToken(e){return String(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()}let COLLAB_RE_PADRAO_COLUMN="re_padrao";function inferGroupKeyFromRow(e){const t=CONFIG?.groupRules||[],a=normalizeGroupToken([e?.unidade_de_negocio,e?.empresa,e?.cargo,e?.posto].filter(Boolean).join(" "));for(const o of t)if((o?.patterns||[]).some(i=>a.includes(normalizeGroupToken(i))))return o.key;return"todos"}function pickRePadrao(e){return e?.re_padrao||e?.re_padrap||""}function normalizePhoneValue(e){return String(e||"").replace(/\D/g,"")}let _collabReColumnDetected=!1;function mapSupabaseCollaboratorRow(e){!_collabReColumnDetected&&e&&typeof e=="object"&&!("re_padrao"in e)&&"re_padrap"in e&&(COLLAB_RE_PADRAO_COLUMN="re_padrap",_collabReColumnDetected=!0);const t=String(pickRePadrao(e)||"").trim(),a=t||String(e?.matricula||e?.re_folha||"").trim(),o=String(e?.colaborador||e?.nome||"").trim().toUpperCase(),n=String(e?.posto||"").trim().toUpperCase(),s=String(e?.escala||"").trim(),i=extrairTipoEscala(s),r=parseInt(e?.turma,10),l=String(e?.unidade_de_negocio||"").trim(),c=inferGroupKeyFromRow(e);return{dbId:String(e?.matricula||t||e?.re_folha||e?.cpf||"").trim(),nome:o,re:a,re_folha:e?.re_folha||"",re_padrao:t,matricula:e?.matricula||"",colaborador:e?.colaborador||e?.nome||"",posto:n,cargo:e?.cargo||"",escala:s,tipoEscala:i,turno:e?.turno||"",telefone:normalizePhoneValue(e?.telefone||""),cpf:e?.cpf?String(e.cpf):"",data_admissao:e?.data_admissao||"",empresa:e?.empresa||"",cliente:e?.cliente||"",turma:Number.isFinite(r)?r:1,ferias:e?.ferias||"",aso:e?.aso||"","reciclagem bombeiro":e?.["reciclagem bombeiro"]||e?.reciclagem_bombeiro||"",nr_10:e?.nr_10||"",nr_20:e?.nr_20||"",nr_33:e?.nr_33||"",nr_35:e?.nr_35||"",dea:e?.dea||"",heliponto:e?.heliponto||"",uniforme:e?.uniforme||"",suspensao:e?.suspensao||"",advertencia:e?.advertencia||"",recolhimento:e?.recolhimento||"",observacoes:e?.observacoes||"",ctps_numero:e?.ctps_numero||"",ctps_serie:e?.ctps_serie||"",pis:e?.pis||"",rg:e?.rg||"",atestados:e?.atestados||"",reciclagem_vigilante:e?.reciclagem_vigilante||"",reciclagem_cnv_vigilante:e?.reciclagem_cnv_vigilante||"",telefone_emergencia:e?.telefone_emergencia||"",data_nascimento:e?.data_nascimento||"",idade:e?.idade||"",unidade_de_negocio:l,endereco_colaborador:e?.endereco_colaborador||"",email_login:e?.email_login||"",rotulo:e?.rotulo||"",rotuloInicio:e?.rotulo_inicio||e?.rotuloInicio||"",rotuloFim:e?.rotulo_fim||e?.rotuloFim||"",rotuloDetalhe:e?.rotulo_detalhe||e?.rotuloDetalhe||"",endereco:e?.endereco_colaborador||"",grupoLabel:l,grupo:c}}function extrairTipoEscala(e){const t=String(e||"").toUpperCase();if(!t)return"";if(t.includes("12X36"))return"12x36";if(t.includes("5X2"))return"5x2";if(t.includes("6X1"))return"6x1";if(t.includes("24X72"))return"24x72";const a=t.match(/\b\d{1,2}X\d{1,2}\b/);return a?a[0].toLowerCase():""}function formatUnitAddress(e){const a=[e?.endereco,e?.numero,e?.bairro,e?.cidade,e?.estado].map(n=>String(n||"").trim()).filter(Boolean).join(", "),o=e?.cep?`CEP ${e.cep}`:"";return[a,o].filter(Boolean).join(" \u2022 ")}function setSupabaseHealth(e={}){supabaseHealth={...supabaseHealth,...e}}function saveCollaboratorsSnapshot(e){try{if(!Array.isArray(e)||!e.length)return;localStorage.setItem(COLLAB_SNAPSHOT_KEY,JSON.stringify({savedAt:new Date().toISOString(),items:e}))}catch{}}function loadCollaboratorsSnapshot(){try{const e=localStorage.getItem(COLLAB_SNAPSHOT_KEY);if(!e)return[];const t=JSON.parse(e);return Array.isArray(t?.items)?t.items:[]}catch{return[]}}function getSupabaseDiagnosticsText(){return[`Status: ${supabaseHealth.status}`,`Fonte: ${supabaseHealth.source}`,`Tentativa: ${supabaseHealth.lastAttemptAt||"-"}`,`Sucesso: ${supabaseHealth.lastSuccessAt||"-"}`,`Registros: ${supabaseHealth.lastCount||0}`,`Erro: ${supabaseHealth.lastError||"-"}`,`Auth: ${SiteAuth.logged?`logado (${SiteAuth.email||"sem-email"})`:"deslogado"}`].join(`
`)}async function copySupabaseDiagnostics(){const e=getSupabaseDiagnosticsText();try{if(navigator?.clipboard?.writeText){await navigator.clipboard.writeText(e),showToast("Diagn\xF3stico copiado.","success");return}}catch{}showToast("N\xE3o foi poss\xEDvel copiar. Abra o console para detalhes.","error"),console.log(e)}let _inflightCollaboratorsFetch=null;async function fetchSupabaseCollaborators(e=!1){if(!supabaseClient)return[];const t=Date.now();return!e&&allCollaboratorsCache.items&&t-allCollaboratorsCache.updatedAt<SUPABASE_CACHE_TTL_MS?(setSupabaseHealth({status:"ok",source:"cache",lastCount:allCollaboratorsCache.items.length}),allCollaboratorsCache.items):_inflightCollaboratorsFetch||(_inflightCollaboratorsFetch=(async()=>{try{setSupabaseHealth({status:"loading",source:"supabase-js",lastAttemptAt:new Date().toISOString(),lastError:""});async function a(){if(!SUPABASE_CONFIG?.url||!SUPABASE_CONFIG?.anonKey)return[];if(dataLayer&&typeof dataLayer.fetchSupabaseTablePaged=="function"){let d=SUPABASE_CONFIG.anonKey;try{const{data:p}=await supabaseClient.auth.getSession();p?.session?.access_token&&(d=p.session.access_token)}catch{}return dataLayer.fetchSupabaseTablePaged({baseUrl:SUPABASE_CONFIG.url,table:SUPABASE_TABLES.colaboradores,anonKey:SUPABASE_CONFIG.anonKey,accessToken:d,pageSize:1e3,timeoutMs:15e3})}const i=1e3;let r=0,l=[],c=SUPABASE_CONFIG.anonKey;try{const{data:d}=await supabaseClient.auth.getSession();d?.session?.access_token&&(c=d.session.access_token)}catch{}for(;;){const d=r+i-1,p=await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_TABLES.colaboradores}?select=*`,{method:"GET",headers:{apikey:SUPABASE_CONFIG.anonKey,Authorization:`Bearer ${c}`,Range:`${r}-${d}`,Prefer:"count=exact"}});if(!p.ok){const m=await p.text().catch(()=>"");throw new Error(`REST fallback colaboradores falhou (${p.status}): ${m||p.statusText}`)}const g=await p.json();if(!Array.isArray(g)||!g.length||(l=l.concat(g),g.length<i))break;r+=i}return l}let o=null,n=null;try{let r=[],l=0;for(;;){const c=supabaseClient.from(SUPABASE_TABLES.colaboradores).select("*").range(l,l+1e3-1),d=await withTimeout(c.then(g=>g),2e4,"Consulta Supabase colaboradores");if(d?.error){n=d.error;break}const p=d?.data||[];if(r=r.concat(p),p.length<1e3)break;l+=1e3}n||(o=r)}catch(i){n=i}if(n){AppErrorHandler.capture(n,{scope:"supabase-collaborators"},{silent:!0});try{const r=(await a()||[]).map(mapSupabaseCollaboratorRow);return allCollaboratorsCache={items:r,updatedAt:Date.now()},saveCollaboratorsSnapshot(r),setSupabaseHealth({status:"ok",source:"rest-fallback",lastSuccessAt:new Date().toISOString(),lastCount:r.length,lastError:""}),r}catch(i){AppErrorHandler.capture(i,{scope:"supabase-collaborators-fallback"},{silent:!0});const r=loadCollaboratorsSnapshot();return r.length?(allCollaboratorsCache={items:r,updatedAt:Date.now()},setSupabaseHealth({status:"degraded",source:"snapshot-local",lastSuccessAt:new Date().toISOString(),lastCount:r.length,lastError:String(i?.message||n?.message||"fallback-error")}),showToast("Supabase indispon\xEDvel. Usando snapshot local.","warning"),r):(setSupabaseHealth({status:"error",source:"none",lastError:String(i?.message||n?.message||"fetch-error")}),showToast("Falha ao carregar colaboradores do Supabase.","error"),[])}}const s=(o||[]).map(mapSupabaseCollaboratorRow);return allCollaboratorsCache={items:s,updatedAt:t},saveCollaboratorsSnapshot(s),setSupabaseHealth({status:"ok",source:"supabase-js",lastSuccessAt:new Date().toISOString(),lastCount:s.length,lastError:""}),s}finally{_inflightCollaboratorsFetch=null}})(),_inflightCollaboratorsFetch)}async function fetchSupabaseUnits(e=!1){if(!supabaseClient)return[];const t=Date.now();if(!e&&supaUnitsCache.items&&t-supaUnitsCache.updatedAt<SUPABASE_CACHE_TTL_MS)return supaUnitsCache.items;try{let o=[],n=0,s=null;for(;;){const{data:r,error:l}=await supabaseClient.from(SUPABASE_TABLES.unidades).select("*").range(n,n+1e3-1);if(l){s=l;break}if(o=o.concat(r||[]),!r||r.length<1e3)break;n+=1e3}if(s)return AppErrorHandler.capture(s,{scope:"supabase-unidades"},{silent:!0}),supaUnitsCache.items||[];const i=o.map(r=>({...r,nome:String(r?.posto||r?.cliente||r?.unidade_de_negocio||"").trim().toUpperCase(),endereco_formatado:formatUnitAddress(r)}));return supaUnitsCache={items:i,updatedAt:t},i}catch(a){return AppErrorHandler.capture(a,{scope:"supabase-unidades"},{silent:!0}),supaUnitsCache.items||[]}}function withTimeout(e,t,a){if(dataLayer&&typeof dataLayer.withTimeout=="function")return dataLayer.withTimeout(e,t,a);let o;const n=new Promise((s,i)=>{o=setTimeout(()=>{i(new Error(`${a||"Opera\xE7\xE3o"} excedeu o tempo limite (${t}ms).`))},t)});return Promise.race([e,n]).finally(()=>{clearTimeout(o)})}async function loadGroup(e){if(SiteAuth.logged&&Array.isArray(SiteAuth.groups)&&SiteAuth.groups.length&&e&&e!=="todos"&&!SiteAuth.groups.includes(e)&&!canViewAllGroups()){showToast("Voc\xEA n\xE3o tem permiss\xE3o para acessar este grupo.","error");return}setAppState("currentGroup",e,{silent:!0});const t=document.getElementById("search-input");t&&t.value&&(t.value=""),searchFilterGroup="all",searchFilterCargo="all",searchFilterEscala="all",searchFilterStatus="all",searchHideAbsence=!1,gateway.classList.add("hidden"),document.body.classList.remove("on-gateway"),closeUtilityDrawer(),appContainer.style.display="block",contentArea.innerHTML='<div class="loading-overlay"><div class="loading-spinner"></div><span>Carregando</span></div>',Promise.allSettled([loadCollaboratorAddressDb(!1),loadUnitAddressDb()]).then(()=>{}).catch(()=>{}),setAppState("currentData",[],{silent:!0});let a=await fetchSupabaseCollaborators(!1);if(Array.isArray(a)&&a.length===0){if(await new Promise(s=>setTimeout(s,1500)),supabaseClient)try{const{data:s}=await supabaseClient.auth.getSession();s?.session&&!SiteAuth.logged&&await applyAuthSession(s.session,{silent:!0})}catch{}allCollaboratorsCache={items:null,updatedAt:0},a=await fetchSupabaseCollaborators(!0)}if(!Array.isArray(a)){contentArea.innerHTML=`
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Falha ao carregar dados</span>
                <div class="loading-actions">
                    <button class="btn" onclick="loadGroup('${e||"todos"}')">Tentar novamente</button>
                    <button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Sair</button>
                    <button class="btn btn-secondary" onclick="copySupabaseDiagnostics()">Diagn\xF3stico</button>
                </div>
            </div>
        `,showToast("Falha ao carregar dados do Supabase. Tente novamente.","error");return}if(!SiteAuth.logged&&Array.isArray(a)&&a.length===0){contentArea.innerHTML=`
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Fa\xE7a login para carregar os dados</span>
                <div class="loading-actions">
                    <button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Voltar ao login</button>
                </div>
            </div>
        `;return}if(SiteAuth.logged&&a.length===0){contentArea.innerHTML=`
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Nenhum registro encontrado</span>
                <p style="font-size:0.85rem;color:#64748b;max-width:340px;text-align:center;">Verifique sua conex\xE3o ou tente novamente. Em redes m\xF3veis, o carregamento pode ser mais lento.</p>
                <div class="loading-actions">
                    <button class="btn" onclick="loadGroup('${e||"todos"}')">Tentar novamente</button>
                    <button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Sair e entrar novamente</button>
                    <button class="btn btn-secondary" onclick="copySupabaseDiagnostics()">Diagn\xF3stico</button>
                </div>
            </div>
        `;return}e&&e!=="todos"?a=a.filter(s=>s.grupo===e):!canViewAllGroups()&&Array.isArray(SiteAuth.groups)&&SiteAuth.groups.length&&(a=a.filter(s=>SiteAuth.groups.includes(s.grupo))),setAppState("currentData",a.map((s,i)=>({...s,id:i})),{silent:!0}),setAppState("lastUpdatedAt",new Date,{silent:!0});const o=getGroupLabelMap(),n=e&&e!=="todos"?o[e]||e.toUpperCase():"Geral";setAppTitle(`Gerenciamento de Efetivos - ${n}`),renderDashboard(),clearSearchInput(),requestAnimationFrame(()=>{const s=document.getElementById("search-input");s&&s.value&&(s.value="",clearSearchInput())}),updateLastUpdatedDisplay(),runDailySafetySnapshot()}function resetToGateway(){clearTabScopedTimers("gateway"),appContainer.style.display="none",gateway.classList.remove("hidden"),document.body.classList.add("on-gateway"),closeUtilityDrawer(),setAppState("currentData",[],{silent:!0}),setAppState("currentGroup","",{silent:!0}),hiddenUnits.clear(),minimizedUnits.clear(),updateLastUpdatedDisplay()}async function getAllCollaborators(e=!1){const t=getCachedAllCollaborators();if(!e&&t)return t;const a=await fetchSupabaseCollaborators(e);return setCachedAllCollaborators(a,SUPABASE_CACHE_TTL_MS),a}function mapRowsToObjects(e,t,a,o,n){return e.map(s=>{if(s.length<6)return null;const i=(s[5]||"").trim(),r=(s[4]||"").trim().toUpperCase(),l=(s[7]||"").trim().toUpperCase(),c=i.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");if(r==="COLABORADOR"&&c==="MATRICULA"&&l==="POSTO")return null;if(a&&collaboratorEdits[i]){const v={...collaboratorEdits[i],grupo:t};return v.endereco||(v.endereco=findCollaboratorAddress(i,n)),v.cargo||(v.cargo=findCollaboratorRole(i,n)),v}const d=findPhone(i,r,o),p=findCollaboratorAddress(i,n),g=findCollaboratorRole(i,n),m=(s[0]||"").trim().toUpperCase();let f=s[2]||"",u=extrairTipoEscala(f);return{nome:r,re:(s[5]||"").trim(),posto:l||"N/I",grupoLabel:m,escala:f.replace("PRE-ASSINALADO","").replace("12x36","").replace("5x2","").replace("6x1","").trim(),tipoEscala:u,turma:parseInt(s[3])||1,rotulo:"",rotuloInicio:"",rotuloFim:"",rotuloDetalhe:"",grupo:t,telefone:d,endereco:p,cargo:g}}).filter(validateCollaboratorData)}function normalizeHeaderValue(e){return(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()}function normalizeReKey(e){return e==null?"":String(e).replace(/[^a-zA-Z0-9]/g,"")}function validateCollaboratorData(e){if(!e||typeof e!="object")return!1;const t=String(e.nome||"").trim(),a=normalizeReKey(e.re||"");return!!(t&&a)}function validateAddressData(e){if(!e||typeof e!="object")return!1;const t=String(e.nome||e.unidade||e.posto||"").trim(),a=normalizeReKey(e.re||e.matricula||""),o=String(e.endereco||e.address||"").trim(),n=String(e.cargo||e.role||"").trim();return t?!!o:a?!!(o||n):!1}function findPhone(e,t,a){if(!a||!e)return"";const o=e.replace(/[^a-zA-Z0-9]/g,""),s=t.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().split(" ")[0];let i=a.find(r=>r.re.replace(/[^a-zA-Z0-9]/g,"")===o);return i||(i=a.find(r=>{const l=r.re.replace(/[^a-zA-Z0-9]/g,"");if(l.length>=3&&(o.endsWith(l)||l.endsWith(o)||o.includes(l)||l.includes(o))){const d=r.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().split(" ")[0];return d&&s&&d===s}return!1})),i?i.phone:""}async function loadCollaboratorAddressDb(e=!1){if(collaboratorAddressLoaded&&!e)return collaboratorAddressMap;try{const t=await fetchSupabaseCollaborators(e),a={};t.forEach(o=>{const n=normalizeReKey(o.matricula||o.re_padrao||o.re||"");if(!n)return;const s=String(o.endereco_colaborador||o.endereco||"").trim(),i=String(o.cargo||"").trim();validateAddressData({re:n,endereco:s,cargo:i})&&(a[n]={address:s,role:i})}),collaboratorAddressMap=a,collaboratorAddressLoaded=!0,collaboratorAddressUpdatedAt=new Date}catch{}return collaboratorAddressMap}function findCollaboratorAddress(e,t){return findCollaboratorProfile(e,t).address}function findCollaboratorRole(e,t){return findCollaboratorProfile(e,t).role}function findCollaboratorProfile(e,t){if(!e)return{address:"",role:""};const a=t||collaboratorAddressMap||{},o=normalizeReKey(e),n=a[o];if(!n)return{address:"",role:""};if(typeof n=="string")return{address:n,role:""};const s=String(n.address||n.endereco||"").trim(),i=String(n.role||n.cargo||"").trim();return{address:s,role:i}}function getCollaboratorAddressByRe(e){return findCollaboratorAddress(e,collaboratorAddressMap)}function getCollaboratorRoleByRe(e){return findCollaboratorRole(e,collaboratorAddressMap)}function getAddressForCollaborator(e){return e?e.endereco||getCollaboratorAddressByRe(e.re):""}function renderDashboard(){const e=isAdminRole();searchAdvancedOpen=!1,contentArea.innerHTML=`
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span id="breadcrumb-group"></span>
                <span class="breadcrumb-sep">\u203A</span>
                <span id="breadcrumb-tab"></span>
                <span class="breadcrumb-sep">\u203A</span>
                <span id="breadcrumb-context"></span>
            </div>
            <div class="breadcrumb-meta">
                <span id="breadcrumb-updated" class="breadcrumb-updated"></span>
                <span id="breadcrumb-group-pill" class="group-pill"></span>
            </div>
        </div>
        <!-- Navega\xE7\xE3o de Abas -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('busca')">${ICONS.search} Busca R\xE1pida</button>
            <button class="tab-btn" onclick="switchTab('unidades')">${ICONS.building} Unidades</button>
            ${SiteAuth.logged?`<button class="tab-btn" onclick="switchTab('avisos')">${ICONS.bell} Avisos <span id="avisos-tab-badge" class="tab-badge hidden">0</span></button>`:""}
            <button class="tab-btn" onclick="switchTab('reciclagem')">${ICONS.recycle} Reciclagem</button>
            <button class="tab-btn" onclick="switchTab('lancamentos')">${ICONS.launch} Lan\xE7amentos</button>
            <button class="tab-btn" onclick="switchTab('config')">${ICONS.settings} Configura\xE7\xE3o</button>
        </div>

        <!-- Conte\xFAdo das Abas -->
        <div id="tab-content-busca" class="tab-content">
            <div class="search-container">
                <div class="search-bar">
                    <div class="search-input-wrap">
                        <input type="text" id="search-input" class="search-input" name="q_x" 
                               placeholder="Nome, RE, posto, cargo, empresa, escala, telefone..." autocomplete="off">
                        <button id="search-clear-btn" type="button" class="search-clear-btn hidden" onclick="clearSearchInput()" aria-label="Limpar busca">&times;</button>
                    </div>
                    <button id="btn-invert-plantao" type="button" class="btn-invert-plantao" onclick="toggleInvertPanelOpen()">
                        <span class="bip-icon">\u21C4</span>
                        <span class="bip-label">INVERTER PLANT\xC3O</span>
                    </button>
                </div>
                <div id="invert-plantao-panel" class="invert-plantao-panel hidden"></div>
                <div id="search-autocomplete" class="search-autocomplete hidden"></div>
                <div id="search-suggestions" class="search-suggestions hidden"></div>
                <div class="search-filters-compact">
                    <div class="filter-chips-row">
                        <button class="filter-chip active" data-filter="all" onclick="setSearchFilterStatus('all')">Todos</button>
                        <button class="filter-chip" data-filter="plantao" onclick="setSearchFilterStatus('plantao')">Plant\xE3o</button>
                        <button class="filter-chip" data-filter="folga" onclick="setSearchFilterStatus('folga')">Folga</button>
                        <button class="filter-chip" data-filter="ft" onclick="setSearchFilterStatus('ft')">FT</button>
                        <button class="filter-chip" data-filter="afastado" onclick="setSearchFilterStatus('afastado')">Afastados</button>
                        <button class="filter-chip" data-filter="favorites" onclick="setSearchFilterStatus('favorites')">\u2605</button>
                        <button class="filter-chip" data-hide="1" onclick="toggleSearchHideAbsence()">Sem afast.</button>
                    </div>
                    <div class="filter-selects-row">
                        ${!currentGroup||currentGroup==="todos"?`<select id="search-group-filter" class="filter-select-sm" onchange="setSearchFilterGroup(this.value)">
                            <option value="all">Grupo</option>
                            ${CONFIG.groupRules.map(h=>`<option value="${h.key}">${h.label}</option>`).join("")}
                        </select>`:""}
                        <select id="search-cargo-filter" class="filter-select-sm" onchange="setSearchFilterCargo(this.value)">
                            <option value="all">Cargo</option>
                        </select>
                        <select id="search-escala-filter" class="filter-select-sm" onchange="setSearchFilterEscala(this.value)">
                            <option value="all">Escala</option>
                        </select>
                    </div>
                </div>
                <div id="search-advanced-panel" class="search-advanced hidden">
                    <div class="search-date-filters">
                        <div class="search-date-field">
                            <label>Data FT de</label>
                            <input type="date" id="search-date-from" value="${searchDateFilter.from||""}">
                        </div>
                        <div class="search-date-field">
                            <label>ate</label>
                            <input type="date" id="search-date-to" value="${searchDateFilter.to||""}">
                        </div>
                    </div>
                    <div class="search-advanced-actions">
                        <button class="btn-std btn-sm" onclick="applySearchDatePreset('today')">Hoje</button>
                        <button class="btn-std btn-sm" onclick="applySearchDatePreset('week')">7 dias</button>
                        <button class="btn-std btn-sm" onclick="applySearchDatePreset('month')">Mes</button>
                        <button class="btn-std btn-sm btn-outline" onclick="clearSearchDateFilter()">Limpar</button>
                    </div>
                </div>
                <div id="search-summary" class="search-summary hidden"></div>
                <div id="search-favorites" class="search-favorites hidden">
                    <div class="search-favorites-title">Meus Favoritos</div>
                    <div id="search-favorites-list" class="search-favorites-list"></div>
                </div>
            </div>
            <div id="search-results" class="results-grid"></div>
        </div>

        <div id="tab-content-unidades" class="tab-content hidden">
            <!-- Barra de Estat\xEDsticas -->
            <div id="stats-bar" class="stats-bar"></div>
            <!-- Controles -->
            <div class="search-container">
                <div class="search-bar">
                    <input type="text" id="unit-search-input" class="search-input" 
                        placeholder="\u{1F50D} Buscar unidade..." autocomplete="off">
                </div>
                <div class="search-filters unit-filters">
                    ${currentGroup==="todos"?`
                        <select id="unit-group-filter" class="filter-select" onchange="renderizarUnidades()">
                            ${getGroupOptionsHtml()}
                        </select>
                    `:""}
                    <select id="unit-status-filter" class="filter-select" onchange="renderizarUnidades()">
                        <option value="all">Todos os Status</option>
                        <option value="plantao">Em Plant\xE3o</option>
                        <option value="folga">De Folga</option>
                    </select>
                    <select id="unit-label-filter" class="filter-select" onchange="renderizarUnidades()">
                        <option value="all">Todos os R\xF3tulos</option>
                        <option value="none">Sem R\xF3tulo</option>
                        <option value="F\xC9RIAS">F\xE9rias</option>
                        <option value="ATESTADO">Atestado</option>
                        <option value="AFASTADO">Afastado</option>
                        <option value="FT">FT</option>
                        <option value="TROCA">Troca</option>
                        <option value="OUTRO">Outro</option>
                    </select>
                </div>
                <div class="search-date-filters unit-date-filters">
                    <div class="search-date-field">
                        <label>Data de</label>
                        <input type="date" id="unit-date-from" value="${unitDateFilter.from||""}">
                    </div>
                    <div class="search-date-field">
                        <label>at\xE9</label>
                        <input type="date" id="unit-date-to" value="${unitDateFilter.to||""}">
                    </div>
                    <div class="menu-actions-row unit-toolbar-actions">
                        <button class="btn btn-secondary btn-small" onclick="openExportModal()">${ICONS.download} Exportar</button>
                        <button class="btn btn-secondary btn-small" onclick="openHistoryModal()">${ICONS.history} Hist\xF3rico</button>
                        <button class="btn btn-secondary btn-small" onclick="clearUnitDateFilter()">Limpar data</button>
                    </div>
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
                            <button class="btn btn-secondary btn-small" onclick="exportarAvisosMensal()">Relat\xF3rio mensal</button>
                            <button class="btn btn-secondary btn-small" onclick="openLembreteForm()">Novo Lembrete</button>
                            <button class="btn btn-secondary btn-small" onclick="clearAvisos()">Limpar avisos</button>
                            ${isAdminRole()?'<button class="btn btn-small" onclick="openAvisoForm()">Novo Aviso</button>':""}
                        </div>
                    </div>
                    <div class="avisos-filters">
                        <select id="aviso-group-filter" class="filter-select" onchange="renderAvisos()">
                            ${getGroupOptionsHtml()}
                        </select>
                        <select id="aviso-status-filter" class="filter-select" onchange="renderAvisos()">
                            <option value="all" selected>Todos</option>
                            <option value="pending">Pendentes</option>
                            <option value="done">Conclu\xEDdos</option>
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
                            <option value="single">\xDAnico</option>
                            <option value="recurring">Recorrente</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Recorr\xEAncia</label>
                        <select id="reminder-every">
                            <option value="daily">Di\xE1rio</option>
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
                    <div class="reciclagem-actions menu-actions-row">
                        <button class="btn btn-secondary btn-small" onclick="loadReciclagemData(true); renderReciclagem();">Atualizar</button>
                        <button class="btn btn-secondary btn-small" onclick="exportReciclagemReport()">Exportar relat\xF3rio</button>
                        ${isAdminRole()?'<button class="btn btn-secondary btn-small" onclick="toggleReciclagemTemplatesPanel()">Editar mensagens</button>':""}
                        ${isAdminRole()?'<button class="btn btn-secondary btn-small" onclick="toggleReciclagemHistory()">Hist\xF3rico</button>':""}
                    </div>
                </div>
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
                        <option value="due">Pr\xF3ximo do vencimento</option>
                        <option value="expired">Vencido</option>
                        <option value="unknown">Sem data</option>
                    </select>
                    <button id="reciclagem-only-expired" class="btn btn-secondary btn-small" onclick="toggleReciclagemOnlyExpired()">Somente vencidos</button>
                </div>
                <div class="reciclagem-quick">
                    <span>R\xE1pidos:</span>
                    <button class="filter-chip" data-status="expired" onclick="setReciclagemStatusFilter('expired')">Vencidos</button>
                    <button class="filter-chip" data-status="due" onclick="setReciclagemStatusFilter('due')">Pr\xF3ximos</button>
                    <button class="filter-chip" data-status="ok" onclick="setReciclagemStatusFilter('ok')">Em dia</button>
                    <button class="filter-chip" data-status="all" onclick="setReciclagemStatusFilter('all')">Limpar</button>
                </div>
                <div id="reciclagem-templates-panel" class="reciclagem-templates hidden">
                    <div class="reciclagem-templates-header">
                        <strong>Mensagens de renova\xE7\xE3o</strong>
                        <button class="btn-mini btn-secondary" onclick="toggleReciclagemTemplatesPanel()">Fechar</button>
                    </div>
                    <div id="reciclagem-templates-list" class="reciclagem-templates-list"></div>
                    <div class="reciclagem-templates-form">
                        <input type="text" id="reciclagem-template-id" placeholder="ID (ex: aso_mesat)">
                        <input type="text" id="reciclagem-template-label" placeholder="T\xEDtulo">
                        <textarea id="reciclagem-template-text" rows="3" placeholder="Mensagem"></textarea>
                        <button class="btn btn-secondary btn-small" onclick="addReciclagemTemplate()">Adicionar modelo</button>
                    </div>
                </div>
                <div id="reciclagem-history-panel" class="reciclagem-history hidden">
                    <div class="reciclagem-templates-header">
                        <strong>Hist\xF3rico de altera\xE7\xF5es</strong>
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
                <div class="lancamentos-top">
                    <div class="lancamentos-title">
                        <h3 id="lancamentos-main-title">Lan\xE7amentos FT (Supabase em implanta\xE7\xE3o)</h3>
                        <div class="lancamentos-meta">
                            <span id="lancamentos-sync-status" class="lancamentos-sync-pill">Integra\xE7\xE3o Supabase pendente</span>
                        </div>
                        <div class="lancamentos-mode-switch" id="lancamentos-mode-switch">
                            <button class="lancamentos-mode-btn active" data-mode="ft" onclick="switchLancamentosMode('ft')">FT</button>
                            <button class="lancamentos-mode-btn" data-mode="troca" onclick="switchLancamentosMode('troca')">Troca de folga</button>
                        </div>
                    </div>
                    <div class="lancamentos-actions menu-actions-row">
                        <div id="lancamentos-actions-ft" class="lanc-action-group">
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('diaria')">Di\xE1ria FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Indicadores FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Hist\xF3rico FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('planejamento')">Planejamento FT</button>
                        </div>
                        <div id="lancamentos-actions-troca" class="lanc-action-group hidden">
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('diaria')">Di\xE1ria Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Indicadores Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Hist\xF3rico Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('planejamento')">Planejamento Troca</button>
                        </div>
                    </div>
                </div>
                <div class="lancamentos-tabs" id="lancamentos-tabs-ft">
                    <button class="lancamentos-tab daily-focus" data-tab="diaria" onclick="switchLancamentosTab('diaria')">Di\xE1ria <span class="tab-badge" id="lancamentos-tab-today">0</span></button>
                    <button class="lancamentos-tab" data-tab="dashboard" onclick="switchLancamentosTab('dashboard')">Indicadores <span class="tab-badge" id="lancamentos-tab-total">0</span></button>
                    <button class="lancamentos-tab" data-tab="historico" onclick="switchLancamentosTab('historico')">Hist\xF3rico <span class="tab-badge" id="lancamentos-tab-pending">0</span></button>
                    <button class="lancamentos-tab" data-tab="planejamento" onclick="switchLancamentosTab('planejamento')">Planejamento <span class="tab-badge" id="lancamentos-tab-planning">0</span></button>
                </div>
                <div class="lancamentos-tabs hidden" id="lancamentos-tabs-troca">
                    <button class="lancamentos-tab daily-focus" data-tab="diaria" onclick="switchLancamentosTab('diaria')">Di\xE1ria <span class="tab-badge" id="lancamentos-tab-troca-today">0</span></button>
                    <button class="lancamentos-tab" data-tab="dashboard" onclick="switchLancamentosTab('dashboard')">Indicadores <span class="tab-badge" id="lancamentos-tab-troca-total">0</span></button>
                    <button class="lancamentos-tab" data-tab="historico" onclick="switchLancamentosTab('historico')">Hist\xF3rico <span class="tab-badge" id="lancamentos-tab-troca-pending">0</span></button>
                    <button class="lancamentos-tab" data-tab="planejamento" onclick="switchLancamentosTab('planejamento')">Planejamento <span class="tab-badge" id="lancamentos-tab-troca-planning">0</span></button>
                </div>
                <div id="lancamentos-filters-wrap" class="lancamentos-filters-wrap"></div>
                <div id="lancamentos-panel-diaria" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-troca" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-dashboard" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-historico" class="lancamentos-panel hidden"></div>
                <div id="lancamentos-panel-planejamento" class="lancamentos-panel hidden"></div>
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
                        <div class="ft-coverage-actions">
                            <button class="btn btn-secondary btn-small" onclick="suggestFtCoverageByUnit()">Sugerir por proximidade</button>
                            <div class="hint">Sugere colaboradores de folga, priorizando quem j\xE1 trabalha na unidade selecionada.</div>
                        </div>
                    </div>
                    <div id="ft-coverage-suggestions" class="results-grid"></div>
                    <div class="form-group">
                        <label>Data da FT</label>
                        <input type="date" id="ft-date">
                    </div>
                    <div class="form-group">
                        <label>Hor\xE1rio / Escala</label>
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
                        <input type="text" id="ft-covering-other" placeholder="Outro (se n\xE3o estiver na lista)">
                    </div>
                    <div class="form-group">
                        <label>Observa\xE7\xF5es</label>
                        <textarea id="ft-notes" class="ft-textarea" rows="3" placeholder="Digite observa\xE7\xF5es..."></textarea>
                    </div>
                    <div class="form-group">
                        <button class="btn" onclick="createFtLaunch()">Salvar Lan\xE7amento</button>
                    </div>
                    <div class="ft-actions">
                        <div class="ft-actions-title">Ap\xF3s salvar</div>
                        <button class="btn btn-secondary btn-small" onclick="copyFtLastLink()" id="ft-copy-last" disabled>Copiar link de confirma\xE7\xE3o</button>
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
                            <div class="card-title">Acesso ao Sistema</div>
                            <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                        </div>
                        <div class="config-card-body">
                            <div class="field-row">
                                <label>E-mail</label>
                                <input type="email" id="loginEmail" placeholder="seu@email.com">
                            </div>
                            <div class="field-row">
                                <label>Senha</label>
                                <input type="password" id="loginPassword" placeholder="\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022">
                            </div>
                            <div class="field-row field-row-check">
                                <label class="check-label"><input type="checkbox" id="keepLoggedCheck" checked> Permanecer conectado</label>
                            </div>
                            <div class="actions">
                                <button class="btn" onclick="loginSite()">Entrar</button>
                                <button class="btn btn-secondary btn-small" onclick="signupSite()">Criar conta</button>
                                <button class="btn btn-secondary btn-small" onclick="requestPasswordReset()">Esqueci senha</button>
                            </div>
                            <div class="hint">Ap\xF3s criar sua conta, solicite acesso ao administrador da sua base.</div>
                        </div>
                    </div>
                </div>

                <div id="config-content" class="hidden">
                        <div class="config-tabs" role="tablist" aria-label="Se\xE7\xF5es de configura\xE7\xE3o">
                            <button class="config-tab active" onclick="switchConfigTab('access', this)">
                                <span class="config-tab-index">01</span>
                                <span class="config-tab-label">Minha Conta</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('team', this)">
                                <span class="config-tab-index">02</span>
                                <span class="config-tab-label">Equipe & Permiss\xF5es</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('operation', this)">
                                <span class="config-tab-index">03</span>
                                <span class="config-tab-label">Opera\xE7\xE3o</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('system', this)">
                                <span class="config-tab-index">04</span>
                                <span class="config-tab-label">Sistema</span>
                            </button>
                        </div>

                    <!-- \u2550\u2550\u2550 ABA: MINHA CONTA \u2550\u2550\u2550 -->
                    <div id="config-pane-access" class="config-pane">
                        <div class="config-section">
                            <div class="config-section-title">Sess\xE3o ativa</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Seu perfil</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="statusSection">
                                            <div class="status-block">
                                                <div class="status-row"><span>Usu\xE1rio</span><span id="userRe"></span></div>
                                                <div class="status-row"><span>Modo</span><span id="siteMode"></span></div>
                                                <div class="status-row"><span>Cargo</span><span id="userRoleLabel"></span></div>
                                            </div>
                                            <div class="actions" style="margin-top:12px;">
                                                <button class="btn" onclick="toggleEditMode()">Alternar Modo Edi\xE7\xE3o</button>
                                                <button class="btn btn-secondary" onclick="logoutSite()">Sair</button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Seu cargo e permiss\xF5es</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="myRoleDescription" class="config-note"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- \u2550\u2550\u2550 ABA: EQUIPE & PERMISS\xD5ES \u2550\u2550\u2550 -->
                    <div id="config-pane-team" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">N\xEDveis de acesso</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Cargos e permiss\xF5es do sistema</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Cada cargo define o que o colaborador pode fazer no sistema. Permiss\xF5es s\xE3o cumulativas \u2014 cargos superiores herdam tudo dos inferiores.</div>
                                        <div id="rolePermissionsTable" class="role-perm-table"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Gerenciar equipe</div>
                            <div class="config-grid">
                                <div class="config-card hidden" id="adminTools">
                                    <div class="config-card-header">
                                        <div class="card-title">Usu\xE1rios cadastrados</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="userList" class="admin-list"></div>
                                        <div class="actions" style="margin-top:8px;">
                                            <button class="btn btn-secondary" onclick="refreshUserList()">Atualizar lista</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="config-card hidden" id="adminAssignPanel">
                                    <div class="config-card-header">
                                        <div class="card-title">Conceder / alterar acesso</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Selecione um usu\xE1rio da lista acima ou digite o e-mail para atribuir permiss\xF5es.</div>
                                        <div class="field-row">
                                            <label>E-mail do usu\xE1rio</label>
                                            <input type="email" id="cfg-user-email" placeholder="usuario@email.com">
                                        </div>
                                        <div class="field-row">
                                            <label>Cargo</label>
                                            <select id="cfg-user-role">
                                                <option value="visitante">Visitante \u2014 Somente consulta</option>
                                                <option value="operacional">Operacional \u2014 Somente visualiza\xE7\xE3o</option>
                                                <option value="supervisor">Supervisor \u2014 Visualiza\xE7\xE3o + edi\xE7\xE3o</option>
                                                <option value="coordenador">Coordenador \u2014 Edi\xE7\xE3o + todos os grupos</option>
                                                <option value="gerencia">Ger\xEAncia \u2014 Edi\xE7\xE3o + todos os grupos + dashboards</option>
                                                <option value="administrador">Administrador \u2014 Controle total</option>
                                            </select>
                                        </div>
                                        <div class="field-row">
                                            <label>Grupos</label>
                                            <div id="cfg-user-groups-checkboxes" class="checkbox-group cfg-groups-checks">
                                                ${(CONFIG?.groupRules||[]).map(h=>`<label><input type="checkbox" value="${h.key}"> ${h.label}</label>`).join("")}
                                            </div>
                                        </div>
                                        <div class="actions">
                                            <button class="btn" onclick="upsertUserProfileFromConfig()">Salvar permiss\xF5es</button>
                                        </div>
                                        <div class="hint">Se o usu\xE1rio j\xE1 criou conta e ainda n\xE3o aparece, confirme se ele entrou neste ambiente e se o e-mail \xE9 exatamente o mesmo do cadastro.</div>
                                    </div>
                                </div>

                                <div class="config-card hidden" id="preRegPanel">
                                    <div class="config-card-header">
                                        <div class="card-title">Pr\xE9-cadastrar e-mails</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Cadastre e-mails antecipadamente. Quando a pessoa criar conta com esse e-mail, j\xE1 ter\xE1 o cargo e grupos definidos automaticamente.</div>
                                        <div id="preRegList" class="admin-list"></div>
                                        <div class="divider"></div>
                                        <div class="field-row">
                                            <label>E-mail</label>
                                            <input type="email" id="preReg-email" placeholder="novo.colaborador@email.com">
                                        </div>
                                        <div class="field-row">
                                            <label>Cargo</label>
                                            <select id="preReg-role">
                                                <option value="visitante">Visitante</option>
                                                <option value="operacional" selected>Operacional</option>
                                                <option value="supervisor">Supervisor</option>
                                                <option value="coordenador">Coordenador</option>
                                                <option value="gerencia">Ger\xEAncia</option>
                                                <option value="administrador">Administrador</option>
                                            </select>
                                        </div>
                                        <div class="field-row">
                                            <label>Grupos</label>
                                            <div id="preReg-groups-checkboxes" class="checkbox-group cfg-groups-checks">
                                                ${(CONFIG?.groupRules||[]).map(h=>`<label><input type="checkbox" value="${h.key}"> ${h.label}</label>`).join("")}
                                            </div>
                                        </div>
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="addPreRegisteredEmail()">Adicionar e-mail</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="config-card" id="teamNoAccess">
                                    <div class="config-card-body">
                                        <div class="config-note">Apenas administradores podem gerenciar a equipe. Solicite ao administrador da sua base se precisar alterar permiss\xF5es.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- \u2550\u2550\u2550 ABA: OPERA\xC7\xC3O \u2550\u2550\u2550 -->
                    <div id="config-pane-operation" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Escala de plant\xE3o</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Invers\xE3o de escala</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="field-row">
                                            <label>Invers\xE3o manual</label>
                                            <div class="actions">
                                                <button class="btn btn-secondary" onclick="toggleEscalaInvertida('todos')">Inverter plant\xE3o (todos)</button>
                                                <span id="escala-invertida-status" class="status-badge-menu view">Padr\xE3o</span>
                                            </div>
                                        </div>
                                        <div class="config-note">Invers\xE3o autom\xE1tica no in\xEDcio de meses pares. Use este bot\xE3o como corre\xE7\xE3o manual.</div>
                                        <div class="config-note">Turma 1 \u2192 dias pares, Turma 2 \u2192 dias \xEDmpares. Afeta busca, dashboards e exporta\xE7\xF5es.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Lan\xE7amentos de FT</div>
                            <div class="config-grid">
                                <div class="config-card" id="ftReasonsCard">
                                    <div class="config-card-header">
                                        <div class="card-title">Motivos de FT</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Motivos dispon\xEDveis para sele\xE7\xE3o nos lan\xE7amentos de Falta ao Trabalho.</div>
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

                        <div class="config-section">
                            <div class="config-section-title">A\xE7\xF5es r\xE1pidas</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-body">
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="reloadCurrentGroupData()">Recarregar dados do grupo</button>
                                            <button class="btn btn-secondary" onclick="openExportModal()">Exportar base</button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- \u2550\u2550\u2550 ABA: SISTEMA \u2550\u2550\u2550 -->
                    <div id="config-pane-system" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Vis\xE3o geral da base</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Resumo</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="config-summary" class="config-summary"></div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Conex\xF5es e fontes de dados</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="sourceStatus" class="source-status"></div>
                                        <div id="dataSourceList" class="source-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Hist\xF3rico e evolu\xE7\xE3o</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Altera\xE7\xF5es recentes</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="auditList" class="audit-list"></div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Roadmap de melhorias</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:6px;">Evolu\xE7\xF5es priorizadas para a opera\xE7\xE3o.</div>
                                        <div id="roadmap-list" class="roadmap-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Edi\xE7\xE3o -->
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
                    <div class="form-group"><label>Escala (Hor\xE1rio)</label><select id="edit-escala"></select></div>
                    <div class="form-group">
                        <label>Regra de Plant\xE3o</label>
                        <select id="edit-turma">
                            <option value="1">Plant\xE3o \xCDMPAR</option>
                            <option value="2">Plant\xE3o PAR</option>
                        </select>
                    </div>
                </div>
                <div class="form-group">
                    <label>R\xF3tulo / Afastamento (M\xFAltipla Escolha)</label>
                    <div id="edit-rotulo-container" class="checkbox-group">
                        <label><input type="checkbox" value="F\xC9RIAS"> F\xE9rias</label>
                        <label><input type="checkbox" value="ATESTADO"> Atestado</label>
                        <label><input type="checkbox" value="AFASTADO"> Afastamento</label>
                        <label><input type="checkbox" value="FT"> FT</label>
                        <label><input type="checkbox" value="TROCA"> Troca</label>
                        <label><input type="checkbox" value="OUTRO"> Outro</label>
                    </div>
                </div>
                <div id="div-rotulo-desc" class="form-group hidden">
                    <label>Descri\xE7\xE3o (Outros)</label>
                    <input type="text" id="edit-rotulo-desc" placeholder="Ex: Curso, Licen\xE7a...">
                </div>
                <div class="form-grid">
                    <div class="form-group"><label>In\xEDcio (Opcional)</label><input type="date" id="edit-inicio"></div>
                    <div class="form-group"><label>Fim (Opcional)</label><input type="date" id="edit-fim"></div>
                </div>

                <div class="modal-actions" style="justify-content: space-between;">
                    <button class="btn" style="background-color: #dc3545; width: auto;" onclick="removerColaborador()">Excluir</button>
                    <button class="btn btn-secondary" style="width: auto;" onclick="closeEditModal()">Cancelar</button>
                </div>
            </div>
        </div>

        <!-- Modal de Detalhes do Colaborador -->
        <div id="collab-details-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.eye} Detalhes do Colaborador</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeCollabDetailsModal()">Fechar</button>
                    </div>
                </div>
                <div id="collab-details-body" class="details-grid"></div>
            </div>
        </div>

        <!-- P\xE1gina Completa do Colaborador (CRM) -->
        <div id="tab-content-collab-detail" class="tab-content hidden"></div>

        <!-- Modal de Detalhes da Unidade -->
        <div id="unit-details-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.eye} Detalhes da Unidade</h3>
                    <div class="modal-header-actions">
                        <button class="btn btn-secondary btn-compact" onclick="closeUnitDetailsModal()">Fechar</button>
                    </div>
                </div>
                <div id="unit-details-body" class="details-grid"></div>
            </div>
        </div>

        <!-- Modal de Edi\xE7\xE3o de Unidade -->
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
                    <label>R\xF3tulo da Unidade (M\xFAltipla Escolha)</label>
                    <div id="edit-unit-rotulo-container" class="checkbox-group">
                        <label><input type="checkbox" value="REFEICAO"> Refei\xE7\xE3o no Local</label>
                        <label><input type="checkbox" value="VT"> Vale Transporte</label>
                        <label><input type="checkbox" value="OUTRO"> Outro</label>
                    </div>
                </div>
                <div id="div-unit-rotulo-desc" class="form-group hidden">
                    <label>Descri\xE7\xE3o (Outros)</label>
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
                                <option value="">Selecione o hor\xE1rio</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <select id="new-colab-turma">
                                <option value="1">Plant\xE3o \xCDMPAR</option>
                                <option value="2">Plant\xE3o PAR</option>
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
                    <h4>A\xE7\xF5es em Massa</h4>
                    <div class="bulk-controls">
                        <select id="bulk-action-select">
                            <option value="">-- Selecione uma a\xE7\xE3o --</option>
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

        <!-- Modal de Hist\xF3rico -->
        <div id="history-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 800px;">
                <div class="modal-header">
                    <h3>${ICONS.history} Hist\xF3rico de Altera\xE7\xF5es</h3>
                    <button class="close-modal" onclick="closeHistoryModal()">${ICONS.close}</button>
                </div>
                <div id="history-actions" class="history-actions"></div>
                <div id="history-list" class="unit-members-list" style="max-height: 400px;"></div>
            </div>
        </div>

        <!-- Modal de Op\xE7\xF5es de Contato -->
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

        <!-- Modal de Exporta\xE7\xE3o -->
        <div id="export-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${ICONS.download} Exporta\xE7\xE3o</h3>
                    <button class="close-modal" onclick="closeExportModal()">${ICONS.close}</button>
                </div>

                <div class="export-grid">
                    <div class="export-col">
                        <h4>Exporta\xE7\xF5es</h4>
                        <button class="btn" onclick="exportarSomentePlantao()">Exportar Somente Plant\xE3o (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarSomenteFolga()">Exportar Somente Folga (XLSX)</button>
                        <button class="btn" onclick="exportarBaseAtualizada()">Baixar Base Atualizada (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarResumo()">Baixar Resumo (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarTudo()">Baixar Completo (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarCSVAtualizado()">Baixar CSV Atualizado</button>
                        <button class="btn btn-secondary" onclick="exportarGraficos()">Baixar Dados p/ Gr\xE1ficos (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarRelatorioIA()">Baixar Relat\xF3rio IA (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarResumoGerencial()">Baixar Resumo Gerencial (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarHistoricoDetalhado()">Baixar Hist\xF3rico Detalhado (XLSX)</button>
                        <button class="btn btn-secondary" onclick="exportarRelatorioTexto()">Baixar Relat\xF3rio Texto (TXT)</button>
                        <h4 style="margin-top:16px;">PDFs</h4>
                        <button class="btn btn-secondary" onclick="exportarPDFResumoExecutivo()">Gerar PDF - Resumo Executivo</button>
                        <button class="btn btn-secondary" onclick="exportarPDFHistorico()">Gerar PDF - Hist\xF3rico</button>
                    </div>
                    <div class="export-col">
                        <h4>Conte\xFAdo</h4>
                        <p class="export-note">Base Atualizada cont\xE9m o banco com as altera\xE7\xF5es atuais aplicadas.</p>
                        <p class="export-note">Resumo inclui totais por unidade, status e r\xF3tulos.</p>
                        <p class="export-note">Completo inclui todas as abas: Base, Resumo, Unidades, R\xF3tulos e Hist\xF3rico.</p>
                        <p class="export-note">Dados p/ Gr\xE1ficos traz s\xE9ries prontas para gr\xE1fico de plant\xE3o x folga e top unidades.</p>
                        <p class="export-note">Relat\xF3rio IA gera observa\xE7\xF5es autom\xE1ticas sobre cobertura e r\xF3tulos.</p>
                        <p class="export-note">Resumo Gerencial traz vis\xE3o executiva, por grupo/unidade/status/r\xF3tulo e indicadores.</p>
                        <p class="export-note">Hist\xF3rico Detalhado organiza a\xE7\xF5es por respons\xE1vel, data e tipo de altera\xE7\xE3o.</p>
                        <p class="export-note">Relat\xF3rio Texto gera um resumo pronto para envio \xE0 ger\xEAncia.</p>
                        <p class="export-note">PDFs geram vers\xF5es prontas para apresenta\xE7\xE3o (resumo e hist\xF3rico).</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal de Exporta\xE7\xE3o Unidade -->
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

        <!-- Modal de Ajuda R\xE1pida -->
        <div id="help-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 700px;">
                <div class="modal-header">
                    <h3>Ajuda r\xE1pida</h3>
                    <button class="close-modal" onclick="closeHelpModal()">${ICONS.close}</button>
                </div>
                <div class="help-content">
                    <div class="help-section">
                        <h4>Busca r\xE1pida</h4>
                        <ul>
                            <li>Digite nome, RE ou unidade para localizar colaboradores.</li>
                            <li>Os resultados aparecem instantaneamente conforme voc\xEA digita.</li>
                            <li>Use \u201CBuscar substituto\u201D para fixar um alvo e filtrar cobertura (posto, endere\xE7o ou rota real).</li>
                            <li>Use o bot\xE3o de WhatsApp para contato r\xE1pido quando dispon\xEDvel.</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>Unidades</h4>
                        <ul>
                            <li>Filtre por grupo e por status (Plant\xE3o/Folga) quando necess\xE1rio.</li>
                            <li>Clique no nome da unidade para expandir ou recolher a lista.</li>
                            <li>Use \u201CHist\xF3rico\u201D para revisar altera\xE7\xF5es locais feitas no site.</li>
                        </ul>
                    </div>
                    <div class="help-section">
                        <h4>Dicas \xFAteis</h4>
                        <ul>
                            <li>\u201CAtualizado em\u201D mostra quando os dados foram carregados.</li>
                            <li>\u201CImprimir vis\xE3o atual\u201D gera uma sa\xEDda simples para impress\xE3o.</li>
                            <li>As altera\xE7\xF5es s\xE3o registradas no Supabase.</li>
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

        <!-- Modal Endere\xE7os -->
        <div id="address-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 760px;">
                <div class="modal-header sticky-modal-header">
                    <h3 id="address-modal-title">Endere\xE7os das Unidades</h3>
                    <button class="close-modal" onclick="closeAddressModal()">${ICONS.close}</button>
                </div>
                <div class="help-content">
                    <div class="form-group">
                        <label id="address-modal-search-label">Buscar unidade</label>
                        <input type="text" id="address-search" class="search-input" placeholder="Digite a unidade...">
                    </div>
                    <div id="address-list" class="address-list"></div>
                </div>
            </div>
        </div>

        <!-- Modal Escala Completa -->
        <div id="ft-week-preview-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 860px;">
                <div class="modal-header sticky-modal-header">
                    <h3 id="ft-week-preview-title">Escala completa</h3>
                    <button class="close-modal" onclick="closeFtWeekPreviewModal()">${ICONS.close}</button>
                </div>
                <div id="ft-week-preview-body" class="ft-week-modal-body"></div>
            </div>
        </div>

        <!-- Modal Performance do Colaborador -->
        <div id="performance-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 920px;">
                <div class="modal-header sticky-modal-header">
                    <h3 id="performance-modal-title">Performance do colaborador</h3>
                    <button class="close-modal" onclick="closePerformanceModal()">${ICONS.close}</button>
                </div>
                <div id="performance-modal-body" class="performance-modal-body"></div>
            </div>
        </div>

        <!-- Modal Rota (Substituto) -->
        <div id="route-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 900px;">
                <div class="modal-header sticky-modal-header">
                    <h3>Rota da substitui\xE7\xE3o</h3>
                    <button class="close-modal" onclick="closeRouteModal()">${ICONS.close}</button>
                </div>
                <div id="route-meta" class="route-meta">Carregando rota...</div>
                <div id="route-map" class="route-map"></div>
                <div class="modal-actions">
                    <button class="btn btn-secondary" onclick="openRouteInMaps()">Abrir no Google Maps</button>
                    <button class="btn btn-secondary" onclick="closeRouteModal()">Fechar</button>
                </div>
            </div>
        </div>

        <!-- Modal Guia Completo -->
        <div id="guide-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 860px;">
                <div class="modal-header sticky-modal-header">
                    <h3>Guia completo do sistema</h3>
                    <button class="close-modal" onclick="closeGuideModal()">${ICONS.close}</button>
                </div>
                <div class="help-content">
                    <details class="guide-item">
                        <summary>Guia completo (clique para abrir)</summary>
                        <div class="guide-body">
                            <div class="help-section">
                                <h4>1. Vis\xE3o geral e acesso</h4>
                                <ol>
                                    <li>Use o sistema para visualizar escalas, unidades, avisos, reciclagem e lan\xE7amentos de FT.</li>
                                    <li>Perfis com permiss\xE3o (admin/supervisor) liberam a\xE7\xF5es de edi\xE7\xE3o e lan\xE7amentos.</li>
                                    <li>Se estiver em modo visualiza\xE7\xE3o, voc\xEA poder\xE1 navegar e consultar, mas n\xE3o salvar altera\xE7\xF5es.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>2. Navega\xE7\xE3o principal</h4>
                                <ol>
                                    <li>Use as abas superiores para trocar entre Busca R\xE1pida, Unidades, Avisos, Reciclagem, Lan\xE7amentos e Configura\xE7\xE3o.</li>
                                    <li>O menu de Supervis\xE3o fica na p\xE1gina inicial (tela de sele\xE7\xE3o), sem precisar escolher unidade.</li>
                                    <li>O breadcrumb no topo mostra o grupo atual e a aba ativa.</li>
                                    <li>Os bot\xF5es utilit\xE1rios (Imprimir, Ajuda, Prompts e Guia) ficam no canto superior.</li>
                                </ol>
                            </div>
                            <details class="guide-subitem">
                                <summary>\xDAltimas implanta\xE7\xF5es e novidades</summary>
                                <div class="guide-subbody">
                                    <div class="help-section">
                                        <h4>v3.8 (06/02/2026)</h4>
                                        <ul>
                                            <li>Menu de Supervis\xE3o dispon\xEDvel na p\xE1gina inicial, sem selecionar unidade.</li>
                                            <li>Envio por WhatsApp otimizado: abre o app no celular e a tela de escolha (Web/App) no PC.</li>
                                            <li>Seletor r\xE1pido entre itens de Supervis\xE3o e Colaboradores.</li>
                                        </ul>
                                    </div>
                                </div>
                            </details>
                            <div class="help-section">
                                <h4>3. Busca r\xE1pida</h4>
                                <ol>
                                    <li>Digite nome, RE ou unidade para localizar colaboradores rapidamente.</li>
                                    <li>Use os filtros Plant\xE3o, Folga, FT e Afastados para refinar resultados.</li>
                                    <li>Ative "Buscar substituto" para fixar um alvo e comparar disponibilidade de cobertura.</li>
                                    <li>Escolha o tipo de proximidade (posto, endere\xE7o ou rota real) quando for buscar substituto.</li>
                                    <li>Os cart\xF5es exibem r\xF3tulos de FT e detalhes de quem cobre ou quem foi coberto.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>4. Unidades</h4>
                                <ol>
                                    <li>Use o filtro de grupo (quando dispon\xEDvel) e o status Plant\xE3o/Folga para organizar a vis\xE3o.</li>
                                    <li>Clique no nome da unidade para expandir ou recolher a lista.</li>
                                    <li>Os r\xF3tulos e detalhes de unidade refletem o hist\xF3rico local e os dados atuais.</li>
                                    <li>Quando houver FT no dia, a unidade mostra um r\xF3tulo "FT hoje".</li>
                                    <li>Use os bot\xF5es de exporta\xE7\xE3o para gerar XLSX/CSV por unidade ou a base completa.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>5. Supervis\xE3o (menu inicial)</h4>
                                <ol>
                                    <li>O menu de Supervis\xE3o fica na p\xE1gina inicial e pode ser acessado sem escolher unidade.</li>
                                    <li>Use o seletor "Supervis\xE3o" ou "Colaboradores" para alternar os itens exibidos.</li>
                                    <li>Favoritos, Guias e "Mais usados" ajudam a encontrar mensagens rapidamente.</li>
                                    <li>Os bot\xF5es de WhatsApp abrem o app no celular e a tela de escolha no PC.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>6. Avisos e lembretes</h4>
                                <ol>
                                    <li>Admins podem criar avisos gerais e lembretes direcionados por grupo ou RE.</li>
                                    <li>Colaboradores visualizam apenas avisos atribu\xEDdos ao pr\xF3prio RE.</li>
                                    <li>Use filtros por status e grupo para localizar comunicados com rapidez.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>7. Lan\xE7amentos de FT \u2013 Dashboard</h4>
                                <ol>
                                    <li>Use o filtro de per\xEDodo e status no topo para ajustar os indicadores.</li>
                                    <li>Consulte os KPIs de pend\xEAncias, confirmadas e lan\xE7adas.</li>
                                    <li>Analise os relat\xF3rios por unidade, colaborador, motivo, turno e dia da semana.</li>
                                    <li>Verifique pend\xEAncias recentes e qualidade dos dados para corre\xE7\xF5es r\xE1pidas.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>8. Lan\xE7amentos de FT \u2013 Hist\xF3rico</h4>
                                <ol>
                                    <li>Use busca local, filtros por unidade e colaborador e ordena\xE7\xE3o para encontrar o lan\xE7amento certo.</li>
                                    <li>Ative "Agrupar por dia" para organizar por data da FT.</li>
                                    <li>Clique em "Ver detalhes" para ver datas, motivo detalhado, solicita\xE7\xE3o e respons\xE1vel.</li>
                                    <li>Use Copiar link, WhatsApp, Marcar lan\xE7ado e Remover conforme o status do lan\xE7amento.</li>
                                    <li>Exportar hist\xF3rico gera um XLSX com os filtros aplicados.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>9. Lan\xE7amentos de FT \u2013 Novo</h4>
                                <ol>
                                    <li>Busque o colaborador, confirme a unidade atual e selecione a unidade da FT.</li>
                                    <li>Use "Sugerir por proximidade" para indicar quem est\xE1 de folga.</li>
                                    <li>Informe data, escala, motivo e o colaborador coberto.</li>
                                    <li>Ap\xF3s salvar, copie ou envie o link de confirma\xE7\xE3o ao colaborador.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>10. Reciclagem</h4>
                                <ol>
                                    <li>Use filtros por origem, status e pesquisa para localizar colaboradores.</li>
                                    <li>O resumo mostra vencidos, a vencer, em dia e sem informa\xE7\xE3o.</li>
                                    <li>Edite registros quando necess\xE1rio e use o relat\xF3rio export\xE1vel.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>11. Configura\xE7\xE3o da base</h4>
                                <ol>
                                    <li>Verifique o status da conex\xE3o com o Supabase quando necess\xE1rio.</li>
                                    <li>As altera\xE7\xF5es s\xE3o registradas diretamente no Supabase.</li>
                                    <li>Use os atalhos r\xE1pidos para recarregar base e exportar dados.</li>
                                    <li>Em FT, revise motivos e permiss\xF5es de lan\xE7amento.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>12. Exporta\xE7\xF5es e relat\xF3rios</h4>
                                <ol>
                                    <li>Use o menu de exporta\xE7\xE3o para baixar base atualizada, resumos, hist\xF3ricos e PDFs.</li>
                                    <li>Relat\xF3rios de FT e reciclagem podem ser exportados com filtros aplicados.</li>
                                    <li>Antes de enviar, valide se a base est\xE1 atualizada.</li>
                                </ol>
                            </div>
                        </div>
                    </details>
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
                    <label>Refer\xEAncia</label>
                    <input type="text" id="reciclagem-edit-ref" disabled>
                </div>
                <div class="form-group">
                    <label>Validade (dd/mm/aaaa)</label>
                    <input type="text" id="reciclagem-edit-date" placeholder="Ex: 31/12/2026">
                </div>
                <div class="hint">Altera\xE7\xE3o local. Integra\xE7\xE3o externa desativada.</div>
            </div>
        </div>
        <div id="reciclagem-note-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header sticky-modal-header">
                    <h3>${ICONS.edit} Observa\xE7\xE3o da Reciclagem</h3>
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
                    <label>Observa\xE7\xE3o</label>
                    <textarea id="reciclagem-note-text" rows="4" placeholder="Ex: Reciclagem j\xE1 agendada para 10/02/2026. Aguardando realiza\xE7\xE3o."></textarea>
                </div>
                <div class="hint">Observa\xE7\xE3o vis\xEDvel para todos.</div>
            </div>
        </div>
    `,SiteAuth.logged?(document.getElementById("config-login")?.classList.add("hidden"),document.getElementById("config-content")?.classList.remove("hidden")):(document.getElementById("config-login")?.classList.remove("hidden"),document.getElementById("config-content")?.classList.add("hidden")),updateMenuStatus(),renderPromptTemplates(),bindContextSelection();const t=document.getElementById("search-input");if(searchInputComposing=!1,AppTimerManager.clear(APP_TIMERS.searchDebounce),searchInputDebounceId=null,t){t.value="",t.setAttribute("name","q_"+Date.now());const h=document.getElementById("search-clear-btn");h&&h.classList.add("hidden"),requestAnimationFrame(()=>{t.value&&(t.value="")});const S=()=>handleSearchTokenSuggest(),T=()=>{const R=!!String(t.value||"").trim();h&&h.classList.toggle("hidden",!R),renderSearchFavoritesPanel(t.value||"")};t.addEventListener("input",()=>{S(),T(),!searchInputComposing&&scheduleSearchExecution()}),t.addEventListener("compositionstart",()=>{searchInputComposing=!0}),t.addEventListener("compositionend",()=>{searchInputComposing=!1,S(),T(),scheduleSearchExecution()}),t.addEventListener("change",()=>{S(),T(),flushSearchExecution()}),t.addEventListener("click",S),t.addEventListener("keyup",R=>{S(),R.key==="Enter"&&(flushSearchExecution(),void 0)}),t.addEventListener("focus",()=>{T()}),t.addEventListener("blur",()=>{setTimeout(()=>void 0,200)}),T()}const a=document.getElementById("search-date-from"),o=document.getElementById("search-date-to");if(a&&o){const h=()=>setSearchDateFilter(a.value,o.value);a.addEventListener("change",h),o.addEventListener("change",h)}const n=document.getElementById("search-unit-target");n&&n.addEventListener("keydown",h=>{h.key==="Enter"&&(h.preventDefault(),suggestCoverageFromSearch())}),hydrateSearchUnits(),populateSearchFilterDropdowns(),applySearchDeepLink(),document.querySelectorAll('input[name="filterStatus"]').forEach(h=>{h.addEventListener("change",()=>realizarBusca())}),document.getElementById("unit-search-input").addEventListener("input",()=>renderizarUnidades());const i=document.getElementById("unit-date-from"),r=document.getElementById("unit-date-to");if(i&&r){const h=()=>setUnitDateFilter(i.value,r.value);i.addEventListener("change",h),r.addEventListener("change",h)}const l=document.getElementById("bulk-action-select");l&&l.addEventListener("change",h=>{const S=h.target.value,T=document.getElementById("bulk-action-value"),R=document.getElementById("bulk-unit-select"),D=document.getElementById("bulk-scale-select");if(T.style.display="none",R.style.display="none",D.style.display="none",S==="move"){R.style.display="block";const B=[...new Set(currentData.map(x=>x.posto))].sort();R.innerHTML='<option value="">-- Selecione a Unidade --</option>'+B.map(x=>`<option value="${x}">${x}</option>`).join("")}else if(S==="scale"){D.style.display="block";const B=[...new Set(currentData.map(x=>x.escala))].sort();D.innerHTML='<option value="">-- Selecione a Escala --</option>'+B.map(x=>`<option value="${x}">${x}</option>`).join("")}}),updateSearchFilterUI(),renderSearchFavoritesPanel(""),t.focus(),applyRequiredFieldHints(),renderizarUnidades();const c=document.getElementById("aviso-group-select");c&&c.addEventListener("change",hydrateAvisoForm);const d=document.getElementById("reminder-group-select");d&&d.addEventListener("change",hydrateLembreteForm);const p=document.getElementById("aviso-collab-search");p&&p.addEventListener("input",filterAvisoCollabs);const g=document.getElementById("aviso-collab-select");g&&g.addEventListener("change",syncAvisoUnitWithCollab);const m=document.getElementById("reminder-collab-search");m&&m.addEventListener("input",filterLembreteCollabs);const f=document.getElementById("reminder-collab-select");f&&f.addEventListener("change",syncLembreteUnitWithCollab);const u=document.getElementById("ft-search");u&&u.addEventListener("input",filterFtCollabs);const b=document.getElementById("ft-collab-select");b&&b.addEventListener("change",syncFtUnitWithCollab);const v=document.getElementById("ft-covering-search");v&&v.addEventListener("input",filterFtCovering);const E=document.getElementById("ft-covering-select");E&&E.addEventListener("change",syncFtCoveringSelection);const k=document.getElementById("ft-unit-target");k&&(k.dataset.auto="1",k.addEventListener("change",()=>{k.dataset.auto="0";const h=document.getElementById("ft-coverage-suggestions");h&&(h.innerHTML="")}));const $=document.getElementById("ft-shift");$&&($.dataset.auto="1",$.addEventListener("change",()=>{$.dataset.auto="0"})),initAvisosFilters(),updateAvisosUI()}function switchTab(e){if(closeUtilityDrawer(),e==="avisos"&&!SiteAuth.logged){showToast("Fa\xE7a login para acessar os avisos.","error");return}clearTabScopedTimers(e),setAppState("currentTab",e,{silent:!0}),document.querySelectorAll(".tab-btn").forEach(t=>t.classList.remove("active")),typeof event<"u"&&event?.target?event.target.classList.add("active"):document.querySelector(`.tab-btn[onclick="switchTab('${e}')"]`)?.classList.add("active"),document.getElementById("tab-content-busca")?.classList.add("hidden"),document.getElementById("tab-content-unidades")?.classList.add("hidden"),document.getElementById("tab-content-supervisao")?.classList.add("hidden"),document.getElementById("tab-content-avisos")?.classList.add("hidden"),document.getElementById("tab-content-reciclagem")?.classList.add("hidden"),document.getElementById("tab-content-lancamentos")?.classList.add("hidden"),document.getElementById("tab-content-config")?.classList.add("hidden"),document.getElementById("tab-content-collab-detail")?.classList.add("hidden"),document.getElementById(`tab-content-${e}`)?.classList.remove("hidden"),e==="config"&&!SiteAuth.logged&&(document.getElementById("config-login")?.classList.remove("hidden"),document.getElementById("config-content")?.classList.add("hidden")),e==="busca"&&(document.getElementById("search-input").focus(),realizarBusca()),e==="unidades"&&renderizarUnidades(),e==="avisos"&&renderAvisos(),e==="reciclagem"&&renderReciclagem(),e==="lancamentos"&&renderLancamentos(),clearContextBar(),updateBreadcrumb()}function isGroupInvertido(e){return!!escalaInvertidaByGroup[e]}function renderEscalaInvertidaUI(){const e=document.getElementById("escala-invertida-status");if(!e)return;const t=(CONFIG?.groupRules||[]).map(n=>n?.key).filter(Boolean),a=t.length>0&&t.every(n=>escalaInvertidaByGroup[n]),o=t.some(n=>escalaInvertidaByGroup[n]);if(!currentGroup||currentGroup==="todos")e.textContent=a?"Invertido":o?"Misto":"Padr\xE3o",e.className=`status-badge-menu ${a?"edit":o?"info":"view"}`;else{const n=isGroupInvertido(currentGroup);e.textContent=n?"Invertido":"Padr\xE3o",e.className=`status-badge-menu ${n?"edit":"view"}`}}function getCurrentMonthNumber(){return new Date().getMonth()+1}function getDesiredEscalaInvertida(e){return e%2===0}function applyAutoEscalaInvertida(e={}){const t=getCurrentMonthNumber();if(escalaInvertidaAutoMonth===t)return;const a=getDesiredEscalaInvertida(t);(CONFIG?.groupRules||[]).forEach(o=>{o?.key&&(escalaInvertidaByGroup[o.key]=a)}),escalaInvertidaAutoMonth=t,saveEscalaInvertida(e.silent),renderEscalaInvertidaUI(),document.getElementById("units-list")&&renderizarUnidades(),currentTab==="busca"&&document.getElementById("search-input")&&realizarBusca(),e.notify&&showToast(`Escala ajustada automaticamente para ${a?"invertida":"padr\xE3o"}.`,"success")}function startAutoEscalaMonitor(){applyAutoEscalaInvertida({silent:!0,notify:!1}),autoEscalaTimer=AppTimerManager.setInterval(APP_TIMERS.autoEscala,()=>{applyAutoEscalaInvertida({silent:!0,notify:!1})},3600*1e3),!autoEscalaBound&&(AppEventManager.on(document,"visibilitychange",()=>{document.visibilityState==="visible"&&applyAutoEscalaInvertida({silent:!0,notify:!1})},!1,{scope:"auto-escala",key:"auto-escala-visibility"}),autoEscalaBound=!0)}function toggleEscalaInvertida(e){if(!canEditBase()){showToast("Voc\xEA n\xE3o tem permiss\xE3o para alterar a escala.","error");return}const t=(CONFIG?.groupRules||[]).map(o=>o?.key).filter(Boolean);if(!e||e==="todos"){const o=!t.every(n=>escalaInvertidaByGroup[n]);t.forEach(n=>{escalaInvertidaByGroup[n]=o})}else escalaInvertidaByGroup[e]=!escalaInvertidaByGroup[e];escalaInvertidaAutoMonth=getCurrentMonthNumber(),saveEscalaInvertida(),renderEscalaInvertidaUI(),renderizarUnidades(),currentTab==="busca"&&realizarBusca(document.getElementById("search-input")?.value||"");const a=t.some(o=>escalaInvertidaByGroup[o]);showToast(a?"Escala invertida aplicada.":"Escala padr\xE3o restaurada.","success")}function switchConfigTab(e,t=null){document.querySelectorAll(".config-tab").forEach(o=>o.classList.remove("active")),t?.classList?t.classList.add("active"):document.querySelectorAll(".config-tab").forEach(o=>{(o.getAttribute("onclick")||"").includes(`switchConfigTab('${e}'`)&&o.classList.add("active")}),["access","team","operation","system"].forEach(o=>document.getElementById(`config-pane-${o}`)?.classList.add("hidden")),document.getElementById(`config-pane-${e}`)?.classList.remove("hidden"),e==="access"&&renderMyRoleDescription(),e==="team"&&(renderRolePermissionsTable(),updateTeamPaneVisibility(),canManageUsers()&&(renderAdminList(),loadPreRegisteredEmails(),renderPreRegList())),e==="operation"&&(renderEscalaInvertidaUI(),canEditBase()&&renderFtReasonsConfig()),e==="system"&&(renderConfigSummary(),renderDataSourceList(),renderAuditList(),renderRoadmapList())}function getCollabInitials(e){if(!e)return"??";const t=e.trim().split(/\s+/).filter(Boolean);return t.length===0?"??":t.length===1?t[0].substring(0,2).toUpperCase():(t[0][0]+t[t.length-1][0]).toUpperCase()}function getAvatarColor(e){const t=["#0e5ac8","#0f8a6a","#7c3aed","#be185d","#c2410c","#0891b2","#4f46e5","#b91c1c","#15803d","#a16207"];let a=0;for(let o=0;o<(e||"").length;o++)a=e.charCodeAt(o)+((a<<5)-a);return t[Math.abs(a)%t.length]}function buildCollabAvatarHtml(e){const t=getCollabInitials(e);return`<span class="collab-avatar" style="background:${getAvatarColor(e)}">${t}</span>`}function normalizeSearchText(e){return e?e.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase():""}function scoreSearchMatch(e,t,a){if(!t.length)return 1;const o=[{val:e.nome,weight:10},{val:e.re,weight:8},{val:e.posto,weight:6},{val:e.cargo,weight:4},{val:e.empresa,weight:3},{val:e.escala,weight:3},{val:e.telefone,weight:2},{val:e.grupoLabel,weight:2},{val:e.cpf,weight:2},{val:e.turma!=null?String(e.turma):"",weight:1}];let n=0;for(let s=0;s<t.length;s++){const i=t[s],r=a[s];let l=0;for(const c of o){if(!c.val)continue;const d=c.val.toUpperCase();if(d===i){l=Math.max(l,c.weight*3);continue}if(d.startsWith(i)){l=Math.max(l,c.weight*2);continue}if(d.includes(i)){l=Math.max(l,c.weight);continue}if(normalizeSearchText(c.val).includes(r)){l=Math.max(l,c.weight*.8);continue}}if(l===0)return 0;n+=l}return n}function highlightSearchTerm(e,t,a){if(!e||!t.length)return escapeHtml(e||"");let o=escapeHtml(e);const n=normalizeSearchText(e);for(let s=0;s<t.length;s++){const i=t[s],r=a[s],l=n.indexOf(r);if(l>=0){const c=escapeHtml(e.substring(l,l+r.length)),d=new RegExp(c.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"i");o=o.replace(d,'<mark class="search-hl">$&</mark>')}}return o}function realizarBusca(){const e=document.getElementById("search-input").value,t=searchFilterStatus||"all",a=!!searchHideAbsence,o=document.getElementById("search-results"),n=hasDateRangeFilter(searchDateFilter),s=searchFilterGroup&&searchFilterGroup!=="all",i=searchFilterCargo&&searchFilterCargo!=="all",r=searchFilterEscala&&searchFilterEscala!=="all";if(updateSearchFilterUI(),!e&&t==="all"&&!n&&!s&&!i&&!r){updateSearchSummary(0,currentData.length),renderSearchFavoritesPanel(""),o.innerHTML='<p class="empty-state">Digite para buscar ou selecione um filtro...</p>',searchFilteredCache=[],searchRenderedCount=0,searchTotalFiltered=0;return}runStandardSearch(e,o,t,a),updateSearchDeepLink()}function runStandardSearch(e,t,a,o){const n=e.toUpperCase().trim(),s=n.split(/\s+/).filter(Boolean),i=s.map(f=>normalizeSearchText(f));searchCurrentTerms=s;const r={...searchDateFilter};renderSearchFavoritesPanel(n);let l=[];for(const f of currentData){if(hiddenUnits.has(f.posto))continue;const u=s.length?scoreSearchMatch(f,s,i):1;u>0&&l.push({item:f,score:u})}let c=l;if(a!=="all"&&(c=c.filter(({item:f})=>{const u=getStatusInfo(f),b=u.text.includes("PLANT\xC3O")||u.text.includes("FT");return a==="plantao"?b:a==="folga"?!b:a==="ft"?u.text.includes("FT"):a==="afastado"?!!f.rotulo:a==="favorites"?isCollaboratorFavorite(f.re):!0})),o&&(c=c.filter(({item:f})=>!f.rotulo)),hasDateRangeFilter(r)&&(c=c.filter(({item:f})=>matchesFtDateFilterForCollaborator(f.re,r))),searchFilterGroup&&searchFilterGroup!=="all"&&(c=c.filter(({item:f})=>f.grupo===searchFilterGroup)),searchFilterCargo&&searchFilterCargo!=="all"&&(c=c.filter(({item:f})=>(f.cargo||"").toUpperCase()===searchFilterCargo.toUpperCase())),searchFilterEscala&&searchFilterEscala!=="all"&&(c=c.filter(({item:f})=>(f.escala||"")===searchFilterEscala)),searchSortBy==="relevance"&&s.length?c.sort((f,u)=>u.score-f.score):searchSortBy==="nome"?c.sort((f,u)=>(f.item.nome||"").localeCompare(u.item.nome||"","pt-BR")):searchSortBy==="posto"?c.sort((f,u)=>(f.item.posto||"").localeCompare(u.item.posto||"","pt-BR")):searchSortBy==="escala"?c.sort((f,u)=>(f.item.escala||"").localeCompare(u.item.escala||"","pt-BR")):searchSortBy==="status"&&c.sort((f,u)=>{const b=getStatusInfo(f.item).text,v=getStatusInfo(u.item).text;return b.localeCompare(v,"pt-BR")}),!searchSortAsc&&searchSortBy!=="relevance"&&c.reverse(),searchFilteredCache=c,searchTotalFiltered=c.length,searchRenderedCount=0,searchSelectedIds.clear(),searchSelectAll=!1,updateSearchSummary(c.length,currentData.length),c.length===0){t.innerHTML='<p class="empty-state">Nenhum resultado encontrado.</p>';return}const d=searchCurrentTerms,p=d.map(f=>normalizeSearchText(f)),g=buildSearchToolbar(),m='<div id="search-bulk-bar" class="search-bulk-bar hidden"></div>';if(searchViewMode==="table"){const f='<div class="search-table-header"><div class="st-cell st-check"><input type="checkbox" onchange="toggleSearchSelectAll(this.checked)" title="Selecionar todos"></div><div class="st-cell st-name">Nome</div><div class="st-cell st-re">RE</div><div class="st-cell st-posto">Posto</div><div class="st-cell st-grupo">Grupo</div><div class="st-cell st-cargo">Cargo</div><div class="st-cell st-escala">Escala</div><div class="st-cell st-turno">Turno</div><div class="st-cell st-empresa">Empresa</div><div class="st-cell st-telefone">Telefone</div><div class="st-cell st-turma">Turma</div><div class="st-cell st-admissao">Admiss\xE3o</div><div class="st-cell st-status">Status</div><div class="st-cell st-afastamento">Afastamento</div><div class="st-cell st-actions">A\xE7\xF5es</div></div>',u=c.slice(0,SEARCH_PAGE_SIZE);searchRenderedCount=u.length;const b=u.map(({item:E})=>renderSearchTableRow(E,d,p)).join(""),v=c.length>SEARCH_PAGE_SIZE?`<div class="search-load-more"><button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${c.length-SEARCH_PAGE_SIZE} restantes)</button></div>`:"";t.innerHTML=g+m+`<div class="search-table-wrap"><div class="search-table">${f}<div id="search-table-body">${b}</div></div></div>`+v}else if(searchGroupBy!=="none"){const f=groupSearchResults(c);let u=g+m;for(const b of f){const v=b.items.slice(0,SEARCH_PAGE_SIZE);u+=`<div class="search-group"><div class="search-group-header"><span>${escapeHtml(b.label)}</span><span class="search-group-count">${b.items.length}</span></div>`,u+=`<div class="results-grid">${v.map(({item:E})=>renderSearchCard(E,d,p)).join("")}</div></div>`}searchRenderedCount=c.length,t.innerHTML=u}else{const f=c.slice(0,SEARCH_PAGE_SIZE);searchRenderedCount=f.length;const u=f.map(({item:v})=>renderSearchCard(v,d,p)).join(""),b=c.length>SEARCH_PAGE_SIZE?`<div class="search-load-more"><button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${c.length-SEARCH_PAGE_SIZE} restantes)</button></div>`:"";t.innerHTML=g+m+`<div class="results-grid" id="search-cards-grid">${u}</div>`+b}}function loadMoreSearchResults(){const e=searchFilteredCache.slice(searchRenderedCount,searchRenderedCount+SEARCH_PAGE_SIZE);if(!e.length)return;const t=searchCurrentTerms,a=t.map(n=>normalizeSearchText(n));if(searchViewMode==="table"){const n=document.getElementById("search-table-body");if(n){const s=document.createElement("div");for(s.innerHTML=e.map(({item:i})=>renderSearchTableRow(i,t,a)).join("");s.firstChild;)n.appendChild(s.firstChild)}}else{const n=document.getElementById("search-cards-grid");if(n){const s=document.createElement("div");for(s.innerHTML=e.map(({item:i})=>renderSearchCard(i,t,a)).join("");s.firstChild;)n.appendChild(s.firstChild)}}searchRenderedCount+=e.length;const o=document.querySelector(".search-load-more");if(o){const n=searchTotalFiltered-searchRenderedCount;n<=0?o.remove():o.innerHTML=`<button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${n} restantes)</button>`}}function buildSearchToolbar(){const e=[{val:"relevance",label:"Relev\xE2ncia"},{val:"nome",label:"Nome A-Z"},{val:"posto",label:"Posto"},{val:"escala",label:"Escala"},{val:"status",label:"Status"}],t=[{val:"none",label:"Sem agrupamento"},{val:"posto",label:"Por Posto"},{val:"status",label:"Por Status"},{val:"grupo",label:"Por Grupo"},{val:"escala",label:"Por Escala"}];return`<div class="search-toolbar">
        <div class="search-toolbar-left">
            <select class="search-toolbar-select" onchange="setSearchSort(this.value)" title="Ordenar por">
                ${e.map(a=>`<option value="${a.val}" ${a.val===searchSortBy?"selected":""}>${a.label}</option>`).join("")}
            </select>
            <button class="search-toolbar-btn" onclick="toggleSearchSortDir()" title="${searchSortAsc?"Ascendente":"Descendente"}">
                ${searchSortAsc?"\u2191":"\u2193"}
            </button>
            <select class="search-toolbar-select" onchange="setSearchGroupBy(this.value)" title="Agrupar por">
                ${t.map(a=>`<option value="${a.val}" ${a.val===searchGroupBy?"selected":""}>${a.label}</option>`).join("")}
            </select>
        </div>
        <div class="search-toolbar-right">
            <button class="search-toolbar-btn ${searchViewMode==="cards"?"active":""}" onclick="setSearchViewMode('cards')" title="Modo cards">\u2637</button>
            <button class="search-toolbar-btn ${searchViewMode==="table"?"active":""}" onclick="setSearchViewMode('table')" title="Modo tabela">\u2630</button>
            <button class="search-toolbar-btn" onclick="exportSearchResults()" title="Exportar resultados">\u2913</button>
        </div>
    </div>`}function groupSearchResults(e){const t={},a=searchGroupBy;for(const o of e){let n="";a==="posto"?n=o.item.posto||"Sem Posto":a==="status"?n=getStatusInfo(o.item).text||"N/I":a==="grupo"?n=o.item.grupoLabel||o.item.grupo||"N/I":a==="escala"?n=o.item.escala||"N/I":n="Todos",t[n]||(t[n]={label:n,items:[]}),t[n].items.push(o)}return Object.values(t).sort((o,n)=>o.label.localeCompare(n.label,"pt-BR"))}function getEscalaBadgeHtml(e){if(!e)return"";const t=e.toUpperCase();let a="escala-badge-default";return t.includes("12X36")?a="escala-badge-12x36":t.includes("44")?a="escala-badge-44h":t.includes("24")?a="escala-badge-24h":(t.includes("SD")||t.includes("SEG"))&&(a="escala-badge-sd"),`<span class="escala-badge ${a}" title="${escapeHtml(e)}">${escapeHtml(e)}</span>`}function renderSearchCard(e,t,a){const o=getStatusInfo(e),n=e.rotulo&&e.rotuloFim?`<span class="return-date">Retorno: ${formatDate(e.rotuloFim)}</span>`:"",s=getFtRelationInfo(e.re),i=s?`<div class="ft-link ${s.type}"><strong>FT:</strong> ${s.type==="covering"?"Cobrindo":"Coberto por"} ${s.label}${s.unit?` \u2022 ${s.unit}`:""}</div>`:"",r=buildFtDetailsHtml(e.re),l=buildFtWeekPreviewHtmlForRe(e.re),c=getReciclagemSummaryForCollab(e.re,e.nome),d=c?`<span class="reciclagem-icon ${c.status}" title="${c.title}">${ICONS.recycle}</span>`:"",p=getCollaboratorRoleLabel(e),g=JSON.stringify(e.re||""),m=JSON.stringify(e.nome||""),f=JSON.stringify(e.telefone||""),u=JSON.stringify(e.posto||""),b=escapeHtml(g),v=escapeHtml(m),E=escapeHtml(f),k=escapeHtml(u),$=e.id!=null?e.id:e.re||"",h=JSON.stringify($),S=escapeHtml(h),T=escapeHtml(e.posto||"N/I"),R=!!getAddressForCollaborator(e),D=!!(e.re||e.nome||e.posto),B=D?R?"":"map-icon-missing":"disabled-icon",x=D?R?"Ver endere\xE7o do colaborador":"Endere\xE7o n\xE3o cadastrado":"Colaborador indispon\xEDvel",_=isCollaboratorFavorite(e.re),M=o.text.includes("PLANT\xC3O")||o.text.includes("FT"),P=["F\xC9RIAS","ATESTADO","AFASTADO"].includes(o.text),y=M?"bg-plantao":P?"bg-afastado":"bg-folga",w=isHomenageado(e),N=searchSelectedIds.has(e.id)?"card-selected":"",U=M?'<span class="active-dot active-dot-on" title="Em plant\xE3o"></span>':'<span class="active-dot active-dot-off" title="De folga"></span>',F=w?highlightSearchTerm(e.nome,t,a)+" \u2728":highlightSearchTerm(e.nome,t,a),I=highlightSearchTerm(e.re,t,a),A=highlightSearchTerm(e.posto||"N/I",t,a),C=highlightSearchTerm(p,t,a);let O="";if(e.rotulo){const J=e.rotulo.split(","),K={F\u00C9RIAS:"F\xE9rias",ATESTADO:"Atestado",AFASTADO:"Afastado",FT:"FT",TROCA:"Troca"};O=J.map(X=>{let q=X;return X==="OUTRO"&&e.rotuloDetalhe&&(q=e.rotuloDetalhe),`<span class="label-badge">${K[X]||q}</span>`}).join("")}const H=buildCollabAvatarHtml(e.nome),G=getEscalaBadgeHtml(e.escala),z=e.telefone?`Tel: ${e.telefone}`:"Sem telefone",V=c?c.title:"Nenhuma reciclagem pendente",j=escapeHtml(`${z} | ${V}`);return`
        <div class="result-card ${y} ${w?"card-homenageado":""} ${N}" data-collab-re="${escapeHtml(e.re||"")}" data-collab-id="${e.id}" data-preview="${j}" style="border-left: 5px solid ${o.color}">
            <div class="card-header">
                <div class="header-left">
                    <input type="checkbox" class="card-select-check" ${searchSelectedIds.has(e.id)?"checked":""} onchange="toggleSearchSelect(${e.id}, this.checked)" title="Selecionar">
                    <div class="avatar-wrap">${H}${U}</div>
                    <div class="card-name-block">
                        <div class="card-name-row">
                            <a class="colaborador-nome colaborador-link ${w?"homenageado-nome":""}" href="javascript:void(0)" onclick="openCollaboratorPage(${S})">${F}</a>
                            ${d}
                            ${getPendingAvisosByCollaborator(e.re,currentGroup||"todos")>0?'<span class="colab-flag">Aviso</span>':""}
                            ${getPendingRemindersByCollaborator(e.re,currentGroup||"todos")>0?'<span class="colab-flag reminder">Lembrete</span>':""}
                            <span class="status-badge" style="background-color: ${o.color}">${o.text}</span>
                            ${O}
                            ${n}
                        </div>
                        <div class="card-meta-row">
                            <span>RE ${I}</span>
                            <span class="meta-sep">\xB7</span>
                            <span class="unit-link" onclick="navigateToUnit(${k})">${A}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${e.grupoLabel||"N/I"}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${C}</span>
                            <span class="meta-sep">\xB7</span>
                            ${G||`<span>${e.tipoEscala||""} ${e.escala||"N/I"}</span>`}
                        </div>
                    </div>
                </div>
                <div class="header-right card-actions-bar">
                    <button class="edit-btn-icon favorite-btn ${_?"active":""}" onclick="toggleCollaboratorFavorite('${escapeHtml(e.re||"")}')" title="${_?"Remover dos favoritos":"Adicionar aos favoritos"}">${_?ICONS.starFilled:ICONS.star}</button>
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${b}, ${v})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon ${B}" onclick="openAddressModalForCollaborator(${b}, ${v}, ${k})" title="${x}" ${D?"":"disabled"}>${ICONS.mapPin}</button>
                    <button class="edit-btn-icon ${e.telefone?"whatsapp-icon":"disabled-icon"}" onclick="openPhoneModal(${v}, ${E})" title="${e.telefone?"Contato":"Sem telefone vinculado"}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon" onclick="openEditModal(${e.id})" title="Editar">${ICONS.edit}</button>
                </div>
            </div>
            ${i||r||l?`<div class="card-ft-row">${i}${r}${l}</div>`:""}
            <div class="card-hover-preview">${j}</div>
        </div>
    `}function renderSearchTableRow(e,t,a){const o=getStatusInfo(e),s=o.text.includes("PLANT\xC3O")||o.text.includes("FT")?"bg-plantao":e.rotulo?"bg-afastado":"bg-folga",i=e.id!=null?e.id:e.re||"",r=escapeHtml(JSON.stringify(i)),l=escapeHtml(JSON.stringify(e.re||"")),c=escapeHtml(JSON.stringify(e.nome||"")),d=escapeHtml(JSON.stringify(e.telefone||"")),p=escapeHtml(JSON.stringify(e.posto||""));return`<div class="search-table-row ${s}" data-collab-id="${e.id}">
        <div class="st-cell st-check"><input type="checkbox" ${searchSelectedIds.has(e.id)?"checked":""} onchange="toggleSearchSelect(${e.id}, this.checked)"></div>
        <div class="st-cell st-name"><a class="colaborador-link" href="javascript:void(0)" onclick="openCollaboratorPage(${r})">${highlightSearchTerm(e.nome,t,a)}</a></div>
        <div class="st-cell st-re">${highlightSearchTerm(e.re,t,a)}</div>
        <div class="st-cell st-posto">${highlightSearchTerm(e.posto||"N/I",t,a)}</div>
        <div class="st-cell st-grupo">${escapeHtml(e.grupoLabel||"N/I")}</div>
        <div class="st-cell st-cargo">${highlightSearchTerm(getCollaboratorRoleLabel(e),t,a)}</div>
        <div class="st-cell st-escala">${getEscalaBadgeHtml(e.escala)}</div>
        <div class="st-cell st-turno">${escapeHtml(e.turno||"N/I")}</div>
        <div class="st-cell st-empresa">${escapeHtml(e.empresa||"N/I")}</div>
        <div class="st-cell st-telefone">${escapeHtml(e.telefone||"-")}</div>
        <div class="st-cell st-turma">${escapeHtml(e.turma||"-")}</div>
        <div class="st-cell st-admissao">${e.data_admissao?formatDate(e.data_admissao):"-"}</div>
        <div class="st-cell st-status"><span class="status-badge" style="background-color:${o.color}">${o.text}</span></div>
        <div class="st-cell st-afastamento">${escapeHtml(e.rotulo||"-")}</div>
        <div class="st-cell st-actions">
            <button class="edit-btn-icon" onclick="openEditModal(${e.id})" title="Editar">${ICONS.edit}</button>
            <button class="edit-btn-icon ${e.telefone?"whatsapp-icon":"disabled-icon"}" onclick="openPhoneModal(${c}, ${d})" title="Contato">${ICONS.whatsapp}</button>
        </div>
    </div>`}function setSearchSort(e){searchSortBy=e,realizarBusca()}function toggleSearchSortDir(){searchSortAsc=!searchSortAsc,realizarBusca()}function setSearchGroupBy(e){searchGroupBy=e,realizarBusca()}function setSearchViewMode(e){searchViewMode=e,realizarBusca()}function toggleSearchSelect(e,t){t?searchSelectedIds.add(e):searchSelectedIds.delete(e),updateSearchBulkBar();const a=document.querySelector(`[data-collab-id="${e}"]`);a&&a.classList.toggle("card-selected",t)}function toggleSearchSelectAll(e){searchSelectAll=e,e?searchFilteredCache.forEach(({item:t})=>searchSelectedIds.add(t.id)):searchSelectedIds.clear(),document.querySelectorAll('.card-select-check, .search-table-row input[type="checkbox"]').forEach(t=>t.checked=e),document.querySelectorAll(".result-card, .search-table-row").forEach(t=>t.classList.toggle("card-selected",e)),updateSearchBulkBar()}function updateSearchBulkBar(){const e=document.getElementById("search-bulk-bar");if(!e)return;const t=searchSelectedIds.size;if(t===0){e.classList.add("hidden");return}e.classList.remove("hidden"),e.innerHTML=`
        <span><strong>${t}</strong> selecionado(s)</span>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('aviso')">Criar Aviso</button>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('mover')">Mover de Posto</button>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('rotulo')">Alterar R\xF3tulo</button>
        <button class="btn-std btn-sm btn-outline" onclick="toggleSearchSelectAll(false)">Limpar sele\xE7\xE3o</button>
    `}function bulkSearchAction(e){const a=Array.from(searchSelectedIds).map(o=>currentData.find(n=>n.id===o)).filter(Boolean);if(!a.length){showToast("Nenhum colaborador selecionado.","error");return}if(e==="mover"){const o=[...new Set(currentData.map(s=>s.posto).filter(Boolean))].sort(),n=prompt(`Mover ${a.length} colaborador(es) para qual posto?

Postos dispon\xEDveis:
${o.slice(0,20).join(", ")}...`);if(!n)return;a.forEach(s=>{s.posto=n.toUpperCase()}),updateCollaboratorsBulk(a,{posto:n.toUpperCase()}).then(s=>{s?showToast(`${a.length} colaborador(es) movidos para ${n.toUpperCase()}.`,"success"):showToast("Falha ao atualizar no Supabase.","error"),realizarBusca()})}else if(e==="rotulo"){const o=prompt("Novo r\xF3tulo (F\xC9RIAS, ATESTADO, AFASTADO, FT, TROCA, ou vazio para remover):");if(o===null)return;a.forEach(n=>{n.rotulo=o.toUpperCase()||""}),updateCollaboratorsBulk(a,{rotulo:o.toUpperCase()||""}).then(n=>{n?showToast(`R\xF3tulo atualizado para ${a.length} colaborador(es).`,"success"):showToast("Falha ao atualizar no Supabase.","error"),realizarBusca()})}else e==="aviso"&&showToast(`Cria\xE7\xE3o de aviso para ${a.length} colaborador(es) - abra a aba Avisos.`,"info")}function exportSearchResults(){if(!searchFilteredCache.length){showToast("Nenhum resultado para exportar.","error");return}const e=["Nome","RE","Posto","Cargo","Empresa","Escala","Grupo","Status","R\xF3tulo","Telefone"],t=searchFilteredCache.map(({item:r})=>{const l=getStatusInfo(r).text;return[r.nome,r.re,r.posto,r.cargo||"",r.empresa||"",r.escala||"",r.grupoLabel||r.grupo||"",l,r.rotulo||"",r.telefone||""]}),a=[e,...t].map(r=>r.map(l=>`"${String(l||"").replace(/"/g,'""')}"`).join(",")).join(`
`),o="\uFEFF",n=new Blob([o+a],{type:"text/csv;charset=utf-8;"}),s=URL.createObjectURL(n),i=document.createElement("a");i.href=s,i.download=`busca_resultados_${new Date().toISOString().slice(0,10)}.csv`,i.click(),URL.revokeObjectURL(s),showToast(`${t.length} resultados exportados.`,"success")}function buildSubstituteReason(){return""}function runSubstituteSearch(){}function rankSubstituteCandidates(e){return e}function getFtTodayByUnit(e,t){const a=getTodayKey(),o=normalizeUnitKey(e);return getFtOperationalItems(ftLaunches).filter(n=>{if(!isFtActive(n)||!n.date||n.date!==a||t&&t!=="all"&&n.group&&n.group!==t)return!1;const s=normalizeUnitKey(n.unitTarget||n.unitCurrent||"");return s&&s===o})}function renderizarUnidades(){const e=document.getElementById("units-list"),t=document.getElementById("unit-search-input")?.value.toUpperCase()||"",a=document.getElementById("unit-group-filter")?.value||"all",o=document.getElementById("unit-status-filter")?.value||"all",n=document.getElementById("unit-label-filter")?.value||"all",s=normalizeDateRange(unitDateFilter.from,unitDateFilter.to);atualizarEstatisticas(currentData,a);let i=currentData;a!=="all"&&(i=i.filter(d=>d.grupo===a));const r={};i.forEach(d=>{r[d.posto]||(r[d.posto]=[]),r[d.posto].push(d)});let l=Object.keys(r).sort();t&&(l=l.filter(d=>d.includes(t)));const c=l.map(d=>{const p=r[d];p.sort((A,C)=>A.nome.localeCompare(C.nome));const g=p.filter(A=>{const C=getStatusInfo(A),O=C.text.includes("PLANT\xC3O")||C.text.includes("FT");return(o==="all"||o==="plantao")&&O}),m=p.filter(A=>{const C=getStatusInfo(A),O=!C.text.includes("PLANT\xC3O")&&!C.text.includes("FT");return(o==="all"||o==="folga")&&O}),f=A=>n==="all"?A:n==="none"?A.filter(C=>!C.rotulo):A.filter(C=>(C.rotulo||"").split(",").includes(n)),u=f(g),b=f(m);if(u.length===0&&b.length===0)return"";const v="unit-"+d.replace(/[^a-zA-Z0-9]/g,"-"),E=hiddenUnits.has(d),k=minimizedUnits.has(d),$=unitMetadata[d]||{};let h="";$.rotulo&&(h=$.rotulo.split(",").map(C=>{const O={REFEICAO:"Refei\xE7\xE3o no Local",VT:"Vale Transporte"};return`<span class="unit-label-badge">${C==="OUTRO"&&$.detalhe?$.detalhe:O[C]||C}</span>`}).join(""));const S=!!$.rotulo,T=getPendingAvisosByUnit(d,a==="all"?"todos":a),R=getPendingRemindersByUnit(d,a==="all"?"todos":a),D=T>0?`<span class="unit-aviso-badge">${T} pend.</span>`:"",B=R>0?`<span class="unit-reminder-badge">${R} lemb.</span>`:"",x=getFtTodayByUnit(d,a==="all"?"":a),_=x.length?`<span class="unit-ft-badge">FT hoje: ${x.length}</span>`:"",M=buildFtWeekPreviewHtmlForUnit(d,a==="all"?"":a),P=hasDateRangeFilter(s)?getFtItemsForUnitInRange(d,s.from,s.to,a==="all"?"":a):[];if(hasDateRangeFilter(s)&&!P.length)return"";const y=A=>hasDateRangeFilter(s)?A.filter(C=>matchesFtDateFilterForCollaborator(C.re,s)):A,w=y(u),N=y(b);if(w.length===0&&N.length===0)return"";const U=JSON.stringify(d),F=escapeHtml(U),I=escapeHtml(d);return`
            <div class="unit-section ${S?"unit-labeled":""}" id="${v}" data-unit-name="${I}">
                <h3 class="unit-title">
                    <span>${I} <span class="count-badge">${p.length}</span> ${h} ${_} ${D} ${B}</span>
                    <div class="unit-actions">
                        <button class="action-btn" onclick="openAddressModal(${F})" title="Endere\xE7o">
                            ${ICONS.mapPin}
                        </button>
                        <button class="action-btn" onclick="openAvisosForUnit(${F})" title="Avisos da unidade">
                            ${ICONS.bell}
                        </button>
                        <button class="action-btn" onclick="openUnitDetailsModal(${F})" title="Detalhes da unidade">
                            ${ICONS.details}
                        </button>
                        <button class="action-btn" onclick="exportUnitPrompt(${F})" title="Exportar unidade">
                            ${ICONS.download}
                        </button>
                        <button class="action-btn" onclick="openEditUnitModal(${F})" title="Editar Unidade">
                            ${ICONS.settings}
                        </button>
                        <button class="action-btn" onclick="toggleUnitMinimize(${F})" title="${k?"Expandir":"Minimizar"}">
                            ${k?ICONS.chevronDown:ICONS.chevronUp}
                        </button>
                        <button class="action-btn ${E?"hidden-unit":""}" onclick="toggleUnitVisibility(${F})" title="${E?"Mostrar na busca":"Ocultar da busca"}">
                            ${E?ICONS.eyeOff:ICONS.eye}
                        </button>
                    </div>
                </h3>
                ${M}
                
                <div class="unit-teams-container ${k?"hidden":""}">
                    <!-- Time Plant\xE3o -->
                    <div class="team-block team-plantao">
                        <h4 class="team-header header-plantao">EM PLANT\xC3O (${w.length})</h4>
                        ${renderUnitTable(w)}
                    </div>

                    <!-- Time Folga -->
                    <div class="team-block team-folga">
                        <h4 class="team-header header-folga">NA FOLGA (${N.length})</h4>
                        ${renderUnitTable(N)}
                    </div>
                </div>
            </div>
        `}).filter(Boolean);e.innerHTML=c.join("")}function atualizarEstatisticas(e,t){const a=document.getElementById("stats-bar");let o=e;t&&t!=="all"&&(o=e.filter(r=>r.grupo===t));const n=o.length,s=o.filter(r=>getStatusInfo(r).text.includes("PLANT\xC3O")||getStatusInfo(r).text.includes("FT")).length,i=o.filter(r=>!getStatusInfo(r).text.includes("PLANT\xC3O")&&!getStatusInfo(r).text.includes("FT")).length;a.innerHTML=`
        <div class="stat-card total">
            <h4>Total Efetivo</h4>
            <div class="stat-value">${n}</div>
        </div>
        <div class="stat-card plantao">
            <h4>Em Plant\xE3o</h4>
            <div class="stat-value">${s}</div>
        </div>
        <div class="stat-card folga">
            <h4>Na Folga</h4>
            <div class="stat-value">${i}</div>
        </div>
    `}function renderSiteFooter(){const e=document.getElementById("site-footer");if(!e)return;const t=getGroupLabelMap(),a=currentGroup&&currentGroup!=="todos"?t[currentGroup]||currentGroup.toUpperCase():"Todos";e.innerHTML=`
        <div class="footer-inner">
            <span class="footer-item">${APP_VERSION}</span>
            <span class="footer-dot">-</span>
            <span class="footer-item">Grupo: ${a}</span>
            <span class="footer-dot">-</span>
            <button type="button" class="footer-link" onclick="openHelpModal()">Ajuda</button>
            <span class="footer-dot">-</span>
            <button type="button" class="footer-link" onclick="openGuideModal()">Guia</button>
        </div>
    `}function ensureTooltipElement(){let e=document.getElementById("app-tooltip");return e||(e=document.createElement("div"),e.id="app-tooltip",e.className="app-tooltip",document.body.appendChild(e)),activeTooltipEl=e,e}function resolveTooltipTarget(e){return!e||typeof e.closest!="function"?null:e.closest("[title], [data-native-title]")}function positionTooltip(e,t){if(!activeTooltipEl)return;const a=12,o=activeTooltipEl.getBoundingClientRect(),n=Math.max(a,window.innerWidth-o.width-a),s=Math.max(a,window.innerHeight-o.height-a),i=Math.min(n,Math.max(a,e+14)),r=Math.min(s,Math.max(a,t+14));activeTooltipEl.style.left=`${i}px`,activeTooltipEl.style.top=`${r}px`}function hideActiveTooltip(){if(!activeTooltipTarget||!activeTooltipEl)return;const e=activeTooltipTarget.getAttribute("data-native-title");e&&!activeTooltipTarget.getAttribute("title")&&activeTooltipTarget.setAttribute("title",e),activeTooltipEl.classList.remove("show"),activeTooltipTarget=null}function showTooltipForTarget(e,t,a){if(!e)return;activeTooltipTarget&&activeTooltipTarget!==e&&hideActiveTooltip();const o=String(e.getAttribute("title")||e.getAttribute("data-native-title")||"").trim();if(!o)return;const n=ensureTooltipElement();e.getAttribute("title")&&(e.setAttribute("data-native-title",e.getAttribute("title")),e.removeAttribute("title")),activeTooltipTarget=e,n.textContent=o,positionTooltip(t,a),n.classList.add("show")}function initSmartTooltips(){uiTooltipInitialized||(uiTooltipInitialized=!0,!(window.matchMedia&&window.matchMedia("(hover: hover)").matches))||(document.addEventListener("mouseover",t=>{const a=resolveTooltipTarget(t.target);a&&showTooltipForTarget(a,t.clientX,t.clientY)}),document.addEventListener("mousemove",t=>{!activeTooltipTarget||!activeTooltipEl||positionTooltip(t.clientX,t.clientY)}),document.addEventListener("mouseout",t=>{if(!activeTooltipTarget)return;const a=t.relatedTarget;a&&activeTooltipTarget.contains(a)||hideActiveTooltip()}),document.addEventListener("focusin",t=>{const a=resolveTooltipTarget(t.target);if(!a)return;const o=a.getBoundingClientRect();showTooltipForTarget(a,o.left+8,o.bottom+4)}),document.addEventListener("focusout",()=>{hideActiveTooltip()}),window.addEventListener("scroll",hideActiveTooltip,{passive:!0}),window.addEventListener("resize",hideActiveTooltip,{passive:!0}))}function updateLastUpdatedDisplay(){updateBreadcrumb(),renderSiteFooter()}function loadReciclagemTemplates(){try{const e=localStorage.getItem("reciclagemTemplates");reciclagemTemplates=e?JSON.parse(e)||[]:[]}catch{reciclagemTemplates=[]}reciclagemTemplates.length||(reciclagemTemplates=CONFIG?.reciclagem?.renewalTemplates?JSON.parse(JSON.stringify(CONFIG.reciclagem.renewalTemplates)):[])}function saveReciclagemTemplates(e=!1){localStorage.setItem("reciclagemTemplates",JSON.stringify(reciclagemTemplates)),scheduleLocalSync("reciclagem-templates",{silent:e,notify:!e})}function loadReciclagemOverrides(){try{const e=localStorage.getItem("reciclagemOverrides");reciclagemOverrides=e?JSON.parse(e)||{}:{}}catch{reciclagemOverrides={}}}function saveReciclagemOverrides(e=!1){localStorage.setItem("reciclagemOverrides",JSON.stringify(reciclagemOverrides)),scheduleLocalSync("reciclagem-overrides",{silent:e,notify:!e})}function loadReciclagemHistory(){try{const e=localStorage.getItem("reciclagemHistory");reciclagemHistory=e?JSON.parse(e)||[]:[]}catch{reciclagemHistory=[]}}function saveReciclagemHistory(e=!1){localStorage.setItem("reciclagemHistory",JSON.stringify(reciclagemHistory)),scheduleLocalSync("reciclagem-history",{silent:e,notify:!e})}function loadReciclagemNotes(){try{const e=localStorage.getItem("reciclagemNotes");reciclagemNotes=e?JSON.parse(e)||{}:{}}catch{reciclagemNotes={}}}function saveReciclagemNotes(e=!1){localStorage.setItem("reciclagemNotes",JSON.stringify(reciclagemNotes)),scheduleLocalSync("reciclagem-notes",{silent:e,notify:!e})}function buildReciclagemCsvUrl(e){const t=CONFIG?.reciclagem?.baseCsvUrl||"",a=CONFIG?.reciclagem?.sheets?.[e];return a?a.csvUrl?a.csvUrl:t?a.gid?`${t}${t.includes("?")?"&":"?"}gid=${a.gid}`:t:"":""}function parseDateFlexible(e){if(!e)return null;const t=String(e).trim();if(!t)return null;if(t.includes("/")){const o=t.split("/");if(o.length>=3){const n=parseInt(o[0],10),s=parseInt(o[1],10),i=parseInt(o[2],10);if(!isNaN(n)&&!isNaN(s)&&!isNaN(i))return s>12&&n<=12?new Date(i,n-1,s):n>12&&s<=12?new Date(i,s-1,n):new Date(i,s-1,n)}}if(t.includes("-")){const o=t.split("-");if(o.length>=3){const n=parseInt(o[0],10),s=parseInt(o[1],10),i=parseInt(o[2],10);if(!isNaN(i)&&!isNaN(s)&&!isNaN(n))return new Date(n,s-1,i)}}const a=new Date(t);return isNaN(a.getTime())?null:a}function normalizeReValueLoose(e){return e==null?"":String(e).replace(/[^a-zA-Z0-9]/g,"")}function findReciclagemEntry(e,t,a){const o=normalizeReValueLoose(t||""),s=(a||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().split(" ")[0];let i=e.find(r=>normalizeReValueLoose(r.re)===o);return!i&&o.length>=3&&(i=e.find(r=>{const l=normalizeReValueLoose(r.re);if(!l||!(o.endsWith(l)||l.endsWith(o)||o.includes(l)||l.includes(o)))return!1;const p=(r.name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().split(" ")[0];return p&&s&&p===s})),i||null}function findReciclagemUnitEntry(e,t){const a=normalizeUnitKey(t||"");return e.find(o=>normalizeUnitKey(o.unit||"")===a)||null}function getReciclagemOverride(e,t){return(reciclagemOverrides?.[e]||{})[t]||null}function getReciclagemNote(e){return reciclagemNotes?.[e]||""}function setReciclagemNote(e,t){reciclagemNotes[e]=t,saveReciclagemNotes()}function setReciclagemOverride(e,t,a){reciclagemOverrides[e]||(reciclagemOverrides[e]={}),reciclagemOverrides[e][t]=a,saveReciclagemOverrides()}function calcReciclagemStatus(e){if(!e)return{status:"unknown",days:null};const t=new Date,a=e.getTime()-t.getTime(),o=Math.ceil(a/(1e3*60*60*24));if(o<0)return{status:"expired",days:o};const n=CONFIG?.reciclagem?.alertDays??30;return o<=n?{status:"due",days:o}:{status:"ok",days:o}}function getReciclagemSummaryForCollab(e,t){const a=CONFIG?.reciclagem?.sheets||{},o=Object.keys(a).filter(c=>a[c].match!=="unit");if(!reciclagemLoadedAt||!o.length)return{status:"unknown",title:"Reciclagem: sem dados"};let n={ok:0,due:0,expired:0,unknown:0},s=!1;const i=[];if(o.forEach(c=>{const d=reciclagemData[c]?.entries||[],p=findReciclagemEntry(d,e,t),g=getReciclagemOverride(c,e),m=p?.expiry||(g?.expiry?parseDateFlexible(g.expiry):null);if(!m&&!p){i.push(`${getReciclagemSheetLabel(c)}: sem dados`);return}if(s=!0,!m){n.unknown+=1,i.push(`${getReciclagemSheetLabel(c)}: sem data`);return}const f=calcReciclagemStatus(m);n[f.status]=(n[f.status]||0)+1;const u=formatDateOnly(m),b=f.status==="expired"?"vencido":f.status==="due"?"pr\xF3ximo":"em dia";i.push(`${getReciclagemSheetLabel(c)}: ${b} (${u})`)}),!s)return{status:"unknown",title:"Reciclagem: sem dados"};const r=[];return n.expired&&r.push(`${n.expired} vencida(s)`),n.due&&r.push(`${n.due} pr\xF3xima(s)`),n.ok&&r.push(`${n.ok} em dia`),!r.length&&n.unknown&&r.push("sem data"),{status:n.expired?"expired":n.due?"due":n.ok?"ok":"unknown",title:i.length?`Reciclagem:
${i.join(`
`)}`:`Reciclagem: ${r.join(", ")||"sem dados"}`}}async function loadReciclagemData(e=!1){!e&&reciclagemLoadedAt||(setAppState("reciclagemData",{},{silent:!0}),setAppState("reciclagemLoadedAt",new Date,{silent:!0}),e&&showToast("Reciclagem via Supabase ser\xE1 ativada em breve.","info"))}async function refreshReciclagemIfNeeded(){const e=reciclagemLoadedAt?reciclagemLoadedAt.getTime():0;await loadReciclagemData(!1),(reciclagemLoadedAt?reciclagemLoadedAt.getTime():0)>e&&currentTab==="reciclagem"&&renderReciclagem()}function startReciclagemAutoRefresh(){}function getReciclagemSheetLabel(e){return{ASO:"ASO",REQUALIFICACAO:"RECICLAGEM",NR10:"NR 10",NR20:"NR 20",NR33:"NR 33",NR35:"NR 35",DEA:"DEA",HELIPONTO:"HELIPONTO",UNIFORME:"UNIFORME",PCMSO:"PCMSO",PGR:"PGR"}[e]||e}function buildReciclagemMessage(e,t){const a=reciclagemTemplates.find(n=>n.id===e);if(!a)return"";const o=t?.expiry?formatDateOnly(t.expiry):t?.expiryIso||"";return a.text.replace(/{NOME}/g,t?.name||"").replace(/{RE}/g,t?.re||"").replace(/{TIPO}/g,t?.typeLabel||"").replace(/{VENCIMENTO}/g,o||"")}function openReciclagemWhatsapp(e,t){const a=buildReciclagemMessage(e,t);if(!a){showToast("Selecione um modelo de mensagem.","error");return}const o=t?.phone||"";openWhatsApp(o,a)}function copyReciclagemMessage(e,t){const a=buildReciclagemMessage(e,t);if(!a){showToast("Selecione um modelo de mensagem.","error");return}copyTextToClipboard(a)}function getReciclagemSheetKeysForTab(e){const t=CONFIG?.reciclagem?.sheets||{},a=Object.keys(t);return e==="unit"?a.filter(o=>t[o].match==="unit"):a.filter(o=>t[o].match!=="unit")}function applyReciclagemFilters(e,t){let a=e;if(t){const o=t.toUpperCase();a=a.filter(n=>(n.name||"").toUpperCase().includes(o)||(n.re||"").toUpperCase().includes(o)||(n.unit||"").toUpperCase().includes(o))}return a}function switchReciclagemTab(e){reciclagemTab=e,document.querySelectorAll(".reciclagem-tab").forEach(t=>t.classList.remove("active")),document.querySelector(`.reciclagem-tab[onclick="switchReciclagemTab('${e}')"]`)?.classList.add("active"),renderReciclagem()}function toggleReciclagemOnlyExpired(){reciclagemOnlyExpired=!reciclagemOnlyExpired;const e=document.getElementById("reciclagem-only-expired");e&&e.classList.toggle("active",reciclagemOnlyExpired),renderReciclagem()}function setReciclagemStatusFilter(e){const t=document.getElementById("reciclagem-status-filter");t&&(t.value=e,renderReciclagem())}function focusReciclagemUnit(e){const t=document.getElementById("reciclagem-search");t&&(t.value=e||"",renderReciclagem())}function renderReciclagemSkeleton(e,t=5){e.innerHTML=Array.from({length:t}).map(()=>`
        <div class="reciclagem-card skeleton-card">
            <div class="skeleton-line w-40"></div>
            <div class="skeleton-line w-70"></div>
            <div class="skeleton-line w-90"></div>
            <div class="skeleton-line w-60"></div>
        </div>
    `).join("")}function bindReciclagemActions(e){!e||e.dataset.bound||(e.addEventListener("click",t=>{const a=t.target.closest(".reciclagem-action");if(!a)return;const o=parseInt(a.dataset.index,10);if(!Number.isFinite(o))return;const n=reciclagemRenderCache[o];if(!n)return;const i=document.getElementById(`reciclagem-template-${o}`)?.value||"";a.dataset.action==="send"&&openReciclagemWhatsapp(i,n),a.dataset.action==="copy"&&copyReciclagemMessage(i,n)}),e.dataset.bound="1")}function copyTextToClipboard(e){if(e){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(e).then(()=>{showToast("Mensagem copiada.","success")}).catch(()=>{fallbackCopy(e)});return}fallbackCopy(e)}}function fallbackCopy(e){const t=document.createElement("textarea");t.value=e,t.setAttribute("readonly",""),t.style.position="absolute",t.style.left="-9999px",document.body.appendChild(t),t.select();try{document.execCommand("copy"),showToast("Mensagem copiada.","success")}catch{showToast("N\xE3o foi poss\xEDvel copiar.","error")}document.body.removeChild(t)}function getUniqueReciclagemCollabs(e){const t=new Map;return e.forEach(a=>{const o=normalizeReValueLoose(a.re)||(a.nome||"").toUpperCase().trim();if(!o)return;if(!t.has(o)){t.set(o,{...a});return}const n=t.get(o);t.set(o,{...n,...a,nome:n.nome||a.nome||"",re:n.re||a.re||"",telefone:n.telefone||a.telefone||"",posto:n.posto||a.posto||""})}),Array.from(t.values())}function getPhoneForCollab(e){const t=currentData.find(n=>n.re===e);return t?.telefone?t.telefone:(allCollaboratorsCache?.items||[]).find(n=>n.re===e)?.telefone||""}function getCollabStatusFromDetails(e){return!e||!e.length?"unknown":e.some(t=>t.status==="expired")?"expired":e.some(t=>t.status==="due")?"due":e.some(t=>t.status==="ok")?"ok":"unknown"}function buildReciclagemSummaryData(e){const t={expired:0,due:0,ok:0,unknown:0,total:e.length},a={};return e.forEach(o=>{const n=o.collabStatus||o.status||"unknown";t[n]!==void 0&&(t[n]+=1),(o.detailItems||[]).forEach(s=>{a[s.label]||(a[s.label]={expired:0,due:0,ok:0,unknown:0}),a[s.label][s.status]=(a[s.label][s.status]||0)+1})}),{counts:t,typeCounts:a}}function renderReciclagemSummary(e){const t=document.getElementById("reciclagem-summary");if(!t)return;const{counts:a}=buildReciclagemSummaryData(e);t.innerHTML=`
        <div class="reciclagem-kpi">
            <div class="reciclagem-kpi-card status-expired">
                <div class="label">Vencidos</div>
                <div class="value">${a.expired}</div>
                <div class="meta">Cr\xEDticos</div>
            </div>
            <div class="reciclagem-kpi-card status-due">
                <div class="label">Pr\xF3ximos</div>
                <div class="value">${a.due}</div>
                <div class="meta">At\xE9 ${CONFIG?.reciclagem?.alertDays??30} dias</div>
            </div>
            <div class="reciclagem-kpi-card status-ok">
                <div class="label">Em dia</div>
                <div class="value">${a.ok}</div>
                <div class="meta">Regulares</div>
            </div>
            <div class="reciclagem-kpi-card status-unknown">
                <div class="label">Sem data</div>
                <div class="value">${a.unknown}</div>
                <div class="meta">Necessita ajuste</div>
            </div>
            <div class="reciclagem-kpi-card">
                <div class="label">Total</div>
                <div class="value">${a.total}</div>
                <div class="meta">Itens filtrados</div>
            </div>
        </div>
    `,t.classList.remove("hidden")}async function renderReciclagem(){const e=document.getElementById("reciclagem-list");if(!e)return;const t=document.getElementById("reciclagem-type-counts");t&&(t.innerHTML=""),renderReciclagemSkeleton(e,6),bindReciclagemActions(e);try{await loadReciclagemData(!1)}catch(m){AppErrorHandler.capture(m,{scope:"render-reciclagem-load"},{silent:!0}),e.innerHTML='<div class="empty-state">Erro ao carregar reciclagem.</div>';return}let a,o,n,s;try{a=document.getElementById("reciclagem-sheet-filter"),o=document.getElementById("reciclagem-status-filter"),n=document.getElementById("reciclagem-search"),s=getReciclagemSheetKeysForTab(reciclagemTab)}catch(m){AppErrorHandler.capture(m,{scope:"render-reciclagem-filters"},{silent:!0}),e.innerHTML='<div class="empty-state">Erro ao carregar reciclagem.</div>';return}if(a&&!a.dataset.ready&&(a.addEventListener("change",renderReciclagem),a.dataset.ready="1"),o&&!o.dataset.ready&&(o.addEventListener("change",renderReciclagem),o.dataset.ready="1"),n&&!n.dataset.ready&&(n.addEventListener("input",()=>{clearTimeout(n._timer),n._timer=setTimeout(renderReciclagem,200)}),n.dataset.ready="1"),a){const m=a.value||"all";a.innerHTML='<option value="all">Todas as reciclagens</option>'+s.map(f=>`<option value="${f}">${getReciclagemSheetLabel(f)}</option>`).join(""),a.value=s.includes(m)?m:"all"}const i=a?.value||"all",r=o?.value||"all",l=n?.value.trim()||"",c=document.getElementById("reciclagem-only-expired");c&&c.classList.toggle("active",reciclagemOnlyExpired),document.querySelectorAll(".reciclagem-quick .filter-chip").forEach(m=>{const f=m.dataset.status===r;m.classList.toggle("active",f)});const d=[];if(reciclagemTab==="unit"){const m=[...new Set(currentData.map(u=>u.posto).filter(Boolean))].sort(),f=i==="all"?s:[i];m.forEach(u=>{const b=[];f.forEach(v=>{const E=reciclagemData[v]?.entries||[],k=findReciclagemUnitEntry(E,u),$=getReciclagemOverride(v,normalizeUnitKey(u)),h=$?.expiry?parseDateFlexible($.expiry):k?.expiry||null;if(!h&&!k){b.push({key:v,label:getReciclagemSheetLabel(v),status:"unknown",expiry:null,dateLabel:"Sem dados"});return}if(!h){b.push({key:v,label:getReciclagemSheetLabel(v),status:"unknown",expiry:null,dateLabel:"sem data"});return}const S=calcReciclagemStatus(h);b.push({key:v,label:getReciclagemSheetLabel(v),status:S.status,expiry:h,dateLabel:formatDateOnly(h)})}),d.push({type:"ALL",typeLabel:"Documentos",unit:u,status:"mixed",detailItems:b,collabStatus:getCollabStatusFromDetails(b),match:"unit"})})}else{const m=i==="all"?s:[i];getUniqueReciclagemCollabs(currentData).forEach(u=>{let b={ok:0,due:0,expired:0,unknown:0},v=!1;const E=[];if(m.forEach(h=>{const S=reciclagemData[h]?.entries||[],T=findReciclagemEntry(S,u.re,u.nome),R=getReciclagemOverride(h,u.re),D=T?.expiry||(R?.expiry?parseDateFlexible(R.expiry):null);if(!D&&!T){E.push({key:h,label:getReciclagemSheetLabel(h),status:"unknown",expiry:null,dateLabel:"Sem dados"});return}if(v=!0,!D){b.unknown+=1,E.push({key:h,label:getReciclagemSheetLabel(h),status:"unknown",expiry:null,dateLabel:"sem data"});return}const B=calcReciclagemStatus(D);b[B.status]=(b[B.status]||0)+1,E.push({key:h,label:getReciclagemSheetLabel(h),status:B.status,expiry:D,dateLabel:formatDateOnly(D)})}),!v){d.push({type:"ALL",typeLabel:"Reciclagens",name:u.nome,re:u.re,phone:getPhoneForCollab(u.re)||"",unit:u.posto||"",status:"unknown",days:null,expiry:null,expiryIso:"",summary:"Sem dados",detailItems:E,collabStatus:"unknown",match:"re"});return}const k=[],$=[];b.expired&&k.push(`${b.expired} vencida(s)`),b.due&&k.push(`${b.due} pr\xF3xima(s)`),b.ok&&k.push(`${b.ok} em dia`),!k.length&&b.unknown&&k.push("sem data"),E.forEach(h=>{const S=h.status==="expired"?"vencido":h.status==="due"?"pr\xF3ximo":h.status==="ok"?"em dia":"sem data";$.push(`${h.label}: ${S} (${h.dateLabel})`)}),d.push({type:"ALL",typeLabel:"Reciclagens",name:u.nome,re:u.re,phone:getPhoneForCollab(u.re)||"",unit:u.posto||"",status:"mixed",days:null,expiry:null,expiryIso:"",summary:k.join(", "),summaryDetail:$.join(" | "),detailItems:E,collabStatus:getCollabStatusFromDetails(E),match:"re"})})}const g=applyReciclagemFilters(d,l).filter(m=>reciclagemTab!=="colab"?!(reciclagemOnlyExpired&&m.status!=="expired"||r&&r!=="all"&&m.status!==r):!m.detailItems||!m.detailItems.length?!reciclagemOnlyExpired&&(r==="all"||r==="unknown"):reciclagemOnlyExpired?m.collabStatus==="expired":r&&r!=="all"?m.collabStatus===r:!0);if(t){const m={};reciclagemTab==="colab"?g.forEach(u=>{(u.detailItems||[]).forEach(b=>{m[b.label]||(m[b.label]={expired:0,due:0,ok:0,unknown:0}),m[b.label][b.status]=(m[b.label][b.status]||0)+1})}):g.forEach(u=>{const b=u.typeLabel||u.type;m[b]||(m[b]={expired:0,due:0,ok:0,unknown:0}),m[b][u.status]=(m[b][u.status]||0)+1});const f=Object.keys(m).map(u=>{const b=m[u];return`<div class="reciclagem-type-chip">
                <strong>${u}</strong>
                <span class="expired">${b.expired||0} vencidos</span>
                <span class="due">${b.due||0} pr\xF3ximos</span>
                <span class="ok">${b.ok||0} em dia</span>
            </div>`}).join("");t.innerHTML=f?`<div class="reciclagem-type-counts-inner">${f}</div>`:""}if(!g.length){e.innerHTML='<p class="empty-state">Nenhum registro encontrado.</p>',reciclagemRenderCache=[],AppCacheManager.set("reciclagem-render","items",reciclagemRenderCache);return}reciclagemRenderCache=g,AppCacheManager.set("reciclagem-render","items",reciclagemRenderCache),e.innerHTML=g.map((m,f)=>{const u={ok:"Em dia",due:"Pr\xF3ximo",expired:"Vencido",unknown:"Sem data",mixed:"Detalhado"}[m.status]||"N/I",b=m.expiry?formatDateOnly(m.expiry):"N/I",v=SiteAuth.mode==="edit",E=m.match==="unit"?normalizeUnitKey(m.unit):m.re,k=`reciclagem-template-${f}`,$=m.match==="re"?getReciclagemNote(m.re):"",h=m.match==="re"?`<select id="${k}" class="reciclagem-template">
                    <option value="">Mensagem</option>
                    ${reciclagemTemplates.map(x=>`<option value="${x.id}">${x.label}</option>`).join("")}
               </select>
               <div class="reciclagem-action-buttons">
                    <button class="btn-mini btn-secondary reciclagem-action" data-action="send" data-index="${f}">Enviar</button>
                    <button class="btn-mini btn-secondary reciclagem-action" data-action="copy" data-index="${f}">Copiar</button>
                    <button class="btn-mini btn-secondary obs-inline" title="${$||"Sem observa\xE7\xE3o."}" onclick="openReciclagemNoteModal('${m.re}', '${m.name}')">Obs</button>
               </div>`:"",S=m.match==="unit"&&v&&m.type!=="ALL",T=i!=="all"?(m.detailItems||[]).filter(x=>x.key===i):m.detailItems||[],R=m.match==="re"&&T.some(x=>x.status==="expired")?'<span class="reciclagem-badge" title="Vencido"></span>':"",D=m.match==="re"?T.map(x=>{const _=x.status==="expired"?"Vencido":x.status==="due"?"Pr\xF3ximo":x.status==="ok"?"Em dia":"Sem data";return`
                    <div class="reciclagem-line status-${x.status}">
                        <span class="reciclagem-line-label">${x.label}</span>
                        <span class="reciclagem-line-date">${x.dateLabel}</span>
                        <span class="reciclagem-line-status">${_}</span>
                    </div>
                `}).join(""):"";if(m.match==="unit"){const x=T.map(_=>`
                    <div class="reciclagem-chip status-${_.status}">
                        <div class="chip-label">${_.label}</div>
                        <div class="chip-date">${_.dateLabel}</div>
                    </div>
                `).join("");return`
                <div class="reciclagem-card status-${m.status} compact thin">
                    <div class="reciclagem-top">
                        <div class="reciclagem-left">
                            <div class="reciclagem-id">
                                <div class="reciclagem-title">
                                    <strong>${m.unit}</strong>
                                </div>
                                <div class="reciclagem-re">Documenta\xE7\xE3o da unidade</div>
                            </div>
                        </div>
                        <div class="reciclagem-right">
                            <div class="reciclagem-chips">
                                ${x}
                            </div>
                            <div class="reciclagem-footer">
                                <span>Aplic\xE1vel a todos os grupos</span>
                            </div>
                        </div>
                    </div>
                </div>
            `}const B=T.map(x=>{const _=x.status==="expired"?"Vencido":x.status==="due"?"Pr\xF3ximo":x.status==="ok"?"Em dia":"Sem data";return`
                <div class="reciclagem-chip status-${x.status}">
                    <div class="chip-label">${x.label}</div>
                    <div class="chip-date">${x.dateLabel}</div>
                </div>
            `}).join("");return`
            <div class="reciclagem-card status-${m.status} compact thin">
                <div class="reciclagem-top">
                    <div class="reciclagem-left">
                        <div class="reciclagem-id">
                            <div class="reciclagem-title">
                                <strong>${m.name}</strong>
                            </div>
                            <div class="reciclagem-re">RE ${m.re} ${R}</div>
                        </div>
                        <div class="reciclagem-obs-text" title="${$||"Sem observa\xE7\xE3o."}">
                            ${$||"Sem observa\xE7\xE3o."}
                        </div>
                        <div class="reciclagem-actions-row">
                            ${h?`<div class="reciclagem-actions compact">${h}</div>`:""}
                        </div>
                    </div>
                    <div class="reciclagem-right">
                        <div class="reciclagem-chips">
                            ${B}
                        </div>
                        <div class="reciclagem-footer">
                            <button class="reciclagem-unit-pill" onclick="focusReciclagemUnit('${m.unit||""}')">Unidade: ${m.unit||"N/I"}</button>
                        </div>
                    </div>
                </div>
            </div>
        `}).join("")}function exportReciclagemReport(){if(!reciclagemRenderCache.length){showToast("Nenhum dado de reciclagem para exportar.","info");return}const e=reciclagemRenderCache,t=buildReciclagemSummaryData(e),a=[{Indicador:"Vencidos",Valor:t.counts.expired},{Indicador:"Pr\xF3ximos",Valor:t.counts.due},{Indicador:"Em dia",Valor:t.counts.ok},{Indicador:"Sem data",Valor:t.counts.unknown},{Indicador:"Total filtrado",Valor:t.counts.total}],o=Object.keys(t.typeCounts).map(l=>{const c=t.typeCounts[l];return{Tipo:l,Vencidos:c.expired||0,Pr\u00F3ximos:c.due||0,"Em dia":c.ok||0,"Sem data":c.unknown||0}}),n=e.map(l=>({Tipo:l.typeLabel||l.type||"",Nome:l.name||"",RE:l.re||"",Unidade:l.unit||"",Status:l.collabStatus||l.status||"",Resumo:l.summary||"",Detalhes:(l.detailItems||[]).map(c=>`${c.label}: ${c.dateLabel} (${c.status})`).join(" | ")})),s=[];e.forEach(l=>{(l.detailItems||[]).forEach(c=>{s.push({Tipo:c.label,Nome:l.name||"",RE:l.re||"",Unidade:l.unit||"",Status:c.status,Validade:c.dateLabel||""})})});const i=XLSX.utils.book_new();XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a),"Resumo"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(o),"Por Tipo"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(n),"Base"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(s),"Detalhes");const r=new Date().toISOString().slice(0,10);XLSX.writeFile(i,`reciclagem_${r}.xlsx`),showToast("Relat\xF3rio de reciclagem exportado.","success")}function openReciclagemModal(e,t,a,o){if(!(SiteAuth.logged&&SiteAuth.mode==="edit")){showToast("Apenas admins podem editar.","error");return}if(e==="ALL"){showToast("Selecione uma reciclagem espec\xEDfica para editar.","info");return}document.getElementById("reciclagem-edit-key").value=e,document.getElementById("reciclagem-edit-target").value=t,document.getElementById("reciclagem-edit-type").value=getReciclagemSheetLabel(e),document.getElementById("reciclagem-edit-ref").value=`${o||""}${a==="unit"?"":` (${t})`}`;const n=getReciclagemOverride(e,t);document.getElementById("reciclagem-edit-date").value=n?.expiry||"",document.getElementById("reciclagem-modal")?.classList.remove("hidden")}function closeReciclagemModal(){document.getElementById("reciclagem-modal")?.classList.add("hidden")}function openReciclagemNoteModal(e,t){if(!(SiteAuth.logged&&SiteAuth.mode==="edit")){showToast("Apenas admins podem editar.","error");return}document.getElementById("reciclagem-note-target").value=e,document.getElementById("reciclagem-note-ref").value=`${t||""} (${e})`,document.getElementById("reciclagem-note-text").value=getReciclagemNote(e)||"",document.getElementById("reciclagem-note-modal")?.classList.remove("hidden")}function closeReciclagemNoteModal(){document.getElementById("reciclagem-note-modal")?.classList.add("hidden")}function saveReciclagemNote(){if(!(SiteAuth.logged&&SiteAuth.mode==="edit"))return;const e=document.getElementById("reciclagem-note-target").value,t=document.getElementById("reciclagem-note-text").value.trim();setReciclagemNote(e,t),closeReciclagemNoteModal(),renderReciclagem(),showToast("Observa\xE7\xE3o salva.","success")}function saveReciclagemEdit(){if(!(SiteAuth.logged&&SiteAuth.mode==="edit"))return;const e=document.getElementById("reciclagem-edit-key").value,t=document.getElementById("reciclagem-edit-target").value,a=document.getElementById("reciclagem-edit-date").value.trim();if(!a){showToast("Informe a validade.","error");return}const o=getReciclagemOverride(e,t)?.expiry||"";setReciclagemOverride(e,t,{expiry:a,updatedBy:SiteAuth.user||"Admin",updatedAt:new Date().toISOString()}),reciclagemHistory.unshift({at:new Date().toISOString(),by:SiteAuth.user||"Admin",sheet:e,target:t,from:o,to:a}),saveReciclagemHistory(),closeReciclagemModal(),renderReciclagem(),showToast("Reciclagem atualizada (local).","success")}function toggleReciclagemTemplatesPanel(){if(!isAdminRole())return;const e=document.getElementById("reciclagem-templates-panel");e&&(e.classList.toggle("hidden"),renderReciclagemTemplatesPanel())}function toggleReciclagemHistory(){if(!isAdminRole())return;const e=document.getElementById("reciclagem-history-panel");if(!e)return;e.classList.toggle("hidden");const t=document.getElementById("reciclagem-list");t&&t.classList.toggle("hidden",!e.classList.contains("hidden"));const a=document.getElementById("reciclagem-type-counts");a&&a.classList.toggle("hidden",!e.classList.contains("hidden")),renderReciclagemHistory()}function renderReciclagemHistory(){const e=document.getElementById("reciclagem-history-list");if(!e)return;if(!reciclagemHistory.length){e.innerHTML='<div class="admin-empty">Nenhuma altera\xE7\xE3o registrada.</div>';return}const t=reciclagemHistory.slice(0,40).map(a=>`
        <div class="reciclagem-template-row">
            <div>
                <strong>${getReciclagemSheetLabel(a.sheet)} \u2022 ${a.target}</strong>
                <div class="hint">${formatAvisoDate(a.at)} \u2014 ${a.by}</div>
                <div class="hint">De: ${a.from||"N/I"} \u2192 Para: ${a.to}</div>
            </div>
        </div>
    `).join("");e.innerHTML=t}function renderReciclagemTemplatesPanel(){const e=document.getElementById("reciclagem-templates-list");if(e){if(!reciclagemTemplates.length){e.innerHTML='<div class="admin-empty">Nenhum modelo cadastrado.</div>';return}e.innerHTML=reciclagemTemplates.map((t,a)=>`
        <div class="reciclagem-template-row">
            <div>
                <strong>${t.label}</strong>
                <div class="hint">${t.text}</div>
            </div>
            <button class="btn-mini btn-secondary" onclick="removeReciclagemTemplate(${a})">Excluir</button>
        </div>
    `).join("")}}function addReciclagemTemplate(){if(!isAdminRole())return;const e=document.getElementById("reciclagem-template-id")?.value.trim(),t=document.getElementById("reciclagem-template-label")?.value.trim(),a=document.getElementById("reciclagem-template-text")?.value.trim();if(!e||!t||!a){showToast("Preencha ID, t\xEDtulo e mensagem.","error");return}if(reciclagemTemplates.some(o=>o.id===e)){showToast("ID j\xE1 existe.","error");return}reciclagemTemplates.push({id:e,label:t,text:a}),saveReciclagemTemplates(),document.getElementById("reciclagem-template-id").value="",document.getElementById("reciclagem-template-label").value="",document.getElementById("reciclagem-template-text").value="",renderReciclagemTemplatesPanel(),renderReciclagem()}function removeReciclagemTemplate(e){isAdminRole()&&confirm("Remover modelo?")&&(reciclagemTemplates.splice(e,1),saveReciclagemTemplates(),renderReciclagemTemplatesPanel(),renderReciclagem())}function printCurrentView(){window.print()}function openHelpModal(){closeUtilityDrawer(),document.getElementById("help-modal")?.classList.remove("hidden"),syncModalOpenState()}function closeHelpModal(){document.getElementById("help-modal")?.classList.add("hidden"),syncModalOpenState()}function setAddressModalModeUi(e){const t=e==="collab",a=document.getElementById("address-modal-title"),o=document.getElementById("address-modal-search-label"),n=document.getElementById("address-search");a&&(a.textContent=t?"Endere\xE7o do Colaborador":"Endere\xE7os das Unidades"),o&&(o.textContent=t?"Buscar colaborador":"Buscar unidade"),n&&(n.placeholder=t?"Digite nome, RE ou unidade...":"Digite a unidade...")}function openAddressModal(e=""){openAddressModalForUnit(e)}function openAddressModalForUnit(e=""){addressModalState={mode:"unit",filter:String(e||""),collabRe:"",collabName:"",unitName:String(e||"")};const t=document.getElementById("address-modal");if(!t)return;t.classList.remove("hidden"),setAddressModalModeUi("unit");const a=document.getElementById("address-search");a&&(a.value=addressModalState.filter,a.dataset.bound||(a.addEventListener("input",()=>{addressModalState.filter=a.value||"",renderAddressList(addressModalState.filter)}),a.dataset.bound="1"),setTimeout(()=>a.focus(),0)),renderAddressList(addressModalState.filter)}function openAddressModalForCollaborator(e="",t="",a=""){addressModalState={mode:"collab",filter:String(t||e||a||""),collabRe:String(e||""),collabName:String(t||""),unitName:String(a||"")};const o=document.getElementById("address-modal");if(!o)return;o.classList.remove("hidden"),setAddressModalModeUi("collab");const n=document.getElementById("address-search");n&&(n.value=addressModalState.filter,n.dataset.bound||(n.addEventListener("input",()=>{addressModalState.filter=n.value||"",renderAddressList(addressModalState.filter)}),n.dataset.bound="1"),setTimeout(()=>n.focus(),0)),renderAddressList(addressModalState.filter),loadCollaboratorAddressDb().then(()=>{addressModalState.mode==="collab"&&renderAddressList(addressModalState.filter)}).catch(()=>{})}function closeAddressModal(){document.getElementById("address-modal")?.classList.add("hidden"),syncModalOpenState()}function openFtWeekPreviewModal(e="",t=""){const a=document.getElementById("ft-week-preview-modal"),o=document.getElementById("ft-week-preview-title"),n=document.getElementById("ft-week-preview-body");if(!a||!n)return;const s=String(e||"").trim(),i=String(t||"").trim(),r=i?`${i}${s?` (${s})`:""}`:s?`RE ${s}`:"Colaborador";if(!s){o&&(o.textContent="Escala completa"),n.innerHTML='<p class="empty-state">RE n\xE3o informado para preview.</p>',a.classList.remove("hidden");return}const l=getMonthRangeByDateKey(getTodayKey());ftPreviewModalState={mode:"collab",re:s,name:i,unit:"",groupKey:"",monthKey:l.start,selectedDate:getTodayKey()},o&&(o.textContent=`Escala completa \u2022 ${r}`),n.innerHTML=buildFtMonthCalendarHtmlForRe(s,{monthKey:ftPreviewModalState.monthKey,selectedDate:ftPreviewModalState.selectedDate}),openFtMonthDayDetails(ftPreviewModalState.selectedDate),a.classList.remove("hidden")}function closeFtWeekPreviewModal(){document.getElementById("ft-week-preview-modal")?.classList.add("hidden"),ftPreviewModalState={mode:"collab",re:"",name:"",unit:"",groupKey:"",monthKey:"",selectedDate:""},syncModalOpenState()}function getPerformanceRelationLabelForRe(e,t){const a=getFtCounterpartLabelForRe(e,t);return matchesRe(e?.collabRe,t)?`Cobrindo ${a}`:`Coberto por ${a}`}function buildCollaboratorPerformanceSnapshot(e="",t=""){const a=String(e||"").trim(),o=String(t||"").trim(),n=resolveCollaboratorByRe(a)||null,s=n?.nome||o||`RE ${a||"N/I"}`,i=n?.re||a||"N/I",r=n?getStatusInfo(n):{text:"N/I",color:"#64748b"},l=n?getCollaboratorRoleLabel(n):"N/I",c=n?.grupoLabel||"N/I",d=n?.posto||"N/I",p=n?.escala||"N/I",g=getTodayKey(),m=getDateKeyWithOffset(g,-29),f=getDateKeyWithOffset(g,30),u=getMonthRangeByDateKey(g),b=getFtOperationalItems(ftLaunches).filter(I=>matchesRe(I?.collabRe,a)||matchesRe(I?.coveringRe,a)),v=b.filter(I=>{const A=getFtItemDateKey(I);return isDateInsideRange(A,m,g)}),E=v.filter(I=>matchesRe(I?.collabRe,a)),k=v.filter(I=>matchesRe(I?.coveringRe,a)&&!matchesRe(I?.collabRe,a)),$=E.filter(I=>I?.status==="pending").length,h=E.filter(I=>I?.status==="submitted").length,S=E.filter(I=>I?.status==="launched").length,T=h+S,R=E.length?Math.round(T/E.length*100):0,D=b.filter(I=>{const A=getFtItemDateKey(I);return isDateInsideRange(A,u.start,u.end)}).length,B=b.filter(I=>{const A=normalizeFtDateKey(I?.date);return!!A&&A>g&&A<=f}).sort((I,A)=>getFtItemDateValue(I)-getFtItemDateValue(A)).slice(0,6),x=b.slice().sort((I,A)=>getFtItemDateValue(A)-getFtItemDateValue(I)).slice(0,8).map(I=>{const A=getFtItemDateKey(I)||"",C=getFtReasonLabel(I?.reason,I?.reasonOther)||I?.reasonRaw||"N/I";return{date:A?formatFtDate(A):"Sem data",status:getFtStatusLabel(I),relation:getPerformanceRelationLabelForRe(I,a),unit:getFtUnitLabel(I),shift:I?.shift||"N/I",reason:C}}),_=[];for(let I=0;I<7;I++){const A=getDateKeyWithOffset(g,I),C=getDutyForecastForDate(n,A),O=getFtItemsForReInRange(a,A,A).length;_.push({key:A,label:`${getWeekdayShortPtByDate(A)} ${formatFtDateShort(A)}`,dutyCode:C.code,dutyClass:C.className,ftCount:O})}const M=getReciclagemSummaryForCollab(a,s),P=M?.status||"unknown",y=String(M?.title||"Reciclagem: sem dados").split(`
`).map(I=>I.trim()).filter(Boolean),w={ok:"Em dia",due:"Pr\xF3xima do vencimento",expired:"Vencida",unknown:"Sem dados"},N=currentGroup||"todos",U=getPendingAvisosByCollaborator(i,N),F=getPendingRemindersByCollaborator(i,N);return{re:i,name:s,unit:d,group:c,role:l,schedule:p,statusInfo:r,rolling:{start:m,end:g,total:E.length,coverage:k.length,pending:$,submitted:h,launched:S,closeRate:R},monthTotal:D,future30:B,recent:x,weekPlan:_,reciclagem:{status:P,label:w[P]||"Sem dados",lines:y},avisos:U,reminders:F}}function buildCollaboratorPerformanceModalHtml(e){const t=e.weekPlan.map(s=>`
        <div class="performance-day ${s.dutyClass}">
            <div class="performance-day-label">${s.label}</div>
            <div class="performance-day-duty">${s.dutyCode}</div>
            <div class="performance-day-ft">${s.ftCount?`FT ${s.ftCount}`:"sem FT"}</div>
        </div>
    `).join(""),a=e.future30.length?e.future30.map(s=>`
            <div class="performance-line">
                <strong>${escapeHtml(formatFtDate(s.date||getFtItemDateKey(s)||""))}</strong>
                <span>${escapeHtml(getFtStatusLabel(s))}</span>
                <span>${escapeHtml(getFtUnitLabel(s))}</span>
                <span>${escapeHtml(s.shift||"N/I")}</span>
            </div>
        `).join(""):'<p class="empty-state">Sem FT futura nos pr\xF3ximos 30 dias.</p>',o=e.recent.length?e.recent.map(s=>`
            <div class="performance-line">
                <strong>${escapeHtml(s.date)}</strong>
                <span>${escapeHtml(s.status)}</span>
                <span>${escapeHtml(s.relation)}</span>
                <span>${escapeHtml(s.unit)}</span>
                <span>${escapeHtml(s.shift)}</span>
            </div>
        `).join(""):'<p class="empty-state">Sem hist\xF3rico recente de FT.</p>',n=e.reciclagem.lines.length?`<ul class="performance-list">${e.reciclagem.lines.map(s=>`<li>${escapeHtml(s)}</li>`).join("")}</ul>`:'<p class="empty-state">Sem dados de reciclagem.</p>';return`
        <div class="performance-head">
            <div>
                <div class="performance-title">${escapeHtml(e.name)} <span class="performance-re">(RE ${escapeHtml(e.re)})</span></div>
                <div class="performance-meta">Unidade: ${escapeHtml(e.unit)} \u2022 Grupo: ${escapeHtml(e.group)} \u2022 Cargo: ${escapeHtml(e.role)}</div>
                <div class="performance-meta">Escala: ${escapeHtml(e.schedule)} \u2022 Status atual: <span class="performance-status" style="background:${e.statusInfo.color};">${escapeHtml(e.statusInfo.text)}</span></div>
            </div>
            <div class="performance-flags">
                <span class="perf-flag">Avisos pendentes: ${e.avisos}</span>
                <span class="perf-flag">Lembretes pendentes: ${e.reminders}</span>
                <span class="perf-flag reciclagem ${e.reciclagem.status}">Reciclagem: ${escapeHtml(e.reciclagem.label)}</span>
            </div>
        </div>

        <div class="performance-kpis">
            <div class="performance-kpi"><div class="label">FT executadas (30d)</div><div class="value">${e.rolling.total}</div></div>
            <div class="performance-kpi"><div class="label">FT cobrindo ele (30d)</div><div class="value">${e.rolling.coverage}</div></div>
            <div class="performance-kpi"><div class="label">Pendentes (30d)</div><div class="value">${e.rolling.pending}</div></div>
            <div class="performance-kpi"><div class="label">Confirmadas (30d)</div><div class="value">${e.rolling.submitted}</div></div>
            <div class="performance-kpi"><div class="label">Lan\xE7adas (30d)</div><div class="value">${e.rolling.launched}</div></div>
            <div class="performance-kpi"><div class="label">Taxa de fechamento (30d)</div><div class="value">${e.rolling.closeRate}%</div></div>
            <div class="performance-kpi"><div class="label">Registros no m\xEAs atual</div><div class="value">${e.monthTotal}</div></div>
            <div class="performance-kpi"><div class="label">Per\xEDodo analisado</div><div class="value">${escapeHtml(formatFtDate(e.rolling.start))} a ${escapeHtml(formatFtDate(e.rolling.end))}</div></div>
        </div>

        <div class="performance-block">
            <h4>Planejamento 7 dias</h4>
            <div class="performance-days">${t}</div>
        </div>

        <div class="performance-grid">
            <div class="performance-block">
                <h4>Pr\xF3ximas FT (30 dias)</h4>
                <div class="performance-lines">${a}</div>
            </div>
            <div class="performance-block">
                <h4>Reciclagem</h4>
                ${n}
            </div>
        </div>

        <div class="performance-block">
            <h4>Hist\xF3rico recente</h4>
            <div class="performance-lines">${o}</div>
        </div>
    `}function openPerformanceModal(e="",t=""){const a=document.getElementById("performance-modal"),o=document.getElementById("performance-modal-title"),n=document.getElementById("performance-modal-body");if(!a||!n)return;const s=String(e||"").trim(),i=String(t||"").trim();if(!s){o&&(o.textContent="Performance do colaborador"),n.innerHTML='<p class="empty-state">RE n\xE3o informado para abrir a performance.</p>',a.classList.remove("hidden"),syncModalOpenState();return}const r=buildCollaboratorPerformanceSnapshot(s,i);performanceModalState={re:r.re,name:r.name},o&&(o.textContent=`Performance \u2022 ${r.name} (RE ${r.re})`),n.innerHTML=buildCollaboratorPerformanceModalHtml(r),a.classList.remove("hidden"),syncModalOpenState()}function closePerformanceModal(){document.getElementById("performance-modal")?.classList.add("hidden"),performanceModalState={re:"",name:""},syncModalOpenState()}function openFtMonthDayDetails(e=""){if(ftPreviewModalState.mode!=="collab"||!ftPreviewModalState.re)return;const t=normalizeFtDateKey(e)||getTodayKey();ftPreviewModalState.selectedDate=t,document.querySelectorAll("#ft-week-preview-body .ft-month-day").forEach(o=>{o.classList.toggle("active",o.getAttribute("data-day")===t)});const a=document.getElementById("ft-week-preview-day-details");a&&(a.innerHTML=buildFtDayDetailsHtmlForRe(ftPreviewModalState.re,t))}function openFtUnitDayDetailsModal(e="",t="",a=""){const o=document.getElementById("ft-week-preview-modal"),n=document.getElementById("ft-week-preview-title"),s=document.getElementById("ft-week-preview-body");if(!o||!s)return;const i=String(e||"").trim(),r=normalizeFtDateKey(t)||getTodayKey();ftPreviewModalState={mode:"unit",re:"",name:"",unit:i,groupKey:String(a||"").trim(),monthKey:"",selectedDate:r},n&&(n.textContent=`Escala da unidade \u2022 ${i||"N/I"} \u2022 ${formatFtDate(r)}`),s.innerHTML=buildFtUnitDayDetailsHtml(i,r,ftPreviewModalState.groupKey),o.classList.remove("hidden")}function buildAddressEntriesForUnit(){return[...new Set(currentData.map(t=>t.posto).filter(Boolean))].sort((t,a)=>t.localeCompare(a,"pt-BR")).map(t=>{const a=getAddressForUnit(t)||"";return{kind:"unit",title:t,subtitle:"",unit:t,address:a,mapQuery:a||t,portalQuery:t}})}function buildAddressEntriesForCollaborator(){const e=[],t=new Set;return[].concat(currentData||[]).concat(allCollaboratorsCache.items||[]).forEach(o=>{if(!o)return;const n=String(o.re||"").trim(),s=normalizeReKey(n),i=String(o.nome||"").trim(),r=String(o.posto||"").trim(),l=s||`${normalizeUnitKey(i)}:${normalizeUnitKey(r)}`;if(!l||t.has(l))return;t.add(l);const c=getAddressForCollaborator(o)||"",d=i?`${i}${n?` (${n})`:""}`:n?`RE ${n}`:"Colaborador";e.push({kind:"collab",title:d,subtitle:r?`Unidade: ${r}`:"",unit:r,collabRe:n,collabName:i,address:c,mapQuery:c||r||i||n,portalQuery:c||`${i} ${r}`.trim()||n})}),e.sort((o,n)=>o.title.localeCompare(n.title,"pt-BR"))}function buildAddressEntries(){return addressModalState.mode==="collab"?buildAddressEntriesForCollaborator():buildAddressEntriesForUnit()}function renderAddressList(e=""){const t=document.getElementById("address-list");if(!t)return;const a=buildAddressEntries(),n=normalizeUnitKey(e||"").trim();let s=n?a.filter(i=>{const r=[i.title,i.subtitle,i.unit,i.address,i.collabRe,i.collabName].join(" ");return normalizeUnitKey(r).includes(n)}):a;if(addressModalState.mode==="collab"&&!n&&addressModalState.collabRe){const i=a.filter(r=>matchesRe(r.collabRe,addressModalState.collabRe));i.length&&(s=i)}if(!s.length){t.innerHTML=`<p class="empty-state">${addressModalState.mode==="collab"?"Nenhum colaborador encontrado.":"Nenhuma unidade encontrada."}</p>`;return}t.innerHTML=s.map(i=>{const r=i.address||"",l=r?escapeHtml(r):"Endere\xE7o n\xE3o cadastrado",c=JSON.stringify(r),d=i.mapQuery||"",p=JSON.stringify(d),g=i.portalQuery||"",m=JSON.stringify(g),f=!!d,u=!!g,b=!!r,v=i.subtitle?`<div class="address-subtitle">${escapeHtml(i.subtitle)}</div>`:"";return`
            <div class="address-card">
                <div class="address-header">
                    <div>
                        <div class="address-title">${escapeHtml(i.title||"")}</div>
                        ${v}
                    </div>
                    ${b?'<span class="address-badge">OK</span>':'<span class="address-badge missing">Sem endere\xE7o</span>'}
                </div>
                <div class="address-text">${l}</div>
                <div class="address-actions menu-actions-row">
                    <button class="btn btn-secondary btn-small" onclick="copyAddressText(${c})" ${b?"":"disabled"}>Copiar</button>
                    <button class="btn btn-secondary btn-small" onclick="openAddressInMaps(${p}, '')" ${f?"":"disabled"}>Ver no mapa</button>
                    <button class="btn btn-secondary btn-small" onclick="openAddressPortal(${m})" ${u?"":"disabled"}>Portal</button>
                </div>
            </div>
        `}).join("")}function copyAddressText(e){if(e){if(navigator.clipboard?.writeText){navigator.clipboard.writeText(e).then(()=>{showToast("Endere\xE7o copiado.","success")}).catch(()=>fallbackCopy(e));return}fallbackCopy(e)}}function openAddressInMaps(e,t){const a=e||t;if(!a)return;const o=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(a)}`;window.open(o,"_blank")}function buildMapsRouteUrl(e,t){return!e||!t?"":`https://www.google.com/maps/dir/?${new URLSearchParams({api:"1",origin:e,destination:t}).toString()}`}function openMapsRoute(e,t){const a=buildMapsRouteUrl(e,t);if(a){window.open(a,"_blank");return}const o=t||e;if(!o)return;const n=`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o)}`;window.open(n,"_blank")}async function openSubstituteRouteModal(e,t,a){const o=document.getElementById("route-modal");if(!o)return;const n=document.getElementById("route-meta"),s=currentData.find(m=>matchesRe(m.re,e))||(allCollaboratorsCache.items||[]).find(m=>matchesRe(m.re,e)),i=currentData.find(m=>matchesRe(m.re,t))||(allCollaboratorsCache.items||[]).find(m=>matchesRe(m.re,t))||getSubstituteTarget();if(!s||!i){showToast("N\xE3o foi poss\xEDvel localizar os colaboradores para a rota.","error");return}o.classList.remove("hidden"),n&&(n.textContent="Calculando rota...");const r=++routeMapSeq;await loadUnitAddressDb(),await loadCollaboratorAddressDb();const l=a==="rota"?"endereco":a==="off"?"posto":a,c=getMapsLocationForCollab(s,l)||s.posto||"",d=getMapsLocationForCollab(i,l)||i.posto||"";routeModalState={origin:c,destination:d};const p=await getCoordsForAddress(c),g=await getCoordsForAddress(d);if(r===routeMapSeq){if(!p||!g){n&&(n.textContent="Endere\xE7o indispon\xEDvel para calcular rota. Tente abrir no Google Maps.");return}await renderRouteMap(p,g,{originLabel:`${s.nome} (RE ${s.re})`,destLabel:`${i.nome} (RE ${i.re})`},r)}}function closeRouteModal(){document.getElementById("route-modal")?.classList.add("hidden"),syncModalOpenState()}function openRouteInMaps(){const e=routeModalState?.origin||"",t=routeModalState?.destination||"";!e&&!t||openMapsRoute(e,t)}async function renderRouteMap(e,t,a={},o=0){const n=document.getElementById("route-meta");if(!window.L){n&&(n.textContent="Leaflet n\xE3o carregou. Use o bot\xE3o Google Maps.");return}const s=document.getElementById("route-map");if(routeMapInstance&&s&&routeMapInstance.getContainer()!==s&&(routeMapInstance.remove(),routeMapInstance=null,routeMapLayer=null,routeMapMarkers=[]),routeMapInstance||(routeMapInstance=L.map("route-map"),L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap"}).addTo(routeMapInstance)),o&&o!==routeMapSeq)return;routeMapLayer&&(routeMapInstance.removeLayer(routeMapLayer),routeMapLayer=null),routeMapMarkers.forEach(b=>routeMapInstance.removeLayer(b)),routeMapMarkers=[];const i=await fetchOsrmRoute(e,t);if(o&&o!==routeMapSeq)return;let r=null,l=null;if(i?.geometry?.coordinates?.length){const b=i.geometry.coordinates.map(([v,E])=>[E,v]);routeMapLayer=L.polyline(b,{color:"#0b4fb3",weight:5,opacity:.9,lineCap:"round",lineJoin:"round"}).addTo(routeMapInstance),r=i.distanceKm,l=i.durationMin}else routeMapLayer=L.polyline([[e.lat,e.lon],[t.lat,t.lon]],{color:"#94a3b8",weight:3,opacity:.85,dashArray:"6,6"}).addTo(routeMapInstance),r=calcDistanceKm(e,t);const c=a.originLabel||"Origem",d=a.destLabel||"Destino",p=L.marker([e.lat,e.lon]).addTo(routeMapInstance).bindPopup(c).bindTooltip(c,{direction:"top",offset:[0,-10]}),g=L.marker([t.lat,t.lon]).addTo(routeMapInstance).bindPopup(d).bindTooltip(d,{direction:"top",offset:[0,-10]});routeMapMarkers.push(p,g),routeMapLayer&&routeMapInstance.fitBounds(routeMapLayer.getBounds().pad(.2)),setTimeout(()=>routeMapInstance.invalidateSize(),0);const m=formatDistanceKm(r),f=formatDurationMin(l),u=m?`Dist\xE2ncia: ${m} km${f?` \u2022 ${f}`:""}`:"Dist\xE2ncia indispon\xEDvel.";n&&(n.textContent=`Origem: ${a.originLabel||""} \u2022 Destino: ${a.destLabel||""} \u2022 ${u}`)}function openAddressPortal(e=""){const t="https://gustauvm.github.io/ENDERECOS-DUNAMIS/",a=String(e||"").trim(),o=a?`${t}?q=${encodeURIComponent(a)}`:t;window.open(o,"_blank")}function openGuideModal(){closeUtilityDrawer(),document.getElementById("guide-modal")?.classList.remove("hidden"),syncModalOpenState()}function closeGuideModal(){document.getElementById("guide-modal")?.classList.add("hidden"),syncModalOpenState()}function openPromptsModal(){closeUtilityDrawer(),document.getElementById("prompts-modal")?.classList.remove("hidden"),syncModalOpenState()}function closePromptsModal(){document.getElementById("prompts-modal")?.classList.add("hidden"),syncModalOpenState()}function renderPromptTemplates(){const e=document.getElementById("prompt-templates");e&&(e.innerHTML=PROMPT_TEMPLATES.map((t,a)=>`
        <div class="prompt-card">
            <div class="prompt-title">${t.title}</div>
            <div class="prompt-text" id="prompt-text-${a}">${t.text}</div>
            <button class="btn btn-secondary btn-small" onclick="copyPrompt(${a})">Copiar</button>
        </div>
    `).join(""))}function copyPrompt(e){const t=PROMPT_TEMPLATES[e]?.text||"";t&&navigator.clipboard.writeText(t).then(()=>{showToast("Prompt copiado.","success")}).catch(()=>{showToast("N\xE3o foi poss\xEDvel copiar.","error")})}function handleSearchTokenSuggest(){const e=document.getElementById("search-input"),t=document.getElementById("search-suggestions");if(!e||!t)return;const a=e.value,o=e.selectionStart??a.length,n=a.slice(0,o),s=n.lastIndexOf("("),i=n.lastIndexOf(")");if(s<0||s<i){t.classList.add("hidden");return}const r=n.slice(s+1).trim().toUpperCase(),l=getUnitSuggestions(r),c=getNameSuggestions(r),d=SEARCH_TOKENS.filter(g=>g.key.startsWith(r)),p=l.length?l:c.length?c:d.map(g=>({value:g.key,label:g.label}));if(!p.length){t.classList.add("hidden");return}t.innerHTML=p.map(g=>`
        <button type="button" class="suggest-item" onclick="applySearchToken('${g.value}')">
            <strong>${g.value}</strong> <span>${g.label||"Unidade"}</span>
        </button>
    `).join(""),t.classList.remove("hidden")}function applySearchToken(e){const t=document.getElementById("search-input"),a=document.getElementById("search-suggestions");if(!t)return;const o=t.value,n=t.selectionStart??o.length,s=o.slice(0,n),i=o.slice(n),r=s.lastIndexOf("(");if(r<0)return;const l=o.slice(0,r+1),c=i.startsWith(")")?i.slice(1):i,d=`${l}${e})${c}`,p=(l+e+")").length;t.value=d,t.setSelectionRange(p,p),a&&a.classList.add("hidden"),t.focus(),realizarBusca()}function getUnitSuggestions(e){const t=(e||"").trim().toUpperCase();return t?[...new Set(currentData.map(o=>o.posto).filter(Boolean))].filter(o=>o.toUpperCase().includes(t)).sort((o,n)=>o.localeCompare(n,"pt-BR")).slice(0,8).map(o=>({value:o,label:"Unidade"})):[]}function getNameSuggestions(e){const t=(e||"").trim().toUpperCase();return!t||t.length<2?[]:[...new Set(currentData.map(o=>o.nome).filter(Boolean))].filter(o=>o.toUpperCase().includes(t)).sort((o,n)=>o.localeCompare(n,"pt-BR")).slice(0,8).map(o=>({value:o,label:"Nome"}))}function hydrateSearchUnits(){const e=document.getElementById("search-unit-list");if(!e)return;const t=[...new Set(currentData.map(a=>a.posto).filter(Boolean))].sort((a,o)=>a.localeCompare(o,"pt-BR"));e.innerHTML=t.map(a=>`<option value="${a}"></option>`).join("")}async function suggestCoverageFromSearch(){const e=document.getElementById("search-unit-target"),t=document.getElementById("search-results");if(!e||!t)return;const a=(e.value||"").trim();if(!a){showToast("Informe a unidade para sugerir cobertura.","error");return}const o=findUnitByName(a);if(!o){showToast("Unidade n\xE3o encontrada na base.","error");return}e.value=o,await renderCoverageSuggestionsByUnit(o,t)}function toggleUnitVisibility(e){hiddenUnits.has(e)?hiddenUnits.delete(e):hiddenUnits.add(e),renderizarUnidades()}function toggleUnitMinimize(e){minimizedUnits.has(e)?minimizedUnits.delete(e):minimizedUnits.add(e),renderizarUnidades()}function renderUnitTable(e){return e.length===0?'<p class="empty-team">Ningu\xE9m neste status.</p>':`
        <div class="unit-table-wrapper">
            <table class="unit-table">
                <thead>
                    <tr>
                        <th>Colaborador</th>
                        <th>RE</th>
                        <th>Escala</th>
                        <th style="width: 80px;">A\xE7\xF5es</th>
                    </tr>
                </thead>
                <tbody>
                    ${e.map(t=>{const a=isHomenageado(t),o=a?`${t.nome} \u2728`:t.nome,n=getReciclagemSummaryForCollab(t.re,t.nome),s=n?`<span class="reciclagem-icon ${n.status}" title="${n.title}">${ICONS.recycle}</span>`:"",i=buildFtDetailsHtml(t.re),r=getCollaboratorRoleLabel(t),l=JSON.stringify(t.re||""),c=JSON.stringify(t.nome||""),d=JSON.stringify(t.telefone||""),p=escapeHtml(l),g=escapeHtml(c),m=escapeHtml(d),f=t.id!=null?t.id:t.re||"",u=JSON.stringify(f),b=escapeHtml(u);return`
                            <tr class="${a?"homenageado-row":""}">
                                <td>
                                    <div class="colab-cell">
                                        <strong class="${a?"homenageado-nome":""}">${o}</strong>
                                        ${s}
                                        ${getPendingAvisosByCollaborator(t.re,currentGroup||"todos")>0?'<span class="colab-flag">Aviso</span>':""}
                                        ${getPendingRemindersByCollaborator(t.re,currentGroup||"todos")>0?'<span class="colab-flag reminder">Lembrete</span>':""}
                                        ${t.rotulo?`
                                            ${t.rotulo.split(",").map(v=>`
                                                <span class="mini-label">
                                                    ${v==="OUTRO"&&t.rotuloDetalhe?t.rotuloDetalhe:v}
                                                </span>
                                            `).join("")}
                                            ${t.rotuloFim?`<span class="mini-date">At\xE9 ${formatDate(t.rotuloFim)}</span>`:""}
                                        `:""}
                                        <div class="unit-colab-meta"><strong>Cargo:</strong> ${escapeHtml(r)}</div>
                                        ${i}
                                        <div class="unit-colab-week">
                                            <button class="btn-mini btn-secondary week-preview-btn" onclick="openFtWeekPreviewModal(${p}, ${g})" title="Ver escala completa do m\xEAs">ESCALA COMPLETA</button>
                                        </div>
                                    </div>
                                </td>
                                <td>${t.re}</td>
                                <td>
                                    ${t.tipoEscala?`<div style="font-weight:bold; font-size:0.8rem;">${t.tipoEscala}</div>`:""}
                                    <div>${t.escala}</div>
                                    ${getTurnoInfo(t.escala)?`<div style="margin-top: 4px;">${getTurnoInfo(t.escala)}</div>`:""}
                                </td>
                                <td style="text-align: center;">
                                    <button class="edit-btn-icon small" onclick="openCollabDetailsModal(${b})" title="Detalhes do colaborador">${ICONS.details}</button>
                                    <button class="edit-btn-icon small" onclick="openEditModal(${t.id})">${ICONS.edit}</button>
                                    <button class="edit-btn-icon small ${t.telefone?"whatsapp-icon":"disabled-icon"}" onclick="openPhoneModal(${g}, ${m})" title="${t.telefone?"Contato":"Sem telefone vinculado"}">${ICONS.whatsapp}</button>
                                </td>
                            </tr>
                        `}).join("")}
                </tbody>
            </table>
        </div>
    `}function navigateToUnit(e){switchTab("unidades");const t="unit-"+e.replace(/[^a-zA-Z0-9]/g,"-");setTimeout(()=>{const a=document.getElementById(t);a&&(a.scrollIntoView({behavior:"smooth",block:"center"}),a.classList.add("highlight-unit"),setTimeout(()=>a.classList.remove("highlight-unit"),2e3))},100)}function getTurnoInfo(e){if(!e)return"";const t=parseInt(e.substring(0,2));return isNaN(t)?"":t>=5&&t<18?`<span class="shift-badge day">${ICONS.sun} Diurno</span>`:`<span class="shift-badge night">${ICONS.moon} Noturno</span>`}function formatDate(e){if(!e)return"";const t=e.split("-");return`${t[2]}/${t[1]}`}function getStatusInfo(e){if(e.rotulo){const a=String(e.rotulo).split(",").map(n=>n.trim()).filter(Boolean),o=a.find(n=>n==="F\xC9RIAS"||n==="ATESTADO"||n==="AFASTADO");if(o)return{text:o,color:"#0f766e"};if(a.includes("FT"))return{text:"PLANT\xC3O EXTRA (FT)",color:"#002D72"}}return verificarEscala(e.turma,e.grupo)?{text:"PLANT\xC3O",color:"#dc3545"}:{text:"FOLGA",color:"#28a745"}}function toggleAiSearchButton(){}function isAiSearchEnabled(){return!1}function updateAiSearchButton(){}function extractUnitName(e){const t=[/unidade\s+do\s+(.+)/,/unidade\s+da\s+(.+)/,/unidade\s+de\s+(.+)/,/posto\s+(.+)/];for(const a of t){const o=e.match(a);if(o&&o[1])return o[1].replace(/[(){}[\]]/g," ").replace(/[^a-z0-9\s]/gi," ").replace(/\s+/g," ").trim().toUpperCase()}return null}function extractRe(e){const t=e.match(/re\s*([0-9]{3,6})/i);return t?t[1]:null}function normalizeText(e){return(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()}function escapeHtml(e){return String(e??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;")}function extractNameInParens(e){const a=(e||"").match(/\(([^)]+)\)/);if(!a||!a[1])return null;const o=a[1].replace(/[^a-z0-9\s]/gi," ").replace(/\s+/g," ").trim();return o?o.toUpperCase():null}function extractNameFromQuery(e){const t=(e||"").toLowerCase();if(!t)return null;const a=t.replace(/\bre\b\s*[0-9]{3,6}/gi," ").replace(/\bmatricula\b\s*[0-9]{3,6}/gi," ").replace(/\b(unidade|posto|cobrir|cobertura|falta|faltou|substituir|substituicao|troca|remanejar|remanejamento|plantao|folga|hoje|perto|proximo|mais)\b/gi," ").replace(/[^a-z0-9\s]/gi," ").replace(/\s+/g," ").trim();return a?a.toUpperCase():null}function extractReAdvanced(e){const t=normalizeText(e),a=t.match(/re\s*([0-9]{3,6})/i);if(a)return a[1];const o=t.match(/matricula\s*([0-9]{3,6})/i);if(o)return o[1];const n=t.match(/\b([0-9]{3,6})\b/);return n?n[1]:null}function interpretAiQuery(e){const t=normalizeText((e||"").trim()),a=t.includes("?")||t.startsWith("quem")||t.startsWith("qual")||t.startsWith("listar")||t.startsWith("mostre")||t.startsWith("mostrar")||t.startsWith("preciso")||t.startsWith("precisamos"),o=/(lider|responsavel|chefe)/.test(t),n=/(unidade|posto)/.test(t),s=/(cobrir|cobertura|substituir|substituicao|troca|remanejar|remanejamento|cobertura|falta)/.test(t),i=/(proximidade|perto|prox|proximo|mais perto|mais proximo|distancia)/.test(t),r=/(plantao|em plantao|trabalhando|em serviço|em servico)/.test(t),l=/(folga|disponivel|disponiveis|liberado|livre)/.test(t),c=/(afastado|afastamento|ferias|atestado|licenca)/.test(t),d=/(telefone|whatsapp|contato)/.test(t),p=/(escala|horario|turno)/.test(t),g=/(quantos|total|quantidade)/.test(t),m=extractReAdvanced(e),f=extractNameInParens(e)||extractNameFromQuery(e);return{normalized:t,isQuestion:a,mentionsLeader:o,mentionsUnit:n,mentionsCover:s,mentionsProximity:i,mentionsOnDuty:r,mentionsOff:l,mentionsAbsence:c,mentionsPhone:d,mentionsSchedule:p,mentionsCount:g,targetRe:m,targetName:f}}function normalizeUnitKey(e){return(e||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase().replace(/[^A-Z0-9\\s]/g," ").replace(/\\s+/g," ").trim()}function stripUnitNoise(e){if(!e)return"";const t=new Set(["LTDA","EIRELI","EPP","ME","MEI","SPE","SC","INC","CIA","SOCIEDADE","ANONIMA","ASSOCIACAO","FUNDACAO","HOLDING","SERVICOS","SERVICO","SEGURANCA","BOMBEIROS"]);let a=e.split(" ").filter(Boolean),o=!0;for(;o&&a.length;){o=!1;const n=a[a.length-1];if(t.has(n)){a.pop(),o=!0;continue}if(a.length>=2){const s=`${a[a.length-2]} ${a[a.length-1]}`;(s==="S A"||s==="S C")&&(a.pop(),a.pop(),o=!0)}}return a.join(" ").trim()}function buildUnitKeyVariants(e){const t=normalizeUnitKey(e),a=new Set,o=s=>{s&&a.add(s)};o(t),o(stripUnitNoise(t)),t.startsWith("RB ")&&o(t.replace(/^RB\\s+/,"").trim()),t.startsWith("DUNAMIS ")&&o(t.replace(/^DUNAMIS\\s+/,"").trim()),t.startsWith("HOSPITAL ")&&o(t.replace(/^HOSPITAL\\s+/,"").trim());const n=t.replace(/\\s*-\\s*(SERVICOS|SERVIÇOS|SEGURANCA|SEGURANÇA|BOMBEIROS|SERVICO|SERVIÇO)\\b/g,"").replace(/\\s+SERVICOS\\b/g,"").replace(/\\s+SERVIÇOS\\b/g,"").replace(/\\s+SEGURANCA\\b/g,"").replace(/\\s+SEGURANÇA\\b/g,"").replace(/\\s+BOMBEIROS\\b/g,"").trim();return n&&(o(n),o(stripUnitNoise(n))),Array.from(a).forEach(s=>o(stripUnitNoise(s))),Array.from(a).filter(Boolean)}function mergeUnitAddressEntries(e,t){const a=new Map;return(e||[]).forEach(o=>{const n=normalizeUnitKey(o?.nome);n&&a.set(n,{...o})}),(t||[]).forEach(o=>{const n=normalizeUnitKey(o?.nome);if(n)if(a.has(n)){const s=a.get(n);a.set(n,{...o,...s})}else a.set(n,{...o})}),Array.from(a.values())}function buildUnitAddressNormMap(e){const t={};return(e||[]).forEach(a=>{if(!a?.endereco)return;buildUnitKeyVariants(a.nome).forEach(n=>{n&&!t[n]&&(t[n]=a.endereco)})}),t}async function loadUnitAddressDb(){initializeCoreManagers();let e=[],t="";try{const a=await fetchSupabaseUnits(!1);a.length&&(e=a.map(o=>({nome:String(o?.posto||o?.cliente||o?.unidade_de_negocio||"").trim().toUpperCase(),endereco:o?.endereco_formatado||formatUnitAddress(o)})).filter(Boolean),unitMetadata=a.reduce((o,n)=>{const s=String(n?.posto||"").trim().toUpperCase();return s&&(n?.rotulo||n?.rotulo_detalhe||n?.rotulo_responsavel)&&(o[s]={rotulo:n.rotulo||"",detalhe:n.rotulo_detalhe||"",responsavel:n.rotulo_responsavel||""}),o},{}),t="Supabase")}catch{}try{const a=await fetch("unit_addresses.json",{cache:"no-store"});if(a.ok){const o=await a.json(),n=o?.entries||[];e.length?n.length&&(e=mergeUnitAddressEntries(e,n)):(e=n,t=o?.source||"unit_addresses.json")}}catch{}unitAddressDb={source:t,entries:e,address_map_norm:buildUnitAddressNormMap(e)};try{unitGeoCache=JSON.parse(localStorage.getItem("unitGeoCache")||"{}")||{}}catch{unitGeoCache={}}try{const a=await fetch("unit_geo_cache.json",{cache:"no-store"});a.ok&&(unitGeoCache={...await a.json(),...unitGeoCache})}catch{}AppCacheManager.clear("unit-geo"),Object.entries(unitGeoCache||{}).forEach(([a,o])=>{!a||!o||AppCacheManager.set("unit-geo",a,o)})}function getAddressForUnit(e){const t=unitAddressDb?.address_map_norm||{},a=buildUnitKeyVariants(e);for(const s of a)if(t[s])return t[s];const o=unitAddressDb?.entries||[],n=a.length?a:[normalizeUnitKey(e)];for(const s of n){if(s.length<5)continue;const i=o.find(c=>normalizeUnitKey(c.nome)===s&&c.endereco);if(i)return i.endereco;const r=o.find(c=>normalizeUnitKey(c.nome).includes(s)&&c.endereco);if(r)return r.endereco;const l=o.find(c=>{const d=normalizeUnitKey(c.nome);return d.length>=5&&s.includes(d)&&c.endereco});if(l)return l.endereco}return null}async function getCoordsForAddress(e){if(!e)return null;const t=getCachedUnitGeo(e);if(t)return t;try{const a=`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(e)}`,o=await fetch(a,{headers:{"Accept-Language":"pt-BR"}});if(!o.ok)return null;const n=await o.json();if(!n||!n.length)return null;const s={lat:parseFloat(n[0].lat),lon:parseFloat(n[0].lon)};return!Number.isFinite(s.lat)||!Number.isFinite(s.lon)?null:(setCachedUnitGeo(e,s),localStorage.setItem("unitGeoCache",JSON.stringify(unitGeoCache)),scheduleLocalSync("unit-geo-cache",{silent:!0}),s)}catch{return null}}function getAddressOrNameForUnit(e){return e?getAddressForUnit(e)||e:null}async function getCoordsForUnit(e){const t=getAddressOrNameForUnit(e);return await getCoordsForAddress(t)}function calcDistanceKm(e,t){const a=p=>p*Math.PI/180,n=a(t.lat-e.lat),s=a(t.lon-e.lon),i=a(e.lat),r=a(t.lat),l=Math.sin(n/2),c=Math.sin(s/2),d=l*l+Math.cos(i)*Math.cos(r)*c*c;return 2*6371*Math.asin(Math.min(1,Math.sqrt(d)))}function formatDistanceKm(e){if(e==null||!Number.isFinite(e))return null;const t=Math.round(e*10)/10;return String(t).replace(".",",")}function formatDurationMin(e){if(e==null||!Number.isFinite(e))return"";const t=Math.round(e);if(t<60)return`${t} min`;const a=Math.floor(t/60),o=t%60;return o?`${a}h ${o}m`:`${a}h`}function getOsrmConfig(){const e=CONFIG?.routing||{},t=String(e.osrmBaseUrl||"https://router.project-osrm.org").replace(/\/+$/,""),a=e.osrmProfile||"driving",o=e.osrmEnabled!==!1;let n=parseInt(e.osrmMaxCandidates,10);return Number.isFinite(n)||(n=12),n=Math.min(Math.max(n,3),30),{base:t,profile:a,enabled:o,maxCandidates:n}}function buildOsrmKey(e,t){const a=`${e.lat.toFixed(5)},${e.lon.toFixed(5)}`,o=`${t.lat.toFixed(5)},${t.lon.toFixed(5)}`;return`${a}|${o}`}async function fetchOsrmTable(e,t){const a=getOsrmConfig();if(!a.enabled||!e||!t?.length)return null;const o=[e].concat(t),n=o.map(i=>`${i.lat.toFixed(5)},${i.lon.toFixed(5)}`).join("|"),s=getCachedOsrmTable(n);if(s)return s;try{const i=o.map(f=>`${f.lon},${f.lat}`).join(";"),r=t.map((f,u)=>u+1).join(";"),l=`${a.base}/table/v1/${a.profile}/${i}?sources=0&destinations=${r}&annotations=distance,duration`,c=await fetch(l);if(!c.ok)return null;const d=await c.json(),p=d?.distances?.[0]||[],g=d?.durations?.[0]||[],m={distances:p,durations:g};return setCachedOsrmTable(n,m),m}catch{return null}}async function fetchOsrmRoute(e,t){const a=getOsrmConfig();if(!a.enabled||!e||!t)return null;const o=buildOsrmKey(e,t),n=getCachedOsrmRoute(o);if(n)return n;try{const s=`${a.base}/route/v1/${a.profile}/${e.lon},${e.lat};${t.lon},${t.lat}?overview=full&geometries=geojson`,i=await fetch(s);if(!i.ok)return null;const l=(await i.json())?.routes?.[0];if(!l)return null;const c={distanceKm:l.distance/1e3,durationMin:l.duration/60,geometry:l.geometry};return setCachedOsrmRoute(o,c),c}catch{return null}}async function handleCoverageProximityAsync(e,t){t.innerHTML='<p class="empty-state">Calculando proximidade por endere\xE7os...</p>';const a=getAddressOrNameForUnit(e.posto),o=await getCoordsForAddress(a);let n=currentData.filter(r=>r.re!==e.re&&isDisponivelParaCobrir(r));if(!n.length){t.innerHTML=`<div class="result-card"><h4>Resposta IA</h4><p>N\xE3o encontrei colaboradores de folga no momento para cobrir o RE ${e.re}.</p></div>`;return}if(!a||!o){const r=n.filter(c=>c.posto===e.posto).slice(0,6),l=r.length?r:n.slice(0,6);t.innerHTML=`
            <div class="result-card">
                <h4>Sugest\xF5es de cobertura</h4>
                <div class="meta">Colaborador alvo (RE ${e.re}): ${e.nome}. Endere\xE7o da unidade (${e.posto}) indispon\xEDvel; usando disponibilidade e unidade.</div>
            </div>
            ${l.map(c=>renderAiResultCard(c,e)).join("")}
        `;return}const s=[];for(const r of n){const l=getAddressOrNameForUnit(r.posto),c=await getCoordsForAddress(l);if(!c)continue;const d=calcDistanceKm(o,c);s.push({...r,_distanceKm:d})}if(!s.length){t.innerHTML=`
            <div class="result-card">
                <h4>Sugest\xF5es de cobertura</h4>
                <div class="meta">Colaborador alvo (RE ${e.re}): ${e.nome}. N\xE3o consegui geocodificar endere\xE7os suficientes; mostrando colaboradores de folga.</div>
            </div>
            ${n.slice(0,6).map(r=>renderAiResultCard(r,e)).join("")}
        `;return}s.sort((r,l)=>r._distanceKm-l._distanceKm);const i=s.slice(0,6).map(r=>(r._distanceKm=Math.round(r._distanceKm*10)/10,r));t.innerHTML=`
        <div class="result-card">
            <h4>Sugest\xF5es de cobertura por proximidade</h4>
            <div class="meta">Colaborador alvo (RE ${e.re}): ${e.nome} \u2014 Unidade: ${e.posto}. Dist\xE2ncia estimada entre postos.</div>
        </div>
        ${i.map(r=>renderAiResultCard(r,e)).join("")}
    `}function buildUnitCoverageReason(e,t){const a=getStatusInfo(e).text,o=[];a.includes("FOLGA")&&o.push("est\xE1 de folga hoje"),e.posto&&t&&normalizeUnitKey(e.posto)===normalizeUnitKey(t)&&o.push(`atua na mesma unidade (${e.posto})`);const n=formatDistanceKm(e._distanceKm);return n&&t&&o.push(`est\xE1 a ~${n} km da unidade ${t}`),o.length||o.push("disponibilidade verificada pela escala e status atual"),`Motivo: ${o.join(" e ")}.`}async function buildCoverageSuggestionsByUnit(e,t=6){const a=normalizeUnitKey(e),o=currentData.filter(g=>isDisponivelParaCobrir(g));if(!o.length)return{list:[],note:"none"};const n=o.filter(g=>normalizeUnitKey(g.posto)===a),s=o.filter(g=>normalizeUnitKey(g.posto)!==a),i=await getCoordsForUnit(e);if(!i)return{list:n.concat(s).slice(0,t),note:"no_target_coords"};const r={},l=new Set;for(const g of s){const m=g.posto,f=normalizeUnitKey(m);if(!f||l.has(f))continue;l.add(f);const u=await getCoordsForUnit(m);u&&(r[f]=calcDistanceKm(i,u))}const c=[],d=[];s.forEach(g=>{const m=normalizeUnitKey(g.posto),f=r[m];typeof f=="number"?c.push({...g,_distanceKm:f}):d.push(g)}),c.sort((g,m)=>g._distanceKm-m._distanceKm);const p=n.concat(c,d).slice(0,t);return p.forEach(g=>{g._distanceKm!=null&&(g._distanceKm=Math.round(g._distanceKm*10)/10)}),{list:p,note:c.length?"ok":"no_candidates_distance"}}async function renderCoverageSuggestionsByUnit(e,t,a={}){if(!t)return;t.innerHTML='<p class="empty-state">Calculando proximidade por endere\xE7os...</p>';const{list:o,note:n}=await buildCoverageSuggestionsByUnit(e,a.limit||6);if(!o.length){t.innerHTML='<div class="result-card"><h4>Sugest\xF5es de cobertura</h4><p>N\xE3o encontrei colaboradores de folga no momento.</p></div>';return}let s=`Unidade alvo: ${e}. Priorizando quem j\xE1 atua no posto.`;n==="no_target_coords"&&(s=`Unidade alvo: ${e}. Endere\xE7o indispon\xEDvel; usando apenas disponibilidade e unidade.`),n==="no_candidates_distance"&&(s=`Unidade alvo: ${e}. N\xE3o consegui geocodificar endere\xE7os suficientes; mostrando dispon\xEDveis.`);const i={posto:e,re:"",nome:""},r=a.actionBuilder,l=o.map(c=>{const d=r?r(c):"";return renderAiResultCard(c,i,{reasonOverride:buildUnitCoverageReason(c,e),actionHtml:d})}).join("");t.innerHTML=`
        <div class="result-card">
            <h4>Sugest\xF5es de cobertura por proximidade</h4>
            <div class="meta">${s}</div>
        </div>
        ${l}
    `}function findPersonByName(e){const t=normalizeText(e).replace(/[^a-z0-9\s]/g," ").trim();if(!t)return null;const a=t.split(/\s+/).filter(Boolean);return a.length&&currentData.find(o=>{const n=normalizeText(o.nome);return a.every(s=>n.includes(s))})||null}function getStatusInfoForFilter(e){return e&&e._statusInfoSnapshot?e._statusInfoSnapshot:getStatusInfo(e)}function applyAiFilters(e,t,a){let o=e;return t==="plantao"?o=o.filter(n=>{const s=getStatusInfoForFilter(n).text;return s.includes("PLANT\xC3O")||s.includes("FT")}):t==="folga"?o=o.filter(n=>getStatusInfoForFilter(n).text.includes("FOLGA")):t==="ft"?o=o.filter(n=>getStatusInfoForFilter(n).text.includes("FT")):t==="afastado"?o=o.filter(n=>!!n.rotulo):t==="favorites"&&(o=o.filter(n=>isCollaboratorFavorite(n.re))),a&&(o=o.filter(n=>!n.rotulo)),o}function isDisponivelParaCobrir(e){return!!getStatusInfo(e).text.includes("FOLGA")}function buildAiReason(e,t){const a=getStatusInfo(e).text,o=[];a.includes("FOLGA")&&o.push("est\xE1 de folga hoje"),e.posto===t.posto&&o.push(`atua na mesma unidade (${e.posto})`);const n=formatDistanceKm(e._distanceKm);return n&&o.push(`est\xE1 a ~${n} km da unidade do colaborador RE ${t.re}`),o.length||o.push("disponibilidade verificada pela escala e status atual"),`Motivo: ${o.join(" e ")}.`}function isHomenageado(e){return String(e?.re||"").replace(/\\D/g,"")==="8204341"?!0:String(e?.nome||e?.name||"").toUpperCase().includes("ADRIANO ANTUONO")}function isFtActive(e){return e&&e.status==="launched"}function isFtToday(e){return e&&e.date===getTodayKey()}function normalizeDateRange(e,t){const a=normalizeFtDateKey(e)||"",o=normalizeFtDateKey(t)||"";return a&&o&&a>o?{from:o,to:a}:{from:a,to:o}}function hasDateRangeFilter(e={}){const t=normalizeDateRange(e.from,e.to);return!!(t.from||t.to)}function isDateInsideRange(e,t,a){return!(!e||t&&e<t||a&&e>a)}function getFtStatusRank(e){return e==="launched"?3:e==="submitted"?2:e==="pending"?1:0}function getFtPreviewCode(e){return e==="launched"?"V":e==="submitted"?"E":e==="pending"?"D":"-"}function getFtPreviewLabel(e){return e==="launched"?"Lan\xE7ada":e==="submitted"?"Confirmada":e==="pending"?"Pendente":"Sem FT"}function getDateKeyWithOffset(e,t){const a=normalizeFtDateKey(e)||getTodayKey(),o=new Date(`${a}T00:00:00`);return Number.isNaN(o.getTime())?a:(o.setDate(o.getDate()+t),toDateInputValue(o))}function getWeekStartMonday(e=""){const t=normalizeFtDateKey(e)||getTodayKey(),a=new Date(`${t}T00:00:00`);if(Number.isNaN(a.getTime()))return getTodayKey();const o=(a.getDay()+6)%7;return a.setDate(a.getDate()-o),toDateInputValue(a)}function getWeekdayShortPt(e){return["SEG","TER","QUA","QUI","SEX","SAB","DOM"][e]||""}function getWeekdayShortPtByDate(e=""){const t=normalizeFtDateKey(e);if(!t)return"";const a=new Date(`${t}T00:00:00`);return Number.isNaN(a.getTime())?"":["DOM","SEG","TER","QUA","QUI","SEX","SAB"][a.getDay()]||""}function getWeekdayLongPtByDate(e=""){const t=normalizeFtDateKey(e);if(!t)return"";const a=new Date(`${t}T00:00:00`);return Number.isNaN(a.getTime())?"":["domingo","segunda","ter\xE7a","quarta","quinta","sexta","s\xE1bado"][a.getDay()]||""}function getMonthRangeByDateKey(e=""){const t=normalizeFtDateKey(e)||getTodayKey(),a=new Date(`${t}T00:00:00`);if(Number.isNaN(a.getTime())){const i=new Date,r=new Date(i.getFullYear(),i.getMonth(),1),l=new Date(i.getFullYear(),i.getMonth()+1,0);return{start:toDateInputValue(r),end:toDateInputValue(l),monthLabel:i.toLocaleDateString("pt-BR",{month:"long",year:"numeric"})}}const o=new Date(a.getFullYear(),a.getMonth(),1),n=new Date(a.getFullYear(),a.getMonth()+1,0),s=a.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});return{start:toDateInputValue(o),end:toDateInputValue(n),monthLabel:s}}function resolveFtPreviewFromItems(e){if(!e||!e.length)return{status:"",code:"-",count:0,label:"Sem FT"};let t="",a=-1;return e.forEach(o=>{const n=getFtStatusRank(o?.status);n>a&&(a=n,t=o?.status||"")}),{status:t,code:getFtPreviewCode(t),count:e.length,label:getFtPreviewLabel(t)}}function getFtItemsForReInRange(e,t,a){return e?getFtOperationalItems(ftLaunches).filter(o=>{const n=normalizeFtDateKey(o?.date);return isDateInsideRange(n,t,a)?matchesRe(o?.collabRe,e)||matchesRe(o?.coveringRe,e):!1}):[]}function getFtItemsForUnitInRange(e,t,a,o=""){const n=normalizeUnitKey(e);return n?getFtOperationalItems(ftLaunches).filter(s=>{const i=normalizeFtDateKey(s?.date);if(!isDateInsideRange(i,t,a)||o&&o!=="all"&&s?.group&&s.group!==o)return!1;const r=normalizeUnitKey(s?.unitTarget||s?.unitCurrent||"");return r&&r===n}):[]}function resolveCollaboratorByRe(e){return currentData.find(t=>matchesRe(t.re,e))||(allCollaboratorsCache.items||[]).find(t=>matchesRe(t.re,e))||null}function verificarEscalaPorData(e,t,a){const o=normalizeFtDateKey(t);if(!o)return!1;const n=new Date(`${o}T00:00:00`);if(Number.isNaN(n.getTime()))return!1;const i=n.getDate()%2!==0;let r=null;return e==1&&(r=i),e==2&&(r=!i),r===null?!1:(isGroupInvertido(a)&&(r=!r),r)}function getDutyForecastForDate(e,t){if(!e)return{code:"-",label:"Sem informa\xE7\xE3o",className:"unknown"};const a=normalizeFtDateKey(t);if(!a)return{code:"-",label:"Sem informa\xE7\xE3o",className:"unknown"};const o=String(e.rotulo||"").split(",").map(s=>s.trim()).filter(Boolean);if(o.length){const s=normalizeFtDateKey(e.rotuloInicio),i=normalizeFtDateKey(e.rotuloFim);if(s&&i&&isDateInsideRange(a,s,i))return o.includes("FT")?{code:"P",label:"Plant\xE3o extra (FT)",className:"plantao"}:{code:"F",label:"Indispon\xEDvel no per\xEDodo",className:"folga"}}return verificarEscalaPorData(e.turma,a,e.grupo)?{code:"P",label:"Plant\xE3o previsto",className:"plantao"}:{code:"F",label:"Folga prevista",className:"folga"}}function buildFtWeekPreviewHtmlForRe(e,t={}){const a=normalizeFtDateKey(t.startDate)||getTodayKey(),o=7,n=resolveCollaboratorByRe(e),s=[];for(let i=0;i<o;i++){const r=getDateKeyWithOffset(a,i),l=new Date(`${r}T00:00:00`),c=getWeekdayShortPtByDate(r),d=Number.isNaN(l.getTime())?"--":String(l.getDate()).padStart(2,"0"),p=getDutyForecastForDate(n,r),g=getFtItemsForReInRange(e,r,r),m=resolveFtPreviewFromItems(g),f=m.code==="V"?"v":m.code==="E"?"e":m.code==="D"?"d":"none",u=`${formatFtDate(r)} \u2022 ${p.label}: ${m.count?`${m.count} FT (${m.label})`:"Sem FT"}`;s.push(`
            <span class="ft-week-chip ${f}" title="${u}">
                <span class="ft-week-day">${c} ${d}</span>
                <span class="ft-week-duty ${p.className}">${p.code}</span>
                ${m.count?`<span class="ft-week-ft ${f}">FT${m.count>1?` ${m.count}`:""}</span>`:""}
            </span>
        `)}return`
        <div class="ft-week-preview">
            <div class="ft-week-track">${s.join("")}</div>
        </div>
    `}function buildFtWeekPreviewHtmlForUnit(e,t="",a={}){const o=normalizeFtDateKey(a.startDate)||getTodayKey(),n=7,s=[],i=escapeHtml(JSON.stringify(e||"")),r=escapeHtml(JSON.stringify(t||""));for(let l=0;l<n;l++){const c=getDateKeyWithOffset(o,l),d=new Date(`${c}T00:00:00`),p=getWeekdayLongPtByDate(c),g=Number.isNaN(d.getTime())?"--":String(d.getDate()).padStart(2,"0"),m=getFtItemsForUnitInRange(e,c,c,t),f=resolveFtPreviewFromItems(m),u=f.code==="V"?"v":f.code==="E"?"e":f.code==="D"?"d":"none",b=`${formatFtDate(c)}: ${f.count?`${f.count} FT (${f.label})`:"Sem FT"}`;s.push(`
            <button type="button" class="ft-week-chip ${u} ${f.count?"has-ft":""}" title="${b}" onclick="openFtUnitDayDetailsModal(${i}, '${c}', ${r})">
                <span class="ft-week-day">${p} ${g}</span>
                ${f.count?`<span class="ft-week-ft ${u}">FT${f.count>1?` ${f.count}`:""}</span>`:""}
            </button>
        `)}return`
        <div class="ft-week-preview unit">
            <div class="ft-week-track">${s.join("")}</div>
        </div>
    `}function getFtCounterpartLabelForRe(e,t){return matchesRe(e?.collabRe,t)?e?.coveringName||(e?.coveringOther&&e.coveringOther!=="N\xE3o se aplica"?e.coveringOther:"")||(e?.coveringRe?`RE ${e.coveringRe}`:"N/I"):e?.collabName||(e?.collabRe?`RE ${e.collabRe}`:"N/I")}function buildFtMonthCalendarHtmlForRe(e,t={}){const a=normalizeFtDateKey(t.monthKey)||getTodayKey(),o=normalizeFtDateKey(t.selectedDate)||getTodayKey(),n=getMonthRangeByDateKey(a),s=resolveCollaboratorByRe(e),i=[];let r=n.start;for(;r<=n.end;){const l=new Date(`${r}T00:00:00`),c=Number.isNaN(l.getTime())?"--":String(l.getDate()).padStart(2,"0"),d=getWeekdayLongPtByDate(r),p=getDutyForecastForDate(s,r),g=getFtItemsForReInRange(e,r,r),m=resolveFtPreviewFromItems(g),f=m.code==="V"?"v":m.code==="E"?"e":m.code==="D"?"d":"none",u=r===getTodayKey(),b=r===o,v=`${formatFtDate(r)} \u2022 ${p.label}${m.count?` \u2022 ${m.count} FT (${m.label})`:" \u2022 Sem FT"}`;i.push(`
            <button type="button" data-day="${r}" class="ft-month-day ${m.count?"has-ft":""} ${u?"today":""} ${b?"active":""}" title="${v}" onclick="openFtMonthDayDetails('${r}')">
                <span class="ft-month-weekday">${d}</span>
                <span class="ft-month-date">${c}</span>
                <span class="ft-month-duty ${p.className}">${p.code}</span>
                ${m.count?`<span class="ft-month-ft ${f}">FT ${m.count}</span>`:'<span class="ft-month-ft none">sem FT</span>'}
            </button>
        `),r=getDateKeyWithOffset(r,1)}return`
        <div class="ft-month-toolbar">
            <div class="ft-month-title">${n.monthLabel}</div>
            <div class="ft-month-subtitle">Planejamento completo do m\xEAs</div>
        </div>
        <div class="ft-month-grid">${i.join("")}</div>
        <div id="ft-week-preview-day-details" class="ft-month-day-details"></div>
    `}function buildFtDayDetailsHtmlForRe(e,t){const a=normalizeFtDateKey(t)||getTodayKey(),o=resolveCollaboratorByRe(e),n=getDutyForecastForDate(o,a),s=getWeekdayLongPtByDate(a),i=getFtItemsForReInRange(e,a,a).slice().sort((l,c)=>getFtStatusRank(c?.status)-getFtStatusRank(l?.status)),r=i.length?i.map(l=>{const c=getFtStatusLabel(l),d=matchesRe(l?.collabRe,e),p=getFtCounterpartLabelForRe(l,e),g=d?`Cobrindo ${p}`:`Coberto por ${p}`,m=getFtReasonLabel(l?.reason,l?.reasonOther)||l?.reasonRaw||"N/I",f=getFtUnitLabel(l),u=l?.shift||"N/I",b=l?.ftTime||"N/I";return`
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${l?.status||"pending"}">${c}</span>
                        <strong>${g}</strong>
                    </div>
                    <div class="ft-day-item-meta">Unidade: ${f} \u2022 Turno: ${u} \u2022 Hor\xE1rio: ${b}</div>
                    <div class="ft-day-item-meta">Motivo: ${m}</div>
                </div>
            `}).join(""):'<p class="empty-state">Sem FT para este colaborador neste dia.</p>';return`
        <div class="ft-day-header">
            <div>
                <strong>${s} \u2022 ${formatFtDate(a)}</strong>
                <div class="ft-day-header-sub">Escala prevista: ${n.label}</div>
            </div>
            <span class="ft-month-duty ${n.className}">${n.code}</span>
        </div>
        <div class="ft-day-list">${r}</div>
    `}function buildFtUnitDayDetailsHtml(e,t,a=""){const o=normalizeFtDateKey(t)||getTodayKey(),n=getFtItemsForUnitInRange(e,o,o,a).slice().sort((r,l)=>getFtStatusRank(l?.status)-getFtStatusRank(r?.status)),s=getWeekdayLongPtByDate(o),i=n.length?n.map(r=>{const l=r?.collabName||(r?.collabRe?`RE ${r.collabRe}`:"N/I"),c=r?.coveringName||(r?.coveringOther&&r.coveringOther!=="N\xE3o se aplica"?r.coveringOther:"")||(r?.coveringRe?`RE ${r.coveringRe}`:""),d=c?`${l} cobrindo ${c}`:`${l}`,p=getFtReasonLabel(r?.reason,r?.reasonOther)||r?.reasonRaw||"N/I";return`
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${r?.status||"pending"}">${getFtStatusLabel(r)}</span>
                        <strong>${d}</strong>
                    </div>
                    <div class="ft-day-item-meta">Turno: ${r?.shift||"N/I"} \u2022 Hor\xE1rio: ${r?.ftTime||"N/I"}</div>
                    <div class="ft-day-item-meta">Motivo: ${p}</div>
                </div>
            `}).join(""):'<p class="empty-state">Sem FT registrada para esta unidade neste dia.</p>';return`
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(e||"Unidade")} \u2022 ${s} \u2022 ${formatFtDate(o)}</strong>
                <div class="ft-day-header-sub">Detalhamento completo das coberturas do dia</div>
            </div>
            <span class="ft-month-ft ${n.length?"v":"none"}">${n.length?`FT ${n.length}`:"sem FT"}</span>
        </div>
        <div class="ft-day-list">${i}</div>
    `}function getCollaboratorAddressLabel(e){return getAddressForCollaborator(e)||"Endere\xE7o n\xE3o cadastrado"}function getCollaboratorRoleLabel(e){return(e?.cargo||"").trim()||"Cargo n\xE3o informado"}function matchesFtDateFilterForCollaborator(e,t={}){const a=normalizeDateRange(t.from,t.to);return hasDateRangeFilter(a)?getFtItemsForReInRange(e,a.from,a.to).length>0:!0}function refreshFtLabelsForToday(){const e=getTodayKey(),t=getFtOperationalItems(ftLaunches),a=new Set(t.filter(n=>isFtActive(n)&&n.date===e).map(n=>normalizeFtRe(n.collabRe)).filter(Boolean));let o=!1;Object.keys(collaboratorEdits).forEach(n=>{const s=collaboratorEdits[n];if(!s||s.rotulo!=="FT")return;const i=normalizeFtRe(s.re||n);a.has(i)||(delete s.rotulo,delete s.rotuloInicio,delete s.rotuloFim,delete s.rotuloDetalhe,collaboratorEdits[n]=s,o=!0)}),currentData.forEach(n=>{if(n.rotulo!=="FT")return;const s=normalizeFtRe(n.re);a.has(s)||(delete n.rotulo,delete n.rotuloInicio,delete n.rotuloFim,delete n.rotuloDetalhe,o=!0)}),o&&saveLocalState(),t.filter(n=>isFtActive(n)&&n.date===e).forEach(n=>applyFtToCollaborator(n))}function getFtRelationsForRe(e,t={}){if(!e)return[];const a=t.onlyToday!==!1,o=getTodayKey();return getFtOperationalItems(ftLaunches).filter(s=>!isFtActive(s)||a&&(!s.date||s.date!==o)?!1:matchesRe(s.collabRe,e)||matchesRe(s.coveringRe,e)).map(s=>{const i=matchesRe(s.collabRe,e),r=s.coveringName||(s.coveringOther&&s.coveringOther!=="N\xE3o se aplica"?s.coveringOther:"")||(s.coveringRe?`RE ${s.coveringRe}`:""),l=s.collabName||(s.collabRe?`RE ${s.collabRe}`:"");return{type:i?"covering":"covered",label:(i?r:l)||"N/I",unit:s.unitTarget||s.unitCurrent||"",item:s}})}function getFtRelationInfo(e){const t=getFtRelationsForRe(e);return t.length?t[0]:null}function buildFtDetailsHtml(e){const t=getFtRelationsForRe(e);return t.length?t.map(a=>{const o=a.item||{},n=o.unitTarget||o.unitCurrent||"N/I",s=o.date?formatFtDate(o.date):"N/I",i=o.shift||"N/I",r=o.ftTime?` \u2022 ${o.ftTime}`:"",l=getFtReasonLabel(o.reason,o.reasonOther)||o.reasonRaw||"N/I",c=o.reasonDetail?`<span class="ft-detail-note">${o.reasonDetail}</span>`:"",d=a.type==="covering"?`Cobrindo ${a.label}`:`Coberto por ${a.label}`;return`
            <div class="ft-detail ${a.type}">
                <strong>FT HOJE:</strong> ${d} \u2022 Unidade: ${n} \u2022 Data: ${s} \u2022 Turno: ${i}${r} \u2022 Motivo: ${l}
                ${c}
            </div>
        `}).join(""):""}function renderAiResultCard(e,t,a={}){const o=a.statusInfoOverride||getStatusInfo(e),n=getTurnoInfo(e.escala),s=e.rotulo&&e.rotuloFim?`<span class="return-date">Retorno: ${formatDate(e.rotuloFim)}</span>`:"",i=getFtRelationInfo(e.re),r=i?`<div class="ft-link ${i.type}"><strong>FT:</strong> ${i.type==="covering"?"Cobrindo":"Coberto por"} ${i.label}${i.unit?` \u2022 ${i.unit}`:""}</div>`:"",l=buildFtDetailsHtml(e.re),c=buildFtWeekPreviewHtmlForRe(e.re),d=getReciclagemSummaryForCollab(e.re,e.nome),p=d?`<span class="reciclagem-icon ${d.status}" title="${d.title}">${ICONS.recycle}</span>`:"",g=getCollaboratorRoleLabel(e),m=JSON.stringify(e.re||""),f=JSON.stringify(e.nome||""),u=JSON.stringify(e.telefone||""),b=JSON.stringify(e.posto||""),v=escapeHtml(m),E=escapeHtml(f),k=escapeHtml(u),$=escapeHtml(b),h=e.id!=null?e.id:e.re||"",S=JSON.stringify(h),T=escapeHtml(S),R=escapeHtml(e.posto||"N/I"),D=!!getAddressForCollaborator(e),B=!!(e.re||e.nome||e.posto),x=B?D?"":"map-icon-missing":"disabled-icon",_=B?D?"Ver endere\xE7o do colaborador":"Endere\xE7o n\xE3o cadastrado":"Colaborador indispon\xEDvel",M=SiteAuth.mode==="edit"&&e?.id!=null,P=e?.id!=null?e.id:-1;let y="";e.rotulo&&(y=e.rotulo.split(",").map(q=>{let W=q;return q==="OUTRO"&&e.rotuloDetalhe&&(W=e.rotuloDetalhe),`<span class="label-badge">${{F\u00C9RIAS:"F\xE9rias",ATESTADO:"Atestado",AFASTADO:"Afastado",FT:"FT",TROCA:"Troca"}[q]||W}</span>`}).join(""));const w=o.text.includes("PLANT\xC3O")||o.text.includes("FT"),N=["F\xC9RIAS","ATESTADO","AFASTADO"].includes(o.text),U=w?"bg-plantao":N?"bg-afastado":"bg-folga",F=a.reasonOverride||buildAiReason(e,t),I=a.reasonNote?`<div class="ai-reason-note">${a.reasonNote}</div>`:"",A=a.actionHtml||"",C=formatDistanceKm(e._distanceKm),O=formatDistanceKm(e._routeDistanceKm),H=formatDurationMin(e._routeDurationMin),G=C?`<span class="distance-badge">\u2248 ${C} km</span>`:"",z=O?`<span class="distance-badge route">Rota ${O} km${H?` \u2022 ${H}`:""}</span>`:"",V=a.headerBadgesHtml||"",j=isHomenageado(e),J=j?`${e.nome} \u2728`:e.nome,K=buildCollabAvatarHtml(e.nome);return`
        <div class="result-card ${U} ${j?"card-homenageado":""}" data-collab-re="${e.re}" style="border-left: 5px solid ${o.color}">
            <div class="card-header">
                <div class="header-left">
                    ${K}
                    <div class="card-name-block">
                        <div class="card-name-row">
                            <a class="colaborador-nome colaborador-link ${j?"homenageado-nome":""}" href="javascript:void(0)" onclick="openCollaboratorPage(${T})">${J}</a>
                            ${p}
                            ${getPendingAvisosByCollaborator(e.re,currentGroup||"todos")>0?'<span class="colab-flag">Aviso</span>':""}
                            ${getPendingRemindersByCollaborator(e.re,currentGroup||"todos")>0?'<span class="colab-flag reminder">Lembrete</span>':""}
                            <span class="status-badge" style="background-color: ${o.color}">${o.text}</span>
                            ${y}
                            ${s}
                        </div>
                        <div class="card-meta-row">
                            <span>RE ${e.re}</span>
                            <span class="meta-sep">\xB7</span>
                            <span class="unit-link" onclick="navigateToUnit(${$})">${R}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${e.grupoLabel||"N/I"}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${escapeHtml(g)}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${e.tipoEscala||""} ${e.escala||"N/I"}</span>
                        </div>
                    </div>
                </div>
                <div class="header-right card-actions-bar">
                    ${V}
                    ${z}
                    ${G}
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${v}, ${E})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon ${x}" onclick="openAddressModalForCollaborator(${v}, ${E}, ${$})" title="${_}" ${B?"":"disabled"}>${ICONS.mapPin}</button>
                    <button class="edit-btn-icon ${e.telefone?"whatsapp-icon":"disabled-icon"}" onclick="openPhoneModal(${E}, ${k})" title="${e.telefone?"Contato":"Sem telefone vinculado"}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon" onclick="openEditModal(${P})" ${M?"":"disabled"} title="Editar">${ICONS.edit}</button>
                </div>
            </div>
            ${r||l||c?`<div class="card-ft-row">${r}${l}${c}</div>`:""}
            <div class="ai-reason">${F}${I}</div>
            ${A?`<div class="result-actions">${A}</div>`:""}
        </div>
    `}function findUnitByName(e){const t=[...new Set(currentData.map(n=>n.posto).filter(Boolean))],a=normalizeUnitKey(e),o=t.find(n=>normalizeUnitKey(n)===a);return o||t.find(n=>normalizeUnitKey(n).includes(a))}function openEditModal(e){if(SiteAuth.mode!=="edit")return;const t=currentData.find(i=>i.id===e);if(!t)return;document.getElementById("edit-id").value=t.id,document.getElementById("edit-nome").value=t.nome,document.getElementById("edit-re").value=t.re,document.getElementById("edit-telefone").value=t.telefone||"",document.getElementById("edit-turma").value=t.turma,document.getElementById("edit-inicio").value=t.rotuloInicio||"",document.getElementById("edit-fim").value=t.rotuloFim||"",document.getElementById("edit-rotulo-desc").value=t.rotuloDetalhe||"",setupCheckboxGroup("edit-rotulo-container",t.rotulo||"",toggleRotuloDesc);const a=[...new Set(currentData.map(i=>i.posto).filter(Boolean))].sort(),o=document.getElementById("edit-posto");o.innerHTML=a.map(i=>`<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join(""),a.includes(t.posto)||(o.innerHTML+=`<option value="${escapeHtml(t.posto)}">${escapeHtml(t.posto)}</option>`),o.value=t.posto;const n=[...new Set(currentData.map(i=>i.escala).filter(Boolean))].sort(),s=document.getElementById("edit-escala");s.innerHTML=n.map(i=>`<option value="${escapeHtml(i)}">${escapeHtml(i)}</option>`).join(""),n.includes(t.escala)||(s.innerHTML+=`<option value="${escapeHtml(t.escala)}">${escapeHtml(t.escala)}</option>`),s.value=t.escala,document.getElementById("edit-modal").classList.remove("hidden"),toggleRotuloDesc()}function closeEditModal(){document.getElementById("edit-modal").classList.add("hidden")}const COLLAB_DETAIL_FIELDS=[{key:"colaborador",label:"Colaborador"},{key:"matricula",label:"Matr\xEDcula"},{key:"re_padrao",label:"RE Padr\xE3o"},{key:"re_folha",label:"RE Folha"},{key:"posto",label:"Posto"},{key:"cargo",label:"Cargo"},{key:"escala",label:"Escala"},{key:"turno",label:"Turno"},{key:"telefone",label:"Telefone"},{key:"cpf",label:"CPF"},{key:"data_admissao",label:"Data admiss\xE3o"},{key:"empresa",label:"Empresa"},{key:"cliente",label:"Cliente"},{key:"turma",label:"Turma"},{key:"ferias",label:"F\xE9rias"},{key:"aso",label:"ASO"},{key:"reciclagem bombeiro",label:"Reciclagem bombeiro"},{key:"nr_10",label:"NR-10"},{key:"nr_20",label:"NR-20"},{key:"nr_33",label:"NR-33"},{key:"nr_35",label:"NR-35"},{key:"dea",label:"DEA"},{key:"heliponto",label:"Heliponto"},{key:"uniforme",label:"Uniforme"},{key:"suspensao",label:"Suspens\xE3o"},{key:"advertencia",label:"Advert\xEAncia"},{key:"recolhimento",label:"Recolhimento"},{key:"observacoes",label:"Observa\xE7\xF5es"},{key:"ctps_numero",label:"CTPS n\xFAmero"},{key:"ctps_serie",label:"CTPS s\xE9rie"},{key:"pis",label:"PIS"},{key:"rg",label:"RG"},{key:"atestados",label:"Atestados"},{key:"reciclagem_vigilante",label:"Reciclagem vigilante"},{key:"reciclagem_cnv_vigilante",label:"Reciclagem CNV vigilante"},{key:"telefone_emergencia",label:"Telefone emerg\xEAncia"},{key:"data_nascimento",label:"Data nascimento"},{key:"idade",label:"Idade"},{key:"unidade_de_negocio",label:"Unidade de neg\xF3cio"},{key:"endereco_colaborador",label:"Endere\xE7o"},{key:"email_login",label:"E-mail login"}],UNIT_DETAIL_FIELDS=[{key:"unidade_de_negocio",label:"Unidade de neg\xF3cio"},{key:"empresa",label:"Empresa"},{key:"empresa_bombeiros",label:"Empresa bombeiros"},{key:"cliente",label:"Cliente"},{key:"posto",label:"Posto"},{key:"endereco",label:"Endere\xE7o"},{key:"numero",label:"N\xFAmero"},{key:"bairro",label:"Bairro"},{key:"cep",label:"CEP"},{key:"cidade",label:"Cidade"},{key:"estado",label:"Estado"},{key:"seigla_estado",label:"Sigla estado"},{key:"data_implantacao",label:"Data implanta\xE7\xE3o"},{key:"pgr",label:"PGR"},{key:"pcms",label:"PCMS"},{key:"refeicao_no_local",label:"Refei\xE7\xE3o no local"},{key:"vale_transporte",label:"Vale transporte"},{key:"heliponto",label:"Heliponto"},{key:"email_supervisor_da_unidade",label:"E-mail supervisor"},{key:"email_sesmt",label:"E-mail SESMT"},{key:"obrasoft",label:"Obrasoft"},{key:"modalidade_aso",label:"Modalidade ASO"},{key:"modalidade_reciclagem",label:"Modalidade reciclagem"},{key:"rotulo",label:"R\xF3tulo"},{key:"rotulo_detalhe",label:"Detalhe r\xF3tulo"},{key:"rotulo_responsavel",label:"Respons\xE1vel r\xF3tulo"}];function buildDetailsGrid(e,t){return e?t.map(a=>{const o=e?.[a.key],n=o==null||o===""?"\u2014":String(o);return`
            <div class="detail-row">
                <span class="detail-label">${escapeHtml(a.label)}</span>
                <div class="detail-value">${escapeHtml(n)}</div>
            </div>
        `}).join(""):'<div class="admin-empty">Nenhum dado encontrado.</div>'}function openCollabDetailsModal(e){const t=currentData.find(o=>o.id===e)||(allCollaboratorsCache.items||[]).find(o=>o.id===e||o.re===e),a=document.getElementById("collab-details-body");a&&(a.innerHTML=buildDetailsGrid(t,COLLAB_DETAIL_FIELDS)),document.getElementById("collab-details-modal")?.classList.remove("hidden")}function closeCollabDetailsModal(){document.getElementById("collab-details-modal")?.classList.add("hidden")}const COLLAB_DETAIL_SECTIONS=[{title:"Identificacao",icon:"",fields:[{key:"colaborador",label:"Nome Completo",type:"text"},{key:"matricula",label:"Matricula",type:"text"},{key:"re_padrao",label:"RE Padrao",type:"text"},{key:"re_folha",label:"RE Folha",type:"text"},{key:"cpf",label:"CPF",type:"text"},{key:"rg",label:"RG",type:"text"},{key:"pis",label:"PIS",type:"text"},{key:"ctps_numero",label:"CTPS Numero",type:"text"},{key:"ctps_serie",label:"CTPS Serie",type:"text"},{key:"data_nascimento",label:"Data de Nascimento",type:"date"},{key:"idade",label:"Idade",type:"text"}]},{title:"Contato",icon:"",fields:[{key:"telefone",label:"Telefone",type:"text"},{key:"telefone_emergencia",label:"Telefone de Emergencia",type:"text"},{key:"email_login",label:"E-mail",type:"text"},{key:"endereco_colaborador",label:"Endereco",type:"text"}]},{title:"Vinculo Trabalhista",icon:"",fields:[{key:"empresa",label:"Empresa",type:"select-dynamic",source:"empresas"},{key:"cliente",label:"Cliente",type:"select-dynamic",source:"clientes"},{key:"unidade_de_negocio",label:"Unidade de Negocio",type:"select-dynamic",source:"unidades_negocio"},{key:"data_admissao",label:"Data de Admissao",type:"date"},{key:"turma",label:"Turma",type:"select",options:[{v:"1",l:"Impar"},{v:"2",l:"Par"}]}]},{title:"Posto & Escala",icon:"",fields:[{key:"posto",label:"Posto",type:"select-dynamic",source:"postos"},{key:"cargo",label:"Cargo",type:"select-dynamic",source:"cargos"},{key:"escala",label:"Escala (Horario)",type:"select-dynamic",source:"escalas"},{key:"turno",label:"Turno",type:"select-dynamic",source:"turnos"}]},{title:"Afastamentos",icon:"",fields:[{key:"rotulo",label:"Rotulo",type:"rotulo"},{key:"rotulo_inicio",label:"Inicio",type:"date",itemKey:"rotuloInicio"},{key:"rotulo_fim",label:"Fim",type:"date",itemKey:"rotuloFim"},{key:"rotulo_detalhe",label:"Detalhe",type:"text",itemKey:"rotuloDetalhe"},{key:"ferias",label:"Ferias",type:"text"},{key:"atestados",label:"Atestados",type:"text"}]},{title:"Conformidade & Certificacoes",icon:"",fields:[{key:"aso",label:"ASO",type:"text"},{key:"reciclagem bombeiro",label:"Reciclagem Bombeiro",type:"text"},{key:"reciclagem_vigilante",label:"Reciclagem Vigilante",type:"text"},{key:"reciclagem_cnv_vigilante",label:"Reciclagem CNV Vigilante",type:"text"},{key:"nr_10",label:"NR-10",type:"text"},{key:"nr_20",label:"NR-20",type:"text"},{key:"nr_33",label:"NR-33",type:"text"},{key:"nr_35",label:"NR-35",type:"text"},{key:"dea",label:"DEA",type:"text"},{key:"heliponto",label:"Heliponto",type:"text"}]},{title:"Equipamento & Disciplinar",icon:"",fields:[{key:"uniforme",label:"Uniforme",type:"text"},{key:"suspensao",label:"Suspensao",type:"text"},{key:"advertencia",label:"Advertencia",type:"text"},{key:"recolhimento",label:"Recolhimento",type:"text"}]},{title:"Observacoes",icon:"",fields:[{key:"observacoes",label:"Observacoes",type:"textarea"}]}];function findCollaboratorById(e){return currentData.find(t=>t.id===e)||currentData.find(t=>t.re===e||t.re===String(e))||(allCollaboratorsCache.items||[]).find(t=>t.id===e||t.re===e||t.re===String(e))}function openCollaboratorPage(e){const t=findCollaboratorById(e);if(!t){showToast("Colaborador n\xE3o encontrado.","error");return}detailPageState={id:t.id,re:t.re,item:t},detailPageInnerTab="info",switchTab("collab-detail"),renderCollabDetailPage(t),window.scrollTo({top:0,behavior:"smooth"})}function renderCollabDetailPage(e){const t=document.getElementById("tab-content-collab-detail");if(!t||!e)return;const a=getStatusInfo(e),o=buildCollabAvatarHtml(e.nome),n=isCollaboratorFavorite(e.re),s=JSON.stringify(e.telefone||""),i=JSON.stringify(e.nome||""),r=JSON.stringify(e.re||""),l=JSON.stringify(e.posto||"");let c="";if(e.rotulo){const d=e.rotulo.split(","),p={F\u00C9RIAS:"F\xE9rias",ATESTADO:"Atestado",AFASTADO:"Afastado",FT:"FT",TROCA:"Troca"};c=d.map(g=>{let m=g;return g==="OUTRO"&&e.rotuloDetalhe&&(m=e.rotuloDetalhe),`<span class="label-badge">${p[g]||m}</span>`}).join("")}t.innerHTML=`
        <div class="collab-page">
            <div class="collab-breadcrumb">
                <a href="javascript:void(0)" onclick="switchTab('busca')">\u2190 Voltar \xE0 Busca</a>
                <span class="bc-sep">\u203A</span>
                <span class="bc-current">${escapeHtml(e.nome||"Colaborador")}</span>
            </div>

            <div class="collab-page-header">
                <div class="cph-left">
                    ${o.replace("collab-avatar","collab-avatar collab-avatar-lg")}
                    <div class="cph-info">
                        <h2 class="cph-name">${escapeHtml(e.nome||"N/I")}</h2>
                        <div class="cph-subtitle">
                            <span>RE ${escapeHtml(e.re||"N/I")}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${escapeHtml(e.posto||"N/I")}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${escapeHtml(e.grupoLabel||e.grupo||"N/I")}</span>
                            <span class="meta-sep">\xB7</span>
                            <span>${escapeHtml(getCollaboratorRoleLabel(e))}</span>
                        </div>
                    </div>
                </div>
                <div class="cph-right">
                    <button class="status-badge status-badge-lg status-badge-btn" style="background-color:${a.color}" onclick="confirmInvertPlantao()" title="Inverter plant\xE3o/folga">${a.text}</button>
                    ${c}
                    <button class="edit-btn-icon favorite-btn ${n?"active":""}" onclick="toggleCollaboratorFavorite('${escapeHtml(e.re||"")}'); renderCollabDetailPage(findCollaboratorById(${JSON.stringify(e.id!=null?e.id:e.re)}))" title="${n?"Remover dos favoritos":"Adicionar aos favoritos"}">${n?ICONS.starFilled:ICONS.star}</button>
                    <button class="edit-btn-icon ${e.telefone?"whatsapp-icon":"disabled-icon"}" onclick="openPhoneModal(${escapeHtml(i)}, ${escapeHtml(s)})" title="${e.telefone?"Contato WhatsApp":"Sem telefone"}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${escapeHtml(r)}, ${escapeHtml(i)})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon" onclick="openAddressModalForCollaborator(${escapeHtml(r)}, ${escapeHtml(i)}, ${escapeHtml(l)})" title="Ver no mapa">${ICONS.mapPin}</button>
                </div>
            </div>

            <div class="collab-inner-tabs">
                <button class="collab-itab ${detailPageInnerTab==="info"?"active":""}" onclick="setCollabInnerTab('info')">Informa\xE7\xF5es</button>
                <button class="collab-itab ${detailPageInnerTab==="history"?"active":""}" onclick="setCollabInnerTab('history')">Hist\xF3rico</button>
                <button class="collab-itab ${detailPageInnerTab==="compliance"?"active":""}" onclick="setCollabInnerTab('compliance')">Conformidade</button>
            </div>

            <div id="collab-inner-content">
                ${renderCollabInnerTabContent(e)}
            </div>
        </div>
    `}function setCollabInnerTab(e){if(detailPageInnerTab=e,detailPageState?.item){const t=findCollaboratorById(detailPageState.id||detailPageState.re)||detailPageState.item;detailPageState.item=t;const a=document.getElementById("collab-inner-content");a&&(a.innerHTML=renderCollabInnerTabContent(t)),document.querySelectorAll(".collab-itab").forEach(o=>o.classList.remove("active")),document.querySelector(`.collab-itab[onclick="setCollabInnerTab('${e}')"]`)?.classList.add("active")}}function renderCollabInnerTabContent(e){return detailPageInnerTab==="history"?renderCollabDetailHistory(e):detailPageInnerTab==="compliance"?renderCollabDetailCompliance(e):renderCollabDetailSections(e)}function getFieldItemValue(e,t){const a=t.itemKey||t.key,o=e?.[a];return o==null||o===""?"":String(o)}function getDynamicOptions(e){const t=a=>[...new Set(currentData.map(o=>o[a]).filter(Boolean))].sort();return e==="postos"?t("posto"):e==="escalas"?t("escala"):e==="cargos"?t("cargo"):e==="turnos"?t("turno"):e==="empresas"?t("empresa"):e==="clientes"?t("cliente"):e==="unidades_negocio"?t("unidade_de_negocio"):[]}function renderCollabDetailSections(e){const t=SiteAuth.mode==="edit"||SiteAuth.logged;return COLLAB_DETAIL_SECTIONS.map((a,o)=>{const n=a.fields.map((i,r)=>{const c=getFieldItemValue(e,i)||"\u2014",d=`cpf-${o}-${r}`,p=t?`<button class="field-edit-btn" onclick="toggleFieldEdit('${d}', ${o}, ${r})" title="Editar">${ICONS.edit}</button>`:"";return`
                <div class="cpf-field" id="${d}">
                    <div class="cpf-field-display">
                        <span class="cpf-label">${escapeHtml(i.label)}</span>
                        <span class="cpf-value">${escapeHtml(c)}</span>
                        ${p}
                    </div>
                    <div class="cpf-field-editing hidden">
                    </div>
                </div>
            `}).join(""),s=t?`<button class="btn btn-secondary btn-compact section-edit-btn" onclick="editSection(${o})">Editar se\xE7\xE3o</button>`:"";return`
            <div class="collab-section-card">
                <div class="csc-header">
                    <h3><span class="csc-icon">${a.icon}</span> ${escapeHtml(a.title)}</h3>
                    ${s}
                </div>
                <div class="csc-fields">${n}</div>
            </div>
        `}).join("")}function toggleFieldEdit(e,t,a){const o=document.getElementById(e);if(!o)return;const n=o.querySelector(".cpf-field-display"),s=o.querySelector(".cpf-field-editing");if(!n||!s)return;if(!s.classList.contains("hidden")){s.classList.add("hidden"),n.classList.remove("hidden");return}const l=COLLAB_DETAIL_SECTIONS[t].fields[a],c=detailPageState?.item;if(!c)return;const d=getFieldItemValue(c,l);s.innerHTML=buildFieldEditor(l,d,e,t,a),n.classList.add("hidden"),s.classList.remove("hidden");const p=s.querySelector("input, select, textarea");p&&p.focus()}function buildFieldEditor(e,t,a,o,n){const s=escapeHtml(t);let i="";if(e.type==="text")i=`<input type="text" class="cpf-input" value="${s}">`;else if(e.type==="date")i=`<input type="date" class="cpf-input" value="${s}">`;else if(e.type==="textarea")i=`<textarea class="cpf-input cpf-textarea">${s}</textarea>`;else if(e.type==="select")i=`<select class="cpf-input">${(e.options||[]).map(l=>`<option value="${escapeHtml(l.v)}" ${String(l.v)===String(t)?"selected":""}>${escapeHtml(l.l)}</option>`).join("")}</select>`;else if(e.type==="select-dynamic"){const r=getDynamicOptions(e.source);let l=r.map(c=>`<option value="${escapeHtml(c)}" ${c===t?"selected":""}>${escapeHtml(c)}</option>`).join("");t&&!r.includes(t)&&(l+=`<option value="${s}" selected>${s}</option>`),i=`<select class="cpf-input">${l}</select>`}else if(e.type==="rotulo"){const r=["F\xC9RIAS","ATESTADO","AFASTADO","FT","TROCA","OUTRO"],l=(t||"").split(",").map(c=>c.trim()).filter(Boolean);i=`<div class="cpf-checkbox-group">${r.map(c=>`<label class="cpf-cb-label"><input type="checkbox" value="${c}" ${l.includes(c)?"checked":""}> ${c}</label>`).join("")}</div>`}return`
        <span class="cpf-label">${escapeHtml(e.label)}</span>
        ${i}
        <div class="cpf-field-actions">
            <button class="btn btn-compact cpf-save-btn" onclick="saveFieldEdit('${a}', ${o}, ${n})">\u2713 Salvar</button>
            <button class="btn btn-secondary btn-compact" onclick="toggleFieldEdit('${a}', ${o}, ${n})">\u2717 Cancelar</button>
        </div>
    `}async function saveFieldEdit(e,t,a){const o=document.getElementById(e);if(!o)return;const s=COLLAB_DETAIL_SECTIONS[t].fields[a],i=detailPageState?.item;if(!i)return;const r=o.querySelector(".cpf-field-editing");let l="";if(s.type==="rotulo"){const b=r.querySelectorAll('input[type="checkbox"]:checked');l=Array.from(b).map(v=>v.value).join(",")}else{const b=r.querySelector("input, select, textarea");l=b?b.value:""}const c=s.itemKey||s.key,d=i[c],p=d==null||d===""?"":String(d);if(l===p){toggleFieldEdit(e,t,a);return}const g=JSON.parse(JSON.stringify(i));if(i[c]=l,s.key==="colaborador"&&(i.nome=l.toUpperCase()),s.key==="re_padrao"&&(i.re_padrao=l),!await updateCollaboratorInSupabase(i)){Object.assign(i,g),showToast("Falha ao salvar no Supabase.","error");return}const f=JSON.parse(JSON.stringify(i)),u=SiteAuth.user||"Admin";changeHistory.unshift({data:new Date().toLocaleString("pt-BR"),responsavel:u,acao:"Edi\xE7\xE3o de Campo",detalhe:`Alterou "${s.label}" de "${p||"\u2014"}" para "${l||"\u2014"}" em ${i.nome} (${i.re})`,target:{re:i.re,nome:i.nome},changes:[{field:s.label,from:p,to:l}],before:g,after:f});try{saveLocalState()}catch{}showToast(`"${s.label}" atualizado com sucesso!`,"success"),detailPageState.item=i,renderCollabDetailPage(i)}function editSection(e){const t=COLLAB_DETAIL_SECTIONS[e];t&&t.fields.forEach((a,o)=>{const n=`cpf-${e}-${o}`,s=document.getElementById(n);if(!s)return;const i=s.querySelector(".cpf-field-editing");i&&i.classList.contains("hidden")&&toggleFieldEdit(n,e,o)})}function renderCollabDetailHistory(e){const t=e.re||"",a=(changeHistory||[]).filter(n=>n.target?n.target.re===t:!1);return a.length===0?`
            <div class="collab-section-card">
                <div class="csc-header"><h3><span class="csc-icon"></span> Historico de Alteracoes</h3></div>
                <div class="history-empty">
                    <div class="history-empty-icon"></div>
                    <p>Nenhum hist\xF3rico registrado para este colaborador.</p>
                    <p class="text-muted">Altera\xE7\xF5es feitas nos campos aparecer\xE3o aqui automaticamente.</p>
                </div>
            </div>
        `:`
        <div class="collab-section-card">
            <div class="csc-header"><h3><span class="csc-icon"></span> Historico de Alteracoes</h3></div>
            <div class="history-timeline">${a.map(n=>{const s=(n.changes||[]).map(r=>`
                <div class="timeline-diff">
                    <span class="diff-field">${escapeHtml(r.field||"")}</span>
                    <span class="diff-from">${escapeHtml(r.from||"\u2014")}</span>
                    <span class="diff-arrow">\u2192</span>
                    <span class="diff-to">${escapeHtml(r.to||"\u2014")}</span>
                </div>
            `).join("");return`
            <div class="timeline-entry timeline-${(n.acao||"").toLowerCase().includes("exclu")?"delete":(n.acao||"").toLowerCase().includes("cria\xE7")?"create":"edit"}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-header-row">
                        <span class="timeline-date">${escapeHtml(n.data||"")}</span>
                        <span class="timeline-user">${escapeHtml(n.responsavel||"Sistema")}</span>
                    </div>
                    <div class="timeline-action">${escapeHtml(n.acao||"")}</div>
                    <div class="timeline-detail">${escapeHtml(n.detalhe||"")}</div>
                    ${s?`<div class="timeline-changes">${s}</div>`:""}
                </div>
            </div>
        `}).join("")}</div>
        </div>
    `}function renderCollabDetailCompliance(e){return`
        <div class="collab-section-card">
            <div class="csc-header"><h3><span class="csc-icon"></span> Conformidade e Certificacoes</h3></div>
            <div class="compliance-grid">${[{key:"aso",label:"ASO",icon:""},{key:"reciclagem bombeiro",label:"Reciclagem Bombeiro",icon:""},{key:"reciclagem_vigilante",label:"Reciclagem Vigilante",icon:""},{key:"reciclagem_cnv_vigilante",label:"Reciclagem CNV Vigilante",icon:""},{key:"nr_10",label:"NR-10",icon:""},{key:"nr_20",label:"NR-20",icon:""},{key:"nr_33",label:"NR-33",icon:""},{key:"nr_35",label:"NR-35",icon:""},{key:"dea",label:"DEA",icon:""},{key:"heliponto",label:"Heliponto",icon:""}].map(o=>{const n=e?.[o.key],s=n==null||n===""?"\u2014":String(n);return`
            <div class="compliance-card compliance-${getComplianceStatus(s)}">
                <div class="compliance-icon">${o.icon}</div>
                <div class="compliance-label">${escapeHtml(o.label)}</div>
                <div class="compliance-value">${escapeHtml(s)}</div>
                <div class="compliance-status-dot"></div>
            </div>
        `}).join("")}</div>
        </div>
    `}function getComplianceStatus(e){if(!e||e==="\u2014")return"unknown";const t=e.toLowerCase();if(t.includes("vencid")||t.includes("irregular")||t.includes("inapto"))return"expired";if(t.includes("pr\xF3ximo")||t.includes("proximo")||t.includes("aten\xE7\xE3o")||t.includes("atencao"))return"warning";const a=e.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);if(a){const s=(new Date(a[3],a[2]-1,a[1])-new Date)/(1e3*60*60*24);return s<0?"expired":s<30?"warning":"ok"}return"ok"}async function openUnitDetailsModal(e){const t=String(e||"").trim();let a=(supaUnitsCache.items||[]).find(n=>normalizeUnitKey(n.posto)===normalizeUnitKey(t));a||(a=(await fetchSupabaseUnits(!0)||[]).find(s=>normalizeUnitKey(s.posto)===normalizeUnitKey(t)));const o=document.getElementById("unit-details-body");o&&(o.innerHTML=buildDetailsGrid(a,UNIT_DETAIL_FIELDS)),document.getElementById("unit-details-modal")?.classList.remove("hidden")}function closeUnitDetailsModal(){document.getElementById("unit-details-modal")?.classList.add("hidden")}function setupCheckboxGroup(e,t,a){const n=document.getElementById(e).querySelectorAll('input[type="checkbox"]'),s=t.split(",");n.forEach(i=>{i.checked=s.includes(i.value),i.onchange=a})}function getCheckboxValues(e){const a=document.getElementById(e).querySelectorAll('input[type="checkbox"]:checked');return Array.from(a).map(o=>o.value).join(",")}function toggleRotuloDesc(){const e=getCheckboxValues("edit-rotulo-container"),t=document.getElementById("div-rotulo-desc");e.includes("OUTRO")?t.classList.remove("hidden"):t.classList.add("hidden")}function getCollaboratorDbSelector(e){return e?e.matricula?{column:"matricula",value:e.matricula}:e.re_padrao?{column:COLLAB_RE_PADRAO_COLUMN,value:e.re_padrao}:e.re_padrap?{column:"re_padrap",value:e.re_padrap}:e.re_folha?{column:"re_folha",value:e.re_folha}:e.re?{column:COLLAB_RE_PADRAO_COLUMN,value:e.re}:null:null}function buildCollaboratorDbUpdate(e){const t={colaborador:e.nome||e.colaborador||"",telefone:e.telefone||"",posto:e.posto||"",escala:e.escala||"",turma:e.turma||1,rotulo:e.rotulo||"",rotulo_inicio:e.rotuloInicio||e.rotulo_inicio||"",rotulo_fim:e.rotuloFim||e.rotulo_fim||"",rotulo_detalhe:e.rotuloDetalhe||e.rotulo_detalhe||""};return["matricula","re_folha","cargo","turno","cpf","rg","pis","ctps_numero","ctps_serie","data_nascimento","idade","telefone_emergencia","email_login","endereco_colaborador","empresa","cliente","unidade_de_negocio","data_admissao","ferias","aso","atestados","reciclagem bombeiro","reciclagem_vigilante","reciclagem_cnv_vigilante","nr_10","nr_20","nr_33","nr_35","dea","heliponto","uniforme","suspensao","advertencia","recolhimento","observacoes"].forEach(o=>{e[o]!=null&&(t[o]=e[o])}),t[COLLAB_RE_PADRAO_COLUMN]=e.re_padrao||e.re||"",t}function invalidateCollaboratorsCache(){allCollaboratorsCache={items:null,updatedAt:0}}async function updateCollaboratorInSupabase(e){if(!isSupabaseReady())return!1;const t=getCollaboratorDbSelector(e);if(!t)return!1;const a=buildCollaboratorDbUpdate(e);try{const{error:o}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).update(a).eq(t.column,t.value);return o?AppErrorHandler.capture(o,{scope:"update-collaborator"},{silent:!0}):invalidateCollaboratorsCache(),!o}catch(o){return AppErrorHandler.capture(o,{scope:"update-collaborator"},{silent:!0}),!1}}async function insertCollaboratorInSupabase(e){if(!isSupabaseReady())return!1;const t={matricula:e.matricula||e.re||"",re_folha:e.re_folha||"",colaborador:e.nome||e.colaborador||"",posto:e.posto||"",cargo:e.cargo||"",escala:e.escala||"",turno:e.turno||"",telefone:e.telefone||"",turma:e.turma||1,unidade_de_negocio:e.unidade_de_negocio||"",endereco_colaborador:e.endereco_colaborador||"",email_login:e.email_login||""};t[COLLAB_RE_PADRAO_COLUMN]=e.re_padrao||e.re||"";try{const{error:a}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).insert(t);return a?AppErrorHandler.capture(a,{scope:"insert-collaborator"},{silent:!0}):invalidateCollaboratorsCache(),!a}catch(a){return AppErrorHandler.capture(a,{scope:"insert-collaborator"},{silent:!0}),!1}}async function deleteCollaboratorInSupabase(e){if(!isSupabaseReady())return!1;const t=getCollaboratorDbSelector(e);if(!t)return!1;try{const{error:a}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).delete().eq(t.column,t.value);return a?AppErrorHandler.capture(a,{scope:"delete-collaborator"},{silent:!0}):invalidateCollaboratorsCache(),!a}catch(a){return AppErrorHandler.capture(a,{scope:"delete-collaborator"},{silent:!0}),!1}}async function updateCollaboratorsBulk(e,t){if(!isSupabaseReady())return!1;const a=e||[];if(!a.length)return!0;const o=a.map(i=>i.matricula).filter(Boolean);if(o.length===a.length){const{error:i}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).update(t).in("matricula",o);return!i}const s=(await Promise.allSettled(a.map(async i=>{const r=getCollaboratorDbSelector(i);if(!r)return!1;const{error:l}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).update(t).eq(r.column,r.value);return l&&AppErrorHandler.capture(l,{scope:"bulk-update-collaborator"},{silent:!0}),!l}))).every(i=>i.status==="fulfilled"&&i.value===!0);return s&&invalidateCollaboratorsCache(),s}async function salvarEdicao(){const e=parseInt(document.getElementById("edit-id").value),t=currentData.find(o=>o.id===e),a=SiteAuth.user||"Admin";if(t){const o=JSON.parse(JSON.stringify(t));if(t.nome=document.getElementById("edit-nome").value.toUpperCase(),t.re=document.getElementById("edit-re").value,t.re_padrao=t.re,t.telefone=document.getElementById("edit-telefone").value.replace(/\D/g,""),t.posto=document.getElementById("edit-posto").value.toUpperCase(),t.escala=document.getElementById("edit-escala").value,t.turma=parseInt(document.getElementById("edit-turma").value),t.rotulo=getCheckboxValues("edit-rotulo-container"),t.rotuloInicio=document.getElementById("edit-inicio").value,t.rotuloFim=document.getElementById("edit-fim").value,t.rotuloDetalhe=document.getElementById("edit-rotulo-desc").value,!await updateCollaboratorInSupabase(t)){Object.assign(t,o),showToast("Falha ao salvar no Supabase.","error");return}const s=JSON.parse(JSON.stringify(t)),i=buildColabChanges(o,s);if(changeHistory.unshift({data:new Date().toLocaleString(),responsavel:a,acao:"Edi\xE7\xE3o de Colaborador",detalhe:`Editou ${t.nome} (${t.re})`,target:{re:t.re,nome:t.nome},changes:i,before:o,after:s,undo:{type:"edit_colab",before:o,after:s}}),saveLocalState(),currentTab==="busca"){const r=document.getElementById("search-input").value;realizarBusca(r)}else renderizarUnidades();closeEditModal(),showToast("Colaborador atualizado com sucesso!","success")}}function openEditUnitModal(e){if(SiteAuth.mode!=="edit")return;document.getElementById("edit-unit-old-name").value=e,document.getElementById("edit-unit-new-name").value=e;const t=unitMetadata[e]||{};setupCheckboxGroup("edit-unit-rotulo-container",t.rotulo||"",toggleUnitRotuloDesc),document.getElementById("edit-unit-rotulo-desc").value=t.detalhe||"",toggleUnitRotuloDesc();const a=document.getElementById("unit-members-list"),o=currentData.filter(n=>n.posto===e).sort((n,s)=>n.nome.localeCompare(s.nome));a.innerHTML=o.map(n=>`
        <div class="member-item">
            <label>
                <input type="checkbox" class="bulk-check" value="${n.id}">
                <span class="member-name">${escapeHtml(n.nome)}</span>
                <span class="member-re">${escapeHtml(n.re)}</span>
            </label>
        </div>
    `).join(""),populateAddColabSelects(e),document.getElementById("edit-unit-modal").classList.remove("hidden")}function closeEditUnitModal(){document.getElementById("edit-unit-modal").classList.add("hidden")}function populateAddColabSelects(e){const t=[...new Set(currentData.map(s=>s.escala).filter(Boolean))].sort(),a=[...new Set(currentData.map(s=>s.posto).filter(Boolean))].sort(),o=document.getElementById("new-colab-horario");o&&(o.innerHTML='<option value="">Selecione o hor\xE1rio</option>'+t.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""));const n=document.getElementById("new-colab-unidade");n&&(n.innerHTML='<option value="">Unidade atual</option>'+a.map(s=>`<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join(""),n.value=e||"")}function toggleUnitRotuloDesc(){const e=getCheckboxValues("edit-unit-rotulo-container"),t=document.getElementById("div-unit-rotulo-desc");e.includes("OUTRO")?t.classList.remove("hidden"):t.classList.add("hidden")}async function updateUnitInSupabase(e,t,a={}){if(!isSupabaseReady())return!1;const o={posto:t,rotulo:a.rotulo||"",rotulo_detalhe:a.detalhe||"",rotulo_responsavel:a.responsavel||""};try{const{error:n}=await supabaseClient.from(SUPABASE_TABLES.unidades).update(o).eq("posto",e);return n?AppErrorHandler.capture(n,{scope:"update-unit"},{silent:!0}):supaUnitsCache={items:null,updatedAt:0},!n}catch(n){return AppErrorHandler.capture(n,{scope:"update-unit"},{silent:!0}),!1}}async function updateCollaboratorsUnitInSupabase(e,t){if(!isSupabaseReady())return!1;try{const{error:a}=await supabaseClient.from(SUPABASE_TABLES.colaboradores).update({posto:t}).eq("posto",e);return a?AppErrorHandler.capture(a,{scope:"update-collaborators-unit"},{silent:!0}):invalidateCollaboratorsCache(),!a}catch(a){return AppErrorHandler.capture(a,{scope:"update-collaborators-unit"},{silent:!0}),!1}}async function salvarEdicaoUnidade(){const e=document.getElementById("edit-unit-old-name").value,t=document.getElementById("edit-unit-new-name").value.toUpperCase().trim(),a=getCheckboxValues("edit-unit-rotulo-container"),o=document.getElementById("edit-unit-rotulo-desc").value,n=SiteAuth.user||"Admin",s=unitMetadata[e]?{...unitMetadata[e]}:null;if(t&&t!==e){const r=currentData.filter(p=>p.posto===e).map(p=>p.id),l={...unitMetadata},c=await updateCollaboratorsUnitInSupabase(e,t),d=await updateUnitInSupabase(e,t,{rotulo:a,detalhe:o,responsavel:n});if(!c||!d){showToast("Falha ao salvar unidade no Supabase. Nenhuma altera\xE7\xE3o foi aplicada.","error");return}unitMetadata[e]&&(unitMetadata[t]=unitMetadata[e],delete unitMetadata[e]),currentData.forEach(p=>{p.posto===e&&(p.posto=t)}),renderizarUnidades(),showToast("Nome da unidade atualizado!","success"),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:n,acao:"Renomear Unidade",detalhe:`Renomeou ${e} para ${t}`,target:{unidade:t},changes:[{label:"Unidade",from:e,to:t}],undo:{type:"rename_unit",oldName:e,newName:t,affectedIds:r,metaSnapshot:l}})}const i=t||e;if(unitMetadata[i]={rotulo:a,detalhe:o,responsavel:n},saveLocalState(),(!t||t===e)&&(await updateUnitInSupabase(i,i,{rotulo:a,detalhe:o,responsavel:n})||showToast("Falha ao salvar metadados no Supabase.","error")),!t||t===e){const r=unitMetadata[i],l=[];(s?.rotulo||"")!==(r?.rotulo||"")&&l.push({label:"R\xF3tulo",from:s?.rotulo||"\u2014",to:r?.rotulo||"\u2014"}),(s?.detalhe||"")!==(r?.detalhe||"")&&l.push({label:"Detalhe",from:s?.detalhe||"\u2014",to:r?.detalhe||"\u2014"}),l.length&&(changeHistory.unshift({data:new Date().toLocaleString(),responsavel:n,acao:"Atualiza\xE7\xE3o de R\xF3tulo",detalhe:`Atualizou r\xF3tulos da unidade ${i}`,target:{unidade:i},changes:l,undo:{type:"update_unit_labels",unitName:i,metaBefore:s}}),saveLocalState())}renderizarUnidades(),closeEditUnitModal()}async function executarAcaoEmMassa(){const e=document.getElementById("bulk-action-select").value;let t="";e==="move"?t=document.getElementById("bulk-unit-select").value:e==="scale"?t=document.getElementById("bulk-scale-select").value:t=document.getElementById("bulk-action-value").value.toUpperCase().trim();const a=document.querySelectorAll(".bulk-check:checked");if(!e||!t||a.length===0){showToast("Selecione uma op\xE7\xE3o v\xE1lida e escolha colaboradores.","error");return}const o=Array.from(a).map(l=>parseInt(l.value)),n=currentData.filter(l=>o.includes(l.id)).map(l=>({id:l.id,posto:l.posto,escala:l.escala})),s=currentData.filter(l=>o.includes(l.id));if(currentData.forEach(l=>{o.includes(l.id)&&(e==="move"&&(l.posto=t),e==="scale"&&(l.escala=t))}),!await updateCollaboratorsBulk(s,e==="move"?{posto:t}:{escala:t})){n.forEach(l=>{const c=currentData.find(d=>d.id===l.id);c&&(c.posto=l.posto,c.escala=l.escala)}),renderizarUnidades(),showToast("Falha ao salvar no Supabase.","error");return}showToast(`${a.length} colaboradores atualizados!`,"success"),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"A\xE7\xE3o em Massa",detalhe:`${a.length} colaboradores atualizados (${e==="move"?"Unidade":"Escala"}: ${t})`,undo:{type:"bulk_update",items:n,actionLabel:e}}),saveLocalState(),renderizarUnidades(),closeEditUnitModal()}async function removerColaborador(){const e=SiteAuth.user||"Admin",t=parseInt(document.getElementById("edit-id").value);if(confirm("Tem certeza que deseja remover este colaborador permanentemente?")){const a=currentData.find(n=>n.id===t);if(!await deleteCollaboratorInSupabase(a)){showToast("Falha ao remover no Supabase.","error");return}setAppState("currentData",currentData.filter(n=>n.id!==t),{silent:!0}),closeEditModal(),currentTab==="busca"?realizarBusca():renderizarUnidades(),showToast("Colaborador removido.","success"),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:e,acao:"Exclus\xE3o",detalhe:`Removeu ${a?a.nome:"Colaborador"} do sistema`,target:a?{re:a.re,nome:a.nome}:null,undo:a?{type:"remove_colab",item:a}:null}),saveLocalState()}}async function adicionarColaboradorNaUnidade(){const e=document.getElementById("new-colab-nome").value.toUpperCase().trim(),t=document.getElementById("new-colab-re").value.trim(),a=document.getElementById("new-colab-telefone").value.replace(/\D/g,""),o=document.getElementById("new-colab-horario").value.trim(),n=parseInt(document.getElementById("new-colab-turma")?.value||"1"),i=document.getElementById("new-colab-unidade").value.toUpperCase().trim()||document.getElementById("edit-unit-old-name").value;if(!e||!t){showToast("Preencha Nome e RE.","error");return}const r=currentData.length>0?Math.max(...currentData.map(v=>v.id))+1:1,l=currentData.find(v=>v.posto===i),c=getAllowedGroups()[0]||"todos",d=l?.unidade_de_negocio||"",p=l?l.grupo:currentGroup!=="todos"?currentGroup:c,g=extrairTipoEscala(o),m={id:r,nome:e,re:t,re_padrao:t,matricula:t,dbId:t,posto:i,escala:o,tipoEscala:g,turma:Number.isFinite(n)?n:1,rotulo:"",rotuloInicio:"",rotuloFim:"",rotuloDetalhe:"",grupo:p,unidade_de_negocio:d,telefone:a};if(!await insertCollaboratorInSupabase(m)){showToast("Falha ao inserir no Supabase. Informe a matr\xEDcula completa se necess\xE1rio.","error");return}currentData.push(m),document.getElementById("new-colab-nome").value="",document.getElementById("new-colab-re").value="",document.getElementById("new-colab-telefone").value="",document.getElementById("new-colab-horario").value="",document.getElementById("new-colab-turma").value="1",document.getElementById("new-colab-unidade").value="",renderizarUnidades();const u=document.getElementById("unit-members-list"),b=currentData.filter(v=>v.posto===i).sort((v,E)=>v.nome.localeCompare(E.nome));u.innerHTML=b.map(v=>`
        <div class="member-item">
            <label>
                <input type="checkbox" class="bulk-check" value="${v.id}">
                <span class="member-name">${escapeHtml(v.nome)}</span>
                <span class="member-re">${escapeHtml(v.re)}</span>
            </label>
        </div>
    `).join(""),showToast("Colaborador adicionado!","success"),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:"Sistema (Adi\xE7\xE3o R\xE1pida)",acao:"Adi\xE7\xE3o",detalhe:`Adicionou ${e} em ${i}`,target:{re:t,nome:e},undo:{type:"add_colab",item:m}}),saveLocalState()}function scrollToTop(){window.scrollTo({top:0,behavior:"smooth"})}function toggleUtilityButtons(){toggleUtilityDrawer()}function showToast(e,t="info"){if(t&&typeof t=="object")return showToast(e,t.type||"info",t);const a=arguments.length>2&&arguments[2]&&typeof arguments[2]=="object"?arguments[2]:{},o=document.getElementById("toast-container");if(!o)return;o.setAttribute("aria-live","polite"),o.setAttribute("aria-atomic","true");const n={warn:"warning",warning:"warning",loading:"loading"}[t]||t||"info",s=String(a.id||"").trim();if(s){const f=o.querySelector(`.toast[data-toast-id="${s}"]`);f&&f.remove()}const i=document.createElement("div");i.className=`toast ${n}`,s&&(i.dataset.toastId=s),i.setAttribute("role","alert");const r={success:"\u2713",error:"\u2715",warning:"\u26A0",loading:"\u21BB",info:"i"},l=document.createElement("span");l.className="toast-icon",l.textContent=r[n]||"i";const c=document.createElement("div");c.className="toast-body";const d=document.createElement("span");if(d.textContent=String(e||""),c.appendChild(d),a.actionLabel&&typeof a.onAction=="function"){const f=document.createElement("div");f.className="toast-actions";const u=document.createElement("button");u.type="button",u.className="btn-mini btn-secondary",u.textContent=String(a.actionLabel||"Desfazer"),u.addEventListener("click",()=>{try{a.onAction()}catch{}i.remove()}),f.appendChild(u),c.appendChild(f)}const p=document.createElement("button");p.type="button",p.className="btn-mini btn-secondary",p.textContent="Fechar",p.addEventListener("click",()=>i.remove()),i.append(l,c,p),o.appendChild(i);const g=a.autoClose!==!1&&n!=="loading",m=Number.isFinite(a.duration)?Math.max(1200,a.duration):4e3;return g&&setTimeout(()=>{i.style.animation="fadeOut 0.3s ease forwards",setTimeout(()=>i.remove(),300)},m),s||null}function hideToastById(e){const t=String(e||"").trim();if(!t)return;const a=document.querySelector(`.toast[data-toast-id="${t}"]`);a&&a.remove()}function exportarDadosExcel(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const e=currentData.map(n=>{const s=getStatusInfo(n);return{Nome:n.nome,RE:n.re,Unidade:n.posto,Escala:n.escala,Turma:n.turma===1?"\xCDmpar":"Par",Status:s.text,R\u00F3tulo:n.rotulo||"","Detalhe R\xF3tulo":n.rotuloDetalhe||"","In\xEDcio Afastamento":n.rotuloInicio?formatDate(n.rotuloInicio):"","Fim Afastamento":n.rotuloFim?formatDate(n.rotuloFim):""}}),t=XLSX.utils.json_to_sheet(e),a=[{wch:30},{wch:10},{wch:20},{wch:15},{wch:10},{wch:15},{wch:15},{wch:20},{wch:15},{wch:15}];t["!cols"]=a;const o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,t,"Efetivo"),XLSX.writeFile(o,`efetivo_dunamis_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Excel gerado com sucesso!","success")}function exportarDadosCSV(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const e=["Nome","RE","Posto","Escala","Turma","Status","R\xF3tulo"],t=currentData.map(s=>[`"${s.nome}"`,`"${s.re}"`,`"${s.posto}"`,`"${s.escala}"`,s.turma,getStatusInfo(s).text,s.rotulo||""]),a=[e.join(","),...t.map(s=>s.join(","))].join(`
`),o=new Blob([a],{type:"text/csv;charset=utf-8;"}),n=document.createElement("a");n.href=URL.createObjectURL(o),n.download=`efetivo_dunamis_${new Date().toISOString().slice(0,10)}.csv`,n.click(),showToast("Download iniciado!","success")}function openHistoryModal(){const e=document.getElementById("history-list"),t=document.getElementById("history-actions");if(t){const a=changeHistory.length>0&&!!changeHistory[0]?.undo;t.innerHTML=`
            <button class="btn btn-secondary btn-small" onclick="undoLastChange()" ${a?"":"disabled"}>
                Desfazer \xFAltima altera\xE7\xE3o
            </button>
        `}changeHistory.length===0?e.innerHTML='<p class="empty-state">Nenhuma altera\xE7\xE3o registrada nesta sess\xE3o.</p>':e.innerHTML=changeHistory.map(a=>renderHistoryEntry(a)).join(""),document.getElementById("history-modal").classList.remove("hidden")}function closeHistoryModal(){document.getElementById("history-modal").classList.add("hidden")}function renderHistoryEntry(e){const t=`${e.data||""} \u2022 <strong>${e.responsavel||"N/I"}</strong>`,a=e.detalhe?`<div class="history-detail">${e.detalhe}</div>`:"",o=Array.isArray(e.changes)&&e.changes.length?`<ul class="history-changes">${e.changes.map(n=>`
                <li><strong>${n.label}:</strong> ${n.from} \u2192 ${n.to}</li>
            `).join("")}</ul>`:"";return`
        <div class="history-entry">
            <div class="history-meta">${t}</div>
            <div class="history-title">${e.acao||"Altera\xE7\xE3o"}</div>
            ${a}
            ${o}
        </div>
    `}function formatChangeValue(e){return e==null||e===""?"\u2014":Array.isArray(e)?e.join(", "):String(e)}function formatPhoneNumber(e){if(!e)return"";const t=e.replace(/\D/g,"");return t.length===11?t.replace(/(\d{2})(\d{5})(\d{4})/,"($1) $2-$3"):t.length===10?t.replace(/(\d{2})(\d{4})(\d{4})/,"($1) $2-$3"):t}function buildColabChanges(e,t){const a=[{key:"nome",label:"Nome"},{key:"re",label:"RE"},{key:"telefone",label:"Telefone",format:formatPhoneNumber},{key:"posto",label:"Unidade"},{key:"escala",label:"Hor\xE1rio"},{key:"turma",label:"Turma"},{key:"rotulo",label:"R\xF3tulo"},{key:"rotuloDetalhe",label:"Detalhe do R\xF3tulo"},{key:"rotuloInicio",label:"In\xEDcio Afastamento"},{key:"rotuloFim",label:"Fim Afastamento"}],o=[];return a.forEach(n=>{const s=e?.[n.key],i=t?.[n.key],r=n.format?n.format(s):formatChangeValue(s),l=n.format?n.format(i):formatChangeValue(i);r!==l&&o.push({key:n.key,label:n.label,from:r,to:l})}),o}function undoLastChange(){if(!changeHistory.length||!changeHistory[0]?.undo){showToast("Nenhuma altera\xE7\xE3o para desfazer.","info");return}if(!confirm("Deseja desfazer a \xFAltima altera\xE7\xE3o registrada?"))return;const e=changeHistory[0].undo;if(e.type==="edit_colab"){const t=e.before,a=e.after,o=currentData.findIndex(n=>n.id===t.id);o>=0&&(currentData[o]={...t}),a?.re&&a.re!==t.re&&delete collaboratorEdits[a.re],collaboratorEdits[t.re]={...t},saveLocalState(),renderizarUnidades(),currentTab==="busca"&&realizarBusca(document.getElementById("search-input")?.value||""),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu edi\xE7\xE3o de ${t.nome} (${t.re})`}),saveLocalState(),openHistoryModal(),showToast("\xDAltima edi\xE7\xE3o desfeita.","success");return}if(e.type==="remove_colab"){const t=e.item;currentData.find(a=>a.id===t.id)||currentData.push({...t}),collaboratorEdits[t.re]={...t},saveLocalState(),renderizarUnidades(),currentTab==="busca"&&realizarBusca(document.getElementById("search-input")?.value||""),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu exclus\xE3o de ${t.nome} (${t.re})`}),saveLocalState(),openHistoryModal(),showToast("Exclus\xE3o desfeita.","success");return}if(e.type==="add_colab"){const t=e.item;setAppState("currentData",currentData.filter(a=>a.id!==t.id),{silent:!0}),delete collaboratorEdits[t.re],saveLocalState(),renderizarUnidades(),currentTab==="busca"&&realizarBusca(document.getElementById("search-input")?.value||""),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu adi\xE7\xE3o de ${t.nome} (${t.re})`}),saveLocalState(),openHistoryModal(),showToast("Adi\xE7\xE3o desfeita.","success");return}if(e.type==="rename_unit"){const{oldName:t,newName:a,affectedIds:o,metaSnapshot:n}=e;currentData.forEach(s=>{o.includes(s.id)&&(s.posto=t)}),unitMetadata={...n},saveLocalState(),renderizarUnidades(),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu renomea\xE7\xE3o da unidade ${a} para ${t}`}),saveLocalState(),openHistoryModal(),showToast("Renomea\xE7\xE3o desfeita.","success");return}if(e.type==="update_unit_labels"){const{unitName:t,metaBefore:a}=e;a&&(unitMetadata[t]=a),saveLocalState(),renderizarUnidades(),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu r\xF3tulo da unidade ${t}`}),saveLocalState(),openHistoryModal(),showToast("R\xF3tulo desfeito.","success");return}if(e.type==="bulk_update"){e.items.forEach(t=>{const a=currentData.find(o=>o.id===t.id);a&&(a.posto=t.posto,a.escala=t.escala)}),saveLocalState(),renderizarUnidades(),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Desfazer",detalhe:`Reverteu a\xE7\xE3o em massa (${e.actionLabel||"atualiza\xE7\xE3o"})`}),saveLocalState(),openHistoryModal(),showToast("A\xE7\xE3o em massa desfeita.","success");return}showToast("N\xE3o foi poss\xEDvel desfazer esta altera\xE7\xE3o.","error")}function buildDefaultSupervisaoMenu(){const e=JSON.parse(JSON.stringify(SUPERVISAO_DEFAULT_MENU||{}));return e.meta||(e.meta={}),e.meta.version=e.meta.version||1,e.meta.updatedAt=new Date().toISOString(),e.meta.updatedBy=e.meta.updatedBy||"Sistema",e.items=Array.isArray(e.items)?e.items:[],e.items=e.items.map(t=>normalizeSupervisaoItem(t)),e}function createSupervisaoId(){return`sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,7)}`}function normalizeSupervisaoItem(e){const t={...e||{}};return t.id||(t.id=createSupervisaoId()),SUPERVISAO_CATEGORIES[t.category]||(t.category="colab"),t.type=t.type==="link"?"link":"message",Array.isArray(t.links)||(t.links=[]),t.links=t.links.filter(a=>a&&a.url),Array.isArray(t.images)||(t.images=[]),t.images=t.images.filter(Boolean),t}function cloneSupervisaoItem(e){if(!e)return null;try{return JSON.parse(JSON.stringify(e))}catch{return{...e}}}function ensureSupervisaoMenu(){if(!supervisaoMenu||!Array.isArray(supervisaoMenu.items)){supervisaoMenu=buildDefaultSupervisaoMenu(),saveSupervisaoMenu(!0);return}supervisaoMenu.meta||(supervisaoMenu.meta={}),supervisaoMenu.meta.version=supervisaoMenu.meta.version||1,supervisaoMenu.meta.updatedAt||(supervisaoMenu.meta.updatedAt=new Date().toISOString()),supervisaoMenu.meta.updatedBy||(supervisaoMenu.meta.updatedBy="Sistema"),supervisaoMenu.items=supervisaoMenu.items.map(e=>normalizeSupervisaoItem(e))}function loadSupervisaoMenu(){try{const e=localStorage.getItem("supervisaoMenu");supervisaoMenu=e?JSON.parse(e):null}catch{supervisaoMenu=null}ensureSupervisaoMenu()}function saveSupervisaoMenu(e=!1){supervisaoMenu&&(localStorage.setItem("supervisaoMenu",JSON.stringify(supervisaoMenu)),scheduleLocalSync("supervisao-menu",{silent:e,notify:!e}))}function loadSupervisaoHistory(){try{const e=localStorage.getItem("supervisaoHistory");supervisaoHistory=e?JSON.parse(e)||[]:[]}catch{supervisaoHistory=[]}}function saveSupervisaoHistory(e=!1){localStorage.setItem("supervisaoHistory",JSON.stringify(supervisaoHistory)),scheduleLocalSync("supervisao-history",{silent:e,notify:!e})}function loadSupervisaoFavorites(){try{const e=localStorage.getItem("supervisaoFavorites"),t=e?JSON.parse(e)||[]:[];supervisaoFavorites=new Set(t)}catch{supervisaoFavorites=new Set}}function saveSupervisaoFavorites(){localStorage.setItem("supervisaoFavorites",JSON.stringify(Array.from(supervisaoFavorites)))}function loadSupervisaoUsage(){try{const e=localStorage.getItem("supervisaoUsage");supervisaoUsage=e?JSON.parse(e)||{}:{}}catch{supervisaoUsage={}}}function saveSupervisaoUsage(){localStorage.setItem("supervisaoUsage",JSON.stringify(supervisaoUsage))}function loadSupervisaoChannelPrefs(){try{const e=localStorage.getItem("supervisaoChannels");supervisaoChannelPrefs=e?JSON.parse(e)||{}:{}}catch{supervisaoChannelPrefs={}}}function saveSupervisaoChannelPrefs(){localStorage.setItem("supervisaoChannels",JSON.stringify(supervisaoChannelPrefs))}function getSupervisaoItems(){return supervisaoMenu?.items||[]}function getSupervisaoItemById(e){return getSupervisaoItems().find(t=>t.id===e)||null}function touchSupervisaoMeta(){supervisaoMenu&&(supervisaoMenu.meta||(supervisaoMenu.meta={}),supervisaoMenu.meta.updatedAt=new Date().toISOString(),supervisaoMenu.meta.updatedBy=SiteAuth.user||"Admin")}function getSupervisaoLinks(e){const t=[];return e?.link&&t.push({label:"Link principal",url:e.link}),(e?.links||[]).forEach(a=>{!a||!a.url||t.push({label:a.label||"Link extra",url:a.url})}),t}function getSupervisaoMessage(e,t){if(!e)return"";const a=e.channels||{};return t==="email"?a.email||e.message||"":a.whatsapp||e.message||""}function getSupervisaoPreferredChannel(e){if(!e)return"whatsapp";const t=supervisaoChannelPrefs[e.id];if(t)return t;const a=e.channels||{};return a.whatsapp?"whatsapp":a.email?"email":"whatsapp"}function setSupervisaoChannelPref(e,t){!e||!t||(supervisaoChannelPrefs[e]=t,saveSupervisaoChannelPrefs(),renderSupervisao())}function toggleSupervisaoFavorite(e){e&&(supervisaoFavorites.has(e)?supervisaoFavorites.delete(e):supervisaoFavorites.add(e),saveSupervisaoFavorites(),renderSupervisao())}function trackSupervisaoUsage(e,t){if(!e||!t)return;const a=supervisaoUsage[e]||{open:0,copy:0,send:0,lastUsedAt:null};a[t]!==void 0&&(a[t]+=1),a.lastUsedAt=new Date().toISOString(),supervisaoUsage[e]=a,saveSupervisaoUsage()}function getSupervisaoUsageTotal(e){const t=supervisaoUsage[e];return t?(t.open||0)+(t.copy||0)+(t.send||0):0}function getSupervisaoUsageInfo(e){const t=supervisaoUsage[e];return t?{open:t.open||0,copy:t.copy||0,send:t.send||0,total:getSupervisaoUsageTotal(e),lastUsedAt:t.lastUsedAt||null}:{open:0,copy:0,send:0,total:0,lastUsedAt:null}}function syncSupervisaoOpenStatesFromDom(){document.querySelectorAll(".supervisao-message").forEach(e=>{const a=e.closest("[data-supervisao-id]")?.getAttribute("data-supervisao-id");a&&(e.open?supervisaoOpenMessages.add(a):supervisaoOpenMessages.delete(a))})}function formatSupervisaoDateTime(e){try{return new Date(e).toLocaleString()}catch{return e||""}}function getSupervisaoExpiryInfo(e){if(!e?.expiresAt)return null;const t=new Date(e.expiresAt);if(Number.isNaN(t.getTime()))return{label:"Validade inv\xE1lida",status:"invalid"};const a=new Date,o=Math.ceil((t.getTime()-a.getTime())/864e5);return o<0?{label:`Expirado em ${formatDateOnly(t)}`,status:"expired"}:o===0?{label:"Expira hoje",status:"due"}:o<=7?{label:`Vence em ${o} dia(s)`,status:"due"}:{label:`Vence em ${formatDateOnly(t)}`,status:"ok"}}function isSupervisaoItemExpired(e){const t=getSupervisaoExpiryInfo(e);return t&&t.status==="expired"}function isValidHttpUrl(e){if(!e)return!1;try{const t=new URL(e);return t.protocol==="http:"||t.protocol==="https:"}catch{return!1}}function getSupervisaoInvalidLinks(e){const t=[];return e?.link&&!isValidHttpUrl(e.link)&&t.push(e.link),(e?.links||[]).forEach(a=>{a?.url&&!isValidHttpUrl(a.url)&&t.push(a.url)}),t}function matchesSupervisaoSearch(e,t){if(!t)return!0;const a=[e.title,e.description,e.message,e.link,...(e.links||[]).map(o=>`${o.label||""} ${o.url||""}`),e.channels?.whatsapp,e.channels?.email].filter(Boolean).join(" ");return normalizeText(a).includes(normalizeText(t))}function applySupervisaoFilters(e,t){let a=e.filter(o=>matchesSupervisaoSearch(o,t));return isAdminRole()||(a=a.filter(o=>!isSupervisaoItemExpired(o))),supervisaoFilter==="favorites"?a=a.filter(o=>supervisaoFavorites.has(o.id)):supervisaoFilter==="used"?a=a.filter(o=>getSupervisaoUsageTotal(o.id)>0).sort((o,n)=>getSupervisaoUsageTotal(n.id)-getSupervisaoUsageTotal(o.id)):supervisaoFilter==="expired"?a=a.filter(o=>isSupervisaoItemExpired(o)):SUPERVISAO_CATEGORIES[supervisaoFilter]&&(a=a.filter(o=>o.category===supervisaoFilter)),a}function updateSupervisaoFiltersUI(){document.querySelectorAll("[data-supervisao-filter]").forEach(e=>{const a=e.getAttribute("data-supervisao-filter")===supervisaoFilter;e.classList.toggle("active",a),e.setAttribute("aria-pressed",a?"true":"false")})}function renderSupervisaoMeta(){const e=document.getElementById("supervisao-updated");if(!e||!supervisaoMenu?.meta)return;const t=supervisaoMenu.meta.updatedAt?formatSupervisaoDateTime(supervisaoMenu.meta.updatedAt):"\u2014",a=supervisaoMenu.meta.updatedBy||"Sistema";e.textContent=`\xDAltima revis\xE3o: ${t} \u2022 Respons\xE1vel: ${a}`}function renderSupervisaoTopUsed(){const e=document.getElementById("supervisao-top-used");if(!e)return;let t=getSupervisaoItems().filter(a=>getSupervisaoUsageTotal(a.id)>0);if(isAdminRole()||(t=t.filter(a=>!isSupervisaoItemExpired(a))),SUPERVISAO_CATEGORIES[supervisaoFilter]&&(t=t.filter(a=>a.category===supervisaoFilter)),t=t.sort((a,o)=>getSupervisaoUsageTotal(o.id)-getSupervisaoUsageTotal(a.id)).slice(0,4),!t.length){e.classList.add("hidden"),e.innerHTML="";return}e.classList.remove("hidden"),e.innerHTML=`
        <div class="supervisao-top-header">Mais usados</div>
        <div class="supervisao-top-list">
            ${t.map(a=>`
                <button class="supervisao-top-chip" onclick="focusSupervisaoItem('${a.id}')">${escapeHtml(a.title)}</button>
            `).join("")}
        </div>
    `}function renderSupervisaoCard(e){const t=getSupervisaoLinks(e),a=t.length>0,o=t.length>1?t.slice(1):[],n=getSupervisaoPreferredChannel(e),s=getSupervisaoMessage(e,n),i=!!s,r=e.channels?.whatsapp&&e.channels?.email,l=SUPERVISAO_CATEGORIES[e.category]?.badge||"Item",c=e.type==="link"?"Link":"Mensagem",d=supervisaoFavorites.has(e.id),p=getSupervisaoExpiryInfo(e),g=getSupervisaoInvalidLinks(e),m=n==="email"?"Abrir e-mail":"Enviar",f=r?`Copiar ${n==="email"?"E-mail":"WhatsApp"}`:"Copiar mensagem",u=getSupervisaoUsageInfo(e.id),b=isAdminRole()?`<div class="supervisao-usage">Usos: ${u.total} \u2022 Abrir ${u.open} \u2022 Copiar ${u.copy} \u2022 Enviar ${u.send}${u.lastUsedAt?` \u2022 \xDAltimo: ${formatSupervisaoDateTime(u.lastUsedAt)}`:""}</div>`:"",v=supervisaoOpenMessages.has(e.id),E=i?`
        <details class="supervisao-message" ${v?"open":""}>
            <summary>Mensagem</summary>
            ${r?`
                <div class="supervisao-channel">
                    <button class="filter-chip ${n==="whatsapp"?"active":""}" onclick="setSupervisaoChannelPref('${e.id}', 'whatsapp')">WhatsApp</button>
                    <button class="filter-chip ${n==="email"?"active":""}" onclick="setSupervisaoChannelPref('${e.id}', 'email')">E-mail</button>
                </div>
            `:""}
            <div class="supervisao-message-body">${escapeHtml(s)}</div>
            ${(e.images||[]).length?`
                <div class="supervisao-images">
                    ${(e.images||[]).map($=>`
                        <img src="${escapeHtml($)}" alt="Imagem de apoio" loading="lazy">
                    `).join("")}
                </div>
            `:""}
        </details>
    `:"",k=o.length?`
        <div class="supervisao-link-list">
            ${o.map(($,h)=>`
                <button class="btn btn-secondary btn-small" onclick="openSupervisaoLink('${e.id}', ${h+1})">Abrir ${escapeHtml($.label||"link")}</button>
            `).join("")}
        </div>
    `:"";return`
        <div class="supervisao-card ${p?.status==="expired"?"is-expired":""}" data-supervisao-id="${e.id}">
            <div class="supervisao-card-header">
                <div>
                    <div class="supervisao-card-title">${escapeHtml(e.title||"Sem t\xEDtulo")}</div>
                    ${e.description?`<div class="supervisao-card-desc">${escapeHtml(e.description)}</div>`:""}
                </div>
                <button class="supervisao-fav ${d?"active":""}" onclick="toggleSupervisaoFavorite('${e.id}')" title="Favoritar" aria-label="Favoritar">
                    ${d?ICONS.starFilled:ICONS.star}
                </button>
            </div>
            <div class="supervisao-badges">
                <span class="supervisao-badge ${e.category}">${escapeHtml(l)}</span>
                <span class="supervisao-badge type">${c}</span>
                ${p?`<span class="supervisao-badge ${p.status}">${escapeHtml(p.label)}</span>`:""}
                ${g.length?'<span class="supervisao-badge warning">Link inv\xE1lido</span>':""}
            </div>
            ${k}
            ${E}
            <div class="supervisao-actions">
                ${a?`<button class="btn btn-secondary btn-small" onclick="openSupervisaoLink('${e.id}', 0)">Abrir link</button>`:""}
                ${a&&!i?`<button class="btn btn-secondary btn-small" onclick="copySupervisaoLink('${e.id}', 0)">Copiar link</button>`:""}
                ${i?`<button class="btn btn-secondary btn-small" onclick="copySupervisaoMessage('${e.id}')">${f}</button>`:""}
                ${i?`<button class="btn btn-small" onclick="sendSupervisaoMessage('${e.id}')">${m}</button>`:""}
            </div>
            ${b}
        </div>
    `}function renderSupervisao(){const e=document.getElementById("supervisao-sections");if(!e)return;syncSupervisaoOpenStatesFromDom(),ensureSupervisaoMenu(),!isAdminRole()&&supervisaoFilter==="expired"&&(supervisaoFilter="internal"),updateSupervisaoFiltersUI(),renderSupervisaoMeta(),renderSupervisaoTopUsed();const t=document.getElementById("supervisao-search");t&&supervisaoSearchTerm&&!t.value&&(t.value=supervisaoSearchTerm);const a=t?t.value.trim():supervisaoSearchTerm;supervisaoSearchTerm=a;const o=applySupervisaoFilters(getSupervisaoItems(),a),n=Object.keys(SUPERVISAO_CATEGORIES).map(s=>{const i=o.filter(r=>r.category===s);return i.length?`
            <div class="unit-section supervisao-section" data-category="${s}">
                <h3 class="unit-title">
                    <span>${escapeHtml(SUPERVISAO_CATEGORIES[s].label)} <span class="count-badge">${i.length}</span></span>
                </h3>
                <div class="supervisao-items">
                    ${i.map(renderSupervisaoCard).join("")}
                </div>
            </div>
        `:""}).join("");e.innerHTML=n||'<div class="empty-state">Nenhum item encontrado.</div>'}function bindSupervisaoEvents(){const e=document.querySelector(".supervisao-shell");if(!e||e.dataset.bound==="1")return;e.dataset.bound="1";const t=document.getElementById("supervisao-search");t&&t.addEventListener("input",()=>{supervisaoSearchTerm=t.value.trim(),renderSupervisao()}),document.querySelectorAll("[data-supervisao-filter]").forEach(a=>{a.addEventListener("click",()=>{supervisaoFilter=a.getAttribute("data-supervisao-filter")||"all",renderSupervisao()})}),e.addEventListener("toggle",a=>{const o=a.target?.closest?.(".supervisao-message");if(!o)return;const s=o.closest("[data-supervisao-id]")?.getAttribute("data-supervisao-id");s&&(o.open?supervisaoOpenMessages.add(s):supervisaoOpenMessages.delete(s))})}function openSupervisaoLink(e,t=0){const a=getSupervisaoItemById(e);if(!a)return;const o=getSupervisaoLinks(a),n=o[t]||o[0];if(!n?.url){showToast("Link indispon\xEDvel.","error");return}if(!isValidHttpUrl(n.url)){showToast("Link inv\xE1lido.","error");return}trackSupervisaoUsage(e,"open"),window.open(n.url,"_blank")}function copySupervisaoLink(e,t=0){const a=getSupervisaoItemById(e);if(!a)return;const o=getSupervisaoLinks(a),n=o[t]||o[0];if(!n?.url){showToast("Link indispon\xEDvel.","error");return}if(!isValidHttpUrl(n.url)){showToast("Link inv\xE1lido.","error");return}copyTextToClipboard(n.url),trackSupervisaoUsage(e,"copy")}function copySupervisaoMessage(e){const t=getSupervisaoItemById(e);if(!t)return;const a=getSupervisaoPreferredChannel(t),o=getSupervisaoMessage(t,a);if(!o){showToast("Mensagem indispon\xEDvel.","error");return}copyTextToClipboard(o),trackSupervisaoUsage(e,"copy")}function sendSupervisaoMessage(e){const t=getSupervisaoItemById(e);if(!t)return;const a=getSupervisaoPreferredChannel(t),o=getSupervisaoMessage(t,a);if(!o){showToast("Mensagem indispon\xEDvel.","error");return}if(a==="email"){const n=t.emailTo||"",s=t.emailCc||"",i=t.emailSubject||"",r=new URLSearchParams;i&&r.set("subject",i),s&&r.set("cc",s),o&&r.set("body",o);const l=r.toString(),c=`mailto:${n}${l?`?${l}`:""}`;trackSupervisaoUsage(e,"send"),window.location.href=c;return}trackSupervisaoUsage(e,"send"),openWhatsApp("",o)}function focusSupervisaoItem(e){const t=document.querySelector(`[data-supervisao-id="${e}"]`);t&&(t.classList.add("highlight-unit"),t.scrollIntoView({behavior:"smooth",block:"center"}),setTimeout(()=>t.classList.remove("highlight-unit"),1500))}function canEditSupervisao(){return SiteAuth.logged&&SiteAuth.mode==="edit"&&isAdminRole()}function recordSupervisaoHistory(e,t,a){const o={id:createSupervisaoId(),data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:e,before:cloneSupervisaoItem(t),after:cloneSupervisaoItem(a)};supervisaoHistory.unshift(o),supervisaoHistory=supervisaoHistory.slice(0,200),saveSupervisaoHistory()}function renderSupervisaoAdminList(){const e=document.getElementById("supervisao-admin-list");if(!e)return;const t=getSupervisaoItems(),a=canEditSupervisao();if(!t.length){e.innerHTML='<div class="admin-empty">Nenhum item cadastrado.</div>';return}e.innerHTML=Object.keys(SUPERVISAO_CATEGORIES).map(o=>{const n=t.filter(s=>s.category===o);return n.length?`
            <div class="supervisao-admin-section">
                <div class="supervisao-admin-title">${escapeHtml(SUPERVISAO_CATEGORIES[o].label)}</div>
                ${n.map(s=>{const i=getSupervisaoInvalidLinks(s),r=getSupervisaoExpiryInfo(s);return`
                        <div class="supervisao-admin-row">
                            <div>
                                <strong>${escapeHtml(s.title||"Sem t\xEDtulo")}</strong>
                                <div class="supervisao-admin-meta">${s.type==="link"?"Link":"Mensagem"}${r?` \u2022 ${escapeHtml(r.label)}`:""}${i.length?" \u2022 Link inv\xE1lido":""}</div>
                            </div>
                            <div class="supervisao-admin-actions">
                                ${a?`
                                    <button class="btn-mini btn-secondary" onclick="openSupervisaoEditor('${s.id}')">Editar</button>
                                    <button class="btn-mini btn-danger" onclick="removeSupervisaoItem('${s.id}')">Excluir</button>
                                `:'<span class="supervisao-admin-lock">Somente admin</span>'}
                            </div>
                        </div>
                    `}).join("")}
            </div>
        `:""}).join("")}function renderSupervisaoHistory(){const e=document.getElementById("supervisao-history-list");if(!e)return;if(!supervisaoHistory.length){e.innerHTML='<div class="admin-empty">Nenhuma altera\xE7\xE3o registrada.</div>';return}const t=canEditSupervisao();e.innerHTML=supervisaoHistory.slice(0,20).map((a,o)=>{const n=a.after?.title||a.before?.title||"Item",s=!!a.before&&t;return`
            <div class="supervisao-history-item">
                <div>
                    <strong>${escapeHtml(n)}</strong>
                    <div class="supervisao-history-meta">${escapeHtml(a.data||"")} \u2022 ${escapeHtml(a.responsavel||"")} \u2022 ${escapeHtml(a.acao||"")}</div>
                </div>
                ${s?`<button class="btn-mini btn-secondary" onclick="restoreSupervisaoHistory(${o})">Restaurar</button>`:""}
            </div>
        `}).join("")}function openSupervisaoEditor(e){const t=getSupervisaoItemById(e);t&&(supervisaoEditingId=t.id,document.getElementById("supervisao-editor-id").value=t.id,document.getElementById("supervisao-editor-category").value=t.category||"colab",document.getElementById("supervisao-editor-type").value=t.type||"message",document.getElementById("supervisao-editor-title").value=t.title||"",document.getElementById("supervisao-editor-description").value=t.description||"",document.getElementById("supervisao-editor-link").value=t.link||"",document.getElementById("supervisao-editor-links").value=(t.links||[]).map(a=>`${a.label?`${a.label} | `:""}${a.url||""}`.trim()).join(`
`),document.getElementById("supervisao-editor-message-whatsapp").value=t.channels?.whatsapp||t.message||"",document.getElementById("supervisao-editor-message-email").value=t.channels?.email||"",document.getElementById("supervisao-editor-email-to").value=t.emailTo||"",document.getElementById("supervisao-editor-email-cc").value=t.emailCc||"",document.getElementById("supervisao-editor-email-subject").value=t.emailSubject||"",document.getElementById("supervisao-editor-images").value=(t.images||[]).join(`
`),document.getElementById("supervisao-editor-expires").value=t.expiresAt||"",updateSupervisaoEditorVisibility())}function resetSupervisaoEditor(){supervisaoEditingId=null,document.getElementById("supervisao-editor-id").value="",document.getElementById("supervisao-editor-category").value="colab",document.getElementById("supervisao-editor-type").value="message",document.getElementById("supervisao-editor-title").value="",document.getElementById("supervisao-editor-description").value="",document.getElementById("supervisao-editor-link").value="",document.getElementById("supervisao-editor-links").value="",document.getElementById("supervisao-editor-message-whatsapp").value="",document.getElementById("supervisao-editor-message-email").value="",document.getElementById("supervisao-editor-email-to").value="",document.getElementById("supervisao-editor-email-cc").value="",document.getElementById("supervisao-editor-email-subject").value="",document.getElementById("supervisao-editor-images").value="",document.getElementById("supervisao-editor-expires").value="",updateSupervisaoEditorVisibility()}function updateSupervisaoEditorVisibility(){const e=document.getElementById("supervisao-editor-type")?.value||"message",t=document.getElementById("supervisao-editor-message-group");t&&t.classList.toggle("hidden",e!=="message")}function parseSupervisaoLinks(e){return e?e.split(`
`).map(t=>t.trim()).filter(Boolean).map(t=>{const a=t.split("|").map(o=>o.trim()).filter(Boolean);return a.length===1?{label:"Link extra",url:a[0]}:{label:a[0],url:a.slice(1).join(" | ")}}).filter(t=>t.url):[]}function parseSupervisaoImages(e){return e?e.split(`
`).map(t=>t.trim()).filter(Boolean):[]}function validateSupervisaoItem(e){const t=[];if(e.title||t.push("Informe o t\xEDtulo."),e.link&&!isValidHttpUrl(e.link)&&t.push("Link principal inv\xE1lido."),(e.links||[]).forEach(a=>{a.url&&!isValidHttpUrl(a.url)&&t.push(`Link inv\xE1lido: ${a.url}`)}),e.expiresAt){const a=new Date(e.expiresAt);Number.isNaN(a.getTime())&&t.push("Data de validade inv\xE1lida.")}return e.type==="link"&&!e.link&&!(e.links||[]).length&&t.push("Informe ao menos um link."),e.type==="message"&&!e.messageWhatsapp&&!e.messageEmail&&t.push("Informe ao menos uma mensagem."),t}function collectSupervisaoEditorData(){return{id:document.getElementById("supervisao-editor-id")?.value.trim()||"",category:document.getElementById("supervisao-editor-category")?.value||"colab",type:document.getElementById("supervisao-editor-type")?.value||"message",title:document.getElementById("supervisao-editor-title")?.value.trim()||"",description:document.getElementById("supervisao-editor-description")?.value.trim()||"",link:document.getElementById("supervisao-editor-link")?.value.trim()||"",links:parseSupervisaoLinks(document.getElementById("supervisao-editor-links")?.value||""),messageWhatsapp:document.getElementById("supervisao-editor-message-whatsapp")?.value.trim()||"",messageEmail:document.getElementById("supervisao-editor-message-email")?.value.trim()||"",emailTo:document.getElementById("supervisao-editor-email-to")?.value.trim()||"",emailCc:document.getElementById("supervisao-editor-email-cc")?.value.trim()||"",emailSubject:document.getElementById("supervisao-editor-email-subject")?.value.trim()||"",images:parseSupervisaoImages(document.getElementById("supervisao-editor-images")?.value||""),expiresAt:document.getElementById("supervisao-editor-expires")?.value||""}}function saveSupervisaoItem(){if(!canEditSupervisao()){showToast("Apenas admins em modo edi\xE7\xE3o podem salvar.","error");return}ensureSupervisaoMenu();const e=collectSupervisaoEditorData(),t=validateSupervisaoItem(e);if(t.length){showToast(t[0],"error");return}const a=normalizeSupervisaoItem({id:e.id||createSupervisaoId(),category:e.category,type:e.type,title:e.title,description:e.description,link:e.link||"",links:e.links||[],images:e.images||[],expiresAt:e.expiresAt||"",emailTo:e.emailTo||"",emailCc:e.emailCc||"",emailSubject:e.emailSubject||""});e.type==="message"&&(e.messageWhatsapp||e.messageEmail)&&(a.channels={},e.messageWhatsapp&&(a.channels.whatsapp=e.messageWhatsapp),e.messageEmail&&(a.channels.email=e.messageEmail));const o=supervisaoMenu.items.findIndex(s=>s.id===a.id),n=o>=0?{...supervisaoMenu.items[o]}:null;o>=0?(supervisaoMenu.items[o]=a,recordSupervisaoHistory("Atualiza\xE7\xE3o",n,a)):(supervisaoMenu.items.push(a),recordSupervisaoHistory("Cria\xE7\xE3o",null,a)),touchSupervisaoMeta(),saveSupervisaoMenu(),renderSupervisao(),renderSupervisaoAdminList(),renderSupervisaoHistory(),showToast("Item salvo com sucesso.","success"),resetSupervisaoEditor()}function removeSupervisaoItem(e){if(!canEditSupervisao()){showToast("Apenas admins em modo edi\xE7\xE3o podem excluir.","error");return}if(!confirm("Remover este item?"))return;const t=supervisaoMenu.items.findIndex(o=>o.id===e);if(t<0)return;const a={...supervisaoMenu.items[t]};supervisaoMenu.items.splice(t,1),recordSupervisaoHistory("Exclus\xE3o",a,null),touchSupervisaoMeta(),saveSupervisaoMenu(),renderSupervisao(),renderSupervisaoAdminList(),renderSupervisaoHistory(),showToast("Item removido.","success")}function restoreSupervisaoHistory(e){if(!canEditSupervisao()){showToast("Apenas admins em modo edi\xE7\xE3o podem restaurar.","error");return}const t=supervisaoHistory[e];if(!t?.before||!confirm("Restaurar a vers\xE3o anterior deste item?"))return;const a=normalizeSupervisaoItem(t.before),o=supervisaoMenu.items.findIndex(n=>n.id===a.id);o>=0?supervisaoMenu.items[o]=a:supervisaoMenu.items.push(a),recordSupervisaoHistory("Restaura\xE7\xE3o",t.after||null,a),touchSupervisaoMeta(),saveSupervisaoMenu(),renderSupervisao(),renderSupervisaoAdminList(),renderSupervisaoHistory(),showToast("Vers\xE3o restaurada.","success")}function openAvisosTab(){if(!SiteAuth.logged){showToast("Fa\xE7a login para acessar os avisos.","error");return}!appContainer||appContainer.style.display==="none"||(closeAvisosMini(),switchTab("avisos"))}function updateAvisosUI(){const e=document.getElementById("avisos-bell"),t=document.getElementById("avisos-badge"),a=document.getElementById("avisos-tab-badge"),o=getAvisosPendingCount(currentGroup),n=getAvisosAlertCount(currentGroup);e&&(e.classList.toggle("hidden",!SiteAuth.logged),e.classList.toggle("has-pending",n>0)),t&&(n>0?(t.textContent=n,t.classList.remove("hidden")):t.classList.add("hidden")),a&&(n>0?(a.textContent=n,a.classList.remove("hidden")):a.classList.add("hidden")),renderAvisosMini()}function updateLancamentosUI(){currentTab==="lancamentos"&&renderLancamentos()}function getAvisosPendingCount(e){return getAvisosByGroup(e).filter(a=>a.status==="pending").length}function getAvisosAlertCount(e){return!SiteAuth.logged||!SiteAuth.re?0:getAvisosByGroup(e).filter(a=>a.status==="pending"&&a.assignedToRe===SiteAuth.re).length}function getAvisosByGroup(e){let t=avisos;return e&&e!=="todos"&&e!=="all"&&(t=t.filter(a=>a.group===e)),filterAvisosByVisibility(t)}function getPendingAvisosByUnit(e,t){return getAvisosByGroup(t).filter(a=>a.unit===e&&a.status==="pending").length}function getPendingAvisosByCollaborator(e,t){return getAvisosByGroup(t).filter(a=>a.collabRe===e&&a.status==="pending").length}function getPendingRemindersByUnit(e,t){return getAvisosByGroup(t).filter(a=>a.unit===e&&a.status==="pending"&&a.reminderEnabled).length}function getPendingRemindersByCollaborator(e,t){return getAvisosByGroup(t).filter(a=>a.collabRe===e&&a.status==="pending"&&a.reminderEnabled).length}function getPendingByAssignee(e){return avisos.filter(t=>t.assignedToRe===e&&t.status==="pending").length}function initAvisosFilters(){const e=document.getElementById("aviso-unit-filter"),t=document.getElementById("aviso-group-filter"),a=document.getElementById("aviso-assignee-filter");if(t)if(isAdminRole())currentGroup!=="todos"&&(t.value=currentGroup);else{const o=getUserGroupKey();o&&o!=="todos"&&(t.value=o),t.disabled=!0}e&&(e.innerHTML='<option value="all">Todas as Unidades</option>'),updateAvisoAssigneeFilter(),refreshAvisoUnitFilterOptions(),updateAvisoAssignees()}function updateAvisoAssigneeFilter(){const e=document.getElementById("aviso-assignee-filter");if(e){if(!isAdminRole()&&SiteAuth.re){e.innerHTML=`<option value="${SiteAuth.re}">Somente meus</option>`,e.value=SiteAuth.re,e.disabled=!0;return}e.disabled=!1,e.innerHTML='<option value="all">Todos os respons\xE1veis</option>'+SiteAuth.admins.map(t=>{const a=t.re||t.email||"",o=t.name||t.email||a;return a?`<option value="${a}">${o}</option>`:""}).join("")}}function refreshAvisoUnitFilterOptions(){const e=document.getElementById("aviso-unit-filter");if(!e)return;const t=document.getElementById("aviso-group-filter")?.value||currentGroup||"todos",a=[...new Set(currentData.filter(o=>t==="todos"||t==="all"||o.grupo===t).map(o=>o.posto).filter(Boolean))].sort();e.innerHTML='<option value="all">Todas as Unidades</option>'+a.map(o=>`<option value="${o}">${o}</option>`).join("")}function renderAvisoCard(e){return`
        <div class="aviso-card ${e.status==="pending"?"pending":"done"} ${isAvisoOverdue(e)?"overdue":""}" data-aviso-id="${e.id}">
            <div class="aviso-meta">
                <span class="aviso-priority ${e.priority}">${e.priority.toUpperCase()}</span>
                <span>${formatAvisoDate(e.createdAt)}</span>
                <span>${e.group?.toUpperCase()||"GERAL"}</span>
            </div>
            <div class="aviso-scope">
                ${e.unit?`<strong>Unidade:</strong> ${e.unit}`:""}
                ${e.collabName?`<span> \u2022 <strong>Colaborador:</strong> ${e.collabName} (${e.collabRe})</span>`:""}
            </div>
            <div class="aviso-flags">
                ${e.simple?'<span class="aviso-flag simple">Mensagem</span>':""}
                ${e.collabRe?'<span class="aviso-flag">Colaborador</span>':""}
                ${e.reminderEnabled?'<span class="aviso-flag reminder">Lembrete</span>':""}
                ${e.assignedToName?`<span class="aviso-flag assigned">Destinado: ${e.assignedToName}</span>`:""}
            </div>
            <div class="aviso-title">${e.title||"Aviso"}</div>
            ${e.reminderEnabled&&e.reminderNextAt?`<div class="aviso-reminder-meta">Lembrete: ${formatAvisoDate(e.reminderNextAt)}</div>`:""}
            <div class="aviso-message">${e.message}</div>
            <div class="aviso-footer">
                <span>Por ${e.createdBy||"Sistema"}</span>
                <div class="aviso-actions">
                    ${e.reminderEnabled?`
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${e.id}', 30)">+30m</button>
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${e.id}', 120)">+2h</button>
                        <button class="btn-mini btn-secondary" onclick="snoozeAviso('${e.id}', 1440)">+1d</button>
                    `:""}
                    <select class="aviso-status-select" onchange="setAvisoStatus('${e.id}', this.value)">
                        <option value="pending" ${e.status==="pending"?"selected":""}>Pendente</option>
                        <option value="done" ${e.status==="done"?"selected":""}>Conclu\xEDdo</option>
                    </select>
                </div>
            </div>
            <div class="aviso-timeline">
                <span>Criado: ${formatAvisoDate(e.createdAt)}</span>
                ${e.status==="done"&&e.doneAt?`<span>\u2022 Conclu\xEDdo: ${formatAvisoDate(e.doneAt)} (${e.doneBy||"Sistema"})</span>`:""}
            </div>
        </div>
    `}function renderAvisos(){const e=document.getElementById("avisos-list"),t=document.getElementById("avisos-assignee-summary");if(!e)return;if(!SiteAuth.logged){e.innerHTML='<p class="empty-state">Fa\xE7a login para ver os avisos.</p>',t&&(t.textContent="");return}refreshAvisoUnitFilterOptions();const a=document.getElementById("aviso-group-filter")?.value||currentGroup||"todos",o=document.getElementById("aviso-status-filter")?.value||"pending",n=document.getElementById("aviso-assignee-filter")?.value||"all",s=document.getElementById("aviso-priority-filter")?.value||"all",i=document.getElementById("aviso-unit-filter")?.value||"all";let r=getAvisosByGroup(a==="all"?"todos":a);if(o!=="all"&&(r=r.filter(c=>c.status===o)),n!=="all"&&(r=r.filter(c=>c.assignedToRe===n)),s!=="all"&&(r=r.filter(c=>c.priority===s)),i!=="all"&&(r=r.filter(c=>c.unit===i)),t&&SiteAuth.re){const c=getPendingByAssignee(SiteAuth.re);t.textContent=c?`Pend\xEAncias comigo: ${c}`:""}if(!r.length){e.innerHTML='<p class="empty-state">Nenhum aviso encontrado.</p>';return}const l=r.sort((c,d)=>new Date(d.createdAt)-new Date(c.createdAt));if(o==="all"){const c=l.filter(p=>p.status==="pending"),d=l.filter(p=>p.status!=="pending");e.innerHTML=`
            <div class="avisos-section">
                <div class="avisos-section-title">Pendentes (${c.length})</div>
                <div class="avisos-section-body">
                    ${c.length?c.map(renderAvisoCard).join(""):'<p class="empty-state">Nenhum aviso pendente.</p>'}
                </div>
            </div>
            <div class="avisos-section">
                <div class="avisos-section-title">Conclu\xEDdos (${d.length})</div>
                <div class="avisos-section-body">
                    ${d.length?d.map(renderAvisoCard).join(""):'<p class="empty-state">Nenhum aviso conclu\xEDdo.</p>'}
                </div>
            </div>
        `;return}e.innerHTML=l.map(renderAvisoCard).join("")}function isAvisoOverdue(e){if(e.status!=="pending")return!1;if(e.reminderEnabled&&e.reminderNextAt){const o=new Date(e.reminderNextAt).getTime();if(o&&Date.now()>o)return!0}if(e.priority!=="urgente")return!1;const t=new Date(e.createdAt).getTime();return t?(Date.now()-t)/36e5>=2:!1}function formatAvisoDate(e){try{return new Date(e).toLocaleString()}catch{return e||""}}function formatDateOnly(e){try{return new Date(e).toLocaleDateString()}catch{return e||""}}function openAvisoForm(){if(!isAdminRole()){showToast("Apenas admins podem criar avisos.","error");return}const e=document.getElementById("aviso-form");e&&(e.classList.remove("hidden"),document.getElementById("lembrete-form")?.classList.add("hidden"),hydrateAvisoForm())}function closeAvisoForm(){const e=document.getElementById("aviso-form");e&&e.classList.add("hidden")}function openLembreteForm(){if(!SiteAuth.logged){showToast("Fa\xE7a login para criar lembretes.","error");return}const e=document.getElementById("lembrete-form");e&&(e.classList.remove("hidden"),document.getElementById("aviso-form")?.classList.add("hidden"),hydrateLembreteForm(),updateLembreteScope())}function closeLembreteForm(){const e=document.getElementById("lembrete-form");e&&e.classList.add("hidden")}function hydrateAvisoForm(){const e=document.getElementById("aviso-group-select"),t=document.getElementById("aviso-unit-select"),a=document.getElementById("aviso-collab-select"),o=document.getElementById("aviso-assignee-select");e&&(e.innerHTML=getGroupOptionsHtml(),e.disabled=!canViewAllGroups());const n=e?.value||currentGroup,s=[...new Set(currentData.filter(r=>r.grupo===n).map(r=>r.posto).filter(Boolean))].sort();t&&(t.innerHTML=s.map(r=>`<option value="${r}">${r}</option>`).join(""));const i=currentData.filter(r=>r.grupo===n).sort((r,l)=>r.nome.localeCompare(l.nome));a&&(a.innerHTML=i.map(r=>`<option value="${r.re}" data-search="${r.nome} ${r.re}">${r.nome} (${r.re})</option>`).join("")),o&&(o.innerHTML=SiteAuth.admins.map(r=>{const l=r.re||r.email||"",c=r.name||r.email||l,d=ROLE_LABELS[r.role]||r.role||"Operacional";return l?`<option value="${l}">${c} (${d})</option>`:""}).join(""),SiteAuth.re&&(o.value=SiteAuth.re),o.disabled=!isAdminRole()),updateAvisoType()}function updateAvisoScope(){const e=document.getElementById("aviso-scope-select")?.value||"unit",t=document.getElementById("aviso-collab-group");t&&(t.classList.toggle("hidden",e!=="collab"),e==="collab"&&syncAvisoUnitWithCollab())}function updateAvisoType(){const e=document.getElementById("aviso-type")?.value||"full";if(document.querySelectorAll(".aviso-advanced").forEach(a=>{e==="simple"?a.classList.add("hidden"):a.id!=="aviso-collab-group"&&a.classList.remove("hidden")}),e==="simple"){const a=document.getElementById("aviso-scope-select");a&&(a.value="unit")}e!=="simple"&&updateAvisoScope()}function updateAvisoAssignees(){const e=document.getElementById("aviso-assignee-select");e&&(e.innerHTML=SiteAuth.admins.map(t=>{const a=t.re||t.email||"",o=t.name||t.email||a,n=ROLE_LABELS[t.role]||t.role||"Operacional";return a?`<option value="${a}">${o} (${n})</option>`:""}).join(""),SiteAuth.re&&(e.value=SiteAuth.re),e.disabled=!isAdminRole())}function hydrateLembreteForm(){const e=document.getElementById("reminder-group-select"),t=document.getElementById("reminder-unit-select"),a=document.getElementById("reminder-collab-select"),o=document.getElementById("reminder-assignee-select");e&&(e.innerHTML=getGroupOptionsHtml(),e.disabled=!canViewAllGroups());const n=e?.value||currentGroup,s=[...new Set(currentData.filter(r=>r.grupo===n).map(r=>r.posto).filter(Boolean))].sort();t&&(t.innerHTML=s.map(r=>`<option value="${escapeHtml(r)}">${escapeHtml(r)}</option>`).join(""));const i=currentData.filter(r=>r.grupo===n).sort((r,l)=>r.nome.localeCompare(l.nome));a&&(a.innerHTML=i.map(r=>`<option value="${escapeHtml(r.re)}" data-search="${escapeHtml(r.nome)} ${escapeHtml(r.re)}">${escapeHtml(r.nome)} (${escapeHtml(r.re)})</option>`).join("")),o&&(o.innerHTML=SiteAuth.admins.map(r=>{const l=r.re||r.email||"",c=r.name||r.email||l,d=ROLE_LABELS[r.role]||r.role||"Operacional";return l?`<option value="${escapeHtml(l)}">${escapeHtml(c)} (${escapeHtml(d)})</option>`:""}).join(""),SiteAuth.re&&(o.value=SiteAuth.re),o.disabled=!isAdminRole())}function filterAvisoCollabs(){const e=document.getElementById("aviso-collab-search"),t=document.getElementById("aviso-collab-select"),a=document.getElementById("aviso-scope-select");if(!e||!t)return;const o=e.value.trim().toUpperCase();o&&a&&a.value!=="collab"&&(a.value="collab",updateAvisoScope());const n=Array.from(t.options);let s=null;n.forEach(i=>{const r=(i.getAttribute("data-search")||"").toUpperCase(),l=!o||r.includes(o);i.hidden=!l,l&&!s&&(s=i),o&&r.startsWith(o)&&(s=i)}),s&&(t.value=s.value),syncAvisoUnitWithCollab()}function updateLembreteScope(){const e=document.getElementById("reminder-scope-select")?.value||"unit",t=document.getElementById("reminder-collab-group");t&&(t.classList.toggle("hidden",e!=="collab"),e==="collab"&&syncLembreteUnitWithCollab())}function filterLembreteCollabs(){const e=document.getElementById("reminder-collab-search"),t=document.getElementById("reminder-collab-select"),a=document.getElementById("reminder-scope-select");if(!e||!t)return;const o=e.value.trim().toUpperCase();o&&a&&a.value!=="collab"&&(a.value="collab",updateLembreteScope());const n=Array.from(t.options);let s=null;n.forEach(i=>{const r=(i.getAttribute("data-search")||"").toUpperCase(),l=!o||r.includes(o);i.hidden=!l,l&&!s&&(s=i),o&&r.startsWith(o)&&(s=i)}),s&&(t.value=s.value),syncLembreteUnitWithCollab()}function syncAvisoUnitWithCollab(){const e=document.getElementById("aviso-collab-select"),t=document.getElementById("aviso-unit-select");if(!e||!t)return;const a=currentData.find(o=>o.re===e.value);a?.posto&&(t.value=a.posto)}function syncLembreteUnitWithCollab(){const e=document.getElementById("reminder-collab-select"),t=document.getElementById("reminder-unit-select");if(!e||!t)return;const a=currentData.find(o=>o.re===e.value);a?.posto&&(t.value=a.posto)}function createAviso(){if(!SiteAuth.logged){showToast("Fa\xE7a login para criar avisos.","error");return}if(!isAdminRole()){showToast("Apenas admins podem criar avisos.","error");return}const e=document.getElementById("aviso-type")?.value||"full",t=document.getElementById("aviso-assignee-select")?.value||"",a=SiteAuth.admins.find(b=>b.re===t),o=e==="simple"?currentGroup||"todos":document.getElementById("aviso-group-select")?.value||currentGroup,n=e==="simple"?"unit":document.getElementById("aviso-scope-select")?.value||"unit",s=e==="simple"?"":document.getElementById("aviso-unit-select")?.value||"",i=e==="simple"?"":document.getElementById("aviso-collab-select")?.value||"",r=currentData.find(b=>b.re===i),l=e==="simple"?"normal":document.getElementById("aviso-priority-select")?.value||"normal",c=document.getElementById("aviso-title")?.value.trim(),d=document.getElementById("aviso-message")?.value.trim(),p=!1,g="",m="single",f="daily";if(!d){showToast("Digite a mensagem do aviso.","error");return}const u={id:`av-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,group:o,unit:s,collabRe:n==="collab"?i:"",collabName:n==="collab"&&r?.nome||"",assignedToRe:a?.re||"",assignedToName:a?.name||"",priority:l,title:c,message:d,simple:e==="simple",status:"pending",createdAt:new Date().toISOString(),createdBy:SiteAuth.user||"Sistema",reminderEnabled:p,reminderType:m,reminderEvery:f,reminderNextAt:p?g||new Date().toISOString():null};avisos.unshift(u),avisosSeenIds.add(u.id),saveAvisos(),renderAvisos(),flashAvisoCard(u.id),closeAvisoForm(),showToast("Aviso registrado.","success"),playAvisoSound(l)}function createReminder(){if(!SiteAuth.logged){showToast("Fa\xE7a login para criar lembretes.","error");return}const e=document.getElementById("reminder-assignee-select")?.value||"",t=isAdminRole()?e:SiteAuth.re||e;if(!t){showToast("Selecione um respons\xE1vel.","error");return}const a=SiteAuth.admins.find(u=>u.re===t),o=document.getElementById("reminder-group-select")?.value||currentGroup,n=document.getElementById("reminder-scope-select")?.value||"unit",s=document.getElementById("reminder-unit-select")?.value||"",i=document.getElementById("reminder-collab-select")?.value||"",r=currentData.find(u=>u.re===i),l=document.getElementById("reminder-priority-select")?.value||"normal",c=document.getElementById("reminder-title")?.value.trim(),d=document.getElementById("reminder-message")?.value.trim(),p=document.getElementById("reminder-at")?.value||"",g=document.getElementById("reminder-type")?.value||"single",m=document.getElementById("reminder-every")?.value||"daily";if(!d){showToast("Digite a mensagem do lembrete.","error");return}if(n==="collab"&&!i){showToast("Selecione o colaborador do lembrete.","error");return}if(n==="unit"&&!s){showToast("Selecione a unidade do lembrete.","error");return}const f={id:`av-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,group:o,unit:s,collabRe:n==="collab"?i:"",collabName:n==="collab"&&r?.nome||"",assignedToRe:a?.re||"",assignedToName:a?.name||"",priority:l,title:c,message:d,status:"pending",createdAt:new Date().toISOString(),createdBy:SiteAuth.user||"Sistema",reminderEnabled:!0,reminderType:g,reminderEvery:m,reminderNextAt:p||new Date().toISOString()};avisos.unshift(f),avisosSeenIds.add(f.id),saveAvisos(),renderAvisos(),flashAvisoCard(f.id),closeLembreteForm(),showToast("Lembrete registrado.","success"),playAvisoSound(l)}function toggleAvisoStatus(e){const t=avisos.find(o=>o.id===e);if(!t)return;const a=t.status==="pending"?"done":"pending";setAvisoStatus(e,a)}function setAvisoStatus(e,t){const a=avisos.find(o=>o.id===e);a&&(a.status=t==="done"?"done":"pending",a.doneAt=a.status==="done"?new Date().toISOString():null,a.doneBy=a.status==="done"?SiteAuth.user||"Admin":null,a.status==="done"&&(a.reminderNextAt=null),saveAvisos(),renderAvisos(),flashAvisoCard(a.id))}function snoozeAviso(e,t){const a=avisos.find(s=>s.id===e);if(!a)return;const o=a.reminderNextAt?new Date(a.reminderNextAt):new Date,n=new Date(o.getTime()+t*6e4);a.reminderEnabled=!0,a.reminderNextAt=n.toISOString(),saveAvisos(),renderAvisos(),showToast("Lembrete adiado.","success")}function sendAvisoWhatsapp(){const e=document.getElementById("aviso-title")?.value.trim(),t=document.getElementById("aviso-message")?.value.trim();if(!t){showToast("Digite a mensagem do aviso.","error");return}const a=[e,t].filter(Boolean).join(" - ");openWhatsApp("",a)}function sendReminderWhatsapp(){const e=document.getElementById("reminder-title")?.value.trim(),t=document.getElementById("reminder-message")?.value.trim();if(!t){showToast("Digite a mensagem do lembrete.","error");return}const a=[e,t].filter(Boolean).join(" - ");openWhatsApp("",a)}function toggleAvisosMini(){const e=document.getElementById("avisos-mini");e&&(e.classList.toggle("hidden"),renderAvisosMini())}function closeAvisosMini(){document.getElementById("avisos-mini")?.classList.add("hidden")}function renderAvisosMini(){const e=document.getElementById("avisos-mini-list");if(!e)return;if(!SiteAuth.logged){e.innerHTML='<div class="avisos-mini-empty">Fa\xE7a login para ver avisos.</div>';return}let a=getAvisosByGroup(currentGroup||"todos").filter(o=>o.status==="pending");if(SiteAuth.re&&(a=a.filter(o=>o.assignedToRe===SiteAuth.re)),a=a.sort((o,n)=>new Date(n.createdAt)-new Date(o.createdAt)).slice(0,5),!a.length){e.innerHTML='<div class="avisos-mini-empty">Sem pend\xEAncias.</div>';return}e.innerHTML=a.map(o=>`
        <div class="avisos-mini-item ${isAvisoOverdue(o)?"overdue":""}">
            <div class="mini-title">${o.title||"Aviso"}</div>
            <div class="mini-meta">${o.unit||"Geral"} \u2022 ${formatAvisoDate(o.createdAt)}${o.assignedToName?` \u2022 ${o.assignedToName}`:""}</div>
        </div>
    `).join("")}function exportarAvisosMensal(){const e=document.getElementById("aviso-group-filter")?.value||currentGroup||"todos",t=new Date,a=t.getMonth(),o=t.getFullYear(),n=getAvisosByGroup(e==="all"?"todos":e).filter(c=>{const d=new Date(c.createdAt);return d.getMonth()===a&&d.getFullYear()===o});if(!n.length){showToast("Nenhum aviso no m\xEAs atual.","info");return}const s={};n.forEach(c=>{const d=c.unit||"Geral";s[d]||(s[d]={Unidade:d,Total:0,Pendentes:0,Urgentes:0}),s[d].Total+=1,c.status==="pending"&&(s[d].Pendentes+=1),c.priority==="urgente"&&(s[d].Urgentes+=1)});const i=Object.values(s).sort((c,d)=>d.Total-c.Total),r=XLSX.utils.book_new();XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(i),"Avisos por Unidade"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(n),"Avisos Detalhados");const l=`${o}-${String(a+1).padStart(2,"0")}`;XLSX.writeFile(r,`avisos_${l}.xlsx`),showToast("Relat\xF3rio mensal de avisos gerado.","success")}function openAvisosForUnit(e){switchTab("avisos");const t=document.getElementById("aviso-unit-filter"),a=document.getElementById("aviso-group-filter");t&&(t.value=e),a&&currentGroup&&currentGroup!=="todos"&&(a.value=currentGroup),renderAvisos()}function playAvisoSound(e){try{const t=new(window.AudioContext||window.webkitAudioContext),a=(o,n)=>{const s=t.createOscillator(),i=t.createGain();s.frequency.value=n,s.type="sine",s.connect(i),i.connect(t.destination);const r=t.currentTime+o/1e3;i.gain.setValueAtTime(.001,r),i.gain.exponentialRampToValueAtTime(.2,r+.02),i.gain.exponentialRampToValueAtTime(.001,r+.25),s.start(r),s.stop(r+.3)};e==="urgente"?(a(0,800),a(400,800),a(800,800)):a(0,600)}catch{}}function playReminderSound(){try{const e=new(window.AudioContext||window.webkitAudioContext),t=(a,o,n=.35)=>{const s=e.createOscillator(),i=e.createGain();s.frequency.value=o,s.type="sine",s.connect(i),i.connect(e.destination);const r=e.currentTime+a/1e3;i.gain.setValueAtTime(.001,r),i.gain.exponentialRampToValueAtTime(.12,r+.03),i.gain.exponentialRampToValueAtTime(.001,r+n),s.start(r),s.stop(r+n+.05)};t(0,523),t(380,659)}catch{}}function dismissReminderAlerts(){reminderAlertsHidden=!0,document.getElementById("reminder-alerts")?.classList.add("hidden")}function renderReminderAlerts(e){const t=document.getElementById("reminder-alerts"),a=document.getElementById("reminder-alerts-list");if(!(!t||!a)){if(!e.length||reminderAlertsHidden){t.classList.add("hidden");return}a.innerHTML=e.map(o=>`
        <div class="reminder-alert-item">
            <strong>${o.title||"Lembrete"}</strong>
            <div class="reminder-alert-meta">${o.unit?`${o.unit} \u2022 `:""}${formatAvisoDate(o.reminderNextAt)}</div>
            <div class="reminder-alert-meta">${o.message||""}</div>
        </div>
    `).join(""),t.classList.remove("hidden")}}function checkReminderAlerts(){if(!SiteAuth.logged){renderReminderAlerts([]);return}const e=filterAvisosByVisibility(avisos),t=Date.now(),a=e.filter(s=>s.status==="pending"&&s.reminderEnabled&&s.reminderNextAt).filter(s=>new Date(s.reminderNextAt).getTime()<=t);if(!a.length){renderReminderAlerts([]);return}let o=!1,n=!1;a.forEach(s=>{s.reminderLastAlertAt!==s.reminderNextAt&&(s.reminderLastAlertAt=s.reminderNextAt,o=!0,n=!0)}),o&&saveAvisos(!0),n&&(playReminderSound(),reminderAlertsHidden=!1),renderReminderAlerts(a)}function startReminderMonitor(){checkReminderAlerts(),reminderCheckTimer=AppTimerManager.setInterval(APP_TIMERS.reminderCheck,checkReminderAlerts,6e4),AppEventManager.on(document,"visibilitychange",()=>{document.visibilityState==="visible"&&checkReminderAlerts()},!1,{scope:"reminders",key:"reminders-visibility"})}function switchLancamentosTab(e){e==="novo"&&(showToast("Fluxo manual de lan\xE7amento est\xE1 desativado. Integra\xE7\xE3o Supabase pendente.","info"),e="diaria"),currentLancamentosTab=e,renderLancamentos()}function switchLancamentosMode(e="ft"){currentLancamentosMode=e==="troca"?"troca":"ft",currentLancamentosTab==="novo"&&(currentLancamentosTab="diaria"),renderLancamentos()}async function hydrateFtCollabs(){const e=document.getElementById("ft-collab-select");if(!e)return;const a=(await getAllCollaborators()||[]).filter(o=>!currentGroup||currentGroup==="todos"||o.grupo===currentGroup).slice().sort((o,n)=>o.nome.localeCompare(n.nome));e.innerHTML=a.map(o=>`<option value="${escapeHtml(o.re)}" data-search="${escapeHtml(o.nome)} ${escapeHtml(o.re)}" data-unit="${escapeHtml(o.posto||"")}">${escapeHtml(o.nome)} (${escapeHtml(o.re)})</option>`).join("")}async function hydrateFtUnitsScales(){const e=document.getElementById("ft-unit-target"),t=document.getElementById("ft-shift");if(!e||!t)return;const o=(await getAllCollaborators()||[]).filter(i=>!currentGroup||currentGroup==="todos"||i.grupo===currentGroup),n=[...new Set(o.map(i=>i.posto).filter(Boolean))].sort(),s=[...new Set(o.map(i=>i.escala).filter(Boolean))].sort();e.innerHTML=n.map(i=>`<option value="${i}">${i}</option>`).join(""),t.innerHTML=s.map(i=>`<option value="${i}">${i}</option>`).join("")}async function hydrateFtCovering(){const e=document.getElementById("ft-covering-select");if(!e)return;const a=(await getAllCollaborators()||[]).filter(n=>!currentGroup||currentGroup==="todos"||n.grupo===currentGroup).slice().sort((n,s)=>n.nome.localeCompare(s.nome)),o=['<option value="NA" data-search="NA">N\xE3o se aplica</option>'].concat(a.map(n=>`<option value="${n.re}" data-search="${n.nome} ${n.re}" data-phone="${n.telefone||""}">${n.nome} (${n.re})</option>`));e.innerHTML=o.join("")}function hydrateFtReasons(){const e=document.getElementById("ft-reason");if(!e)return;const t=ftReasons.length?ftReasons:CONFIG?.ftReasons||[];e.innerHTML=t.map(a=>`<option value="${a.value}">${a.label}</option>`).join(""),e.addEventListener("change",handleFtReasonChange),handleFtReasonChange()}function handleFtReasonChange(){const e=document.getElementById("ft-reason"),t=document.getElementById("ft-reason-other");!e||!t||t.classList.toggle("hidden",e.value!=="outro")}function getFtReasonLabel(e,t){if(e==="outro"&&t)return t;const a=ftReasons.find(o=>o.value===e);return a?a.label:e}function filterFtCovering(){const e=document.getElementById("ft-covering-search"),t=document.getElementById("ft-covering-select");if(!e||!t)return;const a=e.value.trim().toUpperCase(),o=Array.from(t.options);let n=null;o.forEach(s=>{const i=(s.getAttribute("data-search")||"").toUpperCase(),r=!a||i.includes(a);s.hidden=!r,r&&!n&&(n=s),a&&i.startsWith(a)&&(n=s)}),n&&(t.value=n.value)}function syncFtCoveringSelection(){const e=document.getElementById("ft-covering-other");e&&(e.value="")}function filterFtCollabs(){const e=document.getElementById("ft-search"),t=document.getElementById("ft-collab-select");if(!e||!t)return;const a=e.value.trim().toUpperCase(),o=Array.from(t.options);let n=null;o.forEach(s=>{const i=(s.getAttribute("data-search")||"").toUpperCase(),r=!a||i.includes(a);s.hidden=!r,r&&!n&&(n=s),a&&i.startsWith(a)&&(n=s)}),n&&(t.value=n.value),syncFtUnitWithCollab()}function syncFtUnitWithCollab(){const e=document.getElementById("ft-collab-select"),t=document.getElementById("ft-unit-current"),a=document.getElementById("ft-unit-target"),o=document.getElementById("ft-shift");if(!e||!t)return;const s=e.selectedOptions?.[0]?.getAttribute("data-unit")||"",i=(allCollaboratorsCache.items||[]).find(r=>r.re===e.value);t.value=s,a&&a.dataset.auto!=="0"&&s&&(a.value=s),o&&i?.escala&&o.dataset.auto!=="0"&&(o.value=i.escala)}function selectFtCollabByRe(e){const t=document.getElementById("ft-collab-select"),a=document.getElementById("ft-search");if(!t)return;const o=document.getElementById("ft-unit-target");o&&o.value&&(o.dataset.auto="0"),t.value=e;const n=(allCollaboratorsCache.items||currentData).find(s=>s.re===e||s.re?.endsWith(e));a&&n?.nome&&(a.value=n.nome),syncFtUnitWithCollab()}async function suggestFtCoverageByUnit(){const e=document.getElementById("ft-unit-target"),t=document.getElementById("ft-coverage-suggestions");if(!e||!t)return;const a=e.value?.trim();if(!a){showToast("Selecione a unidade FT.","error");return}await renderCoverageSuggestionsByUnit(a,t,{actionBuilder:o=>`<button class="btn btn-secondary btn-small" onclick="selectFtCollabByRe(${o?.re?JSON.stringify(o.re):"''"})">Usar no lan\xE7amento</button>`})}function parseFtDateParts(e){if(!e)return null;const t=String(e).trim(),a=t.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);if(a)return{y:Number(a[1]),m:Number(a[2]),d:Number(a[3])};const o=t.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);return o?{y:Number(o[3]),m:Number(o[2]),d:Number(o[1])}:null}function normalizeFtDateKey(e){const t=parseFtDateParts(e);if(!t)return"";const a=String(t.y).padStart(4,"0"),o=String(t.m).padStart(2,"0"),n=String(t.d).padStart(2,"0");return`${a}-${o}-${n}`}function getFtItemDateKey(e){return e&&(normalizeFtDateKey(e.date)||normalizeFtDateKey(e.createdAt)||normalizeFtDateKey(e.requestedAt))||""}function getFtItemDateValue(e){const t=normalizeFtDateKey(e?.date);if(t){const n=Date.parse(`${t}T00:00:00`);return Number.isNaN(n)?0:n}const a=Date.parse(e?.createdAt||"");if(!Number.isNaN(a))return a;const o=Date.parse(e?.requestedAt||"");return Number.isNaN(o)?0:o}function formatFtDate(e){if(!e)return"";const t=parseFtDateParts(e);if(t)return new Date(t.y,t.m-1,t.d).toLocaleDateString();try{return new Date(e).toLocaleDateString()}catch{return String(e)}}function formatFtDateShort(e){if(!e)return"";const t=parseFtDateParts(e);return t?`${String(t.d).padStart(2,"0")}/${String(t.m).padStart(2,"0")}`:formatFtDate(e)}function formatFtDateTime(e){if(!e)return"";if(parseFtDateParts(e)&&!String(e).includes("T"))return formatFtDate(e);try{return new Date(e).toLocaleString()}catch{return String(e)}}function getFtOperationalItems(e=ftLaunches){return(e||[]).filter(Boolean)}function applyFtFilters(e){let t=getFtOperationalItems(e);return(ftFilter.from||ftFilter.to)&&(t=t.filter(a=>{const o=normalizeFtDateKey(a?.date);return!(!o||ftFilter.from&&o<ftFilter.from||ftFilter.to&&o>ftFilter.to)})),ftFilter.status!=="all"&&(t=t.filter(a=>a.status===ftFilter.status)),t}function getFtUnitLabel(e){return(e?.unitTarget||e?.unitCurrent||"").trim()||"N/I"}function getFtCollabLabel(e){const t=(e?.collabName||"").trim(),a=(e?.collabRe||"").trim();return t&&a?`${t} (${a})`:t||(a?`RE ${a}`:"N/I")}function getFtStatusLabel(e){return e?.status==="launched"?"LAN\xC7ADO":e?.status==="submitted"?"CONFIRMADO":"PENDENTE"}function getFtSourceInfo(e){const t=String(e?.source||"").trim().toLowerCase();return t==="supabase"?{label:"Supabase",className:"source-supabase"}:t?{label:"Importa\xE7\xE3o legada",className:"source-legacy"}:{label:"Local",className:"source-manual"}}function buildFtHistorySearchText(e){const t=getFtStatusLabel(e);return normalizeText([e?.collabName,e?.collabRe,e?.unitTarget,e?.unitCurrent,e?.reasonRaw,e?.reasonOther,e?.reasonDetail,e?.coveringName,e?.coveringRe,e?.coveringOther,e?.shift,e?.ftTime,e?.status,t,e?.group,e?.sourceGroup].filter(Boolean).join(" "))}function matchesFtHistorySearch(e,t){return t?buildFtHistorySearchText(e).includes(t):!0}function applyFtHistoryFilters(e){let t=applyFtFilters(e);const a=(ftHistoryFilter.unit||"").trim(),o=normalizeText(a);o&&(t=t.filter(i=>normalizeText(getFtUnitLabel(i))===o));const n=(ftHistoryFilter.collab||"").trim();if(n){const i=normalizeText(n);t=t.filter(r=>matchesRe(r.collabRe,n)||normalizeText(r.collabName||"")===i?!0:normalizeText(getFtCollabLabel(r))===i)}const s=normalizeText(ftHistoryFilter.search||"").trim();return s&&(t=t.filter(i=>matchesFtHistorySearch(i,s))),t}function sortFtHistoryItems(e){const t=ftHistoryFilter.sort||"date_desc",a=l=>l==="pending"?0:l==="submitted"?1:l==="launched"?2:3,o=l=>getFtItemDateValue(l),n=l=>getFtItemDateValue({createdAt:l?.createdAt}),s=l=>getFtItemDateValue({requestedAt:l?.requestedAt}),i=l=>getFtUnitLabel(l).toUpperCase(),r=l=>(l?.collabName||"").toUpperCase();return e.slice().sort((l,c)=>t==="date_asc"?o(l)-o(c):t==="date_desc"?o(c)-o(l):t==="created_asc"?n(l)-n(c):t==="created_desc"?n(c)-n(l):t==="requested_asc"?s(l)-s(c):t==="requested_desc"?s(c)-s(l):t==="status"?a(l?.status)-a(c?.status):t==="unit"?i(l).localeCompare(i(c)):t==="collab"?r(l).localeCompare(r(c)):o(c)-o(l))}function getFtHistoryGroupKey(e){const t=normalizeFtDateKey(e?.date);if(t)return t;const a=normalizeFtDateKey(e?.createdAt);if(a)return a;const o=normalizeFtDateKey(e?.requestedAt);return o||"Sem data"}function formatFtHistoryGroupLabel(e){if(!e||e==="Sem data")return"Sem data";const t=new Date(`${e}T00:00:00`);return Number.isNaN(t.getTime())?e:`${["DOM","SEG","TER","QUA","QUI","SEX","S\xC1B"][t.getDay()]||""} \u2022 ${t.toLocaleDateString()}`}function buildFtHistoryGroups(e){const t={};return e.forEach(o=>{const n=getFtHistoryGroupKey(o);t[n]||(t[n]=[]),t[n].push(o)}),Object.keys(t).sort((o,n)=>{if(o==="Sem data")return 1;if(n==="Sem data")return-1;const s=Date.parse(`${o}T00:00:00`),i=Date.parse(`${n}T00:00:00`);return Number.isNaN(s)||Number.isNaN(i)?String(n).localeCompare(String(o)):i-s}).map(o=>({key:o,label:formatFtHistoryGroupLabel(o),items:t[o]}))}function toggleFtHistoryGrouped(){ftHistoryFilter.grouped=!ftHistoryFilter.grouped,renderLancamentosHistorico()}function toggleFtHistoryDetails(e){if(!e)return;ftHistoryExpanded.has(e)?ftHistoryExpanded.delete(e):ftHistoryExpanded.add(e);const t=document.querySelector(`[data-ft-id="${e}"]`),a=t?.querySelector(".lancamento-details"),o=t?.querySelector(".lancamento-toggle");a&&a.classList.toggle("hidden",!ftHistoryExpanded.has(e)),o&&(o.textContent=ftHistoryExpanded.has(e)?"Ocultar detalhes":"Ver detalhes")}function toDateInputValue(e){const t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),o=String(e.getDate()).padStart(2,"0");return`${t}-${a}-${o}`}function setFtDateRange(e){const t=new Date;if(e==="today"){const a=toDateInputValue(t);ftFilter.from=a,ftFilter.to=a}else if(e==="7d"){const a=new Date(t);a.setDate(t.getDate()-6),ftFilter.from=toDateInputValue(a),ftFilter.to=toDateInputValue(t)}else if(e==="30d"){const a=new Date(t);a.setDate(t.getDate()-29),ftFilter.from=toDateInputValue(a),ftFilter.to=toDateInputValue(t)}else if(e==="month"){const a=new Date(t.getFullYear(),t.getMonth(),1);ftFilter.from=toDateInputValue(a),ftFilter.to=toDateInputValue(t)}else ftFilter.from="",ftFilter.to="";renderLancamentos()}function getFtQuickRangePreset(){const e=normalizeFtDateKey(ftFilter.from),t=normalizeFtDateKey(ftFilter.to);if(!e&&!t)return"clear";const a=new Date,o=toDateInputValue(a);if(e===o&&t===o)return"today";const n=new Date(a);if(n.setDate(a.getDate()-6),e===toDateInputValue(n)&&t===o)return"7d";const s=new Date(a);if(s.setDate(a.getDate()-29),e===toDateInputValue(s)&&t===o)return"30d";const i=new Date(a.getFullYear(),a.getMonth(),1);return e===toDateInputValue(i)&&t===o?"month":"custom"}function toggleFtPendingOnly(){ftFilter.status=ftFilter.status==="pending"?"all":"pending",renderLancamentos()}function updateLancamentosHeader(){const e=document.getElementById("lancamentos-sync-status"),t=document.getElementById("lancamentos-last-sync");e&&(e.textContent="Integra\xE7\xE3o Supabase pendente",e.classList.remove("syncing")),t&&(t.textContent="\u2014"),document.querySelectorAll(".ft-sync-info").forEach(a=>{a.textContent="\u2014"})}function updateLancamentosTabs(){const e=applyFtFilters(ftLaunches),t=e.length,a=e.filter($=>$.status==="pending").length,o=new Set(e.map($=>normalizeFtDateKey($?.date)).filter(Boolean)).size,n=getTodayKey(),s=getFtOperationalItems(ftLaunches).filter($=>normalizeFtDateKey($?.date)===n).length,i=document.getElementById("lancamentos-tab-today"),r=document.getElementById("lancamentos-tab-total"),l=document.getElementById("lancamentos-tab-pending"),c=document.getElementById("lancamentos-tab-planning");i&&(i.textContent=s),r&&(r.textContent=t),l&&(l.textContent=a),c&&(c.textContent=o);const d=trocaLaunches.slice(),p=d.filter($=>getTrocaPrimaryDate($)===n).length,g=d.length,m=d.filter($=>$.status==="pending").length,f=new Set(d.map($=>getTrocaPrimaryDate($)).filter(Boolean)).size,u=document.getElementById("lancamentos-tab-troca-today"),b=document.getElementById("lancamentos-tab-troca-total"),v=document.getElementById("lancamentos-tab-troca-pending"),E=document.getElementById("lancamentos-tab-troca-planning");u&&(u.textContent=p),b&&(b.textContent=g),v&&(v.textContent=m),E&&(E.textContent=f);const k=currentLancamentosMode!=="troca";document.querySelectorAll(".lancamentos-tab").forEach($=>{const h=$.getAttribute("data-tab"),T=$.closest(".lancamentos-tabs")?.id==="lancamentos-tabs-ft",R=h===currentLancamentosTab&&(k?T:!T);$.classList.toggle("active",R),$.setAttribute("aria-pressed",R?"true":"false")})}function renderLancamentosFilters(){const e=document.getElementById("lancamentos-filters-wrap");if(!e)return;const t=currentLancamentosMode==="ft"&&currentLancamentosTab!=="diaria";if(e.classList.toggle("hidden",!t),!t)return;const a=getFtQuickRangePreset();e.innerHTML=`
        <div class="lancamentos-filters">
            <div class="form-group">
                <label>De</label>
                <input type="date" id="ft-filter-from" value="${ftFilter.from}">
            </div>
            <div class="form-group">
                <label>At\xE9</label>
                <input type="date" id="ft-filter-to" value="${ftFilter.to}">
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="ft-filter-status">
                    <option value="all" ${ftFilter.status==="all"?"selected":""}>Todos</option>
                    <option value="pending" ${ftFilter.status==="pending"?"selected":""}>Pendentes</option>
                    <option value="submitted" ${ftFilter.status==="submitted"?"selected":""}>Confirmados</option>
                    <option value="launched" ${ftFilter.status==="launched"?"selected":""}>Lan\xE7ados</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-quick">
            <button class="filter-chip ${ftFilter.status==="pending"?"active":""}" onclick="toggleFtPendingOnly()" aria-pressed="${ftFilter.status==="pending"?"true":"false"}">Somente pendentes</button>
            <button class="filter-chip ${a==="today"?"active":""}" onclick="setFtDateRange('today')" aria-pressed="${a==="today"?"true":"false"}">Hoje</button>
            <button class="filter-chip ${a==="7d"?"active":""}" onclick="setFtDateRange('7d')" aria-pressed="${a==="7d"?"true":"false"}">7 dias</button>
            <button class="filter-chip ${a==="30d"?"active":""}" onclick="setFtDateRange('30d')" aria-pressed="${a==="30d"?"true":"false"}">30 dias</button>
            <button class="filter-chip ${a==="month"?"active":""}" onclick="setFtDateRange('month')" aria-pressed="${a==="month"?"true":"false"}">Este m\xEAs</button>
            <button class="filter-chip ${a==="clear"?"active":""}" onclick="setFtDateRange('clear')" aria-pressed="${a==="clear"?"true":"false"}">Limpar datas</button>
        </div>
    `,document.getElementById("ft-filter-from")?.addEventListener("change",o=>{ftFilter.from=o.target.value||"",renderLancamentos()}),document.getElementById("ft-filter-to")?.addEventListener("change",o=>{ftFilter.to=o.target.value||"",renderLancamentos()}),document.getElementById("ft-filter-status")?.addEventListener("change",o=>{ftFilter.status=o.target.value||"all",renderLancamentos()})}function buildReportRows(e){if(!e.length)return'<div class="report-empty">Sem dados.</div>';const t=Math.max(...e.map(a=>a.value),1);return e.map(a=>`
        <div class="report-row">
            <div class="report-label">${a.label}</div>
            <div class="report-bar"><span style="width:${Math.round(a.value/t*100)}%"></span></div>
            <div class="report-value">${a.value}</div>
        </div>
    `).join("")}function buildRecentRows(e,t){return e.length?e.map(a=>`
        <div class="report-row compact">
            <div class="report-label">${a.label}</div>
            <div class="report-value">${a.value}</div>
        </div>
    `).join(""):`<div class="report-empty">${t}</div>`}function getFtWeekdayLabel(e){if(!e)return"";const t=new Date(`${e}T00:00:00`);return Number.isNaN(t.getTime())?"":["DOM","SEG","TER","QUA","QUI","SEX","S\xC1B"][t.getDay()]}function getLancPlanModeKey(){return currentLancamentosMode==="troca"?"troca":"ft"}function ensureLancPlanState(e="ft"){const t=e==="troca"?"troca":"ft";(!lancamentosPlanningState||typeof lancamentosPlanningState!="object")&&(lancamentosPlanningState={}),lancamentosPlanningState[t]||(lancamentosPlanningState[t]={range:"week",anchor:"",selected:""});const a=lancamentosPlanningState[t],o=getTodayKey();return a.range=a.range==="month"?"month":"week",a.anchor=normalizeFtDateKey(a.anchor)||o,a.selected=normalizeFtDateKey(a.selected)||a.anchor,a}function getLancPlanRangeDays(e){if((e?.range||"week")==="month"){const n=getMonthRangeByDateKey(e.anchor),s=[],i=new Date(`${n.start}T00:00:00`),r=Number.isNaN(i.getTime())?0:(i.getDay()+6)%7;for(let c=0;c<r;c++)s.push({key:`pad-start-${c}`,placeholder:!0});let l=n.start;for(;l&&l<=n.end;)s.push({key:l,placeholder:!1}),l=getDateKeyWithOffset(l,1);for(;s.length%7!==0;)s.push({key:`pad-end-${s.length}`,placeholder:!0});return{range:"month",label:n.monthLabel,start:n.start,end:n.end,days:s}}const t=getWeekStartMonday(e?.anchor),a=[];for(let n=0;n<7;n++)a.push({key:getDateKeyWithOffset(t,n),placeholder:!1});const o=a[a.length-1]?.key||t;return{range:"week",label:`${formatFtDate(t)} at\xE9 ${formatFtDate(o)}`,start:t,end:o,days:a}}function buildLancPlanIndexByDay(e="ft"){const t={};if(e==="troca"){const o=trocaLaunches.slice();return o.forEach(n=>{const s=getTrocaPrimaryDate(n);s&&(t[s]||(t[s]=[]),t[s].push(n))}),{items:o,map:t}}const a=applyFtFilters(ftLaunches);return a.forEach(o=>{const n=normalizeFtDateKey(o?.date);n&&(t[n]||(t[n]=[]),t[n].push(o))}),{items:a,map:t}}function getLancPlanDaySummary(e,t=[]){const a=t.length;if(e==="troca"){if(!a)return{tone:"tone-critical",badge:"Sem troca",badgeClass:"none",meta:"Nenhum registro"};const i=t.filter(c=>c?.status==="pending").length,r=t.filter(c=>(c?.errors||[]).length>0).length,l=t.filter(c=>c?.status==="launched").length;return i>0||r>0?{tone:"tone-warning",badge:r>0?`${r} erro${r>1?"s":""}`:`${i} pend.`,badgeClass:r>0?"d":"e",meta:`${a} troca(s), ${l} lan\xE7ada(s)`}:{tone:"tone-normal",badge:`${a} troca${a>1?"s":""}`,badgeClass:"v",meta:"Sem alerta no dia"}}if(!a)return{tone:"tone-critical",badge:"Sem FT",badgeClass:"none",meta:"Sem cobertura registrada"};const o=t.filter(i=>i?.status==="pending").length,n=t.filter(i=>i?.status==="submitted").length,s=t.filter(i=>i?.status==="launched").length;return o>0?{tone:"tone-warning",badge:`${o} pend.`,badgeClass:"d",meta:`${a} FT no dia`}:n>0?{tone:"tone-normal",badge:`${n} conf.`,badgeClass:"e",meta:`${s} lan\xE7ada(s)`}:{tone:"tone-normal",badge:`OK (${s})`,badgeClass:"v",meta:`${a} FT lan\xE7ada(s)`}}function buildLancPlanDetailsFt(e,t=[]){const a=normalizeFtDateKey(e)||getTodayKey(),o=getWeekdayLongPtByDate(a),n=getLancPlanDaySummary("ft",t),s=t.slice().sort((r,l)=>getFtStatusRank(l?.status)-getFtStatusRank(r?.status)),i=s.length?s.map(r=>{const l=r?.collabName||(r?.collabRe?`RE ${r.collabRe}`:"N/I"),c=r?.coveringName||(r?.coveringOther&&r.coveringOther!=="N\xE3o se aplica"?r.coveringOther:"")||(r?.coveringRe?`RE ${r.coveringRe}`:""),d=c?`${l} cobrindo ${c}`:l,p=getFtReasonLabel(r?.reason,r?.reasonOther)||r?.reasonRaw||"N/I";return`
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${r?.status||"pending"}">${escapeHtml(getFtStatusLabel(r))}</span>
                        <strong>${escapeHtml(d)}</strong>
                    </div>
                    <div class="ft-day-item-meta">Unidade: ${escapeHtml(getFtUnitLabel(r))} \u2022 Turno: ${escapeHtml(r?.shift||"N/I")} \u2022 Hor\xE1rio: ${escapeHtml(r?.ftTime||"N/I")}</div>
                    <div class="ft-day-item-meta">Motivo: ${escapeHtml(p)}</div>
                </div>
            `}).join(""):'<p class="empty-state">Sem FT neste dia.</p>';return`
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(o)} \u2022 ${escapeHtml(formatFtDate(a))}</strong>
                <div class="ft-day-header-sub">Vis\xE3o completa das coberturas de FT do dia selecionado.</div>
            </div>
            <span class="ft-month-ft ${n.badgeClass}">${escapeHtml(n.badge)}</span>
        </div>
        <div class="ft-day-list">${i}</div>
    `}function buildLancPlanDetailsTroca(e,t=[]){const a=normalizeFtDateKey(e)||getTodayKey(),o=getWeekdayLongPtByDate(a),n=getLancPlanDaySummary("troca",t),s=t.slice().sort((r,l)=>{const c=Date.parse(r?.createdAt||r?.requestedAt||""),d=Date.parse(l?.createdAt||l?.requestedAt||"");return(Number.isFinite(d)?d:0)-(Number.isFinite(c)?c:0)}),i=s.length?s.map(r=>{const l=r?.requesterName||(r?.requesterRe?`RE ${r.requesterRe}`:"N/I"),c=r?.counterpartName||(r?.counterpartRe?`RE ${r.counterpartRe}`:"N/I"),d=(r?.errors||[]).join(" \u2022 ");return`
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${r?.status||"pending"}">${escapeHtml(getFtStatusLabel(r))}</span>
                        <strong>${escapeHtml(r?.unit||"Unidade n\xE3o informada")} \u2022 REF ${escapeHtml(r?.ref||"N/I")}</strong>
                    </div>
                    <div class="ft-day-item-meta">Solicitante 1: ${escapeHtml(l)} (${escapeHtml(r?.requesterRe||"N/I")})</div>
                    <div class="ft-day-item-meta">Solicitante 2: ${escapeHtml(c)} (${escapeHtml(r?.counterpartRe||"N/I")})</div>
                    ${d?`<div class="ft-day-item-meta">Erros: ${escapeHtml(d)}</div>`:""}
                </div>
            `}).join(""):'<p class="empty-state">Sem trocas neste dia.</p>';return`
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(o)} \u2022 ${escapeHtml(formatFtDate(a))}</strong>
                <div class="ft-day-header-sub">Vis\xE3o completa das trocas registradas no dia selecionado.</div>
            </div>
            <span class="ft-month-ft ${n.badgeClass}">${escapeHtml(n.badge)}</span>
        </div>
        <div class="ft-day-list">${i}</div>
    `}function setLancPlanRange(e="week"){const t=ensureLancPlanState(getLancPlanModeKey());t.range=e==="month"?"month":"week",currentLancamentosTab==="planejamento"&&renderLancamentosPlanejamento()}function shiftLancPlanWindow(e=1){const t=ensureLancPlanState(getLancPlanModeKey()),a=Number(e)<0?-1:1;if(t.range==="month"){const o=normalizeFtDateKey(t.anchor)||getTodayKey(),n=new Date(`${o}T00:00:00`);if(Number.isNaN(n.getTime()))return;n.setDate(1),n.setMonth(n.getMonth()+a),t.anchor=toDateInputValue(n)}else t.anchor=getDateKeyWithOffset(t.anchor,a*7);currentLancamentosTab==="planejamento"&&renderLancamentosPlanejamento()}function jumpLancPlanToday(){const e=ensureLancPlanState(getLancPlanModeKey()),t=getTodayKey();e.anchor=t,e.selected=t,currentLancamentosTab==="planejamento"&&renderLancamentosPlanejamento()}function selectLancPlanDay(e=""){const t=ensureLancPlanState(getLancPlanModeKey()),a=normalizeFtDateKey(e);a&&(t.selected=a,currentLancamentosTab==="planejamento"&&renderLancamentosPlanejamento())}function renderLancamentosPlanejamento(){const e=document.getElementById("lancamentos-panel-planejamento");if(!e)return;const t=getLancPlanModeKey(),a=t==="ft",o=ensureLancPlanState(t),n=getLancPlanRangeDays(o),s=n.days.filter(v=>!v.placeholder);s.some(v=>v.key===o.selected)||(o.selected=s[0]?.key||getTodayKey());const{items:r,map:l}=buildLancPlanIndexByDay(t),c=r.filter(v=>v?.status==="pending").length,d=r.filter(v=>v?.status==="launched").length,p=s.filter(v=>(l[v.key]||[]).length>0).length,g=s.length-p,m=a?0:r.filter(v=>(v?.errors||[]).length>0).length,f=l[o.selected]||[],u=n.days.map(v=>{if(v.placeholder)return'<div class="lanc-plan-day placeholder" aria-hidden="true"></div>';const E=l[v.key]||[],k=getLancPlanDaySummary(t,E),$=new Date(`${v.key}T00:00:00`).getDate(),h=v.key===getTodayKey(),S=v.key===o.selected,T=`${formatFtDate(v.key)} \u2022 ${k.meta}`;return`
            <button type="button" class="ft-month-day lanc-plan-day ${k.tone} ${h?"today":""} ${S?"active":""}" title="${escapeHtml(T)}" onclick="selectLancPlanDay('${v.key}')">
                <span class="ft-month-weekday">${escapeHtml(getWeekdayShortPtByDate(v.key))}</span>
                <span class="ft-month-date">${String($).padStart(2,"0")}</span>
                <span class="ft-month-ft ${k.badgeClass}">${escapeHtml(k.badge)}</span>
                <span class="lanc-plan-meta">${escapeHtml(k.meta)}</span>
            </button>
        `}).join(""),b=a?buildLancPlanDetailsFt(o.selected,f):buildLancPlanDetailsTroca(o.selected,f);e.innerHTML=`
        <div class="lanc-plan-shell">
            <div class="lanc-plan-toolbar">
                <div>
                    <div class="dashboard-title">${a?"PLANEJAMENTO FT":"PLANEJAMENTO TROCA"}</div>
                    <h4>${a?"Cobertura semanal/mensal de FT":"Planejamento semanal/mensal de trocas"}</h4>
                </div>
                <div class="lanc-plan-controls">
                    <div class="lanc-plan-nav">
                        <button class="btn btn-secondary btn-small" onclick="shiftLancPlanWindow(-1)">Anterior</button>
                        <button class="btn btn-secondary btn-small" onclick="jumpLancPlanToday()">Hoje</button>
                        <button class="btn btn-secondary btn-small" onclick="shiftLancPlanWindow(1)">Pr\xF3ximo</button>
                    </div>
                    <button class="filter-chip ${o.range==="week"?"active":""}" onclick="setLancPlanRange('week')">Semanal</button>
                    <button class="filter-chip ${o.range==="month"?"active":""}" onclick="setLancPlanRange('month')">Mensal</button>
                </div>
            </div>
            <div class="lancamentos-kpi">
                <div class="kpi-card"><div class="kpi-label">${a?"FT no per\xEDodo":"Trocas no per\xEDodo"}</div><div class="kpi-value">${r.length}</div><div class="kpi-sub">${n.label}</div></div>
                <div class="kpi-card"><div class="kpi-label">Dias com registros</div><div class="kpi-value">${p}</div><div class="kpi-sub">Total de ${s.length} dias</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${c}</div><div class="kpi-sub">Aguardando tratamento</div></div>
                <div class="kpi-card"><div class="kpi-label">Lan\xE7adas</div><div class="kpi-value">${d}</div><div class="kpi-sub">Status lan\xE7ado</div></div>
                <div class="kpi-card"><div class="kpi-label">${a?"Dias sem FT":"Dias sem troca"}</div><div class="kpi-value">${g}</div><div class="kpi-sub">Aten\xE7\xE3o para planejamento</div></div>
                ${a?"":`<div class="kpi-card"><div class="kpi-label">Com erro</div><div class="kpi-value">${m}</div><div class="kpi-sub">Somente trocas lan\xE7adas</div></div>`}
            </div>
            <div class="ft-month-toolbar">
                <div class="ft-month-title">${escapeHtml(n.label)}</div>
                <div class="ft-month-subtitle">${a?"Clique no dia para ver quem est\xE1 cobrindo quem.":"Clique no dia para ver solicitantes e status."}</div>
            </div>
            <div class="lanc-plan-grid ${n.range}">${u}</div>
            <div class="lanc-plan-legend">
                <span class="lanc-plan-pill tone-normal">Normal</span>
                <span class="lanc-plan-pill tone-warning">Aten\xE7\xE3o</span>
                <span class="lanc-plan-pill tone-critical">Cr\xEDtico</span>
            </div>
            <div class="ft-month-day-details">${b}</div>
        </div>
    `}function renderLancamentos(){ftLaunches=normalizeFtLaunchEntries(ftLaunches);const e=document.getElementById("lancamentos-panel-diaria"),t=document.getElementById("lancamentos-panel-troca"),a=document.getElementById("lancamentos-panel-dashboard"),o=document.getElementById("lancamentos-panel-historico"),n=document.getElementById("lancamentos-panel-planejamento"),s=document.getElementById("lancamentos-panel-novo");if(!e||!t||!a||!o||!n||!s)return;const i=currentLancamentosMode!=="troca";currentLancamentosTab==="novo"&&(currentLancamentosTab="diaria");const r=document.getElementById("lancamentos-main-title");r&&(r.textContent=i?"Lan\xE7amentos FT (Supabase em implanta\xE7\xE3o)":"Lan\xE7amentos Troca de folga"),document.querySelectorAll(".lancamentos-mode-btn").forEach(l=>{const c=l.getAttribute("data-mode");l.classList.toggle("active",c===(i?"ft":"troca"))}),document.getElementById("lancamentos-tabs-ft")?.classList.toggle("hidden",!i),document.getElementById("lancamentos-tabs-troca")?.classList.toggle("hidden",i),document.getElementById("lancamentos-actions-ft")?.classList.toggle("hidden",!i),document.getElementById("lancamentos-actions-troca")?.classList.toggle("hidden",i),e.classList.add("hidden"),t.classList.add("hidden"),a.classList.add("hidden"),o.classList.add("hidden"),n.classList.add("hidden"),s.classList.add("hidden"),updateLancamentosHeader(),updateLancamentosTabs(),renderLancamentosFilters(),!i&&currentLancamentosTab==="diaria"?(t.classList.remove("hidden"),renderLancamentosTroca()):!i&&currentLancamentosTab==="dashboard"?(a.classList.remove("hidden"),renderLancamentosTrocaDashboard()):!i&&currentLancamentosTab==="historico"?(o.classList.remove("hidden"),renderLancamentosTrocaHistorico()):!i&&currentLancamentosTab==="planejamento"?(n.classList.remove("hidden"),renderLancamentosPlanejamento()):i?currentLancamentosTab==="diaria"?(e.classList.remove("hidden"),renderLancamentosDiaria()):currentLancamentosTab==="dashboard"?(a.classList.remove("hidden"),renderLancamentosDashboard()):currentLancamentosTab==="historico"?(o.classList.remove("hidden"),renderLancamentosHistorico()):currentLancamentosTab==="planejamento"?(n.classList.remove("hidden"),renderLancamentosPlanejamento()):(currentLancamentosTab="diaria",e.classList.remove("hidden"),renderLancamentosDiaria()):(currentLancamentosTab="diaria",t.classList.remove("hidden"),renderLancamentosTroca())}function cleanFtText(e){return String(e||"").replace(/\s+/g," ").trim().replace(/;+$/,"").trim()}function normalizeFtRe(e){return String(e||"").replace(/\D/g,"")}function matchesRe(e,t){const a=normalizeFtRe(e),o=normalizeFtRe(t);return!a||!o?!1:a===o||a.endsWith(o)||o.endsWith(a)}function getTodayKey(){const e=new Date,t=e.getFullYear(),a=String(e.getMonth()+1).padStart(2,"0"),o=String(e.getDate()).padStart(2,"0");return`${t}-${a}-${o}`}function normalizeFtStatus(e){const a=cleanFtText(e).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");return a.includes("LANCAD")?"launched":a.includes("CONFIRM")||a.includes("SUBMIT")||a.includes("FORMS")?"submitted":(a.includes("PEND"),"pending")}function normalizeFtReason(e){const t=cleanFtText(e),a=t.toUpperCase();return a?a.includes("FALTA")?{code:"falta",other:""}:a.includes("TROCA")?{code:"troca",other:""}:a.includes("COBERT")?{code:"cobertura",other:""}:a.includes("EVENT")?{code:"evento",other:""}:{code:"outro",other:t}:{code:"outro",other:""}}function isValidFtDateKeyStrict(e){const t=parseFtDateParts(e);if(!t)return!1;const a=new Date().getFullYear();if(t.y<2020||t.y>a+2)return!1;const o=new Date(t.y,t.m-1,t.d);return o.getFullYear()===t.y&&o.getMonth()===t.m-1&&o.getDate()===t.d}function classifyTrocaItemErrors(e){if(!e||e.status!=="launched")return[];const t=[];return e.ref||t.push("Sem REF"),e.unit||t.push("Sem unidade"),e.requesterRe||t.push("Sem RE solicitante 1"),e.counterpartRe||t.push("Sem RE solicitante 2"),e.requesterRe&&e.counterpartRe&&matchesRe(e.requesterRe,e.counterpartRe)&&t.push("RE duplicado"),(!e.requestDate||!isValidFtDateKeyStrict(e.requestDateRaw||e.requestDate))&&t.push("Data solicita\xE7\xE3o inv\xE1lida"),(!e.swapDate||!isValidFtDateKeyStrict(e.swapDateRaw||e.swapDate))&&t.push("Data troca inv\xE1lida"),(!e.paymentDate||!isValidFtDateKeyStrict(e.paymentDateRaw||e.paymentDate))&&t.push("Data pagamento inv\xE1lida"),t}function dedupeTrocaLaunches(e=[]){const t=new Map;return e.forEach(a=>{a?.id&&t.set(a.id,a)}),Array.from(t.values())}function buildTrocaDashboardStats(e=trocaLaunches){const t=(e||[]).filter(i=>i.status==="launched"),a=t.filter(i=>(i.errors||[]).length>0),o={};a.forEach(i=>{(i.errors||[]).forEach(r=>{o[r]=(o[r]||0)+1})});const n=Object.entries(o).sort((i,r)=>r[1]-i[1]).map(([i,r])=>({label:i,value:r})),s=t.length?Math.round(a.length/t.length*100):0;return{total:(e||[]).length,launched:t.length,errors:a.length,errorRate:s,topErrors:n}}async function renderLancamentosNovo(){await hydrateFtCollabs(),await hydrateFtUnitsScales(),await hydrateFtCovering(),hydrateFtReasons();const e=document.getElementById("ft-collab-select");e&&e.options.length&&!e.value&&(e.selectedIndex=0),syncFtUnitWithCollab();const t=document.getElementById("ft-covering-select");t&&t.options.length&&!t.value&&(t.selectedIndex=0),updateFtFormHint(),updateFtPostActions()}function updateFtFormHint(){const e=document.getElementById("ft-form-hint");e&&(e.textContent="Integra\xE7\xE3o de confirma\xE7\xE3o via Supabase ser\xE1 ativada em breve.")}function buildFtDashboardStats(e){const t=e.filter(y=>y.status==="pending").length,a=e.filter(y=>y.status==="submitted").length,o=e.filter(y=>y.status==="launched").length,n=e.length,s=new Set(e.map(y=>normalizeFtDateKey(y?.date)).filter(Boolean)),i=s.size?n/s.size:0,r=n?Math.round(o/n*100):0,l={},c={},d={},p={},g={},m={},f={},u={};let b=0,v=0,E=0;const k=y=>{const w=String(y||"").toLowerCase().trim();return w?!!(w.includes(":")||w.includes(" \xE0s ")||w.includes(" as ")||/^\d{1,2}\s*[-–]\s*\d{1,2}$/.test(w)):!1};e.forEach(y=>{const w=y.unitTarget||y.unitCurrent||"N/I",N=y.collabName||(y.collabRe?`RE ${y.collabRe}`:"N/I"),U=getFtReasonLabel(y.reason,y.reasonOther)||"N/I";let F=y.shift||"N/I",I=(y.ftTime||"").trim()||"N/I";k(F)&&I==="N/I"&&(I=F,F="N/I");const A=getFtWeekdayLabel(normalizeFtDateKey(y?.date)),C=String(y.sourceGroup||y.group||"N/I").toUpperCase();l[w]=(l[w]||0)+1,c[N]=(c[N]||0)+1,d[U]=(d[U]||0)+1,p[F]=(p[F]||0)+1,g[I]=(g[I]||0)+1,A&&(m[A]=(m[A]||0)+1),f[C]=(f[C]||0)+1,y.status==="pending"&&(u[w]=(u[w]||0)+1),!y.unitTarget&&!y.unitCurrent&&b++,y.collabRe||v++,y.date||E++});const $=Object.entries(l).sort((y,w)=>w[1]-y[1]).slice(0,8).map(([y,w])=>({label:y,value:w})),h=Object.entries(c).sort((y,w)=>w[1]-y[1]).slice(0,8).map(([y,w])=>({label:y,value:w})),S=Object.entries(d).sort((y,w)=>w[1]-y[1]).slice(0,6).map(([y,w])=>({label:y,value:w})),T=Object.entries(p).filter(([y])=>!k(y)).sort((y,w)=>w[1]-y[1]).slice(0,6).map(([y,w])=>({label:y,value:w})),R=Object.entries(g).filter(([y])=>y&&y!=="N/I").sort((y,w)=>w[1]-y[1]).slice(0,6).map(([y,w])=>({label:y,value:w})),D=Object.entries(f).sort((y,w)=>w[1]-y[1]).map(([y,w])=>({label:y,value:w})),B=Object.entries(u).sort((y,w)=>w[1]-y[1]).slice(0,6).map(([y,w])=>({label:y,value:w})),_=["SEG","TER","QUA","QUI","SEX","S\xC1B","DOM"].map(y=>({label:y,value:m[y]||0})).filter(y=>y.value>0),M=e.filter(y=>y.status==="pending").sort((y,w)=>getFtItemDateValue(w)-getFtItemDateValue(y)).slice(0,6).map(y=>({label:`${y.collabName||"Colaborador"} (${y.collabRe||"N/I"})`,value:formatFtDate(y.date||y.createdAt)})),P=e.filter(y=>y.status==="launched").sort((y,w)=>getFtItemDateValue(w)-getFtItemDateValue(y)).slice(0,6).map(y=>({label:`${y.collabName||"Colaborador"} (${y.collabRe||"N/I"})`,value:formatFtDate(y.date||y.createdAt)}));return{pending:t,submitted:a,launched:o,total:n,avgPerDay:i,launchRate:r,topUnits:$,topPeople:h,topReasons:S,topShifts:T,topTimes:R,topGroups:D,topPendingUnits:B,weekdayEntries:_,recentPending:M,recentLaunched:P,missingUnit:b,missingRe:v,missingDate:E}}function renderLancamentosDiaria(){const e=document.getElementById("lancamentos-panel-diaria");if(!e)return;const t=getTodayKey(),a=formatFtDate(t),o=getFtOperationalItems(ftLaunches),n=o.filter(v=>normalizeFtDateKey(v?.date)===t),s=n.filter(v=>v.status==="pending").length,i=n.filter(v=>v.status==="submitted").length,r=n.filter(v=>v.status==="launched").length,l=toDateInputValue(new Date(Date.parse(`${t}T00:00:00`)+7*864e5)),c=o.filter(v=>{const E=normalizeFtDateKey(v?.date);return!!E&&E>t&&E<=l}).sort((v,E)=>getFtItemDateValue(v)-getFtItemDateValue(E)),d=o.filter(v=>{const E=normalizeFtDateKey(v?.date);return v.status==="pending"&&!!E&&E<t}).sort((v,E)=>getFtItemDateValue(v)-getFtItemDateValue(E)),p=o.filter(v=>!v?.date||!v?.collabRe||!getFtUnitLabel(v)||getFtUnitLabel(v)==="N/I"),g=(v,E={})=>{const k=[],$=normalizeFtDateKey(v?.date);return E.showDate!==!1&&$&&k.push(`<span class="diaria-tag">${formatFtDateShort($)}</span>`),v?.collabRe||k.push('<span class="diaria-tag danger">Sem RE</span>'),!v?.unitTarget&&!v?.unitCurrent&&k.push('<span class="diaria-tag danger">Sem unidade</span>'),v?.date||k.push('<span class="diaria-tag danger">Sem data</span>'),`
            <div class="diaria-item ft ${E.critical?"critical":""}">
                <div class="diaria-item-top">
                    <strong>${getFtCollabLabel(v)}</strong>
                    <span class="diaria-status status-${v.status}">${getFtStatusLabel(v)}</span>
                </div>
                <div class="diaria-item-meta">
                    <span><strong>Unidade:</strong> ${getFtUnitLabel(v)}</span>
                    <span><strong>Turno:</strong> ${v.shift||"N/I"} \u2022 <strong>Hor\xE1rio:</strong> ${v.ftTime||"N/I"}</span>
                </div>
                ${k.length?`<div class="diaria-item-tags">${k.join("")}</div>`:""}
            </div>
        `},m=n.length?n.slice(0,24).map(v=>g(v,{showDate:!1})).join(""):'<p class="empty-state">Nenhuma FT registrada para hoje.</p>',f=c.length?c.slice(0,24).map(v=>g(v,{showDate:!0})).join(""):'<p class="empty-state">Sem FT programada para os pr\xF3ximos 7 dias.</p>',u=d.slice(0,12).map(v=>g(v,{showDate:!0,critical:!0})).concat(p.slice(0,6).map(v=>g(v,{showDate:!0,critical:!0}))),b=u.length?u.join(""):'<p class="empty-state">Sem pend\xEAncias cr\xEDticas no momento.</p>';e.innerHTML=`
        <div class="lanc-diaria-shell">
            <div class="lanc-diaria-hero">
                <div>
                    <div class="dashboard-title">FOCO DI\xC1RIO</div>
                    <h4>${a}</h4>
                    <p>Execu\xE7\xE3o FT baseada somente na base local, com fila cr\xEDtica e vis\xE3o de pr\xF3ximos dias.</p>
                </div>
                <div class="lanc-diaria-note">A\xE7\xF5es r\xE1pidas ficam no topo: Di\xE1ria FT, Indicadores FT e Hist\xF3rico FT.</div>
            </div>
            <div class="lanc-diaria-kpi">
                <div class="kpi-card"><div class="kpi-label">FT hoje</div><div class="kpi-value">${n.length}</div><div class="kpi-sub">Opera\xE7\xE3o do dia</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${s}</div><div class="kpi-sub">Aguardando a\xE7\xE3o</div></div>
                <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-value">${i}</div><div class="kpi-sub">Status confirmado</div></div>
                <div class="kpi-card"><div class="kpi-label">Lan\xE7adas</div><div class="kpi-value">${r}</div><div class="kpi-sub">Lan\xE7adas</div></div>
                <div class="kpi-card"><div class="kpi-label">Pr\xF3ximos 7 dias</div><div class="kpi-value">${c.length}</div><div class="kpi-sub">Planejamento futuro</div></div>
                <div class="kpi-card"><div class="kpi-label">Pend\xEAncias cr\xEDticas</div><div class="kpi-value">${d.length+p.length}</div><div class="kpi-sub">Atrasos e dados faltantes</div></div>
            </div>
            <div class="lanc-diaria-board">
                <div class="report-card diaria-card">
                    <div class="report-title">FT de hoje</div>
                    <div class="diaria-list">${m}</div>
                </div>
                <div class="report-card diaria-card">
                    <div class="report-title">Pr\xF3ximos 7 dias</div>
                    <div class="diaria-list">${f}</div>
                </div>
                <div class="report-card diaria-card">
                    <div class="report-title">Pend\xEAncias cr\xEDticas</div>
                    <div class="diaria-list">${b}</div>
                </div>
            </div>
        </div>
    `}function getTrocaPrimaryDate(e){return e&&(normalizeFtDateKey(e.swapDate)||normalizeFtDateKey(e.requestDate)||normalizeFtDateKey(e.paymentDate)||normalizeFtDateKey(e.createdAt))||""}function renderLancamentosTroca(){const e=document.getElementById("lancamentos-panel-troca");if(!e)return;const t=getTodayKey(),a=trocaLaunches.slice(),o=a.filter(l=>l.status==="launched"),n=o.filter(l=>(l.errors||[]).length>0),s=a.filter(l=>getTrocaPrimaryDate(l)===t),i=a.sort((l,c)=>{const d=Date.parse(`${getTrocaPrimaryDate(c)}T00:00:00`),p=Date.parse(`${getTrocaPrimaryDate(l)}T00:00:00`);return(Number.isFinite(d)?d:0)-(Number.isFinite(p)?p:0)}),r=i.length?i.slice(0,40).map(l=>{const c=l.errors||[],d=getFtSourceInfo(l),p=getTrocaPrimaryDate(l),g=p?formatFtDate(p):"N/I",m=l.createdAt?formatFtDateTime(l.createdAt):"N/I";return`
                <div class="diaria-item troca ${c.length?"has-error":""}">
                    <div class="diaria-item-top">
                        <strong>${l.unit||"Unidade n\xE3o informada"}</strong>
                        <span class="diaria-status status-${l.status}">${getFtStatusLabel(l)}</span>
                    </div>
                    <div class="diaria-item-meta">
                        <span><strong>REF:</strong> ${l.ref||"N/I"}</span>
                        <span><strong>Solicitante 1:</strong> ${l.requesterName||"N/I"} (${l.requesterRe||"N/I"})</span>
                        <span><strong>Solicitante 2:</strong> ${l.counterpartName||"N/I"} (${l.counterpartRe||"N/I"})</span>
                        <span><strong>Data troca:</strong> ${g}</span>
                        <span><strong>Registro:</strong> ${m}</span>
                        ${c.length?`<span class="troca-errors"><strong>Erros:</strong> ${c.join(" \u2022 ")}</span>`:""}
                    </div>
                </div>
            `}).join(""):'<p class="empty-state">Nenhuma troca sincronizada.</p>';e.innerHTML=`
        <div class="lanc-diaria-shell">
            <div class="lanc-diaria-hero">
                <div>
                    <div class="dashboard-title">TROCA DE FOLGA</div>
                    <h4>Controle operacional</h4>
                    <p>Painel dedicado de trocas com foco em lan\xE7adas e valida\xE7\xE3o de erros.</p>
                </div>
                <div class="lanc-diaria-note">A\xE7\xF5es r\xE1pidas ficam no topo: Sincronizar trocas, Di\xE1ria Troca, Indicadores Troca e Hist\xF3rico Troca.</div>
            </div>
            <div class="lanc-diaria-kpi">
                <div class="kpi-card"><div class="kpi-label">Trocas hoje</div><div class="kpi-value">${s.length}</div><div class="kpi-sub">Data de troca no dia</div></div>
                <div class="kpi-card"><div class="kpi-label">Trocas lan\xE7adas</div><div class="kpi-value">${o.length}</div><div class="kpi-sub">Status lan\xE7ado</div></div>
                <div class="kpi-card"><div class="kpi-label">Erros (lan\xE7adas)</div><div class="kpi-value">${n.length}</div><div class="kpi-sub">Somente lan\xE7adas</div></div>
                <div class="kpi-card"><div class="kpi-label">Total sincronizado</div><div class="kpi-value">${a.length}</div><div class="kpi-sub">Todas as trocas</div></div>
            </div>
            <div class="report-card diaria-card">
                <div class="report-title">Trocas recentes</div>
                <div class="diaria-list">${r}</div>
            </div>
        </div>
    `}function buildTrocaTopRows(e,t,a=8){const o={};return(e||[]).forEach(n=>{const s=String(t(n)||"").trim()||"N/I";o[s]=(o[s]||0)+1}),Object.entries(o).sort((n,s)=>s[1]-n[1]).slice(0,a).map(([n,s])=>({label:n,value:s}))}function buildTrocaHistorySearchText(e){return normalizeText([e?.ref,e?.unit,e?.requesterName,e?.requesterRe,e?.counterpartName,e?.counterpartRe,e?.status,e?.statusRaw,e?.requestDate,e?.swapDate,e?.paymentDate,(e?.errors||[]).join(" ")].filter(Boolean).join(" "))}function applyTrocaHistoryFilters(e=trocaLaunches){let t=(e||[]).slice();trocaHistoryFilter.status&&trocaHistoryFilter.status!=="all"&&(t=t.filter(n=>(n?.status||"")===trocaHistoryFilter.status));const a=normalizeText(trocaHistoryFilter.unit||"");a&&(t=t.filter(n=>normalizeText(n?.unit||"")===a));const o=normalizeText(trocaHistoryFilter.search||"");return o&&(t=t.filter(n=>buildTrocaHistorySearchText(n).includes(o))),t}function sortTrocaHistoryItems(e=[]){const t=trocaHistoryFilter.sort||"date_desc",a=n=>{const s=getTrocaPrimaryDate(n);if(s){const r=Date.parse(`${s}T00:00:00`);if(Number.isFinite(r))return r}const i=Date.parse(n?.createdAt||n?.requestedAt||"");return Number.isFinite(i)?i:0},o=n=>{const s=Date.parse(n?.createdAt||n?.requestedAt||"");return Number.isFinite(s)?s:0};return e.slice().sort((n,s)=>t==="date_asc"?a(n)-a(s):t==="created_desc"?o(s)-o(n):t==="created_asc"?o(n)-o(s):t==="status"?String(n?.status||"").localeCompare(String(s?.status||"")):t==="unit"?String(n?.unit||"").localeCompare(String(s?.unit||""),"pt-BR"):a(s)-a(n))}function renderLancamentosTrocaDashboard(){const e=document.getElementById("lancamentos-panel-dashboard");if(!e)return;const t=trocaLaunches.slice(),a=buildTrocaDashboardStats(t),o=buildTrocaTopRows(t,r=>r?.unit||"N/I",8),n=buildTrocaTopRows(t,r=>r?.requesterName||r?.requesterRe||"N/I",8),s=buildTrocaTopRows(t,r=>{const l=getTrocaPrimaryDate(r);return l&&getFtWeekdayLabel(l)||"N/I"},7),i=(t||[]).filter(r=>(r?.errors||[]).length>0).slice().sort((r,l)=>{const c=Date.parse(l?.createdAt||l?.requestedAt||""),d=Date.parse(r?.createdAt||r?.requestedAt||"");return(Number.isFinite(c)?c:0)-(Number.isFinite(d)?d:0)}).slice(0,10).map(r=>({label:`${r?.unit||"N/I"} \u2022 REF ${r?.ref||"N/I"}`,value:(r?.errors||[]).join(" \u2022 ")}));e.innerHTML=`
        <div class="lancamentos-dashboard-toolbar">
            <div class="dashboard-title">Indicadores de Troca</div>
            <div class="menu-actions-row lancamentos-toolbar-actions">
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardXlsx()">Exportar indicadores</button>
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardCsv()">CSV base</button>
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardPdf()">PDF resumo</button>
            </div>
        </div>
        <div class="lancamentos-kpi">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">${a.total}</div><div class="kpi-sub">Trocas sincronizadas</div></div>
            <div class="kpi-card"><div class="kpi-label">Lan\xE7adas</div><div class="kpi-value">${a.launched}</div><div class="kpi-sub">Status lan\xE7ado</div></div>
            <div class="kpi-card"><div class="kpi-label">Com erro</div><div class="kpi-value">${a.errors}</div><div class="kpi-sub">Somente lan\xE7adas</div></div>
            <div class="kpi-card"><div class="kpi-label">Taxa de erro</div><div class="kpi-value">${a.errorRate}%</div><div class="kpi-sub">Erros \xF7 lan\xE7adas</div></div>
        </div>
        <div class="lancamentos-report-grid">
            <div class="report-card">
                <div class="report-title">Por Unidade</div>
                <div class="report-list">${buildReportRows(o)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Solicitante</div>
                <div class="report-list">${buildReportRows(n)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Dia da Semana</div>
                <div class="report-list">${buildReportRows(s)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Tipos de Erro</div>
                <div class="report-list">${buildReportRows(a.topErrors)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Erros Recentes</div>
                <div class="report-list">${buildRecentRows(i,"Sem erros recentes.")}</div>
            </div>
        </div>
    `}function renderLancamentosTrocaHistorico(){const e=document.getElementById("lancamentos-panel-historico");if(!e)return;const t=trocaLaunches.slice();if(!t.length){e.innerHTML='<p class="empty-state">Nenhuma troca registrada.</p>';return}const a=applyTrocaHistoryFilters(t),o=sortTrocaHistoryItems(a),n=a.length,s=a.filter(u=>u.status==="pending").length,i=a.filter(u=>u.status==="submitted").length,r=a.filter(u=>u.status==="launched").length,l=a.filter(u=>(u.errors||[]).length>0).length,c=Array.from(new Set(t.map(u=>u?.unit).filter(Boolean))).sort((u,b)=>u.localeCompare(b,"pt-BR")),d=o.length?o.slice(0,120).map(u=>{const b=getTrocaPrimaryDate(u),v=b?formatFtDate(b):"N/I",E=u.createdAt?formatFtDateTime(u.createdAt):u.requestedAt?formatFtDateTime(u.requestedAt):"N/I",k=getFtSourceInfo(u),$=u.errors||[];return`
                <div class="lancamento-card ${$.length?"is-pending":""}">
                    <div class="lancamento-main">
                        <div class="lancamento-meta">
                            <span class="lancamento-date"><strong>Data troca</strong> ${v}</span>
                            <span class="lancamento-status status-${u.status}">${getFtStatusLabel(u)}</span>
                            <span class="lancamento-source ${k.className}">${k.label}</span>
                        </div>
                        <div class="lancamento-title">${u.unit||"Unidade n\xE3o informada"}</div>
                        <div class="lancamento-summary">
                            <span><strong>REF:</strong> ${u.ref||"N/I"}</span>
                            <span><strong>Solicitante 1:</strong> ${u.requesterName||"N/I"} (${u.requesterRe||"N/I"})</span>
                            <span><strong>Solicitante 2:</strong> ${u.counterpartName||"N/I"} (${u.counterpartRe||"N/I"})</span>
                            <span><strong>Registro:</strong> ${E}</span>
                        </div>
                        ${$.length?`<div class="troca-errors"><strong>Erros:</strong> ${$.join(" \u2022 ")}</div>`:""}
                    </div>
                </div>
            `}).join(""):'<p class="empty-state">Nenhuma troca para os filtros selecionados.</p>';e.innerHTML=`
        <div class="lancamentos-summary-line">Resultados: <strong>${n}</strong> registros</div>
        <div class="lancamentos-cards">
            <div class="lanc-card"><div class="label">Total</div><div class="value">${n}</div></div>
            <div class="lanc-card"><div class="label">Pendentes</div><div class="value">${s}</div></div>
            <div class="lanc-card"><div class="label">Confirmadas</div><div class="value">${i}</div></div>
            <div class="lanc-card"><div class="label">Lan\xE7adas</div><div class="value">${r}</div></div>
            <div class="lanc-card"><div class="label">Com erro</div><div class="value">${l}</div></div>
        </div>
        <div class="lancamentos-history-tools">
            <div class="form-group">
                <label>Buscar</label>
                <input type="text" id="troca-history-search" placeholder="REF, unidade, solicitante...">
            </div>
            <div class="form-group">
                <label>Unidade</label>
                <select id="troca-history-unit">
                    <option value="">Todas</option>
                    ${c.map(u=>`<option value="${u}">${u}</option>`).join("")}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="troca-history-status">
                    <option value="all">Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="submitted">Confirmadas</option>
                    <option value="launched">Lan\xE7adas</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ordenar por</label>
                <select id="troca-history-sort">
                    <option value="date_desc">Data da troca (recente)</option>
                    <option value="date_asc">Data da troca (antiga)</option>
                    <option value="created_desc">Data de cria\xE7\xE3o (recente)</option>
                    <option value="created_asc">Data de cria\xE7\xE3o (antiga)</option>
                    <option value="status">Status</option>
                    <option value="unit">Unidade</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-history-actions">
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistorico()">Exportar hist\xF3rico</button>
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistoricoCsv()">CSV filtrado</button>
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistoricoPdf()">PDF resumo</button>
        </div>
        ${d}
    `;const p=document.getElementById("troca-history-search");p&&(p.value=trocaHistoryFilter.search||"",p.addEventListener("input",u=>{trocaHistoryFilter.search=u.target.value||"",renderLancamentosTrocaHistorico()}));const g=document.getElementById("troca-history-unit");g&&(g.value=trocaHistoryFilter.unit||"",g.addEventListener("change",u=>{trocaHistoryFilter.unit=u.target.value||"",renderLancamentosTrocaHistorico()}));const m=document.getElementById("troca-history-status");m&&(m.value=trocaHistoryFilter.status||"all",m.addEventListener("change",u=>{trocaHistoryFilter.status=u.target.value||"all",renderLancamentosTrocaHistorico()}));const f=document.getElementById("troca-history-sort");f&&(f.value=trocaHistoryFilter.sort||"date_desc",f.addEventListener("change",u=>{trocaHistoryFilter.sort=u.target.value||"date_desc",renderLancamentosTrocaHistorico()}))}function renderLancamentosDashboard(){const e=document.getElementById("lancamentos-panel-dashboard");if(!e)return;const t=applyFtFilters(ftLaunches),a=buildFtDashboardStats(t),o=getMonthlyGidChecklistStatus(new Date),n=[];o.ftOk||n.push("FT");const s=n.length?`<div class="lancamentos-gid-alert">Lembrete ${o.monthLabel}: faltando cadastrar GID mensal de FT (config.js).</div>`:"",{pending:i,submitted:r,launched:l,total:c,avgPerDay:d,launchRate:p,topUnits:g,topPeople:m,topReasons:f,topShifts:u,topTimes:b,topGroups:v,topPendingUnits:E,weekdayEntries:k,recentPending:$,recentLaunched:h,missingUnit:S,missingRe:T,missingDate:R}=a;e.innerHTML=`
        <div class="lancamentos-dashboard-toolbar">
            <div class="dashboard-title">Vis\xE3o executiva</div>
            <div class="menu-actions-row lancamentos-toolbar-actions">
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboard()">Exportar dashboard</button>
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboardCsv()">CSV base</button>
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboardPdf()">PDF resumo</button>
            </div>
        </div>
        ${s}
        <div class="lancamentos-kpi">
            <div class="kpi-card">
                <div class="kpi-label">Pendentes</div>
                <div class="kpi-value">${i}</div>
                <div class="kpi-sub">Aguardando lan\xE7amento</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Confirmadas</div>
                <div class="kpi-value">${r}</div>
                <div class="kpi-sub">Status confirmado</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Lan\xE7adas</div>
                <div class="kpi-value">${l}</div>
                <div class="kpi-sub">LAN\xC7ADO</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Total filtrado</div>
                <div class="kpi-value">${c}</div>
                <div class="kpi-sub">No per\xEDodo</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Taxa de lan\xE7amento</div>
                <div class="kpi-value">${p}%</div>
                <div class="kpi-sub">Lan\xE7adas \xF7 Total</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">M\xE9dia por dia</div>
                <div class="kpi-value">${d?d.toFixed(1):"0.0"}</div>
                <div class="kpi-sub">Dias com FT</div>
            </div>
        </div>
        <div class="lancamentos-report-grid">
            <div class="report-card">
                <div class="report-title">Por Unidade (Top 8)</div>
                <div class="report-list">${buildReportRows(g)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Colaborador (Top 8)</div>
                <div class="report-list">${buildReportRows(m)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Motivo</div>
                <div class="report-list">${buildReportRows(f)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Turno</div>
                <div class="report-list">${buildReportRows(u)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Hor\xE1rio</div>
                <div class="report-list">${buildReportRows(b)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Dia da Semana</div>
                <div class="report-list">${buildReportRows(k)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Grupo</div>
                <div class="report-list">${buildReportRows(v)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Pend\xEAncias por Unidade</div>
                <div class="report-list">${buildReportRows(E)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Pend\xEAncias Recentes</div>
                <div class="report-list">${buildRecentRows($,"Sem pend\xEAncias no per\xEDodo.")}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Lan\xE7adas Recentes</div>
                <div class="report-list">${buildRecentRows(h,"Sem lan\xE7amentos no per\xEDodo.")}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Qualidade dos Dados</div>
                <div class="report-list">${buildReportRows([{label:"Sem unidade",value:S},{label:"Sem RE",value:T},{label:"Sem data",value:R}].filter(D=>D.value>0))}</div>
            </div>
        </div>
    `}function getMonthlyGidChecklistStatus(e){return{monthLabel:(e instanceof Date?e:new Date).toLocaleDateString("pt-BR",{month:"long",year:"numeric"}),ftOk:!0,trocaOk:!0}}function exportFtDashboard(){const e=applyFtFilters(ftLaunches);if(!e.length){showToast("Nenhum dado de FT para exportar.","info");return}const t=buildFtDashboardStats(e),a=l=>l.map(c=>({Item:c.label,Quantidade:c.value})),o=[{Indicador:"Pendentes",Valor:t.pending},{Indicador:"Confirmadas",Valor:t.submitted},{Indicador:"Lan\xE7adas",Valor:t.launched},{Indicador:"Total filtrado",Valor:t.total},{Indicador:"Taxa de lan\xE7amento (%)",Valor:t.launchRate},{Indicador:"M\xE9dia por dia",Valor:t.avgPerDay?Number(t.avgPerDay.toFixed(2)):0}],n=[{Indicador:"Sem unidade",Valor:t.missingUnit},{Indicador:"Sem RE",Valor:t.missingRe},{Indicador:"Sem data",Valor:t.missingDate}],s=e.map(l=>({Status:l.status,Data:l.date||"","Solicitada em":l.requestedAt?formatFtDateTime(l.requestedAt):"",Colaborador:l.collabName||"",RE:l.collabRe||"",Unidade:l.unitTarget||l.unitCurrent||"",Turno:l.shift||"",Hor\u00E1rio:l.ftTime||"",Motivo:getFtReasonLabel(l.reason,l.reasonOther)||l.reasonRaw||"",Detalhe:l.reasonDetail||"",Cobrindo:l.coveringOther||(l.coveringName?`${l.coveringName} (${l.coveringRe})`:l.coveringRe||""),Origem:getFtSourceInfo(l).label,Grupo:l.group||l.sourceGroup||""})),i=XLSX.utils.book_new();XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(o),"Resumo"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topUnits)),"Por Unidade"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topPeople)),"Por Colaborador"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topReasons)),"Por Motivo"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topShifts)),"Por Turno"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topTimes)),"Por Horario"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.weekdayEntries)),"Por Dia Semana"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topGroups)),"Por Grupo"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.topPendingUnits)),"Pend\xEAncias Unidade"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.recentPending)),"Pend\xEAncias Recentes"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(a(t.recentLaunched)),"Lan\xE7adas Recentes"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(n),"Qualidade Dados"),XLSX.utils.book_append_sheet(i,XLSX.utils.json_to_sheet(s),"Base FT");const r=new Date().toISOString().slice(0,10);XLSX.writeFile(i,`ft_dashboard_${r}.xlsx`),showToast("Relat\xF3rios de FT exportados.","success")}function exportFtHistorico(){const e=sortFtHistoryItems(applyFtHistoryFilters(ftLaunches));if(!e.length){showToast("Nenhum lan\xE7amento de FT para exportar.","info");return}const t=e.map(n=>{const s=n.coveringOther?n.coveringRe?`${n.coveringOther} (RE ${n.coveringRe})`:n.coveringOther:n.coveringName?`${n.coveringName} (${n.coveringRe||"N/I"})`:n.coveringRe?`RE ${n.coveringRe}`:"";return{Status:getFtStatusLabel(n),"Data FT":n.date||"","Solicitada em":n.requestedAt?formatFtDateTime(n.requestedAt):"","Criada em":n.createdAt?formatFtDateTime(n.createdAt):"",Colaborador:n.collabName||"",RE:n.collabRe||"",Unidade:getFtUnitLabel(n),Turno:n.shift||"",Hor\u00E1rio:n.ftTime||"",Motivo:getFtReasonLabel(n.reason,n.reasonOther)||n.reasonRaw||"",Detalhe:n.reasonDetail||"",Cobrindo:s,Observa\u00E7\u00F5es:n.notes||"",Origem:getFtSourceInfo(n).label,Grupo:n.group||n.sourceGroup||"",Respons\u00E1vel:n.createdBy||""}}),a=XLSX.utils.book_new();XLSX.utils.book_append_sheet(a,XLSX.utils.json_to_sheet(t),"Historico FT");const o=new Date().toISOString().slice(0,10);XLSX.writeFile(a,`ft_historico_${o}.xlsx`),showToast("Hist\xF3rico de FT exportado.","success")}function buildExportDateTag(){return new Date().toISOString().slice(0,10)}function downloadBlobFile(e,t){const a=document.createElement("a"),o=URL.createObjectURL(e);a.href=o,a.download=t,a.click(),setTimeout(()=>URL.revokeObjectURL(o),2e3)}function buildCsvFromRows(e,t=[]){if(!Array.isArray(e)||!e.length)return"";const a=t.length?t:Object.keys(e[0]),o=s=>{const i=String(s??"");return/[";\n\r,]/.test(i)?`"${i.replace(/"/g,'""')}"`:i},n=[];return n.push(a.map(o).join(";")),e.forEach(s=>{n.push(a.map(i=>o(s[i])).join(";"))}),`\uFEFF${n.join(`
`)}`}function exportRowsAsCsv(e,t,a="Sem dados para exportar."){if(!Array.isArray(e)||!e.length)return showToast(a,"info"),!1;const o=buildCsvFromRows(e),n=new Blob([o],{type:"text/csv;charset=utf-8;"});return downloadBlobFile(n,t),!0}function createPdfContext(e,t=[]){if(!window.jspdf||!window.jspdf.jsPDF)return showToast("Biblioteca de PDF n\xE3o carregada.","error"),null;const a=new window.jspdf.jsPDF,o=14,n=a.internal.pageSize.getHeight(),s=a.internal.pageSize.getWidth()-o*2;let i=o;const r=(c=1)=>{i+c*5>n-o&&(a.addPage(),i=o)},l=(c,d=10,p="normal")=>{const g=String(c??"").trim();if(!g)return;a.setFont("helvetica",p),a.setFontSize(d),a.splitTextToSize(g,s).forEach(f=>{r(1),a.text(f,o,i),i+=5})};return l(e,14,"bold"),t.forEach(c=>l(c,10,"normal")),i+=2,{doc:a,heading(c){i+=1,l(c,11,"bold")},line(c){l(c,10,"normal")},bullet(c){l(`- ${c}`,10,"normal")},spacer(c=2){i+=c,r(1)}}}function getFtCoveringText(e){return e?e.coveringOther?e.coveringRe?`${e.coveringOther} (RE ${e.coveringRe})`:e.coveringOther:e.coveringName?`${e.coveringName} (${e.coveringRe||"N/I"})`:e.coveringRe?`RE ${e.coveringRe}`:"":""}function buildFtDashboardBaseRows(e=[]){return(e||[]).map(t=>({Status:getFtStatusLabel(t),"Data FT":t.date?formatFtDate(t.date):"","Solicitada em":t.requestedAt?formatFtDateTime(t.requestedAt):"",Colaborador:t.collabName||"",RE:t.collabRe||"",Unidade:getFtUnitLabel(t),Turno:t.shift||"",Hor\u00E1rio:t.ftTime||"",Motivo:getFtReasonLabel(t.reason,t.reasonOther)||t.reasonRaw||"",Detalhe:t.reasonDetail||"",Cobrindo:getFtCoveringText(t),Origem:getFtSourceInfo(t).label,Grupo:t.group||t.sourceGroup||""}))}function buildFtHistoricoRows(e=[]){return(e||[]).map(t=>({Status:getFtStatusLabel(t),"Data FT":t.date?formatFtDate(t.date):"","Solicitada em":t.requestedAt?formatFtDateTime(t.requestedAt):"","Criada em":t.createdAt?formatFtDateTime(t.createdAt):"",Colaborador:t.collabName||"",RE:t.collabRe||"",Unidade:getFtUnitLabel(t),Turno:t.shift||"",Hor\u00E1rio:t.ftTime||"",Motivo:getFtReasonLabel(t.reason,t.reasonOther)||t.reasonRaw||"",Detalhe:t.reasonDetail||"",Cobrindo:getFtCoveringText(t),Observa\u00E7\u00F5es:t.notes||"",Origem:getFtSourceInfo(t).label,Grupo:t.group||t.sourceGroup||"",Respons\u00E1vel:t.createdBy||""}))}function buildTrocaRows(e=[]){return(e||[]).map(t=>{const a=getTrocaPrimaryDate(t);return{Status:getFtStatusLabel(t),"Status bruto":t.statusRaw||"",REF:t.ref||"",Unidade:t.unit||"","Solicitante 1":t.requesterName||"","RE solicitante 1":t.requesterRe||"","Solicitante 2":t.counterpartName||"","RE solicitante 2":t.counterpartRe||"","Data principal":a?formatFtDate(a):"","Data solicita\xE7\xE3o":t.requestDate?formatFtDate(t.requestDate):t.requestDateRaw||"","Data troca":t.swapDate?formatFtDate(t.swapDate):t.swapDateRaw||"","Data pagamento":t.paymentDate?formatFtDate(t.paymentDate):t.paymentDateRaw||"",Registro:t.createdAt?formatFtDateTime(t.createdAt):t.requestedAt?formatFtDateTime(t.requestedAt):"",Erros:(t.errors||[]).join(" | "),Origem:getFtSourceInfo(t).label,Grupo:t.sourceGroup||""}})}function buildTrocaDashboardContext(e=trocaLaunches.slice()){const t=buildTrocaDashboardStats(e),a=buildTrocaTopRows(e,i=>i?.unit||"N/I",8),o=buildTrocaTopRows(e,i=>i?.requesterName||i?.requesterRe||"N/I",8),n=buildTrocaTopRows(e,i=>{const r=getTrocaPrimaryDate(i);return r&&getFtWeekdayLabel(r)||"N/I"},7),s=(e||[]).filter(i=>(i?.errors||[]).length>0).slice().sort((i,r)=>{const l=Date.parse(r?.createdAt||r?.requestedAt||""),c=Date.parse(i?.createdAt||i?.requestedAt||"");return(Number.isFinite(l)?l:0)-(Number.isFinite(c)?c:0)}).slice(0,10).map(i=>({label:`${i?.unit||"N/I"} \u2022 REF ${i?.ref||"N/I"}`,value:(i?.errors||[]).join(" \u2022 ")}));return{stats:t,topUnits:a,topRequester:o,byWeekday:n,recentErrors:s}}function exportFtDashboardCsv(){const e=applyFtFilters(ftLaunches),t=buildFtDashboardBaseRows(e),a=buildExportDateTag();exportRowsAsCsv(t,`ft_dashboard_base_${a}.csv`,"Nenhum dado de FT para exportar.")&&showToast("CSV de FT exportado.","success")}function exportFtDashboardPdf(){const e=applyFtFilters(ftLaunches);if(!e.length){showToast("Nenhum dado de FT para exportar.","info");return}const t=buildFtDashboardStats(e),a=createPdfContext("FT - Resumo Executivo",[`Gerado em: ${new Date().toLocaleString()}`,`Registros filtrados: ${e.length}`]);if(!a)return;a.heading("Indicadores"),a.bullet(`Pendentes: ${t.pending}`),a.bullet(`Confirmadas: ${t.submitted}`),a.bullet(`Lan\xE7adas: ${t.launched}`),a.bullet(`Taxa de lan\xE7amento: ${t.launchRate}%`),a.bullet(`M\xE9dia por dia: ${t.avgPerDay?t.avgPerDay.toFixed(1):"0.0"}`),a.heading("Top Unidades"),t.topUnits.length?t.topUnits.slice(0,10).forEach(n=>a.bullet(`${n.label}: ${n.value}`)):a.line("Sem dados."),a.heading("Top Colaboradores"),t.topPeople.length?t.topPeople.slice(0,10).forEach(n=>a.bullet(`${n.label}: ${n.value}`)):a.line("Sem dados."),a.heading("Filtros Ativos"),a.bullet(`Per\xEDodo FT: ${ftFilter.from?formatFtDate(ftFilter.from):"in\xEDcio livre"} at\xE9 ${ftFilter.to?formatFtDate(ftFilter.to):"fim livre"}`),a.bullet(`Status: ${ftFilter.status==="all"?"Todos":ftFilter.status}`);const o=buildExportDateTag();a.doc.save(`ft_dashboard_${o}.pdf`),showToast("PDF de FT exportado.","success")}function exportFtHistoricoCsv(){const e=sortFtHistoryItems(applyFtHistoryFilters(ftLaunches)),t=buildFtHistoricoRows(e),a=buildExportDateTag();exportRowsAsCsv(t,`ft_historico_${a}.csv`,"Nenhum lan\xE7amento de FT para exportar.")&&showToast("CSV do hist\xF3rico FT exportado.","success")}function exportFtHistoricoPdf(){const e=sortFtHistoryItems(applyFtHistoryFilters(ftLaunches));if(!e.length){showToast("Nenhum lan\xE7amento de FT para exportar.","info");return}const t=createPdfContext("FT - Hist\xF3rico Filtrado",[`Gerado em: ${new Date().toLocaleString()}`,`Registros: ${e.length}`]);if(!t)return;const a=e.filter(i=>i.status==="pending").length,o=e.filter(i=>i.status==="submitted").length,n=e.filter(i=>i.status==="launched").length;t.heading("Resumo"),t.bullet(`Pendentes: ${a}`),t.bullet(`Confirmadas: ${o}`),t.bullet(`Lan\xE7adas: ${n}`),t.heading("Filtros"),t.bullet(`Busca: ${ftHistoryFilter.search||"vazia"}`),t.bullet(`Unidade: ${ftHistoryFilter.unit||"todas"}`),t.bullet(`Colaborador: ${ftHistoryFilter.collab||"todos"}`),t.bullet(`Ordena\xE7\xE3o: ${ftHistoryFilter.sort||"date_desc"}`),t.bullet(`Agrupamento por dia: ${ftHistoryFilter.grouped?"ativo":"inativo"}`),t.heading("Registros (at\xE9 30)"),e.slice(0,30).forEach(i=>{const r=i.date?formatFtDate(i.date):"Sem data";t.bullet(`${r} \u2022 ${getFtStatusLabel(i)} \u2022 ${getFtCollabLabel(i)} \u2022 ${getFtUnitLabel(i)}`)});const s=buildExportDateTag();t.doc.save(`ft_historico_${s}.pdf`),showToast("PDF do hist\xF3rico FT exportado.","success")}function exportTrocaDashboardXlsx(){const e=trocaLaunches.slice();if(!e.length){showToast("Nenhuma troca para exportar.","info");return}const t=buildTrocaDashboardContext(e),a=c=>(c||[]).map(d=>({Item:d.label,Quantidade:d.value})),o=[{Indicador:"Total",Valor:t.stats.total},{Indicador:"Lan\xE7adas",Valor:t.stats.launched},{Indicador:"Com erro",Valor:t.stats.errors},{Indicador:"Taxa de erro (%)",Valor:t.stats.errorRate}],n=[{Filtro:"Base",Valor:"Trocas sincronizadas (todas)"},{Filtro:"Status no hist\xF3rico",Valor:trocaHistoryFilter.status||"all"},{Filtro:"Busca no hist\xF3rico",Valor:trocaHistoryFilter.search||""}],s=t.recentErrors.map(c=>({Item:c.label,Detalhe:c.value})),i=buildTrocaRows(e),r=XLSX.utils.book_new();XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(o),"Resumo"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(a(t.topUnits)),"Por Unidade"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(a(t.topRequester)),"Por Solicitante"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(a(t.byWeekday)),"Por Dia Semana"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(a(t.stats.topErrors)),"Tipos Erro"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(s),"Erros Recentes"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(n),"Filtros"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(i),"Base Troca");const l=buildExportDateTag();XLSX.writeFile(r,`troca_dashboard_${l}.xlsx`),showToast("Indicadores de troca exportados.","success")}function exportTrocaDashboardCsv(){const e=buildTrocaRows(trocaLaunches.slice()),t=buildExportDateTag();exportRowsAsCsv(e,`troca_dashboard_base_${t}.csv`,"Nenhuma troca para exportar.")&&showToast("CSV de troca exportado.","success")}function exportTrocaDashboardPdf(){const e=trocaLaunches.slice();if(!e.length){showToast("Nenhuma troca para exportar.","info");return}const t=buildTrocaDashboardContext(e),a=createPdfContext("Troca de Folga - Resumo Executivo",[`Gerado em: ${new Date().toLocaleString()}`,`Trocas sincronizadas: ${e.length}`]);if(!a)return;a.heading("Indicadores"),a.bullet(`Total: ${t.stats.total}`),a.bullet(`Lan\xE7adas: ${t.stats.launched}`),a.bullet(`Com erro: ${t.stats.errors}`),a.bullet(`Taxa de erro: ${t.stats.errorRate}%`),a.heading("Top Unidades"),t.topUnits.length?t.topUnits.slice(0,10).forEach(n=>a.bullet(`${n.label}: ${n.value}`)):a.line("Sem dados."),a.heading("Tipos de Erro"),t.stats.topErrors.length?t.stats.topErrors.slice(0,10).forEach(n=>a.bullet(`${n.label}: ${n.value}`)):a.line("Sem erros lan\xE7ados."),a.heading("Erros Recentes"),t.recentErrors.length?t.recentErrors.slice(0,10).forEach(n=>a.bullet(`${n.label} \u2022 ${n.value}`)):a.line("Sem erros recentes.");const o=buildExportDateTag();a.doc.save(`troca_dashboard_${o}.pdf`),showToast("PDF de troca exportado.","success")}function exportTrocaHistorico(){const e=sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches));if(!e.length){showToast("Nenhuma troca para exportar.","info");return}const t=buildTrocaRows(e),a=[{Filtro:"Busca",Valor:trocaHistoryFilter.search||""},{Filtro:"Unidade",Valor:trocaHistoryFilter.unit||"Todas"},{Filtro:"Status",Valor:trocaHistoryFilter.status||"all"},{Filtro:"Ordena\xE7\xE3o",Valor:trocaHistoryFilter.sort||"date_desc"}],o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(a),"Filtros"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(t),"Historico Troca");const n=buildExportDateTag();XLSX.writeFile(o,`troca_historico_${n}.xlsx`),showToast("Hist\xF3rico de troca exportado.","success")}function exportTrocaHistoricoCsv(){const e=sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches)),t=buildTrocaRows(e),a=buildExportDateTag();exportRowsAsCsv(t,`troca_historico_${a}.csv`,"Nenhuma troca para exportar.")&&showToast("CSV do hist\xF3rico de troca exportado.","success")}function exportTrocaHistoricoPdf(){const e=sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches));if(!e.length){showToast("Nenhuma troca para exportar.","info");return}const t=e.filter(r=>r.status==="pending").length,a=e.filter(r=>r.status==="submitted").length,o=e.filter(r=>r.status==="launched").length,n=e.filter(r=>(r.errors||[]).length>0).length,s=createPdfContext("Troca de Folga - Hist\xF3rico Filtrado",[`Gerado em: ${new Date().toLocaleString()}`,`Registros: ${e.length}`]);if(!s)return;s.heading("Resumo"),s.bullet(`Pendentes: ${t}`),s.bullet(`Confirmadas: ${a}`),s.bullet(`Lan\xE7adas: ${o}`),s.bullet(`Com erro: ${n}`),s.heading("Filtros"),s.bullet(`Busca: ${trocaHistoryFilter.search||"vazia"}`),s.bullet(`Unidade: ${trocaHistoryFilter.unit||"todas"}`),s.bullet(`Status: ${trocaHistoryFilter.status||"all"}`),s.bullet(`Ordena\xE7\xE3o: ${trocaHistoryFilter.sort||"date_desc"}`),s.heading("Registros (at\xE9 30)"),e.slice(0,30).forEach(r=>{const l=getTrocaPrimaryDate(r),c=l?formatFtDate(l):"Sem data",d=r.unit||"N/I",p=r.ref||"N/I";s.bullet(`${c} \u2022 ${getFtStatusLabel(r)} \u2022 ${d} \u2022 REF ${p}`)});const i=buildExportDateTag();s.doc.save(`troca_historico_${i}.pdf`),showToast("PDF do hist\xF3rico de troca exportado.","success")}function renderLancamentosHistorico(){const e=document.getElementById("lancamentos-panel-historico");if(!e)return;if(!getFtOperationalItems(ftLaunches).length){e.innerHTML='<p class="empty-state">Nenhum lan\xE7amento registrado.</p>';return}const a=applyFtFilters(ftLaunches),o=applyFtHistoryFilters(ftLaunches),n=sortFtHistoryItems(o),s=ftHistoryFilter.grouped?buildFtHistoryGroups(n):[{key:"all",label:"",items:n}],i=o.length,r=o.filter(h=>h.status==="pending").length,l=o.filter(h=>h.status==="submitted").length,c=o.filter(h=>h.status==="launched").length,d=new Set;a.forEach(h=>{const S=getFtUnitLabel(h);S&&S!=="N/I"&&d.add(S)});const p=Array.from(d).sort((h,S)=>h.localeCompare(S));ftHistoryFilter.unit&&!d.has(ftHistoryFilter.unit)&&p.unshift(ftHistoryFilter.unit);const g=new Map;a.forEach(h=>{const S=(h.collabRe||h.collabName||"").trim();S&&(g.has(S)||g.set(S,getFtCollabLabel(h)))});const m=Array.from(g.entries()).map(([h,S])=>({value:h,label:S})).sort((h,S)=>h.label.localeCompare(S.label));ftHistoryFilter.collab&&!g.has(ftHistoryFilter.collab)&&m.unshift({value:ftHistoryFilter.collab,label:ftHistoryFilter.collab});const f=`
        <div class="lancamentos-cards">
            <div class="lanc-card"><div class="label">Total</div><div class="value">${i}</div></div>
            <div class="lanc-card"><div class="label">Pendentes</div><div class="value">${r}</div></div>
            <div class="lanc-card"><div class="label">Confirmadas</div><div class="value">${l}</div></div>
            <div class="lanc-card"><div class="label">Lan\xE7adas</div><div class="value">${c}</div></div>
        </div>
    `,u=h=>h.map(S=>{const T=getFtStatusLabel(S),R=S.status==="submitted"&&isAdminRole(),D=S.status==="launched",B=D?"Lan\xE7ado":"Marcar como lan\xE7ado",x=D?"btn-ok":"btn-secondary",_=`onclick="markFtLaunched('${S.id}')"`,M=R?"":"disabled",P=S.requestedAt?formatFtDateTime(S.requestedAt):"",y=S.createdAt?formatFtDateTime(S.createdAt):"",w=getFtSourceInfo(S),N=S.coveringOther?S.coveringRe?`${S.coveringOther} (RE ${S.coveringRe})`:S.coveringOther:S.coveringName?`${S.coveringName} (${S.coveringRe||"N/I"})`:S.coveringRe?`RE ${S.coveringRe}`:"-",U=getFtReasonLabel(S.reason,S.reasonOther)||S.reasonRaw||"N/I",F=(S.reasonDetail||"").trim(),I=String(U||"").toUpperCase(),A=F.toUpperCase(),O=!!F&&A!==I?'<span class="detail-badge">Detalhe extra</span>':"",H=(S.notes||"").trim(),G=ftHistoryExpanded.has(S.id),z=S.date===getTodayKey(),V=S.status==="pending",j=S.date?formatFtDate(S.date):"N/I",J=S.shift||"N/I",K=S.ftTime||"N/I",X=formatFtAuditEntrySummary(getLatestFtAuditEntry(S.id));return`
        <div class="lancamento-card ${z?"is-today":""} ${V?"is-pending":""}" data-ft-id="${S.id}">
            <div class="lancamento-main">
                <div class="lancamento-meta">
                    <span class="lancamento-date"><strong>Data FT</strong> ${j}</span>
                    <span class="lancamento-status status-${S.status}">${T}</span>
                    <span class="lancamento-source ${w.className}">${w.label}</span>
                </div>
                <div class="lancamento-title">${getFtCollabLabel(S)}</div>
                <div class="lancamento-summary">
                    <span><strong>Unidade:</strong> ${getFtUnitLabel(S)}</span>
                    <span><strong>Data FT:</strong> ${j}</span>
                    <span><strong>Turno:</strong> ${J}</span>
                    <span><strong>Hor\xE1rio:</strong> ${K}</span>
                    <span><strong>Motivo:</strong> ${U}</span>
                    <span><strong>Cobrindo:</strong> ${N}</span>
                    ${O}
                </div>
                <button class="lancamento-toggle" type="button" onclick="toggleFtHistoryDetails('${S.id}')">${G?"Ocultar detalhes":"Ver detalhes"}</button>
                <div class="lancamento-details ${G?"":"hidden"}">
                    <div class="lancamento-steps">
                        <span class="step ${S.createdAt||S.requestedAt?"done":""}">Registrada na integra\xE7\xE3o</span>
                        <span class="step ${S.status!=="pending"?"done":""}">Em valida\xE7\xE3o</span>
                        <span class="step ${S.status==="submitted"||S.status==="launched"?"done":""}">Confirmada</span>
                        <span class="step ${S.status==="launched"?"done":""}">Lan\xE7ado</span>
                    </div>
                    ${F?`<div><strong>Detalhe:</strong> ${F}</div>`:""}
                    ${H?`<div><strong>Observa\xE7\xF5es:</strong> ${H}</div>`:""}
                    ${P?`<div><strong>Solicitada em:</strong> ${P}</div>`:""}
                    ${y?`<div><strong>Criada em:</strong> ${y}</div>`:""}
                    ${X?`<div><strong>\xDAltima trilha:</strong> ${escapeHtml(X)}</div>`:""}
                    <div><strong>Respons\xE1vel:</strong> ${S.createdBy||"Admin"}</div>
                </div>
            </div>
            <div class="lancamento-actions">
                <button class="btn-mini ${x}" ${_} ${M}>${B}</button>
                <button class="btn-mini btn-danger" onclick="deleteFtLaunch('${S.id}')" ${isAdminRole()?"":"disabled"}>Remover</button>
            </div>
        </div>
        `}).join(""),b=i?s.map(h=>`
            <div class="lancamentos-history-group">
                ${ftHistoryFilter.grouped?`<div class="lancamentos-history-group-title"><span>${h.label}</span><span class="history-count">${h.items.length} registro(s)</span></div>`:""}
                ${u(h.items)}
            </div>
        `).join(""):'<p class="empty-state">Nenhum lan\xE7amento para os filtros selecionados.</p>';e.innerHTML=`
        <div class="lancamentos-summary-line">Resultados: <strong>${i}</strong> registros</div>
        ${f}
        <div class="lancamentos-history-tools">
            <div class="form-group">
                <label>Buscar</label>
                <input type="text" id="ft-history-search" placeholder="RE, nome, unidade, motivo...">
            </div>
            <div class="form-group">
                <label>Unidade</label>
                <select id="ft-history-unit">
                    <option value="">Todas</option>
                    ${p.map(h=>`<option value="${h}">${h}</option>`).join("")}
                </select>
            </div>
            <div class="form-group">
                <label>Colaborador</label>
                <select id="ft-history-collab">
                    <option value="">Todos</option>
                    ${m.map(h=>`<option value="${h.value}">${h.label}</option>`).join("")}
                </select>
            </div>
            <div class="form-group">
                <label>Ordenar por</label>
                <select id="ft-history-sort">
                    <option value="date_desc">Data da FT (recente)</option>
                    <option value="date_asc">Data da FT (antiga)</option>
                    <option value="created_desc">Data de cria\xE7\xE3o (recente)</option>
                    <option value="created_asc">Data de cria\xE7\xE3o (antiga)</option>
                    <option value="requested_desc">Solicitada em (recente)</option>
                    <option value="requested_asc">Solicitada em (antiga)</option>
                    <option value="status">Status</option>
                    <option value="unit">Unidade</option>
                    <option value="collab">Colaborador</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-history-actions">
            <button class="filter-chip ${ftHistoryFilter.grouped?"active":""}" onclick="toggleFtHistoryGrouped()">Agrupar por dia</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistorico()">Exportar hist\xF3rico</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistoricoCsv()">CSV filtrado</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistoricoPdf()">PDF resumo</button>
        </div>
        ${b}
    `;const v=document.getElementById("ft-history-search");v&&(v.value=ftHistoryFilter.search||"",v.addEventListener("input",h=>{ftHistoryFilter.search=h.target.value||"",renderLancamentosHistorico()}));const E=document.getElementById("ft-history-unit");E&&(E.value=ftHistoryFilter.unit||"",E.addEventListener("change",h=>{ftHistoryFilter.unit=h.target.value||"",renderLancamentosHistorico()}));const k=document.getElementById("ft-history-collab");k&&(k.value=ftHistoryFilter.collab||"",k.addEventListener("change",h=>{ftHistoryFilter.collab=h.target.value||"",renderLancamentosHistorico()}));const $=document.getElementById("ft-history-sort");$&&($.value=ftHistoryFilter.sort||"date_desc",$.addEventListener("change",h=>{ftHistoryFilter.sort=h.target.value||"date_desc",renderLancamentosHistorico()}))}function buildFtFromForm(){const e=document.getElementById("ft-collab-select"),t=e?.value||"",a=e?.selectedOptions?.[0]?.text?.split("(")[0]?.trim()||"",o=document.getElementById("ft-unit-current")?.value.trim()||"",n=document.getElementById("ft-unit-target")?.value.trim()||"",s=document.getElementById("ft-date")?.value||"",i=document.getElementById("ft-shift")?.value.trim()||"",r=document.getElementById("ft-reason")?.value||"",l=document.getElementById("ft-reason-other")?.value.trim()||"",c=document.getElementById("ft-covering-select"),d=c?.value||"",p=c?.selectedOptions?.[0]?.text?.split("(")[0]?.trim()||"",g=document.getElementById("ft-covering-other")?.value.trim()||"",m=document.getElementById("ft-notes")?.value.trim()||"";let f=currentGroup||"";const u=currentData.find($=>$.re===t)||(allCollaboratorsCache.items||[]).find($=>$.re===t),b=(allCollaboratorsCache.items||[]).find($=>$.re===d);u?.grupo&&(f=u.grupo);const v=o||u?.posto||"";let E=d,k=g;return d==="NA"&&(E="",k="N\xE3o se aplica"),{collabRe:t,collabName:u?.nome||a,collabPhone:u?.telefone||"",unitCurrent:v,unitTarget:n,date:s,shift:i,reason:r,reasonOther:l,coveringRe:E,coveringName:b?.nome||p,coveringPhone:b?.telefone||"",coveringOther:k,notes:m,group:f}}function createFtLaunch(){showToast("Fluxo manual de FT est\xE1 desativado. Integra\xE7\xE3o Supabase pendente.","info")}function updateFtPostActions(){const e=document.getElementById("ft-copy-last"),t=document.getElementById("ft-send-last"),a=!!lastFtCreatedId;e&&(e.disabled=!a),t&&(t.disabled=!a)}function copyFtLastLink(){if(!lastFtCreatedId){showToast("Salve o lan\xE7amento primeiro.","error");return}copyFtLinkById(lastFtCreatedId)}function sendFtLastWhatsapp(){if(!lastFtCreatedId){showToast("Salve o lan\xE7amento primeiro.","error");return}sendFtWhatsappById(lastFtCreatedId)}function copyFtLinkById(e){const t=ftLaunches.find(o=>o.id===e);if(!t)return;const a=t.formLink||"";if(!a){showToast("Link de confirma\xE7\xE3o via Supabase pendente.","info");return}t.linkSentAt=t.linkSentAt||new Date().toISOString(),t.updatedAt=new Date().toISOString(),navigator.clipboard?.writeText(a),saveFtLaunches(),showToast("Link copiado.","success")}function sendFtWhatsappById(e){const t=ftLaunches.find(i=>i.id===e);if(!t)return;const a=t.formLink||"";if(!a){showToast("Link de confirma\xE7\xE3o via Supabase pendente.","info");return}const o=getFtReasonLabel(t.reason,t.reasonOther),n=t.coveringOther?t.coveringOther:t.coveringName?`${t.coveringName} (${t.coveringRe})`:t.coveringRe,s=`FT confirmac\u0327a\u0303o
${t.collabName} (${t.collabRe})
Unidade: ${t.unitTarget||t.unitCurrent}
Data: ${t.date}
Escala: ${t.shift}
Motivo: ${o}
Cobrindo: ${n||"-"}
Link: ${a}`;t.linkSentAt=t.linkSentAt||new Date().toISOString(),t.updatedAt=new Date().toISOString(),saveFtLaunches(),openWhatsApp(t.collabPhone,s)}function isMobileDevice(){return navigator.userAgentData&&typeof navigator.userAgentData.mobile=="boolean"?navigator.userAgentData.mobile:/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent||"")}function openWhatsApp(e,t){const a=isMobileDevice(),o=buildWhatsUrl(e,t,a?"mobile":"desktop");if(a){window.location.href=o;return}window.open(o,"_blank","noopener,noreferrer")||showToast("Permita pop-ups para abrir o WhatsApp Web em outra aba.","info")}function buildWhatsUrl(e,t,a="desktop"){const o=String(e||"").replace(/\D/g,""),n=o.length>=10?o.startsWith("55")?o:`55${o}`:"",s=new URLSearchParams;n&&s.set("phone",n),t&&s.set("text",t);const i=s.toString();return a==="mobile"?`whatsapp://send${i?`?${i}`:""}`:`https://web.whatsapp.com/send${i?`?${i}`:""}`}function applyFtToCollaborator(e){if(!e?.collabRe||!e?.date||!isFtToday(e))return;const t=currentData.find(s=>matchesRe(s.re,e.collabRe))||(allCollaboratorsCache.items||[]).find(s=>matchesRe(s.re,e.collabRe)),a=t?.re||e.collabRe,o=t?{...t}:collaboratorEdits[a]||{re:a,nome:e.collabName};if(o.rotulo&&o.rotulo!=="FT")return;o.rotulo="FT",o.rotuloInicio=e.date,o.rotuloFim=e.date,o.rotuloDetalhe=e.unitTarget||"",collaboratorEdits[a]=o;const n=currentData.find(s=>matchesRe(s.re,a));n&&(n.rotulo="FT",n.rotuloInicio=e.date,n.rotuloFim=e.date,n.rotuloDetalhe=e.unitTarget||""),saveLocalState()}function removeFtFromCollaborator(e){if(!e?.collabRe)return;const t=Object.keys(collaboratorEdits).find(o=>matchesRe(o,e.collabRe)),a=t?collaboratorEdits[t]:null;if(a&&a.rotulo==="FT"&&a.rotuloInicio===e.date&&a.rotuloFim===e.date){delete a.rotulo,delete a.rotuloInicio,delete a.rotuloFim,delete a.rotuloDetalhe,t&&(collaboratorEdits[t]=a);const o=currentData.find(n=>matchesRe(n.re,e.collabRe));o&&o.rotulo==="FT"&&o.rotuloInicio===e.date&&o.rotuloFim===e.date&&(delete o.rotulo,delete o.rotuloInicio,delete o.rotuloFim,delete o.rotuloDetalhe),saveLocalState()}}function setFtStatus(e,t,a={}){const o=normalizeFtStatus(e?.status||"pending"),n=normalizeFtStatus(t||"pending");e.status=n,e.updatedAt=new Date().toISOString(),o!==n&&logFtAudit("status_change",e,{...a,prevStatus:o,nextStatus:n}),n==="submitted"||n==="launched"?applyFtToCollaborator(e):n==="pending"&&removeFtFromCollaborator(e)}async function markFtLaunched(e){const t=ftLaunches.find(a=>a.id===e);!t||t.status!=="submitted"||(setFtStatus(t,"launched",{origin:"manual"}),saveFtLaunches(),renderLancamentosHistorico(),setTimeout(()=>flashLancamentoCard(t.id),100),showToast("FT marcada como lan\xE7ada.","success"))}function deleteFtLaunch(e){const t=ftLaunches.find(o=>o.id===e);if(!t||!confirm("Remover lan\xE7amento de FT?"))return;const a={...t};logFtAudit("removed",a,{origin:"manual_delete",prevStatus:a.status,note:"Lan\xE7amento removido manualmente"}),removeFtFromCollaborator(t),ftLaunches=ftLaunches.filter(o=>o.id!==e),saveFtLaunches(),renderLancamentosHistorico(),showToast("Lan\xE7amento removido.","warning",{actionLabel:"Desfazer",onAction:()=>{ftLaunches.unshift(a),logFtAudit("restored",a,{origin:"manual_restore",nextStatus:a.status,note:"Remo\xE7\xE3o desfeita"}),saveFtLaunches(),renderLancamentosHistorico(),setTimeout(()=>flashLancamentoCard(a.id),60)}})}let currentContactPhone="";function openPhoneModal(e,t){currentContactPhone=t,document.getElementById("phone-modal-title").innerText=e.split(" ")[0];const a=document.getElementById("phone-modal-number"),o=document.querySelector("#phone-modal .whatsapp-btn"),n=document.querySelector('#phone-modal button[onclick="contactCall()"]');if(t){let s=t;t.length===11?s=t.replace(/(\d{2})(\d{5})(\d{4})/,"($1) $2-$3"):t.length===10&&(s=t.replace(/(\d{2})(\d{4})(\d{4})/,"($1) $2-$3")),a.innerText=s,a.style.color="#666",o.disabled=!1,o.style.opacity="1",o.style.cursor="pointer",n.disabled=!1,n.style.opacity="1",n.style.cursor="pointer"}else a.innerText="Telefone n\xE3o vinculado",a.style.color="#dc3545",o.disabled=!0,o.style.opacity="0.5",o.style.cursor="not-allowed",n.disabled=!0,n.style.opacity="0.5",n.style.cursor="not-allowed";document.getElementById("phone-modal").classList.remove("hidden")}function closePhoneModal(){document.getElementById("phone-modal").classList.add("hidden"),currentContactPhone=""}function contactWhatsApp(){currentContactPhone&&openWhatsApp(currentContactPhone,"")}function contactCall(){currentContactPhone&&(window.location.href=`tel:${currentContactPhone}`)}window.onclick=function(e){const t=document.getElementById("edit-modal");e.target==t&&closeEditModal()};function verificarEscala(e,t){return verificarEscalaPorData(e,getTodayKey(),t)}function toggleManagementMenu(){const e=document.getElementById("managementMenu");e&&(e.classList.toggle("hidden"),updateMenuStatus())}function buildExportRows(){return currentData.map(e=>{const t=getStatusInfo(e);return{Nome:e.nome,RE:e.re,Unidade:e.posto,Escala:e.escala,Turma:e.turma===1?"\xCDmpar":"Par",Status:t.text,R\u00F3tulo:e.rotulo||"","Detalhe R\xF3tulo":e.rotuloDetalhe||"","In\xEDcio Afastamento":e.rotuloInicio?formatDate(e.rotuloInicio):"","Fim Afastamento":e.rotuloFim?formatDate(e.rotuloFim):""}})}function buildExportRowsFor(e){return(e||[]).map(t=>{const a=getStatusInfo(t);return{Nome:t.nome,RE:t.re,Unidade:t.posto,Escala:t.escala,Turma:t.turma===1?"\xCDmpar":"Par",Status:a.text,R\u00F3tulo:t.rotulo||"","Detalhe R\xF3tulo":t.rotuloDetalhe||"","In\xEDcio Afastamento":t.rotuloInicio?formatDate(t.rotuloInicio):"","Fim Afastamento":t.rotuloFim?formatDate(t.rotuloFim):""}})}function buildResumoRows(){const e={},t={};currentData.forEach(n=>{const s=getStatusInfo(n).text.includes("PLANT\xC3O")||getStatusInfo(n).text.includes("FT")?"PLANT\xC3O":"FOLGA",i=n.posto||"N/I";e[i]=e[i]||{unidade:i,total:0,plantao:0,folga:0},e[i].total+=1,s==="PLANT\xC3O"?e[i].plantao+=1:e[i].folga+=1,n.rotulo&&(t[n.rotulo]=(t[n.rotulo]||0)+1)});const a=Object.values(e).map(n=>({Unidade:n.unidade,Total:n.total,Plant\u00E3o:n.plantao,Folga:n.folga})),o=Object.keys(t).map(n=>({R\u00F3tulo:n,Quantidade:t[n]}));return{unitRows:a,rotuloRows:o}}function isPlantaoStatus(e){const t=getStatusInfo(e).text||"";return t.includes("PLANT\xC3O")||t.includes("FT")}function buildStatusRows(e){const t=e.filter(o=>isPlantaoStatus(o)).length,a=e.length-t;return[{Status:"PLANT\xC3O",Quantidade:t},{Status:"FOLGA",Quantidade:a}]}function buildGroupRows(e){const t={};return e.forEach(a=>{const o=(a.grupo||"N/I").toUpperCase();t[o]||(t[o]={Grupo:o,Total:0,Plantao:0,Folga:0}),t[o].Total+=1,isPlantaoStatus(a)?t[o].Plantao+=1:t[o].Folga+=1}),Object.values(t)}function buildResponsavelRows(e){const t={};return(e||[]).forEach(a=>{const o=(a.responsavel||"N/I").toUpperCase();t[o]=(t[o]||0)+1}),Object.keys(t).map(a=>({Respons\u00E1vel:a,Quantidade:t[a]})).sort((a,o)=>o.Quantidade-a.Quantidade)}function buildAcaoRows(e){const t={};return(e||[]).forEach(a=>{const o=(a.acao||"N/I").toUpperCase();t[o]=(t[o]||0)+1}),Object.keys(t).map(a=>({A\u00E7\u00E3o:a,Quantidade:t[a]})).sort((a,o)=>o.Quantidade-a.Quantidade)}function buildHistoryRows(e){return(e||[]).map(t=>({Data:t.data||"",Respons\u00E1vel:t.responsavel||"",A\u00E7\u00E3o:t.acao||"",Detalhe:t.detalhe||"",Altera\u00E7\u00F5es:Array.isArray(t.changes)&&t.changes.length?t.changes.map(a=>`${a.label}: ${a.from} \u2192 ${a.to}`).join(" | "):""}))}function buildHistoryByDayRows(e){const t={};return(e||[]).forEach(a=>{const o=(a.data||"").split(",")[0].trim()||"N/I";t[o]=(t[o]||0)+1}),Object.keys(t).map(a=>({Data:a,Quantidade:t[a]})).sort((a,o)=>(a.Data||"").localeCompare(o.Data||""))}function exportarBaseAtualizada(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const e=buildExportRows(),t=XLSX.utils.json_to_sheet(e),a=XLSX.utils.book_new();XLSX.utils.book_append_sheet(a,t,"Base Atualizada"),XLSX.writeFile(a,`base_atualizada_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Base atualizada gerada.","success")}function exportarSomentePlantao(){const e=currentData.filter(n=>isPlantaoStatus(n));if(!e.length){showToast("N\xE3o h\xE1 colaboradores em plant\xE3o.","info");return}const t=buildExportRowsFor(e),a=XLSX.utils.json_to_sheet(t),o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,a,"Somente Plantao"),XLSX.writeFile(o,`somente_plantao_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Exporta\xE7\xE3o de plant\xE3o gerada.","success")}function exportarSomenteFolga(){const e=currentData.filter(n=>!isPlantaoStatus(n));if(!e.length){showToast("N\xE3o h\xE1 colaboradores de folga.","info");return}const t=buildExportRowsFor(e),a=XLSX.utils.json_to_sheet(t),o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,a,"Somente Folga"),XLSX.writeFile(o,`somente_folga_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Exporta\xE7\xE3o de folga gerada.","success")}function exportarResumo(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=XLSX.utils.book_new();XLSX.utils.book_append_sheet(a,XLSX.utils.json_to_sheet(e),"Resumo por Unidade"),XLSX.utils.book_append_sheet(a,XLSX.utils.json_to_sheet(t),"Resumo por R\xF3tulo"),XLSX.writeFile(a,`resumo_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Resumo gerado.","success")}function exportarTudo(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const e=buildExportRows(),{unitRows:t,rotuloRows:a}=buildResumoRows(),o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(e),"Base Atualizada"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(t),"Resumo por Unidade"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(a),"Resumo por R\xF3tulo"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(changeHistory),"Historico Global"),XLSX.writeFile(o,`exportacao_completa_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Exporta\xE7\xE3o completa gerada.","success")}function exportUnitPrompt(e){openExportUnitModal(e)}function openExportUnitModal(e){exportUnitTarget=e;const t=document.getElementById("export-unit-modal"),a=document.getElementById("export-unit-note");a&&(a.textContent=e?`Unidade selecionada: ${e}`:""),t?.classList.remove("hidden")}function closeExportUnitModal(){document.getElementById("export-unit-modal")?.classList.add("hidden"),exportUnitTarget=null}function confirmExportUnit(e){if(!exportUnitTarget){showToast("Selecione uma unidade para exportar.","error");return}closeExportUnitModal(),exportUnitData(exportUnitTarget,e)}function exportUnitData(e,t="xlsx"){const a=currentData.filter(i=>i.posto===e);if(!a.length){showToast("Nenhum colaborador encontrado nesta unidade.","error");return}if(t==="csv"){const i=["Nome","RE","Posto","Escala","Turma","Status","R\xF3tulo"],r=a.map(p=>[`"${p.nome}"`,`"${p.re}"`,`"${p.posto}"`,`"${p.escala}"`,p.turma,getStatusInfo(p).text,p.rotulo||""]),l=[i.join(","),...r.map(p=>p.join(","))].join(`
`),c=new Blob([l],{type:"text/csv;charset=utf-8;"}),d=document.createElement("a");d.href=URL.createObjectURL(c),d.download=`unidade_${e.replace(/\s+/g,"_").toLowerCase()}_${new Date().toISOString().slice(0,10)}.csv`,d.click(),showToast("CSV da unidade gerado.","success");return}const o=buildExportRowsFor(a),n=XLSX.utils.json_to_sheet(o),s=XLSX.utils.book_new();XLSX.utils.book_append_sheet(s,n,"Unidade"),XLSX.writeFile(s,`unidade_${e.replace(/\s+/g,"_").toLowerCase()}_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("XLSX da unidade gerado.","success")}function exportarCSVAtualizado(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const e=["Nome","RE","Posto","Escala","Turma","Status","R\xF3tulo"],t=currentData.map(s=>[`"${s.nome}"`,`"${s.re}"`,`"${s.posto}"`,`"${s.escala}"`,s.turma,getStatusInfo(s).text,s.rotulo||""]),a=[e.join(","),...t.map(s=>s.join(","))].join(`
`),o=new Blob([a],{type:"text/csv;charset=utf-8;"}),n=document.createElement("a");n.href=URL.createObjectURL(o),n.download=`base_atualizada_${new Date().toISOString().slice(0,10)}.csv`,n.click(),showToast("CSV atualizado gerado.","success")}function exportarGraficos(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=[{Status:"PLANT\xC3O",Quantidade:currentData.filter(n=>getStatusInfo(n).text.includes("PLANT\xC3O")||getStatusInfo(n).text.includes("FT")).length},{Status:"FOLGA",Quantidade:currentData.filter(n=>!getStatusInfo(n).text.includes("PLANT\xC3O")&&!getStatusInfo(n).text.includes("FT")).length}],o=XLSX.utils.book_new();XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(a),"Status"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(e),"Unidades"),XLSX.utils.book_append_sheet(o,XLSX.utils.json_to_sheet(t),"Rotulos"),XLSX.writeFile(o,`dados_graficos_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Dados para gr\xE1ficos gerados.","success")}function exportarRelatorioIA(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=e.sort((i,r)=>r.Total-i.Total).slice(0,5),o=t.sort((i,r)=>r.Quantidade-i.Quantidade).slice(0,5),n=[{Resumo:"Relat\xF3rio gerado localmente (sem backend)",Detalhe:new Date().toLocaleString()},{Resumo:"Total de colaboradores",Detalhe:currentData.length},{Resumo:"Top 5 Unidades por efetivo",Detalhe:a.map(i=>`${i.Unidade} (${i.Total})`).join("; ")},{Resumo:"Top 5 R\xF3tulos",Detalhe:o.map(i=>`${i.R\u00F3tulo} (${i.Quantidade})`).join("; ")}],s=XLSX.utils.book_new();XLSX.utils.book_append_sheet(s,XLSX.utils.json_to_sheet(n),"Relatorio IA"),XLSX.writeFile(s,`relatorio_ia_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Relat\xF3rio IA gerado.","success")}function exportarResumoGerencial(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=buildGroupRows(currentData),o=buildStatusRows(currentData),n=buildResponsavelRows(changeHistory),s=buildAcaoRows(changeHistory),i=[{Indicador:"Data do relat\xF3rio",Valor:new Date().toLocaleString()},{Indicador:"Total de colaboradores",Valor:currentData.length},{Indicador:"Total de unidades",Valor:e.length},{Indicador:"Total de altera\xE7\xF5es (hist\xF3rico)",Valor:changeHistory.length}],r=XLSX.utils.book_new();XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(i),"Resumo Geral"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(o),"Por Status"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(a),"Por Grupo"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(e),"Por Unidade"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(t),"Por R\xF3tulo"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(n),"Respons\xE1veis"),XLSX.utils.book_append_sheet(r,XLSX.utils.json_to_sheet(s),"A\xE7\xF5es"),XLSX.writeFile(r,`resumo_gerencial_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Resumo gerencial gerado.","success")}function exportarHistoricoDetalhado(){if(changeHistory.length===0){showToast("N\xE3o h\xE1 hist\xF3rico para exportar.","error");return}const e=buildHistoryRows(changeHistory),t=buildResponsavelRows(changeHistory),a=buildAcaoRows(changeHistory),o=buildHistoryByDayRows(changeHistory),n=XLSX.utils.book_new();XLSX.utils.book_append_sheet(n,XLSX.utils.json_to_sheet(e),"Historico"),XLSX.utils.book_append_sheet(n,XLSX.utils.json_to_sheet(t),"Por Responsavel"),XLSX.utils.book_append_sheet(n,XLSX.utils.json_to_sheet(a),"Por Acao"),XLSX.utils.book_append_sheet(n,XLSX.utils.json_to_sheet(o),"Por Dia"),XLSX.writeFile(n,`historico_detalhado_${new Date().toISOString().slice(0,10)}.xlsx`),showToast("Hist\xF3rico detalhado gerado.","success")}function exportarRelatorioTexto(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=buildGroupRows(currentData),o=buildStatusRows(currentData),n=buildResponsavelRows(changeHistory).slice(0,10),s=e.sort((d,p)=>p.total-d.total).slice(0,10),i=t.sort((d,p)=>p.Quantidade-d.Quantidade).slice(0,10),r=[];r.push("RELAT\xD3RIO EXECUTIVO - GERENCIAMENTO DE EFETIVOS"),r.push(`Gerado em: ${new Date().toLocaleString()}`),r.push(""),r.push(`Total de colaboradores: ${currentData.length}`),r.push(`Total de unidades: ${e.length}`),r.push(`Total de altera\xE7\xF5es (hist\xF3rico): ${changeHistory.length}`),r.push(""),r.push("Status:"),o.forEach(d=>r.push(`- ${d.Status}: ${d.Quantidade}`)),r.push(""),r.push("Por Grupo:"),a.forEach(d=>r.push(`- ${d.Grupo}: ${d.Total} (Plant\xE3o ${d.Plantao} / Folga ${d.Folga})`)),r.push(""),r.push("Top 10 Unidades por efetivo:"),s.forEach(d=>r.push(`- ${d.unidade}: ${d.total}`)),r.push(""),r.push("Top 10 R\xF3tulos:"),i.forEach(d=>r.push(`- ${d.R\u00F3tulo}: ${d.Quantidade}`)),r.push(""),r.push("Top Respons\xE1veis (Hist\xF3rico):"),n.forEach(d=>r.push(`- ${d.Respons\u00E1vel}: ${d.Quantidade}`));const l=new Blob([r.join(`
`)],{type:"text/plain;charset=utf-8"}),c=document.createElement("a");c.href=URL.createObjectURL(l),c.download=`relatorio_executivo_${new Date().toISOString().slice(0,10)}.txt`,c.click(),showToast("Relat\xF3rio texto gerado.","success")}function exportarPDFResumoExecutivo(){if(currentData.length===0){showToast("N\xE3o h\xE1 dados para exportar.","error");return}if(!window.jspdf||!window.jspdf.jsPDF){showToast("Biblioteca de PDF n\xE3o carregada.","error");return}const{unitRows:e,rotuloRows:t}=buildResumoRows(),a=buildGroupRows(currentData),o=buildStatusRows(currentData),n=e.sort((c,d)=>d.total-c.total).slice(0,8),s=t.sort((c,d)=>d.Quantidade-c.Quantidade).slice(0,8),i=new window.jspdf.jsPDF,r=i.internal.pageSize.getWidth();let l=14;i.setFontSize(14),i.text("Resumo Executivo - Gerenciamento de Efetivos",14,l),l+=8,i.setFontSize(10),i.text(`Gerado em: ${new Date().toLocaleString()}`,14,l),l+=8,i.text(`Total de colaboradores: ${currentData.length}`,14,l),l+=6,i.text(`Total de unidades: ${e.length}`,14,l),l+=8,i.setFontSize(11),i.text("Status",14,l),l+=6,i.setFontSize(10),o.forEach(c=>{i.text(`- ${c.Status}: ${c.Quantidade}`,16,l),l+=5}),l+=4,i.setFontSize(11),i.text("Por Grupo",14,l),l+=6,i.setFontSize(10),a.forEach(c=>{i.text(`- ${c.Grupo}: ${c.Total} (Plant\xE3o ${c.Plantao} / Folga ${c.Folga})`,16,l),l+=5,l>270&&(i.addPage(),l=14)}),l+=4,i.setFontSize(11),i.text("Top Unidades",14,l),l+=6,i.setFontSize(10),n.forEach(c=>{i.text(`- ${c.unidade}: ${c.total}`,16,l),l+=5,l>270&&(i.addPage(),l=14)}),l+=4,i.setFontSize(11),i.text("Top R\xF3tulos",14,l),l+=6,i.setFontSize(10),s.forEach(c=>{i.text(`- ${c.R\u00F3tulo}: ${c.Quantidade}`,16,l),l+=5,l>270&&(i.addPage(),l=14)}),i.save(`resumo_executivo_${new Date().toISOString().slice(0,10)}.pdf`),showToast("PDF gerado.","success")}function exportarPDFHistorico(){if(changeHistory.length===0){showToast("N\xE3o h\xE1 hist\xF3rico para exportar.","error");return}if(!window.jspdf||!window.jspdf.jsPDF){showToast("Biblioteca de PDF n\xE3o carregada.","error");return}const e=new window.jspdf.jsPDF;let t=14;e.setFontSize(14),e.text("Hist\xF3rico de Altera\xE7\xF5es (Resumo)",14,t),t+=8,e.setFontSize(10),e.text(`Gerado em: ${new Date().toLocaleString()}`,14,t),t+=8,changeHistory.slice(0,40).forEach(o=>{const n=`${o.data||""} - ${o.responsavel||""} - ${o.acao||""}`;e.text(n,14,t),t+=5,t>275&&(e.addPage(),t=14)}),e.save(`historico_${new Date().toISOString().slice(0,10)}.pdf`),showToast("PDF gerado.","success")}function openExportModal(){document.getElementById("export-modal")?.classList.remove("hidden")}function closeExportModal(){document.getElementById("export-modal")?.classList.add("hidden")}async function loginSite(e={}){const t=e.source||"config",a=e.target||(t==="supervisao"?"supervisao":"config"),o=t==="supervisao"?document.getElementById("supervisao-login-email"):document.getElementById("loginEmail"),n=t==="supervisao"?document.getElementById("supervisao-login-password"):document.getElementById("loginPassword"),s=o?.value.trim()||"",i=n?.value||"";if(!s||!i){showToast("Informe e-mail e senha.","error");return}if(!isSupabaseReady()){showToast("Supabase n\xE3o configurado.","error");return}const r=document.getElementById("keepLoggedCheck"),l=r?r.checked:!0;showToast("Entrando...","loading",{id:"auth-login",autoClose:!1});const{data:c,error:d}=await supabaseClient.auth.signInWithPassword({email:s,password:i});if(hideToastById("auth-login"),d||!c?.session){const p=d?.message?` (${d.message})`:"";showToast(`Acesso negado. Verifique e-mail e senha.${p}`,"error");return}if(l?localStorage.setItem("sessionOnly","0"):(localStorage.setItem("sessionOnly","1"),sessionStorage.setItem("sessionActive","1")),await applyAuthSession(c.session),a==="supervisao"){openSupervisaoPage(),updateMenuStatus(),renderSupervisaoAdminList(),renderSupervisaoHistory(),updateSupervisaoEditorVisibility(),updateSupervisaoAdminStatus(),showToast("Login efetuado com sucesso.","success");return}if(a==="gateway"){renderGateway(),updateMenuStatus(),showToast("Login efetuado com sucesso.","success");return}renderDashboard(),clearSearchStateAfterAuth(),switchTab("config"),renderAdminList(),renderAuditList(),showToast("Login efetuado com sucesso.","success")}async function signupSite(e={}){const t=e.source||"config",a=t==="supervisao"?document.getElementById("supervisao-login-email"):document.getElementById("loginEmail"),o=t==="supervisao"?document.getElementById("supervisao-login-password"):document.getElementById("loginPassword"),n=a?.value.trim()||"",s=o?.value||"";if(!n||!s){showToast("Informe e-mail e senha para criar a conta.","error");return}if(!isSupabaseReady()){showToast("Supabase n\xE3o configurado.","error");return}showToast("Criando conta...","loading",{id:"auth-signup",autoClose:!1});const{data:i,error:r}=await supabaseClient.auth.signUp({email:n,password:s});if(hideToastById("auth-signup"),r){showToast(r.message||"Falha ao criar conta.","error");return}i?.session&&(await applyAuthSession(i.session),clearSearchStateAfterAuth()),showToast("Conta criada. Verifique seu e-mail para confirmar.","success")}async function requestPasswordReset(e={}){const o=((e.source||"config")==="supervisao"?document.getElementById("supervisao-login-email"):document.getElementById("loginEmail"))?.value.trim()||"";if(!o){showToast("Informe seu e-mail.","error");return}if(!isSupabaseReady()){showToast("Supabase n\xE3o configurado.","error");return}const n=window.location.origin+window.location.pathname,{error:s}=await supabaseClient.auth.resetPasswordForEmail(o,{redirectTo:n});if(s){showToast(s.message||"Falha ao enviar reset de senha.","error");return}showToast("Enviamos um e-mail com o link para redefinir a senha.","success")}async function logoutSite(e={}){if(isSupabaseReady()&&await supabaseClient.auth.signOut(),localStorage.removeItem("sessionOnly"),sessionStorage.removeItem("sessionActive"),resetAuthState(),CONFIG?.auth?.requireLogin){showLoginScreen();return}if(e.target==="supervisao"){openSupervisaoPage(),updateMenuStatus(),updateSupervisaoAdminStatus();return}if(e.target==="gateway"){renderGateway(),updateMenuStatus();return}renderDashboard(),switchTab("config")}function toggleEditMode(){!SiteAuth.logged||!canEditBase()||(SiteAuth.mode=SiteAuth.mode==="edit"?"view":"edit",document.body.classList.toggle("mode-edit",SiteAuth.mode==="edit"),updateMenuStatus(),updateSupervisaoAdminStatus())}function renderAdminList(){const e=document.getElementById("userList");if(!e)return;if(!canManageUsers()){e.innerHTML="";return}const t=(SiteAuth.admins||[]).map(a=>{const o=ROLE_LABELS[a.role]||a.role||"Visitante",n=a.role||"visitante",s=Array.isArray(a.groups)&&a.groups.length?a.groups.join(", "):"Sem grupo";return`
            <div class="admin-row admin-row-clickable" onclick="fillUserPermissionForm(${escapeHtml(JSON.stringify(a.email||""))})">
                <div class="admin-row-main">
                    <span class="admin-name">${escapeHtml(a.name||a.email||"Usu\xE1rio")}</span>
                    <span class="role-badge role-${n}" style="font-size:10px;padding:2px 8px;">${o}</span>
                </div>
                <div class="admin-row-meta">
                    <span class="admin-meta">${escapeHtml(a.email||"")}</span>
                    <span class="admin-groups">${escapeHtml(s)}</span>
                </div>
            </div>
        `}).join("");e.innerHTML=t||'<div class="admin-empty">Nenhum usu\xE1rio encontrado.</div>',updateAvisoAssigneeFilter()}function fillUserPermissionForm(e){const t=document.getElementById("cfg-user-email"),a=document.getElementById("cfg-user-role");t&&(t.value=e);const o=(SiteAuth.admins||[]).find(s=>String(s.email||"").toLowerCase()===String(e).toLowerCase());o&&a&&(a.value=o.role||"visitante");const n=document.getElementById("cfg-user-groups-checkboxes");if(n){const s=Array.isArray(o?.groups)?o.groups:[];n.querySelectorAll('input[type="checkbox"]').forEach(i=>{i.checked=s.includes(i.value)})}document.getElementById("adminAssignPanel")?.scrollIntoView({behavior:"smooth",block:"center"})}function getCheckedGroups(e){const t=document.getElementById(e);return t?Array.from(t.querySelectorAll('input[type="checkbox"]:checked')).map(a=>a.value):[]}async function refreshUserList(){canManageUsers()&&(await refreshAssignableUsers(!0),renderAdminList())}async function upsertUserProfileFromConfig(){if(!canManageUsers()){showToast("Apenas administradores podem alterar permiss\xF5es.","error");return}const e=document.getElementById("cfg-user-email")?.value.trim().toLowerCase(),t=document.getElementById("cfg-user-role")?.value||"visitante",a=getCheckedGroups("cfg-user-groups-checkboxes");if(!e){showToast("Informe o e-mail do usu\xE1rio.","error");return}let n=(await fetchProfiles(!0)||[]).find(i=>String(i?.email||"").toLowerCase()===e);if(!n){const i=await supabaseClient.from(SUPABASE_TABLES.profiles).select("id, email").ilike("email",e).maybeSingle();!i.error&&i.data?.id&&(n=i.data)}if(!n){showToast("Usu\xE1rio n\xE3o encontrado na tabela de perfis. Se ele j\xE1 logou, valide o e-mail e o projeto Supabase em produ\xE7\xE3o.","error");return}const{error:s}=await supabaseClient.from(SUPABASE_TABLES.profiles).update({role:t,groups:a}).eq("id",n.id);if(s){showToast("Falha ao atualizar permiss\xF5es.","error");return}showToast("Permiss\xF5es atualizadas.","success"),await refreshUserList(),document.getElementById("cfg-user-email").value="",document.getElementById("cfg-user-groups-checkboxes")?.querySelectorAll('input[type="checkbox"]').forEach(i=>{i.checked=!1}),document.getElementById("cfg-user-role").value="visitante"}function addAdminFromConfig(){showToast("Use o painel de permiss\xF5es com e-mail.","info")}function addSupervisorFromConfig(){showToast("Use o painel de permiss\xF5es com e-mail.","info")}function removeAdmin(){showToast("Remo\xE7\xE3o de usu\xE1rio deve ser feita via painel do Supabase.","info")}function updateAdminResetOptions(){}function changeOtherAdminPassword(){showToast("Para reset de senha, use o fluxo 'Esqueci senha'.","info")}function addPreRegisteredEmail(){if(!canManageUsers())return;const e=document.getElementById("preReg-email"),t=document.getElementById("preReg-role"),a=e?.value.trim().toLowerCase(),o=t?.value||"operacional",n=getCheckedGroups("preReg-groups-checkboxes");if(!a||!a.includes("@")){showToast("Informe um e-mail v\xE1lido.","error");return}if(preRegisteredEmails.some(s=>s.email===a)){showToast("Esse e-mail j\xE1 est\xE1 pr\xE9-cadastrado.","info");return}preRegisteredEmails.push({email:a,role:o,groups:n}),savePreRegisteredEmails(),renderPreRegList(),e.value="",t.value="operacional",document.getElementById("preReg-groups-checkboxes")?.querySelectorAll('input[type="checkbox"]').forEach(s=>{s.checked=!1}),showToast("E-mail pr\xE9-cadastrado. Quando essa pessoa criar conta, receber\xE1 o cargo automaticamente.","success")}function removePreRegisteredEmail(e){canManageUsers()&&(preRegisteredEmails.splice(e,1),savePreRegisteredEmails(),renderPreRegList())}function renderPreRegList(){const e=document.getElementById("preRegList");if(e){if(!preRegisteredEmails.length){e.innerHTML='<div class="admin-empty">Nenhum e-mail pr\xE9-cadastrado.</div>';return}e.innerHTML=preRegisteredEmails.map((t,a)=>{const o=ROLE_LABELS[t.role]||t.role,n=t.role||"visitante",s=Array.isArray(t.groups)&&t.groups.length?t.groups.join(", "):"Sem grupo";return`
            <div class="admin-row">
                <div class="admin-row-main">
                    <span class="admin-name">${escapeHtml(t.email)}</span>
                    <span class="role-badge role-${n}" style="font-size:10px;padding:2px 8px;">${o}</span>
                </div>
                <div class="admin-row-meta">
                    <span class="admin-groups">${escapeHtml(s)}</span>
                    <button class="btn-mini btn-danger" onclick="removePreRegisteredEmail(${a})">Remover</button>
                </div>
            </div>
        `}).join("")}}function savePreRegisteredEmails(){localStorage.setItem("preRegisteredEmails",JSON.stringify(preRegisteredEmails)),scheduleLocalSync("pre-registered-emails")}function loadPreRegisteredEmails(){try{preRegisteredEmails=JSON.parse(localStorage.getItem("preRegisteredEmails")||"[]")}catch{preRegisteredEmails=[]}}function renderFtReasonsConfig(){const e=document.getElementById("ftReasonsList");if(!e)return;const t=ftReasons.map((a,o)=>`
        <div class="admin-row">
            <span class="admin-name">${a.label||a.value}</span>
            <button onclick="removeFtReason(${o})" class="btn-mini btn-danger">X</button>
        </div>
    `).join("");e.innerHTML=t||'<div class="admin-empty">Nenhum motivo cadastrado.</div>'}function addFtReason(){if(!(SiteAuth.logged&&SiteAuth.role!=="supervisor"))return;const e=document.getElementById("ft-reason-new"),t=e?.value.trim();if(!t)return;const a=t.toLowerCase().replace(/\s+/g,"_");if(ftReasons.some(o=>o.value===a)){showToast("Esse motivo j\xE1 existe.","info");return}ftReasons.push({value:a,label:t}),saveFtReasons(),renderFtReasonsConfig(),e.value=""}function removeFtReason(e){SiteAuth.logged&&SiteAuth.role!=="supervisor"&&confirm("Remover motivo?")&&(ftReasons.splice(e,1),saveFtReasons(),renderFtReasonsConfig())}function updateMenuStatus(){const e=document.getElementById("userRe"),t=document.getElementById("siteMode"),a=document.getElementById("sourceStatus"),o=document.getElementById("adminTools"),n=document.getElementById("auth-indicator"),s=document.getElementById("quick-logout-btn"),i=CONFIG?.dataSource==="supabase",r=document.getElementById("quick-actions-note");document.querySelectorAll('[data-hide-when-supabase="1"]').forEach(g=>{g.classList.toggle("hidden",i)}),r&&(r.textContent="Use estes atalhos para atualizar a base e exportar relat\xF3rios."),e&&(e.innerHTML=SiteAuth.logged?`<span style="color:#28a745">\u25CF</span> ${SiteAuth.user||SiteAuth.email||"Usu\xE1rio"}`:'<span style="color:#666">\u25CF</span> Desconectado');const l=document.getElementById("userRoleLabel");if(l){const g=ROLE_LABELS[SiteAuth.role]||"Operacional";l.innerHTML=SiteAuth.logged?`<span class="status-badge-menu view">${g}</span>`:'<span style="color:#666">\u2014</span>'}if(t){const g=ROLE_LABELS[SiteAuth.role]||"Usu\xE1rio",m=SiteAuth.mode==="edit"?"EDI\xC7\xC3O":"VISUALIZA\xC7\xC3O";t.innerHTML=`<span class="status-badge-menu ${SiteAuth.mode==="edit"?"edit":"view"}">${g.toUpperCase()} \u2022 ${m}</span>`}if(a){const g=isSupabaseReady()?"\u{1F7E2} Ativo":"\u{1F534} Indispon\xEDvel";a.innerHTML=`
            <div>Fonte atual: Supabase</div>
            <div>Supabase: ${g}</div>
        `}if(n)if(SiteAuth.logged){const g=ROLE_LABELS[SiteAuth.role]||"Usu\xE1rio";n.innerHTML=`<span class="dot"></span> Logado${SiteAuth.user?`: ${SiteAuth.user}`:""}`,n.title=`Logado como ${SiteAuth.user||"Usuario"} (${g})`,n.classList.remove("hidden")}else n.classList.add("hidden"),n.textContent="",n.removeAttribute("title");s&&s.classList.toggle("hidden",!SiteAuth.logged),renderEscalaInvertidaUI(),o&&(o.classList.toggle("hidden",!(SiteAuth.logged&&canManageUsers())),SiteAuth.logged&&canManageUsers()&&renderAdminList());const c=document.getElementById("adminAssignPanel");c&&c.classList.toggle("hidden",!(SiteAuth.logged&&canManageUsers()));const d=document.getElementById("preRegPanel");d&&d.classList.toggle("hidden",!(SiteAuth.logged&&canManageUsers()));const p=document.getElementById("teamNoAccess");p&&p.classList.toggle("hidden",!!(SiteAuth.logged&&canManageUsers())),SiteAuth.logged&&canEditBase()&&renderFtReasonsConfig(),renderMyRoleDescription(),renderRolePermissionsTable(),updateTeamPaneVisibility(),renderDataSourceList(),renderConfigSummary(),renderRoadmapList(),renderAuditList(),updateAvisosUI()}function reloadCurrentGroupData(){if(!currentGroup){showToast("Selecione um grupo para recarregar os dados.","info");return}loadGroup(currentGroup)}function getCollaboratorCountsByGroup(){const e={bombeiros:0,servicos:0,seguranca:0,rb:0,todos:0};return(allCollaboratorsCache.items||currentData||[]).forEach(a=>{const o=a.grupo||"";e[o]!==void 0&&(e[o]+=1),e.todos+=1}),e}const ROLE_PERM_DESCRIPTIONS={visitante:{label:"Visitante",summary:"Acesso m\xEDnimo de consulta. Pode navegar e visualizar dados b\xE1sicos, sem permiss\xE3o de edi\xE7\xE3o.",abilities:["Busca r\xE1pida de colaboradores","Visualizar unidades e escalas","Navegar pelo sistema"],restrictions:["N\xE3o pode editar colaboradores ou unidades","N\xE3o pode lan\xE7ar FT ou avisos","N\xE3o pode gerenciar usu\xE1rios","N\xE3o pode alterar configura\xE7\xF5es","N\xE3o pode inverter escalas"]},operacional:{label:"Operacional",summary:"Acesso somente leitura. Pode consultar colaboradores, unidades e escalas.",abilities:["Busca r\xE1pida de colaboradores","Visualizar unidades e escalas","Consultar avisos e lan\xE7amentos","Ver informa\xE7\xF5es de contato"],restrictions:["N\xE3o pode editar colaboradores ou unidades","N\xE3o pode lan\xE7ar FT ou avisos","N\xE3o pode gerenciar usu\xE1rios","N\xE3o pode alterar configura\xE7\xF5es"]},supervisor:{label:"Supervisor",summary:"Pode editar dados do seu grupo. Ideal para l\xEDderes de equipe e supervisores de campo.",abilities:["Tudo do cargo Operacional","Editar colaboradores do seu grupo","Lan\xE7ar FTs e registrar avisos","Editar unidades do seu grupo","Registrar trocas e afastamentos"],restrictions:["N\xE3o pode acessar outros grupos","N\xE3o pode gerenciar usu\xE1rios","N\xE3o pode alterar motivos de FT"]},coordenador:{label:"Coordenador",summary:"Acesso a todos os grupos com permiss\xE3o de edi\xE7\xE3o. Para coordenadores de opera\xE7\xE3o.",abilities:["Tudo do cargo Supervisor","Visualizar e editar todos os grupos","Acessar dashboards gerenciais","Exportar relat\xF3rios de qualquer grupo","Gerenciar motivos de FT"],restrictions:["N\xE3o pode gerenciar usu\xE1rios ou permiss\xF5es"]},gerencia:{label:"Ger\xEAncia",summary:"Vis\xE3o completa da opera\xE7\xE3o com acesso a dashboards e relat\xF3rios avan\xE7ados.",abilities:["Tudo do cargo Coordenador","Acesso completo ao painel gerencial","Relat\xF3rios consolidados multi-grupo","Indicadores operacionais avan\xE7ados"],restrictions:["N\xE3o pode gerenciar usu\xE1rios ou permiss\xF5es"]},administrador:{label:"Administrador",summary:"Controle total do sistema. Pode gerenciar usu\xE1rios, permiss\xF5es e todas as configura\xE7\xF5es.",abilities:["Tudo do cargo Ger\xEAncia","Criar e remover usu\xE1rios","Atribuir cargos e permiss\xF5es","Conceder acesso a novos colaboradores","Configurar grupos e escalas","Acesso total a todas as funcionalidades"],restrictions:[]}};function renderMyRoleDescription(){const e=document.getElementById("myRoleDescription");if(!e)return;if(!SiteAuth.logged){e.innerHTML='<span style="color:#666">Fa\xE7a login para ver suas permiss\xF5es.</span>';return}const t=SiteAuth.role||"operacional",a=ROLE_PERM_DESCRIPTIONS[t]||ROLE_PERM_DESCRIPTIONS.operacional,o=SiteAuth.groups?.length?SiteAuth.groups.join(", "):"Nenhum grupo atribu\xEDdo";e.innerHTML=`
        <div class="role-detail-card">
            <div class="role-detail-header">
                <span class="role-badge role-${t}">${a.label}</span>
                <span class="role-groups-text">Grupos: ${escapeHtml(o)}</span>
            </div>
            <p class="role-summary">${a.summary}</p>
            <div class="role-abilities">
                <strong>O que voc\xEA pode fazer:</strong>
                <ul>${a.abilities.map(n=>`<li>${n}</li>`).join("")}</ul>
            </div>
            ${a.restrictions.length?`
            <div class="role-restrictions">
                <strong>Restri\xE7\xF5es:</strong>
                <ul>${a.restrictions.map(n=>`<li>${n}</li>`).join("")}</ul>
            </div>
            `:""}
        </div>
    `}function renderRolePermissionsTable(){const e=document.getElementById("rolePermissionsTable");if(!e)return;const t=["visitante","operacional","supervisor","coordenador","gerencia","administrador"],a=[{label:"Visualizar dados",key:"view"},{label:"Editar colaboradores",key:"canEdit"},{label:"Lan\xE7ar FT / Avisos",key:"canEdit"},{label:"Ver todos os grupos",key:"canViewAllGroups"},{label:"Gerenciar usu\xE1rios",key:"canManageUsers"},{label:"Configurar sistema",key:"canManageUsers"}],o=t.map(s=>`<th class="role-th">${ROLE_LABELS[s]}</th>`).join(""),n=a.map(s=>{const i=t.map(r=>{const l=ROLE_PERMS[r]||{},c=s.key==="view"?!0:!!l[s.key];return`<td class="role-td ${c?"perm-yes":"perm-no"}">${c?"\u2713":"\u2014"}</td>`}).join("");return`<tr><td class="role-td-label">${s.label}</td>${i}</tr>`}).join("");e.innerHTML=`
        <table class="role-perm-grid">
            <thead><tr><th class="role-th-label">Permiss\xE3o</th>${o}</tr></thead>
            <tbody>${n}</tbody>
        </table>
    `}function updateTeamPaneVisibility(){const e=document.getElementById("adminTools"),t=document.getElementById("adminAssignPanel"),a=document.getElementById("preRegPanel"),o=document.getElementById("teamNoAccess"),n=SiteAuth.logged&&canManageUsers();e&&e.classList.toggle("hidden",!n),t&&t.classList.toggle("hidden",!n),a&&a.classList.toggle("hidden",!n),o&&o.classList.toggle("hidden",n)}function renderConfigSummary(){const e=document.getElementById("config-summary");if(!e)return;const t=getCollaboratorCountsByGroup(),a=new Set((currentData||[]).map(r=>r.posto).filter(Boolean)).size,o=changeHistory.length,n=lastUpdatedAt?lastUpdatedAt.toLocaleString():"\u2014",s=isSupabaseReady()?"Ativo":"Indispon\xEDvel",i=isSupabaseReady()?"ok":"off";e.innerHTML=`
        <div class="config-summary-grid">
            <div class="config-summary-card">
                <div class="label">Registros</div>
                <div class="value">${currentData.length}</div>
                <div class="meta">Grupo atual</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Unidades</div>
                <div class="value">${a}</div>
                <div class="meta">Ativas</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Altera\xE7\xF5es</div>
                <div class="value">${o}</div>
                <div class="meta">Hist\xF3rico local</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Supabase</div>
                <div class="value"><span class="status-pill ${i}">${s}</span></div>
                <div class="meta">Conex\xE3o</div>
            </div>
            <div class="config-summary-card">
                <div class="label">\xDAltima atualiza\xE7\xE3o</div>
                <div class="value">${n}</div>
                <div class="meta">Base local</div>
            </div>
        </div>
        <div class="config-summary-chips">
            <span class="summary-chip">Bombeiros: ${t.bombeiros}</span>
            <span class="summary-chip">Servi\xE7os: ${t.servicos}</span>
            <span class="summary-chip">Seguran\xE7a: ${t.seguranca}</span>
            <span class="summary-chip">RB: ${t.rb}</span>
            <span class="summary-chip">Total: ${t.todos}</span>
        </div>
    `}function renderRoadmapList(){const e=document.getElementById("roadmap-list");if(!e)return;const t={concluido:"Conclu\xEDdo",andamento:"Em andamento",planejado:"Planejado"};e.innerHTML=ROADMAP_ITEMS.map(a=>`
        <div class="roadmap-item">
            <div class="roadmap-top">
                <strong>${a.title}</strong>
                <span class="roadmap-status ${a.status}">${t[a.status]||a.status}</span>
            </div>
            <div class="roadmap-meta">${a.area}</div>
            <div class="roadmap-detail">${a.detail}</div>
        </div>
    `).join("")}function renderAuditList(){const e=document.getElementById("auditList");if(!e)return;if(changeHistory.length>0){e.innerHTML=changeHistory.slice(0,20).map(n=>`
            <div class="audit-item">
                <strong>${n.responsavel}</strong> \u2014 ${n.acao}<br>
                <span>${n.detalhe}</span>
            </div>
        `).join("");return}const t=Object.keys(collaboratorEdits||{}),a=Object.keys(unitMetadata||{});if(t.length===0&&a.length===0){e.innerHTML='<div class="audit-item">Nenhuma altera\xE7\xE3o registrada.</div>';return}let o="";t.forEach(n=>{o+=`
            <div class="audit-item">
                <strong>${collaboratorEdits[n].nome}</strong><br>
                <span>RE ${n} \u2014 altera\xE7\xE3o local</span>
            </div>
        `}),a.forEach(n=>{o+=`
            <div class="audit-item">
                <strong>Unidade ${n}</strong><br>
                <span>Metadados locais</span>
            </div>
        `}),e.innerHTML=o}function getLocalCollaborators(){const e=localStorage.getItem("localCollaborators");if(!e)return[];try{return JSON.parse(e)||[]}catch{return[]}}function saveLocalCollaborators(e,t=!1){localStorage.setItem("localCollaborators",JSON.stringify(e)),scheduleLocalSync("local-collaborators",{silent:t})}function mergeLocalCollaborators(e,t){const a=getLocalCollaborators();if(!a.length)return e;const o=t==="todos"?a:a.filter(i=>i.grupo===t),n=new Set(e.map(i=>i.re)),s=o.filter(i=>!n.has(i.re));return e.concat(s)}function addLocalCollaboratorFromConfig(){if(!(SiteAuth.logged&&SiteAuth.mode==="edit")){showToast("Apenas admins em modo edi\xE7\xE3o podem adicionar.","error");return}const e=document.getElementById("cfg-re").value.trim();if(!e){showToast("Informe o RE do colaborador.","error");return}const t=currentData.find(n=>n.re===e||n.re?.endsWith(e));if(!t){showToast("Colaborador n\xE3o encontrado na base carregada.","error");return}const a=getLocalCollaborators();if(a.some(n=>n.re===t.re)){showToast("Colaborador j\xE1 est\xE1 no cadastro local.","info");return}const o={...t};a.push(o),saveLocalCollaborators(a),document.getElementById("cfg-re").value="",renderizarUnidades(),currentTab==="busca"&&realizarBusca(),changeHistory.unshift({data:new Date().toLocaleString(),responsavel:SiteAuth.user||"Admin",acao:"Adi\xE7\xE3o",detalhe:`Adicionou ${o.nome} (RE ${o.re}) localmente`}),saveLocalState(),renderAuditList(),showToast("Colaborador adicionado localmente.","success")}function changeLocalAdminPassword(){showToast("Use 'Esqueci senha' para alterar a senha.","info")}function renderDataSourceList(){const e=document.getElementById("dataSourceList");if(!e)return;const t=isSupabaseReady(),a=[{name:"Supabase \u2022 colaboradores",status:t?"ATIVO":"OFF",count:allCollaboratorsCache.items?.length||currentData.length},{name:"Supabase \u2022 unidades",status:t?"ATIVO":"OFF",count:supaUnitsCache.items?.length||unitAddressDb?.entries?.length||0}];e.innerHTML=a.map(o=>`
        <div class="source-row">
            <span>${o.name}${Number.isFinite(o.count)?` <span class="source-count">${o.count}</span>`:""}</span>
            <span class="source-pill ${o.status==="ATIVO"?"ok":"off"}">${o.status}</span>
        </div>
    `).join("")}const AppFeatureRegistry=Object.freeze({gateway:Object.freeze({loadGroup,resetToGateway,openSupervisaoPage,openGerenciaPage}),search:Object.freeze({realizarBusca,runStandardSearch,handleSearchTokenSuggest,applySearchToken}),units:Object.freeze({renderizarUnidades,navigateToUnit,openAddressModalForUnit,openAddressModalForCollaborator}),avisos:Object.freeze({renderAvisos,createAviso,createReminder,checkReminderAlerts}),reciclagem:Object.freeze({loadReciclagemData,renderReciclagem,exportReciclagemReport}),lancamentos:Object.freeze({renderLancamentos}),config:Object.freeze({switchConfigTab,renderConfigSummary,renderMyRoleDescription,renderRolePermissionsTable,updateTeamPaneVisibility}),infra:Object.freeze({AppBootstrapper,AppStateManager,AppCacheManager,AppEventManager,AppTimerManager,AppErrorHandler,AppLogger})});typeof window<"u"&&(window.AppFeatures=AppFeatureRegistry);
