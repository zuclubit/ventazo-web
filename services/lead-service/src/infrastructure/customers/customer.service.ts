/**
 * Customer Service
 * Handles customer management and lead conversion operations
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  CustomerDTO,
  CustomerStatus,
  CustomerType,
  CustomerTier,
  CustomerAddress,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  ConvertLeadToCustomerRequest,
  CustomerFilterOptions,
  CustomerSortOptions,
  CustomerStatistics,
  CustomerRevenueSummary,
  BulkCustomerOperation,
  BulkCustomerResult,
  CustomerTimelineEntry,
  CustomerHealthScore,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';

@injectable()
export class CustomerService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
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

  /**
   * Create a new customer
   */
  async createCustomer(
    tenantId: string,
    request: CreateCustomerRequest,
    createdBy?: string
  ): Promise<Result<CustomerDTO>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      // Build metadata with additional fields
      const metadata = {
        tier: request.tier || CustomerTier.STANDARD,
        notes: request.notes || null,
        createdBy: createdBy || null,
      };

      const query = `
        INSERT INTO customers (
          id, tenant_id,
          name, company, email, phone, website,
          address, type, status,
          assigned_to,
          custom_fields, tags, metadata,
          acquisition_date, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *
      `;

      const values = [
        id,
        tenantId,
        request.companyName, // name (required)
        request.companyName, // company (same as name for now)
        request.email,
        request.phone || null,
        request.website || null,
        JSON.stringify(request.address || {}),
        request.type || CustomerType.COMPANY,
        CustomerStatus.ACTIVE,
        request.accountManagerId || null, // assigned_to
        JSON.stringify(request.customFields || {}),
        JSON.stringify(request.tags || []),
        JSON.stringify(metadata),
        now, // acquisition_date
        now,
        now,
      ];

      const result = await this.pool.query(query, values);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const row = result.getValue().rows[0];
      return Result.ok(this.mapRowToDTO(row));
    } catch (error) {
      return Result.fail(`Failed to create customer: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(
    tenantId: string,
    customerId: string
  ): Promise<Result<CustomerDTO>> {
    try {
      const query = `
        SELECT c.*,
          (SELECT COUNT(*) FROM opportunities WHERE customer_id = c.id) as opportunity_count,
          (SELECT COUNT(*) FROM tasks WHERE customer_id = c.id AND status != 'completed') as task_count
        FROM customers c
        WHERE c.id = $1 AND c.tenant_id = $2
      `;

      const result = await this.pool.query(query, [customerId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Customer not found');
      }

      return Result.ok(this.mapRowToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get customer: ${(error as Error).message}`);
    }
  }

  /**
   * Get customers with filters and pagination
   */
  async getCustomers(
    tenantId: string,
    filters?: CustomerFilterOptions,
    sort?: CustomerSortOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ customers: CustomerDTO[]; total: number; page: number; limit: number }>> {
    try {
      const conditions: string[] = ['c.tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (filters) {
        if (filters.status) {
          const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
          conditions.push(`c.status = ANY($${paramIndex})`);
          params.push(statuses);
          paramIndex++;
        }

        if (filters.type) {
          const types = Array.isArray(filters.type) ? filters.type : [filters.type];
          conditions.push(`c.type = ANY($${paramIndex})`);
          params.push(types);
          paramIndex++;
        }

        if (filters.tier) {
          const tiers = Array.isArray(filters.tier) ? filters.tier : [filters.tier];
          conditions.push(`c.tier = ANY($${paramIndex})`);
          params.push(tiers);
          paramIndex++;
        }

        if (filters.accountManagerId) {
          conditions.push(`c.account_manager_id = $${paramIndex}`);
          params.push(filters.accountManagerId);
          paramIndex++;
        }

        if (filters.hasRevenue === true) {
          conditions.push(`c.total_revenue > 0`);
        } else if (filters.hasRevenue === false) {
          conditions.push(`c.total_revenue = 0`);
        }

        if (filters.revenueMin !== undefined) {
          conditions.push(`c.total_revenue >= $${paramIndex}`);
          params.push(filters.revenueMin);
          paramIndex++;
        }

        if (filters.revenueMax !== undefined) {
          conditions.push(`c.total_revenue <= $${paramIndex}`);
          params.push(filters.revenueMax);
          paramIndex++;
        }

        if (filters.searchTerm) {
          conditions.push(`(c.name ILIKE $${paramIndex} OR c.company ILIKE $${paramIndex} OR c.email ILIKE $${paramIndex})`);
          params.push(`%${filters.searchTerm}%`);
          paramIndex++;
        }

        if (filters.tags && filters.tags.length > 0) {
          conditions.push(`c.tags ?| $${paramIndex}`);
          params.push(filters.tags);
          paramIndex++;
        }

        if (filters.convertedDateFrom) {
          conditions.push(`c.acquisition_date >= $${paramIndex}`);
          params.push(filters.convertedDateFrom);
          paramIndex++;
        }

        if (filters.convertedDateTo) {
          conditions.push(`c.acquisition_date <= $${paramIndex}`);
          params.push(filters.convertedDateTo);
          paramIndex++;
        }
      }

      // Build ORDER BY
      const sortColumn = this.getSortColumn(sort?.sortBy || 'createdAt');
      const sortOrder = sort?.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Pagination
      const safeLimit = Math.min(limit, 100);
      const offset = (page - 1) * safeLimit;

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM customers c
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(`Database error: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Data query
      const dataQuery = `
        SELECT c.*,
          (SELECT COUNT(*) FROM opportunities WHERE customer_id = c.id) as opportunity_count,
          (SELECT COUNT(*) FROM tasks WHERE customer_id = c.id AND status != 'completed') as task_count
        FROM customers c
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(safeLimit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) {
        return Result.fail(`Database error: ${dataResult.error}`);
      }

      const customers = dataResult.getValue().rows.map((row: Record<string, unknown>) => this.mapRowToDTO(row));

      return Result.ok({
        customers,
        total,
        page,
        limit: safeLimit,
      });
    } catch (error) {
      return Result.fail(`Failed to get customers: ${(error as Error).message}`);
    }
  }

  /**
   * Update customer
   */
  async updateCustomer(
    tenantId: string,
    customerId: string,
    request: UpdateCustomerRequest,
    updatedBy?: string
  ): Promise<Result<CustomerDTO>> {
    try {
      // Check if customer exists
      const existsResult = await this.getCustomerById(tenantId, customerId);
      if (existsResult.isFailure) {
        return Result.fail('Customer not found');
      }

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (request.companyName !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(request.companyName);
        paramIndex++;
        updates.push(`company = $${paramIndex}`);
        params.push(request.companyName);
        paramIndex++;
      }

      if (request.email !== undefined) {
        updates.push(`email = $${paramIndex}`);
        params.push(request.email);
        paramIndex++;
      }

      if (request.phone !== undefined) {
        updates.push(`phone = $${paramIndex}`);
        params.push(request.phone);
        paramIndex++;
      }

      if (request.website !== undefined) {
        updates.push(`website = $${paramIndex}`);
        params.push(request.website);
        paramIndex++;
      }

      if (request.address !== undefined) {
        updates.push(`address = $${paramIndex}`);
        params.push(JSON.stringify(request.address || {}));
        paramIndex++;
      }

      if (request.type !== undefined) {
        updates.push(`type = $${paramIndex}`);
        params.push(request.type);
        paramIndex++;
      }

      if (request.status !== undefined) {
        updates.push(`status = $${paramIndex}`);
        params.push(request.status);
        paramIndex++;
      }

      // Note: tier and notes are stored in metadata since they don't exist as direct columns
      // They will be handled through the metadata JSONB field
      if (request.accountManagerId !== undefined) {
        updates.push(`assigned_to = $${paramIndex}`);
        params.push(request.accountManagerId);
        paramIndex++;
      }

      if (request.customFields !== undefined) {
        updates.push(`custom_fields = $${paramIndex}`);
        params.push(JSON.stringify(request.customFields));
        paramIndex++;
      }

      if (request.tags !== undefined) {
        updates.push(`tags = $${paramIndex}`);
        params.push(JSON.stringify(request.tags));
        paramIndex++;
      }

      if (updates.length === 0) {
        return Result.fail('No fields to update');
      }

      updates.push(`updated_at = NOW()`);

      params.push(customerId, tenantId);

      const query = `
        UPDATE customers
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.pool.query(query, params);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Failed to update customer');
      }

      return Result.ok(this.mapRowToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update customer: ${(error as Error).message}`);
    }
  }

  /**
   * Convert lead to customer
   */
  async convertLeadToCustomer(
    tenantId: string,
    request: ConvertLeadToCustomerRequest,
    convertedBy?: string
  ): Promise<Result<{ customer: CustomerDTO; opportunityId?: string }>> {
    try {
      // Verify lead exists and get its data
      const leadQuery = `
        SELECT *
        FROM leads
        WHERE id = $1 AND tenant_id = $2
      `;

      const leadResult = await this.pool.query(leadQuery, [request.leadId, tenantId]);

      if (leadResult.isFailure) {
        return Result.fail(`Database error: ${leadResult.error}`);
      }

      if (leadResult.getValue().rows.length === 0) {
        return Result.fail('Lead not found');
      }

      const lead = leadResult.getValue().rows[0];

      // Check if lead is already converted
      if (lead.status === 'converted') {
        return Result.fail('Lead has already been converted');
      }

      // Create customer from lead data
      const customerId = crypto.randomUUID();
      const now = new Date();

      const customerQuery = `
        INSERT INTO customers (
          id, tenant_id, lead_id,
          company_name, email, phone, website,
          address, type, status, tier,
          account_manager_id, notes,
          custom_fields, tags,
          converted_at, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      // Use request overrides or fall back to lead data
      const address: CustomerAddress = request.address || {
        street: lead.street,
        city: lead.city,
        state: lead.state,
        postalCode: lead.postal_code,
        country: lead.country,
      };

      const customerValues = [
        customerId,
        tenantId,
        request.leadId,
        request.companyName || lead.company_name,
        request.email || lead.email,
        request.phone || lead.phone || null,
        request.website || lead.website || null,
        JSON.stringify(address),
        request.type || CustomerType.COMPANY,
        CustomerStatus.ACTIVE,
        request.tier || CustomerTier.STANDARD,
        request.accountManagerId || lead.assigned_to || null,
        request.notes || lead.notes || null,
        JSON.stringify(lead.custom_fields || {}),
        JSON.stringify(request.tags || this.parseJsonField(lead.tags, [])),
        now,
        now,
        now,
      ];

      const customerResult = await this.pool.query(customerQuery, customerValues);

      if (customerResult.isFailure) {
        return Result.fail(`Database error: ${customerResult.error}`);
      }

      const customer = this.mapRowToDTO(customerResult.getValue().rows[0]);

      // Update lead status to converted
      await this.pool.query(
        `UPDATE leads SET status = 'converted', converted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [request.leadId, tenantId]
      );

      // Optionally create opportunity
      let opportunityId: string | undefined;

      if (request.createOpportunity && request.opportunityName) {
        const oppId = crypto.randomUUID();
        const oppQuery = `
          INSERT INTO opportunities (
            id, tenant_id, lead_id, customer_id,
            name, status, stage, amount, probability,
            source, created_at, updated_at, last_activity_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
          RETURNING id
        `;

        const oppResult = await this.pool.query(oppQuery, [
          oppId,
          tenantId,
          request.leadId,
          customerId,
          request.opportunityName,
          'open',
          request.opportunityStage || 'qualification',
          request.opportunityAmount || null,
          50,
          'lead_conversion',
          now,
          now,
          now,
        ]);

        if (oppResult.isSuccess && oppResult.getValue().rows.length > 0) {
          opportunityId = oppResult.getValue().rows[0].id;
        }
      }

      // Log conversion activity
      await this.logConversionActivity(tenantId, request.leadId, customerId, convertedBy);

      // Send welcome email to new customer
      if (this.emailProvider && customer.email) {
        try {
          const appConfig = getAppConfig();
          await this.emailProvider.send({
            to: customer.email,
            subject: `¡Bienvenido/a ${customer.companyName}!`,
            template: EmailTemplate.CUSTOMER_WELCOME,
            variables: {
              customerName: customer.companyName,
              contactEmail: customer.email,
              accountManagerName: customer.accountManagerId || 'Nuestro equipo',
              portalUrl: `${appConfig.appUrl}/portal`,
              supportEmail: 'support@zuclubit.com',
            },
            tags: [
              { name: 'type', value: 'customer-welcome' },
              { name: 'customerId', value: customer.id },
            ],
          });
          console.log(`[CustomerService] Welcome email sent to ${customer.email}`);
        } catch (emailError) {
          console.error('[CustomerService] Failed to send welcome email:', emailError);
        }
      }

      // Send WhatsApp welcome message to new customer
      if (customer.phone) {
        try {
          const messagingService = getMessagingService();
          const appConfig = getAppConfig();

          // Prefer WhatsApp for onboarding messages (richer experience)
          if (messagingService.isWhatsAppAvailable()) {
            await messagingService.sendTemplate(
              customer.phone,
              MessageTemplate.CUSTOMER_ONBOARDING,
              {
                customerName: customer.companyName,
                portalUrl: `${appConfig.appUrl}/portal`,
                supportPhone: '+1234567890',
                accountManagerName: customer.accountManagerId || 'Tu equipo de éxito',
              },
              'whatsapp',
              { entityType: 'customer', entityId: customer.id }
            );
            console.log(`[CustomerService] Welcome WhatsApp sent to ${customer.phone}`);
          } else if (messagingService.isSmsAvailable()) {
            // Fallback to SMS
            await messagingService.sendTemplate(
              customer.phone,
              MessageTemplate.CUSTOMER_ONBOARDING,
              {
                customerName: customer.companyName,
                portalUrl: `${appConfig.appUrl}/portal`,
              },
              'sms',
              { entityType: 'customer', entityId: customer.id }
            );
            console.log(`[CustomerService] Welcome SMS sent to ${customer.phone}`);
          }
        } catch (smsError) {
          console.error('[CustomerService] Failed to send welcome SMS/WhatsApp:', smsError);
        }
      }

      return Result.ok({ customer, opportunityId });
    } catch (error) {
      return Result.fail(`Failed to convert lead: ${(error as Error).message}`);
    }
  }

  /**
   * Delete customer
   */
  async deleteCustomer(
    tenantId: string,
    customerId: string
  ): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM customers
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;

      const result = await this.pool.query(query, [customerId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Customer not found');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete customer: ${(error as Error).message}`);
    }
  }

  /**
   * Get customer statistics
   */
  async getCustomerStatistics(
    tenantId: string,
    filters?: { accountManagerId?: string; dateFrom?: Date; dateTo?: Date }
  ): Promise<Result<CustomerStatistics>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (filters?.accountManagerId) {
        conditions.push(`assigned_to = $${paramIndex}`);
        params.push(filters.accountManagerId);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        conditions.push(`acquisition_date >= $${paramIndex}`);
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        conditions.push(`acquisition_date <= $${paramIndex}`);
        params.push(filters.dateTo);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active_count,
          COUNT(*) FILTER (WHERE status = 'inactive') as inactive_count,
          COUNT(*) FILTER (WHERE status = 'churned') as churned_count,
          COUNT(*) FILTER (WHERE status = 'suspended') as suspended_count,
          COALESCE(SUM(total_revenue), 0) as total_revenue,
          COALESCE(AVG(lifetime_value), 0) as avg_lifetime_value,
          CASE
            WHEN COUNT(*) > 0
            THEN COALESCE(SUM(total_revenue), 0) / COUNT(*)
            ELSE 0
          END as avg_revenue_per_customer,
          COUNT(*) FILTER (
            WHERE acquisition_date >= DATE_TRUNC('month', CURRENT_DATE)
          ) as new_this_month,
          COUNT(*) FILTER (
            WHERE status = 'churned'
            AND updated_at >= DATE_TRUNC('month', CURRENT_DATE)
          ) as churned_this_month
        FROM customers
        WHERE ${whereClause}
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const row = result.getValue().rows[0];

      // Get by type breakdown
      const typeQuery = `
        SELECT type, COUNT(*) as count
        FROM customers
        WHERE ${whereClause}
        GROUP BY type
      `;

      const typeResult = await this.pool.query(typeQuery, params);
      const byType: Record<string, number> = {};
      if (typeResult.isSuccess) {
        for (const typeRow of typeResult.getValue().rows) {
          byType[typeRow.type] = parseInt(typeRow.count, 10);
        }
      }

      // Note: tier is stored in metadata, not as a direct column
      // Skip tier breakdown for now (would need JSONB extraction)
      const byTier: Record<string, number> = {};

      const total = parseInt(row.total, 10);
      const activeCount = parseInt(row.active_count, 10);
      const churnedThisMonth = parseInt(row.churned_this_month, 10);
      const activeLastMonth = activeCount + churnedThisMonth;

      const stats: CustomerStatistics = {
        total,
        byStatus: {
          active: activeCount,
          inactive: parseInt(row.inactive_count, 10),
          churned: parseInt(row.churned_count, 10),
          suspended: parseInt(row.suspended_count, 10),
        },
        byType,
        byTier,
        totalRevenue: parseFloat(row.total_revenue),
        averageLifetimeValue: parseFloat(row.avg_lifetime_value),
        averageRevenuePerCustomer: parseFloat(row.avg_revenue_per_customer),
        newThisMonth: parseInt(row.new_this_month, 10),
        churnedThisMonth,
        churnRate: activeLastMonth > 0 ? (churnedThisMonth / activeLastMonth) * 100 : 0,
        retentionRate: activeLastMonth > 0 ? ((activeLastMonth - churnedThisMonth) / activeLastMonth) * 100 : 100,
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(`Failed to get statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Get top customers by revenue
   */
  async getTopCustomersByRevenue(
    tenantId: string,
    limit: number = 10
  ): Promise<Result<CustomerRevenueSummary[]>> {
    try {
      const query = `
        SELECT
          c.id as customer_id,
          c.name as company_name,
          c.total_revenue,
          c.acquisition_date as last_purchase_date,
          COUNT(o.id) FILTER (WHERE o.status = 'won') as opportunities_won,
          COUNT(o.id) FILTER (WHERE o.status = 'open') as opportunities_open
        FROM customers c
        LEFT JOIN opportunities o ON o.customer_id = c.id
        WHERE c.tenant_id = $1 AND c.status = 'active'
        GROUP BY c.id, c.name, c.total_revenue, c.acquisition_date
        ORDER BY c.total_revenue DESC
        LIMIT $2
      `;

      const result = await this.pool.query(query, [tenantId, limit]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const summaries: CustomerRevenueSummary[] = result.getValue().rows.map((row: Record<string, unknown>) => ({
        customerId: row.customer_id as string,
        companyName: row.company_name as string,
        totalRevenue: parseFloat(row.total_revenue as string) || 0,
        opportunitiesWon: parseInt(row.opportunities_won as string, 10),
        opportunitiesOpen: parseInt(row.opportunities_open as string, 10),
        lastPurchaseDate: row.last_purchase_date ? new Date(row.last_purchase_date as string) : undefined,
      }));

      return Result.ok(summaries);
    } catch (error) {
      return Result.fail(`Failed to get top customers: ${(error as Error).message}`);
    }
  }

  /**
   * Update customer revenue (called when opportunity is won)
   */
  async updateCustomerRevenue(
    tenantId: string,
    customerId: string,
    amount: number
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE customers
        SET
          total_revenue = total_revenue + $1,
          lifetime_value = lifetime_value + $1,
          last_purchase_date = NOW(),
          updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING id
      `;

      const result = await this.pool.query(query, [amount, customerId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      if (result.getValue().rows.length === 0) {
        return Result.fail('Customer not found');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to update revenue: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk operation on customers
   */
  async bulkOperation(
    tenantId: string,
    operation: BulkCustomerOperation,
    performedBy?: string
  ): Promise<Result<BulkCustomerResult>> {
    const successful: string[] = [];
    const failed: { customerId: string; error: string }[] = [];

    for (const customerId of operation.customerIds) {
      try {
        let result: Result<unknown>;

        switch (operation.action) {
          case 'updateStatus':
            if (!operation.status) {
              failed.push({ customerId, error: 'Status required for updateStatus' });
              continue;
            }
            result = await this.updateCustomer(
              tenantId,
              customerId,
              { status: operation.status },
              performedBy
            );
            break;

          case 'updateTier':
            if (!operation.tier) {
              failed.push({ customerId, error: 'Tier required for updateTier' });
              continue;
            }
            result = await this.updateCustomer(
              tenantId,
              customerId,
              { tier: operation.tier },
              performedBy
            );
            break;

          case 'reassign':
            if (!operation.accountManagerId) {
              failed.push({ customerId, error: 'Account manager ID required for reassign' });
              continue;
            }
            result = await this.updateCustomer(
              tenantId,
              customerId,
              { accountManagerId: operation.accountManagerId },
              performedBy
            );
            break;

          case 'addTags':
            if (!operation.tags || operation.tags.length === 0) {
              failed.push({ customerId, error: 'Tags required for addTags' });
              continue;
            }
            result = await this.addTagsToCustomer(tenantId, customerId, operation.tags);
            break;

          case 'removeTags':
            if (!operation.tags || operation.tags.length === 0) {
              failed.push({ customerId, error: 'Tags required for removeTags' });
              continue;
            }
            result = await this.removeTagsFromCustomer(tenantId, customerId, operation.tags);
            break;

          case 'delete':
            result = await this.deleteCustomer(tenantId, customerId);
            break;

          default:
            failed.push({ customerId, error: `Unknown action: ${operation.action}` });
            continue;
        }

        if (result.isSuccess) {
          successful.push(customerId);
        } else {
          failed.push({ customerId, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed.push({ customerId, error: (error as Error).message });
      }
    }

    return Result.ok({ successful, failed });
  }

  /**
   * Get customer timeline
   */
  async getCustomerTimeline(
    tenantId: string,
    customerId: string,
    limit: number = 50
  ): Promise<Result<CustomerTimelineEntry[]>> {
    try {
      // Get opportunities
      const opportunitiesQuery = `
        SELECT
          id,
          name as title,
          'opportunity' as type,
          CASE
            WHEN status = 'won' THEN 'Opportunity won: ' || name
            WHEN status = 'lost' THEN 'Opportunity lost: ' || name
            ELSE 'Opportunity created: ' || name
          END as description,
          created_at
        FROM opportunities
        WHERE customer_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `;

      // Get tasks
      const tasksQuery = `
        SELECT
          id,
          title,
          'task' as type,
          description,
          created_at
        FROM tasks
        WHERE customer_id = $1 AND tenant_id = $2
        ORDER BY created_at DESC
        LIMIT $3
      `;

      const [oppResult, taskResult] = await Promise.all([
        this.pool.query(opportunitiesQuery, [customerId, tenantId, Math.floor(limit / 2)]),
        this.pool.query(tasksQuery, [customerId, tenantId, Math.floor(limit / 2)]),
      ]);

      const entries: CustomerTimelineEntry[] = [];

      if (oppResult.isSuccess) {
        for (const row of oppResult.getValue().rows) {
          entries.push({
            id: row.id,
            customerId,
            type: 'opportunity',
            title: row.title,
            description: row.description,
            createdAt: new Date(row.created_at),
          });
        }
      }

      if (taskResult.isSuccess) {
        for (const row of taskResult.getValue().rows) {
          entries.push({
            id: row.id,
            customerId,
            type: 'task',
            title: row.title,
            description: row.description,
            createdAt: new Date(row.created_at),
          });
        }
      }

      // Sort by date descending
      entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      return Result.ok(entries.slice(0, limit));
    } catch (error) {
      return Result.fail(`Failed to get timeline: ${(error as Error).message}`);
    }
  }

  /**
   * Calculate customer health score
   */
  async getCustomerHealthScore(
    tenantId: string,
    customerId: string
  ): Promise<Result<CustomerHealthScore>> {
    try {
      // Get customer data
      const customerResult = await this.getCustomerById(tenantId, customerId);
      if (customerResult.isFailure) {
        return Result.fail(customerResult.error || 'Customer not found');
      }

      const customer = customerResult.getValue();

      // Get recent activity data
      const activityQuery = `
        SELECT
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as recent_opportunities,
          COUNT(*) FILTER (WHERE status = 'won' AND updated_at >= NOW() - INTERVAL '90 days') as recent_wins,
          MAX(created_at) as last_activity
        FROM opportunities
        WHERE customer_id = $1 AND tenant_id = $2
      `;

      const activityResult = await this.pool.query(activityQuery, [customerId, tenantId]);

      let engagementScore = 50;
      let revenueScore = 50;
      let satisfactionScore = 70; // Default assumption
      let recencyScore = 50;

      if (activityResult.isSuccess) {
        const activity = activityResult.getValue().rows[0];

        // Engagement: based on recent opportunities
        const recentOpportunities = parseInt(activity.recent_opportunities || '0', 10);
        engagementScore = Math.min(100, recentOpportunities * 20);

        // Recency: based on last activity
        if (activity.last_activity) {
          const daysSinceActivity = Math.floor(
            (Date.now() - new Date(activity.last_activity).getTime()) / (1000 * 60 * 60 * 24)
          );
          recencyScore = Math.max(0, 100 - daysSinceActivity * 2);
        }
      }

      // Revenue score: based on total revenue relative to average
      revenueScore = Math.min(100, (customer.totalRevenue / 10000) * 100);

      // Calculate overall score
      const score = Math.round(
        (engagementScore * 0.3) +
        (revenueScore * 0.3) +
        (satisfactionScore * 0.2) +
        (recencyScore * 0.2)
      );

      // Determine trend and risk level
      let trend: 'improving' | 'stable' | 'declining' = 'stable';
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (recencyScore < 30) {
        trend = 'declining';
        riskLevel = 'high';
      } else if (engagementScore > 70 && revenueScore > 60) {
        trend = 'improving';
      }

      if (score < 40) {
        riskLevel = 'high';
      } else if (score < 60) {
        riskLevel = 'medium';
      }

      const healthScore: CustomerHealthScore = {
        customerId,
        score,
        factors: {
          engagementScore,
          revenueScore,
          satisfactionScore,
          recencyScore,
        },
        trend,
        riskLevel,
        lastCalculated: new Date(),
      };

      return Result.ok(healthScore);
    } catch (error) {
      return Result.fail(`Failed to calculate health score: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private async addTagsToCustomer(
    tenantId: string,
    customerId: string,
    tags: string[]
  ): Promise<Result<void>> {
    const query = `
      UPDATE customers
      SET tags = tags || $1::jsonb,
          updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id
    `;

    const result = await this.pool.query(query, [JSON.stringify(tags), customerId, tenantId]);

    if (result.isFailure) {
      return Result.fail(`Database error: ${result.error}`);
    }

    if (result.getValue().rows.length === 0) {
      return Result.fail('Customer not found');
    }

    return Result.ok(undefined);
  }

  private async removeTagsFromCustomer(
    tenantId: string,
    customerId: string,
    tags: string[]
  ): Promise<Result<void>> {
    const query = `
      UPDATE customers
      SET tags = (
        SELECT jsonb_agg(elem)
        FROM jsonb_array_elements(tags) elem
        WHERE NOT elem::text = ANY($1)
      ),
      updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
      RETURNING id
    `;

    const result = await this.pool.query(query, [tags.map(t => `"${t}"`), customerId, tenantId]);

    if (result.isFailure) {
      return Result.fail(`Database error: ${result.error}`);
    }

    if (result.getValue().rows.length === 0) {
      return Result.fail('Customer not found');
    }

    return Result.ok(undefined);
  }

  private async logConversionActivity(
    tenantId: string,
    leadId: string,
    customerId: string,
    convertedBy?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO activity_logs (
          id, tenant_id, entity_type, entity_id,
          action, changes, performed_by, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      `;

      await this.pool.query(query, [
        crypto.randomUUID(),
        tenantId,
        'customer',
        customerId,
        'converted_from_lead',
        JSON.stringify({ leadId, customerId }),
        convertedBy || 'system',
      ]);
    } catch {
      // Log activity failure shouldn't fail the main operation
    }
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      companyName: 'c.name',
      email: 'c.email',
      totalRevenue: 'c.total_revenue',
      lifetimeValue: 'c.lifetime_value',
      convertedAt: 'c.acquisition_date',
      createdAt: 'c.created_at',
      updatedAt: 'c.updated_at',
    };
    return columnMap[sortBy] || 'c.created_at';
  }

  private parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return defaultValue;
      }
    }
    return value as T;
  }

  // ============================================
  // Customer Notes Methods
  // ============================================

  /**
   * Get customer notes
   */
  async getCustomerNotes(
    tenantId: string,
    customerId: string,
    options: { page?: number; limit?: number; isPinned?: boolean }
  ): Promise<Result<{ data: CustomerNoteDTO[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }>> {
    try {
      const { page = 1, limit = 20, isPinned } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT cn.*, u.full_name as created_by_name
        FROM customer_notes cn
        LEFT JOIN users u ON cn.created_by = u.id
        WHERE cn.tenant_id = $1 AND cn.customer_id = $2
      `;
      const params: unknown[] = [tenantId, customerId];
      let paramIndex = 3;

      if (isPinned !== undefined) {
        query += ` AND cn.is_pinned = $${paramIndex}`;
        params.push(isPinned);
        paramIndex++;
      }

      // Count query
      const countQuery = query.replace(/SELECT cn\.\*, u\.full_name as created_by_name/, 'SELECT COUNT(*) as count');
      const countResult = await this.db.execute(sql.raw(countQuery, params));
      const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

      // Data query
      query += ` ORDER BY cn.is_pinned DESC, cn.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.db.execute(sql.raw(query, params));

      const notes = (result.rows as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        tenantId: row.tenant_id as string,
        customerId: row.customer_id as string,
        createdBy: row.created_by as string,
        createdByName: row.created_by_name as string | undefined,
        content: row.content as string,
        isPinned: row.is_pinned as boolean,
        metadata: this.parseJsonField<Record<string, unknown>>(row.metadata, {}),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      }));

      return Result.ok({
        data: notes,
        meta: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return Result.fail(`Failed to get customer notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a note to a customer
   */
  async addCustomerNote(
    tenantId: string,
    customerId: string,
    data: { content: string; isPinned?: boolean; createdBy: string }
  ): Promise<Result<CustomerNoteDTO>> {
    try {
      const noteId = crypto.randomUUID();
      const now = new Date();

      await this.db.execute(sql`
        INSERT INTO customer_notes (id, tenant_id, customer_id, created_by, content, is_pinned, created_at, updated_at)
        VALUES (${noteId}, ${tenantId}, ${customerId}, ${data.createdBy}, ${data.content}, ${data.isPinned || false}, ${now}, ${now})
      `);

      // Log activity
      await this.logCustomerActivity(tenantId, customerId, data.createdBy, 'note_added', {
        noteId,
        preview: data.content.substring(0, 100),
      });

      return Result.ok({
        id: noteId,
        tenantId,
        customerId,
        createdBy: data.createdBy,
        content: data.content,
        isPinned: data.isPinned || false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
      });
    } catch (error) {
      return Result.fail(`Failed to add customer note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a customer note
   */
  async updateCustomerNote(
    tenantId: string,
    customerId: string,
    noteId: string,
    data: { content?: string; isPinned?: boolean },
    userId?: string
  ): Promise<Result<CustomerNoteDTO>> {
    try {
      const now = new Date();

      const updates: string[] = ['updated_at = $4'];
      const params: unknown[] = [tenantId, customerId, noteId, now];
      let paramIndex = 5;

      if (data.content !== undefined) {
        updates.push(`content = $${paramIndex}`);
        params.push(data.content);
        paramIndex++;
      }

      if (data.isPinned !== undefined) {
        updates.push(`is_pinned = $${paramIndex}`);
        params.push(data.isPinned);
        paramIndex++;
      }

      const query = `
        UPDATE customer_notes
        SET ${updates.join(', ')}
        WHERE tenant_id = $1 AND customer_id = $2 AND id = $3
        RETURNING *
      `;

      const result = await this.db.execute(sql.raw(query, params));

      if (result.rows.length === 0) {
        return Result.fail('Note not found');
      }

      const row = result.rows[0] as Record<string, unknown>;

      return Result.ok({
        id: row.id as string,
        tenantId: row.tenant_id as string,
        customerId: row.customer_id as string,
        createdBy: row.created_by as string,
        content: row.content as string,
        isPinned: row.is_pinned as boolean,
        metadata: this.parseJsonField<Record<string, unknown>>(row.metadata, {}),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      });
    } catch (error) {
      return Result.fail(`Failed to update customer note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a customer note
   */
  async deleteCustomerNote(
    tenantId: string,
    customerId: string,
    noteId: string
  ): Promise<Result<void>> {
    try {
      const result = await this.db.execute(sql`
        DELETE FROM customer_notes
        WHERE tenant_id = ${tenantId} AND customer_id = ${customerId} AND id = ${noteId}
      `);

      if (result.rowCount === 0) {
        return Result.fail('Note not found');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete customer note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // Customer Activity Methods
  // ============================================

  /**
   * Get customer activity log
   */
  async getCustomerActivity(
    tenantId: string,
    customerId: string,
    options: { page?: number; limit?: number; actionType?: string; startDate?: Date; endDate?: Date }
  ): Promise<Result<{ data: CustomerActivityDTO[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }>> {
    try {
      const { page = 1, limit = 50, actionType, startDate, endDate } = options;
      const offset = (page - 1) * limit;

      let query = `
        SELECT ca.*, u.full_name as user_name
        FROM customer_activity ca
        LEFT JOIN users u ON ca.user_id = u.id
        WHERE ca.tenant_id = $1 AND ca.customer_id = $2
      `;
      const params: unknown[] = [tenantId, customerId];
      let paramIndex = 3;

      if (actionType) {
        query += ` AND ca.action_type = $${paramIndex}`;
        params.push(actionType);
        paramIndex++;
      }

      if (startDate) {
        query += ` AND ca.created_at >= $${paramIndex}`;
        params.push(startDate);
        paramIndex++;
      }

      if (endDate) {
        query += ` AND ca.created_at <= $${paramIndex}`;
        params.push(endDate);
        paramIndex++;
      }

      // Count query
      const countQuery = query.replace(/SELECT ca\.\*, u\.full_name as user_name/, 'SELECT COUNT(*) as count');
      const countResult = await this.db.execute(sql.raw(countQuery, params));
      const total = parseInt((countResult.rows[0] as { count: string }).count, 10);

      // Data query
      query += ` ORDER BY ca.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      params.push(limit, offset);

      const result = await this.db.execute(sql.raw(query, params));

      const activities = (result.rows as Record<string, unknown>[]).map((row) => ({
        id: row.id as string,
        tenantId: row.tenant_id as string,
        customerId: row.customer_id as string,
        userId: row.user_id as string | undefined,
        userName: row.user_name as string | undefined,
        actionType: row.action_type as string,
        description: row.description as string | undefined,
        metadata: this.parseJsonField<Record<string, unknown>>(row.metadata, {}),
        changes: this.parseJsonField<Record<string, unknown>>(row.changes, {}),
        createdAt: new Date(row.created_at as string),
      }));

      return Result.ok({
        data: activities,
        meta: {
          total,
          page,
          pageSize: limit,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      return Result.fail(`Failed to get customer activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log customer activity
   */
  private async logCustomerActivity(
    tenantId: string,
    customerId: string,
    userId: string | undefined,
    actionType: string,
    metadata: Record<string, unknown> = {},
    changes: Record<string, unknown> = {}
  ): Promise<void> {
    try {
      const activityId = crypto.randomUUID();
      const now = new Date();

      await this.db.execute(sql`
        INSERT INTO customer_activity (id, tenant_id, customer_id, user_id, action_type, metadata, changes, created_at)
        VALUES (${activityId}, ${tenantId}, ${customerId}, ${userId || null}, ${actionType}, ${JSON.stringify(metadata)}, ${JSON.stringify(changes)}, ${now})
      `);
    } catch (error) {
      console.error('Failed to log customer activity:', error);
    }
  }

  private mapRowToDTO(row: Record<string, unknown>): CustomerDTO {
    const address = this.parseJsonField<CustomerAddress>(row.address, {});
    const metadata = this.parseJsonField<Record<string, unknown>>(row.metadata, {});

    // Extract tier and notes from metadata if not in direct columns
    const tier = (row.tier as CustomerTier) || (metadata.tier as CustomerTier) || CustomerTier.STANDARD;
    const notes = (row.notes as string) || (metadata.notes as string) || undefined;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      leadId: row.lead_id as string | undefined,
      companyName: (row.name as string) || (row.company as string) || '', // Use 'name' column
      email: row.email as string,
      phone: row.phone as string | undefined,
      website: row.website as string | undefined,
      address,
      type: (row.type as CustomerType) || CustomerType.COMPANY,
      status: (row.status as CustomerStatus) || CustomerStatus.ACTIVE,
      tier,
      accountManagerId: row.assigned_to as string | undefined, // Use 'assigned_to' column
      totalRevenue: parseFloat(row.total_revenue as string) || 0,
      lifetimeValue: parseFloat(row.lifetime_value as string) || 0,
      lastPurchaseDate: row.last_purchase_date ? new Date(row.last_purchase_date as string) : undefined,
      notes,
      customFields: this.parseJsonField<Record<string, unknown>>(row.custom_fields, {}),
      tags: this.parseJsonField<string[]>(row.tags, []),
      convertedAt: row.acquisition_date ? new Date(row.acquisition_date as string) : undefined, // Use acquisition_date
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      opportunityCount: row.opportunity_count !== undefined ? parseInt(row.opportunity_count as string, 10) : undefined,
      taskCount: row.task_count !== undefined ? parseInt(row.task_count as string, 10) : undefined,
    };
  }
}

// ============================================
// DTO Types for Notes & Activity
// ============================================

export interface CustomerNoteDTO {
  id: string;
  tenantId: string;
  customerId: string;
  createdBy: string;
  createdByName?: string;
  content: string;
  isPinned: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerActivityDTO {
  id: string;
  tenantId: string;
  customerId: string;
  userId?: string;
  userName?: string;
  actionType: string;
  description?: string;
  metadata: Record<string, unknown>;
  changes: Record<string, unknown>;
  createdAt: Date;
}
