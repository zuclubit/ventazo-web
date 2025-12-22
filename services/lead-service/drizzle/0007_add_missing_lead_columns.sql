-- Migration: Add missing columns to leads table
-- These columns exist in the Drizzle schema but were not in the original migration

-- Add stage_id for pipeline management
ALTER TABLE leads ADD COLUMN IF NOT EXISTS stage_id uuid;

-- Add full_name if it doesn't exist (some systems might use company_name instead)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS full_name varchar(255);

-- Add tags if missing
ALTER TABLE leads ADD COLUMN IF NOT EXISTS tags jsonb DEFAULT '[]'::jsonb NOT NULL;

-- Add converted_at timestamp
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_at timestamp with time zone;

-- Add converted_to_customer_id reference
ALTER TABLE leads ADD COLUMN IF NOT EXISTS converted_to_customer_id uuid;

-- Create indexes for stage_id
CREATE INDEX IF NOT EXISTS leads_stage_id_idx ON leads (stage_id);
CREATE INDEX IF NOT EXISTS leads_tenant_stage_idx ON leads (tenant_id, stage_id);

-- Make full_name and company_name both optional (one should be provided)
-- Update constraint to allow either
ALTER TABLE leads ALTER COLUMN company_name DROP NOT NULL;

-- If full_name doesn't exist, copy from company_name as fallback
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'leads' AND column_name = 'full_name'
  ) THEN
    UPDATE leads SET full_name = COALESCE(full_name, company_name)
    WHERE full_name IS NULL AND company_name IS NOT NULL;
  END IF;
END $$;
