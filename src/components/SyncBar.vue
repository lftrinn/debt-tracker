<template>
  <div class="sync-bar">
    <div class="sync-dot" :class="status"></div>
    <span>{{ message }}</span>
  </div>
</template>

<script setup>
defineProps({
  status: String,
  message: String,
})
</script>
