import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@portal/types'
import { API_BASE } from '@/lib/api'

interface AuthStore {
  user: User | null
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      setUser: (user) => set({ user }),
      logout: async () => {
        await fetch(API_BASE + '/api/auth/logout', { method: 'POST', credentials: 'include' })
        set({ user: null })
      },
    }),
    { name: 'auth-store' }
  )
)
