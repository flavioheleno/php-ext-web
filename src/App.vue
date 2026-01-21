<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { ExclamationTriangleIcon } from '@heroicons/vue/24/outline'
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
import type { Filters } from './types'

const { metadata, latest, loading, error, initialize } = useDataLoader()
const { state, buildCacheVersion, setFilter, clearFilters, setView, setSelectedExtension, loadBuilds, processExtensions, filterExtensions, getStats, needsBuildsLoaded, initializeFilters } = useStore()

const showMobileSidebar = ref(false)
const highlightedIndex = ref(-1)
const mainContentRef = ref<HTMLElement | null>(null)

const extensions = computed(() => {
  // Trigger reactivity when builds are loaded
  void buildCacheVersion.value
  const processed = processExtensions(latest.value, metadata.value?.extensions)
  return filterExtensions(processed)
})

const extensionCount = computed(() => latest.value ? Object.keys(latest.value).length : 0)

const lastUpdated = computed(() => {
  if (!latest.value) return undefined
  const dates = Object.values(latest.value).map(ext => ext.updated_at)
  if (dates.length === 0) return undefined
  return dates.sort().reverse()[0]
})

const stats = computed(() => getStats(extensions.value))

const selectedExtensionData = computed(() => {
  if (!state.selectedExtension || !latest.value) return null
  return latest.value[state.selectedExtension] || null
})

const selectedExtensionMeta = computed(() => {
  if (!state.selectedExtension || !metadata.value?.extensions) return null
  return metadata.value.extensions[state.selectedExtension] || null
})

// Debounced filter updates for search
const debouncedSetFilter = useDebounce((key: keyof Filters, value: any) => {
  setFilter(key, value)
}, 150)

// Load builds when detail filters are applied or grid view is active
watch(
  () => [state.filters.os, state.filters.phpVersion, state.filters.arch, state.currentView, latest.value],
  async () => {
    // Load builds for grid view or when detail filters are applied
    const needsBuilds = state.currentView === 'grid' || needsBuildsLoaded()
    if (!needsBuilds || !latest.value) return
    
    // Load builds for all extensions
    const paths = Object.values(latest.value).map(ext => ext.path)
    await Promise.all(paths.map(path => loadBuilds(path)))
  },
  { deep: true }
)

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
    if (extensions.value.length > 0) {
      highlightedIndex.value = Math.min(highlightedIndex.value + 1, extensions.value.length - 1)
    }
  },
  onPrev: () => {
    if (extensions.value.length > 0) {
      highlightedIndex.value = Math.max(highlightedIndex.value - 1, 0)
    }
  },
  onEnter: () => {
    if (highlightedIndex.value >= 0 && highlightedIndex.value < extensions.value.length) {
      setSelectedExtension(extensions.value[highlightedIndex.value].name)
    }
  },
})

function handleFiltersUpdate(updates: Partial<Filters>) {
  for (const [key, value] of Object.entries(updates)) {
    if (key === 'search') {
      debouncedSetFilter(key as keyof Filters, value as never)
    } else {
      setFilter(key as keyof Filters, value as never)
    }
  }
}

function handleSelectExtension(name: string) {
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
    <div class="flex flex-col min-h-screen bg-gray-50 dark:bg-gray-950 transition-colors">
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
        @toggle-sidebar="toggleMobileSidebar"
      />

      <main
        id="main-content"
        ref="mainContentRef"
        class="flex flex-1 overflow-hidden relative"
        tabindex="-1"
        role="main"
        aria-label="Extension build results"
      >
        <!-- Mobile sidebar backdrop -->
        <Transition
          enter-active-class="transition-opacity duration-300"
          leave-active-class="transition-opacity duration-300"
          enter-from-class="opacity-0"
          leave-to-class="opacity-0"
        >
          <div
            v-if="showMobileSidebar"
            class="fixed inset-0 bg-black/50 z-40 lg:hidden"
            @click="showMobileSidebar = false"
            aria-hidden="true"
          />
        </Transition>

        <!-- Mobile sidebar -->
        <Transition
          enter-active-class="transition-transform duration-300 ease-out"
          leave-active-class="transition-transform duration-200 ease-in"
          enter-from-class="-translate-x-full"
          leave-to-class="-translate-x-full"
        >
          <div
            v-if="showMobileSidebar"
            class="fixed left-0 top-0 h-full z-50 lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Filter options"
          >
            <FilterSidebar
              :metadata="metadata"
              :latest="latest"
              :filters="state.filters"
              class="!block h-full shadow-xl"
              @update:filters="handleFiltersUpdate"
              @clear-filters="clearFilters"
            />
          </div>
        </Transition>

        <!-- Desktop sidebar -->
        <FilterSidebar
          :metadata="metadata"
          :latest="latest"
          :filters="state.filters"
          aria-label="Filter options"
          @update:filters="handleFiltersUpdate"
          @clear-filters="clearFilters"
        />

        <div class="flex-1 flex flex-col overflow-hidden">
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
            @update:view="setView"
          />

          <div class="flex-1 overflow-auto p-4 sm:p-6">
            <!-- Loading skeleton -->
            <SkeletonLoader
              v-if="loading"
              :type="state.currentView === 'grid' ? 'grid' : 'list'"
              :count="10"
            />

            <!-- Error state -->
            <div
              v-else-if="error"
              class="flex flex-col items-center justify-center gap-4 py-16"
              role="alert"
              aria-live="assertive"
            >
              <div class="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ExclamationTriangleIcon class="w-8 h-8 text-red-500" />
              </div>
              <p class="text-sm text-red-600 dark:text-red-400 font-medium">{{ error }}</p>
              <button
                @click="initialize()"
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
                v-if="!loading && !error && state.currentView === 'grid'"
                :extensions="extensions"
                :metadata="metadata"
                :latest="latest"
                :filters="state.filters"
                role="grid"
                aria-label="Extension build matrix"
                @select-extension="handleSelectExtension"
              />

              <!-- List view with animation -->
              <ListView
                v-else-if="!loading && !error"
                :extensions="extensions"
                :highlighted-index="highlightedIndex"
                role="table"
                aria-label="Extension build list"
                @select-extension="handleSelectExtension"
              />
            </Transition>
          </div>
        </div>
      </main>

      <AppFooter :last-updated="lastUpdated" />

      <DetailModal
        :show="!!state.selectedExtension"
        :extension-name="state.selectedExtension"
        :extension-data="selectedExtensionData"
        :extension-meta="selectedExtensionMeta"
        @close="handleCloseModal"
      />
    </div>
  </ErrorBoundary>
</template>
