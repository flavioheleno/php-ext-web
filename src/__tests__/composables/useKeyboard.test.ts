import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useKeyboard } from '@/composables/useKeyboard'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'

describe('useKeyboard', () => {
  let keydownHandler: (e: KeyboardEvent) => void
  
  beforeEach(() => {
    // Capture the event listener
    vi.spyOn(document, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'keydown') {
        keydownHandler = handler as (e: KeyboardEvent) => void
      }
    })
    vi.spyOn(document, 'removeEventListener')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  function mountWithKeyboard(options: Parameters<typeof useKeyboard>[0]) {
    return mount(defineComponent({
      setup() {
        useKeyboard(options)
        return () => h('div')
      }
    }))
  }

  function createKeyEvent(key: string, target?: Partial<HTMLElement>): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { key, bubbles: true })
    Object.defineProperty(event, 'target', {
      value: target || { tagName: 'DIV', isContentEditable: false },
      writable: false,
    })
    Object.defineProperty(event, 'preventDefault', {
      value: vi.fn(),
      writable: false,
    })
    return event
  }

  it('registers keydown listener on mount', () => {
    mountWithKeyboard({})
    expect(document.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('removes keydown listener on unmount', () => {
    const wrapper = mountWithKeyboard({})
    wrapper.unmount()
    expect(document.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('calls onSearch when "/" is pressed', () => {
    const onSearch = vi.fn()
    mountWithKeyboard({ onSearch })
    
    const event = createKeyEvent('/')
    keydownHandler(event)
    
    expect(onSearch).toHaveBeenCalled()
    expect(event.preventDefault).toHaveBeenCalled()
  })

  it('calls onEscape when Escape is pressed', () => {
    const onEscape = vi.fn()
    mountWithKeyboard({ onEscape })
    
    const event = createKeyEvent('Escape')
    keydownHandler(event)
    
    expect(onEscape).toHaveBeenCalled()
  })

  it('calls onNext when "j" is pressed', () => {
    const onNext = vi.fn()
    mountWithKeyboard({ onNext })
    
    const event = createKeyEvent('j')
    keydownHandler(event)
    
    expect(onNext).toHaveBeenCalled()
  })

  it('calls onPrev when "k" is pressed', () => {
    const onPrev = vi.fn()
    mountWithKeyboard({ onPrev })
    
    const event = createKeyEvent('k')
    keydownHandler(event)
    
    expect(onPrev).toHaveBeenCalled()
  })

  it('calls onEnter when Enter is pressed', () => {
    const onEnter = vi.fn()
    mountWithKeyboard({ onEnter })
    
    const event = createKeyEvent('Enter')
    keydownHandler(event)
    
    expect(onEnter).toHaveBeenCalled()
  })

  it('ignores keystrokes when typing in INPUT', () => {
    const onSearch = vi.fn()
    const onNext = vi.fn()
    mountWithKeyboard({ onSearch, onNext })
    
    const event = createKeyEvent('/', { tagName: 'INPUT', isContentEditable: false } as HTMLElement)
    keydownHandler(event)
    
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('ignores keystrokes when typing in TEXTAREA', () => {
    const onSearch = vi.fn()
    mountWithKeyboard({ onSearch })
    
    const event = createKeyEvent('/', { tagName: 'TEXTAREA', isContentEditable: false } as HTMLElement)
    keydownHandler(event)
    
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('ignores keystrokes in contentEditable elements', () => {
    const onSearch = vi.fn()
    mountWithKeyboard({ onSearch })
    
    const event = createKeyEvent('/', { tagName: 'DIV', isContentEditable: true } as HTMLElement)
    keydownHandler(event)
    
    expect(onSearch).not.toHaveBeenCalled()
  })

  it('allows Escape in INPUT to blur and call handler', () => {
    const onEscape = vi.fn()
    mountWithKeyboard({ onEscape })
    
    const blur = vi.fn()
    const target = { tagName: 'INPUT', isContentEditable: false, blur } as unknown as HTMLInputElement
    const event = createKeyEvent('Escape', target)
    keydownHandler(event)
    
    expect(blur).toHaveBeenCalled()
    expect(onEscape).toHaveBeenCalled()
  })
})
