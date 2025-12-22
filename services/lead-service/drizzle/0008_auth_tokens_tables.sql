-- ============================================
-- Auth Token Tables Migration
-- Creates tables for password reset and email verification tokens
-- ============================================

-- Password Reset Tokens Table
-- Stores tokens for password recovery flow (via Resend email)
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for password reset tokens
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_email ON password_reset_tokens(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_expires_at ON password_reset_tokens(expires_at);

-- Email Verification Tokens Table
-- Stores tokens for email verification flow (via Resend email)
CREATE TABLE IF NOT EXISTS email_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for email verification tokens
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_email ON email_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_expires_at ON email_verification_tokens(expires_at);

-- Add comments for documentation
COMMENT ON TABLE password_reset_tokens IS 'Stores password reset tokens sent via email for recovery flow';
COMMENT ON COLUMN password_reset_tokens.user_id IS 'User ID requesting the password reset';
COMMENT ON COLUMN password_reset_tokens.token IS 'UUID token sent in the reset email';
COMMENT ON COLUMN password_reset_tokens.email IS 'Email address for the reset (unique constraint to allow only one active token per email)';
COMMENT ON COLUMN password_reset_tokens.expires_at IS 'Token expiration time (typically 1 hour after creation)';
COMMENT ON COLUMN password_reset_tokens.used_at IS 'When the token was used to reset password (NULL if unused)';

COMMENT ON TABLE email_verification_tokens IS 'Stores email verification tokens for new user registration';
COMMENT ON COLUMN email_verification_tokens.user_id IS 'User ID being verified';
COMMENT ON COLUMN email_verification_tokens.token IS 'UUID token sent in the verification email';
COMMENT ON COLUMN email_verification_tokens.email IS 'Email address to verify';
COMMENT ON COLUMN email_verification_tokens.expires_at IS 'Token expiration time (typically 24 hours after creation)';
COMMENT ON COLUMN email_verification_tokens.used_at IS 'When the token was used to verify email (NULL if unused)';

-- Cleanup function for expired tokens (can be called periodically)
CREATE OR REPLACE FUNCTION cleanup_expired_tokens()
RETURNS void AS $$
BEGIN
    -- Delete password reset tokens expired more than 24 hours ago
    DELETE FROM password_reset_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours';

    -- Delete email verification tokens expired more than 7 days ago
    DELETE FROM email_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_tokens() IS 'Removes expired tokens from both tables. Call periodically via cron or scheduler.';
