import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebounce } from '@/composables/useDebounce'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('useDebounce', () => {
    it('debounces function calls', () => {
      const fn = vi.fn()
      const debouncedFn = useDebounce(fn, 100)
      
      debouncedFn('arg1')
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledWith('arg1')
      expect(fn).toHaveBeenCalledTimes(1)
    })

    it('cancels previous call on rapid invocations', () => {
      const fn = vi.fn()
      const debouncedFn = useDebounce(fn, 100)
      
      debouncedFn('first')
      vi.advanceTimersByTime(50)
      debouncedFn('second')
      vi.advanceTimersByTime(50)
      debouncedFn('third')
      
      vi.advanceTimersByTime(100)
      expect(fn).toHaveBeenCalledTimes(1)
      expect(fn).toHaveBeenCalledWith('third')
    })

    it('uses default delay of 300ms', () => {
      const fn = vi.fn()
      const debouncedFn = useDebounce(fn)
      
      debouncedFn()
      vi.advanceTimersByTime(299)
      expect(fn).not.toHaveBeenCalled()
      
      vi.advanceTimersByTime(1)
      expect(fn).toHaveBeenCalled()
    })
  })

})
