# Debt Tracker · UI Screens Reference

Tài liệu mô tả chi tiết toàn bộ giao diện hiện tại của app — phục vụ Claude design / redesign / port sang framework khác. Mỗi screen liệt kê: **mục đích**, **layout** (top → bottom), **components**, **interactions**, **data shape**, **states/empty/error**, **lăng kính tu-tiên** (display vocabulary).

Stack: Vue 3 · TypeScript · mobile-first · 5 bottom tabs + 1 hidden settings tab. Theme dark fantasy (kiếm hiệp / tu tiên).

---

## 0. Design language

### Lăng kính tu-tiên (dual layer)

Mỗi entity có 2 lớp tên:

| Lớp | Mục đích | Ví dụ |
|---|---|---|
| `display_name` (tutien) | Thi vị hoá, dark fantasy | "Hắc Sát Tà Vương", "Tâm Ma", "Linh Khí Ngày" |
| `real_name` (real) | Kế toán chính xác | "VISA·1882", "Tổng nợ tín dụng", "Hạn mức ngày" |

Toggle qua singleton `useDisplayMode` (persist localStorage `dt_display_mode`). Khi `mode === 'tutien'` → hiển thị `display_name`, dòng dưới nhỏ in mono là `real_name` để đối chiếu kế toán. Khi `mode === 'real'` → ẩn lớp tutien.

### Color tokens (CSS vars)

| Token | Vai trò | Hex/intent |
|---|---|---|
| `--ink`, `--paper`, `--paper-2`, `--paper-3` | Nền tối, 6 bậc | Đen sâu → xám tro |
| `--gold`, `--gold-2`, `--gold-3` | Brand · linh kim | Vàng đồng |
| `--crimson`, `--crimson-deep` | Nợ / huyết sa / danger | Đỏ máu |
| `--jade` | Positive / hồi tu vi / income | Lục bích |
| `--violet` | Realm / next-tier | Tím tử vân |
| `--azure` | Mana / linh lam | Lam ngọc |
| `--vermillion` | Crit / soon | Cam son |
| `--text`, `--text-2`, `--muted` | Text 3 bậc | Trắng → xám |
| `--line`, `--line-2` | Border 2 bậc | Xám đậm |

### Type families

- `--serif` Cormorant Garamond italic — đạo hiệu, section titles
- `--serif-vn` Be Vietnam Pro — body Việt
- `--mono` JetBrains Mono — số liệu, real_name, tags

### Privacy mode

Toàn cục `hideAmounts` (eye-btn ở header) + per-zone `hideZones` (Đạo Tâm > Hide zones treeview). Khi ẩn, số bị thay bằng `●●●` hoặc bullets, % vẫn hiện.

### Animations

- `num-flash` re-mount khi giá trị đổi (BossCard HP, ManaCards mana/gold)
- `boss-shake` 600ms khi HP giảm (player vừa trả nợ)
- `pulse-boss` 2.5s pulse halo cho portrait Tâm Ma
- `spin` 18s/30s rotate cho aura ring + dashed corner
- `pulse-crit` 1.5s scale cho crit tag (≥ 500K VND)
- `shimmer-btn` 3s gradient sweep cho Attack button
- `popup` slide-up + dismiss qua drag down 80px hoặc flick 0.15
- All motion respect `prefers-reduced-motion`

### Common popup

- Slide từ bottom, có drag handle bar 36×4 px
- Body lock scroll khi mở
- Header: title (left, serif italic) + X close (right)
- Body: `.popup-body` (padding) hoặc `.popup-body settings__scrollbody` (max-height calc 85vh - 160px)
- Actions: `.popup-actions` row, primary button gold gradient
- 3-state buttons: `attack` (gold gradient, primary) / `heal` (jade) / `flee` (crimson border, danger)

---

## 1. App shell

