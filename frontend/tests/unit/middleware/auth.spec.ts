import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

// Mock navigateTo
const mockNavigateTo = vi.fn()
vi.stubGlobal('navigateTo', mockNavigateTo)

// Mock $fetch for auth store
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

// Import middleware (defineNuxtRouteMiddleware is mocked to passthrough)
import authMiddleware from '~/middleware/auth'
import guestMiddleware from '~/middleware/guest'
import adminMiddleware from '~/middleware/admin'

describe('Auth Middleware', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockNavigateTo.mockReset()
    mockFetch.mockReset()
  })

  describe('auth middleware', () => {
    it('allows authenticated user (no redirect)', async () => {
      const store = useAuthStore()
      store.accessToken = 'test-token'
      store.user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true }
      store.isInitialized = true

      const result = await authMiddleware({} as any, {} as any)
      expect(result).toBeUndefined()
    })

    it('unauthenticated + uninitialized: calls initialize(), then allows if authenticated', async () => {
      const store = useAuthStore()
      // Simulate successful initialize
      mockFetch.mockResolvedValueOnce({ accessToken: 'refreshed-token' })
      mockFetch.mockResolvedValueOnce({ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true })

      await authMiddleware({} as any, {} as any)

      // After initialize, store should be authenticated
      expect(store.isInitialized).toBe(true)
      expect(store.isAuthenticated).toBe(true)
    })

    it('unauthenticated after initialize: redirects to /login', async () => {
      const store = useAuthStore()
      // Simulate failed initialize
      mockFetch.mockRejectedValueOnce(new Error('No refresh token'))

      mockNavigateTo.mockReturnValueOnce('/login')
      await authMiddleware({} as any, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith('/login')
    })
  })

  describe('guest middleware', () => {
    it('authenticated user redirected to /', async () => {
      const store = useAuthStore()
      store.accessToken = 'test-token'
      store.user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true }
      store.isInitialized = true

      mockNavigateTo.mockReturnValueOnce('/')
      await guestMiddleware({} as any, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith('/')
    })

    it('unauthenticated user allowed through', async () => {
      const store = useAuthStore()
      store.isInitialized = true
      // No accessToken or user

      const result = await guestMiddleware({} as any, {} as any)
      // Should not redirect
      expect(mockNavigateTo).not.toHaveBeenCalledWith('/')
    })

    it('uninitialized: calls initialize before checking auth', async () => {
      const store = useAuthStore()
      // Not initialized, no tokens -- initialize will fail silently
      mockFetch.mockRejectedValueOnce(new Error('No refresh token'))

      await guestMiddleware({} as any, {} as any)

      expect(store.isInitialized).toBe(true)
      // Should not redirect since user is not authenticated
      expect(mockNavigateTo).not.toHaveBeenCalledWith('/')
    })
  })

  describe('admin middleware', () => {
    it('non-admin user redirected to /', async () => {
      const store = useAuthStore()
      store.accessToken = 'test-token'
      store.user = { id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true }
      store.isInitialized = true

      mockNavigateTo.mockReturnValueOnce('/')
      await adminMiddleware({} as any, {} as any)

      expect(mockNavigateTo).toHaveBeenCalledWith('/')
    })

    it('PLATFORM_ADMIN user allowed through', async () => {
      const store = useAuthStore()
      store.accessToken = 'test-token'
      store.user = { id: '1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User', role: 'PLATFORM_ADMIN', emailVerified: true }
      store.isInitialized = true

      const result = await adminMiddleware({} as any, {} as any)
      // Should not redirect to / or /login
      expect(result).toBeUndefined()
    })

    it('unauthenticated + uninitialized: calls initialize and redirects to /login on failure', async () => {
      const store = useAuthStore()
      // Simulate failed initialize
      mockFetch.mockRejectedValueOnce(new Error('No refresh token'))

      mockNavigateTo.mockReturnValueOnce('/login')
      await adminMiddleware({} as any, {} as any)

      expect(store.isInitialized).toBe(true)
      expect(mockNavigateTo).toHaveBeenCalledWith('/login')
    })
  })
})
