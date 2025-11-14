import type { Config } from 'drizzle-kit';
import { config } from 'dotenv';

config();

export default {
  schema: './src/infrastructure/database/schema.ts',
  out: './drizzle',
  driver: 'pg',
  dbCredentials: {
    host: process.env.POSTGRES_HOST || 'localhost',
    port: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    user: process.env.POSTGRES_USER || 'dev',
    password: process.env.POSTGRES_PASSWORD || 'dev123',
    database: process.env.POSTGRES_DB || 'leads',
  },
} satisfies Config;
