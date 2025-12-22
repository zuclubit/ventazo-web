-- Migration: Add Webhooks, Scoring Rules, and Score History tables
-- Version: 0001
-- Description: Creates tables for webhook configurations, webhook deliveries,
--              scoring rules, and score history tracking

-- =============================================
-- WEBHOOKS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url TEXT NOT NULL,
    events JSONB NOT NULL DEFAULT '[]',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    secret VARCHAR(255),
    headers JSONB DEFAULT '{}',
    retry_policy JSONB NOT NULL DEFAULT '{"maxRetries": 5, "retryDelayMs": 1000, "backoffMultiplier": 2}',
    filters JSONB DEFAULT '{}',
    failure_count INTEGER NOT NULL DEFAULT 0,
    last_triggered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT webhooks_status_check CHECK (status IN ('active', 'inactive', 'failed'))
);

-- Indexes for webhooks
CREATE INDEX idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhooks_status ON webhooks(tenant_id, status);
CREATE INDEX idx_webhooks_events ON webhooks USING GIN(events);

-- =============================================
-- WEBHOOK DELIVERIES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    url TEXT NOT NULL,
    request_headers JSONB DEFAULT '{}',
    response_status INTEGER,
    response_body TEXT,
    response_headers JSONB,
    error TEXT,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    next_retry_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    duration INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT webhook_deliveries_status_check CHECK (status IN ('pending', 'success', 'failed', 'retrying'))
);

-- Indexes for webhook deliveries
CREATE INDEX idx_webhook_deliveries_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_webhook_deliveries_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX idx_webhook_deliveries_status ON webhook_deliveries(status);
CREATE INDEX idx_webhook_deliveries_retry ON webhook_deliveries(next_retry_at) WHERE status = 'retrying';
CREATE INDEX idx_webhook_deliveries_created ON webhook_deliveries(tenant_id, created_at DESC);

-- =============================================
-- SCORING RULES TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS scoring_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
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
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT scoring_rules_action_check CHECK (action IN ('add', 'subtract', 'set', 'multiply')),
    CONSTRAINT scoring_rules_logic_check CHECK (condition_logic IN ('AND', 'OR'))
);

-- Indexes for scoring rules
CREATE INDEX idx_scoring_rules_tenant ON scoring_rules(tenant_id);
CREATE INDEX idx_scoring_rules_active ON scoring_rules(tenant_id, is_active);
CREATE INDEX idx_scoring_rules_priority ON scoring_rules(tenant_id, priority);
CREATE INDEX idx_scoring_rules_category ON scoring_rules(tenant_id, category);
CREATE INDEX idx_scoring_rules_type ON scoring_rules(type);

-- =============================================
-- SCORE HISTORY TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS score_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    previous_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    applied_rules JSONB NOT NULL DEFAULT '[]',
    breakdown JSONB NOT NULL DEFAULT '{}',
    calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for score history
CREATE INDEX idx_score_history_lead ON score_history(lead_id);
CREATE INDEX idx_score_history_tenant ON score_history(tenant_id);
CREATE INDEX idx_score_history_calculated ON score_history(lead_id, calculated_at DESC);
CREATE INDEX idx_score_history_tenant_date ON score_history(tenant_id, calculated_at DESC);

-- =============================================
-- SCORING RULE SETS TABLE (Optional - for grouping rules)
-- =============================================
CREATE TABLE IF NOT EXISTS scoring_rule_sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_score INTEGER NOT NULL DEFAULT 50,
    min_score INTEGER NOT NULL DEFAULT 0,
    max_score INTEGER NOT NULL DEFAULT 100,
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT scoring_rule_sets_score_range CHECK (min_score >= 0 AND max_score <= 100 AND min_score < max_score)
);

-- Index for scoring rule sets
CREATE INDEX idx_scoring_rule_sets_tenant ON scoring_rule_sets(tenant_id);
CREATE UNIQUE INDEX idx_scoring_rule_sets_default ON scoring_rule_sets(tenant_id) WHERE is_default = true;

-- =============================================
-- EMAIL LOGS TABLE (for tracking sent emails)
-- =============================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    template VARCHAR(100),
    recipient_email VARCHAR(255) NOT NULL,
    recipient_name VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    message_id VARCHAR(255),
    error TEXT,
    metadata JSONB DEFAULT '{}',
    sent_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT email_logs_status_check CHECK (status IN ('pending', 'sent', 'failed', 'bounced', 'delivered'))
);

-- Indexes for email logs
CREATE INDEX idx_email_logs_tenant ON email_logs(tenant_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email);
CREATE INDEX idx_email_logs_created ON email_logs(tenant_id, created_at DESC);

-- =============================================
-- JOB QUEUE METADATA TABLE (for BullMQ tracking)
-- =============================================
CREATE TABLE IF NOT EXISTS job_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    queue_name VARCHAR(100) NOT NULL,
    job_id VARCHAR(255) NOT NULL,
    job_type VARCHAR(100) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    payload JSONB,
    result JSONB,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    processed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT job_metadata_status_check CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'retrying'))
);

-- Indexes for job metadata
CREATE INDEX idx_job_metadata_tenant ON job_metadata(tenant_id);
CREATE INDEX idx_job_metadata_queue ON job_metadata(queue_name);
CREATE INDEX idx_job_metadata_status ON job_metadata(status);
CREATE INDEX idx_job_metadata_job_id ON job_metadata(job_id);
CREATE INDEX idx_job_metadata_created ON job_metadata(tenant_id, created_at DESC);

-- =============================================
-- UPDATE TRIGGERS
-- =============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_rules_updated_at
    BEFORE UPDATE ON scoring_rules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_scoring_rule_sets_updated_at
    BEFORE UPDATE ON scoring_rule_sets
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================

-- Enable RLS on all new tables
ALTER TABLE webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE score_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_rule_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_metadata ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (tenant isolation)
-- These policies assume tenant_id is set via app.current_tenant session variable

CREATE POLICY tenant_isolation_webhooks ON webhooks
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_webhook_deliveries ON webhook_deliveries
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_scoring_rules ON scoring_rules
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_score_history ON score_history
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_scoring_rule_sets ON scoring_rule_sets
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_email_logs ON email_logs
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

CREATE POLICY tenant_isolation_job_metadata ON job_metadata
    USING (tenant_id = current_setting('app.current_tenant', true)::uuid);

-- =============================================
-- COMMENTS
-- =============================================

COMMENT ON TABLE webhooks IS 'Webhook configurations for external integrations';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and results';
COMMENT ON TABLE scoring_rules IS 'Configurable rules for automatic lead scoring';
COMMENT ON TABLE score_history IS 'Historical record of lead score calculations';
COMMENT ON TABLE scoring_rule_sets IS 'Groups of scoring rules for different use cases';
COMMENT ON TABLE email_logs IS 'Log of all emails sent by the system';
COMMENT ON TABLE job_metadata IS 'Metadata for background job processing';
