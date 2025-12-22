import postgres from 'postgres';

const connectionString = 'postgres://postgres.fngdlxipgrkpbutiqjhw:miZhuxtehvar9wyxfa@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function addMissingColumns() {
  try {
    console.log('Checking and adding missing columns to opportunities table...');

    // Get current columns
    const existingCols = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'opportunities'
    `;
    const columnNames = existingCols.map(c => c.column_name);
    console.log('Existing columns:', columnNames);

    // All columns that should exist based on schema
    const columnsToAdd = [
      { name: 'contact_id', sql: 'contact_id UUID' },
      { name: 'priority', sql: "priority VARCHAR(20) NOT NULL DEFAULT 'medium'" },
      { name: 'recurring_amount', sql: 'recurring_amount REAL' },
      { name: 'recurring_frequency', sql: 'recurring_frequency VARCHAR(20)' },
      { name: 'team_id', sql: 'team_id UUID' },
      { name: 'lost_reason_id', sql: 'lost_reason_id UUID' },
      { name: 'competitor_id', sql: 'competitor_id UUID' },
      { name: 'won_notes', sql: 'won_notes TEXT' },
      { name: 'campaign_id', sql: 'campaign_id UUID' },
      { name: 'last_activity_at', sql: 'last_activity_at TIMESTAMPTZ' },
      { name: 'source', sql: 'source VARCHAR(100)' },
    ];

    for (const col of columnsToAdd) {
      if (!columnNames.includes(col.name)) {
        console.log(`Adding ${col.name} column...`);
        await sql.unsafe(`ALTER TABLE opportunities ADD COLUMN ${col.sql}`).catch(e => {
          if (!e.message.includes('already exists')) {
            console.error(`Error adding ${col.name}:`, e.message);
          }
        });
      }
    }

    // Verify final state
    const finalCols = await sql`
      SELECT column_name, data_type FROM information_schema.columns
      WHERE table_name = 'opportunities'
      ORDER BY ordinal_position
    `;
    console.log('\nFinal columns:');
    finalCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type}`));

    console.log('\nDone!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    await sql.end();
  }
}

addMissingColumns();
