<template>
  <div class="prog-sec">
    <div class="prog-hdr">
      <span class="prog-label">Tiến độ thoát nợ</span>
      <span class="prog-pct">{{ repayPct }}% · xong T11/2026</span>
    </div>
    <div class="prog-bar">
      <div class="prog-fill prog-fill-anim" :style="{ width: repayPct + '%' }"></div>
    </div>
    <div class="prog-meta">
      <span>Gốc: <template v-if="hide.origDebt">₫•••••</template><template v-else>₫{{ fS(origDebt) }}</template></span>
      <span>Còn: <template v-if="hide.remaining">₫•••••</template><template v-else>₫{{ fS(totalDebt) }}</template></span>
    </div>
  </div>
</template>

<script setup>
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

defineProps({
  repayPct: Number,
  origDebt: Number,
  totalDebt: Number,
  hide: Object,
})
</script>
