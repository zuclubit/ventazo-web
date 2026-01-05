/**
 * Public API Proxy Route
 *
 * This route proxies requests to PUBLIC backend endpoints that don't require authentication.
 * Unlike /api/proxy, this route doesn't check for session cookies.
 *
 * Use cases:
 * - Invitation token validation (/invitations/token/:token)
 * - Password reset token validation
 * - Email verification
 * - Public tenant info lookup
 *
 * Security:
 * - Only allows specific whitelisted endpoints
 * - No sensitive data exposure
 * - Rate limited at backend level
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server';

// ============================================
// Configuration
// ============================================

// Backend API URL
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const BACKEND_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

/**
 * Whitelist of allowed public endpoints
 * These endpoints are safe to call without authentication
 * Format: regex patterns
 */
const PUBLIC_ENDPOINT_WHITELIST: RegExp[] = [
  // Invitation token validation (GET)
  /^\/invitations\/token\/[a-f0-9]+$/i,
  // Invitation accept-signup (POST) - for new users to create account and accept
  /^\/invitations\/accept-signup$/,
  // Health checks
  /^\/health$/,
  /^\/healthz$/,
  /^\/ready$/,
];

/**
 * Check if the endpoint is whitelisted for public access
 */
function isWhitelistedEndpoint(path: string): boolean {
  return PUBLIC_ENDPOINT_WHITELIST.some((pattern) => pattern.test(path));
}

/**
 * Build the full backend URL
 */
function buildBackendUrl(path: string, searchParams: URLSearchParams): string {
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  const baseUrl = `${BACKEND_URL}/api/v1${cleanPath}`;
  const queryString = searchParams.toString();
  return queryString ? `${baseUrl}?${queryString}` : baseUrl;
}

// ============================================
// Request Handlers
// ============================================

/**
 * Handle GET requests
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const path = `/${resolvedParams.path.join('/')}`;

  // Security: Check if endpoint is whitelisted
  if (!isWhitelistedEndpoint(path)) {
    console.warn(`[Public Proxy] Blocked non-whitelisted endpoint: ${path}`);
    return NextResponse.json(
      { error: 'Forbidden', message: 'This endpoint is not available publicly' },
      { status: 403 }
    );
  }

  try {
    const url = buildBackendUrl(path, request.nextUrl.searchParams);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        // Forward correlation ID if present
        ...(request.headers.get('x-correlation-id') && {
          'x-correlation-id': request.headers.get('x-correlation-id')!,
        }),
      },
    });

    // Parse response
    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // Return response with same status
    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Public Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}

/**
 * Handle POST requests (for public actions like email verification confirmation)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const resolvedParams = await params;
  const path = `/${resolvedParams.path.join('/')}`;

  // Security: Check if endpoint is whitelisted
  if (!isWhitelistedEndpoint(path)) {
    console.warn(`[Public Proxy] Blocked non-whitelisted endpoint: ${path}`);
    return NextResponse.json(
      { error: 'Forbidden', message: 'This endpoint is not available publicly' },
      { status: 403 }
    );
  }

  try {
    const url = buildBackendUrl(path, request.nextUrl.searchParams);
    const body = await request.json().catch(() => ({}));

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(request.headers.get('x-correlation-id') && {
          'x-correlation-id': request.headers.get('x-correlation-id')!,
        }),
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type');
    let data;
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Public Proxy] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to connect to backend' },
      { status: 500 }
    );
  }
}
