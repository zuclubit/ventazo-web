/**
 * Webhook Queue Service
 * BullMQ-based queue for reliable webhook delivery
 */

import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { WebhookService } from './webhook.service';
import { WebhookDLQService } from './webhook-dlq.service';
import {
  WebhookJobData,
  WebhookJobResult,
  QueueMetrics,
  RetryStrategy,
  DEFAULT_RETRY_STRATEGY,
  calculateRetryDelay,
  isRetryableError,
  categorizeFailure,
} from './webhook-dlq.types';
import { DeliveryStatus, WebhookDelivery, WebhookConfig } from './types';

/**
 * Queue configuration
 */
export interface WebhookQueueConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
  };
  queueName: string;
  concurrency: number;
  retryStrategy: RetryStrategy;
  dlqEnabled: boolean;
  metricsEnabled: boolean;
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: WebhookQueueConfig = {
  redis: {
    host: 'localhost',
    port: 6379,
  },
  queueName: 'webhook-delivery',
  concurrency: 10,
  retryStrategy: DEFAULT_RETRY_STRATEGY,
  dlqEnabled: true,
  metricsEnabled: true,
};

@injectable()
export class WebhookQueueService {
  private config: WebhookQueueConfig;
  private queue: Queue<WebhookJobData, WebhookJobResult> | null = null;
  private worker: Worker<WebhookJobData, WebhookJobResult> | null = null;
  private queueEvents: QueueEvents | null = null;
  private redis: Redis | null = null;
  private metricsBuffer: Map<string, number> = new Map();
  private isProcessing = false;

