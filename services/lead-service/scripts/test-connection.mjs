import postgres from 'postgres';
import 'dotenv/config';

console.log('=== Testing Supabase Connection ===\n');
console.log(`Host: ${process.env.POSTGRES_HOST}`);
console.log(`User: ${process.env.POSTGRES_USER}`);
console.log(`Password: ${process.env.POSTGRES_PASSWORD?.substring(0, 5)}...`);

const sql = postgres({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'postgres',
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false },
  connection: {
    application_name: 'zuclubit-crm'
  }
});

try {
  const result = await sql`SELECT current_database() as db, current_user as usr, NOW() as time`;
  console.log('\n✅ Connected successfully!');
  console.log(`   Database: ${result[0].db}`);
  console.log(`   User: ${result[0].usr}`);
  console.log(`   Time: ${result[0].time}`);
  await sql.end();
} catch (err) {
  console.log('\n❌ Connection failed:', err.message);
  await sql.end();
  process.exit(1);
}
