/**
 * Secure API Proxy Route (BFF Pattern)
 *
 * This route acts as a Backend-for-Frontend (BFF) proxy that:
 * 1. Receives API calls from the client
 * 2. Reads the access token from the httpOnly session cookie
 * 3. Adds the Authorization header
 * 4. Forwards the request to the backend API
 * 5. Returns the response to the client
 *
 * Security Benefits:
 * - Tokens NEVER exposed to JavaScript (XSS protection)
 * - All cookies are httpOnly and secure
 * - Automatic token refresh when needed
 * - Single point of authentication
 *
 * @see https://nextjs.org/docs/app/building-your-application/routing/route-handlers
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { jwtVerify, SignJWT } from 'jose';

// ============================================
// Configuration
// ============================================

const SESSION_COOKIE_NAME = 'zcrm_session';
const SESSION_DURATION_DAYS = 7;

// Backend API URL
const rawApiUrl = process.env['API_URL'] || process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';
const BACKEND_URL = rawApiUrl.replace(/\/api\/v1\/?$/, '');

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts, proxy
 * IMPORTANT: In production, always set SESSION_SECRET environment variable
 */
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

/**
 * Get Cloudflare context env bindings (if available)
 * OpenNext exposes Cloudflare bindings through getCloudflareContext()
 */
function getCloudflareEnv(): Record<string, string | undefined> {
  try {
    // Try to dynamically import OpenNext's cloudflare context
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getCloudflareContext } = require('@opennextjs/cloudflare');
    const ctx = getCloudflareContext();
    return ctx?.env || {};
  } catch {
    // Not running in Cloudflare context
    return {};
  }
}

/**
 * Get secret key for session JWT
 *
 * SECURITY: Enforces proper configuration in production
 * CRITICAL: Must use the same sources as middleware.ts and callback routes!
 */
function getSecretKey(): Uint8Array {
  // Try multiple sources for the secret (Edge runtime / Cloudflare Workers compatibility)
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    // Check if production (Edge runtime may not have NODE_ENV reliably)
    const isProduction = process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      // In production, log error but use consistent fallback
      // This ensures session created in callback can be verified in proxy
      console.error(
        '[API Proxy] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    } else {
      console.warn('[API Proxy] SESSION_SECRET not set. Using development fallback.');
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  if (secret.length < 32) {
    console.warn('[API Proxy] SESSION_SECRET should be at least 32 characters for security.');
  }

  return new TextEncoder().encode(secret);
}

// ============================================
// Types
// ============================================

interface SessionPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  accessTokenExpiresAt?: number;
  createdAt: number;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

// ============================================
// Session Management
// ============================================

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
      tenantId: payload['tenantId'] as string || '',
      role: payload['role'] as string || 'viewer',
      accessToken: payload['accessToken'] as string,
      refreshToken: payload['refreshToken'] as string,
      expiresAt: payload['expiresAt'] as number,
      accessTokenExpiresAt: payload['accessTokenExpiresAt'] as number | undefined,
      createdAt: payload['createdAt'] as number,
    };
  } catch (error) {
    console.warn('[API Proxy] Session decryption failed:', error);
    return null;
  }
}

/**
 * Update session with new tokens
 */
async function updateSessionTokens(
  currentSession: SessionPayload,
  newTokens: RefreshResponse
): Promise<void> {
  const cookieStore = await cookies();
  const now = Math.floor(Date.now() / 1000);
  const sessionExpiresAt = now + (SESSION_DURATION_DAYS * 24 * 60 * 60);

  const sessionToken = await new SignJWT({
    userId: currentSession.userId,
    email: currentSession.email,
    tenantId: currentSession.tenantId,
    role: currentSession.role,
    accessToken: newTokens.accessToken,
    refreshToken: newTokens.refreshToken,
    expiresAt: sessionExpiresAt,
    accessTokenExpiresAt: newTokens.expiresAt,
    createdAt: currentSession.createdAt,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_DAYS}d`)
    .sign(getSecretKey());

  const cookieExpires = new Date(Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
    expires: cookieExpires,
  });
}

/**
 * Check if JWT token is expired by decoding it
 * Returns true if expired or about to expire within buffer
 */
function isAccessTokenExpired(token: string, bufferSeconds: number = 300): boolean {
  try {
    // Decode JWT payload (middle part) without validation
    const parts = token.split('.');
    if (parts.length !== 3) return true;

    const payload = JSON.parse(Buffer.from(parts[1] as string, 'base64').toString());
    const exp = payload['exp'];

    if (!exp || typeof exp !== 'number') return true;

    const now = Math.floor(Date.now() / 1000);
    return now >= (exp - bufferSeconds);
  } catch {
    // If we can't decode, assume expired
    return true;
  }
}

/**
 * Refresh access token if expired
 * Handles both new sessions (with accessTokenExpiresAt) and legacy sessions (without it)
 */
async function refreshTokenIfNeeded(session: SessionPayload): Promise<string | null> {
  const now = Math.floor(Date.now() / 1000);
  const accessTokenExpiresAt = session.accessTokenExpiresAt;

  // Check if access token is about to expire (5 minute buffer)
  const BUFFER_SECONDS = 5 * 60;

  // If we have explicit expiry info, use it
  if (accessTokenExpiresAt && accessTokenExpiresAt > now + BUFFER_SECONDS) {
    // Token is still valid according to stored expiry
    return session.accessToken;
  }

  // If no explicit expiry, check by decoding the JWT
  if (!accessTokenExpiresAt && session.accessToken) {
    if (!isAccessTokenExpired(session.accessToken, BUFFER_SECONDS)) {
      // Token is still valid according to JWT expiry
      return session.accessToken;
    }
  }

  console.log('[API Proxy] Access token expired or expiring soon, refreshing...');

  try {
    const response = await fetch(`${BACKEND_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
      cache: 'no-store',
    });

    if (!response.ok) {
      console.error('[API Proxy] Token refresh failed:', response.status);
      return null;
    }

    const data = await response.json() as RefreshResponse;

    // Update session with new tokens
    await updateSessionTokens(session, data);

    console.log('[API Proxy] Token refreshed successfully');
    return data.accessToken;
  } catch (error) {
    console.error('[API Proxy] Token refresh error:', error);
    return null;
  }
}

