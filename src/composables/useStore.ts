import { reactive, ref, watch } from 'vue'
import type { Filters, LatestData, ProcessedExtension, BuildResult } from '@/types'

const state = reactive({
  filters: {
    os: [] as string[],
    phpVersion: [] as string[],
    arch: [] as string[],
    extension: [] as string[],
    status: 'all' as 'all' | 'success' | 'failure',
    search: '',
  } as Filters,
  currentView: 'list' as 'grid' | 'list',
  selectedExtension: null as string | null,
})

// Cache for loaded build reports
const buildCache = ref<Map<string, BuildResult[]>>(new Map())
const loadingBuilds = ref<Set<string>>(new Set())

// Sync state to URL
function syncToUrl() {
  const params = new URLSearchParams()
  
  if (state.filters.search) params.set('q', state.filters.search)
  if (state.filters.os.length) params.set('os', state.filters.os.join(','))
  if (state.filters.phpVersion.length) params.set('php', state.filters.phpVersion.join(','))
  if (state.filters.arch.length) params.set('arch', state.filters.arch.join(','))
  if (state.filters.extension.length) params.set('ext', state.filters.extension.join(','))
  if (state.filters.status !== 'all') params.set('status', state.filters.status)
  if (state.currentView !== 'list') params.set('view', state.currentView)
  if (state.selectedExtension) params.set('detail', state.selectedExtension)
  
  const query = params.toString()
  const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname
  window.history.replaceState({}, '', newUrl)
}

// Load state from URL
function loadFromUrl() {
  const params = new URLSearchParams(window.location.search)
  
  const search = params.get('q')
  const os = params.get('os')
  const php = params.get('php')
  const arch = params.get('arch')
  const ext = params.get('ext')
  const status = params.get('status')
  const view = params.get('view')
  const detail = params.get('detail')
  
  if (search) state.filters.search = search
  if (os) state.filters.os = os.split(',')
  if (php) state.filters.phpVersion = php.split(',')
  if (arch) state.filters.arch = arch.split(',')
  if (ext) state.filters.extension = ext.split(',')
  if (status === 'success' || status === 'failure') state.filters.status = status
  if (view === 'grid' || view === 'list') state.currentView = view
  if (detail) state.selectedExtension = detail
}

// Initialize from URL on load
loadFromUrl()

// Watch for state changes and sync to URL
watch(
  () => [state.filters, state.currentView, state.selectedExtension],
  () => syncToUrl(),
  { deep: true }
)

export function useStore() {
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    state.filters[key] = value
  }

  function clearFilters() {
    state.filters = {
      os: [],
      phpVersion: [],
      arch: [],
      extension: [],
      status: 'all',
      search: '',
    }
  }

  function setView(view: 'grid' | 'list') {
    state.currentView = view
  }

  function setSelectedExtension(name: string | null) {
    state.selectedExtension = name
  }

  async function loadBuilds(path: string): Promise<BuildResult[]> {
    if (buildCache.value.has(path)) {
      return buildCache.value.get(path)!
    }
    
    if (loadingBuilds.value.has(path)) {
      // Wait for existing load to complete
      while (loadingBuilds.value.has(path)) {
        await new Promise(resolve => setTimeout(resolve, 50))
      }
      return buildCache.value.get(path) || []
    }
    
    loadingBuilds.value.add(path)
    try {
      const response = await fetch(`/data/${path}`)
      if (!response.ok) throw new Error('Failed to load builds')
      const builds = await response.json()
      buildCache.value.set(path, builds)
      return builds
    } catch {
      return []
    } finally {
      loadingBuilds.value.delete(path)
    }
  }

  function processExtensions(latest: LatestData | null, _extensions: Record<string, unknown> = {}): ProcessedExtension[] {
    if (!latest) return []

    return Object.entries(latest).map(([name, data]) => ({
      name,
      version: data.version,
      updated_at: data.updated_at,
      pass: data.pass,
      fail: data.fail,
      total: data.total,
      successRate: data.total > 0 ? Math.round((data.pass / data.total) * 100) : 0,
      path: data.path,
      builds: buildCache.value.get(data.path),
    }))
  }

  function filterBuilds(builds: BuildResult[]): BuildResult[] {
    return builds.filter((build) => {
      // OS filter (format: "platform|platform_version")
      if (state.filters.os.length > 0) {
        const osKey = `${build.platform}|${build.platform_version}`
        if (!state.filters.os.includes(osKey)) {
          return false
        }
      }
      
      // PHP version filter
      if (state.filters.phpVersion.length > 0) {
        if (!state.filters.phpVersion.includes(build.php_version)) {
          return false
        }
      }
      
      // Architecture filter
      if (state.filters.arch.length > 0) {
        if (!state.filters.arch.includes(build.arch)) {
          return false
        }
      }
      
      // Status filter
      if (state.filters.status === 'success' && build.status !== 'success') {
        return false
      }
      if (state.filters.status === 'failure' && build.status !== 'failure') {
        return false
      }
      
      return true
    })
  }

  function filterExtensions(extensions: ProcessedExtension[]): ProcessedExtension[] {
    const hasDetailFilters = state.filters.os.length > 0 || 
                             state.filters.phpVersion.length > 0 || 
                             state.filters.arch.length > 0

    return extensions
      .filter((ext) => {
        // Search filter
        if (state.filters.search && !ext.name.toLowerCase().includes(state.filters.search.toLowerCase())) {
          return false
        }
        // Extension name filter
        if (state.filters.extension.length > 0 && !state.filters.extension.includes(ext.name)) {
          return false
        }
        return true
      })
      .map((ext) => {
        // If no detail filters, just apply status filter at extension level
        if (!hasDetailFilters) {
          if (state.filters.status === 'success' && ext.fail > 0) return null
          if (state.filters.status === 'failure' && ext.fail === 0) return null
          return ext
        }
        
        // If we have detail filters, we need builds loaded
        if (!ext.builds) {
          // Builds not loaded yet - extension will be shown after loading
          return ext
        }
        
        const filteredBuilds = filterBuilds(ext.builds)
        if (filteredBuilds.length === 0) return null
        
        const pass = filteredBuilds.filter(b => b.status === 'success').length
        const fail = filteredBuilds.filter(b => b.status === 'failure').length
        
        return {
          ...ext,
          pass,
          fail,
          total: filteredBuilds.length,
          successRate: filteredBuilds.length > 0 ? Math.round((pass / filteredBuilds.length) * 100) : 0,
          builds: filteredBuilds,
        }
      })
      .filter((ext): ext is ProcessedExtension => ext !== null)
  }

  function getStats(extensions: ProcessedExtension[]) {
    const stats = { total: 0, pass: 0, fail: 0, successRate: 0 }
    
    for (const ext of extensions) {
      stats.total += ext.total
      stats.pass += ext.pass
      stats.fail += ext.fail
    }
    
    if (stats.total > 0) {
      stats.successRate = Math.round((stats.pass / stats.total) * 100)
    }
    
    return stats
  }

  // Check if we need to load builds for filtering
  function needsBuildsLoaded(): boolean {
    return state.filters.os.length > 0 || 
           state.filters.phpVersion.length > 0 || 
           state.filters.arch.length > 0
  }

  return {
    state,
    buildCache,
    setFilter,
    clearFilters,
    setView,
    setSelectedExtension,
    loadBuilds,
    processExtensions,
    filterExtensions,
    filterBuilds,
    getStats,
    needsBuildsLoaded,
  }
}
