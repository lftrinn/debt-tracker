# Debt Tracker

Ứng dụng theo dõi nợ cá nhân và quản lý chi tiêu hàng ngày. Thiết kế mobile-first, chạy hoàn toàn trên trình duyệt — không cần backend, không cần tài khoản server.

## Tính năng

- **Theo dõi nợ** — Quản lý thẻ tín dụng và khoản vay: số dư, lãi suất, thanh toán tối thiểu, tiến độ trả nợ
- **Chi tiêu hàng ngày** — Ghi nhận thu/chi, phân loại theo danh mục, phương thức thanh toán (tiền mặt / thẻ)
- **Hạn mức chi tiêu** — Giới hạn chi tiêu ngày, tự động điều chỉnh trước/sau ngày lương
- **Lộ trình trả nợ** — Dự báo tổng nợ theo từng tháng, timeline mốc thanh toán quan trọng
- **Biểu đồ trực quan** — Bar chart thu/chi, line chart lộ trình nợ, doughnut chart cơ cấu nợ
- **Đa ngôn ngữ** — Tiếng Việt, English, 日本語 (chuyển đổi không cần tải lại)
- **Đa tiền tệ** — Hiển thị VND, USD, JPY với tỷ giá cập nhật realtime (cache 4 giờ)
- **Ẩn thông tin nhạy cảm** — Kiểm soát từng vùng hiển thị số tiền riêng biệt
- **Đồng bộ đám mây** — Dữ liệu lưu trên JSONBin.io, truy cập từ mọi thiết bị

## Tech Stack

| Thành phần | Chi tiết |
|---|---|
| Framework | Vue 3 + TypeScript (Composition API, `<script setup>`) |
| Build | Vite 6 |
| Charts | Chart.js 4 |
| i18n | vue-i18n 9 |
| Unit tests | Vitest + @vue/test-utils |
| E2E tests | Playwright |
| Storage | JSONBin.io v3 API (free tier) |
| Deploy | GitHub Pages |

## Yêu cầu

- Node.js 18+
- Tài khoản [JSONBin.io](https://jsonbin.io) miễn phí

## Cài đặt

```bash
git clone <repository-url>
cd debt-tracker
npm install
npm run dev
```

Mở trình duyệt tại `http://localhost:3000`.

## Cấu hình JSONBin

Lần đầu chạy, màn hình Setup sẽ xuất hiện:

1. Truy cập [jsonbin.io](https://jsonbin.io) → Đăng ký miễn phí
2. Vào **API Keys** → Copy **Access Key** (bắt đầu bằng `$2b$`)
3. Chọn **"Tạo mới"** → Dán Access Key → Xác nhận

Để dùng trên nhiều thiết bị: chọn **"Đã có Bin"** → nhập API Key + Bin ID.

> Credentials chỉ lưu trong localStorage của trình duyệt (`dt_k`, `dt_b`).

## Lệnh phát triển

```bash
npm run dev           # Dev server tại cổng 3000
npm run build         # Type-check + build production vào dist/
npm run build:nocheck # Build không type-check
npm run preview       # Preview bản build
npm run type-check    # vue-tsc --noEmit
npm run test          # Unit tests (watch mode)
npm run test:run      # Unit tests (single run)
npm run test:coverage # Unit tests + coverage report
npm run test:e2e      # E2E tests (Playwright)
```

## Deploy lên GitHub Pages

```bash
npm run build
# Deploy nội dung dist/ lên branch gh-pages
```

Cấu hình GitHub Actions để tự động deploy khi push vào `main` (xem `.github/workflows/`).

> Ứng dụng là SPA — cần cấu hình redirect `404.html` hoặc hash routing cho GitHub Pages.

## Cấu trúc dự án

```
src/
  main.ts              # Entry point — đăng ký Vue app + i18n
  App.vue              # Root component — state chính (ref<AppData>)
  i18n/                # vue-i18n config + locale files (vi/en/ja)
  types/               # TypeScript interfaces (AppData, CreditCard...)
  assets/              # Global CSS (vars, reset, shared utilities)
  components/
    layout/            # AppHeader, SyncBar
    cards/             # CashHero, DebtOverview, ProgressSection
    forms/             # AddTransaction, SettingsPanel, SetupScreen
    charts/            # ChartsPanel, TimelinePanel
    ui/                # Icon, LoadingScreen, ErrorPopup, ToastMessage, DetailPopup
    payments/          # UpcomingPayments, TransactionList
  composables/
    data/              # Computed data: cash, debt cards, upcoming, timeline, daily limit
    ui/                # UI utilities: toast, hide zones, colors, formatters
    api/               # JSONBin wrapper, currency conversion + rates
    actions/           # Mutations: transactions, payments, debt updates, app setup
```

## Bảo mật

- API Key lưu trong localStorage, không gửi đến server nào ngoài JSONBin
- Bin được tạo với `X-Bin-Private: true` — chỉ đọc/ghi được bằng đúng API Key của bạn
- **Không chia sẻ API Key**

## License

MIT
