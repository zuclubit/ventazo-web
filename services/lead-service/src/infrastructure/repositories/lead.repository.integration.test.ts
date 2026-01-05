import 'reflect-metadata';
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { DatabasePool } from '@zuclubit/database';
import { IEventPublisher } from '@zuclubit/events';
import { Lead } from '../../domain/aggregates';
import { LeadStatusEnum } from '../../domain/value-objects';
import { LeadRepository } from './lead.repository';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Integration tests for LeadRepository
 * Uses Testcontainers to spin up a real PostgreSQL database
 */
describe('LeadRepository Integration Tests', () => {
  let container: StartedPostgreSqlContainer;
  let pool: DatabasePool;
  let repository: LeadRepository;
  let mockEventPublisher: IEventPublisher;

  const TENANT_ID = 'tenant-123';
  const USER_ID = 'user-123';

  beforeAll(async () => {
    // Start PostgreSQL container
    container = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase('leads_test')
      .withUsername('test')
      .withPassword('test')
      .start();

    // Create database pool
    pool = new DatabasePool({
      host: container.getHost(),
      port: container.getPort(),
      database: container.getDatabase(),
      user: container.getUsername(),
      password: container.getPassword(),
    });

    // Test connection
    const connectResult = await pool.connect();
    expect(connectResult.isSuccess).toBe(true);

    // Apply migrations
    const migrationSql = readFileSync(
      join(__dirname, '../../../drizzle/0000_careful_titania.sql'),
      'utf-8'
    );

    await pool.query(migrationSql, []);

    // Create mock event publisher
    mockEventPublisher = {
      connect: async () => ({ isSuccess: true, isFailure: false, getValue: () => undefined, error: null }),
      disconnect: async () => {},
      isConnected: () => true,
      publish: async () => ({ isSuccess: true, isFailure: false, getValue: () => undefined, error: null }),
      publishBatch: async () => ({ isSuccess: true, isFailure: false, getValue: () => undefined, error: null }),
    } as IEventPublisher;

    // Create repository
    repository = new LeadRepository(pool, mockEventPublisher);
  }, 60000);

  afterAll(async () => {
    await pool.close();
    await container.stop();
  });

  beforeEach(async () => {
    // Clean database before each test
    await pool.query('DELETE FROM outbox_events', []);
    await pool.query('DELETE FROM leads', []);
  });

  describe('save and findById', () => {
    it('should save a new lead and retrieve it by id', async () => {
      // Create lead
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      expect(leadResult.isSuccess).toBe(true);
      const lead = leadResult.getValue();

      // Save lead
      const saveResult = await repository.save(lead);
      expect(saveResult.isSuccess).toBe(true);

      // Retrieve lead
      const findResult = await repository.findById(lead.id, TENANT_ID);
      expect(findResult.isSuccess).toBe(true);

      const foundLead = findResult.getValue();
      expect(foundLead).not.toBeNull();
      expect(foundLead!.id).toBe(lead.id);
      expect(foundLead!.getCompanyName()).toBe('Acme Corp');
      expect(foundLead!.getEmail().value).toBe('contact@acme.com');
      expect(foundLead!.getSource()).toBe('website');
      expect(foundLead!.getStatus().value).toBe(LeadStatusEnum.NEW);
    });

    it('should update existing lead on save', async () => {
      // Create and save lead
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();
      await repository.save(lead);

      // Update lead
      lead.updateInfo({
        companyName: 'Acme Corporation',
        phone: '+1234567890',
      });
      lead.updateScore(75, 'High engagement');
      lead.clearDomainEvents();

      // Save updated lead
      const updateResult = await repository.save(lead);
      expect(updateResult.isSuccess).toBe(true);

      // Retrieve and verify
      const findResult = await repository.findById(lead.id, TENANT_ID);
      const updatedLead = findResult.getValue();
      expect(updatedLead!.getCompanyName()).toBe('Acme Corporation');
      expect(updatedLead!.getPhone()).toBe('+1234567890');
      expect(updatedLead!.getScore().value).toBe(75);
    });

    it('should save domain events to outbox', async () => {
      // Create and save lead (generates Lead.Created event)
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();

      const saveResult = await repository.save(lead);
      expect(saveResult.isSuccess).toBe(true);

      // Check outbox events
      const eventsResult = await pool.query(
        'SELECT * FROM outbox_events WHERE aggregate_id = $1',
        [lead.id]
      );
      expect(eventsResult.isSuccess).toBe(true);

      const events = eventsResult.getValue().rows;
      expect(events.length).toBeGreaterThan(0);
      expect(events[0].event_type).toBe('Lead.Created');
      expect(events[0].tenant_id).toBe(TENANT_ID);
    });

    it('should return null for non-existent lead', async () => {
      const result = await repository.findById('non-existent-id', TENANT_ID);
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });

    it('should not find lead from different tenant', async () => {
      // Create lead for tenant-123
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();
      await repository.save(lead);

      // Try to find with different tenant
      const result = await repository.findById(lead.id, 'different-tenant');
      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('findAll with pagination and filtering', () => {
    beforeEach(async () => {
      // Create test leads
      const leads = [
        { companyName: 'Company A', email: 'a@test.com', source: 'website', industry: 'tech', score: 80 },
        { companyName: 'Company B', email: 'b@test.com', source: 'referral', industry: 'finance', score: 60 },
        { companyName: 'Company C', email: 'c@test.com', source: 'website', industry: 'tech', score: 40 },
        { companyName: 'Company D', email: 'd@test.com', source: 'email', industry: 'healthcare', score: 90 },
      ];

      for (const data of leads) {
        const leadResult = Lead.create({
          tenantId: TENANT_ID,
          companyName: data.companyName,
          email: data.email,
          source: data.source,
          industry: data.industry,
        });
        const lead = leadResult.getValue();
        lead.updateScore(data.score, 'Test score');
        lead.clearDomainEvents();
        await repository.save(lead);
      }
    });

    it('should return paginated results', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        page: 1,
        limit: 2,
      });

      expect(result.isSuccess).toBe(true);
      const paginated = result.getValue();
      expect(paginated.items.length).toBe(2);
      expect(paginated.total).toBe(4);
      expect(paginated.page).toBe(1);
      expect(paginated.limit).toBe(2);
      expect(paginated.totalPages).toBe(2);
    });

    it('should filter by source', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        source: 'website',
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(2);
      expect(leads.every(l => l.getSource() === 'website')).toBe(true);
    });

    it('should filter by industry', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        industry: 'tech',
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(2);
      expect(leads.every(l => l.getIndustry() === 'tech')).toBe(true);
    });

    it('should filter by score range', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        minScore: 60,
        maxScore: 80,
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(2);
      expect(leads.every(l => l.getScore().value >= 60 && l.getScore().value <= 80)).toBe(true);
    });

    it('should search by company name', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        searchTerm: 'Company B',
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(1);
      expect(leads[0].getCompanyName()).toBe('Company B');
    });

    it('should search by email', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        searchTerm: 'c@test.com',
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(1);
      expect(leads[0].getEmail().value).toBe('c@test.com');
    });

    it('should sort by score descending', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        sortBy: 'score',
        sortOrder: 'desc',
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads[0].getScore().value).toBe(90);
      expect(leads[1].getScore().value).toBe(80);
      expect(leads[2].getScore().value).toBe(60);
      expect(leads[3].getScore().value).toBe(40);
    });

    it('should combine multiple filters', async () => {
      const result = await repository.findAll({
        tenantId: TENANT_ID,
        source: 'website',
        industry: 'tech',
        minScore: 50,
      });

      expect(result.isSuccess).toBe(true);
      const leads = result.getValue().items;
      expect(leads.length).toBe(1);
      expect(leads[0].getCompanyName()).toBe('Company A');
    });
  });

  describe('findByStatus', () => {
    it('should find leads by status', async () => {
      // Create leads with different statuses
      const lead1Result = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company A',
        email: 'a@test.com',
        source: 'website',
      });
      const lead1 = lead1Result.getValue();
      await repository.save(lead1);

      const lead2Result = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company B',
        email: 'b@test.com',
        source: 'website',
      });
      const lead2 = lead2Result.getValue();
      lead2.changeStatus(LeadStatusEnum.CONTACTED, USER_ID);
      lead2.clearDomainEvents();
      await repository.save(lead2);

      // Find by status
      const result = await repository.findByStatus(LeadStatusEnum.NEW, TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const leads = result.getValue();
      expect(leads.length).toBe(1);
      expect(leads[0].getStatus().value).toBe(LeadStatusEnum.NEW);
    });
  });

  describe('findByOwner', () => {
    it('should find leads by owner', async () => {
      const ownerId = 'owner-123';

      // Create leads
      const lead1Result = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company A',
        email: 'a@test.com',
        source: 'website',
      });
      const lead1 = lead1Result.getValue();
      lead1.assignTo(ownerId, USER_ID);
      lead1.clearDomainEvents();
      await repository.save(lead1);

      const lead2Result = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company B',
        email: 'b@test.com',
        source: 'website',
      });
      const lead2 = lead2Result.getValue();
      await repository.save(lead2);

      // Find by owner
      const result = await repository.findByOwner(ownerId, TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const leads = result.getValue();
      expect(leads.length).toBe(1);
      expect(leads[0].getOwnerId()).toBe(ownerId);
    });
  });

  describe('findOverdueFollowUps', () => {
    it('should find leads with overdue follow-ups', async () => {
      // Create lead with past follow-up date
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company A',
        email: 'a@test.com',
        source: 'website',
      });
      const lead = leadResult.getValue();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      lead.scheduleFollowUp(pastDate, USER_ID);
      lead.clearDomainEvents();
      await repository.save(lead);

      // Create lead with future follow-up date
      const lead2Result = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company B',
        email: 'b@test.com',
        source: 'website',
      });
      const lead2 = lead2Result.getValue();

      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);
      lead2.scheduleFollowUp(futureDate, USER_ID);
      lead2.clearDomainEvents();
      await repository.save(lead2);

      // Find overdue
      const result = await repository.findOverdueFollowUps(TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const leads = result.getValue();
      expect(leads.length).toBe(1);
      expect(leads[0].getCompanyName()).toBe('Company A');
    });

    it('should not return closed leads', async () => {
      // Create lead with overdue follow-up but closed status
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Company A',
        email: 'a@test.com',
        source: 'website',
      });
      const lead = leadResult.getValue();

      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      lead.scheduleFollowUp(pastDate, USER_ID);
      lead.changeStatus(LeadStatusEnum.WON, USER_ID);
      lead.clearDomainEvents();
      await repository.save(lead);

      // Find overdue
      const result = await repository.findOverdueFollowUps(TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const leads = result.getValue();
      expect(leads.length).toBe(0);
    });
  });

  describe('delete', () => {
    it('should delete a lead', async () => {
      // Create and save lead
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();
      await repository.save(lead);

      // Delete lead
      const deleteResult = await repository.delete(lead.id, TENANT_ID);
      expect(deleteResult.isSuccess).toBe(true);

      // Verify deletion
      const findResult = await repository.findById(lead.id, TENANT_ID);
      expect(findResult.getValue()).toBeNull();
    });

    it('should not delete lead from different tenant', async () => {
      // Create and save lead
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();
      await repository.save(lead);

      // Try to delete with different tenant
      await repository.delete(lead.id, 'different-tenant');

      // Verify lead still exists
      const findResult = await repository.findById(lead.id, TENANT_ID);
      expect(findResult.getValue()).not.toBeNull();
    });
  });

  describe('countByStatus', () => {
    it('should count leads by status', async () => {
      // Create leads with different statuses
      const statuses = [
        LeadStatusEnum.NEW,
        LeadStatusEnum.NEW,
        LeadStatusEnum.CONTACTED,
        LeadStatusEnum.QUALIFIED,
      ];

      for (let i = 0; i < statuses.length; i++) {
        const leadResult = Lead.create({
          tenantId: TENANT_ID,
          companyName: `Company ${i}`,
          email: `contact${i}@test.com`,
          source: 'website',
        });
        const lead = leadResult.getValue();

        if (statuses[i] !== LeadStatusEnum.NEW) {
          if (statuses[i] === LeadStatusEnum.QUALIFIED) {
            lead.changeStatus(LeadStatusEnum.CONTACTED, USER_ID);
            lead.updateScore(65, 'High engagement');
            lead.qualify(USER_ID);
          } else {
            lead.changeStatus(statuses[i], USER_ID);
          }
        }

        lead.clearDomainEvents();
        await repository.save(lead);
      }

      // Count by status
      const result = await repository.countByStatus(TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const counts = result.getValue();
      expect(counts[LeadStatusEnum.NEW]).toBe(2);
      expect(counts[LeadStatusEnum.CONTACTED]).toBe(1);
      expect(counts[LeadStatusEnum.QUALIFIED]).toBe(1);
    });
  });

  describe('getAverageScoreByStatus', () => {
    it('should calculate average score by status', async () => {
      // Create leads with different scores
      const leads = [
        { status: LeadStatusEnum.NEW, score: 50 },
        { status: LeadStatusEnum.NEW, score: 70 },
        { status: LeadStatusEnum.CONTACTED, score: 80 },
      ];

      for (let i = 0; i < leads.length; i++) {
        const leadResult = Lead.create({
          tenantId: TENANT_ID,
          companyName: `Company ${i}`,
          email: `contact${i}@test.com`,
          source: 'website',
        });
        const lead = leadResult.getValue();
        lead.updateScore(leads[i].score, 'Test');

        if (leads[i].status !== LeadStatusEnum.NEW) {
          lead.changeStatus(leads[i].status, USER_ID);
        }

        lead.clearDomainEvents();
        await repository.save(lead);
      }

      // Get averages
      const result = await repository.getAverageScoreByStatus(TENANT_ID);
      expect(result.isSuccess).toBe(true);

      const averages = result.getValue();
      expect(averages[LeadStatusEnum.NEW]).toBe(60); // (50 + 70) / 2
      expect(averages[LeadStatusEnum.CONTACTED]).toBe(80);
    });
  });

  describe('transaction rollback', () => {
    it('should rollback on error', async () => {
      // Create a lead with invalid data that will fail on save
      const leadResult = Lead.create({
        tenantId: TENANT_ID,
        companyName: 'Acme Corp',
        email: 'contact@acme.com',
        source: 'website',
      });
      const lead = leadResult.getValue();

      // Mock the event publisher to fail
      const failingPublisher = {
        ...mockEventPublisher,
        publish: async () => {
          throw new Error('Event publishing failed');
        },
      };

      const failingRepository = new LeadRepository(pool, failingPublisher);

      // Attempt to save (should fail)
      const saveResult = await failingRepository.save(lead);
      expect(saveResult.isFailure).toBe(true);

      // Verify lead was not saved
      const findResult = await repository.findById(lead.id, TENANT_ID);
      expect(findResult.getValue()).toBeNull();
    });
  });
});
