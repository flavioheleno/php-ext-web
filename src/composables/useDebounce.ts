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
