<template>
  <div class="debt-overview">
    <div class="debt-overview__label">
      {{ $t('debt.label') }}
      <span class="trend-ico" :class="debtTrend === 'down' ? 'up' : debtTrend === 'up' ? 'down' : 'neutral'">
        <Icon v-if="debtTrend === 'down'" name="trending-down" :size="12" />
        <Icon v-else-if="debtTrend === 'up'" name="trending-up" :size="12" />
        <Icon v-else name="minus" :size="12" />
      </span>
    </div>
    <div class="debt-overview__total num-flash" :key="'debt' + debtAnimKey">
      <template v-if="hide.total"><span class="masked">•••••••••</span></template>
      <template v-else>{{ fCurrFull(totalDebt) }}</template>
    </div>
    <div class="debt-overview__cards">
      <div class="debt-overview__card" :class="'debt-overview__card--' + c.minUrg" v-for="c in debtCards" :key="c.id">
        <!-- Row 1: name + trend + edit -->
        <div class="debt-overview__card-r1">
          <div class="debt-overview__card-name">{{ c.name }}</div>
          <div class="debt-overview__card-trend">
            <Icon v-if="c.thisMonthSpent > 0" name="trending-up" :size="9" class="debt-overview__trend-up" />
            <Icon v-if="c.thisMonthPaid" name="trending-down" :size="9" class="debt-overview__trend-down" />
          </div>
          <button class="debt-overview__card-edit" @click.stop="openEdit(c)" :title="$t('debt.editTooltip')">
            <Icon name="pencil" :size="11" />
          </button>
        </div>
        <!-- Row 2: balance + rate -->
        <div class="debt-overview__card-r2">
          <span class="debt-overview__card-bal"><template v-if="hide.cardBal">•••••</template><template v-else>{{ fCurr(c.balance) }}</template></span>
          <span class="debt-overview__card-rate">{{ c.rate }}{{ $t('debt.ratePerYear') }}</span>
        </div>
        <!-- Row 3: progress + pct -->
        <div class="debt-overview__card-r3">
          <div class="debt-overview__card-prog"><div class="debt-overview__card-prog-fill" :class="'debt-overview__card-prog--' + progLevel(c)" :style="{ width: usedPct(c) + '%' }"></div></div>
          <span class="debt-overview__card-pct">{{ usedPct(c) }}%</span>
        </div>
        <!-- Row 4: min or planned payment | amount/check | Xd | warn | date -->
        <div class="debt-overview__card-r4" :class="'debt-overview__card-r4--' + c.minUrg">
          <span class="debt-overview__min-label">{{ c.plannedPayment && !c.plannedPayment.isMin ? $t('debt.paidLabel') : $t('debt.minLabel') }}</span>
          <template v-if="c.minPaid">
            <span v-if="!hide.minPay" class="debt-overview__min-val" style="color:var(--accent3)">{{ fCurr(c.plannedPayment ? c.plannedPayment.amount : c.min) }}</span>
            <Icon name="check" :size="11" class="debt-overview__min-ico--ok" />
          </template>
          <template v-else-if="hide.minPay"><span class="debt-overview__min-val">•••</span></template>
          <template v-else>
            <span class="debt-overview__min-val">{{ fCurr(c.plannedPayment && !c.plannedPayment.isMin ? c.plannedPayment.amount : c.min) }}</span>
          </template>
          <template v-if="!c.minPaid && c.minDaysLeft !== null">
            <span v-if="c.minDaysLeft <= 0" class="debt-overview__min-tag debt-overview__min-tag--overdue">-{{ Math.abs(c.minDaysLeft) }}d</span>
            <span v-else-if="c.minDaysLeft <= 7" class="debt-overview__min-tag" :class="c.minDaysLeft <= 3 ? 'debt-overview__min-tag--urgent' : 'debt-overview__min-tag--soon'">{{ c.minDaysLeft }}d</span>
          </template>
          <template v-if="c.minDueDate">
            <Icon v-if="!c.minPaid && c.minDaysLeft !== null && c.minDaysLeft <= 3" name="alert-triangle" :size="9" class="debt-overview__min-warn" />
            <span class="debt-overview__min-date">{{ fDueShort(c.minDueDate) }}</span>
          </template>
        </div>
      </div>
    </div>

    <!-- Card update popup -->
    <Transition name="popup">
      <div v-if="editCard" class="popup-overlay" @click.self="editCard = null">
        <div class="popup-sheet">
          <div class="popup-handle"><div class="popup-handle-bar"></div></div>
          <div class="popup-hdr">
            <span class="popup-title">{{ $t('debt.editTitle', { name: editCard.name }) }}</span>
            <button class="popup-close" @click="editCard = null"><Icon name="x" :size="18" /></button>
          </div>
          <div class="popup-body">
            <div class="popup-field">
              <label class="popup-label">{{ hide.cardBal ? $t('debt.balanceHiddenLabel') : $t('debt.balanceLabel') }}</label>
              <div v-if="hide.cardBal" class="popup-input" style="display:flex;align-items:center;color:var(--muted);font-size:12px">{{ balPct(editCard) }}{{ $t('debt.balanceHiddenValue') }}</div>
              <input v-else class="popup-input" v-model.number="editBal" type="number" inputmode="numeric" :placeholder="fN(editCard.balance)" />
            </div>
            <div class="popup-field">
              <label class="popup-label">{{ hide.minPay ? $t('debt.minHiddenLabel') : $t('debt.minLabel2') }}</label>
              <div v-if="hide.minPay" class="popup-input" style="display:flex;align-items:center;color:var(--muted);font-size:12px">{{ minPct(editCard) }}{{ $t('debt.minHiddenValue') }}</div>
              <input v-else class="popup-input" v-model.number="editMin" type="number" inputmode="numeric" :placeholder="fN(editCard.min)" />
            </div>
            <div class="popup-field">
              <label class="popup-label">{{ $t('debt.dueDateLabel') }}</label>
              <input class="popup-input" v-model="editDueDate" type="date" :placeholder="editCard.minDueDate || $t('debt.dueDatePlaceholder')" />
            </div>
          </div>
          <div v-if="!hide.cardBal || !hide.minPay" class="popup-actions">
            <button class="popup-btn primary" @click="saveEdit" :disabled="editBal == null && editMin == null && !editDueDate">{{ $t('debt.updateButton') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import Icon from '../ui/Icon.vue'
import { useFormatters } from '../../composables/ui/useFormatters'
import { useCurrency } from '../../composables/api/useCurrency'
import { useDebtSettings } from '../../composables/ui/useDebtSettings'

const { fN } = useFormatters()
const { fCurr, fCurrFull } = useCurrency()
const { progressMode } = useDebtSettings()

/** Tính phần trăm theo mode: 'used' = % dùng, 'repaid' = % đã trả */
function usedPct(c) {
  if (progressMode.value === 'repaid') {
    return c.limit > 0 ? Math.round((c.limit - c.balance) / c.limit * 100) : 0
  }
  return c.limit > 0 ? Math.round(c.balance / c.limit * 100) : 0
}

/** Cấp độ màu thanh tiến độ theo mode */
function progLevel(c) {
  const pct = usedPct(c)
  if (progressMode.value === 'repaid') {
    if (pct >= 80) return 'repaid-ok'
    if (pct >= 60) return 'repaid-caution'
    if (pct >= 30) return 'repaid-warn'
    return 'repaid-danger'
  }
  if (pct >= 90) return 'critical'
  if (pct >= 70) return 'high'
  return 'normal'
}

function fDueShort(dateStr) {
  if (!dateStr) return ''
  const dt = new Date(dateStr)
  return String(dt.getDate()).padStart(2, '0') + '/' + String(dt.getMonth() + 1).padStart(2, '0')
}

const props = defineProps({
  totalDebt: Number,
  debtCards: Array,
  debtTrend: String,
  debtAnimKey: Number,
  hide: Object,
})

const emit = defineEmits(['update-card'])

const totalCcDebt = computed(() => (props.debtCards || []).reduce((s, c) => s + (c.balance || 0), 0))
function balPct(c) { return totalCcDebt.value > 0 ? Math.round(c.balance / totalCcDebt.value * 100) : 0 }
function minPct(c) { return c.balance > 0 ? ((c.min / c.balance) * 100).toFixed(1) : 0 }

const editCard = ref(null)
const editBal = ref(null)
const editMin = ref(null)
const editDueDate = ref('')

watch(editCard, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
})

function openEdit(c) {
  editCard.value = c
  editBal.value = null
  editMin.value = null
  editDueDate.value = c.minDueDate || ''
}

function saveEdit() {
  if (editBal.value == null && editMin.value == null && !editDueDate.value) return
  emit('update-card', {
    cardId: editCard.value.id,
    balance: editBal.value,
    min: editMin.value,
    minDueDate: editDueDate.value || null,
  })
  editCard.value = null
}
</script>

<style scoped>
.debt-overview { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 18px 20px; margin-bottom: 12px; position: relative; overflow: hidden; }
.debt-overview::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, var(--accent2), transparent); }
.debt-overview__label { font-family: var(--mono); font-size: 9px; letter-spacing: .15em; text-transform: uppercase; color: var(--muted); margin-bottom: 4px; }
.debt-overview__total { font-family: var(--mono); font-size: 32px; font-weight: 700; color: var(--accent2); line-height: 1; letter-spacing: -1px; }
.debt-overview__cards { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 13px; }
.debt-overview__card { background: var(--surface2); border-radius: 10px; padding: 9px 10px; border: 1px solid var(--border); border-left: 3px solid var(--border); }
.debt-overview__card--ok { border-left-color: var(--accent3); }
.debt-overview__card--overdue { border-left-color: var(--danger); }
.debt-overview__card--urgent { border-left-color: var(--accent2); }
.debt-overview__card--soon { border-left-color: var(--accent6); }
.debt-overview__card-r1 { display: flex; align-items: center; justify-content: space-between; margin-bottom: 2px; }
.debt-overview__card-name { font-size: 10px; font-weight: 700; color: rgba(var(--text-rgb),.85); }
.debt-overview__card-trend { display: flex; gap: 2px; align-items: center; flex: 1; justify-content: center; }
.debt-overview__trend-up { color: var(--accent2); opacity: .8; }
.debt-overview__trend-down { color: var(--accent3); opacity: .8; }
.debt-overview__card-edit { background: none; border: none; color: var(--muted); width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: color .2s; flex-shrink: 0; padding: 0; opacity: .5; }
.debt-overview__card-edit:hover { color: var(--accent); opacity: 1; }
.debt-overview__card-r2 { display: flex; align-items: baseline; justify-content: space-between; }
.debt-overview__card-bal { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--accent2); letter-spacing: -.3px; }
.debt-overview__card-rate { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.debt-overview__card-r3 { display: flex; align-items: center; gap: 6px; margin: 5px 0; }
.debt-overview__card-r3 .debt-overview__card-prog { flex: 1; height: 3px; }
.debt-overview__card-pct { font-family: var(--mono); font-size: 9px; color: var(--muted); flex-shrink: 0; min-width: 22px; text-align: right; }
.debt-overview__card-prog { background: var(--border); border-radius: 99px; }
.debt-overview__card-prog-fill { height: 100%; border-radius: 99px; transition: width .6s cubic-bezier(.4,0,.2,1); animation: progload .7s cubic-bezier(.4,0,.2,1) .1s both; }
.debt-overview__card-prog--normal { background: var(--accent2); }
.debt-overview__card-prog--high { background: linear-gradient(90deg, var(--accent2), var(--accent6)); }
.debt-overview__card-prog--critical { background: linear-gradient(90deg, var(--accent6), var(--danger)); }
/* Repaid mode: 0-30% đỏ, 30-60% cam, 60-80% vàng, 80-100% xanh */
.debt-overview__card-prog--repaid-danger { background: var(--danger); }
.debt-overview__card-prog--repaid-warn { background: var(--accent6); }
.debt-overview__card-prog--repaid-caution { background: var(--accent); }
.debt-overview__card-prog--repaid-ok { background: var(--accent3); }
.debt-overview__card-r4 { display: flex; align-items: center; justify-content: space-between; font-family: var(--mono); font-size: 9.5px; padding-top: 6px; margin-top: 2px; border-top: 1px solid rgba(var(--text-rgb),.05); }
.debt-overview__min-label { font-weight: 700; letter-spacing: .02em; color: var(--muted); flex-shrink: 0; }
.debt-overview__min-val { font-weight: 600; color: rgba(var(--text-rgb),.6); flex-shrink: 0; }
.debt-overview__min-ico--ok { color: var(--accent3); flex-shrink: 0; }
.debt-overview__min-tag { font-size: 8.5px; font-weight: 700; padding: 1px 5px; border-radius: 3px; line-height: 1.3; flex-shrink: 0; }
.debt-overview__min-tag--ok { background: rgba(var(--accent3-rgb),.12); color: var(--accent3); }
.debt-overview__min-tag--overdue { background: rgba(var(--danger-rgb),.12); color: var(--danger); }
.debt-overview__min-tag--urgent { background: rgba(var(--accent2-rgb),.12); color: var(--accent2); }
.debt-overview__min-tag--soon { background: rgba(255,165,0,.1); color: var(--accent6); }
.debt-overview__min-date { font-size: 9px; color: var(--muted); flex-shrink: 0; }
.debt-overview__min-warn { flex-shrink: 0; }
.debt-overview__card-r4--ok { border-top-color: rgba(var(--accent3-rgb),.08); }
.debt-overview__card-r4--ok .debt-overview__min-label { color: var(--accent3); opacity: .7; }
.debt-overview__card-r4--ok .debt-overview__min-date { color: var(--accent3); opacity: .6; }
.debt-overview__card-r4--urgent .debt-overview__min-label,
.debt-overview__card-r4--urgent .debt-overview__min-val,
.debt-overview__card-r4--urgent .debt-overview__min-date,
.debt-overview__card-r4--urgent .debt-overview__min-warn { color: var(--accent6); }
.debt-overview__card-r4--urgent .debt-overview__min-tag { background: rgba(255,165,0,.12); color: var(--accent6); }
.debt-overview__card-r4--overdue .debt-overview__min-label,
.debt-overview__card-r4--overdue .debt-overview__min-val,
.debt-overview__card-r4--overdue .debt-overview__min-date,
.debt-overview__card-r4--overdue .debt-overview__min-warn { color: var(--danger); }
.debt-overview__card-r4--overdue .debt-overview__min-tag { background: rgba(var(--danger-rgb),.12); color: var(--danger); }
</style>
