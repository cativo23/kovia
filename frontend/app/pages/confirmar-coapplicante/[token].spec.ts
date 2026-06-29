/**
 * Co-aplicante confirmation page tests — Phase 16 (converted from Wave 0 stubs)
 *
 * Requirement lock: APPLY-06
 *   - Public confirmation page /confirmar-coapplicante/{token} — no login required.
 *   - 4-state machine: loading → expired | invalid | valid → confirmed.
 *   - layout: false (no app shell)
 *
 * Pattern: mount() from @vue/test-utils; vi.stubGlobal for Nuxt auto-imports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'

// ─── Mock Nuxt auto-imports BEFORE component import ──────────────────────────

const mockFetch = vi.fn()
vi.stubGlobal('$fetch', mockFetch)
vi.stubGlobal('useRoute', () => ({ params: { token: 'test-token-uuid' }, query: {} }))
vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl: 'http://localhost:3000/api/v1' } }))
vi.stubGlobal('definePageMeta', vi.fn())
vi.stubGlobal('useI18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))

// ─── Import page under test ──────────────────────────────────────────────────

import ConfirmarPage from './[token].vue'

// ─── Component stubs ─────────────────────────────────────────────────────────

const globalStubs = {
  KIcon: {
    props: ['name', 'size'],
    template: '<span :data-icon="name" :data-size="size" />',
  },
  UButton: {
    props: ['label', 'loading', 'color', 'size'],
    emits: ['click'],
    template: '<button :data-label="label" :data-loading="String(loading)" @click="$emit(\'click\')"><slot /></button>',
  },
}

const globalMocks = {
  $t: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function mountPage() {
  const wrapper = mount(ConfirmarPage, {
    global: { stubs: globalStubs, mocks: globalMocks },
  })
  return wrapper
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Co-aplicante confirmation page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('$fetch', mockFetch)
    vi.stubGlobal('useRoute', () => ({ params: { token: 'test-token-uuid' }, query: {} }))
    vi.stubGlobal('useRuntimeConfig', () => ({ public: { apiUrl: 'http://localhost:3000/api/v1' } }))
    vi.stubGlobal('definePageMeta', vi.fn())
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (params) return `${key}:${JSON.stringify(params)}`
        return key
      },
    }))
  })

  it('[APPLY-06] shows loading state on initial mount while the token is being validated', async () => {
    // Return a promise that never resolves (simulates in-flight request)
    mockFetch.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()

    // While loading, the loader icon should be visible and content hidden
    const html = wrapper.html()
    expect(html).toContain('loader-2')
    // Confirmed / expired / valid states should not be visible yet
    expect(html).not.toContain('coapplicant.confirm.heading')
    expect(html).not.toContain('coapplicant.confirm.successHeading')
  })

  it('[APPLY-06] expired token shows the expired state with heading + body and no CTA', async () => {
    mockFetch.mockRejectedValueOnce({
      data: { message: 'El enlace ha expirado' },
    })

    const wrapper = await mountPage()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const html = wrapper.html()
    expect(html).toContain('coapplicant.confirm.expiredHeading')
    expect(html).toContain('coapplicant.confirm.expiredBody')
    // No CTA button in expired state
    expect(html).not.toContain('coapplicant.confirm.cta')
  })

  it('[APPLY-06] invalid token shows the invalid error state with no CTA', async () => {
    mockFetch.mockRejectedValueOnce({
      data: { message: 'Token inválido' },
    })

    const wrapper = await mountPage()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const html = wrapper.html()
    // Both expired and invalid render the same "expired" UI (per D-12)
    expect(html).toContain('coapplicant.confirm.expiredHeading')
    // No CTA button
    expect(html).not.toContain('coapplicant.confirm.cta')
  })

  it('[APPLY-06] valid token shows the animal name + adopter first name + CTA button', async () => {
    mockFetch.mockResolvedValueOnce({
      animalName: 'Luna',
      adopterFirstName: 'Carlos',
    })

    const wrapper = await mountPage()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    const html = wrapper.html()
    expect(html).toContain('coapplicant.confirm.heading')
    // Body copy with interpolated values
    expect(html).toContain('coapplicant.confirm.body')
    // CTA button present
    expect(html).toContain('coapplicant.confirm.cta')
    // No expired state
    expect(html).not.toContain('coapplicant.confirm.expiredHeading')
  })

  it('[APPLY-06] clicking the CTA fires a POST and shows a success state on response', async () => {
    // First call: GET (loadContext)
    mockFetch.mockResolvedValueOnce({ animalName: 'Luna', adopterFirstName: 'Carlos' })
    // Second call: POST (confirm)
    mockFetch.mockResolvedValueOnce({ confirmed: true })

    const wrapper = await mountPage()
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // Click the CTA button
    const ctaBtn = wrapper.find(`[data-label="coapplicant.confirm.cta"]`)
    expect(ctaBtn.exists()).toBe(true)
    await ctaBtn.trigger('click')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // POST should have been called
    expect(mockFetch).toHaveBeenCalledTimes(2)
    expect(mockFetch.mock.calls[1]).toEqual([
      '/co-aplicante/confirmar/test-token-uuid',
      expect.objectContaining({ method: 'POST' }),
    ])

    // Success state should be shown
    const html = wrapper.html()
    expect(html).toContain('coapplicant.confirm.successHeading')
    expect(html).toContain('coapplicant.confirm.successBody')
    // Valid state and CTA gone
    expect(html).not.toContain('coapplicant.confirm.cta')
  })
})
