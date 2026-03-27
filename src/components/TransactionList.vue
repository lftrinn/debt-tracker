<template>
  <div class="card">
    <div class="c-hdr" style="margin-bottom:12px">
      <span class="c-title">Lịch sử giao dịch</span>
      <span class="badge">{{ transactions.length }}</span>
    </div>
    <div class="exp-list">
      <div v-if="!transactions.length" class="empty">Chưa có giao dịch nào</div>
      <div v-for="e in transactions" :key="e.id" class="exp-item">
        <div class="exp-ico">{{ e.cat }}</div>
        <div class="exp-info">
          <div class="exp-name">{{ e.desc }}</div>
          <div class="exp-meta">{{ fDate(e.date) }} · {{ e.type === 'inc' ? 'Khoản thu' : 'Chi tiêu' }}</div>
        </div>
        <div :style="{
          fontFamily: 'var(--mono)',
          fontSize: '12px',
          fontWeight: '700',
          flexShrink: '0',
          color: e.type === 'inc' ? 'var(--accent3)' : 'var(--accent2)',
        }">
          <template v-if="hide"><span class="masked">•••••</span></template>
          <template v-else>{{ e.type === 'inc' ? '+' : '-' }}₫{{ fN(e.amount) }}</template>
        </div>
        <button class="btn-del" @click="$emit('delete', e)">✕</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFormatters } from '../composables/useFormatters'

const { fN, fDate } = useFormatters()

defineProps({
  transactions: Array,
  hide: Boolean,
})

defineEmits(['delete'])
</script>
