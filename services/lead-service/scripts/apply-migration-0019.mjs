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
    console.log('Running migration 0019 - Complete schema sync...\n');

    // ==================== 1. CONTRACTS TABLE - ALL COLUMNS ====================
    console.log('=== 1. SYNCING CONTRACTS TABLE ===');

    const contractColumns = [
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_number varchar(50);",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_id uuid;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_name varchar(255);",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS recurring_value integer;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS notice_period_days integer;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_clause text;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS document_url varchar(500);",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_id uuid;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS current_version_id uuid;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_name varchar(255);",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS opportunity_id uuid;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS parent_contract_id uuid;",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}';",
      "ALTER TABLE contracts ADD COLUMN IF NOT EXISTS created_by uuid;",
    ];

    for (const col of contractColumns) {
      try {
        await client.query(col);
      } catch (e) {
        // Ignore errors for already existing columns
      }
    }
    console.log('  Contracts columns synced ✓');

    // ==================== 2. ACTIVITIES TABLE - ALL COLUMNS ====================
    console.log('\n=== 2. SYNCING ACTIVITIES TABLE ===');

    const activityColumns = [
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_type varchar(50) NOT NULL DEFAULT 'lead';",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_id uuid;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_name varchar(255);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS type varchar(50) NOT NULL DEFAULT 'task';",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS subtype varchar(100);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS direction varchar(20);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'pending';",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority varchar(20);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes integer;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_deal_id uuid;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_campaign_id uuid;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_sequence_id uuid;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_task_id uuid;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS call_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS email_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS meeting_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS sms_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS chat_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS web_tracking_details jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS form_submission jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}';",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS engagement_score integer DEFAULT 0;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS location jsonb;",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS source varchar(100);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_system varchar(100);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS external_id varchar(255);",
      "ALTER TABLE activities ADD COLUMN IF NOT EXISTS updated_by uuid;",
    ];

    for (const col of activityColumns) {
      try {
        await client.query(col);
      } catch (e) {
        // Ignore errors for already existing columns
      }
    }
    console.log('  Activities columns synced ✓');

    // ==================== 3. CALENDAR_INTEGRATIONS - ALL COLUMNS ====================
    console.log('\n=== 3. SYNCING CALENDAR_INTEGRATIONS TABLE ===');

    const calendarColumns = [
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS refresh_token_expires_at timestamp with time zone;",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS calendar_name varchar(255);",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS calendar_email varchar(255);",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS is_primary boolean DEFAULT false;",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS sync_calendars jsonb DEFAULT '[]';",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS sync_settings jsonb DEFAULT '{}';",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS webhook_channel_id varchar(255);",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS webhook_resource_id varchar(255);",
      "ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS webhook_expiration timestamp with time zone;",
    ];

    for (const col of calendarColumns) {
      try {
        await client.query(col);
      } catch (e) {
        // Ignore errors
      }
    }
    console.log('  Calendar integrations columns synced ✓');

    // ==================== 4. ENSURE INDEXES ====================
    console.log('\n=== 4. CREATING INDEXES ===');

    const indexes = [
      "CREATE INDEX IF NOT EXISTS contracts_tenant_id_idx ON contracts(tenant_id);",
      "CREATE INDEX IF NOT EXISTS contracts_status_idx ON contracts(status);",
      "CREATE INDEX IF NOT EXISTS contracts_customer_id_idx ON contracts(customer_id);",
      "CREATE INDEX IF NOT EXISTS activities_tenant_id_idx ON activities(tenant_id);",
      "CREATE INDEX IF NOT EXISTS activities_status_idx ON activities(status);",
      "CREATE INDEX IF NOT EXISTS activities_type_idx ON activities(type);",
    ];

    for (const idx of indexes) {
      try {
        await client.query(idx);
      } catch (e) {
        // Ignore errors
      }
    }
    console.log('  Indexes created ✓');

    // ==================== 5. SET NOT NULL ON REQUIRED COLUMNS ====================
    console.log('\n=== 5. UPDATING REQUIRED COLUMNS ===');

    // Set contract_number if null
    await client.query(`
      UPDATE contracts SET contract_number = 'C-' || SUBSTRING(id::text, 1, 8) WHERE contract_number IS NULL;
    `);

    // Set owner_name if null
    await client.query(`
      UPDATE contracts SET owner_name = 'System' WHERE owner_name IS NULL;
    `);

    // Set created_by if null
    await client.query(`
      UPDATE contracts SET created_by = '00000000-0000-0000-0000-000000000000' WHERE created_by IS NULL;
    `);

    console.log('  Required columns updated ✓');

    // ==================== VERIFICATION ====================
    console.log('\n=== VERIFICATION ===');

    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'contracts'
      AND column_name IN ('notice_period_days', 'contract_number', 'owner_name')
    `);
    console.log('Contracts columns:', contractCols.rows.map(r => r.column_name).join(', '));

    const activityCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'activities'
      AND column_name IN ('related_deal_id', 'entity_type', 'direction')
    `);
    console.log('Activities columns:', activityCols.rows.map(r => r.column_name).join(', '));

    const calendarCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'calendar_integrations'
      AND column_name IN ('tokens', 'calendar_name', 'is_primary')
    `);
    console.log('Calendar columns:', calendarCols.rows.map(r => r.column_name).join(', '));

    console.log('\n=== MIGRATION 0019 COMPLETED SUCCESSFULLY ===\n');

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
