<template>
  <div class="upcoming">
    <div class="c-hdr" style="position:sticky;top:0;background:var(--surface);padding:15px 20px;margin:-15px -20px 0;z-index:1;border-radius:16px 16px 0 0;">
      <span class="c-title">{{ $t('upcoming.title') }}</span>
      <span style="flex:1"></span>
      <span class="badge" style="margin-right:4px">{{ paidCount }}/{{ items.length }}</span>
      <span class="badge" style="margin-right:4px">{{ label }}</span>
      <button class="upcoming__edit-btn" @click="showAdd = true" :title="$t('upcoming.addTooltip')">
        <Icon name="plus" :size="14" />
      </button>
    </div>
    <div class="upcoming__list" style="max-height:calc(4 * 48px + 3 * 6px);overflow-y:auto;margin-top:11px;padding-right:2px;scroll-snap-type:y mandatory;">
      <div
        v-for="p in items"
        :key="p._key"
        class="upcoming__item"
        :class="p.paid ? 'upcoming__item--paid' : 'upcoming__item--' + p.urg"
        @click="$emit('open-detail', p)"
      >
        <div class="upcoming__date-col">
          <span class="upcoming__day" :style="p.paid ? { color: 'var(--muted)' } : {}">{{ p.day }}</span>
          <span class="upcoming__month">/{{ p.mo }}</span>
        </div>
        <div style="flex:1;min-width:0">
          <div class="upcoming__name" :style="p.paid ? { color: 'var(--muted)', textDecoration: 'line-through' } : {}">{{ getLocalized(p, 'name') }}</div>
          <div v-if="p.sub && !p.paid" class="upcoming__sub" :style="{ marginTop: '2px', color: p.overdueDays > 0 ? 'var(--danger)' : undefined, fontWeight: p.overdueDays > 0 ? '600' : undefined }">{{ p.sub }}</div>
          <div v-if="p.paid" class="upcoming__sub" style="color:var(--accent3);margin-top:2px"><Icon name="check" :size="11" /> {{ $t('upcoming.paid') }}</div>
        </div>
        <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;margin-left:8px">
          <div class="upcoming__amt-col">
            <div class="upcoming__amt" :style="p.paid ? { color: 'var(--muted)' } : {}">
              <template v-if="hide.amount">•••••</template>
              <template v-else>{{ fCurr(p.amt) }}</template>
            </div>
            <div v-if="!p.paid && !hide.shortage && availCash < p.amt" class="upcoming__shortage">
              {{ $t('upcoming.shortage', { amount: fCurr(p.amt - availCash) }) }}
            </div>
          </div>
          <button
            v-if="!p.paid"
            class="upcoming__check-btn"
            :class="{ 'upcoming__check-btn--disabled': availCash < p.amt }"
            :disabled="availCash < p.amt"
            @click.stop="$emit('toggle-paid', p._key, p.amt, p.name)"
            :title="availCash < p.amt ? $t('upcoming.notEnough') : $t('upcoming.payQuick')"
          >
            <Icon name="check" :size="13" />
          </button>
          <button
            v-else
            class="upcoming__check-btn upcoming__check-btn--done"
            @click.stop="$emit('toggle-paid', p._key, p.amt, p.name)"
            :title="$t('upcoming.undoPay')"
          >
            <Icon name="undo-2" :size="13" />
          </button>
        </div>
      </div>
    </div>

    <!-- Add popup -->
    <Transition name="popup">
      <div v-if="showAdd" class="popup-overlay" @click.self="showAdd = false">
        <div class="popup-sheet">
          <div class="popup-handle"><div class="popup-handle-bar"></div></div>
          <div class="popup-hdr">
            <span class="popup-title">{{ $t('upcoming.addPopup.title') }}</span>
            <button class="popup-close" @click="showAdd = false"><Icon name="x" :size="18" /></button>
          </div>
          <div class="popup-body">
            <div style="display:flex;gap:4px;background:var(--surface2);border-radius:9px;padding:3px;margin-bottom:12px">
              <button :class="['tab-btn', addType === 'pay' ? 'active' : '']" style="flex:1;font-size:11px" @click="addType = 'pay'">
                <Icon name="hand-coins" :size="12" /> {{ $t('upcoming.addPopup.tabPay') }}
              </button>
              <button :class="['tab-btn', addType === 'oneTime' ? 'active' : '']" style="flex:1;font-size:11px" @click="addType = 'oneTime'">
                <Icon name="pin" :size="12" /> {{ $t('upcoming.addPopup.tabOneTime') }}
              </button>
            </div>

            <!-- Trả nợ -->
            <template v-if="addType === 'pay'">
              <div class="popup-field">
                <label class="popup-label">{{ $t('upcoming.addPopup.selectDebt') }}</label>
                <select class="popup-input popup-input--sm" v-model="payTarget">
                  <option value="">{{ $t('upcoming.addPopup.selectDebtPlaceholder') }}</option>
                  <option v-for="c in debtCards" :key="c.id" :value="'cc:' + c.id">{{ getLocalized(c, 'name') }}{{ hide.amount ? '' : ' (' + t('debt.remaining') + ' ' + fCurr(c.balance) + ')' }}</option>
                  <option v-for="l in availableLoans" :key="l.id" :value="'sl:' + l.id">{{ getLocalized(l, 'name').split('—')[0].trim() }}{{ hide.amount ? '' : ' (' + t('debt.remaining') + ' ' + fCurr(l.remaining_balance) + ')' }}</option>
                </select>
              </div>
              <!-- Loan installment selector -->
              <div v-if="loanInstallments.length" class="popup-field">
                <label class="popup-label">{{ $t('upcoming.addPopup.selectPeriod') }}</label>
                <select class="popup-input popup-input--sm" v-model="payInstallment">
                  <option value="">{{ $t('upcoming.addPopup.selectPeriodPlaceholder') }}</option>
                  <option v-for="inst in loanInstallments" :key="inst.key" :value="inst.key">{{ inst.name }} — {{ inst.dateLabel }}{{ hide.amount ? '' : ' (' + fCurr(inst.amount) + ')' }}</option>
                </select>
              </div>
              <!-- Credit card payment level -->
              <div v-if="isCcTarget" class="popup-field">
                <label class="popup-label">{{ $t('upcoming.addPopup.payLevel') }}</label>
                <div style="display:flex;gap:4px;background:var(--surface2);border-radius:8px;padding:2px">
                  <button :class="['tab-btn', payLevel === 'min' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="payLevel = 'min'">
                    {{ $t('upcoming.addPopup.minimum') }}{{ selectedCard && !hide.amount ? ' (' + fCurr(selectedCard.min) + ')' : '' }}
                  </button>
                  <button :class="['tab-btn', payLevel === 'custom' ? 'active' : '']" style="flex:1;font-size:10px;padding:5px 0" @click="payLevel = 'custom'">
                    {{ $t('upcoming.addPopup.custom') }}
                  </button>
                </div>
              </div>
              <div v-if="payName" class="popup-field">
                <label class="popup-label">{{ $t('upcoming.addPopup.nameLabel') }}</label>
                <input class="popup-input popup-input--sm" v-model="payName" readonly style="font-family:var(--sans);opacity:.7" />
              </div>
              <div class="popup-row-2col">
                <div class="popup-field" style="flex:1">
                  <label class="popup-label">{{ $t('upcoming.addPopup.dateLabel') }}</label>
                  <input type="date" class="popup-input popup-input--sm popup-input--date" v-model="payDate" placeholder="dd/mm/yyyy" />
                </div>
                <div class="popup-field" style="flex:1">
                  <label class="popup-label">{{ $t('upcoming.addPopup.amountLabel') }}</label>
                  <div class="upcoming__input-wrap">
                    <input class="popup-input popup-input--sm" v-model.number="payAmt" type="number" inputmode="numeric" placeholder="0" />
                    <span class="upcoming__input-suffix">{{ currSymbol }}</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- Chi thêm -->
            <template v-if="addType === 'oneTime'">
              <div class="popup-field">
                <label class="popup-label">{{ $t('upcoming.addPopup.expenseNameLabel') }}</label>
                <input class="popup-input popup-input--sm" v-model="oneTimeName" :placeholder="$t('upcoming.addPopup.expensePlaceholder')" style="font-family:var(--sans)" />
              </div>
              <div class="popup-row-2col">
                <div class="popup-field" style="flex:1">
                  <label class="popup-label">{{ $t('upcoming.addPopup.dateLabel') }}</label>
                  <input type="date" class="popup-input popup-input--sm popup-input--date" v-model="oneTimeDate" placeholder="dd/mm/yyyy" />
                </div>
                <div class="popup-field" style="flex:1">
                  <label class="popup-label">{{ $t('upcoming.addPopup.amountLabel') }}</label>
                  <div class="upcoming__input-wrap">
                    <input class="popup-input popup-input--sm" v-model.number="oneTimeAmt" type="number" inputmode="numeric" placeholder="0" />
                    <span class="upcoming__input-suffix">{{ currSymbol }}</span>
                  </div>
                </div>
              </div>
            </template>
          </div>
          <div class="popup-actions">
            <button v-if="addType === 'pay'" class="popup-btn primary" style="background:var(--accent3)"
              @click="submitPay" :disabled="!payName || !payDate || !payAmt">{{ $t('upcoming.addPopup.addPayButton') }}</button>
            <button v-else class="popup-btn primary"
              @click="submitOneTime" :disabled="!oneTimeName || !oneTimeDate || !oneTimeAmt">{{ $t('upcoming.addPopup.addExpButton') }}</button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import Icon from '../ui/Icon.vue'
