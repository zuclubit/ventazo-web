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
    console.log('Running migration 0014 - Add remaining missing columns...');

    // 1. Add effective_date and other date columns to contracts
    console.log('1. Adding date columns to contracts...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS effective_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS expiration_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terminated_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_reason text;
    `);

    // 2. Add provider_email to calendar_integrations
    console.log('2. Adding provider_email to calendar_integrations...');
    await client.query(`
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS provider_email varchar(255);
      ALTER TABLE calendar_integrations ADD COLUMN IF NOT EXISTS provider_name varchar(255);
    `);

    // 3. Add owner_name and other columns to activities
    console.log('3. Adding owner_name to activities...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS owner_name varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by uuid;
    `);

    // 4. Ensure all contracts columns match schema
    console.log('4. Adding remaining contract schema columns...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS name varchar(255);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS type varchar(50);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS status varchar(30) DEFAULT 'draft';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS description text;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS customer_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;
    `);

    // 5. Create forecasts table if not exists
    console.log('5. Creating forecasts table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS forecasts (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        name varchar(255),
        period varchar(20) NOT NULL,
        period_start timestamp with time zone NOT NULL,
        period_end timestamp with time zone NOT NULL,
        status varchar(30) DEFAULT 'draft',
        quota integer DEFAULT 0,
        total_amount integer DEFAULT 0,
        commit_amount integer DEFAULT 0,
        best_case_amount integer DEFAULT 0,
        pipeline_amount integer DEFAULT 0,
        closed_won_amount integer DEFAULT 0,
        closed_lost_amount integer DEFAULT 0,
        notes text,
        metadata jsonb DEFAULT '{}',
        submitted_at timestamp with time zone,
        approved_at timestamp with time zone,
        approved_by uuid,
        locked_at timestamp with time zone,
        locked_by uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    // 6. Create indexes for forecasts
    console.log('6. Creating indexes for forecasts...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS forecasts_tenant_idx ON forecasts(tenant_id);
      CREATE INDEX IF NOT EXISTS forecasts_period_idx ON forecasts(period);
      CREATE INDEX IF NOT EXISTS forecasts_status_idx ON forecasts(status);
    `);
    // Try to create user_id index if column exists
    try {
      await client.query(`CREATE INDEX IF NOT EXISTS forecasts_user_idx ON forecasts(user_id);`);
    } catch (e) {
      console.log('  Note: user_id index skipped (column may not exist)');
    }

    // 7. Create forecast_items table
    console.log('7. Creating forecast_items table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS forecast_items (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        forecast_id uuid NOT NULL,
        opportunity_id uuid,
        deal_name varchar(255),
        deal_amount integer DEFAULT 0,
        category varchar(50) DEFAULT 'pipeline',
        probability integer DEFAULT 0,
        expected_close_date timestamp with time zone,
        original_category varchar(50),
        override_reason text,
        overridden_at timestamp with time zone,
        overridden_by uuid,
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    console.log('Migration 0014 completed successfully!');

    // Verify
    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contracts'
      AND column_name IN ('effective_date', 'expiration_date', 'name', 'type')
      ORDER BY column_name
    `);
    console.log('\nContract columns:', contractCols.rows.map(r => r.column_name).join(', '));

    const calendarCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'calendar_integrations'
      AND column_name = 'provider_email'
    `);
    console.log('Calendar provider_email:', calendarCols.rows.length > 0 ? 'exists' : 'missing');

    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('forecasts', 'forecast_items')
      ORDER BY table_name
    `);
    console.log('Forecast tables:', tables.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
