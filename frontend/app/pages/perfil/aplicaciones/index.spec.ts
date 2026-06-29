/**
 * Mis Aplicaciones page tests — Phase 16 (converted from Wave 0 stubs)
 *
 * Requirement lock: APPLY-07 + APPLY-06
 *   - APPLY-07: Mis Aplicaciones table view per adopter. Each row shows a
 *     coAplicanteConfirmed badge: ámbar (pending) or verde (confirmed).
 *   - APPLY-06: Co-aplicante confirmation banner appears on Mis Aplicaciones
 *     when any active application has coAplicanteConfirmed=false.
 *
 * Pattern: mount() from @vue/test-utils; vi.stubGlobal for Nuxt auto-imports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent } from 'vue'

// ─── Mock auto-imported composables BEFORE component import ──────────────────

const mockGet = vi.fn()

vi.stubGlobal('useApi', () => ({
  get: mockGet,
  post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(),
}))
vi.stubGlobal('useI18n', () => ({
  t: (key: string) => key,
}))
vi.stubGlobal('useRoute', () => ({ query: {} }))
vi.stubGlobal('useRouter', () => ({ replace: vi.fn() }))
vi.stubGlobal('definePageMeta', vi.fn())

// ─── Import page under test ──────────────────────────────────────────────────

import MisAplicacionesPage from './index.vue'

// ─── Component stubs ─────────────────────────────────────────────────────────

const PanelApplicationRowStub = defineComponent({
  name: 'PanelApplicationRow',
  props: { app: { type: Object, required: true } },
  template: `<div data-testid="PanelApplicationRow" :data-app-id="app.id" />`,
})

const globalStubs = {
  PanelApplicationRow: PanelApplicationRowStub,
  KIcon: { props: ['name', 'size'], template: '<span :data-icon="name" />' },
  UCard: { template: '<div><slot /></div>' },
  UAlert: {
    props: ['color', 'title', 'description'],
    template: '<div :data-testid="\'UAlert\'" :data-color="color" :data-title="title"><slot /></div>',
  },
  UButton: {
    props: ['label', 'to'],
    template: '<button :data-label="label"><slot /></button>',
  },
  UBadge: {
    props: ['color', 'variant'],
    template: '<span :data-testid="\'UBadge\'" :data-color="color"><slot /></span>',
  },
  UTabs: {
    props: ['modelValue', 'items', 'defaultValue'],
    template: `
      <div>
        <slot name="activas" />
        <slot name="historico" />
      </div>
    `,
  },
  UAvatar: { props: ['src', 'alt', 'size'], template: '<img :src="src" :alt="alt" />' },
}

const globalMocks = {
  $t: (key: string) => key,
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const ACTIVE_STATUS = 'ENVIADA'
const HISTORIC_STATUS = 'ADOPTADA'

function makeApp(overrides: Record<string, unknown> = {}) {
  return {
    id: 'app-1',
    status: ACTIVE_STATUS,
    submittedAt: '2026-01-01T00:00:00Z',
    coAplicanteConfirmed: false,
    coAplicanteEmail: 'co@example.com',
    animal: { id: 'a1', name: 'Luna', coverPhoto: null, organization: null },
    ...overrides,
  }
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function mountWithApps(apps: unknown[]) {
  mockGet.mockResolvedValueOnce(apps)
  const wrapper = mount(MisAplicacionesPage, {
    global: { stubs: globalStubs, mocks: globalMocks },
  })
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Mis Aplicaciones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useApi', () => ({
      get: mockGet,
      post: vi.fn(), put: vi.fn(), patch: vi.fn(), del: vi.fn(),
    }))
    vi.stubGlobal('useI18n', () => ({ t: (key: string) => key }))
    vi.stubGlobal('useRoute', () => ({ query: {} }))
    vi.stubGlobal('useRouter', () => ({ replace: vi.fn() }))
    vi.stubGlobal('definePageMeta', vi.fn())
  })

  it('[APPLY-07] renders "Hogar confirmado" badge when coAplicanteConfirmed=true', async () => {
    const apps = [makeApp({ coAplicanteConfirmed: true, coAplicanteEmail: 'co@example.com' })]
    const wrapper = await mountWithApps(apps)

    const badges = wrapper.findAll('[data-testid="UBadge"]')
    const confirmedBadge = badges.find(b => b.attributes('data-color') === 'success')
    expect(confirmedBadge).toBeDefined()
    // Badge text matches i18n key
    expect(confirmedBadge?.text()).toBe('applications.coapplicant.confirmed')
  })

  it('[APPLY-07] renders "Esperando confirmación del hogar" badge when coAplicanteConfirmed=false AND coAplicanteEmail is set', async () => {
    const apps = [makeApp({ coAplicanteConfirmed: false, coAplicanteEmail: 'co@example.com' })]
    const wrapper = await mountWithApps(apps)

    const badges = wrapper.findAll('[data-testid="UBadge"]')
    const pendingBadge = badges.find(b => b.attributes('data-color') === 'warning')
    expect(pendingBadge).toBeDefined()
    expect(pendingBadge?.text()).toBe('applications.coapplicant.pending')
  })

  it('[APPLY-07] renders no co-aplicante badge for pre-migration applications without coAplicante fields', async () => {
    // Historical row: coAplicanteEmail = null (pre-migration, no co-aplicante data)
    const apps = [makeApp({ coAplicanteEmail: null, coAplicanteConfirmed: false })]
    const wrapper = await mountWithApps(apps)

    const badges = wrapper.findAll('[data-testid="UBadge"]')
    // No badge should be rendered for this row
    const coApBadge = badges.find(b =>
      b.text() === 'applications.coapplicant.confirmed' ||
      b.text() === 'applications.coapplicant.pending'
    )
    expect(coApBadge).toBeUndefined()
  })

  it('[APPLY-06] renders top-of-page banner when at least one active application has coAplicanteConfirmed=false', async () => {
    const apps = [
      makeApp({ id: 'app-1', coAplicanteConfirmed: false, coAplicanteEmail: 'co1@example.com' }),
      makeApp({ id: 'app-2', coAplicanteConfirmed: true, coAplicanteEmail: 'co2@example.com' }),
    ]
    const wrapper = await mountWithApps(apps)

    const alert = wrapper.find('[data-testid="UAlert"]')
    expect(alert.exists()).toBe(true)
    expect(alert.attributes('data-color')).toBe('warning')
    expect(alert.attributes('data-title')).toBe('applications.coapplicant.bannerTitle')
  })
})
