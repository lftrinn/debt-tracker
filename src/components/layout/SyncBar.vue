<template>
  <div ref="el" class="sync-bar">
    <div class="sync-bar__dot" :class="`sync-bar__dot--${status}`"></div>
    <span>{{ message }}</span>
    <template v-if="syncTime">
      <span class="sync-bar__sep">·</span>
      <span>{{ syncTime }}</span>
    </template>
    <span class="sync-bar__sep">·</span>
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

<style scoped>
.sync-bar { display: flex; align-items: center; gap: 8px; padding: 7px 12px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; margin-bottom: 14px; font-family: var(--mono); font-size: 10px; color: var(--muted); }
.sync-bar__dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.sync-bar__dot--syncing { background: var(--accent); animation: pulse 1s infinite; }
.sync-bar__dot--synced { background: var(--accent3); }
.sync-bar__dot--error { background: var(--accent2); }
.sync-bar__sep { color: var(--border); margin: 0 2px; }
</style>
