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
let shadowStatus = {
    available: false,
    lastPull: null,
    lastPush: null,
    pending: false,
    error: null
};

// ==========================================================================
// 🔐 GERENCIAMENTO & AUTENTICAÇÃO (SITE-ONLY)
// ==========================================================================

const SiteAuth = {
    logged: false,
    mode: 'view', // 'view' | 'edit'
    user: null,
    re: null,
    admins: []
};

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

function saveLocalState() {
    localStorage.setItem('collaboratorEdits', JSON.stringify(collaboratorEdits));
    localStorage.setItem('unitMetadata', JSON.stringify(unitMetadata));
    localStorage.setItem('changeHistory', JSON.stringify(changeHistory));
    scheduleShadowSync('local-save');
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
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    });
    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch {
        return null;
    }
}

function buildShadowState() {
    return {
        collaboratorEdits,
        unitMetadata,
        changeHistory,
        localCollaborators: getLocalCollaborators(),
        updatedAt: new Date().toISOString()
    };
}

function applyShadowState(state) {
    if (!state) return;
    collaboratorEdits = state.collaboratorEdits || {};
    unitMetadata = state.unitMetadata || {};
    changeHistory = Array.isArray(state.changeHistory) ? state.changeHistory : [];
    if (Array.isArray(state.localCollaborators)) {
        saveLocalCollaborators(state.localCollaborators);
    }
    saveLocalState();
    renderAuditList();
}

