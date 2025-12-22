-- =============================================================================
-- CONSOLIDATED CRM MIGRATION
-- Run this in Supabase Dashboard > SQL Editor
-- Project: zu-ventazo-csm (nquhpdbzwpkgnjndvpmw)
-- =============================================================================

-- =============================================================================
-- SECTION 1: PIPELINES (Prerequisite for opportunities)
-- =============================================================================

CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL DEFAULT '[]',
    transitions JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipelines_tenant_id_idx ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS pipelines_is_default_idx ON pipelines(is_default);
CREATE INDEX IF NOT EXISTS pipelines_is_active_idx ON pipelines(is_active);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_id_idx ON pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_id_idx ON pipeline_stages(pipeline_id);

-- =============================================================================
-- SECTION 2: LEADS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(255),
    industry VARCHAR(100),
    employee_count INTEGER,
    annual_revenue INTEGER,
    status VARCHAR(50) DEFAULT 'new' NOT NULL,
    score INTEGER DEFAULT 50 NOT NULL,
    source VARCHAR(100) NOT NULL,
    owner_id UUID,
    notes TEXT,
    custom_fields JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    last_activity_at TIMESTAMPTZ,
    next_follow_up_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS leads_tenant_id_idx ON leads(tenant_id);
CREATE INDEX IF NOT EXISTS leads_status_idx ON leads(status);
CREATE INDEX IF NOT EXISTS leads_owner_id_idx ON leads(owner_id);
CREATE INDEX IF NOT EXISTS leads_score_idx ON leads(score);
CREATE INDEX IF NOT EXISTS leads_email_idx ON leads(email);
CREATE INDEX IF NOT EXISTS leads_source_idx ON leads(source);
CREATE INDEX IF NOT EXISTS leads_next_follow_up_idx ON leads(next_follow_up_at);
CREATE INDEX IF NOT EXISTS leads_tenant_status_idx ON leads(tenant_id, status);
CREATE INDEX IF NOT EXISTS leads_tenant_owner_idx ON leads(tenant_id, owner_id);

-- =============================================================================
-- SECTION 3: CUSTOMERS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    company_name VARCHAR(500) NOT NULL,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    website VARCHAR(500),
    industry VARCHAR(100),
    employee_count INTEGER,
    annual_revenue INTEGER,
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100),
    address JSONB DEFAULT '{}',
    type VARCHAR(50) NOT NULL DEFAULT 'company',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    tier VARCHAR(50) DEFAULT 'standard',
    account_manager_id UUID,
    contract_value INTEGER DEFAULT 0,
    mrr INTEGER DEFAULT 0,
    total_revenue INTEGER DEFAULT 0,
    lifetime_value INTEGER DEFAULT 0,
    last_purchase_date TIMESTAMPTZ,
    contract_start_date DATE,
    contract_end_date DATE,
    renewal_date DATE,
    churned_at TIMESTAMPTZ,
    display_name VARCHAR(255),
    full_name VARCHAR(255),
    notes TEXT,
    custom_fields JSONB DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_lead_id ON customers(lead_id);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_type ON customers(type);
CREATE INDEX IF NOT EXISTS idx_customers_tier ON customers(tier);