import { useCurrency } from '../../composables/api/useCurrency'
import { getLocalized } from '../../composables/data/useI18nData'

const { t } = useI18n()
const { fCurr, displayCurrency, convertBetween, ratesLoading } = useCurrency()

/** Ký hiệu tiền tệ hiển thị */
const currSymbol = computed(() => {
  const c = displayCurrency.value
  return c === 'USD' ? '$' : c === 'JPY' ? '¥' : '₫'
})

/** True khi display currency khác VND và tỷ giá đã load xong */
const useDisplayCur = computed(() => displayCurrency.value !== 'VND' && !ratesLoading.value)

/** Chuyển VND → display currency để hiển thị trong input */
function toDisplayAmt(vndAmt) {
  if (!vndAmt || !useDisplayCur.value) return vndAmt
  const converted = convertBetween(vndAmt, 'VND', displayCurrency.value)
  return displayCurrency.value === 'USD' ? Math.round(converted * 100) / 100 : Math.round(converted)
}

/** Chuyển display currency → VND để lưu trữ */
function toVndAmt(displayAmt) {
  if (!displayAmt || !useDisplayCur.value) return displayAmt
  return Math.round(convertBetween(displayAmt, displayCurrency.value, 'VND'))
}

const props = defineProps({
  items: Array,
  label: String,
  hide: Object,
  availCash: { type: Number, default: 0 },
  debtCards: { type: Array, default: () => [] },
  smallLoans: { type: Array, default: () => [] },
  monthlyPlans: { type: Object, default: () => ({}) },
  paidObligations: { type: Array, default: () => [] },
  oneTimeExpenses: { type: Array, default: () => [] },
})

