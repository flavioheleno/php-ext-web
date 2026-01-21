import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import ErrorBoundary from '@/components/ErrorBoundary.vue'
import { defineComponent, h, inject } from 'vue'

describe('ErrorBoundary', () => {
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    addEventListenerSpy = vi.spyOn(window, 'addEventListener')
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders slot content when no error', () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="child">Content</div>'
      }
    })
    
    expect(wrapper.find('.child').exists()).toBe(true)
    expect(wrapper.text()).toContain('Content')
  })

  it('displays error message when error occurs', async () => {
    const wrapper = mount(ErrorBoundary)
    
    const { handleError } = wrapper.vm as unknown as { handleError: (e: Error) => void }
    handleError(new Error('Test error'))
    
    await flushPromises()
    
    expect(wrapper.text()).toContain('Something went wrong')
    expect(wrapper.text()).toContain('Test error')
  })

  it('reset clears error and shows slot content again', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="child">Content</div>'
      }
    })
    
    const vm = wrapper.vm as unknown as { handleError: (e: Error) => void; reset: () => void }
    vm.handleError(new Error('Test error'))
    
    await flushPromises()
    expect(wrapper.find('.child').exists()).toBe(false)
    
    vm.reset()
    await flushPromises()
    
    expect(wrapper.find('.child').exists()).toBe(true)
  })

  it('provides error handler to children', () => {
    let injectedHandler: unknown
    
    const ChildComponent = defineComponent({
      setup() {
        injectedHandler = inject('errorHandler')
        return () => h('div', 'Child')
      }
    })
    
    mount(ErrorBoundary, {
      slots: {
        default: () => h(ChildComponent)
      }
    })
    
    expect(typeof injectedHandler).toBe('function')
  })

  it('registers global error handlers on mount', () => {
    mount(ErrorBoundary)
    
    expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })

  it('removes global error handlers on unmount', () => {
    const wrapper = mount(ErrorBoundary)
    wrapper.unmount()
    
    expect(removeEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function))
    expect(removeEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function))
  })

  it('shows Try Again button that calls reset', async () => {
    const wrapper = mount(ErrorBoundary, {
      slots: {
        default: '<div class="child">Content</div>'
      }
    })
    
    const { handleError } = wrapper.vm as unknown as { handleError: (e: Error) => void }
    handleError(new Error('Test error'))
    
    await flushPromises()
    
    const tryAgainButton = wrapper.findAll('button').find(b => b.text().includes('Try Again'))
    expect(tryAgainButton).toBeDefined()
    
    await tryAgainButton!.trigger('click')
    await flushPromises()
    
    expect(wrapper.find('.child').exists()).toBe(true)
  })

  it('shows technical details in expandable section', async () => {
    const wrapper = mount(ErrorBoundary)
    
    const error = new Error('Test error')
    error.stack = 'Error stack trace'
    
    const { handleError } = wrapper.vm as unknown as { handleError: (e: Error) => void }
    handleError(error)
    
    await flushPromises()
    
    expect(wrapper.find('details').exists()).toBe(true)
    expect(wrapper.find('pre').text()).toContain('Error stack trace')
  })

  it('has dark mode classes', async () => {
    const wrapper = mount(ErrorBoundary)
    
    const { handleError } = wrapper.vm as unknown as { handleError: (e: Error) => void }
    handleError(new Error('Test error'))
    
    await flushPromises()
    
    expect(wrapper.html()).toContain('dark:bg-red-900')
    expect(wrapper.html()).toContain('dark:text-gray-100')
  })
})
