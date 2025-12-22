/**
 * Workflow Builder Service
 * Visual workflow automation engine with real database persistence
 */
import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  WorkflowDefinition,
  WorkflowExecution,
  NodeExecution,
  WorkflowNode,
  WorkflowConnection,
  WorkflowStatus,
  ExecutionStatus,
  CreateWorkflowInput,
  UpdateWorkflowInput,
  TriggerWorkflowInput,
  WorkflowValidationResult,
  WorkflowValidationError,
  WorkflowValidationWarning,
  WorkflowStats,
  WorkflowSettings,
  WorkflowVariable,
  DEFAULT_WORKFLOW_TEMPLATES,
} from './types';

interface WorkflowDefinitionRow {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  category: string | null;
  tags: string[] | null;
  status: string;
  version: number;
  nodes: unknown;
  connections: unknown;
  variables: unknown;
  settings: unknown;
  stats: unknown;
  created_by: string | null;
  created_at: Date;
  updated_at: Date;
  published_at: Date | null;
  last_run_at: Date | null;
}

interface WorkflowExecutionRow {
  id: string;
  tenant_id: string;
  workflow_id: string;
  workflow_version: number;
  status: string;
  trigger_type: string;
  trigger_data: unknown;
  context: unknown;
  current_node_id: string | null;
  node_executions: unknown;
  started_at: Date;
  completed_at: Date | null;
  error: string | null;
  result: unknown;
}

@injectable()
export class WorkflowBuilderService {
  constructor(@inject(DatabasePool) private readonly pool: DatabasePool) {}

  // Helper to map DB row to WorkflowDefinition
  private mapRowToWorkflow(row: WorkflowDefinitionRow): WorkflowDefinition {
    const defaultStats: WorkflowStats = {
      total_executions: 0,
      successful_executions: 0,
      failed_executions: 0,
      avg_execution_time_ms: 0,
      last_7_days_executions: 0,
    };

    const defaultSettings: WorkflowSettings = {
      max_concurrent_executions: 100,
      execution_timeout_minutes: 60,
      retry_failed_nodes: true,
      log_level: 'standard',
      notification_on_failure: true,
    };

    return {
      id: row.id,
      tenant_id: row.tenant_id,
      name: row.name,
      description: row.description ?? undefined,
      category: row.category ?? undefined,
      tags: row.tags ?? [],
      status: row.status as WorkflowStatus,
      version: row.version,
      nodes: (row.nodes as WorkflowNode[]) ?? [],
      connections: (row.connections as WorkflowConnection[]) ?? [],
      variables: (row.variables as WorkflowVariable[]) ?? [],
      settings: { ...defaultSettings, ...(row.settings as Partial<WorkflowSettings>) },
      stats: { ...defaultStats, ...(row.stats as Partial<WorkflowStats>) },
      created_by: row.created_by ?? '',
      created_at: row.created_at,
      updated_at: row.updated_at,
      published_at: row.published_at ?? undefined,
      last_run_at: row.last_run_at ?? undefined,
    };
  }

