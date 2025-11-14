/**
 * Database configuration interface
 */
export interface DatabaseConfig {
  /** PostgreSQL host */
  host: string;
  /** PostgreSQL port */
  port: number;
  /** Database name */
  database: string;
  /** Database user */
  user: string;
  /** Database password */
  password: string;
  /** SSL configuration */
  ssl?: boolean | { rejectUnauthorized: boolean };
  /** Connection pool size (default: 10) */
  max?: number;
  /** Idle timeout in milliseconds (default: 30000) */
  idleTimeoutMillis?: number;
  /** Connection timeout in milliseconds (default: 5000) */
  connectionTimeoutMillis?: number;
  /** Statement timeout in milliseconds (default: 60000) */
  statementTimeout?: number;
}

/**
 * Transaction isolation levels
 */
export enum IsolationLevel {
  READ_UNCOMMITTED = 'READ UNCOMMITTED',
  READ_COMMITTED = 'READ COMMITTED',
  REPEATABLE_READ = 'REPEATABLE READ',
  SERIALIZABLE = 'SERIALIZABLE',
}

/**
 * Transaction options
 */
export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  readOnly?: boolean;
  deferrable?: boolean;
}
