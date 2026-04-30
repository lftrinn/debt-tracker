<template>
  <div :class="['tam-ma-card', { 'tam-ma-card--shake': isShaking }]">
    <!-- Khung góc trang trí · 4 corner brackets -->
    <div class="corners"><span></span><span></span></div>
    <div class="boss-tag">TÂM MA · FINAL BOSS</div>

    <!-- Hàng portrait + thông tin -->
    <div class="boss-row">
      <div class="boss-portrait">
        <GlyphTamMa :size="36" />
      </div>
      <div class="boss-info">
        <div class="boss-name">{{ display }}</div>
        <div class="boss-realm">{{ realm }}</div>
        <div v-if="useDisplay" class="boss-real-name">{{ real }}</div>
      </div>
    </div>

    <!-- HP bar + metadata -->
    <div class="hp-section">
      <div class="hp-row">
        <span class="lab">HP · Ma chướng</span>
        <!-- Re-mount via :key to retrigger num-flash when hp changes -->
        <span :key="'hp' + hpAnimKey" class="v num-flash">
          <template v-if="hide">●●●</template>
          <template v-else>{{ fCurrFull(hp) }}</template>
          <span class="max"> / {{ hide ? '●●●' : fmtShort(hpMax) }}</span>
        </span>
      </div>
      <div class="hp-bar"><span :style="{ width: hpPct + '%' }"></span></div>
      <div class="hp-meta">
        <span>{{ $t('boss.nextKiep') }} · <b>{{ nextDate || '—' }}</b></span>
        <span>{{ $t('boss.nextAmt') }} · <i>{{ hide ? '●●●' : fCurr(nextAmt) }}</i></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GlyphTamMa } from '@/components/ui/quest-icons'
import { useCurrency } from '@/composables/api/useCurrency'

const props = defineProps<{
  /** Tên đạo hiệu (vd. "Tâm Ma Tổng") */
  display: string
  /** Tên gốc (vd. "Tổng nợ tín dụng") — chỉ hiện khi useDisplay=true */
  real: string
  /** Cảnh giới (vd. "Hóa Thần Kỳ") */
  realm: string
  /** HP hiện tại = tổng nợ còn lại */
  hp: number
  /** HP tối đa = tổng nợ ban đầu */
  hpMax: number
  /** Ngày kì hạn kế tiếp (vd. "15.04") */
  nextDate: string
  /** Số tiền cần trả kì kế */
  nextAmt: number
  /** Privacy mode */
  hide: boolean
  /** Hiện tên gốc dưới tên đạo hiệu (tutien mode) */
  useDisplay: boolean
}>()

const { fCurr, fCurrFull } = useCurrency()

/** % HP còn lại (boss còn mạnh bao nhiêu) — clamp 0-100. */
const hpPct = computed(() => {
  if (!props.hpMax) return 0
  return Math.max(0, Math.min(100, (props.hp / props.hpMax) * 100))
})

// ─── Animation triggers · num flash + damage shake ────────────────────────
const hpAnimKey = ref(0)
const isShaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.hp,
  (newHp, oldHp) => {
    if (oldHp === undefined) return
    if (newHp === oldHp) return
    // Number flash on any change
    hpAnimKey.value++
    // Boss damage shake when HP decreases (player paid debt)
    if (newHp < oldHp) {
      isShaking.value = true
      if (shakeTimer) clearTimeout(shakeTimer)
      shakeTimer = setTimeout(() => { isShaking.value = false }, 600)
    }
  },
)

/** Format gọn số · "1.2M" / "500K". */
function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}
</script>

<style scoped>
/* ─── TÂM MA CARD · port 1:1 từ design ──────────────────────────────────── */
.tam-ma-card {
  margin-top: 14px; padding: 18px 16px 16px;
  position: relative;
  background:
    radial-gradient(circle at 50% 0%, rgba(197, 74, 90, 0.18) 0%, transparent 60%),
    linear-gradient(180deg, #221220 0%, #1a0e1a 100%);
  border: 1px solid var(--crimson);
  border-radius: 6px;
  box-shadow:
    inset 0 0 30px rgba(197, 74, 90, 0.1),
    0 0 24px rgba(197, 74, 90, 0.18),
    0 8px 28px rgba(0, 0, 0, 0.4);
  overflow: hidden;
}
.tam-ma-card::before {
  content: ''; position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle at 50% 50%,
    transparent 0%, transparent 40%,
    rgba(197, 74, 90, 0.04) 50%,
    transparent 60%);
  animation: spin 18s linear infinite;
  pointer-events: none;
}

