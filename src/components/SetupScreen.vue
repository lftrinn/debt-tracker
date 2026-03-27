<template>
  <div class="setup-screen">
    <div class="setup-card">
      <div class="s-title-big"><Icon name="credit-card" :size="24" /> Debt Tracker</div>
      <div class="s-sub">Kết nối JSONBin.io để sync dữ liệu giữa các thiết bị.</div>
      <div class="s-tabs">
        <button class="s-tab" :class="{ active: mode === 'import' }" @click="mode = 'import'">Import JSON</button>
        <button class="s-tab" :class="{ active: mode === 'existing' }" @click="mode = 'existing'">Đã có Bin</button>
        <button class="s-tab" :class="{ active: mode === 'new' }" @click="mode = 'new'">Mới</button>
      </div>

      <!-- Import -->
      <div v-if="mode === 'import'">
        <div class="hint">Paste JSON tài chính vào đây — app upload lên JSONBin và dùng làm dữ liệu ban đầu.</div>
        <input class="inp-s" v-model="key" type="password" placeholder="API Key ($2b$...)" />
        <textarea class="inp-s" v-model="json" placeholder="Paste JSON tài chính ở đây..."></textarea>
        <button class="btn-p" @click="$emit('setup', { mode: 'import', key, json })" :disabled="!key || !json || loading">
          {{ loading ? 'Đang import...' : 'IMPORT & BẮT ĐẦU' }} <Icon v-if="!loading" name="arrow-right" :size="14" />
        </button>
      </div>

      <!-- Existing -->
      <div v-if="mode === 'existing'">
        <div class="hint">Kết nối lại trên thiết bị mới.</div>
        <input class="inp-s" v-model="key" type="password" placeholder="API Key ($2b$...)" />
        <input class="inp-s" v-model="bid" placeholder="Bin ID" />
        <button class="btn-p" @click="$emit('setup', { mode: 'existing', key, binId: bid })" :disabled="!key || !bid || loading">
          {{ loading ? 'Đang kết nối...' : 'KẾT NỐI' }} <Icon v-if="!loading" name="arrow-right" :size="14" />
        </button>
      </div>

      <!-- New -->
      <div v-if="mode === 'new'">
        <div class="hint">Tạo Bin trống, điền thông tin nợ sau.</div>
        <input class="inp-s" v-model="key" type="password" placeholder="API Key ($2b$...)" />
        <input class="inp-s" v-model.number="debt" type="number" placeholder="Tổng nợ (VNĐ)" />
        <input class="inp-s" v-model.number="limit" type="number" placeholder="Hạn mức chi ngày (VNĐ)" />
        <button class="btn-p" @click="$emit('setup', { mode: 'new', key, debt, limit })" :disabled="!key || loading">
          {{ loading ? 'Đang tạo...' : 'TẠO & BẮT ĐẦU' }} <Icon v-if="!loading" name="arrow-right" :size="14" />
        </button>
      </div>

      <div v-if="error" class="err">{{ error }}</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import Icon from './Icon.vue'

defineProps({
  loading: Boolean,
  error: String,
})

defineEmits(['setup'])

const mode = ref('import')
const key = ref('')
const bid = ref('')
const json = ref('')
const debt = ref(null)
const limit = ref(null)
</script>
