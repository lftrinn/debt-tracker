/**
 * useSwordHeal — 9-tier kiếm chiêu (sword) + hồi phục (heal) systems.
 * Port 1:1 từ debt-tracker-design/Pages/quest-sword-heal.jsx.
 *
 * Mirror BOSS_TIERS 9 thresholds (0 / 100K / 500K / 2M / 5M / 10M / 25M / 50M
 * / 100M). Tier 5 sword = "Phi Thiên Nhận" có thể trảm Tier 5 boss = Tà Vương.
 *
 * Dùng:
 *   const sword = swordTierForAmount(2_500_000)
 *   // → { name: 'Nguy Kiếm', rank: 'Tứ Phẩm', danger: 4, ... }
 *   const heal = healTierForAmount(15_000_000)
 *   // → { name: 'Cửu Chuyển Hoàn Hồn', rank: 'Lục Phẩm', ... }
 */

import type { FunctionalComponent } from 'vue'
import { SWORD_ILLOS, HEAL_ILLOS, type StrikeIlloProps } from '@/components/ui/quest-sword-heal'

export type SwordKey =
  | 'phacphong' | 'thanhphong' | 'phitinh' | 'nguykiem'
  | 'cuulonghi' | 'phithiennhan' | 'thaiamtruong'
  | 'thienkienquyet' | 'hondontrucvanphap'

export type HealKey =
  | 'tieuthanphu' | 'thaomocchi' | 'thanhtuyenkhi' | 'longhuyetdan'
  | 'phongchudem' | 'cuuchuyenhoanhondan' | 'thienquanglienhoa'
  | 'thienthatchinhan' | 'hondonsinhmenh'

interface TierBase {
  id: number
  threshold: number
  /** Tên Hán-Việt thi vị. */
  name: string
  /** English short. */
  en: string
  /** Phẩm cấp (Sơ Phẩm → Cửu Phẩm · Vô Thượng). */
  rank: string
  /** Stroke/text color (HEX). */
  color: string
  /** Glow color (HEX). */
  glow: string
  /** Cấp độ 1-9, mirrors BOSS_TIERS.danger. */
  danger: number
  /** Tên môn phái (school of techniques). */
  school: string
  /** Mô tả ngắn. */
  desc: string
  /** Mô tả hiệu ứng visual. */
  fx: string
  /** 4 sample chiêu thức để random pick. */
  samples: ReadonlyArray<string>
}

export interface SwordTier extends TierBase {
  key: SwordKey
}

export interface HealTier extends TierBase {
  key: HealKey
}

// ─── SWORD TIERS · 9 escalating sword techniques ─────────────────────────────

