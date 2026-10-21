import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KSpringCard from '~/components/motion/KSpringCard.vue'

// motion.div is auto-imported by motion-v/nuxt at runtime; in vitest we
// stub it as a passthrough <div> so we can assert the wrapper class +
// slot rendering without booting the full Nuxt runtime.
const motionDivStub = {
  name: 'motion.div',
  inheritAttrs: false,
  template: '<div :class="$attrs.class"><slot /></div>',
}

describe('KSpringCard (DESIGN-05)', () => {
  it('renders default slot inside .k-card wrapper', () => {
    const wrapper = mount(KSpringCard, {
      slots: { default: '<p>Hover me</p>' },
      global: { stubs: { 'motion.div': motionDivStub } },
    })
    expect(wrapper.find('.k-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hover me')
  })
})
