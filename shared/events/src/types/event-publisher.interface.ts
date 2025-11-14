import { DomainEvent } from '@zuclubit/domain';
import { Result } from '@zuclubit/domain';

/**
 * Interface for event publishers
 */
export interface IEventPublisher {
  /**
   * Publish a single event
   */
  publish(event: DomainEvent): Promise<Result<void>>;

  /**
   * Publish multiple events
   */
  publishBatch(events: DomainEvent[]): Promise<Result<void>>;

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
