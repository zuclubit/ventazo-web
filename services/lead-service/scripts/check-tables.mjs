import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

const tablesToCheck = [
  'tenants', 'users', 'user_invitations',
  'leads', 'customers', 'opportunities', 'tasks',
  'contacts', 'pipelines', 'webhooks', 'notes',
  'email_templates', 'scoring_rules', 'quotes',
  'calendar_events', 'workflow_definitions'
];

console.log('=== Checking Table Existence via REST API ===\n');
console.log('Supabase URL:', supabaseUrl);

for (const table of tablesToCheck) {
  try {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(0);

    if (error) {
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        console.log(`  ${table}: ❌ NOT EXISTS`);
      } else if (error.code === 'PGRST200') {
        console.log(`  ${table}: ❌ NOT EXISTS (no permission)`);
      } else {
        console.log(`  ${table}: ⚠️  ${error.code}: ${error.message.substring(0, 40)}`);
      }
    } else {
      console.log(`  ${table}: ✅ EXISTS`);
    }
  } catch (err) {
    console.log(`  ${table}: ❌ ERROR: ${err.message.substring(0, 40)}`);
  }
}

console.log('\n=== Done ===');
