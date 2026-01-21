<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, XMarkIcon, FaceFrownIcon } from '@heroicons/vue/24/outline'
import type { ProcessedExtension, Metadata, LatestData } from '@/types'

const props = defineProps<{
  extensions: ProcessedExtension[]
  metadata: Metadata | null
  latest: LatestData | null
}>()

defineEmits<{
  'select-extension': [name: string]
}>()

const osVersions = computed(() => {
  const versions: { os: string; version: string }[] = []
  if (!props.metadata?.osVersions) return versions

  for (const [os, data] of Object.entries(props.metadata.osVersions)) {
    if (data.versions) {
      for (const version of data.versions) {
        versions.push({ os, version })
      }
    }
  }
  return versions
})

function getStatusClass(ext: ProcessedExtension): string {
  if (ext.fail === 0 && ext.pass > 0) return 'bg-green-500 hover:bg-green-600 text-white shadow-sm'
  if (ext.pass === 0 && ext.fail > 0) return 'bg-red-500 hover:bg-red-600 text-white shadow-sm'
  if (ext.pass > 0 && ext.fail > 0) return 'bg-amber-400 hover:bg-amber-500 text-white shadow-sm'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
}

type StatusType = 'success' | 'failure' | 'mixed' | 'none'

function getStatusType(ext: ProcessedExtension): StatusType {
  if (ext.fail === 0 && ext.pass > 0) return 'success'
  if (ext.pass === 0 && ext.fail > 0) return 'failure'
  if (ext.pass > 0 && ext.fail > 0) return 'mixed'
  return 'none'
}

function getTooltip(ext: ProcessedExtension): string {
  return `${ext.name}: ${ext.pass} passed, ${ext.fail} failed (${ext.successRate}%)`
}
</script>

<template>
  <div v-if="extensions.length === 0" class="flex flex-col items-center justify-center gap-4 py-16 text-gray-500 dark:text-gray-400">
    <div class="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
      <FaceFrownIcon class="w-8 h-8 text-gray-400" />
    </div>
    <h3 class="text-lg font-semibold tracking-tight text-gray-900 dark:text-gray-100">No extensions found</h3>
    <p class="text-sm text-gray-500 dark:text-gray-400 tracking-wide">Try adjusting your filters or search query</p>
  </div>

  <div v-else class="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto">
    <table class="w-full text-sm border-collapse">
      <thead class="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <tr>
          <th class="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700 min-w-[140px]">
            Extension
          </th>
          <th
            v-for="{ os, version } in osVersions"
            :key="`${os}-${version}`"
            class="px-2 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            <div class="whitespace-nowrap">{{ os }}</div>
            <div class="text-gray-400 font-normal font-mono text-[10px]">{{ version }}</div>
          </th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
        <tr v-for="ext in extensions" :key="ext.name" class="hover:bg-blue-50/30 dark:hover:bg-blue-900/20 transition-colors group">
          <td
            class="sticky left-0 z-10 bg-white dark:bg-gray-900 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 px-4 py-2 border-r border-gray-200 dark:border-gray-700 transition-colors"
          >
            <button
              @click="$emit('select-extension', ext.name)"
              class="font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left"
            >
              {{ ext.name }}
            </button>
            <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">v{{ ext.version }}</div>
          </td>
          <td
            v-for="{ os, version } in osVersions"
            :key="`${ext.name}-${os}-${version}`"
            class="px-2 py-2 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0"
          >
            <button
              @click="$emit('select-extension', ext.name)"
              :title="getTooltip(ext)"
              :class="[
                'grid-cell inline-flex items-center justify-center w-12 h-8 rounded text-xs font-bold cursor-pointer transition-all',
                getStatusClass(ext)
              ]"
            >
              <!-- Success: checkmark icon -->
              <CheckIcon v-if="getStatusType(ext) === 'success'" class="w-4 h-4 stroke-[3]" />
              <!-- Failure: X icon -->
              <XMarkIcon v-else-if="getStatusType(ext) === 'failure'" class="w-4 h-4 stroke-[3]" />
              <!-- Mixed: percentage text -->
              <span v-else-if="getStatusType(ext) === 'mixed'">{{ ext.successRate }}%</span>
              <!-- None: dash -->
              <span v-else>—</span>
            </button>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