const emit = defineEmits(['open-detail', 'toggle-paid', 'record-payment', 'add-one-time'])

const paidCount = computed(() => (props.items || []).filter((p) => p.paid).length)

const showAdd = ref(false)
const addType = ref('pay')
const payTarget = ref('')
const payAmt = ref(null)
const payInstallment = ref('')
const payName = ref('')
const payDate = ref('')
const payLevel = ref('min') // 'min' | 'custom'
const oneTimeName = ref('')
const oneTimeDate = ref('')
const oneTimeAmt = ref(null)

/** Is the current target a credit card? */
const isCcTarget = computed(() => payTarget.value.startsWith('cc:'))

/** Get the selected credit card object */
const selectedCard = computed(() => {
  if (!isCcTarget.value) return null
  return (props.debtCards || []).find((c) => c.id === payTarget.value.slice(3)) || null
})

/** Build payment name based on card, date, and level */
function buildCcPayName() {
  const card = selectedCard.value
  if (!card) return
  const d2 = payDate.value ? new Date(payDate.value) : null
  const monthLabel = d2 ? 'T' + (d2.getMonth() + 1) + '/' + d2.getFullYear() : ''
  if (payLevel.value === 'min') {
    payName.value = card.name + ' minimum' + (monthLabel ? ' ' + monthLabel : '')
  } else {
    payName.value = card.name + ' trả nợ' + (monthLabel ? ' ' + monthLabel : '')
  }
}

