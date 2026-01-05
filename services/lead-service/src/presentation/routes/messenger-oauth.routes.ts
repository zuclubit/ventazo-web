/**
 * Facebook Messenger OAuth Routes
 * Handles Facebook Login flow for connecting Pages to tenants
 *
 * Flow:
 * 1. User clicks "Connect Facebook" in settings
 * 2. Redirect to Facebook OAuth with state (tenantId + userId)
 * 3. User authorizes app and selects page
 * 4. Facebook redirects back with code
 * 5. Exchange code for access token
 * 6. Get user's pages and their tokens
 * 7. Store page token encrypted in messenger_pages table
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import crypto from 'crypto';
import { eq, and } from 'drizzle-orm';
import { container } from 'tsyringe';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

// Environment variables for OAuth (these are YOUR app credentials, not per-tenant)
const FACEBOOK_APP_ID = process.env.MESSENGER_APP_ID || '';
const FACEBOOK_APP_SECRET = process.env.MESSENGER_APP_SECRET || '';
const OAUTH_REDIRECT_URI = process.env.MESSENGER_OAUTH_REDIRECT_URI || 'https://api.ventazo.com/api/v1/messenger/oauth/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://crm.zuclubit.com';
const ENCRYPTION_KEY = process.env.TOKEN_ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');

// Scopes needed for Messenger
const FACEBOOK_SCOPES = [
  'pages_messaging',           // Send and receive messages
  'pages_read_engagement',     // Read page info
  'pages_manage_metadata',     // Manage webhooks
  'pages_show_list',           // List user's pages
].join(',');

// Simple encryption for tokens (in production, use a proper secrets manager)
function encryptToken(token: string): string {
  const iv = crypto.randomBytes(16);
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  let encrypted = cipher.update(token, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return iv.toString('hex') + ':' + encrypted;
}

function decryptToken(encryptedToken: string): string {
  const [ivHex, encrypted] = encryptedToken.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32), 'utf-8');
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

// State parameter schema (encoded in base64)
interface OAuthState {
  tenantId: string;
  userId: string;
  timestamp: number;
  nonce: string;
}

function encodeState(state: OAuthState): string {
  return Buffer.from(JSON.stringify(state)).toString('base64url');
}

function decodeState(encoded: string): OAuthState | null {
  try {
    return JSON.parse(Buffer.from(encoded, 'base64url').toString('utf-8'));
  } catch {
    return null;
  }
}

// Validation schemas
const initiateOAuthSchema = z.object({
  returnUrl: z.string().url().optional(),
});

const callbackQuerySchema = z.object({
  code: z.string().optional(),
  state: z.string(),
  error: z.string().optional(),
  error_description: z.string().optional(),
});

const selectPageSchema = z.object({
  pageId: z.string(),
  pageName: z.string(),
  pageAccessToken: z.string(),
});

const disconnectSchema = z.object({
  pageId: z.string(),
});

/**
 * Messenger OAuth Routes Plugin
 */
