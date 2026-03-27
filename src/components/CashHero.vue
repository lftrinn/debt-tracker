<template>
  <div class="cash-hero">
    <div>
      <div class="ch-label">// Tiền mặt</div>
      <div
        :class="['ch-val', 'num-flash', hide.balance ? '' : availCash < 200000 ? 'red' : availCash < 500000 ? 'yellow' : 'green']"
        :key="'cash' + cashAnimKey"
      >
        <span v-if="hide.balance" class="masked">•••••••</span>
        <template v-else>{{ fS(availCash) }}</template>
      </div>
      <div class="ch-sub">{{ dToSalary }} ngày đến lương</div>
    </div>
    <div>
      <div class="ch-label">// Chi hôm nay</div>
      <div
        :class="['ch-val', 'num-flash', hide.todaySpent ? '' : isOver ? 'red' : 'yellow']"
        :key="'spent' + spentAnimKey"
      >
        <span v-if="hide.todaySpent" class="masked">•••••••</span>
        <template v-else>{{ fS(todaySpent) }}</template>
      </div>
      <div class="ch-sub">Tháng này: <span v-if="hide.monthSpent" class="masked">•••</span><template v-else>{{ fS(monthSpent) }}</template></div>
    </div>
  </div>
</template>

<script setup>
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

defineProps({
  availCash: Number,
  dToSalary: Number,
  todaySpent: Number,
  monthSpent: Number,
  isOver: Boolean,
  cashAnimKey: Number,
  spentAnimKey: Number,
  hide: Object,
})
</script>
