import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'

// Mock useDarkMode with callable functions
const mockToggle = vi.fn()
const mockIsDark = ref(false)

vi.mock('@/composables/useDarkMode', () => ({
  useDarkMode: () => ({
    isDark: mockIsDark,
    toggle: mockToggle
  })
}))

describe('AppHeader', () => {
  const defaultProps = {
    title: 'PHP Extension Build Dashboard',
    subtitle: 'Build status overview'
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockIsDark.value = false
  })

  it('renders title and subtitle', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    expect(wrapper.text()).toContain('PHP Extension Build Dashboard')
    expect(wrapper.text()).toContain('Build status overview')
  })

  it('shows extension count badge when provided', () => {
    const wrapper = mount(AppHeader, {
      props: { ...defaultProps, extensionCount: 42 }
    })
    
    expect(wrapper.text()).toContain('42 extensions')
  })

  it('hides extension count badge when not provided', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    expect(wrapper.text()).not.toContain('extensions')
  })

  it('emits toggle-sidebar event when mobile menu button is clicked', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    const menuButton = wrapper.find('button[aria-label="Toggle filters"]')
    await menuButton.trigger('click')
    
    expect(wrapper.emitted('toggle-sidebar')).toBeTruthy()
  })

  it('renders dark mode toggle button', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    const buttons = wrapper.findAll('button')
    const darkModeButton = buttons.find(b => b.attributes('title')?.includes('mode'))
    
    expect(darkModeButton).toBeDefined()
  })

  it('renders GitHub link', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    const githubLink = wrapper.find('a[href*="github.com"]')
    
    expect(githubLink.exists()).toBe(true)
    expect(githubLink.attributes('target')).toBe('_blank')
    expect(githubLink.attributes('rel')).toBe('noopener')
  })

  it('shows keyboard shortcuts hint on large screens', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    expect(wrapper.text()).toContain('/')
    expect(wrapper.text()).toContain('search')
  })

  it('has dark mode classes', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:text-white')
    expect(wrapper.html()).toContain('dark:border-gray-700')
  })

  it('renders logo icon', () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    const logoContainer = wrapper.find('.bg-gradient-to-br')
    expect(logoContainer.exists()).toBe(true)
    expect(logoContainer.find('svg').exists()).toBe(true)
  })

  it('calls toggle when dark mode button is clicked', async () => {
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    const darkModeButton = wrapper.findAll('button').find(b => b.attributes('title')?.includes('mode'))
    await darkModeButton?.trigger('click')
    
    expect(mockToggle).toHaveBeenCalled()
  })

  it('shows sun icon when in dark mode', async () => {
    mockIsDark.value = true
    const wrapper = mount(AppHeader, { props: defaultProps })
    
    // Look for the sun icon path (has specific d attribute from heroicons)
    expect(wrapper.html()).toContain('M12 3v2.25m6.364.386')
  })
})
