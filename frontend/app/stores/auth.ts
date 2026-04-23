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
      const response = await $fetch<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { email, password },
        credentials: 'include', // Sends/receives httpOnly refresh cookie
      })
      this.accessToken = response.accessToken
      await this.fetchProfile()
    },

    loginWithGoogle() {
      const config = useRuntimeConfig()
      const router = useRouter()
      const currentPath = router.currentRoute.value.fullPath
      if (currentPath !== '/login' && currentPath !== '/register') {
        sessionStorage.setItem('kovia:oauth_redirect', currentPath)
      }
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
      const response = await $fetch<{ accessToken: string }>('/auth/verify-email', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { token },
        credentials: 'include',
      })
      this.accessToken = response.accessToken
      await this.fetchProfile()
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
      const response = await $fetch<{ accessToken: string }>('/auth/reset-password', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        body: { token, newPassword: password },
        credentials: 'include',
      })
      this.accessToken = response.accessToken
      await this.fetchProfile()
    },

    async refreshToken() {
      const config = useRuntimeConfig()
      const event = import.meta.server ? useRequestEvent() : null
      await this._refreshToken(config, event)
    },

    async logout() {
      const config = useRuntimeConfig()
      try {
        await $fetch('/auth/logout', {
          method: 'POST',
          baseURL: config.public.apiUrl as string,
          credentials: 'include',
          headers: { Authorization: `Bearer ${this.accessToken}` },
        })
      }
      catch {
        // Ignore logout errors -- clear state regardless
      }
      this.$reset()
      await navigateTo('/login')
    },

    async fetchProfile() {
      const config = useRuntimeConfig()
      await this._fetchProfile(config)
    },

    async initialize() {
      if (this.isInitialized) return
      // Capture composables before any await (required for SSR context)
      const config = useRuntimeConfig()
      const event = import.meta.server ? useRequestEvent() : null
      try {
        await this._refreshToken(config, event)
        await this._fetchProfile(config)
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

    async _refreshToken(config: ReturnType<typeof useRuntimeConfig>, event: any) {
      const headers: Record<string, string> = {}
      if (import.meta.server && event) {
        const cookie = event.node.req.headers.cookie
        if (cookie) headers.cookie = cookie
      }
      const response = await $fetch<{ accessToken: string }>('/auth/refresh', {
        method: 'POST',
        baseURL: config.public.apiUrl as string,
        credentials: 'include',
        headers,
      })
      this.accessToken = response.accessToken
    },

    async _fetchProfile(config: ReturnType<typeof useRuntimeConfig>) {
      const user = await $fetch<User>('/auth/me', {
        baseURL: config.public.apiUrl as string,
        headers: { Authorization: `Bearer ${this.accessToken}` },
      })
      this.user = user
    },
  },
})
