/**
 * Integration Connectors Service
 * Manages third-party integrations and data synchronization
 * NOW WITH REAL DATABASE QUERIES
 */
import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  IntegrationConnectorDefinition,
  IntegrationConnection,
  SyncJob,
  IntegrationWebhookEvent,
  CreateConnectionInput,
  UpdateConnectionInput,
  DecryptedCredentials,
  ConnectionStatus,
  IntegrationCategory,
  EntityMappingConfig,
} from './types';

@injectable()
export class IntegrationConnectorService {
  constructor(@inject(DatabasePool) private readonly pool: DatabasePool) {}

  /**
   * Get all available connectors
   */
  async getConnectors(
    options: {
      category?: IntegrationCategory;
      search?: string;
      premium_only?: boolean;
    } = {}
  ): Promise<Result<IntegrationConnectorDefinition[]>> {
    try {
      let query = `SELECT * FROM integration_connectors WHERE is_enabled = true`;
      const params: unknown[] = [];
      let paramIndex = 1;

      if (options.category) {
        query += ` AND category = $${paramIndex}`;
        params.push(options.category);
        paramIndex++;
      }

      if (options.search) {
        query += ` AND (LOWER(name) LIKE $${paramIndex} OR LOWER(description) LIKE $${paramIndex})`;
        params.push(`%${options.search.toLowerCase()}%`);
        paramIndex++;
      }

      if (options.premium_only) {
        query += ` AND is_premium = true`;
      }

      query += ` ORDER BY name ASC`;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }
      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToConnector(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connectors'));
    }
  }

