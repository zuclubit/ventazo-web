/**
 * Campaign Management Service
 *
 * Comprehensive marketing campaign management:
 * - Campaign CRUD operations
 * - Audience segmentation
 * - A/B testing
 * - Campaign sending and tracking
 * - Analytics and reporting
 */

import { injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import type {
  CampaignStatus,
  CampaignType,
  ChannelType,
  CampaignGoalType,
  CampaignSearchFilters,
  CampaignGoal,
  CampaignSettings,
  AudienceRule,
  MergeField,
  ABTestVariant,
  CampaignDashboard,
} from './types';

// Row types for database results
export interface CampaignRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  goal_type?: string;
  channels: string[];
  primary_channel?: string;
  start_date?: Date;
  end_date?: Date;
  timezone?: string;
  audience_id?: string;
  audience_name?: string;
  budget_amount?: number;
  budget_currency?: string;
  budget_spent?: number;
  goals?: any;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  subject?: string;
  preview_text?: string;
  from_name?: string;
  from_email?: string;
  reply_to?: string;
  template_id?: string;
  settings?: any;
  tags: string[];
  folder_id?: string;
  owner_id: string;
  owner_name?: string;
  custom_fields?: any;
  created_by: string;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
  completed_at?: Date;
}

export interface CampaignAudienceRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  rules?: any;
  rule_logic?: string;
  member_ids?: string[];
  member_count: number;
  refresh_interval?: number;
  auto_refresh: boolean;
  last_calculated_at?: Date;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignMessageRow {
  id: string;
  campaign_id: string;
  tenant_id: string;
  channel: string;
  name: string;
  subject?: string;
  preview_text?: string;
  body_html?: string;
  body_text?: string;
  body_json?: any;
  template_id?: string;
  merge_fields?: any;
  is_variant: boolean;
  variant_name?: string;
  variant_weight?: number;
  send_at?: Date;
  delay_minutes?: number;
  status: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignAbTestRow {
  id: string;
  campaign_id: string;
  tenant_id: string;
  name: string;
  status: string;
  test_type: string;
  variants: any;
  sample_size: number;
  winner_criteria: string;
  test_duration_hours: number;
  winner_id?: string;
  winner_declared_at?: Date;
  winner_declared_by?: string;
  started_at?: Date;
  completed_at?: Date;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignSendRow {
  id: string;
  campaign_id: string;
  message_id: string;
  tenant_id: string;
  recipient_id: string;
  recipient_email?: string;
  recipient_phone?: string;
  channel: string;
  status: string;
  variant_id?: string;
  external_id?: string;
  message_id_external?: string;
  metadata?: any;
  sent_at?: Date;
  delivered_at?: Date;
  opened_at?: Date;
  clicked_at?: Date;
  bounced_at?: Date;
  failed_at?: Date;
  bounce_type?: string;
  bounce_reason?: string;
  failure_reason?: string;
  created_at: Date;
}

export interface CampaignClickRow {
  id: string;
  send_id: string;
  campaign_id: string;
  tenant_id: string;
  url: string;
  link_id?: string;
  link_name?: string;
  clicked_at: Date;
  device_type?: string;
  browser?: string;
  os?: string;
  ip?: string;
  country?: string;
  city?: string;
}

export interface CampaignConversionRow {
  id: string;
  send_id: string;
  campaign_id: string;
  tenant_id: string;
  recipient_id: string;
  conversion_type: string;
  conversion_value?: number;
  currency?: string;
  attribution_model: string;
  attribution_weight?: number;
  converted_at: Date;
  metadata?: any;
}

export interface SuppressionListRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  member_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface SuppressionEntryRow {
  id: string;
  list_id: string;
  tenant_id: string;
  email?: string;
  phone?: string;
  contact_id?: string;
  reason?: string;
  source?: string;
  added_at: Date;
  added_by: string;
}

export interface CampaignEmailTemplateRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  category?: string;
  subject?: string;
  preview_text?: string;
  body_html: string;
  body_text?: string;
  design_json?: any;
  thumbnail_url?: string;
  merge_fields?: any;
  is_public: boolean;
  is_default: boolean;
  tags: string[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignFolderRow {
  id: string;
  tenant_id: string;
  name: string;
  parent_id?: string;
  color?: string;
  campaign_count: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

export interface CampaignAnalyticsRow {
  id: string;
  campaign_id: string;
  tenant_id: string;
  total_sent: number;
  total_delivered: number;
  total_bounced: number;
  total_failed: number;
  unique_opens: number;
  total_opens: number;
  unique_clicks: number;
  total_clicks: number;
  delivery_rate: number;
  bounce_rate: number;
  open_rate: number;
  click_rate: number;
  click_to_open_rate: number;
  unsubscribes: number;
  complaints: number;
  unsubscribe_rate: number;
  complaint_rate: number;
  conversions: number;
  conversion_rate: number;
  revenue: number;
  revenue_per_recipient: number;
  last_updated_at: Date;
}

export interface AutomationTriggerRow {
  id: string;
  campaign_id: string;
  tenant_id: string;
  trigger_type: string;
  trigger_event?: string;
  trigger_conditions?: any;
  delay_type: string;
  delay_minutes?: number;
  delay_until_hour?: number;
  delay_until_day?: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

@injectable()
export class CampaignService {
  private pool: DatabasePool;

  constructor(pool: DatabasePool) {
    this.pool = pool;
  }

  // Helper to convert snake_case to camelCase for response
  private toCamelCase<T>(row: Record<string, any>): T {
    const result: Record<string, any> = {};
    for (const key of Object.keys(row)) {
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      result[camelKey] = row[key];
    }
    return result as T;
  }

  // Helper to map CampaignRow to a frontend-friendly format
  /**
   * Safely format date to ISO string, handling both Date objects and strings
   */
  private formatDate(value: Date | string | null | undefined): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    return undefined;
  }

  private mapCampaignRow(row: CampaignRow): any {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      type: row.type,
      status: row.status,
      goalType: row.goal_type,
      channels: row.channels,
      primaryChannel: row.primary_channel,
      startDate: this.formatDate(row.start_date),
      endDate: this.formatDate(row.end_date),
      timezone: row.timezone,
      audienceId: row.audience_id,
      audienceName: row.audience_name,
      estimatedReach: row.estimated_reach,
      actualReach: row.actual_reach,
      budgetAmount: row.budget_amount,
      budgetCurrency: row.budget_currency,
      budgetSpent: row.budget_spent,
      goals: row.goals,
      utmSource: row.utm_source,
      utmMedium: row.utm_medium,
      utmCampaign: row.utm_campaign,
      utmTerm: row.utm_term,
      utmContent: row.utm_content,
      subject: row.subject,
      previewText: row.preview_text,
      fromName: row.from_name,
      fromEmail: row.from_email,
      replyTo: row.reply_to,
      templateId: row.template_id,
      settings: row.settings,
      tags: row.tags,
      folderId: row.folder_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      customFields: row.custom_fields,
      createdBy: row.created_by,
      createdAt: this.formatDate(row.created_at),
      updatedAt: this.formatDate(row.updated_at),
      publishedAt: this.formatDate(row.published_at),
      completedAt: this.formatDate(row.completed_at),
    };
  }

  // ============================================================================
  // CAMPAIGN CRUD
  // ============================================================================

  /**
   * Create a new campaign
   */
  async createCampaign(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: CampaignType;
      goalType?: CampaignGoalType;
      channels?: ChannelType[];
      primaryChannel?: ChannelType;
      startDate?: Date;
      endDate?: Date;
      timezone?: string;
      audienceId?: string;
      audienceName?: string;
      budgetAmount?: number;
      budgetCurrency?: string;
      goals?: CampaignGoal[];
      utmSource?: string;
      utmMedium?: string;
      utmCampaign?: string;
      utmTerm?: string;
      utmContent?: string;
      subject?: string;
      previewText?: string;
      fromName?: string;
      fromEmail?: string;
      replyTo?: string;
      templateId?: string;
      settings?: CampaignSettings;
      tags?: string[];
      folderId?: string;
      ownerId: string;
      ownerName?: string;
      customFields?: Record<string, unknown>;
    }
  ): Promise<Result<CampaignRow>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const utmCampaign = input.utmCampaign ?? input.name.toLowerCase().replace(/\s+/g, '-');

      const result = await this.pool.query<CampaignRow>(
        `INSERT INTO campaigns (
          id, tenant_id, name, description, type, status, goal_type, channels,
          primary_channel, start_date, end_date, timezone, audience_id, audience_name,
          budget_amount, budget_currency, budget_spent, goals, utm_source, utm_medium,
          utm_campaign, utm_term, utm_content, subject, preview_text, from_name,
          from_email, reply_to, template_id, settings, tags, folder_id, owner_id,
          owner_name, custom_fields, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
          $31, $32, $33, $34, $35, $36, $37, $38
        ) RETURNING *`,
        [
          id,
          tenantId,
          input.name,
          input.description ?? null,
          input.type,
          'draft',
          input.goalType ?? 'engagement',
          JSON.stringify(input.channels ?? []),
          input.primaryChannel ?? null,
          input.startDate ?? null,
          input.endDate ?? null,
          input.timezone ?? 'UTC',
          input.audienceId ?? null,
          input.audienceName ?? null,
          input.budgetAmount ?? null,
          input.budgetCurrency ?? 'USD',
          0,
          JSON.stringify(input.goals ?? []),
          input.utmSource ?? null,
          input.utmMedium ?? null,
          utmCampaign,
          input.utmTerm ?? null,
          input.utmContent ?? null,
          input.subject ?? null,
          input.previewText ?? null,
          input.fromName ?? null,
          input.fromEmail ?? null,
          input.replyTo ?? null,
          input.templateId ?? null,
          JSON.stringify(input.settings ?? {}),
          JSON.stringify(input.tags ?? []),
          input.folderId ?? null,
          input.ownerId,
          input.ownerName ?? null,
          JSON.stringify(input.customFields ?? {}),
          userId,
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create campaign: ${error}`);
    }
  }

  /**
   * Get campaign by ID
   */
  async getCampaignById(tenantId: string, campaignId: string): Promise<Result<CampaignRow | null>> {
    try {
      const result = await this.pool.query<CampaignRow>(
        `SELECT * FROM campaigns WHERE tenant_id = $1 AND id = $2`,
        [tenantId, campaignId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get campaign: ${error}`);
    }
  }

  /**
   * Search campaigns
   */
  async searchCampaigns(
    tenantId: string,
    filters: CampaignSearchFilters,
    pagination: { page: number; limit: number }
  ): Promise<Result<{ campaigns: CampaignRow[]; total: number }>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${filters.search}%`);
        paramIndex++;
      }

      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex})`);
        params.push(filters.status);
        paramIndex++;
      }

      if (filters.type && filters.type.length > 0) {
        conditions.push(`type = ANY($${paramIndex})`);
        params.push(filters.type);
        paramIndex++;
      }

      if (filters.ownerId) {
        conditions.push(`owner_id = $${paramIndex}`);
        params.push(filters.ownerId);
        paramIndex++;
      }

      if (filters.folderId) {
        conditions.push(`folder_id = $${paramIndex}`);
        params.push(filters.folderId);
        paramIndex++;
      }

      if (filters.startDateFrom) {
        conditions.push(`start_date >= $${paramIndex}`);
        params.push(filters.startDateFrom);
        paramIndex++;
      }

      if (filters.startDateTo) {
        conditions.push(`start_date <= $${paramIndex}`);
        params.push(filters.startDateTo);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const offset = (pagination.page - 1) * pagination.limit;

      // Get count first
      const countResult = await this.pool.query(
        `SELECT COUNT(*) as count FROM campaigns WHERE ${whereClause}`,
        params
      );
      if (countResult.isFailure) {
        return Result.fail(`Failed to count campaigns: ${countResult.error}`);
      }
      const total = parseInt(countResult.getValue().rows[0]?.count ?? '0', 10);

      // Get campaigns
      const campaignsResult = await this.pool.query(
        `SELECT * FROM campaigns WHERE ${whereClause} ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, pagination.limit, offset]
      );
      if (campaignsResult.isFailure) {
        return Result.fail(`Failed to fetch campaigns: ${campaignsResult.error}`);
      }

      return Result.ok({
        campaigns: campaignsResult.getValue().rows as CampaignRow[],
        total,
      });
    } catch (error) {
      return Result.fail(`Failed to search campaigns: ${error}`);
    }
  }

  /**
   * Update campaign
   */
  async updateCampaign(
    tenantId: string,
    campaignId: string,
    updates: Partial<{
      name: string;
      description: string;
      goalType: CampaignGoalType;
      channels: ChannelType[];
      primaryChannel: ChannelType;
      startDate: Date;
      endDate: Date;
      timezone: string;
      audienceId: string;
      audienceName: string;
      budgetAmount: number;
      goals: CampaignGoal[];
      utmSource: string;
      utmMedium: string;
      utmCampaign: string;
      utmTerm: string;
      utmContent: string;
      subject: string;
      previewText: string;
      fromName: string;
      fromEmail: string;
      replyTo: string;
      templateId: string;
      settings: CampaignSettings;
      tags: string[];
      folderId: string;
      ownerName: string;
      customFields: Record<string, unknown>;
    }>
  ): Promise<Result<CampaignRow>> {
    try {
      const setClauses: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      const fieldMap: Record<string, string> = {
        name: 'name',
        description: 'description',
        goalType: 'goal_type',
        channels: 'channels',
        primaryChannel: 'primary_channel',
        startDate: 'start_date',
        endDate: 'end_date',
        timezone: 'timezone',
        audienceId: 'audience_id',
        audienceName: 'audience_name',
        budgetAmount: 'budget_amount',
        goals: 'goals',
        utmSource: 'utm_source',
        utmMedium: 'utm_medium',
        utmCampaign: 'utm_campaign',
        utmTerm: 'utm_term',
        utmContent: 'utm_content',
        subject: 'subject',
        previewText: 'preview_text',
        fromName: 'from_name',
        fromEmail: 'from_email',
        replyTo: 'reply_to',
        templateId: 'template_id',
        settings: 'settings',
        tags: 'tags',
        folderId: 'folder_id',
        ownerName: 'owner_name',
        customFields: 'custom_fields',
      };

      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && fieldMap[key]) {
          setClauses.push(`${fieldMap[key]} = $${paramIndex}`);
          params.push(
            key === 'goals' || key === 'settings' || key === 'customFields'
              ? JSON.stringify(value)
              : value
          );
          paramIndex++;
        }
      }

      setClauses.push(`updated_at = $${paramIndex}`);
      params.push(new Date());
      paramIndex++;

      params.push(tenantId, campaignId);

      const result = await this.pool.query<CampaignRow>(
        `UPDATE campaigns SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
        params
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Campaign not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update campaign: ${error}`);
    }
  }

  /**
   * Update campaign status
   */
  async updateCampaignStatus(
    tenantId: string,
    campaignId: string,
    status: CampaignStatus
  ): Promise<Result<CampaignRow>> {
    try {
      const now = new Date();
      let additionalFields = '';
      const params: any[] = [status, now];

      if (status === 'active') {
        additionalFields = ', published_at = $3';
        params.push(now);
      } else if (status === 'completed') {
        additionalFields = ', completed_at = $3';
        params.push(now);
      }

      params.push(tenantId, campaignId);

      const result = await this.pool.query<CampaignRow>(
        `UPDATE campaigns SET status = $1, updated_at = $2${additionalFields} WHERE tenant_id = $${params.length - 1} AND id = $${params.length} RETURNING *`,
        params
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Campaign not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update campaign status: ${error}`);
    }
  }

  /**
   * Delete campaign
   */
  async deleteCampaign(tenantId: string, campaignId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `DELETE FROM campaigns WHERE tenant_id = $1 AND id = $2`,
        [tenantId, campaignId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete campaign: ${error}`);
    }
  }

  // ============================================================================
  // AUDIENCE MANAGEMENT
  // ============================================================================

  /**
   * Create audience
   */
  async createAudience(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: 'static' | 'dynamic';
      rules?: AudienceRule[];
      ruleLogic?: 'and' | 'or';
      memberIds?: string[];
      refreshInterval?: number;
      autoRefresh?: boolean;
      tags?: string[];
    }
  ): Promise<Result<CampaignAudienceRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignAudienceRow>(
        `INSERT INTO campaign_audiences (
          id, tenant_id, name, description, type, rules, rule_logic, member_ids,
          member_count, refresh_interval, auto_refresh, tags, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          id,
          tenantId,
          input.name,
          input.description ?? null,
          input.type,
          JSON.stringify(input.rules ?? []),
          input.ruleLogic ?? 'and',
          JSON.stringify(input.memberIds ?? []),
          input.memberIds?.length ?? 0,
          input.refreshInterval ?? null,
          input.autoRefresh ?? false,
          JSON.stringify(input.tags ?? []),
          userId,
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create audience: ${error}`);
    }
  }

  /**
   * Get audience by ID
   */
  async getAudienceById(tenantId: string, audienceId: string): Promise<Result<CampaignAudienceRow | null>> {
    try {
      const result = await this.pool.query<CampaignAudienceRow>(
        `SELECT * FROM campaign_audiences WHERE tenant_id = $1 AND id = $2`,
        [tenantId, audienceId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get audience: ${error}`);
    }
  }

  /**
   * Get all audiences
   */
  async getAudiences(tenantId: string): Promise<Result<CampaignAudienceRow[]>> {
    try {
      const result = await this.pool.query<CampaignAudienceRow>(
        `SELECT * FROM campaign_audiences WHERE tenant_id = $1 ORDER BY created_at DESC`,
        [tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows);
    } catch (error) {
      return Result.fail(`Failed to get audiences: ${error}`);
    }
  }

  /**
   * Update audience member count
   */
  async updateAudienceMemberCount(
    tenantId: string,
    audienceId: string,
    memberCount: number
  ): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `UPDATE campaign_audiences SET member_count = $1, last_calculated_at = $2, updated_at = $2 WHERE tenant_id = $3 AND id = $4`,
        [memberCount, new Date(), tenantId, audienceId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to update audience member count: ${error}`);
    }
  }

  // ============================================================================
  // CAMPAIGN MESSAGES
  // ============================================================================

  /**
   * Create campaign message
   */
  async createMessage(
    tenantId: string,
    campaignId: string,
    input: {
      channel: ChannelType;
      name: string;
      subject?: string;
      previewText?: string;
      bodyHtml?: string;
      bodyText?: string;
      bodyJson?: Record<string, unknown>;
      templateId?: string;
      mergeFields?: MergeField[];
      isVariant?: boolean;
      variantName?: string;
      variantWeight?: number;
      sendAt?: Date;
      delayMinutes?: number;
    }
  ): Promise<Result<CampaignMessageRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignMessageRow>(
        `INSERT INTO campaign_messages (
          id, campaign_id, tenant_id, channel, name, subject, preview_text,
          body_html, body_text, body_json, template_id, merge_fields, is_variant,
          variant_name, variant_weight, send_at, delay_minutes, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          id,
          campaignId,
          tenantId,
          input.channel,
          input.name,
          input.subject ?? null,
          input.previewText ?? null,
          input.bodyHtml ?? null,
          input.bodyText ?? null,
          input.bodyJson ? JSON.stringify(input.bodyJson) : null,
          input.templateId ?? null,
          JSON.stringify(input.mergeFields ?? []),
          input.isVariant ?? false,
          input.variantName ?? null,
          input.variantWeight ?? null,
          input.sendAt ?? null,
          input.delayMinutes ?? null,
          'draft',
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create message: ${error}`);
    }
  }

  /**
   * Get campaign messages
   */
  async getCampaignMessages(tenantId: string, campaignId: string): Promise<Result<CampaignMessageRow[]>> {
    try {
      const result = await this.pool.query<CampaignMessageRow>(
        `SELECT * FROM campaign_messages WHERE tenant_id = $1 AND campaign_id = $2 ORDER BY created_at ASC`,
        [tenantId, campaignId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows);
    } catch (error) {
      return Result.fail(`Failed to get campaign messages: ${error}`);
    }
  }

  // ============================================================================
  // A/B TESTING
  // ============================================================================

  /**
   * Create A/B test
   */
  async createAbTest(
    tenantId: string,
    userId: string,
    campaignId: string,
    input: {
      name: string;
      testType: 'subject' | 'content' | 'from_name' | 'send_time' | 'full_message';
      variants: ABTestVariant[];
      sampleSize?: number;
      winnerCriteria?: 'open_rate' | 'click_rate' | 'conversion_rate' | 'revenue';
      testDurationHours?: number;
    }
  ): Promise<Result<CampaignAbTestRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignAbTestRow>(
        `INSERT INTO campaign_ab_tests (
          id, campaign_id, tenant_id, name, status, test_type, variants,
          sample_size, winner_criteria, test_duration_hours, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          id,
          campaignId,
          tenantId,
          input.name,
          'draft',
          input.testType,
          JSON.stringify(input.variants),
          input.sampleSize ?? 20,
          input.winnerCriteria ?? 'open_rate',
          input.testDurationHours ?? 4,
          userId,
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create A/B test: ${error}`);
    }
  }

  /**
   * Start A/B test
   */
  async startAbTest(tenantId: string, testId: string): Promise<Result<CampaignAbTestRow>> {
    try {
      const now = new Date();
      const result = await this.pool.query<CampaignAbTestRow>(
        `UPDATE campaign_ab_tests SET status = $1, started_at = $2, updated_at = $2 WHERE tenant_id = $3 AND id = $4 RETURNING *`,
        ['running', now, tenantId, testId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('A/B test not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to start A/B test: ${error}`);
    }
  }

  /**
   * Declare A/B test winner
   */
  async declareAbTestWinner(
    tenantId: string,
    testId: string,
    winnerId: string,
    declaredBy: 'automatic' | 'manual'
  ): Promise<Result<CampaignAbTestRow>> {
    try {
      const now = new Date();
      const result = await this.pool.query<CampaignAbTestRow>(
        `UPDATE campaign_ab_tests SET status = $1, winner_id = $2, winner_declared_at = $3, winner_declared_by = $4, completed_at = $3, updated_at = $3 WHERE tenant_id = $5 AND id = $6 RETURNING *`,
        ['completed', winnerId, now, declaredBy, tenantId, testId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('A/B test not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to declare A/B test winner: ${error}`);
    }
  }

  // ============================================================================
  // CAMPAIGN SENDING
  // ============================================================================

  /**
   * Record campaign send
   */
  async recordSend(
    tenantId: string,
    campaignId: string,
    messageId: string,
    input: {
      recipientId: string;
      recipientEmail?: string;
      recipientPhone?: string;
      channel: ChannelType;
      variantId?: string;
      externalId?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Result<CampaignSendRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignSendRow>(
        `INSERT INTO campaign_sends (
          id, campaign_id, message_id, tenant_id, recipient_id, recipient_email,
          recipient_phone, channel, status, variant_id, external_id, metadata, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          id,
          campaignId,
          messageId,
          tenantId,
          input.recipientId,
          input.recipientEmail ?? null,
          input.recipientPhone ?? null,
          input.channel,
          'pending',
          input.variantId ?? null,
          input.externalId ?? null,
          JSON.stringify(input.metadata ?? {}),
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to record send: ${error}`);
    }
  }

  /**
   * Update send status
   */
  async updateSendStatus(
    tenantId: string,
    sendId: string,
    status: string,
    additionalData?: {
      externalId?: string;
      messageIdExternal?: string;
      bounceType?: string;
      bounceReason?: string;
      failureReason?: string;
    }
  ): Promise<Result<CampaignSendRow>> {
    try {
      const timestampMap: Record<string, string> = {
        sent: 'sent_at',
        delivered: 'delivered_at',
        opened: 'opened_at',
        clicked: 'clicked_at',
        bounced: 'bounced_at',
        failed: 'failed_at',
      };

      const setClauses: string[] = ['status = $1'];
      const params: any[] = [status];
      let paramIndex = 2;

      if (timestampMap[status]) {
        setClauses.push(`${timestampMap[status]} = $${paramIndex}`);
        params.push(new Date());
        paramIndex++;
      }

      if (additionalData) {
        if (additionalData.externalId) {
          setClauses.push(`external_id = $${paramIndex}`);
          params.push(additionalData.externalId);
          paramIndex++;
        }
        if (additionalData.messageIdExternal) {
          setClauses.push(`message_id_external = $${paramIndex}`);
          params.push(additionalData.messageIdExternal);
          paramIndex++;
        }
        if (additionalData.bounceType) {
          setClauses.push(`bounce_type = $${paramIndex}`);
          params.push(additionalData.bounceType);
          paramIndex++;
        }
        if (additionalData.bounceReason) {
          setClauses.push(`bounce_reason = $${paramIndex}`);
          params.push(additionalData.bounceReason);
          paramIndex++;
        }
        if (additionalData.failureReason) {
          setClauses.push(`failure_reason = $${paramIndex}`);
          params.push(additionalData.failureReason);
          paramIndex++;
        }
      }

      params.push(tenantId, sendId);

      const result = await this.pool.query<CampaignSendRow>(
        `UPDATE campaign_sends SET ${setClauses.join(', ')} WHERE tenant_id = $${paramIndex} AND id = $${paramIndex + 1} RETURNING *`,
        params
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Send not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update send status: ${error}`);
    }
  }

  /**
   * Record click
   */
  async recordClick(
    tenantId: string,
    sendId: string,
    campaignId: string,
    input: {
      url: string;
      linkId?: string;
      linkName?: string;
      deviceType?: string;
      browser?: string;
      os?: string;
      ip?: string;
      country?: string;
      city?: string;
    }
  ): Promise<Result<CampaignClickRow>> {
    try {
      const now = new Date();

      // Update send status to clicked
      const updateResult = await this.pool.query(
        `UPDATE campaign_sends SET status = $1, clicked_at = $2 WHERE id = $3`,
        ['clicked', now, sendId]
      );

      if (updateResult.isFailure) {
        return Result.fail(updateResult.error!);
      }

      const id = uuidv4();
      const result = await this.pool.query<CampaignClickRow>(
        `INSERT INTO campaign_clicks (
          id, send_id, campaign_id, tenant_id, url, link_id, link_name,
          clicked_at, device_type, browser, os, ip, country, city
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        RETURNING *`,
        [
          id,
          sendId,
          campaignId,
          tenantId,
          input.url,
          input.linkId ?? null,
          input.linkName ?? null,
          now,
          input.deviceType ?? null,
          input.browser ?? null,
          input.os ?? null,
          input.ip ?? null,
          input.country ?? null,
          input.city ?? null,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to record click: ${error}`);
    }
  }

  /**
   * Record conversion
   */
  async recordConversion(
    tenantId: string,
    sendId: string,
    campaignId: string,
    input: {
      recipientId: string;
      conversionType: string;
      conversionValue?: number;
      currency?: string;
      attributionModel?: 'first_touch' | 'last_touch' | 'linear' | 'time_decay';
      attributionWeight?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Result<CampaignConversionRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignConversionRow>(
        `INSERT INTO campaign_conversions (
          id, send_id, campaign_id, tenant_id, recipient_id, conversion_type,
          conversion_value, currency, attribution_model, attribution_weight, converted_at, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          id,
          sendId,
          campaignId,
          tenantId,
          input.recipientId,
          input.conversionType,
          input.conversionValue ?? null,
          input.currency ?? null,
          input.attributionModel ?? 'last_touch',
          input.attributionWeight ?? null,
          now,
          JSON.stringify(input.metadata ?? {}),
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to record conversion: ${error}`);
    }
  }

  // ============================================================================
  // SUPPRESSION LISTS
  // ============================================================================

  /**
   * Create suppression list
   */
  async createSuppressionList(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type: 'manual' | 'unsubscribed' | 'bounced' | 'complained' | 'imported';
    }
  ): Promise<Result<SuppressionListRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<SuppressionListRow>(
        `INSERT INTO suppression_lists (
          id, tenant_id, name, description, type, member_count, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [id, tenantId, input.name, input.description ?? null, input.type, 0, userId, now, now]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create suppression list: ${error}`);
    }
  }

  /**
   * Add to suppression list
   */
  async addToSuppressionList(
    tenantId: string,
    userId: string,
    listId: string,
    entries: { email?: string; phone?: string; contactId?: string; reason?: string; source?: string }[]
  ): Promise<Result<number>> {
    try {
      const now = new Date();

      for (const entry of entries) {
        const id = uuidv4();
        const insertResult = await this.pool.query(
          `INSERT INTO suppression_entries (
            id, list_id, tenant_id, email, phone, contact_id, reason, source, added_at, added_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT DO NOTHING`,
          [
            id,
            listId,
            tenantId,
            entry.email ?? null,
            entry.phone ?? null,
            entry.contactId ?? null,
            entry.reason ?? null,
            entry.source ?? null,
            now,
            userId,
          ]
        );

        if (insertResult.isFailure) {
          return Result.fail(insertResult.error!);
        }
      }

      // Update member count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM suppression_entries WHERE list_id = $1`,
        [listId]
      );

      if (countResult.isFailure) {
        return Result.fail(countResult.error!);
      }

      const updateResult = await this.pool.query(
        `UPDATE suppression_lists SET member_count = $1, updated_at = $2 WHERE id = $3`,
        [parseInt(countResult.getValue().rows[0]?.count ?? '0', 10), now, listId]
      );

      if (updateResult.isFailure) {
        return Result.fail(updateResult.error!);
      }

      return Result.ok(entries.length);
    } catch (error) {
      return Result.fail(`Failed to add to suppression list: ${error}`);
    }
  }

  /**
   * Check if email is suppressed
   */
  async isEmailSuppressed(tenantId: string, email: string): Promise<Result<boolean>> {
    try {
      const result = await this.pool.query<SuppressionEntryRow>(
        `SELECT id FROM suppression_entries WHERE tenant_id = $1 AND email = $2 LIMIT 1`,
        [tenantId, email]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows.length > 0);
    } catch (error) {
      return Result.fail(`Failed to check suppression: ${error}`);
    }
  }

  // ============================================================================
  // EMAIL TEMPLATES
  // ============================================================================

  /**
   * Create email template
   */
  async createEmailTemplate(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      description?: string;
      type?: 'marketing' | 'transactional' | 'notification' | 'system';
      category?: string;
      subject?: string;
      previewText?: string;
      bodyHtml: string;
      bodyText?: string;
      designJson?: Record<string, unknown>;
      thumbnailUrl?: string;
      mergeFields?: MergeField[];
      isPublic?: boolean;
      tags?: string[];
    }
  ): Promise<Result<CampaignEmailTemplateRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignEmailTemplateRow>(
        `INSERT INTO campaign_email_templates (
          id, tenant_id, name, description, type, category, subject, preview_text,
          body_html, body_text, design_json, thumbnail_url, merge_fields,
          is_public, is_default, tags, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        RETURNING *`,
        [
          id,
          tenantId,
          input.name,
          input.description ?? null,
          input.type ?? 'marketing',
          input.category ?? null,
          input.subject ?? null,
          input.previewText ?? null,
          input.bodyHtml,
          input.bodyText ?? null,
          input.designJson ? JSON.stringify(input.designJson) : null,
          input.thumbnailUrl ?? null,
          JSON.stringify(input.mergeFields ?? []),
          input.isPublic ?? false,
          false,
          JSON.stringify(input.tags ?? []),
          userId,
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create email template: ${error}`);
    }
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(
    tenantId: string,
    options?: { type?: string; category?: string }
  ): Promise<Result<CampaignEmailTemplateRow[]>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: any[] = [tenantId];
      let paramIndex = 2;

      if (options?.type) {
        conditions.push(`type = $${paramIndex}`);
        params.push(options.type);
        paramIndex++;
      }

      if (options?.category) {
        conditions.push(`category = $${paramIndex}`);
        params.push(options.category);
      }

      const result = await this.pool.query<CampaignEmailTemplateRow>(
        `SELECT * FROM campaign_email_templates WHERE ${conditions.join(' AND ')} ORDER BY created_at DESC`,
        params
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows);
    } catch (error) {
      return Result.fail(`Failed to get email templates: ${error}`);
    }
  }

  // ============================================================================
  // FOLDERS
  // ============================================================================

  /**
   * Create folder
   */
  async createFolder(
    tenantId: string,
    userId: string,
    input: {
      name: string;
      parentId?: string;
      color?: string;
    }
  ): Promise<Result<CampaignFolderRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<CampaignFolderRow>(
        `INSERT INTO campaign_folders (
          id, tenant_id, name, parent_id, color, campaign_count, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [id, tenantId, input.name, input.parentId ?? null, input.color ?? null, 0, userId, now, now]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create folder: ${error}`);
    }
  }

  /**
   * Get folders
   */
  async getFolders(tenantId: string): Promise<Result<CampaignFolderRow[]>> {
    try {
      const result = await this.pool.query<CampaignFolderRow>(
        `SELECT * FROM campaign_folders WHERE tenant_id = $1 ORDER BY name ASC`,
        [tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows);
    } catch (error) {
      return Result.fail(`Failed to get folders: ${error}`);
    }
  }

  // ============================================================================
  // ANALYTICS
  // ============================================================================

  /**
   * Get or create campaign analytics
   */
  async getOrCreateAnalytics(tenantId: string, campaignId: string): Promise<Result<CampaignAnalyticsRow>> {
    try {
      let result = await this.pool.query<CampaignAnalyticsRow>(
        `SELECT * FROM campaign_analytics WHERE campaign_id = $1`,
        [campaignId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        const id = uuidv4();
        result = await this.pool.query<CampaignAnalyticsRow>(
          `INSERT INTO campaign_analytics (
            id, campaign_id, tenant_id, total_sent, total_delivered, total_bounced, total_failed,
            unique_opens, total_opens, unique_clicks, total_clicks, delivery_rate, bounce_rate,
            open_rate, click_rate, click_to_open_rate, unsubscribes, complaints, unsubscribe_rate,
            complaint_rate, conversions, conversion_rate, revenue, revenue_per_recipient, last_updated_at
          ) VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, $4)
          RETURNING *`,
          [id, campaignId, tenantId, new Date()]
        );

        if (result.isFailure) {
          return Result.fail(result.error!);
        }
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to get/create analytics: ${error}`);
    }
  }

  /**
   * Update campaign analytics
   */
  async updateAnalytics(campaignId: string): Promise<Result<CampaignAnalyticsRow>> {
    try {
      // Calculate metrics from sends
      const metricsResult = await this.pool.query<{
        total_sent: string;
        total_delivered: string;
        total_bounced: string;
        total_failed: string;
        unique_opens: string;
        unique_clicks: string;
        unsubscribes: string;
        complaints: string;
      }>(
        `SELECT
          COUNT(CASE WHEN status IN ('sent', 'delivered', 'opened', 'clicked') THEN 1 END) as total_sent,
          COUNT(CASE WHEN status IN ('delivered', 'opened', 'clicked') THEN 1 END) as total_delivered,
          COUNT(CASE WHEN status = 'bounced' THEN 1 END) as total_bounced,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as total_failed,
          COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as unique_opens,
          COUNT(CASE WHEN clicked_at IS NOT NULL THEN 1 END) as unique_clicks,
          COUNT(CASE WHEN status = 'unsubscribed' THEN 1 END) as unsubscribes,
          COUNT(CASE WHEN status = 'complained' THEN 1 END) as complaints
        FROM campaign_sends WHERE campaign_id = $1`,
        [campaignId]
      );

      if (metricsResult.isFailure) {
        return Result.fail(metricsResult.error!);
      }

      const metrics = metricsResult.getValue().rows[0];

      // Calculate conversions
      const conversionResult = await this.pool.query<{ conversions: string; revenue: string }>(
        `SELECT COUNT(*) as conversions, COALESCE(SUM(conversion_value), 0) as revenue FROM campaign_conversions WHERE campaign_id = $1`,
        [campaignId]
      );

      if (conversionResult.isFailure) {
        return Result.fail(conversionResult.error!);
      }

      const conversionMetrics = conversionResult.getValue().rows[0];

      // Calculate rates
      const totalSent = parseInt(metrics?.total_sent ?? '0', 10);
      const totalDelivered = parseInt(metrics?.total_delivered ?? '0', 10);
      const totalBounced = parseInt(metrics?.total_bounced ?? '0', 10);
      const totalFailed = parseInt(metrics?.total_failed ?? '0', 10);
      const uniqueOpens = parseInt(metrics?.unique_opens ?? '0', 10);
      const uniqueClicks = parseInt(metrics?.unique_clicks ?? '0', 10);
      const unsubscribes = parseInt(metrics?.unsubscribes ?? '0', 10);
      const complaints = parseInt(metrics?.complaints ?? '0', 10);
      const conversions = parseInt(conversionMetrics?.conversions ?? '0', 10);
      const revenue = parseFloat(conversionMetrics?.revenue ?? '0');

      const deliveryRate = totalSent > 0 ? (totalDelivered / totalSent) * 100 : 0;
      const bounceRate = totalSent > 0 ? (totalBounced / totalSent) * 100 : 0;
      const openRate = totalDelivered > 0 ? (uniqueOpens / totalDelivered) * 100 : 0;
      const clickRate = totalDelivered > 0 ? (uniqueClicks / totalDelivered) * 100 : 0;
      const clickToOpenRate = uniqueOpens > 0 ? (uniqueClicks / uniqueOpens) * 100 : 0;
      const unsubscribeRate = totalDelivered > 0 ? (unsubscribes / totalDelivered) * 100 : 0;
      const complaintRate = totalDelivered > 0 ? (complaints / totalDelivered) * 100 : 0;
      const conversionRate = totalDelivered > 0 ? (conversions / totalDelivered) * 100 : 0;
      const revenuePerRecipient = totalDelivered > 0 ? revenue / totalDelivered : 0;

      const result = await this.pool.query<CampaignAnalyticsRow>(
        `UPDATE campaign_analytics SET
          total_sent = $1, total_delivered = $2, total_bounced = $3, total_failed = $4,
          unique_opens = $5, total_opens = $5, unique_clicks = $6, total_clicks = $6,
          delivery_rate = $7, bounce_rate = $8, open_rate = $9, click_rate = $10,
          click_to_open_rate = $11, unsubscribes = $12, complaints = $13,
          unsubscribe_rate = $14, complaint_rate = $15, conversions = $16,
          conversion_rate = $17, revenue = $18, revenue_per_recipient = $19, last_updated_at = $20
        WHERE campaign_id = $21
        RETURNING *`,
        [
          totalSent, totalDelivered, totalBounced, totalFailed,
          uniqueOpens, uniqueClicks, deliveryRate, bounceRate,
          openRate, clickRate, clickToOpenRate, unsubscribes,
          complaints, unsubscribeRate, complaintRate, conversions,
          conversionRate, revenue, revenuePerRecipient, new Date(), campaignId,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update analytics: ${error}`);
    }
  }

  /**
   * Get campaign dashboard
   */
  async getDashboard(tenantId: string): Promise<Result<CampaignDashboard>> {
    try {
      // Campaign counts
      const campaignCounts = await this.pool.query<{
        total: string;
        active: string;
        scheduled: string;
        draft: string;
      }>(
        `SELECT
          COUNT(*) as total,
          COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
          COUNT(CASE WHEN status = 'scheduled' THEN 1 END) as scheduled,
          COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft
        FROM campaigns WHERE tenant_id = $1`,
        [tenantId]
      );

      if (campaignCounts.isFailure) {
        return Result.fail(campaignCounts.error!);
      }

      // Last 30 days performance
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const performanceResult = await this.pool.query<{
        total_sent: string;
        avg_open_rate: string;
        avg_click_rate: string;
        avg_conversion_rate: string;
        total_revenue: string;
      }>(
        `SELECT
          COALESCE(SUM(ca.total_sent), 0) as total_sent,
          COALESCE(AVG(ca.open_rate), 0) as avg_open_rate,
          COALESCE(AVG(ca.click_rate), 0) as avg_click_rate,
          COALESCE(AVG(ca.conversion_rate), 0) as avg_conversion_rate,
          COALESCE(SUM(ca.revenue), 0) as total_revenue
        FROM campaign_analytics ca
        INNER JOIN campaigns c ON c.id = ca.campaign_id
        WHERE c.tenant_id = $1 AND c.published_at >= $2`,
        [tenantId, thirtyDaysAgo]
      );

      if (performanceResult.isFailure) {
        return Result.fail(performanceResult.error!);
      }

      const performance = performanceResult.getValue().rows[0];

      // Budget
      const budgetResult = await this.pool.query<{
        total_budget: string;
        total_spent: string;
      }>(
        `SELECT
          COALESCE(SUM(budget_amount), 0) as total_budget,
          COALESCE(SUM(budget_spent), 0) as total_spent
        FROM campaigns
        WHERE tenant_id = $1 AND status IN ('active', 'scheduled')`,
        [tenantId]
      );

      if (budgetResult.isFailure) {
        return Result.fail(budgetResult.error!);
      }

      const budget = budgetResult.getValue().rows[0];
      const counts = campaignCounts.getValue().rows[0];

      // Recent campaigns (last 5)
      const recentResult = await this.pool.query<CampaignRow>(
        `SELECT * FROM campaigns
         WHERE tenant_id = $1
         ORDER BY created_at DESC
         LIMIT 5`,
        [tenantId]
      );

      const recentCampaigns = recentResult.isSuccess
        ? recentResult.getValue().rows.map((row) => this.mapCampaignRow(row))
        : [];

      return Result.ok({
        tenantId,
        totalCampaigns: parseInt(counts?.total ?? '0', 10),
        activeCampaigns: parseInt(counts?.active ?? '0', 10),
        scheduledCampaigns: parseInt(counts?.scheduled ?? '0', 10),
        draftCampaigns: parseInt(counts?.draft ?? '0', 10),
        totalSent: parseInt(performance?.total_sent ?? '0', 10),
        averageOpenRate: parseFloat(performance?.avg_open_rate ?? '0'),
        averageClickRate: parseFloat(performance?.avg_click_rate ?? '0'),
        averageConversionRate: parseFloat(performance?.avg_conversion_rate ?? '0'),
        totalRevenue: parseFloat(performance?.total_revenue ?? '0'),
        sendTrend: [],
        openRateTrend: [],
        clickRateTrend: [],
        topCampaignsByOpens: [],
        topCampaignsByClicks: [],
        topCampaignsByConversions: [],
        totalSubscribers: 0,
        subscriberGrowth: 0,
        unsubscribeRate: 0,
        bounceRate: 0,
        totalBudget: parseFloat(budget?.total_budget ?? '0'),
        totalSpent: parseFloat(budget?.total_spent ?? '0'),
        budgetRemaining: parseFloat(budget?.total_budget ?? '0') - parseFloat(budget?.total_spent ?? '0'),
        recentCampaigns,
      });
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  // ============================================================================
  // AUTOMATION
  // ============================================================================

  /**
   * Create automation trigger
   */
  async createAutomationTrigger(
    tenantId: string,
    campaignId: string,
    input: {
      triggerType: string;
      triggerEvent?: string;
      triggerConditions?: AudienceRule[];
      delayType?: 'none' | 'fixed' | 'until_time';
      delayMinutes?: number;
      delayUntilHour?: number;
      delayUntilDay?: number;
    }
  ): Promise<Result<AutomationTriggerRow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<AutomationTriggerRow>(
        `INSERT INTO automation_triggers (
          id, campaign_id, tenant_id, trigger_type, trigger_event, trigger_conditions,
          delay_type, delay_minutes, delay_until_hour, delay_until_day, is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          id,
          campaignId,
          tenantId,
          input.triggerType,
          input.triggerEvent ?? null,
          JSON.stringify(input.triggerConditions ?? []),
          input.delayType ?? 'none',
          input.delayMinutes ?? null,
          input.delayUntilHour ?? null,
          input.delayUntilDay ?? null,
          true,
          now,
          now,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create automation trigger: ${error}`);
    }
  }

  /**
   * Get campaign triggers
   */
  async getCampaignTriggers(tenantId: string, campaignId: string): Promise<Result<AutomationTriggerRow[]>> {
    try {
      const result = await this.pool.query<AutomationTriggerRow>(
        `SELECT * FROM automation_triggers WHERE tenant_id = $1 AND campaign_id = $2 ORDER BY created_at ASC`,
        [tenantId, campaignId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      return Result.ok(result.getValue().rows);
    } catch (error) {
      return Result.fail(`Failed to get campaign triggers: ${error}`);
    }
  }

  // ============================================================================
  // FRONTEND COMPATIBILITY METHODS
  // ============================================================================

  /**
   * Duplicate campaign
   */
  async duplicateCampaign(
    tenantId: string,
    userId: string,
    campaignId: string,
    newName?: string
  ): Promise<Result<CampaignRow>> {
    try {
      // Get the original campaign
      const originalResult = await this.getCampaignById(tenantId, campaignId);
      if (originalResult.isFailure) {
        return Result.fail(originalResult.error!);
      }

      const original = originalResult.value;
      if (!original) {
        return Result.fail('Campaign not found');
      }

      // Create a copy with new ID and name
      const id = uuidv4();
      const now = new Date();
      const duplicatedName = newName || `${original.name} (copia)`;

      const result = await this.pool.query<CampaignRow>(
        `INSERT INTO campaigns (
          id, tenant_id, name, description, type, status, goal_type, channels,
          primary_channel, start_date, end_date, timezone, audience_id, audience_name,
          budget_amount, budget_currency, budget_spent, goals, utm_source, utm_medium,
          utm_campaign, utm_term, utm_content, subject, preview_text, from_name,
          from_email, reply_to, template_id, settings, tags, folder_id, owner_id,
          owner_name, custom_fields, created_by, created_at, updated_at
        ) SELECT
          $1, tenant_id, $2, description, type, 'draft', goal_type, channels,
          primary_channel, NULL, NULL, timezone, audience_id, audience_name,
          budget_amount, budget_currency, 0, goals, utm_source, utm_medium,
          $3, utm_term, utm_content, subject, preview_text, from_name,
          from_email, reply_to, template_id, settings, tags, folder_id, owner_id,
          owner_name, custom_fields, $4, $5, $5
        FROM campaigns WHERE id = $6 AND tenant_id = $7
        RETURNING *`,
        [
          id,
          duplicatedName,
          duplicatedName.toLowerCase().replace(/\s+/g, '-'),
          userId,
          now,
          campaignId,
          tenantId,
        ]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Failed to duplicate campaign');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to duplicate campaign: ${error}`);
    }
  }

  /**
   * Preview recipients based on filters
   */
  async previewRecipients(
    tenantId: string,
    filters: {
      entityType: 'customer' | 'lead' | 'all';
      status?: string[];
      tier?: string[];
      tags?: string[];
      limit?: number;
    }
  ): Promise<Result<{ recipients: any[]; total: number; hasMore: boolean }>> {
    try {
      const limit = filters.limit || 10;
      const recipients: any[] = [];

      // Get customers if needed
      if (filters.entityType === 'customer' || filters.entityType === 'all') {
        const customerConditions: string[] = ['tenant_id = $1'];
        const customerParams: any[] = [tenantId];
        let paramIndex = 2;

        if (filters.status && filters.status.length > 0) {
          customerConditions.push(`status = ANY($${paramIndex})`);
          customerParams.push(filters.status);
          paramIndex++;
        }

        if (filters.tier && filters.tier.length > 0) {
          customerConditions.push(`tier = ANY($${paramIndex})`);
          customerParams.push(filters.tier);
          paramIndex++;
        }

        customerParams.push(limit);

        const customersResult = await this.pool.query<any>(
          `SELECT id, company_name as name, email, 'customer' as entity_type, tier, status
           FROM customers WHERE ${customerConditions.join(' AND ')}
           AND email IS NOT NULL
           LIMIT $${paramIndex}`,
          customerParams
        );

        if (customersResult.isFailure) {
          return Result.fail(customersResult.error!);
        }

        recipients.push(...customersResult.getValue().rows);
      }

      // Get leads if needed
      if (filters.entityType === 'lead' || filters.entityType === 'all') {
        const leadConditions: string[] = ['tenant_id = $1'];
        const leadParams: any[] = [tenantId];
        let paramIndex = 2;

        if (filters.status && filters.status.length > 0) {
          leadConditions.push(`status = ANY($${paramIndex})`);
          leadParams.push(filters.status);
          paramIndex++;
        }

        leadParams.push(limit);

        const leadsResult = await this.pool.query<any>(
          `SELECT id, company_name as name, email, 'lead' as entity_type, status
           FROM leads WHERE ${leadConditions.join(' AND ')}
           AND email IS NOT NULL
           LIMIT $${paramIndex}`,
          leadParams
        );

        if (leadsResult.isFailure) {
          return Result.fail(leadsResult.error!);
        }

        recipients.push(...leadsResult.getValue().rows);
      }

      // Get total count
      const totalResult = await this.countRecipients(tenantId, filters);
      if (totalResult.isFailure) {
        return Result.fail(totalResult.error!);
      }

      return Result.ok({
        recipients: recipients.slice(0, limit),
        total: totalResult.value ?? 0,
        hasMore: (totalResult.value ?? 0) > limit,
      });
    } catch (error) {
      return Result.fail(`Failed to preview recipients: ${error}`);
    }
  }

  /**
   * Count recipients based on filters
   */
  async countRecipients(
    tenantId: string,
    filters: {
      entityType: 'customer' | 'lead' | 'all';
      status?: string[];
      tier?: string[];
      tags?: string[];
    }
  ): Promise<Result<number>> {
    try {
      let totalCount = 0;

      // Count customers if needed
      if (filters.entityType === 'customer' || filters.entityType === 'all') {
        const customerConditions: string[] = ['tenant_id = $1', 'email IS NOT NULL'];
        const customerParams: any[] = [tenantId];
        let paramIndex = 2;

        if (filters.status && filters.status.length > 0) {
          customerConditions.push(`status = ANY($${paramIndex})`);
          customerParams.push(filters.status);
          paramIndex++;
        }

        if (filters.tier && filters.tier.length > 0) {
          customerConditions.push(`tier = ANY($${paramIndex})`);
          customerParams.push(filters.tier);
        }

        const customersResult = await this.pool.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM customers WHERE ${customerConditions.join(' AND ')}`,
          customerParams
        );

        if (customersResult.isFailure) {
          return Result.fail(customersResult.error!);
        }

        totalCount += parseInt(customersResult.getValue().rows[0]?.count ?? '0', 10);
      }

      // Count leads if needed
      if (filters.entityType === 'lead' || filters.entityType === 'all') {
        const leadConditions: string[] = ['tenant_id = $1', 'email IS NOT NULL'];
        const leadParams: any[] = [tenantId];
        let paramIndex = 2;

        if (filters.status && filters.status.length > 0) {
          leadConditions.push(`status = ANY($${paramIndex})`);
          leadParams.push(filters.status);
        }

        const leadsResult = await this.pool.query<{ count: string }>(
          `SELECT COUNT(*) as count FROM leads WHERE ${leadConditions.join(' AND ')}`,
          leadParams
        );

        if (leadsResult.isFailure) {
          return Result.fail(leadsResult.error!);
        }

        totalCount += parseInt(leadsResult.getValue().rows[0]?.count ?? '0', 10);
      }

      return Result.ok(totalCount);
    } catch (error) {
      return Result.fail(`Failed to count recipients: ${error}`);
    }
  }

  /**
   * Get campaign recipients (from campaign_sends)
   */
  async getCampaignRecipients(
    tenantId: string,
    campaignId: string,
    pagination: { page: number; limit: number }
  ): Promise<Result<{ recipients: CampaignSendRow[]; total: number; hasMore: boolean }>> {
    try {
      const offset = (pagination.page - 1) * pagination.limit;

      // Get count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM campaign_sends WHERE tenant_id = $1 AND campaign_id = $2`,
        [tenantId, campaignId]
      );

      if (countResult.isFailure) {
        return Result.fail(countResult.error!);
      }

      const total = parseInt(countResult.getValue().rows[0]?.count ?? '0', 10);

      // Get recipients
      const recipientsResult = await this.pool.query<CampaignSendRow>(
        `SELECT * FROM campaign_sends WHERE tenant_id = $1 AND campaign_id = $2
         ORDER BY created_at DESC LIMIT $3 OFFSET $4`,
        [tenantId, campaignId, pagination.limit, offset]
      );

      if (recipientsResult.isFailure) {
        return Result.fail(recipientsResult.error!);
      }

      return Result.ok({
        recipients: recipientsResult.getValue().rows,
        total,
        hasMore: offset + pagination.limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to get campaign recipients: ${error}`);
    }
  }

  /**
   * Send campaign (schedule or send immediately)
   */
  async sendCampaign(
    tenantId: string,
    userId: string,
    campaignId: string,
    options: { sendNow?: boolean; scheduledAt?: string }
  ): Promise<Result<{ success: boolean; campaignId: string; recipientCount: number; scheduledAt?: string }>> {
    try {
      // Validate campaign exists and is ready to send
      const campaignResult = await this.getCampaignById(tenantId, campaignId);
      if (campaignResult.isFailure) {
        return Result.fail(campaignResult.error!);
      }

      const campaign = campaignResult.value;
      if (!campaign) {
        return Result.fail('Campaign not found');
      }

      if (campaign.status !== 'draft' && campaign.status !== 'scheduled') {
        return Result.fail(`Cannot send campaign with status: ${campaign.status}`);
      }

      const now = new Date();
      let newStatus: CampaignStatus = 'scheduled';
      let scheduledAt: Date | null = null;

      if (options.sendNow) {
        newStatus = 'active';
        scheduledAt = now;
      } else if (options.scheduledAt) {
        scheduledAt = new Date(options.scheduledAt);
        if (scheduledAt < now) {
          return Result.fail('Scheduled time must be in the future');
        }
      } else {
        return Result.fail('Either sendNow or scheduledAt is required');
      }

      // Update campaign status
      const updateResult = await this.pool.query<CampaignRow>(
        `UPDATE campaigns SET status = $1, start_date = $2, updated_at = $3, published_at = $4
         WHERE id = $5 AND tenant_id = $6 RETURNING *`,
        [newStatus, scheduledAt, now, options.sendNow ? now : null, campaignId, tenantId]
      );

      if (updateResult.isFailure) {
        return Result.fail(updateResult.error!);
      }

      // Count recipients based on audience
      let recipientCount = 0;
      if (campaign.audience_id) {
        const audienceResult = await this.getAudienceById(tenantId, campaign.audience_id);
        if (audienceResult.value) {
          recipientCount = audienceResult.value.member_count;
        }
      }

      return Result.ok({
        success: true,
        campaignId,
        recipientCount,
        scheduledAt: scheduledAt?.toISOString(),
      });
    } catch (error) {
      return Result.fail(`Failed to send campaign: ${error}`);
    }
  }

  /**
   * Schedule campaign
   */
  async scheduleCampaign(
    tenantId: string,
    userId: string,
    campaignId: string,
    scheduledAt: string
  ): Promise<Result<CampaignRow>> {
    try {
      const scheduledDate = new Date(scheduledAt);
      const now = new Date();

      if (scheduledDate < now) {
        return Result.fail('Scheduled time must be in the future');
      }

      const result = await this.pool.query<CampaignRow>(
        `UPDATE campaigns SET status = 'scheduled', start_date = $1, updated_at = $2
         WHERE id = $3 AND tenant_id = $4 RETURNING *`,
        [scheduledDate, now, campaignId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Campaign not found');
      }

      return Result.ok(rows[0]);
    } catch (error) {
      return Result.fail(`Failed to schedule campaign: ${error}`);
    }
  }

  /**
   * Send test campaign
   */
  async sendTestCampaign(
    tenantId: string,
    userId: string,
    campaignId: string,
    testRecipients: string[]
  ): Promise<Result<{ success: boolean; sentTo: string[]; errors: string[] }>> {
    try {
      // Validate campaign exists
      const campaignResult = await this.getCampaignById(tenantId, campaignId);
      if (campaignResult.isFailure) {
        return Result.fail(campaignResult.error!);
      }

      const campaign = campaignResult.value;
      if (!campaign) {
        return Result.fail('Campaign not found');
      }

      // In a real implementation, this would send actual emails
      // For now, we just validate and return success
      const validEmails = testRecipients.filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
      const invalidEmails = testRecipients.filter((email) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

      return Result.ok({
        success: validEmails.length > 0,
        sentTo: validEmails,
        errors: invalidEmails.map((email) => `Invalid email: ${email}`),
      });
    } catch (error) {
      return Result.fail(`Failed to send test campaign: ${error}`);
    }
  }
}
