<template>
  <div class="card">
    <div class="c-title">Lộ trình thoát nợ</div>
    <div class="tl" style="margin-top:14px">
      <div v-for="m in milestones" :key="m.month" class="tl-item">
        <div class="tl-left">
          <div class="tl-dot" :class="m.st"></div>
          <div class="tl-line"></div>
        </div>
        <div style="flex:1">
          <div class="tl-mo">{{ m.month }}</div>
          <div
            class="tl-ev"
            :style="m.st === 'active' ? { color: 'var(--accent)' } : m.month === '2026-11' ? { color: 'var(--accent3)' } : {}"
          >
            {{ hide.eventAmt ? maskMoney(m.ev) : m.ev }}
          </div>
          <div class="tl-debt" v-if="m.debt != null">
            Tổng nợ: <template v-if="hide.debt"><span class="masked">₫•••••••</span></template><template v-else>₫{{ fS(m.debt) }}</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

defineProps({
  milestones: Array,
  hide: Object,
})

function maskMoney(text) {
  return text
    .replace(/~?₫[\d.,]+[KMBkmbđ]*/g, '₫•••')
    .replace(/~?[\d.,]+[KMBkmb]+/g, '•••')
    .replace(/\d{1,3}([.,]\d{3})+/g, '•••')
}
</script>