export async function messengerOAuthRoutes(fastify: FastifyInstance): Promise<void> {
  const db = container.resolve<PostgresJsDatabase>('Database');

  // ==================== Initiate OAuth Flow ====================

  /**
   * GET /oauth/connect
   * Initiates Facebook OAuth flow
   * User must be authenticated
   */
  fastify.get('/oauth/connect', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return reply.status(401).send({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!FACEBOOK_APP_ID) {
      return reply.status(500).send({
        success: false,
        error: 'Facebook integration not configured'
      });
    }

    // Create state parameter with tenant context
    const state: OAuthState = {
      tenantId,
      userId,
      timestamp: Date.now(),
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Build Facebook OAuth URL
    const params = new URLSearchParams({
      client_id: FACEBOOK_APP_ID,
      redirect_uri: OAUTH_REDIRECT_URI,
      scope: FACEBOOK_SCOPES,
      state: encodeState(state),
      response_type: 'code',
    });

    const facebookAuthUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;

    return reply.send({
      success: true,
      data: {
        authUrl: facebookAuthUrl,
        expiresIn: 600, // State valid for 10 minutes
      },
    });
  });

  // ==================== OAuth Callback ====================

  /**
   * GET /oauth/callback
   * Handles Facebook OAuth callback
   * Exchanges code for token, gets pages, shows page selector
   */
  fastify.get('/oauth/callback', async (request: FastifyRequest, reply: FastifyReply) => {
    const validation = callbackQuerySchema.safeParse(request.query);
    if (!validation.success) {
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=invalid_callback`);
    }

    const { code, state: stateParam, error, error_description } = validation.data;

    // Handle OAuth errors
    if (error) {
      const errorMessage = encodeURIComponent(error_description || error);
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=${errorMessage}`);
    }

    // Decode and validate state
    const state = decodeState(stateParam);
    if (!state) {
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=invalid_state`);
    }

    // Check state is not expired (10 minutes)
    if (Date.now() - state.timestamp > 600000) {
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=state_expired`);
    }

    if (!code) {
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=no_code`);
    }

    try {
      // Exchange code for user access token
      const tokenResponse = await fetch(
        `https://graph.facebook.com/v21.0/oauth/access_token?` +
        `client_id=${FACEBOOK_APP_ID}&` +
        `redirect_uri=${encodeURIComponent(OAUTH_REDIRECT_URI)}&` +
        `client_secret=${FACEBOOK_APP_SECRET}&` +
        `code=${code}`
      );

      if (!tokenResponse.ok) {
        throw new Error('Failed to exchange code for token');
      }

      const tokenData = await tokenResponse.json();
      const userAccessToken = tokenData.access_token;

      // Get user's Facebook Pages
      const pagesResponse = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?` +
        `fields=id,name,category,access_token,tasks&` +
        `access_token=${userAccessToken}`
      );

      if (!pagesResponse.ok) {
        throw new Error('Failed to get pages');
      }

      const pagesData = await pagesResponse.json();
      const pages = pagesData.data || [];

      if (pages.length === 0) {
        return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=no_pages`);
      }

      // If only one page, connect it directly
      if (pages.length === 1) {
        const page = pages[0];
        await connectPage(db, state.tenantId, state.userId, {
          pageId: page.id,
          pageName: page.name,
          pageCategory: page.category,
          pageAccessToken: page.access_token,
        });

        return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?success=messenger_connected`);
      }

      // Multiple pages - redirect to page selector with pages data
      const pagesParam = encodeURIComponent(JSON.stringify(pages.map((p: any) => ({
        id: p.id,
        name: p.name,
        category: p.category,
      }))));

      // Store tokens temporarily (in production, use Redis with TTL)
      const tempToken = crypto.randomBytes(32).toString('hex');
      // TODO: Store in Redis: tempToken -> { pages, tenantId, userId, expiresAt }

      return reply.redirect(
        `${FRONTEND_URL}/app/settings/integrations/messenger/select-page?` +
        `pages=${pagesParam}&token=${tempToken}&tenantId=${state.tenantId}`
      );

    } catch (error) {
      console.error('OAuth callback error:', error);
      return reply.redirect(`${FRONTEND_URL}/app/settings/integrations?error=oauth_failed`);
    }
  });

  // ==================== Select and Connect Page ====================

  /**
   * POST /oauth/select-page
   * Called after user selects a page from the list
   */
  fastify.post('/oauth/select-page', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;
    const userId = request.headers['x-user-id'] as string;

    if (!tenantId || !userId) {
      return reply.status(401).send({ success: false, error: 'Authentication required' });
    }

    const validation = selectPageSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { pageId, pageName, pageAccessToken } = validation.data;

    try {
      // Verify the page access token is valid
      const verifyResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?` +
        `fields=id,name,category&access_token=${pageAccessToken}`
      );

      if (!verifyResponse.ok) {
        return reply.status(400).send({ success: false, error: 'Invalid page access token' });
      }

      const pageData = await verifyResponse.json();

      await connectPage(db, tenantId, userId, {
        pageId,
        pageName: pageData.name || pageName,
        pageCategory: pageData.category,
        pageAccessToken,
      });

      return reply.send({
        success: true,
        data: {
          pageId,
          pageName: pageData.name,
          message: 'Facebook Page connected successfully'
        }
      });

    } catch (error) {
      console.error('Select page error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to connect page' });
    }
  });

  // ==================== Get Connected Pages ====================

  /**
   * GET /oauth/pages
   * Returns list of connected Facebook Pages for the tenant
   */
  fastify.get('/oauth/pages', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(401).send({ success: false, error: 'Tenant ID required' });
    }

    try {
      const { messengerPages } = await import('../../infrastructure/database/schema');

      const pages = await db
        .select({
          id: messengerPages.id,
          pageId: messengerPages.pageId,
          pageName: messengerPages.pageName,
          pageCategory: messengerPages.pageCategory,
          isActive: messengerPages.isActive,
          isDefault: messengerPages.isDefault,
          createdAt: messengerPages.createdAt,
        })
        .from(messengerPages)
        .where(eq(messengerPages.tenantId, tenantId));

      return reply.send({ success: true, data: pages });

    } catch (error) {
      console.error('Get pages error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to get pages' });
    }
  });

  // ==================== Disconnect Page ====================

  /**
   * DELETE /oauth/disconnect
   * Disconnects a Facebook Page from the tenant
   */
  fastify.delete('/oauth/disconnect', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(401).send({ success: false, error: 'Tenant ID required' });
    }

    const validation = disconnectSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({ success: false, error: validation.error.format() });
    }

    const { pageId } = validation.data;

    try {
      const { messengerPages } = await import('../../infrastructure/database/schema');

      await db
        .delete(messengerPages)
        .where(
          and(
            eq(messengerPages.tenantId, tenantId),
            eq(messengerPages.pageId, pageId)
          )
        );

      return reply.send({
        success: true,
        data: { message: 'Facebook Page disconnected successfully' }
      });

    } catch (error) {
      console.error('Disconnect error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to disconnect page' });
    }
  });

  // ==================== Set Default Page ====================

  /**
   * PATCH /oauth/pages/:pageId/default
   * Sets a page as the default for the tenant
   */
  fastify.patch('/oauth/pages/:pageId/default', async (request: FastifyRequest<{ Params: { pageId: string } }>, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(401).send({ success: false, error: 'Tenant ID required' });
    }

    const { pageId } = request.params;

    try {
      const { messengerPages } = await import('../../infrastructure/database/schema');

      // Remove default from all pages
      await db
        .update(messengerPages)
        .set({ isDefault: false })
        .where(eq(messengerPages.tenantId, tenantId));

      // Set new default
      await db
        .update(messengerPages)
        .set({ isDefault: true })
        .where(
          and(
            eq(messengerPages.tenantId, tenantId),
            eq(messengerPages.pageId, pageId)
          )
        );

      return reply.send({ success: true });

    } catch (error) {
      console.error('Set default error:', error);
      return reply.status(500).send({ success: false, error: 'Failed to set default page' });
    }
  });

  // ==================== Test Connection ====================

  /**
   * POST /oauth/test
   * Tests if the Messenger connection is working
   */
  fastify.post('/oauth/test', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.headers['x-tenant-id'] as string;

    if (!tenantId) {
      return reply.status(401).send({ success: false, error: 'Tenant ID required' });
    }

    try {
      const { messengerPages } = await import('../../infrastructure/database/schema');

      // Get default page
      const pages = await db
        .select()
        .from(messengerPages)
        .where(
          and(
            eq(messengerPages.tenantId, tenantId),
            eq(messengerPages.isActive, true)
          )
        )
        .limit(1);

      if (pages.length === 0) {
        return reply.send({
          success: true,
          data: {
            connected: false,
            message: 'No Facebook Page connected'
          }
        });
      }

      const page = pages[0];
      const token = decryptToken(page.pageAccessToken!);

      // Test API call
      const testResponse = await fetch(
        `https://graph.facebook.com/v21.0/${page.pageId}?` +
        `fields=id,name&access_token=${token}`
      );

      if (!testResponse.ok) {
        return reply.send({
          success: true,
          data: {
            connected: false,
            message: 'Token expired or invalid. Please reconnect.'
          }
        });
      }

      const pageData = await testResponse.json();

      return reply.send({
        success: true,
        data: {
          connected: true,
          pageId: pageData.id,
          pageName: pageData.name,
          message: 'Connection working correctly'
        }
      });

    } catch (error) {
      console.error('Test connection error:', error);
      return reply.status(500).send({ success: false, error: 'Connection test failed' });
    }
  });
}

