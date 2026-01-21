import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useStore } from '@/composables/useStore'
import type { ProcessedExtension, BuildResult } from '@/types'

describe('useStore', () => {
  beforeEach(() => {
    // Clear URL params
    window.history.replaceState({}, '', '/')
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('state management', () => {
    it('has initial state with empty filters', () => {
      const { state } = useStore()
      
      expect(state.filters.os).toEqual([])
      expect(state.filters.phpVersion).toEqual([])
      expect(state.filters.arch).toEqual([])
      expect(state.filters.extension).toEqual([])
      expect(state.filters.status).toBe('all')
      expect(state.filters.search).toBe('')
      expect(state.currentView).toBe('list')
      expect(state.selectedExtension).toBeNull()
    })

    it('setFilter updates filter values', () => {
      const { state, setFilter } = useStore()
      
      setFilter('os', ['alpine|3.19'])
      expect(state.filters.os).toEqual(['alpine|3.19'])
      
      setFilter('phpVersion', ['8.3'])
      expect(state.filters.phpVersion).toEqual(['8.3'])
      
      setFilter('search', 'redis')
      expect(state.filters.search).toBe('redis')
    })

    it('clearFilters resets all filters', () => {
      const { state, setFilter, clearFilters } = useStore()
      
      setFilter('os', ['alpine|3.19'])
      setFilter('search', 'redis')
      setFilter('status', 'success')
      
      clearFilters()
      
      expect(state.filters.os).toEqual([])
      expect(state.filters.search).toBe('')
      expect(state.filters.status).toBe('all')
    })

    it('setView changes current view', () => {
      const { state, setView } = useStore()
      
      setView('grid')
      expect(state.currentView).toBe('grid')
      
      setView('list')
      expect(state.currentView).toBe('list')
    })

    it('setSelectedExtension updates selection', () => {
      const { state, setSelectedExtension } = useStore()
      
      setSelectedExtension('redis')
      expect(state.selectedExtension).toBe('redis')
      
      setSelectedExtension(null)
      expect(state.selectedExtension).toBeNull()
    })
  })

  describe('processExtensions', () => {
    it('returns empty array for null latest data', () => {
      const { processExtensions } = useStore()
      
      expect(processExtensions(null)).toEqual([])
    })

    it('processes latest data into extensions array', () => {
      const { processExtensions } = useStore()
      
      const latest = {
        redis: { version: '6.0.0', pass: 8, fail: 2, total: 10, path: 'redis/6.0.0.json', updated_at: '2024-01-01' },
        memcached: { version: '3.2.0', pass: 10, fail: 0, total: 10, path: 'memcached/3.2.0.json', updated_at: '2024-01-01' },
      }
      
      const result = processExtensions(latest)
      
      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('redis')
      expect(result[0].successRate).toBe(80)
      expect(result[1].name).toBe('memcached')
      expect(result[1].successRate).toBe(100)
    })

    it('calculates success rate correctly', () => {
      const { processExtensions } = useStore()
      
      const latest = {
        test: { version: '1.0.0', pass: 3, fail: 1, total: 4, path: 'test/1.0.0.json', updated_at: '2024-01-01' },
      }
      
      const result = processExtensions(latest)
      expect(result[0].successRate).toBe(75)
    })

    it('handles zero total builds', () => {
      const { processExtensions } = useStore()
      
      const latest = {
        empty: { version: '1.0.0', pass: 0, fail: 0, total: 0, path: 'empty/1.0.0.json', updated_at: '2024-01-01' },
      }
      
      const result = processExtensions(latest)
      expect(result[0].successRate).toBe(0)
    })
  })

  describe('filterExtensions', () => {
    it('filters by search term', () => {
      const { filterExtensions, setFilter } = useStore()
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
        { name: 'memcached', version: '3.2.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
      ]
      
      setFilter('search', 'redis')
      const result = filterExtensions(extensions)
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('redis')
    })

    it('filters by extension name', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
        { name: 'memcached', version: '3.2.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
      ]
      
      setFilter('extension', ['memcached'])
      const result = filterExtensions(extensions)
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('memcached')
    })

    it('filters by status when no detail filters', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      const extensions: ProcessedExtension[] = [
        { name: 'passing', version: '1.0.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
        { name: 'failing', version: '1.0.0', pass: 5, fail: 5, total: 10, successRate: 50, path: '', updated_at: '' },
      ]
      
      setFilter('status', 'failure')
      const result = filterExtensions(extensions)
      
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('failing')
    })
  })

  describe('filterBuilds', () => {
    const mockBuilds: BuildResult[] = [
      { extension: 'redis', extension_version: '6.0.0', channel: 'stable', php_version: '8.3', platform: 'alpine', platform_version: '3.19', arch: 'amd64', status: 'success', started_at: '', finished_at: '', workflow_run_id: 1, run_attempt: 1, git_sha: '', log_url: '', asset_name: '' },
      { extension: 'redis', extension_version: '6.0.0', channel: 'stable', php_version: '8.2', platform: 'debian', platform_version: 'bookworm', arch: 'arm64', status: 'failure', started_at: '', finished_at: '', workflow_run_id: 2, run_attempt: 1, git_sha: '', log_url: '', asset_name: '' },
    ]

    it('filters by OS', () => {
      const { filterBuilds, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('os', ['alpine|3.19'])
      const result = filterBuilds(mockBuilds)
      
      expect(result).toHaveLength(1)
      expect(result[0].platform).toBe('alpine')
    })

    it('filters by PHP version', () => {
      const { filterBuilds, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('phpVersion', ['8.3'])
      const result = filterBuilds(mockBuilds)
      
      expect(result).toHaveLength(1)
      expect(result[0].php_version).toBe('8.3')
    })

    it('filters by architecture', () => {
      const { filterBuilds, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('arch', ['arm64'])
      const result = filterBuilds(mockBuilds)
      
      expect(result).toHaveLength(1)
      expect(result[0].arch).toBe('arm64')
    })

    it('filters by status', () => {
      const { filterBuilds, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('status', 'success')
      const result = filterBuilds(mockBuilds)
      
      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('success')
    })

    it('returns all builds when no filters applied', () => {
      const { filterBuilds, clearFilters } = useStore()
      clearFilters()
      
      const result = filterBuilds(mockBuilds)
      expect(result).toHaveLength(2)
    })
  })

  describe('getStats', () => {
    it('calculates aggregate stats', () => {
      const { getStats } = useStore()
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 8, fail: 2, total: 10, successRate: 80, path: '', updated_at: '' },
        { name: 'memcached', version: '3.2.0', pass: 10, fail: 0, total: 10, successRate: 100, path: '', updated_at: '' },
      ]
      
      const stats = getStats(extensions)
      
      expect(stats.total).toBe(20)
      expect(stats.pass).toBe(18)
      expect(stats.fail).toBe(2)
      expect(stats.successRate).toBe(90)
    })

    it('returns zero stats for empty array', () => {
      const { getStats } = useStore()
      
      const stats = getStats([])
      
      expect(stats.total).toBe(0)
      expect(stats.pass).toBe(0)
      expect(stats.fail).toBe(0)
      expect(stats.successRate).toBe(0)
    })
  })

  describe('needsBuildsLoaded', () => {
    it('returns true when OS filter is set', () => {
      const { needsBuildsLoaded, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('os', ['alpine|3.19'])
      expect(needsBuildsLoaded()).toBe(true)
    })

    it('returns true when PHP version filter is set', () => {
      const { needsBuildsLoaded, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('phpVersion', ['8.3'])
      expect(needsBuildsLoaded()).toBe(true)
    })

    it('returns true when arch filter is set', () => {
      const { needsBuildsLoaded, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('arch', ['amd64'])
      expect(needsBuildsLoaded()).toBe(true)
    })

    it('returns false when no detail filters set', () => {
      const { needsBuildsLoaded, clearFilters } = useStore()
      clearFilters()
      
      expect(needsBuildsLoaded()).toBe(false)
    })
  })

  describe('loadBuilds', () => {
    it('fetches and caches builds', async () => {
      const mockBuilds = [{ status: 'success' }]
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBuilds),
      } as Response)

      const { loadBuilds, buildCache } = useStore()
      
      const result = await loadBuilds('redis/6.0.0.json')
      
      expect(result).toEqual(mockBuilds)
      expect(buildCache.value.has('redis/6.0.0.json')).toBe(true)
    })

    it('returns cached builds on subsequent calls', async () => {
      const mockBuilds = [{ status: 'success' }]
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve(mockBuilds),
      } as Response)

      const { loadBuilds } = useStore()
      
      await loadBuilds('redis/6.0.0.json')
      const fetchCount = vi.mocked(fetch).mock.calls.length
      
      await loadBuilds('redis/6.0.0.json')
      expect(vi.mocked(fetch).mock.calls.length).toBe(fetchCount)
    })

    it('returns empty array on fetch error', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
      } as Response)

      const { loadBuilds } = useStore()
      
      const result = await loadBuilds('nonexistent.json')
      expect(result).toEqual([])
    })
  })

  describe('filterExtensions with builds', () => {
    const mockBuilds: BuildResult[] = [
      { platform: 'alpine', platform_version: '3.19', php_version: '8.3', arch: 'amd64', status: 'success', log_url: '' },
      { platform: 'debian', platform_version: 'bookworm', php_version: '8.2', arch: 'arm64', status: 'failure', log_url: '' },
    ]

    it('filters extensions with loaded builds', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('os', ['alpine|3.19'])
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 2, fail: 0, total: 2, successRate: 100, path: '', updated_at: '', builds: mockBuilds }
      ]
      
      const result = filterExtensions(extensions)
      expect(result.length).toBe(1)
      // Should have filtered pass/fail based on builds
      expect(result[0].total).toBe(1)
    })

    it('returns extension without builds if not loaded yet', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('os', ['alpine|3.19'])
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 2, fail: 0, total: 2, successRate: 100, path: '', updated_at: '' } // no builds
      ]
      
      const result = filterExtensions(extensions)
      expect(result.length).toBe(1)
    })

    it('filters out extensions with no matching builds', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('os', ['ubuntu|22.04'])  // No match in mockBuilds
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 2, fail: 0, total: 2, successRate: 100, path: '', updated_at: '', builds: mockBuilds }
      ]
      
      const result = filterExtensions(extensions)
      expect(result.length).toBe(0)
    })

    it('filters extensions with PHP version filter', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('phpVersion', ['8.3'])
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 2, fail: 0, total: 2, successRate: 100, path: '', updated_at: '', builds: mockBuilds }
      ]
      
      const result = filterExtensions(extensions)
      expect(result.length).toBe(1)
      expect(result[0].total).toBe(1) // Only one build matches 8.3
    })

    it('filters extensions with arch filter', () => {
      const { filterExtensions, setFilter, clearFilters } = useStore()
      clearFilters()
      
      setFilter('arch', ['arm64'])
      
      const extensions: ProcessedExtension[] = [
        { name: 'redis', version: '6.0.0', pass: 2, fail: 0, total: 2, successRate: 100, path: '', updated_at: '', builds: mockBuilds }
      ]
      
      const result = filterExtensions(extensions)
      expect(result.length).toBe(1)
      expect(result[0].total).toBe(1) // Only one build matches arm64
    })
  })
})
