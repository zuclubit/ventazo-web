-- Migration: User Invitations Table
-- Creates the user_invitations table for token-based team invitations

-- Create invitation status enum if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invitation_status') THEN
        CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'cancelled', 'resent');
    END IF;
END$$;

-- Create user_invitations table
CREATE TABLE IF NOT EXISTS user_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'sales_rep',
    token VARCHAR(255) NOT NULL UNIQUE,
    status invitation_status NOT NULL DEFAULT 'pending',
    invited_by UUID REFERENCES users(id) ON DELETE SET NULL,
    custom_message TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_invitations_tenant_id ON user_invitations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON user_invitations(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_invitations_token ON user_invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON user_invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON user_invitations(expires_at);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON user_invitations(invited_by);

-- Create unique constraint for pending invitations per tenant/email
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_pending_invitation
ON user_invitations(tenant_id, LOWER(email))
WHERE status = 'pending';

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_invitations_updated_at ON user_invitations;
CREATE TRIGGER trigger_user_invitations_updated_at
    BEFORE UPDATE ON user_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_user_invitations_updated_at();

-- Add RLS policies
ALTER TABLE user_invitations ENABLE ROW LEVEL SECURITY;

-- Policy: Tenant members can view invitations for their tenant
CREATE POLICY user_invitations_select_policy ON user_invitations
    FOR SELECT
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid() AND is_active = true
        )
    );

-- Policy: Admins can insert invitations for their tenant
CREATE POLICY user_invitations_insert_policy ON user_invitations
    FOR INSERT
    WITH CHECK (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('owner', 'admin', 'manager')
        )
    );

-- Policy: Admins can update invitations for their tenant
CREATE POLICY user_invitations_update_policy ON user_invitations
    FOR UPDATE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('owner', 'admin', 'manager')
        )
    );

-- Policy: Admins can delete invitations for their tenant
CREATE POLICY user_invitations_delete_policy ON user_invitations
    FOR DELETE
    USING (
        tenant_id IN (
            SELECT tenant_id FROM tenant_memberships
            WHERE user_id = auth.uid()
            AND is_active = true
            AND role IN ('owner', 'admin')
        )
    );

-- Comment on table
COMMENT ON TABLE user_invitations IS 'Stores team invitations with secure tokens for email-based acceptance';
COMMENT ON COLUMN user_invitations.token IS 'Secure random token for invitation acceptance URL';
COMMENT ON COLUMN user_invitations.expires_at IS 'Invitation expiration timestamp (default 7 days from creation)';
