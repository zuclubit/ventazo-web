import { PoolClient, QueryResultRow } from 'pg';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '../connection';

/**
 * Base repository interface
 * All domain repositories should extend this interface
 */
export interface IRepository<T> {
  findById(id: string): Promise<Result<T | null>>;
  findAll(): Promise<Result<T[]>>;
  save(entity: T): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}

/**
 * Base repository implementation with common database operations
 * Implements the Repository pattern for data access
 */
export abstract class BaseRepository {
  constructor(protected readonly pool: DatabasePool) {}

  /**
   * Execute a query with the pool
   */
  protected async query<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<Result<T[]>> {
    const result = await this.pool.query<T>(text, params);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }
    return Result.ok(result.getValue().rows);
  }

  /**
   * Execute a query and return a single row
   */
  protected async queryOne<T extends QueryResultRow = QueryResultRow>(
    text: string,
    params?: unknown[]
  ): Promise<Result<T | null>> {
    const result = await this.query<T>(text, params);
    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    return Result.ok(rows.length > 0 ? rows[0] : null);
  }

  /**
   * Execute a query within a transaction
   */
  protected async executeInTransaction<T>(
    callback: (client: PoolClient) => Promise<Result<T>>
  ): Promise<Result<T>> {
    return this.pool.transaction(callback);
  }

  /**
   * Check if a record exists
   */
  protected async exists(table: string, id: string): Promise<Result<boolean>> {
    const result = await this.queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM ${table} WHERE id = $1)`,
      [id]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const row = result.getValue();
    return Result.ok(row?.exists ?? false);
  }

  /**
   * Count records in a table
   */
  protected async count(table: string, where?: string, params?: unknown[]): Promise<Result<number>> {
    const query = where
      ? `SELECT COUNT(*) as count FROM ${table} WHERE ${where}`
      : `SELECT COUNT(*) as count FROM ${table}`;

    const result = await this.queryOne<{ count: string }>(query, params);

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const row = result.getValue();
    return Result.ok(row ? parseInt(row.count, 10) : 0);
  }

  /**
   * Build pagination query
   */
  protected buildPaginationQuery(baseQuery: string, page: number, limit: number): string {
    const offset = (page - 1) * limit;
    return `${baseQuery} LIMIT ${limit} OFFSET ${offset}`;
  }

  /**
   * Escape SQL identifier (table/column names)
   */
  protected escapeIdentifier(identifier: string): string {
    return `"${identifier.replace(/"/g, '""')}"`;
  }
}
