-- ============================================
-- Zuclubit CRM - Seed Data
-- Test data for local development
-- ============================================

-- ============================================
-- TEST TENANTS
-- ============================================

-- Demo company (Free plan)
INSERT INTO public.tenants (id, name, slug, plan, settings, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'Demo Company',
  'demo',
  'free',
  '{
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
  true
) ON CONFLICT (id) DO NOTHING;

-- Acme Corp (Professional plan)
INSERT INTO public.tenants (id, name, slug, plan, settings, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440001',
  'Acme Corporation',
  'acme',
  'professional',
  '{
    "currency": "MXN",
    "locale": "es-MX",
    "timezone": "America/Mexico_City",
    "dateFormat": "DD/MM/YYYY",
    "features": {
      "whatsapp": true,
      "cfdi": true,
      "analytics": true,
      "workflows": true,
      "ai_scoring": false
    }
  }'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- Enterprise Client (Enterprise plan)
INSERT INTO public.tenants (id, name, slug, plan, settings, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440002',
  'Enterprise Client SA de CV',
  'enterprise-client',
  'enterprise',
  '{
    "currency": "USD",
    "locale": "es-MX",
    "timezone": "America/Mexico_City",
    "dateFormat": "DD/MM/YYYY",
    "features": {
      "whatsapp": true,
      "cfdi": true,
      "analytics": true,
      "workflows": true,
      "ai_scoring": true
    }
  }'::jsonb,
  true
) ON CONFLICT (id) DO NOTHING;

-- ============================================
-- NOTE ABOUT TEST USERS
-- ============================================
-- Test users are created through Supabase Auth.
-- Use Supabase Studio or the CLI to create test users:
--
-- Email: admin@demo.com / Password: Test1234!
-- Email: manager@demo.com / Password: Test1234!
-- Email: sales@demo.com / Password: Test1234!
-- Email: viewer@demo.com / Password: Test1234!
--
-- After creating users in auth.users, their profiles
-- are automatically created via the trigger.
--
-- Then manually add them to tenant_memberships:
--
-- INSERT INTO public.tenant_memberships (user_id, tenant_id, role, status)
-- VALUES ('user-uuid', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'active');
-- ============================================

-- ============================================
-- HELPER: Create test user and profile
-- ============================================
-- This is a helper function for development only
-- DO NOT USE IN PRODUCTION

CREATE OR REPLACE FUNCTION public.create_test_user(
  test_email TEXT,
  test_password TEXT DEFAULT 'Test1234!',
  test_name TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_user_id UUID;
BEGIN
  -- Note: This function requires admin/service role access
  -- In real scenario, users are created through Supabase Auth

  -- Generate UUID for the user
  new_user_id := uuid_generate_v4();

  -- Insert into auth.users (simplified - actual auth.users has more columns)
  -- This is a placeholder - actual user creation happens through Supabase Auth API
  RAISE NOTICE 'Test user creation should be done through Supabase Auth API';
  RAISE NOTICE 'Email: %, Name: %', test_email, COALESCE(test_name, test_email);

  RETURN new_user_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- DEVELOPMENT NOTES
-- ============================================
/*
To create test users in local development:

1. Start Supabase: supabase start
2. Open Supabase Studio: http://localhost:54323
3. Go to Authentication > Users
4. Click "Add user" and create:

   User 1 (Owner):
   - Email: owner@demo.com
   - Password: Test1234!

   User 2 (Admin):
   - Email: admin@demo.com
   - Password: Test1234!

   User 3 (Manager):
   - Email: manager@demo.com
   - Password: Test1234!

   User 4 (Sales Rep):
   - Email: sales@demo.com
   - Password: Test1234!

   User 5 (Viewer):
   - Email: viewer@demo.com
   - Password: Test1234!

5. After creating users, add their memberships in SQL Editor:

   -- Get user IDs from auth.users
   SELECT id, email FROM auth.users;

   -- Add memberships (replace UUIDs with actual user IDs)
   INSERT INTO public.tenant_memberships (user_id, tenant_id, role, status)
   VALUES
     ('owner-user-id', '550e8400-e29b-41d4-a716-446655440000', 'owner', 'active'),
     ('admin-user-id', '550e8400-e29b-41d4-a716-446655440000', 'admin', 'active'),
     ('manager-user-id', '550e8400-e29b-41d4-a716-446655440000', 'manager', 'active'),
     ('sales-user-id', '550e8400-e29b-41d4-a716-446655440000', 'sales_rep', 'active'),
     ('viewer-user-id', '550e8400-e29b-41d4-a716-446655440000', 'viewer', 'active');

Or use the Supabase CLI:

   supabase auth signup --email owner@demo.com --password Test1234!
   supabase auth signup --email admin@demo.com --password Test1234!
   supabase auth signup --email manager@demo.com --password Test1234!
   supabase auth signup --email sales@demo.com --password Test1234!
   supabase auth signup --email viewer@demo.com --password Test1234!

*/
