<template>
  <div class="loading-screen">
    <div class="loading-logo">💳</div>
    <div class="loading-title">Debt Tracker</div>
    <div class="loading-bar"><div class="loading-fill"></div></div>
    <div class="loading-msg">{{ message }}</div>
  </div>
</template>

<script setup>
defineProps({
  message: { type: String, default: 'Đang tải...' },
})
</script>
