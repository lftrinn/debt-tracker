<template>
  <div
    :class="['tam-ma-card', `tier-${tier.key}`, { 'tam-ma-card--shake': isShaking }]"
    :style="tierStyle"
  >
    <!-- 4 corner brackets -->
    <div class="corners"><span></span><span></span></div>

    <!-- Tier-specific aura layer -->
    <div class="tier-aura" :data-aura="tier.aura"></div>

    <!-- Tier classn + rank tag -->
    <div class="boss-tag">❂ {{ tier.classn }} · {{ tier.rank }}</div>

    <!-- Hàng portrait + thông tin -->
    <div class="boss-row">
      <div class="boss-portrait">
        <div class="boss-portrait-glow"></div>
        <component :is="Portrait" :size="52" />
        <!-- 9-pip danger meter -->
        <div class="danger-pips">
          <span v-for="i in 9" :key="i" :class="{ on: i <= tier.danger }"></span>
        </div>
      </div>
      <div class="boss-info">
        <div class="boss-name">{{ display }}</div>
        <div class="boss-realm">{{ tier.realm }} · cấp {{ tier.danger }}</div>
        <div v-if="useDisplay" class="boss-real-name">{{ real }}</div>
      </div>
    </div>

    <!-- HP bar + metadata -->
    <div class="hp-section">
      <div class="hp-row">
        <span class="lab">HP · Ma chướng</span>
        <span :key="'hp' + hpAnimKey" class="v num-flash">
          <template v-if="hide"><span class="masked">{{ MASK_GLYPHS }}</span></template>
          <template v-else>{{ fCurrFull(hp) }}</template>
          <span class="max"> / {{ hide ? MASK_SHORT : fmtShort(hpMax) }}</span>
        </span>
      </div>
      <div class="hp-bar"><span :style="{ width: hpPct + '%' }"></span></div>
      <div class="hp-meta">
        <span>{{ $t('boss.nextKiep') }} · <b>{{ nextDate || '—' }}</b></span>
        <span>{{ $t('boss.nextAmt') }} · <i>{{ hide ? MASK_SHORT : fCurr(nextAmt) }}</i></span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useCurrency } from '@/composables/api/useCurrency'
import { TIER_PORTRAITS } from '@/components/ui/quest-bosses'
import { MASK_GLYPHS, MASK_SHORT } from '@/composables/ui/usePrivacy'
import type { BossTier } from '@/composables/data/useBossTiers'

const props = defineProps<{
  /** Tên đạo hiệu (vd. "Tâm Ma Tổng") */
  display: string
  /** Tên gốc (vd. "Tổng nợ tín dụng") — chỉ hiện khi useDisplay=true */
  real: string
  /** Boss tier descriptor — drives color, aura, portrait, danger pips. */
  tier: BossTier
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

/** CSS vars truyền vào tier-aware styles. */
const tierStyle = computed(() => ({
  '--tier-color': props.tier.color,
  '--tier-glow': props.tier.glow,
}))

/** Portrait component lookup. */
const Portrait = computed(() => TIER_PORTRAITS[props.tier.key])

/** % HP còn lại — clamp 0-100. */
const hpPct = computed(() => {
  if (!props.hpMax) return 0
  return Math.max(0, Math.min(100, (props.hp / props.hpMax) * 100))
})

const hpAnimKey = ref(0)
const isShaking = ref(false)
let shakeTimer: ReturnType<typeof setTimeout> | null = null

watch(
  () => props.hp,
  (newHp, oldHp) => {
    if (oldHp === undefined) return
    if (newHp === oldHp) return
    hpAnimKey.value++
    if (newHp < oldHp) {
      isShaking.value = true
      if (shakeTimer) clearTimeout(shakeTimer)
      shakeTimer = setTimeout(() => { isShaking.value = false }, 600)
    }
  },
)

function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}
</script>

