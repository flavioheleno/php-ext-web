<script setup lang="ts">
import { HeartIcon } from '@heroicons/vue/24/solid'
import { formatRelativeTime } from '@/composables/useFormat'

defineProps<{
  lastUpdated?: string
}>()
</script>

<template>
  <footer class="bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 py-4 px-6 transition-colors">
    <div class="flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500 dark:text-gray-400">
      <div class="flex items-center gap-4">
        <span v-if="lastUpdated" class="text-xs tracking-wide">
          Last updated: {{ formatRelativeTime(lastUpdated) }}
        </span>
      </div>
      <div class="flex items-center gap-4">
        <span class="hidden sm:flex items-center gap-2 text-xs">
          <span class="kbd">/</span> search
          <span class="kbd">j</span><span class="kbd">k</span> navigate
          <span class="kbd">esc</span> close
        </span>
        <a
          href="https://flavioheleno.com"
          target="_blank"
          rel="noopener"
          class="text-xs tracking-wide hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          Built with <HeartIcon class="w-3.5 h-3.5 inline text-red-500 -mt-0.5" /> by Flavio Heleno
        </a>
      </div>
    </div>
  </footer>
</template>
