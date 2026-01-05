-- =============================================================================
-- Migration: 0013_campaigns_module.sql
-- Description: Create tables for the campaigns module (email marketing)
-- =============================================================================

-- Campaigns
CREATE TABLE IF NOT EXISTS campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL DEFAULT 'email',
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  goal_type VARCHAR(20) NOT NULL DEFAULT 'engagement',
  channels JSONB NOT NULL DEFAULT '[]'::jsonb,
  primary_channel VARCHAR(30),
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  timezone VARCHAR(50) NOT NULL DEFAULT 'UTC',
  audience_id UUID,
  audience_name VARCHAR(255),
  estimated_reach INTEGER,
  actual_reach INTEGER,
  budget_amount INTEGER,
  budget_currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  budget_spent INTEGER NOT NULL DEFAULT 0,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  utm_term VARCHAR(255),
  utm_content VARCHAR(255),
  subject VARCHAR(500),
  preview_text VARCHAR(500),
  from_name VARCHAR(255),
  from_email VARCHAR(255),
  reply_to VARCHAR(255),
  template_id UUID,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  folder_id UUID,
  owner_id UUID NOT NULL,
  owner_name VARCHAR(255),
  custom_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  published_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS campaigns_tenant_id_idx ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS campaigns_status_idx ON campaigns(status);
CREATE INDEX IF NOT EXISTS campaigns_type_idx ON campaigns(type);
CREATE INDEX IF NOT EXISTS campaigns_owner_id_idx ON campaigns(owner_id);
CREATE INDEX IF NOT EXISTS campaigns_folder_id_idx ON campaigns(folder_id);
CREATE INDEX IF NOT EXISTS campaigns_start_date_idx ON campaigns(start_date);
CREATE INDEX IF NOT EXISTS campaigns_created_at_idx ON campaigns(created_at);

