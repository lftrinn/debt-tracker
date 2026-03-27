<template>
  <div ref="el" class="sync-bar">
    <div class="sync-dot" :class="status"></div>
    <span>{{ message }}</span>
    <template v-if="syncTime">
      <span class="sync-sep">·</span>
      <span>{{ syncTime }}</span>
    </template>
    <span class="sync-sep">·</span>
    <span>{{ today }}</span>
  </div>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  status: String,
  message: String,
  syncTime: String,
  today: String,
})

const el = ref(null)
defineExpose({ el })
</script>
