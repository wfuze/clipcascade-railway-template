import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'line',
  use: {
    baseURL: process.env.CLIPCASCADE_BASE_URL || 'http://127.0.0.1:8080',
    browserName: 'chromium',
    headless: true,
    ignoreHTTPSErrors: false,
    trace: 'retain-on-failure',
  },
});

