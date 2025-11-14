import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';

/**
 * Leads table schema
 */
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),

    // Company information
    companyName: varchar('company_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),
    industry: varchar('industry', { length: 100 }),
    employeeCount: integer('employee_count'),
    annualRevenue: integer('annual_revenue'),

    // Lead management
    status: varchar('status', { length: 50 }).notNull().default('new'),
    score: integer('score').notNull().default(50),
    source: varchar('source', { length: 100 }).notNull(),
    ownerId: uuid('owner_id'),

    // Additional info
    notes: text('notes'),
    customFields: jsonb('custom_fields').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
  },
  (table) => ({
    // Indexes for performance
    tenantIdIdx: index('leads_tenant_id_idx').on(table.tenantId),
    statusIdx: index('leads_status_idx').on(table.status),
    ownerIdIdx: index('leads_owner_id_idx').on(table.ownerId),
    scoreIdx: index('leads_score_idx').on(table.score),
    emailIdx: index('leads_email_idx').on(table.email),
    sourceIdx: index('leads_source_idx').on(table.source),
    nextFollowUpIdx: index('leads_next_follow_up_idx').on(table.nextFollowUpAt),
    // Compound indexes for common queries
    tenantStatusIdx: index('leads_tenant_status_idx').on(table.tenantId, table.status),
    tenantOwnerIdx: index('leads_tenant_owner_idx').on(table.tenantId, table.ownerId),
  })
);

/**
 * Outbox events table for transactional event publishing
 */
export const outboxEvents = pgTable(
  'outbox_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventData: jsonb('event_data').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    aggregateId: uuid('aggregate_id').notNull(),
    published: timestamp('published', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    publishedIdx: index('outbox_published_idx').on(table.published),
    tenantIdIdx: index('outbox_tenant_id_idx').on(table.tenantId),
  })
);

export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type OutboxEventRow = typeof outboxEvents.$inferSelect;
export type NewOutboxEventRow = typeof outboxEvents.$inferInsert;
