<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { formatRelativeTime } from '@/composables/useFormat'
import { useStore } from '@/composables/useStore'
import type { LatestExtension, ExtensionMeta, BuildResult } from '@/types'

const props = defineProps<{
  show: boolean
  extensionName: string | null
  extensionData: LatestExtension | null
  extensionMeta: ExtensionMeta | null
}>()

const emit = defineEmits<{
  close: []
}>()

const { loadBuilds } = useStore()
const builds = ref<BuildResult[]>([])
const loadingBuilds = ref(false)
const activeTab = ref<'overview' | 'builds' | 'history'>('overview')

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

function getBuildSortIcon(field: BuildSortField): string {
  if (buildSortField.value !== field) return '↕'
  return buildSortDir.value === 'asc' ? '↑' : '↓'
}

const sortedBuilds = computed(() => {
  return [...builds.value].sort((a, b) => {
    let cmp = 0
    switch (buildSortField.value) {
      case 'platform':
        cmp = a.platform.localeCompare(b.platform)
          || a.platform_version.localeCompare(b.platform_version, undefined, { numeric: true })
        break
      case 'php_version':
        cmp = a.php_version.localeCompare(b.php_version, undefined, { numeric: true })
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

const failedCount = computed(() => builds.value.filter(b => b.status === 'failure').length)

const successRate = computed(() => {
  if (!props.extensionData || props.extensionData.total === 0) return 0
  return Math.round((props.extensionData.pass / props.extensionData.total) * 100)
})

const statusBadgeClass = computed(() => {
  if (successRate.value === 100) return 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
  if (successRate.value === 0) return 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
  return 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800'
})

const statusText = computed(() => {
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

// Load builds when modal opens
watch(() => props.show, async (show) => {
  if (show && props.extensionData?.path) {
    loadingBuilds.value = true
    activeTab.value = 'overview'
    buildSortField.value = 'platform'
    buildSortDir.value = 'asc'
    try {
      builds.value = await loadBuilds(props.extensionData.path)
    } finally {
      loadingBuilds.value = false
    }
  }
})

function handleKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && props.show) {
    emit('close')
  }
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-200"
      leave-active-class="transition-opacity duration-200"
      enter-from-class="opacity-0"
      leave-to-class="opacity-0"
    >
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
      >
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm" @click="$emit('close')" />

        <!-- Modal content -->
        <div
          class="relative z-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl h-[90vh] sm:h-[80vh] flex flex-col modal-enter overflow-hidden"
          role="document"
          :aria-labelledby="extensionName ? 'modal-title' : undefined"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50 shrink-0">
            <div class="flex items-center gap-3 min-w-0">
              <div class="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center shrink-0">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div class="min-w-0">
                <h2 id="modal-title" class="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">{{ extensionName }}</h2>
                <div v-if="extensionData" class="text-sm text-gray-500 dark:text-gray-400">v{{ extensionData.version }}</div>
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
                <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Tabs -->
          <div class="flex border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 overflow-x-auto" role="tablist">
            <button
              @click="activeTab = 'overview'"
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

          <div class="flex-1 overflow-y-auto">
            <div v-if="!extensionData" class="flex flex-col items-center justify-center gap-4 py-12 text-gray-500 dark:text-gray-400">
              <p>Extension data not found</p>
            </div>

            <!-- Overview Tab -->
            <div v-else-if="activeTab === 'overview'" class="p-6 space-y-6">
              <!-- Stats Cards -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
                  <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">Total Builds</div>
                  <div class="text-2xl font-bold text-gray-900 dark:text-gray-100">{{ extensionData.total }}</div>
                </div>
                <div class="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 flex items-center gap-4">
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
                    <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm text-green-600 dark:text-green-400">Passed</div>
                    <div class="text-2xl font-bold text-green-700 dark:text-green-300">{{ extensionData.pass }}</div>
                  </div>
                </div>
                <div class="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 rounded-xl">
                  <div class="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-900/50 flex items-center justify-center">
                    <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <div class="text-sm text-red-600 dark:text-red-400">Failed</div>
                    <div class="text-2xl font-bold text-red-700 dark:text-red-300">{{ extensionData.fail }}</div>
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
                    <svg class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                </div>
              </div>
            </div>

            <!-- Builds Tab -->
            <div v-else-if="activeTab === 'builds'" class="h-full flex flex-col min-h-0">
              <div v-if="loadingBuilds" class="flex items-center justify-center flex-1">
                <div class="spinner"></div>
              </div>
              <div v-else-if="builds.length === 0" class="text-center flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
                No build data available
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
                          class="px-4 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <span class="inline-flex items-center gap-1">
                            OS
                            <span class="text-gray-400">{{ getBuildSortIcon('platform') }}</span>
                          </span>
                        </th>
                        <th 
                          @click="toggleBuildSort('php_version')"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <span class="inline-flex items-center gap-1 justify-center">
                            PHP
                            <span class="text-gray-400">{{ getBuildSortIcon('php_version') }}</span>
                          </span>
                        </th>
                        <th 
                          @click="toggleBuildSort('arch')"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <span class="inline-flex items-center gap-1 justify-center">
                            Arch
                            <span class="text-gray-400">{{ getBuildSortIcon('arch') }}</span>
                          </span>
                        </th>
                        <th 
                          @click="toggleBuildSort('status')"
                          class="px-4 py-2 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
                        >
                          <span class="inline-flex items-center gap-1 justify-center">
                            Status
                            <span class="text-gray-400">{{ getBuildSortIcon('status') }}</span>
                          </span>
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
                        <td class="px-4 py-2 text-gray-900 dark:text-gray-100">
                          {{ build.platform }} {{ build.platform_version }}
                        </td>
                        <td class="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs text-center">
                          {{ build.php_version }}
                        </td>
                        <td class="px-4 py-2 text-gray-600 dark:text-gray-400 font-mono text-xs text-center">
                          {{ build.arch }}
                        </td>
                        <td class="px-4 py-2 text-center">
                          <span
                            :class="[
                              'inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold',
                              build.status === 'success'
                                ? 'bg-green-100 dark:bg-green-900/50 text-green-600 dark:text-green-400'
                                : 'bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400'
                            ]"
                          >
                            {{ build.status === 'success' ? '✓ pass' : '✗ fail' }}
                          </span>
                        </td>
                        <td class="px-4 py-2 text-center">
                          <a
                            v-if="build.log_url"
                            :href="build.log_url"
                            target="_blank"
                            rel="noopener"
                            class="p-1 rounded text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors inline-flex focus:outline-none focus:ring-2 focus:ring-blue-500"
                            title="View logs"
                            aria-label="View build logs"
                          >
                            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </a>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <!-- History Tab -->
            <div v-else-if="activeTab === 'history'" class="h-full flex flex-col items-center justify-center p-6 text-center">
              <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
                <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Build History</h3>
              <p class="text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                Historical build data is not yet available. Check back later to see trends and improvements over time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
