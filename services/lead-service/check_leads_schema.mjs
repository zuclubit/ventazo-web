import postgres from 'postgres';

const sql = postgres({
  host: 'aws-0-us-west-2.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  username: 'postgres.fngdlxipgrkpbutiqjhw',
  password: 'miZhuxtehvar9wyxfa',
  ssl: 'require',
});

async function main() {
  try {
    // Check leads table columns
    console.log('=== LEADS TABLE COLUMNS ===');
    const leadsColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'leads' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    leadsColumns.forEach(c => {
      const nullable = c.is_nullable === 'NO' ? 'NOT NULL' : '';
      console.log(`  ${c.column_name}: ${c.data_type} ${nullable}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sql.end();
  }
}

main();
