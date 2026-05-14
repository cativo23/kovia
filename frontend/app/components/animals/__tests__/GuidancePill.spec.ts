import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GuidancePill from '~/components/animals/GuidancePill.vue'
import type { Guidance } from '~/types/public-animal'

/**
 * Phase 15-05 Task 1 — GuidancePill behavior spec (Wave 0 sensor per 15-VALIDATION §57).
 *
 * Asserts the props-only API per UI-SPEC §Component Inventory:
 * - 3 color variants → 3 icons (verde→check-circle, ambar→alert-circle, rojo→shield)
 * - secondary copy only renders when `guidance.copy` is set (typically only `rojo`)
 * - aria-label composition (label + ". " + copy when present)
 * - card vs dossier layout variants
 */

// Stub KIcon globally so the icon registry doesn't load at spec time.
// `name` becomes a data-icon attribute we can assert against.
const KIcon = {
  name: 'KIcon',
  props: ['name', 'size'],
  template: '<span data-testid="k-icon" :data-icon="name" :data-size="size" />',
}

function mountPill(guidance: Guidance, props: Record<string, unknown> = {}) {
  return mount(GuidancePill, {
    props: { guidance, ...props } as any,
    global: { stubs: { KIcon } },
  })
}

// LOCKED PUBLIC-06 — copy/paste-equal to backend LOCKED_MEDICAL_COPY in
// backend/src/public-animals/guidance.ts. The locked-copy-consistency spec
// (Phase 15-03 boundary spec) enforces backend↔i18n byte-equality on the
// JSON side; this spec keeps the LOCKED string visible in the rendering
// test too so a renderer regression that mangles the string is caught here.
const LOCKED_MEDICAL_COPY =
  'Animal con condición médica activa. Conocé los detalles y costos antes de aplicar'

describe('GuidancePill', () => {
  it('renders verde guidance with check-circle icon and verde tint', () => {
    const wrapper = mountPill({ color: 'verde', label: 'Buena pareja' })
    const root = wrapper.find('[role="status"]')
    expect(root.exists()).toBe(true)
    expect(wrapper.text()).toContain('Buena pareja')
    const icon = wrapper.find('[data-testid="k-icon"]')
    expect(icon.exists()).toBe(true)
    expect(icon.attributes('data-icon')).toBe('check-circle')
    // verde tint: matches via class containing the verde-forestal token
    expect(root.attributes('class') || '').toMatch(/verde-forestal/)
  })

  it('renders ambar guidance with alert-circle icon and ambar tint', () => {
    const wrapper = mountPill({
      color: 'ambar',
      label: 'Considerá: edad senior',
    })
    const root = wrapper.find('[role="status"]')
    expect(root.exists()).toBe(true)
    expect(wrapper.text()).toContain('Considerá: edad senior')
    const icon = wrapper.find('[data-testid="k-icon"]')
    expect(icon.attributes('data-icon')).toBe('alert-circle')
    expect(root.attributes('class') || '').toMatch(/ambar/)
  })

  it('renders rojo guidance without copy → shield icon, rojo tint, no secondary block', () => {
    const wrapper = mountPill({
      color: 'rojo',
      label: 'Necesidades especiales · revisá dossier',
    })
    const root = wrapper.find('[role="status"]')
    expect(root.exists()).toBe(true)
    const icon = wrapper.find('[data-testid="k-icon"]')
    expect(icon.attributes('data-icon')).toBe('shield')
    expect(root.attributes('class') || '').toMatch(/rojo/)
    // No copy prop → secondary text block must NOT be rendered.
    expect(wrapper.find('[data-pill-copy]').exists()).toBe(false)
    // Body must not contain the locked copy.
    expect(wrapper.text()).not.toContain(LOCKED_MEDICAL_COPY)
  })

  it('renders rojo guidance WITH locked PUBLIC-06 copy verbatim in secondary block (dossier variant)', () => {
    const wrapper = mountPill(
      {
        color: 'rojo',
        label: 'Necesidades especiales · revisá dossier',
        copy: LOCKED_MEDICAL_COPY,
      },
      { variant: 'dossier' },
    )
    const copyBlock = wrapper.find('[data-pill-copy]')
    expect(copyBlock.exists()).toBe(true)
    // Byte-equal verbatim assertion — the renderer MUST NOT mangle the string.
    expect(copyBlock.text()).toBe(LOCKED_MEDICAL_COPY)
  })

  it('composes aria-label from label and copy separated by ". " when copy present', () => {
    const wrapper = mountPill({
      color: 'rojo',
      label: 'Necesidades especiales · revisá dossier',
      copy: LOCKED_MEDICAL_COPY,
    })
    const root = wrapper.find('[role="status"]')
    expect(root.attributes('aria-label')).toBe(
      `Necesidades especiales · revisá dossier. ${LOCKED_MEDICAL_COPY}`,
    )

    // Without copy, aria-label is just the label.
    const verde = mountPill({ color: 'verde', label: 'Buena pareja' })
    expect(verde.find('[role="status"]').attributes('aria-label')).toBe(
      'Buena pareja',
    )
  })

  it('variant=card renders horizontal layout; variant=dossier renders vertical layout', () => {
    const card = mountPill(
      { color: 'verde', label: 'Buena pareja' },
      { variant: 'card' },
    )
    expect(card.find('[role="status"]').attributes('data-variant')).toBe(
      'card',
    )

    const dossier = mountPill(
      { color: 'verde', label: 'Buena pareja' },
      { variant: 'dossier' },
    )
    expect(dossier.find('[role="status"]').attributes('data-variant')).toBe(
      'dossier',
    )
  })
})