  /**
   * Get a specific connector by ID
   */
  async getConnector(connectorId: string): Promise<Result<IntegrationConnectorDefinition>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM integration_connectors WHERE id = $1`,
        [connectorId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connector not found'));
      }

      return Result.ok(this.mapRowToConnector(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connector'));
    }
  }

  /**
   * Get connector by slug
   */
  async getConnectorBySlug(slug: string): Promise<Result<IntegrationConnectorDefinition>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM integration_connectors WHERE slug = $1`,
        [slug]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connector not found'));
      }

      return Result.ok(this.mapRowToConnector(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connector'));
    }
  }

  /**
   * Create a new integration connection
   */
  async createConnection(
    tenantId: string,
    userId: string,
    input: CreateConnectionInput
  ): Promise<Result<IntegrationConnection>> {
    try {
      // Get connector info
      const connectorResult = await this.getConnector(input.connector_id);
      if (connectorResult.isFailure) {
        // Try by slug if ID fails
        const bySlugResult = await this.getConnectorBySlug(input.connector_id);
        if (bySlugResult.isFailure) {
          return Result.fail(new Error('Connector not found'));
        }
      }

      const connector = connectorResult.isSuccess ? connectorResult.value :
        (await this.getConnectorBySlug(input.connector_id)).value;

      // Encrypt credentials
      const encryptedCredentials = this.encryptCredentials(input.credentials);

      const defaultSettings = {
        auto_sync: true,
        sync_frequency: 'hourly',
        sync_on_create: true,
        sync_on_update: true,
        sync_on_delete: false,
        conflict_resolution: 'newest_wins',
        error_notification: true,
        notification_emails: [],
        sandbox_mode: false,
        ...input.settings,
      };

      const result = await this.pool.query(
        `INSERT INTO integration_connections (
          tenant_id, connector_id, connector_slug, name, status, auth_type,
          credentials_encrypted, encryption_version, settings, entity_mappings,
          sync_config, metadata, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          tenantId,
          connector.id,
          connector.slug,
          input.name,
          'connected',
          connector.auth_type,
          encryptedCredentials,
          'v1',
          JSON.stringify(defaultSettings),
          JSON.stringify(input.entity_mappings ?? []),
          JSON.stringify({ frequency: 'hourly' }),
          JSON.stringify({}),
          userId,
        ]
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to create connection'));
      }

      return Result.ok(this.mapRowToConnection(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create connection'));
    }
  }

  /**
   * Get all connections for a tenant
   */
  async getConnections(
    tenantId: string,
    options: { status?: ConnectionStatus; connector_slug?: string } = {}
  ): Promise<Result<IntegrationConnection[]>> {
    try {
      let query = `SELECT * FROM integration_connections WHERE tenant_id = $1`;
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(options.status);
        paramIndex++;
      }

      if (options.connector_slug) {
        query += ` AND connector_slug = $${paramIndex}`;
        params.push(options.connector_slug);
      }

      query += ` ORDER BY created_at DESC`;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }
      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToConnection(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connections'));
    }
  }

  /**
   * List connections with pagination (alias for routes)
   */
  async listConnections(
    tenantId: string,
    options: {
      status?: ConnectionStatus;
      category?: IntegrationCategory;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<Result<{ connections: IntegrationConnection[]; total: number }>> {
    try {
      const limit = options.limit ?? 20;
      const page = options.page ?? 1;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE ic.tenant_id = $1';
      const countParams: unknown[] = [tenantId];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.status) {
        whereClause += ` AND ic.status = $${paramIndex}`;
        countParams.push(options.status);
        params.push(options.status);
        paramIndex++;
      }

      if (options.category) {
        whereClause += ` AND conn.category = $${paramIndex}`;
        countParams.push(options.category);
        params.push(options.category);
        paramIndex++;
      }

      // Count total
      const countQuery = `
        SELECT COUNT(*) as count
        FROM integration_connections ic
        LEFT JOIN integration_connectors conn ON ic.connector_id = conn.id
        ${whereClause}
      `;
      const countResult = await this.pool.query<{ count: string }>(countQuery, countParams);
      if (countResult.isFailure) {
        return Result.fail(countResult.error || new Error('Failed to count connections'));
      }
      const total = parseInt(countResult.value?.rows?.[0]?.count ?? '0', 10);

      // Get data
      const dataQuery = `
        SELECT ic.*
        FROM integration_connections ic
        LEFT JOIN integration_connectors conn ON ic.connector_id = conn.id
        ${whereClause}
        ORDER BY ic.created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(limit, offset);

      const result = await this.pool.query(dataQuery, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Failed to get connections'));
      }
      const connections = (result.value?.rows ?? []).map(row => this.mapRowToConnection(row));

      return Result.ok({ connections, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list connections'));
    }
  }

  /**
   * Get a specific connection
   */
  async getConnection(tenantId: string, connectionId: string): Promise<Result<IntegrationConnection>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM integration_connections WHERE id = $1 AND tenant_id = $2`,
        [connectionId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connection not found'));
      }

      return Result.ok(this.mapRowToConnection(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connection'));
    }
  }

  /**
   * Update a connection
   */
  async updateConnection(
    tenantId: string,
    connectionId: string,
    input: UpdateConnectionInput
  ): Promise<Result<IntegrationConnection>> {
    try {
      const existingResult = await this.getConnection(tenantId, connectionId);
      if (existingResult.isFailure) {
        return existingResult;
      }

      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        values.push(input.name);
        paramIndex++;
      }

      if (input.settings !== undefined) {
        updates.push(`settings = $${paramIndex}`);
        values.push(JSON.stringify({ ...existingResult.value.settings, ...input.settings }));
        paramIndex++;
      }

      if (input.entity_mappings !== undefined) {
        updates.push(`entity_mappings = $${paramIndex}`);
        values.push(JSON.stringify(input.entity_mappings));
        paramIndex++;
      }

      if (updates.length === 0) {
        return existingResult;
      }

      updates.push(`updated_at = NOW()`);
      values.push(connectionId, tenantId);

      const result = await this.pool.query(
        `UPDATE integration_connections
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to update connection'));
      }

      return Result.ok(this.mapRowToConnection(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update connection'));
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(tenantId: string, connectionId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `DELETE FROM integration_connections WHERE id = $1 AND tenant_id = $2 RETURNING id`,
        [connectionId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connection not found'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete connection'));
    }
  }

  /**
   * Update connection status
   */
  async updateConnectionStatus(
    tenantId: string,
    connectionId: string,
    status: ConnectionStatus,
    error?: string
  ): Promise<Result<IntegrationConnection>> {
    try {
      const result = await this.pool.query(
        `UPDATE integration_connections
         SET status = $1, last_error = $2, updated_at = NOW()
         WHERE id = $3 AND tenant_id = $4
         RETURNING *`,
        [status, error || null, connectionId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connection not found'));
      }

      return Result.ok(this.mapRowToConnection(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update connection status'));
    }
  }

  /**
   * Test a connection
   */
  async testConnection(tenantId: string, connectionId: string): Promise<Result<{ success: boolean; message: string }>> {
    try {
      const connectionResult = await this.getConnection(tenantId, connectionId);
      if (connectionResult.isFailure) {
        return Result.fail(connectionResult.error);
      }

      // In production, this would actually test the connection to the third-party service
      // For now, we'll simulate a successful test
      await this.updateConnectionStatus(tenantId, connectionId, 'connected');

      return Result.ok({ success: true, message: 'Connection test successful' });
    } catch (error) {
      await this.updateConnectionStatus(tenantId, connectionId, 'error', String(error));
      return Result.fail(error instanceof Error ? error : new Error('Connection test failed'));
    }
  }

  /**
   * Start a sync job
   */
  async startSync(
    tenantId: string,
    connectionId: string,
    options: { type: 'full' | 'incremental' | 'entity'; entity_type?: string }
  ): Promise<Result<SyncJob>> {
    try {
      const connectionResult = await this.getConnection(tenantId, connectionId);
      if (connectionResult.isFailure) {
        return Result.fail(connectionResult.error);
      }

      const connection = connectionResult.value;

      const result = await this.pool.query(
        `INSERT INTO integration_sync_jobs (
          tenant_id, connection_id, connector_slug, type, entity_type, status, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
        RETURNING *`,
        [tenantId, connectionId, connection.connector_slug, options.type, options.entity_type || null, 'running']
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to start sync'));
      }

      const job = this.mapRowToSyncJob(result.value.rows[0]);

      // In production, this would trigger actual sync processing
      // Simulate sync completion
      setTimeout(async () => {
        await this.completeSyncJob(job.id, {
          total_records: Math.floor(Math.random() * 100) + 10,
          processed_records: Math.floor(Math.random() * 100) + 10,
          success_count: Math.floor(Math.random() * 90) + 5,
          error_count: Math.floor(Math.random() * 5),
          percentage: 100,
        });
      }, 2000);

      return Result.ok(job);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to start sync'));
    }
  }

  /**
   * Complete a sync job
   */
  private async completeSyncJob(
    jobId: string,
    progress: { total_records: number; processed_records: number; success_count: number; error_count: number; percentage: number }
  ): Promise<void> {
    await this.pool.query(
      `UPDATE integration_sync_jobs
       SET status = 'completed', progress = $1, completed_at = NOW()
       WHERE id = $2`,
      [JSON.stringify(progress), jobId]
    );
  }

  /**
   * Get sync jobs for a connection
   */
  async getSyncJobs(
    tenantId: string,
    connectionId: string,
    options: { status?: string; limit?: number } = {}
  ): Promise<Result<SyncJob[]>> {
    try {
      let query = `SELECT * FROM integration_sync_jobs WHERE tenant_id = $1 AND connection_id = $2`;
      const params: unknown[] = [tenantId, connectionId];
      let paramIndex = 3;

      if (options.status) {
        query += ` AND status = $${paramIndex}`;
        params.push(options.status);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC`;

      if (options.limit) {
        query += ` LIMIT $${paramIndex}`;
        params.push(options.limit);
      }

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }
      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToSyncJob(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get sync jobs'));
    }
  }

  /**
   * Get a specific sync job
   */
  async getSyncJob(jobId: string): Promise<Result<SyncJob>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM integration_sync_jobs WHERE id = $1`,
        [jobId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Sync job not found'));
      }

      return Result.ok(this.mapRowToSyncJob(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get sync job'));
    }
  }

  /**
   * Cancel a sync job
   */
  async cancelSyncJob(tenantId: string, jobId: string): Promise<Result<SyncJob>> {
    try {
      const result = await this.pool.query(
        `UPDATE integration_sync_jobs
         SET status = 'cancelled', completed_at = NOW()
         WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'running')
         RETURNING *`,
        [jobId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Sync job not found or cannot be cancelled'));
      }

      return Result.ok(this.mapRowToSyncJob(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to cancel sync job'));
    }
  }

  /**
   * Record a webhook event
   */
  async recordWebhookEvent(
    connectorSlug: string,
    connectionId: string,
    eventType: string,
    payload: Record<string, unknown>,
    headers: Record<string, string>
  ): Promise<Result<IntegrationWebhookEvent>> {
    try {
      // Get tenant from connection
      const connectionResult = await this.pool.query(
        `SELECT tenant_id FROM integration_connections WHERE id = $1`,
        [connectionId]
      );

      if (connectionResult.isFailure) {
        return Result.fail(connectionResult.error || new Error('Failed to get connection'));
      }

      const tenantId = connectionResult.value?.rows?.[0]?.tenant_id;

      const result = await this.pool.query(
        `INSERT INTO integration_webhook_events (
          tenant_id, connection_id, connector_slug, event_type, payload, headers, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [tenantId, connectionId, connectorSlug, eventType, JSON.stringify(payload), JSON.stringify(headers), 'pending']
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to record webhook event'));
      }

      return Result.ok(this.mapRowToWebhookEvent(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to record webhook event'));
    }
  }

  /**
   * Get connection statistics
   */
  async getConnectionStats(tenantId: string, connectionId: string): Promise<Result<{
    total_syncs: number;
    successful_syncs: number;
    failed_syncs: number;
    last_sync_at?: Date;
    total_records_synced: number;
  }>> {
    try {
      const result = await this.pool.query(
        `SELECT
          COUNT(*) as total_syncs,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_syncs,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_syncs,
          MAX(completed_at) as last_sync_at,
          COALESCE(SUM((progress->>'processed_records')::int), 0) as total_records_synced
         FROM integration_sync_jobs
         WHERE tenant_id = $1 AND connection_id = $2`,
        [tenantId, connectionId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const row = result.value?.rows?.[0] ?? {};
      return Result.ok({
        total_syncs: parseInt(row.total_syncs || '0'),
        successful_syncs: parseInt(row.successful_syncs || '0'),
        failed_syncs: parseInt(row.failed_syncs || '0'),
        last_sync_at: row.last_sync_at ? new Date(row.last_sync_at) : undefined,
        total_records_synced: parseInt(row.total_records_synced || '0'),
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get connection stats'));
    }
  }

  /**
   * Update entity mappings for a connection
   */
  async updateEntityMappings(
    tenantId: string,
    connectionId: string,
    mappings: EntityMappingConfig[]
  ): Promise<Result<IntegrationConnection>> {
    try {
      const result = await this.pool.query(
        `UPDATE integration_connections
         SET entity_mappings = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [JSON.stringify(mappings), connectionId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connection not found'));
      }

      return Result.ok(this.mapRowToConnection(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update entity mappings'));
    }
  }

  /**
   * Reconnect with new credentials
   */
  async reconnect(
    tenantId: string,
    connectionId: string,
    credentials: DecryptedCredentials
  ): Promise<Result<IntegrationConnection>> {
    try {
      const encryptedCredentials = this.encryptCredentials(credentials);

      const result = await this.pool.query(
        `UPDATE integration_connections
         SET credentials_encrypted = $1, status = 'connected', last_error = NULL, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3
         RETURNING *`,
        [encryptedCredentials, connectionId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Connection not found'));
      }

      return Result.ok(this.mapRowToConnection(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to reconnect'));
    }
  }

  /**
   * Get OAuth URL for a connector
   */
  async getOAuthUrl(
    connectorSlug: string,
    redirectUri: string,
    state?: string
  ): Promise<Result<{ url: string; state: string }>> {
    try {
      const connectorResult = await this.getConnectorBySlug(connectorSlug);
      if (connectorResult.isFailure) {
        return Result.fail(connectorResult.error);
      }

      const connector = connectorResult.value;
      if (connector.auth_type !== 'oauth2') {
        return Result.fail(new Error('Connector does not support OAuth'));
      }

      const generatedState = state || `${connectorSlug}_${Date.now()}`;

      // In production, this would generate actual OAuth URLs
      const url = `https://oauth.example.com/authorize?` +
        `client_id=placeholder&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${generatedState}&` +
        `scope=${(connector.oauth_config?.scopes || []).join(' ')}`;

      return Result.ok({ url, state: generatedState });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to generate OAuth URL'));
    }
  }

  /**
   * Exchange OAuth code for tokens
   */
  async exchangeOAuthCode(
    connectorSlug: string,
    code: string,
    redirectUri: string
  ): Promise<Result<DecryptedCredentials>> {
    try {
      const connectorResult = await this.getConnectorBySlug(connectorSlug);
      if (connectorResult.isFailure) {
        return Result.fail(connectorResult.error);
      }

      // In production, this would exchange the code with the OAuth provider
      // Simulated response
      const credentials: DecryptedCredentials = {
        oauth: {
          access_token: `access_${crypto.randomUUID()}`,
          refresh_token: `refresh_${crypto.randomUUID()}`,
          expires_at: new Date(Date.now() + 3600000),
        },
      };

      return Result.ok(credentials);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to exchange OAuth code'));
    }
  }

  // Helper methods

  private encryptCredentials(credentials: DecryptedCredentials): string {
    // In production, use proper encryption (e.g., AES-256-GCM)
    return Buffer.from(JSON.stringify(credentials)).toString('base64');
  }

  private decryptCredentials(encrypted: string): DecryptedCredentials {
    return JSON.parse(Buffer.from(encrypted, 'base64').toString('utf-8'));
  }

  private mapRowToConnector(row: Record<string, unknown>): IntegrationConnectorDefinition {
    return {
      id: row.id as string,
      name: row.name as string,
      slug: row.slug as string,
      description: row.description as string,
      category: row.category as IntegrationCategory,
      icon_url: row.icon_url as string,
      website_url: row.website_url as string,
      documentation_url: row.documentation_url as string,
      auth_type: row.auth_type as string,
      oauth_config: row.oauth_config as Record<string, unknown>,
      supported_features: (row.supported_features as unknown[]) ?? [],
      entity_mappings: (row.entity_mappings as unknown[]) ?? [],
      webhook_config: row.webhook_config as Record<string, unknown>,
      rate_limits: row.rate_limits as Record<string, unknown>,
      is_premium: row.is_premium as boolean,
      is_enabled: row.is_enabled as boolean,
      created_at: new Date(row.created_at as string),
    };
  }

  private mapRowToConnection(row: Record<string, unknown>): IntegrationConnection {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      connector_id: row.connector_id as string,
      connector_slug: row.connector_slug as string,
      name: row.name as string,
      status: row.status as ConnectionStatus,
      auth_type: row.auth_type as string,
      credentials: {
        encrypted_data: row.credentials_encrypted as string,
        encryption_version: row.encryption_version as string,
      },
      settings: row.settings as Record<string, unknown>,
      entity_mappings: (row.entity_mappings as EntityMappingConfig[]) ?? [],
      sync_config: row.sync_config as Record<string, unknown>,
      last_sync_at: row.last_sync_at ? new Date(row.last_sync_at as string) : undefined,
      last_error: row.last_error as string | undefined,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      created_by: row.created_by as string,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }

  private mapRowToSyncJob(row: Record<string, unknown>): SyncJob {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      connection_id: row.connection_id as string,
      connector_slug: row.connector_slug as string,
      type: row.type as 'full' | 'incremental' | 'entity',
      entity_type: row.entity_type as string | undefined,
      status: row.status as SyncJob['status'],
      progress: (row.progress as SyncJob['progress']) ?? {
        total_records: 0,
        processed_records: 0,
        success_count: 0,
        error_count: 0,
        percentage: 0,
      },
      started_at: row.started_at ? new Date(row.started_at as string) : undefined,
      completed_at: row.completed_at ? new Date(row.completed_at as string) : undefined,
      error: row.error as string | undefined,
      results: row.results as SyncJob['results'],
    };
  }

  private mapRowToWebhookEvent(row: Record<string, unknown>): IntegrationWebhookEvent {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      connection_id: row.connection_id as string,
      connector_slug: row.connector_slug as string,
      event_type: row.event_type as string,
      payload: row.payload as Record<string, unknown>,
      received_at: new Date(row.received_at as string),
      processed_at: row.processed_at ? new Date(row.processed_at as string) : undefined,
      status: row.status as IntegrationWebhookEvent['status'],
      error: row.error as string | undefined,
    };
  }
}

/**
 * Factory function
 */
export function createIntegrationConnectorService(pool: DatabasePool): IntegrationConnectorService {
  return new IntegrationConnectorService(pool);
}
