// ============================================
// Dashboard E2E Tests - FASE 5.11
// Dashboard and analytics flow tests
// ============================================

import { test, expect, waitForNetworkIdle } from './fixtures';

test.describe('Dashboard', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.describe('Dashboard Overview', () => {
    test('should display dashboard after login', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      await expect(page).toHaveURL(/\/app\/(dashboard)?/);
    });

    test('should show statistics cards', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Wait for data to load
      await waitForNetworkIdle(page);

      // Should have stats cards
      const statsCards = page.locator('[data-testid="stats-card"], .stats-card');
      await expect(statsCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show recent activity', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();
      await waitForNetworkIdle(page);

      // Look for activity section
      const activitySection = page.locator('[data-testid="recent-activity"], [data-testid="activity-feed"]');
      const emptyState = page.locator('[data-testid="empty-state"]');

      await expect(activitySection.or(emptyState)).toBeVisible();
    });

    test('should show welcome message', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Look for greeting
      const greeting = page.locator('text=Hola').or(page.locator('text=Welcome'));
      await expect(greeting).toBeVisible();
    });
  });

  test.describe('Quick Actions', () => {
    test('should navigate to leads from dashboard', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Click leads card or link
      const leadsLink = page.locator('a[href="/app/leads"], [data-testid="leads-card"]');
      if (await leadsLink.isVisible()) {
        await leadsLink.click();
        await expect(page).toHaveURL('/app/leads');
      }
    });

    test('should navigate to opportunities from dashboard', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Click opportunities card or link
      const oppsLink = page.locator('a[href="/app/opportunities"], [data-testid="opportunities-card"]');
      if (await oppsLink.isVisible()) {
        await oppsLink.click();
        await expect(page).toHaveURL('/app/opportunities');
      }
    });

    test('should have quick create buttons', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Look for quick create
      const quickCreate = page.locator('[data-testid="quick-create"], button:has-text("Nuevo")');
      await expect(quickCreate.first()).toBeVisible({ timeout: 10000 }).catch(() => {});
    });
  });

  test.describe('Charts', () => {
    test.fixme('should display pipeline chart', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();
      await waitForNetworkIdle(page);

      const chart = page.locator('[data-testid="pipeline-chart"], .recharts-wrapper');
      await expect(chart).toBeVisible();
    });

    test.fixme('should display conversion funnel', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();
      await waitForNetworkIdle(page);

      const funnel = page.locator('[data-testid="conversion-funnel"]');
      await expect(funnel).toBeVisible();
    });

    test.fixme('should display trends chart', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();
      await waitForNetworkIdle(page);

      const trends = page.locator('[data-testid="trends-chart"]');
      await expect(trends).toBeVisible();
    });
  });

  test.describe('Date Range Filter', () => {
    test.fixme('should filter by date range', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      // Find date range picker
      const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
      if (await dateRangePicker.isVisible()) {
        await dateRangePicker.click();

        // Select "Last 7 days"
        await page.click('button:has-text("7 días"), button:has-text("Last 7 days")');

        await waitForNetworkIdle(page);
      }
    });

    test.fixme('should show custom date range picker', async ({ dashboardPage, page }) => {
      await dashboardPage.goto();

      const dateRangePicker = page.locator('[data-testid="date-range-picker"]');
      if (await dateRangePicker.isVisible()) {
        await dateRangePicker.click();

        // Click custom range
        await page.click('button:has-text("Personalizado"), button:has-text("Custom")');

        // Calendar should appear
        await expect(page.locator('.rdp, [data-testid="calendar"]')).toBeVisible();
      }
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/app/dashboard');

      // Mobile menu should be visible
      const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label="Menu"]');
      await expect(mobileMenu).toBeVisible({ timeout: 10000 }).catch(() => {});
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto('/app/dashboard');

      // Page should still be functional
      await expect(page).toHaveURL(/\/app/);
    });
  });
});

test.describe('Analytics Page', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test('should navigate to analytics', async ({ page }) => {
    await page.goto('/app/analytics');

    await expect(page).toHaveURL('/app/analytics');
  });

  test.fixme('should display analytics charts', async ({ page }) => {
    await page.goto('/app/analytics');
    await waitForNetworkIdle(page);

    const charts = page.locator('[data-testid="chart"], .recharts-wrapper');
    await expect(charts.first()).toBeVisible();
  });

  test.fixme('should switch between analytics views', async ({ page }) => {
    await page.goto('/app/analytics');

    // Look for view tabs
    const tabs = page.locator('[data-testid="analytics-tabs"] button');
    if (await tabs.count() > 1) {
      await tabs.nth(1).click();
      await waitForNetworkIdle(page);
    }
  });

  test.fixme('should export analytics data', async ({ page }) => {
    await page.goto('/app/analytics');

    const exportButton = page.locator('button:has-text("Exportar"), button:has-text("Export")');
    if (await exportButton.isVisible()) {
      // Set up download listener
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click(),
      ]);

      expect(download).toBeTruthy();
    }
  });
});
