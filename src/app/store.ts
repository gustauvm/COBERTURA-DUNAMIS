import { create } from 'zustand'
import { type GroupKey } from '../entities/operational/types'

export type AppSection = 'home' | 'busca' | 'unidades' | 'formalizador'

type AppState = {
  section: AppSection
  group: GroupKey
  globalSearch: string
  setSection: (section: AppSection) => void
  setGroup: (group: GroupKey) => void
  setGlobalSearch: (value: string) => void
}

export const useAppStore = create<AppState>((set) => ({
  section: 'home',
  group: 'todos',
  globalSearch: '',
  setSection: (section) => set({ section }),
  setGroup: (group) => set({ group }),
  setGlobalSearch: (globalSearch) => set({ globalSearch }),
}))
