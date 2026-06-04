import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { IdeaListItem } from '@portal/types'

interface UIStore {
  detailIdea: IdeaListItem | null
  notifOpen: boolean
  accent: string
  radius: number
  theme: 'light' | 'dark'
  setDetailIdea: (idea: IdeaListItem | null) => void
  setNotifOpen: (v: boolean) => void
  setAccent: (v: string) => void
  setRadius: (v: number) => void
  setTheme: (theme: 'light' | 'dark') => void
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      detailIdea: null,
      notifOpen: false,
      accent: '#2F62E6',
      radius: 14,
      theme: 'light' as 'light' | 'dark',
      setDetailIdea: (detailIdea) => set({ detailIdea }),
      setNotifOpen: (notifOpen) => set({ notifOpen }),
      setAccent: (accent) => set({ accent }),
      setRadius: (radius) => set({ radius }),
      setTheme: (theme) => set({ theme }),
    }),
    { name: 'ui-store', partialize: (s) => ({ accent: s.accent, radius: s.radius, theme: s.theme }) }
  )
)
