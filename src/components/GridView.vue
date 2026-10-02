<script setup lang="ts">
import { computed } from 'vue'
import { CheckIcon, XMarkIcon, FaceFrownIcon, MinusIcon, ChevronRightIcon } from '@heroicons/vue/24/outline'
import type { ProcessedExtension, Metadata, LatestData, Filters } from '@/types'

const props = defineProps<{
  extensions: ProcessedExtension[]
  metadata: Metadata | null
  latest: LatestData | null
  filters: Filters
  highlightedName?: string
}>()

defineEmits<{ 'select-extension': [name: string] }>()

const sortedExtensions = computed(() => [...props.extensions].sort((a, b) => a.name.localeCompare(b.name)))
const visibleArchitectures = computed(() => props.filters.arch === null ? []
  : props.filters.arch.length ? props.filters.arch : props.metadata?.architectures || [])
const visiblePhpVersions = computed(() => {
  if (props.filters.phpVersion === null) return []
  return [...(props.filters.phpVersion.length ? props.filters.phpVersion : Object.keys(props.metadata?.phpVersions || {}))]
    .sort((a, b) => a === 'next' ? 1 : b === 'next' ? -1 : a.localeCompare(b, undefined, { numeric: true }))
})
const visibleOsGroups = computed(() => Object.entries(props.metadata?.osVersions || {})
  .map(([os, data]) => ({
    os,
    versions: data.versions.filter(version => props.filters.os !== null
      && (!props.filters.os.length || props.filters.os.includes(`${os}|${version}`))),
  })).filter(group => group.versions.length))

const buildMaps = computed(() => new Map(props.extensions.map(ext => [ext.name,
  new Map((ext.builds || []).map(build => [
    `${build.platform}|${build.platform_version}|${build.php_version}|${build.arch}`, build,
  ])),
])))

function getBuild(ext: ProcessedExtension, os: string, version: string, php: string, arch: string) {
  return buildMaps.value.get(ext.name)?.get(`${os}|${version}|${php}|${arch}`)
}

function getCellLabel(ext: ProcessedExtension, os: string, version: string, php: string, arch: string) {
  const build = getBuild(ext, os, version, php, arch)
  const status = build ? build.status === 'success' ? 'Pass' : 'Fail' : ext.builds ? 'No data' : 'Loading'
  return `${ext.name} v${ext.version} - ${os} ${version} - PHP ${php} - ${arch}: ${status}${build?.log_url ? ' (open log)' : ''}`
}
</script>

