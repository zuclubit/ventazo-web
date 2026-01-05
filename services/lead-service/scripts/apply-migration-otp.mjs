import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Use environment variables or defaults for production Supabase
const sql = postgres({
  host: process.env.POSTGRES_HOST || 'aws-0-us-west-2.pooler.supabase.com',
  port: parseInt(process.env.POSTGRES_PORT || '6543'),
  database: process.env.POSTGRES_DB || 'postgres',
  username: process.env.POSTGRES_USER || 'postgres.fngdlxipgrkpbutiqjhw',
  password: process.env.POSTGRES_PASSWORD || 'miZhuxtehvar9wyxfa',
  ssl: 'require',
});

async function executeSQL(content, name) {
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
  console.log('Connecting to database...');

  try {
    const result = await sql`SELECT NOW() as time`;
    console.log('Connected at:', result[0].time);
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }

  try {
    // Apply OTP migration
    const migrationPath = path.join(__dirname, '..', 'drizzle', '0009_otp_verification.sql');

    if (fs.existsSync(migrationPath)) {
      const content = fs.readFileSync(migrationPath, 'utf8');
      await executeSQL(content, '0009_otp_verification.sql');
    } else {
      console.error('Migration file not found:', migrationPath);
      process.exit(1);
    }

    // Verify tables
    console.log('\n=== Verifying OTP Tables ===');
    const tables = ['otp_verification_tokens', 'otp_rate_limits'];
    for (const t of tables) {
      const result = await sql`
        SELECT COUNT(*) as c FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ${t}
      `;
      console.log(`  ${t}: ${result[0].c > 0 ? '✅' : '❌'}`);
    }

    // Verify functions
    console.log('\n=== Verifying OTP Functions ===');
    const functions = ['generate_otp', 'verify_otp', 'is_email_verified', 'check_otp_rate_limit'];
    for (const f of functions) {
      const result = await sql`
        SELECT COUNT(*) as c FROM information_schema.routines
        WHERE routine_schema = 'public' AND routine_name = ${f}
      `;
      console.log(`  ${f}(): ${result[0].c > 0 ? '✅' : '❌'}`);
    }

    console.log('\n=== OTP Migration Complete ===');
  } finally {
    await sql.end();
  }
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
