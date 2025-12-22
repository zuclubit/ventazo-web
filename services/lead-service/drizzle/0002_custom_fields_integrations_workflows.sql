-- Migration: Custom Fields, Integration Connectors, and Workflow Builder
-- Date: 2025-12-07
-- Description: Creates tables for dynamic custom fields, third-party integrations, and workflow automation

-- =====================================================
-- CUSTOM FIELDS MODULE
-- =====================================================

-- Custom field definitions
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

-- Custom field values
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

-- Custom field groups
CREATE TABLE IF NOT EXISTS custom_field_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_collapsible BOOLEAN DEFAULT TRUE,
  is_collapsed_by_default BOOLEAN DEFAULT FALSE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type, name)
);

-- Custom field layouts
CREATE TABLE IF NOT EXISTS custom_field_layouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  layout_type VARCHAR(50) NOT NULL,
  sections JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for custom fields
CREATE INDEX IF NOT EXISTS idx_cf_definitions_tenant_entity ON custom_field_definitions(tenant_id, entity_type);
CREATE INDEX IF NOT EXISTS idx_cf_definitions_api_name ON custom_field_definitions(tenant_id, entity_type, api_name);
CREATE INDEX IF NOT EXISTS idx_cf_values_entity ON custom_field_values(tenant_id, entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_cf_values_field ON custom_field_values(field_id);
CREATE INDEX IF NOT EXISTS idx_cf_groups_tenant ON custom_field_groups(tenant_id, entity_type);

-- =====================================================
-- INTEGRATION CONNECTORS MODULE
-- =====================================================

-- Available integration connectors (system-wide definitions)
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

-- Tenant-specific integration connections
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

-- Sync jobs for integrations
CREATE TABLE IF NOT EXISTS integration_sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  connection_id UUID NOT NULL REFERENCES integration_connections(id) ON DELETE CASCADE,
  connector_slug VARCHAR(100) NOT NULL,
  type VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  progress JSONB DEFAULT '{"total_records": 0, "processed_records": 0, "success_count": 0, "error_count": 0, "percentage": 0}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  results JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Webhook events from integrations
CREATE TABLE IF NOT EXISTS integration_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  connection_id UUID REFERENCES integration_connections(id) ON DELETE SET NULL,
  connector_slug VARCHAR(100) NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  headers JSONB DEFAULT '{}',
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'pending',
  error TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Indexes for integrations
CREATE INDEX IF NOT EXISTS idx_ic_connections_tenant ON integration_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ic_connections_status ON integration_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_ic_sync_jobs_connection ON integration_sync_jobs(connection_id, status);
CREATE INDEX IF NOT EXISTS idx_ic_sync_jobs_tenant ON integration_sync_jobs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ic_webhook_events_status ON integration_webhook_events(status, received_at);

-- =====================================================
-- WORKFLOW BUILDER MODULE
-- =====================================================

-- Workflow definitions
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
  stats JSONB DEFAULT '{"total_executions": 0, "successful_executions": 0, "failed_executions": 0, "avg_execution_time_ms": 0, "last_7_days_executions": 0}',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ
);

-- Workflow version history
CREATE TABLE IF NOT EXISTS workflow_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  nodes JSONB NOT NULL,
  connections JSONB NOT NULL,
  variables JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  published_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(workflow_id, version)
);

-- Workflow executions
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

-- Workflow scheduled runs
CREATE TABLE IF NOT EXISTS workflow_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES workflow_definitions(id) ON DELETE CASCADE,
  schedule_type VARCHAR(50) NOT NULL,
  cron_expression VARCHAR(100),
  next_run_at TIMESTAMPTZ,
  last_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Workflow waiting/delayed executions
CREATE TABLE IF NOT EXISTS workflow_delayed_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES workflow_executions(id) ON DELETE CASCADE,
  node_id VARCHAR(100) NOT NULL,
  resume_at TIMESTAMPTZ NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for workflows
