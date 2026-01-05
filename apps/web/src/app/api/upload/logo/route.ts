/**
 * Logo Upload API Route
 *
 * Secure logo upload endpoint with:
 * - Authentication via Bearer token (Native JWT) - PRIORITY
 * - Fallback to app session cookie (zcrm_session)
 * - File type validation (magic bytes)
 * - Virus/malware scanning
 * - Image processing
 * - Rate limiting
 * - Supabase storage
 *
 * Authentication uses native JWT tokens (same as backend service)
 *
 * @module api/upload/logo
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import {
  validateFile,
  quickScan,
  sanitizeFilename,
  sanitizeSvg,
  generateStorageKey,
} from '@/lib/upload';

// ============================================
// Configuration
// ============================================

const BUCKET_NAME = 'logos';
const SESSION_COOKIE_NAME = 'zcrm_session';

// Helper to get Supabase config at runtime (required for Cloudflare Workers)
function getSupabaseConfig() {
  return {
    url: process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'] || '',
    anonKey: process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || process.env['SUPABASE_ANON_KEY'] || '',
    serviceKey: process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['SUPABASE_SERVICE_KEY'] || '',
  };
}

// Rate limiting (simple in-memory for edge runtime)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX = 5; // 5 logos per minute

// ============================================
// Types
// ============================================

interface AuthenticatedUser {
  userId: string;
  email: string;
  tenantId?: string;
}

// ============================================
// Supabase Admin Client (Created per-request for Cloudflare Workers)
// ============================================

function getSupabaseAdmin(): SupabaseClient | null {
  const config = getSupabaseConfig();

  if (!config.url || !config.serviceKey) {
    console.error('[Logo Upload] Supabase not configured');
    console.error('[Logo Upload] SUPABASE_URL:', config.url ? 'SET' : 'NOT SET');
    console.error('[Logo Upload] SUPABASE_SERVICE_KEY:', config.serviceKey ? 'SET' : 'NOT SET');
    return null;
  }

  console.log('[Logo Upload] Creating Supabase admin client');
  return createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ============================================
// Authentication - Bearer Token (Priority)
// ============================================

/**
 * Get JWT secret key for native token verification
 *
 * SECURITY: Uses JWT_SECRET only (no SUPABASE_JWT_SECRET fallback)
 * The JWT_SECRET is shared between frontend and backend for native token verification
 */
function getJwtSecretKey(): Uint8Array {
  const secret = process.env['JWT_SECRET'];

  if (!secret) {
    const isProduction = process.env['NODE_ENV'] === 'production';

    if (isProduction) {
      throw new Error(
        '[Logo Upload] CRITICAL: JWT_SECRET is required in production.'
      );
    }

    console.warn('[Logo Upload] JWT_SECRET not set, using development fallback');
    return new TextEncoder().encode('zuclubit-crm-dev-jwt-secret-change-in-production-min-32-chars');
  }

  if (secret.length < 32) {
    throw new Error('[Logo Upload] JWT_SECRET must be at least 32 characters.');
  }

  return new TextEncoder().encode(secret);
}

/**
 * Extract Bearer token from Authorization header
 */
function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

/**
 * Validate native JWT token and get user info
 * This is aligned with the backend service's JWT verification
 */
async function validateNativeJwtToken(token: string): Promise<AuthenticatedUser | null> {
  try {
    // Verify JWT using the same secret as the backend
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      algorithms: ['HS256'],
    });

    // Extract user info from JWT payload
    const userId = payload['sub'] as string;
    const email = payload['email'] as string;
    const tenantId = payload['tenantId'] as string | undefined;
    const tokenType = payload['type'] as string;

    // Validate it's an access token
    if (tokenType && tokenType !== 'access') {
      console.warn('[Logo Upload] Invalid token type:', tokenType);
      return null;
    }

    if (!userId || !email) {
      console.warn('[Logo Upload] JWT missing required claims');
      return null;
    }

    return {
      userId,
      email,
      tenantId,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    // Don't log expiry errors as warnings
    if (!errorMessage.includes('expired')) {
      console.warn('[Logo Upload] JWT validation failed:', errorMessage);
    }
    return null;
  }
}

// ============================================
// Authentication - Session Cookie (Fallback)
// ============================================

/**
 * Development fallback key - MUST be consistent across all files
 * This fallback is shared between: middleware.ts, callback route, session/index.ts, logout route
 * IMPORTANT: In production, always set SESSION_SECRET environment variable
 */
const DEV_FALLBACK_KEY = 'zuclubit-dev-session-key-do-not-use-in-production';

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
 * Get secret key for JWT decryption
 * CRITICAL: Must use the same sources as middleware.ts and session/index.ts
 */
