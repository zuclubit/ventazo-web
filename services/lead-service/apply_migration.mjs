import postgres from 'postgres';
import fs from 'fs';

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
    // Check which tables exist
    console.log('Checking existing tables...');
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('Existing tables:', tables.map(t => t.table_name).join(', '));
    
    // Read the migration file from the lead-service directory
    const migration = fs.readFileSync('./drizzle/0002_missing_tables_migration.sql', 'utf8');
    
    console.log('\nApplying migration (0002_missing_tables_migration.sql)...');
    await sql.unsafe(migration);
    console.log('Migration applied successfully!');
    
    // Verify tables were created
    const newTables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    console.log('\nTables after migration:', newTables.map(t => t.table_name).join(', '));
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error(error.stack);
  } finally {
    await sql.end();
  }
}

main();
