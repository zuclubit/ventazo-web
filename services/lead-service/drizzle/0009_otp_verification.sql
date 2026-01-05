-- ============================================
-- OTP Verification Tokens Migration
-- Creates table for inline OTP email verification (P0.1)
-- ============================================

-- OTP Verification Tokens Table
-- Stores 6-digit OTP codes for inline email verification during signup
CREATE TABLE IF NOT EXISTS otp_verification_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(50) NOT NULL DEFAULT 'signup_verification', -- 'signup_verification', 'email_change', '2fa'
    attempts INTEGER NOT NULL DEFAULT 0,
    max_attempts INTEGER NOT NULL DEFAULT 3,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraints
    CONSTRAINT otp_code_length CHECK (LENGTH(otp_code) = 6),
    CONSTRAINT otp_code_numeric CHECK (otp_code ~ '^[0-9]{6}$'),
    CONSTRAINT valid_purpose CHECK (purpose IN ('signup_verification', 'email_change', '2fa', 'password_reset'))
);

-- Indexes for OTP tokens
CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_verification_tokens(email);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_email_purpose ON otp_verification_tokens(email, purpose);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_verification_tokens(expires_at);
CREATE INDEX IF NOT EXISTS idx_otp_tokens_created_at ON otp_verification_tokens(created_at);

-- Unique constraint: only one active OTP per email/purpose combination
-- (An OTP is considered active if verified_at IS NULL and expires_at > NOW())
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_tokens_active_email_purpose
ON otp_verification_tokens(email, purpose)
WHERE verified_at IS NULL AND expires_at > NOW();

-- Add comments for documentation
COMMENT ON TABLE otp_verification_tokens IS 'Stores 6-digit OTP codes for inline email verification during signup flow';
COMMENT ON COLUMN otp_verification_tokens.email IS 'Email address to verify';
COMMENT ON COLUMN otp_verification_tokens.otp_code IS '6-digit numeric OTP code';
COMMENT ON COLUMN otp_verification_tokens.purpose IS 'Purpose of OTP: signup_verification, email_change, 2fa, password_reset';
COMMENT ON COLUMN otp_verification_tokens.attempts IS 'Number of verification attempts made';
COMMENT ON COLUMN otp_verification_tokens.max_attempts IS 'Maximum allowed verification attempts (default 3)';
COMMENT ON COLUMN otp_verification_tokens.expires_at IS 'Token expiration time (typically 10 minutes after creation)';
COMMENT ON COLUMN otp_verification_tokens.verified_at IS 'When the OTP was successfully verified (NULL if unused)';

-- Function to generate a new OTP (invalidates previous OTPs for same email/purpose)
CREATE OR REPLACE FUNCTION generate_otp(
    p_email VARCHAR(255),
    p_purpose VARCHAR(50) DEFAULT 'signup_verification',
    p_expires_in_minutes INTEGER DEFAULT 10
)
RETURNS TABLE(otp_id UUID, otp_code VARCHAR(6), expires_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_otp_code VARCHAR(6);
    v_expires_at TIMESTAMP WITH TIME ZONE;
    v_id UUID;
BEGIN
    -- Generate random 6-digit OTP
    v_otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
    v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL;

    -- Invalidate previous OTPs for this email/purpose (mark as expired)
    UPDATE otp_verification_tokens
    SET expires_at = NOW() - INTERVAL '1 second'
    WHERE email = p_email
      AND purpose = p_purpose
      AND verified_at IS NULL
      AND expires_at > NOW();

    -- Insert new OTP
    INSERT INTO otp_verification_tokens (email, otp_code, purpose, expires_at)
    VALUES (p_email, v_otp_code, p_purpose, v_expires_at)
    RETURNING id INTO v_id;

    -- Return the generated OTP details
    RETURN QUERY SELECT v_id, v_otp_code, v_expires_at;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_otp(VARCHAR, VARCHAR, INTEGER) IS 'Generates a new 6-digit OTP for the given email and purpose. Invalidates previous OTPs.';

-- Function to verify OTP
CREATE OR REPLACE FUNCTION verify_otp(
    p_email VARCHAR(255),
    p_otp_code VARCHAR(6),
    p_purpose VARCHAR(50) DEFAULT 'signup_verification'
)
RETURNS TABLE(success BOOLEAN, message TEXT, remaining_attempts INTEGER) AS $$
DECLARE
    v_record RECORD;
BEGIN
    -- Find the active OTP for this email/purpose
    SELECT * INTO v_record
    FROM otp_verification_tokens
    WHERE email = p_email
      AND purpose = p_purpose
      AND verified_at IS NULL
      AND expires_at > NOW()
    ORDER BY created_at DESC
    LIMIT 1;

    -- No active OTP found
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'OTP expired or not found. Please request a new code.'::TEXT, 0;
        RETURN;
    END IF;

    -- Check max attempts exceeded
    IF v_record.attempts >= v_record.max_attempts THEN
        -- Invalidate the OTP
        UPDATE otp_verification_tokens
        SET expires_at = NOW() - INTERVAL '1 second'
        WHERE id = v_record.id;

        RETURN QUERY SELECT FALSE, 'Maximum attempts exceeded. Please request a new code.'::TEXT, 0;
        RETURN;
    END IF;

    -- Increment attempts
    UPDATE otp_verification_tokens
    SET attempts = attempts + 1
    WHERE id = v_record.id;

    -- Check OTP code
    IF v_record.otp_code = p_otp_code THEN
        -- Mark as verified
        UPDATE otp_verification_tokens
        SET verified_at = NOW()
        WHERE id = v_record.id;

        RETURN QUERY SELECT TRUE, 'Email verified successfully'::TEXT, (v_record.max_attempts - v_record.attempts - 1);
        RETURN;
    ELSE
        -- Wrong code
        RETURN QUERY SELECT FALSE, 'Invalid OTP code'::TEXT, (v_record.max_attempts - v_record.attempts - 1);
        RETURN;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_otp(VARCHAR, VARCHAR, VARCHAR) IS 'Verifies the OTP code for the given email and purpose. Returns success status and remaining attempts.';

-- Function to check if email is verified (for signup flow)
CREATE OR REPLACE FUNCTION is_email_verified(
    p_email VARCHAR(255),
    p_purpose VARCHAR(50) DEFAULT 'signup_verification',
    p_within_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM otp_verification_tokens
        WHERE email = p_email
          AND purpose = p_purpose
          AND verified_at IS NOT NULL
          AND verified_at > NOW() - (p_within_minutes || ' minutes')::INTERVAL
    ) INTO v_exists;

    RETURN v_exists;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_email_verified(VARCHAR, VARCHAR, INTEGER) IS 'Checks if email was verified within the specified time window.';

-- Cleanup function for OTP tokens
CREATE OR REPLACE FUNCTION cleanup_otp_tokens()
RETURNS void AS $$
BEGIN
    -- Delete OTP tokens expired more than 24 hours ago
    DELETE FROM otp_verification_tokens
    WHERE expires_at < NOW() - INTERVAL '24 hours';

    -- Delete verified tokens older than 7 days
    DELETE FROM otp_verification_tokens
    WHERE verified_at IS NOT NULL
      AND verified_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_otp_tokens() IS 'Removes expired and old verified OTP tokens. Call periodically via cron or scheduler.';

-- Rate limiting table for OTP requests
CREATE TABLE IF NOT EXISTS otp_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(255) NOT NULL, -- email or IP address
    identifier_type VARCHAR(20) NOT NULL DEFAULT 'email', -- 'email' or 'ip'
    request_count INTEGER NOT NULL DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    CONSTRAINT valid_identifier_type CHECK (identifier_type IN ('email', 'ip'))
);

