import { supabase } from '../../shared/lib/supabase'
import { rawRowSchema, normalizeColaborador, normalizeUnidade, type Colaborador, type RawRow, type Unidade } from './types'

async function fetchAllRows(table: string): Promise<RawRow[]> {
  const pageSize = 1000
  const rows: RawRow[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase.from(table).select('*').range(from, from + pageSize - 1)
    if (error) throw error
    const parsed = (data ?? []).map((row) => rawRowSchema.parse(row))
    rows.push(...parsed)
    if (parsed.length < pageSize) break
  }
  return rows
}

export async function fetchColaboradores(): Promise<Colaborador[]> {
  const rows = await fetchAllRows('colaboradores')
  return rows.map(normalizeColaborador).filter((row) => row.nome || row.matricula || row.re)
}

export async function fetchUnidades(): Promise<Unidade[]> {
  const rows = await fetchAllRows('unidades')
  return rows.map(normalizeUnidade).filter((row) => row.posto || row.cliente)
}