function resetPopup() {
  addType.value = 'pay'
  payTarget.value = ''
  payInstallment.value = ''
  payName.value = ''
  payDate.value = ''
  payAmt.value = null
  payLevel.value = 'min'
  oneTimeName.value = ''
  oneTimeDate.value = ''
  oneTimeAmt.value = null
}

watch(showAdd, (v) => {
  document.body.style.overflow = v ? 'hidden' : ''
  if (!v) resetPopup()
})

/** Set of keys already present in the upcoming list OR already created as one-time expenses */
const existingKeys = computed(() => {
  const s = new Set()
  // Keys from upcoming items (monthly_plans obligations + one_time_expenses already in list)
  ;(props.items || []).forEach((p) => { if (p._key) s.add(p._key) })
  // Also match by name from one_time_expenses (covers items not yet in upcoming view)
  ;(props.oneTimeExpenses || []).forEach((e) => s.add((e.name || '').toLowerCase()))
  return s
})

/** Filter out loans that have all remaining periods already scheduled */
const availableLoans = computed(() => {
  const paid = new Set(props.paidObligations || [])
  const existing = existingKeys.value
  return (props.smallLoans || []).filter((loan) => {
    const loanShort = loan.name.toLowerCase().split('—')[0].trim().split(' ').slice(0, 2).join(' ')
    const shortName = loan.name.split('—')[0].trim()
    const termMonths = loan.term_months || 0
    let hasAvailable = false
    // Check monthly_plans obligations
    const plans = props.monthlyPlans || {}
    Object.keys(plans).forEach((mo) => {
      const obs = plans[mo]?.obligations || []
      obs.forEach((ob) => {
        if (ob.monthly) return
        const n = (ob.name || '').toLowerCase()
        if (!n.includes(loanShort) || ob.category !== 'installment') return
        const dateStr = ob.date || ob['date '] || ''
        const key = dateStr + ':' + ob.name
        if (!paid.has(key) && !existing.has(key) && !existing.has(n)) hasAvailable = true
      })
    })
    if (hasAvailable) return true
    // Check payment_due_kỳN fields
    for (let i = 1; i <= termMonths; i++) {
      const dueDate = loan['payment_due_kỳ' + i]
      if (!dueDate) continue
      const suffix = i === termMonths ? ' kỳ cuối (' + i + '/' + termMonths + ')' : ' kỳ ' + i + '/' + termMonths
      const instName = shortName + suffix
      const key = dueDate + ':' + instName
      if (!paid.has(key) && !existing.has(key) && !existing.has(instName.toLowerCase())) return true
    }
    return false
  })
})

