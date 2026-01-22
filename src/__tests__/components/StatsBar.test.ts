import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatsBar from '@/components/StatsBar.vue'

describe('StatsBar', () => {
  const defaultProps = {
    total: 100,
    pass: 80,
    fail: 20,
    successRate: 80,
    currentView: 'list' as const,
    search: ''
  }

  it('renders all stats correctly', () => {
    const wrapper = mount(StatsBar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('100')
    expect(wrapper.text()).toContain('80')
    expect(wrapper.text()).toContain('20')
    expect(wrapper.text()).toContain('80%')
  })

  it('formats large numbers with locale string', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, total: 1000000 }
    })
    
    expect(wrapper.text()).toContain('1,000,000')
  })

  it('applies green color class for high success rate (>=90%)', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, successRate: 95 }
    })
    
    expect(wrapper.html()).toContain('text-green-600')
  })

  it('applies amber color class for medium success rate (70-89%)', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, successRate: 75 }
    })
    
    expect(wrapper.html()).toContain('text-amber-600')
  })

  it('applies red color class for low success rate (<70%)', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, successRate: 50 }
    })
    
    expect(wrapper.html()).toContain('text-red-600')
  })

  it('renders grid view button as active when currentView is grid', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, currentView: 'grid' }
    })
    
    const buttons = wrapper.findAll('button')
    const gridButton = buttons[0]
    const listButton = buttons[1]
    
    expect(gridButton.classes()).toContain('bg-white')
    expect(listButton.classes()).not.toContain('bg-white')
  })

  it('renders list view button as active when currentView is list', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, currentView: 'list' }
    })
    
    const buttons = wrapper.findAll('button')
    const gridButton = buttons[0]
    const listButton = buttons[1]
    
    expect(listButton.classes()).toContain('bg-white')
    expect(gridButton.classes()).not.toContain('bg-white')
  })

  it('emits update:view event when grid button is clicked', async () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, currentView: 'list' }
    })
    
    const buttons = wrapper.findAll('button')
    await buttons[0].trigger('click')
    
    expect(wrapper.emitted('update:view')).toBeTruthy()
    expect(wrapper.emitted('update:view')![0]).toEqual(['grid'])
  })

  it('emits update:view event when list button is clicked', async () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, currentView: 'grid' }
    })
    
    const buttons = wrapper.findAll('button')
    await buttons[1].trigger('click')
    
    expect(wrapper.emitted('update:view')).toBeTruthy()
    expect(wrapper.emitted('update:view')![0]).toEqual(['list'])
  })

  it('renders SVG progress ring with correct stroke color', () => {
    const wrapper = mount(StatsBar, {
      props: { ...defaultProps, successRate: 95 }
    })
    
    const circle = wrapper.findAll('circle')[1]
    expect(circle.attributes('stroke')).toBe('#22c55e')
  })

  it('has dark mode classes', () => {
    const wrapper = mount(StatsBar, { props: defaultProps })
    
    expect(wrapper.html()).toContain('dark:bg-gray-900')
    expect(wrapper.html()).toContain('dark:border-gray-700')
    expect(wrapper.html()).toContain('dark:text-white')
  })

  it('renders search input', () => {
    const wrapper = mount(StatsBar, { props: defaultProps })
    
    expect(wrapper.find('input[type="search"]').exists()).toBe(true)
    expect(wrapper.find('input[type="search"]').attributes('placeholder')).toBe('Search extensions...')
  })

  it('emits update:search when search input changes', async () => {
    const wrapper = mount(StatsBar, { props: defaultProps })
    
    const searchInput = wrapper.find('input[type="search"]')
    await searchInput.setValue('redis')
    
    expect(wrapper.emitted('update:search')).toBeTruthy()
    expect(wrapper.emitted('update:search')![0]).toEqual(['redis'])
  })

  it('renders labels correctly', () => {
    const wrapper = mount(StatsBar, { props: defaultProps })
    
    expect(wrapper.text()).toContain('Total')
    expect(wrapper.text()).toContain('Passed')
    expect(wrapper.text()).toContain('Failed')
    expect(wrapper.text()).toContain('Success')
  })
})
