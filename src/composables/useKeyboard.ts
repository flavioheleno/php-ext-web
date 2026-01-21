import { onMounted, onUnmounted } from 'vue'

interface KeyboardOptions {
  onSearch?: () => void
  onEscape?: () => void
  onNext?: () => void
  onPrev?: () => void
  onEnter?: () => void
}

export function useKeyboard(options: KeyboardOptions) {
  function handleKeydown(e: KeyboardEvent) {
    // Ignore if typing in an input
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      if (e.key === 'Escape' && options.onEscape) {
        (target as HTMLInputElement).blur()
        options.onEscape()
      }
      return
    }

    switch (e.key) {
      case '/':
        e.preventDefault()
        options.onSearch?.()
        break
      case 'Escape':
        options.onEscape?.()
        break
      case 'j':
        options.onNext?.()
        break
      case 'k':
        options.onPrev?.()
        break
      case 'Enter':
        options.onEnter?.()
        break
    }
  }

  onMounted(() => {
    document.addEventListener('keydown', handleKeydown)
  })

  onUnmounted(() => {
    document.removeEventListener('keydown', handleKeydown)
  })
}