export const SWORD_TIERS: ReadonlyArray<SwordTier> = [
  {
    id: 0, key: 'phacphong', threshold: 0,
    name: 'Phác Phong', en: 'Rough Strike', rank: 'Sơ Phẩm',
    color: '#9aa68c', glow: '#c8d0b8',
    danger: 1, school: 'Khởi Thức',
    desc: 'Một chiêu thô sơ, đủ chém tiểu yêu',
    fx: 'một vệt kiếm thẳng mảnh',
    samples: ['Nhập Môn Trảm', 'Sơ Học Phong', 'Khai Phách', 'Phá Khí Đệ Nhất Thức'],
  },
  {
    id: 1, key: 'thanhphong', threshold: 100_000,
    name: 'Thanh Phong', en: 'Clear Wind', rank: 'Nhị Phẩm',
    color: '#7ec0a4', glow: '#a8e0c4',
    danger: 2, school: 'Khinh Vân Kiếm',
    desc: 'Kiếm khí nhẹ như gió, lướt qua núi rừng',
    fx: 'kiếm khí cuốn thành dải gió',
    samples: ['Thanh Phong Trảm', 'Lưu Vân Tịch', 'Khinh Vũ Phá', 'Sơn Hà Trảm'],
  },
  {
    id: 2, key: 'phitinh', threshold: 500_000,
    name: 'Phi Tinh', en: 'Flying Star', rank: 'Tam Phẩm',
    color: '#5fb3d4', glow: '#90d8f0',
    danger: 3, school: 'Tinh Vận Kiếm',
    desc: 'Kiếm quang xé trời, sao băng quét qua',
    fx: 'tia kiếm như sao băng cong',
    samples: ['Phi Tinh Lạc Vũ', 'Trục Nguyệt Trảm', 'Vẫn Tinh Phong', 'Thiên Lưu Quyết'],
  },
  {
    id: 3, key: 'nguykiem', threshold: 2_000_000,
    name: 'Nguy Kiếm', en: 'Perilous Edge', rank: 'Tứ Phẩm',
    color: '#d4a854', glow: '#f4d488',
    danger: 4, school: 'Bá Đạo Kiếm',
    desc: 'Một kiếm chém ra, sơn hà chấn động',
    fx: 'kiếm khí tỏa hình bán nguyệt',
    samples: ['Nguy Sơn Trảm', 'Bá Đao Phong', 'Phá Sơn Quyết', 'Hồng Hoang Đệ Tứ Thức'],
  },
  {
    id: 4, key: 'cuulonghi', threshold: 5_000_000,
    name: 'Cửu Long Hí', en: 'Nine Dragons', rank: 'Ngũ Phẩm',
    color: '#c878e8', glow: '#e0a0ff',
    danger: 5, school: 'Long Tộc Kiếm',
    desc: 'Chín đạo kiếm khí hóa long, vây bọc địch nhân',
    fx: '9 vệt long ảnh xoắn',
    samples: ['Cửu Long Náo Hải', 'Long Đằng Trảm', 'Thiên Long Bát Bộ', 'Long Hí Châu Quyết'],
  },
  {
    id: 5, key: 'phithiennhan', threshold: 10_000_000,
    name: 'Phi Thiên Nhận', en: 'Heaven-Piercing', rank: 'Lục Phẩm',
    color: '#ff5478', glow: '#ff8aa0',
    danger: 6, school: 'Thiên Cơ Kiếm',
    desc: 'Kiếm xuyên trời, một chiêu phá vạn pháp',
    fx: 'một cột kiếm khí dọc',
    samples: ['Phi Thiên Phá Thiên', 'Xuyên Vân Trảm', 'Lăng Tiêu Quyết', 'Vạn Pháp Quy Tông'],
  },
  {
    id: 6, key: 'thaiamtruong', threshold: 25_000_000,
    name: 'Thái Âm Trượng', en: 'Great Yin', rank: 'Thất Phẩm',
    color: '#e8c84a', glow: '#ffe080',
    danger: 7, school: 'Hoàng Đạo Kiếm',
    desc: 'Vương giả kiếm pháp, ánh kim quang dịu mà chí mệnh',
    fx: 'kiếm vàng chiếu rọi mạn ngân',
    samples: ['Thái Âm Phá Tà', 'Hoàng Cực Trảm', 'Đại Đạo Quyết', 'Vạn Tượng Triều Cương'],
  },
  {
    id: 7, key: 'thienkienquyet', threshold: 50_000_000,
    name: 'Thiên Kiếm Quyết', en: 'Heaven Sword', rank: 'Bát Phẩm',
    color: '#9b6cf0', glow: '#c098ff',
    danger: 8, school: 'Đại Thừa Kiếm Tông',
    desc: 'Tâm kiếm hợp nhất, một niệm vạn kiếm rơi',
    fx: 'mưa kiếm quang khắp thiên không',
    samples: ['Thiên Kiếm Hoán Chân', 'Vạn Kiếm Quy Tông', 'Tâm Kiếm Phong', 'Đạo Tâm Trảm'],
  },
  {
    id: 8, key: 'hondontrucvanphap', threshold: 100_000_000,
    name: 'Hỗn Độn Trảm Vạn Pháp', en: 'Chaos Annihilation', rank: 'Cửu Phẩm · Vô Thượng',
    color: '#ff3a52', glow: '#ff80a0',
    danger: 9, school: 'Phi Thăng Kiếm',
    desc: 'Một kiếm trảm Hỗn Độn, vạn pháp đều quy không',
    fx: 'không gian nứt vỡ thành hư vô',
    samples: ['Trảm Hỗn Độn', 'Vạn Pháp Hủy Diệt', 'Phi Thăng Đệ Nhất Kiếm', 'Hư Vô Quy Nhất'],
  },
]

