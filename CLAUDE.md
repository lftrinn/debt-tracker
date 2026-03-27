# CLAUDE.md — Debt Tracker

## Project Overview

Ung dung theo doi no ca nhan & quan ly chi tieu, xay dung bang Vue 3 + Vite. Giao dien tieng Viet, thiet ke mobile-first. Du lieu luu tru tren JSONBin.io (khong co backend rieng).

## Tech Stack

- **Framework**: Vue 3 (Composition API, `<script setup>`)
- **Build tool**: Vite 6
- **Charts**: Chart.js 4
- **Backend**: JSONBin.io v3 API (free tier)
- **Storage**: localStorage cho credentials (`dt_k`, `dt_b`), JSONBin cho data
- **Deploy**: Static files (GitHub Pages compatible)

## Commands

```bash
npm run dev      # Dev server tai port 3000
npm run build    # Build production vao dist/
npm run preview  # Preview ban build
```

## Project Structure

```
src/
  main.js                  # Entry point
  App.vue                  # Root component — chua toan bo state & logic chinh
  assets/
    styles.css             # Global styles
  components/
    AddTransaction.vue     # Form them chi tieu / thu nhap
    AppHeader.vue          # Header voi nut reload & logout
    CashHero.vue           # Hien thi tien mat kha dung, chi tieu hom nay/thang
    ChartsPanel.vue        # Bieu do chi tieu 7 ngay, no, payoff timeline
    DebtOverview.vue       # Tong quan no (the tin dung + vay nho)
    ErrorPopup.vue         # Popup loi ket noi
    LoadingScreen.vue      # Man hinh loading
    ProgressSection.vue    # Thanh tien do tra no
    SettingsPanel.vue      # Cai dat: cap nhat the, han muc, import JSON
    SetupScreen.vue        # Man hinh setup ban dau (tao moi / import / ket noi)
    SyncBar.vue            # Thanh trang thai dong bo
    TimelinePanel.vue      # Timeline moc tra no
    TransactionList.vue    # Danh sach giao dich voi xoa
    UpcomingPayments.vue   # Cac khoan thanh toan sap toi
  composables/
    useApi.js              # JSONBin API wrapper (push/pull/create)
    useDebtData.js         # Computed data: no, chi tieu, han muc, upcoming
    useFormatters.js       # Format so, tien, ngay (locale vi-VN)
```

## Architecture

### Data Flow

- Toan bo state nam trong `App.vue` qua reactive ref `d`
- Composable `useDebtData(d)` tao cac computed properties tu `d`
- Composable `useApi()` xu ly sync voi JSONBin (push/pull)
- Composable `useFormatters()` cung cap ham format chung

### Data Schema (JSON on JSONBin)

```json
{
  "expenses": [{ "id": 123, "desc": "...", "amount": 50000, "cat": "an", "date": "2026-03-27" }],
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

- Tat ca dung Vue 3 Composition API voi `<script setup>`
- Khong dung router hay state management library — single-page voi tab navigation
- State tap trung tai `App.vue`, truyen xuong component qua props & events

### Naming

- Ham format viet tat: `fN` (format number), `fS` (format short), `fV` (format value), `tStr` (today string)
- Bien trang thai viet tat: `syncSt` (sync status), `syncMsg` (sync message), `sErr` (setup error)
- Helper ngan gon: `isT()` (is today), `isTM()` (is this month), `dDiff()` (date diff)
- Component names: PascalCase, mo ta chuc nang (`CashHero`, `DebtOverview`, `AddTransaction`)

### Vietnamese Localization

- Moi UI text bang tieng Viet
- Format tien: `Intl.NumberFormat('vi-VN')` voi hau to `d` (dong)
- Format ngay: `toLocaleDateString('vi-VN')`

### Data Handling

- Immutable updates: spread operator khi update nested objects trong `d.value`
- Null safety: su dung `?.` va `|| []` / `|| 0` xuyen suot
- ID generation: `Date.now()` cho expense/income/one_time items

### Sync

- Moi thay doi goi `pushData()` de dong bo len JSONBin
- `pullData()` tai data khi khoi dong hoac reconnect
- Sync status hien thi qua `SyncBar` component

## Important Notes

- Khong co testing framework — chua co unit tests
- Khong co TypeScript — toan bo la JavaScript
- Khong co ESLint/Prettier config
- Currency la VND (dong Viet Nam), tat ca so tien tinh bang dong
- Pay date mac dinh ngay 5 hang thang
- Daily limit tu dong chuyen giua `until_salary` va `after_salary` dua tren pay date