-- Indexes for rate limiting
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_identifier ON otp_rate_limits(identifier, identifier_type);
CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_window ON otp_rate_limits(window_start);

-- Unique constraint for identifier within window
CREATE UNIQUE INDEX IF NOT EXISTS idx_otp_rate_limits_unique
ON otp_rate_limits(identifier, identifier_type)
WHERE window_start > NOW() - INTERVAL '1 hour';

COMMENT ON TABLE otp_rate_limits IS 'Rate limiting for OTP requests to prevent abuse';
COMMENT ON COLUMN otp_rate_limits.identifier IS 'Email address or IP address being rate limited';
COMMENT ON COLUMN otp_rate_limits.identifier_type IS 'Type of identifier: email or ip';
COMMENT ON COLUMN otp_rate_limits.request_count IS 'Number of requests in current window';
COMMENT ON COLUMN otp_rate_limits.window_start IS 'Start of the current rate limit window';

-- Function to check and update rate limit
CREATE OR REPLACE FUNCTION check_otp_rate_limit(
    p_identifier VARCHAR(255),
    p_identifier_type VARCHAR(20) DEFAULT 'email',
    p_max_requests INTEGER DEFAULT 5,
    p_window_minutes INTEGER DEFAULT 60
)
RETURNS TABLE(allowed BOOLEAN, current_count INTEGER, resets_at TIMESTAMP WITH TIME ZONE) AS $$
DECLARE
    v_record RECORD;
    v_window_start TIMESTAMP WITH TIME ZONE;
BEGIN
    v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;

    -- Find existing rate limit record
    SELECT * INTO v_record
    FROM otp_rate_limits
    WHERE identifier = p_identifier
      AND identifier_type = p_identifier_type
      AND window_start > v_window_start
    ORDER BY window_start DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- No record, create new one
        INSERT INTO otp_rate_limits (identifier, identifier_type, request_count, window_start)
        VALUES (p_identifier, p_identifier_type, 1, NOW());

        RETURN QUERY SELECT TRUE, 1, NOW() + (p_window_minutes || ' minutes')::INTERVAL;
        RETURN;
    END IF;

    -- Check if limit exceeded
    IF v_record.request_count >= p_max_requests THEN
        RETURN QUERY SELECT FALSE, v_record.request_count, v_record.window_start + (p_window_minutes || ' minutes')::INTERVAL;
        RETURN;
    END IF;

    -- Increment count
    UPDATE otp_rate_limits
    SET request_count = request_count + 1
    WHERE id = v_record.id;

    RETURN QUERY SELECT TRUE, v_record.request_count + 1, v_record.window_start + (p_window_minutes || ' minutes')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_otp_rate_limit(VARCHAR, VARCHAR, INTEGER, INTEGER) IS 'Checks and updates rate limit for OTP requests. Returns whether request is allowed.';

-- Cleanup function for rate limit records
CREATE OR REPLACE FUNCTION cleanup_otp_rate_limits()
RETURNS void AS $$
BEGIN
    DELETE FROM otp_rate_limits
    WHERE window_start < NOW() - INTERVAL '2 hours';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_otp_rate_limits() IS 'Removes old rate limit records. Call periodically.';
