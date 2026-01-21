import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import GridView from '@/components/GridView.vue'
import type { ProcessedExtension, Metadata, LatestData, Filters, BuildResult } from '@/types'

describe('GridView', () => {
  const mockMetadata: Metadata = {
    osVersions: {
      alpine: { versions: ['3.19', '3.20'] },
      debian: { versions: ['bookworm'] }
    },
    phpVersions: {
      '8.3': { tag: '8.3.0', branch: 'PHP-8.3' },
      '8.4': { tag: '8.4.0', branch: 'PHP-8.4' }
    },
    architectures: ['amd64', 'arm64'],
    extensions: {}
  }

  const mockLatest: LatestData = {
    redis: { version: '6.0.0', pass: 10, fail: 0, total: 10, path: 'redis/6.0.0.json', updated_at: '2024-01-01' }
  }

  const mockFilters: Filters = {
    os: ['alpine|3.19', 'alpine|3.20', 'debian|bookworm'],
    phpVersion: ['8.3', '8.4'],
    arch: ['amd64', 'arm64'],
    extension: [],
    status: 'all',
    search: ''
  }

  // Mock builds for testing status display
  const mockBuilds: BuildResult[] = [
    { extension: 'redis', extension_version: '6.0.0', channel: 'release', php_version: '8.3', platform: 'alpine', platform_version: '3.19', arch: 'amd64', status: 'success', started_at: '', finished_at: '', workflow_run_id: 1, run_attempt: 1, git_sha: '', log_url: '', asset_name: '' },
    { extension: 'redis', extension_version: '6.0.0', channel: 'release', php_version: '8.3', platform: 'alpine', platform_version: '3.19', arch: 'arm64', status: 'failure', started_at: '', finished_at: '', workflow_run_id: 1, run_attempt: 1, git_sha: '', log_url: '', asset_name: '' },
  ]

  const mockExtensions: ProcessedExtension[] = [
    { name: 'redis', version: '6.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '2024-01-15', builds: mockBuilds },
    { name: 'memcached', version: '3.2.0', pass: 8, fail: 2, total: 10, successRate: 80, path: '', updated_at: '2024-01-14' },
    { name: 'apcu', version: '5.1.0', pass: 0, fail: 10, total: 10, successRate: 0, path: '', updated_at: '2024-01-13' },
  ]

  const defaultProps = {
    extensions: mockExtensions,
    metadata: mockMetadata,
    latest: mockLatest,
    filters: mockFilters
  }

  it('renders empty state when no extensions', () => {
    const wrapper = mount(GridView, {
      props: { extensions: [], metadata: mockMetadata, latest: mockLatest, filters: mockFilters }
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

  it('renders PHP version rows', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.text()).toContain('8.3')
    expect(wrapper.text()).toContain('8.4')
  })

  it('renders architecture labels in footer', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.text()).toContain('amd64')
    expect(wrapper.text()).toContain('arm64')
  })

  it('emits select-extension when extension name is clicked', async () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    const button = wrapper.findAll('button').find(b => b.text().includes('redis'))
    await button?.trigger('click')
    
    expect(wrapper.emitted('select-extension')).toBeTruthy()
    expect(wrapper.emitted('select-extension')![0]).toEqual(['redis'])
  })

  it('applies correct CSS class for success', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('bg-green-500')
  })

  it('applies correct CSS class for failure', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('bg-red-500')
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
  })

  it('has dark mode classes', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:text-gray-100')
    expect(wrapper.html()).toContain('dark:border-gray-700')
  })

  it('handles null metadata gracefully', () => {
    const wrapper = mount(GridView, {
      props: { extensions: mockExtensions, metadata: null, latest: mockLatest, filters: mockFilters }
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

  it('has PHP column header', () => {
    const wrapper = mount(GridView, { props: defaultProps })
    
    expect(wrapper.text()).toContain('PHP')
  })

  it('respects OS filter for column visibility', () => {
    const filteredProps = {
      ...defaultProps,
      filters: { ...mockFilters, os: ['alpine|3.19'] }
    }
    const wrapper = mount(GridView, { props: filteredProps })
    
    expect(wrapper.text()).toContain('3.19')
    expect(wrapper.text()).not.toContain('3.20')
    expect(wrapper.text()).not.toContain('bookworm')
  })

  it('respects PHP filter for row visibility', () => {
    const filteredProps = {
      ...defaultProps,
      filters: { ...mockFilters, phpVersion: ['8.4'] }
    }
    const wrapper = mount(GridView, { props: filteredProps })
    
    expect(wrapper.text()).toContain('8.4')
    expect(wrapper.text()).not.toContain('8.3')
  })

  it('respects architecture filter for column visibility', () => {
    const filteredProps = {
      ...defaultProps,
      filters: { ...mockFilters, arch: ['amd64'] }
    }
    const wrapper = mount(GridView, { props: filteredProps })
    
    // Footer should only show amd64
    const footer = wrapper.find('tfoot')
    expect(footer.text()).toContain('amd64')
    expect(footer.text()).not.toContain('arm64')
  })
})