// ─── HEAL TIERS · 9 escalating restoration arts ──────────────────────────────

export const HEAL_TIERS: ReadonlyArray<HealTier> = [
  {
    id: 0, key: 'tieuthanphu', threshold: 0,
    name: 'Tiểu Thần Phù', en: 'Minor Charm', rank: 'Sơ Phẩm',
    color: '#9ec99b', glow: '#b8e0b4',
    danger: 1, school: 'Sơ Cấp Y Đạo',
    desc: 'Một đạo bùa nhỏ, hồi chút linh khí',
    fx: 'một đốm xanh nhỏ tỏa lên',
    samples: ['Tiểu Bùa Hộ Mệnh', 'Sơ Cấp Trị Liệu', 'Khai Quang Phù', 'Bình An Thư'],
  },
  {
    id: 1, key: 'thaomocchi', threshold: 100_000,
    name: 'Thảo Mộc Chỉ', en: 'Herbal Touch', rank: 'Nhị Phẩm',
    color: '#7ec488', glow: '#a4dfa8',
    danger: 2, school: 'Linh Thảo Đạo',
    desc: 'Thảo dược rừng linh, vết thương tự khép',
    fx: 'lá xanh xoay tròn quanh thân',
    samples: ['Linh Thảo Hồi Khí', 'Lục Diệp Trợ Tâm', 'Bách Thảo Nguyên Tinh', 'Phục Hồi Khí Tán'],
  },
  {
    id: 2, key: 'thanhtuyenkhi', threshold: 500_000,
    name: 'Thanh Tuyền Khí', en: 'Pure Spring', rank: 'Tam Phẩm',
    color: '#5fc4d4', glow: '#88e0ec',
    danger: 3, school: 'Thủy Tuyền Đạo',
    desc: 'Suối linh tẩy uế, nguyên khí tăng tiến',
    fx: 'dòng nước xanh xoáy quanh',
    samples: ['Thanh Tuyền Hồi Nguyên', 'Bích Thủy Tịnh Tâm', 'Linh Tuyền Phục Mệnh', 'Tẩy Tủy Đan'],
  },
  {
    id: 3, key: 'longhuyetdan', threshold: 2_000_000,
    name: 'Long Huyết Đan', en: 'Dragon Pill', rank: 'Tứ Phẩm',
    color: '#e89870', glow: '#ffb898',
    danger: 4, school: 'Đan Dược Đạo',
    desc: 'Một viên đan dược, kéo người về từ cõi chết',
    fx: 'viên đan đỏ tỏa hào quang',
    samples: ['Long Huyết Hồi Thiên Đan', 'Cửu Chuyển Hoàn Hồn Đan', 'Đại Bổ Nguyên Đan', 'Phượng Huyết Đan'],
  },
  {
    id: 4, key: 'phongchudem', threshold: 5_000_000,
    name: 'Phượng Châu Diễm', en: 'Phoenix Pearl', rank: 'Ngũ Phẩm',
    color: '#d878c8', glow: '#f0a0e0',
    danger: 5, school: 'Phượng Hỏa Đạo',
    desc: 'Lửa Phượng Hoàng tái sinh, một thân không hai',
    fx: '9 vòng lửa phượng tỏa rộng',
    samples: ['Phượng Hoàng Niết Bàn', 'Châu Diễm Phục Sinh', 'Hỏa Tinh Hồi Nguyên', 'Thần Phượng Trụ Mệnh'],
  },
  {
    id: 5, key: 'cuuchuyenhoanhondan', threshold: 10_000_000,
    name: 'Cửu Chuyển Hoàn Hồn', en: 'Soul Return', rank: 'Lục Phẩm',
    color: '#74e0ff', glow: '#a8eaff',
    danger: 6, school: 'Hồn Đạo',
    desc: 'Linh hồn tản mác, chín lần luân chuyển hồi quy',
    fx: '9 hào quang xoắn vào ngực',
    samples: ['Cửu Chuyển Phục Hồn', 'Hồi Hồn Đại Pháp', 'Tử Phục Sinh Quyết', 'Ly Hồn Quy Khiếu'],
  },
  {
    id: 6, key: 'thienquanglienhoa', threshold: 25_000_000,
    name: 'Thiên Quang Liên Hoa', en: 'Heavenly Lotus', rank: 'Thất Phẩm',
    color: '#f0d850', glow: '#fff088',
    danger: 7, school: 'Phật Môn',
    desc: 'Liên hoa kim quang, đại đạo hồi tâm',
    fx: 'sen vàng nở dưới chân',
    samples: ['Kim Liên Trụ Mệnh', 'Vạn Phật Thâu Thân', 'Liên Hoa Tâm Pháp', 'Phật Quang Phổ Chiếu'],
  },
  {
    id: 7, key: 'thienthatchinhan', threshold: 50_000_000,
    name: 'Thiên Thất Chi Ấn', en: 'Seventh Heaven', rank: 'Bát Phẩm',
    color: '#a890ff', glow: '#c8b8ff',
    danger: 8, school: 'Thiên Đạo',
    desc: 'Ấn Thiên Đạo, một niệm tẩy tủy đoạt hồn',
    fx: 'sigil 7 cánh xoay trên đầu',
    samples: ['Thiên Đạo Tẩy Tủy', 'Cửu Tiêu Hoàn Mệnh', 'Bát Quái Hộ Tâm', 'Thái Cực Phục Nguyên'],
  },
  {
    id: 8, key: 'hondonsinhmenh', threshold: 100_000_000,
    name: 'Hỗn Độn Sinh Mệnh', en: 'Chaos Genesis', rank: 'Cửu Phẩm · Vô Thượng',
    color: '#ff6acc', glow: '#ffaadc',
    danger: 9, school: 'Sáng Thế Đạo',
    desc: 'Hỗn Độn sơ khai sinh thân, tử cũng có thể tái thiên',
    fx: 'vũ trụ xoáy ngược quanh thân',
    samples: ['Hỗn Độn Khai Thiên', 'Sinh Mệnh Vô Cực', 'Vô Thượng Hồi Nguyên', 'Vạn Vật Phục Sinh'],
  },
]

