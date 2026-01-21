import { describe, it, expect, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import ListView from '@/components/ListView.vue'
import type { ProcessedExtension } from '@/types'

// Mock useFormat
vi.mock('@/composables/useFormat', () => ({
  formatRelativeTime: vi.fn((date) => date ? '2 hours ago' : 'N/A')
}))

describe('ListView', () => {
  const mockExtensions: ProcessedExtension[] = [
    { name: 'redis', version: '6.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '2024-01-15' },
    { name: 'memcached', version: '3.2.0', pass: 8, fail: 2, total: 10, successRate: 80, path: '', updated_at: '2024-01-14' },
    { name: 'apcu', version: '5.1.0', pass: 5, fail: 5, total: 10, successRate: 50, path: '', updated_at: '2024-01-13' },
  ]

  it('renders empty state when no extensions', () => {
    const wrapper = mount(ListView, {
      props: { extensions: [] }
    })
    
    expect(wrapper.text()).toContain('No extensions found')
    expect(wrapper.text()).toContain('Try adjusting your filters or search query')
  })

  it('renders table with extensions', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('redis')
    expect(wrapper.text()).toContain('memcached')
    expect(wrapper.text()).toContain('apcu')
  })

  it('renders table headers', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.text()).toContain('Extension')
    expect(wrapper.text()).toContain('Version')
    expect(wrapper.text()).toContain('Builds')
    expect(wrapper.text()).toContain('Success Rate')
    expect(wrapper.text()).toContain('Updated')
  })

  it('emits select-extension when row is clicked', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    const button = wrapper.findAll('button').find(b => b.text().includes('redis'))
    await button?.trigger('click')
    
    expect(wrapper.emitted('select-extension')).toBeTruthy()
    expect(wrapper.emitted('select-extension')![0]).toEqual(['redis'])
  })

  it('sorts by name ascending by default', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('apcu')
    expect(rows[1].text()).toContain('memcached')
    expect(rows[2].text()).toContain('redis')
  })

  it('toggles sort direction when clicking same header', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    // First click on Extension header (should reverse sort)
    const nameHeader = wrapper.findAll('th').find(th => th.text().includes('Extension'))
    await nameHeader?.trigger('click')
    
    const rows = wrapper.findAll('tbody tr')
    expect(rows[0].text()).toContain('redis')
    expect(rows[2].text()).toContain('apcu')
  })

  it('sorts by different field when clicking different header', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    // Click on Success Rate header
    const successHeader = wrapper.findAll('th').find(th => th.text().includes('Success Rate'))
    await successHeader?.trigger('click')
    
    const rows = wrapper.findAll('tbody tr')
    // Sorted by success rate descending (default for numeric)
    expect(rows[0].text()).toContain('redis') // 100%
    expect(rows[1].text()).toContain('memcached') // 80%
    expect(rows[2].text()).toContain('apcu') // 50%
  })

  it('displays pass/fail counts', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.text()).toContain('10') // redis pass
    expect(wrapper.text()).toContain('0') // redis fail
    expect(wrapper.text()).toContain('8') // memcached pass
    expect(wrapper.text()).toContain('2') // memcached fail
  })

  it('displays success rate with correct color', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.html()).toContain('text-green-600') // 100%
    expect(wrapper.html()).toContain('text-amber-600') // 80%
    expect(wrapper.html()).toContain('text-red-600') // 50%
  })

  it('renders progress bar with correct color', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.html()).toContain('bg-green-500')
    expect(wrapper.html()).toContain('bg-amber-500')
    expect(wrapper.html()).toContain('bg-red-500')
  })

  it('highlights row at highlightedIndex', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions, highlightedIndex: 1 }
    })
    
    const rows = wrapper.findAll('tbody tr')
    expect(rows[1].classes()).toContain('bg-blue-50')
  })

  it('displays version number', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.text()).toContain('6.0.0')
    expect(wrapper.text()).toContain('3.2.0')
    expect(wrapper.text()).toContain('5.1.0')
  })

  it('displays relative time for updated_at', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.text()).toContain('2 hours ago')
  })

  it('shows sort indicators in headers', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    // Name is sorted by default (ascending)
    expect(wrapper.html()).toContain('↑')
    // Other columns show ↕
    expect(wrapper.html()).toContain('↕')
  })

  it('has dark mode classes', () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:text-gray-100')
    expect(wrapper.html()).toContain('dark:border-gray-700')
  })

  it('sorts by version when header clicked', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    const versionHeader = wrapper.findAll('th').find(th => th.text().includes('Version'))
    await versionHeader?.trigger('click')
    
    // Should be sorted by version
    expect(wrapper.exists()).toBe(true)
  })

  it('sorts by builds/total when header clicked', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    const buildsHeader = wrapper.findAll('th').find(th => th.text().includes('Builds'))
    await buildsHeader?.trigger('click')
    
    // Should be sorted by total
    expect(wrapper.exists()).toBe(true)
  })

  it('sorts by updated_at when header clicked', async () => {
    const wrapper = mount(ListView, {
      props: { extensions: mockExtensions }
    })
    
    const updatedHeader = wrapper.findAll('th').find(th => th.text().includes('Updated'))
    await updatedHeader?.trigger('click')
    
    // Should be sorted by updated_at
    expect(wrapper.exists()).toBe(true)
  })
})
