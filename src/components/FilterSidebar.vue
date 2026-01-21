<script setup lang="ts">
import { computed, ref } from 'vue'
import type { Metadata, LatestData, Filters } from '@/types'

const props = defineProps<{
  metadata: Metadata | null
  latest: LatestData | null
  filters: Filters
}>()

const emit = defineEmits<{
  'update:filters': [filters: Partial<Filters>]
  'clear-filters': []
}>()

// Collapsible sections
const expandedSections = ref<Set<string>>(new Set(['os', 'php', 'arch']))

function toggleSection(section: string) {
  if (expandedSections.value.has(section)) {
    expandedSections.value.delete(section)
  } else {
    expandedSections.value.add(section)
  }
}

const osOptions = computed(() => {
  if (!props.metadata?.osVersions) return []
  const options: { label: string; value: string; group: string }[] = []
  
  for (const [os, data] of Object.entries(props.metadata.osVersions)) {
    if (data.versions) {
      for (const version of data.versions) {
        options.push({
          label: `${version}`,
          value: `${os}|${version}`,
          group: os,
        })
      }
    }
  }
  return options
})

const phpOptions = computed(() => {
  if (!props.metadata?.phpVersions) return []
  return Object.keys(props.metadata.phpVersions).sort().map((v) => ({
    label: v,
    value: v,
  }))
})

const archOptions = computed(() => {
  return (props.metadata?.architectures || []).map((a) => ({
    label: a,
    value: a,
  }))
})

const extOptions = computed(() => {
  if (!props.latest) return []
  return Object.keys(props.latest)
    .sort()
    .map((e) => ({
      label: e,
      value: e,
    }))
})

const activeBadges = computed(() => {
  const badges: { key: string; value: string; label: string }[] = []
  props.filters.os.forEach(v => {
    const [os, ver] = v.split('|')
    badges.push({ key: 'os', value: v, label: `${os} ${ver}` })
  })
  props.filters.phpVersion.forEach(v => badges.push({ key: 'phpVersion', value: v, label: `PHP ${v}` }))
  props.filters.arch.forEach(v => badges.push({ key: 'arch', value: v, label: v }))
  props.filters.extension.forEach(v => badges.push({ key: 'extension', value: v, label: v }))
  return badges
})

const hasActiveFilters = computed(() => 
  props.filters.os.length > 0 || 
  props.filters.phpVersion.length > 0 || 
  props.filters.arch.length > 0 || 
  props.filters.extension.length > 0 ||
  props.filters.status !== 'all' ||
  props.filters.search !== ''
)

function updateFilter(key: keyof Filters, value: unknown) {
  emit('update:filters', { [key]: value })
}

function toggleArrayFilter(key: 'os' | 'phpVersion' | 'arch' | 'extension', value: string) {
  const current = props.filters[key]
  if (current.includes(value)) {
    emit('update:filters', { [key]: current.filter(v => v !== value) })
  } else {
    emit('update:filters', { [key]: [...current, value] })
  }
}

function removeFilter(key: string, value: string) {
  const filterKey = key as 'os' | 'phpVersion' | 'arch' | 'extension'
  emit('update:filters', {
    [filterKey]: props.filters[filterKey].filter((v) => v !== value),
  })
}
</script>

