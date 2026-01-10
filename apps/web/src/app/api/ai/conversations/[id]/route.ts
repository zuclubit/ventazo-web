/**
 * AI Conversation Detail API Route (Proxy)
 *
 * Proxies individual conversation requests to the zuclubit-bot-helper service.
 *
 * @module app/api/ai/conversations/[id]/route
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
    cfEnv['SESSION_SECRET'] ||
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
// GET - Get conversation with messages
// ============================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const timestamp = Date.now().toString();
  const signature = CRM_SECRET ? generateHmacSignature(null, timestamp) : 'dev-signature';

  try {
    const response = await fetch(`${BOT_HELPER_URL}/v1/crm/conversations/${id}`, {
      method: 'GET',
      headers: {
        'x-crm-signature': signature,
        'x-crm-timestamp': timestamp,
        'x-tenant-id': session.tenantId,
      },
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete conversation
// ============================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const timestamp = Date.now().toString();
  const signature = CRM_SECRET ? generateHmacSignature(null, timestamp) : 'dev-signature';

  try {
    const response = await fetch(`${BOT_HELPER_URL}/v1/crm/conversations/${id}`, {
      method: 'DELETE',
      headers: {
        'x-crm-signature': signature,
        'x-crm-timestamp': timestamp,
        'x-tenant-id': session.tenantId,
      },
    });

    if (response.status === 204) {
      return new NextResponse(null, { status: 204 });
    }

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to delete conversation' },
      { status: 500 }
    );
  }
}

// ============================================
// PATCH - Archive conversation
// ============================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const timestamp = Date.now().toString();
  const signature = CRM_SECRET ? generateHmacSignature(null, timestamp) : 'dev-signature';

  try {
    const response = await fetch(
      `${BOT_HELPER_URL}/v1/crm/conversations/${id}/archive`,
      {
        method: 'PATCH',
        headers: {
          'x-crm-signature': signature,
          'x-crm-timestamp': timestamp,
          'x-tenant-id': session.tenantId,
        },
      }
    );

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('[Conversation API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to archive conversation' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
