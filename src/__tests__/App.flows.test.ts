import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import App from '@/App.vue'
import { useStore } from '@/composables/useStore'

vi.mock('@/composables/useDataLoader', async () => {
  const { ref } = await import('vue')
  return {
    useDataLoader: () => ({
      metadata: ref({
        osVersions: { alpine: { versions: ['3.22'] } },
        phpVersions: { '8.3': { tag: '8.3', branch: 'PHP-8.3' } },
        architectures: ['amd64', 'arm64'],
        extensions: {},
      }),
      latest: ref({
        redis: { version: '6.3.0', updated_at: '2026-02-14', pass: 1, fail: 1, total: 2, path: 'redis.json' },
        zstd: { version: '0.18.0', updated_at: '2026-02-14', pass: 2, fail: 0, total: 2, path: 'zstd.json' },
      }),
      loading: ref(false), error: ref(null), initialize: vi.fn(),
    }),
  }
})

describe('dashboard flows', () => {
  let wrapper: ReturnType<typeof mount> | undefined
  const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')

  beforeEach(() => {
    const { clearFilters, state, buildCache } = useStore()
    clearFilters()
    state.currentView = 'list'
    state.selectedExtension = null
    buildCache.value.clear()
    vi.stubGlobal('fetch', vi.fn())
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: vi.fn() })
  })

  afterEach(() => {
    wrapper?.unmount()
    vi.unstubAllGlobals()
    if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', scrollDescriptor)
    else Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
  })

  it('does not fetch detailed reports for the initial list and focuses the displayed sorted row', async () => {
    wrapper = mount(App, { attachTo: document.body })
    await flushPromises()
    expect(fetch).not.toHaveBeenCalled()
    await wrapper.find('table th button').trigger('click')
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'j', bubbles: true }))
    await flushPromises()
    expect(document.activeElement?.textContent).toBe('zstd')
    expect(wrapper.find('tbody tr').text()).toContain('zstd')
  })

  it('shows failed-report feedback and retries instead of presenting no-data cells', async () => {
    vi.mocked(fetch).mockResolvedValue(new Response('', { status: 503 }))
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      wrapper = mount(App)
      await wrapper.find('button[aria-label="Grid view"]').trigger('click')
      await flushPromises()
      expect(wrapper.find('[role="alert"]').text()).toContain('Could not load 2 build reports')
      expect(wrapper.find('table[aria-label="Extension build matrix"]').exists()).toBe(false)
      vi.mocked(fetch).mockImplementation(async () => new Response('[]', { status: 200 }))
      await wrapper.find('[role="alert"] button').trigger('click')
      await flushPromises()
      expect(wrapper.find('[role="alert"]').exists()).toBe(false)
      expect(wrapper.find('table[aria-label="Extension build matrix"]').exists()).toBe(true)
      expect(fetch).toHaveBeenCalledTimes(4)
    } finally {
      consoleError.mockRestore()
    }
  })
})
