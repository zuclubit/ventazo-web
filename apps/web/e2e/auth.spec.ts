// ============================================
// Auth E2E Tests - FASE 5.11
// Authentication flow tests
// ============================================

import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page correctly', async ({ page }) => {
      await page.goto('/login');

      // Check page elements
      await expect(page.locator('h1, h2').first()).toBeVisible();
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should show validation errors for empty form', async ({ page }) => {
      await page.goto('/login');

      // Submit empty form
      await page.click('button[type="submit"]');

      // Check for validation errors
      await expect(page.locator('text=required').or(page.locator('text=obligatorio'))).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill invalid credentials
      await page.fill('input[name="email"]', 'invalid@example.com');
      await page.fill('input[name="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      // Wait for error message
      await expect(
        page.locator('text=Invalid').or(page.locator('text=incorrect')).or(page.locator('text=error'))
      ).toBeVisible({ timeout: 10000 });
    });

    test('should successfully login with valid credentials', async ({ page }) => {
      await page.goto('/login');

      // Fill valid credentials
      await page.fill('input[name="email"]', process.env['TEST_USER_EMAIL'] || 'test@example.com');
      await page.fill('input[name="password"]', process.env['TEST_USER_PASSWORD'] || 'testpassword123');
      await page.click('button[type="submit"]');

      // Should redirect to app
      await expect(page).toHaveURL(/\/(app|dashboard)/, { timeout: 15000 });
    });

    test('should redirect unauthenticated users to login', async ({ page }) => {
      // Try to access protected route
      await page.goto('/app/leads');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Logout Flow', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test('should successfully logout', async ({ page }) => {
      await page.goto('/app/dashboard');

      // Click user menu
      await page.click('[data-testid="user-menu"]');

      // Click logout
      await page.click('button:has-text("Cerrar Sesión"), button:has-text("Logout")');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Persistence', () => {
    test.use({ storageState: 'e2e/.auth/user.json' });

    test('should maintain session across page refreshes', async ({ page }) => {
      await page.goto('/app/dashboard');

      // Verify we're authenticated
      await expect(page).toHaveURL(/\/app/);

      // Refresh the page
      await page.reload();

      // Should still be authenticated
      await expect(page).toHaveURL(/\/app/);
    });

    test('should maintain session across navigation', async ({ page }) => {
      await page.goto('/app/dashboard');

      // Navigate to leads
      await page.click('a[href="/app/leads"]');
      await expect(page).toHaveURL('/app/leads');

      // Navigate to opportunities
      await page.click('a[href="/app/opportunities"]');
      await expect(page).toHaveURL('/app/opportunities');

      // Navigate back to dashboard
      await page.click('a[href="/app/dashboard"]');
      await expect(page).toHaveURL('/app/dashboard');
    });
  });

  test.describe('Password Recovery', () => {
    test('should display forgot password page', async ({ page }) => {
      await page.goto('/login');

      // Click forgot password link
      await page.click('a:has-text("Olvidé"), a:has-text("Forgot")');

      // Should navigate to forgot password page
      await expect(page.locator('input[name="email"]')).toBeVisible();
    });

    test('should send password recovery email', async ({ page }) => {
      await page.goto('/forgot-password');

      // Fill email
      await page.fill('input[name="email"]', 'test@example.com');
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(
        page.locator('text=enviado').or(page.locator('text=sent')).or(page.locator('text=check'))
      ).toBeVisible({ timeout: 10000 });
    });
  });
});
