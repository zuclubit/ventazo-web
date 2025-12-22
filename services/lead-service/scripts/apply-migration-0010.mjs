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
    console.log('Running migration 0010 - Add missing columns and tables...');

    // 1. Add contract_number to contracts table
    console.log('1. Adding contract_number to contracts...');
    await client.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS contract_number varchar(100)
    `);

    // 2. Add entity_name to activities table
    console.log('2. Adding entity_name to activities...');
    await client.query(`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS entity_name varchar(255)
    `);

    // 3. Create lead_communications table if not exists
    console.log('3. Creating lead_communications table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS lead_communications (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        lead_id uuid,
        contact_id uuid,
        customer_id uuid,
        channel varchar(50) NOT NULL,
        direction varchar(20) NOT NULL DEFAULT 'outbound',
        type varchar(50),
        subject varchar(500),
        content text,
        status varchar(50) DEFAULT 'pending',
        scheduled_at timestamp with time zone,
        sent_at timestamp with time zone,
        delivered_at timestamp with time zone,
        read_at timestamp with time zone,
        responded_at timestamp with time zone,
        from_address varchar(255),
        to_address varchar(255),
        cc_addresses jsonb DEFAULT '[]',
        bcc_addresses jsonb DEFAULT '[]',
        attachments jsonb DEFAULT '[]',
        metadata jsonb DEFAULT '{}',
        external_id varchar(255),
        thread_id varchar(255),
        parent_id uuid,
        assigned_to uuid,
        created_by uuid,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    // 4. Create indexes for lead_communications
    console.log('4. Creating indexes for lead_communications...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS lead_communications_tenant_idx ON lead_communications(tenant_id);
      CREATE INDEX IF NOT EXISTS lead_communications_lead_idx ON lead_communications(lead_id);
      CREATE INDEX IF NOT EXISTS lead_communications_contact_idx ON lead_communications(contact_id);
      CREATE INDEX IF NOT EXISTS lead_communications_customer_idx ON lead_communications(customer_id);
      CREATE INDEX IF NOT EXISTS lead_communications_channel_idx ON lead_communications(channel);
      CREATE INDEX IF NOT EXISTS lead_communications_scheduled_idx ON lead_communications(scheduled_at);
    `);

    // 5. Add any missing columns to contracts
    console.log('5. Adding additional contract columns...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_type varchar(100);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS contract_value numeric(15,2);
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS currency varchar(10) DEFAULT 'USD';
    `);

    // 6. Add missing columns to activities
    console.log('6. Adding additional activity columns...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_type varchar(50);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS entity_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS activity_type varchar(50);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS status varchar(50) DEFAULT 'pending';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS priority varchar(20) DEFAULT 'medium';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS due_date timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS completed_at timestamp with time zone;
    `);

    console.log('Migration 0010 completed successfully!');

    // Verify tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('contracts', 'activities', 'lead_communications')
      ORDER BY table_name
    `);
    console.log('\nVerified tables:', tables.rows.map(r => r.table_name).join(', '));

  } catch (error) {
    console.error('Migration error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
