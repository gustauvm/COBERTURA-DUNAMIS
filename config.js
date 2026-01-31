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
    ftForms: {
        bombeiros: {
            formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeuOXsSQLZszJCNp9rDph6tSQIfbKDv-AsCygTWzPJvtS6Ypw/viewform',
            responsesCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTMyDDUprjmq2WLQngddbpmu2nMLKbchfhUQBC2_WjfjAElytpuQXgJhsdWdPESVY-3OMhMMnlniVUV/pub?output=csv', // URL CSV da planilha de respostas publicada
            entries: {
                name: 'entry.2096846072',
                re: 'entry.537356291',
                unitCurrent: 'entry.447111840',
                unitTarget: 'entry.741764159',
                date: 'entry.1399757667',
                shift: 'entry.1775882698',
                reason: 'entry.1514142249',
                covering: 'entry.1288672472',
                notes: 'entry.2119128657',
                createdBy: 'entry.2055959210',
                ftId: 'entry.1267028897'
            }
        },
        servicos: {
            formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdK334I9A_6fkYmgn11XvrkgNWYVgfeG0QZD8LHcKJeFl09XA/viewform',
            responsesCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSR1gMUPMVIUwhnDYjcD8EHfRk_Sjx-WSHUF9gXBbwYtUmVpKDRVWAK6OS1FCBuGYdtJCgNQ79_SgNN/pub?output=csv',
            entries: {
                name: 'entry.2096846072',
                re: 'entry.537356291',
                unitCurrent: 'entry.447111840',
                unitTarget: 'entry.741764159',
                date: 'entry.1399757667',
                shift: 'entry.1775882698',
                reason: 'entry.1514142249',
                covering: 'entry.1288672472',
                notes: 'entry.2119128657',
                createdBy: 'entry.2055959210',
                ftId: 'entry.1267028897'
            }
        },
        seguranca: {
            formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSf3Oq39lhapxIUocw6IKoop-7xzi2uN2DpXkQgiZmMiN5S2ig/viewform',
            responsesCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSo_a8pTABswSOYJ07etUZ72xS-h_4r9snM9kyeVFt6OdkQWm5wq38vWnduTUoDPDPFGFnpu833lity/pub?output=csv',
            entries: {
                name: 'entry.2096846072',
                re: 'entry.537356291',
                unitCurrent: 'entry.447111840',
                unitTarget: 'entry.741764159',
                date: 'entry.1399757667',
                shift: 'entry.1775882698',
                reason: 'entry.1514142249',
                covering: 'entry.1288672472',
                notes: 'entry.2119128657',
                createdBy: 'entry.2055959210',
                ftId: 'entry.1267028897'
            }
        },
        rb: {
            formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSdCNcG_OSqRMbX0xdOApya2ydofiPWqavgyeMUkV6v_SMwHnw/viewform',
            responsesCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRsPqoRBIt90C4DdH1lk4vpQCsKlHRgXNdIwbueKNvow_bVJdcDs7k8OcXOSB-9DbZyeJ4eDhtixOSs/pub?output=csv',
            entries: {
                name: 'entry.2096846072',
                re: 'entry.537356291',
                unitCurrent: 'entry.447111840',
                unitTarget: 'entry.741764159',
                date: 'entry.1399757667',
                shift: 'entry.1775882698',
                reason: 'entry.1514142249',
                covering: 'entry.1288672472',
                notes: 'entry.2119128657',
                createdBy: 'entry.2055959210',
                ftId: 'entry.1267028897'
            }
        },
        geral: {
            formUrl: 'https://docs.google.com/forms/d/e/1FAIpQLSeXBJnu5Pk8udDKbS3eQKxtAJI_BN_nXSF8omA8pfDJSIH33g/viewform',
            responsesCsv: 'https://docs.google.com/spreadsheets/d/e/2PACX-1vTS3FwB36PK12tJwT0TYlI55M8KgPw4hbn67wXEOikCrFWQ4c9iHvS3foz_p8pJn_FeikzVq1Jdb7D5/pub?output=csv',
            entries: {
                name: 'entry.2096846072',
                re: 'entry.537356291',
                unitCurrent: 'entry.447111840',
                unitTarget: 'entry.741764159',
                date: 'entry.1399757667',
                shift: 'entry.1775882698',
                reason: 'entry.1514142249',
                covering: 'entry.1288672472',
                notes: 'entry.2119128657',
                createdBy: 'entry.2055959210',
                ftId: 'entry.1267028897'
            }
        }
    },
    ftReasons: [
        { value: 'troca', label: 'Troca' },
        { value: 'cobertura', label: 'Cobertura' },
        { value: 'falta', label: 'Falta' },
        { value: 'evento', label: 'Evento' },
        { value: 'outro', label: 'Outro' }
    ],
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