  // Helper to map DB row to WorkflowExecution
  private mapRowToExecution(row: WorkflowExecutionRow): WorkflowExecution {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      workflow_id: row.workflow_id,
      workflow_version: row.workflow_version,
      status: row.status as ExecutionStatus,
      trigger_type: row.trigger_type as WorkflowExecution['trigger_type'],
      trigger_data: (row.trigger_data as Record<string, unknown>) ?? {},
      context: (row.context as Record<string, unknown>) ?? {},
      current_node_id: row.current_node_id ?? undefined,
      node_executions: (row.node_executions as NodeExecution[]) ?? [],
      started_at: row.started_at,
      completed_at: row.completed_at ?? undefined,
      error: row.error ?? undefined,
      result: row.result,
    };
  }

  /**
   * Create a new workflow
   */
  async createWorkflow(
    tenantId: string,
    userId: string,
    input: CreateWorkflowInput
  ): Promise<Result<WorkflowDefinition>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const settings: WorkflowSettings = {
        max_concurrent_executions: 100,
        execution_timeout_minutes: 60,
        retry_failed_nodes: true,
        log_level: 'standard',
        notification_on_failure: true,
        ...input.settings,
      };

      const stats: WorkflowStats = {
        total_executions: 0,
        successful_executions: 0,
        failed_executions: 0,
        avg_execution_time_ms: 0,
        last_7_days_executions: 0,
      };

      const query = `
        INSERT INTO workflow_definitions (
          id, tenant_id, name, description, category, tags, status, version,
          nodes, connections, variables, settings, stats, created_by, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        RETURNING *
      `;

      const result = await this.pool.query<WorkflowDefinitionRow>(query, [
        id,
        tenantId,
        input.name,
        input.description ?? null,
        input.category ?? null,
        input.tags ?? [],
        'draft',
        1,
        JSON.stringify(input.nodes ?? []),
        JSON.stringify(input.connections ?? []),
        JSON.stringify(input.variables ?? []),
        JSON.stringify(settings),
        JSON.stringify(stats),
        userId,
        now,
        now,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to create workflow'));
      }

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create workflow'));
    }
  }

  /**
   * Update an existing workflow
   */
  async updateWorkflow(
    tenantId: string,
    workflowId: string,
    input: UpdateWorkflowInput
  ): Promise<Result<WorkflowDefinition>> {
    try {
      const existingResult = await this.getWorkflow(tenantId, workflowId);
      if (existingResult.isFailure) {
        return Result.fail(new Error('Workflow not found'));
      }

      const existing = existingResult.value;
      const newVersion = existing.status === 'active' ? existing.version + 1 : existing.version;

      // If active workflow, save version history first
      if (existing.status === 'active') {
        const versionQuery = `
          INSERT INTO workflow_versions (workflow_id, version, nodes, connections, variables, settings, published_by, created_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          ON CONFLICT (workflow_id, version) DO NOTHING
        `;
        await this.pool.query(versionQuery, [
          workflowId,
          existing.version,
          JSON.stringify(existing.nodes),
          JSON.stringify(existing.connections),
          JSON.stringify(existing.variables),
          JSON.stringify(existing.settings),
          existing.created_by,
        ]);
      }

      const updateQuery = `
        UPDATE workflow_definitions SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          tags = COALESCE($4, tags),
          nodes = COALESCE($5, nodes),
          connections = COALESCE($6, connections),
          variables = COALESCE($7, variables),
          settings = COALESCE($8, settings),
          version = $9,
          updated_at = NOW()
        WHERE id = $10 AND tenant_id = $11
        RETURNING *
      `;

      const result = await this.pool.query<WorkflowDefinitionRow>(updateQuery, [
        input.name ?? null,
        input.description ?? null,
        input.category ?? null,
        input.tags ?? null,
        input.nodes ? JSON.stringify(input.nodes) : null,
        input.connections ? JSON.stringify(input.connections) : null,
        input.variables ? JSON.stringify(input.variables) : null,
        input.settings ? JSON.stringify({ ...existing.settings, ...input.settings }) : null,
        newVersion,
        workflowId,
        tenantId,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to update workflow'));
      }

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update workflow'));
    }
  }

  /**
   * Get a workflow by ID
   */
  async getWorkflow(tenantId: string, workflowId: string): Promise<Result<WorkflowDefinition>> {
    try {
      const query = `SELECT * FROM workflow_definitions WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query<WorkflowDefinitionRow>(query, [workflowId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Workflow not found'));
      }

      return Result.ok(this.mapRowToWorkflow(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Workflow not found'));
    }
  }

  /**
   * List workflows
   */
  async listWorkflows(
    tenantId: string,
    options: {
      status?: WorkflowStatus;
      category?: string;
      search?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ workflows: WorkflowDefinition[]; total: number }>> {
    try {
      const limit = options.limit ?? 20;
      const page = options.page ?? 1;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tenant_id = $1';
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(options.status);
      }

      if (options.category) {
        whereClause += ` AND category = $${paramIndex++}`;
        params.push(options.category);
      }

      if (options.search) {
        whereClause += ` AND (name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${options.search}%`);
        paramIndex++;
      }

      const countQuery = `SELECT COUNT(*) as count FROM workflow_definitions ${whereClause}`;
      const countResult = await this.pool.query<{ count: string }>(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(countResult.error || new Error('Failed to count workflows'));
      }
      const total = parseInt(countResult.value?.rows?.[0]?.count ?? '0', 10);

      const dataQuery = `
        SELECT * FROM workflow_definitions
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(limit, offset);

      const result = await this.pool.query<WorkflowDefinitionRow>(dataQuery, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Failed to list workflows'));
      }
      const workflows = (result.value?.rows ?? []).map((row) => this.mapRowToWorkflow(row));

      return Result.ok({ workflows, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list workflows'));
    }
  }

  /**
   * Activate a workflow
   */
  async activateWorkflow(tenantId: string, workflowId: string): Promise<Result<WorkflowDefinition>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;

      // Validate before activation
      const validation = await this.validateWorkflow(tenantId, workflowId);
      if (!validation.is_valid) {
        return Result.fail(new Error(`Cannot activate: ${validation.errors.map((e) => e.message).join(', ')}`));
      }

      const query = `
        UPDATE workflow_definitions SET
          status = 'active',
          published_at = NOW(),
          updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query<WorkflowDefinitionRow>(query, [workflowId, tenantId]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to activate workflow'));
      }

      // Save version history
      const versionQuery = `
        INSERT INTO workflow_versions (workflow_id, version, nodes, connections, variables, settings, published_by, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (workflow_id, version) DO NOTHING
      `;
      await this.pool.query(versionQuery, [
        workflowId,
        workflow.version,
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.connections),
        JSON.stringify(workflow.variables),
        JSON.stringify(workflow.settings),
        workflow.created_by,
      ]);

      return Result.ok(this.mapRowToWorkflow(result.value.rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to activate workflow'));
    }
  }

  /**
   * Pause a workflow
   */
  async pauseWorkflow(tenantId: string, workflowId: string): Promise<Result<WorkflowDefinition>> {
    try {
      const query = `
        UPDATE workflow_definitions SET status = 'paused', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query<WorkflowDefinitionRow>(query, [workflowId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Workflow not found'));
      }

      return Result.ok(this.mapRowToWorkflow(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to pause workflow'));
    }
  }

  /**
   * Archive a workflow
   */
  async archiveWorkflow(tenantId: string, workflowId: string): Promise<Result<void>> {
    try {
      const query = `
        UPDATE workflow_definitions SET status = 'archived', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [workflowId, tenantId]);

      if (result.rowCount === 0) {
        return Result.fail(new Error('Workflow not found'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to archive workflow'));
    }
  }

  /**
   * Delete a workflow
   */
  async deleteWorkflow(tenantId: string, workflowId: string): Promise<Result<void>> {
    try {
      const query = `DELETE FROM workflow_definitions WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [workflowId, tenantId]);

      if (result.rowCount === 0) {
        return Result.fail(new Error('Workflow not found'));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete workflow'));
    }
  }

  /**
   * Clone a workflow
   */
  async cloneWorkflow(
    tenantId: string,
    workflowId: string,
    userId: string,
    newName?: string
  ): Promise<Result<WorkflowDefinition>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const source = workflowResult.value;

      return this.createWorkflow(tenantId, userId, {
        name: newName ?? `${source.name} (Copy)`,
        description: source.description,
        category: source.category,
        tags: source.tags,
        nodes: source.nodes,
        connections: source.connections,
        variables: source.variables,
        settings: source.settings,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to clone workflow'));
    }
  }

  /**
   * Validate a workflow
   */
  async validateWorkflow(tenantId: string, workflowId: string): Promise<WorkflowValidationResult> {
    const errors: WorkflowValidationError[] = [];
    const warnings: WorkflowValidationWarning[] = [];

    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return {
          is_valid: false,
          errors: [{ code: 'NOT_FOUND', message: 'Workflow not found' }],
          warnings: [],
        };
      }

      const workflow = workflowResult.value;

      // Check for trigger node
      const triggerNodes = workflow.nodes.filter((n) => n.type === 'trigger');
      if (triggerNodes.length === 0) {
        errors.push({
          code: 'NO_TRIGGER',
          message: 'Workflow must have at least one trigger node',
        });
      }

      // Check for end node
      const endNodes = workflow.nodes.filter((n) => n.type === 'end');
      if (endNodes.length === 0) {
        warnings.push({
          code: 'NO_END_NODE',
          message: 'Workflow should have an end node for clarity',
        });
      }

      // Check all nodes are connected
      const connectedNodeIds = new Set<string>();
      for (const conn of workflow.connections) {
        connectedNodeIds.add(conn.source_node_id);
        connectedNodeIds.add(conn.target_node_id);
      }

      for (const node of workflow.nodes) {
        if (node.type !== 'trigger' && !connectedNodeIds.has(node.id)) {
          errors.push({
            node_id: node.id,
            code: 'ORPHAN_NODE',
            message: `Node "${node.name}" is not connected to the workflow`,
          });
        }
      }

      // Check for circular references
      if (this.hasCircularReference(workflow)) {
        errors.push({
          code: 'CIRCULAR_REFERENCE',
          message: 'Workflow contains circular references (infinite loops)',
        });
      }

      // Validate individual nodes
      for (const node of workflow.nodes) {
        const nodeErrors = this.validateNode(node);
        errors.push(...nodeErrors);
      }

      // Check for unreachable nodes
      const reachableNodes = this.findReachableNodes(workflow);
      for (const node of workflow.nodes) {
        if (!reachableNodes.has(node.id) && node.type !== 'trigger') {
          warnings.push({
            node_id: node.id,
            code: 'UNREACHABLE_NODE',
            message: `Node "${node.name}" cannot be reached from any trigger`,
          });
        }
      }

      return {
        is_valid: errors.length === 0,
        errors,
        warnings,
      };
    } catch (error) {
      return {
        is_valid: false,
        errors: [{ code: 'VALIDATION_ERROR', message: 'Failed to validate workflow' }],
        warnings: [],
      };
    }
  }

  /**
   * Trigger a workflow execution
   */
  async triggerWorkflow(
    tenantId: string,
    workflowId: string,
    input: TriggerWorkflowInput
  ): Promise<Result<WorkflowExecution>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;

      if (workflow.status !== 'active') {
        return Result.fail(new Error('Workflow is not active'));
      }

      const id = crypto.randomUUID();
      const now = new Date();

      const triggerData = {
        ...input.context,
        entity_id: input.target_entity_id,
        entity_type: input.target_entity_type,
      };

      const query = `
        INSERT INTO workflow_executions (
          id, tenant_id, workflow_id, workflow_version, status, trigger_type,
          trigger_data, context, node_executions, started_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.pool.query<WorkflowExecutionRow>(query, [
        id,
        tenantId,
        workflowId,
        workflow.version,
        'running',
        'manual',
        JSON.stringify(triggerData),
        JSON.stringify(input.context ?? {}),
        JSON.stringify([]),
        now,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail(result.error || new Error('Failed to trigger workflow'));
      }

      const execution = this.mapRowToExecution(result.value.rows[0]);

      // Update workflow last_run_at
      await this.pool.query(
        `UPDATE workflow_definitions SET last_run_at = NOW() WHERE id = $1`,
        [workflowId]
      );

      // Process execution asynchronously (would use a queue in production)
      this.processExecution(workflow, execution).catch(console.error);

      return Result.ok(execution);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to trigger workflow'));
    }
  }

  /**
   * Get workflow execution
   */
  async getExecution(tenantId: string, executionId: string): Promise<Result<WorkflowExecution>> {
    try {
      const query = `SELECT * FROM workflow_executions WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query<WorkflowExecutionRow>(query, [executionId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Database query failed'));
      }

      const rows = result.value?.rows ?? [];
      if (rows.length === 0) {
        return Result.fail(new Error('Execution not found'));
      }

      return Result.ok(this.mapRowToExecution(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Execution not found'));
    }
  }

  /**
   * List workflow executions
   */
  async listExecutions(
    tenantId: string,
    workflowId: string,
    options: {
      status?: ExecutionStatus;
      from_date?: Date;
      to_date?: Date;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ executions: WorkflowExecution[]; total: number }>> {
    try {
      const limit = options.limit ?? 20;
      const page = options.page ?? 1;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tenant_id = $1 AND workflow_id = $2';
      const params: unknown[] = [tenantId, workflowId];
      let paramIndex = 3;

      if (options.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        params.push(options.status);
      }

      if (options.from_date) {
        whereClause += ` AND started_at >= $${paramIndex++}`;
        params.push(options.from_date);
      }

      if (options.to_date) {
        whereClause += ` AND started_at <= $${paramIndex++}`;
        params.push(options.to_date);
      }

      const countQuery = `SELECT COUNT(*) as count FROM workflow_executions ${whereClause}`;
      const countResult = await this.pool.query<{ count: string }>(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(countResult.error || new Error('Failed to count executions'));
      }
      const total = parseInt(countResult.value?.rows?.[0]?.count ?? '0', 10);

      const dataQuery = `
        SELECT * FROM workflow_executions
        ${whereClause}
        ORDER BY started_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;
      params.push(limit, offset);

      const result = await this.pool.query<WorkflowExecutionRow>(dataQuery, params);
      if (result.isFailure) {
        return Result.fail(result.error || new Error('Failed to list executions'));
      }
      const executions = (result.value?.rows ?? []).map((row) => this.mapRowToExecution(row));

      return Result.ok({ executions, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list executions'));
    }
  }

  /**
   * Cancel an execution
   */
  async cancelExecution(tenantId: string, executionId: string): Promise<Result<void>> {
    try {
      const query = `
        UPDATE workflow_executions SET status = 'cancelled', completed_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status IN ('pending', 'running', 'waiting')
      `;

      const result = await this.pool.query(query, [executionId, tenantId]);

      if (result.rowCount === 0) {
        return Result.fail(new Error('Execution not found or already completed'));
      }

      // Remove any delayed executions
      await this.pool.query(
        `DELETE FROM workflow_delayed_executions WHERE execution_id = $1`,
        [executionId]
      );

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to cancel execution'));
    }
  }

  /**
   * Get workflow templates
   */
  async getTemplates(): Promise<Result<Partial<WorkflowDefinition>[]>> {
    return Result.ok(DEFAULT_WORKFLOW_TEMPLATES);
  }

  /**
   * Create workflow from template
   */
  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateIndex: number,
    name?: string
  ): Promise<Result<WorkflowDefinition>> {
    try {
      if (templateIndex < 0 || templateIndex >= DEFAULT_WORKFLOW_TEMPLATES.length) {
        return Result.fail(new Error('Invalid template index'));
      }

      const template = DEFAULT_WORKFLOW_TEMPLATES[templateIndex];

      return this.createWorkflow(tenantId, userId, {
        name: name ?? template.name ?? 'New Workflow',
        description: template.description,
        category: template.category,
        tags: template.tags,
        nodes: template.nodes,
        connections: template.connections,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create from template'));
    }
  }

  /**
   * Add a node to workflow
   */
  async addNode(
    tenantId: string,
    workflowId: string,
    node: Omit<WorkflowNode, 'id'>
  ): Promise<Result<WorkflowNode>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;
      const newNode: WorkflowNode = {
        ...node,
        id: crypto.randomUUID(),
      };

      workflow.nodes.push(newNode);

      const query = `
        UPDATE workflow_definitions SET nodes = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;

      await this.pool.query(query, [JSON.stringify(workflow.nodes), workflowId, tenantId]);

      return Result.ok(newNode);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add node'));
    }
  }

  /**
   * Update a node
   */
  async updateNode(
    tenantId: string,
    workflowId: string,
    nodeId: string,
    updates: Partial<WorkflowNode>
  ): Promise<Result<WorkflowNode>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;
      const nodeIndex = workflow.nodes.findIndex((n) => n.id === nodeId);

      if (nodeIndex === -1) {
        return Result.fail(new Error('Node not found'));
      }

      workflow.nodes[nodeIndex] = {
        ...workflow.nodes[nodeIndex],
        ...updates,
        id: nodeId, // Preserve ID
      };

      const query = `
        UPDATE workflow_definitions SET nodes = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;

      await this.pool.query(query, [JSON.stringify(workflow.nodes), workflowId, tenantId]);

      return Result.ok(workflow.nodes[nodeIndex]);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update node'));
    }
  }

  /**
   * Delete a node
   */
  async deleteNode(tenantId: string, workflowId: string, nodeId: string): Promise<Result<void>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;

      // Remove node
      workflow.nodes = workflow.nodes.filter((n) => n.id !== nodeId);

      // Remove connections to/from this node
      workflow.connections = workflow.connections.filter(
        (c) => c.source_node_id !== nodeId && c.target_node_id !== nodeId
      );

      const query = `
        UPDATE workflow_definitions SET nodes = $1, connections = $2, updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4
      `;

      await this.pool.query(query, [
        JSON.stringify(workflow.nodes),
        JSON.stringify(workflow.connections),
        workflowId,
        tenantId,
      ]);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete node'));
    }
  }

  /**
   * Add a connection between nodes
   */
  async addConnection(
    tenantId: string,
    workflowId: string,
    connection: Omit<WorkflowConnection, 'id'>
  ): Promise<Result<WorkflowConnection>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;

      // Validate nodes exist
      const sourceNode = workflow.nodes.find((n) => n.id === connection.source_node_id);
      const targetNode = workflow.nodes.find((n) => n.id === connection.target_node_id);

      if (!sourceNode || !targetNode) {
        return Result.fail(new Error('Source or target node not found'));
      }

      const newConnection: WorkflowConnection = {
        ...connection,
        id: crypto.randomUUID(),
      };

      workflow.connections.push(newConnection);

      const query = `
        UPDATE workflow_definitions SET connections = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;

      await this.pool.query(query, [JSON.stringify(workflow.connections), workflowId, tenantId]);

      return Result.ok(newConnection);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to add connection'));
    }
  }

  /**
   * Delete a connection
   */
  async deleteConnection(tenantId: string, workflowId: string, connectionId: string): Promise<Result<void>> {
    try {
      const workflowResult = await this.getWorkflow(tenantId, workflowId);
      if (workflowResult.isFailure) {
        return Result.fail(workflowResult.error);
      }

      const workflow = workflowResult.value;
      workflow.connections = workflow.connections.filter((c) => c.id !== connectionId);

      const query = `
        UPDATE workflow_definitions SET connections = $1, updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;

      await this.pool.query(query, [JSON.stringify(workflow.connections), workflowId, tenantId]);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete connection'));
    }
  }

  /**
   * Get workflow statistics
   */
  async getWorkflowStats(
    tenantId: string,
    workflowId: string,
    dateRange?: { from: Date; to: Date }
  ): Promise<
    Result<{
      total_executions: number;
      successful_executions: number;
      failed_executions: number;
      avg_execution_time_ms: number;
      executions_by_day: Array<{ date: string; count: number }>;
      top_failure_reasons: Array<{ reason: string; count: number }>;
    }>
  > {
    try {
      let dateCondition = '';
      const params: unknown[] = [tenantId, workflowId];
      let paramIndex = 3;

      if (dateRange) {
        dateCondition = ` AND started_at >= $${paramIndex++} AND started_at <= $${paramIndex++}`;
        params.push(dateRange.from, dateRange.to);
      }

      // Get overall stats
      const statsQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as successful,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          AVG(EXTRACT(EPOCH FROM (completed_at - started_at)) * 1000) FILTER (WHERE completed_at IS NOT NULL) as avg_time
        FROM workflow_executions
        WHERE tenant_id = $1 AND workflow_id = $2 ${dateCondition}
      `;

      const statsResult = await this.pool.query<{
        total: string;
        successful: string;
        failed: string;
        avg_time: string | null;
      }>(statsQuery, params);

      if (statsResult.isFailure) {
        return Result.fail(statsResult.error || new Error('Failed to get workflow stats'));
      }

      const stats = statsResult.value?.rows?.[0] ?? { total: '0', successful: '0', failed: '0', avg_time: null };

      // Get executions by day (last 30 days)
      const byDayQuery = `
        SELECT
          DATE(started_at) as date,
          COUNT(*) as count
        FROM workflow_executions
        WHERE tenant_id = $1 AND workflow_id = $2 AND started_at >= NOW() - INTERVAL '30 days'
        GROUP BY DATE(started_at)
        ORDER BY date DESC
        LIMIT 30
      `;

      const byDayResult = await this.pool.query<{ date: string; count: string }>(byDayQuery, [tenantId, workflowId]);

      if (byDayResult.isFailure) {
        return Result.fail(byDayResult.error || new Error('Failed to get executions by day'));
      }

      // Get top failure reasons
      const failuresQuery = `
        SELECT
          COALESCE(error, 'Unknown error') as reason,
          COUNT(*) as count
        FROM workflow_executions
        WHERE tenant_id = $1 AND workflow_id = $2 AND status = 'failed'
        GROUP BY error
        ORDER BY count DESC
        LIMIT 10
      `;

      const failuresResult = await this.pool.query<{ reason: string; count: string }>(failuresQuery, [
        tenantId,
        workflowId,
      ]);

      if (failuresResult.isFailure) {
        return Result.fail(failuresResult.error || new Error('Failed to get failure reasons'));
      }

      const byDayRows = byDayResult.value?.rows ?? [];
      const failuresRows = failuresResult.value?.rows ?? [];

      return Result.ok({
        total_executions: parseInt(stats.total ?? '0', 10),
        successful_executions: parseInt(stats.successful ?? '0', 10),
        failed_executions: parseInt(stats.failed ?? '0', 10),
        avg_execution_time_ms: parseFloat(stats.avg_time ?? '0'),
        executions_by_day: byDayRows.map((r) => ({
          date: r.date,
          count: parseInt(r.count, 10),
        })),
        top_failure_reasons: failuresRows.map((r) => ({
          reason: r.reason,
          count: parseInt(r.count, 10),
        })),
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get stats'));
    }
  }

  /**
   * Get version history
   */
  async getVersionHistory(
    tenantId: string,
    workflowId: string
  ): Promise<
    Result<
      Array<{
        version: number;
        nodes: WorkflowNode[];
        connections: WorkflowConnection[];
        published_by: string | null;
        created_at: Date;
      }>
    >
  > {
    try {
      // First verify the workflow exists and belongs to tenant
      const checkQuery = `SELECT id FROM workflow_definitions WHERE id = $1 AND tenant_id = $2`;
      const checkResult = await this.pool.query(checkQuery, [workflowId, tenantId]);

      if (checkResult.isFailure || !checkResult.value?.rows?.length) {
        return Result.fail(new Error('Workflow not found'));
      }

      const query = `
        SELECT version, nodes, connections, published_by, created_at
        FROM workflow_versions
        WHERE workflow_id = $1
        ORDER BY version DESC
      `;

      const result = await this.pool.query<{
        version: number;
        nodes: unknown;
        connections: unknown;
        published_by: string | null;
        created_at: Date;
      }>(query, [workflowId]);

      if (result.isFailure) {
        return Result.fail(result.error || new Error('Failed to get version history'));
      }

      const rows = result.value?.rows ?? [];

      return Result.ok(
        rows.map((row) => ({
          version: row.version,
          nodes: row.nodes as WorkflowNode[],
          connections: row.connections as WorkflowConnection[],
          published_by: row.published_by,
          created_at: row.created_at,
        }))
      );
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get version history'));
    }
  }

  /**
   * Restore from version
   */
  async restoreVersion(tenantId: string, workflowId: string, version: number): Promise<Result<WorkflowDefinition>> {
    try {
      // Get the version to restore
      const versionQuery = `
        SELECT nodes, connections, variables, settings
        FROM workflow_versions
        WHERE workflow_id = $1 AND version = $2
      `;

      const versionResult = await this.pool.query<{
        nodes: unknown;
        connections: unknown;
        variables: unknown;
        settings: unknown;
      }>(versionQuery, [workflowId, version]);

      if (versionResult.isFailure || !versionResult.value?.rows?.length) {
        return Result.fail(new Error('Version not found'));
      }

      const versionData = versionResult.value.rows[0];

      // Update the workflow
      return this.updateWorkflow(tenantId, workflowId, {
        nodes: versionData.nodes as WorkflowNode[],
        connections: versionData.connections as WorkflowConnection[],
        variables: versionData.variables as WorkflowVariable[],
        settings: versionData.settings as Partial<WorkflowSettings>,
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to restore version'));
    }
  }

  // Private helper methods

  private hasCircularReference(workflow: WorkflowDefinition): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (nodeId: string): boolean => {
      visited.add(nodeId);
      recursionStack.add(nodeId);

      const outgoingConnections = workflow.connections.filter((c) => c.source_node_id === nodeId);

      for (const conn of outgoingConnections) {
        if (!visited.has(conn.target_node_id)) {
          if (dfs(conn.target_node_id)) {
            return true;
          }
        } else if (recursionStack.has(conn.target_node_id)) {
          return true;
        }
      }

      recursionStack.delete(nodeId);
      return false;
    };

    for (const node of workflow.nodes) {
      if (!visited.has(node.id)) {
        if (dfs(node.id)) {
          return true;
        }
      }
    }

    return false;
  }

  private findReachableNodes(workflow: WorkflowDefinition): Set<string> {
    const reachable = new Set<string>();
    const triggerNodes = workflow.nodes.filter((n) => n.type === 'trigger');

    const bfs = (startId: string) => {
      const queue = [startId];
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (reachable.has(nodeId)) continue;
        reachable.add(nodeId);

        const outgoing = workflow.connections.filter((c) => c.source_node_id === nodeId);
        for (const conn of outgoing) {
          if (!reachable.has(conn.target_node_id)) {
            queue.push(conn.target_node_id);
          }
        }
      }
    };

    for (const trigger of triggerNodes) {
      bfs(trigger.id);
    }

    return reachable;
  }

  private validateNode(node: WorkflowNode): WorkflowValidationError[] {
    const errors: WorkflowValidationError[] = [];

    if (!node.name) {
      errors.push({
        node_id: node.id,
        code: 'MISSING_NAME',
        message: 'Node must have a name',
      });
    }

    if (node.type === 'trigger' && !node.trigger_config) {
      errors.push({
        node_id: node.id,
        code: 'MISSING_TRIGGER_CONFIG',
        message: 'Trigger node must have trigger configuration',
      });
    }

    if (node.type === 'action' && !node.action_config) {
      errors.push({
        node_id: node.id,
        code: 'MISSING_ACTION_CONFIG',
        message: 'Action node must have action configuration',
      });
    }

    if (node.type === 'condition' && !node.condition) {
      errors.push({
        node_id: node.id,
        code: 'MISSING_CONDITION',
        message: 'Condition node must have a condition defined',
      });
    }

    if (node.type === 'delay' && !node.delay_config) {
      errors.push({
        node_id: node.id,
        code: 'MISSING_DELAY_CONFIG',
        message: 'Delay node must have delay configuration',
      });
    }

    return errors;
  }

  private async processExecution(workflow: WorkflowDefinition, execution: WorkflowExecution): Promise<void> {
    try {
      // In a real implementation, this would:
      // 1. Find the trigger node
      // 2. Execute each node in sequence following connections
      // 3. Handle conditions, delays, splits, etc.
      // 4. Update execution status as it progresses

      // For now, simulate quick completion
      const nodeExecutions: NodeExecution[] = [];
      const now = new Date();

      for (const node of workflow.nodes) {
        nodeExecutions.push({
          node_id: node.id,
          node_type: node.type,
          status: 'completed',
          started_at: now,
          completed_at: now,
        });
      }

      // Update execution with results
      const updateQuery = `
        UPDATE workflow_executions SET
          status = 'completed',
          node_executions = $1,
          completed_at = NOW()
        WHERE id = $2
      `;

      await this.pool.query(updateQuery, [JSON.stringify(nodeExecutions), execution.id]);

      // Update workflow stats
      await this.pool.query(
        `
        UPDATE workflow_definitions SET
          stats = jsonb_set(
            jsonb_set(stats, '{total_executions}', ((stats->>'total_executions')::int + 1)::text::jsonb),
            '{successful_executions}', ((stats->>'successful_executions')::int + 1)::text::jsonb
          )
        WHERE id = $1
      `,
        [workflow.id]
      );
    } catch (error) {
      // Mark execution as failed
      await this.pool.query(
        `UPDATE workflow_executions SET status = 'failed', error = $1, completed_at = NOW() WHERE id = $2`,
        [error instanceof Error ? error.message : 'Unknown error', execution.id]
      );

      // Update workflow failure stats
      await this.pool.query(
        `
        UPDATE workflow_definitions SET
          stats = jsonb_set(
            jsonb_set(stats, '{total_executions}', ((stats->>'total_executions')::int + 1)::text::jsonb),
            '{failed_executions}', ((stats->>'failed_executions')::int + 1)::text::jsonb
          )
        WHERE id = $1
      `,
        [workflow.id]
      );
    }
  }
}

/**
 * Factory function
 */
export function createWorkflowBuilderService(pool: DatabasePool): WorkflowBuilderService {
  return new WorkflowBuilderService(pool);
}
