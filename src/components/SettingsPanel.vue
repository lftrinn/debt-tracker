<template>
  <div>
    <!-- Credit card update -->
    <div class="card cfg-card" :class="{ open: openCards.cc }">
      <div class="cfg-hdr" @click="openCards.cc = !openCards.cc">
        <span class="c-title">💳 Cập nhật sao kê thẻ tín dụng</span>
        <span class="cfg-arrow" :class="{ open: openCards.cc }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div style="display:flex;flex-direction:column;gap:12px">
          <div v-for="c in creditCards" :key="c.id" style="padding:12px;background:var(--surface2);border-radius:10px;border:1px solid var(--border)">
            <div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--text)">
              {{ c.name.replace(' — Techcombank', '') }}
            </div>
            <div style="display:flex;flex-direction:column;gap:7px">
              <div class="row-g" style="margin-top:0">
                <span class="small-n" style="flex-shrink:0;width:80px">{{ hide.cardInfo ? 'Dư nợ (%)' : 'Dư nợ mới' }}</span>
                <div v-if="hide.cardInfo" class="inp-sm hide-info">{{ balPct(c) }}% tổng nợ</div>
                <input v-else class="inp-sm" type="number" inputmode="numeric"
                  :placeholder="fN(c.balance)"
                  v-model.number="ccUpdate[c.id + ':balance']" />
              </div>
              <div class="row-g" style="margin-top:0">
                <span class="small-n" style="flex-shrink:0;width:80px">{{ hide.cardInfo ? 'Tối thiểu (%)' : 'Trả tối thiểu' }}</span>
                <div v-if="hide.cardInfo" class="inp-sm hide-info">{{ minPct(c) }}% dư nợ</div>
                <input v-else class="inp-sm" type="number" inputmode="numeric"
                  :placeholder="fN(c.minimum_payment)"
                  v-model.number="ccUpdate[c.id + ':min']" />
              </div>
              <button v-if="!hide.cardInfo" class="btn-sm" style="width:100%;margin-top:2px"
                @click="$emit('update-card', c.id)"
                :disabled="!ccUpdate[c.id + ':balance'] && !ccUpdate[c.id + ':min']">
                Cập nhật →
              </button>
            </div>
          </div>
        </div>
      </div></div>
    </div>

    <!-- Daily limit -->
    <div class="card cfg-card" :class="{ open: openCards.lim }">
      <div class="cfg-hdr" @click="openCards.lim = !openCards.lim">
        <span class="c-title">📊 Hạn mức chi hàng ngày</span>
        <span class="cfg-arrow" :class="{ open: openCards.lim }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div class="lim-bar-w">
          <div class="lim-bar">
            <div class="lim-fill" :class="limSt" :style="{ width: Math.min(limPct, 100) + '%' }"></div>
          </div>
          <span class="small-n">{{ limPct }}%</span>
        </div>
        <div class="small-n" style="margin-bottom:9px">
          <template v-if="hide.dailyLim">₫••••• / ₫•••••</template>
          <template v-else>₫{{ fN(todaySpent) }} / ₫{{ fN(dayLimit) }}</template>
        </div>
        <div v-if="!hide.dailyLim" class="row-g">
          <input class="inp-sm" v-model.number="nLimit" type="number" inputmode="numeric" :placeholder="String(dayLimit)" />
          <button class="btn-sm" @click="saveLimit">Lưu</button>
        </div>
      </div></div>
    </div>

    <!-- Debt payment -->
    <div class="card green-b cfg-card" :class="{ open: openCards.pay }">
      <div class="cfg-hdr" @click="openCards.pay = !openCards.pay">
        <span class="c-title">💚 Ghi nhận trả nợ</span>
        <span class="cfg-arrow" :class="{ open: openCards.pay }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div style="display:flex;flex-direction:column;gap:8px">
          <select class="inp-sm" v-model="payTarget" style="font-family:var(--sans);font-size:12px">
            <option value="">— Chọn khoản nợ —</option>
            <option v-for="c in debtCards" :key="c.id" :value="'cc:' + c.id">{{ c.name }} {{ hide.dropdown ? '' : '(còn ₫' + fS(c.balance) + ')' }}</option>
            <option v-for="l in smallLoans" :key="l.id" :value="'sl:' + l.id">{{ l.name }} {{ hide.dropdown ? '' : '(còn ₫' + fS(l.remaining_balance) + ')' }}</option>
          </select>
          <div class="row-g">
            <input class="inp-sm" v-model.number="payAmt" type="number" inputmode="numeric" placeholder="Số tiền đã trả..." />
            <button class="btn-sm" style="background:var(--accent3)" @click="recPay" :disabled="!payTarget || !payAmt">Trả nợ</button>
          </div>
        </div>
      </div></div>
    </div>

    <!-- Add cash -->
    <div class="card cfg-card" :class="{ open: openCards.cash }">
      <div class="cfg-hdr" @click="openCards.cash = !openCards.cash">
        <span class="c-title">💰 Nạp tiền vào quỹ</span>
        <span class="cfg-arrow" :class="{ open: openCards.cash }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div style="margin-bottom:10px" class="small-n">
          <template v-if="hide.cashInfo">Hiện có: ₫••••• · Reserved: ₫•••••</template>
          <template v-else>Hiện có: ₫{{ fN(cashBalance) }} · Reserved: ₫{{ fN(cashReserved) }}</template>
        </div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <input class="inp-sm" v-model="cashNote" placeholder="Ghi chú (vd: Lương tháng 4...)" style="font-family:var(--sans);font-size:12px" />
          <div class="row-g">
            <input class="inp-sm" v-model.number="addCashAmt" type="number" inputmode="numeric" placeholder="Số tiền nhận được..." />
            <button class="btn-sm" @click="addCash" :disabled="!addCashAmt">Nạp</button>
          </div>
        </div>
      </div></div>
    </div>

    <!-- One-time expense -->
    <div class="card cfg-card" :class="{ open: openCards.oneTime }">
      <div class="cfg-hdr" @click="openCards.oneTime = !openCards.oneTime">
        <span class="c-title">📌 Khoản chi một lần</span>
        <span class="cfg-arrow" :class="{ open: openCards.oneTime }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div style="display:flex;flex-direction:column;gap:8px">
          <input class="inp-sm" v-model="oneTimeName" placeholder="Tên khoản chi (vd: Đám cưới đồng nghiệp...)" style="font-family:var(--sans);font-size:12px" />
          <div class="row-g" style="margin-top:0">
            <div class="date-wrap">
              <input type="date" v-model="oneTimeDate" style="color-scheme:dark" />
              <span class="date-placeholder" :class="{ hidden: oneTimeDate }">dd/mm/yyyy</span>
            </div>
            <input class="inp-sm" v-model.number="oneTimeAmt" type="number" inputmode="numeric" placeholder="Số tiền" />
          </div>
          <button class="btn-sm" style="width:100%" @click="addOneTime" :disabled="!oneTimeName || !oneTimeDate || !oneTimeAmt">Thêm →</button>
        </div>
      </div></div>
    </div>

    <!-- Hide zones config — treeview -->
    <div class="card cfg-card" :class="{ open: openCards.hz }">
      <div class="cfg-hdr" @click="openCards.hz = !openCards.hz">
        <span class="c-title">🔒 Vùng ẩn số tiền</span>
        <span class="cfg-arrow" :class="{ open: openCards.hz }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div class="hint" style="margin-bottom:12px">Chọn mục chịu ảnh hưởng khi bấm nút ẩn (👁). Bỏ chọn để luôn hiện.</div>
        <div class="hz-tree">
          <div v-for="g in zoneTree" :key="g.label" class="hz-group" :class="{ expanded: expandedGroups[g.label] }">
            <div class="hz-parent" :class="{ checked: parentState(g) === 'all', partial: parentState(g) === 'some' }">
              <label class="hz-parent-check" @click.stop>
                <input type="checkbox"
                  :checked="parentState(g) === 'all'"
                  :indeterminate.prop="parentState(g) === 'some'"
                  @change="toggleParent(g, $event.target.checked)" />
              </label>
              <span class="hz-icon">{{ g.icon }}</span>
              <span class="hz-name" style="flex:1">{{ g.label }}</span>
              <button v-if="g.children.length > 1" class="hz-toggle" @click="expandedGroups[g.label] = !expandedGroups[g.label]">
                <span class="hz-arrow" :class="{ open: expandedGroups[g.label] }">▸</span>
              </button>
            </div>
            <div v-if="g.children.length <= 1 || expandedGroups[g.label]" class="hz-children">
              <label v-for="c in g.children" :key="c.key" class="hz-child" :class="{ checked: hideZones[c.key] }">
                <input type="checkbox"
                  :checked="hideZones[c.key]"
                  @change="$emit('set-hide-zone', { key: c.key, val: $event.target.checked })" />
                <span class="hz-child-name">{{ c.name }}</span>
              </label>
            </div>
          </div>
        </div>
      </div></div>
    </div>

    <!-- Rules -->
    <div class="card cfg-card" :class="{ open: openCards.rules }">
      <div class="cfg-hdr" @click="openCards.rules = !openCards.rules">
        <span class="c-title">📋 Quy tắc</span>
        <span class="cfg-arrow" :class="{ open: openCards.rules }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div v-for="r in rules" :key="r" class="rule-item">
          <div class="rule-dot"></div><span>{{ r }}</span>
        </div>
      </div></div>
    </div>

    <!-- Import JSON -->
    <div class="card cfg-card" :class="{ open: openCards.json }" style="border-color:rgba(232,255,71,.15)">
      <div class="cfg-hdr" @click="openCards.json = !openCards.json">
        <span class="c-title">🔄 Cập nhật dữ liệu từ JSON</span>
        <span class="cfg-arrow" :class="{ open: openCards.json }">▸</span>
      </div>
      <div class="cfg-body-wrap"><div class="cfg-body">
        <div class="hint" style="margin-bottom:10px">
          Paste JSON mới vào đây để ghi đè lên Bin hiện tại. Lịch sử chi tiêu và khoản thu sẽ được giữ lại.
        </div>
        <textarea class="inp-s" v-model="importJson" placeholder="Paste JSON mới ở đây..." style="height:100px;margin-bottom:0"></textarea>
        <button class="btn-sm" style="width:100%;margin-top:8px" @click="$emit('import-json', importJson)" :disabled="!importJson || syncing">
          {{ syncing ? 'Đang cập nhật...' : 'CẬP NHẬT →' }}
        </button>
        <div v-if="importErr" class="err" style="margin-top:8px">{{ importErr }}</div>
      </div></div>
    </div>

    <!-- Sync info -->
    <div style="text-align:center;padding:6px 0">
      <span class="small-n">{{ syncMsg }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useFormatters } from '../composables/useFormatters'