CREATE INDEX IF NOT EXISTS idx_wf_definitions_tenant ON workflow_definitions(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_definitions_category ON workflow_definitions(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_wf_executions_workflow ON workflow_executions(workflow_id, status);
CREATE INDEX IF NOT EXISTS idx_wf_executions_tenant ON workflow_executions(tenant_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_wf_executions_status ON workflow_executions(status, started_at);
CREATE INDEX IF NOT EXISTS idx_wf_schedules_next ON workflow_schedules(next_run_at, is_active);
CREATE INDEX IF NOT EXISTS idx_wf_delayed_resume ON workflow_delayed_executions(resume_at);

-- =====================================================
-- SEED DEFAULT INTEGRATION CONNECTORS
-- =====================================================

INSERT INTO integration_connectors (id, name, slug, description, category, auth_type, oauth_config, supported_features, is_premium, is_enabled)
VALUES 
  (gen_random_uuid(), 'Slack', 'slack', 'Send notifications and messages to Slack channels', 'communication', 'oauth2', 
   '{"scopes": ["chat:write", "channels:read", "users:read"]}',
   '[{"id": "notifications", "name": "Notifications", "description": "Send notifications to channels", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'HubSpot', 'hubspot', 'Sync contacts, companies, and deals with HubSpot CRM', 'crm', 'oauth2',
   '{"scopes": ["crm.objects.contacts.read", "crm.objects.contacts.write", "crm.objects.companies.read"]}',
   '[{"id": "contacts_sync", "name": "Contact Sync", "description": "Two-way contact synchronization", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Salesforce', 'salesforce', 'Connect with Salesforce CRM for complete data synchronization', 'crm', 'oauth2',
   '{"scopes": ["api", "refresh_token"]}',
   '[{"id": "leads_sync", "name": "Lead Sync", "description": "Sync leads with Salesforce", "is_enabled": true}]',
   true, true),
  (gen_random_uuid(), 'Mailchimp', 'mailchimp', 'Sync contacts with Mailchimp for email marketing', 'marketing', 'oauth2',
   '{}',
   '[{"id": "audience_sync", "name": "Audience Sync", "description": "Sync contacts to Mailchimp audiences", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Stripe', 'stripe', 'Sync payment and subscription data with Stripe', 'payment', 'api_key',
   '{}',
   '[{"id": "customers_sync", "name": "Customer Sync", "description": "Sync customer records", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Twilio', 'twilio', 'Send SMS and make calls via Twilio', 'communication', 'api_key',
   '{}',
   '[{"id": "sms", "name": "SMS", "description": "Send and receive SMS messages", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Google Calendar', 'google-calendar', 'Sync meetings and events with Google Calendar', 'calendar', 'oauth2',
   '{"scopes": ["https://www.googleapis.com/auth/calendar"]}',
   '[{"id": "events_sync", "name": "Event Sync", "description": "Sync calendar events", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Microsoft Teams', 'microsoft-teams', 'Send notifications via Microsoft Teams', 'communication', 'oauth2',
   '{}',
   '[{"id": "notifications", "name": "Notifications", "description": "Send notifications to Teams channels", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'Zapier', 'zapier', 'Connect with 5000+ apps via Zapier automation', 'productivity', 'api_key',
   '{}',
   '[{"id": "triggers", "name": "Triggers", "description": "Trigger Zapier workflows", "is_enabled": true}]',
   false, true),
  (gen_random_uuid(), 'SendGrid', 'sendgrid', 'Send transactional and marketing emails via SendGrid', 'marketing', 'api_key',
   '{}',
   '[{"id": "transactional", "name": "Transactional Email", "description": "Send transactional emails", "is_enabled": true}]',
   false, true)
ON CONFLICT (slug) DO NOTHING;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE custom_field_definitions IS 'Stores custom field definitions for extending entity schemas';
COMMENT ON TABLE custom_field_values IS 'Stores actual values for custom fields per entity';
COMMENT ON TABLE integration_connectors IS 'Available third-party integration connectors';
COMMENT ON TABLE integration_connections IS 'Tenant-specific integration connections with credentials';
COMMENT ON TABLE workflow_definitions IS 'Visual workflow automation definitions';
COMMENT ON TABLE workflow_executions IS 'Execution history for workflows';