/** Find the next valid month for a credit card payment (skip months that already have a payment) */
function getNextCcPayDate(cardName, currentDate) {
  const existing = existingKeys.value
  const nameLower = cardName.toLowerCase()
  // Parse current date
  const d2 = currentDate ? new Date(currentDate) : new Date()
  // Try up to 12 months ahead
  for (let i = 1; i <= 12; i++) {
    const next = new Date(d2.getFullYear(), d2.getMonth() + i, d2.getDate())
    const nextStr = next.toISOString().slice(0, 10)
    const monthNum = next.getMonth() + 1
    const year = next.getFullYear()
    // Check if there's already a payment for this card in this month
    // Patterns: "Visa 1 minimum T4/2026", "Visa 1 — trả nợ" with date in that month
    let monthHasPayment = false
    const tLabel = 'T' + monthNum + '/' + year
    // Check upcoming items
    for (const p of (props.items || [])) {
      if (!p.name) continue
      const pLower = p.name.toLowerCase()
      if (!pLower.includes(nameLower)) continue
      // Check if the item's date falls in the target month
      const pDate = p._date || ''
      if (pDate && pDate.slice(0, 7) === next.toISOString().slice(0, 7)) { monthHasPayment = true; break }
      // Also check month label in name like "T4/2026"
      if (pLower.includes(tLabel.toLowerCase())) { monthHasPayment = true; break }
    }
    // Also check one_time_expenses
    if (!monthHasPayment) {
      for (const e of (props.oneTimeExpenses || [])) {
        if (!e.name) continue
        const eLower = e.name.toLowerCase()
        if (!eLower.includes(nameLower)) continue
        if (e.date && e.date.slice(0, 7) === next.toISOString().slice(0, 7)) { monthHasPayment = true; break }
        if (eLower.includes(tLabel.toLowerCase())) { monthHasPayment = true; break }
      }
    }
    if (!monthHasPayment) {
      const mo = String(monthNum)
      const nameWithMonth = cardName + ' minimum ' + tLabel
      return { date: nextStr, name: nameWithMonth, amount: null }
    }
  }
  return null
}

/** When payTarget is a small loan, find unpaid installments.
 *  Filters out: already paid + already in upcoming list + already created as one-time expense. */
const loanInstallments = computed(() => {
  const t = payTarget.value
  if (!t || !t.startsWith('sl:')) return []
  const loanId = t.slice(3)
  const loan = (props.smallLoans || []).find((l) => l.id === loanId)
  if (!loan) return []
  const loanShort = loan.name.toLowerCase().split('—')[0].trim().split(' ').slice(0, 2).join(' ')
  const paid = new Set(props.paidObligations || [])
  const existing = existingKeys.value
  const plans = props.monthlyPlans || {}
  const results = []
  const foundKeys = new Set()
  // 1) Scan monthly_plans for matching installments
  Object.keys(plans).sort().forEach((mo) => {
    const obs = plans[mo]?.obligations || []
    obs.forEach((ob) => {
      if (ob.monthly) return
      const n = (ob.name || '').toLowerCase()
      if (!n.includes(loanShort) || ob.category !== 'installment') return
      const dateStr = ob.date || ob['date '] || ''
      const key = dateStr + ':' + ob.name
      if (paid.has(key)) return
      if (existing.has(key) || existing.has(n)) return
      foundKeys.add(key)
      const d2 = dateStr.replace('~', '')
      const dateLabel = d2 ? new Date(d2).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) : mo
      results.push({ key, name: ob.name, amount: ob.amount, date: dateStr, dateLabel })
    })
  })
  // 2) Also generate installments from loan's payment_due_kỳN fields if not in plans
  const shortName = loan.name.split('—')[0].trim()
  const termMonths = loan.term_months || 0
  for (let i = 1; i <= termMonths; i++) {
    const dueKey = 'payment_due_kỳ' + i
    const dueDate = loan[dueKey]
    if (!dueDate) continue
    const suffix = i === termMonths ? ' kỳ cuối (' + i + '/' + termMonths + ')' : ' kỳ ' + i + '/' + termMonths
    const instName = shortName + suffix
    const key = dueDate + ':' + instName
    if (paid.has(key) || foundKeys.has(key)) continue
    if (existing.has(key) || existing.has(instName.toLowerCase())) continue
    const alreadyFound = results.some((r) => r.date === dueDate && r.name.toLowerCase().includes('kỳ ' + i + '/'))
    if (alreadyFound) continue
    const dateLabel = new Date(dueDate).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    results.push({ key, name: instName, amount: loan.monthly_payment || 0, date: dueDate, dateLabel })
  }
  results.sort((a, b) => a.date.localeCompare(b.date))
  return results
})

