import { test, expect, type Page } from '@playwright/test'

const APP_URL = '/debt-tracker/'
const JSONBIN_API = '**/api.jsonbin.io/v3/**'

/** Minimal app data for mocking JSONBin responses */
const MOCK_DATA = {
  expenses: [],
  incomes: [],
  extra_paid: 0,
  custom_daily_limit: 100_000,
  current_cash: { balance: 2_000_000, reserved: 0, as_of: '2026-01-01' },
  debts: { credit_cards: [], small_loans: [] },
  income: { monthly_net: 22_923_000, pay_date: 5 },
  rules: { daily_limit: { until_salary: 70_000, after_salary: 100_000 }, must_not: [] },
  payoff_timeline: { projected_debt_by_month: [] },
  one_time_expenses: [
    { id: 1, name: 'Trả Visa', date: '2026-04-15', amount: 500_000 },
  ],
  paid_obligations: [],
}

/**
 * Bootstrap: set localStorage credentials and mock all JSONBin API calls
 * so the app loads directly into `ready` state.
 */
async function setupWithMock(page: Page): Promise<void> {
  // Set credentials before page navigation so the app finds them at startup
  await page.addInitScript(() => {
    localStorage.setItem('dt_k', '$2b$test-api-key')
    localStorage.setItem('dt_b', 'test-bin-id-e2e')
  })

  // Mock GET (pull)
  await page.route('**/api.jsonbin.io/v3/b/*/latest', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ record: MOCK_DATA }),
    })
  })

  // Mock PUT (push)
  await page.route('**/api.jsonbin.io/v3/b/*', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    } else {
      route.continue()
    }
  })
}

/** Wait for the main UI to become ready (past loading screen) */
async function waitForReady(page: Page): Promise<void> {
  await page.waitForSelector('.wrap', { timeout: 10_000 })
}

// ─── Flow 1: Setup via "Đã có Bin" ────────────────────────────────────────────

test('setup flow — kết nối bin có sẵn', async ({ page }) => {
  // Mock GET so pull succeeds after entering credentials
  await page.route('**/api.jsonbin.io/v3/b/*/latest', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ record: MOCK_DATA }),
    })
  })
  await page.route('**/api.jsonbin.io/v3/b/*', (route) => {
    if (route.request().method() === 'PUT') {
      route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
    } else {
      route.continue()
    }
  })

  await page.goto(APP_URL)

  // Should show SetupScreen (no credentials in localStorage)
  await expect(page.getByText('Debt Tracker').first()).toBeVisible()
  await expect(page.getByText('Đã có Bin')).toBeVisible()

  // Switch to "Đã có Bin" tab
  await page.getByText('Đã có Bin').click()

  // Fill in API key and bin ID
  await page.locator('input[placeholder*="API Key"]').fill('$2b$test-api-key')
  await page.locator('input[placeholder="Bin ID"]').fill('test-bin-id-e2e')

  // Click connect
  await page.getByRole('button', { name: 'KẾT NỐI' }).click()

  // Main UI should load
  await waitForReady(page)
  await expect(page.locator('.wrap')).toBeVisible()
})

// ─── Flow 2: Thêm chi tiêu ────────────────────────────────────────────────────

test('thêm chi tiêu — xuất hiện trong lịch sử', async ({ page }) => {
  await setupWithMock(page)
  await page.goto(APP_URL)
  await waitForReady(page)

  // Ensure "+ Thêm" tab is active (it should be default)
  await page.getByRole('button', { name: '+ Thêm' }).click()

  // Fill in description
  const descInput = page.locator('input.add-form__input[placeholder*="Mô tả"]')
  await descInput.fill('Cơm tối test')

  // Fill in amount
  const amtInput = page.locator('input.add-form__amount')
  await amtInput.fill('75000')

  // Click THÊM
  await page.getByRole('button', { name: 'THÊM' }).click()

  // Switch to "Lịch sử" tab
  await page.getByRole('button', { name: 'Lịch sử' }).click()

  // The new expense should appear
  await expect(page.getByText('Cơm tối test')).toBeVisible()
})

// ─── Flow 3: Điều hướng tab ───────────────────────────────────────────────────

test('điều hướng tab — mỗi tab hiển thị nội dung đúng', async ({ page }) => {
  await setupWithMock(page)
  await page.goto(APP_URL)
  await waitForReady(page)

  // Default: "+ Thêm" tab — AddTransaction form visible
  await expect(page.getByText('Ghi khoản chi')).toBeVisible()

  // "Lịch sử" tab
  await page.getByRole('button', { name: 'Lịch sử' }).click()
  // TransactionList should render (even if empty)
  await expect(page.locator('.tab-btn.active')).toContainText('Lịch sử')

  // "Biểu đồ" tab
  await page.getByRole('button', { name: 'Biểu đồ' }).click()
  await expect(page.locator('.tab-btn.active')).toContainText('Biểu đồ')

  // "Timeline" tab
  await page.getByRole('button', { name: 'Timeline' }).click()
  await expect(page.locator('.tab-btn.active')).toContainText('Timeline')

  // "Cài đặt" tab
  await page.getByRole('button', { name: 'Cài đặt' }).click()
  await expect(page.locator('.tab-btn.active')).toContainText('Cài đặt')

  // Back to "+ Thêm"
  await page.getByRole('button', { name: '+ Thêm' }).click()
  await expect(page.getByText('Ghi khoản chi')).toBeVisible()
})

// ─── Flow 4: Ẩn/hiện số tiền ─────────────────────────────────────────────────

test('ẩn/hiện số tiền — toggle hide button', async ({ page }) => {
  await setupWithMock(page)
  await page.goto(APP_URL)
  await waitForReady(page)

  // By default, hideAmounts is true (dt_hide not set → '1')
  // The eye button should be visible
  const eyeBtn = page.locator('.app-header__btn--eye')
  await expect(eyeBtn).toBeVisible()

  // Toggle to show amounts
  await eyeBtn.click()

  // Toggle back to hide
  await eyeBtn.click()

  // Button should still exist and be functional
  await expect(eyeBtn).toBeVisible()
})

// ─── Flow 5: Upcoming payments ────────────────────────────────────────────────

test('upcoming payments — hiển thị khoản chi sắp tới', async ({ page }) => {
  await setupWithMock(page)
  await page.goto(APP_URL)
  await waitForReady(page)

  // The mock data has one upcoming: "Trả Visa" on 2026-04-15
  // UpcomingPayments section should be visible
  await expect(page.getByText('Trả Visa')).toBeVisible()
})
