-- =============================================================================
-- Migration: Create Missing Tables
-- Description: Creates tables for tasks, opportunities, customers, webhooks,
--              and email_templates that are required by the Lead Service
-- =============================================================================

-- =============================================================================
-- 1. TASKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Related entities (polymorphic)
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID,
    opportunity_id UUID,
    entity_type VARCHAR(20), -- 'lead', 'customer', 'opportunity'

    -- Task details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'task', -- task, call, email, meeting, follow_up, demo, proposal, other
    priority VARCHAR(10) NOT NULL DEFAULT 'medium', -- low, medium, high, urgent
    status VARCHAR(15) NOT NULL DEFAULT 'pending', -- pending, in_progress, completed, cancelled, deferred

    -- Assignment
    assigned_to UUID,
    assigned_by UUID,

    -- Scheduling
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    next_task_id UUID,

    -- Outcome
    outcome TEXT,

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity_id ON tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_type ON tasks(type);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_status ON tasks(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant_assigned ON tasks(tenant_id, assigned_to);

-- =============================================================================
-- 2. OPPORTUNITIES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Related entities
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,

    -- Opportunity details
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(15) NOT NULL DEFAULT 'open', -- open, won, lost, on_hold
    stage VARCHAR(50) NOT NULL,

    -- Financial
    amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    probability INTEGER DEFAULT 0 CHECK (probability >= 0 AND probability <= 100),

    -- Assignment
    owner_id UUID,

    -- Scheduling
    expected_close_date DATE,
    actual_close_date DATE,

    -- Won/Lost info
    won_reason TEXT,
    lost_reason TEXT,
    competitor_id UUID,

    -- Source
    source VARCHAR(20), -- lead_conversion, direct, referral, upsell, cross_sell

    -- Metadata
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,
    stage_changed_at TIMESTAMPTZ
);

-- Indexes for opportunities
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline_id ON opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);
CREATE INDEX IF NOT EXISTS idx_opportunities_expected_close ON opportunities(expected_close_date);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_status ON opportunities(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_pipeline ON opportunities(tenant_id, pipeline_id);

-- =============================================================================
-- 3. CUSTOMERS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Original lead reference
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,

    -- Company/Individual information
    company_name VARCHAR(500) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),

    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100),

    -- Customer classification
    type VARCHAR(20) NOT NULL DEFAULT 'company', -- individual, company, enterprise, government, non_profit
    status VARCHAR(15) NOT NULL DEFAULT 'active', -- active, inactive, churned, suspended
    tier VARCHAR(15) DEFAULT 'standard', -- standard, premium, vip, enterprise

    -- Relationship management
    account_manager_id UUID,

    -- Revenue tracking
    total_revenue DECIMAL(15, 2) DEFAULT 0,
    lifetime_value DECIMAL(15, 2) DEFAULT 0,
    last_purchase_date DATE,

    -- Metadata
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',

    -- Timestamps
    converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for customers
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);
CREATE INDEX IF NOT EXISTS idx_customers_account_manager ON customers(account_manager_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_status ON customers(tenant_id, status);

-- =============================================================================
-- 4. WEBHOOKS TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Webhook configuration
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    secret VARCHAR(255),

    -- Events
    events TEXT[] NOT NULL DEFAULT '{}',

    -- Status
    is_active BOOLEAN DEFAULT TRUE,

    -- Headers
    headers JSONB DEFAULT '{}',

    -- Retry configuration
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,

    -- Statistics
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,

    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Indexes for webhooks
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_active ON webhooks(tenant_id, is_active);

-- Webhook deliveries log
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,

    -- Event details
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,

    -- Delivery status
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, success, failed, retrying
    attempts INTEGER DEFAULT 0,

    -- Response details
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,

    -- Error tracking
    error_message TEXT,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    delivered_at TIMESTAMPTZ,
    next_retry_at TIMESTAMPTZ
);

-- Indexes for webhook_deliveries
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_id ON webhook_deliveries(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON webhook_deliveries(created_at);

-- =============================================================================
-- 5. EMAIL_TEMPLATES TABLE
-- =============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Template details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    preheader VARCHAR(255),

    -- Content
    html_content TEXT NOT NULL,
    text_content TEXT,

    -- Structure
    blocks JSONB DEFAULT '[]',

    -- Design settings
    settings JSONB DEFAULT '{}',

    -- Categorization
    category VARCHAR(50), -- welcome, newsletter, follow_up, transactional, marketing, etc.
    tags TEXT[] DEFAULT '{}',

    -- Versioning
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,

    -- Status
    status VARCHAR(20) DEFAULT 'draft', -- draft, published, archived

    -- Thumbnail
    thumbnail_url VARCHAR(500),

    -- Statistics
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for email_templates
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);
CREATE INDEX IF NOT EXISTS idx_email_templates_is_published ON email_templates(is_published);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_category ON email_templates(tenant_id, category);

