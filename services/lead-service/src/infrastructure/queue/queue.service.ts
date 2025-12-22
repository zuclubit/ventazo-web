/**
 * Queue Service
 * BullMQ-based job queue management for async processing
 */

import { Queue, Worker, Job, QueueEvents, JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';
import { injectable, singleton } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  QueueName,
  JobType,
  QueueConfig,
  DEFAULT_QUEUE_CONFIGS,
  BaseJobData,
  JobResult,
} from './types';

export interface QueueServiceConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db?: number;
  };
  prefix?: string;
}

type JobHandler<T extends BaseJobData> = (job: Job<T>) => Promise<JobResult>;

@injectable()
@singleton()
export class QueueService {
  private queues: Map<QueueName, Queue> = new Map();
  private workers: Map<QueueName, Worker> = new Map();
  private queueEvents: Map<QueueName, QueueEvents> = new Map();
  private handlers: Map<string, JobHandler<BaseJobData>> = new Map();
  private connection: Redis | null = null;
  private isInitialized = false;

  constructor() {}

  /**
   * Initialize the queue service with Redis connection
   */
  async initialize(config: QueueServiceConfig): Promise<Result<void>> {
    try {
      if (this.isInitialized) {
        return Result.ok();
      }

      // Create Redis connection
      this.connection = new Redis({
        host: config.redis.host,
        port: config.redis.port,
        password: config.redis.password,
        db: config.redis.db || 0,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      });

      // Test connection
      await this.connection.ping();

      // Initialize queues
      for (const queueConfig of Object.values(DEFAULT_QUEUE_CONFIGS)) {
        await this.initializeQueue(queueConfig, config.prefix);
      }

      this.isInitialized = true;
      console.log('[QueueService] Initialized successfully');
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[QueueService] Initialization failed:', message);
      return Result.fail(`Failed to initialize queue service: ${message}`);
    }
  }

  /**
   * Initialize a specific queue with its configuration
   */
  private async initializeQueue(
    queueConfig: QueueConfig,
    prefix?: string
  ): Promise<void> {
    const { name, defaultJobOptions, limiter } = queueConfig;

    const queue = new Queue(name, {
      connection: this.connection!,
      prefix: prefix || 'zuclubit',
      defaultJobOptions: {
        ...defaultJobOptions,
        timestamp: Date.now(),
      },
    });

    // Apply rate limiter if configured
    if (limiter) {
      await queue.setGlobalConcurrency(limiter.max);
    }

    this.queues.set(name, queue);

    // Create queue events listener
    const queueEvents = new QueueEvents(name, {
      connection: this.connection!,
      prefix: prefix || 'zuclubit',
    });
    this.queueEvents.set(name, queueEvents);

    console.log(`[QueueService] Queue "${name}" initialized`);
  }

  /**
   * Register a job handler for a specific job type
   */
  registerHandler<T extends BaseJobData>(
    jobType: JobType,
    handler: JobHandler<T>
  ): void {
    this.handlers.set(jobType, handler as JobHandler<BaseJobData>);
    console.log(`[QueueService] Handler registered for job type: ${jobType}`);
  }

