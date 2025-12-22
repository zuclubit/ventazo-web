-- ============================================
-- Users View Migration
-- Creates a view 'users' that maps to 'profiles' table
-- This allows the backend to use 'users' while the actual table is 'profiles'
-- ============================================

-- Create view for users that maps to profiles
CREATE OR REPLACE VIEW public.users AS
SELECT
    id,
    email,
    full_name,
    avatar_url,
    phone,
    is_active,
    last_login_at,
    metadata,
    created_at,
    updated_at
FROM public.profiles;

-- Create rules to allow INSERT, UPDATE, DELETE through the view

-- INSERT rule
CREATE OR REPLACE RULE users_insert AS
ON INSERT TO public.users
DO INSTEAD
INSERT INTO public.profiles (id, email, full_name, avatar_url, phone, metadata, created_at, updated_at)
VALUES (NEW.id, NEW.email, NEW.full_name, NEW.avatar_url, NEW.phone, COALESCE(NEW.metadata, '{}'::jsonb), COALESCE(NEW.created_at, NOW()), COALESCE(NEW.updated_at, NOW()))
RETURNING
    id,
    email,
    full_name,
    avatar_url,
    phone,
    is_active,
    last_login_at,
    metadata,
    created_at,
    updated_at;

-- UPDATE rule
CREATE OR REPLACE RULE users_update AS
ON UPDATE TO public.users
DO INSTEAD
UPDATE public.profiles
SET
    email = COALESCE(NEW.email, profiles.email),
    full_name = COALESCE(NEW.full_name, profiles.full_name),
    avatar_url = COALESCE(NEW.avatar_url, profiles.avatar_url),
    phone = COALESCE(NEW.phone, profiles.phone),
    metadata = COALESCE(NEW.metadata, profiles.metadata),
    last_login_at = COALESCE(NEW.last_login_at, profiles.last_login_at),
    is_active = COALESCE(NEW.is_active, profiles.is_active),
    updated_at = NOW()
WHERE profiles.id = OLD.id
RETURNING
    profiles.id,
    profiles.email,
    profiles.full_name,
    profiles.avatar_url,
    profiles.phone,
    profiles.is_active,
    profiles.last_login_at,
    profiles.metadata,
    profiles.created_at,
    profiles.updated_at;

-- DELETE rule
CREATE OR REPLACE RULE users_delete AS
ON DELETE TO public.users
DO INSTEAD
DELETE FROM public.profiles WHERE profiles.id = OLD.id;
