<template>
  <div v-if="show" class="lvlup" role="status" aria-live="polite">
    ⚔ {{ $t('toast.levelUp') }} · LV {{ level }}
  </div>
</template>

<script setup lang="ts">
defineProps<{
  /** True khi cần hiển thị toast. Parent quản lý timing (auto-hide sau 2.6s). */
  show: boolean
  /** Cấp độ mới sau khi đột phá. */
  level: number
}>()
</script>

<style scoped>
/* Toast self-styled — không scoped để luôn dùng class .lvlup global. */
</style>
