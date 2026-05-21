import { defineConfig, devices } from '@playwright/test'

// Dedicated port — avoid clashing with `expo start` (8081) used for Android/iOS
const port = process.env.EXPO_WEB_PORT || '8090'
const baseURL = `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e-web',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npx expo start --web --port ${port}`,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 180_000,
  },
})
