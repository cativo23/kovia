import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * RED: Wave 0 stub for DESIGN-04 mascot variants.
 *
 * The mascot ships in four variants per spec §B illustration system:
 * hero, empty-state, loading, status. Plan 06 authors them (D-11). This spec
 * MUST fail today because `~/components/brand/KMascot.vue` does not yet exist.
 */

// @ts-expect-error - KMascot does not exist until Plan 06 (RED gate)
import KMascot from '~/components/brand/KMascot.vue'

const VARIANTS = ['hero', 'empty-state', 'loading', 'status'] as const

describe('KMascot (DESIGN-04) [RED — Plan 06 turns GREEN]', () => {
  it.each(VARIANTS)('renders an <svg> for variant="%s"', (variant) => {
    const wrapper = mount(KMascot, { props: { variant } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