```
┌─────────────────────────────────────┐
│ TutienHeader (sticky top, 50)       │  avatar · name+realm·LV · coins · eye
├─────────────────────────────────────┤
│ SyncBar (sticky)                    │  status dot · message · time · today
│                                     │
│ ┌─ Tab content (xp-bar + alert + …) │
│ │                                   │
│ │  Home / Inv / Add / Cht / Map / Cfg
│ │                                   │
│ └───────────────────────────────────┘
├─────────────────────────────────────┤
│ BottomTabBar (fixed bottom, 50)     │  home · inv · [+FAB] · cht · map
└─────────────────────────────────────┘
```

### TutienHeader (`layout/TutienHeader.vue`)

Sticky top. Gold accent line ở dưới (gradient transparent → gold → transparent, width 80px).

| Element | Mô tả |
|---|---|
| Avatar (46×46) | Radial gold gradient + dashed ring xoay 30s + 1 chữ initial của playerName | Tap → mở Đạo Tâm (tab `cfg`) |
| Tên + cảnh giới | `who-name` (12px serif italic) · `who-class` "Kim Đan Kỳ · LV 5" |
| Coins pill | IconCoins + số gọn (1.2M / 500K) — VND availCash. Khi `hide` → `●●●` |
| Eye btn | IconEye/EyeOff toggle — global hideAmounts |

### BottomTabBar (`layout/BottomTabBar.vue`)

Fixed bottom, blur backdrop. 5 tabs cố định:

| ID | Icon | Tu-tiên | Real |
|---|---|---|---|
| `home` | IconSword | Đại Trận | Home |
| `inv` | IconScroll | Chiến Ký | Lịch sử |
| `add` | IconPlus | Xuất Kiếm | Add (FAB — 26px, gold tròn lift -22px) |
| `cht` | IconChart | Tu Vi Ký | Charts |
| `map` | IconMap | Lộ Đồ | Roadmap |

`cfg` (Đạo Tâm / Settings) không có tab button — vào qua tap avatar header.

### SyncBar (`layout/SyncBar.vue`)

Hiển thị status đồng bộ JSONBin: dot màu (synced=jade / syncing=gold pulse / error=crimson) + msg + last sync time + today date.

### LoadingScreen / ErrorPopup / SetupScreen / ToastMessage / LevelUpToast

| Screen | Vai trò | Trigger |
|---|---|---|
| LoadingScreen | Spinner full-screen lúc pull data | `appState === 'loading'` |
| ErrorPopup | JSONBin fail. Nút reconnect + dismiss | `appState === 'error'` |
| SetupScreen | Wizard 3 mode: import JSON / kết nối bin có sẵn / tạo mới | `appState === 'setup'` (chưa có credentials) |
| ToastMessage | Bottom toast (ok=jade / err=crimson) auto-dismiss 2s | Mọi mutation thành công/thất bại |
| LevelUpToast | Pill gold center khi `playerLvl` tăng | Watch playerLvl |

---

## 2. HOME · Đại Trận

**Mục đích**: dashboard chính — boss tổng nợ, linh khí ngày, kim nguyên bảo, kiếp số sắp tới, ma chướng (debts), tâm pháp.

```
┌─────────────────────────────────────┐
│ XP bar — "Tu vi" · playerXp/playerXpMax │
├─────────────────────────────────────┤
│ Alert (over · ok) — daily limit status │
├─────────────────────────────────────┤
│ BossCard · Tâm Ma final boss        │
│   portrait + name + realm + HP bar  │
├─────────────────────────────────────┤
│ ManaCards · Linh Khí + Kim N.Bảo   │
│   2-col grid                        │
├─────────────────────────────────────┤
│ SectionHeader Kiếp Số · quests · Tất cả → │
│ QuestList (max 4)                   │
├─────────────────────────────────────┤
│ SectionHeader Ma Chướng · N         │
│ EnemyRow grid (max 3 cols)          │
├─────────────────────────────────────┤
│ SectionHeader Tâm Pháp · achievement │
│ AchievementList (max 3 unlocked)   │
└─────────────────────────────────────┘
```

