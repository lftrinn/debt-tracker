<template>
  <div class="enemy-row" :style="gridStyle">
    <div
      v-for="e in enemies"
      :key="e.id"
      :class="['enemy', e._color]"
      @click="openEdit(e)"
    >
      <div class="enemy-portrait">
        <component :is="e._sprite" :size="26" />
      </div>
      <div class="enemy-name">{{ e._display }}</div>
      <div v-if="useDisplay" class="enemy-real">{{ e.name }}</div>
      <div class="enemy-hp">
        <template v-if="hide.hp">●●●</template>
        <template v-else>{{ fmtShort(e.balance) }}đ</template>
      </div>
      <div class="enemy-bar"><span :style="{ width: e._pct + '%' }"></span></div>
      <div class="enemy-foot">
        <span>{{ e._pct }}% HP</span>
        <span :class="['due', { urg: e._urg }]">{{ e._dueShort }}</span>
      </div>
    </div>
  </div>

  <!-- Hồ sơ ma chướng popup · port design popup-hero + stats trên cùng + edit form -->
  <Transition name="popup">
    <div v-if="editCard" class="popup-overlay" @click.self="closeEdit">
      <div class="popup-sheet">
        <div class="popup-handle"><div class="popup-handle-bar"></div></div>
        <div class="popup-hdr">
          <span class="popup-title">
            <IconDemon :size="16" />
            {{ $t('enemy.title') }}
          </span>
          <button class="popup-close" @click="closeEdit">
            <Icon name="x" :size="18" />
          </button>
        </div>

        <!-- Hero · boss portrait + name + balance -->
        <div class="popup-hero" v-if="editCardEnriched">
          <div class="portrait">
            <component :is="editCardEnriched.sprite" :size="40" />
          </div>
          <div class="nm">{{ editCardEnriched.display }}</div>
          <div v-if="useDisplay" class="real">
            {{ editCard.name }} · {{ editCardEnriched.realm }}
          </div>
          <div class="amt">
            <span class="cu">đ</span>
            <template v-if="hide.amounts">●●●●●●</template>
            <template v-else>{{ fN(editCard.balance) }}</template>
          </div>
        </div>

        <!-- 4-stat grid · HP max / Due / %HP / Đã hạ -->
        <div class="popup-stats" v-if="editCardEnriched">
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statHpMax') }}</div>
            <div class="v">{{ hide.amounts ? '●●●' : fmtShort(editCard.credit_limit) }}đ</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statDue') }}</div>
            <div class="v gd">{{ editCardEnriched.dueShort || '—' }}</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statPctHp') }}</div>
            <div class="v hp">{{ editCardEnriched.pct }}%</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statSlain') }}</div>
            <div class="v gn">{{ 100 - editCardEnriched.pct }}%</div>
          </div>
        </div>

        <div class="popup-body">
          <!-- Balance field -->
          <div class="popup-field">
            <label class="popup-label">
              {{ (hide.amounts) ? $t('debt.balanceHiddenLabel') : $t('debt.balanceLabel') }}
            </label>
            <div v-if="hide.amounts" class="popup-input" style="display:flex;align-items:center;color:var(--muted);font-size:12px">
              {{ balPct(editCard) }}{{ $t('debt.balanceHiddenValue') }}
            </div>
            <div v-else-if="useDisplayCur && !ratesLoading" class="enemy__dual-inputs">
              <div class="enemy__input-wrap">
                <input class="popup-input" v-model.number="editBal" type="number" inputmode="numeric" :placeholder="String(editCard.balance)" @input="onEditBalInput" />
                <span class="enemy__input-suffix">VND</span>
              </div>
              <span class="enemy__dual-sep">≈</span>
              <div class="enemy__input-wrap">
                <input class="popup-input" v-model.number="editBalDisplay" type="number" inputmode="numeric" :placeholder="String(displayVal(editCard.balance) ?? '')" @input="onEditBalDisplayInput" />
                <span class="enemy__input-suffix">{{ currSymbol }}</span>
              </div>
            </div>
            <div v-else class="enemy__input-wrap">
              <input class="popup-input" v-model.number="editBal" type="number" inputmode="numeric" :placeholder="String(editCard.balance)" />
              <span class="enemy__input-suffix">{{ currSymbol }}</span>
            </div>
          </div>

          <!-- Minimum payment field -->
          <div class="popup-field">
            <label class="popup-label">
              {{ (hide.amounts) ? $t('debt.minHiddenLabel') : $t('debt.minLabel2') }}
            </label>
            <div v-if="hide.amounts" class="popup-input" style="display:flex;align-items:center;color:var(--muted);font-size:12px">
              {{ minPct(editCard) }}{{ $t('debt.minHiddenValue') }}
            </div>
            <div v-else-if="useDisplayCur && !ratesLoading" class="enemy__dual-inputs">
              <div class="enemy__input-wrap">
                <input class="popup-input" v-model.number="editMin" type="number" inputmode="numeric" :placeholder="String(editCard.minimum_payment)" @input="onEditMinInput" />
                <span class="enemy__input-suffix">VND</span>
              </div>
              <span class="enemy__dual-sep">≈</span>
              <div class="enemy__input-wrap">
                <input class="popup-input" v-model.number="editMinDisplay" type="number" inputmode="numeric" :placeholder="String(displayVal(editCard.minimum_payment) ?? '')" @input="onEditMinDisplayInput" />
                <span class="enemy__input-suffix">{{ currSymbol }}</span>
              </div>
            </div>
            <div v-else class="enemy__input-wrap">
              <input class="popup-input" v-model.number="editMin" type="number" inputmode="numeric" :placeholder="String(editCard.minimum_payment)" />
              <span class="enemy__input-suffix">{{ currSymbol }}</span>
            </div>
          </div>

          <!-- Due date field -->
          <div class="popup-field">
            <label class="popup-label">{{ $t('debt.dueDateLabel') }}</label>
            <input
              class="popup-input"
              v-model="editDueDate"
              type="date"
              :disabled="hide.amounts"
              :placeholder="editCard.min_due_date || $t('debt.dueDatePlaceholder')"
            />
          </div>
        </div>
        <div v-if="!hide.amounts" class="popup-actions">
          <button class="popup-btn attack" @click="saveEdit" :disabled="editBal == null && editMin == null && !editDueDate">
            {{ $t('debt.updateButton') }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, type FunctionalComponent } from 'vue'
