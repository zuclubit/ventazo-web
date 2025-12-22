import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationPath = path.join(__dirname, '../../..', 'supabase/migrations/20251214000000_crm_tables_only.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

const statements = migrationSQL
  .split(/;\s*(?=\n|$)/g)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 10);

console.log('=== Migration via Direct Connection ===\n');

// Try direct connection format (not pooler)
const configs = [
  {
    name: 'Direct DB connection (standard postgres user)',
    options: {
      host: 'db.nquhpdbzwpkgnjndvpmw.supabase.co',
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe',
      ssl: { rejectUnauthorized: false }
    }
  },
  {
    name: 'Direct DB with SSL require',
    options: {
      host: 'db.nquhpdbzwpkgnjndvpmw.supabase.co',
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password: process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe',
      ssl: 'require'
    }
  },
  {
    name: 'Pooler with standard postgres user',
    options: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      username: 'postgres',  // Try without project ref
      password: process.env.POSTGRES_PASSWORD || 'gojxos-Zyxcah-4vuwwe',
      ssl: 'require'
    }
  }
];

async function tryConnect(config) {
  console.log(`Trying: ${config.name}...`);
  const sql = postgres(config.options);

  try {
    const result = await sql`SELECT current_database() as db, current_user as user`;
    console.log(`  ✅ Connected! DB: ${result[0].db}, User: ${result[0].user}`);
    return sql;
  } catch (err) {
    console.log(`  ❌ Failed: ${err.message.substring(0, 100)}`);
    try { await sql.end(); } catch {}
    return null;
  }
}

async function executeStatements(sql) {
  let success = 0, skipped = 0, errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const name = stmt.match(/CREATE (?:TABLE|INDEX) IF NOT EXISTS (\w+)/i)?.[1] || `stmt-${i}`;
    process.stdout.write(`  [${i + 1}/${statements.length}] ${name}... `);

    try {
      await sql.unsafe(stmt);
      console.log('✓');
      success++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists') || msg.includes('42P07')) {
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

async function main() {
  let sql = null;

  for (const config of configs) {
    sql = await tryConnect(config);
    if (sql) break;
    console.log('');
  }

  if (!sql) {
    console.error('\n❌ All connections failed');
    console.log('\n📋 Run migration manually in Supabase SQL Editor:');
    console.log(`   1. Go to: https://supabase.com/dashboard/project/nquhpdbzwpkgnjndvpmw/sql/new`);
    console.log(`   2. Copy SQL from: ${migrationPath}`);
    console.log(`   3. Paste and click "Run"\n`);
    process.exit(1);
  }

  console.log('\n=== Executing Migration ===\n');
  const { success, skipped, errors } = await executeStatements(sql);

  console.log(`\n=== Summary ===`);
  console.log(`  Success: ${success}`);
  console.log(`  Skipped: ${skipped}`);
  console.log(`  Errors: ${errors}`);

  // Verify tables
  console.log('\n=== Verifying Tables ===');
  const tables = ['pipelines', 'leads', 'customers', 'opportunities', 'tasks'];
  for (const table of tables) {
    const result = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${table}
      ) as exists
    `;
    console.log(`  ${table}: ${result[0].exists ? '✅' : '❌'}`);
  }

  await sql.end();
  console.log('\n✅ Done!');
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
