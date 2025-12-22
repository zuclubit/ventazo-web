import postgres from 'postgres';
import 'dotenv/config';

// Use environment variables or defaults for production Supabase
const sql = postgres({
  host: process.env.POSTGRES_HOST || 'aws-0-us-west-2.pooler.supabase.com',
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  database: process.env.POSTGRES_DB || 'postgres',
  username: process.env.POSTGRES_USER || 'postgres.fngdlxipgrkpbutiqjhw',
  password: process.env.POSTGRES_PASSWORD || 'miZhuxtehvar9wyxfa',
  ssl: 'require',
});

async function main() {
  console.log('Connecting to database...');

  try {
    const result = await sql`SELECT NOW() as time`;
    console.log('Connected at:', result[0].time);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // 1. Create OTP Verification Tokens Table
    console.log('\n1. Creating otp_verification_tokens table...');
    await sql`
      CREATE TABLE IF NOT EXISTS otp_verification_tokens (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          email VARCHAR(255) NOT NULL,
          otp_code VARCHAR(6) NOT NULL,
          purpose VARCHAR(50) NOT NULL DEFAULT 'signup_verification',
          attempts INTEGER NOT NULL DEFAULT 0,
          max_attempts INTEGER NOT NULL DEFAULT 3,
          expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
          verified_at TIMESTAMP WITH TIME ZONE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT otp_code_length CHECK (LENGTH(otp_code) = 6),
          CONSTRAINT otp_code_numeric CHECK (otp_code ~ '^[0-9]{6}$'),
          CONSTRAINT valid_purpose CHECK (purpose IN ('signup_verification', 'email_change', '2fa', 'password_reset'))
      )
    `;
    console.log('  ✅ Table created');

    // 2. Create indexes
    console.log('\n2. Creating indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_tokens_email ON otp_verification_tokens(email)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_tokens_email_purpose ON otp_verification_tokens(email, purpose)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_tokens_expires_at ON otp_verification_tokens(expires_at)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_tokens_created_at ON otp_verification_tokens(created_at)`;
    console.log('  ✅ Indexes created');

    // 3. Create rate limits table
    console.log('\n3. Creating otp_rate_limits table...');
    await sql`
      CREATE TABLE IF NOT EXISTS otp_rate_limits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          identifier VARCHAR(255) NOT NULL,
          identifier_type VARCHAR(20) NOT NULL DEFAULT 'email',
          request_count INTEGER NOT NULL DEFAULT 1,
          window_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          CONSTRAINT valid_identifier_type CHECK (identifier_type IN ('email', 'ip'))
      )
    `;
    console.log('  ✅ Table created');

    // 4. Create rate limits indexes
    console.log('\n4. Creating rate limits indexes...');
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_identifier ON otp_rate_limits(identifier, identifier_type)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_otp_rate_limits_window ON otp_rate_limits(window_start)`;
    console.log('  ✅ Indexes created');

    // 5. Create generate_otp function
    console.log('\n5. Creating generate_otp function...');
    await sql.unsafe(`
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
          v_otp_code := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');
          v_expires_at := NOW() + (p_expires_in_minutes || ' minutes')::INTERVAL;

          UPDATE otp_verification_tokens
          SET expires_at = NOW() - INTERVAL '1 second'
          WHERE email = p_email
            AND purpose = p_purpose
            AND verified_at IS NULL
            AND otp_verification_tokens.expires_at > NOW();

          INSERT INTO otp_verification_tokens (email, otp_code, purpose, expires_at)
          VALUES (p_email, v_otp_code, p_purpose, v_expires_at)
          RETURNING id INTO v_id;

          RETURN QUERY SELECT v_id, v_otp_code, v_expires_at;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Function created');

    // 6. Create verify_otp function
    console.log('\n6. Creating verify_otp function...');
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION verify_otp(
          p_email VARCHAR(255),
          p_otp_code VARCHAR(6),
          p_purpose VARCHAR(50) DEFAULT 'signup_verification'
      )
      RETURNS TABLE(success BOOLEAN, message TEXT, remaining_attempts INTEGER) AS $$
      DECLARE
          v_record RECORD;
      BEGIN
          SELECT * INTO v_record
          FROM otp_verification_tokens
          WHERE email = p_email
            AND purpose = p_purpose
            AND verified_at IS NULL
            AND otp_verification_tokens.expires_at > NOW()
          ORDER BY created_at DESC
          LIMIT 1;

          IF NOT FOUND THEN
              RETURN QUERY SELECT FALSE, 'OTP expired or not found. Please request a new code.'::TEXT, 0;
              RETURN;
          END IF;

          IF v_record.attempts >= v_record.max_attempts THEN
              UPDATE otp_verification_tokens
              SET expires_at = NOW() - INTERVAL '1 second'
              WHERE id = v_record.id;

              RETURN QUERY SELECT FALSE, 'Maximum attempts exceeded. Please request a new code.'::TEXT, 0;
              RETURN;
          END IF;

          UPDATE otp_verification_tokens
          SET attempts = attempts + 1
          WHERE id = v_record.id;

          IF v_record.otp_code = p_otp_code THEN
              UPDATE otp_verification_tokens
              SET verified_at = NOW()
              WHERE id = v_record.id;

              RETURN QUERY SELECT TRUE, 'Email verified successfully'::TEXT, (v_record.max_attempts - v_record.attempts - 1);
              RETURN;
          ELSE
              RETURN QUERY SELECT FALSE, 'Invalid OTP code'::TEXT, (v_record.max_attempts - v_record.attempts - 1);
              RETURN;
          END IF;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Function created');

    // 7. Create is_email_verified function
    console.log('\n7. Creating is_email_verified function...');
    await sql.unsafe(`
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
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Function created');

    // 8. Create check_otp_rate_limit function
    console.log('\n8. Creating check_otp_rate_limit function...');
    await sql.unsafe(`
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

          SELECT * INTO v_record
          FROM otp_rate_limits
          WHERE identifier = p_identifier
            AND identifier_type = p_identifier_type
            AND window_start > v_window_start
          ORDER BY window_start DESC
          LIMIT 1;

          IF NOT FOUND THEN
              INSERT INTO otp_rate_limits (identifier, identifier_type, request_count, window_start)
              VALUES (p_identifier, p_identifier_type, 1, NOW());

              RETURN QUERY SELECT TRUE, 1, NOW() + (p_window_minutes || ' minutes')::INTERVAL;
              RETURN;
          END IF;

          IF v_record.request_count >= p_max_requests THEN
              RETURN QUERY SELECT FALSE, v_record.request_count, v_record.window_start + (p_window_minutes || ' minutes')::INTERVAL;
              RETURN;
          END IF;

          UPDATE otp_rate_limits
          SET request_count = request_count + 1
          WHERE id = v_record.id;

          RETURN QUERY SELECT TRUE, v_record.request_count + 1, v_record.window_start + (p_window_minutes || ' minutes')::INTERVAL;
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Function created');

    // 9. Create cleanup functions
    console.log('\n9. Creating cleanup functions...');
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION cleanup_otp_tokens()
      RETURNS void AS $$
      BEGIN
          DELETE FROM otp_verification_tokens
          WHERE expires_at < NOW() - INTERVAL '24 hours';

          DELETE FROM otp_verification_tokens
          WHERE verified_at IS NOT NULL
            AND verified_at < NOW() - INTERVAL '7 days';
      END;
      $$ LANGUAGE plpgsql
    `);
    await sql.unsafe(`
      CREATE OR REPLACE FUNCTION cleanup_otp_rate_limits()
      RETURNS void AS $$
      BEGIN
          DELETE FROM otp_rate_limits
          WHERE window_start < NOW() - INTERVAL '2 hours';
      END;
      $$ LANGUAGE plpgsql
    `);
    console.log('  ✅ Functions created');

    // Verify
    console.log('\n=== Verifying OTP Tables ===');
    const tables = ['otp_verification_tokens', 'otp_rate_limits'];
    for (const t of tables) {
      const result = await sql`
        SELECT COUNT(*) as c FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      `;
      console.log(`  ${t}: ${result[0].c > 0 ? '✅' : '❌'}`);
    }

    console.log('\n=== Verifying OTP Functions ===');
    const functions = ['generate_otp', 'verify_otp', 'is_email_verified', 'check_otp_rate_limit'];
    for (const f of functions) {
      const result = await sql`
        SELECT COUNT(*) as c FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = ${f}
      `;
      console.log(`  ${f}(): ${result[0].c > 0 ? '✅' : '❌'}`);
    }

    console.log('\n✅ OTP Migration Complete!');
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
