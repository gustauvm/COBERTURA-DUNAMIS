import { supabase } from '../../shared/lib/supabase'
import { type Formalizacao, type FormalizerStatus, type StatusEvent } from './types'

export async function fetchFormalizacoes(): Promise<Formalizacao[]> {
  const { data, error } = await supabase
    .from('formalizacoes_postos')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)
  if (error) throw error
  return (data ?? []) as Formalizacao[]
}

export async function fetchFormalizacaoEvents(): Promise<StatusEvent[]> {
  const { data, error } = await supabase
    .from('formalizacoes_status_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) throw error
  return (data ?? []) as StatusEvent[]
}

export async function insertFormalizacao(payload: Partial<Formalizacao>): Promise<Formalizacao> {
  const { data, error } = await supabase.from('formalizacoes_postos').insert(payload).select('*').single()
  if (error) throw error
  return data as Formalizacao
}

export async function insertStatusEvent(payload: Partial<StatusEvent>) {
  const { error } = await supabase.from('formalizacoes_status_events').insert(payload)
  if (error) throw error
}

export async function updateFormalizacaoStatus(id: string, status: FormalizerStatus, currentStatus?: FormalizerStatus) {
  const { data, error } = await supabase.from('formalizacoes_postos').update({ status }).eq('id', id).select('*').single()
  if (error) throw error
  await insertStatusEvent({
    formalizacao_id: id,
    status_anterior: currentStatus,
    status_novo: status,
    ator_nome: 'Acompanhamento público',
    observacao: 'Status atualizado pela interface V5.',
  })
  return data as Formalizacao
}