### XP bar (inline trong App.vue)

Sticky-feel bar với `.lab` "Tu vi" + `.track` (height 5px) + `.fill` gold gradient + `.next` "playerXp/500".

### Alert banner

```
.alert.over    crimson bg     ⚠ vượt giới · −X đ
.alert.ok      gold/jade bg   ✓ còn Yđ · còn N ngày tới Z
```

`isOver` = todaySpent > dayLimit.

### BossCard (`cards/BossCard.vue`)

Kích thước lớn, 4 corner brackets (border crimson), aura radial ở giữa, tag `❂ TÂM MA · FINAL BOSS` góc phải.

| Prop | Type | Mô tả |
|---|---|---|
| `display` | string | Đạo hiệu (vd. "Tâm Ma Tổng") |
| `real` | string | Tên gốc (vd. "Tổng nợ tín dụng") |
| `realm` | string | Cảnh giới động theo HP (`finalBossFor(totalDebt)`) |
| `hp` | number | totalDebt VND |
| `hpMax` | number | origDebt VND |
| `nextDate` | string | "DD.MM" của upcoming[0] |
| `nextAmt` | number | upcoming[0].amt |
| `hide` | bool | privacy |
| `useDisplay` | bool | toggle hiển thị real_name |

**HP bar**: 12px tall, gradient crimson `#d96a7a → crimson → crimson-deep`, glow shadow, animation `hpload` 1100ms slide khi mount.

**HP meta** (2 cột nhỏ dưới bar): "Kiếp tới · 15.04" (gold) · "Số tiền · 2.5M" (crimson italic).

**Damage shake**: khi `hp` giảm (player trả nợ) → toàn card shake 600ms (translateX ±3px keyframes).

### ManaCards (`cards/ManaCards.vue`)

Grid 2 col, gap 8px.

**Card 1 · Linh Khí Ngày (mp)**: border azure 35%
- Tag: 🔥 IconFlame "Linh khí ngày"
- Số lớn: `đ` + manaLeft (azure, 19px mono)
- Mini bar 5px: gradient azure → light azure
- Sub: "đã dùng X% · giới hạn 70Kđ"
- Khi `manaOver` → border + tag + số + bar đổi crimson; sub đổi "PHÁ GIỚI · giới hạn …"

**Card 2 · Kim Nguyên Bảo (gold-card)**: border gold 35%
- Tag: 🪙 IconCoins "Kim nguyên bảo"
- Số lớn: `đ` + gold (gold-2)
- Mini bar: gradient gold-3 → gold (% = goldDays/30 cap 100)
- Sub: "Còn N ngày" hoặc "—" khi null

### QuestList (`payments/QuestList.vue`)

`kiep-card` per item — flex row 3 columns (icon + body + reward).

| Element | Mô tả |
|---|---|
| `.kiep-icon` | sprite per category (debt_minimum=Ingot · one_time=Bill · default=Lotus) hoặc IconCheck khi paid |
| `.kiep-body` | name (display) + meta (pill: done / urg "X ngày trễ" / due "còn X ngày" + dot dueShort) |
| `.kiep-reward` | amount (right) + xp "+N tu vi" (gold mono small) |

State variants:
- `.urgent` → border crimson + tag urg crimson
- `.done` → grey out + IconCheck

Tap kiep-card (when not paid) → emit `open-detail` → mở DetailPopup variant `upcoming`.

Empty state: IconLotus + "Tâm trí thanh tịnh, chưa kiếp nào".

### EnemyRow (`cards/EnemyRow.vue`)

Grid columns auto theo số enemy (max 3 cols). Per-card height ~145px, padding 12/8.

