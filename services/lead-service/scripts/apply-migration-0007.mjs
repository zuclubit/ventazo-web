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
    console.log('Running migration 0007...');

    console.log('1. Adding stage_id column...');
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_id uuid');

    console.log('2. Adding full_name column...');
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_name varchar(255)');

    console.log('3. Adding tags column...');
    await client.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb");

    console.log('4. Adding converted_at column...');
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone');

    console.log('5. Adding converted_to_customer_id column...');
    await client.query('ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_customer_id uuid');

    console.log('6. Creating indexes...');
    await client.query('CREATE INDEX IF NOT EXISTS leads_stage_id_idx ON leads (stage_id)');
    await client.query('CREATE INDEX IF NOT EXISTS leads_tenant_stage_idx ON leads (tenant_id, stage_id)');

    console.log('7. Making company_name optional...');
    await client.query('ALTER TABLE leads ALTER COLUMN company_name DROP NOT NULL');

    console.log('Migration completed successfully!');

    const result = await client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'leads' ORDER BY ordinal_position");
    console.log('\nLeads table columns:', result.rows.map(r => r.column_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
