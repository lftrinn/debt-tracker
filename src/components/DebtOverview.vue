<template>
  <div class="debt-ov">
    <div class="do-label">
      {{ $t('debt.label') }}
      <span class="trend-ico" :class="debtTrend === 'down' ? 'up' : debtTrend === 'up' ? 'down' : 'neutral'">
        <Icon v-if="debtTrend === 'down'" name="trending-down" :size="12" />
        <Icon v-else-if="debtTrend === 'up'" name="trending-up" :size="12" />
        <Icon v-else name="minus" :size="12" />
      </span>
    </div>
    <div class="do-total num-flash" :key="'debt' + debtAnimKey">
      <template v-if="hide.total"><span class="masked">•••••••••</span></template>
      <template v-else>{{ fCurrFull(totalDebt) }}</template>
    </div>
    <div class="do-cards">
      <div class="do-card" :class="'do-card--' + c.minUrg" v-for="c in debtCards" :key="c.id">
        <!-- Row 1: name + edit -->
        <div class="do-r1">
          <div class="do-card-name">{{ c.name }}</div>
          <button class="do-card-edit" @click.stop="openEdit(c)" :title="$t('debt.editTooltip')">
            <Icon name="pencil" :size="11" />
          </button>
        </div>
        <!-- Row 2: balance + rate -->
        <div class="do-r2">
          <span class="do-card-bal"><template v-if="hide.cardBal">•••••</template><template v-else>{{ fCurr(c.balance) }}</template></span>
          <span class="do-card-rate">{{ c.rate }}{{ $t('debt.ratePerYear') }}</span>
        </div>
        <!-- Row 3: progress + pct -->
        <div class="do-r3">
          <div class="do-prog"><div class="do-prog-fill do-prog-fill-anim" :class="'do-prog--' + progLevel(c)" :style="{ width: usedPct(c) + '%' }"></div></div>
          <span class="do-card-pct">{{ usedPct(c) }}%</span>
        </div>
        <!-- Row 4: min or planned payment | amount/check | Xd | warn | date -->
        <div class="do-r4" :class="'do-r4--' + c.minUrg">
          <span class="do-min-label">{{ c.plannedPayment && !c.plannedPayment.isMin ? $t('debt.paidLabel') : $t('debt.minLabel') }}</span>
          <template v-if="c.minPaid">
            <span v-if="!hide.minPay" class="do-min-val" style="color:var(--accent3)">{{ fCurr(c.plannedPayment ? c.plannedPayment.amount : c.min) }}</span>
            <Icon name="check" :size="11" class="do-min-ico--ok" />
          </template>
          <template v-else-if="hide.minPay"><span class="do-min-val">•••</span></template>
          <template v-else>
            <span class="do-min-val">{{ fCurr(c.plannedPayment && !c.plannedPayment.isMin ? c.plannedPayment.amount : c.min) }}</span>
          </template>
          <template v-if="!c.minPaid && c.minDaysLeft !== null">
            <span v-if="c.minDaysLeft <= 0" class="do-min-tag do-min-tag--overdue">-{{ Math.abs(c.minDaysLeft) }}d</span>
            <span v-else-if="c.minDaysLeft <= 7" class="do-min-tag" :class="c.minDaysLeft <= 3 ? 'do-min-tag--urgent' : 'do-min-tag--soon'">{{ c.minDaysLeft }}d</span>
          </template>
          <template v-if="c.minDueDate">
            <Icon v-if="!c.minPaid && c.minDaysLeft !== null && c.minDaysLeft <= 3" name="alert-triangle" :size="9" class="do-min-warn" />
            <span class="do-min-date">{{ fDueShort(c.minDueDate) }}</span>
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
import Icon from './Icon.vue'
import { useFormatters } from '../composables/useFormatters'
import { useCurrency } from '../composables/useCurrency'

const { fN } = useFormatters()
const { fCurr, fCurrFull } = useCurrency()

function usedPct(c) {
  return c.limit > 0 ? Math.round(c.balance / c.limit * 100) : 0
}

function progLevel(c) {
  const pct = usedPct(c)
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
