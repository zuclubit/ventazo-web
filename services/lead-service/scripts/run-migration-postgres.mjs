import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Read migration file
const migrationPath = path.join(__dirname, '../../..', 'supabase/migrations/20251214000000_crm_tables_only.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split into statements
const statements = migrationSQL
  .split(/;\s*(?=\n|$)/g)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 10);

console.log('=== Migration via postgres library ===\n');
console.log(`Migration file: ${migrationPath}`);
console.log(`Total statements: ${statements.length}\n`);

// Try different connection configs
const configs = [
  {
    name: 'Session pooler (port 5432) with options',
    options: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      username: 'postgres.nquhpdbzwpkgnjndvpmw',
      password: process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe',
      ssl: 'require',
      connection: {
        options: `-c search_path=public`
      }
    }
  },
  {
    name: 'Transaction pooler (port 6543)',
    options: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      username: 'postgres.nquhpdbzwpkgnjndvpmw',
      password: process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe',
      ssl: 'require',
      prepare: false // Required for transaction pooler
    }
  },
  {
    name: 'Direct connection string',
    connectionString: `postgres://postgres.nquhpdbzwpkgnjndvpmw:${encodeURIComponent(process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe')}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
  }
];

async function tryConnect(config) {
  console.log(`Trying: ${config.name}...`);
  const sql = config.connectionString
    ? postgres(config.connectionString)
    : postgres(config.options);

  try {
    const result = await sql`SELECT current_database() as db, current_user as user`;
    console.log(`  ✅ Connected! DB: ${result[0].db}, User: ${result[0].user}`);
    return sql;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message.substring(0, 80)}`);
    try { await sql.end(); } catch {}
    return null;
  }
}

async function executeStatements(sql) {
  let success = 0;
  let skipped = 0;
  let errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Extract name for logging
    let name = '';
    const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    const indexMatch = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
    if (tableMatch) name = `table: ${tableMatch[1]}`;
    else if (indexMatch) name = `index: ${indexMatch[1]}`;
    else name = `stmt-${i}`;

    process.stdout.write(`  [${i + 1}/${statements.length}] ${name}... `);

    try {
      await sql.unsafe(stmt);
      console.log('✓');
      success++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('42P07') || msg.includes('42710')) {
        console.log('(exists)');
        skipped++;
      } else {
        console.log(`✗ ${msg.substring(0, 50)}`);
        errors++;
      }
    }
  }

  return { success, skipped, errors };
}

async function verifyTables(sql) {
  console.log('\n=== Verifying Tables ===');
  const tables = ['pipelines', 'leads', 'customers', 'opportunities', 'tasks', 'contacts', 'webhooks'];

  for (const table of tables) {
    try {
      const result = await sql`
        SELECT COUNT(*) as count
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      `;
      const exists = parseInt(result[0].count) > 0;
      console.log(`  ${table}: ${exists ? '✅' : '❌'}`);
    } catch (err) {
      console.log(`  ${table}: ⚠️ ${err.message.substring(0, 30)}`);
    }
  }
}

async function main() {
  let sql = null;

  // Try each connection config
  for (const config of configs) {
    sql = await tryConnect(config);
    if (sql) break;
    console.log('');
  }

  if (!sql) {
    console.error('\n❌ Could not connect with any configuration');
    console.log('\n💡 Alternative: Run the migration manually in Supabase SQL Editor');
    console.log(`   URL: https://supabase.com/dashboard/project/nquhpdbzwpkgnjndvpmw/sql/new`);
    console.log(`   File: ${migrationPath}`);
    process.exit(1);
  }

  console.log('\n=== Executing Migration ===\n');

  try {
    const { success, skipped, errors } = await executeStatements(sql);

    console.log(`\n=== Summary ===`);
    console.log(`  Success: ${success}`);
    console.log(`  Skipped (exists): ${skipped}`);
    console.log(`  Errors: ${errors}`);

    await verifyTables(sql);

    if (errors > 0) {
      console.log('\n⚠️  Some statements failed. Check errors above.');
    } else {
      console.log('\n✅ Migration completed successfully!');
    }
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