/** Reset fields when debt target changes */
watch(payTarget, () => {
  payInstallment.value = ''
  payName.value = ''
  payDate.value = ''
  payAmt.value = null
  payLevel.value = 'min'
  // For credit cards, set default amount — convert sang display currency nếu cần
  if (isCcTarget.value && selectedCard.value) {
    payAmt.value = toDisplayAmt(selectedCard.value.min || 0) || null
    buildCcPayName()
  }
})

/** When date changes for CC target, auto-update month label in name */
watch(payDate, () => {
  if (isCcTarget.value) buildCcPayName()
})

/** When payment level changes, update name and amount */
watch(payLevel, () => {
  if (!isCcTarget.value || !selectedCard.value) return
  buildCcPayName()
  if (payLevel.value === 'min') {
    // Convert min (VND) sang display currency để điền vào input
    payAmt.value = toDisplayAmt(selectedCard.value.min || 0) || null
  }
  // For custom level, keep whatever amount user has or clear to let them input
})

/** When installment selected, auto-fill name and amount */
watch(payInstallment, (key) => {
  if (!key) { payName.value = ''; payDate.value = ''; payAmt.value = null; return }
  const inst = loanInstallments.value.find((i) => i.key === key)
  if (inst) {
    payName.value = inst.name
    payDate.value = inst.date.replace('~', '')
    // Convert amount (VND) sang display currency để điền vào input
    payAmt.value = toDisplayAmt(inst.amount) || null
  }
})

function submitPay() {
  if (!payName.value || !payDate.value || !payAmt.value || payAmt.value <= 0) return
  // Chuyển về VND trước khi lưu (nếu đang nhập theo display currency)
  emit('add-one-time', { name: payName.value, date: payDate.value, amount: toVndAmt(payAmt.value) })
  payAmt.value = null
  payTarget.value = ''
  payDate.value = ''
  payName.value = ''
  payInstallment.value = ''
  showAdd.value = false
}

function openWithPrefill(data) {
  if (data.type === 'oneTime') {
    addType.value = 'oneTime'
    oneTimeName.value = data.name || ''
    oneTimeDate.value = data.date || ''
    oneTimeAmt.value = toDisplayAmt(data.amount) || null
  } else {
    addType.value = 'pay'
    // Try to auto-detect which debt target this belongs to
    const nameLower = (data.name || '').toLowerCase()
    let matched = ''
    for (const c of (props.debtCards || [])) {
      if (nameLower.includes(c.name.toLowerCase())) { matched = 'cc:' + c.id; break }
    }
    if (!matched) {
      for (const l of (props.smallLoans || [])) {
        const short = l.name.split('—')[0].trim().toLowerCase()
        if (nameLower.includes(short)) { matched = 'sl:' + l.id; break }
      }
    }
    // Set target first (triggers watcher that resets fields), then override with prefill data
    if (matched) {
      payTarget.value = matched
      // nextTick: watcher resets fields, then auto-select next available
      setTimeout(() => {
        if (matched.startsWith('sl:')) {
          const insts = loanInstallments.value
          if (insts.length) {
            payInstallment.value = insts[0].key
          }
        } else if (matched.startsWith('cc:')) {
          // Credit card: detect level from copied name and find next month
          const copiedName = (data.name || '').toLowerCase()
          const isMin = copiedName.includes('minimum')
          payLevel.value = isMin ? 'min' : 'custom'
          const card = (props.debtCards || []).find((c) => c.id === matched.slice(3))
          if (card) {
            const next = getNextCcPayDate(card.name, data.date || '')
            if (next) {
              payDate.value = next.date
              const rawAmt = isMin ? (card.minimum_payment || card.min || data.amount || null) : (data.amount || null)
              payAmt.value = toDisplayAmt(rawAmt) || null
              buildCcPayName()
            } else {
              payDate.value = data.date || ''
              payAmt.value = toDisplayAmt(data.amount) || null
              buildCcPayName()
            }
          }
        } else {
          payName.value = data.name || ''
          payDate.value = data.date || ''
          payAmt.value = data.amount || null
        }
      }, 0)
    } else {
      payName.value = data.name || ''
      payDate.value = data.date || ''
      payAmt.value = toDisplayAmt(data.amount) || null
    }
  }
  showAdd.value = true
}

