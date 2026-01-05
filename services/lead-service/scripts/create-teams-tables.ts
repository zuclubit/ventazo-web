/**
 * Script to create Teams, Territories, and Quotas tables
 * Run with: npx tsx scripts/create-teams-tables.ts
 */

import { config } from 'dotenv';
import pg from 'pg';

config();

const { Pool } = pg;

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
  database: process.env.POSTGRES_DB || 'leads',
  user: process.env.POSTGRES_USER || 'dev',
  password: process.env.POSTGRES_PASSWORD || 'dev123',
});

const createTablesSQL = `
-- Teams, Territories & Quotas Tables

-- ==================== Teams ====================

CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'sales' CHECK (type IN ('sales', 'support', 'marketing', 'customer_success', 'operations')),
  parent_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  manager_id UUID,
  settings JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_teams_tenant ON teams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_teams_parent ON teams(parent_team_id);
CREATE INDEX IF NOT EXISTS idx_teams_type ON teams(type);

-- Team Members
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('member', 'team_lead', 'manager', 'director', 'vp')),
  position VARCHAR(255),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_team ON team_members(team_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);

-- ==================== Territories ====================

CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'geographic' CHECK (type IN ('geographic', 'industry', 'account_size', 'product', 'named_accounts', 'hybrid')),
  parent_territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  criteria JSONB DEFAULT '{}'::jsonb,
  settings JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_territories_tenant ON territories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_territories_parent ON territories(parent_territory_id);
CREATE INDEX IF NOT EXISTS idx_territories_type ON territories(type);

-- Territory Assignments
CREATE TABLE IF NOT EXISTS territory_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  assignment_type VARCHAR(50) DEFAULT 'exclusive' CHECK (assignment_type IN ('exclusive', 'shared', 'overlay')),
  is_primary BOOLEAN DEFAULT false,
  start_date TIMESTAMPTZ DEFAULT NOW(),
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_territory_assignments_territory ON territory_assignments(territory_id);
CREATE INDEX IF NOT EXISTS idx_territory_assignments_user ON territory_assignments(user_id);

-- ==================== Quotas ====================

CREATE TABLE IF NOT EXISTS quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) DEFAULT 'revenue' CHECK (type IN ('revenue', 'deals', 'leads', 'activities', 'custom')),
  period VARCHAR(50) DEFAULT 'quarterly' CHECK (period IN ('monthly', 'quarterly', 'yearly')),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  target BIGINT NOT NULL,
  currency VARCHAR(3),
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quotas_tenant ON quotas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quotas_status ON quotas(status);
CREATE INDEX IF NOT EXISTS idx_quotas_period ON quotas(period);
CREATE INDEX IF NOT EXISTS idx_quotas_dates ON quotas(start_date, end_date);

-- Quota Assignments
CREATE TABLE IF NOT EXISTS quota_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quota_id UUID NOT NULL REFERENCES quotas(id) ON DELETE CASCADE,
  user_id UUID,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  territory_id UUID REFERENCES territories(id) ON DELETE SET NULL,
  target BIGINT NOT NULL,
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'archived')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_assignments_quota ON quota_assignments(quota_id);
CREATE INDEX IF NOT EXISTS idx_quota_assignments_user ON quota_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_quota_assignments_team ON quota_assignments(team_id);
CREATE INDEX IF NOT EXISTS idx_quota_assignments_territory ON quota_assignments(territory_id);

-- Quota Adjustments
CREATE TABLE IF NOT EXISTS quota_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES quota_assignments(id) ON DELETE CASCADE,
  amount BIGINT NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by UUID NOT NULL,
  adjusted_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quota_adjustments_assignment ON quota_adjustments(assignment_id);

-- ==================== Assignment Rules ====================

CREATE TABLE IF NOT EXISTS assignment_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  method VARCHAR(50) DEFAULT 'round_robin' CHECK (method IN ('round_robin', 'weighted', 'load_balanced', 'geographic', 'manual')),
  priority INTEGER DEFAULT 0,
  conditions JSONB DEFAULT '[]'::jsonb,
  actions JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignment_rules_tenant ON assignment_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assignment_rules_priority ON assignment_rules(priority);

-- ==================== Round Robin State ====================

CREATE TABLE IF NOT EXISTS round_robin_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  last_assigned_user_id UUID,
  last_assigned_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id)
);

-- ==================== Update Triggers ====================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';
`;

async function createTables() {
  console.log('Connecting to database...');

  try {
    const client = await pool.connect();
    console.log('Connected successfully');

    console.log('Creating tables...');
    await client.query(createTablesSQL);
    console.log('Tables created successfully!');

    // Verify tables exist
    const result = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN ('teams', 'team_members', 'territories', 'territory_assignments', 'quotas', 'quota_assignments', 'quota_adjustments', 'assignment_rules', 'round_robin_state')
      ORDER BY table_name
    `);

    console.log('\nCreated tables:');
    result.rows.forEach((row: { table_name: string }) => {
      console.log(`  - ${row.table_name}`);
    });

    client.release();
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

createTables()
  .then(() => {
    console.log('\nMigration completed successfully!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nMigration failed:', error);
    process.exit(1);
  });
