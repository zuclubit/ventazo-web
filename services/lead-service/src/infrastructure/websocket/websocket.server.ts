/**
 * WebSocket Server
 * Real-time communication server using Fastify WebSocket
 */

import { FastifyInstance } from 'fastify';
import { WebSocket, RawData } from 'ws';
import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import {
  WebSocketMessage,
  WebSocketMessageType,
  ConnectionInfo,
  Subscription,
  ClientMessage,
  BroadcastOptions,
  Room,
  WebSocketStats,
  IWebSocketServer,
  RealtimeNotification,
  NotificationPriority,
} from './types';

interface ExtendedWebSocket extends WebSocket {
  id: string;
  tenantId: string;
  userId: string;
  isAlive: boolean;
  subscriptions: Map<string, Subscription>;
}

@injectable()
export class WebSocketServer implements IWebSocketServer {
  private connections: Map<string, ExtendedWebSocket> = new Map();
  private connectionInfo: Map<string, ConnectionInfo> = new Map();
  private userConnections: Map<string, Set<string>> = new Map(); // userId -> connectionIds
  private tenantConnections: Map<string, Set<string>> = new Map(); // tenantId -> connectionIds
  private rooms: Map<string, Room> = new Map();
  private stats = {
    messagesSent: 0,
    messagesReceived: 0,
    broadcastCount: 0,
    totalLatency: 0,
    latencyCount: 0,
    startTime: Date.now(),
  };
  private pingInterval: NodeJS.Timeout | null = null;

  constructor(private pool: DatabasePool) {}

  /**
   * Initialize WebSocket server with Fastify
   */
  async initialize(fastify: FastifyInstance): Promise<void> {
    // Register WebSocket plugin
    await fastify.register(import('@fastify/websocket'));

    // WebSocket route
    fastify.get('/ws', { websocket: true }, (connection, request) => {
      const ws = connection as unknown as ExtendedWebSocket;

      // Extract auth from query params or headers
      const url = new URL(request.url, `http://${request.headers.host}`);
      const token = url.searchParams.get('token') || request.headers['authorization']?.replace('Bearer ', '');
      const tenantId = url.searchParams.get('tenantId') || (request.headers['x-tenant-id'] as string);
      const userId = url.searchParams.get('userId') || (request.headers['x-user-id'] as string);

      if (!tenantId || !userId) {
        ws.close(4001, 'Missing tenant or user ID');
        return;
      }

      // Setup connection
      const connectionId = crypto.randomUUID();
      ws.id = connectionId;
      ws.tenantId = tenantId;
      ws.userId = userId;
      ws.isAlive = true;
      ws.subscriptions = new Map();

      // Store connection
      this.connections.set(connectionId, ws);

      // Store connection info
      const info: ConnectionInfo = {
        id: connectionId,
        tenantId,
        userId,
        userAgent: request.headers['user-agent'],
        ip: request.ip,
        connectedAt: new Date(),
        lastActivityAt: new Date(),
        subscriptions: [],
      };
      this.connectionInfo.set(connectionId, info);

      // Track by user
      if (!this.userConnections.has(userId)) {
        this.userConnections.set(userId, new Set());
      }
      this.userConnections.get(userId)!.add(connectionId);

      // Track by tenant
      if (!this.tenantConnections.has(tenantId)) {
        this.tenantConnections.set(tenantId, new Set());
      }
      this.tenantConnections.get(tenantId)!.add(connectionId);

      // Join default rooms
      this.joinRoom(connectionId, `tenant:${tenantId}`);
      this.joinRoom(connectionId, `user:${userId}`);

      // Broadcast online status
      this.broadcastPresence(tenantId, userId, 'online');

      // Log connection
      this.logConnection(connectionId, 'connected');

      // Handle messages
      ws.on('message', (data: RawData) => {
        this.handleMessage(ws, data);
      });

      // Handle pong
      ws.on('pong', () => {
        ws.isAlive = true;
      });

      // Handle close
      ws.on('close', () => {
        this.handleDisconnect(connectionId);
      });

      // Handle error
      ws.on('error', (error) => {
        console.error(`WebSocket error for ${connectionId}:`, error);
        this.handleDisconnect(connectionId);
      });

      // Send welcome message
      this.send(connectionId, {
        id: crypto.randomUUID(),
        type: 'notification',
        tenantId,
        userId,
        payload: {
          message: 'Connected to real-time server',
          connectionId,
        },
        timestamp: new Date(),
      });
    });

    // Start ping interval
    this.startPingInterval();
  }