function scheduleShadowSync(reason) {
    if (!shadowEnabled()) return;
    if (shadowSyncTimer) clearTimeout(shadowSyncTimer);
    shadowSyncTimer = setTimeout(() => {
        shadowPushAll(reason);
    }, 700);
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
    if (!el) return;
    if (!shadowEnabled()) {
        el.innerHTML = `<div class="shadow-status off">Shadow não configurado.</div>`;
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
    SiteAuth.mode = 'edit';
    try {
        const decoded = atob(hash);
        const parts = decoded.split(':');
        SiteAuth.re = parts[0] || null;
    } catch {}
    document.body.classList.add('mode-edit');
}

function saveAuthToStorage() {
    const keep = document.getElementById('keepLogged')?.checked;
    localStorage.setItem('keepLogged', keep ? '1' : '0');
    localStorage.setItem('authHash', keep ? (SiteAuth.admins.find(a => a.name === SiteAuth.user)?.hash || '') : '');
}

// Inicializa admins (Hardcoded na primeira carga, depois localStorage)
function initAdmins() {
    const stored = localStorage.getItem('adminUsers');
    if (stored) {
        SiteAuth.admins = JSON.parse(stored);
        return;
    }

    SiteAuth.admins = [
        { hash: btoa('7164:0547'), name: 'GUSTAVO CORTES BRAGA' },
        { hash: btoa('4648:4643'), name: 'MOISÉS PEREIRA FERNANDES' },
        { hash: btoa('3935:1288'), name: 'WAGNER MONTEIRO' }
    ];

    saveAdmins();
}

function saveAdmins() {
    localStorage.setItem('adminUsers', JSON.stringify(SiteAuth.admins));
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
    loadAuthFromStorage();
    loadUnitAddressDb();
    shadowPullState();
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
            <div class="gateway-card" onclick="loadGroup('todos')">
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
    appContainer.style.display = 'block';
    contentArea.innerHTML = '<div class="loading">Carregando dados do Google Sheets...</div>';

    if (shadowEnabled() && !shadowReady) {
        await shadowPullState(true);
    }
    
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
    currentData = [];
    currentGroup = '';
    hiddenUnits.clear();
    minimizedUnits.clear();
    // Não limpamos unitMetadata e collaboratorEdits aqui para permitir persistência na sessão
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
    contentArea.innerHTML = `
        <!-- Navegação de Abas -->
        <div class="tabs">
            <button class="tab-btn active" onclick="switchTab('busca')">${ICONS.search} Busca Rápida</button>
            <button class="tab-btn" onclick="switchTab('unidades')">${ICONS.building} Unidades</button>
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
                <div class="search-filters"></div>
            </div>
            <div id="search-results" class="results-grid"></div>
        </div>

        <div id="tab-content-unidades" class="tab-content hidden">
            <!-- Barra de Estatísticas -->
            <div id="stats-bar" class="stats-bar"></div>
            <!-- Controles -->
            <div class="unit-controls">
                <div class="unit-search-container">
                    <input type="text" id="unit-search-input" class="search-input" 
                        placeholder="🔍 Buscar unidade..." autocomplete="off">
                </div>
                <div class="unit-filters">
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
                    <button class="btn btn-secondary" style="width: auto; margin-bottom: 0;" onclick="openExportModal()">
                        ${ICONS.download} Exportar
                    </button>
                    <button class="btn btn-secondary" style="width: auto; margin-bottom: 0;" onclick="openHistoryModal()">
                        ${ICONS.history} Histórico
                    </button>
                </div>
            </div>
            <div id="units-list"></div>
        </div>

        <div id="tab-content-config" class="tab-content hidden">
            <div class="config-shell">
                <div id="config-login" class="config-gate">
                    <div class="config-card">
                        <div class="card-title">Acesso Administrativo</div>
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

                <div id="config-content" class="hidden">
                    <div class="config-tabs">
                        <button class="config-tab active" onclick="switchConfigTab('access')">Acesso</button>
                        <button class="config-tab" onclick="switchConfigTab('datasource')">Fonte de Banco de Dados</button>
                    </div>

                    <div id="config-pane-access" class="config-pane">
                        <div class="config-card">
                            <div class="card-title">Login</div>
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

                        <div class="config-card hidden" id="adminTools">
                            <div class="card-title">Admin</div>
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

                    <div id="config-pane-datasource" class="config-pane hidden">
                        <div class="config-card">
                            <div class="card-title">Modo de Banco de Dados</div>
                            <div class="field-row">
                                <label><input type="checkbox" id="useNextiToggle" onchange="toggleSource('nexti')"> Fonte principal: Nexti</label>
                            </div>
                            <div class="field-row">
                                <label><input type="checkbox" id="disableCsvToggle" onchange="toggleSource('csv')"> Fallback: usar Planilhas (CSV) se Nexti falhar</label>
                            </div>
                        </div>

                        <div class="config-card">
                            <div class="card-title">Status das Fontes</div>
                            <div id="sourceStatus" class="source-status"></div>
                            <div id="dataSourceList" class="source-list"></div>
                        </div>

                        <div class="config-card">
                            <div class="card-title">Sincronização (Shadow)</div>
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
            </div>
        </div>

        <!-- Modal de Edição -->
        <div id="edit-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${ICONS.edit} Editar Colaborador</h3>
                    <button class="close-modal" onclick="closeEditModal()">${ICONS.close}</button>
                </div>
                
                <input type="hidden" id="edit-id">
                
                <div class="form-group" style="background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #e9ecef;">
                    <label style="color: var(--dunamis-blue);">Nome do Responsável (Obrigatório)</label>
                    <input type="text" id="edit-responsavel" placeholder="Quem está realizando a alteração?">
                </div>

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
                    <button class="btn" style="width: auto;" onclick="salvarEdicao()">Salvar</button>
                </div>
            </div>
        </div>

        <!-- Modal de Edição de Unidade -->
        <div id="edit-unit-modal" class="modal hidden">
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${ICONS.settings} Editar Unidade</h3>
                    <button class="close-modal" onclick="closeEditUnitModal()">${ICONS.close}</button>
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
                        <div class="form-group"><input type="text" id="new-colab-horario" placeholder="Horário"></div>
                        <div class="form-group"><input type="text" id="new-colab-unidade" placeholder="Unidade (opcional)"></div>
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

                <div class="modal-actions">
                    <button class="btn" onclick="salvarEdicaoUnidade()">Salvar</button>
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
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Atualiza botões
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // Atualiza conteúdo
    document.getElementById('tab-content-busca').classList.add('hidden');
    document.getElementById('tab-content-unidades').classList.add('hidden');
    document.getElementById('tab-content-config').classList.add('hidden');
    
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');

    if (tabName === 'config' && !SiteAuth.logged) {
        document.getElementById('config-login')?.classList.remove('hidden');
        document.getElementById('config-content')?.classList.add('hidden');
    }

    if (tabName === 'busca') {
        document.getElementById('search-input').focus();
    }
}

function switchConfigTab(tabName) {
    document.querySelectorAll('.config-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    document.getElementById('config-pane-access').classList.add('hidden');
    document.getElementById('config-pane-datasource').classList.add('hidden');
    document.getElementById(`config-pane-${tabName}`).classList.remove('hidden');
}

// 5. Lógica da Busca Rápida
function realizarBusca() {
    const termo = document.getElementById('search-input').value;
    const filterStatus = 'all';
    const hideAbsence = false;
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
            return filterStatus === 'plantao' ? isPlantao : !isPlantao;
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
        const bgClass = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT') ? 'bg-plantao' : 'bg-folga';

        return `
            <div class="result-card ${bgClass}" style="border-left: 5px solid ${statusInfo.color}">
                <div class="card-header">
                    <div class="header-left">
                        <span class="colaborador-nome">${item.nome}</span>
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

    unitsContainer.innerHTML = postosOrdenados.map(posto => {
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

        return `
            <div class="unit-section" id="${safeId}">
                <h3 class="unit-title">
                    <span>${posto} <span class="count-badge">${efetivo.length}</span> ${rotuloUnitHtml}</span>
                    <div class="unit-actions">
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
                        <h4 class="team-header header-plantao">EM PLANTÃO (${timePlantao.length})</h4>
                        ${renderUnitTable(timePlantao)}
                    </div>

                    <!-- Time Folga -->
                    <div class="team-block team-folga">
                        <h4 class="team-header header-folga">NA FOLGA (${timeFolga.length})</h4>
                        ${renderUnitTable(timeFolga)}
                    </div>
                </div>
            </div>
        `;
    }).join('');
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
    return;
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
                        return `
                            <tr>
                                <td>
                                    <div class="colab-cell">
                                        <strong>${p.nome}</strong>
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
            return { text: r, color: '#6c757d' }; // Cinza
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

function renderAiResultCard(item, target) {
    const statusInfo = getStatusInfo(item);
    const turnoInfo = getTurnoInfo(item.escala);
    const retornoInfo = item.rotulo && item.rotuloFim ? `<span class="return-date">Retorno: ${formatDate(item.rotuloFim)}</span>` : '';
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
    const bgClass = statusInfo.text.includes('PLANTÃO') || statusInfo.text.includes('FT') ? 'bg-plantao' : 'bg-folga';
    const reason = buildAiReason(item, target);

    return `
        <div class="result-card ${bgClass}" style="border-left: 5px solid ${statusInfo.color}">
            <div class="card-header">
                <div class="header-left">
                    <span class="colaborador-nome">${item.nome}</span>
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
    const responsavel = document.getElementById('edit-responsavel').value.trim();

    if (!responsavel) {
        showToast("Por favor, informe o nome do responsável pela alteração.", "error");
        return;
    }
    
    if (item) {
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
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: responsavel,
            acao: "Edição de Colaborador",
            detalhe: `Alterou dados de ${item.nome} (${item.re})`
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

    document.getElementById('edit-unit-modal').classList.remove('hidden');
}

function closeEditUnitModal() {
    document.getElementById('edit-unit-modal').classList.add('hidden');
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

    // Atualizar chave dos metadados se o nome mudar
    if (newName && newName !== oldName) {
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
            detalhe: `Renomeou ${oldName} para ${newName}`
        });
    }

    // Salvar novos metadados
    const targetName = newName || oldName;
    unitMetadata[targetName] = { rotulo, detalhe, responsavel };
    saveLocalState();

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
    
    currentData.forEach(item => {
        if (ids.includes(item.id)) {
            if (action === 'move') item.posto = value;
            if (action === 'scale') item.escala = value;
        }
    });

    showToast(`${checkboxes.length} colaboradores atualizados!`, "success");
    renderizarUnidades();
    closeEditUnitModal();
}

