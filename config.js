const CONFIG = {
    // Fonte única: Supabase
    dataSource: 'supabase',
    supabase: {
        url: 'https://bvpcbviggbxnpqoprnxq.supabase.co',
        anonKey: 'sb_publishable_lZUTf0HSWpQ_rQthObW0Ng_6BjZmDB_'
    },
    auth: {
        requireLogin: true,
        bootstrapAdmins: ['nextibombeiros@gmail.com']
    },
    groupRules: [
        { key: 'bombeiros', label: 'Bombeiros', patterns: ['BOMBEIRO', 'BOMBEIROS', 'BRIGADA'] },
        { key: 'servicos', label: 'Serviços', patterns: ['SERVICO', 'SERVIÇO', 'SERVICOS', 'SERVIÇOS'] },
        { key: 'seguranca', label: 'Segurança', patterns: ['SEGURANCA', 'SEGURANÇA', 'VIGILANCIA', 'VIGILÂNCIA', 'VIGILANTE'] },
        { key: 'rb', label: 'RB Facilities', patterns: ['RB FACILITIES', 'RB FACILITY', 'RB'] }
    ],
    images: {
        bombeiros: 'images/logo-dunamis-bombeiros.png',
        servicos: 'images/logo-dunamis-servicos.png',
        seguranca: 'images/logo-dunamis-seguranca.png',
        rb: 'images/logo-rb.png'
    },
    routing: {
        osrmBaseUrl: 'https://router.project-osrm.org',
        osrmProfile: 'driving',
        osrmEnabled: true,
        osrmMaxCandidates: 12
    },
    ftReasons: [
        { value: 'troca', label: 'Troca' },
        { value: 'cobertura', label: 'Cobertura' },
        { value: 'falta', label: 'Falta' },
        { value: 'evento', label: 'Evento' },
        { value: 'outro', label: 'Outro' }
    ]
};
