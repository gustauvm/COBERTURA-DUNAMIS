import { useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { fetchFormalizacaoEvents, fetchFormalizacoes, insertFormalizacao, insertStatusEvent, updateFormalizacaoStatus } from './api'

export function useFormalizacoes() {
  return useQuery({ queryKey: ['formalizacoes'], queryFn: fetchFormalizacoes, staleTime: 30_000 })
}

export function useFormalizacaoEvents() {
  return useQuery({ queryKey: ['formalizacoes-events'], queryFn: fetchFormalizacaoEvents, staleTime: 30_000 })
}

export function useCreateFormalizacao() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: insertFormalizacao,
    onSuccess: async (record) => {
      await insertStatusEvent({
        formalizacao_id: record.id,
        status_novo: record.status,
        ator_nome: record.solicitante_nome,
        observacao: 'Caso registrado na V5.',
      })
      await queryClient.invalidateQueries({ queryKey: ['formalizacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['formalizacoes-events'] })
    },
  })
}

export function useUpdateFormalizacaoStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, currentStatus }: { id: string; status: Parameters<typeof updateFormalizacaoStatus>[1]; currentStatus?: Parameters<typeof updateFormalizacaoStatus>[2] }) =>
      updateFormalizacaoStatus(id, status, currentStatus),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['formalizacoes'] })
      await queryClient.invalidateQueries({ queryKey: ['formalizacoes-events'] })
    },
  })
}

export function useFormalizadorRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('v5-formalizador')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'formalizacoes_postos' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['formalizacoes'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'formalizacoes_status_events' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['formalizacoes-events'] })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])
}
