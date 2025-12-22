/**
 * Unified Inbox / Omnichannel Hub Types
 * Central types for managing communications across all channels
 */

// ==================== Enums ====================

export type MessageChannel =
  | 'email'
  | 'sms'
  | 'whatsapp'
  | 'chat'
  | 'messenger'
  | 'instagram'
  | 'twitter'
  | 'linkedin'
  | 'phone'
  | 'video'
  | 'in_app';

export type MessageDirection = 'inbound' | 'outbound';

export type MessageStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'replied'
  | 'failed'
  | 'bounced'
  | 'spam'
  | 'archived';

export type ConversationStatus =
  | 'new'
  | 'open'
  | 'pending'
  | 'resolved'
  | 'closed'
  | 'snoozed';

export type ConversationPriority = 'urgent' | 'high' | 'normal' | 'low';

export type AssignmentType = 'user' | 'team' | 'queue' | 'auto';

export type SentimentScore = 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';

// ==================== Unified Message ====================

export interface UnifiedMessage {
  id: string;
  tenantId: string;
  conversationId: string;

  // Channel Info
  channel: MessageChannel;
  channelMessageId?: string; // Original ID from the channel
  channelAccountId?: string; // Which account sent/received

  // Direction & Status
  direction: MessageDirection;
  status: MessageStatus;

  // Content
  subject?: string;
  body: string;
  bodyHtml?: string;
  bodyPlainText?: string;
  snippet?: string; // Preview text

  // Participants
  from: MessageParticipant;
  to: MessageParticipant[];
  cc?: MessageParticipant[];
  bcc?: MessageParticipant[];
  replyTo?: MessageParticipant;

  // Threading
  inReplyToId?: string;
  threadId?: string;
  threadPosition?: number;

  // Attachments
  attachments?: MessageAttachment[];
  hasAttachments: boolean;
  attachmentCount: number;

  // Metadata
  messageType?: 'text' | 'image' | 'video' | 'audio' | 'document' | 'template' | 'interactive';
  templateId?: string;
  templateData?: Record<string, unknown>;

  // AI Analysis
  sentiment?: SentimentScore;
  sentimentConfidence?: number;
  intent?: string;
  topics?: string[];
  suggestedResponses?: string[];
  isAutoReply?: boolean;
  isOutOfOffice?: boolean;

  // Engagement
  openedAt?: Date;
  clickedAt?: Date;
  repliedAt?: Date;
  bouncedAt?: Date;
  unsubscribedAt?: Date;

  // Links
  linkedEntityType?: 'lead' | 'customer' | 'opportunity' | 'ticket';
  linkedEntityId?: string;

  // User Actions
  isStarred?: boolean;
  isRead: boolean;
  labels?: string[];
  notes?: string;

  // Timestamps
  sentAt?: Date;
  receivedAt?: Date;
  scheduledFor?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== Message Participant ====================

export interface MessageParticipant {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  handle?: string; // Social media handle
  avatarUrl?: string;
  type: 'user' | 'contact' | 'lead' | 'customer' | 'external';
}

// ==================== Message Attachment ====================

export interface MessageAttachment {
  id: string;
  name: string;
  fileName: string;
  mimeType: string;
  size: number;
  url?: string;
  thumbnailUrl?: string;
  isInline?: boolean;
  contentId?: string;
}

// ==================== Conversation ====================

export interface Conversation {
  id: string;
  tenantId: string;

  // Identity
  subject?: string;
  channel: MessageChannel;
  channelConversationId?: string;

  // Participants
  participants: ConversationParticipant[];
  primaryContact?: MessageParticipant;

  // Status
  status: ConversationStatus;
  priority: ConversationPriority;

  // Assignment
  assignedToType?: AssignmentType;
  assignedToId?: string;
  assignedToName?: string;
  assignedTeamId?: string;
  assignedTeamName?: string;
  queueId?: string;

  // Counts
  messageCount: number;
  unreadCount: number;

  // Latest Activity
  lastMessage?: UnifiedMessage;
  lastMessageAt?: Date;
  lastInboundAt?: Date;
  lastOutboundAt?: Date;

  // First Contact Resolution
  firstResponseAt?: Date;
  firstResponseTime?: number; // seconds
  resolvedAt?: Date;
  resolutionTime?: number; // seconds

  // SLA
  slaDeadline?: Date;
  slaBreached?: boolean;
  slaPolicyId?: string;

  // AI Analysis
  sentiment?: SentimentScore;
  topics?: string[];
  summary?: string;

