/**
 * Proposal Template Service
 * Manages PDF layout and styling templates for quotes/proposals
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  ProposalTemplate,
  ProposalSection,
  ProposalStyles,
  CreateProposalTemplateInput,
  UpdateProposalTemplateInput,
  DEFAULT_SECTIONS,
  DEFAULT_DARK_STYLES,
} from './types.js';
import { getPdfServiceConfig } from '../../config/environment.js';

/**
 * Proposal Template Service
 * Handles CRUD operations for PDF layout/styling templates
 */
@injectable()
export class ProposalTemplateService {
  constructor(private pool: DatabasePool) {}

  /**
   * Create a new proposal template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    input: CreateProposalTemplateInput
  ): Promise<Result<ProposalTemplate>> {
    try {
      // If setting as default, unset any existing default first
      if (input.isDefault) {
        await this.unsetDefaultTemplate(tenantId);
      }

      const query = `
        INSERT INTO proposal_templates (
          tenant_id, name, description, is_default, is_active,
          sections, styles, created_by, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, true, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        tenantId,
        input.name,
        input.description || null,
        input.isDefault || false,
        JSON.stringify(input.sections),
        JSON.stringify(input.styles),
        userId,
      ]);

      if (!result.isSuccess || !result.value?.rows?.[0]) {
        return Result.fail('Failed to create proposal template');
      }

      return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
    } catch (error) {
      console.error('Error creating proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get a proposal template by ID
   */
  async getTemplate(
    tenantId: string,
    templateId: string
  ): Promise<Result<ProposalTemplate | null>> {
    try {
      const query = `
        SELECT * FROM proposal_templates
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [templateId, tenantId]);

      if (!result.isSuccess) {
        return Result.fail('Failed to fetch proposal template');
      }

      const row = result.value?.rows?.[0];
      if (!row) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToTemplate(row));
    } catch (error) {
      console.error('Error fetching proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * List all proposal templates for a tenant
   */
  async listTemplates(
    tenantId: string,
    options: { includeInactive?: boolean } = {}
  ): Promise<Result<ProposalTemplate[]>> {
    try {
      let query = `
        SELECT * FROM proposal_templates
        WHERE tenant_id = $1
      `;

      if (!options.includeInactive) {
        query += ` AND is_active = true`;
      }

      query += ` ORDER BY is_default DESC, name ASC`;

      const result = await this.pool.query(query, [tenantId]);

      if (!result.isSuccess) {
        return Result.fail('Failed to list proposal templates');
      }

      const templates = (result.value?.rows || []).map((row: Record<string, unknown>) =>
        this.mapRowToTemplate(row)
      );

      return Result.ok(templates);
    } catch (error) {
      console.error('Error listing proposal templates:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get the default template for a tenant
   * Creates one if none exists
   */
  async getDefaultTemplate(
    tenantId: string,
    userId: string
  ): Promise<Result<ProposalTemplate>> {
    try {
      const query = `
        SELECT * FROM proposal_templates
        WHERE tenant_id = $1 AND is_default = true AND is_active = true
        LIMIT 1
      `;

      const result = await this.pool.query(query, [tenantId]);

      if (result.isSuccess && result.value?.rows?.[0]) {
        return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
      }

      // No default template exists, create one
      return this.createTemplate(tenantId, userId, {
        name: 'Plantilla Predeterminada',
        description: 'Plantilla de propuesta profesional con tema oscuro',
        sections: DEFAULT_SECTIONS,
        styles: DEFAULT_DARK_STYLES,
        isDefault: true,
      });
    } catch (error) {
      console.error('Error getting default proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Update a proposal template
   */
  async updateTemplate(
    tenantId: string,
    templateId: string,
    userId: string,
    input: UpdateProposalTemplateInput
  ): Promise<Result<ProposalTemplate>> {
    try {
      // If setting as default, unset any existing default first
      if (input.isDefault === true) {
        await this.unsetDefaultTemplate(tenantId, templateId);
      }

      const updates: string[] = [];
      const values: (string | boolean | null)[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }

      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }

      if (input.sections !== undefined) {
        updates.push(`sections = $${paramIndex++}`);
        values.push(JSON.stringify(input.sections));
      }

      if (input.styles !== undefined) {
        updates.push(`styles = $${paramIndex++}`);
        values.push(JSON.stringify(input.styles));
      }

      if (input.isDefault !== undefined) {
        updates.push(`is_default = $${paramIndex++}`);
        values.push(input.isDefault);
      }

      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }

      // Always update audit fields
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(userId);
      updates.push(`updated_at = NOW()`);

      if (updates.length === 2) {
        // Only audit fields, nothing to update
        const existingResult = await this.getTemplate(tenantId, templateId);
        if (existingResult.isSuccess && existingResult.value) {
          return Result.ok(existingResult.value);
        }
        return Result.fail('Template not found');
      }

      // Add WHERE clause parameters
      values.push(templateId);
      values.push(tenantId);

      const query = `
        UPDATE proposal_templates
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (!result.isSuccess || !result.value?.rows?.[0]) {
        return Result.fail('Failed to update proposal template');
      }

      return Result.ok(this.mapRowToTemplate(result.value.rows[0]));
    } catch (error) {
      console.error('Error updating proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Delete a proposal template (soft delete)
   */
  async deleteTemplate(
    tenantId: string,
    templateId: string
  ): Promise<Result<void>> {
    try {
      // Check if it's the default template
      const checkQuery = `
        SELECT is_default FROM proposal_templates
        WHERE id = $1 AND tenant_id = $2
      `;
      const checkResult = await this.pool.query(checkQuery, [templateId, tenantId]);

      if (checkResult.isSuccess && checkResult.value?.rows?.[0]?.is_default) {
        return Result.fail('Cannot delete the default template. Set another template as default first.');
      }

      // Soft delete by setting is_active = false
      const query = `
        UPDATE proposal_templates
        SET is_active = false, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [templateId, tenantId]);

      if (!result.isSuccess) {
        return Result.fail('Failed to delete proposal template');
      }

      return Result.ok(undefined);
    } catch (error) {
      console.error('Error deleting proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Duplicate a proposal template
   */
  async duplicateTemplate(
    tenantId: string,
    templateId: string,
    userId: string,
    newName?: string
  ): Promise<Result<ProposalTemplate>> {
    try {
      const existing = await this.getTemplate(tenantId, templateId);

      if (!existing.isSuccess || !existing.value) {
        return Result.fail('Template not found');
      }

      const template = existing.value;
      const duplicateName = newName || `${template.name} (Copia)`;

      return this.createTemplate(tenantId, userId, {
        name: duplicateName,
        description: template.description || undefined,
        sections: template.sections,
        styles: template.styles,
        isDefault: false,
      });
    } catch (error) {
      console.error('Error duplicating proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Set a template as the default for the tenant
   */
  async setDefaultTemplate(
    tenantId: string,
    templateId: string,
    userId: string
  ): Promise<Result<ProposalTemplate>> {
    try {
      // Unset any existing default
      await this.unsetDefaultTemplate(tenantId, templateId);

      // Set the new default
      return this.updateTemplate(tenantId, templateId, userId, { isDefault: true });
    } catch (error) {
      console.error('Error setting default proposal template:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Update template thumbnail
   */
  async updateThumbnail(
    tenantId: string,
    templateId: string,
    thumbnail: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE proposal_templates
        SET thumbnail = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;

      const result = await this.pool.query(query, [thumbnail, templateId, tenantId]);

      if (!result.isSuccess) {
        return Result.fail('Failed to update thumbnail');
      }

      return Result.ok(undefined);
    } catch (error) {
      console.error('Error updating template thumbnail:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Generate a preview PDF for a template with sample data
   */
  async generatePreview(
    tenantId: string,
    templateId: string,
    previewType: 'thumbnail' | 'full' = 'thumbnail'
  ): Promise<Result<Buffer>> {
    try {
      const templateResult = await this.getTemplate(tenantId, templateId);
      if (!templateResult.isSuccess || !templateResult.value) {
        return Result.fail('Template not found');
      }

      const template = templateResult.value;
      const pdfConfig = getPdfServiceConfig();

      if (!pdfConfig.isEnabled) {
        return Result.fail('PDF service is not configured');
      }

      // Sample quote data for preview
      const sampleQuote = this.getSampleQuoteData();

      // Call PDF service with template configuration
      const response = await fetch(`${pdfConfig.url}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quote: sampleQuote,
          tenant: { name: 'Preview Company', logoUrl: null },
          sections: template.sections,
          styles: template.styles,
          previewMode: previewType === 'thumbnail',
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        return Result.fail(`PDF generation failed: ${error}`);
      }

      const pdfBuffer = Buffer.from(await response.arrayBuffer());
      return Result.ok(pdfBuffer);
    } catch (error) {
      console.error('Error generating template preview:', error);
      return Result.fail(error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Get sample quote data for preview
   */
  private getSampleQuoteData() {
    return {
      quoteNumber: 'Q-2025-00001',
      title: 'Propuesta de Servicios - Proyecto Demo',
      clientName: 'Empresa Demo S.A. de C.V.',
      clientEmail: 'contacto@empresa-demo.com',
      clientAddress: 'Av. Ejemplo 123, Col. Centro, CDMX 06000',
      createdAt: new Date().toISOString(),
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      currency: 'MXN',
      lineItems: [
        {
          id: '1',
          name: 'Desarrollo de Aplicacion Web',
          description: 'Diseno y desarrollo de plataforma web personalizada',
          quantity: 1,
          unitPrice: 8500000, // $85,000 MXN in cents
          tax: 16,
          taxable: true,
        },
        {
          id: '2',
          name: 'Configuracion de Infraestructura Cloud',
          description: 'AWS/GCP setup con alta disponibilidad',
          quantity: 1,
          unitPrice: 2500000, // $25,000 MXN in cents
          tax: 16,
          taxable: true,
        },
        {
          id: '3',
          name: 'Soporte y Mantenimiento (6 meses)',
          description: 'Soporte tecnico y actualizaciones menores',
          quantity: 6,
          unitPrice: 500000, // $5,000 MXN per month in cents
          tax: 16,
          taxable: true,
        },
      ],
      subtotal: 14000000, // $140,000 MXN in cents
      taxTotal: 2240000,  // $22,400 MXN in cents
      discount: 0,
      total: 16240000,    // $162,400 MXN in cents
      terms: 'Terminos y condiciones estandar aplican. Pago a 30 dias.',
      notes: 'Propuesta valida por 30 dias.',
    };
  }

  /**
   * Unset the current default template
   */
  private async unsetDefaultTemplate(
    tenantId: string,
    exceptTemplateId?: string
  ): Promise<void> {
    let query = `
      UPDATE proposal_templates
      SET is_default = false, updated_at = NOW()
      WHERE tenant_id = $1 AND is_default = true
    `;
    const params: string[] = [tenantId];

    if (exceptTemplateId) {
      query += ` AND id != $2`;
      params.push(exceptTemplateId);
    }

    await this.pool.query(query, params);
  }

  /**
   * Map database row to ProposalTemplate
   */
  private mapRowToTemplate(row: Record<string, unknown>): ProposalTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | null,
      isDefault: row.is_default as boolean,
      isActive: row.is_active as boolean,
      sections: (typeof row.sections === 'string'
        ? JSON.parse(row.sections)
        : row.sections) as ProposalSection[],
      styles: (typeof row.styles === 'string'
        ? JSON.parse(row.styles)
        : row.styles) as ProposalStyles,
      thumbnail: row.thumbnail as string | null,
      createdBy: row.created_by as string,
      updatedBy: row.updated_by as string | null,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
