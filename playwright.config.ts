import { defineConfig } from '@playwright/test';
import { env, USER_AGENT } from './src/config/env';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The shared QA storefront slows down sharply with more parallel sessions: with 3 workers, tests
  // time out on page loads; 2 is both stable and faster.
  workers: 2,
  forbidOnly: env.isCI,
  // One retry in CI absorbs a rare QA-env hiccup; the run summary still counts it as flaky.
  retries: env.isCI ? 1 : 0,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    ['allure-playwright', { resultsDir: 'allure-results' }],
  ],
  use: {
    userAgent: USER_AGENT,
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: env.apiUrl,
      },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      timeout: 90_000,
      expect: { timeout: 15_000 },
      use: {
        baseURL: env.baseUrl,
        browserName: 'chromium',
        viewport: { width: 1440, height: 900 },
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
});