import Icon from '@/components/ui/Icon.vue'
import { IconDemon, SPRITE, type IconProps } from '@/components/ui/quest-icons'
import { useCurrency } from '@/composables/api/useCurrency'
import { useFormatters } from '@/composables/ui/useFormatters'
import { bossFor } from '@/composables/data/useTutienNames'
import type { CreditCard } from '@/types/data'

const props = defineProps<{
  /** Mảng credit card từ d.value.debts.credit_cards */
  cards: CreditCard[]
  /** Privacy: hp ẩn HP enemy, amounts ẩn input edit */
  hide: { hp: boolean; amounts: boolean }
  /** Hiện real_name dưới display name */
  useDisplay: boolean
}>()

const emit = defineEmits<{
  'update-card': [
    payload: { cardId: string; balance?: number; min?: number; minDueDate?: string },
  ]
}>()

const { fCurr, displayCurrency, convertBetween, toVnd, ratesLoading } = useCurrency()
const { fN } = useFormatters()

interface EnrichedEnemy extends CreditCard {
  _display: string
  _sprite: FunctionalComponent<IconProps>
  _color: 'crimson' | 'violet' | 'gold-stop'
  _pct: number
  _urg: boolean
  _dueShort: string
}

/** Format ngắn "1.2M" / "500K" / "1.234" */
function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}