function getSecretKey(): Uint8Array {
  const cfEnv = getCloudflareEnv();

  const secret = process.env['SESSION_SECRET'] ||
    process.env['NEXTAUTH_SECRET'] ||
    cfEnv['SESSION_SECRET'] ||
    cfEnv['NEXTAUTH_SECRET'] ||
    (globalThis as Record<string, unknown>)['SESSION_SECRET'] as string | undefined;

  if (!secret) {
    const isProduction =
      process.env['NODE_ENV'] === 'production' ||
      process.env['VERCEL_ENV'] === 'production' ||
      process.env['CF_PAGES'] === '1';

    if (isProduction) {
      console.error('[Upload Logo] CRITICAL: SESSION_SECRET not configured in production!');
    }
    return new TextEncoder().encode(DEV_FALLBACK_KEY);
  }

  return new TextEncoder().encode(secret);
}

/**
 * Extract user info from Supabase access token payload
 */
function extractUserFromAccessToken(accessToken: string): { userId: string; email: string } | null {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3) return null;

    // Use atob for Edge runtime compatibility
    const payloadBase64 = parts[1]!.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(atob(payloadBase64));

    const userId = payload['sub'];
    const email = payload['email'];

    if (userId && email) {
      return { userId, email };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Decrypt session from cookie value (Edge-compatible)
 */
async function decryptSession(sessionValue: string): Promise<AuthenticatedUser | null> {
  if (!sessionValue) return null;

  try {
    const { payload } = await jwtVerify(sessionValue, getSecretKey(), {
      algorithms: ['HS256'],
    });

    let userId = payload['userId'] as string | undefined;
    let email = payload['email'] as string | undefined;

    // Fallback: extract from accessToken if missing
    if ((!userId || !email) && payload['accessToken']) {
      const extracted = extractUserFromAccessToken(payload['accessToken'] as string);
      if (extracted) {
        userId = userId || extracted.userId;
        email = email || extracted.email;
      }
    }

    if (!userId || !email) {
      console.warn('[Logo Upload] Invalid session - missing userId or email');
      return null;
    }

    return {
      userId,
      email,
      tenantId: (payload['tenantId'] as string) || undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    if (!errorMessage.includes('expired')) {
      console.warn('[Logo Upload] Session decryption failed:', errorMessage);
    }
    return null;
  }
}

/**
 * Get session from request cookies
 */
async function getSessionFromCookie(): Promise<AuthenticatedUser | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

    if (!sessionCookie) {
      return null;
    }

    return decryptSession(sessionCookie);
  } catch (error) {
    console.error('[Logo Upload] Error reading session cookie:', error);
    return null;
  }
}

// ============================================
// Unified Authentication
// ============================================

/**
 * Authenticate user from request
 * Priority: Bearer token > Session cookie
 */
async function authenticateRequest(request: NextRequest): Promise<AuthenticatedUser | null> {
  // 1. Try Bearer token first (native JWT aligned with backend)
  const authHeader = request.headers.get('authorization');
  const bearerToken = extractBearerToken(authHeader);

  if (bearerToken) {
    console.log('[Logo Upload] Authenticating with Bearer token (Native JWT)');
    const user = await validateNativeJwtToken(bearerToken);
    if (user) {
      console.log('[Logo Upload] Bearer token valid for user:', user.email);
      return user;
    }
    console.warn('[Logo Upload] Bearer token invalid, trying session cookie');
  }

  // 2. Fallback to session cookie
  console.log('[Logo Upload] Authenticating with session cookie');
  const sessionUser = await getSessionFromCookie();
  if (sessionUser) {
    console.log('[Logo Upload] Session cookie valid for user:', sessionUser.email);
    return sessionUser;
  }

  console.warn('[Logo Upload] No valid authentication found');
  return null;
}

