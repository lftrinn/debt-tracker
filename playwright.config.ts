import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright E2E config.
 * Uses `npm run preview` (vite preview) as the web server.
 * The app must be built before running E2E tests: `npm run build:nocheck`.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:4173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run preview',
    url: 'http://localhost:4173/debt-tracker/',
    reuseExistingServer: !process.env.CI,
  },
})
