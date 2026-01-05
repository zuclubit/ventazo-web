-- Migration: 0011_opportunity_pipeline_tables.sql
-- Creates missing tables for opportunity pipeline functionality

-- ============================================
-- Opportunity Pipeline Stages Table
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,

    -- Stage info
    label VARCHAR(100) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',

    -- Pipeline behavior
    probability INTEGER NOT NULL DEFAULT 50,
    stage_type VARCHAR(20) NOT NULL DEFAULT 'open',

    -- Configuration
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for opportunity_pipeline_stages
CREATE INDEX IF NOT EXISTS opp_pipeline_stages_tenant_id_idx ON opportunity_pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS opp_pipeline_stages_order_idx ON opportunity_pipeline_stages("order");
CREATE INDEX IF NOT EXISTS opp_pipeline_stages_tenant_order_idx ON opportunity_pipeline_stages(tenant_id, "order");
CREATE INDEX IF NOT EXISTS opp_pipeline_stages_type_idx ON opportunity_pipeline_stages(stage_type);

-- ============================================
-- Opportunity Notes Table
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    created_by UUID NOT NULL,

    -- Note content
    content TEXT NOT NULL,
    is_pinned BOOLEAN NOT NULL DEFAULT false,

    -- Metadata
    metadata JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for opportunity_notes
CREATE INDEX IF NOT EXISTS opp_notes_tenant_id_idx ON opportunity_notes(tenant_id);
CREATE INDEX IF NOT EXISTS opp_notes_opportunity_id_idx ON opportunity_notes(opportunity_id);
CREATE INDEX IF NOT EXISTS opp_notes_created_by_idx ON opportunity_notes(created_by);
CREATE INDEX IF NOT EXISTS opp_notes_is_pinned_idx ON opportunity_notes(is_pinned);
CREATE INDEX IF NOT EXISTS opp_notes_tenant_opp_idx ON opportunity_notes(tenant_id, opportunity_id);
CREATE INDEX IF NOT EXISTS opp_notes_created_at_idx ON opportunity_notes(created_at);

-- ============================================
-- Opportunity Activity Table
-- ============================================
CREATE TABLE IF NOT EXISTS opportunity_activity (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    opportunity_id UUID NOT NULL REFERENCES opportunities(id) ON DELETE CASCADE,
    user_id UUID,

    -- Activity details
    action_type VARCHAR(50) NOT NULL,
    description TEXT,

    -- Detailed changes/metadata
    metadata JSONB NOT NULL DEFAULT '{}',
    changes JSONB NOT NULL DEFAULT '{}',

    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for opportunity_activity
CREATE INDEX IF NOT EXISTS opp_activity_tenant_id_idx ON opportunity_activity(tenant_id);
CREATE INDEX IF NOT EXISTS opp_activity_opportunity_id_idx ON opportunity_activity(opportunity_id);
CREATE INDEX IF NOT EXISTS opp_activity_user_id_idx ON opportunity_activity(user_id);
CREATE INDEX IF NOT EXISTS opp_activity_action_type_idx ON opportunity_activity(action_type);
CREATE INDEX IF NOT EXISTS opp_activity_created_at_idx ON opportunity_activity(created_at);
CREATE INDEX IF NOT EXISTS opp_activity_tenant_opp_idx ON opportunity_activity(tenant_id, opportunity_id);

-- ============================================
-- Add stageId column to opportunities if missing
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'opportunities' AND column_name = 'stage_id'
    ) THEN
        ALTER TABLE opportunities ADD COLUMN stage_id UUID REFERENCES opportunity_pipeline_stages(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS opportunities_stage_id_idx ON opportunities(stage_id);
    END IF;
END $$;

-- ============================================
-- Insert default pipeline stages for existing tenants
-- ============================================
INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type, is_default)
SELECT DISTINCT
    tenant_id,
    'Prospección',
    'Identificación inicial de oportunidades',
    0,
    '#6366F1',
    10,
    'open',
    true
FROM opportunities
WHERE NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops WHERE ops.tenant_id = opportunities.tenant_id
)
ON CONFLICT DO NOTHING;

-- Add more stages for each tenant
INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Calificación',
    'Evaluación del potencial del negocio',
    1,
    '#8B5CF6',
    25,
    'open'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Calificación'
);

INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Propuesta',
    'Presentación de propuesta comercial',
    2,
    '#EC4899',
    50,
    'open'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Propuesta'
);

INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Negociación',
    'Negociación de términos y condiciones',
    3,
    '#F59E0B',
    75,
    'open'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Negociación'
);

INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Cierre',
    'Finalización del acuerdo',
    4,
    '#10B981',
    90,
    'open'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Cierre'
);

INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Ganada',
    'Oportunidad cerrada exitosamente',
    5,
    '#22C55E',
    100,
    'won'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Ganada'
);

INSERT INTO opportunity_pipeline_stages (tenant_id, label, description, "order", color, probability, stage_type)
SELECT DISTINCT
    tenant_id,
    'Perdida',
    'Oportunidad no cerrada',
    6,
    '#EF4444',
    0,
    'lost'
FROM opportunity_pipeline_stages
WHERE label = 'Prospección'
AND NOT EXISTS (
    SELECT 1 FROM opportunity_pipeline_stages ops
    WHERE ops.tenant_id = opportunity_pipeline_stages.tenant_id AND ops.label = 'Perdida'
);
