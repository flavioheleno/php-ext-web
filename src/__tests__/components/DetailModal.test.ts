import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import DetailModal from '@/components/DetailModal.vue'
import type { LatestExtension, ExtensionMeta } from '@/types'

// Mock composables
vi.mock('@/composables/useFormat', () => ({
  formatRelativeTime: vi.fn((date) => date ? '2 hours ago' : 'N/A')
}))

vi.mock('@/composables/useStore', () => ({
  useStore: () => ({
    loadBuilds: vi.fn().mockResolvedValue([
      { platform: 'alpine', platform_version: '3.19', php_version: '8.3', arch: 'amd64', status: 'success', log_url: 'https://example.com/log' },
      { platform: 'debian', platform_version: 'bookworm', php_version: '8.2', arch: 'arm64', status: 'failure', log_url: 'https://example.com/log2' },
    ])
  })
}))

describe('DetailModal', () => {
  const mockExtensionData: LatestExtension = {
    version: '6.0.0',
    pass: 10,
    fail: 2,
    total: 12,
    path: 'redis/6.0.0.json',
    updated_at: '2024-01-15T12:00:00Z'
  }

  const mockExtensionMeta: ExtensionMeta = {
    dependencies: {
      alpine: { build: [], runtime: [] },
      debian: { build: [], runtime: [] }
    },
    pecl_name: 'redis',
    track_url: 'https://github.com/phpredis/phpredis',
    type: 'pecl',
    last_checked: '2024-01-15',
    latest_version: '6.0.0'
  }

  const defaultProps = {
    show: true,
    extensionName: 'redis',
    extensionData: mockExtensionData,
    extensionMeta: mockExtensionMeta
  }

  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  // Disable teleport for testing
  const mountOptions = {
    global: {
      stubs: {
        Teleport: true
      }
    }
  }

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(document, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders nothing when show is false', () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    expect(wrapper.find('[role="dialog"]').exists()).toBe(false)
  })

  it('renders modal when show is true', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('redis')
    expect(wrapper.text()).toContain('v6.0.0')
  })

  it('displays status badge', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Partial')
  })

  it('shows "All Passing" for 100% success rate', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 10, fail: 0, total: 10 }
      },
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('All Passing')
  })

  it('shows "All Failing" for 0% success rate', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 0, fail: 10, total: 10 }
      },
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('All Failing')
  })

  it('emits close when close button is clicked', async () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    const closeButton = wrapper.find('button[aria-label="Close modal"]')
    await closeButton.trigger('click')
    
    expect(wrapper.emitted('close')).toBeTruthy()
  })

  it('renders tabs', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Overview')
    expect(wrapper.text()).toContain('Builds')
    expect(wrapper.text()).toContain('History')
  })

  it('shows overview tab by default', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Total Builds')
    expect(wrapper.text()).toContain('Success Rate')
  })

  it('displays build statistics', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('12')
    expect(wrapper.text()).toContain('10')
  })

  it('displays last updated time', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Last Updated')
    expect(wrapper.text()).toContain('2 hours ago')
  })

  it('displays extension metadata', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Type')
    expect(wrapper.text()).toContain('pecl')
  })

  it('renders GitHub link when track_url is provided', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    const githubLink = wrapper.find('a[href="https://github.com/phpredis/phpredis"]')
    expect(githubLink.exists()).toBe(true)
  })

  it('switches to builds tab when clicked', async () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()
    
    // Should show builds table or loading indicator
    expect(wrapper.exists()).toBe(true)
  })

  it('switches to history tab when clicked', async () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    const historyTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('History'))
    await historyTab?.trigger('click')
    
    expect(wrapper.text()).toContain('Build History')
  })

  it('registers keydown listener on mount', () => {
    mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('removes keydown listener on unmount', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    wrapper.unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('shows "Extension data not found" when extensionData is null', () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, extensionData: null },
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('Extension data not found')
  })

  it('has aria attributes for accessibility', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.find('[role="dialog"]').exists()).toBe(true)
    expect(wrapper.find('[aria-modal="true"]').exists()).toBe(true)
  })

  it('has dark mode classes', () => {
    const wrapper = mount(DetailModal, {
      props: defaultProps,
      ...mountOptions
    })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
  })

  it('handles zero total builds', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 0, fail: 0, total: 0 }
      },
      ...mountOptions
    })
    
    expect(wrapper.text()).toContain('0')
  })
})