<template>
  <aside class="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-y-auto hidden lg:block transition-colors">
    <div class="p-4 space-y-4">
      <!-- Search -->
      <div class="relative">
        <label for="searchInput" class="sr-only">Search extensions</label>
        <input
          type="search"
          id="searchInput"
          :value="filters.search"
          @input="updateFilter('search', ($event.target as HTMLInputElement).value)"
          class="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow placeholder-gray-400 dark:placeholder-gray-500"
          placeholder="Search extensions..."
        />
        <svg class="absolute left-3 top-3 text-gray-400" width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="6" cy="6" r="5" stroke="currentColor" stroke-width="1.5" />
          <path d="M10 10l4 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
        </svg>
      </div>

      <!-- Status Filter (Pills) -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
        <div class="flex gap-1">
          <button
            v-for="opt in [{ value: 'all', label: 'All' }, { value: 'success', label: '✓ Pass' }, { value: 'failure', label: '✗ Fail' }]"
            :key="opt.value"
            @click="updateFilter('status', opt.value)"
            :class="[
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              filters.status === opt.value
                ? opt.value === 'success' ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
                : opt.value === 'failure' ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            {{ opt.label }}
          </button>
        </div>
      </div>

      <!-- OS Filter -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          @click="toggleSection('os')"
          class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Operating System</span>
          <div class="flex items-center gap-2">
            <span v-if="filters.os.length" class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ filters.os.length }}
            </span>
            <svg :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('os') && 'rotate-180']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div v-show="expandedSections.has('os')" class="max-h-48 overflow-y-auto bg-white dark:bg-gray-900">
          <div v-for="os in Object.keys(metadata?.osVersions || {})" :key="os" class="border-t border-gray-100 dark:border-gray-800">
            <div class="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 text-xs font-medium text-gray-500 dark:text-gray-400">{{ os }}</div>
            <label
              v-for="opt in osOptions.filter(o => o.group === os)"
              :key="opt.value"
              class="flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                :checked="filters.os.includes(opt.value)"
                @change="toggleArrayFilter('os', opt.value)"
                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">{{ opt.label }}</span>
            </label>
          </div>
        </div>
      </div>

      <!-- PHP Version Filter -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          @click="toggleSection('php')"
          class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">PHP Version</span>
          <div class="flex items-center gap-2">
            <span v-if="filters.phpVersion.length" class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ filters.phpVersion.length }}
            </span>
            <svg :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('php') && 'rotate-180']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div v-show="expandedSections.has('php')" class="max-h-48 overflow-y-auto p-1 bg-white dark:bg-gray-900">
          <label
            v-for="opt in phpOptions"
            :key="opt.value"
            class="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              :checked="filters.phpVersion.includes(opt.value)"
              @change="toggleArrayFilter('phpVersion', opt.value)"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">PHP {{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Architecture Filter -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          @click="toggleSection('arch')"
          class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Architecture</span>
          <div class="flex items-center gap-2">
            <span v-if="filters.arch.length" class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ filters.arch.length }}
            </span>
            <svg :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('arch') && 'rotate-180']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div v-show="expandedSections.has('arch')" class="p-1 bg-white dark:bg-gray-900">
          <label
            v-for="opt in archOptions"
            :key="opt.value"
            class="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              :checked="filters.arch.includes(opt.value)"
              @change="toggleArrayFilter('arch', opt.value)"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Extension Filter -->
      <div class="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          @click="toggleSection('ext')"
          class="w-full flex items-center justify-between px-3 py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Extension</span>
          <div class="flex items-center gap-2">
            <span v-if="filters.extension.length" class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ filters.extension.length }}
            </span>
            <svg :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('ext') && 'rotate-180']" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </button>
        <div v-show="expandedSections.has('ext')" class="max-h-48 overflow-y-auto p-1 bg-white dark:bg-gray-900">
          <label
            v-for="opt in extOptions"
            :key="opt.value"
            class="flex items-center gap-2 px-2 py-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              :checked="filters.extension.includes(opt.value)"
              @change="toggleArrayFilter('extension', opt.value)"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Active Filters -->
      <div v-if="activeBadges.length" class="space-y-2">
        <div class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Filters</div>
        <div class="flex flex-wrap gap-1.5">
          <button
            v-for="badge in activeBadges"
            :key="`${badge.key}-${badge.value}`"
            @click="removeFilter(badge.key, badge.value)"
            class="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-medium rounded-full hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors group"
          >
            {{ badge.label }}
            <svg class="w-3 h-3 opacity-60 group-hover:opacity-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <!-- Clear Filters -->
      <button
        v-if="hasActiveFilters"
        @click="$emit('clear-filters')"
        class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-2"
      >
        <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Clear All Filters
      </button>
    </div>
  </aside>
</template>
