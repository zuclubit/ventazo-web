/**
 * Playwright E2E Performance Tests
 * Zuclubit Smart CRM
 *
 * Measures real user journey performance with Web Vitals
 */

import { test, expect, type Page, type BrowserContext } from '@playwright/test';

// Configuration
const BASE_URL = process.env.FRONTEND_URL || 'https://crm.zuclubit.com';
const TEST_EMAIL = process.env.TEST_EMAIL || 'oscar@cuervo.cloud';
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'transirVSK-MI1';

// Performance thresholds (in milliseconds)
const THRESHOLDS = {
  pageLoad: 3000,
  navigation: 2000,
  interaction: 500,
  apiResponse: 1000,
  ttfb: 800,
  fcp: 1800,
  lcp: 2500,
  tti: 3800,
};

// Performance metrics storage
interface PerformanceMetrics {
  navigationStart: number;
  ttfb: number;
  fcp: number;
  lcp: number;
  domContentLoaded: number;
  loadComplete: number;
  tti: number;
}

// Helper to collect Web Vitals
async function collectWebVitals(page: Page): Promise<Partial<PerformanceMetrics>> {
  return await page.evaluate(() => {
    const navigation = performance.getEntriesByType(
      'navigation'
    )[0] as PerformanceNavigationTiming;
    const paint = performance.getEntriesByType('paint');

    const fcp = paint.find((p) => p.name === 'first-contentful-paint');

    return {
      ttfb: navigation?.responseStart - navigation?.requestStart || 0,
      fcp: fcp?.startTime || 0,
      domContentLoaded: navigation?.domContentLoadedEventEnd || 0,
      loadComplete: navigation?.loadEventEnd || 0,
    };
  });
}

// Helper to measure LCP
async function measureLCP(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let lcp = 0;
      const observer = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        lcp = lastEntry.startTime;
      });
      observer.observe({ type: 'largest-contentful-paint', buffered: true });

      // Wait a bit for LCP to be recorded
      setTimeout(() => {
        observer.disconnect();
        resolve(lcp);
      }, 2000);
    });
  });
}

// Helper to measure CLS
async function measureCLS(page: Page): Promise<number> {
  return await page.evaluate(() => {
    return new Promise<number>((resolve) => {
      let cls = 0;
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!(entry as any).hadRecentInput) {
            cls += (entry as any).value;
          }
        }
      });
      observer.observe({ type: 'layout-shift', buffered: true });

      setTimeout(() => {
        observer.disconnect();
        resolve(cls);
      }, 3000);
    });
  });
}

