/**
 * Workflow Service
 * Manages workflow definitions and triggers execution
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowExecution,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  ListWorkflowsOptions,
  PaginatedWorkflowsResponse,
  ListExecutionsOptions,
  PaginatedExecutionsResponse,
  TriggerContext,
  WorkflowEntityType,
  WorkflowTriggerType,
} from './types';
import { WorkflowEngine } from './workflow.engine';

/**
 * Workflow Service
 * CRUD operations for workflows and trigger processing
 */
@injectable()
export class WorkflowService {
  private engine: WorkflowEngine;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.engine = new WorkflowEngine(pool);
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    tenantId: string,
    userId: string,
    input: CreateWorkflowInput
  ): Promise<Result<Workflow>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const query = `
        INSERT INTO workflows (
          id, tenant_id, name, description, trigger_config, actions_config,
          is_active, priority, execution_limit, cooldown_minutes,
          created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        input.name,
        input.description || null,
        JSON.stringify(input.trigger),
        JSON.stringify(input.actions),
        input.isActive ?? true,
        input.priority ?? 0,
        input.executionLimit || null,
        input.cooldownMinutes || null,
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to create workflow');
      }

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get workflow by ID
   */
  async getWorkflowById(workflowId: string, tenantId: string): Promise<Result<Workflow | null>> {
    try {
      const query = `
        SELECT * FROM workflows
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      `;

      const result = await this.pool.query(query, [workflowId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch workflow');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update workflow
   */
  async updateWorkflow(
    workflowId: string,
    tenantId: string,
    input: UpdateWorkflowInput
  ): Promise<Result<Workflow>> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }

      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }

      if (input.trigger !== undefined) {
        updates.push(`trigger_config = $${paramIndex++}`);
        values.push(JSON.stringify(input.trigger));
      }

      if (input.actions !== undefined) {
        updates.push(`actions_config = $${paramIndex++}`);
        values.push(JSON.stringify(input.actions));
      }

      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }

      if (input.priority !== undefined) {
        updates.push(`priority = $${paramIndex++}`);
        values.push(input.priority);
      }

      if (input.executionLimit !== undefined) {
        updates.push(`execution_limit = $${paramIndex++}`);
        values.push(input.executionLimit);
      }

      if (input.cooldownMinutes !== undefined) {
        updates.push(`cooldown_minutes = $${paramIndex++}`);
        values.push(input.cooldownMinutes);
      }

      if (updates.length === 0) {
        return this.getWorkflowById(workflowId, tenantId).then(r =>
          r.isSuccess && r.value ? Result.ok(r.value) : Result.fail('Workflow not found')
        );
      }

      updates.push('updated_at = NOW()');

      const query = `
        UPDATE workflows
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex++} AND deleted_at IS NULL
        RETURNING *
      `;

      values.push(workflowId, tenantId);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to update workflow');
      }

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete workflow (soft delete)
   */
  async deleteWorkflow(workflowId: string, tenantId: string): Promise<Result<void>> {
    try {
      const query = `
        UPDATE workflows
        SET deleted_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL
      `;

      await this.pool.query(query, [workflowId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete workflow: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List workflows
   */
  async listWorkflows(
    tenantId: string,
    options: ListWorkflowsOptions
  ): Promise<Result<PaginatedWorkflowsResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1', 'deleted_at IS NULL'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.entityType) {
        conditions.push(`trigger_config->>'entityType' = $${paramIndex++}`);
        values.push(options.entityType);
      }

      if (options.triggerType) {
        conditions.push(`trigger_config->>'type' = $${paramIndex++}`);
        values.push(options.triggerType);
      }

      if (options.isActive !== undefined) {
        conditions.push(`is_active = $${paramIndex++}`);
        values.push(options.isActive);
      }

      if (options.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${options.search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM workflows WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count workflows');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get workflows
      const query = `
        SELECT * FROM workflows
        WHERE ${whereClause}
        ORDER BY priority DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list workflows');
      }

      const workflows = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToWorkflow(row)
      );

      return Result.ok({
        workflows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a trigger event
   */
  async processTrigger(context: TriggerContext): Promise<Result<WorkflowExecution[]>> {
    try {
      // Find matching workflows
      const workflowsResult = await this.findMatchingWorkflows(context);
      if (workflowsResult.isFailure || !workflowsResult.value) {
        return Result.fail(workflowsResult.error || 'Failed to find workflows');
      }

      const workflows = workflowsResult.value;
      const executions: WorkflowExecution[] = [];

      // Execute each matching workflow
      for (const workflow of workflows) {
        // Check cooldown
        if (workflow.cooldownMinutes) {
          const isInCooldown = await this.checkCooldown(workflow.id, context.entityId, workflow.cooldownMinutes);
          if (isInCooldown) {
            continue;
          }
        }

        // Check execution limit
        if (workflow.executionLimit) {
          const executionCount = await this.getExecutionCount(workflow.id);
          if (executionCount >= workflow.executionLimit) {
            continue;
          }
        }

        // Execute workflow
        const executionResult = await this.engine.executeWorkflow(workflow, context);
        if (executionResult.isSuccess && executionResult.value) {
          executions.push(executionResult.value);
        }
      }

      return Result.ok(executions);
    } catch (error) {
      return Result.fail(`Failed to process trigger: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Find workflows matching a trigger context
   */
  private async findMatchingWorkflows(context: TriggerContext): Promise<Result<Workflow[]>> {
    try {
      const query = `
        SELECT * FROM workflows
        WHERE tenant_id = $1
          AND is_active = true
          AND deleted_at IS NULL
          AND trigger_config->>'entityType' = $2
          AND trigger_config->>'type' = $3
        ORDER BY priority DESC
      `;

      const result = await this.pool.query(query, [
        context.tenantId,
        context.entityType,
        context.event,
      ]);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to find workflows');
      }

      // Filter by conditions
      const workflows = result.value.rows
        .map((row: Record<string, unknown>) => this.mapRowToWorkflow(row))
        .filter((workflow) => {
          const conditions = workflow.trigger.conditions;
          if (!conditions || conditions.length === 0) {
            return true;
          }
          return this.engine.evaluateConditions(conditions, context.entity);
        });

      return Result.ok(workflows);
    } catch (error) {
      return Result.fail(`Failed to find workflows: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if workflow is in cooldown period
   */
  private async checkCooldown(
    workflowId: string,
    entityId: string,
    cooldownMinutes: number
  ): Promise<boolean> {
    const query = `
      SELECT id FROM workflow_executions
      WHERE workflow_id = $1
        AND trigger_entity_id = $2
        AND created_at > NOW() - INTERVAL '${cooldownMinutes} minutes'
      LIMIT 1
    `;

    const result = await this.pool.query(query, [workflowId, entityId]);
    return !!(result.isSuccess && result.value?.rows && result.value.rows.length > 0);
  }

  /**
   * Get total execution count for a workflow
   */
  private async getExecutionCount(workflowId: string): Promise<number> {
    const query = `SELECT COUNT(*) as count FROM workflow_executions WHERE workflow_id = $1`;
    const result = await this.pool.query(query, [workflowId]);
    if (result.isSuccess && result.value?.rows?.[0]) {
      return parseInt(result.value.rows[0].count, 10);
    }
    return 0;
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    tenantId: string,
    options: ListExecutionsOptions
  ): Promise<Result<PaginatedExecutionsResponse>> {
    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.workflowId) {
        conditions.push(`workflow_id = $${paramIndex++}`);
        values.push(options.workflowId);
      }

      if (options.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options.entityType) {
        conditions.push(`trigger_entity_type = $${paramIndex++}`);
        values.push(options.entityType);
      }

      if (options.entityId) {
        conditions.push(`trigger_entity_id = $${paramIndex++}`);
        values.push(options.entityId);
      }

      if (options.from) {
        conditions.push(`created_at >= $${paramIndex++}`);
        values.push(options.from);
      }

      if (options.to) {
        conditions.push(`created_at <= $${paramIndex++}`);
        values.push(options.to);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM workflow_executions WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure || !countResult.value) {
        return Result.fail('Failed to count executions');
      }

      const total = parseInt(countResult.value.rows[0]?.total || '0', 10);

      // Get executions
      const query = `
        SELECT * FROM workflow_executions
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list executions');
      }

      const executions = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToExecution(row)
      );

      return Result.ok({
        executions,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list executions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get execution by ID
   */
  async getExecutionById(executionId: string, tenantId: string): Promise<Result<WorkflowExecution | null>> {
    try {
      const query = `
        SELECT * FROM workflow_executions
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [executionId, tenantId]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to fetch execution');
      }

      if (result.value.rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToExecution(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get execution: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map database row to Workflow
   */
  private mapRowToWorkflow(row: Record<string, unknown>): Workflow {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      trigger: typeof row.trigger_config === 'string'
        ? JSON.parse(row.trigger_config)
        : row.trigger_config,
      actions: typeof row.actions_config === 'string'
        ? JSON.parse(row.actions_config)
        : row.actions_config,
      isActive: row.is_active as boolean,
      priority: row.priority as number,
      executionLimit: row.execution_limit as number | undefined,
      cooldownMinutes: row.cooldown_minutes as number | undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      deletedAt: row.deleted_at ? new Date(row.deleted_at as string) : undefined,
    };
  }

  /**
   * Map database row to WorkflowExecution
   */
  private mapRowToExecution(row: Record<string, unknown>): WorkflowExecution {
    return {
      id: row.id as string,
      workflowId: row.workflow_id as string,
      tenantId: row.tenant_id as string,
      triggerEntityType: row.trigger_entity_type as WorkflowEntityType | undefined,
      triggerEntityId: row.trigger_entity_id as string | undefined,
      triggerEvent: row.trigger_event as string,
      triggerData: typeof row.trigger_data === 'string'
        ? JSON.parse(row.trigger_data)
        : row.trigger_data as Record<string, unknown>,
      status: row.status as WorkflowExecution['status'],
      actionsExecuted: typeof row.actions_executed === 'string'
        ? JSON.parse(row.actions_executed)
        : row.actions_executed as WorkflowExecution['actionsExecuted'],
      totalActions: row.total_actions as number,
      completedActions: row.completed_actions as number,
      failedActions: row.failed_actions as number,
      errorMessage: row.error_message as string | undefined,
      errorDetails: row.error_details
        ? (typeof row.error_details === 'string'
          ? JSON.parse(row.error_details)
          : row.error_details as Record<string, unknown>)
        : undefined,
      startedAt: row.started_at ? new Date(row.started_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      durationMs: row.duration_ms as number | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, unknown>,
      createdAt: new Date(row.created_at as string),
    };
  }
}
