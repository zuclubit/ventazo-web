/**
 * AI Streaming Chat Route (Proxy)
 *
 * Proxies SSE streaming requests to the zuclubit-bot-helper service.
 * Uses HMAC-SHA256 for service-to-service authentication.
 *
 * @module app/api/ai/stream/chat/route
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { jwtVerify } from 'jose';

// ============================================
// Constants
// ============================================

const BOT_HELPER_URL =
  process.env['BOT_HELPER_URL'] ||
  process.env['NEXT_PUBLIC_BOT_HELPER_URL'] ||
  'https://zuclubit-bot-helper.fly.dev';

const CRM_SECRET = process.env['CRM_INTEGRATION_SECRET'] || '';

// Session cookie name
const SESSION_COOKIE_NAME = 'zcrm_session';

/**
 * Development fallback key - consistent across all auth files
 */
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

// ============================================
// Helpers
// ============================================

/**
 * Get Cloudflare context env bindings (if available)
 */
function getCloudflareEnv(): Record<string, string | undefined> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return ctx?.env || {};
  } catch {
    return {};
  }
}

/**
 * Get secret key for session JWT
 */
function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret =
    process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    ((globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined);

  if (!secret) {
    const isProduction =
      process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error(
        '[AI Stream Proxy] CRITICAL: SESSION_SECRET not configured in production!'
      );
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  return new TextEncoder().encode(secret);
}

// ============================================
// Session Types
// ============================================

interface SessionPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  accessToken: string;
}

/**
 * Decrypt and verify session from cookie
 */
async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
      algorithms: ['HS256'],
    });

    return {
      userId: payload['userId'] as string,
      email: payload['email'] as string,
      tenantId: (payload['tenantId'] as string) || '',
      role: (payload['role'] as string) || 'viewer',
      accessToken: payload['accessToken'] as string,
    };
  } catch (error) {
    console.warn('[AI Stream Proxy] Session decryption failed:', error);
    return null;
  }
}

/**
 * Generate HMAC-SHA256 signature for service-to-service auth
 */
function generateHmacSignature(body: object | null, timestamp: string): string {
  const bodyString = body ? JSON.stringify(body) : '';
  const signatureData = `${timestamp}.${bodyString}`;
  return createHmac('sha256', CRM_SECRET).update(signatureData).digest('hex');
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  // Verify session
  const session = await getSession();

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Session required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  // Check if CRM secret is configured
  if (!CRM_SECRET && process.env['NODE_ENV'] === 'production') {
    console.error('[AI Stream Proxy] CRM_INTEGRATION_SECRET not configured');
    return new Response(
      JSON.stringify({
        error: 'Configuration Error',
        message: 'AI streaming service not configured',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get request body
    const body = await request.json();

    // Enrich body with user context
    const enrichedBody = {
      ...body,
      tenantId: session.tenantId,
      user: {
        userId: session.userId,
        email: session.email,
        displayName: session.email.split('@')[0],
        role: session.role,
        permissions: [],
      },
      toolExecutionToken: session.accessToken,
    };

    // Generate HMAC auth
    const timestamp = Date.now().toString();
    const signature = CRM_SECRET
      ? generateHmacSignature(enrichedBody, timestamp)
      : 'dev-signature';

    // Forward request to bot-helper with auth headers
    const backendResponse = await fetch(`${BOT_HELPER_URL}/v1/crm/stream/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-crm-timestamp': timestamp,
        'x-crm-signature': signature,
        'x-service': 'zuclubit-crm',
        'x-tenant-id': session.tenantId,
        'x-user-id': session.userId,
      },
      body: JSON.stringify(enrichedBody),
    });

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({}));
      return new Response(
        JSON.stringify({
          error: 'Backend error',
          message: (errorData as { message?: string }).message || backendResponse.statusText,
        }),
        {
          status: backendResponse.status,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Check if response is SSE
    const contentType = backendResponse.headers.get('content-type');
    if (!contentType?.includes('text/event-stream')) {
      // Regular JSON response (error or non-streaming)
      return new Response(backendResponse.body, {
        status: backendResponse.status,
        headers: {
          'Content-Type': contentType || 'application/json',
        },
      });
    }

    // Proxy SSE stream
    const headers = new Headers({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });

    // Return streaming response
    return new Response(backendResponse.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('[AI Stream Proxy] Request failed:', error);

    return new Response(
      JSON.stringify({
        error: 'Proxy error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// ============================================
// OPTIONS Handler (CORS)
// ============================================

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept',
    },
  });
}

// Runtime configuration
export const runtime = 'nodejs';
