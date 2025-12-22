/**
 * Email Sync Types
 * Types for bidirectional email synchronization
 */

/**
 * Email provider types
 */
export type EmailProvider = 'google' | 'microsoft' | 'imap';

/**
 * Email sync direction
 */
export type SyncDirection = 'inbound' | 'outbound' | 'bidirectional';

/**
 * Email sync status
 */
export type EmailSyncStatus = 'active' | 'paused' | 'error' | 'disconnected';

/**
 * Email thread status
 */
export type ThreadStatus = 'active' | 'archived' | 'deleted';

/**
 * Email account integration
 */
export interface EmailAccount {
  id: string;
  tenantId: string;
  userId: string;

  // Provider info
  provider: EmailProvider;
  email: string;
  displayName?: string;

  // OAuth credentials
  accessToken?: string;
  refreshToken?: string;
  tokenExpiry?: Date;

  // IMAP credentials (encrypted)
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  smtpHost?: string;
  smtpPort?: number;

  // Sync settings
  syncDirection: SyncDirection;
  syncFolders: string[];
  lastSyncAt?: Date;
  syncStatus: EmailSyncStatus;
  syncError?: string;

  // Matching settings
  autoMatchLeads: boolean;
  matchByDomain: boolean;
  matchByEmail: boolean;

  // Status
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email message
 */
export interface EmailMessage {
  id: string;
  tenantId: string;
  accountId: string;

  // External IDs
  externalId: string;
  externalThreadId?: string;

  // Thread info
  threadId?: string;

  // Message details
  subject: string;
  snippet?: string;
  body: string;
  bodyHtml?: string;
  bodyPlain?: string;

  // Addresses
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress[];

  // Attachments
  hasAttachments: boolean;
  attachments: EmailAttachment[];

  // Headers
  messageId?: string;
  inReplyTo?: string;
  references?: string[];

  // Status
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDraft: boolean;
  isSent: boolean;

  // Labels/Folders
  labels: string[];
  folder: string;

  // CRM linking
  linkedEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkedEntityId?: string;
  isLinkedManually: boolean;

  // Timestamps
  sentAt?: Date;
  receivedAt?: Date;
  syncedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email address with name
 */
export interface EmailAddress {
  email: string;
  name?: string;
}

/**
 * Email attachment
 */
export interface EmailAttachment {
  id: string;
  fileName: string;
  mimeType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
  downloadUrl?: string;
}

/**
 * Email thread (conversation)
 */
export interface EmailThread {
  id: string;
  tenantId: string;
  accountId: string;

  // External reference
  externalId?: string;

  // Thread info
  subject: string;
  snippet?: string;
  messageCount: number;
  participantEmails: string[];

  // CRM linking
  linkedEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkedEntityId?: string;

  // Status
  status: ThreadStatus;
  hasUnread: boolean;
  isStarred: boolean;

  // Timestamps
  lastMessageAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Email sync job
 */
export interface EmailSyncJob {
  id: string;
  accountId: string;
  tenantId: string;

  // Job type
  type: 'full' | 'incremental' | 'folder';
  folder?: string;

  // Progress
  status: 'pending' | 'running' | 'completed' | 'failed';
  totalMessages?: number;
  processedMessages: number;
  newMessages: number;
  updatedMessages: number;

  // Error info
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;

  // Timestamps
  startedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
}

/**
 * Connect email account input
 */
export interface ConnectEmailAccountInput {
  provider: EmailProvider;
  email: string;
  displayName?: string;

  // OAuth flow
  authCode?: string;
  redirectUri?: string;

  // IMAP/SMTP credentials
  imapHost?: string;
  imapPort?: number;
  imapUser?: string;
  imapPassword?: string;
  smtpHost?: string;
  smtpPort?: number;

  // Settings
  syncDirection?: SyncDirection;
  syncFolders?: string[];
  autoMatchLeads?: boolean;
  matchByDomain?: boolean;
  matchByEmail?: boolean;
}

/**
 * Send email input
 */
export interface SendEmailInput {
  accountId: string;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: SendEmailAttachment[];
  replyToMessageId?: string;
  threadId?: string;

  // CRM linking
  linkToEntityType?: 'lead' | 'contact' | 'customer' | 'opportunity';
  linkToEntityId?: string;

  // Options
  scheduleAt?: Date;
  trackOpens?: boolean;
  trackClicks?: boolean;
}

/**
 * Send email attachment
 */
export interface SendEmailAttachment {
  fileName: string;
  mimeType: string;
  content: Buffer | string; // Buffer or base64
}

/**
 * List emails options
 */
export interface ListEmailsOptions {
  accountId?: string;
  threadId?: string;
  folder?: string;
  labels?: string[];
  isRead?: boolean;
  isStarred?: boolean;
  linkedEntityType?: string;
  linkedEntityId?: string;
  search?: string;
  from?: Date;
  to?: Date;
  sortBy?: 'receivedAt' | 'sentAt' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated emails response
 */
export interface PaginatedEmailsResponse {
  emails: EmailMessage[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * List threads options
 */
export interface ListThreadsOptions {
  accountId?: string;
  linkedEntityType?: string;
  linkedEntityId?: string;
  status?: ThreadStatus;
  hasUnread?: boolean;
  search?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/**
 * Paginated threads response
 */
export interface PaginatedThreadsResponse {
  threads: EmailThread[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
}

/**
 * OAuth tokens response
 */
export interface OAuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
  tokenType: string;
  scope?: string;
}

/**
 * Gmail API message format
 */
export interface GmailMessageResponse {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    headers: Array<{ name: string; value: string }>;
    mimeType: string;
    body?: { data?: string; size: number };
    parts?: GmailMessagePart[];
  };
  sizeEstimate: number;
  raw?: string;
}

/**
 * Gmail message part
 */
export interface GmailMessagePart {
  partId: string;
  mimeType: string;
  filename?: string;
  headers: Array<{ name: string; value: string }>;
  body?: {
    attachmentId?: string;
    size: number;
    data?: string;
  };
  parts?: GmailMessagePart[];
}

/**
 * Microsoft Graph message format
 */
export interface MSGraphMessageResponse {
  id: string;
  conversationId: string;
  subject: string;
  bodyPreview: string;
  body: {
    contentType: string;
    content: string;
  };
  from: {
    emailAddress: EmailAddress;
  };
  toRecipients: Array<{ emailAddress: EmailAddress }>;
  ccRecipients: Array<{ emailAddress: EmailAddress }>;
  bccRecipients: Array<{ emailAddress: EmailAddress }>;
  hasAttachments: boolean;
  isRead: boolean;
  isDraft: boolean;
  receivedDateTime: string;
  sentDateTime: string;
  parentFolderId: string;
}
