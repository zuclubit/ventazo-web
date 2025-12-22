-- ============================================
-- Zuclubit CRM - Migration 002
-- Row Level Security (RLS) Policies
-- Multi-tenant data isolation
-- ============================================

-- ============================================
-- ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tenant_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PROFILES POLICIES
-- ============================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Users can view profiles of users in their tenants
CREATE POLICY "Users can view tenant member profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm1
      WHERE tm1.user_id = auth.uid()
        AND tm1.status = 'active'
        AND EXISTS (
          SELECT 1 FROM public.tenant_memberships tm2
          WHERE tm2.user_id = profiles.id
            AND tm2.tenant_id = tm1.tenant_id
            AND tm2.status = 'active'
        )
    )
  );

-- ============================================
-- TENANTS POLICIES
-- ============================================

-- Users can view tenants they are members of
CREATE POLICY "Users can view their tenants"
  ON public.tenants
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_memberships tm
      WHERE tm.tenant_id = tenants.id
        AND tm.user_id = auth.uid()
        AND tm.status = 'active'
    )
  );

-- Only owners can update tenant
CREATE POLICY "Owners can update tenant"
  ON public.tenants
  FOR UPDATE
  USING (
    public.user_has_role(tenants.id, 'owner')
  )
  WITH CHECK (
    public.user_has_role(tenants.id, 'owner')
  );

-- Only owners can delete tenant
CREATE POLICY "Owners can delete tenant"
  ON public.tenants
  FOR DELETE
  USING (
    public.user_has_role(tenants.id, 'owner')
  );

-- Authenticated users can create tenants (they become owner)
CREATE POLICY "Authenticated users can create tenants"
  ON public.tenants
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- TENANT MEMBERSHIPS POLICIES
-- ============================================

-- Users can view their own memberships
CREATE POLICY "Users can view own memberships"
  ON public.tenant_memberships
  FOR SELECT
  USING (user_id = auth.uid());

-- Users can view memberships in their tenants (managers+)
CREATE POLICY "Managers can view tenant memberships"
  ON public.tenant_memberships
  FOR SELECT
  USING (
    public.user_has_role(tenant_id, 'manager')
  );

-- Admins can create memberships (invite users)
CREATE POLICY "Admins can create memberships"
  ON public.tenant_memberships
  FOR INSERT
  WITH CHECK (
    public.user_has_role(tenant_id, 'admin')
  );

-- Admins can update memberships
CREATE POLICY "Admins can update memberships"
  ON public.tenant_memberships
  FOR UPDATE
  USING (
    public.user_has_role(tenant_id, 'admin')
  )
  WITH CHECK (
    public.user_has_role(tenant_id, 'admin')
  );

-- Owners can delete memberships
CREATE POLICY "Owners can delete memberships"
  ON public.tenant_memberships
  FOR DELETE
  USING (
    public.user_has_role(tenant_id, 'owner')
  );

-- Users can leave a tenant (delete own membership, except owners)
CREATE POLICY "Users can leave tenant"
  ON public.tenant_memberships
  FOR DELETE
  USING (
    user_id = auth.uid()
    AND role != 'owner'
  );

-- ============================================
-- AUDIT LOGS POLICIES
-- ============================================

-- Users can view audit logs for their tenants (admins+)
CREATE POLICY "Admins can view tenant audit logs"
  ON public.audit_logs
  FOR SELECT
  USING (
    public.user_has_role(tenant_id, 'admin')
  );

-- System can insert audit logs
CREATE POLICY "System can insert audit logs"
  ON public.audit_logs
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================
-- HELPER FUNCTIONS FOR RLS
-- ============================================

-- Function to get user's role in a tenant
CREATE OR REPLACE FUNCTION public.get_user_role(check_tenant_id UUID)
RETURNS user_role AS $$
DECLARE
  user_role_value user_role;
BEGIN
  SELECT tm.role INTO user_role_value
  FROM public.tenant_memberships tm
  WHERE tm.user_id = auth.uid()
    AND tm.tenant_id = check_tenant_id
    AND tm.status = 'active';

  RETURN user_role_value;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all tenant IDs for current user
CREATE OR REPLACE FUNCTION public.get_user_tenant_ids()
RETURNS SETOF UUID AS $$
BEGIN
  RETURN QUERY
  SELECT tm.tenant_id
  FROM public.tenant_memberships tm
  WHERE tm.user_id = auth.uid()
    AND tm.status = 'active';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================
-- SERVICE ROLE BYPASS
-- ============================================

-- Note: Service role automatically bypasses RLS
-- This is used by the backend API (lead-service)

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON POLICY "Users can view own profile" ON public.profiles IS 'Users can always view their own profile';
COMMENT ON POLICY "Users can view tenant member profiles" ON public.profiles IS 'Users can view profiles of other members in shared tenants';
COMMENT ON POLICY "Users can view their tenants" ON public.tenants IS 'Users can only see tenants they belong to';
COMMENT ON POLICY "Owners can update tenant" ON public.tenants IS 'Only tenant owners can modify tenant settings';
COMMENT ON POLICY "Managers can view tenant memberships" ON public.tenant_memberships IS 'Managers and above can see all members';
COMMENT ON POLICY "Admins can create memberships" ON public.tenant_memberships IS 'Admins can invite new users to tenant';
