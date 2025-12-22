import { pgTable, uuid, varchar, text, integer, timestamp, jsonb, index, boolean, uniqueIndex, real } from 'drizzle-orm/pg-core';

/**
 * Leads table schema
 */
export const leads = pgTable(
  'leads',
  {
    id: uuid('id').primaryKey(),
    tenantId: uuid('tenant_id').notNull(),

    // Contact information
    fullName: varchar('full_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),

    // Company information
    companyName: varchar('company_name', { length: 255 }),
    website: varchar('website', { length: 255 }),
    industry: varchar('industry', { length: 100 }),
    employeeCount: integer('employee_count'),
    annualRevenue: integer('annual_revenue'),

    // Lead management
    status: varchar('status', { length: 50 }).notNull().default('new'),
    stageId: uuid('stage_id'), // References pipeline_stages
    score: integer('score').notNull().default(50),
    source: varchar('source', { length: 100 }).notNull().default('manual'),
    ownerId: uuid('owner_id'),

    // Additional info
    notes: text('notes'),
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    nextFollowUpAt: timestamp('next_follow_up_at', { withTimezone: true }),
    convertedAt: timestamp('converted_at', { withTimezone: true }),
    convertedToCustomerId: uuid('converted_to_customer_id'),
  },
  (table) => ({
    // Indexes for performance
    tenantIdIdx: index('leads_tenant_id_idx').on(table.tenantId),
    statusIdx: index('leads_status_idx').on(table.status),
    stageIdIdx: index('leads_stage_id_idx').on(table.stageId),
    ownerIdIdx: index('leads_owner_id_idx').on(table.ownerId),
    scoreIdx: index('leads_score_idx').on(table.score),
    emailIdx: index('leads_email_idx').on(table.email),
    sourceIdx: index('leads_source_idx').on(table.source),
    nextFollowUpIdx: index('leads_next_follow_up_idx').on(table.nextFollowUpAt),
    // Compound indexes for common queries
    tenantStatusIdx: index('leads_tenant_status_idx').on(table.tenantId, table.status),
    tenantOwnerIdx: index('leads_tenant_owner_idx').on(table.tenantId, table.ownerId),
    tenantStageIdx: index('leads_tenant_stage_idx').on(table.tenantId, table.stageId),
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

/**
 * Tenants table - Organizations/Companies using the CRM
 */
export const tenants = pgTable(
  'tenants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 100 }).notNull(), // For subdomain routing
    plan: varchar('plan', { length: 50 }).notNull().default('free'),
    isActive: boolean('is_active').notNull().default(true),
    settings: jsonb('settings').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    slugIdx: uniqueIndex('tenants_slug_idx').on(table.slug),
    planIdx: index('tenants_plan_idx').on(table.plan),
    isActiveIdx: index('tenants_is_active_idx').on(table.isActive),
  })
);

/**
 * Users table - Synced from Supabase Auth
 * Contains additional profile data not stored in Supabase
 */
export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey(), // Same as Supabase Auth user ID
    email: varchar('email', { length: 255 }).notNull(),
    fullName: varchar('full_name', { length: 255 }),
    avatarUrl: varchar('avatar_url', { length: 500 }),
    phone: varchar('phone', { length: 50 }),
    isActive: boolean('is_active').notNull().default(true),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    metadata: jsonb('metadata').notNull().default({}),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: uniqueIndex('users_email_idx').on(table.email),
    isActiveIdx: index('users_is_active_idx').on(table.isActive),
  })
);

/**
 * Tenant memberships - User-Tenant relationships with roles
 * Enables multi-tenant access with role-based permissions
 */
export const tenantMemberships = pgTable(
  'tenant_memberships',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 50 }).notNull().default('sales_rep'),
    invitedBy: uuid('invited_by'),
    invitedAt: timestamp('invited_at', { withTimezone: true }).notNull().defaultNow(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTenantIdx: uniqueIndex('memberships_user_tenant_idx').on(table.userId, table.tenantId),
    userIdIdx: index('memberships_user_id_idx').on(table.userId),
    tenantIdIdx: index('memberships_tenant_id_idx').on(table.tenantId),
    roleIdx: index('memberships_role_idx').on(table.role),
    isActiveIdx: index('memberships_is_active_idx').on(table.isActive),
  })
);

/**
 * Activity logs - Audit trail for all actions
 */
export const activityLogs = pgTable(
  'activity_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'user', 'tenant'
    entityId: uuid('entity_id').notNull(),
    action: varchar('action', { length: 50 }).notNull(), // 'created', 'updated', 'deleted', etc.
    changes: jsonb('changes').notNull().default({}), // Before/after values
    metadata: jsonb('metadata').notNull().default({}), // IP, user agent, etc.
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('activity_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('activity_user_id_idx').on(table.userId),
    entityTypeIdx: index('activity_entity_type_idx').on(table.entityType),
    entityIdIdx: index('activity_entity_id_idx').on(table.entityId),
    actionIdx: index('activity_action_idx').on(table.action),
    createdAtIdx: index('activity_created_at_idx').on(table.createdAt),
    // Compound indexes for common queries
    tenantEntityIdx: index('activity_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
    tenantCreatedAtIdx: index('activity_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

/**
 * Customers table - Converted leads
 * FASE 6.4 — Updated with tier, type, displayName, fullName for frontend alignment
 */
export const customers = pgTable(
  'customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id'), // Original lead, if converted

    // Company information (migrated from lead)
    companyName: varchar('company_name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    website: varchar('website', { length: 255 }),
    industry: varchar('industry', { length: 100 }),
    employeeCount: integer('employee_count'),
    annualRevenue: integer('annual_revenue'),

    // FASE 6.4 — Unified naming fields
    displayName: varchar('display_name', { length: 255 }), // For UI display (computed or manual)
    fullName: varchar('full_name', { length: 255 }), // Primary contact full name

    // Customer-specific fields
    name: varchar('name', { length: 255 }).notNull(), // Keep for backwards compatibility
    status: varchar('status', { length: 50 }).notNull().default('active'), // active, inactive, at_risk, churned
    accountManagerId: uuid('account_manager_id'),
    contractValue: integer('contract_value').default(0),
    contractStartDate: timestamp('contract_start_date', { withTimezone: true }),
    contractEndDate: timestamp('contract_end_date', { withTimezone: true }),

    // FASE 6.4 — New fields for frontend alignment
    type: varchar('type', { length: 50 }).notNull().default('company'), // company, individual
    tier: varchar('tier', { length: 50 }).notNull().default('standard'), // enterprise, premium, standard, basic

    // Financial metrics for customer success
    mrr: integer('mrr').default(0), // Monthly Recurring Revenue
    totalRevenue: integer('total_revenue').default(0), // FASE 6.4 — Cumulative revenue
    lifetimeValue: integer('lifetime_value').default(0), // FASE 6.4 — LTV
    lastPurchaseDate: timestamp('last_purchase_date', { withTimezone: true }), // FASE 6.4
    renewalDate: timestamp('renewal_date', { withTimezone: true }),
    churnedAt: timestamp('churned_at', { withTimezone: true }),

    // FASE 6.4 — Address JSON field for frontend compatibility
    address: jsonb('address').default({}),

    // Additional info
    notes: text('notes'),
    customFields: jsonb('custom_fields').notNull().default({}),
    tags: jsonb('tags').notNull().default([]),

    // Timestamps
    convertedAt: timestamp('converted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customers_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('customers_lead_id_idx').on(table.leadId),
    emailIdx: index('customers_email_idx').on(table.email),
    statusIdx: index('customers_status_idx').on(table.status),
    accountManagerIdx: index('customers_account_manager_idx').on(table.accountManagerId),
    tenantEmailIdx: uniqueIndex('customers_tenant_email_idx').on(table.tenantId, table.email),
    // FASE 6.4 — New indexes
    tierIdx: index('customers_tier_idx').on(table.tier),
    typeIdx: index('customers_type_idx').on(table.type),
    tenantTierIdx: index('customers_tenant_tier_idx').on(table.tenantId, table.tier),
    tenantTypeIdx: index('customers_tenant_type_idx').on(table.tenantId, table.type),
  })
);

/**
 * Notifications table - Multi-channel notification storage
 */
export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    type: varchar('type', { length: 100 }).notNull(),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'),
    recipientUserId: uuid('recipient_user_id').notNull(),
    channel: varchar('channel', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    data: jsonb('data').notNull().default({}),
    actionUrl: varchar('action_url', { length: 500 }),
    metadata: jsonb('metadata').notNull().default({}),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    failureReason: text('failure_reason'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('notifications_tenant_id_idx').on(table.tenantId),
    recipientIdx: index('notifications_recipient_idx').on(table.recipientUserId),
    statusIdx: index('notifications_status_idx').on(table.status),
    typeIdx: index('notifications_type_idx').on(table.type),
    createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    // Compound for common queries
    recipientTenantIdx: index('notifications_recipient_tenant_idx').on(table.recipientUserId, table.tenantId),
    recipientStatusIdx: index('notifications_recipient_status_idx').on(table.recipientUserId, table.status),
  })
);

/**
 * Notification preferences per user
 */
export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    channelPreferences: jsonb('channel_preferences').notNull().default({}),
    typePreferences: jsonb('type_preferences').notNull().default({}),
    quietHours: jsonb('quiet_hours'),
    emailDigest: jsonb('email_digest'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userTenantIdx: uniqueIndex('notification_prefs_user_tenant_idx').on(table.userId, table.tenantId),
  })
);

/**
 * Pipelines table - Configurable sales pipeline per tenant
 * Stores stages, transitions, and settings as JSONB for flexibility
 */
export const pipelines = pgTable(
  'pipelines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    stages: jsonb('stages').notNull().default([]),           // PipelineStage[]
    transitions: jsonb('transitions').notNull().default([]), // StageTransition[]
    settings: jsonb('settings').notNull().default({}),       // PipelineSettings
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('pipelines_tenant_id_idx').on(table.tenantId),
    isDefaultIdx: index('pipelines_is_default_idx').on(table.isDefault),
    isActiveIdx: index('pipelines_is_active_idx').on(table.isActive),
    // Note: Partial unique index for default pipeline per tenant
    // Should be enforced at application level or via a database trigger
  })
);

/**
 * Lost reasons - Predefined reasons for lost leads
 */
export const lostReasons = pgTable(
  'lost_reasons',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    isActive: boolean('is_active').notNull().default(true),
    order: integer('order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lost_reasons_tenant_id_idx').on(table.tenantId),
    isActiveIdx: index('lost_reasons_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('lost_reasons_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Lead Contacts table - Multiple contacts per lead
 */
export const leadContacts = pgTable(
  'lead_contacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),

    // Contact information
    firstName: varchar('first_name', { length: 100 }).notNull(),
    lastName: varchar('last_name', { length: 100 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    mobilePhone: varchar('mobile_phone', { length: 50 }),
    jobTitle: varchar('job_title', { length: 100 }),
    department: varchar('department', { length: 100 }),

    // Contact classification
    contactType: varchar('contact_type', { length: 50 }).notNull().default('other'),
    contactRole: varchar('contact_role', { length: 50 }),
    isPrimary: boolean('is_primary').notNull().default(false),

    // Preferences and social
    preferences: jsonb('preferences'),
    linkedinUrl: varchar('linkedin_url', { length: 500 }),
    notes: text('notes'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('contacts_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('contacts_lead_id_idx').on(table.leadId),
    emailIdx: index('contacts_email_idx').on(table.email),
    isPrimaryIdx: index('contacts_is_primary_idx').on(table.isPrimary),
    tenantLeadIdx: index('contacts_tenant_lead_idx').on(table.tenantId, table.leadId),
  })
);

/**
 * Lead Communications table - Calls, emails, meetings tracking
 */
export const leadCommunications = pgTable(
  'lead_communications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    contactId: uuid('contact_id').references(() => leadContacts.id, { onDelete: 'set null' }),

    // Communication details
    communicationType: varchar('communication_type', { length: 50 }).notNull(), // call, email, meeting, note, sms
    direction: varchar('direction', { length: 20 }).notNull(), // inbound, outbound
    status: varchar('status', { length: 50 }).notNull().default('completed'),

    // Content
    subject: varchar('subject', { length: 500 }),
    body: text('body'),
    summary: text('summary'),

    // Type-specific details stored as JSONB
    callDetails: jsonb('call_details'), // duration, outcome, recording_url
    emailDetails: jsonb('email_details'), // from, to, cc, bcc, attachments
    meetingDetails: jsonb('meeting_details'), // attendees, location, calendar_event_id

    // Scheduling
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    durationMinutes: integer('duration_minutes'),

    // Participants
    participants: jsonb('participants').notNull().default([]),
    attachments: jsonb('attachments').notNull().default([]),

    // Metadata
    tags: jsonb('tags').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),

    // Audit
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('communications_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('communications_lead_id_idx').on(table.leadId),
    contactIdIdx: index('communications_contact_id_idx').on(table.contactId),
    typeIdx: index('communications_type_idx').on(table.communicationType),
    statusIdx: index('communications_status_idx').on(table.status),
    occurredAtIdx: index('communications_occurred_at_idx').on(table.occurredAt),
    scheduledAtIdx: index('communications_scheduled_at_idx').on(table.scheduledAt),
    tenantLeadIdx: index('communications_tenant_lead_idx').on(table.tenantId, table.leadId),
    createdByIdx: index('communications_created_by_idx').on(table.createdBy),
  })
);

/**
 * Opportunities/Deals table - Sales opportunities tracking
 * FASE 6.4 — Added priority field for frontend alignment
 */
export const opportunities = pgTable(
  'opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    pipelineId: uuid('pipeline_id').references(() => pipelines.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id'), // FASE 6.4 — Added for frontend compatibility

    // Opportunity details - Database uses 'name' and 'stage' columns
    name: varchar('name', { length: 255 }).notNull(), // Database column is 'name'
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull().default('open'), // open, won, lost, stalled
    stage: varchar('stage', { length: 100 }), // Database uses 'stage' varchar, not 'stage_id' uuid
    stageId: uuid('stage_id'), // Optional reference to pipeline stages for advanced pipelines
    probability: integer('probability').notNull().default(50), // 0-100

    // FASE 6.4 — Priority field for frontend alignment
    priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, critical

    // Financial - Database uses 'value' column
    amount: real('value'), // Decimal amount (not cents) - mapped to 'value' column in DB
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    recurringAmount: real('recurring_amount'),
    recurringFrequency: varchar('recurring_frequency', { length: 20 }), // monthly, quarterly, annually

    // Assignment
    ownerId: uuid('owner_id'),
    teamId: uuid('team_id'),

    // Timeline
    expectedCloseDate: timestamp('expected_close_date', { withTimezone: true }),
    actualCloseDate: timestamp('actual_close_date', { withTimezone: true }),

    // Win/Loss tracking
    lostReasonId: uuid('lost_reason_id').references(() => lostReasons.id, { onDelete: 'set null' }),
    lostReason: text('lost_reason'), // Free text reason
    competitorId: uuid('competitor_id'),
    wonNotes: text('won_notes'), // Notes when won

    // Additional info
    source: varchar('source', { length: 100 }),
    campaignId: uuid('campaign_id'),
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),
    metadata: jsonb('metadata').default({}), // FASE 6.4 — Added for extensibility

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('opportunities_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('opportunities_lead_id_idx').on(table.leadId),
    customerIdIdx: index('opportunities_customer_id_idx').on(table.customerId),
    pipelineIdIdx: index('opportunities_pipeline_id_idx').on(table.pipelineId),
    statusIdx: index('opportunities_status_idx').on(table.status),
    stageIdIdx: index('opportunities_stage_id_idx').on(table.stageId),
    ownerIdIdx: index('opportunities_owner_id_idx').on(table.ownerId),
    expectedCloseIdx: index('opportunities_expected_close_idx').on(table.expectedCloseDate),
    tenantStatusIdx: index('opportunities_tenant_status_idx').on(table.tenantId, table.status),
    tenantOwnerIdx: index('opportunities_tenant_owner_idx').on(table.tenantId, table.ownerId),
    tenantStageIdx: index('opportunities_tenant_stage_idx').on(table.tenantId, table.stageId),
    // FASE 6.4 — New indexes
    priorityIdx: index('opportunities_priority_idx').on(table.priority),
    tenantPriorityIdx: index('opportunities_tenant_priority_idx').on(table.tenantId, table.priority),
    contactIdIdx: index('opportunities_contact_id_idx').on(table.contactId),
  })
);

/**
 * Tasks table - Action items and reminders
 */
export const tasks = pgTable(
  'tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Related entities (polymorphic - can be linked to lead, customer, or opportunity)
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'cascade' }),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id, { onDelete: 'cascade' }),

    // Task details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull().default('task'), // task, call, email, meeting, follow_up
    priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, urgent
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, in_progress, completed, cancelled

    // Assignment
    assignedTo: uuid('assigned_to'),
    assignedBy: uuid('assigned_by'),

    // Scheduling
    dueDate: timestamp('due_date', { withTimezone: true }),
    reminderAt: timestamp('reminder_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Recurrence
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: jsonb('recurrence_rule'), // iCal RRULE format

    // Outcome
    outcome: text('outcome'),
    nextTaskId: uuid('next_task_id'), // Link to next task if recurring or follow-up

    // Metadata
    tags: jsonb('tags').notNull().default([]),
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('tasks_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('tasks_lead_id_idx').on(table.leadId),
    customerIdIdx: index('tasks_customer_id_idx').on(table.customerId),
    opportunityIdIdx: index('tasks_opportunity_id_idx').on(table.opportunityId),
    assignedToIdx: index('tasks_assigned_to_idx').on(table.assignedTo),
    statusIdx: index('tasks_status_idx').on(table.status),
    priorityIdx: index('tasks_priority_idx').on(table.priority),
    dueDateIdx: index('tasks_due_date_idx').on(table.dueDate),
    reminderAtIdx: index('tasks_reminder_at_idx').on(table.reminderAt),
    tenantStatusIdx: index('tasks_tenant_status_idx').on(table.tenantId, table.status),
    tenantAssignedIdx: index('tasks_tenant_assigned_idx').on(table.tenantId, table.assignedTo),
    tenantDueIdx: index('tasks_tenant_due_idx').on(table.tenantId, table.dueDate),
  })
);

/**
 * Webhooks configuration table
 */
export const webhooks = pgTable(
  'webhooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    // Webhook configuration
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    url: varchar('url', { length: 2048 }).notNull(),
    secret: varchar('secret', { length: 255 }), // For HMAC signing

    // Event filtering
    events: jsonb('events').notNull().default([]), // Array of event types to subscribe to
    entityTypes: jsonb('entity_types').notNull().default([]), // lead, customer, opportunity, etc.

    // Request configuration
    httpMethod: varchar('http_method', { length: 10 }).notNull().default('POST'),
    headers: jsonb('headers').notNull().default({}),
    contentType: varchar('content_type', { length: 100 }).notNull().default('application/json'),

    // Retry configuration
    retryPolicy: jsonb('retry_policy').notNull().default({ maxRetries: 3, backoffMultiplier: 2 }),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastTriggeredAt: timestamp('last_triggered_at', { withTimezone: true }),
    failureCount: integer('failure_count').notNull().default(0),
    lastFailureAt: timestamp('last_failure_at', { withTimezone: true }),
    lastFailureReason: text('last_failure_reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('webhooks_tenant_id_idx').on(table.tenantId),
    isActiveIdx: index('webhooks_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('webhooks_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

/**
 * Webhook deliveries - History of webhook invocations
 */
export const webhookDeliveries = pgTable(
  'webhook_deliveries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    webhookId: uuid('webhook_id').notNull().references(() => webhooks.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Event details
    eventType: varchar('event_type', { length: 100 }).notNull(),
    eventId: uuid('event_id').notNull(),
    payload: jsonb('payload').notNull(),

    // Delivery status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, success, failed
    attempts: integer('attempts').notNull().default(0),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

    // Response details
    responseStatus: integer('response_status'),
    responseHeaders: jsonb('response_headers'),
    responseBody: text('response_body'),
    responseTimeMs: integer('response_time_ms'),

    // Error tracking
    errorMessage: text('error_message'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  },
  (table) => ({
    webhookIdIdx: index('deliveries_webhook_id_idx').on(table.webhookId),
    tenantIdIdx: index('deliveries_tenant_id_idx').on(table.tenantId),
    statusIdx: index('deliveries_status_idx').on(table.status),
    createdAtIdx: index('deliveries_created_at_idx').on(table.createdAt),
    nextRetryIdx: index('deliveries_next_retry_idx').on(table.nextRetryAt),
    webhookStatusIdx: index('deliveries_webhook_status_idx').on(table.webhookId, table.status),
  })
);

/**
 * Scoring rules configuration
 */
export const scoringRules = pgTable(
  'scoring_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),

    // Rule details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 50 }).notNull(), // attribute, behavior, engagement, decay, bonus
    field: varchar('field', { length: 100 }).notNull(),
    operator: varchar('operator', { length: 50 }).notNull(), // equals, contains, greater_than, etc.
    value: jsonb('value').notNull(),
    points: integer('points').notNull(),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    priority: integer('priority').notNull().default(0),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('scoring_rules_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('scoring_rules_category_idx').on(table.category),
    isActiveIdx: index('scoring_rules_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('scoring_rules_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

/**
 * Saved searches
 */
export const savedSearches = pgTable(
  'saved_searches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Search details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    options: jsonb('options').notNull(), // SearchOptions
    isPublic: boolean('is_public').notNull().default(false),

    // Usage tracking
    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('saved_searches_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('saved_searches_user_id_idx').on(table.userId),
    isPublicIdx: index('saved_searches_is_public_idx').on(table.isPublic),
    tenantUserIdx: index('saved_searches_tenant_user_idx').on(table.tenantId, table.userId),
  })
);

/**
 * Search history
 */
export const searchHistory = pgTable(
  'search_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id'),

    // Search details
    query: varchar('query', { length: 500 }).notNull(),
    entityTypes: jsonb('entity_types').notNull().default([]),
    resultCount: integer('result_count').notNull().default(0),

    // Timestamp
    searchedAt: timestamp('searched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('search_history_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('search_history_user_id_idx').on(table.userId),
    searchedAtIdx: index('search_history_searched_at_idx').on(table.searchedAt),
    tenantUserIdx: index('search_history_tenant_user_idx').on(table.tenantId, table.userId),
  })
);

/**
 * Email templates
 */
export const emailTemplates = pgTable(
  'email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Template details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }), // notification, marketing, transactional
    subject: varchar('subject', { length: 500 }).notNull(),
    bodyHtml: text('body_html').notNull(),
    bodyText: text('body_text'),

    // Variables
    variables: jsonb('variables').notNull().default([]), // Available template variables

    // Status
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('email_templates_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('email_templates_category_idx').on(table.category),
    isActiveIdx: index('email_templates_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('email_templates_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Import jobs tracking
 */
export const importJobs = pgTable(
  'import_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Job details
    type: varchar('type', { length: 50 }).notNull(), // leads, contacts, customers
    fileName: varchar('file_name', { length: 255 }).notNull(),
    fileUrl: varchar('file_url', { length: 2048 }),
    fileSize: integer('file_size'),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // pending, processing, completed, failed
    progress: integer('progress').notNull().default(0), // 0-100

    // Results
    totalRows: integer('total_rows'),
    processedRows: integer('processed_rows').notNull().default(0),
    successCount: integer('success_count').notNull().default(0),
    errorCount: integer('error_count').notNull().default(0),
    errors: jsonb('errors').notNull().default([]),

    // Configuration
    mapping: jsonb('mapping').notNull().default({}), // Column mapping
    options: jsonb('options').notNull().default({}), // Import options

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('import_jobs_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('import_jobs_user_id_idx').on(table.userId),
    statusIdx: index('import_jobs_status_idx').on(table.status),
    createdAtIdx: index('import_jobs_created_at_idx').on(table.createdAt),
    tenantStatusIdx: index('import_jobs_tenant_status_idx').on(table.tenantId, table.status),
  })
);

// Type exports
export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;
export type OutboxEventRow = typeof outboxEvents.$inferSelect;
export type NewOutboxEventRow = typeof outboxEvents.$inferInsert;
export type TenantRow = typeof tenants.$inferSelect;
export type NewTenantRow = typeof tenants.$inferInsert;
export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type TenantMembershipRow = typeof tenantMemberships.$inferSelect;
export type NewTenantMembershipRow = typeof tenantMemberships.$inferInsert;
export type ActivityLogRow = typeof activityLogs.$inferSelect;
export type NewActivityLogRow = typeof activityLogs.$inferInsert;
export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type NotificationPreferencesRow = typeof notificationPreferences.$inferSelect;
export type NewNotificationPreferencesRow = typeof notificationPreferences.$inferInsert;
export type PipelineRow = typeof pipelines.$inferSelect;
export type NewPipelineRow = typeof pipelines.$inferInsert;
export type LostReasonRow = typeof lostReasons.$inferSelect;
export type NewLostReasonRow = typeof lostReasons.$inferInsert;
export type LeadContactRow = typeof leadContacts.$inferSelect;
export type NewLeadContactRow = typeof leadContacts.$inferInsert;
export type LeadCommunicationRow = typeof leadCommunications.$inferSelect;
export type NewLeadCommunicationRow = typeof leadCommunications.$inferInsert;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type NewOpportunityRow = typeof opportunities.$inferInsert;
export type TaskRow = typeof tasks.$inferSelect;
export type NewTaskRow = typeof tasks.$inferInsert;
export type WebhookRow = typeof webhooks.$inferSelect;
export type NewWebhookRow = typeof webhooks.$inferInsert;
export type WebhookDeliveryRow = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDeliveryRow = typeof webhookDeliveries.$inferInsert;
export type ScoringRuleRow = typeof scoringRules.$inferSelect;
export type NewScoringRuleRow = typeof scoringRules.$inferInsert;
export type SavedSearchRow = typeof savedSearches.$inferSelect;
export type NewSavedSearchRow = typeof savedSearches.$inferInsert;
export type SearchHistoryRow = typeof searchHistory.$inferSelect;
export type NewSearchHistoryRow = typeof searchHistory.$inferInsert;
export type EmailTemplateRow = typeof emailTemplates.$inferSelect;
export type NewEmailTemplateRow = typeof emailTemplates.$inferInsert;
export type ImportJobRow = typeof importJobs.$inferSelect;
export type NewImportJobRow = typeof importJobs.$inferInsert;

/**
 * Calendar integrations - OAuth connections to Google/Microsoft calendars
 */
export const calendarIntegrations = pgTable(
  'calendar_integrations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    // Provider details
    provider: varchar('provider', { length: 50 }).notNull(), // 'google' | 'microsoft'
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(), // Email or ID from provider
    calendarId: varchar('calendar_id', { length: 500 }).notNull(), // Primary calendar ID

    // OAuth tokens (encrypted in production)
    accessToken: text('access_token').notNull(),
    refreshToken: text('refresh_token'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: jsonb('scopes').notNull().default([]),

    // Sync settings
    syncEnabled: boolean('sync_enabled').notNull().default(true),
    syncDirection: varchar('sync_direction', { length: 20 }).notNull().default('both'), // 'to_crm', 'from_crm', 'both'
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    syncToken: varchar('sync_token', { length: 500 }), // For incremental sync

    // Webhook subscription
    webhookChannelId: varchar('webhook_channel_id', { length: 255 }),
    webhookResourceId: varchar('webhook_resource_id', { length: 255 }),
    webhookExpiresAt: timestamp('webhook_expires_at', { withTimezone: true }),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    errorCount: integer('error_count').notNull().default(0),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastError: text('last_error'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('calendar_integrations_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('calendar_integrations_user_id_idx').on(table.userId),
    providerIdx: index('calendar_integrations_provider_idx').on(table.provider),
    isActiveIdx: index('calendar_integrations_is_active_idx').on(table.isActive),
    tenantUserIdx: index('calendar_integrations_tenant_user_idx').on(table.tenantId, table.userId),
    userProviderIdx: uniqueIndex('calendar_integrations_user_provider_idx').on(table.userId, table.provider),
  })
);

/**
 * Calendar events - Synced events linked to CRM entities
 */
export const calendarEvents = pgTable(
  'calendar_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    integrationId: uuid('integration_id').notNull().references(() => calendarIntegrations.id, { onDelete: 'cascade' }),

    // Provider event details
    providerEventId: varchar('provider_event_id', { length: 500 }).notNull(),
    calendarId: varchar('calendar_id', { length: 500 }).notNull(),

    // Event details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    location: varchar('location', { length: 500 }),

    // Timing
    startTime: timestamp('start_time', { withTimezone: true }).notNull(),
    endTime: timestamp('end_time', { withTimezone: true }).notNull(),
    isAllDay: boolean('is_all_day').notNull().default(false),
    timezone: varchar('timezone', { length: 100 }),

    // Status and visibility
    status: varchar('status', { length: 50 }).notNull().default('confirmed'), // confirmed, tentative, cancelled
    visibility: varchar('visibility', { length: 50 }).notNull().default('default'), // default, public, private, confidential

    // Attendees
    attendees: jsonb('attendees').notNull().default([]),
    organizerEmail: varchar('organizer_email', { length: 255 }),

    // Conference/Meeting
    conferenceData: jsonb('conference_data'),

    // Recurrence
    isRecurring: boolean('is_recurring').notNull().default(false),
    recurrenceRule: varchar('recurrence_rule', { length: 500 }), // RRULE format
    recurringEventId: varchar('recurring_event_id', { length: 500 }), // ID of the recurring series

    // Reminders
    reminders: jsonb('reminders').notNull().default([]),

    // CRM entity links
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id, { onDelete: 'set null' }),
    taskId: uuid('task_id').references(() => tasks.id, { onDelete: 'set null' }),

    // Sync metadata
    syncStatus: varchar('sync_status', { length: 50 }).notNull().default('synced'), // synced, pending, error, conflict
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    providerUpdatedAt: timestamp('provider_updated_at', { withTimezone: true }),
    etag: varchar('etag', { length: 255 }), // For conflict detection

    // Source tracking
    createdFromCrm: boolean('created_from_crm').notNull().default(false),
    createdBy: uuid('created_by'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('calendar_events_tenant_id_idx').on(table.tenantId),
    integrationIdIdx: index('calendar_events_integration_id_idx').on(table.integrationId),
    providerEventIdx: index('calendar_events_provider_event_idx').on(table.providerEventId),
    startTimeIdx: index('calendar_events_start_time_idx').on(table.startTime),
    endTimeIdx: index('calendar_events_end_time_idx').on(table.endTime),
    leadIdIdx: index('calendar_events_lead_id_idx').on(table.leadId),
    customerIdIdx: index('calendar_events_customer_id_idx').on(table.customerId),
    opportunityIdIdx: index('calendar_events_opportunity_id_idx').on(table.opportunityId),
    taskIdIdx: index('calendar_events_task_id_idx').on(table.taskId),
    syncStatusIdx: index('calendar_events_sync_status_idx').on(table.syncStatus),
    tenantStartIdx: index('calendar_events_tenant_start_idx').on(table.tenantId, table.startTime),
    integrationProviderIdx: uniqueIndex('calendar_events_integration_provider_idx').on(table.integrationId, table.providerEventId),
  })
);

// Calendar type exports
export type CalendarIntegrationRow = typeof calendarIntegrations.$inferSelect;
export type NewCalendarIntegrationRow = typeof calendarIntegrations.$inferInsert;
export type CalendarEventRow = typeof calendarEvents.$inferSelect;
export type NewCalendarEventRow = typeof calendarEvents.$inferInsert;

/**
 * Notes/Comments - Threaded comments on CRM entities
 * Supports @mentions, rich text, and nested replies
 */
export const notes = pgTable(
  'notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Entity linkage (polymorphic - can be attached to lead, customer, opportunity, task)
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'customer', 'opportunity', 'task', 'contact'
    entityId: uuid('entity_id').notNull(),

    // Threading support
    parentId: uuid('parent_id'), // Self-reference for replies
    threadId: uuid('thread_id'), // Root note ID for grouping thread

    // Content
    content: text('content').notNull(),
    contentHtml: text('content_html'), // Rendered HTML for rich text
    contentType: varchar('content_type', { length: 20 }).notNull().default('text'), // 'text', 'markdown', 'html'

    // Mentions
    mentions: jsonb('mentions').notNull().default([]), // Array of { userId, startIndex, endIndex }

    // Note type
    noteType: varchar('note_type', { length: 50 }).notNull().default('note'), // 'note', 'comment', 'internal', 'system'
    isPinned: boolean('is_pinned').notNull().default(false),
    isPrivate: boolean('is_private').notNull().default(false), // Only visible to creator and admins

    // Reactions (like GitHub reactions)
    reactions: jsonb('reactions').notNull().default({}), // { '👍': ['userId1'], '❤️': ['userId2'] }

    // Edit tracking
    isEdited: boolean('is_edited').notNull().default(false),
    editedAt: timestamp('edited_at', { withTimezone: true }),

    // Audit
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => ({
    tenantIdIdx: index('notes_tenant_id_idx').on(table.tenantId),
    entityIdx: index('notes_entity_idx').on(table.entityType, table.entityId),
    parentIdIdx: index('notes_parent_id_idx').on(table.parentId),
    threadIdIdx: index('notes_thread_id_idx').on(table.threadId),
    createdByIdx: index('notes_created_by_idx').on(table.createdBy),
    createdAtIdx: index('notes_created_at_idx').on(table.createdAt),
    isPinnedIdx: index('notes_is_pinned_idx').on(table.isPinned),
    tenantEntityIdx: index('notes_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
  })
);

/**
 * File Attachments - Cloud storage file references
 * Supports multiple storage providers (S3, GCS, Azure, Supabase Storage)
 */
export const attachments = pgTable(
  'attachments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Entity linkage (polymorphic)
    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'customer', 'opportunity', 'task', 'note', 'communication'
    entityId: uuid('entity_id').notNull(),

    // File metadata
    fileName: varchar('file_name', { length: 500 }).notNull(),
    originalName: varchar('original_name', { length: 500 }).notNull(),
    mimeType: varchar('mime_type', { length: 255 }).notNull(),
    fileSize: integer('file_size').notNull(), // in bytes
    fileExtension: varchar('file_extension', { length: 20 }),

    // Storage location
    storageProvider: varchar('storage_provider', { length: 50 }).notNull().default('s3'), // 's3', 'gcs', 'azure', 'supabase', 'local'
    storageBucket: varchar('storage_bucket', { length: 255 }).notNull(),
    storageKey: varchar('storage_key', { length: 1000 }).notNull(), // Full path in bucket
    storageUrl: text('storage_url'), // Public or signed URL

    // Security
    isPublic: boolean('is_public').notNull().default(false),
    accessLevel: varchar('access_level', { length: 50 }).notNull().default('private'), // 'private', 'team', 'public'

    // Preview/Thumbnails
    thumbnailUrl: text('thumbnail_url'),
    previewAvailable: boolean('preview_available').notNull().default(false),

    // Categorization
    category: varchar('category', { length: 100 }), // 'document', 'image', 'video', 'audio', 'contract', 'proposal', 'invoice'
    tags: jsonb('tags').notNull().default([]),
    description: text('description'),

    // Version tracking
    version: integer('version').notNull().default(1),
    previousVersionId: uuid('previous_version_id'),

    // Virus scan status
    scanStatus: varchar('scan_status', { length: 50 }).notNull().default('pending'), // 'pending', 'clean', 'infected', 'error'
    scannedAt: timestamp('scanned_at', { withTimezone: true }),

    // Download tracking
    downloadCount: integer('download_count').notNull().default(0),
    lastDownloadedAt: timestamp('last_downloaded_at', { withTimezone: true }),
    lastDownloadedBy: uuid('last_downloaded_by'),

    // Audit
    uploadedBy: uuid('uploaded_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }), // Soft delete
  },
  (table) => ({
    tenantIdIdx: index('attachments_tenant_id_idx').on(table.tenantId),
    entityIdx: index('attachments_entity_idx').on(table.entityType, table.entityId),
    mimeTypeIdx: index('attachments_mime_type_idx').on(table.mimeType),
    categoryIdx: index('attachments_category_idx').on(table.category),
    uploadedByIdx: index('attachments_uploaded_by_idx').on(table.uploadedBy),
    createdAtIdx: index('attachments_created_at_idx').on(table.createdAt),
    storageKeyIdx: uniqueIndex('attachments_storage_key_idx').on(table.storageProvider, table.storageBucket, table.storageKey),
    tenantEntityIdx: index('attachments_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
  })
);

/**
 * Workflows - Automation rules for CRM
 * Trigger-based actions for lead management
 */
export const workflows = pgTable(
  'workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Workflow identification
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }), // 'lead_management', 'sales', 'notifications', 'data_enrichment'

    // Trigger configuration
    triggerType: varchar('trigger_type', { length: 100 }).notNull(), // 'lead_created', 'lead_updated', 'lead_status_changed', 'deal_won', 'task_overdue', 'scheduled', 'webhook'
    triggerConditions: jsonb('trigger_conditions').notNull().default({}), // Filter conditions for when to trigger
    triggerEntityType: varchar('trigger_entity_type', { length: 50 }), // 'lead', 'customer', 'opportunity', 'task'

    // Actions to execute
    actions: jsonb('actions').notNull().default([]), // Array of { type, config } - e.g., send_email, update_field, create_task, notify_user

    // Execution settings
    isActive: boolean('is_active').notNull().default(true),
    priority: integer('priority').notNull().default(100), // Lower = higher priority
    runOnce: boolean('run_once').notNull().default(false), // Only run once per entity
    delaySeconds: integer('delay_seconds').notNull().default(0), // Delay before execution

    // Schedule (for scheduled triggers)
    schedule: jsonb('schedule'), // Cron expression or interval config

    // Rate limiting
    maxExecutionsPerHour: integer('max_executions_per_hour'),
    maxExecutionsPerDay: integer('max_executions_per_day'),

    // Execution stats
    executionCount: integer('execution_count').notNull().default(0),
    lastExecutedAt: timestamp('last_executed_at', { withTimezone: true }),
    lastErrorAt: timestamp('last_error_at', { withTimezone: true }),
    lastError: text('last_error'),

    // Version control
    version: integer('version').notNull().default(1),
    publishedAt: timestamp('published_at', { withTimezone: true }),

    // Audit
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('workflows_tenant_id_idx').on(table.tenantId),
    triggerTypeIdx: index('workflows_trigger_type_idx').on(table.triggerType),
    isActiveIdx: index('workflows_is_active_idx').on(table.isActive),
    categoryIdx: index('workflows_category_idx').on(table.category),
    tenantActiveIdx: index('workflows_tenant_active_idx').on(table.tenantId, table.isActive),
    priorityIdx: index('workflows_priority_idx').on(table.priority),
  })
);

/**
 * Workflow Executions - Log of workflow runs
 */
export const workflowExecutions = pgTable(
  'workflow_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workflowId: uuid('workflow_id').notNull().references(() => workflows.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Trigger info
    triggerEntityType: varchar('trigger_entity_type', { length: 50 }),
    triggerEntityId: uuid('trigger_entity_id'),
    triggerEvent: varchar('trigger_event', { length: 100 }).notNull(),
    triggerData: jsonb('trigger_data').notNull().default({}),

    // Execution status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'

    // Action results
    actionsExecuted: jsonb('actions_executed').notNull().default([]), // Array of { actionType, status, result, error, executedAt }
    totalActions: integer('total_actions').notNull().default(0),
    completedActions: integer('completed_actions').notNull().default(0),
    failedActions: integer('failed_actions').notNull().default(0),

    // Error tracking
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),

    // Timing
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    durationMs: integer('duration_ms'),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    workflowIdIdx: index('workflow_executions_workflow_id_idx').on(table.workflowId),
    tenantIdIdx: index('workflow_executions_tenant_id_idx').on(table.tenantId),
    statusIdx: index('workflow_executions_status_idx').on(table.status),
    triggerEntityIdx: index('workflow_executions_trigger_entity_idx').on(table.triggerEntityType, table.triggerEntityId),
    createdAtIdx: index('workflow_executions_created_at_idx').on(table.createdAt),
    workflowStatusIdx: index('workflow_executions_workflow_status_idx').on(table.workflowId, table.status),
  })
);

