<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import AppDialog from './components/AppDialog.vue'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import FilterSidebar from './components/FilterSidebar.vue'
import StatsBar from './components/StatsBar.vue'
import GridView from './components/GridView.vue'
import ListView from './components/ListView.vue'
import DetailModal from './components/DetailModal.vue'
import SkeletonLoader from './components/SkeletonLoader.vue'
import ErrorBoundary from './components/ErrorBoundary.vue'
import { useDataLoader } from './composables/useDataLoader'
import { useStore } from './composables/useStore'
import { useKeyboard } from './composables/useKeyboard'
import { useDebounce } from './composables/useDebounce'
import type { Filters, LatestExtension, ProcessedExtension } from './types'

const { metadata, latest, loading, error, initialize } = useDataLoader()
const { state, buildCacheVersion, setFilter, clearFilters, setView, setSelectedExtension, loadBuilds, processExtensions, filterExtensions, getStats, needsBuildsLoaded, initializeFilters } = useStore()

const showMobileSidebar = ref(false)
const highlightedIndex = ref(-1)
const mainContentRef = ref<HTMLElement | null>(null)
const displayedExtensions = ref<ProcessedExtension[]>([])
const gridPage = ref(1)
const gridPageSize = 10
const loadingBuilds = ref(false)
const buildError = ref<string | null>(null)
let buildRequest = 0

function isLatestExtension(value: unknown): value is LatestExtension {
  return !!value && typeof value === 'object' && 'path' in value
}

const extensions = computed(() => {
  // Trigger reactivity when builds are loaded
  void buildCacheVersion.value
  const processed = processExtensions(latest.value, metadata.value?.extensions)
  return filterExtensions(processed)
})

const extensionCount = computed(() => {
  if (!latest.value) return 0
  return Object.keys(latest.value).filter(k => k !== '_meta').length
})

const lastUpdated = computed(() => {
  if (!latest.value) return undefined
  // Use pre-computed value if available
  if (latest.value._meta?.latest_updated_at) {
    return latest.value._meta.latest_updated_at
  }
  // Fallback to computing from data
  const dates = Object.entries(latest.value)
    .filter(([k]) => k !== '_meta')
    .map(([, ext]) => (ext as { updated_at?: string }).updated_at)
    .filter(Boolean) as string[]
  if (dates.length === 0) return undefined
  return dates.sort().reverse()[0]
})

const stats = computed(() => getStats(extensions.value))
const sortedExtensions = computed(() => [...extensions.value].sort((a, b) => a.name.localeCompare(b.name)))
const gridPages = computed(() => Math.max(1, Math.ceil(extensions.value.length / gridPageSize)))
const gridExtensions = computed(() => sortedExtensions.value.slice((gridPage.value - 1) * gridPageSize, gridPage.value * gridPageSize))
const keyboardExtensions = computed(() => state.currentView === 'grid'
  ? gridExtensions.value : displayedExtensions.value.length ? displayedExtensions.value : extensions.value)
const displayError = computed(() => error.value || buildError.value)
const activeFilters = computed(() => {
  const labels = { os: 'OS', phpVersion: 'PHP', arch: 'Architecture', extension: 'Extension' }
  return (Object.keys(labels) as (keyof typeof labels)[]).flatMap(key => {
    const values = state.filters[key]
    return values === null || values.length
      ? [{ key, label: `${labels[key]}: ${values === null ? 'None' : values.join(', ').replaceAll('|', ' ')}` }]
      : []
  })
})

watch(() => [state.filters, state.currentView], () => {
  gridPage.value = 1
  highlightedIndex.value = -1
}, { deep: true })
watch(gridPages, pages => { gridPage.value = Math.min(gridPage.value, pages) })

function handleOrderUpdate(order: ProcessedExtension[]) {
  const changed = order.length !== displayedExtensions.value.length
    || order.some((extension, index) => extension.name !== displayedExtensions.value[index]?.name)
  displayedExtensions.value = order
  if (changed) highlightedIndex.value = -1
}

const selectedExtensionData = computed<LatestExtension | null>(() => {
  if (!state.selectedExtension || !latest.value) return null
  const extension = latest.value[state.selectedExtension]
  return isLatestExtension(extension) ? extension : null
})

const selectedExtensionMeta = computed(() => {
  if (!state.selectedExtension || !metadata.value?.extensions) return null
  return metadata.value.extensions[state.selectedExtension] || null
})

// Debounced filter updates for search
const debouncedSearch = useDebounce((value: string) => setFilter('search', value), 150)

