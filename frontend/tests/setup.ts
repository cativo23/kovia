import { vi } from 'vitest'

// Mock Nuxt auto-imports that are used in stores/composables
vi.stubGlobal('useRuntimeConfig', () => ({
  public: {
    apiUrl: 'http://localhost:3000',
  },
}))

vi.stubGlobal('navigateTo', vi.fn())

vi.stubGlobal('useNuxtApp', () => ({
  $api: vi.fn(),
}))

vi.stubGlobal('$fetch', vi.fn())

vi.stubGlobal('defineNuxtRouteMiddleware', (fn: any) => fn)

// Mock useI18n
vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
}))

// Mock useToast
vi.stubGlobal('useToast', () => ({
  add: vi.fn(),
}))

// Mock useRoute
vi.stubGlobal('useRoute', () => ({
  query: {},
  path: '/',
}))

// Mock computed/ref/onMounted from vue (auto-imported in Nuxt)
// These are already available from vue imports in tests