  /**
   * Start workers for all queues
   */
  async startWorkers(): Promise<Result<void>> {
    try {
      for (const [queueName, config] of Object.entries(DEFAULT_QUEUE_CONFIGS)) {
        await this.startWorker(queueName as QueueName, config.concurrency);
      }
      console.log('[QueueService] All workers started');
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to start workers: ${message}`);
    }
  }

  /**
   * Start a worker for a specific queue
   */
  private async startWorker(
    queueName: QueueName,
    concurrency: number
  ): Promise<void> {
    const worker = new Worker(
      queueName,
      async (job: Job<BaseJobData>) => {
        const startTime = Date.now();
        const jobType = job.name as JobType;
        const handler = this.handlers.get(jobType);

        if (!handler) {
          console.warn(`[QueueService] No handler for job type: ${jobType}`);
          return { success: false, error: `No handler for job type: ${jobType}` };
        }

        try {
          console.log(`[QueueService] Processing job ${job.id} (${jobType})`);
          const result = await handler(job);
          const duration = Date.now() - startTime;

          console.log(
            `[QueueService] Job ${job.id} completed in ${duration}ms`,
            result.success ? 'SUCCESS' : 'FAILED'
          );

          return { ...result, duration };
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Unknown error';
          console.error(`[QueueService] Job ${job.id} failed:`, message);
          throw error;
        }
      },
      {
        connection: this.connection!,
        concurrency,
        prefix: 'zuclubit',
      }
    );

    // Set up worker event listeners
    worker.on('completed', (job) => {
      console.log(`[Worker:${queueName}] Job ${job.id} completed`);
    });

    worker.on('failed', (job, error) => {
      console.error(`[Worker:${queueName}] Job ${job?.id} failed:`, error.message);
    });

    worker.on('error', (error) => {
      console.error(`[Worker:${queueName}] Error:`, error.message);
    });

    this.workers.set(queueName, worker);
    console.log(`[QueueService] Worker started for queue: ${queueName}`);
  }

  /**
   * Add a job to a queue
   */
  async addJob<T extends BaseJobData>(
    queueName: QueueName,
    jobType: JobType,
    data: T,
    options?: Partial<JobsOptions>
  ): Promise<Result<string>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobType, data, {
        ...options,
        jobId: options?.jobId || `${jobType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      });

      console.log(`[QueueService] Job added to ${queueName}: ${job.id}`);
      return Result.ok(job.id!);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to add job: ${message}`);
    }
  }

  /**
   * Add multiple jobs to a queue (bulk)
   */
  async addBulkJobs<T extends BaseJobData>(
    queueName: QueueName,
    jobs: Array<{ type: JobType; data: T; options?: Partial<JobsOptions> }>
  ): Promise<Result<string[]>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const bulkJobs = jobs.map((job) => ({
        name: job.type,
        data: job.data,
        opts: job.options,
      }));

      const addedJobs = await queue.addBulk(bulkJobs);
      const jobIds = addedJobs.map((j) => j.id!);

      console.log(`[QueueService] ${jobIds.length} jobs added to ${queueName}`);
      return Result.ok(jobIds);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to add bulk jobs: ${message}`);
    }
  }

  /**
   * Schedule a job to run at a specific time
   */
  async scheduleJob<T extends BaseJobData>(
    queueName: QueueName,
    jobType: JobType,
    data: T,
    runAt: Date
  ): Promise<Result<string>> {
    const delay = runAt.getTime() - Date.now();
    if (delay < 0) {
      return Result.fail('Scheduled time must be in the future');
    }

    return this.addJob(queueName, jobType, data, { delay });
  }

  /**
   * Add a repeating job (cron-style)
   */
  async addRepeatingJob<T extends BaseJobData>(
    queueName: QueueName,
    jobType: JobType,
    data: T,
    pattern: string, // Cron pattern or 'every Xms'
    options?: { jobId?: string; startDate?: Date; endDate?: Date }
  ): Promise<Result<string>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const job = await queue.add(jobType, data, {
        repeat: {
          pattern,
          startDate: options?.startDate,
          endDate: options?.endDate,
        },
        jobId: options?.jobId,
      });

      console.log(`[QueueService] Repeating job added: ${job.id} (${pattern})`);
      return Result.ok(job.id!);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to add repeating job: ${message}`);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(
    queueName: QueueName,
    jobId: string
  ): Promise<Result<{ state: string; progress: number; data: unknown }>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const job = await queue.getJob(jobId);
      if (!job) {
        return Result.fail(`Job ${jobId} not found`);
      }

      const state = await job.getState();
      return Result.ok({
        state,
        progress: job.progress as number,
        data: job.data,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get job status: ${message}`);
    }
  }

  /**
   * Get queue metrics
   */
  async getQueueMetrics(queueName: QueueName): Promise<
    Result<{
      waiting: number;
      active: number;
      completed: number;
      failed: number;
      delayed: number;
    }>
  > {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const [waiting, active, completed, failed, delayed] = await Promise.all([
        queue.getWaitingCount(),
        queue.getActiveCount(),
        queue.getCompletedCount(),
        queue.getFailedCount(),
        queue.getDelayedCount(),
      ]);

      return Result.ok({ waiting, active, completed, failed, delayed });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get queue metrics: ${message}`);
    }
  }

  /**
   * Pause a queue
   */
  async pauseQueue(queueName: QueueName): Promise<Result<void>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      await queue.pause();
      console.log(`[QueueService] Queue ${queueName} paused`);
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to pause queue: ${message}`);
    }
  }

  /**
   * Resume a queue
   */
  async resumeQueue(queueName: QueueName): Promise<Result<void>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      await queue.resume();
      console.log(`[QueueService] Queue ${queueName} resumed`);
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to resume queue: ${message}`);
    }
  }

  /**
   * Clean completed/failed jobs
   */
  async cleanQueue(
    queueName: QueueName,
    grace: number = 3600000, // 1 hour default
    status: 'completed' | 'failed' | 'wait' | 'delayed' = 'completed'
  ): Promise<Result<number>> {
    try {
      const queue = this.queues.get(queueName);
      if (!queue) {
        return Result.fail(`Queue ${queueName} not found`);
      }

      const removed = await queue.clean(grace, 1000, status);
      console.log(`[QueueService] Cleaned ${removed.length} jobs from ${queueName}`);
      return Result.ok(removed.length);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to clean queue: ${message}`);
    }
  }

  /**
   * Shutdown gracefully
   */
  async shutdown(): Promise<void> {
    console.log('[QueueService] Shutting down...');

    // Close workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      console.log(`[QueueService] Worker ${name} closed`);
    }

    // Close queue events
    for (const [name, events] of this.queueEvents) {
      await events.close();
      console.log(`[QueueService] QueueEvents ${name} closed`);
    }

    // Close queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      console.log(`[QueueService] Queue ${name} closed`);
    }

    // Close Redis connection
    if (this.connection) {
      await this.connection.quit();
      console.log('[QueueService] Redis connection closed');
    }

    this.isInitialized = false;
    console.log('[QueueService] Shutdown complete');
  }

  /**
   * Check if service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }
}