-- =============================================================================
-- SECTION 4: OPPORTUNITIES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS opportunities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE SET NULL,
    contact_id UUID,
    name VARCHAR(500) NOT NULL,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'open',
    stage VARCHAR(50) NOT NULL,
    priority VARCHAR(20) NOT NULL DEFAULT 'medium',
    amount DECIMAL(15, 2),
    currency VARCHAR(3) DEFAULT 'USD',
    probability INTEGER DEFAULT 0,
    owner_id UUID,
    expected_close_date DATE,
    actual_close_date DATE,
    won_reason TEXT,
    lost_reason TEXT,
    competitor_id UUID,
    source VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_activity_at TIMESTAMPTZ,
    stage_changed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_opportunities_tenant_id ON opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_lead_id ON opportunities(lead_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_customer_id ON opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_pipeline_id ON opportunities(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_owner_id ON opportunities(owner_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_status ON opportunities(status);
CREATE INDEX IF NOT EXISTS idx_opportunities_stage ON opportunities(stage);

-- =============================================================================
-- SECTION 5: TASKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    entity_type VARCHAR(20),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'task',
    priority VARCHAR(10) NOT NULL DEFAULT 'medium',
    status VARCHAR(15) NOT NULL DEFAULT 'pending',
    assigned_to UUID,
    assigned_by UUID,
    due_date TIMESTAMPTZ,
    reminder_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    next_task_id UUID,
    outcome TEXT,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_tenant_id ON tasks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tasks_lead_id ON tasks(lead_id);
CREATE INDEX IF NOT EXISTS idx_tasks_customer_id ON tasks(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_opportunity_id ON tasks(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- =============================================================================
-- SECTION 6: CONTACTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50),
    mobile VARCHAR(50),
    company VARCHAR(255),
    position VARCHAR(100),
    department VARCHAR(100),
    address_street VARCHAR(255),
    address_city VARCHAR(100),
    address_state VARCHAR(100),
    address_postal_code VARCHAR(20),
    address_country VARCHAR(100),
    linkedin_url VARCHAR(500),
    twitter_handle VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    is_primary BOOLEAN DEFAULT FALSE,
    do_not_call BOOLEAN DEFAULT FALSE,
    do_not_email BOOLEAN DEFAULT FALSE,
    preferred_contact_method VARCHAR(20),
    notes TEXT,
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_contacts_tenant_id ON contacts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacts_lead_id ON contacts(lead_id);
CREATE INDEX IF NOT EXISTS idx_contacts_customer_id ON contacts(customer_id);
CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);

-- =============================================================================
-- SECTION 7: WEBHOOKS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(2000) NOT NULL,
    secret VARCHAR(255),
    events TEXT[] NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    headers JSONB DEFAULT '{}',
    max_retries INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    last_triggered_at TIMESTAMPTZ,
    last_success_at TIMESTAMPTZ,
    last_failure_at TIMESTAMPTZ,
    failure_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    description TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_id ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_is_active ON webhooks(is_active);

-- =============================================================================
-- SECTION 8: EMAIL TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    subject VARCHAR(500) NOT NULL,
    preheader VARCHAR(255),
    html_content TEXT NOT NULL,
    text_content TEXT,
    blocks JSONB DEFAULT '[]',
    settings JSONB DEFAULT '{}',
    category VARCHAR(50),
    tags TEXT[] DEFAULT '{}',
    version INTEGER DEFAULT 1,
    is_published BOOLEAN DEFAULT FALSE,
    published_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'draft',
    thumbnail_url VARCHAR(500),
    usage_count INTEGER DEFAULT 0,
    last_used_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_email_templates_tenant_id ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);

-- =============================================================================
-- SECTION 9: NOTES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(20) NOT NULL,
    entity_id UUID NOT NULL,
    content TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'general',
    mentions UUID[] DEFAULT '{}',
    attachments JSONB DEFAULT '[]',
    is_pinned BOOLEAN DEFAULT FALSE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID,
    updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_notes_tenant_id ON notes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notes_entity ON notes(entity_type, entity_id);

-- =============================================================================
-- SECTION 10: OUTBOX EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    event_data JSONB NOT NULL,
    tenant_id UUID NOT NULL,
    aggregate_id UUID NOT NULL,
    published TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS outbox_published_idx ON outbox_events(published);
CREATE INDEX IF NOT EXISTS outbox_tenant_id_idx ON outbox_events(tenant_id);

-- =============================================================================
-- SECTION 11: SCORING RULES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(100) NOT NULL,
    conditions JSONB NOT NULL DEFAULT '[]',
    condition_logic VARCHAR(10) NOT NULL DEFAULT 'AND',
    action VARCHAR(50) NOT NULL,
    points INTEGER NOT NULL,
    max_applications INTEGER,
    priority INTEGER NOT NULL DEFAULT 100,
    is_active BOOLEAN NOT NULL DEFAULT true,
    category VARCHAR(100),
    tags JSONB DEFAULT '[]',
    valid_from TIMESTAMPTZ,
    valid_until TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scoring_rules_tenant ON scoring_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scoring_rules_active ON scoring_rules(tenant_id, is_active);

-- =============================================================================
-- SECTION 12: SCORE HISTORY TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    applied_rules JSONB NOT NULL DEFAULT '[]',
    breakdown JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_score_history_lead ON score_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_score_history_tenant ON score_history(tenant_id);

-- =============================================================================
-- SECTION 13: EMAIL LOGS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    template VARCHAR(100),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    message_id VARCHAR(255),
    error TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status);

-- =============================================================================
-- SECTION 14: QUOTES TABLES
-- =============================================================================

CREATE TABLE IF NOT EXISTS quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    opportunity_id UUID REFERENCES opportunities(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    quote_number VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'draft',
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE NOT NULL,
    sent_at TIMESTAMPTZ,
    accepted_at TIMESTAMPTZ,
    rejected_at TIMESTAMPTZ,
    currency VARCHAR(3) DEFAULT 'USD',
    subtotal DECIMAL(15, 2) DEFAULT 0,
    discount_type VARCHAR(10),
    discount_value DECIMAL(15, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    tax_amount DECIMAL(15, 2) DEFAULT 0,
    total DECIMAL(15, 2) DEFAULT 0,
    terms_and_conditions TEXT,
    notes TEXT,
    contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
    billing_address JSONB,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

CREATE TABLE IF NOT EXISTS quote_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    sku VARCHAR(50),
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 1,
    unit_price DECIMAL(15, 2) NOT NULL,
    discount_percentage DECIMAL(5, 2) DEFAULT 0,
    tax_rate DECIMAL(5, 2) DEFAULT 0,
    total DECIMAL(15, 2) NOT NULL,
    sort_order INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotes_tenant_id ON quotes(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items(quote_id);

-- =============================================================================
-- SECTION 15: CALENDAR EVENTS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS calendar_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    entity_type VARCHAR(20),
    entity_id UUID,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    type VARCHAR(20) NOT NULL DEFAULT 'meeting',
    location VARCHAR(500),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    all_day BOOLEAN DEFAULT FALSE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    organizer_id UUID,
    attendees JSONB DEFAULT '[]',
    is_recurring BOOLEAN DEFAULT FALSE,
    recurrence_rule JSONB,
    parent_event_id UUID,
    status VARCHAR(20) DEFAULT 'confirmed',
    meeting_url VARCHAR(500),
    meeting_provider VARCHAR(20),
    reminders JSONB DEFAULT '[]',
    color VARCHAR(20),
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID
);

CREATE INDEX IF NOT EXISTS idx_calendar_events_tenant_id ON calendar_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON calendar_events(start_time);

-- =============================================================================
-- SECTION 16: CUSTOM FIELDS MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS custom_field_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  api_name VARCHAR(100) NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  description TEXT,
  field_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT FALSE,
  is_unique BOOLEAN DEFAULT FALSE,
  is_searchable BOOLEAN DEFAULT FALSE,
  is_filterable BOOLEAN DEFAULT FALSE,
  is_sortable BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  is_system BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  default_value JSONB,
  placeholder VARCHAR(255),
  help_text TEXT,
  validation_rules JSONB DEFAULT '[]',
  select_options JSONB DEFAULT '[]',
  formula_config JSONB,
  rollup_config JSONB,
  lookup_config JSONB,
  autonumber_config JSONB,
  visibility_condition JSONB,
  field_group VARCHAR(100),
  sort_order INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, api_name)
);

CREATE TABLE IF NOT EXISTS custom_field_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  field_id UUID NOT NULL REFERENCES custom_field_definitions(id) ON DELETE CASCADE,
  field_api_name VARCHAR(100) NOT NULL,
  value JSONB,
  display_value TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, entity_id, field_id)
);

