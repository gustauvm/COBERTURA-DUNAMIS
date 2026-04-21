import { create } from 'zustand'
import { type GroupKey } from '../entities/operational/types'

export type SearchStatusFilter = 'todos' | 'plantao' | 'folga' | 'indefinido'
export type SearchSort = 'relevance' | 'nome' | 'posto' | 'escala' | 'status'
export type SearchGroup = 'none' | 'posto' | 'status' | 'escala'

type AppState = {
  group: GroupKey
  search: string
  status: SearchStatusFilter
  cargo: string
  escala: string
  turno: string
  turma: string
  sort: SearchSort
  groupBy: SearchGroup
  selectedKey: string
  setGroup: (group: GroupKey) => void
  setSearch: (value: string) => void
  setStatus: (value: SearchStatusFilter) => void
  setCargo: (value: string) => void
  setEscala: (value: string) => void
  setTurno: (value: string) => void
  setTurma: (value: string) => void
  setSort: (value: SearchSort) => void
  setGroupBy: (value: SearchGroup) => void
  setSelectedKey: (value: string) => void
  resetFilters: () => void
}

export const useAppStore = create<AppState>((set) => ({
  group: 'todos',
  search: '',
  status: 'todos',
  cargo: 'todos',
  escala: 'todos',
  turno: 'todos',
  turma: 'todos',
  sort: 'relevance',
  groupBy: 'none',
  selectedKey: '',
  setGroup: (group) => set({ group }),
  setSearch: (search) => set({ search }),
  setStatus: (status) => set({ status }),
  setCargo: (cargo) => set({ cargo }),
  setEscala: (escala) => set({ escala }),
  setTurno: (turno) => set({ turno }),
  setTurma: (turma) => set({ turma }),
  setSort: (sort) => set({ sort }),
  setGroupBy: (groupBy) => set({ groupBy }),
  setSelectedKey: (selectedKey) => set({ selectedKey }),
  resetFilters: () => set({ status: 'todos', cargo: 'todos', escala: 'todos', turno: 'todos', turma: 'todos', sort: 'relevance', groupBy: 'none' }),
}))
