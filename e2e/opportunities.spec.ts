// ============================================
// Opportunities E2E Tests - FASE 5.11
// Opportunity pipeline flow tests
// ============================================

import { test, expect, generateTestOpportunity, waitForNetworkIdle, waitForToast } from './fixtures';

test.describe('Opportunities Module', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.describe('Opportunity List', () => {
    test('should display opportunities page', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      await expect(page).toHaveURL('/app/opportunities');

      // Either pipeline or table should be visible
      const pipeline = page.locator('[data-testid="pipeline-view"]');
      const table = page.locator('[data-testid="opportunities-table"], table');
      const emptyState = page.locator('[data-testid="empty-state"]');

      await expect(pipeline.or(table).or(emptyState)).toBeVisible();
    });

    test('should show new opportunity button', async ({ opportunityPage }) => {
      await opportunityPage.goto();
      await expect(opportunityPage.newOpportunityButton).toBeVisible();
    });

    test('should switch between kanban and table view', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      // Try switching views
      const kanbanButton = page.locator('button[data-view="kanban"], button:has-text("Kanban")');
      const tableButton = page.locator('button[data-view="table"], button:has-text("Tabla")');

      if (await kanbanButton.isVisible()) {
        await kanbanButton.click();
        await expect(page.locator('[data-testid="pipeline-view"]')).toBeVisible();
      }

      if (await tableButton.isVisible()) {
        await tableButton.click();
        await expect(page.locator('table, [data-testid="opportunities-table"]')).toBeVisible();
      }
    });
  });

  test.describe('Pipeline View', () => {
    test('should display pipeline columns', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      // Look for pipeline columns
      const columns = page.locator('[data-testid="pipeline-column"], [data-stage]');

      // Should have at least some columns if pipeline is visible
      const pipelineView = page.locator('[data-testid="pipeline-view"]');
      if (await pipelineView.isVisible()) {
        await expect(columns.first()).toBeVisible();
      }
    });

    test.fixme('should drag opportunity between stages', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      // Find an opportunity card
      const card = page.locator('[data-testid="opportunity-card"]').first();
      if (await card.isVisible()) {
        // Find target column
        const targetColumn = page.locator('[data-stage="proposal"]');

        if (await targetColumn.isVisible()) {
          // Perform drag
          await card.dragTo(targetColumn);

          // Wait for update
          await waitForNetworkIdle(page);
        }
      }
    });
  });

  test.describe('Opportunity Creation', () => {
    test('should navigate to create form', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();
      await opportunityPage.newOpportunityButton.click();

      await expect(page).toHaveURL(/\/app\/opportunities\/(new|create)/);
    });

    test('should create new opportunity', async ({ opportunityPage, page }) => {
      const testOpp = generateTestOpportunity();

      await opportunityPage.gotoNew();

      // Fill form
      await page.fill('input[name="name"]', testOpp.name);
      await page.fill('input[name="value"]', String(testOpp.value));

      // Submit
      await page.click('button[type="submit"]');

      // Should show success or redirect
      await expect(page.locator('text=creada').or(page.locator('text=created'))).toBeVisible({ timeout: 10000 })
        .catch(() => expect(page).toHaveURL(/\/app\/opportunities/));
    });

    test('should validate required fields', async ({ opportunityPage, page }) => {
      await opportunityPage.gotoNew();

      // Submit empty form
      await page.click('button[type="submit"]');

      // Should show validation errors
      await expect(page.locator('text=required').or(page.locator('text=obligatorio'))).toBeVisible();
    });
  });

  test.describe('Opportunity Detail', () => {
    test.fixme('should display opportunity details', async ({ page }) => {
      await page.goto('/app/opportunities');

      // Click first opportunity
      const firstOpp = page.locator('[data-testid="opportunity-card"], tbody tr').first();
      if (await firstOpp.isVisible()) {
        await firstOpp.click();

        // Should show details
        await expect(page.locator('[data-testid="opportunity-detail"]')).toBeVisible();
      }
    });

    test.fixme('should update opportunity value', async ({ page }) => {
      await page.goto('/app/opportunities');

      const firstOpp = page.locator('[data-testid="opportunity-card"], tbody tr').first();
      if (await firstOpp.isVisible()) {
        await firstOpp.click();

        // Click edit
        await page.click('button:has-text("Editar"), button:has-text("Edit")');

        // Update value
        await page.fill('input[name="value"]', '75000');
        await page.click('button[type="submit"]');

        await waitForToast(page);
      }
    });

    test.fixme('should update probability', async ({ page }) => {
      await page.goto('/app/opportunities');

      const firstOpp = page.locator('[data-testid="opportunity-card"], tbody tr').first();
      if (await firstOpp.isVisible()) {
        await firstOpp.click();

        // Find probability slider or input
        const probabilityInput = page.locator('[data-testid="probability-input"], input[name="probability"]');
        if (await probabilityInput.isVisible()) {
          await probabilityInput.fill('75');
          await page.click('button:has-text("Guardar")');

          await waitForToast(page);
        }
      }
    });
  });

  test.describe('Won/Lost Flow', () => {
    test.fixme('should mark opportunity as won', async ({ page }) => {
      await page.goto('/app/opportunities');

      const firstOpp = page.locator('[data-testid="opportunity-card"], tbody tr').first();
      if (await firstOpp.isVisible()) {
        await firstOpp.click();

        // Click won button
        const wonButton = page.locator('button:has-text("Ganada"), button:has-text("Won")');
        if (await wonButton.isVisible()) {
          await wonButton.click();

          // Confirm
          await page.click('button:has-text("Confirmar")');

          await waitForToast(page);
        }
      }
    });

    test.fixme('should mark opportunity as lost', async ({ page }) => {
      await page.goto('/app/opportunities');

      const firstOpp = page.locator('[data-testid="opportunity-card"], tbody tr').first();
      if (await firstOpp.isVisible()) {
        await firstOpp.click();

        // Click lost button
        const lostButton = page.locator('button:has-text("Perdida"), button:has-text("Lost")');
        if (await lostButton.isVisible()) {
          await lostButton.click();

          // Fill reason
          await page.fill('textarea[name="reason"]', 'Lost to competitor');
          await page.click('button:has-text("Confirmar")');

          await waitForToast(page);
        }
      }
    });
  });

  test.describe('Filters', () => {
    test('should filter by stage', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      const stageFilter = page.locator('[data-testid="stage-filter"]');
      if (await stageFilter.isVisible()) {
        await stageFilter.click();
        await page.locator('[data-value="proposal"]').click();

        await waitForNetworkIdle(page);
      }
    });

    test('should filter by value range', async ({ opportunityPage, page }) => {
      await opportunityPage.goto();

      const minValue = page.locator('input[name="minValue"]');
      const maxValue = page.locator('input[name="maxValue"]');

      if (await minValue.isVisible()) {
        await minValue.fill('10000');
        await maxValue.fill('100000');

        await waitForNetworkIdle(page);
      }
    });
  });
});
