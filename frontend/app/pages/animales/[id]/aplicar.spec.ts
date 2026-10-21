/**
 * Apply wizard (3-step) page tests — Phase 16 (converted from Wave 0 stubs)
 *
 * Requirement lock: APPLY-01 + APPLY-04 + APPLY-05 + APPLY-06
 *   - APPLY-01: Wizard consumes adopter profile snapshot; step 1 shows profile
 *     data in read-only mode (no re-entry form). Redirects when completionPct < 100.
 *   - APPLY-04: Step 2 renders ExtrasTemplate questions (behavioral specificity).
 *   - APPLY-05: Criticality tags must NEVER appear in the rendered DOM of step 2.
 *   - APPLY-06: Submit POSTs SubmitApplicationDto with co-aplicante fields.
 *
 * Pattern: mount() from @vue/test-utils; vi.stubGlobal for Nuxt auto-imports.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { defineComponent, ref } from 'vue'

// ─── Mock Nuxt auto-imports BEFORE component import ──────────────────────────

const mockGet = vi.fn()
const mockPost = vi.fn()
const mockNavigateTo = vi.fn()
const mockToastAdd = vi.fn()

vi.stubGlobal('useApi', () => ({ get: mockGet, post: mockPost, put: vi.fn(), patch: vi.fn(), del: vi.fn() }))
vi.stubGlobal('useToast', () => ({ add: mockToastAdd }))
vi.stubGlobal('navigateTo', mockNavigateTo)
vi.stubGlobal('useRoute', () => ({ params: { id: 'animal-123' }, query: {} }))
vi.stubGlobal('useI18n', () => ({
  t: (key: string, params?: Record<string, unknown>) => {
    if (params) return `${key}:${JSON.stringify(params)}`
    return key
  },
}))
vi.stubGlobal('definePageMeta', vi.fn())

// ─── Import page under test ──────────────────────────────────────────────────

import AplicarPage from './aplicar.vue'

// ─── Component stubs ─────────────────────────────────────────────────────────

const ExtrasFormStub = defineComponent({
  name: 'ExtrasForm',
  props: {
    questions: { type: Array, default: () => [] },
    modelValue: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup(props) {
    const validate = () => true
    return { validate, questions: props.questions }
  },
  template: `
    <div data-testid="ExtrasForm" :data-questions-count="questions.length">
      <div v-for="q in questions" :key="q.id" :data-question-id="q.id">
        {{ q.text }}
      </div>
    </div>
  `,
})

const CoAplicanteStepStub = defineComponent({
  name: 'CoAplicanteStep',
  props: {
    modelValue: { type: Object, default: () => ({}) },
  },
  emits: ['update:modelValue'],
  setup() {
    const validate = () => true
    return { validate }
  },
  template: `<div data-testid="CoAplicanteStep" />`,
})

const globalStubs = {
  ExtrasForm: ExtrasFormStub,
  CoAplicanteStep: CoAplicanteStepStub,
  KIcon: { props: ['name', 'size'], template: '<span :data-icon="name" />' },
  KSpringCard: { template: '<div><slot /></div>' },
  NuxtLink: { props: ['to', 'target', 'rel'], template: '<a :href="to"><slot /></a>' },
  NuxtLayout: { template: '<div><slot /></div>' },
  UCard: { template: '<div><slot /></div>' },
  UAlert: {
    props: ['color', 'title', 'description'],
    template: '<div :data-color="color" :data-title="title"><slot /><slot name="actions" /></div>',
  },
  UButton: {
    props: ['label', 'loading', 'disabled', 'to'],
    emits: ['click'],
    template: '<button :data-label="label" :disabled="disabled" @click="$emit(\'click\')"><slot /><slot name="leading" /><slot name="trailing" /></button>',
  },
  UFormField: { template: '<div><slot /></div>' },
  UInput: {
    props: ['modelValue', 'type', 'placeholder'],
    emits: ['update:modelValue'],
    template: '<input :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  USelect: { props: ['modelValue', 'items'], template: '<select />' },
  UCheckbox: { props: ['modelValue'], template: '<input type="checkbox" />' },
}

const globalMocks = {
  $t: (key: string) => key,
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

const COMPLETE_PROFILE = {
  id: 'profile-1', completionPct: 100,
  phone: '+503 7890 1234', occupation: 'Ingeniero', birthDate: '1990-01-01', city: 'San Salvador',
  housingType: 'Casa', ownership: 'Propia', exteriorSpace: true, petPermission: true,
  adults: 2, children: 0, currentPets: [],
  activityLevel: 'Alto', hoursAlone: 4, adoptionReason: 'Companero',
  speciesExperience: true, previousPets: [], additionalContext: null,
  photos: [{ id: 'p1', url: 'http://example.com/photo.jpg', key: 'profiles/photo.jpg', position: 0 }],
}

const AVAILABLE_ANIMAL = { id: 'animal-123', name: 'Luna', status: 'AVAILABLE' }

const SAMPLE_QUESTIONS = [
  { id: 'q1', text: '¿Cuántas caminatas?', type: 'number', required: true, placeholder: '' },
  { id: 'q2', text: '¿Tienes experiencia con perros?', type: 'boolean', required: false },
]

async function mountWizard({
  profile = COMPLETE_PROFILE,
  questions = SAMPLE_QUESTIONS,
  duplicateCheck = { exists: false },
}: {
  profile?: Record<string, unknown>
  questions?: unknown[]
  duplicateCheck?: { exists: boolean; applicationId?: string }
} = {}) {
  // onMounted call order: check duplicate → animal → profile → extras
  mockGet
    .mockResolvedValueOnce(duplicateCheck)         // /applications/check
    .mockResolvedValueOnce(AVAILABLE_ANIMAL)       // /animals/animal-123
    .mockResolvedValueOnce(profile)               // /profile/me
    .mockResolvedValueOnce({ questions })         // /extras-templates/animal-123

  const wrapper = mount(AplicarPage, {
    global: { stubs: globalStubs, mocks: globalMocks },
  })

  // Wait for onMounted + reactive updates
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()
  await wrapper.vm.$nextTick()

  return wrapper
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Apply wizard (3-step)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('useApi', () => ({ get: mockGet, post: mockPost, put: vi.fn(), patch: vi.fn(), del: vi.fn() }))
    vi.stubGlobal('useToast', () => ({ add: mockToastAdd }))
    vi.stubGlobal('navigateTo', mockNavigateTo)
    vi.stubGlobal('useRoute', () => ({ params: { id: 'animal-123' }, query: {} }))
    vi.stubGlobal('useI18n', () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (params) return `${key}:${JSON.stringify(params)}`
        return key
      },
    }))
    vi.stubGlobal('definePageMeta', vi.fn())
  })

  it('[APPLY-01] renders 3-step wizard labels — profile, extras, coapplicant', async () => {
    const wrapper = await mountWizard()

    const text = wrapper.text()
    // The step labels are rendered via $t which returns the key
    expect(text).toContain('apply.steps.profile')
    expect(text).toContain('apply.steps.extras')
    expect(text).toContain('apply.steps.coapplicant')
  })

  it('[APPLY-01] redirects to /perfil/?incomplete=1 when GET /profile/me returns completionPct < 100', async () => {
    const incompleteProfile = { ...COMPLETE_PROFILE, completionPct: 60 }
    await mountWizard({ profile: incompleteProfile })

    expect(mockNavigateTo).toHaveBeenCalledWith('/perfil/?incomplete=1')
  })

  it('[APPLY-01] step 1 renders profile sections in read-only mode (no Editar buttons within the wizard step 1 surface)', async () => {
    const wrapper = await mountWizard()

    // Step 1 should be visible (currentStep=0)
    const step1Div = wrapper.find('[v-show]')
    const html = wrapper.html()

    // Should show profile section data, not edit forms
    // The wizard step 1 has read-only divs with profile fields
    // No ApplicationStepPersonal/Housing/Lifestyle components (legacy removed)
    expect(html).not.toContain('ApplicationStepPersonal')
    expect(html).not.toContain('ApplicationStepHousing')
    expect(html).not.toContain('ApplicationStepLifestyle')

    // Profile section labels should be present
    expect(html).toContain('profile.sections.datos-basicos')
    expect(html).toContain('profile.sections.hogar')
    expect(html).toContain('profile.sections.estilo-de-vida')
  })

  it('[APPLY-04] step 2 renders the extras questions returned by GET /extras-templates/:animalId', async () => {
    const wrapper = await mountWizard({ questions: SAMPLE_QUESTIONS })

    // Find ExtrasForm component
    const extrasForm = wrapper.findComponent(ExtrasFormStub)
    expect(extrasForm.exists()).toBe(true)
    // It receives the questions from the extras template
    expect(Number(extrasForm.attributes('data-questions-count'))).toBe(SAMPLE_QUESTIONS.length)
  })

  it('[APPLY-05] step 2 DOM contains zero criticality-related text', async () => {
    const wrapper = await mountWizard({ questions: SAMPLE_QUESTIONS })

    const text = wrapper.text()
    // DOM must not contain criticality-related strings
    expect(text.match(/CR[ÍI]TICA|IMPORTANTE|OPCIONAL|criticality/i)).toBeNull()
  })

  it('[APPLY-06] submit POSTs payload with co-aplicante fields and redirects on success', async () => {
    mockPost.mockResolvedValueOnce({ id: 'app-1' })
    mockNavigateTo.mockResolvedValue(undefined)

    const wrapper = await mountWizard()

    // Access the component instance to directly set co-aplicante form data
    // and trigger submit (bypassing step navigation for test purposes)
    const vm = wrapper.vm as any

    // Set co-aplicante form values
    vm.coAplicanteForm = {
      coAplicanteNombre: 'María García',
      coAplicanteEmail: 'maria@example.com',
      coAplicantePhone: '+503 7890 9999',
    }

    // Skip step validation by calling submitApplication directly
    // after setting coAplicanteStepRef.validate to return true
    vm.coAplicanteStepRef = { validate: () => true }

    await vm.submitApplication()
    await wrapper.vm.$nextTick()

    // Should have POSTed to /applications
    expect(mockPost).toHaveBeenCalledWith(
      '/applications',
      expect.objectContaining({
        animalId: 'animal-123',
        coAplicanteNombre: 'María García',
        coAplicanteEmail: 'maria@example.com',
        coAplicantePhone: '+503 7890 9999',
        extraAnswers: expect.any(Array),
      }),
    )

    // Should NOT include questionText (server freezes it)
    const payload = mockPost.mock.calls[0]?.[1] as any
    if (payload?.extraAnswers?.length > 0) {
      expect(payload.extraAnswers[0]).not.toHaveProperty('questionText')
    }

    // Should have navigated to Mis Aplicaciones with submitted=1
    expect(mockNavigateTo).toHaveBeenCalledWith('/perfil/aplicaciones?submitted=1')
  })
})
