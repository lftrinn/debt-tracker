<template>
  <div class="setup-screen">
    <div class="setup-card">
      <div class="s-title-big"><Icon name="credit-card" :size="24" /> Debt Tracker</div>
      <div class="s-sub">{{ $t('setup.subtitle') }}</div>
      <div class="s-tabs">
        <button class="s-tab" :class="{ active: mode === 'import' }" @click="mode = 'import'">{{ $t('setup.tabs.import') }}</button>
        <button class="s-tab" :class="{ active: mode === 'existing' }" @click="mode = 'existing'">{{ $t('setup.tabs.existing') }}</button>
        <button class="s-tab" :class="{ active: mode === 'new' }" @click="mode = 'new'">{{ $t('setup.tabs.new') }}</button>
      </div>

      <!-- Import -->
      <div v-if="mode === 'import'">
        <div class="hint">{{ $t('setup.import.hint') }}</div>
        <input class="inp-s" v-model="key" type="password" :placeholder="$t('setup.import.keyPlaceholder')" />
        <textarea class="inp-s" v-model="json" :placeholder="$t('setup.import.jsonPlaceholder')"></textarea>
        <button class="btn-p" @click="$emit('setup', { mode: 'import', key, json })" :disabled="!key || !json || loading">
          {{ loading ? $t('setup.import.loading') : $t('setup.import.button') }} <Icon v-if="!loading" name="arrow-right" :size="14" />
        </button>
      </div>

      <!-- Existing -->
      <div v-if="mode === 'existing'">
        <div class="hint">{{ $t('setup.existing.hint') }}</div>
        <input class="inp-s" v-model="key" type="password" :placeholder="$t('setup.existing.keyPlaceholder')" />
        <input class="inp-s" v-model="bid" :placeholder="$t('setup.existing.binIdPlaceholder')" />
        <button class="btn-p" @click="$emit('setup', { mode: 'existing', key, binId: bid })" :disabled="!key || !bid || loading">
          {{ loading ? $t('setup.existing.loading') : $t('setup.existing.button') }} <Icon v-if="!loading" name="arrow-right" :size="14" />
        </button>
      </div>

      <!-- New -->
      <div v-if="mode === 'new'">
        <div class="hint">{{ $t('setup.new.hint') }}</div>
        <input class="inp-s" v-model="key" type="password" :placeholder="$t('setup.new.keyPlaceholder')" />
        <input class="inp-s" v-model.number="debt" type="number" :placeholder="$t('setup.new.debtPlaceholder')" />
        <input class="inp-s" v-model.number="limit" type="number" :placeholder="$t('setup.new.limitPlaceholder')" />
        <button class="btn-p" @click="$emit('setup', { mode: 'new', key, debt, limit })" :disabled="!key || loading">
          {{ loading ? $t('setup.new.loading') : $t('setup.new.button') }} <Icon v-if="!loading" name="arrow-right" :size="14" />
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
