import postgres from 'postgres';
import 'dotenv/config';

const password = process.env.POSTGRES_PASSWORD;
const projectRef = 'nquhpdbzwpkgnjndvpmw';

console.log('=== Testing ALL Connection Formats ===\n');
console.log(`Password: ${password?.substring(0, 5)}...${password?.slice(-3)}`);
console.log(`Project Ref: ${projectRef}\n`);

const configs = [
  // Session pooler formats
  {
    name: '1. Session pooler (5432) - postgres.projectref',
    opts: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      username: `postgres.${projectRef}`,
      password,
      ssl: 'require',
    }
  },
  {
    name: '2. Transaction pooler (6543) - postgres.projectref',
    opts: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 6543,
      database: 'postgres',
      username: `postgres.${projectRef}`,
      password,
      ssl: 'require',
      prepare: false,
    }
  },
  // Try with different SSL settings
  {
    name: '3. Session pooler - SSL object',
    opts: {
      host: 'aws-0-us-east-1.pooler.supabase.com',
      port: 5432,
      database: 'postgres',
      username: `postgres.${projectRef}`,
      password,
      ssl: { rejectUnauthorized: false },
    }
  },
  // Try connection string format
  {
    name: '4. Connection string format',
    connectionString: `postgresql://postgres.${projectRef}:${password}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
  },
  // Try URL encoded
  {
    name: '5. URL encoded username',
    connectionString: `postgresql://postgres%2E${projectRef}:${encodeURIComponent(password)}@aws-0-us-east-1.pooler.supabase.com:5432/postgres?sslmode=require`
  },
  // Try direct db connection
  {
    name: '6. Direct DB (db.projectref.supabase.co)',
    opts: {
      host: `db.${projectRef}.supabase.co`,
      port: 5432,
      database: 'postgres',
      username: 'postgres',
      password,
      ssl: 'require',
    }
  },
];

for (const config of configs) {
  process.stdout.write(`${config.name}... `);

  const sql = config.connectionString
    ? postgres(config.connectionString)
    : postgres(config.opts);

  try {
    const result = await sql`SELECT 1 as ok`;
    console.log('✅ SUCCESS!');

    // If successful, show more info
    const info = await sql`SELECT current_database() as db, current_user as usr`;
    console.log(`   → DB: ${info[0].db}, User: ${info[0].usr}`);
    await sql.end();

    console.log('\n🎉 Found working connection!\n');
    process.exit(0);
  } catch (err) {
    console.log(`❌ ${err.message.substring(0, 50)}`);
    try { await sql.end(); } catch {}
  }
}

console.log('\n❌ All connection methods failed');
process.exit(1);
