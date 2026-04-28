import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KIcon from '~/components/icons/KIcon.vue'
import { ALL_ICON_NAMES } from '../../../fixtures/icon-names'

/**
 * GREEN gate for Plan 14-04. Plan 05 will extend coverage to all 63
 * canonical icon names. For now we assert the 34 names authored in
 * this plan render as <svg>, plus utility behaviors.
 */
const PLAN_04_NAMES = [
  'arrow-left', 'arrow-right', 'chevron-left', 'chevron-right', 'chevron-up',
  'layout-dashboard', 'layout-grid', 'list', 'more-horizontal',
  'alert-circle', 'check', 'check-circle', 'circle-check-big', 'clock',
  'loader-2', 'party-popper', 'shield', 'shield-check', 'x', 'x-circle',
  'bell', 'facebook', 'instagram', 'log-out', 'user',
  'user-minus', 'user-plus', 'users', 'users-round',
  'baby', 'cat', 'dog', 'paw-print', 'ruler',
]

describe('KIcon', () => {
  it.each(PLAN_04_NAMES)('renders icon "%s" as <svg>', (name) => {
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

  // Plan 05 will assert ALL_ICON_NAMES.length === 63 and that every name resolves.
  it('canonical fixture has 63 names total (sanity)', () => {
    expect(ALL_ICON_NAMES.length).toBe(63)
  })
})