function removerColaborador() {
    const responsavel = document.getElementById('edit-responsavel').value.trim();
    if (!responsavel) {
        showToast("Informe o responsável antes de excluir.", "error");
        return;
    }

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
            detalhe: `Removeu ${item ? item.nome : 'Colaborador'} do sistema`
        });
        saveLocalState();
    }
}

function adicionarColaboradorNaUnidade() {
    const nome = document.getElementById('new-colab-nome').value.toUpperCase().trim();
    const re = document.getElementById('new-colab-re').value.trim();
    const telefone = document.getElementById('new-colab-telefone').value.replace(/\D/g, '');
    const horario = document.getElementById('new-colab-horario').value.trim();
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

    currentData.push({
        id: newId,
        nome: nome,
        re: re,
        posto: posto,
        escala: horario,
        tipoEscala: tipoEscala,
        turma: 1,
        rotulo: '',
        rotuloInicio: '',
        rotuloFim: '',
        rotuloDetalhe: '',
        grupo: grupo,
        telefone: telefone
    });

    document.getElementById('new-colab-nome').value = '';
    document.getElementById('new-colab-re').value = '';
    document.getElementById('new-colab-telefone').value = '';
    document.getElementById('new-colab-horario').value = '';
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
        detalhe: `Adicionou ${nome} em ${posto}`
    });
    saveLocalState();
}

