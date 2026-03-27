<template>
  <div class="upcoming">
    <div class="c-hdr" style="position:sticky;top:0;background:var(--surface);padding:15px 20px;margin:-15px -20px 0;z-index:1;border-radius:16px 16px 0 0;">
      <span class="c-title">Thanh toán sắp đến</span>
      <span class="badge">{{ label }}</span>
    </div>
    <div class="up-list" style="max-height:calc(5 * 58px);overflow-y:auto;margin-top:11px;padding-right:2px;">
      <div
        v-for="p in items"
        :key="p._key"
        class="up-item"
        :class="editingKey === p._key ? 'editing' : p.paid ? 'paid' : p.urg"
      >
        <!-- EDIT MODE -->
        <template v-if="editingKey === p._key">
          <div style="font-size:11px;font-weight:700;color:var(--accent);margin-bottom:2px">Chỉnh sửa khoản thanh toán</div>
          <div class="edit-form">
            <input class="inp-edit" v-model="editBuf.name" placeholder="Tên khoản" />
            <div class="edit-row">
              <div class="date-wrap" style="flex:1">
                <input type="date" v-model="editBuf.date" style="color-scheme:dark;width:100%;background:var(--bg);border:1px solid var(--border);border-radius:7px;padding:7px 9px;color:var(--text);font-family:var(--mono);font-size:11px;outline:none;-webkit-appearance:none;min-height:34px;box-sizing:border-box;" />
                <span class="date-placeholder" :class="{ hidden: editBuf.date }">dd/mm/yyyy</span>
              </div>
              <input class="inp-edit" v-model.number="editBuf.amt" type="number" inputmode="numeric" placeholder="Số tiền" style="flex:1" />
            </div>
            <div class="edit-row">
              <button class="btn-edit-save" @click="$emit('save-edit', p)">Lưu</button>
              <button class="btn-edit-cancel" @click="$emit('cancel-edit')">Huỷ</button>
              <button v-if="p.source === 'one_time'" class="btn-edit-del" @click="$emit('delete', p)">Xoá</button>
            </div>
          </div>
        </template>

        <!-- VIEW MODE -->
        <template v-else>
          <div class="up-date-col">
            <span class="up-day" :style="p.paid ? { color: 'var(--muted)' } : {}">{{ p.day }}</span>
            <span class="up-mo">/{{ p.mo }}</span>
          </div>
          <div style="flex:1;min-width:0">
            <div class="up-name" :style="p.paid ? { color: 'var(--muted)', textDecoration: 'line-through' } : {}">{{ p.name }}</div>
            <div v-if="p.sub && !p.paid" class="up-sub" style="margin-top:2px">{{ p.sub }}</div>
            <div v-if="p.paid" class="up-sub" style="color:var(--accent3);margin-top:2px">✓ Đã thanh toán</div>
          </div>
          <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:3px">
              <div class="up-amt" :style="p.paid ? { color: 'var(--muted)' } : {}">
                <template v-if="hide.amount">•••••</template>
                <template v-else>{{ fS(p.amt) }}</template>
              </div>
              <div v-if="!hide.shortage && !p.paid && availCash < p.amt" style="font-family:var(--mono);font-size:9px;color:var(--accent2);line-height:1">
                thiếu {{ fS(p.amt - availCash) }}
              </div>
            </div>
            <button class="btn-tiny-edit" @click="$emit('start-edit', p)" title="Chỉnh sửa">✎</button>
            <button
              class="btn-paid"
              :class="{ done: p.paid }"
              @click="$emit('toggle-paid', p._key, p.amt, p.name)"
              :disabled="!p.paid && availCash < p.amt"
            >
              {{ p.paid ? '↩' : '✓' }}
            </button>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup>
import { useFormatters } from '../composables/useFormatters'

const { fS } = useFormatters()

defineProps({
  items: Array,
  label: String,
  availCash: Number,
  editingKey: [String, null],
  editBuf: Object,
  hide: Object,
})

defineEmits(['start-edit', 'save-edit', 'cancel-edit', 'delete', 'toggle-paid'])
</script>
