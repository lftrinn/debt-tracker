<template>
  <div class="popup-overlay" @click.self="$emit('dismiss')">
    <div class="popup-card">
      <div class="popup-title"><Icon name="alert-triangle" :size="16" color="var(--accent2)" /> Không thể kết nối</div>
      <div class="popup-sub">Không tải được dữ liệu từ JSONBin. Kiểm tra kết nối mạng hoặc nhập lại thông tin.</div>
      <input class="inp-s" v-model="key" type="password" placeholder="API Key ($2b$...)" />
      <input class="inp-s" v-model="bid" placeholder="Bin ID" />
      <button class="btn-p" @click="$emit('reconnect', { key, binId: bid })" :disabled="!key || !bid || loading">
        {{ loading ? 'Đang kết nối...' : 'KẾT NỐI LẠI' }} <Icon v-if="!loading" name="arrow-right" :size="14" />
      </button>
      <div v-if="error" class="err">{{ error }}</div>
      <button @click="$emit('dismiss')" style="width:100%;background:none;border:none;color:var(--muted);font-family:var(--mono);font-size:11px;margin-top:12px;cursor:pointer;padding:4px">
        Dùng dữ liệu cũ tạm thời
      </button>
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

defineEmits(['reconnect', 'dismiss'])

const key = ref('')
const bid = ref('')
</script>
