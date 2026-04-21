import { createProtocol, formatDate } from '../../shared/lib/utils'
import { type ColaboradorComUnidade, type Unidade } from '../operational/types'
import { coverageOptions, formalizerTypes, motiveOptions, type Formalizacao, type FormalizerDraft } from './types'

export function requiresDestination(type: FormalizerDraft['tipo']) {
  return type === 'troca_posto' || type === 'remanejamento' || type === 'cobertura'
}

export function validateDraft(draft: FormalizerDraft, colaborador?: ColaboradorComUnidade, destino?: Unidade, cobertura?: ColaboradorComUnidade) {
  if (!draft.tipo) return 'Escolha o tipo de solicitação.'
  if (!draft.solicitanteNome.trim()) return 'Informe o nome do solicitante.'
  if (!draft.solicitanteCargo.trim()) return 'Informe a função/cargo do solicitante.'
  if (!draft.solicitanteTelefone.trim()) return 'Informe o telefone do solicitante.'
  if (!colaborador) return 'Selecione o colaborador.'
  if (!draft.dataEfetiva) return 'Informe a data efetiva.'
  if (!draft.motivoCategoria) return 'Selecione o motivo/categoria.'
  if (requiresDestination(draft.tipo) && !destino) return 'Selecione o posto destino.'
  if (draft.tipo === 'termino_experiencia' && !draft.dataFim) return 'Informe a data fim.'
  if (!draft.cobertura.tipo) return 'Informe a decisão de cobertura.'
  if (draft.cobertura.tipo !== 'sem_cobertura' && !cobertura && !draft.cobertura.observacoes.trim()) {
    return 'Informe o substituto ou uma observação justificando a cobertura.'
  }
  if (
    draft.tipo === 'alteracao_beneficios' &&
    !draft.beneficios.valeTransporte &&
    !draft.beneficios.valeRefeicao &&
    !draft.beneficios.adicionalNoturno &&
    !draft.beneficios.intrajornada &&
    !draft.beneficios.escalaTurno &&
    !draft.beneficios.observacoes.trim()
  ) {
    return 'Marque pelo menos um benefício ou descreva a alteração.'
  }
  return ''
}

function benefitLines(draft: FormalizerDraft) {
  const lines: string[] = []
  if (draft.beneficios.valeTransporte) lines.push('Vale transporte: verificar rota, integração e regra de desconto.')
  if (draft.beneficios.valeRefeicao) lines.push('Refeição / VR: verificar alteração conforme regra da unidade.')
  if (draft.beneficios.adicionalNoturno) lines.push('Adicional noturno: verificar impacto pelo horário solicitado.')
  if (draft.beneficios.intrajornada) lines.push('Intrajornada: verificar intervalo e condição contratual.')
  if (draft.beneficios.escalaTurno) lines.push('Escala / turno: verificar alteração operacional e reflexos em turma.')
  if (draft.beneficios.observacoes.trim()) lines.push(`Observações: ${draft.beneficios.observacoes.trim()}`)
  return lines
}

function coverageText(draft: FormalizerDraft, cobertura?: ColaboradorComUnidade) {
  const label = draft.cobertura.tipo ? coverageOptions[draft.cobertura.tipo] : ''
  const parts = [label]
  if (draft.cobertura.periodo.trim()) parts.push(`Período: ${draft.cobertura.periodo.trim()}`)
  if (cobertura) parts.push(`Substituto: ${cobertura.nome}${cobertura.matricula ? ` (${cobertura.matricula})` : ''}`)
  if (draft.cobertura.tipo === 'sem_cobertura') parts.push('Pendência operacional: definir cobertura antes da execução.')
  if (draft.cobertura.observacoes.trim()) parts.push(`Observações: ${draft.cobertura.observacoes.trim()}`)
  return parts.filter(Boolean).join('\n')
}

