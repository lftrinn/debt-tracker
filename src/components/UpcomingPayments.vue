<template>
  <div class="upcoming">
    <div class="c-hdr" style="position:sticky;top:0;background:var(--surface);padding:15px 20px;margin:-15px -20px 0;z-index:1;border-radius:16px 16px 0 0;">
      <span class="c-title">Thanh toán sắp đến</span>
      <span style="flex:1"></span>
      <span class="badge" style="margin-right:4px">{{ paidCount }}/{{ items.length }}</span>
      <span class="badge">{{ label }}</span>
    </div>
    <div class="up-list" style="max-height:calc(4 * 48px + 3 * 6px);overflow-y:auto;margin-top:11px;padding-right:2px;">
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
          <div class="up-amt-col">
            <div class="up-amt" :style="p.paid ? { color: 'var(--muted)' } : {}">
              <template v-if="hide.amount">•••••</template>
              <template v-else>{{ fS(p.amt) }}</template>
            </div>
            <div v-if="!p.paid && !hide.shortage && availCash < p.amt" class="up-shortage">
              Thiếu {{ fS(p.amt - availCash) }}
            </div>
          </div>
          <button
            v-if="!p.paid"
            class="up-check-btn"
            :class="{ disabled: availCash < p.amt }"
            :disabled="availCash < p.amt"
            @click.stop="$emit('toggle-paid', p._key, p.amt, p.name)"
            :title="availCash < p.amt ? 'Không đủ tiền' : 'Thanh toán nhanh'"
          >
            <Icon name="check" :size="13" />
          </button>
          <button
            v-else
            class="up-check-btn done"
            @click.stop="$emit('toggle-paid', p._key, p.amt, p.name)"
            title="Hoàn tác thanh toán"
          >
            <Icon name="undo-2" :size="13" />
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

const props = defineProps({
  items: Array,
  label: String,
  hide: Object,
  availCash: { type: Number, default: 0 },
})

const paidCount = computed(() => (props.items || []).filter((p) => p.paid).length)

defineEmits(['open-detail', 'toggle-paid'])
</script>
