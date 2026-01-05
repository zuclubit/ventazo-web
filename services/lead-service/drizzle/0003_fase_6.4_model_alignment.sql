-- ============================================
-- FASE 6.4 — Model Alignment Migration
-- Corrección de discrepancias backend/frontend
-- ============================================

-- ============================================
-- 1. CUSTOMERS — Agregar campos tier y type
-- ============================================

-- Add customer tier column
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS tier VARCHAR(50) NOT NULL DEFAULT 'standard';

-- Add customer type column
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'company';

-- Add index for tier filtering
CREATE INDEX IF NOT EXISTS customers_tier_idx ON customers(tier);

-- Add index for type filtering
CREATE INDEX IF NOT EXISTS customers_type_idx ON customers(type);

-- Add compound index for tenant + tier
CREATE INDEX IF NOT EXISTS customers_tenant_tier_idx ON customers(tenant_id, tier);

-- Add compound index for tenant + type
CREATE INDEX IF NOT EXISTS customers_tenant_type_idx ON customers(tenant_id, type);

-- ============================================
-- 2. CUSTOMERS — Unificar naming de campos
-- Agregar displayName y fullName para mayor flexibilidad
-- ============================================

-- Add display_name column (para mostrar en UI)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS display_name VARCHAR(255);

-- Add full_name column (nombre de contacto principal)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS full_name VARCHAR(255);

-- Add lifetime_value column (frontend ya lo espera)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS lifetime_value INTEGER DEFAULT 0;

-- Add total_revenue column (frontend ya lo espera)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS total_revenue INTEGER DEFAULT 0;

-- Add last_purchase_date column (frontend ya lo espera)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS last_purchase_date TIMESTAMPTZ;

-- Add address JSONB column (frontend ya lo espera)
ALTER TABLE customers
ADD COLUMN IF NOT EXISTS address JSONB DEFAULT '{}';

-- Migrate existing data: set display_name from name or company_name
UPDATE customers
SET display_name = COALESCE(name, company_name)
WHERE display_name IS NULL;

-- Set lifetime_value from contract_value if empty
UPDATE customers
SET lifetime_value = COALESCE(contract_value, 0)
WHERE lifetime_value = 0 OR lifetime_value IS NULL;

-- ============================================
-- 3. OPPORTUNITIES — Agregar campo priority
-- ============================================

-- Add priority column
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';

-- Add index for priority filtering
CREATE INDEX IF NOT EXISTS opportunities_priority_idx ON opportunities(priority);

-- Add compound index for tenant + priority
CREATE INDEX IF NOT EXISTS opportunities_tenant_priority_idx ON opportunities(tenant_id, priority);

-- Add contact_id column if missing
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS contact_id UUID;

-- Add metadata JSONB column for frontend compatibility
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ============================================
-- 4. CUSTOMERS — Ensure mrr and contract_value exist with proper defaults
-- ============================================

-- Ensure mrr has proper default
ALTER TABLE customers
ALTER COLUMN mrr SET DEFAULT 0;

-- Ensure contract_value has proper default
ALTER TABLE customers
ALTER COLUMN contract_value SET DEFAULT 0;

-- Update NULL values
UPDATE customers SET mrr = 0 WHERE mrr IS NULL;
UPDATE customers SET contract_value = 0 WHERE contract_value IS NULL;

-- ============================================
-- 5. Add constraints for enum values
-- ============================================

-- Customer tier constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_tier_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_tier_check
    CHECK (tier IN ('enterprise', 'premium', 'standard', 'basic'));
  END IF;
END $$;

-- Customer type constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_type_check'
  ) THEN
    ALTER TABLE customers
    ADD CONSTRAINT customers_type_check
    CHECK (type IN ('company', 'individual'));
  END IF;
END $$;

-- Customer status constraint (update to include inactive)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'customers_status_check'
  ) THEN
    ALTER TABLE customers DROP CONSTRAINT customers_status_check;
  END IF;

  ALTER TABLE customers
  ADD CONSTRAINT customers_status_check
  CHECK (status IN ('active', 'inactive', 'at_risk', 'churned'));
END $$;

-- Opportunity priority constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'opportunities_priority_check'
  ) THEN
    ALTER TABLE opportunities
    ADD CONSTRAINT opportunities_priority_check
    CHECK (priority IN ('low', 'medium', 'high', 'critical'));
  END IF;
END $$;

-- ============================================
-- 6. Create views for API responses
-- ============================================

-- Customer summary view for list endpoints
CREATE OR REPLACE VIEW customer_summary AS
SELECT
  c.id,
  c.tenant_id,
  c.lead_id,
  COALESCE(c.display_name, c.name, c.company_name) as display_name,
  c.company_name,
  c.full_name,
  c.email,
  c.phone,
  c.website,
  c.industry,
  c.employee_count,
  c.annual_revenue,
  c.status,
  c.type,
  c.tier,
  c.account_manager_id,
  c.contract_value,
  c.mrr,
  c.lifetime_value,
  c.total_revenue,
  c.last_purchase_date,
  c.address,
  c.notes,
  c.custom_fields,
  c.tags,
  c.contract_start_date,
  c.contract_end_date,
  c.renewal_date,
  c.churned_at,
  c.converted_at,
  c.created_at,
  c.updated_at,
  -- Computed counts
  (SELECT COUNT(*) FROM opportunities o WHERE o.customer_id = c.id) as opportunity_count,
  (SELECT COUNT(*) FROM tasks t WHERE t.customer_id = c.id) as task_count
FROM customers c;

-- ============================================
-- 7. Migration metadata
-- ============================================

-- Create migrations tracking table if not exists
CREATE TABLE IF NOT EXISTS drizzle_migrations (
  id SERIAL PRIMARY KEY,
  hash TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Record this migration
INSERT INTO drizzle_migrations (hash)
VALUES ('0003_fase_6.4_model_alignment')
ON CONFLICT DO NOTHING;

-- ============================================
-- Migration complete
-- ============================================
