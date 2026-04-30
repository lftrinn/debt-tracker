<template>
  <div class="quest-list">
    <div
      v-for="q in visibleItems"
      :key="q._key"
      :class="['kiep-card', { urgent: q._isUrg, done: q.paid }]"
      @click="!q.paid && $emit('open-detail', q)"
    >
      <div class="kiep-icon">
        <component :is="q.paid ? IconCheck : q._sprite" :size="18" />
      </div>
      <div class="kiep-body">
        <div class="kiep-name">{{ q._displayName }}</div>
        <div class="kiep-meta">
          <span v-if="q.paid" class="pill done">{{ $t('quest.pillDone') }}</span>
          <span v-else-if="q._isUrg" class="pill urg">
            {{ $t('quest.pillUrgent', { days: q._daysLabel }) }}
          </span>
          <span v-else class="pill due">
            {{ $t('quest.pillDue', { days: q._daysLabel }) }}
          </span>
          <span>· {{ q._dueShort }}</span>
        </div>
      </div>
      <div class="kiep-reward">
        <div class="amt">
          <template v-if="hide">●●●</template>
          <template v-else>{{ fCurr(q.amt) }}</template>
        </div>
        <div class="xp">+{{ q._xp }} tu vi</div>
      </div>
    </div>

    <div v-if="visibleItems.length === 0" class="quest-empty">
      <IconLotus :size="22" />
      <span>{{ $t('quest.empty') }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, type FunctionalComponent } from 'vue'
import {
  IconCheck,
  IconBill,
  IconIngot,
  IconLotus,
  SPRITE,
  type IconProps,
} from '@/components/ui/quest-icons'
import { useCurrency } from '@/composables/api/useCurrency'
import { categoryFor } from '@/composables/data/useTutienNames'
import type { UpcomingItem } from '@/types/data'

const props = defineProps<{
  /** Mảng upcoming items từ useDebtData. */
  items: UpcomingItem[]
  /** Privacy mode · ẩn amount + xp. */
  hide: boolean
  /** Số item tối đa hiển thị (mặc định 4 theo design). */
  max?: number
}>()

defineEmits<{
  'open-detail': [item: UpcomingItem]
}>()

const { fCurr } = useCurrency()

interface QuestEnriched extends UpcomingItem {
  _displayName: string
  _sprite: FunctionalComponent<IconProps>
  _isUrg: boolean
  _daysLabel: string
  _dueShort: string
  _xp: number
}

/** Tính số ngày kể từ hôm nay đến _date — âm = trễ, dương = còn. */
function daysFromToday(dateStr: string): number {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return 0
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - today.getTime()) / 86400000)
}