const { fN, fS } = useFormatters()

const totalCcDebt = computed(() => (props.creditCards || []).reduce((s, c) => s + (c.balance || 0), 0))

function balPct(c) {
  return totalCcDebt.value > 0 ? Math.round(c.balance / totalCcDebt.value * 100) : 0
}

function minPct(c) {
  return c.balance > 0 ? ((c.minimum_payment / c.balance) * 100).toFixed(1) : 0
}

const props = defineProps({
  creditCards: Array,
  debtCards: Array,
  smallLoans: Array,
  dayLimit: Number,
  todaySpent: Number,
  limPct: Number,
  limSt: String,
  cashBalance: Number,
  cashReserved: Number,
  rules: Array,
  syncMsg: String,
  syncing: Boolean,
  importErr: String,
  hide: Object,
  hideZones: Object,
})

const emit = defineEmits([
  'update-card',
  'update-limit',
  'record-payment',
  'add-cash',
  'add-one-time',
  'import-json',
  'set-hide-zone',
])

const zoneTree = [
  { icon: '⚠', label: 'Cảnh báo hạn mức', children: [
    { key: 'alert', name: 'Số tiền vượt / còn lại' },
  ]},
  { icon: '💵', label: 'Tiền mặt & chi tiêu', children: [
    { key: 'cash.balance', name: 'Tiền mặt khả dụng' },
    { key: 'cash.todaySpent', name: 'Chi hôm nay' },
    { key: 'cash.monthSpent', name: 'Chi tháng này' },
  ]},
  { icon: '💳', label: 'Tổng nợ còn lại', children: [
    { key: 'debt.total', name: 'Tổng nợ' },
    { key: 'debt.cardBal', name: 'Dư nợ từng thẻ' },
    { key: 'debt.minPay', name: 'Minimum payment' },
  ]},
  { icon: '📊', label: 'Tiến độ thoát nợ', children: [
    { key: 'progress.origDebt', name: 'Nợ gốc' },
    { key: 'progress.remaining', name: 'Nợ còn lại' },
  ]},
  { icon: '📅', label: 'Thanh toán sắp đến', children: [
    { key: 'upcoming.amount', name: 'Số tiền khoản thanh toán' },
    { key: 'upcoming.shortage', name: 'Cảnh báo thiếu tiền' },
  ]},
  { icon: '📜', label: 'Lịch sử giao dịch', children: [
    { key: 'transactions', name: 'Số tiền giao dịch' },
  ]},
  { icon: '📈', label: 'Biểu đồ', children: [
    { key: 'charts.spend', name: 'Thu / Chi 7 ngày' },
    { key: 'charts.debtLine', name: 'Lộ trình giảm nợ' },
    { key: 'charts.pie', name: 'Cơ cấu nợ (legend)' },
  ]},
  { icon: '🗓', label: 'Lộ trình thoát nợ', children: [
    { key: 'timeline.debt', name: 'Tổng nợ mỗi mốc' },
    { key: 'timeline.eventAmt', name: 'Số tiền trong sự kiện' },
  ]},
  { icon: '⚙', label: 'Cài đặt', children: [
    { key: 'settings.cardInfo', name: 'Sao kê thẻ tín dụng' },
    { key: 'settings.dailyLim', name: 'Hạn mức chi' },
    { key: 'settings.dropdown', name: 'Dropdown trả nợ' },
    { key: 'settings.cashInfo', name: 'Quỹ tiền mặt' },
  ]},
]

