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

// Stub Vue auto-imports that Nuxt provides globally
import { computed, ref, reactive, watch, watchEffect, onMounted, onUnmounted, toRef, toRefs, nextTick } from 'vue'

vi.stubGlobal('computed', computed)
vi.stubGlobal('ref', ref)
vi.stubGlobal('reactive', reactive)
vi.stubGlobal('watch', watch)
vi.stubGlobal('watchEffect', watchEffect)
vi.stubGlobal('onMounted', onMounted)
vi.stubGlobal('onUnmounted', onUnmounted)
vi.stubGlobal('toRef', toRef)
vi.stubGlobal('toRefs', toRefs)
vi.stubGlobal('nextTick', nextTick)

// Stub definePageMeta (Nuxt auto-import, no-op in tests)
vi.stubGlobal('definePageMeta', vi.fn())
