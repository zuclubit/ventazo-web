-- Migration: Create pipelines tables (pre-requisite for opportunities)

-- Pipelines table
CREATE TABLE IF NOT EXISTS pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    stages JSONB NOT NULL DEFAULT '[]',
    transitions JSONB NOT NULL DEFAULT '[]',
    settings JSONB NOT NULL DEFAULT '{}',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pipelines
CREATE INDEX IF NOT EXISTS pipelines_tenant_id_idx ON pipelines(tenant_id);
CREATE INDEX IF NOT EXISTS pipelines_is_default_idx ON pipelines(is_default);
CREATE INDEX IF NOT EXISTS pipelines_is_active_idx ON pipelines(is_active);

-- Pipeline stages table
CREATE TABLE IF NOT EXISTS pipeline_stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    pipeline_id UUID REFERENCES pipelines(id) ON DELETE CASCADE,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    color VARCHAR(20) NOT NULL DEFAULT '#3B82F6',
    is_default BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for pipeline stages
CREATE INDEX IF NOT EXISTS pipeline_stages_tenant_id_idx ON pipeline_stages(tenant_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_pipeline_id_idx ON pipeline_stages(pipeline_id);
CREATE INDEX IF NOT EXISTS pipeline_stages_order_idx ON pipeline_stages("order");

-- Updated at trigger
CREATE OR REPLACE FUNCTION update_pipelines_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS pipelines_updated_at ON pipelines;
CREATE TRIGGER pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW
    EXECUTE FUNCTION update_pipelines_updated_at();

DROP TRIGGER IF EXISTS pipeline_stages_updated_at ON pipeline_stages;
CREATE TRIGGER pipeline_stages_updated_at
    BEFORE UPDATE ON pipeline_stages
    FOR EACH ROW
    EXECUTE FUNCTION update_pipelines_updated_at();

-- RLS for pipelines
ALTER TABLE pipelines ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_stages ENABLE ROW LEVEL SECURITY;