test.describe('E2E Performance Tests', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    context = await browser.newContext({
      viewport: { width: 1920, height: 1080 },
    });
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await context.close();
  });

  test('Login page performance', async () => {
    const startTime = Date.now();

    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    const metrics = await collectWebVitals(page);

    console.log('\n📊 Login Page Performance:');
    console.log(`  Total load time: ${loadTime}ms`);
    console.log(`  TTFB: ${metrics.ttfb?.toFixed(0)}ms`);
    console.log(`  FCP: ${metrics.fcp?.toFixed(0)}ms`);
    console.log(`  DOM Content Loaded: ${metrics.domContentLoaded?.toFixed(0)}ms`);

    // Assertions
    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    expect(metrics.ttfb).toBeLessThan(THRESHOLDS.ttfb);
    expect(metrics.fcp).toBeLessThan(THRESHOLDS.fcp);
  });

  test('Login flow performance', async () => {
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Measure input responsiveness
    const inputStart = Date.now();
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    const inputTime = Date.now() - inputStart;

    console.log(`\n📊 Login Form Input: ${inputTime}ms`);

    // Measure login submission
    const loginStart = Date.now();
    await page.click('button[type="submit"]');

    // Wait for navigation or dashboard content
    await Promise.race([
      page.waitForURL('**/app**', { timeout: 10000 }),
      page.waitForSelector('[data-testid="dashboard"]', { timeout: 10000 }),
    ]).catch(() => {
      // Continue even if specific selectors fail
    });

    const loginTime = Date.now() - loginStart;

    console.log(`📊 Login Submission: ${loginTime}ms`);

    expect(inputTime).toBeLessThan(THRESHOLDS.interaction);
    expect(loginTime).toBeLessThan(5000); // Login may take longer
  });

  test('Dashboard load performance', async () => {
    // Navigate to dashboard
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    const metrics = await collectWebVitals(page);
    const lcp = await measureLCP(page);
    const cls = await measureCLS(page);

    console.log('\n📊 Dashboard Performance:');
    console.log(`  Total load time: ${loadTime}ms`);
    console.log(`  TTFB: ${metrics.ttfb?.toFixed(0)}ms`);
    console.log(`  FCP: ${metrics.fcp?.toFixed(0)}ms`);
    console.log(`  LCP: ${lcp.toFixed(0)}ms`);
    console.log(`  CLS: ${cls.toFixed(3)}`);

    // Assertions
    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    expect(lcp).toBeLessThan(THRESHOLDS.lcp);
    expect(cls).toBeLessThan(0.1); // Good CLS threshold
  });

  test('Leads page navigation performance', async () => {
    // Ensure we're logged in
    await page.goto(`${BASE_URL}/app`, { waitUntil: 'networkidle' });

    // Measure navigation to leads
    const startTime = Date.now();
    await page.click('a[href*="/leads"], [data-nav="leads"]').catch(async () => {
      // Fallback: direct navigation
      await page.goto(`${BASE_URL}/app/leads`);
    });

    await page.waitForLoadState('networkidle');

    const navigationTime = Date.now() - startTime;
    const lcp = await measureLCP(page);

    console.log('\n📊 Leads Page Navigation:');
    console.log(`  Navigation time: ${navigationTime}ms`);
    console.log(`  LCP: ${lcp.toFixed(0)}ms`);

    expect(navigationTime).toBeLessThan(THRESHOLDS.navigation);
  });

  test('Leads Kanban rendering performance', async () => {
    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });

    // Wait for Kanban board to render
    const startTime = Date.now();
    await page
      .waitForSelector('[data-testid="kanban-board"], .kanban-board, [class*="kanban"]', {
        timeout: 5000,
      })
      .catch(() => {
        console.log('  Note: Kanban board selector not found, checking for lead cards');
      });

    const renderTime = Date.now() - startTime;

    // Check for content
    const hasContent = await page
      .locator('[data-testid="lead-card"], .lead-card, [class*="lead-card"]')
      .count();

    console.log('\n📊 Leads Kanban Performance:');
    console.log(`  Initial render: ${renderTime}ms`);
    console.log(`  Cards visible: ${hasContent}`);

    expect(renderTime).toBeLessThan(THRESHOLDS.navigation);
  });

  test('Opportunities page performance', async () => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app/opportunities`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;
    const lcp = await measureLCP(page);
    const cls = await measureCLS(page);

    console.log('\n📊 Opportunities Page Performance:');
    console.log(`  Total load time: ${loadTime}ms`);
    console.log(`  LCP: ${lcp.toFixed(0)}ms`);
    console.log(`  CLS: ${cls.toFixed(3)}`);

    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
    expect(lcp).toBeLessThan(THRESHOLDS.lcp);
  });

  test('Customers page performance', async () => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app/customers`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    console.log('\n📊 Customers Page Performance:');
    console.log(`  Total load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
  });

  test('Tasks page performance', async () => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app/tasks`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    console.log('\n📊 Tasks Page Performance:');
    console.log(`  Total load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
  });

  test('Settings page performance', async () => {
    const startTime = Date.now();
    await page.goto(`${BASE_URL}/app/settings`, { waitUntil: 'networkidle' });

    const loadTime = Date.now() - startTime;

    console.log('\n📊 Settings Page Performance:');
    console.log(`  Total load time: ${loadTime}ms`);

    expect(loadTime).toBeLessThan(THRESHOLDS.pageLoad);
  });
});

test.describe('User Journey Performance', () => {
  test('Complete sales workflow', async ({ page }) => {
    const metrics: { [key: string]: number } = {};

    // 1. Login
    let startTime = Date.now();
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app**', { timeout: 10000 }).catch(() => {});
    metrics['login'] = Date.now() - startTime;

    // 2. View Dashboard
    startTime = Date.now();
    await page.waitForLoadState('networkidle');
    metrics['dashboard_load'] = Date.now() - startTime;

    // 3. Navigate to Leads
    startTime = Date.now();
    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });
    metrics['leads_navigation'] = Date.now() - startTime;

    // 4. Open new lead form
    startTime = Date.now();
    await page
      .click('button:has-text("Nuevo"), button:has-text("New"), [data-testid="new-lead"]')
      .catch(() => {});
    await page.waitForTimeout(500);
    metrics['open_lead_form'] = Date.now() - startTime;

    // 5. Navigate to Opportunities
    startTime = Date.now();
    await page.goto(`${BASE_URL}/app/opportunities`, { waitUntil: 'networkidle' });
    metrics['opportunities_navigation'] = Date.now() - startTime;

    // Print summary
    console.log('\n📊 Sales Workflow Performance Summary:');
    console.log('═══════════════════════════════════════');
    Object.entries(metrics).forEach(([step, time]) => {
      const status = time < THRESHOLDS.navigation ? '✓' : '✗';
      console.log(`  ${status} ${step.padEnd(25)}: ${time}ms`);
    });

    const totalTime = Object.values(metrics).reduce((a, b) => a + b, 0);
    console.log('───────────────────────────────────────');
    console.log(`  Total workflow time: ${totalTime}ms`);

    // Assert total journey time
    expect(totalTime).toBeLessThan(15000);
  });
});

test.describe('Interaction Performance', () => {
  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/app**', { timeout: 10000 }).catch(() => {});
  });

  test('Dropdown interaction responsiveness', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });

    // Find and click a dropdown
    const startTime = Date.now();
    await page
      .click('[data-testid="filter-dropdown"], button:has-text("Filtrar"), select')
      .catch(() => {});
    const interactionTime = Date.now() - startTime;

    console.log(`\n📊 Dropdown Interaction: ${interactionTime}ms`);
    expect(interactionTime).toBeLessThan(THRESHOLDS.interaction);
  });

  test('Search responsiveness', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });

    // Find search input
    const searchInput = page.locator(
      'input[type="search"], input[placeholder*="Buscar"], input[placeholder*="Search"]'
    );

    if ((await searchInput.count()) > 0) {
      const startTime = Date.now();
      await searchInput.fill('test');
      await page.waitForTimeout(500); // Debounce
      const searchTime = Date.now() - startTime;

      console.log(`\n📊 Search Response: ${searchTime}ms`);
      expect(searchTime).toBeLessThan(THRESHOLDS.apiResponse);
    }
  });

  test('Modal/Sheet open performance', async ({ page }) => {
    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });

    // Click on a lead card to open detail sheet
    const leadCard = page.locator(
      '[data-testid="lead-card"], .lead-card, [class*="lead-card"]'
    );

    if ((await leadCard.count()) > 0) {
      const startTime = Date.now();
      await leadCard.first().click();
      await page.waitForSelector('[role="dialog"], [data-state="open"]', {
        timeout: 2000,
      }).catch(() => {});
      const modalTime = Date.now() - startTime;

      console.log(`\n📊 Modal/Sheet Open: ${modalTime}ms`);
      expect(modalTime).toBeLessThan(THRESHOLDS.interaction);
    }
  });
});

test.describe('API Response Times', () => {
  test('Track API performance', async ({ page }) => {
    const apiMetrics: { [key: string]: number[] } = {};

    // Intercept API calls
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/')) {
        const timing = response.timing();
        const endpoint = url.split('/api/')[1]?.split('?')[0] || 'unknown';

        if (!apiMetrics[endpoint]) {
          apiMetrics[endpoint] = [];
        }
        if (timing) {
          apiMetrics[endpoint].push(timing.responseEnd);
        }
      }
    });

    // Navigate through the app
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });
    await page.fill('input[type="email"], input[name="email"]', TEST_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    await page.goto(`${BASE_URL}/app/leads`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/app/opportunities`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Print API performance
    console.log('\n📊 API Response Times:');
    console.log('═══════════════════════════════════════');

    Object.entries(apiMetrics).forEach(([endpoint, times]) => {
      if (times.length > 0) {
        const avg = times.reduce((a, b) => a + b, 0) / times.length;
        const max = Math.max(...times);
        console.log(`  ${endpoint.substring(0, 30).padEnd(30)}: avg ${avg.toFixed(0)}ms, max ${max.toFixed(0)}ms`);
      }
    });
  });
});