// ============================================
// Rate Limiting
// ============================================

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================
// POST Handler
// ============================================

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  try {
    // 1. Authenticate user (Bearer token or session cookie)
    const user = await authenticateRequest(request);

    if (!user?.userId || !user?.email) {
      console.warn('[Logo Upload] Authentication failed');
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Debes iniciar sesión para subir archivos' },
        { status: 401 }
      );
    }

    const { userId, email: userEmail } = user;

    // 2. Rate limiting
    if (!checkRateLimit(userId)) {
      console.warn(`[Logo Upload] Rate limit exceeded for user ${userEmail}`);
      return NextResponse.json(
        { error: 'Rate limit exceeded', message: 'Demasiados archivos. Intenta en un minuto.' },
        { status: 429 }
      );
    }

    // 3. Parse form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided', message: 'Por favor selecciona un archivo' },
        { status: 400 }
      );
    }

    // 4. File validation (includes magic byte check)
    const validation = await validateFile(file, 'logo');
    if (!validation.valid) {
      console.warn(`[Logo Upload] Validation failed for user ${userEmail}: ${validation.error}`);
      return NextResponse.json(
        { error: 'Validation failed', message: validation.error, details: validation.details },
        { status: 400 }
      );
    }

    // 5. Virus/malware scan
    const scanResult = await quickScan(file);
    if (!scanResult.safe) {
      console.error(`[Logo Upload] SECURITY: Threat detected from user ${userEmail}:`, scanResult.threats);
      return NextResponse.json(
        { error: 'Security threat', message: 'El archivo contiene contenido potencialmente peligroso' },
        { status: 400 }
      );
    }

    // 6. Read and process file
    const arrayBuffer = await file.arrayBuffer();
    let fileData: Uint8Array | string = new Uint8Array(arrayBuffer);
    let mimeType = file.type;

    // Sanitize SVG content
    if (mimeType === 'image/svg+xml') {
      const decoder = new TextDecoder('utf-8');
      const encoder = new TextEncoder();
      const svgContent = decoder.decode(fileData);
      const sanitized = sanitizeSvg(svgContent);
      fileData = encoder.encode(sanitized);
    }

    // 7. Generate secure storage key
    const sanitizedName = sanitizeFilename(file.name);
    const storageKey = generateStorageKey(userId, 'logo', sanitizedName);

    // 8. Get Supabase admin client for storage
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      console.error('[Logo Upload] Supabase not configured');
      return NextResponse.json(
        {
          error: 'Storage not configured',
          message: 'El almacenamiento no está configurado. Contacta al administrador.',
        },
        { status: 500 }
      );
    }

    // 9. Upload to Supabase Storage
    console.log(`[Logo Upload] Uploading to bucket: ${BUCKET_NAME}, key: ${storageKey}`);
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storageKey, fileData, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: true, // Allow replacing existing logo
      });

    if (uploadError) {
      console.error('[Logo Upload] Storage error:', uploadError);

      if (uploadError.message.includes('Bucket not found') || uploadError.message.includes('bucket')) {
        return NextResponse.json(
          {
            error: 'Storage not configured',
            message: 'El bucket de logos no existe. Contacta al administrador.',
            debug: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
          },
          { status: 500 }
        );
      }

      if (uploadError.message.includes('not authorized') || uploadError.message.includes('permission')) {
        return NextResponse.json(
          {
            error: 'Permission denied',
            message: 'No tienes permisos para subir archivos. Verifica la configuración del bucket.',
            debug: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
          },
          { status: 403 }
        );
      }

      return NextResponse.json(
        {
          error: 'Upload failed',
          message: 'Error al subir el archivo. Intenta de nuevo.',
          debug: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
        },
        { status: 500 }
      );
    }

    // 10. Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uploadData.path);

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'URL generation failed', message: 'Error al generar la URL del archivo' },
        { status: 500 }
      );
    }

    // 11. Success
    const duration = Date.now() - startTime;
    const fileSize = fileData instanceof Uint8Array ? fileData.length : file.size;
    console.log(`[Logo Upload] Success: ${storageKey} (${fileSize} bytes, ${duration}ms) for user ${userEmail}`);

    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      path: uploadData.path,
      filename: sanitizedName,
      size: fileSize,
      mimeType,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Logo Upload] Unexpected error:', errorMessage, error);

    // Provide more specific error messages
    if (errorMessage.includes('crypto')) {
      return NextResponse.json(
        { error: 'Server error', message: 'Error de seguridad en el servidor.' },
        { status: 500 }
      );
    }

    if (errorMessage.includes('Bucket') || errorMessage.includes('bucket')) {
      return NextResponse.json(
        { error: 'Storage error', message: 'El almacenamiento de logos no está configurado.' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        error: 'Server error',
        message: 'Error inesperado al subir el archivo. Intenta de nuevo.',
        debug: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE Handler
// ============================================

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path');

    if (!path) {
      return NextResponse.json(
        { error: 'Missing path', message: 'Falta el path del archivo' },
        { status: 400 }
      );
    }

    // Authenticate user
    const user = await authenticateRequest(request);

    if (!user?.userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verify ownership (path should start with user ID)
    if (!path.startsWith(user.userId + '/')) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'No tienes permiso para eliminar este archivo' },
        { status: 403 }
      );
    }

    // Get Supabase admin client
    const supabase = getSupabaseAdmin();

    if (!supabase) {
      return NextResponse.json(
        { error: 'Storage not configured', message: 'Almacenamiento no configurado' },
        { status: 500 }
      );
    }

    // Delete file
    const { error: deleteError } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([path]);

    if (deleteError) {
      console.error('[Logo Upload] Delete error:', deleteError);
      return NextResponse.json(
        { error: 'Delete failed', message: 'Error al eliminar el archivo' },
        { status: 500 }
      );
    }

    console.log(`[Logo Upload] Deleted: ${path} by user ${user.email}`);

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('[Logo Upload] Delete unexpected error:', error);
    return NextResponse.json(
      { error: 'Server error', message: 'Error inesperado' },
      { status: 500 }
    );
  }
}

// ============================================
// OPTIONS Handler (CORS)
// ============================================

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
