import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { getDatabaseConfig } from '../../config/environment';

export { leads, outboxEvents } from './schema';
export type { LeadRow, NewLeadRow, OutboxEventRow, NewOutboxEventRow } from './schema';

// Create PostgreSQL pool
const config = getDatabaseConfig();
const pool = new Pool({
  host: config.host,
  port: config.port,
  database: config.database,
  user: config.user,
  password: config.password,
  max: config.max,
  // PERFORMANCE: Keep minimum connections warm to avoid cold start latency
  // See: docs/PERFORMANCE_OPTIMIZATION_PLAN_V2.md - Section 1.3
  min: parseInt(process.env.DB_POOL_MIN || '2', 10),
  idleTimeoutMillis: config.idleTimeoutMillis,
  connectionTimeoutMillis: config.connectionTimeoutMillis,
});

// Create drizzle database instance with full schema
export const db = drizzle(pool, { schema });

/**
 * Warmup the connection pool by establishing initial connections
 * PERFORMANCE: Reduces first-query latency by ~100-200ms
 * Should be called during server startup before accepting traffic
 */
export async function warmupPool(): Promise<void> {
  const warmupConnections = parseInt(process.env.DB_POOL_MIN || '2', 10);
  const startTime = Date.now();

  try {
    // Execute simple queries in parallel to establish connections
    const warmupPromises = Array(warmupConnections).fill(null).map(async (_, i) => {
      const client = await pool.connect();
      try {
        await client.query('SELECT 1');
        return { index: i, success: true };
      } finally {
        client.release();
      }
    });

    await Promise.all(warmupPromises);
    const duration = Date.now() - startTime;
    console.log(`[Database] Pool warmed up with ${warmupConnections} connections in ${duration}ms`);
  } catch (error) {
    console.error('[Database] Pool warmup failed:', error);
    // Don't throw - allow server to start even if warmup fails
  }
}

/**
 * Get pool statistics for monitoring
 */
export function getPoolStats() {
  return {
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  };
}
