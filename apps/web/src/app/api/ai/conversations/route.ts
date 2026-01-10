/**
 * AI Conversations API Route (Proxy)
 *
 * Proxies conversation history requests to the zuclubit-bot-helper service.
 * Uses HMAC-SHA256 for service-to-service authentication.
 *
 * @module app/api/ai/conversations/route
 */

import { NextRequest, NextResponse } from 'next/server';
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
const SESSION_COOKIE_NAME = 'zcrm_session';
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

// ============================================
// Helpers
// ============================================

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

function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();
  const secret =
    process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    ((globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined);

  if (!secret) {
    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }
  return new TextEncoder().encode(secret);
}

interface SessionPayload {
  userId: string;
  email: string;
  tenantId: string;
  role: string;
}

async function getSession(): Promise<SessionPayload | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionCookie) return null;

    const { payload } = await jwtVerify(sessionCookie, getSecretKey(), {
      algorithms: ['HS256'],
    });

    return {
      userId: payload['userId'] as string,
      email: payload['email'] as string,
      tenantId: (payload['tenantId'] as string) || '',
      role: (payload['role'] as string) || 'viewer',
    };
  } catch {
    return null;
  }
}

function generateHmacSignature(body: object | null, timestamp: string): string {
  const bodyString = body ? JSON.stringify(body) : '';
  const signatureData = `${timestamp}.${bodyString}`;
  return createHmac('sha256', CRM_SECRET).update(signatureData).digest('hex');
}

// ============================================
// GET - List conversations
// ============================================

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') || '';
  const limit = searchParams.get('limit') || '20';
  const offset = searchParams.get('offset') || '0';

  const timestamp = Date.now().toString();
  const signature = CRM_SECRET ? generateHmacSignature(null, timestamp) : 'dev-signature';

  const queryString = new URLSearchParams({
    ...(status && { status }),
    limit,
    offset,
  }).toString();

  try {
    const response = await fetch(
      `${BOT_HELPER_URL}/v1/crm/conversations?${queryString}`,
      {
        method: 'GET',
        headers: {
          'x-crm-signature': signature,
          'x-crm-timestamp': timestamp,
          'x-tenant-id': session.tenantId,
          'x-user-id': session.userId,
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversations' },
      { status: 500 }
    );
  }
}

// ============================================
// POST - Create conversation
// ============================================

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const enrichedBody = {
    tenantId: session.tenantId,
    userId: session.userId,
    userEmail: session.email,
    title: body.title,
  };

  const timestamp = Date.now().toString();
  const signature = CRM_SECRET
    ? generateHmacSignature(enrichedBody, timestamp)
    : 'dev-signature';

  try {
    const response = await fetch(`${BOT_HELPER_URL}/v1/crm/conversations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-crm-signature': signature,
        'x-crm-timestamp': timestamp,
      },
      body: JSON.stringify(enrichedBody),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Conversations API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to create conversation' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
