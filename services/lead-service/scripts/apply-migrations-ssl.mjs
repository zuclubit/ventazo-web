import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

import 'dotenv/config';

// Try different connection options
const configs = [
  {
    name: 'Direct pooler with SSL',
    options: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      username: 'postgres.nquhpdbzwpkgnjndvpmw',
      password: process.env.POSTGRES_PASSWORD,
      ssl: 'require',
    }
  },
  {
    name: 'Session pooler (port 5432)',
    options: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      username: 'postgres.nquhpdbzwpkgnjndvpmw',
      password: process.env.POSTGRES_PASSWORD,
      ssl: 'require',
    }
  },
];

async function tryConnect(config) {
  console.log(`\nTrying: ${config.name}`);
  const sql = postgres(config.options);

  try {
    const result = await sql`SELECT NOW() as time`;
    console.log('  ✅ Connected at:', result[0].time);
    return sql;
  } catch (err) {
    console.log('  ❌ Failed:', err.message.substring(0, 80));
    await sql.end();
    return null;
  }
}

async function executeSQL(sql, content, name) {
  console.log(`\n=== Executing: ${name} ===`);

  const statements = content
    .split(/;(?=\s*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE|DO|COMMENT|--|$))/gi)
    .map(s => s.replace(/-->.*statement-breakpoint/g, '').trim())
    .filter(s => s && !s.startsWith('--') && s.length > 5);

  let success = 0, errors = 0;

  for (const stmt of statements) {
    try {
      await sql.unsafe(stmt);
      success++;
      process.stdout.write('.');
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('duplicate') ||
          (msg.includes('does not exist') && stmt.toLowerCase().includes('drop'))) {
        success++;
        process.stdout.write('s');
      } else {
        errors++;
        console.error(`\n  Error: ${msg.substring(0, 100)}`);
      }
    }
  }

  console.log(`\n  ✓ ${success} success, ${errors} errors`);
}

async function main() {
  let sql = null;

  // Try each connection config
  for (const config of configs) {
    sql = await tryConnect(config);
    if (sql) break;
  }

  if (!sql) {
    console.error('\n❌ Could not connect with any configuration');
    process.exit(1);
  }

  try {
    // 1. Create pipelines (prerequisite)
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
    `;
    await executeSQL(sql, pipelinesSQL, 'pipelines prereq');

    // 2. Apply migrations
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
        await executeSQL(sql, content, file);
      }
    }

    // 3. Verify
    console.log('\n=== Verifying Tables ===');
    const tables = ['leads', 'opportunities', 'customers', 'tasks', 'pipelines', 'contacts', 'webhooks'];
    for (const t of tables) {
      const result = await sql`
        SELECT COUNT(*) as c FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      `;
      console.log(`  ${t}: ${result[0].c > 0 ? '✅' : '❌'}`);
    }

    console.log('\n=== Migration Complete ===');
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