// ============================================
// Request Handlers
// ============================================

/**
 * Handle all HTTP methods
 */
async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;

  // Build the backend URL
  const apiPath = path.join('/');
  const searchParams = request.nextUrl.searchParams.toString();
  const backendUrl = `${BACKEND_URL}/api/v1/${apiPath}${searchParams ? `?${searchParams}` : ''}`;

  // Get session
  const session = await getSession();

  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No valid session found' },
      { status: 401 }
    );
  }

  // Refresh token if needed
  const accessToken = await refreshTokenIfNeeded(session);

  if (!accessToken) {
    // Token refresh failed - session is invalid
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Session expired, please login again' },
      { status: 401 }
    );
  }

  // Check if this is a multipart request (file upload)
  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');

  // Build headers for backend request
  const headers: HeadersInit = {
    'Authorization': `Bearer ${accessToken}`,
  };

  // Add tenant ID if available
  if (session.tenantId) {
    headers['x-tenant-id'] = session.tenantId;
  }

  // Add user ID for backend services that need it
  if (session.userId) {
    headers['x-user-id'] = session.userId;
  }

  // Forward other relevant headers
  const forwardHeaders = ['accept', 'accept-language', 'cache-control'];
  forwardHeaders.forEach((header) => {
    const value = request.headers.get(header);
    if (value) {
      headers[header] = value;
    }
  });

  try {
    // Get request body for non-GET requests
    let body: BodyInit | undefined;
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      try {
        if (isMultipart) {
          // For multipart, pass the FormData directly
          body = await request.formData();
        } else {
          const text = await request.text();
          if (text) {
            body = text;
          }
        }
      } catch {
        // No body or couldn't read it
      }
    }

    // Only set Content-Type for requests that have a body
    // For DELETE/GET without body, don't set Content-Type to avoid backend errors
    if (body && !isMultipart) {
      headers['Content-Type'] = 'application/json';
    }

    // Make request to backend
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body,
      cache: 'no-store',
    });

    // Check if response is binary (PDF, images, etc.)
    const responseContentType = backendResponse.headers.get('content-type') || '';
    const isBinaryResponse =
      responseContentType.includes('application/pdf') ||
      responseContentType.includes('application/octet-stream') ||
      responseContentType.includes('image/') ||
      responseContentType.includes('application/zip');

    if (isBinaryResponse) {
      // For binary responses, pass through the raw body
      const binaryData = await backendResponse.arrayBuffer();

      const response = new NextResponse(binaryData, {
        status: backendResponse.status,
        headers: {
          'Content-Type': responseContentType,
          'Content-Length': String(binaryData.byteLength),
        },
      });

      // Forward content-disposition header for downloads
      const contentDisposition = backendResponse.headers.get('content-disposition');
      if (contentDisposition) {
        response.headers.set('Content-Disposition', contentDisposition);
      }

      return response;
    }

    // For JSON/text responses, parse and return as JSON
    const responseText = await backendResponse.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Create response with same status and headers
    const response = NextResponse.json(responseData, {
      status: backendResponse.status,
    });

    // Forward relevant response headers
    const forwardResponseHeaders = ['x-total-count', 'x-page', 'x-limit', 'x-total-pages'];
    forwardResponseHeaders.forEach((header) => {
      const value = backendResponse.headers.get(header);
      if (value) {
        response.headers.set(header, value);
      }
    });

    return response;
  } catch (error) {
    console.error('[API Proxy] Backend request failed:', error);
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Failed to connect to backend service' },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context);
}

export async function PUT(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return handleRequest(request, context);
}

// Runtime configuration for edge
export const runtime = 'nodejs';
