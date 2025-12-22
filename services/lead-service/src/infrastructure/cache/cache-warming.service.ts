/**
 * Cache Warming Service
 * Proactively populates cache with frequently accessed data
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { CacheService } from './cache.service';
import { CacheWarmingConfig, CacheWarmingEntity, CacheKeys, CacheTTL } from './types';

/**
 * Warming job result
 */
export interface WarmingJobResult {
  entity: string;
  success: boolean;
  itemsWarmed: number;
  duration: number;
  error?: string;
}

/**
 * Warming session result
 */
export interface WarmingSessionResult {
  startedAt: Date;
  completedAt: Date;
  totalDuration: number;
  results: WarmingJobResult[];
  totalItemsWarmed: number;
  errors: number;
}

@injectable()
export class CacheWarmingService {
  private config: CacheWarmingConfig = {
    enabled: true,
    entities: [
      { type: 'pipeline', priority: 'high' },
      { type: 'analytics', priority: 'high' },
      { type: 'lead', priority: 'medium', filter: { status: ['active', 'qualified'] } },
      { type: 'customer', priority: 'low' },
    ],
    batchSize: 100,
    concurrency: 3,
  };

  private isWarming = false;

  constructor(
    @inject(CacheService) private cacheService: CacheService,
    @inject('DatabasePool') private db: any
  ) {}

