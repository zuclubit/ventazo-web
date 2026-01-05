/**
 * Notification System Types
 * Multi-channel notification infrastructure
 */

/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  PUSH = 'push',
  IN_APP = 'in_app',
  SMS = 'sms',
  WEBHOOK = 'webhook',
}

/**
 * Notification priority levels
 */
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed',
}

/**
 * Notification types for Lead Service
 */
export enum NotificationType {
  // Lead lifecycle
  LEAD_CREATED = 'lead.created',
  LEAD_ASSIGNED = 'lead.assigned',
  LEAD_QUALIFIED = 'lead.qualified',
  LEAD_STATUS_CHANGED = 'lead.status_changed',
  LEAD_CONVERTED = 'lead.converted',
  LEAD_LOST = 'lead.lost',

  // Follow-ups
  FOLLOW_UP_SCHEDULED = 'follow_up.scheduled',
  FOLLOW_UP_DUE = 'follow_up.due',
  FOLLOW_UP_OVERDUE = 'follow_up.overdue',

  // Score changes
  LEAD_SCORE_INCREASED = 'lead.score_increased',
  LEAD_SCORE_DECREASED = 'lead.score_decreased',
  LEAD_REACHED_THRESHOLD = 'lead.reached_threshold',

  // System
  DAILY_SUMMARY = 'system.daily_summary',
  WEEKLY_REPORT = 'system.weekly_report',
}

/**
 * Notification recipient
 */
export interface NotificationRecipient {
  userId: string;
  email?: string;
  phone?: string;
  pushToken?: string;
  channels: NotificationChannel[];
}

/**
 * Notification content
 */
export interface NotificationContent {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
  imageUrl?: string;
}

/**
 * Notification record
 */
export interface Notification {
  id: string;
  tenantId: string;
  type: NotificationType;
  priority: NotificationPriority;
  recipient: NotificationRecipient;
  content: NotificationContent;
  channel: NotificationChannel;
  status: NotificationStatus;
  metadata?: Record<string, unknown>;
  sentAt?: Date;
  deliveredAt?: Date;
  readAt?: Date;
  failedAt?: Date;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create notification input
 */
export interface CreateNotificationInput {
  tenantId: string;
  type: NotificationType;
  priority?: NotificationPriority;
  recipientUserId: string;
  channels?: NotificationChannel[];
  content: NotificationContent;
  metadata?: Record<string, unknown>;
  scheduledFor?: Date;
}

/**
 * Notification preferences per user
 */
export interface NotificationPreferences {
  userId: string;
  tenantId: string;
  channels: {
    [key in NotificationChannel]?: boolean;
  };
  types: {
    [key in NotificationType]?: boolean;
  };
  quietHours?: {
    enabled: boolean;
    startTime: string; // HH:mm format
    endTime: string;
    timezone: string;
  };
  emailDigest?: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
  };
}

/**
 * Notification template
 */
export interface NotificationTemplate {
  type: NotificationType;
  channel: NotificationChannel;
  subject?: string;
  title: string;
  bodyTemplate: string; // Supports {{variable}} placeholders
  actionUrl?: string;
}

/**
 * Interface for notification service
 */
export interface INotificationService {
  send(input: CreateNotificationInput): Promise<void>;
  sendBatch(inputs: CreateNotificationInput[]): Promise<void>;
  markAsRead(notificationId: string, userId: string): Promise<void>;
  getUnread(userId: string, tenantId: string): Promise<Notification[]>;
  getByUser(userId: string, tenantId: string, limit?: number): Promise<Notification[]>;
}

/**
 * Interface for notification channel provider
 */
export interface INotificationProvider {
  channel: NotificationChannel;
  send(notification: Notification): Promise<boolean>;
  isAvailable(): boolean;
}
