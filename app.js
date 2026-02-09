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
let shadowReady = false;
let shadowSyncTimer = null;
let shadowAutoPullTimer = null;
let shadowAutoPullBound = false;
let shadowDirty = false;
let autoEscalaTimer = null;
let autoEscalaBound = false;
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
const RECICLAGEM_CACHE_TTL_MS = 30 * 60 * 1000;
let exportUnitTarget = null;
let ftLaunches = [];
let ftRemovedIds = new Set();
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
let ftSyncTimer = null;
let ftLastSyncAt = null;
let ftSheetSyncInProgress = false;
let trocaSheetSyncInProgress = false;
let trocaLastSyncAt = null;
let ftAutoSyncBound = false;
let dailySnapshotInProgress = false;
let reminderCheckTimer = null;
let reminderAlertsHidden = false;
let searchFilterStatus = 'all'; // all | plantao | folga | ft | afastado
let searchHideAbsence = false;
let searchDateFilter = { from: '', to: '' };
let unitDateFilter = { from: '', to: '' };
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
let escalaInvertida = false;
let escalaInvertidaAutoMonth = null;
let reciclagemSyncTimer = null;
let supervisaoMenu = null;
let supervisaoHistory = [];
let supervisaoFavorites = new Set();
let supervisaoUsage = {};
let supervisaoFilter = 'internal';
let supervisaoSearchTerm = '';
let supervisaoChannelPrefs = {};
let supervisaoEditingId = null;
let supervisaoOpenMessages = new Set();
let gerenciaDataCache = [];
let gerenciaFilter = { group: 'all', from: '', to: '' };
let commandPaletteState = { open: false, activeIndex: 0, filtered: [] };
const SEARCH_DEBOUNCE_MS = 350;
let searchInputComposing = false;
let searchInputDebounceId = null;
let uiTooltipInitialized = false;
let activeTooltipEl = null;
let activeTooltipTarget = null;
let appLifecycleBound = false;
const APP_TIMERS = Object.freeze({
    shadowSync: 'shadow-sync',
    shadowAutoPull: 'shadow-auto-pull',
    ftSync: 'ft-sync',
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
    bind('shadowStatus', () => shadowStatus, (v) => { shadowStatus = v && typeof v === 'object' ? v : shadowStatus; });
    bind('avisos', () => avisos, (v) => { avisos = Array.isArray(v) ? v : []; }, Array.isArray);
    bind('ftLaunches', () => ftLaunches, (v) => { ftLaunches = Array.isArray(v) ? v : []; }, Array.isArray);
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
    shadowSyncTimer = null;
    shadowAutoPullTimer = null;
    ftSyncTimer = null;
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
    if (target !== 'lancamentos') {
        AppTimerManager.clear(APP_TIMERS.ftSync);
        ftSyncTimer = null;
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

function resolveNextiApiToken() {
    let runtimeToken = '';
    try {
        runtimeToken = String(window.__NEXTI_API_TOKEN__ || localStorage.getItem('nextiApiToken') || sessionStorage.getItem('nextiApiToken') || '').trim();
    } catch {}
    const configToken = String(CONFIG?.api?.token || '').trim();
    return runtimeToken || configToken;
}

function getNextiAuthHeaders() {
    const token = resolveNextiApiToken();
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

function isLikelyConfiguredToken(value) {
    const raw = String(value || '').trim();
    if (!raw) return false;
    if (raw === 'SEU_TOKEN_AQUI') return false;
    return raw.length >= 16;
}

function warnIfNextiTokenExposedInConfig() {
    const configToken = String(CONFIG?.api?.token || '').trim();
    if (!isLikelyConfiguredToken(configToken)) return;
    const runtimeToken = resolveNextiApiToken();
    if (runtimeToken && runtimeToken !== configToken) return;
    AppLogger.warn('Token Nexti configurado no frontend (config.js). Prefira injeção por runtime ou proxy backend.');
}

function validateFtSheetLaunchData(item) {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '').trim();
    const collabRe = normalizeFtRe(item.collabRe || '');
    const collabName = String(item.collabName || '').trim();
    const unitTarget = String(item.unitTarget || '').trim();
    const dateKey = normalizeFtDateKey(item.date || '');
    if (!id) return false;
    if (!collabRe && !collabName) return false;
    if (dateKey) item.date = dateKey;
    if (!['pending', 'submitted', 'launched'].includes(item.status)) {
        item.status = normalizeFtStatus(item.status);
    }
    if (!unitTarget && item.status === 'launched') return false;
    return true;
}

function validateTrocaSheetLaunchData(item) {
    if (!item || typeof item !== 'object') return false;
    const id = String(item.id || '').trim();
    const hasPeople = !!(normalizeFtRe(item.requesterRe || '') || normalizeFtRe(item.counterpartRe || '') || String(item.requesterName || '').trim() || String(item.counterpartName || '').trim());
    const hasUnit = !!String(item.unit || '').trim();
    if (!id) return false;
    if (!hasPeople && !hasUnit) return false;
    if (!['pending', 'submitted', 'launched'].includes(item.status)) {
        item.status = normalizeFtStatus(item.status);
    }
    return true;
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
    role: 'viewer', // 'viewer' | 'admin' | 'supervisor' | 'master'
    admins: []
};

const ROLE_LABELS = {
    master: 'Master',
    admin: 'Admin',
    supervisor: 'Supervisor',
    viewer: 'Colaborador'
};

const ROADMAP_ITEMS = [
    { title: 'Snapshot diário local + shadow', status: 'concluido', area: 'Segurança', detail: 'Restore point automático por dia com retenção local e envio silencioso para shadow.' },
    { title: 'Modo Comando (Ctrl+K)', status: 'concluido', area: 'Produtividade', detail: 'Atalho global para navegar telas e acionar rotinas sem trocar menu manualmente.' },
    { title: 'PWA leve para atalho no celular', status: 'concluido', area: 'Mobilidade', detail: 'Manifesto + Service Worker básico para instalação como app sem alterar o fluxo atual.' },
    { title: 'Ajuda contextual lateral', status: 'concluido', area: 'Usabilidade', detail: 'Mini-guia por tela, fixo na lateral, sem pop-up invasivo.' },
    { title: 'Foco diário em Lançamentos', status: 'concluido', area: 'Operação', detail: 'Aba Diária com visão de FT/Troca do dia e erros prioritários.' },
    { title: 'Alerta mensal de GID FT/Troca', status: 'concluido', area: 'Governança', detail: 'Lembrete automático para cadastrar nova aba mensal no config.js.' }
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
        gerencia: 'Gerência',
        supervisao: 'Supervisão',
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

function computeSearchFilterCounts(term = '') {
    const termUpper = String(term || '').toUpperCase().trim();
    const base = (currentData || []).filter(item => {
        if (!item) return false;
        if (hiddenUnits.has(item.posto)) return false;
        if (termUpper) {
            const matchesName = item.nome && item.nome.includes(termUpper);
            const matchesRe = item.re && item.re.includes(termUpper);
            const matchesUnit = item.posto && item.posto.includes(termUpper);
            if (!matchesName && !matchesRe && !matchesUnit) return false;
        }
        if (searchHideAbsence && item.rotulo) return false;
        return true;
    });
    const counts = { all: base.length, plantao: 0, folga: 0, ft: 0, afastado: 0, noAbsence: 0 };
    base.forEach(item => {
        const statusInfo = getStatusInfoForFilter(item);
        const text = String(statusInfo?.text || '');
        const isPlantao = text.includes('PLANTÃO') || text.includes('FT');
        if (isPlantao) counts.plantao += 1;
        if (!isPlantao) counts.folga += 1;
        if (text.includes('FT')) counts.ft += 1;
        if (item.rotulo) counts.afastado += 1;
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

function setSearchDateFilter(from, to) {
    searchDateFilter.from = '';
    searchDateFilter.to = '';
    const fromInput = document.getElementById('search-date-from');
    const toInput = document.getElementById('search-date-to');
    if (fromInput && fromInput.value !== '') fromInput.value = '';
    if (toInput && toInput.value !== '') toInput.value = '';
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

function toggleSubstituteSearchButton() {
    const enabled = !isSubstituteSearchEnabled();
    if (enabled && isAiSearchEnabled()) {
        localStorage.setItem('aiSearchEnabled', '0');
        updateAiSearchButton();
    }
    localStorage.setItem('substituteSearchEnabled', enabled ? '1' : '0');
    if (!enabled) {
        substituteTargetRe = '';
    } else if (substituteProximityMode === 'off') {
        substituteProximityMode = 'posto';
        try { localStorage.setItem('substituteProximityMode', substituteProximityMode); } catch {}
    } else if (searchFilterStatus === 'all') {
        searchFilterStatus = 'folga';
        updateSearchFilterUI();
    }
    updateSubstituteSearchButton();
    updateSubstitutePanel();
    realizarBusca();
}

function isSubstituteSearchEnabled() {
    return localStorage.getItem('substituteSearchEnabled') === '1';
}

function updateSubstituteSearchButton() {
    const btn = document.getElementById('substitute-search-btn');
    if (!btn) return;
    const enabled = isSubstituteSearchEnabled();
    btn.textContent = enabled ? 'Buscar substituto: ON' : 'Buscar substituto: OFF';
    btn.classList.toggle('active', enabled);
    btn.setAttribute('aria-pressed', enabled ? 'true' : 'false');
}

function getSubstituteTarget() {
    if (!substituteTargetRe) return null;
    return currentData.find(c => c.re === substituteTargetRe || c.re?.endsWith(substituteTargetRe))
        || (allCollaboratorsCache.items || []).find(c => c.re === substituteTargetRe || c.re?.endsWith(substituteTargetRe))
        || null;
}

function setSubstituteTarget(re) {
    if (!re) return;
    const target = currentData.find(c => c.re === re || c.re?.endsWith(re))
        || (allCollaboratorsCache.items || []).find(c => c.re === re || c.re?.endsWith(re));
    if (!target) {
        showToast("Colaborador não encontrado.", "error");
        return;
    }
    substituteTargetRe = target.re;
    if (substituteProximityMode === 'off') {
        substituteProximityMode = 'posto';
        try { localStorage.setItem('substituteProximityMode', substituteProximityMode); } catch {}
    }
    if (searchFilterStatus === 'all') {
        searchFilterStatus = 'folga';
        updateSearchFilterUI();
    }
    const input = document.getElementById('search-input');
    if (input) {
        input.value = '';
        input.focus();
    }
    updateSubstitutePanel();
    showToast(`Alvo fixado: ${target.nome} (RE ${target.re}).`, "success");
    realizarBusca();
}

function clearSubstituteTarget() {
    substituteTargetRe = '';
    updateSubstitutePanel();
    realizarBusca();
}

function setSubstituteProximity(mode) {
    substituteProximityMode = mode || 'off';
    try {
        localStorage.setItem('substituteProximityMode', substituteProximityMode);
    } catch {}
    updateSubstitutePanel();
    realizarBusca();
}

function updateSubstitutePanel() {
    const panel = document.getElementById('substitute-panel');
    if (!panel) return;
    const enabled = isSubstituteSearchEnabled();
    panel.classList.toggle('hidden', !enabled);
    const target = getSubstituteTarget();
    const nameEl = document.getElementById('substitute-target-name');
    const metaEl = document.getElementById('substitute-target-meta');
    const clearBtn = document.getElementById('substitute-clear-btn');
    if (nameEl) nameEl.textContent = target ? target.nome : 'Nenhum alvo fixado';
    if (metaEl) metaEl.textContent = target ? `RE ${target.re}${target.posto ? ` • ${target.posto}` : ''}` : '';
    if (clearBtn) clearBtn.disabled = !target;
    panel.classList.toggle('no-target', !target);
    panel.querySelectorAll('[data-prox]').forEach(btn => {
        const mode = btn.getAttribute('data-prox');
        const active = mode === substituteProximityMode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', active ? 'true' : 'false');
        btn.disabled = !target;
    });
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
        const unitJsAttr = escapeHtml(unitJs);
        const canEdit = SiteAuth.mode === 'edit';
        bar.innerHTML = `
            <div class="context-bar-inner">
                <div class="context-title">Unidade: <strong>${escapeHtml(unitName)}</strong></div>
                <div class="context-actions">
                    <button class="context-action" onclick="openAvisosForUnit(${unitJsAttr})">Avisos</button>
                    <button class="context-action" onclick="exportUnitPrompt(${unitJsAttr})">Exportar</button>
                    <button class="context-action" onclick="openEditUnitModal(${unitJsAttr})" ${canEdit ? '' : 'disabled'}>Editar</button>
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
        const nameJsAttr = escapeHtml(nameJs);
        const phoneJsAttr = escapeHtml(phoneJs);
        const unitJsAttr = escapeHtml(unitJs);
        const canEdit = SiteAuth.mode === 'edit';
        bar.innerHTML = `
            <div class="context-bar-inner">
                <div class="context-title">Colaborador: <strong>${escapeHtml(item.nome)}</strong> (${escapeHtml(item.re)})</div>
                <div class="context-actions">
                    <button class="context-action" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})">Contato</button>
                    <button class="context-action" onclick="navigateToUnit(${unitJsAttr})">Unidade</button>
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
    AppEventManager.on(document, 'click', (e) => {
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
            if (re && isSubstituteSearchEnabled() && !getSubstituteTarget()) {
                setSubstituteTarget(re);
                return;
            }
            if (re) setContextCollab(re);
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
        const storedInvert = localStorage.getItem('escalaInvertida');
        if (storedInvert !== null) escalaInvertida = storedInvert === '1';
    } catch {}
    try {
        const storedAutoMonth = localStorage.getItem('escalaInvertidaAutoMonth');
        if (storedAutoMonth !== null && storedAutoMonth !== '') {
            const parsed = parseInt(storedAutoMonth, 10);
            if (!Number.isNaN(parsed)) escalaInvertidaAutoMonth = parsed;
        }
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
    const existingSource = existing?.source === 'sheet' ? 1 : 0;
    const incomingSource = incoming?.source === 'sheet' ? 1 : 0;
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
    return Array.from(byKey.values())
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

function loadFtLaunches() {
    try {
        const stored = localStorage.getItem('ftLaunches');
        ftLaunches = stored ? JSON.parse(stored) || [] : [];
    } catch {
        ftLaunches = [];
    }
    ftLaunches = normalizeFtLaunchEntries(ftLaunches);
    if (ftRemovedIds.size) {
        ftLaunches = ftLaunches.filter(item => !ftRemovedIds.has(item.id));
    }
}

function saveFtLaunches(silent = false) {
    ftLaunches = normalizeFtLaunchEntries(ftLaunches);
    localStorage.setItem('ftLaunches', JSON.stringify(ftLaunches));
    scheduleShadowSync('ft', { silent, notify: !silent });
    updateLancamentosUI();
}

function loadFtRemovedIds() {
    try {
        const stored = localStorage.getItem('ftRemovedIds');
        const list = stored ? JSON.parse(stored) || [] : [];
        ftRemovedIds = new Set(list.filter(Boolean));
    } catch {
        ftRemovedIds = new Set();
    }
}

function saveFtRemovedIds(silent = false) {
    localStorage.setItem('ftRemovedIds', JSON.stringify(Array.from(ftRemovedIds)));
    scheduleShadowSync('ft-removed', { silent, notify: !silent });
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

function saveEscalaInvertida(silent = false) {
    localStorage.setItem('escalaInvertida', escalaInvertida ? '1' : '0');
    if (typeof escalaInvertidaAutoMonth === 'number') {
        localStorage.setItem('escalaInvertidaAutoMonth', String(escalaInvertidaAutoMonth));
    } else {
        localStorage.removeItem('escalaInvertidaAutoMonth');
    }
    scheduleShadowSync('escala-invertida', { silent, notify: !silent });
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
        } catch (err) {
            AppErrorHandler.capture(err, { scope: 'shadow-request-pull', action }, { silent: true });
        }
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
        ftRemovedIds: Array.from(ftRemovedIds),
        ftReasons,
        adminUsers: SiteAuth.admins,
        reciclagemTemplates,
        reciclagemOverrides,
        reciclagemHistory,
        reciclagemNotes,
        supervisaoMenu,
        supervisaoHistory,
        unitGeoCache,
        escalaInvertida,
        escalaInvertidaAutoMonth,
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
    if (Array.isArray(state.ftRemovedIds)) {
        state.ftRemovedIds.forEach(id => ftRemovedIds.add(id));
        saveFtRemovedIds(true);
    }
    if (Array.isArray(state.adminUsers)) {
        SiteAuth.admins = normalizeAdmins(state.adminUsers);
        saveAdmins(true);
        renderAdminList();
        updateAvisoAssigneeFilter();
        updateAvisoAssignees();
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
        reciclagemNotes = { ...reciclagemNotes, ...state.reciclagemNotes };
        saveReciclagemNotes(true);
    }
    if (state.supervisaoMenu && typeof state.supervisaoMenu === 'object') {
        supervisaoMenu = state.supervisaoMenu;
        ensureSupervisaoMenu();
        saveSupervisaoMenu(true, { skipShadow: true });
    }
    if (Array.isArray(state.supervisaoHistory)) {
        supervisaoHistory = state.supervisaoHistory;
        saveSupervisaoHistory(true, { skipShadow: true });
    }
    if (state.unitGeoCache && typeof state.unitGeoCache === 'object') {
        unitGeoCache = state.unitGeoCache;
        localStorage.setItem('unitGeoCache', JSON.stringify(unitGeoCache));
    }
    let shouldSaveEscala = false;
    if (typeof state.escalaInvertida === 'boolean') {
        escalaInvertida = state.escalaInvertida;
        shouldSaveEscala = true;
    }
    if (typeof state.escalaInvertidaAutoMonth === 'number') {
        escalaInvertidaAutoMonth = state.escalaInvertidaAutoMonth;
        shouldSaveEscala = true;
    }
    if (shouldSaveEscala) saveEscalaInvertida(true);
    if (Array.isArray(state.avisos)) {
        mergeAvisosFromShadow(state.avisos);
    }
    if (Array.isArray(state.ftLaunches)) {
        mergeFtLaunchesFromShadow(state.ftLaunches);
    }
    if (Array.isArray(state.localCollaborators)) {
        saveLocalCollaborators(state.localCollaborators, true);
    }
    renderEscalaInvertidaUI();
    if (document.getElementById('units-list')) {
        renderizarUnidades();
    }
    if (currentTab === 'busca' && document.getElementById('search-input')) {
        realizarBusca();
    }
    if (document.getElementById('supervisao-sections')) {
        renderSupervisao();
    }
    if (document.getElementById('supervisao-admin-list')) {
        renderSupervisaoAdminList();
        renderSupervisaoHistory();
    }
    saveLocalState(true);
    renderAuditList();
    updateAvisosUI();
}

function scheduleShadowSync(reason, options = {}) {
    if (!shadowEnabled()) return;
    if (!options.silent && options.notify !== false) shadowDirty = true;
    shadowSyncTimer = AppTimerManager.setTimeout(APP_TIMERS.shadowSync, () => {
        shadowSyncTimer = null;
        shadowPushAll(reason);
    }, 700);
}

function startShadowAutoPull() {
    if (!shadowEnabled()) return;
    shadowAutoPullTimer = AppTimerManager.setInterval(APP_TIMERS.shadowAutoPull, () => {
        shadowPullState(false);
    }, 90000);

    if (shadowAutoPullBound) return;
    AppEventManager.on(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            shadowPullState(false);
        }
    }, false, { scope: 'shadow', key: 'shadow-autopull-visibility' });
    shadowAutoPullBound = true;
}

async function shadowPullState(showToastOnFail = false) {
    if (!shadowEnabled()) return false;
    try {
        const result = await shadowRequest('pull');
        if (!result || !result.ok) throw new Error('Shadow pull failed');
        applyShadowState(result.state || {});
        applyAutoEscalaInvertida({ silent: true, notify: false });
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
        applyAutoEscalaInvertida({ silent: true, notify: false });
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
        if (shadowEnabled() && currentData?.length) {
            try {
                await shadowRequest('push_snapshot', {
                    snapshot: currentData,
                    group: currentGroup || 'todos',
                    reason: `auto-daily-${todayKey}`
                });
            } catch {}
        }
        if (notify) {
            showToast(`Snapshot diário criado (${todayKey}).`, 'success');
        }
        return true;
    } finally {
        dailySnapshotInProgress = false;
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
        saveAdmins(true, { skipShadow: true });
        return;
    }

    SiteAuth.admins = [
        { hash: btoa('7164:0547'), name: 'GUSTAVO CORTES BRAGA', re: '7164', role: 'master', master: true },
        { hash: btoa('4648:4643'), name: 'MOISÉS PEREIRA FERNANDES', re: '4648', role: 'admin' },
        { hash: btoa('3935:1288'), name: 'WAGNER MONTEIRO', re: '3935', role: 'admin' }
    ];

    saveAdmins(true);
}

function saveAdmins(silent = false, options = {}) {
    localStorage.setItem('adminUsers', JSON.stringify(SiteAuth.admins));
    if (options.skipShadow) return;
    if (shadowEnabled() && !shadowReady && !options.force) return;
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
            link: 'https://drive.google.com/file/d/1Iuo00MXbdO95vgAr-PSL95thvavragWB/view?usp=sharing',
            emailTo: 'dp@grupodunamis.com.br',
            emailSubject: 'Solicitação/Cancelamento de VT',
            channels: {
                whatsapp: `📩 VT – Aderir ou Cancelar\n\nOlá! Para aderir ou cancelar o Vale-Transporte, siga os passos abaixo:\n\n1) Preencha o formulário "Solicitação de VT" com todas as informações.\n2) No formulário, marque a opção desejada:\n- Opto pela utilização do Vale-Transporte (aderir)\n- NÃO opto pela utilização do Vale-Transporte (cancelar)\n\n🔗 Download do formulário:\nhttps://drive.google.com/file/d/1Iuo00MXbdO95vgAr-PSL95thvavragWB/view?usp=sharing\n\nApós o preenchimento, envie para:\n📧 dp@grupodunamis.com.br\n\nNo corpo do e-mail, informe:\nNome:\nRE:\nUnidade:\n\nAtenciosamente,\nGrupo Dunamis`,
                email: `Prezados(as),\n\nPara aderir ou cancelar o Vale-Transporte, siga as instruções abaixo:\n\n1) Preencha o formulário "Solicitação de VT" com todas as informações.\n2) No formulário, assinale a opção desejada:\n- Opto pela utilização do Vale-Transporte (aderir)\n- NÃO opto pela utilização do Vale-Transporte (cancelar)\n\nDownload do formulário:\nhttps://drive.google.com/file/d/1Iuo00MXbdO95vgAr-PSL95thvavragWB/view?usp=sharing\n\nApós o preenchimento, envie para dp@grupodunamis.com.br informando:\nNome completo:\nRE:\nUnidade:\n\nAtenciosamente,\nGrupo Dunamis`
            }
        },
        {
            id: 'colab_ferias',
            category: 'colab',
            type: 'message',
            title: 'Programação de férias',
            description: 'Formulário de férias para colaboradores.',
            link: 'https://wkf.ms/4n1kC8T',
            message: `👋 Prezados(as),\n\nPedimos que preencham o link de férias abaixo:\n🔗 https://wkf.ms/4n1kC8T\n\n📥 Favor assinar o recibo e enviar em PDF.\n\nAtenciosamente,\nGrupo Dunamis`
        },
        {
            id: 'colab_cracha',
            category: 'colab',
            type: 'message',
            title: 'Crachá com código de barras',
            description: 'Solicitação de crachá com código de barras.',
            link: 'https://wkf.ms/4eO1dW0',
            message: `👋 Prezados(as),\n\nPara solicitar o crachá com código de barras, preencha o link abaixo:\n🔗 https://wkf.ms/4eO1dW0\n\n📥 As informações serão analisadas e, após a confecção, o crachá será entregue no posto em até 30 dias.\nObs.: a solicitação deve ser feita após o término do período de experiência (90 dias).\n\nAtenciosamente,\nGrupo Dunamis`
        },
        {
            id: 'colab_reclamacao_salarial',
            category: 'colab',
            type: 'message',
            title: 'Reclamação salarial',
            description: 'Formulário de revisão salarial.',
            link: 'https://wkf.ms/4hcdd3n',
            message: `👋 Olá, tudo bem?\n\nPedimos que os questionamentos sobre revisão salarial sejam enviados pelo formulário abaixo:\n🔗 https://wkf.ms/4hcdd3n\n\nAs informações serão analisadas pela Coordenação e retornaremos em breve.\n\nAtenciosamente,\nGrupo Dunamis`
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
            message: `📌 Solicitação de FT\n\nPara solicitar FT, preencha o formulário:\nhttps://forms.gle/UKrZnFqFWYU4risGA`
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
            message: `📢 Olá!\n\nPor gentileza, envie um vídeo currículo pelo link:\n🔗 https://wkf.ms/3YqtzPm\n\n🕑 Tempo máximo: 2 minutos.\n\nExemplo de apresentação:\n🔗 https://youtube.com/shorts/9k_3tj4_hVE?feature=share\n\nBoa sorte!`
        },
        {
            id: 'colab_troca_folga',
            category: 'colab',
            type: 'message',
            title: 'Troca de folga',
            description: 'Formulário para troca de folga.',
            link: 'https://forms.gle/tWXgUt6koiZTXvEP7',
            message: `📌 Solicitação de troca de folga\n\nPreencha o formulário:\nhttps://forms.gle/tWXgUt6koiZTXvEP7`
        },
        {
            id: 'colab_exercicio_tecnico_fev_2026',
            category: 'colab',
            type: 'message',
            title: 'Exercício técnico – Fevereiro/2026',
            description: 'Avaliação mensal de fevereiro.',
            link: 'https://forms.gle/ekp5worSjxvmt6NSA',
            message: `📚 Exercício técnico - Fevereiro/2026\n\nSegue o link para a avaliação deste mês:\n🔗 https://forms.gle/ekp5worSjxvmt6NSA\n\nBoa sorte!\nCoordenação Dunamis`
        },
        {
            id: 'guide_nexti_1',
            category: 'guide',
            type: 'message',
            title: 'Nexti – Acesso (Etapa 1)',
            description: 'Primeira etapa de login no app Nexti.',
            images: ['images/login nexti1.jpeg'],
            message: `Bom dia!\n\nNa primeira etapa do app, aparecerá "Encontre sua empresa".\nDigite: empresarial.`
        },
        {
            id: 'guide_nexti_2',
            category: 'guide',
            type: 'message',
            title: 'Nexti – Acesso (Etapa 2)',
            description: 'Login e senha no app Nexti.',
            images: ['images/login nexti2.jpeg'],
            message: `Seu login é o CPF (sem pontos e traços).\nA senha são os 4 primeiros dígitos do CPF.\n\nExemplo:\nCPF 678.999.110-75\nLogin: 67899911075\nSenha: 6789`
        }
    ]
};

// Elementos DOM
const gateway = document.getElementById('gateway');
const appContainer = document.getElementById('app-container');
const appTitle = document.getElementById('app-title');
const APP_VERSION = 'v3.9.1';
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
            warnIfNextiTokenExposedInConfig();
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
            initAdmins();
            loadLocalState();
            hydrateManagedCachesFromLegacy();
            loadAvisos();
            loadFtRemovedIds();
            loadFtLaunches();
            refreshFtLabelsForToday();
            loadFtReasons();
            loadReciclagemTemplates();
            loadReciclagemOverrides();
            loadReciclagemHistory();
            loadReciclagemNotes();
            loadSupervisaoMenu();
            loadSupervisaoHistory();
            loadSupervisaoFavorites();
            loadSupervisaoUsage();
            loadSupervisaoChannelPrefs();
            loadReciclagemData(false);
            loadAuthFromStorage();
        });

        this._runStep('monitors', () => {
            startAutoEscalaMonitor();
            startReminderMonitor();
            startReciclagemAutoRefresh();
            startFtAutoSync();
            syncTrocaSheetLaunches(true);
            shadowPullState(false);
            startShadowAutoPull();
        });

        this._runStep('resources', () => {
            loadUnitAddressDb();
            loadCollaboratorAddressDb();
        });

        this._runStep('ui', () => {
            document.body.classList.add('on-gateway');
            renderGateway();
            document.getElementById('context-help-panel')?.remove();
            ensureCommandPalette();
            initSmartTooltips();
            registerPwaSupport();
            maybeShowMonthlyGidReminder();
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
    push('Abrir Unidades', 'unidades postos', () => openTabFromCommand('unidades'));
    push('Abrir Avisos', 'avisos pendencias lembretes', () => openTabFromCommand('avisos'));
    push('Abrir Reciclagem', 'reciclagem validade', () => openTabFromCommand('reciclagem'));
    push('Abrir Lançamentos', 'ft lancamentos diaria', () => openTabFromCommand('lancamentos'));
    push('Abrir Configuração', 'configuracao settings', () => openTabFromCommand('config'));
    push('Lançamentos • Aba Diária', 'lancamentos diaria foco dia', () => {
        openTabFromCommand('lancamentos', () => switchLancamentosTab('diaria'));
    });
    push('Lançamentos • Indicadores FT', 'lancamentos dashboard ft', () => {
        openTabFromCommand('lancamentos', () => switchLancamentosTab('dashboard'));
    });
    push('Lançamentos • Planejamento', 'lancamentos planejamento semanal mensal', () => {
        openTabFromCommand('lancamentos', () => switchLancamentosTab('planejamento'));
    });
    push('Lançamentos • Troca de folga', 'lancamentos troca erros', () => {
        openTabFromCommand('lancamentos', () => switchLancamentosMode('troca'));
    });
    push('Abrir Supervisão', 'supervisao menu links', () => openSupervisaoPage());
    push('Abrir Gerência', 'gerencia placeholder', () => openGerenciaPage());
    push('Voltar para Página Inicial', 'inicio home gateway', () => resetToGateway());
    push('Sincronizar Planilhas (FT + Troca)', 'sincronizar ft troca', () => syncLancamentosSheets());
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

// Botão de Scroll Top
window.onscroll = function() {
    const btn = document.getElementById("scroll-top-btn");
    if (document.body.scrollTop > 300 || document.documentElement.scrollTop > 300) {
        btn.classList.add("show");
    } else {
        btn.classList.remove("show");
    }
};

function openSupervisaoPage() {
    clearTabScopedTimers('supervisao');
    appContainer.style.display = 'block';
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    document.body.classList.remove('utility-open');
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
}

async function openGerenciaPage(options = {}) {
    clearTabScopedTimers('gerencia');
    appContainer.style.display = 'block';
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    document.body.classList.remove('utility-open');
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
                <div class="kpi-card"><div class="kpi-label">Taxa de lançamento</div><div class="kpi-value">${ftStats.launchRate}%</div><div class="kpi-sub">Eficiência no Nexti</div></div>
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
    userEl.textContent = SiteAuth.user || 'Admin';
    roleEl.textContent = roleLabel.toUpperCase();
    modeEl.textContent = modeLabel;
    modeEl.className = `status-badge-menu ${SiteAuth.mode === 'edit' ? 'edit' : 'view'}`;
}

function getSupervisaoAdminHtml() {
    const logged = SiteAuth.logged;
    const isAdmin = isAdminRole();
    const canEdit = canEditSupervisao();
    return `
        <details class="supervisao-admin-panel">
            <summary>Menu de edição</summary>
            <div class="supervisao-admin-body">
                ${!logged ? `
                    <div class="supervisao-admin-login">
                        <div class="field-row">
                            <label>RE (últimos 4)</label>
                            <input type="text" id="supervisao-login-re" maxlength="4" inputmode="numeric" placeholder="0000">
                        </div>
                        <div class="field-row">
                            <label>CPF (primeiros 4)</label>
                            <input type="password" id="supervisao-login-cpf" maxlength="4" inputmode="numeric" placeholder="0000">
                        </div>
                        <label class="keep-logged">
                            <input type="checkbox" id="supervisao-keep-logged"> Manter-me conectado
                        </label>
                        <div class="actions">
                            <button class="btn" onclick="loginSite({ source: 'supervisao', target: 'supervisao' })">Entrar</button>
                        </div>
                        <div class="hint">Somente administradores podem editar.</div>
                    </div>
                ` : `
                    <div class="supervisao-admin-status">
                        <div><span>Usuário</span><strong id="supervisao-admin-user">—</strong></div>
                        <div><span>Perfil</span><strong id="supervisao-admin-role">—</strong></div>
                        <div><span>Modo</span><strong id="supervisao-admin-mode" class="status-badge-menu view">VISUALIZAÇÃO</strong></div>
                    </div>
                    <div class="supervisao-admin-actions">
                        <button class="btn btn-secondary btn-small" onclick="toggleEditModeFromSupervisao()">Alternar modo</button>
                        <button class="btn btn-secondary btn-small" onclick="logoutSite({ target: 'supervisao' })">Sair</button>
                    </div>
                    ${!canEdit ? `<div class="hint">Para editar, esteja logado como admin e ative o modo edição.</div>` : ''}
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

function setAppTitle(title, suffix = '') {
    if (!appTitle) return;
    const extra = suffix ? ` ${suffix}` : '';
    appTitle.innerHTML = `${title} <span class="app-version">${APP_VERSION}</span>${extra}`;
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
                            <h2>Relatório Nexti por RE</h2>
                            <p>Organizador de relatório Nexti com foco em RE.</p>
                            <a href="https://gustauvm.pythonanywhere.com/" target="_blank">Abrir projeto →</a>
                        </div>
                        <div class="card">
                            <h2>Conversor de Planilhas</h2>
                            <p>Converta planilhas de movimentação diária com rapidez.</p>
                            <a href="https://dunamis.squareweb.app/" target="_blank">Abrir projeto →</a>
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

// 2. Carregar Dados (Integração Google Sheets)
async function loadGroup(groupKey) {
    setAppState('currentGroup', groupKey, { silent: true });
    
    // UI Feedback
    gateway.classList.add('hidden');
    document.body.classList.remove('on-gateway');
    appContainer.style.display = 'block';
    contentArea.innerHTML = '<div class="loading">Carregando dados do Google Sheets...</div>';

    await shadowPullState(false);
    await loadCollaboratorAddressDb();
    
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
            
            setAppState('currentData', items.map((item, idx) => ({ ...item, id: idx })), { silent: true });
            setAppState('lastUpdatedAt', new Date(), { silent: true });
            
            setAppTitle(`Gerenciamento de Efetivos - ${groupKey === 'todos' ? 'Geral' : groupKey.toUpperCase()}`, '(API)');
            renderDashboard();
            updateLastUpdatedDisplay();
            return;
        } catch (error) {
            AppErrorHandler.capture(error, { scope: 'load-group-nexti', groupKey });
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
    // Carregar dados de telefones e endereços
    const [phoneCsv, addressMap] = await Promise.all([
        fetchSheetData(CONFIG.sheets.phones),
        loadCollaboratorAddressDb()
    ]);
    const phoneMap = processPhoneData(phoneCsv);

    setAppState('currentData', [], { silent: true });
    
    if (groupKey === 'todos') {
        const keys = Object.keys(CONFIG.sheets).filter(k => k !== 'phones');
        const promises = keys.map(async (key) => {
            const csv = await fetchSheetData(CONFIG.sheets[key]);
            if (csv) {
                const rows = parseCSV(csv);
                if (rows.length > 0) rows.shift();
                // Vincula telefones automáticos para todos os grupos
                return mapRowsToObjects(rows, key, keepChanges, phoneMap, addressMap);
            }
            return [];
        });
        
        const results = await Promise.all(promises);
        let allItems = [];
        results.forEach(items => allItems = allItems.concat(items));

        allItems = mergeLocalCollaborators(allItems, 'todos');
        
        setAppState('currentData', allItems.map((item, idx) => ({ ...item, id: idx })), { silent: true });
        setAppState('lastUpdatedAt', new Date(), { silent: true });
        setAppTitle('Gerenciamento de Efetivos - Geral');
    } else {
        const csv = await fetchSheetData(CONFIG.sheets[groupKey]);
        if (csv) {
            const rows = parseCSV(csv);
            if (rows.length > 0) rows.shift();
            // Vincula telefones automáticos para todos os grupos
            let items = mapRowsToObjects(rows, groupKey, keepChanges, phoneMap, addressMap);
            items = mergeLocalCollaborators(items, groupKey);
            setAppState('currentData', items.map((item, idx) => ({ ...item, id: idx })), { silent: true });
            setAppState('lastUpdatedAt', new Date(), { silent: true });
        }
        setAppTitle(`Gerenciamento de Efetivos - ${groupKey.toUpperCase()}`);
    }

    renderDashboard();
    updateLastUpdatedDisplay();
    runDailySafetySnapshot();
}

// 3. Voltar ao Gateway
function resetToGateway() {
    clearTabScopedTimers('gateway');
    appContainer.style.display = 'none';
    gateway.classList.remove('hidden');
    document.body.classList.add('on-gateway');
    document.body.classList.remove('utility-open');
    setAppState('currentData', [], { silent: true });
    setAppState('currentGroup', '', { silent: true });
    hiddenUnits.clear();
    minimizedUnits.clear();
    // Não limpamos unitMetadata e collaboratorEdits aqui para permitir persistência na sessão
    updateLastUpdatedDisplay();
}

async function getAllCollaborators(force = false) {
    const ttl = 5 * 60 * 1000;
    if (!force) {
        const managed = getCachedAllCollaborators();
        if (managed) return managed;
        if (allCollaboratorsCache.items && (Date.now() - allCollaboratorsCache.updatedAt) < ttl) {
            setCachedAllCollaborators(allCollaboratorsCache.items, ttl);
            return allCollaboratorsCache.items;
        }
    }
    try {
        const [phoneCsv, addressMap] = await Promise.all([
            fetchSheetData(CONFIG.sheets.phones),
            loadCollaboratorAddressDb()
        ]);
        const phoneMap = processPhoneData(phoneCsv);
        const keys = Object.keys(CONFIG.sheets).filter(k => k !== 'phones');
        const results = await Promise.all(keys.map(async (key) => {
            const csv = await fetchSheetData(CONFIG.sheets[key]);
            if (!csv) return [];
            const rows = parseCSV(csv);
            if (rows.length > 0) rows.shift();
            return mapRowsToObjects(rows, key, false, phoneMap, addressMap);
        }));
        let allItems = [];
        results.forEach(items => allItems = allItems.concat(items));
        allItems = mergeLocalCollaborators(allItems, 'todos');
        const normalizedItems = allItems.map((item, idx) => ({ ...item, id: idx }));
        setCachedAllCollaborators(normalizedItems, ttl);
        allCollaboratorsCache = {
            items: normalizedItems,
            updatedAt: Date.now()
        };
        return allCollaboratorsCache.items;
    } catch (err) {
        AppErrorHandler.capture(err, { scope: 'all-collaborators-load' }, { silent: true });
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
            headers: getNextiAuthHeaders()
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
            const edited = { ...collaboratorEdits[re], grupo: groupTag };
            if (!edited.endereco) edited.endereco = getCollaboratorAddressByRe(re);
            if (!edited.cargo) edited.cargo = getCollaboratorRoleByRe(re);
            return edited;
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
            endereco: getCollaboratorAddressByRe(re),
            cargo: getCollaboratorRoleByRe(re),
            _nextiId: p.id // ID interno para busca de afastamentos
        };
    }).filter(validateCollaboratorData);
}

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
            turma: parseInt(cols[3]) || 1, // Padrão 1 se falhar, igual ao original
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
            headers: getNextiAuthHeaders()
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
            headers: getNextiAuthHeaders()
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
        AppErrorHandler.capture(e, { scope: 'nexti-events-for-date', date: String(date || '') }, { silent: true });
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
            headers: getNextiAuthHeaders()
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
        AppErrorHandler.capture(e, { scope: 'nexti-absence-situations' }, { silent: true });
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
                    headers: { 'Authorization': `Bearer ${resolveNextiApiToken()}` }
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
            } catch (err) {
                AppErrorHandler.capture(err, { scope: 'nexti-absences-item', personId: item?._nextiId || '' }, { silent: true });
            }
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
            const edited = { ...collaboratorEdits[re], grupo: groupTag };
            if (!edited.endereco) edited.endereco = getCollaboratorAddressByRe(re);
            if (!edited.cargo) edited.cargo = getCollaboratorRoleByRe(re);
            return edited;
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
            telefone: (p.phone || p.phone2 || '').replace(/\D/g, ''), // Usa telefone da API
            endereco: getCollaboratorAddressByRe(re),
            cargo: getCollaboratorRoleByRe(re)
        };
    }).filter(validateCollaboratorData);
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

function processPhoneData(csvText) {
    if (!csvText) return [];
    const rows = parseCSV(csvText);
    if (rows.length === 0) return [];

    // Tenta identificar colunas pelo cabeçalho
    const headers = rows[0].map(h => normalizeHeaderValue(h));
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

function processCollaboratorAddressData(csvText) {
    if (!csvText) return {};
    const rows = parseCSV(csvText);
    if (!rows.length) return {};

    let headerIndex = rows.findIndex(row => {
        const normalized = row.map(normalizeHeaderValue);
        const hasRe = normalized.some(h => h.includes('MATRICULA') || h === 'RE');
        const hasAddress = normalized.some(h => h.includes('ENDERECO'));
        return hasRe && hasAddress;
    });
    if (headerIndex < 0) headerIndex = 0;

    const headers = rows[headerIndex].map(normalizeHeaderValue);
    let idxRE = headers.findIndex(h => h.includes('MATRICULA') || h === 'RE');
    let idxAddress = headers.findIndex(h => h.includes('ENDERECO'));
    let idxRole = headers.findIndex(h => h.includes('CARGO') || h.includes('FUNCAO') || h.includes('FUNÇÃO'));

    if (idxRE === -1) idxRE = 8;
    if (idxAddress === -1) idxAddress = 10;
    if (idxRole === -1) idxRole = -1;

    const map = {};
    rows.slice(headerIndex + 1).forEach(cols => {
        const reRaw = cols[idxRE] || '';
        const address = (cols[idxAddress] || '').trim();
        const role = idxRole >= 0 ? (cols[idxRole] || '').trim().toUpperCase() : '';
        if (!validateAddressData({ re: reRaw, endereco: address, cargo: role })) return;
        const key = normalizeReKey(reRaw);
        if (!key) return;
        const current = map[key] || { address: '', role: '' };
        if (address) current.address = address;
        if (role) current.role = role;
        if (current.address || current.role) map[key] = current;
    });
    return map;
}

async function loadCollaboratorAddressDb(force = false) {
    if (collaboratorAddressLoaded && !force) return collaboratorAddressMap;
    const url = CONFIG?.addressSheets?.collaborators;
    if (!url) return collaboratorAddressMap;
    try {
        const csv = await fetchSheetData(url);
        if (csv) {
            collaboratorAddressMap = processCollaboratorAddressData(csv);
            collaboratorAddressLoaded = true;
            collaboratorAddressUpdatedAt = new Date();
        }
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
                    <button id="substitute-search-btn" class="ai-toggle" onclick="toggleSubstituteSearchButton()">Buscar substituto: OFF</button>
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
                <div id="substitute-panel" class="substitute-panel hidden">
                    <div class="substitute-target-row">
                        <div class="substitute-target-info">
                            <span class="substitute-label">Alvo</span>
                            <strong id="substitute-target-name">Nenhum alvo fixado</strong>
                            <span id="substitute-target-meta" class="substitute-target-meta"></span>
                        </div>
                        <button id="substitute-clear-btn" class="btn btn-secondary btn-small" onclick="clearSubstituteTarget()">Trocar alvo</button>
                    </div>
                    <div class="substitute-options">
                        <span class="substitute-label">Proximidade</span>
                        <button class="filter-chip" data-prox="off" onclick="setSubstituteProximity('off')">Sem</button>
                        <button class="filter-chip" data-prox="posto" onclick="setSubstituteProximity('posto')">Posto</button>
                        <button class="filter-chip" data-prox="endereco" onclick="setSubstituteProximity('endereco')">Endereço</button>
                        <button class="filter-chip" data-prox="rota" onclick="setSubstituteProximity('rota')">Rota (OSRM)</button>
                    </div>
                    <div class="hint">Busque o colaborador, clique para fixar o alvo e use os filtros para encontrar cobertura.</div>
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

        <div id="tab-content-lancamentos" class="tab-content hidden">
            <div class="lancamentos-shell">
                <div class="lancamentos-top">
                    <div class="lancamentos-title">
                        <h3 id="lancamentos-main-title">Lançamentos FT (Planilha Atual)</h3>
                        <div class="lancamentos-meta">
                            <span id="lancamentos-sync-status" class="lancamentos-sync-pill">Auto sync ativa</span>
                            <span class="lancamentos-last-sync">Última sync: <span id="lancamentos-last-sync">—</span></span>
                        </div>
                        <div class="lancamentos-mode-switch" id="lancamentos-mode-switch">
                            <button class="lancamentos-mode-btn active" data-mode="ft" onclick="switchLancamentosMode('ft')">FT</button>
                            <button class="lancamentos-mode-btn" data-mode="troca" onclick="switchLancamentosMode('troca')">Troca de folga</button>
                        </div>
                    </div>
                    <div class="lancamentos-actions menu-actions-row">
                        <div id="lancamentos-actions-ft" class="lanc-action-group">
                            <button class="btn btn-secondary btn-small" onclick="syncLancamentosSheets()" ${canManageLancamentos ? '' : 'disabled'}>Sincronizar planilhas</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('diaria')">Diária FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('dashboard')">Indicadores FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('historico')">Histórico FT</button>
                            <button class="btn btn-secondary btn-small" onclick="switchLancamentosTab('planejamento')">Planejamento FT</button>
                        </div>
                        <div id="lancamentos-actions-troca" class="lanc-action-group hidden">
                            <button class="btn btn-secondary btn-small" onclick="syncTrocaSheetLaunches(false)" ${canManageLancamentos ? '' : 'disabled'}>Sincronizar trocas</button>
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
                            <button class="config-tab active" onclick="switchConfigTab('access', this)">Acesso</button>
                            <button class="config-tab" onclick="switchConfigTab('datasource', this)">Fonte de Banco de Dados</button>
                            <button class="config-tab" onclick="switchConfigTab('ft', this)">FT</button>
                            <button class="config-tab" onclick="switchConfigTab('supervisao', this)">Supervisão</button>
                        </div>

                    <div id="config-pane-access" class="config-pane">
                        <div class="config-section">
                            <div class="config-section-title">Acesso e permissões</div>
                            <div class="config-grid">
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
                        </div>

                    </div>

                    <div id="config-pane-datasource" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Visão geral</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Resumo da Base</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="config-summary" class="config-summary"></div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Ações rápidas</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="reloadCurrentGroupData()">Recarregar dados</button>
                                            <button class="btn btn-secondary" onclick="openExportModal()">Exportar base</button>
                                            <button class="btn btn-secondary" onclick="shadowPullAndReload()">Aplicar shadow agora</button>
                                        </div>
                                        <div class="config-note">Use estes atalhos para atualizar a base, exportar relatórios e aplicar alterações do shadow rapidamente.</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Fontes e validação</div>
                            <div class="config-grid">
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
                                        <div class="card-title">Validador de planilhas</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="validator-controls">
                                            <div class="form-group">
                                                <label>Fonte</label>
                                                <select id="sheet-validator-select"></select>
                                            </div>
                                            <div class="form-group">
                                                <label>Ações</label>
                                                <div class="actions">
                                                    <button class="btn btn-secondary" onclick="validateSelectedSheet()">Validar</button>
                                                    <button class="btn btn-secondary" onclick="clearSheetValidator()">Limpar</button>
                                                </div>
                                            </div>
                                        </div>
                                        <div id="sheet-validator-status" class="validator-status"></div>
                                        <div id="sheet-validator-preview" class="validator-preview"></div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Roadmap de melhorias</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note">Status vivo das evoluções priorizadas para a operação.</div>
                                        <div id="roadmap-list" class="roadmap-list"></div>
                                    </div>
                                </div>

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
                            </div>
                        </div>

                        <div class="config-section">
                            <div class="config-section-title">Operação</div>
                            <div class="config-grid">
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

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Escala de Plantão</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="field-row">
                                            <label>Inversão manual</label>
                                            <div class="actions">
                                                <button class="btn btn-secondary" onclick="toggleEscalaInvertida()">Inverter plantão</button>
                                                <span id="escala-invertida-status" class="status-badge-menu view">Padrão</span>
                                            </div>
                                        </div>
                                        <div class="config-note">Ajuste automático: o sistema aplica a inversão no início de meses pares. O botão serve como correção manual quando necessário.</div>
                                        <div class="config-note">Quando ativado, a turma 1 passa a trabalhar nos dias pares e a turma 2 nos dias ímpares. Afeta busca rápida, dashboards e exportações.</div>
                                    </div>
                                </div>

                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Histórico recente</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div id="auditList" class="audit-list"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div id="config-pane-ft" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Padrões de FT</div>
                            <div class="config-grid">
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

                    <div id="config-pane-supervisao" class="config-pane hidden">
                        <div class="config-section">
                            <div class="config-section-title">Menu de supervisão</div>
                            <div class="config-grid">
                                <div class="config-card">
                                    <div class="config-card-header">
                                        <div class="card-title">Editor</div>
                                        <button class="card-toggle" onclick="toggleConfigCard(this)" aria-label="Recolher">${ICONS.chevronUp}</button>
                                    </div>
                                    <div class="config-card-body">
                                        <div class="config-note">O editor de Supervisão agora fica na página inicial.</div>
                                        <div class="actions">
                                            <button class="btn btn-secondary" onclick="openSupervisaoPage()">Abrir Supervisão</button>
                                        </div>
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
                                    <li>Use o sistema para visualizar escalas, unidades, avisos, reciclagem e lançamentos de FT.</li>
                                    <li>Perfis com permissão (admin/supervisor) liberam ações de edição e lançamentos.</li>
                                    <li>Se estiver em modo visualização, você poderá navegar e consultar, mas não salvar alterações.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>2. Navegação principal</h4>
                                <ol>
                                    <li>Use as abas superiores para trocar entre Busca Rápida, Unidades, Avisos, Reciclagem, Lançamentos e Configuração.</li>
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
                                    <li>Os rótulos e detalhes de unidade refletem o shadow e o histórico local.</li>
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
                                <h4>6. Avisos e lembretes</h4>
                                <ol>
                                    <li>Admins podem criar avisos gerais e lembretes direcionados por grupo ou RE.</li>
                                    <li>Colaboradores visualizam apenas avisos atribuídos ao próprio RE.</li>
                                    <li>Use filtros por status e grupo para localizar comunicados com rapidez.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>7. Lançamentos de FT – Dashboard</h4>
                                <ol>
                                    <li>Use o filtro de período e status no topo para ajustar os indicadores.</li>
                                    <li>Consulte os KPIs de pendências, confirmadas e lançadas.</li>
                                    <li>Analise os relatórios por unidade, colaborador, motivo, turno e dia da semana.</li>
                                    <li>Verifique pendências recentes e qualidade dos dados para correções rápidas.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>8. Lançamentos de FT – Histórico</h4>
                                <ol>
                                    <li>Use busca local, filtros por unidade e colaborador e ordenação para encontrar o lançamento certo.</li>
                                    <li>Ative "Agrupar por dia" para organizar por data da FT.</li>
                                    <li>Clique em "Ver detalhes" para ver datas, motivo detalhado, solicitação e responsável.</li>
                                    <li>Use Copiar link, WhatsApp, Marcar lançado e Remover conforme o status do lançamento.</li>
                                    <li>Exportar histórico gera um XLSX com os filtros aplicados.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>9. Lançamentos de FT – Novo</h4>
                                <ol>
                                    <li>Busque o colaborador, confirme a unidade atual e selecione a unidade da FT.</li>
                                    <li>Use "Sugerir por proximidade" para indicar quem está de folga.</li>
                                    <li>Informe data, escala, motivo e o colaborador coberto.</li>
                                    <li>Após salvar, copie ou envie o link de confirmação ao colaborador.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>10. Reciclagem</h4>
                                <ol>
                                    <li>Use filtros por planilha, status e pesquisa para localizar colaboradores.</li>
                                    <li>O resumo mostra vencidos, a vencer, em dia e sem informação.</li>
                                    <li>Edite registros quando necessário e use o relatório exportável.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>11. Configuração e Shadow</h4>
                                <ol>
                                    <li>Verifique as fontes de dados (planilhas, forms e reciclagem) e mantenha as URLs atualizadas.</li>
                                    <li>O shadow mantém as alterações globais; aplique e sincronize sempre que necessário.</li>
                                    <li>Use os atalhos rápidos para recarregar base, exportar dados e aplicar shadow.</li>
                                    <li>Em FT, revise motivos e permissões de lançamento.</li>
                                </ol>
                            </div>
                            <div class="help-section">
                                <h4>12. Exportações e relatórios</h4>
                                <ol>
                                    <li>Use o menu de exportação para baixar base atualizada, resumos, históricos e PDFs.</li>
                                    <li>Relatórios de FT e reciclagem podem ser exportados com filtros aplicados.</li>
                                    <li>Antes de enviar, valide se o shadow está sincronizado e com status OK.</li>
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
        const onSuggest = () => handleSearchTokenSuggest();
        searchInput.addEventListener('input', () => {
            onSuggest();
            if (searchInputComposing) return;
            scheduleSearchExecution();
        });
        searchInput.addEventListener('compositionstart', () => {
            searchInputComposing = true;
        });
        searchInput.addEventListener('compositionend', () => {
            searchInputComposing = false;
            onSuggest();
            scheduleSearchExecution();
        });
        searchInput.addEventListener('change', () => {
            onSuggest();
            flushSearchExecution();
        });
        searchInput.addEventListener('click', onSuggest);
        searchInput.addEventListener('keyup', (ev) => {
            onSuggest();
            if (ev.key === 'Enter') flushSearchExecution();
        });
    }
    const searchDateFrom = document.getElementById('search-date-from');
    const searchDateTo = document.getElementById('search-date-to');
    if (searchDateFrom && searchDateTo) {
        const onSearchDateChange = () => setSearchDateFilter(searchDateFrom.value, searchDateTo.value);
        searchDateFrom.addEventListener('change', onSearchDateChange);
        searchDateTo.addEventListener('change', onSearchDateChange);
    }
    searchDateFilter = { from: '', to: '' };

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
    initAvisosFilters();
    updateAvisosUI();
}

function switchTab(tabName) {
    if (tabName === 'avisos' && !SiteAuth.logged) {
        showToast("Faça login para acessar os avisos.", "error");
        return;
    }
    clearTabScopedTimers(tabName);
    setAppState('currentTab', tabName, { silent: true });
    
    // Atualiza botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (typeof event !== 'undefined' && event?.target) {
        event.target.classList.add('active');
    } else {
        document.querySelector(`.tab-btn[onclick="switchTab('${tabName}')"]`)?.classList.add('active');
    }

    // Atualiza conteúdo
    document.getElementById('tab-content-busca')?.classList.add('hidden');
    document.getElementById('tab-content-unidades')?.classList.add('hidden');
    document.getElementById('tab-content-supervisao')?.classList.add('hidden');
    document.getElementById('tab-content-avisos')?.classList.add('hidden');
    document.getElementById('tab-content-reciclagem')?.classList.add('hidden');
    document.getElementById('tab-content-lancamentos')?.classList.add('hidden');
    document.getElementById('tab-content-config')?.classList.add('hidden');
    
    document.getElementById(`tab-content-${tabName}`)?.classList.remove('hidden');

    if (tabName === 'config' && !SiteAuth.logged) {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    if (tabName === 'busca') {
        document.getElementById('search-input').focus();
        realizarBusca();
    }
    if (tabName === 'unidades') {
        renderizarUnidades();
    }
    if (tabName === 'avisos') {
        renderAvisos();
    }
    if (tabName === 'reciclagem') {
        renderReciclagem();
    }
    if (tabName === 'lancamentos') {
        renderLancamentos();
    }

    clearContextBar();
    updateBreadcrumb();
}

function renderEscalaInvertidaUI() {
    const statusEl = document.getElementById('escala-invertida-status');
    if (!statusEl) return;
    statusEl.textContent = escalaInvertida ? 'Invertido' : 'Padrão';
    statusEl.className = `status-badge-menu ${escalaInvertida ? 'edit' : 'view'}`;
}

function getCurrentMonthNumber() {
    return new Date().getMonth() + 1; // 1-12
}

function getDesiredEscalaInvertida(monthNumber) {
    return monthNumber % 2 === 0; // meses pares invertem
}

function applyAutoEscalaInvertida(options = {}) {
    const month = getCurrentMonthNumber();
    if (escalaInvertidaAutoMonth === month) return;
    const desired = getDesiredEscalaInvertida(month);
    escalaInvertida = desired;
    escalaInvertidaAutoMonth = month;
    saveEscalaInvertida(options.silent);
    renderEscalaInvertidaUI();
    if (document.getElementById('units-list')) {
        renderizarUnidades();
    }
    if (currentTab === 'busca' && document.getElementById('search-input')) {
        realizarBusca();
    }
    if (options.notify) {
        showToast(`Escala ajustada automaticamente para ${desired ? 'invertida' : 'padrão'}.`, 'success');
    }
}

function startAutoEscalaMonitor() {
    if (!shadowEnabled() || shadowReady) {
        applyAutoEscalaInvertida({ silent: true, notify: false });
    }
    autoEscalaTimer = AppTimerManager.setInterval(APP_TIMERS.autoEscala, () => {
        applyAutoEscalaInvertida({ silent: true, notify: false });
    }, 60 * 60 * 1000);

    if (autoEscalaBound) return;
    AppEventManager.on(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            applyAutoEscalaInvertida({ silent: true, notify: false });
        }
    }, false, { scope: 'auto-escala', key: 'auto-escala-visibility' });
    autoEscalaBound = true;
}

