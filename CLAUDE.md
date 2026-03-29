# CLAUDE.md — Debt Tracker

## Project Overview

Ứng dụng theo dõi nợ cá nhân và quản lý chi tiêu, xây dựng bằng Vue 3 + TypeScript + Vite. Giao diện đa ngôn ngữ (vi/en/ja), thiết kế mobile-first. Dữ liệu lưu trữ trên JSONBin.io (không có backend riêng).

## Tech Stack

| Thành phần | Công nghệ |
|---|---|
| Framework | Vue 3 (Composition API, `<script setup>`) |
| Language | TypeScript 5 |
| Build tool | Vite 6 |
| Charts | Chart.js 4 |
| i18n | vue-i18n 9 |
| Unit tests | Vitest + @vue/test-utils |
| E2E tests | Playwright |
| Backend | JSONBin.io v3 API (free tier) |
| Storage | localStorage cho credentials (`dt_k`, `dt_b`), JSONBin cho data |
| Deploy | Static files (GitHub Pages compatible) |

## Commands

```bash
npm run dev           # Dev server tại port 3000
npm run build         # Type-check + build production vào dist/
npm run build:nocheck # Build không type-check (nhanh hơn)
npm run preview       # Preview bản build
npm run type-check    # vue-tsc --noEmit
npm run test          # Vitest watch mode
npm run test:run      # Vitest chạy một lần
npm run test:coverage # Vitest + coverage report
npm run test:e2e      # Playwright e2e tests
```

## Project Structure

```
src/
  main.ts                        # Entry point — đăng ký Vue app + i18n plugin
  App.vue                        # Root component — toàn bộ state & logic chính
  i18n/
    index.ts                     # Cấu hình vue-i18n, hàm setLocale()
    locales/
      vi.ts                      # Tiếng Việt
      en.ts                      # English
      ja.ts                      # 日本語
  types/
    data.ts                      # TypeScript interfaces: AppData, CreditCard, Expense...
  assets/
    styles.css                   # Global styles: CSS vars, reset, shared utilities, popup system
  components/
    layout/
      AppHeader.vue              # Header: sync status, daily limit indicator, hide-all button
      SyncBar.vue                # Thanh trạng thái đồng bộ JSONBin
    cards/
      CashHero.vue               # Hiển thị tiền mặt khả dụng, chi tiêu hôm nay/tháng
      DebtOverview.vue           # Tổng quan nợ: thẻ tín dụng + vay nhỏ
      ProgressSection.vue        # Thanh tiến độ trả nợ
    forms/
      AddTransaction.vue         # Form thêm chi tiêu / thu nhập
      SettingsPanel.vue          # Cài đặt: hạn mức, hide zones, ngôn ngữ, tiền tệ, rules
      SetupScreen.vue            # Màn hình setup ban đầu (tạo mới / import / kết nối)
    charts/
      ChartsPanel.vue            # Biểu đồ chi tiêu (bar), nợ (line), cơ cấu nợ (doughnut)
      TimelinePanel.vue          # Timeline mốc trả nợ theo tháng
    ui/
      Icon.vue                   # Lucide icon wrapper
      LoadingScreen.vue          # Màn hình loading với progress bar
      ErrorPopup.vue             # Popup lỗi kết nối JSONBin
      ToastMessage.vue           # Toast thông báo (ok/err)
      DetailPopup.vue            # Popup chi tiết + sửa giao dịch
    payments/
      UpcomingPayments.vue       # Các khoản thanh toán sắp tới (thẻ + one-time)
      TransactionList.vue        # Danh sách giao dịch gần đây
  composables/
    data/
      useCashData.ts             # Tính toán tiền mặt khả dụng, chi tiêu ngày/tháng
      useDebtCards.ts            # Dữ liệu thẻ tín dụng: số dư, lãi suất, tiến độ
      useUpcoming.ts             # Các khoản sắp đến hạn + tình trạng thiếu hụt
      useTimeline.ts             # Tính toán lộ trình trả nợ theo tháng
      useDailyLimit.ts           # Hạn mức chi tiêu ngày, logic trước/sau lương
      useDebtData.ts             # Aggregator: gọi tất cả data composables
      useCategories.ts           # Danh mục chi tiêu/thu nhập + icon/label
    ui/
      useToast.ts                # Toast notification state và trigger
      useHideZones.ts            # Quản lý hide zones (ẩn số tiền theo vùng)
      useColors.ts               # Màu sắc theme + helper rgba() cho Chart.js
      useFormatters.ts           # Format số, tiền VND, ngày tháng (vi-VN)
    api/
      useApi.ts                  # JSONBin v3 API wrapper: push/pull/create
      useCurrency.ts             # Hiển thị đa tiền tệ (VND/USD/JPY), tỷ giá realtime
    actions/
      useTransactions.ts         # Thêm/xóa giao dịch chi tiêu và thu nhập
      usePayments.ts             # Đánh dấu thanh toán + quản lý one-time expenses
      useDebtActions.ts          # Cập nhật thẻ tín dụng + khoản vay
      useAppSetup.ts             # Khởi tạo app: load data, setup JSONBin credentials
```

## Architecture

### Data Flow