const buildPaths = computed(() => {
  if (!latest.value || [state.filters.os, state.filters.phpVersion, state.filters.arch, state.filters.extension].includes(null)) return []
  if (state.currentView !== 'grid' && !needsBuildsLoaded()) return []
  const candidates = Object.entries(latest.value)
    .filter(([name, ext]) => isLatestExtension(ext)
      && (!state.filters.search || name.toLowerCase().includes(state.filters.search.toLowerCase()))
      && (!state.filters.extension?.length || state.filters.extension.includes(name))
      && (needsBuildsLoaded() || state.filters.status === 'all'
        || (state.filters.status === 'success' ? ext.fail === 0 && ext.total > 0 : ext.fail > 0)))
    .sort(([a], [b]) => a.localeCompare(b))
  const visible = needsBuildsLoaded() ? candidates : candidates.slice((gridPage.value - 1) * gridPageSize, gridPage.value * gridPageSize)
  return visible.flatMap(([, ext]) => isLatestExtension(ext) ? [ext.path] : [])
})

async function loadVisibleBuilds() {
  const request = ++buildRequest
  const paths = buildPaths.value
  buildError.value = null
  loadingBuilds.value = paths.length > 0
  const results = await Promise.allSettled(paths.map(path => loadBuilds(path)))
  if (request !== buildRequest) return
  const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
  if (failures.length) {
    console.error('Failed to load build results:', failures.map(result => result.reason))
    buildError.value = `Could not load ${failures.length} build report${failures.length === 1 ? '' : 's'}. Try again.`
  }
  loadingBuilds.value = false
}

watch(() => JSON.stringify([buildPaths.value, state.filters.os, state.filters.phpVersion, state.filters.arch]), loadVisibleBuilds, { immediate: true })

function retryData() {
  if (error.value) initialize()
  else loadVisibleBuilds()
}

// Initialize filters when metadata loads
watch(
  () => metadata.value,
  (meta) => {
    if (meta) {
      initializeFilters(meta)
    }
  },
  { immediate: true }
)

// Keyboard navigation
useKeyboard({
  onSearch: () => {
    if (state.selectedExtension || showMobileSidebar.value) return
    const input = document.getElementById('searchInput')
    input?.focus()
  },
  onEscape: () => {
    if (state.selectedExtension) {
      setSelectedExtension(null)
    } else if (showMobileSidebar.value) {
      showMobileSidebar.value = false
    }
    highlightedIndex.value = -1
  },
  onNext: () => {
    if (!state.selectedExtension && !showMobileSidebar.value && keyboardExtensions.value.length > 0) {
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, keyboardExtensions.value.length - 1)
      scrollToHighlighted()
    }
  },
  onPrev: () => {
    if (!state.selectedExtension && !showMobileSidebar.value && keyboardExtensions.value.length > 0) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
      scrollToHighlighted()
    }
  },
  onEnter: () => {
    if (!state.selectedExtension && !showMobileSidebar.value && highlightedIndex.value >= 0 && highlightedIndex.value < keyboardExtensions.value.length) {
      setSelectedExtension(keyboardExtensions.value[highlightedIndex.value].name)
    }
  },
})

function handleFiltersUpdate(updates: Partial<Filters>) {
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'search') {
      debouncedSearch(String(value))
    } else {
      setFilter(key as keyof Filters, value as never)
    }
  }
}

async function scrollToHighlighted() {
  await nextTick()
  const button = mainContentRef.value?.querySelector<HTMLElement>(`[data-extension="${CSS.escape(keyboardExtensions.value[highlightedIndex.value]?.name || '')}"]`)
  button?.focus({ preventScroll: true })
  button?.scrollIntoView({ block: 'nearest' })
}

function handleSelectExtension(name: string) {
  showMobileSidebar.value = false
  setSelectedExtension(name)
}

function handleCloseModal() {
  setSelectedExtension(null)
}

function toggleMobileSidebar() {
  showMobileSidebar.value = !showMobileSidebar.value
}

function skipToMain() {
  mainContentRef.value?.focus()
}

onMounted(() => {
  initialize()
})
</script>

