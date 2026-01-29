// Estado da Aplicação
let currentData = [];
let currentGroup = '';
let currentTab = 'busca'; // 'busca' ou 'unidades'
let hiddenUnits = new Set(); // Armazena postos ocultos na busca
let unitMetadata = {}; // Armazena rótulos das unidades
let collaboratorEdits = {}; // Armazena edições locais de colaboradores (Chave: RE)
let changeHistory = []; // Log de alterações
let minimizedUnits = new Set(); // Armazena unidades minimizadas

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

// Elementos DOM
const gateway = document.getElementById('gateway');
const appContainer = document.getElementById('app-container');
const appTitle = document.getElementById('app-title');
const contentArea = document.getElementById('content-area');

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    renderGateway();
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

// 2. Carregar Dados (Integração Google Sheets)
async function loadGroup(groupKey) {
    currentGroup = groupKey;
    
    // UI Feedback
    gateway.classList.add('hidden');
    appContainer.style.display = 'block';
    contentArea.innerHTML = '<div class="loading">Carregando dados do Google Sheets...</div>';
    
    // Verificar se existem edições locais
    let keepChanges = false;
    if (Object.keys(collaboratorEdits).length > 0 || Object.keys(unitMetadata).length > 0) {
        keepChanges = confirm("Existem alterações locais salvas (edições de colaboradores ou unidades). Deseja mantê-las sobre os dados da planilha?");
        if (!keepChanges) {
            collaboratorEdits = {};
            unitMetadata = {};
        }
    }

    // Carregar dados de telefones
    const phoneCsv = await fetchSheetData(CONFIG.sheets.phones);
    const phoneMap = processPhoneData(phoneCsv);

    currentData = [];
    
    if (groupKey === 'todos') {
        const keys = Object.keys(CONFIG.sheets);
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
        
        currentData = allItems.map((item, idx) => ({ ...item, id: idx }));
        appTitle.innerText = 'Gerenciamento de Efetivos - Geral';
    } else {
        const csv = await fetchSheetData(CONFIG.sheets[groupKey]);
        if (csv) {
            const rows = parseCSV(csv);
            if (rows.length > 0) rows.shift();
            // Vincula telefones automáticos para todos os grupos
            const items = mapRowsToObjects(rows, groupKey, keepChanges, phoneMap);
            currentData = items.map((item, idx) => ({ ...item, id: idx }));
        }
        appTitle.innerText = `Gerenciamento de Efetivos - ${groupKey.toUpperCase()}`;
    }

    renderDashboard();
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

function mapRowsToObjects(rows, groupTag, keepChanges, phoneMap) {
    return rows.map((cols) => {
        if (cols.length < 6) return null; // Garante mínimo de colunas

        const re = (cols[5] || '').trim();
        
        // Se optou por manter alterações e existe edição para este RE, usa a edição
        if (keepChanges && collaboratorEdits[re]) {
            return { ...collaboratorEdits[re], grupo: groupTag }; // Mantém grupo atual
        }

        const nome = (cols[4] || '').trim().toUpperCase();
        const telefone = findPhone(re, nome, phoneMap);

        // Extração de Tipo de Escala (12x36, 5x2, etc)
        let rawEscala = cols[2] || '';
        let tipoEscala = '';
        const matchEscala = rawEscala.match(/(12[xX]36|5[xX]2|6[xX]1)/i);
        if (matchEscala) {
            tipoEscala = matchEscala[0].toUpperCase();
        }

        const obj = {
            // ID será atribuído depois
            nome: (cols[4] || '').trim().toUpperCase(),
            re: (cols[5] || '').trim(),
            posto: (cols[7] || '').trim().toUpperCase() || 'N/I',
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
        </div>

        <!-- Conteúdo das Abas -->
        <div id="tab-content-busca" class="tab-content">
            <div class="search-container">
                <input type="text" id="search-input" class="search-input" 
                       placeholder="Digite nome, RE ou unidade..." autocomplete="off">
                <div class="search-filters">
                    <label class="filter-option"><input type="radio" name="filterStatus" value="all" checked> Todos</label>
                    <label class="filter-option"><input type="radio" name="filterStatus" value="plantao"> Em Plantão</label>
                    <label class="filter-option"><input type="radio" name="filterStatus" value="folga"> De Folga</label>
                    <label class="filter-option"><input type="checkbox" id="filter-no-absence" onchange="realizarBusca()"> Ocultar Afastamentos</label>
                </div>
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
                    <button class="btn btn-secondary" style="width: auto; margin-bottom: 0;" onclick="exportarDadosExcel()">
                        ${ICONS.download} Excel
                    </button>
                    <button class="btn btn-secondary" style="width: auto; margin-bottom: 0;" onclick="exportarDadosCSV()">
                        ${ICONS.download} CSV
                    </button>
                    <button class="btn btn-secondary" style="width: auto; margin-bottom: 0;" onclick="openHistoryModal()">
                        ${ICONS.history} Histórico
                    </button>
                </div>
            </div>
            <div id="units-list"></div>
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
                
                <div class="form-group" style="background: #f8f9fa; padding: 10px; border-radius: 4px; border: 1px solid #e9ecef;">
                    <label style="color: var(--dunamis-blue);">Nome do Responsável (Obrigatório)</label>
                    <input type="text" id="edit-unit-responsavel" placeholder="Quem está realizando a alteração?">
                </div>

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
    `;

    // Configurar evento de busca
    const searchInput = document.getElementById('search-input');
    searchInput.addEventListener('input', () => realizarBusca());
    
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
    
    document.getElementById(`tab-content-${tabName}`).classList.remove('hidden');

    if (tabName === 'busca') {
        document.getElementById('search-input').focus();
    }
}

// 5. Lógica da Busca Rápida
function realizarBusca() {
    const termo = document.getElementById('search-input').value;
    const filterStatus = document.querySelector('input[name="filterStatus"]:checked').value;
    const hideAbsence = document.getElementById('filter-no-absence').checked;
    const resultsContainer = document.getElementById('search-results');
    
    if (!termo && filterStatus === 'all') {
        resultsContainer.innerHTML = '<p class="empty-state">Digite para buscar ou selecione um filtro...</p>';
        return;
    }

    const termoLimpo = termo.toUpperCase();
    
    const resultados = currentData.filter(item => {
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

    // 2. Verifica Escala Padrão
    const trabalha = verificarEscala(item.turma);
    if (trabalha) return { text: 'PLANTÃO', color: '#dc3545' }; // Vermelho
    return { text: 'FOLGA', color: '#28a745' }; // Verde
}

function openEditModal(id) {
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
        item.nome = document.getElementById('edit-nome').value.toUpperCase();
        item.re = document.getElementById('edit-re').value;
        item.telefone = document.getElementById('edit-telefone').value.replace(/\D/g, ''); // Salva apenas números
        item.posto = document.getElementById('edit-posto').value.toUpperCase();
        item.escala = document.getElementById('edit-escala').value;
        item.turma = parseInt(document.getElementById('edit-turma').value);
        item.rotulo = getCheckboxValues('edit-rotulo-container');
        item.rotuloInicio = document.getElementById('edit-inicio').value;
        item.rotuloFim = document.getElementById('edit-fim').value;
        item.rotuloDetalhe = document.getElementById('edit-rotulo-desc').value;

        // Salvar edição localmente
        collaboratorEdits[item.re] = { ...item };

        // Registrar histórico
        changeHistory.unshift({
            data: new Date().toLocaleString(),
            responsavel: responsavel,
            acao: "Edição de Colaborador",
            detalhe: `Alterou dados de ${item.nome} (${item.re})`
        });

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
    document.getElementById('edit-unit-old-name').value = postoName;
    document.getElementById('edit-unit-new-name').value = postoName;

    document.getElementById('edit-unit-responsavel').value = '';
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
    const responsavel = document.getElementById('edit-unit-responsavel').value.trim();

    if (!responsavel) {
        showToast("Por favor, informe o nome do responsável.", "error");
        return;
    }

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
    unitMetadata[targetName] = { rotulo, detalhe };

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
    }
}

function adicionarColaboradorNaUnidade() {
    const nome = document.getElementById('new-colab-nome').value.toUpperCase().trim();
    const re = document.getElementById('new-colab-re').value.trim();
    const posto = document.getElementById('edit-unit-old-name').value;

    if(!nome || !re) {
        showToast("Preencha Nome e RE.", "error");
        return;
    }

    const newId = currentData.length > 0 ? Math.max(...currentData.map(d => d.id)) + 1 : 1;
    
    // Tenta herdar o grupo de alguém da mesma unidade
    const existingMember = currentData.find(d => d.posto === posto);
    const grupo = existingMember ? existingMember.grupo : (currentGroup !== 'todos' ? currentGroup : 'bombeiros');

    currentData.push({
        id: newId,
        nome: nome,
        re: re,
        posto: posto,
        escala: '',
        turma: 1,
        rotulo: '',
        rotuloInicio: '',
        rotuloFim: '',
        rotuloDetalhe: '',
        grupo: grupo
    });

    document.getElementById('new-colab-nome').value = '';
    document.getElementById('new-colab-re').value = '';
    
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

// Carregar preferência de modo noturno
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
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
    window.open(`https://wa.me/${formatted}`, '_blank');
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