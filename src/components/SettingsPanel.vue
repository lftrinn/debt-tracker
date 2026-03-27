<template>
  <div>
    <div class="cfg-list">
      <div class="cfg-item" @click="open = 'cc'">
        <span class="cfg-item-ico"><Icon name="credit-card" :size="16" /></span>
        <span class="cfg-item-label">Cập nhật sao kê thẻ</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'lim'">
        <span class="cfg-item-ico"><Icon name="chart-no-axes-column" :size="16" /></span>
        <span class="cfg-item-label">Hạn mức chi hàng ngày</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'pay'">
        <span class="cfg-item-ico"><Icon name="hand-coins" :size="16" /></span>
        <span class="cfg-item-label">Ghi nhận trả nợ</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'cash'">
        <span class="cfg-item-ico"><Icon name="wallet" :size="16" /></span>
        <span class="cfg-item-label">Nạp tiền vào quỹ</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'oneTime'">
        <span class="cfg-item-ico"><Icon name="pin" :size="16" /></span>
        <span class="cfg-item-label">Khoản chi một lần</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'hz'">
        <span class="cfg-item-ico"><Icon name="lock" :size="16" /></span>
        <span class="cfg-item-label">Vùng ẩn số tiền</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'rules'">
        <span class="cfg-item-ico"><Icon name="list" :size="16" /></span>
        <span class="cfg-item-label">Quy tắc</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
      <div class="cfg-item" @click="open = 'json'">
        <span class="cfg-item-ico"><Icon name="refresh-ccw" :size="16" /></span>
        <span class="cfg-item-label">Cập nhật dữ liệu JSON</span>
        <span class="cfg-item-arrow"><Icon name="chevron-right" :size="14" color="var(--muted)" /></span>
      </div>
    </div>

    <!-- Sync info -->
    <div style="text-align:center;padding:6px 0">
      <span class="small-n">{{ syncMsg }}<template v-if="syncTime"> · {{ syncTime }}</template></span>
    </div>

    <!-- POPUP -->
    <Transition name="popup">
      <div v-if="open" class="popup-overlay" @click.self="closePopup">
        <div class="popup-sheet">
          <div class="popup-hdr">
            <span class="popup-title">{{ titles[open] }}</span>
            <button class="popup-close" @click="closePopup"><Icon name="x" :size="18" /></button>
          </div>

          <!-- CC UPDATE -->
          <template v-if="open === 'cc'">
            <div class="popup-body">
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
                    <button v-if="!hide.cardInfo" class="popup-btn primary" style="margin-top:2px"
                      @click="$emit('update-card', c.id)"
                      :disabled="!ccUpdate[c.id + ':balance'] && !ccUpdate[c.id + ':min']">
                      Cập nhật
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <!-- DAILY LIMIT -->
          <template v-if="open === 'lim'">
            <div class="popup-body">
              <div class="lim-bar-w">
                <div class="lim-bar">
                  <div class="lim-fill" :class="limSt" :style="{ width: Math.min(limPct, 100) + '%' }"></div>
                </div>
                <span class="small-n">{{ limPct }}%</span>
              </div>
              <div class="small-n" style="margin-bottom:4px">
                <template v-if="hide.dailyLim">₫••••• / ₫•••••</template>
                <template v-else>₫{{ fN(todaySpent) }} / ₫{{ fN(dayLimit) }}</template>
              </div>
              <div v-if="!hide.dailyLim" class="popup-field">
                <label class="popup-label">Hạn mức mới (₫)</label>
                <input class="popup-input" v-model.number="nLimit" type="number" inputmode="numeric" :placeholder="String(dayLimit)" />
              </div>
            </div>
            <div v-if="!hide.dailyLim" class="popup-actions">
              <button class="popup-btn primary" @click="saveLimit" :disabled="!nLimit">Lưu hạn mức</button>
            </div>
          </template>

          <!-- DEBT PAYMENT -->
          <template v-if="open === 'pay'">
            <div class="popup-body">
              <div class="popup-field">
                <label class="popup-label">Chọn khoản nợ</label>
                <select class="popup-input" v-model="payTarget" style="font-family:var(--sans);font-size:12px">
                  <option value="">— Chọn khoản nợ —</option>
                  <option v-for="c in debtCards" :key="c.id" :value="'cc:' + c.id">{{ c.name }} {{ hide.dropdown ? '' : '(còn ₫' + fS(c.balance) + ')' }}</option>
                  <option v-for="l in smallLoans" :key="l.id" :value="'sl:' + l.id">{{ l.name }} {{ hide.dropdown ? '' : '(còn ₫' + fS(l.remaining_balance) + ')' }}</option>
                </select>
              </div>
              <div class="popup-field">
                <label class="popup-label">Số tiền đã trả (₫)</label>
                <input class="popup-input" v-model.number="payAmt" type="number" inputmode="numeric" placeholder="0" />
              </div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" style="background:var(--accent3)" @click="recPay" :disabled="!payTarget || !payAmt">Ghi nhận trả nợ</button>
            </div>
          </template>

          <!-- ADD CASH -->
          <template v-if="open === 'cash'">
            <div class="popup-body">
              <div class="popup-details" style="margin-bottom:4px">
                <div class="popup-row">
                  <span class="popup-label">Hiện có</span>
                  <span class="popup-val">{{ hide.cashInfo ? '₫•••••' : '₫' + fN(cashBalance) }}</span>
                </div>
                <div class="popup-row">
                  <span class="popup-label">Reserved</span>
                  <span class="popup-val">{{ hide.cashInfo ? '₫•••••' : '₫' + fN(cashReserved) }}</span>
                </div>
              </div>
              <div class="popup-field">
                <label class="popup-label">Ghi chú</label>
                <input class="popup-input" v-model="cashNote" placeholder="Lương tháng 4..." style="font-family:var(--sans)" />
              </div>
              <div class="popup-field">
                <label class="popup-label">Số tiền (₫)</label>
                <input class="popup-input" v-model.number="addCashAmt" type="number" inputmode="numeric" placeholder="0" />
              </div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" @click="addCash" :disabled="!addCashAmt">Nạp tiền</button>
            </div>
          </template>

          <!-- ONE-TIME EXPENSE -->
          <template v-if="open === 'oneTime'">
            <div class="popup-body">
              <div class="popup-field">
                <label class="popup-label">Tên khoản chi</label>
                <input class="popup-input" v-model="oneTimeName" placeholder="Đám cưới đồng nghiệp..." style="font-family:var(--sans)" />
              </div>
              <div class="popup-field">
                <label class="popup-label">Ngày</label>
                <input type="date" class="popup-input" v-model="oneTimeDate" style="color-scheme:dark;" />
              </div>
              <div class="popup-field">
                <label class="popup-label">Số tiền (₫)</label>
                <input class="popup-input" v-model.number="oneTimeAmt" type="number" inputmode="numeric" placeholder="0" />
              </div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" @click="addOneTime" :disabled="!oneTimeName || !oneTimeDate || !oneTimeAmt">Thêm khoản chi</button>
            </div>
          </template>

          <!-- HIDE ZONES -->
          <template v-if="open === 'hz'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:8px">Chọn mục chịu ảnh hưởng khi bấm nút ẩn. Bỏ chọn để luôn hiện.</div>
              <div class="hz-tree">
                <div v-for="g in zoneTree" :key="g.label" class="hz-group" :class="{ expanded: expandedGroups[g.label] }">
                  <div class="hz-parent" :class="{ checked: parentState(g) === 'all', partial: parentState(g) === 'some' }">
                    <label class="hz-parent-check" @click.stop>
                      <input type="checkbox"
                        :checked="parentState(g) === 'all'"
                        :indeterminate.prop="parentState(g) === 'some'"
                        @change="toggleParent(g, $event.target.checked)" />
                    </label>
                    <span class="hz-icon"><Icon :name="g.icon" :size="14" /></span>
                    <span class="hz-name" style="flex:1">{{ g.label }}</span>
                    <button v-if="g.children.length > 1" class="hz-toggle" @click="expandedGroups[g.label] = !expandedGroups[g.label]">
                      <span class="hz-arrow" :class="{ open: expandedGroups[g.label] }"><Icon name="chevron-right" :size="12" /></span>
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
            </div>
          </template>

          <!-- RULES -->
          <template v-if="open === 'rules'">
            <div class="popup-body">
              <div v-if="!rules.length" class="empty">Chưa có quy tắc nào</div>
              <div v-for="r in rules" :key="r" class="rule-item">
                <div class="rule-dot"></div><span>{{ r }}</span>
              </div>
            </div>
          </template>

          <!-- IMPORT JSON -->
          <template v-if="open === 'json'">
            <div class="popup-body">
              <div class="hint" style="margin-bottom:6px">
                Paste JSON mới vào đây để ghi đè lên Bin hiện tại. Lịch sử chi tiêu và khoản thu sẽ được giữ lại.
              </div>
              <textarea class="popup-input" v-model="importJson" placeholder="Paste JSON mới ở đây..." style="height:120px;resize:none;font-size:10px;line-height:1.5"></textarea>
              <div v-if="importErr" class="err" style="margin-top:4px">{{ importErr }}</div>
            </div>
            <div class="popup-actions">
              <button class="popup-btn primary" style="background:var(--accent)" @click="$emit('import-json', importJson)" :disabled="!importJson || syncing">
                {{ syncing ? 'Đang cập nhật...' : 'Cập nhật dữ liệu' }}
              </button>
            </div>
          </template>

        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue'
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'

