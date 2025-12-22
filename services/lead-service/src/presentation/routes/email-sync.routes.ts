/**
 * Email Sync Routes
 * REST API endpoints for bidirectional email synchronization
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { EmailSyncService } from '../../infrastructure/email-sync';
import {
  EmailProvider,
  ConnectEmailAccountInput,
  SendEmailInput,
  ListEmailsOptions,
  EmailAddress,
} from '../../infrastructure/email-sync/types';

// Request schemas
interface AccountParams {
  accountId: string;
}

interface MessageParams {
  messageId: string;
}

interface GetAuthUrlQuery {
  provider: EmailProvider;
  state?: string;
}

interface ConnectAccountBody {
  provider: EmailProvider;
  authCode: string;
  redirectUri?: string;
  displayName?: string;
  syncDirection?: 'inbound' | 'outbound' | 'bidirectional';
  syncFolders?: string[];
  autoMatchLeads?: boolean;
  matchByDomain?: boolean;
  matchByEmail?: boolean;
}

interface SendEmailBody {
  accountId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  replyToMessageId?: string;
  threadId?: string;
  linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkToEntityId?: string;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

interface ListEmailsQuery {
  accountId?: string;
  threadId?: string;
  folder?: string;
  isRead?: string;
  isStarred?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  search?: string;
  from?: string;
  to?: string;
  sortBy?: 'receivedAt' | 'sentAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

interface LinkEmailBody {
  entityType: 'lead' | 'contact' | 'customer' | 'opportunity';
  entityId: string;
}

export async function emailSyncRoutes(fastify: FastifyInstance): Promise<void> {
  const emailSyncService = container.resolve<EmailSyncService>('EmailSyncService');

  /**
   * Get OAuth authorization URL
   * GET /api/v1/email-sync/auth/url
   */
  fastify.get(
    '/auth/url',
    async (
      request: FastifyRequest<{ Querystring: GetAuthUrlQuery }>,
      reply: FastifyReply
    ) => {
      const { provider, state } = request.query;

      const result = emailSyncService.getAuthUrl(
        provider,
        state || 'default'
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Failed to get auth URL',
          message: result.error || 'Provider not supported or not configured',
        });
      }

      return reply.status(200).send({
        success: true,
        data: {
          authUrl: result.value,
          provider,
        },
      });
    }
  );

  /**
   * Connect email account (OAuth callback)
   * POST /api/v1/email-sync/accounts/connect
   */
  fastify.post(
    '/accounts/connect',
    async (
      request: FastifyRequest<{ Body: ConnectAccountBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const body = request.body;

      const input: ConnectEmailAccountInput = {
        provider: body.provider,
        email: '', // Will be retrieved from OAuth profile
        authCode: body.authCode,
        redirectUri: body.redirectUri,
        displayName: body.displayName,
        syncDirection: body.syncDirection,
        syncFolders: body.syncFolders,
        autoMatchLeads: body.autoMatchLeads,
        matchByDomain: body.matchByDomain,
        matchByEmail: body.matchByEmail,
      };

      const result = await emailSyncService.connectAccount(
        tenantId,
        userId,
        input
      );

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Connection Failed',
          message: result.error || 'Failed to connect email account',
        });
      }

      return reply.status(201).send({
        success: true,
        data: {
          id: result.value.id,
          email: result.value.email,
          displayName: result.value.displayName,
          provider: result.value.provider,
          syncStatus: result.value.syncStatus,
        },
      });
    }
  );

  /**
   * List connected email accounts
   * GET /api/v1/email-sync/accounts
   */
  fastify.get(
    '/accounts',
    async (
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const result = await emailSyncService.listAccounts(tenantId, userId);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list accounts',
        });
      }

      // Return sanitized account info (no tokens)
      const accounts = result.value.map(account => ({
        id: account.id,
        email: account.email,
        displayName: account.displayName,
        provider: account.provider,
        syncDirection: account.syncDirection,
        syncFolders: account.syncFolders,
        lastSyncAt: account.lastSyncAt,
        syncStatus: account.syncStatus,
        syncError: account.syncError,
        autoMatchLeads: account.autoMatchLeads,
        matchByDomain: account.matchByDomain,
        matchByEmail: account.matchByEmail,
        isActive: account.isActive,
        createdAt: account.createdAt,
      }));

      return reply.status(200).send({
        success: true,
        data: accounts,
      });
    }
  );

  /**
   * Get email account by ID
   * GET /api/v1/email-sync/accounts/:accountId
   */
  fastify.get(
    '/accounts/:accountId',
    async (
      request: FastifyRequest<{ Params: AccountParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { accountId } = request.params;

      const result = await emailSyncService.getAccountById(accountId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get account',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Email account not found',
        });
      }

      const account = result.value;

      return reply.status(200).send({
        success: true,
        data: {
          id: account.id,
          email: account.email,
          displayName: account.displayName,
          provider: account.provider,
          syncDirection: account.syncDirection,
          syncFolders: account.syncFolders,
          lastSyncAt: account.lastSyncAt,
          syncStatus: account.syncStatus,
          syncError: account.syncError,
          autoMatchLeads: account.autoMatchLeads,
          matchByDomain: account.matchByDomain,
          matchByEmail: account.matchByEmail,
          isActive: account.isActive,
          createdAt: account.createdAt,
        },
      });
    }
  );

  /**
   * Disconnect email account
   * DELETE /api/v1/email-sync/accounts/:accountId
   */
  fastify.delete(
    '/accounts/:accountId',
    async (
      request: FastifyRequest<{ Params: AccountParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { accountId } = request.params;

      const result = await emailSyncService.disconnectAccount(accountId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Disconnect Failed',
          message: result.error || 'Failed to disconnect account',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Email account disconnected successfully',
      });
    }
  );

  /**
   * Trigger email sync for account
   * POST /api/v1/email-sync/accounts/:accountId/sync
   */
  fastify.post(
    '/accounts/:accountId/sync',
    async (
      request: FastifyRequest<{ Params: AccountParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { accountId } = request.params;

      const result = await emailSyncService.syncAccount(accountId, tenantId);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Sync Failed',
          message: result.error || 'Failed to start sync',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Send email
   * POST /api/v1/email-sync/send
   */
  fastify.post(
    '/send',
    async (
      request: FastifyRequest<{ Body: SendEmailBody }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;
      const userId = request.headers['x-user-id'] as string;

      if (!tenantId || !userId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant or user identification',
        });
      }

      const body = request.body;

      const input: SendEmailInput = {
        accountId: body.accountId,
        to: body.to,
        cc: body.cc,
        bcc: body.bcc,
        subject: body.subject,
        body: body.body,
        bodyHtml: body.bodyHtml,
        replyToMessageId: body.replyToMessageId,
        threadId: body.threadId,
        linkToEntityType: body.linkToEntityType,
        linkToEntityId: body.linkToEntityId,
        trackOpens: body.trackOpens,
        trackClicks: body.trackClicks,
      };

      const result = await emailSyncService.sendEmail(tenantId, userId, input);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Send Failed',
          message: result.error || 'Failed to send email',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * List emails
   * GET /api/v1/email-sync/emails
   */
  fastify.get(
    '/emails',
    async (
      request: FastifyRequest<{ Querystring: ListEmailsQuery }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const query = request.query;

      const options: ListEmailsOptions = {
        accountId: query.accountId,
        threadId: query.threadId,
        folder: query.folder,
        isRead: query.isRead === 'true' ? true : query.isRead === 'false' ? false : undefined,
        isStarred: query.isStarred === 'true' ? true : query.isStarred === 'false' ? false : undefined,
        linkedEntityType: query.linkedEntityType,
        linkedEntityId: query.linkedEntityId,
        search: query.search,
        from: query.from ? new Date(query.from) : undefined,
        to: query.to ? new Date(query.to) : undefined,
        sortBy: query.sortBy,
        sortOrder: query.sortOrder,
        page: query.page ? Number(query.page) : undefined,
        limit: query.limit ? Number(query.limit) : undefined,
      };

      const result = await emailSyncService.listEmails(tenantId, options);

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list emails',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Get email by ID
   * GET /api/v1/email-sync/emails/:messageId
   */
  fastify.get(
    '/emails/:messageId',
    async (
      request: FastifyRequest<{ Params: MessageParams }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { messageId } = request.params;

      const result = await emailSyncService.getMessageById(messageId, tenantId);

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to get email',
        });
      }

      if (!result.value) {
        return reply.status(404).send({
          error: 'Not Found',
          message: 'Email not found',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );

  /**
   * Link email to CRM entity
   * POST /api/v1/email-sync/emails/:messageId/link
   */
  fastify.post(
    '/emails/:messageId/link',
    async (
      request: FastifyRequest<{
        Params: MessageParams;
        Body: LinkEmailBody;
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { messageId } = request.params;
      const { entityType, entityId } = request.body;

      const result = await emailSyncService.linkEmail(
        messageId,
        tenantId,
        entityType,
        entityId
      );

      if (result.isFailure) {
        return reply.status(400).send({
          error: 'Link Failed',
          message: result.error || 'Failed to link email',
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Email linked successfully',
      });
    }
  );

  /**
   * Get emails for a CRM entity
   * GET /api/v1/email-sync/entity/:entityType/:entityId
   */
  fastify.get(
    '/entity/:entityType/:entityId',
    async (
      request: FastifyRequest<{
        Params: { entityType: string; entityId: string };
        Querystring: { page?: number; limit?: number };
      }>,
      reply: FastifyReply
    ) => {
      const tenantId = request.headers['x-tenant-id'] as string;

      if (!tenantId) {
        return reply.status(401).send({
          error: 'Unauthorized',
          message: 'Missing tenant identification',
        });
      }

      const { entityType, entityId } = request.params;
      const { page, limit } = request.query;

      const result = await emailSyncService.listEmails(tenantId, {
        linkedEntityType: entityType,
        linkedEntityId: entityId,
        page: page ? Number(page) : undefined,
        limit: limit ? Number(limit) : undefined,
        sortBy: 'receivedAt',
        sortOrder: 'desc',
      });

      if (result.isFailure || !result.value) {
        return reply.status(400).send({
          error: 'Query Failed',
          message: result.error || 'Failed to list emails for entity',
        });
      }

      return reply.status(200).send({
        success: true,
        data: result.value,
      });
    }
  );
}
