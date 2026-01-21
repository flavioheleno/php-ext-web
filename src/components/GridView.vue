<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, XMarkIcon, FaceFrownIcon, MinusIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { ProcessedExtension, Metadata, LatestData, Filters } from '@/types'

const props = defineProps<{
  extensions: ProcessedExtension[]
  metadata: Metadata | null
  latest: LatestData | null
  filters: Filters
}>()

defineEmits<{
  'select-extension': [name: string]
}>()

// Get filtered architectures from filters (or all if none selected)
const visibleArchitectures = computed(() => {
  if (props.filters.arch.length > 0) {
    return props.filters.arch
  }
  return props.metadata?.architectures || []
})

// Get filtered PHP versions from filters (or all if none selected)
const visiblePhpVersions = computed(() => {
  if (props.filters.phpVersion.length > 0) {
    return props.filters.phpVersion
  }
  if (!props.metadata?.phpVersions) return []
  return Object.keys(props.metadata.phpVersions).sort((a, b) => {
    if (a === 'next') return 1
    if (b === 'next') return -1
    return a.localeCompare(b, undefined, { numeric: true })
  })
})

// Get filtered OS versions grouped by OS
const visibleOsGroups = computed(() => {
  const groups: { os: string; versions: string[] }[] = []
  if (!props.metadata?.osVersions) return groups

  for (const [os, data] of Object.entries(props.metadata.osVersions)) {
    if (data.versions) {
      const filteredVersions = data.versions.filter(version => {
        if (props.filters.os.length === 0) return true
        return props.filters.os.includes(`${os}|${version}`)
      })
      if (filteredVersions.length > 0) {
        groups.push({ os, versions: filteredVersions })
      }
    }
  }
  return groups
})

// Total number of architecture columns per OS version
const archCount = computed(() => visibleArchitectures.value.length)

// Build a lookup map for quick status retrieval
function getBuildStatus(ext: ProcessedExtension, os: string, version: string, php: string, arch: string): 'success' | 'failure' | null {
  if (!ext.builds) return null
  const build = ext.builds.find(b => 
    b.platform === os && 
    b.platform_version === version && 
    b.php_version === php && 
    b.arch === arch
  )
  return build?.status || null
}

function getBuildLogUrl(ext: ProcessedExtension, os: string, version: string, php: string, arch: string): string | null {
  if (!ext.builds) return null
  const build = ext.builds.find(b => 
    b.platform === os && 
    b.platform_version === version && 
    b.php_version === php && 
    b.arch === arch
  )
  return build?.log_url || null
}

function openBuildLog(ext: ProcessedExtension, os: string, version: string, php: string, arch: string) {
  const url = getBuildLogUrl(ext, os, version, php, arch)
  if (url) {
    window.open(url, '_blank')
  }
}

function getStatusClass(status: 'success' | 'failure' | null): string {
  if (status === 'success') return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer'
  if (status === 'failure') return 'bg-red-500 hover:bg-red-600 text-white cursor-pointer'
  return 'bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 cursor-default'
}

