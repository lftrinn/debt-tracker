/**
 * useTutienNames — lookup tables ánh xạ entity gốc của app sang
 * lớp "tu tiên" (display_name + sprite + cảnh giới).
 *
 * Phase 0 chỉ expose data + pure helpers; chưa kết nối UI.
 * Các phase sau sẽ inject vào component để hiển thị.
 *
 * Tham chiếu thiết kế:
 *   /home/trin/Personal/debt-tracker-design/Pages/quest-data.jsx
 *   /home/trin/Personal/debt-tracker-design/Pages/ds-content.jsx
 */

import type { CreditCard, SmallLoan } from '@/types/data'
import type { FunctionalComponent } from 'vue'
import { SPRITE, type IconProps } from '@/components/ui/quest-icons'

// ═══ CẢNH GIỚI · player level → realm ═════════════════════════════════════

export const REALMS = [
  'Luyện Khí Kỳ', // Lv 1-3
  'Trúc Cơ Kỳ', // Lv 4-6
  'Kim Đan Kỳ', // Lv 7-9
  'Nguyên Anh Kỳ', // Lv 10-12
  'Hóa Thần Kỳ', // Lv 13-15
  'Luyện Hư Kỳ', // Lv 16+
] as const

export type Realm = (typeof REALMS)[number]

/** Lv → cảnh giới · 3 cấp/realm. */
export function realmOf(lvl: number): Realm {
  const idx = Math.max(0, Math.min(REALMS.length - 1, Math.floor((lvl - 1) / 3)))
  return REALMS[idx]
}

/** Số dư nợ → cảnh giới · dùng cho boss / enemy mini-card. */
export function realmForDebt(balance: number): Realm {
  if (balance >= 50_000_000) return REALMS[5]
  if (balance >= 30_000_000) return REALMS[4]
  if (balance >= 15_000_000) return REALMS[3]
  if (balance >= 7_000_000) return REALMS[2]
  if (balance >= 3_000_000) return REALMS[1]
  return REALMS[0]
}

// ═══ CATEGORIES · phân loại chi tiêu / thu nhập ═══════════════════════════

/** ID category mới (dùng cho sprite + display) — phù hợp với SPRITE map. */
export type CategoryId = 'food' | 'shop' | 'fuel' | 'bill' | 'ent' | 'med' | 'pay' | 'cash'

export interface CategoryEntry {
  id: CategoryId
  sp: CategoryId
  /** Tên đạo hiệu (Hán-Việt thi vị) */
  display: string
  /** Tên gốc (Vietnamese plain) — fallback i18n nếu thiếu */
  real: string
}

/** Danh sách 8 category gốc của design — dùng trong grid Add screen. */
export const CATEGORIES_TUTIEN: ReadonlyArray<CategoryEntry> = [
  { id: 'food', sp: 'food', display: 'Tịch Cốc', real: 'Ăn uống' },
  { id: 'shop', sp: 'shop', display: 'Tích Bảo', real: 'Mua sắm' },
  { id: 'fuel', sp: 'fuel', display: 'Phi Vân', real: 'Di chuyển' },
  { id: 'bill', sp: 'bill', display: 'Hộ Phù', real: 'Hoá đơn' },
  { id: 'ent', sp: 'ent', display: 'Quan Ảnh', real: 'Giải trí' },
  { id: 'med', sp: 'med', display: 'Đan Dược', real: 'Sức khoẻ' },
  { id: 'pay', sp: 'pay', display: 'Trảm Ma', real: 'Trả nợ' },
  { id: 'cash', sp: 'cash', display: 'Linh Khí', real: 'Khác' },
]

/**
 * Map category-key cũ (hiện đang lưu trong dữ liệu JSON) sang id mới.
 * Phase 1+ sẽ dùng map này khi render expense/income trong UI tutien.
 */
