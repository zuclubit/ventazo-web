// ============================================
// Auth Setup - FASE 5.11
// Global authentication setup for E2E tests
// ============================================

import { test as setup, expect } from '@playwright/test';

const authFile = 'e2e/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // Navigate to login page
  await page.goto('/login');

  // Wait for page to be ready
  await expect(page.locator('form')).toBeVisible();

  // Fill in login credentials (using test user)
  await page.fill('input[name="email"]', process.env['TEST_USER_EMAIL'] || 'test@example.com');
  await page.fill('input[name="password"]', process.env['TEST_USER_PASSWORD'] || 'testpassword123');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for successful redirect to dashboard or app
  await expect(page).toHaveURL(/\/(app|dashboard)/);

  // Save authentication state
  await page.context().storageState({ path: authFile });
});

setup('admin authenticate', async ({ page }) => {
  const adminAuthFile = 'e2e/.auth/admin.json';

  // Navigate to login page
  await page.goto('/login');

  // Wait for page to be ready
  await expect(page.locator('form')).toBeVisible();

  // Fill in admin credentials
  await page.fill('input[name="email"]', process.env['TEST_ADMIN_EMAIL'] || 'admin@example.com');
  await page.fill('input[name="password"]', process.env['TEST_ADMIN_PASSWORD'] || 'adminpassword123');

  // Submit the form
  await page.click('button[type="submit"]');

  // Wait for successful redirect
  await expect(page).toHaveURL(/\/(app|dashboard)/);

  // Save admin authentication state
  await page.context().storageState({ path: adminAuthFile });
});