  constructor(
    @inject('WebhookService') private readonly webhookService: WebhookService,
    @inject('WebhookDLQService') private readonly dlqService: WebhookDLQService,
    config?: Partial<WebhookQueueConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Initialize the queue service
   */
  async initialize(): Promise<Result<void>> {
    try {
      // Create Redis connection
      this.redis = new Redis({
        host: this.config.redis.host,
        port: this.config.redis.port,
        password: this.config.redis.password,
        maxRetriesPerRequest: null,
      });

      // Create queue
      this.queue = new Queue(this.config.queueName, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 1000,
        },
      });

      // Create worker
      this.worker = new Worker(
        this.config.queueName,
        async (job) => this.processJob(job),
        {
          connection: this.redis.duplicate(),
          concurrency: this.config.concurrency,
          limiter: {
            max: 100,
            duration: 1000,
          },
        }
      );

      // Set up event listeners
      this.setupEventListeners();

      // Create queue events for monitoring
      if (this.config.metricsEnabled) {
        this.queueEvents = new QueueEvents(this.config.queueName, {
          connection: this.redis.duplicate(),
        });
        this.setupMetricsListeners();
      }

      this.isProcessing = true;
      console.log('[WebhookQueue] Service initialized');
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to initialize queue'));
    }
  }

  /**
   * Add a webhook delivery job to the queue
   */
  async enqueueDelivery(
    deliveryId: string,
    tenantId: string,
    webhookId: string,
    payload: Record<string, unknown>,
    options?: Partial<JobsOptions>
  ): Promise<Result<string>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const correlationId = randomUUID();
      const jobData: WebhookJobData = {
        deliveryId,
        tenantId,
        webhookId,
        attempt: 1,
        payload,
        timestamp: Date.now(),
        correlationId,
      };

      const job = await this.queue.add(`delivery-${deliveryId}`, jobData, {
        attempts: this.config.retryStrategy.maxRetries,
        backoff: {
          type: 'custom',
        },
        ...options,
      });

      console.log(`[WebhookQueue] Enqueued delivery ${deliveryId}, job ${job.id}`);
      return Result.ok(job.id!);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to enqueue delivery'));
    }
  }

  /**
   * Enqueue multiple deliveries
   */
  async enqueueBatch(
    deliveries: Array<{
      deliveryId: string;
      tenantId: string;
      webhookId: string;
      payload: Record<string, unknown>;
    }>
  ): Promise<Result<string[]>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const jobs = await this.queue.addBulk(
        deliveries.map((d) => ({
          name: `delivery-${d.deliveryId}`,
          data: {
            deliveryId: d.deliveryId,
            tenantId: d.tenantId,
            webhookId: d.webhookId,
            attempt: 1,
            payload: d.payload,
            timestamp: Date.now(),
            correlationId: randomUUID(),
          } as WebhookJobData,
          opts: {
            attempts: this.config.retryStrategy.maxRetries,
          },
        }))
      );

      const jobIds = jobs.map((j) => j.id!);
      console.log(`[WebhookQueue] Enqueued ${jobIds.length} deliveries`);
      return Result.ok(jobIds);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to enqueue batch'));
    }
  }

  /**
   * Process a webhook job
   */
  private async processJob(job: Job<WebhookJobData, WebhookJobResult>): Promise<WebhookJobResult> {
    const { deliveryId, tenantId, webhookId, attempt, correlationId } = job.data;

    console.log(
      `[WebhookQueue] Processing job ${job.id}, delivery ${deliveryId}, attempt ${attempt}`
    );

    const startTime = Date.now();
    let success = false;
    let responseStatus: number | undefined;
    let error: string | undefined;
    let movedToDLQ = false;

    try {
      // Execute the delivery
      const result = await this.webhookService.executeDelivery(deliveryId);

      if (result.isFailure) {
        throw new Error(result.error?.toString() || 'Delivery failed');
      }

      const delivery = result.getValue();
      success = delivery.status === DeliveryStatus.SUCCESS;
      responseStatus = delivery.responseStatus;

      if (!success) {
        error = delivery.error || `HTTP ${responseStatus}`;

        // Check if retryable
        if (isRetryableError(this.config.retryStrategy, error, responseStatus)) {
          // Calculate delay for next attempt
          const delay = calculateRetryDelay(this.config.retryStrategy, attempt);

          // Update job for retry
          await job.updateData({
            ...job.data,
            attempt: attempt + 1,
          });

          throw new Error(error); // Trigger BullMQ retry
        }
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';

      // Check if this is the last attempt
      if (attempt >= this.config.retryStrategy.maxRetries) {
        // Move to DLQ
        if (this.config.dlqEnabled) {
          movedToDLQ = await this.moveToDeadLetterQueue(
            job.data,
            error,
            responseStatus
          );
        }

        console.log(
          `[WebhookQueue] Job ${job.id} exhausted retries, moved to DLQ: ${movedToDLQ}`
        );
      } else {
        // Re-throw to trigger retry
        throw err;
      }
    }

    const responseTime = Date.now() - startTime;

    // Update metrics
    this.updateMetrics(success ? 'success' : 'failed', responseTime);

    return {
      success,
      deliveryId,
      attemptNumber: attempt,
      responseStatus,
      responseTime,
      error,
      movedToDLQ,
    };
  }

  /**
   * Move failed delivery to DLQ
   */
  private async moveToDeadLetterQueue(
    jobData: WebhookJobData,
    error: string,
    responseStatus?: number
  ): Promise<boolean> {
    try {
      // Get delivery details
      const deliveryResult = await this.getDeliveryDetails(jobData.deliveryId);
      if (!deliveryResult) {
        console.error(`[WebhookQueue] Failed to get delivery ${jobData.deliveryId} for DLQ`);
        return false;
      }

      const { delivery, webhook } = deliveryResult;

      // Add to DLQ
      const dlqResult = await this.dlqService.addToDLQ(
        delivery,
        webhook.name,
        `Exhausted ${this.config.retryStrategy.maxRetries} retry attempts`,
        error,
        responseStatus,
        undefined
      );

      if (dlqResult.isFailure) {
        console.error(`[WebhookQueue] Failed to add to DLQ:`, dlqResult.error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[WebhookQueue] Error moving to DLQ:', error);
      return false;
    }
  }

  /**
   * Get delivery and webhook details
   */
  private async getDeliveryDetails(
    deliveryId: string
  ): Promise<{ delivery: WebhookDelivery; webhook: WebhookConfig } | null> {
    // This would normally fetch from the database
    // For now, return a mock structure that would be populated by the webhook service
    return null;
  }

  /**
   * Set up worker event listeners
   */
  private setupEventListeners(): void {
    if (!this.worker) return;

    this.worker.on('completed', (job, result) => {
      console.log(`[WebhookQueue] Job ${job.id} completed: ${result.success ? 'success' : 'failed'}`);
    });

    this.worker.on('failed', (job, err) => {
      console.error(`[WebhookQueue] Job ${job?.id} failed:`, err.message);
    });

    this.worker.on('error', (err) => {
      console.error('[WebhookQueue] Worker error:', err);
    });

    this.worker.on('stalled', (jobId) => {
      console.warn(`[WebhookQueue] Job ${jobId} stalled`);
    });
  }

  /**
   * Set up metrics event listeners
   */
  private setupMetricsListeners(): void {
    if (!this.queueEvents) return;

    this.queueEvents.on('completed', () => {
      this.incrementMetric('completed');
    });

    this.queueEvents.on('failed', () => {
      this.incrementMetric('failed');
    });

    this.queueEvents.on('delayed', () => {
      this.incrementMetric('delayed');
    });

    this.queueEvents.on('waiting', () => {
      this.incrementMetric('waiting');
    });
  }

  /**
   * Update metrics
   */
  private updateMetrics(type: 'success' | 'failed', responseTime: number): void {
    this.incrementMetric(type);
    this.incrementMetric('total');

    // Track response time
    const totalTime = this.metricsBuffer.get('totalResponseTime') || 0;
    const count = this.metricsBuffer.get('responseTimeCount') || 0;
    this.metricsBuffer.set('totalResponseTime', totalTime + responseTime);
    this.metricsBuffer.set('responseTimeCount', count + 1);
  }

  /**
   * Increment a metric counter
   */
  private incrementMetric(name: string): void {
    const current = this.metricsBuffer.get(name) || 0;
    this.metricsBuffer.set(name, current + 1);
  }

  /**
   * Get queue metrics
   */
  async getMetrics(): Promise<Result<QueueMetrics>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const [waiting, active, completed, failed, delayed] = await Promise.all([
        this.queue.getWaitingCount(),
        this.queue.getActiveCount(),
        this.queue.getCompletedCount(),
        this.queue.getFailedCount(),
        this.queue.getDelayedCount(),
      ]);

      const paused = await this.queue.isPaused();

      const totalTime = this.metricsBuffer.get('totalResponseTime') || 0;
      const count = this.metricsBuffer.get('responseTimeCount') || 0;
      const avgProcessingTime = count > 0 ? totalTime / count : 0;

      const total = this.metricsBuffer.get('total') || 0;
      const startTime = this.metricsBuffer.get('startTime') || Date.now();
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const throughput = elapsedSeconds > 0 ? total / elapsedSeconds : 0;

      return Result.ok({
        waiting,
        active,
        completed,
        failed,
        delayed,
        paused,
        avgProcessingTime,
        throughput,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get metrics'));
    }
  }

  /**
   * Pause the queue
   */
  async pause(): Promise<Result<void>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      await this.queue.pause();
      this.isProcessing = false;
      console.log('[WebhookQueue] Queue paused');
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to pause queue'));
    }
  }

  /**
   * Resume the queue
   */
  async resume(): Promise<Result<void>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      await this.queue.resume();
      this.isProcessing = true;
      console.log('[WebhookQueue] Queue resumed');
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to resume queue'));
    }
  }

  /**
   * Drain the queue (remove all jobs)
   */
  async drain(): Promise<Result<void>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      await this.queue.drain();
      console.log('[WebhookQueue] Queue drained');
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to drain queue'));
    }
  }

  /**
   * Get a specific job
   */
  async getJob(jobId: string): Promise<Result<Job<WebhookJobData, WebhookJobResult> | null>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const job = await this.queue.getJob(jobId);
      return Result.ok(job || null);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get job'));
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(jobId: string): Promise<Result<void>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const job = await this.queue.getJob(jobId);
      if (!job) {
        return Result.fail(new Error('Job not found'));
      }

      await job.retry();
      console.log(`[WebhookQueue] Job ${jobId} retried`);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to retry job'));
    }
  }

  /**
   * Remove a job
   */
  async removeJob(jobId: string): Promise<Result<void>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const job = await this.queue.getJob(jobId);
      if (job) {
        await job.remove();
        console.log(`[WebhookQueue] Job ${jobId} removed`);
      }
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to remove job'));
    }
  }

  /**
   * Get jobs by status
   */
  async getJobs(
    status: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start = 0,
    end = 100
  ): Promise<Result<Job<WebhookJobData, WebhookJobResult>[]>> {
    if (!this.queue) {
      return Result.fail(new Error('Queue not initialized'));
    }

    try {
      const jobs = await this.queue.getJobs([status], start, end);
      return Result.ok(jobs);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get jobs'));
    }
  }

  /**
   * Check if queue is processing
   */
  isActive(): boolean {
    return this.isProcessing;
  }

  /**
   * Clean up resources
   */
  async close(): Promise<void> {
    if (this.worker) {
      await this.worker.close();
    }
    if (this.queueEvents) {
      await this.queueEvents.close();
    }
    if (this.queue) {
      await this.queue.close();
    }
    if (this.redis) {
      await this.redis.quit();
    }
    console.log('[WebhookQueue] Service closed');
  }
}

/**
 * Create webhook queue service
 */
export function createWebhookQueueService(
  webhookService: WebhookService,
  dlqService: WebhookDLQService,
  config?: Partial<WebhookQueueConfig>
): WebhookQueueService {
  return new WebhookQueueService(webhookService, dlqService, config);
}
