import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KDisplay from '~/components/typography/KDisplay.vue'

/**
 * GREEN (Plan 14-03 / DESIGN-02): assert that <KDisplay> wires the motion-v
 * spring chain to font-variation-settings on a `k-display` h1.
 *
 * <motion.h1> is auto-imported by motion-v/nuxt at runtime, but the vitest
 * happy-dom environment has no Nuxt runtime — so we stub `motion.h1` with a
 * passthrough <h1> that forwards class/style. The assertions only verify the
 * static binding wiring (presence of class, presence of font-variation-settings
 * referencing the wght axis); they do NOT verify spring animation frames,
 * which are not observable in happy-dom (D-13).
 */

const motionH1Stub = {
  name: 'motion-h1',
  inheritAttrs: true,
  template: '<h1 :style="$attrs.style" :class="$attrs.class"><slot /></h1>',
}

const globalStubs = {
  // motion-v exposes <motion.h1> via its nuxt module's component resolver.
  // In Vue's component name registry that resolves to "motion.h1" / "motion-h1".
  'motion.h1': motionH1Stub,
}

describe('KDisplay (DESIGN-02)', () => {
  it('renders default slot inside an h1 with the k-display class', () => {
    const wrapper = mount(KDisplay, {
      slots: { default: 'Hola' },
      global: { stubs: globalStubs },
    })
    expect(wrapper.text()).toContain('Hola')
    expect(wrapper.html()).toMatch(/class="[^"]*k-display/)
  })

  it("style binding includes font-variation-settings referencing the wght axis", () => {
    const wrapper = mount(KDisplay, {
      slots: { default: 'X' },
      global: { stubs: globalStubs },
    })
    const html = wrapper.html()
    expect(html).toMatch(/font-variation-settings/i)
    expect(html).toMatch(/wght/)
  })
})