/**
 * Push Devices Table
 * Stores device registrations for push notifications
 */
export const pushDevices = pgTable(
  'push_devices',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Provider info
    provider: varchar('provider', { length: 50 }).notNull(), // 'firebase', 'onesignal'
    token: text('token').notNull(),
    platform: varchar('platform', { length: 20 }).notNull(), // 'ios', 'android', 'web'

    // Device info
    deviceInfo: jsonb('device_info').notNull().default({}), // { model, osVersion, appVersion }

    // Status
    isActive: boolean('is_active').notNull().default(true),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }).notNull().defaultNow(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index('push_devices_user_id_idx').on(table.userId),
    tenantIdIdx: index('push_devices_tenant_id_idx').on(table.tenantId),
    providerIdx: index('push_devices_provider_idx').on(table.provider),
    tokenIdx: index('push_devices_token_idx').on(table.token),
    userTokenProviderUnique: index('push_devices_user_token_provider_idx').on(
      table.userId,
      table.token,
      table.provider
    ),
    activeIdx: index('push_devices_active_idx').on(table.isActive),
  })
);

// Notes type exports
export type NoteRow = typeof notes.$inferSelect;
export type NewNoteRow = typeof notes.$inferInsert;

// Attachments type exports
export type AttachmentRow = typeof attachments.$inferSelect;
export type NewAttachmentRow = typeof attachments.$inferInsert;

// Workflow type exports
export type WorkflowRow = typeof workflows.$inferSelect;
export type NewWorkflowRow = typeof workflows.$inferInsert;
export type WorkflowExecutionRow = typeof workflowExecutions.$inferSelect;
export type NewWorkflowExecutionRow = typeof workflowExecutions.$inferInsert;

// Push devices type exports
export type PushDeviceRow = typeof pushDevices.$inferSelect;
export type NewPushDeviceRow = typeof pushDevices.$inferInsert;

/**
 * Email Accounts Table
 * Stores email account connections for sync
 */
export const emailAccounts = pgTable(
  'email_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Provider info
    provider: varchar('provider', { length: 50 }).notNull(), // 'google', 'microsoft', 'imap'
    email: varchar('email', { length: 255 }).notNull(),
    displayName: varchar('display_name', { length: 255 }),

    // OAuth credentials
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    tokenExpiry: timestamp('token_expiry', { withTimezone: true }),

    // IMAP/SMTP credentials
    imapHost: varchar('imap_host', { length: 255 }),
    imapPort: integer('imap_port'),
    imapUser: varchar('imap_user', { length: 255 }),
    imapPassword: text('imap_password'), // Encrypted
    smtpHost: varchar('smtp_host', { length: 255 }),
    smtpPort: integer('smtp_port'),

    // Sync settings
    syncDirection: varchar('sync_direction', { length: 50 }).notNull().default('bidirectional'),
    syncFolders: jsonb('sync_folders').notNull().default(['INBOX', 'SENT']),
    lastSyncAt: timestamp('last_sync_at', { withTimezone: true }),
    syncStatus: varchar('sync_status', { length: 50 }).notNull().default('active'),
    syncError: text('sync_error'),

    // Matching settings
    autoMatchLeads: boolean('auto_match_leads').notNull().default(true),
    matchByDomain: boolean('match_by_domain').notNull().default(true),
    matchByEmail: boolean('match_by_email').notNull().default(true),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('email_accounts_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('email_accounts_user_id_idx').on(table.userId),
    emailIdx: index('email_accounts_email_idx').on(table.email),
    tenantEmailUnique: index('email_accounts_tenant_email_idx').on(table.tenantId, table.email),
  })
);

/**
 * Email Messages Table
 * Stores synchronized email messages
 */
export const emailMessages = pgTable(
  'email_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    accountId: uuid('account_id').notNull(),

    // External IDs
    externalId: varchar('external_id', { length: 255 }).notNull(),
    externalThreadId: varchar('external_thread_id', { length: 255 }),
    threadId: uuid('thread_id'),

    // Message details
    subject: text('subject').notNull(),
    snippet: text('snippet'),
    body: text('body').notNull(),
    bodyHtml: text('body_html'),
    bodyPlain: text('body_plain'),

    // Addresses
    fromEmail: varchar('from_email', { length: 255 }).notNull(),
    fromName: varchar('from_name', { length: 255 }),
    toAddresses: jsonb('to_addresses').notNull().default([]),
    ccAddresses: jsonb('cc_addresses').notNull().default([]),
    bccAddresses: jsonb('bcc_addresses').notNull().default([]),

    // Headers
    messageId: varchar('message_id', { length: 255 }),
    inReplyTo: varchar('in_reply_to', { length: 255 }),

    // Attachments
    hasAttachments: boolean('has_attachments').notNull().default(false),
    attachments: jsonb('attachments').notNull().default([]),

    // Status
    isRead: boolean('is_read').notNull().default(false),
    isStarred: boolean('is_starred').notNull().default(false),
    isArchived: boolean('is_archived').notNull().default(false),
    isDraft: boolean('is_draft').notNull().default(false),
    isSent: boolean('is_sent').notNull().default(false),

    // Labels/Folders
    labels: jsonb('labels').notNull().default([]),
    folder: varchar('folder', { length: 100 }).notNull().default('INBOX'),

    // CRM linking
    linkedEntityType: varchar('linked_entity_type', { length: 50 }),
    linkedEntityId: uuid('linked_entity_id'),
    isLinkedManually: boolean('is_linked_manually').notNull().default(false),

    // Timestamps
    sentAt: timestamp('sent_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    syncedAt: timestamp('synced_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('email_messages_tenant_id_idx').on(table.tenantId),
    accountIdIdx: index('email_messages_account_id_idx').on(table.accountId),
    externalIdIdx: index('email_messages_external_id_idx').on(table.externalId),
    threadIdIdx: index('email_messages_thread_id_idx').on(table.threadId),
    linkedEntityIdx: index('email_messages_linked_entity_idx').on(table.linkedEntityType, table.linkedEntityId),
    receivedAtIdx: index('email_messages_received_at_idx').on(table.receivedAt),
    fromEmailIdx: index('email_messages_from_email_idx').on(table.fromEmail),
  })
);

/**
 * Email Sync Jobs Table
 * Tracks email synchronization jobs
 */
export const emailSyncJobs = pgTable(
  'email_sync_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    accountId: uuid('account_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Job info
    type: varchar('type', { length: 50 }).notNull(), // 'full', 'incremental', 'folder'
    folder: varchar('folder', { length: 100 }),
    status: varchar('status', { length: 50 }).notNull().default('pending'),

    // Progress
    totalMessages: integer('total_messages'),
    processedMessages: integer('processed_messages').notNull().default(0),
    newMessages: integer('new_messages').notNull().default(0),
    updatedMessages: integer('updated_messages').notNull().default(0),

    // Error info
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    accountIdIdx: index('email_sync_jobs_account_id_idx').on(table.accountId),
    tenantIdIdx: index('email_sync_jobs_tenant_id_idx').on(table.tenantId),
    statusIdx: index('email_sync_jobs_status_idx').on(table.status),
  })
);

// Email type exports
export type EmailAccountRow = typeof emailAccounts.$inferSelect;
export type NewEmailAccountRow = typeof emailAccounts.$inferInsert;
export type EmailMessageRow = typeof emailMessages.$inferSelect;
export type NewEmailMessageRow = typeof emailMessages.$inferInsert;
export type EmailSyncJobRow = typeof emailSyncJobs.$inferSelect;
export type NewEmailSyncJobRow = typeof emailSyncJobs.$inferInsert;

/**
 * SMS Messages Table
 * Stores sent and received SMS messages
 */
export const smsMessages = pgTable(
  'sms_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id'),

    // Provider info
    provider: varchar('provider', { length: 50 }).notNull(), // 'twilio', 'vonage', 'messagebird'
    externalId: varchar('external_id', { length: 255 }), // Provider's message ID

    // Message details
    fromNumber: varchar('from_number', { length: 50 }).notNull(),
    toNumber: varchar('to_number', { length: 50 }).notNull(),
    body: text('body').notNull(),

    // Status
    direction: varchar('direction', { length: 20 }).notNull(), // 'inbound', 'outbound'
    status: varchar('status', { length: 50 }).notNull(), // 'queued', 'sending', 'sent', 'delivered', 'undelivered', 'failed', 'received'
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),

    // Segments & pricing
    numSegments: integer('num_segments'),
    price: varchar('price', { length: 20 }),
    priceUnit: varchar('price_unit', { length: 10 }),

    // CRM linking
    linkedEntityType: varchar('linked_entity_type', { length: 50 }), // 'lead', 'contact', 'customer', 'opportunity'
    linkedEntityId: uuid('linked_entity_id'),
    userId: uuid('user_id'),

    // Timestamps
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    receivedAt: timestamp('received_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sms_messages_tenant_id_idx').on(table.tenantId),
    externalIdIdx: index('sms_messages_external_id_idx').on(table.externalId),
    directionIdx: index('sms_messages_direction_idx').on(table.direction),
    statusIdx: index('sms_messages_status_idx').on(table.status),
    toNumberIdx: index('sms_messages_to_number_idx').on(table.toNumber),
    fromNumberIdx: index('sms_messages_from_number_idx').on(table.fromNumber),
    linkedEntityIdx: index('sms_messages_linked_entity_idx').on(table.linkedEntityType, table.linkedEntityId),
    userIdIdx: index('sms_messages_user_id_idx').on(table.userId),
    createdAtIdx: index('sms_messages_created_at_idx').on(table.createdAt),
  })
);

/**
 * SMS Templates Table
 * Stores SMS message templates with variable support
 */
export const smsTemplates = pgTable(
  'sms_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Template details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    body: text('body').notNull(), // Supports {{variable}} placeholders
    category: varchar('category', { length: 100 }),
    tags: jsonb('tags').notNull().default([]),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Audit
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sms_templates_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('sms_templates_category_idx').on(table.category),
    isActiveIdx: index('sms_templates_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('sms_templates_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * SMS Phone Numbers Table
 * Stores purchased/configured phone numbers for SMS
 */
export const smsPhoneNumbers = pgTable(
  'sms_phone_numbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Phone number details
    phoneNumber: varchar('phone_number', { length: 50 }).notNull(),
    friendlyName: varchar('friendly_name', { length: 255 }),
    provider: varchar('provider', { length: 50 }).notNull(), // 'twilio', 'vonage', 'messagebird'

    // Capabilities
    capabilities: jsonb('capabilities').notNull().default({ sms: true, mms: false, voice: false }),

    // Status
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sms_phone_numbers_tenant_id_idx').on(table.tenantId),
    phoneNumberIdx: index('sms_phone_numbers_phone_number_idx').on(table.phoneNumber),
    providerIdx: index('sms_phone_numbers_provider_idx').on(table.provider),
    isActiveIdx: index('sms_phone_numbers_is_active_idx').on(table.isActive),
    tenantPhoneUnique: uniqueIndex('sms_phone_numbers_tenant_phone_idx').on(table.tenantId, table.phoneNumber),
  })
);

// SMS type exports
export type SmsMessageRow = typeof smsMessages.$inferSelect;
export type NewSmsMessageRow = typeof smsMessages.$inferInsert;
export type SmsTemplateRow = typeof smsTemplates.$inferSelect;
export type NewSmsTemplateRow = typeof smsTemplates.$inferInsert;
export type SmsPhoneNumberRow = typeof smsPhoneNumbers.$inferSelect;
export type NewSmsPhoneNumberRow = typeof smsPhoneNumbers.$inferInsert;

/**
 * Enrichment Jobs Table
 * Tracks lead/company enrichment jobs from Apollo.io, Clearbit, etc.
 */
export const enrichmentJobs = pgTable(
  'enrichment_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Job configuration
    type: varchar('type', { length: 50 }).notNull(), // 'single', 'bulk'
    provider: varchar('provider', { length: 50 }).notNull(), // 'apollo', 'clearbit', 'hunter', 'zoominfo'
    enrichmentType: varchar('enrichment_type', { length: 50 }).notNull().default('person'), // 'person', 'company', 'both'

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'partial'

    // Progress
    totalRecords: integer('total_records').notNull().default(1),
    processedRecords: integer('processed_records').notNull().default(0),
    enrichedRecords: integer('enriched_records').notNull().default(0),
    failedRecords: integer('failed_records').notNull().default(0),

    // Input & Results
    input: jsonb('input').notNull().default({}), // EnrichmentInput | BulkEnrichmentInput
    results: jsonb('results'), // EnrichmentResult | BulkEnrichmentResult

    // Credits
    creditsUsed: integer('credits_used').notNull().default(0),

    // Error tracking
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),

    // Related entities
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    userId: uuid('user_id'), // User who initiated the job

    // Timestamps
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('enrichment_jobs_tenant_id_idx').on(table.tenantId),
    statusIdx: index('enrichment_jobs_status_idx').on(table.status),
    providerIdx: index('enrichment_jobs_provider_idx').on(table.provider),
    typeIdx: index('enrichment_jobs_type_idx').on(table.type),
    leadIdIdx: index('enrichment_jobs_lead_id_idx').on(table.leadId),
    userIdIdx: index('enrichment_jobs_user_id_idx').on(table.userId),
    createdAtIdx: index('enrichment_jobs_created_at_idx').on(table.createdAt),
    tenantStatusIdx: index('enrichment_jobs_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Enrichment Cache Table
 * Caches enrichment results to reduce API calls
 */
export const enrichmentCache = pgTable(
  'enrichment_cache',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    // Cache key components
    cacheKey: varchar('cache_key', { length: 500 }).notNull(), // Hash of input params
    provider: varchar('provider', { length: 50 }).notNull(),
    enrichmentType: varchar('enrichment_type', { length: 50 }).notNull(), // 'person', 'company'

    // Lookup values
    email: varchar('email', { length: 255 }),
    domain: varchar('domain', { length: 255 }),
    linkedinUrl: varchar('linkedin_url', { length: 500 }),

    // Cached result
    result: jsonb('result').notNull(), // PersonEnrichmentData | CompanyEnrichmentData
    matchConfidence: integer('match_confidence'), // 0-100

    // Validity
    isValid: boolean('is_valid').notNull().default(true),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    cacheKeyIdx: uniqueIndex('enrichment_cache_key_idx').on(table.cacheKey),
    emailIdx: index('enrichment_cache_email_idx').on(table.email),
    domainIdx: index('enrichment_cache_domain_idx').on(table.domain),
    providerIdx: index('enrichment_cache_provider_idx').on(table.provider),
    expiresAtIdx: index('enrichment_cache_expires_at_idx').on(table.expiresAt),
    isValidIdx: index('enrichment_cache_is_valid_idx').on(table.isValid),
  })
);

// Enrichment type exports
export type EnrichmentJobRow = typeof enrichmentJobs.$inferSelect;
export type NewEnrichmentJobRow = typeof enrichmentJobs.$inferInsert;
export type EnrichmentCacheRow = typeof enrichmentCache.$inferSelect;
export type NewEnrichmentCacheRow = typeof enrichmentCache.$inferInsert;

/**
 * Consent Records Table
 * GDPR consent management for data subjects
 */
export const consentRecords = pgTable(
  'consent_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Subject identification
    subjectId: uuid('subject_id'), // Lead ID, customer ID, or null for external
    subjectType: varchar('subject_type', { length: 50 }).notNull().default('external'), // 'lead', 'customer', 'contact', 'external'
    email: varchar('email', { length: 255 }).notNull(),

    // Consent details
    purpose: varchar('purpose', { length: 500 }).notNull(),
    consentBasis: varchar('consent_basis', { length: 50 }).notNull(), // 'consent', 'contract', 'legal_obligation', etc.
    dataCategories: jsonb('data_categories').notNull().default([]),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    consentGivenAt: timestamp('consent_given_at', { withTimezone: true }).notNull(),
    consentMethod: varchar('consent_method', { length: 50 }).notNull(), // 'web_form', 'email', 'verbal', 'written', 'api'
    consentSource: varchar('consent_source', { length: 500 }).notNull(), // URL, form name, etc.
    consentVersion: varchar('consent_version', { length: 50 }).notNull(), // Privacy policy version

    // Withdrawal
    withdrawnAt: timestamp('withdrawn_at', { withTimezone: true }),
    withdrawalMethod: varchar('withdrawal_method', { length: 255 }),

    // Expiry
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Verification
    ipAddress: varchar('ip_address', { length: 50 }),
    userAgent: text('user_agent'),
    verificationToken: varchar('verification_token', { length: 255 }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('consent_records_tenant_id_idx').on(table.tenantId),
    subjectIdIdx: index('consent_records_subject_id_idx').on(table.subjectId),
    emailIdx: index('consent_records_email_idx').on(table.email),
    purposeIdx: index('consent_records_purpose_idx').on(table.purpose),
    isActiveIdx: index('consent_records_is_active_idx').on(table.isActive),
    tenantEmailIdx: index('consent_records_tenant_email_idx').on(table.tenantId, table.email),
    tenantPurposeIdx: index('consent_records_tenant_purpose_idx').on(table.tenantId, table.purpose),
  })
);

/**
 * Data Subject Requests (DSR) Table
 * Tracks GDPR data access, deletion, and portability requests
 */
export const dataSubjectRequests = pgTable(
  'data_subject_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Request type and status
    type: varchar('type', { length: 50 }).notNull(), // 'access', 'rectification', 'erasure', 'restriction', 'portability', 'objection'
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'in_progress', 'verification_required', 'completed', 'rejected', 'expired'
    priority: varchar('priority', { length: 20 }).notNull().default('medium'),

    // Subject identification
    subjectEmail: varchar('subject_email', { length: 255 }).notNull(),
    subjectName: varchar('subject_name', { length: 255 }),
    subjectId: uuid('subject_id'),
    subjectType: varchar('subject_type', { length: 50 }),

    // Verification
    verificationMethod: varchar('verification_method', { length: 50 }).notNull().default('email'),
    verificationToken: varchar('verification_token', { length: 255 }),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),

    // Request metadata
    requestSource: varchar('request_source', { length: 50 }).notNull(), // 'web_form', 'email', 'phone', 'mail', 'api'
    requestNotes: text('request_notes'),

    // Processing
    assignedTo: uuid('assigned_to'),
    processingNotes: text('processing_notes'),
    dataLocations: jsonb('data_locations'),

    // For erasure requests
    erasureScope: varchar('erasure_scope', { length: 20 }).default('all'), // 'all', 'specific'
    erasureExclusions: jsonb('erasure_exclusions'),

    // For portability requests
    exportFormat: varchar('export_format', { length: 20 }).default('json'), // 'json', 'csv', 'xml'
    exportUrl: text('export_url'),
    exportExpiresAt: timestamp('export_expires_at', { withTimezone: true }),

    // Response
    responseNotes: text('response_notes'),
    rejectionReason: text('rejection_reason'),

    // Timeline
    receivedAt: timestamp('received_at', { withTimezone: true }).notNull(),
    acknowledgedAt: timestamp('acknowledged_at', { withTimezone: true }),
    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Audit log
    auditLog: jsonb('audit_log').notNull().default([]),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('dsr_tenant_id_idx').on(table.tenantId),
    typeIdx: index('dsr_type_idx').on(table.type),
    statusIdx: index('dsr_status_idx').on(table.status),
    subjectEmailIdx: index('dsr_subject_email_idx').on(table.subjectEmail),
    dueDateIdx: index('dsr_due_date_idx').on(table.dueDate),
    receivedAtIdx: index('dsr_received_at_idx').on(table.receivedAt),
    tenantStatusIdx: index('dsr_tenant_status_idx').on(table.tenantId, table.status),
    tenantTypeIdx: index('dsr_tenant_type_idx').on(table.tenantId, table.type),
  })
);

/**
 * Retention Policies Table
 * Configurable data retention policies per tenant
 */
