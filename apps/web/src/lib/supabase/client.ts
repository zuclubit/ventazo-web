/**
 * Supabase Browser Client
 *
 * Creates a Supabase client for use in client components.
 * This replaces the deprecated @supabase/auth-helpers-nextjs pattern.
 *
 * @see https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Environment Variables
// ============================================

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

// ============================================
// Client Singleton
// ============================================

let browserClient: SupabaseClient | null = null;

/**
 * Create or return existing Supabase browser client
 * Use this in client components for authentication
 */
export function createBrowserClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Use PKCE flow for better security
      flowType: 'pkce',
      // Store session in localStorage (for client-side only)
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
      // Auto-refresh tokens
      autoRefreshToken: true,
      // Persist session across tabs
      persistSession: true,
      // Detect session from URL (for OAuth callbacks)
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}

/**
 * Alias for backward compatibility
 * @deprecated Use createBrowserClient instead
 */
export const createClientComponentClient = createBrowserClient;

// Export types
export type { SupabaseClient };
