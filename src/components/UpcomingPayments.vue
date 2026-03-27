<template>
  <div class="upcoming">
    <div class="c-hdr" style="position:sticky;top:0;background:var(--surface);padding:15px 20px;margin:-15px -20px 0;z-index:1;border-radius:16px 16px 0 0;">
      <span class="c-title">Thanh toán sắp đến</span>
      <span class="badge">{{ label }}</span>
    </div>
    <div class="up-list" style="max-height:calc(5 * 48px + 4 * 6px);overflow-y:auto;margin-top:11px;padding-right:2px;">
      <div
        v-for="p in items"
        :key="p._key"
        class="up-item"
        :class="p.paid ? 'paid' : p.urg"
        @click="$emit('open-detail', p)"
      >
        <div class="up-date-col">
          <span class="up-day" :style="p.paid ? { color: 'var(--muted)' } : {}">{{ p.day }}</span>
          <span class="up-mo">/{{ p.mo }}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="up-name" :style="p.paid ? { color: 'var(--muted)', textDecoration: 'line-through' } : {}">{{ p.name }}</div>
          <div v-if="p.sub && !p.paid" class="up-sub" style="margin-top:2px">{{ p.sub }}</div>
          <div v-if="p.paid" class="up-sub" style="color:var(--accent3);margin-top:2px"><Icon name="check" :size="11" /> Đã thanh toán</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
          <div class="up-amt" :style="p.paid ? { color: 'var(--muted)' } : {}">
            <template v-if="hide.amount">•••••</template>
            <template v-else>{{ fS(p.amt) }}</template>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

defineProps({
  items: Array,
  label: String,
  hide: Object,
})

defineEmits(['open-detail'])
</script>
