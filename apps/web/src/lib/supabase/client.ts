/**
 * Supabase Storage Client
 *
 * Creates a Supabase client for file storage operations only.
 * Authentication is handled separately via Zuclubit SSO.
 *
 * Used for:
 * - Logo uploads
 * - File storage
 * - Asset management
 */

import { createClient as createSupabaseClient, type SupabaseClient } from '@supabase/supabase-js';

// ============================================
// Environment Variables
// ============================================

const SUPABASE_URL = process.env['NEXT_PUBLIC_SUPABASE_URL'] || '';
const SUPABASE_ANON_KEY = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || '';

// ============================================
// Storage Client Singleton
// ============================================

let storageClient: SupabaseClient | null = null;

/**
 * Create or return existing Supabase storage client
 * Use this for file storage operations only (NOT for auth)
 */
export function createStorageClient(): SupabaseClient {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.warn('[Supabase Storage] Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }

  if (storageClient) {
    return storageClient;
  }

  storageClient = createSupabaseClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      // Disable auth features - we use Zuclubit SSO
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  return storageClient;
}

/**
 * @deprecated Use createStorageClient instead
 * Kept for backward compatibility during migration
 */
export const createBrowserClient = createStorageClient;

/**
 * @deprecated Use createStorageClient instead
 */
export const createClientComponentClient = createStorageClient;

// Export types
export type { SupabaseClient };