function getCellTooltip(ext: ProcessedExtension, os: string, version: string, php: string, arch: string): string {
  const status = getBuildStatus(ext, os, version, php, arch)
  if (status === 'success') return `${ext.name} v${ext.version} - ${os} ${version} - PHP ${php} - ${arch}: Pass (click to open log)`
  if (status === 'failure') return `${ext.name} v${ext.version} - ${os} ${version} - PHP ${php} - ${arch}: Fail (click to open log)`
  return `${ext.name} v${ext.version} - ${os} ${version} - PHP ${php} - ${arch}: No data`
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
    <table class="w-full text-sm border-collapse table-fixed">
      <!-- Define column widths explicitly -->
      <colgroup>
        <col style="width: 160px" />
        <template v-for="group in visibleOsGroups" :key="`col-${group.os}`">
          <template v-for="version in group.versions" :key="`col-${group.os}-${version}`">
            <col v-for="arch in visibleArchitectures" :key="`col-${group.os}-${version}-${arch}`" style="width: 32px" />
          </template>
        </template>
        <col style="width: 80px" />
      </colgroup>
      <!-- Header Row: OS name + version combined -->
      <thead class="bg-gray-50 dark:bg-gray-800">
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <!-- Extension column header -->
          <th 
            class="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-200 dark:border-gray-700"
          >
            Extension
          </th>
          <!-- OS + version headers -->
          <template v-for="group in visibleOsGroups" :key="group.os">
            <th
              v-for="version in group.versions"
              :key="`${group.os}-${version}`"
              :colspan="archCount"
              class="py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-r border-gray-300 dark:border-gray-600 last:border-r-0"
            >
              <div class="whitespace-nowrap">{{ group.os }}</div>
              <div class="text-gray-400 font-normal font-mono text-[10px]">{{ version }}</div>
            </th>
          </template>
          <!-- PHP version column header -->
          <th 
            class="sticky right-0 z-20 bg-gray-50 dark:bg-gray-800 px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider border-l border-gray-200 dark:border-gray-700"
          >
            PHP
          </th>
        </tr>
      </thead>

      <tbody>
        <!-- Extension rows: one group per extension, one row per PHP version -->
        <template v-for="(ext, extIndex) in extensions" :key="ext.name">
          <tr 
            v-for="(php, phpIndex) in visiblePhpVersions" 
            :key="`${ext.name}-${php}`"
            :class="[
              phpIndex === 0 ? 'border-t border-gray-200 dark:border-gray-700' : '',
              extIndex % 2 === 1 ? 'bg-gray-100 dark:bg-gray-800' : ''
            ]"
          >
            <!-- Extension name (only on first PHP row) -->
            <td
              v-if="phpIndex === 0"
              :rowspan="visiblePhpVersions.length"
              :class="[
                'sticky left-0 z-10 px-4 py-2 border-r border-gray-200 dark:border-gray-700 align-middle',
                extIndex % 2 === 1 
                  ? 'bg-gray-100 dark:bg-gray-800' 
                  : 'bg-white dark:bg-gray-900'
              ]"
            >
              <button
                @click="$emit('select-extension', ext.name)"
                class="flex items-center gap-1 font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 transition-colors text-left cursor-pointer group"
              >
                {{ ext.name }}
                <ChevronRightIcon class="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
              <div class="text-xs text-gray-500 dark:text-gray-400 font-mono">v{{ ext.version }}</div>
            </td>

            <!-- Status cells for each OS/version/arch combination -->
            <template v-for="group in visibleOsGroups" :key="`${ext.name}-${php}-${group.os}`">
              <template v-for="version in group.versions" :key="`${ext.name}-${php}-${group.os}-${version}`">
                <td
                  v-for="(arch, archIndex) in visibleArchitectures"
                  :key="`${ext.name}-${php}-${group.os}-${version}-${arch}`"
                  :class="[
                    'py-1 text-center',
                    archIndex === visibleArchitectures.length - 1 
                      ? 'border-r border-gray-300 dark:border-gray-600' 
                      : 'border-r border-gray-100 dark:border-gray-800'
                  ]"
                  style="width: 32px"
                >
                  <button
                    @click="openBuildLog(ext, group.os, version, php, arch)"
                    :title="getCellTooltip(ext, group.os, version, php, arch)"
                    :class="[
                      'inline-flex items-center justify-center w-6 h-6 rounded text-xs transition-all',
                      getStatusClass(getBuildStatus(ext, group.os, version, php, arch))
                    ]"
                  >
                    <CheckIcon v-if="getBuildStatus(ext, group.os, version, php, arch) === 'success'" class="w-3 h-3 stroke-[3]" />
                    <XMarkIcon v-else-if="getBuildStatus(ext, group.os, version, php, arch) === 'failure'" class="w-3 h-3 stroke-[3]" />
                    <MinusIcon v-else class="w-3 h-3 stroke-[2]" />
                  </button>
                </td>
              </template>
            </template>

            <!-- PHP version label -->
            <td 
              :class="[
                'sticky right-0 z-10 px-3 py-1 text-center border-l border-gray-200 dark:border-gray-700',
                extIndex % 2 === 1 
                  ? 'bg-gray-100 dark:bg-gray-800' 
                  : 'bg-white dark:bg-gray-900'
              ]"
            >
              <span class="text-xs font-mono text-gray-600 dark:text-gray-400">{{ php }}</span>
            </td>
          </tr>
        </template>
      </tbody>

      <!-- Footer: Architecture labels -->
      <tfoot class="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <tr>
          <td class="sticky left-0 z-20 bg-gray-50 dark:bg-gray-800 px-4 py-2 border-r border-gray-200 dark:border-gray-700"></td>
          <template v-for="group in visibleOsGroups" :key="`foot-${group.os}`">
            <template v-for="version in group.versions" :key="`foot-${group.os}-${version}`">
              <td
                v-for="(arch, archIndex) in visibleArchitectures"
                :key="`foot-${group.os}-${version}-${arch}`"
                :class="[
                  'py-3 text-center h-20 relative',
                  archIndex === visibleArchitectures.length - 1 
                    ? 'border-r border-gray-300 dark:border-gray-600' 
                    : 'border-r border-gray-100 dark:border-gray-800'
                ]"
                style="width: 32px; min-width: 32px; max-width: 32px"
              >
                <span 
                  class="text-xs font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rotate-90"
                  style="width: max-content"
                >{{ arch }}</span>
              </td>
            </template>
          </template>
          <td class="sticky right-0 z-20 bg-gray-50 dark:bg-gray-800 px-3 py-2 border-l border-gray-200 dark:border-gray-700"></td>
        </tr>
      </tfoot>
    </table>
  </div>
</template>
