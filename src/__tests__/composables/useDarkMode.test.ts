import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest'

// Create a mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} }),
    get length() { return Object.keys(store).length },
    key: vi.fn((i: number) => Object.keys(store)[i] || null),
  }
})()

// Mock matchMedia
const matchMediaMock = vi.fn().mockImplementation(() => ({
  matches: false,
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}))

describe('useDarkMode', () => {
  beforeAll(() => {
    vi.stubGlobal('localStorage', localStorageMock)
    vi.stubGlobal('matchMedia', matchMediaMock)
  })

  afterAll(() => {
    vi.unstubAllGlobals()
  })

  it('returns isDark ref and functions', async () => {
    vi.resetModules()
    const { useDarkMode } = await import('@/composables/useDarkMode')
    const result = useDarkMode()
    
    expect(result.isDark).toBeDefined()
    expect(typeof result.toggle).toBe('function')
  })

  it('toggle function is callable', async () => {
    vi.resetModules()
    const { useDarkMode } = await import('@/composables/useDarkMode')
    const { toggle, isDark } = useDarkMode()
    
    expect(typeof toggle).toBe('function')
    toggle()
    expect(typeof isDark.value).toBe('boolean')
  })

})