function toggleEscalaInvertida() {
    if (!isAdminRole()) return;
    escalaInvertida = !escalaInvertida;
    escalaInvertidaAutoMonth = getCurrentMonthNumber();
    saveEscalaInvertida();
    renderEscalaInvertidaUI();
    renderizarUnidades();
    if (currentTab === 'busca') realizarBusca(document.getElementById('search-input')?.value || '');
    showToast(escalaInvertida ? 'Escala invertida ativada.' : 'Escala invertida desativada.', 'success');
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
    document.getElementById('config-pane-access').classList.add('hidden');
    document.getElementById('config-pane-datasource').classList.add('hidden');
    document.getElementById('config-pane-ft')?.classList.add('hidden');
    document.getElementById('config-pane-supervisao')?.classList.add('hidden');
    document.getElementById(`config-pane-${tabName}`)?.classList.remove('hidden');

    if (tabName === 'supervisao') {
        renderSupervisaoAdminList();
        renderSupervisaoHistory();
        updateSupervisaoEditorVisibility();
    }
}

// 5. Lógica da Busca Rápida
function realizarBusca() {
    const termo = document.getElementById('search-input').value;
    const filterStatus = searchFilterStatus || 'all';
    const hideAbsence = !!searchHideAbsence;
    const resultsContainer = document.getElementById('search-results');
    updateSearchFilterUI();

    if (isSubstituteSearchEnabled()) {
        runSubstituteSearch(termo, resultsContainer, filterStatus, hideAbsence);
        return;
    }
    
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
        resultsContainer.innerHTML = `<p class="empty-state">Nenhum resultado encontrado.</p>`;
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
        const ftDetailHtml = buildFtDetailsHtml(item.re);
        const ftWeekPreview = buildFtWeekPreviewHtmlForRe(item.re);
        const recSummary = getReciclagemSummaryForCollab(item.re, item.nome);
        const recIcon = recSummary
            ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
            : '';
        const roleLabel = getCollaboratorRoleLabel(item);
        const reJs = JSON.stringify(item.re || '');
        const nameJs = JSON.stringify(item.nome || '');
        const phoneJs = JSON.stringify(item.telefone || '');
        const unitJs = JSON.stringify(item.posto || '');
        const reJsAttr = escapeHtml(reJs);
        const nameJsAttr = escapeHtml(nameJs);
        const phoneJsAttr = escapeHtml(phoneJs);
        const unitJsAttr = escapeHtml(unitJs);
        const postoLabel = escapeHtml(item.posto || 'N/I');
        const hasAddress = !!getAddressForCollaborator(item);
        const canOpenMap = !!(item.re || item.nome || item.posto);
        const mapBtnClass = canOpenMap
            ? (hasAddress ? '' : 'map-icon-missing')
            : 'disabled-icon';
        const mapTitle = !canOpenMap
            ? 'Colaborador indisponível'
            : (hasAddress ? 'Ver endereço do colaborador' : 'Endereço não cadastrado no nexti');
        
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
                        <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${reJsAttr}, ${nameJsAttr})" title="Performance do colaborador">${ICONS.performance}</button>
                        <button class="edit-btn-icon map-icon ${mapBtnClass}" onclick="openAddressModalForCollaborator(${reJsAttr}, ${nameJsAttr}, ${unitJsAttr})" title="${mapTitle}" ${canOpenMap ? '' : 'disabled'}>${ICONS.mapPin}</button>
                        <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                        <button class="edit-btn-icon" onclick="openEditModal(${item.id})">${ICONS.edit}</button>
                    </div>
                </div>
                <div class="card-details-grid">
                    <div class="card-info-line"><strong>RE:</strong> ${item.re}</div>
                    <div class="card-info-line"><strong>Posto:</strong> <span class="unit-link" onclick="navigateToUnit(${unitJsAttr})">${postoLabel}</span></div>
                    <div class="card-info-line"><strong>Grupo:</strong> ${item.grupoLabel || 'N/I'}</div>
                    <div class="card-info-line"><strong>Cargo:</strong> ${escapeHtml(roleLabel)}</div>
                    <div class="card-info-line"><strong>Escala:</strong> ${item.tipoEscala ? `<span class="scale-badge">${item.tipoEscala}</span>` : ''}</div>
                    <div class="card-info-line">   
                        <strong>Horário:</strong> ${item.escala || 'N/I'} 
                        ${turnoInfo ? `<div style="margin-top: 4px;">${turnoInfo}</div>` : ''}
                    </div>
                    ${ftRelationHtml}
                    ${ftDetailHtml}
                    ${ftWeekPreview}
                </div>
            </div>
        `;
    }).join('');
}

function buildSubstituteReason(candidate, target, options = {}) {
    const statusInfo = options.statusInfoOverride || getStatusInfo(candidate);
    const status = statusInfo.text;
    const parts = [];
    if (status.includes('FOLGA')) parts.push('está de folga hoje');
    if (candidate.posto && target.posto && normalizeUnitKey(candidate.posto) === normalizeUnitKey(target.posto)) {
        parts.push(`atua na mesma unidade (${candidate.posto})`);
    }
    const distValue = candidate._routeDistanceKm ?? candidate._distanceKm;
    const dist = formatDistanceKm(distValue);
    if (dist) {
        const mode = options.proximityMode || 'posto';
        const label = mode === 'endereco' || mode === 'rota'
            ? `endereço do colaborador RE ${target.re}`
            : `unidade do colaborador RE ${target.re}`;
        const routeTag = candidate._routeDistanceKm != null ? ' (rota)' : '';
        parts.push(`está a ~${dist} km${routeTag} da ${label}`);
    }
    if (!parts.length) parts.push('disponibilidade verificada pela escala e status atual');
    return `Motivo: ${parts.join(' e ')}.`;
}

function getMapsLocationForCollab(collab, modeUsed) {
    if (!collab) return '';
    if (modeUsed === 'endereco' || modeUsed === 'rota') {
        const addr = getAddressForCollaborator(collab);
        if (addr) return addr;
    }
    const unitAddr = getAddressForUnit(collab.posto);
    if (unitAddr) return unitAddr;
    return collab.posto || '';
}

function buildSubstituteActionHtml(candidate, target, modeUsed) {
    const candRe = candidate?.re || '';
    const targetRe = target?.re || '';
    return `
        <button class="btn btn-secondary btn-small" onclick="openSubstituteRouteModal('${candRe}', '${targetRe}', '${modeUsed}')">
            Rota (mapa)
        </button>
    `;
}

async function getProximityTargetCoords(target, mode) {
    const baseMode = mode === 'rota' ? 'endereco' : mode;
    if (baseMode === 'posto') {
        const coords = await getCoordsForUnit(target.posto);
        if (coords) return { coords, modeUsed: mode, baseMode, note: null };
        const fallbackAddress = getAddressForCollaborator(target);
        const fallbackCoords = await getCoordsForAddress(fallbackAddress);
        if (fallbackCoords) return { coords: fallbackCoords, modeUsed: mode, baseMode, note: 'fallback_endereco' };
        return { coords: null, modeUsed: mode, baseMode, note: 'no_target_coords' };
    }
    if (baseMode === 'endereco') {
        const address = getAddressForCollaborator(target);
        const coords = await getCoordsForAddress(address);
        if (coords) return { coords, modeUsed: mode, baseMode, note: null };
        const fallback = await getCoordsForUnit(target.posto);
        if (fallback) return { coords: fallback, modeUsed: mode, baseMode, note: 'fallback_unit' };
        return { coords: null, modeUsed: mode, baseMode, note: 'no_target_coords' };
    }
    return { coords: null, modeUsed: 'off', baseMode: 'off', note: 'off' };
}

async function sortCandidatesByProximity(list, target, mode) {
    const targetInfo = await getProximityTargetCoords(target, mode);
    const cfg = getOsrmConfig();
    const osrmWanted = mode === 'rota';
    const useOsrm = osrmWanted && cfg.enabled;
    if (!targetInfo.coords) {
        list.forEach(item => { if (item._distanceKm != null) delete item._distanceKm; });
        return { list, note: targetInfo.note || 'no_target_coords', modeUsed: targetInfo.modeUsed, osrmNote: osrmWanted && !cfg.enabled ? 'unavailable' : (useOsrm ? 'unavailable' : '') };
    }

    const withDistance = [];
    const withoutDistance = [];
    const baseMode = targetInfo.baseMode || (mode === 'rota' ? 'endereco' : mode);
    for (const cand of list) {
        let coords = null;
        if (cand._routeDistanceKm != null) delete cand._routeDistanceKm;
        if (cand._routeDurationMin != null) delete cand._routeDurationMin;
        if (cand._coords) delete cand._coords;
        if (baseMode === 'posto') {
            coords = await getCoordsForUnit(cand.posto);
            if (coords) {
                cand._distanceSource = 'posto';
            } else {
                const fallbackAddr = getAddressForCollaborator(cand);
                if (fallbackAddr) {
                    coords = await getCoordsForAddress(fallbackAddr);
                    if (coords) cand._distanceSource = 'endereco';
                }
            }
        } else {
            const address = getAddressForCollaborator(cand);
            if (address) {
                coords = await getCoordsForAddress(address);
                if (coords) {
                    cand._distanceSource = 'endereco';
                }
            }
            if (!coords) {
                coords = await getCoordsForUnit(cand.posto);
                if (coords) cand._distanceSource = 'posto';
            }
        }
        if (!coords) {
            if (cand._distanceKm != null) delete cand._distanceKm;
            if (cand._distanceSource) delete cand._distanceSource;
            withoutDistance.push(cand);
            continue;
        }
        cand._coords = coords;
        cand._distanceKm = calcDistanceKm(targetInfo.coords, coords);
        withDistance.push(cand);
    }

    withDistance.sort((a, b) => a._distanceKm - b._distanceKm);
    let osrmNote = osrmWanted && !cfg.enabled ? 'unavailable' : '';
    if (useOsrm && withDistance.length) {
        const osrmTargets = withDistance.slice(0, cfg.maxCandidates).filter(c => c._coords);
        const table = await fetchOsrmTable(targetInfo.coords, osrmTargets.map(c => c._coords));
        if (table && table.distances?.length) {
            osrmTargets.forEach((cand, idx) => {
                const dist = table.distances[idx];
                const dur = table.durations?.[idx];
                if (Number.isFinite(dist)) cand._routeDistanceKm = dist / 1000;
                if (Number.isFinite(dur)) cand._routeDurationMin = dur / 60;
            });
            withDistance.sort((a, b) => {
                const da = a._routeDistanceKm ?? a._distanceKm ?? Infinity;
                const db = b._routeDistanceKm ?? b._distanceKm ?? Infinity;
                return da - db;
            });
            osrmNote = 'ok';
        } else {
            osrmNote = 'fail';
        }
    }
    const note = withDistance.length
        ? (withoutDistance.length ? 'partial' : (targetInfo.note || 'ok'))
        : 'no_candidates_coords';
    return { list: withDistance.concat(withoutDistance), note, modeUsed: targetInfo.modeUsed, osrmNote };
}

function buildSubstituteMetaCard(target, modeUsed, note, total, filterStatus, hideAbsence, osrmNote = '', dateRange = null) {
    let proximityLabel = 'Desligada';
    if (modeUsed === 'posto') proximityLabel = 'Posto de trabalho';
    if (modeUsed === 'endereco') proximityLabel = 'Endereço do colaborador';
    if (modeUsed === 'rota') proximityLabel = 'Rota real (OSRM)';

    let noteText = '';
    if (note === 'fallback_unit') noteText = 'Endereço do alvo indisponível; usando posto de trabalho.';
    if (note === 'fallback_endereco') noteText = 'Posto do alvo indisponível; usando endereço do colaborador.';
    if (note === 'no_target_coords') noteText = 'Não consegui localizar o alvo para calcular distância; exibindo sem distância.';
    if (note === 'no_candidates_coords') noteText = 'Não consegui geocodificar candidatos; exibindo sem distância.';
    if (note === 'partial') noteText = 'Alguns candidatos sem endereço/geo; listados por último.';
    if (modeUsed === 'rota' && osrmNote === 'fail') noteText = 'OSRM indisponível; usando distância estimada (Haversine).';
    if (modeUsed === 'rota' && osrmNote === 'unavailable') noteText = 'OSRM desativado; usando distância estimada (Haversine).';

    const unitInfo = target.posto ? ` • ${target.posto}` : '';
    const filterLabelMap = {
        all: 'Todos',
        plantao: 'Plantão',
        folga: 'Folga',
        ft: 'FT',
        afastado: 'Afastados'
    };
    const filterLabel = filterLabelMap[filterStatus] || 'Todos';
    const hideLabel = hideAbsence ? ' | Sem afastamento' : '';
    const normalizedRange = dateRange ? normalizeDateRange(dateRange.from, dateRange.to) : { from: '', to: '' };
    const dateLabel = hasDateRangeFilter(normalizedRange)
        ? ` • Data FT: ${normalizedRange.from || '...'} até ${normalizedRange.to || '...'}`
        : '';
    return `
        <div class="result-card">
            <h4>Buscar substituto</h4>
            <div class="meta">Alvo: ${target.nome} (RE ${target.re})${unitInfo}. Proximidade: ${proximityLabel}.</div>
            ${noteText ? `<div class="meta">${noteText}</div>` : ''}
            <div class="meta">Filtro: ${filterLabel}${hideLabel}${dateLabel}.</div>
            <div class="meta">Resultados: ${total}</div>
        </div>
    `;
}

function normalizeSubstituteRe(value) {
    return String(value || '').replace(/\D/g, '');
}

function getSubstituteAvailabilityBucket(statusText) {
    const normalized = normalizeText(statusText || '');
    if (normalized.includes('ferias') || normalized.includes('atestado') || normalized.includes('afastado')) return 'away';
    if (normalized.includes('folga')) return 'folga';
    if (normalized.includes('ft')) return 'ft';
    if (normalized.includes('plantao')) return 'plantao';
    return 'unknown';
}

function buildSubstituteCoverageStatsMap(target) {
    const targetUnit = normalizeUnitKey(target?.posto || '');
    const map = new Map();
    getFtOperationalItems(ftLaunches).forEach(item => {
        const reNorm = normalizeSubstituteRe(item?.collabRe || item?.re || '');
        if (!reNorm) return;
        const unitNorm = normalizeUnitKey(item?.unitTarget || item?.unitCurrent || '');
        const dateKey = normalizeFtDateKey(item?.date || '');
        const prev = map.get(reNorm) || { total: 0, sameUnit: 0, lastDate: '' };
        prev.total += 1;
        if (targetUnit && unitNorm && unitNorm === targetUnit) prev.sameUnit += 1;
        if (dateKey && (!prev.lastDate || dateKey > prev.lastDate)) prev.lastDate = dateKey;
        map.set(reNorm, prev);
    });
    return map;
}

function getSubstituteCoverageStats(re, coverageMap) {
    const reNorm = normalizeSubstituteRe(re);
    if (!reNorm || !coverageMap?.has(reNorm)) {
        return { total: 0, sameUnit: 0, lastDate: '' };
    }
    return coverageMap.get(reNorm);
}

function buildSubstituteRecommendation(candidate, target, modeUsed, coverageMap) {
    const statusInfo = candidate._statusInfoSnapshot || getStatusInfo(candidate);
    const availability = getSubstituteAvailabilityBucket(statusInfo.text);
    const highlights = [];
    const cautions = [];
    let score = 45;

    if (availability === 'folga') {
        score += 28;
        highlights.push('folga hoje');
    } else if (availability === 'plantao') {
        score -= 24;
        cautions.push('já em plantão');
    } else if (availability === 'ft') {
        score -= 18;
        cautions.push('já em FT');
    } else if (availability === 'away') {
        score -= 60;
        cautions.push('afastamento ativo');
    } else {
        cautions.push('status sem confirmação');
    }

    const sameUnit = candidate.posto && target.posto && normalizeUnitKey(candidate.posto) === normalizeUnitKey(target.posto);
    if (sameUnit) {
        score += 18;
        highlights.push('mesma unidade do alvo');
    }
    if (candidate.grupo && target.grupo && candidate.grupo === target.grupo) {
        score += 6;
        highlights.push('mesmo grupo');
    }

    const distance = candidate._routeDistanceKm ?? candidate._distanceKm;
    if (Number.isFinite(distance)) {
        if (distance <= 5) score += 18;
        else if (distance <= 10) score += 12;
        else if (distance <= 20) score += 6;
        else if (distance > 35) score -= 8;
        highlights.push(`proximidade ${formatDistanceKm(distance)} km`);
    } else if (modeUsed !== 'off') {
        cautions.push('sem distância calculada');
    }

    const hasAddress = !!getAddressForCollaborator(candidate);
    if (!hasAddress && (modeUsed === 'endereco' || modeUsed === 'rota')) {
        score -= 8;
        cautions.push('endereço não cadastrado');
    }

    const coverage = getSubstituteCoverageStats(candidate.re, coverageMap);
    if (coverage.total > 0) {
        score += Math.min(14, coverage.total * 2);
        highlights.push(`histórico de ${coverage.total} FT`);
        if (coverage.sameUnit > 0) {
            score += Math.min(8, coverage.sameUnit * 2);
            highlights.push(`${coverage.sameUnit} FT na unidade alvo`);
        }
    } else {
        cautions.push('sem histórico FT');
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    let tier = 'blocked';
    let rank = 1;
    let label = 'Baixa aderência';
    if (availability === 'away') {
        tier = 'blocked';
        rank = 0;
        label = 'Indisponível';
    } else if (score >= 85) {
        tier = 'ideal';
        rank = 3;
        label = 'Candidato ideal';
    } else if (score >= 60) {
        tier = 'caution';
        rank = 2;
        label = 'Com ressalvas';
    }

    return { score, tier, rank, label, highlights, cautions, coverage };
}

function compareSubstituteRecommendation(a, b) {
    const recA = a?._substituteRecommendation || { rank: 0, score: 0 };
    const recB = b?._substituteRecommendation || { rank: 0, score: 0 };
    if (recA.rank !== recB.rank) return recB.rank - recA.rank;
    if (recA.score !== recB.score) return recB.score - recA.score;
    const distA = a?._routeDistanceKm ?? a?._distanceKm ?? Number.POSITIVE_INFINITY;
    const distB = b?._routeDistanceKm ?? b?._distanceKm ?? Number.POSITIVE_INFINITY;
    if (distA !== distB) return distA - distB;
    return String(a?.nome || '').localeCompare(String(b?.nome || ''));
}

function rankSubstituteCandidates(list, target, modeUsed, coverageMap) {
    list.forEach(item => {
        item._substituteRecommendation = buildSubstituteRecommendation(item, target, modeUsed, coverageMap);
    });
    return list.sort(compareSubstituteRecommendation);
}

function buildSubstituteRecommendationBadge(rec) {
    if (!rec) return '';
    return `<span class="substitute-score-badge ${rec.tier}">${rec.label} • ${rec.score}%</span>`;
}

function buildSubstituteRecommendationNote(rec, sourceText) {
    if (!rec) return `Fonte da proximidade: ${sourceText}.`;
    const parts = [`Score de cobertura: ${rec.score}% (${rec.label}).`];
    if (rec.highlights?.length) parts.push(`Pontos fortes: ${rec.highlights.join(', ')}.`);
    if (rec.cautions?.length) parts.push(`Ressalvas: ${rec.cautions.join(', ')}.`);
    if (rec.coverage?.total) {
        const sameUnitNote = rec.coverage.sameUnit ? ` (${rec.coverage.sameUnit} na unidade alvo)` : '';
        parts.push(`Histórico FT: ${rec.coverage.total}${sameUnitNote}.`);
    }
    parts.push(`Fonte da proximidade: ${sourceText}.`);
    return parts.join(' ');
}

function buildSubstituteSuggestionSummaryCard(target, list) {
    const ideal = list.filter(item => item?._substituteRecommendation?.tier === 'ideal').length;
    const caution = list.filter(item => item?._substituteRecommendation?.tier === 'caution').length;
    const blocked = list.filter(item => item?._substituteRecommendation?.tier === 'blocked').length;
    const suggested = list
        .filter(item => item?._substituteRecommendation?.rank >= 2)
        .slice(0, 2);
    const fallbackSuggested = suggested.length ? suggested : list.slice(0, 2);
    const suggestedText = fallbackSuggested.length
        ? fallbackSuggested.map(item => `${item.nome} (RE ${item.re})`).join(' + ')
        : 'Nenhum candidato disponível.';

    return `
        <div class="result-card substitute-summary-card">
            <h4>Sugestões automáticas</h4>
            <div class="meta">Cobertura para ${target.nome} (RE ${target.re}).</div>
            <div class="substitute-summary-stats">
                <span class="substitute-tier-badge ideal">Ideais: ${ideal}</span>
                <span class="substitute-tier-badge caution">Ressalvas: ${caution}</span>
                <span class="substitute-tier-badge blocked">Não recomendado: ${blocked}</span>
            </div>
            <div class="meta">Sugestão automática: ${suggestedText}</div>
        </div>
    `;
}

async function runSubstituteSearch(termo, resultsContainer, filterStatus, hideAbsence) {
    if (!resultsContainer) return;
    const seq = ++substituteSearchSeq;
    const termUpper = (termo || '').trim().toUpperCase();
    const dateRange = { from: '', to: '' };
    const target = getSubstituteTarget();

    if (!target) {
        if (!termUpper) {
            resultsContainer.innerHTML = '<p class="empty-state">Digite o nome ou RE e clique no colaborador para fixar o alvo.</p>';
            return;
        }
        let results = currentData.filter(item => {
            if (hiddenUnits.has(item.posto)) return false;
            return (item.nome && item.nome.includes(termUpper)) ||
                (item.re && item.re.includes(termUpper)) ||
                (item.posto && item.posto.includes(termUpper));
        });
        if (!results.length) {
            resultsContainer.innerHTML = '<p class="empty-state">Nenhum colaborador encontrado para fixar o alvo.</p>';
            return;
        }
        if (hasDateRangeFilter(dateRange)) {
            results = results.filter(item => matchesFtDateFilterForCollaborator(item.re, dateRange));
        }
        if (!results.length) {
            resultsContainer.innerHTML = '<p class="empty-state">Nenhum colaborador no intervalo de data selecionado.</p>';
            return;
        }
        results = results.slice(0, 20);
        resultsContainer.innerHTML = results.map(item => renderAiResultCard(item, item, {
            reasonOverride: 'Clique em "Fixar alvo" para iniciar a busca por substituto.',
            actionHtml: `<button class="btn btn-secondary btn-small" onclick="setSubstituteTarget('${item.re}')">Fixar alvo</button>`
        })).join('');
        return;
    }

    let list = currentData.filter(item => item.re !== target.re && !hiddenUnits.has(item.posto));
    if (termUpper) {
        list = list.filter(item => (
            (item.nome && item.nome.includes(termUpper)) ||
            (item.re && item.re.includes(termUpper)) ||
            (item.posto && item.posto.includes(termUpper))
        ));
    }
    list = list.map(item => ({ ...item, _statusInfoSnapshot: getStatusInfo(item) }));
    list = applyAiFilters(list, filterStatus, hideAbsence);
    if (hasDateRangeFilter(dateRange)) {
        list = list.filter(item => matchesFtDateFilterForCollaborator(item.re, dateRange));
    }

    if (!list.length) {
        resultsContainer.innerHTML = '<p class="empty-state">Nenhum resultado com os filtros atuais.</p>';
        return;
    }

    let proximityNote = 'ok';
    let modeUsed = substituteProximityMode || 'off';
    let osrmNote = '';
    if (modeUsed !== 'off') {
        await loadUnitAddressDb();
        await loadCollaboratorAddressDb();
        resultsContainer.innerHTML = '<p class="empty-state">Calculando proximidade por endereços...</p>';
        const sorted = await sortCandidatesByProximity(list, target, modeUsed);
        if (seq !== substituteSearchSeq) return;
        list = sorted.list;
        proximityNote = sorted.note;
        modeUsed = sorted.modeUsed;
        osrmNote = sorted.osrmNote || '';
    } else {
        list.forEach(item => {
            if (item._distanceKm != null) delete item._distanceKm;
            if (item._distanceSource) delete item._distanceSource;
        });
    }

    const coverageMap = buildSubstituteCoverageStatsMap(target);
    list = rankSubstituteCandidates(list, target, modeUsed, coverageMap);
    const metaCard = buildSubstituteMetaCard(target, modeUsed, proximityNote, list.length, filterStatus, hideAbsence, osrmNote, dateRange);
    const summaryCard = buildSubstituteSuggestionSummaryCard(target, list);
    resultsContainer.innerHTML = metaCard + summaryCard + list.map(item => {
        const statusInfo = item._statusInfoSnapshot || getStatusInfo(item);
        const addressOk = !!getAddressForCollaborator(item);
        const recommendation = item._substituteRecommendation || null;
        const badgeHtml = `<span class="address-status-badge ${addressOk ? 'ok' : 'missing'}">${addressOk ? 'Endereço OK' : 'endereço não cadastrado no nexti'}</span>`;
        const recommendationBadge = buildSubstituteRecommendationBadge(recommendation);
        let sourceText = 'desligada';
        if (modeUsed !== 'off') {
            const source = item._distanceSource || modeUsed;
            const baseMode = modeUsed === 'rota' ? 'endereco' : modeUsed;
            if (item._routeDistanceKm != null) {
                sourceText = 'rota (OSRM)';
            } else if (source === 'endereco' && baseMode === 'endereco') {
                sourceText = 'endereço';
            } else if (source === 'posto' && baseMode === 'endereco') {
                sourceText = 'posto (fallback)';
            } else if (source === 'endereco' && baseMode === 'posto') {
                sourceText = 'endereço (fallback)';
            } else if (source === 'posto') {
                sourceText = 'posto';
            } else {
                sourceText = baseMode === 'endereco' ? 'endereço' : 'posto';
            }
        }
        const reasonNote = buildSubstituteRecommendationNote(recommendation, sourceText);
        return renderAiResultCard(item, target, {
            statusInfoOverride: statusInfo,
            reasonOverride: buildSubstituteReason(item, target, { proximityMode: modeUsed, statusInfoOverride: statusInfo }),
            reasonNote,
            headerBadgesHtml: `${recommendationBadge}${badgeHtml}`,
            actionHtml: buildSubstituteActionHtml(item, target, modeUsed)
        });
    }).join('');
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
                    <span>${postoAttr} <span class="count-badge">${efetivo.length}</span> ${rotuloUnitHtml} ${ftBadge} ${avisosBadge} ${lembretesBadge}</span>
                    <div class="unit-actions">
                        <button class="action-btn" onclick="openAddressModal(${postoJsAttr})" title="Endereço">
                            ${ICONS.mapPin}
                        </button>
                        <button class="action-btn" onclick="openAvisosForUnit(${postoJsAttr})" title="Avisos da unidade">
                            ${ICONS.bell}
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


function renderSiteFooter() {
    const footer = document.getElementById('site-footer');
    if (!footer) return;
    const year = new Date().getFullYear();
    const updatedText = lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—';
    const groupLabel = currentGroup ? currentGroup.toUpperCase() : 'N/A';
    footer.innerHTML = `
        <div class="footer-inner">
            <span class="footer-item">Cobertura Dunamis ${APP_VERSION}</span>
            <span class="footer-dot">•</span>
            <span class="footer-item" id="footer-updated">Ultima sync: ${updatedText}</span>
            <span class="footer-dot">•</span>
            <span class="footer-item">Grupo: ${groupLabel}</span>
            <span class="footer-dot">•</span>
            <span class="footer-item">(c) ${year}</span>
            <button type="button" class="footer-link" onclick="openHelpModal()">Ajuda</button>
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
        const entry = {
            re,
            name,
            unit,
            dateRaw: vencRaw || dataRaw || '',
            expiry,
            expiryIso: expiry ? expiry.toISOString().slice(0, 10) : ''
        };
        return validateReciclagemEntry(entry) ? entry : null;
    }).filter(Boolean);
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
    if (!force && reciclagemLoadedAt) {
        const age = Date.now() - reciclagemLoadedAt.getTime();
        if (age < RECICLAGEM_CACHE_TTL_MS) return;
    }
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
    setAppState('reciclagemData', results, { silent: true });
    setAppState('reciclagemLoadedAt', new Date(), { silent: true });
}

