import { DomainEvent, Result } from '../domain';

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

/**
 * Event handler function type
 */
export type EventHandler<T = unknown> = (event: DomainEvent<T>) => Promise<void>;

/**
 * Subscription options
 */
export interface SubscriptionOptions {
  durableName?: string;
  deliverAll?: boolean;
  startTime?: Date;
}

/**
 * Interface for event subscribers
 */
export interface IEventSubscriber {
  connect(): Promise<Result<void>>;
  disconnect(): Promise<void>;
  subscribe<T>(eventType: string, handler: EventHandler<T>, options?: SubscriptionOptions): Promise<Result<void>>;
  isConnected(): boolean;
}

export interface NatsEventPublisherConfig {
  servers: string[];
  streamName?: string;
}

/**
 * NATS JetStream Event Publisher
 * Note: This is a stub implementation that logs events locally when NATS is not available
 */
export class NatsEventPublisher implements IEventPublisher {
  private connected = false;
  private readonly streamName: string;

  constructor(private readonly config: NatsEventPublisherConfig) {
    this.streamName = config.streamName || 'DOMAIN_EVENTS';
  }

  async connect(): Promise<Result<void>> {
    // If no NATS servers configured, use local logging
    if (!this.config.servers || this.config.servers.length === 0 || this.config.servers[0] === '') {
      console.log('[Events] No NATS servers configured, using local event logging');
      this.connected = true;
      return Result.ok();
    }

    try {
      // Dynamic import of nats to avoid bundling issues
      const { connect, RetentionPolicy, StorageType } = await import('nats');
      const nc = await connect({ servers: this.config.servers });
      const js = nc.jetstream();

      // Ensure stream exists
      const jsm = await nc.jetstreamManager();
      try {
        await jsm.streams.info(this.streamName);
      } catch {
        // Stream doesn't exist, create it
        await jsm.streams.add({
          name: this.streamName,
          subjects: ['events.>'],
          retention: RetentionPolicy.Limits,
          max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days in nanoseconds
          storage: StorageType.File,
        });
      }

      // Store for later use
      (this as any).nc = nc;
      (this as any).js = js;
      this.connected = true;

      console.log('[Events] Connected to NATS JetStream');
      return Result.ok();
    } catch (error) {
      // Fall back to local logging if NATS connection fails
      console.warn(`[Events] Failed to connect to NATS, using local logging: ${error instanceof Error ? error.message : String(error)}`);
      this.connected = true;
      return Result.ok();
    }
  }

  async disconnect(): Promise<void> {
    const nc = (this as any).nc;
    if (nc) {
      await nc.close();
    }
    this.connected = false;
  }

  isConnected(): boolean {
    return this.connected;
  }

  async publish(event: DomainEvent): Promise<Result<void>> {
    if (!this.connected) {
      return Result.fail('Not connected to event bus');
    }

    try {
      const enrichedEvent = this.enrichEvent(event);
      const js = (this as any).js;

      if (js) {
        // Publish to NATS
        const { StringCodec } = await import('nats');
        const sc = StringCodec();
        const subject = this.getSubject(enrichedEvent.type);
        const payload = sc.encode(JSON.stringify(enrichedEvent));
        await js.publish(subject, payload);
      } else {
        // Log locally
        console.log(`[Events] Published: ${enrichedEvent.type}`, JSON.stringify(enrichedEvent, null, 2));
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to publish event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<Result<void>> {
    if (!this.connected) {
      return Result.fail('Not connected to event bus');
    }

    try {
      for (const event of events) {
        const result = await this.publish(event);
        if (result.isFailure) {
          return result;
        }
      }
      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to publish batch: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private enrichEvent(event: DomainEvent): DomainEvent {
    return {
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date().toISOString(),
    };
  }

  private getSubject(eventType: string): string {
    // Convert "Lead.Created" to "events.lead.created"
    return `events.${eventType.toLowerCase().replace('.', '.')}`;
  }
}
