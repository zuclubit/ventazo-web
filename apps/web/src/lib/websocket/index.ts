'use client';

/**
 * WebSocket Client
 *
 * Real-time communication client for the CRM.
 * Provides connection management, subscriptions, and event handling.
 *
 * @module lib/websocket
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

// ============================================
// Types
// ============================================

export type SubscriptionType =
  | 'lead'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'quote'
  | 'calendar'
  | 'communication'
  | 'user'
  | 'tenant'
  | 'kanban'
  | 'all';

export interface WebSocketMessage<T = unknown> {
  id: string;
  type: string;
  tenantId: string;
  userId?: string;
  payload: T;
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Subscription {
  type: SubscriptionType;
  entityId?: string;
  filters?: Record<string, unknown>;
}

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketState {
  status: ConnectionStatus;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;
  latency: number | null;
}

type MessageHandler = (message: WebSocketMessage) => void;

// ============================================
// WebSocket Manager (Singleton)
// ============================================

class WebSocketManager {
  private static instance: WebSocketManager | null = null;
  private ws: WebSocket | null = null;
  private url: string = '';
  private tenantId: string = '';
  private userId: string = '';
  private token: string = '';
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private pingInterval: NodeJS.Timeout | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private statusListeners: Set<(status: ConnectionStatus) => void> = new Set();
  private lastPingTime = 0;
  private latency: number | null = null;

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(params: {
    url: string;
    tenantId: string;
    userId: string;
    token: string;
  }): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      // Already connected
      return;
    }

    this.url = params.url;
    this.tenantId = params.tenantId;
    this.userId = params.userId;
    this.token = params.token;

    this.setStatus('connecting');

    const wsUrl = new URL(params.url);
    wsUrl.searchParams.set('tenantId', params.tenantId);
    wsUrl.searchParams.set('userId', params.userId);
    wsUrl.searchParams.set('token', params.token);

    try {
      this.ws = new WebSocket(wsUrl.toString());

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);
    } catch (error) {
      console.error('[WebSocket] Connection error:', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    console.log('[WebSocket] Connected');
    this.setStatus('connected');
    this.reconnectAttempts = 0;
    this.startPingInterval();

    // Re-subscribe to all previous subscriptions
    this.subscriptions.forEach((sub, key) => {
      this.sendSubscribe([sub]);
    });
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;

      // Handle pong for latency calculation
      if (message.type === 'notification' && (message.payload as { type?: string })?.type === 'pong') {
        this.latency = Date.now() - this.lastPingTime;
        return;
      }

      // Notify handlers
      const handlers = this.messageHandlers.get(message.type);
      if (handlers) {
        handlers.forEach((handler) => handler(message));
      }

      // Also notify "all" handlers
      const allHandlers = this.messageHandlers.get('all');
      if (allHandlers) {
        allHandlers.forEach((handler) => handler(message));
      }
    } catch (error) {
      console.error('[WebSocket] Error parsing message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('[WebSocket] Disconnected:', event.code, event.reason);
    this.setStatus('disconnected');
    this.stopPingInterval();

    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('[WebSocket] Error:', event);
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('[WebSocket] Max reconnect attempts reached');
      return;
    }

    this.setStatus('reconnecting');
    this.reconnectAttempts++;

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimeout = setTimeout(() => {
      this.connect({
        url: this.url,
        tenantId: this.tenantId,
        userId: this.userId,
        token: this.token,
      });
    }, delay);
  }

  private startPingInterval(): void {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.lastPingTime = Date.now();
        this.send({ type: 'ping' });
      }
    }, 30000);
  }

  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.statusListeners.forEach((listener) => listener(status));
  }

  private send(data: object): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  private sendSubscribe(subscriptions: Subscription[]): void {
    this.send({
      type: 'subscribe',
      payload: { subscriptions },
    });
  }

  private sendUnsubscribe(subscriptions: Subscription[]): void {
    this.send({
      type: 'unsubscribe',
      payload: { subscriptions },
    });
  }

  subscribe(subscription: Subscription): () => void {
    const key = subscription.entityId
      ? `${subscription.type}:${subscription.entityId}`
      : subscription.type;

    this.subscriptions.set(key, subscription);

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.sendSubscribe([subscription]);
    }

    return () => {
      this.subscriptions.delete(key);
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.sendUnsubscribe([subscription]);
      }
    };
  }

  onMessage(type: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(type)) {
      this.messageHandlers.set(type, new Set());
    }
    this.messageHandlers.get(type)!.add(handler);

    return () => {
      this.messageHandlers.get(type)?.delete(handler);
    };
  }

  onStatusChange(listener: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  getLatency(): number | null {
    return this.latency;
  }

  disconnect(): void {
    this.stopPingInterval();
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
    this.setStatus('disconnected');
  }
}

// ============================================
// React Hooks
// ============================================

/**
 * Hook to manage WebSocket connection
 */