async function refreshReciclagemIfNeeded() {
    const before = reciclagemLoadedAt ? reciclagemLoadedAt.getTime() : 0;
    await loadReciclagemData(false);
    const after = reciclagemLoadedAt ? reciclagemLoadedAt.getTime() : 0;
    if (after > before && currentTab === 'reciclagem') {
        renderReciclagem();
    }
}

function startReciclagemAutoRefresh() {
    refreshReciclagemIfNeeded();
    reciclagemSyncTimer = AppTimerManager.setInterval(APP_TIMERS.reciclagemSync, refreshReciclagemIfNeeded, 10 * 60 * 1000);
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
    document.getElementById('help-modal')?.classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal')?.classList.add('hidden');
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

    const recSummary = getReciclagemSummaryForCollab(re, displayName);
    const recStatus = recSummary?.status || 'unknown';
    const recLines = String(recSummary?.title || 'Reciclagem: sem dados')
        .split('\n')
        .map(v => v.trim())
        .filter(Boolean);
    const recLabelMap = {
        ok: 'Em dia',
        due: 'Próxima do vencimento',
        expired: 'Vencida',
        unknown: 'Sem dados'
    };

    const scopeGroup = currentGroup || 'todos';
    const pendingAvisos = getPendingAvisosByCollaborator(displayRe, scopeGroup);
    const pendingReminders = getPendingRemindersByCollaborator(displayRe, scopeGroup);

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
        weekPlan,
        reciclagem: {
            status: recStatus,
            label: recLabelMap[recStatus] || 'Sem dados',
            lines: recLines
        },
        avisos: pendingAvisos,
        reminders: pendingReminders
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

    const recHtml = snapshot.reciclagem.lines.length
        ? `<ul class="performance-list">${snapshot.reciclagem.lines.map(line => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
        : '<p class="empty-state">Sem dados de reciclagem.</p>';

    return `
        <div class="performance-head">
            <div>
                <div class="performance-title">${escapeHtml(snapshot.name)} <span class="performance-re">(RE ${escapeHtml(snapshot.re)})</span></div>
                <div class="performance-meta">Unidade: ${escapeHtml(snapshot.unit)} • Grupo: ${escapeHtml(snapshot.group)} • Cargo: ${escapeHtml(snapshot.role)}</div>
                <div class="performance-meta">Escala: ${escapeHtml(snapshot.schedule)} • Status atual: <span class="performance-status" style="background:${snapshot.statusInfo.color};">${escapeHtml(snapshot.statusInfo.text)}</span></div>
            </div>
            <div class="performance-flags">
                <span class="perf-flag">Avisos pendentes: ${snapshot.avisos}</span>
                <span class="perf-flag">Lembretes pendentes: ${snapshot.reminders}</span>
                <span class="perf-flag reciclagem ${snapshot.reciclagem.status}">Reciclagem: ${escapeHtml(snapshot.reciclagem.label)}</span>
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
            <div class="performance-block">
                <h4>Reciclagem</h4>
                ${recHtml}
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
        return;
    }
    const snapshot = buildCollaboratorPerformanceSnapshot(re, name);
    performanceModalState = { re: snapshot.re, name: snapshot.name };
    if (title) title.textContent = `Performance • ${snapshot.name} (RE ${snapshot.re})`;
    body.innerHTML = buildCollaboratorPerformanceModalHtml(snapshot);
    modal.classList.remove('hidden');
}

