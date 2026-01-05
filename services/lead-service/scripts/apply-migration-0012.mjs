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
    console.log('Running migration 0012 - Add remaining missing columns and tables...');

    // 1. Add total_value to contracts table (schema expects it)
    console.log('1. Adding total_value to contracts...');
    await client.query(`
      ALTER TABLE contracts
      ADD COLUMN IF NOT EXISTS total_value integer DEFAULT 0
    `);

    // 2. Add owner_id to activities table
    console.log('2. Adding owner_id to activities...');
    await client.query(`
      ALTER TABLE activities
      ADD COLUMN IF NOT EXISTS owner_id uuid
    `);

    // 3. Create calendar_integrations table
    console.log('3. Creating calendar_integrations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS calendar_integrations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        user_id uuid NOT NULL,
        provider varchar(50) NOT NULL,
        provider_account_id varchar(255),
        access_token text,
        refresh_token text,
        token_expires_at timestamp with time zone,
        calendar_id varchar(255),
        calendar_name varchar(255),
        calendar_email varchar(255),
        is_primary boolean DEFAULT false,
        sync_enabled boolean DEFAULT true,
        sync_direction varchar(50) DEFAULT 'two_way',
        status varchar(50) DEFAULT 'active',
        last_sync_at timestamp with time zone,
        sync_token text,
        settings jsonb DEFAULT '{}',
        metadata jsonb DEFAULT '{}',
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    // 4. Create indexes for calendar_integrations
    console.log('4. Creating indexes for calendar_integrations...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS calendar_integrations_tenant_idx ON calendar_integrations(tenant_id);
      CREATE INDEX IF NOT EXISTS calendar_integrations_user_idx ON calendar_integrations(user_id);
      CREATE INDEX IF NOT EXISTS calendar_integrations_provider_idx ON calendar_integrations(provider);
    `);

    // 5. Add remaining contract columns from schema
    console.log('5. Adding remaining contract columns...');
    await client.query(`
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS renewal_notice_days integer DEFAULT 30;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS parent_contract_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS related_opportunity_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS owner_id uuid;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS assigned_to jsonb DEFAULT '[]';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS documents jsonb DEFAULT '[]';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS terms_and_conditions text;
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS special_terms jsonb DEFAULT '{}';
      ALTER TABLE contracts ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]';
    `);

    // 6. Add remaining activity columns from schema
    console.log('6. Adding remaining activity columns...');
    await client.query(`
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome varchar(100);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS outcome_notes text;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS location varchar(500);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS meeting_link text;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS participants jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS related_to jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]';
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_at timestamp with time zone;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS reminder_sent boolean DEFAULT false;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS is_private boolean DEFAULT false;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS source varchar(50);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS source_id varchar(255);
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS parent_id uuid;
      ALTER TABLE activities ADD COLUMN IF NOT EXISTS thread_id varchar(255);
    `);

    // 7. Create unified_inbox_messages table if needed
    console.log('7. Creating unified_inbox_messages table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS unified_inbox_messages (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        conversation_id uuid,
        channel varchar(50) NOT NULL,
        direction varchar(20) NOT NULL DEFAULT 'inbound',
        from_address varchar(255),
        to_address varchar(255),
        subject varchar(500),
        content text,
        html_content text,
        status varchar(50) DEFAULT 'unread',
        priority varchar(20) DEFAULT 'normal',
        is_starred boolean DEFAULT false,
        is_archived boolean DEFAULT false,
        is_spam boolean DEFAULT false,
        labels jsonb DEFAULT '[]',
        attachments jsonb DEFAULT '[]',
        metadata jsonb DEFAULT '{}',
        external_id varchar(255),
        thread_id varchar(255),
        parent_message_id uuid,
        assigned_to uuid,
        lead_id uuid,
        contact_id uuid,
        customer_id uuid,
        read_at timestamp with time zone,
        responded_at timestamp with time zone,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    // 8. Create indexes for unified_inbox_messages
    console.log('8. Creating indexes for unified_inbox_messages...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS unified_inbox_messages_tenant_idx ON unified_inbox_messages(tenant_id);
      CREATE INDEX IF NOT EXISTS unified_inbox_messages_conversation_idx ON unified_inbox_messages(conversation_id);
      CREATE INDEX IF NOT EXISTS unified_inbox_messages_channel_idx ON unified_inbox_messages(channel);
      CREATE INDEX IF NOT EXISTS unified_inbox_messages_status_idx ON unified_inbox_messages(status);
    `);

    // 9. Create unified_inbox_conversations table
    console.log('9. Creating unified_inbox_conversations table...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS unified_inbox_conversations (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id uuid NOT NULL,
        subject varchar(500),
        channel varchar(50) NOT NULL,
        status varchar(50) DEFAULT 'open',
        priority varchar(20) DEFAULT 'normal',
        assigned_to uuid,
        lead_id uuid,
        contact_id uuid,
        customer_id uuid,
        participant_emails jsonb DEFAULT '[]',
        labels jsonb DEFAULT '[]',
        metadata jsonb DEFAULT '{}',
        last_message_at timestamp with time zone,
        message_count integer DEFAULT 0,
        unread_count integer DEFAULT 0,
        is_starred boolean DEFAULT false,
        is_archived boolean DEFAULT false,
        created_at timestamp with time zone DEFAULT now(),
        updated_at timestamp with time zone DEFAULT now()
      )
    `);

    console.log('Migration 0012 completed successfully!');

    // Verify
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('calendar_integrations', 'unified_inbox_messages', 'unified_inbox_conversations')
      ORDER BY table_name
    `);
    console.log('\nVerified tables:', tables.rows.map(r => r.table_name).join(', '));

    const contractCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'contracts'
      AND column_name = 'total_value'
    `);
    console.log('Contract total_value column:', contractCols.rows.length > 0 ? 'exists' : 'missing');

    const activityCols = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'activities'
      AND column_name = 'owner_id'
    `);
    console.log('Activity owner_id column:', activityCols.rows.length > 0 ? 'exists' : 'missing');

  } catch (error) {
    console.error('Migration error:', error.message);
    console.error('Full error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
