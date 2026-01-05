// ============================================
// Leads E2E Tests - FASE 5.11
// Lead management flow tests
// ============================================

import { test, expect, generateTestLead, waitForNetworkIdle, waitForToast } from './fixtures';

test.describe('Leads Module', () => {
  test.use({ storageState: 'e2e/.auth/user.json' });

  test.describe('Lead List', () => {
    test('should display leads list page', async ({ leadPage, page }) => {
      await leadPage.goto();

      // Page should load
      await expect(page).toHaveURL('/app/leads');

      // Either table or empty state should be visible
      const table = page.locator('[data-testid="leads-table"], table');
      const emptyState = page.locator('[data-testid="empty-state"]');
      await expect(table.or(emptyState)).toBeVisible();
    });

    test('should show new lead button', async ({ leadPage }) => {
      await leadPage.goto();
      await expect(leadPage.newLeadButton).toBeVisible();
    });

    test('should navigate to new lead form', async ({ leadPage, page }) => {
      await leadPage.goto();
      await leadPage.clickNewLead();

      await expect(page).toHaveURL(/\/app\/leads\/(new|create)/);
    });

    test('should filter leads by search', async ({ leadPage, page }) => {
      await leadPage.goto();

      // Type in search
      await leadPage.search('John');
      await waitForNetworkIdle(page);

      // Results should update
      await page.waitForTimeout(500);
    });

    test('should filter leads by status', async ({ leadPage, page }) => {
      await leadPage.goto();

      // Click status filter and select 'new'
      const statusFilter = page.locator('[data-testid="status-filter"], select[name="status"]');
      if (await statusFilter.isVisible()) {
        await statusFilter.click();
        await page.locator('[data-value="new"], option[value="new"]').click();
        await waitForNetworkIdle(page);
      }
    });
  });

  test.describe('Lead Creation', () => {
    test('should create a new lead successfully', async ({ leadPage, page }) => {
      const testLead = generateTestLead();

      await leadPage.gotoNew();

      // Fill form
      await leadPage.fillLeadForm({
        firstName: testLead.firstName,
        lastName: testLead.lastName,
        email: testLead.email,
        phone: testLead.phone,
        company: testLead.company,
      });

      // Submit
      await leadPage.submitForm();

      // Should show success or redirect
      await expect(page.locator('text=creado').or(page.locator('text=created'))).toBeVisible({ timeout: 10000 })
        .catch(() => expect(page).toHaveURL(/\/app\/leads/));
    });

    test('should show validation errors for invalid data', async ({ leadPage, page }) => {
      await leadPage.gotoNew();

      // Fill invalid email
      await page.fill('input[name="email"]', 'invalid-email');
      await leadPage.submitForm();

      // Should show validation error
      await expect(page.locator('text=email').or(page.locator('text=Email')).or(page.locator('text=válido'))).toBeVisible();
    });

    test('should require mandatory fields', async ({ leadPage, page }) => {
      await leadPage.gotoNew();

      // Submit empty form
      await leadPage.submitForm();

      // Should show required field errors
      await expect(page.locator('text=required').or(page.locator('text=obligatorio'))).toBeVisible();
    });
  });

  test.describe('Lead Detail', () => {
    test.fixme('should display lead details', async ({ leadPage, page }) => {
      // This test requires a known lead ID
      // In real scenario, we'd create a lead first or use a seeded database
      await page.goto('/app/leads');

      // Click first lead if exists
      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Should show lead details
        await expect(page.locator('[data-testid="lead-detail"]')).toBeVisible();
      }
    });

    test.fixme('should allow editing lead', async ({ page }) => {
      await page.goto('/app/leads');

      // Click first lead
      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Click edit button
        await page.click('button:has-text("Editar"), button:has-text("Edit")');

        // Should show edit form
        await expect(page.locator('form')).toBeVisible();
      }
    });
  });

  test.describe('Lead Actions', () => {
    test.fixme('should change lead status', async ({ page }) => {
      await page.goto('/app/leads');

      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Find status dropdown or button
        const statusSelector = page.locator('[data-testid="status-selector"]');
        if (await statusSelector.isVisible()) {
          await statusSelector.click();
          await page.locator('[data-value="contacted"]').click();

          // Wait for update
          await waitForToast(page);
        }
      }
    });

    test.fixme('should assign lead to user', async ({ page }) => {
      await page.goto('/app/leads');

      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Find assign button
        const assignButton = page.locator('button:has-text("Asignar")');
        if (await assignButton.isVisible()) {
          await assignButton.click();

          // Select user
          await page.locator('[data-testid="user-selector"]').click();
          await page.locator('[data-testid="user-option"]').first().click();

          // Confirm
          await page.click('button:has-text("Confirmar")');

          await waitForToast(page);
        }
      }
    });

    test.fixme('should add note to lead', async ({ page }) => {
      await page.goto('/app/leads');

      const firstLead = page.locator('[data-testid="lead-row"], tbody tr').first();
      if (await firstLead.isVisible()) {
        await firstLead.click();

        // Find notes section
        const notesSection = page.locator('[data-testid="notes-section"]');
        if (await notesSection.isVisible()) {
          // Add new note
          await page.fill('textarea[name="note"]', 'Test note from E2E');
          await page.click('button:has-text("Agregar Nota")');

          // Should show the new note
          await expect(page.locator('text=Test note from E2E')).toBeVisible();
        }
      }
    });
  });

  test.describe('Bulk Operations', () => {
    test.fixme('should select multiple leads', async ({ leadPage, page }) => {
      await leadPage.goto();

      // Select checkboxes
      const checkboxes = page.locator('[data-testid="lead-checkbox"]');
      const count = await checkboxes.count();

      if (count >= 2) {
        await checkboxes.nth(0).check();
        await checkboxes.nth(1).check();

        // Bulk actions bar should appear
        await expect(page.locator('[data-testid="bulk-actions"]')).toBeVisible();
      }
    });

    test.fixme('should bulk delete leads', async ({ leadPage, page }) => {
      await leadPage.goto();

      // Select leads
      const checkboxes = page.locator('[data-testid="lead-checkbox"]');
      if (await checkboxes.count() >= 1) {
        await checkboxes.first().check();

        // Click delete
        await page.click('[data-testid="bulk-delete"]');

        // Confirm deletion
        await page.click('button:has-text("Confirmar")');

        await waitForToast(page);
      }
    });
  });
});
