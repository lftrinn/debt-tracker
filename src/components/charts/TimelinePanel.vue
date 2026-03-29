<template>
  <div class="card">
    <div class="c-title">{{ $t('timeline.title') }}</div>
    <div class="timeline timeline--scroll">
      <div v-for="m in milestones" :key="m.month" class="timeline__item">
        <div class="timeline__track">
          <div class="timeline__dot" :class="'timeline__dot--' + m.st"></div>
          <div class="timeline__line"></div>
        </div>
        <div style="flex:1">
          <div class="timeline__month">{{ m.month }}</div>
          <div
            class="timeline__event"
            :style="m.st === 'active' ? { color: 'var(--accent)' } : m.month === '2026-11' ? { color: 'var(--accent3)' } : {}"
          >
            {{ hide.eventAmt ? maskMoney(m.ev) : m.ev }}
          </div>
          <div class="timeline__debt" :style="m.debt == null ? { visibility: 'hidden' } : {}">
            {{ $t('timeline.totalDebt') }} <template v-if="hide.debt"><span class="masked">•••••••</span></template><template v-else>{{ m.debt != null ? fCurr(m.debt) : 0 }}</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useCurrency } from '../../composables/api/useCurrency'

const { fCurr } = useCurrency()

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

<style scoped>
.timeline { display: flex; flex-direction: column; margin-top: 14px; }
.timeline--scroll { max-height: calc(4 * 55px); overflow-y: auto; padding-right: 2px; scroll-snap-type: y mandatory; }
.timeline__item { display: flex; gap: 12px; padding-bottom: 13px; min-height: 55px; box-sizing: border-box; }
.timeline__item:last-child { padding-bottom: 0; }
.timeline--scroll > .timeline__item { scroll-snap-align: start; }
.timeline__track { display: flex; flex-direction: column; align-items: center; width: 30px; flex-shrink: 0; }
.timeline__dot { width: 9px; height: 9px; border-radius: 50%; border: 2px solid var(--border); flex-shrink: 0; }
.timeline__dot--done { background: var(--accent3); border-color: var(--accent3); }
.timeline__dot--active { background: var(--accent); border-color: var(--accent); }
.timeline__dot--future { background: var(--surface2); }
.timeline__line { width: 2px; flex: 1; background: var(--border); margin-top: 3px; }
.timeline__item:last-child .timeline__line { display: none; }
.timeline__month { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.timeline__event { font-size: 12px; font-weight: 600; margin-top: 1px; }
.timeline__debt { font-family: var(--mono); font-size: 9px; color: var(--muted); margin-top: 2px; }
</style>
