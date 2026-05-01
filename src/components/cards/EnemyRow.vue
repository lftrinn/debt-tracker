<template>
  <div class="enemy-row" :style="gridStyle">
    <div
      v-for="e in enemies"
      :key="e.id"
      :class="['enemy', `tier-${e._tier.key}`]"
      :style="enemyStyle(e)"
      @click="openEdit(e)"
    >
      <!-- Tier rank badge corner -->
      <div class="tier-rank">{{ e._tier.rank.split(' · ')[0] }}</div>
      <div class="enemy-portrait">
        <component :is="e._portrait" :size="30" />
      </div>
      <div class="enemy-name">{{ e._display }}</div>
      <div v-if="useDisplay" class="enemy-real">{{ e.name }}</div>
      <div class="enemy-hp">
        <template v-if="hide.hp"><span class="masked">{{ MASK_SHORT }}</span></template>
        <template v-else>{{ fmtShort(e.amount) }}đ</template>
      </div>
      <div class="enemy-bar"><span :style="{ width: e._pct + '%' }"></span></div>
      <div class="enemy-foot">
        <span class="danger-mini">
          <i v-for="i in e._tier.danger" :key="i"></i>
        </span>
        <span :class="['due', { urg: e._urg }]">{{ e._dueShort }}</span>
      </div>
    </div>
  </div>

  <!-- Hồ sơ ma chướng popup -->
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

        <!-- Hero · tier-aware portrait + name + balance -->
        <div
          v-if="editEnriched"
          :class="['popup-hero', `tier-${editEnriched.tier.key}`]"
          :style="{ '--tier-color': editEnriched.tier.color, '--tier-glow': editEnriched.tier.glow }"
        >
          <div class="tier-badge">{{ editEnriched.tier.classn }} · {{ editEnriched.tier.rank }}</div>
          <div class="portrait tier-portrait">
            <component :is="editEnriched.portrait" :size="48" />
          </div>
          <div class="danger-pips center">
            <span v-for="i in 9" :key="i" :class="{ on: i <= editEnriched.tier.danger }"></span>
          </div>
          <div class="nm">{{ editEnriched.display }}</div>
          <div class="popup-realm">{{ editEnriched.tier.realm }} · {{ editEnriched.tier.desc }}</div>
          <div class="amt">
            <span class="cu">đ</span>
            <template v-if="hide.amounts"><span class="masked">{{ MASK_GLYPHS }}</span></template>
            <template v-else>{{ fN(editCard.amount) }}</template>
          </div>
        </div>

        <div v-if="useDisplay && editCard" class="popup-realdata">
          <div class="lab">▾ Nguồn thật</div>
          <div class="rn">{{ editCard.name }}</div>
          <div v-if="editCard.note" class="dn">{{ editCard.note }}</div>
        </div>

        <!-- 4-stat grid -->
        <div class="popup-stats" v-if="editEnriched">
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statHpMax') }}</div>
            <div class="v">{{ hide.amounts ? MASK_SHORT : fmtShort(editCard.credit_limit) }}đ</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statDue') }}</div>
            <div class="v gd">{{ editEnriched.dueShort || '—' }}</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statPctHp') }}</div>
            <div class="v hp">{{ editEnriched.pct }}%</div>
          </div>
          <div class="popup-stat">
            <div class="l">{{ $t('enemy.statSlain') }}</div>
            <div class="v gn">{{ 100 - editEnriched.pct }}%</div>
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
                <input class="popup-input" v-model.number="editBal" type="number" inputmode="numeric" :placeholder="String(editCard.amount)" @input="onEditBalInput" />
                <span class="enemy__input-suffix">VND</span>
              </div>
              <span class="enemy__dual-sep">≈</span>
              <div class="enemy__input-wrap">
                <input class="popup-input" v-model.number="editBalDisplay" type="number" inputmode="numeric" :placeholder="String(displayVal(editCard.amount) ?? '')" @input="onEditBalDisplayInput" />
                <span class="enemy__input-suffix">{{ currSymbol }}</span>
              </div>
            </div>
            <div v-else class="enemy__input-wrap">
              <input class="popup-input" v-model.number="editBal" type="number" inputmode="numeric" :placeholder="String(editCard.amount)" />
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
              :placeholder="editCard.due_date || $t('debt.dueDatePlaceholder')"
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
import { IconDemon } from '@/components/ui/quest-icons'
import { useCurrency } from '@/composables/api/useCurrency'
import { useFormatters } from '@/composables/ui/useFormatters'
import { MASK_GLYPHS, MASK_SHORT } from '@/composables/ui/usePrivacy'
import { tierForAmount, nameForBoss, type BossTier } from '@/composables/data/useBossTiers'
import { TIER_PORTRAITS, type BossPortraitProps } from '@/components/ui/quest-bosses'
import type { DebtItem } from '@/types/data'

