<script setup lang="ts">
import { computed, onUnmounted, ref, watch } from 'vue'
import { XMarkIcon, CheckIcon, ChevronUpDownIcon, ChevronUpIcon, ChevronDownIcon, ArrowTopRightOnSquareIcon, CubeIcon } from '@heroicons/vue/24/outline'
import { useDebounceFn } from '@vueuse/core'
import { formatRelativeTime, comparePhpVersions } from '@/composables/useFormat'
import { filterBuilds, useStore } from '@/composables/useStore'
import AppDialog from './AppDialog.vue'
import type { LatestExtension, ExtensionMeta, BuildResult, Filters } from '@/types'

interface HistoryDataPoint {
  snapshot_id: string
  trigger: string
  timestamp: string
  php_version: string
  success_rate: number
  pass: number
  fail: number
  total: number
  platforms: PlatformBreakdown[]
}

interface PlatformBreakdown {
  platform: string
  version: string
  architectures?: Record<string, 'success' | 'failure'>
  x86_64?: 'success' | 'failure'
  aarch64?: 'success' | 'failure'
}

// Pre-processed history file format
interface PhpVersionStats {
  pass: number
  fail: number
  total: number
  success_rate: number
}

interface HistorySnapshot {
  id: string
  date: string
  trigger: string
  php_versions: Record<string, PhpVersionStats>
  platforms: Record<string, PlatformBreakdown[]>
}

interface HistoryFile {
  extension: string
  version: string
  snapshots: HistorySnapshot[]
}

const props = defineProps<{
  show: boolean
  extensionName: string | null
  extensionData: LatestExtension | null
  extensionMeta: ExtensionMeta | null
  filters?: Filters
}>()

const emit = defineEmits<{
  close: []
}>()

const { loadBuilds } = useStore()
const builds = ref<BuildResult[]>([])
const loadingBuilds = ref(false)
const loadingHistory = ref(false)
const activeTab = ref<'overview' | 'builds' | 'history'>('overview')
const buildError = ref<string | null>(null)
const historyError = ref<string | null>(null)
const historyLoaded = ref(false)
const failedOnly = ref(false)
let loadGeneration = 0
const hasEnvironmentFilters = computed(() => props.filters
  && [props.filters.os, props.filters.phpVersion, props.filters.arch].some(values => values === null || values.length))
const scopedBuilds = computed(() => props.filters ? filterBuilds(builds.value, props.filters) : builds.value)
const summary = computed(() => {
  if (!props.extensionData || !hasEnvironmentFilters.value) return props.extensionData
  const pass = scopedBuilds.value.filter(build => build.status === 'success').length
  return { ...props.extensionData, pass, fail: scopedBuilds.value.length - pass, total: scopedBuilds.value.length }
})

// History data
const historyData = ref<HistoryDataPoint[]>([])
const selectedHistoryPoint = ref<HistoryDataPoint | null>(null)
const hoveredPoint = ref<{ php: string; index: number } | null>(null)
const hiddenPhpVersions = ref<Set<string>>(new Set())

function togglePhpVersion(phpVersion: string) {
  if (hiddenPhpVersions.value.has(phpVersion)) {
    hiddenPhpVersions.value.delete(phpVersion)
  } else {
    hiddenPhpVersions.value.add(phpVersion)
  }
  hiddenPhpVersions.value = new Set(hiddenPhpVersions.value) // trigger reactivity
}

// Debounce hover to reduce re-renders; leave goes through it too so a pending hover can't win
const setHoveredPoint = useDebounceFn((point: { php: string; index: number } | null) => {
  hoveredPoint.value = point
}, 50)

function handlePointHover(phpVersion: string, index: number) {
  setHoveredPoint({ php: phpVersion, index })
}

function handlePointLeave() {
  setHoveredPoint(null)
}

// Smart tooltip positioning
const tooltipWidth = 160
const tooltipHeight = 90

function getTooltipPosition(snapshotIndex: number, successRate: number) {
  const x = getChartX(snapshotIndex)
  const y = getChartY(successRate)
  
  // Horizontal positioning - check right overflow
  const tooltipX = x + tooltipWidth + 10 > chartWidth.value
    ? Math.max(padding.left, x - tooltipWidth - 10)  // Position to the left, but not beyond left padding
    : x + 10  // Position to the right
  
  // Vertical positioning - always position above the point
  // Clamp to stay within the SVG top boundary
  const tooltipY = Math.max(padding.top, y - tooltipHeight - 10)
  
  return { x: tooltipX, y: tooltipY }
}

