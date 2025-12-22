import postgres from 'postgres';

const connectionString = 'postgres://postgres.fngdlxipgrkpbutiqjhw:miZhuxtehvar9wyxfa@aws-0-us-west-2.pooler.supabase.com:6543/postgres';

const sql = postgres(connectionString, {
  ssl: 'require',
  max: 1,
});

async function runMigration() {
  try {
    console.log('Starting migration...');

    // Create tables one by one
    console.log('Creating opportunity_pipeline_stages table...');
    await sql`
      CREATE TABLE IF NOT EXISTS opportunity_pipeline_stages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        label VARCHAR(100) NOT NULL,
        description TEXT,
        "order" INTEGER NOT NULL DEFAULT 0,
        color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
        probability INTEGER NOT NULL DEFAULT 50,
        stage_type VARCHAR(20) NOT NULL DEFAULT 'open',
        is_default BOOLEAN NOT NULL DEFAULT false,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    console.log('Creating indexes for opportunity_pipeline_stages...');
    await sql`CREATE INDEX IF NOT EXISTS opp_pipeline_stages_tenant_id_idx ON opportunity_pipeline_stages(tenant_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_pipeline_stages_order_idx ON opportunity_pipeline_stages("order")`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_pipeline_stages_tenant_order_idx ON opportunity_pipeline_stages(tenant_id, "order")`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_pipeline_stages_type_idx ON opportunity_pipeline_stages(stage_type)`.catch(() => {});

    console.log('Creating opportunity_notes table...');
    await sql`
      CREATE TABLE IF NOT EXISTS opportunity_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        created_by UUID NOT NULL,
        content TEXT NOT NULL,
        is_pinned BOOLEAN NOT NULL DEFAULT false,
        metadata JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    console.log('Creating indexes for opportunity_notes...');
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_tenant_id_idx ON opportunity_notes(tenant_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_opportunity_id_idx ON opportunity_notes(opportunity_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_created_by_idx ON opportunity_notes(created_by)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_is_pinned_idx ON opportunity_notes(is_pinned)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_tenant_opp_idx ON opportunity_notes(tenant_id, opportunity_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_notes_created_at_idx ON opportunity_notes(created_at)`.catch(() => {});

    console.log('Creating opportunity_activity table...');
    await sql`
      CREATE TABLE IF NOT EXISTS opportunity_activity (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL,
        opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
        user_id UUID,
        action_type VARCHAR(50) NOT NULL,
        description TEXT,
        metadata JSONB NOT NULL DEFAULT '{}',
        changes JSONB NOT NULL DEFAULT '{}',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    console.log('Creating indexes for opportunity_activity...');
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_tenant_id_idx ON opportunity_activity(tenant_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_opportunity_id_idx ON opportunity_activity(opportunity_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_user_id_idx ON opportunity_activity(user_id)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_action_type_idx ON opportunity_activity(action_type)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_created_at_idx ON opportunity_activity(created_at)`.catch(() => {});
    await sql`CREATE INDEX IF NOT EXISTS opp_activity_tenant_opp_idx ON opportunity_activity(tenant_id, opportunity_id)`.catch(() => {});

    // Check if stage_id column exists on opportunities
    console.log('Checking opportunities table for stage_id column...');
    const colCheck = await sql`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'opportunities' AND column_name = 'stage_id'
    `;

    if (colCheck.length === 0) {
      console.log('Adding stage_id column to opportunities...');
      await sql`ALTER TABLE opportunities ADD COLUMN stage_id UUID REFERENCES opportunity_pipeline_stages(id) ON DELETE SET NULL`;
      await sql`CREATE INDEX IF NOT EXISTS opportunities_stage_id_idx ON opportunities(stage_id)`.catch(() => {});
    }

    console.log('Migration completed successfully!');

    // Verify tables exist
    console.log('\nVerifying tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('opportunity_pipeline_stages', 'opportunity_notes', 'opportunity_activity')
    `;
    console.log('Tables found:', tables.map(t => t.table_name));

    // Count rows
    for (const table of tables) {
      const count = await sql.unsafe(`SELECT COUNT(*) as count FROM ${table.table_name}`);
      console.log(`${table.table_name}: ${count[0].count} rows`);
    }

    // Check if we need to insert default stages for tenant
    console.log('\nChecking for default stages...');
    const tenantId = '977eaca1-295d-4ee2-8310-985a4e06c547'; // Oscar's tenant

    const existingStages = await sql`
      SELECT COUNT(*) as count FROM opportunity_pipeline_stages WHERE tenant_id = ${tenantId}
    `;

    if (parseInt(existingStages[0].count) === 0) {
      console.log('Inserting default pipeline stages for tenant...');

      const defaultStages = [
        { label: 'Prospección', description: 'Identificación inicial de oportunidades', order: 0, color: '#6366F1', probability: 10, stageType: 'open', isDefault: true },
        { label: 'Calificación', description: 'Evaluación del potencial del negocio', order: 1, color: '#8B5CF6', probability: 25, stageType: 'open', isDefault: false },
        { label: 'Propuesta', description: 'Presentación de propuesta comercial', order: 2, color: '#EC4899', probability: 50, stageType: 'open', isDefault: false },
        { label: 'Negociación', description: 'Negociación de términos y condiciones', order: 3, color: '#F59E0B', probability: 75, stageType: 'open', isDefault: false },
        { label: 'Cierre', description: 'Finalización del acuerdo', order: 4, color: '#10B981', probability: 90, stageType: 'open', isDefault: false },
        { label: 'Ganada', description: 'Oportunidad cerrada exitosamente', order: 5, color: '#22C55E', probability: 100, stageType: 'won', isDefault: false },
        { label: 'Perdida', description: 'Oportunidad no cerrada', order: 6, color: '#EF4444', probability: 0, stageType: 'lost', isDefault: false },
      ];

      for (const stage of defaultStages) {
        await sql`
          INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type, is_default)
          VALUES (${tenantId}, ${stage.label}, ${stage.description}, ${stage.order}, ${stage.color}, ${stage.probability}, ${stage.stageType}, ${stage.isDefault})
        `;
      }
      console.log(`Inserted ${defaultStages.length} default stages`);
    } else {
      console.log(`Tenant already has ${existingStages[0].count} stages`);
    }

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await sql.end();
  }
}

runMigration();