CREATE INDEX IF NOT EXISTS idx_cf_definitions_tenant_entity ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_cf_values_entity ON custom_field_values(tenant_id, entity_type, entity_id);

-- =============================================================================
-- SECTION 17: INTEGRATION CONNECTORS MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS integration_connectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  icon_url VARCHAR(500),
  website_url VARCHAR(500),
  documentation_url VARCHAR(500),
  auth_type VARCHAR(50) NOT NULL,
  oauth_config JSONB,
  supported_features JSONB DEFAULT '[]',
  entity_mappings JSONB DEFAULT '[]',
  webhook_config JSONB,
  rate_limits JSONB,
  is_premium BOOLEAN DEFAULT FALSE,
  is_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS integration_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connector_id UUID REFERENCES integration_connectors(id),
  connector_slug VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  auth_type VARCHAR(50) NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  encryption_version VARCHAR(20) DEFAULT 'v1',
  settings JSONB DEFAULT '{}',
  entity_mappings JSONB DEFAULT '[]',
  sync_config JSONB DEFAULT '{}',
  last_sync_at TIMESTAMPTZ,
  last_error TEXT,
  metadata JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ic_connections_tenant ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ic_connections_status ON integration_connections(tenant_id, status);

-- =============================================================================
-- SECTION 18: WORKFLOW BUILDER MODULE
-- =============================================================================

