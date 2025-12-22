/**
 * Email Template Service
 * Comprehensive template management with personalization and rendering
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { randomUUID } from 'crypto';
import {
  EmailTemplate,
  TemplateVersion,
  ContentBlock,
  TemplateSettings,
  TemplateStatus,
  TemplateCategory,
  CreateTemplateRequest,
  UpdateTemplateRequest,
  TemplateQueryOptions,
  PreviewData,
  RenderResult,
  TemplateAnalytics,
  PersonalizationToken,
  DEFAULT_TOKENS,
  DEFAULT_TEMPLATE_SETTINGS,
  STARTER_TEMPLATES,
} from './types';

@injectable()
export class EmailTemplateService {
  private tokenCache: Map<string, PersonalizationToken> = new Map();

  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {
    // Initialize token cache
    for (const token of DEFAULT_TOKENS) {
      this.tokenCache.set(token.id, token);
    }
  }

  // ============ Template CRUD ============

  /**
   * Create a new email template
   */
  async createTemplate(
    tenantId: string,
    userId: string,
    request: CreateTemplateRequest
  ): Promise<Result<EmailTemplate>> {
    try {
      const id = randomUUID();
      const now = new Date();

      // Ensure blocks is an array (even if empty)
      const blocks = request.blocks || [];

      // Compile HTML
      const html = this.compileToHtml(blocks, request.settings || DEFAULT_TEMPLATE_SETTINGS);

      const query = `
        INSERT INTO email_templates (
          id, tenant_id, name, description, category, status, subject, preheader,
          blocks, settings, html, tags, current_version, created_by, created_at, updated_at, usage_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.name,
        request.description || null,
        request.category || 'transactional',
        'draft',
        request.subject,
        request.preheader || null,
        JSON.stringify(blocks),
        JSON.stringify(request.settings || DEFAULT_TEMPLATE_SETTINGS),
        html,
        request.tags || [],
        1,
        userId,
        now,
        now,
        0,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      // Create initial version
      await this.createVersion(id, userId, {
        subject: request.subject,
        preheader: request.preheader,
        blocks,
        settings: request.settings || DEFAULT_TEMPLATE_SETTINGS,
        html,
      });

      return Result.ok(this.mapRowToTemplate(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create template'));
    }
  }

  /**
   * Get template by ID
   */
  async getTemplate(tenantId: string, templateId: string): Promise<Result<EmailTemplate | null>> {
    try {
      const query = `
        SELECT * FROM email_templates
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [templateId, tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToTemplate(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get template'));
    }
  }

  /**
   * List templates with filtering
   */
  async listTemplates(
    tenantId: string,
    options: TemplateQueryOptions = {}
  ): Promise<Result<{ templates: EmailTemplate[]; total: number }>> {
    try {
      const {
        status,
        category,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = options;

      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (category) {
        conditions.push(`category = $${paramIndex++}`);
        params.push(category);
      }

      if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const sortColumn = this.getSortColumn(sortBy);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM email_templates WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = countResult.isSuccess ? parseInt(countResult.getValue().rows[0].count, 10) : 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM email_templates
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const templates = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToTemplate(row)
      );

      return Result.ok({ templates, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list templates'));
    }
  }

  /**
   * Update template
   */
  async updateTemplate(
    tenantId: string,
    templateId: string,
    userId: string,
    request: UpdateTemplateRequest
  ): Promise<Result<EmailTemplate>> {
    try {
      // Get current template
      const currentResult = await this.getTemplate(tenantId, templateId);
      if (currentResult.isFailure || !currentResult.value) {
        return Result.fail(new Error('Template not found'));
      }

      const current = currentResult.value;

      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [templateId, tenantId];
      let paramIndex = 3;

      if (request.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(request.name);
      }

      if (request.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(request.description);
      }

      if (request.category !== undefined) {
        setClauses.push(`category = $${paramIndex++}`);
        params.push(request.category);
      }

      if (request.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(request.status);
      }

      if (request.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        params.push(request.subject);
      }

      if (request.preheader !== undefined) {
        setClauses.push(`preheader = $${paramIndex++}`);
        params.push(request.preheader);
      }

      if (request.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        params.push(request.tags);
      }

      // Handle blocks and settings updates
      let newHtml: string | null = null;
      if (request.blocks !== undefined || request.settings !== undefined) {
        const blocks = request.blocks || current.blocks;
        const settings = request.settings || current.settings;
        newHtml = this.compileToHtml(blocks, settings);

        if (request.blocks !== undefined) {
          setClauses.push(`blocks = $${paramIndex++}`);
          params.push(JSON.stringify(request.blocks));
        }

        if (request.settings !== undefined) {
          setClauses.push(`settings = $${paramIndex++}`);
          params.push(JSON.stringify(request.settings));
        }

        setClauses.push(`html = $${paramIndex++}`);
        params.push(newHtml);

        // Increment version
        setClauses.push(`current_version = current_version + 1`);
      }

      const query = `
        UPDATE email_templates
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail(new Error('Template not found'));
      }

      const updated = this.mapRowToTemplate(rows[0]);

      // Create version if content changed
      if (request.blocks !== undefined || request.settings !== undefined || request.subject !== undefined) {
        await this.createVersion(templateId, userId, {
          subject: request.subject || current.subject,
          preheader: request.preheader || current.preheader,
          blocks: request.blocks || current.blocks,
          settings: request.settings || current.settings,
          html: newHtml || current.html,
          changeDescription: request.changeDescription,
        });
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update template'));
    }
  }

  /**
   * Delete template
   */
  async deleteTemplate(tenantId: string, templateId: string): Promise<Result<void>> {
    try {
      // Delete versions first
      await this.pool.query('DELETE FROM email_template_versions WHERE template_id = $1', [templateId]);

      // Delete template
      const query = `DELETE FROM email_templates WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [templateId, tenantId]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete template'));
    }
  }

  /**
   * Duplicate template
   */
  async duplicateTemplate(
    tenantId: string,
    templateId: string,
    userId: string,
    newName?: string
  ): Promise<Result<EmailTemplate>> {
    try {
      const originalResult = await this.getTemplate(tenantId, templateId);
      if (originalResult.isFailure || !originalResult.value) {
        return Result.fail(new Error('Template not found'));
      }

      const original = originalResult.value;

      return this.createTemplate(tenantId, userId, {
        name: newName || `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        subject: original.subject,
        preheader: original.preheader,
        blocks: original.blocks,
        settings: original.settings,
        tags: original.tags,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to duplicate template'));
    }
  }

  // ============ Version Management ============

  /**
   * Create template version
   */
  private async createVersion(
    templateId: string,
    userId: string,
    data: {
      subject: string;
      preheader?: string;
      blocks: ContentBlock[];
      settings: TemplateSettings;
      html?: string;
      changeDescription?: string;
    }
  ): Promise<Result<TemplateVersion>> {
    try {
      // Get current version number
      const versionResult = await this.pool.query(
        'SELECT COALESCE(MAX(version_number), 0) + 1 as next_version FROM email_template_versions WHERE template_id = $1',
        [templateId]
      );

      const nextVersion = versionResult.isSuccess
        ? parseInt(versionResult.getValue().rows[0].next_version, 10)
        : 1;

      const id = randomUUID();
      const query = `
        INSERT INTO email_template_versions (
          id, template_id, version_number, subject, preheader, blocks, settings, html, created_by, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        templateId,
        nextVersion,
        data.subject,
        data.preheader || null,
        JSON.stringify(data.blocks),
        JSON.stringify(data.settings),
        data.html || null,
        userId,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(this.mapRowToVersion(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create version'));
    }
  }

  /**
   * Get template versions
   */
  async getVersions(
    tenantId: string,
    templateId: string
  ): Promise<Result<TemplateVersion[]>> {
    try {
      // Verify template belongs to tenant
      const templateResult = await this.getTemplate(tenantId, templateId);
      if (templateResult.isFailure || !templateResult.value) {
        return Result.fail(new Error('Template not found'));
      }

      const query = `
        SELECT * FROM email_template_versions
        WHERE template_id = $1
        ORDER BY version_number DESC
      `;

      const result = await this.pool.query(query, [templateId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const versions = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToVersion(row)
      );

      return Result.ok(versions);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get versions'));
    }
  }

  /**
   * Restore template to specific version
   */
  async restoreVersion(
    tenantId: string,
    templateId: string,
    versionNumber: number,
    userId: string
  ): Promise<Result<EmailTemplate>> {
    try {
      // Get version
      const versionQuery = `
        SELECT * FROM email_template_versions
        WHERE template_id = $1 AND version_number = $2
      `;

      const versionResult = await this.pool.query(versionQuery, [templateId, versionNumber]);
      if (versionResult.isFailure || versionResult.getValue().rows.length === 0) {
        return Result.fail(new Error('Version not found'));
      }

      const version = this.mapRowToVersion(versionResult.getValue().rows[0]);

      // Update template with version content
      return this.updateTemplate(tenantId, templateId, userId, {
        subject: version.subject,
        preheader: version.preheader,
        blocks: version.blocks,
        settings: version.settings,
        changeDescription: `Restored to version ${versionNumber}`,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to restore version'));
    }
  }

  // ============ Rendering & Preview ============

  /**
   * Render template with data
   */
  async renderTemplate(
    tenantId: string,
    templateId: string,
    data: PreviewData
  ): Promise<Result<RenderResult>> {
    try {
      const templateResult = await this.getTemplate(tenantId, templateId);
      if (templateResult.isFailure || !templateResult.value) {
        return Result.fail(new Error('Template not found'));
      }

      const template = templateResult.value;
      return this.render(template.subject, template.html || '', template.preheader, data);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to render template'));
    }
  }

  /**
   * Preview template with sample data
   */
  async previewTemplate(
    tenantId: string,
    templateId: string,
    data?: PreviewData
  ): Promise<Result<RenderResult>> {
    const sampleData: PreviewData = data || {
      contact: {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        company: 'Acme Corp',
        title: 'Marketing Manager',
      },
      company: {
        name: 'Your Company',
        address: '123 Main St, City, Country',
        phone: '+1 (555) 123-4567',
        website: 'https://yourcompany.com',
      },
      user: {
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@yourcompany.com',
        title: 'Sales Representative',
        signature: 'Best regards,\nJane Smith',
      },
    };

    return this.renderTemplate(tenantId, templateId, sampleData);
  }

  /**
   * Render raw content
   */
  render(
    subject: string,
    html: string,
    preheader?: string,
    data?: PreviewData
  ): Result<RenderResult> {
    try {
      const errors: Array<{ token: string; error: string }> = [];

      // Process subject
      const renderedSubject = this.replaceTokens(subject, data, errors);

      // Process HTML
      const renderedHtml = this.replaceTokens(html, data, errors);

      // Generate plain text
      const text = this.htmlToText(renderedHtml);

      // Process preheader
      const renderedPreheader = preheader ? this.replaceTokens(preheader, data, errors) : undefined;

      return Result.ok({
        subject: renderedSubject,
        html: renderedHtml,
        text,
        preheader: renderedPreheader,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to render content'));
    }
  }

  /**
   * Replace personalization tokens
   */
  private replaceTokens(
    content: string,
    data?: PreviewData,
    errors?: Array<{ token: string; error: string }>
  ): string {
    // Match {{token.path}} or {{token.path|default}}
    const tokenRegex = /\{\{([^}|]+)(?:\|([^}]*))?\}\}/g;

    return content.replace(tokenRegex, (match, tokenPath, defaultValue) => {
      try {
        const value = this.getTokenValue(tokenPath.trim(), data);

        if (value !== undefined && value !== null && value !== '') {
          return String(value);
        }

        // Use default from template if provided
        if (defaultValue !== undefined) {
          return defaultValue;
        }

        // Use token's default value
        const tokenDef = this.tokenCache.get(tokenPath.trim());
        if (tokenDef?.defaultValue) {
          return tokenDef.defaultValue;
        }

        // Return empty string for missing values
        return '';
      } catch (error) {
        if (errors) {
          errors.push({
            token: tokenPath,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
        return match; // Keep original token
      }
    });
  }

  /**
   * Get token value from data
   */
  private getTokenValue(tokenPath: string, data?: PreviewData): unknown {
    if (!data) return undefined;

    const parts = tokenPath.split('.');
    let current: unknown = data;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    // Handle system tokens
    if (parts[0] === 'system') {
      switch (parts[1]) {
        case 'currentDate':
          return new Date().toLocaleDateString();
        case 'currentYear':
          return new Date().getFullYear().toString();
        case 'unsubscribeUrl':
          return '{{UNSUBSCRIBE_URL}}';
        case 'viewInBrowserUrl':
          return '{{VIEW_IN_BROWSER_URL}}';
        case 'preferencesUrl':
          return '{{PREFERENCES_URL}}';
      }
    }

    return current;
  }

  /**
   * Convert HTML to plain text
   */
  private htmlToText(html: string): string {
    return html
      // Remove style and script tags with content
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      // Replace line breaks
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/li>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      // Clean up whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  // ============ HTML Compilation ============

  /**
   * Compile blocks to HTML
   */
  compileToHtml(blocks: ContentBlock[], settings: TemplateSettings): string {
    const containerStyle = `
      background-color: ${settings.backgroundColor || '#f4f4f4'};
      font-family: ${settings.fontFamily || 'Arial, sans-serif'};
      font-size: ${settings.fontSize || '14px'};
      color: ${settings.textColor || '#333333'};
      line-height: 1.6;
    `;

    const contentStyle = `
      max-width: ${settings.contentWidth || 600}px;
      margin: 0 auto;
      background-color: #ffffff;
    `;

    const blockHtml = blocks
      .filter(block => block.visible !== false)
      .map(block => this.renderBlock(block, settings))
      .join('\n');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>{{subject}}</title>
  ${settings.preheader ? `<div style="display:none;max-height:0;overflow:hidden;">${settings.preheader}</div>` : ''}
  <style>
    @media screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 10px !important; }
      .stack-column { display: block !important; width: 100% !important; }
    }
    a { color: ${settings.linkColor || '#0066cc'}; }
  </style>
</head>
<body style="margin:0;padding:0;${containerStyle}">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center" style="padding: 20px;">
        <table role="presentation" class="container" style="${contentStyle}" cellspacing="0" cellpadding="0" border="0">
          ${blockHtml}
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
  }

  /**
   * Render individual block
   */
  private renderBlock(block: ContentBlock, settings: TemplateSettings): string {
    const style = this.buildStyleString(block.style);

    switch (block.type) {
      case 'header':
        return this.renderHeaderBlock(block, style);
      case 'text':
        return this.renderTextBlock(block, style);
      case 'image':
        return this.renderImageBlock(block, style);
      case 'button':
        return this.renderButtonBlock(block, style, settings);
      case 'divider':
        return this.renderDividerBlock(block, style);
      case 'spacer':
        return this.renderSpacerBlock(block);
      case 'columns':
        return this.renderColumnsBlock(block, settings);
      case 'social':
        return this.renderSocialBlock(block, style);
      case 'footer':
        return this.renderFooterBlock(block, style);
      case 'html':
        return this.renderHtmlBlock(block);
      default:
        return '';
    }
  }

  private renderHeaderBlock(block: { content: { text: string; level: number; logoUrl?: string; logoAlt?: string; logoWidth?: number } }, style: string): string {
    const tag = `h${block.content.level}`;
    let logoHtml = '';
    if (block.content.logoUrl) {
      logoHtml = `<img src="${block.content.logoUrl}" alt="${block.content.logoAlt || 'Logo'}" width="${block.content.logoWidth || 150}" style="display:block;margin:0 auto 15px;">`;
    }
    return `<tr><td style="${style}">${logoHtml}<${tag} style="margin:0;">${block.content.text}</${tag}></td></tr>`;
  }

  private renderTextBlock(block: { content: { html: string } }, style: string): string {
    return `<tr><td style="${style}">${block.content.html}</td></tr>`;
  }

  private renderImageBlock(block: { content: { src: string; alt: string; linkUrl?: string; width?: number; height?: number } }, style: string): string {
    const imgStyle = block.content.width ? `width:${block.content.width}px;max-width:100%;height:auto;` : 'max-width:100%;height:auto;';
    const img = `<img src="${block.content.src}" alt="${block.content.alt}" style="${imgStyle}display:block;">`;
    const content = block.content.linkUrl ? `<a href="${block.content.linkUrl}">${img}</a>` : img;
    return `<tr><td style="${style}">${content}</td></tr>`;
  }

  private renderButtonBlock(
    block: { content: { text: string; url: string; backgroundColor?: string; textColor?: string; borderRadius?: string; fullWidth?: boolean } },
    style: string,
    settings: TemplateSettings
  ): string {
    const btnBg = block.content.backgroundColor || settings.buttonStyle?.backgroundColor || '#0066cc';
    const btnColor = block.content.textColor || settings.buttonStyle?.textColor || '#ffffff';
    const btnRadius = block.content.borderRadius || settings.buttonStyle?.borderRadius || '4px';
    const btnWidth = block.content.fullWidth ? 'width:100%;' : '';

    return `<tr><td style="${style}">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" ${block.content.fullWidth ? 'width="100%"' : ''}>
        <tr>
          <td style="background-color:${btnBg};border-radius:${btnRadius};${btnWidth}">
            <a href="${block.content.url}" style="display:inline-block;padding:12px 24px;color:${btnColor};text-decoration:none;font-weight:bold;${btnWidth}text-align:center;">${block.content.text}</a>
          </td>
        </tr>
      </table>
    </td></tr>`;
  }

  private renderDividerBlock(block: { content: { color?: string; height?: number; style?: string } }, style: string): string {
    const dividerColor = block.content.color || '#dddddd';
    const dividerHeight = block.content.height || 1;
    const dividerStyle = block.content.style || 'solid';
    return `<tr><td style="${style}"><hr style="border:none;border-top:${dividerHeight}px ${dividerStyle} ${dividerColor};margin:0;"></td></tr>`;
  }

  private renderSpacerBlock(block: { content: { height: number } }): string {
    return `<tr><td style="height:${block.content.height}px;font-size:0;line-height:0;">&nbsp;</td></tr>`;
  }

  private renderColumnsBlock(block: { content: { columns: Array<{ id: string; width: string; blocks: ContentBlock[]; style?: Record<string, string> }>; gap?: string; stackOnMobile?: boolean } }, settings: TemplateSettings): string {
    const columnHtml = block.content.columns.map(col => {
      const colStyle = this.buildStyleString(col.style);
      const innerBlocks = col.blocks.map(b => this.renderBlock(b, settings)).join('');
      return `<td class="${block.content.stackOnMobile !== false ? 'stack-column' : ''}" style="width:${col.width};vertical-align:top;${colStyle}">${innerBlocks}</td>`;
    }).join('');

    return `<tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>${columnHtml}</tr></table></td></tr>`;
  }

  private renderSocialBlock(block: { content: { links: Array<{ platform: string; url: string; iconColor?: string }>; iconSize?: number; alignment?: string } }, style: string): string {
    const iconSize = block.content.iconSize || 32;
    const alignment = block.content.alignment || 'center';

    const socialIcons: Record<string, string> = {
      facebook: 'https://cdn-icons-png.flaticon.com/512/733/733547.png',
      twitter: 'https://cdn-icons-png.flaticon.com/512/733/733579.png',
      linkedin: 'https://cdn-icons-png.flaticon.com/512/733/733561.png',
      instagram: 'https://cdn-icons-png.flaticon.com/512/733/733558.png',
      youtube: 'https://cdn-icons-png.flaticon.com/512/733/733646.png',
      tiktok: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png',
    };

    const linksHtml = block.content.links.map(link => {
      const iconUrl = socialIcons[link.platform] || '';
      return `<a href="${link.url}" style="display:inline-block;margin:0 5px;"><img src="${iconUrl}" alt="${link.platform}" width="${iconSize}" height="${iconSize}" style="display:block;"></a>`;
    }).join('');

    return `<tr><td style="${style}text-align:${alignment};">${linksHtml}</td></tr>`;
  }

  private renderFooterBlock(block: { content: { companyName?: string; address?: string; unsubscribeText?: string; unsubscribeUrl?: string; privacyPolicyUrl?: string; termsUrl?: string } }, style: string): string {
    const lines: string[] = [];

    if (block.content.companyName) {
      lines.push(`<strong>${block.content.companyName}</strong>`);
    }
    if (block.content.address) {
      lines.push(block.content.address);
    }

    const links: string[] = [];
    if (block.content.unsubscribeText || block.content.unsubscribeUrl) {
      links.push(`<a href="${block.content.unsubscribeUrl || '{{system.unsubscribeUrl}}'}">${block.content.unsubscribeText || 'Unsubscribe'}</a>`);
    }
    if (block.content.privacyPolicyUrl) {
      links.push(`<a href="${block.content.privacyPolicyUrl}">Privacy Policy</a>`);
    }
    if (block.content.termsUrl) {
      links.push(`<a href="${block.content.termsUrl}">Terms of Service</a>`);
    }

    if (links.length > 0) {
      lines.push(links.join(' | '));
    }

    return `<tr><td style="${style}text-align:center;font-size:12px;color:#666666;padding:20px;">
      ${lines.join('<br>')}
    </td></tr>`;
  }

  private renderHtmlBlock(block: { content: { html: string } }): string {
    return `<tr><td>${block.content.html}</td></tr>`;
  }

  /**
   * Build style string from style object
   */
  private buildStyleString(style?: Record<string, unknown>): string {
    if (!style) return '';

    const cssProperties: Record<string, string> = {
      backgroundColor: 'background-color',
      padding: 'padding',
      margin: 'margin',
      borderRadius: 'border-radius',
      borderColor: 'border-color',
      borderWidth: 'border-width',
      textAlign: 'text-align',
      fontFamily: 'font-family',
      fontSize: 'font-size',
      fontWeight: 'font-weight',
      color: 'color',
      lineHeight: 'line-height',
      width: 'width',
      maxWidth: 'max-width',
    };

    return Object.entries(style)
      .filter(([_, value]) => value !== undefined && value !== null)
      .map(([key, value]) => {
        const cssKey = cssProperties[key] || key;
        return `${cssKey}:${value};`;
      })
      .join('');
  }

  // ============ Tokens & Starter Templates ============

  /**
   * Get available personalization tokens
   */
  getAvailableTokens(): PersonalizationToken[] {
    return DEFAULT_TOKENS;
  }

  /**
   * Get starter templates
   */
  getStarterTemplates(): typeof STARTER_TEMPLATES {
    return STARTER_TEMPLATES;
  }

  /**
   * Create template from starter
   */
  async createFromStarter(
    tenantId: string,
    userId: string,
    starterId: string,
    name?: string
  ): Promise<Result<EmailTemplate>> {
    const starter = STARTER_TEMPLATES.find(t => t.id === starterId);
    if (!starter) {
      return Result.fail(new Error('Starter template not found'));
    }

    return this.createTemplate(tenantId, userId, {
      name: name || starter.name,
      description: starter.description,
      category: starter.category,
      subject: starter.subject,
      preheader: starter.preheader,
      blocks: starter.blocks,
      settings: starter.settings,
      tags: starter.tags,
    });
  }

  /**
   * Track template usage
   */
  async trackUsage(tenantId: string, templateId: string): Promise<Result<void>> {
    try {
      await this.pool.query(
        `UPDATE email_templates SET usage_count = usage_count + 1, last_used_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [templateId, tenantId]
      );
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to track usage'));
    }
  }

  // ============ Helper Methods ============

  private mapRowToTemplate(row: Record<string, unknown>): EmailTemplate {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      category: row.category as TemplateCategory,
      status: row.status as TemplateStatus,
      subject: row.subject as string,
      preheader: row.preheader as string | undefined,
      blocks: typeof row.blocks === 'string' ? JSON.parse(row.blocks) : row.blocks as ContentBlock[],
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings as TemplateSettings,
      html: row.html as string | undefined,
      thumbnail: row.thumbnail as string | undefined,
      tags: row.tags as string[] | undefined,
      currentVersion: row.current_version as number,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at as string) : undefined,
      usageCount: row.usage_count as number,
    };
  }

  private mapRowToVersion(row: Record<string, unknown>): TemplateVersion {
    return {
      id: row.id as string,
      templateId: row.template_id as string,
      version: row.version_number as number,
      subject: row.subject as string,
      preheader: row.preheader as string | undefined,
      blocks: typeof row.blocks === 'string' ? JSON.parse(row.blocks) : row.blocks as ContentBlock[],
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings as TemplateSettings,
      html: row.html as string | undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      changeDescription: row.change_description as string | undefined,
    };
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      usageCount: 'usage_count',
    };
    return columnMap[sortBy] || 'updated_at';
  }
}

/**
 * Create email template service instance
 */
export function createEmailTemplateService(pool: DatabasePool): EmailTemplateService {
  return new EmailTemplateService(pool);
}
