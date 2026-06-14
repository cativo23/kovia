import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import KPawLoader from '~/components/brand/KPawLoader.vue'

// KIcon is auto-imported by Nuxt at runtime; stub for vitest.
const KIconStub = {
  name: 'KIcon',
  props: ['name', 'size'],
  template: '<svg :data-icon="name" />',
}

// $t mock returns the key, so we can assert against the i18n key directly.
const i18nStub = { mocks: { $t: (k: string) => k } }

describe('KPawLoader (DESIGN-05)', () => {
  it('renders the wrapper with class "k-paw-loader"', () => {
    const wrapper = mount(KPawLoader, {
      global: { stubs: { KIcon: KIconStub }, ...i18nStub },
    })
    expect(wrapper.classes()).toContain('k-paw-loader')
  })

  it('renders 4 paw elements with paw class', () => {
    const wrapper = mount(KPawLoader, {
      global: { stubs: { KIcon: KIconStub }, ...i18nStub },
    })
    const paws = wrapper.findAll('.paw')
    expect(paws.length).toBe(4)
  })

  it('has role="status" for assistive tech', () => {
    const wrapper = mount(KPawLoader, {
      global: { stubs: { KIcon: KIconStub }, ...i18nStub },
    })
    expect(wrapper.attributes('role')).toBe('status')
  })

  it('contains sr-only label with common.loading key', () => {
    const wrapper = mount(KPawLoader, {
      global: { stubs: { KIcon: KIconStub }, ...i18nStub },
    })
    expect(wrapper.find('.sr-only').text()).toBe('common.loading')
  })

  it('uses aria-live="polite" for non-intrusive announcement', () => {
    const wrapper = mount(KPawLoader, {
      global: { stubs: { KIcon: KIconStub }, ...i18nStub },
    })
    expect(wrapper.attributes('aria-live')).toBe('polite')
  })
})