// Computed tooltip position for hovered point
const hoveredTooltipPosition = computed(() => {
  if (!hoveredPoint.value) return { x: 0, y: 0 }
  const point = historyByPhp.value.get(hoveredPoint.value.php)?.[hoveredPoint.value.index]
  if (!point) return { x: 0, y: 0 }
  const snapshotIndex = allSnapshots.value.findIndex(s => s.id === point.snapshot_id)
  return getTooltipPosition(snapshotIndex, point.success_rate)
})

// Build table sorting
type BuildSortField = 'platform' | 'php_version' | 'arch' | 'status'
type SortDir = 'asc' | 'desc'
const buildSortField = ref<BuildSortField>('platform')
const buildSortDir = ref<SortDir>('asc')

function toggleBuildSort(field: BuildSortField) {
  if (buildSortField.value === field) {
    buildSortDir.value = buildSortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    buildSortField.value = field
    buildSortDir.value = 'asc'
  }
}

type SortIconType = 'neutral' | 'asc' | 'desc'

function getBuildSortIconType(field: BuildSortField): SortIconType {
  if (buildSortField.value !== field) return 'neutral'
  return buildSortDir.value === 'asc' ? 'asc' : 'desc'
}

const sortedBuilds = computed(() => {
  return scopedBuilds.value.filter(build => !failedOnly.value || build.status === 'failure').sort((a, b) => {
    let cmp = 0
    switch (buildSortField.value) {
      case 'platform':
        cmp = a.platform.localeCompare(b.platform)
          || a.platform_version.localeCompare(b.platform_version, undefined, { numeric: true })
        break
      case 'php_version':
        cmp = comparePhpVersions(a.php_version, b.php_version)
        break
      case 'arch':
        cmp = a.arch.localeCompare(b.arch)
        break
      case 'status':
        cmp = a.status.localeCompare(b.status)
        break
    }
    return buildSortDir.value === 'asc' ? cmp : -cmp
  })
})

const failedCount = computed(() => scopedBuilds.value.filter(b => b.status === 'failure').length)

// Load pre-processed history data
async function loadHistoryData(extensionName: string, extensionVersion: string): Promise<HistoryDataPoint[]> {
    const historyUrl = `data/reports/${encodeURIComponent(extensionName)}/${encodeURIComponent(extensionVersion)}-history.json`
    
    const response = await fetch(historyUrl)
    if (response.status === 404) return []
    if (!response.ok) throw new Error(`Could not load history (${response.status}). Try again.`)
    
    const historyFile: HistoryFile = await response.json()
    
    // Transform pre-processed data to chart format
    const historyPoints: HistoryDataPoint[] = []
    
    historyFile.snapshots.forEach(snapshot => {
      Object.entries(snapshot.php_versions).forEach(([phpVersion, stats]) => {
        historyPoints.push({
          snapshot_id: snapshot.id,
          trigger: snapshot.trigger,
          timestamp: new Date(snapshot.date).toISOString(),
          php_version: phpVersion,
          success_rate: stats.success_rate,
          pass: stats.pass,
          fail: stats.fail,
          total: stats.total,
          platforms: snapshot.platforms[phpVersion] || []
        })
      })
    })
    
    return historyPoints.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
}

// Get unique snapshots
const allSnapshots = computed(() => {
  const snapshots = new Map<string, { id: string; trigger: string; timestamp: string }>()
  
  historyData.value.forEach(point => {
    if (!snapshots.has(point.snapshot_id)) {
      snapshots.set(point.snapshot_id, {
        id: point.snapshot_id,
        trigger: point.trigger,
        timestamp: point.timestamp
      })
    }
  })
  
  return Array.from(snapshots.values()).sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  )
})

// Group history by PHP version
const historyByPhp = computed(() => {
  const grouped = new Map<string, HistoryDataPoint[]>()
  
  historyData.value.forEach(point => {
    if (!grouped.has(point.php_version)) {
      grouped.set(point.php_version, [])
    }
    grouped.get(point.php_version)!.push(point)
  })
  
  // Sort each group by timestamp
  grouped.forEach((points) => {
    points.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  })
  
  return grouped
})

// Chart dimensions and scales
const chartWidth = ref(600)
const chartHeight = ref(300)
const chartContainer = ref<HTMLElement | null>(null)
let chartObserver: ResizeObserver | null = null
let chartResizeFrame = 0
watch(chartContainer, element => {
  chartObserver?.disconnect()
  cancelAnimationFrame(chartResizeFrame)
  if (!element) return
  chartObserver = new ResizeObserver(([entry]) => {
    cancelAnimationFrame(chartResizeFrame)
    chartResizeFrame = requestAnimationFrame(() => {
      chartWidth.value = Math.max(240, entry.contentRect.width)
    })
  })
  chartObserver.observe(element)
})
const padding = { top: 20, right: 20, bottom: 40, left: 50 }
const plotWidth = computed(() => chartWidth.value - padding.left - padding.right)
const plotHeight = computed(() => chartHeight.value - padding.top - padding.bottom)

