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
    console.log('Running migration 0011 - Add missing columns for contracts and activities...');

    // 1. Add customer_name to contracts table
    console.log('1. Adding customer_name to contracts...');
    await client.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS customer_name varchar(255)
    `);

    // 2. Set default value for existing rows
    console.log('2. Setting default customer_name for existing contracts...');
    await client.query(`
      UPDATE contracts
      SET customer_name = 'Unknown Customer'
      WHERE customer_name IS NULL
    `);

    // 3. Add subject to activities table
    console.log('3. Adding subject to activities...');
    await client.query(`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS subject varchar(500)
    `);

    // 4. Set default value for existing rows
    console.log('4. Setting default subject for existing activities...');
    await client.query(`
      UPDATE activities
      SET subject = COALESCE(
        type || ' - ' || entity_type,
        'Activity'
      )
      WHERE subject IS NULL
    `);

    // 5. Add other potentially missing columns for contracts
    console.log('5. Adding additional contract columns...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS vendor_name varchar(255);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS recurring_value integer;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS billing_frequency varchar(20);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS payment_terms varchar(50);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS signed_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terminated_date timestamp with time zone;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS termination_reason text;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_notice_days integer DEFAULT 30;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS parent_contract_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS related_opportunity_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS assigned_to jsonb DEFAULT '[]';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terms_and_conditions text;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_terms jsonb DEFAULT '{}';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';
    `);

    // 6. Add other potentially missing columns for activities
    console.log('6. Adding additional activity columns...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS subtype varchar(100);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS direction varchar(20);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS start_time timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS end_time timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS duration_minutes integer;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS scheduled_at timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome varchar(100);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome_notes text;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS location varchar(500);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS meeting_link text;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_to jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_at timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS assigned_to uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS created_by uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS source varchar(50);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS thread_id varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';
    `);

    // 7. Create indexes
    console.log('7. Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS activities_subject_idx ON activities(subject);
      CREATE INDEX IF NOT EXISTS activities_direction_idx ON activities(direction);
      CREATE INDEX IF NOT EXISTS activities_scheduled_at_idx ON activities(scheduled_at);
      CREATE INDEX IF NOT EXISTS contracts_customer_name_idx ON contracts(customer_name);
      CREATE INDEX IF NOT EXISTS contracts_vendor_id_idx ON contracts(vendor_id);
    `);

    console.log('Migration 0011 completed successfully!');

    // Verify columns
    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contracts'
      AND column_name IN ('customer_name', 'vendor_name', 'auto_renew')
      ORDER BY column_name
    `);
    console.log('\nVerified contract columns:', contractCols.rows.map(r => r.column_name).join(', '));

    const activityCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'activities'
      AND column_name IN ('subject', 'subtype', 'direction', 'participants')
      ORDER BY column_name
    `);
    console.log('Verified activity columns:', activityCols.rows.map(r => r.column_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