/** Format date "2026-04-15" → "15.04" (theo design). */
function fmtDueShort(dateStr: string): string {
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}.${mm}`
}

/** Tính sprite component theo category — fallback IconBill. */
function spriteFor(category: string | null | undefined): FunctionalComponent<IconProps> {
  if (!category) return IconBill
  // _category của upcoming có thể là 'debt_minimum' / 'installment' / 'one_time'
  if (category === 'debt_minimum' || category === 'installment') return IconIngot
  if (category === 'one_time') return IconBill
  // Fallback: dùng category mapping (an → food → IconRice etc.)
  const cat = categoryFor(category)
  return SPRITE[cat.sp] ?? IconBill
}

/** XP reward heuristic: tỉ lệ với amount (50k → 1xp, 5M → 100xp). */
function xpFor(amt: number): number {
  return Math.max(10, Math.min(200, Math.floor(amt / 50_000)))
}

/** Items đã enrich với display, sprite, days, dueShort, xp. */
const visibleItems = computed<QuestEnriched[]>(() => {
  const max = props.max ?? 4
  return props.items.slice(0, max).map((item) => {
    const days = daysFromToday(item._date)
    const isUrg = item.urg === 'overdue' || item.urg === 'urgent'
    const daysLabel =
      days < 0 ? `${Math.abs(days)}` : `${days}`
    return {
      ...item,
      _displayName: item.name,
      _sprite: spriteFor(item._category),
      _isUrg: isUrg,
      _daysLabel: daysLabel,
      _dueShort: fmtDueShort(item._date),
      _xp: xpFor(item.amt),
    }
  })
})
</script>

<style scoped>
/* ─── KIEP CARD · port từ design ────────────────────────────────────────── */
.quest-list {
  display: flex; flex-direction: column;
  gap: 0;
}

.kiep-card {
  display: flex; align-items: center; gap: 12px;
  padding: 12px 13px;
  margin-bottom: 7px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line);
  border-radius: 5px;
  position: relative;
  cursor: pointer;
  transition: transform 0.15s, border-color 0.2s, box-shadow 0.3s;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.kiep-card::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 3px;
  background: var(--gold);
}
.kiep-card:active { transform: translateX(2px); }

.kiep-card.urgent::before { background: var(--crimson); }
.kiep-card.urgent {
  border-color: rgba(var(--crimson-rgb), 0.4);
  animation: urgent-glow 2s ease-in-out infinite;
}
@keyframes urgent-glow {
  0%, 100% { box-shadow: 0 0 0 rgba(var(--crimson-rgb), 0); }
  50% { box-shadow: 0 0 14px rgba(var(--crimson-rgb), 0.3); }
}
@media (prefers-reduced-motion: reduce) {
  .kiep-card.urgent { animation: none; }
}

.kiep-card.done { opacity: 0.45; }
.kiep-card.done::before { background: var(--jade); }

/* Icon vòng tròn radial */
.kiep-icon {
  width: 38px; height: 38px; flex-shrink: 0;
  background: radial-gradient(circle at 30% 30%, var(--paper-3), var(--ink));
  border: 1px solid var(--line-2);
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: var(--gold);
}
.kiep-card.urgent .kiep-icon {
  color: var(--crimson);
  border-color: rgba(var(--crimson-rgb), 0.4);
}
.kiep-card.done .kiep-icon {
  color: var(--jade);
  border-color: var(--jade);
  background: radial-gradient(circle at 30% 30%, rgba(var(--jade-rgb), 0.2), transparent);
}

/* Body · name + meta */
.kiep-body { flex: 1; min-width: 0; }
.kiep-name {
  font-family: var(--serif-vn); font-size: 13px; font-weight: 600;
  color: var(--text); line-height: 1.2;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.kiep-meta {
  display: flex; gap: 6px; align-items: center;
  margin-top: 4px;
  font-family: var(--mono); font-size: 9.5px;
  color: var(--muted);
}
.kiep-meta .pill {
  padding: 2px 6px;
  border-radius: 2px;
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 9.5px; letter-spacing: 0.05em;
}
.kiep-meta .pill.urg {
  background: rgba(var(--crimson-rgb), 0.15);
  color: var(--crimson);
}
.kiep-meta .pill.due {
  background: rgba(var(--gold-rgb), 0.12);
  color: var(--gold);
}
.kiep-meta .pill.done {
  background: rgba(var(--jade-rgb), 0.12);
  color: var(--jade);
}

/* Reward · amt + xp */
.kiep-reward {
  text-align: right; flex-shrink: 0;
}
.kiep-reward .amt {
  font-family: var(--mono); font-weight: 700; font-size: 13px;
  color: var(--gold-2);
  letter-spacing: -0.02em;
}
.kiep-reward .xp {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 10px; color: var(--violet);
  margin-top: 2px; letter-spacing: 0.04em;
}

/* Empty state */
.quest-empty {
  display: flex; align-items: center; justify-content: center;
  gap: 8px;
  padding: 24px 12px;
  font-family: var(--serif); font-style: italic;
  font-size: 12px; color: var(--muted);
  border: 1px dashed var(--line);
  border-radius: 5px;
}
.quest-empty :deep(svg) { color: var(--jade); opacity: 0.7; }
</style>
