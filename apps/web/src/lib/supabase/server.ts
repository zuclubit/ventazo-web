/**
 * Supabase Server Storage Client
 *
 * Creates a Supabase client for server-side file storage operations.
 * Authentication is handled separately via Zuclubit SSO.
 *
 * Used for:
 * - Server-side file uploads
 * - Admin storage operations
 */

import 'server-only';
import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Environment Variables
// ============================================

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';
const SUPABASE_SERVICE_KEY = process.env['SUPABASE_SERVICE_KEY'] || '';

// ============================================
// Storage Clients
// ============================================

/**
 * Create Supabase storage client for server routes
 * Uses anon key - for basic storage operations
 */
export function createStorageClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase Server] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  return createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
}

/**
 * Create Supabase admin client with service role
 * Use with caution - bypasses RLS
 * For admin storage operations only
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

/**
 * @deprecated Use createStorageClient instead
 */
export const createRouteHandlerClient = createStorageClient;

// Export types
export type { SupabaseClient };
