<template>
  <div class="lo-do">
    <!-- Section · Lộ Đồ Phi Thăng -->
    <SectionHeader :icon="IconMap" :title="$t('loDo.title')" />

    <!-- Map wrap with title + trail -->
    <div class="map-wrap">
      <div class="map-title">
        {{ $t('loDo.mapTitle') }}
        <span class="vn">{{ $t('loDo.mapSubtitle') }}</span>
      </div>

      <div v-if="enriched.length === 0" class="map-empty">
        {{ $t('loDo.empty') }}
      </div>

      <div v-else class="trail">
        <div
          v-for="(m, i) in enriched"
          :key="m.month"
          :class="['checkpoint', m._cls]"
        >
          <div class="checkpoint-dot">
            <IconCheck v-if="m.st === 'done'" :size="14" />
            <IconTrophy v-else-if="m._cls === 'boss-final'" :size="14" />
            <span v-else>{{ i + 1 }}</span>
          </div>
          <div class="checkpoint-card">
            <div class="checkpoint-month">
              {{ formatMonth(m.month) }} · {{ stateLabel(m).toUpperCase() }}
            </div>
            <div class="checkpoint-name">{{ formatEvent(m.ev) }}</div>
            <div v-if="m.debt != null" class="checkpoint-debt">
              <template v-if="m._cls === 'boss-final'">{{ $t('loDo.ascended') }}</template>
              <template v-else-if="hide.debt">●●●</template>
              <template v-else-if="m.st === 'done'">−{{ fCurr(m._debtPaid) }} HP</template>
              <template v-else>{{ fCurr(m.debt) }} HP</template>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Section · Tâm Pháp -->
    <SectionHeader
      :icon="IconTrophy"
      :title="$t('section.tamPhap')"
      :vn="paidCount + '/24'"
    />
    <AchievementList
      :paidCount="paidCount"
      :isOver="isOver"
      :repayPct="repayPct"
      :max="3"
    />

    <!-- Section · Tu Vi Ký Lục -->
    <SectionHeader :icon="IconChart" :title="$t('loDo.tuViTitle')" />
    <div class="set-group">
      <div class="set-row">
        <div class="set-ic"><IconFlame :size="15" /></div>
        <div class="set-body">
          <div class="set-name">{{ $t('loDo.streak') }}</div>
          <div class="set-sub">{{ $t('loDo.streakSub') }}</div>
        </div>
        <div class="set-val">{{ streakDays }} {{ $t('loDo.daysUnit') }}</div>
      </div>
      <div class="set-row">
        <div class="set-ic"><IconSword :size="15" /></div>
        <div class="set-body">
          <div class="set-name">{{ $t('loDo.totalChieu') }}</div>
          <div class="set-sub">{{ $t('loDo.totalChieuSub') }}</div>
        </div>
        <div class="set-val">{{ paidCount }} {{ $t('loDo.chieuUnit') }}</div>
      </div>
      <div class="set-row">
        <div class="set-ic"><IconTrophy :size="15" /></div>
        <div class="set-body">
          <div class="set-name">{{ $t('loDo.defeatedPct') }}</div>
          <div class="set-sub">{{ $t('loDo.defeatedSub') }}</div>
        </div>
        <div class="set-val">{{ Math.round(repayPct) }}%</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  IconMap,
  IconCheck,
  IconTrophy,
  IconChart,
  IconFlame,
  IconSword,
} from '@/components/ui/quest-icons'
import SectionHeader from '@/components/cards/SectionHeader.vue'
import AchievementList from '@/components/cards/AchievementList.vue'
import { useCurrency } from '@/composables/api/useCurrency'
import type { Milestone } from '@/types/data'

const { t } = useI18n()
const { fCurr } = useCurrency()

const props = defineProps<{
  milestones: Milestone[]
  hide: { debt: boolean; eventAmt: boolean }
  /** Số khoản đã trả (paid_obligations.length) */
  paidCount: number
  /** True khi đang vượt giới hạn ngày */
  isOver: boolean
  /** % nợ đã trả (0-100) */
  repayPct: number
  /** Số ngày streak liên tiếp không phá giới linh khí */
  streakDays: number
}>()

interface EnrichedMilestone extends Milestone {
  /** State class to apply: done/active/boss-final/'' (todo) */
  _cls: 'done' | 'active' | 'boss-final' | ''
  /** Số tiền đã trả (cho done state, = prev.debt - this.debt) */
  _debtPaid: number
}

/**
 * Enrich milestones with state class + debt-paid amount.
 * - Last milestone with debt === 0 (or near 0) → 'boss-final'
 * - 'future' state → '' (default todo styling)
 */
const enriched = computed<EnrichedMilestone[]>(() => {
  const list = props.milestones || []
  if (!list.length) return []
  // Find final boss = last milestone where debt drops to ~0
  const finalIdx = list.findIndex((m) => m.debt === 0)
  return list.map((m, i) => {
    let cls: 'done' | 'active' | 'boss-final' | ''
    if (finalIdx >= 0 && i === finalIdx) cls = 'boss-final'
    else if (m.st === 'done') cls = 'done'
    else if (m.st === 'active') cls = 'active'
    else cls = ''
    const prev = list[i - 1]
    const debtPaid =
      m.st === 'done' && prev && prev.debt != null && m.debt != null
        ? Math.max(0, prev.debt - m.debt)
        : 0
    return { ...m, _cls: cls, _debtPaid: debtPaid }
  })
})

