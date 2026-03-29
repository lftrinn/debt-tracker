<template>
  <div class="error-popup" @click.self="$emit('dismiss')">
    <div class="error-popup__card">
      <div class="error-popup__title"><Icon name="alert-triangle" :size="16" color="var(--accent2)" /> {{ $t('error.title') }}</div>
      <div class="error-popup__sub">{{ $t('error.message') }}</div>
      <input class="inp-s" v-model="key" type="password" :placeholder="$t('setup.existing.keyPlaceholder')" />
      <input class="inp-s" v-model="bid" :placeholder="$t('setup.existing.binIdPlaceholder')" />
      <button class="btn-p" @click="$emit('reconnect', { key, binId: bid })" :disabled="!key || !bid || loading">
        {{ loading ? $t('error.loading') : $t('error.reconnect') }} <Icon v-if="!loading" name="arrow-right" :size="14" />
      </button>
      <div v-if="error" class="err">{{ error }}</div>
      <button @click="$emit('dismiss')" style="width:100%;background:none;border:none;color:var(--muted);font-family:var(--mono);font-size:11px;margin-top:12px;cursor:pointer;padding:4px">
        {{ $t('error.useOld') }}
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

<style scoped>
.error-popup { position: fixed; inset: 0; background: rgba(0,0,0,.6); z-index: 998; display: flex; align-items: flex-end; justify-content: center; padding: 0 0 40px; }
.error-popup__card { background: var(--surface); border: 1px solid var(--border); border-radius: 20px; padding: 24px 22px; width: 100%; max-width: 420px; margin: 0 16px; position: relative; overflow: hidden; }
.error-popup__card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; border-radius: 20px 20px 0 0; background: linear-gradient(90deg, var(--accent2), var(--accent)); }
.error-popup__title { font-size: 15px; font-weight: 800; margin-bottom: 6px; }
.error-popup__sub { font-family: var(--mono); font-size: 10px; color: var(--muted); line-height: 1.7; margin-bottom: 16px; }
</style>
