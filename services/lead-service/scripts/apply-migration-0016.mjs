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
    console.log('Running migration 0016 - Fix remaining tables and columns...\n');

    // ==================== 1. FIX REPORTS TABLE ====================
    console.log('=== 1. FIXING REPORTS TABLE ===');

    // Drop and recreate reports table with correct schema
    await client.query(`DROP TABLE IF EXISTS reports CASCADE;`);
    await client.query(`
      CREATE TABLE reports (
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
      CREATE INDEX reports_tenant_idx ON reports(tenant_id);
      CREATE INDEX reports_type_idx ON reports(type);
      CREATE INDEX reports_template_idx ON reports(is_template);
    `);
    console.log('  Reports table recreated ✓');

    // ==================== 2. INTEGRATION HUB TABLES ====================
    console.log('\n=== 2. INTEGRATION HUB TABLES ===');

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
    console.log('  Integration hub tables ✓');

    // ==================== 3. COMMUNICATION TEMPLATES TABLE ====================
    console.log('\n=== 3. COMMUNICATION TEMPLATES TABLE ===');

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
    console.log('  Communication templates table ✓');

    // ==================== 4. CONTACTS TABLE ====================
    console.log('\n=== 4. CONTACTS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        first_name varchar(100),
        last_name varchar(100),
        full_name varchar(255),
        email varchar(255),
        phone varchar(50),
        mobile varchar(50),
        title varchar(100),
        department varchar(100),
        company varchar(255),
        company_id uuid,
        customer_id uuid,
        lead_id uuid,
        is_primary boolean DEFAULT false,
        is_decision_maker boolean DEFAULT false,
        is_active boolean DEFAULT true,
        source varchar(100),
        address_line1 varchar(255),
        address_line2 varchar(255),
        city varchar(100),
        state varchar(100),
        postal_code varchar(20),
        country varchar(100),
        notes text,
        tags jsonb DEFAULT '[]',
        social_profiles jsonb DEFAULT '{}',
        custom_fields jsonb DEFAULT '{}',
        metadata jsonb DEFAULT '{}',
        created_by uuid,
        updated_by uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS contacts_tenant_idx ON contacts(tenant_id);
      CREATE INDEX IF NOT EXISTS contacts_email_idx ON contacts(email);
      CREATE INDEX IF NOT EXISTS contacts_company_idx ON contacts(company_id);
      CREATE INDEX IF NOT EXISTS contacts_customer_idx ON contacts(customer_id);
      CREATE INDEX IF NOT EXISTS contacts_lead_idx ON contacts(lead_id);
    `);
    console.log('  Contacts table ✓');

    // ==================== 5. ROLES TABLE ====================
    console.log('\n=== 5. ROLES TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        name varchar(100) NOT NULL,
        description text,
        is_system boolean DEFAULT false,
        is_default boolean DEFAULT false,
        permissions jsonb DEFAULT '[]',
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now(),
        UNIQUE(tenant_id, name)
      );
      CREATE INDEX IF NOT EXISTS roles_tenant_idx ON roles(tenant_id);
    `);
    console.log('  Roles table ✓');

    // ==================== 6. ROLE_PERMISSIONS TABLE ====================
    console.log('\n=== 6. ROLE_PERMISSIONS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        role_id uuid NOT NULL,
        permission_id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        UNIQUE(role_id, permission_id)
      );
      CREATE INDEX IF NOT EXISTS role_permissions_tenant_idx ON role_permissions(tenant_id);
      CREATE INDEX IF NOT EXISTS role_permissions_role_idx ON role_permissions(role_id);
    `);
    console.log('  Role permissions table ✓');

    // ==================== 7. USER_ROLES TABLE ====================
    console.log('\n=== 7. USER_ROLES TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        role_id uuid NOT NULL,
        assigned_by uuid,
        assigned_at timestamp with time zone DEFAULT now(),
        expires_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        UNIQUE(tenant_id, user_id, role_id)
      );
      CREATE INDEX IF NOT EXISTS user_roles_tenant_idx ON user_roles(tenant_id);
      CREATE INDEX IF NOT EXISTS user_roles_user_idx ON user_roles(user_id);
    `);
    console.log('  User roles table ✓');

    // ==================== 8. HEALTH SCORES TABLE ====================
    console.log('\n=== 8. HEALTH SCORES TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS health_scores (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        score integer DEFAULT 0,
        previous_score integer DEFAULT 0,
        trend varchar(20) DEFAULT 'stable',
        factors jsonb DEFAULT '[]',
        risk_level varchar(20) DEFAULT 'low',
        calculated_at timestamp with time zone DEFAULT now(),
        valid_until timestamp with time zone,
        notes text,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS health_scores_tenant_idx ON health_scores(tenant_id);
      CREATE INDEX IF NOT EXISTS health_scores_customer_idx ON health_scores(customer_id);
      CREATE INDEX IF NOT EXISTS health_scores_risk_idx ON health_scores(risk_level);
    `);
    console.log('  Health scores table ✓');

    // ==================== 9. PAYMENT METHODS TABLE ====================
    console.log('\n=== 9. PAYMENT METHODS TABLE ===');

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_methods (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        customer_id uuid NOT NULL,
        type varchar(50) NOT NULL,
        provider varchar(50),
        last_four varchar(4),
        brand varchar(50),
        exp_month integer,
        exp_year integer,
        holder_name varchar(255),
        billing_address jsonb DEFAULT '{}',
        is_default boolean DEFAULT false,
        is_verified boolean DEFAULT false,
        provider_method_id varchar(255),
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS payment_methods_tenant_idx ON payment_methods(tenant_id);
      CREATE INDEX IF NOT EXISTS payment_methods_customer_idx ON payment_methods(customer_id);
    `);
    console.log('  Payment methods table ✓');

    // ==================== 10. FIX FORECASTS USER_ID ====================
    console.log('\n=== 10. FIXING FORECASTS TABLE ===');

    // Make user_id nullable or add default
    await client.query(`
      ALTER TABLE forecasts ALTER COLUMN user_id DROP NOT NULL;
    `);
    console.log('  Forecasts user_id made nullable ✓');

    // ==================== 11. SEED AVAILABLE INTEGRATIONS ====================
    console.log('\n=== 11. SEEDING AVAILABLE INTEGRATIONS ===');

    await client.query(`
      INSERT INTO available_integrations (name, code, description, category, provider, auth_type, is_active)
      VALUES
        ('Salesforce', 'salesforce', 'CRM platform integration', 'crm', 'Salesforce', 'oauth2', true),
        ('HubSpot', 'hubspot', 'Marketing and CRM platform', 'crm', 'HubSpot', 'oauth2', true),
        ('Google Calendar', 'google_calendar', 'Calendar integration', 'calendar', 'Google', 'oauth2', true),
        ('Microsoft 365', 'microsoft_365', 'Office and calendar integration', 'productivity', 'Microsoft', 'oauth2', true),
        ('Slack', 'slack', 'Team communication', 'communication', 'Slack', 'oauth2', true),
        ('Stripe', 'stripe', 'Payment processing', 'payments', 'Stripe', 'api_key', true),
        ('Twilio', 'twilio', 'SMS and voice', 'communication', 'Twilio', 'api_key', true),
        ('SendGrid', 'sendgrid', 'Email delivery', 'email', 'SendGrid', 'api_key', true)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  Available integrations seeded ✓');

    console.log('\n=== MIGRATION 0016 COMPLETED SUCCESSFULLY ===\n');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'reports', 'available_integrations', 'connected_integrations',
        'communication_templates', 'contacts', 'roles', 'role_permissions',
        'user_roles', 'health_scores', 'payment_methods'
      )
      ORDER BY table_name
    `);
    console.log('Created/Verified tables:', tables.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
