<template>
  <div class="sticky-hdr">
    <div class="hdr">
      <div class="hdr-title">💳 Debt Tracker</div>
      <div class="hdr-r">
        <div class="hdr-date">{{ today }}</div>
        <button class="btn-ico btn-eye" :class="{ active: hideAmounts }" @click="$emit('toggle-hide')" :title="hideAmounts ? 'Hiện số tiền' : 'Ẩn số tiền'">
          <svg v-if="!hideAmounts" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
            <circle cx="12" cy="12" r="3"/>
          </svg>
          <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
            <line x1="1" y1="1" x2="23" y2="23"/>
          </svg>
        </button>
        <button class="btn-ico" @click="$emit('reload')" title="Cập nhật phiên bản mới">↻</button>
        <button class="btn-ico" @click="$emit('logout')" title="Đăng xuất">⏏</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  today: String,
  hideAmounts: Boolean,
})
defineEmits(['reload', 'logout', 'toggle-hide'])
</script>
