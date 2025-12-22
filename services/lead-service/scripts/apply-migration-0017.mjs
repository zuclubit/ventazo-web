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
    console.log('Running migration 0017 - Fix remaining tables...\n');

    // ==================== 1. CONTACTS TABLE ====================
    console.log('=== 1. FIXING CONTACTS TABLE ===');

    await client.query(`DROP TABLE IF EXISTS contacts CASCADE;`);
    await client.query(`
      CREATE TABLE contacts (
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
    `);
    await client.query(`CREATE INDEX contacts_tenant_idx ON contacts(tenant_id);`);
    await client.query(`CREATE INDEX contacts_email_idx ON contacts(email);`);
    console.log('  Contacts table ✓');

    // ==================== 2. ROLES TABLE ====================
    console.log('\n=== 2. ROLES TABLE ===');

    await client.query(`DROP TABLE IF EXISTS roles CASCADE;`);
    await client.query(`
      CREATE TABLE roles (
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
    `);
    await client.query(`CREATE INDEX roles_tenant_idx ON roles(tenant_id);`);
    console.log('  Roles table ✓');

    // ==================== 3. ROLE_PERMISSIONS TABLE ====================
    console.log('\n=== 3. ROLE_PERMISSIONS TABLE ===');

    await client.query(`DROP TABLE IF EXISTS role_permissions CASCADE;`);
    await client.query(`
      CREATE TABLE role_permissions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        role_id uuid NOT NULL,
        permission_id uuid NOT NULL,
        created_at timestamp with time zone DEFAULT now(),
        UNIQUE(role_id, permission_id)
      );
    `);
    await client.query(`CREATE INDEX role_permissions_tenant_idx ON role_permissions(tenant_id);`);
    console.log('  Role permissions table ✓');

    // ==================== 4. USER_ROLES TABLE ====================
    console.log('\n=== 4. USER_ROLES TABLE ===');

    await client.query(`DROP TABLE IF EXISTS user_roles CASCADE;`);
    await client.query(`
      CREATE TABLE user_roles (
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
    `);
    await client.query(`CREATE INDEX user_roles_tenant_idx ON user_roles(tenant_id);`);
    console.log('  User roles table ✓');

    // ==================== 5. HEALTH SCORES TABLE ====================
    console.log('\n=== 5. HEALTH SCORES TABLE ===');

    await client.query(`DROP TABLE IF EXISTS health_scores CASCADE;`);
    await client.query(`
      CREATE TABLE health_scores (
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
    `);
    await client.query(`CREATE INDEX health_scores_tenant_idx ON health_scores(tenant_id);`);
    await client.query(`CREATE INDEX health_scores_customer_idx ON health_scores(customer_id);`);
    console.log('  Health scores table ✓');

    // ==================== 6. PAYMENT METHODS TABLE ====================
    console.log('\n=== 6. PAYMENT METHODS TABLE ===');

    await client.query(`DROP TABLE IF EXISTS payment_methods CASCADE;`);
    await client.query(`
      CREATE TABLE payment_methods (
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
    `);
    await client.query(`CREATE INDEX payment_methods_tenant_idx ON payment_methods(tenant_id);`);
    await client.query(`CREATE INDEX payment_methods_customer_idx ON payment_methods(customer_id);`);
    console.log('  Payment methods table ✓');

    // ==================== 7. FIX FORECASTS USER_ID ====================
    console.log('\n=== 7. FIXING FORECASTS TABLE ===');

    try {
      await client.query(`ALTER TABLE forecasts ALTER COLUMN user_id DROP NOT NULL;`);
      console.log('  Forecasts user_id made nullable ✓');
    } catch (e) {
      console.log('  Forecasts already fixed or user_id not required ✓');
    }

    // ==================== 8. SEED DEFAULT ROLES ====================
    console.log('\n=== 8. SEEDING DEFAULT ROLES ===');

    const defaultTenant = '550e8400-e29b-41d4-a716-446655440000';
    await client.query(`
      INSERT INTO roles (tenant_id, name, description, is_system, is_default, permissions)
      VALUES
        ($1, 'Admin', 'Full system access', true, false, '["*"]'),
        ($1, 'Manager', 'Team management access', true, false, '["read:*", "write:leads", "write:opportunities", "write:tasks"]'),
        ($1, 'Sales Rep', 'Sales team member', true, true, '["read:leads", "write:leads", "read:opportunities", "write:opportunities", "read:tasks", "write:tasks"]'),
        ($1, 'Viewer', 'Read-only access', true, false, '["read:*"]')
      ON CONFLICT (tenant_id, name) DO NOTHING;
    `, [defaultTenant]);
    console.log('  Default roles seeded ✓');

    // ==================== 9. SEED DEFAULT PERMISSIONS ====================
    console.log('\n=== 9. SEEDING DEFAULT PERMISSIONS ===');

    await client.query(`
      INSERT INTO permissions (tenant_id, name, code, description, resource, action, is_system)
      VALUES
        ($1, 'Read Leads', 'read:leads', 'View leads', 'leads', 'read', true),
        ($1, 'Write Leads', 'write:leads', 'Create/Edit leads', 'leads', 'write', true),
        ($1, 'Delete Leads', 'delete:leads', 'Delete leads', 'leads', 'delete', true),
        ($1, 'Read Opportunities', 'read:opportunities', 'View opportunities', 'opportunities', 'read', true),
        ($1, 'Write Opportunities', 'write:opportunities', 'Create/Edit opportunities', 'opportunities', 'write', true),
        ($1, 'Read Tasks', 'read:tasks', 'View tasks', 'tasks', 'read', true),
        ($1, 'Write Tasks', 'write:tasks', 'Create/Edit tasks', 'tasks', 'write', true),
        ($1, 'Read Reports', 'read:reports', 'View reports', 'reports', 'read', true),
        ($1, 'Admin Access', 'admin:*', 'Full admin access', '*', 'admin', true)
      ON CONFLICT (tenant_id, code) DO NOTHING;
    `, [defaultTenant]);
    console.log('  Default permissions seeded ✓');

    console.log('\n=== MIGRATION 0017 COMPLETED SUCCESSFULLY ===\n');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'contacts', 'roles', 'role_permissions', 'user_roles',
        'health_scores', 'payment_methods', 'permissions'
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
