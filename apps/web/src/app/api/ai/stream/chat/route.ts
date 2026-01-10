/**
 * AI Streaming Chat Route (Proxy)
 *
 * Proxies SSE streaming requests to the backend Lead Service.
 * Handles authentication and tenant context injection.
 *
 * @module app/api/ai/stream/chat/route
 */

import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify } from 'jose';

// ============================================
// Constants
// ============================================

const BACKEND_URL = process.env['LEAD_SERVICE_URL'] || 'http://localhost:3001';
const SESSION_SECRET = process.env['SESSION_SECRET'] || 'dev-session-secret-min-32-chars!!';

// ============================================
// Session Verification
// ============================================

interface SessionPayload {
  sub: string;
  email: string;
  tenantId: string;
  tenantSlug: string;
  role: string;
  permissions: string[];
  iat: number;
  exp: number;
}

async function verifySession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('zcrm_session');

    if (!sessionCookie?.value) {
      return null;
    }

    const secret = new TextEncoder().encode(SESSION_SECRET);
    const { payload } = await jwtVerify(sessionCookie.value, secret, {
      algorithms: ['HS256'],
    });

    return payload as unknown as SessionPayload;
  } catch (error) {
    console.error('[AIStreamProxy] Session verification failed:', error);
    return null;
  }
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  // Verify session
  const session = await verifySession();

  if (!session) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized', message: 'Session required' }),
      {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    // Get request body
    const body = await request.json();

    // Forward request to backend with auth headers
    const backendResponse = await fetch(`${BACKEND_URL}/api/v1/ai/stream/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream',
        'x-tenant-id': session.tenantId,
        'x-tenant-slug': session.tenantSlug,
        'x-user-id': session.sub,
        'x-user-email': session.email,
        'x-user-role': session.role,
        'x-user-permissions': session.permissions.join(','),
      },
      body: JSON.stringify(body),
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
    console.error('[AIStreamProxy] Request failed:', error);

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
