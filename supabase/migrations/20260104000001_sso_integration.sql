-- ============================================
-- Zuclubit CRM - AGGRESSIVE SSO Migration
-- Complete removal of Supabase Auth dependency
-- ============================================
--
-- WARNING: This is a destructive migration!
-- Only run this on a clean/development environment.
--
-- Changes:
-- 1. Remove dependency on auth.users
-- 2. Convert profiles to use SSO user IDs
-- 3. Remove legacy auth triggers
-- 4. Update all functions to use SSO JWT claims
-- 5. Clean up unnecessary constraints
-- ============================================

-- ============================================
-- STEP 1: Drop triggers that depend on auth.users
-- ============================================

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ============================================
-- STEP 2: Remove foreign key to auth.users
-- ============================================

-- Remove the FK constraint from profiles to auth.users
ALTER TABLE public.profiles
DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- ============================================
-- STEP 3: Add SSO columns
-- ============================================

-- SSO user ID (the 'sub' claim from SSO JWT)
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS sso_user_id UUID;

-- SSO tenant ID for tenants table
ALTER TABLE public.tenants
ADD COLUMN IF NOT EXISTS sso_tenant_id UUID;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_profiles_sso_user_id ON public.profiles(sso_user_id);
CREATE INDEX IF NOT EXISTS idx_tenants_sso_tenant_id ON public.tenants(sso_tenant_id);

-- Comments
COMMENT ON COLUMN public.profiles.sso_user_id IS 'User ID from Zuclubit SSO (sub claim)';
COMMENT ON COLUMN public.tenants.sso_tenant_id IS 'Tenant ID from Zuclubit SSO';

-- ============================================
-- STEP 4: Update ID column to not require auth.users
-- ============================================

-- For SSO users, the profile ID will be the SSO user ID
-- No longer requires a corresponding entry in auth.users

-- Make sure ID can be any UUID (not tied to auth.users)
-- The ID column already has DEFAULT gen_random_uuid() from Supabase

-- ============================================
-- STEP 5: Drop legacy functions
-- ============================================

DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- ============================================
-- STEP 6: Create SSO-aware functions
-- ============================================

-- Function to get current user ID from JWT
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID AS $$
DECLARE
  jwt_sub TEXT;
BEGIN
  -- Get user ID from SSO JWT 'sub' claim
  jwt_sub := current_setting('request.jwt.claims', true)::json->>'sub';

  IF jwt_sub IS NOT NULL AND jwt_sub != '' THEN
    RETURN jwt_sub::UUID;
  END IF;

  -- Fallback to Supabase auth (for backwards compatibility during migration)
  RETURN auth.uid();
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get current tenant ID from JWT
CREATE OR REPLACE FUNCTION public.get_user_tenant_id()
RETURNS UUID AS $$
DECLARE
  jwt_tenant_id TEXT;
BEGIN
  -- Get tenant ID from SSO JWT claim
  jwt_tenant_id := current_setting('request.jwt.claims', true)::json->>'tenant_id';

  IF jwt_tenant_id IS NOT NULL AND jwt_tenant_id != '' THEN
    RETURN jwt_tenant_id::UUID;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check user role
CREATE OR REPLACE FUNCTION public.user_has_role(
  check_tenant_id UUID,
  required_role user_role
)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_role TEXT;
  jwt_tenant_id TEXT;
  role_hierarchy TEXT[] := ARRAY['viewer', 'sales_rep', 'manager', 'admin', 'owner'];
BEGIN
  -- Get role and tenant from SSO JWT
  jwt_role := current_setting('request.jwt.claims', true)::json->>'role';
  jwt_tenant_id := current_setting('request.jwt.claims', true)::json->>'tenant_id';

  IF jwt_role IS NULL OR jwt_tenant_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check tenant matches
  IF jwt_tenant_id::UUID != check_tenant_id THEN
    RETURN FALSE;
  END IF;

  -- Check role hierarchy
  RETURN array_position(role_hierarchy, LOWER(jwt_role)) >=
         array_position(role_hierarchy, required_role::TEXT);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to check tenant membership
CREATE OR REPLACE FUNCTION public.is_tenant_member(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  jwt_tenant_id TEXT;
BEGIN
  jwt_tenant_id := current_setting('request.jwt.claims', true)::json->>'tenant_id';

  IF jwt_tenant_id IS NOT NULL AND jwt_tenant_id != '' THEN
    RETURN jwt_tenant_id::UUID = check_tenant_id;
  END IF;

  RETURN FALSE;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- STEP 7: Create SSO user/tenant upsert functions
-- ============================================

-- Upsert user from SSO
CREATE OR REPLACE FUNCTION public.upsert_sso_user(
  p_sso_user_id UUID,
  p_email VARCHAR(255),
  p_full_name VARCHAR(255) DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  -- Try to find by SSO user ID first
  SELECT id INTO v_profile_id
  FROM public.profiles
  WHERE sso_user_id = p_sso_user_id;

  IF v_profile_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.profiles SET
      email = p_email,
      full_name = COALESCE(p_full_name, full_name),
      avatar_url = COALESCE(p_avatar_url, avatar_url),
      updated_at = NOW()
    WHERE id = v_profile_id;
    RETURN v_profile_id;
  END IF;

  -- Create new profile with SSO user ID as primary key
  INSERT INTO public.profiles (id, sso_user_id, email, full_name, avatar_url)
  VALUES (p_sso_user_id, p_sso_user_id, p_email, p_full_name, p_avatar_url)
  RETURNING id INTO v_profile_id;

  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Upsert tenant from SSO
CREATE OR REPLACE FUNCTION public.upsert_sso_tenant(
  p_sso_tenant_id UUID,
  p_name VARCHAR(255),
  p_slug VARCHAR(100)
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Try to find by SSO tenant ID
  SELECT id INTO v_tenant_id
  FROM public.tenants
  WHERE sso_tenant_id = p_sso_tenant_id;

  IF v_tenant_id IS NOT NULL THEN
    -- Update existing
    UPDATE public.tenants SET
      name = COALESCE(p_name, name),
      updated_at = NOW()
    WHERE id = v_tenant_id;
    RETURN v_tenant_id;
  END IF;

  -- Create new tenant
  INSERT INTO public.tenants (id, sso_tenant_id, name, slug)
  VALUES (p_sso_tenant_id, p_sso_tenant_id, p_name, p_slug)
  RETURNING id INTO v_tenant_id;

  RETURN v_tenant_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- STEP 8: Update RLS policies (optional - if using RLS)
-- ============================================

-- Update policies to use SSO functions instead of auth.uid()
-- This is a template - adjust based on your actual policies

-- Example: Update leads table policy
-- DROP POLICY IF EXISTS "Users can view their tenant leads" ON public.leads;
-- CREATE POLICY "Users can view their tenant leads" ON public.leads
--   FOR SELECT USING (tenant_id = get_user_tenant_id());

-- ============================================
-- STEP 9: Clean up tenant_memberships (optional)
-- ============================================

-- Since SSO is now source of truth for tenant membership,
-- we can optionally drop this table or keep it as cache

-- For aggressive cleanup, uncomment:
-- DROP TABLE IF EXISTS public.tenant_memberships CASCADE;

-- For now, just add a deprecation comment:
COMMENT ON TABLE public.tenant_memberships IS
  'DEPRECATED: SSO is now source of truth for tenant membership. This table may be removed in future.';

-- ============================================
-- Done!
-- ============================================

-- Add migration marker
COMMENT ON SCHEMA public IS 'SSO Integration completed on 2026-01-04';
