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
    console.log('Running migration 0013 - Add missing columns to lead_communications...');

    // 1. Add channel column (alias for communication_type)
    console.log('1. Adding channel column...');
    await client.query(`
      ALTER TABLE lead_communications
      ADD COLUMN IF NOT EXISTS channel varchar(50)
    `);

    // 2. Set default channel value if null
    console.log('2. Setting default channel values...');
    await client.query(`
      UPDATE lead_communications
      SET channel = 'email'
      WHERE channel IS NULL
    `);

    // 3. Add is_read column
    console.log('3. Adding is_read column...');
    await client.query(`
      ALTER TABLE lead_communications
      ADD COLUMN IF NOT EXISTS is_read boolean DEFAULT false
    `);

    // 4. Add priority column
    console.log('4. Adding priority column...');
    await client.query(`
      ALTER TABLE lead_communications
      ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'normal'
    `);

    // 5. Add content column (alias for body)
    console.log('5. Adding content column...');
    await client.query(`
      ALTER TABLE lead_communications
      ADD COLUMN IF NOT EXISTS content text
    `);

    // 6. Set default content if null
    console.log('6. Setting default content values...');
    await client.query(`
      UPDATE lead_communications
      SET content = ''
      WHERE content IS NULL
    `);

    // 7. Add indexes
    console.log('7. Creating indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS lead_communications_channel_idx ON lead_communications(channel);
      CREATE INDEX IF NOT EXISTS lead_communications_is_read_idx ON lead_communications(is_read);
      CREATE INDEX IF NOT EXISTS lead_communications_priority_idx ON lead_communications(priority);
    `);

    console.log('Migration 0013 completed successfully!');

    // Verify
    const cols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'lead_communications'
      AND column_name IN ('channel', 'is_read', 'priority', 'content')
      ORDER BY column_name
    `);
    console.log('\nVerified columns:', cols.rows.map(r => r.column_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