-- Email template versions for history
CREATE TABLE IF NOT EXISTS email_template_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,

    -- Content snapshot
    subject VARCHAR(500) NOT NULL,
    html_content TEXT NOT NULL,
    text_content TEXT,
    blocks JSONB,
    settings JSONB,

    -- Metadata
    change_notes TEXT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for email_template_versions
CREATE INDEX IF NOT EXISTS idx_email_template_versions_template_id ON email_template_versions(template_id);
CREATE INDEX IF NOT EXISTS idx_email_template_versions_version ON email_template_versions(template_id, version);

-- =============================================================================
-- 6. NOTES TABLE (if not exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Polymorphic relation
    entity_type VARCHAR(20) NOT NULL, -- lead, customer, opportunity, task
    entity_id UUID NOT NULL,

    -- Note content
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'general', -- general, call, meeting, email, system

    -- Mentions and attachments
    mentions UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',

    -- Pinning
    is_pinned BOOLEAN DEFAULT FALSE,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

-- Indexes for notes
CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_by ON notes(created_by);
CREATE INDEX IF NOT EXISTS idx_notes_tenant_entity ON notes(tenant_id, entity_type, entity_id);

-- =============================================================================
-- 7. CONTACTS TABLE (if not exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Related entities
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Contact information
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),

    -- Position
    company VARCHAR(255),
    position VARCHAR(100),
    department VARCHAR(100),

    -- Address
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100),

    -- Social
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),

    -- Status
    status VARCHAR(20) DEFAULT 'active', -- active, inactive, unsubscribed
    is_primary BOOLEAN DEFAULT FALSE,

    -- Communication preferences
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    preferred_contact_method VARCHAR(20), -- email, phone, mobile

    -- Metadata
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ
);

-- Indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_name ON contacts(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
CREATE INDEX IF NOT EXISTS idx_contacts_tenant_status ON contacts(tenant_id, status);

-- =============================================================================
-- 8. CALENDAR_EVENTS TABLE (if not exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Related entity
    entity_type VARCHAR(20), -- lead, customer, opportunity, task
    entity_id UUID,

    -- Event details
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'meeting', -- meeting, call, demo, follow_up, other
    location VARCHAR(500),

    -- Timing
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Participants
    organizer_id UUID,
    attendees JSONB DEFAULT '[]', -- Array of { userId, email, status, required }

    -- Recurrence
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    parent_event_id UUID,

    -- Status
    status VARCHAR(20) DEFAULT 'confirmed', -- confirmed, tentative, cancelled

    -- Meeting link
    meeting_url VARCHAR(500),
    meeting_provider VARCHAR(20), -- zoom, meet, teams

    -- Reminders
    reminders JSONB DEFAULT '[]', -- Array of { minutes_before, type }

    -- Metadata
    color VARCHAR(20),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Indexes for calendar_events
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_entity ON calendar_events(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_organizer ON calendar_events(organizer_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_time ON calendar_events(tenant_id, start_time);

-- =============================================================================
-- 9. QUOTES TABLE (if not exists)
-- =============================================================================
CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Related entities
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

    -- Quote details
    quote_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,

    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'draft', -- draft, sent, viewed, accepted, rejected, expired

    -- Dates
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,

    -- Financial
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount_type VARCHAR(10), -- percentage, fixed
    discount_value DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,

    -- Terms
    terms_and_conditions TEXT,
    notes TEXT,

    -- Contact
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    billing_address JSONB,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

-- Quote items
CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,

    -- Item details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(50),

    -- Pricing
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,

    -- Ordering
    sort_order INTEGER DEFAULT 0,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for quotes
CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_opportunity_id ON quotes(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_quote_number ON quotes(quote_number);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- =============================================================================
-- 10. Add foreign key constraints for tasks.customer_id and tasks.opportunity_id
-- =============================================================================
DO $$
BEGIN
    -- Add FK for tasks.customer_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_tasks_customer_id'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT fk_tasks_customer_id
        FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;
    END IF;

    -- Add FK for tasks.opportunity_id if not exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'fk_tasks_opportunity_id'
        AND table_name = 'tasks'
    ) THEN
        ALTER TABLE tasks
        ADD CONSTRAINT fk_tasks_opportunity_id
        FOREIGN KEY (opportunity_id) REFERENCES opportunities(id) ON DELETE SET NULL;
    END IF;
END $$;

-- =============================================================================
-- 11. Update triggers for updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to new tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['tasks', 'opportunities', 'customers', 'webhooks', 'email_templates', 'notes', 'contacts', 'calendar_events', 'quotes', 'quote_items'])
    LOOP
        EXECUTE format('
            DROP TRIGGER IF EXISTS update_%s_updated_at ON %s;
            CREATE TRIGGER update_%s_updated_at
            BEFORE UPDATE ON %s
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
        ', t, t, t, t);
    END LOOP;
END $$;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================
