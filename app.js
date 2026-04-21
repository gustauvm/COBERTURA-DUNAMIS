// Estado da Aplicação
let currentData = [];
let currentGroup = '';
let currentTab = 'busca'; // 'busca' ou 'unidades'
let hiddenUnits = new Set(); // Armazena postos ocultos na busca
let unitMetadata = {}; // Armazena rótulos das unidades
let collaboratorEdits = {}; // Armazena edições locais de colaboradores (Chave: RE)
let changeHistory = []; // Log de alterações
let detailPageState = null; // Estado da página de detalhes do colaborador
let detailPageInnerTab = 'info'; // Tab interna da página de detalhes
let minimizedUnits = new Set(); // Armazena unidades minimizadas
let lastUpdatedAt = null; // Timestamp da última carga de dados
let unitAddressDb = { entries: [], address_map: {}, address_map_norm: {} };
let unitGeoCache = {};
let collaboratorAddressMap = {};
let collaboratorAddressLoaded = false;
let collaboratorAddressUpdatedAt = null;
let substituteTargetRe = '';
let substituteProximityMode = 'posto'; // off | posto | endereco | rota
let substituteSearchSeq = 0;
let osrmRouteCache = new Map();
let osrmTableCache = new Map();
let routeMapInstance = null;
let routeMapLayer = null;
let routeMapMarkers = [];
let routeMapSeq = 0;
let routeModalState = null;
let addressModalState = { mode: 'unit', filter: '', collabRe: '', collabName: '', unitName: '' };
let ftPreviewModalState = { mode: 'collab', re: '', name: '', unit: '', groupKey: '', monthKey: '', selectedDate: '' };
let performanceModalState = { re: '', name: '' };
let autoEscalaTimer = null;
let autoEscalaBound = false;
let avisos = [];
let avisosSeenIds = new Set();
let allCollaboratorsCache = { items: null, updatedAt: 0 };
let supaUnitsCache = { items: null, updatedAt: 0 };
let profilesCache = { items: [], updatedAt: 0 };
let supabaseHealth = {
    status: 'idle',
    source: 'none',
    lastAttemptAt: null,
    lastSuccessAt: null,
    lastCount: 0,
    lastError: ''
};
const SUPABASE_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG?.supabase) ? CONFIG.supabase : { url: '', anonKey: '' };
let supabaseClient = (typeof window !== 'undefined' && window.supabase && SUPABASE_CONFIG?.url && SUPABASE_CONFIG?.anonKey)
    ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, { auth: { persistSession: true } })
    : null;
const dataLayer = (typeof window !== 'undefined' && window.DunamisDataLayer) ? window.DunamisDataLayer : null;
const SUPABASE_TABLES = Object.freeze({
    colaboradores: 'colaboradores',
    unidades: 'unidades',
    formalizacoes_postos: 'formalizacoes_postos',
    formalizacoes_status_events: 'formalizacoes_status_events',
    profiles: 'profiles',
    ft_launches: 'ft_launches',
    ft_audit_trail: 'ft_audit_trail',
    avisos: 'avisos',
    change_history: 'change_history',
    app_settings: 'app_settings'
});
const SUPABASE_CACHE_TTL_MS = 3 * 60 * 1000;
const RECICLAGEM_CACHE_TTL_MS = 30 * 60 * 1000;
const COLLAB_SNAPSHOT_KEY = 'collabSnapshotV4';
let exportUnitTarget = null;
let ftLaunches = [];
let ftAuditTrail = [];
let trocaLaunches = [];
let currentLancamentosMode = 'ft'; // ft | troca
let currentLancamentosTab = 'diaria';
let ftFilter = { from: '', to: '', status: 'all' };
let ftHistoryFilter = { search: '', unit: '', collab: '', sort: 'date_desc', grouped: true };
let ftHistoryExpanded = new Set();
let trocaHistoryFilter = { search: '', unit: '', status: 'all', sort: 'date_desc' };
let lancamentosPlanningState = {
    ft: { range: 'week', anchor: '', selected: '' },
    troca: { range: 'week', anchor: '', selected: '' }
};
let ftReasons = [];
let lastFtCreatedId = null;
let dailySnapshotInProgress = false;
let reminderCheckTimer = null;
let reminderAlertsHidden = false;
let searchFilterStatus = 'all'; // all | plantao | folga | ft | afastado
let searchHideAbsence = false;
let searchDateFilter = { from: '', to: '' };
let unitDateFilter = { from: '', to: '' };
// Context bar removido — seleção de card não abre mais barra inferior
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
let escalaInvertidaByGroup = {}; // { [groupKey]: boolean }
let escalaInvertidaAutoMonth = null;
let reciclagemSyncTimer = null;
let supervisaoMenu = null;
let supervisaoHistory = [];
let supervisaoFavorites = new Set();
let supervisaoUsage = {};
let preRegisteredEmails = []; // [{email, role, groups}]
let supervisaoFilter = 'internal';
let supervisaoSearchTerm = '';
let supervisaoChannelPrefs = {};
let supervisaoEditingId = null;
let supervisaoOpenMessages = new Set();
let gerenciaDataCache = [];
let gerenciaFilter = { group: 'all', from: '', to: '' };
let commandPaletteState = { open: false, activeIndex: 0, filtered: [] };
const SEARCH_DEBOUNCE_MS = 250;
const FT_AUDIT_MAX_ITEMS = 1200;
const SEARCH_PAGE_SIZE = 50;
let searchInputComposing = false;
let searchInputDebounceId = null;
let searchAdvancedOpen = false;
let searchRecentTerms = [];
let searchSortBy = 'relevance'; // relevance | nome | posto | escala | status
let searchSortAsc = true;
let searchGroupBy = 'none'; // none | posto | status | grupo | escala
let searchViewMode = 'cards'; // cards | table
let searchSelectedIds = new Set();
let searchSelectAll = false;
let searchFilterGroup = 'all';
let searchFilterCargo = 'all';
let searchFilterEscala = 'all';
let quickBetaState = {
    query: '',
    status: 'all',
    group: 'all',
    posto: 'all',
    cargo: 'all',
    escala: 'all',
    turno: 'all',
    turma: 'all',
    selectedKey: ''
};
let quickBetaRowsCache = [];
let quickBetaUnitIndex = new Map();
const FORMALIZADOR_REQUESTER_KEY = 'formalizadorRequesterV2';
const FORMALIZADOR_TYPES = Object.freeze({
    troca_posto: {
        label: 'Troca de posto',
        shortLabel: 'Troca',
        noun: 'troca de posto',
        needsDestination: true,
        hint: 'Transferência planejada de um colaborador entre postos.',
        accent: 'blue'
    },
    remanejamento: {
        label: 'Remanejamento',
        shortLabel: 'Remanejamento',
        noun: 'remanejamento',
        needsDestination: true,
        hint: 'Realocação operacional por contrato, cobertura ou necessidade do cliente.',
        accent: 'amber'
    },
    desligamento: {
        label: 'Solicitação de desligamento',
        shortLabel: 'Desligamento',
        noun: 'solicitação de desligamento',
        needsDestination: false,
        hint: 'Registro formal para análise administrativa de desligamento.',
        accent: 'red'
    },
    termino_experiencia: {
        label: 'Término de experiência',
        shortLabel: 'Experiência',
        noun: 'término de experiência',
        needsDestination: false,
        requiresEndDate: true,
        hint: 'Formalização de término ou decisão sobre período de experiência.',
        accent: 'slate'
    },
    alteracao_beneficios: {
        label: 'Alteração de benefícios',
        shortLabel: 'Benefícios',
        noun: 'alteração de benefícios',
        needsDestination: false,
        requiresBenefitImpact: true,
        hint: 'Solicitação para revisar VT, refeição, adicional ou escala/turno.',
        accent: 'green'
    },
    cobertura: {
        label: 'Cobertura',
        shortLabel: 'Cobertura',
        noun: 'cobertura de posto',
        needsDestination: true,
        hint: 'Registro de cobertura temporária ou definitiva de posto.',
        accent: 'cyan'
    }
});
const FORMALIZADOR_STATUS = Object.freeze({
    registrado: 'Registrado',
    em_analise: 'Em análise',
    aguardando_dp: 'Aguardando DP',
    aguardando_operacao: 'Aguardando operação',
    aprovado: 'Aprovado',
    executado: 'Executado',
    cancelado: 'Cancelado'
});
const FORMALIZADOR_MOTIVOS = Object.freeze({
    cobertura_contrato: 'Cobertura de contrato/posto',
    ferias: 'Férias programadas',
    falta: 'Falta ou ausência',
    pedido_cliente: 'Solicitação do cliente',
    desempenho: 'Desempenho / adequação ao posto',
    experiencia: 'Término ou avaliação de experiência',
    beneficios: 'Ajuste de benefícios',
    escala: 'Ajuste de escala ou turno',
    desligamento: 'Desligamento',
    outro: 'Outro motivo operacional'
});
const FORMALIZADOR_COVERAGE_TYPES = Object.freeze({
    sem_cobertura: 'Sem cobertura definida',
    cobertura_definida: 'Cobertura já definida',
    temporaria: 'Cobertura temporária',
    definitiva: 'Cobertura definitiva'
});
let formalizadorState = {
    type: '',
    requester: { nome: '', cargo: '', telefone: '', email: '' },
    collaboratorKey: '',
    destinationKey: '',
    coverageKey: '',
    queries: { collaborator: '', destination: '', coverage: '' },
    form: {
        prioridade: 'normal',
        data_efetiva: '',
        data_fim: '',
        motivo_categoria: '',
        motivo_observacao: '',
        email_recipients: ''
    },
    benefits: {
        vale_transporte: false,
        vale_refeicao: false,
        adicional_noturno: false,
        intrajornada: false,
        escala_turno: false,
        observacoes: ''
    },
    coverage: {
        tipo: '',
        periodo: '',
        observacoes: ''
    },
    history: [],
    events: {},
    historyFilters: { search: '', status: 'all', tipo: 'all' },
    selectedHistoryId: '',
    lastCreatedId: '',
    lastCreatedRecord: null,
    focus: 'request'
};
let formalizadorCache = { items: [], updatedAt: 0 };
let formalizadorEventsCache = { items: {}, updatedAt: 0 };
let searchRenderedCount = 0;
let searchTotalFiltered = 0;
let searchFilteredCache = [];
let searchCurrentTerms = [];
let searchLastRawResults = [];
let collaboratorFavorites = new Set();
let uiTooltipInitialized = false;
let activeTooltipEl = null;
let activeTooltipTarget = null;
let appLifecycleBound = false;
let utilityDrawerOpen = false;
let modalA11yBound = false;
let globalShortcutsBound = false;
const APP_TIMERS = Object.freeze({
    reciclagemSync: 'reciclagem-sync',
    reminderCheck: 'reminder-check',
    autoEscala: 'auto-escala',
    searchDebounce: 'search-debounce'
});
const APP_LOG_LEVELS = Object.freeze({
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
});
const APP_LOG_LEVEL = APP_LOG_LEVELS.info;
const AppTimerManager = {
    timers: new Map(),
    setInterval(name, callback, delay) {
        this.clear(name);
        const id = setInterval(callback, delay);
        this.timers.set(name, { kind: 'interval', id });
        return id;
    },
    setTimeout(name, callback, delay) {
        this.clear(name);
        const id = setTimeout(() => {
            this.timers.delete(name);
            callback();
        }, delay);
        this.timers.set(name, { kind: 'timeout', id });
        return id;
    },
    clear(name) {
        const timer = this.timers.get(name);
        if (!timer) return;
        if (timer.kind === 'interval') {
            clearInterval(timer.id);
        } else {
            clearTimeout(timer.id);
        }
        this.timers.delete(name);
    },
    clearAll() {
        Array.from(this.timers.keys()).forEach(name => this.clear(name));
    }
};
const AppEventManager = {
    listeners: [],
    _normalizeOptions(options) {
        if (options == null) return false;
        if (typeof options === 'boolean') return options;
        return options;
    },
    _sameOptions(a, b) {
        if (a === b) return true;
        if (!a || !b) return false;
        if (typeof a === 'boolean' || typeof b === 'boolean') return a === b;
        return !!a.capture === !!b.capture
            && !!a.once === !!b.once
            && !!a.passive === !!b.passive;
    },
    on(target, type, handler, options = false, meta = {}) {
        if (!target || typeof target.addEventListener !== 'function' || typeof handler !== 'function') return null;
        const normalizedOptions = this._normalizeOptions(options);
        const scope = meta.scope || 'global';
        const key = meta.key || '';
        if (key) {
            const existing = this.listeners.find(l => l.scope === scope && l.key === key);
            if (existing) return existing.handler;
        }
        target.addEventListener(type, handler, normalizedOptions);
        this.listeners.push({ target, type, handler, options: normalizedOptions, scope, key });
        return handler;
    },
    once(target, type, handler, options = false, meta = {}) {
        if (!target || typeof handler !== 'function') return null;
        const wrapped = (ev) => {
            this.off(target, type, wrapped, options);
            handler(ev);
        };
        return this.on(target, type, wrapped, options, meta);
    },
    off(target, type, handler, options = false) {
        const normalizedOptions = this._normalizeOptions(options);
        const idx = this.listeners.findIndex(l => l.target === target && l.type === type && l.handler === handler && this._sameOptions(l.options, normalizedOptions));
        if (idx < 0) return;
        const item = this.listeners[idx];
        item.target.removeEventListener(item.type, item.handler, item.options);
        this.listeners.splice(idx, 1);
    },
    offScope(scope) {
        const remaining = [];
        this.listeners.forEach(item => {
            if (item.scope === scope) {
                item.target.removeEventListener(item.type, item.handler, item.options);
            } else {
                remaining.push(item);
            }
        });
        this.listeners = remaining;
    },
    offAll() {
        this.listeners.forEach(item => {
            item.target.removeEventListener(item.type, item.handler, item.options);
        });
        this.listeners = [];
    }
};
const AppStateManager = {
    bindings: new Map(),
    subscribers: new Map(),
    register(key, getter, setter, options = {}) {
        if (!key || typeof getter !== 'function' || typeof setter !== 'function') return;
        this.bindings.set(key, {
            getter,
            setter,
            validator: typeof options.validator === 'function' ? options.validator : null
        });
    },
    has(key) {
        return this.bindings.has(key);
    },
    get(key, fallback = undefined) {
        const binding = this.bindings.get(key);
        if (!binding) return fallback;
        try {
            return binding.getter();
        } catch {
            return fallback;
        }
    },
    set(key, value, options = {}) {
        const binding = this.bindings.get(key);
        if (!binding) return false;
        if (binding.validator && !binding.validator(value)) return false;
        const previous = this.get(key);
        binding.setter(value);
        if (options.silent) return true;
        this._notify(key, this.get(key), previous);
        return true;
    },
    patch(partial = {}, options = {}) {
        if (!partial || typeof partial !== 'object') return;
        Object.keys(partial).forEach(key => {
            this.set(key, partial[key], options);
        });
    },
    snapshot(keys = null) {
        const selected = Array.isArray(keys) && keys.length ? keys : Array.from(this.bindings.keys());
        const snap = {};
        selected.forEach(key => {
            snap[key] = this.get(key);
        });
        return snap;
    },
    subscribe(key, callback) {
        if (!key || typeof callback !== 'function') return () => {};
        const list = this.subscribers.get(key) || [];
        list.push(callback);
        this.subscribers.set(key, list);
        return () => {
            const cur = this.subscribers.get(key) || [];
            this.subscribers.set(key, cur.filter(fn => fn !== callback));
        };
    },
    _notify(key, nextValue, prevValue) {
        const list = this.subscribers.get(key) || [];
        list.forEach(fn => {
            try {
                fn(nextValue, prevValue, key);
            } catch {}
        });
    }
};
const AppCacheManager = {
    stores: new Map(),
    defineStore(name, options = {}) {
        if (!name) return null;
        const current = this.stores.get(name);
        const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : 0;
        if (current) {
            current.ttlMs = ttlMs;
            return current;
        }
        const store = { name, ttlMs, items: new Map() };
        this.stores.set(name, store);
        return store;
    },
    ensureStore(name) {
        return this.stores.get(name) || this.defineStore(name, {});
    },
    set(name, key, value, options = {}) {
        const store = this.ensureStore(name);
        if (!store) return value;
        const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : store.ttlMs;
        const expiresAt = ttlMs > 0 ? Date.now() + ttlMs : 0;
        store.items.set(String(key), { value, expiresAt });
        return value;
    },
    get(name, key, fallback = undefined) {
        const store = this.stores.get(name);
        if (!store) return fallback;
        const entry = store.items.get(String(key));
        if (!entry) return fallback;
        if (entry.expiresAt > 0 && entry.expiresAt < Date.now()) {
            store.items.delete(String(key));
            return fallback;
        }
        return entry.value;
    },
    has(name, key) {
        return this.get(name, key, undefined) !== undefined;
    },
    delete(name, key) {
        const store = this.stores.get(name);
        if (!store) return;
        store.items.delete(String(key));
    },
    clear(name) {
        const store = this.stores.get(name);
        if (!store) return;
        store.items.clear();
    },
    clearAll() {
        this.stores.forEach(store => store.items.clear());
    },
    entries(name) {
        const store = this.stores.get(name);
        if (!store) return [];
        const now = Date.now();
        const rows = [];
        store.items.forEach((entry, key) => {
            if (entry.expiresAt > 0 && entry.expiresAt < now) return;
            rows.push([key, entry.value]);
        });
        return rows;
    }
};
let appStateBindingsReady = false;
let appCacheHydrated = false;

function registerAppStateBindings() {
    if (appStateBindingsReady) return;
    appStateBindingsReady = true;
    const bind = (key, getter, setter, validator = null) => {
        AppStateManager.register(key, getter, setter, validator ? { validator } : {});
    };
    bind('currentData', () => currentData, (v) => { currentData = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('currentGroup', () => currentGroup, (v) => { currentGroup = String(v || ''); });
    bind('currentTab', () => currentTab, (v) => { currentTab = String(v || 'busca'); });
    bind('hiddenUnits', () => hiddenUnits, (v) => { hiddenUnits = v instanceof Set ? v : new Set(v || []); });
    bind('unitMetadata', () => unitMetadata, (v) => { unitMetadata = v && typeof v === 'object' ? v : {}; });
    bind('collaboratorEdits', () => collaboratorEdits, (v) => { collaboratorEdits = v && typeof v === 'object' ? v : {}; });
    bind('changeHistory', () => changeHistory, (v) => { changeHistory = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('minimizedUnits', () => minimizedUnits, (v) => { minimizedUnits = v instanceof Set ? v : new Set(v || []); });
    bind('lastUpdatedAt', () => lastUpdatedAt, (v) => { lastUpdatedAt = v || null; });
    bind('unitGeoCache', () => unitGeoCache, (v) => { unitGeoCache = v && typeof v === 'object' ? v : {}; });
    bind('allCollaboratorsCache', () => allCollaboratorsCache, (v) => { allCollaboratorsCache = v && typeof v === 'object' ? v : { items: null, updatedAt: 0 }; });
    bind('avisos', () => avisos, (v) => { avisos = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('ftLaunches', () => ftLaunches, (v) => { ftLaunches = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('ftAuditTrail', () => ftAuditTrail, (v) => { ftAuditTrail = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('trocaLaunches', () => trocaLaunches, (v) => { trocaLaunches = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('searchFilterStatus', () => searchFilterStatus, (v) => { searchFilterStatus = String(v || 'all'); });
    bind('searchHideAbsence', () => searchHideAbsence, (v) => { searchHideAbsence = !!v; });
    bind('searchDateFilter', () => searchDateFilter, (v) => { searchDateFilter = v && typeof v === 'object' ? v : { from: '', to: '' }; });
    bind('unitDateFilter', () => unitDateFilter, (v) => { unitDateFilter = v && typeof v === 'object' ? v : { from: '', to: '' }; });
    bind('reciclagemData', () => reciclagemData, (v) => { reciclagemData = v && typeof v === 'object' ? v : {}; });
    bind('reciclagemLoadedAt', () => reciclagemLoadedAt, (v) => { reciclagemLoadedAt = v || null; });
    bind('reciclagemRenderCache', () => reciclagemRenderCache, (v) => { reciclagemRenderCache = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('commandPaletteState', () => commandPaletteState, (v) => { commandPaletteState = v && typeof v === 'object' ? v : { open: false, activeIndex: 0, filtered: [] }; });
}

function ensureCoreCacheStores() {
    AppCacheManager.defineStore('all-collaborators', { ttlMs: 5 * 60 * 1000 });
    AppCacheManager.defineStore('unit-geo', { ttlMs: 0 });
    AppCacheManager.defineStore('osrm-route', { ttlMs: 0 });
    AppCacheManager.defineStore('osrm-table', { ttlMs: 0 });
    AppCacheManager.defineStore('reciclagem-render', { ttlMs: 0 });
}

function hydrateManagedCachesFromLegacy() {
    ensureCoreCacheStores();
    const now = Date.now();
    if (allCollaboratorsCache?.items && Array.isArray(allCollaboratorsCache.items)) {
        const age = Math.max(0, now - Number(allCollaboratorsCache.updatedAt || 0));
        const ttlLeft = Math.max(1, (5 * 60 * 1000) - age);
        AppCacheManager.set('all-collaborators', 'items', allCollaboratorsCache.items, { ttlMs: ttlLeft });
    }
    if (unitGeoCache && typeof unitGeoCache === 'object') {
        Object.entries(unitGeoCache).forEach(([key, value]) => {
            if (!key || !value) return;
            AppCacheManager.set('unit-geo', key, value);
        });
    }
    if (osrmRouteCache instanceof Map) {
        osrmRouteCache.forEach((value, key) => {
            if (!key || !value) return;
            AppCacheManager.set('osrm-route', key, value);
        });
    }
    if (osrmTableCache instanceof Map) {
        osrmTableCache.forEach((value, key) => {
            if (!key || !value) return;
            AppCacheManager.set('osrm-table', key, value);
        });
    }
    if (Array.isArray(reciclagemRenderCache)) {
        AppCacheManager.set('reciclagem-render', 'items', reciclagemRenderCache);
    }
}

function initializeCoreManagers() {
    registerAppStateBindings();
    ensureCoreCacheStores();
    if (!appCacheHydrated) {
        hydrateManagedCachesFromLegacy();
        appCacheHydrated = true;
    }
}

function getAppState(key, fallback = undefined) {
    initializeCoreManagers();
    return AppStateManager.get(key, fallback);
}

function setAppState(key, value, options = {}) {
    initializeCoreManagers();
    return AppStateManager.set(key, value, options);
}

const APP_NAV_PARAMS = Object.freeze({
    view: 'appView',
    group: 'appGroup',
    tab: 'appTab'
});
const APP_NAV_STORAGE_KEY = 'dunamisNavStateV1';
const DASHBOARD_TABS = new Set(['busca', 'busca-beta', 'formalizador', 'unidades', 'avisos', 'reciclagem', 'lancamentos', 'config', 'collab-detail']);
const DISABLED_DASHBOARD_TABS = new Set(['avisos', 'reciclagem', 'lancamentos']);
let appNavBound = false;
let appNavApplying = false;

function isDashboardFeatureEnabled(featureName) {
    return !DISABLED_DASHBOARD_TABS.has(String(featureName || '').trim());
}

function normalizeDashboardTab(tabName) {
    const tab = String(tabName || '').trim();
    if (!DASHBOARD_TABS.has(tab)) return 'busca';
    if (!isDashboardFeatureEnabled(tab)) return 'busca';
    return tab;
}

function normalizeAppNavState(raw = {}) {
    const next = raw && typeof raw === 'object' ? raw : {};
    const viewRaw = String(next.view || next.screen || '').trim().toLowerCase();
    const view = (viewRaw === 'supervisao' || viewRaw === 'gerencia' || viewRaw === 'dashboard') ? viewRaw : 'gateway';
    const group = String(next.group || '').trim().toLowerCase();
    const tab = normalizeDashboardTab(next.tab);
    return { view, group, tab };
}

function getCurrentAppNavState() {
    if (currentTab === 'supervisao') return { view: 'supervisao', group: '', tab: 'busca' };
    if (currentTab === 'gerencia') return { view: 'gerencia', group: '', tab: 'busca' };
    if (appContainer.style.display === 'none') return { view: 'gateway', group: '', tab: 'busca' };
    return {
        view: 'dashboard',
        group: String(currentGroup || 'todos').toLowerCase(),
        tab: normalizeDashboardTab(currentTab || 'busca')
    };
}

function readAppNavFromUrl() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has(APP_NAV_PARAMS.view) && !params.has(APP_NAV_PARAMS.group) && !params.has(APP_NAV_PARAMS.tab)) {
        return null;
    }
    return normalizeAppNavState({
        view: params.get(APP_NAV_PARAMS.view) || '',
        group: params.get(APP_NAV_PARAMS.group) || '',
        tab: params.get(APP_NAV_PARAMS.tab) || ''
    });
}

function readAppNavFromStorage() {
    try {
        const raw = localStorage.getItem(APP_NAV_STORAGE_KEY);
        if (!raw) return null;
        return normalizeAppNavState(JSON.parse(raw));
    } catch {
        return null;
    }
}

function writeAppNavToStorage(state) {
    try {
        localStorage.setItem(APP_NAV_STORAGE_KEY, JSON.stringify(state));
    } catch {}
}

function writeAppNavToUrl(state, historyMode = 'replace') {
    const params = new URLSearchParams(window.location.search);
    params.delete(APP_NAV_PARAMS.view);
    params.delete(APP_NAV_PARAMS.group);
    params.delete(APP_NAV_PARAMS.tab);

    if (state.view !== 'gateway') params.set(APP_NAV_PARAMS.view, state.view);
    if (state.view === 'dashboard') {
        if (state.group && state.group !== 'todos') params.set(APP_NAV_PARAMS.group, state.group);
        if (state.tab && state.tab !== 'busca') params.set(APP_NAV_PARAMS.tab, state.tab);
    }

    const qs = params.toString();
    const newUrl = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    const method = historyMode === 'push' ? 'pushState' : 'replaceState';
    history[method]({ appNav: state }, '', newUrl);
}

function syncAppNavigation(overrides = {}, options = {}) {
    const state = normalizeAppNavState({ ...getCurrentAppNavState(), ...overrides });
    if (!options.skipStorage) writeAppNavToStorage(state);
    if (!options.skipUrl) writeAppNavToUrl(state, options.history || 'replace');
}

async function applyAppNavigationState(rawState, options = {}) {
    if (appNavApplying) return;
    appNavApplying = true;
    try {
        const state = normalizeAppNavState(rawState);
        const historyMode = options.history || 'replace';
        if (state.view === 'gateway') {
            resetToGateway({ skipRouteSync: true });
            syncAppNavigation(state, { history: historyMode });
            return;
        }
        if (state.view === 'supervisao') {
            openSupervisaoPage({ skipRouteSync: true });
            syncAppNavigation(state, { history: historyMode });
            return;
        }
        if (state.view === 'gerencia') {
            await openGerenciaPage({ skipRouteSync: true });
            syncAppNavigation(state, { history: historyMode });
            return;
        }
        const desiredGroup = state.group || currentGroup || 'todos';
        await loadGroup(desiredGroup, {
            restoreTab: state.tab || 'busca',
            skipRouteSync: true,
            history: historyMode
        });
        syncAppNavigation({ view: 'dashboard', group: desiredGroup, tab: state.tab || 'busca' }, { history: historyMode });
    } finally {
        appNavApplying = false;
    }
}

function bindAppNavigation() {
    if (appNavBound) return;
    appNavBound = true;
    window.addEventListener('popstate', () => {
        const byUrl = readAppNavFromUrl();
        if (byUrl) {
            applyAppNavigationState(byUrl, { history: 'replace' });
            return;
        }
        const byStorage = readAppNavFromStorage();
        if (byStorage) {
            applyAppNavigationState(byStorage, { history: 'replace' });
        }
    });
}

function restoreAppNavigationOnBoot() {
    const fromUrl = readAppNavFromUrl();
    const fromStorage = readAppNavFromStorage();
    const state = fromUrl || fromStorage;
    if (!state) {
        syncAppNavigation({ view: 'gateway', group: '', tab: 'busca' }, { history: 'replace' });
        return;
    }
    applyAppNavigationState(state, { history: 'replace' });
}

function getCachedAllCollaborators() {
    initializeCoreManagers();
    const cached = AppCacheManager.get('all-collaborators', 'items', null);
    if (!Array.isArray(cached)) return null;
    return cached;
}

function setCachedAllCollaborators(items, ttlMs = 5 * 60 * 1000) {
    initializeCoreManagers();
    if (!Array.isArray(items)) return;
    AppCacheManager.set('all-collaborators', 'items', items, { ttlMs });
    allCollaboratorsCache = { items, updatedAt: Date.now() };
}

function getCachedUnitGeo(address) {
    initializeCoreManagers();
    const key = String(address || '');
    if (!key) return null;
    const managed = AppCacheManager.get('unit-geo', key, null);
    if (managed) return managed;
    const legacy = unitGeoCache[key];
    if (legacy) {
        AppCacheManager.set('unit-geo', key, legacy);
        return legacy;
    }
    return null;
}

function setCachedUnitGeo(address, coords) {
    initializeCoreManagers();
    const key = String(address || '');
    if (!key || !coords) return;
    AppCacheManager.set('unit-geo', key, coords);
    unitGeoCache[key] = coords;
}

function getCachedOsrmTable(key) {
    initializeCoreManagers();
    const managed = AppCacheManager.get('osrm-table', key, null);
    if (managed) return managed;
    if (osrmTableCache.has(key)) {
        const legacy = osrmTableCache.get(key);
        AppCacheManager.set('osrm-table', key, legacy);
        return legacy;
    }
    return null;
}

function setCachedOsrmTable(key, value) {
    initializeCoreManagers();
    if (!key || !value) return;
    AppCacheManager.set('osrm-table', key, value);
    osrmTableCache.set(key, value);
}

function getCachedOsrmRoute(key) {
    initializeCoreManagers();
    const managed = AppCacheManager.get('osrm-route', key, null);
    if (managed) return managed;
    if (osrmRouteCache.has(key)) {
        const legacy = osrmRouteCache.get(key);
        AppCacheManager.set('osrm-route', key, legacy);
        return legacy;
    }
    return null;
}

function setCachedOsrmRoute(key, value) {
    initializeCoreManagers();
    if (!key || !value) return;
    AppCacheManager.set('osrm-route', key, value);
    osrmRouteCache.set(key, value);
}

function clearAllAppTimers(options = {}) {
    AppTimerManager.clearAll();
    reciclagemSyncTimer = null;
    reminderCheckTimer = null;
    autoEscalaTimer = null;
    searchInputDebounceId = null;
    if (options.clearEvents) {
        AppEventManager.offAll();
    }
}

function bindAppLifecycle() {
    if (appLifecycleBound) return;
    appLifecycleBound = true;
    initializeCoreManagers();
    AppEventManager.on(window, 'beforeunload', () => clearAllAppTimers({ clearEvents: true }), false, { scope: 'lifecycle', key: 'beforeunload-clear-all' });
    AppEventManager.on(window, 'error', (event) => {
        const err = event?.error || new Error(event?.message || 'Unhandled error event');
        AppErrorHandler.capture(err, { scope: 'window-error', file: event?.filename || '', line: event?.lineno || 0, col: event?.colno || 0 }, { silent: true });
    }, false, { scope: 'lifecycle', key: 'window-error-capture' });
    AppEventManager.on(window, 'unhandledrejection', (event) => {
        const reason = event?.reason instanceof Error ? event.reason : new Error(String(event?.reason || 'Unhandled promise rejection'));
        AppErrorHandler.capture(reason, { scope: 'window-unhandledrejection' }, { silent: true });
    }, false, { scope: 'lifecycle', key: 'window-unhandledrejection-capture' });
}

function scheduleSearchExecution() {
    AppTimerManager.clear(APP_TIMERS.searchDebounce);
    const inputValue = document.getElementById('search-input')?.value || '';
    const hasSearchIntent = !!String(inputValue).trim() || searchFilterStatus !== 'all' || hasDateRangeFilter(searchDateFilter);
    if (hasSearchIntent && !isSubstituteSearchEnabled()) {
        renderSearchLoadingSkeleton();
    }
    searchInputDebounceId = AppTimerManager.setTimeout(APP_TIMERS.searchDebounce, () => {
        searchInputDebounceId = null;
        if (searchInputComposing) return;
        realizarBusca();
    }, SEARCH_DEBOUNCE_MS);
}

function flushSearchExecution() {
    AppTimerManager.clear(APP_TIMERS.searchDebounce);
    searchInputDebounceId = null;
    realizarBusca();
}

function clearTabScopedTimers(nextTab = '') {
    const target = String(nextTab || '');
    if (target !== 'busca') {
        AppTimerManager.clear(APP_TIMERS.searchDebounce);
        searchInputDebounceId = null;
        searchInputComposing = false;
    }
}

const AppLogger = {
    log(level, message, payload) {
        const numeric = APP_LOG_LEVELS[level] ?? APP_LOG_LEVELS.info;
        if (numeric > APP_LOG_LEVEL) return;
        const stamp = new Date().toISOString();
        const text = `[${stamp}] [${String(level || 'info').toUpperCase()}] ${message}`;
        if (payload !== undefined) {
            if (level === 'error') console.error(text, payload);
            else if (level === 'warn') console.warn(text, payload);
            else console.log(text, payload);
            return;
        }
        if (level === 'error') console.error(text);
        else if (level === 'warn') console.warn(text);
        else console.log(text);
    },
    error(message, payload) { this.log('error', message, payload); },
    warn(message, payload) { this.log('warn', message, payload); },
    info(message, payload) { this.log('info', message, payload); },
    debug(message, payload) { this.log('debug', message, payload); }
};

const AppErrorHandler = {
    capture(error, context = {}, options = {}) {
        const scope = context?.scope || 'app';
        const errObj = error instanceof Error ? error : new Error(String(error || 'Erro desconhecido'));
        const details = {
            scope,
            message: errObj.message,
            stack: errObj.stack || '',
            context
        };
        if (!options.silent) {
            AppLogger.error(`${scope}: ${errObj.message}`, details);
        } else {
            AppLogger.debug(`${scope}: ${errObj.message}`, details);
        }
        if (options.toastMessage && typeof showToast === 'function') {
            showToast(options.toastMessage, 'error');
        }
        return details;
    }
};
if (typeof window !== 'undefined') {
    window.AppLogger = AppLogger;
    window.AppErrorHandler = AppErrorHandler;
    window.AppTimerManager = AppTimerManager;
    window.AppEventManager = AppEventManager;
    window.AppState = AppStateManager;
    window.AppCache = AppCacheManager;
}

function validateReciclagemEntry(item) {
    if (!item || typeof item !== 'object') return false;
    const re = normalizeReValueLoose(item.re || '');
    const name = String(item.name || '').trim();
    const unit = String(item.unit || '').trim();
    if (!re && !name && !unit) return false;
    if (item.expiry && !(item.expiry instanceof Date)) return false;
    if (item.expiry instanceof Date && Number.isNaN(item.expiry.getTime())) return false;
    return true;
}

// ==========================================================================
// 🔐 GERENCIAMENTO & AUTENTICAÇÃO (SITE-ONLY)
// ==========================================================================

const SiteAuth = {
    logged: false,
    mode: 'view', // 'view' | 'edit'
    user: null,
    re: null,
    role: 'operacional', // operacional | supervisor | coordenador | gerencia | administrador
    email: null,
    id: null,
    groups: [],
    profile: null,
    admins: []
};

const ROLE_LABELS = {
    visitante: 'Visitante',
    operacional: 'Operacional',
    supervisor: 'Supervisor',
    coordenador: 'Coordenador',
    gerencia: 'Gerência',
    administrador: 'Administrador'
};

const ROLE_PERMS = {
    visitante: { canEdit: false, canManageUsers: false, canViewAllGroups: false },
    operacional: { canEdit: false, canManageUsers: false, canViewAllGroups: false },
    supervisor: { canEdit: true, canManageUsers: false, canViewAllGroups: false },
    coordenador: { canEdit: true, canManageUsers: false, canViewAllGroups: true },
    gerencia: { canEdit: true, canManageUsers: false, canViewAllGroups: true },
    administrador: { canEdit: true, canManageUsers: true, canViewAllGroups: true }
};

function getRolePerms(role) {
    return ROLE_PERMS[role] || ROLE_PERMS.operacional;
}

function canEditBase() {
    return SiteAuth.logged && getRolePerms(SiteAuth.role).canEdit;
}

function canManageUsers() {
    return SiteAuth.logged && getRolePerms(SiteAuth.role).canManageUsers;
}

function canViewAllGroups() {
    return SiteAuth.logged && getRolePerms(SiteAuth.role).canViewAllGroups;
}

function isSupabaseReady() {
    if (!supabaseClient && typeof window !== 'undefined' && window.supabase && SUPABASE_CONFIG?.url && SUPABASE_CONFIG?.anonKey) {
        try {
            supabaseClient = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, { auth: { persistSession: true } });
        } catch (e) { /* ignore */ }
    }
    return !!supabaseClient;
}

function isBootstrapAdmin(email) {
    const list = CONFIG?.auth?.bootstrapAdmins || [];
    const key = String(email || '').trim().toLowerCase();
    return !!key && list.some(e => String(e || '').trim().toLowerCase() === key);
}

function getAuthRedirectUrl() {
    const configured = String(CONFIG?.auth?.publicUrl || '').trim();
    if (configured) {
        const withSlash = configured.endsWith('/') ? configured : `${configured}/`;
        return withSlash;
    }
    return window.location.origin + window.location.pathname;
}

function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
}

function canonicalizeEmail(value) {
    const email = normalizeEmail(value);
    const at = email.indexOf('@');
    if (at < 1) return email;
    let local = email.slice(0, at);
    let domain = email.slice(at + 1);
    if (domain === 'googlemail.com') domain = 'gmail.com';
    if (domain === 'gmail.com') {
        local = local.split('+')[0].replace(/\./g, '');
    }
    return `${local}@${domain}`;
}

function isSameUserEmail(a, b) {
    return canonicalizeEmail(a) === canonicalizeEmail(b);
}

function normalizeProfileGroups(value) {
    if (Array.isArray(value)) {
        return value.map(v => String(v || '').trim().toLowerCase()).filter(Boolean);
    }
    if (value == null) return [];
    if (typeof value === 'string') {
        return value.split(',').map(v => v.trim().toLowerCase()).filter(Boolean);
    }
    return [];
}

function resetAuthState() {
    SiteAuth.logged = false;
    SiteAuth.user = null;
    SiteAuth.re = null;
    SiteAuth.role = 'visitante';
    SiteAuth.email = null;
    SiteAuth.id = null;
    SiteAuth.groups = [];
    SiteAuth.profile = null;
    SiteAuth.admins = [];
    SiteAuth.mode = 'view';
    document.body.classList.remove('mode-edit');
    updateAuthUiState();
    _cleanupRealtimeSubscriptions();
}

function updateAuthUiState() {
    const loginGate = document.getElementById('config-login');
    const content = document.getElementById('config-content');
    if (isPublicAccessMode()) {
        loginGate?.remove();
        content?.classList.remove('hidden');
        return;
    }
    if (!loginGate || !content) return;
    if (SiteAuth.logged) {
        loginGate.classList.add('hidden');
        content.classList.remove('hidden');
    } else {
        loginGate.classList.remove('hidden');
        content.classList.add('hidden');
    }
}

function isPublicAccessMode() {
    return CONFIG?.auth?.requireLogin === false;
}

function enablePublicAccessMode() {
    // Modo público: acesso direto, sem exibir estado de autenticação.
    SiteAuth.logged = true;
    SiteAuth.mode = 'edit';
    SiteAuth.user = 'Sistema';
    SiteAuth.re = null;
    SiteAuth.role = 'administrador';
    SiteAuth.email = null;
    SiteAuth.id = 'public';
    SiteAuth.groups = (CONFIG?.groupRules || []).map(g => g.key);
    SiteAuth.profile = null;
    document.body.classList.add('mode-edit');
    updateAuthUiState();
    updateMenuStatus();
    _setupRealtimeSubscriptions();
}

async function loadOrCreateProfile(user) {
    if (!isSupabaseReady() || !user?.id) return null;
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.profiles)
            .select('*')
            .eq('id', user.id)
            .maybeSingle();
        if (error && error.code !== 'PGRST116') {
            if (error.code === '42P01') {
                showToast("Tabela profiles não existe no Supabase.", "warning");
            }
            return null;
        }
        if (data) return data;
        const preReg = (preRegisteredEmails || []).find(p => isSameUserEmail(p?.email || '', user.email || ''));
        const baseRole = isBootstrapAdmin(user.email) ? 'administrador' : (preReg?.role || 'visitante');
        const baseGroups = preReg?.groups || [];
        const payload = {
            id: user.id,
            email: user.email || '',
            role: baseRole,
            groups: baseGroups
        };
        const insert = await supabaseClient
            .from(SUPABASE_TABLES.profiles)
            .insert(payload)
            .select('*')
            .maybeSingle();
        if (insert.error) {
            return payload;
        }
        return insert.data || payload;
    } catch {
        return null;
    }
}

async function fetchCollaboratorByEmail(email) {
    if (!isSupabaseReady() || !email) return null;
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .select('*')
            .ilike('email_login', String(email).trim())
            .maybeSingle();
        if (error) return null;
        return data ? mapSupabaseCollaboratorRow(data) : null;
    } catch {
        return null;
    }
}

async function fetchProfiles(force = false) {
    if (!isSupabaseReady()) return [];
    if (!canManageUsers()) return [];
    const now = Date.now();
    if (!force && profilesCache.items.length && (now - profilesCache.updatedAt) < SUPABASE_CACHE_TTL_MS) {
        return profilesCache.items;
    }
    try {
        // Paginate to avoid Supabase 1000-row default limit
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;
        let fetchError = null;
        while (true) {
            const { data: chunk, error: chunkErr } = await supabaseClient
                .from(SUPABASE_TABLES.profiles)
                .select('*')
                .range(from, from + PAGE_SIZE - 1);
            if (chunkErr) { fetchError = chunkErr; break; }
            allRows = allRows.concat(chunk || []);
            if (!chunk || chunk.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
        if (fetchError) {
            AppErrorHandler.capture(fetchError, { scope: 'fetch-profiles' }, { silent: true });
            return profilesCache.items || [];
        }
        profilesCache = { items: allRows, updatedAt: now };
        return profilesCache.items;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'fetch-profiles' }, { silent: true });
        return profilesCache.items || [];
    }
}

async function refreshAssignableUsers(force = false) {
    if (!SiteAuth.logged) {
        SiteAuth.admins = [];
        return;
    }
    if (canManageUsers()) {
        const profiles = await fetchProfiles(force);
        SiteAuth.admins = (profiles || []).map(p => ({
            id: p.id,
            name: p.display_name || p.email || 'Usuário',
            re: p.re_padrao || p.matricula || '',
            role: p.role || 'operacional',
            email: p.email || '',
            groups: normalizeProfileGroups(p.groups)
        }));
        return;
    }
    SiteAuth.admins = [{
        id: SiteAuth.id,
        name: SiteAuth.user || SiteAuth.email || 'Usuário',
        re: SiteAuth.re || '',
        role: SiteAuth.role || 'operacional',
        email: SiteAuth.email || ''
    }];
}

async function applyAuthSession(session, options = {}) {
    if (!session?.user) {
        resetAuthState();
        updateMenuStatus();
        return;
    }
    const user = session.user;
    SiteAuth.logged = true;
    SiteAuth.id = user.id;
    SiteAuth.email = user.email || '';

    const profile = await loadOrCreateProfile(user);
    SiteAuth.profile = profile;
    const derivedRole = profile?.role || (isBootstrapAdmin(user.email) ? 'administrador' : 'visitante');
    SiteAuth.role = derivedRole;
    SiteAuth.groups = normalizeProfileGroups(profile?.groups);

    const collab = await fetchCollaboratorByEmail(user.email || '');
    if (collab) {
        SiteAuth.user = collab.nome || collab.colaborador || user.email;
        SiteAuth.re = collab.re || collab.re_padrao || collab.matricula || '';
        if (!SiteAuth.groups.length && collab.grupo && collab.grupo !== 'todos') {
            SiteAuth.groups = [collab.grupo];
        }
        if (profile?.id) {
            const updatePayload = {};
            if (!profile.display_name && collab.nome) updatePayload.display_name = collab.nome;
            if (!profile.matricula && collab.matricula) updatePayload.matricula = collab.matricula;
            if (!profile.re_padrao && collab.re_padrao) updatePayload.re_padrao = collab.re_padrao;
            if (Object.keys(updatePayload).length) {
                supabaseClient
                    .from(SUPABASE_TABLES.profiles)
                    .update(updatePayload)
                    .eq('id', profile.id)
                    .then(() => {})
                    .catch(err => AppErrorHandler.capture(err, { scope: 'profile-update' }, { silent: true }));
            }
        }
    } else {
        SiteAuth.user = profile?.display_name || user.email || 'Usuário';
        SiteAuth.re = profile?.re_padrao || profile?.matricula || '';
    }

    SiteAuth.mode = canEditBase() ? 'edit' : 'view';
    document.body.classList.toggle('mode-edit', SiteAuth.mode === 'edit');
    updateAuthUiState();
    await refreshAssignableUsers(true);
    updateMenuStatus();

    // Setup realtime subscriptions
    _setupRealtimeSubscriptions();

    // Após o login bem sucedido em um cenário que exige autenticação,
    // liberamos o gateway e a navegação interna.
    if (CONFIG?.auth?.requireLogin) {
        showGatewayScreen();
    }
}

async function handlePasswordRecovery() {
    const newPass = prompt('Digite a nova senha:');
    if (!newPass || newPass.length < 6) {
        showToast('Senha inválida. Use pelo menos 6 caracteres.', 'error');
        return;
    }
    const { error } = await supabaseClient.auth.updateUser({ password: newPass });
    if (error) {
        showToast('Falha ao atualizar senha.', 'error');
        return;
    }
    showToast('Senha atualizada com sucesso.', 'success');
}

function getRecoveryHashParams() {
    try {
        const raw = String(window.location.hash || '').replace(/^#/, '');
        if (!raw) return null;
        const params = new URLSearchParams(raw);
        const type = String(params.get('type') || '').toLowerCase();
        const token = String(params.get('access_token') || '');
        if (type !== 'recovery' || !token) return null;
        return params;
    } catch {
        return null;
    }
}

function clearRecoveryHashFromUrl() {
    try {
        if (!window.location.hash) return;
        history.replaceState(window.history.state || null, '', window.location.pathname + window.location.search);
    } catch {}
}

async function initSupabaseAuth() {
    if (!isSupabaseReady()) return;
    let recoveryHandled = false;
    const recoveryParams = getRecoveryHashParams();

    const maybeRunRecovery = async (session, eventName = '') => {
        if (recoveryHandled) return;
        if (!recoveryParams) return;
        if (!session?.user) return;
        recoveryHandled = true;
        await handlePasswordRecovery();
        clearRecoveryHashFromUrl();
        showToast('Senha redefinida.', 'success');
    };

    // Session-only: if user didn't check "keep logged" and tab was closed, sign out
    if (localStorage.getItem('sessionOnly') === '1' && !sessionStorage.getItem('sessionActive')) {
        await supabaseClient.auth.signOut();
        localStorage.removeItem('sessionOnly');
        return;
    }
    try {
        const { data } = await supabaseClient.auth.getSession();
        if (data?.session) {
            await applyAuthSession(data.session, { silent: true });
            clearSearchStateAfterAuth();
            await maybeRunRecovery(data.session, 'SESSION_BOOT');
        }
    } catch {}
    supabaseClient.auth.onAuthStateChange(async (event, session) => {
        try {
            if (event === 'PASSWORD_RECOVERY') {
                await handlePasswordRecovery();
                recoveryHandled = true;
                clearRecoveryHashFromUrl();
                return;
            }
            if (event === 'SIGNED_OUT' || !session) {
                resetAuthState();
                updateMenuStatus();
                return;
            }
            await applyAuthSession(session, { event });
            await maybeRunRecovery(session, event);
        } catch (err) {
            AppErrorHandler.capture(err, { scope: 'auth-state-change' }, { silent: true });
        }
    });
}

const ROADMAP_ITEMS = [
    { title: 'Supabase como fonte única', status: 'concluido', area: 'Base de dados', detail: 'Leitura e gravação centralizada de colaboradores e unidades.' },
    { title: 'Auth + perfis + permissões', status: 'andamento', area: 'Segurança', detail: 'Login com e-mail/senha, roles e grupos por usuário.' },
    { title: 'Conferência de documentos', status: 'planejado', area: 'Operação', detail: 'Checklist de dados/documentos para cada colaborador.' },
    { title: 'Conferência de postos', status: 'planejado', area: 'Supervisão', detail: 'Validação de efetivo por posto com justificativas.' },
    { title: 'Solicitação de remanejamento', status: 'planejado', area: 'Processos', detail: 'Fluxo de pedidos e aprovações com impacto em FT/VT.' },
    { title: 'Controle de veículos', status: 'planejado', area: 'Frota', detail: 'Registro de uso, rota e horários por supervisor/coordenador.' }
];

const CONTEXT_HELP_CONTENT = {
    gateway: {
        title: 'Página Inicial',
        lines: [
            'Selecione um grupo para abrir a operação.',
            'Use Supervisão para links e mensagens rápidas.',
            'Gerência está em placeholder até próxima evolução.'
        ]
    },
    busca: {
        title: 'Busca Rápida',
        lines: [
            'Pesquise por nome, RE ou unidade.',
            'Use filtros por status e período de FT.',
            'Botão de mapa vermelho indica endereço não cadastrado.'
        ]
    },
    'busca-beta': {
        title: 'Busca Rápida Beta',
        lines: [
            'Consulta profissional read-only com vínculo entre colaboradores e unidades.',
            'Plantão e folga seguem somente a coluna TURMA da planilha.',
            'Abra o painel lateral para ver todos os dados disponíveis.'
        ]
    },
    formalizador: {
        title: 'Formalizador',
        lines: [
            'Formalize remanejamentos, desligamentos, experiência, benefícios e coberturas.',
            'Gera protocolo, histórico, texto de e-mail e WhatsApp sem alterar a base operacional.',
            'Use no celular para registrar a solicitação no momento da decisão.'
        ]
    },
    unidades: {
        title: 'Unidades',
        lines: [
            'Visualize plantão e folga por unidade.',
            'Use o mapa para endereço, copiar e abrir rota.',
            'Resumo semanal FT aparece no topo de cada unidade.'
        ]
    },
    avisos: {
        title: 'Avisos',
        lines: [
            'Acompanhe pendências e responsáveis.',
            'Use lembretes para follow-up automático.',
            'Filtre por unidade para ação rápida.'
        ]
    },
    reciclagem: {
        title: 'Reciclagem',
        lines: [
            'Filtre por tipo, status e colaborador.',
            'Cards focam na execução sem resumo KPI.',
            'Use exportação para relatórios externos.'
        ]
    },
    lancamentos: {
        title: 'Lançamentos',
        lines: [
            'Aba Diária prioriza execução do dia.',
            'Dashboard mantém visão gerencial de FT/Troca.',
            'Histórico concentra auditoria e correções.'
        ]
    },
    config: {
        title: 'Configuração',
        lines: [
            'Valide fontes antes da operação.',
            'Roadmap mostra evolução e status interno.',
            'Snapshot diário aumenta segurança de restauração.'
        ]
    },
    supervisao: {
        title: 'Supervisão',
        lines: [
            'Acesso rápido a mensagens e links padrão.',
            'Favoritos e histórico aceleram atendimento.',
            'Use filtros por público para reduzir ruído.'
        ]
    },
    gerencia: {
        title: 'Gerência',
        lines: [
            'Menu em modo placeholder conforme solicitado.',
            'Estrutura preservada para retomada futura.'
        ]
    }
};

function isAdminRole() {
    return SiteAuth.logged && (SiteAuth.role === 'administrador' || SiteAuth.role === 'gerencia');
}

function getGroupLabelMap() {
    const map = { todos: 'Todos os Grupos' };
    (CONFIG?.groupRules || []).forEach(rule => {
        if (rule?.key) map[rule.key] = rule.label || rule.key;
    });
    return map;
}

function getAllowedGroups() {
    const rules = CONFIG?.groupRules || [];
    const allGroups = rules.map(r => r.key).filter(Boolean);
    if (!SiteAuth.logged || canViewAllGroups()) return allGroups;
    if (Array.isArray(SiteAuth.groups) && SiteAuth.groups.length) {
        return SiteAuth.groups.filter(g => allGroups.includes(g));
    }
    return allGroups;
}

function getUserGroupKey() {
    if (SiteAuth.logged && Array.isArray(SiteAuth.groups) && SiteAuth.groups.length === 1) {
        return SiteAuth.groups[0];
    }
    if (SiteAuth.re) {
        const byCurrent = currentData.find(c => c.re === SiteAuth.re || c.re?.endsWith(SiteAuth.re));
        if (byCurrent?.grupo) return byCurrent.grupo;
        const cached = (allCollaboratorsCache.items || []).find(c => c.re === SiteAuth.re || c.re?.endsWith(SiteAuth.re));
        if (cached?.grupo) return cached.grupo;
    }
    return currentGroup || 'todos';
}

function getGroupOptionsHtml() {
    const labelMap = getGroupLabelMap();
    const allowed = getAllowedGroups();
    if (canViewAllGroups()) {
        return `<option value="all">Todos os Grupos</option>` +
            allowed.map(key => `<option value="${key}">${labelMap[key] || key.toUpperCase()}</option>`).join('');
    }
    if (!allowed.length) {
        return `<option value="all">Todos os Grupos</option>`;
    }
    if (allowed.length === 1) {
        const key = allowed[0];
        return `<option value="${key}">${labelMap[key] || key.toUpperCase()}</option>`;
    }
    return `<option value="all">Todos os Grupos</option>` +
        allowed.map(key => `<option value="${key}">${labelMap[key] || key.toUpperCase()}</option>`).join('');
}

function updateBreadcrumb() {
    const groupEl = document.getElementById('breadcrumb-group');
    const tabEl = document.getElementById('breadcrumb-tab');
    const contextEl = document.getElementById('breadcrumb-context');
    const updatedEl = document.getElementById('breadcrumb-updated');
    const groupPillEl = document.getElementById('breadcrumb-group-pill');
    if (!groupEl || !tabEl) return;
    const groupLabelMap = getGroupLabelMap();
    const tabLabelMap = {
        busca: 'Busca Rápida',
        'busca-beta': 'Busca Rápida Beta',
        formalizador: 'Formalizador',
        unidades: 'Unidades',
        gerencia: 'Gerência',
        supervisao: 'Supervisão',
        avisos: 'Avisos',
        lancamentos: 'Lançamentos',
        config: 'Configuração'
    };
    const groupLabel = groupLabelMap[currentGroup] || (currentGroup ? currentGroup.toUpperCase() : 'Grupo');
    const tabLabel = tabLabelMap[currentTab] || 'Seção';
    groupEl.textContent = `Gateway › ${groupLabel}`;
    tabEl.textContent = tabLabel;
    if (contextEl) {
        const contextLabel = currentContext?.unit ? `Unidade: ${currentContext.unit}` : (currentContext?.re ? `RE ${currentContext.re}` : 'Visão geral');
        contextEl.textContent = contextLabel;
    }
    if (groupPillEl) groupPillEl.textContent = `Grupo: ${groupLabel}`;
    if (updatedEl) {
        updatedEl.textContent = lastUpdatedAt
            ? `Atualizado: ${lastUpdatedAt.toLocaleString()}`
            : '';
    }
}

// --- Recent search removed ---
function saveSearchRecentTerms() {}
function pushSearchRecentTerm() {}

function saveCollaboratorFavorites() {
    try {
        localStorage.setItem('collabFavorites', JSON.stringify(Array.from(collaboratorFavorites)));
    } catch {}
}

function isCollaboratorFavorite(re) {
    const key = normalizeFtRe(re);
    if (!key) return false;
    return collaboratorFavorites.has(key);
}

function toggleCollaboratorFavorite(re) {
    const key = normalizeFtRe(re);
    if (!key) return;
    if (collaboratorFavorites.has(key)) collaboratorFavorites.delete(key);
    else collaboratorFavorites.add(key);
    saveCollaboratorFavorites();
    const term = document.getElementById('search-input')?.value || '';
    runStandardSearch(term, document.getElementById('search-results'), searchFilterStatus || 'all', !!searchHideAbsence);
}

function clearSearchInput() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.value = '';
    searchFilterGroup = 'all';
    searchFilterCargo = 'all';
    searchFilterEscala = 'all';
    searchFilterStatus = 'all';
    searchHideAbsence = false;
    const gf = document.getElementById('search-group-filter');
    const cf = document.getElementById('search-cargo-filter');
    const ef = document.getElementById('search-escala-filter');
    const ac = document.getElementById('search-autocomplete');
    const cb = document.getElementById('search-clear-btn');
    if (gf) gf.value = 'all';
    if (cf) cf.value = 'all';
    if (ef) ef.value = 'all';
    if (ac) ac.classList.add('hidden');
    if (cb) cb.classList.add('hidden');
    realizarBusca();
}

function clearSearchStateAfterAuth() {
    const input = document.getElementById('search-input');
    if (input) input.value = '';
    const clearBtn = document.getElementById('search-clear-btn');
    if (clearBtn) clearBtn.classList.add('hidden');
    const ac = document.getElementById('search-autocomplete');
    if (ac) ac.classList.add('hidden');
    searchFilterGroup = 'all';
    searchFilterCargo = 'all';
    searchFilterEscala = 'all';
    searchFilterStatus = 'all';
    searchHideAbsence = false;

    const params = new URLSearchParams(window.location.search);
    const hadSearchParams = params.has('q') || params.has('filter') || params.has('grupo');
    if (hadSearchParams) {
        params.delete('q');
        params.delete('filter');
        params.delete('grupo');
        if (params.get('tab') === 'busca') params.delete('tab');
        const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
        history.replaceState(null, '', newUrl);
    }

    if (document.getElementById('search-results')) {
        realizarBusca();
    }
}

// --- Advanced filter setters ---
function setSearchFilterGroup(val) { searchFilterGroup = val; updateSearchFilterUI(); realizarBusca(); }
function setSearchFilterCargo(val) { searchFilterCargo = val; updateSearchFilterUI(); realizarBusca(); }
function setSearchFilterEscala(val) { searchFilterEscala = val; updateSearchFilterUI(); realizarBusca(); }

function populateSearchFilterDropdowns() {
    const cargos = [...new Set(currentData.map(d => d.cargo).filter(Boolean))].sort();
    const escalas = [...new Set(currentData.map(d => d.escala).filter(Boolean))].sort();
    const cf = document.getElementById('search-cargo-filter');
    const ef = document.getElementById('search-escala-filter');
    if (cf) cf.innerHTML = `<option value="all">Todos os Cargos</option>` + cargos.map(c => `<option value="${c}">${c}</option>`).join('');
    if (ef) ef.innerHTML = `<option value="all">Todas as Escalas</option>` + escalas.map(e => `<option value="${e}">${e}</option>`).join('');
}

// --- Autocomplete dropdown (disabled — results cards serve the same purpose) ---
function renderSearchAutocomplete() {}
function applyAutocomplete() {}
function hideSearchAutocomplete() {}

// --- Deep link URL support ---
function applySearchDeepLink() {
    const params = new URLSearchParams(window.location.search);
    const q = params.get('q');
    const filter = params.get('filter');
    const group = params.get('grupo');
    const tab = params.get('tab');
    if (tab === 'busca' || q || filter) {
        if (q) {
            const input = document.getElementById('search-input');
            if (input) input.value = q;
        }
        if (filter && ['all','plantao','folga','ft','afastado','favorites'].includes(filter)) {
            searchFilterStatus = filter;
        }
        if (group) searchFilterGroup = group;
        switchTab('busca');
        realizarBusca();
    }
}

function updateSearchDeepLink() {
    const input = document.getElementById('search-input');
    const q = input ? input.value.trim() : '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (searchFilterStatus !== 'all') params.set('filter', searchFilterStatus);
    if (searchFilterGroup !== 'all') params.set('grupo', searchFilterGroup);
    if (params.toString()) params.set('tab', 'busca');
    const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
    history.replaceState(null, '', newUrl);
}

function getRelativeTimeLabel(dateValue) {
    if (!(dateValue instanceof Date) || Number.isNaN(dateValue.getTime())) return 'sem atualização';
    const diffMs = Date.now() - dateValue.getTime();
    const diffMin = Math.max(0, Math.floor(diffMs / 60000));
    if (diffMin < 1) return 'agora';
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHour = Math.floor(diffMin / 60);
    if (diffHour < 24) return `há ${diffHour}h`;
    const diffDay = Math.floor(diffHour / 24);
    return `há ${diffDay}d`;
}

function updateSearchSummary(total = 0, universe = 0) {
    const box = document.getElementById('search-summary');
    if (!box) return;
    if (!Number.isFinite(total) || total < 0) total = 0;
    if (!Number.isFinite(universe) || universe < 0) universe = currentData.length;
    const updated = getRelativeTimeLabel(lastUpdatedAt);
    box.innerHTML = `
        <span><strong>${total}</strong> de <strong>${universe}</strong> colaborador(es)</span>
        <span class="search-summary-meta">Atualizado ${updated}</span>
    `;
    box.classList.toggle('hidden', false);
}

function renderSearchLoadingSkeleton() {
    const container = document.getElementById('search-results');
    if (!container) return;
    container.innerHTML = `
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
    `;
}

function applyRequiredFieldHints() {
    const requiredIds = [
        'aviso-assignee-select',
        'aviso-message',
        'reminder-assignee-select',
        'reminder-message',
        'ft-unit-target',
        'ft-date',
        'ft-shift',
        'ft-reason'
    ];
    requiredIds.forEach(id => {
        const input = document.getElementById(id);
        if (!(input instanceof HTMLElement)) return;
        if ('required' in input) input.required = true;
        const group = input.closest('.form-group');
        const label = group?.querySelector('label');
        if (!label) return;
        if (label.querySelector('.required-mark')) return;
        const mark = document.createElement('span');
        mark.className = 'required-mark';
        mark.textContent = '*';
        label.appendChild(mark);
    });
}

function renderSearchRecentPanel() {}

function applyRecentSearch() {}

function getFavoriteCollaboratorsByTerm(term = '') {
    const upper = String(term || '').trim().toUpperCase();
    const favorites = (currentData || [])
        .filter(item => item && isCollaboratorFavorite(item.re))
        .filter(item => {
            if (!upper) return true;
            return (item.nome && item.nome.includes(upper))
                || (item.re && item.re.includes(upper))
                || (item.posto && item.posto.includes(upper));
        })
        .sort((a, b) => String(a.nome || '').localeCompare(String(b.nome || ''), 'pt-BR'));
    return favorites;
}

function renderSearchFavoritesPanel(term = '') {
    const panel = document.getElementById('search-favorites');
    const list = document.getElementById('search-favorites-list');
    if (!panel || !list) return;
    const favorites = getFavoriteCollaboratorsByTerm(term).slice(0, 8);
    if (!favorites.length) {
        panel.classList.add('hidden');
        return;
    }
    list.innerHTML = favorites.map(item => `
        <div class="search-favorite-item">
            <span>${escapeHtml(item.nome || 'N/I')} (${escapeHtml(item.re || 'N/I')})</span>
            <button type="button" class="btn-mini btn-secondary" onclick="focusFavoriteCollaborator('${escapeHtml(item.re || '')}')">Abrir</button>
        </div>
    `).join('');
    panel.classList.remove('hidden');
}

function focusFavoriteCollaborator(re) {
    const input = document.getElementById('search-input');
    if (!input) return;
    const item = (currentData || []).find(c => matchesRe(c?.re, re));
    if (!item) return;
    input.value = item.re || item.nome || '';
    flushSearchExecution();
}

function toggleSearchAdvanced() {
    searchAdvancedOpen = !searchAdvancedOpen;
    const panel = document.getElementById('search-advanced-panel');
    if (panel) panel.classList.toggle('hidden', !searchAdvancedOpen);
}

function applySearchDatePreset(preset) {
    const today = getTodayKey();
    if (preset === 'today') {
        setSearchDateFilter(today, today);
        return;
    }
    if (preset === 'week') {
        setSearchDateFilter(getDateKeyWithOffset(today, -6), today);
        return;
    }
    if (preset === 'month') {
        const start = getMonthRangeByDateKey(today).start;
        setSearchDateFilter(start, today);
        return;
    }
    clearSearchDateFilter();
}

function syncUtilityDrawer() {
    const drawer = document.getElementById('utility-drawer');
    const menuBtn = document.getElementById('utility-menu-btn');
    if (!drawer) return;
    drawer.classList.toggle('hidden', !utilityDrawerOpen);
    drawer.setAttribute('aria-hidden', utilityDrawerOpen ? 'false' : 'true');
    document.body.classList.toggle('utility-open', utilityDrawerOpen);
    if (menuBtn) menuBtn.setAttribute('aria-expanded', utilityDrawerOpen ? 'true' : 'false');
}

function openUtilityDrawer() {
    utilityDrawerOpen = true;
    syncUtilityDrawer();
}

function closeUtilityDrawer() {
    utilityDrawerOpen = false;
    syncUtilityDrawer();
}

function toggleUtilityDrawer() {
    utilityDrawerOpen = !utilityDrawerOpen;
    syncUtilityDrawer();
}

function closeTopVisibleModal() {
    const opened = Array.from(document.querySelectorAll('.modal')).filter(m => !m.classList.contains('hidden'));
    if (!opened.length) return false;
    const top = opened[opened.length - 1];
    top.classList.add('hidden');
    return true;
}

function syncModalOpenState() {
    const hasOpen = !!document.querySelector('.modal:not(.hidden)');
    document.body.classList.toggle('modal-open', hasOpen);
}

function bindModalA11y() {
    if (modalA11yBound) return;
    modalA11yBound = true;
    const observer = new MutationObserver((mutations) => {
        if (!mutations.some(m => m.target instanceof HTMLElement && m.target.classList.contains('modal'))) return;
        syncModalOpenState();
    });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['class'] });
    AppEventManager.on(document, 'click', (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.classList.contains('modal')) {
            target.classList.add('hidden');
            syncModalOpenState();
        }
    }, false, { scope: 'modals', key: 'modal-backdrop-close' });
    AppEventManager.on(document, 'keydown', (ev) => {
        if (ev.key !== 'Escape') return;
        if (commandPaletteState.open) return;
        if (closeTopVisibleModal()) {
            ev.preventDefault();
            syncModalOpenState();
            return;
        }
        if (utilityDrawerOpen) {
            ev.preventDefault();
            closeUtilityDrawer();
        }
    }, false, { scope: 'modals', key: 'modal-escape-close' });
    syncModalOpenState();
}

function computeSearchFilterCounts(term = '') {
    const termos = String(term || '').toUpperCase().trim().split(/\s+/).filter(Boolean);
    const termosNorm = termos.map(t => normalizeSearchText(t));
    let base = (currentData || []).filter(item => {
        if (!item) return false;
        if (hiddenUnits.has(item.posto)) return false;
        if (termos.length) {
            const score = scoreSearchMatch(item, termos, termosNorm);
            if (score <= 0) return false;
        }
        if (searchHideAbsence && item.rotulo) return false;
        if (searchFilterGroup && searchFilterGroup !== 'all' && item.grupo !== searchFilterGroup) return false;
        if (searchFilterCargo && searchFilterCargo !== 'all' && (item.cargo || '').toUpperCase() !== searchFilterCargo.toUpperCase()) return false;
        if (searchFilterEscala && searchFilterEscala !== 'all' && (item.escala || '') !== searchFilterEscala) return false;
        return true;
    });
    if (hasDateRangeFilter(searchDateFilter)) {
        base = base.filter(item => matchesFtDateFilterForCollaborator(item.re, searchDateFilter));
    }
    const counts = { all: base.length, plantao: 0, folga: 0, ft: 0, afastado: 0, favorites: 0, noAbsence: 0 };
    base.forEach(item => {
        const statusInfo = getStatusInfoForFilter(item);
        const text = String(statusInfo?.text || '');
        const isPlantao = text.includes('PLANTÃO') || text.includes('FT');
        const isFolga = text === 'FOLGA';
        if (isPlantao) counts.plantao += 1;
        if (isFolga) counts.folga += 1;
        if (text.includes('FT')) counts.ft += 1;
        if (item.rotulo) counts.afastado += 1;
        if (isCollaboratorFavorite(item.re)) counts.favorites += 1;
        if (!item.rotulo) counts.noAbsence += 1;
    });
    return counts;
}

function updateFilterChipCountLabel(button, count) {
    if (!button) return;
    if (!button.dataset.baseLabel) {
        button.dataset.baseLabel = button.textContent.trim().replace(/\(\d+\)$/g, '').trim();
    }
    const baseLabel = button.dataset.baseLabel || '';
    let countNode = button.querySelector('.chip-count');
    if (!countNode) {
        countNode = document.createElement('span');
        countNode.className = 'chip-count';
    }
    countNode.textContent = String(Number.isFinite(count) ? count : 0);
    button.replaceChildren(document.createTextNode(`${baseLabel} `), countNode);
}

function updateSearchFilterUI() {
    const term = document.getElementById('search-input')?.value || '';
    const counts = computeSearchFilterCounts(term);
    document.querySelectorAll('.filter-chip[data-filter]').forEach(btn => {
        const key = btn.getAttribute('data-filter');
        const active = key === searchFilterStatus;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        updateFilterChipCountLabel(btn, counts[key] || 0);
    });
    const hideBtn = document.querySelector('.filter-chip[data-hide]');
    if (hideBtn) {
        hideBtn.classList.toggle('active', searchHideAbsence);
        hideBtn.setAttribute('aria-pressed', searchHideAbsence ? 'true' : 'false');
        updateFilterChipCountLabel(hideBtn, counts.noAbsence || 0);
    }
    const filterWrap = document.querySelector('.search-filters, .search-filters-compact');
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

function setSearchDateFilter(from, to) {
    const normalized = normalizeDateRange(from, to);
    searchDateFilter.from = normalized.from;
    searchDateFilter.to = normalized.to;
    const fromInput = document.getElementById('search-date-from');
    const toInput = document.getElementById('search-date-to');
    if (fromInput && fromInput.value !== searchDateFilter.from) fromInput.value = searchDateFilter.from;
    if (toInput && toInput.value !== searchDateFilter.to) toInput.value = searchDateFilter.to;
    updateSearchFilterUI();
    realizarBusca();
}

function clearSearchDateFilter() {
    setSearchDateFilter('', '');
}

function setUnitDateFilter(from, to) {
    const normalized = normalizeDateRange(from, to);
    unitDateFilter.from = normalized.from;
    unitDateFilter.to = normalized.to;
    const fromInput = document.getElementById('unit-date-from');
    const toInput = document.getElementById('unit-date-to');
    if (fromInput && fromInput.value !== unitDateFilter.from) fromInput.value = unitDateFilter.from;
    if (toInput && toInput.value !== unitDateFilter.to) toInput.value = unitDateFilter.to;
    renderizarUnidades();
}

function clearUnitDateFilter() {
    setUnitDateFilter('', '');
}

// --- Substitute search removed (stubs) ---
function toggleSubstituteSearchButton() {}
function isSubstituteSearchEnabled() { return false; }
function updateSubstituteSearchButton() {}
function getSubstituteTarget() { return null; }
function setSubstituteTarget() {}
function clearSubstituteTarget() {}
function setSubstituteProximity() {}
function updateSubstitutePanel() {}

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
    const bar = document.getElementById('context-bar');
    if (bar) { bar.classList.add('hidden'); bar.innerHTML = ''; }
}

function setContextUnit(_unitName) { /* desativado */ }

function setContextCollab(_re) { /* desativado */ }

function renderContextBar() { /* desativado */ }

function bindContextSelection() {
    // Context bar desativado — clique no card não abre mais barra inferior
    // Mantém apenas a lógica de substituição para não quebrar essa feature
    if (contextBound) return;
    contextBound = true;
    AppEventManager.on(document, 'click', (e) => {
        const card = e.target.closest('.result-card');
        if (card && !e.target.closest('button') && !e.target.closest('a') && !e.target.closest('select')) {
            const re = card.getAttribute('data-collab-re');
            if (re && isSubstituteSearchEnabled() && !getSubstituteTarget()) {
                setSubstituteTarget(re);
            }
        }
    }, false, { scope: 'context', key: 'context-selection-click' });
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
    try {
        const storedByGroup = localStorage.getItem('escalaInvertidaByGroup');
        if (storedByGroup !== null) {
            escalaInvertidaByGroup = JSON.parse(storedByGroup) || {};
        } else {
            // Migração legada: booleano único → aplica a todos os grupos
            const legacy = localStorage.getItem('escalaInvertida');
            if (legacy !== null) {
                const val = legacy === '1';
                (CONFIG?.groupRules || []).forEach(r => { if (r?.key) escalaInvertidaByGroup[r.key] = val; });
            }
        }
    } catch {}
    try {
        const storedAutoMonth = localStorage.getItem('escalaInvertidaAutoMonth');
        if (storedAutoMonth !== null && storedAutoMonth !== '') {
            const parsed = parseInt(storedAutoMonth, 10);
            if (!Number.isNaN(parsed)) escalaInvertidaAutoMonth = parsed;
        }
    } catch {}
    try {
        const favorites = localStorage.getItem('collabFavorites');
        const list = favorites ? JSON.parse(favorites) || [] : [];
        collaboratorFavorites = new Set(Array.isArray(list) ? list.map(v => normalizeFtRe(v)).filter(Boolean) : []);
    } catch {
        collaboratorFavorites = new Set();
    }
    // Async: load change history and app settings from Supabase
    if (supabaseClient && SiteAuth.logged) {
        loadChangeHistoryFromSupabase();
        _loadAllAppSettings();
    }
}

function loadAvisos() {
    if (!isDashboardFeatureEnabled('avisos')) return;
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
    // Async: load from Supabase
    if (supabaseClient && SiteAuth.logged) {
        loadAvisosFromSupabase().then(loaded => {
            if (loaded) updateAvisosUI();
        });
    }
}

function saveAvisos(silent = false) {
    if (!isDashboardFeatureEnabled('avisos')) return;
    localStorage.setItem('avisos', JSON.stringify(avisos));
    localStorage.setItem('avisosSeen', JSON.stringify(Array.from(avisosSeenIds)));
    scheduleLocalSync('avisos', { silent, notify: !silent });
    updateAvisosUI();
}

function clearAvisos() {
    if (!isAdminRole()) {
        showToast('Apenas admins podem limpar os avisos.', 'error');
        return;
    }
    if (!confirm('Limpar todos os avisos? Esta ação não pode ser desfeita.')) return;
    avisos = [];
    avisosSeenIds = new Set();
    saveAvisos();
    showToast('Avisos limpos.', 'success');
    renderAvisos();
}

function getFtItemUpdatedTime(item) {
    const updated = new Date(item?.updatedAt || 0).getTime();
    if (updated) return updated;
    const requested = new Date(item?.requestedAt || 0).getTime();
    if (requested) return requested;
    return new Date(item?.createdAt || 0).getTime() || 0;
}

function buildFtDedupKey(item) {
    const fallbackId = String(item?.id || '').trim();
    const normalizedDate = normalizeFtDateKey(item?.date) || '';
    const collabKey = normalizeFtRe(item?.collabRe) || normalizeText(item?.collabName || '');
    const unitKey = normalizeUnitKey(item?.unitTarget || item?.unitCurrent || '');
    const coveringKey = normalizeFtRe(item?.coveringRe)
        || normalizeText(item?.coveringOther || item?.coveringName || '');
    const timeKey = String(item?.ftTime || '').trim().toUpperCase();
    const shiftKey = String(item?.shift || '').trim().toUpperCase();
    const reasonKey = normalizeText(item?.reasonRaw || item?.reasonOther || item?.reason || '');
    const detailKey = normalizeText(item?.reasonDetail || '');
    const core = [normalizedDate, collabKey, unitKey, coveringKey, shiftKey, timeKey, reasonKey, detailKey]
        .filter(Boolean)
        .join('|');
    if (core) return core;
    if (fallbackId) return `id:${fallbackId}`;
    return ['ft', item?.createdAt || '', item?.collabName || '', item?.unitTarget || ''].join('|');
}

function buildFtStatusConflictKey(item) {
    const fallbackId = String(item?.id || '').trim();
    const normalizedDate = normalizeFtDateKey(item?.date) || '';
    const collabKey = normalizeFtRe(item?.collabRe) || normalizeText(item?.collabName || '');
    const unitKey = normalizeUnitKey(item?.unitTarget || item?.unitCurrent || '');
    const shiftKey = String(item?.shift || '').trim().toUpperCase();
    const core = [normalizedDate, collabKey, unitKey, shiftKey]
        .filter(Boolean)
        .join('|');
    if (core) return core;
    if (fallbackId) return `id:${fallbackId}`;
    return ['ft-status', item?.createdAt || '', item?.collabName || '', item?.unitTarget || ''].join('|');
}

function buildFtStatusConflictVariant(item) {
    const parts = getFtStatusConflictParts(item);
    return [parts.timeKey || '-', parts.coveringKey || '-', parts.reasonKey || '-'].join('|');
}

function getFtStatusConflictParts(item) {
    return {
        timeKey: String(item?.ftTime || '').trim().toUpperCase(),
        coveringKey: normalizeFtRe(item?.coveringRe)
            || normalizeText(item?.coveringOther || item?.coveringName || ''),
        reasonKey: normalizeText(item?.reasonRaw || item?.reasonOther || item?.reason || '')
    };
}

function isFtPendingEquivalent(pendingItem, progressedItem) {
    const pending = getFtStatusConflictParts(pendingItem);
    const progressed = getFtStatusConflictParts(progressedItem);
    const sameTime = !pending.timeKey || pending.timeKey === progressed.timeKey;
    const sameCovering = !pending.coveringKey || pending.coveringKey === progressed.coveringKey;
    const sameReason = !pending.reasonKey || pending.reasonKey === progressed.reasonKey;
    return sameTime && sameCovering && sameReason;
}

function reconcileFtStatusConflicts(items = []) {
    const byKey = new Map();
    (items || []).forEach(item => {
        if (!item) return;
        const key = buildFtStatusConflictKey(item);
        if (!byKey.has(key)) byKey.set(key, []);
        byKey.get(key).push(item);
    });
    const merged = [];
    byKey.forEach(group => {
        const progressed = group.filter(item => item?.status === 'submitted' || item?.status === 'launched');
        if (!progressed.length) {
            merged.push(...group);
            return;
        }
        // Regra de integridade: para a mesma FT operacional, status avançado elimina pendente.
        const byVariant = new Map();
        progressed.forEach(item => {
            const variant = buildFtStatusConflictVariant(item);
            const existing = byVariant.get(variant);
            byVariant.set(variant, pickPreferredFtItem(existing, item));
        });
        const preferredProgressed = Array.from(byVariant.values());
        merged.push(...preferredProgressed);
        const pendingOnly = group.filter(item => item?.status === 'pending');
        pendingOnly.forEach(pendingItem => {
            const hasEquivalentProgress = preferredProgressed.some(progressItem => isFtPendingEquivalent(pendingItem, progressItem));
            if (!hasEquivalentProgress) merged.push(pendingItem);
        });
    });
    return merged;
}

function pickPreferredFtItem(existing, incoming) {
    if (!existing) return incoming;
    const existingStatus = getFtStatusRank(existing?.status);
    const incomingStatus = getFtStatusRank(incoming?.status);
    if (incomingStatus !== existingStatus) {
        return incomingStatus > existingStatus ? incoming : existing;
    }
    const existingTime = getFtItemUpdatedTime(existing);
    const incomingTime = getFtItemUpdatedTime(incoming);
    if (incomingTime !== existingTime) {
        return incomingTime > existingTime ? incoming : existing;
    }
    const existingSource = existing?.source === 'supabase' ? 1 : 0;
    const incomingSource = incoming?.source === 'supabase' ? 1 : 0;
    if (incomingSource !== existingSource) {
        return incomingSource > existingSource ? incoming : existing;
    }
    return incoming;
}

function dedupeFtLaunches(list = []) {
    const byKey = new Map();
    (list || []).forEach(item => {
        if (!item) return;
        const key = buildFtDedupKey(item);
        const existing = byKey.get(key);
        byKey.set(key, pickPreferredFtItem(existing, item));
    });
    const strictList = Array.from(byKey.values());
    const reconciled = reconcileFtStatusConflicts(strictList);
    return reconciled
        .sort((a, b) => getFtItemUpdatedTime(b) - getFtItemUpdatedTime(a));
}

function normalizeFtLaunchEntries(list = []) {
    const normalized = (list || []).map(item => {
        if (!item) return null;
        const next = { ...item };
        if (!next.status) next.status = 'pending';
        if (next.status === 'confirmed') next.status = 'submitted';
        if (!['pending', 'submitted', 'launched'].includes(next.status)) {
            next.status = normalizeFtStatus(next.status);
        }
        if (!next.updatedAt) next.updatedAt = next.createdAt || new Date().toISOString();
        const normalizedDate = normalizeFtDateKey(next.date);
        if (normalizedDate) next.date = normalizedDate;
        return next;
    }).filter(Boolean);
    return dedupeFtLaunches(normalized);
}

function runFtIntegrityCheck(context = 'runtime') {
    const items = Array.isArray(ftLaunches) ? ftLaunches : [];
    if (!items.length) return { ok: true, duplicates: 0, statusConflicts: 0 };

    const dedupSeen = new Set();
    let duplicates = 0;
    items.forEach(item => {
        const key = buildFtDedupKey(item);
        if (dedupSeen.has(key)) duplicates += 1;
        else dedupSeen.add(key);
    });

    const byStatusKey = new Map();
    items.forEach(item => {
        const key = buildFtStatusConflictKey(item);
        if (!byStatusKey.has(key)) byStatusKey.set(key, []);
        byStatusKey.get(key).push(item);
    });

    let statusConflicts = 0;
    byStatusKey.forEach(group => {
        const progressed = group.filter(item => item?.status === 'submitted' || item?.status === 'launched');
        if (!progressed.length) return;
        const pendingOnly = group.filter(item => item?.status === 'pending');
        pendingOnly.forEach(pendingItem => {
            const hasEquivalent = progressed.some(progressItem => isFtPendingEquivalent(pendingItem, progressItem));
            if (hasEquivalent) statusConflicts += 1;
        });
    });

    const ok = duplicates === 0 && statusConflicts === 0;
    if (!ok) {
        AppLogger.warn('FT integrity check detected inconsistencies', { context, duplicates, statusConflicts, total: items.length });
    } else {
        AppLogger.debug('FT integrity check OK', { context, total: items.length });
    }
    return { ok, duplicates, statusConflicts };
}

function buildFtAuditEntryKey(entry) {
    const id = String(entry?.id || '').trim();
    if (id) return `id:${id}`;
    const snapshot = entry?.item || {};
    const ftId = String(snapshot?.ftId || '').trim();
    const ts = String(entry?.ts || '').trim();
    const event = String(entry?.event || '').trim();
    const nextStatus = String(entry?.nextStatus || '').trim();
    const origin = String(entry?.origin || '').trim();
    const actor = String(entry?.actor || '').trim();
    return [ftId, ts, event, nextStatus, origin, actor].join('|');
}

function buildFtAuditItemSnapshot(item) {
    if (!item || typeof item !== 'object') return null;
    const date = normalizeFtDateKey(item.date) || String(item.date || '').trim();
    return {
        ftId: String(item.id || item.ftId || '').trim(),
        date: date || '',
        collabRe: String(item.collabRe || '').trim(),
        collabName: String(item.collabName || '').trim(),
        unit: String(item.unitTarget || item.unitCurrent || item.unit || '').trim(),
        status: normalizeFtStatus(item.status || 'pending'),
        source: String(item.source || '').trim(),
        sourceGroup: String(item.sourceGroup || item.group || '').trim(),
        shift: String(item.shift || '').trim(),
        ftTime: String(item.ftTime || '').trim()
    };
}

function normalizeFtAuditTrail(list = []) {
    const byKey = new Map();
    (list || []).forEach(raw => {
        if (!raw || typeof raw !== 'object') return;
        const rawTs = String(raw.ts || raw.timestamp || '').trim();
        const parsedTs = Date.parse(rawTs);
        const ts = Number.isFinite(parsedTs) ? new Date(parsedTs).toISOString() : new Date().toISOString();
        const event = String(raw.event || 'status_change').trim() || 'status_change';
        const origin = String(raw.origin || 'system').trim() || 'system';
        const actor = String(raw.actor || '').trim();
        const prevStatus = raw.prevStatus ? normalizeFtStatus(raw.prevStatus) : '';
        const nextStatus = raw.nextStatus ? normalizeFtStatus(raw.nextStatus) : '';
        const note = String(raw.note || '').trim();
        const item = buildFtAuditItemSnapshot(raw.item || raw.itemSnapshot || null);
        const entry = {
            id: String(raw.id || '').trim(),
            ts,
            event,
            origin,
            actor,
            prevStatus,
            nextStatus,
            note,
            item
        };
        const key = buildFtAuditEntryKey(entry);
        const existing = byKey.get(key);
        if (!existing || Date.parse(entry.ts) > Date.parse(existing.ts)) {
            byKey.set(key, entry);
        }
    });
    return Array.from(byKey.values())
        .sort((a, b) => Date.parse(b.ts) - Date.parse(a.ts))
        .slice(0, FT_AUDIT_MAX_ITEMS);
}

function loadFtAuditTrail() {
    try {
        const stored = localStorage.getItem('ftAuditTrail');
        const parsed = stored ? JSON.parse(stored) || [] : [];
        ftAuditTrail = normalizeFtAuditTrail(parsed);
    } catch {
        ftAuditTrail = [];
    }
    // Async: load from Supabase
    if (supabaseClient && SiteAuth.logged) {
        loadFtAuditFromSupabase();
    }
}

function saveFtAuditTrail(silent = false) {
    ftAuditTrail = normalizeFtAuditTrail(ftAuditTrail);
    localStorage.setItem('ftAuditTrail', JSON.stringify(ftAuditTrail));
    scheduleLocalSync('ft-audit', { silent, notify: !silent });
}

function resolveFtAuditActor(meta = {}) {
    const explicit = String(meta.actor || '').trim();
    if (explicit) return explicit;
    if (SiteAuth?.logged && SiteAuth?.user) return SiteAuth.user;
    const origin = String(meta.origin || '').trim();
    if (origin === 'sheet_sync') return 'Importação legada';
    if (origin === 'form_response_sync') return 'Confirmação legada';
    return 'Sistema';
}

function getFtAuditOriginLabel(origin = '') {
    const key = String(origin || '').trim().toLowerCase();
    if (key === 'manual') return 'Lançamento manual';
    if (key === 'sheet_sync') return 'Integração legada';
    if (key === 'form_response_sync') return 'Confirmação legada';
    if (key === 'manual_delete') return 'Remoção manual';
    if (key === 'manual_restore') return 'Restauração manual';
    return 'Sistema';
}

function getFtStatusAuditLabel(status = '') {
    const key = normalizeFtStatus(status || '');
    if (key === 'launched') return 'Lançada';
    if (key === 'submitted') return 'Confirmada';
    return 'Pendente';
}

function getFtAuditEventLabel(event = '') {
    const key = String(event || '').trim().toLowerCase();
    if (key === 'status_change') return 'Mudança de status';
    if (key === 'created') return 'Criação';
    if (key === 'removed') return 'Remoção';
    if (key === 'restored') return 'Restauração';
    return 'Evento';
}

function logFtAudit(eventType, item, meta = {}) {
    const event = String(eventType || 'status_change').trim() || 'status_change';
    const snapshot = buildFtAuditItemSnapshot(meta.itemOverride || item || null);
    const entry = {
        id: `ft-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        ts: new Date().toISOString(),
        event,
        origin: String(meta.origin || 'system').trim() || 'system',
        actor: resolveFtAuditActor(meta),
        prevStatus: meta.prevStatus ? normalizeFtStatus(meta.prevStatus) : '',
        nextStatus: meta.nextStatus ? normalizeFtStatus(meta.nextStatus) : '',
        note: String(meta.note || '').trim(),
        item: snapshot
    };
    if (meta.sourceGroup && entry.item) {
        entry.item.sourceGroup = String(meta.sourceGroup || '').trim();
    }
    ftAuditTrail.unshift(entry);
    if (ftAuditTrail.length > FT_AUDIT_MAX_ITEMS) {
        ftAuditTrail = ftAuditTrail.slice(0, FT_AUDIT_MAX_ITEMS);
    }
    saveFtAuditTrail(true);
    return entry;
}

function getLatestFtAuditEntry(ftId = '') {
    const target = String(ftId || '').trim();
    if (!target) return null;
    return (ftAuditTrail || []).find(entry => String(entry?.item?.ftId || '').trim() === target) || null;
}

function formatFtAuditEntrySummary(entry) {
    if (!entry) return '';
    const when = entry.ts ? formatFtDateTime(entry.ts) : '';
    const origin = getFtAuditOriginLabel(entry.origin);
    const event = getFtAuditEventLabel(entry.event);
    const actor = String(entry.actor || '').trim() || 'Sistema';
    const prev = entry.prevStatus ? getFtStatusAuditLabel(entry.prevStatus) : '';
    const next = entry.nextStatus ? getFtStatusAuditLabel(entry.nextStatus) : '';
    const statusText = prev && next ? `${prev} -> ${next}` : (next || prev);
    const statusChunk = statusText ? ` (${statusText})` : '';
    const note = entry.note ? ` • ${entry.note}` : '';
    return [when, origin, `${event}${statusChunk}`, actor].filter(Boolean).join(' • ') + note;
}

function loadFtLaunches() {
    // Try localStorage first for instant display, then override from Supabase
    try {
        const stored = localStorage.getItem('ftLaunches');
        ftLaunches = stored ? JSON.parse(stored) || [] : [];
    } catch {
        ftLaunches = [];
    }
    ftLaunches = normalizeFtLaunchEntries(ftLaunches);
    runFtIntegrityCheck('load-ft-launches');
    // Async: load from Supabase to get latest data
    if (supabaseClient && SiteAuth.logged) {
        loadFtLaunchesFromSupabase().then(loaded => {
            if (loaded) {
                runFtIntegrityCheck('load-ft-supabase');
                updateLancamentosUI();
            }
        });
    }
}

function saveFtLaunches(silent = false) {
    ftLaunches = normalizeFtLaunchEntries(ftLaunches);
    runFtIntegrityCheck('save-ft-launches');
    localStorage.setItem('ftLaunches', JSON.stringify(ftLaunches));
    scheduleLocalSync('ft', { silent, notify: !silent });
    updateLancamentosUI();
}

function loadFtReasons() {
    if (!isDashboardFeatureEnabled('lancamentos')) return;
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
    if (!isDashboardFeatureEnabled('lancamentos')) return;
    localStorage.setItem('ftReasons', JSON.stringify(ftReasons));
    scheduleLocalSync('ft-reasons', { silent, notify: !silent });
}

function saveLocalState(silent = false) {
    localStorage.setItem('collaboratorEdits', JSON.stringify(collaboratorEdits));
    localStorage.setItem('unitMetadata', JSON.stringify(unitMetadata));
    localStorage.setItem('changeHistory', JSON.stringify(changeHistory));
    scheduleLocalSync('local-save', { silent, notify: !silent });
}

function saveEscalaInvertida(silent = false) {
    localStorage.setItem('escalaInvertidaByGroup', JSON.stringify(escalaInvertidaByGroup));
    if (typeof escalaInvertidaAutoMonth === 'number') {
        localStorage.setItem('escalaInvertidaAutoMonth', String(escalaInvertidaAutoMonth));
    } else {
        localStorage.removeItem('escalaInvertidaAutoMonth');
    }
    scheduleLocalSync('escala-invertida', { silent, notify: !silent });
}

function clearLocalState() {
    collaboratorEdits = {};
    unitMetadata = {};
    changeHistory = [];
    ftAuditTrail = [];
    localStorage.removeItem('collaboratorEdits');
    localStorage.removeItem('unitMetadata');
    localStorage.removeItem('changeHistory');
    localStorage.removeItem('ftAuditTrail');
}

function scheduleLocalSync(reason, options = {}) {
    if (!supabaseClient || !SiteAuth.logged) return;
    const silent = options.silent !== false;
    // Debounce: group syncs within 500ms
    if (scheduleLocalSync._timer) clearTimeout(scheduleLocalSync._timer);
    scheduleLocalSync._pending = scheduleLocalSync._pending || new Set();
    scheduleLocalSync._pending.add(reason);
    scheduleLocalSync._timer = setTimeout(async () => {
        const reasons = Array.from(scheduleLocalSync._pending);
        scheduleLocalSync._pending.clear();
        for (const r of reasons) {
            try {
                await _syncToSupabase(r, silent);
            } catch (err) {
                AppErrorHandler.capture(err, { scope: `sync-${r}` }, { silent: true });
            }
        }
    }, 500);
}

// ── Supabase field mappers ──

function _ftLaunchToRow(item) {
    return {
        id: item.id,
        collab_re: item.collabRe || '',
        collab_name: item.collabName || '',
        collab_phone: item.collabPhone || '',
        unit_current: item.unitCurrent || '',
        unit_target: item.unitTarget || '',
        ft_date: item.date || '',
        shift: item.shift || '',
        reason: item.reason || '',
        reason_other: item.reasonOther || '',
        reason_raw: item.reasonRaw || '',
        reason_detail: item.reasonDetail || '',
        covering_re: item.coveringRe || '',
        covering_name: item.coveringName || '',
        covering_phone: item.coveringPhone || '',
        covering_other: item.coveringOther || '',
        notes: item.notes || '',
        group: item.group || '',
        source_group: item.sourceGroup || '',
        status: item.status || 'pending',
        source: item.source || '',
        created_at: item.createdAt || new Date().toISOString(),
        updated_at: item.updatedAt || new Date().toISOString(),
        requested_at: item.requestedAt || null,
        created_by: item.createdBy || '',
        form_link: item.formLink || '',
        link_sent_at: item.linkSentAt || null,
        ft_time: item.ftTime || ''
    };
}

function _rowToFtLaunch(row) {
    return {
        id: row.id,
        collabRe: row.collab_re || '',
        collabName: row.collab_name || '',
        collabPhone: row.collab_phone || '',
        unitCurrent: row.unit_current || '',
        unitTarget: row.unit_target || '',
        date: row.ft_date || '',
        shift: row.shift || '',
        reason: row.reason || '',
        reasonOther: row.reason_other || '',
        reasonRaw: row.reason_raw || '',
        reasonDetail: row.reason_detail || '',
        coveringRe: row.covering_re || '',
        coveringName: row.covering_name || '',
        coveringPhone: row.covering_phone || '',
        coveringOther: row.covering_other || '',
        notes: row.notes || '',
        group: row.group || '',
        sourceGroup: row.source_group || '',
        status: row.status || 'pending',
        source: row.source || '',
        createdAt: row.created_at || '',
        updatedAt: row.updated_at || '',
        requestedAt: row.requested_at || '',
        createdBy: row.created_by || '',
        formLink: row.form_link || '',
        linkSentAt: row.link_sent_at || '',
        ftTime: row.ft_time || ''
    };
}

function _avisoToRow(item) {
    return {
        id: item.id,
        group: item.group || '',
        unit: item.unit || '',
        collab_re: item.collabRe || '',
        collab_name: item.collabName || '',
        assigned_to_re: item.assignedToRe || '',
        assigned_to_name: item.assignedToName || '',
        priority: item.priority || 'normal',
        title: item.title || '',
        message: item.message || '',
        simple: !!item.simple,
        status: item.status || 'pending',
        created_at: item.createdAt || new Date().toISOString(),
        created_by: item.createdBy || '',
        reminder_enabled: !!item.reminderEnabled,
        reminder_type: item.reminderType || '',
        reminder_every: item.reminderEvery || '',
        reminder_next_at: item.reminderNextAt || null,
        done_at: item.doneAt || null,
        done_by: item.doneBy || ''
    };
}

function _rowToAviso(row) {
    return {
        id: row.id,
        group: row.group || '',
        unit: row.unit || '',
        collabRe: row.collab_re || '',
        collabName: row.collab_name || '',
        assignedToRe: row.assigned_to_re || '',
        assignedToName: row.assigned_to_name || '',
        priority: row.priority || 'normal',
        title: row.title || '',
        message: row.message || '',
        simple: !!row.simple,
        status: row.status || 'pending',
        createdAt: row.created_at || '',
        createdBy: row.created_by || '',
        reminderEnabled: !!row.reminder_enabled,
        reminderType: row.reminder_type || '',
        reminderEvery: row.reminder_every || '',
        reminderNextAt: row.reminder_next_at || null,
        doneAt: row.done_at || null,
        doneBy: row.done_by || ''
    };
}

function _ftAuditToRow(item) {
    return {
        id: item.id,
        ts: item.ts || new Date().toISOString(),
        event: item.event || '',
        origin: item.origin || '',
        actor: item.actor || '',
        prev_status: item.prevStatus || '',
        next_status: item.nextStatus || '',
        note: item.note || '',
        item: item.item || null
    };
}

function _rowToFtAudit(row) {
    return {
        id: row.id,
        ts: row.ts || '',
        event: row.event || '',
        origin: row.origin || '',
        actor: row.actor || '',
        prevStatus: row.prev_status || '',
        nextStatus: row.next_status || '',
        note: row.note || '',
        item: row.item || null
    };
}

function _changeHistoryToRow(item) {
    return {
        data: item.data || '',
        responsavel: item.responsavel || '',
        acao: item.acao || '',
        detalhe: item.detalhe || '',
        target: item.target || null,
        changes: item.changes || null,
        before_snapshot: item.before || null,
        after_snapshot: item.after || null,
        undo: item.undo || null
    };
}

function _rowToChangeHistory(row) {
    return {
        data: row.data || '',
        responsavel: row.responsavel || '',
        acao: row.acao || '',
        detalhe: row.detalhe || '',
        target: row.target || null,
        changes: row.changes || null,
        before: row.before_snapshot || null,
        after: row.after_snapshot || null,
        undo: row.undo || null
    };
}

// ── Sync dispatcher ──

async function _syncToSupabase(reason, silent) {
    if (!supabaseClient) return;
    switch (reason) {
        case 'ft':
            await _syncFtLaunches();
            break;
        case 'ft-audit':
            await _syncFtAuditTrail();
            break;
        case 'avisos':
            await _syncAvisos();
            break;
        case 'local-save':
            await _syncChangeHistory();
            break;
        case 'ft-reasons':
            await _syncAppSetting('ftReasons', ftReasons);
            break;
        case 'escala-invertida':
            await _syncAppSetting('escalaInvertida', { byGroup: escalaInvertidaByGroup, autoMonth: escalaInvertidaAutoMonth });
            break;
        case 'admin-users':
            await _syncAppSetting('adminUsers', SiteAuth.admins || []);
            break;
        case 'reciclagem-templates':
            try { await _syncAppSetting('reciclagemTemplates', JSON.parse(localStorage.getItem('reciclagemTemplates') || '[]')); } catch {}
            break;
        case 'reciclagem-overrides':
            try { await _syncAppSetting('reciclagemOverrides', JSON.parse(localStorage.getItem('reciclagemOverrides') || '{}')); } catch {}
            break;
        case 'reciclagem-history':
            try { await _syncAppSetting('reciclagemHistory', JSON.parse(localStorage.getItem('reciclagemHistory') || '[]')); } catch {}
            break;
        case 'reciclagem-notes':
            try { await _syncAppSetting('reciclagemNotes', JSON.parse(localStorage.getItem('reciclagemNotes') || '{}')); } catch {}
            break;
        case 'supervisao-menu':
            try { await _syncAppSetting('supervisaoMenu', JSON.parse(localStorage.getItem('supervisaoMenu') || '[]')); } catch {}
            break;
        case 'supervisao-history':
            try { await _syncAppSetting('supervisaoHistory', JSON.parse(localStorage.getItem('supervisaoHistory') || '[]')); } catch {}
            break;
        case 'local-collaborators':
            try { await _syncAppSetting('localCollaborators', JSON.parse(localStorage.getItem('localCollaborators') || '[]')); } catch {}
            break;
        case 'pre-registered-emails':
            await _syncAppSetting('preRegisteredEmails', preRegisteredEmails || []);
            break;
        default:
            break;
    }
}

async function _syncAppSetting(key, value) {
    if (!supabaseClient) return;
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.app_settings)
        .upsert({ key, value, updated_by: SiteAuth.user || SiteAuth.email || '' }, { onConflict: 'key' });
    if (error) {
        AppErrorHandler.capture(error, { scope: `sync-setting-${key}` }, { silent: true });
    }
}

async function _loadAppSetting(key) {
    if (!supabaseClient) return undefined;
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.app_settings)
            .select('value')
            .eq('key', key)
            .maybeSingle();
        if (error) throw error;
        return data?.value;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: `load-setting-${key}` }, { silent: true });
        return undefined;
    }
}

async function _loadAllAppSettings() {
    if (!supabaseClient || !SiteAuth.logged) return;
    const lancamentosEnabled = isDashboardFeatureEnabled('lancamentos');
    const reciclagemEnabled = isDashboardFeatureEnabled('reciclagem');
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.app_settings)
            .select('key, value');
        if (error) throw error;
        if (!data || !data.length) return;
        for (const row of data) {
            try {
                switch (row.key) {
                    case 'ftReasons':
                        if (lancamentosEnabled && Array.isArray(row.value) && row.value.length) {
                            ftReasons = row.value;
                            localStorage.setItem('ftReasons', JSON.stringify(ftReasons));
                        }
                        break;
                    case 'escalaInvertida':
                        if (row.value && typeof row.value === 'object') {
                            if (row.value.byGroup && typeof row.value.byGroup === 'object') {
                                escalaInvertidaByGroup = row.value.byGroup;
                            } else if (typeof row.value.value === 'boolean') {
                                // Migração legada
                                const val = row.value.value;
                                (CONFIG?.groupRules || []).forEach(r => { if (r?.key) escalaInvertidaByGroup[r.key] = val; });
                            }
                            if (typeof row.value.autoMonth === 'number') escalaInvertidaAutoMonth = row.value.autoMonth;
                            localStorage.setItem('escalaInvertidaByGroup', JSON.stringify(escalaInvertidaByGroup));
                        }
                        break;
                    case 'adminUsers':
                        if (Array.isArray(row.value) && row.value.length) {
                            SiteAuth.admins = row.value;
                            localStorage.setItem('adminUsers', JSON.stringify(SiteAuth.admins));
                        }
                        break;
                    case 'reciclagemTemplates':
                        if (reciclagemEnabled) {
                            localStorage.setItem('reciclagemTemplates', JSON.stringify(row.value || []));
                        }
                        break;
                    case 'reciclagemOverrides':
                        if (reciclagemEnabled) {
                            localStorage.setItem('reciclagemOverrides', JSON.stringify(row.value || {}));
                        }
                        break;
                    case 'reciclagemHistory':
                        if (reciclagemEnabled) {
                            localStorage.setItem('reciclagemHistory', JSON.stringify(row.value || []));
                        }
                        break;
                    case 'reciclagemNotes':
                        if (reciclagemEnabled) {
                            localStorage.setItem('reciclagemNotes', JSON.stringify(row.value || {}));
                        }
                        break;
                    case 'supervisaoMenu':
                        localStorage.setItem('supervisaoMenu', JSON.stringify(row.value || []));
                        break;
                    case 'supervisaoHistory':
                        localStorage.setItem('supervisaoHistory', JSON.stringify(row.value || []));
                        break;
                    case 'localCollaborators':
                        localStorage.setItem('localCollaborators', JSON.stringify(row.value || []));
                        break;
                    case 'preRegisteredEmails':
                        preRegisteredEmails = row.value || [];
                        localStorage.setItem('preRegisteredEmails', JSON.stringify(preRegisteredEmails));
                        break;
                }
            } catch {}
        }
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'load-all-settings' }, { silent: true });
    }
}

async function _syncFtLaunches() {
    if (!supabaseClient) return;
    const rows = (ftLaunches || []).map(_ftLaunchToRow);
    if (!rows.length) return;
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.ft_launches)
        .upsert(rows, { onConflict: 'id' });
    if (error) {
        AppErrorHandler.capture(error, { scope: 'sync-ft-launches' }, { silent: true });
    }
}

async function _syncFtAuditTrail() {
    if (!supabaseClient) return;
    const rows = (ftAuditTrail || []).slice(0, 50).map(_ftAuditToRow);
    if (!rows.length) return;
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.ft_audit_trail)
        .upsert(rows, { onConflict: 'id' });
    if (error) {
        AppErrorHandler.capture(error, { scope: 'sync-ft-audit' }, { silent: true });
    }
}

async function _syncAvisos() {
    if (!supabaseClient) return;
    const rows = (avisos || []).map(_avisoToRow);
    if (!rows.length) return;
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.avisos)
        .upsert(rows, { onConflict: 'id' });
    if (error) {
        AppErrorHandler.capture(error, { scope: 'sync-avisos' }, { silent: true });
    }
}

async function _syncChangeHistory() {
    if (!supabaseClient) return;
    // Only sync the latest 5 entries to avoid massive writes
    const recent = (changeHistory || []).slice(0, 5);
    if (!recent.length) return;
    const rows = recent.map(_changeHistoryToRow);
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.change_history)
        .insert(rows);
    if (error) {
        // Ignore duplicate key errors (already synced)
        if (!String(error.message || '').includes('duplicate')) {
            AppErrorHandler.capture(error, { scope: 'sync-change-history' }, { silent: true });
        }
    }
}

// ── Load from Supabase (primary source) ──

async function loadFtLaunchesFromSupabase() {
    if (!supabaseClient) return false;
    try {
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;
        while (true) {
            const { data, error } = await supabaseClient
                .from(SUPABASE_TABLES.ft_launches)
                .select('*')
                .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            allRows = allRows.concat(data || []);
            if (!data || data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
        if (allRows.length) {
            ftLaunches = allRows.map(_rowToFtLaunch);
            ftLaunches = normalizeFtLaunchEntries(ftLaunches);
            localStorage.setItem('ftLaunches', JSON.stringify(ftLaunches));
            return true;
        }
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'load-ft-supabase' }, { silent: true });
    }
    return false;
}

async function loadAvisosFromSupabase() {
    if (!isDashboardFeatureEnabled('avisos')) return false;
    if (!supabaseClient) return false;
    try {
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;
        while (true) {
            const { data, error } = await supabaseClient
                .from(SUPABASE_TABLES.avisos)
                .select('*')
                .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            allRows = allRows.concat(data || []);
            if (!data || data.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
        if (allRows.length) {
            avisos = allRows.map(_rowToAviso);
            localStorage.setItem('avisos', JSON.stringify(avisos));
            return true;
        }
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'load-avisos-supabase' }, { silent: true });
    }
    return false;
}

async function loadFtAuditFromSupabase() {
    if (!supabaseClient) return false;
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.ft_audit_trail)
            .select('*')
            .order('ts', { ascending: false })
            .limit(FT_AUDIT_MAX_ITEMS);
        if (error) throw error;
        if (data && data.length) {
            ftAuditTrail = data.map(_rowToFtAudit);
            ftAuditTrail = normalizeFtAuditTrail(ftAuditTrail);
            localStorage.setItem('ftAuditTrail', JSON.stringify(ftAuditTrail));
            return true;
        }
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'load-ft-audit-supabase' }, { silent: true });
    }
    return false;
}

async function loadChangeHistoryFromSupabase() {
    if (!supabaseClient) return false;
    try {
        const { data, error } = await supabaseClient
            .from(SUPABASE_TABLES.change_history)
            .select('*')
            .order('created_at', { ascending: false })
            .limit(200);
        if (error) throw error;
        if (data && data.length) {
            changeHistory = data.map(_rowToChangeHistory);
            localStorage.setItem('changeHistory', JSON.stringify(changeHistory));
            return true;
        }
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'load-history-supabase' }, { silent: true });
    }
    return false;
}

// ── Realtime Subscriptions ──

let _realtimeChannel = null;

function _setupRealtimeSubscriptions() {
    if (!supabaseClient) return;
    _cleanupRealtimeSubscriptions();
    try {
        let channel = supabaseClient
            .channel('dunamis-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.colaboradores }, () => {
                invalidateCollaboratorsCache();
                fetchSupabaseCollaborators(true).then(data => {
                    if (Array.isArray(data)) {
                        currentData = data;
                        realizarBusca();
                        if (currentTab === 'busca-beta') renderQuickBetaSearch();
                        if (currentTab === 'formalizador') renderFormalizador();
                        renderizarUnidades();
                    }
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.unidades }, () => {
                supaUnitsCache = { items: null, updatedAt: 0 };
                fetchSupabaseUnits(true).then(() => {
                    renderizarUnidades();
                    if (currentTab === 'busca-beta') renderQuickBetaSearch();
                    if (currentTab === 'formalizador') renderFormalizador();
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.ft_launches }, () => {
                loadFtLaunchesFromSupabase().then(loaded => {
                    if (loaded) updateLancamentosUI();
                });
            });
        if (isDashboardFeatureEnabled('avisos')) {
            channel = channel.on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.avisos }, () => {
                loadAvisosFromSupabase().then(loaded => {
                    if (loaded) updateAvisosUI();
                });
            });
        }
        _realtimeChannel = channel
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.app_settings }, () => {
                _loadAllAppSettings();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.formalizacoes_postos }, () => {
                fetchFormalizacoes(true).then(() => {
                    if (currentTab === 'formalizador') renderFormalizador();
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: SUPABASE_TABLES.formalizacoes_status_events }, () => {
                fetchFormalizacaoEvents(true).then(() => {
                    if (currentTab === 'formalizador') renderFormalizador();
                });
            })
            .subscribe();
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'realtime-setup' }, { silent: true });
    }
}

function _cleanupRealtimeSubscriptions() {
    if (_realtimeChannel && supabaseClient) {
        try {
            supabaseClient.removeChannel(_realtimeChannel);
        } catch {}
        _realtimeChannel = null;
    }
}

function getDailySnapshotKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function buildSafetySnapshotState() {
    return {
        capturedAt: new Date().toISOString(),
        group: currentGroup || 'todos',
        collaboratorEdits: collaboratorEdits || {},
        unitMetadata: unitMetadata || {},
        changeHistory: changeHistory || [],
        avisos: avisos || [],
        ftLaunches: ftLaunches || [],
        ftAuditTrail: ftAuditTrail || [],
        trocaLaunches: trocaLaunches || [],
        currentData: currentData || []
    };
}

function saveDailyLocalSnapshot(snapshotKey) {
    const storageKey = 'dailySafetySnapshots';
    const keepDays = 20;
    const bucket = (() => {
        try {
            const raw = localStorage.getItem(storageKey);
            return raw ? JSON.parse(raw) || {} : {};
        } catch {
            return {};
        }
    })();
    bucket[snapshotKey] = buildSafetySnapshotState();
    const keys = Object.keys(bucket).sort();
    while (keys.length > keepDays) {
        const oldest = keys.shift();
        if (oldest) delete bucket[oldest];
    }
    localStorage.setItem(storageKey, JSON.stringify(bucket));
}

async function runDailySafetySnapshot(options = {}) {
    const force = !!options.force;
    const notify = !!options.notify || force;
    if (dailySnapshotInProgress) return false;
    const todayKey = getDailySnapshotKey(new Date());
    const markerKey = 'dailySafetySnapshot:last';
    if (!force && localStorage.getItem(markerKey) === todayKey) return false;
    if (!currentData?.length && !ftLaunches.length && !trocaLaunches.length) return false;

    dailySnapshotInProgress = true;
    try {
        saveDailyLocalSnapshot(todayKey);
        localStorage.setItem(markerKey, todayKey);
        if (notify) {
            showToast(`Snapshot diário criado (${todayKey}).`, 'success');
        }
        return true;
    } finally {
        dailySnapshotInProgress = false;
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
        saveAdmins(true);
        return;
    }

    SiteAuth.admins = [
        { hash: btoa('7164:0547'), name: 'GUSTAVO CORTES BRAGA', re: '7164', role: 'master', master: true },
        { hash: btoa('4648:4643'), name: 'MOISÉS PEREIRA FERNANDES', re: '4648', role: 'admin' },
        { hash: btoa('3935:1288'), name: 'WAGNER MONTEIRO', re: '3935', role: 'admin' }
    ];

    saveAdmins(true);
}

function saveAdmins(silent = false) {
    localStorage.setItem('adminUsers', JSON.stringify(SiteAuth.admins));
    scheduleLocalSync('admin-users', { silent, notify: !silent });
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
    details: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
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
    mapPin: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-6-5.686-6-11a6 6 0 1 1 12 0c0 5.314-6 11-6 11z"></path><circle cx="12" cy="10" r="2.5"></circle></svg>`,
    arrowUp: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="19" x2="12" y2="5"></line><polyline points="5 12 12 5 19 12"></polyline></svg>`,
    crown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7l4 4 4-6 4 6 4-4 4 5-2 8H4l-2-8z"></path><path d="M5 20h14"></path></svg>`,
    bell: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5"/><path d="M9.5 17a2.5 2.5 0 0 0 5 0"/></svg>`,
    launch: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h9a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H9"></path><path d="M6 12H4a2 2 0 0 0-2 2v5"></path><rect x="2" y="3" width="7" height="10" rx="1"></rect><path d="M5 7h2"></path><path d="M5 10h2"></path></svg>`,
    recycle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 6v6h-6"></path><path d="M3 18v-6h6"></path><path d="M20 9a8 8 0 0 0-14.4-3.6L3 8"></path><path d="M4 15a8 8 0 0 0 14.4 3.6L21 16"></path></svg>`,
    performance: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="20" x2="20" y2="20"></line><rect x="6" y="11" width="3" height="6" rx="1"></rect><rect x="11" y="8" width="3" height="9" rx="1"></rect><rect x="16" y="5" width="3" height="12" rx="1"></rect></svg>`,
    whatsapp: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>`,
    phone: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>`,
    shield: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    starFilled: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14l-5-4.87 6.91-1.01L12 2z"></path></svg>`
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

const SUPERVISAO_CATEGORIES = {
    internal: {
        label: 'Supervisão (interno)',
        badge: 'Interno',
        description: 'Links de uso interno da supervisão.'
    },
    colab: {
        label: 'Para colaboradores',
        badge: 'Colaboradores',
        description: 'Links e mensagens para encaminhar aos colaboradores.'
    },
    guide: {
        label: 'Guias e tutoriais',
        badge: 'Guia',
        description: 'Passo a passo e orientações rápidas.'
    }
};

const SUPERVISAO_DEFAULT_MENU = {
    meta: {
        version: 1,
        updatedAt: null,
        updatedBy: 'Sistema'
    },
    items: [
        {
            id: 'sup_abertura_vagas',
            category: 'internal',
            type: 'link',
            title: 'Abertura de vagas',
            description: 'Solicitação de abertura de vagas (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/9919638656'
        },
        {
            id: 'sup_aso',
            category: 'internal',
            type: 'link',
            title: 'ASO',
            description: 'Solicitações de ASO (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/8482734576'
        },
        {
            id: 'sup_uniforme',
            category: 'internal',
            type: 'link',
            title: 'Pedido de uniforme (patrimonial)',
            description: 'Solicitação de uniforme (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/9918758426'
        },
        {
            id: 'sup_ferias',
            category: 'internal',
            type: 'link',
            title: 'Programação de férias',
            description: 'Planejamento e programação de férias (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/9919803699'
        },
        {
            id: 'sup_permuta',
            category: 'internal',
            type: 'link',
            title: 'Permuta',
            description: 'Solicitações de permuta (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/9919342909'
        },
        {
            id: 'sup_reclamacao_salarial',
            category: 'internal',
            type: 'link',
            title: 'Reclamação salarial',
            description: 'Registro interno de reclamações salariais (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/8625263513'
        },
        {
            id: 'sup_vt',
            category: 'internal',
            type: 'link',
            title: 'Solicitação de VT',
            description: 'Solicitações de vale-transporte (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/boards/8482137289'
        },
        {
            id: 'sup_visita_diaria',
            category: 'internal',
            type: 'link',
            title: 'Visita diária',
            description: 'Workspace de visita diária (Monday).',
            link: 'https://grupodunamiscoorp.monday.com/workspaces/9709048'
        },
        {
            id: 'colab_vt',
            category: 'colab',
            type: 'message',
            title: 'VT – Aderir ou Cancelar',
            description: 'Solicitação ou cancelamento do vale-transporte.',
            emailTo: 'dp@grupodunamis.com.br',
            emailSubject: 'Solicitação/Cancelamento de VT',
            channels: {
                whatsapp: `📩 VT – Aderir ou Cancelar\n\nOlá! Para aderir ou cancelar o Vale-Transporte, siga os passos abaixo:\n\n1) Solicite o formulário "Solicitação de VT" com o DP.\n2) Preencha todas as informações e marque a opção desejada:\n- Opto pela utilização do Vale-Transporte (aderir)\n- NÃO opto pela utilização do Vale-Transporte (cancelar)\n\nApós o preenchimento, envie para:\n📧 dp@grupodunamis.com.br\n\nNo corpo do e-mail, informe:\nNome:\nRE:\nUnidade:\n\nAtenciosamente,\nGrupo Dunamis`,
                email: `Prezados(as),\n\nPara aderir ou cancelar o Vale-Transporte, siga as instruções abaixo:\n\n1) Solicite o formulário "Solicitação de VT" com o DP.\n2) Preencha todas as informações e assinale a opção desejada:\n- Opto pela utilização do Vale-Transporte (aderir)\n- NÃO opto pela utilização do Vale-Transporte (cancelar)\n\nApós o preenchimento, envie para dp@grupodunamis.com.br informando:\nNome completo:\nRE:\nUnidade:\n\nAtenciosamente,\nGrupo Dunamis`
            }
        },
        {
            id: 'colab_ferias',
            category: 'colab',
            type: 'message',
            title: 'Programação de férias',
            description: 'Formulário de férias para colaboradores.',
            link: 'https://wkf.ms/4n1kC8T',
            message: `Prezados(as),\n\nPedimos que preencham o link de ferias abaixo:\nhttps://wkf.ms/4n1kC8T\n\nFavor assinar o recibo e enviar em PDF.\n\nAtenciosamente,\nGrupo Dunamis`
        },
        {
            id: 'colab_cracha',
            category: 'colab',
            type: 'message',
            title: 'Crachá com código de barras',
            description: 'Solicitação de crachá com código de barras.',
            link: 'https://wkf.ms/4eO1dW0',
            message: `Prezados(as),\n\nPara solicitar o cracha com codigo de barras, preencha o link abaixo:\nhttps://wkf.ms/4eO1dW0\n\nAs informacoes serao analisadas e, apos a confeccao, o cracha sera entregue no posto em ate 30 dias.\nObs.: a solicitacao deve ser feita apos o termino do periodo de experiencia (90 dias).\n\nAtenciosamente,\nGrupo Dunamis`
        },
        {
            id: 'colab_reclamacao_salarial',
            category: 'colab',
            type: 'message',
            title: 'Reclamação salarial',
            description: 'Formulário de revisão salarial.',
            link: 'https://wkf.ms/4hcdd3n',
            message: `Ola, tudo bem?\n\nPedimos que os questionamentos sobre revisao salarial sejam enviados pelo formulario abaixo:\nhttps://wkf.ms/4hcdd3n\n\nAs informacoes serao analisadas pela Coordenacao e retornaremos em breve.\n\nAtenciosamente,\nGrupo Dunamis`
        },
        {
            id: 'colab_holerite',
            category: 'colab',
            type: 'message',
            title: 'Cadastro de holerites',
            description: 'Instruções para cadastro do holerite.',
            emailTo: 'denize@grupodunamis.com.br',
            emailCc: 'cassia@grupodunamis.com.br',
            emailSubject: 'Cadastro de holerite',
            channels: {
                whatsapp: `Para cadastro do holerite:\n\nEnvie um e-mail com:\nNome completo:\nRE:\nE-mail para cadastro:\n\nPara: denize@grupodunamis.com.br\nCc: cassia@grupodunamis.com.br\n\nVocê receberá um link para baixar o app e cadastrar uma senha.\nSe já enviou e-mail anteriormente, favor reenviar.`,
                email: `Prezados(as),\n\nSolicito o cadastro do holerite com as informações abaixo:\n\nNome completo:\nRE:\nE-mail para cadastro:\n\nAtenciosamente,\n`
            }
        },
        {
            id: 'colab_ft',
            category: 'colab',
            type: 'message',
            title: 'Solicitação de FT',
            description: 'Formulário para solicitação de FT.',
            link: 'https://forms.gle/UKrZnFqFWYU4risGA',
            message: `Solicitacao de FT\n\nPara solicitar FT, preencha o formulario:\nhttps://forms.gle/UKrZnFqFWYU4risGA`
        },
        {
            id: 'colab_curriculo',
            category: 'colab',
            type: 'message',
            title: 'Envio de currículo (vídeo)',
            description: 'Envio de vídeo currículo.',
            link: 'https://wkf.ms/3YqtzPm',
            links: [
                { label: 'Exemplo de vídeo', url: 'https://youtube.com/shorts/9k_3tj4_hVE?feature=share' }
            ],
            message: `Ola!\n\nPor gentileza, envie um video curriculo pelo link:\nhttps://wkf.ms/3YqtzPm\n\nTempo maximo: 2 minutos.\n\nExemplo de apresentacao:\nhttps://youtube.com/shorts/9k_3tj4_hVE?feature=share\n\nBoa sorte!`
        },
        {
            id: 'colab_troca_folga',
            category: 'colab',
            type: 'message',
            title: 'Troca de folga',
            description: 'Formulário para troca de folga.',
            link: 'https://forms.gle/tWXgUt6koiZTXvEP7',
            message: `Solicitacao de troca de folga\n\nPreencha o formulario:\nhttps://forms.gle/tWXgUt6koiZTXvEP7`
        },
        {
            id: 'colab_exercicio_tecnico_fev_2026',
            category: 'colab',
            type: 'message',
            title: 'Exercício técnico – Fevereiro/2026',
            description: 'Avaliação mensal de fevereiro.',
            link: 'https://forms.gle/ekp5worSjxvmt6NSA',
            message: `Exercicio tecnico - Fevereiro/2026\n\nSegue o link para a avaliacao deste mes:\nhttps://forms.gle/ekp5worSjxvmt6NSA\n\nBoa sorte!\nCoordenacao Dunamis`
        },
    ]
};

// Elementos DOM
const gateway = document.getElementById('gateway');
const appContainer = document.getElementById('app-container');
const appTitle = document.getElementById('app-title');
const APP_VERSION = 'v4';
const contentArea = document.getElementById('content-area');
const AppBootstrapper = {
    booted: false,
    _runStep(name, fn) {
        try {
            const result = fn();
            if (result && typeof result.then === 'function') {
                result.catch((err) => {
                    AppErrorHandler.capture(err, { scope: `bootstrap:${name}` }, { silent: true });
                });
            }
        } catch (err) {
            AppErrorHandler.capture(err, { scope: `bootstrap:${name}` }, { silent: true });
        }
    },
    boot() {
        if (this.booted) return;
        this.booted = true;

        this._runStep('core', () => {
            bindAppLifecycle();
            initializeCoreManagers();
            AppLogger.info('App boot', { version: APP_VERSION });
            if (localStorage.getItem('compactMode') === '1') {
                document.body.classList.add('compact-mode');
            }
            localStorage.setItem('aiSearchEnabled', '0');
            localStorage.setItem('substituteSearchEnabled', '0');
            try {
                const storedProx = localStorage.getItem('substituteProximityMode');
                if (storedProx === 'off' || storedProx === 'posto' || storedProx === 'endereco' || storedProx === 'rota') {
                    substituteProximityMode = storedProx;
                }
            } catch {}
        });

        this._runStep('local-state', () => {
            loadLocalState();
            hydrateManagedCachesFromLegacy();
            loadFtAuditTrail();
            loadFtLaunches();
            refreshFtLabelsForToday();
            if (isDashboardFeatureEnabled('avisos')) {
                loadAvisos();
            }
            if (isDashboardFeatureEnabled('lancamentos')) {
                loadFtReasons();
            }
            if (isDashboardFeatureEnabled('reciclagem')) {
                loadReciclagemTemplates();
                loadReciclagemOverrides();
                loadReciclagemHistory();
                loadReciclagemNotes();
            }
            loadSupervisaoMenu();
            loadSupervisaoHistory();
            loadSupervisaoFavorites();
            loadSupervisaoUsage();
            loadSupervisaoChannelPrefs();
        });

        this._runStep('monitors', () => {
            startAutoEscalaMonitor();
            if (isDashboardFeatureEnabled('avisos')) {
                startReminderMonitor();
            }
        });

        this._runStep('resources', () => {
            loadUnitAddressDb();
            loadCollaboratorAddressDb();
        });

        this._runStep('auth', () => {
            if (CONFIG?.auth?.requireLogin) {
                initSupabaseAuth();
                return;
            }
            enablePublicAccessMode();
        });

        this._runStep('ui', () => {
            document.body.classList.add('on-gateway');
            renderGateway();
            document.getElementById('context-help-panel')?.remove();
            ensureCommandPalette();
            bindModalA11y();
            bindGlobalShortcuts();
            initSmartTooltips();
            registerPwaSupport();
            updateMenuStatus();
            updateLastUpdatedDisplay();
        });
    }
};
if (typeof window !== 'undefined') {
    window.AppBootstrapper = AppBootstrapper;
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    AppBootstrapper.boot();
    bindAppNavigation();
    setTimeout(() => {
        restoreAppNavigationOnBoot();
    }, 0);
});

function registerPwaSupport() {
    if (!('serviceWorker' in navigator)) return;
    const isSecure = window.location.protocol === 'https:' || window.location.hostname === 'localhost';
    if (!isSecure) return;
    navigator.serviceWorker.register('./sw.js').catch(() => {});
}

function openTabFromCommand(tabName, afterOpen) {
    const finalize = () => {
        switchTab(tabName);
        if (typeof afterOpen === 'function') afterOpen();
    };
    const targetGroup = currentGroup || 'todos';
    const needsBoot = appContainer.style.display === 'none' || !document.getElementById(`tab-content-${tabName}`);
    if (needsBoot) {
        loadGroup(targetGroup).then(finalize).catch(() => {});
        return;
    }
    finalize();
}

function getCommandPaletteCommands() {
    const commands = [];
    const push = (label, keywords, action) => commands.push({ label, keywords, action });
    push('Abrir Busca Rápida', 'busca pesquisar colaborador', () => openTabFromCommand('busca'));
    push('Abrir Busca Rápida Beta', 'busca beta disponibilidade plantao folga colaborador', () => openTabFromCommand('busca-beta'));
    push('Abrir Formalizador', 'formalizador protocolo remanejamento desligamento troca posto beneficios cobertura', () => openTabFromCommand('formalizador'));
    push('Abrir Unidades', 'unidades postos', () => openTabFromCommand('unidades'));
    push('Abrir Configuração', 'configuracao settings', () => openTabFromCommand('config'));
    push('Abrir Supervisão', 'supervisao menu links', () => openSupervisaoPage());
    push('Abrir Gerência', 'gerencia placeholder', () => openGerenciaPage());
    push('Voltar para Página Inicial', 'inicio home gateway', () => resetToGateway());
    push('Criar Snapshot Diário Agora', 'snapshot backup restore', () => runDailySafetySnapshot({ force: true }));
    return commands;
}

function renderCommandPaletteList(term = '') {
    const listEl = document.getElementById('command-palette-list');
    if (!listEl) return;
    const query = normalizeText(term || '');
    const commands = getCommandPaletteCommands();
    const filtered = commands.filter(cmd => {
        const bag = normalizeText(`${cmd.label} ${cmd.keywords}`);
        return !query || bag.includes(query);
    });
    commandPaletteState.filtered = filtered;
    if (commandPaletteState.activeIndex >= filtered.length) {
        commandPaletteState.activeIndex = Math.max(filtered.length - 1, 0);
    }
    if (!filtered.length) {
        listEl.innerHTML = `<div class="command-item empty">Nenhum comando encontrado.</div>`;
        return;
    }
    listEl.innerHTML = filtered.map((cmd, idx) => `
        <button class="command-item ${idx === commandPaletteState.activeIndex ? 'active' : ''}" data-command-idx="${idx}" type="button">
            <span>${cmd.label}</span>
        </button>
    `).join('');
}

function closeCommandPalette() {
    const palette = document.getElementById('command-palette');
    if (!palette) return;
    palette.classList.add('hidden');
    commandPaletteState.open = false;
}

function executeCommandPaletteSelection() {
    const cmd = commandPaletteState.filtered?.[commandPaletteState.activeIndex];
    if (!cmd) return;
    closeCommandPalette();
    cmd.action();
}

function openCommandPalette() {
    const palette = document.getElementById('command-palette');
    const input = document.getElementById('command-palette-input');
    if (!palette || !input) return;
    palette.classList.remove('hidden');
    commandPaletteState.open = true;
    commandPaletteState.activeIndex = 0;
    input.value = '';
    renderCommandPaletteList('');
    setTimeout(() => input.focus(), 0);
}

function ensureCommandPalette() {
    if (document.getElementById('command-palette')) return;
    const el = document.createElement('div');
    el.id = 'command-palette';
    el.className = 'command-palette hidden';
    el.innerHTML = `
        <div class="command-backdrop" data-close="1"></div>
        <div class="command-dialog" role="dialog" aria-modal="true" aria-label="Modo comando">
            <div class="command-header">
                <strong>Modo Comando</strong>
                <span>Ctrl+K</span>
            </div>
            <input id="command-palette-input" class="search-input" type="text" placeholder="Digite um comando...">
            <div id="command-palette-list" class="command-list"></div>
        </div>
    `;
    document.body.appendChild(el);

    el.addEventListener('click', (ev) => {
        const target = ev.target;
        if (!(target instanceof HTMLElement)) return;
        if (target.dataset.close === '1') {
            closeCommandPalette();
            return;
        }
        const button = target.closest('.command-item[data-command-idx]');
        if (!button) return;
        const idx = Number(button.getAttribute('data-command-idx'));
        if (!Number.isFinite(idx)) return;
        commandPaletteState.activeIndex = idx;
        executeCommandPaletteSelection();
    });

    const input = el.querySelector('#command-palette-input');
    if (input) {
        input.addEventListener('input', () => {
            commandPaletteState.activeIndex = 0;
            renderCommandPaletteList(input.value);
        });
        input.addEventListener('keydown', (ev) => {
            const size = commandPaletteState.filtered?.length || 0;
            if (ev.key === 'ArrowDown') {
                ev.preventDefault();
                if (!size) return;
                commandPaletteState.activeIndex = (commandPaletteState.activeIndex + 1) % size;
                renderCommandPaletteList(input.value);
            } else if (ev.key === 'ArrowUp') {
                ev.preventDefault();
                if (!size) return;
                commandPaletteState.activeIndex = (commandPaletteState.activeIndex - 1 + size) % size;
                renderCommandPaletteList(input.value);
            } else if (ev.key === 'Enter') {
                ev.preventDefault();
                executeCommandPaletteSelection();
            } else if (ev.key === 'Escape') {
                ev.preventDefault();
                closeCommandPalette();
            }
        });
    }

    AppEventManager.on(document, 'keydown', (ev) => {
        const isShortcut = (ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'k';
        if (isShortcut) {
            ev.preventDefault();
            if (commandPaletteState.open) {
                closeCommandPalette();
            } else {
                openCommandPalette();
            }
            return;
        }
        if (ev.key === 'Escape' && commandPaletteState.open) {
            ev.preventDefault();
            closeCommandPalette();
        }
    }, false, { scope: 'command-palette', key: 'command-palette-shortcut' });
}

function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    const tag = String(target.tagName || '').toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    return target.isContentEditable === true;
}

function bindGlobalShortcuts() {
    if (globalShortcutsBound) return;
    globalShortcutsBound = true;
    AppEventManager.on(document, 'keydown', (ev) => {
        if (commandPaletteState.open) return;
        const typing = isTypingTarget(ev.target);
        const key = String(ev.key || '');
        // Ctrl/Cmd+K → focus search from anywhere
        if ((ev.ctrlKey || ev.metaKey) && key.toLowerCase() === 'k') {
            ev.preventDefault();
            switchTab('busca');
            const si = document.getElementById('search-input');
            if (si) { si.focus(); si.select(); }
            return;
        }
        // ESC in search input → clear and blur
        if (key === 'Escape' && typing && ev.target.id === 'search-input') {
            ev.preventDefault();
            clearSearchInput();
            ev.target.blur();
            return;
        }
        if (!typing && key === '?') {
            ev.preventDefault();
            openHelpModal();
            return;
        }
        if (!typing && key === '/' && currentTab === 'busca') {
            ev.preventDefault();
            const si2 = document.getElementById('search-input');
            if (si2) { si2.focus(); si2.select(); }
            return;
        }
        if (!typing && key.toLowerCase() === 'f' && currentTab === 'busca') {
            ev.preventDefault();
            toggleSearchAdvanced();
            return;
        }
        if (!typing && key.toLowerCase() === 'p' && ev.altKey) {
            ev.preventDefault();
            printCurrentView();
            return;
        }
    }, false, { scope: 'shortcuts', key: 'shortcuts-global' });
}

// Botão de Scroll Top
window.onscroll = function() {
    const btn = document.getElementById("scroll-top-btn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.classList.add("show");
    } else {
        btn.classList.remove("show");
    }
};

function openSupervisaoPage(options = {}) {
    clearTabScopedTimers('supervisao');
    appContainer.style.display = 'block';
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    closeUtilityDrawer();
    setAppState('currentTab', 'supervisao', { silent: true });
    contentArea.innerHTML = `
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>Página inicial</span>
                <span class="breadcrumb-sep">›</span>
                <span>Supervisão</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Acesso direto</span>
            </div>
        </div>
        ${getSupervisaoShellHtml()}
    `;
    clearContextBar();
    bindSupervisaoEvents();
    renderSupervisao();
    renderSupervisaoAdminList();
    renderSupervisaoHistory();
    updateSupervisaoEditorVisibility();
    updateSupervisaoAdminStatus();
    if (!options.skipRouteSync) {
        syncAppNavigation({ view: 'supervisao', group: '', tab: 'busca' }, { history: options.history || 'push' });
    }
}

async function openGerenciaPage(options = {}) {
    clearTabScopedTimers('gerencia');
    appContainer.style.display = 'block';
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    closeUtilityDrawer();
    setAppState('currentTab', 'gerencia', { silent: true });
    contentArea.innerHTML = `
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>Página inicial</span>
                <span class="breadcrumb-sep">›</span>
                <span>Gerência</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Placeholder</span>
            </div>
        </div>
        <div class="gateway-gerencia-card">
            <strong>Gerência</strong>
            <p>Em breve: painel gerencial.</p>
        </div>
    `;
    clearContextBar();
    if (!options.skipRouteSync) {
        syncAppNavigation({ view: 'gerencia', group: '', tab: 'busca' }, { history: options.history || 'push' });
    }
}

function getGerenciaDataSource() {
    if (gerenciaDataCache && gerenciaDataCache.length) return gerenciaDataCache;
    return currentData || [];
}

function getGerenciaFilteredWorkforce() {
    const source = getGerenciaDataSource();
    if (gerenciaFilter.group && gerenciaFilter.group !== 'all') {
        return source.filter(item => item.grupo === gerenciaFilter.group);
    }
    return source.slice();
}

function getGerenciaFilteredFtItems() {
    const range = normalizeDateRange(gerenciaFilter.from, gerenciaFilter.to);
    return getFtOperationalItems(ftLaunches).filter(item => {
        if (gerenciaFilter.group && gerenciaFilter.group !== 'all' && item?.group && item.group !== gerenciaFilter.group) {
            return false;
        }
        if (!hasDateRangeFilter(range)) return true;
        const key = normalizeFtDateKey(item?.date);
        return isDateInsideRange(key, range.from, range.to);
    });
}

function getGerenciaGroupRows(sourceData) {
    const counts = {};
    (sourceData || []).forEach(item => {
        const key = item?.grupo || 'N/I';
        counts[key] = (counts[key] || 0) + 1;
    });
    return Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label: String(label).toUpperCase(), value }));
}

function buildGerenciaWeekProjectionHtml(groupFilter) {
    const start = normalizeFtDateKey(gerenciaFilter.from) || getTodayKey();
    const sourceItems = getFtOperationalItems(ftLaunches);
    const chips = [];
    for (let i = 0; i < 7; i++) {
        const dayKey = getDateKeyWithOffset(start, i);
        const list = sourceItems.filter(item => {
            if (groupFilter && groupFilter !== 'all' && item?.group && item.group !== groupFilter) return false;
            return normalizeFtDateKey(item?.date) === dayKey;
        });
        const preview = resolveFtPreviewFromItems(list);
        const date = new Date(`${dayKey}T00:00:00`);
        const weekday = Number.isNaN(date.getTime())
            ? dayKey
            : ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'][date.getDay()];
        const css = preview.code === 'V' ? 'v' : (preview.code === 'E' ? 'e' : (preview.code === 'D' ? 'd' : 'none'));
        chips.push(`
            <div class="gerencia-day-chip ${css}" title="${formatFtDate(dayKey)}: ${preview.count ? `${preview.count} FT` : 'Sem FT'}">
                <div class="day">${weekday}</div>
                <div class="code">${preview.code}</div>
                <div class="count">${preview.count || 0}</div>
            </div>
        `);
    }
    return `<div class="gerencia-day-grid">${chips.join('')}</div>`;
}

function setGerenciaDateRangePreset(preset) {
    const today = new Date();
    if (preset === 'today') {
        const value = toDateInputValue(today);
        gerenciaFilter.from = value;
        gerenciaFilter.to = value;
    } else if (preset === '7d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        gerenciaFilter.from = toDateInputValue(start);
        gerenciaFilter.to = toDateInputValue(today);
    } else if (preset === 'next7') {
        const end = new Date(today);
        end.setDate(today.getDate() + 6);
        gerenciaFilter.from = toDateInputValue(today);
        gerenciaFilter.to = toDateInputValue(end);
    } else if (preset === 'clear') {
        gerenciaFilter.from = '';
        gerenciaFilter.to = '';
    }
    renderGerenciaDashboard();
}

function bindGerenciaFilters() {
    const groupSelect = document.getElementById('gerencia-group-filter');
    const dateFrom = document.getElementById('gerencia-date-from');
    const dateTo = document.getElementById('gerencia-date-to');
    if (groupSelect) {
        groupSelect.addEventListener('change', () => {
            gerenciaFilter.group = groupSelect.value || 'all';
            renderGerenciaDashboard();
        });
    }
    if (dateFrom && dateTo) {
        const onDate = () => {
            const normalized = normalizeDateRange(dateFrom.value, dateTo.value);
            gerenciaFilter.from = normalized.from;
            gerenciaFilter.to = normalized.to;
            renderGerenciaDashboard();
        };
        dateFrom.addEventListener('change', onDate);
        dateTo.addEventListener('change', onDate);
    }
}

async function refreshGerenciaDashboard() {
    await openGerenciaPage({ forceReload: true });
}

function renderGerenciaDashboard() {
    const allData = getGerenciaDataSource();
    const workforce = getGerenciaFilteredWorkforce();
    const ftItems = getGerenciaFilteredFtItems();
    const ftStats = buildFtDashboardStats(ftItems);
    const total = workforce.length;
    const plantao = workforce.filter(d => {
        const status = getStatusInfo(d).text;
        return status.includes('PLANTÃO') || status.includes('FT');
    }).length;
    const folga = workforce.filter(d => {
        const status = getStatusInfo(d).text;
        return !status.includes('PLANTÃO') && !status.includes('FT');
    }).length;
    const groupRows = getGerenciaGroupRows(allData).slice(0, 6);
    const byUnit = {};
    workforce.forEach(item => {
        const key = item?.posto || 'N/I';
        byUnit[key] = (byUnit[key] || 0) + 1;
    });
    const topUnitsWorkforce = Object.entries(byUnit)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([label, value]) => ({ label, value }));
    const pendingUnits = ftStats.topPendingUnits || [];
    const optionGroups = getGerenciaGroupRows(allData).filter(g => g.label !== 'N/I');
    const groupOptions = ['<option value="all">Todos os grupos</option>']
        .concat(optionGroups.map(g => {
            const value = g.label.toLowerCase();
            return `<option value="${value}" ${gerenciaFilter.group === value ? 'selected' : ''}>${g.label}</option>`;
        }));
    const rangeLabel = hasDateRangeFilter(gerenciaFilter)
        ? `${gerenciaFilter.from || '...'} até ${gerenciaFilter.to || '...'}`
        : 'Sem recorte de data';
    contentArea.innerHTML = `
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span>Página inicial</span>
                <span class="breadcrumb-sep">›</span>
                <span>Gerência</span>
            </div>
            <div class="breadcrumb-meta">
                <span class="breadcrumb-updated">Recorte: ${rangeLabel}</span>
            </div>
        </div>
        <section class="gerencia-shell">
            <div class="gerencia-header">
                <h3>Central Gerencial de Coberturas</h3>
                <p>Indicadores consolidados para decisões rápidas de escala, risco e produtividade.</p>
            </div>
            <div class="gerencia-filters">
                <select id="gerencia-group-filter" class="filter-select">${groupOptions.join('')}</select>
                <input type="date" id="gerencia-date-from" value="${gerenciaFilter.from || ''}">
                <input type="date" id="gerencia-date-to" value="${gerenciaFilter.to || ''}">
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('today')">Hoje</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('7d')">Últ. 7 dias</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('next7')">Próx. 7 dias</button>
                <button class="filter-chip" onclick="setGerenciaDateRangePreset('clear')">Limpar datas</button>
                <button class="btn btn-secondary btn-small" onclick="refreshGerenciaDashboard()">Atualizar números</button>
            </div>
            <div class="lancamentos-kpi gerencia-kpi">
                <div class="kpi-card"><div class="kpi-label">Efetivo filtrado</div><div class="kpi-value">${total}</div><div class="kpi-sub">Colaboradores no recorte</div></div>
                <div class="kpi-card"><div class="kpi-label">Plantão hoje</div><div class="kpi-value">${plantao}</div><div class="kpi-sub">Status operacional atual</div></div>
                <div class="kpi-card"><div class="kpi-label">Folga hoje</div><div class="kpi-value">${folga}</div><div class="kpi-sub">Reserva potencial</div></div>
                <div class="kpi-card"><div class="kpi-label">FT no período</div><div class="kpi-value">${ftStats.total}</div><div class="kpi-sub">Todas as solicitações</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendências FT</div><div class="kpi-value">${ftStats.pending}</div><div class="kpi-sub">Aguardando lançamento</div></div>
                <div class="kpi-card"><div class="kpi-label">Taxa de lançamento</div><div class="kpi-value">${ftStats.launchRate}%</div><div class="kpi-sub">Eficiência de lançamento</div></div>
            </div>
            <div class="lancamentos-report-grid gerencia-grid">
                <div class="report-card">
                    <div class="report-title">Efetivo por Grupo</div>
                    <div class="report-list">${buildReportRows(groupRows)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Unidades com maior efetivo</div>
                    <div class="report-list">${buildReportRows(topUnitsWorkforce)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">FT por Unidade</div>
                    <div class="report-list">${buildReportRows(ftStats.topUnits || [])}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Pendências por Unidade</div>
                    <div class="report-list">${buildReportRows(pendingUnits)}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Motivos de FT</div>
                    <div class="report-list">${buildReportRows(ftStats.topReasons || [])}</div>
                </div>
                <div class="report-card">
                    <div class="report-title">Radar próximos 7 dias (V/E/D)</div>
                    <div class="report-list">
                        ${buildGerenciaWeekProjectionHtml(gerenciaFilter.group)}
                    </div>
                </div>
            </div>
        </section>
    `;
    bindGerenciaFilters();
    updateLastUpdatedDisplay();
    clearContextBar();
}

function toggleEditModeFromSupervisao() {
    toggleEditMode();
    updateSupervisaoAdminStatus();
    renderSupervisaoAdminList();
    renderSupervisaoHistory();
}

async function openSupervisaoUnitEditor() {
    if (SiteAuth.mode !== 'edit') {
        showToast("Ative o modo edição para alterar unidades.", "error");
        return;
    }
    const input = document.getElementById('supervisao-unit-input');
    const raw = input?.value.trim();
    if (!raw) {
        showToast("Informe a unidade para editar.", "error");
        return;
    }
    const matched = findUnitByName(raw) || raw.toUpperCase();
    if (!currentData || currentData.length === 0) {
        await loadGroup('todos');
    } else {
        renderDashboard();
    }
    switchTab('unidades');
    openEditUnitModal(matched);
}

function updateSupervisaoAdminStatus() {
    const userEl = document.getElementById('supervisao-admin-user');
    const roleEl = document.getElementById('supervisao-admin-role');
    const modeEl = document.getElementById('supervisao-admin-mode');
    if (!userEl || !roleEl || !modeEl) return;
    if (!SiteAuth.logged) {
        userEl.textContent = '—';
        roleEl.textContent = '—';
        modeEl.textContent = 'VISUALIZAÇÃO';
        modeEl.className = 'status-badge-menu view';
        return;
    }
    const roleLabel = ROLE_LABELS[SiteAuth.role] || 'Usuário';
    const modeLabel = SiteAuth.mode === 'edit' ? 'EDIÇÃO' : 'VISUALIZAÇÃO';
    userEl.textContent = isPublicAccessMode() ? 'Base liberada' : (SiteAuth.user || 'Admin');
    roleEl.textContent = isPublicAccessMode() ? 'TOTAL' : roleLabel.toUpperCase();
    modeEl.textContent = modeLabel;
    modeEl.className = `status-badge-menu ${SiteAuth.mode === 'edit' ? 'edit' : 'view'}`;
}

function getSupervisaoAdminHtml() {
    const logged = SiteAuth.logged;
    const isAdmin = isAdminRole();
    const canEdit = canEditSupervisao();
    const publicMode = isPublicAccessMode();
    return `
        <details class="supervisao-admin-panel">
            <summary>Menu de edição</summary>
            <div class="supervisao-admin-body">
                ${!logged ? `
                    <div class="supervisao-admin-login">
                        <div class="field-row">
                            <label>E-mail</label>
                            <input type="email" id="supervisao-login-email" placeholder="seu@email.com">
                        </div>
                        <div class="field-row">
                            <label>Senha</label>
                            <input type="password" id="supervisao-login-password" placeholder="••••••••">
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
                ` : `
                    <div class="supervisao-admin-status">
                        <div><span>Base</span><strong id="supervisao-admin-user">—</strong></div>
                        <div><span>Permissão</span><strong id="supervisao-admin-role">—</strong></div>
                        <div><span>Modo</span><strong id="supervisao-admin-mode" class="status-badge-menu view">VISUALIZAÇÃO</strong></div>
                    </div>
                    <div class="supervisao-admin-actions">
                        <button class="btn btn-secondary btn-small" onclick="toggleEditModeFromSupervisao()">Alternar modo</button>
                        ${publicMode ? '' : `<button class="btn btn-secondary btn-small" onclick="logoutSite({ target: 'supervisao' })">Sair</button>`}
                    </div>
                    ${!canEdit ? `<div class="hint">Para editar, ative o modo edição.</div>` : ''}
                    ${logged && !isAdmin ? `<div class="hint">Seu perfil não permite editar o menu de Supervisão.</div>` : ''}
                `}

                ${logged && isAdmin ? `
                    <div class="supervisao-admin-grid">
                        <div class="supervisao-admin-section-title">Conteúdo do menu</div>
                        <div class="supervisao-admin-card tone-primary">
                            <div class="supervisao-admin-card-header">
                                <strong>Editor principal</strong>
                            </div>
                            <div class="hint">Crie ou atualize links e mensagens principais.</div>
                            <input type="hidden" id="supervisao-editor-id">
                            <div class="field-row">
                                <label>Seção</label>
                                <select id="supervisao-editor-category">
                                    <option value="internal">Supervisão (interno)</option>
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
                                <label>Título</label>
                                <input type="text" id="supervisao-editor-title" placeholder="Ex: Programação de férias">
                            </div>
                            <div class="field-row">
                                <label>Descrição</label>
                                <input type="text" id="supervisao-editor-description" placeholder="Resumo curto do item">
                            </div>
                            <div class="field-row">
                                <label>Link principal (opcional)</label>
                                <input type="text" id="supervisao-editor-link" placeholder="https://...">
                            </div>
                            <div class="field-row">
                                <label>Links extras (um por linha: Rótulo | URL)</label>
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
                            <div class="hint">Organize rapidamente tudo que está publicado.</div>
                            <div id="supervisao-admin-list" class="supervisao-admin-list"></div>
                        </div>

                        <div class="supervisao-admin-section-title">Operação e histórico</div>
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
                                <button class="btn btn-secondary btn-small" onclick="openSupervisaoUnitEditor()">Abrir edição da unidade</button>
                            </div>
                            <div class="hint">A edição abrirá na tela de Unidades (base geral).</div>
                        </div>

                        <div class="supervisao-admin-card tone-green">
                            <div class="supervisao-admin-card-header">
                                <strong>Histórico</strong>
                            </div>
                            <div id="supervisao-history-list" class="supervisao-history-list"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        </details>
    `;
}

function getSupervisaoShellHtml() {
    return `
        <div class="supervisao-shell">
            <div class="supervisao-header">
                <div>
                    <h3>Supervisão</h3>
                    <p>Links internos e mensagens prontas para enviar aos colaboradores.</p>
                </div>
                <div id="supervisao-updated" class="supervisao-meta"></div>
            </div>
            <div class="supervisao-toolbar">
                <input type="text" id="supervisao-search" class="search-input" placeholder="Buscar link ou mensagem...">
                <div class="supervisao-switch">
                    <div class="supervisao-switch-label">Público principal</div>
                    <div class="supervisao-switch-group">
                        <button class="switch-btn" data-supervisao-filter="internal">Supervisão</button>
                        <button class="switch-btn" data-supervisao-filter="colab">Colaboradores</button>
                    </div>
                </div>
                <div class="supervisao-switch-hint">Selecione quem verá o conteúdo principal antes dos filtros extras.</div>
                <div class="supervisao-filters">
                    <button class="filter-chip" data-supervisao-filter="guide">Guias</button>
                    <button class="filter-chip" data-supervisao-filter="favorites">Favoritos</button>
                    <button class="filter-chip" data-supervisao-filter="used">Mais usados</button>
                    ${isAdminRole() ? `<button class="filter-chip" data-supervisao-filter="expired">Expirados</button>` : ''}
                </div>
            </div>
            <div id="supervisao-top-used" class="supervisao-top-used hidden"></div>
            <div id="supervisao-sections"></div>
            ${getSupervisaoAdminHtml()}
        </div>
    `;
}

// 1. Renderizar Gateway
function renderGateway() {
    // Se o acesso exigir login, forçamos o fluxo de autenticação antes de renderizar qualquer grupo
    if (CONFIG?.auth?.requireLogin && !SiteAuth.logged) {
        showLoginScreen();
        return;
    }

    const allowedGroups = getAllowedGroups();
    const labelMap = getGroupLabelMap();
    const titleMap = {
        bombeiros: 'Dunamis Bombeiros',
        servicos: 'Dunamis Serviços',
        seguranca: 'Dunamis Segurança',
        rb: 'RB Facilities'
    };
    const cardsHtml = (CONFIG?.groupRules || [])
        .map(rule => rule.key)
        .filter(key => allowedGroups.includes(key))
        .map(key => createCard(titleMap[key] || (labelMap[key] || key), (CONFIG.images || {})[key], key))
        .join('');
    const showGeneral = allowedGroups.length > 1 || canViewAllGroups();
    gateway.innerHTML = `
        <h2>Selecione a Unidade</h2>
        <div class="gateway-grid">
            ${cardsHtml}
            ${showGeneral ? `
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
            </div>` : ''}
        </div>
        <div class="gateway-access-grid">
            <div class="gateway-card gateway-card-access" onclick="openSupervisaoPage()">
                <div class="gateway-icon">
                    ${ICONS.shield}
                </div>
                <h3>Supervisão</h3>
                <p>Links e mensagens para supervisores.</p>
            </div>
            <div class="gateway-card gateway-card-access" onclick="openGerenciaPage()">
                <div class="gateway-icon">
                    ${ICONS.settings}
                </div>
                <h3>Gerência</h3>
                <p>Placeholder.</p>
            </div>
        </div>
        <div class="gateway-links">
            <button class="btn" onclick="openDunamisProjects()">Clique aqui para conferir os outros sites Dunamis IA</button>
        </div>
        ${CONFIG?.auth?.requireLogin && SiteAuth.logged ? `<div class="gateway-logout"><button class="btn btn-secondary btn-small" onclick="logoutSite({ target: 'gateway' })">Encerrar sessão (${escapeHtml(SiteAuth.email || '')})</button></div>` : ''}
    `;
}

function showLoginScreen() {
    // Tela de login dedicada no gateway para evitar dependência da aba Configuração.
    appContainer.style.display = 'none';
    gateway.classList.remove('hidden');
    document.body.classList.add('on-gateway');
    gateway.innerHTML = `
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
                            <input type="password" id="loginPassword" placeholder="••••••••">
                        </div>
                        <div class="field-row field-row-check">
                            <label class="check-label"><input type="checkbox" id="keepLoggedCheck" checked> Permanecer conectado</label>
                        </div>
                        <div class="actions">
                            <button class="btn" onclick="loginSite({ target: 'gateway' })">Entrar</button>
                            <button class="btn btn-secondary btn-small" onclick="signupSite()">Criar conta</button>
                            <button class="btn btn-secondary btn-small" onclick="requestPasswordReset()">Esqueci senha</button>
                        </div>
                        <div class="hint">Informe suas credenciais para liberar o acesso às unidades.</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function showGatewayScreen() {
    gateway.classList.remove('hidden');
    appContainer.style.display = 'none';
    document.body.classList.add('on-gateway');
    renderGateway();
}

function createCard(title, imgPath, key) {
    return `
        <div class="gateway-card" onclick="loadGroup('${key}')">
            <img src="${imgPath}" alt="${title}" loading="lazy">
            <h3>${title}</h3>
        </div>
    `;
}

function setAppTitle(title, suffix = '') {
    if (!appTitle) return;
    const extra = suffix ? ` ${suffix}` : '';
    appTitle.innerHTML = `${title}${extra}`;
}

function openDunamisProjects() {
    const page = `
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
                        <div class="subtitle">Acesse rapidamente as ferramentas e painéis disponíveis.</div>
                    </div>
                    <div class="grid">
                        <div class="card">
                            <h2>Portal de Trocas</h2>
                            <p>Gestão de trocas e coberturas com fluxo organizado.</p>
                            <a href="https://gustauvm.github.io/PORTAL-DE-TROCA/gateway.html" target="_blank">Abrir projeto →</a>
                        </div>
                        <div class="card">
                            <h2>Relatório por RE</h2>
                            <p>Organizador de relatório com foco em RE.</p>
                            <a href="https://gustauvm.pythonanywhere.com/" target="_blank">Abrir projeto →</a>
                        </div>
                        <div class="card">
                            <h2>Endereços das Unidades</h2>
                            <p>Consulte endereços oficiais das unidades Dunamis.</p>
                            <a href="https://gustauvm.github.io/ENDERECOS-DUNAMIS/" target="_blank">Abrir projeto →</a>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    `;
    const w = window.open('', '_blank');
    if (w) {
        w.document.write(page);
        w.document.close();
    }
}

// 2. Carregar Dados (Supabase)
function normalizeGroupToken(value) {
    return String(value || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

let COLLAB_RE_PADRAO_COLUMN = 're_padrao';

function inferGroupKeyFromRow(row) {
    const rules = CONFIG?.groupRules || [];
    const haystack = normalizeGroupToken([
        row?.unidade_de_negocio,
        row?.empresa,
        row?.cargo,
        row?.posto
    ].filter(Boolean).join(' '));
    for (const rule of rules) {
        const patterns = rule?.patterns || [];
        const matched = patterns.some(p => haystack.includes(normalizeGroupToken(p)));
        if (matched) return rule.key;
    }
    return 'todos';
}

function pickRePadrao(row) {
    return row?.re_padrao || row?.re_padrap || '';
}

function pickFirstDefined(...values) {
    for (const value of values) {
        if (value !== undefined && value !== null && value !== '') return value;
    }
    return '';
}

function normalizePhoneValue(value) {
    return String(value || '').replace(/\D/g, '');
}

let _collabReColumnDetected = false;
function mapSupabaseCollaboratorRow(row) {
    if (!_collabReColumnDetected && row && typeof row === 'object' && !('re_padrao' in row) && ('re_padrap' in row)) {
        COLLAB_RE_PADRAO_COLUMN = 're_padrap';
        _collabReColumnDetected = true;
    }
    const rePadrao = String(pickRePadrao(row) || '').trim();
    const reNovo = pickFirstDefined(row?.re_folha, row?.re_novo);
    const re = rePadrao || String(row?.matricula || reNovo || '').trim();
    const nome = String(row?.colaborador || row?.nome || '').trim().toUpperCase();
    const posto = String(row?.posto || '').trim().toUpperCase();
    const escalaRaw = String(row?.escala || '').trim();
    const tipoEscala = extrairTipoEscala(escalaRaw);
    const turma = parseInt(row?.turma, 10);
    const unidadeNegocio = String(row?.unidade_de_negocio || '').trim();
    const grupo = inferGroupKeyFromRow(row);
    const dataAdmissao = pickFirstDefined(row?.data_admissao, row?.admissao);
    const reciclagemBombeiro = pickFirstDefined(row?.["reciclagem bombeiro"], row?.reciclagem_bombeiro);
    const nr10 = pickFirstDefined(row?.nr_10, row?.nr10);
    const nr20 = pickFirstDefined(row?.nr_20, row?.nr20);
    const nr33 = pickFirstDefined(row?.nr_33, row?.nr33);
    const nr35 = pickFirstDefined(row?.nr_35, row?.nr35);
    const telefoneEmergencia = pickFirstDefined(row?.telefone_emergencia, row?.telefone_de_emergencia);
    const enderecoColaborador = pickFirstDefined(row?.endereco_colaborador, row?.endereco);
    const reciclagemCnvVigilante = pickFirstDefined(row?.reciclagem_cnv_vigilante, row?.cnv_vigilante);
    return {
        ...row,
        __raw: row,
        dbId: String(row?.matricula || rePadrao || reNovo || row?.cpf || '').trim(),
        nome,
        re,
        re_folha: reNovo || '',
        re_novo: row?.re_novo || row?.re_folha || '',
        re_padrao: rePadrao,
        matricula: row?.matricula || '',
        colaborador: row?.colaborador || row?.nome || '',
        posto,
        cargo: row?.cargo || '',
        escala: escalaRaw,
        tipoEscala,
        turno: row?.turno || '',
        telefone: normalizePhoneValue(row?.telefone || ''),
        cpf: row?.cpf ? String(row.cpf) : '',
        data_admissao: dataAdmissao || '',
        admissao: dataAdmissao || '',
        empresa: row?.empresa || '',
        cliente: row?.cliente || '',
        turma: Number.isFinite(turma) ? turma : '',
        ferias: row?.ferias || '',
        aso: row?.aso || '',
        "reciclagem bombeiro": reciclagemBombeiro || '',
        reciclagem_bombeiro: reciclagemBombeiro || '',
        nr_10: nr10 || '',
        nr_20: nr20 || '',
        nr_33: nr33 || '',
        nr_35: nr35 || '',
        nr10: nr10 || '',
        nr20: nr20 || '',
        nr33: nr33 || '',
        nr35: nr35 || '',
        dea: row?.dea || '',
        heliponto: row?.heliponto || '',
        uniforme: row?.uniforme || '',
        suspensao: row?.suspensao || '',
        advertencia: row?.advertencia || '',
        recolhimento: row?.recolhimento || '',
        observacoes: row?.observacoes || '',
        ctps_numero: row?.ctps_numero || '',
        ctps_serie: row?.ctps_serie || '',
        pis: row?.pis || '',
        rg: row?.rg || '',
        atestados: row?.atestados || '',
        reciclagem_vigilante: row?.reciclagem_vigilante || '',
        reciclagem_cnv_vigilante: reciclagemCnvVigilante || '',
        cnv_vigilante: reciclagemCnvVigilante || '',
        numeracao_cnv: row?.numeracao_cnv || '',
        telefone_emergencia: telefoneEmergencia || '',
        telefone_de_emergencia: telefoneEmergencia || '',
        data_nascimento: row?.data_nascimento || '',
        idade: row?.idade || '',
        unidade_de_negocio: unidadeNegocio,
        endereco_colaborador: enderecoColaborador || '',
        email_login: row?.email_login || '',
        rotulo: row?.rotulo || '',
        rotuloInicio: row?.rotulo_inicio || row?.rotuloInicio || '',
        rotuloFim: row?.rotulo_fim || row?.rotuloFim || '',
        rotuloDetalhe: row?.rotulo_detalhe || row?.rotuloDetalhe || '',
        endereco: enderecoColaborador || '',
        pasta_google_drive: row?.pasta_google_drive || '',
        grupoLabel: unidadeNegocio,
        grupo
    };
}

function extrairTipoEscala(rawEscala) {
    const text = String(rawEscala || '').toUpperCase();
    if (!text) return '';
    if (text.includes('12X36')) return '12x36';
    if (text.includes('5X2')) return '5x2';
    if (text.includes('6X1')) return '6x1';
    if (text.includes('24X72')) return '24x72';
    const generic = text.match(/\b\d{1,2}X\d{1,2}\b/);
    return generic ? generic[0].toLowerCase() : '';
}

function formatUnitAddress(row) {
    const parts = [
        row?.endereco,
        row?.numero,
        row?.bairro,
        row?.cidade,
        row?.estado
    ].map(v => String(v || '').trim()).filter(Boolean);
    const base = parts.join(', ');
    const cep = row?.cep ? `CEP ${row.cep}` : '';
    return [base, cep].filter(Boolean).join(' • ');
}

function setSupabaseHealth(patch = {}) {
    supabaseHealth = {
        ...supabaseHealth,
        ...patch
    };
}

function saveCollaboratorsSnapshot(items) {
    try {
        if (!Array.isArray(items) || !items.length) return;
        localStorage.setItem(COLLAB_SNAPSHOT_KEY, JSON.stringify({
            savedAt: new Date().toISOString(),
            items
        }));
    } catch {}
}

function loadCollaboratorsSnapshot() {
    try {
        const raw = localStorage.getItem(COLLAB_SNAPSHOT_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed?.items) ? parsed.items : [];
    } catch {
        return [];
    }
}

function getSupabaseDiagnosticsText() {
    return [
        `Status: ${supabaseHealth.status}`,
        `Fonte: ${supabaseHealth.source}`,
        `Tentativa: ${supabaseHealth.lastAttemptAt || '-'}`,
        `Sucesso: ${supabaseHealth.lastSuccessAt || '-'}`,
        `Registros: ${supabaseHealth.lastCount || 0}`,
        `Erro: ${supabaseHealth.lastError || '-'}`,
        `Acesso: ${SiteAuth.logged ? `ativo (${SiteAuth.email || 'sem-email'})` : 'inativo'}`
    ].join('\n');
}

async function copySupabaseDiagnostics() {
    const text = getSupabaseDiagnosticsText();
    try {
        if (navigator?.clipboard?.writeText) {
            await navigator.clipboard.writeText(text);
            showToast('Diagnóstico copiado.', 'success');
            return;
        }
    } catch {}
    showToast('Não foi possível copiar. Abra o console para detalhes.', 'error');
    console.log(text);
}

let _inflightCollaboratorsFetch = null;
async function fetchSupabaseCollaborators(force = false) {
    if (!supabaseClient) return [];
    const now = Date.now();
    if (!force && allCollaboratorsCache.items && (now - allCollaboratorsCache.updatedAt) < SUPABASE_CACHE_TTL_MS) {
        setSupabaseHealth({
            status: 'ok',
            source: 'cache',
            lastCount: allCollaboratorsCache.items.length
        });
        return allCollaboratorsCache.items;
    }

    // Deduplicate concurrent in-flight requests
    if (_inflightCollaboratorsFetch) return _inflightCollaboratorsFetch;

    _inflightCollaboratorsFetch = (async () => {
    try {

    setSupabaseHealth({
        status: 'loading',
        source: 'supabase-js',
        lastAttemptAt: new Date().toISOString(),
        lastError: ''
    });

    async function fetchCollaboratorsViaRestFallback() {
        if (!SUPABASE_CONFIG?.url || !SUPABASE_CONFIG?.anonKey) return [];
        if (dataLayer && typeof dataLayer.fetchSupabaseTablePaged === 'function') {
            let token = SUPABASE_CONFIG.anonKey;
            try {
                const { data: sessionData } = await supabaseClient.auth.getSession();
                if (sessionData?.session?.access_token) {
                    token = sessionData.session.access_token;
                }
            } catch {}
            return dataLayer.fetchSupabaseTablePaged({
                baseUrl: SUPABASE_CONFIG.url,
                table: SUPABASE_TABLES.colaboradores,
                anonKey: SUPABASE_CONFIG.anonKey,
                accessToken: token,
                pageSize: 1000,
                timeoutMs: 15000
            });
        }
        const pageSize = 1000;
        let from = 0;
        let allRows = [];
        let token = SUPABASE_CONFIG.anonKey;

        try {
            const { data: sessionData } = await supabaseClient.auth.getSession();
            if (sessionData?.session?.access_token) {
                token = sessionData.session.access_token;
            }
        } catch {}

        while (true) {
            const to = from + pageSize - 1;
            const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${SUPABASE_TABLES.colaboradores}?select=*`, {
                method: 'GET',
                headers: {
                    apikey: SUPABASE_CONFIG.anonKey,
                    Authorization: `Bearer ${token}`,
                    Range: `${from}-${to}`,
                    Prefer: 'count=exact'
                }
            });

            if (!resp.ok) {
                const body = await resp.text().catch(() => '');
                throw new Error(`REST fallback colaboradores falhou (${resp.status}): ${body || resp.statusText}`);
            }

            const chunk = await resp.json();
            if (!Array.isArray(chunk) || !chunk.length) break;
            allRows = allRows.concat(chunk);
            if (chunk.length < pageSize) break;
            from += pageSize;
        }

        return allRows;
    }

    let data = null;
    let error = null;
    try {
        // Paginate to avoid Supabase 1000-row default limit
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;
        while (true) {
            const query = supabaseClient.from(SUPABASE_TABLES.colaboradores).select('*').range(from, from + PAGE_SIZE - 1);
            const result = await withTimeout(
                query.then(r => r),
                20000,
                'Consulta Supabase colaboradores'
            );
            if (result?.error) { error = result.error; break; }
            const chunk = result?.data || [];
            allRows = allRows.concat(chunk);
            if (chunk.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
        if (!error) data = allRows;
    } catch (err) {
        error = err;
    }

    if (error) {
        AppErrorHandler.capture(error, { scope: 'supabase-collaborators' }, { silent: true });
        try {
            const fallbackRows = await fetchCollaboratorsViaRestFallback();
            const fallbackMapped = (fallbackRows || []).map(mapSupabaseCollaboratorRow);
            allCollaboratorsCache = { items: fallbackMapped, updatedAt: Date.now() };
            saveCollaboratorsSnapshot(fallbackMapped);
            setSupabaseHealth({
                status: 'ok',
                source: 'rest-fallback',
                lastSuccessAt: new Date().toISOString(),
                lastCount: fallbackMapped.length,
                lastError: ''
            });
            return fallbackMapped;
        } catch (fallbackErr) {
            AppErrorHandler.capture(fallbackErr, { scope: 'supabase-collaborators-fallback' }, { silent: true });
            const snapshot = loadCollaboratorsSnapshot();
            if (snapshot.length) {
                allCollaboratorsCache = { items: snapshot, updatedAt: Date.now() };
                setSupabaseHealth({
                    status: 'degraded',
                    source: 'snapshot-local',
                    lastSuccessAt: new Date().toISOString(),
                    lastCount: snapshot.length,
                    lastError: String(fallbackErr?.message || error?.message || 'fallback-error')
                });
                showToast('Supabase indisponível. Usando snapshot local.', 'warning');
                return snapshot;
            }
            setSupabaseHealth({
                status: 'error',
                source: 'none',
                lastError: String(fallbackErr?.message || error?.message || 'fetch-error')
            });
            showToast("Falha ao carregar colaboradores do Supabase.", "error");
            return [];
        }
    }

    const mapped = (data || []).map(mapSupabaseCollaboratorRow);
    allCollaboratorsCache = { items: mapped, updatedAt: now };
    saveCollaboratorsSnapshot(mapped);
    setSupabaseHealth({
        status: 'ok',
        source: 'supabase-js',
        lastSuccessAt: new Date().toISOString(),
        lastCount: mapped.length,
        lastError: ''
    });
    return mapped;

    } finally { _inflightCollaboratorsFetch = null; }
    })();
    return _inflightCollaboratorsFetch;
}

async function fetchSupabaseUnits(force = false) {
    if (!supabaseClient) return [];
    const now = Date.now();
    if (!force && supaUnitsCache.items && (now - supaUnitsCache.updatedAt) < SUPABASE_CACHE_TTL_MS) {
        return supaUnitsCache.items;
    }
    try {
        // Paginate to avoid Supabase 1000-row default limit
        const PAGE_SIZE = 1000;
        let allRows = [];
        let from = 0;
        let fetchError = null;
        while (true) {
            const { data: chunk, error: chunkErr } = await supabaseClient
                .from(SUPABASE_TABLES.unidades)
                .select('*')
                .range(from, from + PAGE_SIZE - 1);
            if (chunkErr) { fetchError = chunkErr; break; }
            allRows = allRows.concat(chunk || []);
            if (!chunk || chunk.length < PAGE_SIZE) break;
            from += PAGE_SIZE;
        }
        if (fetchError) {
            AppErrorHandler.capture(fetchError, { scope: 'supabase-unidades' }, { silent: true });
            return supaUnitsCache.items || [];
        }
        const mapped = (allRows).map(row => {
            const unidadeNegocio = pickFirstDefined(
                row?.unidade_de_negocio,
                row?.unidade_de_negocio_vigilancia,
                row?.unidade_de_negocio_servicos,
                row?.unidade_de_negocio_rb
            );
            const empresa = pickFirstDefined(
                row?.empresa,
                row?.empresa_bombeiros,
                row?.empresa_servicos,
                row?.empresa_seguranca,
                row?.empresa_rb
            );
            const dataImplantacao = pickFirstDefined(row?.data_implantacao, row?.data_de_implantacao);
            const modalidadeReciclagem = pickFirstDefined(row?.modalidade_reciclagem, row?.modalidade_reciclagem_bombeiros, row?.modalidade_reciclagem_de_bombeiros);
            const heliponto = pickFirstDefined(row?.heliponto, row?.heliponto_na_unidade);
            const pcms = pickFirstDefined(row?.pcms, row?.pcmso);
            return {
                ...row,
                nome: String(row?.posto || row?.cliente || unidadeNegocio || '').trim().toUpperCase(),
                unidade_de_negocio: unidadeNegocio || '',
                empresa: empresa || '',
                data_implantacao: dataImplantacao || '',
                modalidade_reciclagem: modalidadeReciclagem || '',
                heliponto: heliponto || '',
                pcms: pcms || '',
                endereco_formatado: formatUnitAddress(row)
            };
        });
        supaUnitsCache = { items: mapped, updatedAt: now };
        return mapped;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'supabase-unidades' }, { silent: true });
        return supaUnitsCache.items || [];
    }
}

function withTimeout(promise, timeoutMs, label) {
    if (dataLayer && typeof dataLayer.withTimeout === 'function') {
        return dataLayer.withTimeout(promise, timeoutMs, label);
    }
    let timerId;
    const timeoutPromise = new Promise((_, reject) => {
        timerId = setTimeout(() => {
            reject(new Error(`${label || 'Operação'} excedeu o tempo limite (${timeoutMs}ms).`));
        }, timeoutMs);
    });
    return Promise.race([promise, timeoutPromise]).finally(() => {
        clearTimeout(timerId);
    });
}

async function loadGroup(groupKey, options = {}) {
    if (SiteAuth.logged && Array.isArray(SiteAuth.groups) && SiteAuth.groups.length && groupKey && groupKey !== 'todos') {
        if (!SiteAuth.groups.includes(groupKey) && !canViewAllGroups()) {
            showToast("Você não tem permissão para acessar este grupo.", "error");
            return;
        }
    }
    setAppState('currentGroup', groupKey, { silent: true });

    // Clear any active search so stale terms don't filter the new group
    const _si = document.getElementById('search-input');
    if (_si && _si.value) { _si.value = ''; }
    searchFilterGroup = 'all'; searchFilterCargo = 'all'; searchFilterEscala = 'all';
    searchFilterStatus = 'all'; searchHideAbsence = false;

    // UI Feedback
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    closeUtilityDrawer();
    appContainer.style.display = 'block';
    contentArea.innerHTML = `<div class="loading-overlay"><div class="loading-spinner"></div><span>Carregando</span></div>`;

    // Pré-cargas não podem bloquear a renderização principal da tela.
    // Use force=false so these use cache if available and don't duplicate the main fetch
    Promise.allSettled([
        loadCollaboratorAddressDb(false),
        loadUnitAddressDb()
    ]).then(() => {}).catch(() => {});

    setAppState('currentData', [], { silent: true });

    let allItems = await fetchSupabaseCollaborators(false);

    // Auto-retry: on mobile/slow connections auth may still be settling.
    // If we got empty results, wait briefly and try once more with force.
    if (Array.isArray(allItems) && allItems.length === 0) {
        await new Promise(r => setTimeout(r, 1500));
        // Ensure auth session is ready before retrying
        if (supabaseClient) {
            try {
                const { data: sess } = await supabaseClient.auth.getSession();
                if (sess?.session && !SiteAuth.logged) {
                    await applyAuthSession(sess.session, { silent: true });
                }
            } catch {}
        }
        allCollaboratorsCache = { items: null, updatedAt: 0 };
        allItems = await fetchSupabaseCollaborators(true);
    }

    if (!Array.isArray(allItems)) {
        contentArea.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Falha ao carregar dados</span>
                <div class="loading-actions">
                    <button class="btn" onclick="loadGroup('${groupKey || 'todos'}')">Tentar novamente</button>
                    ${CONFIG?.auth?.requireLogin ? `<button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Sair</button>` : ''}
                    <button class="btn btn-secondary" onclick="copySupabaseDiagnostics()">Diagnóstico</button>
                </div>
            </div>
        `;
        showToast('Falha ao carregar dados do Supabase. Tente novamente.', 'error');
        return;
    }

    if (CONFIG?.auth?.requireLogin && !SiteAuth.logged && Array.isArray(allItems) && allItems.length === 0) {
        contentArea.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Acesso necessário para carregar os dados</span>
                <div class="loading-actions">
                    <button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Voltar</button>
                </div>
            </div>
        `;
        return;
    }

    if (SiteAuth.logged && allItems.length === 0) {
        contentArea.innerHTML = `
            <div class="loading-overlay">
                <div class="loading-error-icon">!</div>
                <span>Nenhum registro encontrado</span>
                <p style="font-size:0.85rem;color:#64748b;max-width:340px;text-align:center;">Verifique sua conexão ou tente novamente. Em redes móveis, o carregamento pode ser mais lento.</p>
                <div class="loading-actions">
                    <button class="btn" onclick="loadGroup('${groupKey || 'todos'}')">Tentar novamente</button>
                    ${CONFIG?.auth?.requireLogin ? `<button class="btn btn-secondary" onclick="logoutSite({ target: 'gateway' })">Reiniciar acesso</button>` : ''}
                    <button class="btn btn-secondary" onclick="copySupabaseDiagnostics()">Diagnóstico</button>
                </div>
            </div>
        `;
        return;
    }

    if (groupKey && groupKey !== 'todos') {
        allItems = allItems.filter(item => item.grupo === groupKey);
    } else if (!canViewAllGroups() && Array.isArray(SiteAuth.groups) && SiteAuth.groups.length) {
        allItems = allItems.filter(item => SiteAuth.groups.includes(item.grupo));
    }

    setAppState('currentData', allItems.map((item, idx) => ({ ...item, id: idx })), { silent: true });
    setAppState('lastUpdatedAt', new Date(), { silent: true });
    const labelMap = getGroupLabelMap();
    const label = groupKey && groupKey !== 'todos' ? (labelMap[groupKey] || groupKey.toUpperCase()) : 'Geral';
    setAppTitle(`Gerenciamento de Efetivos - ${label}`);

    renderDashboard();
    // Force-clear search after render and rerun with empty term
    clearSearchInput();
    requestAnimationFrame(() => {
        const si2 = document.getElementById('search-input');
        if (si2 && si2.value) { si2.value = ''; clearSearchInput(); }
    });
    updateLastUpdatedDisplay();
    runDailySafetySnapshot();

    const desiredTab = normalizeDashboardTab(options.restoreTab || 'busca');
    if (desiredTab !== 'busca') {
        switchTab(desiredTab, { history: options.history || 'replace', skipRouteSync: !!options.skipRouteSync });
    } else if (!options.skipRouteSync) {
        syncAppNavigation({ view: 'dashboard', group: groupKey || 'todos', tab: 'busca' }, { history: options.history || 'push' });
    }
}

// 3. Voltar ao Gateway
function resetToGateway(options = {}) {
    clearTabScopedTimers('gateway');
    appContainer.style.display = 'none';
    gateway.classList.remove('hidden');
    document.body.classList.add('on-gateway');
    closeUtilityDrawer();
    setAppState('currentData', [], { silent: true });
    setAppState('currentGroup', '', { silent: true });
    hiddenUnits.clear();
    minimizedUnits.clear();
    // Não limpamos unitMetadata e collaboratorEdits aqui para permitir persistência na sessão
    updateLastUpdatedDisplay();
    if (!options.skipRouteSync) {
        syncAppNavigation({ view: 'gateway', group: '', tab: 'busca' }, { history: options.history || 'push' });
    }
}

async function getAllCollaborators(force = false) {
    const managed = getCachedAllCollaborators();
    if (!force && managed) return managed;
    const items = await fetchSupabaseCollaborators(force);
    setCachedAllCollaborators(items, SUPABASE_CACHE_TTL_MS);
    return items;
}

// ==========================================================================
// LOGICA DE PROCESSAMENTO DE DADOS
// ==========================================================================

function mapRowsToObjects(rows, groupTag, keepChanges, phoneMap, addressMap) {
    return rows.map((cols) => {
        if (cols.length < 6) return null; // Garante mínimo de colunas

        const re = (cols[5] || '').trim();
        const nome = (cols[4] || '').trim().toUpperCase();
        const posto = (cols[7] || '').trim().toUpperCase();
        const reNorm = re.toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        if (nome === 'COLABORADOR' && reNorm === 'MATRICULA' && posto === 'POSTO') return null;
        
        // Se optou por manter alterações e existe edição para este RE, usa a edição
        if (keepChanges && collaboratorEdits[re]) {
            const edited = { ...collaboratorEdits[re], grupo: groupTag };
            if (!edited.endereco) edited.endereco = findCollaboratorAddress(re, addressMap);
            if (!edited.cargo) edited.cargo = findCollaboratorRole(re, addressMap);
            return edited; // Mantém grupo atual
        }

        const telefone = findPhone(re, nome, phoneMap);
        const endereco = findCollaboratorAddress(re, addressMap);
        const cargo = findCollaboratorRole(re, addressMap);
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
            turma: parseInt(cols[3]) || '',
            rotulo: '', // Campo para afastamentos/rótulos
            rotuloInicio: '',
            rotuloFim: '',
            rotuloDetalhe: '', // Descrição para 'Outros'
            grupo: groupTag,
            telefone: telefone,
            endereco: endereco,
            cargo: cargo
        };

        return obj;
    }).filter(validateCollaboratorData); // Filtra linhas inválidas
}

function normalizeHeaderValue(value) {
    return (value || '')
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toUpperCase();
}

function normalizeReKey(value) {
    if (value == null) return '';
    return String(value).replace(/[^a-zA-Z0-9]/g, '');
}

function validateCollaboratorData(item) {
    if (!item || typeof item !== 'object') return false;
    const nome = String(item.nome || '').trim();
    const re = normalizeReKey(item.re || '');
    return !!(nome && re);
}

function validateAddressData(item) {
    if (!item || typeof item !== 'object') return false;
    const unitName = String(item.nome || item.unidade || item.posto || '').trim();
    const re = normalizeReKey(item.re || item.matricula || '');
    const address = String(item.endereco || item.address || '').trim();
    const role = String(item.cargo || item.role || '').trim();
    if (unitName) return !!address;
    if (re) return !!(address || role);
    return false;
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

async function loadCollaboratorAddressDb(force = false) {
    if (collaboratorAddressLoaded && !force) return collaboratorAddressMap;
    try {
        const list = await fetchSupabaseCollaborators(force);
        const map = {};
        list.forEach(item => {
            const key = normalizeReKey(item.matricula || item.re_padrao || item.re || '');
            if (!key) return;
            const address = String(item.endereco_colaborador || item.endereco || '').trim();
            const role = String(item.cargo || '').trim();
            if (!validateAddressData({ re: key, endereco: address, cargo: role })) return;
            map[key] = { address, role };
        });
        collaboratorAddressMap = map;
        collaboratorAddressLoaded = true;
        collaboratorAddressUpdatedAt = new Date();
    } catch {}
    return collaboratorAddressMap;
}

function findCollaboratorAddress(re, addressMap) {
    const profile = findCollaboratorProfile(re, addressMap);
    return profile.address;
}

function findCollaboratorRole(re, addressMap) {
    const profile = findCollaboratorProfile(re, addressMap);
    return profile.role;
}

function findCollaboratorProfile(re, addressMap) {
    if (!re) return { address: '', role: '' };
    const map = addressMap || collaboratorAddressMap || {};
    const key = normalizeReKey(re);
    const profile = map[key];
    if (!profile) return { address: '', role: '' };
    if (typeof profile === 'string') return { address: profile, role: '' };
    const address = String(profile.address || profile.endereco || '').trim();
    const role = String(profile.role || profile.cargo || '').trim();
    return { address, role };
}

function getCollaboratorAddressByRe(re) {
    return findCollaboratorAddress(re, collaboratorAddressMap);
}

function getCollaboratorRoleByRe(re) {
    return findCollaboratorRole(re, collaboratorAddressMap);
}

function getAddressForCollaborator(collab) {
    if (!collab) return '';
    return collab.endereco || getCollaboratorAddressByRe(collab.re);
}

function getMapsLocationForCollab(collab, mode = 'endereco') {
    if (!collab) return '';
    const normalizedMode = String(mode || 'endereco').toLowerCase();
    if (normalizedMode === 'posto') {
        return String(collab.posto || '').trim();
    }
    return String(getAddressForCollaborator(collab) || collab.posto || '').trim();
}

// 4. Renderizar Dashboard (Sistema de Abas)
function renderDashboard() {
    const avisosEnabled = isDashboardFeatureEnabled('avisos');
    const reciclagemEnabled = isDashboardFeatureEnabled('reciclagem');
    const lancamentosEnabled = isDashboardFeatureEnabled('lancamentos');
    const canManageLancamentos = lancamentosEnabled && isAdminRole();
    searchAdvancedOpen = false;
    contentArea.innerHTML = `
        <div class="breadcrumb-bar">
            <div class="breadcrumb-main">
                <span id="breadcrumb-group"></span>
                <span class="breadcrumb-sep">›</span>
                <span id="breadcrumb-tab"></span>
                <span class="breadcrumb-sep">›</span>
                <span id="breadcrumb-context"></span>
            </div>
            <div class="breadcrumb-meta">
                <span id="breadcrumb-updated" class="breadcrumb-updated"></span>
                <span id="breadcrumb-group-pill" class="group-pill"></span>
            </div>
        </div>
        <!-- Navegação de Abas -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('busca')">${ICONS.search} Busca Rápida</button>
            <button class="tab-btn" onclick="switchTab('busca-beta')">${ICONS.search} Busca Rápida Beta</button>
            <button class="tab-btn" onclick="switchTab('formalizador')">${ICONS.clipboard || ICONS.edit} Formalizador</button>
            <button class="tab-btn" onclick="switchTab('unidades')">${ICONS.building} Unidades</button>
            <button class="tab-btn" onclick="switchTab('config')">${ICONS.settings} Configuração</button>
        </div>

        <!-- Conteúdo das Abas -->
        <div id="tab-content-busca" class="tab-content">
            <div class="search-container">
                <div class="search-bar">
                    <div class="search-input-wrap">
                        <input type="text" id="search-input" class="search-input" name="q_x" 
                               placeholder="Nome, RE, posto, cargo, empresa, escala, telefone..." autocomplete="off">
                        <button id="search-clear-btn" type="button" class="search-clear-btn hidden" onclick="clearSearchInput()" aria-label="Limpar busca">&times;</button>
                    </div>
                </div>
                <div id="search-autocomplete" class="search-autocomplete hidden"></div>
                <div id="search-suggestions" class="search-suggestions hidden"></div>
                <div class="search-filters-compact">
                    <div class="filter-chips-row">
                        <button class="filter-chip active" data-filter="all" onclick="setSearchFilterStatus('all')">Todos</button>
                        <button class="filter-chip" data-filter="plantao" onclick="setSearchFilterStatus('plantao')">Plantão</button>
                        <button class="filter-chip" data-filter="folga" onclick="setSearchFilterStatus('folga')">Folga</button>
                        <button class="filter-chip" data-filter="ft" onclick="setSearchFilterStatus('ft')">FT</button>
                        <button class="filter-chip" data-filter="afastado" onclick="setSearchFilterStatus('afastado')">Afastados</button>
                        <button class="filter-chip" data-filter="favorites" onclick="setSearchFilterStatus('favorites')">★</button>
                        <button class="filter-chip" data-hide="1" onclick="toggleSearchHideAbsence()">Sem afast.</button>
                    </div>
                    <div class="filter-selects-row">
                        ${!currentGroup || currentGroup === 'todos' ? `<select id="search-group-filter" class="filter-select-sm" onchange="setSearchFilterGroup(this.value)">
                            <option value="all">Grupo</option>
                            ${CONFIG.groupRules.map(g => `<option value="${g.key}">${g.label}</option>`).join('')}
                        </select>` : ''}
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
                            <input type="date" id="search-date-from" value="${searchDateFilter.from || ''}">
                        </div>
                        <div class="search-date-field">
                            <label>ate</label>
                            <input type="date" id="search-date-to" value="${searchDateFilter.to || ''}">
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

        <div id="tab-content-busca-beta" class="tab-content hidden">
            <section class="qbeta-shell">
                <div class="qbeta-hero">
                    <div>
                        <span class="qbeta-eyebrow">Beta operacional</span>
                        <h2>Busca Rápida Beta</h2>
                        <p>Consulta read-only para localizar colaboradores, status de plantão/folga e dados completos vinculados à unidade.</p>
                    </div>
                    <div class="qbeta-hero-meta">
                        <span>Fonte: Supabase</span>
                        <strong id="qbeta-updated">Base carregada</strong>
                    </div>
                </div>

                <div class="qbeta-search-panel">
                    <div class="qbeta-search-main">
                        <label for="qbeta-search-input">Buscar colaborador, matrícula, posto, cargo, telefone ou dados da unidade</label>
                        <div class="qbeta-search-box">
                            ${ICONS.search}
                            <input id="qbeta-search-input" type="text" placeholder="Digite algumas letras para filtrar..." autocomplete="off" oninput="setQuickBetaFilter('query', this.value)">
                            <button type="button" onclick="clearQuickBetaSearch()">Limpar</button>
                        </div>
                    </div>
                    <div class="qbeta-filter-grid">
                        <select id="qbeta-status-filter" onchange="setQuickBetaFilter('status', this.value)">
                            <option value="all">Todos os status</option>
                            <option value="plantao">Plantão</option>
                            <option value="folga">Folga</option>
                        </select>
                        <select id="qbeta-group-filter" onchange="setQuickBetaFilter('group', this.value)"></select>
                        <select id="qbeta-posto-filter" onchange="setQuickBetaFilter('posto', this.value)"></select>
                        <select id="qbeta-cargo-filter" onchange="setQuickBetaFilter('cargo', this.value)"></select>
                        <select id="qbeta-escala-filter" onchange="setQuickBetaFilter('escala', this.value)"></select>
                        <select id="qbeta-turno-filter" onchange="setQuickBetaFilter('turno', this.value)"></select>
                        <select id="qbeta-turma-filter" onchange="setQuickBetaFilter('turma', this.value)">
                            <option value="all">Todas as turmas</option>
                            <option value="1">Turma 1 · ímpar</option>
                            <option value="2">Turma 2 · par</option>
                            <option value="invalid">Sem turma</option>
                        </select>
                    </div>
                </div>

                <div id="qbeta-kpis" class="qbeta-kpis"></div>

                <div class="qbeta-workspace">
                    <div class="qbeta-results-pane">
                        <div class="qbeta-results-head">
                            <strong id="qbeta-result-count">0 colaboradores</strong>
                            <span id="qbeta-duty-rule">Turma 1: ímpar · Turma 2: par</span>
                        </div>
                        <div id="qbeta-results-list" class="qbeta-results-list"></div>
                    </div>
                    <aside id="qbeta-detail-panel" class="qbeta-detail-panel">
                        <div class="qbeta-empty-detail">
                            <strong>Selecione um colaborador</strong>
                            <span>O painel exibirá dados completos da planilha e da unidade vinculada.</span>
                        </div>
                    </aside>
                </div>
            </section>
        </div>

        <div id="tab-content-formalizador" class="tab-content hidden">
            <section id="formalizador-root" class="formalizador-shell">
                <div class="formalizador-loading">Carregando Formalizador...</div>
            </section>
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
                            ${getGroupOptionsHtml()}
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
                </div>
                <div class="search-date-filters unit-date-filters">
                    <div class="search-date-field">
                        <label>Data de</label>
                        <input type="date" id="unit-date-from" value="${unitDateFilter.from || ''}">
                    </div>
                    <div class="search-date-field">
                        <label>até</label>
                        <input type="date" id="unit-date-to" value="${unitDateFilter.to || ''}">
                    </div>
                    <div class="menu-actions-row unit-toolbar-actions">
                        <button class="btn btn-secondary btn-small" onclick="openExportModal()">${ICONS.download} Exportar</button>
                        <button class="btn btn-secondary btn-small" onclick="openHistoryModal()">${ICONS.history} Histórico</button>
                        <button class="btn btn-secondary btn-small" onclick="clearUnitDateFilter()">Limpar data</button>
                    </div>
                </div>
            </div>
            <div id="units-list"></div>
        </div>

        ${avisosEnabled ? `
        <div id="tab-content-avisos" class="tab-content hidden">
            <div class="avisos-shell">
                <div class="avisos-panel">
                <div class="avisos-header">
                        <h3>Avisos</h3>
                        <div class="avisos-header-actions">
                            <span id="avisos-assignee-summary" class="avisos-summary"></span>
                            <button class="btn btn-secondary btn-small" onclick="exportarAvisosMensal()">Relatório mensal</button>
                            <button class="btn btn-secondary btn-small" onclick="openLembreteForm()">Novo Lembrete</button>
                            <button class="btn btn-secondary btn-small" onclick="clearAvisos()">Limpar avisos</button>
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
        ` : ''}

        ${reciclagemEnabled ? `
        <div id="tab-content-reciclagem" class="tab-content hidden">
            <div class="reciclagem-shell">
                <div class="reciclagem-header">
                    <h3>Reciclagem</h3>
                    <div class="reciclagem-actions menu-actions-row">
                        <button class="btn btn-secondary btn-small" onclick="loadReciclagemData(true); renderReciclagem();">Atualizar</button>
                        <button class="btn btn-secondary btn-small" onclick="exportReciclagemReport()">Exportar relatório</button>
                        ${isAdminRole() ? `<button class="btn btn-secondary btn-small" onclick="toggleReciclagemTemplatesPanel()">Editar mensagens</button>` : ''}
                        ${isAdminRole() ? `<button class="btn btn-secondary btn-small" onclick="toggleReciclagemHistory()">Histórico</button>` : ''}
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
        ` : ''}

        ${lancamentosEnabled ? `
        <div id="tab-content-lancamentos" class="tab-content hidden">
            <div class="lancamentos-shell">
                <div class="lancamentos-top">
                    <div class="lancamentos-title">
                        <h3 id="lancamentos-main-title">Lançamentos FT (Supabase em implantação)</h3>
                        <div class="lancamentos-meta">
                            <span id="lancamentos-sync-status" class="lancamentos-sync-pill">Integração Supabase pendente</span>
                        </div>
                        <div class="lancamentos-mode-switch" id="lancamentos-mode-switch">
                            <button class="lancamentos-mode-btn active" data-mode="ft" onclick="switchLancamentosMode('ft')">FT</button>
                            <button class="lancamentos-mode-btn" data-mode="troca" onclick="switchLancamentosMode('troca')">Troca de folga</button>
                        </div>
                    </div>
                    <div class="lancamentos-actions menu-actions-row">
                        <div id="lancamentos-actions-ft" class="lanc-action-group">
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('diaria')">Diária FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Indicadores FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Histórico FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('planejamento')">Planejamento FT</button>
                        </div>
                        <div id="lancamentos-actions-troca" class="lanc-action-group hidden">
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('diaria')">Diária Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Indicadores Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Histórico Troca</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('planejamento')">Planejamento Troca</button>
                        </div>
                    </div>
                </div>
                <div class="lancamentos-tabs" id="lancamentos-tabs-ft">
                    <button class="lancamentos-tab daily-focus" data-tab="diaria" onclick="switchLancamentosTab('diaria')">Diária <span class="tab-badge" id="lancamentos-tab-today">0</span></button>
                    <button class="lancamentos-tab" data-tab="dashboard" onclick="switchLancamentosTab('dashboard')">Indicadores <span class="tab-badge" id="lancamentos-tab-total">0</span></button>
                    <button class="lancamentos-tab" data-tab="historico" onclick="switchLancamentosTab('historico')">Histórico <span class="tab-badge" id="lancamentos-tab-pending">0</span></button>
                    <button class="lancamentos-tab" data-tab="planejamento" onclick="switchLancamentosTab('planejamento')">Planejamento <span class="tab-badge" id="lancamentos-tab-planning">0</span></button>
                </div>
                <div class="lancamentos-tabs hidden" id="lancamentos-tabs-troca">
                    <button class="lancamentos-tab daily-focus" data-tab="diaria" onclick="switchLancamentosTab('diaria')">Diária <span class="tab-badge" id="lancamentos-tab-troca-today">0</span></button>
                    <button class="lancamentos-tab" data-tab="dashboard" onclick="switchLancamentosTab('dashboard')">Indicadores <span class="tab-badge" id="lancamentos-tab-troca-total">0</span></button>
                    <button class="lancamentos-tab" data-tab="historico" onclick="switchLancamentosTab('historico')">Histórico <span class="tab-badge" id="lancamentos-tab-troca-pending">0</span></button>
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
                            <div class="hint">Sugere colaboradores de folga, priorizando quem já trabalha na unidade selecionada.</div>
                        </div>
                    </div>
                    <div id="ft-coverage-suggestions" class="results-grid"></div>
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
        ` : ''}

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
                                <input type="password" id="loginPassword" placeholder="••••••••">
                            </div>
                            <div class="field-row field-row-check">
                                <label class="check-label"><input type="checkbox" id="keepLoggedCheck" checked> Permanecer conectado</label>
                            </div>
                            <div class="actions">
                                <button class="btn" onclick="loginSite()">Entrar</button>
                                <button class="btn btn-secondary btn-small" onclick="signupSite()">Criar conta</button>
                                <button class="btn btn-secondary btn-small" onclick="requestPasswordReset()">Esqueci senha</button>
                            </div>
                            <div class="hint">Após criar sua conta, solicite acesso ao administrador da sua base.</div>
                        </div>
                    </div>
                </div>

                <div id="config-content" class="hidden">
                        <div class="config-tabs" role="tablist" aria-label="Seções de configuração">
                            <button class="config-tab active" onclick="switchConfigTab('access', this)">
                                <span class="config-tab-index">01</span>
                                <span class="config-tab-label">Sistema</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('team', this)">
                                <span class="config-tab-index">02</span>
                                <span class="config-tab-label">Equipe & Permissões</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('operation', this)">
                                <span class="config-tab-index">03</span>
                                <span class="config-tab-label">Operação</span>
                            </button>
                            <button class="config-tab" onclick="switchConfigTab('system', this)">
                                <span class="config-tab-index">04</span>
                                <span class="config-tab-label">Sistema</span>
                            </button>
                        </div>

                    <!-- ═══ ABA: MINHA CONTA ═══ -->
                    <div id="config-pane-access" class="config-pane">
                        <div class="config-section">
                            <div class="config-section-title">Acesso ao sistema</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Status</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="statusSection">
                                            <div class="status-block">
                                                <div class="status-row"><span>Base</span><span id="userRe"></span></div>
                                                <div class="status-row"><span>Modo</span><span id="siteMode"></span></div>
                                                <div class="status-row"><span>Permissão</span><span id="userRoleLabel"></span></div>
                                            </div>
                                            <div class="actions" style="margin-top:12px;">
                                                <button class="btn" onclick="toggleEditMode()">Alternar Modo Edição</button>
                                                ${CONFIG?.auth?.requireLogin ? `<button class="btn btn-secondary" onclick="logoutSite()">Sair</button>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Permissões do sistema</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="myRoleDescription" class="config-note"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ═══ ABA: EQUIPE & PERMISSÕES ═══ -->
                    <div id="config-pane-team" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Níveis de acesso</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Cargos e permissões do sistema</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Cada cargo define o que o colaborador pode fazer no sistema. Permissões são cumulativas — cargos superiores herdam tudo dos inferiores.</div>
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
                                        <div class="card-title">Usuários cadastrados</div>
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
                                        <div class="config-note" style="margin-bottom:8px;">Selecione um usuário da lista acima ou digite o e-mail para atribuir permissões.</div>
                                        <div class="field-row">
                                            <label>E-mail do usuário</label>
                                            <input type="email" id="cfg-user-email" placeholder="usuario@email.com">
                                        </div>
                                        <div id="cfg-user-verify-result" class="config-note cfg-verify" style="margin-bottom:8px;">Use "Verificar usuário" para confirmar se o perfil já existe neste ambiente.</div>
                                        <div class="field-row">
                                            <label>Cargo</label>
                                            <select id="cfg-user-role">
                                                <option value="visitante">Visitante — Somente consulta</option>
                                                <option value="operacional">Operacional — Somente visualização</option>
                                                <option value="supervisor">Supervisor — Visualização + edição</option>
                                                <option value="coordenador">Coordenador — Edição + todos os grupos</option>
                                                <option value="gerencia">Gerência — Edição + todos os grupos + dashboards</option>
                                                <option value="administrador">Administrador — Controle total</option>
                                            </select>
                                        </div>
                                        <div class="field-row">
                                            <label>Grupos</label>
                                            <div id="cfg-user-groups-checkboxes" class="checkbox-group cfg-groups-checks">
                                                ${(CONFIG?.groupRules || []).map(r => `<label><input type="checkbox" value="${r.key}"> ${r.label}</label>`).join('')}
                                            </div>
                                        </div>
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="verifyUserProfileFromConfig()">Verificar usuário</button>
                                            <button class="btn" onclick="upsertUserProfileFromConfig()">Salvar permissões</button>
                                        </div>
                                        <div class="hint">Se o usuário já criou conta e ainda não aparece, confirme se ele entrou neste ambiente e se o e-mail é exatamente o mesmo do cadastro.</div>
                                    </div>
                                </div>

                                <div class="config-card hidden" id="preRegPanel">
                                    <div class="config-card-header">
                                        <div class="card-title">Pré-cadastrar e-mails</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Cadastre e-mails antecipadamente. Quando a pessoa criar conta com esse e-mail, já terá o cargo e grupos definidos automaticamente.</div>
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
                                                <option value="gerencia">Gerência</option>
                                                <option value="administrador">Administrador</option>
                                            </select>
                                        </div>
                                        <div class="field-row">
                                            <label>Grupos</label>
                                            <div id="preReg-groups-checkboxes" class="checkbox-group cfg-groups-checks">
                                                ${(CONFIG?.groupRules || []).map(r => `<label><input type="checkbox" value="${r.key}"> ${r.label}</label>`).join('')}
                                            </div>
                                        </div>
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="addPreRegisteredEmail()">Adicionar e-mail</button>
                                        </div>
                                    </div>
                                </div>

                                <div class="config-card" id="teamNoAccess">
                                    <div class="config-card-body">
                                        <div class="config-note">Apenas administradores podem gerenciar a equipe. Solicite ao administrador da sua base se precisar alterar permissões.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- ═══ ABA: OPERAÇÃO ═══ -->
                    <div id="config-pane-operation" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Escala de plantão</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Regra oficial por TURMA</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="field-row">
                                            <label>Status operacional</label>
                                            <div class="actions">
                                                <span class="status-badge-menu view">TURMA ativa</span>
                                            </div>
                                        </div>
                                        <div class="config-note">A busca usa exclusivamente a coluna TURMA da planilha.</div>
                                        <div class="config-note">Turma 1 → plantão em dias ímpares e folga em dias pares. Turma 2 → plantão em dias pares e folga em dias ímpares.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        ${lancamentosEnabled ? `
                        <div class="config-section">
                            <div class="config-section-title">Lançamentos de FT</div>
                            <div class="config-grid">
                                <div class="config-card" id="ftReasonsCard">
                                    <div class="config-card-header">
                                        <div class="card-title">Motivos de FT</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note" style="margin-bottom:8px;">Motivos disponíveis para seleção nos lançamentos de Falta ao Trabalho.</div>
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
                        ` : ''}

                        <div class="config-section">
                            <div class="config-section-title">Ações rápidas</div>
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

                    <!-- ═══ ABA: SISTEMA ═══ -->
                    <div id="config-pane-system" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Visão geral da base</div>
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
                                        <div class="card-title">Conexões e fontes de dados</div>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="sourceStatus" class="source-status"></div>
                                        <div id="dataSourceList" class="source-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Histórico e evolução</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Alterações recentes</div>
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
                                        <div class="config-note" style="margin-bottom:6px;">Evoluções priorizadas para a operação.</div>
                                        <div id="roadmap-list" class="roadmap-list"></div>
                                    </div>
                                </div>
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

        <!-- Página Completa do Colaborador (CRM) -->
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
                        <h4>Exportações</h4>
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
                        <p class="export-note">Base Atualizada contém o banco com as alterações atuais aplicadas.</p>
                        <p class="export-note">Resumo inclui totais por unidade, status e rótulos.</p>
                        <p class="export-note">Completo inclui todas as abas: Base, Resumo, Unidades, Rótulos e Histórico.</p>
                        <p class="export-note">Dados p/ Gráficos traz séries prontas para gráfico de plantão x folga e top unidades.</p>
                        <p class="export-note">Relatório IA gera observações automáticas sobre cobertura e rótulos.</p>
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
                            <li>Use “Buscar substituto” para fixar um alvo e filtrar cobertura (posto, endereço ou rota real).</li>
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
                            <li>As alterações são registradas no Supabase.</li>
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

        <!-- Modal Endereços -->
        <div id="address-modal" class="modal hidden">
            <div class="modal-content" style="max-width: 760px;">
                <div class="modal-header sticky-modal-header">
                    <h3 id="address-modal-title">Endereços das Unidades</h3>
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
                    <h3>Rota da substituição</h3>
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
                                <h4>1. Visão geral e acesso</h4>
                                <ol>
                                    <li>Use o sistema para consultar colaboradores, escalas e unidades com foco operacional.</li>
                                    <li>Perfis com permissão liberam ações de edição nas áreas principais.</li>
                                    <li>Se estiver em modo visualização, você poderá navegar e consultar, mas não salvar alterações.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>2. Navegação principal</h4>
                                <ol>
                                    <li>Use as abas superiores para trocar entre Busca Rápida, Unidades e Configuração.</li>
                                    <li>O menu de Supervisão fica na página inicial (tela de seleção), sem precisar escolher unidade.</li>
                                    <li>O breadcrumb no topo mostra o grupo atual e a aba ativa.</li>
                                    <li>Os botões utilitários (Imprimir, Ajuda, Prompts e Guia) ficam no canto superior.</li>
                                </ol>
                            </div>
                            <details class="guide-subitem">
                                <summary>Últimas implantações e novidades</summary>
                                <div class="guide-subbody">
                                    <div class="help-section">
                                        <h4>v3.8 (06/02/2026)</h4>
                                        <ul>
                                            <li>Menu de Supervisão disponível na página inicial, sem selecionar unidade.</li>
                                            <li>Envio por WhatsApp otimizado: abre o app no celular e a tela de escolha (Web/App) no PC.</li>
                                            <li>Seletor rápido entre itens de Supervisão e Colaboradores.</li>
                                        </ul>
                                    </div>
                                </div>
                            </details>
                            <div class="help-section">
                                <h4>3. Busca rápida</h4>
                                <ol>
                                    <li>Digite nome, RE ou unidade para localizar colaboradores rapidamente.</li>
                                    <li>Use os filtros Plantão, Folga, FT e Afastados para refinar resultados.</li>
                                    <li>Ative "Buscar substituto" para fixar um alvo e comparar disponibilidade de cobertura.</li>
                                    <li>Escolha o tipo de proximidade (posto, endereço ou rota real) quando for buscar substituto.</li>
                                    <li>Os cartões exibem rótulos de FT e detalhes de quem cobre ou quem foi coberto.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>4. Unidades</h4>
                                <ol>
                                    <li>Use o filtro de grupo (quando disponível) e o status Plantão/Folga para organizar a visão.</li>
                                    <li>Clique no nome da unidade para expandir ou recolher a lista.</li>
                                    <li>Os rótulos e detalhes de unidade refletem o histórico local e os dados atuais.</li>
                                    <li>Quando houver FT no dia, a unidade mostra um rótulo "FT hoje".</li>
                                    <li>Use os botões de exportação para gerar XLSX/CSV por unidade ou a base completa.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>5. Supervisão (menu inicial)</h4>
                                <ol>
                                    <li>O menu de Supervisão fica na página inicial e pode ser acessado sem escolher unidade.</li>
                                    <li>Use o seletor "Supervisão" ou "Colaboradores" para alternar os itens exibidos.</li>
                                    <li>Favoritos, Guias e "Mais usados" ajudam a encontrar mensagens rapidamente.</li>
                                    <li>Os botões de WhatsApp abrem o app no celular e a tela de escolha no PC.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>6. Configuração da base</h4>
                                <ol>
                                    <li>Verifique o status da conexão com o Supabase quando necessário.</li>
                                    <li>As alterações são registradas diretamente no Supabase.</li>
                                    <li>Use os atalhos rápidos para recarregar base e exportar dados.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>7. Exportações e relatórios</h4>
                                <ol>
                                    <li>Use o menu de exportação para baixar base atualizada, resumos, históricos e PDFs.</li>
                                    <li>Antes de exportar, confirme se o grupo e os filtros ativos estão corretos.</li>
                                    <li>Antes de enviar, valide se a base está atualizada.</li>
                                </ol>
                            </div>
                        </div>
                    </details>
                </div>
            </div>
        </div>

        ${reciclagemEnabled ? `
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
                <div class="hint">Alteração local. Integração externa desativada.</div>
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
        ` : ''}
    `;

    if (isPublicAccessMode() || SiteAuth.logged) {
        document.getElementById('config-login')?.classList.add('hidden');
        document.getElementById('config-content')?.classList.remove('hidden');
    } else {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    updateMenuStatus();
    updateAiSearchButton();
    updateSubstituteSearchButton();
    updateSubstitutePanel();
    renderPromptTemplates();
    bindContextSelection();

    // Configurar evento de busca
    const searchInput = document.getElementById('search-input');
    searchInputComposing = false;
    AppTimerManager.clear(APP_TIMERS.searchDebounce);
    searchInputDebounceId = null;
    if (searchInput) {
        // Force-clear to prevent browser form-restore on refresh/navigation
        searchInput.value = '';
        searchInput.setAttribute('name', 'q_' + Date.now());
        const clearBtn = document.getElementById('search-clear-btn');
        if (clearBtn) clearBtn.classList.add('hidden');
        // Deferred clear to beat async browser autofill
        requestAnimationFrame(() => {
            if (searchInput.value) { searchInput.value = ''; }
        });
        const onSuggest = () => handleSearchTokenSuggest();
        const onSearchUi = () => {
            const hasValue = !!String(searchInput.value || '').trim();
            if (clearBtn) clearBtn.classList.toggle('hidden', !hasValue);
            renderSearchFavoritesPanel(searchInput.value || '');
        };
        searchInput.addEventListener('input', () => {
            onSuggest();
            onSearchUi();
            renderSearchAutocomplete();
            if (searchInputComposing) return;
            scheduleSearchExecution();
        });
        searchInput.addEventListener('compositionstart', () => {
            searchInputComposing = true;
        });
        searchInput.addEventListener('compositionend', () => {
            searchInputComposing = false;
            onSuggest();
            onSearchUi();
            renderSearchAutocomplete();
            scheduleSearchExecution();
        });
        searchInput.addEventListener('change', () => {
            onSuggest();
            onSearchUi();
            flushSearchExecution();
        });
        searchInput.addEventListener('click', onSuggest);
        searchInput.addEventListener('keyup', (ev) => {
            onSuggest();
            if (ev.key === 'Enter') {
                flushSearchExecution();
                hideSearchAutocomplete();
            }
        });
        searchInput.addEventListener('focus', () => {
            onSearchUi();
            renderSearchAutocomplete();
        });
        searchInput.addEventListener('blur', () => {
            setTimeout(() => hideSearchAutocomplete(), 200);
        });
        onSearchUi();
    }
    const searchDateFrom = document.getElementById('search-date-from');
    const searchDateTo = document.getElementById('search-date-to');
    if (searchDateFrom && searchDateTo) {
        const onSearchDateChange = () => setSearchDateFilter(searchDateFrom.value, searchDateTo.value);
        searchDateFrom.addEventListener('change', onSearchDateChange);
        searchDateTo.addEventListener('change', onSearchDateChange);
    }

    const searchUnitInput = document.getElementById('search-unit-target');
    if (searchUnitInput) {
        searchUnitInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                suggestCoverageFromSearch();
            }
        });
    }
    hydrateSearchUnits();
    populateSearchFilterDropdowns();
    applySearchDeepLink();
    
    // Configurar eventos dos filtros
    document.querySelectorAll('input[name="filterStatus"]').forEach(radio => {
        radio.addEventListener('change', () => realizarBusca());
    });

    // Configurar busca de unidades
    const unitSearchInput = document.getElementById('unit-search-input');
    unitSearchInput.addEventListener('input', () => renderizarUnidades());
    const unitDateFrom = document.getElementById('unit-date-from');
    const unitDateTo = document.getElementById('unit-date-to');
    if (unitDateFrom && unitDateTo) {
        const onUnitDateChange = () => setUnitDateFilter(unitDateFrom.value, unitDateTo.value);
        unitDateFrom.addEventListener('change', onUnitDateChange);
        unitDateTo.addEventListener('change', onUnitDateChange);
    }

    
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

    updateSearchFilterUI();
    renderSearchFavoritesPanel('');
    searchInput.focus(); // Foco automático
    applyRequiredFieldHints();

    // Renderizar lista de unidades (já deixa pronto, mas oculto)
    renderizarUnidades();
    if (avisosEnabled) {
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
    }
    if (lancamentosEnabled) {
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
                const sugg = document.getElementById('ft-coverage-suggestions');
                if (sugg) sugg.innerHTML = '';
            });
        }
        const ftShift = document.getElementById('ft-shift');
        if (ftShift) {
            ftShift.dataset.auto = '1';
            ftShift.addEventListener('change', () => {
                ftShift.dataset.auto = '0';
            });
        }
    }
    if (isDashboardFeatureEnabled('avisos')) {
        initAvisosFilters();
        updateAvisosUI();
    }
}

function switchTab(tabName, options = {}) {
    const nextTab = normalizeDashboardTab(tabName);
    closeUtilityDrawer();
    clearTabScopedTimers(nextTab);
    setAppState('currentTab', nextTab, { silent: true });
    
    // Atualiza botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined' && event?.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.tab-btn[onclick="switchTab('${nextTab}')"]`)?.classList.add('active');
    }

    // Atualiza conteúdo
    document.getElementById('tab-content-busca')?.classList.add('hidden');
    document.getElementById('tab-content-busca-beta')?.classList.add('hidden');
    document.getElementById('tab-content-formalizador')?.classList.add('hidden');
    document.getElementById('tab-content-unidades')?.classList.add('hidden');
    document.getElementById('tab-content-supervisao')?.classList.add('hidden');
    document.getElementById('tab-content-avisos')?.classList.add('hidden');
    document.getElementById('tab-content-reciclagem')?.classList.add('hidden');
    document.getElementById('tab-content-lancamentos')?.classList.add('hidden');
    document.getElementById('tab-content-config')?.classList.add('hidden');
    document.getElementById('tab-content-collab-detail')?.classList.add('hidden');
    
    document.getElementById(`tab-content-${nextTab}`)?.classList.remove('hidden');

    if (nextTab === 'config' && !SiteAuth.logged) {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    if (nextTab === 'busca') {
        document.getElementById('search-input')?.focus();
        realizarBusca();
    }
    if (nextTab === 'busca-beta') {
        activateQuickBetaSearch();
    }
    if (nextTab === 'formalizador') {
        activateFormalizador();
    }
    if (nextTab === 'unidades') {
        renderizarUnidades();
    }
    if (nextTab === 'avisos') {
        renderAvisos();
    }
    if (nextTab === 'reciclagem') {
        renderReciclagem();
    }
    if (nextTab === 'lancamentos') {
        renderLancamentos();
    }

    clearContextBar();
    updateBreadcrumb();

    if (!options.skipRouteSync) {
        syncAppNavigation({ view: 'dashboard', group: currentGroup || 'todos', tab: nextTab }, { history: options.history || 'push' });
    }
}

function isGroupInvertido(groupKey) {
    return !!escalaInvertidaByGroup[groupKey];
}

function renderEscalaInvertidaUI() {
    const statusEl = document.getElementById('escala-invertida-status');
    if (!statusEl) return;
    const groups = (CONFIG?.groupRules || []).map(r => r?.key).filter(Boolean);
    const allInv = groups.length > 0 && groups.every(k => escalaInvertidaByGroup[k]);
    const anyInv = groups.some(k => escalaInvertidaByGroup[k]);
    if (!currentGroup || currentGroup === 'todos') {
        statusEl.textContent = allInv ? 'Invertido' : anyInv ? 'Misto' : 'Padrão';
        statusEl.className = `status-badge-menu ${allInv ? 'edit' : anyInv ? 'info' : 'view'}`;
    } else {
        const inv = isGroupInvertido(currentGroup);
        statusEl.textContent = inv ? 'Invertido' : 'Padrão';
        statusEl.className = `status-badge-menu ${inv ? 'edit' : 'view'}`;
    }
}

function getCurrentMonthNumber() {
    return new Date().getMonth() + 1; // 1-12
}

function getDesiredEscalaInvertida(monthNumber) {
    return monthNumber % 2 === 0; // meses pares invertem
}

function applyAutoEscalaInvertida(options = {}) {
    // Desativado: o status oficial agora vem exclusivamente da coluna TURMA.
    if (options.notify) showToast('A inversão de plantão foi desativada. Ajuste a coluna TURMA na planilha.', 'info');
}

function startAutoEscalaMonitor() {
    // Mantido como no-op para compatibilidade com inicialização antiga.
    autoEscalaBound = true;
}

function toggleEscalaInvertida(groupKey) {
    showToast('A inversão de plantão foi desativada. Ajuste a coluna TURMA na planilha.', 'info');
}

function switchConfigTab(tabName, sourceBtn = null) {
    document.querySelectorAll('.config-tab').forEach(btn => btn.classList.remove('active'));
    if (sourceBtn?.classList) {
        sourceBtn.classList.add('active');
    } else {
        document.querySelectorAll('.config-tab').forEach(btn => {
            const onclick = btn.getAttribute('onclick') || '';
            if (onclick.includes(`switchConfigTab('${tabName}'`)) {
                btn.classList.add('active');
            }
        });
    }
    const panes = ['access', 'team', 'operation', 'system'];
    panes.forEach(p => document.getElementById(`config-pane-${p}`)?.classList.add('hidden'));
    document.getElementById(`config-pane-${tabName}`)?.classList.remove('hidden');

    if (tabName === 'access') {
        renderMyRoleDescription();
    }
    if (tabName === 'team') {
        renderRolePermissionsTable();
        updateTeamPaneVisibility();
        if (canManageUsers()) {
            renderAdminList();
            loadPreRegisteredEmails();
            renderPreRegList();
        }
    }
    if (tabName === 'operation') {
        renderEscalaInvertidaUI();
        if (canEditBase()) renderFtReasonsConfig();
    }
    if (tabName === 'system') {
        renderConfigSummary();
        renderDataSourceList();
        renderAuditList();
        renderRoadmapList();
    }
}

// 5. Lógica da Busca Rápida

// --- Utilitários de avatar e iniciais ---
function getCollabInitials(nome) {
    if (!nome) return '??';
    const parts = nome.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '??';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAvatarColor(nome) {
    const colors = ['#0e5ac8','#0f8a6a','#7c3aed','#be185d','#c2410c','#0891b2','#4f46e5','#b91c1c','#15803d','#a16207'];
    let hash = 0;
    for (let i = 0; i < (nome || '').length; i++) hash = nome.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
}

function buildCollabAvatarHtml(nome) {
    const initials = getCollabInitials(nome);
    const color = getAvatarColor(nome);
    return `<span class="collab-avatar" style="background:${color}">${initials}</span>`;
}

// --- Normalize text removing accents for fuzzy matching ---
function normalizeSearchText(str) {
    if (!str) return '';
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}

function scoreSearchMatch(item, termos, termosNorm) {
    if (!termos.length) return 1;
    const fields = [
        { val: item.nome, weight: 10 },
        { val: item.re, weight: 8 },
        { val: item.posto, weight: 6 },
        { val: item.cargo, weight: 4 },
        { val: item.empresa, weight: 3 },
        { val: item.escala, weight: 3 },
        { val: item.telefone, weight: 2 },
        { val: item.grupoLabel, weight: 2 },
        { val: item.cpf, weight: 2 },
        { val: item.turma != null ? String(item.turma) : '', weight: 1 }
    ];
    let totalScore = 0;
    for (let t = 0; t < termos.length; t++) {
        const termo = termos[t];
        const termoNorm = termosNorm[t];
        let bestFieldScore = 0;
        for (const f of fields) {
            if (!f.val) continue;
            const upper = f.val.toUpperCase();
            if (upper === termo) { bestFieldScore = Math.max(bestFieldScore, f.weight * 3); continue; }
            if (upper.startsWith(termo)) { bestFieldScore = Math.max(bestFieldScore, f.weight * 2); continue; }
            if (upper.includes(termo)) { bestFieldScore = Math.max(bestFieldScore, f.weight); continue; }
            // Fuzzy: normalized
            const norm = normalizeSearchText(f.val);
            if (norm.includes(termoNorm)) { bestFieldScore = Math.max(bestFieldScore, f.weight * 0.8); continue; }
        }
        if (bestFieldScore === 0) return 0; // All terms must match
        totalScore += bestFieldScore;
    }
    return totalScore;
}

function highlightSearchTerm(text, termos, termosNorm) {
    if (!text || !termos.length) return escapeHtml(text || '');
    let result = escapeHtml(text);
    const textNorm = normalizeSearchText(text);
    for (let t = 0; t < termos.length; t++) {
        const termo = termos[t];
        const termoNorm = termosNorm[t];
        // Find match position in normalized text
        const idx = textNorm.indexOf(termoNorm);
        if (idx >= 0) {
            const original = escapeHtml(text.substring(idx, idx + termoNorm.length));
            const regex = new RegExp(original.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            result = result.replace(regex, `<mark class="search-hl">$&</mark>`);
        }
    }
    return result;
}

function realizarBusca() {
    const termo = document.getElementById('search-input').value;
    const filterStatus = searchFilterStatus || 'all';
    const hideAbsence = !!searchHideAbsence;
    const resultsContainer = document.getElementById('search-results');
    const hasDateFilter = hasDateRangeFilter(searchDateFilter);
    const hasGroupFilter = searchFilterGroup && searchFilterGroup !== 'all';
    const hasCargoFilter = searchFilterCargo && searchFilterCargo !== 'all';
    const hasEscalaFilter = searchFilterEscala && searchFilterEscala !== 'all';
    updateSearchFilterUI();
    
    if (!termo && filterStatus === 'all' && !hasDateFilter && !hasGroupFilter && !hasCargoFilter && !hasEscalaFilter) {
        updateSearchSummary(0, currentData.length);
        renderSearchFavoritesPanel('');
        resultsContainer.innerHTML = '<p class="empty-state">Digite para buscar ou selecione um filtro...</p>';
        searchFilteredCache = [];
        searchRenderedCount = 0;
        searchTotalFiltered = 0;
        return;
    }

    // Save recent search — removed
    // Recent searches feature has been disabled

    runStandardSearch(termo, resultsContainer, filterStatus, hideAbsence);
    updateSearchDeepLink();
}

function runStandardSearch(termo, resultsContainer, filterStatus, hideAbsence) {
    const termoLimpo = termo.toUpperCase().trim();
    const termos = termoLimpo.split(/\s+/).filter(Boolean);
    const termosNorm = termos.map(t => normalizeSearchText(t));
    searchCurrentTerms = termos;
    const dateRange = { ...searchDateFilter };
    renderSearchFavoritesPanel(termoLimpo);
    
    let scored = [];
    for (const item of currentData) {
        if (hiddenUnits.has(item.posto)) continue;
        const score = termos.length ? scoreSearchMatch(item, termos, termosNorm) : 1;
        if (score > 0) scored.push({ item, score });
    }

    let resultados = scored;

    // Filtro de Status
    if (filterStatus !== 'all') {
        resultados = resultados.filter(({ item }) => {
            const statusInfo = getStatusInfo(item);
            const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
            const isFolga = statusInfo.text === 'FOLGA';
            if (filterStatus === 'plantao') return isPlantao;
            if (filterStatus === 'folga') return isFolga;
            if (filterStatus === 'ft') return statusInfo.text.includes('FT');
            if (filterStatus === 'afastado') return !!item.rotulo;
            if (filterStatus === 'favorites') return isCollaboratorFavorite(item.re);
            return true;
        });
    }

    // Filtro de Afastamentos
    if (hideAbsence) {
        resultados = resultados.filter(({ item }) => !item.rotulo);
    }
    if (hasDateRangeFilter(dateRange)) {
        resultados = resultados.filter(({ item }) => matchesFtDateFilterForCollaborator(item.re, dateRange));
    }
    // Filtro de Grupo
    if (searchFilterGroup && searchFilterGroup !== 'all') {
        resultados = resultados.filter(({ item }) => item.grupo === searchFilterGroup);
    }
    // Filtro de Cargo
    if (searchFilterCargo && searchFilterCargo !== 'all') {
        resultados = resultados.filter(({ item }) => (item.cargo || '').toUpperCase() === searchFilterCargo.toUpperCase());
    }
    // Filtro de Escala
    if (searchFilterEscala && searchFilterEscala !== 'all') {
        resultados = resultados.filter(({ item }) => (item.escala || '') === searchFilterEscala);
    }

    // Sort
    if (searchSortBy === 'relevance' && termos.length) {
        resultados.sort((a, b) => b.score - a.score);
    } else if (searchSortBy === 'nome') {
        resultados.sort((a, b) => (a.item.nome || '').localeCompare(b.item.nome || '', 'pt-BR'));
    } else if (searchSortBy === 'posto') {
        resultados.sort((a, b) => (a.item.posto || '').localeCompare(b.item.posto || '', 'pt-BR'));
    } else if (searchSortBy === 'escala') {
        resultados.sort((a, b) => (a.item.escala || '').localeCompare(b.item.escala || '', 'pt-BR'));
    } else if (searchSortBy === 'status') {
        resultados.sort((a, b) => {
            const sa = getStatusInfo(a.item).text;
            const sb = getStatusInfo(b.item).text;
            return sa.localeCompare(sb, 'pt-BR');
        });
    }
    if (!searchSortAsc && searchSortBy !== 'relevance') resultados.reverse();

    searchFilteredCache = resultados;
    searchTotalFiltered = resultados.length;
    searchRenderedCount = 0;
    searchSelectedIds.clear();
    searchSelectAll = false;

    updateSearchSummary(resultados.length, currentData.length);

    if (resultados.length === 0) {
        resultsContainer.innerHTML = `<p class="empty-state">Nenhum resultado encontrado.</p>`;
        return;
    }

    // Build toolbar + container
    const termsForHl = searchCurrentTerms;
    const termsNormForHl = termsForHl.map(t => normalizeSearchText(t));
    const toolbarHtml = buildSearchToolbar();
    const bulkBarHtml = `<div id="search-bulk-bar" class="search-bulk-bar hidden"></div>`;
    
    if (searchViewMode === 'table') {
        const headerHtml = `<div class="search-table-header"><div class="st-cell st-check"><input type="checkbox" onchange="toggleSearchSelectAll(this.checked)" title="Selecionar todos"></div><div class="st-cell st-name">Nome</div><div class="st-cell st-re">RE</div><div class="st-cell st-posto">Posto</div><div class="st-cell st-grupo">Grupo</div><div class="st-cell st-cargo">Cargo</div><div class="st-cell st-escala">Escala</div><div class="st-cell st-turno">Turno</div><div class="st-cell st-empresa">Empresa</div><div class="st-cell st-telefone">Telefone</div><div class="st-cell st-turma">Turma</div><div class="st-cell st-admissao">Admissão</div><div class="st-cell st-status">Status</div><div class="st-cell st-afastamento">Afastamento</div><div class="st-cell st-actions">Ações</div></div>`;
        const pageItems = resultados.slice(0, SEARCH_PAGE_SIZE);
        searchRenderedCount = pageItems.length;
        const rowsHtml = pageItems.map(({ item }) => renderSearchTableRow(item, termsForHl, termsNormForHl)).join('');
        const loadMoreHtml = resultados.length > SEARCH_PAGE_SIZE ? `<div class="search-load-more"><button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${resultados.length - SEARCH_PAGE_SIZE} restantes)</button></div>` : '';
        resultsContainer.innerHTML = toolbarHtml + bulkBarHtml + `<div class="search-table-wrap"><div class="search-table">${headerHtml}<div id="search-table-body">${rowsHtml}</div></div></div>` + loadMoreHtml;
    } else {
        // Group or flat cards
        if (searchGroupBy !== 'none') {
            const grouped = groupSearchResults(resultados);
            let html = toolbarHtml + bulkBarHtml;
            for (const g of grouped) {
                const pageItems = g.items.slice(0, SEARCH_PAGE_SIZE);
                html += `<div class="search-group"><div class="search-group-header"><span>${escapeHtml(g.label)}</span><span class="search-group-count">${g.items.length}</span></div>`;
                html += `<div class="results-grid">${pageItems.map(({ item }) => renderSearchCard(item, termsForHl, termsNormForHl)).join('')}</div></div>`;
            }
            searchRenderedCount = resultados.length; // grouped mode renders all
            resultsContainer.innerHTML = html;
        } else {
            const pageItems = resultados.slice(0, SEARCH_PAGE_SIZE);
            searchRenderedCount = pageItems.length;
            const cardsHtml = pageItems.map(({ item }) => renderSearchCard(item, termsForHl, termsNormForHl)).join('');
            const loadMoreHtml = resultados.length > SEARCH_PAGE_SIZE ? `<div class="search-load-more"><button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${resultados.length - SEARCH_PAGE_SIZE} restantes)</button></div>` : '';
            resultsContainer.innerHTML = toolbarHtml + bulkBarHtml + `<div class="results-grid" id="search-cards-grid">${cardsHtml}</div>` + loadMoreHtml;
        }
    }
}

function loadMoreSearchResults() {
    const remaining = searchFilteredCache.slice(searchRenderedCount, searchRenderedCount + SEARCH_PAGE_SIZE);
    if (!remaining.length) return;
    const termsForHl = searchCurrentTerms;
    const termsNormForHl = termsForHl.map(t => normalizeSearchText(t));
    
    if (searchViewMode === 'table') {
        const tbody = document.getElementById('search-table-body');
        if (tbody) {
            const fragment = document.createElement('div');
            fragment.innerHTML = remaining.map(({ item }) => renderSearchTableRow(item, termsForHl, termsNormForHl)).join('');
            while (fragment.firstChild) tbody.appendChild(fragment.firstChild);
        }
    } else {
        const grid = document.getElementById('search-cards-grid');
        if (grid) {
            const fragment = document.createElement('div');
            fragment.innerHTML = remaining.map(({ item }) => renderSearchCard(item, termsForHl, termsNormForHl)).join('');
            while (fragment.firstChild) grid.appendChild(fragment.firstChild);
        }
    }
    searchRenderedCount += remaining.length;
    // Update or remove load more button
    const btn = document.querySelector('.search-load-more');
    if (btn) {
        const left = searchTotalFiltered - searchRenderedCount;
        if (left <= 0) btn.remove();
        else btn.innerHTML = `<button class="btn-std" onclick="loadMoreSearchResults()">Carregar mais (${left} restantes)</button>`;
    }
}

function buildSearchToolbar() {
    const sortOptions = [
        { val: 'relevance', label: 'Relevância' },
        { val: 'nome', label: 'Nome A-Z' },
        { val: 'posto', label: 'Posto' },
        { val: 'escala', label: 'Escala' },
        { val: 'status', label: 'Status' }
    ];
    const groupOptions = [
        { val: 'none', label: 'Sem agrupamento' },
        { val: 'posto', label: 'Por Posto' },
        { val: 'status', label: 'Por Status' },
        { val: 'grupo', label: 'Por Grupo' },
        { val: 'escala', label: 'Por Escala' }
    ];
    return `<div class="search-toolbar">
        <div class="search-toolbar-left">
            <select class="search-toolbar-select" onchange="setSearchSort(this.value)" title="Ordenar por">
                ${sortOptions.map(o => `<option value="${o.val}" ${o.val === searchSortBy ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
            <button class="search-toolbar-btn" onclick="toggleSearchSortDir()" title="${searchSortAsc ? 'Ascendente' : 'Descendente'}">
                ${searchSortAsc ? '↑' : '↓'}
            </button>
            <select class="search-toolbar-select" onchange="setSearchGroupBy(this.value)" title="Agrupar por">
                ${groupOptions.map(o => `<option value="${o.val}" ${o.val === searchGroupBy ? 'selected' : ''}>${o.label}</option>`).join('')}
            </select>
        </div>
        <div class="search-toolbar-right">
            <button class="search-toolbar-btn ${searchViewMode === 'cards' ? 'active' : ''}" onclick="setSearchViewMode('cards')" title="Modo cards">☷</button>
            <button class="search-toolbar-btn ${searchViewMode === 'table' ? 'active' : ''}" onclick="setSearchViewMode('table')" title="Modo tabela">☰</button>
            <button class="search-toolbar-btn" onclick="exportSearchResults()" title="Exportar resultados">⤓</button>
        </div>
    </div>`;
}

function groupSearchResults(resultados) {
    const groups = {};
    const key = searchGroupBy;
    for (const entry of resultados) {
        let gKey = '';
        if (key === 'posto') gKey = entry.item.posto || 'Sem Posto';
        else if (key === 'status') { const s = getStatusInfo(entry.item); gKey = s.text || 'N/I'; }
        else if (key === 'grupo') gKey = entry.item.grupoLabel || entry.item.grupo || 'N/I';
        else if (key === 'escala') gKey = entry.item.escala || 'N/I';
        else gKey = 'Todos';
        if (!groups[gKey]) groups[gKey] = { label: gKey, items: [] };
        groups[gKey].items.push(entry);
    }
    return Object.values(groups).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
}

function getEscalaBadgeHtml(escala) {
    if (!escala) return '';
    const e = escala.toUpperCase();
    let cls = 'escala-badge-default';
    if (e.includes('12X36')) cls = 'escala-badge-12x36';
    else if (e.includes('44')) cls = 'escala-badge-44h';
    else if (e.includes('24')) cls = 'escala-badge-24h';
    else if (e.includes('SD') || e.includes('SEG')) cls = 'escala-badge-sd';
    return `<span class="escala-badge ${cls}" title="${escapeHtml(escala)}">${escapeHtml(escala)}</span>`;
}

function renderSearchCard(item, termsForHl, termsNormForHl) {
    const statusInfo = getStatusInfo(item);
    const retornoInfo = item.rotulo && item.rotuloFim ? `<span class="return-date">Retorno: ${formatDate(item.rotuloFim)}</span>` : '';
    const ftRelation = getFtRelationInfo(item.re);
    const ftRelationHtml = ftRelation
        ? `<div class="ft-link ${ftRelation.type}"><strong>FT:</strong> ${ftRelation.type === 'covering' ? 'Cobrindo' : 'Coberto por'} ${ftRelation.label}${ftRelation.unit ? ` • ${ftRelation.unit}` : ''}</div>`
        : '';
    const ftDetailHtml = buildFtDetailsHtml(item.re);
    const ftWeekPreview = buildFtWeekPreviewHtmlForRe(item.re);
    const roleLabel = getCollaboratorRoleLabel(item);
    const reJs = JSON.stringify(item.re || '');
    const nameJs = JSON.stringify(item.nome || '');
    const phoneJs = JSON.stringify(item.telefone || '');
    const unitJs = JSON.stringify(item.posto || '');
    const reJsAttr = escapeHtml(reJs);
    const nameJsAttr = escapeHtml(nameJs);
    const phoneJsAttr = escapeHtml(phoneJs);
    const unitJsAttr = escapeHtml(unitJs);
    const detailKey = item.id != null ? item.id : (item.re || '');
    const detailJs = JSON.stringify(detailKey);
    const detailJsAttr = escapeHtml(detailJs);
    const postoLabel = escapeHtml(item.posto || 'N/I');
    const hasAddress = !!getAddressForCollaborator(item);
    const canOpenMap = !!(item.re || item.nome || item.posto);
    const mapBtnClass = canOpenMap ? (hasAddress ? '' : 'map-icon-missing') : 'disabled-icon';
    const mapTitle = !canOpenMap ? 'Colaborador indisponível' : (hasAddress ? 'Ver endereço do colaborador' : 'Endereço não cadastrado');
    const favoriteActive = isCollaboratorFavorite(item.re);
    const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
    const isFolga = statusInfo.text === 'FOLGA';
    const isAfastado = ['FÉRIAS', 'ATESTADO', 'AFASTADO'].includes(statusInfo.text);
    const bgClass = isPlantao ? 'bg-plantao' : (isAfastado ? 'bg-afastado' : (isFolga ? 'bg-folga' : 'bg-indefinido'));
    const homenageado = isHomenageado(item);
    const selectedClass = searchSelectedIds.has(item.id) ? 'card-selected' : '';
    const activeDot = isPlantao
        ? '<span class="active-dot active-dot-on" title="Em plantão"></span>'
        : (isFolga ? '<span class="active-dot active-dot-off" title="De folga"></span>' : '<span class="active-dot active-dot-neutral" title="Status indefinido"></span>');

    // Highlighted fields
    const nomeHl = homenageado ? highlightSearchTerm(item.nome, termsForHl, termsNormForHl) + ' ✨' : highlightSearchTerm(item.nome, termsForHl, termsNormForHl);
    const reHl = highlightSearchTerm(item.re, termsForHl, termsNormForHl);
    const postoHl = highlightSearchTerm(item.posto || 'N/I', termsForHl, termsNormForHl);
    const cargoHl = highlightSearchTerm(roleLabel, termsForHl, termsNormForHl);

    let rotulosHtml = '';
    if (item.rotulo) {
        const rotulos = item.rotulo.split(',');
        const map = { 'FÉRIAS': 'Férias', 'ATESTADO': 'Atestado', 'AFASTADO': 'Afastado', 'FT': 'FT', 'TROCA': 'Troca' };
        rotulosHtml = rotulos.map(r => {
            let display = r;
            if (r === 'OUTRO' && item.rotuloDetalhe) display = item.rotuloDetalhe;
            return `<span class="label-badge">${map[r] || display}</span>`;
        }).join('');
    }

    const avatarHtml = buildCollabAvatarHtml(item.nome);
    const escalaBadge = getEscalaBadgeHtml(item.escala);
    // Hover preview data
    const previewPhone = item.telefone ? `Tel: ${item.telefone}` : 'Sem telefone';
    const previewData = escapeHtml(previewPhone);

    return `
        <div class="result-card ${bgClass} ${homenageado ? 'card-homenageado' : ''} ${selectedClass}" data-collab-re="${escapeHtml(item.re || '')}" data-collab-id="${item.id}" data-preview="${previewData}" style="border-left: 5px solid ${statusInfo.color}">
            <div class="card-header">
                <div class="header-left">
                    <input type="checkbox" class="card-select-check" ${searchSelectedIds.has(item.id) ? 'checked' : ''} onchange="toggleSearchSelect(${item.id}, this.checked)" title="Selecionar">
                    <div class="avatar-wrap">${avatarHtml}${activeDot}</div>
                    <div class="card-name-block">
                        <div class="card-name-row">
                            <a class="colaborador-nome colaborador-link ${homenageado ? 'homenageado-nome' : ''}" href="javascript:void(0)" onclick="openCollaboratorPage(${detailJsAttr})">${nomeHl}</a>
                            <span class="status-badge" style="background-color: ${statusInfo.color}">${statusInfo.text}</span>
                            ${rotulosHtml}
                            ${retornoInfo}
                        </div>
                        <div class="card-meta-row">
                            <span>RE ${reHl}</span>
                            <span class="meta-sep">·</span>
                            <span class="unit-link" onclick="navigateToUnit(${unitJsAttr})">${postoHl}</span>
                            <span class="meta-sep">·</span>
                            <span>${item.grupoLabel || 'N/I'}</span>
                            <span class="meta-sep">·</span>
                            <span>${cargoHl}</span>
                            <span class="meta-sep">·</span>
                            ${escalaBadge || `<span>${item.tipoEscala || ''} ${item.escala || 'N/I'}</span>`}
                        </div>
                    </div>
                </div>
                <div class="header-right card-actions-bar">
                    <button class="edit-btn-icon favorite-btn ${favoriteActive ? 'active' : ''}" onclick="toggleCollaboratorFavorite('${escapeHtml(item.re || '')}')" title="${favoriteActive ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${favoriteActive ? ICONS.starFilled : ICONS.star}</button>
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${reJsAttr}, ${nameJsAttr})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon ${mapBtnClass}" onclick="openAddressModalForCollaborator(${reJsAttr}, ${nameJsAttr}, ${unitJsAttr})" title="${mapTitle}" ${canOpenMap ? '' : 'disabled'}>${ICONS.mapPin}</button>
                    <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon" onclick="openEditModal(${item.id})" title="Editar">${ICONS.edit}</button>
                </div>
            </div>
            ${ftRelationHtml || ftDetailHtml || ftWeekPreview ? `<div class="card-ft-row">${ftRelationHtml}${ftDetailHtml}${ftWeekPreview}</div>` : ''}
            <div class="card-hover-preview">${previewData}</div>
        </div>
    `;
}

function renderSearchTableRow(item, termsForHl, termsNormForHl) {
    const statusInfo = getStatusInfo(item);
    const isPlantao = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT');
    const isFolga = statusInfo.text === 'FOLGA';
    const bgClass = isPlantao ? 'bg-plantao' : (item.rotulo ? 'bg-afastado' : (isFolga ? 'bg-folga' : 'bg-indefinido'));
    const detailKey = item.id != null ? item.id : (item.re || '');
    const detailJsAttr = escapeHtml(JSON.stringify(detailKey));
    const reJsAttr = escapeHtml(JSON.stringify(item.re || ''));
    const nameJsAttr = escapeHtml(JSON.stringify(item.nome || ''));
    const phoneJsAttr = escapeHtml(JSON.stringify(item.telefone || ''));
    const unitJsAttr = escapeHtml(JSON.stringify(item.posto || ''));
    return `<div class="search-table-row ${bgClass}" data-collab-id="${item.id}">
        <div class="st-cell st-check"><input type="checkbox" ${searchSelectedIds.has(item.id) ? 'checked' : ''} onchange="toggleSearchSelect(${item.id}, this.checked)"></div>
        <div class="st-cell st-name"><a class="colaborador-link" href="javascript:void(0)" onclick="openCollaboratorPage(${detailJsAttr})">${highlightSearchTerm(item.nome, termsForHl, termsNormForHl)}</a></div>
        <div class="st-cell st-re">${highlightSearchTerm(item.re, termsForHl, termsNormForHl)}</div>
        <div class="st-cell st-posto">${highlightSearchTerm(item.posto || 'N/I', termsForHl, termsNormForHl)}</div>
        <div class="st-cell st-grupo">${escapeHtml(item.grupoLabel || 'N/I')}</div>
        <div class="st-cell st-cargo">${highlightSearchTerm(getCollaboratorRoleLabel(item), termsForHl, termsNormForHl)}</div>
        <div class="st-cell st-escala">${getEscalaBadgeHtml(item.escala)}</div>
        <div class="st-cell st-turno">${escapeHtml(item.turno || 'N/I')}</div>
        <div class="st-cell st-empresa">${escapeHtml(item.empresa || 'N/I')}</div>
        <div class="st-cell st-telefone">${escapeHtml(item.telefone || '-')}</div>
        <div class="st-cell st-turma">${escapeHtml(item.turma || '-')}</div>
        <div class="st-cell st-admissao">${item.data_admissao ? formatDate(item.data_admissao) : '-'}</div>
        <div class="st-cell st-status"><span class="status-badge" style="background-color:${statusInfo.color}">${statusInfo.text}</span></div>
        <div class="st-cell st-afastamento">${escapeHtml(item.rotulo || '-')}</div>
        <div class="st-cell st-actions">
            <button class="edit-btn-icon" onclick="openEditModal(${item.id})" title="Editar">${ICONS.edit}</button>
            <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="Contato">${ICONS.whatsapp}</button>
        </div>
    </div>`;
}

// --- Search toolbar actions ---
function setSearchSort(val) { searchSortBy = val; realizarBusca(); }
function toggleSearchSortDir() { searchSortAsc = !searchSortAsc; realizarBusca(); }
function setSearchGroupBy(val) { searchGroupBy = val; realizarBusca(); }
function setSearchViewMode(mode) { searchViewMode = mode; realizarBusca(); }

// --- Multi-select ---
function toggleSearchSelect(id, checked) {
    if (checked) searchSelectedIds.add(id);
    else searchSelectedIds.delete(id);
    updateSearchBulkBar();
    // Update card class
    const card = document.querySelector(`[data-collab-id="${id}"]`);
    if (card) card.classList.toggle('card-selected', checked);
}

function toggleSearchSelectAll(checked) {
    searchSelectAll = checked;
    if (checked) {
        searchFilteredCache.forEach(({ item }) => searchSelectedIds.add(item.id));
    } else {
        searchSelectedIds.clear();
    }
    document.querySelectorAll('.card-select-check, .search-table-row input[type="checkbox"]').forEach(cb => cb.checked = checked);
    document.querySelectorAll('.result-card, .search-table-row').forEach(el => el.classList.toggle('card-selected', checked));
    updateSearchBulkBar();
}

function updateSearchBulkBar() {
    const bar = document.getElementById('search-bulk-bar');
    if (!bar) return;
    const count = searchSelectedIds.size;
    if (count === 0) { bar.classList.add('hidden'); return; }
    bar.classList.remove('hidden');
    bar.innerHTML = `
        <span><strong>${count}</strong> selecionado(s)</span>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('aviso')">Criar Aviso</button>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('mover')">Mover de Posto</button>
        <button class="btn-std btn-sm" onclick="bulkSearchAction('rotulo')">Alterar Rótulo</button>
        <button class="btn-std btn-sm btn-outline" onclick="toggleSearchSelectAll(false)">Limpar seleção</button>
    `;
}

function bulkSearchAction(action) {
    const ids = Array.from(searchSelectedIds);
    const items = ids.map(id => currentData.find(d => d.id === id)).filter(Boolean);
    if (!items.length) { showToast('Nenhum colaborador selecionado.', 'error'); return; }
    if (action === 'mover') {
        const postos = [...new Set(currentData.map(d => d.posto).filter(Boolean))].sort();
        const dest = prompt(`Mover ${items.length} colaborador(es) para qual posto?\n\nPostos disponíveis:\n${postos.slice(0, 20).join(', ')}...`);
        if (!dest) return;
        items.forEach(item => { item.posto = dest.toUpperCase(); });
        updateCollaboratorsBulk(items, { posto: dest.toUpperCase() }).then(ok => {
            if (ok) showToast(`${items.length} colaborador(es) movidos para ${dest.toUpperCase()}.`, 'success');
            else showToast('Falha ao atualizar no Supabase.', 'error');
            realizarBusca();
        });
    } else if (action === 'rotulo') {
        const rotulo = prompt('Novo rótulo (FÉRIAS, ATESTADO, AFASTADO, FT, TROCA, ou vazio para remover):');
        if (rotulo === null) return;
        items.forEach(item => { item.rotulo = rotulo.toUpperCase() || ''; });
        updateCollaboratorsBulk(items, { rotulo: rotulo.toUpperCase() || '' }).then(ok => {
            if (ok) showToast(`Rótulo atualizado para ${items.length} colaborador(es).`, 'success');
            else showToast('Falha ao atualizar no Supabase.', 'error');
            realizarBusca();
        });
    } else if (action === 'aviso') {
        showToast(`O módulo de avisos está desativado no momento. Nenhuma ação foi criada para ${items.length} colaborador(es).`, 'info');
    }
}

// --- Export search results ---
function exportSearchResults() {
    if (!searchFilteredCache.length) { showToast('Nenhum resultado para exportar.', 'error'); return; }
    const headers = ['Nome', 'RE', 'Posto', 'Cargo', 'Empresa', 'Escala', 'Grupo', 'Status', 'Rótulo', 'Telefone'];
    const rows = searchFilteredCache.map(({ item }) => {
        const status = getStatusInfo(item).text;
        return [item.nome, item.re, item.posto, item.cargo || '', item.empresa || '', item.escala || '', item.grupoLabel || item.grupo || '', status, item.rotulo || '', item.telefone || ''];
    });
    const csvContent = [headers, ...rows].map(r => r.map(c => `"${String(c || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `busca_resultados_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`${rows.length} resultados exportados.`, 'success');
}

// --- Substitute search removed (stubs) ---
function buildSubstituteReason() { return ""; }
function runSubstituteSearch() {}
function rankSubstituteCandidates(list) { return list; }

// 5.1 Busca Rápida Beta
function activateQuickBetaSearch() {
    renderQuickBetaSearch();
    fetchSupabaseCollaborators(false)
        .then(() => {
            if (currentTab === 'busca-beta') renderQuickBetaSearch();
        })
        .catch(err => AppErrorHandler.capture(err, { scope: 'quick-beta-collaborators' }, { silent: true }));
    fetchSupabaseUnits(false)
        .then(() => {
            if (currentTab === 'busca-beta') renderQuickBetaSearch();
        })
        .catch(err => AppErrorHandler.capture(err, { scope: 'quick-beta-units' }, { silent: true }));
    setTimeout(() => document.getElementById('qbeta-search-input')?.focus(), 0);
}

function setQuickBetaFilter(key, value) {
    if (!Object.prototype.hasOwnProperty.call(quickBetaState, key)) return;
    quickBetaState[key] = String(value || '').trim();
    if (key !== 'selectedKey') quickBetaState.selectedKey = '';
    renderQuickBetaSearch();
}

function clearQuickBetaSearch() {
    quickBetaState = {
        query: '',
        status: 'all',
        group: 'all',
        posto: 'all',
        cargo: 'all',
        escala: 'all',
        turno: 'all',
        turma: 'all',
        selectedKey: ''
    };
    renderQuickBetaSearch();
}

function normalizeQuickBetaValue(value) {
    return String(value ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toUpperCase();
}

function getQuickBetaRowKey(item, fallbackIndex = 0) {
    return String(item?.matricula || item?.re || item?.re_padrao || item?.cpf || fallbackIndex).trim();
}

function getQuickBetaRawCollaborator(item) {
    const raw = item?.__raw && typeof item.__raw === 'object' ? item.__raw : item;
    return raw && typeof raw === 'object' ? raw : {};
}

function getQuickBetaRawUnit(unit) {
    return unit && typeof unit === 'object' ? unit : {};
}

function buildQuickBetaUnitIndex(units = []) {
    const map = new Map();
    (units || []).forEach(unit => {
        const keys = [
            unit?.posto,
            unit?.nome,
            unit?.cliente
        ].map(normalizeUnitKey).filter(Boolean);
        keys.forEach(key => {
            if (!map.has(key)) map.set(key, unit);
        });
    });
    return map;
}

function collectQuickBetaSearchText(value, depth = 0) {
    if (value == null || depth > 2) return '';
    if (typeof value !== 'object') return String(value);
    if (Array.isArray(value)) return value.map(v => collectQuickBetaSearchText(v, depth + 1)).join(' ');
    return Object.entries(value)
        .filter(([key]) => !String(key).startsWith('__'))
        .map(([key, val]) => `${key} ${collectQuickBetaSearchText(val, depth + 1)}`)
        .join(' ');
}

function getQuickBetaRows() {
    const units = supaUnitsCache.items || [];
    quickBetaUnitIndex = buildQuickBetaUnitIndex(units);
    const source = allCollaboratorsCache.items && allCollaboratorsCache.items.length
        ? allCollaboratorsCache.items
        : (currentData || []);

    quickBetaRowsCache = (source || []).map((item, index) => {
        const unit = quickBetaUnitIndex.get(normalizeUnitKey(item?.posto || '')) || null;
        const rawCollaborator = getQuickBetaRawCollaborator(item);
        const rawUnit = getQuickBetaRawUnit(unit);
        const baseDuty = getDutyStatusByTurma(item?.turma);
        const duty = baseDuty;
        const key = getQuickBetaRowKey(item, index);
        const searchText = normalizeQuickBetaValue([
            collectQuickBetaSearchText(rawCollaborator),
            collectQuickBetaSearchText(rawUnit),
            item?.nome,
            item?.matricula,
            item?.re,
            item?.posto,
            item?.cargo,
            item?.escala,
            item?.turno,
            item?.telefone,
            unit?.endereco_formatado
        ].join(' '));

        return {
            key,
            item,
            unit,
            rawCollaborator,
            rawUnit,
            duty,
            baseDuty,
            searchText
        };
    });

    return quickBetaRowsCache;
}

function filterQuickBetaRows(rows) {
    const queryTerms = normalizeQuickBetaValue(quickBetaState.query).split(/\s+/).filter(Boolean);
    return (rows || []).filter(row => {
        const item = row.item || {};
        const dutyCode = row.baseDuty?.code || 'sem_turma';

        if (queryTerms.length && !queryTerms.every(term => row.searchText.includes(term))) return false;
        if (quickBetaState.status === 'plantao' && row.duty.text !== 'PLANTÃO') return false;
        if (quickBetaState.status === 'folga' && row.duty.text !== 'FOLGA') return false;
        if (quickBetaState.group !== 'all' && String(item.grupo || '') !== quickBetaState.group) return false;
        if (quickBetaState.posto !== 'all' && normalizeQuickBetaValue(item.posto) !== quickBetaState.posto) return false;
        if (quickBetaState.cargo !== 'all' && normalizeQuickBetaValue(item.cargo) !== quickBetaState.cargo) return false;
        if (quickBetaState.escala !== 'all' && normalizeQuickBetaValue(item.escala) !== quickBetaState.escala) return false;
        if (quickBetaState.turno !== 'all' && normalizeQuickBetaValue(item.turno) !== quickBetaState.turno) return false;
        if (quickBetaState.turma === '1' && String(item.turma || '') !== '1') return false;
        if (quickBetaState.turma === '2' && String(item.turma || '') !== '2') return false;
        if (quickBetaState.turma === 'invalid' && dutyCode !== 'sem_turma') return false;
        return true;
    }).sort((a, b) => {
        const aDuty = a.duty.text === 'FOLGA' ? 0 : a.duty.text === 'PLANTÃO' ? 1 : 2;
        const bDuty = b.duty.text === 'FOLGA' ? 0 : b.duty.text === 'PLANTÃO' ? 1 : 2;
        if (aDuty !== bDuty) return aDuty - bDuty;
        return String(a.item?.nome || '').localeCompare(String(b.item?.nome || ''), 'pt-BR');
    });
}

function buildQuickBetaSelectOptions(rows, getter, allLabel, selectedValue) {
    const map = new Map();
    (rows || []).forEach(row => {
        const raw = getter(row);
        const value = normalizeQuickBetaValue(raw);
        if (!value || map.has(value)) return;
        map.set(value, String(raw || '').trim());
    });
    const options = Array.from(map.entries())
        .sort((a, b) => a[1].localeCompare(b[1], 'pt-BR'))
        .map(([value, label]) => `<option value="${escapeHtml(value)}" ${selectedValue === value ? 'selected' : ''}>${escapeHtml(label)}</option>`)
        .join('');
    return `<option value="all" ${selectedValue === 'all' ? 'selected' : ''}>${escapeHtml(allLabel)}</option>${options}`;
}

function hydrateQuickBetaFilters(rows) {
    const input = document.getElementById('qbeta-search-input');
    if (input && input.value !== quickBetaState.query) input.value = quickBetaState.query;

    const status = document.getElementById('qbeta-status-filter');
    if (status) status.value = quickBetaState.status || 'all';

    const group = document.getElementById('qbeta-group-filter');
    if (group) {
        const labelMap = getGroupLabelMap();
        const groups = Array.from(new Set((rows || []).map(row => row.item?.grupo).filter(Boolean)))
            .sort((a, b) => String(labelMap[a] || a).localeCompare(String(labelMap[b] || b), 'pt-BR'));
        group.innerHTML = `<option value="all" ${quickBetaState.group === 'all' ? 'selected' : ''}>Todos os grupos</option>` +
            groups.map(key => `<option value="${escapeHtml(key)}" ${quickBetaState.group === key ? 'selected' : ''}>${escapeHtml(labelMap[key] || key)}</option>`).join('');
        if (!Array.from(group.options).some(opt => opt.value === quickBetaState.group)) quickBetaState.group = 'all';
        group.value = quickBetaState.group;
    }

    const filterConfigs = [
        ['qbeta-posto-filter', row => row.item?.posto, 'Todos os postos', 'posto'],
        ['qbeta-cargo-filter', row => row.item?.cargo, 'Todos os cargos', 'cargo'],
        ['qbeta-escala-filter', row => row.item?.escala, 'Todas as escalas', 'escala'],
        ['qbeta-turno-filter', row => row.item?.turno, 'Todos os turnos', 'turno']
    ];

    filterConfigs.forEach(([id, getter, label, key]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = buildQuickBetaSelectOptions(rows, getter, label, quickBetaState[key]);
        if (!Array.from(el.options).some(opt => opt.value === quickBetaState[key])) {
            quickBetaState[key] = 'all';
            el.value = 'all';
        }
    });

    const turma = document.getElementById('qbeta-turma-filter');
    if (turma) turma.value = quickBetaState.turma || 'all';
}

function renderQuickBetaSearch() {
    const shell = document.getElementById('tab-content-busca-beta');
    if (!shell) return;

    const rows = getQuickBetaRows();
    hydrateQuickBetaFilters(rows);
    const filtered = filterQuickBetaRows(rows);
    const selectedExists = filtered.some(row => row.key === quickBetaState.selectedKey);
    if (!selectedExists) quickBetaState.selectedKey = '';

    renderQuickBetaKpis(rows, filtered);

    const countEl = document.getElementById('qbeta-result-count');
    if (countEl) countEl.textContent = `${filtered.length} colaborador${filtered.length === 1 ? '' : 'es'}`;

    const updatedEl = document.getElementById('qbeta-updated');
    if (updatedEl) updatedEl.textContent = lastUpdatedAt ? `Atualizado ${lastUpdatedAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Base carregada';

    const list = document.getElementById('qbeta-results-list');
    if (!list) return;
    if (!filtered.length) {
        list.innerHTML = `<div class="qbeta-empty-list">Nenhum colaborador encontrado para os filtros atuais.</div>`;
        renderQuickBetaEmptyDetail();
        return;
    }

    list.innerHTML = filtered.map(renderQuickBetaCard).join('');

    if (quickBetaState.selectedKey) {
        const selected = filtered.find(row => row.key === quickBetaState.selectedKey);
        if (selected) renderQuickBetaDetail(selected);
    } else {
        renderQuickBetaEmptyDetail();
    }
}

function renderQuickBetaKpis(rows, filtered) {
    const el = document.getElementById('qbeta-kpis');
    if (!el) return;
    const source = filtered || [];
    const total = source.length;
    const plantao = source.filter(row => row.duty.text === 'PLANTÃO').length;
    const folga = source.filter(row => row.duty.text === 'FOLGA').length;
    const semTurma = source.filter(row => row.baseDuty?.code === 'sem_turma').length;
    const semUnidade = source.filter(row => !row.unit).length;
    el.innerHTML = [
        ['Resultados', total, 'Registros filtrados'],
        ['Plantão', plantao, 'Trabalhando hoje'],
        ['Folga', folga, 'Potencial cobertura'],
        ['Sem turma', semTurma, 'Corrigir na planilha'],
        ['Sem unidade', semUnidade, 'Posto sem vínculo']
    ].map(([label, value, hint]) => `
        <div class="qbeta-kpi">
            <span>${label}</span>
            <strong>${value}</strong>
            <small>${hint}</small>
        </div>
    `).join('');
}

function renderQuickBetaCard(row) {
    const item = row.item || {};
    const duty = row.duty || { text: 'N/I', color: '#64748b' };
    const keyAttr = escapeHtml(JSON.stringify(row.key));
    const name = item.nome || item.colaborador || 'Sem nome';
    const statusClass = duty.text === 'PLANTÃO' ? 'plantao' : duty.text === 'FOLGA' ? 'folga' : 'indefinido';
    const selected = row.key === quickBetaState.selectedKey ? 'selected' : '';
    const phoneJs = escapeHtml(JSON.stringify(item.telefone || ''));
    const nameJs = escapeHtml(JSON.stringify(name));
    const reJs = escapeHtml(JSON.stringify(item.re || item.matricula || ''));
    const unitJs = escapeHtml(JSON.stringify(item.posto || ''));
    const detailKey = escapeHtml(JSON.stringify(row.key));
    return `
        <article class="qbeta-card ${statusClass} ${selected}" data-qbeta-key="${escapeHtml(row.key)}" onclick="openQuickBetaDetail(${detailKey})">
            <div class="qbeta-card-top">
                <div class="qbeta-person">
                    ${buildCollabAvatarHtml(name)}
                    <div>
                        <strong>${escapeHtml(name)}</strong>
                        <span>${escapeHtml(item.matricula || item.re || 'Sem matrícula')}</span>
                    </div>
                </div>
                <span class="qbeta-status ${statusClass}">${escapeHtml(duty.text)}</span>
            </div>
            <div class="qbeta-card-grid">
                <span><b>Posto</b>${escapeHtml(item.posto || 'N/I')}</span>
                <span><b>Cargo</b>${escapeHtml(item.cargo || 'N/I')}</span>
                <span><b>Escala</b>${escapeHtml(item.escala || 'N/I')}</span>
                <span><b>Turno</b>${escapeHtml(item.turno || 'N/I')}</span>
                <span><b>Turma</b>${escapeHtml(item.turma || 'Sem turma')}</span>
                <span><b>Telefone</b>${escapeHtml(item.telefone || 'N/I')}</span>
            </div>
            <div class="qbeta-card-actions" onclick="event.stopPropagation()">
                <button type="button" onclick="openPhoneModal(${nameJs}, ${phoneJs})" ${item.telefone ? '' : 'disabled'}>Contato</button>
                <button type="button" onclick="openAddressModalForCollaborator(${reJs}, ${nameJs}, ${unitJs})">Mapa</button>
                <button type="button" onclick="navigateToUnit(${unitJs})">Unidade</button>
                <button type="button" onclick="copyQuickBetaSummary(${keyAttr})">Copiar</button>
            </div>
        </article>
    `;
}

function openQuickBetaDetail(key) {
    quickBetaState.selectedKey = String(key || '');
    const row = quickBetaRowsCache.find(item => item.key === quickBetaState.selectedKey);
    if (!row) {
        renderQuickBetaSearch();
        return;
    }
    document.querySelectorAll('.qbeta-card').forEach(card => card.classList.remove('selected'));
    const escaped = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(quickBetaState.selectedKey) : quickBetaState.selectedKey.replace(/"/g, '\\"');
    document.querySelector(`.qbeta-card[data-qbeta-key="${escaped}"]`)?.classList.add('selected');
    renderQuickBetaDetail(row);
}

function renderQuickBetaEmptyDetail() {
    const panel = document.getElementById('qbeta-detail-panel');
    if (!panel) return;
    panel.innerHTML = `
        <div class="qbeta-empty-detail">
            <strong>Selecione um colaborador</strong>
            <span>O painel exibirá dados completos da planilha e da unidade vinculada.</span>
        </div>
    `;
}

function getQuickBetaField(raw, keys) {
    for (const key of keys) {
        if (raw?.[key] !== undefined && raw?.[key] !== null && raw?.[key] !== '') return raw[key];
    }
    return '';
}

function renderQuickBetaInfoGrid(fields) {
    return `<div class="qbeta-info-grid">${fields.map(([label, value]) => `
        <div class="qbeta-info-item">
            <span>${escapeHtml(label)}</span>
            <strong>${escapeHtml(value || 'N/I')}</strong>
        </div>
    `).join('')}</div>`;
}

function renderQuickBetaSection(title, fields) {
    return `
        <section class="qbeta-detail-section">
            <h4>${escapeHtml(title)}</h4>
            ${renderQuickBetaInfoGrid(fields)}
        </section>
    `;
}

function renderQuickBetaRawTable(title, raw) {
    const entries = Object.entries(raw || {})
        .filter(([key]) => !String(key).startsWith('__'))
        .sort((a, b) => a[0].localeCompare(b[0], 'pt-BR'));
    if (!entries.length) {
        return renderQuickBetaSection(title, [['Status', 'Sem dados vinculados']]);
    }
    return `
        <section class="qbeta-detail-section qbeta-raw-section">
            <h4>${escapeHtml(title)}</h4>
            <div class="qbeta-raw-table">
                ${entries.map(([key, value]) => `
                    <div>
                        <span>${escapeHtml(key)}</span>
                        <strong>${escapeHtml(value == null || value === '' ? 'N/I' : String(value))}</strong>
                    </div>
                `).join('')}
            </div>
        </section>
    `;
}

function renderQuickBetaDetail(row) {
    const panel = document.getElementById('qbeta-detail-panel');
    if (!panel) return;
    const item = row.item || {};
    const unit = row.unit || null;
    const raw = row.rawCollaborator || {};
    const rawUnit = row.rawUnit || {};
    const name = item.nome || item.colaborador || 'Sem nome';
    const statusClass = row.duty.text === 'PLANTÃO' ? 'plantao' : row.duty.text === 'FOLGA' ? 'folga' : 'indefinido';
    const nameJs = escapeHtml(JSON.stringify(name));
    const phoneJs = escapeHtml(JSON.stringify(item.telefone || ''));
    const reJs = escapeHtml(JSON.stringify(item.re || item.matricula || ''));
    const unitJs = escapeHtml(JSON.stringify(item.posto || ''));

    panel.innerHTML = `
        <div class="qbeta-detail-header ${statusClass}">
            <div>
                <span>Colaborador selecionado</span>
                <h3>${escapeHtml(name)}</h3>
                <p>${escapeHtml(item.posto || 'Unidade não vinculada')}</p>
            </div>
            <strong>${escapeHtml(row.duty.text)}</strong>
        </div>
        <div class="qbeta-detail-actions">
            <button type="button" onclick="openPhoneModal(${nameJs}, ${phoneJs})" ${item.telefone ? '' : 'disabled'}>Contato</button>
            <button type="button" onclick="openAddressModalForCollaborator(${reJs}, ${nameJs}, ${unitJs})">Mapa</button>
            <button type="button" onclick="copyQuickBetaSummary(${escapeHtml(JSON.stringify(row.key))})">Copiar resumo</button>
        </div>
        ${renderQuickBetaSection('Operação', [
            ['Matrícula', item.matricula || raw.matricula],
            ['RE padrão', item.re_padrao || raw.re_padrao],
            ['RE novo', item.re_novo || raw.re_novo],
            ['Cargo', item.cargo || raw.cargo],
            ['Posto', item.posto || raw.posto],
            ['Escala', item.escala || raw.escala],
            ['Turno', item.turno || raw.turno],
            ['Turma', item.turma || raw.turma],
            ['Admissão', item.admissao || raw.admissao]
        ])}
        ${renderQuickBetaSection('Contato', [
            ['Telefone', item.telefone || raw.telefone],
            ['Telefone emergência', item.telefone_de_emergencia || raw.telefone_de_emergencia],
            ['Endereço', item.endereco || raw.endereco],
            ['Pasta Google Drive', item.pasta_google_drive || raw.pasta_google_drive]
        ])}
        ${renderQuickBetaSection('Unidade vinculada', unit ? [
            ['Posto', unit.posto || unit.nome],
            ['Cliente', unit.cliente],
            ['Empresa', unit.empresa || unit.empresa_bombeiros || unit.empresa_servicos || unit.empresa_seguranca || unit.empresa_rb],
            ['Unidade de negócio', unit.unidade_de_negocio || unit.unidade_de_negocio_vigilancia || unit.unidade_de_negocio_servicos || unit.unidade_de_negocio_rb],
            ['Endereço', unit.endereco_formatado || formatUnitAddress(unit)],
            ['E-mail supervisor', unit.email_supervisor_da_unidade],
            ['E-mail SESMT', unit.email_sesmt]
        ] : [['Status', 'Unidade não vinculada pelo posto']])}
        ${renderQuickBetaSection('Documentos e treinamentos', [
            ['ASO', getQuickBetaField(raw, ['aso'])],
            ['Reciclagem bombeiro', getQuickBetaField(raw, ['reciclagem_bombeiro'])],
            ['Reciclagem vigilante', getQuickBetaField(raw, ['reciclagem_vigilante'])],
            ['CNV vigilante', getQuickBetaField(raw, ['cnv_vigilante'])],
            ['NR10', getQuickBetaField(raw, ['nr10'])],
            ['NR20', getQuickBetaField(raw, ['nr20'])],
            ['NR33', getQuickBetaField(raw, ['nr33'])],
            ['NR35', getQuickBetaField(raw, ['nr35'])],
            ['DEA', getQuickBetaField(raw, ['dea'])],
            ['Heliponto', getQuickBetaField(raw, ['heliponto'])],
            ['Uniforme', getQuickBetaField(raw, ['uniforme'])],
            ['PGR unidade', getQuickBetaField(rawUnit, ['pgr'])],
            ['PCMSO unidade', getQuickBetaField(rawUnit, ['pcmso'])]
        ])}
        ${renderQuickBetaSection('Dados pessoais', [
            ['CPF', getQuickBetaField(raw, ['cpf'])],
            ['RG', getQuickBetaField(raw, ['rg'])],
            ['PIS', getQuickBetaField(raw, ['pis'])],
            ['CTPS número', getQuickBetaField(raw, ['ctps_numero'])],
            ['CTPS série', getQuickBetaField(raw, ['ctps_serie'])],
            ['Data nascimento', getQuickBetaField(raw, ['data_nascimento'])],
            ['Idade', getQuickBetaField(raw, ['idade'])]
        ])}
        ${renderQuickBetaSection('Observações e histórico', [
            ['Férias', getQuickBetaField(raw, ['ferias'])],
            ['Suspensão', getQuickBetaField(raw, ['suspensao'])],
            ['Advertência', getQuickBetaField(raw, ['advertencia'])],
            ['Recolhimento', getQuickBetaField(raw, ['recolhimento'])],
            ['Observações', getQuickBetaField(raw, ['observacoes'])]
        ])}
        ${renderQuickBetaRawTable('Dados brutos do colaborador', raw)}
        ${renderQuickBetaRawTable('Dados brutos da unidade', rawUnit)}
    `;
}

function copyQuickBetaSummary(key) {
    const row = quickBetaRowsCache.find(item => item.key === String(key || ''));
    if (!row) return;
    const item = row.item || {};
    const unit = row.unit || {};
    copyTextToClipboard([
        `Nome: ${item.nome || item.colaborador || ''}`,
        `Matrícula/RE: ${item.matricula || item.re || ''}`,
        `Posto: ${item.posto || ''}`,
        `Cargo: ${item.cargo || ''}`,
        `Escala: ${item.escala || ''}`,
        `Turno: ${item.turno || ''}`,
        `Turma: ${item.turma || ''}`,
        `Status: ${row.duty?.text || ''}`,
        `Telefone: ${item.telefone || ''}`,
        `Endereço unidade: ${unit.endereco_formatado || formatUnitAddress(unit) || ''}`
    ].join('\n'));
}

// 5.2 Formalizador de Mudanças de Postos
function getFormalizadorDefaultDraft() {
    return {
        type: '', requester: { nome: '', cargo: '', telefone: '', email: '' }, collaboratorKey: '', destinationKey: '', coverageKey: '',
        queries: { collaborator: '', destination: '', coverage: '' },
        form: { prioridade: 'normal', data_efetiva: getTodayKey(), data_fim: '', motivo_categoria: '', motivo_observacao: '', email_recipients: '' },
        benefits: { vale_transporte: false, vale_refeicao: false, adicional_noturno: false, intrajornada: false, escala_turno: false, observacoes: '' },
        coverage: { tipo: '', periodo: '', observacoes: '' }, focus: 'request'
    };
}

function mergeFormalizadorDraft(patch = {}) {
    formalizadorState = { ...formalizadorState, ...patch, requester: { ...formalizadorState.requester, ...(patch.requester || {}) }, queries: { ...formalizadorState.queries, ...(patch.queries || {}) }, form: { ...formalizadorState.form, ...(patch.form || {}) }, benefits: { ...formalizadorState.benefits, ...(patch.benefits || {}) }, coverage: { ...formalizadorState.coverage, ...(patch.coverage || {}) } };
}

function loadFormalizadorRequester() {
    try {
        const parsed = JSON.parse(localStorage.getItem(FORMALIZADOR_REQUESTER_KEY) || 'null');
        if (!parsed || typeof parsed !== 'object') return;
        formalizadorState.requester = { nome: String(parsed.nome || ''), cargo: String(parsed.cargo || ''), telefone: String(parsed.telefone || ''), email: String(parsed.email || '') };
    } catch {}
}

function saveFormalizadorRequester() {
    try { localStorage.setItem(FORMALIZADOR_REQUESTER_KEY, JSON.stringify(formalizadorState.requester || {})); } catch {}
}

function resetFormalizadorDraft() {
    const keepRequester = { ...(formalizadorState.requester || {}) };
    const next = getFormalizadorDefaultDraft();
    formalizadorState = { ...formalizadorState, ...next, requester: keepRequester, history: formalizadorState.history || [], events: formalizadorState.events || {}, historyFilters: formalizadorState.historyFilters || { search: '', status: 'all', tipo: 'all' }, selectedHistoryId: formalizadorState.selectedHistoryId || '', lastCreatedId: '', lastCreatedRecord: null };
    renderFormalizador();
}

function startNewFormalizacao() { resetFormalizadorDraft(); showToast('Nova solicitação iniciada.', 'info'); }

async function activateFormalizador() {
    const root = document.getElementById('formalizador-root');
    if (root) root.innerHTML = `<div class="formalizador-loading">Carregando portal, colaboradores, unidades e histórico...</div>`;
    loadFormalizadorRequester();
    if (!formalizadorState.form?.data_efetiva) mergeFormalizadorDraft({ form: { data_efetiva: getTodayKey() } });
    try { await Promise.all([fetchSupabaseCollaborators(false), fetchSupabaseUnits(false), fetchFormalizacoes(false)]); }
    catch (err) { AppErrorHandler.capture(err, { scope: 'formalizador-activate' }, { silent: true }); }
    renderFormalizador();
}

async function fetchFormalizacoes(force = false) {
    if (!supabaseClient) return formalizadorState.history || [];
    const now = Date.now();
    if (!force && formalizadorCache.items && (now - formalizadorCache.updatedAt) < SUPABASE_CACHE_TTL_MS) {
        formalizadorState.history = formalizadorCache.items || [];
        formalizadorState.events = formalizadorEventsCache.items || {};
        return formalizadorState.history;
    }
    try {
        const { data, error } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_postos).select('*').order('created_at', { ascending: false }).limit(500);
        if (error) throw error;
        formalizadorCache = { items: data || [], updatedAt: now, error: '' };
        formalizadorState.history = formalizadorCache.items;
        await fetchFormalizacaoEvents(force);
        return formalizadorState.history;
    } catch (err) {
        formalizadorCache = { ...(formalizadorCache || {}), error: String(err?.message || err || 'Erro ao carregar formalizações') };
        AppErrorHandler.capture(err, { scope: 'formalizador-fetch-history' }, { silent: true });
        return formalizadorState.history || [];
    }
}

async function fetchFormalizacaoEvents(force = false) {
    if (!supabaseClient) return formalizadorState.events || {};
    const now = Date.now();
    if (!force && formalizadorEventsCache.updatedAt && (now - formalizadorEventsCache.updatedAt) < SUPABASE_CACHE_TTL_MS) {
        formalizadorState.events = formalizadorEventsCache.items || {};
        return formalizadorState.events;
    }
    try {
        const { data, error } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_status_events).select('*').order('created_at', { ascending: false }).limit(1200);
        if (error) throw error;
        const grouped = {};
        (data || []).forEach(event => {
            const key = String(event.formalizacao_id || '');
            if (!key) return;
            if (!grouped[key]) grouped[key] = [];
            grouped[key].push(event);
        });
        Object.keys(grouped).forEach(key => grouped[key].sort((a, b) => Date.parse(a.created_at || '') - Date.parse(b.created_at || '')));
        formalizadorEventsCache = { items: grouped, updatedAt: now, error: '' };
        formalizadorState.events = grouped;
        return grouped;
    } catch (err) {
        formalizadorEventsCache = { ...(formalizadorEventsCache || {}), error: String(err?.message || err || 'Erro ao carregar eventos') };
        AppErrorHandler.capture(err, { scope: 'formalizador-fetch-events' }, { silent: true });
        return formalizadorState.events || {};
    }
}

function getFormalizadorCollaborators() {
    const source = allCollaboratorsCache.items && allCollaboratorsCache.items.length ? allCollaboratorsCache.items : (currentData || []);
    return (source || []).map((item, index) => ({ key: getFormalizadorCollaboratorKey(item, index), item, unit: getFormalizadorUnitForCollaborator(item) }));
}
function getFormalizadorUnits() { return (supaUnitsCache.items || []).map((unit, index) => ({ key: getFormalizadorUnitKey(unit, index), unit })); }
function getFormalizadorCollaboratorKey(item, fallbackIndex = 0) { return String(item?.matricula || item?.re || item?.re_padrao || item?.re_novo || `${item?.nome || item?.colaborador || 'colaborador'}-${fallbackIndex}`).trim(); }
function getFormalizadorUnitKey(unit, fallbackIndex = 0) { return normalizeUnitKey(unit?.posto || unit?.nome || unit?.cliente || `unidade-${fallbackIndex}`); }
function getFormalizadorUnitForCollaborator(item) { const units = supaUnitsCache.items || []; if (!units.length) return null; return buildQuickBetaUnitIndex(units).get(normalizeUnitKey(item?.posto || '')) || null; }
function getSelectedFormalizadorCollaborator() { return getFormalizadorCollaborators().find(row => row.key === String(formalizadorState.collaboratorKey || '')) || null; }
function getSelectedFormalizadorDestination() { return getFormalizadorUnits().find(row => row.key === String(formalizadorState.destinationKey || '')) || null; }
function getSelectedFormalizadorCoverage() { return getFormalizadorCollaborators().find(row => row.key === String(formalizadorState.coverageKey || '')) || null; }
function normalizeFormalizadorSearch(value) { return normalizeQuickBetaValue(value); }
function formalizadorIncludesQuery(searchText, query) { const terms = normalizeFormalizadorSearch(query).split(/\s+/).filter(Boolean); return !terms.length || terms.every(term => searchText.includes(term)); }
function buildFormalizadorSearchText(...values) { return normalizeFormalizadorSearch(values.map(v => collectQuickBetaSearchText(v)).join(' ')); }
function getFormalizadorFilteredCollaborators(kind = 'collaborator', limit = 12) {
    const query = formalizadorState.queries?.[kind] || '';
    const selected = kind === 'coverage' ? formalizadorState.coverageKey : formalizadorState.collaboratorKey;
    return getFormalizadorCollaborators().filter(row => row.key !== selected || kind !== 'coverage').filter(row => formalizadorIncludesQuery(buildFormalizadorSearchText(row.item, row.unit), query)).sort((a, b) => String(a.item?.nome || a.item?.colaborador || '').localeCompare(String(b.item?.nome || b.item?.colaborador || ''), 'pt-BR')).slice(0, limit);
}
function getFormalizadorFilteredUnits(limit = 12) { return getFormalizadorUnits().filter(row => formalizadorIncludesQuery(buildFormalizadorSearchText(row.unit), formalizadorState.queries?.destination || '')).sort((a, b) => String(a.unit?.posto || a.unit?.nome || '').localeCompare(String(b.unit?.posto || b.unit?.nome || ''), 'pt-BR')).slice(0, limit); }
function formatFormalizadorType(type) { return FORMALIZADOR_TYPES[type]?.label || String(type || 'Não definido'); }
function formatFormalizadorStatus(status) { return FORMALIZADOR_STATUS[status] || String(status || 'Indefinido'); }
function formatFormalizadorPriority(priority) { return ({ baixa: 'Baixa', normal: 'Normal', alta: 'Alta', urgente: 'Urgente' }[priority] || 'Normal'); }
function formatFormalizadorDate(value) { if (!value) return ''; const key = normalizeFtDateKey(value); if (!key) return String(value); const [y, m, d] = key.split('-'); return `${d}/${m}/${y}`; }
function formatFormalizadorDateTime(value) { if (!value) return ''; const date = new Date(value); return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }); }
function getFormalizadorCollabName(item = {}) { return item.nome || item.colaborador || ''; }
function getFormalizadorUnitName(unit = {}) { return unit.posto || unit.nome || unit.cliente || ''; }
function getFormalizadorCompany(value = {}) { return pickFirstDefined(value?.empresa, value?.empresa_bombeiros, value?.empresa_servicos, value?.empresa_seguranca, value?.empresa_rb, value?.cliente); }
function getFormalizadorTypeConfig() { return FORMALIZADOR_TYPES[formalizadorState.type] || null; }

function setFormalizadorFocus(focus) {
    formalizadorState.focus = focus || 'request';
    renderFormalizador();
    setTimeout(() => document.querySelector(`[data-formalizador-section="${formalizadorState.focus}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}
function selectFormalizadorType(type) { if (!FORMALIZADOR_TYPES[type]) return; formalizadorState.type = type; formalizadorState.focus = 'form'; if (!FORMALIZADOR_TYPES[type].needsDestination) { formalizadorState.destinationKey = ''; formalizadorState.queries.destination = ''; } renderFormalizador(); }
function setFormalizadorRequesterField(field, value) { if (!Object.prototype.hasOwnProperty.call(formalizadorState.requester, field)) return; formalizadorState.requester[field] = value; saveFormalizadorRequester(); }
function setFormalizadorFormField(field, value) { if (!Object.prototype.hasOwnProperty.call(formalizadorState.form, field)) return; formalizadorState.form[field] = value; }
function setFormalizadorBenefit(field, value) { if (!Object.prototype.hasOwnProperty.call(formalizadorState.benefits, field)) return; formalizadorState.benefits[field] = value; }
function setFormalizadorCoverageTextField(field, value) { if (!Object.prototype.hasOwnProperty.call(formalizadorState.coverage, field)) return; formalizadorState.coverage[field] = value; }
function setFormalizadorCoverageType(value) { if (!FORMALIZADOR_COVERAGE_TYPES[value]) return; formalizadorState.coverage.tipo = value; if (value === 'sem_cobertura') { formalizadorState.coverageKey = ''; formalizadorState.queries.coverage = ''; } renderFormalizador(); }
function setFormalizadorQuery(kind, value) { if (!formalizadorState.queries) formalizadorState.queries = {}; formalizadorState.queries[kind] = value || ''; renderFormalizadorPicker(kind); }
function selectFormalizadorCollaborator(key) { formalizadorState.collaboratorKey = String(key || ''); renderFormalizador(); }
function selectFormalizadorDestination(key) { formalizadorState.destinationKey = String(key || ''); renderFormalizador(); }
function selectFormalizadorCoverage(key) { formalizadorState.coverageKey = String(key || ''); renderFormalizador(); }
function setFormalizadorHistoryFilter(field, value) { if (!formalizadorState.historyFilters) formalizadorState.historyFilters = { search: '', status: 'all', tipo: 'all' }; formalizadorState.historyFilters[field] = value || ''; renderFormalizadorHistoryList(); }
function selectFormalizacaoHistory(id) { formalizadorState.selectedHistoryId = String(id || ''); renderFormalizadorHistoryList(); }

function renderFormalizador() {
    const root = document.getElementById('formalizador-root');
    if (!root) return;
    const validation = validateFormalizador({ silent: true });
    const setupWarning = formalizadorCache.error ? `<div class="formalizador-alert danger">O histórico do Formalizador não carregou. Verifique o SQL do Formalizador no Supabase antes de usar em produção.</div>` : '';
    root.innerHTML = `
        <div class="formalizador-app-hero">
            <div><span class="formalizador-eyebrow">Portal de solicitações operacionais</span><h2>Formalizador</h2><p>Registre mudanças de posto, remanejamentos, desligamentos, experiências, benefícios e coberturas como casos rastreáveis, com comunicação pronta para envio.</p></div>
            <div class="formalizador-health-grid"><span><strong>${getFormalizadorCollaborators().length}</strong> colaboradores</span><span><strong>${getFormalizadorUnits().length}</strong> unidades</span><span><strong>${(formalizadorState.history || []).length}</strong> protocolos</span><span><strong>${validation.ok ? 'Pronto' : 'Pendente'}</strong> validação</span></div>
        </div>${setupWarning}
        <div class="formalizador-portal-grid">
            <aside class="formalizador-catalog" data-formalizador-section="request">${renderFormalizadorCatalog()}</aside>
            <main class="formalizador-case-workspace" data-formalizador-section="form">${formalizadorState.lastCreatedRecord ? renderFormalizadorSuccess() : renderFormalizadorCaseBuilder()}</main>
            <aside class="formalizador-history-panel" data-formalizador-section="history">${renderFormalizadorHistoryPanel()}</aside>
        </div>`;
}

function renderFormalizadorCatalog() {
    return `<div class="formalizador-panel-title"><span>1. Tipo de solicitação</span><strong>Escolha o processo</strong></div><div class="formalizador-type-list">${Object.entries(FORMALIZADOR_TYPES).map(([key, cfg]) => `<button type="button" class="formalizador-type-item ${cfg.accent} ${formalizadorState.type === key ? 'selected' : ''}" onclick="selectFormalizadorType('${escapeHtml(key)}')"><span>${escapeHtml(cfg.shortLabel)}</span><strong>${escapeHtml(cfg.label)}</strong><small>${escapeHtml(cfg.hint)}</small></button>`).join('')}</div><div class="formalizador-catalog-note"><strong>Referência de fluxo</strong><p>Catálogo de serviços, caso operacional, formulário condicional e workflow de acompanhamento.</p></div>`;
}

function renderFormalizadorCaseBuilder() {
    const type = getFormalizadorTypeConfig();
    const validation = validateFormalizador({ silent: true });
    const preview = type && validation.ok ? buildFormalizadorPreview() : null;
    return `<div class="formalizador-builder-head"><div><span>2. Caso operacional</span><h3>${escapeHtml(type?.label || 'Selecione uma solicitação')}</h3><p>${escapeHtml(type?.hint || 'Comece escolhendo uma ação no catálogo ao lado.')}</p></div><div class="formalizador-builder-actions"><button type="button" onclick="resetFormalizadorDraft()">Limpar</button><button type="button" class="primary" onclick="submitFormalizacao()" ${validation.ok ? '' : 'disabled'}>Registrar protocolo</button></div></div>${!type ? renderFormalizadorEmptyStart() : `${!validation.ok ? `<div class="formalizador-alert warning">${escapeHtml(validation.message)}</div>` : ''}${renderFormalizadorRequesterBlock()}${renderFormalizadorCollaboratorBlock()}${renderFormalizadorChangeBlock()}${renderFormalizadorBenefitsBlock()}${renderFormalizadorCoverageBlock()}${renderFormalizadorReviewBlock(preview)}`}`;
}

function renderFormalizadorEmptyStart() { return `<div class="formalizador-empty-start"><strong>Escolha uma solicitação para montar o caso.</strong><p>O formulário será ajustado automaticamente para evitar campos desnecessários e textos incompletos.</p></div>`; }

function renderFormalizadorRequesterBlock() {
    const r = formalizadorState.requester || {};
    return `<section class="formalizador-case-section"><div class="formalizador-section-title"><span>Solicitante</span><strong>Quem está registrando</strong></div><div class="formalizador-form-grid"><label>Nome completo *<input type="text" value="${escapeHtml(r.nome)}" oninput="setFormalizadorRequesterField('nome', this.value)" placeholder="Ex.: Gustavo Cortes"></label><label>Função / cargo *<input type="text" value="${escapeHtml(r.cargo)}" oninput="setFormalizadorRequesterField('cargo', this.value)" placeholder="Ex.: Assistente ADM"></label><label>Telefone *<input type="tel" value="${escapeHtml(r.telefone)}" oninput="setFormalizadorRequesterField('telefone', this.value)" placeholder="Ex.: 11 93384-1730"></label><label>E-mail<input type="email" value="${escapeHtml(r.email)}" oninput="setFormalizadorRequesterField('email', this.value)" placeholder="nome@empresa.com.br"></label></div></section>`;
}

function renderFormalizadorCollaboratorBlock() {
    const selected = getSelectedFormalizadorCollaborator();
    return `<section class="formalizador-case-section"><div class="formalizador-section-title"><span>Colaborador</span><strong>Localizar pessoa e contexto atual</strong></div>${selected ? renderFormalizadorSelectedPerson(selected, 'Selecionado') : ''}<div class="formalizador-search-field">${ICONS.search}<input type="text" value="${escapeHtml(formalizadorState.queries.collaborator || '')}" oninput="setFormalizadorQuery('collaborator', this.value)" placeholder="Buscar por nome, matrícula, RE, posto, cargo, telefone ou empresa"></div><div id="formalizador-collaborator-results" class="formalizador-picker-list">${renderFormalizadorCollaboratorResults('collaborator')}</div></section>`;
}

function renderFormalizadorChangeBlock() {
    const type = getFormalizadorTypeConfig();
    const selected = getSelectedFormalizadorCollaborator();
    const destination = getSelectedFormalizadorDestination();
    const currentUnit = selected?.unit || null;
    return `<section class="formalizador-case-section"><div class="formalizador-section-title"><span>Alteração solicitada</span><strong>Antes x Depois</strong></div><div class="formalizador-compare-board"><div><span>Antes</span>${selected ? renderFormalizadorSelectedPerson(selected, 'Situação atual') : '<p>Selecione o colaborador para preencher a situação atual.</p>'}${currentUnit ? renderFormalizadorUnitCard(currentUnit, 'Unidade atual') : ''}</div><div><span>Depois</span>${type?.needsDestination ? (destination ? renderFormalizadorUnitCard(destination.unit, 'Posto destino') : '<p>Selecione o posto destino para concluir a comparação.</p>') : '<p>Este tipo de solicitação não exige posto destino.</p>'}</div></div><div class="formalizador-form-grid"><label>Data efetiva *<input type="date" value="${escapeHtml(formalizadorState.form.data_efetiva || '')}" onchange="setFormalizadorFormField('data_efetiva', this.value)"></label><label>Data fim ${type?.requiresEndDate ? '*' : ''}<input type="date" value="${escapeHtml(formalizadorState.form.data_fim || '')}" onchange="setFormalizadorFormField('data_fim', this.value)"></label><label>Prioridade<select onchange="setFormalizadorFormField('prioridade', this.value)">${['baixa', 'normal', 'alta', 'urgente'].map(opt => `<option value="${opt}" ${formalizadorState.form.prioridade === opt ? 'selected' : ''}>${formatFormalizadorPriority(opt)}</option>`).join('')}</select></label><label>Motivo / categoria *<select onchange="setFormalizadorFormField('motivo_categoria', this.value)"><option value="">Selecione o motivo</option>${Object.entries(FORMALIZADOR_MOTIVOS).map(([value, label]) => `<option value="${value}" ${formalizadorState.form.motivo_categoria === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></label></div><label class="formalizador-wide-label">Observações do solicitante<textarea rows="3" oninput="setFormalizadorFormField('motivo_observacao', this.value)" placeholder="Explique o motivo, contexto ou orientação operacional.">${escapeHtml(formalizadorState.form.motivo_observacao || '')}</textarea></label>${type?.needsDestination ? `<div class="formalizador-search-field">${ICONS.search}<input type="text" value="${escapeHtml(formalizadorState.queries.destination || '')}" oninput="setFormalizadorQuery('destination', this.value)" placeholder="Buscar posto destino por posto, cliente, empresa, cidade ou e-mail"></div><div id="formalizador-destination-results" class="formalizador-picker-list">${renderFormalizadorUnitResults()}</div>` : ''}</section>`;
}

function renderFormalizadorBenefitsBlock() {
    const b = formalizadorState.benefits || {};
    const options = [['vale_transporte', 'Vale transporte', 'verificar rota, integração, desconto ou necessidade de ajuste'], ['vale_refeicao', 'Refeição / VR', 'verificar VR, refeição no local, marmita ou regra da unidade'], ['adicional_noturno', 'Adicional noturno', 'verificar impacto por horário noturno'], ['intrajornada', 'Intrajornada', 'verificar intervalo ou condição contratual'], ['escala_turno', 'Escala / turno', 'verificar alteração de escala, horário ou turma']];
    return `<section class="formalizador-case-section"><div class="formalizador-section-title"><span>Impactos</span><strong>Benefícios e escala</strong></div><div class="formalizador-impact-grid">${options.map(([key, label, hint]) => `<label class="formalizador-impact-card ${b[key] ? 'selected' : ''}"><input type="checkbox" ${b[key] ? 'checked' : ''} onchange="setFormalizadorBenefit('${key}', this.checked); this.closest('.formalizador-impact-card').classList.toggle('selected', this.checked)"><span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(hint)}</small></span></label>`).join('')}</div><label class="formalizador-wide-label">Observações de benefícios<textarea rows="3" oninput="setFormalizadorBenefit('observacoes', this.value)" placeholder="Ex.: unidade destino possui refeição no local; revisar adicional noturno.">${escapeHtml(b.observacoes || '')}</textarea></label></section>`;
}

function renderFormalizadorCoverageBlock() {
    const c = formalizadorState.coverage || {};
    const selected = getSelectedFormalizadorCoverage();
    const needsSubstitute = c.tipo && c.tipo !== 'sem_cobertura';
    return `<section class="formalizador-case-section"><div class="formalizador-section-title"><span>Cobertura</span><strong>Pendência operacional</strong></div><div class="formalizador-coverage-options">${Object.entries(FORMALIZADOR_COVERAGE_TYPES).map(([value, label]) => `<button type="button" class="${c.tipo === value ? 'selected' : ''}" onclick="setFormalizadorCoverageType('${escapeHtml(value)}')"><strong>${escapeHtml(label)}</strong></button>`).join('')}</div>${c.tipo === 'sem_cobertura' ? '<div class="formalizador-alert warning compact">A solicitação ficará marcada com pendência operacional de cobertura.</div>' : ''}${needsSubstitute ? `${selected ? renderFormalizadorSelectedPerson(selected, 'Cobertura selecionada') : ''}<div class="formalizador-search-field">${ICONS.search}<input type="text" value="${escapeHtml(formalizadorState.queries.coverage || '')}" oninput="setFormalizadorQuery('coverage', this.value)" placeholder="Buscar colaborador substituto por nome, RE, matrícula, posto ou telefone"></div><div id="formalizador-coverage-results" class="formalizador-picker-list">${renderFormalizadorCollaboratorResults('coverage')}</div>` : ''}<div class="formalizador-form-grid single"><label>Período da cobertura<input type="text" value="${escapeHtml(c.periodo || '')}" oninput="setFormalizadorCoverageTextField('periodo', this.value)" placeholder="Ex.: 22/04 a 05/05 ou até nova definição"></label></div><label class="formalizador-wide-label">Observações de cobertura<textarea rows="3" oninput="setFormalizadorCoverageTextField('observacoes', this.value)" placeholder="Informe justificativa, substituto externo ou pendência.">${escapeHtml(c.observacoes || '')}</textarea></label></section>`;
}

function renderFormalizadorReviewBlock(preview) {
    const validation = validateFormalizador({ silent: true });
    if (!formalizadorState.form.email_recipients) { const recipients = getFormalizadorDefaultRecipients(); if (recipients) formalizadorState.form.email_recipients = recipients; }
    return `<section class="formalizador-case-section formalizador-review-section"><div class="formalizador-section-title"><span>3. Revisão</span><strong>Comunicação pronta</strong></div>${renderFormalizadorReviewSummary()}<label class="formalizador-wide-label">Destinatários sugeridos<input type="text" value="${escapeHtml(formalizadorState.form.email_recipients || '')}" oninput="setFormalizadorFormField('email_recipients', this.value)" placeholder="email1@empresa.com.br, email2@empresa.com.br"></label>${preview ? `<div class="formalizador-message-preview"><div><span>Assunto</span><strong>${escapeHtml(preview.subject)}</strong></div><pre>${escapeHtml(preview.body)}</pre></div>` : ''}<div class="formalizador-final-actions"><button type="button" onclick="copyFormalizadorDraftText()" ${preview ? '' : 'disabled'}>Copiar prévia</button><button type="button" class="primary" onclick="submitFormalizacao()" ${validation.ok ? '' : 'disabled'}>Registrar protocolo</button></div></section>`;
}

function renderFormalizadorReviewSummary() {
    const collab = getSelectedFormalizadorCollaborator();
    const destination = getSelectedFormalizadorDestination();
    const items = [['Tipo', formatFormalizadorType(formalizadorState.type)], ['Colaborador', getFormalizadorCollabName(collab?.item || {})], ['Posto atual', collab?.item?.posto || ''], ['Posto destino', destination?.unit ? getFormalizadorUnitName(destination.unit) : ''], ['Data efetiva', formatFormalizadorDate(formalizadorState.form.data_efetiva)], ['Motivo', FORMALIZADOR_MOTIVOS[formalizadorState.form.motivo_categoria] || ''], ['Impactos', getFormalizadorBenefitsLabel()], ['Cobertura', getFormalizadorCoverageLabel()]].filter(([, value]) => String(value || '').trim());
    return `<div class="formalizador-review-grid">${items.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
}

function renderFormalizadorSuccess() {
    const record = formalizadorState.lastCreatedRecord;
    return `<div class="formalizador-success"><span>Protocolo registrado</span><h3>${escapeHtml(record?.protocolo || '')}</h3><p>A solicitação foi salva no histórico como caso operacional. O texto formal já foi copiado para a área de transferência.</p>${renderFormalizadorSuccessSummary(record)}<div class="formalizador-success-actions"><button type="button" onclick="copyFormalizacaoText('${escapeHtml(record?.id || '')}')">Copiar e-mail</button><button type="button" onclick="openFormalizacaoEmail('${escapeHtml(record?.id || '')}')">Abrir Gmail</button><button type="button" onclick="shareFormalizacaoWhatsapp('${escapeHtml(record?.id || '')}')">WhatsApp</button><button type="button" onclick="setFormalizadorFocus('history')">Ver histórico</button><button type="button" class="primary" onclick="startNewFormalizacao()">Nova solicitação</button></div></div>`;
}

function renderFormalizadorSuccessSummary(record) {
    const rows = [['Tipo', formatFormalizadorType(record?.tipo)], ['Status', formatFormalizadorStatus(record?.status)], ['Colaborador', record?.colaborador_nome], ['Posto atual', record?.posto_atual], ['Posto destino', record?.posto_destino], ['Data efetiva', formatFormalizadorDate(record?.data_efetiva)], ['Cobertura', getFormalizadorCoverageLabel(record?.cobertura_json)]].filter(([, value]) => String(value || '').trim());
    return `<div class="formalizador-success-summary">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`;
}

function renderFormalizadorPicker(kind) { const id = kind === 'destination' ? 'formalizador-destination-results' : kind === 'coverage' ? 'formalizador-coverage-results' : 'formalizador-collaborator-results'; const el = document.getElementById(id); if (!el) return; el.innerHTML = kind === 'destination' ? renderFormalizadorUnitResults() : renderFormalizadorCollaboratorResults(kind); }

function renderFormalizadorCollaboratorResults(kind = 'collaborator') {
    const rows = getFormalizadorFilteredCollaborators(kind, 12);
    if (!rows.length) return `<div class="formalizador-empty-inline">Nenhum colaborador encontrado.</div>`;
    return rows.map(row => {
        const item = row.item || {}; const duty = getDutyStatusByTurma(item.turma); const statusClass = duty.code === 'plantao' ? 'plantao' : duty.code === 'folga' ? 'folga' : 'indefinido'; const keyArg = escapeHtml(JSON.stringify(row.key)); const selected = (kind === 'coverage' ? formalizadorState.coverageKey : formalizadorState.collaboratorKey) === row.key;
        return `<button type="button" class="formalizador-picker-card ${selected ? 'selected' : ''}" onclick="${kind === 'coverage' ? 'selectFormalizadorCoverage' : 'selectFormalizadorCollaborator'}(${keyArg})"><span class="avatar">${escapeHtml(String(getFormalizadorCollabName(item)).slice(0, 1) || '?')}</span><span><strong>${escapeHtml(getFormalizadorCollabName(item))}</strong><small>${escapeHtml([item.matricula, item.re, item.cargo].filter(Boolean).join(' • '))}</small><small>${escapeHtml([item.posto, getFormalizadorCompany(item), item.telefone].filter(Boolean).join(' • '))}</small></span><em class="${statusClass}">${escapeHtml(duty.text || '')}</em></button>`;
    }).join('');
}

function renderFormalizadorUnitResults() {
    const rows = getFormalizadorFilteredUnits(12);
    if (!rows.length) return `<div class="formalizador-empty-inline">Nenhum posto encontrado.</div>`;
    return rows.map(row => { const unit = row.unit || {}; const keyArg = escapeHtml(JSON.stringify(row.key)); const selected = formalizadorState.destinationKey === row.key; return `<button type="button" class="formalizador-picker-card unit ${selected ? 'selected' : ''}" onclick="selectFormalizadorDestination(${keyArg})"><span class="avatar unit">${escapeHtml(String(getFormalizadorUnitName(unit)).slice(0, 1) || '?')}</span><span><strong>${escapeHtml(getFormalizadorUnitName(unit))}</strong><small>${escapeHtml([unit.cliente, getFormalizadorCompany(unit), unit.cidade].filter(Boolean).join(' • '))}</small><small>${escapeHtml(unit.endereco_formatado || formatUnitAddress(unit) || '')}</small></span></button>`; }).join('');
}

function renderFormalizadorSelectedPerson(row, label = 'Colaborador') {
    const item = row?.item || {}; const duty = getDutyStatusByTurma(item.turma); const statusClass = duty.code === 'plantao' ? 'plantao' : duty.code === 'folga' ? 'folga' : 'indefinido';
    return `<article class="formalizador-person-card ${statusClass}"><div><span>${escapeHtml(label)}</span><strong>${escapeHtml(getFormalizadorCollabName(item))}</strong><small>${escapeHtml([item.matricula, item.re, item.cargo].filter(Boolean).join(' • '))}</small><small>${escapeHtml([item.posto, item.escala, item.turno, item.turma ? `Turma ${item.turma}` : ''].filter(Boolean).join(' • '))}</small></div><em>${escapeHtml(duty.text || '')}</em></article>`;
}

function renderFormalizadorUnitCard(unit = {}, label = 'Unidade') {
    return `<article class="formalizador-unit-card"><span>${escapeHtml(label)}</span><strong>${escapeHtml(getFormalizadorUnitName(unit))}</strong><small>${escapeHtml([unit.cliente, getFormalizadorCompany(unit), unit.unidade_de_negocio].filter(Boolean).join(' • '))}</small><small>${escapeHtml([unit.endereco_formatado || formatUnitAddress(unit), unit.email_supervisor_da_unidade, unit.email_sesmt].filter(Boolean).join(' • '))}</small></article>`;
}

function renderFormalizadorHistoryPanel() {
    const f = formalizadorState.historyFilters || { search: '', status: 'all', tipo: 'all' };
    return `<div class="formalizador-panel-title"><span>Histórico</span><strong>Casos registrados</strong></div><div class="formalizador-history-actions"><button type="button" onclick="fetchFormalizacoes(true).then(renderFormalizador)">Atualizar</button></div><div class="formalizador-history-filters"><input type="text" value="${escapeHtml(f.search || '')}" oninput="setFormalizadorHistoryFilter('search', this.value)" placeholder="Protocolo, colaborador, posto, solicitante"><select onchange="setFormalizadorHistoryFilter('status', this.value)"><option value="all" ${f.status === 'all' ? 'selected' : ''}>Todos os status</option>${Object.entries(FORMALIZADOR_STATUS).map(([value, label]) => `<option value="${value}" ${f.status === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select><select onchange="setFormalizadorHistoryFilter('tipo', this.value)"><option value="all" ${f.tipo === 'all' ? 'selected' : ''}>Todos os tipos</option>${Object.entries(FORMALIZADOR_TYPES).map(([value, cfg]) => `<option value="${value}" ${f.tipo === value ? 'selected' : ''}>${escapeHtml(cfg.label)}</option>`).join('')}</select></div><div id="formalizador-history-list" class="formalizador-history-list">${renderFormalizadorHistoryItems()}</div>`;
}
function renderFormalizadorHistoryList() { const list = document.getElementById('formalizador-history-list'); if (list) list.innerHTML = renderFormalizadorHistoryItems(); }
function getFilteredFormalizadorHistory() { const f = formalizadorState.historyFilters || { search: '', status: 'all', tipo: 'all' }; return (formalizadorState.history || []).filter(item => { if (f.status && f.status !== 'all' && item.status !== f.status) return false; if (f.tipo && f.tipo !== 'all' && item.tipo !== f.tipo) return false; return !String(f.search || '').trim() || formalizadorIncludesQuery(buildFormalizadorSearchText(item), f.search); }); }
function renderFormalizadorHistoryItems() {
    const rows = getFilteredFormalizadorHistory();
    if (!rows.length) return `<div class="formalizador-empty-inline">Nenhum protocolo encontrado.</div>`;
    const selected = rows.find(row => String(row.id) === String(formalizadorState.selectedHistoryId)) || rows[0];
    if (selected?.id && selected.id !== formalizadorState.selectedHistoryId) formalizadorState.selectedHistoryId = selected.id;
    return `${rows.map(item => `<button type="button" class="formalizador-history-card ${String(item.id) === String(formalizadorState.selectedHistoryId) ? 'selected' : ''}" onclick="selectFormalizacaoHistory('${escapeHtml(item.id)}')"><span><strong>${escapeHtml(item.protocolo || '')}</strong><small>${escapeHtml(formatFormalizadorType(item.tipo))}</small><small>${escapeHtml([item.colaborador_nome, item.posto_atual, item.posto_destino].filter(Boolean).join(' • '))}</small></span><em class="${escapeHtml(item.status || '')}">${escapeHtml(formatFormalizadorStatus(item.status))}</em></button>`).join('')}${selected ? renderFormalizadorHistoryDetail(selected) : ''}`;
}
function renderFormalizadorHistoryDetail(item) {
    const events = formalizadorState.events?.[String(item.id)] || [];
    return `<div class="formalizador-history-detail"><div class="formalizador-history-detail-head"><div><span>Detalhe</span><strong>${escapeHtml(item.protocolo || '')}</strong></div><select onchange="updateFormalizacaoStatus('${escapeHtml(item.id)}', this.value)">${Object.entries(FORMALIZADOR_STATUS).map(([value, label]) => `<option value="${value}" ${item.status === value ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}</select></div>${renderFormalizadorRecordSummary(item)}<div class="formalizador-record-actions"><button type="button" onclick="copyFormalizacaoText('${escapeHtml(item.id)}')">Copiar e-mail</button><button type="button" onclick="openFormalizacaoEmail('${escapeHtml(item.id)}')">Gmail</button><button type="button" onclick="shareFormalizacaoWhatsapp('${escapeHtml(item.id)}')">WhatsApp</button></div><div class="formalizador-timeline"><strong>Linha do tempo</strong>${(events.length ? events : [{ status_novo: item.status, ator_nome: item.solicitante_nome, created_at: item.created_at, observacao: 'Caso registrado.' }]).map(ev => `<div><span>${escapeHtml(formatFormalizadorDateTime(ev.created_at))}</span><p>${escapeHtml(formatFormalizadorStatus(ev.status_novo))}</p>${ev.ator_nome ? `<small>Responsável: ${escapeHtml(ev.ator_nome)}</small>` : ''}${ev.observacao ? `<small>${escapeHtml(ev.observacao)}</small>` : ''}</div>`).join('')}</div></div>`;
}
function renderFormalizadorRecordSummary(item) { const rows = [['Solicitante', [item.solicitante_nome, item.solicitante_cargo].filter(Boolean).join(' • ')], ['Colaborador', [item.colaborador_nome, item.colaborador_matricula || item.colaborador_re].filter(Boolean).join(' • ')], ['Atual', item.posto_atual], ['Destino', item.posto_destino], ['Data efetiva', formatFormalizadorDate(item.data_efetiva)], ['Motivo', FORMALIZADOR_MOTIVOS[item.motivo_categoria] || item.motivo_categoria], ['Cobertura', getFormalizadorCoverageLabel(item.cobertura_json)]].filter(([, value]) => String(value || '').trim()); return `<div class="formalizador-record-summary">${rows.map(([label, value]) => `<div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join('')}</div>`; }

function validateFormalizador(options = {}) {
    const type = getFormalizadorTypeConfig(); const r = formalizadorState.requester || {}; const c = formalizadorState.coverage || {}; const fail = (message, focus = 'form') => ({ ok: false, message, focus });
    if (!type) return fail('Escolha o tipo de solicitação no catálogo.', 'request');
    if (!String(r.nome || '').trim()) return fail('Informe o nome do solicitante.');
    if (!String(r.cargo || '').trim()) return fail('Informe a função ou cargo do solicitante.');
    if (!String(r.telefone || '').replace(/\D/g, '')) return fail('Informe o telefone do solicitante.');
    if (!getSelectedFormalizadorCollaborator()) return fail('Selecione o colaborador.');
    if (!formalizadorState.form.data_efetiva) return fail('Informe a data efetiva.');
    if (!formalizadorState.form.motivo_categoria) return fail('Selecione o motivo ou categoria.');
    if (type.needsDestination && !getSelectedFormalizadorDestination()) return fail('Selecione o posto destino.');
    if (type.requiresEndDate && !formalizadorState.form.data_fim) return fail('Informe a data fim para término de experiência.');
    if (type.requiresBenefitImpact && !hasFormalizadorBenefitImpact() && !String(formalizadorState.benefits?.observacoes || '').trim()) return fail('Marque pelo menos um impacto de benefício ou explique a alteração.');
    if (!c.tipo || !FORMALIZADOR_COVERAGE_TYPES[c.tipo]) return fail('Informe a situação de cobertura.');
    if (c.tipo !== 'sem_cobertura' && !getSelectedFormalizadorCoverage() && !String(c.observacoes || '').trim()) return fail('Informe o substituto ou uma observação justificando a cobertura.');
    return { ok: true, message: '', focus: 'review' };
}
function hasFormalizadorBenefitImpact(benefits = formalizadorState.benefits) { return Boolean(benefits?.vale_transporte || benefits?.vale_refeicao || benefits?.adicional_noturno || benefits?.intrajornada || benefits?.escala_turno); }
function getFormalizadorBenefitsList(benefits = formalizadorState.benefits) { const rows = []; if (benefits?.vale_transporte) rows.push('Vale transporte: verificar rota, integração, desconto ou necessidade de ajuste.'); if (benefits?.vale_refeicao) rows.push('Refeição / VR: verificar alteração conforme regra da unidade.'); if (benefits?.adicional_noturno) rows.push('Adicional noturno: verificar impacto pelo horário informado.'); if (benefits?.intrajornada) rows.push('Intrajornada: verificar intervalo e condição contratual.'); if (benefits?.escala_turno) rows.push('Escala / turno: verificar alteração de horário, escala ou turma.'); return rows; }
function getFormalizadorBenefitsLabel(benefits = formalizadorState.benefits) { const labels = []; if (benefits?.vale_transporte) labels.push('VT'); if (benefits?.vale_refeicao) labels.push('Refeição / VR'); if (benefits?.adicional_noturno) labels.push('Adicional noturno'); if (benefits?.intrajornada) labels.push('Intrajornada'); if (benefits?.escala_turno) labels.push('Escala / turno'); return labels.join(', '); }
function getFormalizadorCoverageLabel(coverage = formalizadorState.coverage) { const base = FORMALIZADOR_COVERAGE_TYPES[coverage?.tipo] || ''; const selectedCoverage = getSelectedFormalizadorCoverage(); const sub = coverage?.substituto?.nome || (selectedCoverage?.item ? getFormalizadorCollabName(selectedCoverage.item) : ''); return [base, sub].filter(Boolean).join(' • '); }
function getFormalizadorDefaultRecipients() { const unit = getSelectedFormalizadorDestination()?.unit || getSelectedFormalizadorCollaborator()?.unit || {}; return Array.from(new Set([unit.email_supervisor_da_unidade, unit.email_sesmt, unit.email_dp, unit.email_rh, unit.email].map(v => String(v || '').trim()).filter(Boolean))).join(', '); }
function generateFormalizadorProtocol() { return `FP-${getTodayKey().replace(/-/g, '')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`; }
function getSafeFormalizadorCollaboratorSnapshot(row) { const item = row?.item || {}; return { matricula: item.matricula || '', re: item.re || '', re_padrao: item.re_padrao || '', re_novo: item.re_novo || item.re_folha || '', nome: getFormalizadorCollabName(item), cargo: item.cargo || '', posto: item.posto || '', escala: item.escala || '', turno: item.turno || '', empresa: getFormalizadorCompany(item) || '', cliente: item.cliente || '', unidade_de_negocio: item.unidade_de_negocio || '', turma: item.turma || '', telefone: item.telefone || '' }; }
function getSafeFormalizadorUnitSnapshot(unit = {}) { return { posto: getFormalizadorUnitName(unit), cliente: unit.cliente || '', empresa: getFormalizadorCompany(unit) || '', unidade_de_negocio: unit.unidade_de_negocio || '', endereco_formatado: unit.endereco_formatado || formatUnitAddress(unit) || '', cidade: unit.cidade || '', estado: unit.estado || '', email_supervisor_da_unidade: unit.email_supervisor_da_unidade || '', email_sesmt: unit.email_sesmt || '', refeicao_no_local: pickFirstDefined(unit.refeicao_no_local, unit.refeicao, unit.vale_refeicao), intrajornada: unit.intrajornada || '' }; }

function buildFormalizadorPreview(protocolo = 'PROTOCOLO') { const record = buildFormalizadorPayload(protocolo, { preview: true }); return { protocolo, subject: record.email_subject, body: record.email_body, whatsapp: record.whatsapp_text }; }
function buildFormalizadorPayload(protocolo = generateFormalizadorProtocol(), options = {}) {
    const collabRow = getSelectedFormalizadorCollaborator(); const destinationRow = getSelectedFormalizadorDestination(); const coverageRow = getSelectedFormalizadorCoverage(); const collab = collabRow?.item || {}; const destinationUnit = destinationRow?.unit || null; const currentUnit = collabRow?.unit || null;
    const coverage = { ...(formalizadorState.coverage || {}), substituto: coverageRow ? getSafeFormalizadorCollaboratorSnapshot(coverageRow) : null };
    const snapshot = { colaborador: collabRow ? getSafeFormalizadorCollaboratorSnapshot(collabRow) : null, unidade_atual: currentUnit ? getSafeFormalizadorUnitSnapshot(currentUnit) : null, unidade_destino: destinationUnit ? getSafeFormalizadorUnitSnapshot(destinationUnit) : null, cobertura: coverage.substituto, email_recipients: formalizadorState.form.email_recipients || getFormalizadorDefaultRecipients(), gerado_em: new Date().toISOString() };
    const base = { protocolo, tipo: formalizadorState.type || '', status: 'registrado', prioridade: formalizadorState.form.prioridade || 'normal', solicitante_nome: String(formalizadorState.requester.nome || '').trim(), solicitante_cargo: String(formalizadorState.requester.cargo || '').trim(), solicitante_telefone: String(formalizadorState.requester.telefone || '').trim(), solicitante_email: String(formalizadorState.requester.email || '').trim(), colaborador_matricula: collab.matricula || '', colaborador_re: collab.re || collab.re_padrao || collab.re_novo || '', colaborador_nome: getFormalizadorCollabName(collab), colaborador_cargo: collab.cargo || '', posto_atual: collab.posto || '', posto_destino: destinationUnit ? getFormalizadorUnitName(destinationUnit) : '', data_efetiva: normalizeFtDateKey(formalizadorState.form.data_efetiva) || null, data_fim: normalizeFtDateKey(formalizadorState.form.data_fim) || null, motivo_categoria: formalizadorState.form.motivo_categoria || '', motivo_observacao: formalizadorState.form.motivo_observacao || '', beneficios_json: { ...(formalizadorState.benefits || {}) }, cobertura_json: coverage, snapshot_json: snapshot };
    base.email_subject = buildFormalizadorEmailSubject(base, options.preview); base.email_body = buildFormalizadorMessageBody(base); base.whatsapp_text = buildFormalizadorWhatsappText(base); return base;
}
function buildFormalizadorEmailSubject(payload, preview = false) { const movement = payload.posto_destino ? `${payload.posto_atual || 'Posto atual'} -> ${payload.posto_destino}` : (payload.posto_atual || 'Sem posto atual'); const date = formatFormalizadorDate(payload.data_efetiva); return `[Solicitação de ${formatFormalizadorType(payload.tipo)}] ${payload.colaborador_nome} | ${movement}${date ? ` | ${date}` : ''}${preview ? '' : ` | ${payload.protocolo}`}`; }
function appendFormalizadorLine(lines, label, value) { const text = String(value || '').trim(); if (text) lines.push(`${label}: ${text}`); }
function appendFormalizadorSection(lines, title, entries = []) { const clean = entries.filter(Boolean).map(v => String(v).trim()).filter(Boolean); if (!clean.length) return; if (lines.length) lines.push(''); lines.push(title); clean.forEach(entry => lines.push(entry)); }
function buildFormalizadorMessageBody(payload) {
    const lines = ['Prezados,', '', `Foi registrada uma solicitação de ${formatFormalizadorType(payload.tipo).toLowerCase()} para análise e providências administrativas.`];
    appendFormalizadorSection(lines, 'Protocolo', [payload.protocolo, `Status: ${formatFormalizadorStatus(payload.status)}`, `Prioridade: ${formatFormalizadorPriority(payload.prioridade)}`]);
    const requester = []; appendFormalizadorLine(requester, 'Solicitante', payload.solicitante_nome); appendFormalizadorLine(requester, 'Função/Cargo', payload.solicitante_cargo); appendFormalizadorLine(requester, 'Contato', payload.solicitante_telefone); appendFormalizadorLine(requester, 'E-mail', payload.solicitante_email); appendFormalizadorSection(lines, 'Solicitante', requester);
    const collaborator = []; appendFormalizadorLine(collaborator, 'Nome', payload.colaborador_nome); appendFormalizadorLine(collaborator, 'Matrícula', payload.colaborador_matricula); appendFormalizadorLine(collaborator, 'RE', payload.colaborador_re); appendFormalizadorLine(collaborator, 'Cargo', payload.colaborador_cargo); appendFormalizadorSection(lines, 'Colaborador', collaborator);
    const change = []; appendFormalizadorLine(change, 'Posto atual', payload.posto_atual); appendFormalizadorLine(change, 'Posto destino', payload.posto_destino); appendFormalizadorLine(change, 'Data efetiva solicitada', formatFormalizadorDate(payload.data_efetiva)); appendFormalizadorLine(change, 'Data fim', formatFormalizadorDate(payload.data_fim)); appendFormalizadorLine(change, 'Motivo', FORMALIZADOR_MOTIVOS[payload.motivo_categoria] || payload.motivo_categoria); appendFormalizadorSection(lines, 'Alteração solicitada', change);
    const benefits = getFormalizadorBenefitsList(payload.beneficios_json); if (benefits.length || payload.beneficios_json?.observacoes) appendFormalizadorSection(lines, 'Impactos informados', [...benefits.map(item => `• ${item}`), payload.beneficios_json?.observacoes ? `Observações: ${payload.beneficios_json.observacoes}` : '']);
    appendFormalizadorSection(lines, 'Cobertura', [buildFormalizadorCoverageText(payload.cobertura_json)]);
    if (payload.motivo_observacao) appendFormalizadorSection(lines, 'Observações do solicitante', [payload.motivo_observacao]);
    lines.push('', 'Solicito análise e confirmação dos impactos em escala, benefícios, cobertura e registros administrativos antes da execução da mudança.', '', 'Atenciosamente,', payload.solicitante_nome); if (payload.solicitante_cargo) lines.push(payload.solicitante_cargo); return lines.filter(line => line !== null && line !== undefined).join('\n');
}
function buildFormalizadorCoverageText(coverage = {}) { const parts = []; const label = FORMALIZADOR_COVERAGE_TYPES[coverage?.tipo] || ''; const sub = coverage?.substituto || null; if (coverage?.tipo === 'sem_cobertura') parts.push('Não há cobertura definida para o posto atual neste momento.'); else if (label) parts.push(`${label}.`); if (sub?.nome) parts.push(`Substituto indicado: ${[sub.nome, sub.matricula, sub.re, sub.posto].filter(Boolean).join(' • ')}.`); if (coverage?.periodo) parts.push(`Período: ${coverage.periodo}.`); if (coverage?.observacoes) parts.push(`Observações: ${coverage.observacoes}`); return parts.join(' '); }
function buildFormalizadorWhatsappText(payload) { return [`Solicitação registrada: ${payload.protocolo}`, `${formatFormalizadorType(payload.tipo)} • ${formatFormalizadorStatus(payload.status)}`, `Solicitante: ${[payload.solicitante_nome, payload.solicitante_cargo].filter(Boolean).join(' • ')}`, `Colaborador: ${[payload.colaborador_nome, payload.colaborador_matricula || payload.colaborador_re].filter(Boolean).join(' • ')}`, payload.posto_destino ? `Mudança: ${payload.posto_atual} -> ${payload.posto_destino}` : `Posto atual: ${payload.posto_atual}`, `Data efetiva: ${formatFormalizadorDate(payload.data_efetiva)}`, `Motivo: ${FORMALIZADOR_MOTIVOS[payload.motivo_categoria] || payload.motivo_categoria}`, hasFormalizadorBenefitImpact(payload.beneficios_json) ? `Impactos: ${getFormalizadorBenefitsLabel(payload.beneficios_json)}` : '', `Cobertura: ${buildFormalizadorCoverageText(payload.cobertura_json)}`, payload.motivo_observacao ? `Observações: ${payload.motivo_observacao}` : ''].filter(v => String(v || '').trim()).join('\n'); }

async function submitFormalizacao() {
    const validation = validateFormalizador();
    if (!validation.ok) { showToast(validation.message, 'warning'); formalizadorState.focus = validation.focus || 'form'; renderFormalizador(); return; }
    if (!supabaseClient) { showToast('Supabase não configurado. Não foi possível salvar o protocolo.', 'error'); return; }
    const payload = buildFormalizadorPayload(generateFormalizadorProtocol());
    try {
        const { data, error } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_postos).insert(payload).select('*').single();
        if (error) throw error;
        const saved = data || payload;
        if (saved.id) {
            const { error: eventError } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_status_events).insert({ formalizacao_id: saved.id, status_anterior: null, status_novo: 'registrado', ator_nome: payload.solicitante_nome || 'Solicitante', observacao: 'Caso operacional registrado pelo Formalizador.' });
            if (eventError) AppErrorHandler.capture(eventError, { scope: 'formalizador-submit-event' }, { silent: true });
        }
        formalizadorState.lastCreatedId = saved.id || ''; formalizadorState.selectedHistoryId = saved.id || formalizadorState.selectedHistoryId; formalizadorState.lastCreatedRecord = saved; formalizadorCache.updatedAt = 0;
        await fetchFormalizacoes(true); copyTextToClipboard(saved.email_body || payload.email_body); showToast(`Protocolo ${saved.protocolo || payload.protocolo} registrado e texto copiado.`, 'success'); renderFormalizador();
    } catch (err) { AppErrorHandler.capture(err, { scope: 'formalizador-submit' }, { silent: true }); showToast(`Erro ao salvar formalização: ${err?.message || err}`, 'error'); }
}
function copyFormalizadorDraftText() { const validation = validateFormalizador({ silent: true }); if (!validation.ok) { showToast(validation.message, 'warning'); return; } copyTextToClipboard(buildFormalizadorPreview().body); }
function getFormalizacaoRecord(id = '') { const target = String(id || formalizadorState.lastCreatedId || formalizadorState.selectedHistoryId || ''); if (!target) return null; return (formalizadorState.history || []).find(item => String(item.id) === target || String(item.protocolo) === target) || formalizadorState.lastCreatedRecord || null; }
function copyFormalizacaoText(id = '') { const record = getFormalizacaoRecord(id); if (record?.email_body) copyTextToClipboard(record.email_body); else copyFormalizadorDraftText(); }
function openFormalizacaoEmail(id = '') { const record = getFormalizacaoRecord(id); const preview = record || buildFormalizadorPayload(generateFormalizadorProtocol(), { preview: true }); const to = record ? getFormalizadorRecipientsFromRecord(record) : (formalizadorState.form.email_recipients || getFormalizadorDefaultRecipients()); const subject = preview.email_subject || preview.subject || ''; const body = preview.email_body || preview.body || ''; copyTextToClipboard(body); const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`; const win = window.open(gmailUrl, '_blank', 'noopener,noreferrer'); if (!win) { const params = new URLSearchParams(); if (subject) params.set('subject', subject); if (body) params.set('body', body); window.location.href = `mailto:${to || ''}?${params.toString()}`; } }
async function shareFormalizacaoWhatsapp(id = '') { const record = getFormalizacaoRecord(id); const text = record?.whatsapp_text || buildFormalizadorPreview().whatsapp; copyTextToClipboard(text); try { if (navigator.share) { await navigator.share({ text }); return; } } catch {} openWhatsApp('', text); }
function getFormalizadorRecipientsFromRecord(record = {}) { if (record.email_recipients) return record.email_recipients; const snap = record.snapshot_json || {}; if (snap.email_recipients) return snap.email_recipients; const unit = snap.unidade_destino || snap.unidade_atual || {}; return [unit.email_supervisor_da_unidade, unit.email_sesmt].filter(Boolean).join(', '); }
async function updateFormalizacaoStatus(id, nextStatus) {
    const record = getFormalizacaoRecord(id); if (!record || !FORMALIZADOR_STATUS[nextStatus] || record.status === nextStatus) return; if (!supabaseClient) { showToast('Supabase não configurado.', 'error'); return; }
    const prompted = window.prompt('Observação da mudança de status (opcional):', ''); if (prompted === null) { renderFormalizador(); return; }
    try { const { error: eventError } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_status_events).insert({ formalizacao_id: record.id, status_anterior: record.status || null, status_novo: nextStatus, ator_nome: formalizadorState.requester?.nome || 'Operador', observacao: prompted || '' }); if (eventError) throw eventError; const { error } = await supabaseClient.from(SUPABASE_TABLES.formalizacoes_postos).update({ status: nextStatus }).eq('id', record.id); if (error) throw error; await fetchFormalizacoes(true); showToast('Status atualizado.', 'success'); renderFormalizador(); }
    catch (err) { AppErrorHandler.capture(err, { scope: 'formalizador-status-update' }, { silent: true }); showToast(`Erro ao atualizar status: ${err?.message || err}`, 'error'); renderFormalizador(); }
}

// 6. Lógica de Unidades
function getFtTodayByUnit(unitName, groupKey) {
    const today = getTodayKey();
    const target = normalizeUnitKey(unitName);
    return getFtOperationalItems(ftLaunches).filter(item => {
        if (!isFtActive(item)) return false;
        if (!item.date || item.date !== today) return false;
        if (groupKey && groupKey !== 'all' && item.group && item.group !== groupKey) return false;
        const unit = normalizeUnitKey(item.unitTarget || item.unitCurrent || '');
        return unit && unit === target;
    });
}

function renderizarUnidades() {
    const unitsContainer = document.getElementById('units-list');
    const filterTerm = document.getElementById('unit-search-input')?.value.toUpperCase() || '';
    const groupFilter = document.getElementById('unit-group-filter')?.value || 'all';
    const statusFilter = document.getElementById('unit-status-filter')?.value || 'all';
    const labelFilter = document.getElementById('unit-label-filter')?.value || 'all';
    const dateRange = normalizeDateRange(unitDateFilter.from, unitDateFilter.to);
    
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
            const isFolga = s.text === 'FOLGA';
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
        const ftTodayItems = getFtTodayByUnit(posto, groupFilter === 'all' ? '' : groupFilter);
        const ftBadge = ftTodayItems.length
            ? `<span class="unit-ft-badge">FT hoje: ${ftTodayItems.length}</span>`
            : '';
        const weekPreview = buildFtWeekPreviewHtmlForUnit(posto, groupFilter === 'all' ? '' : groupFilter);
        const unitRangeItems = hasDateRangeFilter(dateRange)
            ? getFtItemsForUnitInRange(posto, dateRange.from, dateRange.to, groupFilter === 'all' ? '' : groupFilter)
            : [];
        if (hasDateRangeFilter(dateRange) && !unitRangeItems.length) return '';
        const applyDateFilter = (list) => {
            if (!hasDateRangeFilter(dateRange)) return list;
            return list.filter(p => matchesFtDateFilterForCollaborator(p.re, dateRange));
        };
        const filteredPlantaoWithDate = applyDateFilter(filteredPlantao);
        const filteredFolgaWithDate = applyDateFilter(filteredFolga);
        if (filteredPlantaoWithDate.length === 0 && filteredFolgaWithDate.length === 0) return '';

        const postoJs = JSON.stringify(posto);
        const postoJsAttr = escapeHtml(postoJs);
        const postoAttr = escapeHtml(posto);
        return `
            <div class="unit-section ${hasUnitLabel ? 'unit-labeled' : ''}" id="${safeId}" data-unit-name="${postoAttr}">
                <h3 class="unit-title">
                    <span>${postoAttr} <span class="count-badge">${efetivo.length}</span> ${rotuloUnitHtml} ${ftBadge}</span>
                    <div class="unit-actions">
                        <button class="action-btn" onclick="openAddressModal(${postoJsAttr})" title="Endereço">
                            ${ICONS.mapPin}
                        </button>
                        <button class="action-btn" onclick="openUnitDetailsModal(${postoJsAttr})" title="Detalhes da unidade">
                            ${ICONS.details}
                        </button>
                        <button class="action-btn" onclick="exportUnitPrompt(${postoJsAttr})" title="Exportar unidade">
                            ${ICONS.download}
                        </button>
                        <button class="action-btn" onclick="openEditUnitModal(${postoJsAttr})" title="Editar Unidade">
                            ${ICONS.settings}
                        </button>
                        <button class="action-btn" onclick="toggleUnitMinimize(${postoJsAttr})" title="${isMinimized ? 'Expandir' : 'Minimizar'}">
                            ${isMinimized ? ICONS.chevronDown : ICONS.chevronUp}
                        </button>
                        <button class="action-btn ${isHidden ? 'hidden-unit' : ''}" onclick="toggleUnitVisibility(${postoJsAttr})" title="${isHidden ? 'Mostrar na busca' : 'Ocultar da busca'}">
                            ${isHidden ? ICONS.eyeOff : ICONS.eye}
                        </button>
                    </div>
                </h3>
                ${weekPreview}
                
                <div class="unit-teams-container ${isMinimized ? 'hidden' : ''}">
                    <!-- Time Plantão -->
                    <div class="team-block team-plantao">
                        <h4 class="team-header header-plantao">EM PLANTÃO (${filteredPlantaoWithDate.length})</h4>
                        ${renderUnitTable(filteredPlantaoWithDate)}
                    </div>

                    <!-- Time Folga -->
                    <div class="team-block team-folga">
                        <h4 class="team-header header-folga">NA FOLGA (${filteredFolgaWithDate.length})</h4>
                        ${renderUnitTable(filteredFolgaWithDate)}
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
    const folga = dadosFiltrados.filter(d => getStatusInfo(d).text === 'FOLGA').length;

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


function renderSiteFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const labelMap = getGroupLabelMap();
    const groupLabel = currentGroup && currentGroup !== 'todos'
        ? (labelMap[currentGroup] || currentGroup.toUpperCase())
        : 'Todos';
    footer.innerHTML = `
        <div class="footer-inner">
            <span class="footer-item">${APP_VERSION}</span>
            <span class="footer-dot">-</span>
            <span class="footer-item">Grupo: ${groupLabel}</span>
            <span class="footer-dot">-</span>
            <button type="button" class="footer-link" onclick="openHelpModal()">Ajuda</button>
            <span class="footer-dot">-</span>
            <button type="button" class="footer-link" onclick="openGuideModal()">Guia</button>
        </div>
    `;
}

function ensureTooltipElement() {
    let el = document.getElementById('app-tooltip');
    if (!el) {
        el = document.createElement('div');
        el.id = 'app-tooltip';
        el.className = 'app-tooltip';
        document.body.appendChild(el);
    }
    activeTooltipEl = el;
    return el;
}

function resolveTooltipTarget(node) {
    if (!node || typeof node.closest !== 'function') return null;
    return node.closest('[title], [data-native-title]');
}

function positionTooltip(clientX, clientY) {
    if (!activeTooltipEl) return;
    const margin = 12;
    const rect = activeTooltipEl.getBoundingClientRect();
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);
    const x = Math.min(maxX, Math.max(margin, clientX + 14));
    const y = Math.min(maxY, Math.max(margin, clientY + 14));
    activeTooltipEl.style.left = `${x}px`;
    activeTooltipEl.style.top = `${y}px`;
}

function hideActiveTooltip() {
    if (!activeTooltipTarget || !activeTooltipEl) return;
    const stored = activeTooltipTarget.getAttribute('data-native-title');
    if (stored && !activeTooltipTarget.getAttribute('title')) {
        activeTooltipTarget.setAttribute('title', stored);
    }
    activeTooltipEl.classList.remove('show');
    activeTooltipTarget = null;
}

function showTooltipForTarget(target, x, y) {
    if (!target) return;
    if (activeTooltipTarget && activeTooltipTarget !== target) {
        hideActiveTooltip();
    }
    const text = String(target.getAttribute('title') || target.getAttribute('data-native-title') || '').trim();
    if (!text) return;
    const el = ensureTooltipElement();
    if (target.getAttribute('title')) {
        target.setAttribute('data-native-title', target.getAttribute('title'));
        target.removeAttribute('title');
    }
    activeTooltipTarget = target;
    el.textContent = text;
    positionTooltip(x, y);
    el.classList.add('show');
}

function initSmartTooltips() {
    if (uiTooltipInitialized) return;
    uiTooltipInitialized = true;
    const hasHover = window.matchMedia && window.matchMedia('(hover: hover)').matches;
    if (!hasHover) return;
    document.addEventListener('mouseover', (ev) => {
        const target = resolveTooltipTarget(ev.target);
        if (!target) return;
        showTooltipForTarget(target, ev.clientX, ev.clientY);
    });
    document.addEventListener('mousemove', (ev) => {
        if (!activeTooltipTarget || !activeTooltipEl) return;
        positionTooltip(ev.clientX, ev.clientY);
    });
    document.addEventListener('mouseout', (ev) => {
        if (!activeTooltipTarget) return;
        const related = ev.relatedTarget;
        if (related && activeTooltipTarget.contains(related)) return;
        hideActiveTooltip();
    });
    document.addEventListener('focusin', (ev) => {
        const target = resolveTooltipTarget(ev.target);
        if (!target) return;
        const rect = target.getBoundingClientRect();
        showTooltipForTarget(target, rect.left + 8, rect.bottom + 4);
    });
    document.addEventListener('focusout', () => {
        hideActiveTooltip();
    });
    window.addEventListener('scroll', hideActiveTooltip, { passive: true });
    window.addEventListener('resize', hideActiveTooltip, { passive: true });
}

function updateLastUpdatedDisplay() {
    updateBreadcrumb();
    renderSiteFooter();
}

// ==========================================================================
// RECICLAGEM
// ==========================================================================

function loadReciclagemTemplates() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
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
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    localStorage.setItem('reciclagemTemplates', JSON.stringify(reciclagemTemplates));
    scheduleLocalSync('reciclagem-templates', { silent, notify: !silent });
}

function loadReciclagemOverrides() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    try {
        const stored = localStorage.getItem('reciclagemOverrides');
        reciclagemOverrides = stored ? JSON.parse(stored) || {} : {};
    } catch {
        reciclagemOverrides = {};
    }
}

function saveReciclagemOverrides(silent = false) {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    localStorage.setItem('reciclagemOverrides', JSON.stringify(reciclagemOverrides));
    scheduleLocalSync('reciclagem-overrides', { silent, notify: !silent });
}

function loadReciclagemHistory() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    try {
        const stored = localStorage.getItem('reciclagemHistory');
        reciclagemHistory = stored ? JSON.parse(stored) || [] : [];
    } catch {
        reciclagemHistory = [];
    }
}

function saveReciclagemHistory(silent = false) {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    localStorage.setItem('reciclagemHistory', JSON.stringify(reciclagemHistory));
    scheduleLocalSync('reciclagem-history', { silent, notify: !silent });
}

function loadReciclagemNotes() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    try {
        const stored = localStorage.getItem('reciclagemNotes');
        reciclagemNotes = stored ? JSON.parse(stored) || {} : {};
    } catch {
        reciclagemNotes = {};
    }
}

function saveReciclagemNotes(silent = false) {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    localStorage.setItem('reciclagemNotes', JSON.stringify(reciclagemNotes));
    scheduleLocalSync('reciclagem-notes', { silent, notify: !silent });
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
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    if (!force && reciclagemLoadedAt) return;
    setAppState('reciclagemData', {}, { silent: true });
    setAppState('reciclagemLoadedAt', new Date(), { silent: true });
    if (force) {
        showToast("Reciclagem via Supabase será ativada em breve.", "info");
    }
}

async function refreshReciclagemIfNeeded() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    const before = reciclagemLoadedAt ? reciclagemLoadedAt.getTime() : 0;
    await loadReciclagemData(false);
    const after = reciclagemLoadedAt ? reciclagemLoadedAt.getTime() : 0;
    if (after > before && currentTab === 'reciclagem') {
        renderReciclagem();
    }
}

function startReciclagemAutoRefresh() {
    return;
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
        HELIPONTO: 'HELIPONTO',
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
    openWhatsApp(phone, text);
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

function buildReciclagemSummaryData(items) {
    const counts = { expired: 0, due: 0, ok: 0, unknown: 0, total: items.length };
    const typeCounts = {};
    items.forEach(item => {
        const status = item.collabStatus || item.status || 'unknown';
        if (counts[status] !== undefined) counts[status] += 1;
        (item.detailItems || []).forEach(d => {
            if (!typeCounts[d.label]) typeCounts[d.label] = { expired: 0, due: 0, ok: 0, unknown: 0 };
            typeCounts[d.label][d.status] = (typeCounts[d.label][d.status] || 0) + 1;
        });
    });
    return { counts, typeCounts };
}

function renderReciclagemSummary(items) {
    const summaryEl = document.getElementById('reciclagem-summary');
    if (!summaryEl) return;
    const { counts } = buildReciclagemSummaryData(items);
    summaryEl.innerHTML = `
        <div class="reciclagem-kpi">
            <div class="reciclagem-kpi-card status-expired">
                <div class="label">Vencidos</div>
                <div class="value">${counts.expired}</div>
                <div class="meta">Críticos</div>
            </div>
            <div class="reciclagem-kpi-card status-due">
                <div class="label">Próximos</div>
                <div class="value">${counts.due}</div>
                <div class="meta">Até ${CONFIG?.reciclagem?.alertDays ?? 30} dias</div>
            </div>
            <div class="reciclagem-kpi-card status-ok">
                <div class="label">Em dia</div>
                <div class="value">${counts.ok}</div>
                <div class="meta">Regulares</div>
            </div>
            <div class="reciclagem-kpi-card status-unknown">
                <div class="label">Sem data</div>
                <div class="value">${counts.unknown}</div>
                <div class="meta">Necessita ajuste</div>
            </div>
            <div class="reciclagem-kpi-card">
                <div class="label">Total</div>
                <div class="value">${counts.total}</div>
                <div class="meta">Itens filtrados</div>
            </div>
        </div>
    `;
    summaryEl.classList.remove('hidden');
}

async function renderReciclagem() {
    if (!isDashboardFeatureEnabled('reciclagem')) return;
    const list = document.getElementById('reciclagem-list');
    if (!list) return;
    const typeCountsEl = document.getElementById('reciclagem-type-counts');
    if (typeCountsEl) typeCountsEl.innerHTML = '';
    renderReciclagemSkeleton(list, 6);
    bindReciclagemActions(list);
    try {
        await loadReciclagemData(false);
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'render-reciclagem-load' }, { silent: true });
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
        AppErrorHandler.capture(err, { scope: 'render-reciclagem-filters' }, { silent: true });
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
        const previousValue = sheetSelect.value || 'all';
        sheetSelect.innerHTML = `<option value="all">Todas as reciclagens</option>` +
            keys.map(k => `<option value="${k}">${getReciclagemSheetLabel(k)}</option>`).join('');
        sheetSelect.value = keys.includes(previousValue) ? previousValue : 'all';
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
        AppCacheManager.set('reciclagem-render', 'items', reciclagemRenderCache);
        return;
    }

    reciclagemRenderCache = filteredByDetail;
    AppCacheManager.set('reciclagem-render', 'items', reciclagemRenderCache);
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
        const displayItems = sheetFilter !== 'all'
            ? (item.detailItems || []).filter(d => d.key === sheetFilter)
            : (item.detailItems || []);
        const badge = (item.match === 're' && displayItems.some(d => d.status === 'expired'))
            ? `<span class="reciclagem-badge" title="Vencido"></span>`
            : '';
        const detailLines = item.match === 're'
            ? displayItems.map(d => {
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
            const unitChips = displayItems.map(d => {
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
        const chips = displayItems.map(d => {
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

function exportReciclagemReport() {
    if (!reciclagemRenderCache.length) {
        showToast("Nenhum dado de reciclagem para exportar.", "info");
        return;
    }
    const items = reciclagemRenderCache;
    const summary = buildReciclagemSummaryData(items);
    const resumo = [
        { "Indicador": "Vencidos", "Valor": summary.counts.expired },
        { "Indicador": "Próximos", "Valor": summary.counts.due },
        { "Indicador": "Em dia", "Valor": summary.counts.ok },
        { "Indicador": "Sem data", "Valor": summary.counts.unknown },
        { "Indicador": "Total filtrado", "Valor": summary.counts.total }
    ];
    const byType = Object.keys(summary.typeCounts).map(label => {
        const c = summary.typeCounts[label];
        return {
            "Tipo": label,
            "Vencidos": c.expired || 0,
            "Próximos": c.due || 0,
            "Em dia": c.ok || 0,
            "Sem data": c.unknown || 0
        };
    });
    const base = items.map(item => ({
        "Tipo": item.typeLabel || item.type || '',
        "Nome": item.name || '',
        "RE": item.re || '',
        "Unidade": item.unit || '',
        "Status": item.collabStatus || item.status || '',
        "Resumo": item.summary || '',
        "Detalhes": (item.detailItems || []).map(d => `${d.label}: ${d.dateLabel} (${d.status})`).join(' | ')
    }));
    const detalhes = [];
    items.forEach(item => {
        (item.detailItems || []).forEach(d => {
            detalhes.push({
                "Tipo": d.label,
                "Nome": item.name || '',
                "RE": item.re || '',
                "Unidade": item.unit || '',
                "Status": d.status,
                "Validade": d.dateLabel || ''
            });
        });
    });

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(byType), "Por Tipo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(base), "Base");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(detalhes), "Detalhes");

    const tag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `reciclagem_${tag}.xlsx`);
    showToast("Relatório de reciclagem exportado.", "success");
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
    closeUtilityDrawer();
    document.getElementById('help-modal')?.classList.remove('hidden');
    syncModalOpenState();
}

function closeHelpModal() {
    document.getElementById('help-modal')?.classList.add('hidden');
    syncModalOpenState();
}

function setAddressModalModeUi(mode) {
    const isCollab = mode === 'collab';
    const title = document.getElementById('address-modal-title');
    const label = document.getElementById('address-modal-search-label');
    const input = document.getElementById('address-search');
    if (title) title.textContent = isCollab ? 'Endereço do Colaborador' : 'Endereços das Unidades';
    if (label) label.textContent = isCollab ? 'Buscar colaborador' : 'Buscar unidade';
    if (input) input.placeholder = isCollab ? 'Digite nome, RE ou unidade...' : 'Digite a unidade...';
}

function openAddressModal(unitName = '') {
    openAddressModalForUnit(unitName);
}

function openAddressModalForUnit(unitName = '') {
    addressModalState = {
        mode: 'unit',
        filter: String(unitName || ''),
        collabRe: '',
        collabName: '',
        unitName: String(unitName || '')
    };
    const modal = document.getElementById('address-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setAddressModalModeUi('unit');
    const input = document.getElementById('address-search');
    if (input) {
        input.value = addressModalState.filter;
        if (!input.dataset.bound) {
            input.addEventListener('input', () => {
                addressModalState.filter = input.value || '';
                renderAddressList(addressModalState.filter);
            });
            input.dataset.bound = '1';
        }
        setTimeout(() => input.focus(), 0);
    }
    renderAddressList(addressModalState.filter);
}

function openAddressModalForCollaborator(collabRe = '', collabName = '', unitName = '') {
    addressModalState = {
        mode: 'collab',
        filter: String(collabName || collabRe || unitName || ''),
        collabRe: String(collabRe || ''),
        collabName: String(collabName || ''),
        unitName: String(unitName || '')
    };
    const modal = document.getElementById('address-modal');
    if (!modal) return;
    modal.classList.remove('hidden');
    setAddressModalModeUi('collab');
    const input = document.getElementById('address-search');
    if (input) {
        input.value = addressModalState.filter;
        if (!input.dataset.bound) {
            input.addEventListener('input', () => {
                addressModalState.filter = input.value || '';
                renderAddressList(addressModalState.filter);
            });
            input.dataset.bound = '1';
        }
        setTimeout(() => input.focus(), 0);
    }
    renderAddressList(addressModalState.filter);
    loadCollaboratorAddressDb().then(() => {
        if (addressModalState.mode === 'collab') {
            renderAddressList(addressModalState.filter);
        }
    }).catch(() => {});
}

function closeAddressModal() {
    document.getElementById('address-modal')?.classList.add('hidden');
    syncModalOpenState();
}

function openFtWeekPreviewModal(collabRe = '', collabName = '') {
    const modal = document.getElementById('ft-week-preview-modal');
    const title = document.getElementById('ft-week-preview-title');
    const body = document.getElementById('ft-week-preview-body');
    if (!modal || !body) return;
    const re = String(collabRe || '').trim();
    const name = String(collabName || '').trim();
    const display = name ? `${name}${re ? ` (${re})` : ''}` : (re ? `RE ${re}` : 'Colaborador');
    if (!re) {
        if (title) title.textContent = 'Escala completa';
        body.innerHTML = '<p class="empty-state">RE não informado para preview.</p>';
        modal.classList.remove('hidden');
        return;
    }
    const monthRange = getMonthRangeByDateKey(getTodayKey());
    ftPreviewModalState = {
        mode: 'collab',
        re,
        name,
        unit: '',
        groupKey: '',
        monthKey: monthRange.start,
        selectedDate: getTodayKey()
    };
    if (title) title.textContent = `Escala completa • ${display}`;
    body.innerHTML = buildFtMonthCalendarHtmlForRe(re, {
        monthKey: ftPreviewModalState.monthKey,
        selectedDate: ftPreviewModalState.selectedDate
    });
    openFtMonthDayDetails(ftPreviewModalState.selectedDate);
    modal.classList.remove('hidden');
}

function closeFtWeekPreviewModal() {
    document.getElementById('ft-week-preview-modal')?.classList.add('hidden');
    ftPreviewModalState = { mode: 'collab', re: '', name: '', unit: '', groupKey: '', monthKey: '', selectedDate: '' };
    syncModalOpenState();
}

function getPerformanceRelationLabelForRe(item, re) {
    const counterpart = getFtCounterpartLabelForRe(item, re);
    return matchesRe(item?.collabRe, re)
        ? `Cobrindo ${counterpart}`
        : `Coberto por ${counterpart}`;
}

function buildCollaboratorPerformanceSnapshot(collabRe = '', collabName = '') {
    const re = String(collabRe || '').trim();
    const fallbackName = String(collabName || '').trim();
    const collab = resolveCollaboratorByRe(re) || null;
    const displayName = collab?.nome || fallbackName || `RE ${re || 'N/I'}`;
    const displayRe = collab?.re || re || 'N/I';
    const statusInfo = collab ? getStatusInfo(collab) : { text: 'N/I', color: '#64748b' };
    const roleLabel = collab ? getCollaboratorRoleLabel(collab) : 'N/I';
    const groupLabel = collab?.grupoLabel || 'N/I';
    const unitLabel = collab?.posto || 'N/I';
    const scheduleLabel = collab?.escala || 'N/I';

    const todayKey = getTodayKey();
    const rollingStart = getDateKeyWithOffset(todayKey, -29);
    const next30End = getDateKeyWithOffset(todayKey, 30);
    const monthRange = getMonthRangeByDateKey(todayKey);
    const related = getFtOperationalItems(ftLaunches).filter(item => (
        matchesRe(item?.collabRe, re) || matchesRe(item?.coveringRe, re)
    ));
    const inRolling = related.filter(item => {
        const key = getFtItemDateKey(item);
        return isDateInsideRange(key, rollingStart, todayKey);
    });
    const ownRolling = inRolling.filter(item => matchesRe(item?.collabRe, re));
    const coverageRolling = inRolling.filter(item => matchesRe(item?.coveringRe, re) && !matchesRe(item?.collabRe, re));
    const ownPending = ownRolling.filter(item => item?.status === 'pending').length;
    const ownSubmitted = ownRolling.filter(item => item?.status === 'submitted').length;
    const ownLaunched = ownRolling.filter(item => item?.status === 'launched').length;
    const ownClosed = ownSubmitted + ownLaunched;
    const closeRate = ownRolling.length ? Math.round((ownClosed / ownRolling.length) * 100) : 0;
    const monthTotal = related.filter(item => {
        const key = getFtItemDateKey(item);
        return isDateInsideRange(key, monthRange.start, monthRange.end);
    }).length;
    const future30 = related
        .filter(item => {
            const key = normalizeFtDateKey(item?.date);
            return !!key && key > todayKey && key <= next30End;
        })
        .sort((a, b) => getFtItemDateValue(a) - getFtItemDateValue(b))
        .slice(0, 6);
    const recent = related
        .slice()
        .sort((a, b) => getFtItemDateValue(b) - getFtItemDateValue(a))
        .slice(0, 8)
        .map(item => {
            const dateKey = getFtItemDateKey(item) || '';
            const reason = getFtReasonLabel(item?.reason, item?.reasonOther) || item?.reasonRaw || 'N/I';
            return {
                date: dateKey ? formatFtDate(dateKey) : 'Sem data',
                status: getFtStatusLabel(item),
                relation: getPerformanceRelationLabelForRe(item, re),
                unit: getFtUnitLabel(item),
                shift: item?.shift || 'N/I',
                reason
            };
        });

    const weekPlan = [];
    for (let i = 0; i < 7; i++) {
        const dayKey = getDateKeyWithOffset(todayKey, i);
        const duty = getDutyForecastForDate(collab, dayKey);
        const ftCount = getFtItemsForReInRange(re, dayKey, dayKey).length;
        weekPlan.push({
            key: dayKey,
            label: `${getWeekdayShortPtByDate(dayKey)} ${formatFtDateShort(dayKey)}`,
            dutyCode: duty.code,
            dutyClass: duty.className,
            ftCount
        });
    }

    return {
        re: displayRe,
        name: displayName,
        unit: unitLabel,
        group: groupLabel,
        role: roleLabel,
        schedule: scheduleLabel,
        statusInfo,
        rolling: {
            start: rollingStart,
            end: todayKey,
            total: ownRolling.length,
            coverage: coverageRolling.length,
            pending: ownPending,
            submitted: ownSubmitted,
            launched: ownLaunched,
            closeRate
        },
        monthTotal,
        future30,
        recent,
        weekPlan
    };
}

function buildCollaboratorPerformanceModalHtml(snapshot) {
    const weekHtml = snapshot.weekPlan.map(day => `
        <div class="performance-day ${day.dutyClass}">
            <div class="performance-day-label">${day.label}</div>
            <div class="performance-day-duty">${day.dutyCode}</div>
            <div class="performance-day-ft">${day.ftCount ? `FT ${day.ftCount}` : 'sem FT'}</div>
        </div>
    `).join('');

    const upcomingHtml = snapshot.future30.length
        ? snapshot.future30.map(item => `
            <div class="performance-line">
                <strong>${escapeHtml(formatFtDate(item.date || getFtItemDateKey(item) || ''))}</strong>
                <span>${escapeHtml(getFtStatusLabel(item))}</span>
                <span>${escapeHtml(getFtUnitLabel(item))}</span>
                <span>${escapeHtml(item.shift || 'N/I')}</span>
            </div>
        `).join('')
        : '<p class="empty-state">Sem FT futura nos próximos 30 dias.</p>';

    const recentHtml = snapshot.recent.length
        ? snapshot.recent.map(row => `
            <div class="performance-line">
                <strong>${escapeHtml(row.date)}</strong>
                <span>${escapeHtml(row.status)}</span>
                <span>${escapeHtml(row.relation)}</span>
                <span>${escapeHtml(row.unit)}</span>
                <span>${escapeHtml(row.shift)}</span>
            </div>
        `).join('')
        : '<p class="empty-state">Sem histórico recente de FT.</p>';

    return `
        <div class="performance-head">
            <div>
                <div class="performance-title">${escapeHtml(snapshot.name)} <span class="performance-re">(RE ${escapeHtml(snapshot.re)})</span></div>
                <div class="performance-meta">Unidade: ${escapeHtml(snapshot.unit)} • Grupo: ${escapeHtml(snapshot.group)} • Cargo: ${escapeHtml(snapshot.role)}</div>
                <div class="performance-meta">Escala: ${escapeHtml(snapshot.schedule)} • Status atual: <span class="performance-status" style="background:${snapshot.statusInfo.color};">${escapeHtml(snapshot.statusInfo.text)}</span></div>
            </div>
        </div>

        <div class="performance-kpis">
            <div class="performance-kpi"><div class="label">FT executadas (30d)</div><div class="value">${snapshot.rolling.total}</div></div>
            <div class="performance-kpi"><div class="label">FT cobrindo ele (30d)</div><div class="value">${snapshot.rolling.coverage}</div></div>
            <div class="performance-kpi"><div class="label">Pendentes (30d)</div><div class="value">${snapshot.rolling.pending}</div></div>
            <div class="performance-kpi"><div class="label">Confirmadas (30d)</div><div class="value">${snapshot.rolling.submitted}</div></div>
            <div class="performance-kpi"><div class="label">Lançadas (30d)</div><div class="value">${snapshot.rolling.launched}</div></div>
            <div class="performance-kpi"><div class="label">Taxa de fechamento (30d)</div><div class="value">${snapshot.rolling.closeRate}%</div></div>
            <div class="performance-kpi"><div class="label">Registros no mês atual</div><div class="value">${snapshot.monthTotal}</div></div>
            <div class="performance-kpi"><div class="label">Período analisado</div><div class="value">${escapeHtml(formatFtDate(snapshot.rolling.start))} a ${escapeHtml(formatFtDate(snapshot.rolling.end))}</div></div>
        </div>

        <div class="performance-block">
            <h4>Planejamento 7 dias</h4>
            <div class="performance-days">${weekHtml}</div>
        </div>

        <div class="performance-grid">
            <div class="performance-block">
                <h4>Próximas FT (30 dias)</h4>
                <div class="performance-lines">${upcomingHtml}</div>
            </div>
        </div>

        <div class="performance-block">
            <h4>Histórico recente</h4>
            <div class="performance-lines">${recentHtml}</div>
        </div>
    `;
}

function openPerformanceModal(collabRe = '', collabName = '') {
    const modal = document.getElementById('performance-modal');
    const title = document.getElementById('performance-modal-title');
    const body = document.getElementById('performance-modal-body');
    if (!modal || !body) return;
    const re = String(collabRe || '').trim();
    const name = String(collabName || '').trim();
    if (!re) {
        if (title) title.textContent = 'Performance do colaborador';
        body.innerHTML = '<p class="empty-state">RE não informado para abrir a performance.</p>';
        modal.classList.remove('hidden');
        syncModalOpenState();
        return;
    }
    const snapshot = buildCollaboratorPerformanceSnapshot(re, name);
    performanceModalState = { re: snapshot.re, name: snapshot.name };
    if (title) title.textContent = `Performance • ${snapshot.name} (RE ${snapshot.re})`;
    body.innerHTML = buildCollaboratorPerformanceModalHtml(snapshot);
    modal.classList.remove('hidden');
    syncModalOpenState();
}

function closePerformanceModal() {
    document.getElementById('performance-modal')?.classList.add('hidden');
    performanceModalState = { re: '', name: '' };
    syncModalOpenState();
}

function openFtMonthDayDetails(dayKey = '') {
    if (ftPreviewModalState.mode !== 'collab' || !ftPreviewModalState.re) return;
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    ftPreviewModalState.selectedDate = key;
    document.querySelectorAll('#ft-week-preview-body .ft-month-day').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-day') === key);
    });
    const details = document.getElementById('ft-week-preview-day-details');
    if (!details) return;
    details.innerHTML = buildFtDayDetailsHtmlForRe(ftPreviewModalState.re, key);
}

function openFtUnitDayDetailsModal(unitName = '', dayKey = '', groupKey = '') {
    const modal = document.getElementById('ft-week-preview-modal');
    const title = document.getElementById('ft-week-preview-title');
    const body = document.getElementById('ft-week-preview-body');
    if (!modal || !body) return;
    const unit = String(unitName || '').trim();
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    ftPreviewModalState = {
        mode: 'unit',
        re: '',
        name: '',
        unit,
        groupKey: String(groupKey || '').trim(),
        monthKey: '',
        selectedDate: key
    };
    if (title) title.textContent = `Escala da unidade • ${unit || 'N/I'} • ${formatFtDate(key)}`;
    body.innerHTML = buildFtUnitDayDetailsHtml(unit, key, ftPreviewModalState.groupKey);
    modal.classList.remove('hidden');
}

function buildAddressEntriesForUnit() {
    const units = [...new Set(currentData.map(d => d.posto).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, 'pt-BR'));
    return units.map(unit => {
        const address = getAddressForUnit(unit) || '';
        return {
            kind: 'unit',
            title: unit,
            subtitle: '',
            unit,
            address,
            mapQuery: address || unit,
            portalQuery: unit
        };
    });
}

function buildAddressEntriesForCollaborator() {
    const list = [];
    const seen = new Set();
    const source = []
        .concat(currentData || [])
        .concat(allCollaboratorsCache.items || []);
    source.forEach(item => {
        if (!item) return;
        const re = String(item.re || '').trim();
        const reKey = normalizeReKey(re);
        const name = String(item.nome || '').trim();
        const unit = String(item.posto || '').trim();
        const uniqueKey = reKey || `${normalizeUnitKey(name)}:${normalizeUnitKey(unit)}`;
        if (!uniqueKey || seen.has(uniqueKey)) return;
        seen.add(uniqueKey);
        const address = getAddressForCollaborator(item) || '';
        const title = name ? `${name}${re ? ` (${re})` : ''}` : (re ? `RE ${re}` : 'Colaborador');
        list.push({
            kind: 'collab',
            title,
            subtitle: unit ? `Unidade: ${unit}` : '',
            unit,
            collabRe: re,
            collabName: name,
            address,
            mapQuery: address || unit || name || re,
            portalQuery: address || `${name} ${unit}`.trim() || re
        });
    });
    return list.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
}

function buildAddressEntries() {
    return addressModalState.mode === 'collab'
        ? buildAddressEntriesForCollaborator()
        : buildAddressEntriesForUnit();
}

function renderAddressList(term = '') {
    const list = document.getElementById('address-list');
    if (!list) return;
    const entries = buildAddressEntries();
    const filter = normalizeUnitKey(term || '');
    const normalizedFilter = filter.trim();
    let filtered = normalizedFilter
        ? entries.filter(e => {
            const haystack = [
                e.title,
                e.subtitle,
                e.unit,
                e.address,
                e.collabRe,
                e.collabName
            ].join(' ');
            return normalizeUnitKey(haystack).includes(normalizedFilter);
        })
        : entries;
    if (addressModalState.mode === 'collab' && !normalizedFilter && addressModalState.collabRe) {
        const selected = entries.filter(e => matchesRe(e.collabRe, addressModalState.collabRe));
        if (selected.length) filtered = selected;
    }
    if (!filtered.length) {
        list.innerHTML = `<p class="empty-state">${addressModalState.mode === 'collab' ? 'Nenhum colaborador encontrado.' : 'Nenhuma unidade encontrada.'}</p>`;
        return;
    }
    list.innerHTML = filtered.map(e => {
        const addr = e.address || '';
        const addrHtml = addr ? escapeHtml(addr) : 'Endereço não cadastrado';
        const addrJs = JSON.stringify(addr);
        const mapQuery = e.mapQuery || '';
        const mapJs = JSON.stringify(mapQuery);
        const portalQuery = e.portalQuery || '';
        const portalJs = JSON.stringify(portalQuery);
        const hasMap = !!mapQuery;
        const hasPortal = !!portalQuery;
        const hasAddress = !!addr;
        const subtitleHtml = e.subtitle ? `<div class="address-subtitle">${escapeHtml(e.subtitle)}</div>` : '';
        return `
            <div class="address-card">
                <div class="address-header">
                    <div>
                        <div class="address-title">${escapeHtml(e.title || '')}</div>
                        ${subtitleHtml}
                    </div>
                    ${hasAddress ? `<span class="address-badge">OK</span>` : `<span class="address-badge missing">Sem endereço</span>`}
                </div>
                <div class="address-text">${addrHtml}</div>
                <div class="address-actions menu-actions-row">
                    <button class="btn btn-secondary btn-small" onclick="copyAddressText(${addrJs})" ${hasAddress ? '' : 'disabled'}>Copiar</button>
                    <button class="btn btn-secondary btn-small" onclick="openAddressInMaps(${mapJs}, '')" ${hasMap ? '' : 'disabled'}>Ver no mapa</button>
                    <button class="btn btn-secondary btn-small" onclick="openAddressPortal(${portalJs})" ${hasPortal ? '' : 'disabled'}>Portal</button>
                </div>
            </div>
        `;
    }).join('');
}

function copyAddressText(text) {
    if (!text) return;
    if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Endereço copiado.", "success");
        }).catch(() => fallbackCopy(text));
        return;
    }
    fallbackCopy(text);
}

function openAddressInMaps(address, unitName) {
    const query = address || unitName;
    if (!query) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(url, '_blank');
}

function buildMapsRouteUrl(origin, destination) {
    if (!origin || !destination) return '';
    const params = new URLSearchParams({
        api: '1',
        origin: origin,
        destination: destination
    });
    return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function openMapsRoute(origin, destination) {
    const url = buildMapsRouteUrl(origin, destination);
    if (url) {
        window.open(url, '_blank');
        return;
    }
    const query = destination || origin;
    if (!query) return;
    const searchUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
    window.open(searchUrl, '_blank');
}

async function openSubstituteRouteModal(candidateRe, targetRe, modeUsed) {
    const modal = document.getElementById('route-modal');
    if (!modal) return;
    const metaEl = document.getElementById('route-meta');
    const candidate = currentData.find(c => matchesRe(c.re, candidateRe))
        || (allCollaboratorsCache.items || []).find(c => matchesRe(c.re, candidateRe));
    const target = currentData.find(c => matchesRe(c.re, targetRe))
        || (allCollaboratorsCache.items || []).find(c => matchesRe(c.re, targetRe))
        || getSubstituteTarget();
    if (!candidate || !target) {
        showToast("Não foi possível localizar os colaboradores para a rota.", "error");
        return;
    }
    modal.classList.remove('hidden');
    if (metaEl) metaEl.textContent = 'Calculando rota...';
    const seq = ++routeMapSeq;
    await loadUnitAddressDb();
    await loadCollaboratorAddressDb();
    const baseMode = modeUsed === 'rota' ? 'endereco' : (modeUsed === 'off' ? 'posto' : modeUsed);
    const originAddr = getMapsLocationForCollab(candidate, baseMode) || candidate.posto || '';
    const destAddr = getMapsLocationForCollab(target, baseMode) || target.posto || '';
    routeModalState = { origin: originAddr, destination: destAddr };
    const originCoords = await getCoordsForAddress(originAddr);
    const destCoords = await getCoordsForAddress(destAddr);
    if (seq !== routeMapSeq) return;
    if (!originCoords || !destCoords) {
        if (metaEl) metaEl.textContent = 'Endereço indisponível para calcular rota. Tente abrir no Google Maps.';
        return;
    }
    await renderRouteMap(originCoords, destCoords, {
        originLabel: `${candidate.nome} (RE ${candidate.re})`,
        destLabel: `${target.nome} (RE ${target.re})`
    }, seq);
}

function closeRouteModal() {
    document.getElementById('route-modal')?.classList.add('hidden');
    syncModalOpenState();
}

function openRouteInMaps() {
    const origin = routeModalState?.origin || '';
    const destination = routeModalState?.destination || '';
    if (!origin && !destination) return;
    openMapsRoute(origin, destination);
}

async function renderRouteMap(origin, dest, labels = {}, seq = 0) {
    const metaEl = document.getElementById('route-meta');
    if (!window.L) {
        if (metaEl) metaEl.textContent = 'Leaflet não carregou. Use o botão Google Maps.';
        return;
    }
    const container = document.getElementById('route-map');
    if (routeMapInstance && container && routeMapInstance.getContainer() !== container) {
        routeMapInstance.remove();
        routeMapInstance = null;
        routeMapLayer = null;
        routeMapMarkers = [];
    }
    if (!routeMapInstance) {
        routeMapInstance = L.map('route-map');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: '&copy; OpenStreetMap'
        }).addTo(routeMapInstance);
    }
    if (seq && seq !== routeMapSeq) return;
    if (routeMapLayer) {
        routeMapInstance.removeLayer(routeMapLayer);
        routeMapLayer = null;
    }
    routeMapMarkers.forEach(marker => routeMapInstance.removeLayer(marker));
    routeMapMarkers = [];

    const route = await fetchOsrmRoute(origin, dest);
    if (seq && seq !== routeMapSeq) return;
    let distanceKm = null;
    let durationMin = null;
    if (route?.geometry?.coordinates?.length) {
        const latlngs = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);
        routeMapLayer = L.polyline(latlngs, {
            color: '#0b4fb3',
            weight: 5,
            opacity: 0.9,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(routeMapInstance);
        distanceKm = route.distanceKm;
        durationMin = route.durationMin;
    } else {
        routeMapLayer = L.polyline(
            [[origin.lat, origin.lon], [dest.lat, dest.lon]],
            { color: '#94a3b8', weight: 3, opacity: 0.85, dashArray: '6,6' }
        ).addTo(routeMapInstance);
        distanceKm = calcDistanceKm(origin, dest);
    }

    const originLabel = labels.originLabel || 'Origem';
    const destLabel = labels.destLabel || 'Destino';
    const originMarker = L.marker([origin.lat, origin.lon])
        .addTo(routeMapInstance)
        .bindPopup(originLabel)
        .bindTooltip(originLabel, { direction: 'top', offset: [0, -10] });
    const destMarker = L.marker([dest.lat, dest.lon])
        .addTo(routeMapInstance)
        .bindPopup(destLabel)
        .bindTooltip(destLabel, { direction: 'top', offset: [0, -10] });
    routeMapMarkers.push(originMarker, destMarker);

    if (routeMapLayer) {
        routeMapInstance.fitBounds(routeMapLayer.getBounds().pad(0.2));
    }
    setTimeout(() => routeMapInstance.invalidateSize(), 0);

    const distLabel = formatDistanceKm(distanceKm);
    const durLabel = formatDurationMin(durationMin);
    const line = distLabel ? `Distância: ${distLabel} km${durLabel ? ` • ${durLabel}` : ''}` : 'Distância indisponível.';
    if (metaEl) metaEl.textContent = `Origem: ${labels.originLabel || ''} • Destino: ${labels.destLabel || ''} • ${line}`;
}

function openAddressPortal(query = '') {
    const base = 'https://gustauvm.github.io/ENDERECOS-DUNAMIS/';
    const q = String(query || '').trim();
    const url = q ? `${base}?q=${encodeURIComponent(q)}` : base;
    window.open(url, '_blank');
}

function openGuideModal() {
    closeUtilityDrawer();
    document.getElementById('guide-modal')?.classList.remove('hidden');
    syncModalOpenState();
}

function closeGuideModal() {
    document.getElementById('guide-modal')?.classList.add('hidden');
    syncModalOpenState();
}

function openPromptsModal() {
    closeUtilityDrawer();
    document.getElementById('prompts-modal')?.classList.remove('hidden');
    syncModalOpenState();
}

function closePromptsModal() {
    document.getElementById('prompts-modal')?.classList.add('hidden');
    syncModalOpenState();
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

function hydrateSearchUnits() {
    const list = document.getElementById('search-unit-list');
    if (!list) return;
    const units = [...new Set(currentData.map(d => d.posto).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
    list.innerHTML = units.map(u => `<option value="${u}"></option>`).join('');
}

async function suggestCoverageFromSearch() {
    const input = document.getElementById('search-unit-target');
    const container = document.getElementById('search-results');
    if (!input || !container) return;
    const raw = (input.value || '').trim();
    if (!raw) {
        showToast("Informe a unidade para sugerir cobertura.", "error");
        return;
    }
    const matched = findUnitByName(raw);
    if (!matched) {
        showToast("Unidade não encontrada na base.", "error");
        return;
    }
    input.value = matched;
    await renderCoverageSuggestionsByUnit(matched, container);
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
                        const ftDetailHtml = buildFtDetailsHtml(p.re);
                        const roleLabel = getCollaboratorRoleLabel(p);
                        const reJs = JSON.stringify(p.re || '');
                        const nameJs = JSON.stringify(p.nome || '');
                        const phoneJs = JSON.stringify(p.telefone || '');
                        const reJsAttr = escapeHtml(reJs);
                        const nameJsAttr = escapeHtml(nameJs);
                        const phoneJsAttr = escapeHtml(phoneJs);
                        const detailKey = p.id != null ? p.id : (p.re || '');
                        const detailJs = JSON.stringify(detailKey);
                        const detailJsAttr = escapeHtml(detailJs);
                        return `
                            <tr class="${homenageado ? 'homenageado-row' : ''}">
                                <td>
                                    <div class="colab-cell">
                                        <strong class="${homenageado ? 'homenageado-nome' : ''}">${nomeDisplay}</strong>
                                        ${p.rotulo ? `
                                            ${p.rotulo.split(',').map(r => `
                                                <span class="mini-label">
                                                    ${(r === 'OUTRO' && p.rotuloDetalhe) ? p.rotuloDetalhe : r}
                                                </span>
                                            `).join('')}
                                            ${p.rotuloFim ? `<span class="mini-date">Até ${formatDate(p.rotuloFim)}</span>` : ''}
                                        ` : ''}
                                        <div class="unit-colab-meta"><strong>Cargo:</strong> ${escapeHtml(roleLabel)}</div>
                                        ${ftDetailHtml}
                                        <div class="unit-colab-week">
                                            <button class="btn-mini btn-secondary week-preview-btn" onclick="openFtWeekPreviewModal(${reJsAttr}, ${nameJsAttr})" title="Ver escala completa do mês">ESCALA COMPLETA</button>
                                        </div>
                                    </div>
                                </td>
                                <td>${p.re}</td>
                                <td>
                                    ${p.tipoEscala ? `<div style="font-weight:bold; font-size:0.8rem;">${p.tipoEscala}</div>` : ''}
                                    <div>${p.escala}</div>
                                    ${getTurnoInfo(p.escala) ? `<div style="margin-top: 4px;">${getTurnoInfo(p.escala)}</div>` : ''}
                                </td>
                                <td style="text-align: center;">
                                    <button class="edit-btn-icon small" onclick="openCollabDetailsModal(${detailJsAttr})" title="Detalhes do colaborador">${ICONS.details}</button>
                                    <button class="edit-btn-icon small" onclick="openEditModal(${p.id})">${ICONS.edit}</button>
                                    <button class="edit-btn-icon small ${p.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="${p.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
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

// ==========================================================================
// LOGICA DE EDICAO E STATUS
// ==========================================================================

function getStatusInfo(item) {
    // 1. Verifica Rótulos Especiais (Prioridade)
    if (item.rotulo) {
        const labels = String(item.rotulo)
            .split(',')
            .map(v => v.trim())
            .filter(Boolean);
        const absence = labels.find(l => l === 'FÉRIAS' || l === 'ATESTADO' || l === 'AFASTADO');
        if (absence) {
            return { text: absence, color: '#0f766e' }; // Verde azulado (afastamento)
        }
        if (labels.includes('FT')) {
            return { text: 'PLANTÃO EXTRA (FT)', color: '#002D72' }; // Azul Dunamis
        }
    }

    // 2. Verifica escala oficial pela coluna TURMA da planilha.
    const duty = getDutyStatusByTurma(item.turma);
    return { text: duty.text, color: duty.color };
}

function getDutyStatusByTurma(turma, date = new Date()) {
    const turmaText = String(turma ?? '').trim();
    const turmaNumber = /^[12]$/.test(turmaText) ? Number(turmaText) : NaN;
    const dateObj = date instanceof Date
        ? date
        : new Date(`${normalizeFtDateKey(date) || getTodayKey()}T00:00:00`);

    if (!Number.isFinite(turmaNumber) || (turmaNumber !== 1 && turmaNumber !== 2) || Number.isNaN(dateObj.getTime())) {
        return {
            code: 'sem_turma',
            text: 'STATUS INDEFINIDO',
            label: 'Sem turma',
            color: '#64748b',
            onDuty: null,
            turma: turmaNumber || null
        };
    }

    const isOddDay = dateObj.getDate() % 2 !== 0;
    const onDuty = turmaNumber === 1 ? isOddDay : !isOddDay;
    return {
        code: onDuty ? 'plantao' : 'folga',
        text: onDuty ? 'PLANTÃO' : 'FOLGA',
        label: onDuty ? 'Plantão previsto' : 'Folga prevista',
        color: onDuty ? '#dc3545' : '#28a745',
        onDuty,
        turma: turmaNumber
    };
}

// --- AI search removed (stubs) ---
function toggleAiSearchButton() {}
function isAiSearchEnabled() { return false; }
function updateAiSearchButton() {}

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

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
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

function stripUnitNoise(base) {
    if (!base) return '';
    const trailingSingles = new Set([
        'LTDA', 'EIRELI', 'EPP', 'ME', 'MEI', 'SPE', 'SC', 'INC', 'CIA',
        'SOCIEDADE', 'ANONIMA', 'ASSOCIACAO', 'FUNDACAO', 'HOLDING',
        'SERVICOS', 'SERVICO', 'SEGURANCA', 'BOMBEIROS'
    ]);
    let parts = base.split(' ').filter(Boolean);
    let changed = true;
    while (changed && parts.length) {
        changed = false;
        const last = parts[parts.length - 1];
        if (trailingSingles.has(last)) {
            parts.pop();
            changed = true;
            continue;
        }
        if (parts.length >= 2) {
            const two = `${parts[parts.length - 2]} ${parts[parts.length - 1]}`;
            if (two === 'S A' || two === 'S C') {
                parts.pop();
                parts.pop();
                changed = true;
            }
        }
    }
    return parts.join(' ').trim();
}

function buildUnitKeyVariants(name) {
    const base = normalizeUnitKey(name);
    const variants = new Set();
    const addVariant = (value) => {
        if (value) variants.add(value);
    };
    addVariant(base);
    addVariant(stripUnitNoise(base));
    if (base.startsWith('RB ')) addVariant(base.replace(/^RB\\s+/, '').trim());
    if (base.startsWith('DUNAMIS ')) addVariant(base.replace(/^DUNAMIS\\s+/, '').trim());
    if (base.startsWith('HOSPITAL ')) addVariant(base.replace(/^HOSPITAL\\s+/, '').trim());
    const suffixClean = base
        .replace(/\\s*-\\s*(SERVICOS|SERVIÇOS|SEGURANCA|SEGURANÇA|BOMBEIROS|SERVICO|SERVIÇO)\\b/g, '')
        .replace(/\\s+SERVICOS\\b/g, '')
        .replace(/\\s+SERVIÇOS\\b/g, '')
        .replace(/\\s+SEGURANCA\\b/g, '')
        .replace(/\\s+SEGURANÇA\\b/g, '')
        .replace(/\\s+BOMBEIROS\\b/g, '')
        .trim();
    if (suffixClean) {
        addVariant(suffixClean);
        addVariant(stripUnitNoise(suffixClean));
    }
    Array.from(variants).forEach(v => addVariant(stripUnitNoise(v)));
    return Array.from(variants).filter(Boolean);
}

function mergeUnitAddressEntries(primary, fallback) {
    const map = new Map();
    (primary || []).forEach(entry => {
        const key = normalizeUnitKey(entry?.nome);
        if (!key) return;
        map.set(key, { ...entry });
    });
    (fallback || []).forEach(entry => {
        const key = normalizeUnitKey(entry?.nome);
        if (!key) return;
        if (map.has(key)) {
            const existing = map.get(key);
            map.set(key, { ...entry, ...existing });
        } else {
            map.set(key, { ...entry });
        }
    });
    return Array.from(map.values());
}

function buildUnitAddressNormMap(entries) {
    const normMap = {};
    (entries || []).forEach(e => {
        if (!e?.endereco) return;
        const variants = buildUnitKeyVariants(e.nome);
        variants.forEach(key => {
            if (key && !normMap[key]) normMap[key] = e.endereco;
        });
    });
    return normMap;
}

async function loadUnitAddressDb() {
    initializeCoreManagers();
    let entries = [];
    let source = '';

    try {
        const units = await fetchSupabaseUnits(false);
        if (units.length) {
            entries = units.map(unit => ({
                nome: String(unit?.posto || unit?.cliente || unit?.unidade_de_negocio || '').trim().toUpperCase(),
                endereco: unit?.endereco_formatado || formatUnitAddress(unit)
            })).filter(Boolean);
            unitMetadata = units.reduce((acc, unit) => {
                const key = String(unit?.posto || '').trim().toUpperCase();
                if (!key) return acc;
                if (unit?.rotulo || unit?.rotulo_detalhe || unit?.rotulo_responsavel) {
                    acc[key] = {
                        rotulo: unit.rotulo || '',
                        detalhe: unit.rotulo_detalhe || '',
                        responsavel: unit.rotulo_responsavel || ''
                    };
                }
                return acc;
            }, {});
            source = 'Supabase';
        }
    } catch {}

    try {
        const resp = await fetch('unit_addresses.json', { cache: 'no-store' });
        if (resp.ok) {
            const json = await resp.json();
            const jsonEntries = json?.entries || [];
            if (!entries.length) {
                entries = jsonEntries;
                source = json?.source || 'unit_addresses.json';
            } else if (jsonEntries.length) {
                entries = mergeUnitAddressEntries(entries, jsonEntries);
            }
        }
    } catch {}

    unitAddressDb = {
        source,
        entries,
        address_map_norm: buildUnitAddressNormMap(entries)
    };

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
    AppCacheManager.clear('unit-geo');
    Object.entries(unitGeoCache || {}).forEach(([key, value]) => {
        if (!key || !value) return;
        AppCacheManager.set('unit-geo', key, value);
    });
}

function getAddressForUnit(unitName) {
    const map = unitAddressDb?.address_map_norm || {};
    const variants = buildUnitKeyVariants(unitName);
    for (const key of variants) {
        if (map[key]) return map[key];
    }
    const entries = unitAddressDb?.entries || [];
    const keys = variants.length ? variants : [normalizeUnitKey(unitName)];
    for (const base of keys) {
        if (base.length < 5) continue;
        const direct = entries.find(e => normalizeUnitKey(e.nome) === base && e.endereco);
        if (direct) return direct.endereco;
        const contains = entries.find(e => normalizeUnitKey(e.nome).includes(base) && e.endereco);
        if (contains) return contains.endereco;
        const contained = entries.find(e => {
            const key = normalizeUnitKey(e.nome);
            return key.length >= 5 && base.includes(key) && e.endereco;
        });
        if (contained) return contained.endereco;
    }
    return null;
}

async function getCoordsForAddress(address) {
    if (!address) return null;
    const cached = getCachedUnitGeo(address);
    if (cached) return cached;
    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
        const resp = await fetch(url, { headers: { 'Accept-Language': 'pt-BR' } });
        if (!resp.ok) return null;
        const data = await resp.json();
        if (!data || !data.length) return null;
        const coords = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        if (!Number.isFinite(coords.lat) || !Number.isFinite(coords.lon)) return null;
        setCachedUnitGeo(address, coords);
        localStorage.setItem('unitGeoCache', JSON.stringify(unitGeoCache));
        scheduleLocalSync('unit-geo-cache', { silent: true });
        return coords;
    } catch {
        return null;
    }
}

function getAddressOrNameForUnit(unitName) {
    if (!unitName) return null;
    return getAddressForUnit(unitName) || unitName;
}

async function getCoordsForUnit(unitName) {
    const address = getAddressOrNameForUnit(unitName);
    return await getCoordsForAddress(address);
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

function formatDistanceKm(value) {
    if (value == null || !Number.isFinite(value)) return null;
    const rounded = Math.round(value * 10) / 10;
    return String(rounded).replace('.', ',');
}

function formatDurationMin(value) {
    if (value == null || !Number.isFinite(value)) return '';
    const total = Math.round(value);
    if (total < 60) return `${total} min`;
    const h = Math.floor(total / 60);
    const m = total % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
}

function getOsrmConfig() {
    const routing = CONFIG?.routing || {};
    const base = String(routing.osrmBaseUrl || 'https://router.project-osrm.org').replace(/\/+$/, '');
    const profile = routing.osrmProfile || 'driving';
    const enabled = routing.osrmEnabled !== false;
    let maxCandidates = parseInt(routing.osrmMaxCandidates, 10);
    if (!Number.isFinite(maxCandidates)) maxCandidates = 12;
    maxCandidates = Math.min(Math.max(maxCandidates, 3), 30);
    return { base, profile, enabled, maxCandidates };
}

function buildOsrmKey(origin, dest) {
    const o = `${origin.lat.toFixed(5)},${origin.lon.toFixed(5)}`;
    const d = `${dest.lat.toFixed(5)},${dest.lon.toFixed(5)}`;
    return `${o}|${d}`;
}

async function fetchOsrmTable(origin, destinations) {
    const cfg = getOsrmConfig();
    if (!cfg.enabled || !origin || !destinations?.length) return null;
    const coords = [origin].concat(destinations);
    const key = coords.map(c => `${c.lat.toFixed(5)},${c.lon.toFixed(5)}`).join('|');
    const cached = getCachedOsrmTable(key);
    if (cached) return cached;
    try {
        const coordsStr = coords.map(c => `${c.lon},${c.lat}`).join(';');
        const destIdx = destinations.map((_, i) => i + 1).join(';');
        const url = `${cfg.base}/table/v1/${cfg.profile}/${coordsStr}?sources=0&destinations=${destIdx}&annotations=distance,duration`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        const distances = data?.distances?.[0] || [];
        const durations = data?.durations?.[0] || [];
        const result = { distances, durations };
        setCachedOsrmTable(key, result);
        return result;
    } catch {
        return null;
    }
}

async function fetchOsrmRoute(origin, dest) {
    const cfg = getOsrmConfig();
    if (!cfg.enabled || !origin || !dest) return null;
    const key = buildOsrmKey(origin, dest);
    const cached = getCachedOsrmRoute(key);
    if (cached) return cached;
    try {
        const url = `${cfg.base}/route/v1/${cfg.profile}/${origin.lon},${origin.lat};${dest.lon},${dest.lat}?overview=full&geometries=geojson`;
        const resp = await fetch(url);
        if (!resp.ok) return null;
        const data = await resp.json();
        const route = data?.routes?.[0];
        if (!route) return null;
        const result = {
            distanceKm: route.distance / 1000,
            durationMin: route.duration / 60,
            geometry: route.geometry
        };
        setCachedOsrmRoute(key, result);
        return result;
    } catch {
        return null;
    }
}

async function handleCoverageProximityAsync(target, container) {
    container.innerHTML = '<p class="empty-state">Calculando proximidade por endereços...</p>';

    const targetAddress = getAddressOrNameForUnit(target.posto);
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
        const addr = getAddressOrNameForUnit(cand.posto);
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

function buildUnitCoverageReason(candidate, unitName) {
    const status = getStatusInfo(candidate).text;
    const parts = [];
    if (status.includes('FOLGA')) parts.push('está de folga hoje');
    if (candidate.posto && unitName && normalizeUnitKey(candidate.posto) === normalizeUnitKey(unitName)) {
        parts.push(`atua na mesma unidade (${candidate.posto})`);
    }
    const dist = formatDistanceKm(candidate._distanceKm);
    if (dist && unitName) parts.push(`está a ~${dist} km da unidade ${unitName}`);
    if (!parts.length) parts.push('disponibilidade verificada pela escala e status atual');
    return `Motivo: ${parts.join(' e ')}.`;
}

async function buildCoverageSuggestionsByUnit(unitName, limit = 6) {
    const normalizedTarget = normalizeUnitKey(unitName);
    const candidates = currentData.filter(d => isDisponivelParaCobrir(d));
    if (!candidates.length) return { list: [], note: 'none' };

    const sameUnit = candidates.filter(d => normalizeUnitKey(d.posto) === normalizedTarget);
    const others = candidates.filter(d => normalizeUnitKey(d.posto) !== normalizedTarget);

    const targetCoords = await getCoordsForUnit(unitName);
    if (!targetCoords) {
        return { list: sameUnit.concat(others).slice(0, limit), note: 'no_target_coords' };
    }

    const unitDistances = {};
    const seen = new Set();
    for (const cand of others) {
        const unit = cand.posto;
        const key = normalizeUnitKey(unit);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        const coords = await getCoordsForUnit(unit);
        if (coords) unitDistances[key] = calcDistanceKm(targetCoords, coords);
    }

    const withDistance = [];
    const withoutDistance = [];
    others.forEach(c => {
        const key = normalizeUnitKey(c.posto);
        const dist = unitDistances[key];
        if (typeof dist === 'number') withDistance.push({ ...c, _distanceKm: dist });
        else withoutDistance.push(c);
    });

    withDistance.sort((a, b) => a._distanceKm - b._distanceKm);
    const list = sameUnit.concat(withDistance, withoutDistance).slice(0, limit);
    list.forEach(p => {
        if (p._distanceKm != null) p._distanceKm = Math.round(p._distanceKm * 10) / 10;
    });
    return { list, note: withDistance.length ? 'ok' : 'no_candidates_distance' };
}

async function renderCoverageSuggestionsByUnit(unitName, container, options = {}) {
    if (!container) return;
    container.innerHTML = '<p class="empty-state">Calculando proximidade por endereços...</p>';

    const { list, note } = await buildCoverageSuggestionsByUnit(unitName, options.limit || 6);
    if (!list.length) {
        container.innerHTML = `<div class="result-card"><h4>Sugestões de cobertura</h4><p>Não encontrei colaboradores de folga no momento.</p></div>`;
        return;
    }

    let meta = `Unidade alvo: ${unitName}. Priorizando quem já atua no posto.`;
    if (note === 'no_target_coords') meta = `Unidade alvo: ${unitName}. Endereço indisponível; usando apenas disponibilidade e unidade.`;
    if (note === 'no_candidates_distance') meta = `Unidade alvo: ${unitName}. Não consegui geocodificar endereços suficientes; mostrando disponíveis.`;

    const targetStub = { posto: unitName, re: '', nome: '' };
    const actionBuilder = options.actionBuilder;
    const cards = list.map(p => {
        const actionHtml = actionBuilder ? actionBuilder(p) : '';
        return renderAiResultCard(p, targetStub, {
            reasonOverride: buildUnitCoverageReason(p, unitName),
            actionHtml
        });
    }).join('');

    container.innerHTML = `
        <div class="result-card">
            <h4>Sugestões de cobertura por proximidade</h4>
            <div class="meta">${meta}</div>
        </div>
        ${cards}
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

function getStatusInfoForFilter(item) {
    if (item && item._statusInfoSnapshot) return item._statusInfoSnapshot;
    return getStatusInfo(item);
}

function applyAiFilters(list, filterStatus, hideAbsence) {
    let filtered = list;
    if (filterStatus === 'plantao') {
        filtered = filtered.filter(d => {
            const status = getStatusInfoForFilter(d).text;
            return status.includes('PLANTÃO') || status.includes('FT');
        });
    } else if (filterStatus === 'folga') {
        filtered = filtered.filter(d => getStatusInfoForFilter(d).text.includes('FOLGA'));
    } else if (filterStatus === 'ft') {
        filtered = filtered.filter(d => getStatusInfoForFilter(d).text.includes('FT'));
    } else if (filterStatus === 'afastado') {
        filtered = filtered.filter(d => !!d.rotulo);
    } else if (filterStatus === 'favorites') {
        filtered = filtered.filter(d => isCollaboratorFavorite(d.re));
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
    const dist = formatDistanceKm(candidate._distanceKm);
    if (dist) parts.push(`está a ~${dist} km da unidade do colaborador RE ${target.re}`);
    if (!parts.length) parts.push('disponibilidade verificada pela escala e status atual');
    return `Motivo: ${parts.join(' e ')}.`;
}

function isHomenageado(item) {
    const re = String(item?.re || '').replace(/\\D/g, '');
    if (re === '8204341') return true;
    const nome = String(item?.nome || item?.name || '').toUpperCase();
    return nome.includes('ADRIANO ANTUONO');
}

function isFtActive(item) {
    return item && item.status === 'launched';
}

function isFtToday(item) {
    return item && item.date === getTodayKey();
}

function normalizeDateRange(from, to) {
    const fromKey = normalizeFtDateKey(from) || '';
    const toKey = normalizeFtDateKey(to) || '';
    if (fromKey && toKey && fromKey > toKey) {
        return { from: toKey, to: fromKey };
    }
    return { from: fromKey, to: toKey };
}

function hasDateRangeFilter(range = {}) {
    const normalized = normalizeDateRange(range.from, range.to);
    return !!(normalized.from || normalized.to);
}

function isDateInsideRange(dateKey, from, to) {
    if (!dateKey) return false;
    if (from && dateKey < from) return false;
    if (to && dateKey > to) return false;
    return true;
}

function getFtStatusRank(status) {
    if (status === 'launched') return 3;
    if (status === 'submitted') return 2;
    if (status === 'pending') return 1;
    return 0;
}

function getFtPreviewCode(status) {
    if (status === 'launched') return 'V';
    if (status === 'submitted') return 'E';
    if (status === 'pending') return 'D';
    return '-';
}

function getFtPreviewLabel(status) {
    if (status === 'launched') return 'Lançada';
    if (status === 'submitted') return 'Confirmada';
    if (status === 'pending') return 'Pendente';
    return 'Sem FT';
}

function getDateKeyWithOffset(baseDateKey, offsetDays) {
    const base = normalizeFtDateKey(baseDateKey) || getTodayKey();
    const date = new Date(`${base}T00:00:00`);
    if (Number.isNaN(date.getTime())) return base;
    date.setDate(date.getDate() + offsetDays);
    return toDateInputValue(date);
}

function getWeekStartMonday(dateKey = '') {
    const base = normalizeFtDateKey(dateKey) || getTodayKey();
    const date = new Date(`${base}T00:00:00`);
    if (Number.isNaN(date.getTime())) return getTodayKey();
    const dayIndex = (date.getDay() + 6) % 7; // segunda=0 ... domingo=6
    date.setDate(date.getDate() - dayIndex);
    return toDateInputValue(date);
}

function getWeekdayShortPt(index) {
    const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB', 'DOM'];
    return labels[index] || '';
}

function getWeekdayShortPtByDate(dateKey = '') {
    const key = normalizeFtDateKey(dateKey);
    if (!key) return '';
    const date = new Date(`${key}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const labels = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SAB'];
    return labels[date.getDay()] || '';
}

function getWeekdayLongPtByDate(dateKey = '') {
    const key = normalizeFtDateKey(dateKey);
    if (!key) return '';
    const date = new Date(`${key}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const labels = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
    return labels[date.getDay()] || '';
}

function getMonthRangeByDateKey(dateKey = '') {
    const base = normalizeFtDateKey(dateKey) || getTodayKey();
    const date = new Date(`${base}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        const fallback = new Date();
        const start = new Date(fallback.getFullYear(), fallback.getMonth(), 1);
        const end = new Date(fallback.getFullYear(), fallback.getMonth() + 1, 0);
        return {
            start: toDateInputValue(start),
            end: toDateInputValue(end),
            monthLabel: fallback.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        };
    }
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const monthLabel = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return {
        start: toDateInputValue(start),
        end: toDateInputValue(end),
        monthLabel
    };
}

function resolveFtPreviewFromItems(items) {
    if (!items || !items.length) {
        return { status: '', code: '-', count: 0, label: 'Sem FT' };
    }
    let selected = '';
    let rank = -1;
    items.forEach(item => {
        const value = getFtStatusRank(item?.status);
        if (value > rank) {
            rank = value;
            selected = item?.status || '';
        }
    });
    return {
        status: selected,
        code: getFtPreviewCode(selected),
        count: items.length,
        label: getFtPreviewLabel(selected)
    };
}

function getFtItemsForReInRange(re, fromKey, toKey) {
    if (!re) return [];
    return getFtOperationalItems(ftLaunches).filter(item => {
        const dateKey = normalizeFtDateKey(item?.date);
        if (!isDateInsideRange(dateKey, fromKey, toKey)) return false;
        return matchesRe(item?.collabRe, re) || matchesRe(item?.coveringRe, re);
    });
}

function getFtItemsForUnitInRange(unitName, fromKey, toKey, groupKey = '') {
    const target = normalizeUnitKey(unitName);
    if (!target) return [];
    return getFtOperationalItems(ftLaunches).filter(item => {
        const dateKey = normalizeFtDateKey(item?.date);
        if (!isDateInsideRange(dateKey, fromKey, toKey)) return false;
        if (groupKey && groupKey !== 'all' && item?.group && item.group !== groupKey) return false;
        const unit = normalizeUnitKey(item?.unitTarget || item?.unitCurrent || '');
        return unit && unit === target;
    });
}

function resolveCollaboratorByRe(re) {
    return currentData.find(c => matchesRe(c.re, re))
        || (allCollaboratorsCache.items || []).find(c => matchesRe(c.re, re))
        || null;
}

function verificarEscalaPorData(turma, dateKey, groupKey) {
    const dayKey = normalizeFtDateKey(dateKey);
    if (!dayKey) return false;
    const date = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const duty = getDutyStatusByTurma(turma, date);
    return duty.onDuty === true;
}

function getDutyForecastForDate(collab, dateKey) {
    if (!collab) return { code: '-', label: 'Sem informação', className: 'unknown' };
    const key = normalizeFtDateKey(dateKey);
    if (!key) return { code: '-', label: 'Sem informação', className: 'unknown' };
    const labels = String(collab.rotulo || '')
        .split(',')
        .map(v => v.trim())
        .filter(Boolean);
    if (labels.length) {
        const start = normalizeFtDateKey(collab.rotuloInicio);
        const end = normalizeFtDateKey(collab.rotuloFim);
        if (start && end && isDateInsideRange(key, start, end)) {
            if (labels.includes('FT')) return { code: 'P', label: 'Plantão extra (FT)', className: 'plantao' };
            return { code: 'F', label: 'Indisponível no período', className: 'folga' };
        }
    }
    const onDuty = verificarEscalaPorData(collab.turma, key, collab.grupo);
    return onDuty
        ? { code: 'P', label: 'Plantão previsto', className: 'plantao' }
        : { code: 'F', label: 'Folga prevista', className: 'folga' };
}

function buildFtWeekPreviewHtmlForRe(re, options = {}) {
    const start = normalizeFtDateKey(options.startDate) || getTodayKey();
    const days = 7;
    const collab = resolveCollaboratorByRe(re);
    const chips = [];
    for (let i = 0; i < days; i++) {
        const dayKey = getDateKeyWithOffset(start, i);
        const date = new Date(`${dayKey}T00:00:00`);
        const weekday = getWeekdayShortPtByDate(dayKey);
        const dayNumber = Number.isNaN(date.getTime()) ? '--' : String(date.getDate()).padStart(2, '0');
        const duty = getDutyForecastForDate(collab, dayKey);
        const items = getFtItemsForReInRange(re, dayKey, dayKey);
        const preview = resolveFtPreviewFromItems(items);
        const css = preview.code === 'V' ? 'v' : (preview.code === 'E' ? 'e' : (preview.code === 'D' ? 'd' : 'none'));
        const title = `${formatFtDate(dayKey)} • ${duty.label}: ${preview.count ? `${preview.count} FT (${preview.label})` : 'Sem FT'}`;
        chips.push(`
            <span class="ft-week-chip ${css}" title="${title}">
                <span class="ft-week-day">${weekday} ${dayNumber}</span>
                <span class="ft-week-duty ${duty.className}">${duty.code}</span>
                ${preview.count ? `<span class="ft-week-ft ${css}">FT${preview.count > 1 ? ` ${preview.count}` : ''}</span>` : ''}
            </span>
        `);
    }
    return `
        <div class="ft-week-preview">
            <div class="ft-week-track">${chips.join('')}</div>
        </div>
    `;
}

function buildFtWeekPreviewHtmlForUnit(unitName, groupKey = '', options = {}) {
    const start = normalizeFtDateKey(options.startDate) || getTodayKey();
    const days = 7;
    const chips = [];
    const unitJsAttr = escapeHtml(JSON.stringify(unitName || ''));
    const groupJsAttr = escapeHtml(JSON.stringify(groupKey || ''));
    for (let i = 0; i < days; i++) {
        const dayKey = getDateKeyWithOffset(start, i);
        const date = new Date(`${dayKey}T00:00:00`);
        const weekday = getWeekdayLongPtByDate(dayKey);
        const dayNumber = Number.isNaN(date.getTime()) ? '--' : String(date.getDate()).padStart(2, '0');
        const items = getFtItemsForUnitInRange(unitName, dayKey, dayKey, groupKey);
        const preview = resolveFtPreviewFromItems(items);
        const css = preview.code === 'V' ? 'v' : (preview.code === 'E' ? 'e' : (preview.code === 'D' ? 'd' : 'none'));
        const title = `${formatFtDate(dayKey)}: ${preview.count ? `${preview.count} FT (${preview.label})` : 'Sem FT'}`;
        chips.push(`
            <button type="button" class="ft-week-chip ${css} ${preview.count ? 'has-ft' : ''}" title="${title}" onclick="openFtUnitDayDetailsModal(${unitJsAttr}, '${dayKey}', ${groupJsAttr})">
                <span class="ft-week-day">${weekday} ${dayNumber}</span>
                ${preview.count ? `<span class="ft-week-ft ${css}">FT${preview.count > 1 ? ` ${preview.count}` : ''}</span>` : ''}
            </button>
        `);
    }
    return `
        <div class="ft-week-preview unit">
            <div class="ft-week-track">${chips.join('')}</div>
        </div>
    `;
}

function getFtCounterpartLabelForRe(item, re) {
    const isCovering = matchesRe(item?.collabRe, re);
    if (isCovering) {
        return item?.coveringName
            || (item?.coveringOther && item.coveringOther !== 'Não se aplica' ? item.coveringOther : '')
            || (item?.coveringRe ? `RE ${item.coveringRe}` : 'N/I');
    }
    return item?.collabName || (item?.collabRe ? `RE ${item.collabRe}` : 'N/I');
}

function buildFtMonthCalendarHtmlForRe(re, options = {}) {
    const monthRef = normalizeFtDateKey(options.monthKey) || getTodayKey();
    const selectedKey = normalizeFtDateKey(options.selectedDate) || getTodayKey();
    const range = getMonthRangeByDateKey(monthRef);
    const collab = resolveCollaboratorByRe(re);
    const chips = [];
    let cursor = range.start;
    while (cursor <= range.end) {
        const date = new Date(`${cursor}T00:00:00`);
        const dayNumber = Number.isNaN(date.getTime()) ? '--' : String(date.getDate()).padStart(2, '0');
        const weekdayLong = getWeekdayLongPtByDate(cursor);
        const duty = getDutyForecastForDate(collab, cursor);
        const items = getFtItemsForReInRange(re, cursor, cursor);
        const preview = resolveFtPreviewFromItems(items);
        const css = preview.code === 'V' ? 'v' : (preview.code === 'E' ? 'e' : (preview.code === 'D' ? 'd' : 'none'));
        const isToday = cursor === getTodayKey();
        const isActive = cursor === selectedKey;
        const title = `${formatFtDate(cursor)} • ${duty.label}${preview.count ? ` • ${preview.count} FT (${preview.label})` : ' • Sem FT'}`;
        chips.push(`
            <button type="button" data-day="${cursor}" class="ft-month-day ${preview.count ? 'has-ft' : ''} ${isToday ? 'today' : ''} ${isActive ? 'active' : ''}" title="${title}" onclick="openFtMonthDayDetails('${cursor}')">
                <span class="ft-month-weekday">${weekdayLong}</span>
                <span class="ft-month-date">${dayNumber}</span>
                <span class="ft-month-duty ${duty.className}">${duty.code}</span>
                ${preview.count ? `<span class="ft-month-ft ${css}">FT ${preview.count}</span>` : '<span class="ft-month-ft none">sem FT</span>'}
            </button>
        `);
        cursor = getDateKeyWithOffset(cursor, 1);
    }
    return `
        <div class="ft-month-toolbar">
            <div class="ft-month-title">${range.monthLabel}</div>
            <div class="ft-month-subtitle">Planejamento completo do mês</div>
        </div>
        <div class="ft-month-grid">${chips.join('')}</div>
        <div id="ft-week-preview-day-details" class="ft-month-day-details"></div>
    `;
}

function buildFtDayDetailsHtmlForRe(re, dayKey) {
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    const collab = resolveCollaboratorByRe(re);
    const duty = getDutyForecastForDate(collab, key);
    const weekdayLong = getWeekdayLongPtByDate(key);
    const items = getFtItemsForReInRange(re, key, key)
        .slice()
        .sort((a, b) => getFtStatusRank(b?.status) - getFtStatusRank(a?.status));
    const listHtml = items.length
        ? items.map(item => {
            const statusLabel = getFtStatusLabel(item);
            const isCovering = matchesRe(item?.collabRe, re);
            const counterpart = getFtCounterpartLabelForRe(item, re);
            const relation = isCovering ? `Cobrindo ${counterpart}` : `Coberto por ${counterpart}`;
            const reasonLabel = getFtReasonLabel(item?.reason, item?.reasonOther) || item?.reasonRaw || 'N/I';
            const unitLabel = getFtUnitLabel(item);
            const shift = item?.shift || 'N/I';
            const time = item?.ftTime || 'N/I';
            return `
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${item?.status || 'pending'}">${statusLabel}</span>
                        <strong>${relation}</strong>
                    </div>
                    <div class="ft-day-item-meta">Unidade: ${unitLabel} • Turno: ${shift} • Horário: ${time}</div>
                    <div class="ft-day-item-meta">Motivo: ${reasonLabel}</div>
                </div>
            `;
        }).join('')
        : '<p class="empty-state">Sem FT para este colaborador neste dia.</p>';
    return `
        <div class="ft-day-header">
            <div>
                <strong>${weekdayLong} • ${formatFtDate(key)}</strong>
                <div class="ft-day-header-sub">Escala prevista: ${duty.label}</div>
            </div>
            <span class="ft-month-duty ${duty.className}">${duty.code}</span>
        </div>
        <div class="ft-day-list">${listHtml}</div>
    `;
}

function buildFtUnitDayDetailsHtml(unitName, dayKey, groupKey = '') {
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    const items = getFtItemsForUnitInRange(unitName, key, key, groupKey)
        .slice()
        .sort((a, b) => getFtStatusRank(b?.status) - getFtStatusRank(a?.status));
    const weekdayLong = getWeekdayLongPtByDate(key);
    const listHtml = items.length
        ? items.map(item => {
            const coverer = item?.collabName || (item?.collabRe ? `RE ${item.collabRe}` : 'N/I');
            const covered = item?.coveringName
                || (item?.coveringOther && item.coveringOther !== 'Não se aplica' ? item.coveringOther : '')
                || (item?.coveringRe ? `RE ${item.coveringRe}` : '');
            const relation = covered ? `${coverer} cobrindo ${covered}` : `${coverer}`;
            const reason = getFtReasonLabel(item?.reason, item?.reasonOther) || item?.reasonRaw || 'N/I';
            return `
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${item?.status || 'pending'}">${getFtStatusLabel(item)}</span>
                        <strong>${relation}</strong>
                    </div>
                    <div class="ft-day-item-meta">Turno: ${item?.shift || 'N/I'} • Horário: ${item?.ftTime || 'N/I'}</div>
                    <div class="ft-day-item-meta">Motivo: ${reason}</div>
                </div>
            `;
        }).join('')
        : '<p class="empty-state">Sem FT registrada para esta unidade neste dia.</p>';
    return `
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(unitName || 'Unidade')} • ${weekdayLong} • ${formatFtDate(key)}</strong>
                <div class="ft-day-header-sub">Detalhamento completo das coberturas do dia</div>
            </div>
            <span class="ft-month-ft ${items.length ? 'v' : 'none'}">${items.length ? `FT ${items.length}` : 'sem FT'}</span>
        </div>
        <div class="ft-day-list">${listHtml}</div>
    `;
}

function getCollaboratorAddressLabel(collab) {
    const address = getAddressForCollaborator(collab);
    return address || 'Endereço não cadastrado';
}

function getCollaboratorRoleLabel(collab) {
    const role = (collab?.cargo || '').trim();
    return role || 'Cargo não informado';
}

function matchesFtDateFilterForCollaborator(re, range = {}) {
    const normalized = normalizeDateRange(range.from, range.to);
    if (!hasDateRangeFilter(normalized)) return true;
    const items = getFtItemsForReInRange(re, normalized.from, normalized.to);
    return items.length > 0;
}

function refreshFtLabelsForToday() {
    const today = getTodayKey();
    const sourceItems = getFtOperationalItems(ftLaunches);
    const activeCoverers = new Set(
        sourceItems
            .filter(item => isFtActive(item) && item.date === today)
            .map(item => normalizeFtRe(item.collabRe))
            .filter(Boolean)
    );
    let changed = false;
    Object.keys(collaboratorEdits).forEach(key => {
        const edit = collaboratorEdits[key];
        if (!edit || edit.rotulo !== 'FT') return;
        const norm = normalizeFtRe(edit.re || key);
        if (!activeCoverers.has(norm)) {
            delete edit.rotulo;
            delete edit.rotuloInicio;
            delete edit.rotuloFim;
            delete edit.rotuloDetalhe;
            collaboratorEdits[key] = edit;
            changed = true;
        }
    });
    currentData.forEach(c => {
        if (c.rotulo !== 'FT') return;
        const norm = normalizeFtRe(c.re);
        if (!activeCoverers.has(norm)) {
            delete c.rotulo;
            delete c.rotuloInicio;
            delete c.rotuloFim;
            delete c.rotuloDetalhe;
            changed = true;
        }
    });
    if (changed) saveLocalState();
    sourceItems
        .filter(item => isFtActive(item) && item.date === today)
        .forEach(item => applyFtToCollaborator(item));
}

function getFtRelationsForRe(re, options = {}) {
    if (!re) return [];
    const onlyToday = options.onlyToday !== false;
    const today = getTodayKey();
    const items = getFtOperationalItems(ftLaunches).filter(item => {
        if (!isFtActive(item)) return false;
        if (onlyToday) {
            if (!item.date || item.date !== today) return false;
        }
        return matchesRe(item.collabRe, re) || matchesRe(item.coveringRe, re);
    });
    return items.map(item => {
        const isCovering = matchesRe(item.collabRe, re);
        const targetName = item.coveringName ||
            (item.coveringOther && item.coveringOther !== 'Não se aplica' ? item.coveringOther : '') ||
            (item.coveringRe ? `RE ${item.coveringRe}` : '');
        const covererName = item.collabName || (item.collabRe ? `RE ${item.collabRe}` : '');
        return {
            type: isCovering ? 'covering' : 'covered',
            label: (isCovering ? targetName : covererName) || 'N/I',
            unit: item.unitTarget || item.unitCurrent || '',
            item
        };
    });
}

function getFtRelationInfo(re) {
    const rels = getFtRelationsForRe(re);
    return rels.length ? rels[0] : null;
}

function buildFtDetailsHtml(re) {
    const rels = getFtRelationsForRe(re);
    if (!rels.length) return '';
    return rels.map(rel => {
        const item = rel.item || {};
        const unit = item.unitTarget || item.unitCurrent || 'N/I';
        const date = item.date ? formatFtDate(item.date) : 'N/I';
        const shift = item.shift || 'N/I';
        const time = item.ftTime ? ` • ${item.ftTime}` : '';
        const reason = getFtReasonLabel(item.reason, item.reasonOther) || item.reasonRaw || 'N/I';
        const detail = item.reasonDetail ? `<span class="ft-detail-note">${item.reasonDetail}</span>` : '';
        const label = rel.type === 'covering'
            ? `Cobrindo ${rel.label}`
            : `Coberto por ${rel.label}`;
        return `
            <div class="ft-detail ${rel.type}">
                <strong>FT HOJE:</strong> ${label} • Unidade: ${unit} • Data: ${date} • Turno: ${shift}${time} • Motivo: ${reason}
                ${detail}
            </div>
        `;
    }).join('');
}

function renderAiResultCard(item, target, options = {}) {
    const statusInfo = options.statusInfoOverride || getStatusInfo(item);
    const turnoInfo = getTurnoInfo(item.escala);
    const retornoInfo = item.rotulo && item.rotuloFim ? `<span class="return-date">Retorno: ${formatDate(item.rotuloFim)}</span>` : '';
    const ftRelation = getFtRelationInfo(item.re);
    const ftRelationHtml = ftRelation
        ? `<div class="ft-link ${ftRelation.type}"><strong>FT:</strong> ${ftRelation.type === 'covering' ? 'Cobrindo' : 'Coberto por'} ${ftRelation.label}${ftRelation.unit ? ` • ${ftRelation.unit}` : ''}</div>`
        : '';
    const ftDetailHtml = buildFtDetailsHtml(item.re);
    const ftWeekPreview = buildFtWeekPreviewHtmlForRe(item.re);
    const roleLabel = getCollaboratorRoleLabel(item);
    const reJs = JSON.stringify(item.re || '');
    const nameJs = JSON.stringify(item.nome || '');
    const phoneJs = JSON.stringify(item.telefone || '');
    const unitJs = JSON.stringify(item.posto || '');
    const reJsAttr = escapeHtml(reJs);
    const nameJsAttr = escapeHtml(nameJs);
    const phoneJsAttr = escapeHtml(phoneJs);
    const unitJsAttr = escapeHtml(unitJs);
    const detailKey = item.id != null ? item.id : (item.re || '');
    const detailJs = JSON.stringify(detailKey);
    const detailJsAttr = escapeHtml(detailJs);
    const postoLabel = escapeHtml(item.posto || 'N/I');
    const hasAddress = !!getAddressForCollaborator(item);
    const canOpenMap = !!(item.re || item.nome || item.posto);
    const mapBtnClass = canOpenMap
        ? (hasAddress ? '' : 'map-icon-missing')
        : 'disabled-icon';
    const mapTitle = !canOpenMap
        ? 'Colaborador indisponível'
        : (hasAddress ? 'Ver endereço do colaborador' : 'Endereço não cadastrado');
    const canEdit = SiteAuth.mode === 'edit' && item?.id != null;
    const editTargetId = item?.id != null ? item.id : -1;
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
    const isFolga = statusInfo.text === 'FOLGA';
    const isAfastado = ['FÉRIAS', 'ATESTADO', 'AFASTADO'].includes(statusInfo.text);
    const bgClass = isPlantao ? 'bg-plantao' : (isAfastado ? 'bg-afastado' : (isFolga ? 'bg-folga' : 'bg-indefinido'));
    const reason = options.reasonOverride || buildAiReason(item, target);
    const reasonNote = options.reasonNote ? `<div class="ai-reason-note">${options.reasonNote}</div>` : '';
    const actionHtml = options.actionHtml || '';
    const distanceLabel = formatDistanceKm(item._distanceKm);
    const routeDistanceLabel = formatDistanceKm(item._routeDistanceKm);
    const routeDurationLabel = formatDurationMin(item._routeDurationMin);
    const distanceBadge = distanceLabel ? `<span class="distance-badge">≈ ${distanceLabel} km</span>` : '';
    const routeBadge = routeDistanceLabel
        ? `<span class="distance-badge route">Rota ${routeDistanceLabel} km${routeDurationLabel ? ` • ${routeDurationLabel}` : ''}</span>`
        : '';
    const headerBadges = options.headerBadgesHtml || '';

    const homenageado = isHomenageado(item);
    const nomeDisplay = homenageado ? `${item.nome} ✨` : item.nome;
    const avatarHtml = buildCollabAvatarHtml(item.nome);
    return `
        <div class="result-card ${bgClass} ${homenageado ? 'card-homenageado' : ''}" data-collab-re="${item.re}" style="border-left: 5px solid ${statusInfo.color}">
            <div class="card-header">
                <div class="header-left">
                    ${avatarHtml}
                    <div class="card-name-block">
                        <div class="card-name-row">
                            <a class="colaborador-nome colaborador-link ${homenageado ? 'homenageado-nome' : ''}" href="javascript:void(0)" onclick="openCollaboratorPage(${detailJsAttr})">${nomeDisplay}</a>
                            <span class="status-badge" style="background-color: ${statusInfo.color}">${statusInfo.text}</span>
                            ${rotulosHtml}
                            ${retornoInfo}
                        </div>
                        <div class="card-meta-row">
                            <span>RE ${item.re}</span>
                            <span class="meta-sep">·</span>
                            <span class="unit-link" onclick="navigateToUnit(${unitJsAttr})">${postoLabel}</span>
                            <span class="meta-sep">·</span>
                            <span>${item.grupoLabel || 'N/I'}</span>
                            <span class="meta-sep">·</span>
                            <span>${escapeHtml(roleLabel)}</span>
                            <span class="meta-sep">·</span>
                            <span>${item.tipoEscala || ''} ${item.escala || 'N/I'}</span>
                        </div>
                    </div>
                </div>
                <div class="header-right card-actions-bar">
                    ${headerBadges}
                    ${routeBadge}
                    ${distanceBadge}
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${reJsAttr}, ${nameJsAttr})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon ${mapBtnClass}" onclick="openAddressModalForCollaborator(${reJsAttr}, ${nameJsAttr}, ${unitJsAttr})" title="${mapTitle}" ${canOpenMap ? '' : 'disabled'}>${ICONS.mapPin}</button>
                    <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon" onclick="openEditModal(${editTargetId})" ${canEdit ? '' : 'disabled'} title="Editar">${ICONS.edit}</button>
                </div>
            </div>
            ${ftRelationHtml || ftDetailHtml || ftWeekPreview ? `<div class="card-ft-row">${ftRelationHtml}${ftDetailHtml}${ftWeekPreview}</div>` : ''}
            <div class="ai-reason">${reason}${reasonNote}</div>
            ${actionHtml ? `<div class="result-actions">${actionHtml}</div>` : ''}
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
    postoSelect.innerHTML = postosUnicos.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
    // Garante que o valor atual esteja selecionado (mesmo se não estiver na lista por algum motivo)
    if (!postosUnicos.includes(item.posto)) postoSelect.innerHTML += `<option value="${escapeHtml(item.posto)}">${escapeHtml(item.posto)}</option>`;
    postoSelect.value = item.posto;

    // Preencher Select de Escalas (Horários)
    const escalasUnicas = [...new Set(currentData.map(d => d.escala).filter(Boolean))].sort();
    const escalaSelect = document.getElementById('edit-escala');
    escalaSelect.innerHTML = escalasUnicas.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
    if (!escalasUnicas.includes(item.escala)) escalaSelect.innerHTML += `<option value="${escapeHtml(item.escala)}">${escapeHtml(item.escala)}</option>`;
    escalaSelect.value = item.escala;

    document.getElementById('edit-modal').classList.remove('hidden');
    toggleRotuloDesc(); // Atualiza visibilidade do campo extra
}

function closeEditModal() {
    document.getElementById('edit-modal').classList.add('hidden');
}

const COLLAB_DETAIL_FIELDS = [
    { key: 'colaborador', label: 'Colaborador' },
    { key: 'matricula', label: 'Matrícula' },
    { key: 're_padrao', label: 'RE Padrão' },
    { key: 're_folha', label: 'RE Folha' },
    { key: 'posto', label: 'Posto' },
    { key: 'cargo', label: 'Cargo' },
    { key: 'escala', label: 'Escala' },
    { key: 'turno', label: 'Turno' },
    { key: 'telefone', label: 'Telefone' },
    { key: 'cpf', label: 'CPF' },
    { key: 'data_admissao', label: 'Data admissão' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'turma', label: 'Turma' },
    { key: 'ferias', label: 'Férias' },
    { key: 'aso', label: 'ASO' },
    { key: 'reciclagem bombeiro', label: 'Reciclagem bombeiro' },
    { key: 'nr_10', label: 'NR-10' },
    { key: 'nr_20', label: 'NR-20' },
    { key: 'nr_33', label: 'NR-33' },
    { key: 'nr_35', label: 'NR-35' },
    { key: 'dea', label: 'DEA' },
    { key: 'heliponto', label: 'Heliponto' },
    { key: 'uniforme', label: 'Uniforme' },
    { key: 'suspensao', label: 'Suspensão' },
    { key: 'advertencia', label: 'Advertência' },
    { key: 'recolhimento', label: 'Recolhimento' },
    { key: 'observacoes', label: 'Observações' },
    { key: 'ctps_numero', label: 'CTPS número' },
    { key: 'ctps_serie', label: 'CTPS série' },
    { key: 'pis', label: 'PIS' },
    { key: 'rg', label: 'RG' },
    { key: 'atestados', label: 'Atestados' },
    { key: 'reciclagem_vigilante', label: 'Reciclagem vigilante' },
    { key: 'reciclagem_cnv_vigilante', label: 'Reciclagem CNV vigilante' },
    { key: 'telefone_emergencia', label: 'Telefone emergência' },
    { key: 'data_nascimento', label: 'Data nascimento' },
    { key: 'idade', label: 'Idade' },
    { key: 'unidade_de_negocio', label: 'Unidade de negócio' },
    { key: 'endereco_colaborador', label: 'Endereço' },
    { key: 'email_login', label: 'E-mail login' }
];

const UNIT_DETAIL_FIELDS = [
    { key: 'unidade_de_negocio', label: 'Unidade de negócio' },
    { key: 'empresa', label: 'Empresa' },
    { key: 'empresa_bombeiros', label: 'Empresa bombeiros' },
    { key: 'cliente', label: 'Cliente' },
    { key: 'posto', label: 'Posto' },
    { key: 'endereco', label: 'Endereço' },
    { key: 'numero', label: 'Número' },
    { key: 'bairro', label: 'Bairro' },
    { key: 'cep', label: 'CEP' },
    { key: 'cidade', label: 'Cidade' },
    { key: 'estado', label: 'Estado' },
    { key: 'seigla_estado', label: 'Sigla estado' },
    { key: 'data_implantacao', label: 'Data implantação' },
    { key: 'pgr', label: 'PGR' },
    { key: 'pcms', label: 'PCMS' },
    { key: 'refeicao_no_local', label: 'Refeição no local' },
    { key: 'vale_transporte', label: 'Vale transporte' },
    { key: 'heliponto', label: 'Heliponto' },
    { key: 'email_supervisor_da_unidade', label: 'E-mail supervisor' },
    { key: 'email_sesmt', label: 'E-mail SESMT' },
    { key: 'obrasoft', label: 'Obrasoft' },
    { key: 'modalidade_aso', label: 'Modalidade ASO' },
    { key: 'modalidade_reciclagem', label: 'Modalidade reciclagem' },
    { key: 'rotulo', label: 'Rótulo' },
    { key: 'rotulo_detalhe', label: 'Detalhe rótulo' },
    { key: 'rotulo_responsavel', label: 'Responsável rótulo' }
];

function buildDetailsGrid(item, fields) {
    if (!item) return '<div class="admin-empty">Nenhum dado encontrado.</div>';
    return fields.map(field => {
        const raw = item?.[field.key];
        const value = raw == null || raw === '' ? '—' : String(raw);
        return `
            <div class="detail-row">
                <span class="detail-label">${escapeHtml(field.label)}</span>
                <div class="detail-value">${escapeHtml(value)}</div>
            </div>
        `;
    }).join('');
}

function openCollabDetailsModal(id) {
    const item = currentData.find(d => d.id === id)
        || (allCollaboratorsCache.items || []).find(d => d.id === id || d.re === id);
    const body = document.getElementById('collab-details-body');
    if (body) body.innerHTML = buildDetailsGrid(item, COLLAB_DETAIL_FIELDS);
    document.getElementById('collab-details-modal')?.classList.remove('hidden');
}

function closeCollabDetailsModal() {
    document.getElementById('collab-details-modal')?.classList.add('hidden');
}

// ==========================================================================
//  PÁGINA COMPLETA DO COLABORADOR (CRM) — Fases B, C, D
// ==========================================================================

const COLLAB_DETAIL_SECTIONS = [
    {
        title: 'Identificacao', icon: '',
        fields: [
            { key: 'colaborador', label: 'Nome Completo', type: 'text' },
            { key: 'matricula', label: 'Matricula', type: 'text' },
            { key: 're_padrao', label: 'RE Padrao', type: 'text' },
            { key: 're_folha', label: 'RE Folha', type: 'text' },
            { key: 'cpf', label: 'CPF', type: 'text' },
            { key: 'rg', label: 'RG', type: 'text' },
            { key: 'pis', label: 'PIS', type: 'text' },
            { key: 'ctps_numero', label: 'CTPS Numero', type: 'text' },
            { key: 'ctps_serie', label: 'CTPS Serie', type: 'text' },
            { key: 'data_nascimento', label: 'Data de Nascimento', type: 'date' },
            { key: 'idade', label: 'Idade', type: 'text' }
        ]
    },
    {
        title: 'Contato', icon: '',
        fields: [
            { key: 'telefone', label: 'Telefone', type: 'text' },
            { key: 'telefone_emergencia', label: 'Telefone de Emergencia', type: 'text' },
            { key: 'email_login', label: 'E-mail', type: 'text' },
            { key: 'endereco_colaborador', label: 'Endereco', type: 'text' }
        ]
    },
    {
        title: 'Vinculo Trabalhista', icon: '',
        fields: [
            { key: 'empresa', label: 'Empresa', type: 'select-dynamic', source: 'empresas' },
            { key: 'cliente', label: 'Cliente', type: 'select-dynamic', source: 'clientes' },
            { key: 'unidade_de_negocio', label: 'Unidade de Negocio', type: 'select-dynamic', source: 'unidades_negocio' },
            { key: 'data_admissao', label: 'Data de Admissao', type: 'date' },
            { key: 'turma', label: 'Turma', type: 'select', options: [{ v: '1', l: 'Impar' }, { v: '2', l: 'Par' }] }
        ]
    },
    {
        title: 'Posto & Escala', icon: '',
        fields: [
            { key: 'posto', label: 'Posto', type: 'select-dynamic', source: 'postos' },
            { key: 'cargo', label: 'Cargo', type: 'select-dynamic', source: 'cargos' },
            { key: 'escala', label: 'Escala (Horario)', type: 'select-dynamic', source: 'escalas' },
            { key: 'turno', label: 'Turno', type: 'select-dynamic', source: 'turnos' }
        ]
    },
    {
        title: 'Afastamentos', icon: '',
        fields: [
            { key: 'rotulo', label: 'Rotulo', type: 'rotulo' },
            { key: 'rotulo_inicio', label: 'Inicio', type: 'date', itemKey: 'rotuloInicio' },
            { key: 'rotulo_fim', label: 'Fim', type: 'date', itemKey: 'rotuloFim' },
            { key: 'rotulo_detalhe', label: 'Detalhe', type: 'text', itemKey: 'rotuloDetalhe' },
            { key: 'ferias', label: 'Ferias', type: 'text' },
            { key: 'atestados', label: 'Atestados', type: 'text' }
        ]
    },
    {
        title: 'Conformidade & Certificacoes', icon: '',
        fields: [
            { key: 'aso', label: 'ASO', type: 'text' },
            { key: 'reciclagem bombeiro', label: 'Reciclagem Bombeiro', type: 'text' },
            { key: 'reciclagem_vigilante', label: 'Reciclagem Vigilante', type: 'text' },
            { key: 'reciclagem_cnv_vigilante', label: 'Reciclagem CNV Vigilante', type: 'text' },
            { key: 'nr_10', label: 'NR-10', type: 'text' },
            { key: 'nr_20', label: 'NR-20', type: 'text' },
            { key: 'nr_33', label: 'NR-33', type: 'text' },
            { key: 'nr_35', label: 'NR-35', type: 'text' },
            { key: 'dea', label: 'DEA', type: 'text' },
            { key: 'heliponto', label: 'Heliponto', type: 'text' }
        ]
    },
    {
        title: 'Equipamento & Disciplinar', icon: '',
        fields: [
            { key: 'uniforme', label: 'Uniforme', type: 'text' },
            { key: 'suspensao', label: 'Suspensao', type: 'text' },
            { key: 'advertencia', label: 'Advertencia', type: 'text' },
            { key: 'recolhimento', label: 'Recolhimento', type: 'text' }
        ]
    },
    {
        title: 'Observacoes', icon: '',
        fields: [
            { key: 'observacoes', label: 'Observacoes', type: 'textarea' }
        ]
    }
];

function findCollaboratorById(id) {
    return currentData.find(d => d.id === id)
        || currentData.find(d => d.re === id || d.re === String(id))
        || (allCollaboratorsCache.items || []).find(d => d.id === id || d.re === id || d.re === String(id));
}

function openCollaboratorPage(id) {
    const item = findCollaboratorById(id);
    if (!item) {
        showToast('Colaborador não encontrado.', 'error');
        return;
    }
    detailPageState = { id: item.id, re: item.re, item };
    detailPageInnerTab = 'info';
    switchTab('collab-detail');
    renderCollabDetailPage(item);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function renderCollabDetailPage(item) {
    const container = document.getElementById('tab-content-collab-detail');
    if (!container || !item) return;

    const statusInfo = getStatusInfo(item);
    const avatarHtml = buildCollabAvatarHtml(item.nome);
    const favoriteActive = isCollaboratorFavorite(item.re);
    const phoneJs = JSON.stringify(item.telefone || '');
    const nameJs = JSON.stringify(item.nome || '');
    const reJs = JSON.stringify(item.re || '');
    const unitJs = JSON.stringify(item.posto || '');

    let rotulosHtml = '';
    if (item.rotulo) {
        const rotulos = item.rotulo.split(',');
        const map = { 'FÉRIAS': 'Férias', 'ATESTADO': 'Atestado', 'AFASTADO': 'Afastado', 'FT': 'FT', 'TROCA': 'Troca' };
        rotulosHtml = rotulos.map(r => {
            let display = r;
            if (r === 'OUTRO' && item.rotuloDetalhe) display = item.rotuloDetalhe;
            return `<span class="label-badge">${map[r] || display}</span>`;
        }).join('');
    }

    container.innerHTML = `
        <div class="collab-page">
            <div class="collab-breadcrumb">
                <a href="javascript:void(0)" onclick="switchTab('busca')">← Voltar à Busca</a>
                <span class="bc-sep">›</span>
                <span class="bc-current">${escapeHtml(item.nome || 'Colaborador')}</span>
            </div>

            <div class="collab-page-header">
                <div class="cph-left">
                    ${avatarHtml.replace('collab-avatar', 'collab-avatar collab-avatar-lg')}
                    <div class="cph-info">
                        <h2 class="cph-name">${escapeHtml(item.nome || 'N/I')}</h2>
                        <div class="cph-subtitle">
                            <span>RE ${escapeHtml(item.re || 'N/I')}</span>
                            <span class="meta-sep">·</span>
                            <span>${escapeHtml(item.posto || 'N/I')}</span>
                            <span class="meta-sep">·</span>
                            <span>${escapeHtml(item.grupoLabel || item.grupo || 'N/I')}</span>
                            <span class="meta-sep">·</span>
                            <span>${escapeHtml(getCollaboratorRoleLabel(item))}</span>
                        </div>
                    </div>
                </div>
                <div class="cph-right">
                    <span class="status-badge status-badge-lg" style="background-color:${statusInfo.color}" title="Status calculado pela coluna TURMA">${statusInfo.text}</span>
                    ${rotulosHtml}
                    <button class="edit-btn-icon favorite-btn ${favoriteActive ? 'active' : ''}" onclick="toggleCollaboratorFavorite('${escapeHtml(item.re || '')}'); renderCollabDetailPage(findCollaboratorById(${JSON.stringify(item.id != null ? item.id : item.re)}))" title="${favoriteActive ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">${favoriteActive ? ICONS.starFilled : ICONS.star}</button>
                    <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${escapeHtml(nameJs)}, ${escapeHtml(phoneJs)})" title="${item.telefone ? 'Contato WhatsApp' : 'Sem telefone'}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${escapeHtml(reJs)}, ${escapeHtml(nameJs)})" title="Performance">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon" onclick="openAddressModalForCollaborator(${escapeHtml(reJs)}, ${escapeHtml(nameJs)}, ${escapeHtml(unitJs)})" title="Ver no mapa">${ICONS.mapPin}</button>
                </div>
            </div>

            <div class="collab-inner-tabs">
                <button class="collab-itab ${detailPageInnerTab === 'info' ? 'active' : ''}" onclick="setCollabInnerTab('info')">Informações</button>
                <button class="collab-itab ${detailPageInnerTab === 'history' ? 'active' : ''}" onclick="setCollabInnerTab('history')">Histórico</button>
                <button class="collab-itab ${detailPageInnerTab === 'compliance' ? 'active' : ''}" onclick="setCollabInnerTab('compliance')">Conformidade</button>
            </div>

            <div id="collab-inner-content">
                ${renderCollabInnerTabContent(item)}
            </div>
        </div>
    `;
}

function setCollabInnerTab(tab) {
    detailPageInnerTab = tab;
    if (detailPageState?.item) {
        const item = findCollaboratorById(detailPageState.id || detailPageState.re) || detailPageState.item;
        detailPageState.item = item;
        const innerContainer = document.getElementById('collab-inner-content');
        if (innerContainer) innerContainer.innerHTML = renderCollabInnerTabContent(item);
        document.querySelectorAll('.collab-itab').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`.collab-itab[onclick="setCollabInnerTab('${tab}')"]`)?.classList.add('active');
    }
}

function renderCollabInnerTabContent(item) {
    if (detailPageInnerTab === 'history') return renderCollabDetailHistory(item);
    if (detailPageInnerTab === 'compliance') return renderCollabDetailCompliance(item);
    return renderCollabDetailSections(item);
}

// --- Fase B: Seções de informações ---

function getFieldItemValue(item, field) {
    const key = field.itemKey || field.key;
    const raw = item?.[key];
    return raw == null || raw === '' ? '' : String(raw);
}

function getDynamicOptions(source) {
    const extractUnique = (key) => [...new Set(currentData.map(d => d[key]).filter(Boolean))].sort();
    if (source === 'postos') return extractUnique('posto');
    if (source === 'escalas') return extractUnique('escala');
    if (source === 'cargos') return extractUnique('cargo');
    if (source === 'turnos') return extractUnique('turno');
    if (source === 'empresas') return extractUnique('empresa');
    if (source === 'clientes') return extractUnique('cliente');
    if (source === 'unidades_negocio') return extractUnique('unidade_de_negocio');
    return [];
}

function renderCollabDetailSections(item) {
    const canEdit = SiteAuth.mode === 'edit' || SiteAuth.logged;
    return COLLAB_DETAIL_SECTIONS.map((section, si) => {
        const fieldsHtml = section.fields.map((field, fi) => {
            const value = getFieldItemValue(item, field);
            const displayValue = value || '—';
            const fieldId = `cpf-${si}-${fi}`;
            const editBtn = canEdit ? `<button class="field-edit-btn" onclick="toggleFieldEdit('${fieldId}', ${si}, ${fi})" title="Editar">${ICONS.edit}</button>` : '';
            return `
                <div class="cpf-field" id="${fieldId}">
                    <div class="cpf-field-display">
                        <span class="cpf-label">${escapeHtml(field.label)}</span>
                        <span class="cpf-value">${escapeHtml(displayValue)}</span>
                        ${editBtn}
                    </div>
                    <div class="cpf-field-editing hidden">
                    </div>
                </div>
            `;
        }).join('');

        const editSectionBtn = canEdit ? `<button class="btn btn-secondary btn-compact section-edit-btn" onclick="editSection(${si})">Editar seção</button>` : '';

        return `
            <div class="collab-section-card">
                <div class="csc-header">
                    <h3><span class="csc-icon">${section.icon}</span> ${escapeHtml(section.title)}</h3>
                    ${editSectionBtn}
                </div>
                <div class="csc-fields">${fieldsHtml}</div>
            </div>
        `;
    }).join('');
}

// --- Fase C: Edição inline ---

function toggleFieldEdit(fieldId, sectionIdx, fieldIdx) {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    const displayEl = fieldEl.querySelector('.cpf-field-display');
    const editingEl = fieldEl.querySelector('.cpf-field-editing');
    if (!displayEl || !editingEl) return;

    const isEditing = !editingEl.classList.contains('hidden');
    if (isEditing) {
        editingEl.classList.add('hidden');
        displayEl.classList.remove('hidden');
        return;
    }

    const section = COLLAB_DETAIL_SECTIONS[sectionIdx];
    const field = section.fields[fieldIdx];
    const item = detailPageState?.item;
    if (!item) return;

    const value = getFieldItemValue(item, field);
    editingEl.innerHTML = buildFieldEditor(field, value, fieldId, sectionIdx, fieldIdx);
    displayEl.classList.add('hidden');
    editingEl.classList.remove('hidden');
    const input = editingEl.querySelector('input, select, textarea');
    if (input) input.focus();
}

function buildFieldEditor(field, value, fieldId, sectionIdx, fieldIdx) {
    const escapedValue = escapeHtml(value);
    let inputHtml = '';

    if (field.type === 'text') {
        inputHtml = `<input type="text" class="cpf-input" value="${escapedValue}">`;
    } else if (field.type === 'date') {
        inputHtml = `<input type="date" class="cpf-input" value="${escapedValue}">`;
    } else if (field.type === 'textarea') {
        inputHtml = `<textarea class="cpf-input cpf-textarea">${escapedValue}</textarea>`;
    } else if (field.type === 'select') {
        const optionsHtml = (field.options || []).map(o =>
            `<option value="${escapeHtml(o.v)}" ${String(o.v) === String(value) ? 'selected' : ''}>${escapeHtml(o.l)}</option>`
        ).join('');
        inputHtml = `<select class="cpf-input">${optionsHtml}</select>`;
    } else if (field.type === 'select-dynamic') {
        const opts = getDynamicOptions(field.source);
        let optionsHtml = opts.map(o =>
            `<option value="${escapeHtml(o)}" ${o === value ? 'selected' : ''}>${escapeHtml(o)}</option>`
        ).join('');
        if (value && !opts.includes(value)) {
            optionsHtml += `<option value="${escapedValue}" selected>${escapedValue}</option>`;
        }
        inputHtml = `<select class="cpf-input">${optionsHtml}</select>`;
    } else if (field.type === 'rotulo') {
        const rotuloOptions = ['FÉRIAS', 'ATESTADO', 'AFASTADO', 'FT', 'TROCA', 'OUTRO'];
        const currentValues = (value || '').split(',').map(v => v.trim()).filter(Boolean);
        inputHtml = `<div class="cpf-checkbox-group">${rotuloOptions.map(r =>
            `<label class="cpf-cb-label"><input type="checkbox" value="${r}" ${currentValues.includes(r) ? 'checked' : ''}> ${r}</label>`
        ).join('')}</div>`;
    }

    return `
        <span class="cpf-label">${escapeHtml(field.label)}</span>
        ${inputHtml}
        <div class="cpf-field-actions">
            <button class="btn btn-compact cpf-save-btn" onclick="saveFieldEdit('${fieldId}', ${sectionIdx}, ${fieldIdx})">✓ Salvar</button>
            <button class="btn btn-secondary btn-compact" onclick="toggleFieldEdit('${fieldId}', ${sectionIdx}, ${fieldIdx})">✗ Cancelar</button>
        </div>
    `;
}

async function saveFieldEdit(fieldId, sectionIdx, fieldIdx) {
    const fieldEl = document.getElementById(fieldId);
    if (!fieldEl) return;
    const section = COLLAB_DETAIL_SECTIONS[sectionIdx];
    const field = section.fields[fieldIdx];
    const item = detailPageState?.item;
    if (!item) return;

    const editingEl = fieldEl.querySelector('.cpf-field-editing');
    let newValue = '';

    if (field.type === 'rotulo') {
        const checkboxes = editingEl.querySelectorAll('input[type="checkbox"]:checked');
        newValue = Array.from(checkboxes).map(cb => cb.value).join(',');
    } else {
        const input = editingEl.querySelector('input, select, textarea');
        newValue = input ? input.value : '';
    }

    const itemKey = field.itemKey || field.key;
    const oldValue = item[itemKey];
    const oldValueStr = oldValue == null || oldValue === '' ? '' : String(oldValue);

    if (newValue === oldValueStr) {
        toggleFieldEdit(fieldId, sectionIdx, fieldIdx);
        return;
    }

    // Atualiza local
    const before = JSON.parse(JSON.stringify(item));
    item[itemKey] = newValue;

    // Mapeamentos especiais para campos que têm nomes diferentes no item vs DB
    if (field.key === 'colaborador') item.nome = newValue.toUpperCase();
    if (field.key === 're_padrao') item.re_padrao = newValue;

    const saved = await updateCollaboratorInSupabase(item);
    if (!saved) {
        Object.assign(item, before);
        showToast('Falha ao salvar no Supabase.', 'error');
        return;
    }

    // Registrar no histórico
    const after = JSON.parse(JSON.stringify(item));
    const responsavel = SiteAuth.user || 'Admin';
    changeHistory.unshift({
        data: new Date().toLocaleString('pt-BR'),
        responsavel: responsavel,
        acao: 'Edição de Campo',
        detalhe: `Alterou "${field.label}" de "${oldValueStr || '—'}" para "${newValue || '—'}" em ${item.nome} (${item.re})`,
        target: { re: item.re, nome: item.nome },
        changes: [{ field: field.label, from: oldValueStr, to: newValue }],
        before,
        after
    });
    try { saveLocalState(); } catch {}

    showToast(`"${field.label}" atualizado com sucesso!`, 'success');

    // Re-renderizar a página mantendo o item atualizado
    detailPageState.item = item;
    renderCollabDetailPage(item);
}

function editSection(sectionIdx) {
    const section = COLLAB_DETAIL_SECTIONS[sectionIdx];
    if (!section) return;
    section.fields.forEach((field, fi) => {
        const fieldId = `cpf-${sectionIdx}-${fi}`;
        const fieldEl = document.getElementById(fieldId);
        if (!fieldEl) return;
        const editingEl = fieldEl.querySelector('.cpf-field-editing');
        if (editingEl && editingEl.classList.contains('hidden')) {
            toggleFieldEdit(fieldId, sectionIdx, fi);
        }
    });
}

// --- Fase D: Timeline de histórico ---

function renderCollabDetailHistory(item) {
    const re = item.re || '';
    const filtered = (changeHistory || []).filter(entry => {
        if (!entry.target) return false;
        return entry.target.re === re;
    });

    if (filtered.length === 0) {
        return `
            <div class="collab-section-card">
                <div class="csc-header"><h3><span class="csc-icon"></span> Historico de Alteracoes</h3></div>
                <div class="history-empty">
                    <div class="history-empty-icon"></div>
                    <p>Nenhum histórico registrado para este colaborador.</p>
                    <p class="text-muted">Alterações feitas nos campos aparecerão aqui automaticamente.</p>
                </div>
            </div>
        `;
    }

    const entriesHtml = filtered.map(entry => {
        const changesHtml = (entry.changes || []).map(c => {
            return `
                <div class="timeline-diff">
                    <span class="diff-field">${escapeHtml(c.field || '')}</span>
                    <span class="diff-from">${escapeHtml(c.from || '—')}</span>
                    <span class="diff-arrow">→</span>
                    <span class="diff-to">${escapeHtml(c.to || '—')}</span>
                </div>
            `;
        }).join('');

        const actionClass = (entry.acao || '').toLowerCase().includes('exclu') ? 'delete' :
                           (entry.acao || '').toLowerCase().includes('criaç') ? 'create' : 'edit';

        return `
            <div class="timeline-entry timeline-${actionClass}">
                <div class="timeline-marker"></div>
                <div class="timeline-content">
                    <div class="timeline-header-row">
                        <span class="timeline-date">${escapeHtml(entry.data || '')}</span>
                        <span class="timeline-user">${escapeHtml(entry.responsavel || 'Sistema')}</span>
                    </div>
                    <div class="timeline-action">${escapeHtml(entry.acao || '')}</div>
                    <div class="timeline-detail">${escapeHtml(entry.detalhe || '')}</div>
                    ${changesHtml ? `<div class="timeline-changes">${changesHtml}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    return `
        <div class="collab-section-card">
            <div class="csc-header"><h3><span class="csc-icon"></span> Historico de Alteracoes</h3></div>
            <div class="history-timeline">${entriesHtml}</div>
        </div>
    `;
}

// --- Aba Conformidade ---

function renderCollabDetailCompliance(item) {
    const complianceFields = [
        { key: 'aso', label: 'ASO', icon: '' },
        { key: 'reciclagem bombeiro', label: 'Reciclagem Bombeiro', icon: '' },
        { key: 'reciclagem_vigilante', label: 'Reciclagem Vigilante', icon: '' },
        { key: 'reciclagem_cnv_vigilante', label: 'Reciclagem CNV Vigilante', icon: '' },
        { key: 'nr_10', label: 'NR-10', icon: '' },
        { key: 'nr_20', label: 'NR-20', icon: '' },
        { key: 'nr_33', label: 'NR-33', icon: '' },
        { key: 'nr_35', label: 'NR-35', icon: '' },
        { key: 'dea', label: 'DEA', icon: '' },
        { key: 'heliponto', label: 'Heliponto', icon: '' }
    ];

    const cardsHtml = complianceFields.map(cf => {
        const raw = item?.[cf.key];
        const value = raw == null || raw === '' ? '—' : String(raw);
        const status = getComplianceStatus(value);
        return `
            <div class="compliance-card compliance-${status}">
                <div class="compliance-icon">${cf.icon}</div>
                <div class="compliance-label">${escapeHtml(cf.label)}</div>
                <div class="compliance-value">${escapeHtml(value)}</div>
                <div class="compliance-status-dot"></div>
            </div>
        `;
    }).join('');

    return `
        <div class="collab-section-card">
            <div class="csc-header"><h3><span class="csc-icon"></span> Conformidade e Certificacoes</h3></div>
            <div class="compliance-grid">${cardsHtml}</div>
        </div>
    `;
}

function getComplianceStatus(value) {
    if (!value || value === '—') return 'unknown';
    const lower = value.toLowerCase();
    if (lower.includes('vencid') || lower.includes('irregular') || lower.includes('inapto')) return 'expired';
    if (lower.includes('próximo') || lower.includes('proximo') || lower.includes('atenção') || lower.includes('atencao')) return 'warning';
    // Tentar parsear como data
    const dateMatch = value.match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    if (dateMatch) {
        const d = new Date(dateMatch[3], dateMatch[2] - 1, dateMatch[1]);
        const now = new Date();
        const diffDays = (d - now) / (1000 * 60 * 60 * 24);
        if (diffDays < 0) return 'expired';
        if (diffDays < 30) return 'warning';
        return 'ok';
    }
    return 'ok';
}

async function openUnitDetailsModal(unitName) {
    const name = String(unitName || '').trim();
    let unit = (supaUnitsCache.items || []).find(u => normalizeUnitKey(u.posto) === normalizeUnitKey(name));
    if (!unit) {
        const units = await fetchSupabaseUnits(true);
        unit = (units || []).find(u => normalizeUnitKey(u.posto) === normalizeUnitKey(name));
    }
    const body = document.getElementById('unit-details-body');
    if (body) body.innerHTML = buildDetailsGrid(unit, UNIT_DETAIL_FIELDS);
    document.getElementById('unit-details-modal')?.classList.remove('hidden');
}

function closeUnitDetailsModal() {
    document.getElementById('unit-details-modal')?.classList.add('hidden');
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

function getCollaboratorDbSelector(item) {
    if (!item) return null;
    if (item.matricula) return { column: 'matricula', value: item.matricula };
    if (item.re_padrao) return { column: COLLAB_RE_PADRAO_COLUMN, value: item.re_padrao };
    if (item.re_padrap) return { column: 're_padrap', value: item.re_padrap };
    if (item.re_novo) return { column: 're_novo', value: item.re_novo };
    if (item.re_folha) return { column: 're_novo', value: item.re_folha };
    if (item.re) return { column: COLLAB_RE_PADRAO_COLUMN, value: item.re };
    return null;
}

function buildCollaboratorDbUpdate(item) {
    const payload = {
        colaborador: item.nome || item.colaborador || '',
        telefone: item.telefone || '',
        posto: item.posto || '',
        escala: item.escala || '',
        turma: item.turma || null,
        rotulo: item.rotulo || '',
        rotulo_inicio: item.rotuloInicio || item.rotulo_inicio || '',
        rotulo_fim: item.rotuloFim || item.rotulo_fim || '',
        rotulo_detalhe: item.rotuloDetalhe || item.rotulo_detalhe || ''
    };
    // Campos expandidos para edição completa
    Object.assign(payload, {
        matricula: item.matricula || '',
        re_novo: item.re_novo || item.re_folha || '',
        cargo: item.cargo || '',
        turno: item.turno || '',
        cpf: item.cpf || '',
        rg: item.rg || '',
        pis: item.pis || '',
        ctps_numero: item.ctps_numero || '',
        ctps_serie: item.ctps_serie || '',
        data_nascimento: item.data_nascimento || '',
        idade: item.idade || '',
        telefone_de_emergencia: item.telefone_de_emergencia || item.telefone_emergencia || '',
        endereco: item.endereco || item.endereco_colaborador || '',
        empresa: item.empresa || '',
        cliente: item.cliente || '',
        unidade_de_negocio: item.unidade_de_negocio || '',
        admissao: item.admissao || item.data_admissao || '',
        ferias: item.ferias || '',
        aso: item.aso || '',
        reciclagem_bombeiro: item.reciclagem_bombeiro || item["reciclagem bombeiro"] || '',
        reciclagem_vigilante: item.reciclagem_vigilante || '',
        numeracao_cnv: item.numeracao_cnv || '',
        cnv_vigilante: item.cnv_vigilante || item.reciclagem_cnv_vigilante || '',
        nr10: item.nr10 || item.nr_10 || '',
        nr20: item.nr20 || item.nr_20 || '',
        nr33: item.nr33 || item.nr_33 || '',
        nr35: item.nr35 || item.nr_35 || '',
        dea: item.dea || '',
        heliponto: item.heliponto || '',
        uniforme: item.uniforme || '',
        suspensao: item.suspensao || '',
        advertencia: item.advertencia || '',
        recolhimento: item.recolhimento || '',
        observacoes: item.observacoes || '',
        pasta_google_drive: item.pasta_google_drive || ''
    });
    payload[COLLAB_RE_PADRAO_COLUMN] = item.re_padrao || item.re || '';
    return payload;
}

function invalidateCollaboratorsCache() {
    allCollaboratorsCache = { items: null, updatedAt: 0 };
}

async function updateCollaboratorInSupabase(item) {
    if (!isSupabaseReady()) return false;
    const selector = getCollaboratorDbSelector(item);
    if (!selector) return false;
    const payload = buildCollaboratorDbUpdate(item);
    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .update(payload)
            .eq(selector.column, selector.value);
        if (error) AppErrorHandler.capture(error, { scope: 'update-collaborator' }, { silent: true });
        else invalidateCollaboratorsCache();
        return !error;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'update-collaborator' }, { silent: true });
        return false;
    }
}

async function insertCollaboratorInSupabase(item) {
    if (!isSupabaseReady()) return false;
    const payload = {
        sheet_sync_key: item.sheet_sync_key || '',
        matricula: item.matricula || item.re || '',
        re_novo: item.re_novo || item.re_folha || '',
        colaborador: item.nome || item.colaborador || '',
        posto: item.posto || '',
        cargo: item.cargo || '',
        escala: item.escala || '',
        turno: item.turno || '',
        telefone: item.telefone || '',
        turma: item.turma || null,
        unidade_de_negocio: item.unidade_de_negocio || '',
        endereco: item.endereco || item.endereco_colaborador || ''
    };
    payload[COLLAB_RE_PADRAO_COLUMN] = item.re_padrao || item.re || '';
    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .insert(payload);
        if (error) AppErrorHandler.capture(error, { scope: 'insert-collaborator' }, { silent: true });
        else invalidateCollaboratorsCache();
        return !error;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'insert-collaborator' }, { silent: true });
        return false;
    }
}

async function deleteCollaboratorInSupabase(item) {
    if (!isSupabaseReady()) return false;
    const selector = getCollaboratorDbSelector(item);
    if (!selector) return false;
    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .delete()
            .eq(selector.column, selector.value);
        if (error) AppErrorHandler.capture(error, { scope: 'delete-collaborator' }, { silent: true });
        else invalidateCollaboratorsCache();
        return !error;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'delete-collaborator' }, { silent: true });
        return false;
    }
}

async function updateCollaboratorsBulk(items, updates) {
    if (!isSupabaseReady()) return false;
    const list = items || [];
    if (!list.length) return true;
    const matriculas = list.map(i => i.matricula).filter(Boolean);
    if (matriculas.length === list.length) {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .update(updates)
            .in('matricula', matriculas);
        return !error;
    }
    const results = await Promise.allSettled(list.map(async item => {
        const selector = getCollaboratorDbSelector(item);
        if (!selector) return false;
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .update(updates)
            .eq(selector.column, selector.value);
        if (error) AppErrorHandler.capture(error, { scope: 'bulk-update-collaborator' }, { silent: true });
        return !error;
    }));
    const ok = results.every(r => r.status === 'fulfilled' && r.value === true);
    if (ok) invalidateCollaboratorsCache();
    return ok;
}

async function salvarEdicao() {
    const id = parseInt(document.getElementById('edit-id').value);
    const item = currentData.find(d => d.id === id);
    const responsavel = SiteAuth.user || 'Admin';
    
    if (item) {
        const before = JSON.parse(JSON.stringify(item));

        item.nome = document.getElementById('edit-nome').value.toUpperCase();
        item.re = document.getElementById('edit-re').value;
        item.re_padrao = item.re;
        item.telefone = document.getElementById('edit-telefone').value.replace(/\D/g, ''); // Salva apenas números
        item.posto = document.getElementById('edit-posto').value.toUpperCase();
        item.escala = document.getElementById('edit-escala').value;
        item.turma = parseInt(document.getElementById('edit-turma').value);

        item.rotulo = getCheckboxValues('edit-rotulo-container');
        item.rotuloInicio = document.getElementById('edit-inicio').value;
        item.rotuloFim = document.getElementById('edit-fim').value;
        item.rotuloDetalhe = document.getElementById('edit-rotulo-desc').value;

        const saved = await updateCollaboratorInSupabase(item);
        if (!saved) {
            Object.assign(item, before);
            showToast("Falha ao salvar no Supabase.", "error");
            return;
        }

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
// EDICAO DE UNIDADE
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
                <span class="member-name">${escapeHtml(m.nome)}</span>
                <span class="member-re">${escapeHtml(m.re)}</span>
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
            escalasUnicas.map(e => `<option value="${escapeHtml(e)}">${escapeHtml(e)}</option>`).join('');
    }

    const unidadeSelect = document.getElementById('new-colab-unidade');
    if (unidadeSelect) {
        unidadeSelect.innerHTML = `<option value="">Unidade atual</option>` +
            postosUnicos.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('');
        unidadeSelect.value = postoName || '';
    }
}

function toggleUnitRotuloDesc() {
    const rotulos = getCheckboxValues('edit-unit-rotulo-container');
    const divDesc = document.getElementById('div-unit-rotulo-desc');
    if (rotulos.includes('OUTRO')) divDesc.classList.remove('hidden');
    else divDesc.classList.add('hidden');
}

async function updateUnitInSupabase(oldName, newName, meta = {}) {
    if (!isSupabaseReady()) return false;
    const payload = {
        posto: newName
    };
    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.unidades)
            .update(payload)
            .eq('posto', oldName);
        if (error) AppErrorHandler.capture(error, { scope: 'update-unit' }, { silent: true });
        else supaUnitsCache = { items: null, updatedAt: 0 };
        return !error;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'update-unit' }, { silent: true });
        return false;
    }
}

async function updateCollaboratorsUnitInSupabase(oldName, newName) {
    if (!isSupabaseReady()) return false;
    try {
        const { error } = await supabaseClient
            .from(SUPABASE_TABLES.colaboradores)
            .update({ posto: newName })
            .eq('posto', oldName);
        if (error) AppErrorHandler.capture(error, { scope: 'update-collaborators-unit' }, { silent: true });
        else invalidateCollaboratorsCache();
        return !error;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'update-collaborators-unit' }, { silent: true });
        return false;
    }
}

async function salvarEdicaoUnidade() {
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

        // Supabase FIRST — don't change local state until confirmation
        const ok = await updateCollaboratorsUnitInSupabase(oldName, newName);
        const okUnit = await updateUnitInSupabase(oldName, newName, { rotulo, detalhe, responsavel });
        if (!ok || !okUnit) {
            showToast("Falha ao salvar unidade no Supabase. Nenhuma alteração foi aplicada.", "error");
            return;
        }

        // Only update local state after Supabase confirmation
        if (unitMetadata[oldName]) {
            unitMetadata[newName] = unitMetadata[oldName];
            delete unitMetadata[oldName];
        }

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
        const okMeta = await updateUnitInSupabase(targetName, targetName, { rotulo, detalhe, responsavel });
        if (!okMeta) {
            showToast("Falha ao salvar metadados no Supabase.", "error");
        }
    }

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

async function executarAcaoEmMassa() {
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

    const itemsToUpdate = currentData.filter(item => ids.includes(item.id));
    currentData.forEach(item => {
        if (ids.includes(item.id)) {
            if (action === 'move') item.posto = value;
            if (action === 'scale') item.escala = value;
        }
    });

    const updatePayload = action === 'move' ? { posto: value } : { escala: value };
    const ok = await updateCollaboratorsBulk(itemsToUpdate, updatePayload);
    if (!ok) {
        beforeItems.forEach(snapshot => {
            const target = currentData.find(item => item.id === snapshot.id);
            if (!target) return;
            target.posto = snapshot.posto;
            target.escala = snapshot.escala;
        });
        renderizarUnidades();
        showToast("Falha ao salvar no Supabase.", "error");
        return;
    }

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

async function removerColaborador() {
    const responsavel = SiteAuth.user || 'Admin';

    const id = parseInt(document.getElementById('edit-id').value);
    if(confirm("Tem certeza que deseja remover este colaborador permanentemente?")) {
        const item = currentData.find(d => d.id === id);
        const ok = await deleteCollaboratorInSupabase(item);
        if (!ok) {
            showToast("Falha ao remover no Supabase.", "error");
            return;
        }
        setAppState('currentData', currentData.filter(d => d.id !== id), { silent: true });
        closeEditModal();
        if (currentTab === 'busca') {
            realizarBusca();
        } else {
            renderizarUnidades();
        }
        showToast("Colaborador removido.", "success");

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

async function adicionarColaboradorNaUnidade() {
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
    const fallbackGroup = getAllowedGroups()[0] || 'todos';
    const unidadeNegocio = existingMember?.unidade_de_negocio || '';
    const grupo = existingMember ? existingMember.grupo : (currentGroup !== 'todos' ? currentGroup : fallbackGroup);
    const tipoEscala = extrairTipoEscala(horario);

    const newItem = {
        id: newId,
        nome: nome,
        re: re,
        re_padrao: re,
        matricula: re,
        dbId: re,
        posto: posto,
        escala: horario,
        tipoEscala: tipoEscala,
        turma: Number.isFinite(turma) ? turma : 1,
        rotulo: '',
        rotuloInicio: '',
        rotuloFim: '',
        rotuloDetalhe: '',
        grupo: grupo,
        unidade_de_negocio: unidadeNegocio,
        telefone: telefone
    };
    const ok = await insertCollaboratorInSupabase(newItem);
    if (!ok) {
        showToast("Falha ao inserir no Supabase. Informe a matrícula completa se necessário.", "error");
        return;
    }
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
                <span class="member-name">${escapeHtml(m.nome)}</span>
                <span class="member-re">${escapeHtml(m.re)}</span>
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
    toggleUtilityDrawer();
}


// ==========================================================================
// UTILITARIOS GERAIS
// ==========================================================================

function showToast(message, type = 'info') {
    if (type && typeof type === 'object') {
        return showToast(message, type.type || 'info', type);
    }
    const options = arguments.length > 2 && arguments[2] && typeof arguments[2] === 'object'
        ? arguments[2]
        : {};
    const container = document.getElementById('toast-container');
    if (!container) return;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    const normalizedType = ({ warn: 'warning', warning: 'warning', loading: 'loading' }[type] || type || 'info');
    const toastId = String(options.id || '').trim();
    if (toastId) {
        const existing = container.querySelector(`.toast[data-toast-id="${toastId}"]`);
        if (existing) existing.remove();
    }
    const toast = document.createElement('div');
    toast.className = `toast ${normalizedType}`;
    if (toastId) toast.dataset.toastId = toastId;
    toast.setAttribute('role', 'alert');

    const iconMap = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        loading: '↻',
        info: 'i'
    };
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = iconMap[normalizedType] || 'i';
    const body = document.createElement('div');
    body.className = 'toast-body';
    const text = document.createElement('span');
    text.textContent = String(message || '');
    body.appendChild(text);

    if (options.actionLabel && typeof options.onAction === 'function') {
        const actions = document.createElement('div');
        actions.className = 'toast-actions';
        const actionBtn = document.createElement('button');
        actionBtn.type = 'button';
        actionBtn.className = 'btn-mini btn-secondary';
        actionBtn.textContent = String(options.actionLabel || 'Desfazer');
        actionBtn.addEventListener('click', () => {
            try { options.onAction(); } catch {}
            toast.remove();
        });
        actions.appendChild(actionBtn);
        body.appendChild(actions);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn-mini btn-secondary';
    closeBtn.textContent = 'Fechar';
    closeBtn.addEventListener('click', () => toast.remove());
    toast.append(icon, body, closeBtn);
    
    container.appendChild(toast);

    const autoClose = options.autoClose !== false && normalizedType !== 'loading';
    const timeoutMs = Number.isFinite(options.duration) ? Math.max(1200, options.duration) : 4000;
    if (autoClose) {
        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease forwards';
            setTimeout(() => toast.remove(), 300);
        }, timeoutMs);
    }
    return toastId || null;
}

function hideToastById(id) {
    const key = String(id || '').trim();
    if (!key) return;
    const toast = document.querySelector(`.toast[data-toast-id="${key}"]`);
    if (toast) toast.remove();
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
// HISTORICO
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
        setAppState('currentData', currentData.filter(d => d.id !== item.id), { silent: true });
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
// SUPERVISAO
// ==========================================================================

function buildDefaultSupervisaoMenu() {
    const base = JSON.parse(JSON.stringify(SUPERVISAO_DEFAULT_MENU || {}));
    if (!base.meta) base.meta = {};
    base.meta.version = base.meta.version || 1;
    base.meta.updatedAt = new Date().toISOString();
    base.meta.updatedBy = base.meta.updatedBy || 'Sistema';
    base.items = Array.isArray(base.items) ? base.items : [];
    base.items = base.items.map(item => normalizeSupervisaoItem(item));
    return base;
}

function createSupervisaoId() {
    return `sup_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function normalizeSupervisaoItem(item) {
    const next = { ...(item || {}) };
    if (!next.id) next.id = createSupervisaoId();
    if (!SUPERVISAO_CATEGORIES[next.category]) next.category = 'colab';
    next.type = next.type === 'link' ? 'link' : 'message';
    if (!Array.isArray(next.links)) next.links = [];
    next.links = next.links.filter(l => l && l.url);
    if (!Array.isArray(next.images)) next.images = [];
    next.images = next.images.filter(Boolean);
    return next;
}

function cloneSupervisaoItem(item) {
    if (!item) return null;
    try {
        return JSON.parse(JSON.stringify(item));
    } catch {
        return { ...item };
    }
}

function ensureSupervisaoMenu() {
    if (!supervisaoMenu || !Array.isArray(supervisaoMenu.items)) {
        supervisaoMenu = buildDefaultSupervisaoMenu();
        saveSupervisaoMenu(true);
        return;
    }
    if (!supervisaoMenu.meta) supervisaoMenu.meta = {};
    supervisaoMenu.meta.version = supervisaoMenu.meta.version || 1;
    if (!supervisaoMenu.meta.updatedAt) supervisaoMenu.meta.updatedAt = new Date().toISOString();
    if (!supervisaoMenu.meta.updatedBy) supervisaoMenu.meta.updatedBy = 'Sistema';
    supervisaoMenu.items = supervisaoMenu.items.map(item => normalizeSupervisaoItem(item));
}

function loadSupervisaoMenu() {
    try {
        const stored = localStorage.getItem('supervisaoMenu');
        supervisaoMenu = stored ? JSON.parse(stored) : null;
    } catch {
        supervisaoMenu = null;
    }
    ensureSupervisaoMenu();
}

function saveSupervisaoMenu(silent = false) {
    if (!supervisaoMenu) return;
    localStorage.setItem('supervisaoMenu', JSON.stringify(supervisaoMenu));
    scheduleLocalSync('supervisao-menu', { silent, notify: !silent });
}

function loadSupervisaoHistory() {
    try {
        const stored = localStorage.getItem('supervisaoHistory');
        supervisaoHistory = stored ? JSON.parse(stored) || [] : [];
    } catch {
        supervisaoHistory = [];
    }
}

function saveSupervisaoHistory(silent = false) {
    localStorage.setItem('supervisaoHistory', JSON.stringify(supervisaoHistory));
    scheduleLocalSync('supervisao-history', { silent, notify: !silent });
}

function loadSupervisaoFavorites() {
    try {
        const stored = localStorage.getItem('supervisaoFavorites');
        const list = stored ? JSON.parse(stored) || [] : [];
        supervisaoFavorites = new Set(list);
    } catch {
        supervisaoFavorites = new Set();
    }
}

function saveSupervisaoFavorites() {
    localStorage.setItem('supervisaoFavorites', JSON.stringify(Array.from(supervisaoFavorites)));
}

function loadSupervisaoUsage() {
    try {
        const stored = localStorage.getItem('supervisaoUsage');
        supervisaoUsage = stored ? JSON.parse(stored) || {} : {};
    } catch {
        supervisaoUsage = {};
    }
}

function saveSupervisaoUsage() {
    localStorage.setItem('supervisaoUsage', JSON.stringify(supervisaoUsage));
}

function loadSupervisaoChannelPrefs() {
    try {
        const stored = localStorage.getItem('supervisaoChannels');
        supervisaoChannelPrefs = stored ? JSON.parse(stored) || {} : {};
    } catch {
        supervisaoChannelPrefs = {};
    }
}

function saveSupervisaoChannelPrefs() {
    localStorage.setItem('supervisaoChannels', JSON.stringify(supervisaoChannelPrefs));
}

function getSupervisaoItems() {
    return supervisaoMenu?.items || [];
}

function getSupervisaoItemById(id) {
    return getSupervisaoItems().find(item => item.id === id) || null;
}

function touchSupervisaoMeta() {
    if (!supervisaoMenu) return;
    if (!supervisaoMenu.meta) supervisaoMenu.meta = {};
    supervisaoMenu.meta.updatedAt = new Date().toISOString();
    supervisaoMenu.meta.updatedBy = SiteAuth.user || 'Admin';
}

function getSupervisaoLinks(item) {
    const links = [];
    if (item?.link) {
        links.push({ label: 'Link principal', url: item.link });
    }
    (item?.links || []).forEach(l => {
        if (!l || !l.url) return;
        links.push({ label: l.label || 'Link extra', url: l.url });
    });
    return links;
}

function getSupervisaoMessage(item, channel) {
    if (!item) return '';
    const channels = item.channels || {};
    if (channel === 'email') {
        return channels.email || item.message || '';
    }
    return channels.whatsapp || item.message || '';
}

function getSupervisaoPreferredChannel(item) {
    if (!item) return 'whatsapp';
    const saved = supervisaoChannelPrefs[item.id];
    if (saved) return saved;
    const channels = item.channels || {};
    if (channels.whatsapp) return 'whatsapp';
    if (channels.email) return 'email';
    return 'whatsapp';
}

function setSupervisaoChannelPref(id, channel) {
    if (!id || !channel) return;
    supervisaoChannelPrefs[id] = channel;
    saveSupervisaoChannelPrefs();
    renderSupervisao();
}

function toggleSupervisaoFavorite(id) {
    if (!id) return;
    if (supervisaoFavorites.has(id)) {
        supervisaoFavorites.delete(id);
    } else {
        supervisaoFavorites.add(id);
    }
    saveSupervisaoFavorites();
    renderSupervisao();
}

function trackSupervisaoUsage(id, action) {
    if (!id || !action) return;
    const entry = supervisaoUsage[id] || { open: 0, copy: 0, send: 0, lastUsedAt: null };
    if (entry[action] !== undefined) {
        entry[action] += 1;
    }
    entry.lastUsedAt = new Date().toISOString();
    supervisaoUsage[id] = entry;
    saveSupervisaoUsage();
}

function getSupervisaoUsageTotal(id) {
    const entry = supervisaoUsage[id];
    if (!entry) return 0;
    return (entry.open || 0) + (entry.copy || 0) + (entry.send || 0);
}

function getSupervisaoUsageInfo(id) {
    const entry = supervisaoUsage[id];
    if (!entry) return { open: 0, copy: 0, send: 0, total: 0, lastUsedAt: null };
    return {
        open: entry.open || 0,
        copy: entry.copy || 0,
        send: entry.send || 0,
        total: getSupervisaoUsageTotal(id),
        lastUsedAt: entry.lastUsedAt || null
    };
}

function syncSupervisaoOpenStatesFromDom() {
    document.querySelectorAll('.supervisao-message').forEach(detail => {
        const card = detail.closest('[data-supervisao-id]');
        const id = card?.getAttribute('data-supervisao-id');
        if (!id) return;
        if (detail.open) supervisaoOpenMessages.add(id);
        else supervisaoOpenMessages.delete(id);
    });
}

function formatSupervisaoDateTime(value) {
    try {
        return new Date(value).toLocaleString();
    } catch {
        return value || '';
    }
}

function getSupervisaoExpiryInfo(item) {
    if (!item?.expiresAt) return null;
    const date = new Date(item.expiresAt);
    if (Number.isNaN(date.getTime())) {
        return { label: 'Validade inválida', status: 'invalid' };
    }
    const now = new Date();
    const diffDays = Math.ceil((date.getTime() - now.getTime()) / 86400000);
    if (diffDays < 0) {
        return { label: `Expirado em ${formatDateOnly(date)}`, status: 'expired' };
    }
    if (diffDays === 0) {
        return { label: 'Expira hoje', status: 'due' };
    }
    if (diffDays <= 7) {
        return { label: `Vence em ${diffDays} dia(s)`, status: 'due' };
    }
    return { label: `Vence em ${formatDateOnly(date)}`, status: 'ok' };
}

function isSupervisaoItemExpired(item) {
    const info = getSupervisaoExpiryInfo(item);
    return info && info.status === 'expired';
}

function isValidHttpUrl(value) {
    if (!value) return false;
    try {
        const url = new URL(value);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

function getSupervisaoInvalidLinks(item) {
    const invalid = [];
    if (item?.link && !isValidHttpUrl(item.link)) invalid.push(item.link);
    (item?.links || []).forEach(l => {
        if (l?.url && !isValidHttpUrl(l.url)) invalid.push(l.url);
    });
    return invalid;
}

function matchesSupervisaoSearch(item, term) {
    if (!term) return true;
    const haystack = [
        item.title,
        item.description,
        item.message,
        item.link,
        ...(item.links || []).map(l => `${l.label || ''} ${l.url || ''}`),
        item.channels?.whatsapp,
        item.channels?.email
    ].filter(Boolean).join(' ');
    return normalizeText(haystack).includes(normalizeText(term));
}

function applySupervisaoFilters(items, term) {
    let list = items.filter(item => matchesSupervisaoSearch(item, term));

    if (!isAdminRole()) {
        list = list.filter(item => !isSupervisaoItemExpired(item));
    }

    if (supervisaoFilter === 'favorites') {
        list = list.filter(item => supervisaoFavorites.has(item.id));
    } else if (supervisaoFilter === 'used') {
        list = list.filter(item => getSupervisaoUsageTotal(item.id) > 0)
            .sort((a, b) => getSupervisaoUsageTotal(b.id) - getSupervisaoUsageTotal(a.id));
    } else if (supervisaoFilter === 'expired') {
        list = list.filter(item => isSupervisaoItemExpired(item));
    } else if (SUPERVISAO_CATEGORIES[supervisaoFilter]) {
        list = list.filter(item => item.category === supervisaoFilter);
    }
    return list;
}

function updateSupervisaoFiltersUI() {
    document.querySelectorAll('[data-supervisao-filter]').forEach(btn => {
        const key = btn.getAttribute('data-supervisao-filter');
        const active = key === supervisaoFilter;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function renderSupervisaoMeta() {
    const metaEl = document.getElementById('supervisao-updated');
    if (!metaEl || !supervisaoMenu?.meta) return;
    const updatedAt = supervisaoMenu.meta.updatedAt
        ? formatSupervisaoDateTime(supervisaoMenu.meta.updatedAt)
        : '—';
    const updatedBy = supervisaoMenu.meta.updatedBy || 'Sistema';
    metaEl.textContent = `Última revisão: ${updatedAt} • Responsável: ${updatedBy}`;
}

function renderSupervisaoTopUsed() {
    const container = document.getElementById('supervisao-top-used');
    if (!container) return;
    let list = getSupervisaoItems()
        .filter(item => getSupervisaoUsageTotal(item.id) > 0);
    if (!isAdminRole()) {
        list = list.filter(item => !isSupervisaoItemExpired(item));
    }
    if (SUPERVISAO_CATEGORIES[supervisaoFilter]) {
        list = list.filter(item => item.category === supervisaoFilter);
    }
    list = list
        .sort((a, b) => getSupervisaoUsageTotal(b.id) - getSupervisaoUsageTotal(a.id))
        .slice(0, 4);
    if (!list.length) {
        container.classList.add('hidden');
        container.innerHTML = '';
        return;
    }
    container.classList.remove('hidden');
    container.innerHTML = `
        <div class="supervisao-top-header">Mais usados</div>
        <div class="supervisao-top-list">
            ${list.map(item => `
                <button class="supervisao-top-chip" onclick="focusSupervisaoItem('${item.id}')">${escapeHtml(item.title)}</button>
            `).join('')}
        </div>
    `;
}

function renderSupervisaoCard(item) {
    const links = getSupervisaoLinks(item);
    const hasLinks = links.length > 0;
    const extraLinks = links.length > 1 ? links.slice(1) : [];
    const channel = getSupervisaoPreferredChannel(item);
    const message = getSupervisaoMessage(item, channel);
    const hasMessage = !!message;
    const channelOptions = item.channels?.whatsapp && item.channels?.email;
    const badge = SUPERVISAO_CATEGORIES[item.category]?.badge || 'Item';
    const typeLabel = item.type === 'link' ? 'Link' : 'Mensagem';
    const favoriteActive = supervisaoFavorites.has(item.id);
    const expiry = getSupervisaoExpiryInfo(item);
    const invalidLinks = getSupervisaoInvalidLinks(item);
    const sendLabel = channel === 'email' ? 'Abrir e-mail' : 'Enviar';
    const copyLabel = channelOptions
        ? `Copiar ${channel === 'email' ? 'E-mail' : 'WhatsApp'}`
        : 'Copiar mensagem';

    const usage = getSupervisaoUsageInfo(item.id);
    const usageLine = isAdminRole()
        ? `<div class="supervisao-usage">Usos: ${usage.total} • Abrir ${usage.open} • Copiar ${usage.copy} • Enviar ${usage.send}${usage.lastUsedAt ? ` • Último: ${formatSupervisaoDateTime(usage.lastUsedAt)}` : ''}</div>`
        : '';

    const messageOpen = supervisaoOpenMessages.has(item.id);
    const messageBlock = hasMessage ? `
        <details class="supervisao-message" ${messageOpen ? 'open' : ''}>
            <summary>Mensagem</summary>
            ${channelOptions ? `
                <div class="supervisao-channel">
                    <button class="filter-chip ${channel === 'whatsapp' ? 'active' : ''}" onclick="setSupervisaoChannelPref('${item.id}', 'whatsapp')">WhatsApp</button>
                    <button class="filter-chip ${channel === 'email' ? 'active' : ''}" onclick="setSupervisaoChannelPref('${item.id}', 'email')">E-mail</button>
                </div>
            ` : ''}
            <div class="supervisao-message-body">${escapeHtml(message)}</div>
            ${(item.images || []).length ? `
                <div class="supervisao-images">
                    ${(item.images || []).map(src => `
                        <img src="${escapeHtml(src)}" alt="Imagem de apoio" loading="lazy">
                    `).join('')}
                </div>
            ` : ''}
        </details>
    ` : '';

    const linksBlock = extraLinks.length ? `
        <div class="supervisao-link-list">
            ${extraLinks.map((l, idx) => `
                <button class="btn btn-secondary btn-small" onclick="openSupervisaoLink('${item.id}', ${idx + 1})">Abrir ${escapeHtml(l.label || 'link')}</button>
            `).join('')}
        </div>
    ` : '';

    return `
        <div class="supervisao-card ${expiry?.status === 'expired' ? 'is-expired' : ''}" data-supervisao-id="${item.id}">
            <div class="supervisao-card-header">
                <div>
                    <div class="supervisao-card-title">${escapeHtml(item.title || 'Sem título')}</div>
                    ${item.description ? `<div class="supervisao-card-desc">${escapeHtml(item.description)}</div>` : ''}
                </div>
                <button class="supervisao-fav ${favoriteActive ? 'active' : ''}" onclick="toggleSupervisaoFavorite('${item.id}')" title="Favoritar" aria-label="Favoritar">
                    ${favoriteActive ? ICONS.starFilled : ICONS.star}
                </button>
            </div>
            <div class="supervisao-badges">
                <span class="supervisao-badge ${item.category}">${escapeHtml(badge)}</span>
                <span class="supervisao-badge type">${typeLabel}</span>
                ${expiry ? `<span class="supervisao-badge ${expiry.status}">${escapeHtml(expiry.label)}</span>` : ''}
                ${invalidLinks.length ? `<span class="supervisao-badge warning">Link inválido</span>` : ''}
            </div>
            ${linksBlock}
            ${messageBlock}
            <div class="supervisao-actions">
                ${hasLinks ? `<button class="btn btn-secondary btn-small" onclick="openSupervisaoLink('${item.id}', 0)">Abrir link</button>` : ''}
                ${hasLinks && !hasMessage ? `<button class="btn btn-secondary btn-small" onclick="copySupervisaoLink('${item.id}', 0)">Copiar link</button>` : ''}
                ${hasMessage ? `<button class="btn btn-secondary btn-small" onclick="copySupervisaoMessage('${item.id}')">${copyLabel}</button>` : ''}
                ${hasMessage ? `<button class="btn btn-small" onclick="sendSupervisaoMessage('${item.id}')">${sendLabel}</button>` : ''}
            </div>
            ${usageLine}
        </div>
    `;
}

function renderSupervisao() {
    const container = document.getElementById('supervisao-sections');
    if (!container) return;
    syncSupervisaoOpenStatesFromDom();
    ensureSupervisaoMenu();
    if (!isAdminRole() && supervisaoFilter === 'expired') {
        supervisaoFilter = 'internal';
    }
    updateSupervisaoFiltersUI();
    renderSupervisaoMeta();
    renderSupervisaoTopUsed();

    const input = document.getElementById('supervisao-search');
    if (input && supervisaoSearchTerm && !input.value) {
        input.value = supervisaoSearchTerm;
    }
    const term = input ? input.value.trim() : supervisaoSearchTerm;
    supervisaoSearchTerm = term;
    const filtered = applySupervisaoFilters(getSupervisaoItems(), term);
    const sections = Object.keys(SUPERVISAO_CATEGORIES).map(key => {
        const items = filtered.filter(item => item.category === key);
        if (!items.length) return '';
        return `
            <div class="unit-section supervisao-section" data-category="${key}">
                <h3 class="unit-title">
                    <span>${escapeHtml(SUPERVISAO_CATEGORIES[key].label)} <span class="count-badge">${items.length}</span></span>
                </h3>
                <div class="supervisao-items">
                    ${items.map(renderSupervisaoCard).join('')}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = sections || `<div class="empty-state">Nenhum item encontrado.</div>`;
}

function bindSupervisaoEvents() {
    const shell = document.querySelector('.supervisao-shell');
    if (!shell || shell.dataset.bound === '1') return;
    shell.dataset.bound = '1';

    const input = document.getElementById('supervisao-search');
    if (input) {
        input.addEventListener('input', () => {
            const term = input.value.trim();
            supervisaoSearchTerm = term;
            renderSupervisao();
        });
    }

    document.querySelectorAll('[data-supervisao-filter]').forEach(btn => {
        btn.addEventListener('click', () => {
            supervisaoFilter = btn.getAttribute('data-supervisao-filter') || 'all';
            renderSupervisao();
        });
    });

    shell.addEventListener('toggle', (event) => {
        const detail = event.target?.closest?.('.supervisao-message');
        if (!detail) return;
        const card = detail.closest('[data-supervisao-id]');
        const id = card?.getAttribute('data-supervisao-id');
        if (!id) return;
        if (detail.open) supervisaoOpenMessages.add(id);
        else supervisaoOpenMessages.delete(id);
    });
}

function openSupervisaoLink(id, index = 0) {
    const item = getSupervisaoItemById(id);
    if (!item) return;
    const links = getSupervisaoLinks(item);
    const target = links[index] || links[0];
    if (!target?.url) {
        showToast("Link indisponível.", "error");
        return;
    }
    if (!isValidHttpUrl(target.url)) {
        showToast("Link inválido.", "error");
        return;
    }
    trackSupervisaoUsage(id, 'open');
    window.open(target.url, '_blank');
}

function copySupervisaoLink(id, index = 0) {
    const item = getSupervisaoItemById(id);
    if (!item) return;
    const links = getSupervisaoLinks(item);
    const target = links[index] || links[0];
    if (!target?.url) {
        showToast("Link indisponível.", "error");
        return;
    }
    if (!isValidHttpUrl(target.url)) {
        showToast("Link inválido.", "error");
        return;
    }
    copyTextToClipboard(target.url);
    trackSupervisaoUsage(id, 'copy');
}

function copySupervisaoMessage(id) {
    const item = getSupervisaoItemById(id);
    if (!item) return;
    const channel = getSupervisaoPreferredChannel(item);
    const message = getSupervisaoMessage(item, channel);
    if (!message) {
        showToast("Mensagem indisponível.", "error");
        return;
    }
    copyTextToClipboard(message);
    trackSupervisaoUsage(id, 'copy');
}

function sendSupervisaoMessage(id) {
    const item = getSupervisaoItemById(id);
    if (!item) return;
    const channel = getSupervisaoPreferredChannel(item);
    const message = getSupervisaoMessage(item, channel);
    if (!message) {
        showToast("Mensagem indisponível.", "error");
        return;
    }
    if (channel === 'email') {
        const to = item.emailTo || '';
        const cc = item.emailCc || '';
        const subject = item.emailSubject || '';
        const params = new URLSearchParams();
        if (subject) params.set('subject', subject);
        if (cc) params.set('cc', cc);
        if (message) params.set('body', message);
        const qs = params.toString();
        const url = `mailto:${to}${qs ? `?${qs}` : ''}`;
        trackSupervisaoUsage(id, 'send');
        window.location.href = url;
        return;
    }
    trackSupervisaoUsage(id, 'send');
    openWhatsApp('', message);
}

function focusSupervisaoItem(id) {
    const card = document.querySelector(`[data-supervisao-id="${id}"]`);
    if (!card) return;
    card.classList.add('highlight-unit');
    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => card.classList.remove('highlight-unit'), 1500);
}

function canEditSupervisao() {
    return SiteAuth.logged && SiteAuth.mode === 'edit' && isAdminRole();
}

function recordSupervisaoHistory(action, beforeItem, afterItem) {
    const entry = {
        id: createSupervisaoId(),
        data: new Date().toLocaleString(),
        responsavel: SiteAuth.user || 'Admin',
        acao: action,
        before: cloneSupervisaoItem(beforeItem),
        after: cloneSupervisaoItem(afterItem)
    };
    supervisaoHistory.unshift(entry);
    supervisaoHistory = supervisaoHistory.slice(0, 200);
    saveSupervisaoHistory();
}

function renderSupervisaoAdminList() {
    const list = document.getElementById('supervisao-admin-list');
    if (!list) return;
    const items = getSupervisaoItems();
    const canEdit = canEditSupervisao();
    if (!items.length) {
        list.innerHTML = '<div class="admin-empty">Nenhum item cadastrado.</div>';
        return;
    }

    list.innerHTML = Object.keys(SUPERVISAO_CATEGORIES).map(key => {
        const sectionItems = items.filter(item => item.category === key);
        if (!sectionItems.length) return '';
        return `
            <div class="supervisao-admin-section">
                <div class="supervisao-admin-title">${escapeHtml(SUPERVISAO_CATEGORIES[key].label)}</div>
                ${sectionItems.map(item => {
                    const invalidLinks = getSupervisaoInvalidLinks(item);
                    const expiry = getSupervisaoExpiryInfo(item);
                    return `
                        <div class="supervisao-admin-row">
                            <div>
                                <strong>${escapeHtml(item.title || 'Sem título')}</strong>
                                <div class="supervisao-admin-meta">${item.type === 'link' ? 'Link' : 'Mensagem'}${expiry ? ` • ${escapeHtml(expiry.label)}` : ''}${invalidLinks.length ? ' • Link inválido' : ''}</div>
                            </div>
                            <div class="supervisao-admin-actions">
                                ${canEdit ? `
                                    <button class="btn-mini btn-secondary" onclick="openSupervisaoEditor('${item.id}')">Editar</button>
                                    <button class="btn-mini btn-danger" onclick="removeSupervisaoItem('${item.id}')">Excluir</button>
                                ` : '<span class="supervisao-admin-lock">Somente admin</span>'}
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }).join('');
}

function renderSupervisaoHistory() {
    const list = document.getElementById('supervisao-history-list');
    if (!list) return;
    if (!supervisaoHistory.length) {
        list.innerHTML = '<div class="admin-empty">Nenhuma alteração registrada.</div>';
        return;
    }
    const canEdit = canEditSupervisao();
    list.innerHTML = supervisaoHistory.slice(0, 20).map((entry, idx) => {
        const label = entry.after?.title || entry.before?.title || 'Item';
        const hasRestore = !!entry.before && canEdit;
        return `
            <div class="supervisao-history-item">
                <div>
                    <strong>${escapeHtml(label)}</strong>
                    <div class="supervisao-history-meta">${escapeHtml(entry.data || '')} • ${escapeHtml(entry.responsavel || '')} • ${escapeHtml(entry.acao || '')}</div>
                </div>
                ${hasRestore ? `<button class="btn-mini btn-secondary" onclick="restoreSupervisaoHistory(${idx})">Restaurar</button>` : ''}
            </div>
        `;
    }).join('');
}

function openSupervisaoEditor(id) {
    const item = getSupervisaoItemById(id);
    if (!item) return;
    supervisaoEditingId = item.id;
    document.getElementById('supervisao-editor-id').value = item.id;
    document.getElementById('supervisao-editor-category').value = item.category || 'colab';
    document.getElementById('supervisao-editor-type').value = item.type || 'message';
    document.getElementById('supervisao-editor-title').value = item.title || '';
    document.getElementById('supervisao-editor-description').value = item.description || '';
    document.getElementById('supervisao-editor-link').value = item.link || '';
    document.getElementById('supervisao-editor-links').value = (item.links || [])
        .map(l => `${l.label ? `${l.label} | ` : ''}${l.url || ''}`.trim())
        .join('\n');
    document.getElementById('supervisao-editor-message-whatsapp').value = item.channels?.whatsapp || item.message || '';
    document.getElementById('supervisao-editor-message-email').value = item.channels?.email || '';
    document.getElementById('supervisao-editor-email-to').value = item.emailTo || '';
    document.getElementById('supervisao-editor-email-cc').value = item.emailCc || '';
    document.getElementById('supervisao-editor-email-subject').value = item.emailSubject || '';
    document.getElementById('supervisao-editor-images').value = (item.images || []).join('\n');
    document.getElementById('supervisao-editor-expires').value = item.expiresAt || '';
    updateSupervisaoEditorVisibility();
}

function resetSupervisaoEditor() {
    supervisaoEditingId = null;
    document.getElementById('supervisao-editor-id').value = '';
    document.getElementById('supervisao-editor-category').value = 'colab';
    document.getElementById('supervisao-editor-type').value = 'message';
    document.getElementById('supervisao-editor-title').value = '';
    document.getElementById('supervisao-editor-description').value = '';
    document.getElementById('supervisao-editor-link').value = '';
    document.getElementById('supervisao-editor-links').value = '';
    document.getElementById('supervisao-editor-message-whatsapp').value = '';
    document.getElementById('supervisao-editor-message-email').value = '';
    document.getElementById('supervisao-editor-email-to').value = '';
    document.getElementById('supervisao-editor-email-cc').value = '';
    document.getElementById('supervisao-editor-email-subject').value = '';
    document.getElementById('supervisao-editor-images').value = '';
    document.getElementById('supervisao-editor-expires').value = '';
    updateSupervisaoEditorVisibility();
}

function updateSupervisaoEditorVisibility() {
    const type = document.getElementById('supervisao-editor-type')?.value || 'message';
    const msgGroup = document.getElementById('supervisao-editor-message-group');
    if (msgGroup) msgGroup.classList.toggle('hidden', type !== 'message');
}

function parseSupervisaoLinks(text) {
    if (!text) return [];
    return text.split('\n').map(line => line.trim()).filter(Boolean).map(line => {
        const parts = line.split('|').map(p => p.trim()).filter(Boolean);
        if (parts.length === 1) {
            return { label: 'Link extra', url: parts[0] };
        }
        return { label: parts[0], url: parts.slice(1).join(' | ') };
    }).filter(item => item.url);
}

function parseSupervisaoImages(text) {
    if (!text) return [];
    return text.split('\n').map(line => line.trim()).filter(Boolean);
}

function validateSupervisaoItem(data) {
    const errors = [];
    if (!data.title) errors.push('Informe o título.');
    if (data.link && !isValidHttpUrl(data.link)) errors.push('Link principal inválido.');
    (data.links || []).forEach(l => {
        if (l.url && !isValidHttpUrl(l.url)) errors.push(`Link inválido: ${l.url}`);
    });
    if (data.expiresAt) {
        const dt = new Date(data.expiresAt);
        if (Number.isNaN(dt.getTime())) errors.push('Data de validade inválida.');
    }
    if (data.type === 'link' && !data.link && !(data.links || []).length) {
        errors.push('Informe ao menos um link.');
    }
    if (data.type === 'message' && !data.messageWhatsapp && !data.messageEmail) {
        errors.push('Informe ao menos uma mensagem.');
    }
    return errors;
}

function collectSupervisaoEditorData() {
    const data = {
        id: document.getElementById('supervisao-editor-id')?.value.trim() || '',
        category: document.getElementById('supervisao-editor-category')?.value || 'colab',
        type: document.getElementById('supervisao-editor-type')?.value || 'message',
        title: document.getElementById('supervisao-editor-title')?.value.trim() || '',
        description: document.getElementById('supervisao-editor-description')?.value.trim() || '',
        link: document.getElementById('supervisao-editor-link')?.value.trim() || '',
        links: parseSupervisaoLinks(document.getElementById('supervisao-editor-links')?.value || ''),
        messageWhatsapp: document.getElementById('supervisao-editor-message-whatsapp')?.value.trim() || '',
        messageEmail: document.getElementById('supervisao-editor-message-email')?.value.trim() || '',
        emailTo: document.getElementById('supervisao-editor-email-to')?.value.trim() || '',
        emailCc: document.getElementById('supervisao-editor-email-cc')?.value.trim() || '',
        emailSubject: document.getElementById('supervisao-editor-email-subject')?.value.trim() || '',
        images: parseSupervisaoImages(document.getElementById('supervisao-editor-images')?.value || ''),
        expiresAt: document.getElementById('supervisao-editor-expires')?.value || ''
    };
    return data;
}

function saveSupervisaoItem() {
    if (!canEditSupervisao()) {
        showToast("Apenas admins em modo edição podem salvar.", "error");
        return;
    }
    ensureSupervisaoMenu();
    const data = collectSupervisaoEditorData();
    const errors = validateSupervisaoItem(data);
    if (errors.length) {
        showToast(errors[0], "error");
        return;
    }

    const item = normalizeSupervisaoItem({
        id: data.id || createSupervisaoId(),
        category: data.category,
        type: data.type,
        title: data.title,
        description: data.description,
        link: data.link || '',
        links: data.links || [],
        images: data.images || [],
        expiresAt: data.expiresAt || '',
        emailTo: data.emailTo || '',
        emailCc: data.emailCc || '',
        emailSubject: data.emailSubject || ''
    });

    if (data.type === 'message' && (data.messageWhatsapp || data.messageEmail)) {
        item.channels = {};
        if (data.messageWhatsapp) item.channels.whatsapp = data.messageWhatsapp;
        if (data.messageEmail) item.channels.email = data.messageEmail;
    }

    const idx = supervisaoMenu.items.findIndex(i => i.id === item.id);
    const before = idx >= 0 ? { ...supervisaoMenu.items[idx] } : null;
    if (idx >= 0) {
        supervisaoMenu.items[idx] = item;
        recordSupervisaoHistory('Atualização', before, item);
    } else {
        supervisaoMenu.items.push(item);
        recordSupervisaoHistory('Criação', null, item);
    }

    touchSupervisaoMeta();
    saveSupervisaoMenu();
    renderSupervisao();
    renderSupervisaoAdminList();
    renderSupervisaoHistory();
    showToast("Item salvo com sucesso.", "success");
    resetSupervisaoEditor();
}

function removeSupervisaoItem(id) {
    if (!canEditSupervisao()) {
        showToast("Apenas admins em modo edição podem excluir.", "error");
        return;
    }
    if (!confirm('Remover este item?')) return;
    const idx = supervisaoMenu.items.findIndex(i => i.id === id);
    if (idx < 0) return;
    const before = { ...supervisaoMenu.items[idx] };
    supervisaoMenu.items.splice(idx, 1);
    recordSupervisaoHistory('Exclusão', before, null);
    touchSupervisaoMeta();
    saveSupervisaoMenu();
    renderSupervisao();
    renderSupervisaoAdminList();
    renderSupervisaoHistory();
    showToast("Item removido.", "success");
}

function restoreSupervisaoHistory(index) {
    if (!canEditSupervisao()) {
        showToast("Apenas admins em modo edição podem restaurar.", "error");
        return;
    }
    const entry = supervisaoHistory[index];
    if (!entry?.before) return;
    if (!confirm('Restaurar a versão anterior deste item?')) return;
    const item = normalizeSupervisaoItem(entry.before);
    const idx = supervisaoMenu.items.findIndex(i => i.id === item.id);
    if (idx >= 0) {
        supervisaoMenu.items[idx] = item;
    } else {
        supervisaoMenu.items.push(item);
    }
    recordSupervisaoHistory('Restauração', entry.after || null, item);
    touchSupervisaoMeta();
    saveSupervisaoMenu();
    renderSupervisao();
    renderSupervisaoAdminList();
    renderSupervisaoHistory();
    showToast("Versão restaurada.", "success");
}

// ==========================================================================
// AVISOS
// ==========================================================================

function openAvisosTab() {
    showToast("O módulo de avisos está desativado temporariamente.", "info");
    switchTab('busca');
}

function updateAvisosUI() {
    if (!isDashboardFeatureEnabled('avisos')) return;
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
    if (!isDashboardFeatureEnabled('lancamentos')) return;
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
        SiteAuth.admins.map(a => {
            const value = a.re || a.email || '';
            const label = a.name || a.email || value;
            return value ? `<option value="${value}">${label}</option>` : '';
        }).join('');
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
    if (!isDashboardFeatureEnabled('avisos')) return;
    const list = document.getElementById('avisos-list');
    const summary = document.getElementById('avisos-assignee-summary');
    if (!list) return;
    if (!SiteAuth.logged) {
        list.innerHTML = `<p class="empty-state">Avisos indisponíveis no momento.</p>`;
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
        showToast("Lembretes indisponíveis no momento.", "error");
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
        groupSelect.innerHTML = getGroupOptionsHtml();
        groupSelect.disabled = !canViewAllGroups();
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
        assigneeSelect.innerHTML = SiteAuth.admins.map(a => {
            const value = a.re || a.email || '';
            const label = a.name || a.email || value;
            const roleLabel = ROLE_LABELS[a.role] || a.role || 'Operacional';
            return value ? `<option value="${value}">${label} (${roleLabel})</option>` : '';
        }).join('');
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
    select.innerHTML = SiteAuth.admins.map(a => {
        const value = a.re || a.email || '';
        const label = a.name || a.email || value;
        const roleLabel = ROLE_LABELS[a.role] || a.role || 'Operacional';
        return value ? `<option value="${value}">${label} (${roleLabel})</option>` : '';
    }).join('');
    if (SiteAuth.re) select.value = SiteAuth.re;
    select.disabled = !isAdminRole();
}

function hydrateLembreteForm() {
    const groupSelect = document.getElementById('reminder-group-select');
    const unitSelect = document.getElementById('reminder-unit-select');
    const collabSelect = document.getElementById('reminder-collab-select');
    const assigneeSelect = document.getElementById('reminder-assignee-select');

    if (groupSelect) {
        groupSelect.innerHTML = getGroupOptionsHtml();
        groupSelect.disabled = !canViewAllGroups();
    }

    const groupValue = groupSelect?.value || currentGroup;
    const units = [...new Set(currentData.filter(d => d.grupo === groupValue).map(d => d.posto).filter(Boolean))].sort();
    if (unitSelect) {
        unitSelect.innerHTML = units.map(u => `<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('');
    }

    const collabs = currentData.filter(d => d.grupo === groupValue).sort((a,b) => a.nome.localeCompare(b.nome));
    if (collabSelect) {
        collabSelect.innerHTML = collabs.map(c => `<option value="${escapeHtml(c.re)}" data-search="${escapeHtml(c.nome)} ${escapeHtml(c.re)}">${escapeHtml(c.nome)} (${escapeHtml(c.re)})</option>`).join('');
    }

    if (assigneeSelect) {
        assigneeSelect.innerHTML = SiteAuth.admins.map(a => {
            const value = a.re || a.email || '';
            const label = a.name || a.email || value;
            const roleLabel = ROLE_LABELS[a.role] || a.role || 'Operacional';
            return value ? `<option value="${escapeHtml(value)}">${escapeHtml(label)} (${escapeHtml(roleLabel)})</option>` : '';
        }).join('');
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
        showToast("Criação de avisos indisponível no momento.", "error");
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
        showToast("Lembretes indisponíveis no momento.", "error");
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
    openWhatsApp('', text);
}

function sendReminderWhatsapp() {
    const title = document.getElementById('reminder-title')?.value.trim();
    const message = document.getElementById('reminder-message')?.value.trim();
    if (!message) {
        showToast("Digite a mensagem do lembrete.", "error");
        return;
    }
    const text = [title, message].filter(Boolean).join(' - ');
    openWhatsApp('', text);
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
        list.innerHTML = `<div class="avisos-mini-empty">Avisos indisponíveis no momento.</div>`;
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
    showToast(`Avisos da unidade ${unitName} estão desativados temporariamente.`, "info");
    switchTab('unidades');
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

function playReminderSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const chime = (delayMs, freq, duration = 0.35) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.frequency.value = freq;
            o.type = 'sine';
            o.connect(g);
            g.connect(ctx.destination);
            const now = ctx.currentTime + delayMs / 1000;
            g.gain.setValueAtTime(0.001, now);
            g.gain.exponentialRampToValueAtTime(0.12, now + 0.03);
            g.gain.exponentialRampToValueAtTime(0.001, now + duration);
            o.start(now);
            o.stop(now + duration + 0.05);
        };
        chime(0, 523);
        chime(380, 659);
    } catch {}
}

function dismissReminderAlerts() {
    reminderAlertsHidden = true;
    document.getElementById('reminder-alerts')?.classList.add('hidden');
}

function renderReminderAlerts(items) {
    const box = document.getElementById('reminder-alerts');
    const list = document.getElementById('reminder-alerts-list');
    if (!box || !list) return;
    if (!items.length || reminderAlertsHidden) {
        box.classList.add('hidden');
        return;
    }
    list.innerHTML = items.map(a => `
        <div class="reminder-alert-item">
            <strong>${a.title || 'Lembrete'}</strong>
            <div class="reminder-alert-meta">${a.unit ? `${a.unit} • ` : ''}${formatAvisoDate(a.reminderNextAt)}</div>
            <div class="reminder-alert-meta">${a.message || ''}</div>
        </div>
    `).join('');
    box.classList.remove('hidden');
}

function checkReminderAlerts() {
    if (!isDashboardFeatureEnabled('avisos')) return;
    if (!SiteAuth.logged) {
        renderReminderAlerts([]);
        return;
    }
    const visible = filterAvisosByVisibility(avisos);
    const now = Date.now();
    const due = visible.filter(a => a.status === 'pending' && a.reminderEnabled && a.reminderNextAt)
        .filter(a => new Date(a.reminderNextAt).getTime() <= now);

    if (!due.length) {
        renderReminderAlerts([]);
        return;
    }

    let shouldSave = false;
    let played = false;
    due.forEach(a => {
        if (a.reminderLastAlertAt !== a.reminderNextAt) {
            a.reminderLastAlertAt = a.reminderNextAt;
            shouldSave = true;
            played = true;
        }
    });
    if (shouldSave) saveAvisos(true);
    if (played) {
        playReminderSound();
        reminderAlertsHidden = false;
    }
    renderReminderAlerts(due);
}

function startReminderMonitor() {
    if (!isDashboardFeatureEnabled('avisos')) return;
    checkReminderAlerts();
    reminderCheckTimer = AppTimerManager.setInterval(APP_TIMERS.reminderCheck, checkReminderAlerts, 60000);
    AppEventManager.on(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkReminderAlerts();
        }
    }, false, { scope: 'reminders', key: 'reminders-visibility' });
}

// ==========================================================================
// LANCAMENTOS DE FT
// ==========================================================================

function switchLancamentosTab(tab) {
    if (tab === 'novo') {
        showToast("Fluxo manual de lançamento está desativado. Integração Supabase pendente.", "info");
        tab = 'diaria';
    }
    currentLancamentosTab = tab;
    renderLancamentos();
}

function switchLancamentosMode(mode = 'ft') {
    currentLancamentosMode = mode === 'troca' ? 'troca' : 'ft';
    if (currentLancamentosTab === 'novo') {
        currentLancamentosTab = 'diaria';
    }
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
    select.innerHTML = collabs.map(c => `<option value="${escapeHtml(c.re)}" data-search="${escapeHtml(c.nome)} ${escapeHtml(c.re)}" data-unit="${escapeHtml(c.posto || '')}">${escapeHtml(c.nome)} (${escapeHtml(c.re)})</option>`).join('');
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

function selectFtCollabByRe(re) {
    const select = document.getElementById('ft-collab-select');
    const input = document.getElementById('ft-search');
    if (!select) return;
    const unitTarget = document.getElementById('ft-unit-target');
    if (unitTarget && unitTarget.value) unitTarget.dataset.auto = '0';
    select.value = re;
    const candidate = (allCollaboratorsCache.items || currentData).find(c => c.re === re || c.re?.endsWith(re));
    if (input && candidate?.nome) input.value = candidate.nome;
    syncFtUnitWithCollab();
}

async function suggestFtCoverageByUnit() {
    const unitTarget = document.getElementById('ft-unit-target');
    const container = document.getElementById('ft-coverage-suggestions');
    if (!unitTarget || !container) return;
    const unitName = unitTarget.value?.trim();
    if (!unitName) {
        showToast("Selecione a unidade FT.", "error");
        return;
    }
    await renderCoverageSuggestionsByUnit(unitName, container, {
        actionBuilder: (cand) => {
            const re = cand?.re ? JSON.stringify(cand.re) : "''";
            return `<button class="btn btn-secondary btn-small" onclick="selectFtCollabByRe(${re})">Usar no lançamento</button>`;
        }
    });
}

function parseFtDateParts(value) {
    if (!value) return null;
    const raw = String(value).trim();
    const isoMatch = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
    if (isoMatch) {
        return { y: Number(isoMatch[1]), m: Number(isoMatch[2]), d: Number(isoMatch[3]) };
    }
    const brMatch = raw.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})/);
    if (brMatch) {
        return { y: Number(brMatch[3]), m: Number(brMatch[2]), d: Number(brMatch[1]) };
    }
    return null;
}

function normalizeFtDateKey(value) {
    const parts = parseFtDateParts(value);
    if (!parts) return '';
    const y = String(parts.y).padStart(4, '0');
    const m = String(parts.m).padStart(2, '0');
    const d = String(parts.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function getFtItemDateKey(item) {
    if (!item) return '';
    return normalizeFtDateKey(item.date)
        || normalizeFtDateKey(item.createdAt)
        || normalizeFtDateKey(item.requestedAt)
        || '';
}

function getFtItemDateValue(item) {
    const key = normalizeFtDateKey(item?.date);
    if (key) {
        const ts = Date.parse(`${key}T00:00:00`);
        return Number.isNaN(ts) ? 0 : ts;
    }
    const created = Date.parse(item?.createdAt || '');
    if (!Number.isNaN(created)) return created;
    const requested = Date.parse(item?.requestedAt || '');
    if (!Number.isNaN(requested)) return requested;
    return 0;
}

function formatFtDate(value) {
    if (!value) return '';
    const parts = parseFtDateParts(value);
    if (parts) {
        const date = new Date(parts.y, parts.m - 1, parts.d);
        return date.toLocaleDateString();
    }
    try {
        return new Date(value).toLocaleDateString();
    } catch {
        return String(value);
    }
}

function formatFtDateShort(value) {
    if (!value) return '';
    const parts = parseFtDateParts(value);
    if (parts) {
        return `${String(parts.d).padStart(2, '0')}/${String(parts.m).padStart(2, '0')}`;
    }
    return formatFtDate(value);
}

function formatFtDateTime(value) {
    if (!value) return '';
    const parts = parseFtDateParts(value);
    if (parts && !String(value).includes('T')) {
        return formatFtDate(value);
    }
    try {
        return new Date(value).toLocaleString();
    } catch {
        return String(value);
    }
}

function getFtOperationalItems(list = ftLaunches) {
    return (list || []).filter(Boolean);
}

function applyFtFilters(list) {
    let items = getFtOperationalItems(list);
    if (ftFilter.from || ftFilter.to) {
        items = items.filter(i => {
            const key = normalizeFtDateKey(i?.date);
            if (!key) return false;
            if (ftFilter.from && key < ftFilter.from) return false;
            if (ftFilter.to && key > ftFilter.to) return false;
            return true;
        });
    }
    if (ftFilter.status !== 'all') items = items.filter(i => i.status === ftFilter.status);
    return items;
}

function getFtUnitLabel(item) {
    return (item?.unitTarget || item?.unitCurrent || '').trim() || 'N/I';
}

function getFtCollabLabel(item) {
    const name = (item?.collabName || '').trim();
    const re = (item?.collabRe || '').trim();
    if (name && re) return `${name} (${re})`;
    if (name) return name;
    if (re) return `RE ${re}`;
    return 'N/I';
}

function getFtStatusLabel(item) {
    if (item?.status === 'launched') return 'LANÇADO';
    if (item?.status === 'submitted') return 'CONFIRMADO';
    return 'PENDENTE';
}

function getFtSourceInfo(item) {
    const source = String(item?.source || '').trim().toLowerCase();
    if (source === 'supabase') {
        return { label: 'Supabase', className: 'source-supabase' };
    }
    if (source) {
        return { label: 'Importação legada', className: 'source-legacy' };
    }
    return { label: 'Local', className: 'source-manual' };
}

function buildFtHistorySearchText(item) {
    const statusLabel = getFtStatusLabel(item);
    return normalizeText([
        item?.collabName,
        item?.collabRe,
        item?.unitTarget,
        item?.unitCurrent,
        item?.reasonRaw,
        item?.reasonOther,
        item?.reasonDetail,
        item?.coveringName,
        item?.coveringRe,
        item?.coveringOther,
        item?.shift,
        item?.ftTime,
        item?.status,
        statusLabel,
        item?.group,
        item?.sourceGroup
    ].filter(Boolean).join(' '));
}

function matchesFtHistorySearch(item, term) {
    if (!term) return true;
    return buildFtHistorySearchText(item).includes(term);
}

function applyFtHistoryFilters(list) {
    let items = applyFtFilters(list);
    const unitFilterRaw = (ftHistoryFilter.unit || '').trim();
    const unitFilter = normalizeText(unitFilterRaw);
    if (unitFilter) {
        items = items.filter(i => normalizeText(getFtUnitLabel(i)) === unitFilter);
    }
    const collabFilterRaw = (ftHistoryFilter.collab || '').trim();
    if (collabFilterRaw) {
        const collabNorm = normalizeText(collabFilterRaw);
        items = items.filter(i => {
            if (matchesRe(i.collabRe, collabFilterRaw)) return true;
            if (normalizeText(i.collabName || '') === collabNorm) return true;
            return normalizeText(getFtCollabLabel(i)) === collabNorm;
        });
    }
    const term = normalizeText(ftHistoryFilter.search || '').trim();
    if (term) items = items.filter(i => matchesFtHistorySearch(i, term));
    return items;
}

function sortFtHistoryItems(items) {
    const key = ftHistoryFilter.sort || 'date_desc';
    const statusRank = (value) => {
        if (value === 'pending') return 0;
        if (value === 'submitted') return 1;
        if (value === 'launched') return 2;
        return 3;
    };
    const getDateValue = (item) => getFtItemDateValue(item);
    const getCreatedValue = (item) => getFtItemDateValue({ createdAt: item?.createdAt });
    const getRequestedValue = (item) => getFtItemDateValue({ requestedAt: item?.requestedAt });
    const getUnitValue = (item) => getFtUnitLabel(item).toUpperCase();
    const getCollabValue = (item) => (item?.collabName || '').toUpperCase();
    return items.slice().sort((a, b) => {
        if (key === 'date_asc') return getDateValue(a) - getDateValue(b);
        if (key === 'date_desc') return getDateValue(b) - getDateValue(a);
        if (key === 'created_asc') return getCreatedValue(a) - getCreatedValue(b);
        if (key === 'created_desc') return getCreatedValue(b) - getCreatedValue(a);
        if (key === 'requested_asc') return getRequestedValue(a) - getRequestedValue(b);
        if (key === 'requested_desc') return getRequestedValue(b) - getRequestedValue(a);
        if (key === 'status') return statusRank(a?.status) - statusRank(b?.status);
        if (key === 'unit') return getUnitValue(a).localeCompare(getUnitValue(b));
        if (key === 'collab') return getCollabValue(a).localeCompare(getCollabValue(b));
        return getDateValue(b) - getDateValue(a);
    });
}

function getFtHistoryGroupKey(item) {
    const date = normalizeFtDateKey(item?.date);
    if (date) return date;
    const created = normalizeFtDateKey(item?.createdAt);
    if (created) return created;
    const requested = normalizeFtDateKey(item?.requestedAt);
    if (requested) return requested;
    return 'Sem data';
}

function formatFtHistoryGroupLabel(key) {
    if (!key || key === 'Sem data') return 'Sem data';
    const date = new Date(`${key}T00:00:00`);
    if (Number.isNaN(date.getTime())) return key;
    const weekdays = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    const weekday = weekdays[date.getDay()] || '';
    return `${weekday} • ${date.toLocaleDateString()}`;
}

function buildFtHistoryGroups(items) {
    const groups = {};
    items.forEach(item => {
        const key = getFtHistoryGroupKey(item);
        if (!groups[key]) groups[key] = [];
        groups[key].push(item);
    });
    const keys = Object.keys(groups).sort((a, b) => {
        if (a === 'Sem data') return 1;
        if (b === 'Sem data') return -1;
        const ta = Date.parse(`${a}T00:00:00`);
        const tb = Date.parse(`${b}T00:00:00`);
        if (Number.isNaN(ta) || Number.isNaN(tb)) return String(b).localeCompare(String(a));
        return tb - ta;
    });
    return keys.map(key => ({ key, label: formatFtHistoryGroupLabel(key), items: groups[key] }));
}

function toggleFtHistoryGrouped() {
    ftHistoryFilter.grouped = !ftHistoryFilter.grouped;
    renderLancamentosHistorico();
}

function toggleFtHistoryDetails(id) {
    if (!id) return;
    if (ftHistoryExpanded.has(id)) {
        ftHistoryExpanded.delete(id);
    } else {
        ftHistoryExpanded.add(id);
    }
    const card = document.querySelector(`[data-ft-id="${id}"]`);
    const details = card?.querySelector('.lancamento-details');
    const btn = card?.querySelector('.lancamento-toggle');
    if (details) details.classList.toggle('hidden', !ftHistoryExpanded.has(id));
    if (btn) btn.textContent = ftHistoryExpanded.has(id) ? 'Ocultar detalhes' : 'Ver detalhes';
}

function toDateInputValue(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function setFtDateRange(range) {
    const today = new Date();
    if (range === 'today') {
        const value = toDateInputValue(today);
        ftFilter.from = value;
        ftFilter.to = value;
    } else if (range === '7d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 6);
        ftFilter.from = toDateInputValue(start);
        ftFilter.to = toDateInputValue(today);
    } else if (range === '30d') {
        const start = new Date(today);
        start.setDate(today.getDate() - 29);
        ftFilter.from = toDateInputValue(start);
        ftFilter.to = toDateInputValue(today);
    } else if (range === 'month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        ftFilter.from = toDateInputValue(start);
        ftFilter.to = toDateInputValue(today);
    } else {
        ftFilter.from = '';
        ftFilter.to = '';
    }
    renderLancamentos();
}

function getFtQuickRangePreset() {
    const from = normalizeFtDateKey(ftFilter.from);
    const to = normalizeFtDateKey(ftFilter.to);
    if (!from && !to) return 'clear';
    const todayDate = new Date();
    const today = toDateInputValue(todayDate);
    if (from === today && to === today) return 'today';
    const start7 = new Date(todayDate);
    start7.setDate(todayDate.getDate() - 6);
    if (from === toDateInputValue(start7) && to === today) return '7d';
    const start30 = new Date(todayDate);
    start30.setDate(todayDate.getDate() - 29);
    if (from === toDateInputValue(start30) && to === today) return '30d';
    const monthStart = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
    if (from === toDateInputValue(monthStart) && to === today) return 'month';
    return 'custom';
}

function toggleFtPendingOnly() {
    ftFilter.status = ftFilter.status === 'pending' ? 'all' : 'pending';
    renderLancamentos();
}

function updateLancamentosHeader() {
    const statusEl = document.getElementById('lancamentos-sync-status');
    const lastEl = document.getElementById('lancamentos-last-sync');
    if (statusEl) {
        statusEl.textContent = 'Integração Supabase pendente';
        statusEl.classList.remove('syncing');
    }
    if (lastEl) {
        lastEl.textContent = '—';
    }
    document.querySelectorAll('.ft-sync-info').forEach(el => {
        el.textContent = '—';
    });
}

function updateLancamentosTabs() {
    const ftItems = applyFtFilters(ftLaunches);
    const ftTotal = ftItems.length;
    const ftPending = ftItems.filter(i => i.status === 'pending').length;
    const ftPlanningDays = new Set(ftItems.map(i => normalizeFtDateKey(i?.date)).filter(Boolean)).size;
    const today = getTodayKey();
    const ftToday = getFtOperationalItems(ftLaunches).filter(i => normalizeFtDateKey(i?.date) === today).length;
    const todayEl = document.getElementById('lancamentos-tab-today');
    const totalEl = document.getElementById('lancamentos-tab-total');
    const pendingEl = document.getElementById('lancamentos-tab-pending');
    const planningEl = document.getElementById('lancamentos-tab-planning');
    if (todayEl) todayEl.textContent = ftToday;
    if (totalEl) totalEl.textContent = ftTotal;
    if (pendingEl) pendingEl.textContent = ftPending;
    if (planningEl) planningEl.textContent = ftPlanningDays;

    const trocaItems = trocaLaunches.slice();
    const trocaToday = trocaItems.filter(i => getTrocaPrimaryDate(i) === today).length;
    const trocaTotal = trocaItems.length;
    const trocaPending = trocaItems.filter(i => i.status === 'pending').length;
    const trocaPlanningDays = new Set(trocaItems.map(i => getTrocaPrimaryDate(i)).filter(Boolean)).size;
    const trocaTodayEl = document.getElementById('lancamentos-tab-troca-today');
    const trocaTotalEl = document.getElementById('lancamentos-tab-troca-total');
    const trocaPendingEl = document.getElementById('lancamentos-tab-troca-pending');
    const trocaPlanningEl = document.getElementById('lancamentos-tab-troca-planning');
    if (trocaTodayEl) trocaTodayEl.textContent = trocaToday;
    if (trocaTotalEl) trocaTotalEl.textContent = trocaTotal;
    if (trocaPendingEl) trocaPendingEl.textContent = trocaPending;
    if (trocaPlanningEl) trocaPlanningEl.textContent = trocaPlanningDays;

    const isFtMode = currentLancamentosMode !== 'troca';
    document.querySelectorAll('.lancamentos-tab').forEach(btn => {
        const key = btn.getAttribute('data-tab');
        const parentTabs = btn.closest('.lancamentos-tabs');
        const isFtTab = parentTabs?.id === 'lancamentos-tabs-ft';
        const active = key === currentLancamentosTab && (isFtMode ? isFtTab : !isFtTab);
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
}

function renderLancamentosFilters() {
    const wrap = document.getElementById('lancamentos-filters-wrap');
    if (!wrap) return;
    const show = currentLancamentosMode === 'ft'
        && currentLancamentosTab !== 'diaria';
    wrap.classList.toggle('hidden', !show);
    if (!show) return;
    const quickPreset = getFtQuickRangePreset();
    wrap.innerHTML = `
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
                    <option value="submitted" ${ftFilter.status === 'submitted' ? 'selected' : ''}>Confirmados</option>
                    <option value="launched" ${ftFilter.status === 'launched' ? 'selected' : ''}>Lançados</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-quick">
            <button class="filter-chip ${ftFilter.status === 'pending' ? 'active' : ''}" onclick="toggleFtPendingOnly()" aria-pressed="${ftFilter.status === 'pending' ? 'true' : 'false'}">Somente pendentes</button>
            <button class="filter-chip ${quickPreset === 'today' ? 'active' : ''}" onclick="setFtDateRange('today')" aria-pressed="${quickPreset === 'today' ? 'true' : 'false'}">Hoje</button>
            <button class="filter-chip ${quickPreset === '7d' ? 'active' : ''}" onclick="setFtDateRange('7d')" aria-pressed="${quickPreset === '7d' ? 'true' : 'false'}">7 dias</button>
            <button class="filter-chip ${quickPreset === '30d' ? 'active' : ''}" onclick="setFtDateRange('30d')" aria-pressed="${quickPreset === '30d' ? 'true' : 'false'}">30 dias</button>
            <button class="filter-chip ${quickPreset === 'month' ? 'active' : ''}" onclick="setFtDateRange('month')" aria-pressed="${quickPreset === 'month' ? 'true' : 'false'}">Este mês</button>
            <button class="filter-chip ${quickPreset === 'clear' ? 'active' : ''}" onclick="setFtDateRange('clear')" aria-pressed="${quickPreset === 'clear' ? 'true' : 'false'}">Limpar datas</button>
        </div>
    `;
    document.getElementById('ft-filter-from')?.addEventListener('change', (e) => {
        ftFilter.from = e.target.value || '';
        renderLancamentos();
    });
    document.getElementById('ft-filter-to')?.addEventListener('change', (e) => {
        ftFilter.to = e.target.value || '';
        renderLancamentos();
    });
    document.getElementById('ft-filter-status')?.addEventListener('change', (e) => {
        ftFilter.status = e.target.value || 'all';
        renderLancamentos();
    });
}

function buildReportRows(entries) {
    if (!entries.length) {
        return `<div class="report-empty">Sem dados.</div>`;
    }
    const max = Math.max(...entries.map(e => e.value), 1);
    return entries.map(e => `
        <div class="report-row">
            <div class="report-label">${e.label}</div>
            <div class="report-bar"><span style="width:${Math.round((e.value / max) * 100)}%"></span></div>
            <div class="report-value">${e.value}</div>
        </div>
    `).join('');
}

function buildRecentRows(items, emptyText) {
    if (!items.length) return `<div class="report-empty">${emptyText}</div>`;
    return items.map(i => `
        <div class="report-row compact">
            <div class="report-label">${i.label}</div>
            <div class="report-value">${i.value}</div>
        </div>
    `).join('');
}

function getFtWeekdayLabel(dateStr) {
    if (!dateStr) return '';
    const date = new Date(`${dateStr}T00:00:00`);
    if (Number.isNaN(date.getTime())) return '';
    const map = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
    return map[date.getDay()];
}

function getLancPlanModeKey() {
    return currentLancamentosMode === 'troca' ? 'troca' : 'ft';
}

function ensureLancPlanState(modeKey = 'ft') {
    const key = modeKey === 'troca' ? 'troca' : 'ft';
    if (!lancamentosPlanningState || typeof lancamentosPlanningState !== 'object') {
        lancamentosPlanningState = {};
    }
    if (!lancamentosPlanningState[key]) {
        lancamentosPlanningState[key] = { range: 'week', anchor: '', selected: '' };
    }
    const state = lancamentosPlanningState[key];
    const today = getTodayKey();
    state.range = state.range === 'month' ? 'month' : 'week';
    state.anchor = normalizeFtDateKey(state.anchor) || today;
    state.selected = normalizeFtDateKey(state.selected) || state.anchor;
    return state;
}

function getLancPlanRangeDays(state) {
    if ((state?.range || 'week') === 'month') {
        const info = getMonthRangeByDateKey(state.anchor);
        const days = [];
        const firstDate = new Date(`${info.start}T00:00:00`);
        const offset = Number.isNaN(firstDate.getTime()) ? 0 : ((firstDate.getDay() + 6) % 7);
        for (let i = 0; i < offset; i++) {
            days.push({ key: `pad-start-${i}`, placeholder: true });
        }
        let cursor = info.start;
        while (cursor && cursor <= info.end) {
            days.push({ key: cursor, placeholder: false });
            cursor = getDateKeyWithOffset(cursor, 1);
        }
        while (days.length % 7 !== 0) {
            days.push({ key: `pad-end-${days.length}`, placeholder: true });
        }
        return { range: 'month', label: info.monthLabel, start: info.start, end: info.end, days };
    }

    const start = getWeekStartMonday(state?.anchor);
    const days = [];
    for (let i = 0; i < 7; i++) {
        days.push({ key: getDateKeyWithOffset(start, i), placeholder: false });
    }
    const end = days[days.length - 1]?.key || start;
    return {
        range: 'week',
        label: `${formatFtDate(start)} até ${formatFtDate(end)}`,
        start,
        end,
        days
    };
}

function buildLancPlanIndexByDay(modeKey = 'ft') {
    const map = {};
    if (modeKey === 'troca') {
        const items = trocaLaunches.slice();
        items.forEach(item => {
            const key = getTrocaPrimaryDate(item);
            if (!key) return;
            if (!map[key]) map[key] = [];
            map[key].push(item);
        });
        return { items, map };
    }
    const items = applyFtFilters(ftLaunches);
    items.forEach(item => {
        const key = normalizeFtDateKey(item?.date);
        if (!key) return;
        if (!map[key]) map[key] = [];
        map[key].push(item);
    });
    return { items, map };
}

function getLancPlanDaySummary(modeKey, dayItems = []) {
    const total = dayItems.length;
    if (modeKey === 'troca') {
        if (!total) {
            return { tone: 'tone-critical', badge: 'Sem troca', badgeClass: 'none', meta: 'Nenhum registro' };
        }
        const pending = dayItems.filter(item => item?.status === 'pending').length;
        const withError = dayItems.filter(item => (item?.errors || []).length > 0).length;
        const launched = dayItems.filter(item => item?.status === 'launched').length;
        if (pending > 0 || withError > 0) {
            const badge = withError > 0 ? `${withError} erro${withError > 1 ? 's' : ''}` : `${pending} pend.`;
            return {
                tone: 'tone-warning',
                badge,
                badgeClass: withError > 0 ? 'd' : 'e',
                meta: `${total} troca(s), ${launched} lançada(s)`
            };
        }
        return {
            tone: 'tone-normal',
            badge: `${total} troca${total > 1 ? 's' : ''}`,
            badgeClass: 'v',
            meta: 'Sem alerta no dia'
        };
    }

    if (!total) {
        return { tone: 'tone-critical', badge: 'Sem FT', badgeClass: 'none', meta: 'Sem cobertura registrada' };
    }
    const pending = dayItems.filter(item => item?.status === 'pending').length;
    const submitted = dayItems.filter(item => item?.status === 'submitted').length;
    const launched = dayItems.filter(item => item?.status === 'launched').length;
    if (pending > 0) {
        return {
            tone: 'tone-warning',
            badge: `${pending} pend.`,
            badgeClass: 'd',
            meta: `${total} FT no dia`
        };
    }
    if (submitted > 0) {
        return {
            tone: 'tone-normal',
            badge: `${submitted} conf.`,
            badgeClass: 'e',
            meta: `${launched} lançada(s)`
        };
    }
    return {
        tone: 'tone-normal',
        badge: `OK (${launched})`,
        badgeClass: 'v',
        meta: `${total} FT lançada(s)`
    };
}

function buildLancPlanDetailsFt(dayKey, dayItems = []) {
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    const weekday = getWeekdayLongPtByDate(key);
    const summary = getLancPlanDaySummary('ft', dayItems);
    const sorted = dayItems.slice().sort((a, b) => getFtStatusRank(b?.status) - getFtStatusRank(a?.status));
    const listHtml = sorted.length
        ? sorted.map(item => {
            const coverer = item?.collabName || (item?.collabRe ? `RE ${item.collabRe}` : 'N/I');
            const covered = item?.coveringName
                || (item?.coveringOther && item.coveringOther !== 'Não se aplica' ? item.coveringOther : '')
                || (item?.coveringRe ? `RE ${item.coveringRe}` : '');
            const relation = covered ? `${coverer} cobrindo ${covered}` : coverer;
            const reason = getFtReasonLabel(item?.reason, item?.reasonOther) || item?.reasonRaw || 'N/I';
            return `
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${item?.status || 'pending'}">${escapeHtml(getFtStatusLabel(item))}</span>
                        <strong>${escapeHtml(relation)}</strong>
                    </div>
                    <div class="ft-day-item-meta">Unidade: ${escapeHtml(getFtUnitLabel(item))} • Turno: ${escapeHtml(item?.shift || 'N/I')} • Horário: ${escapeHtml(item?.ftTime || 'N/I')}</div>
                    <div class="ft-day-item-meta">Motivo: ${escapeHtml(reason)}</div>
                </div>
            `;
        }).join('')
        : '<p class="empty-state">Sem FT neste dia.</p>';
    return `
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(weekday)} • ${escapeHtml(formatFtDate(key))}</strong>
                <div class="ft-day-header-sub">Visão completa das coberturas de FT do dia selecionado.</div>
            </div>
            <span class="ft-month-ft ${summary.badgeClass}">${escapeHtml(summary.badge)}</span>
        </div>
        <div class="ft-day-list">${listHtml}</div>
    `;
}

function buildLancPlanDetailsTroca(dayKey, dayItems = []) {
    const key = normalizeFtDateKey(dayKey) || getTodayKey();
    const weekday = getWeekdayLongPtByDate(key);
    const summary = getLancPlanDaySummary('troca', dayItems);
    const sorted = dayItems.slice().sort((a, b) => {
        const ta = Date.parse(a?.createdAt || a?.requestedAt || '');
        const tb = Date.parse(b?.createdAt || b?.requestedAt || '');
        return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
    });
    const listHtml = sorted.length
        ? sorted.map(item => {
            const req1 = item?.requesterName || (item?.requesterRe ? `RE ${item.requesterRe}` : 'N/I');
            const req2 = item?.counterpartName || (item?.counterpartRe ? `RE ${item.counterpartRe}` : 'N/I');
            const errors = (item?.errors || []).join(' • ');
            return `
                <div class="ft-day-item">
                    <div class="ft-day-item-top">
                        <span class="diaria-status status-${item?.status || 'pending'}">${escapeHtml(getFtStatusLabel(item))}</span>
                        <strong>${escapeHtml(item?.unit || 'Unidade não informada')} • REF ${escapeHtml(item?.ref || 'N/I')}</strong>
                    </div>
                    <div class="ft-day-item-meta">Solicitante 1: ${escapeHtml(req1)} (${escapeHtml(item?.requesterRe || 'N/I')})</div>
                    <div class="ft-day-item-meta">Solicitante 2: ${escapeHtml(req2)} (${escapeHtml(item?.counterpartRe || 'N/I')})</div>
                    ${errors ? `<div class="ft-day-item-meta">Erros: ${escapeHtml(errors)}</div>` : ''}
                </div>
            `;
        }).join('')
        : '<p class="empty-state">Sem trocas neste dia.</p>';
    return `
        <div class="ft-day-header">
            <div>
                <strong>${escapeHtml(weekday)} • ${escapeHtml(formatFtDate(key))}</strong>
                <div class="ft-day-header-sub">Visão completa das trocas registradas no dia selecionado.</div>
            </div>
            <span class="ft-month-ft ${summary.badgeClass}">${escapeHtml(summary.badge)}</span>
        </div>
        <div class="ft-day-list">${listHtml}</div>
    `;
}

function setLancPlanRange(range = 'week') {
    const state = ensureLancPlanState(getLancPlanModeKey());
    state.range = range === 'month' ? 'month' : 'week';
    if (currentLancamentosTab === 'planejamento') {
        renderLancamentosPlanejamento();
    }
}

function shiftLancPlanWindow(direction = 1) {
    const state = ensureLancPlanState(getLancPlanModeKey());
    const dir = Number(direction) < 0 ? -1 : 1;
    if (state.range === 'month') {
        const anchor = normalizeFtDateKey(state.anchor) || getTodayKey();
        const date = new Date(`${anchor}T00:00:00`);
        if (Number.isNaN(date.getTime())) return;
        date.setDate(1);
        date.setMonth(date.getMonth() + dir);
        state.anchor = toDateInputValue(date);
    } else {
        state.anchor = getDateKeyWithOffset(state.anchor, dir * 7);
    }
    if (currentLancamentosTab === 'planejamento') {
        renderLancamentosPlanejamento();
    }
}

function jumpLancPlanToday() {
    const state = ensureLancPlanState(getLancPlanModeKey());
    const today = getTodayKey();
    state.anchor = today;
    state.selected = today;
    if (currentLancamentosTab === 'planejamento') {
        renderLancamentosPlanejamento();
    }
}

function selectLancPlanDay(dayKey = '') {
    const state = ensureLancPlanState(getLancPlanModeKey());
    const key = normalizeFtDateKey(dayKey);
    if (!key) return;
    state.selected = key;
    if (currentLancamentosTab === 'planejamento') {
        renderLancamentosPlanejamento();
    }
}

function renderLancamentosPlanejamento() {
    const panel = document.getElementById('lancamentos-panel-planejamento');
    if (!panel) return;
    const modeKey = getLancPlanModeKey();
    const isFtMode = modeKey === 'ft';
    const state = ensureLancPlanState(modeKey);
    const range = getLancPlanRangeDays(state);
    const actualDays = range.days.filter(day => !day.placeholder);
    const validSelected = actualDays.some(day => day.key === state.selected);
    if (!validSelected) {
        state.selected = actualDays[0]?.key || getTodayKey();
    }

    const { items, map } = buildLancPlanIndexByDay(modeKey);
    const pendingCount = items.filter(item => item?.status === 'pending').length;
    const launchedCount = items.filter(item => item?.status === 'launched').length;
    const daysWithData = actualDays.filter(day => (map[day.key] || []).length > 0).length;
    const emptyDays = actualDays.length - daysWithData;
    const errorCount = isFtMode ? 0 : items.filter(item => (item?.errors || []).length > 0).length;
    const selectedItems = map[state.selected] || [];

    const cellsHtml = range.days.map(day => {
        if (day.placeholder) {
            return `<div class="lanc-plan-day placeholder" aria-hidden="true"></div>`;
        }
        const dayItems = map[day.key] || [];
        const summary = getLancPlanDaySummary(modeKey, dayItems);
        const dayNumber = new Date(`${day.key}T00:00:00`).getDate();
        const isToday = day.key === getTodayKey();
        const isActive = day.key === state.selected;
        const title = `${formatFtDate(day.key)} • ${summary.meta}`;
        return `
            <button type="button" class="ft-month-day lanc-plan-day ${summary.tone} ${isToday ? 'today' : ''} ${isActive ? 'active' : ''}" title="${escapeHtml(title)}" onclick="selectLancPlanDay('${day.key}')">
                <span class="ft-month-weekday">${escapeHtml(getWeekdayShortPtByDate(day.key))}</span>
                <span class="ft-month-date">${String(dayNumber).padStart(2, '0')}</span>
                <span class="ft-month-ft ${summary.badgeClass}">${escapeHtml(summary.badge)}</span>
                <span class="lanc-plan-meta">${escapeHtml(summary.meta)}</span>
            </button>
        `;
    }).join('');

    const detailsHtml = isFtMode
        ? buildLancPlanDetailsFt(state.selected, selectedItems)
        : buildLancPlanDetailsTroca(state.selected, selectedItems);

    panel.innerHTML = `
        <div class="lanc-plan-shell">
            <div class="lanc-plan-toolbar">
                <div>
                    <div class="dashboard-title">${isFtMode ? 'PLANEJAMENTO FT' : 'PLANEJAMENTO TROCA'}</div>
                    <h4>${isFtMode ? 'Cobertura semanal/mensal de FT' : 'Planejamento semanal/mensal de trocas'}</h4>
                </div>
                <div class="lanc-plan-controls">
                    <div class="lanc-plan-nav">
                        <button class="btn btn-secondary btn-small" onclick="shiftLancPlanWindow(-1)">Anterior</button>
                        <button class="btn btn-secondary btn-small" onclick="jumpLancPlanToday()">Hoje</button>
                        <button class="btn btn-secondary btn-small" onclick="shiftLancPlanWindow(1)">Próximo</button>
                    </div>
                    <button class="filter-chip ${state.range === 'week' ? 'active' : ''}" onclick="setLancPlanRange('week')">Semanal</button>
                    <button class="filter-chip ${state.range === 'month' ? 'active' : ''}" onclick="setLancPlanRange('month')">Mensal</button>
                </div>
            </div>
            <div class="lancamentos-kpi">
                <div class="kpi-card"><div class="kpi-label">${isFtMode ? 'FT no período' : 'Trocas no período'}</div><div class="kpi-value">${items.length}</div><div class="kpi-sub">${range.label}</div></div>
                <div class="kpi-card"><div class="kpi-label">Dias com registros</div><div class="kpi-value">${daysWithData}</div><div class="kpi-sub">Total de ${actualDays.length} dias</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${pendingCount}</div><div class="kpi-sub">Aguardando tratamento</div></div>
                <div class="kpi-card"><div class="kpi-label">Lançadas</div><div class="kpi-value">${launchedCount}</div><div class="kpi-sub">Status lançado</div></div>
                <div class="kpi-card"><div class="kpi-label">${isFtMode ? 'Dias sem FT' : 'Dias sem troca'}</div><div class="kpi-value">${emptyDays}</div><div class="kpi-sub">Atenção para planejamento</div></div>
                ${isFtMode ? '' : `<div class="kpi-card"><div class="kpi-label">Com erro</div><div class="kpi-value">${errorCount}</div><div class="kpi-sub">Somente trocas lançadas</div></div>`}
            </div>
            <div class="ft-month-toolbar">
                <div class="ft-month-title">${escapeHtml(range.label)}</div>
                <div class="ft-month-subtitle">${isFtMode ? 'Clique no dia para ver quem está cobrindo quem.' : 'Clique no dia para ver solicitantes e status.'}</div>
            </div>
            <div class="lanc-plan-grid ${range.range}">${cellsHtml}</div>
            <div class="lanc-plan-legend">
                <span class="lanc-plan-pill tone-normal">Normal</span>
                <span class="lanc-plan-pill tone-warning">Atenção</span>
                <span class="lanc-plan-pill tone-critical">Crítico</span>
            </div>
            <div class="ft-month-day-details">${detailsHtml}</div>
        </div>
    `;
}

function renderLancamentos() {
    if (!isDashboardFeatureEnabled('lancamentos')) return;
    ftLaunches = normalizeFtLaunchEntries(ftLaunches);
    const panelDiaria = document.getElementById('lancamentos-panel-diaria');
    const panelTroca = document.getElementById('lancamentos-panel-troca');
    const panelDashboard = document.getElementById('lancamentos-panel-dashboard');
    const panelHistorico = document.getElementById('lancamentos-panel-historico');
    const panelPlanejamento = document.getElementById('lancamentos-panel-planejamento');
    const panelNovo = document.getElementById('lancamentos-panel-novo');
    if (!panelDiaria || !panelTroca || !panelDashboard || !panelHistorico || !panelPlanejamento || !panelNovo) return;

    const isFtMode = currentLancamentosMode !== 'troca';
    if (currentLancamentosTab === 'novo') {
        currentLancamentosTab = 'diaria';
    }
    const mainTitle = document.getElementById('lancamentos-main-title');
    if (mainTitle) mainTitle.textContent = isFtMode ? 'Lançamentos FT (Supabase em implantação)' : 'Lançamentos Troca de folga';
    document.querySelectorAll('.lancamentos-mode-btn').forEach(btn => {
        const mode = btn.getAttribute('data-mode');
        btn.classList.toggle('active', mode === (isFtMode ? 'ft' : 'troca'));
    });
    document.getElementById('lancamentos-tabs-ft')?.classList.toggle('hidden', !isFtMode);
    document.getElementById('lancamentos-tabs-troca')?.classList.toggle('hidden', isFtMode);
    document.getElementById('lancamentos-actions-ft')?.classList.toggle('hidden', !isFtMode);
    document.getElementById('lancamentos-actions-troca')?.classList.toggle('hidden', isFtMode);

    panelDiaria.classList.add('hidden');
    panelTroca.classList.add('hidden');
    panelDashboard.classList.add('hidden');
    panelHistorico.classList.add('hidden');
    panelPlanejamento.classList.add('hidden');
    panelNovo.classList.add('hidden');

    updateLancamentosHeader();
    updateLancamentosTabs();
    renderLancamentosFilters();

    if (!isFtMode && currentLancamentosTab === 'diaria') {
        panelTroca.classList.remove('hidden');
        renderLancamentosTroca();
    } else if (!isFtMode && currentLancamentosTab === 'dashboard') {
        panelDashboard.classList.remove('hidden');
        renderLancamentosTrocaDashboard();
    } else if (!isFtMode && currentLancamentosTab === 'historico') {
        panelHistorico.classList.remove('hidden');
        renderLancamentosTrocaHistorico();
    } else if (!isFtMode && currentLancamentosTab === 'planejamento') {
        panelPlanejamento.classList.remove('hidden');
        renderLancamentosPlanejamento();
    } else if (!isFtMode) {
        currentLancamentosTab = 'diaria';
        panelTroca.classList.remove('hidden');
        renderLancamentosTroca();
    } else if (currentLancamentosTab === 'diaria') {
        panelDiaria.classList.remove('hidden');
        renderLancamentosDiaria();
    } else if (currentLancamentosTab === 'dashboard') {
        panelDashboard.classList.remove('hidden');
        renderLancamentosDashboard();
    } else if (currentLancamentosTab === 'historico') {
        panelHistorico.classList.remove('hidden');
        renderLancamentosHistorico();
    } else if (currentLancamentosTab === 'planejamento') {
        panelPlanejamento.classList.remove('hidden');
        renderLancamentosPlanejamento();
    } else {
        currentLancamentosTab = 'diaria';
        panelDiaria.classList.remove('hidden');
        renderLancamentosDiaria();
    }

}

function cleanFtText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().replace(/;+$/, '').trim();
}

function normalizeFtRe(value) {
    return String(value || '').replace(/\D/g, '');
}

function matchesRe(a, b) {
    const na = normalizeFtRe(a);
    const nb = normalizeFtRe(b);
    if (!na || !nb) return false;
    return na === nb || na.endsWith(nb) || nb.endsWith(na);
}

function getTodayKey() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function normalizeFtStatus(value) {
    const raw = cleanFtText(value).toUpperCase();
    const norm = raw
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    if (norm.includes('LANCAD')) return 'launched';
    if (norm.includes('CONFIRM') || norm.includes('SUBMIT') || norm.includes('FORMS')) return 'submitted';
    if (norm.includes('PEND')) return 'pending';
    return 'pending';
}

function normalizeFtReason(value) {
    const raw = cleanFtText(value);
    const upper = raw.toUpperCase();
    if (!upper) return { code: 'outro', other: '' };
    if (upper.includes('FALTA')) return { code: 'falta', other: '' };
    if (upper.includes('TROCA')) return { code: 'troca', other: '' };
    if (upper.includes('COBERT')) return { code: 'cobertura', other: '' };
    if (upper.includes('EVENT')) return { code: 'evento', other: '' };
    return { code: 'outro', other: raw };
}

function isValidFtDateKeyStrict(value) {
    const parts = parseFtDateParts(value);
    if (!parts) return false;
    const nowYear = new Date().getFullYear();
    if (parts.y < 2020 || parts.y > nowYear + 2) return false;
    const date = new Date(parts.y, parts.m - 1, parts.d);
    return date.getFullYear() === parts.y
        && date.getMonth() === parts.m - 1
        && date.getDate() === parts.d;
}

function classifyTrocaItemErrors(item) {
    if (!item || item.status !== 'launched') return [];
    const errors = [];
    if (!item.ref) errors.push('Sem REF');
    if (!item.unit) errors.push('Sem unidade');
    if (!item.requesterRe) errors.push('Sem RE solicitante 1');
    if (!item.counterpartRe) errors.push('Sem RE solicitante 2');
    if (item.requesterRe && item.counterpartRe && matchesRe(item.requesterRe, item.counterpartRe)) {
        errors.push('RE duplicado');
    }
    if (!item.requestDate || !isValidFtDateKeyStrict(item.requestDateRaw || item.requestDate)) {
        errors.push('Data solicitação inválida');
    }
    if (!item.swapDate || !isValidFtDateKeyStrict(item.swapDateRaw || item.swapDate)) {
        errors.push('Data troca inválida');
    }
    if (!item.paymentDate || !isValidFtDateKeyStrict(item.paymentDateRaw || item.paymentDate)) {
        errors.push('Data pagamento inválida');
    }
    return errors;
}

function dedupeTrocaLaunches(items = []) {
    const byId = new Map();
    items.forEach(item => {
        if (!item?.id) return;
        byId.set(item.id, item);
    });
    return Array.from(byId.values());
}

function buildTrocaDashboardStats(items = trocaLaunches) {
    const launchedItems = (items || []).filter(item => item.status === 'launched');
    const errorItems = launchedItems.filter(item => (item.errors || []).length > 0);
    const byType = {};
    errorItems.forEach(item => {
        (item.errors || []).forEach(err => {
            byType[err] = (byType[err] || 0) + 1;
        });
    });
    const topErrors = Object.entries(byType)
        .sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value }));
    const errorRate = launchedItems.length ? Math.round((errorItems.length / launchedItems.length) * 100) : 0;
    return {
        total: (items || []).length,
        launched: launchedItems.length,
        errors: errorItems.length,
        errorRate,
        topErrors
    };
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
    hint.textContent = 'Integração de confirmação via Supabase será ativada em breve.';
}

function buildFtDashboardStats(items) {
    const pending = items.filter(i => i.status === 'pending').length;
    const submitted = items.filter(i => i.status === 'submitted').length;
    const launched = items.filter(i => i.status === 'launched').length;
    const total = items.length;
    const uniqueDates = new Set(items.map(i => normalizeFtDateKey(i?.date)).filter(Boolean));
    const avgPerDay = uniqueDates.size ? (total / uniqueDates.size) : 0;
    const launchRate = total ? Math.round((launched / total) * 100) : 0;

    const byUnit = {};
    const byPerson = {};
    const byReason = {};
    const byShift = {};
    const byTime = {};
    const byWeekday = {};
    const byGroup = {};
    const pendingByUnit = {};
    let missingUnit = 0;
    let missingRe = 0;
    let missingDate = 0;

    const isShiftTimeLike = (label) => {
        const text = String(label || '').toLowerCase().trim();
        if (!text) return false;
        if (text.includes(':')) return true;
        if (text.includes(' às ') || text.includes(' as ')) return true;
        if (/^\d{1,2}\s*[-–]\s*\d{1,2}$/.test(text)) return true;
        return false;
    };
    items.forEach(i => {
        const unit = i.unitTarget || i.unitCurrent || 'N/I';
        const name = i.collabName || (i.collabRe ? `RE ${i.collabRe}` : 'N/I');
        const reason = getFtReasonLabel(i.reason, i.reasonOther) || 'N/I';
        let shift = i.shift || 'N/I';
        let time = (i.ftTime || '').trim() || 'N/I';
        if (isShiftTimeLike(shift) && time === 'N/I') {
            time = shift;
            shift = 'N/I';
        }
        const weekday = getFtWeekdayLabel(normalizeFtDateKey(i?.date));
        const sourceGroup = String(i.sourceGroup || i.group || 'N/I').toUpperCase();
        byUnit[unit] = (byUnit[unit] || 0) + 1;
        byPerson[name] = (byPerson[name] || 0) + 1;
        byReason[reason] = (byReason[reason] || 0) + 1;
        byShift[shift] = (byShift[shift] || 0) + 1;
        byTime[time] = (byTime[time] || 0) + 1;
        if (weekday) byWeekday[weekday] = (byWeekday[weekday] || 0) + 1;
        byGroup[sourceGroup] = (byGroup[sourceGroup] || 0) + 1;
        if (i.status === 'pending') pendingByUnit[unit] = (pendingByUnit[unit] || 0) + 1;
        if (!i.unitTarget && !i.unitCurrent) missingUnit++;
        if (!i.collabRe) missingRe++;
        if (!i.date) missingDate++;
    });

    const topUnits = Object.entries(byUnit).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([label, value]) => ({ label, value }));
    const topPeople = Object.entries(byPerson).sort((a, b) => b[1] - a[1]).slice(0, 8)
        .map(([label, value]) => ({ label, value }));
    const topReasons = Object.entries(byReason).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([label, value]) => ({ label, value }));
    const topShifts = Object.entries(byShift)
        .filter(([label]) => !isShiftTimeLike(label))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }));
    const topTimes = Object.entries(byTime)
        .filter(([label]) => label && label !== 'N/I')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([label, value]) => ({ label, value }));
    const topGroups = Object.entries(byGroup).sort((a, b) => b[1] - a[1])
        .map(([label, value]) => ({ label, value }));
    const topPendingUnits = Object.entries(pendingByUnit).sort((a, b) => b[1] - a[1]).slice(0, 6)
        .map(([label, value]) => ({ label, value }));
    const weekdayOrder = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
    const weekdayEntries = weekdayOrder
        .map(label => ({ label, value: byWeekday[label] || 0 }))
        .filter(e => e.value > 0);

    const recentPending = items
        .filter(i => i.status === 'pending')
        .sort((a, b) => getFtItemDateValue(b) - getFtItemDateValue(a))
        .slice(0, 6)
        .map(i => ({
            label: `${i.collabName || 'Colaborador'} (${i.collabRe || 'N/I'})`,
            value: formatFtDate(i.date || i.createdAt)
        }));

    const recentLaunched = items
        .filter(i => i.status === 'launched')
        .sort((a, b) => getFtItemDateValue(b) - getFtItemDateValue(a))
        .slice(0, 6)
        .map(i => ({
            label: `${i.collabName || 'Colaborador'} (${i.collabRe || 'N/I'})`,
            value: formatFtDate(i.date || i.createdAt)
        }));

    return {
        pending,
        submitted,
        launched,
        total,
        avgPerDay,
        launchRate,
        topUnits,
        topPeople,
        topReasons,
        topShifts,
        topTimes,
        topGroups,
        topPendingUnits,
        weekdayEntries,
        recentPending,
        recentLaunched,
        missingUnit,
        missingRe,
        missingDate
    };
}

function renderLancamentosDiaria() {
    const panel = document.getElementById('lancamentos-panel-diaria');
    if (!panel) return;
    const today = getTodayKey();
    const todayLabel = formatFtDate(today);
    const allFt = getFtOperationalItems(ftLaunches);
    const ftToday = allFt.filter(item => normalizeFtDateKey(item?.date) === today);
    const ftPending = ftToday.filter(i => i.status === 'pending').length;
    const ftSubmitted = ftToday.filter(i => i.status === 'submitted').length;
    const ftLaunched = ftToday.filter(i => i.status === 'launched').length;
    const next7Limit = toDateInputValue(new Date(Date.parse(`${today}T00:00:00`) + (7 * 86400000)));
    const next7 = allFt
        .filter(item => {
            const key = normalizeFtDateKey(item?.date);
            return !!key && key > today && key <= next7Limit;
        })
        .sort((a, b) => getFtItemDateValue(a) - getFtItemDateValue(b));
    const overdue = allFt
        .filter(item => {
            const key = normalizeFtDateKey(item?.date);
            return item.status === 'pending' && !!key && key < today;
        })
        .sort((a, b) => getFtItemDateValue(a) - getFtItemDateValue(b));
    const qualityIssues = allFt.filter(item => !item?.date || !item?.collabRe || !getFtUnitLabel(item) || getFtUnitLabel(item) === 'N/I');

    const renderFtCompactRow = (item, options = {}) => {
        const tags = [];
        const dateKey = normalizeFtDateKey(item?.date);
        if (options.showDate !== false && dateKey) tags.push(`<span class="diaria-tag">${formatFtDateShort(dateKey)}</span>`);
        if (!item?.collabRe) tags.push('<span class="diaria-tag danger">Sem RE</span>');
        if (!item?.unitTarget && !item?.unitCurrent) tags.push('<span class="diaria-tag danger">Sem unidade</span>');
        if (!item?.date) tags.push('<span class="diaria-tag danger">Sem data</span>');
        return `
            <div class="diaria-item ft ${options.critical ? 'critical' : ''}">
                <div class="diaria-item-top">
                    <strong>${getFtCollabLabel(item)}</strong>
                    <span class="diaria-status status-${item.status}">${getFtStatusLabel(item)}</span>
                </div>
                <div class="diaria-item-meta">
                    <span><strong>Unidade:</strong> ${getFtUnitLabel(item)}</span>
                    <span><strong>Turno:</strong> ${item.shift || 'N/I'} • <strong>Horário:</strong> ${item.ftTime || 'N/I'}</span>
                </div>
                ${tags.length ? `<div class="diaria-item-tags">${tags.join('')}</div>` : ''}
            </div>
        `;
    };

    const ftListHtml = ftToday.length
        ? ftToday.slice(0, 24).map(item => renderFtCompactRow(item, { showDate: false })).join('')
        : `<p class="empty-state">Nenhuma FT registrada para hoje.</p>`;
    const next7Html = next7.length
        ? next7.slice(0, 24).map(item => renderFtCompactRow(item, { showDate: true })).join('')
        : `<p class="empty-state">Sem FT programada para os próximos 7 dias.</p>`;
    const criticalRows = overdue.slice(0, 12)
        .map(item => renderFtCompactRow(item, { showDate: true, critical: true }))
        .concat(qualityIssues.slice(0, 6).map(item => renderFtCompactRow(item, { showDate: true, critical: true })));
    const criticalHtml = criticalRows.length
        ? criticalRows.join('')
        : `<p class="empty-state">Sem pendências críticas no momento.</p>`;

    panel.innerHTML = `
        <div class="lanc-diaria-shell">
            <div class="lanc-diaria-hero">
                <div>
                    <div class="dashboard-title">FOCO DIÁRIO</div>
                    <h4>${todayLabel}</h4>
                    <p>Execução FT baseada somente na base local, com fila crítica e visão de próximos dias.</p>
                </div>
                <div class="lanc-diaria-note">Ações rápidas ficam no topo: Diária FT, Indicadores FT e Histórico FT.</div>
            </div>
            <div class="lanc-diaria-kpi">
                <div class="kpi-card"><div class="kpi-label">FT hoje</div><div class="kpi-value">${ftToday.length}</div><div class="kpi-sub">Operação do dia</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${ftPending}</div><div class="kpi-sub">Aguardando ação</div></div>
                <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-value">${ftSubmitted}</div><div class="kpi-sub">Status confirmado</div></div>
                <div class="kpi-card"><div class="kpi-label">Lançadas</div><div class="kpi-value">${ftLaunched}</div><div class="kpi-sub">Lançadas</div></div>
                <div class="kpi-card"><div class="kpi-label">Próximos 7 dias</div><div class="kpi-value">${next7.length}</div><div class="kpi-sub">Planejamento futuro</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendências críticas</div><div class="kpi-value">${overdue.length + qualityIssues.length}</div><div class="kpi-sub">Atrasos e dados faltantes</div></div>
            </div>
            <div class="lanc-diaria-board">
                <div class="report-card diaria-card">
                    <div class="report-title">FT de hoje</div>
                    <div class="diaria-list">${ftListHtml}</div>
                </div>
                <div class="report-card diaria-card">
                    <div class="report-title">Próximos 7 dias</div>
                    <div class="diaria-list">${next7Html}</div>
                </div>
                <div class="report-card diaria-card">
                    <div class="report-title">Pendências críticas</div>
                    <div class="diaria-list">${criticalHtml}</div>
                </div>
            </div>
        </div>
    `;
}

function getTrocaPrimaryDate(item) {
    if (!item) return '';
    return normalizeFtDateKey(item.swapDate)
        || normalizeFtDateKey(item.requestDate)
        || normalizeFtDateKey(item.paymentDate)
        || normalizeFtDateKey(item.createdAt)
        || '';
}

function renderLancamentosTroca() {
    const panel = document.getElementById('lancamentos-panel-troca');
    if (!panel) return;
    const today = getTodayKey();
    const allItems = trocaLaunches.slice();
    const launchedItems = allItems.filter(item => item.status === 'launched');
    const errorItems = launchedItems.filter(item => (item.errors || []).length > 0);
    const todayItems = allItems.filter(item => getTrocaPrimaryDate(item) === today);
    const sorted = allItems.sort((a, b) => {
        const db = Date.parse(`${getTrocaPrimaryDate(b)}T00:00:00`);
        const da = Date.parse(`${getTrocaPrimaryDate(a)}T00:00:00`);
        return (Number.isFinite(db) ? db : 0) - (Number.isFinite(da) ? da : 0);
    });
    const listHtml = sorted.length
        ? sorted.slice(0, 40).map(item => {
            const errors = item.errors || [];
            const sourceInfo = getFtSourceInfo(item);
            const dateKey = getTrocaPrimaryDate(item);
            const dateLabel = dateKey ? formatFtDate(dateKey) : 'N/I';
            const createdLabel = item.createdAt ? formatFtDateTime(item.createdAt) : 'N/I';
            return `
                <div class="diaria-item troca ${errors.length ? 'has-error' : ''}">
                    <div class="diaria-item-top">
                        <strong>${item.unit || 'Unidade não informada'}</strong>
                        <span class="diaria-status status-${item.status}">${getFtStatusLabel(item)}</span>
                    </div>
                    <div class="diaria-item-meta">
                        <span><strong>REF:</strong> ${item.ref || 'N/I'}</span>
                        <span><strong>Solicitante 1:</strong> ${item.requesterName || 'N/I'} (${item.requesterRe || 'N/I'})</span>
                        <span><strong>Solicitante 2:</strong> ${item.counterpartName || 'N/I'} (${item.counterpartRe || 'N/I'})</span>
                        <span><strong>Data troca:</strong> ${dateLabel}</span>
                        <span><strong>Registro:</strong> ${createdLabel}</span>
                        ${errors.length ? `<span class="troca-errors"><strong>Erros:</strong> ${errors.join(' • ')}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('')
        : `<p class="empty-state">Nenhuma troca sincronizada.</p>`;

    panel.innerHTML = `
        <div class="lanc-diaria-shell">
            <div class="lanc-diaria-hero">
                <div>
                    <div class="dashboard-title">TROCA DE FOLGA</div>
                    <h4>Controle operacional</h4>
                    <p>Painel dedicado de trocas com foco em lançadas e validação de erros.</p>
                </div>
                <div class="lanc-diaria-note">Ações rápidas ficam no topo: Sincronizar trocas, Diária Troca, Indicadores Troca e Histórico Troca.</div>
            </div>
            <div class="lanc-diaria-kpi">
                <div class="kpi-card"><div class="kpi-label">Trocas hoje</div><div class="kpi-value">${todayItems.length}</div><div class="kpi-sub">Data de troca no dia</div></div>
                <div class="kpi-card"><div class="kpi-label">Trocas lançadas</div><div class="kpi-value">${launchedItems.length}</div><div class="kpi-sub">Status lançado</div></div>
                <div class="kpi-card"><div class="kpi-label">Erros (lançadas)</div><div class="kpi-value">${errorItems.length}</div><div class="kpi-sub">Somente lançadas</div></div>
                <div class="kpi-card"><div class="kpi-label">Total sincronizado</div><div class="kpi-value">${allItems.length}</div><div class="kpi-sub">Todas as trocas</div></div>
            </div>
            <div class="report-card diaria-card">
                <div class="report-title">Trocas recentes</div>
                <div class="diaria-list">${listHtml}</div>
            </div>
        </div>
    `;
}

function buildTrocaTopRows(items, valueGetter, limit = 8) {
    const map = {};
    (items || []).forEach(item => {
        const key = String(valueGetter(item) || '').trim() || 'N/I';
        map[key] = (map[key] || 0) + 1;
    });
    return Object.entries(map)
        .sort((a, b) => b[1] - a[1])
        .slice(0, limit)
        .map(([label, value]) => ({ label, value }));
}

function buildTrocaHistorySearchText(item) {
    return normalizeText([
        item?.ref,
        item?.unit,
        item?.requesterName,
        item?.requesterRe,
        item?.counterpartName,
        item?.counterpartRe,
        item?.status,
        item?.statusRaw,
        item?.requestDate,
        item?.swapDate,
        item?.paymentDate,
        (item?.errors || []).join(' ')
    ].filter(Boolean).join(' '));
}

function applyTrocaHistoryFilters(list = trocaLaunches) {
    let items = (list || []).slice();
    if (trocaHistoryFilter.status && trocaHistoryFilter.status !== 'all') {
        items = items.filter(item => (item?.status || '') === trocaHistoryFilter.status);
    }
    const unitFilter = normalizeText(trocaHistoryFilter.unit || '');
    if (unitFilter) {
        items = items.filter(item => normalizeText(item?.unit || '') === unitFilter);
    }
    const term = normalizeText(trocaHistoryFilter.search || '');
    if (term) {
        items = items.filter(item => buildTrocaHistorySearchText(item).includes(term));
    }
    return items;
}

function sortTrocaHistoryItems(items = []) {
    const key = trocaHistoryFilter.sort || 'date_desc';
    const getDateValue = (item) => {
        const primary = getTrocaPrimaryDate(item);
        if (primary) {
            const ts = Date.parse(`${primary}T00:00:00`);
            if (Number.isFinite(ts)) return ts;
        }
        const created = Date.parse(item?.createdAt || item?.requestedAt || '');
        return Number.isFinite(created) ? created : 0;
    };
    const getCreatedValue = (item) => {
        const created = Date.parse(item?.createdAt || item?.requestedAt || '');
        return Number.isFinite(created) ? created : 0;
    };
    return items.slice().sort((a, b) => {
        if (key === 'date_asc') return getDateValue(a) - getDateValue(b);
        if (key === 'created_desc') return getCreatedValue(b) - getCreatedValue(a);
        if (key === 'created_asc') return getCreatedValue(a) - getCreatedValue(b);
        if (key === 'status') return String(a?.status || '').localeCompare(String(b?.status || ''));
        if (key === 'unit') return String(a?.unit || '').localeCompare(String(b?.unit || ''), 'pt-BR');
        return getDateValue(b) - getDateValue(a);
    });
}

function renderLancamentosTrocaDashboard() {
    const panel = document.getElementById('lancamentos-panel-dashboard');
    if (!panel) return;
    const items = trocaLaunches.slice();
    const stats = buildTrocaDashboardStats(items);
    const topUnits = buildTrocaTopRows(items, item => item?.unit || 'N/I', 8);
    const topRequester = buildTrocaTopRows(items, item => item?.requesterName || item?.requesterRe || 'N/I', 8);
    const byWeekday = buildTrocaTopRows(items, item => {
        const key = getTrocaPrimaryDate(item);
        return key ? getFtWeekdayLabel(key) || 'N/I' : 'N/I';
    }, 7);
    const recentErrors = (items || [])
        .filter(item => (item?.errors || []).length > 0)
        .slice()
        .sort((a, b) => {
            const tb = Date.parse(b?.createdAt || b?.requestedAt || '');
            const ta = Date.parse(a?.createdAt || a?.requestedAt || '');
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        })
        .slice(0, 10)
        .map(item => ({
            label: `${item?.unit || 'N/I'} • REF ${item?.ref || 'N/I'}`,
            value: (item?.errors || []).join(' • ')
        }));
    panel.innerHTML = `
        <div class="lancamentos-dashboard-toolbar">
            <div class="dashboard-title">Indicadores de Troca</div>
            <div class="menu-actions-row lancamentos-toolbar-actions">
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardXlsx()">Exportar indicadores</button>
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardCsv()">CSV base</button>
                <button class="btn btn-ghost btn-small" onclick="exportTrocaDashboardPdf()">PDF resumo</button>
            </div>
        </div>
        <div class="lancamentos-kpi">
            <div class="kpi-card"><div class="kpi-label">Total</div><div class="kpi-value">${stats.total}</div><div class="kpi-sub">Trocas sincronizadas</div></div>
            <div class="kpi-card"><div class="kpi-label">Lançadas</div><div class="kpi-value">${stats.launched}</div><div class="kpi-sub">Status lançado</div></div>
            <div class="kpi-card"><div class="kpi-label">Com erro</div><div class="kpi-value">${stats.errors}</div><div class="kpi-sub">Somente lançadas</div></div>
            <div class="kpi-card"><div class="kpi-label">Taxa de erro</div><div class="kpi-value">${stats.errorRate}%</div><div class="kpi-sub">Erros ÷ lançadas</div></div>
        </div>
        <div class="lancamentos-report-grid">
            <div class="report-card">
                <div class="report-title">Por Unidade</div>
                <div class="report-list">${buildReportRows(topUnits)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Solicitante</div>
                <div class="report-list">${buildReportRows(topRequester)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Dia da Semana</div>
                <div class="report-list">${buildReportRows(byWeekday)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Tipos de Erro</div>
                <div class="report-list">${buildReportRows(stats.topErrors)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Erros Recentes</div>
                <div class="report-list">${buildRecentRows(recentErrors, 'Sem erros recentes.')}</div>
            </div>
        </div>
    `;
}

function renderLancamentosTrocaHistorico() {
    const panel = document.getElementById('lancamentos-panel-historico');
    if (!panel) return;
    const base = trocaLaunches.slice();
    if (!base.length) {
        panel.innerHTML = `<p class="empty-state">Nenhuma troca registrada.</p>`;
        return;
    }
    const filtered = applyTrocaHistoryFilters(base);
    const sorted = sortTrocaHistoryItems(filtered);
    const total = filtered.length;
    const pending = filtered.filter(i => i.status === 'pending').length;
    const submitted = filtered.filter(i => i.status === 'submitted').length;
    const launched = filtered.filter(i => i.status === 'launched').length;
    const withError = filtered.filter(i => (i.errors || []).length > 0).length;
    const units = Array.from(new Set(base.map(i => i?.unit).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const cards = sorted.length
        ? sorted.slice(0, 120).map(item => {
            const dateKey = getTrocaPrimaryDate(item);
            const dateLabel = dateKey ? formatFtDate(dateKey) : 'N/I';
            const createdLabel = item.createdAt ? formatFtDateTime(item.createdAt) : (item.requestedAt ? formatFtDateTime(item.requestedAt) : 'N/I');
            const sourceInfo = getFtSourceInfo(item);
            const errors = item.errors || [];
            return `
                <div class="lancamento-card ${errors.length ? 'is-pending' : ''}">
                    <div class="lancamento-main">
                        <div class="lancamento-meta">
                            <span class="lancamento-date"><strong>Data troca</strong> ${dateLabel}</span>
                            <span class="lancamento-status status-${item.status}">${getFtStatusLabel(item)}</span>
                            <span class="lancamento-source ${sourceInfo.className}">${sourceInfo.label}</span>
                        </div>
                        <div class="lancamento-title">${item.unit || 'Unidade não informada'}</div>
                        <div class="lancamento-summary">
                            <span><strong>REF:</strong> ${item.ref || 'N/I'}</span>
                            <span><strong>Solicitante 1:</strong> ${item.requesterName || 'N/I'} (${item.requesterRe || 'N/I'})</span>
                            <span><strong>Solicitante 2:</strong> ${item.counterpartName || 'N/I'} (${item.counterpartRe || 'N/I'})</span>
                            <span><strong>Registro:</strong> ${createdLabel}</span>
                        </div>
                        ${errors.length ? `<div class="troca-errors"><strong>Erros:</strong> ${errors.join(' • ')}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('')
        : '<p class="empty-state">Nenhuma troca para os filtros selecionados.</p>';

    panel.innerHTML = `
        <div class="lancamentos-summary-line">Resultados: <strong>${total}</strong> registros</div>
        <div class="lancamentos-cards">
            <div class="lanc-card"><div class="label">Total</div><div class="value">${total}</div></div>
            <div class="lanc-card"><div class="label">Pendentes</div><div class="value">${pending}</div></div>
            <div class="lanc-card"><div class="label">Confirmadas</div><div class="value">${submitted}</div></div>
            <div class="lanc-card"><div class="label">Lançadas</div><div class="value">${launched}</div></div>
            <div class="lanc-card"><div class="label">Com erro</div><div class="value">${withError}</div></div>
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
                    ${units.map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Status</label>
                <select id="troca-history-status">
                    <option value="all">Todos</option>
                    <option value="pending">Pendentes</option>
                    <option value="submitted">Confirmadas</option>
                    <option value="launched">Lançadas</option>
                </select>
            </div>
            <div class="form-group">
                <label>Ordenar por</label>
                <select id="troca-history-sort">
                    <option value="date_desc">Data da troca (recente)</option>
                    <option value="date_asc">Data da troca (antiga)</option>
                    <option value="created_desc">Data de criação (recente)</option>
                    <option value="created_asc">Data de criação (antiga)</option>
                    <option value="status">Status</option>
                    <option value="unit">Unidade</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-history-actions">
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistorico()">Exportar histórico</button>
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistoricoCsv()">CSV filtrado</button>
            <button class="btn btn-secondary btn-small" onclick="exportTrocaHistoricoPdf()">PDF resumo</button>
        </div>
        ${cards}
    `;

    const searchInput = document.getElementById('troca-history-search');
    if (searchInput) {
        searchInput.value = trocaHistoryFilter.search || '';
        searchInput.addEventListener('input', (e) => {
            trocaHistoryFilter.search = e.target.value || '';
            renderLancamentosTrocaHistorico();
        });
    }
    const unitSelect = document.getElementById('troca-history-unit');
    if (unitSelect) {
        unitSelect.value = trocaHistoryFilter.unit || '';
        unitSelect.addEventListener('change', (e) => {
            trocaHistoryFilter.unit = e.target.value || '';
            renderLancamentosTrocaHistorico();
        });
    }
    const statusSelect = document.getElementById('troca-history-status');
    if (statusSelect) {
        statusSelect.value = trocaHistoryFilter.status || 'all';
        statusSelect.addEventListener('change', (e) => {
            trocaHistoryFilter.status = e.target.value || 'all';
            renderLancamentosTrocaHistorico();
        });
    }
    const sortSelect = document.getElementById('troca-history-sort');
    if (sortSelect) {
        sortSelect.value = trocaHistoryFilter.sort || 'date_desc';
        sortSelect.addEventListener('change', (e) => {
            trocaHistoryFilter.sort = e.target.value || 'date_desc';
            renderLancamentosTrocaHistorico();
        });
    }
}

function renderLancamentosDashboard() {
    const panel = document.getElementById('lancamentos-panel-dashboard');
    if (!panel) return;

    const items = applyFtFilters(ftLaunches);
    const stats = buildFtDashboardStats(items);
    const gidStatus = getMonthlyGidChecklistStatus(new Date());
    const gidMissing = [];
    if (!gidStatus.ftOk) gidMissing.push('FT');
    const gidReminderHtml = gidMissing.length
        ? `<div class="lancamentos-gid-alert">Lembrete ${gidStatus.monthLabel}: faltando cadastrar GID mensal de FT (config.js).</div>`
        : '';
    const {
        pending,
        submitted,
        launched,
        total,
        avgPerDay,
        launchRate,
        topUnits,
        topPeople,
        topReasons,
        topShifts,
        topTimes,
        topGroups,
        topPendingUnits,
        weekdayEntries,
        recentPending,
        recentLaunched,
        missingUnit,
        missingRe,
        missingDate
    } = stats;

    panel.innerHTML = `
        <div class="lancamentos-dashboard-toolbar">
            <div class="dashboard-title">Visão executiva</div>
            <div class="menu-actions-row lancamentos-toolbar-actions">
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboard()">Exportar dashboard</button>
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboardCsv()">CSV base</button>
                <button class="btn btn-ghost btn-small" onclick="exportFtDashboardPdf()">PDF resumo</button>
            </div>
        </div>
        ${gidReminderHtml}
        <div class="lancamentos-kpi">
            <div class="kpi-card">
                <div class="kpi-label">Pendentes</div>
                <div class="kpi-value">${pending}</div>
                <div class="kpi-sub">Aguardando lançamento</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Confirmadas</div>
                <div class="kpi-value">${submitted}</div>
                <div class="kpi-sub">Status confirmado</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Lançadas</div>
                <div class="kpi-value">${launched}</div>
                <div class="kpi-sub">LANÇADO</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Total filtrado</div>
                <div class="kpi-value">${total}</div>
                <div class="kpi-sub">No período</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Taxa de lançamento</div>
                <div class="kpi-value">${launchRate}%</div>
                <div class="kpi-sub">Lançadas ÷ Total</div>
            </div>
            <div class="kpi-card">
                <div class="kpi-label">Média por dia</div>
                <div class="kpi-value">${avgPerDay ? avgPerDay.toFixed(1) : '0.0'}</div>
                <div class="kpi-sub">Dias com FT</div>
            </div>
        </div>
        <div class="lancamentos-report-grid">
            <div class="report-card">
                <div class="report-title">Por Unidade (Top 8)</div>
                <div class="report-list">${buildReportRows(topUnits)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Colaborador (Top 8)</div>
                <div class="report-list">${buildReportRows(topPeople)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Motivo</div>
                <div class="report-list">${buildReportRows(topReasons)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Turno</div>
                <div class="report-list">${buildReportRows(topShifts)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Horário</div>
                <div class="report-list">${buildReportRows(topTimes)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Dia da Semana</div>
                <div class="report-list">${buildReportRows(weekdayEntries)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Por Grupo</div>
                <div class="report-list">${buildReportRows(topGroups)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Pendências por Unidade</div>
                <div class="report-list">${buildReportRows(topPendingUnits)}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Pendências Recentes</div>
                <div class="report-list">${buildRecentRows(recentPending, 'Sem pendências no período.')}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Lançadas Recentes</div>
                <div class="report-list">${buildRecentRows(recentLaunched, 'Sem lançamentos no período.')}</div>
            </div>
            <div class="report-card">
                <div class="report-title">Qualidade dos Dados</div>
                <div class="report-list">${buildReportRows([
                    { label: 'Sem unidade', value: missingUnit },
                    { label: 'Sem RE', value: missingRe },
                    { label: 'Sem data', value: missingDate }
                ].filter(e => e.value > 0))}</div>
            </div>
        </div>
    `;
}

function getMonthlyGidChecklistStatus(dateValue) {
    const refDate = dateValue instanceof Date ? dateValue : new Date();
    const monthLabel = refDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    return {
        monthLabel,
        ftOk: true,
        trocaOk: true
    };
}

function exportFtDashboard() {
    const items = applyFtFilters(ftLaunches);
    if (!items.length) {
        showToast("Nenhum dado de FT para exportar.", "info");
        return;
    }
    const stats = buildFtDashboardStats(items);
    const toRows = (list) => list.map(i => ({ "Item": i.label, "Quantidade": i.value }));
    const resumo = [
        { "Indicador": "Pendentes", "Valor": stats.pending },
        { "Indicador": "Confirmadas", "Valor": stats.submitted },
        { "Indicador": "Lançadas", "Valor": stats.launched },
        { "Indicador": "Total filtrado", "Valor": stats.total },
        { "Indicador": "Taxa de lançamento (%)", "Valor": stats.launchRate },
        { "Indicador": "Média por dia", "Valor": stats.avgPerDay ? Number(stats.avgPerDay.toFixed(2)) : 0 }
    ];
    const qualidade = [
        { "Indicador": "Sem unidade", "Valor": stats.missingUnit },
        { "Indicador": "Sem RE", "Valor": stats.missingRe },
        { "Indicador": "Sem data", "Valor": stats.missingDate }
    ];
    const base = items.map(i => ({
        "Status": i.status,
        "Data": i.date || '',
        "Solicitada em": i.requestedAt ? formatFtDateTime(i.requestedAt) : '',
        "Colaborador": i.collabName || '',
        "RE": i.collabRe || '',
        "Unidade": i.unitTarget || i.unitCurrent || '',
        "Turno": i.shift || '',
        "Horário": i.ftTime || '',
        "Motivo": getFtReasonLabel(i.reason, i.reasonOther) || i.reasonRaw || '',
        "Detalhe": i.reasonDetail || '',
        "Cobrindo": i.coveringOther || (i.coveringName ? `${i.coveringName} (${i.coveringRe})` : (i.coveringRe || '')),
        "Origem": getFtSourceInfo(i).label,
        "Grupo": i.group || i.sourceGroup || ''
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topUnits)), "Por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topPeople)), "Por Colaborador");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topReasons)), "Por Motivo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topShifts)), "Por Turno");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topTimes)), "Por Horario");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.weekdayEntries)), "Por Dia Semana");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topGroups)), "Por Grupo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.topPendingUnits)), "Pendências Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.recentPending)), "Pendências Recentes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(stats.recentLaunched)), "Lançadas Recentes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(qualidade), "Qualidade Dados");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(base), "Base FT");

    const tag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ft_dashboard_${tag}.xlsx`);
    showToast("Relatórios de FT exportados.", "success");
}

function exportFtHistorico() {
    const items = sortFtHistoryItems(applyFtHistoryFilters(ftLaunches));
    if (!items.length) {
        showToast("Nenhum lançamento de FT para exportar.", "info");
        return;
    }
    const rows = items.map(i => {
        const coveringText = i.coveringOther
            ? (i.coveringRe ? `${i.coveringOther} (RE ${i.coveringRe})` : i.coveringOther)
            : (i.coveringName ? `${i.coveringName} (${i.coveringRe || 'N/I'})` : (i.coveringRe ? `RE ${i.coveringRe}` : ''));
        return {
            "Status": getFtStatusLabel(i),
            "Data FT": i.date || '',
            "Solicitada em": i.requestedAt ? formatFtDateTime(i.requestedAt) : '',
            "Criada em": i.createdAt ? formatFtDateTime(i.createdAt) : '',
            "Colaborador": i.collabName || '',
            "RE": i.collabRe || '',
            "Unidade": getFtUnitLabel(i),
            "Turno": i.shift || '',
            "Horário": i.ftTime || '',
            "Motivo": getFtReasonLabel(i.reason, i.reasonOther) || i.reasonRaw || '',
            "Detalhe": i.reasonDetail || '',
            "Cobrindo": coveringText,
            "Observações": i.notes || '',
            "Origem": getFtSourceInfo(i).label,
            "Grupo": i.group || i.sourceGroup || '',
            "Responsável": i.createdBy || ''
        };
    });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Historico FT");
    const tag = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `ft_historico_${tag}.xlsx`);
    showToast("Histórico de FT exportado.", "success");
}

function buildExportDateTag() {
    return new Date().toISOString().slice(0, 10);
}

function downloadBlobFile(blob, filename) {
    const link = document.createElement('a');
    const href = URL.createObjectURL(blob);
    link.href = href;
    link.download = filename;
    link.click();
    setTimeout(() => URL.revokeObjectURL(href), 2000);
}

function buildCsvFromRows(rows, columns = []) {
    if (!Array.isArray(rows) || !rows.length) return '';
    const resolvedColumns = columns.length ? columns : Object.keys(rows[0]);
    const escapeCell = (value) => {
        const text = String(value ?? '');
        if (/[";\n\r,]/.test(text)) {
            return `"${text.replace(/"/g, '""')}"`;
        }
        return text;
    };
    const lines = [];
    lines.push(resolvedColumns.map(escapeCell).join(';'));
    rows.forEach((row) => {
        lines.push(resolvedColumns.map(col => escapeCell(row[col])).join(';'));
    });
    return `\uFEFF${lines.join('\n')}`;
}

function exportRowsAsCsv(rows, filename, emptyMessage = "Sem dados para exportar.") {
    if (!Array.isArray(rows) || !rows.length) {
        showToast(emptyMessage, "info");
        return false;
    }
    const csv = buildCsvFromRows(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    downloadBlobFile(blob, filename);
    return true;
}

function createPdfContext(title, subtitleLines = []) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
        showToast("Biblioteca de PDF não carregada.", "error");
        return null;
    }
    const doc = new window.jspdf.jsPDF();
    const margin = 14;
    const pageHeight = doc.internal.pageSize.getHeight();
    const maxWidth = doc.internal.pageSize.getWidth() - (margin * 2);
    let y = margin;

    const ensureSpace = (lineCount = 1) => {
        if (y + (lineCount * 5) > pageHeight - margin) {
            doc.addPage();
            y = margin;
        }
    };

    const addWrapped = (text, size = 10, weight = 'normal') => {
        const value = String(text ?? '').trim();
        if (!value) return;
        doc.setFont('helvetica', weight);
        doc.setFontSize(size);
        const lines = doc.splitTextToSize(value, maxWidth);
        lines.forEach((line) => {
            ensureSpace(1);
            doc.text(line, margin, y);
            y += 5;
        });
    };

    addWrapped(title, 14, 'bold');
    subtitleLines.forEach(line => addWrapped(line, 10, 'normal'));
    y += 2;

    return {
        doc,
        heading(label) {
            y += 1;
            addWrapped(label, 11, 'bold');
        },
        line(text) {
            addWrapped(text, 10, 'normal');
        },
        bullet(text) {
            addWrapped(`- ${text}`, 10, 'normal');
        },
        spacer(size = 2) {
            y += size;
            ensureSpace(1);
        }
    };
}

function getFtCoveringText(item) {
    if (!item) return '';
    if (item.coveringOther) {
        return item.coveringRe ? `${item.coveringOther} (RE ${item.coveringRe})` : item.coveringOther;
    }
    if (item.coveringName) {
        return `${item.coveringName} (${item.coveringRe || 'N/I'})`;
    }
    if (item.coveringRe) return `RE ${item.coveringRe}`;
    return '';
}

function buildFtDashboardBaseRows(items = []) {
    return (items || []).map(i => ({
        "Status": getFtStatusLabel(i),
        "Data FT": i.date ? formatFtDate(i.date) : '',
        "Solicitada em": i.requestedAt ? formatFtDateTime(i.requestedAt) : '',
        "Colaborador": i.collabName || '',
        "RE": i.collabRe || '',
        "Unidade": getFtUnitLabel(i),
        "Turno": i.shift || '',
        "Horário": i.ftTime || '',
        "Motivo": getFtReasonLabel(i.reason, i.reasonOther) || i.reasonRaw || '',
        "Detalhe": i.reasonDetail || '',
        "Cobrindo": getFtCoveringText(i),
        "Origem": getFtSourceInfo(i).label,
        "Grupo": i.group || i.sourceGroup || ''
    }));
}

function buildFtHistoricoRows(items = []) {
    return (items || []).map(i => ({
        "Status": getFtStatusLabel(i),
        "Data FT": i.date ? formatFtDate(i.date) : '',
        "Solicitada em": i.requestedAt ? formatFtDateTime(i.requestedAt) : '',
        "Criada em": i.createdAt ? formatFtDateTime(i.createdAt) : '',
        "Colaborador": i.collabName || '',
        "RE": i.collabRe || '',
        "Unidade": getFtUnitLabel(i),
        "Turno": i.shift || '',
        "Horário": i.ftTime || '',
        "Motivo": getFtReasonLabel(i.reason, i.reasonOther) || i.reasonRaw || '',
        "Detalhe": i.reasonDetail || '',
        "Cobrindo": getFtCoveringText(i),
        "Observações": i.notes || '',
        "Origem": getFtSourceInfo(i).label,
        "Grupo": i.group || i.sourceGroup || '',
        "Responsável": i.createdBy || ''
    }));
}

function buildTrocaRows(items = []) {
    return (items || []).map(item => {
        const dateKey = getTrocaPrimaryDate(item);
        return {
            "Status": getFtStatusLabel(item),
            "Status bruto": item.statusRaw || '',
            "REF": item.ref || '',
            "Unidade": item.unit || '',
            "Solicitante 1": item.requesterName || '',
            "RE solicitante 1": item.requesterRe || '',
            "Solicitante 2": item.counterpartName || '',
            "RE solicitante 2": item.counterpartRe || '',
            "Data principal": dateKey ? formatFtDate(dateKey) : '',
            "Data solicitação": item.requestDate ? formatFtDate(item.requestDate) : (item.requestDateRaw || ''),
            "Data troca": item.swapDate ? formatFtDate(item.swapDate) : (item.swapDateRaw || ''),
            "Data pagamento": item.paymentDate ? formatFtDate(item.paymentDate) : (item.paymentDateRaw || ''),
            "Registro": item.createdAt ? formatFtDateTime(item.createdAt) : (item.requestedAt ? formatFtDateTime(item.requestedAt) : ''),
            "Erros": (item.errors || []).join(' | '),
            "Origem": getFtSourceInfo(item).label,
            "Grupo": item.sourceGroup || ''
        };
    });
}

function buildTrocaDashboardContext(items = trocaLaunches.slice()) {
    const stats = buildTrocaDashboardStats(items);
    const topUnits = buildTrocaTopRows(items, item => item?.unit || 'N/I', 8);
    const topRequester = buildTrocaTopRows(items, item => item?.requesterName || item?.requesterRe || 'N/I', 8);
    const byWeekday = buildTrocaTopRows(items, item => {
        const key = getTrocaPrimaryDate(item);
        return key ? getFtWeekdayLabel(key) || 'N/I' : 'N/I';
    }, 7);
    const recentErrors = (items || [])
        .filter(item => (item?.errors || []).length > 0)
        .slice()
        .sort((a, b) => {
            const tb = Date.parse(b?.createdAt || b?.requestedAt || '');
            const ta = Date.parse(a?.createdAt || a?.requestedAt || '');
            return (Number.isFinite(tb) ? tb : 0) - (Number.isFinite(ta) ? ta : 0);
        })
        .slice(0, 10)
        .map(item => ({
            label: `${item?.unit || 'N/I'} • REF ${item?.ref || 'N/I'}`,
            value: (item?.errors || []).join(' • ')
        }));
    return { stats, topUnits, topRequester, byWeekday, recentErrors };
}

function exportFtDashboardCsv() {
    const items = applyFtFilters(ftLaunches);
    const rows = buildFtDashboardBaseRows(items);
    const tag = buildExportDateTag();
    const ok = exportRowsAsCsv(rows, `ft_dashboard_base_${tag}.csv`, "Nenhum dado de FT para exportar.");
    if (ok) showToast("CSV de FT exportado.", "success");
}

function exportFtDashboardPdf() {
    const items = applyFtFilters(ftLaunches);
    if (!items.length) {
        showToast("Nenhum dado de FT para exportar.", "info");
        return;
    }
    const stats = buildFtDashboardStats(items);
    const ctx = createPdfContext("FT - Resumo Executivo", [
        `Gerado em: ${new Date().toLocaleString()}`,
        `Registros filtrados: ${items.length}`
    ]);
    if (!ctx) return;

    ctx.heading("Indicadores");
    ctx.bullet(`Pendentes: ${stats.pending}`);
    ctx.bullet(`Confirmadas: ${stats.submitted}`);
    ctx.bullet(`Lançadas: ${stats.launched}`);
    ctx.bullet(`Taxa de lançamento: ${stats.launchRate}%`);
    ctx.bullet(`Média por dia: ${stats.avgPerDay ? stats.avgPerDay.toFixed(1) : '0.0'}`);

    ctx.heading("Top Unidades");
    if (stats.topUnits.length) {
        stats.topUnits.slice(0, 10).forEach(row => ctx.bullet(`${row.label}: ${row.value}`));
    } else {
        ctx.line("Sem dados.");
    }

    ctx.heading("Top Colaboradores");
    if (stats.topPeople.length) {
        stats.topPeople.slice(0, 10).forEach(row => ctx.bullet(`${row.label}: ${row.value}`));
    } else {
        ctx.line("Sem dados.");
    }

    ctx.heading("Filtros Ativos");
    ctx.bullet(`Período FT: ${ftFilter.from ? formatFtDate(ftFilter.from) : 'início livre'} até ${ftFilter.to ? formatFtDate(ftFilter.to) : 'fim livre'}`);
    ctx.bullet(`Status: ${ftFilter.status === 'all' ? 'Todos' : ftFilter.status}`);

    const tag = buildExportDateTag();
    ctx.doc.save(`ft_dashboard_${tag}.pdf`);
    showToast("PDF de FT exportado.", "success");
}

function exportFtHistoricoCsv() {
    const items = sortFtHistoryItems(applyFtHistoryFilters(ftLaunches));
    const rows = buildFtHistoricoRows(items);
    const tag = buildExportDateTag();
    const ok = exportRowsAsCsv(rows, `ft_historico_${tag}.csv`, "Nenhum lançamento de FT para exportar.");
    if (ok) showToast("CSV do histórico FT exportado.", "success");
}

function exportFtHistoricoPdf() {
    const items = sortFtHistoryItems(applyFtHistoryFilters(ftLaunches));
    if (!items.length) {
        showToast("Nenhum lançamento de FT para exportar.", "info");
        return;
    }
    const ctx = createPdfContext("FT - Histórico Filtrado", [
        `Gerado em: ${new Date().toLocaleString()}`,
        `Registros: ${items.length}`
    ]);
    if (!ctx) return;

    const pending = items.filter(i => i.status === 'pending').length;
    const submitted = items.filter(i => i.status === 'submitted').length;
    const launched = items.filter(i => i.status === 'launched').length;

    ctx.heading("Resumo");
    ctx.bullet(`Pendentes: ${pending}`);
    ctx.bullet(`Confirmadas: ${submitted}`);
    ctx.bullet(`Lançadas: ${launched}`);

    ctx.heading("Filtros");
    ctx.bullet(`Busca: ${ftHistoryFilter.search || 'vazia'}`);
    ctx.bullet(`Unidade: ${ftHistoryFilter.unit || 'todas'}`);
    ctx.bullet(`Colaborador: ${ftHistoryFilter.collab || 'todos'}`);
    ctx.bullet(`Ordenação: ${ftHistoryFilter.sort || 'date_desc'}`);
    ctx.bullet(`Agrupamento por dia: ${ftHistoryFilter.grouped ? 'ativo' : 'inativo'}`);

    ctx.heading("Registros (até 30)");
    items.slice(0, 30).forEach(item => {
        const date = item.date ? formatFtDate(item.date) : 'Sem data';
        ctx.bullet(`${date} • ${getFtStatusLabel(item)} • ${getFtCollabLabel(item)} • ${getFtUnitLabel(item)}`);
    });

    const tag = buildExportDateTag();
    ctx.doc.save(`ft_historico_${tag}.pdf`);
    showToast("PDF do histórico FT exportado.", "success");
}

function exportTrocaDashboardXlsx() {
    const items = trocaLaunches.slice();
    if (!items.length) {
        showToast("Nenhuma troca para exportar.", "info");
        return;
    }
    const context = buildTrocaDashboardContext(items);
    const toRows = (list) => (list || []).map(i => ({ "Item": i.label, "Quantidade": i.value }));
    const resumo = [
        { "Indicador": "Total", "Valor": context.stats.total },
        { "Indicador": "Lançadas", "Valor": context.stats.launched },
        { "Indicador": "Com erro", "Valor": context.stats.errors },
        { "Indicador": "Taxa de erro (%)", "Valor": context.stats.errorRate }
    ];
    const filtros = [
        { "Filtro": "Base", "Valor": "Trocas sincronizadas (todas)" },
        { "Filtro": "Status no histórico", "Valor": trocaHistoryFilter.status || 'all' },
        { "Filtro": "Busca no histórico", "Valor": trocaHistoryFilter.search || '' }
    ];
    const recentErrorRows = context.recentErrors.map(i => ({ "Item": i.label, "Detalhe": i.value }));
    const baseRows = buildTrocaRows(items);

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(resumo), "Resumo");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(context.topUnits)), "Por Unidade");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(context.topRequester)), "Por Solicitante");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(context.byWeekday)), "Por Dia Semana");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(toRows(context.stats.topErrors)), "Tipos Erro");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recentErrorRows), "Erros Recentes");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtros), "Filtros");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(baseRows), "Base Troca");

    const tag = buildExportDateTag();
    XLSX.writeFile(wb, `troca_dashboard_${tag}.xlsx`);
    showToast("Indicadores de troca exportados.", "success");
}

function exportTrocaDashboardCsv() {
    const rows = buildTrocaRows(trocaLaunches.slice());
    const tag = buildExportDateTag();
    const ok = exportRowsAsCsv(rows, `troca_dashboard_base_${tag}.csv`, "Nenhuma troca para exportar.");
    if (ok) showToast("CSV de troca exportado.", "success");
}

function exportTrocaDashboardPdf() {
    const items = trocaLaunches.slice();
    if (!items.length) {
        showToast("Nenhuma troca para exportar.", "info");
        return;
    }
    const context = buildTrocaDashboardContext(items);
    const ctx = createPdfContext("Troca de Folga - Resumo Executivo", [
        `Gerado em: ${new Date().toLocaleString()}`,
        `Trocas sincronizadas: ${items.length}`
    ]);
    if (!ctx) return;

    ctx.heading("Indicadores");
    ctx.bullet(`Total: ${context.stats.total}`);
    ctx.bullet(`Lançadas: ${context.stats.launched}`);
    ctx.bullet(`Com erro: ${context.stats.errors}`);
    ctx.bullet(`Taxa de erro: ${context.stats.errorRate}%`);

    ctx.heading("Top Unidades");
    if (context.topUnits.length) {
        context.topUnits.slice(0, 10).forEach(row => ctx.bullet(`${row.label}: ${row.value}`));
    } else {
        ctx.line("Sem dados.");
    }

    ctx.heading("Tipos de Erro");
    if (context.stats.topErrors.length) {
        context.stats.topErrors.slice(0, 10).forEach(row => ctx.bullet(`${row.label}: ${row.value}`));
    } else {
        ctx.line("Sem erros lançados.");
    }

    ctx.heading("Erros Recentes");
    if (context.recentErrors.length) {
        context.recentErrors.slice(0, 10).forEach(row => ctx.bullet(`${row.label} • ${row.value}`));
    } else {
        ctx.line("Sem erros recentes.");
    }

    const tag = buildExportDateTag();
    ctx.doc.save(`troca_dashboard_${tag}.pdf`);
    showToast("PDF de troca exportado.", "success");
}

function exportTrocaHistorico() {
    const items = sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches));
    if (!items.length) {
        showToast("Nenhuma troca para exportar.", "info");
        return;
    }
    const rows = buildTrocaRows(items);
    const filtros = [
        { "Filtro": "Busca", "Valor": trocaHistoryFilter.search || '' },
        { "Filtro": "Unidade", "Valor": trocaHistoryFilter.unit || 'Todas' },
        { "Filtro": "Status", "Valor": trocaHistoryFilter.status || 'all' },
        { "Filtro": "Ordenação", "Valor": trocaHistoryFilter.sort || 'date_desc' }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filtros), "Filtros");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Historico Troca");
    const tag = buildExportDateTag();
    XLSX.writeFile(wb, `troca_historico_${tag}.xlsx`);
    showToast("Histórico de troca exportado.", "success");
}

function exportTrocaHistoricoCsv() {
    const items = sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches));
    const rows = buildTrocaRows(items);
    const tag = buildExportDateTag();
    const ok = exportRowsAsCsv(rows, `troca_historico_${tag}.csv`, "Nenhuma troca para exportar.");
    if (ok) showToast("CSV do histórico de troca exportado.", "success");
}

function exportTrocaHistoricoPdf() {
    const items = sortTrocaHistoryItems(applyTrocaHistoryFilters(trocaLaunches));
    if (!items.length) {
        showToast("Nenhuma troca para exportar.", "info");
        return;
    }
    const pending = items.filter(i => i.status === 'pending').length;
    const submitted = items.filter(i => i.status === 'submitted').length;
    const launched = items.filter(i => i.status === 'launched').length;
    const withError = items.filter(i => (i.errors || []).length > 0).length;
    const ctx = createPdfContext("Troca de Folga - Histórico Filtrado", [
        `Gerado em: ${new Date().toLocaleString()}`,
        `Registros: ${items.length}`
    ]);
    if (!ctx) return;

    ctx.heading("Resumo");
    ctx.bullet(`Pendentes: ${pending}`);
    ctx.bullet(`Confirmadas: ${submitted}`);
    ctx.bullet(`Lançadas: ${launched}`);
    ctx.bullet(`Com erro: ${withError}`);

    ctx.heading("Filtros");
    ctx.bullet(`Busca: ${trocaHistoryFilter.search || 'vazia'}`);
    ctx.bullet(`Unidade: ${trocaHistoryFilter.unit || 'todas'}`);
    ctx.bullet(`Status: ${trocaHistoryFilter.status || 'all'}`);
    ctx.bullet(`Ordenação: ${trocaHistoryFilter.sort || 'date_desc'}`);

    ctx.heading("Registros (até 30)");
    items.slice(0, 30).forEach(item => {
        const dateKey = getTrocaPrimaryDate(item);
        const date = dateKey ? formatFtDate(dateKey) : 'Sem data';
        const unit = item.unit || 'N/I';
        const ref = item.ref || 'N/I';
        ctx.bullet(`${date} • ${getFtStatusLabel(item)} • ${unit} • REF ${ref}`);
    });

    const tag = buildExportDateTag();
    ctx.doc.save(`troca_historico_${tag}.pdf`);
    showToast("PDF do histórico de troca exportado.", "success");
}

function renderLancamentosHistorico() {
    const panel = document.getElementById('lancamentos-panel-historico');
    if (!panel) return;
    const operationalItems = getFtOperationalItems(ftLaunches);
    if (!operationalItems.length) {
        panel.innerHTML = `<p class="empty-state">Nenhum lançamento registrado.</p>`;
        return;
    }
    const baseItems = applyFtFilters(ftLaunches);
    const filtered = applyFtHistoryFilters(ftLaunches);
    const sorted = sortFtHistoryItems(filtered);
    const groups = ftHistoryFilter.grouped ? buildFtHistoryGroups(sorted) : [{ key: 'all', label: '', items: sorted }];

    const total = filtered.length;
    const pending = filtered.filter(i => i.status === 'pending').length;
    const submitted = filtered.filter(i => i.status === 'submitted').length;
    const launched = filtered.filter(i => i.status === 'launched').length;

    const unitSet = new Set();
    baseItems.forEach(i => {
        const label = getFtUnitLabel(i);
        if (label && label !== 'N/I') unitSet.add(label);
    });
    const unitOptions = Array.from(unitSet).sort((a, b) => a.localeCompare(b));
    if (ftHistoryFilter.unit && !unitSet.has(ftHistoryFilter.unit)) {
        unitOptions.unshift(ftHistoryFilter.unit);
    }
    const collabMap = new Map();
    baseItems.forEach(i => {
        const key = (i.collabRe || i.collabName || '').trim();
        if (!key) return;
        if (!collabMap.has(key)) collabMap.set(key, getFtCollabLabel(i));
    });
    const collabOptions = Array.from(collabMap.entries())
        .map(([value, label]) => ({ value, label }))
        .sort((a, b) => a.label.localeCompare(b.label));
    if (ftHistoryFilter.collab && !collabMap.has(ftHistoryFilter.collab)) {
        collabOptions.unshift({ value: ftHistoryFilter.collab, label: ftHistoryFilter.collab });
    }

    const summaryCards = `
        <div class="lancamentos-cards">
            <div class="lanc-card"><div class="label">Total</div><div class="value">${total}</div></div>
            <div class="lanc-card"><div class="label">Pendentes</div><div class="value">${pending}</div></div>
            <div class="lanc-card"><div class="label">Confirmadas</div><div class="value">${submitted}</div></div>
            <div class="lanc-card"><div class="label">Lançadas</div><div class="value">${launched}</div></div>
        </div>
    `;

    const buildCards = (items) => items.map(item => {
        const statusText = getFtStatusLabel(item);
        const canLaunch = item.status === 'submitted' && isAdminRole();
        const launched = item.status === 'launched';
        const launchLabel = launched ? 'Lançado' : 'Marcar como lançado';
        const launchClass = launched ? 'btn-ok' : 'btn-secondary';
        const launchOnClick = `onclick="markFtLaunched('${item.id}')"`; 
        const launchDisabled = canLaunch ? '' : 'disabled';
        const requestedAt = item.requestedAt ? formatFtDateTime(item.requestedAt) : '';
        const createdAt = item.createdAt ? formatFtDateTime(item.createdAt) : '';
        const sourceInfo = getFtSourceInfo(item);
        const coveringText = item.coveringOther
            ? (item.coveringRe ? `${item.coveringOther} (RE ${item.coveringRe})` : item.coveringOther)
            : (item.coveringName ? `${item.coveringName} (${item.coveringRe || 'N/I'})` : (item.coveringRe ? `RE ${item.coveringRe}` : '-'));
        const reasonLabel = getFtReasonLabel(item.reason, item.reasonOther) || item.reasonRaw || 'N/I';
        const reasonDetail = (item.reasonDetail || '').trim();
        const reasonUpper = String(reasonLabel || '').toUpperCase();
        const detailUpper = reasonDetail.toUpperCase();
        const detailDiff = !!reasonDetail && detailUpper !== reasonUpper;
        const detailBadge = detailDiff ? `<span class="detail-badge">Detalhe extra</span>` : '';
        const notes = (item.notes || '').trim();
        const expanded = ftHistoryExpanded.has(item.id);
        const isToday = item.date === getTodayKey();
        const isPending = item.status === 'pending';
        const dateLabel = item.date ? formatFtDate(item.date) : 'N/I';
        const shiftLabel = item.shift || 'N/I';
        const timeLabel = item.ftTime || 'N/I';
        const latestAudit = formatFtAuditEntrySummary(getLatestFtAuditEntry(item.id));
        return `
        <div class="lancamento-card ${isToday ? 'is-today' : ''} ${isPending ? 'is-pending' : ''}" data-ft-id="${item.id}">
            <div class="lancamento-main">
                <div class="lancamento-meta">
                    <span class="lancamento-date"><strong>Data FT</strong> ${dateLabel}</span>
                    <span class="lancamento-status status-${item.status}">${statusText}</span>
                    <span class="lancamento-source ${sourceInfo.className}">${sourceInfo.label}</span>
                </div>
                <div class="lancamento-title">${getFtCollabLabel(item)}</div>
                <div class="lancamento-summary">
                    <span><strong>Unidade:</strong> ${getFtUnitLabel(item)}</span>
                    <span><strong>Data FT:</strong> ${dateLabel}</span>
                    <span><strong>Turno:</strong> ${shiftLabel}</span>
                    <span><strong>Horário:</strong> ${timeLabel}</span>
                    <span><strong>Motivo:</strong> ${reasonLabel}</span>
                    <span><strong>Cobrindo:</strong> ${coveringText}</span>
                    ${detailBadge}
                </div>
                <button class="lancamento-toggle" type="button" onclick="toggleFtHistoryDetails('${item.id}')">${expanded ? 'Ocultar detalhes' : 'Ver detalhes'}</button>
                <div class="lancamento-details ${expanded ? '' : 'hidden'}">
                    <div class="lancamento-steps">
                        <span class="step ${item.createdAt || item.requestedAt ? 'done' : ''}">Registrada na integração</span>
                        <span class="step ${item.status !== 'pending' ? 'done' : ''}">Em validação</span>
                        <span class="step ${item.status === 'submitted' || item.status === 'launched' ? 'done' : ''}">Confirmada</span>
                        <span class="step ${item.status === 'launched' ? 'done' : ''}">Lançado</span>
                    </div>
                    ${reasonDetail ? `<div><strong>Detalhe:</strong> ${reasonDetail}</div>` : ''}
                    ${notes ? `<div><strong>Observações:</strong> ${notes}</div>` : ''}
                    ${requestedAt ? `<div><strong>Solicitada em:</strong> ${requestedAt}</div>` : ''}
                    ${createdAt ? `<div><strong>Criada em:</strong> ${createdAt}</div>` : ''}
                    ${latestAudit ? `<div><strong>Última trilha:</strong> ${escapeHtml(latestAudit)}</div>` : ''}
                    <div><strong>Responsável:</strong> ${item.createdBy || 'Admin'}</div>
                </div>
            </div>
            <div class="lancamento-actions">
                <button class="btn-mini ${launchClass}" ${launchOnClick} ${launchDisabled}>${launchLabel}</button>
                <button class="btn-mini btn-danger" onclick="deleteFtLaunch('${item.id}')" ${isAdminRole() ? '' : 'disabled'}>Remover</button>
            </div>
        </div>
        `;
    }).join('');

    const historyBody = total
        ? groups.map(group => `
            <div class="lancamentos-history-group">
                ${ftHistoryFilter.grouped ? `<div class="lancamentos-history-group-title"><span>${group.label}</span><span class="history-count">${group.items.length} registro(s)</span></div>` : ''}
                ${buildCards(group.items)}
            </div>
        `).join('')
        : `<p class="empty-state">Nenhum lançamento para os filtros selecionados.</p>`;

    panel.innerHTML = `
        <div class="lancamentos-summary-line">Resultados: <strong>${total}</strong> registros</div>
        ${summaryCards}
        <div class="lancamentos-history-tools">
            <div class="form-group">
                <label>Buscar</label>
                <input type="text" id="ft-history-search" placeholder="RE, nome, unidade, motivo...">
            </div>
            <div class="form-group">
                <label>Unidade</label>
                <select id="ft-history-unit">
                    <option value="">Todas</option>
                    ${unitOptions.map(u => `<option value="${u}">${u}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Colaborador</label>
                <select id="ft-history-collab">
                    <option value="">Todos</option>
                    ${collabOptions.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>Ordenar por</label>
                <select id="ft-history-sort">
                    <option value="date_desc">Data da FT (recente)</option>
                    <option value="date_asc">Data da FT (antiga)</option>
                    <option value="created_desc">Data de criação (recente)</option>
                    <option value="created_asc">Data de criação (antiga)</option>
                    <option value="requested_desc">Solicitada em (recente)</option>
                    <option value="requested_asc">Solicitada em (antiga)</option>
                    <option value="status">Status</option>
                    <option value="unit">Unidade</option>
                    <option value="collab">Colaborador</option>
                </select>
            </div>
        </div>
        <div class="lancamentos-history-actions">
            <button class="filter-chip ${ftHistoryFilter.grouped ? 'active' : ''}" onclick="toggleFtHistoryGrouped()">Agrupar por dia</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistorico()">Exportar histórico</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistoricoCsv()">CSV filtrado</button>
            <button class="btn btn-secondary btn-small" onclick="exportFtHistoricoPdf()">PDF resumo</button>
        </div>
        ${historyBody}
    `;

    const searchInput = document.getElementById('ft-history-search');
    if (searchInput) {
        searchInput.value = ftHistoryFilter.search || '';
        searchInput.addEventListener('input', (e) => {
            ftHistoryFilter.search = e.target.value || '';
            renderLancamentosHistorico();
        });
    }
    const unitSelect = document.getElementById('ft-history-unit');
    if (unitSelect) {
        unitSelect.value = ftHistoryFilter.unit || '';
        unitSelect.addEventListener('change', (e) => {
            ftHistoryFilter.unit = e.target.value || '';
            renderLancamentosHistorico();
        });
    }
    const collabSelect = document.getElementById('ft-history-collab');
    if (collabSelect) {
        collabSelect.value = ftHistoryFilter.collab || '';
        collabSelect.addEventListener('change', (e) => {
            ftHistoryFilter.collab = e.target.value || '';
            renderLancamentosHistorico();
        });
    }
    const sortSelect = document.getElementById('ft-history-sort');
    if (sortSelect) {
        sortSelect.value = ftHistoryFilter.sort || 'date_desc';
        sortSelect.addEventListener('change', (e) => {
            ftHistoryFilter.sort = e.target.value || 'date_desc';
            renderLancamentosHistorico();
        });
    }
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
    showToast("Fluxo manual de FT está desativado. Integração Supabase pendente.", "info");
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
    const link = item.formLink || '';
    if (!link) {
        showToast("Link de confirmação via Supabase pendente.", "info");
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
    const link = item.formLink || '';
    if (!link) {
        showToast("Link de confirmação via Supabase pendente.", "info");
        return;
    }
    const reasonText = getFtReasonLabel(item.reason, item.reasonOther);
    const coveringText = item.coveringOther
        ? item.coveringOther
        : (item.coveringName ? `${item.coveringName} (${item.coveringRe})` : item.coveringRe);
    const text = `FT confirmação\n${item.collabName} (${item.collabRe})\nUnidade: ${item.unitTarget || item.unitCurrent}\nData: ${item.date}\nEscala: ${item.shift}\nMotivo: ${reasonText}\nCobrindo: ${coveringText || '-'}\nLink: ${link}`;
    item.linkSentAt = item.linkSentAt || new Date().toISOString();
    item.updatedAt = new Date().toISOString();
    saveFtLaunches();
    openWhatsApp(item.collabPhone, text);
}

function isMobileDevice() {
    if (navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean') {
        return navigator.userAgentData.mobile;
    }
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone/i.test(navigator.userAgent || '');
}

function openWhatsApp(phone, text) {
    const isMobile = isMobileDevice();
    const url = buildWhatsUrl(phone, text, isMobile ? 'mobile' : 'desktop');
    if (isMobile) {
        window.location.href = url;
        return;
    }
    const win = window.open(url, '_blank', 'noopener,noreferrer');
    if (!win) showToast("Permita pop-ups para abrir o WhatsApp Web em outra aba.", "info");
}

function buildWhatsUrl(phone, text, mode = 'desktop') {
    const clean = String(phone || '').replace(/\D/g, '');
    const withCountry = clean.length >= 10 ? (clean.startsWith('55') ? clean : `55${clean}`) : '';
    const params = new URLSearchParams();
    if (withCountry) params.set('phone', withCountry);
    if (text) params.set('text', text);
    const query = params.toString();
    if (mode === 'mobile') {
        return `whatsapp://send${query ? `?${query}` : ''}`;
    }
    return `https://web.whatsapp.com/send${query ? `?${query}` : ''}`;
}

function applyFtToCollaborator(item) {
    if (!item?.collabRe || !item?.date) return;
    if (!isFtToday(item)) return;
    const base = currentData.find(c => matchesRe(c.re, item.collabRe))
        || (allCollaboratorsCache.items || []).find(c => matchesRe(c.re, item.collabRe));
    const reKey = base?.re || item.collabRe;
    const edit = base ? { ...base } : (collaboratorEdits[reKey] || { re: reKey, nome: item.collabName });
    if (edit.rotulo && edit.rotulo !== 'FT') return;
    edit.rotulo = 'FT';
    edit.rotuloInicio = item.date;
    edit.rotuloFim = item.date;
    edit.rotuloDetalhe = item.unitTarget || '';
    collaboratorEdits[reKey] = edit;
    const live = currentData.find(c => matchesRe(c.re, reKey));
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
    const editKey = Object.keys(collaboratorEdits).find(key => matchesRe(key, item.collabRe));
    const edit = editKey ? collaboratorEdits[editKey] : null;
    if (!edit) return;
    if (edit.rotulo === 'FT' && edit.rotuloInicio === item.date && edit.rotuloFim === item.date) {
        delete edit.rotulo;
        delete edit.rotuloInicio;
        delete edit.rotuloFim;
        delete edit.rotuloDetalhe;
        if (editKey) collaboratorEdits[editKey] = edit;
        const live = currentData.find(c => matchesRe(c.re, item.collabRe));
        if (live && live.rotulo === 'FT' && live.rotuloInicio === item.date && live.rotuloFim === item.date) {
            delete live.rotulo;
            delete live.rotuloInicio;
            delete live.rotuloFim;
            delete live.rotuloDetalhe;
        }
        saveLocalState();
    }
}

function setFtStatus(item, status, meta = {}) {
    const prevStatus = normalizeFtStatus(item?.status || 'pending');
    const nextStatus = normalizeFtStatus(status || 'pending');
    item.status = nextStatus;
    item.updatedAt = new Date().toISOString();
    if (prevStatus !== nextStatus) {
        logFtAudit('status_change', item, {
            ...meta,
            prevStatus,
            nextStatus
        });
    }
    if (nextStatus === 'submitted' || nextStatus === 'launched') {
        applyFtToCollaborator(item);
    } else if (nextStatus === 'pending') {
        removeFtFromCollaborator(item);
    }
}

async function markFtLaunched(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item || item.status !== 'submitted') return;
    setFtStatus(item, 'launched', {
        origin: 'manual'
    });
    saveFtLaunches();
    renderLancamentosHistorico();
    setTimeout(() => flashLancamentoCard(item.id), 100);
    showToast("FT marcada como lançada.", "success");
}

function deleteFtLaunch(id) {
    const item = ftLaunches.find(i => i.id === id);
    if (!item) return;
    if (!confirm('Remover lançamento de FT?')) return;
    const removedSnapshot = { ...item };
    logFtAudit('removed', removedSnapshot, {
        origin: 'manual_delete',
        prevStatus: removedSnapshot.status,
        note: 'Lançamento removido manualmente'
    });
    removeFtFromCollaborator(item);
    ftLaunches = ftLaunches.filter(i => i.id !== id);
    saveFtLaunches();
    renderLancamentosHistorico();
    showToast("Lançamento removido.", "warning", {
        actionLabel: "Desfazer",
        onAction: () => {
            ftLaunches.unshift(removedSnapshot);
            logFtAudit('restored', removedSnapshot, {
                origin: 'manual_restore',
                nextStatus: removedSnapshot.status,
                note: 'Remoção desfeita'
            });
            saveFtLaunches();
            renderLancamentosHistorico();
            setTimeout(() => flashLancamentoCard(removedSnapshot.id), 60);
        }
    });
}

// ==========================================================================
// CONTATO (WHATSAPP / TELEFONE)
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
    openWhatsApp(currentContactPhone, '');
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

function verificarEscala(turma, groupKey) {
    return verificarEscalaPorData(turma, getTodayKey(), groupKey);
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

async function loginSite(options = {}) {
    const source = options.source || 'config';
    const target = options.target || (source === 'supervisao' ? 'supervisao' : 'config');
    const emailInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-email')
        : document.getElementById('loginEmail');
    const passInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-password')
        : document.getElementById('loginPassword');
    const email = emailInput?.value.trim() || '';
    const password = passInput?.value || '';

    if (!email || !password) {
        showToast('Informe e-mail e senha.', 'error');
        return;
    }
    if (!isSupabaseReady()) {
        showToast('Supabase não configurado.', 'error');
        return;
    }
    const keepCheckEl = document.getElementById('keepLoggedCheck');
    const keepLogged = keepCheckEl ? keepCheckEl.checked : true;
    showToast('Validando acesso...', 'loading', { id: 'auth-login', autoClose: false });
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    hideToastById('auth-login');
    if (error || !data?.session) {
        const detail = error?.message ? ` (${error.message})` : '';
        showToast(`Acesso negado. Verifique e-mail e senha.${detail}`, 'error');
        return;
    }
    if (keepLogged) {
        localStorage.setItem('sessionOnly', '0');
    } else {
        localStorage.setItem('sessionOnly', '1');
        sessionStorage.setItem('sessionActive', '1');
    }
    await applyAuthSession(data.session);

    if (target === 'supervisao') {
        openSupervisaoPage();
        updateMenuStatus();
        renderSupervisaoAdminList();
        renderSupervisaoHistory();
        updateSupervisaoEditorVisibility();
        updateSupervisaoAdminStatus();
        showToast("Acesso validado com sucesso.", "success");
        return;
    }
    if (target === 'gateway') {
        renderGateway();
        updateMenuStatus();
        showToast("Acesso validado com sucesso.", "success");
        return;
    }

    renderDashboard();
    clearSearchStateAfterAuth();
    switchTab('config');
    renderAdminList();
    renderAuditList();
    showToast("Acesso validado com sucesso.", "success");
}

async function signupSite(options = {}) {
    const source = options.source || 'config';
    const emailInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-email')
        : document.getElementById('loginEmail');
    const passInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-password')
        : document.getElementById('loginPassword');
    const email = emailInput?.value.trim() || '';
    const password = passInput?.value || '';
    if (!email || !password) {
        showToast('Informe e-mail e senha para criar a conta.', 'error');
        return;
    }
    if (!isSupabaseReady()) {
        showToast('Supabase não configurado.', 'error');
        return;
    }
    showToast('Criando conta...', 'loading', { id: 'auth-signup', autoClose: false });
    const { data, error } = await supabaseClient.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: getAuthRedirectUrl() }
    });
    hideToastById('auth-signup');
    if (error) {
        showToast(error.message || 'Falha ao criar conta.', 'error');
        return;
    }
    if (data?.session) {
        await applyAuthSession(data.session);
        clearSearchStateAfterAuth();
    }
    showToast('Conta criada. Verifique seu e-mail para confirmar.', 'success');
}

async function requestPasswordReset(options = {}) {
    const source = options.source || 'config';
    const emailInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-email')
        : document.getElementById('loginEmail');
    const email = emailInput?.value.trim() || '';
    if (!email) {
        showToast('Informe seu e-mail.', 'error');
        return;
    }
    if (!isSupabaseReady()) {
        showToast('Supabase não configurado.', 'error');
        return;
    }
    const redirectTo = getAuthRedirectUrl();
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
        showToast(error.message || 'Falha ao enviar reset de senha.', 'error');
        return;
    }
    showToast('Enviamos um e-mail com o link para redefinir a senha.', 'success');
}

async function logoutSite(options = {}) {
    if (isSupabaseReady()) {
        await supabaseClient.auth.signOut();
    }
    localStorage.removeItem('sessionOnly');
    sessionStorage.removeItem('sessionActive');
    resetAuthState();

    if (CONFIG?.auth?.requireLogin) {
        showLoginScreen();
        return;
    }

    if (options.target === 'supervisao') {
        openSupervisaoPage();
        updateMenuStatus();
        updateSupervisaoAdminStatus();
        return;
    }
    if (options.target === 'gateway') {
        renderGateway();
        updateMenuStatus();
        return;
    }

    renderDashboard();
    switchTab('config');
}

function toggleEditMode() {
    if (!SiteAuth.logged || !canEditBase()) return;

    SiteAuth.mode = SiteAuth.mode === 'edit' ? 'view' : 'edit';
    
    document.body.classList.toggle('mode-edit', SiteAuth.mode === 'edit');
    updateMenuStatus();
    updateSupervisaoAdminStatus();
}

function renderAdminList() {
    const list = document.getElementById('userList');
    if (!list) return;
    if (!canManageUsers()) {
        list.innerHTML = '';
        return;
    }
    const rows = (SiteAuth.admins || []).map(user => {
        const roleLabel = ROLE_LABELS[user.role] || user.role || 'Visitante';
        const roleKey = user.role || 'visitante';
        const groupsText = Array.isArray(user.groups) && user.groups.length
            ? user.groups.join(', ')
            : 'Sem grupo';
        const emailAttr = escapeHtml(JSON.stringify(user.email || ''));
        return `
            <div class="admin-row admin-row-clickable" onclick="fillUserPermissionForm(${emailAttr})">
                <div class="admin-row-main">
                    <span class="admin-name">${escapeHtml(user.name || user.email || 'Usuário')}</span>
                    <span class="role-badge role-${roleKey}" style="font-size:10px;padding:2px 8px;">${roleLabel}</span>
                </div>
                <div class="admin-row-meta">
                    <span class="admin-meta">${escapeHtml(user.email || '')}</span>
                    <span class="admin-groups">${escapeHtml(groupsText)}</span>
                </div>
            </div>
        `;
    }).join('');
    list.innerHTML = rows || '<div class="admin-empty">Nenhum usuário encontrado.</div>';
    updateAvisoAssigneeFilter();
}

function fillUserPermissionForm(email) {
    const emailInput = document.getElementById('cfg-user-email');
    const roleSelect = document.getElementById('cfg-user-role');
    if (emailInput) emailInput.value = email;
    // Find user in admins list to pre-fill role and groups
    const user = (SiteAuth.admins || []).find(u => isSameUserEmail(u.email || '', email));
    if (user && roleSelect) {
        roleSelect.value = user.role || 'visitante';
    }
    // Set group checkboxes
    const container = document.getElementById('cfg-user-groups-checkboxes');
    if (container) {
        const userGroups = Array.isArray(user?.groups) ? user.groups : [];
        container.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = userGroups.includes(cb.value);
        });
    }
    const resultEl = document.getElementById('cfg-user-verify-result');
    if (resultEl) {
        resultEl.className = 'config-note cfg-verify';
        resultEl.textContent = 'Clique em "Verificar usuário" para confirmar o perfil antes de salvar.';
    }
    // Scroll to the assign panel
    document.getElementById('adminAssignPanel')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function getCheckedGroups(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];
    return Array.from(container.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.value);
}

async function refreshUserList() {
    if (!canManageUsers()) return;
    await refreshAssignableUsers(true);
    renderAdminList();
}

async function upsertUserProfileFromConfig() {
    if (!canManageUsers()) {
        showToast("Apenas administradores podem alterar permissões.", "error");
        return;
    }
    const email = normalizeEmail(document.getElementById('cfg-user-email')?.value);
    const role = document.getElementById('cfg-user-role')?.value || 'visitante';
    const groups = getCheckedGroups('cfg-user-groups-checkboxes');
    if (!email) {
        showToast("Informe o e-mail do usuário.", "error");
        return;
    }
    const profiles = await fetchProfiles(true);
    let target = (profiles || []).find(p => isSameUserEmail(p?.email || '', email));
    if (!target) {
        // Fallback: busca direta por e-mail para casos de cache desatualizado.
        const direct = await supabaseClient
            .from(SUPABASE_TABLES.profiles)
            .select('id, email')
            .ilike('email', email)
            .maybeSingle();
        if (!direct.error && direct.data?.id) {
            target = direct.data;
        }
    }
    if (!target) {
        showToast("Usuário não encontrado na tabela de perfis. Se ele já logou, valide o e-mail e o projeto Supabase em produção.", "error");
        return;
    }
    const { error } = await supabaseClient
        .from(SUPABASE_TABLES.profiles)
        .update({ role, groups })
        .eq('id', target.id);
    if (error) {
        showToast("Falha ao atualizar permissões.", "error");
        return;
    }
    showToast("Permissões atualizadas.", "success");
    await refreshUserList();
    document.getElementById('cfg-user-email').value = '';
    // Reset checkboxes
    document.getElementById('cfg-user-groups-checkboxes')?.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    document.getElementById('cfg-user-role').value = 'visitante';
    const resultEl = document.getElementById('cfg-user-verify-result');
    if (resultEl) {
        resultEl.className = 'config-note cfg-verify';
        resultEl.textContent = 'Use "Verificar usuário" para confirmar se o próximo e-mail já existe em profiles.';
    }
}

async function verifyUserProfileFromConfig() {
    if (!canManageUsers()) return;
    const resultEl = document.getElementById('cfg-user-verify-result');
    const email = normalizeEmail(document.getElementById('cfg-user-email')?.value);
    if (!email) {
        if (resultEl) {
            resultEl.className = 'config-note cfg-verify cfg-verify-warn';
            resultEl.textContent = 'Informe um e-mail para verificar.';
        }
        showToast('Informe um e-mail para verificar.', 'info');
        return;
    }

    const profiles = await fetchProfiles(true);
    const fromList = (profiles || []).find(p => isSameUserEmail(p?.email || '', email));
    let fromDirect = null;
    if (!fromList) {
        const direct = await supabaseClient
            .from(SUPABASE_TABLES.profiles)
            .select('id, email, role, groups, created_at, updated_at')
            .ilike('email', email)
            .maybeSingle();
        if (!direct.error && direct.data?.id) fromDirect = direct.data;
    }
    const preReg = (preRegisteredEmails || []).find(p => isSameUserEmail(p?.email || '', email));
    const hit = fromList || fromDirect;

    if (hit) {
        const roleLabel = ROLE_LABELS[hit.role] || hit.role || 'visitante';
        const groupsText = Array.isArray(hit.groups) && hit.groups.length ? hit.groups.join(', ') : 'Sem grupo';
        const msg = `Usuário encontrado em profiles (${hit.email || email}) • Cargo: ${roleLabel} • Grupos: ${groupsText}`;
        if (resultEl) {
            resultEl.className = 'config-note cfg-verify cfg-verify-ok';
            resultEl.textContent = msg;
        }
        showToast('Usuário localizado em profiles.', 'success');
        return;
    }

    const pendingMsg = preReg
        ? 'Não encontrado em profiles ainda. Esse e-mail está pré-cadastrado e receberá acesso quando fizer o primeiro login neste ambiente.'
        : 'Não encontrado em profiles. Peça para a pessoa fazer login neste ambiente e use exatamente o mesmo e-mail da conta.';
    if (resultEl) {
        resultEl.className = 'config-note cfg-verify cfg-verify-warn';
        resultEl.textContent = pendingMsg;
    }
    showToast('Usuário ainda não apareceu em profiles.', 'warning');
}

function addAdminFromConfig() {
    showToast("Use o painel de permissões com e-mail.", "info");
}

function addSupervisorFromConfig() {
    showToast("Use o painel de permissões com e-mail.", "info");
}

function removeAdmin() {
    showToast("Remoção de usuário deve ser feita via painel do Supabase.", "info");
}

function updateAdminResetOptions() {}

function changeOtherAdminPassword() {
    showToast("Para reset de senha, use o fluxo 'Esqueci senha'.", "info");

}

// ── Pré-cadastro de e-mails ──

function addPreRegisteredEmail() {
    if (!canManageUsers()) return;
    const emailInput = document.getElementById('preReg-email');
    const roleSelect = document.getElementById('preReg-role');
    const email = normalizeEmail(emailInput?.value);
    const role = roleSelect?.value || 'operacional';
    const groups = getCheckedGroups('preReg-groups-checkboxes');
    if (!email || !email.includes('@')) {
        showToast("Informe um e-mail válido.", "error");
        return;
    }
    if (preRegisteredEmails.some(p => isSameUserEmail(p.email, email))) {
        showToast("Esse e-mail já está pré-cadastrado.", "info");
        return;
    }
    preRegisteredEmails.push({ email, role, groups });
    savePreRegisteredEmails();
    renderPreRegList();
    emailInput.value = '';
    roleSelect.value = 'operacional';
    document.getElementById('preReg-groups-checkboxes')?.querySelectorAll('input[type="checkbox"]').forEach(cb => { cb.checked = false; });
    showToast("E-mail pré-cadastrado. Quando essa pessoa criar conta, receberá o cargo automaticamente.", "success");
}

function removePreRegisteredEmail(idx) {
    if (!canManageUsers()) return;
    preRegisteredEmails.splice(idx, 1);
    savePreRegisteredEmails();
    renderPreRegList();
}

function renderPreRegList() {
    const list = document.getElementById('preRegList');
    if (!list) return;
    if (!preRegisteredEmails.length) {
        list.innerHTML = '<div class="admin-empty">Nenhum e-mail pré-cadastrado.</div>';
        return;
    }
    list.innerHTML = preRegisteredEmails.map((p, idx) => {
        const roleLabel = ROLE_LABELS[p.role] || p.role;
        const roleKey = p.role || 'visitante';
        const groupsText = Array.isArray(p.groups) && p.groups.length ? p.groups.join(', ') : 'Sem grupo';
        return `
            <div class="admin-row">
                <div class="admin-row-main">
                    <span class="admin-name">${escapeHtml(p.email)}</span>
                    <span class="role-badge role-${roleKey}" style="font-size:10px;padding:2px 8px;">${roleLabel}</span>
                </div>
                <div class="admin-row-meta">
                    <span class="admin-groups">${escapeHtml(groupsText)}</span>
                    <button class="btn-mini btn-danger" onclick="removePreRegisteredEmail(${idx})">Remover</button>
                </div>
            </div>
        `;
    }).join('');
}

function savePreRegisteredEmails() {
    localStorage.setItem('preRegisteredEmails', JSON.stringify(preRegisteredEmails));
    scheduleLocalSync('pre-registered-emails');
}

function loadPreRegisteredEmails() {
    try {
        preRegisteredEmails = JSON.parse(localStorage.getItem('preRegisteredEmails') || '[]');
    } catch {
        preRegisteredEmails = [];
    }
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

function updateMenuStatus() {
    const userReEl = document.getElementById('userRe');
    const siteModeEl = document.getElementById('siteMode');
    const sourceStatusEl = document.getElementById('sourceStatus');
    const adminToolsEl = document.getElementById('adminTools');
    const authIndicatorEl = document.getElementById('auth-indicator');
    const quickLogoutBtn = document.getElementById('quick-logout-btn');
    const supabaseMode = CONFIG?.dataSource === 'supabase';
    const publicMode = isPublicAccessMode();
    const quickActionsNote = document.getElementById('quick-actions-note');

    document.querySelectorAll('[data-hide-when-supabase="1"]').forEach(el => {
        el.classList.toggle('hidden', supabaseMode);
    });

    if (quickActionsNote) {
        quickActionsNote.textContent = supabaseMode
            ? 'Use estes atalhos para atualizar a base e exportar relatórios.'
            : 'Use estes atalhos para atualizar a base e exportar relatórios.';
    }
    
    if (userReEl) {
        userReEl.innerHTML = publicMode
            ? `<span style="color:#28a745">●</span> Liberada`
            : SiteAuth.logged
            ? `<span style="color:#28a745">●</span> ${SiteAuth.user || SiteAuth.email || 'Usuário'}`
            : `<span style="color:#666">●</span> Desconectado`;
    }

    const userRoleLabelEl = document.getElementById('userRoleLabel');
    if (userRoleLabelEl) {
        const roleLabel = ROLE_LABELS[SiteAuth.role] || 'Operacional';
        userRoleLabelEl.innerHTML = publicMode
            ? `<span class="status-badge-menu edit">TOTAL</span>`
            : SiteAuth.logged
            ? `<span class="status-badge-menu view">${roleLabel}</span>`
            : `<span style="color:#666">—</span>`;
    }

    if (siteModeEl) {
        const roleLabel = ROLE_LABELS[SiteAuth.role] || 'Usuário';
        const modeLabel = SiteAuth.mode === 'edit' ? 'EDIÇÃO' : 'VISUALIZAÇÃO';
        siteModeEl.innerHTML = publicMode
            ? `<span class="status-badge-menu edit">EDIÇÃO LIBERADA</span>`
            : `<span class="status-badge-menu ${SiteAuth.mode === 'edit' ? 'edit' : 'view'}">${roleLabel.toUpperCase()} • ${modeLabel}</span>`;
    }
    
    if (sourceStatusEl) {
        const statusLabel = isSupabaseReady() ? '🟢 Ativo' : '🔴 Indisponível';
        sourceStatusEl.innerHTML = `
            <div>Fonte atual: Supabase</div>
            <div>Supabase: ${statusLabel}</div>
        `;
    }

    if (authIndicatorEl) {
        if (publicMode) {
            authIndicatorEl.classList.add('hidden');
            authIndicatorEl.textContent = '';
            authIndicatorEl.removeAttribute('title');
        } else if (SiteAuth.logged) {
            const roleLabel = ROLE_LABELS[SiteAuth.role] || 'Usuário';
            authIndicatorEl.innerHTML = `<span class="dot"></span> Conectado${SiteAuth.user ? `: ${SiteAuth.user}` : ''}`;
            authIndicatorEl.title = `Conectado como ${SiteAuth.user || 'Usuario'} (${roleLabel})`;
            authIndicatorEl.classList.remove('hidden');
        } else {
            authIndicatorEl.classList.add('hidden');
            authIndicatorEl.textContent = '';
            authIndicatorEl.removeAttribute('title');
        }
    }

    if (quickLogoutBtn) {
        quickLogoutBtn.classList.toggle('hidden', publicMode || !SiteAuth.logged);
    }

    if (publicMode) {
        document.querySelectorAll('.gateway-logout, [onclick^="logoutSite"]').forEach(el => {
            el.classList.add('hidden');
        });
    }

    renderEscalaInvertidaUI();

    if (adminToolsEl) {
        adminToolsEl.classList.toggle('hidden', !(SiteAuth.logged && canManageUsers()));
        if (SiteAuth.logged && canManageUsers()) {
            renderAdminList();
        }
    }
    const adminAssignEl = document.getElementById('adminAssignPanel');
    if (adminAssignEl) {
        adminAssignEl.classList.toggle('hidden', !(SiteAuth.logged && canManageUsers()));
    }
    const preRegPanelEl = document.getElementById('preRegPanel');
    if (preRegPanelEl) {
        preRegPanelEl.classList.toggle('hidden', !(SiteAuth.logged && canManageUsers()));
    }
    const teamNoAccessEl = document.getElementById('teamNoAccess');
    if (teamNoAccessEl) {
        teamNoAccessEl.classList.toggle('hidden', !!(SiteAuth.logged && canManageUsers()));
    }
    if (SiteAuth.logged && canEditBase() && isDashboardFeatureEnabled('lancamentos')) {
        renderFtReasonsConfig();
    }
    renderMyRoleDescription();
    renderRolePermissionsTable();
    updateTeamPaneVisibility();
    renderDataSourceList();
    renderConfigSummary();
    renderRoadmapList();
    renderAuditList();
    if (isDashboardFeatureEnabled('avisos')) {
        updateAvisosUI();
    }
}

function reloadCurrentGroupData() {
    if (!currentGroup) {
        showToast("Selecione um grupo para recarregar os dados.", "info");
        return;
    }
    loadGroup(currentGroup);
}

function getCollaboratorCountsByGroup() {
    const counts = { bombeiros: 0, servicos: 0, seguranca: 0, rb: 0, todos: 0 };
    const list = allCollaboratorsCache.items || currentData || [];
    list.forEach(c => {
        const key = c.grupo || '';
        if (counts[key] !== undefined) counts[key] += 1;
        counts.todos += 1;
    });
    return counts;
}

// ── Role Permissions Detail Rendering ──

const ROLE_PERM_DESCRIPTIONS = {
    visitante: {
        label: 'Visitante',
        summary: 'Acesso mínimo de consulta. Pode navegar e visualizar dados básicos, sem permissão de edição.',
        abilities: [
            'Busca rápida de colaboradores',
            'Visualizar unidades e escalas',
            'Navegar pelo sistema'
        ],
        restrictions: [
            'Não pode editar colaboradores ou unidades',
            'Não pode lançar FT ou avisos',
            'Não pode gerenciar usuários',
            'Não pode alterar configurações',
            'Não pode inverter escalas'
        ]
    },
    operacional: {
        label: 'Operacional',
        summary: 'Acesso somente leitura. Pode consultar colaboradores, unidades e escalas.',
        abilities: [
            'Busca rápida de colaboradores',
            'Visualizar unidades e escalas',
            'Consultar avisos e lançamentos',
            'Ver informações de contato'
        ],
        restrictions: [
            'Não pode editar colaboradores ou unidades',
            'Não pode lançar FT ou avisos',
            'Não pode gerenciar usuários',
            'Não pode alterar configurações'
        ]
    },
    supervisor: {
        label: 'Supervisor',
        summary: 'Pode editar dados do seu grupo. Ideal para líderes de equipe e supervisores de campo.',
        abilities: [
            'Tudo do cargo Operacional',
            'Editar colaboradores do seu grupo',
            'Lançar FTs e registrar avisos',
            'Editar unidades do seu grupo',
            'Registrar trocas e afastamentos'
        ],
        restrictions: [
            'Não pode acessar outros grupos',
            'Não pode gerenciar usuários',
            'Não pode alterar motivos de FT'
        ]
    },
    coordenador: {
        label: 'Coordenador',
        summary: 'Acesso a todos os grupos com permissão de edição. Para coordenadores de operação.',
        abilities: [
            'Tudo do cargo Supervisor',
            'Visualizar e editar todos os grupos',
            'Acessar dashboards gerenciais',
            'Exportar relatórios de qualquer grupo',
            'Gerenciar motivos de FT'
        ],
        restrictions: [
            'Não pode gerenciar usuários ou permissões'
        ]
    },
    gerencia: {
        label: 'Gerência',
        summary: 'Visão completa da operação com acesso a dashboards e relatórios avançados.',
        abilities: [
            'Tudo do cargo Coordenador',
            'Acesso completo ao painel gerencial',
            'Relatórios consolidados multi-grupo',
            'Indicadores operacionais avançados'
        ],
        restrictions: [
            'Não pode gerenciar usuários ou permissões'
        ]
    },
    administrador: {
        label: 'Administrador',
        summary: 'Controle total do sistema. Pode gerenciar usuários, permissões e todas as configurações.',
        abilities: [
            'Tudo do cargo Gerência',
            'Criar e remover usuários',
            'Atribuir cargos e permissões',
            'Conceder acesso a novos colaboradores',
            'Configurar grupos e escalas',
            'Acesso total a todas as funcionalidades'
        ],
        restrictions: []
    }
};

function renderMyRoleDescription() {
    const el = document.getElementById('myRoleDescription');
    if (!el) return;
    if (isPublicAccessMode()) {
        el.innerHTML = `
            <div class="role-detail-card">
                <div class="role-detail-header">
                    <span class="role-badge role-administrador">Acesso liberado</span>
                    <span class="role-groups-text">Todos os grupos</span>
                </div>
                <p class="role-summary">Consulta e edição estão disponíveis diretamente, sem etapa de autenticação.</p>
            </div>
        `;
        return;
    }
    if (!SiteAuth.logged) {
        el.innerHTML = '<span style="color:#666">Permissões indisponíveis no momento.</span>';
        return;
    }
    const role = SiteAuth.role || 'operacional';
    const desc = ROLE_PERM_DESCRIPTIONS[role] || ROLE_PERM_DESCRIPTIONS.operacional;
    const groupsText = SiteAuth.groups?.length ? SiteAuth.groups.join(', ') : 'Nenhum grupo atribuído';
    el.innerHTML = `
        <div class="role-detail-card">
            <div class="role-detail-header">
                <span class="role-badge role-${role}">${desc.label}</span>
                <span class="role-groups-text">Grupos: ${escapeHtml(groupsText)}</span>
            </div>
            <p class="role-summary">${desc.summary}</p>
            <div class="role-abilities">
                <strong>O que você pode fazer:</strong>
                <ul>${desc.abilities.map(a => `<li>${a}</li>`).join('')}</ul>
            </div>
            ${desc.restrictions.length ? `
            <div class="role-restrictions">
                <strong>Restrições:</strong>
                <ul>${desc.restrictions.map(r => `<li>${r}</li>`).join('')}</ul>
            </div>
            ` : ''}
        </div>
    `;
}

function renderRolePermissionsTable() {
    const el = document.getElementById('rolePermissionsTable');
    if (!el) return;
    const roles = ['visitante', 'operacional', 'supervisor', 'coordenador', 'gerencia', 'administrador'];
    const permChecks = [
        { label: 'Visualizar dados', key: 'view' },
        { label: 'Editar colaboradores', key: 'canEdit' },
        { label: 'Lançar FT / Avisos', key: 'canEdit' },
        { label: 'Ver todos os grupos', key: 'canViewAllGroups' },
        { label: 'Gerenciar usuários', key: 'canManageUsers' },
        { label: 'Configurar sistema', key: 'canManageUsers' }
    ];
    const headerCells = roles.map(r => `<th class="role-th">${ROLE_LABELS[r]}</th>`).join('');
    const rows = permChecks.map(p => {
        const cells = roles.map(r => {
            const perms = ROLE_PERMS[r] || {};
            const has = p.key === 'view' ? true : !!perms[p.key];
            return `<td class="role-td ${has ? 'perm-yes' : 'perm-no'}">${has ? '✓' : '—'}</td>`;
        }).join('');
        return `<tr><td class="role-td-label">${p.label}</td>${cells}</tr>`;
    }).join('');
    el.innerHTML = `
        <table class="role-perm-grid">
            <thead><tr><th class="role-th-label">Permissão</th>${headerCells}</tr></thead>
            <tbody>${rows}</tbody>
        </table>
    `;
}

function updateTeamPaneVisibility() {
    const adminToolsEl = document.getElementById('adminTools');
    const adminAssignEl = document.getElementById('adminAssignPanel');
    const preRegEl = document.getElementById('preRegPanel');
    const teamNoAccessEl = document.getElementById('teamNoAccess');
    const isAdmin = SiteAuth.logged && canManageUsers();
    if (adminToolsEl) adminToolsEl.classList.toggle('hidden', !isAdmin);
    if (adminAssignEl) adminAssignEl.classList.toggle('hidden', !isAdmin);
    if (preRegEl) preRegEl.classList.toggle('hidden', !isAdmin);
    if (teamNoAccessEl) teamNoAccessEl.classList.toggle('hidden', isAdmin);
}

function renderConfigSummary() {
    const summaryEl = document.getElementById('config-summary');
    if (!summaryEl) return;
    const counts = getCollaboratorCountsByGroup();
    const unitCount = new Set((currentData || []).map(c => c.posto).filter(Boolean)).size;
    const editsCount = changeHistory.length;
    const lastUpdateText = lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—';
    const supaText = isSupabaseReady() ? 'Ativo' : 'Indisponível';
    const supaClass = isSupabaseReady() ? 'ok' : 'off';
    summaryEl.innerHTML = `
        <div class="config-summary-grid">
            <div class="config-summary-card">
                <div class="label">Registros</div>
                <div class="value">${currentData.length}</div>
                <div class="meta">Grupo atual</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Unidades</div>
                <div class="value">${unitCount}</div>
                <div class="meta">Ativas</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Alterações</div>
                <div class="value">${editsCount}</div>
                <div class="meta">Histórico local</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Supabase</div>
                <div class="value"><span class="status-pill ${supaClass}">${supaText}</span></div>
                <div class="meta">Conexão</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Última atualização</div>
                <div class="value">${lastUpdateText}</div>
                <div class="meta">Base local</div>
            </div>
        </div>
        <div class="config-summary-chips">
            <span class="summary-chip">Bombeiros: ${counts.bombeiros}</span>
            <span class="summary-chip">Serviços: ${counts.servicos}</span>
            <span class="summary-chip">Segurança: ${counts.seguranca}</span>
            <span class="summary-chip">RB: ${counts.rb}</span>
            <span class="summary-chip">Total: ${counts.todos}</span>
        </div>
    `;
}

function renderRoadmapList() {
    const el = document.getElementById('roadmap-list');
    if (!el) return;
    const statusLabel = {
        concluido: 'Concluído',
        andamento: 'Em andamento',
        planejado: 'Planejado'
    };
    el.innerHTML = ROADMAP_ITEMS.map(item => `
        <div class="roadmap-item">
            <div class="roadmap-top">
                <strong>${item.title}</strong>
                <span class="roadmap-status ${item.status}">${statusLabel[item.status] || item.status}</span>
            </div>
            <div class="roadmap-meta">${item.area}</div>
            <div class="roadmap-detail">${item.detail}</div>
        </div>
    `).join('');
}

function renderAuditList() {
    const list = document.getElementById('auditList');
    if (!list) return;

    if (changeHistory.length > 0) {
        list.innerHTML = changeHistory.slice(0, 20).map(h => `
            <div class="audit-item">
                <strong>${h.responsavel}</strong> — ${h.acao}<br>
                <span>${h.detalhe}</span>
            </div>
        `).join('');
        return;
    }

    const edits = Object.keys(collaboratorEdits || {});
    const units = Object.keys(unitMetadata || {});
    
    if (edits.length === 0 && units.length === 0) {
        list.innerHTML = '<div class="audit-item">Nenhuma alteração registrada.</div>';
        return;
    }

    let html = '';

    edits.forEach(re => {
        html += `
            <div class="audit-item">
                <strong>${collaboratorEdits[re].nome}</strong><br>
                <span>RE ${re} — alteração local</span>
            </div>
        `;
    });
    
    units.forEach(u => {
        html += `
            <div class="audit-item">
                <strong>Unidade ${u}</strong><br>
                <span>Metadados locais</span>
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
    scheduleLocalSync('local-collaborators', { silent });
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
    showToast("Use 'Esqueci senha' para alterar a senha.", "info");
}

function renderDataSourceList() {
    const list = document.getElementById('dataSourceList');
    if (!list) return;
    const supaOk = isSupabaseReady();
    const sources = [
        {
            name: 'Supabase • colaboradores',
            status: supaOk ? 'ATIVO' : 'OFF',
            count: allCollaboratorsCache.items?.length || currentData.length
        },
        {
            name: 'Supabase • unidades',
            status: supaOk ? 'ATIVO' : 'OFF',
            count: supaUnitsCache.items?.length || unitAddressDb?.entries?.length || 0
        }
    ];

    list.innerHTML = sources.map(s => `
        <div class="source-row">
            <span>${s.name}${Number.isFinite(s.count) ? ` <span class="source-count">${s.count}</span>` : ''}</span>
            <span class="source-pill ${s.status === 'ATIVO' ? 'ok' : 'off'}">${s.status}</span>
        </div>
    `).join('');
}

const AppFeatureRegistry = Object.freeze({
    gateway: Object.freeze({
        loadGroup,
        resetToGateway,
        openSupervisaoPage,
        openGerenciaPage
    }),
    search: Object.freeze({
        realizarBusca,
        runStandardSearch,
        handleSearchTokenSuggest,
        applySearchToken
    }),
    units: Object.freeze({
        renderizarUnidades,
        navigateToUnit,
        openAddressModalForUnit,
        openAddressModalForCollaborator
    }),
    avisos: Object.freeze({
        renderAvisos,
        createAviso,
        createReminder,
        checkReminderAlerts
    }),
    reciclagem: Object.freeze({
        loadReciclagemData,
        renderReciclagem,
        exportReciclagemReport
    }),
    lancamentos: Object.freeze({
        renderLancamentos
    }),
    config: Object.freeze({
        switchConfigTab,
        renderConfigSummary,
        renderMyRoleDescription,
        renderRolePermissionsTable,
        updateTeamPaneVisibility
    }),
    infra: Object.freeze({
        AppBootstrapper,
        AppStateManager,
        AppCacheManager,
        AppEventManager,
        AppTimerManager,
        AppErrorHandler,
        AppLogger
    })
});
if (typeof window !== 'undefined') {
    window.AppFeatures = AppFeatureRegistry;
}