export function useWebSocket(params?: {
  tenantId?: string;
  userId?: string;
  token?: string;
}) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [latency, setLatency] = useState<number | null>(null);
  const managerRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    if (!params?.tenantId || !params?.userId || !params?.token) {
      return;
    }

    const manager = WebSocketManager.getInstance();
    managerRef.current = manager;

    // Get WebSocket URL from environment
    const wsUrl = process.env['NEXT_PUBLIC_WS_URL'] ||
      (typeof window !== 'undefined'
        ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
        : '');

    if (wsUrl) {
      manager.connect({
        url: wsUrl,
        tenantId: params.tenantId,
        userId: params.userId,
        token: params.token,
      });
    }

    const unsubscribeStatus = manager.onStatusChange(setStatus);

    // Update latency periodically
    const latencyInterval = setInterval(() => {
      setLatency(manager.getLatency());
    }, 5000);

    return () => {
      unsubscribeStatus();
      clearInterval(latencyInterval);
    };
  }, [params?.tenantId, params?.userId, params?.token]);

  const subscribe = useCallback((subscription: Subscription) => {
    return managerRef.current?.subscribe(subscription) ?? (() => {});
  }, []);

  const onMessage = useCallback((type: string, handler: MessageHandler) => {
    return managerRef.current?.onMessage(type, handler) ?? (() => {});
  }, []);

  return {
    status,
    latency,
    isConnected: status === 'connected',
    isReconnecting: status === 'reconnecting',
    subscribe,
    onMessage,
  };
}

/**
 * Hook for subscribing to real-time updates for a specific entity type
 */
export function useRealtimeSubscription<T = unknown>(
  entityType: SubscriptionType,
  options?: {
    entityId?: string;
    onMessage?: (message: WebSocketMessage<T>) => void;
    invalidateQueries?: string[][];
  }
) {
  const queryClient = useQueryClient();
  const managerRef = useRef<WebSocketManager | null>(null);

  useEffect(() => {
    const manager = WebSocketManager.getInstance();
    managerRef.current = manager;

    // Subscribe to entity type
    const unsubscribe = manager.subscribe({
      type: entityType,
      entityId: options?.entityId,
    });

    // Handle messages
    const eventTypes = [
      `${entityType}.created`,
      `${entityType}.updated`,
      `${entityType}.deleted`,
      `${entityType}.synced`,
    ];

    const unsubscribeHandlers = eventTypes.map((type) =>
      manager.onMessage(type, (message) => {
        // Call custom handler
        options?.onMessage?.(message as WebSocketMessage<T>);

        // Invalidate queries
        if (options?.invalidateQueries) {
          options.invalidateQueries.forEach((queryKey) => {
            void queryClient.invalidateQueries({ queryKey });
          });
        }
      })
    );

    return () => {
      unsubscribe();
      unsubscribeHandlers.forEach((unsub) => unsub());
    };
  }, [entityType, options?.entityId, queryClient]);

  return {
    isConnected: managerRef.current?.getStatus() === 'connected',
  };
}

// ============================================
// Sync Status Indicator Component
// ============================================

export interface SyncStatus {
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  connectionStatus: ConnectionStatus;
  error: string | null;
}

/**
 * Hook for tracking sync status
 */
export function useSyncStatus(): SyncStatus {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const manager = WebSocketManager.getInstance();

    const unsubscribeStatus = manager.onStatusChange(setConnectionStatus);

    const unsubscribeSyncStart = manager.onMessage('sync.started', () => {
      setIsSyncing(true);
      setError(null);
    });

    const unsubscribeSyncComplete = manager.onMessage('sync.completed', () => {
      setIsSyncing(false);
      setLastSyncedAt(new Date());
    });

    const unsubscribeSyncError = manager.onMessage('sync.error', (message) => {
      setIsSyncing(false);
      setError((message.payload as { error?: string })?.error ?? 'Sync error');
    });

    return () => {
      unsubscribeStatus();
      unsubscribeSyncStart();
      unsubscribeSyncComplete();
      unsubscribeSyncError();
    };
  }, []);

  return {
    isSyncing,
    lastSyncedAt,
    connectionStatus,
    error,
  };
}

export default WebSocketManager;
