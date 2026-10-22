import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';
import { STORAGE_STATE } from './src/config/paths';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const hasCredentials = Boolean(process.env.CAT_USERNAME && process.env.CAT_PASSWORD);

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: true,
  // Keep load on a public production site low.
  workers: process.env.CI ? 1 : 2,
  retries: process.env.CI ? 2 : 1,
  forbidOnly: !!process.env.CI,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL ?? 'https://www.cat.com',
    locale: 'en-US',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
  },
  projects: [
    {
      name: 'public',
      testMatch: /public\/.*\.spec\.ts/,
      // cat.com's bot protection drops the old headless shell; Chromium's
      // "new headless" mode (channel: 'chromium') behaves like real Chrome.
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    // Authenticated projects only run when credentials are supplied in .env.
    ...(hasCredentials
      ? [
          {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'], channel: 'chromium' },
          },
          {
            name: 'authenticated',
            testMatch: /authenticated\/.*\.spec\.ts/,
            dependencies: ['setup'],
            use: { ...devices['Desktop Chrome'], channel: 'chromium', storageState: STORAGE_STATE },
          },
        ]
      : []),
  ],
});
