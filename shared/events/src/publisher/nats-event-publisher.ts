import {
  connect,
  NatsConnection,
  JetStreamClient,
  StringCodec,
  RetentionPolicy,
  StorageType,
} from 'nats';
import { DomainEvent, Result } from '@zuclubit/domain';
import { IEventPublisher } from '../types';

export interface NatsEventPublisherConfig {
  servers: string[];
  streamName?: string;
}

/**
 * NATS JetStream Event Publisher
 */
export class NatsEventPublisher implements IEventPublisher {
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private sc = StringCodec();
  private readonly streamName: string;

  constructor(private readonly config: NatsEventPublisherConfig) {
    this.streamName = config.streamName || 'DOMAIN_EVENTS';
  }

  async connect(): Promise<Result<void>> {
    try {
      this.nc = await connect({ servers: this.config.servers });
      this.js = this.nc.jetstream();

      // Ensure stream exists
      const jsm = await this.nc.jetstreamManager();
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

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to connect to NATS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    await this.nc?.close();
  }

  isConnected(): boolean {
    return this.nc !== undefined && !this.nc.isClosed();
  }

  async publish(event: DomainEvent): Promise<Result<void>> {
    if (!this.js) {
      return Result.fail('Not connected to NATS JetStream');
    }

    try {
      const enrichedEvent = this.enrichEvent(event);
      const subject = this.getSubject(enrichedEvent.type);
      const payload = this.sc.encode(JSON.stringify(enrichedEvent));

      await this.js.publish(subject, payload);

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to publish event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async publishBatch(events: DomainEvent[]): Promise<Result<void>> {
    if (!this.js) {
      return Result.fail('Not connected to NATS JetStream');
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
