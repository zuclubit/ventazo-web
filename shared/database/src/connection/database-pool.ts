import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';
import { Result } from '@zuclubit/domain';
import { DatabaseConfig, TransactionOptions, IsolationLevel } from '../types';

/**
 * Database connection pool manager
 * Implements connection pooling best practices for PostgreSQL
 */
export class DatabasePool {
  private pool: Pool;
  private isConnected = false;

  constructor(config: DatabaseConfig) {
    const poolConfig: PoolConfig = {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      password: config.password,
      ssl: config.ssl,
      max: config.max || 10, // Maximum pool size
      idleTimeoutMillis: config.idleTimeoutMillis || 30000, // 30 seconds
      connectionTimeoutMillis: config.connectionTimeoutMillis || 5000, // 5 seconds
      statement_timeout: config.statementTimeout || 60000, // 60 seconds
      // Enable keepalive to detect dead connections
      keepAlive: true,
      keepAliveInitialDelayMillis: 10000,
    };

    this.pool = new Pool(poolConfig);

    // Handle pool errors
    this.pool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client:', err);
    });

    // Handle pool connection events
    this.pool.on('connect', () => {
      if (!this.isConnected) {
        console.log('Database pool connected');
        this.isConnected = true;
      }
    });

    this.pool.on('remove', () => {
      console.log('Client removed from pool');
    });
  }

  /**
   * Test database connection
   */
  async connect(): Promise<Result<void>> {
    try {
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();
      this.isConnected = true;
      return Result.ok();
    } catch (error) {
      return Result.fail(
        `Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a query with automatic connection management
   */
  async query<T = unknown>(
    text: string,
    params?: unknown[]
  ): Promise<Result<QueryResult<T>>> {
    try {
      const result = await this.pool.query<T>(text, params);
      return Result.ok(result);
    } catch (error) {
      return Result.fail(
        `Query failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Get a client from the pool for manual transaction management
   */
  async getClient(): Promise<Result<PoolClient>> {
    try {
      const client = await this.pool.connect();
      return Result.ok(client);
    } catch (error) {
      return Result.fail(
        `Failed to get client: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Execute a function within a transaction
   * Automatically handles BEGIN, COMMIT, and ROLLBACK
   */
  async transaction<T>(
    callback: (client: PoolClient) => Promise<Result<T>>,
    options?: TransactionOptions
  ): Promise<Result<T>> {
    const clientResult = await this.getClient();
    if (clientResult.isFailure) {
      return Result.fail(clientResult.error as string);
    }

    const client = clientResult.getValue();

    try {
      // Start transaction with options
      let beginQuery = 'BEGIN';
      if (options?.isolationLevel) {
        beginQuery += ` ISOLATION LEVEL ${options.isolationLevel}`;
      }
      if (options?.readOnly) {
        beginQuery += ' READ ONLY';
      }
      if (options?.deferrable) {
        beginQuery += ' DEFERRABLE';
      }

      await client.query(beginQuery);

      // Execute callback
      const result = await callback(client);

      if (result.isFailure) {
        await client.query('ROLLBACK');
        return result;
      }

      // Commit transaction
      await client.query('COMMIT');
      return result;
    } catch (error) {
      // Rollback on error
      await client.query('ROLLBACK');
      return Result.fail(
        `Transaction failed: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      // Always release client back to pool
      client.release();
    }
  }

  /**
   * Check if pool is connected
   */
  isPoolConnected(): boolean {
    return this.isConnected && this.pool.totalCount > 0;
  }

  /**
   * Get pool statistics
   */
  getPoolStats(): {
    total: number;
    idle: number;
    waiting: number;
  } {
    return {
      total: this.pool.totalCount,
      idle: this.pool.idleCount,
      waiting: this.pool.waitingCount,
    };
  }

  /**
   * Close all connections in the pool
   */
  async close(): Promise<void> {
    await this.pool.end();
    this.isConnected = false;
    console.log('Database pool closed');
  }

  /**
   * Health check query
   */
  async healthCheck(): Promise<Result<boolean>> {
    try {
      const result = await this.query('SELECT 1 as healthy');
      if (result.isFailure) {
        return Result.fail(result.error as string);
      }
      return Result.ok(true);
    } catch (error) {
      return Result.fail(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
