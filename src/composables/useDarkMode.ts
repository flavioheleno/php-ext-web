import { ref, watch } from 'vue'

// Check if user has explicitly set a preference
function hasStoredPreference(): boolean {
  if (typeof window === 'undefined') return false
  return localStorage.getItem('theme') !== null
}

// Get the current theme (stored or system)
function getTheme(): boolean {
  if (typeof window === 'undefined') return false
  
  const stored = localStorage.getItem('theme')
  if (stored !== null) {
    return stored === 'dark'
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const isDark = ref(getTheme())
const userHasPreference = ref(hasStoredPreference())

// Apply immediately on load
if (typeof document !== 'undefined') {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

// Set up system preference listener once at module load
if (typeof window !== 'undefined') {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    // Only follow system if user hasn't set a preference
    if (!userHasPreference.value) {
      isDark.value = e.matches
    }
  })
}

export function useDarkMode() {
  // Toggle and save preference (user is explicitly choosing)
  function toggle() {
    isDark.value = !isDark.value
    userHasPreference.value = true
    localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
  }

  // Set specific value and save preference
  function set(dark: boolean) {
    isDark.value = dark
    userHasPreference.value = true
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }

  // Reset to follow system preference
  function reset() {
    localStorage.removeItem('theme')
    userHasPreference.value = false
    isDark.value = window.matchMedia('(prefers-color-scheme: dark)').matches
  }

  // Apply class to document when isDark changes
  watch(isDark, (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  })

  return {
    isDark,
    userHasPreference,
    toggle,
    set,
    reset,
  }
}
