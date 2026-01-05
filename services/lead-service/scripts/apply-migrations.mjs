import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use environment variables from .env
import 'dotenv/config';

const connectionString = `postgresql://${encodeURIComponent(process.env.POSTGRES_USER)}:${encodeURIComponent(process.env.POSTGRES_PASSWORD)}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}/${process.env.POSTGRES_DB}`;

console.log('Connecting to:', process.env.POSTGRES_HOST);

const sql = postgres(connectionString, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 30,
});

// Pre-requisite SQL for pipelines (needed before other migrations)
const pipelinesSQL = `
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL DEFAULT '[]',
    transitions JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipelines_tenant_id_idx ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS pipelines_is_default_idx ON pipelines(is_default);
CREATE INDEX IF NOT EXISTS pipelines_is_active_idx ON pipelines(is_active);

CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_id_idx ON pipeline_stages(tenant_id);
`;

async function executeSQL(sqlContent, name) {
  console.log(`\n=== Executing: ${name} ===`);

  // Split SQL into individual statements
  // Handle both ; and --> statement-breakpoint as separators
  const statements = sqlContent
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|DO|COMMENT|--|$))/gi)
    .map(s => s.replace(/-->.*statement-breakpoint/g, '').trim())
    .filter(s => s && !s.startsWith('--') && s.length > 5);

  let success = 0;
  let errors = 0;

  for (const stmt of statements) {
    if (!stmt || stmt.length < 5) continue;

    try {
      await sql.unsafe(stmt);
      success++;
      process.stdout.write('.');
    } catch (err) {
      if (err.message.includes('already exists') ||
          err.message.includes('duplicate') ||
          err.message.includes('does not exist') && stmt.toLowerCase().includes('drop')) {
        // Silently skip already exists errors
        success++;
        process.stdout.write('s');
      } else {
        errors++;
        console.error(`\nError: ${err.message.substring(0, 100)}`);
      }
    }
  }

  console.log(`\nCompleted: ${success} success, ${errors} errors`);
  return { success, errors };
}

async function main() {
  try {
    // Test connection first
    console.log('Testing connection...');
    const result = await sql`SELECT NOW() as time`;
    console.log('Connected at:', result[0].time);

    // 1. Apply prerequisite tables (pipelines)
    await executeSQL(pipelinesSQL, 'pipelines prereq');

    // 2. Apply migrations in order
    const drizzleDir = path.join(__dirname, '..', 'drizzle');
    const migrations = [
      '0000_careful_titania.sql',
      '0001_webhooks_scoring_migrations.sql',
      '0002_missing_tables_migration.sql',
      '0002_custom_fields_integrations_workflows.sql',
    ];

    for (const file of migrations) {
      const filePath = path.join(drizzleDir, file);
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        await executeSQL(content, file);
      } else {
        console.log(`Skipping ${file} - not found`);
      }
    }

    // 3. Verify tables
    console.log('\n=== Verifying Tables ===');
    const tables = ['leads', 'opportunities', 'customers', 'tasks', 'pipelines', 'contacts', 'webhooks', 'email_templates'];
    for (const table of tables) {
      try {
        const result = await sql`SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public' AND table_name = ${table}`;
        const exists = result[0].count > 0;
        console.log(`  ${table}: ${exists ? '✅' : '❌'}`);
      } catch (e) {
        console.log(`  ${table}: ❌ (${e.message.substring(0, 50)})`);
      }
    }

    console.log('\n=== Migration Complete ===');
  } catch (err) {
    console.error('Fatal error:', err);
  } finally {
    await sql.end();
  }
}

main();