export const retentionPolicies = pgTable(
  'retention_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Policy details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    dataCategory: varchar('data_category', { length: 50 }).notNull(), // 'identity', 'contact', 'financial', etc.
    retentionDays: integer('retention_days').notNull(),

    // Legal basis
    legalBasis: text('legal_basis').notNull(),

    // Actions
    actionOnExpiry: varchar('action_on_expiry', { length: 50 }).notNull().default('review'), // 'delete', 'anonymize', 'archive', 'review'
    notifyBeforeExpiry: boolean('notify_before_expiry').notNull().default(true),
    notifyDaysBefore: integer('notify_days_before'),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('retention_policies_tenant_id_idx').on(table.tenantId),
    dataCategoryIdx: index('retention_policies_data_category_idx').on(table.dataCategory),
    isActiveIdx: index('retention_policies_is_active_idx').on(table.isActive),
    tenantCategoryIdx: uniqueIndex('retention_policies_tenant_category_idx').on(table.tenantId, table.dataCategory),
  })
);

// GDPR type exports
export type ConsentRecordRow = typeof consentRecords.$inferSelect;
export type NewConsentRecordRow = typeof consentRecords.$inferInsert;
export type DataSubjectRequestRow = typeof dataSubjectRequests.$inferSelect;
export type NewDataSubjectRequestRow = typeof dataSubjectRequests.$inferInsert;
export type RetentionPolicyRow = typeof retentionPolicies.$inferSelect;
export type NewRetentionPolicyRow = typeof retentionPolicies.$inferInsert;

/**
 * Report Jobs Table
 * Tracks report generation jobs
 */
export const reportJobs = pgTable(
  'report_jobs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Report configuration
    type: varchar('type', { length: 50 }).notNull(), // 'leads', 'pipeline', 'sales', 'activity', etc.
    format: varchar('format', { length: 20 }).notNull(), // 'pdf', 'excel', 'csv', 'json'
    status: varchar('status', { length: 50 }).notNull().default('pending'), // 'pending', 'processing', 'completed', 'failed', 'expired'

    title: varchar('title', { length: 255 }),
    description: text('description'),
    options: jsonb('options').notNull().default({}),

    // Output
    fileUrl: text('file_url'),
    fileName: varchar('file_name', { length: 255 }),
    fileSizeBytes: integer('file_size_bytes'),
    checksum: varchar('checksum', { length: 255 }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    // Progress
    progress: integer('progress'),
    recordsProcessed: integer('records_processed'),
    totalRecords: integer('total_records'),

    // Error
    errorMessage: text('error_message'),

    // Audit
    createdBy: uuid('created_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('report_jobs_tenant_id_idx').on(table.tenantId),
    typeIdx: index('report_jobs_type_idx').on(table.type),
    statusIdx: index('report_jobs_status_idx').on(table.status),
    createdAtIdx: index('report_jobs_created_at_idx').on(table.createdAt),
    expiresAtIdx: index('report_jobs_expires_at_idx').on(table.expiresAt),
    tenantStatusIdx: index('report_jobs_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Report Templates Table
 * Saved report configurations
 */
export const reportTemplates = pgTable(
  'report_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Template configuration
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    format: varchar('format', { length: 20 }).notNull(),
    options: jsonb('options').notNull().default({}),
    columns: jsonb('columns'),

    // Status
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('report_templates_tenant_id_idx').on(table.tenantId),
    typeIdx: index('report_templates_type_idx').on(table.type),
    isActiveIdx: index('report_templates_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('report_templates_tenant_name_idx').on(table.tenantId, table.name),
  })
);

// Report type exports
export type ReportJobRow = typeof reportJobs.$inferSelect;
export type NewReportJobRow = typeof reportJobs.$inferInsert;
export type ReportTemplateRow = typeof reportTemplates.$inferSelect;
export type NewReportTemplateRow = typeof reportTemplates.$inferInsert;

/**
 * WhatsApp Conversations Table
 * Tracks WhatsApp conversation threads
 */
export const whatsappConversations = pgTable(
  'whatsapp_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Phone number configuration
    phoneNumberId: varchar('phone_number_id', { length: 100 }).notNull(), // Meta phone number ID
    displayPhoneNumber: varchar('display_phone_number', { length: 50 }),

    // Contact information
    contactWaId: varchar('contact_wa_id', { length: 50 }).notNull(), // WhatsApp ID of the contact
    contactPhone: varchar('contact_phone', { length: 50 }).notNull(),
    contactName: varchar('contact_name', { length: 255 }),
    contactProfilePicUrl: text('contact_profile_pic_url'),

    // Conversation state
    status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'resolved', 'archived', 'blocked'
    lastMessageAt: timestamp('last_message_at', { withTimezone: true }).notNull(),
    lastMessagePreview: text('last_message_preview'),
    lastMessageDirection: varchar('last_message_direction', { length: 20 }).notNull(), // 'inbound', 'outbound'

    // Counts
    unreadCount: integer('unread_count').notNull().default(0),
    totalMessages: integer('total_messages').notNull().default(0),

    // Assignment
    assignedTo: uuid('assigned_to'),
    assignedAt: timestamp('assigned_at', { withTimezone: true }),

    // CRM linkage
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    contactId: uuid('contact_id').references(() => leadContacts.id, { onDelete: 'set null' }),

    // Labels and categorization
    labels: jsonb('labels').notNull().default([]),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'), // 'low', 'normal', 'high', 'urgent'

    // Conversation window tracking (24-hour window)
    windowExpiresAt: timestamp('window_expires_at', { withTimezone: true }),
    isWithinWindow: boolean('is_within_window').notNull().default(true),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('whatsapp_conversations_tenant_id_idx').on(table.tenantId),
    phoneNumberIdIdx: index('whatsapp_conversations_phone_number_id_idx').on(table.phoneNumberId),
    contactWaIdIdx: index('whatsapp_conversations_contact_wa_id_idx').on(table.contactWaId),
    statusIdx: index('whatsapp_conversations_status_idx').on(table.status),
    lastMessageAtIdx: index('whatsapp_conversations_last_message_at_idx').on(table.lastMessageAt),
    assignedToIdx: index('whatsapp_conversations_assigned_to_idx').on(table.assignedTo),
    leadIdIdx: index('whatsapp_conversations_lead_id_idx').on(table.leadId),
    customerIdIdx: index('whatsapp_conversations_customer_id_idx').on(table.customerId),
    unreadCountIdx: index('whatsapp_conversations_unread_count_idx').on(table.unreadCount),
    tenantStatusIdx: index('whatsapp_conversations_tenant_status_idx').on(table.tenantId, table.status),
    tenantContactIdx: uniqueIndex('whatsapp_conversations_tenant_contact_idx').on(table.tenantId, table.phoneNumberId, table.contactWaId),
  })
);

/**
 * WhatsApp Messages Table
 * Stores individual WhatsApp messages
 */
export const whatsappMessages = pgTable(
  'whatsapp_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    conversationId: uuid('conversation_id').notNull().references(() => whatsappConversations.id, { onDelete: 'cascade' }),

    // WhatsApp message identifiers
    waMessageId: varchar('wa_message_id', { length: 255 }).notNull(), // WhatsApp message ID
    direction: varchar('direction', { length: 20 }).notNull(), // 'inbound', 'outbound'

    // Message content
    type: varchar('type', { length: 50 }).notNull(), // 'text', 'image', 'video', 'audio', 'document', 'sticker', 'location', 'contacts', 'interactive', 'template', 'reaction'
    content: text('content'), // Text content or description
    contentJson: jsonb('content_json'), // Full message content as JSON

    // Media information
    mediaId: varchar('media_id', { length: 255 }),
    mediaUrl: text('media_url'),
    mediaMimeType: varchar('media_mime_type', { length: 100 }),
    mediaSize: integer('media_size'),
    mediaFileName: varchar('media_file_name', { length: 500 }),
    mediaSha256: varchar('media_sha256', { length: 255 }),

    // Template information (for outbound templates)
    templateName: varchar('template_name', { length: 255 }),
    templateLanguage: varchar('template_language', { length: 20 }),
    templateComponents: jsonb('template_components'),

    // Context (for replies)
    replyToMessageId: varchar('reply_to_message_id', { length: 255 }),
    isForwarded: boolean('is_forwarded').notNull().default(false),

    // Status tracking
    status: varchar('status', { length: 50 }).notNull().default('sent'), // 'pending', 'sent', 'delivered', 'read', 'failed', 'deleted'
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    readAt: timestamp('read_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),

    // Error tracking
    errorCode: integer('error_code'),
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),

    // Pricing info
    conversationCategory: varchar('conversation_category', { length: 50 }), // 'authentication', 'marketing', 'utility', 'service'
    isBillable: boolean('is_billable'),

    // Referral tracking (click-to-WhatsApp ads)
    referralSource: jsonb('referral_source'),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(), // Original message timestamp
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('whatsapp_messages_tenant_id_idx').on(table.tenantId),
    conversationIdIdx: index('whatsapp_messages_conversation_id_idx').on(table.conversationId),
    waMessageIdIdx: uniqueIndex('whatsapp_messages_wa_message_id_idx').on(table.waMessageId),
    directionIdx: index('whatsapp_messages_direction_idx').on(table.direction),
    typeIdx: index('whatsapp_messages_type_idx').on(table.type),
    statusIdx: index('whatsapp_messages_status_idx').on(table.status),
    timestampIdx: index('whatsapp_messages_timestamp_idx').on(table.timestamp),
    conversationTimestampIdx: index('whatsapp_messages_conversation_timestamp_idx').on(table.conversationId, table.timestamp),
    tenantStatusIdx: index('whatsapp_messages_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * WhatsApp Templates Table (cached from Meta)
 * Local cache of WhatsApp message templates
 */
export const whatsappTemplates = pgTable(
  'whatsapp_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Template identification
    templateId: varchar('template_id', { length: 255 }).notNull(), // Meta template ID
    name: varchar('name', { length: 255 }).notNull(),

    // Template details
    status: varchar('status', { length: 50 }).notNull(), // 'APPROVED', 'PENDING', 'REJECTED'
    category: varchar('category', { length: 50 }).notNull(), // 'AUTHENTICATION', 'MARKETING', 'UTILITY'
    language: varchar('language', { length: 20 }).notNull(),

    // Components
    components: jsonb('components').notNull().default([]),

    // Quality
    qualityScore: varchar('quality_score', { length: 20 }),

    // Usage stats
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    // Sync status
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('whatsapp_templates_tenant_id_idx').on(table.tenantId),
    templateIdIdx: index('whatsapp_templates_template_id_idx').on(table.templateId),
    statusIdx: index('whatsapp_templates_status_idx').on(table.status),
    categoryIdx: index('whatsapp_templates_category_idx').on(table.category),
    tenantTemplateIdx: uniqueIndex('whatsapp_templates_tenant_template_idx').on(table.tenantId, table.templateId, table.language),
  })
);

/**
 * WhatsApp Phone Numbers Table
 * Business phone numbers configured for WhatsApp
 */
export const whatsappPhoneNumbers = pgTable(
  'whatsapp_phone_numbers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Meta identifiers
    phoneNumberId: varchar('phone_number_id', { length: 100 }).notNull(), // Meta phone number ID
    businessAccountId: varchar('business_account_id', { length: 100 }).notNull(),

    // Phone number details
    displayPhoneNumber: varchar('display_phone_number', { length: 50 }).notNull(),
    verifiedName: varchar('verified_name', { length: 255 }),

    // Status
    qualityRating: varchar('quality_rating', { length: 20 }), // 'GREEN', 'YELLOW', 'RED'
    messagingLimit: varchar('messaging_limit', { length: 50 }),
    platformType: varchar('platform_type', { length: 50 }),

    // Configuration
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),

    // Webhook configuration
    webhookSecret: varchar('webhook_secret', { length: 255 }),

    // Business profile
    businessProfile: jsonb('business_profile'),

    // Access token (encrypted)
    accessToken: text('access_token'), // Should be encrypted
    accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('whatsapp_phone_numbers_tenant_id_idx').on(table.tenantId),
    phoneNumberIdIdx: uniqueIndex('whatsapp_phone_numbers_phone_number_id_idx').on(table.phoneNumberId),
    businessAccountIdx: index('whatsapp_phone_numbers_business_account_idx').on(table.businessAccountId),
    isActiveIdx: index('whatsapp_phone_numbers_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('whatsapp_phone_numbers_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

// WhatsApp type exports
export type WhatsAppConversationRow = typeof whatsappConversations.$inferSelect;
export type NewWhatsAppConversationRow = typeof whatsappConversations.$inferInsert;
export type WhatsAppMessageRow = typeof whatsappMessages.$inferSelect;
export type NewWhatsAppMessageRow = typeof whatsappMessages.$inferInsert;
export type WhatsAppTemplateRow = typeof whatsappTemplates.$inferSelect;
export type NewWhatsAppTemplateRow = typeof whatsappTemplates.$inferInsert;
export type WhatsAppPhoneNumberRow = typeof whatsappPhoneNumbers.$inferSelect;
export type NewWhatsAppPhoneNumberRow = typeof whatsappPhoneNumbers.$inferInsert;

/**
 * Payment Customers Table
 * Stores customer information for payment processing
 */
export const paymentCustomers = pgTable(
  'payment_customers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Customer details
    email: varchar('email', { length: 255 }).notNull(),
    name: varchar('name', { length: 255 }),
    phone: varchar('phone', { length: 50 }),

    // Provider-specific customer IDs
    stripeCustomerId: varchar('stripe_customer_id', { length: 255 }),
    mercadopagoCustomerId: varchar('mercadopago_customer_id', { length: 255 }),

    // Billing address
    billingAddress: jsonb('billing_address'),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // CRM linkage
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('payment_customers_tenant_id_idx').on(table.tenantId),
    emailIdx: index('payment_customers_email_idx').on(table.email),
    stripeCustomerIdIdx: uniqueIndex('payment_customers_stripe_customer_id_idx').on(table.stripeCustomerId),
    mercadopagoCustomerIdIdx: uniqueIndex('payment_customers_mercadopago_customer_id_idx').on(table.mercadopagoCustomerId),
    tenantEmailIdx: uniqueIndex('payment_customers_tenant_email_idx').on(table.tenantId, table.email),
    leadIdIdx: index('payment_customers_lead_id_idx').on(table.leadId),
    customerIdIdx: index('payment_customers_customer_id_idx').on(table.customerId),
  })
);

/**
 * Payments Table
 * Stores payment transactions
 */
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id').references(() => paymentCustomers.id, { onDelete: 'set null' }),

    // Provider information
    provider: varchar('provider', { length: 50 }).notNull(), // 'stripe', 'mercadopago'
    providerPaymentId: varchar('provider_payment_id', { length: 255 }).notNull(),
    providerPaymentIntentId: varchar('provider_payment_intent_id', { length: 255 }),

    // Amount
    amount: integer('amount').notNull(), // In smallest currency unit (cents)
    currency: varchar('currency', { length: 10 }).notNull(),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('pending'),
    // 'pending', 'processing', 'succeeded', 'failed', 'canceled', 'refunded', 'partially_refunded'

    // Description
    description: text('description'),
    statementDescriptor: varchar('statement_descriptor', { length: 50 }),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // CRM linkage
    invoiceId: uuid('invoice_id'),
    quoteId: uuid('quote_id'),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id, { onDelete: 'set null' }),

    // Fees
    feeAmount: integer('fee_amount'),
    netAmount: integer('net_amount'),

    // Refund info
    refundedAmount: integer('refunded_amount'),
    refundReason: text('refund_reason'),

    // Receipt
    receiptUrl: text('receipt_url'),
    receiptNumber: varchar('receipt_number', { length: 255 }),

    // Error info
    failureCode: varchar('failure_code', { length: 100 }),
    failureMessage: text('failure_message'),

    // Timestamps
    paidAt: timestamp('paid_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),
    refundedAt: timestamp('refunded_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('payments_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('payments_customer_id_idx').on(table.customerId),
    providerIdx: index('payments_provider_idx').on(table.provider),
    providerPaymentIdIdx: index('payments_provider_payment_id_idx').on(table.providerPaymentId),
    statusIdx: index('payments_status_idx').on(table.status),
    invoiceIdIdx: index('payments_invoice_id_idx').on(table.invoiceId),
    opportunityIdIdx: index('payments_opportunity_id_idx').on(table.opportunityId),
    createdAtIdx: index('payments_created_at_idx').on(table.createdAt),
    tenantStatusIdx: index('payments_tenant_status_idx').on(table.tenantId, table.status),
    tenantCreatedAtIdx: index('payments_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

/**
 * Subscription Plans Table
 * Stores subscription plan configurations
 */
export const subscriptionPlans = pgTable(
  'subscription_plans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Provider information
    provider: varchar('provider', { length: 50 }).notNull(),
    providerPlanId: varchar('provider_plan_id', { length: 255 }).notNull(),
    providerPriceId: varchar('provider_price_id', { length: 255 }).notNull(),

    // Plan details
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    // Pricing
    amount: integer('amount').notNull(), // In smallest currency unit
    currency: varchar('currency', { length: 10 }).notNull(),
    interval: varchar('interval', { length: 20 }).notNull(), // 'day', 'week', 'month', 'year'
    intervalCount: integer('interval_count').notNull().default(1),

    // Trial
    trialDays: integer('trial_days'),

    // Features and limits
    features: jsonb('features').notNull().default([]),
    limits: jsonb('limits').notNull().default({}),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('subscription_plans_tenant_id_idx').on(table.tenantId),
    providerIdx: index('subscription_plans_provider_idx').on(table.provider),
    providerPriceIdIdx: index('subscription_plans_provider_price_id_idx').on(table.providerPriceId),
    isActiveIdx: index('subscription_plans_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('subscription_plans_tenant_active_idx').on(table.tenantId, table.isActive),
    tenantNameIdx: uniqueIndex('subscription_plans_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Subscriptions Table
 * Stores customer subscriptions
 */
export const subscriptions = pgTable(
  'subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id').notNull().references(() => paymentCustomers.id, { onDelete: 'cascade' }),
    planId: uuid('plan_id').notNull().references(() => subscriptionPlans.id, { onDelete: 'restrict' }),

    // Provider information
    provider: varchar('provider', { length: 50 }).notNull(),
    providerSubscriptionId: varchar('provider_subscription_id', { length: 255 }).notNull(),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('active'),
    // 'active', 'past_due', 'unpaid', 'canceled', 'incomplete', 'incomplete_expired', 'trialing', 'paused'

    // Period
    currentPeriodStart: timestamp('current_period_start', { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp('current_period_end', { withTimezone: true }).notNull(),

    // Trial
    trialStart: timestamp('trial_start', { withTimezone: true }),
    trialEnd: timestamp('trial_end', { withTimezone: true }),

    // Cancellation
    cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
    canceledAt: timestamp('canceled_at', { withTimezone: true }),
    cancelReason: text('cancel_reason'),

    // Billing
    defaultPaymentMethodId: varchar('default_payment_method_id', { length: 255 }),
    latestInvoiceId: varchar('latest_invoice_id', { length: 255 }),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('subscriptions_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('subscriptions_customer_id_idx').on(table.customerId),
    planIdIdx: index('subscriptions_plan_id_idx').on(table.planId),
    providerIdx: index('subscriptions_provider_idx').on(table.provider),
    providerSubscriptionIdIdx: uniqueIndex('subscriptions_provider_subscription_id_idx').on(table.providerSubscriptionId),
    statusIdx: index('subscriptions_status_idx').on(table.status),
    currentPeriodEndIdx: index('subscriptions_current_period_end_idx').on(table.currentPeriodEnd),
    tenantStatusIdx: index('subscriptions_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Checkout Sessions Table
 * Stores checkout session information
 */
export const checkoutSessions = pgTable(
  'checkout_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Provider information
    provider: varchar('provider', { length: 50 }).notNull(),
    providerSessionId: varchar('provider_session_id', { length: 255 }).notNull(),

    // Session details
    url: text('url').notNull(),
    mode: varchar('mode', { length: 50 }).notNull(), // 'payment', 'subscription', 'setup'
    status: varchar('status', { length: 50 }).notNull().default('open'), // 'open', 'complete', 'expired'

    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

    // Customer
    customerId: uuid('customer_id').references(() => paymentCustomers.id, { onDelete: 'set null' }),
    customerEmail: varchar('customer_email', { length: 255 }),

    // Results
    paymentId: uuid('payment_id').references(() => payments.id, { onDelete: 'set null' }),
    subscriptionId: uuid('subscription_id').references(() => subscriptions.id, { onDelete: 'set null' }),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('checkout_sessions_tenant_id_idx').on(table.tenantId),
    providerSessionIdIdx: uniqueIndex('checkout_sessions_provider_session_id_idx').on(table.providerSessionId),
    statusIdx: index('checkout_sessions_status_idx').on(table.status),
    expiresAtIdx: index('checkout_sessions_expires_at_idx').on(table.expiresAt),
    customerIdIdx: index('checkout_sessions_customer_id_idx').on(table.customerId),
  })
);

// Payment type exports
export type PaymentCustomerRow = typeof paymentCustomers.$inferSelect;
export type NewPaymentCustomerRow = typeof paymentCustomers.$inferInsert;
export type PaymentRow = typeof payments.$inferSelect;
export type NewPaymentRow = typeof payments.$inferInsert;
export type SubscriptionPlanRow = typeof subscriptionPlans.$inferSelect;
export type NewSubscriptionPlanRow = typeof subscriptionPlans.$inferInsert;
export type SubscriptionRow = typeof subscriptions.$inferSelect;
export type NewSubscriptionRow = typeof subscriptions.$inferInsert;
export type CheckoutSessionRow = typeof checkoutSessions.$inferSelect;
export type NewCheckoutSessionRow = typeof checkoutSessions.$inferInsert;

/**
 * Quotes Table
 * Stores sales quotes and proposals
 */
export const quotes = pgTable(
  'quotes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    quoteNumber: varchar('quote_number', { length: 50 }).notNull(),

    // Relationships
    customerId: uuid('customer_id').references(() => customers.id, { onDelete: 'set null' }),
    leadId: uuid('lead_id').references(() => leads.id, { onDelete: 'set null' }),
    opportunityId: uuid('opportunity_id').references(() => opportunities.id, { onDelete: 'set null' }),

    // Quote details
    title: varchar('title', { length: 500 }).notNull(),
    description: text('description'),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    version: integer('version').notNull().default(1),
    parentQuoteId: uuid('parent_quote_id'), // Self-reference for revisions

    // Dates
    issueDate: timestamp('issue_date', { withTimezone: true }).notNull().defaultNow(),
    expirationDate: timestamp('expiration_date', { withTimezone: true }).notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    rejectedAt: timestamp('rejected_at', { withTimezone: true }),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),

    // Financial
    currency: varchar('currency', { length: 10 }).notNull().default('USD'),
    subtotal: integer('subtotal').notNull().default(0),
    discountTotal: integer('discount_total').notNull().default(0),
    taxTotal: integer('tax_total').notNull().default(0),
    total: integer('total').notNull().default(0),

    // Billing information
    billingAddress: jsonb('billing_address'),
    contactName: varchar('contact_name', { length: 255 }),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactPhone: varchar('contact_phone', { length: 50 }),
    companyName: varchar('company_name', { length: 255 }),

    // Terms and notes
    terms: text('terms'),
    notes: text('notes'),
    internalNotes: text('internal_notes'),

    // Signature
    signatureRequired: boolean('signature_required').notNull().default(false),
    signatureName: varchar('signature_name', { length: 255 }),
    signatureEmail: varchar('signature_email', { length: 255 }),
    signatureDate: timestamp('signature_date', { withTimezone: true }),
    signatureIp: varchar('signature_ip', { length: 50 }),

    // Payment
    paymentTerms: text('payment_terms'),
    paymentDueDays: integer('payment_due_days'),
    depositRequired: boolean('deposit_required').notNull().default(false),
    depositPercentage: integer('deposit_percentage'),
    depositAmount: integer('deposit_amount'),

    // Files
    attachmentUrls: jsonb('attachment_urls'),
    pdfUrl: text('pdf_url'),
    publicUrl: text('public_url'),
    publicToken: varchar('public_token', { length: 100 }),

    // Tracking
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    lastViewedBy: varchar('last_viewed_by', { length: 255 }),

    // Metadata
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),

    // Audit
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('quotes_tenant_id_idx').on(table.tenantId),
    quoteNumberIdx: index('quotes_quote_number_idx').on(table.quoteNumber),
    customerIdIdx: index('quotes_customer_id_idx').on(table.customerId),
    leadIdIdx: index('quotes_lead_id_idx').on(table.leadId),
    opportunityIdIdx: index('quotes_opportunity_id_idx').on(table.opportunityId),
    statusIdx: index('quotes_status_idx').on(table.status),
    expirationDateIdx: index('quotes_expiration_date_idx').on(table.expirationDate),
    createdAtIdx: index('quotes_created_at_idx').on(table.createdAt),
    publicTokenIdx: uniqueIndex('quotes_public_token_idx').on(table.publicToken),
    tenantStatusIdx: index('quotes_tenant_status_idx').on(table.tenantId, table.status),
    tenantQuoteNumberIdx: uniqueIndex('quotes_tenant_quote_number_idx').on(table.tenantId, table.quoteNumber),
  })
);

/**
 * Quote Line Items Table
 * Stores individual items in a quote
 */
export const quoteLineItems = pgTable(
  'quote_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),

    // Item details
    type: varchar('type', { length: 50 }).notNull().default('product'),
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    sku: varchar('sku', { length: 100 }),

    // Pricing
    quantity: integer('quantity').notNull().default(1),
    unitPrice: integer('unit_price').notNull(), // In cents
    discount: integer('discount'),
    discountType: varchar('discount_type', { length: 20 }), // 'percentage' or 'fixed'
    tax: integer('tax'), // Percentage
    taxable: boolean('taxable').notNull().default(true),
    total: integer('total').notNull(), // Calculated total in cents

    // Position
    position: integer('position').notNull().default(0),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quoteIdIdx: index('quote_line_items_quote_id_idx').on(table.quoteId),
    typeIdx: index('quote_line_items_type_idx').on(table.type),
    skuIdx: index('quote_line_items_sku_idx').on(table.sku),
    positionIdx: index('quote_line_items_position_idx').on(table.quoteId, table.position),
  })
);

/**
 * Quote Templates Table
 * Stores reusable quote templates
 */
export const quoteTemplates = pgTable(
  'quote_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: varchar('category', { length: 100 }),

    // Default values
    defaultTitle: varchar('default_title', { length: 500 }),
    defaultDescription: text('default_description'),
    defaultTerms: text('default_terms'),
    defaultNotes: text('default_notes'),
    defaultPaymentTerms: text('default_payment_terms'),
    defaultPaymentDueDays: integer('default_payment_due_days'),
    defaultValidityDays: integer('default_validity_days').default(30),
    defaultDepositRequired: boolean('default_deposit_required').default(false),
    defaultDepositPercentage: integer('default_deposit_percentage'),

    // Default line items
    lineItems: jsonb('line_items').notNull().default([]),

    // Branding
    headerHtml: text('header_html'),
    footerHtml: text('footer_html'),
    logoUrl: text('logo_url'),
    primaryColor: varchar('primary_color', { length: 20 }),
    secondaryColor: varchar('secondary_color', { length: 20 }),

    // Status
    isActive: boolean('is_active').notNull().default(true),
    isDefault: boolean('is_default').notNull().default(false),

    // Audit
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('quote_templates_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('quote_templates_category_idx').on(table.category),
    isActiveIdx: index('quote_templates_is_active_idx').on(table.isActive),
    isDefaultIdx: index('quote_templates_is_default_idx').on(table.isDefault),
    tenantNameIdx: uniqueIndex('quote_templates_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Quote Activities Table
 * Tracks quote history and events
 */
export const quoteActivities = pgTable(
  'quote_activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quoteId: uuid('quote_id').notNull().references(() => quotes.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 50 }).notNull(),
    description: text('description').notNull(),

    // Actor info
    userId: uuid('user_id'),
    userName: varchar('user_name', { length: 255 }),
    userEmail: varchar('user_email', { length: 255 }),

    // View info
    viewerIp: varchar('viewer_ip', { length: 50 }),
    viewerUserAgent: text('viewer_user_agent'),
    viewDuration: integer('view_duration'),

    // Changes
    changes: jsonb('changes'),

    // Comment
    comment: text('comment'),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quoteIdIdx: index('quote_activities_quote_id_idx').on(table.quoteId),
    tenantIdIdx: index('quote_activities_tenant_id_idx').on(table.tenantId),
    typeIdx: index('quote_activities_type_idx').on(table.type),
    createdAtIdx: index('quote_activities_created_at_idx').on(table.createdAt),
    quoteCreatedAtIdx: index('quote_activities_quote_created_at_idx').on(table.quoteId, table.createdAt),
  })
);

// Quote type exports
export type QuoteRow = typeof quotes.$inferSelect;
export type NewQuoteRow = typeof quotes.$inferInsert;
export type QuoteLineItemRow = typeof quoteLineItems.$inferSelect;
export type NewQuoteLineItemRow = typeof quoteLineItems.$inferInsert;
export type QuoteTemplateRow = typeof quoteTemplates.$inferSelect;
export type NewQuoteTemplateRow = typeof quoteTemplates.$inferInsert;
export type QuoteActivityRow = typeof quoteActivities.$inferSelect;
export type NewQuoteActivityRow = typeof quoteActivities.$inferInsert;

// ============================================
// AI TABLES
// ============================================

/**
 * AI Usage tracking
 * Tracks API calls to AI providers for billing and analytics
 */
export const aiUsage = pgTable(
  'ai_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    provider: varchar('provider', { length: 50 }).notNull(), // openai, gemini
    operation: varchar('operation', { length: 100 }).notNull(), // chat, embed, score, etc.
    model: varchar('model', { length: 100 }).notNull(),

    // Token usage
    promptTokens: integer('prompt_tokens').notNull().default(0),
    completionTokens: integer('completion_tokens').notNull().default(0),
    totalTokens: integer('total_tokens').notNull().default(0),

    // Cost tracking
    cost: integer('cost').notNull().default(0), // In cents/millicents

    // Performance
    latencyMs: integer('latency_ms'),
    success: boolean('success').notNull().default(true),
    errorMessage: text('error_message'),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('ai_usage_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('ai_usage_user_id_idx').on(table.userId),
    providerIdx: index('ai_usage_provider_idx').on(table.provider),
    operationIdx: index('ai_usage_operation_idx').on(table.operation),
    createdAtIdx: index('ai_usage_created_at_idx').on(table.createdAt),
    tenantCreatedAtIdx: index('ai_usage_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

/**
 * AI Conversations
 * Stores assistant conversation history
 */
export const aiConversations = pgTable(
  'ai_conversations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    leadId: uuid('lead_id'),

    title: varchar('title', { length: 255 }),
    messages: jsonb('messages').notNull().default([]),
    context: jsonb('context').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('ai_conversations_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('ai_conversations_user_id_idx').on(table.userId),
    leadIdIdx: index('ai_conversations_lead_id_idx').on(table.leadId),
    updatedAtIdx: index('ai_conversations_updated_at_idx').on(table.updatedAt),
  })
);

/**
 * Knowledge Documents
 * RAG knowledge base for AI assistant
 */
export const knowledgeDocuments = pgTable(
  'knowledge_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    title: varchar('title', { length: 255 }).notNull(),
    content: text('content').notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    tags: jsonb('tags').notNull().default([]),

    // Vector embedding for semantic search
    embedding: jsonb('embedding'), // Store as JSON array, convert to pgvector if available

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('knowledge_documents_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('knowledge_documents_category_idx').on(table.category),
    createdAtIdx: index('knowledge_documents_created_at_idx').on(table.createdAt),
  })
);

// AI type exports
export type AIUsageRow = typeof aiUsage.$inferSelect;
export type NewAIUsageRow = typeof aiUsage.$inferInsert;
export type AIConversationRow = typeof aiConversations.$inferSelect;
export type NewAIConversationRow = typeof aiConversations.$inferInsert;
export type KnowledgeDocumentRow = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocumentRow = typeof knowledgeDocuments.$inferInsert;

// ============================================
// WEBSOCKET / REALTIME TABLES
// ============================================

/**
 * Realtime notification broadcasts
 * Tenant-wide notifications sent via WebSocket
 */
export const realtimeBroadcasts = pgTable(
  'realtime_broadcasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    icon: varchar('icon', { length: 255 }),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'),
    actionUrl: varchar('action_url', { length: 500 }),
    data: jsonb('data').notNull().default({}),

    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('realtime_broadcasts_tenant_id_idx').on(table.tenantId),
    createdAtIdx: index('realtime_broadcasts_created_at_idx').on(table.createdAt),
  })
);

/**
 * Realtime notification templates
 */
export const realtimeTemplates = pgTable(
  'realtime_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 100 }).notNull(),
    title: varchar('title', { length: 255 }).notNull(),
    body: text('body').notNull(),
    icon: varchar('icon', { length: 255 }),
    priority: varchar('priority', { length: 20 }).notNull().default('normal'),
    actionUrl: varchar('action_url', { length: 500 }),
    variables: jsonb('variables').notNull().default([]),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantTypeIdx: uniqueIndex('realtime_templates_tenant_type_idx').on(table.tenantId, table.type),
    isActiveIdx: index('realtime_templates_is_active_idx').on(table.isActive),
  })
);

