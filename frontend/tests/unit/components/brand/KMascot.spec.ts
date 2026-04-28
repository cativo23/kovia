import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KMascot from '~/components/brand/mascot/KMascot.vue'

const VARIANTS = ['hero', 'empty-state', 'loading', 'status'] as const

describe('KMascot (DESIGN-04)', () => {
  it.each(VARIANTS)('renders variant "%s" as svg', (variant) => {
    const wrapper = mount(KMascot, { props: { variant } })
    expect(wrapper.find('svg').exists()).toBe(true)
    expect(wrapper.find('svg').html().length).toBeGreaterThan(50)
  })

  it('status="approved" and status="rejected" render different content', () => {
    const a = mount(KMascot, { props: { variant: 'status', status: 'approved' } })
    const r = mount(KMascot, { props: { variant: 'status', status: 'rejected' } })
    expect(a.html()).not.toBe(r.html())
  })

  it('status="pending" renders distinct content from "approved"', () => {
    const p = mount(KMascot, { props: { variant: 'status', status: 'pending' } })
    const a = mount(KMascot, { props: { variant: 'status', status: 'approved' } })
    expect(p.html()).not.toBe(a.html())
  })

  it('respects size prop', () => {
    const w = mount(KMascot, { props: { variant: 'hero', size: 120 } })
    const svg = w.find('svg')
    expect(svg.attributes('width')).toBe('120')
    expect(svg.attributes('height')).toBe('120')
  })

  it('uses default ariaLabel when not provided', () => {
    const w = mount(KMascot, { props: { variant: 'hero' } })
    expect(w.find('svg').attributes('aria-label')).toBe('Mascota Kovia')
  })
})
