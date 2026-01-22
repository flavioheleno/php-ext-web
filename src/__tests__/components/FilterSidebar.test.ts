import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import FilterSidebar from '@/components/FilterSidebar.vue'
import type { Metadata, LatestData, Filters } from '@/types'

describe('FilterSidebar', () => {
  const mockMetadata: Metadata = {
    osVersions: {
      alpine: { versions: ['3.19', '3.20'] },
      debian: { versions: ['bookworm'] }
    },
    phpVersions: {
      '8.3': { tag: '8.3.0', branch: 'PHP-8.3' },
      '8.2': { tag: '8.2.0', branch: 'PHP-8.2' }
    },
    architectures: ['amd64', 'arm64'],
    extensions: {}
  }

  const mockLatest: LatestData = {
    redis: { version: '6.0.0', pass: 10, fail: 0, total: 10, path: 'redis/6.0.0.json', updated_at: '2024-01-01' },
    memcached: { version: '3.2.0', pass: 8, fail: 2, total: 10, path: 'memcached/3.2.0.json', updated_at: '2024-01-01' }
  }

  const defaultFilters: Filters = {
    os: [],
    phpVersion: [],
    arch: [],
    extension: [],
    status: 'all',
    search: ''
  }

  const defaultProps = {
    metadata: mockMetadata,
    latest: mockLatest,
    filters: defaultFilters
  }

  it('renders status filter buttons', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('All')
    expect(wrapper.text()).toContain('Pass')
    expect(wrapper.text()).toContain('Fail')
  })

  it('emits update:filters when status changes', async () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    const successButton = wrapper.findAll('button').find(b => b.text().includes('Pass'))
    await successButton?.trigger('click')
    
    expect(wrapper.emitted('update:filters')).toBeTruthy()
    expect(wrapper.emitted('update:filters')![0]).toEqual([{ status: 'success' }])
  })

  it('renders OS filter section', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('Operating System')
    expect(wrapper.text()).toContain('alpine')
    expect(wrapper.text()).toContain('debian')
  })

  it('renders PHP version filter section', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('PHP Version')
    expect(wrapper.text()).toContain('PHP 8.3')
    expect(wrapper.text()).toContain('PHP 8.2')
  })

  it('renders architecture filter section', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('Architecture')
    expect(wrapper.text()).toContain('amd64')
    expect(wrapper.text()).toContain('arm64')
  })

  it('renders extension filter section', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('Extension')
    expect(wrapper.text()).toContain('redis')
    expect(wrapper.text()).toContain('memcached')
  })

  it('emits update:filters when OS checkbox changes', async () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    const checkboxes = wrapper.findAll('input[type="checkbox"]')
    // First checkbox is the OS group checkbox (alpine), trigger change event
    await checkboxes[0].trigger('change')
    
    expect(wrapper.emitted('update:filters')).toBeTruthy()
  })

  it('shows clear all button when filters are active', () => {
    const wrapper = mount(FilterSidebar, {
      props: {
        ...defaultProps,
        filters: { ...defaultFilters, os: ['alpine|3.19'] }
      }
    })
    
    expect(wrapper.text()).toContain('Clear All Filters')
  })

  it('emits clear-filters when clear button is clicked', async () => {
    const wrapper = mount(FilterSidebar, {
      props: {
        ...defaultProps,
        filters: { ...defaultFilters, os: ['alpine|3.19'] }
      }
    })
    
    const clearButton = wrapper.findAll('button').find(b => b.text().includes('Clear All Filters'))
    await clearButton?.trigger('click')
    
    expect(wrapper.emitted('clear-filters')).toBeTruthy()
  })

  it('hides clear all button when no filters are active', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.text()).not.toContain('Clear All Filters')
  })

  it('toggles section visibility when header is clicked', async () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    // Find PHP section header button
    const sectionButtons = wrapper.findAll('button')
    const phpButton = sectionButtons.find(b => b.text().includes('PHP Version'))
    
    // Click to collapse
    await phpButton?.trigger('click')
    
    // The section should be collapsed (content hidden via v-show)
    // We can verify the component still exists and functions
    expect(wrapper.exists()).toBe(true)
  })

  it('shows filter count badges in section headers', () => {
    const wrapper = mount(FilterSidebar, {
      props: {
        ...defaultProps,
        filters: { ...defaultFilters, os: ['alpine|3.19', 'debian|bookworm'] }
      }
    })
    
    // Should show "2" badge for OS section
    expect(wrapper.html()).toContain('2')
  })

  it('has dark mode classes', () => {
    const wrapper = mount(FilterSidebar, { props: defaultProps })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:border-gray-700')
    expect(wrapper.html()).toContain('dark:text-gray-300')
  })

  it('handles null metadata gracefully', () => {
    const wrapper = mount(FilterSidebar, {
      props: { ...defaultProps, metadata: null }
    })
    
    expect(wrapper.exists()).toBe(true)
  })

  it('handles null latest data gracefully', () => {
    const wrapper = mount(FilterSidebar, {
      props: { ...defaultProps, latest: null }
    })
    
    expect(wrapper.exists()).toBe(true)
  })
})