/**
 * WebSocket connections log
 */
export const websocketConnections = pgTable(
  'websocket_connections',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    connectionId: varchar('connection_id', { length: 100 }).notNull(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    event: varchar('event', { length: 20 }).notNull(),
    userAgent: text('user_agent'),
    ip: varchar('ip', { length: 50 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('websocket_connections_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('websocket_connections_user_id_idx').on(table.userId),
    createdAtIdx: index('websocket_connections_created_at_idx').on(table.createdAt),
  })
);

// WebSocket/Realtime type exports
export type RealtimeBroadcastRow = typeof realtimeBroadcasts.$inferSelect;
export type NewRealtimeBroadcastRow = typeof realtimeBroadcasts.$inferInsert;
export type RealtimeTemplateRow = typeof realtimeTemplates.$inferSelect;
export type NewRealtimeTemplateRow = typeof realtimeTemplates.$inferInsert;
export type WebSocketConnectionRow = typeof websocketConnections.$inferSelect;
export type NewWebSocketConnectionRow = typeof websocketConnections.$inferInsert;

// ============================================
// TEAM & TERRITORY MANAGEMENT TABLES
// ============================================

/**
 * Teams Table
 * Sales teams and organizational units
 */
export const teams = pgTable(
  'teams',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull().default('sales'),
    // 'sales', 'support', 'marketing', 'customer_success', 'operations'

    parentTeamId: uuid('parent_team_id'),
    managerId: uuid('manager_id'),

    settings: jsonb('settings').notNull().default({}),
    metadata: jsonb('metadata').notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('teams_tenant_id_idx').on(table.tenantId),
    parentTeamIdIdx: index('teams_parent_team_id_idx').on(table.parentTeamId),
    managerIdIdx: index('teams_manager_id_idx').on(table.managerId),
    typeIdx: index('teams_type_idx').on(table.type),
    isActiveIdx: index('teams_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('teams_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Team Members Table
 * User-Team relationships
 */
export const teamMembers = pgTable(
  'team_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    teamId: uuid('team_id').notNull().references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),

    role: varchar('role', { length: 50 }).notNull().default('member'),
    // 'member', 'team_lead', 'manager', 'director', 'vp'
    position: varchar('position', { length: 255 }),

    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
    leftAt: timestamp('left_at', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    teamIdIdx: index('team_members_team_id_idx').on(table.teamId),
    userIdIdx: index('team_members_user_id_idx').on(table.userId),
    roleIdx: index('team_members_role_idx').on(table.role),
    isActiveIdx: index('team_members_is_active_idx').on(table.isActive),
    teamUserIdx: uniqueIndex('team_members_team_user_idx').on(table.teamId, table.userId),
  })
);

/**
 * Territories Table
 * Sales territories for account/lead assignment
 */
export const territories = pgTable(
  'territories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull().default('geographic'),
    // 'geographic', 'industry', 'account_size', 'product', 'named_accounts', 'hybrid'

    parentTerritoryId: uuid('parent_territory_id'),

    criteria: jsonb('criteria').notNull().default({}),
    settings: jsonb('settings').notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('territories_tenant_id_idx').on(table.tenantId),
    parentTerritoryIdIdx: index('territories_parent_territory_id_idx').on(table.parentTerritoryId),
    typeIdx: index('territories_type_idx').on(table.type),
    isActiveIdx: index('territories_is_active_idx').on(table.isActive),
    tenantNameIdx: uniqueIndex('territories_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Territory Assignments Table
 * User/Team assignments to territories
 */
export const territoryAssignments = pgTable(
  'territory_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    territoryId: uuid('territory_id').notNull().references(() => territories.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),

    assignmentType: varchar('assignment_type', { length: 50 }).notNull().default('exclusive'),
    // 'exclusive', 'shared', 'overlay'
    isPrimary: boolean('is_primary').notNull().default(false),

    startDate: timestamp('start_date', { withTimezone: true }).notNull().defaultNow(),
    endDate: timestamp('end_date', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    territoryIdIdx: index('territory_assignments_territory_id_idx').on(table.territoryId),
    userIdIdx: index('territory_assignments_user_id_idx').on(table.userId),
    teamIdIdx: index('territory_assignments_team_id_idx').on(table.teamId),
    assignmentTypeIdx: index('territory_assignments_assignment_type_idx').on(table.assignmentType),
    isPrimaryIdx: index('territory_assignments_is_primary_idx').on(table.isPrimary),
    startDateIdx: index('territory_assignments_start_date_idx').on(table.startDate),
    territoryUserIdx: uniqueIndex('territory_assignments_territory_user_idx').on(table.territoryId, table.userId),
  })
);

/**
 * Quotas Table
 * Sales quotas definition
 */
export const quotas = pgTable(
  'quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 50 }).notNull().default('revenue'),
    // 'revenue', 'deals', 'leads', 'activities', 'custom'
    period: varchar('period', { length: 20 }).notNull().default('monthly'),
    // 'monthly', 'quarterly', 'yearly'

    startDate: timestamp('start_date', { withTimezone: true }).notNull(),
    endDate: timestamp('end_date', { withTimezone: true }).notNull(),

    target: integer('target').notNull(),
    currency: varchar('currency', { length: 3 }),

    status: varchar('status', { length: 50 }).notNull().default('draft'),
    // 'draft', 'active', 'completed', 'archived'

    settings: jsonb('settings').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('quotas_tenant_id_idx').on(table.tenantId),
    typeIdx: index('quotas_type_idx').on(table.type),
    periodIdx: index('quotas_period_idx').on(table.period),
    statusIdx: index('quotas_status_idx').on(table.status),
    startDateIdx: index('quotas_start_date_idx').on(table.startDate),
    endDateIdx: index('quotas_end_date_idx').on(table.endDate),
    tenantStatusIdx: index('quotas_tenant_status_idx').on(table.tenantId, table.status),
  })
);

/**
 * Quota Assignments Table
 * Quota assignments to users/teams/territories
 */
export const quotaAssignments = pgTable(
  'quota_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    quotaId: uuid('quota_id').notNull().references(() => quotas.id, { onDelete: 'cascade' }),

    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    teamId: uuid('team_id').references(() => teams.id, { onDelete: 'cascade' }),
    territoryId: uuid('territory_id').references(() => territories.id, { onDelete: 'cascade' }),

    target: integer('target').notNull(),

    status: varchar('status', { length: 50 }).notNull().default('active'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    quotaIdIdx: index('quota_assignments_quota_id_idx').on(table.quotaId),
    userIdIdx: index('quota_assignments_user_id_idx').on(table.userId),
    teamIdIdx: index('quota_assignments_team_id_idx').on(table.teamId),
    territoryIdIdx: index('quota_assignments_territory_id_idx').on(table.territoryId),
    statusIdx: index('quota_assignments_status_idx').on(table.status),
  })
);

/**
 * Quota Adjustments Table
 * Tracks adjustments to quota assignments
 */
export const quotaAdjustments = pgTable(
  'quota_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    assignmentId: uuid('assignment_id').notNull().references(() => quotaAssignments.id, { onDelete: 'cascade' }),

    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    adjustedBy: uuid('adjusted_by').notNull().references(() => users.id, { onDelete: 'set null' }),

    adjustedAt: timestamp('adjusted_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    assignmentIdIdx: index('quota_adjustments_assignment_id_idx').on(table.assignmentId),
    adjustedByIdx: index('quota_adjustments_adjusted_by_idx').on(table.adjustedBy),
    adjustedAtIdx: index('quota_adjustments_adjusted_at_idx').on(table.adjustedAt),
  })
);

/**
 * Lead Assignment Rules Table
 * Rules for automatic lead assignment
 */
export const assignmentRules = pgTable(
  'assignment_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    method: varchar('method', { length: 50 }).notNull().default('round_robin'),
    // 'round_robin', 'weighted', 'load_balanced', 'geographic', 'manual'
    priority: integer('priority').notNull().default(100),

    conditions: jsonb('conditions').notNull().default([]),
    actions: jsonb('actions').notNull().default([]),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('assignment_rules_tenant_id_idx').on(table.tenantId),
    priorityIdx: index('assignment_rules_priority_idx').on(table.priority),
    methodIdx: index('assignment_rules_method_idx').on(table.method),
    isActiveIdx: index('assignment_rules_is_active_idx').on(table.isActive),
    tenantPriorityIdx: index('assignment_rules_tenant_priority_idx').on(table.tenantId, table.priority),
  })
);

/**
 * Assignment History Table
 * Logs of lead/opportunity assignments
 */
export const assignmentHistory = pgTable(
  'assignment_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'opportunity', 'customer'
    entityId: uuid('entity_id').notNull(),

    fromUserId: uuid('from_user_id'),
    toUserId: uuid('to_user_id'),
    fromTeamId: uuid('from_team_id'),
    toTeamId: uuid('to_team_id'),

    ruleId: uuid('rule_id').references(() => assignmentRules.id, { onDelete: 'set null' }),
    reason: text('reason'),

    assignedBy: uuid('assigned_by').references(() => users.id, { onDelete: 'set null' }),
    assignedAt: timestamp('assigned_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('assignment_history_tenant_id_idx').on(table.tenantId),
    entityTypeIdx: index('assignment_history_entity_type_idx').on(table.entityType),
    entityIdIdx: index('assignment_history_entity_id_idx').on(table.entityId),
    toUserIdIdx: index('assignment_history_to_user_id_idx').on(table.toUserId),
    toTeamIdIdx: index('assignment_history_to_team_id_idx').on(table.toTeamId),
    ruleIdIdx: index('assignment_history_rule_id_idx').on(table.ruleId),
    assignedAtIdx: index('assignment_history_assigned_at_idx').on(table.assignedAt),
    tenantEntityIdx: index('assignment_history_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
  })
);

/**
 * Performance Snapshots Table
 * Periodic snapshots of team/user performance
 */
export const performanceSnapshots = pgTable(
  'performance_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'user', 'team', 'territory'
    entityId: uuid('entity_id').notNull(),

    periodType: varchar('period_type', { length: 20 }).notNull(), // 'daily', 'weekly', 'monthly'
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    metrics: jsonb('metrics').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('performance_snapshots_tenant_id_idx').on(table.tenantId),
    entityTypeIdx: index('performance_snapshots_entity_type_idx').on(table.entityType),
    entityIdIdx: index('performance_snapshots_entity_id_idx').on(table.entityId),
    periodTypeIdx: index('performance_snapshots_period_type_idx').on(table.periodType),
    periodStartIdx: index('performance_snapshots_period_start_idx').on(table.periodStart),
    tenantEntityPeriodIdx: uniqueIndex('performance_snapshots_tenant_entity_period_idx')
      .on(table.tenantId, table.entityType, table.entityId, table.periodType, table.periodStart),
  })
);

// Team & Territory type exports
export type TeamRow = typeof teams.$inferSelect;
export type NewTeamRow = typeof teams.$inferInsert;
export type TeamMemberRow = typeof teamMembers.$inferSelect;
export type NewTeamMemberRow = typeof teamMembers.$inferInsert;
export type TerritoryRow = typeof territories.$inferSelect;
export type NewTerritoryRow = typeof territories.$inferInsert;
export type TerritoryAssignmentRow = typeof territoryAssignments.$inferSelect;
export type NewTerritoryAssignmentRow = typeof territoryAssignments.$inferInsert;
export type QuotaRow = typeof quotas.$inferSelect;
export type NewQuotaRow = typeof quotas.$inferInsert;
export type QuotaAssignmentRow = typeof quotaAssignments.$inferSelect;
export type NewQuotaAssignmentRow = typeof quotaAssignments.$inferInsert;
export type QuotaAdjustmentRow = typeof quotaAdjustments.$inferSelect;
export type NewQuotaAdjustmentRow = typeof quotaAdjustments.$inferInsert;
export type AssignmentRuleRow = typeof assignmentRules.$inferSelect;
export type NewAssignmentRuleRow = typeof assignmentRules.$inferInsert;
export type AssignmentHistoryRow = typeof assignmentHistory.$inferSelect;
export type NewAssignmentHistoryRow = typeof assignmentHistory.$inferInsert;
export type PerformanceSnapshotRow = typeof performanceSnapshots.$inferSelect;
export type NewPerformanceSnapshotRow = typeof performanceSnapshots.$inferInsert;

// ==================== Email Tracking Tables ====================

/**
 * Tracked Emails table - Core email tracking records
 */
export const trackedEmails = pgTable(
  'tracked_emails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    // Email details
    messageId: varchar('message_id', { length: 255 }).notNull(),
    threadId: varchar('thread_id', { length: 255 }),
    subject: varchar('subject', { length: 500 }).notNull(),
    fromEmail: varchar('from_email', { length: 255 }).notNull(),
    fromName: varchar('from_name', { length: 255 }),
    toEmail: varchar('to_email', { length: 255 }).notNull(),
    toName: varchar('to_name', { length: 255 }),
    ccEmails: jsonb('cc_emails').notNull().default([]),
    bccEmails: jsonb('bcc_emails').notNull().default([]),

    // Entity association
    entityType: varchar('entity_type', { length: 50 }), // 'lead', 'contact', 'customer', 'opportunity'
    entityId: uuid('entity_id'),

    // Tracking
    trackingId: varchar('tracking_id', { length: 100 }).notNull(),
    pixelUrl: varchar('pixel_url', { length: 500 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('sent'),

    // Engagement metrics
    openCount: integer('open_count').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    firstOpenedAt: timestamp('first_opened_at', { withTimezone: true }),
    lastOpenedAt: timestamp('last_opened_at', { withTimezone: true }),
    firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),

    // Delivery info
    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    bounceType: varchar('bounce_type', { length: 20 }), // 'soft', 'hard'
    bounceReason: text('bounce_reason'),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('tracked_emails_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('tracked_emails_user_id_idx').on(table.userId),
    messageIdIdx: uniqueIndex('tracked_emails_message_id_idx').on(table.messageId),
    trackingIdIdx: uniqueIndex('tracked_emails_tracking_id_idx').on(table.trackingId),
    toEmailIdx: index('tracked_emails_to_email_idx').on(table.toEmail),
    statusIdx: index('tracked_emails_status_idx').on(table.status),
    entityIdx: index('tracked_emails_entity_idx').on(table.entityType, table.entityId),
    sentAtIdx: index('tracked_emails_sent_at_idx').on(table.sentAt),
    tenantUserIdx: index('tracked_emails_tenant_user_idx').on(table.tenantId, table.userId),
  })
);

/**
 * Tracked Links table - Individual link tracking within emails
 */
export const trackedLinks = pgTable(
  'tracked_links',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    emailId: uuid('email_id').notNull(),

    originalUrl: varchar('original_url', { length: 2000 }).notNull(),
    trackingUrl: varchar('tracking_url', { length: 2000 }).notNull(),
    linkType: varchar('link_type', { length: 50 }).notNull().default('other'), // 'primary_cta', 'secondary_cta', 'inline', 'footer', 'unsubscribe', 'social'
    anchorText: varchar('anchor_text', { length: 500 }),
    position: integer('position').notNull(),

    // Metrics
    clickCount: integer('click_count').notNull().default(0),
    firstClickedAt: timestamp('first_clicked_at', { withTimezone: true }),
    lastClickedAt: timestamp('last_clicked_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdIdx: index('tracked_links_email_id_idx').on(table.emailId),
    originalUrlIdx: index('tracked_links_original_url_idx').on(table.originalUrl),
    linkTypeIdx: index('tracked_links_link_type_idx').on(table.linkType),
  })
);

/**
 * Tracking Events table - All tracking events (opens, clicks, bounces, etc.)
 */
export const trackingEvents = pgTable(
  'tracking_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    emailId: uuid('email_id').notNull(),
    trackingId: varchar('tracking_id', { length: 100 }).notNull(),

    eventType: varchar('event_type', { length: 50 }).notNull(), // 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed'

    // Event details
    linkId: uuid('link_id'),
    clickedUrl: varchar('clicked_url', { length: 2000 }),

    // Device/Client info
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    deviceType: varchar('device_type', { length: 50 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    country: varchar('country', { length: 100 }),
    city: varchar('city', { length: 100 }),

    // Additional data
    isUnique: boolean('is_unique').notNull().default(false),
    isFirstEvent: boolean('is_first_event').notNull().default(false),
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('tracking_events_tenant_id_idx').on(table.tenantId),
    emailIdIdx: index('tracking_events_email_id_idx').on(table.emailId),
    trackingIdIdx: index('tracking_events_tracking_id_idx').on(table.trackingId),
    eventTypeIdx: index('tracking_events_event_type_idx').on(table.eventType),
    linkIdIdx: index('tracking_events_link_id_idx').on(table.linkId),
    occurredAtIdx: index('tracking_events_occurred_at_idx').on(table.occurredAt),
    tenantEventTypeIdx: index('tracking_events_tenant_event_type_idx').on(table.tenantId, table.eventType),
  })
);

/**
 * Email Sequences table - Automated email cadences
 */
export const emailSequences = pgTable(
  'email_sequences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    steps: jsonb('steps').notNull().default([]),
    settings: jsonb('settings').notNull().default({}),

    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by').notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('email_sequences_tenant_id_idx').on(table.tenantId),
    isActiveIdx: index('email_sequences_is_active_idx').on(table.isActive),
    createdByIdx: index('email_sequences_created_by_idx').on(table.createdBy),
    tenantActiveIdx: index('email_sequences_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

/**
 * Sequence Steps table - Individual steps in email sequences
 */
export const sequenceSteps = pgTable(
  'sequence_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id').notNull(),
    order: integer('order').notNull(),
    type: varchar('type', { length: 50 }).notNull(), // 'email', 'wait', 'condition'

    // For email steps
    templateId: uuid('template_id'),
    subject: varchar('subject', { length: 500 }),
    body: text('body'),

    // For wait steps
    waitDays: integer('wait_days'),
    waitHours: integer('wait_hours'),
    waitUntilTime: varchar('wait_until_time', { length: 10 }),
    skipWeekends: boolean('skip_weekends').notNull().default(false),

    // For condition steps
    condition: jsonb('condition'),

    // Stats
    sentCount: integer('sent_count').notNull().default(0),
    openCount: integer('open_count').notNull().default(0),
    clickCount: integer('click_count').notNull().default(0),
    replyCount: integer('reply_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sequenceIdIdx: index('sequence_steps_sequence_id_idx').on(table.sequenceId),
    typeIdx: index('sequence_steps_type_idx').on(table.type),
    orderIdx: index('sequence_steps_order_idx').on(table.sequenceId, table.order),
  })
);

/**
 * Sequence Enrollments table - Contacts enrolled in sequences
 */
export const sequenceEnrollments = pgTable(
  'sequence_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    sequenceId: uuid('sequence_id').notNull(),

    entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'contact', 'customer'
    entityId: uuid('entity_id').notNull(),
    email: varchar('email', { length: 255 }).notNull(),

    currentStepId: uuid('current_step_id'),
    status: varchar('status', { length: 50 }).notNull().default('active'), // 'active', 'paused', 'completed', 'exited', 'bounced'
    exitReason: text('exit_reason'),

    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    exitedAt: timestamp('exited_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    nextStepAt: timestamp('next_step_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sequence_enrollments_tenant_id_idx').on(table.tenantId),
    sequenceIdIdx: index('sequence_enrollments_sequence_id_idx').on(table.sequenceId),
    entityIdx: index('sequence_enrollments_entity_idx').on(table.entityType, table.entityId),
    emailIdx: index('sequence_enrollments_email_idx').on(table.email),
    statusIdx: index('sequence_enrollments_status_idx').on(table.status),
    currentStepIdx: index('sequence_enrollments_current_step_idx').on(table.currentStepId),
    nextStepAtIdx: index('sequence_enrollments_next_step_at_idx').on(table.nextStepAt),
    sequenceEntityIdx: uniqueIndex('sequence_enrollments_sequence_entity_idx')
      .on(table.sequenceId, table.entityType, table.entityId),
  })
);

// Email Tracking type exports
export type TrackedEmailRow = typeof trackedEmails.$inferSelect;
export type NewTrackedEmailRow = typeof trackedEmails.$inferInsert;
export type TrackedLinkRow = typeof trackedLinks.$inferSelect;
export type NewTrackedLinkRow = typeof trackedLinks.$inferInsert;
export type TrackingEventRow = typeof trackingEvents.$inferSelect;
export type NewTrackingEventRow = typeof trackingEvents.$inferInsert;
export type EmailSequenceRow = typeof emailSequences.$inferSelect;
export type NewEmailSequenceRow = typeof emailSequences.$inferInsert;
export type SequenceStepRow = typeof sequenceSteps.$inferSelect;
export type NewSequenceStepRow = typeof sequenceSteps.$inferInsert;
export type SequenceEnrollmentRow = typeof sequenceEnrollments.$inferSelect;
export type NewSequenceEnrollmentRow = typeof sequenceEnrollments.$inferInsert;

// ==================== Sales Forecasting Tables ====================

/**
 * Forecasts table - Sales forecasts by period
 */
export const forecasts = pgTable(
  'forecasts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),

    // Period
    period: varchar('period', { length: 20 }).notNull(), // 'weekly', 'monthly', 'quarterly', 'yearly'
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Totals
    totalPipeline: integer('total_pipeline').notNull().default(0),
    weightedPipeline: integer('weighted_pipeline').notNull().default(0),
    committed: integer('committed').notNull().default(0),
    bestCase: integer('best_case').notNull().default(0),
    closedWon: integer('closed_won').notNull().default(0),
    closedLost: integer('closed_lost').notNull().default(0),

    // Targets
    quota: integer('quota').notNull().default(0),
    quotaAttainment: integer('quota_attainment').notNull().default(0),

    // Status
    status: varchar('status', { length: 50 }).notNull().default('draft'), // 'draft', 'submitted', 'approved', 'locked'
    submittedAt: timestamp('submitted_at', { withTimezone: true }),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    approvedBy: uuid('approved_by'),

    // Metadata
    notes: text('notes'),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('forecasts_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('forecasts_user_id_idx').on(table.userId),
    periodIdx: index('forecasts_period_idx').on(table.period),
    statusIdx: index('forecasts_status_idx').on(table.status),
    periodStartIdx: index('forecasts_period_start_idx').on(table.periodStart),
    tenantUserPeriodIdx: uniqueIndex('forecasts_tenant_user_period_idx')
      .on(table.tenantId, table.userId, table.period, table.periodStart),
  })
);

/**
 * Forecast Line Items table - Individual opportunities in forecast
 */
export const forecastLineItems = pgTable(
  'forecast_line_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    forecastId: uuid('forecast_id').notNull(),
    opportunityId: uuid('opportunity_id').notNull(),
    opportunityName: varchar('opportunity_name', { length: 255 }).notNull(),

    // Amounts
    amount: integer('amount').notNull().default(0),
    weightedAmount: integer('weighted_amount').notNull().default(0),
    probability: integer('probability').notNull().default(0),

    // Stage info
    stage: varchar('stage', { length: 100 }).notNull(),
    stageWeight: integer('stage_weight').notNull().default(0),

    // Category
    category: varchar('category', { length: 50 }).notNull().default('pipeline'), // 'commit', 'best_case', 'pipeline', 'omitted'
    overrideCategory: varchar('override_category', { length: 50 }),
    overrideAmount: integer('override_amount'),
    overrideReason: text('override_reason'),

    // Expected close
    expectedCloseDate: timestamp('expected_close_date', { withTimezone: true }).notNull(),
    originalCloseDate: timestamp('original_close_date', { withTimezone: true }),

    // Owner
    ownerUserId: uuid('owner_user_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }),

    // Activity signals
    lastActivityDate: timestamp('last_activity_date', { withTimezone: true }),
    daysSinceActivity: integer('days_since_activity'),
    riskLevel: varchar('risk_level', { length: 20 }).notNull().default('low'), // 'low', 'medium', 'high'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    forecastIdIdx: index('forecast_line_items_forecast_id_idx').on(table.forecastId),
    opportunityIdIdx: index('forecast_line_items_opportunity_id_idx').on(table.opportunityId),
    categoryIdx: index('forecast_line_items_category_idx').on(table.category),
    ownerUserIdIdx: index('forecast_line_items_owner_user_id_idx').on(table.ownerUserId),
    expectedCloseDateIdx: index('forecast_line_items_expected_close_date_idx').on(table.expectedCloseDate),
    forecastOpportunityIdx: uniqueIndex('forecast_line_items_forecast_opportunity_idx')
      .on(table.forecastId, table.opportunityId),
  })
);

/**
 * Forecast Adjustments table - Manual adjustments to forecasts
 */
export const forecastAdjustments = pgTable(
  'forecast_adjustments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    forecastId: uuid('forecast_id').notNull(),
    category: varchar('category', { length: 50 }).notNull(),
    amount: integer('amount').notNull(),
    reason: text('reason').notNull(),
    adjustedBy: uuid('adjusted_by').notNull(),
    adjustedAt: timestamp('adjusted_at', { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    forecastIdIdx: index('forecast_adjustments_forecast_id_idx').on(table.forecastId),
    categoryIdx: index('forecast_adjustments_category_idx').on(table.category),
    adjustedByIdx: index('forecast_adjustments_adjusted_by_idx').on(table.adjustedBy),
  })
);

/**
 * Pipeline Snapshots table - Daily pipeline state snapshots
 */
export const pipelineSnapshots = pgTable(
  'pipeline_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    snapshotDate: timestamp('snapshot_date', { withTimezone: true }).notNull(),

    // Pipeline metrics
    totalValue: integer('total_value').notNull().default(0),
    totalDeals: integer('total_deals').notNull().default(0),
    weightedValue: integer('weighted_value').notNull().default(0),
    avgDealSize: integer('avg_deal_size').notNull().default(0),

    // By stage (JSON)
    byStage: jsonb('by_stage').notNull().default([]),

    // By category (JSON)
    byCategory: jsonb('by_category').notNull().default([]),

    // Movement
    addedValue: integer('added_value').notNull().default(0),
    addedDeals: integer('added_deals').notNull().default(0),
    removedValue: integer('removed_value').notNull().default(0),
    removedDeals: integer('removed_deals').notNull().default(0),
    movedUpValue: integer('moved_up_value').notNull().default(0),
    movedDownValue: integer('moved_down_value').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('pipeline_snapshots_tenant_id_idx').on(table.tenantId),
    snapshotDateIdx: index('pipeline_snapshots_snapshot_date_idx').on(table.snapshotDate),
    tenantSnapshotIdx: uniqueIndex('pipeline_snapshots_tenant_snapshot_idx')
      .on(table.tenantId, table.snapshotDate),
  })
);

/**
 * Stage Probabilities table - Win probability by pipeline stage
 */