Mỗi enemy:
- Top accent line 2px (gold/crimson/violet theo `_color`)
- `enemy-portrait` 42×42 round + dashed ring xoay 16s + sprite từ `bossFor(card)`
- `enemy-name` (serif italic 11px clamp 2 lines)
- `enemy-real` (mono 8.5px, ellipsis, only when `useDisplay`)
- `enemy-hp` (mono bold 12px) — short format `1.2M`
- `enemy-bar` 4px progress (= utilizationPct = balance/credit_limit)
- `enemy-foot`: "X% HP" left + dueShort right (gold, urg → crimson)

Tap → mở **Hồ sơ ma chướng** popup edit (sheet style):

```
[draghandle]
🜲 Hồ sơ ma chướng           ✕
─────────────────────────────
[hero portrait · big · name · real]
[amt big mono]
[4-stat grid: HP max / Due / %HP / Đã hạ]
─────────────────────────────
Số dư hiện tại        [input · VND] [≈] [input · USD]
Tối thiểu             [input · VND] [≈] [input · USD]
Ngày đến hạn          [date input]
─────────────────────────────
        [Xuất kiếm chỉnh]
```

Edit fields support dual-currency (VND base + display currency tương đương) — auto convert qua `useCurrency.toVnd()`.

### AchievementList (`cards/AchievementList.vue`)

Per row: medal (gold radial 36×36 + IconTrophy) + body (name serif gold + desc Việt 10.5px).

3 derived achievements (Phase 2):
1. `firstStrike` — paidCount > 0
2. `beQuan` (no overspend today) — !isOver
3. `quarterPaid` — repayPct ≥ 25

Locked state: `.tampahp--locked` opacity 0.55, medal grey, hiện "Chưa khai mở · Hoàn thành kiếp số đầu tiên" khi 0 unlocked.

Default `max=2` ở Home, `max=3` ở Map.

---

## 3. INV · Chiến Ký (Transaction List)

**Mục đích**: lịch sử giao dịch đã thực hiện, group by ngày, filter + search.

```
┌─────────────────────────────────────┐
│ SectionHeader Chiến Ký · N ngày     │
├─────────────────────────────────────┤
│ inv-stats 3-col                     │
│   Tổn (exp) · Hồi (inc) · Cân bằng  │
├─────────────────────────────────────┤
│ search box 🔍                        │
├─────────────────────────────────────┤
│ chip-row · Tất cả / Tổn / Hồi       │
├─────────────────────────────────────┤
│ Day-grouped list                    │
│   day-h: ngày + net (+/− Z)         │
│     tx: ic · name+meta · amount     │
│     tx: ...                         │
│   day-h ...                         │
└─────────────────────────────────────┘
```

### inv-stats

3 col grid (`exp / inc / net`). Format short (1.2M / 500K).
- exp: `−Tổng đã chi` crimson
- inc: `+Tổng đã thu` jade
- net: `±Cân bằng` (gold neutral, sign based on direction)

### chip-row (filter)

3 chip pills: Tất cả / Tổn / Hồi (state `filterType: 'all' | 'exp' | 'inc'`). Active chip = gold border + bg.

### search

Debounce 200ms, query trên `desc` (raw + localized) + `note`.

### Day group

```
day-h: T.S 18 Tháng 4   +234.000đ
  tx-row:
    [IconRice] Trà sữa             −80.000đ
                14:35 · Ăn uống
  tx-row:
    [IconCoins] Lương tháng 4      +22.000.000đ
                09:00 · Lương
day-h: T.6 17 Tháng 4   −500.000đ
  ...
```

Tap row → `open-detail` → DetailPopup variant `tx`.

`spriteForTx(tx)` map cat → sprite (IconRice/Bag/Horse/Bill/Lute/Herb/Ingot/Lotus + Coins/Chart/Trophy cho income).

Empty state: "Không tìm thấy chiến tích nào".

---

## 4. ADD · Xuất Kiếm

**Mục đích**: form thêm giao dịch (chi/thu) với toggle, big amount, quick presets, category grid, payMethod.

