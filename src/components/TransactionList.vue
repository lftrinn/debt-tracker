<template>
  <div class="card">
    <div class="c-hdr" style="margin-bottom:12px">
      <span class="c-title">
        {{ $t('transactions.title') }}
        <span class="trend-ico" :class="txTrend">
          <Icon v-if="txTrend === 'up'" name="trending-up" :size="12" />
          <Icon v-else-if="txTrend === 'down'" name="trending-down" :size="12" />
          <Icon v-else name="minus" :size="12" />
        </span>
      </span>
      <span class="badge">{{ transactions.length }}</span>
    </div>
    <div v-if="txTrend !== 'neutral'" class="tx-list__trend">
      <template v-if="hide">Thu +••••• · Chi -•••••</template>
      <template v-else-if="txTrend === 'up'">Thu +{{ fCurr(todayIncome) }} · Chi -{{ fCurr(todaySpent) }}</template>
      <template v-else>Chi -{{ fCurr(todaySpent) }} · Thu +{{ fCurr(todayIncome) }}</template>
    </div>
    <div class="tx-list__list" :class="{ 'tx-list__list--scroll': transactions.length > 4 }">
      <div v-if="!transactions.length" class="tx-list__empty">{{ $t('transactions.empty') }}</div>
      <div
        v-for="e in transactions"
        :key="e.id"
        class="tx-list__item"
        :class="e.type === 'inc' ? 'tx-list__item--inc' : 'tx-list__item--exp'"
        @click="$emit('open-detail', e)"
      >
        <div class="tx-list__item-icon"><Icon :name="resolveCat(e.cat).icon" :size="16" /></div>
        <div class="tx-list__item-info">
          <div class="tx-list__item-name">{{ e.desc }}</div>
          <div class="tx-list__item-meta">{{ fDate(e.date) }} · {{ e.type === 'inc' ? $t('transactions.income') : $t('transactions.expense') }}{{ e.payMethod && e.payMethod !== 'cash' ? ' · 💳' : '' }}</div>
        </div>
        <div :style="{
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          fontWeight: '700',
          flexShrink: '0',
          color: e.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)',
        }">
          <template v-if="hide"><span class="masked">•••••</span></template>
          <template v-else>{{ e.type === 'inc' ? '+' : '-' }}{{ fCurr(e.amount) }}</template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { useCategories } from '../composables/useCategories'
import { useCurrency } from '../composables/useCurrency'

const { fDate } = useFormatters()
const { resolveCat } = useCategories()
const { fCurr } = useCurrency()

defineProps({
  transactions: Array,
  hide: Boolean,
  txTrend: String,
  todaySpent: Number,
  todayIncome: Number,
})

defineEmits(['open-detail'])
</script>

<style scoped>
.tx-list__trend { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-bottom: 8px; padding: 0 2px; }
.tx-list__list { margin-top: 11px; display: flex; flex-direction: column; gap: 6px; }
.tx-list__list--scroll { max-height: calc(4 * 52px + 3 * 6px); overflow-y: auto; padding-right: 2px; scroll-snap-type: y mandatory; }
.tx-list__list--scroll > .tx-list__item { scroll-snap-align: start; }
.tx-list__item { display: flex; align-items: center; gap: 10px; padding: 10px 11px; background: var(--surface2); border-radius: 9px; border: 1px solid transparent; border-left: 3px solid transparent; animation: si .2s ease; transition: background .15s, border-color .2s; cursor: pointer; -webkit-tap-highlight-color: transparent; }
.tx-list__item--exp { border-left-color: var(--accent2); }
.tx-list__item--exp .tx-list__item-icon { background: rgba(var(--accent2-rgb),.12); color: var(--accent2); }
.tx-list__item--inc { border-left-color: var(--accent3); }
.tx-list__item--inc .tx-list__item-icon { background: rgba(var(--accent3-rgb),.12); color: var(--accent3); }
.tx-list__item:active { background: var(--border); }
.tx-list__item:hover { border-color: var(--border); }
.tx-list__item--exp:hover { border-left-color: var(--accent2); }
.tx-list__item--inc:hover { border-left-color: var(--accent3); }
@keyframes si { from { opacity: 0; transform: translateY(-5px); } to { opacity: 1; transform: translateY(0); } }
.tx-list__item-icon { font-size: 16px; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; border-radius: 50%; }
.tx-list__item-info { flex: 1; min-width: 0; }
.tx-list__item-name { font-size: 12px; font-weight: 600; color: rgba(var(--text-rgb),.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-list__item-meta { font-family: var(--mono); font-size: 9px; color: var(--muted); margin-top: 2px; }
.tx-list__empty { text-align: center; padding: 18px; color: var(--muted); font-size: 11px; font-family: var(--mono); }
</style>