CREATE TABLE IF NOT EXISTS workflow_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  tags TEXT[] DEFAULT '{}',
  status VARCHAR(50) DEFAULT 'draft',
  version INTEGER DEFAULT 1,
  nodes JSONB DEFAULT '[]',
  connections JSONB DEFAULT '[]',
  variables JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  stats JSONB DEFAULT '{}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  workflow_version INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  trigger_type VARCHAR(100) NOT NULL,
  trigger_data JSONB DEFAULT '{}',
  context JSONB DEFAULT '{}',
  current_node_id VARCHAR(100),
  node_executions JSONB DEFAULT '[]',
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error TEXT,
  result JSONB
);

CREATE INDEX IF NOT EXISTS idx_wf_definitions_tenant ON workflow_definitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_executions_workflow ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_executions_tenant ON workflow_executions(tenant_id, started_at DESC);

-- =============================================================================
-- SECTION 19: UPDATE TRIGGERS
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply triggers to main tables
DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['leads', 'customers', 'opportunities', 'tasks', 'contacts',
                                  'webhooks', 'email_templates', 'notes', 'quotes', 'quote_items',
                                  'calendar_events', 'pipelines', 'pipeline_stages',
                                  'custom_field_definitions', 'custom_field_values',
                                  'integration_connections', 'workflow_definitions'])
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
-- SECTION 20: SEED DEFAULT INTEGRATION CONNECTORS
-- =============================================================================

INSERT INTO integration_connectors (id, name, slug, description, category, auth_type, supported_features, is_premium, is_enabled)
VALUES
  (gen_random_uuid(), 'Slack', 'slack', 'Send notifications to Slack', 'communication', 'oauth2', '[]', false, true),
  (gen_random_uuid(), 'HubSpot', 'hubspot', 'Sync with HubSpot CRM', 'crm', 'oauth2', '[]', false, true),
  (gen_random_uuid(), 'Stripe', 'stripe', 'Sync payments with Stripe', 'payment', 'api_key', '[]', false, true),
  (gen_random_uuid(), 'Twilio', 'twilio', 'Send SMS via Twilio', 'communication', 'api_key', '[]', false, true),
  (gen_random_uuid(), 'Zapier', 'zapier', 'Connect with Zapier', 'productivity', 'api_key', '[]', false, true)
ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- MIGRATION COMPLETE
-- =============================================================================

SELECT 'Migration completed successfully!' as message;
