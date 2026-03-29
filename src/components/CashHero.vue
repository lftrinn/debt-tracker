<template>
  <div class="cash-hero">
    <div>
      <div class="cash-hero__label">
        {{ $t('cash.label') }}
        <span class="trend-ico" :class="cashTrend">
          <Icon v-if="cashTrend === 'up'" name="trending-up" :size="12" />
          <Icon v-else-if="cashTrend === 'down'" name="trending-down" :size="12" />
          <Icon v-else name="minus" :size="12" />
        </span>
      </div>
      <div
        :class="['cash-hero__value', 'num-flash', hide.balance ? '' : availCash < 200000 ? 'cash-hero__value--red' : availCash < 500000 ? 'cash-hero__value--yellow' : 'cash-hero__value--green']"
        :key="'cash' + cashAnimKey"
      >
        <span v-if="hide.balance" class="masked">•••••••</span>
        <template v-else>{{ fCurr(availCash) }}</template>
      </div>
      <div class="cash-hero__sub">{{ $t('cash.daysToSalary', { n: dToSalary }) }}</div>
    </div>
    <div>
      <div class="cash-hero__label">{{ $t('cash.todayLabel') }}</div>
      <div
        :class="['cash-hero__value', 'num-flash', hide.todaySpent ? '' : isOver ? 'cash-hero__value--red' : 'cash-hero__value--yellow']"
        :key="'spent' + spentAnimKey"
      >
        <span v-if="hide.todaySpent" class="masked">•••••••</span>
        <template v-else>{{ fCurr(todaySpent) }}</template>
      </div>
      <div class="cash-hero__sub">{{ $t('cash.monthly') }} <span v-if="hide.monthSpent" class="masked">•••</span><template v-else>{{ fCurr(monthSpent) }}</template></div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { useCurrency } from '../composables/useCurrency'

const { fCurr } = useCurrency()

defineProps({
  availCash: Number,
  dToSalary: Number,
  todaySpent: Number,
  monthSpent: Number,
  isOver: Boolean,
  cashTrend: String,
  cashAnimKey: Number,
  spentAnimKey: Number,
  hide: Object,
})
</script>

<style scoped>
.cash-hero { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px 20px; margin-bottom: 12px; position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.cash-hero::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent3), var(--accent), transparent); }
.cash-hero__label { font-family: var(--mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 3px; }
.cash-hero__value { font-family: var(--mono); font-size: 22px; font-weight: 700; line-height: 1; }
.cash-hero__value--green { color: var(--accent3); }
.cash-hero__value--yellow { color: var(--accent); }
.cash-hero__value--red { color: var(--accent2); }
.cash-hero__sub { font-family: var(--mono); font-size: 10px; color: var(--muted); margin-top: 4px; }
</style>