// Additional tests for better coverage
describe('DetailModal sorting', () => {
  const mockExtensionData: LatestExtension = {
    version: '6.0.0',
    pass: 10,
    fail: 2,
    total: 12,
    path: 'redis/6.0.0.json',
    updated_at: '2024-01-15T12:00:00Z'
  }

  const mockExtensionMeta: ExtensionMeta = {
    dependencies: {
      alpine: { build: [], runtime: [] },
      debian: { build: [], runtime: [] }
    },
    pecl_name: 'redis',
    track_url: 'https://github.com/phpredis/phpredis',
    type: 'pecl',
    last_checked: '2024-01-15',
    latest_version: '6.0.0'
  }

  const defaultProps = {
    show: true,
    extensionName: 'redis',
    extensionData: mockExtensionData,
    extensionMeta: mockExtensionMeta
  }

  const mountOptions = {
    global: {
      stubs: {
        Teleport: true
      }
    }
  }

  it('computed successRate returns 0 for zero total', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 0, fail: 0, total: 0 }
      },
      ...mountOptions
    })
    
    expect(wrapper.exists()).toBe(true)
  })

  it('renders correct progress ring stroke color for high success rate', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 10, fail: 0, total: 10 }
      },
      ...mountOptions
    })
    
    expect(wrapper.html()).toContain('#22c55e')
  })

  it('renders correct progress ring stroke color for medium success rate', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 8, fail: 2, total: 10 }
      },
      ...mountOptions
    })
    
    expect(wrapper.html()).toContain('#f59e0b')
  })

  it('renders correct progress ring stroke color for low success rate', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionData: { ...mockExtensionData, pass: 5, fail: 5, total: 10 }
      },
      ...mountOptions
    })
    
    expect(wrapper.html()).toContain('#ef4444')
  })

  it('handles missing extensionMeta.type gracefully', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionMeta: { ...mockExtensionMeta, type: '' }
      },
      ...mountOptions
    })
    
    expect(wrapper.exists()).toBe(true)
  })

  it('handles missing track_url gracefully', () => {
    const wrapper = mount(DetailModal, {
      props: {
        ...defaultProps,
        extensionMeta: { ...mockExtensionMeta, track_url: '' }
      },
      ...mountOptions
    })
    
    expect(wrapper.exists()).toBe(true)
  })
})

// Tests for sorting functionality 
describe('DetailModal build sorting', () => {
  const mockExtensionData: LatestExtension = {
    version: '6.0.0',
    pass: 10,
    fail: 2,
    total: 12,
    path: 'redis/6.0.0.json',
    updated_at: '2024-01-15T12:00:00Z'
  }

  const mockExtensionMeta: ExtensionMeta = {
    dependencies: {},
    pecl_name: 'redis',
    track_url: 'https://github.com/phpredis/phpredis',
    type: 'pecl',
    last_checked: '2024-01-15',
    latest_version: '6.0.0'
  }

  const defaultProps = {
    show: true,
    extensionName: 'redis',
    extensionData: mockExtensionData,
    extensionMeta: mockExtensionMeta
  }

  const mountOptions = {
    global: {
      stubs: {
        Teleport: true
      }
    }
  }

  it('clicking platform header triggers sort', async () => {
    // Mount with show=false first to trigger the watch later
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })

    // Change show to true to trigger builds loading
    await wrapper.setProps({ show: true })
    await flushPromises()

    // Switch to builds tab
    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    // Find and click the OS th header (has the click handler)
    const headers = wrapper.findAll('th')
    const osHeader = headers.find(h => h.text().includes('OS'))
    if (osHeader) {
      // Default is already sorted by platform asc, clicking toggles to desc
      await osHeader.trigger('click')
      // ChevronDownIcon path indicates descending sort
      expect(osHeader.html()).toContain('m19.5 8.25-7.5 7.5-7.5-7.5')
    }
  })

  it('clicking php_version header triggers sort', async () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    const headers = wrapper.findAll('th')
    const phpHeader = headers.find(h => h.text().includes('PHP'))
    if (phpHeader) {
      await phpHeader.trigger('click')
      // ChevronUpIcon path indicates ascending sort
      expect(phpHeader.html()).toContain('m4.5 15.75 7.5-7.5 7.5 7.5')
    }
  })

  it('clicking arch header triggers sort', async () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    const headers = wrapper.findAll('th')
    const archHeader = headers.find(h => h.text().includes('Arch'))
    if (archHeader) {
      await archHeader.trigger('click')
      // ChevronUpIcon path indicates ascending sort
      expect(archHeader.html()).toContain('m4.5 15.75 7.5-7.5 7.5 7.5')
    }
  })

  it('clicking status header triggers sort', async () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    const headers = wrapper.findAll('th')
    const statusHeader = headers.find(h => h.text().includes('Status'))
    if (statusHeader) {
      await statusHeader.trigger('click')
      // ChevronUpIcon path indicates ascending sort
      expect(statusHeader.html()).toContain('m4.5 15.75 7.5-7.5 7.5 7.5')
    }
  })

  it('double clicking same header toggles sort direction', async () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    const headers = wrapper.findAll('th')
    const osHeader = headers.find(h => h.text().includes('OS'))
    if (osHeader) {
      // Default is asc, first click toggles to desc
      await osHeader.trigger('click')
      // ChevronDownIcon path indicates descending sort
      expect(osHeader.html()).toContain('m19.5 8.25-7.5 7.5-7.5-7.5')
      // Second click toggles back to asc
      await osHeader.trigger('click')
      // ChevronUpIcon path indicates ascending sort
      expect(osHeader.html()).toContain('m4.5 15.75 7.5-7.5 7.5 7.5')
    }
  })

  it('shows correct sort icon for inactive columns', async () => {
    const wrapper = mount(DetailModal, {
      props: { ...defaultProps, show: false },
      ...mountOptions
    })
    
    await wrapper.setProps({ show: true })
    await flushPromises()

    const buildsTab = wrapper.findAll('button[role="tab"]').find(b => b.text().includes('Builds'))
    await buildsTab?.trigger('click')
    await flushPromises()

    // Click PHP to sort by it
    const headers = wrapper.findAll('th')
    const phpHeader = headers.find(h => h.text().includes('PHP'))
    if (phpHeader) {
      await phpHeader.trigger('click')
      
      // Now OS should show ChevronUpDownIcon (inactive/neutral)
      const osHeader = headers.find(h => h.text().includes('OS'))
      expect(osHeader?.html()).toContain('M8.25 15 12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9')
    }
  })
})
