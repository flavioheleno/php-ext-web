import { reactive, ref, watch } from 'vue'
import type { Filters, LatestData, LatestExtension, ProcessedExtension, BuildResult, Metadata } from '@/types'

const state = reactive({
  filters: {
    os: [], phpVersion: [], arch: [], extension: [], status: 'all', search: '',
  } as Filters,
  currentView: 'list' as 'grid' | 'list',
  selectedExtension: null as string | null,
})

const buildCache = ref(new Map<string, BuildResult[]>())
const pendingBuilds = new Map<string, Promise<BuildResult[]>>()
const filterParams = { os: 'os', phpVersion: 'php', arch: 'arch', extension: 'ext' } as const
let filterOptions: Partial<Record<keyof typeof filterParams, string[]>> = {}

function syncToUrl() {
  const params = new URLSearchParams()
  for (const [key, param] of Object.entries(filterParams)) {
    const values = state.filters[key as keyof typeof filterParams]
    if (values === null) params.set(param, '')
    else if (values.length) params.set(param, values.join(','))
  }
  if (state.filters.search) params.set('q', state.filters.search)
  if (state.filters.status !== 'all') params.set('status', state.filters.status)
  if (state.currentView !== 'list') params.set('view', state.currentView)
  if (state.selectedExtension) params.set('detail', state.selectedExtension)
  const query = params.toString()
  window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
}

function loadFromUrl() {
  const params = new URLSearchParams(window.location.search)
  for (const [key, param] of Object.entries(filterParams)) {
    if (params.has(param)) {
      state.filters[key as keyof typeof filterParams] = params.get(param) ? params.get(param)!.split(',') : null
    }
  }
  state.filters.search = params.get('q') || ''
  const status = params.get('status')
  if (status === 'success' || status === 'failure') state.filters.status = status
  if (params.get('view') === 'grid') state.currentView = 'grid'
  state.selectedExtension = params.get('detail')
}

loadFromUrl()
watch(() => [state.filters, state.currentView, state.selectedExtension], syncToUrl, { deep: true })

export function filterBuilds(builds: BuildResult[], filters: Filters): BuildResult[] {
  const matches = (values: string[] | null, value: string) =>
    values !== null && (!values.length || values.includes(value))
  return builds.filter(build => matches(filters.os, `${build.platform}|${build.platform_version}`)
    && matches(filters.phpVersion, build.php_version) && matches(filters.arch, build.arch))
}

export function useStore() {
  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    const options = filterOptions[key as keyof typeof filterParams]
    state.filters[key] = value
    if (Array.isArray(value) && options?.length && options.every(option => value.includes(option))) {
      state.filters[key as keyof typeof filterParams] = []
    }
  }

  function clearFilters() {
    state.filters = { os: [], phpVersion: [], arch: [], extension: [], status: 'all', search: '' }
  }

  function setView(view: 'grid' | 'list') {
    state.currentView = view
  }

  function setSelectedExtension(name: string | null) {
    state.selectedExtension = name
  }

  function loadBuilds(path: string): Promise<BuildResult[]> {
    const cached = buildCache.value.get(path)
    if (cached) return Promise.resolve(cached)
    const pending = pendingBuilds.get(path)
    if (pending) return pending
    const request = (async () => {
      try {
        const response = await fetch(`data/${path}`)
        if (!response.ok) throw new Error(`Could not load build results (${response.status}). Try again.`)
        const builds: BuildResult[] = await response.json()
        buildCache.value.set(path, builds)
        return builds
      } finally {
        pendingBuilds.delete(path)
      }
    })()
    pendingBuilds.set(path, request)
    return request
  }

  function processExtensions(latest: LatestData | null, _extensions: Record<string, unknown> = {}): ProcessedExtension[] {
    if (!latest) return []
    return Object.entries(latest).filter(([name]) => name !== '_meta').map(([name, data]) => {
      const ext = data as LatestExtension
      return {
        name, version: ext.version, updated_at: ext.updated_at,
        pass: ext.pass, fail: ext.fail, total: ext.total, path: ext.path,
        successRate: ext.success_rate ?? (ext.total ? Math.round(ext.pass / ext.total * 100) : 0),
        builds: buildCache.value.get(ext.path),
      }
    })
  }

  function needsBuildsLoaded(filters: Filters = state.filters): boolean {
    return [filters.os, filters.phpVersion, filters.arch].some(values => !!values?.length)
  }

  function filterExtensions(extensions: ProcessedExtension[], filters: Filters = state.filters): ProcessedExtension[] {
    if ([filters.os, filters.phpVersion, filters.arch, filters.extension].includes(null)) return []
    return extensions
      .filter(ext => (!filters.search || ext.name.toLowerCase().includes(filters.search.toLowerCase()))
        && (!filters.extension?.length || filters.extension.includes(ext.name)))
      .flatMap(ext => {
        let scoped = ext
        if (needsBuildsLoaded(filters)) {
          if (!ext.builds) return []
          const builds = filterBuilds(ext.builds, filters)
          if (!builds.length) return []
          const pass = builds.filter(build => build.status === 'success').length
          scoped = {
            ...ext, builds, pass, fail: builds.length - pass, total: builds.length,
            successRate: Math.round(pass / builds.length * 100),
          }
        }
        if (filters.status === 'success' && (scoped.fail > 0 || scoped.total === 0)) return []
        if (filters.status === 'failure' && scoped.fail === 0) return []
        return [scoped]
      })
  }

  function getStats(extensions: ProcessedExtension[]) {
    const stats = { total: 0, pass: 0, fail: 0, successRate: 0 }
    for (const ext of extensions) {
      stats.total += ext.total
      stats.pass += ext.pass
      stats.fail += ext.fail
    }
    if (stats.total) stats.successRate = Math.round(stats.pass / stats.total * 100)
    return stats
  }

  function initializeFilters(metadata: Metadata) {
    filterOptions = {
      os: Object.entries(metadata.osVersions).flatMap(([os, data]) => data.versions.map(version => `${os}|${version}`)),
      phpVersion: Object.keys(metadata.phpVersions),
      arch: metadata.architectures,
      extension: Object.keys(metadata.extensions),
    }
    for (const key of Object.keys(filterParams) as (keyof typeof filterParams)[]) {
      setFilter(key, state.filters[key])
    }
  }

  return {
    state, buildCache, setFilter, clearFilters, setView, setSelectedExtension,
    loadBuilds, processExtensions, filterExtensions,
    filterBuilds: (builds: BuildResult[]) => filterBuilds(builds, state.filters),
    getStats, needsBuildsLoaded, initializeFilters,
  }
}