```
┌─────────────────────────────────────┐
│ SectionHeader Xuất Kiếm · new entry │
├─────────────────────────────────────┤
│ add-toggle · 2 col grid             │
│   [Tổn Linh Khí] | [Hồi Tu Vi]      │
├─────────────────────────────────────┤
│ amt-display · big number            │
│   ⚡ CRIT (top right, ≥ threshold) │
│   "Số linh khí" lab                 │
│   [đ] [______________] big mono     │
├─────────────────────────────────────┤
│ qa-row · 4 preset buttons           │
│   +20K  +50K  +100K  +200K          │
├─────────────────────────────────────┤
│ cat-section-h "Loại Linh Khí"       │
│ cat-grid · 4 cols × N rows          │
│   ⚪ Tịch Cốc (Ăn uống)            │
│   …                                 │
├─────────────────────────────────────┤
│ field--note (input desc)            │
├─────────────────────────────────────┤
│ field-row 3 col (exp) / 2 col (inc) │
│   [date] [currency dropdown] [pay]  │
├─────────────────────────────────────┤
│ attack-btn · gold gradient + shimmer │
└─────────────────────────────────────┘
```

### add-toggle

Active variant:
- `.exp` → bg crimson 15% + text crimson "Tổn Linh Khí"
- `.inc` → bg jade 15% + text jade "Hồi Tu Vi"

### amt-display

- Card padded 26/14, radial gold halo top
- `.amt-display__num` font 38px mono, color đổi theo type (crimson cho exp, jade cho inc)
- Input centered, transparent, hide spinner
- `crit-tag` (vermillion → orange gradient pill, pulse 1.5s) khi ≥ 500K VND / 20 USD / 5000 JPY

### qa-row

4 preset từ `PRESETS_BY_CURRENCY`. VND: 20K/50K/100K/200K. USD: 1/5/10/20. JPY: 100/500/1000/2000.

### cat-grid

4 cols × N rows. Per cat: sprite + label (tu-tien hoặc real tuỳ displayMode).

**Expense cats** (8): Tịch Cốc (an), Tích Bảo (mua), Phi Vân (dilai), Hộ Phù (hd), Quan Ảnh (giaitri), Đan Dược (yte), Trảm Ma (thanhToan), Linh Khí (khac).

**Income cats** (6): Cấm Tu Tu Vi (luong), Linh Khí Tự Do (freelance), Thưởng Đặc (thuong), Khí Hồi (hoantien), Tiên Thuật Sinh Kim (dautu), Linh Khí Khác (khac_thu).

### field-row

- `field` date input (max=today)
- `field--cur` select gold mono — VND / USD / JPY
- `field` (exp only) payMethod select — cash + danh sách credit cards (display tu-tien `bossFor(card).display · realName`)

### attack-btn

Gold gradient (gold-2 → gold → gold-3), 17px padding, glow shadow, animated shimmer. Disabled khi syncing OR amount=0 OR desc rỗng.

Label: exp → "Vung kiếm" · inc → "Khí hồi linh".

### Prefill (clone tx hoặc upcoming)

Khi user clone từ DetailPopup → `copyTxData` ref được set → AddTransaction watch và prefill toàn bộ field, scroll vào view.

---

## 5. CHT · Tu Vi Ký (Charts)

**Mục đích**: 3 chart tabs để phân tích flow / debt / category.

```
┌─────────────────────────────────────┐
│ cht-tabs · 3 button row             │
│   📊 Lưu Lượng | ⚔ Ma Chướng | 🎯 Loại │
├─────────────────────────────────────┤
│ cht-card (chart canvas)             │
└─────────────────────────────────────┘
```

### Tab 1 · Lưu Lượng (flow)

HTML bars (không Chart.js).