```
App.vue (state: d = ref<AppData>)
  ├── useDebtData(d)        → aggregates all computed data
  │     ├── useCashData(d)
  │     ├── useDebtCards(d)
  │     ├── useUpcoming(d)
  │     ├── useTimeline(d)
  │     └── useDailyLimit(d)
  ├── useApi()              → JSONBin push/pull
  ├── useTransactions(d)    → add/delete expenses & incomes
  ├── usePayments(d)        → mark payments, one-time expenses
  ├── useDebtActions(d)     → update credit cards & loans
  └── useAppSetup(d)        → initialization, credentials
```

### Data Schema (JSON on JSONBin)

```json
{
  "expenses": [{ "id": 123, "desc": "...", "amount": 50000, "cat": "an", "date": "2026-03-27", "payMethod": "cash" }],
  "incomes": [{ "id": 124, "desc": "...", "amount": 100000, "cat": "luong", "date": "..." }],
  "current_cash": { "balance": 865000, "reserved": 500000, "as_of": "2026-03-27" },
  "debts": {
    "credit_cards": [{ "id": "visa1", "name": "Visa 1", "credit_limit": 37000000, "balance": 34946713, "interest_rate_annual": 0.328, "minimum_payment": 2663422 }],
    "small_loans": [{ "id": "...", "name": "...", "remaining_balance": 0 }]
  },
  "income": { "monthly_net": 22923000, "pay_date": 5 },
  "rules": { "daily_limit": { "until_salary": 70000, "after_salary": 100000 }, "must_not": [] },
  "payoff_timeline": { "projected_debt_by_month": [] },
  "monthly_plans": { "2026-03": { "obligations": [] } },
  "one_time_expenses": [{ "id": 123, "name": "...", "date": "...", "amount": 500000 }],
  "paid_obligations": ["2026-03-15:Visa 1"],
  "extra_paid": 0,
  "custom_daily_limit": 0
}
```

## Coding Conventions

### General

- Vue 3 Composition API với `<script setup lang="ts">` — TypeScript bắt buộc
- Không dùng router hay Pinia — single-page với tab navigation, state tập trung ở `App.vue`
- State chính qua reactive ref `d: Ref<AppData | null>`, truyền xuống component qua props & emit

### TypeScript

- Types định nghĩa tại `src/types/data.ts`
- Luôn type rõ ràng cho props (`defineProps<{...}>()`) và emit
- Tránh `any` — dùng `unknown` khi cần, type guard khi xử lý API response

### Naming

- Composables: `useX()` trả về object với các computed/methods
- Ham format viết tắt: `fN()` (format number), `fDate()` (format date), `fCurr()` (format currency short)
- Biến trạng thái viết tắt: `syncSt`, `syncMsg`, `sErr`
- Helper ngắn: `isT()` (is today), `isTM()` (is this month), `dDiff()` (date diff days)
- Component names: PascalCase theo chức năng

### BEM CSS

- Mỗi component có `<style scoped>` với BEM naming: `.block__element--modifier`
- Global `styles.css` chỉ chứa: CSS vars, reset, shared utilities, popup system, card/tab/badge system
- Dynamic class dùng template literal: `:class="'block__element--' + modifier"`
- Selector vào child component (Icon) dùng `:deep(svg)`

### i18n

- **Không hardcode UI text** — luôn dùng `$t('key')` trong template hoặc `t('key')` trong script
- Key structure: `section.subsection.label` (vd: `settings.menu.limit`)
- Locale files tại `src/i18n/locales/{vi,en,ja}.ts`
- Thêm key mới vào cả 3 locale files cùng lúc

### Currency & Formatting

- **Không dùng `Intl.NumberFormat` trực tiếp** — dùng composable `useCurrency`
- `fCurr(value)` — format ngắn (vd: "1.2M đ", "$1,200")
- `fCurrFull(value)` — format đầy đủ (vd: "1.234.567 đ")
- Display currency (VND/USD/JPY) lưu trong `useCurrency` singleton, persist qua localStorage
- Tỷ giá fetch từ API công cộng, cache 4 giờ trong localStorage

### Data Handling

- Immutable updates: spread operator khi update nested objects trong `d.value`
- Null safety: dùng `?.` và `|| []` / `|| 0` xuyên suốt
- ID generation: `Date.now()` cho expense/income/one_time items
- Sync sau mọi mutation: gọi `pushData()` sau khi update `d.value`

### Sync

- `pushData()` — đẩy state lên JSONBin sau mỗi thay đổi
- `pullData()` — tải data khi khởi động hoặc reconnect
- Sync status hiển thị qua `SyncBar` component (syncing/synced/error)

## Testing

### Unit Tests (Vitest)

- Tests tại `src/composables/__tests__/*.test.ts`
- Pattern: import composable → set up mock data → assert computed values
- Không mock composable phụ thuộc — test integration thực tế
- Không test component render — chỉ test composable logic

```bash
npm run test          # Watch mode
npm run test:run      # Single run
npm run test:coverage # Coverage report
```

### E2E Tests (Playwright)

```bash
npm run test:e2e      # Chạy Playwright tests
```

## Important Notes

- Pay date mặc định ngày 5 hàng tháng
- Daily limit tự động chuyển giữa `until_salary` và `after_salary` dựa trên pay date
- `custom_daily_limit` khi > 0 override cả hai giá trị trên
- `extra_paid` track số tiền trả thêm ngoài minimum payment
- `paid_obligations` lưu dạng `"YYYY-MM-DD:Card Name"` để tránh trùng theo tháng