/** "2026-04" → "04.26" */
function formatMonth(month: string): string {
  if (!month) return '—'
  const parts = month.split('-')
  if (parts.length !== 2) return month
  return parts[1] + '.' + parts[0].slice(2)
}

function stateLabel(m: EnrichedMilestone): string {
  if (m._cls === 'boss-final') return t('loDo.statePhiThang')
  if (m._cls === 'done') return t('loDo.stateDone')
  if (m._cls === 'active') return t('loDo.stateActive')
  return t('loDo.stateTodo')
}

/** Localize event text if it ends with " hết" or matches debt-free key. */
function formatEvent(ev: string): string {
  if (!ev) return ev
  if (
    ev.includes('THOÁT NỢ') ||
    ev.includes('Thoát nợ') ||
    ev.includes('DEBT FREE') ||
    ev.includes('完全返済')
  ) {
    return t('timeline.fullyDebtFree')
  }
  if (ev.endsWith(' hết')) {
    return ev.slice(0, -4) + ' ' + t('timeline.done')
  }
  return ev
}
</script>

<style scoped>
.lo-do { display: flex; flex-direction: column; }

/* ─── MAP WRAP · port từ design ─────────────────────────────────────────── */
.map-wrap {
  margin-top: 14px;
  padding: 18px 14px 14px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line-2);
  border-radius: 6px;
  position: relative;
}
.map-wrap::before {
  content: ''; position: absolute;
  top: 0; left: 50%; transform: translateX(-50%);
  width: 60%; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}

.map-title {
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 14px; color: var(--gold);
  letter-spacing: 0.1em;
  text-align: center;
  margin-bottom: 16px;
  display: flex; align-items: center; justify-content: center; gap: 12px;
  flex-wrap: wrap;
}
.map-title::before, .map-title::after {
  content: '✦'; color: var(--jade); font-style: normal;
}
.map-title .vn {
  display: block; width: 100%;
  font-family: var(--serif-vn); font-style: normal; font-weight: 500;
  font-size: 10px; color: var(--muted);
  margin-top: -8px;
  letter-spacing: 0.02em;
}

.map-empty {
  text-align: center;
  padding: 32px 12px;
  font-family: var(--serif); font-style: italic;
  font-size: 12px; color: var(--muted);
}

/* ─── TRAIL · vertical track + checkpoints ─────────────────────────────── */
.trail {
  position: relative;
  padding-left: 36px;
}
.trail::before {
  content: ''; position: absolute;
  left: 17px; top: 18px; bottom: 18px;
  border-left: 1px dashed var(--gold);
  opacity: 0.5;
}

.checkpoint {
  display: flex; align-items: flex-start; gap: 14px;
  margin-bottom: 14px;
  position: relative;
}

.checkpoint-dot {
  position: absolute; left: -36px; top: 5px;
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--paper-2);
  border: 1px solid var(--line-2);
  display: flex; align-items: center; justify-content: center;
  font-family: var(--mono); font-size: 11px; font-weight: 700;
  color: var(--muted);
  z-index: 2;
}

.checkpoint.done .checkpoint-dot {
  background: radial-gradient(circle at 30% 30%, #88dcb8, var(--jade-deep));
  border-color: var(--jade);
  color: var(--ink);
  box-shadow: 0 0 12px rgba(var(--jade-rgb), 0.4);
}

.checkpoint.active .checkpoint-dot {
  background: radial-gradient(circle at 30% 30%, var(--gold-2), var(--gold-3));
  border-color: var(--gold);
  color: var(--ink);
  box-shadow:
    0 0 0 3px rgba(var(--gold-rgb), 0.2),
    0 0 12px rgba(var(--gold-rgb), 0.5);
  animation: pulse-active 2s ease-in-out infinite;
}
@keyframes pulse-active {
  0%, 100% {
    box-shadow:
      0 0 0 3px rgba(var(--gold-rgb), 0.2),
      0 0 12px rgba(var(--gold-rgb), 0.5);
  }
  50% {
    box-shadow:
      0 0 0 6px rgba(var(--gold-rgb), 0.1),
      0 0 20px rgba(var(--gold-rgb), 0.7);
  }
}
@media (prefers-reduced-motion: reduce) {
  .checkpoint.active .checkpoint-dot { animation: none; }
}

.checkpoint.boss-final .checkpoint-dot {
  background: radial-gradient(circle at 30% 30%, #c890ff, #4a2570);
  border-color: var(--violet);
  color: var(--ink);
  box-shadow:
    0 0 0 3px rgba(var(--violet-rgb), 0.2),
    0 0 16px rgba(var(--violet-rgb), 0.6);
}

.checkpoint-card {
  flex: 1;
  padding: 9px 12px;
  background: rgba(20, 17, 31, 0.6);
  border: 1px solid var(--line);
  border-radius: 4px;
}
.checkpoint.active .checkpoint-card {
  border-color: rgba(var(--gold-rgb), 0.4);
}

.checkpoint-month {
  font-family: var(--mono); font-size: 9px;
  color: var(--gold);
  letter-spacing: 0.06em;
  font-weight: 600;
}
.checkpoint-name {
  font-family: var(--serif-vn); font-size: 13px; font-weight: 600;
  color: var(--text);
  margin-top: 4px;
  line-height: 1.2;
}
.checkpoint-debt {
  font-family: var(--mono); font-size: 10px;
  margin-top: 4px;
  color: var(--crimson);
}
.checkpoint.done .checkpoint-debt { color: var(--jade); }
.checkpoint.boss-final .checkpoint-name { color: var(--violet); }
.checkpoint.boss-final .checkpoint-debt { color: var(--violet); }
</style>
