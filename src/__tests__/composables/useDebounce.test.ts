import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDebouncedRef, useDebounce, useDebouncedWatch } from '@/composables/useDebounce'
import { ref, nextTick } from 'vue'

describe('useDebounce', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('useDebouncedRef', () => {
    it('returns initial value immediately', () => {
      const debouncedValue = useDebouncedRef('initial')
      expect(debouncedValue.value).toBe('initial')
    })

    it('debounces value changes', async () => {
      const debouncedValue = useDebouncedRef('initial', 100)
      
      debouncedValue.value = 'updated'
      expect(debouncedValue.value).toBe('initial')
      
      vi.advanceTimersByTime(50)
      expect(debouncedValue.value).toBe('initial')
      
      vi.advanceTimersByTime(50)
      expect(debouncedValue.value).toBe('updated')
    })

    it('cancels previous timeout on rapid changes', () => {
      const debouncedValue = useDebouncedRef('initial', 100)
      
      debouncedValue.value = 'first'
      vi.advanceTimersByTime(50)
      debouncedValue.value = 'second'
      vi.advanceTimersByTime(50)
      debouncedValue.value = 'third'
      
      expect(debouncedValue.value).toBe('initial')
      
      vi.advanceTimersByTime(100)
      expect(debouncedValue.value).toBe('third')
    })
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

  describe('useDebouncedWatch', () => {
    it('debounces watch callback', async () => {
      const source = ref('initial')
      const callback = vi.fn()
      
      useDebouncedWatch(source, callback, 100)
      
      source.value = 'updated'
      await vi.runAllTimersAsync()
      expect(callback).toHaveBeenCalledWith('updated')
    })

    it('cancels previous callback on rapid changes', async () => {
      const source = ref('initial')
      const callback = vi.fn()
      
      useDebouncedWatch(source, callback, 100)
      
      source.value = 'first'
      vi.advanceTimersByTime(50)
      source.value = 'second'
      vi.advanceTimersByTime(50)
      source.value = 'third'
      
      await vi.runAllTimersAsync()
      expect(callback).toHaveBeenCalledWith('third')
    })
  })
})
