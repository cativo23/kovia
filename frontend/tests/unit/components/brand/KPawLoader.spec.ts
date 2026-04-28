import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'

/**
 * RED: Wave 0 stub for DESIGN-05 paw-walk loader.
 *
 * Plan 06 authors the four-paw walking-loop loader (CSS keyframes per D-14).
 * This spec MUST fail today because `~/components/brand/KPawLoader.vue` does
 * not yet exist.
 */

// @ts-expect-error - KPawLoader does not exist until Plan 06 (RED gate)
import KPawLoader from '~/components/brand/KPawLoader.vue'

describe('KPawLoader (DESIGN-05) [RED — Plan 06 turns GREEN]', () => {
  it('renders the wrapper with class "k-paw-loader"', () => {
    const wrapper = mount(KPawLoader)
    expect(wrapper.classes()).toContain('k-paw-loader')
  })

  it('contains four paw step elements', () => {
    const wrapper = mount(KPawLoader)
    const paws = wrapper.findAll('[class*="paw"]')
    // Wrapper itself matches "paw"; we want at least 4 children matching too.
    expect(paws.length).toBeGreaterThanOrEqual(5)
  })
})
