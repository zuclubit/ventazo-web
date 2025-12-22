/**
 * Zod Schema Utilities
 * Converts Zod schemas to JSON Schema for Fastify validation
 */

import { z } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

/**
 * Convert a Zod schema to JSON Schema format for Fastify
 * Removes $schema property which can cause issues with Fastify
 */
export function toJsonSchema<T extends z.ZodTypeAny>(schema: T): Record<string, unknown> {
  const jsonSchema = zodToJsonSchema(schema, { target: 'jsonSchema7' });
  // Remove $schema property that Fastify doesn't need
  const { $schema, ...rest } = jsonSchema as Record<string, unknown>;
  return rest;
}

/**
 * Common JSON Schema definitions for reuse
 */
export const commonSchemas = {
  uuidParam: {
    type: 'object',
    required: ['id'],
    properties: {
      id: { type: 'string', format: 'uuid' },
    },
  },
  paginationQuery: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
    },
  },
  dateRangeQuery: {
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },
} as const;