defineExpose({ openWithPrefill })

function submitOneTime() {
  if (!oneTimeName.value || !oneTimeDate.value || !oneTimeAmt.value) return
  // Chuyển về VND trước khi lưu (nếu đang nhập theo display currency)
  emit('add-one-time', { name: oneTimeName.value, date: oneTimeDate.value, amount: toVndAmt(oneTimeAmt.value) })
  oneTimeName.value = ''
  oneTimeDate.value = ''
  oneTimeAmt.value = null
  showAdd.value = false
}
</script>

<style scoped>
.upcoming { background: var(--surface); border: 1px solid var(--border); border-radius: 16px; padding: 15px 20px; margin-bottom: 12px; }
.upcoming__list { display: flex; flex-direction: column; gap: 6px; scroll-snap-type: y mandatory; }
.upcoming__list > .upcoming__item { scroll-snap-align: start; }
.upcoming__item { display: flex; align-items: center; gap: 10px; padding: 9px 11px; background: var(--surface2); border-radius: 9px; border-left: 2px solid var(--border); min-height: 48px; box-sizing: border-box; cursor: pointer; transition: background .15s; -webkit-tap-highlight-color: transparent; }
.upcoming__item:active { background: var(--border); }
.upcoming__item--urgent { border-left-color: var(--accent2); }
.upcoming__item--overdue { border-left-color: var(--danger); background: rgba(var(--danger-rgb),.06); }
.upcoming__item--soon { border-left-color: var(--accent); }
.upcoming__item--ok { border-left-color: var(--accent3); }
.upcoming__item--paid { opacity: .6; }
.upcoming__date-col { display: flex; flex-direction: column; align-items: center; min-width: 22px; }
.upcoming__day { font-family: var(--mono); font-size: 15px; font-weight: 700; color: var(--text); display: block; line-height: 1; }
.upcoming__month { font-family: var(--mono); font-size: 9px; color: var(--muted); }
.upcoming__name { flex: 1; font-size: 12px; font-weight: 600; color: rgba(var(--text-rgb),.75); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.upcoming__sub { font-size: 10px; color: var(--muted); }
.upcoming__amt-col { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.upcoming__amt { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--accent2); flex-shrink: 0; min-width: 5.5ch; text-align: right; }
.upcoming__shortage { font-family: var(--mono); font-size: 9px; color: var(--accent6); text-align: right; white-space: nowrap; }
.upcoming__check-btn { background: none; border: 1px solid rgba(var(--accent3-rgb),.3); border-radius: 6px; color: var(--accent3); width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; flex-shrink: 0; padding: 0; }
.upcoming__check-btn:hover { background: rgba(var(--accent3-rgb),.12); border-color: var(--accent3); }
.upcoming__check-btn--disabled { border-color: var(--border); color: var(--muted); cursor: not-allowed; opacity: .5; }
.upcoming__check-btn--done { border-color: rgba(var(--accent-rgb),.3); color: var(--accent); }
.upcoming__check-btn--done:hover { background: rgba(var(--accent-rgb),.12); border-color: var(--accent); }
.upcoming__edit-btn { background: none; border: 1px solid var(--border); border-radius: 6px; color: var(--muted); width: 26px; height: 26px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all .2s; flex-shrink: 0; padding: 0; }
.upcoming__edit-btn:hover { background: var(--surface2); color: var(--text); border-color: var(--accent); }
/* Input với suffix ký hiệu tiền tệ bên phải */
.upcoming__input-wrap { position: relative; display: flex; align-items: center; }
.upcoming__input-wrap .popup-input { flex: 1; padding-right: 28px; }
.upcoming__input-suffix { position: absolute; right: 10px; font-family: var(--mono); font-size: 11px; font-weight: 700; color: var(--muted); pointer-events: none; }
</style>
