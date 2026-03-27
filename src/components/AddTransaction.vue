<template>
  <div class="card">
    <!-- Chi / Thu toggle -->
    <div style="display:flex;gap:4px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:14px;">
      <button :class="['tab-btn', txType === 'exp' ? 'active' : '']" style="flex:1;font-size:11px" @click="txType = 'exp'">− Chi tiêu</button>
      <button :class="['tab-btn', txType === 'inc' ? 'active' : '']" style="flex:1;font-size:11px" @click="txType = 'inc'">+ Khoản thu</button>
    </div>

    <!-- CHI -->
    <div v-if="txType === 'exp'">
      <div class="c-title" style="margin-bottom:10px">Ghi khoản chi</div>
      <div class="add-form">
        <input class="inp" v-model="nDesc" placeholder="Mô tả (vd: Cơm tối, Cà phê...)" />
        <div class="form-row">
          <input class="inp" v-model.number="nAmt" type="number" inputmode="numeric" placeholder="Số tiền (VNĐ)" />
          <select class="cat-sel" v-model="nCat">
            <option value="🍜">🍜 Ăn</option>
            <option value="☕">☕ Cafe</option>
            <option value="🛒">🛒 Mua</option>
            <option value="🚌">🚌 Đi lại</option>
            <option value="💊">💊 Y tế</option>
            <option value="🎮">🎮 Giải trí</option>
            <option value="💡">💡 HĐ</option>
            <option value="📦">📦 Khác</option>
          </select>
        </div>
        <button class="btn-add" @click="addExp" :disabled="syncing || !nDesc.trim() || !nAmt">
          {{ syncing ? 'Đang lưu...' : 'THÊM →' }}
        </button>
      </div>
    </div>

    <!-- THU -->
    <div v-if="txType === 'inc'">
      <div class="c-title" style="margin-bottom:10px">Ghi khoản thu</div>
      <div class="add-form">
        <input class="inp" v-model="iDesc" placeholder="Mô tả (vd: Lương tháng 4, Freelance...)" />
        <div class="form-row">
          <input class="inp" v-model.number="iAmt" type="number" inputmode="numeric" placeholder="Số tiền (VNĐ)" />
          <select class="cat-sel" v-model="iCat">
            <option value="💼">💼 Lương</option>
            <option value="💻">💻 Freelance</option>
            <option value="🎁">🎁 Thưởng</option>
            <option value="↩️">↩️ Hoàn tiền</option>
            <option value="📈">📈 Đầu tư</option>
            <option value="💰">💰 Khác</option>
          </select>
        </div>
        <button class="btn-add" style="background:var(--accent3);color:var(--bg)" @click="addInc" :disabled="syncing || !iDesc.trim() || !iAmt">
          {{ syncing ? 'Đang lưu...' : 'THÊM →' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const props = defineProps({
  syncing: Boolean,
})

const emit = defineEmits(['add-expense', 'add-income'])

const txType = ref('exp')
const nDesc = ref('')
const nAmt = ref(null)
const nCat = ref('🍜')
const iDesc = ref('')
const iAmt = ref(null)
const iCat = ref('💼')

function addExp() {
  if (!nAmt.value || nAmt.value <= 0 || !nDesc.value.trim()) return
  emit('add-expense', { desc: nDesc.value.trim(), amount: nAmt.value, cat: nCat.value })
  nDesc.value = ''
  nAmt.value = null
}

function addInc() {
  if (!iAmt.value || iAmt.value <= 0 || !iDesc.value.trim()) return
  emit('add-income', { desc: iDesc.value.trim(), amount: iAmt.value, cat: iCat.value })
  iDesc.value = ''
  iAmt.value = null
}
</script>