- Header: "X ngày · Lưu lượng" + range picker (`7 / 14 / 30` ngày)
- `bars` row: per day → `bar-stack` chiều cao % của bar lớn nhất
  - `.bar-bg.inc` jade gradient (income, dưới)
  - `.bar-bg.exp` crimson gradient (expense, trên)
- `bar-day` label dưới (DD)
- Meta footer: "TB/ngày · X" + "Đỉnh · DD/MM"

### Tab 2 · Ma Chướng (debt projection)

Inline SVG line chart (viewBox responsive).

- Title: "⚔ Ma Chướng tổng quan"
- `<defs><linearGradient>` crimson 50% → 0% (filled area)
- `<path>` filled (area dưới line)
- `<path>` stroke crimson 2.5px (line)
- `<circle>` gold dots (radius 3) tại mỗi tháng
- `<text>` mono 7px "MM/YY" mỗi 5 dot

Meta: "HP hiện tại · X" + "Đích · 02/2027".

### Tab 3 · Loại (category allocation)

Bar list horizontal (không pie).

- Per cat: `cat-bar` row 3 col
  - `.cat-bar__lb` (left, label localized)
  - `.cat-bar__track` (track 5px) + `.cat-bar__fill` (color từ `palette[i]` — chu kỳ 6 màu jade/crimson/gold/violet/azure/vermillion)
  - `.cat-bar__pct` (right, %)

Empty state: "Chưa có chiến tích".

---

## 6. MAP · Lộ Đồ Phi Thăng

**Mục đích**: roadmap timeline trả nợ + Tâm Pháp + thống kê.

```
┌─────────────────────────────────────┐
│ SectionHeader Lộ Đồ Phi Thăng       │
├─────────────────────────────────────┤
│ map-wrap                            │
│   "Lộ trình phi thăng" title        │
│   trail vertical                    │
│     ✓ 03/2026 · DONE · Tất Sơ Phá   │
│     ⚪ 05/2026 · ACTIVE · Trảm Yêu  │
│     5  06/2026 · TODO · Tiến Thủ    │
│     🏆 02/2027 · BOSS-FINAL · Phi Thăng │
├─────────────────────────────────────┤
│ SectionHeader Tâm Pháp · X/24       │
│ AchievementList max 3               │
├─────────────────────────────────────┤
│ SectionHeader Tu Vi Ký Lục          │
│ set-group:                          │
│   🔥 Streak · X ngày                │
│   ⚔ Tổng chiêu hạ · N chiêu        │
│   🏆 Đã hạ · X% Tâm Ma             │
└─────────────────────────────────────┘
```

### Trail / checkpoint

Vertical trail với line connector dashed/solid + dot + card.

- `.checkpoint.done` → jade dot + IconCheck
- `.checkpoint.active` → gold pulsing dot
- `.checkpoint` (todo) → grey number dot
- `.checkpoint.boss-final` → crimson big dot + IconTrophy + "✦ Phi thăng đại đạo"

Per checkpoint: month label + state + event name + debt amount (đã trả `−Xđ HP` cho done, hoặc `Xđ HP` cho future).

### Tu Vi Ký Lục

`set-group` 3 rows (xem section settings cho cấu trúc set-row).

---

## 7. CFG · Đạo Tâm (Settings)

**Mục đích**: cấu hình tổng. Truy cập qua tap avatar (không có tab).

```
┌─────────────────────────────────────┐
│ SectionHeader Cấu hình đạo hữu      │
│ set-group:                          │
│   👤 [Tên Lưu Vân] · Realm·LV (display)│
│   🎯 Hạn mức ngày                  │
│   🪙 Tiền tệ                        │
├─────────────────────────────────────┤
│ SectionHeader Giao diện             │
│ set-group:                          │
│   🌙/☀ Theme (toggle switch)       │
│   📜 Display name (toggle switch)   │
│   👁 Ẩn số (toggle switch)         │
│   🌐 Ngôn ngữ                       │
├─────────────────────────────────────┤
│ SectionHeader Kết nối               │
│ set-group:                          │
│   ☁ Đồng bộ · status · refresh     │
│   🔔 Push notifications             │
│   📤 Import/Export JSON             │
│   🔒 Hide zones (advanced)          │
│   📋 Quy tắc                        │
├─────────────────────────────────────┤
│ set-group danger:                   │
│   🚪 Đăng xuất                      │
├─────────────────────────────────────┤
│ Footer · v1.0 · "Đại đạo vô cương"  │
└─────────────────────────────────────┘
```

