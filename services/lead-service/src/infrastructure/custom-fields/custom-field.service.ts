/**
 * Custom Fields & Metadata Service
 * Manages custom field definitions, values, and validation
 * NOW WITH REAL DATABASE QUERIES
 */
import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  CustomFieldDefinition,
  CustomFieldValue,
  CreateCustomFieldInput,
  UpdateCustomFieldInput,
  CustomFieldEntity,
  ValidationResult,
  ValidationError,
  ValidationRule,
  FieldGroup,
  FieldLayout,
  FieldStatistics,
  FieldMigrationRequest,
  SelectOption,
} from './types';

@injectable()
export class CustomFieldService {
  constructor(@inject(DatabasePool) private readonly pool: DatabasePool) {}

  /**
   * Create a new custom field definition
   */
  async createField(
    tenantId: string,
    userId: string,
    input: CreateCustomFieldInput
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      // Validate API name format
      if (!this.isValidApiName(input.api_name)) {
        return Result.fail(new Error('API name must be lowercase with underscores, starting with a letter'));
      }

      // Check for duplicate API name
      const existingCheck = await this.pool.query(
        `SELECT id FROM custom_field_definitions
         WHERE tenant_id = $1 AND entity_type = $2 AND api_name = $3`,
        [tenantId, input.entity_type, input.api_name]
      );

      if (existingCheck.isFailure) {
        return Result.fail(existingCheck.error || new Error('Database query failed'));
      }

      if ((existingCheck.value?.rows?.length ?? 0) > 0) {
        return Result.fail(new Error(`Field with API name '${input.api_name}' already exists`));
      }

      // Get next sort order
      const sortOrderResult = await this.pool.query(
        `SELECT COALESCE(MAX(sort_order), -1) + 1 as next_order
         FROM custom_field_definitions
         WHERE tenant_id = $1 AND entity_type = $2`,
        [tenantId, input.entity_type]
      );

      if (sortOrderResult.isFailure) {
        return Result.fail(sortOrderResult.error || new Error('Failed to get sort order'));
      }
      const sortOrder = sortOrderResult.value?.rows?.[0]?.next_order ?? 0;

      // Insert into database
      const result = await this.pool.query(
        `INSERT INTO custom_field_definitions (
          tenant_id, entity_type, api_name, display_name, description,
          field_type, is_required, is_unique, is_searchable, is_filterable,
          is_sortable, is_readonly, is_system, is_active, default_value,
          placeholder, help_text, validation_rules, select_options,
          formula_config, rollup_config, lookup_config, autonumber_config,
          visibility_condition, field_group, sort_order, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19,
          $20, $21, $22, $23, $24, $25, $26, $27
        ) RETURNING *`,
        [
          tenantId,
          input.entity_type,
          input.api_name,
          input.display_name,
          input.description || null,
          input.field_type,
          input.is_required ?? false,
          input.is_unique ?? false,
          input.is_searchable ?? false,
          input.is_filterable ?? false,
          input.is_sortable ?? false,
          input.is_readonly ?? false,
          false, // is_system
          true, // is_active
          input.default_value ? JSON.stringify(input.default_value) : null,
          input.placeholder || null,
          input.help_text || null,
          JSON.stringify(input.validation_rules ?? []),
          JSON.stringify(input.select_options ?? []),
          input.formula_config ? JSON.stringify(input.formula_config) : null,
          input.rollup_config ? JSON.stringify(input.rollup_config) : null,
          input.lookup_config ? JSON.stringify(input.lookup_config) : null,
          input.autonumber_config ? JSON.stringify(input.autonumber_config) : null,
          input.visibility_condition ? JSON.stringify(input.visibility_condition) : null,
          input.field_group || null,
          sortOrder,
          userId,
        ]
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to insert custom field'));
      }

      return Result.ok(this.mapRowToField(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create custom field'));
    }
  }

  /**
   * Update a custom field definition
   */
  async updateField(
    tenantId: string,
    fieldId: string,
    input: UpdateCustomFieldInput
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      // Check if field exists and is not a system field
      const existingResult = await this.pool.query(
        `SELECT * FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2`,
        [fieldId, tenantId]
      );

      if (existingResult.isFailure) {
        return Result.fail(existingResult.error || new Error('Database query failed'));
      }

      const rows = existingResult.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Field not found'));
      }

      const existing = rows[0];
      if (existing.is_system) {
        return Result.fail(new Error('Cannot modify system fields'));
      }

      // Build dynamic update query
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      const addUpdate = (field: string, value: unknown) => {
        if (value !== undefined) {
          updates.push(`${field} = $${paramIndex}`);
          values.push(typeof value === 'object' ? JSON.stringify(value) : value);
          paramIndex++;
        }
      };

      addUpdate('display_name', input.display_name);
      addUpdate('description', input.description);
      addUpdate('is_required', input.is_required);
      addUpdate('is_searchable', input.is_searchable);
      addUpdate('is_filterable', input.is_filterable);
      addUpdate('is_sortable', input.is_sortable);
      addUpdate('is_readonly', input.is_readonly);
      addUpdate('is_active', input.is_active);
      addUpdate('default_value', input.default_value);
      addUpdate('placeholder', input.placeholder);
      addUpdate('help_text', input.help_text);
      addUpdate('validation_rules', input.validation_rules);
      addUpdate('select_options', input.select_options);
      addUpdate('formula_config', input.formula_config);
      addUpdate('visibility_condition', input.visibility_condition);
      addUpdate('field_group', input.field_group);
      addUpdate('sort_order', input.sort_order);

      if (updates.length === 0) {
        return Result.ok(this.mapRowToField(existing));
      }

      updates.push(`updated_at = NOW()`);
      values.push(fieldId, tenantId);

      const result = await this.pool.query(
        `UPDATE custom_field_definitions
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
         RETURNING *`,
        values
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to update custom field'));
      }

      return Result.ok(this.mapRowToField(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update custom field'));
    }
  }

  /**
   * Delete a custom field
   */
  async deleteField(tenantId: string, fieldId: string): Promise<Result<void>> {
    try {
      // Check if field exists and is not a system field
      const existingResult = await this.pool.query(
        `SELECT is_system FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2`,
        [fieldId, tenantId]
      );

      if (existingResult.isFailure) {
        return Result.fail(existingResult.error || new Error('Database query failed'));
      }

      const rows = existingResult.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Field not found'));
      }

      if (rows[0].is_system) {
        return Result.fail(new Error('Cannot delete system fields'));
      }

      // Delete field (cascade will delete values)
      await this.pool.query(
        `DELETE FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2`,
        [fieldId, tenantId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete custom field'));
    }
  }

  /**
   * Get field by ID
   */
  async getFieldById(tenantId: string, fieldId: string): Promise<Result<CustomFieldDefinition>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM custom_field_definitions WHERE id = $1 AND tenant_id = $2`,
        [fieldId, tenantId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Field not found'));
      }

      return Result.ok(this.mapRowToField(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get field'));
    }
  }

  /**
   * Get field by API name
   */
  async getFieldByApiName(
    tenantId: string,
    entityType: CustomFieldEntity,
    apiName: string
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM custom_field_definitions
         WHERE tenant_id = $1 AND entity_type = $2 AND api_name = $3`,
        [tenantId, entityType, apiName]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Field not found'));
      }

      return Result.ok(this.mapRowToField(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Field not found'));
    }
  }

  /**
   * Get all fields for an entity type
   */
  async getFieldsForEntity(
    tenantId: string,
    entityType: CustomFieldEntity,
    includeInactive: boolean = false
  ): Promise<Result<CustomFieldDefinition[]>> {
    try {
      const query = includeInactive
        ? `SELECT * FROM custom_field_definitions
           WHERE tenant_id = $1 AND entity_type = $2
           ORDER BY sort_order ASC`
        : `SELECT * FROM custom_field_definitions
           WHERE tenant_id = $1 AND entity_type = $2 AND is_active = true
           ORDER BY sort_order ASC`;

      const result = await this.pool.query(query, [tenantId, entityType]);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToField(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get fields'));
    }
  }

  /**
   * Set custom field values for an entity
   */
  async setFieldValues(
    tenantId: string,
    entityType: CustomFieldEntity,
    entityId: string,
    values: Record<string, unknown>
  ): Promise<Result<CustomFieldValue[]>> {
    try {
      // Get field definitions
      const fieldsResult = await this.getFieldsForEntity(tenantId, entityType);
      if (fieldsResult.isFailure) {
        return Result.fail(fieldsResult.error);
      }

      const fields = fieldsResult.value;
      const fieldMap = new Map(fields.map(f => [f.api_name, f]));

      // Validate values
      const validationResult = await this.validateValues(tenantId, entityType, values);
      if (!validationResult.is_valid) {
        return Result.fail(new Error(`Validation failed: ${validationResult.errors.map(e => e.message).join(', ')}`));
      }

      const storedValues: CustomFieldValue[] = [];

      for (const [apiName, value] of Object.entries(values)) {
        const field = fieldMap.get(apiName);
        if (!field) continue;

        const displayValue = this.formatDisplayValue(value, field);

        // Upsert value
        const result = await this.pool.query(
          `INSERT INTO custom_field_values (
            tenant_id, entity_type, entity_id, field_id, field_api_name, value, display_value
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (tenant_id, entity_type, entity_id, field_id)
          DO UPDATE SET value = $6, display_value = $7, updated_at = NOW()
          RETURNING *`,
          [tenantId, entityType, entityId, field.id, apiName, JSON.stringify(value), displayValue]
        );

        if (result.isFailure || !result.value?.rows?.[0]) {
          continue;
        }
        storedValues.push(this.mapRowToValue(result.value.rows[0]));
      }

      return Result.ok(storedValues);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to set field values'));
    }
  }

  /**
   * Get custom field values for an entity
   */
  async getFieldValues(
    tenantId: string,
    entityType: CustomFieldEntity,
    entityId: string
  ): Promise<Result<Record<string, unknown>>> {
    try {
      const result = await this.pool.query(
        `SELECT field_api_name, value FROM custom_field_values
         WHERE tenant_id = $1 AND entity_type = $2 AND entity_id = $3`,
        [tenantId, entityType, entityId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      const values: Record<string, unknown> = {};
      for (const row of rows) {
        values[row.field_api_name] = row.value;
      }

      return Result.ok(values);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get field values'));
    }
  }

  /**
   * Validate field values
   */
  async validateValues(
    tenantId: string,
    entityType: CustomFieldEntity,
    values: Record<string, unknown>
  ): Promise<ValidationResult> {
    const errors: ValidationError[] = [];

    const fieldsResult = await this.getFieldsForEntity(tenantId, entityType);
    if (fieldsResult.isFailure) {
      return { is_valid: false, errors: [{ field_api_name: '', rule_type: 'custom', message: 'Failed to load field definitions' }] };
    }

    const fields = fieldsResult.value;
    const fieldMap = new Map(fields.map(f => [f.api_name, f]));

    // Check required fields
    for (const field of fields) {
      if (field.is_required && field.is_active) {
        const value = values[field.api_name];
        if (value === undefined || value === null || value === '') {
          errors.push({
            field_api_name: field.api_name,
            rule_type: 'required',
            message: `${field.display_name} is required`,
          });
        }
      }
    }

    // Validate each provided value
    for (const [apiName, value] of Object.entries(values)) {
      const field = fieldMap.get(apiName);
      if (!field) continue;

      // Type validation
      const typeError = this.validateType(value, field);
      if (typeError) {
        errors.push(typeError);
        continue;
      }

      // Rule validation
      for (const rule of field.validation_rules) {
        const ruleError = this.validateRule(value, rule, field);
        if (ruleError) {
          errors.push(ruleError);
        }
      }
    }

    return { is_valid: errors.length === 0, errors };
  }

  /**
   * Add option to select field
   */
  async addSelectOption(
    tenantId: string,
    fieldId: string,
    option: SelectOption
  ): Promise<Result<CustomFieldDefinition>> {
    try {
      const fieldResult = await this.getFieldById(tenantId, fieldId);
      if (fieldResult.isFailure) {
        return Result.fail(fieldResult.error);
      }

      const field = fieldResult.value;
      if (field.field_type !== 'select' && field.field_type !== 'multiselect') {
        return Result.fail(new Error('Field is not a select type'));
      }

      const options = field.select_options ?? [];

      // Check for duplicate value
      if (options.some(o => o.value === option.value)) {
        return Result.fail(new Error(`Option with value '${option.value}' already exists`));
      }

      // Add option
      option.sort_order = option.sort_order ?? options.length;
      option.is_active = option.is_active ?? true;
      options.push(option);

      return this.updateField(tenantId, fieldId, { select_options: options });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add select option'));
    }
  }

  /**
   * Create field group
   */
  async createFieldGroup(
    tenantId: string,
    entityType: CustomFieldEntity,
    name: string,
    options: { description?: string; is_collapsible?: boolean; is_collapsed_by_default?: boolean }
  ): Promise<Result<FieldGroup>> {
    try {
      const result = await this.pool.query(
        `INSERT INTO custom_field_groups (
          tenant_id, entity_type, name, description, is_collapsible, is_collapsed_by_default
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *`,
        [
          tenantId,
          entityType,
          name,
          options.description || null,
          options.is_collapsible ?? true,
          options.is_collapsed_by_default ?? false,
        ]
      );

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to create field group'));
      }

      return Result.ok(this.mapRowToGroup(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create field group'));
    }
  }

  /**
   * Get field groups for entity
   */
  async getFieldGroups(
    tenantId: string,
    entityType: CustomFieldEntity
  ): Promise<Result<FieldGroup[]>> {
    try {
      const result = await this.pool.query(
        `SELECT * FROM custom_field_groups
         WHERE tenant_id = $1 AND entity_type = $2
         ORDER BY sort_order ASC`,
        [tenantId, entityType]
      );

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToGroup(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get field groups'));
    }
  }

  /**
   * Get field statistics
   */
  async getFieldStatistics(
    tenantId: string,
    fieldId: string
  ): Promise<Result<FieldStatistics>> {
    try {
      // Get fill statistics
      const statsResult = await this.pool.query(
        `SELECT
          COUNT(*) as total_records,
          COUNT(CASE WHEN value IS NOT NULL AND value::text != 'null' THEN 1 END) as filled_records
         FROM custom_field_values
         WHERE tenant_id = $1 AND field_id = $2`,
        [tenantId, fieldId]
      );

      if (statsResult.isFailure) {
        return Result.fail(statsResult.error || new Error('Database query failed'));
      }

      const statsRows = statsResult.value?.rows ?? [];
      const totalRecords = parseInt(statsRows[0]?.total_records || '0');
      const filledRecords = parseInt(statsRows[0]?.filled_records || '0');

      // Get top values
      const topValuesResult = await this.pool.query(
        `SELECT value, COUNT(*) as count
         FROM custom_field_values
         WHERE tenant_id = $1 AND field_id = $2 AND value IS NOT NULL
         GROUP BY value
         ORDER BY count DESC
         LIMIT 10`,
        [tenantId, fieldId]
      );

      if (topValuesResult.isFailure) {
        return Result.fail(topValuesResult.error || new Error('Failed to get top values'));
      }

      const topValuesRows = topValuesResult.value?.rows ?? [];

      const stats: FieldStatistics = {
        field_id: fieldId,
        total_records: totalRecords,
        filled_records: filledRecords,
        fill_rate: totalRecords > 0 ? (filledRecords / totalRecords) * 100 : 0,
        unique_values: topValuesRows.length,
        top_values: topValuesRows.map(row => ({
          value: row.value,
          count: parseInt(row.count),
        })),
        last_updated: new Date(),
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get field statistics'));
    }
  }

  /**
   * Migrate field values
   */
  async migrateFieldValues(
    tenantId: string,
    request: FieldMigrationRequest
  ): Promise<Result<{ migrated_count: number; skipped_count: number; errors: string[] }>> {
    try {
      const errors: string[] = [];
      let migratedCount = 0;
      let skippedCount = 0;

      // Get source values
      const sourceValues = await this.pool.query(
        `SELECT * FROM custom_field_values
         WHERE tenant_id = $1 AND field_id = $2`,
        [tenantId, request.source_field_id]
      );

      if (sourceValues.isFailure) {
        return Result.fail(sourceValues.error || new Error('Failed to get source values'));
      }

      const sourceRows = sourceValues.value?.rows ?? [];
      for (const row of sourceRows) {
        try {
          let newValue = row.value;

          // Apply transformation
          if (request.transformation === 'uppercase' && typeof newValue === 'string') {
            newValue = newValue.toUpperCase();
          } else if (request.transformation === 'lowercase' && typeof newValue === 'string') {
            newValue = newValue.toLowerCase();
          }

          // Apply value mapping
          if (request.value_mapping && request.value_mapping[String(newValue)] !== undefined) {
            newValue = request.value_mapping[String(newValue)];
          } else if (request.value_mapping && request.default_for_unmapped !== undefined) {
            newValue = request.default_for_unmapped;
          }

          // Insert/update target
          await this.pool.query(
            `INSERT INTO custom_field_values (
              tenant_id, entity_type, entity_id, field_id, field_api_name, value
            )
            SELECT $1, entity_type, entity_id, $2,
              (SELECT api_name FROM custom_field_definitions WHERE id = $2),
              $3
            FROM custom_field_values WHERE id = $4
            ON CONFLICT (tenant_id, entity_type, entity_id, field_id)
            DO UPDATE SET value = $3, updated_at = NOW()`,
            [tenantId, request.target_field_id, JSON.stringify(newValue), row.id]
          );

          migratedCount++;
        } catch (err) {
          skippedCount++;
          errors.push(`Failed to migrate value for entity ${row.entity_id}: ${err}`);
        }
      }

      return Result.ok({ migrated_count: migratedCount, skipped_count: skippedCount, errors });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to migrate field values'));
    }
  }

  /**
   * Export field definitions
   */
  async exportFieldDefinitions(
    tenantId: string,
    entityType?: CustomFieldEntity
  ): Promise<Result<CustomFieldDefinition[]>> {
    try {
      const query = entityType
        ? `SELECT * FROM custom_field_definitions
           WHERE tenant_id = $1 AND entity_type = $2
           ORDER BY entity_type, sort_order`
        : `SELECT * FROM custom_field_definitions
           WHERE tenant_id = $1
           ORDER BY entity_type, sort_order`;

      const params = entityType ? [tenantId, entityType] : [tenantId];
      const result = await this.pool.query(query, params);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      return Result.ok(rows.map(row => this.mapRowToField(row)));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to export field definitions'));
    }
  }

  /**
   * Import field definitions
   */
  async importFieldDefinitions(
    tenantId: string,
    userId: string,
    definitions: CreateCustomFieldInput[]
  ): Promise<Result<{ imported: number; skipped: number; errors: Array<{ api_name: string; error: string }> }>> {
    try {
      let imported = 0;
      let skipped = 0;
      const errors: Array<{ api_name: string; error: string }> = [];

      for (const def of definitions) {
        const result = await this.createField(tenantId, userId, def);
        if (result.isSuccess) {
          imported++;
        } else {
          skipped++;
          errors.push({ api_name: def.api_name, error: result.error.message });
        }
      }

      return Result.ok({ imported, skipped, errors });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to import field definitions'));
    }
  }

  /**
   * Calculate formula field value
   */
  async calculateFormula(
    tenantId: string,
    fieldId: string,
    entityValues: Record<string, unknown>
  ): Promise<Result<unknown>> {
    try {
      const fieldResult = await this.getFieldById(tenantId, fieldId);
      if (fieldResult.isFailure) {
        return Result.fail(fieldResult.error);
      }

      const field = fieldResult.value;
      if (field.field_type !== 'formula' || !field.formula_config) {
        return Result.fail(new Error('Field is not a formula type'));
      }

      // Parse and evaluate formula
      const result = this.evaluateFormula(field.formula_config.expression, entityValues);

      return Result.ok(result);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to calculate formula'));
    }
  }

  // Private helper methods

  private isValidApiName(apiName: string): boolean {
    return /^[a-z][a-z0-9_]*$/.test(apiName);
  }

  private mapRowToField(row: Record<string, unknown>): CustomFieldDefinition {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      entity_type: row.entity_type as CustomFieldEntity,
      api_name: row.api_name as string,
      display_name: row.display_name as string,
      description: row.description as string | undefined,
      field_type: row.field_type as string,
      is_required: row.is_required as boolean,
      is_unique: row.is_unique as boolean,
      is_searchable: row.is_searchable as boolean,
      is_filterable: row.is_filterable as boolean,
      is_sortable: row.is_sortable as boolean,
      is_readonly: row.is_readonly as boolean,
      is_system: row.is_system as boolean,
      is_active: row.is_active as boolean,
      default_value: row.default_value,
      placeholder: row.placeholder as string | undefined,
      help_text: row.help_text as string | undefined,
      validation_rules: (row.validation_rules as ValidationRule[]) ?? [],
      select_options: row.select_options as SelectOption[] | undefined,
      formula_config: row.formula_config as CustomFieldDefinition['formula_config'],
      rollup_config: row.rollup_config as CustomFieldDefinition['rollup_config'],
      lookup_config: row.lookup_config as CustomFieldDefinition['lookup_config'],
      autonumber_config: row.autonumber_config as CustomFieldDefinition['autonumber_config'],
      visibility_condition: row.visibility_condition as CustomFieldDefinition['visibility_condition'],
      field_group: row.field_group as string | undefined,
      sort_order: row.sort_order as number,
      created_by: row.created_by as string,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }

  private mapRowToValue(row: Record<string, unknown>): CustomFieldValue {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      entity_type: row.entity_type as CustomFieldEntity,
      entity_id: row.entity_id as string,
      field_id: row.field_id as string,
      field_api_name: row.field_api_name as string,
      value: row.value,
      display_value: row.display_value as string | undefined,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }

  private mapRowToGroup(row: Record<string, unknown>): FieldGroup {
    return {
      id: row.id as string,
      tenant_id: row.tenant_id as string,
      entity_type: row.entity_type as CustomFieldEntity,
      name: row.name as string,
      description: row.description as string | undefined,
      is_collapsible: row.is_collapsible as boolean,
      is_collapsed_by_default: row.is_collapsed_by_default as boolean,
      sort_order: row.sort_order as number,
      created_at: new Date(row.created_at as string),
      updated_at: new Date(row.updated_at as string),
    };
  }

  private formatDisplayValue(value: unknown, field: CustomFieldDefinition): string {
    if (value === null || value === undefined) {
      return '';
    }

    switch (field.field_type) {
      case 'select':
      case 'radio':
        const option = field.select_options?.find(o => o.value === value);
        return option?.label ?? String(value);

      case 'multiselect':
      case 'checkbox':
        if (Array.isArray(value)) {
          return value
            .map(v => field.select_options?.find(o => o.value === v)?.label ?? v)
            .join(', ');
        }
        return String(value);

      case 'currency':
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(value));

      case 'percentage':
        return `${value}%`;

      case 'date':
        return new Date(value as string).toLocaleDateString();

      case 'datetime':
        return new Date(value as string).toLocaleString();

      case 'boolean':
        return value ? 'Yes' : 'No';

      default:
        return String(value);
    }
  }

  private validateType(value: unknown, field: CustomFieldDefinition): ValidationError | null {
    if (value === null || value === undefined) {
      return null;
    }

    switch (field.field_type) {
      case 'number':
      case 'decimal':
      case 'currency':
      case 'percentage':
        if (typeof value !== 'number' && isNaN(Number(value))) {
          return {
            field_api_name: field.api_name,
            rule_type: 'custom',
            message: `${field.display_name} must be a number`,
            actual_value: value,
          };
        }
        break;

      case 'boolean':
        if (typeof value !== 'boolean') {
          return {
            field_api_name: field.api_name,
            rule_type: 'custom',
            message: `${field.display_name} must be a boolean`,
            actual_value: value,
          };
        }
        break;

      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return {
            field_api_name: field.api_name,
            rule_type: 'email',
            message: `${field.display_name} must be a valid email`,
            actual_value: value,
          };
        }
        break;

      case 'url':
        try {
          new URL(value as string);
        } catch {
          return {
            field_api_name: field.api_name,
            rule_type: 'url',
            message: `${field.display_name} must be a valid URL`,
            actual_value: value,
          };
        }
        break;
    }

    return null;
  }

  private validateRule(value: unknown, rule: ValidationRule, field: CustomFieldDefinition): ValidationError | null {
    if (value === null || value === undefined) {
      return null;
    }

    const strValue = String(value);

    switch (rule.type) {
      case 'min_length':
        if (strValue.length < (rule.value as number)) {
          return {
            field_api_name: field.api_name,
            rule_type: rule.type,
            message: rule.message ?? `${field.display_name} must be at least ${rule.value} characters`,
            actual_value: strValue.length,
            expected: rule.value,
          };
        }
        break;

      case 'max_length':
        if (strValue.length > (rule.value as number)) {
          return {
            field_api_name: field.api_name,
            rule_type: rule.type,
            message: rule.message ?? `${field.display_name} must be at most ${rule.value} characters`,
            actual_value: strValue.length,
            expected: rule.value,
          };
        }
        break;

      case 'min_value':
        if (Number(value) < (rule.value as number)) {
          return {
            field_api_name: field.api_name,
            rule_type: rule.type,
            message: rule.message ?? `${field.display_name} must be at least ${rule.value}`,
            actual_value: value,
            expected: rule.value,
          };
        }
        break;

      case 'max_value':
        if (Number(value) > (rule.value as number)) {
          return {
            field_api_name: field.api_name,
            rule_type: rule.type,
            message: rule.message ?? `${field.display_name} must be at most ${rule.value}`,
            actual_value: value,
            expected: rule.value,
          };
        }
        break;

      case 'regex':
        if (!new RegExp(rule.value as string).test(strValue)) {
          return {
            field_api_name: field.api_name,
            rule_type: rule.type,
            message: rule.message ?? `${field.display_name} has invalid format`,
            actual_value: value,
          };
        }
        break;
    }

    return null;
  }

  private evaluateFormula(expression: string, values: Record<string, unknown>): unknown {
    let result = expression;

    for (const [key, value] of Object.entries(values)) {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value ?? 0));
    }

    try {
      if (/^[\d\s+\-*/().]+$/.test(result)) {
        return new Function(`return ${result}`)();
      }
    } catch {
      return null;
    }

    return result;
  }
}

/**
 * Factory function
 */
export function createCustomFieldService(pool: DatabasePool): CustomFieldService {
  return new CustomFieldService(pool);
}
