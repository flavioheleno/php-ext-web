<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  total: number
  pass: number
  fail: number
  successRate: number
  currentView: 'grid' | 'list'
}>()

const emit = defineEmits<{
  'update:view': [view: 'grid' | 'list']
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
            <svg class="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{{ total.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total</div>
          </div>
        </div>

        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900/30 flex items-center justify-center">
            <svg class="w-5 h-5 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">{{ pass.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Passed</div>
          </div>
        </div>

        <div class="h-8 w-px bg-gray-200 dark:bg-gray-700 hidden sm:block" />

        <div class="flex items-center gap-2">
          <div class="w-10 h-10 rounded-lg bg-red-50 dark:bg-red-900/30 flex items-center justify-center">
            <svg class="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <div class="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400">{{ fail.toLocaleString() }}</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Failed</div>
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
            <div :class="['text-xl sm:text-2xl font-bold', rateColorClass]">{{ successRate }}%</div>
            <div class="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wide">Success</div>
          </div>
        </div>
      </div>

      <!-- View Switcher -->
      <div class="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1 self-start sm:self-auto">
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
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
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
          <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          <span class="hidden sm:inline">List</span>
        </button>
      </div>
    </div>
  </div>
</template>
