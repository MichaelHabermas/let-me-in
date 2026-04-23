import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: {
    ...devices['Desktop Chrome'],
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'pnpm vite --port 5199 --strictPort',
    url: 'http://localhost:5199/',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      VITE_ADMIN_USER: 'e2e_admin',
      VITE_ADMIN_PASS: 'e2e_secret',
      VITE_E2E_STUB_ENROLL: 'true',
    },
  },
});
