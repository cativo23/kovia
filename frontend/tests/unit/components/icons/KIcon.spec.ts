import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { ALL_ICON_NAMES } from '../../../fixtures/icon-names'

/**
 * RED: Wave 0 stub for DESIGN-03 hand-authored paw-based icon set.
 *
 * Parameterized over the canonical 63-icon list. Plans 04 and 05 land each
 * SVG component plus the `<KIcon name="...">` resolver. This spec MUST fail
 * today because `~/components/icons/KIcon.vue` does not yet exist.
 */

// @ts-expect-error - KIcon does not exist until Plan 04 (RED gate)
import KIcon from '~/components/icons/KIcon.vue'

describe('KIcon (DESIGN-03) [RED — Plans 04/05 turn GREEN]', () => {
  it('exports exactly 63 canonical icon names from the fixture', () => {
    expect(ALL_ICON_NAMES.length).toBe(63)
  })

  it.each(ALL_ICON_NAMES)('renders an <svg> for name="%s"', (name) => {
    const wrapper = mount(KIcon, { props: { name } })
    expect(wrapper.find('svg').exists()).toBe(true)
  })
})