const { fN, fS } = useFormatters()

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
  syncTime: String,
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

const titles = {
  cc: 'Cập nhật sao kê thẻ',
  lim: 'Hạn mức chi hàng ngày',
  pay: 'Ghi nhận trả nợ',
  cash: 'Nạp tiền vào quỹ',
  oneTime: 'Khoản chi một lần',
  hz: 'Vùng ẩn số tiền',
  rules: 'Quy tắc',
  json: 'Cập nhật dữ liệu JSON',
}

const totalCcDebt = computed(() => (props.creditCards || []).reduce((s, c) => s + (c.balance || 0), 0))
function balPct(c) { return totalCcDebt.value > 0 ? Math.round(c.balance / totalCcDebt.value * 100) : 0 }
function minPct(c) { return c.balance > 0 ? ((c.minimum_payment / c.balance) * 100).toFixed(1) : 0 }

const zoneTree = [
  { icon: 'alert-triangle', label: 'Cảnh báo hạn mức', children: [{ key: 'alert', name: 'Số tiền vượt / còn lại' }] },
  { icon: 'banknote', label: 'Tiền mặt & chi tiêu', children: [
    { key: 'cash.balance', name: 'Tiền mặt khả dụng' },
    { key: 'cash.todaySpent', name: 'Chi hôm nay' },
    { key: 'cash.monthSpent', name: 'Chi tháng này' },
  ]},
  { icon: 'credit-card', label: 'Tổng nợ còn lại', children: [
    { key: 'debt.total', name: 'Tổng nợ' },
    { key: 'debt.cardBal', name: 'Dư nợ từng thẻ' },
    { key: 'debt.minPay', name: 'Minimum payment' },
  ]},
  { icon: 'trending-down', label: 'Tiến độ thoát nợ', children: [
    { key: 'progress.origDebt', name: 'Nợ gốc' },
    { key: 'progress.remaining', name: 'Nợ còn lại' },
  ]},
  { icon: 'calendar', label: 'Thanh toán sắp đến', children: [
    { key: 'upcoming.amount', name: 'Số tiền khoản thanh toán' },
    { key: 'upcoming.shortage', name: 'Cảnh báo thiếu tiền' },
  ]},
  { icon: 'receipt', label: 'Lịch sử giao dịch', children: [{ key: 'transactions', name: 'Số tiền giao dịch' }] },
  { icon: 'bar-chart-3', label: 'Biểu đồ', children: [
    { key: 'charts.spend', name: 'Thu / Chi 7 ngày' },
    { key: 'charts.debtLine', name: 'Lộ trình giảm nợ' },
    { key: 'charts.pie', name: 'Cơ cấu nợ (legend)' },
  ]},
  { icon: 'clock', label: 'Lộ trình thoát nợ', children: [
    { key: 'timeline.debt', name: 'Tổng nợ mỗi mốc' },
    { key: 'timeline.eventAmt', name: 'Số tiền trong sự kiện' },
  ]},
  { icon: 'settings', label: 'Cài đặt', children: [
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

// --- State ---
const open = ref(null)
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

function closePopup() { open.value = null }

watch(open, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

function saveLimit() {
  if (nLimit.value > 0) {
    emit('update-limit', nLimit.value)
    nLimit.value = null
    closePopup()
  }
}

function recPay() {
  if (!payAmt.value || payAmt.value <= 0 || !payTarget.value) return
  emit('record-payment', { target: payTarget.value, amount: payAmt.value })
  payAmt.value = null
  payTarget.value = ''
  closePopup()
}

function addCash() {
  if (!addCashAmt.value || addCashAmt.value <= 0) return
  emit('add-cash', { amount: addCashAmt.value, note: cashNote.value })
  addCashAmt.value = null
  cashNote.value = ''
  closePopup()
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
  closePopup()
}

defineExpose({ ccUpdate })
</script>
