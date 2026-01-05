/**
 * Lead Enrichment Service
 * Unified service for enriching leads with data from multiple providers
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  EnrichmentProvider,
  EnrichmentInput,
  EnrichmentResult,
  BulkEnrichmentInput,
  BulkEnrichmentResult,
  EnrichmentJob,
  ProviderStatus,
  IEnrichmentProvider,
} from './types';
import { ApolloProvider } from './apollo.provider';
import { ClearbitProvider } from './clearbit.provider';

/**
 * Enrichment Service
 * Handles lead data enrichment with fallback and waterfall strategies
 */
@injectable()
export class EnrichmentService {
  private providers: Map<EnrichmentProvider, IEnrichmentProvider> = new Map();
  private providerOrder: EnrichmentProvider[] = ['apollo', 'clearbit'];

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeProviders();
  }

  /**
   * Initialize available enrichment providers
   */
  private initializeProviders(): void {
    const apolloProvider = new ApolloProvider();
    if (apolloProvider.isAvailable()) {
      this.providers.set('apollo', apolloProvider);
    }

    const clearbitProvider = new ClearbitProvider();
    if (clearbitProvider.isAvailable()) {
      this.providers.set('clearbit', clearbitProvider);
    }
  }

  /**
   * Check if enrichment is available
   */
  isAvailable(): boolean {
    return this.providers.size > 0;
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): EnrichmentProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get status of all providers
   */
  async getProvidersStatus(): Promise<ProviderStatus[]> {
    const statuses: ProviderStatus[] = [];

    for (const [name, provider] of this.providers) {
      const status = await provider.getStatus();
      statuses.push(status);
    }

    return statuses;
  }

  /**
   * Get provider statuses (alias for getProvidersStatus)
   */
  async getProviderStatuses(): Promise<ProviderStatus[]> {
    return this.getProvidersStatus();
  }

  /**
   * Enrich a single lead
   */
  async enrichLead(
    tenantId: string,
    leadId: string,
    input: EnrichmentInput
  ): Promise<Result<EnrichmentResult>> {
    try {
      const provider = input.preferredProvider
        ? this.providers.get(input.preferredProvider)
        : this.getFirstAvailableProvider();

      if (!provider) {
        return Result.fail('No enrichment provider available');
      }

      // Create enrichment job
      const jobId = uuidv4();
      await this.createEnrichmentJob(jobId, tenantId, 'single', provider.name, input);

      let result: EnrichmentResult;

      if (input.enrichPerson !== false) {
        result = await provider.enrichPerson(input);
      } else if (input.enrichCompany) {
        result = await provider.enrichCompany(input);
      } else {
        result = await provider.enrichPerson(input);
      }

      // If first provider fails and we have fallback
      if (!result.success && !input.preferredProvider) {
        const fallbackResult = await this.tryFallbackProviders(
          provider.name,
          input,
          input.enrichCompany && input.enrichPerson === false ? 'company' : 'person'
        );

        if (fallbackResult) {
          result = fallbackResult;
        }
      }

      // Update job status
      await this.updateEnrichmentJob(jobId, result.success ? 'completed' : 'failed', result);

      // If successful, update lead with enriched data
      if (result.success) {
        await this.applyEnrichmentToLead(tenantId, leadId, result);
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Enrich company only
   */
  async enrichCompany(
    tenantId: string,
    input: EnrichmentInput
  ): Promise<Result<EnrichmentResult>> {
    try {
      const provider = input.preferredProvider
        ? this.providers.get(input.preferredProvider)
        : this.getFirstAvailableProvider();

      if (!provider) {
        return Result.fail('No enrichment provider available');
      }

      let result = await provider.enrichCompany(input);

      // Try fallback if needed
      if (!result.success && !input.preferredProvider) {
        const fallbackResult = await this.tryFallbackProviders(
          provider.name,
          input,
          'company'
        );
        if (fallbackResult) {
          result = fallbackResult;
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Company enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Bulk enrich leads
   */
  async bulkEnrichLeads(
    tenantId: string,
    input: BulkEnrichmentInput
  ): Promise<Result<BulkEnrichmentResult>> {
    try {
      const provider = input.preferredProvider
        ? this.providers.get(input.preferredProvider)
        : this.getFirstAvailableProvider();

      if (!provider) {
        return Result.fail('No enrichment provider available');
      }

      // Create bulk enrichment job
      const jobId = uuidv4();
      await this.createEnrichmentJob(jobId, tenantId, 'bulk', provider.name, input);

      let result: BulkEnrichmentResult;

      // Check if provider supports bulk enrichment
      if (provider.bulkEnrich) {
        result = await provider.bulkEnrich(input);
      } else {
        // Fall back to individual enrichment
        result = await this.fallbackBulkEnrich(provider, input);
      }

      // Update job status
      await this.updateBulkEnrichmentJob(jobId, result);

      // Apply enriched data to leads
      for (const item of result.results) {
        if (item.result?.success) {
          await this.applyEnrichmentToLead(tenantId, item.id, item.result);
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Bulk enrichment failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get enrichment job by ID
   */
  async getEnrichmentJob(
    jobId: string,
    tenantId: string
  ): Promise<Result<EnrichmentJob | null>> {
    try {
      const query = `
        SELECT * FROM enrichment_jobs
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [jobId, tenantId]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToJob(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get enrichment job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List enrichment jobs
   */
  async listEnrichmentJobs(
    tenantId: string,
    options?: {
      status?: string;
      provider?: EnrichmentProvider;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ jobs: EnrichmentJob[]; total: number }>> {
    try {
      const page = options?.page || 1;
      const limit = Math.min(options?.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options?.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options?.provider) {
        conditions.push(`provider = $${paramIndex++}`);
        values.push(options.provider);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM enrichment_jobs WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      const total = parseInt(countResult.value?.rows[0]?.total || '0', 10);

      // Get jobs
      const query = `
        SELECT * FROM enrichment_jobs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list enrichment jobs');
      }

      const jobs = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToJob(row)
      );

      return Result.ok({ jobs, total });
    } catch (error) {
      return Result.fail(`Failed to list enrichment jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Get first available provider
   */
  private getFirstAvailableProvider(): IEnrichmentProvider | null {
    for (const providerName of this.providerOrder) {
      const provider = this.providers.get(providerName);
      if (provider && provider.isAvailable()) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Try fallback providers
   */
  private async tryFallbackProviders(
    excludeProvider: EnrichmentProvider,
    input: EnrichmentInput,
    type: 'person' | 'company'
  ): Promise<EnrichmentResult | null> {
    for (const providerName of this.providerOrder) {
      if (providerName === excludeProvider) continue;

      const provider = this.providers.get(providerName);
      if (!provider || !provider.isAvailable()) continue;

      const result =
        type === 'company'
          ? await provider.enrichCompany(input)
          : await provider.enrichPerson(input);

      if (result.success) {
        return result;
      }
    }
    return null;
  }

  /**
   * Fallback bulk enrich (one by one)
   */
  private async fallbackBulkEnrich(
    provider: IEnrichmentProvider,
    input: BulkEnrichmentInput
  ): Promise<BulkEnrichmentResult> {
    const results: BulkEnrichmentResult['results'] = [];
    let enriched = 0;
    let failed = 0;
    let creditsUsed = 0;

    for (const record of input.records) {
      const enrichInput: EnrichmentInput = {
        email: record.email,
        domain: record.domain,
        firstName: record.firstName,
        lastName: record.lastName,
        companyName: record.companyName,
        linkedinUrl: record.linkedinUrl,
        enrichPerson: input.enrichPerson,
        enrichCompany: input.enrichCompany,
      };

      const result = await provider.enrichPerson(enrichInput);

      if (result.success) {
        enriched++;
        creditsUsed += result.creditsUsed || 1;
        results.push({
          id: record.id,
          result,
        });
      } else {
        failed++;
        results.push({
          id: record.id,
          result: null,
          error: result.error,
        });
      }

      // Rate limiting
      await this.delay(100);
    }

    return {
      total: input.records.length,
      enriched,
      failed,
      results,
      creditsUsed,
    };
  }

  /**
   * Apply enrichment data to lead
   */
  private async applyEnrichmentToLead(
    tenantId: string,
    leadId: string,
    result: EnrichmentResult
  ): Promise<void> {
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      // Apply company data
      if (result.company) {
        if (result.company.industry) {
          updates.push(`industry = $${paramIndex++}`);
          values.push(result.company.industry);
        }
        if (result.company.employeeCount) {
          updates.push(`employee_count = $${paramIndex++}`);
          values.push(result.company.employeeCount);
        }
        if (result.company.estimatedAnnualRevenue) {
          updates.push(`annual_revenue = $${paramIndex++}`);
          values.push(result.company.estimatedAnnualRevenue);
        }
        if (result.company.website) {
          updates.push(`website = $${paramIndex++}`);
          values.push(result.company.website);
        }
      }

      // Store full enrichment data in custom_fields
      const enrichmentData = {
        person: result.person,
        company: result.company,
        provider: result.provider,
        enrichedAt: result.enrichedAt,
      };

      updates.push(`custom_fields = custom_fields || $${paramIndex++}::jsonb`);
      values.push(JSON.stringify({ enrichment: enrichmentData }));

      if (updates.length > 1) {
        const query = `
          UPDATE leads
          SET ${updates.join(', ')}
          WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++}
        `;

        values.push(leadId, tenantId);

        await this.pool.query(query, values);
      }
    } catch (error) {
      console.error('Failed to apply enrichment to lead:', error);
    }
  }

  /**
   * Create enrichment job
   */
  private async createEnrichmentJob(
    jobId: string,
    tenantId: string,
    type: 'single' | 'bulk',
    provider: EnrichmentProvider,
    input: EnrichmentInput | BulkEnrichmentInput
  ): Promise<void> {
    try {
      const totalRecords = type === 'bulk'
        ? (input as BulkEnrichmentInput).records.length
        : 1;

      const query = `
        INSERT INTO enrichment_jobs (
          id, tenant_id, type, provider, status,
          total_records, processed_records, enriched_records, failed_records,
          credits_used, input, started_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW(), NOW())
      `;

      await this.pool.query(query, [
        jobId,
        tenantId,
        type,
        provider,
        'processing',
        totalRecords,
        0,
        0,
        0,
        0,
        JSON.stringify(input),
      ]);
    } catch (error) {
      console.error('Failed to create enrichment job:', error);
    }
  }

  /**
   * Update enrichment job
   */
  private async updateEnrichmentJob(
    jobId: string,
    status: string,
    result: EnrichmentResult
  ): Promise<void> {
    try {
      const query = `
        UPDATE enrichment_jobs
        SET status = $1,
            processed_records = 1,
            enriched_records = $2,
            failed_records = $3,
            credits_used = $4,
            results = $5,
            error_message = $6,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $7
      `;

      await this.pool.query(query, [
        status,
        result.success ? 1 : 0,
        result.success ? 0 : 1,
        result.creditsUsed || 0,
        JSON.stringify(result),
        result.error || null,
        jobId,
      ]);
    } catch (error) {
      console.error('Failed to update enrichment job:', error);
    }
  }

  /**
   * Update bulk enrichment job
   */
  private async updateBulkEnrichmentJob(
    jobId: string,
    result: BulkEnrichmentResult
  ): Promise<void> {
    try {
      const query = `
        UPDATE enrichment_jobs
        SET status = $1,
            processed_records = $2,
            enriched_records = $3,
            failed_records = $4,
            credits_used = $5,
            results = $6,
            completed_at = NOW(),
            updated_at = NOW()
        WHERE id = $7
      `;

      await this.pool.query(query, [
        result.failed === result.total ? 'failed' : result.enriched === result.total ? 'completed' : 'partial',
        result.total,
        result.enriched,
        result.failed,
        result.creditsUsed,
        JSON.stringify(result),
        jobId,
      ]);
    } catch (error) {
      console.error('Failed to update bulk enrichment job:', error);
    }
  }

  /**
   * Map database row to EnrichmentJob
   */
  private mapRowToJob(row: Record<string, unknown>): EnrichmentJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as 'single' | 'bulk',
      provider: row.provider as EnrichmentProvider,
      status: row.status as EnrichmentJob['status'],
      totalRecords: row.total_records as number,
      processedRecords: row.processed_records as number,
      enrichedRecords: row.enriched_records as number,
      failedRecords: row.failed_records as number,
      creditsUsed: row.credits_used as number,
      input: typeof row.input === 'string' ? JSON.parse(row.input) : row.input as EnrichmentInput | BulkEnrichmentInput,
      results: row.results ? (typeof row.results === 'string' ? JSON.parse(row.results) : row.results) : undefined,
      errorMessage: row.error_message as string | undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
