<template>
  <div class="prog-sec">
    <div class="prog-hdr">
      <span class="prog-label">{{ $t('progress.title') }}</span>
      <span class="prog-pct">{{ repayPct }}% · xong T11/2026</span>
    </div>
    <div class="prog-bar">
      <div class="prog-fill prog-fill-anim" :style="{ width: repayPct + '%' }"></div>
    </div>
    <div class="prog-meta">
      <span>{{ $t('progress.original') }} <template v-if="hide.origDebt">•••••</template><template v-else>{{ fCurr(origDebt) }}</template></span>
      <span>{{ $t('progress.remaining') }} <template v-if="hide.remaining">•••••</template><template v-else>{{ fCurr(totalDebt) }}</template></span>
    </div>
  </div>
</template>

<script setup>
import { useCurrency } from '../composables/useCurrency'

const { fCurr } = useCurrency()

defineProps({
  repayPct: Number,
  origDebt: Number,
  totalDebt: Number,
  hide: Object,
})
</script>