/** EnemyDebt = DebtItem có credit_limit non-null (small loan đã được fill từ App.vue allEnemyDebts). */
type EnemyDebt = DebtItem & { credit_limit: number }

const props = defineProps<{
  cards: EnemyDebt[]
  hide: { hp: boolean; amounts: boolean }
  useDisplay: boolean
}>()

const emit = defineEmits<{
  'update-card': [
    payload: { cardId: string; balance?: number; min?: number; minDueDate?: string },
  ]
}>()

const { fCurr, displayCurrency, convertBetween, toVnd, ratesLoading } = useCurrency()
const { fN } = useFormatters()

interface EnrichedEnemy extends EnemyDebt {
  _display: string
  _portrait: FunctionalComponent<BossPortraitProps>
  _tier: BossTier
  _pct: number
  _urg: boolean
  _dueShort: string
}

function fmtShort(n: number): string {
  const a = Math.abs(n)
  if (a >= 1e9) return (a / 1e9).toFixed(1).replace(/\.0$/, '') + 'B'
  if (a >= 1e6) return (a / 1e6).toFixed(1).replace(/\.0$/, '') + 'M'
  if (a >= 1e3) return (a / 1e3).toFixed(0) + 'K'
  return String(Math.round(a))
}

function fmtDueShort(dateStr: string | undefined | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** Bar fill %: amount / credit_limit. Cap 0-100. */
function utilizationPct(card: EnemyDebt): number {
  if (!card.credit_limit) return 0
  return Math.max(0, Math.min(100, Math.round((card.amount / card.credit_limit) * 100)))
}

const enemies = computed<EnrichedEnemy[]>(() =>
  props.cards.map((card) => {
    const tier = tierForAmount(card.amount)
    return {
      ...card,
      _display: nameForBoss(tier, card.id || card.name),
      _portrait: TIER_PORTRAITS[tier.key],
      _tier: tier,
      _pct: utilizationPct(card),
      _urg: false,
      _dueShort: fmtDueShort(card.due_date),
    } satisfies EnrichedEnemy
  }),
)

/** Per-card style: tier color CSS vars. */
function enemyStyle(e: EnrichedEnemy): Record<string, string> {
  return {
    '--tier-color': e._tier.color,
    '--tier-glow': e._tier.glow,
  }
}

const gridStyle = computed(() => {
  const n = Math.min(3, enemies.value.length || 1)
  return { gridTemplateColumns: `repeat(${n}, 1fr)` }
})

// ─── EDIT POPUP STATE ──────────────────────────────────────────────────
const editCard = ref<EnemyDebt | null>(null)

const editEnriched = computed(() => {
  if (!editCard.value) return null
  const tier = tierForAmount(editCard.value.amount)
  return {
    tier,
    portrait: TIER_PORTRAITS[tier.key],
    display: nameForBoss(tier, editCard.value.id || editCard.value.name),
    pct: utilizationPct(editCard.value),
    dueShort: fmtDueShort(editCard.value.due_date),
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
  const raw = props.cards.find((c) => c.id === e.id)
  if (!raw) return
  editCard.value = raw
  editBal.value = null
  editMin.value = null
  editBalDisplay.value = null
  editMinDisplay.value = null
  editDueDate.value = raw.due_date || ''
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

watch(editCard, (v) => {
  if (typeof document !== 'undefined') {
    document.body.style.overflow = v ? 'hidden' : ''
  }
})

const totalCcDebt = computed(() => props.cards.reduce((s, c) => s + (c.amount || 0), 0))
function balPct(c: EnemyDebt): number {
  return totalCcDebt.value > 0 ? Math.round(c.amount / totalCcDebt.value * 100) : 0
}
function minPct(c: EnemyDebt): string {
  return c.amount > 0 ? ((c.minimum_payment / c.amount) * 100).toFixed(1) : '0'
}
defineExpose({ fCurr })
</script>

<style scoped>
/* ─── ENEMY ROW · tier-aware port từ design ─────────────────────────── */
.enemy-row {
  display: grid; gap: 7px;
}

.enemy {
  position: relative;
  padding: 12px 8px 10px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px solid color-mix(in srgb, var(--tier-color, var(--gold)) 35%, var(--paper));
  border-radius: 5px;
  cursor: pointer;
  display: flex; flex-direction: column; align-items: center;
  gap: 6px;
  min-height: 145px;
  transition: all 0.15s;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
}
.enemy::before {
  content: ''; position: absolute;
  top: 0; left: 0; right: 0; height: 2px;
  background: var(--tier-color, var(--gold));
}
.enemy:hover {
  border-color: var(--tier-color, var(--gold));
  box-shadow: 0 0 12px color-mix(in srgb, var(--tier-glow, var(--gold)) 30%, transparent);
}
.enemy:active { transform: translateY(1px); }

/* Tier rank badge — top right corner */
.tier-rank {
  position: absolute; top: 4px; right: 6px; z-index: 2;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 9px; color: var(--tier-color);
  letter-spacing: 0.1em; opacity: 0.85;
}

/* Danger mini · tiny dots in foot */
.danger-mini { display: inline-flex; gap: 1.5px; align-items: center; }
.danger-mini i {
  display: block; width: 3px; height: 3px; border-radius: 50%;
  background: var(--tier-color);
  box-shadow: 0 0 3px color-mix(in srgb, var(--tier-glow) 70%, transparent);
}

/* Portrait · tier radial */
.enemy-portrait {
  width: 42px; height: 42px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%,
    color-mix(in srgb, var(--tier-color) 45%, var(--ink)),
    color-mix(in srgb, var(--tier-color) 10%, var(--ink)) 75%);
  border: 1px solid var(--tier-color);
  display: flex; align-items: center; justify-content: center;
  color: var(--tier-color);
  box-shadow: 0 0 10px color-mix(in srgb, var(--tier-glow) 30%, transparent);
  margin-bottom: 4px;
  position: relative;
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
  color: var(--tier-color, var(--text));
  overflow: hidden; text-overflow: ellipsis;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
}

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
  color: var(--tier-color, var(--text));
}

.enemy-bar {
  width: 100%; height: 4px;
  background: var(--ink);
  border-radius: 2px;
  overflow: hidden;
}
.enemy-bar > span {
  display: block; height: 100%;
  border-radius: 2px;
  background: linear-gradient(90deg,
    color-mix(in srgb, var(--tier-color) 60%, var(--ink)),
    var(--tier-color));
  box-shadow: 0 0 6px color-mix(in srgb, var(--tier-glow) 50%, transparent);
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

/* ─── EDIT POPUP · tier-aware hero ──────────────────────────────────── */
.popup-hero {
  margin-top: 16px; padding: 22px 14px;
  background:
    radial-gradient(ellipse at 50% 0%, color-mix(in srgb, var(--tier-color, var(--crimson)) 22%, transparent) 0%, transparent 60%),
    var(--ink);
  border: 1px solid var(--tier-color, var(--line-2));
  border-radius: 6px;
  text-align: center; position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 30px color-mix(in srgb, var(--tier-color, transparent) 12%, transparent);
}
.popup-hero::before {
  content: ''; position: absolute;
  top: -50%; left: -50%; width: 200%; height: 200%;
  background: conic-gradient(from 0deg at 50% 50%,
    transparent 0deg,
    color-mix(in srgb, var(--tier-glow, var(--gold)) 6%, transparent) 60deg,
    transparent 120deg,
    color-mix(in srgb, var(--tier-color, var(--crimson)) 6%, transparent) 240deg,
    transparent 360deg);
  animation: spin 14s linear infinite;
  pointer-events: none;
}
.tier-badge {
  position: relative; z-index: 2;
  display: inline-block;
  font-family: var(--serif); font-style: italic; font-weight: 700;
  font-size: 10px; color: var(--tier-color);
  letter-spacing: 0.18em; text-transform: uppercase;
  padding: 4px 10px; margin-bottom: 12px;
  border: 1px solid color-mix(in srgb, var(--tier-color) 50%, transparent);
  border-radius: 2px;
  background: color-mix(in srgb, var(--tier-color) 8%, var(--ink));
  text-shadow: 0 0 6px color-mix(in srgb, var(--tier-glow) 40%, transparent);
}
.popup-hero .portrait.tier-portrait {
  width: 78px; height: 78px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 30%,
    color-mix(in srgb, var(--tier-color) 50%, var(--ink)),
    color-mix(in srgb, var(--tier-color) 8%, var(--ink)) 75%);
  border: 2px solid var(--tier-color);
  margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  color: var(--tier-color);
  position: relative;
  box-shadow: 0 0 24px color-mix(in srgb, var(--tier-glow) 60%, transparent);
}
.popup-hero .portrait.tier-portrait::before {
  content: ''; position: absolute; inset: -8px; border-radius: 50%;
  border: 1px dashed var(--tier-color);
  animation: spin 18s linear infinite;
}
.danger-pips {
  display: flex; gap: 2px; z-index: 3;
  margin: 8px auto 0;
  max-width: 120px;
  justify-content: center;
}
.danger-pips span {
  width: 4px; height: 4px; border-radius: 1px;
  background: rgba(255, 255, 255, 0.12);
}
.danger-pips span.on {
  background: var(--tier-color);
  box-shadow: 0 0 5px color-mix(in srgb, var(--tier-glow) 80%, transparent);
}
.popup-realm {
  position: relative; z-index: 2;
  font-family: var(--mono); font-size: 9.5px; color: var(--muted);
  letter-spacing: 0.14em; text-transform: uppercase;
  margin-top: 6px;
}
.popup-hero .nm {
  font-family: var(--serif-vn); font-weight: 700;
  font-size: 18px; color: var(--tier-color, var(--crimson));
  margin-top: 12px;
  letter-spacing: 0.02em; position: relative; z-index: 2;
  text-shadow: 0 0 12px color-mix(in srgb, var(--tier-glow, transparent) 40%, transparent);
}
.popup-hero .amt {
  font-family: var(--mono); font-weight: 700; font-size: 32px;
  color: var(--text); margin-top: 14px; letter-spacing: -0.04em;
  position: relative; z-index: 2;
}
.popup-hero .amt .cu { font-size: 16px; color: var(--muted); }

/* Popup real-data block (lăng kính kế toán) */
.popup-realdata {
  margin-top: 12px; padding: 12px 14px;
  background: linear-gradient(180deg, var(--paper) 0%, var(--paper-2) 100%);
  border: 1px dashed var(--line-2); border-radius: 4px;
  text-align: left;
}
.popup-realdata .lab {
  font-family: var(--serif); font-style: italic; font-weight: 600;
  font-size: 9.5px; color: var(--muted);
  letter-spacing: 0.16em; text-transform: uppercase;
  margin-bottom: 6px;
}
.popup-realdata .rn {
  font-family: var(--mono); font-weight: 700; font-size: 11px;
  color: var(--text); letter-spacing: 0.01em;
  margin-bottom: 4px;
}
.popup-realdata .dn {
  font-family: var(--serif-vn); font-size: 11px;
  color: var(--text-2); line-height: 1.5;
  letter-spacing: 0.01em;
}

/* ─── EDIT POPUP · dual-input wrap ──────────────────────────────────── */
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
