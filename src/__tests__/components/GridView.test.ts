import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GridView from '@/components/GridView.vue'
import type { ProcessedExtension, Metadata, LatestData } from '@/types'

describe('GridView', () => {
  const mockMetadata: Metadata = {
    osVersions: {
      alpine: { versions: ['3.19', '3.20'] },
      debian: { versions: ['bookworm'] }
    },
    phpVersions: {
      '8.3': { tag: '8.3.0', branch: 'PHP-8.3' }
    },
    architectures: ['amd64', 'arm64'],
    extensions: {}
  }

  const mockLatest: LatestData = {
    redis: { version: '6.0.0', pass: 10, fail: 0, total: 10, path: 'redis/6.0.0.json', updated_at: '2024-01-01' }
  }

  const mockExtensions: ProcessedExtension[] = [
    { name: 'redis', version: '6.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '2024-01-15' },
    { name: 'memcached', version: '3.2.0', pass: 8, fail: 2, total: 10, successRate: 80, path: '', updated_at: '2024-01-14' },
    { name: 'apcu', version: '5.1.0', pass: 0, fail: 10, total: 10, successRate: 0, path: '', updated_at: '2024-01-13' },
    { name: 'empty', version: '1.0.0', pass: 0, fail: 0, total: 0, successRate: 0, path: '', updated_at: '2024-01-12' },
  ]

  const defaultProps = {
    extensions: mockExtensions,
    metadata: mockMetadata,
    latest: mockLatest
  }

  it('renders empty state when no extensions', () => {
    const wrapper = mount(GridView, {
      props: { extensions: [], metadata: mockMetadata, latest: mockLatest }
    })
    
    expect(wrapper.text()).toContain('No extensions found')
    expect(wrapper.text()).toContain('Try adjusting your filters or search query')
  })

  it('renders table with extensions', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.find('table').exists()).toBe(true)
    expect(wrapper.text()).toContain('redis')
    expect(wrapper.text()).toContain('memcached')
    expect(wrapper.text()).toContain('apcu')
  })

  it('renders OS version columns from metadata', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.text()).toContain('alpine')
    expect(wrapper.text()).toContain('debian')
    expect(wrapper.text()).toContain('3.19')
    expect(wrapper.text()).toContain('3.20')
    expect(wrapper.text()).toContain('bookworm')
  })

  it('emits select-extension when extension name is clicked', async () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    const button = wrapper.findAll('button').find(b => b.text().includes('redis'))
    await button?.trigger('click')
    
    expect(wrapper.emitted('select-extension')).toBeTruthy()
    expect(wrapper.emitted('select-extension')![0]).toEqual(['redis'])
  })

  it('shows checkmark for 100% success rate', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    // redis has 100% success rate
    expect(wrapper.text()).toContain('✓')
  })

  it('shows X for 0% success rate (all failures)', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    // apcu has 0% success rate
    expect(wrapper.text()).toContain('✗')
  })

  it('shows percentage for mixed results', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    // memcached has 80% success rate
    expect(wrapper.text()).toContain('80%')
  })

  it('shows dash for extensions with no builds', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    // empty has no builds
    expect(wrapper.text()).toContain('—')
  })

  it('applies correct CSS class for success', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('bg-green-500')
  })

  it('applies correct CSS class for failure', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('bg-red-500')
  })

  it('applies gradient class for mixed results', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('bg-gradient-to-br')
  })

  it('displays extension versions', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.text()).toContain('v6.0.0')
    expect(wrapper.text()).toContain('v3.2.0')
  })

  it('has tooltip with extension info', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    const buttons = wrapper.findAll('button[title]')
    const tooltips = buttons.map(b => b.attributes('title'))
    
    expect(tooltips.some(t => t?.includes('redis'))).toBe(true)
    expect(tooltips.some(t => t?.includes('passed'))).toBe(true)
  })

  it('has dark mode classes', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:text-gray-100')
    expect(wrapper.html()).toContain('dark:border-gray-700')
  })

  it('handles null metadata gracefully', () => {
    const wrapper = mount(GridView, {
      props: { extensions: mockExtensions, metadata: null, latest: mockLatest }
    })
    
    expect(wrapper.exists()).toBe(true)
    // Should still render extensions column
    expect(wrapper.text()).toContain('redis')
  })

  it('has sticky extension column', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('sticky')
    expect(wrapper.html()).toContain('left-0')
  })
})
