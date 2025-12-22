import pg from 'pg';

const pool = new pg.Pool({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.fngdlxipgrkpbutiqjhw',
  password: 'miZhuxtehvar9wyxfa',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('Running migration 0018 - Add remaining missing columns...\n');

    // ==================== 1. CONTRACTS TABLE ====================
    console.log('=== 1. FIXING CONTRACTS TABLE ===');

    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_term_months integer DEFAULT 12;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_frequency varchar(50) DEFAULT 'monthly';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms varchar(50) DEFAULT 'net30';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS currency varchar(10) DEFAULT 'USD';
    `);
    console.log('  Contracts columns added ✓');

    // ==================== 2. ACTIVITIES TABLE ====================
    console.log('\n=== 2. FIXING ACTIVITIES TABLE ===');

    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_lead_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_opportunity_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_customer_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_contact_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome varchar(100);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome_notes text;
    `);
    console.log('  Activities columns added ✓');

    // ==================== 3. CREATE CONSENT_RECORDS TABLE ====================
    console.log('\n=== 3. CREATING CONSENT_RECORDS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS consent_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        email varchar(255) NOT NULL,
        subject_id uuid,
        subject_type varchar(50),
        purpose varchar(255) NOT NULL,
        consent_basis varchar(100) NOT NULL,
        data_categories jsonb DEFAULT '[]',
        consent_method varchar(50),
        consent_source varchar(255),
        consent_version varchar(50),
        consent_text text,
        consent_given_at timestamp with time zone DEFAULT now(),
        expires_at timestamp with time zone,
        is_active boolean DEFAULT true,
        withdrawn_at timestamp with time zone,
        withdrawal_method varchar(100),
        ip_address varchar(50),
        user_agent text,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS consent_records_tenant_idx ON consent_records(tenant_id);
      CREATE INDEX IF NOT EXISTS consent_records_email_idx ON consent_records(email);
      CREATE INDEX IF NOT EXISTS consent_records_active_idx ON consent_records(is_active);
    `);
    console.log('  Consent records table ✓');

    // ==================== 4. CREATE DATA_SUBJECT_REQUESTS TABLE ====================
    console.log('\n=== 4. CREATING DATA_SUBJECT_REQUESTS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS data_subject_requests (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        type varchar(50) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        priority varchar(20) DEFAULT 'medium',
        subject_email varchar(255) NOT NULL,
        subject_name varchar(255),
        verification_method varchar(50) DEFAULT 'email',
        verification_token varchar(255),
        verified_at timestamp with time zone,
        request_source varchar(50),
        request_notes text,
        export_format varchar(20) DEFAULT 'json',
        erasure_scope varchar(50) DEFAULT 'all',
        erasure_exclusions jsonb DEFAULT '[]',
        received_at timestamp with time zone DEFAULT now(),
        due_date timestamp with time zone,
        completed_at timestamp with time zone,
        completed_by uuid,
        audit_log jsonb DEFAULT '[]',
        result_data jsonb DEFAULT '{}',
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS dsr_tenant_idx ON data_subject_requests(tenant_id);
      CREATE INDEX IF NOT EXISTS dsr_status_idx ON data_subject_requests(status);
      CREATE INDEX IF NOT EXISTS dsr_email_idx ON data_subject_requests(subject_email);
    `);
    console.log('  Data subject requests table ✓');

    // ==================== 5. CREATE CUSTOMER_TIMELINE TABLE ====================
    console.log('\n=== 5. CREATING CUSTOMER_TIMELINE TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS customer_timeline (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        event_type varchar(100) NOT NULL,
        event_title varchar(255),
        event_description text,
        event_data jsonb DEFAULT '{}',
        event_source varchar(100),
        performed_by uuid,
        performed_by_name varchar(255),
        occurred_at timestamp with time zone DEFAULT now(),
        created_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS customer_timeline_tenant_idx ON customer_timeline(tenant_id);
      CREATE INDEX IF NOT EXISTS customer_timeline_customer_idx ON customer_timeline(customer_id);
      CREATE INDEX IF NOT EXISTS customer_timeline_event_idx ON customer_timeline(event_type);
    `);
    console.log('  Customer timeline table ✓');

    // ==================== 6. VERIFY ====================
    console.log('\n=== VERIFICATION ===');

    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contracts' AND column_name = 'renewal_term_months'
    `);
    console.log('Contracts renewal_term_months:', contractCols.rows.length > 0 ? '✓' : '✗');

    const activityCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'activities' AND column_name = 'related_lead_id'
    `);
    console.log('Activities related_lead_id:', activityCols.rows.length > 0 ? '✓' : '✗');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('consent_records', 'data_subject_requests', 'customer_timeline')
      ORDER BY table_name
    `);
    console.log('Tables created:', tables.rows.map(r => r.table_name).join(', '));

    console.log('\n=== MIGRATION 0018 COMPLETED SUCCESSFULLY ===\n');

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
