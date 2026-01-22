<script setup lang="ts">
import { computed, ref } from 'vue'
import { CheckIcon, XMarkIcon, ChevronDownIcon, TrashIcon } from '@heroicons/vue/24/outline'
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
const expandedSections = ref<Set<string>>(new Set(['os', 'php', 'arch', 'ext']))

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

// Count selected items for each filter (for badge display)
const selectedCounts = computed(() => ({
  os: props.filters.os.length === 0 ? osOptions.value.length : props.filters.os.length,
  phpVersion: props.filters.phpVersion.length === 0 ? phpOptions.value.length : props.filters.phpVersion.length,
  arch: props.filters.arch.length === 0 ? archOptions.value.length : props.filters.arch.length,
  extension: props.filters.extension.length === 0 ? extOptions.value.length : props.filters.extension.length,
}))

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

// Check if an item is effectively selected (empty = all selected)
function isSelected(key: 'os' | 'phpVersion' | 'arch' | 'extension', value: string): boolean {
  const current = props.filters[key]
  return current.length === 0 || current.includes(value)
}

// Get all values for a filter type
function getAllValues(key: 'os' | 'phpVersion' | 'arch' | 'extension'): string[] {
  switch (key) {
    case 'os': return osOptions.value.map(o => o.value)
    case 'phpVersion': return phpOptions.value.map(o => o.value)
    case 'arch': return archOptions.value.map(o => o.value)
    case 'extension': return extOptions.value.map(o => o.value)
  }
}

function toggleArrayFilter(key: 'os' | 'phpVersion' | 'arch' | 'extension', value: string) {
  const current = props.filters[key]
  const allValues = getAllValues(key)
  
  if (current.length === 0) {
    // Empty means all selected, so uncheck = select all except this one
    emit('update:filters', { [key]: allValues.filter(v => v !== value) })
  } else if (current.includes(value)) {
    const newValues = current.filter(v => v !== value)
    // If unchecking would leave all selected, reset to empty
    if (newValues.length === 0) {
      emit('update:filters', { [key]: [] })
    } else {
      emit('update:filters', { [key]: newValues })
    }
  } else {
    const newValues = [...current, value]
    // If checking completes the set, reset to empty (all selected)
    if (newValues.length === allValues.length) {
      emit('update:filters', { [key]: [] })
    } else {
      emit('update:filters', { [key]: newValues })
    }
  }
}

// Get all OS version values for a specific OS
function getOsVersionValues(os: string): string[] {
  return osOptions.value.filter(o => o.group === os).map(o => o.value)
}

// Check if all versions of an OS are selected
function isOsSelected(os: string): boolean {
  const osVersions = getOsVersionValues(os)
  return osVersions.every(v => isSelected('os', v))
}

// Toggle all versions of an OS
function toggleOsGroup(os: string) {
  const osVersions = getOsVersionValues(os)
  const allValues = getAllValues('os')
  const current = props.filters.os
  
  if (isOsSelected(os)) {
    // Uncheck all versions of this OS
    if (current.length === 0) {
      // All selected, so select all except this OS's versions
      emit('update:filters', { os: allValues.filter(v => !osVersions.includes(v)) })
    } else {
      // Remove this OS's versions from selection
      const newValues = current.filter(v => !osVersions.includes(v))
      emit('update:filters', { os: newValues.length === 0 ? [] : newValues })
    }
  } else {
    // Check all versions of this OS
    if (current.length === 0) {
      // All were selected, this shouldn't happen since isOsSelected would be true
      emit('update:filters', { os: [] })
    } else {
      // Add all versions of this OS
      const newValues = [...new Set([...current, ...osVersions])]
      if (newValues.length === allValues.length) {
        emit('update:filters', { os: [] })
      } else {
        emit('update:filters', { os: newValues })
      }
    }
  }
}
</script>

<template>
  <aside class="w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 overflow-y-auto hidden lg:block transition-colors">
    <div class="p-4 space-y-4">
      <!-- Status Filter (Pills) -->
      <div class="space-y-2">
        <label class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</label>
        <div class="flex gap-1">
          <button
            @click="updateFilter('status', 'all')"
            :class="[
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all',
              filters.status === 'all'
                ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400 ring-1 ring-blue-200 dark:ring-blue-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            All
          </button>
          <button
            @click="updateFilter('status', 'success')"
            :class="[
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1',
              filters.status === 'success'
                ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <CheckIcon class="w-3 h-3 stroke-[3]" />
            Pass
          </button>
          <button
            @click="updateFilter('status', 'failure')"
            :class="[
              'flex-1 px-3 py-1.5 text-xs font-medium rounded-lg transition-all inline-flex items-center justify-center gap-1',
              filters.status === 'failure'
                ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 ring-1 ring-red-200 dark:ring-red-800'
                : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            ]"
          >
            <XMarkIcon class="w-3 h-3 stroke-[3]" />
            Fail
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
            <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ selectedCounts.os }}
            </span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('os') && 'rotate-180']" />
          </div>
        </button>
        <div v-show="expandedSections.has('os')" class="max-h-48 overflow-y-auto bg-white dark:bg-gray-900">
          <div v-for="os in Object.keys(metadata?.osVersions || {})" :key="os" class="border-t border-gray-100 dark:border-gray-800">
            <label class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
              <input
                type="checkbox"
                :checked="isOsSelected(os)"
                @change="toggleOsGroup(os)"
                class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
              />
              <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">{{ os }}</span>
            </label>
            <label
              v-for="opt in osOptions.filter(o => o.group === os)"
              :key="opt.value"
              class="flex items-center gap-2 px-3 py-1.5 pl-7 hover:bg-blue-50 dark:hover:bg-blue-900/30 cursor-pointer transition-colors"
            >
              <input
                type="checkbox"
                :checked="isSelected('os', opt.value)"
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
            <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ selectedCounts.phpVersion }}
            </span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('php') && 'rotate-180']" />
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
              :checked="isSelected('phpVersion', opt.value)"
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
            <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ selectedCounts.arch }}
            </span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('arch') && 'rotate-180']" />
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
              :checked="isSelected('arch', opt.value)"
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
            <span class="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 text-xs font-medium rounded">
              {{ selectedCounts.extension }}
            </span>
            <ChevronDownIcon :class="['w-4 h-4 text-gray-400 transition-transform', expandedSections.has('ext') && 'rotate-180']" />
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
              :checked="isSelected('extension', opt.value)"
              @change="toggleArrayFilter('extension', opt.value)"
              class="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 bg-white dark:bg-gray-700"
            />
            <span class="text-sm text-gray-700 dark:text-gray-300 font-mono">{{ opt.label }}</span>
          </label>
        </div>
      </div>

      <!-- Clear Filters -->
      <button
        v-if="hasActiveFilters"
        @click="$emit('clear-filters')"
        class="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg border border-gray-300 dark:border-gray-600 transition-colors flex items-center justify-center gap-2"
      >
        <TrashIcon class="w-4 h-4" />
        Clear All Filters
      </button>
    </div>
  </aside>
</template>
