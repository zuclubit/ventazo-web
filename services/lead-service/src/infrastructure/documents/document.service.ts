/**
 * Document Management Service
 *
 * Comprehensive document and template management
 * Refactored to use DatabasePool with pool.query() pattern
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { v4 as uuidv4 } from 'uuid';
import {
  DocumentTemplate,
  Document,
  DocumentSignature,
  DocumentActivity,
  DocumentFolder,
  DocumentDashboard,
  CreateTemplateInput,
  UpdateTemplateInput,
  GenerateDocumentInput,
  CreateDocumentInput,
  UpdateDocumentInput,
  SendDocumentInput,
  TemplateSearchFilters,
  DocumentSearchFilters,
  TemplateSearchResult,
  DocumentSearchResult,
  BulkDocumentOperation,
  BulkOperationResult,
  CloneTemplateInput,
  DocumentType,
  DocumentStatus,
  TemplateStatus,
  SignatureStatus,
  MergeFieldDefinition,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';

// Row types for database results
interface DocumentTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  format: string;
  content: string;
  header_content?: string;
  footer_content?: string;
  css_styles?: string;
  page_size: string;
  orientation: string;
  margins?: any;
  merge_fields?: any;
  conditional_sections?: any;
  has_cover_page: boolean;
  cover_page_content?: string;
  requires_signature: boolean;
  signature_fields?: any;
  logo_url?: string;
  brand_color?: string;
  font_family?: string;
  requires_approval: boolean;
  approver_ids?: string[];
  version: number;
  parent_template_id?: string;
  folder_id?: string;
  tags: string[];
  usage_count: number;
  last_used_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string;
}

interface DocumentRow {
  id: string;
  tenant_id: string;
  template_id?: string;
  template_name?: string;
  template_version?: number;
  name: string;
  description?: string;
  type: string;
  status: string;
  format: string;
  content: string;
  pdf_url?: string;
  storage_key?: string;
  entity_type?: string;
  entity_id?: string;
  entity_name?: string;
  deal_id?: string;
  quote_id?: string;
  contact_id?: string;
  customer_id?: string;
  recipient_email?: string;
  recipient_name?: string;
  amount?: number;
  currency: string;
  expires_at?: Date;
  valid_until?: Date;
  approval_status?: string;
  approved_by?: string;
  approved_at?: Date;
  rejection_reason?: string;
  signature_status: string;
  signature_provider?: string;
  signature_document_id?: string;
  sent_at?: Date;
  viewed_at?: Date;
  view_count: number;
  last_viewed_at?: Date;
  download_count: number;
  last_downloaded_at?: Date;
  version: number;
  previous_version_id?: string;
  merge_data?: any;
  metadata?: any;
  tags: string[];
  created_at: Date;
  updated_at: Date;
  created_by: string;
  updated_by?: string;
  owner_id: string;
  owner_name?: string;
}

interface DocumentSignatureRow {
  id: string;
  document_id: string;
  tenant_id: string;
  signer_id?: string;
  signer_email: string;
  signer_name?: string;
  signer_type: string;
  status: string;
  signed_at?: Date;
  ip_address?: string;
  signature_image_url?: string;
  decline_reason?: string;
  order_num: number;
  created_at: Date;
  updated_at: Date;
}

interface DocumentActivityRow {
  id: string;
  document_id: string;
  tenant_id: string;
  type: string;
  description: string;
  actor_id?: string;
  actor_name?: string;
  actor_email?: string;
  recipient_email?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: Date;
}

interface DocumentFolderRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  parent_id?: string;
  display_order: number;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

@injectable()
export class DocumentService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(private pool: DatabasePool) {
    this.initializeEmailProvider();
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
      }
    }
  }

  // ============================================================================
  // Template CRUD Operations
  // ============================================================================

  async createTemplate(
    tenantId: string,
    input: CreateTemplateInput,
    userId: string
  ): Promise<Result<DocumentTemplate>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const mergeFields = (input.mergeFields || []).map((f) => ({
        ...f,
        id: uuidv4(),
      }));

      const conditionalSections = (input.conditionalSections || []).map((s) => ({
        ...s,
        id: uuidv4(),
      }));

      const signatureFields = (input.signatureFields || []).map((f) => ({
        ...f,
        id: uuidv4(),
      }));

      const result = await this.pool.query<DocumentTemplateRow>(`
        INSERT INTO document_templates (
          id, tenant_id, name, description, type, status, format, content,
          header_content, footer_content, css_styles, page_size, orientation,
          margins, merge_fields, conditional_sections, has_cover_page, cover_page_content,
          requires_signature, signature_fields, logo_url, brand_color, font_family,
          requires_approval, approver_ids, folder_id, tags, version, usage_count,
          created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 1, 0, $27, $27, $28
        ) RETURNING *
      `, [
        id, tenantId, input.name, input.description, input.type, input.format || 'html',
        input.content, input.headerContent, input.footerContent, input.cssStyles,
        input.pageSize || 'letter', input.orientation || 'portrait',
        JSON.stringify(input.margins), JSON.stringify(mergeFields), JSON.stringify(conditionalSections),
        input.hasCoverPage || false, input.coverPageContent,
        input.requiresSignature || false, JSON.stringify(signatureFields),
        input.logoUrl, input.brandColor, input.fontFamily,
        input.requiresApproval || false, input.approverIds || [],
        input.folderId, input.tags || [], now, userId
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to create template');
      }

      const row = result.getValue().rows[0];
      return Result.ok(this.mapRowToTemplate(row));
    } catch (error) {
      return Result.fail(`Failed to create template: ${error}`);
    }
  }

  async getTemplate(tenantId: string, templateId: string): Promise<Result<DocumentTemplate>> {
    try {
      const result = await this.pool.query<DocumentTemplateRow>(`
        SELECT * FROM document_templates
        WHERE id = $1 AND tenant_id = $2
      `, [templateId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Template not found');
      }

      return Result.ok(this.mapRowToTemplate(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get template: ${error}`);
    }
  }

  async updateTemplate(
    tenantId: string,
    templateId: string,
    input: UpdateTemplateInput,
    userId: string
  ): Promise<Result<DocumentTemplate>> {
    try {
      const updates: string[] = ['updated_at = NOW()', 'updated_by = $3'];
      const values: any[] = [templateId, tenantId, userId];
      let paramIndex = 4;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      if (input.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(input.content);
        updates.push('version = version + 1');
      }
      if (input.headerContent !== undefined) {
        updates.push(`header_content = $${paramIndex++}`);
        values.push(input.headerContent);
      }
      if (input.footerContent !== undefined) {
        updates.push(`footer_content = $${paramIndex++}`);
        values.push(input.footerContent);
      }
      if (input.cssStyles !== undefined) {
        updates.push(`css_styles = $${paramIndex++}`);
        values.push(input.cssStyles);
      }
      if (input.pageSize !== undefined) {
        updates.push(`page_size = $${paramIndex++}`);
        values.push(input.pageSize);
      }
      if (input.orientation !== undefined) {
        updates.push(`orientation = $${paramIndex++}`);
        values.push(input.orientation);
      }
      if (input.margins !== undefined) {
        updates.push(`margins = $${paramIndex++}`);
        values.push(JSON.stringify(input.margins));
      }
      if (input.mergeFields !== undefined) {
        updates.push(`merge_fields = $${paramIndex++}`);
        values.push(JSON.stringify(input.mergeFields.map((f) => ({ ...f, id: uuidv4() }))));
      }
      if (input.conditionalSections !== undefined) {
        updates.push(`conditional_sections = $${paramIndex++}`);
        values.push(JSON.stringify(input.conditionalSections.map((s) => ({ ...s, id: uuidv4() }))));
      }
      if (input.hasCoverPage !== undefined) {
        updates.push(`has_cover_page = $${paramIndex++}`);
        values.push(input.hasCoverPage);
      }
      if (input.coverPageContent !== undefined) {
        updates.push(`cover_page_content = $${paramIndex++}`);
        values.push(input.coverPageContent);
      }
      if (input.requiresSignature !== undefined) {
        updates.push(`requires_signature = $${paramIndex++}`);
        values.push(input.requiresSignature);
      }
      if (input.signatureFields !== undefined) {
        updates.push(`signature_fields = $${paramIndex++}`);
        values.push(JSON.stringify(input.signatureFields.map((f) => ({ ...f, id: uuidv4() }))));
      }
      if (input.logoUrl !== undefined) {
        updates.push(`logo_url = $${paramIndex++}`);
        values.push(input.logoUrl);
      }
      if (input.brandColor !== undefined) {
        updates.push(`brand_color = $${paramIndex++}`);
        values.push(input.brandColor);
      }
      if (input.fontFamily !== undefined) {
        updates.push(`font_family = $${paramIndex++}`);
        values.push(input.fontFamily);
      }
      if (input.requiresApproval !== undefined) {
        updates.push(`requires_approval = $${paramIndex++}`);
        values.push(input.requiresApproval);
      }
      if (input.approverIds !== undefined) {
        updates.push(`approver_ids = $${paramIndex++}`);
        values.push(input.approverIds);
      }
      if (input.folderId !== undefined) {
        updates.push(`folder_id = $${paramIndex++}`);
        values.push(input.folderId);
      }
      if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(input.tags);
      }

      const result = await this.pool.query<DocumentTemplateRow>(`
        UPDATE document_templates
        SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, values);

      if (result.isFailure) {
        return Result.fail(result.error || 'Update failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Template not found');
      }

      return Result.ok(this.mapRowToTemplate(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update template: ${error}`);
    }
  }

  async deleteTemplate(tenantId: string, templateId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(`
        DELETE FROM document_templates
        WHERE id = $1 AND tenant_id = $2
      `, [templateId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Delete failed');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete template: ${error}`);
    }
  }

  async searchTemplates(
    tenantId: string,
    filters: TemplateSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<TemplateSearchResult>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.type && filters.type.length > 0) {
        conditions.push(`type = ANY($${paramIndex++})`);
        values.push(filters.type);
      }
      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex++})`);
        values.push(filters.status);
      }
      if (filters.folderId) {
        conditions.push(`folder_id = $${paramIndex++}`);
        values.push(filters.folderId);
      }
      if (filters.createdBy) {
        conditions.push(`created_by = $${paramIndex++}`);
        values.push(filters.createdBy);
      }
      if (filters.requiresSignature !== undefined) {
        conditions.push(`requires_signature = $${paramIndex++}`);
        values.push(filters.requiresSignature);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM document_templates WHERE ${whereClause}
      `, values);

      if (countResult.isFailure) {
        return Result.fail(countResult.error || 'Count query failed');
      }

      const total = parseInt(countResult.getValue().rows[0]?.count || '0', 10);

      // Get paginated results
      const result = await this.pool.query<DocumentTemplateRow>(`
        SELECT * FROM document_templates
        WHERE ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, [...values, limit, offset]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;

      return Result.ok({
        templates: rows.map((row) => this.mapRowToTemplate(row)),
        total,
        page,
        limit,
        hasMore: offset + rows.length < total,
      });
    } catch (error) {
      return Result.fail(`Failed to search templates: ${error}`);
    }
  }

  async cloneTemplate(
    tenantId: string,
    templateId: string,
    input: CloneTemplateInput,
    userId: string
  ): Promise<Result<DocumentTemplate>> {
    try {
      const templateResult = await this.getTemplate(tenantId, templateId);
      if (templateResult.isFailure) {
        return Result.fail(templateResult.error!);
      }

      const template = templateResult.getValue();
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<DocumentTemplateRow>(`
        INSERT INTO document_templates (
          id, tenant_id, name, description, type, status, format, content,
          header_content, footer_content, css_styles, page_size, orientation,
          margins, merge_fields, conditional_sections, has_cover_page, cover_page_content,
          requires_signature, signature_fields, logo_url, brand_color, font_family,
          requires_approval, approver_ids, folder_id, tags, version, parent_template_id,
          usage_count, created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, 1, $27, 0, $28, $28, $29
        ) RETURNING *
      `, [
        id, tenantId, input.name || `${template.name} (Copy)`, input.description || template.description,
        template.type, template.format, template.content, template.headerContent, template.footerContent,
        template.cssStyles, template.pageSize, template.orientation, JSON.stringify(template.margins),
        JSON.stringify(template.mergeFields), JSON.stringify(template.conditionalSections),
        template.hasCoverPage, template.coverPageContent, template.requiresSignature,
        JSON.stringify(template.signatureFields), template.logoUrl, template.brandColor, template.fontFamily,
        template.requiresApproval, template.approverIds, input.folderId || template.folderId,
        template.tags, templateId, now, userId
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Clone failed');
      }

      return Result.ok(this.mapRowToTemplate(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to clone template: ${error}`);
    }
  }

  // ============================================================================
  // Document CRUD Operations
  // ============================================================================

  async generateDocument(
    tenantId: string,
    input: GenerateDocumentInput,
    userId: string
  ): Promise<Result<Document>> {
    try {
      const templateResult = await this.getTemplate(tenantId, input.templateId);
      if (templateResult.isFailure) {
        return Result.fail(templateResult.error!);
      }

      const template = templateResult.getValue();
      const mergedContent = this.mergeTemplateContent(
        template.content,
        input.mergeData || {},
        template.mergeFields
      );

      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<DocumentRow>(`
        INSERT INTO documents (
          id, tenant_id, template_id, template_name, template_version, name, description,
          type, status, format, content, entity_type, entity_id, deal_id, quote_id,
          contact_id, customer_id, recipient_email, recipient_name, amount, currency,
          expires_at, valid_until, signature_status, version, merge_data, metadata, tags,
          owner_id, view_count, download_count, created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, 1, $24, $25, $26, $27, 0, 0, $28, $28, $27
        ) RETURNING *
      `, [
        id, tenantId, template.id, template.name, template.version,
        input.name || `${template.name} - ${new Date().toLocaleDateString()}`,
        input.description, template.type, template.format, mergedContent,
        input.entityType, input.entityId, input.dealId, input.quoteId,
        input.contactId, input.customerId, input.recipientEmail, input.recipientName,
        input.amount, input.currency || 'USD', input.expiresAt, input.validUntil,
        template.requiresSignature ? 'pending' : 'not_required',
        JSON.stringify(input.mergeData || {}), JSON.stringify(input.metadata || {}),
        input.tags || [], userId, now
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Generate document failed');
      }

      // Update template usage count
      await this.pool.query(`
        UPDATE document_templates
        SET usage_count = usage_count + 1, last_used_at = NOW()
        WHERE id = $1
      `, [template.id]);

      // Log activity
      await this.logActivity(tenantId, id, 'created', 'Document created from template', userId);

      return Result.ok(this.mapRowToDocument(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to generate document: ${error}`);
    }
  }

  async createDocument(
    tenantId: string,
    input: CreateDocumentInput,
    userId: string
  ): Promise<Result<Document>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<DocumentRow>(`
        INSERT INTO documents (
          id, tenant_id, name, description, type, status, format, content,
          entity_type, entity_id, deal_id, quote_id, contact_id, customer_id,
          recipient_email, recipient_name, amount, currency, expires_at, valid_until,
          signature_status, version, metadata, tags, owner_id, view_count, download_count,
          created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
          $16, $17, $18, $19, $20, 1, $21, $22, $23, 0, 0, $24, $24, $23
        ) RETURNING *
      `, [
        id, tenantId, input.name, input.description, input.type, input.format || 'html',
        input.content, input.entityType, input.entityId, input.dealId, input.quoteId,
        input.contactId, input.customerId, input.recipientEmail, input.recipientName,
        input.amount, input.currency || 'USD', input.expiresAt, input.validUntil,
        input.requiresSignature ? 'pending' : 'not_required',
        JSON.stringify(input.metadata || {}), input.tags || [], userId, now
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Create document failed');
      }

      await this.logActivity(tenantId, id, 'created', 'Document created', userId);

      return Result.ok(this.mapRowToDocument(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create document: ${error}`);
    }
  }

  async getDocument(tenantId: string, documentId: string): Promise<Result<Document>> {
    try {
      const result = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents WHERE id = $1 AND tenant_id = $2
      `, [documentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Document not found');
      }

      // Get signatures
      const sigResult = await this.pool.query<DocumentSignatureRow>(`
        SELECT * FROM document_signatures WHERE document_id = $1
      `, [documentId]);

      const doc = this.mapRowToDocument(rows[0]);
      if (sigResult.isSuccess) {
        doc.signatures = sigResult.getValue().rows.map((s) => this.mapRowToSignature(s));
      }

      return Result.ok(doc);
    } catch (error) {
      return Result.fail(`Failed to get document: ${error}`);
    }
  }

  async updateDocument(
    tenantId: string,
    documentId: string,
    input: UpdateDocumentInput,
    userId: string
  ): Promise<Result<Document>> {
    try {
      const updates: string[] = ['updated_at = NOW()', 'updated_by = $3'];
      const values: any[] = [documentId, tenantId, userId];
      let paramIndex = 4;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
      }
      if (input.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(input.content);
      }
      if (input.recipientEmail !== undefined) {
        updates.push(`recipient_email = $${paramIndex++}`);
        values.push(input.recipientEmail);
      }
      if (input.recipientName !== undefined) {
        updates.push(`recipient_name = $${paramIndex++}`);
        values.push(input.recipientName);
      }
      if (input.amount !== undefined) {
        updates.push(`amount = $${paramIndex++}`);
        values.push(input.amount);
      }
      if (input.currency !== undefined) {
        updates.push(`currency = $${paramIndex++}`);
        values.push(input.currency);
      }
      if (input.expiresAt !== undefined) {
        updates.push(`expires_at = $${paramIndex++}`);
        values.push(input.expiresAt);
      }
      if (input.validUntil !== undefined) {
        updates.push(`valid_until = $${paramIndex++}`);
        values.push(input.validUntil);
      }
      if (input.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(input.metadata));
      }
      if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(input.tags);
      }

      const result = await this.pool.query<DocumentRow>(`
        UPDATE documents
        SET ${updates.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, values);

      if (result.isFailure) {
        return Result.fail(result.error || 'Update failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Document not found');
      }

      await this.logActivity(tenantId, documentId, 'updated', 'Document updated', userId);

      return Result.ok(this.mapRowToDocument(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update document: ${error}`);
    }
  }

  async deleteDocument(tenantId: string, documentId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(`
        DELETE FROM documents WHERE id = $1 AND tenant_id = $2
      `, [documentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Delete failed');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete document: ${error}`);
    }
  }

  async searchDocuments(
    tenantId: string,
    filters: DocumentSearchFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<DocumentSearchResult>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR recipient_name ILIKE $${paramIndex} OR recipient_email ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.type && filters.type.length > 0) {
        conditions.push(`type = ANY($${paramIndex++})`);
        values.push(filters.type);
      }
      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex++})`);
        values.push(filters.status);
      }
      if (filters.entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        values.push(filters.entityType);
      }
      if (filters.entityId) {
        conditions.push(`entity_id = $${paramIndex++}`);
        values.push(filters.entityId);
      }
      if (filters.dealId) {
        conditions.push(`deal_id = $${paramIndex++}`);
        values.push(filters.dealId);
      }
      if (filters.contactId) {
        conditions.push(`contact_id = $${paramIndex++}`);
        values.push(filters.contactId);
      }
      if (filters.customerId) {
        conditions.push(`customer_id = $${paramIndex++}`);
        values.push(filters.customerId);
      }
      if (filters.ownerId) {
        conditions.push(`owner_id = $${paramIndex++}`);
        values.push(filters.ownerId);
      }
      if (filters.templateId) {
        conditions.push(`template_id = $${paramIndex++}`);
        values.push(filters.templateId);
      }
      if (filters.signatureStatus && filters.signatureStatus.length > 0) {
        conditions.push(`signature_status = ANY($${paramIndex++})`);
        values.push(filters.signatureStatus);
      }
      if (filters.createdAfter) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(filters.createdAfter);
      }
      if (filters.createdBefore) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(filters.createdBefore);
      }
      if (filters.expiringBefore) {
        conditions.push(`expires_at <= $${paramIndex++}`);
        values.push(filters.expiringBefore);
      }
      if (filters.minAmount !== undefined) {
        conditions.push(`amount >= $${paramIndex++}`);
        values.push(filters.minAmount);
      }
      if (filters.maxAmount !== undefined) {
        conditions.push(`amount <= $${paramIndex++}`);
        values.push(filters.maxAmount);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM documents WHERE ${whereClause}
      `, values);

      if (countResult.isFailure) {
        return Result.fail(countResult.error || 'Count query failed');
      }

      const total = parseInt(countResult.getValue().rows[0]?.count || '0', 10);

      // Get paginated results
      const result = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, [...values, limit, offset]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;

      // Get aggregations
      const typeAggResult = await this.pool.query<{ type: string; count: string }>(`
        SELECT type, COUNT(*) as count FROM documents WHERE ${whereClause} GROUP BY type
      `, values);

      const statusAggResult = await this.pool.query<{ status: string; count: string }>(`
        SELECT status, COUNT(*) as count FROM documents WHERE ${whereClause} GROUP BY status
      `, values);

      const totalValueResult = await this.pool.query<{ total: string }>(`
        SELECT COALESCE(SUM(amount), 0) as total FROM documents WHERE ${whereClause}
      `, values);

      return Result.ok({
        documents: rows.map((row) => this.mapRowToDocument(row)),
        total,
        page,
        limit,
        hasMore: offset + rows.length < total,
        aggregations: {
          byType: typeAggResult.isSuccess
            ? typeAggResult.getValue().rows.map((r) => ({ type: r.type as DocumentType, count: parseInt(r.count, 10) }))
            : [],
          byStatus: statusAggResult.isSuccess
            ? statusAggResult.getValue().rows.map((r) => ({ status: r.status as DocumentStatus, count: parseInt(r.count, 10) }))
            : [],
          totalValue: totalValueResult.isSuccess
            ? parseFloat(totalValueResult.getValue().rows[0]?.total || '0')
            : 0,
        },
      });
    } catch (error) {
      return Result.fail(`Failed to search documents: ${error}`);
    }
  }

  async sendDocument(
    tenantId: string,
    documentId: string,
    input: SendDocumentInput,
    userId: string
  ): Promise<Result<Document>> {
    try {
      const now = new Date();
      let expiresAt: Date | null = null;

      if (input.expiresInDays) {
        expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + input.expiresInDays);
      }

      const result = await this.pool.query<DocumentRow>(`
        UPDATE documents
        SET status = 'sent', recipient_email = $3, recipient_name = $4,
            sent_at = $5, expires_at = COALESCE($6, expires_at),
            updated_at = NOW(), updated_by = $7
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [documentId, tenantId, input.recipientEmail, input.recipientName, now, expiresAt, userId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Send failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Document not found');
      }

      await this.logActivity(
        tenantId,
        documentId,
        'sent',
        `Document sent to ${input.recipientEmail}`,
        userId,
        undefined,
        input.recipientEmail
      );

      // Send email notification with document
      const document = this.mapRowToDocument(rows[0]);
      if (this.emailProvider && input.recipientEmail) {
        try {
          const appConfig = getAppConfig();
          await this.emailProvider.send({
            to: input.recipientEmail,
            subject: `Documento: ${document.name}`,
            template: EmailTemplate.DOCUMENT_SENT,
            variables: {
              recipientName: input.recipientName || 'Estimado/a',
              documentName: document.name,
              documentType: document.type,
              senderName: document.createdBy || 'El equipo',
              expiresAt: expiresAt ? expiresAt.toLocaleDateString('es-ES') : 'Sin fecha de expiración',
              actionUrl: `${appConfig.appUrl}/documents/view/${documentId}`,
              message: input.message || '',
              requiresSignature: document.requiresSignature ? 'Sí' : 'No',
            },
            tags: [
              { name: 'type', value: 'document-sent' },
              { name: 'documentId', value: documentId },
            ],
          });
          console.log(`[DocumentService] Document email sent to ${input.recipientEmail}`);
        } catch (emailError) {
          console.error('[DocumentService] Failed to send document email:', emailError);
        }
      }

      return Result.ok(document);
    } catch (error) {
      return Result.fail(`Failed to send document: ${error}`);
    }
  }

  async recordView(
    tenantId: string,
    documentId: string,
    viewerEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Result<void>> {
    try {
      await this.pool.query(`
        UPDATE documents
        SET view_count = view_count + 1, last_viewed_at = NOW(),
            viewed_at = COALESCE(viewed_at, NOW()),
            status = CASE WHEN status = 'sent' THEN 'viewed' ELSE status END,
            updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [documentId, tenantId]);

      await this.logActivity(
        tenantId,
        documentId,
        'viewed',
        viewerEmail ? `Document viewed by ${viewerEmail}` : 'Document viewed',
        undefined,
        undefined,
        viewerEmail,
        ipAddress,
        userAgent
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record view: ${error}`);
    }
  }

  async recordDownload(
    tenantId: string,
    documentId: string,
    userId?: string,
    email?: string
  ): Promise<Result<void>> {
    try {
      await this.pool.query(`
        UPDATE documents
        SET download_count = download_count + 1, last_downloaded_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `, [documentId, tenantId]);

      await this.logActivity(
        tenantId,
        documentId,
        'downloaded',
        email ? `Document downloaded by ${email}` : 'Document downloaded',
        userId,
        undefined,
        email
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to record download: ${error}`);
    }
  }

  async bulkOperation(
    tenantId: string,
    operation: BulkDocumentOperation,
    userId: string
  ): Promise<Result<BulkOperationResult>> {
    try {
      const result: BulkOperationResult = {
        totalRequested: operation.documentIds.length,
        successful: 0,
        failed: 0,
        errors: [],
      };

      for (const documentId of operation.documentIds) {
        try {
          switch (operation.operation) {
            case 'archive':
              await this.pool.query(`
                UPDATE documents SET status = 'archived', updated_at = NOW(), updated_by = $3
                WHERE id = $1 AND tenant_id = $2
              `, [documentId, tenantId, userId]);
              break;

            case 'void':
              await this.pool.query(`
                UPDATE documents SET status = 'voided', updated_at = NOW(), updated_by = $3
                WHERE id = $1 AND tenant_id = $2
              `, [documentId, tenantId, userId]);
              break;

            case 'delete':
              await this.pool.query(`
                DELETE FROM documents WHERE id = $1 AND tenant_id = $2
              `, [documentId, tenantId]);
              break;

            case 'send_reminder':
              // TODO: Implement reminder sending
              break;
          }

          result.successful++;
        } catch (error) {
          result.failed++;
          result.errors!.push({ documentId, error: String(error) });
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to perform bulk operation: ${error}`);
    }
  }

  // ============================================================================
  // Signature Operations
  // ============================================================================

  async addSignature(
    tenantId: string,
    documentId: string,
    signerEmail: string,
    signerName: string | undefined,
    signerType: 'sender' | 'recipient' | 'witness',
    order: number = 1
  ): Promise<Result<DocumentSignature>> {
    try {
      const id = uuidv4();

      const result = await this.pool.query<DocumentSignatureRow>(`
        INSERT INTO document_signatures (
          id, document_id, tenant_id, signer_email, signer_name, signer_type,
          status, order_num, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
        RETURNING *
      `, [id, documentId, tenantId, signerEmail, signerName, signerType, order]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Add signature failed');
      }

      return Result.ok(this.mapRowToSignature(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to add signature: ${error}`);
    }
  }

  async recordSignature(
    tenantId: string,
    signatureId: string,
    ipAddress?: string,
    signatureImageUrl?: string
  ): Promise<Result<DocumentSignature>> {
    try {
      const result = await this.pool.query<DocumentSignatureRow>(`
        UPDATE document_signatures
        SET status = 'signed', signed_at = NOW(), ip_address = $3, signature_image_url = $4, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [signatureId, tenantId, ipAddress, signatureImageUrl]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Record signature failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Signature not found');
      }

      const signature = rows[0];

      // Check if all signatures are complete
      const pendingResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM document_signatures
        WHERE document_id = $1 AND status = 'pending'
      `, [signature.document_id]);

      if (pendingResult.isSuccess) {
        const pendingCount = parseInt(pendingResult.getValue().rows[0]?.count || '0', 10);
        if (pendingCount === 0) {
          await this.pool.query(`
            UPDATE documents
            SET signature_status = 'signed', status = 'signed', updated_at = NOW()
            WHERE id = $1
          `, [signature.document_id]);
        }
      }

      await this.logActivity(
        tenantId,
        signature.document_id,
        'signed',
        `Document signed by ${signature.signer_email}`,
        undefined,
        undefined,
        signature.signer_email
      );

      return Result.ok(this.mapRowToSignature(signature));
    } catch (error) {
      return Result.fail(`Failed to record signature: ${error}`);
    }
  }

  async declineSignature(
    tenantId: string,
    signatureId: string,
    reason?: string
  ): Promise<Result<DocumentSignature>> {
    try {
      const result = await this.pool.query<DocumentSignatureRow>(`
        UPDATE document_signatures
        SET status = 'declined', decline_reason = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `, [signatureId, tenantId, reason]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Decline signature failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Signature not found');
      }

      const signature = rows[0];

      // Update document status
      await this.pool.query(`
        UPDATE documents
        SET signature_status = 'declined', status = 'rejected', rejection_reason = $2, updated_at = NOW()
        WHERE id = $1
      `, [signature.document_id, reason]);

      await this.logActivity(
        tenantId,
        signature.document_id,
        'declined',
        `Document signature declined by ${signature.signer_email}${reason ? `: ${reason}` : ''}`,
        undefined,
        undefined,
        signature.signer_email
      );

      return Result.ok(this.mapRowToSignature(signature));
    } catch (error) {
      return Result.fail(`Failed to decline signature: ${error}`);
    }
  }

  // ============================================================================
  // Activity & Analytics
  // ============================================================================

  async getDocumentActivity(
    tenantId: string,
    documentId: string
  ): Promise<Result<DocumentActivity[]>> {
    try {
      const result = await this.pool.query<DocumentActivityRow>(`
        SELECT * FROM document_activity
        WHERE document_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
      `, [documentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.getValue().rows.map((row) => this.mapRowToActivity(row)));
    } catch (error) {
      return Result.fail(`Failed to get document activity: ${error}`);
    }
  }

  async getDashboard(tenantId: string): Promise<Result<DocumentDashboard>> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      // Get document counts
      const countResult = await this.pool.query<{
        total: string;
        draft: string;
        pending_approval: string;
        awaiting_signature: string;
        completed_month: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE status = 'pending_approval') as pending_approval,
          COUNT(*) FILTER (WHERE signature_status = 'pending') as awaiting_signature,
          COUNT(*) FILTER (WHERE status IN ('signed', 'completed') AND created_at >= $2) as completed_month
        FROM documents WHERE tenant_id = $1
      `, [tenantId, startOfMonth]);

      // Get value metrics
      const valueResult = await this.pool.query<{
        pipeline: string;
        signed_month: string;
      }>(`
        SELECT
          COALESCE(SUM(amount) FILTER (WHERE status NOT IN ('archived', 'voided', 'expired')), 0) as pipeline,
          COALESCE(SUM(amount) FILTER (WHERE status IN ('signed', 'completed') AND created_at >= $2), 0) as signed_month
        FROM documents WHERE tenant_id = $1
      `, [tenantId, startOfMonth]);

      // Get recent documents
      const recentResult = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 5
      `, [tenantId]);

      // Get recent activity
      const activityResult = await this.pool.query<DocumentActivityRow>(`
        SELECT * FROM document_activity WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT 10
      `, [tenantId]);

      // Get expiring documents
      const expiringResult = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents
        WHERE tenant_id = $1 AND expires_at <= $2 AND expires_at >= $3 AND signature_status = 'pending'
        ORDER BY expires_at ASC LIMIT 5
      `, [tenantId, nextWeek, now]);

      // Get pending signatures
      const pendingSigResult = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents
        WHERE tenant_id = $1 AND signature_status = 'pending' AND status = 'sent'
        ORDER BY sent_at ASC LIMIT 5
      `, [tenantId]);

      // Get pending approvals
      const pendingAppResult = await this.pool.query<DocumentRow>(`
        SELECT * FROM documents
        WHERE tenant_id = $1 AND status = 'pending_approval'
        ORDER BY created_at ASC LIMIT 5
      `, [tenantId]);

      const counts = countResult.isSuccess ? countResult.getValue().rows[0] : { total: '0', draft: '0', pending_approval: '0', awaiting_signature: '0', completed_month: '0' };
      const values = valueResult.isSuccess ? valueResult.getValue().rows[0] : { pipeline: '0', signed_month: '0' };

      return Result.ok({
        tenantId,
        totalDocuments: parseInt(counts.total || '0', 10),
        draftDocuments: parseInt(counts.draft || '0', 10),
        pendingApproval: parseInt(counts.pending_approval || '0', 10),
        awaitingSignature: parseInt(counts.awaiting_signature || '0', 10),
        completedThisMonth: parseInt(counts.completed_month || '0', 10),
        totalPipelineValue: parseFloat(values.pipeline || '0'),
        signedValueThisMonth: parseFloat(values.signed_month || '0'),
        avgTimeToSign: 0,
        signatureConversionRate: 0,
        recentDocuments: recentResult.isSuccess ? recentResult.getValue().rows.map((row) => this.mapRowToDocument(row)) : [],
        recentActivity: activityResult.isSuccess ? activityResult.getValue().rows.map((row) => this.mapRowToActivity(row)) : [],
        expiringDocuments: expiringResult.isSuccess ? expiringResult.getValue().rows.map((row) => this.mapRowToDocument(row)) : [],
        pendingSignatures: pendingSigResult.isSuccess ? pendingSigResult.getValue().rows.map((row) => this.mapRowToDocument(row)) : [],
        pendingApprovals: pendingAppResult.isSuccess ? pendingAppResult.getValue().rows.map((row) => this.mapRowToDocument(row)) : [],
      });
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  // ============================================================================
  // Folder Operations
  // ============================================================================

  async createFolder(
    tenantId: string,
    name: string,
    parentId: string | undefined,
    userId: string
  ): Promise<Result<DocumentFolder>> {
    try {
      const id = uuidv4();

      const result = await this.pool.query<DocumentFolderRow>(`
        INSERT INTO document_folders (id, tenant_id, name, parent_id, display_order, created_at, updated_at, created_by)
        VALUES ($1, $2, $3, $4, 0, NOW(), NOW(), $5)
        RETURNING *
      `, [id, tenantId, name, parentId, userId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Create folder failed');
      }

      return Result.ok(this.mapRowToFolder(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create folder: ${error}`);
    }
  }

  async listFolders(tenantId: string, parentId?: string): Promise<Result<DocumentFolder[]>> {
    try {
      const result = await this.pool.query<DocumentFolderRow>(`
        SELECT * FROM document_folders
        WHERE tenant_id = $1 AND ${parentId ? 'parent_id = $2' : 'parent_id IS NULL'}
        ORDER BY display_order ASC, name ASC
      `, parentId ? [tenantId, parentId] : [tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.getValue().rows.map((row) => this.mapRowToFolder(row)));
    } catch (error) {
      return Result.fail(`Failed to list folders: ${error}`);
    }
  }

  async deleteFolder(tenantId: string, folderId: string): Promise<Result<void>> {
    try {
      await this.pool.query(`
        DELETE FROM document_folders WHERE id = $1 AND tenant_id = $2
      `, [folderId, tenantId]);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete folder: ${error}`);
    }
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mergeTemplateContent(
    content: string,
    data: Record<string, unknown>,
    mergeFields: MergeFieldDefinition[]
  ): string {
    let result = content;

    for (const field of mergeFields) {
      const value = this.getNestedValue(data, field.field) || field.fallback || '';
      const formattedValue = this.formatValue(value, field.format);
      result = result.replace(new RegExp(this.escapeRegExp(field.tag), 'g'), String(formattedValue));
    }

    const tagRegex = /\{\{([^}]+)\}\}/g;
    result = result.replace(tagRegex, (match, path) => {
      const value = this.getNestedValue(data, path.trim());
      return value !== undefined ? String(value) : match;
    });

    return result;
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: any, key) => current?.[key], obj);
  }

  private formatValue(value: unknown, format?: string): string {
    if (value === null || value === undefined) return '';

    if (format === 'currency' && typeof value === 'number') {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }

    if (format === 'date' && (value instanceof Date || typeof value === 'string')) {
      return new Date(value as string | Date).toLocaleDateString();
    }

    if (format === 'datetime' && (value instanceof Date || typeof value === 'string')) {
      return new Date(value as string | Date).toLocaleString();
    }

    return String(value);
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private async logActivity(
    tenantId: string,
    documentId: string,
    type: string,
    description: string,
    actorId?: string,
    actorName?: string,
    recipientEmail?: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<void> {
    await this.pool.query(`
      INSERT INTO document_activity (id, document_id, tenant_id, type, description, actor_id, actor_name, recipient_email, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
    `, [uuidv4(), documentId, tenantId, type, description, actorId, actorName, recipientEmail, ipAddress, userAgent]);
  }

  private mapRowToTemplate(row: DocumentTemplateRow): DocumentTemplate {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      type: row.type as DocumentType,
      status: row.status as TemplateStatus,
      format: row.format,
      content: row.content,
      headerContent: row.header_content,
      footerContent: row.footer_content,
      cssStyles: row.css_styles,
      pageSize: row.page_size,
      orientation: row.orientation,
      margins: typeof row.margins === 'string' ? JSON.parse(row.margins) : row.margins,
      mergeFields: typeof row.merge_fields === 'string' ? JSON.parse(row.merge_fields) : (row.merge_fields || []),
      conditionalSections: typeof row.conditional_sections === 'string' ? JSON.parse(row.conditional_sections) : (row.conditional_sections || []),
      hasCoverPage: row.has_cover_page,
      coverPageContent: row.cover_page_content,
      requiresSignature: row.requires_signature,
      signatureFields: typeof row.signature_fields === 'string' ? JSON.parse(row.signature_fields) : (row.signature_fields || []),
      logoUrl: row.logo_url,
      brandColor: row.brand_color,
      fontFamily: row.font_family,
      requiresApproval: row.requires_approval,
      approverIds: row.approver_ids || [],
      version: row.version,
      parentTemplateId: row.parent_template_id,
      folderId: row.folder_id,
      tags: row.tags || [],
      usageCount: row.usage_count,
      lastUsedAt: row.last_used_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
    };
  }

  private mapRowToDocument(row: DocumentRow): Document {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      templateId: row.template_id,
      templateName: row.template_name,
      templateVersion: row.template_version,
      name: row.name,
      description: row.description,
      type: row.type as DocumentType,
      status: row.status as DocumentStatus,
      format: row.format,
      content: row.content,
      pdfUrl: row.pdf_url,
      storageKey: row.storage_key,
      entityType: row.entity_type,
      entityId: row.entity_id,
      entityName: row.entity_name,
      dealId: row.deal_id,
      quoteId: row.quote_id,
      contactId: row.contact_id,
      customerId: row.customer_id,
      recipientEmail: row.recipient_email,
      recipientName: row.recipient_name,
      amount: row.amount,
      currency: row.currency,
      expiresAt: row.expires_at,
      validUntil: row.valid_until,
      approvalStatus: row.approval_status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at,
      rejectionReason: row.rejection_reason,
      signatureStatus: row.signature_status as SignatureStatus,
      signatureProvider: row.signature_provider,
      signatureDocumentId: row.signature_document_id,
      signatures: [],
      sentAt: row.sent_at,
      viewedAt: row.viewed_at,
      viewCount: row.view_count,
      lastViewedAt: row.last_viewed_at,
      downloadCount: row.download_count,
      lastDownloadedAt: row.last_downloaded_at,
      version: row.version,
      previousVersionId: row.previous_version_id,
      mergeData: typeof row.merge_data === 'string' ? JSON.parse(row.merge_data) : row.merge_data,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      tags: row.tags || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      updatedBy: row.updated_by,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
    };
  }

  private mapRowToSignature(row: DocumentSignatureRow): DocumentSignature {
    return {
      id: row.id,
      documentId: row.document_id,
      signerId: row.signer_id,
      signerEmail: row.signer_email,
      signerName: row.signer_name,
      signerType: row.signer_type as 'sender' | 'recipient' | 'witness',
      status: row.status as SignatureStatus,
      signedAt: row.signed_at,
      ipAddress: row.ip_address,
      signatureImageUrl: row.signature_image_url,
      declineReason: row.decline_reason,
      order: row.order_num,
    };
  }

  private mapRowToActivity(row: DocumentActivityRow): DocumentActivity {
    return {
      id: row.id,
      documentId: row.document_id,
      tenantId: row.tenant_id,
      type: row.type,
      description: row.description,
      actorId: row.actor_id,
      actorName: row.actor_name,
      actorEmail: row.actor_email,
      recipientEmail: row.recipient_email,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      createdAt: row.created_at,
    };
  }

  private mapRowToFolder(row: DocumentFolderRow): DocumentFolder {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      parentId: row.parent_id,
      displayOrder: row.display_order,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
    };
  }
}
