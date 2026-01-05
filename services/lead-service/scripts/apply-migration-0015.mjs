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
    console.log('Running migration 0015 - Comprehensive column fixes...\n');

    // ==================== 1. CONTRACTS TABLE ====================
    console.log('=== 1. CONTRACTS TABLE ===');

    // Add renewal_date column
    console.log('  Adding renewal_date...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_date timestamp with time zone;
    `);

    // Add other contract columns that might be missing
    console.log('  Adding additional contract columns...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_type varchar(50);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_terms text;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS auto_renewal_notice_days integer DEFAULT 30;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS cancellation_notice_days integer DEFAULT 30;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS next_review_date timestamp with time zone;
    `);

    // ==================== 2. CALENDAR_INTEGRATIONS TABLE ====================
    console.log('\n=== 2. CALENDAR_INTEGRATIONS TABLE ===');

    // Add tokens column (stored as JSONB for OAuth tokens)
    console.log('  Adding tokens column...');
    await client.query(`
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS tokens jsonb DEFAULT '{}';
    `);

    // Add other calendar integration columns
    console.log('  Adding additional calendar columns...');
    await client.query(`
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS token_type varchar(50);
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS scope text;
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS primary_calendar_id varchar(255);
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS color varchar(20);
    `);

    // ==================== 3. ACTIVITIES TABLE ====================
    console.log('\n=== 3. ACTIVITIES TABLE ===');

    // Add assigned_to_id column
    console.log('  Adding assigned_to_id...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_to_id uuid;
    `);

    // Add other activity columns
    console.log('  Adding additional activity columns...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_to_name varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_by uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_by_name varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS recurrence_rule text;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS next_occurrence timestamp with time zone;
    `);

    // ==================== 4. GDPR/CONSENT TABLES ====================
    console.log('\n=== 4. GDPR CONSENT TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS gdpr_consent_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        subject_type varchar(50) NOT NULL,
        subject_id uuid NOT NULL,
        subject_email varchar(255),
        consent_type varchar(100) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        granted_at timestamp with time zone,
        revoked_at timestamp with time zone,
        expires_at timestamp with time zone,
        source varchar(100),
        ip_address varchar(50),
        user_agent text,
        consent_text text,
        version varchar(20),
        proof jsonb DEFAULT '{}',
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS gdpr_consent_tenant_idx ON gdpr_consent_records(tenant_id);
      CREATE INDEX IF NOT EXISTS gdpr_consent_subject_idx ON gdpr_consent_records(subject_id);
      CREATE INDEX IF NOT EXISTS gdpr_consent_type_idx ON gdpr_consent_records(consent_type);
    `);

    // ==================== 5. DSR (Data Subject Requests) TABLE ====================
    console.log('\n=== 5. DSR TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS gdpr_dsr (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        request_type varchar(50) NOT NULL,
        status varchar(50) NOT NULL DEFAULT 'pending',
        subject_type varchar(50) NOT NULL,
        subject_id uuid,
        subject_email varchar(255),
        subject_name varchar(255),
        requester_email varchar(255),
        requester_name varchar(255),
        reason text,
        notes text,
        data_categories jsonb DEFAULT '[]',
        processing_details jsonb DEFAULT '{}',
        due_date timestamp with time zone,
        completed_at timestamp with time zone,
        completed_by uuid,
        verification_token varchar(255),
        verified_at timestamp with time zone,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS gdpr_dsr_tenant_idx ON gdpr_dsr(tenant_id);
      CREATE INDEX IF NOT EXISTS gdpr_dsr_status_idx ON gdpr_dsr(status);
      CREATE INDEX IF NOT EXISTS gdpr_dsr_type_idx ON gdpr_dsr(request_type);
    `);

    // ==================== 6. PERMISSIONS TABLE ====================
    console.log('\n=== 6. PERMISSIONS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(100) NOT NULL,
        code varchar(100) NOT NULL,
        description text,
        resource varchar(100),
        action varchar(50),
        is_system boolean DEFAULT false,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        UNIQUE(tenant_id, code)
      );
      CREATE INDEX IF NOT EXISTS permissions_tenant_idx ON permissions(tenant_id);
      CREATE INDEX IF NOT EXISTS permissions_code_idx ON permissions(code);
    `);

    // ==================== 7. SUCCESS PLANS TABLE ====================
    console.log('\n=== 7. SUCCESS PLANS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS success_plans (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        status varchar(50) NOT NULL DEFAULT 'active',
        start_date timestamp with time zone,
        target_date timestamp with time zone,
        completed_at timestamp with time zone,
        owner_id uuid,
        goals jsonb DEFAULT '[]',
        milestones jsonb DEFAULT '[]',
        tasks jsonb DEFAULT '[]',
        metrics jsonb DEFAULT '{}',
        notes text,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS success_plans_tenant_idx ON success_plans(tenant_id);
      CREATE INDEX IF NOT EXISTS success_plans_customer_idx ON success_plans(customer_id);
      CREATE INDEX IF NOT EXISTS success_plans_status_idx ON success_plans(status);
    `);

    // ==================== 8. DUPLICATE RECORDS TABLE ====================
    console.log('\n=== 8. DUPLICATE RECORDS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS duplicate_records (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        entity_type varchar(50) NOT NULL,
        master_id uuid,
        duplicate_id uuid,
        confidence_score numeric(5,2),
        match_fields jsonb DEFAULT '[]',
        status varchar(50) NOT NULL DEFAULT 'pending',
        resolved_at timestamp with time zone,
        resolved_by uuid,
        resolution varchar(50),
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS duplicate_records_tenant_idx ON duplicate_records(tenant_id);
      CREATE INDEX IF NOT EXISTS duplicate_records_entity_idx ON duplicate_records(entity_type);
      CREATE INDEX IF NOT EXISTS duplicate_records_status_idx ON duplicate_records(status);
    `);

    // ==================== 9. EMAIL TRACKING EVENTS TABLE ====================
    console.log('\n=== 9. EMAIL TRACKING EVENTS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_tracking_events (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        email_id uuid,
        tracking_id varchar(255),
        event_type varchar(50) NOT NULL,
        recipient_email varchar(255),
        ip_address varchar(50),
        user_agent text,
        location jsonb DEFAULT '{}',
        link_url text,
        link_id varchar(255),
        metadata jsonb DEFAULT '{}',
        occurred_at timestamp with time zone DEFAULT now(),
        created_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS email_tracking_events_tenant_idx ON email_tracking_events(tenant_id);
      CREATE INDEX IF NOT EXISTS email_tracking_events_email_idx ON email_tracking_events(email_id);
      CREATE INDEX IF NOT EXISTS email_tracking_events_tracking_idx ON email_tracking_events(tracking_id);
      CREATE INDEX IF NOT EXISTS email_tracking_events_type_idx ON email_tracking_events(event_type);
    `);

    // ==================== 10. REPORTS TABLE ====================
    console.log('\n=== 10. REPORTS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        type varchar(50) NOT NULL,
        category varchar(100),
        is_template boolean DEFAULT false,
        is_public boolean DEFAULT false,
        query_config jsonb DEFAULT '{}',
        visualization_config jsonb DEFAULT '{}',
        filters jsonb DEFAULT '[]',
        columns jsonb DEFAULT '[]',
        schedule jsonb DEFAULT '{}',
        owner_id uuid,
        last_run_at timestamp with time zone,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS reports_tenant_idx ON reports(tenant_id);
      CREATE INDEX IF NOT EXISTS reports_type_idx ON reports(type);
      CREATE INDEX IF NOT EXISTS reports_template_idx ON reports(is_template);
    `);

    // ==================== 11. INTEGRATION HUB TABLES ====================
    console.log('\n=== 11. INTEGRATION HUB TABLES ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS available_integrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        name varchar(100) NOT NULL,
        code varchar(100) NOT NULL UNIQUE,
        description text,
        category varchar(50),
        provider varchar(100),
        logo_url text,
        documentation_url text,
        features jsonb DEFAULT '[]',
        auth_type varchar(50),
        config_schema jsonb DEFAULT '{}',
        is_active boolean DEFAULT true,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS connected_integrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        integration_id uuid NOT NULL,
        name varchar(255),
        status varchar(50) NOT NULL DEFAULT 'active',
        config jsonb DEFAULT '{}',
        credentials jsonb DEFAULT '{}',
        last_sync_at timestamp with time zone,
        sync_status varchar(50),
        sync_error text,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS connected_integrations_tenant_idx ON connected_integrations(tenant_id);
      CREATE INDEX IF NOT EXISTS connected_integrations_status_idx ON connected_integrations(status);
    `);

    // ==================== 12. COMMUNICATION TEMPLATES TABLE ====================
    console.log('\n=== 12. COMMUNICATION TEMPLATES TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS communication_templates (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(255) NOT NULL,
        description text,
        type varchar(50) NOT NULL,
        channel varchar(50) NOT NULL,
        subject varchar(500),
        body text,
        html_body text,
        variables jsonb DEFAULT '[]',
        attachments jsonb DEFAULT '[]',
        is_active boolean DEFAULT true,
        is_default boolean DEFAULT false,
        category varchar(100),
        tags jsonb DEFAULT '[]',
        metadata jsonb DEFAULT '{}',
        created_by uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS communication_templates_tenant_idx ON communication_templates(tenant_id);
      CREATE INDEX IF NOT EXISTS communication_templates_type_idx ON communication_templates(type);
      CREATE INDEX IF NOT EXISTS communication_templates_channel_idx ON communication_templates(channel);
    `);

    console.log('\n=== MIGRATION 0015 COMPLETED SUCCESSFULLY ===\n');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'gdpr_consent_records', 'gdpr_dsr', 'permissions', 'success_plans',
        'duplicate_records', 'email_tracking_events', 'reports',
        'available_integrations', 'connected_integrations', 'communication_templates'
      )
      ORDER BY table_name
    `);
    console.log('Created/Verified tables:', tables.rows.map(r => r.table_name).join(', '));

    // Verify columns
    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contracts' AND column_name = 'renewal_date'
    `);
    console.log('Contracts renewal_date:', contractCols.rows.length > 0 ? '✓' : '✗');

    const calendarCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'calendar_integrations' AND column_name = 'tokens'
    `);
    console.log('Calendar tokens:', calendarCols.rows.length > 0 ? '✓' : '✗');

    const activityCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'activities' AND column_name = 'assigned_to_id'
    `);
    console.log('Activities assigned_to_id:', activityCols.rows.length > 0 ? '✓' : '✗');

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
