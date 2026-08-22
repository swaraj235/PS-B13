import { create } from 'zustand'
import type { User } from '../types'
import { api } from '../lib/api'

interface AuthStore {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  setAuth: (user: User, token: string) => void
  updateProfile: (data: Partial<User>) => Promise<User>
  logout: () => void
  initAuth: () => Promise<void>
}

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  token: localStorage.getItem('gridsentinel_token'),
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user: User, token: string) => {
    localStorage.setItem('gridsentinel_token', token)
    localStorage.setItem('gridsentinel_user', JSON.stringify(user))
    set({ user, token, isAuthenticated: true, isLoading: false })
  },

  updateProfile: async (data: Partial<User>) => {
    const updatedUser = await api.updateProfile(data)
    localStorage.setItem('gridsentinel_user', JSON.stringify(updatedUser))
    set({ user: updatedUser })
    return updatedUser
  },

  logout: () => {
    localStorage.removeItem('gridsentinel_token')
    localStorage.removeItem('gridsentinel_user')
    set({ user: null, token: null, isAuthenticated: false, isLoading: false })
  },

  initAuth: async () => {
    const token = localStorage.getItem('gridsentinel_token')
    const storedUserStr = localStorage.getItem('gridsentinel_user')

    if (!token) {
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
      return
    }

    try {
      if (storedUserStr) {
        const storedUser = JSON.parse(storedUserStr)
        set({ user: storedUser, token, isAuthenticated: true, isLoading: false })
      }
      // Reverify with backend
      const user = await api.getMe()
      localStorage.setItem('gridsentinel_user', JSON.stringify(user))
      set({ user, token, isAuthenticated: true, isLoading: false })
    } catch {
      localStorage.removeItem('gridsentinel_token')
      localStorage.removeItem('gridsentinel_user')
      set({ user: null, token: null, isAuthenticated: false, isLoading: false })
    }
  },
}))

