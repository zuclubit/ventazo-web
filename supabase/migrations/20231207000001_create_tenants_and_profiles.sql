-- ============================================
-- Zuclubit CRM - Migration 001
-- Create Tenants and User Profiles Tables
-- Multi-tenant architecture with RBAC
-- ============================================

-- Enable UUID extension (in extensions schema for Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;

-- ============================================
-- ENUMS
-- ============================================

-- User roles enum
CREATE TYPE user_role AS ENUM (
  'owner',
  'admin',
  'manager',
  'sales_rep',
  'viewer'
);

-- Tenant plan enum
CREATE TYPE tenant_plan AS ENUM (
  'free',
  'starter',
  'professional',
  'enterprise'
);

-- Membership status enum
CREATE TYPE membership_status AS ENUM (
  'active',
  'invited',
  'suspended',
  'removed'
);

-- ============================================
-- TABLES
-- ============================================

-- Tenants table (Organizations/Companies)
CREATE TABLE public.tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan tenant_plan NOT NULL DEFAULT 'free',
  settings JSONB DEFAULT '{
    "currency": "MXN",
    "locale": "es-MX",
    "timezone": "America/Mexico_City",
    "dateFormat": "DD/MM/YYYY",
    "features": {
      "whatsapp": false,
      "cfdi": false,
      "analytics": false,
      "workflows": false,
      "ai_scoring": false
    }
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trial_ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  avatar_url TEXT,
  phone VARCHAR(50),
  preferences JSONB DEFAULT '{
    "theme": "system",
    "notifications": {
      "email": true,
      "push": true,
      "sms": false
    },
    "language": "es"
  }'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tenant memberships table (user-tenant relationship with role)
CREATE TABLE public.tenant_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  role user_role NOT NULL DEFAULT 'viewer',
  status membership_status NOT NULL DEFAULT 'active',
  permissions JSONB DEFAULT '[]'::jsonb, -- Additional custom permissions
  invited_by UUID REFERENCES public.profiles(id),
  invited_at TIMESTAMPTZ,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Audit log table
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenants indexes
CREATE INDEX idx_tenants_slug ON public.tenants(slug);
CREATE INDEX idx_tenants_plan ON public.tenants(plan);
CREATE INDEX idx_tenants_is_active ON public.tenants(is_active);

-- Profiles indexes
CREATE INDEX idx_profiles_email ON public.profiles(email);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);

-- Tenant memberships indexes
CREATE INDEX idx_tenant_memberships_user_id ON public.tenant_memberships(user_id);
CREATE INDEX idx_tenant_memberships_tenant_id ON public.tenant_memberships(tenant_id);
CREATE INDEX idx_tenant_memberships_role ON public.tenant_memberships(role);
CREATE INDEX idx_tenant_memberships_status ON public.tenant_memberships(status);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_tenant_id ON public.audit_logs(tenant_id);
CREATE INDEX idx_audit_logs_user_id ON public.audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX idx_audit_logs_entity_type ON public.audit_logs(entity_type);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's current tenant
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  tenant_id UUID;
BEGIN
  SELECT tm.tenant_id INTO tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.user_id = auth.uid()
    AND tm.status = 'active'
  ORDER BY tm.joined_at ASC
  LIMIT 1;

  RETURN tenant_id;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user has role in tenant
CREATE OR REPLACE FUNCTION public.user_has_role(
  check_tenant_id UUID,
  required_role user_role
)
RETURNS BOOLEAN AS $$
DECLARE
  user_role_value user_role;
  role_hierarchy TEXT[] := ARRAY['viewer', 'sales_rep', 'manager', 'admin', 'owner'];
BEGIN
  SELECT tm.role INTO user_role_value
  FROM public.tenant_memberships tm
  WHERE tm.user_id = auth.uid()
    AND tm.tenant_id = check_tenant_id
    AND tm.status = 'active';

  IF user_role_value IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN array_position(role_hierarchy, user_role_value::TEXT) >=
         array_position(role_hierarchy, required_role::TEXT);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check if user is member of tenant
CREATE OR REPLACE FUNCTION public.is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.tenant_memberships tm
    WHERE tm.user_id = auth.uid()
      AND tm.tenant_id = check_tenant_id
      AND tm.status = 'active'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Update timestamps triggers
CREATE TRIGGER set_tenants_updated_at
  BEFORE UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_tenant_memberships_updated_at
  BEFORE UPDATE ON public.tenant_memberships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create profile on user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.tenants IS 'Organizations/companies in the CRM (multi-tenant)';
COMMENT ON TABLE public.profiles IS 'User profiles extending Supabase auth.users';
COMMENT ON TABLE public.tenant_memberships IS 'User-tenant relationships with RBAC';
COMMENT ON TABLE public.audit_logs IS 'Audit trail for compliance and debugging';

COMMENT ON FUNCTION public.get_user_tenant_id() IS 'Gets the current users default tenant ID';
COMMENT ON FUNCTION public.user_has_role(UUID, user_role) IS 'Checks if user has at least the specified role in tenant';
COMMENT ON FUNCTION public.is_tenant_member(UUID) IS 'Checks if user is an active member of tenant';
