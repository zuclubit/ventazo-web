/**
 * WebSocket Types
 * Types for real-time notifications and messaging
 */

/**
 * WebSocket message types
 */
export type WebSocketMessageType =
  // Lead events
  | 'lead.created'
  | 'lead.updated'
  | 'lead.deleted'
  | 'lead.status_changed'
  | 'lead.assigned'
  | 'lead.score_updated'
  // Customer events
  | 'customer.created'
  | 'customer.updated'
  // Opportunity events
  | 'opportunity.created'
  | 'opportunity.updated'
  | 'opportunity.stage_changed'
  | 'opportunity.won'
  | 'opportunity.lost'
  // Task events
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.overdue'
  // Quote events
  | 'quote.created'
  | 'quote.sent'
  | 'quote.viewed'
  | 'quote.accepted'
  | 'quote.rejected'
  // Communication events
  | 'message.received'
  | 'message.sent'
  | 'email.received'
  | 'email.opened'
  | 'call.started'
  | 'call.ended'
  | 'whatsapp.received'
  | 'sms.received'
  // Payment events
  | 'payment.received'
  | 'payment.failed'
  | 'subscription.created'
  | 'subscription.cancelled'
  // System events
  | 'notification'
  | 'alert'
  | 'system.broadcast'
  | 'user.online'
  | 'user.offline'
  | 'typing.start'
  | 'typing.stop'
  // Sync events
  | 'sync.started'
  | 'sync.completed'
  | 'sync.error';

/**
 * WebSocket message
 */
export interface WebSocketMessage<T = unknown> {
  id: string;
  type: WebSocketMessageType;
  tenantId: string;
  userId?: string;
  payload: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Connection info
 */
export interface ConnectionInfo {
  id: string;
  tenantId: string;
  userId: string;
  userName?: string;
  deviceId?: string;
  userAgent?: string;
  ip?: string;
  connectedAt: Date;
  lastActivityAt: Date;
  subscriptions: string[];
}

/**
 * Subscription types
 */
export type SubscriptionType =
  | 'lead'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'quote'
  | 'communication'
  | 'user'
  | 'tenant'
  | 'all';

/**
 * Subscription
 */
export interface Subscription {
  type: SubscriptionType;
  entityId?: string;
  filters?: Record<string, unknown>;
}

/**
 * Client-to-server message types
 */
export type ClientMessageType =
  | 'subscribe'
  | 'unsubscribe'
  | 'ping'
  | 'typing'
  | 'presence'
  | 'ack';

/**
 * Client message
 */
export interface ClientMessage {
  type: ClientMessageType;
  payload?: unknown;
  correlationId?: string;
}

/**
 * Subscribe payload
 */
export interface SubscribePayload {
  subscriptions: Subscription[];
}

/**
 * Unsubscribe payload
 */
export interface UnsubscribePayload {
  subscriptions: Subscription[];
}

/**
 * Typing payload
 */
export interface TypingPayload {
  entityType: 'lead' | 'customer' | 'opportunity';
  entityId: string;
  isTyping: boolean;
}

/**
 * Presence payload
 */
export interface PresencePayload {
  status: 'online' | 'away' | 'busy' | 'offline';
  message?: string;
}

/**
 * Notification priority
 */
export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

/**
 * Real-time notification
 */
export interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  icon?: string;
  priority: NotificationPriority;
  actionUrl?: string;
  actionLabel?: string;
  data?: Record<string, unknown>;
  expiresAt?: Date;
  requiresAck?: boolean;
}

/**
 * Broadcast options
 */
export interface BroadcastOptions {
  tenantId: string;
  userIds?: string[];
  excludeUserIds?: string[];
  roles?: string[];
  subscriptionType?: SubscriptionType;
  entityId?: string;
}

/**
 * Room (for grouping connections)
 */
export interface Room {
  id: string;
  tenantId: string;
  name: string;
  type: 'tenant' | 'user' | 'entity' | 'custom';
  members: Set<string>;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

/**
 * WebSocket server stats
 */
export interface WebSocketStats {
  totalConnections: number;
  connectionsByTenant: Record<string, number>;
  messagesSent: number;
  messagesReceived: number;
  broadcastCount: number;
  averageLatency: number;
  uptime: number;
}

/**
 * Event handler type
 */
export type EventHandler<T = unknown> = (
  message: WebSocketMessage<T>,
  connectionId: string
) => void | Promise<void>;

/**
 * WebSocket server interface
 */
export interface IWebSocketServer {
  // Connection management
  getConnections(tenantId: string): ConnectionInfo[];
  getConnection(connectionId: string): ConnectionInfo | undefined;
  disconnectUser(userId: string): void;

  // Messaging
  send(connectionId: string, message: WebSocketMessage): void;
  sendToUser(userId: string, message: WebSocketMessage): void;
  broadcast(options: BroadcastOptions, message: WebSocketMessage): void;
  broadcastToTenant(tenantId: string, message: WebSocketMessage): void;

  // Rooms
  joinRoom(connectionId: string, roomId: string): void;
  leaveRoom(connectionId: string, roomId: string): void;
  sendToRoom(roomId: string, message: WebSocketMessage): void;

  // Subscriptions
  subscribe(connectionId: string, subscription: Subscription): void;
  unsubscribe(connectionId: string, subscription: Subscription): void;

  // Stats
  getStats(): WebSocketStats;
}