// ==========================================================================
// 📌 MODO NOTURNO
// ==========================================================================
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    const isDark = document.body.classList.contains('dark-mode');
    localStorage.setItem('darkMode', isDark);
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
    if (changeHistory.length === 0) {
        list.innerHTML = '<p class="empty-state">Nenhuma alteração registrada nesta sessão.</p>';
    } else {
        list.innerHTML = changeHistory.map(h => `
            <div class="member-item" style="border-left: 3px solid var(--dunamis-blue); padding-left: 10px; margin-bottom: 10px;">
                <div style="font-size: 0.8rem; color: #666;">${h.data} - <strong>${h.responsavel}</strong></div>
                <div style="font-weight: bold;">${h.acao}</div>
                <div>${h.detalhe}</div>
            </div>
        `).join('');
    }
    document.getElementById('history-modal').classList.remove('hidden');
}

function closeHistoryModal() {
    document.getElementById('history-modal').classList.add('hidden');
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
        "Detalhe": h.detalhe || ''
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
    SiteAuth.mode = 'edit';
    
    // Ativa modo edição visualmente
    document.body.classList.add('mode-edit');

    document.getElementById('config-login')?.classList.add('hidden');
    document.getElementById('config-content')?.classList.remove('hidden');

    updateMenuStatus();
    renderAdminList();
    renderAuditList();
    saveAuthToStorage();

    showToast("Login efetuado com sucesso, agora você está no modo editor.", "success");
}

function logoutSite() {
    SiteAuth.logged = false;
    SiteAuth.user = null;
    SiteAuth.re = null;
    SiteAuth.mode = 'view';
    
    document.body.classList.remove('mode-edit');

    document.getElementById('config-login')?.classList.remove('hidden');
    document.getElementById('config-content')?.classList.add('hidden');

    updateMenuStatus();
    localStorage.setItem('keepLogged', '0');
    localStorage.removeItem('authHash');
}

function toggleEditMode() {
    if (!SiteAuth.logged) return;

    SiteAuth.mode = SiteAuth.mode === 'edit' ? 'view' : 'edit';
    
    document.body.classList.toggle('mode-edit', SiteAuth.mode === 'edit');
    updateMenuStatus();
}

function renderAdminList() {
    const list = document.getElementById('adminList');
    if (!list) return;

    list.innerHTML = '';

    SiteAuth.admins.forEach(a => {
        const div = document.createElement('div');
        div.style.padding = "6px";
        div.style.borderBottom = "1px solid #333";
        div.style.fontSize = "0.8rem";
        div.innerHTML = `
            👤 ${a.name}
            <button onclick="removeAdmin('${a.hash}')"
                style="float:right;background:#dc3545;color:white;border:none;padding:2px 6px;border-radius:4px;">
                X
            </button>
        `;
        list.appendChild(div);
    });
}

function addAdmin() {
    const re = prompt('RE do colaborador');
    if (!re) return;
    
    const person = currentData?.find(p => p.re === re || p.re?.endsWith(re));
    if (!person) {
        alert('Colaborador não encontrado na base carregada.');
        return;
    }

    const cpf = prompt('4 primeiros dígitos do CPF');
    if (!cpf) return;

    const hash = btoa(re + ":" + cpf);
    if (SiteAuth.admins.some(a => a.hash === hash)) {
        alert('Este admin já existe.');
        return;
    }

    SiteAuth.admins.push({ hash: hash, name: person.nome });
    saveAdmins();
    renderAdminList();
}

function removeAdmin(hash) {
    if (!confirm('Remover administrador?')) return;
    SiteAuth.admins = SiteAuth.admins.filter(a => a.hash !== hash);
    saveAdmins();
    renderAdminList();
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
        siteModeEl.innerHTML = SiteAuth.mode === 'edit'
            ? `<span class="status-badge-menu edit">EDIÇÃO</span>`
            : `<span class="status-badge-menu view">VISUALIZAÇÃO</span>`;
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
        adminToolsEl.classList.toggle('hidden', !(SiteAuth.logged && SiteAuth.mode === 'edit'));
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

function saveLocalCollaborators(list) {
    localStorage.setItem('localCollaborators', JSON.stringify(list));
    scheduleShadowSync('local-collaborators');
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