function fmtDueShort(dateStr: string | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** % "HP còn lại" của enemy = balance / limit · utilization */
function utilizationPct(card: CreditCard): number {
  if (!card.credit_limit) return 0
  return Math.max(0, Math.min(100, Math.round((card.balance / card.credit_limit) * 100)))
}

const enemies = computed<EnrichedEnemy[]>(() =>
  props.cards.map((card, idx) => {
    const boss = bossFor(card, idx)
    const dueShort = fmtDueShort(card.min_due_date)
    return {
      ...card,
      _display: boss.display,
      _sprite: SPRITE[boss.sp],
      _color: 'crimson',
      _pct: utilizationPct(card),
      _urg: false, // sẽ tính sau dựa trên dueDate
      _dueShort: dueShort,
    } as EnrichedEnemy
  }),
)

/** Grid columns adapt theo số enemy (max 3 mỗi hàng theo design). */
const gridStyle = computed(() => {
  const n = Math.min(3, enemies.value.length || 1)
  return { gridTemplateColumns: `repeat(${n}, 1fr)` }
})

// ─── EDIT POPUP STATE · port từ DebtOverview ────────────────────────────
const editCard = ref<CreditCard | null>(null)

/** Enrich editCard với boss display + sprite + pct + dueShort cho hero/stats. */
const editCardEnriched = computed(() => {
  if (!editCard.value) return null
  const idx = props.cards.findIndex((c) => c.id === editCard.value!.id)
  const boss = bossFor(editCard.value, idx)
  return {
    display: boss.display,
    sprite: SPRITE[boss.sp],
    realm: boss.realm,
    pct: utilizationPct(editCard.value),
    dueShort: fmtDueShort(editCard.value.min_due_date),
  }
})
const editBal = ref<number | null>(null)
const editMin = ref<number | null>(null)
const editDueDate = ref('')
const editBalDisplay = ref<number | null>(null)
const editMinDisplay = ref<number | null>(null)
let editBalFromDisplay = false
let editMinFromDisplay = false

const currSymbol = computed(() => displayCurrency.value)
const useDisplayCur = computed(() => displayCurrency.value !== 'VND')

function displayVal(vnd: number): number | null {
  if (!useDisplayCur.value || ratesLoading.value) return null
  const v = convertBetween(vnd, 'VND', displayCurrency.value)
  return displayCurrency.value === 'USD' ? Math.round(v * 100) / 100 : Math.round(v)
}

function onEditBalInput(): void {
  if (editBalFromDisplay) return
  editBalDisplay.value = editBal.value != null ? displayVal(editBal.value) : null
}
function onEditBalDisplayInput(): void {
  editBalFromDisplay = true
  if (editBalDisplay.value != null) editBal.value = Math.round(toVnd(editBalDisplay.value, displayCurrency.value))
  nextTick(() => { editBalFromDisplay = false })
}
function onEditMinInput(): void {
  if (editMinFromDisplay) return
  editMinDisplay.value = editMin.value != null ? displayVal(editMin.value) : null
}
function onEditMinDisplayInput(): void {
  editMinFromDisplay = true
  if (editMinDisplay.value != null) editMin.value = Math.round(toVnd(editMinDisplay.value, displayCurrency.value))
  nextTick(() => { editMinFromDisplay = false })
}

function openEdit(e: EnrichedEnemy): void {
  // Lấy raw card (không có _display/_sprite/etc)
  const raw = props.cards.find((c) => c.id === e.id)
  if (!raw) return
  editCard.value = raw
  editBal.value = null
  editMin.value = null
  editBalDisplay.value = null
  editMinDisplay.value = null
  editDueDate.value = raw.min_due_date || ''
}

function closeEdit(): void {
  editCard.value = null
}

function saveEdit(): void {
  if (!editCard.value) return
  if (editBal.value == null && editMin.value == null && !editDueDate.value) return
  emit('update-card', {
    cardId: editCard.value.id,
    balance: editBal.value ?? undefined,
    min: editMin.value ?? undefined,
    minDueDate: editDueDate.value || undefined,
  })
  editCard.value = null
}

/** Body overflow lock khi popup mở. */
watch(editCard, (v) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = v ? 'hidden' : ''
  }
})

/** % balance trên tổng cc debt (cho hidden display). */
const totalCcDebt = computed(() => props.cards.reduce((s, c) => s + (c.balance || 0), 0))
function balPct(c: CreditCard): number {
  return totalCcDebt.value > 0 ? Math.round(c.balance / totalCcDebt.value * 100) : 0
}
function minPct(c: CreditCard): string {
  return c.balance > 0 ? ((c.minimum_payment / c.balance) * 100).toFixed(1) : '0'
}
// expose cho template
defineExpose({ fCurr })
</script>

<style scoped>
/* ─── ENEMY ROW · port 1:1 từ design ────────────────────────────────────── */
.enemy-row {
  display: grid; gap: 7px;
}

