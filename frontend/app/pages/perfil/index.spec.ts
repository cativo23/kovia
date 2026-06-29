/**
 * Mi Perfil page tests — Phase 16 (converted from Wave 0 stubs to real assertions)
 *
 * Requirement lock: PROFILE-02
 *   - Mi Perfil page with independent per-section editing, inline progress bar,
 *     and per-section completion badges.
 *
 * Pattern: mount() from @vue/test-utils; vi.stubGlobal for Nuxt auto-imports
 *          (useApi, useI18n, useToast); component stubs for Nuxt UI v4 and
 *          Phase 14 design-system components.
 *
 * Tests cover the 5 PROFILE-02 contracts:
 *   1. ProfileCompletionBar receives correct completionPct from API
 *   2. 5 ProfileSection cards rendered in D-17 order
 *   3. Clicking Editar in section 1 only puts that section in edit mode (others stay view)
 *   4. Save event triggers PATCH /profile/section/:section and re-fetches GET /profile/me
 *   5. Per-section is-complete badge is true/false based on field nullability rules
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

// ─── Mock auto-imported composables BEFORE component import ──────────────────

const mockGet = vi.fn()
const mockPatch = vi.fn()
const mockToastAdd = vi.fn()

vi.stubGlobal('useApi', () => ({
  get: mockGet,
  patch: mockPatch,
  post: vi.fn(),
  put: vi.fn(),
  del: vi.fn(),
}))

vi.stubGlobal('useToast', () => ({
  add: mockToastAdd,
}))

// ─── Import page under test (after stubs) ─────────────────────────────────────

import MiPerfilPage from './index.vue'

// ─── Component stubs ─────────────────────────────────────────────────────────

const ProfileCompletionBarStub = defineComponent({
  name: 'ProfileCompletionBar',
  props: {
    completionPct: { type: Number, required: true },
    sections: { type: Array, required: true },
  },
  template: `<div data-testid="ProfileCompletionBar" :data-pct="completionPct" :data-sections="JSON.stringify(sections)" />`,
})

const ProfileSectionStub = defineComponent({
  name: 'ProfileSection',
  props: {
    section: { type: Object, required: true },
    isComplete: { type: Boolean, required: true },
    saving: { type: Boolean, default: false },
    errorMessage: { type: String, default: null },
  },
  emits: ['save', 'cancel'],
  setup() {
    const editing = ref(false)
    const exitEditMode = () => { editing.value = false }
    return { editing, exitEditMode }
  },
  template: `
    <div
      :data-testid="'ProfileSection-' + section.key"
      :data-section-key="section.key"
      :data-is-complete="String(isComplete)"
      :data-editing="String(editing)"
    >
      <div v-if="!editing" data-slot="view"><slot name="view" /></div>
      <div v-else data-slot="edit"><slot name="edit" /></div>
      <button
        v-if="!editing"
        :data-testid="'edit-btn-' + section.key"
        @click="editing = true"
      >Editar</button>
      <button
        v-if="editing"
        :data-testid="'save-btn-' + section.key"
        @click="$emit('save')"
      >Guardar cambios</button>
      <button
        v-if="editing"
        :data-testid="'cancel-btn-' + section.key"
        @click="editing = false; $emit('cancel')"
      >Descartar cambios</button>
    </div>
  `,
})

const ProfilePhotoManagerStub = defineComponent({
  name: 'ProfilePhotoManager',
  props: { photos: { type: Array, default: () => [] } },
  emits: ['photo-added', 'photo-removed'],
  template: `<div data-testid="ProfilePhotoManager" :data-photos-count="photos.length" />`,
})

// ─── Global stubs / mocks ────────────────────────────────────────────────────

const globalStubs = {
  ProfileCompletionBar: ProfileCompletionBarStub,
  ProfileSection: ProfileSectionStub,
  ProfilePhotoManager: ProfilePhotoManagerStub,
  KSpringCard: { template: '<div class="k-spring-card"><slot /></div>' },
  KIcon: {
    props: ['name', 'size', 'ariaLabel'],
    template: '<span :data-icon="name" />',
  },
  KMascot: { template: '<div data-testid="KMascot" />' },
  NuxtLayout: { template: '<div><slot /></div>' },
  UCard: { template: '<div><slot /></div>' },
  UAlert: {
    props: ['color', 'title'],
    template: '<div :data-color="color" :data-title="title"><slot /><slot name="actions" /></div>',
  },
  UButton: {
    props: ['label', 'loading', 'disabled'],
    emits: ['click'],
    template: '<button :data-label="label" @click="$emit(\'click\')"><slot /></button>',
  },
  UInput: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  UCheckbox: {
    props: ['modelValue'],
    emits: ['update:modelValue'],
    template: '<input type="checkbox" :checked="modelValue" />',
  },
  UFormField: { template: '<div><slot /></div>' },
}

const globalMocks = {
  $t: (key: string, params?: Record<string, unknown>) => {
    if (params && key === 'profile.completionPct') return `${params.pct}% completo`
    return key
  },
}

// ─── Fixture profiles ─────────────────────────────────────────────────────────

const BASE_PROFILE = {
  id: 'profile-1',
  phone: '+503 7890 1234',
  occupation: 'Ingeniero',
  birthDate: '1990-01-01',
  city: 'San Salvador',
  housingType: 'Casa',
  ownership: 'Propia',
  exteriorSpace: true,
  petPermission: true,
  adults: 2,
  children: 0,
  currentPets: [],
  activityLevel: 'Alto',
  hoursAlone: 4,
  adoptionReason: 'Quiero un compañero',
  speciesExperience: true,
  previousPets: [],
  additionalContext: null,
  photos: [{ id: 'p1', url: 'http://example.com/photo.jpg', key: 'profiles/photo.jpg', position: 0 }],
  completionPct: 100,
}

// Profile where only datos-basicos is complete (phone+occupation+birthDate filled)
const PARTIAL_PROFILE = {
  ...BASE_PROFILE,
  housingType: null,       // hogar incomplete
  ownership: null,
  adults: null,
  activityLevel: null,     // estilo-de-vida incomplete
  hoursAlone: null,
  adoptionReason: null,
  speciesExperience: null, // experiencia incomplete
  photos: [],              // fotos incomplete
  completionPct: 20,
}

// ─── Helper ────────────────────────────────────────────────────────────────────

async function mountLoaded(profileData = BASE_PROFILE) {
  mockGet.mockResolvedValueOnce(profileData)
  const wrapper = mount(MiPerfilPage, {
    global: { stubs: globalStubs, mocks: globalMocks },
  })
  // Wait for onMounted → loadProfile() → reactive update
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  return wrapper
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Mi Perfil page', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Re-stub useApi after clearAllMocks so it's still available
    vi.stubGlobal('useApi', () => ({
      get: mockGet,
      patch: mockPatch,
      post: vi.fn(),
      put: vi.fn(),
      del: vi.fn(),
    }))
    vi.stubGlobal('useToast', () => ({ add: mockToastAdd }))
  })

  it('[PROFILE-02] renders ProfileCompletionBar with the completionPct returned by GET /profile/me', async () => {
    const profile = { ...BASE_PROFILE, completionPct: 60 }
    const wrapper = await mountLoaded(profile)

    const bar = wrapper.findComponent(ProfileCompletionBarStub)
    expect(bar.exists()).toBe(true)
    expect(Number(bar.attributes('data-pct'))).toBe(60)
  })

  it('[PROFILE-02] renders 5 ProfileSection cards in the order: datos básicos, hogar, estilo de vida, experiencia, fotos del hogar', async () => {
    const wrapper = await mountLoaded()

    const sections = wrapper.findAllComponents(ProfileSectionStub)
    expect(sections).toHaveLength(5)

    const expectedKeys = ['datos-basicos', 'hogar', 'estilo-de-vida', 'experiencia', 'fotos']
    sections.forEach((section, index) => {
      expect(section.attributes('data-section-key')).toBe(expectedKeys[index])
    })
  })

  it('[PROFILE-02] clicking Editar in one section puts only that section in edit mode', async () => {
    const wrapper = await mountLoaded()

    // Click Editar on section 1 (datos-basicos)
    const editBtn = wrapper.find('[data-testid="edit-btn-datos-basicos"]')
    expect(editBtn.exists()).toBe(true)
    await editBtn.trigger('click')
    await wrapper.vm.$nextTick()

    const sections = wrapper.findAllComponents(ProfileSectionStub)

    // Section 1 (datos-basicos) should be in edit mode
    expect(sections[0]?.attributes('data-editing')).toBe('true')

    // Sections 2–5 should remain in view mode (independent per-section toggle)
    for (let i = 1; i < 5; i++) {
      expect(sections[i]?.attributes('data-editing')).toBe('false')
    }
  })

  it('[PROFILE-02] saving a section calls PATCH /profile/section/:section and re-fetches the profile', async () => {
    mockGet.mockResolvedValue(BASE_PROFILE)
    mockPatch.mockResolvedValueOnce(BASE_PROFILE)

    const wrapper = mount(MiPerfilPage, {
      global: { stubs: globalStubs, mocks: globalMocks },
    })
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // Emit save on the first ProfileSection (datos-basicos)
    const firstSection = wrapper.findComponent(ProfileSectionStub)
    await firstSection.vm.$emit('save')
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()

    // PATCH must have been called with the correct path
    expect(mockPatch).toHaveBeenCalledWith(
      '/profile/section/datos-basicos',
      expect.any(Object),
    )

    // GET /profile/me must have been called at least twice (initial + re-fetch)
    expect(mockGet.mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('[PROFILE-02] per-section completion badge shows verde when complete, ámbar when incomplete', async () => {
    const wrapper = await mountLoaded(PARTIAL_PROFILE)

    const sections = wrapper.findAllComponents(ProfileSectionStub)
    expect(sections).toHaveLength(5)

    // datos-basicos: phone + occupation + birthDate all filled → complete
    expect(sections[0]?.attributes('data-is-complete')).toBe('true')

    // hogar: housingType = null → incomplete
    expect(sections[1]?.attributes('data-is-complete')).toBe('false')

    // estilo-de-vida: activityLevel = null → incomplete
    expect(sections[2]?.attributes('data-is-complete')).toBe('false')

    // experiencia: speciesExperience = null → incomplete
    expect(sections[3]?.attributes('data-is-complete')).toBe('false')

    // fotos: photos.length = 0 → incomplete
    expect(sections[4]?.attributes('data-is-complete')).toBe('false')
  })
})