/** Tìm tier cao nhất mà `Math.abs(vnd) >= threshold`. */
export function swordTierForAmount(vnd: number): SwordTier {
  let t = SWORD_TIERS[0]
  for (const tier of SWORD_TIERS) if (Math.abs(vnd) >= tier.threshold) t = tier
  return t
}

export function healTierForAmount(vnd: number): HealTier {
  let t = HEAL_TIERS[0]
  for (const tier of HEAL_TIERS) if (Math.abs(vnd) >= tier.threshold) t = tier
  return t
}

/** Pick deterministic 1 sample chiêu thức từ pool. */
function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0
  return Math.abs(h)
}

/** Lấy sample chiêu thức (vd "Phi Tinh Lạc Vũ") deterministic từ seed. */
export function pickSample(samples: ReadonlyArray<string>, seed: string): string {
  return samples[hashStr(seed) % samples.length] ?? samples[0]
}

/** Lookup illustration component cho 1 sword/heal tier. */
export interface StrikeDescriptor {
  kind: 'sword' | 'heal'
  tier: SwordTier | HealTier
  illo: FunctionalComponent<StrikeIlloProps>
  /** Tên chiêu thức cụ thể (sample picked deterministic). */
  chieu: string
}

export function descriptorForExpense(amount: number, seed: string): StrikeDescriptor {
  const tier = swordTierForAmount(amount)
  return {
    kind: 'sword',
    tier,
    illo: SWORD_ILLOS[tier.key],
    chieu: pickSample(tier.samples, seed),
  }
}

export function descriptorForIncome(amount: number, seed: string): StrikeDescriptor {
  const tier = healTierForAmount(amount)
  return {
    kind: 'heal',
    tier,
    illo: HEAL_ILLOS[tier.key],
    chieu: pickSample(tier.samples, seed),
  }
}
