<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ close: [] }>()
const dialog = ref<HTMLDialogElement | null>(null)
let previousOverflow: string | null = null

watch([() => props.show, dialog], ([show, element]) => {
  if (!element) return
  if (show && !element.open) {
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
  } else if (!show && element.open) {
    element.close()
    restoreScroll()
  }
}, { flush: 'post' })

function restoreScroll() {
  if (previousOverflow !== null) {
    document.body.style.overflow = previousOverflow
    previousOverflow = null
  }
}

onBeforeUnmount(() => {
  dialog.value?.close()
  restoreScroll()
})
</script>

<template>
  <dialog
    ref="dialog"
    class="app-dialog"
    @cancel.prevent="emit('close')"
    @click="($event.target === $event.currentTarget) && emit('close')"
  >
    <slot />
  </dialog>
</template>
