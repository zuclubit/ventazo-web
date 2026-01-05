-- Migration: 0010_pipeline_stages.sql
-- Description: Create pipeline_stages table for leads module

-- ============================================
-- PIPELINE STAGES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,

  -- Stage info
  label VARCHAR(100) NOT NULL,
  description TEXT,
  "order" INTEGER NOT NULL DEFAULT 0,
  color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',

  -- Configuration
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_id_idx ON pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_order_idx ON pipeline_stages("order");
CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_order_idx ON pipeline_stages(tenant_id, "order");

-- ============================================
-- INSERT DEFAULT STAGES FOR ALL TENANTS
-- ============================================

-- First get all unique tenant IDs from leads table
INSERT INTO pipeline_stages (tenant_id, label, description, "order", color, is_default, is_active)
SELECT DISTINCT
  l.tenant_id,
  stage.label,
  stage.description,
  stage.ord,
  stage.color,
  stage.is_default,
  true
FROM leads l
CROSS JOIN (
  VALUES
    ('Nuevo', 'Lead recien capturado', 0, '#3B82F6', true),
    ('Contactado', 'Se ha establecido contacto inicial', 1, '#8B5CF6', false),
    ('Calificado', 'Lead calificado y con interes confirmado', 2, '#14B8A6', false),
    ('Propuesta', 'Se ha enviado propuesta comercial', 3, '#F59E0B', false),
    ('Negociacion', 'En proceso de negociacion', 4, '#EC4899', false),
    ('Ganado', 'Lead convertido a cliente', 5, '#10B981', false),
    ('Perdido', 'Lead descartado o perdido', 6, '#EF4444', false)
) AS stage(label, description, ord, color, is_default)
ON CONFLICT DO NOTHING;

-- Also insert for tenants that exist but have no leads
INSERT INTO pipeline_stages (tenant_id, label, description, "order", color, is_default, is_active)
SELECT DISTINCT
  t.id,
  stage.label,
  stage.description,
  stage.ord,
  stage.color,
  stage.is_default,
  true
FROM tenants t
CROSS JOIN (
  VALUES
    ('Nuevo', 'Lead recien capturado', 0, '#3B82F6', true),
    ('Contactado', 'Se ha establecido contacto inicial', 1, '#8B5CF6', false),
    ('Calificado', 'Lead calificado y con interes confirmado', 2, '#14B8A6', false),
    ('Propuesta', 'Se ha enviado propuesta comercial', 3, '#F59E0B', false),
    ('Negociacion', 'En proceso de negociacion', 4, '#EC4899', false),
    ('Ganado', 'Lead convertido a cliente', 5, '#10B981', false),
    ('Perdido', 'Lead descartado o perdido', 6, '#EF4444', false)
) AS stage(label, description, ord, color, is_default)
WHERE NOT EXISTS (
  SELECT 1 FROM pipeline_stages ps WHERE ps.tenant_id = t.id
)
ON CONFLICT DO NOTHING;