export function buildFormalizacaoPayload(draft: FormalizerDraft, colaborador: ColaboradorComUnidade, destino?: Unidade, cobertura?: ColaboradorComUnidade): Partial<Formalizacao> {
  const protocolo = createProtocol('FP')
  const tipoLabel = draft.tipo ? formalizerTypes[draft.tipo] : 'Solicitação'
  const movement = destino ? `${colaborador.posto || 'Posto atual'} -> ${destino.posto}` : colaborador.posto || 'Sem posto atual'
  const subject = `[Solicitação de ${tipoLabel}] ${colaborador.nome} | ${movement} | ${formatDate(draft.dataEfetiva)} | ${protocolo}`
  const benefits = benefitLines(draft)
  const sections = [
    'Prezados,',
    '',
    `Foi registrada uma solicitação de ${tipoLabel.toLowerCase()} para análise e providências administrativas.`,
    '',
    'Protocolo',
    protocolo,
    'Status: Registrado',
    `Prioridade: ${draft.prioridade}`,
    '',
    'Solicitante',
    `Nome: ${draft.solicitanteNome.trim()}`,
    `Função/Cargo: ${draft.solicitanteCargo.trim()}`,
    `Contato: ${draft.solicitanteTelefone.trim()}`,
    draft.solicitanteEmail.trim() ? `E-mail: ${draft.solicitanteEmail.trim()}` : '',
    '',
    'Colaborador',
    `Nome: ${colaborador.nome}`,
    colaborador.matricula ? `Matrícula: ${colaborador.matricula}` : '',
    colaborador.re ? `RE: ${colaborador.re}` : '',
    colaborador.cargo ? `Cargo: ${colaborador.cargo}` : '',
    '',
    'Alteração solicitada',
    colaborador.posto ? `Posto atual: ${colaborador.posto}` : '',
    destino?.posto ? `Posto destino: ${destino.posto}` : '',
    `Data efetiva solicitada: ${formatDate(draft.dataEfetiva)}`,
    draft.dataFim ? `Data fim: ${formatDate(draft.dataFim)}` : '',
    draft.motivoCategoria ? `Motivo: ${motiveOptions[draft.motivoCategoria]}` : '',
    '',
    ...(benefits.length ? ['Impactos informados', ...benefits.map((line) => `• ${line}`), ''] : []),
    'Cobertura',
    coverageText(draft, cobertura),
    draft.motivoObservacao.trim() ? '' : '',
    draft.motivoObservacao.trim() ? 'Observações do solicitante' : '',
    draft.motivoObservacao.trim(),
    '',
    'Solicito análise e confirmação dos impactos em escala, benefícios, cobertura e registros administrativos antes da execução da mudança.',
    '',
    'Atenciosamente,',
    draft.solicitanteNome.trim(),
    draft.solicitanteCargo.trim(),
  ].filter((line) => String(line).trim() !== '')

  const whatsapp = [
    `*${tipoLabel}*`,
    `Protocolo: ${protocolo}`,
    `Colaborador: ${colaborador.nome}`,
    colaborador.posto ? `Atual: ${colaborador.posto}` : '',
    destino?.posto ? `Destino: ${destino.posto}` : '',
    `Data efetiva: ${formatDate(draft.dataEfetiva)}`,
    `Motivo: ${draft.motivoCategoria ? motiveOptions[draft.motivoCategoria] : ''}`,
    `Cobertura: ${coverageText(draft, cobertura).replace(/\n/g, ' | ')}`,
    `Solicitante: ${draft.solicitanteNome.trim()} - ${draft.solicitanteTelefone.trim()}`,
  ].filter(Boolean).join('\n')

  return {
    protocolo,
    tipo: draft.tipo || undefined,
    status: 'registrado',
    prioridade: draft.prioridade,
    solicitante_nome: draft.solicitanteNome.trim(),
    solicitante_cargo: draft.solicitanteCargo.trim(),
    solicitante_telefone: draft.solicitanteTelefone.trim(),
    solicitante_email: draft.solicitanteEmail.trim(),
    colaborador_matricula: colaborador.matricula,
    colaborador_re: colaborador.re,
    colaborador_nome: colaborador.nome,
    colaborador_cargo: colaborador.cargo,
    posto_atual: colaborador.posto,
    posto_destino: destino?.posto ?? '',
    data_efetiva: draft.dataEfetiva,
    data_fim: draft.dataFim || undefined,
    motivo_categoria: draft.motivoCategoria,
    motivo_observacao: draft.motivoObservacao.trim(),
    beneficios_json: draft.beneficios,
    cobertura_json: {
      ...draft.cobertura,
      substituto: cobertura ? { nome: cobertura.nome, matricula: cobertura.matricula, re: cobertura.re, posto: cobertura.posto, cargo: cobertura.cargo } : null,
    },
    snapshot_json: {
      colaborador: { nome: colaborador.nome, matricula: colaborador.matricula, re: colaborador.re, posto: colaborador.posto, cargo: colaborador.cargo, escala: colaborador.escala, turno: colaborador.turno, turma: colaborador.turma, telefone: colaborador.telefone, empresa: colaborador.empresa },
      unidade_atual: colaborador.unidade ? { posto: colaborador.unidade.posto, cliente: colaborador.unidade.cliente, empresa: colaborador.unidade.empresa, endereco: colaborador.unidade.endereco } : null,
      unidade_destino: destino ? { posto: destino.posto, cliente: destino.cliente, empresa: destino.empresa, endereco: destino.endereco } : null,
    },
    email_subject: subject,
    email_body: sections.join('\n'),
    whatsapp_text: whatsapp,
  }
}
