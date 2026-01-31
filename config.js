const CONFIG = {
    useApiNexti: false, // CSV é a fonte oficial nesta fase (Nexti inativo)
    disableCsvFallback: true, // CSV desabilitado por padrão (ativar apenas manualmente)
    shadow: {
        // Web App do Google Apps Script (público)
        webAppUrl: 'https://script.google.com/macros/s/AKfycbzt8wcayeu5igh7jrIFIWL6-2_m_-23G_r6xjImsbkevGEf3VrYzjNGGU8-P1_Aoldd/exec',
        // Token opcional (deixe vazio se o Web App for público)
        token: ''
    },
    api: {
        baseUrl: 'https://api.nexti.com.br/api/v1', // URL Base da API (Verificar URL correta do ambiente)
        token: 'SEU_TOKEN_AQUI' // Token de acesso Bearer
    },
    sheets: {
        bombeiros: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS29f9zGs72Lf557GYyR3H601ZXF94CHAejfp_mUnIbqESE7NFTvzxNQF9eyvMDROC4HZDEtWnSHRbx/pub?output=csv',
        servicos: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vS8zA3MOPL8DQBSl99o72Zv0WuzkBb3SJqv0cfhxzbwA5a3ngr7rTLIJ-ZNvreQwLiV_jiE88D2VwHX/pub?output=csv',
        seguranca: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQjXlI9WjWYK0tKWRFwblimZNv3UrvzN9osC_9gY_vZurmyjm_DSSMr9nZ6o7Tl7DN1iR3ADxfK_giy/pub?output=csv',
        rb: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTOfqxdOn5xHlbv-JTIWcLlSMrJk6j4RRQKXnjOK2fka4FdSB8qQjwHT8ZJuJHRbp42WfHSpQ92drh/pub?output=csv',
        phones: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRowojoW0Y5Ojk6LHhAZjnlki2ecvnG_qkWgRAZWcefwTZt3QfH5iaIaY4vnrUPNBZ8CTbEuR1Mya_D/pub?output=csv'
    },
    images: {
        bombeiros: 'images/logo-dunamis-bombeiros.png',
        servicos: 'images/logo-dunamis-servicos.png',
        seguranca: 'images/logo-dunamis-seguranca.png',
        rb: 'images/logo-rb.png'
    },
    sheetUpdatedAt: '31/01/2026, 00:24:43'
};

// Função auxiliar para ler CSV
async function fetchSheetData(url) {
    try {
        const response = await fetch(url);
        const text = await response.text();
        // Retorna o texto cru do CSV para ser processado pela lógica existente
        return text;
    } catch (error) {
        console.error("Erro ao carregar planilha:", error);
        alert("Erro ao carregar dados. Verifique sua conexão.");
        return null;
    }
}
