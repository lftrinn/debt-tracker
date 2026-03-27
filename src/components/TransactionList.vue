<template>
  <div class="card">
    <div class="c-hdr" style="margin-bottom:12px">
      <span class="c-title">Lịch sử giao dịch</span>
      <span class="badge">{{ transactions.length }}</span>
    </div>
    <div class="exp-list">
      <div v-if="!transactions.length" class="empty">Chưa có giao dịch nào</div>
      <div
        v-for="e in transactions"
        :key="e.id"
        class="exp-item"
        :class="e.type === 'inc' ? 'exp-item--inc' : 'exp-item--exp'"
        @click="$emit('open-detail', e)"
      >
        <div class="exp-ico"><Icon :name="resolveCat(e.cat).icon" :size="16" /></div>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { useCategories } from '../composables/useCategories'

const { fN, fDate } = useFormatters()
const { resolveCat } = useCategories()

defineProps({
  transactions: Array,
  hide: Boolean,
})

defineEmits(['open-detail'])
</script>
