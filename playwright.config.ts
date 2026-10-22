import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { STORAGE_STATE } from './src/config/paths';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const hasCredentials = Boolean(process.env.CAT_USERNAME && process.env.CAT_PASSWORD);
// A session saved by hand (e.g. `playwright codegen --save-storage`) also enables
// the authenticated tests, without needing a password in .env.
const hasSavedSession = fs.existsSync(STORAGE_STATE);

// Gherkin features are compiled into Playwright specs by `bddgen`.
const bddTestDir = defineBddConfig({
  features: 'features/*.feature',
  steps: 'features/steps/*.ts',
  outputDir: '.features-gen',
});

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
    {
      // Contract tests on cat.com's catalogue JSON feed.
      name: 'api',
      testMatch: /api\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      // Real equipment page with its catalogue feed intercepted (page.route).
      name: 'mocked',
      testMatch: /mocked\/.*\.spec\.ts/,
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    {
      // REST + role-based access tests against the local mock API (no browser, no cat.com).
      name: 'rbac',
      testMatch: /rbac\/.*\.spec\.ts/,
    },
    {
      name: 'bdd',
      testDir: bddTestDir,
      use: { ...devices['Desktop Chrome'], channel: 'chromium' },
    },
    // Sign-in setup only exists when credentials are supplied in .env.
    ...(hasCredentials
      ? [
          {
            name: 'setup',
            testMatch: /auth\.setup\.ts/,
            use: { ...devices['Desktop Chrome'], channel: 'chromium' },
          },
        ]
      : []),
    // Authenticated tests run with credentials (after setup) or with a saved session.
    ...(hasCredentials || hasSavedSession
      ? [
          {
            name: 'authenticated',
            testMatch: /authenticated\/.*\.spec\.ts/,
            dependencies: hasCredentials ? ['setup'] : [],
            use: { ...devices['Desktop Chrome'], channel: 'chromium', storageState: STORAGE_STATE },
          },
        ]
      : []),
  ],
});
