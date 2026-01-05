/**
 * Supabase Server Client
 *
 * Creates a Supabase client for use in server components, route handlers, and server actions.
 * This replaces the deprecated @supabase/auth-helpers-nextjs pattern.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import 'server-only';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

// ============================================
// Environment Variables
// ============================================

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_KEY'] || '';

// ============================================
// Server Client for Route Handlers
// ============================================

/**
 * Create Supabase client for route handlers
 * This client has access to the user's session via cookies
 */
export async function createRouteHandlerClient(): Promise<SupabaseClient> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase Server] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  const cookieStore = await cookies();

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        // Pass cookies for auth
        cookie: cookieStore.toString(),
      },
    },
  });
}

/**
 * Create Supabase admin client with service role
 * Use with caution - bypasses RLS
 */
export function createServiceClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.warn('[Supabase Server] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY for admin client');
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Export types
export type { SupabaseClient };
