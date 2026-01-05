/**
 * Playwright Configuration for Performance Testing
 * Zuclubit Smart CRM
 */

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './',
  fullyParallel: false, // Run tests sequentially for accurate metrics
  forbidOnly: !!process.env.CI,
  retries: 0, // No retries for performance tests
  workers: 1, // Single worker for consistent measurements
  reporter: [
    ['html', { outputFolder: '../reports/playwright-report' }],
    ['json', { outputFile: '../reports/playwright-results.json' }],
    ['list'],
  ],
  timeout: 60000, // 60s timeout per test

  use: {
    baseURL: process.env.FRONTEND_URL || 'https://crm.zuclubit.com',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'Desktop Chrome',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        launchOptions: {
          args: [
            '--enable-precise-memory-info',
            '--js-flags=--expose-gc',
          ],
        },
      },
    },
    {
      name: 'Mobile Safari',
      use: {
        ...devices['iPhone 13'],
      },
    },
    {
      name: 'Tablet',
      use: {
        ...devices['iPad Pro 11'],
      },
    },
  ],

  // No web server - testing against deployed environment
});
