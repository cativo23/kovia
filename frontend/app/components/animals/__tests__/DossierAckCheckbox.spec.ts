import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DossierAckCheckbox from '~/components/animals/DossierAckCheckbox.vue'

/**
 * Phase 15-06 Task 2 — DossierAckCheckbox behavior spec (Wave 0 sensor per
 * 15-VALIDATION line 58).
 *
 * Covers the 5 contract points the dossier page depends on (D-10 + D-11):
 *   1. Initial unchecked state renders the muted `ackHelper` text.
 *   2. Checked state renders the verde-forestal `ackReady` text.
 *   3. Clicking the underlying checkbox emits `update:modelValue` (v-model).
 *   4. The locked Spanish label "Reconozco haber leído este dossier" reaches
 *      the rendered UCheckbox prop (sourced from i18n).
 *   5. `aria-describedby` on the checkbox references the helper element id
 *      `dossier-ack-helper` so screen readers announce the helper alongside
 *      the checkbox.
 *
 * UCheckbox is stubbed because vitest doesn't load all of Nuxt UI v4 in unit
 * tests. The stub exposes its props as data attributes so we can assert
 * `data-label`, `data-aria-describedby`, and `data-model-value` directly.
 *
 * `$t` is mocked at the i18n boundary by mapping the three keys this
 * component uses to their canonical es-SV values; other keys pass through
 * as the key string (identity fallback).
 */

// Stub UCheckbox so the Nuxt UI runtime isn't loaded.
// Bridges the props back out as data attributes for assertion.
const UCheckbox = {
  name: 'UCheckbox',
  props: ['modelValue', 'label', 'ariaDescribedby'],
  emits: ['update:modelValue'],
  template: `
    <button
      type="button"
      data-testid="u-checkbox"
      :data-label="label"
      :data-model-value="String(modelValue)"
      :aria-describedby="ariaDescribedby"
      @click="$emit('update:modelValue', !modelValue)"
    />
  `,
}

const I18N_VALUES: Record<string, string> = {
  'dossier.apply.ackLabel': 'Reconozco haber leído este dossier',
  'dossier.apply.ackHelper': 'Marcá la casilla para activar el botón.',
  'dossier.apply.ackReady': 'Listo. Hacé clic en Aplicar para continuar.',
}

function mountAck(modelValue = false) {
  return mount(DossierAckCheckbox, {
    props: { modelValue },
    global: {
      stubs: { UCheckbox },
      mocks: {
        $t: (key: string) => I18N_VALUES[key] ?? key,
      },
    },
  })
}

describe('DossierAckCheckbox', () => {
  it('renders the ackHelper text when unchecked (initial state)', () => {
    const wrapper = mountAck(false)
    const helper = wrapper.find('#dossier-ack-helper')
    expect(helper.exists()).toBe(true)
    expect(helper.text()).toBe('Marcá la casilla para activar el botón.')
    // Must NOT show the ready copy when unchecked.
    expect(wrapper.text()).not.toContain(
      'Listo. Hacé clic en Aplicar para continuar.',
    )
  })

  it('renders the ackReady text in verde-forestal styling when checked', () => {
    const wrapper = mountAck(true)
    const helper = wrapper.find('#dossier-ack-helper')
    expect(helper.exists()).toBe(true)
    expect(helper.text()).toBe('Listo. Hacé clic en Aplicar para continuar.')
    // Verde-forestal token class is on the ready paragraph; class assertion
    // gives us the styling-swap signal without coupling to exact opacity etc.
    expect(helper.attributes('class') || '').toMatch(/verde-forestal/)
    // Helper text must not be the muted-unchecked copy.
    expect(helper.text()).not.toBe('Marcá la casilla para activar el botón.')
  })

  it('emits update:modelValue when the underlying checkbox is clicked', async () => {
    const wrapper = mountAck(false)
    const checkbox = wrapper.find('[data-testid="u-checkbox"]')
    expect(checkbox.exists()).toBe(true)
    await checkbox.trigger('click')
    const events = wrapper.emitted('update:modelValue')
    expect(events).toBeTruthy()
    expect(events![0]).toEqual([true])
  })

  it('passes the LOCKED es-SV ackLabel to the underlying checkbox', () => {
    const wrapper = mountAck(false)
    const checkbox = wrapper.find('[data-testid="u-checkbox"]')
    expect(checkbox.attributes('data-label')).toBe(
      'Reconozco haber leído este dossier',
    )
  })

  it('points aria-describedby at the helper element id `dossier-ack-helper`', () => {
    const wrapper = mountAck(false)
    const checkbox = wrapper.find('[data-testid="u-checkbox"]')
    expect(checkbox.attributes('aria-describedby')).toBe('dossier-ack-helper')

    // Same id when checked — the element is re-rendered (v-else branch) but
    // keeps the id so the aria-describedby pointer stays valid.
    const checked = mountAck(true)
    expect(checked.find('#dossier-ack-helper').exists()).toBe(true)
  })
})