-- Campaign Audiences
CREATE TABLE IF NOT EXISTS campaign_audiences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(20) NOT NULL DEFAULT 'dynamic',
  rules JSONB NOT NULL DEFAULT '[]'::jsonb,
  rule_logic VARCHAR(10) NOT NULL DEFAULT 'and',
  member_ids JSONB DEFAULT '[]'::jsonb,
  member_count INTEGER NOT NULL DEFAULT 0,
  last_calculated_at TIMESTAMPTZ,
  refresh_interval INTEGER,
  auto_refresh BOOLEAN NOT NULL DEFAULT false,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_audiences_tenant_id_idx ON campaign_audiences(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_audiences_type_idx ON campaign_audiences(type);
CREATE INDEX IF NOT EXISTS campaign_audiences_name_idx ON campaign_audiences(name);

-- Campaign Messages
CREATE TABLE IF NOT EXISTS campaign_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  channel VARCHAR(30) NOT NULL,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(500),
  preview_text VARCHAR(500),
  body_html TEXT,
  body_text TEXT,
  body_json JSONB,
  template_id UUID,
  merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  dynamic_content JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  images JSONB DEFAULT '[]'::jsonb,
  is_variant BOOLEAN NOT NULL DEFAULT false,
  variant_name VARCHAR(100),
  variant_weight REAL,
  send_at TIMESTAMPTZ,
  delay_minutes INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_messages_campaign_id_idx ON campaign_messages(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_messages_tenant_id_idx ON campaign_messages(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_messages_channel_idx ON campaign_messages(channel);
CREATE INDEX IF NOT EXISTS campaign_messages_status_idx ON campaign_messages(status);

-- Campaign A/B Tests
CREATE TABLE IF NOT EXISTS campaign_ab_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'draft',
  test_type VARCHAR(30) NOT NULL,
  variants JSONB NOT NULL DEFAULT '[]'::jsonb,
  sample_size REAL NOT NULL DEFAULT 20,
  sample_count INTEGER,
  winner_criteria VARCHAR(30) NOT NULL DEFAULT 'open_rate',
  test_duration_hours INTEGER NOT NULL DEFAULT 4,
  winner_id UUID,
  winner_declared_at TIMESTAMPTZ,
  winner_declared_by VARCHAR(20),
  results JSONB,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_ab_tests_campaign_id_idx ON campaign_ab_tests(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_ab_tests_tenant_id_idx ON campaign_ab_tests(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_ab_tests_status_idx ON campaign_ab_tests(status);

-- Campaign Sends
CREATE TABLE IF NOT EXISTS campaign_sends (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  message_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  recipient_email VARCHAR(255),
  recipient_phone VARCHAR(50),
  channel VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  clicked_at TIMESTAMPTZ,
  bounced_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  bounce_type VARCHAR(20),
  bounce_reason TEXT,
  failure_reason TEXT,
  external_id VARCHAR(255),
  message_id_external VARCHAR(255),
  variant_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS campaign_sends_campaign_id_idx ON campaign_sends(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_sends_message_id_idx ON campaign_sends(message_id);
CREATE INDEX IF NOT EXISTS campaign_sends_tenant_id_idx ON campaign_sends(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_sends_recipient_id_idx ON campaign_sends(recipient_id);
CREATE INDEX IF NOT EXISTS campaign_sends_status_idx ON campaign_sends(status);
CREATE INDEX IF NOT EXISTS campaign_sends_sent_at_idx ON campaign_sends(sent_at);
CREATE INDEX IF NOT EXISTS campaign_sends_external_id_idx ON campaign_sends(external_id);

-- Campaign Clicks
CREATE TABLE IF NOT EXISTS campaign_clicks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES campaign_sends(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  url VARCHAR(2000) NOT NULL,
  link_id VARCHAR(100),
  link_name VARCHAR(255),
  clicked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  device_type VARCHAR(30),
  browser VARCHAR(100),
  os VARCHAR(100),
  ip VARCHAR(45),
  country VARCHAR(2),
  city VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS campaign_clicks_send_id_idx ON campaign_clicks(send_id);
CREATE INDEX IF NOT EXISTS campaign_clicks_campaign_id_idx ON campaign_clicks(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_clicks_tenant_id_idx ON campaign_clicks(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_clicks_clicked_at_idx ON campaign_clicks(clicked_at);
CREATE INDEX IF NOT EXISTS campaign_clicks_url_idx ON campaign_clicks(url);

-- Campaign Conversions
CREATE TABLE IF NOT EXISTS campaign_conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  send_id UUID NOT NULL REFERENCES campaign_sends(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  recipient_id UUID NOT NULL,
  conversion_type VARCHAR(50) NOT NULL,
  conversion_value INTEGER,
  currency VARCHAR(3),
  attribution_model VARCHAR(20) NOT NULL DEFAULT 'last_touch',
  attribution_weight REAL,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS campaign_conversions_send_id_idx ON campaign_conversions(send_id);
CREATE INDEX IF NOT EXISTS campaign_conversions_campaign_id_idx ON campaign_conversions(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_conversions_tenant_id_idx ON campaign_conversions(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_conversions_recipient_id_idx ON campaign_conversions(recipient_id);
CREATE INDEX IF NOT EXISTS campaign_conversions_converted_at_idx ON campaign_conversions(converted_at);

-- Suppression Lists
CREATE TABLE IF NOT EXISTS suppression_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL DEFAULT 'manual',
  member_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS suppression_lists_tenant_id_idx ON suppression_lists(tenant_id);
CREATE INDEX IF NOT EXISTS suppression_lists_type_idx ON suppression_lists(type);

-- Suppression Entries
CREATE TABLE IF NOT EXISTS suppression_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES suppression_lists(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  contact_id UUID,
  reason TEXT,
  source VARCHAR(100),
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  added_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS suppression_entries_list_id_idx ON suppression_entries(list_id);
CREATE INDEX IF NOT EXISTS suppression_entries_tenant_id_idx ON suppression_entries(tenant_id);
CREATE INDEX IF NOT EXISTS suppression_entries_email_idx ON suppression_entries(email);
CREATE INDEX IF NOT EXISTS suppression_entries_phone_idx ON suppression_entries(phone);
CREATE UNIQUE INDEX IF NOT EXISTS suppression_entries_tenant_email_idx ON suppression_entries(tenant_id, email);

-- Campaign Email Templates
CREATE TABLE IF NOT EXISTS campaign_email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(30) NOT NULL DEFAULT 'marketing',
  category VARCHAR(100),
  subject VARCHAR(500),
  preview_text VARCHAR(500),
  body_html TEXT NOT NULL,
  body_text TEXT,
  design_json JSONB,
  thumbnail_url VARCHAR(500),
  merge_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN NOT NULL DEFAULT false,
  is_default BOOLEAN NOT NULL DEFAULT false,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_email_templates_tenant_id_idx ON campaign_email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_email_templates_type_idx ON campaign_email_templates(type);
CREATE INDEX IF NOT EXISTS campaign_email_templates_category_idx ON campaign_email_templates(category);
CREATE INDEX IF NOT EXISTS campaign_email_templates_is_public_idx ON campaign_email_templates(is_public);

-- Campaign Folders
CREATE TABLE IF NOT EXISTS campaign_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  parent_id UUID,
  color VARCHAR(20),
  campaign_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL
);

CREATE INDEX IF NOT EXISTS campaign_folders_tenant_id_idx ON campaign_folders(tenant_id);
CREATE INDEX IF NOT EXISTS campaign_folders_parent_id_idx ON campaign_folders(parent_id);
CREATE UNIQUE INDEX IF NOT EXISTS campaign_folders_tenant_name_idx ON campaign_folders(tenant_id, name);

-- Campaign Analytics
CREATE TABLE IF NOT EXISTS campaign_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  total_sent INTEGER NOT NULL DEFAULT 0,
  total_delivered INTEGER NOT NULL DEFAULT 0,
  total_bounced INTEGER NOT NULL DEFAULT 0,
  total_failed INTEGER NOT NULL DEFAULT 0,
  unique_opens INTEGER NOT NULL DEFAULT 0,
  total_opens INTEGER NOT NULL DEFAULT 0,
  unique_clicks INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  delivery_rate REAL NOT NULL DEFAULT 0,
  bounce_rate REAL NOT NULL DEFAULT 0,
  open_rate REAL NOT NULL DEFAULT 0,
  click_rate REAL NOT NULL DEFAULT 0,
  click_to_open_rate REAL NOT NULL DEFAULT 0,
  unsubscribes INTEGER NOT NULL DEFAULT 0,
  complaints INTEGER NOT NULL DEFAULT 0,
  unsubscribe_rate REAL NOT NULL DEFAULT 0,
  complaint_rate REAL NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  conversion_rate REAL NOT NULL DEFAULT 0,
  revenue INTEGER NOT NULL DEFAULT 0,
  revenue_per_recipient REAL NOT NULL DEFAULT 0,
  cost INTEGER,
  cost_per_send REAL,
  cost_per_click REAL,
  cost_per_conversion REAL,
  roi REAL,
  device_stats JSONB NOT NULL DEFAULT '{}'::jsonb,
  top_countries JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_cities JSONB NOT NULL DEFAULT '[]'::jsonb,
  opens_by_hour JSONB NOT NULL DEFAULT '[]'::jsonb,
  clicks_by_hour JSONB NOT NULL DEFAULT '[]'::jsonb,
  top_links JSONB NOT NULL DEFAULT '[]'::jsonb,
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS campaign_analytics_campaign_id_idx ON campaign_analytics(campaign_id);
CREATE INDEX IF NOT EXISTS campaign_analytics_tenant_id_idx ON campaign_analytics(tenant_id);

-- Automation Triggers
CREATE TABLE IF NOT EXISTS automation_triggers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  trigger_type VARCHAR(30) NOT NULL,
  trigger_event VARCHAR(100),
  trigger_conditions JSONB DEFAULT '[]'::jsonb,
  delay_type VARCHAR(20) DEFAULT 'none',
  delay_minutes INTEGER,
  delay_until_hour INTEGER,
  delay_until_day INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS automation_triggers_campaign_id_idx ON automation_triggers(campaign_id);
CREATE INDEX IF NOT EXISTS automation_triggers_tenant_id_idx ON automation_triggers(tenant_id);
CREATE INDEX IF NOT EXISTS automation_triggers_trigger_type_idx ON automation_triggers(trigger_type);
CREATE INDEX IF NOT EXISTS automation_triggers_is_active_idx ON automation_triggers(is_active);