### set-row layout

```
[ic · 32×32 round]  [body]                     [val · right]
                    name (serif italic 13px gold)
                    sub (10.5px serif-vn muted)
```

Tap → mở popup tương ứng (drag-to-dismiss support).

### Popups (sheet style, drag-down dismiss)

| Popup | Nội dung |
|---|---|
| `lim` | Bar limit % + spent/limit + input + ≈ display currency hint + "Lưu" |
| `hz` | Treeview hide zones · 9 groups · checkbox tristate (all / some / none) · expand collapse |
| `rules` | Scroll list các quy tắc, dot bullet |
| `json` | Textarea + button "Cập nhật" + err message |
| `currency` | 3 tabs: Display / Base / JPY notation. Per tab list radio row chọn VND/USD/JPY. JPY tab có Standard / Kanji notation switch |
| `lang` | List radio · vi / en / ja |
| `push` | Status badge + iOS hint + worker URL input + Save + Enable button |
| `logout` | 🚪 Big icon · "Đăng xuất khỏi Bin?" · "Đạo tâm vẫn còn" · cancel/confirm |

### Hide zones tree (9 groups)

```
⚠ alert
🪙 cash      → balance, today, month
💳 debt      → total, cardBal, minPay
📉 progress  → origDebt, remaining
📅 upcoming  → amount, shortage
🧾 transactions → amt
📊 charts    → spend, debtLine, pie
⏱ timeline  → debt, eventAmt
⚙ settings  → cardInfo, dailyLim, dropdown, cashInfo
```

Per zone child: checkbox + label. Parent state: all/some/none (tristate via indeterminate prop).

---

## 8. DetailPopup (shared)

Sheet popup dùng cho 2 variants:
- `_variant: 'upcoming'` → Khai Chiến (mark paid / edit / delete)
- `_variant: 'tx'` → Chi tiết chiến tích (edit / delete)

3 modes: **view** → **edit** → **review translations** (after edit, hiện form quyết định auto/manual/keep cho mỗi locale chưa manual).

```
[draghandle]
[icon] Khai Chiến (hoặc Chi tiết chiến tích)        ✕
──────────────────────────────────────────
HERO · variant
  ┌────────────┐
  │ portrait   │ name (serif italic 14px gold)
  │ 36×36      │ real_name (mono 9px muted)
  └────────────┘ amt (mono bold 24px ± gold/crimson/jade)
──────────────────────────────────────────
4-STAT GRID (popup-stats)
  · Variant=upcoming: Ngày tới · Loại · Trạng thái · Linh thạch
  · Variant=tx:       Ngày · Giờ · Loại · Phương thức
──────────────────────────────────────────
ACTIONS (popup-actions)
  · upcoming + !paid: [⚔ Đoạt mạng] [✎ Sửa kiếp] [✗ Bỏ qua]
  · upcoming + paid:  [↩ Hồi sinh] [✗ Bỏ qua]
  · tx:               [✎ Sửa] [✗ Tiêu trừ]
```

### Edit mode

Form fields per variant:
- name (input, readonly cho CC item)
- date + time (tx only)
- amount + currency suffix (dual mode khi displayCurrency ≠ tx.currency)
- category (tx only) — toggle exp/inc + select
- note (tx only) — textarea

### Review step

Cho mỗi locale (vi/en/ja) chưa được manual:
- 3 button: Giữ / Tự dịch / Tự nhập
- Nếu manual → input field

