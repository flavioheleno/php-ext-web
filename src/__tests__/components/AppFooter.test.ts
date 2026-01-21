import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { mount } from '@vue/test-utils'
import AppFooter from '@/components/AppFooter.vue'

// Mock useFormat
vi.mock('@/composables/useFormat', () => ({
  formatRelativeTime: vi.fn((date) => date ? '2 hours ago' : 'N/A')
}))

describe('AppFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows last updated when provided', () => {
    const wrapper = mount(AppFooter, {
      props: { lastUpdated: '2024-01-15T12:00:00Z' }
    })
    
    expect(wrapper.text()).toContain('Last updated:')
    expect(wrapper.text()).toContain('2 hours ago')
  })

  it('hides last updated when not provided', () => {
    const wrapper = mount(AppFooter, { props: {} })
    
    expect(wrapper.text()).not.toContain('Last updated:')
  })

  it('shows keyboard shortcuts on large screens', () => {
    const wrapper = mount(AppFooter, { props: {} })
    
    expect(wrapper.text()).toContain('/')
    expect(wrapper.text()).toContain('search')
    expect(wrapper.text()).toContain('j')
    expect(wrapper.text()).toContain('k')
    expect(wrapper.text()).toContain('navigate')
    expect(wrapper.text()).toContain('esc')
    expect(wrapper.text()).toContain('close')
  })

  it('renders author link', () => {
    const wrapper = mount(AppFooter, { props: {} })
    
    const authorLink = wrapper.find('a[href*="flavioheleno.com"]')
    
    expect(authorLink.exists()).toBe(true)
    expect(authorLink.attributes('target')).toBe('_blank')
    expect(authorLink.attributes('rel')).toBe('noopener')
    expect(authorLink.text()).toContain('Flavio Heleno')
  })

  it('has dark mode classes', () => {
    const wrapper = mount(AppFooter, { props: {} })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:border-gray-700')
    expect(wrapper.html()).toContain('dark:text-gray-400')
  })
})
