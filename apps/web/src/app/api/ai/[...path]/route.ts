/**
 * AI Service Proxy Route (BFF Pattern)
 *
 * This route proxies AI-related requests to the zuclubit-bot-helper service.
 * Uses HMAC-SHA256 for service-to-service authentication.
 *
 * Flow:
 * 1. Receives API call from client via /api/ai/*
 * 2. Reads user session from httpOnly cookie
 * 3. Generates HMAC signature for service auth
 * 4. Forwards to bot-helper's /v1/crm/* endpoints
 * 5. Returns response to client
 *
 * @module app/api/ai/[...path]/route
 */

import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHmac } from 'crypto';
import { jwtVerify } from 'jose';

// ============================================
// Configuration
// ============================================

const SESSION_COOKIE_NAME = 'zcrm_session';

// Bot helper service URL
const BOT_HELPER_URL =
  process.env['BOT_HELPER_URL'] ||
  process.env['NEXT_PUBLIC_BOT_HELPER_URL'] ||
  'https://zuclubit-bot-helper.fly.dev';

// HMAC secret for service-to-service auth
const CRM_SECRET = process.env['CRM_INTEGRATION_SECRET'] || '';

// Endpoint mapping from frontend paths to bot-helper paths
const ENDPOINT_MAP: Record<string, string> = {
  health: 'health',
  agent: 'agent',
  'agent/confirm': 'agent/confirm',
  chat: 'chat',
  'sentiment/analyze': 'sentiment',
  'lead/score': 'lead/score',
  'email/generate': 'email/generate',
  conversations: 'conversations',
  settings: 'settings',
};

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

// ============================================
// Helpers
// ============================================

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
 *
 * SECURITY: Enforces proper configuration in production
 * CRITICAL: Must use the same sources as middleware.ts and callback routes!
 */
function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    const isProduction = process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error(
        '[AI Proxy] CRITICAL: SESSION_SECRET not configured in production! ' +
        'Using fallback key. Run: wrangler pages secret put SESSION_SECRET'
      );
    } else {
      console.warn('[AI Proxy] SESSION_SECRET not set. Using development fallback.');
    }

    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  if (secret.length < 32) {
    console.warn('[AI Proxy] SESSION_SECRET should be at least 32 characters for security.');
  }

  return new TextEncoder().encode(secret);
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
    console.warn('[AI Proxy] Session decryption failed:', error);
    return null;
  }
}

/**
 * Generate HMAC-SHA256 signature for service-to-service auth
 * Format: timestamp.jsonBody (matching bot-helper expectations)
 */
function generateHmacSignature(body: object | null, timestamp: string): string {
  const bodyString = body ? JSON.stringify(body) : '';
  const signatureData = `${timestamp}.${bodyString}`;
  return createHmac('sha256', CRM_SECRET).update(signatureData).digest('hex');
}

/**
 * Map frontend path to bot-helper endpoint
 */
function mapEndpoint(path: string): string | null {
  // Try exact match first
  if (ENDPOINT_MAP[path]) {
    return ENDPOINT_MAP[path];
  }

  // Try prefix match for nested endpoints
  for (const [key, value] of Object.entries(ENDPOINT_MAP)) {
    if (path.startsWith(key)) {
      return path.replace(key, value);
    }
  }

  return null;
}

// ============================================
// Request Handlers
// ============================================

async function handleRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<NextResponse> {
  const { path } = await params;
  const apiPath = path.join('/');

  // Map to bot-helper endpoint
  const mappedEndpoint = mapEndpoint(apiPath);
  if (!mappedEndpoint) {
    return NextResponse.json(
      { error: 'Not Found', message: `Unknown AI endpoint: ${apiPath}` },
      { status: 404 }
    );
  }

  // Check if CRM secret is configured
  if (!CRM_SECRET && process.env['NODE_ENV'] === 'production') {
    console.error('[AI Proxy] CRM_INTEGRATION_SECRET not configured');
    return NextResponse.json(
      { error: 'Configuration Error', message: 'AI service not configured' },
      { status: 503 }
    );
  }

  // Get session for user context
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'No valid session found' },
      { status: 401 }
    );
  }

  // Build the bot-helper URL
  const searchParams = request.nextUrl.searchParams.toString();
  const backendUrl = `${BOT_HELPER_URL}/v1/crm/${mappedEndpoint}${searchParams ? `?${searchParams}` : ''}`;

  // Generate HMAC auth headers (timestamp in milliseconds as expected by bot-helper)
  const timestamp = Date.now().toString();
  let requestBody: object | null = null;

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    try {
      const bodyText = await request.text();
      if (bodyText) {
        requestBody = JSON.parse(bodyText);
      }
    } catch {
      requestBody = null;
    }
  }

  // For agent/chat endpoints, enrich body with user context (required by bot-helper)
  const isAgentEndpoint = mappedEndpoint === 'agent' || mappedEndpoint === 'chat';
  if (isAgentEndpoint && requestBody) {
    requestBody = {
      ...requestBody,
      tenantId: session.tenantId,
      user: {
        userId: session.userId,
        email: session.email,
        displayName: session.email.split('@')[0],
        role: session.role,
        permissions: [],
      },
      // Pass access token for bot-helper to execute tool calls against Lead Service
      toolExecutionToken: session.accessToken,
    };
  }

  // Generate HMAC signature using the enriched body
  const signature = CRM_SECRET
    ? generateHmacSignature(requestBody, timestamp)
    : 'dev-signature';

  // Build headers with correct names for bot-helper (x-crm-*)
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'x-crm-timestamp': timestamp,
    'x-crm-signature': signature,
    'x-service': 'zuclubit-crm',
  };

  // Add tenant and user context headers
  if (session.tenantId) {
    headers['x-tenant-id'] = session.tenantId;
  }
  if (session.userId) {
    headers['x-user-id'] = session.userId;
  }

  try {
    const backendResponse = await fetch(backendUrl, {
      method: request.method,
      headers,
      body: requestBody ? JSON.stringify(requestBody) : undefined,
      cache: 'no-store',
    });

    // Parse response
    const responseText = await backendResponse.text();
    let responseData: unknown;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = responseText;
    }

    // Return response with same status
    return NextResponse.json(responseData, {
      status: backendResponse.status,
    });
  } catch (error) {
    console.error('[AI Proxy] Backend request failed:', error);
    return NextResponse.json(
      { error: 'Bad Gateway', message: 'Failed to connect to AI service' },
      { status: 502 }
    );
  }
}

// Export handlers for all HTTP methods
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, context);
}

// Runtime configuration
export const runtime = 'nodejs';
