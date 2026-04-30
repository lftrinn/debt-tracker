<template>
  <div class="achievement-list">
    <div v-for="a in unlocked" :key="a.id" class="tampahp">
      <div class="tampahp-medal"><IconTrophy :size="16" /></div>
      <div class="tampahp-body">
        <div class="tampahp-name">{{ a.display }}</div>
        <div class="tampahp-desc">{{ a.desc }}</div>
      </div>
    </div>

    <div v-if="unlocked.length === 0" class="tampahp tampahp--locked">
      <div class="tampahp-medal"><IconTrophy :size="16" /></div>
      <div class="tampahp-body">
        <div class="tampahp-name">{{ $t('achievement.lockedName') }}</div>
        <div class="tampahp-desc">{{ $t('achievement.lockedDesc') }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { IconTrophy } from '@/components/ui/quest-icons'

const props = defineProps<{
  /** Số khoản đã trả (paid_obligations.length) */
  paidCount: number
  /** True khi đang vượt giới hạn ngày */
  isOver: boolean
  /** % nợ đã trả (0-100) */
  repayPct: number
  /** Tối đa số achievement hiển thị (mặc định 2 theo design) */
  max?: number
}>()

const { t } = useI18n()

interface Achievement {
  id: string
  display: string
  desc: string
  unlocked: boolean
}

/** Toàn bộ achievement có thể đạt — Phase 2 derived từ state hiện tại. */
const all = computed<Achievement[]>(() => [
  {
    id: 'first-strike',
    display: t('achievement.firstStrike.name'),
    desc: t('achievement.firstStrike.desc'),
    unlocked: props.paidCount > 0,
  },
  {
    id: 'no-overspend-today',
    display: t('achievement.beQuan.name'),
    desc: t('achievement.beQuan.desc'),
    unlocked: !props.isOver,
  },
  {
    id: 'quarter-paid',
    display: t('achievement.quarterPaid.name'),
    desc: t('achievement.quarterPaid.desc'),
    unlocked: props.repayPct >= 25,
  },
])

/** Chỉ hiển thị những cái đã unlock. */
const unlocked = computed(() => {
  const max = props.max ?? 2
  return all.value.filter((a) => a.unlocked).slice(0, max)
})
</script>

<style scoped>
/* ─── TAMPAHP · port từ design ─────────────────────────────────────────── */
.achievement-list {
  display: flex; flex-direction: column; gap: 0;
}

.tampahp {
  display: flex; align-items: center; gap: 12px;
  padding: 11px 13px;
  margin-bottom: 7px;
  background: linear-gradient(90deg,
    rgba(var(--gold-rgb), 0.12),
    rgba(var(--violet-rgb), 0.05) 80%);
  border: 1px solid var(--line-2);
  border-radius: 5px;
  position: relative;
}
.tampahp::before {
  content: ''; position: absolute;
  left: 0; top: 0; bottom: 0; width: 2px;
  background: linear-gradient(180deg, var(--gold), var(--violet));
}

.tampahp--locked { opacity: 0.55; }
.tampahp--locked .tampahp-medal {
  background: radial-gradient(circle at 30% 30%, var(--paper-3), var(--ink));
  color: var(--muted);
  box-shadow: none;
}

.tampahp-medal {
  width: 36px; height: 36px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%, var(--gold-2), var(--gold-3));
  border: 1px solid var(--ink);
  box-shadow:
    0 0 0 1px var(--gold),
    0 0 12px rgba(var(--gold-rgb), 0.3);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  color: var(--ink);
}

.tampahp-body { flex: 1; min-width: 0; }
.tampahp-name {
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 13px; color: var(--gold);
  letter-spacing: 0.04em;
}
.tampahp--locked .tampahp-name { color: var(--muted); }
.tampahp-desc {
  font-family: var(--serif-vn); font-size: 10.5px;
  color: var(--text-2);
  margin-top: 3px;
}
</style>
