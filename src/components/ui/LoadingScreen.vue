<template>
  <div class="loading">
    <div class="loading__logo"><img :src="iconSrc" class="loading__icon-img" /></div>
    <div class="loading__title">Debt Tracker</div>
    <div class="loading__bar"><div class="loading__fill"></div></div>
    <div class="loading__msg">{{ message }}</div>
  </div>
</template>

<script setup>
const iconSrc = import.meta.env.BASE_URL + 'icon-192.png'

defineProps({
  message: { type: String, default: 'Đang tải...' },
})
</script>

<style scoped>
.loading { position: fixed; inset: 0; background: var(--bg); z-index: 999; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; }
.loading__logo { margin-bottom: 4px; }
.loading__icon-img { width: 64px; height: 64px; border-radius: 16px; display: block; }
.loading__title { font-weight: 800; font-size: 16px; letter-spacing: .05em; }
.loading__msg { font-family: var(--mono); font-size: 11px; color: var(--muted); }
.loading__bar { width: 120px; height: 2px; background: var(--border); border-radius: 99px; overflow: hidden; }
.loading__fill { height: 100%; background: var(--accent); border-radius: 99px; animation: loadbar 1.2s ease-in-out infinite; }
@keyframes loadbar { 0% { width: 0; margin-left: 0; } 50% { width: 80px; margin-left: 20px; } 100% { width: 0; margin-left: 120px; } }
</style>
