import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

// Read the migration file
const migrationPath = path.join(__dirname, '../../..', 'supabase/migrations/20251214000000_crm_tables_only.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

// Split into individual statements
const statements = migrationSQL
  .split(/;(?=\s*(?:CREATE|ALTER|DROP|--|$))/gi)
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--') && s.length > 10);

console.log(`=== Executing Migration via Supabase REST API ===`);
console.log(`Supabase URL: ${supabaseUrl}`);
console.log(`Statements to execute: ${statements.length}\n`);

// Execute each statement via the Supabase SQL endpoint
async function executeSingleStatement(sql, index) {
  try {
    // Use the Supabase PostgREST endpoint with raw SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`,
        'apikey': supabaseKey,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// First, create the exec_sql function
const createExecSqlFunction = `
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$
`;

async function main() {
  // Try to create tables one by one using the Supabase Management API
  // Since we can't execute raw SQL directly, let's use a different approach

  console.log('Attempting to create tables via Supabase API...\n');

  // For each CREATE TABLE statement, extract table info
  let successCount = 0;
  let errorCount = 0;
  let skipCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    const tableName = stmt.match(/CREATE (?:TABLE|INDEX) IF NOT EXISTS (\w+)/i)?.[1] || `stmt-${i}`;

    // Skip index statements for now
    if (stmt.toLowerCase().includes('create index')) {
      skipCount++;
      continue;
    }

    process.stdout.write(`  ${tableName}... `);

    const result = await executeSingleStatement(stmt, i);

    if (result.success) {
      console.log('✓');
      successCount++;
    } else if (result.error.includes('already exists') || result.error.includes('42P07')) {
      console.log('(exists)');
      skipCount++;
    } else if (result.error.includes('does not exist') || result.error.includes('42883')) {
      // Function doesn't exist, we need another approach
      console.log('⚠️ (need SQL editor)');
      errorCount++;
    } else {
      console.log(`✗ ${result.error.substring(0, 50)}`);
      errorCount++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Success: ${successCount}`);
  console.log(`Skipped: ${skipCount}`);
  console.log(`Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log(`\n⚠️  Some statements failed. Please run the migration manually:`);
    console.log(`    1. Go to ${supabaseUrl.replace('.supabase.co', '.supabase.co/dashboard')}/project/nquhpdbzwpkgnjndvpmw/sql`);
    console.log(`    2. Open file: ${migrationPath}`);
    console.log(`    3. Copy the SQL content and paste it in the SQL Editor`);
    console.log(`    4. Click "Run" to execute\n`);
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
