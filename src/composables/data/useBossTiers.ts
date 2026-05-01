/**
 * useBossTiers — 9-tier boss classification dựa trên VND amount.
 * Port 1:1 từ debt-tracker-design/Pages/quest-bosses.jsx.
 *
 * Mỗi DebtItem.amount → 1 tier xác định: Tiểu Yêu (< 100K) → Hỗn Độn Tâm Ma
 * (100M+). Tier cung cấp full visual descriptor: color, glow, bg gradient, aura
 * pattern, danger level (1-9), realm, rank, classn, name pool. UI dùng tier để
 * paint tier-color/tier-glow CSS vars + chọn portrait + danger pips.
 */

import type { FunctionalComponent } from 'vue'
import type { IconProps } from '@/components/ui/quest-icons'
import { TIER_PORTRAITS, type TierKey } from '@/components/ui/quest-bosses'

/** 8 aura patterns map → CSS data-aura selector. */
export type AuraPattern =
  | 'none' | 'dots' | 'rune' | 'rune-violet'
  | 'flame' | 'chains' | 'crown' | 'starfield' | 'cosmos'

export interface BossTier {
  id: number
  key: TierKey
  threshold: number
  /** Đẳng cấp ma vật (Hán-Việt) — vd "Tiểu Yêu", "Tà Vương". */
  classn: string
  /** Phẩm cấp (vd "Sơ Phẩm", "Cửu Phẩm · Tối Thượng"). */
  rank: string
  /** Cấp độ nguy hiểm 1-9 — drives danger-pips count. */
  danger: number
  /** Stroke/text color (HEX). */
  color: string
  /** Glow color (HEX). */
  glow: string
  /** Background gradient (CSS). */
  bg: string
  /** Aura pattern key → data-aura attribute. */
  aura: AuraPattern
  /** Cảnh giới (Hán-Việt) — vd "Hậu Thiên", "Phi Thăng". */
  realm: string
  /** Mô tả ngắn cho popup-realm. */
  desc: string
}

export const BOSS_TIERS: ReadonlyArray<BossTier> = [
  {
    id: 0, key: 'tieuyeu', threshold: 0,
    classn: 'Tiểu Yêu', rank: 'Sơ Phẩm', danger: 1,
    color: '#7c8a72', glow: '#a8c090',
    bg: 'linear-gradient(135deg, #1a1f1a 0%, #232b22 100%)',
    aura: 'none', realm: 'Hậu Thiên',
    desc: 'Ma vật hạ đẳng, dễ trảm trừ',
  },
  {
    id: 1, key: 'sonyeu', threshold: 100_000,
    classn: 'Sơn Yêu', rank: 'Nhị Phẩm', danger: 2,
    color: '#8a9d6b', glow: '#b8d090',
    bg: 'linear-gradient(135deg, #1a2118 0%, #283220 100%)',
    aura: 'dots', realm: 'Luyện Khí Kỳ',
    desc: 'Yêu khí mỏng, có chút linh trí',
  },
  {
    id: 2, key: 'hacsat', threshold: 500_000,
    classn: 'Hắc Sát', rank: 'Tam Phẩm', danger: 3,
    color: '#c87575', glow: '#e89090',
    bg: 'linear-gradient(135deg, #2a1818 0%, #3a1f20 100%)',
    aura: 'rune', realm: 'Trúc Cơ Kỳ',
    desc: 'Sát khí ngưng tụ, đã có hình hài',
  },
  {
    id: 3, key: 'yeutuong', threshold: 2_000_000,
    classn: 'Yêu Tướng', rank: 'Tứ Phẩm', danger: 4,
    color: '#d96a4a', glow: '#ff8e60',
    bg: 'linear-gradient(135deg, #2e1a14 0%, #401d18 100%)',
    aura: 'flame', realm: 'Kim Đan Kỳ',
    desc: 'Thống lĩnh tiểu yêu, hung hãn',
  },
  {
    id: 4, key: 'maquan', threshold: 5_000_000,
    classn: 'Ma Quân', rank: 'Ngũ Phẩm', danger: 5,
    color: '#a878d0', glow: '#c898f0',
    bg: 'linear-gradient(135deg, #1f1530 0%, #2c1a40 100%)',
    aura: 'rune-violet', realm: 'Nguyên Anh Kỳ',
    desc: 'Yêu pháp tinh thâm, một phương ma đầu',
  },
  {
    id: 5, key: 'tavuong', threshold: 10_000_000,
    classn: 'Tà Vương', rank: 'Lục Phẩm', danger: 6,
    color: '#e74c5e', glow: '#ff6f7e',
    bg: 'linear-gradient(135deg, #2c0f12 0%, #441518 100%)',
    aura: 'chains', realm: 'Hóa Thần Kỳ',
    desc: 'Bá chủ một vùng, sát khí tràn ngợp',
  },
  {
    id: 6, key: 'yeude', threshold: 25_000_000,
    classn: 'Yêu Đế', rank: 'Thất Phẩm', danger: 7,
    color: '#d4a73a', glow: '#ffd060',
    bg: 'linear-gradient(135deg, #1a1408 0%, #2c2010 100%)',
    aura: 'crown', realm: 'Luyện Hư Kỳ',
    desc: 'Đế vương ma đạo, cai trị vạn yêu',
  },
  {
    id: 7, key: 'thienma', threshold: 50_000_000,
    classn: 'Thiên Ma', rank: 'Bát Phẩm', danger: 8,
    color: '#9b6cf0', glow: '#c098ff',
    bg: 'linear-gradient(135deg, #110820 0%, #1f1040 100%)',
    aura: 'starfield', realm: 'Đại Thừa Kỳ',
    desc: 'Bước qua Thiên Đạo, tâm tư khó dò',
  },
  {
    id: 8, key: 'hondon', threshold: 100_000_000,
    classn: 'Hỗn Độn Tâm Ma', rank: 'Cửu Phẩm · Tối Thượng', danger: 9,
    color: '#ff3a52', glow: '#ff80a0',
    bg: 'linear-gradient(135deg, #08000a 0%, #1a0010 50%, #2a0008 100%)',
    aura: 'cosmos', realm: 'Phi Thăng',
    desc: 'Hỗn độn sơ khai, bất khả chiến thắng',
  },
]