function closePerformanceModal() {
    document.getElementById('performance-modal')?.classList.add('hidden');
    performanceModalState = { re: '', name: '' };
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
        const addrHtml = addr ? escapeHtml(addr) : 'Endereço não cadastrado no nexti';
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
        routeMapLayer = L.polyline(latlngs, { color: '#0b4fb3', weight: 4 }).addTo(routeMapInstance);
        distanceKm = route.distanceKm;
        durationMin = route.durationMin;
    } else {
        routeMapLayer = L.polyline([[origin.lat, origin.lon], [dest.lat, dest.lon]], { color: '#94a3b8', weight: 3, dashArray: '6,6' }).addTo(routeMapInstance);
        distanceKm = calcDistanceKm(origin, dest);
    }

    const originMarker = L.marker([origin.lat, origin.lon]).addTo(routeMapInstance).bindPopup(labels.originLabel || 'Origem');
    const destMarker = L.marker([dest.lat, dest.lon]).addTo(routeMapInstance).bindPopup(labels.destLabel || 'Destino');
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
    document.getElementById('guide-modal')?.classList.remove('hidden');
}

function closeGuideModal() {
    document.getElementById('guide-modal')?.classList.add('hidden');
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
                        const recSummary = getReciclagemSummaryForCollab(p.re, p.nome);
                        const recIcon = recSummary
                            ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
                            : '';
                        const ftDetailHtml = buildFtDetailsHtml(p.re);
                        const roleLabel = getCollaboratorRoleLabel(p);
                        const reJs = JSON.stringify(p.re || '');
                        const nameJs = JSON.stringify(p.nome || '');
                        const phoneJs = JSON.stringify(p.telefone || '');
                        const reJsAttr = escapeHtml(reJs);
                        const nameJsAttr = escapeHtml(nameJs);
                        const phoneJsAttr = escapeHtml(phoneJs);
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
    if (enabled && isSubstituteSearchEnabled()) {
        localStorage.setItem('substituteSearchEnabled', '0');
        substituteTargetRe = '';
        updateSubstituteSearchButton();
        updateSubstitutePanel();
    }
    localStorage.setItem('aiSearchEnabled', enabled ? '1' : '0');
    updateAiSearchButton();
    realizarBusca();
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
        AppErrorHandler.capture(e, { scope: 'ai-remote-search', query: String(query || '') }, { silent: true });
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

function processUnitAddressData(csvText) {
    if (!csvText) return [];
    const rows = parseCSV(csvText);
    if (!rows.length) return [];

    let headerIndex = rows.findIndex(row => {
        const normalized = row.map(normalizeHeaderValue);
        const hasUnit = normalized.some(h => h.includes('UNIDADE') || h.includes('POSTO'));
        const hasAddress = normalized.some(h => h.includes('ENDERECO'));
        return hasUnit && hasAddress;
    });
    if (headerIndex < 0) headerIndex = 0;

    const headers = rows[headerIndex].map(normalizeHeaderValue);
    let idxUnit = headers.findIndex(h => h.includes('UNIDADE') || h.includes('POSTO') || h.includes('CLIENTE'));
    let idxAddress = headers.findIndex(h => h.includes('ENDERECO'));

    if (idxUnit === -1) idxUnit = 0;
    if (idxAddress === -1) idxAddress = 1;

    return rows.slice(headerIndex + 1).map(cols => {
        const nome = (cols[idxUnit] || '').trim().toUpperCase();
        const endereco = (cols[idxAddress] || '').trim();
        const entry = { nome, endereco };
        if (!validateAddressData(entry)) return null;
        return entry;
    }).filter(Boolean);
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
        const csvUrl = CONFIG?.addressSheets?.units;
        if (csvUrl) {
            const csv = await fetchSheetData(csvUrl);
            const csvEntries = processUnitAddressData(csv);
            if (csvEntries.length) {
                entries = csvEntries;
                source = csvUrl;
            }
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
        scheduleShadowSync('unit-geo-cache', { silent: true });
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
    if (status === 'launched') return 'Lançada no Nexti';
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

function verificarEscalaPorData(turma, dateKey) {
    const dayKey = normalizeFtDateKey(dateKey);
    if (!dayKey) return false;
    const date = new Date(`${dayKey}T00:00:00`);
    if (Number.isNaN(date.getTime())) return false;
    const dayNumber = date.getDate();
    const isImpar = dayNumber % 2 !== 0;
    let trabalha = null;
    if (turma == 1) trabalha = isImpar;
    if (turma == 2) trabalha = !isImpar;
    if (trabalha === null) return false;
    if (escalaInvertida) trabalha = !trabalha;
    return trabalha;
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
    const onDuty = verificarEscalaPorData(collab.turma, key);
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
    return address || 'endereço não cadastrado no nexti';
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
    const recSummary = getReciclagemSummaryForCollab(item.re, item.nome);
    const recIcon = recSummary
        ? `<span class="reciclagem-icon ${recSummary.status}" title="${recSummary.title}">${ICONS.recycle}</span>`
        : '';
    const roleLabel = getCollaboratorRoleLabel(item);
    const reJs = JSON.stringify(item.re || '');
    const nameJs = JSON.stringify(item.nome || '');
    const phoneJs = JSON.stringify(item.telefone || '');
    const unitJs = JSON.stringify(item.posto || '');
    const reJsAttr = escapeHtml(reJs);
    const nameJsAttr = escapeHtml(nameJs);
    const phoneJsAttr = escapeHtml(phoneJs);
    const unitJsAttr = escapeHtml(unitJs);
    const postoLabel = escapeHtml(item.posto || 'N/I');
    const hasAddress = !!getAddressForCollaborator(item);
    const canOpenMap = !!(item.re || item.nome || item.posto);
    const mapBtnClass = canOpenMap
        ? (hasAddress ? '' : 'map-icon-missing')
        : 'disabled-icon';
    const mapTitle = !canOpenMap
        ? 'Colaborador indisponível'
        : (hasAddress ? 'Ver endereço do colaborador' : 'Endereço não cadastrado no nexti');
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
    const isAfastado = ['FÉRIAS', 'ATESTADO', 'AFASTADO'].includes(statusInfo.text);
    const bgClass = isPlantao ? 'bg-plantao' : (isAfastado ? 'bg-afastado' : 'bg-folga');
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
                    ${headerBadges}
                    ${routeBadge}
                    ${distanceBadge}
                    <button class="edit-btn-icon performance-icon" onclick="openPerformanceModal(${reJsAttr}, ${nameJsAttr})" title="Performance do colaborador">${ICONS.performance}</button>
                    <button class="edit-btn-icon map-icon ${mapBtnClass}" onclick="openAddressModalForCollaborator(${reJsAttr}, ${nameJsAttr}, ${unitJsAttr})" title="${mapTitle}" ${canOpenMap ? '' : 'disabled'}>${ICONS.mapPin}</button>
                    <button class="edit-btn-icon ${item.telefone ? 'whatsapp-icon' : 'disabled-icon'}" onclick="openPhoneModal(${nameJsAttr}, ${phoneJsAttr})" title="${item.telefone ? 'Contato' : 'Sem telefone vinculado'}">${ICONS.whatsapp}</button>
                    <button class="edit-btn-icon" onclick="openEditModal(${editTargetId})" ${canEdit ? '' : 'disabled'}>${ICONS.edit}</button>
                </div>
            </div>
            <div class="card-details-grid">
                <div class="card-info-line"><strong>RE:</strong> ${item.re}</div>
                <div class="card-info-line"><strong>Posto:</strong> <span class="unit-link" onclick="navigateToUnit(${unitJsAttr})">${postoLabel}</span></div>
                <div class="card-info-line"><strong>Grupo:</strong> ${item.grupoLabel || 'N/I'}</div>
                <div class="card-info-line"><strong>Cargo:</strong> ${escapeHtml(roleLabel)}</div>
                <div class="card-info-line"><strong>Escala:</strong> ${item.tipoEscala ? `<span class="scale-badge">${item.tipoEscala}</span>` : ''}</div>
                <div class="card-info-line">
                    <strong>Horário:</strong> ${item.escala || 'N/I'}
                    ${turnoInfo ? `<div style="margin-top: 4px;">${turnoInfo}</div>` : ''}
                </div>
                ${ftRelationHtml}
                ${ftDetailHtml}
                ${ftWeekPreview}
                <div class="ai-reason">${reason}${reasonNote}</div>
            </div>
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
        setAppState('currentData', currentData.filter(d => d.id !== id), { silent: true });
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
    if (!container) return;
    container.setAttribute('aria-live', 'polite');
    container.setAttribute('aria-atomic', 'true');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    const icon = document.createElement('span');
    icon.className = 'toast-icon';
    icon.textContent = type === 'success' ? 'OK' : (type === 'error' ? '!' : 'i');
    const text = document.createElement('span');
    text.textContent = String(message || '');
    toast.append(icon, text);
    
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
// 📌 SUPERVISÃO
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
        saveSupervisaoMenu(true, { skipShadow: true });
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

function saveSupervisaoMenu(silent = false, options = {}) {
    if (!supervisaoMenu) return;
    localStorage.setItem('supervisaoMenu', JSON.stringify(supervisaoMenu));
    if (options.skipShadow) return;
    scheduleShadowSync('supervisao-menu', { silent, notify: !silent });
}

function loadSupervisaoHistory() {
    try {
        const stored = localStorage.getItem('supervisaoHistory');
        supervisaoHistory = stored ? JSON.parse(stored) || [] : [];
    } catch {
        supervisaoHistory = [];
    }
}

function saveSupervisaoHistory(silent = false, options = {}) {
    localStorage.setItem('supervisaoHistory', JSON.stringify(supervisaoHistory));
    if (options.skipShadow) return;
    scheduleShadowSync('supervisao-history', { silent, notify: !silent });
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
    checkReminderAlerts();
}

function mergeFtLaunchesFromShadow(remoteLaunches) {
    const mergedInput = ([]).concat(ftLaunches || [], remoteLaunches || []);
    let merged = normalizeFtLaunchEntries(mergedInput);
    if (ftRemovedIds.size) {
        merged = merged.filter(item => !ftRemovedIds.has(item.id));
    }
    ftLaunches = merged.sort((a, b) => getFtItemUpdatedTime(b) - getFtItemUpdatedTime(a));
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
    checkReminderAlerts();
    reminderCheckTimer = AppTimerManager.setInterval(APP_TIMERS.reminderCheck, checkReminderAlerts, 60000);
    AppEventManager.on(document, 'visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            checkReminderAlerts();
        }
    }, false, { scope: 'reminders', key: 'reminders-visibility' });
}

// ==========================================================================
// 📌 LANÇAMENTOS DE FT
// ==========================================================================

function switchLancamentosTab(tab) {
    if (tab === 'novo') {
        showToast("Fluxo manual de lançamento está desativado. Use a planilha FT atual.", "info");
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

function isFtSheetSource(item) {
    if (!item) return false;
    if (item.source === 'sheet') return true;
    const id = String(item.id || '');
    return !item.source && id.startsWith('ft-sheet-');
}

function getFtOperationalItems(list = ftLaunches) {
    return (list || []).filter(isFtSheetSource);
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
    if (item?.status === 'launched') return 'LANÇADO NO NEXTI';
    if (item?.status === 'submitted') return 'CONFIRMADO';
    return 'PENDENTE';
}

function getFtSourceInfo(item, options = {}) {
    const isSheet = isFtSheetSource(item);
    if (isSheet) {
        const group = item?.sourceGroup || item?.group || '';
        const showGroup = options.showGroup !== false;
        const label = showGroup && group ? `Planilha FT • ${String(group).toUpperCase()}` : 'Planilha FT';
        return { label, className: 'source-sheet' };
    }
    return { label: 'Origem antiga', className: 'source-manual' };
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
        item?.sheetStatusRaw,
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

function syncLancamentosSheets() {
    syncFtSheetLaunches(false);
    syncTrocaSheetLaunches(false);
}

function updateLancamentosHeader() {
    const statusEl = document.getElementById('lancamentos-sync-status');
    const lastEl = document.getElementById('lancamentos-last-sync');
    const isSyncing = ftSheetSyncInProgress || trocaSheetSyncInProgress;
    const ftSyncTs = ftLastSyncAt ? Date.parse(ftLastSyncAt) : 0;
    const trocaSyncTs = trocaLastSyncAt ? Date.parse(trocaLastSyncAt) : 0;
    const lastSyncTs = Math.max(ftSyncTs || 0, trocaSyncTs || 0);
    const lastSyncValue = lastSyncTs ? new Date(lastSyncTs).toISOString() : '';
    if (statusEl) {
        if (isSyncing) {
            statusEl.textContent = 'Sincronizando planilhas...';
            statusEl.classList.add('syncing');
        } else {
            statusEl.textContent = 'Auto sync ativa';
            statusEl.classList.remove('syncing');
        }
    }
    if (lastEl) {
        lastEl.textContent = lastSyncValue ? formatFtDateTime(lastSyncValue) : '—';
    }
    document.querySelectorAll('.ft-sync-info').forEach(el => {
        el.textContent = lastSyncValue ? formatFtDateTime(lastSyncValue) : '—';
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
                    <option value="launched" ${ftFilter.status === 'launched' ? 'selected' : ''}>Lançados no Nexti</option>
                </select>
            </div>
            <div class="form-group">
                <label>Última sync</label>
                <div class="ft-sync-info">${ftLastSyncAt ? formatFtDateTime(ftLastSyncAt) : '—'}</div>
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
    if (mainTitle) mainTitle.textContent = isFtMode ? 'Lançamentos FT (Planilha Atual)' : 'Lançamentos Troca de folga';
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
    maybeShowMonthlyGidReminder();

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

    if (!ftSyncTimer) startFtAutoSync();

    if (currentTab === 'lancamentos') {
        syncFtSheetLaunches(true);
        syncTrocaSheetLaunches(true);
    }
}

function getFtResponseUrls() {
    const forms = CONFIG?.ftForms || {};
    return Object.entries(forms)
        .map(([group, cfg]) => ({ group, url: cfg?.responsesCsv || '' }))
        .filter(item => item.url);
}

function getFtSheetSources() {
    const sources = [];
    const sheets = CONFIG?.ftSheets && typeof CONFIG.ftSheets === 'object' ? CONFIG.ftSheets : null;
    if (sheets) {
        Object.entries(sheets).forEach(([group, url]) => {
            if (url) sources.push({ group, url });
        });
    }
    if (!sources.length) {
        const url = CONFIG?.ftSheet?.url || '';
        if (url) sources.push({ group: currentGroup || 'todos', url });
    }
    return sources;
}

function getTrocaSheetSources() {
    const sources = [];
    const sheets = CONFIG?.trocaSheets && typeof CONFIG.trocaSheets === 'object' ? CONFIG.trocaSheets : null;
    if (sheets) {
        Object.entries(sheets).forEach(([group, url]) => {
            if (url) sources.push({ group, url });
        });
    }
    if (!sources.length) {
        const url = CONFIG?.trocaSheet?.url || '';
        if (url) sources.push({ group: 'atual', url });
    }
    return sources;
}

function normalizeMonthSheetToken(value) {
    return String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function getCurrentMonthSheetAliases(date = new Date()) {
    const pt = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const en = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const year = String(date.getFullYear());
    const idx = date.getMonth();
    const mm = String(idx + 1).padStart(2, '0');
    return [
        `${pt[idx]}_${year}`,
        `${en[idx]}_${year}`,
        `${year}_${mm}`,
        `${mm}_${year}`,
        `${year}${mm}`
    ].map(normalizeMonthSheetToken);
}

function hasCurrentMonthGidConfigured(sheets, date = new Date()) {
    if (!sheets || typeof sheets !== 'object') return false;
    const aliases = getCurrentMonthSheetAliases(date);
    const keys = Object.keys(sheets).map(normalizeMonthSheetToken);
    return keys.some(key => aliases.some(alias => key.includes(alias)));
}

function getMonthlyGidChecklistStatus(date = new Date()) {
    const monthLabel = date.toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' });
    return {
        monthLabel,
        monthKey: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        ftOk: hasCurrentMonthGidConfigured(CONFIG?.ftSheets || {}, date),
        trocaOk: hasCurrentMonthGidConfigured(CONFIG?.trocaSheets || {}, date)
    };
}

function maybeShowMonthlyGidReminder() {
    const status = getMonthlyGidChecklistStatus(new Date());
    const storageKey = `gid-month-check:${status.monthKey}`;
    if (localStorage.getItem(storageKey) === '1') return;
    if (!status.ftOk || !status.trocaOk) {
        const missing = [];
        if (!status.ftOk) missing.push('FT');
        if (!status.trocaOk) missing.push('Troca');
        showToast(`Lembrete ${status.monthLabel}: atualizar GID mensal em ${missing.join(' e ')}.`, 'info');
    }
    localStorage.setItem(storageKey, '1');
}

function normalizeFtHeaderLabel(value) {
    return String(value || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
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

function parseFtSheetDate(value) {
    const raw = cleanFtText(value);
    const key = normalizeFtDateKey(raw);
    return key || '';
}

function parseFtSheetDateTime(value) {
    const raw = cleanFtText(value);
    const dateKey = normalizeFtDateKey(raw);
    if (!dateKey) return '';
    const timeMatch = raw.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const hh = (timeMatch?.[1] || '00').padStart(2, '0');
    const mm = (timeMatch?.[2] || '00').padStart(2, '0');
    const ss = (timeMatch?.[3] || '00').padStart(2, '0');
    return `${dateKey}T${hh}:${mm}:${ss}`;
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

function hashString(value) {
    let hash = 0;
    const str = String(value || '');
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(36);
}

function buildFtSheetId(data) {
    const base = [
        data.sourceGroup || data.group || '',
        data.requestedAt || '',
        data.collabRe || data.collabName || '',
        data.date || '',
        data.unitTarget || '',
        data.shift || '',
        data.ftTime || ''
    ].join('|');
    return `ft-sheet-${hashString(base)}`;
}

function buildFtSheetSignature(data) {
    return [
        data.sourceGroup || data.group || '',
        data.requestedAt || '',
        data.date || '',
        data.collabRe || '',
        data.unitTarget || '',
        data.shift || '',
        data.ftTime || '',
        data.reasonRaw || '',
        data.reasonDetail || '',
        data.coveringRe || '',
        data.coveringOther || '',
        data.status || ''
    ].join('|');
}

function resolveFtSheetIndexes(header) {
    const reIndexes = header
        .map((h, idx) => (h === 're' ? idx : -1))
        .filter(idx => idx >= 0);
    return {
        requestedAt: header.findIndex(h => h.includes('carimbo') || (h.includes('data') && h.includes('hora'))),
        name: header.findIndex(h => h.includes('nome')),
        re: reIndexes.length ? reIndexes[0] : header.findIndex(h => h === 're'),
        date: header.findIndex(h => (h === 'data' || h.startsWith('data ')) && !h.includes('hora')),
        unit: header.findIndex(h => h.includes('unidade') || h.includes('posto')),
        reason: header.findIndex(h => h.includes('motivo')),
        shift: header.findIndex(h => h.includes('turno')),
        time: header.findIndex(h => h.includes('horario') || (h.includes('hora') && !h.includes('data'))),
        reasonDetail: header.findIndex(h => h.includes('no lugar de quem') || h.includes('lugar de quem') || h.includes('detalh')),
        coveringRe: reIndexes.length > 1 ? reIndexes[1] : -1,
        status: header.findIndex(h => h.includes('status'))
    };
}

function mapFtSheetRow(row, idx, collabMap, sourceGroup) {
    const firstCell = cleanFtText(row[0] || '');
    const firstUpper = firstCell.toUpperCase();
    if (!row.some(cell => String(cell || '').trim())) return null;
    if (['LEGENDA', 'FT LANÇADA', 'FT A LANÇAR', 'LANÇAR NO DRIVE', 'VERIFICAR'].some(tag => firstUpper.includes(tag))) {
        return null;
    }
    const collabNameRaw = cleanFtText(row[idx.name] || '');
    const collabRe = normalizeFtRe(row[idx.re] || '');
    if (!collabNameRaw && !collabRe) return null;
    const requestedAtRaw = cleanFtText(row[idx.requestedAt] || '');
    const requestedAt = parseFtSheetDateTime(requestedAtRaw);
    const ftDateRaw = cleanFtText(row[idx.date] || '');
    const ftDate = parseFtSheetDate(ftDateRaw);
    const unitTargetRaw = cleanFtText(row[idx.unit] || '');
    const unitTarget = unitTargetRaw ? unitTargetRaw.toUpperCase() : '';
    const reasonRaw = cleanFtText(row[idx.reason] || '');
    const reasonNorm = normalizeFtReason(reasonRaw);
    const shift = cleanFtText(row[idx.shift] || '');
    const ftTime = cleanFtText(row[idx.time] || '');
    const reasonDetail = cleanFtText(row[idx.reasonDetail] || '');
    const coveringReRaw = cleanFtText(row[idx.coveringRe] || '');
    const coveringRe = normalizeFtRe(coveringReRaw);
    const coveringIgnored = coveringReRaw.toUpperCase() === 'XXXX';
    const statusRaw = cleanFtText(row[idx.status] || '');
    const status = normalizeFtStatus(statusRaw);
    const collab = collabMap[collabRe] || null;
    const coveringCollab = coveringRe ? (collabMap[coveringRe] || null) : null;
    const createdAt = ftDate ? `${ftDate}T00:00:00` : (requestedAt || new Date().toISOString());
    const resolvedGroup = collab?.grupo || sourceGroup || '';
    const item = {
        id: '',
        source: 'sheet',
        sourceGroup: sourceGroup || '',
        createdAt,
        updatedAt: new Date().toISOString(),
        createdBy: 'Planilha FT',
        requestedAt: requestedAt || '',
        date: ftDate || '',
        collabName: collab?.nome || (collabNameRaw ? collabNameRaw.toUpperCase() : ''),
        collabRe,
        collabPhone: collab?.telefone || '',
        unitCurrent: collab?.posto || '',
        unitTarget,
        shift,
        ftTime,
        reason: reasonNorm.code,
        reasonOther: reasonNorm.other,
        reasonRaw,
        reasonDetail,
        coveringRe: coveringIgnored ? '' : coveringRe,
        coveringName: coveringCollab?.nome || '',
        coveringPhone: coveringCollab?.telefone || '',
        coveringOther: '',
        status,
        group: resolvedGroup,
        sheetStatusRaw: statusRaw
    };
    item.sheetSignature = buildFtSheetSignature(item);
    item.id = buildFtSheetId(item);
    return item;
}

function findTrocaHeaderRow(rows) {
    const limit = Math.min(rows.length, 25);
    for (let i = 0; i < limit; i++) {
        const normalized = (rows[i] || []).map(normalizeFtHeaderLabel);
        const hasStatus = normalized.some(h => h.includes('status'));
        const hasSwap = normalized.some(h => h.includes('troca') || h.includes('permuta') || h.includes('solicitante'));
        if (hasStatus && hasSwap) return i;
    }
    return 0;
}

function resolveTrocaSheetIndexes(header) {
    const find = (predicate) => header.findIndex(predicate);
    return {
        requestedAt: find(h => h.includes('carimbo') || (h.includes('data') && h.includes('hora'))),
        requestDate: find(h => h.includes('solicitacao')),
        unit: find(h => h.includes('posto') || h.includes('permuta') || h.includes('unidade')),
        swapDate: find(h => h.includes('data da troca') || (h.includes('troca') && h.includes('data'))),
        paymentDate: find(h => h.includes('pagamento')),
        re1: find(h => h.includes('re do solicitante') && h.includes('1')),
        name1: find(h => h.includes('nome do solicitante') && h.includes('1')),
        re2: find(h => h.includes('re do solicitante') && h.includes('2')),
        name2: find(h => h.includes('nome do solicitante') && h.includes('2')),
        party1: find(h => h === '4745' || h.includes('solicitante 1') || h.includes('solicitante. 1')),
        party2: find(h => h === '4682' || h.includes('solicitante 2') || h.includes('solicitante. 2')),
        status: find(h => h.includes('status')),
        ref: find(h => h === 'ref' || h.includes('refer'))
    };
}

function extractReFromTextLoose(value) {
    const raw = cleanFtText(value);
    if (!raw) return '';
    const tagged = raw.match(/\bRE\b[:\s-]*([0-9]{3,6})\b/i);
    if (tagged?.[1]) return normalizeFtRe(tagged[1]);
    const nums = raw.match(/\b[0-9]{3,6}\b/g);
    if (nums && nums.length) return normalizeFtRe(nums[nums.length - 1]);
    return '';
}

function cleanupTrocaName(value) {
    let text = cleanFtText(value);
    if (!text) return '';
    text = text
        .replace(/\bRE\b[:\s-]*\d{3,6}\b/ig, ' ')
        .replace(/\b\d{3,6}\b/g, ' ')
        .replace(/[-,]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    return text;
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

function mapTrocaSheetRow(row, idx, sourceGroup) {
    if (!row?.some(cell => String(cell || '').trim())) return null;
    const statusRaw = cleanFtText(row[idx.status] || '');
    const status = normalizeFtStatus(statusRaw);
    const ref = cleanFtText(row[idx.ref] || '');
    const unitRaw = cleanFtText(row[idx.unit] || '');
    const unit = unitRaw ? unitRaw.toUpperCase() : '';
    const requestedAt = cleanFtText(row[idx.requestedAt] || '');
    const requestDateRaw = cleanFtText(row[idx.requestDate] || requestedAt);
    const swapDateRaw = cleanFtText(row[idx.swapDate] || '');
    const paymentDateRaw = cleanFtText(row[idx.paymentDate] || '');
    const requestDate = normalizeFtDateKey(requestDateRaw);
    const swapDate = normalizeFtDateKey(swapDateRaw);
    const paymentDate = normalizeFtDateKey(paymentDateRaw);

    const party1Raw = cleanFtText(row[idx.name1] || row[idx.party1] || '');
    const party2Raw = cleanFtText(row[idx.name2] || row[idx.party2] || '');
    const re1Raw = cleanFtText(row[idx.re1] || '');
    const re2Raw = cleanFtText(row[idx.re2] || '');
    const requesterRe = normalizeFtRe(re1Raw) || extractReFromTextLoose(party1Raw);
    const counterpartRe = normalizeFtRe(re2Raw) || extractReFromTextLoose(party2Raw);
    const requesterName = cleanupTrocaName(party1Raw);
    const counterpartName = cleanupTrocaName(party2Raw);

    if (!statusRaw && !unit && !party1Raw && !party2Raw) return null;

    const idBase = [
        sourceGroup || '',
        requestDate || requestDateRaw || '',
        swapDate || swapDateRaw || '',
        unit,
        requesterRe || requesterName,
        counterpartRe || counterpartName,
        ref
    ].join('|');
    const item = {
        id: `troca-sheet-${hashString(idBase)}`,
        source: 'troca_sheet',
        sourceGroup: sourceGroup || '',
        status,
        statusRaw,
        ref,
        unit,
        requestedAt,
        requestDate,
        requestDateRaw,
        swapDate,
        swapDateRaw,
        paymentDate,
        paymentDateRaw,
        requesterRe,
        requesterName,
        counterpartRe,
        counterpartName,
        errors: []
    };
    item.errors = classifyTrocaItemErrors(item);
    return item;
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

async function syncTrocaSheetLaunches(silent = false) {
    const sources = getTrocaSheetSources();
    if (!sources.length) return;
    if (trocaSheetSyncInProgress) return;
    trocaSheetSyncInProgress = true;
    try {
        const merged = [];
        for (const src of sources) {
            const csv = await fetchSheetData(src.url);
            if (!csv) continue;
            const rows = parseCSV(csv);
            if (!rows.length) continue;
            const headerRow = findTrocaHeaderRow(rows);
            const header = (rows[headerRow] || []).map(normalizeFtHeaderLabel);
            const idx = resolveTrocaSheetIndexes(header);
            if (idx.status < 0) continue;
            for (let i = headerRow + 1; i < rows.length; i++) {
                const item = mapTrocaSheetRow(rows[i], idx, src.group);
                if (!item) continue;
                if (!validateTrocaSheetLaunchData(item)) continue;
                merged.push(item);
            }
        }
        trocaLaunches = dedupeTrocaLaunches(merged);
        trocaLastSyncAt = new Date().toISOString();
        if (!silent && currentTab === 'lancamentos' && currentLancamentosMode === 'troca') {
            showToast("Planilha de Troca sincronizada.", "success");
        }
        if (currentTab === 'lancamentos') {
            renderLancamentos();
        }
    } finally {
        trocaSheetSyncInProgress = false;
    }
}

async function syncFtSheetLaunches(silent = false) {
    const sources = getFtSheetSources();
    if (!sources.length) {
        if (!silent) showToast("Configure a planilha de FT em config.js para sincronizar.", "info");
        return;
    }
    if (ftSheetSyncInProgress) return;
    ftSheetSyncInProgress = true;
    updateLancamentosHeader();
    try {
        const collabs = await getAllCollaborators();
        const collabMap = {};
        (collabs || []).forEach(c => {
            const key = normalizeFtRe(c.re);
            if (key) collabMap[key] = c;
        });
        const byId = {};
        ftLaunches.forEach(item => { byId[item.id] = item; });
        let added = 0;
        let updated = 0;
        for (const src of sources) {
            const csv = await fetchSheetData(src.url);
            if (!csv) continue;
            const rows = parseCSV(csv);
            if (!rows.length) continue;
            const header = rows[0].map(normalizeFtHeaderLabel);
            const idx = resolveFtSheetIndexes(header);
            if (idx.re < 0 || idx.date < 0 || idx.unit < 0) continue;
            for (let i = 1; i < rows.length; i++) {
                const item = mapFtSheetRow(rows[i], idx, collabMap, src.group);
                if (!item) continue;
                if (!validateFtSheetLaunchData(item)) continue;
                if (ftRemovedIds.has(item.id)) continue;
                const existing = byId[item.id];
                if (!existing) {
                    byId[item.id] = item;
                    if (item.status === 'submitted' || item.status === 'launched') {
                        applyFtToCollaborator(item);
                    }
                    added++;
                    continue;
                }
                if (existing.source && existing.source !== 'sheet') continue;
                if (existing.sheetSignature === item.sheetSignature) continue;
                const prevStatus = existing.status;
                Object.assign(existing, item);
                if (prevStatus !== item.status) {
                    setFtStatus(existing, item.status);
                } else {
                    existing.updatedAt = new Date().toISOString();
                }
                updated++;
            }
        }
        let merged = Object.values(byId);
        if (ftRemovedIds.size) {
            merged = merged.filter(item => !ftRemovedIds.has(item.id));
        }
        ftLaunches = normalizeFtLaunchEntries(merged).sort((a, b) => getFtItemUpdatedTime(b) - getFtItemUpdatedTime(a));
        refreshFtLabelsForToday();
        if (added || updated) {
            saveFtLaunches();
            if (!silent) showToast(`Planilha FT sincronizada: ${added} novos, ${updated} atualizados.`, "success");
        } else if (!silent) {
            showToast("Planilha de FT já está atualizada.", "info");
        }
        ftLastSyncAt = new Date().toISOString();
        updateLancamentosHeader();
    } finally {
        ftSheetSyncInProgress = false;
        updateLancamentosHeader();
    }
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
        } catch (err) {
            AppErrorHandler.capture(err, { scope: 'ft-form-responses-sync', source: src?.group || src?.url || '' }, { silent: true });
        }
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
        if (!silent) showToast("Confirmações atualizadas.", "success");
    } else if (!silent) {
        showToast("Nenhuma FT nova confirmada.", "info");
    }
    if (updated) refreshFtLabelsForToday();
    ftLastSyncAt = new Date().toISOString();
    updateLancamentosHeader();
}

function startFtAutoSync() {
    if (ftSyncTimer) return;
    ftSyncTimer = AppTimerManager.setInterval(APP_TIMERS.ftSync, () => {
        syncFtSheetLaunches(true);
        syncTrocaSheetLaunches(true);
    }, 60000);
    if (!ftAutoSyncBound) {
        AppEventManager.on(document, 'visibilitychange', () => {
            if (document.visibilityState === 'visible') {
                syncFtSheetLaunches(true);
                syncTrocaSheetLaunches(true);
            }
        }, false, { scope: 'ft-sync', key: 'ft-sync-visibility' });
        ftAutoSyncBound = true;
    }
    syncFtSheetLaunches(true);
    syncTrocaSheetLaunches(true);
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
                    <p>Execução FT baseada somente na planilha atual, com fila crítica e visão de próximos dias.</p>
                </div>
                <div class="lanc-diaria-note">Ações rápidas ficam no topo: Sincronizar planilhas, Diária FT, Indicadores FT e Histórico FT.</div>
            </div>
            <div class="lanc-diaria-kpi">
                <div class="kpi-card"><div class="kpi-label">FT hoje</div><div class="kpi-value">${ftToday.length}</div><div class="kpi-sub">Operação do dia</div></div>
                <div class="kpi-card"><div class="kpi-label">Pendentes</div><div class="kpi-value">${ftPending}</div><div class="kpi-sub">Aguardando ação</div></div>
                <div class="kpi-card"><div class="kpi-label">Confirmadas</div><div class="kpi-value">${ftSubmitted}</div><div class="kpi-sub">Status confirmado</div></div>
                <div class="kpi-card"><div class="kpi-label">Lançadas</div><div class="kpi-value">${ftLaunched}</div><div class="kpi-sub">Lançado no Nexti</div></div>
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
            const errors = item.errors || [];
            return `
                <div class="lancamento-card ${errors.length ? 'is-pending' : ''}">
                    <div class="lancamento-main">
                        <div class="lancamento-meta">
                            <span class="lancamento-date"><strong>Data troca</strong> ${dateLabel}</span>
                            <span class="lancamento-status status-${item.status}">${getFtStatusLabel(item)}</span>
                            <span class="lancamento-source source-sheet">Planilha Troca</span>
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
                <div class="kpi-sub">LANÇADO no Nexti</div>
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
        "Origem": 'Planilha FT',
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
            "Status planilha": i.sheetStatusRaw || '',
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
        "Origem": "Planilha FT",
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
        "Status planilha": i.sheetStatusRaw || '',
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
            "Origem": "Planilha Troca",
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
            <div class="lanc-card"><div class="label">Planilha FT</div><div class="value">${total}</div></div>
        </div>
    `;

    const buildCards = (items) => items.map(item => {
        const isSheet = isFtSheetSource(item);
        const statusText = getFtStatusLabel(item);
        const canLaunch = item.status === 'submitted' && isAdminRole() && !isSheet;
        const launched = item.status === 'launched';
        const launchLabel = isSheet
            ? 'Status via planilha'
            : (launched ? 'Lançado no Nexti' : 'Marcar Lançado no Nexti');
        const launchClass = isSheet ? 'btn-secondary' : (launched ? 'btn-ok' : 'btn-secondary');
        const launchOnClick = isSheet
            ? `onclick="showToast('Atualize o status na planilha FT e sincronize para refletir aqui.', 'info')"`
            : `onclick="markFtLaunched('${item.id}')"`;
        const launchDisabled = isSheet ? '' : (canLaunch ? '' : 'disabled');
        const requestedAt = item.requestedAt ? formatFtDateTime(item.requestedAt) : '';
        const createdAt = item.createdAt ? formatFtDateTime(item.createdAt) : '';
        const sourceInfo = getFtSourceInfo(item, { showGroup: false });
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
                        <span class="step ${item.createdAt || item.requestedAt ? 'done' : ''}">Registrada na planilha</span>
                        <span class="step ${item.status !== 'pending' ? 'done' : ''}">Em validação</span>
                        <span class="step ${item.status === 'submitted' || item.status === 'launched' ? 'done' : ''}">Confirmada</span>
                        <span class="step ${item.status === 'launched' ? 'done' : ''}">Lançado no Nexti</span>
                    </div>
                    ${reasonDetail ? `<div><strong>Detalhe:</strong> ${reasonDetail}</div>` : ''}
                    ${notes ? `<div><strong>Observações:</strong> ${notes}</div>` : ''}
                    ${requestedAt ? `<div><strong>Solicitada em:</strong> ${requestedAt}</div>` : ''}
                    ${createdAt ? `<div><strong>Criada em:</strong> ${createdAt}</div>` : ''}
                    ${item.sheetStatusRaw ? `<div><strong>Status planilha:</strong> ${item.sheetStatusRaw}</div>` : ''}
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
    showToast("Fluxo manual de FT está desativado. A operação segue somente pela planilha atual.", "info");
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
    if (item.source === 'sheet') {
        ftRemovedIds.add(item.id);
        saveFtRemovedIds(true);
    }
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

function verificarEscala(turma) {
    return verificarEscalaPorData(turma, getTodayKey());
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

function loginSite(options = {}) {
    const source = options.source || 'config';
    const target = options.target || (source === 'supervisao' ? 'supervisao' : 'config');
    const reInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-re')
        : document.getElementById('loginRe');
    const cpfInput = source === 'supervisao'
        ? document.getElementById('supervisao-login-cpf')
        : document.getElementById('loginCpf');
    const re = reInput?.value.trim() || '';
    const cpf = cpfInput?.value.trim() || '';

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

    const keepLogged = source === 'supervisao'
        ? document.getElementById('supervisao-keep-logged')?.checked === true
        : document.getElementById('keepLogged')?.checked === true;
    saveAuthToStorage(hash, keepLogged);

    if (target === 'supervisao') {
        openSupervisaoPage();
        updateMenuStatus();
        renderSupervisaoAdminList();
        renderSupervisaoHistory();
        updateSupervisaoEditorVisibility();
        updateSupervisaoAdminStatus();
        showToast("Login efetuado com sucesso, agora você está no modo editor.", "success");
        return;
    }
    if (target === 'gateway') {
        renderGateway();
        updateMenuStatus();
        showToast("Login efetuado com sucesso, agora você está no modo editor.", "success");
        return;
    }

    renderDashboard();
    switchTab('config');
    renderAdminList();
    renderAuditList();

    showToast("Login efetuado com sucesso, agora você está no modo editor.", "success");
}

function logoutSite(options = {}) {
    SiteAuth.logged = false;
    SiteAuth.user = null;
    SiteAuth.re = null;
    SiteAuth.mode = 'view';
    SiteAuth.role = 'viewer';
    
    document.body.classList.remove('mode-edit');

    document.getElementById('config-login')?.classList.remove('hidden');
    document.getElementById('config-content')?.classList.add('hidden');

    localStorage.setItem('keepLogged', '0');
    localStorage.removeItem('authHash');
    localStorage.removeItem('authUser');
    localStorage.removeItem('authRe');

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
    if (!SiteAuth.logged || SiteAuth.role === 'supervisor') return;

    SiteAuth.mode = SiteAuth.mode === 'edit' ? 'view' : 'edit';
    
    document.body.classList.toggle('mode-edit', SiteAuth.mode === 'edit');
    updateMenuStatus();
    updateSupervisaoAdminStatus();
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
    const authIndicatorEl = document.getElementById('auth-indicator');
    
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

    if (authIndicatorEl) {
        if (SiteAuth.logged) {
            const roleLabel = SiteAuth.role === 'supervisor' ? 'Supervisor' : (SiteAuth.role === 'master' ? 'Master' : (SiteAuth.role === 'admin' ? 'Admin' : 'Usuario'));
            authIndicatorEl.innerHTML = `<span class="dot"></span> Logado${SiteAuth.user ? `: ${SiteAuth.user}` : ''}`;
            authIndicatorEl.title = `Logado como ${SiteAuth.user || 'Usuario'} (${roleLabel})`;
            authIndicatorEl.classList.remove('hidden');
        } else {
            authIndicatorEl.classList.add('hidden');
            authIndicatorEl.textContent = '';
            authIndicatorEl.removeAttribute('title');
        }
    }

    const keepLoggedEl = document.getElementById('keepLogged');
    if (keepLoggedEl) {
        keepLoggedEl.checked = localStorage.getItem('keepLogged') === '1';
    }
    renderEscalaInvertidaUI();

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
    renderSheetValidatorOptions();
    renderConfigSummary();
    renderRoadmapList();
    renderAuditList();
    const supervisaoPane = document.getElementById('config-pane-supervisao');
    if (supervisaoPane && !supervisaoPane.classList.contains('hidden')) {
        renderSupervisaoAdminList();
        renderSupervisaoHistory();
        updateSupervisaoEditorVisibility();
    }
    updateShadowStatusUI();
    updateAvisosUI();
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

function renderConfigSummary() {
    const summaryEl = document.getElementById('config-summary');
    if (!summaryEl) return;
    const counts = getCollaboratorCountsByGroup();
    const unitCount = new Set((currentData || []).map(c => c.posto).filter(Boolean)).size;
    const editsCount = Object.keys(collaboratorEdits || {}).length;
    const unitEdits = Object.keys(unitMetadata || {}).length;
    const lastUpdateText = lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—';
    const shadowText = shadowStatus.available ? 'Ativo' : 'Indisponível';
    const shadowClass = shadowStatus.available ? 'ok' : 'off';
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
                <div class="label">Edições</div>
                <div class="value">${editsCount + unitEdits}</div>
                <div class="meta">Locais + unidades</div>
            </div>
            <div class="config-summary-card">
                <div class="label">Shadow</div>
                <div class="value"><span class="status-pill ${shadowClass}">${shadowText}</span></div>
                <div class="meta">Sincronização</div>
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

    const countsByGroup = getCollaboratorCountsByGroup();
    const sources = Object.keys(CONFIG.sheets || {}).map(key => ({
        name: labels[key] || `Planilha ${key}`,
        status: 'ATIVO',
        url: toSourceViewUrl(CONFIG.sheets[key]),
        count: countsByGroup[key]
    }));

    if (CONFIG.addressSheets?.units) {
        sources.push({
            name: 'Planilha Endereços Unidades',
            status: 'ATIVO',
            url: toSourceViewUrl(CONFIG.addressSheets.units),
            count: unitAddressDb?.entries?.length || 0
        });
    }
    if (CONFIG.addressSheets?.collaborators) {
        sources.push({
            name: 'Planilha Endereços Colaboradores',
            status: 'ATIVO',
            url: toSourceViewUrl(CONFIG.addressSheets.collaborators),
            count: Object.keys(collaboratorAddressMap || {}).length
        });
    }

    const ftSheetSources = getFtSheetSources();
    ftSheetSources.forEach(src => {
        const label = src.group ? `Planilha FT ${String(src.group).toUpperCase()}` : 'Planilha FT';
        const count = ftLaunches.filter(i => i.source === 'sheet' && (src.group ? i.sourceGroup === src.group : true)).length;
        sources.push({
            name: label,
            status: 'ATIVO',
            url: toSourceViewUrl(src.url),
            count
        });
    });
    const trocaSheetSources = getTrocaSheetSources();
    trocaSheetSources.forEach(src => {
        const label = src.group ? `Planilha Troca ${String(src.group).toUpperCase()}` : 'Planilha Troca';
        const count = trocaLaunches.filter(i => i.source === 'troca_sheet' && (src.group ? i.sourceGroup === src.group : true)).length;
        sources.push({
            name: label,
            status: 'ATIVO',
            url: toSourceViewUrl(src.url),
            count
        });
    });

    if (CONFIG?.reciclagem?.baseCsvUrl) {
        sources.push({
            name: 'Reciclagem (Base CSV)',
            status: 'ATIVO',
            url: toSourceViewUrl(CONFIG.reciclagem.baseCsvUrl)
        });
    }
    const recSheets = CONFIG?.reciclagem?.sheets || {};
    Object.keys(recSheets).forEach(key => {
        const url = buildReciclagemCsvUrl(key);
        if (!url) return;
        sources.push({
            name: `Reciclagem ${key}`,
            status: 'ATIVO',
            url: toSourceViewUrl(url)
        });
    });

    sources.push({ name: 'Nexti API', status: NEXTI_AVAILABLE ? 'ATIVO' : 'INATIVO' });
    sources.push({ name: 'PASTA DO GOOGLE DRIVE', status: 'ATIVO', url: 'https://drive.google.com/drive/folders/1d-z_dHoqrjygeEv1CvL9JRJSjkJcs02m?usp=sharing' });

    list.innerHTML = sources.map(s => {
        if (s.url) {
            return `
                <details class="source-item">
                    <summary>
                        <span>${s.name}${Number.isFinite(s.count) ? ` <span class="source-count">${s.count}</span>` : ''}</span>
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
                <span>${s.name}${Number.isFinite(s.count) ? ` <span class="source-count">${s.count}</span>` : ''}</span>
                <span class="source-pill ${s.status === 'ATIVO' ? 'ok' : 'off'}">${s.status}</span>
            </div>
        `; 
    }).join('');
}

function getSheetValidatorSources() {
    const sources = [];
    const sheets = CONFIG.sheets || {};
    Object.keys(sheets).forEach(key => {
        if (key === 'phones') return;
        const url = sheets[key];
        if (!url) return;
        sources.push({
            id: `base:${key}`,
            label: `Base ${String(key).toUpperCase()}`,
            url,
            type: 'base',
            group: key
        });
    });
    if (sheets.phones) {
        sources.push({
            id: 'phones',
            label: 'Telefones (CSV)',
            url: sheets.phones,
            type: 'phones'
        });
    }
    if (CONFIG.addressSheets?.units) {
        sources.push({
            id: 'address-units',
            label: 'Endereços Unidades',
            url: CONFIG.addressSheets.units,
            type: 'address_units'
        });
    }
    if (CONFIG.addressSheets?.collaborators) {
        sources.push({
            id: 'address-collabs',
            label: 'Endereços Colaboradores',
            url: CONFIG.addressSheets.collaborators,
            type: 'address_collabs'
        });
    }
    const ftSheetSources = getFtSheetSources();
    ftSheetSources.forEach(src => {
        const group = src.group || '';
        sources.push({
            id: `ft-sheet:${group || 'geral'}`,
            label: group ? `FT Planilha ${String(group).toUpperCase()}` : 'FT Planilha (Geral)',
            url: src.url,
            type: 'ft_sheet',
            group
        });
    });
    const trocaSheetSources = getTrocaSheetSources();
    trocaSheetSources.forEach(src => {
        const group = src.group || '';
        sources.push({
            id: `troca-sheet:${group || 'geral'}`,
            label: group ? `Troca Planilha ${String(group).toUpperCase()}` : 'Troca Planilha (Geral)',
            url: src.url,
            type: 'troca_sheet',
            group
        });
    });
    const ftForms = getFtResponseUrls();
    ftForms.forEach(src => {
        const group = src.group || '';
        sources.push({
            id: `ft-forms:${group || 'geral'}`,
            label: group ? `FT Forms ${String(group).toUpperCase()}` : 'FT Forms (Geral)',
            url: src.url,
            type: 'ft_forms',
            group
        });
    });
    if (CONFIG?.reciclagem?.baseCsvUrl) {
        sources.push({
            id: 'reciclagem-base',
            label: 'Reciclagem Base',
            url: CONFIG.reciclagem.baseCsvUrl,
            type: 'reciclagem',
            sheetKey: 'base'
        });
    }
    const recSheets = CONFIG?.reciclagem?.sheets || {};
    Object.keys(recSheets).forEach(key => {
        const url = buildReciclagemCsvUrl(key);
        if (!url) return;
        sources.push({
            id: `reciclagem:${key}`,
            label: `Reciclagem ${String(key).toUpperCase()}`,
            url,
            type: 'reciclagem',
            sheetKey: key
        });
    });
    return sources;
}

function renderSheetValidatorOptions() {
    const select = document.getElementById('sheet-validator-select');
    if (!select) return;
    const sources = getSheetValidatorSources();
    const current = select.value;
    if (!sources.length) {
        select.innerHTML = `<option value="">Nenhuma fonte configurada</option>`;
        select.disabled = true;
        ensureSheetValidatorPlaceholder();
        return;
    }
    select.disabled = false;
    select.innerHTML = sources.map(src => `<option value="${src.id}">${src.label}</option>`).join('');
    if (current && sources.some(s => s.id === current)) {
        select.value = current;
    }
    ensureSheetValidatorPlaceholder();
}

function ensureSheetValidatorPlaceholder() {
    const statusEl = document.getElementById('sheet-validator-status');
    const previewEl = document.getElementById('sheet-validator-preview');
    if (statusEl && !statusEl.innerHTML.trim()) {
        statusEl.innerHTML = `<div class="validator-empty">Selecione uma fonte e clique em Validar.</div>`;
    }
    if (previewEl && !previewEl.innerHTML.trim()) {
        previewEl.innerHTML = `<div class="validator-empty">O preview aparece aqui após a validação.</div>`;
    }
}

function clearSheetValidator() {
    const statusEl = document.getElementById('sheet-validator-status');
    const previewEl = document.getElementById('sheet-validator-preview');
    if (statusEl) statusEl.innerHTML = `<div class="validator-empty">Selecione uma fonte e clique em Validar.</div>`;
    if (previewEl) previewEl.innerHTML = `<div class="validator-empty">O preview aparece aqui após a validação.</div>`;
}

function buildValidatorPreview(columns, rows) {
    if (!columns.length || !rows.length) {
        return `<div class="validator-empty">Sem dados para preview.</div>`;
    }
    const head = columns.map(c => `<th>${escapeHtml(c)}</th>`).join('');
    const body = rows.map(r => {
        const cells = columns.map((_, idx) => `<td>${escapeHtml(r[idx] ?? '')}</td>`).join('');
        return `<tr>${cells}</tr>`;
    }).join('');
    return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderValidatorResult(result) {
    const statusEl = document.getElementById('sheet-validator-status');
    const previewEl = document.getElementById('sheet-validator-preview');
    if (!statusEl || !previewEl) return;
    const labelMap = { ok: 'OK', warn: 'Atenção', error: 'Erro' };
    const messages = (result.messages || []).map(m => `<div class="${m.type}">${escapeHtml(m.text)}</div>`).join('');
    statusEl.innerHTML = `
        <div class="validator-pill ${result.status}">${labelMap[result.status] || 'Status'}</div>
        <div class="validator-list">${messages || '<div class="info">Sem observações.</div>'}</div>
    `;
    previewEl.innerHTML = buildValidatorPreview(result.preview?.columns || [], result.preview?.rows || []);
}

async function validateSelectedSheet() {
    const select = document.getElementById('sheet-validator-select');
    if (!select || !select.value) {
        showToast("Selecione uma fonte para validar.", "info");
        return;
    }
    const sources = getSheetValidatorSources();
    const source = sources.find(s => s.id === select.value);
    if (!source) {
        showToast("Fonte não encontrada.", "error");
        return;
    }
    const statusEl = document.getElementById('sheet-validator-status');
    const previewEl = document.getElementById('sheet-validator-preview');
    if (statusEl) statusEl.innerHTML = `<div class="validator-empty">Validando planilha...</div>`;
    if (previewEl) previewEl.innerHTML = '';
    try {
        const csv = await fetchSheetData(source.url);
        if (!csv) {
            renderValidatorResult({
                status: 'error',
                messages: [{ type: 'error', text: 'Falha ao carregar o CSV da fonte.' }],
                preview: { columns: [], rows: [] }
            });
            return;
        }
        const rows = parseCSV(csv);
        const result = validateSheetRows(source, rows, csv);
        renderValidatorResult(result);
    } catch {
        renderValidatorResult({
            status: 'error',
            messages: [{ type: 'error', text: 'Erro ao validar a planilha.' }],
            preview: { columns: [], rows: [] }
        });
    }
}

function finalizeValidatorResult(messages, previewColumns, previewRows) {
    let status = 'ok';
    if (messages.some(m => m.type === 'error')) status = 'error';
    else if (messages.some(m => m.type === 'warn')) status = 'warn';
    return {
        status,
        messages,
        preview: { columns: previewColumns, rows: previewRows }
    };
}

function validateSheetRows(source, rows, csvText = '') {
    const messages = [];
    if (!rows || !rows.length) {
        messages.push({ type: 'error', text: 'Nenhuma linha encontrada no CSV.' });
        return finalizeValidatorResult(messages, [], []);
    }
    if (source.type === 'base') {
        const dataRows = rows.slice(1);
        const total = dataRows.length;
        messages.push({ type: 'info', text: `Registros detectados: ${total}` });
        const header = rows[0].map(normalizeHeaderValue);
        const hasHeader = header.some(h => h.includes('COLABORADOR') || h.includes('NOME')) &&
            header.some(h => h.includes('MATRICULA') || h === 'RE') &&
            header.some(h => h.includes('POSTO') || h.includes('UNIDADE'));
        if (!hasHeader) {
            messages.push({ type: 'warn', text: 'Cabeçalho não identificado. Verifique se a primeira linha contém nomes de colunas.' });
        }
        if (!total) {
            messages.push({ type: 'error', text: 'Nenhum dado após o cabeçalho.' });
        }
        const sample = dataRows.slice(0, 50);
        const hasCols = sample.some(row => row.length > 7);
        if (!hasCols) {
            messages.push({ type: 'error', text: 'Colunas insuficientes. A base precisa ter dados até a coluna H (Unidade).' });
        }
        let missingName = 0;
        let missingRe = 0;
        let missingUnit = 0;
        sample.forEach(row => {
            if (!String(row[4] || '').trim()) missingName += 1;
            if (!String(row[5] || '').trim()) missingRe += 1;
            if (!String(row[7] || '').trim()) missingUnit += 1;
        });
        if (missingName) messages.push({ type: 'warn', text: `Linhas sem Nome (coluna E): ${missingName}` });
        if (missingRe) messages.push({ type: 'warn', text: `Linhas sem RE (coluna F): ${missingRe}` });
        if (missingUnit) messages.push({ type: 'warn', text: `Linhas sem Unidade (coluna H): ${missingUnit}` });

        const previewItems = mapRowsToObjects(dataRows.slice(0, 10), source.group || '', false, [], {});
        const previewColumns = ['Nome', 'RE', 'Unidade', 'Escala', 'Turma', 'Grupo'];
        const previewRows = previewItems.map(item => ([
            item.nome || '',
            item.re || '',
            item.posto || '',
            item.escala || '',
            item.turma || '',
            item.grupoLabel || ''
        ]));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'ft_sheet') {
        const header = rows[0].map(normalizeFtHeaderLabel);
        const idx = resolveFtSheetIndexes(header);
        const missing = [];
        if (idx.re < 0) missing.push('RE');
        if (idx.date < 0) missing.push('Data');
        if (idx.unit < 0) missing.push('Unidade');
        if (idx.status < 0) missing.push('Status');
        if (missing.length) {
            messages.push({ type: 'error', text: `Colunas obrigatórias ausentes: ${missing.join(', ')}` });
            return finalizeValidatorResult(messages, [], []);
        }
        const dataRows = rows.slice(1);
        const items = dataRows
            .map(row => mapFtSheetRow(row, idx, {}, source.group || ''))
            .filter(item => validateFtSheetLaunchData(item));
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        messages.push({ type: 'info', text: `Registros válidos: ${items.length}` });
        if (!items.length) messages.push({ type: 'warn', text: 'Nenhum registro válido identificado.' });
        const launched = items.filter(i => i.status === 'launched').length;
        const pending = items.filter(i => i.status === 'pending').length;
        messages.push({ type: 'info', text: `Status: ${launched} lançadas, ${pending} pendentes` });

        const previewColumns = ['Data FT', 'Colaborador', 'RE', 'Unidade', 'Status', 'Motivo', 'Detalhe', 'Turno', 'Horário', 'Cobrindo RE'];
        const previewRows = items.slice(0, 10).map(i => ([
            i.date || '',
            i.collabName || '',
            i.collabRe || '',
            i.unitTarget || i.unitCurrent || '',
            getFtStatusLabel(i),
            getFtReasonLabel(i.reason, i.reasonOther) || i.reasonRaw || '',
            i.reasonDetail || '',
            i.shift || '',
            i.ftTime || '',
            i.coveringRe || ''
        ]));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'troca_sheet') {
        const headerRow = findTrocaHeaderRow(rows);
        const header = (rows[headerRow] || []).map(normalizeFtHeaderLabel);
        const idx = resolveTrocaSheetIndexes(header);
        if (idx.status < 0) {
            messages.push({ type: 'error', text: 'Coluna obrigatória ausente: Status.' });
            return finalizeValidatorResult(messages, [], []);
        }
        const dataRows = rows.slice(headerRow + 1);
        const items = dataRows
            .map(row => mapTrocaSheetRow(row, idx, source.group || ''))
            .filter(item => validateTrocaSheetLaunchData(item));
        const launchedItems = items.filter(i => i.status === 'launched');
        const erroredLaunched = launchedItems.filter(i => (i.errors || []).length > 0);
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        messages.push({ type: 'info', text: `Registros válidos: ${items.length}` });
        messages.push({ type: 'info', text: `Lançadas: ${launchedItems.length}` });
        messages.push({ type: 'info', text: `Erros (somente lançadas): ${erroredLaunched.length}` });
        const previewColumns = ['Status', 'REF', 'Unidade', 'Solicitante 1 (RE)', 'Solicitante 2 (RE)', 'Data Troca', 'Erros'];
        const previewRows = items.slice(0, 10).map(i => ([
            i.statusRaw || i.status || '',
            i.ref || '',
            i.unit || '',
            `${i.requesterName || '-'} (${i.requesterRe || 'N/I'})`,
            `${i.counterpartName || '-'} (${i.counterpartRe || 'N/I'})`,
            i.swapDate || '',
            (i.errors || []).join(' | ')
        ]));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'ft_forms') {
        const header = rows[0].map(h => String(h || '').toLowerCase());
        let idx = header.findIndex(h => h.includes('ft id'));
        if (idx < 0) idx = header.findIndex(h => h.includes('ft') && h.includes('id'));
        if (idx < 0) {
            messages.push({ type: 'error', text: 'Coluna "FT ID" não encontrada.' });
            return finalizeValidatorResult(messages, [], []);
        }
        const timeIdx = header.findIndex(h => h.includes('carimbo') || h.includes('timestamp') || h.includes('data'));
        const dataRows = rows.slice(1);
        const missingIds = dataRows.filter(r => !String(r[idx] || '').trim()).length;
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        if (missingIds) messages.push({ type: 'warn', text: `Linhas sem FT ID: ${missingIds}` });
        const previewColumns = timeIdx >= 0 ? ['FT ID', 'Data'] : ['FT ID'];
        const previewRows = dataRows.slice(0, 10).map(r => (timeIdx >= 0 ? [r[idx] || '', r[timeIdx] || ''] : [r[idx] || '']));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'phones') {
        const header = rows[0].map(normalizeHeaderValue);
        let idxRE = header.findIndex(h => h.includes('RE') || h.includes('MATRICULA'));
        let idxPhone = header.findIndex(h => h.includes('TELEFONE') || h.includes('CELULAR') || h.includes('WHATSAPP') || h.includes('CONTATO'));
        let idxName = header.findIndex(h => h.includes('NOME') || h.includes('COLABORADOR') || h.includes('FUNCIONARIO'));
        if (idxRE < 0 || idxPhone < 0) {
            messages.push({ type: 'error', text: 'Colunas obrigatórias ausentes: RE e Telefone.' });
            return finalizeValidatorResult(messages, [], []);
        }
        const dataRows = rows.slice(1);
        const missingPhones = dataRows.filter(r => String(r[idxRE] || '').trim() && !String(r[idxPhone] || '').trim()).length;
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        if (missingPhones) messages.push({ type: 'warn', text: `Linhas com RE sem telefone: ${missingPhones}` });
        const previewColumns = ['Nome', 'RE', 'Telefone'];
        const previewRows = dataRows.slice(0, 10).map(r => ([
            idxName >= 0 ? r[idxName] || '' : '',
            r[idxRE] || '',
            r[idxPhone] || ''
        ]));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'address_units') {
        const headerIndex = rows.findIndex(row => {
            const normalized = row.map(normalizeHeaderValue);
            const hasUnit = normalized.some(h => h.includes('UNIDADE') || h.includes('POSTO') || h.includes('CLIENTE'));
            const hasAddress = normalized.some(h => h.includes('ENDERECO'));
            return hasUnit && hasAddress;
        });
        const idxRow = headerIndex >= 0 ? headerIndex : 0;
        const headers = rows[idxRow].map(normalizeHeaderValue);
        let idxUnit = headers.findIndex(h => h.includes('UNIDADE') || h.includes('POSTO') || h.includes('CLIENTE'));
        let idxAddress = headers.findIndex(h => h.includes('ENDERECO'));
        if (idxUnit < 0 || idxAddress < 0) {
            messages.push({ type: 'error', text: 'Colunas obrigatórias ausentes: Unidade e Endereço.' });
            return finalizeValidatorResult(messages, [], []);
        }
        const dataRows = rows.slice(idxRow + 1);
        const missingAddr = dataRows.filter(r => String(r[idxUnit] || '').trim() && !String(r[idxAddress] || '').trim()).length;
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        if (missingAddr) messages.push({ type: 'warn', text: `Unidades sem endereço: ${missingAddr}` });
        const previewColumns = ['Unidade', 'Endereço'];
        const previewRows = dataRows.slice(0, 10).map(r => ([r[idxUnit] || '', r[idxAddress] || '']));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'address_collabs') {
        const headerIndex = rows.findIndex(row => {
            const normalized = row.map(normalizeHeaderValue);
            const hasRe = normalized.some(h => h.includes('MATRICULA') || h === 'RE');
            const hasAddress = normalized.some(h => h.includes('ENDERECO'));
            return hasRe && hasAddress;
        });
        const idxRow = headerIndex >= 0 ? headerIndex : 0;
        const headers = rows[idxRow].map(normalizeHeaderValue);
        let idxRE = headers.findIndex(h => h.includes('MATRICULA') || h === 'RE');
        let idxAddress = headers.findIndex(h => h.includes('ENDERECO'));
        if (idxRE < 0 || idxAddress < 0) {
            messages.push({ type: 'error', text: 'Colunas obrigatórias ausentes: RE e Endereço.' });
            return finalizeValidatorResult(messages, [], []);
        }
        const dataRows = rows.slice(idxRow + 1);
        const missingAddr = dataRows.filter(r => String(r[idxRE] || '').trim() && !String(r[idxAddress] || '').trim()).length;
        messages.push({ type: 'info', text: `Linhas analisadas: ${dataRows.length}` });
        if (missingAddr) messages.push({ type: 'warn', text: `REs sem endereço: ${missingAddr}` });
        const previewColumns = ['RE', 'Endereço'];
        const previewRows = dataRows.slice(0, 10).map(r => ([r[idxRE] || '', r[idxAddress] || '']));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    if (source.type === 'reciclagem') {
        const entries = parseReciclagemCsv(csvText, source.sheetKey || '').filter(validateReciclagemEntry);
        messages.push({ type: 'info', text: `Registros detectados: ${entries.length}` });
        if (!entries.length) {
            messages.push({ type: 'error', text: 'Nenhum registro válido identificado na planilha.' });
        }
        const missingDates = entries.filter(e => !e.expiryIso).length;
        if (missingDates) messages.push({ type: 'warn', text: `Registros sem data válida: ${missingDates}` });
        const previewColumns = ['Nome', 'RE', 'Unidade', 'Data bruta', 'Validade'];
        const previewRows = entries.slice(0, 10).map(e => ([
            e.name || '',
            e.re || '',
            e.unit || '',
            e.dateRaw || '',
            e.expiryIso || ''
        ]));
        return finalizeValidatorResult(messages, previewColumns, previewRows);
    }

    messages.push({ type: 'warn', text: 'Tipo de planilha não reconhecido.' });
    return finalizeValidatorResult(messages, [], []);
}

function toSourceViewUrl(url) {
    if (!url) return url;
    if (url.includes('output=csv')) {
        return url.replace('output=csv', 'pubhtml');
    }
    return url;
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
        renderLancamentos,
        syncFtSheetLaunches,
        syncTrocaSheetLaunches,
        syncFtFormResponses
    }),
    config: Object.freeze({
        switchConfigTab,
        renderConfigSummary,
        renderSheetValidatorOptions,
        validateSelectedSheet
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
// Redeploy trigger at Mon Feb  9 10:25:51 UTC 2026
