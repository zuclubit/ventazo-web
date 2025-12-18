// ============================================
// E2E Test Fixtures - FASE 5.11
// Reusable test fixtures and helpers
// ============================================

import { test as base, expect, Page, Locator } from '@playwright/test';

// ============================================
// Custom Test Fixtures
// ============================================

export interface TestFixtures {
  authenticatedPage: Page;
  leadPage: LeadPageObject;
  opportunityPage: OpportunityPageObject;
  dashboardPage: DashboardPageObject;
}

// ============================================
// Page Objects
// ============================================

export class LeadPageObject {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/app/leads');
  }

  async gotoNew() {
    await this.page.goto('/app/leads/new');
  }

  async gotoDetail(leadId: string) {
    await this.page.goto(`/app/leads/${leadId}`);
  }

  // Selectors
  get leadTable(): Locator {
    return this.page.locator('[data-testid="leads-table"]');
  }

  get newLeadButton(): Locator {
    return this.page.locator('button:has-text("Nuevo Lead"), a:has-text("Nuevo Lead")');
  }

  get searchInput(): Locator {
    return this.page.locator('input[placeholder*="Buscar"], input[name="search"]');
  }

  get statusFilter(): Locator {
    return this.page.locator('[data-testid="status-filter"]');
  }

  get leadRows(): Locator {
    return this.page.locator('[data-testid="lead-row"], tbody tr');
  }

  get emptyState(): Locator {
    return this.page.locator('[data-testid="empty-state"]');
  }

  // Actions
  async search(term: string) {
    await this.searchInput.fill(term);
    await this.page.waitForTimeout(300); // Debounce
  }

  async clickNewLead() {
    await this.newLeadButton.click();
  }

  async selectLead(index: number) {
    await this.leadRows.nth(index).click();
  }

  async filterByStatus(status: string) {
    await this.statusFilter.click();
    await this.page.locator(`[data-value="${status}"]`).click();
  }

  // Form Actions
  async fillLeadForm(data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    company?: string;
  }) {
    if (data.firstName) {
      await this.page.fill('input[name="firstName"]', data.firstName);
    }
    if (data.lastName) {
      await this.page.fill('input[name="lastName"]', data.lastName);
    }
    if (data.email) {
      await this.page.fill('input[name="email"]', data.email);
    }
    if (data.phone) {
      await this.page.fill('input[name="phone"]', data.phone);
    }
    if (data.company) {
      await this.page.fill('input[name="company"]', data.company);
    }
  }

  async submitForm() {
    await this.page.click('button[type="submit"]');
  }

  // Assertions
  async expectLeadsVisible() {
    await expect(this.leadTable).toBeVisible();
  }

  async expectLeadCount(count: number) {
    await expect(this.leadRows).toHaveCount(count);
  }

  async expectEmptyState() {
    await expect(this.emptyState).toBeVisible();
  }
}

export class OpportunityPageObject {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/app/opportunities');
  }

  async gotoNew() {
    await this.page.goto('/app/opportunities/new');
  }

  async gotoDetail(opportunityId: string) {
    await this.page.goto(`/app/opportunities/${opportunityId}`);
  }

  // Selectors
  get opportunityTable(): Locator {
    return this.page.locator('[data-testid="opportunities-table"]');
  }

  get pipelineView(): Locator {
    return this.page.locator('[data-testid="pipeline-view"]');
  }

  get newOpportunityButton(): Locator {
    return this.page.locator('button:has-text("Nueva Oportunidad"), a:has-text("Nueva Oportunidad")');
  }

  get opportunityCards(): Locator {
    return this.page.locator('[data-testid="opportunity-card"]');
  }

  get pipelineColumns(): Locator {
    return this.page.locator('[data-testid="pipeline-column"]');
  }

  // Actions
  async switchToKanban() {
    await this.page.click('button[data-view="kanban"]');
  }

  async switchToTable() {
    await this.page.click('button[data-view="table"]');
  }

  async dragOpportunity(from: string, to: string) {
    const sourceCard = this.page.locator(`[data-opportunity-id="${from}"]`);
    const targetColumn = this.page.locator(`[data-stage="${to}"]`);
    await sourceCard.dragTo(targetColumn);
  }

  async fillOpportunityForm(data: {
    name?: string;
    value?: number;
    leadId?: string;
    stage?: string;
  }) {
    if (data.name) {
      await this.page.fill('input[name="name"]', data.name);
    }
    if (data.value) {
      await this.page.fill('input[name="value"]', String(data.value));
    }
    if (data.leadId) {
      await this.page.click('[data-testid="lead-selector"]');
      await this.page.click(`[data-lead-id="${data.leadId}"]`);
    }
    if (data.stage) {
      await this.page.click('[data-testid="stage-selector"]');
      await this.page.click(`[data-value="${data.stage}"]`);
    }
  }

  // Assertions
  async expectPipelineVisible() {
    await expect(this.pipelineView).toBeVisible();
  }

  async expectOpportunityCount(count: number) {
    await expect(this.opportunityCards).toHaveCount(count);
  }
}

