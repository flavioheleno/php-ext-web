<script setup lang="ts">
import { computed } from 'vue'
import { ArchiveBoxIcon, CheckIcon, XMarkIcon, Squares2X2Icon, Bars4Icon, MagnifyingGlassIcon } from '@heroicons/vue/24/outline'

const props = defineProps<{
  total: number
  pass: number
  fail: number
  successRate: number
  currentView: 'grid' | 'list'
  search: string
}>()

const emit = defineEmits<{
  'update:view': [view: 'grid' | 'list']
  'update:search': [search: string]
}>()

const rateColorClass = computed(() => {
  if (props.successRate >= 90) return 'text-green-600'
  if (props.successRate >= 70) return 'text-amber-600'
  return 'text-red-600'
})

const rateStrokeColor = computed(() => {
  if (props.successRate >= 90) return '#22c55e'
  if (props.successRate >= 70) return '#f59e0b'
  return '#ef4444'
})
</script>

<template>
  <div class="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 sm:px-6 py-4 transition-colors">
    <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <!-- Stats -->
      <div class="flex flex-wrap items-center gap-4 sm:gap-6">
        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
            <ArchiveBoxIcon class="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-semibold tabular-nums text-gray-900 dark:text-white">{{ total.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Total</div>
          </div>
        </div>

        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <CheckIcon class="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-semibold tabular-nums text-green-600 dark:text-green-400">{{ pass.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Passed</div>
          </div>
        </div>

        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <XMarkIcon class="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-semibold tabular-nums text-red-600 dark:text-red-400">{{ fail.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Failed</div>
          </div>
        </div>

        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <!-- Success Rate with Progress Ring -->
        <div class="flex items-center gap-2">
          <div class="relative w-10 h-10">
            <svg class="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" class="stroke-gray-200 dark:stroke-gray-700" stroke-width="3" />
              <circle
                cx="18" cy="18" r="15" fill="none"
                :stroke="rateStrokeColor"
                stroke-width="3"
                stroke-linecap="round"
                :stroke-dasharray="`${successRate * 0.94} 100`"
              />
            </svg>
          </div>
          <div>
            <div :class="['text-xl sm:text-2xl font-semibold tabular-nums', rateColorClass]">{{ successRate }}%</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider font-medium">Success</div>
          </div>
        </div>
      </div>

      <!-- Search and View Switcher -->
      <div class="flex items-center gap-3 self-start sm:self-auto">
        <!-- Search Input -->
        <div class="relative">
          <label for="searchInput" class="sr-only">Search extensions</label>
          <input
            type="search"
            id="searchInput"
            :value="search"
            @input="emit('update:search', ($event.target as HTMLInputElement).value)"
            class="w-48 sm:w-56 pl-9 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
            placeholder="Search extensions..."
          />
          <MagnifyingGlassIcon class="absolute left-3 top-2 w-4 h-4 text-gray-400" />
        </div>

        <!-- View Switcher -->
        <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
          <button
            @click="emit('update:view', 'grid')"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              currentView === 'grid'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
            title="Grid view"
          >
            <Squares2X2Icon class="w-4 h-4" />
            <span class="hidden sm:inline">Grid</span>
          </button>
          <button
            @click="emit('update:view', 'list')"
            :class="[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
              currentView === 'list'
                ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            ]"
            title="List view"
          >
            <Bars4Icon class="w-4 h-4" />
            <span class="hidden sm:inline">List</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
