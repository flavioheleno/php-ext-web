import { ref, type Ref } from 'vue'
import type { LatestData, Metadata, OsVersions, PhpVersions, Extensions } from '@/types'

const cache = new Map<string, { data: unknown; timestamp: number }>()
const TTL = 5 * 60 * 1000 // 5 minutes

async function fetchJSON<T>(path: string): Promise<T> {
  const cached = cache.get(path)
  if (cached && Date.now() - cached.timestamp < TTL) {
    return cached.data as T
  }

  const response = await fetch(`data/${path}`)
  if (!response.ok) {
    throw new Error(`Failed to load ${path}: ${response.status}`)
  }
  const data = await response.json()
  cache.set(path, { data, timestamp: Date.now() })
  return data
}

export function useDataLoader() {
  const metadata: Ref<Metadata | null> = ref(null)
  const latest: Ref<LatestData | null> = ref(null)
  const loading = ref(true)
  const error: Ref<string | null> = ref(null)

  async function loadMetadata(): Promise<Metadata> {
    const [osVersions, phpVersions, extensions] = await Promise.all([
      fetchJSON<OsVersions>('os-versions.json'),
      fetchJSON<PhpVersions>('php-versions.json'),
      fetchJSON<Extensions>('extensions.json'),
    ])

    return {
      osVersions,
      phpVersions,
      extensions: extensions.extensions || {},
      architectures: extensions.architectures || [],
    }
  }

  async function loadLatest(): Promise<LatestData> {
    return fetchJSON<LatestData>('latest.json')
  }

  async function initialize() {
    try {
      loading.value = true
      error.value = null
      
      const [meta, lat] = await Promise.all([loadMetadata(), loadLatest()])
      metadata.value = meta
      latest.value = lat
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load data'
      console.error('Failed to initialize:', e)
    } finally {
      loading.value = false
    }
  }

  return {
    metadata,
    latest,
    loading,
    error,
    initialize,
  }
}
