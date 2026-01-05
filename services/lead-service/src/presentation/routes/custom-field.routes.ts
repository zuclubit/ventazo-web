/**
 * Custom Fields Routes
 * API endpoints for custom field management
 */
import { FastifyInstance } from 'fastify';
import { container } from 'tsyringe';
import { CustomFieldService } from '../../infrastructure/custom-fields';
import { CustomFieldEntity } from '../../infrastructure/custom-fields/types';

export async function customFieldRoutes(fastify: FastifyInstance): Promise<void> {
  const customFieldService = container.resolve(CustomFieldService);

  // List all custom fields
  fastify.get<{
    Querystring: { limit?: number; offset?: number; entity_type?: string };
  }>('/', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          limit: { type: 'number' },
          offset: { type: 'number' },
          entity_type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entity_type, limit = 50, offset = 0 } = request.query;

    // If entity_type specified, get fields for that entity
    if (entity_type) {
      const result = await customFieldService.getFieldsForEntity(
        tenantId,
        entity_type as CustomFieldEntity,
        false
      );

      if (result.isFailure) {
        return reply.status(400).send({ error: result.error.message });
      }

      const fields = result.value || [];
      return reply.send({
        success: true,
        data: fields.slice(offset, offset + limit),
        total: fields.length,
      });
    }

    // Otherwise return empty list (or aggregate across all entity types)
    return reply.send({
      success: true,
      data: [],
      total: 0,
      message: 'Use entity_type query param or /entities/:entityType/fields endpoint',
    });
  });

  // Get all fields for an entity type
  fastify.get<{
    Params: { entityType: string };
    Querystring: { include_inactive?: boolean };
  }>('/entities/:entityType/fields', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
        },
        required: ['entityType'],
      },
      querystring: {
        type: 'object',
        properties: {
          include_inactive: { type: 'boolean' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType } = request.params;
    const includeInactive = request.query.include_inactive ?? false;

    const result = await customFieldService.getFieldsForEntity(
      tenantId,
      entityType as CustomFieldEntity,
      includeInactive
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Create a new custom field
  fastify.post<{
    Body: {
      entity_type: CustomFieldEntity;
      api_name: string;
      display_name: string;
      description?: string;
      field_type: string;
      is_required?: boolean;
      is_unique?: boolean;
      is_searchable?: boolean;
      is_filterable?: boolean;
      is_sortable?: boolean;
      is_readonly?: boolean;
      default_value?: unknown;
      placeholder?: string;
      help_text?: string;
      validation_rules?: unknown[];
      select_options?: unknown[];
      field_group?: string;
    };
  }>('/fields', {
    schema: {
      body: {
        type: 'object',
        properties: {
          entity_type: { type: 'string' },
          api_name: { type: 'string' },
          display_name: { type: 'string' },
          description: { type: 'string' },
          field_type: { type: 'string' },
          is_required: { type: 'boolean' },
          is_unique: { type: 'boolean' },
          is_searchable: { type: 'boolean' },
          is_filterable: { type: 'boolean' },
          is_sortable: { type: 'boolean' },
          is_readonly: { type: 'boolean' },
          default_value: {},
          placeholder: { type: 'string' },
          help_text: { type: 'string' },
          validation_rules: { type: 'array' },
          select_options: { type: 'array' },
          field_group: { type: 'string' },
        },
        required: ['entity_type', 'api_name', 'display_name', 'field_type'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';

    const result = await customFieldService.createField(tenantId, userId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get a specific field
  fastify.get<{
    Params: { fieldId: string };
  }>('/fields/:fieldId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.getFieldById(tenantId, fieldId);

    if (result.isFailure) {
      return reply.status(404).send({ error: 'Field not found' });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Update a field
  fastify.patch<{
    Params: { fieldId: string };
    Body: {
      display_name?: string;
      description?: string;
      is_required?: boolean;
      is_searchable?: boolean;
      is_filterable?: boolean;
      is_sortable?: boolean;
      is_readonly?: boolean;
      is_active?: boolean;
      default_value?: unknown;
      placeholder?: string;
      help_text?: string;
      validation_rules?: unknown[];
      select_options?: unknown[];
      field_group?: string;
      sort_order?: number;
    };
  }>('/fields/:fieldId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
      body: {
        type: 'object',
        properties: {
          display_name: { type: 'string' },
          description: { type: 'string' },
          is_required: { type: 'boolean' },
          is_searchable: { type: 'boolean' },
          is_filterable: { type: 'boolean' },
          is_sortable: { type: 'boolean' },
          is_readonly: { type: 'boolean' },
          is_active: { type: 'boolean' },
          default_value: {},
          placeholder: { type: 'string' },
          help_text: { type: 'string' },
          validation_rules: { type: 'array' },
          select_options: { type: 'array' },
          field_group: { type: 'string' },
          sort_order: { type: 'number' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.updateField(tenantId, fieldId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Delete a field
  fastify.delete<{
    Params: { fieldId: string };
  }>('/fields/:fieldId', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.deleteField(tenantId, fieldId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      message: 'Field deleted successfully',
    });
  });

  // Add select option to field
  fastify.post<{
    Params: { fieldId: string };
    Body: {
      value: string;
      label: string;
      color?: string;
      icon?: string;
      description?: string;
      is_default?: boolean;
      sort_order?: number;
    };
  }>('/fields/:fieldId/options', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
      body: {
        type: 'object',
        properties: {
          value: { type: 'string' },
          label: { type: 'string' },
          color: { type: 'string' },
          icon: { type: 'string' },
          description: { type: 'string' },
          is_default: { type: 'boolean' },
          sort_order: { type: 'number' },
        },
        required: ['value', 'label'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.addSelectOption(tenantId, fieldId, request.body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get field values for an entity
  fastify.get<{
    Params: { entityType: string; entityId: string };
  }>('/entities/:entityType/:entityId/values', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
        },
        required: ['entityType', 'entityId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType, entityId } = request.params;

    const result = await customFieldService.getFieldValues(
      tenantId,
      entityType as CustomFieldEntity,
      entityId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Set field values for an entity
  fastify.put<{
    Params: { entityType: string; entityId: string };
    Body: Record<string, unknown>;
  }>('/entities/:entityType/:entityId/values', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
          entityId: { type: 'string' },
        },
        required: ['entityType', 'entityId'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType, entityId } = request.params;

    const result = await customFieldService.setFieldValues(
      tenantId,
      entityType as CustomFieldEntity,
      entityId,
      request.body
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Validate field values
  fastify.post<{
    Params: { entityType: string };
    Body: Record<string, unknown>;
  }>('/entities/:entityType/validate', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
        },
        required: ['entityType'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType } = request.params;

    const result = await customFieldService.validateValues(
      tenantId,
      entityType as CustomFieldEntity,
      request.body
    );

    return reply.send({
      success: true,
      data: result,
    });
  });

  // Get field groups
  fastify.get<{
    Params: { entityType: string };
  }>('/entities/:entityType/groups', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
        },
        required: ['entityType'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType } = request.params;

    const result = await customFieldService.getFieldGroups(
      tenantId,
      entityType as CustomFieldEntity
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Create field group
  fastify.post<{
    Params: { entityType: string };
    Body: {
      name: string;
      description?: string;
      is_collapsible?: boolean;
      is_collapsed_by_default?: boolean;
    };
  }>('/entities/:entityType/groups', {
    schema: {
      params: {
        type: 'object',
        properties: {
          entityType: { type: 'string' },
        },
        required: ['entityType'],
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          description: { type: 'string' },
          is_collapsible: { type: 'boolean' },
          is_collapsed_by_default: { type: 'boolean' },
        },
        required: ['name'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { entityType } = request.params;

    const result = await customFieldService.createFieldGroup(
      tenantId,
      entityType as CustomFieldEntity,
      request.body.name,
      {
        description: request.body.description,
        is_collapsible: request.body.is_collapsible,
        is_collapsed_by_default: request.body.is_collapsed_by_default,
      }
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.status(201).send({
      success: true,
      data: result.value,
    });
  });

  // Get field statistics
  fastify.get<{
    Params: { fieldId: string };
  }>('/fields/:fieldId/statistics', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.getFieldStatistics(tenantId, fieldId);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Export field definitions
  fastify.get<{
    Querystring: { entity_type?: string };
  }>('/export', {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          entity_type: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const entityType = request.query.entity_type as CustomFieldEntity | undefined;

    const result = await customFieldService.exportFieldDefinitions(tenantId, entityType);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Import field definitions
  fastify.post<{
    Body: {
      definitions: unknown[];
    };
  }>('/import', {
    schema: {
      body: {
        type: 'object',
        properties: {
          definitions: { type: 'array' },
        },
        required: ['definitions'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const userId = request.headers['x-user-id'] as string || 'system';

    const result = await customFieldService.importFieldDefinitions(
      tenantId,
      userId,
      request.body.definitions as any[]
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Migrate field values
  fastify.post<{
    Body: {
      source_field_id: string;
      target_field_id: string;
      transformation?: string;
      value_mapping?: Record<string, unknown>;
      default_for_unmapped?: unknown;
    };
  }>('/migrate', {
    schema: {
      body: {
        type: 'object',
        properties: {
          source_field_id: { type: 'string' },
          target_field_id: { type: 'string' },
          transformation: { type: 'string' },
          value_mapping: { type: 'object' },
          default_for_unmapped: {},
        },
        required: ['source_field_id', 'target_field_id'],
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';

    const result = await customFieldService.migrateFieldValues(tenantId, request.body as any);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: result.value,
    });
  });

  // Calculate formula field
  fastify.post<{
    Params: { fieldId: string };
    Body: Record<string, unknown>;
  }>('/fields/:fieldId/calculate', {
    schema: {
      params: {
        type: 'object',
        properties: {
          fieldId: { type: 'string' },
        },
        required: ['fieldId'],
      },
      body: {
        type: 'object',
        additionalProperties: true,
      },
    },
  }, async (request, reply) => {
    const tenantId = request.headers['x-tenant-id'] as string || 'default';
    const { fieldId } = request.params;

    const result = await customFieldService.calculateFormula(tenantId, fieldId, request.body);

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error.message });
    }

    return reply.send({
      success: true,
      data: { result: result.value },
    });
  });
}