  // Links
  linkedEntityType?: 'lead' | 'customer' | 'opportunity' | 'ticket';
  linkedEntityId?: string;

  // Tags & Labels
  tags?: string[];
  labels?: string[];

  // Snooze
  snoozedUntil?: Date;

  // Metadata
  source?: string;
  metadata?: Record<string, unknown>;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

// ==================== Conversation Participant ====================

export interface ConversationParticipant {
  id: string;
  type: 'user' | 'contact' | 'bot';
  name?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
  role?: 'initiator' | 'recipient' | 'cc' | 'bcc' | 'observer';
  joinedAt?: Date;
  leftAt?: Date;
  isActive: boolean;
}

// ==================== Inbox View ====================

export interface InboxView {
  id: string;
  tenantId: string;
  userId?: string; // null for shared views

  name: string;
  description?: string;
  icon?: string;
  color?: string;

  // Filter Criteria
  filters: InboxFilter;

  // Display Options
  sortBy: 'newest' | 'oldest' | 'priority' | 'waiting_longest' | 'sla';
  groupBy?: 'channel' | 'status' | 'assignee' | 'priority' | 'none';

  // Settings
  isDefault: boolean;
  isShared: boolean;
  isSystemView: boolean;
  position: number;

  // Counts (dynamic)
  conversationCount?: number;
  unreadCount?: number;

  createdAt: Date;
  updatedAt: Date;
}

export interface InboxFilter {
  channels?: MessageChannel[];
  statuses?: ConversationStatus[];
  priorities?: ConversationPriority[];
  assignedToIds?: string[];
  assignedTeamIds?: string[];
  unassigned?: boolean;
  hasUnread?: boolean;
  isStarred?: boolean;
  tags?: string[];
  labels?: string[];
  linkedEntityTypes?: string[];
  dateRange?: {
    start?: Date;
    end?: Date;
  };
  searchQuery?: string;
  sentimentScores?: SentimentScore[];
  slaBreached?: boolean;
}

// ==================== Channel Account ====================

export interface ChannelAccount {
  id: string;
  tenantId: string;

  channel: MessageChannel;
  name: string;
  identifier: string; // email address, phone number, etc.

  // Auth
  isConnected: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'error' | 'pending';
  lastSyncAt?: Date;
  lastError?: string;

  // Settings
  isActive: boolean;
  isDefault: boolean;
  canSend: boolean;
  canReceive: boolean;

  // Routing
  autoAssignTeamId?: string;
  autoAssignUserId?: string;
  routingRules?: RoutingRule[];

  // Sync Settings
  syncEnabled: boolean;
  syncFrequencyMinutes?: number;
  syncHistoryDays?: number;

  // Signature
  signature?: string;
  signatureHtml?: string;

  // Metadata
  metadata?: Record<string, unknown>;
  credentials?: Record<string, unknown>; // Encrypted

  createdAt: Date;
  updatedAt: Date;
}

// ==================== Routing ====================

export interface RoutingRule {
  id: string;
  name: string;
  priority: number;
  isActive: boolean;

  conditions: RoutingCondition[];
  conditionLogic: 'and' | 'or';

  action: RoutingAction;
}

export interface RoutingCondition {
  field: string;
  operator: 'equals' | 'contains' | 'starts_with' | 'ends_with' | 'matches' | 'in' | 'not_in';
  value: unknown;
}

export interface RoutingAction {
  type: 'assign_user' | 'assign_team' | 'assign_queue' | 'round_robin' | 'least_busy' | 'skill_based';
  targetId?: string;
  queueId?: string;
  skillTags?: string[];
  notifyAssignee?: boolean;
  priority?: ConversationPriority;
  tags?: string[];
}

// ==================== Canned Responses ====================

export interface CannedResponse {
  id: string;
  tenantId: string;
  createdBy: string;

  name: string;
  shortcut?: string; // e.g., "/thanks"
  category?: string;

  // Content
  subject?: string;
  body: string;
  bodyHtml?: string;

  // Supported Channels
  channels?: MessageChannel[];

  // Personalization
  mergeFields?: string[];
  attachmentIds?: string[];

  // Usage
  usageCount: number;
  lastUsedAt?: Date;

  // Settings
  isPublic: boolean;
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

// ==================== SLA Policy ====================

export interface SLAPolicy {
  id: string;
  tenantId: string;

  name: string;
  description?: string;

  // Targets
  firstResponseTarget: number; // seconds
  resolutionTarget: number; // seconds
  nextResponseTarget?: number; // seconds

