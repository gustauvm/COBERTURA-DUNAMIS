import { useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../shared/lib/supabase'
import { fetchColaboradores, fetchUnidades } from './api'
import { type ColaboradorComUnidade, unitKey } from './types'

export function useColaboradores() {
  return useQuery({ queryKey: ['colaboradores'], queryFn: fetchColaboradores, staleTime: 60_000 })
}

export function useUnidades() {
  return useQuery({ queryKey: ['unidades'], queryFn: fetchUnidades, staleTime: 60_000 })
}

export function useOperationalData() {
  const colaboradores = useColaboradores()
  const unidades = useUnidades()
  const colaboradoresData = colaboradores.data ?? []
  const unidadesData = unidades.data ?? []
  const unidadeByPosto = new Map<string, (typeof unidadesData)[number]>()

  for (const unidade of unidadesData) {
    const key = unitKey(unidade.posto)
    if (key && !unidadeByPosto.has(key)) unidadeByPosto.set(key, unidade)
  }

  const colaboradoresComUnidade: ColaboradorComUnidade[] = colaboradoresData.map((colaborador) => ({
    ...colaborador,
    unidade: unidadeByPosto.get(unitKey(colaborador.posto)),
  }))

  return {
    colaboradores: colaboradoresData,
    unidades: unidadesData,
    colaboradoresComUnidade,
    unidadeByPosto,
    isLoading: colaboradores.isLoading || unidades.isLoading,
    isError: colaboradores.isError || unidades.isError,
    error: colaboradores.error || unidades.error,
  }
}

export function useOperationalRealtime() {
  const queryClient = useQueryClient()
  useEffect(() => {
    const channel = supabase
      .channel('v5-operational-data')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'colaboradores' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['colaboradores'] })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'unidades' }, () => {
        void queryClient.invalidateQueries({ queryKey: ['unidades'] })
      })
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [queryClient])
}