export class DashboardPageObject {
  constructor(private page: Page) {}

  // Navigation
  async goto() {
    await this.page.goto('/app/dashboard');
  }

  // Selectors
  get statsCards(): Locator {
    return this.page.locator('[data-testid="stats-card"]');
  }

  get recentLeads(): Locator {
    return this.page.locator('[data-testid="recent-leads"]');
  }

  get recentOpportunities(): Locator {
    return this.page.locator('[data-testid="recent-opportunities"]');
  }

  get charts(): Locator {
    return this.page.locator('[data-testid="chart"]');
  }

  get welcomeMessage(): Locator {
    return this.page.locator('[data-testid="welcome-message"]');
  }

  // Assertions
  async expectDashboardLoaded() {
    await expect(this.statsCards.first()).toBeVisible();
  }

  async expectStatsCardsVisible(count: number) {
    await expect(this.statsCards).toHaveCount(count);
  }
}

// ============================================
// Extended Test with Fixtures
// ============================================

export const test = base.extend<TestFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Use saved auth state
    await use(page);
  },

  leadPage: async ({ page }, use) => {
    await use(new LeadPageObject(page));
  },

  opportunityPage: async ({ page }, use) => {
    await use(new OpportunityPageObject(page));
  },

  dashboardPage: async ({ page }, use) => {
    await use(new DashboardPageObject(page));
  },
});

export { expect } from '@playwright/test';

// ============================================
// Test Data Factories
// ============================================

export function generateTestLead(overrides: Partial<{
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  company: string;
}> = {}) {
  const timestamp = Date.now();
  return {
    firstName: `Test`,
    lastName: `User${timestamp}`,
    email: `test${timestamp}@example.com`,
    phone: `+1${Math.floor(Math.random() * 9000000000) + 1000000000}`,
    company: `Test Company ${timestamp}`,
    ...overrides,
  };
}

export function generateTestOpportunity(overrides: Partial<{
  name: string;
  value: number;
  probability: number;
}> = {}) {
  const timestamp = Date.now();
  return {
    name: `Test Opportunity ${timestamp}`,
    value: Math.floor(Math.random() * 100000) + 10000,
    probability: Math.floor(Math.random() * 100),
    ...overrides,
  };
}

// ============================================
// Utility Functions
// ============================================

export async function waitForNetworkIdle(page: Page, timeout = 5000) {
  await page.waitForLoadState('networkidle', { timeout });
}

export async function waitForToast(page: Page, message?: string) {
  const toastLocator = message
    ? page.locator(`[data-testid="toast"]:has-text("${message}")`)
    : page.locator('[data-testid="toast"]');
  await expect(toastLocator).toBeVisible();
}

export async function closeToast(page: Page) {
  await page.click('[data-testid="toast"] button[aria-label="Close"]');
}

export async function confirmDialog(page: Page) {
  await page.click('[data-testid="confirm-dialog"] button:has-text("Confirmar")');
}

export async function cancelDialog(page: Page) {
  await page.click('[data-testid="confirm-dialog"] button:has-text("Cancelar")');
}
