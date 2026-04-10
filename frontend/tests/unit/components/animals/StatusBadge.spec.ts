import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import StatusBadge from '~/components/animals/StatusBadge.vue'

// Mock UBadge component
const UBadge = {
  name: 'UBadge',
  props: ['color', 'variant'],
  template: '<span :data-color="color" :data-variant="variant"><slot /></span>',
}

describe('StatusBadge', () => {
  function mountBadge(status: string) {
    return mount(StatusBadge, {
      props: { status: status as any },
      global: {
        stubs: { UBadge },
      },
    })
  }

  it('renders AVAILABLE status with success color', () => {
    const wrapper = mountBadge('AVAILABLE')
    // useI18n mock returns key as-is
    expect(wrapper.text()).toBe('animals.status.available')
    expect(wrapper.find('[data-color="success"]').exists()).toBe(true)
  })

  it('renders IN_PROCESS status with warning color', () => {
    const wrapper = mountBadge('IN_PROCESS')
    expect(wrapper.text()).toBe('animals.status.inProcess')
    expect(wrapper.find('[data-color="warning"]').exists()).toBe(true)
  })

  it('renders ADOPTED status with info color', () => {
    const wrapper = mountBadge('ADOPTED')
    expect(wrapper.text()).toBe('animals.status.adopted')
    expect(wrapper.find('[data-color="info"]').exists()).toBe(true)
  })

  it('renders ARCHIVED status with neutral color', () => {
    const wrapper = mountBadge('ARCHIVED')
    expect(wrapper.text()).toBe('animals.status.archived')
    expect(wrapper.find('[data-color="neutral"]').exists()).toBe(true)
  })

  it('handles unknown status gracefully by showing raw status string', () => {
    const wrapper = mountBadge('UNKNOWN_STATUS')
    expect(wrapper.text()).toBe('UNKNOWN_STATUS')
    expect(wrapper.find('[data-color="neutral"]').exists()).toBe(true)
  })
})
