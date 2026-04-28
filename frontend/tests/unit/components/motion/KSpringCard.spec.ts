import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * RED: Wave 0 stub for DESIGN-05 motion primitive.
 *
 * Plan 06 lands `<KSpringCard>` — the iOS-widget-quality card hover primitive
 * built on motion-v's `useSpring` + `motion()` factory (D-13, D-16). This spec
 * MUST fail today because `~/components/motion/KSpringCard.vue` does not yet
 * exist. We pre-stub motion-v so the failure is the missing component, not the
 * missing motion library import.
 */
vi.mock('motion-v', () => ({
  motion: new Proxy(
    {},
    {
      get: () => ({
        name: 'motion-stub',
        template: '<div><slot /></div>',
      }),
    },
  ),
  useSpring: () => ({ value: 0 }),
}))

// @ts-expect-error - KSpringCard does not exist until Plan 06 (RED gate)
import KSpringCard from '~/components/motion/KSpringCard.vue'

describe('KSpringCard (DESIGN-05) [RED — Plan 06 turns GREEN]', () => {
  it('renders the default slot inside a .k-card wrapper', () => {
    const wrapper = mount(KSpringCard, {
      slots: { default: '<p>Hover me</p>' },
    })
    expect(wrapper.find('.k-card').exists()).toBe(true)
    expect(wrapper.text()).toContain('Hover me')
  })
})
