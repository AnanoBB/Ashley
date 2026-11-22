import { defineConfig } from '@playwright/test';
import { env } from './src/config/env';

const VIEWPORT = { width: 1440, height: 900 };

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  // The shared QA storefront slows down sharply with more parallel sessions: with 3 workers, tests
  // time out on page loads; 2 is both stable and faster.
  workers: 2,
  forbidOnly: env.isCI,
  // One retry absorbs a rare QA-env hiccup (slow page loads), locally as in CI; the HTML report
  // and the CI run summary still show a test that passed on retry as flaky.
  retries: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never' }],
    [
      'allure-playwright',
      {
        resultsDir: 'allure-results',
        environmentInfo: {
          BASE_URL: env.baseUrl,
          API_URL: env.apiUrl,
          UI_USER_AGENT: env.uiUserAgent,
          API_USER_AGENT: env.apiUserAgent,
          Browser: `Chromium (desktop, ${VIEWPORT.width}x${VIEWPORT.height})`,
          Node: process.version,
        },
      },
    ],
  ],
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'api',
      testDir: './tests/api',
      use: {
        baseURL: env.apiUrl,
        userAgent: env.apiUserAgent,
      },
    },
    {
      name: 'ui',
      testDir: './tests/ui',
      timeout: 90_000,
      expect: { timeout: 15_000 },
      use: {
        baseURL: env.baseUrl,
        userAgent: env.uiUserAgent,
        browserName: 'chromium',
        viewport: VIEWPORT,
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
      },
    },
  ],
});