function parentState(g) {
  const vals = g.children.map((c) => !!props.hideZones?.[c.key])
  if (vals.every(Boolean)) return 'all'
  if (vals.some(Boolean)) return 'some'
  return 'none'
}

function toggleParent(g, checked) {
  g.children.forEach((c) => emit('set-hide-zone', { key: c.key, val: checked }))
}

const openCards = reactive({})
const expandedGroups = reactive({})
const ccUpdate = reactive({})
const nLimit = ref(null)
const payTarget = ref('')
const payAmt = ref(null)
const addCashAmt = ref(null)
const cashNote = ref('')
const oneTimeName = ref('')
const oneTimeDate = ref('')
const oneTimeAmt = ref(null)
const importJson = ref('')

function saveLimit() {
  if (nLimit.value > 0) {
    emit('update-limit', nLimit.value)
    nLimit.value = null
  }
}

function recPay() {
  if (!payAmt.value || payAmt.value <= 0 || !payTarget.value) return
  emit('record-payment', { target: payTarget.value, amount: payAmt.value })
  payAmt.value = null
  payTarget.value = ''
}

function addCash() {
  if (!addCashAmt.value || addCashAmt.value <= 0) return
  emit('add-cash', { amount: addCashAmt.value, note: cashNote.value })
  addCashAmt.value = null
  cashNote.value = ''
}

function addOneTime() {
  if (!oneTimeName.value || !oneTimeDate.value || !oneTimeAmt.value) return
  emit('add-one-time', {
    name: oneTimeName.value,
    date: oneTimeDate.value,
    amount: oneTimeAmt.value,
  })
  oneTimeName.value = ''
  oneTimeDate.value = ''
  oneTimeAmt.value = null
}

defineExpose({ ccUpdate })
</script>
