/**
 * Customer Service Tests
 */
import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { CustomerService } from './customer.service';
import { CustomerStatus, CustomerType, CustomerTier } from './types';

// Mock the database pool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
};

describe('CustomerService', () => {
  let service: CustomerService;
  const tenantId = 'test-tenant-id';

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CustomerService(mockPool as any);
  });

  describe('createCustomer', () => {
    it('should create a customer successfully', async () => {
      const customerRow = {
        id: 'cust-123',
        tenant_id: tenantId,
        company_name: 'Acme Corp',
        email: 'contact@acme.com',
        phone: '+1234567890',
        website: 'https://acme.com',
        address: '{}',
        type: 'company',
        status: 'active',
        tier: 'standard',
        account_manager_id: 'user-123',
        total_revenue: '0',
        lifetime_value: '0',
        notes: 'Important customer',
        custom_fields: '{}',
        tags: '["enterprise"]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [customerRow] }));

      const result = await service.createCustomer(tenantId, {
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        phone: '+1234567890',
        website: 'https://acme.com',
        accountManagerId: 'user-123',
        notes: 'Important customer',
        tags: ['enterprise'],
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().companyName).toBe('Acme Corp');
      expect(result.getValue().email).toBe('contact@acme.com');
      expect(result.getValue().status).toBe(CustomerStatus.ACTIVE);
    });

    it('should return failure when database error occurs', async () => {
      mockQuery.mockResolvedValueOnce(Result.fail('Database error'));

      const result = await service.createCustomer(tenantId, {
        companyName: 'Test Corp',
        email: 'test@test.com',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });

  describe('getCustomerById', () => {
    it('should get customer by id', async () => {
      const customerRow = {
        id: 'cust-123',
        tenant_id: tenantId,
        company_name: 'Acme Corp',
        email: 'contact@acme.com',
        address: '{"city": "New York", "country": "US"}',
        type: 'company',
        status: 'active',
        tier: 'premium',
        total_revenue: '50000',
        lifetime_value: '75000',
        custom_fields: '{}',
        tags: '["vip", "enterprise"]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
        opportunity_count: '5',
        task_count: '2',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [customerRow] }));

      const result = await service.getCustomerById(tenantId, 'cust-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().id).toBe('cust-123');
      expect(result.getValue().tier).toBe(CustomerTier.PREMIUM);
      expect(result.getValue().totalRevenue).toBe(50000);
      expect(result.getValue().address.city).toBe('New York');
      expect(result.getValue().tags).toEqual(['vip', 'enterprise']);
    });

    it('should return failure when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.getCustomerById(tenantId, 'nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Customer not found');
    });
  });

  describe('getCustomers', () => {
    it('should get customers with filters', async () => {
      const customerRows = [
        {
          id: 'cust-1',
          tenant_id: tenantId,
          company_name: 'Company A',
          email: 'a@company.com',
          address: '{}',
          type: 'company',
          status: 'active',
          tier: 'standard',
          total_revenue: '10000',
          lifetime_value: '15000',
          custom_fields: '{}',
          tags: '[]',
          converted_at: '2025-01-01T00:00:00Z',
          created_at: '2025-01-01T00:00:00Z',
          updated_at: '2025-01-15T00:00:00Z',
          opportunity_count: '2',
          task_count: '1',
        },
        {
          id: 'cust-2',
          tenant_id: tenantId,
          company_name: 'Company B',
          email: 'b@company.com',
          address: '{}',
          type: 'enterprise',
          status: 'active',
          tier: 'premium',
          total_revenue: '50000',
          lifetime_value: '75000',
          custom_fields: '{}',
          tags: '[]',
          converted_at: '2025-01-02T00:00:00Z',
          created_at: '2025-01-02T00:00:00Z',
          updated_at: '2025-01-16T00:00:00Z',
          opportunity_count: '5',
          task_count: '3',
        },
      ];

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [{ total: '2' }] }))
        .mockResolvedValueOnce(Result.ok({ rows: customerRows }));

      const result = await service.getCustomers(
        tenantId,
        { status: CustomerStatus.ACTIVE },
        { sortBy: 'totalRevenue', sortOrder: 'desc' },
        1,
        10
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().customers).toHaveLength(2);
      expect(result.getValue().total).toBe(2);
      expect(result.getValue().page).toBe(1);
    });
  });

  describe('updateCustomer', () => {
    it('should update customer successfully', async () => {
      const existingCustomer = {
        id: 'cust-123',
        tenant_id: tenantId,
        company_name: 'Original Corp',
        email: 'original@corp.com',
        address: '{}',
        type: 'company',
        status: 'active',
        tier: 'standard',
        total_revenue: '0',
        lifetime_value: '0',
        custom_fields: '{}',
        tags: '[]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      const updatedCustomer = {
        ...existingCustomer,
        company_name: 'Updated Corp',
        tier: 'premium',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [existingCustomer] }))
        .mockResolvedValueOnce(Result.ok({ rows: [updatedCustomer] }));

      const result = await service.updateCustomer(tenantId, 'cust-123', {
        companyName: 'Updated Corp',
        tier: CustomerTier.PREMIUM,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().companyName).toBe('Updated Corp');
      expect(result.getValue().tier).toBe(CustomerTier.PREMIUM);
    });

    it('should return failure when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.updateCustomer(tenantId, 'nonexistent', {
        companyName: 'New Name',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Customer not found');
    });

    it('should return failure when no fields to update', async () => {
      const existingCustomer = {
        id: 'cust-123',
        tenant_id: tenantId,
        company_name: 'Corp',
        email: 'corp@corp.com',
        address: '{}',
        type: 'company',
        status: 'active',
        tier: 'standard',
        total_revenue: '0',
        lifetime_value: '0',
        custom_fields: '{}',
        tags: '[]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-01T00:00:00Z',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [existingCustomer] }));

      const result = await service.updateCustomer(tenantId, 'cust-123', {});

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('No fields to update');
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should convert lead to customer', async () => {
      const leadRow = {
        id: 'lead-123',
        tenant_id: tenantId,
        company_name: 'Lead Company',
        email: 'lead@company.com',
        phone: '+1234567890',
        website: 'https://lead.com',
        street: '123 Main St',
        city: 'New York',
        state: 'NY',
        postal_code: '10001',
        country: 'US',
        assigned_to: 'user-123',
        notes: 'Good lead',
        custom_fields: '{}',
        tags: '["hot"]',
        status: 'qualified',
      };

      const customerRow = {
        id: 'cust-123',
        tenant_id: tenantId,
        lead_id: 'lead-123',
        company_name: 'Lead Company',
        email: 'lead@company.com',
        phone: '+1234567890',
        website: 'https://lead.com',
        address: '{"street":"123 Main St","city":"New York","state":"NY","postalCode":"10001","country":"US"}',
        type: 'company',
        status: 'active',
        tier: 'standard',
        account_manager_id: 'user-123',
        total_revenue: '0',
        lifetime_value: '0',
        notes: 'Good lead',
        custom_fields: '{}',
        tags: '["hot"]',
        converted_at: '2025-01-15T00:00:00Z',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [leadRow] })) // Lead lookup
        .mockResolvedValueOnce(Result.ok({ rows: [customerRow] })) // Create customer
        .mockResolvedValueOnce(Result.ok({ rows: [] })) // Update lead status
        .mockResolvedValueOnce(Result.ok({ rows: [] })); // Log activity

      const result = await service.convertLeadToCustomer(tenantId, {
        leadId: 'lead-123',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().customer.leadId).toBe('lead-123');
      expect(result.getValue().customer.companyName).toBe('Lead Company');
    });

    it('should convert lead with opportunity creation', async () => {
      const leadRow = {
        id: 'lead-123',
        tenant_id: tenantId,
        company_name: 'Lead Company',
        email: 'lead@company.com',
        status: 'qualified',
        custom_fields: '{}',
        tags: '[]',
      };

      const customerRow = {
        id: 'cust-123',
        tenant_id: tenantId,
        lead_id: 'lead-123',
        company_name: 'Lead Company',
        email: 'lead@company.com',
        address: '{}',
        type: 'company',
        status: 'active',
        tier: 'standard',
        total_revenue: '0',
        lifetime_value: '0',
        custom_fields: '{}',
        tags: '[]',
        converted_at: '2025-01-15T00:00:00Z',
        created_at: '2025-01-15T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [leadRow] })) // Lead lookup
        .mockResolvedValueOnce(Result.ok({ rows: [customerRow] })) // Create customer
        .mockResolvedValueOnce(Result.ok({ rows: [] })) // Update lead status
        .mockResolvedValueOnce(Result.ok({ rows: [{ id: 'opp-123' }] })) // Create opportunity
        .mockResolvedValueOnce(Result.ok({ rows: [] })); // Log activity

      const result = await service.convertLeadToCustomer(tenantId, {
        leadId: 'lead-123',
        createOpportunity: true,
        opportunityName: 'Initial Deal',
        opportunityAmount: 50000,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().customer.leadId).toBe('lead-123');
      expect(result.getValue().opportunityId).toBe('opp-123');
    });

    it('should return failure when lead not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.convertLeadToCustomer(tenantId, {
        leadId: 'nonexistent',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Lead not found');
    });

    it('should return failure when lead already converted', async () => {
      const leadRow = {
        id: 'lead-123',
        tenant_id: tenantId,
        company_name: 'Lead Company',
        email: 'lead@company.com',
        status: 'converted',
      };

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [leadRow] }));

      const result = await service.convertLeadToCustomer(tenantId, {
        leadId: 'lead-123',
      });

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Lead has already been converted');
    });
  });

  describe('deleteCustomer', () => {
    it('should delete customer successfully', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ id: 'cust-123' }] }));

      const result = await service.deleteCustomer(tenantId, 'cust-123');

      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.deleteCustomer(tenantId, 'nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Customer not found');
    });
  });

  describe('getCustomerStatistics', () => {
    it('should get customer statistics', async () => {
      const statsRow = {
        total: '100',
        active_count: '80',
        inactive_count: '10',
        churned_count: '8',
        suspended_count: '2',
        total_revenue: '500000',
        avg_lifetime_value: '7500',
        avg_revenue_per_customer: '5000',
        new_this_month: '15',
        churned_this_month: '3',
      };

      const typeRows = [
        { type: 'company', count: '60' },
        { type: 'enterprise', count: '30' },
        { type: 'individual', count: '10' },
      ];

      const tierRows = [
        { tier: 'standard', count: '50' },
        { tier: 'premium', count: '35' },
        { tier: 'vip', count: '15' },
      ];

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [statsRow] }))
        .mockResolvedValueOnce(Result.ok({ rows: typeRows }))
        .mockResolvedValueOnce(Result.ok({ rows: tierRows }));

      const result = await service.getCustomerStatistics(tenantId);

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.total).toBe(100);
      expect(stats.byStatus.active).toBe(80);
      expect(stats.byStatus.churned).toBe(8);
      expect(stats.totalRevenue).toBe(500000);
      expect(stats.newThisMonth).toBe(15);
      expect(stats.byType['company']).toBe(60);
      expect(stats.byTier['premium']).toBe(35);
    });
  });

  describe('getTopCustomersByRevenue', () => {
    it('should get top customers by revenue', async () => {
      const customerRows = [
        {
          customer_id: 'cust-1',
          company_name: 'Top Company',
          total_revenue: '100000',
          opportunities_won: '5',
          opportunities_open: '2',
          last_purchase_date: '2025-01-10T00:00:00Z',
        },
        {
          customer_id: 'cust-2',
          company_name: 'Second Company',
          total_revenue: '75000',
          opportunities_won: '3',
          opportunities_open: '1',
          last_purchase_date: '2025-01-05T00:00:00Z',
        },
      ];

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: customerRows }));

      const result = await service.getTopCustomersByRevenue(tenantId, 10);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(2);
      expect(result.getValue()[0].companyName).toBe('Top Company');
      expect(result.getValue()[0].totalRevenue).toBe(100000);
      expect(result.getValue()[0].opportunitiesWon).toBe(5);
    });
  });

  describe('updateCustomerRevenue', () => {
    it('should update customer revenue', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ id: 'cust-123' }] }));

      const result = await service.updateCustomerRevenue(tenantId, 'cust-123', 10000);

      expect(result.isSuccess).toBe(true);
    });

    it('should return failure when customer not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.updateCustomerRevenue(tenantId, 'nonexistent', 10000);

      expect(result.isFailure).toBe(true);
      expect(result.error).toBe('Customer not found');
    });
  });

  describe('bulkOperation', () => {
    it('should perform bulk status update', async () => {
      const updatedCustomer = {
        id: 'cust-1',
        tenant_id: tenantId,
        company_name: 'Company',
        email: 'company@test.com',
        address: '{}',
        type: 'company',
        status: 'inactive',
        tier: 'standard',
        total_revenue: '0',
        lifetime_value: '0',
        custom_fields: '{}',
        tags: '[]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-20T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [updatedCustomer] }))
        .mockResolvedValueOnce(Result.ok({ rows: [updatedCustomer] }))
        .mockResolvedValueOnce(Result.ok({ rows: [{ ...updatedCustomer, id: 'cust-2' }] }))
        .mockResolvedValueOnce(Result.ok({ rows: [{ ...updatedCustomer, id: 'cust-2' }] }));

      const result = await service.bulkOperation(tenantId, {
        customerIds: ['cust-1', 'cust-2'],
        action: 'updateStatus',
        status: CustomerStatus.INACTIVE,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().successful).toHaveLength(2);
      expect(result.getValue().failed).toHaveLength(0);
    });

    it('should handle bulk operation failures', async () => {
      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [] }))
        .mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await service.bulkOperation(tenantId, {
        customerIds: ['cust-1', 'cust-2'],
        action: 'delete',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().successful).toHaveLength(0);
      expect(result.getValue().failed).toHaveLength(2);
    });

    it('should fail when required param is missing', async () => {
      const result = await service.bulkOperation(tenantId, {
        customerIds: ['cust-1'],
        action: 'updateStatus',
        // status is missing
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().failed).toHaveLength(1);
      expect(result.getValue().failed[0].error).toContain('Status required');
    });
  });

  describe('getCustomerTimeline', () => {
    it('should get customer timeline', async () => {
      const opportunities = [
        {
          id: 'opp-1',
          title: 'Deal 1',
          type: 'opportunity',
          description: 'Opportunity created: Deal 1',
          created_at: '2025-01-10T00:00:00Z',
        },
      ];

      const tasks = [
        {
          id: 'task-1',
          title: 'Follow up',
          type: 'task',
          description: 'Follow up with customer',
          created_at: '2025-01-12T00:00:00Z',
        },
      ];

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: opportunities }))
        .mockResolvedValueOnce(Result.ok({ rows: tasks }));

      const result = await service.getCustomerTimeline(tenantId, 'cust-123', 50);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toHaveLength(2);
    });
  });

  describe('getCustomerHealthScore', () => {
    it('should calculate customer health score', async () => {
      const customerRow = {
        id: 'cust-123',
        tenant_id: tenantId,
        company_name: 'Healthy Customer',
        email: 'healthy@customer.com',
        address: '{}',
        type: 'company',
        status: 'active',
        tier: 'premium',
        total_revenue: '50000',
        lifetime_value: '75000',
        custom_fields: '{}',
        tags: '[]',
        converted_at: '2025-01-01T00:00:00Z',
        created_at: '2025-01-01T00:00:00Z',
        updated_at: '2025-01-15T00:00:00Z',
      };

      const activityRow = {
        recent_opportunities: '3',
        recent_wins: '2',
        last_activity: '2025-01-14T00:00:00Z',
      };

      mockQuery
        .mockResolvedValueOnce(Result.ok({ rows: [customerRow] })) // getCustomerById
        .mockResolvedValueOnce(Result.ok({ rows: [activityRow] })); // activity query

      const result = await service.getCustomerHealthScore(tenantId, 'cust-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().customerId).toBe('cust-123');
      expect(result.getValue().score).toBeGreaterThanOrEqual(0);
      expect(result.getValue().score).toBeLessThanOrEqual(100);
      expect(result.getValue().factors.engagementScore).toBeGreaterThanOrEqual(0);
      expect(result.getValue().riskLevel).toBeDefined();
    });
  });
});
