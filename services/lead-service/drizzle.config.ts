import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

// Build connection string with proper URL encoding
const buildConnectionString = () => {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const host = process.env.POSTGRES_HOST || 'localhost';
  const port = process.env.POSTGRES_PORT || '5432';
  const user = encodeURIComponent(process.env.POSTGRES_USER || 'dev');
  const password = encodeURIComponent(process.env.POSTGRES_PASSWORD || 'dev123');
  const database = process.env.POSTGRES_DB || 'leads';

  return `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;
};

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    connectionString: buildConnectionString(),
  },
} satisfies Config;
