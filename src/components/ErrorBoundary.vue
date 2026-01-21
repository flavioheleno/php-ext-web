<script setup lang="ts">
import { ref, onMounted, onUnmounted, provide } from 'vue'

const error = ref<Error | null>(null)
const hasError = ref(false)

function handleError(err: Error) {
  error.value = err
  hasError.value = true
  console.error('Error boundary caught:', err)
}

function reset() {
  error.value = null
  hasError.value = false
}

function reloadPage() {
  window.location.reload()
}

// Provide error handler to children
provide('errorHandler', handleError)

// Global error handler for uncaught errors
function onError(event: ErrorEvent) {
  handleError(event.error)
  event.preventDefault()
}

function onUnhandledRejection(event: PromiseRejectionEvent) {
  handleError(new Error(event.reason))
  event.preventDefault()
}

onMounted(() => {
  window.addEventListener('error', onError)
  window.addEventListener('unhandledrejection', onUnhandledRejection)
})

onUnmounted(() => {
  window.removeEventListener('error', onError)
  window.removeEventListener('unhandledrejection', onUnhandledRejection)
})

defineExpose({ handleError, reset })
</script>

<template>
  <div v-if="hasError" class="min-h-[400px] flex items-center justify-center p-8">
    <div class="text-center max-w-md">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <svg class="w-8 h-8 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      </div>
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Something went wrong</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-4">
        {{ error?.message || 'An unexpected error occurred' }}
      </p>
      <div class="flex gap-3 justify-center">
        <button
          @click="reset"
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Try Again
        </button>
        <button
          @click="reloadPage"
          class="px-4 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors"
        >
          Reload Page
        </button>
      </div>
      <details class="mt-4 text-left">
        <summary class="text-xs text-gray-400 cursor-pointer hover:text-gray-600 dark:hover:text-gray-300">
          Technical details
        </summary>
        <pre class="mt-2 p-3 bg-gray-100 dark:bg-gray-800 rounded text-xs text-gray-600 dark:text-gray-400 overflow-auto max-h-32">{{ error?.stack || error?.message }}</pre>
      </details>
    </div>
  </div>
  <slot v-else />
</template>
