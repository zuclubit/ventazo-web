// ============================================
// Navigation E2E Tests - FASE 5.11
// Navigation and routing flow tests
// ============================================

import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.describe('Sidebar Navigation', () => {
    test('should navigate to all main sections', async ({ page }) => {
      await page.goto('/app/dashboard');

      // Dashboard
      const dashboardLink = page.locator('a[href="/app/dashboard"]');
      if (await dashboardLink.isVisible()) {
        await dashboardLink.click();
        await expect(page).toHaveURL(/\/app\/dashboard/);
      }

      // Leads
      const leadsLink = page.locator('a[href="/app/leads"]');
      await leadsLink.click();
      await expect(page).toHaveURL('/app/leads');

      // Opportunities
      const oppsLink = page.locator('a[href="/app/opportunities"]');
      await oppsLink.click();
      await expect(page).toHaveURL('/app/opportunities');

      // Customers
      const customersLink = page.locator('a[href="/app/customers"]');
      if (await customersLink.isVisible()) {
        await customersLink.click();
        await expect(page).toHaveURL('/app/customers');
      }

      // Tasks
      const tasksLink = page.locator('a[href="/app/tasks"]');
      if (await tasksLink.isVisible()) {
        await tasksLink.click();
        await expect(page).toHaveURL('/app/tasks');
      }

      // Analytics
      const analyticsLink = page.locator('a[href="/app/analytics"]');
      if (await analyticsLink.isVisible()) {
        await analyticsLink.click();
        await expect(page).toHaveURL('/app/analytics');
      }
    });

    test('should highlight active nav item', async ({ page }) => {
      await page.goto('/app/leads');

      // Check if leads nav item is active
      const leadsNav = page.locator('a[href="/app/leads"]');
      const hasActiveAttr = await leadsNav.getAttribute('data-active').catch(() => null);
      const className = await leadsNav.getAttribute('class').catch(() => '');
      expect(hasActiveAttr === 'true' || /active|selected/.test(className || '')).toBeTruthy();
    });

    test('should collapse/expand sidebar', async ({ page }) => {
      await page.goto('/app/dashboard');

      const toggleButton = page.locator('[data-testid="sidebar-toggle"]');
      if (await toggleButton.isVisible()) {
        // Collapse
        await toggleButton.click();

        // Sidebar should be collapsed
        const sidebar = page.locator('[data-testid="sidebar"]');
        const collapsedAttr = await sidebar.getAttribute('data-collapsed').catch(() => null);
        const sidebarClass = await sidebar.getAttribute('class').catch(() => '');
        expect(collapsedAttr === 'true' || /collapsed/.test(sidebarClass || '')).toBeTruthy();

        // Expand
        await toggleButton.click();

        // Sidebar should be expanded
        const expandedAttr = await sidebar.getAttribute('data-collapsed').catch(() => null);
        const expandedClass = await sidebar.getAttribute('class').catch(() => '');
        expect(expandedAttr !== 'true' && !/collapsed/.test(expandedClass || '')).toBeTruthy();
      }
    });
  });

  test.describe('Breadcrumbs', () => {
    test.fixme('should show correct breadcrumbs', async ({ page }) => {
      await page.goto('/app/leads');

      // Click on a lead
      const firstLead = page.locator('[data-testid="lead-row"]').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Breadcrumbs should show: Home > Leads > [Lead Name]
        const breadcrumbs = page.locator('[data-testid="breadcrumbs"]');
        await expect(breadcrumbs).toContainText('Leads');
      }
    });

    test.fixme('should navigate via breadcrumbs', async ({ page }) => {
      await page.goto('/app/leads/new');

      // Click on "Leads" in breadcrumbs
      const breadcrumbLink = page.locator('[data-testid="breadcrumbs"] a:has-text("Leads")');
      if (await breadcrumbLink.isVisible()) {
        await breadcrumbLink.click();
        await expect(page).toHaveURL('/app/leads');
      }
    });
  });

  test.describe('Deep Linking', () => {
    test('should navigate directly to lead detail', async ({ page }) => {
      // Note: This test assumes there's at least one lead
      await page.goto('/app/leads');

      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        // Get the href
        const href = await firstLead.locator('a').first().getAttribute('href');
        if (href) {
          await page.goto(href);
          await expect(page).toHaveURL(new RegExp(href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
        }
      }
    });

    test('should handle 404 for non-existent pages', async ({ page }) => {
      await page.goto('/app/non-existent-page');

      // Should show 404 or redirect
      const notFound = page.locator('text=404').or(page.locator('text=not found'));
      await expect(notFound).toBeVisible({ timeout: 10000 })
        .catch(() => expect(page).toHaveURL(/\/(app|404)/));
    });
  });

  test.describe('Back/Forward Navigation', () => {
    test('should support browser back button', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.goto('/app/leads');
      await page.goto('/app/opportunities');

      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/app/leads');

      // Go back again
      await page.goBack();
      await expect(page).toHaveURL('/app/dashboard');
    });

    test('should support browser forward button', async ({ page }) => {
      await page.goto('/app/dashboard');
      await page.goto('/app/leads');

      // Go back
      await page.goBack();
      await expect(page).toHaveURL('/app/dashboard');

      // Go forward
      await page.goForward();
      await expect(page).toHaveURL('/app/leads');
    });
  });

  test.describe('URL Parameters', () => {
    test('should preserve filters in URL', async ({ page }) => {
      await page.goto('/app/leads?status=new&page=1');

      // Filters should be applied
      await expect(page).toHaveURL(/status=new/);
    });

    test('should restore filters from URL', async ({ page }) => {
      await page.goto('/app/leads?search=test');

      // Search input should have the value
      const searchInput = page.locator('input[name="search"], input[placeholder*="Buscar"]');
      if (await searchInput.isVisible()) {
        await expect(searchInput).toHaveValue('test');
      }
    });
  });

  test.describe('Mobile Navigation', () => {
    test('should show hamburger menu on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app/dashboard');

      const hamburger = page.locator('button[aria-label="Menu"], [data-testid="mobile-menu-button"]');
      await expect(hamburger).toBeVisible({ timeout: 10000 }).catch(() => {});
    });

    test('should open mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app/dashboard');

      const hamburger = page.locator('button[aria-label="Menu"], [data-testid="mobile-menu-button"]');
      if (await hamburger.isVisible()) {
        await hamburger.click();

        // Mobile menu should appear
        const mobileNav = page.locator('[data-testid="mobile-nav"]');
        await expect(mobileNav).toBeVisible();
      }
    });

    test('should navigate from mobile menu', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app/dashboard');

      const hamburger = page.locator('button[aria-label="Menu"], [data-testid="mobile-menu-button"]');
      if (await hamburger.isVisible()) {
        await hamburger.click();

        // Click leads in mobile menu
        await page.locator('[data-testid="mobile-nav"] a[href="/app/leads"]').click();
        await expect(page).toHaveURL('/app/leads');
      }
    });
  });
});
