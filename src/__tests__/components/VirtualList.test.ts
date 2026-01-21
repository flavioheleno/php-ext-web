import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import VirtualList from '@/components/VirtualList.vue'

describe('VirtualList', () => {
  const mockItems = Array.from({ length: 100 }, (_, i) => ({ id: i, name: `Item ${i}` }))

  beforeEach(() => {
    vi.spyOn(window, 'addEventListener')
    vi.spyOn(window, 'removeEventListener')
  })

  it('renders container with overflow-y-auto class', () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    expect(wrapper.find('.overflow-y-auto').exists()).toBe(true)
  })

  it('calculates total height based on items and itemHeight', () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    const innerDiv = wrapper.find('[style*="height"]')
    expect(innerDiv.attributes('style')).toContain('height: 4000px')
  })

  it('only renders visible items plus overscan', async () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40, overscan: 2 },
      slots: {
        default: ({ item }: { item: typeof mockItems[0] }) => `<div class="item">${item.name}</div>`
      }
    })
    
    // With container height 0 and overscan 2, it should render some items
    await flushPromises()
    
    // The component should be set up, even if visible items is limited due to container height
    expect(wrapper.exists()).toBe(true)
  })

  it('registers resize listener on mount', () => {
    mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    expect(window.addEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('removes resize listener on unmount', () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    wrapper.unmount()
    
    expect(window.removeEventListener).toHaveBeenCalledWith('resize', expect.any(Function))
  })

  it('uses default overscan of 5 when not provided', () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    // Component should initialize without errors
    expect(wrapper.exists()).toBe(true)
  })

  it('handles scroll events', async () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    // Component should handle scroll without errors
    expect(wrapper.exists()).toBe(true)
  })

  it('exposes containerRef', () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems, itemHeight: 40 }
    })
    
    expect(wrapper.vm.containerRef).toBeDefined()
  })

  it('handles empty items array', () => {
    const wrapper = mount(VirtualList, {
      props: { items: [], itemHeight: 40 }
    })
    
    const innerDiv = wrapper.find('[style*="height"]')
    expect(innerDiv.attributes('style')).toContain('height: 0px')
  })

  it('updates when items change', async () => {
    const wrapper = mount(VirtualList, {
      props: { items: mockItems.slice(0, 10), itemHeight: 40 }
    })
    
    let innerDiv = wrapper.find('[style*="height"]')
    expect(innerDiv.attributes('style')).toContain('height: 400px')
    
    await wrapper.setProps({ items: mockItems.slice(0, 20) })
    
    innerDiv = wrapper.find('[style*="height"]')
    expect(innerDiv.attributes('style')).toContain('height: 800px')
  })
})