/** Tìm tier cao nhất mà `Math.abs(vnd) >= threshold`. */
export function tierForAmount(vnd: number): BossTier {
  let t = BOSS_TIERS[0]
  for (const tier of BOSS_TIERS) if (Math.abs(vnd) >= tier.threshold) t = tier
  return t
}

/** Force-pick một tier cụ thể (cho story boss). Fallback Tiểu Yêu nếu không tìm thấy. */
export function tierByKey(key: TierKey): BossTier {
  return BOSS_TIERS.find((t) => t.key === key) ?? BOSS_TIERS[0]
}

// ── NAME POOLS ────────────────────────────────────────────────────────────────
//  Tier thấp = nhiều tên (encounter thường)
//  Tier cao = ít tên (legendary singular entities)

const BOSS_NAMES: Record<TierKey, string[]> = {
  tieuyeu: [
    'Mộc Yêu Tử', 'Thảo Tinh Đồng', 'Khí Linh Vặt', 'Thí Thử Yêu',
    'Hồ Ly Sơ Tu', 'Lạc Diệp Quỷ', 'Vô Danh Tinh', 'Tiểu Sương Hồn',
    'Chuột Ma Chân', 'Đốm Lửa Đêm', 'Ám Vũ Tinh', 'Diệp Tâm Yêu',
    'Tiểu Câu Hồn', 'Sa Mạch Linh', 'Bụi Tro Quỷ',
  ],
  sonyeu: [
    'Hồ Ly Tam Vĩ', 'Sơn Quân Tiểu', 'Thanh Lang Yêu', 'Bạch Hổ Ấu Tử',
    'Mộc Trần Lão Quái', 'Thiết Bối Tinh', 'Đào Hoa Ma Nữ',
    'Trúc Lâm Ẩn Tinh', 'Khê Cốc Quỷ Vương', 'Dã Hồ Tướng',
    'Phong Tinh Tử', 'Vân Vụ Yêu',
  ],
  hacsat: [
    'Hắc Sát Tà Vương', 'Huyết Thiền Lão Quái', 'Tử Khí Kiếm Ma',
    'U Minh Tướng Quân', 'Xích Diệm Ma Tu', 'Liệt Phong Đao Quỷ',
    'Hắc Lân Yêu Tướng', 'Tửu Cuồng Ma Tu', 'Vong Hồn Đoạn Hồn',
    'Cự Xà Lão Tổ',
  ],
  yeutuong: [
    'Cửu Đầu Xà Tướng', 'Hoả Diệm Ma Vương', 'Băng Linh Sát Thần',
    'Tử Vong Kỵ Sĩ', 'Phá Thiên Cuồng Tướng', 'Hắc Vũ Đại Yêu',
    'Liệt Hỏa Phách Tướng', 'Vạn Cốt Ma Quân',
  ],
  maquan: [
    'Tử Linh Ma Quân', 'Thiên Sát Cô Tinh', 'Vạn Yêu Khôi Lỗi',
    'Huyết Hải Ma Tổ', 'Trầm Mặc Tà Quân', 'Cửu U Ma Chủ',
  ],
  tavuong: [
    'Phệ Hồn Tà Vương', 'Hắc Diện Ma Đế', 'Nghịch Thiên Cuồng Vương',
    'Thiên Ngoại Tà Tôn', 'Đại Hung Ma Tướng',
  ],
  yeude: [
    'Vạn Yêu Chi Đế', 'Hồng Hoang Ma Đế', 'Tử Vong Đế Quân',
    'Cửu U Yêu Đế',
  ],
  thienma: [
    'Vô Cực Thiên Ma', 'Phá Thiên Đại Ma', 'Hắc Đạo Thiên Tôn',
  ],
  hondon: [
    'Hỗn Độn Tâm Ma',
    'Vô Tự Đại Đạo Ma',
  ],
}

/** Hash deterministic — same seed → same name. */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Pick tên ma vật theo hash của seedKey (vd debt id). Fallback tier.classn. */
export function nameForBoss(tier: BossTier, seedKey: string): string {
  const pool = BOSS_NAMES[tier.key] ?? [tier.classn]
  return pool[hashStr(seedKey || tier.key) % pool.length]
}

/** Full descriptor cho 1 amount: tier + portrait + name + colors. */
export interface BossDescriptor {
  tier: BossTier
  portrait: FunctionalComponent<IconProps>
  /** Tên ma vật (deterministic theo seedKey). Optional override khi caller có tên riêng. */
  name: string
}

/**
 * Resolve full boss visual cho 1 amount + seed.
 * Dùng cho BossCard (final boss = totalDebt) và EnemyRow (per debt).
 */
export function bossForAmount(vnd: number, seedKey: string): BossDescriptor {
  const tier = tierForAmount(vnd)
  return {
    tier,
    portrait: TIER_PORTRAITS[tier.key],
    name: nameForBoss(tier, seedKey || String(vnd)),
  }
}
