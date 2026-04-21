export const formalizerTypes = {
  troca_posto: 'Troca de posto',
  remanejamento: 'Remanejamento',
  desligamento: 'Desligamento',
  termino_experiencia: 'Término de experiência',
  alteracao_beneficios: 'Alteração de benefícios',
  cobertura: 'Cobertura',
} as const

export const formalizerStatuses = {
  registrado: 'Registrado',
  em_analise: 'Em análise',
  aguardando_dp: 'Aguardando DP',
  aguardando_operacao: 'Aguardando operação',
  aprovado: 'Aprovado',
  executado: 'Executado',
  cancelado: 'Cancelado',
} as const

export const motiveOptions = {
  cobertura_contrato: 'Cobertura contratual',
  ferias: 'Férias',
  falta: 'Falta',
  pedido_cliente: 'Pedido do cliente',
  desempenho: 'Desempenho',
  experiencia: 'Experiência',
  beneficios: 'Benefícios',
  escala: 'Escala',
  desligamento: 'Desligamento',
  outro: 'Outro',
} as const

export const coverageOptions = {
  sem_cobertura: 'Sem cobertura definida',
  cobertura_definida: 'Cobertura já definida',
  temporaria: 'Cobertura temporária',
  definitiva: 'Cobertura definitiva',
} as const

export type FormalizerType = keyof typeof formalizerTypes
export type FormalizerStatus = keyof typeof formalizerStatuses
export type MotiveOption = keyof typeof motiveOptions
export type CoverageOption = keyof typeof coverageOptions

export type Formalizacao = {
  id: string
  protocolo: string
  tipo: FormalizerType
  status: FormalizerStatus
  prioridade: string
  created_at: string
  updated_at?: string
  solicitante_nome: string
  solicitante_cargo: string
  solicitante_telefone: string
  solicitante_email?: string
  colaborador_matricula?: string
  colaborador_re?: string
  colaborador_nome: string
  colaborador_cargo?: string
  posto_atual?: string
  posto_destino?: string
  data_efetiva?: string
  data_fim?: string
  motivo_categoria?: MotiveOption | string
  motivo_observacao?: string
  beneficios_json?: Record<string, unknown>
  cobertura_json?: Record<string, unknown>
  snapshot_json?: Record<string, unknown>
  email_subject?: string
  email_body?: string
  whatsapp_text?: string
}

export type StatusEvent = {
  id: string
  formalizacao_id: string
  status_anterior?: FormalizerStatus
  status_novo: FormalizerStatus
  ator_nome?: string
  observacao?: string
  created_at: string
}

export type FormalizerDraft = {
  tipo: FormalizerType | ''
  prioridade: 'baixa' | 'normal' | 'alta' | 'urgente'
  solicitanteNome: string
  solicitanteCargo: string
  solicitanteTelefone: string
  solicitanteEmail: string
  colaboradorKey: string
  destinoKey: string
  coberturaKey: string
  dataEfetiva: string
  dataFim: string
  motivoCategoria: MotiveOption | ''
  motivoObservacao: string
  beneficios: {
    valeTransporte: boolean
    valeRefeicao: boolean
    adicionalNoturno: boolean
    intrajornada: boolean
    escalaTurno: boolean
    observacoes: string
  }
  cobertura: {
    tipo: CoverageOption | ''
    periodo: string
    observacoes: string
  }
}

export const emptyDraft: FormalizerDraft = {
  tipo: '',
  prioridade: 'normal',
  solicitanteNome: '',
  solicitanteCargo: '',
  solicitanteTelefone: '',
  solicitanteEmail: '',
  colaboradorKey: '',
  destinoKey: '',
  coberturaKey: '',
  dataEfetiva: '',
  dataFim: '',
  motivoCategoria: '',
  motivoObservacao: '',
  beneficios: {
    valeTransporte: false,
    valeRefeicao: false,
    adicionalNoturno: false,
    intrajornada: false,
    escalaTurno: false,
    observacoes: '',
  },
  cobertura: {
    tipo: '',
    periodo: '',
    observacoes: '',
  },
}