<template>
  <div v-if="extensions.length === 0" class="flex flex-col items-center justify-center gap-4 py-16 text-gray-500 dark:text-gray-400">
    <FaceFrownIcon class="w-12 h-12" />
    <h2 class="text-lg font-semibold text-gray-900 dark:text-gray-100">No extensions found</h2>
    <p class="text-sm">Try adjusting your filters or search query</p>
  </div>
  <div v-else>
    <div class="flex flex-wrap items-center gap-4 mb-3 text-xs text-gray-700 dark:text-gray-300" aria-label="Build status legend">
      <span class="inline-flex items-center gap-1"><CheckIcon class="w-4 h-4 text-green-700 dark:text-green-400" /> Pass</span>
      <span class="inline-flex items-center gap-1"><XMarkIcon class="w-4 h-4 text-red-700 dark:text-red-400" /> Fail</span>
      <span class="inline-flex items-center gap-1"><MinusIcon class="w-4 h-4" /> No data</span>
      <span class="sm:ml-auto">Scroll horizontally to compare environments</span>
    </div>
    <div class="max-h-[60vh] overflow-auto overscroll-contain bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700" tabindex="0" aria-label="Scrollable extension build matrix">
      <table class="w-max min-w-full text-sm border-separate border-spacing-0" aria-label="Extension build matrix">
        <colgroup>
          <col class="w-28 sm:w-40" />
          <template v-for="group in visibleOsGroups" :key="group.os">
            <template v-for="version in group.versions" :key="version">
              <col v-for="arch in visibleArchitectures" :key="arch" class="w-16" />
            </template>
          </template>
          <col class="w-14" />
        </colgroup>
        <thead>
          <tr class="h-14">
            <th rowspan="2" scope="col" class="sticky top-0 left-0 z-30 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-left text-xs text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700">Extension</th>
            <template v-for="group in visibleOsGroups" :key="group.os">
              <th v-for="version in group.versions" :key="version" :colspan="visibleArchitectures.length" scope="colgroup" class="sticky top-0 z-20 bg-gray-50 dark:bg-gray-800 px-2 py-2 text-xs text-gray-600 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
                <div>{{ group.os }}</div><div class="font-normal font-mono">{{ version }}</div>
              </th>
            </template>
            <th rowspan="2" scope="col" class="sticky top-0 right-0 z-30 bg-gray-50 dark:bg-gray-800 px-3 text-xs text-gray-600 dark:text-gray-300 border-b border-l border-gray-200 dark:border-gray-700">PHP</th>
          </tr>
          <tr class="h-9">
            <template v-for="group in visibleOsGroups" :key="group.os">
              <template v-for="version in group.versions" :key="version">
                <th v-for="arch in visibleArchitectures" :key="arch" scope="col" class="sticky top-14 z-20 bg-gray-50 dark:bg-gray-800 px-1 py-2 text-[11px] font-mono font-normal text-gray-600 dark:text-gray-300 border-b border-r border-gray-200 dark:border-gray-700">{{ arch }}</th>
              </template>
            </template>
          </tr>
        </thead>
        <tbody>
          <template v-for="(ext, extIndex) in sortedExtensions" :key="ext.name">
            <tr v-for="(php, phpIndex) in visiblePhpVersions" :key="`${ext.name}-${php}`" :class="ext.name === highlightedName ? 'bg-blue-50 dark:bg-blue-900/30' : extIndex % 2 ? 'bg-gray-50 dark:bg-gray-800' : ''">
              <th v-if="phpIndex === 0" :rowspan="visiblePhpVersions.length" scope="rowgroup" :class="['sticky left-0 z-10 px-3 py-2 text-left font-normal border-r border-t border-gray-200 dark:border-gray-700', ext.name === highlightedName ? 'bg-blue-50 dark:bg-blue-900' : extIndex % 2 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900']">
                <button @click="$emit('select-extension', ext.name)" :data-extension="ext.name" class="flex items-center gap-1 max-w-40 break-words text-left font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-700 dark:hover:text-blue-300">
                  {{ ext.name }}<ChevronRightIcon class="w-4 h-4 shrink-0" />
                </button>
                <div class="text-xs font-mono text-gray-500 dark:text-gray-400 break-all">v{{ ext.version }}</div>
              </th>
              <template v-for="group in visibleOsGroups" :key="group.os">
                <template v-for="version in group.versions" :key="version">
                  <td v-for="arch in visibleArchitectures" :key="arch" class="px-2 py-1 text-center border-r border-gray-100 dark:border-gray-700">
                    <component
                      :is="getBuild(ext, group.os, version, php, arch)?.log_url ? 'a' : 'span'"
                      :href="getBuild(ext, group.os, version, php, arch)?.log_url || undefined"
                      :target="getBuild(ext, group.os, version, php, arch)?.log_url ? '_blank' : undefined"
                      rel="noopener"
                      :title="getCellLabel(ext, group.os, version, php, arch)"
                      :aria-label="getCellLabel(ext, group.os, version, php, arch)"
                      :class="['inline-flex items-center justify-center w-8 h-8 rounded',
                        getBuild(ext, group.os, version, php, arch)?.status === 'success' ? 'bg-green-600 text-white hover:bg-green-700'
                          : getBuild(ext, group.os, version, php, arch)?.status === 'failure' ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400']"
                    >
                      <CheckIcon v-if="getBuild(ext, group.os, version, php, arch)?.status === 'success'" class="w-4 h-4" />
                      <XMarkIcon v-else-if="getBuild(ext, group.os, version, php, arch)?.status === 'failure'" class="w-4 h-4" />
                      <MinusIcon v-else class="w-4 h-4" />
                    </component>
                  </td>
                </template>
              </template>
              <th scope="row" :class="['sticky right-0 z-10 px-3 py-1 font-normal text-xs font-mono text-gray-600 dark:text-gray-300 border-l border-gray-200 dark:border-gray-700', extIndex % 2 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900']">{{ php }}</th>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>
