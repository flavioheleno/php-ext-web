import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import SkeletonLoader from '@/components/SkeletonLoader.vue'

describe('SkeletonLoader', () => {
  it('renders stats skeleton', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'stats' }
    })
    
    expect(wrapper.find('.grid-cols-2').exists()).toBe(true)
    expect(wrapper.findAll('.animate-pulse').length).toBeGreaterThan(0)
  })

  it('renders filters skeleton', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'filters' }
    })
    
    expect(wrapper.find('.space-y-4').exists()).toBe(true)
    expect(wrapper.findAll('.animate-pulse').length).toBe(5)
  })

  it('renders list skeleton with default count', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'list' }
    })
    
    expect(wrapper.find('.divide-y').exists()).toBe(true)
    expect(wrapper.findAll('.divide-y > div').length).toBe(8)
  })

  it('renders list skeleton with custom count', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'list', count: 5 }
    })
    
    expect(wrapper.findAll('.divide-y > div').length).toBe(5)
  })

  it('renders grid skeleton with default count', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'grid' }
    })
    
    expect(wrapper.findAll('.divide-y > div').length).toBe(8)
  })

  it('renders grid skeleton with custom count', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'grid', count: 3 }
    })
    
    expect(wrapper.findAll('.divide-y > div').length).toBe(3)
  })

  it('has dark mode classes', () => {
    const wrapper = mount(SkeletonLoader, {
      props: { type: 'stats' }
    })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:bg-gray-700')
  })
})
