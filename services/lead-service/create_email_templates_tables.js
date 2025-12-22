const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'leads',
  user: 'postgres',
  password: 'postgres'
});

async function createTables() {
  const client = await pool.connect();
  try {
    // Create email_templates table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_templates (
        id UUID PRIMARY KEY,
        tenant_id UUID NOT NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) DEFAULT 'transactional',
        status VARCHAR(50) DEFAULT 'draft',
        subject VARCHAR(500) NOT NULL,
        preheader VARCHAR(500),
        blocks JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        html TEXT,
        thumbnail VARCHAR(500),
        tags TEXT[] DEFAULT '{}',
        current_version INTEGER DEFAULT 1,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        last_used_at TIMESTAMP WITH TIME ZONE,
        usage_count INTEGER DEFAULT 0
      );
    `);
    console.log('Created email_templates table');

    // Create indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(category);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_status ON email_templates(status);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_templates_tags ON email_templates USING GIN(tags);`);
    console.log('Created email_templates indexes');

    // Create email_template_versions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS email_template_versions (
        id UUID PRIMARY KEY,
        template_id UUID NOT NULL REFERENCES email_templates(id) ON DELETE CASCADE,
        version_number INTEGER NOT NULL,
        subject VARCHAR(500) NOT NULL,
        preheader VARCHAR(500),
        blocks JSONB DEFAULT '[]',
        settings JSONB DEFAULT '{}',
        html TEXT,
        change_description TEXT,
        created_by UUID NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(template_id, version_number)
      );
    `);
    console.log('Created email_template_versions table');

    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_template_versions_template ON email_template_versions(template_id);`);
    console.log('Created email_template_versions index');

    console.log('All tables created successfully!');
  } finally {
    client.release();
    await pool.end();
  }
}

createTables().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
