<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatRelativeTime } from '@/composables/useFormat'
import type { ProcessedExtension } from '@/types'

const props = defineProps<{
  extensions: ProcessedExtension[]
  highlightedIndex?: number
}>()

defineEmits<{
  'select-extension': [name: string]
}>()

type SortField = 'name' | 'version' | 'successRate' | 'total' | 'updated_at'
type SortDir = 'asc' | 'desc'

const sortField = ref<SortField>('name')
const sortDir = ref<SortDir>('asc')

function toggleSort(field: SortField) {
  if (sortField.value === field) {
    sortDir.value = sortDir.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortField.value = field
    sortDir.value = field === 'name' ? 'asc' : 'desc'
  }
}

const sortedExtensions = computed(() => {
  return [...props.extensions].sort((a, b) => {
    let cmp = 0
    switch (sortField.value) {
      case 'name':
        cmp = a.name.localeCompare(b.name)
        break
      case 'version':
        cmp = a.version.localeCompare(b.version)
        break
      case 'successRate':
        cmp = a.successRate - b.successRate
        break
      case 'total':
        cmp = a.total - b.total
        break
      case 'updated_at':
        cmp = new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()
        break
    }
    return sortDir.value === 'asc' ? cmp : -cmp
  })
})

function getStatusColor(rate: number): string {
  if (rate >= 90) return 'text-green-600'
  if (rate >= 70) return 'text-amber-600'
  return 'text-red-600'
}

function getProgressColor(rate: number): string {
  if (rate >= 90) return 'bg-green-500'
  if (rate >= 70) return 'bg-amber-500'
  return 'bg-red-500'
}

function getSortIcon(field: SortField): string {
  if (sortField.value !== field) return '↕'
  return sortDir.value === 'asc' ? '↑' : '↓'
}
</script>

<template>
  <div v-if="extensions.length === 0" class="flex flex-col items-center justify-center gap-4 py-16 text-gray-500 dark:text-gray-400">
    <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <svg class="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    </div>
    <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">No extensions found</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400">Try adjusting your filters or search query</p>
  </div>

  <div v-else class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
    <table class="w-full text-sm">
      <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th 
            @click="toggleSort('name')"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
          >
            <span class="inline-flex items-center gap-1">
              Extension
              <span class="text-gray-400">{{ getSortIcon('name') }}</span>
            </span>
          </th>
          <th 
            @click="toggleSort('version')"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden sm:table-cell"
          >
            <span class="inline-flex items-center gap-1">
              Version
              <span class="text-gray-400">{{ getSortIcon('version') }}</span>
            </span>
          </th>
          <th 
            @click="toggleSort('total')"
            class="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none"
          >
            <span class="inline-flex items-center gap-1">
              Builds
              <span class="text-gray-400">{{ getSortIcon('total') }}</span>
            </span>
          </th>
          <th 
            @click="toggleSort('successRate')"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none min-w-[200px]"
          >
            <span class="inline-flex items-center gap-1">
              Success Rate
              <span class="text-gray-400">{{ getSortIcon('successRate') }}</span>
            </span>
          </th>
          <th 
            @click="toggleSort('updated_at')"
            class="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 select-none hidden md:table-cell"
          >
            <span class="inline-flex items-center gap-1">
              Updated
              <span class="text-gray-400">{{ getSortIcon('updated_at') }}</span>
            </span>
          </th>
          <th class="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider w-20"></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr
          v-for="(ext, index) in sortedExtensions"
          :key="ext.name"
          :class="[
            'transition-colors group',
            index === highlightedIndex
              ? 'bg-blue-50 dark:bg-blue-900/30'
              : 'hover:bg-blue-50/50 dark:hover:bg-blue-900/20'
          ]"
        >
          <td class="px-4 py-3">
            <button
              @click="$emit('select-extension', ext.name)"
              class="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            >
              {{ ext.name }}
            </button>
            <div class="text-xs text-gray-500 dark:text-gray-400 sm:hidden">v{{ ext.version }}</div>
          </td>
          <td class="px-4 py-3 text-gray-600 dark:text-gray-400 font-mono text-xs hidden sm:table-cell">
            {{ ext.version }}
          </td>
          <td class="px-4 py-3 text-center">
            <div class="inline-flex items-center gap-1.5">
              <span class="text-green-600 dark:text-green-400 font-medium">{{ ext.pass }}</span>
              <span class="text-gray-400">/</span>
              <span class="text-red-600 dark:text-red-400 font-medium">{{ ext.fail }}</span>
            </div>
          </td>
          <td class="px-4 py-3">
            <div class="flex items-center gap-3">
              <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <div
                  :class="['h-full rounded-full transition-all', getProgressColor(ext.successRate)]"
                  :style="{ width: `${ext.successRate}%` }"
                />
              </div>
              <span :class="['text-sm font-semibold tabular-nums w-12 text-right', getStatusColor(ext.successRate)]">
                {{ ext.successRate }}%
              </span>
            </div>
          </td>
          <td class="px-4 py-3 text-gray-500 dark:text-gray-400 text-sm hidden md:table-cell">
            {{ formatRelativeTime(ext.updated_at) }}
          </td>
          <td class="px-4 py-3 text-center">
            <button
              @click="$emit('select-extension', ext.name)"
              class="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors opacity-0 group-hover:opacity-100"
              title="View details"
            >
              <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
