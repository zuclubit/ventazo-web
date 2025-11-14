import {
  connect,
  NatsConnection,
  JetStreamClient,
  JsMsg,
  StringCodec,
  ConsumerConfig,
} from 'nats';
import { DomainEvent, Result } from '@zuclubit/domain';
import { IEventSubscriber, EventHandler, SubscriptionOptions } from '../types';

export interface NatsEventSubscriberConfig {
  servers: string[];
  streamName?: string;
  serviceName: string;
}

/**
 * NATS JetStream Event Subscriber
 */
export class NatsEventSubscriber implements IEventSubscriber {
  private nc?: NatsConnection;
  private js?: JetStreamClient;
  private sc = StringCodec();
  private readonly streamName: string;
  private subscriptions = new Map<string, unknown>();

  constructor(private readonly config: NatsEventSubscriberConfig) {
    this.streamName = config.streamName || 'DOMAIN_EVENTS';
  }

  async connect(): Promise<Result<void>> {
    try {
      this.nc = await connect({ servers: this.config.servers });
      this.js = this.nc.jetstream();
      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to connect to NATS: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async disconnect(): Promise<void> {
    // Unsubscribe from all
    for (const [eventType] of this.subscriptions) {
      await this.unsubscribe(eventType);
    }
    await this.nc?.close();
  }

  isConnected(): boolean {
    return this.nc !== undefined && !this.nc.isClosed();
  }

  async subscribe<T = unknown>(
    eventType: string,
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<Result<void>> {
    if (!this.js) {
      return Result.fail('Not connected to NATS JetStream');
    }

    try {
      const subject = this.getSubject(eventType);
      const consumerName = options?.consumerGroup || `${this.config.serviceName}-${eventType}`;

      // Create or get consumer
      const consumerConfig: Partial<ConsumerConfig> = {
        durable_name: consumerName,
        filter_subject: subject,
        ack_policy: 'explicit',
        max_deliver: options?.maxDeliver || 3,
        ack_wait: (options?.ackWait || 30000) * 1_000_000, // Convert ms to ns
      };

      if (options?.deliverAll) {
        consumerConfig.deliver_policy = 'all';
      } else if (options?.deliverLast) {
        consumerConfig.deliver_policy = 'last';
      } else if (options?.startSequence) {
        consumerConfig.deliver_policy = 'by_start_sequence';
        consumerConfig.opt_start_seq = options.startSequence;
      } else if (options?.startTime) {
        consumerConfig.deliver_policy = 'by_start_time';
        consumerConfig.opt_start_time = options.startTime.toISOString();
      } else {
        consumerConfig.deliver_policy = 'new';
      }

      const consumer = await this.js.consumers.get(this.streamName, consumerName).catch(async () => {
        // Consumer doesn't exist, create it
        return await this.js!.consumers.add(this.streamName, consumerConfig);
      });

      // Subscribe
      const subscription = await consumer.consume({
        callback: async (msg: JsMsg) => {
          try {
            const data = this.sc.decode(msg.data);
            const event: DomainEvent<T> = JSON.parse(data);
            await handler(event);
            msg.ack();
          } catch (error) {
            console.error(`Error processing event ${eventType}:`, error);
            msg.nak();
          }
        },
      });

      this.subscriptions.set(eventType, subscription);

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to subscribe to ${eventType}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async subscribeMany<T = unknown>(
    eventTypes: string[],
    handler: EventHandler<T>,
    options?: SubscriptionOptions
  ): Promise<Result<void>> {
    for (const eventType of eventTypes) {
      const result = await this.subscribe(eventType, handler, options);
      if (result.isFailure) {
        return result;
      }
    }
    return Result.ok();
  }

  async unsubscribe(eventType: string): Promise<void> {
    const subscription = this.subscriptions.get(eventType);
    if (subscription && typeof subscription === 'object' && 'stop' in subscription) {
      await (subscription as { stop: () => Promise<void> }).stop();
      this.subscriptions.delete(eventType);
    }
  }

  private getSubject(eventType: string): string {
    // Convert "Lead.Created" to "events.lead.created"
    return `events.${eventType.toLowerCase().replace('.', '.')}`;
  }
}