.enemy {
  position: relative;
  padding: 12px 8px 10px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid var(--line);
  border-radius: 5px;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  min-height: 145px;
  transition: transform 0.15s, border-color 0.2s;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.enemy::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: var(--gold);
}
.enemy.crimson::before { background: var(--crimson); }
.enemy.violet::before { background: var(--violet); }
.enemy:active { transform: translateY(1px); }

/* Portrait · vòng radial với sprite mask */
.enemy-portrait {
  width: 42px; height: 42px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  position: relative;
}
.enemy.crimson .enemy-portrait {
  background: radial-gradient(circle at 30% 30%, #6a2540, #2a0e18);
  border: 1px solid var(--crimson);
  color: var(--crimson);
  box-shadow: 0 0 10px rgba(var(--crimson-rgb), 0.3);
}
.enemy.gold-stop .enemy-portrait {
  background: radial-gradient(circle at 30% 30%, #5a4220, #2a1e08);
  border: 1px solid var(--gold);
  color: var(--gold);
  box-shadow: 0 0 10px rgba(var(--gold-rgb), 0.3);
}
.enemy.violet .enemy-portrait {
  background: radial-gradient(circle at 30% 30%, #4a2570, #1a0838);
  border: 1px solid var(--violet);
  color: var(--violet);
  box-shadow: 0 0 10px rgba(var(--violet-rgb), 0.3);
}
.enemy-portrait::before {
  content: ''; position: absolute; inset: -3px;
  border: 1px dashed currentColor;
  border-radius: 50%;
  opacity: 0.4;
  animation: spin 16s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .enemy-portrait::before { animation: none; }
}

/* Name + real */
.enemy-name {
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 11px; text-align: center; line-height: 1.15;
  letter-spacing: 0.02em;
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}
.enemy.crimson .enemy-name { color: var(--crimson); }
.enemy.gold-stop .enemy-name { color: var(--gold); }
.enemy.violet .enemy-name { color: var(--violet); }

.enemy-real {
  font-family: var(--mono); font-size: 8.5px;
  color: var(--muted);
  text-align: center;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  width: 100%;
}

/* HP */
.enemy-hp {
  font-family: var(--mono); font-weight: 700;
  font-size: 12px; line-height: 1;
  letter-spacing: -0.02em;
}
.enemy.crimson .enemy-hp { color: var(--crimson); }
.enemy.gold-stop .enemy-hp { color: var(--gold-2); }
.enemy.violet .enemy-hp { color: var(--violet); }

.enemy-bar {
  width: 100%; height: 4px;
  background: var(--ink);
  border-radius: 2px;
  overflow: hidden;
}
.enemy-bar > span {
  display: block; height: 100%;
  border-radius: 2px;
}
.enemy.crimson .enemy-bar > span {
  background: linear-gradient(90deg, var(--crimson-deep), var(--crimson));
}
.enemy.gold-stop .enemy-bar > span {
  background: linear-gradient(90deg, var(--gold-3), var(--gold));
}
.enemy.violet .enemy-bar > span {
  background: linear-gradient(90deg, #5a3580, var(--violet));
}

.enemy-foot {
  width: 100%;
  display: flex; justify-content: space-between; align-items: center;
  font-family: var(--mono); font-size: 8.5px;
  color: var(--muted);
  margin-top: auto;
}
.enemy-foot .due { color: var(--gold); font-weight: 600; }
.enemy-foot .due.urg { color: var(--crimson); }

/* ─── EDIT POPUP · dual-input wrap (riêng cho enemy edit) ───────────────── */
.enemy__input-wrap {
  position: relative; display: flex; align-items: center;
}
.enemy__input-wrap .popup-input {
  flex: 1; padding-right: 44px; min-width: 0;
}
.enemy__input-suffix {
  position: absolute; right: 8px;
  font-family: var(--mono); font-size: 9px; font-weight: 700;
  padding: 1px 6px; border-radius: 4px;
  background: rgba(var(--gold-rgb), 0.12);
  color: var(--gold);
  pointer-events: none;
}
.enemy__dual-inputs {
  display: flex; gap: 6px; align-items: center;
}
.enemy__dual-inputs .enemy__input-wrap { flex: 1; min-width: 0; }
.enemy__dual-sep {
  font-family: var(--mono); font-size: 10px;
  color: var(--muted);
  flex-shrink: 0;
}
</style>