  /**
   * Configure warming settings
   */
  configure(config: Partial<CacheWarmingConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Run full cache warming session
   */
  async warmCache(tenantId: string): Promise<Result<WarmingSessionResult>> {
    if (this.isWarming) {
      return Result.fail('Cache warming already in progress');
    }

    if (!this.config.enabled) {
      return Result.fail('Cache warming is disabled');
    }

    this.isWarming = true;
    const startedAt = new Date();
    const results: WarmingJobResult[] = [];

    try {
      // Sort entities by priority
      const sortedEntities = this.sortEntitiesByPriority(this.config.entities);

      // Process entities with concurrency control
      for (let i = 0; i < sortedEntities.length; i += this.config.concurrency) {
        const batch = sortedEntities.slice(i, i + this.config.concurrency);
        const batchResults = await Promise.all(
          batch.map((entity) => this.warmEntity(tenantId, entity))
        );
        results.push(...batchResults);
      }

      const completedAt = new Date();
      const session: WarmingSessionResult = {
        startedAt,
        completedAt,
        totalDuration: completedAt.getTime() - startedAt.getTime(),
        results,
        totalItemsWarmed: results.reduce((sum, r) => sum + r.itemsWarmed, 0),
        errors: results.filter((r) => !r.success).length,
      };

      console.log(
        `✓ Cache warming completed: ${session.totalItemsWarmed} items in ${session.totalDuration}ms`
      );

      return Result.ok(session);
    } catch (error) {
      return Result.fail(`Cache warming failed: ${error}`);
    } finally {
      this.isWarming = false;
    }
  }

  /**
   * Sort entities by priority
   */
  private sortEntitiesByPriority(
    entities: CacheWarmingEntity[]
  ): CacheWarmingEntity[] {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return [...entities].sort(
      (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
    );
  }

  /**
   * Warm a specific entity type
   */
  private async warmEntity(
    tenantId: string,
    entity: CacheWarmingEntity
  ): Promise<WarmingJobResult> {
    const startTime = Date.now();

    try {
      let itemsWarmed = 0;

      switch (entity.type) {
        case 'lead':
          itemsWarmed = await this.warmLeads(tenantId, entity);
          break;
        case 'customer':
          itemsWarmed = await this.warmCustomers(tenantId, entity);
          break;
        case 'pipeline':
          itemsWarmed = await this.warmPipelines(tenantId, entity);
          break;
        case 'analytics':
          itemsWarmed = await this.warmAnalytics(tenantId, entity);
          break;
      }

      return {
        entity: entity.type,
        success: true,
        itemsWarmed,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      return {
        entity: entity.type,
        success: false,
        itemsWarmed: 0,
        duration: Date.now() - startTime,
        error: String(error),
      };
    }
  }

  /**
   * Warm leads cache
   */
  private async warmLeads(
    tenantId: string,
    entity: CacheWarmingEntity
  ): Promise<number> {
    // In production, query database for frequently accessed leads
    const mockLeads = this.getMockLeads(tenantId);
    let warmed = 0;

    for (const lead of mockLeads) {
      const key = CacheKeys.lead(tenantId, lead.id);
      await this.cacheService.set(key, lead, {
        ttl: entity.ttl || CacheTTL.lead,
        tags: ['leads', `tenant:${tenantId}`],
      });
      warmed++;
    }

    // Also warm lead stats
    const statsKey = CacheKeys.leadStats(tenantId);
    await this.cacheService.set(
      statsKey,
      { total: mockLeads.length, active: mockLeads.length },
      { ttl: CacheTTL.analytics, tags: ['leads-stats', `tenant:${tenantId}`] }
    );

    return warmed + 1;
  }

  /**
   * Warm customers cache
   */
  private async warmCustomers(
    tenantId: string,
    entity: CacheWarmingEntity
  ): Promise<number> {
    const mockCustomers = this.getMockCustomers(tenantId);
    let warmed = 0;

    for (const customer of mockCustomers) {
      const key = CacheKeys.customer(tenantId, customer.id);
      await this.cacheService.set(key, customer, {
        ttl: entity.ttl || CacheTTL.customer,
        tags: ['customers', `tenant:${tenantId}`],
      });
      warmed++;
    }

    return warmed;
  }

  /**
   * Warm pipelines cache
   */
  private async warmPipelines(
    tenantId: string,
    entity: CacheWarmingEntity
  ): Promise<number> {
    const mockPipelines = this.getMockPipelines(tenantId);
    let warmed = 0;

    for (const pipeline of mockPipelines) {
      const key = CacheKeys.pipeline(tenantId, pipeline.id);
      await this.cacheService.set(key, pipeline, {
        ttl: entity.ttl || CacheTTL.pipeline,
        tags: ['pipelines', `tenant:${tenantId}`],
      });

      // Also warm pipeline stats
      const statsKey = CacheKeys.pipelineStats(tenantId, pipeline.id);
      await this.cacheService.set(
        statsKey,
        { leadsCount: 50, conversionRate: 0.25 },
        { ttl: CacheTTL.pipelineStats, tags: ['pipeline-stats', `tenant:${tenantId}`] }
      );

      warmed += 2;
    }

    // Warm pipeline list
    const listKey = CacheKeys.pipelineList(tenantId);
    await this.cacheService.set(listKey, mockPipelines, {
      ttl: CacheTTL.pipeline,
      tags: ['pipelines', `tenant:${tenantId}`],
    });

    return warmed + 1;
  }

  /**
   * Warm analytics cache
   */
  private async warmAnalytics(
    tenantId: string,
    entity: CacheWarmingEntity
  ): Promise<number> {
    const periods = ['today', 'week', 'month', 'quarter'];
    const reportTypes = ['leads', 'conversions', 'revenue', 'activities'];
    let warmed = 0;

    for (const reportType of reportTypes) {
      for (const period of periods) {
        const key = CacheKeys.analytics(tenantId, reportType, period);
        const mockData = this.getMockAnalytics(reportType, period);
        await this.cacheService.set(key, mockData, {
          ttl: entity.ttl || CacheTTL.analytics,
          tags: ['analytics', `tenant:${tenantId}`],
        });
        warmed++;
      }
    }

    // Warm dashboard
    const dashboardKey = CacheKeys.dashboard(tenantId);
    await this.cacheService.set(
      dashboardKey,
      this.getMockDashboard(),
      { ttl: CacheTTL.dashboard, tags: ['dashboard', `tenant:${tenantId}`] }
    );

    return warmed + 1;
  }

  /**
   * Warm specific keys on demand
   */
  async warmKeys(
    tenantId: string,
    keys: string[],
    dataFetcher: (key: string) => Promise<unknown>
  ): Promise<Result<number>> {
    let warmed = 0;

    try {
      for (const key of keys) {
        const data = await dataFetcher(key);
        if (data !== null && data !== undefined) {
          await this.cacheService.set(key, data, {
            tags: [`tenant:${tenantId}`],
          });
          warmed++;
        }
      }

      return Result.ok(warmed);
    } catch (error) {
      return Result.fail(`Failed to warm keys: ${error}`);
    }
  }

  /**
   * Warm cache for a specific lead
   */
  async warmLead(tenantId: string, leadId: string, leadData: unknown): Promise<void> {
    const key = CacheKeys.lead(tenantId, leadId);
    await this.cacheService.set(key, leadData, {
      ttl: CacheTTL.lead,
      tags: ['leads', `tenant:${tenantId}`, `lead:${leadId}`],
    });
  }

  /**
   * Warm cache for search results
   */
  async warmSearchResults(
    tenantId: string,
    query: Record<string, unknown>,
    results: unknown[]
  ): Promise<void> {
    const queryHash = CacheService.generateKeyHash(query);
    const key = CacheKeys.searchResults(tenantId, queryHash);
    await this.cacheService.set(key, results, {
      ttl: CacheTTL.searchResults,
      tags: ['search', `tenant:${tenantId}`],
    });
  }

  /**
   * Check if warming is in progress
   */
  get isWarmingInProgress(): boolean {
    return this.isWarming;
  }

  // Mock data generators for demonstration
  private getMockLeads(tenantId: string): any[] {
    return Array.from({ length: 10 }, (_, i) => ({
      id: `lead-${i}`,
      tenantId,
      name: `Lead ${i}`,
      email: `lead${i}@example.com`,
      status: 'active',
    }));
  }

  private getMockCustomers(tenantId: string): any[] {
    return Array.from({ length: 5 }, (_, i) => ({
      id: `customer-${i}`,
      tenantId,
      name: `Customer ${i}`,
      email: `customer${i}@example.com`,
    }));
  }

  private getMockPipelines(tenantId: string): any[] {
    return [
      { id: 'pipeline-1', tenantId, name: 'Sales Pipeline', stages: 5 },
      { id: 'pipeline-2', tenantId, name: 'Enterprise Pipeline', stages: 7 },
    ];
  }

  private getMockAnalytics(reportType: string, period: string): any {
    return {
      reportType,
      period,
      data: { value: Math.random() * 1000 },
      generatedAt: new Date(),
    };
  }

  private getMockDashboard(): any {
    return {
      metrics: {
        totalLeads: 150,
        activeDeals: 45,
        revenue: 125000,
        conversionRate: 0.23,
      },
      charts: [],
      lastUpdated: new Date(),
    };
  }
}
