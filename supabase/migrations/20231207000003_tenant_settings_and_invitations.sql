-- ============================================
-- Zuclubit CRM - Migration 003
-- Tenant Settings and User Invitations
-- For Onboarding Flow (FASE 3)
-- ============================================

-- ============================================
-- ENUMS
-- ============================================

-- Business type enum
CREATE TYPE business_type AS ENUM (
  'dental',
  'medical',
  'automotive',
  'real_estate',
  'beauty_salon',
  'education',
  'professional_services',
  'retail',
  'restaurant',
  'fitness',
  'other'
);

-- Business size enum
CREATE TYPE business_size AS ENUM (
  'solo',
  '2_5',
  '6_10',
  '11_25',
  '26_50',
  '51_100',
  '100_plus'
);

-- Invitation status enum
CREATE TYPE invitation_status AS ENUM (
  'pending',
  'accepted',
  'expired',
  'cancelled'
);

-- Onboarding status enum
CREATE TYPE onboarding_status AS ENUM (
  'not_started',
  'profile_created',
  'business_created',
  'setup_completed',
  'team_invited',
  'completed'
);

-- ============================================
-- TABLES
-- ============================================

-- Tenant Settings table (extended configuration)
CREATE TABLE public.tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL UNIQUE REFERENCES public.tenants(id) ON DELETE CASCADE,

  -- Business Info
  business_type business_type NOT NULL DEFAULT 'other',
  business_size business_size NOT NULL DEFAULT 'solo',
  phone VARCHAR(50),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100) DEFAULT 'México',

  -- Branding
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#0066FF',
  secondary_color VARCHAR(7) DEFAULT '#00CC88',
  company_email VARCHAR(255),

  -- CRM Modules (enabled/disabled)
  modules JSONB DEFAULT '{
    "leads": true,
    "customers": true,
    "opportunities": false,
    "tasks": true,
    "calendar": false,
    "invoicing": false,
    "products": false,
    "teams": false,
    "pipelines": false,
    "marketing": false,
    "whatsapp": false,
    "reports": false
  }'::jsonb,

  -- Business Hours
  business_hours JSONB DEFAULT '{
    "monday": {"open": "09:00", "close": "18:00", "enabled": true},
    "tuesday": {"open": "09:00", "close": "18:00", "enabled": true},
    "wednesday": {"open": "09:00", "close": "18:00", "enabled": true},
    "thursday": {"open": "09:00", "close": "18:00", "enabled": true},
    "friday": {"open": "09:00", "close": "18:00", "enabled": true},
    "saturday": {"open": "09:00", "close": "14:00", "enabled": false},
    "sunday": {"open": "00:00", "close": "00:00", "enabled": false}
  }'::jsonb,

  -- Notification Preferences
  notifications JSONB DEFAULT '{
    "email_new_lead": true,
    "email_task_reminder": true,
    "email_appointment": true,
    "push_enabled": false,
    "sms_enabled": false
  }'::jsonb,

  -- Custom Fields Schema (for future use)
  custom_fields_schema JSONB DEFAULT '[]'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User Invitations table
CREATE TABLE public.user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'viewer',
  token VARCHAR(255) NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  invited_by UUID REFERENCES public.profiles(id),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate pending invitations
  CONSTRAINT unique_pending_invitation UNIQUE (tenant_id, email, status)
);

-- User Onboarding Progress table
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  status onboarding_status NOT NULL DEFAULT 'not_started',
  current_step INTEGER DEFAULT 1,
  completed_steps JSONB DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tenant settings
CREATE INDEX idx_tenant_settings_tenant_id ON public.tenant_settings(tenant_id);
CREATE INDEX idx_tenant_settings_business_type ON public.tenant_settings(business_type);

-- User invitations
CREATE INDEX idx_user_invitations_tenant_id ON public.user_invitations(tenant_id);
CREATE INDEX idx_user_invitations_email ON public.user_invitations(email);
CREATE INDEX idx_user_invitations_token ON public.user_invitations(token);
CREATE INDEX idx_user_invitations_status ON public.user_invitations(status);
CREATE INDEX idx_user_invitations_expires_at ON public.user_invitations(expires_at);

