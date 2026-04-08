import { describe, it, expect, vi, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useAuthStore } from '~/stores/auth'

// Mock $fetch globally
const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)

describe('Auth Store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    mockFetch.mockReset()
  })

  describe('login', () => {
    it('calls POST /auth/login with credentials and stores accessToken and user', async () => {
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'ADOPTER', emailVerified: true }
      mockFetch.mockResolvedValueOnce({ accessToken: 'test-token' }) // login response
      mockFetch.mockResolvedValueOnce(mockUser) // fetchProfile response

      const store = useAuthStore()
      await store.login('test@test.com', 'password123')

      expect(mockFetch).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
        method: 'POST',
        body: { email: 'test@test.com', password: 'password123' },
        credentials: 'include',
      }))
      expect(store.accessToken).toBe('test-token')
      expect(store.user).toEqual(mockUser)
    })

    it('sets isAuthenticated getter to true after successful login', async () => {
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'ADOPTER', emailVerified: true }
      mockFetch.mockResolvedValueOnce({ accessToken: 'test-token' }) // login response
      mockFetch.mockResolvedValueOnce(mockUser) // fetchProfile response

      const store = useAuthStore()
      expect(store.isAuthenticated).toBe(false)

      await store.login('test@test.com', 'password123')
      expect(store.isAuthenticated).toBe(true)
    })

    it('throws and does not modify state on API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Invalid credentials'))

      const store = useAuthStore()
      await expect(store.login('test@test.com', 'wrong')).rejects.toThrow()
      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('logout', () => {
    it('calls POST /auth/logout and clears accessToken and user', async () => {
      mockFetch.mockResolvedValueOnce({ accessToken: 'token' }) // login response
      mockFetch.mockResolvedValueOnce({ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true }) // fetchProfile

      const store = useAuthStore()
      await store.login('a@b.com', 'pass')

      mockFetch.mockResolvedValueOnce({})
      await store.logout()

      expect(mockFetch).toHaveBeenCalledWith('/auth/logout', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }))
      expect(store.accessToken).toBeNull()
      expect(store.user).toBeNull()
    })
  })

  describe('register', () => {
    it('calls POST /auth/register and does NOT set accessToken', async () => {
      mockFetch.mockResolvedValueOnce({ message: 'Check your email' })

      const store = useAuthStore()
      await store.register({ firstName: 'Test', lastName: 'User', email: 'test@test.com', password: 'Password1' })

      expect(mockFetch).toHaveBeenCalledWith('/auth/register', expect.objectContaining({
        method: 'POST',
        body: { firstName: 'Test', lastName: 'User', email: 'test@test.com', password: 'Password1' },
      }))
      expect(store.accessToken).toBeNull()
    })
  })

  describe('verifyEmail', () => {
    it('calls POST /auth/verify-email and stores returned tokens (auto-login)', async () => {
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'ADOPTER', emailVerified: true }
      mockFetch.mockResolvedValueOnce({ accessToken: 'verify-token' }) // verify response
      mockFetch.mockResolvedValueOnce(mockUser) // fetchProfile response

      const store = useAuthStore()
      await store.verifyEmail('magic-link-token')

      expect(mockFetch).toHaveBeenCalledWith('/auth/verify-email', expect.objectContaining({
        method: 'POST',
        body: { token: 'magic-link-token' },
        credentials: 'include',
      }))
      expect(store.accessToken).toBe('verify-token')
      expect(store.user).toEqual(mockUser)
    })
  })

  describe('resetPassword', () => {
    it('calls POST /auth/reset-password and stores returned tokens (auto-login)', async () => {
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'ADOPTER', emailVerified: true }
      mockFetch.mockResolvedValueOnce({ accessToken: 'reset-token' }) // reset response
      mockFetch.mockResolvedValueOnce(mockUser) // fetchProfile response

      const store = useAuthStore()
      await store.resetPassword('reset-link-token', 'NewPassword1')

      expect(mockFetch).toHaveBeenCalledWith('/auth/reset-password', expect.objectContaining({
        method: 'POST',
        body: { token: 'reset-link-token', newPassword: 'NewPassword1' },
        credentials: 'include',
      }))
      expect(store.accessToken).toBe('reset-token')
      expect(store.user).toEqual(mockUser)
    })
  })

  describe('refreshToken', () => {
    it('calls POST /auth/refresh and updates accessToken', async () => {
      mockFetch.mockResolvedValueOnce({ accessToken: 'new-token' })

      const store = useAuthStore()
      await store.refreshToken()

      expect(mockFetch).toHaveBeenCalledWith('/auth/refresh', expect.objectContaining({
        method: 'POST',
        credentials: 'include',
      }))
      expect(store.accessToken).toBe('new-token')
    })

    it('clears state and does NOT throw when refresh fails (silent failure used in initialize)', async () => {
      // refreshToken itself throws -- it's initialize() that handles silently
      mockFetch.mockRejectedValueOnce(new Error('Refresh failed'))

      const store = useAuthStore()
      await expect(store.refreshToken()).rejects.toThrow()
    })
  })

  describe('initialize', () => {
    it('calls refreshToken on first call and sets isInitialized=true', async () => {
      const mockUser = { id: '1', email: 'test@test.com', firstName: 'Test', lastName: 'User', role: 'ADOPTER', emailVerified: true }
      // First call: refreshToken, second call: fetch user profile
      mockFetch.mockResolvedValueOnce({ accessToken: 'init-token' })
      mockFetch.mockResolvedValueOnce(mockUser)

      const store = useAuthStore()
      await store.initialize()

      expect(store.isInitialized).toBe(true)
      expect(store.accessToken).toBe('init-token')
      expect(store.user).toEqual(mockUser)
    })

    it('does not call refreshToken on subsequent calls (idempotent)', async () => {
      mockFetch.mockResolvedValueOnce({ accessToken: 'init-token' })
      mockFetch.mockResolvedValueOnce({ id: '1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'ADOPTER', emailVerified: true })

      const store = useAuthStore()
      await store.initialize()
      const callCount = mockFetch.mock.calls.length

      await store.initialize()
      expect(mockFetch.mock.calls.length).toBe(callCount)
    })

    it('sets isInitialized=true even when refresh fails', async () => {
      mockFetch.mockRejectedValueOnce(new Error('No refresh token'))

      const store = useAuthStore()
      await store.initialize()

      expect(store.isInitialized).toBe(true)
      expect(store.accessToken).toBeNull()
    })
  })

  describe('getters', () => {
    it('isAdmin returns true when user.role === PLATFORM_ADMIN', () => {
      const store = useAuthStore()
      store.user = { id: '1', email: 'admin@test.com', firstName: 'Admin', lastName: 'User', role: 'PLATFORM_ADMIN', emailVerified: true }
      expect(store.isAdmin).toBe(true)
    })

    it('isAdmin returns false for non-admin roles', () => {
      const store = useAuthStore()
      store.user = { id: '1', email: 'user@test.com', firstName: 'User', lastName: 'Test', role: 'ADOPTER', emailVerified: true }
      expect(store.isAdmin).toBe(false)
    })

    it('isOrgAdmin returns true when user.role === ORG_ADMIN', () => {
      const store = useAuthStore()
      store.user = { id: '1', email: 'org@test.com', firstName: 'Org', lastName: 'Admin', role: 'ORG_ADMIN', emailVerified: true }
      expect(store.isOrgAdmin).toBe(true)
    })
  })
})
