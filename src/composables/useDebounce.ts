import { ref, watch } from 'vue'
import type { Ref } from 'vue'

export function useDebouncedRef<T>(value: T, delay = 300): Ref<T> {
  const debouncedValue = ref(value) as Ref<T>
  let timeout: ReturnType<typeof setTimeout> | null = null

  return {
    get value() {
      return debouncedValue.value
    },
    set value(newValue: T) {
      if (timeout) {
        clearTimeout(timeout)
      }
      timeout = setTimeout(() => {
        debouncedValue.value = newValue
      }, delay)
    }
  } as Ref<T>
}

export function useDebounce<T extends (...args: any[]) => any>(
  fn: T,
  delay = 300
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      fn(...args)
    }, delay)
  }
}

export function useDebouncedWatch<T>(
  source: Ref<T>,
  callback: (value: T) => void,
  delay = 300
) {
  let timeout: ReturnType<typeof setTimeout> | null = null

  watch(source, (newValue) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(() => {
      callback(newValue)
    }, delay)
  })
}
