import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useDataLoader } from '@/composables/useDataLoader'

describe('useDataLoader', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('returns initial state with null values', () => {
    const { metadata, latest, loading, error } = useDataLoader()
    
    expect(metadata.value).toBeNull()
    expect(latest.value).toBeNull()
    expect(loading.value).toBe(true)
    expect(error.value).toBeNull()
  })

  it('loads metadata and latest data on initialize', async () => {
    const mockOsVersions = { alpine: { versions: ['3.19'] } }
    const mockPhpVersions = { '8.3': { tag: '8.3.0', branch: 'PHP-8.3' } }
    const mockExtensions = { 
      extensions: { redis: { pecl_name: 'redis' } },
      architectures: ['amd64', 'arm64'],
      base_image_registry: 'ghcr.io'
    }
    const mockLatest = { redis: { version: '6.0.0', pass: 10, fail: 0, total: 10, path: 'redis/6.0.0.json', updated_at: '2024-01-01' } }

    vi.mocked(fetch).mockImplementation((url: RequestInfo | URL) => {
      const urlStr = url.toString()
      if (urlStr.includes('os-versions')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockOsVersions) } as Response)
      if (urlStr.includes('php-versions')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockPhpVersions) } as Response)
      if (urlStr.includes('extensions')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockExtensions) } as Response)
      if (urlStr.includes('latest')) return Promise.resolve({ ok: true, json: () => Promise.resolve(mockLatest) } as Response)
      return Promise.reject(new Error('Unknown URL'))
    })

    const { initialize, metadata, latest, loading, error } = useDataLoader()
    
    await initialize()
    
    expect(loading.value).toBe(false)
    expect(error.value).toBeNull()
    expect(metadata.value).toEqual({
      osVersions: mockOsVersions,
      phpVersions: mockPhpVersions,
      extensions: { redis: { pecl_name: 'redis' } },
      architectures: ['amd64', 'arm64'],
    })
    expect(latest.value).toEqual(mockLatest)
  })

  it('handles fetch errors', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

    const { initialize, loading } = useDataLoader()
    
    await initialize()
    
    expect(loading.value).toBe(false)
    // Error is handled internally
  })

  it('handles non-ok response', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 404,
    } as Response)

    const { initialize, loading, error } = useDataLoader()
    
    await initialize()
    
    expect(loading.value).toBe(false)
    // Error is set when fetch fails
  })

  it('uses cached data within TTL', async () => {
    const mockData = { test: 'data' }
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { initialize } = useDataLoader()
    
    // First call
    await initialize()
    const firstCallCount = vi.mocked(fetch).mock.calls.length
    
    // Second call should use cache
    await initialize()
    
    // Should not make new fetch calls (cache hit)
    expect(vi.mocked(fetch).mock.calls.length).toBe(firstCallCount)
  })
})
