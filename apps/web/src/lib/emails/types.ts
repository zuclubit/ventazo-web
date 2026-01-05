/**
 * Email Module Types
 *
 * Type definitions for the email management system.
 * Supports Gmail/Outlook sync, inbox management, and composition.
 */

// ============================================
// Enums & Constants
// ============================================

export const EMAIL_FOLDERS = ['inbox', 'sent', 'drafts', 'trash', 'archive', 'starred'] as const;
export type EmailFolder = (typeof EMAIL_FOLDERS)[number];

export const EMAIL_STATUSES = ['draft', 'queued', 'sending', 'sent', 'delivered', 'opened', 'failed', 'bounced'] as const;
export type EmailStatus = (typeof EMAIL_STATUSES)[number];

export const EMAIL_PROVIDERS = ['gmail', 'outlook', 'other'] as const;
export type EmailProvider = (typeof EMAIL_PROVIDERS)[number];

export const EMAIL_SYNC_STATUSES = ['idle', 'syncing', 'success', 'error'] as const;
export type EmailSyncStatus = (typeof EMAIL_SYNC_STATUSES)[number];

// ============================================
// Core Interfaces
// ============================================

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface Email {
  id: string;
  tenantId: string;
  accountId: string;
  threadId?: string;
  messageId?: string; // External message ID (from Gmail/Outlook)
  folder: EmailFolder;
  status: EmailStatus;

  // Addresses
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  replyTo?: EmailAddress;

  // Content
  subject: string;
  snippet?: string; // Preview text
  body: string; // Plain text
  bodyHtml?: string; // HTML content

  // Attachments
  attachments?: EmailAttachment[];
  hasAttachments: boolean;

  // Related entity
  relatedEntity?: {
    type: 'customer' | 'lead' | 'opportunity' | 'contact';
    id: string;
    name: string;
  };

  // Flags
  isRead: boolean;
  isStarred: boolean;
  isImportant: boolean;
  isDraft: boolean;

  // Labels/Tags
  labels?: string[];

  // Timestamps
  sentAt?: string;
  receivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EmailThread {
  id: string;
  tenantId: string;
  accountId: string;
  subject: string;
  snippet: string;
  participants: EmailAddress[];
  emails: Email[];
  messageCount: number;
  unreadCount: number;
  hasAttachments: boolean;
  isStarred: boolean;
  latestDate: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Email Account (Gmail/Outlook)
// ============================================

export interface EmailAccount {
  id: string;
  tenantId: string;
  userId: string;
  provider: EmailProvider;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  isDefault: boolean;
  isConnected: boolean;
  lastSyncAt?: string;
  syncStatus: EmailSyncStatus;
  syncError?: string;
  settings: EmailAccountSettings;
  createdAt: string;
  updatedAt: string;
}

export interface EmailAccountSettings {
  signature?: string;
  autoSync: boolean;
  syncFrequency: 'realtime' | '5min' | '15min' | '30min' | 'manual';
  syncFolders: EmailFolder[];
  syncPeriod: '1week' | '2weeks' | '1month' | '3months' | 'all';
}

// ============================================
// Compose & Send
// ============================================

export interface ComposeEmailData {
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachments?: File[];
  replyToEmailId?: string;
  forwardEmailId?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  relatedEntity?: {
    type: 'customer' | 'lead' | 'opportunity' | 'contact';
    id: string;
  };
  scheduledAt?: string;
}

export interface SendEmailRequest {
  accountId: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  bodyHtml?: string;
  attachmentIds?: string[];
  replyToEmailId?: string;
  forwardEmailId?: string;
  templateId?: string;
  templateVariables?: Record<string, unknown>;
  relatedEntityType?: string;
  relatedEntityId?: string;
  scheduledAt?: string;
}

export interface SendEmailResult {
  success: boolean;
  emailId?: string;
  messageId?: string;
  error?: string;
}

// ============================================
// Filters & Queries
// ============================================

export interface EmailFilters {
  folder?: EmailFolder;
  accountId?: string;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  from?: string;
  to?: string;
  subject?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
  labels?: string[];
}

export interface EmailQueryParams extends EmailFilters {
  page?: number;
  limit?: number;
  sortBy?: 'date' | 'subject' | 'from';
  sortOrder?: 'asc' | 'desc';
}

// ============================================
// API Responses
// ============================================

export interface EmailsListResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EmailThreadsListResponse {
  threads: EmailThread[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface EmailAccountsListResponse {
  accounts: EmailAccount[];
}

export interface EmailFolderStats {
  folder: EmailFolder;
  total: number;
  unread: number;
}

export interface EmailStats {
  totalEmails: number;
  unreadCount: number;
  sentToday: number;
  receivedToday: number;
  draftCount: number;
  folderStats: EmailFolderStats[];
}

// ============================================
// OAuth & Sync
// ============================================

export interface ConnectEmailRequest {
  provider: EmailProvider;
  returnUrl?: string;
}

export interface ConnectEmailResult {
  success: boolean;
  authUrl?: string;
  accountId?: string;
  error?: string;
}

export interface SyncEmailRequest {
  accountId: string;
  folders?: EmailFolder[];
  fullSync?: boolean;
}

export interface SyncEmailResult {
  success: boolean;
  syncedCount: number;
  newCount: number;
  errorCount: number;
  lastSyncAt: string;
}

// ============================================
// Draft Management
// ============================================

export interface CreateDraftRequest {
  accountId: string;
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  bodyHtml?: string;
  replyToEmailId?: string;
  forwardEmailId?: string;
}

export interface UpdateDraftRequest {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  body?: string;
  bodyHtml?: string;
}

// ============================================
// Recipient Autocomplete
// ============================================

export interface RecipientSuggestion {
  email: string;
  name?: string;
  avatarUrl?: string;
  type: 'customer' | 'lead' | 'contact' | 'user' | 'recent';
  entityId?: string;
}

export interface RecipientSearchResult {
  suggestions: RecipientSuggestion[];
  hasMore: boolean;
}

// ============================================
// Aliases for convenience
// ============================================

/** Alias for EmailAttachment */
export type Attachment = EmailAttachment;