/* Corners trang trí 4 góc */
.tam-ma-card .corners {
  position: absolute; inset: 0; pointer-events: none;
}
.tam-ma-card .corners::before,
.tam-ma-card .corners::after,
.tam-ma-card .corners > span {
  content: ''; position: absolute;
  width: 12px; height: 12px;
  border: 1px solid var(--crimson);
}
.tam-ma-card .corners::before {
  top: 4px; left: 4px; border-right: none; border-bottom: none;
}
.tam-ma-card .corners::after {
  top: 4px; right: 4px; border-left: none; border-bottom: none;
}
.tam-ma-card .corners > span:nth-child(1) {
  bottom: 4px; left: 4px; border-right: none; border-top: none;
}
.tam-ma-card .corners > span:nth-child(2) {
  bottom: 4px; right: 4px; border-left: none; border-top: none;
}

/* Tag góc trên phải */
.boss-tag {
  position: absolute; top: 10px; right: 14px;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 10px; color: var(--crimson);
  letter-spacing: 0.18em;
}
.boss-tag::before { content: '❂ '; }

/* Hàng portrait + info */
.boss-row {
  display: flex; align-items: flex-start; gap: 14px;
  position: relative; z-index: 2;
}
.boss-portrait {
  width: 64px; height: 64px; flex-shrink: 0;
  position: relative;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, #6a2540, #2a0e18 70%);
  border: 2px solid var(--crimson);
  box-shadow:
    0 0 0 1px var(--ink),
    0 0 16px rgba(197, 74, 90, 0.5);
  display: flex; align-items: center; justify-content: center;
  color: var(--crimson);
  animation: pulse-boss 2.5s ease-in-out infinite;
}
@keyframes pulse-boss {
  0%, 100% {
    box-shadow:
      0 0 0 1px var(--ink),
      0 0 16px rgba(197, 74, 90, 0.4);
  }
  50% {
    box-shadow:
      0 0 0 1px var(--ink),
      0 0 28px rgba(197, 74, 90, 0.7);
  }
}
.boss-portrait::before {
  content: ''; position: absolute; inset: -6px;
  border-radius: 50%;
  border: 1px dashed rgba(197, 74, 90, 0.6);
  animation: spin 30s linear infinite reverse;
}

.boss-info { flex: 1; min-width: 0; padding-top: 2px; }
.boss-name {
  font-family: var(--serif-vn); font-size: 13px; font-weight: 700;
  color: var(--crimson); line-height: 1.2;
  letter-spacing: 0.01em;
}
.boss-realm {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; color: var(--text-2);
  margin-top: 3px; letter-spacing: 0.04em;
}
.boss-real-name {
  font-family: var(--mono); font-size: 9.5px; color: var(--muted);
  margin-top: 4px; letter-spacing: 0.02em;
}

/* HP section */
.hp-section { margin-top: 14px; position: relative; z-index: 2; }
.hp-row {
  display: flex; justify-content: space-between; align-items: baseline;
  margin-bottom: 6px;
}
.hp-row .lab {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; color: var(--crimson);
  letter-spacing: 0.06em;
}
.hp-row .v {
  font-family: var(--mono); font-weight: 700; font-size: 14px;
  color: var(--text); letter-spacing: -0.02em;
}
.hp-row .v .max {
  color: var(--muted); font-size: 10px; font-weight: 500;
}
.hp-bar {
  height: 12px; background: var(--ink); border-radius: 6px;
  overflow: hidden; position: relative;
  border: 1px solid rgba(197, 74, 90, 0.3);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
}
.hp-bar > span {
  display: block; height: 100%;
  background: linear-gradient(180deg,
    #d96a7a 0%,
    var(--crimson) 50%,
    var(--crimson-deep) 100%);
  border-radius: 6px;
  position: relative;
  box-shadow: 0 0 12px rgba(197, 74, 90, 0.6);
  animation: hpload 1100ms cubic-bezier(0.5, 0.8, 0.3, 1);
}
.hp-bar > span::after {
  content: ''; position: absolute;
  top: 1px; left: 4px; right: 4px; height: 2px;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2px;
}
@keyframes hpload { from { width: 0 !important; } }
.hp-meta {
  display: flex; justify-content: space-between;
  margin-top: 8px;
  font-family: var(--serif-vn); font-size: 11px;
  color: var(--text-2);
}
.hp-meta b { color: var(--gold); font-weight: 600; }
.hp-meta i { color: var(--crimson); font-style: normal; }

@keyframes spin { to { transform: rotate(360deg); } }

/* ─── Damage shake · trigger khi HP giảm (player pay debt) ─────────────── */
@keyframes boss-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}
.tam-ma-card--shake { animation: boss-shake 0.6s ease-in-out; }

@media (prefers-reduced-motion: reduce) {
  .tam-ma-card::before,
  .boss-portrait,
  .boss-portrait::before,
  .hp-bar > span {
    animation: none;
  }
  .tam-ma-card--shake { animation: none; }
}
</style>
