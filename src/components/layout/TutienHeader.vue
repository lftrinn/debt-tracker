<template>
  <div class="header" role="banner">
    <!-- Avatar + ring · tap → mở Đạo Tâm (settings) -->
    <div class="avatar-wrap" @click="$emit('tap-avatar')" role="button" :title="$t('header.openSettings')">
      <div class="avatar">{{ avatarInitial }}</div>
    </div>

    <!-- Tên đạo hữu + cảnh giới · LV -->
    <div class="who">
      <div class="who-name">{{ name }}</div>
      <div class="who-class">
        {{ realm }}
        <span class="lvl-num">· LV {{ lvl }}</span>
      </div>
    </div>

    <!-- Coins pill · linh thạch -->
    <div class="coins">
      <span class="ic"><IconCoins :size="14" /></span>
      <span class="v">{{ hide ? '●●●' : coinsShort }}</span>
    </div>

    <!-- Eye btn · privacy mode toggle -->
    <div :class="['eye-btn', { on: hide }]" @click="$emit('toggle-hide')" role="button" :title="hide ? $t('header.showAmounts') : $t('header.hideAmounts')">
      <component :is="hide ? IconEyeOff : IconEye" :size="15" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IconCoins, IconEye, IconEyeOff } from '@/components/ui/quest-icons'
import { useFormatters } from '@/composables/ui/useFormatters'

const props = defineProps<{
  /** Tên hiển thị (đã được resolve theo displayMode) */
  name: string
  /** Cảnh giới (vd. "Kim Đan Kỳ") */
  realm: string
  /** Cấp tu vi */
  lvl: number
  /** Linh thạch · current cash balance (VND) */
  coins: number
  /** Privacy mode: true → ẩn số tiền */
  hide: boolean
}>()

defineEmits<{
  'tap-avatar': []
  'toggle-hide': []
}>()

const { fN } = useFormatters()

/** Initial chữ đầu của tên (uppercase) — fallback "?" */
const avatarInitial = computed(() => {
  const ch = (props.name || '?').trim().charAt(0)
  return ch ? ch.toUpperCase() : '?'
})

/** Format gọn số coins · "1.2M" / "500K" / "9.999" */
const coinsShort = computed(() => {
  const n = Math.abs(props.coins)
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(0) + 'K'
  return fN(n)
})
</script>

<style scoped>
/* ─── HEADER · port 1:1 từ design/Debt Tracker.html ─────────────────────── */
.header {
  position: sticky; top: 0; z-index: 50;
  padding: calc(env(safe-area-inset-top, 0px) + 14px) 18px 12px;
  display: flex; align-items: center; gap: 12px;
  background: rgba(12, 10, 22, 0.72);
  -webkit-backdrop-filter: blur(14px);
  backdrop-filter: blur(14px);
  border-bottom: 1px solid var(--line);
}
.header::after {
  content: ''; position: absolute; bottom: -1px; left: 50%;
  transform: translateX(-50%);
  width: 80px; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

/* ─── AVATAR + ring xoay · linh khí trận đồ ─────────────────────────────── */
.avatar-wrap {
  width: 46px; height: 46px;
  flex-shrink: 0; position: relative;
  cursor: pointer;
}
.avatar {
  width: 46px; height: 46px;
  background: radial-gradient(circle at 30% 30%, var(--gold-2), var(--gold) 50%, var(--gold-3));
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
  box-shadow:
    0 0 0 2px var(--ink),
    0 0 0 3px var(--gold),
    0 0 14px rgba(196, 164, 108, 0.3);
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 24px; color: var(--ink);
}
.avatar-wrap::before {
  content: ''; position: absolute; inset: -4px;
  border: 1px dashed rgba(196, 164, 108, 0.4);
  border-radius: 50%;
  animation: spin 24s linear infinite;
}
.avatar-wrap:active .avatar { transform: scale(0.96); }
.avatar { transition: transform 0.15s; }

@keyframes spin { to { transform: rotate(360deg); } }

@media (prefers-reduced-motion: reduce) {
  .avatar-wrap::before { animation: none; }
}

/* ─── WHO · tên + cls + lvl ─────────────────────────────────────────────── */
.who { flex: 1; min-width: 0; }
.who-name {
  font-family: var(--serif-vn); font-size: 14px; font-weight: 700;
  color: var(--text); line-height: 1.15;
  letter-spacing: 0.01em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.who-class {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 12px; color: var(--gold);
  margin-top: 2px;
  letter-spacing: 0.04em;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.who-class .lvl-num {
  font-family: var(--mono); font-style: normal; font-size: 10px;
  color: var(--jade); margin-left: 4px;
}

/* ─── COINS pill · kim nguyên bảo ───────────────────────────────────────── */
.coins {
  display: flex; align-items: center; gap: 6px; flex-shrink: 0;
  padding: 6px 10px; border: 1px solid var(--line-2);
  border-radius: 16px; background: rgba(196, 164, 108, 0.08);
}
.coins .ic { color: var(--gold); display: inline-flex; }
.coins .v {
  font-family: var(--mono); font-size: 11px; font-weight: 600;
  color: var(--gold-2); letter-spacing: -0.02em;
}

/* ─── EYE btn · privacy ─────────────────────────────────────────────────── */
.eye-btn {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--paper); border: 1px solid var(--line-2);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--muted); flex-shrink: 0;
  transition: all 0.2s;
}
.eye-btn.on {
  background: rgba(196, 164, 108, 0.15);
  border-color: var(--gold);
  color: var(--gold);
}
.eye-btn:active { transform: scale(0.92); }
</style>
