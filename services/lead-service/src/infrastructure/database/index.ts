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
  idleTimeoutMillis: config.idleTimeoutMillis,
  connectionTimeoutMillis: config.connectionTimeoutMillis,
});

// Create drizzle database instance with full schema
export const db = drizzle(pool, { schema });