export const stageProbabilities = pgTable(
  'stage_probabilities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    pipelineId: uuid('pipeline_id').notNull(),
    stageName: varchar('stage_name', { length: 100 }).notNull(),
    stageOrder: integer('stage_order').notNull(),

    // Probability
    defaultProbability: integer('default_probability').notNull().default(0),
    historicalWinRate: integer('historical_win_rate'),
    adjustedProbability: integer('adjusted_probability'),

    // Historical data
    totalDeals: integer('total_deals').notNull().default(0),
    wonDeals: integer('won_deals').notNull().default(0),
    lostDeals: integer('lost_deals').notNull().default(0),
    avgDaysInStage: integer('avg_days_in_stage').notNull().default(0),

    calculatedAt: timestamp('calculated_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('stage_probabilities_tenant_id_idx').on(table.tenantId),
    pipelineIdIdx: index('stage_probabilities_pipeline_id_idx').on(table.pipelineId),
    tenantPipelineStageIdx: uniqueIndex('stage_probabilities_tenant_pipeline_stage_idx')
      .on(table.tenantId, table.pipelineId, table.stageName),
  })
);

/**
 * Deal Velocity Snapshots table - Track deal velocity metrics over time
 */
export const dealVelocitySnapshots = pgTable(
  'deal_velocity_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    snapshotDate: timestamp('snapshot_date', { withTimezone: true }).notNull(),

    // Overall metrics
    avgCycleTime: integer('avg_cycle_time').notNull().default(0),
    avgDealSize: integer('avg_deal_size').notNull().default(0),
    avgDealsPerRep: integer('avg_deals_per_rep').notNull().default(0),
    velocity: integer('velocity').notNull().default(0),

    // By stage (JSON)
    stageVelocity: jsonb('stage_velocity').notNull().default([]),

    // By rep (JSON)
    repVelocity: jsonb('rep_velocity').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('deal_velocity_snapshots_tenant_id_idx').on(table.tenantId),
    snapshotDateIdx: index('deal_velocity_snapshots_snapshot_date_idx').on(table.snapshotDate),
    tenantSnapshotIdx: uniqueIndex('deal_velocity_snapshots_tenant_snapshot_idx')
      .on(table.tenantId, table.snapshotDate),
  })
);

/**
 * AI Predictions table - Machine learning predictions for opportunities
 */
export const aiPredictions = pgTable(
  'ai_predictions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    opportunityId: uuid('opportunity_id').notNull(),
    predictionDate: timestamp('prediction_date', { withTimezone: true }).notNull(),

    // Win probability
    winProbability: integer('win_probability').notNull(),
    confidenceScore: integer('confidence_score').notNull(),

    // Predicted close
    predictedCloseDate: timestamp('predicted_close_date', { withTimezone: true }),
    daysToClose: integer('days_to_close'),

    // Amount prediction
    predictedAmount: integer('predicted_amount'),
    amountRangeLow: integer('amount_range_low'),
    amountRangeHigh: integer('amount_range_high'),

    // Factors (JSON)
    positiveFactors: jsonb('positive_factors').notNull().default([]),
    negativeFactors: jsonb('negative_factors').notNull().default([]),

    // Model info
    modelVersion: varchar('model_version', { length: 50 }).notNull(),
    modelAccuracy: integer('model_accuracy'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('ai_predictions_tenant_id_idx').on(table.tenantId),
    opportunityIdIdx: index('ai_predictions_opportunity_id_idx').on(table.opportunityId),
    predictionDateIdx: index('ai_predictions_prediction_date_idx').on(table.predictionDate),
    tenantOpportunityDateIdx: uniqueIndex('ai_predictions_tenant_opportunity_date_idx')
      .on(table.tenantId, table.opportunityId, table.predictionDate),
  })
);

// Forecasting type exports
export type ForecastRow = typeof forecasts.$inferSelect;
export type NewForecastRow = typeof forecasts.$inferInsert;
export type ForecastLineItemRow = typeof forecastLineItems.$inferSelect;
export type NewForecastLineItemRow = typeof forecastLineItems.$inferInsert;
export type ForecastAdjustmentRow = typeof forecastAdjustments.$inferSelect;
export type NewForecastAdjustmentRow = typeof forecastAdjustments.$inferInsert;
export type PipelineSnapshotRow = typeof pipelineSnapshots.$inferSelect;
export type NewPipelineSnapshotRow = typeof pipelineSnapshots.$inferInsert;
export type StageProbabilityRow = typeof stageProbabilities.$inferSelect;
export type NewStageProbabilityRow = typeof stageProbabilities.$inferInsert;
export type DealVelocitySnapshotRow = typeof dealVelocitySnapshots.$inferSelect;
export type NewDealVelocitySnapshotRow = typeof dealVelocitySnapshots.$inferInsert;
export type AIPredictionRow = typeof aiPredictions.$inferSelect;
export type NewAIPredictionRow = typeof aiPredictions.$inferInsert;

// ============================================================================
// CUSTOMER SUCCESS / HEALTH SCORING TABLES
// ============================================================================

/**
 * Customer Health Scores - Main health score records
 */
export const customerHealthScores = pgTable(
  'customer_health_scores',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Overall scores
    overallScore: integer('overall_score').notNull(), // 0-100
    healthStatus: varchar('health_status', { length: 20 }).notNull(), // healthy, at_risk, critical
    healthTrend: varchar('health_trend', { length: 20 }).notNull(), // improving, stable, declining

    // Component scores (0-100)
    productUsageScore: integer('product_usage_score').notNull(),
    engagementScore: integer('engagement_score').notNull(),
    supportScore: integer('support_score').notNull(),
    financialScore: integer('financial_score').notNull(),
    relationshipScore: integer('relationship_score').notNull(),

    // Detailed metrics (JSON)
    productUsageMetrics: jsonb('product_usage_metrics').notNull().default({}),
    engagementMetrics: jsonb('engagement_metrics').notNull().default({}),
    supportMetrics: jsonb('support_metrics').notNull().default({}),
    financialMetrics: jsonb('financial_metrics').notNull().default({}),
    relationshipMetrics: jsonb('relationship_metrics').notNull().default({}),

    // AI insights
    aiPredictedChurnRisk: integer('ai_predicted_churn_risk'), // 0-100
    aiConfidenceLevel: integer('ai_confidence_level'), // 0-100
    aiRecommendations: jsonb('ai_recommendations').notNull().default([]),

    // Lifecycle
    lifecycleStage: varchar('lifecycle_stage', { length: 20 }).notNull(), // onboarding, adoption, growth, maturity, renewal
    daysInStage: integer('days_in_stage').notNull().default(0),

    // Risk & opportunity
    riskLevel: varchar('risk_level', { length: 20 }).notNull(), // low, medium, high, critical
    expansionPotential: varchar('expansion_potential', { length: 20 }).notNull(), // none, low, medium, high

    // Timestamps
    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
    nextCalculation: timestamp('next_calculation', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customer_health_scores_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('customer_health_scores_customer_id_idx').on(table.customerId),
    healthStatusIdx: index('customer_health_scores_health_status_idx').on(table.healthStatus),
    overallScoreIdx: index('customer_health_scores_overall_score_idx').on(table.overallScore),
    lifecycleStageIdx: index('customer_health_scores_lifecycle_stage_idx').on(table.lifecycleStage),
    riskLevelIdx: index('customer_health_scores_risk_level_idx').on(table.riskLevel),
    tenantCustomerIdx: uniqueIndex('customer_health_scores_tenant_customer_idx')
      .on(table.tenantId, table.customerId),
  })
);

/**
 * Health Score History - Historical snapshots
 */
export const healthScoreHistory = pgTable(
  'health_score_history',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    // Scores at snapshot
    overallScore: integer('overall_score').notNull(),
    healthStatus: varchar('health_status', { length: 20 }).notNull(),
    productUsageScore: integer('product_usage_score').notNull(),
    engagementScore: integer('engagement_score').notNull(),
    supportScore: integer('support_score').notNull(),
    financialScore: integer('financial_score').notNull(),
    relationshipScore: integer('relationship_score').notNull(),

    // Period
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('health_score_history_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('health_score_history_customer_id_idx').on(table.customerId),
    periodIdx: index('health_score_history_period_idx').on(table.periodStart, table.periodEnd),
    tenantCustomerPeriodIdx: uniqueIndex('health_score_history_tenant_customer_period_idx')
      .on(table.tenantId, table.customerId, table.periodEnd),
  })
);

/**
 * Risk Factors - Identified risk factors for customers
 */
export const riskFactors = pgTable(
  'risk_factors',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    category: varchar('category', { length: 30 }).notNull(), // usage, engagement, support, financial, relationship
    severity: varchar('severity', { length: 20 }).notNull(), // low, medium, high, critical
    description: text('description').notNull(),
    metric: varchar('metric', { length: 100 }).notNull(),
    currentValue: real('current_value').notNull(),
    thresholdValue: real('threshold_value').notNull(),
    impact: integer('impact').notNull(), // Impact on health score
    suggestedAction: text('suggested_action'),

    detectedAt: timestamp('detected_at', { withTimezone: true }).notNull().defaultNow(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('risk_factors_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('risk_factors_customer_id_idx').on(table.customerId),
    categoryIdx: index('risk_factors_category_idx').on(table.category),
    severityIdx: index('risk_factors_severity_idx').on(table.severity),
    isActiveIdx: index('risk_factors_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('risk_factors_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

/**
 * Expansion Opportunities - Identified expansion opportunities
 */
export const expansionOpportunities = pgTable(
  'expansion_opportunities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 20 }).notNull(), // upsell, cross_sell, upgrade, seats, add_on
    product: varchar('product', { length: 255 }).notNull(),
    estimatedValue: integer('estimated_value').notNull(),
    confidence: integer('confidence').notNull(), // 0-100
    signals: jsonb('signals').notNull().default([]),
    reasoning: text('reasoning'),
    suggestedApproach: text('suggested_approach'),
    status: varchar('status', { length: 20 }).notNull().default('identified'), // identified, qualified, pursuing, won, lost

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('expansion_opportunities_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('expansion_opportunities_customer_id_idx').on(table.customerId),
    typeIdx: index('expansion_opportunities_type_idx').on(table.type),
    statusIdx: index('expansion_opportunities_status_idx').on(table.status),
    confidenceIdx: index('expansion_opportunities_confidence_idx').on(table.confidence),
  })
);

/**
 * Health Thresholds - Configurable thresholds for health scoring
 */
export const healthThresholds = pgTable(
  'health_thresholds',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 100 }).notNull(),
    metric: varchar('metric', { length: 100 }).notNull(),
    healthyMin: real('healthy_min').notNull(),
    atRiskMin: real('at_risk_min').notNull(),
    criticalMax: real('critical_max').notNull(),
    weight: real('weight').notNull().default(1),
    lifecycleStage: varchar('lifecycle_stage', { length: 20 }), // null = all stages
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('health_thresholds_tenant_id_idx').on(table.tenantId),
    metricIdx: index('health_thresholds_metric_idx').on(table.metric),
    tenantMetricIdx: uniqueIndex('health_thresholds_tenant_metric_idx')
      .on(table.tenantId, table.metric, table.lifecycleStage),
  })
);

/**
 * Success Playbooks - Automated playbook definitions
 */
export const successPlaybooks = pgTable(
  'success_playbooks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    triggerType: varchar('trigger_type', { length: 30 }).notNull(), // health_score, risk_factor, lifecycle, manual, scheduled
    triggerConditions: jsonb('trigger_conditions').notNull().default([]),
    steps: jsonb('steps').notNull().default([]),
    targetLifecycleStages: jsonb('target_lifecycle_stages').notNull().default([]),
    targetHealthStatuses: jsonb('target_health_statuses').notNull().default([]),
    priority: integer('priority').notNull().default(100),
    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('success_playbooks_tenant_id_idx').on(table.tenantId),
    triggerTypeIdx: index('success_playbooks_trigger_type_idx').on(table.triggerType),
    isActiveIdx: index('success_playbooks_is_active_idx').on(table.isActive),
    tenantActiveIdx: index('success_playbooks_tenant_active_idx').on(table.tenantId, table.isActive),
  })
);

/**
 * Playbook Executions - Running/completed playbook instances
 */
export const playbookExecutions = pgTable(
  'playbook_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    playbookId: uuid('playbook_id').notNull().references(() => successPlaybooks.id, { onDelete: 'cascade' }),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    status: varchar('status', { length: 20 }).notNull().default('active'), // active, completed, paused, cancelled
    currentStep: integer('current_step').notNull().default(1),
    completedSteps: jsonb('completed_steps').notNull().default([]),
    triggeredBy: uuid('triggered_by'),
    assignedTo: uuid('assigned_to'),
    notes: text('notes'),

    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('playbook_executions_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('playbook_executions_customer_id_idx').on(table.customerId),
    playbookIdIdx: index('playbook_executions_playbook_id_idx').on(table.playbookId),
    statusIdx: index('playbook_executions_status_idx').on(table.status),
    assignedToIdx: index('playbook_executions_assigned_to_idx').on(table.assignedTo),
  })
);

/**
 * Success Tasks - CS tasks for customers
 */
export const successTasks = pgTable(
  'success_tasks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),
    playbookExecutionId: uuid('playbook_execution_id').references(() => playbookExecutions.id),

    type: varchar('type', { length: 30 }).notNull(), // check_in, qbr, onboarding, training, renewal, escalation, custom
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),
    priority: varchar('priority', { length: 20 }).notNull().default('medium'), // low, medium, high, critical
    dueDate: timestamp('due_date', { withTimezone: true }),
    assignedTo: uuid('assigned_to'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, cancelled
    outcome: text('outcome'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('success_tasks_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('success_tasks_customer_id_idx').on(table.customerId),
    assignedToIdx: index('success_tasks_assigned_to_idx').on(table.assignedTo),
    statusIdx: index('success_tasks_status_idx').on(table.status),
    dueDateIdx: index('success_tasks_due_date_idx').on(table.dueDate),
    priorityIdx: index('success_tasks_priority_idx').on(table.priority),
  })
);

/**
 * Customer Touchpoints - Interaction history
 */
export const customerTouchpoints = pgTable(
  'customer_touchpoints',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    customerId: uuid('customer_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 30 }).notNull(), // call, meeting, email, chat, support, event, qbr
    subject: varchar('subject', { length: 255 }).notNull(),
    summary: text('summary'),
    sentiment: varchar('sentiment', { length: 20 }), // positive, neutral, negative
    participants: jsonb('participants').notNull().default([]),
    duration: integer('duration'), // minutes
    nextSteps: jsonb('next_steps').notNull().default([]),
    recordedBy: uuid('recorded_by'),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull(),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customer_touchpoints_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('customer_touchpoints_customer_id_idx').on(table.customerId),
    typeIdx: index('customer_touchpoints_type_idx').on(table.type),
    occurredAtIdx: index('customer_touchpoints_occurred_at_idx').on(table.occurredAt),
    sentimentIdx: index('customer_touchpoints_sentiment_idx').on(table.sentiment),
  })
);

/**
 * Health Score Weights - Configurable weights per tenant
 */
export const healthScoreWeights = pgTable(
  'health_score_weights',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    productUsageWeight: real('product_usage_weight').notNull().default(25),
    engagementWeight: real('engagement_weight').notNull().default(20),
    supportWeight: real('support_weight').notNull().default(20),
    financialWeight: real('financial_weight').notNull().default(20),
    relationshipWeight: real('relationship_weight').notNull().default(15),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: uniqueIndex('health_score_weights_tenant_id_idx').on(table.tenantId),
  })
);

/**
 * Customer Segments - Segmentation for health analysis
 */
export const customerSegments = pgTable(
  'customer_segments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),
    filters: jsonb('filters').notNull().default([]),
    customerCount: integer('customer_count').notNull().default(0),
    avgHealthScore: real('avg_health_score'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customer_segments_tenant_id_idx').on(table.tenantId),
    nameIdx: index('customer_segments_name_idx').on(table.name),
  })
);

// Customer Success type exports
export type CustomerHealthScoreRow = typeof customerHealthScores.$inferSelect;
export type NewCustomerHealthScoreRow = typeof customerHealthScores.$inferInsert;
export type HealthScoreHistoryRow = typeof healthScoreHistory.$inferSelect;
export type NewHealthScoreHistoryRow = typeof healthScoreHistory.$inferInsert;
export type RiskFactorRow = typeof riskFactors.$inferSelect;
export type NewRiskFactorRow = typeof riskFactors.$inferInsert;
export type ExpansionOpportunityRow = typeof expansionOpportunities.$inferSelect;
export type NewExpansionOpportunityRow = typeof expansionOpportunities.$inferInsert;
export type HealthThresholdRow = typeof healthThresholds.$inferSelect;
export type NewHealthThresholdRow = typeof healthThresholds.$inferInsert;
export type SuccessPlaybookRow = typeof successPlaybooks.$inferSelect;
export type NewSuccessPlaybookRow = typeof successPlaybooks.$inferInsert;
export type PlaybookExecutionRow = typeof playbookExecutions.$inferSelect;
export type NewPlaybookExecutionRow = typeof playbookExecutions.$inferInsert;
export type SuccessTaskRow = typeof successTasks.$inferSelect;
export type NewSuccessTaskRow = typeof successTasks.$inferInsert;
export type CustomerTouchpointRow = typeof customerTouchpoints.$inferSelect;
export type NewCustomerTouchpointRow = typeof customerTouchpoints.$inferInsert;
export type HealthScoreWeightRow = typeof healthScoreWeights.$inferSelect;
export type NewHealthScoreWeightRow = typeof healthScoreWeights.$inferInsert;
export type CustomerSegmentRow = typeof customerSegments.$inferSelect;
export type NewCustomerSegmentRow = typeof customerSegments.$inferInsert;

// ============================================================================
// CONTRACT MANAGEMENT TABLES
// ============================================================================

/**
 * Contracts - Main contracts table
 */
export const contracts = pgTable(
  'contracts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Core info
    contractNumber: varchar('contract_number', { length: 50 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(), // master_agreement, service_agreement, subscription, etc.
    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, pending_approval, approved, etc.
    description: text('description'),

    // Parties
    customerId: uuid('customer_id'),
    customerName: varchar('customer_name', { length: 255 }).notNull(),
    vendorId: uuid('vendor_id'),
    vendorName: varchar('vendor_name', { length: 255 }),

    // Financial terms
    totalValue: integer('total_value').notNull(),
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    recurringValue: integer('recurring_value'),
    billingFrequency: varchar('billing_frequency', { length: 20 }), // monthly, quarterly, annually, one_time
    paymentTerms: varchar('payment_terms', { length: 50 }),

    // Dates
    effectiveDate: timestamp('effective_date', { withTimezone: true }).notNull(),
    expirationDate: timestamp('expiration_date', { withTimezone: true }).notNull(),
    signedDate: timestamp('signed_date', { withTimezone: true }),
    terminatedDate: timestamp('terminated_date', { withTimezone: true }),
    renewalDate: timestamp('renewal_date', { withTimezone: true }),

    // Terms
    autoRenew: boolean('auto_renew').notNull().default(false),
    renewalTermMonths: integer('renewal_term_months'),
    noticePeriodDays: integer('notice_period_days'),
    terminationClause: text('termination_clause'),

    // Documents
    documentUrl: varchar('document_url', { length: 500 }),
    templateId: uuid('template_id'),
    currentVersionId: uuid('current_version_id'),

    // Ownership
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }).notNull(),

    // Related entities
    opportunityId: uuid('opportunity_id'),
    parentContractId: uuid('parent_contract_id'),

    // Metadata
    tags: jsonb('tags').notNull().default([]),
    customFields: jsonb('custom_fields').notNull().default({}),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('contracts_tenant_id_idx').on(table.tenantId),
    contractNumberIdx: index('contracts_contract_number_idx').on(table.contractNumber),
    statusIdx: index('contracts_status_idx').on(table.status),
    typeIdx: index('contracts_type_idx').on(table.type),
    customerIdIdx: index('contracts_customer_id_idx').on(table.customerId),
    ownerIdIdx: index('contracts_owner_id_idx').on(table.ownerId),
    expirationDateIdx: index('contracts_expiration_date_idx').on(table.expirationDate),
    tenantContractNumberIdx: uniqueIndex('contracts_tenant_contract_number_idx')
      .on(table.tenantId, table.contractNumber),
  })
);

/**
 * Contract Versions - Document versions
 */
export const contractVersions = pgTable(
  'contract_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    versionNumber: integer('version_number').notNull(),
    documentUrl: varchar('document_url', { length: 500 }).notNull(),
    documentHash: varchar('document_hash', { length: 64 }), // SHA-256
    fileSize: integer('file_size'),
    mimeType: varchar('mime_type', { length: 100 }),

    changes: text('changes'),
    previousVersionId: uuid('previous_version_id'),

    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractIdIdx: index('contract_versions_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('contract_versions_tenant_id_idx').on(table.tenantId),
    versionIdx: index('contract_versions_version_idx').on(table.contractId, table.versionNumber),
  })
);

/**
 * Contract Templates - Reusable templates
 */
export const contractTemplates = pgTable(
  'contract_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    category: varchar('category', { length: 100 }),

    documentUrl: varchar('document_url', { length: 500 }).notNull(),
    placeholders: jsonb('placeholders').notNull().default([]),

    requiresApproval: boolean('requires_approval').notNull().default(true),
    approvalWorkflowId: uuid('approval_workflow_id'),
    defaultTermMonths: integer('default_term_months').notNull().default(12),
    defaultAutoRenew: boolean('default_auto_renew').notNull().default(true),

    useCount: integer('use_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('contract_templates_tenant_id_idx').on(table.tenantId),
    typeIdx: index('contract_templates_type_idx').on(table.type),
    isActiveIdx: index('contract_templates_is_active_idx').on(table.isActive),
  })
);

/**
 * Contract Approval Workflows - Approval configuration
 */
export const contractApprovalWorkflows = pgTable(
  'contract_approval_workflows',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    triggerType: varchar('trigger_type', { length: 30 }).notNull(), // contract_value, contract_type, manual, always
    triggerConditions: jsonb('trigger_conditions').notNull().default([]),
    steps: jsonb('steps').notNull().default([]),

    requireAllApprovers: boolean('require_all_approvers').notNull().default(true),
    allowSkip: boolean('allow_skip').notNull().default(false),
    skipConditions: jsonb('skip_conditions'),

    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('contract_approval_workflows_tenant_id_idx').on(table.tenantId),
    isActiveIdx: index('contract_approval_workflows_is_active_idx').on(table.isActive),
  })
);

/**
 * Contract Approvals - Approval requests
 */
export const contractApprovals = pgTable(
  'contract_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),
    workflowId: uuid('workflow_id').notNull(),

    currentStepOrder: integer('current_step_order').notNull().default(1),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, cancelled
    approvals: jsonb('approvals').notNull().default([]),

    requestedBy: uuid('requested_by').notNull(),
    requestedAt: timestamp('requested_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    comments: text('comments'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractIdIdx: index('contract_approvals_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('contract_approvals_tenant_id_idx').on(table.tenantId),
    statusIdx: index('contract_approvals_status_idx').on(table.status),
  })
);

/**
 * Signature Requests - E-signature tracking
 */
export const signatureRequests = pgTable(
  'signature_requests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    externalProvider: varchar('external_provider', { length: 50 }), // docusign, adobe_sign, etc.
    externalId: varchar('external_id', { length: 255 }),
    externalStatus: varchar('external_status', { length: 50 }),

    signatories: jsonb('signatories').notNull().default([]),
    documentUrl: varchar('document_url', { length: 500 }).notNull(),
    signedDocumentUrl: varchar('signed_document_url', { length: 500 }),

    status: varchar('status', { length: 30 }).notNull().default('draft'), // draft, sent, partially_signed, completed, etc.

    sentAt: timestamp('sent_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),

    message: text('message'),
    reminderConfig: jsonb('reminder_config'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    contractIdIdx: index('signature_requests_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('signature_requests_tenant_id_idx').on(table.tenantId),
    statusIdx: index('signature_requests_status_idx').on(table.status),
    externalIdIdx: index('signature_requests_external_id_idx').on(table.externalId),
  })
);

/**
 * Contract Renewals - Renewal tracking
 */
export const contractRenewals = pgTable(
  'contract_renewals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    status: varchar('status', { length: 30 }).notNull().default('upcoming'), // upcoming, in_progress, renewed, churned, auto_renewed
    renewalDate: timestamp('renewal_date', { withTimezone: true }).notNull(),

    proposedValue: integer('proposed_value'),
    proposedTermMonths: integer('proposed_term_months'),
    valueChange: integer('value_change'),

    renewedContractId: uuid('renewed_contract_id'),

    assignedTo: uuid('assigned_to'),
    notes: text('notes'),

    churnRisk: varchar('churn_risk', { length: 20 }), // low, medium, high
    churnReasons: jsonb('churn_reasons').default([]),

    notifiedAt: timestamp('notified_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractIdIdx: index('contract_renewals_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('contract_renewals_tenant_id_idx').on(table.tenantId),
    statusIdx: index('contract_renewals_status_idx').on(table.status),
    renewalDateIdx: index('contract_renewals_renewal_date_idx').on(table.renewalDate),
    assignedToIdx: index('contract_renewals_assigned_to_idx').on(table.assignedTo),
  })
);

/**
 * Contract Obligations - Tracking deliverables and compliance
 */
export const contractObligations = pgTable(
  'contract_obligations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 30 }).notNull(), // payment, delivery, compliance, reporting, milestone, other
    title: varchar('title', { length: 255 }).notNull(),
    description: text('description'),

    responsibleParty: varchar('responsible_party', { length: 20 }).notNull(), // customer, vendor, mutual
    assignedTo: uuid('assigned_to'),

    dueDate: timestamp('due_date', { withTimezone: true }).notNull(),
    recurringPattern: varchar('recurring_pattern', { length: 255 }), // RRULE format

    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, in_progress, completed, overdue, waived
    completedAt: timestamp('completed_at', { withTimezone: true }),
    completedBy: uuid('completed_by'),

    reminderDays: jsonb('reminder_days').notNull().default([]),
    lastReminderAt: timestamp('last_reminder_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractIdIdx: index('contract_obligations_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('contract_obligations_tenant_id_idx').on(table.tenantId),
    statusIdx: index('contract_obligations_status_idx').on(table.status),
    dueDateIdx: index('contract_obligations_due_date_idx').on(table.dueDate),
    assignedToIdx: index('contract_obligations_assigned_to_idx').on(table.assignedTo),
  })
);

/**
 * Contract Events - Activity log
 */
export const contractEvents = pgTable(
  'contract_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    contractId: uuid('contract_id').notNull().references(() => contracts.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 50 }).notNull(), // created, updated, status_changed, etc.
    description: text('description').notNull(),

    userId: uuid('user_id'),
    userName: varchar('user_name', { length: 255 }),

    relatedType: varchar('related_type', { length: 30 }), // approval, signature, amendment, renewal, obligation
    relatedId: uuid('related_id'),

    metadata: jsonb('metadata').notNull().default({}),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    contractIdIdx: index('contract_events_contract_id_idx').on(table.contractId),
    tenantIdIdx: index('contract_events_tenant_id_idx').on(table.tenantId),
    typeIdx: index('contract_events_type_idx').on(table.type),
    occurredAtIdx: index('contract_events_occurred_at_idx').on(table.occurredAt),
  })
);

/**
 * Contract Clauses - Reusable clause library
 */
export const contractClauses = pgTable(
  'contract_clauses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    content: text('content').notNull(),

    isStandard: boolean('is_standard').notNull().default(false),
    requiresReview: boolean('requires_review').notNull().default(false),
    riskLevel: varchar('risk_level', { length: 20 }).notNull().default('low'), // low, medium, high

    useCount: integer('use_count').notNull().default(0),
    version: integer('version').notNull().default(1),
    previousVersions: jsonb('previous_versions').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('contract_clauses_tenant_id_idx').on(table.tenantId),
    categoryIdx: index('contract_clauses_category_idx').on(table.category),
    riskLevelIdx: index('contract_clauses_risk_level_idx').on(table.riskLevel),
  })
);

// Contract Management type exports
export type ContractRow = typeof contracts.$inferSelect;
export type NewContractRow = typeof contracts.$inferInsert;
export type ContractVersionRow = typeof contractVersions.$inferSelect;
export type NewContractVersionRow = typeof contractVersions.$inferInsert;
export type ContractTemplateRow = typeof contractTemplates.$inferSelect;
export type NewContractTemplateRow = typeof contractTemplates.$inferInsert;
export type ContractApprovalWorkflowRow = typeof contractApprovalWorkflows.$inferSelect;
export type NewContractApprovalWorkflowRow = typeof contractApprovalWorkflows.$inferInsert;
export type ContractApprovalRow = typeof contractApprovals.$inferSelect;
export type NewContractApprovalRow = typeof contractApprovals.$inferInsert;
export type SignatureRequestRow = typeof signatureRequests.$inferSelect;
export type NewSignatureRequestRow = typeof signatureRequests.$inferInsert;
export type ContractRenewalRow = typeof contractRenewals.$inferSelect;
export type NewContractRenewalRow = typeof contractRenewals.$inferInsert;
export type ContractObligationRow = typeof contractObligations.$inferSelect;
export type NewContractObligationRow = typeof contractObligations.$inferInsert;
export type ContractEventRow = typeof contractEvents.$inferSelect;
export type NewContractEventRow = typeof contractEvents.$inferInsert;
export type ContractClauseRow = typeof contractClauses.$inferSelect;
export type NewContractClauseRow = typeof contractClauses.$inferInsert;

// ============================================================================
// ADVANCED PERMISSIONS (RBAC + ABAC + Field/Record Level Security)
// ============================================================================

/**
 * Permission Roles
 */