---

## 9. Component map (quick reference)

| Path | Component | Phụ thuộc dữ liệu chính |
|---|---|---|
| `App.vue` | Root state + tab routing | `d: Ref<AppData>` (items[]) |
| `layout/TutienHeader` | Top bar | name, realm, lvl, coins (availCash) |
| `layout/BottomTabBar` | 5-tab nav | tab |
| `layout/SyncBar` | Sync status | syncSt, syncMsg, syncTime, today |
| `cards/SectionHeader` | Reusable section | icon, title, vn, act |
| `cards/BossCard` | Tâm Ma | totalDebt, origDebt, upcoming[0] |
| `cards/ManaCards` | Linh khí + kim nguyên bảo | dayLimit-todaySpent, availCash, cashDaysLeft |
| `cards/EnemyRow` | Mini-bosses | DebtItem[] (cards + small_loans gộp) |
| `cards/AchievementList` | Tâm pháp | paidCount, isOver, repayPct |
| `forms/AddTransaction` | Xuất kiếm form | creditCards (DebtItem) |
| `forms/SettingsPanel` | Đạo tâm | dayLimit, todaySpent, rules, hideZones, ... |
| `forms/SetupScreen` | Initial setup wizard | — |
| `charts/ChartsPanel` | Tu Vi Ký 3 tabs | ExpenseLogItem[], IncomeLogItem[], debtBreakdown, projected_debt_by_month |
| `charts/TimelinePanel` | Lộ Đồ | milestones, paidCount, repayPct, streakDays |
| `payments/QuestList` | Kiếp Số | UpcomingItem[] (computed) |
| `payments/TransactionList` | Chiến Ký | TransactionItem[] (gộp expense_log + income_log) |
| `ui/DetailPopup` | View/Edit upcoming/tx | UpcomingItem hoặc TransactionItem |
| `ui/Icon` | Lucide wrapper (legacy) | — |
| `ui/quest-icons.ts` | 33 SVG icon + 4 boss glyph | — |
| `ui/LoadingScreen` | Loading | message |
| `ui/ErrorPopup` | Reconnect | error, loading |
| `ui/ToastMessage` | Toast | message, type, trigger |
| `ui/LevelUpToast` | Đột phá pill | level |

---

## 10. Mobile-first constraints

- All hit targets ≥ 36×36 pt
- Sticky top header + fixed bottom tabbar (z 50)
- Safe area: `env(safe-area-inset-top)` padding header, `env(safe-area-inset-bottom)` padding tabbar
- Swipe-to-dismiss popups (drag down 80px hoặc flick velocity > 0.15)
- Body lock scroll khi popup mở
- `-webkit-tap-highlight-color: transparent` toàn bộ
- `prefers-reduced-motion: reduce` disable mọi animation

## 11. Inputs / forms behavior

- Number inputs hide native spinners
- Date inputs `type="date"` + max=today (cho expense)
- Select inputs custom chevron qua background-image gradient
- Currency dual-input wrap: VND base + display currency tương đương, ≈ separator
- Ratings nếu có: gold star (chưa có hiện tại)

## 12. Visual signature checklist

Khi redesign / port — đảm bảo giữ:

- [ ] 4 corner brackets ở BossCard
- [ ] Aura ring xoay (avatar + boss portrait)
- [ ] Gradient gold accent line dưới header
- [ ] Crimson HP bar với highlight overlay 2px top
- [ ] Pulse animation cho boss portrait + crit tag
- [ ] Number flash (re-mount) cho mọi giá trị tiền
- [ ] Boss damage shake khi HP giảm
- [ ] Day-grouped transaction list (không infinite scroll)
- [ ] Tu-tiên dual-name layer toàn bộ entity (đạo hiệu + real)
- [ ] FAB center tab (Add — gold round, lift -22px)
- [ ] Drag-handle bar 36×4 ở top mỗi popup sheet