<template>
  <ErrorBoundary>
    <div class="flex flex-col h-dvh min-h-[24rem] bg-gray-50 dark:bg-gray-950 transition-colors">
      <!-- Skip link for accessibility -->
      <a
        href="#main-content"
        @click.prevent="skipToMain"
        class="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <AppHeader
        title="PHP Extension Builds"
        subtitle="Monitor build status across OS, PHP version, and architecture"
        :extension-count="extensionCount"
        :sidebar-open="showMobileSidebar"
        @toggle-sidebar="toggleMobileSidebar"
      />

      <main
        id="main-content"
        ref="mainContentRef"
        class="flex flex-1 min-h-0 overflow-hidden relative"
        tabindex="-1"
        role="main"
        aria-label="Extension build results"
      >
        <AppDialog
          :show="showMobileSidebar"
          id="filter-dialog"
          aria-labelledby="filter-title"
          class="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
          @close="showMobileSidebar = false"
        >
          <div class="flex h-full flex-col">
            <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
              <h2 id="filter-title" class="font-semibold">Filters</h2>
              <button @click="showMobileSidebar = false" aria-label="Close filters" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><XMarkIcon class="w-5 h-5" /></button>
            </div>
            <FilterSidebar
              :metadata="metadata"
              :latest="latest"
              :filters="state.filters"
              class="!block !w-full flex-1 min-h-0"
              @update:filters="handleFiltersUpdate"
              @clear-filters="clearFilters"
            />
          </div>
        </AppDialog>

        <!-- Desktop sidebar -->
        <FilterSidebar
          :metadata="metadata"
          :latest="latest"
          :filters="state.filters"
          aria-label="Filter options"
          @update:filters="handleFiltersUpdate"
          @clear-filters="clearFilters"
        />

        <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
          <!-- Loading skeleton for stats -->
          <div v-if="loading" class="p-4 sm:p-6 pb-0">
            <SkeletonLoader type="stats" />
          </div>
          <StatsBar
            v-else
            :total="stats.total"
            :pass="stats.pass"
            :fail="stats.fail"
            :success-rate="stats.successRate"
            :current-view="state.currentView"
            :search="state.filters.search"
            :extension-count="extensions.length"
            @update:view="setView"
            @update:search="debouncedSearch"
          />

          <div v-if="activeFilters.length || state.filters.status !== 'all'" class="flex flex-wrap items-center gap-2 px-4 sm:px-6 pt-3 text-xs" aria-label="Active filters">
            <button v-for="filter in activeFilters" :key="filter.key" @click="setFilter(filter.key, [])" :title="filter.label" class="inline-flex items-center gap-1 max-w-full px-2 py-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
              <span class="truncate">{{ filter.label }}</span><XMarkIcon class="w-3 h-3 shrink-0" />
              <span class="sr-only">Remove filter</span>
            </button>
            <button v-if="state.filters.status !== 'all'" @click="setFilter('status', 'all')" class="px-2 py-1.5 rounded bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200">
              {{ state.filters.status === 'success' ? 'All passing' : 'Has failures' }} <span aria-hidden="true">&times;</span><span class="sr-only">Remove status filter</span>
            </button>
            <button @click="clearFilters" class="px-2 py-1.5 text-blue-700 dark:text-blue-300 underline">Clear All Filters</button>
          </div>
          <p v-if="loadingBuilds" role="status" class="px-4 sm:px-6 pt-3 text-sm text-gray-600 dark:text-gray-300">Loading build results...</p>
          <div class="flex-1 min-h-0 overflow-auto p-4 sm:p-6">
            <!-- Loading skeleton -->
            <SkeletonLoader
              v-if="loading || loadingBuilds"
              :type="state.currentView === 'grid' ? 'grid' : 'list'"
              :count="10"
            />

            <!-- Error state -->
            <div
              v-else-if="displayError"
              class="flex flex-col items-center justify-center gap-4 py-16"
              role="alert"
              aria-live="assertive"
            >
              <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
              </div>
              <p class="text-sm text-red-600 dark:text-red-400 font-medium">{{ displayError }}</p>
              <button
                @click="retryData"
                class="px-4 py-2 bg-red-100 dark:bg-red-900/30 hover:bg-red-200 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900"
              >
                Try Again
              </button>
            </div>

            <!-- Grid view with animation -->
            <Transition
              enter-active-class="transition-opacity duration-200"
              leave-active-class="transition-opacity duration-150"
              enter-from-class="opacity-0"
              leave-to-class="opacity-0"
              mode="out-in"
            >
              <GridView
                v-if="!loading && !loadingBuilds && !displayError && state.currentView === 'grid'"
                :extensions="gridExtensions"
                :metadata="metadata"
                :latest="latest"
                :filters="state.filters"
                :highlighted-name="keyboardExtensions[highlightedIndex]?.name"
                @select-extension="handleSelectExtension"
              />

              <!-- List view with animation -->
              <ListView
                v-else-if="!loading && !loadingBuilds && !displayError"
                :extensions="extensions"
                :highlighted-index="highlightedIndex"
                @update:order="handleOrderUpdate"
                @select-extension="handleSelectExtension"
              />
            </Transition>
            <nav v-if="state.currentView === 'grid' && !loading && !loadingBuilds && !displayError && gridPages > 1" aria-label="Matrix pages" class="flex items-center justify-between gap-3 pt-4 text-sm text-gray-700 dark:text-gray-300">
              <button :disabled="gridPage === 1" @click="gridPage--; highlightedIndex = -1" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">Previous</button>
              <span aria-live="polite">Page {{ gridPage }} of {{ gridPages }}</span>
              <button :disabled="gridPage === gridPages" @click="gridPage++; highlightedIndex = -1" class="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:bg-gray-100 dark:hover:bg-gray-800">Next</button>
            </nav>
          </div>
        </div>
      </main>

      <AppFooter :last-updated="lastUpdated" />

      <DetailModal
        :show="!!state.selectedExtension"
        :extension-name="state.selectedExtension"
        :extension-data="selectedExtensionData"
        :extension-meta="selectedExtensionMeta"
        :filters="state.filters"
        @close="handleCloseModal"
      />
    </div>
  </ErrorBoundary>
</template>
