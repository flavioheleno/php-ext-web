<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'

const props = defineProps<{
  items: any[]
  itemHeight: number
  overscan?: number
}>()

const containerRef = ref<HTMLElement | null>(null)
const scrollTop = ref(0)
const containerHeight = ref(0)

const overscan = computed(() => props.overscan ?? 5)

const totalHeight = computed(() => props.items.length * props.itemHeight)

const visibleRange = computed(() => {
  const start = Math.max(0, Math.floor(scrollTop.value / props.itemHeight) - overscan.value)
  const visibleCount = Math.ceil(containerHeight.value / props.itemHeight) + overscan.value * 2
  const end = Math.min(props.items.length, start + visibleCount)
  return { start, end }
})

const visibleItems = computed(() => {
  return props.items.slice(visibleRange.value.start, visibleRange.value.end).map((item, index) => ({
    item,
    index: visibleRange.value.start + index
  }))
})

const offsetY = computed(() => visibleRange.value.start * props.itemHeight)

function handleScroll(e: Event) {
  const target = e.target as HTMLElement
  scrollTop.value = target.scrollTop
}

function updateContainerHeight() {
  if (containerRef.value) {
    containerHeight.value = containerRef.value.clientHeight
  }
}

onMounted(() => {
  updateContainerHeight()
  window.addEventListener('resize', updateContainerHeight)
})

onUnmounted(() => {
  window.removeEventListener('resize', updateContainerHeight)
})

watch(() => props.items, () => {
  nextTick(updateContainerHeight)
})

defineExpose({ containerRef })
</script>

<template>
  <div
    ref="containerRef"
    class="overflow-y-auto"
    @scroll="handleScroll"
  >
    <div :style="{ height: `${totalHeight}px`, position: 'relative' }">
      <div :style="{ transform: `translateY(${offsetY}px)` }">
        <slot
          v-for="{ item, index } in visibleItems"
          :key="index"
          :item="item"
          :index="index"
        />
      </div>
    </div>
  </div>
</template>
