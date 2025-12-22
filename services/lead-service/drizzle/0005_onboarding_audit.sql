-- Migration: Onboarding and Audit Logging Tables
-- Description: Creates tables for user onboarding progress tracking and audit logging

-- User Onboarding Table
-- Tracks onboarding progress for each user
CREATE TABLE IF NOT EXISTS user_onboarding (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(50) NOT NULL DEFAULT 'not_started' CHECK (
        status IN (
            'not_started',
            'profile_created',
            'business_created',
            'setup_completed',
            'team_invited',
            'completed'
        )
    ),
    current_step INTEGER NOT NULL DEFAULT 0,
    completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookups by user
CREATE INDEX IF NOT EXISTS idx_user_onboarding_user_id ON user_onboarding(user_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_user_onboarding_status ON user_onboarding(status);

-- Audit Logs Table
-- Stores audit trail of user actions for compliance and debugging
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    old_values JSONB,
    new_values JSONB NOT NULL DEFAULT '{}'::jsonb,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for filtering by tenant
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_id ON audit_logs(tenant_id);

-- Index for filtering by user
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);

-- Index for filtering by action
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Index for filtering by entity type
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_type ON audit_logs(entity_type);

-- Index for filtering by entity id
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity_id ON audit_logs(entity_id);

-- Index for time-based queries (most common use case)
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);

-- Composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_created ON audit_logs(user_id, created_at DESC);

-- Trigger to update updated_at timestamp on user_onboarding
CREATE OR REPLACE FUNCTION update_user_onboarding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_onboarding_updated_at ON user_onboarding;
CREATE TRIGGER trigger_user_onboarding_updated_at
    BEFORE UPDATE ON user_onboarding
    FOR EACH ROW
    EXECUTE FUNCTION update_user_onboarding_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_onboarding IS 'Tracks user onboarding progress through the setup wizard';
COMMENT ON COLUMN user_onboarding.status IS 'Current onboarding status: not_started, profile_created, business_created, setup_completed, team_invited, completed';
COMMENT ON COLUMN user_onboarding.current_step IS 'Current step number in the onboarding flow (0-indexed)';
COMMENT ON COLUMN user_onboarding.completed_steps IS 'Array of completed step names';
COMMENT ON COLUMN user_onboarding.metadata IS 'Additional metadata about the onboarding process';

COMMENT ON TABLE audit_logs IS 'Audit trail of user actions for compliance and debugging';
COMMENT ON COLUMN audit_logs.action IS 'Type of action performed (e.g., user_signup, tenant_created, onboarding_completed)';
COMMENT ON COLUMN audit_logs.entity_type IS 'Type of entity affected (e.g., user, tenant, lead)';
COMMENT ON COLUMN audit_logs.entity_id IS 'ID of the affected entity';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous values before the change (for update operations)';
COMMENT ON COLUMN audit_logs.new_values IS 'New values after the change';