-- User onboarding
CREATE INDEX idx_user_onboarding_user_id ON public.user_onboarding(user_id);
CREATE INDEX idx_user_onboarding_status ON public.user_onboarding(status);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create tenant settings after tenant creation
CREATE OR REPLACE FUNCTION public.create_tenant_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.tenant_settings (tenant_id)
  VALUES (NEW.id)
  ON CONFLICT (tenant_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user onboarding record after profile creation
CREATE OR REPLACE FUNCTION public.create_user_onboarding()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_onboarding (user_id, status)
  VALUES (NEW.id, 'profile_created')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate invitation token
CREATE OR REPLACE FUNCTION public.generate_invitation_token()
RETURNS TEXT AS $$
DECLARE
  token TEXT;
BEGIN
  token := encode(gen_random_bytes(32), 'hex');
  RETURN token;
END;
$$ LANGUAGE plpgsql;

-- Function to accept invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS TABLE (
  success BOOLEAN,
  tenant_id UUID,
  role user_role,
  message TEXT
) AS $$
DECLARE
  v_invitation RECORD;
BEGIN
  -- Get invitation
  SELECT * INTO v_invitation
  FROM public.user_invitations
  WHERE token = p_token
    AND status = 'pending'
    AND expires_at > NOW()
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT
      FALSE::BOOLEAN,
      NULL::UUID,
      NULL::user_role,
      'Invitation not found or expired'::TEXT;
    RETURN;
  END IF;

  -- Update invitation status
  UPDATE public.user_invitations
  SET status = 'accepted',
      accepted_at = NOW(),
      updated_at = NOW()
  WHERE id = v_invitation.id;

  -- Create tenant membership
  INSERT INTO public.tenant_memberships (user_id, tenant_id, role, status, invited_by, invited_at, joined_at)
  VALUES (p_user_id, v_invitation.tenant_id, v_invitation.role, 'active', v_invitation.invited_by, v_invitation.created_at, NOW())
  ON CONFLICT (user_id, tenant_id)
  DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    joined_at = NOW(),
    updated_at = NOW();

  -- Log audit event
  INSERT INTO public.audit_logs (tenant_id, user_id, action, entity_type, entity_id, new_values)
  VALUES (v_invitation.tenant_id, p_user_id, 'invitation_accepted', 'user_invitation', v_invitation.id,
          jsonb_build_object('email', v_invitation.email, 'role', v_invitation.role));

  RETURN QUERY SELECT
    TRUE::BOOLEAN,
    v_invitation.tenant_id,
    v_invitation.role,
    'Invitation accepted successfully'::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- TRIGGERS
-- ============================================

-- Create tenant settings on tenant creation
CREATE TRIGGER on_tenant_created_create_settings
  AFTER INSERT ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.create_tenant_settings();

-- Create onboarding record on profile creation
CREATE TRIGGER on_profile_created_create_onboarding
  AFTER INSERT ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.create_user_onboarding();

-- Update timestamps
CREATE TRIGGER set_tenant_settings_updated_at
  BEFORE UPDATE ON public.tenant_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_invitations_updated_at
  BEFORE UPDATE ON public.user_invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_user_onboarding_updated_at
  BEFORE UPDATE ON public.user_onboarding
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- RLS POLICIES
-- ============================================

ALTER TABLE public.tenant_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;

-- Tenant Settings policies
CREATE POLICY "Users can view their tenant settings"
  ON public.tenant_settings
  FOR SELECT
  USING (public.is_tenant_member(tenant_id));

CREATE POLICY "Admins can update tenant settings"
  ON public.tenant_settings
  FOR UPDATE
  USING (public.user_has_role(tenant_id, 'admin'))
  WITH CHECK (public.user_has_role(tenant_id, 'admin'));

CREATE POLICY "Owners can insert tenant settings"
  ON public.tenant_settings
  FOR INSERT
  WITH CHECK (public.user_has_role(tenant_id, 'owner'));

-- User Invitations policies
CREATE POLICY "Admins can view tenant invitations"
  ON public.user_invitations
  FOR SELECT
  USING (public.user_has_role(tenant_id, 'admin'));

CREATE POLICY "Admins can create invitations"
  ON public.user_invitations
  FOR INSERT
  WITH CHECK (public.user_has_role(tenant_id, 'admin'));

CREATE POLICY "Admins can update invitations"
  ON public.user_invitations
  FOR UPDATE
  USING (public.user_has_role(tenant_id, 'admin'));

CREATE POLICY "Anyone can view invitation by token"
  ON public.user_invitations
  FOR SELECT
  USING (TRUE);  -- Token validation happens in application

-- User Onboarding policies
CREATE POLICY "Users can view own onboarding"
  ON public.user_onboarding
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own onboarding"
  ON public.user_onboarding
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "System can insert onboarding"
  ON public.user_onboarding
  FOR INSERT
  WITH CHECK (TRUE);

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE public.tenant_settings IS 'Extended tenant configuration for onboarding and CRM modules';
COMMENT ON TABLE public.user_invitations IS 'Team member invitations with token-based acceptance';
COMMENT ON TABLE public.user_onboarding IS 'Tracks user onboarding progress through the wizard';
COMMENT ON FUNCTION public.accept_invitation IS 'Accepts invitation and creates tenant membership';