  // Business Hours
  businessHoursId?: string;
  excludeWeekends?: boolean;
  excludeHolidays?: boolean;

  // Escalation
  escalationRules?: EscalationRule[];

  // Applicability
  conditions?: SLACondition[];
  priority?: ConversationPriority;
  channels?: MessageChannel[];

  isActive: boolean;
  isDefault: boolean;

  createdAt: Date;
  updatedAt: Date;
}

export interface SLACondition {
  field: string;
  operator: string;
  value: unknown;
}

export interface EscalationRule {
  triggerAt: number; // percentage of SLA time elapsed
  action: 'notify' | 'reassign' | 'escalate';
  targetIds?: string[];
  message?: string;
}

// ==================== Search & Filter ====================

export interface UnifiedInboxSearchParams {
  tenantId: string;
  userId?: string;

  // View
  viewId?: string;
  filters?: InboxFilter;

  // Search
  query?: string;
  searchIn?: ('subject' | 'body' | 'from' | 'to' | 'attachments')[];

  // Pagination
  page?: number;
  limit?: number;

  // Sort
  sortBy?: 'newest' | 'oldest' | 'priority' | 'waiting_longest' | 'sla';
  sortOrder?: 'asc' | 'desc';
}

export interface UnifiedInboxSearchResult {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  unreadTotal: number;
}

// ==================== Dashboard Metrics ====================

export interface UnifiedInboxDashboard {
  tenantId: string;
  userId?: string;

  // Overview
  totalConversations: number;
  openConversations: number;
  unreadMessages: number;
  pendingResponses: number;

  // By Status
  byStatus: {
    new: number;
    open: number;
    pending: number;
    resolved: number;
    closed: number;
    snoozed: number;
  };

  // By Channel
  byChannel: {
    channel: MessageChannel;
    count: number;
    unread: number;
  }[];

  // By Priority
  byPriority: {
    urgent: number;
    high: number;
    normal: number;
    low: number;
  };

  // Performance
  performance: {
    avgFirstResponseTime: number;
    avgResolutionTime: number;
    slaComplianceRate: number;
    csatScore?: number;
  };

  // Trends
  volumeTrends: {
    date: string;
    inbound: number;
    outbound: number;
  }[];

  // Team Performance
  teamPerformance?: {
    userId: string;
    userName: string;
    assigned: number;
    resolved: number;
    avgResponseTime: number;
  }[];

  // SLA Breaches
  slaBreaches: number;
  slaAtRisk: number;

  generatedAt: Date;
}

// ==================== Quick Actions ====================

export interface BulkAction {
  action:
    | 'assign'
    | 'close'
    | 'reopen'
    | 'snooze'
    | 'archive'
    | 'mark_read'
    | 'mark_unread'
    | 'add_tag'
    | 'remove_tag'
    | 'change_priority'
    | 'change_status';
  conversationIds: string[];
  params?: {
    assigneeId?: string;
    teamId?: string;
    snoozeUntil?: Date;
    tags?: string[];
    priority?: ConversationPriority;
    status?: ConversationStatus;
  };
}

// ==================== Real-time Events ====================

export type InboxEventType =
  | 'message.received'
  | 'message.sent'
  | 'message.read'
  | 'message.delivered'
  | 'conversation.created'
  | 'conversation.updated'
  | 'conversation.assigned'
  | 'conversation.closed'
  | 'conversation.reopened'
  | 'sla.warning'
  | 'sla.breached'
  | 'typing.start'
  | 'typing.stop';

export interface InboxEvent {
  type: InboxEventType;
  tenantId: string;
  conversationId?: string;
  messageId?: string;
  userId?: string;
  data?: Record<string, unknown>;
  timestamp: Date;
}

// ==================== Compose Message ====================

export interface ComposeMessage {
  channel: MessageChannel;
  accountId?: string;

  to: MessageParticipant[];
  cc?: MessageParticipant[];
  bcc?: MessageParticipant[];

  subject?: string;
  body: string;
  bodyHtml?: string;

  replyToConversationId?: string;
  replyToMessageId?: string;

  templateId?: string;
  templateData?: Record<string, unknown>;

  attachments?: {
    fileName: string;
    mimeType: string;
    content: string | Buffer;
  }[];

  scheduledFor?: Date;

  linkedEntityType?: string;
  linkedEntityId?: string;

  tags?: string[];
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  channelMessageId?: string;
  conversationId?: string;
  error?: string;
  sentAt?: Date;
}