export const LEGACY_CAT_MAP: Readonly<Record<string, CategoryId>> = {
  // expense
  an: 'food',
  cafe: 'food',
  mua: 'shop',
  dilai: 'fuel',
  yte: 'med',
  giaitri: 'ent',
  hd: 'bill',
  khac: 'cash',
  thanhToan: 'pay',
  // income
  luong: 'pay',
  freelance: 'pay',
  thuong: 'pay',
  hoantien: 'cash',
  dautu: 'pay',
  khac_thu: 'cash',
}

/** Resolve legacy key → CategoryEntry (an → food). */
export function categoryFor(cat: string | null | undefined): CategoryEntry {
  if (!cat) return CATEGORIES_TUTIEN[7] // cash · Linh Khí
  const newId = LEGACY_CAT_MAP[cat] ?? (cat as CategoryId)
  const found = CATEGORIES_TUTIEN.find((c) => c.id === newId)
  return found ?? CATEGORIES_TUTIEN[7]
}

/** Resolve sprite component cho 1 category key — tiện cho dynamic <component>. */
export function spriteFor(cat: string | null | undefined): FunctionalComponent<IconProps> {
  return SPRITE[categoryFor(cat).sp]
}

// ═══ BOSS · credit cards & loans → tâm ma ════════════════════════════════

export type BossSprite = 'hac' | 'huyet' | 'tumau' | 'tamma'

export interface BossInfo {
  display: string
  sp: BossSprite
  realm: Realm
}

/** Hardcoded mapping cho card đã biết · ưu tiên trên heuristic. */
const BOSS_BY_ID: Readonly<Record<string, { display: string; sp: BossSprite }>> = {
  visa1: { display: 'Hắc Sát Tà Vương', sp: 'hac' },
  visa2: { display: 'Huyết Thiền Lão Quái', sp: 'huyet' },
  mc: { display: 'Huyết Thiền Lão Quái', sp: 'huyet' },
  visa: { display: 'Hắc Sát Tà Vương', sp: 'hac' },
}

/** Pool fallback khi không match · luân phiên theo index. */
const BOSS_FALLBACK_POOL: ReadonlyArray<{ display: string; sp: BossSprite }> = [
  { display: 'Hắc Sát Tà Vương', sp: 'hac' },
  { display: 'Huyết Thiền Lão Quái', sp: 'huyet' },
  { display: 'Bạch Cốt Sát Tinh', sp: 'hac' },
  { display: 'Tử Mệnh Quỷ Vương', sp: 'huyet' },
]

/**
 * Resolve boss info cho 1 credit card.
 * - Lookup theo id trước
 * - Heuristic theo name (visa/master/mc)
 * - Fallback theo index
 */
export function bossFor(card: CreditCard, index = 0): BossInfo {
  const byId = BOSS_BY_ID[card.id.toLowerCase()]
  if (byId) {
    return { ...byId, realm: realmForDebt(card.balance) }
  }

  const n = card.name.toLowerCase()
  if (/master|\bmc\b/.test(n)) {
    return { display: 'Huyết Thiền Lão Quái', sp: 'huyet', realm: realmForDebt(card.balance) }
  }
  if (/visa/.test(n)) {
    const pick = BOSS_FALLBACK_POOL[index % BOSS_FALLBACK_POOL.length]
    return { ...pick, realm: realmForDebt(card.balance) }
  }
  const pick = BOSS_FALLBACK_POOL[index % BOSS_FALLBACK_POOL.length]
  return { ...pick, realm: realmForDebt(card.balance) }
}

/** Boss info cho khoản vay nhỏ · luôn là Từ Mẫu Khế Ước (khế ước tâm linh). */
export function loanBossFor(loan: SmallLoan): BossInfo {
  return {
    display: 'Từ Mẫu Khế Ước',
    sp: 'tumau',
    realm: realmForDebt(loan.remaining_balance),
  }
}

/** Boss tổng (final boss) = tổng nợ · luôn là Tâm Ma Tổng. */
export function finalBossFor(totalDebt: number): BossInfo {
  return {
    display: 'Tâm Ma Tổng',
    sp: 'tamma',
    realm: realmForDebt(totalDebt),
  }
}
