/**
 * Supabase Client Module
 *
 * Centralized Supabase client management for the application.
 *
 * Usage:
 * - Client Components: import { createBrowserClient } from '@/lib/supabase'
 * - Server/Route Handlers: import { createRouteHandlerClient } from '@/lib/supabase/server'
 */

export {
  createBrowserClient,
  createClientComponentClient,
  type SupabaseClient,
} from './client';

// Note: Server exports are in ./server.ts to maintain 'server-only' boundary
