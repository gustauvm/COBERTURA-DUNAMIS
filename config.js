const CONFIG = {
    // Fonte única: Supabase
    dataSource: 'supabase',
    supabase: {
        url: 'https://bvpcbviggbxnpqoprnxq.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJ2cGNidmlnZ2J4bnBxb3BybnhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0OTAzMTYsImV4cCI6MjA4OTA2NjMxNn0.ViZumUOJRgeCdpv6eVlcsSwv10WBAgp7mqZHaWEdkZs'
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
