<template>
  <div class="debt-ov">
    <div class="do-label">
      // Tổng nợ còn lại
      <span class="trend-ico" :class="debtTrend === 'down' ? 'up' : debtTrend === 'up' ? 'down' : 'neutral'">
        <Icon v-if="debtTrend === 'down'" name="trending-down" :size="12" />
        <Icon v-else-if="debtTrend === 'up'" name="trending-up" :size="12" />
        <Icon v-else name="minus" :size="12" />
      </span>
    </div>
    <div class="do-total num-flash" :key="'debt' + debtAnimKey">
      <template v-if="hide.total"><span class="masked">₫•••••••••</span></template>
      <template v-else><span>₫</span>{{ fN(totalDebt) }}</template>
    </div>
    <div class="do-cards">
      <div class="do-card" v-for="c in debtCards" :key="c.id">
        <div class="do-card-name">{{ c.name }}</div>
        <div class="do-card-row">
          <div class="do-card-bal">
            <template v-if="hide.cardBal">₫•••••</template>
            <template v-else>₫{{ fS(c.balance) }}</template>
          </div>
          <div class="do-card-rate">{{ c.rate }}%/năm</div>
        </div>
        <div class="do-card-row">
          <div class="do-card-info">
            min <template v-if="hide.minPay">₫•••</template><template v-else>₫{{ fS(c.min) }}</template>
          </div>
          <div class="do-card-pct">{{ usedPct(c) }}%</div>
        </div>
        <div class="do-prog">
          <div class="do-prog-fill do-prog-fill-anim" :style="{ width: usedPct(c) + '%' }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'

const { fN, fS } = useFormatters()

function usedPct(c) {
  return c.limit > 0 ? Math.round(c.balance / c.limit * 100) : 0
}

defineProps({
  totalDebt: Number,
  debtCards: Array,
  debtTrend: String,
  debtAnimKey: Number,
  hide: Object,
})
</script>
