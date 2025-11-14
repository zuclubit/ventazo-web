import { DomainEvent } from '@zuclubit/domain';
import { Result } from '@zuclubit/domain';

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  /** Consumer group name for load balancing */
  consumerGroup?: string;
  /** Start from specific sequence */
  startSequence?: number;
  /** Start from specific time */
  startTime?: Date;
  /** Deliver all messages */
  deliverAll?: boolean;
  /** Deliver last N messages */
  deliverLast?: number;
  /** Maximum delivery attempts */
  maxDeliver?: number;
  /** Acknowledgement wait time (ms) */
  ackWait?: number;
}

/**
 * Interface for event subscribers
 */
export interface IEventSubscriber {
  /**
   * Subscribe to events by type
   */
  subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<Result<void>>;

  /**
   * Subscribe to multiple event types
   */
  subscribeMany<T = unknown>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<Result<void>>;

  /**
   * Unsubscribe from event type
   */
  unsubscribe(eventType: string): Promise<void>;

  /**
   * Connect to the event bus
   */
  connect(): Promise<Result<void>>;

  /**
   * Disconnect from the event bus
   */
  disconnect(): Promise<void>;

  /**
   * Check if connected
   */
  isConnected(): boolean;
}