<style scoped>
/* ─── TÂM MA CARD · tier-aware port từ design ─────────────────────────── */
.tam-ma-card {
  margin-top: 14px; padding: 18px 16px 16px;
  position: relative;
  background:
    radial-gradient(circle at 50% 0%, color-mix(in srgb, var(--tier-color, var(--crimson)) 18%, transparent) 0%, transparent 60%),
    linear-gradient(180deg, color-mix(in srgb, var(--tier-color, var(--crimson)) 12%, var(--ink)) 0%, var(--ink) 100%);
  border: 1px solid var(--tier-color, var(--crimson));
  border-radius: 6px;
  box-shadow:
    inset 0 0 30px color-mix(in srgb, var(--tier-color, var(--crimson)) 12%, transparent),
    0 0 28px color-mix(in srgb, var(--tier-color, var(--crimson)) 22%, transparent),
    0 8px 28px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  color: var(--tier-color, var(--crimson));
}
.tam-ma-card::before {
  content: ''; position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: radial-gradient(circle at 50% 50%,
    transparent 0%, transparent 40%,
    color-mix(in srgb, var(--tier-color, var(--crimson)) 4%, transparent) 50%,
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
  border: 1px solid var(--tier-color, var(--crimson));
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

/* ─── TIER AURA · 8 patterns via data-aura ─────────────────────────────── */
.tier-aura {
  position: absolute; inset: 0; pointer-events: none; z-index: 0; opacity: 0.7;
}
.tier-aura[data-aura="rune"]::before,
.tier-aura[data-aura="rune-violet"]::before {
  content: ''; position: absolute; inset: 12px;
  border-radius: 50%;
  background: conic-gradient(from 0deg,
    transparent 0deg, color-mix(in srgb, var(--tier-color) 15%, transparent) 60deg,
    transparent 120deg, color-mix(in srgb, var(--tier-color) 12%, transparent) 240deg,
    transparent 360deg);
  animation: spin 14s linear infinite;
  filter: blur(12px);
}
.tier-aura[data-aura="flame"]::before {
  content: ''; position: absolute;
  bottom: -10px; left: 50%; transform: translateX(-50%);
  width: 70%; height: 60%; border-radius: 50% 50% 0 0;
  background: radial-gradient(ellipse at 50% 100%,
    color-mix(in srgb, var(--tier-glow) 35%, transparent) 0%, transparent 65%);
  animation: pulse-boss 2.4s ease-in-out infinite;
}
.tier-aura[data-aura="chains"]::before {
  content: ''; position: absolute; inset: 0;
  background:
    radial-gradient(circle at 12% 20%, var(--tier-color) 0 1.5px, transparent 2px),
    radial-gradient(circle at 88% 30%, var(--tier-color) 0 1.5px, transparent 2px),
    radial-gradient(circle at 8% 80%, var(--tier-color) 0 1.5px, transparent 2px),
    radial-gradient(circle at 92% 75%, var(--tier-color) 0 1.5px, transparent 2px);
  opacity: 0.5;
}
.tier-aura[data-aura="crown"]::before {
  content: ''; position: absolute; inset: 0;
  background: repeating-conic-gradient(from 0deg at 50% 50%,
    transparent 0deg, transparent 28deg,
    color-mix(in srgb, var(--tier-glow) 20%, transparent) 30deg, transparent 32deg);
  animation: spin 28s linear infinite;
  opacity: 0.6;
}
.tier-aura[data-aura="starfield"]::before,
.tier-aura[data-aura="cosmos"]::before {
  content: ''; position: absolute; inset: 0;
  background-image:
    radial-gradient(1px 1px at 18% 24%, var(--tier-glow), transparent 60%),
    radial-gradient(1px 1px at 76% 18%, var(--tier-glow), transparent 60%),
    radial-gradient(1px 1px at 32% 78%, var(--tier-glow), transparent 60%),
    radial-gradient(1px 1px at 88% 64%, var(--tier-glow), transparent 60%),
    radial-gradient(1.5px 1.5px at 50% 40%, var(--tier-glow), transparent 70%);
  animation: drift 20s linear infinite;
  opacity: 0.7;
}
.tier-aura[data-aura="cosmos"]::after {
  content: ''; position: absolute; inset: -20%; border-radius: 50%;
  background: radial-gradient(circle at 50% 50%,
    color-mix(in srgb, var(--tier-color) 15%, transparent) 0%,
    transparent 50%);
  animation: pulse-boss 4s ease-in-out infinite;
}
.tier-aura[data-aura="dots"]::before {
  content: ''; position: absolute; inset: 0;
  background-image: radial-gradient(circle, var(--tier-color) 0 1px, transparent 1.5px);
  background-size: 14px 14px;
  opacity: 0.18;
}

/* Tag góc trên phải */
.boss-tag {
  position: absolute; top: 10px; right: 14px; z-index: 3;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 10px; color: var(--tier-color, var(--crimson));
  letter-spacing: 0.14em;
  text-shadow: 0 0 8px color-mix(in srgb, var(--tier-color) 50%, transparent);
}

/* Hàng portrait + info */
.boss-row {
  display: flex; align-items: flex-start; gap: 14px;
  position: relative; z-index: 2;
}
.boss-portrait {
  width: 76px; height: 76px; flex-shrink: 0;
  position: relative;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%,
    color-mix(in srgb, var(--tier-color) 50%, var(--ink)),
    color-mix(in srgb, var(--tier-color) 12%, var(--ink)) 70%);
  border: 2px solid var(--tier-color);
  box-shadow:
    0 0 0 1px var(--ink),
    0 0 18px color-mix(in srgb, var(--tier-glow) 60%, transparent);
  display: flex; align-items: center; justify-content: center;
  color: var(--tier-color);
  animation: pulse-boss 2.5s ease-in-out infinite;
}
.boss-portrait-glow {
  position: absolute; inset: -10%; border-radius: 50%;
  background: radial-gradient(circle at 50% 50%,
    color-mix(in srgb, var(--tier-glow) 35%, transparent) 0%, transparent 65%);
  animation: pulse-boss 2.4s ease-in-out infinite;
  pointer-events: none;
}
@keyframes pulse-boss {
  0%, 100% {
    box-shadow:
      0 0 0 1px var(--ink),
      0 0 16px color-mix(in srgb, var(--tier-glow) 50%, transparent);
  }
  50% {
    box-shadow:
      0 0 0 1px var(--ink),
      0 0 30px color-mix(in srgb, var(--tier-glow) 80%, transparent);
  }
}
.boss-portrait::before {
  content: ''; position: absolute; inset: -6px;
  border-radius: 50%;
  border: 1px dashed color-mix(in srgb, var(--tier-color) 70%, transparent);
  animation: spin 30s linear infinite reverse;
}

/* Danger pips · 9 dots dưới portrait */
.danger-pips {
  position: absolute; bottom: -10px; left: 50%; transform: translateX(-50%);
  display: flex; gap: 2px; z-index: 3;
}
.danger-pips span {
  width: 4px; height: 4px; border-radius: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.danger-pips span.on {
  background: var(--tier-color);
  box-shadow: 0 0 5px color-mix(in srgb, var(--tier-glow) 80%, transparent);
}

.boss-info { flex: 1; min-width: 0; padding-top: 2px; }
.boss-name {
  font-family: var(--serif-vn); font-size: 17px; font-weight: 700;
  color: var(--tier-color); line-height: 1.2;
  letter-spacing: 0.01em;
  text-shadow: 0 0 12px color-mix(in srgb, var(--tier-glow) 60%, transparent);
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
  border: 1px solid color-mix(in srgb, var(--tier-color) 30%, transparent);
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.4);
}
.hp-bar > span {
  display: block; height: 100%;
  background: linear-gradient(180deg,
    color-mix(in srgb, var(--tier-glow) 80%, var(--tier-color)) 0%,
    var(--tier-color) 50%,
    color-mix(in srgb, var(--tier-color) 70%, #000) 100%);
  border-radius: 6px;
  position: relative;
  box-shadow: 0 0 12px color-mix(in srgb, var(--tier-glow) 60%, transparent);
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
.hp-meta i { color: var(--tier-color); font-style: normal; }

@keyframes spin { to { transform: rotate(360deg); } }
@keyframes drift {
  from { transform: translate3d(0, 0, 0); }
  to   { transform: translate3d(-10%, 6%, 0); }
}

/* ─── Damage shake · trigger khi HP giảm ──────────────────────────────── */
@keyframes boss-shake {
  0%, 100% { transform: translateX(0); }
  10%, 30%, 50%, 70%, 90% { transform: translateX(-3px); }
  20%, 40%, 60%, 80% { transform: translateX(3px); }
}
.tam-ma-card--shake { animation: boss-shake 0.6s ease-in-out; }

@media (prefers-reduced-motion: reduce) {
  .tam-ma-card::before,
  .tier-aura::before,
  .tier-aura::after,
  .boss-portrait,
  .boss-portrait-glow,
  .boss-portrait::before,
  .hp-bar > span {
    animation: none;
  }
  .tam-ma-card--shake { animation: none; }
}
</style>
