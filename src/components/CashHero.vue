<template>
  <div class="cash-hero">
    <div>
      <div class="ch-label">
        {{ $t('cash.label') }}
        <span class="trend-ico" :class="cashTrend">
          <Icon v-if="cashTrend === 'up'" name="trending-up" :size="12" />
          <Icon v-else-if="cashTrend === 'down'" name="trending-down" :size="12" />
          <Icon v-else name="minus" :size="12" />
        </span>
      </div>
      <div
        :class="['ch-val', 'num-flash', hide.balance ? '' : availCash < 200000 ? 'red' : availCash < 500000 ? 'yellow' : 'green']"
        :key="'cash' + cashAnimKey"
      >
        <span v-if="hide.balance" class="masked">•••••••</span>
        <template v-else>{{ fCurr(availCash) }}</template>
      </div>
      <div class="ch-sub">{{ $t('cash.daysToSalary', { n: dToSalary }) }}</div>
    </div>
    <div>
      <div class="ch-label">{{ $t('cash.todayLabel') }}</div>
      <div
        :class="['ch-val', 'num-flash', hide.todaySpent ? '' : isOver ? 'red' : 'yellow']"
        :key="'spent' + spentAnimKey"
      >
        <span v-if="hide.todaySpent" class="masked">•••••••</span>
        <template v-else>{{ fCurr(todaySpent) }}</template>
      </div>
      <div class="ch-sub">{{ $t('cash.monthly') }} <span v-if="hide.monthSpent" class="masked">•••</span><template v-else>{{ fCurr(monthSpent) }}</template></div>
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