const phpVersionColors: Record<string, string> = {
  '8.1': '#22c55e',
  '8.2': '#3b82f6',
  '8.3': '#a855f7',
  '8.4': '#f59e0b',
  '8.5': '#ec4899',
  'next': '#6366f1'
}

// Pre-calculate chart paths to avoid recalculation
const chartPaths = computed(() => {
  const paths = new Map<string, string>()
  
  historyByPhp.value.forEach((points, phpVersion) => {
    if (points.length === 0) {
      paths.set(phpVersion, '')
      return
    }
    
    const pathData = points.map((point, idx) => {
      const snapshotIndex = allSnapshots.value.findIndex(s => s.id === point.snapshot_id)
      const x = getChartX(snapshotIndex)
      const y = getChartY(point.success_rate)
      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`
    }).join(' ')
    
    paths.set(phpVersion, pathData)
  })
  
  return paths
})

function getChartX(snapshotIndex: number): number {
  if (allSnapshots.value.length <= 1) return padding.left
  return padding.left + (snapshotIndex / (allSnapshots.value.length - 1)) * plotWidth.value
}

function getChartY(successRate: number): number {
  return padding.top + ((100 - successRate) / 100) * plotHeight.value
}

function getPathForPhpVersion(phpVersion: string): string {
  return chartPaths.value.get(phpVersion) || ''
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function handlePointClick(phpVersion: string, snapshotIndex: number) {
  const snapshot = allSnapshots.value[snapshotIndex]
  const point = historyData.value.find(p => p.php_version === phpVersion && p.snapshot_id === snapshot.id)
  selectedHistoryPoint.value = point || null
}

function platformArchitectures(platform: PlatformBreakdown): Record<string, 'success' | 'failure'> {
  return platform.architectures || {
    ...(platform.x86_64 ? { x86_64: platform.x86_64 } : {}),
    ...(platform.aarch64 ? { aarch64: platform.aarch64 } : {}),
  }
}

function getPlatformStatus(platform: PlatformBreakdown): 'full' | 'partial' | 'fail' | 'none' {
  const statuses = Object.values(platformArchitectures(platform))
  if (!statuses.length) return 'none'
  if (statuses.every(status => status === 'success')) return 'full'
  if (statuses.every(status => status === 'failure')) return 'fail'
  return 'partial'
}

const successRate = computed(() => {
  if (!summary.value?.total) return 0
  return Math.round((summary.value.pass / summary.value.total) * 100)
})

const statusBadgeClass = computed(() => {
  if (successRate.value === 100) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
  if (successRate.value === 0) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
  return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
})

const statusText = computed(() => {
  if (!summary.value?.total) return 'No Builds'
  if (successRate.value === 100) return 'All Passing'
  if (successRate.value === 0) return 'All Failing'
  return 'Partial'
})

const rateColorClass = computed(() => {
  if (successRate.value >= 90) return 'text-green-600 dark:text-green-400'
  if (successRate.value >= 70) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
})

const rateStrokeColor = computed(() => {
  if (successRate.value >= 90) return '#22c55e'
  if (successRate.value >= 70) return '#f59e0b'
  return '#ef4444'
})

async function loadBuildData(generation = loadGeneration) {
  if (!props.extensionData?.path) return
  const path = props.extensionData.path
  loadingBuilds.value = true
  buildError.value = null
  try {
    const results = await loadBuilds(path)
    if (generation === loadGeneration) builds.value = results
  } catch (error) {
    console.error('Failed to load extension builds:', error)
    if (generation === loadGeneration) buildError.value = error instanceof Error ? error.message : 'Could not load builds. Try again.'
  } finally {
    if (generation === loadGeneration) loadingBuilds.value = false
  }
}

async function loadHistory(generation = loadGeneration) {
  if (!props.extensionName || !props.extensionData) return
  loadingHistory.value = true
  historyError.value = null
  try {
    const results = await loadHistoryData(props.extensionName, props.extensionData.version)
    if (generation === loadGeneration) {
      historyData.value = results
      historyLoaded.value = true
    }
  } catch (error) {
    console.error('Failed to load extension history:', error)
    if (generation === loadGeneration) historyError.value = error instanceof Error ? error.message : 'Could not load history. Try again.'
  } finally {
    if (generation === loadGeneration) loadingHistory.value = false
  }
}

watch(() => [props.show, props.extensionData?.path, props.extensionName], () => {
  loadGeneration++
  if (props.show && props.extensionData?.path) {
    loadingBuilds.value = true
    builds.value = []
    historyData.value = []
    historyLoaded.value = false
    historyError.value = null
    loadingHistory.value = false
    hiddenPhpVersions.value = new Set()
    failedOnly.value = false
    activeTab.value = 'overview'
    buildSortField.value = 'platform'
    buildSortDir.value = 'asc'
    selectedHistoryPoint.value = null
    hoveredPoint.value = null
    
    loadBuildData()
  }
}, { immediate: true })

watch(activeTab, tab => {
  if (tab === 'history' && props.show && !historyLoaded.value && !loadingHistory.value) loadHistory()
})

function handleTabKey(event: KeyboardEvent) {
  const tabs = ['overview', 'builds', 'history'] as const
  const index = tabs.indexOf(activeTab.value)
  let next = index
  if (event.key === 'ArrowRight') next = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length
  else if (event.key === 'Home') next = 0
  else if (event.key === 'End') next = tabs.length - 1
  else return
  event.preventDefault()
  activeTab.value = tabs[next]
  document.getElementById(`detail-tab-${activeTab.value}`)?.focus()
}

function selectSnapshot(event: Event) {
  const value = (event.target as HTMLSelectElement).value
  selectedHistoryPoint.value = historyData.value.find(point => `${point.snapshot_id}|${point.php_version}` === value) || null
}

function buildAriaSort(field: BuildSortField) {
  return buildSortField.value === field ? buildSortDir.value === 'asc' ? 'ascending' : 'descending' : 'none'
}

onUnmounted(() => {
  loadGeneration++
  chartObserver?.disconnect()
  cancelAnimationFrame(chartResizeFrame)
})
</script>

<template>
  <Teleport to="body">
    <AppDialog
      :show="show"
      aria-labelledby="modal-title"
      class="fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-2xl max-h-[90dvh] rounded-2xl bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-2xl"
      @close="emit('close')"
    >
        <div
          class="h-[90dvh] sm:h-[80dvh] flex flex-col modal-enter overflow-hidden"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                <CubeIcon class="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div class="min-w-0">
                <h2 id="modal-title" class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100 truncate">{{ extensionName }}</h2>
                <div v-if="extensionData" class="text-sm text-gray-500 dark:text-gray-400 font-mono">v{{ extensionData.version }}</div>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <span :class="['hidden sm:inline-flex px-3 py-1 rounded-full text-xs font-semibold', statusBadgeClass]">
                {{ statusText }}
              </span>
              <button
                @click="$emit('close')"
                class="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Close modal"
              >
                <XMarkIcon class="w-5 h-5" />
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 overflow-x-auto" role="tablist">
            <button
              @click="activeTab = 'overview'"
              id="detail-tab-overview"
              aria-controls="detail-panel"
              :tabindex="activeTab === 'overview' ? 0 : -1"
              @keydown="handleTabKey"
              role="tab"
              :aria-selected="activeTab === 'overview'"
              :class="[
                'px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              Overview
            </button>
            <button
              @click="activeTab = 'builds'"
              id="detail-tab-builds"
              aria-controls="detail-panel"
              :tabindex="activeTab === 'builds' ? 0 : -1"
              @keydown="handleTabKey"
              role="tab"
              :aria-selected="activeTab === 'builds'"
              :class="[
                'px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px flex items-center gap-2 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                activeTab === 'builds'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              Builds
              <span v-if="failedCount" class="px-1.5 py-0.5 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded">
                {{ failedCount }}
              </span>
            </button>
            <button
              @click="activeTab = 'history'"
              id="detail-tab-history"
              aria-controls="detail-panel"
              :tabindex="activeTab === 'history' ? 0 : -1"
              @keydown="handleTabKey"
              role="tab"
              :aria-selected="activeTab === 'history'"
              :class="[
                'px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset',
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              ]"
            >
              History
            </button>
          </div>

          <div id="detail-panel" role="tabpanel" :aria-labelledby="`detail-tab-${activeTab}`" tabindex="0" class="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            <p v-if="extensionData && activeTab !== 'history'" class="px-4 sm:px-6 pt-4 text-xs text-gray-600 dark:text-gray-300">
              {{ hasEnvironmentFilters ? 'Selected environments' : 'All environments' }}. Status filters do not change the success-rate calculation.
            </p>
            <p v-if="activeTab === 'overview' && hasEnvironmentFilters && loadingBuilds" role="status" class="p-6">Loading selected environments...</p>
            <div v-else-if="activeTab !== 'history' && buildError" role="alert" class="p-6 text-red-700 dark:text-red-400">
              <p>{{ buildError }}</p><button @click="loadBuildData()" class="mt-3 px-3 py-2 rounded border border-current">Retry Builds</button>
            </div>
            <div v-if="!extensionData" class="flex flex-col items-center justify-center gap-4 py-12 text-gray-500 dark:text-gray-400">
              <p>Extension data not found</p>
            </div>

            <!-- Overview Tab -->
            <div v-else-if="activeTab === 'overview' && !buildError && !(hasEnvironmentFilters && loadingBuilds)" class="p-4 sm:p-6 space-y-6">
              <!-- Stats Cards -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Builds</div>
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ summary?.total }}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex flex-wrap items-center gap-2 sm:gap-4">
                  <div class="relative w-14 h-14">
                    <svg class="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="15" fill="none" stroke="#e5e7eb" class="dark:stroke-gray-700" stroke-width="3" />
                      <circle
                        cx="18" cy="18" r="15" fill="none"
                        :stroke="rateStrokeColor"
                        stroke-width="3"
                        stroke-linecap="round"
                        :stroke-dasharray="`${successRate * 0.94} 100`"
                      />
                    </svg>
                    <div class="absolute inset-0 flex items-center justify-center">
                      <span :class="['text-sm font-bold', rateColorClass]">{{ successRate }}%</span>
                    </div>
                  </div>
                  <div>
                    <div class="text-sm text-gray-500 dark:text-gray-400">Success Rate</div>
                    <div :class="['text-xl font-bold', rateColorClass]">{{ successRate }}%</div>
                  </div>
                </div>
              </div>

              <!-- Pass/Fail Stats -->
              <div class="grid grid-cols-2 gap-4">
                <div class="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-green-100 dark:bg-green-900/50 flex items-center justify-center">
                    <CheckIcon class="w-5 h-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <div class="text-xs font-medium uppercase tracking-wider text-green-600 dark:text-green-400">Passed</div>
                    <div class="text-2xl font-semibold tabular-nums text-green-700 dark:text-green-300">{{ summary?.pass }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <XMarkIcon class="w-5 h-5 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <div class="text-xs font-medium uppercase tracking-wider text-red-600 dark:text-red-400">Failed</div>
                    <div class="text-2xl font-semibold tabular-nums text-red-700 dark:text-red-300">{{ summary?.fail }}</div>
                  </div>
                </div>
              </div>

              <!-- Info List -->
              <div class="space-y-3">
                <div class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span class="text-sm text-gray-500 dark:text-gray-400">Last Updated</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100">{{ formatRelativeTime(extensionData.updated_at) }}</span>
                </div>
                <div v-if="extensionMeta?.type" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span class="text-sm text-gray-500 dark:text-gray-400">Type</span>
                  <span class="text-sm font-medium text-gray-900 dark:text-gray-100 capitalize">{{ extensionMeta.type }}</span>
                </div>
                <div v-if="extensionMeta?.pecl_name" class="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                  <span class="text-sm text-gray-500 dark:text-gray-400">PECL Name</span>
                  <span class="text-sm font-mono text-gray-900 dark:text-gray-100">{{ extensionMeta.pecl_name }}</span>
                </div>
                <div v-if="extensionMeta?.track_url" class="flex items-center justify-between py-2">
                  <span class="text-sm text-gray-500 dark:text-gray-400">Source</span>
                  <a
                    :href="extensionMeta.track_url"
                    target="_blank"
                    rel="noopener"
                    class="inline-flex items-center gap-1 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300"
                  >
                    <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.385-1.335-1.755-1.335-1.755-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.605-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12" />
                    </svg>
                    View on GitHub
                    <ArrowTopRightOnSquareIcon class="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <!-- Builds Tab -->
            <div v-else-if="activeTab === 'builds' && !buildError" class="flex flex-col min-h-0">
              <label class="flex items-center gap-2 px-4 sm:px-6 py-3 text-sm text-gray-700 dark:text-gray-300">
                <input v-model="failedOnly" type="checkbox" class="w-4 h-4" /> Failed only ({{ failedCount }})
              </label>
              <div v-if="loadingBuilds" class="flex items-center justify-center flex-1">
                <div class="spinner"></div>
              </div>
              <div v-else-if="sortedBuilds.length === 0" class="p-6 text-center text-gray-500 dark:text-gray-400">
                {{ failedOnly ? 'No failed builds in this scope' : 'No build data available for these environments' }}
              </div>
              <div v-else class="flex-1 flex flex-col min-h-0 overflow-hidden">
                <div class="flex-1 overflow-y-auto">
                  <table class="w-full text-sm table-fixed">
                    <colgroup>
                      <col class="w-[25%]" />
                      <col class="w-[20%]" />
                      <col class="w-[20%]" />
                      <col class="w-[20%]" />
                      <col class="w-[15%]" />
                    </colgroup>
                    <thead class="bg-gray-50 dark:bg-gray-800 sticky top-0">
                      <tr>
                        <th 
                          @click="toggleBuildSort('platform')"
                          :aria-sort="buildAriaSort('platform')"
                          scope="col"
                          class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <button class="inline-flex items-center gap-1">
                            OS
                            <ChevronUpDownIcon v-if="getBuildSortIconType('platform') === 'neutral'" class="w-3 h-3 text-gray-400" />
                            <ChevronUpIcon v-else-if="getBuildSortIconType('platform') === 'asc'" class="w-3 h-3 text-gray-400" />
                            <ChevronDownIcon v-else class="w-3 h-3 text-gray-400" />
                          </button>
                        </th>
                        <th 
                          @click="toggleBuildSort('php_version')"
                          :aria-sort="buildAriaSort('php_version')"
                          scope="col"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <button class="inline-flex items-center gap-1 justify-center">
                            PHP
                            <ChevronUpDownIcon v-if="getBuildSortIconType('php_version') === 'neutral'" class="w-3 h-3 text-gray-400" />
                            <ChevronUpIcon v-else-if="getBuildSortIconType('php_version') === 'asc'" class="w-3 h-3 text-gray-400" />
                            <ChevronDownIcon v-else class="w-3 h-3 text-gray-400" />
                          </button>
                        </th>
                        <th 
                          @click="toggleBuildSort('arch')"
                          :aria-sort="buildAriaSort('arch')"
                          scope="col"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <button class="inline-flex items-center gap-1 justify-center">
                            Arch
                            <ChevronUpDownIcon v-if="getBuildSortIconType('arch') === 'neutral'" class="w-3 h-3 text-gray-400" />
                            <ChevronUpIcon v-else-if="getBuildSortIconType('arch') === 'asc'" class="w-3 h-3 text-gray-400" />
                            <ChevronDownIcon v-else class="w-3 h-3 text-gray-400" />
                          </button>
                        </th>
                        <th 
                          @click="toggleBuildSort('status')"
                          :aria-sort="buildAriaSort('status')"
                          scope="col"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <button class="inline-flex items-center gap-1 justify-center">
                            Status
                            <ChevronUpDownIcon v-if="getBuildSortIconType('status') === 'neutral'" class="w-3 h-3 text-gray-400" />
                            <ChevronUpIcon v-else-if="getBuildSortIconType('status') === 'asc'" class="w-3 h-3 text-gray-400" />
                            <ChevronDownIcon v-else class="w-3 h-3 text-gray-400" />
                          </button>
                        </th>
                        <th class="px-4 py-2"></th>
                      </tr>
                    </thead>
                    <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                      <tr
                        v-for="build in sortedBuilds"
                        :key="`${build.platform}-${build.platform_version}-${build.php_version}-${build.arch}`"
                        :class="[
                          'transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50',
                          build.status === 'failure' ? 'bg-red-50/30 dark:bg-red-900/10' : ''
                        ]"
                      >
                        <td class="px-2 sm:px-4 py-2 text-gray-900 dark:text-gray-100 break-words">
                          {{ build.platform }} {{ build.platform_version }}
                        </td>
                        <td class="px-1 sm:px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs text-center">
                          {{ build.php_version }}
                        </td>
                        <td class="px-1 sm:px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs text-center break-all">
                          {{ build.arch }}
                        </td>
                        <td class="px-1 sm:px-4 py-2 text-center">
                          <span
                            :class="[
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                              build.status === 'success'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                            ]"
                          >
                            <CheckIcon v-if="build.status === 'success'" class="w-3 h-3 stroke-[3]" />
                            <XMarkIcon v-else class="w-3 h-3 stroke-[3]" />
                            {{ build.status === 'success' ? 'pass' : 'fail' }}
                          </span>
                        </td>
                        <td class="px-1 sm:px-4 py-2 text-center">
                          <a
                            v-if="build.log_url"
                            :href="build.log_url"
                            target="_blank"
                            rel="noopener"
                            class="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="View logs"
                            :aria-label="`View ${extensionName} ${build.platform} ${build.platform_version} PHP ${build.php_version} ${build.arch} build logs`"
                          >
                            <ArrowTopRightOnSquareIcon class="w-4 h-4" />
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- History Tab -->
            <div v-else-if="activeTab === 'history'" class="p-4 sm:p-6 space-y-6">
              <!-- Loading state -->
              <div v-if="loadingHistory" class="flex items-center justify-center py-12">
                <div class="spinner"></div><span role="status" class="sr-only">Loading history...</span>
              </div>

              <div v-else-if="historyError" role="alert" class="py-6 text-red-700 dark:text-red-400">
                <p>{{ historyError }}</p><button @click="loadHistory()" class="mt-3 px-3 py-2 rounded border border-current">Retry History</button>
              </div>

              <!-- Empty state -->
              <div v-else-if="allSnapshots.length === 0" class="flex flex-col items-center justify-center py-12 text-center">
                <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                  <CubeIcon class="w-8 h-8 text-gray-400" />
                </div>
                <h4 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No Build History</h4>
                <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                  No build history has been published for this extension version.
                </p>
              </div>

              <template v-else>
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">Success Rate Trends</h3>
                  <p class="text-sm text-gray-500 dark:text-gray-400">All environments across PHP versions ({{ allSnapshots.length }} builds)</p>
                </div>

                <!-- Chart -->
                <div ref="chartContainer" class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                <svg :width="chartWidth" :height="chartHeight" :viewBox="`0 0 ${chartWidth} ${chartHeight}`" class="w-full h-auto max-w-full" role="img" aria-label="Success-rate history; use the snapshot selector below for exact values">
                  <!-- Grid lines -->
                  <g class="grid">
                    <line
                      v-for="y in [0, 25, 50, 75, 100]"
                      :key="y"
                      :x1="padding.left"
                      :y1="getChartY(y)"
                      :x2="chartWidth - padding.right"
                      :y2="getChartY(y)"
                      class="stroke-gray-300 dark:stroke-gray-600"
                      stroke-width="1"
                      stroke-dasharray="2,2"
                    />
                  </g>

                  <!-- Y-axis labels -->
                  <g class="y-axis">
                    <text
                      v-for="y in [0, 25, 50, 75, 100]"
                      :key="y"
                      :x="padding.left - 10"
                      :y="getChartY(y)"
                      text-anchor="end"
                      dominant-baseline="middle"
                      class="text-xs fill-gray-500 dark:fill-gray-400"
                    >
                      {{ y }}%
                    </text>
                  </g>

                  <!-- X-axis labels (show every few snapshots) -->
                  <g class="x-axis">
                    <text
                      v-for="snapshot in allSnapshots.filter((_, i) => i % Math.ceil(allSnapshots.length / (chartWidth < 400 ? 3 : 6)) === 0 || i === allSnapshots.length - 1)"
                      :key="snapshot.id"
                      :x="getChartX(allSnapshots.indexOf(snapshot))"
                      :y="chartHeight - padding.bottom + 20"
                      :text-anchor="allSnapshots.indexOf(snapshot) === allSnapshots.length - 1 ? 'end' : (allSnapshots.indexOf(snapshot) === 0 ? 'start' : 'middle')"
                      class="text-xs fill-gray-500 dark:fill-gray-400"
                    >
                      {{ formatDate(snapshot.timestamp) }}
                    </text>
                  </g>

                  <!-- Lines for each PHP version -->
                  <g v-for="phpVersion in Array.from(historyByPhp.keys())" :key="phpVersion" v-show="!hiddenPhpVersions.has(phpVersion)">
                    <path
                      :d="getPathForPhpVersion(phpVersion)"
                      :stroke="phpVersionColors[phpVersion]"
                      stroke-width="2.5"
                      fill="none"
                      class="transition-opacity"
                      :class="hoveredPoint && hoveredPoint.php !== phpVersion ? 'opacity-30' : 'opacity-100'"
                    />
                    
                    <!-- Data points -->
                    <circle
                      v-for="(point, idx) in historyByPhp.get(phpVersion) || []"
                      :key="`${phpVersion}-${point.snapshot_id}`"
                      :cx="getChartX(allSnapshots.findIndex(s => s.id === point.snapshot_id))"
                      :cy="getChartY(point.success_rate)"
                      r="4"
                      :fill="phpVersionColors[phpVersion]"
                      class="cursor-pointer"
                      @mouseenter="handlePointHover(phpVersion, idx)"
                      @mouseleave="handlePointLeave"
                      @click="handlePointClick(phpVersion, allSnapshots.findIndex(s => s.id === point.snapshot_id))"
                    />
                  </g>

                  <!-- Hover tooltip -->
                  <g v-if="hoveredPoint && !hiddenPhpVersions.has(hoveredPoint.php) && historyByPhp.get(hoveredPoint.php)?.[hoveredPoint.index]" class="pointer-events-none">
                    <foreignObject
                      :x="hoveredTooltipPosition.x"
                      :y="hoveredTooltipPosition.y"
                      :width="tooltipWidth"
                      :height="tooltipHeight"
                    >
                      <div class="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg p-2 shadow-lg">
                        <div class="font-semibold">PHP {{ hoveredPoint.php }}</div>
                        <div class="text-gray-300 mb-1">{{ formatDate(historyByPhp.get(hoveredPoint.php)![hoveredPoint.index]?.timestamp || '') }}</div>
                        <div class="font-bold text-sm">{{ historyByPhp.get(hoveredPoint.php)![hoveredPoint.index]?.success_rate }}%</div>
                        <div class="text-gray-300">{{ historyByPhp.get(hoveredPoint.php)![hoveredPoint.index]?.pass }}/{{ historyByPhp.get(hoveredPoint.php)![hoveredPoint.index]?.total }} passing</div>
                      </div>

                    </foreignObject>
                  </g>
                </svg>
              </div>

              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Inspect a Snapshot
                <select @change="selectSnapshot" :value="selectedHistoryPoint ? `${selectedHistoryPoint.snapshot_id}|${selectedHistoryPoint.php_version}` : ''" class="mt-2 w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 px-3 py-2">
                  <option value="">Select a snapshot</option>
                  <option v-for="point in historyData" :key="`${point.snapshot_id}|${point.php_version}`" :value="`${point.snapshot_id}|${point.php_version}`">{{ formatDate(point.timestamp) }} - PHP {{ point.php_version }} - {{ point.success_rate }}% ({{ point.pass }}/{{ point.total }} passing)</option>
                </select>
              </label>

              <!-- Legend -->
              <div class="flex flex-wrap gap-4 justify-center">
                <button
                  v-for="phpVersion in Array.from(historyByPhp.keys())"
                  :key="phpVersion"
                  @click="togglePhpVersion(phpVersion)"
                  :aria-pressed="!hiddenPhpVersions.has(phpVersion)"
                  class="flex items-center gap-2 px-2 py-1 rounded-md transition-opacity hover:bg-gray-100 dark:hover:bg-gray-700"
                  :class="hiddenPhpVersions.has(phpVersion) ? 'opacity-40' : 'opacity-100'"
                >
                  <div class="w-8 h-0.5 rounded" :style="{ backgroundColor: phpVersionColors[phpVersion] }"></div>
                  <span class="text-sm text-gray-700 dark:text-gray-300">
                    PHP {{ phpVersion }}
                    <span class="text-gray-500 dark:text-gray-400">
                      ({{ historyByPhp.get(phpVersion)?.[historyByPhp.get(phpVersion)!.length - 1]?.pass }}/{{ historyByPhp.get(phpVersion)?.[historyByPhp.get(phpVersion)!.length - 1]?.total }})
                    </span>
                  </span>
                </button>
              </div>

              <!-- Selected point breakdown -->
              <div v-if="selectedHistoryPoint" class="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      PHP {{ selectedHistoryPoint.php_version }} - {{ selectedHistoryPoint.trigger }}
                    </h4>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                      {{ formatDate(selectedHistoryPoint.timestamp) }} • {{ selectedHistoryPoint.pass }}/{{ selectedHistoryPoint.total }} passing ({{ selectedHistoryPoint.success_rate }}%)
                    </p>
                  </div>
                  <button
                    @click="selectedHistoryPoint = null"
                    aria-label="Close snapshot details"
                    class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <XMarkIcon class="w-5 h-5" />
                  </button>
                </div>

                <div class="space-y-3">
                  <div
                    v-for="platform in selectedHistoryPoint.platforms"
                    :key="`${platform.platform}-${platform.version}`"
                    class="flex flex-wrap items-center gap-3"
                  >
                    <div class="text-sm text-gray-700 dark:text-gray-300 w-32">
                      {{ platform.platform }} {{ platform.version }}
                    </div>
                    <div class="flex flex-wrap gap-1">
                      <div
                        v-for="(status, arch) in platformArchitectures(platform)"
                        :key="arch"
                        :class="[
                          'px-2 py-1 rounded flex items-center justify-center text-xs font-medium',
                          status === 'success'
                            ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                            : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                        ]"
                        :title="`${arch}: ${status === 'success' ? 'Pass' : 'Fail'}`"
                      >
                        {{ arch }} {{ status === 'success' ? 'Pass' : 'Fail' }}
                      </div>
                    </div>
                    <div class="flex-1 flex gap-0.5">
                      <div
                        :class="[
                          'h-2 rounded-full flex-1',
                          getPlatformStatus(platform) === 'full' ? 'bg-green-500' :
                          getPlatformStatus(platform) === 'partial' ? 'bg-yellow-500' :
                          getPlatformStatus(platform) === 'fail' ? 'bg-red-500' : 'bg-gray-300'
                        ]"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
              </template>
            </div>
          </div>
        </div>
    </AppDialog>
  </Teleport>
</template>
