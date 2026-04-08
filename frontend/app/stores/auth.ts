import { defineStore } from 'pinia'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: 'ADOPTER' | 'ORG_ADMIN' | 'PLATFORM_ADMIN'
  emailVerified: boolean
  organizationId?: string | null
}

interface AuthState {
  user: User | null
  accessToken: string | null
  isInitialized: boolean
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    user: null,
    accessToken: null,
    isInitialized: false,
  }),

  getters: {
    isAuthenticated: (state): boolean => !!state.accessToken && !!state.user,
    isAdmin: (state): boolean => state.user?.role === 'PLATFORM_ADMIN',
    isOrgAdmin: (state): boolean => state.user?.role === 'ORG_ADMIN',
    userRole: (state): string | null => state.user?.role ?? null,
  },

  actions: {
    async register(dto: { firstName: string, lastName: string, email: string, password: string }) {
      const config = useRuntimeConfig()
      await $fetch('/auth/register', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: dto,
      })
      // Do NOT auto-login: user must verify email first
    },

    async login(email: string, password: string) {
      const config = useRuntimeConfig()
      const response = await $fetch<{ accessToken: string, user: User }>('/auth/login', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { email, password },
        credentials: 'include', // Sends/receives httpOnly refresh cookie
      })
      this.accessToken = response.accessToken
      this.user = response.user
    },

    loginWithGoogle() {
      const config = useRuntimeConfig()
      window.location.href = `${config.public.apiUrl}/auth/google`
    },

    async handleOAuthCallback(token: string) {
      this.accessToken = token
      const config = useRuntimeConfig()
      const user = await $fetch<User>('/auth/me', {
        baseURL: config.public.apiUrl as string,
        headers: { Authorization: `Bearer ${token}` },
      })
      this.user = user
    },

    async verifyEmail(token: string) {
      const config = useRuntimeConfig()
      const response = await $fetch<{ accessToken: string, user: User }>('/auth/verify-email', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { token },
        credentials: 'include',
      })
      this.accessToken = response.accessToken
      this.user = response.user
    },

    async forgotPassword(email: string) {
      const config = useRuntimeConfig()
      await $fetch('/auth/forgot-password', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { email },
      })
    },

    async resetPassword(token: string, password: string) {
      const config = useRuntimeConfig()
      const response = await $fetch<{ accessToken: string, user: User }>('/auth/reset-password', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { token, password },
        credentials: 'include',
      })
      this.accessToken = response.accessToken
      this.user = response.user
    },

    async refreshToken() {
      const config = useRuntimeConfig()
      const response = await $fetch<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        credentials: 'include', // Send httpOnly refresh cookie
      })
      this.accessToken = response.accessToken
    },

    async logout() {
      const config = useRuntimeConfig()
      try {
        await $fetch('/auth/logout', {
          method: 'POST',
          baseURL: config.public.apiUrl as string,
          credentials: 'include',
        })
      }
      catch {
        // Ignore logout errors -- clear state regardless
      }
      this.$reset()
      await navigateTo('/login')
    },

    async initialize() {
      if (this.isInitialized) return
      try {
        await this.refreshToken()
        // Fetch user profile after successful refresh
        const config = useRuntimeConfig()
        const user = await $fetch<User>('/auth/me', {
          baseURL: config.public.apiUrl as string,
          headers: { Authorization: `Bearer ${this.accessToken}` },
        })
        this.user = user
      }
      catch {
        // Silent failure: no valid refresh token, user stays logged out
        this.accessToken = null
        this.user = null
      }
      finally {
        this.isInitialized = true
      }
    },
  },
})