export const permissionRoles = pgTable(
  'permission_roles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 100 }).notNull(),
    description: text('description'),

    level: integer('level').notNull().default(0), // 0 = admin, higher = lower privilege
    parentRoleId: uuid('parent_role_id'),

    isSystemRole: boolean('is_system_role').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('permission_roles_tenant_id_idx').on(table.tenantId),
    nameIdx: index('permission_roles_name_idx').on(table.name),
    levelIdx: index('permission_roles_level_idx').on(table.level),
    parentRoleIdIdx: index('permission_roles_parent_role_id_idx').on(table.parentRoleId),
    tenantNameUnique: uniqueIndex('permission_roles_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Resource Permissions - Actions allowed on resource types
 */
export const resourcePermissions = pgTable(
  'resource_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    roleId: uuid('role_id').notNull().references(() => permissionRoles.id, { onDelete: 'cascade' }),
    resourceType: varchar('resource_type', { length: 50 }).notNull(), // lead, contact, opportunity, etc.

    // CRUD permissions
    canCreate: boolean('can_create').notNull().default(false),
    canRead: boolean('can_read').notNull().default(false),
    canUpdate: boolean('can_update').notNull().default(false),
    canDelete: boolean('can_delete').notNull().default(false),

    // Extended permissions
    canExport: boolean('can_export').notNull().default(false),
    canImport: boolean('can_import').notNull().default(false),
    canShare: boolean('can_share').notNull().default(false),
    canAssign: boolean('can_assign').notNull().default(false),
    canApprove: boolean('can_approve').notNull().default(false),
    canBulkEdit: boolean('can_bulk_edit').notNull().default(false),
    canBulkDelete: boolean('can_bulk_delete').notNull().default(false),

    // Record scope
    readScope: varchar('read_scope', { length: 30 }).notNull().default('private'), // private, team, territory, hierarchy, department, organization
    updateScope: varchar('update_scope', { length: 30 }).notNull().default('private'),
    deleteScope: varchar('delete_scope', { length: 30 }).notNull().default('private'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('resource_permissions_tenant_id_idx').on(table.tenantId),
    roleIdIdx: index('resource_permissions_role_id_idx').on(table.roleId),
    resourceTypeIdx: index('resource_permissions_resource_type_idx').on(table.resourceType),
    roleResourceUnique: uniqueIndex('resource_permissions_role_resource_idx').on(table.roleId, table.resourceType),
  })
);

/**
 * Field Permissions - Field-level access control
 */
export const fieldPermissions = pgTable(
  'field_permissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    roleId: uuid('role_id').notNull().references(() => permissionRoles.id, { onDelete: 'cascade' }),
    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    fieldName: varchar('field_name', { length: 100 }).notNull(),

    accessLevel: varchar('access_level', { length: 20 }).notNull().default('read'), // none, read, write, masked

    // Masking configuration
    maskPattern: varchar('mask_pattern', { length: 255 }),
    maskCharacter: varchar('mask_character', { length: 5 }).default('*'),

    // Conditional access (ABAC)
    conditions: jsonb('conditions').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('field_permissions_tenant_id_idx').on(table.tenantId),
    roleIdIdx: index('field_permissions_role_id_idx').on(table.roleId),
    resourceTypeIdx: index('field_permissions_resource_type_idx').on(table.resourceType),
    roleResourceFieldUnique: uniqueIndex('field_permissions_role_resource_field_idx').on(table.roleId, table.resourceType, table.fieldName),
  })
);

/**
 * Permission Policies (ABAC)
 */
export const permissionPolicies = pgTable(
  'permission_policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    action: varchar('action', { length: 50 }).notNull(), // create, read, update, delete, etc.

    conditions: jsonb('conditions').notNull().default([]),

    effect: varchar('effect', { length: 10 }).notNull().default('allow'), // allow, deny

    priority: integer('priority').notNull().default(0), // Higher = evaluated first

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('permission_policies_tenant_id_idx').on(table.tenantId),
    resourceTypeIdx: index('permission_policies_resource_type_idx').on(table.resourceType),
    actionIdx: index('permission_policies_action_idx').on(table.action),
    isActiveIdx: index('permission_policies_is_active_idx').on(table.isActive),
    priorityIdx: index('permission_policies_priority_idx').on(table.priority),
  })
);

/**
 * Sharing Rules - Automatic record sharing
 */
export const sharingRules = pgTable(
  'sharing_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    resourceType: varchar('resource_type', { length: 50 }).notNull(),

    criteria: jsonb('criteria').notNull().default([]),

    sharedWith: jsonb('shared_with').notNull(), // { type, targetId, dynamicField }

    accessLevel: varchar('access_level', { length: 20 }).notNull().default('read'), // read, read_write

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('sharing_rules_tenant_id_idx').on(table.tenantId),
    resourceTypeIdx: index('sharing_rules_resource_type_idx').on(table.resourceType),
    isActiveIdx: index('sharing_rules_is_active_idx').on(table.isActive),
  })
);

/**
 * Record Shares - Individual record sharing
 */
export const recordShares = pgTable(
  'record_shares',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    recordId: uuid('record_id').notNull(),

    sharedWith: jsonb('shared_with').notNull(), // { type, targetId, dynamicField }

    accessLevel: varchar('access_level', { length: 20 }).notNull().default('read'), // read, read_write

    shareSource: varchar('share_source', { length: 20 }).notNull().default('manual'), // manual, rule, team, hierarchy
    sharingRuleId: uuid('sharing_rule_id'),

    expiresAt: timestamp('expires_at', { withTimezone: true }),

    sharedBy: uuid('shared_by').notNull(),
    sharedAt: timestamp('shared_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('record_shares_tenant_id_idx').on(table.tenantId),
    resourceTypeIdx: index('record_shares_resource_type_idx').on(table.resourceType),
    recordIdIdx: index('record_shares_record_id_idx').on(table.recordId),
    resourceRecordIdx: index('record_shares_resource_record_idx').on(table.resourceType, table.recordId),
    expiresAtIdx: index('record_shares_expires_at_idx').on(table.expiresAt),
  })
);

/**
 * Data Masking Rules
 */
export const dataMaskingRules = pgTable(
  'data_masking_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),

    resourceType: varchar('resource_type', { length: 50 }).notNull(),
    fieldName: varchar('field_name', { length: 100 }).notNull(),

    maskingType: varchar('masking_type', { length: 30 }).notNull(), // full, partial, email, phone, credit_card, ssn, custom

    config: jsonb('config').notNull().default({}),

    applyTo: jsonb('apply_to').notNull().default({ allUsers: true }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('data_masking_rules_tenant_id_idx').on(table.tenantId),
    resourceTypeIdx: index('data_masking_rules_resource_type_idx').on(table.resourceType),
    fieldNameIdx: index('data_masking_rules_field_name_idx').on(table.fieldName),
    isActiveIdx: index('data_masking_rules_is_active_idx').on(table.isActive),
  })
);

/**
 * Permission Sets
 */
export const permissionSets = pgTable(
  'permission_sets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    resourcePermissionIds: jsonb('resource_permission_ids').notNull().default([]),
    fieldPermissionIds: jsonb('field_permission_ids').notNull().default([]),

    licenseType: varchar('license_type', { length: 50 }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('permission_sets_tenant_id_idx').on(table.tenantId),
    nameIdx: index('permission_sets_name_idx').on(table.name),
    isActiveIdx: index('permission_sets_is_active_idx').on(table.isActive),
    tenantNameUnique: uniqueIndex('permission_sets_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * User Permission Assignments
 */
export const userPermissionAssignments = pgTable(
  'user_permission_assignments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    userId: uuid('user_id').notNull(),

    roleId: uuid('role_id').notNull().references(() => permissionRoles.id),

    permissionSetIds: jsonb('permission_set_ids').notNull().default([]),

    customPermissions: jsonb('custom_permissions').notNull().default([]),

    effectiveFrom: timestamp('effective_from', { withTimezone: true }),
    effectiveUntil: timestamp('effective_until', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    assignedBy: uuid('assigned_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('user_permission_assignments_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('user_permission_assignments_user_id_idx').on(table.userId),
    roleIdIdx: index('user_permission_assignments_role_id_idx').on(table.roleId),
    tenantUserUnique: uniqueIndex('user_permission_assignments_tenant_user_idx').on(table.tenantId, table.userId),
  })
);

/**
 * Permission Audit Log
 */
export const permissionAuditLogs = pgTable(
  'permission_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    action: varchar('action', { length: 50 }).notNull(), // role_assigned, permission_granted, access_denied, etc.

    userId: uuid('user_id').notNull(),

    targetUserId: uuid('target_user_id'),
    targetRoleId: uuid('target_role_id'),

    resourceType: varchar('resource_type', { length: 50 }),
    recordId: uuid('record_id'),

    details: jsonb('details').notNull().default({}),

    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),

    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('permission_audit_logs_tenant_id_idx').on(table.tenantId),
    userIdIdx: index('permission_audit_logs_user_id_idx').on(table.userId),
    actionIdx: index('permission_audit_logs_action_idx').on(table.action),
    resourceTypeIdx: index('permission_audit_logs_resource_type_idx').on(table.resourceType),
    occurredAtIdx: index('permission_audit_logs_occurred_at_idx').on(table.occurredAt),
  })
);

/**
 * Hierarchy Configuration
 */
export const hierarchyConfigs = pgTable(
  'hierarchy_configs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    managerField: varchar('manager_field', { length: 50 }).notNull().default('managerId'),
    maxDepth: integer('max_depth').notNull().default(5),
    sharingDirection: varchar('sharing_direction', { length: 10 }).notNull().default('up'), // up, down, both
    sharingAccessLevel: varchar('sharing_access_level', { length: 20 }).notNull().default('read'), // read, read_write

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdUnique: uniqueIndex('hierarchy_configs_tenant_id_idx').on(table.tenantId),
  })
);

// Advanced Permissions type exports
export type PermissionRoleRow = typeof permissionRoles.$inferSelect;
export type NewPermissionRoleRow = typeof permissionRoles.$inferInsert;
export type ResourcePermissionRow = typeof resourcePermissions.$inferSelect;
export type NewResourcePermissionRow = typeof resourcePermissions.$inferInsert;
export type FieldPermissionRow = typeof fieldPermissions.$inferSelect;
export type NewFieldPermissionRow = typeof fieldPermissions.$inferInsert;
export type PermissionPolicyRow = typeof permissionPolicies.$inferSelect;
export type NewPermissionPolicyRow = typeof permissionPolicies.$inferInsert;
export type SharingRuleRow = typeof sharingRules.$inferSelect;
export type NewSharingRuleRow = typeof sharingRules.$inferInsert;
export type RecordShareRow = typeof recordShares.$inferSelect;
export type NewRecordShareRow = typeof recordShares.$inferInsert;
export type DataMaskingRuleRow = typeof dataMaskingRules.$inferSelect;
export type NewDataMaskingRuleRow = typeof dataMaskingRules.$inferInsert;
export type PermissionSetRow = typeof permissionSets.$inferSelect;
export type NewPermissionSetRow = typeof permissionSets.$inferInsert;
export type UserPermissionAssignmentRow = typeof userPermissionAssignments.$inferSelect;
export type NewUserPermissionAssignmentRow = typeof userPermissionAssignments.$inferInsert;
export type PermissionAuditLogRow = typeof permissionAuditLogs.$inferSelect;
export type NewPermissionAuditLogRow = typeof permissionAuditLogs.$inferInsert;
export type HierarchyConfigRow = typeof hierarchyConfigs.$inferSelect;
export type NewHierarchyConfigRow = typeof hierarchyConfigs.$inferInsert;

// ============================================================================
// PRODUCT CATALOG MANAGEMENT TABLES
// ============================================================================

/**
 * Product Categories - Hierarchical product organization
 */
export const productCategories = pgTable(
  'product_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),

    parentId: uuid('parent_id'),

    // Hierarchy
    level: integer('level').notNull().default(0),
    path: varchar('path', { length: 1000 }).notNull().default('/'),

    // Display
    displayOrder: integer('display_order').notNull().default(0),
    imageUrl: varchar('image_url', { length: 500 }),
    isVisible: boolean('is_visible').notNull().default(true),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('product_categories_tenant_id_idx').on(table.tenantId),
    parentIdIdx: index('product_categories_parent_id_idx').on(table.parentId),
    slugIdx: index('product_categories_slug_idx').on(table.slug),
    pathIdx: index('product_categories_path_idx').on(table.path),
    isVisibleIdx: index('product_categories_is_visible_idx').on(table.isVisible),
    tenantSlugUnique: uniqueIndex('product_categories_tenant_slug_idx').on(table.tenantId, table.slug),
  })
);

/**
 * Products - Main product catalog
 */
export const products = pgTable(
  'products',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Identification
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull(),
    description: text('description'),
    shortDescription: varchar('short_description', { length: 500 }),

    // Classification
    type: varchar('type', { length: 20 }).notNull().default('physical'),
    // 'physical', 'digital', 'service', 'subscription', 'bundle', 'kit'
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'active', 'inactive', 'discontinued', 'archived'
    categoryId: uuid('category_id').references(() => productCategories.id),
    categoryPath: varchar('category_path', { length: 1000 }),
    tags: jsonb('tags').notNull().default([]),

    // Pricing
    basePrice: integer('base_price').notNull().default(0), // In cents
    currency: varchar('currency', { length: 3 }).notNull().default('USD'),
    costPrice: integer('cost_price'),
    msrp: integer('msrp'),

    // Subscription specific
    billingFrequency: varchar('billing_frequency', { length: 20 }),
    // 'one_time', 'daily', 'weekly', 'monthly', 'quarterly', 'semi_annually', 'annually', 'custom'
    billingCycleCount: integer('billing_cycle_count'),
    trialDays: integer('trial_days'),
    setupFee: integer('setup_fee'),

    // Units
    unitOfMeasure: varchar('unit_of_measure', { length: 50 }).notNull().default('each'),
    minimumQuantity: integer('minimum_quantity'),
    maximumQuantity: integer('maximum_quantity'),
    quantityIncrement: integer('quantity_increment'),

    // Tax
    taxable: boolean('taxable').notNull().default(true),
    taxCode: varchar('tax_code', { length: 50 }),
    taxRate: real('tax_rate'),

    // Inventory
    trackInventory: boolean('track_inventory').notNull().default(false),
    stockQuantity: integer('stock_quantity'),
    lowStockThreshold: integer('low_stock_threshold'),
    allowBackorder: boolean('allow_backorder').notNull().default(false),

    // Physical product attributes
    weight: real('weight'),
    weightUnit: varchar('weight_unit', { length: 10 }),
    dimensions: jsonb('dimensions'), // { length, width, height, unit }

    // Digital/Service attributes
    deliveryMethod: varchar('delivery_method', { length: 50 }),
    downloadUrl: varchar('download_url', { length: 500 }),
    licenseType: varchar('license_type', { length: 50 }),

    // Media
    imageUrl: varchar('image_url', { length: 500 }),
    images: jsonb('images').notNull().default([]),
    documents: jsonb('documents').notNull().default([]),

    // Features and specifications
    features: jsonb('features').notNull().default([]),
    specifications: jsonb('specifications').notNull().default({}),

    // Variants
    hasVariants: boolean('has_variants').notNull().default(false),
    variantAttributes: jsonb('variant_attributes').default([]),

    // Related products
    relatedProducts: jsonb('related_products').notNull().default([]),

    // Custom fields
    customFields: jsonb('custom_fields').notNull().default({}),

    // SEO
    metaTitle: varchar('meta_title', { length: 255 }),
    metaDescription: varchar('meta_description', { length: 500 }),

    // Flags
    isFeatured: boolean('is_featured').notNull().default(false),
    isNew: boolean('is_new').notNull().default(false),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('products_tenant_id_idx').on(table.tenantId),
    skuIdx: index('products_sku_idx').on(table.sku),
    slugIdx: index('products_slug_idx').on(table.slug),
    typeIdx: index('products_type_idx').on(table.type),
    statusIdx: index('products_status_idx').on(table.status),
    categoryIdIdx: index('products_category_id_idx').on(table.categoryId),
    isFeaturedIdx: index('products_is_featured_idx').on(table.isFeatured),
    isNewIdx: index('products_is_new_idx').on(table.isNew),
    tenantSkuUnique: uniqueIndex('products_tenant_sku_idx').on(table.tenantId, table.sku),
    tenantSlugUnique: uniqueIndex('products_tenant_slug_idx').on(table.tenantId, table.slug),
  })
);

/**
 * Product Variants - Size, color, etc. variations
 */
export const productVariants = pgTable(
  'product_variants',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),

    // Variant attributes
    attributes: jsonb('attributes').notNull().default({}), // { size: 'L', color: 'Blue' }

    // Pricing override
    price: integer('price'),
    costPrice: integer('cost_price'),

    // Inventory
    stockQuantity: integer('stock_quantity'),
    lowStockThreshold: integer('low_stock_threshold'),

    // Physical attributes
    weight: real('weight'),
    dimensions: jsonb('dimensions'),

    // Media
    imageUrl: varchar('image_url', { length: 500 }),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('product_variants_product_id_idx').on(table.productId),
    tenantIdIdx: index('product_variants_tenant_id_idx').on(table.tenantId),
    skuIdx: index('product_variants_sku_idx').on(table.sku),
    isActiveIdx: index('product_variants_is_active_idx').on(table.isActive),
    tenantSkuUnique: uniqueIndex('product_variants_tenant_sku_idx').on(table.tenantId, table.sku),
  })
);

/**
 * Price Books - Different pricing for segments/channels
 */
export const priceBooks = pgTable(
  'price_books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    isStandard: boolean('is_standard').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    currency: varchar('currency', { length: 3 }).notNull().default('USD'),

    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),

    // Applicability
    applicableTo: jsonb('applicable_to').notNull().default({ allCustomers: true }),
    // { allCustomers, customerIds, customerSegments, territories, channels }

    // Adjustment
    adjustmentType: varchar('adjustment_type', { length: 20 }),
    adjustmentValue: real('adjustment_value'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('price_books_tenant_id_idx').on(table.tenantId),
    isStandardIdx: index('price_books_is_standard_idx').on(table.isStandard),
    isActiveIdx: index('price_books_is_active_idx').on(table.isActive),
    validFromIdx: index('price_books_valid_from_idx').on(table.validFrom),
    validToIdx: index('price_books_valid_to_idx').on(table.validTo),
    tenantNameUnique: uniqueIndex('price_books_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Price Book Entries - Product pricing within price books
 */
export const priceBookEntries = pgTable(
  'price_book_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    priceBookId: uuid('price_book_id').notNull().references(() => priceBooks.id, { onDelete: 'cascade' }),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    listPrice: integer('list_price').notNull(),
    minimumPrice: integer('minimum_price'),
    maximumDiscount: real('maximum_discount'),

    calculationMethod: varchar('calculation_method', { length: 20 }).notNull().default('flat'),
    // 'flat', 'per_unit', 'tiered', 'volume', 'graduated'

    priceTiers: jsonb('price_tiers').default([]),
    // [{ minQuantity, maxQuantity, price, discountPercentage }]

    isActive: boolean('is_active').notNull().default(true),

    validFrom: timestamp('valid_from', { withTimezone: true }),
    validTo: timestamp('valid_to', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    priceBookIdIdx: index('price_book_entries_price_book_id_idx').on(table.priceBookId),
    productIdIdx: index('price_book_entries_product_id_idx').on(table.productId),
    tenantIdIdx: index('price_book_entries_tenant_id_idx').on(table.tenantId),
    isActiveIdx: index('price_book_entries_is_active_idx').on(table.isActive),
    priceBookProductUnique: uniqueIndex('price_book_entries_book_product_idx').on(table.priceBookId, table.productId),
  })
);

/**
 * Discount Rules - Promotions and discounts
 */
export const discountRules = pgTable(
  'discount_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    code: varchar('code', { length: 50 }),

    discountType: varchar('discount_type', { length: 20 }).notNull(),
    // 'percentage', 'fixed_amount', 'buy_x_get_y', 'tiered', 'bundle'
    discountValue: real('discount_value').notNull(),

    // For buy X get Y
    buyQuantity: integer('buy_quantity'),
    getQuantity: integer('get_quantity'),
    getDiscountPercentage: real('get_discount_percentage'),

    // For tiered discounts
    tiers: jsonb('tiers').default([]),
    // [{ minQuantity, maxQuantity, discountPercentage }]

    // Applicability
    applicability: jsonb('applicability').notNull().default({ allProducts: true, allCustomers: true }),

    // Limits
    maxUses: integer('max_uses'),
    usesPerCustomer: integer('uses_per_customer'),
    currentUses: integer('current_uses').notNull().default(0),
    minOrderAmount: integer('min_order_amount'),
    maxDiscountAmount: integer('max_discount_amount'),

    // Validity
    validFrom: timestamp('valid_from', { withTimezone: true }).notNull(),
    validTo: timestamp('valid_to', { withTimezone: true }),

    isActive: boolean('is_active').notNull().default(true),
    requiresCode: boolean('requires_code').notNull().default(false),
    stackable: boolean('stackable').notNull().default(false),
    priority: integer('priority').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('discount_rules_tenant_id_idx').on(table.tenantId),
    codeIdx: index('discount_rules_code_idx').on(table.code),
    discountTypeIdx: index('discount_rules_discount_type_idx').on(table.discountType),
    isActiveIdx: index('discount_rules_is_active_idx').on(table.isActive),
    validFromIdx: index('discount_rules_valid_from_idx').on(table.validFrom),
    validToIdx: index('discount_rules_valid_to_idx').on(table.validTo),
    priorityIdx: index('discount_rules_priority_idx').on(table.priority),
    tenantCodeUnique: uniqueIndex('discount_rules_tenant_code_idx').on(table.tenantId, table.code),
  })
);

/**
 * Product Bundles - Bundle configurations
 */
export const productBundles = pgTable(
  'product_bundles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    bundleType: varchar('bundle_type', { length: 20 }).notNull().default('fixed'),
    // 'fixed', 'configurable'

    items: jsonb('items').notNull().default([]),
    // [{ productId, variantId, quantity, isRequired, minQuantity, maxQuantity, priceOverride, discountPercentage, displayOrder }]

    pricingType: varchar('pricing_type', { length: 20 }).notNull().default('calculated'),
    // 'fixed', 'calculated', 'discounted'
    fixedPrice: integer('fixed_price'),
    discountPercentage: real('discount_percentage'),

    minItems: integer('min_items'),
    maxItems: integer('max_items'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('product_bundles_product_id_idx').on(table.productId),
    tenantIdIdx: index('product_bundles_tenant_id_idx').on(table.tenantId),
    bundleTypeIdx: index('product_bundles_bundle_type_idx').on(table.bundleType),
    isActiveIdx: index('product_bundles_is_active_idx').on(table.isActive),
  })
);

/**
 * Inventory Transactions - Stock movements
 */
export const inventoryTransactions = pgTable(
  'inventory_transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    variantId: uuid('variant_id').references(() => productVariants.id, { onDelete: 'cascade' }),

    type: varchar('type', { length: 20 }).notNull(),
    // 'adjustment', 'sale', 'purchase', 'return', 'transfer', 'reserve', 'release'

    quantity: integer('quantity').notNull(),
    previousQuantity: integer('previous_quantity').notNull(),
    newQuantity: integer('new_quantity').notNull(),

    referenceType: varchar('reference_type', { length: 50 }),
    referenceId: uuid('reference_id'),

    reason: varchar('reason', { length: 255 }),
    notes: text('notes'),

    locationId: uuid('location_id'),

    performedBy: uuid('performed_by').notNull(),
    performedAt: timestamp('performed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('inventory_transactions_tenant_id_idx').on(table.tenantId),
    productIdIdx: index('inventory_transactions_product_id_idx').on(table.productId),
    variantIdIdx: index('inventory_transactions_variant_id_idx').on(table.variantId),
    typeIdx: index('inventory_transactions_type_idx').on(table.type),
    referenceIdx: index('inventory_transactions_reference_idx').on(table.referenceType, table.referenceId),
    performedAtIdx: index('inventory_transactions_performed_at_idx').on(table.performedAt),
  })
);

/**
 * Product Usage - Metered billing usage tracking
 */
export const productUsage = pgTable(
  'product_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    productId: uuid('product_id').notNull().references(() => products.id),
    customerId: uuid('customer_id').notNull(),
    subscriptionId: uuid('subscription_id'),

    quantity: real('quantity').notNull(),
    unitOfMeasure: varchar('unit_of_measure', { length: 50 }).notNull(),

    usageDate: timestamp('usage_date', { withTimezone: true }).notNull(),
    billingPeriodStart: timestamp('billing_period_start', { withTimezone: true }).notNull(),
    billingPeriodEnd: timestamp('billing_period_end', { withTimezone: true }).notNull(),

    unitPrice: integer('unit_price').notNull(),
    totalAmount: integer('total_amount').notNull(),
    billed: boolean('billed').notNull().default(false),
    billedAt: timestamp('billed_at', { withTimezone: true }),
    invoiceId: uuid('invoice_id'),

    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('product_usage_tenant_id_idx').on(table.tenantId),
    productIdIdx: index('product_usage_product_id_idx').on(table.productId),
    customerIdIdx: index('product_usage_customer_id_idx').on(table.customerId),
    subscriptionIdIdx: index('product_usage_subscription_id_idx').on(table.subscriptionId),
    usageDateIdx: index('product_usage_usage_date_idx').on(table.usageDate),
    billedIdx: index('product_usage_billed_idx').on(table.billed),
    billingPeriodIdx: index('product_usage_billing_period_idx').on(table.billingPeriodStart, table.billingPeriodEnd),
  })
);

/**
 * Product Analytics - Aggregated product metrics
 */
export const productAnalytics = pgTable(
  'product_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    productId: uuid('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    period: varchar('period', { length: 20 }).notNull(),
    // 'day', 'week', 'month', 'quarter', 'year'
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Sales metrics
    quantitySold: integer('quantity_sold').notNull().default(0),
    revenue: integer('revenue').notNull().default(0),
    cost: integer('cost').notNull().default(0),
    profit: integer('profit').notNull().default(0),
    marginPercentage: real('margin_percentage').notNull().default(0),

    // Order metrics
    orderCount: integer('order_count').notNull().default(0),
    averageOrderValue: integer('average_order_value').notNull().default(0),
    averageQuantityPerOrder: real('average_quantity_per_order').notNull().default(0),

    // Performance
    conversionRate: real('conversion_rate'),
    viewCount: integer('view_count'),
    cartAdditions: integer('cart_additions'),

    // Comparison
    previousPeriodRevenue: integer('previous_period_revenue'),
    revenueGrowth: real('revenue_growth'),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    productIdIdx: index('product_analytics_product_id_idx').on(table.productId),
    tenantIdIdx: index('product_analytics_tenant_id_idx').on(table.tenantId),
    periodIdx: index('product_analytics_period_idx').on(table.period),
    periodStartIdx: index('product_analytics_period_start_idx').on(table.periodStart),
    productPeriodUnique: uniqueIndex('product_analytics_product_period_idx').on(
      table.productId,
      table.period,
      table.periodStart
    ),
  })
);

// Product Catalog type exports
export type ProductCategoryRow = typeof productCategories.$inferSelect;
export type NewProductCategoryRow = typeof productCategories.$inferInsert;
export type ProductRow = typeof products.$inferSelect;
export type NewProductRow = typeof products.$inferInsert;
export type ProductVariantRow = typeof productVariants.$inferSelect;
export type NewProductVariantRow = typeof productVariants.$inferInsert;
export type PriceBookRow = typeof priceBooks.$inferSelect;
export type NewPriceBookRow = typeof priceBooks.$inferInsert;
export type PriceBookEntryRow = typeof priceBookEntries.$inferSelect;
export type NewPriceBookEntryRow = typeof priceBookEntries.$inferInsert;
export type DiscountRuleRow = typeof discountRules.$inferSelect;
export type NewDiscountRuleRow = typeof discountRules.$inferInsert;
export type ProductBundleRow = typeof productBundles.$inferSelect;
export type NewProductBundleRow = typeof productBundles.$inferInsert;
export type InventoryTransactionRow = typeof inventoryTransactions.$inferSelect;
export type NewInventoryTransactionRow = typeof inventoryTransactions.$inferInsert;
export type ProductUsageRow = typeof productUsage.$inferSelect;
export type NewProductUsageRow = typeof productUsage.$inferInsert;
export type ProductAnalyticsRow = typeof productAnalytics.$inferSelect;
export type NewProductAnalyticsRow = typeof productAnalytics.$inferInsert;

// ============================================================================
// CAMPAIGN MANAGEMENT TABLES
// ============================================================================

/**
 * Campaigns - Marketing campaigns
 */
export const campaigns = pgTable(
  'campaigns',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 30 }).notNull().default('email'),
    // 'email', 'sms', 'social', 'ads', 'direct_mail', 'event', 'content', 'multi_channel'
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'scheduled', 'active', 'paused', 'completed', 'cancelled', 'archived'
    goalType: varchar('goal_type', { length: 20 }).notNull().default('engagement'),
    // 'awareness', 'engagement', 'leads', 'conversions', 'retention', 'reactivation'

    channels: jsonb('channels').notNull().default([]),
    primaryChannel: varchar('primary_channel', { length: 30 }),

    // Schedule
    startDate: timestamp('start_date', { withTimezone: true }),
    endDate: timestamp('end_date', { withTimezone: true }),
    timezone: varchar('timezone', { length: 50 }).notNull().default('UTC'),

    // Audience
    audienceId: uuid('audience_id'),
    audienceName: varchar('audience_name', { length: 255 }),
    estimatedReach: integer('estimated_reach'),
    actualReach: integer('actual_reach'),

    // Budget
    budgetAmount: integer('budget_amount'),
    budgetCurrency: varchar('budget_currency', { length: 3 }).notNull().default('USD'),
    budgetSpent: integer('budget_spent').notNull().default(0),

    // Goals
    goals: jsonb('goals').notNull().default([]),

    // UTM Tracking
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),

    // Email content
    subject: varchar('subject', { length: 500 }),
    previewText: varchar('preview_text', { length: 500 }),
    fromName: varchar('from_name', { length: 255 }),
    fromEmail: varchar('from_email', { length: 255 }),
    replyTo: varchar('reply_to', { length: 255 }),
    templateId: uuid('template_id'),

    // Settings
    settings: jsonb('settings').notNull().default({}),

    // Organization
    tags: jsonb('tags').notNull().default([]),
    folderId: uuid('folder_id'),

    // Owner
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }),

    // Custom fields
    customFields: jsonb('custom_fields').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('campaigns_tenant_id_idx').on(table.tenantId),
    statusIdx: index('campaigns_status_idx').on(table.status),
    typeIdx: index('campaigns_type_idx').on(table.type),
    ownerIdIdx: index('campaigns_owner_id_idx').on(table.ownerId),
    folderIdIdx: index('campaigns_folder_id_idx').on(table.folderId),
    startDateIdx: index('campaigns_start_date_idx').on(table.startDate),
    createdAtIdx: index('campaigns_created_at_idx').on(table.createdAt),
  })
);

