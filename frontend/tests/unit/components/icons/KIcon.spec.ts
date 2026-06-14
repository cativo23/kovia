import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KIcon from '~/components/icons/KIcon.vue'
import { ALL_ICON_NAMES } from '../../../fixtures/icon-names'

/**
 * Plan 14-05 GREEN gate: every canonical icon (all 63) must resolve through
 * KIcon to a real <svg> with no fallback marker. This is the spec that
 * gates the codebase-wide Lucide → KIcon migration.
 */

describe('KIcon', () => {
  it.each(ALL_ICON_NAMES)('renders canonical icon "%s" as <svg> (no fallback)', (name) => {
    const wrapper = mount(KIcon, { props: { name } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('[data-kicon-missing]').exists()).toBe(false)
  })

  it('renders fallback for unknown name', () => {
    const wrapper = mount(KIcon, { props: { name: 'definitely-not-a-real-icon' } })
    expect(wrapper.find('[data-kicon-missing="definitely-not-a-real-icon"]').exists()).toBe(true)
  })

  it('passes size prop to width/height', () => {
    const wrapper = mount(KIcon, { props: { name: 'paw-print', size: 32 } })
    const svg = wrapper.find('svg')
    expect(svg.attributes('width')).toBe('32')
    expect(svg.attributes('height')).toBe('32')
  })

  it('canonical fixture has 63 names total (sanity)', () => {
    expect(ALL_ICON_NAMES.length).toBe(63)
  })
})
