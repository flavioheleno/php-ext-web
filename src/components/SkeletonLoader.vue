<script setup lang="ts">
defineProps<{
  type: 'list' | 'grid' | 'stats' | 'filters'
  count?: number
}>()
</script>

<template>
  <!-- Stats Skeleton -->
  <div v-if="type === 'stats'" class="grid grid-cols-2 md:grid-cols-4 gap-4">
    <div v-for="i in 4" :key="i" class="bg-white dark:bg-gray-900 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
      <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-2"></div>
      <div class="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
    </div>
  </div>

  <!-- Filters Skeleton -->
  <div v-else-if="type === 'filters'" class="space-y-4">
    <div class="h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
    <div v-for="i in 4" :key="i" class="h-12 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse"></div>
  </div>

  <!-- List Skeleton -->
  <div v-else-if="type === 'list'" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div class="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex gap-4">
        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in (count || 8)" :key="i" class="px-4 py-3 flex items-center gap-4">
        <div class="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div class="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse"></div>
        <div class="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  </div>

  <!-- Grid Skeleton -->
  <div v-else-if="type === 'grid'" class="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
    <div class="bg-gray-50 dark:bg-gray-800 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <div class="flex gap-8">
        <div class="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div v-for="i in 6" :key="i" class="h-4 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
    <div class="divide-y divide-gray-100 dark:divide-gray-800">
      <div v-for="i in (count || 8)" :key="i" class="px-4 py-2 flex items-center gap-4">
        <div class="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
        <div v-for="j in 6" :key="j" class="h-8 w-12 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
      </div>
    </div>
  </div>
</template>
