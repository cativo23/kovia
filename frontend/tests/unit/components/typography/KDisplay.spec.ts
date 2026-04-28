import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * RED: Wave 0 stub for DESIGN-02 display typography component.
 *
 * Plan 03 lands `<KDisplay>` — the hero typography primitive that animates
 * Inter's `wght` axis 800→900 on hover (D-07). This spec MUST fail today
 * because `~/components/typography/KDisplay.vue` does not yet exist.
 */

// @ts-expect-error - KDisplay does not exist until Plan 03 (RED gate)
import KDisplay from '~/components/typography/KDisplay.vue'

describe('KDisplay (DESIGN-02) [RED — Plan 03 turns GREEN]', () => {
  it('renders an element with class "k-display"', () => {
    const wrapper = mount(KDisplay, { slots: { default: 'Hola' } })
    expect(wrapper.classes()).toContain('k-display')
  })

  it('exposes a font-variation-settings binding referencing the wght axis', () => {
    const wrapper = mount(KDisplay, { slots: { default: 'Hola' } })
    const style = wrapper.attributes('style') ?? ''
    expect(style).toMatch(/font-variation-settings/i)
    expect(style).toMatch(/wght/i)
  })
})
