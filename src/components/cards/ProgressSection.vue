<template>
  <div class="progress">
    <div class="progress__header">
      <span class="progress__label">{{ $t('progress.title') }}</span>
      <span class="progress__pct">{{ repayPct }}%<template v-if="freeMonth"> · {{ $t('progress.doneBy', { month: freeMonth }) }}</template></span>
    </div>
    <div class="progress__bar">
      <div class="progress__fill" :style="{ width: repayPct + '%' }"></div>
    </div>
    <div class="progress__meta">
      <span>{{ $t('progress.original') }} <template v-if="hide.origDebt">•••••</template><template v-else>{{ fCurr(origDebt) }}</template></span>
      <span>{{ $t('progress.remaining') }} <template v-if="hide.remaining">•••••</template><template v-else>{{ fCurr(totalDebt) }}</template></span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCurrency } from '../../composables/api/useCurrency'

const { locale } = useI18n()
const { fCurr } = useCurrency()

const props = defineProps({
  repayPct: Number,
  origDebt: Number,
  totalDebt: Number,
  hide: Object,
  freeMonthStr: { type: String, default: '' },
})

const freeMonth = computed(() => {
  if (!props.freeMonthStr) return ''
  const [y, m] = props.freeMonthStr.split('-')
  const mNum = parseInt(m)
  const yy = y.slice(2)
  if (locale.value === 'ja') return mNum + '月/' + yy
  if (locale.value === 'en') {
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return months[mNum - 1] + '/' + yy
  }
  return 'T' + mNum + '/' + yy
})
</script>

<style scoped>
.progress { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 15px 20px; margin-bottom: 12px; }
.progress__header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 9px; }
.progress__label { font-size: 12px; font-weight: 600; }
.progress__pct { font-family: var(--mono); font-size: 11px; color: var(--accent3); }
.progress__bar { height: 5px; background: var(--surface2); border-radius: 99px; overflow: hidden; margin-bottom: 7px; }
.progress__fill { height: 100%; background: linear-gradient(90deg, var(--accent3), var(--accent)); border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); animation: progload .8s cubic-bezier(.4,0,.2,1) .15s both; }
.progress__meta { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 9px; color: var(--muted); }
</style>
