import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

console.log('=== Running CRM Migration on ventazo-crm ===\n');

// Read migration file
const migrationPath = path.join(__dirname, '../../..', 'supabase/migrations/20251214000000_crm_tables_only.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Better SQL splitting - split on semicolon followed by newline and keyword
const statements = [];
let current = '';

for (const line of migrationSQL.split('\n')) {
  const trimmed = line.trim();

  // Skip comments
  if (trimmed.startsWith('--')) continue;

  current += line + '\n';

  // If line ends with semicolon, it's end of statement
  if (trimmed.endsWith(';')) {
    const stmt = current.trim();
    if (stmt.length > 10) {
      statements.push(stmt);
    }
    current = '';
  }
}

// Add any remaining statement
if (current.trim().length > 10) {
  statements.push(current.trim());
}

console.log(`Migration file: ${path.basename(migrationPath)}`);
console.log(`Total statements: ${statements.length}\n`);

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

try {
  await client.connect();
  console.log('✅ Connected to database\n');

  let success = 0, skipped = 0, errors = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Extract name for logging
    const tableMatch = stmt.match(/CREATE TABLE IF NOT EXISTS (\w+)/i);
    const indexMatch = stmt.match(/CREATE INDEX IF NOT EXISTS (\w+)/i);
    const name = tableMatch ? `table: ${tableMatch[1]}` :
                 indexMatch ? `index: ${indexMatch[1]}` :
                 `stmt-${i + 1}`;

    process.stdout.write(`  [${i + 1}/${statements.length}] ${name}... `);

    try {
      await client.query(stmt);
      console.log('✓');
      success++;
    } catch (err) {
      const msg = err.message || '';
      if (msg.includes('already exists')) {
        console.log('(exists)');
        skipped++;
      } else {
        console.log(`✗ ${msg.substring(0, 60)}`);
        errors++;
      }
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ✅ Success: ${success}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors}`);

  // Verify tables
  console.log('\n=== Verifying Tables ===');
  const tables = ['tenants', 'pipelines', 'leads', 'customers', 'opportunities', 'tasks', 'contacts', 'webhooks', 'notes', 'workflow_definitions'];

  for (const table of tables) {
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = $1
      ) as exists
    `, [table]);
    console.log(`  ${table}: ${result.rows[0].exists ? '✅' : '❌'}`);
  }

  await client.end();

  if (errors === 0) {
    console.log('\n🎉 Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some errors');
  }
} catch (err) {
  console.error('Fatal error:', err.message);
  try { await client.end(); } catch {}
  process.exit(1);
}