/**
 * Campaign Audiences - Target audiences/segments
 */
export const campaignAudiences = pgTable(
  'campaign_audiences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 20 }).notNull().default('dynamic'),
    // 'static', 'dynamic'

    rules: jsonb('rules').notNull().default([]),
    ruleLogic: varchar('rule_logic', { length: 10 }).notNull().default('and'),
    // 'and', 'or'

    memberIds: jsonb('member_ids').default([]),

    memberCount: integer('member_count').notNull().default(0),
    lastCalculatedAt: timestamp('last_calculated_at', { withTimezone: true }),

    refreshInterval: integer('refresh_interval'),
    autoRefresh: boolean('auto_refresh').notNull().default(false),

    tags: jsonb('tags').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('campaign_audiences_tenant_id_idx').on(table.tenantId),
    typeIdx: index('campaign_audiences_type_idx').on(table.type),
    nameIdx: index('campaign_audiences_name_idx').on(table.name),
  })
);

/**
 * Campaign Messages - Individual messages in campaigns
 */
export const campaignMessages = pgTable(
  'campaign_messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    channel: varchar('channel', { length: 30 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),

    subject: varchar('subject', { length: 500 }),
    previewText: varchar('preview_text', { length: 500 }),
    bodyHtml: text('body_html'),
    bodyText: text('body_text'),
    bodyJson: jsonb('body_json'),
    templateId: uuid('template_id'),

    mergeFields: jsonb('merge_fields').notNull().default([]),
    dynamicContent: jsonb('dynamic_content').default([]),
    attachments: jsonb('attachments').default([]),
    images: jsonb('images').default([]),

    isVariant: boolean('is_variant').notNull().default(false),
    variantName: varchar('variant_name', { length: 100 }),
    variantWeight: real('variant_weight'),

    sendAt: timestamp('send_at', { withTimezone: true }),
    delayMinutes: integer('delay_minutes'),

    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'scheduled', 'sending', 'sent', 'failed'

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('campaign_messages_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('campaign_messages_tenant_id_idx').on(table.tenantId),
    channelIdx: index('campaign_messages_channel_idx').on(table.channel),
    statusIdx: index('campaign_messages_status_idx').on(table.status),
  })
);

/**
 * Campaign A/B Tests
 */
export const campaignAbTests = pgTable(
  'campaign_ab_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'running', 'completed', 'cancelled'

    testType: varchar('test_type', { length: 30 }).notNull(),
    // 'subject', 'content', 'from_name', 'send_time', 'full_message'

    variants: jsonb('variants').notNull().default([]),

    sampleSize: real('sample_size').notNull().default(20),
    sampleCount: integer('sample_count'),
    winnerCriteria: varchar('winner_criteria', { length: 30 }).notNull().default('open_rate'),
    // 'open_rate', 'click_rate', 'conversion_rate', 'revenue'
    testDurationHours: integer('test_duration_hours').notNull().default(4),

    winnerId: uuid('winner_id'),
    winnerDeclaredAt: timestamp('winner_declared_at', { withTimezone: true }),
    winnerDeclaredBy: varchar('winner_declared_by', { length: 20 }),
    // 'automatic', 'manual'

    results: jsonb('results'),

    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    campaignIdIdx: index('campaign_ab_tests_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('campaign_ab_tests_tenant_id_idx').on(table.tenantId),
    statusIdx: index('campaign_ab_tests_status_idx').on(table.status),
  })
);

/**
 * Campaign Sends - Individual send records
 */
export const campaignSends = pgTable(
  'campaign_sends',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    messageId: uuid('message_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    recipientId: uuid('recipient_id').notNull(),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    recipientPhone: varchar('recipient_phone', { length: 50 }),
    channel: varchar('channel', { length: 30 }).notNull(),

    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending', 'queued', 'sending', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'failed', 'unsubscribed', 'complained'

    sentAt: timestamp('sent_at', { withTimezone: true }),
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    bouncedAt: timestamp('bounced_at', { withTimezone: true }),
    failedAt: timestamp('failed_at', { withTimezone: true }),

    bounceType: varchar('bounce_type', { length: 20 }),
    // 'hard', 'soft', 'block'
    bounceReason: text('bounce_reason'),
    failureReason: text('failure_reason'),

    externalId: varchar('external_id', { length: 255 }),
    messageIdExternal: varchar('message_id_external', { length: 255 }),

    variantId: uuid('variant_id'),

    metadata: jsonb('metadata').notNull().default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('campaign_sends_campaign_id_idx').on(table.campaignId),
    messageIdIdx: index('campaign_sends_message_id_idx').on(table.messageId),
    tenantIdIdx: index('campaign_sends_tenant_id_idx').on(table.tenantId),
    recipientIdIdx: index('campaign_sends_recipient_id_idx').on(table.recipientId),
    statusIdx: index('campaign_sends_status_idx').on(table.status),
    sentAtIdx: index('campaign_sends_sent_at_idx').on(table.sentAt),
    externalIdIdx: index('campaign_sends_external_id_idx').on(table.externalId),
  })
);

/**
 * Campaign Clicks - Click tracking
 */
export const campaignClicks = pgTable(
  'campaign_clicks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sendId: uuid('send_id').notNull().references(() => campaignSends.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    url: varchar('url', { length: 2000 }).notNull(),
    linkId: varchar('link_id', { length: 100 }),
    linkName: varchar('link_name', { length: 255 }),

    clickedAt: timestamp('clicked_at', { withTimezone: true }).notNull().defaultNow(),

    deviceType: varchar('device_type', { length: 30 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    ip: varchar('ip', { length: 45 }),
    country: varchar('country', { length: 2 }),
    city: varchar('city', { length: 100 }),
  },
  (table) => ({
    sendIdIdx: index('campaign_clicks_send_id_idx').on(table.sendId),
    campaignIdIdx: index('campaign_clicks_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('campaign_clicks_tenant_id_idx').on(table.tenantId),
    clickedAtIdx: index('campaign_clicks_clicked_at_idx').on(table.clickedAt),
    urlIdx: index('campaign_clicks_url_idx').on(table.url),
  })
);

/**
 * Campaign Conversions - Conversion tracking
 */
export const campaignConversions = pgTable(
  'campaign_conversions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sendId: uuid('send_id').notNull().references(() => campaignSends.id, { onDelete: 'cascade' }),
    campaignId: uuid('campaign_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    recipientId: uuid('recipient_id').notNull(),

    conversionType: varchar('conversion_type', { length: 50 }).notNull(),
    conversionValue: integer('conversion_value'),
    currency: varchar('currency', { length: 3 }),

    attributionModel: varchar('attribution_model', { length: 20 }).notNull().default('last_touch'),
    // 'first_touch', 'last_touch', 'linear', 'time_decay'
    attributionWeight: real('attribution_weight'),

    convertedAt: timestamp('converted_at', { withTimezone: true }).notNull().defaultNow(),

    metadata: jsonb('metadata').notNull().default({}),
  },
  (table) => ({
    sendIdIdx: index('campaign_conversions_send_id_idx').on(table.sendId),
    campaignIdIdx: index('campaign_conversions_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('campaign_conversions_tenant_id_idx').on(table.tenantId),
    recipientIdIdx: index('campaign_conversions_recipient_id_idx').on(table.recipientId),
    convertedAtIdx: index('campaign_conversions_converted_at_idx').on(table.convertedAt),
  })
);

/**
 * Suppression Lists - Email/SMS suppression
 */
export const suppressionLists = pgTable(
  'suppression_lists',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 30 }).notNull().default('manual'),
    // 'manual', 'unsubscribed', 'bounced', 'complained', 'imported'

    memberCount: integer('member_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('suppression_lists_tenant_id_idx').on(table.tenantId),
    typeIdx: index('suppression_lists_type_idx').on(table.type),
  })
);

/**
 * Suppression Entries - Individual suppression records
 */
export const suppressionEntries = pgTable(
  'suppression_entries',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    listId: uuid('list_id').notNull().references(() => suppressionLists.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    email: varchar('email', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    contactId: uuid('contact_id'),

    reason: text('reason'),
    source: varchar('source', { length: 100 }),

    addedAt: timestamp('added_at', { withTimezone: true }).notNull().defaultNow(),
    addedBy: uuid('added_by').notNull(),
  },
  (table) => ({
    listIdIdx: index('suppression_entries_list_id_idx').on(table.listId),
    tenantIdIdx: index('suppression_entries_tenant_id_idx').on(table.tenantId),
    emailIdx: index('suppression_entries_email_idx').on(table.email),
    phoneIdx: index('suppression_entries_phone_idx').on(table.phone),
    tenantEmailUnique: uniqueIndex('suppression_entries_tenant_email_idx').on(table.tenantId, table.email),
  })
);

/**
 * Campaign Email Templates - Rich templates for campaigns
 */
export const campaignEmailTemplates = pgTable(
  'campaign_email_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 30 }).notNull().default('marketing'),
    // 'marketing', 'transactional', 'notification', 'system'
    category: varchar('category', { length: 100 }),

    subject: varchar('subject', { length: 500 }),
    previewText: varchar('preview_text', { length: 500 }),
    bodyHtml: text('body_html').notNull(),
    bodyText: text('body_text'),

    designJson: jsonb('design_json'),
    thumbnailUrl: varchar('thumbnail_url', { length: 500 }),

    mergeFields: jsonb('merge_fields').notNull().default([]),

    isPublic: boolean('is_public').notNull().default(false),
    isDefault: boolean('is_default').notNull().default(false),

    tags: jsonb('tags').notNull().default([]),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('campaign_email_templates_tenant_id_idx').on(table.tenantId),
    typeIdx: index('campaign_email_templates_type_idx').on(table.type),
    categoryIdx: index('campaign_email_templates_category_idx').on(table.category),
    isPublicIdx: index('campaign_email_templates_is_public_idx').on(table.isPublic),
  })
);

/**
 * Campaign Folders - Organization
 */
export const campaignFolders = pgTable(
  'campaign_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    parentId: uuid('parent_id'),
    color: varchar('color', { length: 20 }),

    campaignCount: integer('campaign_count').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('campaign_folders_tenant_id_idx').on(table.tenantId),
    parentIdIdx: index('campaign_folders_parent_id_idx').on(table.parentId),
    tenantNameUnique: uniqueIndex('campaign_folders_tenant_name_idx').on(table.tenantId, table.name),
  })
);

/**
 * Campaign Analytics - Aggregated metrics
 */
export const campaignAnalyticsTable = pgTable(
  'campaign_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    totalSent: integer('total_sent').notNull().default(0),
    totalDelivered: integer('total_delivered').notNull().default(0),
    totalBounced: integer('total_bounced').notNull().default(0),
    totalFailed: integer('total_failed').notNull().default(0),

    uniqueOpens: integer('unique_opens').notNull().default(0),
    totalOpens: integer('total_opens').notNull().default(0),
    uniqueClicks: integer('unique_clicks').notNull().default(0),
    totalClicks: integer('total_clicks').notNull().default(0),

    deliveryRate: real('delivery_rate').notNull().default(0),
    bounceRate: real('bounce_rate').notNull().default(0),
    openRate: real('open_rate').notNull().default(0),
    clickRate: real('click_rate').notNull().default(0),
    clickToOpenRate: real('click_to_open_rate').notNull().default(0),

    unsubscribes: integer('unsubscribes').notNull().default(0),
    complaints: integer('complaints').notNull().default(0),
    unsubscribeRate: real('unsubscribe_rate').notNull().default(0),
    complaintRate: real('complaint_rate').notNull().default(0),

    conversions: integer('conversions').notNull().default(0),
    conversionRate: real('conversion_rate').notNull().default(0),
    revenue: integer('revenue').notNull().default(0),
    revenuePerRecipient: real('revenue_per_recipient').notNull().default(0),

    cost: integer('cost'),
    costPerSend: real('cost_per_send'),
    costPerClick: real('cost_per_click'),
    costPerConversion: real('cost_per_conversion'),
    roi: real('roi'),

    deviceStats: jsonb('device_stats').notNull().default({}),
    topCountries: jsonb('top_countries').notNull().default([]),
    topCities: jsonb('top_cities').notNull().default([]),
    opensByHour: jsonb('opens_by_hour').notNull().default([]),
    clicksByHour: jsonb('clicks_by_hour').notNull().default([]),
    topLinks: jsonb('top_links').notNull().default([]),

    lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: uniqueIndex('campaign_analytics_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('campaign_analytics_tenant_id_idx').on(table.tenantId),
  })
);

/**
 * Automation Triggers - Campaign automation
 */
export const automationTriggers = pgTable(
  'automation_triggers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    campaignId: uuid('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    triggerType: varchar('trigger_type', { length: 30 }).notNull(),
    // 'event', 'date', 'segment_entry', 'segment_exit', 'api', 'form_submission', 'page_visit', 'email_event'
    triggerEvent: varchar('trigger_event', { length: 100 }),
    triggerConditions: jsonb('trigger_conditions').default([]),

    delayType: varchar('delay_type', { length: 20 }).default('none'),
    // 'none', 'fixed', 'until_time'
    delayMinutes: integer('delay_minutes'),
    delayUntilHour: integer('delay_until_hour'),
    delayUntilDay: integer('delay_until_day'),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    campaignIdIdx: index('automation_triggers_campaign_id_idx').on(table.campaignId),
    tenantIdIdx: index('automation_triggers_tenant_id_idx').on(table.tenantId),
    triggerTypeIdx: index('automation_triggers_trigger_type_idx').on(table.triggerType),
    isActiveIdx: index('automation_triggers_is_active_idx').on(table.isActive),
  })
);

// ===========================================
// DRIP CAMPAIGNS & EMAIL SEQUENCES
// ===========================================

/**
 * Drip Sequences - Automated email/messaging sequences
 */
export const dripSequences = pgTable(
  'drip_sequences',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),

    type: varchar('type', { length: 30 }).notNull().default('drip'),
    // 'drip', 'nurture', 'onboarding', 'reengagement', 'follow_up', 'transactional', 'event_based'
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'active', 'paused', 'completed', 'archived'

    // Enrollment settings
    enrollmentTrigger: varchar('enrollment_trigger', { length: 30 }).notNull().default('manual'),
    // 'manual', 'form_submission', 'list_membership', 'tag_added', 'lead_created', 'deal_stage', 'page_view', 'event', 'api', 'import', 'workflow'
    enrollmentConditions: jsonb('enrollment_conditions').default([]),
    allowReenrollment: boolean('allow_reenrollment').notNull().default(false),
    reenrollmentCooldownDays: integer('reenrollment_cooldown_days'),

    // Exit conditions
    exitConditions: jsonb('exit_conditions').default([]),
    goalConditions: jsonb('goal_conditions').default([]),

    // Settings
    settings: jsonb('settings').notNull().default({}),

    // Metrics
    totalEnrolled: integer('total_enrolled').notNull().default(0),
    activeEnrollments: integer('active_enrollments').notNull().default(0),
    completedCount: integer('completed_count').notNull().default(0),
    conversionCount: integer('conversion_count').notNull().default(0),
    conversionRate: real('conversion_rate'),

    // Organization
    tags: jsonb('tags').notNull().default([]),
    folderId: uuid('folder_id'),

    // Owner
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    archivedAt: timestamp('archived_at', { withTimezone: true }),
  },
  (table) => ({
    tenantIdIdx: index('drip_sequences_tenant_id_idx').on(table.tenantId),
    statusIdx: index('drip_sequences_status_idx').on(table.status),
    typeIdx: index('drip_sequences_type_idx').on(table.type),
    ownerIdIdx: index('drip_sequences_owner_id_idx').on(table.ownerId),
    enrollmentTriggerIdx: index('drip_sequences_enrollment_trigger_idx').on(table.enrollmentTrigger),
  })
);

/**
 * Drip Sequence Steps - Individual steps within a drip sequence
 */
export const dripSequenceSteps = pgTable(
  'drip_sequence_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id').notNull().references(() => dripSequences.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    order: integer('order').notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 30 }).notNull(),
    // 'email', 'sms', 'task', 'notification', 'webhook', 'delay', 'condition', 'split', 'goal', 'update_field', 'add_tag', 'remove_tag', 'add_to_list', 'remove_from_list', 'enroll_sequence', 'unenroll'

    // Content (for email/SMS)
    content: jsonb('content'),

    // Delay settings
    delay: jsonb('delay'),

    // Condition settings
    condition: jsonb('condition'),

    // A/B split settings
    abSplit: jsonb('ab_split'),

    // Action settings (for non-email steps)
    action: jsonb('action'),

    // Branch targets
    nextStepId: uuid('next_step_id'),
    trueBranchStepId: uuid('true_branch_step_id'),
    falseBranchStepId: uuid('false_branch_step_id'),

    // Status
    isActive: boolean('is_active').notNull().default(true),

    // Metrics
    sent: integer('sent').default(0),
    delivered: integer('delivered').default(0),
    opened: integer('opened').default(0),
    clicked: integer('clicked').default(0),
    replied: integer('replied').default(0),
    bounced: integer('bounced').default(0),
    unsubscribed: integer('unsubscribed').default(0),
    converted: integer('converted').default(0),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sequenceIdIdx: index('drip_sequence_steps_sequence_id_idx').on(table.sequenceId),
    tenantIdIdx: index('drip_sequence_steps_tenant_id_idx').on(table.tenantId),
    orderIdx: index('drip_sequence_steps_order_idx').on(table.sequenceId, table.order),
    typeIdx: index('drip_sequence_steps_type_idx').on(table.type),
  })
);

/**
 * Drip Sequence Enrollments - Contacts enrolled in drip sequences
 */
export const dripSequenceEnrollments = pgTable(
  'drip_sequence_enrollments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id').notNull().references(() => dripSequences.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Contact info
    contactId: uuid('contact_id').notNull(),
    contactEmail: varchar('contact_email', { length: 255 }),
    contactName: varchar('contact_name', { length: 255 }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('active'),
    // 'active', 'completed', 'paused', 'unenrolled', 'bounced', 'unsubscribed', 'goal_reached', 'failed'
    currentStepId: uuid('current_step_id'),
    currentStepOrder: integer('current_step_order'),

    // Progress
    stepsCompleted: integer('steps_completed').notNull().default(0),
    totalSteps: integer('total_steps').notNull().default(0),
    percentComplete: real('percent_complete').notNull().default(0),

    // Timing
    enrolledAt: timestamp('enrolled_at', { withTimezone: true }).notNull().defaultNow(),
    nextStepAt: timestamp('next_step_at', { withTimezone: true }),
    pausedAt: timestamp('paused_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    unenrolledAt: timestamp('unenrolled_at', { withTimezone: true }),

    // Engagement
    totalSent: integer('total_sent').notNull().default(0),
    totalOpened: integer('total_opened').notNull().default(0),
    totalClicked: integer('total_clicked').notNull().default(0),
    totalReplied: integer('total_replied').notNull().default(0),

    // Exit info
    exitReason: varchar('exit_reason', { length: 255 }),
    goalReached: boolean('goal_reached').default(false),

    // Enrollment source
    enrollmentSource: varchar('enrollment_source', { length: 30 }).notNull().default('manual'),
    enrolledBy: uuid('enrolled_by'),

    // Custom data
    enrollmentData: jsonb('enrollment_data').default({}),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sequenceIdIdx: index('drip_enrollments_sequence_id_idx').on(table.sequenceId),
    tenantIdIdx: index('drip_enrollments_tenant_id_idx').on(table.tenantId),
    contactIdIdx: index('drip_enrollments_contact_id_idx').on(table.contactId),
    statusIdx: index('drip_enrollments_status_idx').on(table.status),
    enrolledAtIdx: index('drip_enrollments_enrolled_at_idx').on(table.enrolledAt),
    nextStepAtIdx: index('drip_enrollments_next_step_at_idx').on(table.nextStepAt),
    uniqueEnrollment: uniqueIndex('drip_enrollments_unique_idx').on(table.sequenceId, table.contactId, table.status),
  })
);

/**
 * Drip Step Executions - Record of each step execution
 */
export const dripStepExecutions = pgTable(
  'drip_step_executions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    enrollmentId: uuid('enrollment_id').notNull().references(() => dripSequenceEnrollments.id, { onDelete: 'cascade' }),
    stepId: uuid('step_id').notNull().references(() => dripSequenceSteps.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Timing
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Status
    status: varchar('status', { length: 20 }).notNull().default('scheduled'),
    // 'scheduled', 'executing', 'completed', 'skipped', 'failed'

    // For email steps
    messageId: varchar('message_id', { length: 255 }),
    deliveryStatus: varchar('delivery_status', { length: 20 }),
    // 'pending', 'sent', 'delivered', 'bounced', 'failed'

    // Engagement
    openedAt: timestamp('opened_at', { withTimezone: true }),
    clickedAt: timestamp('clicked_at', { withTimezone: true }),
    clickedLinks: jsonb('clicked_links').default([]),
    repliedAt: timestamp('replied_at', { withTimezone: true }),

    // For conditional steps
    conditionResult: boolean('condition_result'),
    branchTaken: varchar('branch_taken', { length: 10 }),
    // 'true', 'false', 'default'

    // For A/B splits
    variantId: uuid('variant_id'),

    // Error handling
    errorMessage: text('error_message'),
    retryCount: integer('retry_count').default(0),
    nextRetryAt: timestamp('next_retry_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    enrollmentIdIdx: index('drip_step_executions_enrollment_id_idx').on(table.enrollmentId),
    stepIdIdx: index('drip_step_executions_step_id_idx').on(table.stepId),
    tenantIdIdx: index('drip_step_executions_tenant_id_idx').on(table.tenantId),
    scheduledAtIdx: index('drip_step_executions_scheduled_at_idx').on(table.scheduledAt),
    statusIdx: index('drip_step_executions_status_idx').on(table.status),
  })
);

/**
 * Drip Sequence Analytics - Aggregated sequence performance
 */
export const dripSequenceAnalytics = pgTable(
  'drip_sequence_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sequenceId: uuid('sequence_id').notNull().references(() => dripSequences.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    period: varchar('period', { length: 20 }).notNull(),
    // 'day', 'week', 'month', 'quarter', 'all_time'
    periodStart: timestamp('period_start', { withTimezone: true }),
    periodEnd: timestamp('period_end', { withTimezone: true }),

    // Enrollment metrics
    totalEnrollments: integer('total_enrollments').notNull().default(0),
    activeEnrollments: integer('active_enrollments').notNull().default(0),
    completedEnrollments: integer('completed_enrollments').notNull().default(0),
    unenrolledCount: integer('unenrolled_count').notNull().default(0),

    // Engagement metrics
    totalSent: integer('total_sent').notNull().default(0),
    totalDelivered: integer('total_delivered').notNull().default(0),
    totalOpened: integer('total_opened').notNull().default(0),
    totalClicked: integer('total_clicked').notNull().default(0),
    totalReplied: integer('total_replied').notNull().default(0),
    totalBounced: integer('total_bounced').notNull().default(0),
    totalUnsubscribed: integer('total_unsubscribed').notNull().default(0),

    // Rates
    deliveryRate: real('delivery_rate').notNull().default(0),
    openRate: real('open_rate').notNull().default(0),
    clickRate: real('click_rate').notNull().default(0),
    replyRate: real('reply_rate').notNull().default(0),
    bounceRate: real('bounce_rate').notNull().default(0),
    unsubscribeRate: real('unsubscribe_rate').notNull().default(0),
    completionRate: real('completion_rate').notNull().default(0),

    // Conversion
    totalConversions: integer('total_conversions').notNull().default(0),
    conversionRate: real('conversion_rate').notNull().default(0),
    conversionValue: real('conversion_value'),

    // Timing
    avgTimeToComplete: real('avg_time_to_complete'),
    avgStepsCompleted: real('avg_steps_completed'),

    // Step breakdown
    stepMetrics: jsonb('step_metrics').default([]),

    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    sequenceIdIdx: index('drip_sequence_analytics_sequence_id_idx').on(table.sequenceId),
    tenantIdIdx: index('drip_sequence_analytics_tenant_id_idx').on(table.tenantId),
    periodIdx: index('drip_sequence_analytics_period_idx').on(table.period),
    uniqueAnalytics: uniqueIndex('drip_sequence_analytics_unique_idx').on(table.sequenceId, table.period, table.periodStart),
  })
);

/**
 * Drip Sequence Folders - Organize sequences
 */
export const dripSequenceFolders = pgTable(
  'drip_sequence_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),

    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('drip_sequence_folders_tenant_id_idx').on(table.tenantId),
    parentIdIdx: index('drip_sequence_folders_parent_id_idx').on(table.parentId),
  })
);

// Drip Campaign type exports
export type DripSequenceRow = typeof dripSequences.$inferSelect;
export type NewDripSequenceRow = typeof dripSequences.$inferInsert;
export type DripSequenceStepRow = typeof dripSequenceSteps.$inferSelect;
export type NewDripSequenceStepRow = typeof dripSequenceSteps.$inferInsert;
export type DripSequenceEnrollmentRow = typeof dripSequenceEnrollments.$inferSelect;
export type NewDripSequenceEnrollmentRow = typeof dripSequenceEnrollments.$inferInsert;
export type DripStepExecutionRow = typeof dripStepExecutions.$inferSelect;
export type NewDripStepExecutionRow = typeof dripStepExecutions.$inferInsert;
export type DripSequenceAnalyticsRow = typeof dripSequenceAnalytics.$inferSelect;
export type NewDripSequenceAnalyticsRow = typeof dripSequenceAnalytics.$inferInsert;
export type DripSequenceFolderRow = typeof dripSequenceFolders.$inferSelect;
export type NewDripSequenceFolderRow = typeof dripSequenceFolders.$inferInsert;

// Campaign Management type exports
export type CampaignRow = typeof campaigns.$inferSelect;
export type NewCampaignRow = typeof campaigns.$inferInsert;
export type CampaignAudienceRow = typeof campaignAudiences.$inferSelect;
export type NewCampaignAudienceRow = typeof campaignAudiences.$inferInsert;
export type CampaignMessageRow = typeof campaignMessages.$inferSelect;
export type NewCampaignMessageRow = typeof campaignMessages.$inferInsert;
export type CampaignAbTestRow = typeof campaignAbTests.$inferSelect;
export type NewCampaignAbTestRow = typeof campaignAbTests.$inferInsert;
export type CampaignSendRow = typeof campaignSends.$inferSelect;
export type NewCampaignSendRow = typeof campaignSends.$inferInsert;
export type CampaignClickRow = typeof campaignClicks.$inferSelect;
export type NewCampaignClickRow = typeof campaignClicks.$inferInsert;
export type CampaignConversionRow = typeof campaignConversions.$inferSelect;
export type NewCampaignConversionRow = typeof campaignConversions.$inferInsert;
export type SuppressionListRow = typeof suppressionLists.$inferSelect;
export type NewSuppressionListRow = typeof suppressionLists.$inferInsert;
export type SuppressionEntryRow = typeof suppressionEntries.$inferSelect;
export type NewSuppressionEntryRow = typeof suppressionEntries.$inferInsert;
export type CampaignEmailTemplateRow = typeof campaignEmailTemplates.$inferSelect;
export type NewCampaignEmailTemplateRow = typeof campaignEmailTemplates.$inferInsert;
export type CampaignFolderRow = typeof campaignFolders.$inferSelect;
export type NewCampaignFolderRow = typeof campaignFolders.$inferInsert;
export type CampaignAnalyticsTableRow = typeof campaignAnalyticsTable.$inferSelect;
export type NewCampaignAnalyticsTableRow = typeof campaignAnalyticsTable.$inferInsert;
export type AutomationTriggerRow = typeof automationTriggers.$inferSelect;
export type NewAutomationTriggerRow = typeof automationTriggers.$inferInsert;

// ============================================================================
// Activity/Interaction Tracking Tables
// ============================================================================

/**
 * Activities - Core activity/interaction records
 */
export const activities = pgTable(
  'activities',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Entity reference
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    // 'lead', 'contact', 'customer', 'deal', 'opportunity', 'account', 'company'
    entityId: uuid('entity_id').notNull(),
    entityName: varchar('entity_name', { length: 255 }),

    // Activity details
    type: varchar('type', { length: 50 }).notNull(),
    // 'call', 'email', 'meeting', 'note', 'task', 'sms', 'chat', 'social', 'page_view', etc.
    subtype: varchar('subtype', { length: 100 }),
    subject: varchar('subject', { length: 500 }).notNull(),
    description: text('description'),
    direction: varchar('direction', { length: 20 }),
    // 'inbound', 'outbound', 'internal'
    status: varchar('status', { length: 50 }).notNull().default('completed'),
    // 'scheduled', 'in_progress', 'completed', 'cancelled', 'failed', 'missed', 'pending'
    priority: varchar('priority', { length: 20 }),
    // 'low', 'normal', 'high', 'urgent'

    // Timing
    startTime: timestamp('start_time', { withTimezone: true }),
    endTime: timestamp('end_time', { withTimezone: true }),
    durationMinutes: integer('duration_minutes'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),

    // Assignment
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }),
    assignedToId: uuid('assigned_to_id'),
    assignedToName: varchar('assigned_to_name', { length: 255 }),

    // Related entities
    relatedLeadId: uuid('related_lead_id'),
    relatedContactId: uuid('related_contact_id'),
    relatedDealId: uuid('related_deal_id'),
    relatedCampaignId: uuid('related_campaign_id'),
    relatedSequenceId: uuid('related_sequence_id'),
    relatedTaskId: uuid('related_task_id'),

    // Type-specific details (JSON)
    callDetails: jsonb('call_details'),
    emailDetails: jsonb('email_details'),
    meetingDetails: jsonb('meeting_details'),
    smsDetails: jsonb('sms_details'),
    chatDetails: jsonb('chat_details'),
    webTrackingDetails: jsonb('web_tracking_details'),
    formSubmission: jsonb('form_submission'),

    // Custom data
    customFields: jsonb('custom_fields').default({}),
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),

    // Engagement
    engagementScore: integer('engagement_score').default(0),

    // Location
    location: jsonb('location'),

    // Source tracking
    source: varchar('source', { length: 100 }),
    sourceSystem: varchar('source_system', { length: 100 }),
    externalId: varchar('external_id', { length: 255 }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tenantIdIdx: index('activities_tenant_id_idx').on(table.tenantId),
    entityIdx: index('activities_entity_idx').on(table.entityType, table.entityId),
    typeIdx: index('activities_type_idx').on(table.type),
    ownerIdIdx: index('activities_owner_id_idx').on(table.ownerId),
    assignedToIdIdx: index('activities_assigned_to_id_idx').on(table.assignedToId),
    statusIdx: index('activities_status_idx').on(table.status),
    scheduledAtIdx: index('activities_scheduled_at_idx').on(table.scheduledAt),
    createdAtIdx: index('activities_created_at_idx').on(table.createdAt),
    relatedLeadIdx: index('activities_related_lead_idx').on(table.relatedLeadId),
    relatedContactIdx: index('activities_related_contact_idx').on(table.relatedContactId),
    relatedDealIdx: index('activities_related_deal_idx').on(table.relatedDealId),
    externalIdIdx: index('activities_external_id_idx').on(table.externalId),
  })
);

