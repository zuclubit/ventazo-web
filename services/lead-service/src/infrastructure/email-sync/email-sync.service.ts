/**
 * Email Sync Service
 * Manages bidirectional email synchronization
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  EmailAccount,
  EmailMessage,
  EmailThread,
  EmailSyncJob,
  ConnectEmailAccountInput,
  SendEmailInput,
  ListEmailsOptions,
  PaginatedEmailsResponse,
  ListThreadsOptions,
  PaginatedThreadsResponse,
  EmailProvider,
  SyncDirection,
  EmailSyncStatus,
} from './types';
import { GmailProvider } from './gmail.provider';

/**
 * Email Sync Service
 * Handles email account management and synchronization
 */
@injectable()
export class EmailSyncService {
  private gmailProvider: GmailProvider;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.gmailProvider = new GmailProvider();
  }

  /**
   * Get OAuth authorization URL
   */
  getAuthUrl(provider: EmailProvider, state: string): Result<string> {
    try {
      if (provider === 'google') {
        if (!this.gmailProvider.isAvailable()) {
          return Result.fail('Gmail provider not configured');
        }
        return Result.ok(this.gmailProvider.getAuthUrl(state));
      }

      return Result.fail(`Provider ${provider} not supported`);
    } catch (error) {
      return Result.fail(`Failed to get auth URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect email account via OAuth callback
   */
  async connectAccount(
    tenantId: string,
    userId: string,
    input: ConnectEmailAccountInput
  ): Promise<Result<EmailAccount>> {
    try {
      if (input.provider === 'google' && input.authCode) {
        return this.connectGmailAccount(tenantId, userId, input);
      }

      return Result.fail(`Provider ${input.provider} connection not implemented`);
    } catch (error) {
      return Result.fail(`Failed to connect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Connect Gmail account
   */
  private async connectGmailAccount(
    tenantId: string,
    userId: string,
    input: ConnectEmailAccountInput
  ): Promise<Result<EmailAccount>> {
    try {
      // Exchange code for tokens
      const tokens = await this.gmailProvider.exchangeCodeForTokens(input.authCode!);

      // Get user profile
      const profile = await this.gmailProvider.getUserProfile(tokens.accessToken);

      // Check if account already exists
      const existingResult = await this.pool.query(
        `SELECT id FROM email_accounts WHERE tenant_id = $1 AND email = $2`,
        [tenantId, profile.email]
      );

      if (existingResult.isSuccess && existingResult.value?.rows?.[0]) {
        // Update existing account
        return this.updateAccountTokens(
          existingResult.value.rows[0].id,
          tenantId,
          tokens.accessToken,
          tokens.refreshToken,
          tokens.expiresIn
        );
      }

      // Create new account
      const id = uuidv4();
      const now = new Date();
      const tokenExpiry = tokens.expiresIn
        ? new Date(Date.now() + tokens.expiresIn * 1000)
        : null;

      const query = `
        INSERT INTO email_accounts (
          id, tenant_id, user_id, provider, email, display_name,
          access_token, refresh_token, token_expiry,
          sync_direction, sync_folders, sync_status,
          auto_match_leads, match_by_domain, match_by_email,
          is_active, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        userId,
        'google',
        profile.email,
        input.displayName || profile.name,
        tokens.accessToken,
        tokens.refreshToken,
        tokenExpiry,
        input.syncDirection || 'bidirectional',
        JSON.stringify(input.syncFolders || ['INBOX', 'SENT']),
        'active',
        input.autoMatchLeads ?? true,
        input.matchByDomain ?? true,
        input.matchByEmail ?? true,
        true,
        now,
        now,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to save email account');
      }

      return Result.ok(this.mapRowToAccount(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to connect Gmail: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update account tokens
   */
  private async updateAccountTokens(
    accountId: string,
    tenantId: string,
    accessToken: string,
    refreshToken?: string,
    expiresIn?: number
  ): Promise<Result<EmailAccount>> {
    const tokenExpiry = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    const query = `
      UPDATE email_accounts
      SET access_token = $1,
          ${refreshToken ? 'refresh_token = $2,' : ''}
          token_expiry = $${refreshToken ? '3' : '2'},
          sync_status = 'active',
          is_active = true,
          updated_at = NOW()
      WHERE id = $${refreshToken ? '4' : '3'} AND tenant_id = $${refreshToken ? '5' : '4'}
      RETURNING *
    `;

    const params = refreshToken
      ? [accessToken, refreshToken, tokenExpiry, accountId, tenantId]
      : [accessToken, tokenExpiry, accountId, tenantId];

    const result = await this.pool.query(query, params);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to update account tokens');
    }

    return Result.ok(this.mapRowToAccount(result.value.rows[0]));
  }

  /**
   * Disconnect email account
   */
  async disconnectAccount(accountId: string, tenantId: string): Promise<Result<void>> {
    try {
      const query = `
        UPDATE email_accounts
        SET is_active = false, sync_status = 'disconnected', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [accountId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to disconnect account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get email account by ID
   */
  async getAccountById(accountId: string, tenantId: string): Promise<Result<EmailAccount | null>> {
    try {
      const query = `SELECT * FROM email_accounts WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [accountId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to get account');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToAccount(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get account: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List email accounts for user
   */
  async listAccounts(tenantId: string, userId?: string): Promise<Result<EmailAccount[]>> {
    try {
      const query = userId
        ? `SELECT * FROM email_accounts WHERE tenant_id = $1 AND user_id = $2 AND is_active = true ORDER BY created_at DESC`
        : `SELECT * FROM email_accounts WHERE tenant_id = $1 AND is_active = true ORDER BY created_at DESC`;

      const params = userId ? [tenantId, userId] : [tenantId];
      const result = await this.pool.query(query, params);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to list accounts');
      }

      return Result.ok(result.value.rows.map((row: Record<string, unknown>) => this.mapRowToAccount(row)));
    } catch (error) {
      return Result.fail(`Failed to list accounts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync emails for account
   */
  async syncAccount(accountId: string, tenantId: string): Promise<Result<EmailSyncJob>> {
    try {
      // Get account
      const accountResult = await this.getAccountById(accountId, tenantId);
      if (accountResult.isFailure || !accountResult.value) {
        return Result.fail(accountResult.error || 'Account not found');
      }

      const account = accountResult.value;

      // Check if tokens need refresh
      if (account.provider === 'google' && account.refreshToken && account.tokenExpiry) {
        if (new Date() >= account.tokenExpiry) {
          const newTokens = await this.gmailProvider.refreshAccessToken(account.refreshToken);
          await this.updateAccountTokens(
            accountId,
            tenantId,
            newTokens.accessToken,
            undefined,
            newTokens.expiresIn
          );
          account.accessToken = newTokens.accessToken;
        }
      }

      // Create sync job
      const jobId = uuidv4();
      const now = new Date();

      const jobQuery = `
        INSERT INTO email_sync_jobs (
          id, account_id, tenant_id, type, status,
          processed_messages, new_messages, updated_messages,
          started_at, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const jobResult = await this.pool.query(jobQuery, [
        jobId,
        accountId,
        tenantId,
        account.lastSyncAt ? 'incremental' : 'full',
        'running',
        0,
        0,
        0,
        now,
        now,
      ]);

      if (jobResult.isFailure || !jobResult.value?.rows?.[0]) {
        return Result.fail('Failed to create sync job');
      }

      // Start sync (in background ideally)
      this.performSync(account, jobId).catch(console.error);

      return Result.ok(this.mapRowToSyncJob(jobResult.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to start sync: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform the actual sync
   */
  private async performSync(account: EmailAccount, jobId: string): Promise<void> {
    try {
      if (account.provider !== 'google' || !account.accessToken) {
        throw new Error('Invalid account configuration');
      }

      let processedMessages = 0;
      let newMessages = 0;
      let pageToken: string | undefined;

      // Sync messages
      do {
        const response = await this.gmailProvider.listMessages(account.accessToken, {
          maxResults: 100,
          pageToken,
        });

        if (!response.messages) break;

        for (const msg of response.messages) {
          const gmailMessage = await this.gmailProvider.getMessage(account.accessToken, msg.id);
          const emailData = this.gmailProvider.parseMessage(
            gmailMessage,
            account.id,
            account.tenantId
          );

          // Check if message exists
          const existingResult = await this.pool.query(
            `SELECT id FROM email_messages WHERE account_id = $1 AND external_id = $2`,
            [account.id, emailData.externalId]
          );

          if (existingResult.isSuccess && !existingResult.value?.rows?.[0]) {
            // Insert new message
            await this.saveEmailMessage(emailData, account.tenantId);
            newMessages++;
          }

          processedMessages++;

          // Update job progress
          await this.pool.query(
            `UPDATE email_sync_jobs SET processed_messages = $1, new_messages = $2 WHERE id = $3`,
            [processedMessages, newMessages, jobId]
          );
        }

        pageToken = response.nextPageToken;
      } while (pageToken);

      // Mark job as completed
      await this.pool.query(
        `UPDATE email_sync_jobs SET status = 'completed', completed_at = NOW() WHERE id = $1`,
        [jobId]
      );

      // Update account last sync time
      await this.pool.query(
        `UPDATE email_accounts SET last_sync_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [account.id]
      );
    } catch (error) {
      await this.pool.query(
        `UPDATE email_sync_jobs SET status = 'failed', error_message = $1, completed_at = NOW() WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', jobId]
      );
    }
  }

  /**
   * Save email message
   */
  private async saveEmailMessage(
    data: Partial<EmailMessage>,
    tenantId: string
  ): Promise<string> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO email_messages (
        id, tenant_id, account_id, external_id, external_thread_id,
        subject, snippet, body, body_html, body_plain,
        from_email, from_name, to_addresses, cc_addresses, bcc_addresses,
        message_id, in_reply_to, has_attachments, attachments,
        is_read, is_starred, is_archived, is_draft, is_sent,
        labels, folder, received_at, synced_at, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19,
        $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
      )
      RETURNING id
    `;

    await this.pool.query(query, [
      id,
      tenantId,
      data.accountId,
      data.externalId,
      data.externalThreadId,
      data.subject,
      data.snippet,
      data.body,
      data.bodyHtml,
      data.bodyPlain,
      data.from?.email,
      data.from?.name,
      JSON.stringify(data.to || []),
      JSON.stringify(data.cc || []),
      JSON.stringify(data.bcc || []),
      data.messageId,
      data.inReplyTo,
      data.hasAttachments || false,
      JSON.stringify(data.attachments || []),
      data.isRead || false,
      data.isStarred || false,
      data.isArchived || false,
      data.isDraft || false,
      data.isSent || false,
      JSON.stringify(data.labels || []),
      data.folder || 'INBOX',
      data.receivedAt,
      now,
      now,
      now,
    ]);

    // Try to auto-match to CRM entities
    if (data.from?.email) {
      await this.tryAutoMatch(id, tenantId, data.from.email);
    }

    return id;
  }

  /**
   * Try to auto-match email to CRM entity
   */
  private async tryAutoMatch(emailId: string, tenantId: string, fromEmail: string): Promise<void> {
    // Try to match by email address
    const leadResult = await this.pool.query(
      `SELECT id FROM leads WHERE tenant_id = $1 AND (email = $2 OR contacts @> $3::jsonb)`,
      [tenantId, fromEmail, JSON.stringify([{ email: fromEmail }])]
    );

    if (leadResult.isSuccess && leadResult.value?.rows?.[0]) {
      await this.pool.query(
        `UPDATE email_messages SET linked_entity_type = 'lead', linked_entity_id = $1 WHERE id = $2`,
        [leadResult.value.rows[0].id, emailId]
      );
      return;
    }

    // Try to match by domain
    const domain = fromEmail.split('@')[1];
    if (domain) {
      const domainResult = await this.pool.query(
        `SELECT id FROM leads WHERE tenant_id = $1 AND website LIKE $2`,
        [tenantId, `%${domain}%`]
      );

      if (domainResult.isSuccess && domainResult.value?.rows?.[0]) {
        await this.pool.query(
          `UPDATE email_messages SET linked_entity_type = 'lead', linked_entity_id = $1 WHERE id = $2`,
          [domainResult.value.rows[0].id, emailId]
        );
      }
    }
  }

  /**
   * Send email
   */
  async sendEmail(
    tenantId: string,
    userId: string,
    input: SendEmailInput
  ): Promise<Result<EmailMessage>> {
    try {
      // Get account
      const accountResult = await this.getAccountById(input.accountId, tenantId);
      if (accountResult.isFailure || !accountResult.value) {
        return Result.fail(accountResult.error || 'Account not found');
      }

      const account = accountResult.value;

      if (account.provider !== 'google' || !account.accessToken) {
        return Result.fail('Invalid account configuration');
      }

      // Refresh token if needed
      if (account.refreshToken && account.tokenExpiry && new Date() >= account.tokenExpiry) {
        const newTokens = await this.gmailProvider.refreshAccessToken(account.refreshToken);
        await this.updateAccountTokens(input.accountId, tenantId, newTokens.accessToken);
        account.accessToken = newTokens.accessToken;
      }

      // Send email
      const sendResult = await this.gmailProvider.sendEmail(account.accessToken, input);

      // Get the sent message details
      const gmailMessage = await this.gmailProvider.getMessage(account.accessToken, sendResult.id);
      const emailData = this.gmailProvider.parseMessage(gmailMessage, account.id, tenantId);

      // Save to database
      const savedId = await this.saveEmailMessage({
        ...emailData,
        isSent: true,
        linkedEntityType: input.linkToEntityType,
        linkedEntityId: input.linkToEntityId,
      }, tenantId);

      // Get the saved message
      const messageResult = await this.getMessageById(savedId, tenantId);
      if (messageResult.isFailure || !messageResult.value) {
        return Result.fail('Email sent but failed to save locally');
      }

      return Result.ok(messageResult.value);
    } catch (error) {
      return Result.fail(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get message by ID
   */
  async getMessageById(messageId: string, tenantId: string): Promise<Result<EmailMessage | null>> {
    try {
      const query = `SELECT * FROM email_messages WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [messageId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to get message');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToMessage(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List emails
   */
  async listEmails(
    tenantId: string,
    options: ListEmailsOptions
  ): Promise<Result<PaginatedEmailsResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.accountId) {
        conditions.push(`account_id = $${paramIndex++}`);
        values.push(options.accountId);
      }

      if (options.threadId) {
        conditions.push(`thread_id = $${paramIndex++}`);
        values.push(options.threadId);
      }

      if (options.folder) {
        conditions.push(`folder = $${paramIndex++}`);
        values.push(options.folder);
      }

      if (options.isRead !== undefined) {
        conditions.push(`is_read = $${paramIndex++}`);
        values.push(options.isRead);
      }

      if (options.linkedEntityType) {
        conditions.push(`linked_entity_type = $${paramIndex++}`);
        values.push(options.linkedEntityType);
      }

      if (options.linkedEntityId) {
        conditions.push(`linked_entity_id = $${paramIndex++}`);
        values.push(options.linkedEntityId);
      }

      if (options.search) {
        conditions.push(`(subject ILIKE $${paramIndex} OR body_plain ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const sortColumn = options.sortBy || 'received_at';
      const sortOrder = options.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM email_messages WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count emails');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get emails
      const query = `
        SELECT * FROM email_messages
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list emails');
      }

      const emails = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToMessage(row)
      );

      return Result.ok({
        emails,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Link email to CRM entity
   */
  async linkEmail(
    emailId: string,
    tenantId: string,
    entityType: 'lead' | 'contact' | 'customer' | 'opportunity',
    entityId: string
  ): Promise<Result<void>> {
    try {
      const query = `
        UPDATE email_messages
        SET linked_entity_type = $1, linked_entity_id = $2, is_linked_manually = true, updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
      `;

      await this.pool.query(query, [entityType, entityId, emailId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to link email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to EmailAccount
   */
  private mapRowToAccount(row: Record<string, unknown>): EmailAccount {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      provider: row.provider as EmailProvider,
      email: row.email as string,
      displayName: row.display_name as string | undefined,
      accessToken: row.access_token as string | undefined,
      refreshToken: row.refresh_token as string | undefined,
      tokenExpiry: row.token_expiry ? new Date(row.token_expiry as string) : undefined,
      imapHost: row.imap_host as string | undefined,
      imapPort: row.imap_port as number | undefined,
      imapUser: row.imap_user as string | undefined,
      imapPassword: row.imap_password as string | undefined,
      smtpHost: row.smtp_host as string | undefined,
      smtpPort: row.smtp_port as number | undefined,
      syncDirection: row.sync_direction as SyncDirection,
      syncFolders: typeof row.sync_folders === 'string'
        ? JSON.parse(row.sync_folders)
        : row.sync_folders as string[],
      lastSyncAt: row.last_sync_at ? new Date(row.last_sync_at as string) : undefined,
      syncStatus: row.sync_status as EmailSyncStatus,
      syncError: row.sync_error as string | undefined,
      autoMatchLeads: row.auto_match_leads as boolean,
      matchByDomain: row.match_by_domain as boolean,
      matchByEmail: row.match_by_email as boolean,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to EmailMessage
   */
  private mapRowToMessage(row: Record<string, unknown>): EmailMessage {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      accountId: row.account_id as string,
      externalId: row.external_id as string,
      externalThreadId: row.external_thread_id as string | undefined,
      threadId: row.thread_id as string | undefined,
      subject: row.subject as string,
      snippet: row.snippet as string | undefined,
      body: row.body as string,
      bodyHtml: row.body_html as string | undefined,
      bodyPlain: row.body_plain as string | undefined,
      from: {
        email: row.from_email as string,
        name: row.from_name as string | undefined,
      },
      to: typeof row.to_addresses === 'string'
        ? JSON.parse(row.to_addresses)
        : row.to_addresses as EmailMessage['to'],
      cc: typeof row.cc_addresses === 'string'
        ? JSON.parse(row.cc_addresses)
        : row.cc_addresses as EmailMessage['cc'],
      bcc: typeof row.bcc_addresses === 'string'
        ? JSON.parse(row.bcc_addresses)
        : row.bcc_addresses as EmailMessage['bcc'],
      messageId: row.message_id as string | undefined,
      inReplyTo: row.in_reply_to as string | undefined,
      references: row.references as string[] | undefined,
      hasAttachments: row.has_attachments as boolean,
      attachments: typeof row.attachments === 'string'
        ? JSON.parse(row.attachments)
        : row.attachments as EmailMessage['attachments'],
      isRead: row.is_read as boolean,
      isStarred: row.is_starred as boolean,
      isArchived: row.is_archived as boolean,
      isDraft: row.is_draft as boolean,
      isSent: row.is_sent as boolean,
      labels: typeof row.labels === 'string'
        ? JSON.parse(row.labels)
        : row.labels as string[],
      folder: row.folder as string,
      linkedEntityType: row.linked_entity_type as EmailMessage['linkedEntityType'],
      linkedEntityId: row.linked_entity_id as string | undefined,
      isLinkedManually: row.is_linked_manually as boolean,
      sentAt: row.sent_at ? new Date(row.sent_at as string) : undefined,
      receivedAt: row.received_at ? new Date(row.received_at as string) : undefined,
      syncedAt: new Date(row.synced_at as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to EmailSyncJob
   */
  private mapRowToSyncJob(row: Record<string, unknown>): EmailSyncJob {
    return {
      id: row.id as string,
      accountId: row.account_id as string,
      tenantId: row.tenant_id as string,
      type: row.type as EmailSyncJob['type'],
      folder: row.folder as string | undefined,
      status: row.status as EmailSyncJob['status'],
      totalMessages: row.total_messages as number | undefined,
      processedMessages: row.processed_messages as number,
      newMessages: row.new_messages as number,
      updatedMessages: row.updated_messages as number,
      errorMessage: row.error_message as string | undefined,
      errorDetails: row.error_details as Record<string, unknown> | undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
    };
  }
}
