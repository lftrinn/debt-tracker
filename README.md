# 💳 Debt Tracker

Ứng dụng theo dõi nợ và chi tiêu cá nhân, được thiết kế tối ưu cho iPhone. Dữ liệu đồng bộ giữa các thiết bị qua JSONBin.io.

---

## ✨ Tính năng

- **Tổng quan tài chính** — hiển thị tiền mặt khả dụng, chi tiêu hôm nay, tổng nợ còn lại và tiến độ trả nợ
- **Ghi khoản chi** — thêm chi tiêu theo danh mục, tự động sync lên cloud
- **Lịch sử chi tiêu** — xem và xóa các khoản đã ghi
- **Biểu đồ** — chi tiêu 7 ngày qua, lộ trình giảm nợ theo tháng, cơ cấu nợ hiện tại (donut chart)
- **Timeline** — lộ trình thoát nợ từ dữ liệu JSON, tự động đánh dấu milestone đã qua / đang ở / sắp tới
- **Thanh toán sắp đến** — đọc từ `monthly_plans` trong JSON, tự động tính urgency theo ngày thực tế
- **Hạn mức chi ngày** — tự động chuyển giữa hạn mức trước/sau lương theo `pay_date`
- **Ghi nhận trả nợ** — cập nhật tiến độ trả nợ
- **Không cần backend** — một file HTML duy nhất, chạy được trên mọi trình duyệt

---

## 🛠 Tech stack

| Thành phần | Chi tiết |
|---|---|
| Framework | Vue 3 (CDN, không cần build) |
| Chart | Chart.js |
| Font | Be Vietnam Pro + IBM Plex Mono (hỗ trợ tiếng Việt) |
| Storage | JSONBin.io (free tier) |
| Deploy | GitHub Pages |

---

## 🚀 Hướng dẫn cài đặt

### Bước 1 — Tạo tài khoản JSONBin.io

1. Truy cập [jsonbin.io/register](https://jsonbin.io/register)
2. Tạo tài khoản miễn phí
3. Vào **API Keys** → copy key bắt đầu bằng `$2b$`

### Bước 2 — Chuẩn bị file JSON tài chính

File JSON cần có cấu trúc sau:

```json
{
  "income": {
    "monthly_net": 22923000,
    "pay_date": 5
  },
  "debts": {
    "summary": { "total": 91721251 },
    "credit_cards": [
      {
        "id": "visa1",
        "name": "Visa 1 — Techcombank",
        "credit_limit": 37000000,
        "balance": 34946713,
        "interest_rate_annual": 0.328,
        "minimum_payment": 2663422
      }
    ],
    "small_loans": [
      {
        "id": "hd_saison",
        "name": "HD Saison",
        "monthly_payment": 1083702,
        "remaining_balance": 3251106
      }
    ]
  },
  "monthly_plans": {
    "2026-04": {
      "obligations": [
        { "date": "2026-04-06", "name": "Visa 1 minimum", "amount": 2663422, "category": "debt_minimum" }
      ]
    }
  },
  "rules": {
    "daily_limit": {
      "until_salary": 70000,
      "after_salary": 100000
    },
    "must_not": ["Không quẹt thẻ tín dụng thêm"]
  },
  "current_cash": {
    "balance": 865000,
    "reserved": 500000
  },
  "payoff_timeline": {
    "milestones": [
      { "month": "2026-06", "event": "HD Saison hết 🎉" }
    ],
    "projected_debt_by_month": [
      { "month": "2026-04", "total_debt": 82913000 },
      { "month": "2026-11", "total_debt": 0 }
    ]
  }
}
```

> Các trường `expenses`, `extra_paid`, `custom_daily_limit` sẽ được app tự thêm vào khi import.

### Bước 3 — Mở app và import

1. Mở `index.html` trên trình duyệt
2. Chọn tab **Import JSON**
3. Nhập API Key và paste nội dung JSON vào
4. Bấm **IMPORT & BẮT ĐẦU**

### Bước 4 — Dùng trên nhiều thiết bị

Sau khi setup lần đầu, mở app trên thiết bị khác:

1. Chọn tab **Đã có Bin**
2. Nhập API Key + Bin ID (tìm trong dashboard JSONBin)
3. Bấm **KẾT NỐI**

---

## 📱 Deploy lên GitHub Pages

```bash
# 1. Tạo repo mới trên GitHub
# 2. Push file index.html lên branch main
git init
git add index.html README.md
git commit -m "init: debt tracker"
git remote add origin https://github.com/<username>/<repo>.git
git push -u origin main

# 3. Vào Settings → Pages → Source: Deploy from branch main
# 4. Truy cập: https://<username>.github.io/<repo>
```

Sau khi có URL, bookmark trên iPhone để dùng như một web app.

---

## 📂 Cấu trúc dữ liệu JSONBin

App lưu toàn bộ state vào một Bin duy nhất. Các trường được app quản lý:

| Trường | Mô tả |
|---|---|
| `expenses` | Danh sách khoản chi do người dùng nhập |
| `extra_paid` | Tổng số tiền đã trả nợ được ghi nhận |
| `custom_daily_limit` | Hạn mức chi ngày tùy chỉnh (0 = dùng mặc định từ rules) |
| `current_cash.balance` | Số dư tiền mặt hiện tại |

---

## ⚙️ Hạn mức chi ngày

App tự động chọn hạn mức theo thời điểm trong tháng:

- **Trước ngày lương** (`pay_date`): dùng `rules.daily_limit.until_salary`
- **Sau ngày lương**: dùng `rules.daily_limit.after_salary`
- **Tùy chỉnh thủ công**: vào tab Cài đặt → Hạn mức chi hàng ngày

---

## 🔒 Bảo mật

- API Key được lưu trong `localStorage` của trình duyệt, không gửi đến bất kỳ server nào ngoài JSONBin
- Bin được tạo với `X-Bin-Private: true` — chỉ có thể đọc/ghi bằng đúng API Key của bạn
- **Không chia sẻ API Key cho người khác**

---

## 📄 License

MIT