/**
 * Activity Reminders - Reminder notifications for activities
 */
export const activityReminders = pgTable(
  'activity_reminders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    activityId: uuid('activity_id').notNull().references(() => activities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    tenantId: uuid('tenant_id').notNull(),

    reminderAt: timestamp('reminder_at', { withTimezone: true }).notNull(),
    message: text('message'),
    channels: jsonb('channels').notNull().default(['email']),
    // ['email', 'push', 'sms']
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending', 'sent', 'cancelled'
    sentAt: timestamp('sent_at', { withTimezone: true }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    activityIdIdx: index('activity_reminders_activity_id_idx').on(table.activityId),
    userIdIdx: index('activity_reminders_user_id_idx').on(table.userId),
    reminderAtIdx: index('activity_reminders_reminder_at_idx').on(table.reminderAt),
    statusIdx: index('activity_reminders_status_idx').on(table.status),
  })
);

/**
 * Activity Templates - Reusable activity templates
 */
export const activityTemplates = pgTable(
  'activity_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    subject: varchar('subject', { length: 500 }).notNull(),
    description: text('description'),
    defaultDuration: integer('default_duration'),
    defaultPriority: varchar('default_priority', { length: 20 }),
    defaultTags: jsonb('default_tags').default([]),
    customFields: jsonb('custom_fields').default({}),

    isActive: boolean('is_active').notNull().default(true),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('activity_templates_tenant_id_idx').on(table.tenantId),
    typeIdx: index('activity_templates_type_idx').on(table.type),
    isActiveIdx: index('activity_templates_is_active_idx').on(table.isActive),
  })
);

/**
 * Activity Analytics - Aggregated activity metrics
 */
export const activityAnalytics = pgTable(
  'activity_analytics',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Scope
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    userId: uuid('user_id'),
    teamId: uuid('team_id'),

    // Period
    period: varchar('period', { length: 20 }).notNull(),
    // 'day', 'week', 'month', 'quarter', 'year'
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),

    // Activity counts
    totalActivities: integer('total_activities').notNull().default(0),
    callCount: integer('call_count').notNull().default(0),
    emailCount: integer('email_count').notNull().default(0),
    meetingCount: integer('meeting_count').notNull().default(0),
    noteCount: integer('note_count').notNull().default(0),
    taskCount: integer('task_count').notNull().default(0),
    smsCount: integer('sms_count').notNull().default(0),
    chatCount: integer('chat_count').notNull().default(0),
    webVisitCount: integer('web_visit_count').notNull().default(0),
    formSubmissionCount: integer('form_submission_count').notNull().default(0),
    otherCount: integer('other_count').notNull().default(0),

    // Direction counts
    inboundCount: integer('inbound_count').notNull().default(0),
    outboundCount: integer('outbound_count').notNull().default(0),
    internalCount: integer('internal_count').notNull().default(0),

    // Engagement
    totalEngagementScore: integer('total_engagement_score').notNull().default(0),
    avgEngagementPerActivity: real('avg_engagement_per_activity').notNull().default(0),

    // Call metrics
    totalCallDuration: integer('total_call_duration'),
    avgCallDuration: real('avg_call_duration'),
    callConnectRate: real('call_connect_rate'),

    // Email metrics
    emailOpenRate: real('email_open_rate'),
    emailClickRate: real('email_click_rate'),
    emailReplyRate: real('email_reply_rate'),

    // Meeting metrics
    meetingAttendanceRate: real('meeting_attendance_rate'),
    avgMeetingDuration: real('avg_meeting_duration'),

    // Timing
    firstActivityAt: timestamp('first_activity_at', { withTimezone: true }),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
    avgDaysBetweenActivities: real('avg_days_between_activities'),

    calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('activity_analytics_tenant_id_idx').on(table.tenantId),
    entityIdx: index('activity_analytics_entity_idx').on(table.entityType, table.entityId),
    userIdIdx: index('activity_analytics_user_id_idx').on(table.userId),
    teamIdIdx: index('activity_analytics_team_id_idx').on(table.teamId),
    periodIdx: index('activity_analytics_period_idx').on(table.period, table.periodStart),
  })
);

/**
 * Web Tracking Sessions - Website visitor sessions
 */
export const webTrackingSessions = pgTable(
  'web_tracking_sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Visitor identification
    visitorId: varchar('visitor_id', { length: 255 }).notNull(),
    contactId: uuid('contact_id'),
    leadId: uuid('lead_id'),

    // Session info
    sessionStart: timestamp('session_start', { withTimezone: true }).notNull(),
    sessionEnd: timestamp('session_end', { withTimezone: true }),
    pageViews: integer('page_views').notNull().default(0),
    totalDuration: integer('total_duration'),
    // seconds

    // Entry info
    entryUrl: text('entry_url'),
    entryTitle: varchar('entry_title', { length: 500 }),
    referrer: text('referrer'),

    // Exit info
    exitUrl: text('exit_url'),
    exitTitle: varchar('exit_title', { length: 500 }),

    // UTM parameters
    utmSource: varchar('utm_source', { length: 255 }),
    utmMedium: varchar('utm_medium', { length: 255 }),
    utmCampaign: varchar('utm_campaign', { length: 255 }),
    utmTerm: varchar('utm_term', { length: 255 }),
    utmContent: varchar('utm_content', { length: 255 }),

    // Device info
    device: varchar('device', { length: 50 }),
    browser: varchar('browser', { length: 100 }),
    os: varchar('os', { length: 100 }),
    screenResolution: varchar('screen_resolution', { length: 20 }),

    // Location
    country: varchar('country', { length: 100 }),
    region: varchar('region', { length: 100 }),
    city: varchar('city', { length: 100 }),
    ipAddress: varchar('ip_address', { length: 45 }),

    // Engagement
    engagementScore: integer('engagement_score').default(0),
    isConverted: boolean('is_converted').default(false),
    conversionGoal: varchar('conversion_goal', { length: 255 }),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('web_tracking_sessions_tenant_id_idx').on(table.tenantId),
    visitorIdIdx: index('web_tracking_sessions_visitor_id_idx').on(table.visitorId),
    contactIdIdx: index('web_tracking_sessions_contact_id_idx').on(table.contactId),
    leadIdIdx: index('web_tracking_sessions_lead_id_idx').on(table.leadId),
    sessionStartIdx: index('web_tracking_sessions_session_start_idx').on(table.sessionStart),
    utmCampaignIdx: index('web_tracking_sessions_utm_campaign_idx').on(table.utmCampaign),
  })
);

/**
 * Web Page Views - Individual page view events
 */
export const webPageViews = pgTable(
  'web_page_views',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => webTrackingSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Page info
    pageUrl: text('page_url').notNull(),
    pageTitle: varchar('page_title', { length: 500 }),
    pagePath: varchar('page_path', { length: 2000 }),

    // Timing
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
    timeOnPage: integer('time_on_page'),
    // seconds
    scrollDepth: integer('scroll_depth'),
    // percentage

    // Referrer
    referrer: text('referrer'),
    previousPageUrl: text('previous_page_url'),

    // Engagement
    interactions: integer('interactions').default(0),
    engagementScore: integer('engagement_score').default(0),
  },
  (table) => ({
    sessionIdIdx: index('web_page_views_session_id_idx').on(table.sessionId),
    tenantIdIdx: index('web_page_views_tenant_id_idx').on(table.tenantId),
    timestampIdx: index('web_page_views_timestamp_idx').on(table.timestamp),
    pagePathIdx: index('web_page_views_page_path_idx').on(table.pagePath),
  })
);

/**
 * Web Events - Custom events and interactions
 */
export const webEvents = pgTable(
  'web_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sessionId: uuid('session_id').notNull().references(() => webTrackingSessions.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    // Event info
    eventName: varchar('event_name', { length: 255 }).notNull(),
    eventCategory: varchar('event_category', { length: 100 }),
    eventLabel: varchar('event_label', { length: 255 }),
    eventValue: real('event_value'),

    // Context
    pageUrl: text('page_url'),
    pageTitle: varchar('page_title', { length: 500 }),
    elementId: varchar('element_id', { length: 255 }),
    elementClass: varchar('element_class', { length: 255 }),

    // Properties
    properties: jsonb('properties').default({}),

    timestamp: timestamp('timestamp', { withTimezone: true }).notNull(),
  },
  (table) => ({
    sessionIdIdx: index('web_events_session_id_idx').on(table.sessionId),
    tenantIdIdx: index('web_events_tenant_id_idx').on(table.tenantId),
    eventNameIdx: index('web_events_event_name_idx').on(table.eventName),
    timestampIdx: index('web_events_timestamp_idx').on(table.timestamp),
  })
);

// Activity Tracking type exports
export type ActivityRow = typeof activities.$inferSelect;
export type NewActivityRow = typeof activities.$inferInsert;
export type ActivityReminderRow = typeof activityReminders.$inferSelect;
export type NewActivityReminderRow = typeof activityReminders.$inferInsert;
export type ActivityTemplateRow = typeof activityTemplates.$inferSelect;
export type NewActivityTemplateRow = typeof activityTemplates.$inferInsert;
export type ActivityAnalyticsRow = typeof activityAnalytics.$inferSelect;
export type NewActivityAnalyticsRow = typeof activityAnalytics.$inferInsert;
export type WebTrackingSessionRow = typeof webTrackingSessions.$inferSelect;
export type NewWebTrackingSessionRow = typeof webTrackingSessions.$inferInsert;
export type WebPageViewRow = typeof webPageViews.$inferSelect;
export type NewWebPageViewRow = typeof webPageViews.$inferInsert;
export type WebEventRow = typeof webEvents.$inferSelect;
export type NewWebEventRow = typeof webEvents.$inferInsert;

// ============================================================================
// Document Management & Templates Tables
// ============================================================================

/**
 * Document Templates - Reusable document templates
 */
export const documentTemplates = pgTable(
  'document_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    // 'proposal', 'contract', 'quote', 'invoice', 'agreement', etc.
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    // 'draft', 'active', 'archived'

    // Template content
    format: varchar('format', { length: 20 }).notNull().default('html'),
    // 'html', 'markdown', 'pdf', 'docx'
    content: text('content').notNull(),
    headerContent: text('header_content'),
    footerContent: text('footer_content'),
    cssStyles: text('css_styles'),

    // Layout settings
    pageSize: varchar('page_size', { length: 20 }).default('letter'),
    orientation: varchar('orientation', { length: 20 }).default('portrait'),
    margins: jsonb('margins'),

    // Merge fields
    mergeFields: jsonb('merge_fields').default([]),
    conditionalSections: jsonb('conditional_sections').default([]),

    // Cover page
    hasCoverPage: boolean('has_cover_page').default(false),
    coverPageContent: text('cover_page_content'),

    // Signature settings
    requiresSignature: boolean('requires_signature').default(false),
    signatureFields: jsonb('signature_fields').default([]),

    // Branding
    logoUrl: text('logo_url'),
    brandColor: varchar('brand_color', { length: 20 }),
    fontFamily: varchar('font_family', { length: 100 }),

    // Approval settings
    requiresApproval: boolean('requires_approval').default(false),
    approverIds: jsonb('approver_ids').default([]),

    // Version
    version: integer('version').notNull().default(1),
    parentTemplateId: uuid('parent_template_id'),

    // Organization
    folderId: uuid('folder_id'),
    tags: jsonb('tags').default([]),

    // Usage stats
    usageCount: integer('usage_count').notNull().default(0),
    lastUsedAt: timestamp('last_used_at', { withTimezone: true }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tenantIdIdx: index('document_templates_tenant_id_idx').on(table.tenantId),
    typeIdx: index('document_templates_type_idx').on(table.type),
    statusIdx: index('document_templates_status_idx').on(table.status),
    folderIdIdx: index('document_templates_folder_id_idx').on(table.folderId),
    createdByIdx: index('document_templates_created_by_idx').on(table.createdBy),
  })
);

/**
 * Documents - Generated documents
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Template reference
    templateId: uuid('template_id').references(() => documentTemplates.id),
    templateName: varchar('template_name', { length: 255 }),
    templateVersion: integer('template_version'),

    // Document info
    name: varchar('name', { length: 500 }).notNull(),
    description: text('description'),
    type: varchar('type', { length: 50 }).notNull(),
    status: varchar('status', { length: 50 }).notNull().default('draft'),
    // 'draft', 'pending_approval', 'approved', 'sent', 'viewed', 'signed', 'completed', 'rejected', 'expired', 'voided', 'archived'

    // Content
    format: varchar('format', { length: 20 }).notNull().default('html'),
    content: text('content'),
    pdfUrl: text('pdf_url'),
    storageKey: varchar('storage_key', { length: 500 }),

    // Entity associations
    entityType: varchar('entity_type', { length: 50 }),
    entityId: uuid('entity_id'),
    entityName: varchar('entity_name', { length: 255 }),

    // Related entities
    dealId: uuid('deal_id'),
    quoteId: uuid('quote_id'),
    contactId: uuid('contact_id'),
    customerId: uuid('customer_id'),

    // Recipient
    recipientEmail: varchar('recipient_email', { length: 255 }),
    recipientName: varchar('recipient_name', { length: 255 }),

    // Value
    amount: real('amount'),
    currency: varchar('currency', { length: 10 }),

    // Expiration
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    validUntil: timestamp('valid_until', { withTimezone: true }),

    // Approval
    approvalStatus: varchar('approval_status', { length: 20 }),
    approvedBy: uuid('approved_by'),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    rejectionReason: text('rejection_reason'),

    // Signature
    signatureStatus: varchar('signature_status', { length: 20 }).notNull().default('not_required'),
    signatureProvider: varchar('signature_provider', { length: 50 }),
    signatureDocumentId: varchar('signature_document_id', { length: 255 }),

    // Tracking
    sentAt: timestamp('sent_at', { withTimezone: true }),
    viewedAt: timestamp('viewed_at', { withTimezone: true }),
    viewCount: integer('view_count').notNull().default(0),
    lastViewedAt: timestamp('last_viewed_at', { withTimezone: true }),
    downloadCount: integer('download_count').notNull().default(0),
    lastDownloadedAt: timestamp('last_downloaded_at', { withTimezone: true }),

    // Version
    version: integer('version').notNull().default(1),
    previousVersionId: uuid('previous_version_id'),

    // Custom data
    mergeData: jsonb('merge_data').default({}),
    metadata: jsonb('metadata').default({}),
    tags: jsonb('tags').default([]),

    // Owner
    ownerId: uuid('owner_id').notNull(),
    ownerName: varchar('owner_name', { length: 255 }),

    // Audit
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
    updatedBy: uuid('updated_by'),
  },
  (table) => ({
    tenantIdIdx: index('documents_tenant_id_idx').on(table.tenantId),
    templateIdIdx: index('documents_template_id_idx').on(table.templateId),
    typeIdx: index('documents_type_idx').on(table.type),
    statusIdx: index('documents_status_idx').on(table.status),
    entityIdx: index('documents_entity_idx').on(table.entityType, table.entityId),
    dealIdIdx: index('documents_deal_id_idx').on(table.dealId),
    contactIdIdx: index('documents_contact_id_idx').on(table.contactId),
    customerIdIdx: index('documents_customer_id_idx').on(table.customerId),
    ownerIdIdx: index('documents_owner_id_idx').on(table.ownerId),
    signatureStatusIdx: index('documents_signature_status_idx').on(table.signatureStatus),
    expiresAtIdx: index('documents_expires_at_idx').on(table.expiresAt),
    createdAtIdx: index('documents_created_at_idx').on(table.createdAt),
  })
);

/**
 * Document Signatures - Signature records
 */
export const documentSignatures = pgTable(
  'document_signatures',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    signerId: uuid('signer_id'),
    signerEmail: varchar('signer_email', { length: 255 }).notNull(),
    signerName: varchar('signer_name', { length: 255 }),
    signerType: varchar('signer_type', { length: 20 }).notNull(),
    // 'sender', 'recipient', 'witness'
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    // 'pending', 'signed', 'declined', 'expired'
    signedAt: timestamp('signed_at', { withTimezone: true }),
    ipAddress: varchar('ip_address', { length: 45 }),
    signatureImageUrl: text('signature_image_url'),
    declineReason: text('decline_reason'),
    order: integer('order').notNull().default(1),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('document_signatures_document_id_idx').on(table.documentId),
    tenantIdIdx: index('document_signatures_tenant_id_idx').on(table.tenantId),
    signerEmailIdx: index('document_signatures_signer_email_idx').on(table.signerEmail),
    statusIdx: index('document_signatures_status_idx').on(table.status),
  })
);

/**
 * Document Activity - Document activity log
 */
export const documentActivity = pgTable(
  'document_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    documentId: uuid('document_id').notNull().references(() => documents.id, { onDelete: 'cascade' }),
    tenantId: uuid('tenant_id').notNull(),

    type: varchar('type', { length: 50 }).notNull(),
    // 'created', 'updated', 'sent', 'viewed', 'downloaded', 'signed', 'declined', etc.
    description: text('description').notNull(),
    actorId: uuid('actor_id'),
    actorName: varchar('actor_name', { length: 255 }),
    actorEmail: varchar('actor_email', { length: 255 }),
    recipientEmail: varchar('recipient_email', { length: 255 }),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: text('user_agent'),
    metadata: jsonb('metadata').default({}),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    documentIdIdx: index('document_activity_document_id_idx').on(table.documentId),
    tenantIdIdx: index('document_activity_tenant_id_idx').on(table.tenantId),
    typeIdx: index('document_activity_type_idx').on(table.type),
    createdAtIdx: index('document_activity_created_at_idx').on(table.createdAt),
  })
);

/**
 * Document Folders - Organize documents and templates
 */
export const documentFolders = pgTable(
  'document_folders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
    displayOrder: integer('display_order').notNull().default(0),

    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    createdBy: uuid('created_by').notNull(),
  },
  (table) => ({
    tenantIdIdx: index('document_folders_tenant_id_idx').on(table.tenantId),
    parentIdIdx: index('document_folders_parent_id_idx').on(table.parentId),
  })
);

// Document Management type exports
export type DocumentTemplateRow = typeof documentTemplates.$inferSelect;
export type NewDocumentTemplateRow = typeof documentTemplates.$inferInsert;
export type DocumentRow = typeof documents.$inferSelect;
export type NewDocumentRow = typeof documents.$inferInsert;
export type DocumentSignatureRow = typeof documentSignatures.$inferSelect;
export type NewDocumentSignatureRow = typeof documentSignatures.$inferInsert;
export type DocumentActivityRow = typeof documentActivity.$inferSelect;
export type NewDocumentActivityRow = typeof documentActivity.$inferInsert;
export type DocumentFolderRow = typeof documentFolders.$inferSelect;
export type NewDocumentFolderRow = typeof documentFolders.$inferInsert;

// ============================================
// Customer Notes & Activity - FASE 5.2
// ============================================

/**
 * Customer Notes table - Notes attached to customers
 */
export const customerNotes = pgTable(
  'customer_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull(),

    // Note content
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customer_notes_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('customer_notes_customer_id_idx').on(table.customerId),
    createdByIdx: index('customer_notes_created_by_idx').on(table.createdBy),
    isPinnedIdx: index('customer_notes_is_pinned_idx').on(table.isPinned),
    tenantCustomerIdx: index('customer_notes_tenant_customer_idx').on(table.tenantId, table.customerId),
    createdAtIdx: index('customer_notes_created_at_idx').on(table.createdAt),
  })
);

/**
 * Customer Activity table - Timeline of customer actions
 */
export const customerActivity = pgTable(
  'customer_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    customerId: uuid('customer_id').notNull().references(() => customers.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),

    // Activity details
    actionType: varchar('action_type', { length: 50 }).notNull(), // created, updated, note_added, assigned, status_changed, etc.
    description: text('description'),

    // Detailed changes/metadata
    metadata: jsonb('metadata').notNull().default({}),
    changes: jsonb('changes').notNull().default({}), // Before/after values for updates

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('customer_activity_tenant_id_idx').on(table.tenantId),
    customerIdIdx: index('customer_activity_customer_id_idx').on(table.customerId),
    userIdIdx: index('customer_activity_user_id_idx').on(table.userId),
    actionTypeIdx: index('customer_activity_action_type_idx').on(table.actionType),
    createdAtIdx: index('customer_activity_created_at_idx').on(table.createdAt),
    tenantCustomerIdx: index('customer_activity_tenant_customer_idx').on(table.tenantId, table.customerId),
    tenantCreatedAtIdx: index('customer_activity_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

// Customer Notes & Activity type exports
export type CustomerNoteRow = typeof customerNotes.$inferSelect;
export type NewCustomerNoteRow = typeof customerNotes.$inferInsert;
export type CustomerActivityRow = typeof customerActivity.$inferSelect;
export type NewCustomerActivityRow = typeof customerActivity.$inferInsert;
export type CustomerRow = typeof customers.$inferSelect;
export type NewCustomerRow = typeof customers.$inferInsert;

// ============================================
// Lead Notes, Activity & Pipeline - FASE 5.3
// ============================================

/**
 * Lead Status enum values
 * Simplified 6-state pipeline: NEW → CONTACTED → QUALIFIED → PROPOSAL → WON/LOST
 */
export const LEAD_STATUS = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'] as const;
export type LeadStatus = (typeof LEAD_STATUS)[number];

/**
 * Lead Source enum values
 */
export const LEAD_SOURCE = ['referral', 'social', 'website', 'ad', 'organic', 'manual', 'other'] as const;
export type LeadSource = (typeof LEAD_SOURCE)[number];

/**
 * Pipeline Stages table - Customizable stages per tenant
 */
export const pipelineStages = pgTable(
  'pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Stage info
    label: varchar('label', { length: 100 }).notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    color: varchar('color', { length: 20 }).notNull().default('#3B82F6'),

    // Configuration
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('pipeline_stages_tenant_id_idx').on(table.tenantId),
    orderIdx: index('pipeline_stages_order_idx').on(table.order),
    tenantOrderIdx: index('pipeline_stages_tenant_order_idx').on(table.tenantId, table.order),
  })
);

/**
 * Lead Notes table - Notes attached to leads
 */
export const leadNotes = pgTable(
  'lead_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull(),

    // Note content
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lead_notes_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('lead_notes_lead_id_idx').on(table.leadId),
    createdByIdx: index('lead_notes_created_by_idx').on(table.createdBy),
    isPinnedIdx: index('lead_notes_is_pinned_idx').on(table.isPinned),
    tenantLeadIdx: index('lead_notes_tenant_lead_idx').on(table.tenantId, table.leadId),
    createdAtIdx: index('lead_notes_created_at_idx').on(table.createdAt),
  })
);

/**
 * Lead Activity table - Timeline of lead actions
 */
export const leadActivity = pgTable(
  'lead_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    leadId: uuid('lead_id').notNull().references(() => leads.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),

    // Activity details
    actionType: varchar('action_type', { length: 50 }).notNull(), // created, updated, note_added, assigned, status_changed, stage_changed, converted, etc.
    description: text('description'),

    // Detailed changes/metadata
    metadata: jsonb('metadata').notNull().default({}),
    changes: jsonb('changes').notNull().default({}), // Before/after values for updates

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('lead_activity_tenant_id_idx').on(table.tenantId),
    leadIdIdx: index('lead_activity_lead_id_idx').on(table.leadId),
    userIdIdx: index('lead_activity_user_id_idx').on(table.userId),
    actionTypeIdx: index('lead_activity_action_type_idx').on(table.actionType),
    createdAtIdx: index('lead_activity_created_at_idx').on(table.createdAt),
    tenantLeadIdx: index('lead_activity_tenant_lead_idx').on(table.tenantId, table.leadId),
    tenantCreatedAtIdx: index('lead_activity_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

// Lead Notes, Activity & Pipeline type exports
export type PipelineStageRow = typeof pipelineStages.$inferSelect;
export type NewPipelineStageRow = typeof pipelineStages.$inferInsert;
export type LeadNoteRow = typeof leadNotes.$inferSelect;
export type NewLeadNoteRow = typeof leadNotes.$inferInsert;
export type LeadActivityRow = typeof leadActivity.$inferSelect;
export type NewLeadActivityRow = typeof leadActivity.$inferInsert;
export type LeadRow = typeof leads.$inferSelect;
export type NewLeadRow = typeof leads.$inferInsert;

// ============================================
// OPPORTUNITIES MODULE - FASE 5.4
// ============================================

/**
 * Opportunity status enum values
 */
export const OPPORTUNITY_STATUS = ['open', 'won', 'lost', 'stalled'] as const;
export type OpportunityStatus = typeof OPPORTUNITY_STATUS[number];

/**
 * Opportunity Pipeline Stages table - Separate from Leads pipeline
 */
export const opportunityPipelineStages = pgTable(
  'opportunity_pipeline_stages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),

    // Stage info
    label: varchar('label', { length: 100 }).notNull(),
    description: text('description'),
    order: integer('order').notNull().default(0),
    color: varchar('color', { length: 20 }).notNull().default('#3B82F6'),

    // Pipeline behavior
    probability: integer('probability').notNull().default(50), // Default probability for this stage (0-100)
    stageType: varchar('stage_type', { length: 20 }).notNull().default('open'), // open, won, lost

    // Configuration
    isDefault: boolean('is_default').notNull().default(false),
    isActive: boolean('is_active').notNull().default(true),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('opp_pipeline_stages_tenant_id_idx').on(table.tenantId),
    orderIdx: index('opp_pipeline_stages_order_idx').on(table.order),
    tenantOrderIdx: index('opp_pipeline_stages_tenant_order_idx').on(table.tenantId, table.order),
    stageTypeIdx: index('opp_pipeline_stages_type_idx').on(table.stageType),
  })
);

/**
 * Opportunity Notes table - Notes attached to opportunities
 */
export const opportunityNotes = pgTable(
  'opportunity_notes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    createdBy: uuid('created_by').notNull(),

    // Note content
    content: text('content').notNull(),
    isPinned: boolean('is_pinned').notNull().default(false),

    // Metadata
    metadata: jsonb('metadata').notNull().default({}),

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('opp_notes_tenant_id_idx').on(table.tenantId),
    opportunityIdIdx: index('opp_notes_opportunity_id_idx').on(table.opportunityId),
    createdByIdx: index('opp_notes_created_by_idx').on(table.createdBy),
    isPinnedIdx: index('opp_notes_is_pinned_idx').on(table.isPinned),
    tenantOppIdx: index('opp_notes_tenant_opp_idx').on(table.tenantId, table.opportunityId),
    createdAtIdx: index('opp_notes_created_at_idx').on(table.createdAt),
  })
);

/**
 * Opportunity Activity table - Timeline of opportunity actions
 */
export const opportunityActivity = pgTable(
  'opportunity_activity',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    tenantId: uuid('tenant_id').notNull(),
    opportunityId: uuid('opportunity_id').notNull().references(() => opportunities.id, { onDelete: 'cascade' }),
    userId: uuid('user_id'),

    // Activity details
    actionType: varchar('action_type', { length: 50 }).notNull(), // created, updated, note_added, assigned, status_changed, stage_changed, won, lost, etc.
    description: text('description'),

    // Detailed changes/metadata
    metadata: jsonb('metadata').notNull().default({}),
    changes: jsonb('changes').notNull().default({}), // Before/after values for updates

    // Timestamps
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    tenantIdIdx: index('opp_activity_tenant_id_idx').on(table.tenantId),
    opportunityIdIdx: index('opp_activity_opportunity_id_idx').on(table.opportunityId),
    userIdIdx: index('opp_activity_user_id_idx').on(table.userId),
    actionTypeIdx: index('opp_activity_action_type_idx').on(table.actionType),
    createdAtIdx: index('opp_activity_created_at_idx').on(table.createdAt),
    tenantOppIdx: index('opp_activity_tenant_opp_idx').on(table.tenantId, table.opportunityId),
    tenantCreatedAtIdx: index('opp_activity_tenant_created_at_idx').on(table.tenantId, table.createdAt),
  })
);

// Opportunity type exports
export type OpportunityPipelineStageRow = typeof opportunityPipelineStages.$inferSelect;
export type NewOpportunityPipelineStageRow = typeof opportunityPipelineStages.$inferInsert;
export type OpportunityNoteRow = typeof opportunityNotes.$inferSelect;
export type NewOpportunityNoteRow = typeof opportunityNotes.$inferInsert;
export type OpportunityActivityRow = typeof opportunityActivity.$inferSelect;
export type NewOpportunityActivityRow = typeof opportunityActivity.$inferInsert;
export type OpportunityRow = typeof opportunities.$inferSelect;
export type NewOpportunityRow = typeof opportunities.$inferInsert;

// Note: Tasks table is already defined earlier in this file (line ~542)