  /**
   * Start ping interval for connection health checks
   */
  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      this.connections.forEach((ws, connectionId) => {
        if (!ws.isAlive) {
          this.handleDisconnect(connectionId);
          return;
        }

        ws.isAlive = false;
        ws.ping();
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Handle incoming message
   */
  private handleMessage(ws: ExtendedWebSocket, data: RawData): void {
    this.stats.messagesReceived++;

    try {
      const message = JSON.parse(data.toString()) as ClientMessage;
      const info = this.connectionInfo.get(ws.id);

      if (info) {
        info.lastActivityAt = new Date();
      }

      switch (message.type) {
        case 'subscribe':
          this.handleSubscribe(ws, message.payload as { subscriptions: Subscription[] });
          break;

        case 'unsubscribe':
          this.handleUnsubscribe(ws, message.payload as { subscriptions: Subscription[] });
          break;

        case 'ping':
          this.send(ws.id, {
            id: crypto.randomUUID(),
            type: 'notification',
            tenantId: ws.tenantId,
            payload: { type: 'pong', timestamp: Date.now() },
            timestamp: new Date(),
          });
          break;

        case 'typing':
          this.handleTyping(ws, message.payload as { entityType: string; entityId: string; isTyping: boolean });
          break;

        case 'presence':
          this.handlePresenceUpdate(ws, message.payload as { status: string; message?: string });
          break;

        case 'ack':
          // Acknowledge receipt of message
          break;

        default:
          console.warn(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling message:', error);
    }
  }

  /**
   * Handle subscribe
   */
  private handleSubscribe(ws: ExtendedWebSocket, payload: { subscriptions: Subscription[] }): void {
    for (const sub of payload.subscriptions) {
      const key = this.getSubscriptionKey(sub);
      ws.subscriptions.set(key, sub);

      // Join entity room if specific entity
      if (sub.entityId) {
        this.joinRoom(ws.id, `${sub.type}:${sub.entityId}`);
      }

      // Update connection info
      const info = this.connectionInfo.get(ws.id);
      if (info && !info.subscriptions.includes(key)) {
        info.subscriptions.push(key);
      }
    }
  }

  /**
   * Handle unsubscribe
   */
  private handleUnsubscribe(ws: ExtendedWebSocket, payload: { subscriptions: Subscription[] }): void {
    for (const sub of payload.subscriptions) {
      const key = this.getSubscriptionKey(sub);
      ws.subscriptions.delete(key);

      // Leave entity room
      if (sub.entityId) {
        this.leaveRoom(ws.id, `${sub.type}:${sub.entityId}`);
      }

      // Update connection info
      const info = this.connectionInfo.get(ws.id);
      if (info) {
        info.subscriptions = info.subscriptions.filter((s) => s !== key);
      }
    }
  }

  /**
   * Handle typing indicator
   */
  private handleTyping(
    ws: ExtendedWebSocket,
    payload: { entityType: string; entityId: string; isTyping: boolean }
  ): void {
    const roomId = `${payload.entityType}:${payload.entityId}`;
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: payload.isTyping ? 'typing.start' : 'typing.stop',
      tenantId: ws.tenantId,
      userId: ws.userId,
      payload: {
        userId: ws.userId,
        entityType: payload.entityType,
        entityId: payload.entityId,
      },
      timestamp: new Date(),
    };

    // Broadcast to room except sender
    this.sendToRoom(roomId, message, ws.id);
  }

  /**
   * Handle presence update
   */
  private handlePresenceUpdate(ws: ExtendedWebSocket, payload: { status: string; message?: string }): void {
    this.broadcastPresence(ws.tenantId, ws.userId, payload.status as 'online' | 'away' | 'busy' | 'offline', payload.message);
  }

  /**
   * Handle disconnect
   */
  private handleDisconnect(connectionId: string): void {
    const ws = this.connections.get(connectionId);
    const info = this.connectionInfo.get(connectionId);

    if (!ws || !info) return;

    // Broadcast offline status
    this.broadcastPresence(info.tenantId, info.userId, 'offline');

    // Remove from user connections
    const userConns = this.userConnections.get(info.userId);
    if (userConns) {
      userConns.delete(connectionId);
      if (userConns.size === 0) {
        this.userConnections.delete(info.userId);
      }
    }

    // Remove from tenant connections
    const tenantConns = this.tenantConnections.get(info.tenantId);
    if (tenantConns) {
      tenantConns.delete(connectionId);
      if (tenantConns.size === 0) {
        this.tenantConnections.delete(info.tenantId);
      }
    }

    // Leave all rooms
    this.rooms.forEach((room) => {
      room.members.delete(connectionId);
    });

    // Close connection if still open
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }

    // Remove from maps
    this.connections.delete(connectionId);
    this.connectionInfo.delete(connectionId);

    // Log disconnection
    this.logConnection(connectionId, 'disconnected');
  }

  /**
   * Broadcast presence change
   */
  private broadcastPresence(
    tenantId: string,
    userId: string,
    status: 'online' | 'away' | 'busy' | 'offline',
    message?: string
  ): void {
    const wsMessage: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: status === 'online' ? 'user.online' : 'user.offline',
      tenantId,
      userId,
      payload: {
        userId,
        status,
        message,
        timestamp: new Date(),
      },
      timestamp: new Date(),
    };

    this.broadcastToTenant(tenantId, wsMessage);
  }

  /**
   * Get subscription key
   */
  private getSubscriptionKey(sub: Subscription): string {
    return sub.entityId ? `${sub.type}:${sub.entityId}` : sub.type;
  }

  /**
   * Log connection event
   */
  private async logConnection(connectionId: string, event: 'connected' | 'disconnected'): Promise<void> {
    const info = this.connectionInfo.get(connectionId);
    if (!info) return;

    try {
      const query = `
        INSERT INTO websocket_connections (
          connection_id, tenant_id, user_id, event, user_agent, ip
        )
        VALUES ($1, $2, $3, $4, $5, $6)
      `;

      await this.pool.query(query, [
        connectionId,
        info.tenantId,
        info.userId,
        event,
        info.userAgent || null,
        info.ip || null,
      ]);
    } catch {
      // Ignore logging errors
    }
  }

  // ==================== Public API ====================

  /**
   * Get connections for tenant
   */
  getConnections(tenantId: string): ConnectionInfo[] {
    const connectionIds = this.tenantConnections.get(tenantId);
    if (!connectionIds) return [];

    return Array.from(connectionIds)
      .map((id) => this.connectionInfo.get(id))
      .filter((info): info is ConnectionInfo => info !== undefined);
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): ConnectionInfo | undefined {
    return this.connectionInfo.get(connectionId);
  }

  /**
   * Disconnect user
   */
  disconnectUser(userId: string): void {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return;

    connectionIds.forEach((connectionId) => {
      this.handleDisconnect(connectionId);
    });
  }

  /**
   * Send message to connection
   */
  send(connectionId: string, message: WebSocketMessage): void {
    const ws = this.connections.get(connectionId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    try {
      ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    } catch (error) {
      console.error(`Error sending message to ${connectionId}:`, error);
    }
  }

  /**
   * Send message to user (all connections)
   */
  sendToUser(userId: string, message: WebSocketMessage): void {
    const connectionIds = this.userConnections.get(userId);
    if (!connectionIds) return;

    connectionIds.forEach((connectionId) => {
      this.send(connectionId, message);
    });
  }

  /**
   * Broadcast message
   */
  broadcast(options: BroadcastOptions, message: WebSocketMessage): void {
    const tenantConnectionIds = this.tenantConnections.get(options.tenantId);
    if (!tenantConnectionIds) return;

    this.stats.broadcastCount++;

    tenantConnectionIds.forEach((connectionId) => {
      const info = this.connectionInfo.get(connectionId);
      if (!info) return;

      // Filter by user IDs
      if (options.userIds && !options.userIds.includes(info.userId)) return;
      if (options.excludeUserIds && options.excludeUserIds.includes(info.userId)) return;

      // Filter by subscription
      if (options.subscriptionType) {
        const ws = this.connections.get(connectionId);
        if (!ws) return;

        const key = options.entityId
          ? `${options.subscriptionType}:${options.entityId}`
          : options.subscriptionType;

        if (!ws.subscriptions.has(key) && !ws.subscriptions.has('all')) return;
      }

      this.send(connectionId, message);
    });
  }

  /**
   * Broadcast to entire tenant
   */
  broadcastToTenant(tenantId: string, message: WebSocketMessage): void {
    this.broadcast({ tenantId }, message);
  }

  /**
   * Join room
   */
  joinRoom(connectionId: string, roomId: string): void {
    let room = this.rooms.get(roomId);

    if (!room) {
      const info = this.connectionInfo.get(connectionId);
      room = {
        id: roomId,
        tenantId: info?.tenantId || '',
        name: roomId,
        type: 'custom',
        members: new Set(),
        createdAt: new Date(),
      };
      this.rooms.set(roomId, room);
    }

    room.members.add(connectionId);
  }

  /**
   * Leave room
   */
  leaveRoom(connectionId: string, roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members.delete(connectionId);

    // Cleanup empty rooms
    if (room.members.size === 0) {
      this.rooms.delete(roomId);
    }
  }

  /**
   * Send to room
   */
  sendToRoom(roomId: string, message: WebSocketMessage, excludeConnectionId?: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;

    room.members.forEach((connectionId) => {
      if (connectionId !== excludeConnectionId) {
        this.send(connectionId, message);
      }
    });
  }

  /**
   * Subscribe connection
   */
  subscribe(connectionId: string, subscription: Subscription): void {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    this.handleSubscribe(ws, { subscriptions: [subscription] });
  }

  /**
   * Unsubscribe connection
   */
  unsubscribe(connectionId: string, subscription: Subscription): void {
    const ws = this.connections.get(connectionId);
    if (!ws) return;

    this.handleUnsubscribe(ws, { subscriptions: [subscription] });
  }

  /**
   * Get stats
   */
  getStats(): WebSocketStats {
    const totalConnections = this.connections.size;
    const connectionsByTenant: Record<string, number> = {};

    this.tenantConnections.forEach((connections, tenantId) => {
      connectionsByTenant[tenantId] = connections.size;
    });

    return {
      totalConnections,
      connectionsByTenant,
      messagesSent: this.stats.messagesSent,
      messagesReceived: this.stats.messagesReceived,
      broadcastCount: this.stats.broadcastCount,
      averageLatency:
        this.stats.latencyCount > 0 ? this.stats.totalLatency / this.stats.latencyCount : 0,
      uptime: Date.now() - this.stats.startTime,
    };
  }

  // ==================== Event Publishing ====================

  /**
   * Publish lead event
   */
  publishLeadEvent(
    tenantId: string,
    type: WebSocketMessageType,
    lead: Record<string, unknown>,
    userId?: string
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type,
      tenantId,
      userId,
      payload: lead,
      timestamp: new Date(),
    };

    // Broadcast to lead subscribers
    this.broadcast(
      { tenantId, subscriptionType: 'lead', entityId: lead.id as string },
      message
    );

    // Also broadcast to "all" subscribers
    this.broadcast({ tenantId, subscriptionType: 'all' }, message);
  }

  /**
   * Publish notification
   */
  publishNotification(
    tenantId: string,
    notification: RealtimeNotification,
    userIds?: string[]
  ): void {
    const message: WebSocketMessage<RealtimeNotification> = {
      id: crypto.randomUUID(),
      type: 'notification',
      tenantId,
      payload: notification,
      timestamp: new Date(),
    };

    if (userIds && userIds.length > 0) {
      userIds.forEach((userId) => {
        this.sendToUser(userId, message);
      });
    } else {
      this.broadcastToTenant(tenantId, message);
    }
  }

  /**
   * Publish alert
   */
  publishAlert(
    tenantId: string,
    title: string,
    body: string,
    priority: NotificationPriority = 'normal',
    userIds?: string[]
  ): void {
    const notification: RealtimeNotification = {
      id: crypto.randomUUID(),
      type: 'alert',
      title,
      body,
      priority,
    };

    this.publishNotification(tenantId, notification, userIds);
  }

  /**
   * Publish Kanban board event
   * Used for real-time collaboration on Kanban boards
   */
  publishKanbanEvent(
    tenantId: string,
    eventType: 'KANBAN_ITEM_MOVED' | 'KANBAN_ITEM_CREATED' | 'KANBAN_ITEM_UPDATED' | 'KANBAN_CONFIG_UPDATED' | 'KANBAN_WIP_WARNING' | 'KANBAN_LOCK_ACQUIRED' | 'KANBAN_LOCK_RELEASED',
    entityType: 'lead' | 'opportunity' | 'task' | 'customer',
    payload: {
      entityId?: string;
      fromStageId?: string;
      toStageId?: string;
      moveId?: string;
      userId: string;
      userName?: string;
      timestamp: Date;
      wipStatus?: {
        stageId: string;
        current: number;
        limit: number;
        level: string;
      };
      lockInfo?: {
        lockedBy: string;
        lockedByName?: string;
        expiresAt: Date;
      };
      data?: Record<string, unknown>;
    }
  ): void {
    const message: WebSocketMessage = {
      id: crypto.randomUUID(),
      type: eventType as WebSocketMessageType,
      tenantId,
      userId: payload.userId,
      payload: {
        entityType,
        ...payload,
      },
      timestamp: new Date(),
    };

    // Broadcast to Kanban subscribers for this entity type
    this.broadcast(
      { tenantId, subscriptionType: entityType },
      message
    );

    // Also broadcast to general Kanban channel
    this.broadcast({ tenantId, subscriptionType: 'kanban' }, message);
  }

  /**
   * Shutdown server
   */
  shutdown(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
    }

    this.connections.forEach((ws, connectionId) => {
      ws.close(1000, 'Server shutting down');
      this.handleDisconnect(connectionId);
    });
  }
}
