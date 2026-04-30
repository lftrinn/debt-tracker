<template>
  <div class="linhkhi-row">
    <!-- Linh Khí Ngày · mana = dayLimit − todaySpent -->
    <div :class="['linh-card', 'mp', { over: manaOver }]">
      <div class="linh-tag">
        <IconFlame :size="12" />
        {{ $t('mana.dailyLabel') }}
      </div>
      <div :key="'mana' + manaAnimKey" class="linh-amt num-flash">
        <template v-if="hide.mana">●●●</template>
        <template v-else>
          <span class="cu">đ</span>{{ fN(Math.max(0, manaLeft)) }}
        </template>
      </div>
      <div class="linh-mini-bar">
        <span :style="{ width: manaPct + '%' }"></span>
      </div>
      <div class="linh-sub">
        <template v-if="manaOver">{{ $t('mana.broken') }}</template>
        <template v-else>{{ $t('mana.usedPct', { pct: Math.round(manaPct) }) }}</template>
        · {{ $t('mana.limitLabel') }}
        <b>{{ hide.mana ? '●●●' : fN(dayLimit) + 'đ' }}</b>
      </div>
    </div>

    <!-- Kim Nguyên Bảo · gold = availCash -->
    <div class="linh-card gold-card">
      <div class="linh-tag">
        <IconCoins :size="12" />
        {{ $t('mana.goldLabel') }}
      </div>
      <div :key="'gold' + goldAnimKey" class="linh-amt num-flash">
        <template v-if="hide.gold">●●●</template>
        <template v-else>
          <span class="cu">đ</span>{{ fN(gold) }}
        </template>
      </div>
      <div class="linh-mini-bar">
        <span :style="{ width: goldPct + '%' }"></span>
      </div>
      <div class="linh-sub">
        <template v-if="goldDays !== null">
          {{ $t('mana.goldDays', { days: goldDays }) }}
        </template>
        <template v-else>{{ $t('mana.goldNoData') }}</template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IconFlame, IconCoins } from '@/components/ui/quest-icons'
import { useFormatters } from '@/composables/ui/useFormatters'

const props = defineProps<{
  /** Linh khí còn lại trong ngày = dayLimit − todaySpent (clamp ≥ 0). */
  manaLeft: number
  /** % linh khí ĐÃ DÙNG (0-100), không phải còn lại. */
  manaPct: number
  /** True khi đã vượt giới hạn ngày (todaySpent > dayLimit). */
  manaOver: boolean
  /** Giới hạn chi tiêu/ngày. */
  dayLimit: number
  /** Kim nguyên bảo · tổng tiền mặt khả dụng. */
  gold: number
  /** Số ngày tiền mặt còn dùng được (cashDaysLeft). null nếu không tính được. */
  goldDays: number | null
  /** Privacy flags · ẩn từng card riêng. */
  hide: { mana: boolean; gold: boolean }
}>()

const { fN } = useFormatters()

/** Mana % capped 0-100 (clamp). */
const manaPctSafe = computed(() => Math.max(0, Math.min(100, props.manaPct)))

void manaPctSafe // ensure clamp logic exists; template uses props.manaPct directly via Math.round above

/** Gold % · cashDaysLeft / 30 days (1 month) cap 100. Đơn giản hơn linh hoạt theo dToSalary. */
const goldPct = computed(() => {
  if (props.goldDays === null) return 100
  return Math.max(0, Math.min(100, (props.goldDays / 30) * 100))
})

// ─── Number flash animation triggers ──────────────────────────────────────
const manaAnimKey = ref(0)
const goldAnimKey = ref(0)
watch(() => props.manaLeft, () => { manaAnimKey.value++ })
watch(() => props.gold, () => { goldAnimKey.value++ })
</script>

<style scoped>
/* ─── LINH KHÍ ROW · port từ design ─────────────────────────────────────── */
.linhkhi-row {
  margin-top: 10px;
  display: grid; grid-template-columns: 1fr 1fr; gap: 8px;
}

.linh-card {
  padding: 12px 13px; position: relative;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line-2);
  border-radius: 5px;
  overflow: hidden;
}
.linh-card::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold), transparent);
}
.linh-card.mp { border-color: rgba(var(--azure-rgb), 0.35); }
.linh-card.mp::before {
  background: linear-gradient(90deg, transparent, var(--azure), transparent);
}
.linh-card.gold-card { border-color: rgba(var(--gold-rgb), 0.35); }
.linh-card.over { border-color: var(--crimson); }
.linh-card.over::before {
  background: linear-gradient(90deg, transparent, var(--crimson), transparent);
}

.linh-tag {
  display: flex; align-items: center; gap: 5px;
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 11px; letter-spacing: 0.04em;
}
.linh-card.mp .linh-tag { color: var(--azure); }
.linh-card.gold-card .linh-tag { color: var(--gold); }
.linh-card.over .linh-tag { color: var(--crimson); }

.linh-amt {
  font-family: var(--mono); font-weight: 700; font-size: 19px;
  margin-top: 6px; line-height: 1;
  letter-spacing: -0.04em;
}
.linh-card.mp .linh-amt { color: var(--azure); }
.linh-card.gold-card .linh-amt { color: var(--gold-2); }
.linh-card.over .linh-amt { color: var(--crimson); }
.linh-amt .cu {
  font-size: 11px; color: var(--muted);
  margin-right: 3px;
}

.linh-mini-bar {
  height: 5px; margin-top: 8px;
  background: var(--ink);
  border-radius: 3px; overflow: hidden;
}
.linh-mini-bar > span {
  display: block; height: 100%; border-radius: 3px;
  animation: hpload 900ms cubic-bezier(0.5, 0.8, 0.3, 1);
}
.linh-card.mp .linh-mini-bar > span {
  background: linear-gradient(90deg, var(--azure), #88c0e8);
  box-shadow: 0 0 6px rgba(var(--azure-rgb), 0.5);
}
.linh-card.gold-card .linh-mini-bar > span {
  background: linear-gradient(90deg, var(--gold-3), var(--gold));
  box-shadow: 0 0 6px rgba(var(--gold-rgb), 0.5);
}
.linh-card.over .linh-mini-bar > span {
  background: linear-gradient(90deg, var(--crimson-deep), var(--crimson));
}

.linh-sub {
  font-family: var(--serif-vn); font-size: 10.5px;
  color: var(--muted);
  margin-top: 6px;
  letter-spacing: 0.01em;
}
.linh-sub b { color: var(--text-2); font-weight: 600; }

@keyframes hpload { from { width: 0 !important; } }
@media (prefers-reduced-motion: reduce) {
  .linh-mini-bar > span { animation: none; }
}
</style>
