import pg from 'pg';
import 'dotenv/config';

const { Client } = pg;

console.log('=== Testing ventazo-crm Connection ===\n');

const client = new Client({
  host: process.env.POSTGRES_HOST,
  port: parseInt(process.env.POSTGRES_PORT),
  database: process.env.POSTGRES_DB,
  user: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  ssl: { rejectUnauthorized: false }
});

console.log('Host:', process.env.POSTGRES_HOST);
console.log('User:', process.env.POSTGRES_USER);
console.log('Password:', process.env.POSTGRES_PASSWORD?.substring(0, 5) + '...');

try {
  console.log('\nConnecting...');
  await client.connect();
  console.log('✅ Connected!');

  const result = await client.query('SELECT current_database() as db, current_user as usr, NOW() as time');
  console.log(`   Database: ${result.rows[0].db}`);
  console.log(`   User: ${result.rows[0].usr}`);
  console.log(`   Time: ${result.rows[0].time}`);

  await client.end();
} catch (err) {
  console.log('\n❌ Failed:', err.message);
  try { await client.end(); } catch {}
  process.exit(1);
}