// ==================== Helper Functions ====================

async function connectPage(
  db: any,
  tenantId: string,
  userId: string,
  pageData: {
    pageId: string;
    pageName: string;
    pageCategory?: string;
    pageAccessToken: string;
  }
): Promise<void> {
  const { messengerPages } = await import('../../infrastructure/database/schema');

  // Generate webhook verify token for this tenant
  const webhookVerifyToken = crypto.randomBytes(32).toString('hex');

  // Check if page already exists for this tenant
  const existing = await db
    .select()
    .from(messengerPages)
    .where(
      and(
        eq(messengerPages.tenantId, tenantId),
        eq(messengerPages.pageId, pageData.pageId)
      )
    )
    .limit(1);

  const encryptedToken = encryptToken(pageData.pageAccessToken);

  if (existing.length > 0) {
    // Update existing
    await db
      .update(messengerPages)
      .set({
        pageName: pageData.pageName,
        pageCategory: pageData.pageCategory,
        pageAccessToken: encryptedToken,
        isActive: true,
        updatedAt: new Date(),
      })
      .where(eq(messengerPages.id, existing[0].id));
  } else {
    // Check if this is the first page (make it default)
    const pageCount = await db
      .select({ count: messengerPages.id })
      .from(messengerPages)
      .where(eq(messengerPages.tenantId, tenantId));

    const isFirst = !pageCount[0]?.count;

    // Insert new
    await db.insert(messengerPages).values({
      id: crypto.randomUUID(),
      tenantId,
      pageId: pageData.pageId,
      appId: FACEBOOK_APP_ID,
      pageName: pageData.pageName,
      pageCategory: pageData.pageCategory,
      pageAccessToken: encryptedToken,
      webhookVerifyToken,
      isActive: true,
      isDefault: isFirst,
      permissionsGranted: ['pages_messaging', 'pages_read_engagement'],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  // TODO: Subscribe page to webhooks
  // await subscribePageToWebhooks(pageData.pageId, pageData.pageAccessToken);
}
