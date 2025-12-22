/**
 * Workflow Execution Engine
 * Executes workflow actions based on triggers
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  Workflow,
  WorkflowAction,
  WorkflowExecution,
  TriggerContext,
  ActionExecutionResult,
  WorkflowCondition,
  ConditionOperator,
  SendEmailAction,
  SendNotificationAction,
  SendPushAction,
  CreateTaskAction,
  UpdateFieldAction,
  ChangeStatusAction,
  CreateNoteAction,
  SendWebhookAction,
  DelayAction,
  ConditionAction,
  WorkflowExecutionStatus,
} from './types';
import { NotificationService, NotificationType, NotificationPriority, NotificationChannel } from '../notifications';
import { ResendProvider } from '../email/resend.provider';
import { getResendConfig, getAppConfig } from '../../config/environment';

/**
 * Workflow Execution Engine
 * Processes workflow triggers and executes actions
 */
@injectable()
export class WorkflowEngine {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeEmailProvider();
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
        console.log('[WorkflowEngine] Email provider initialized');
      }
    }
  }

  /**
   * Execute a workflow for a trigger context
   */
  async executeWorkflow(
    workflow: Workflow,
    context: TriggerContext
  ): Promise<Result<WorkflowExecution>> {
    const executionId = uuidv4();
    const startTime = Date.now();

    // Create execution record
    const execution: WorkflowExecution = {
      id: executionId,
      workflowId: workflow.id,
      tenantId: context.tenantId,
      triggerEntityType: context.entityType,
      triggerEntityId: context.entityId,
      triggerEvent: context.event,
      triggerData: context.entity,
      status: 'running',
      actionsExecuted: [],
      totalActions: workflow.actions.length,
      completedActions: 0,
      failedActions: 0,
      startedAt: new Date(),
      metadata: context.metadata || {},
      createdAt: new Date(),
    };

    try {
      // Save initial execution record
      await this.saveExecution(execution);

      // Execute actions sequentially
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const actionResult = await this.executeAction(action, context, i);
        execution.actionsExecuted.push(actionResult);

        if (actionResult.status === 'completed') {
          execution.completedActions++;
        } else if (actionResult.status === 'failed') {
          execution.failedActions++;
          // Stop execution on failure
          execution.status = 'failed';
          execution.errorMessage = actionResult.error;
          break;
        }

        // Update execution progress
        await this.updateExecution(execution);
      }

      // Mark as completed if no failures
      if (execution.status === 'running') {
        execution.status = 'completed';
      }

      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;

      // Save final execution record
      await this.updateExecution(execution);

      return Result.ok(execution);
    } catch (error) {
      execution.status = 'failed';
      execution.errorMessage = error instanceof Error ? error.message : 'Unknown error';
      execution.completedAt = new Date();
      execution.durationMs = Date.now() - startTime;
      await this.updateExecution(execution);

      return Result.fail(`Workflow execution failed: ${execution.errorMessage}`);
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    action: WorkflowAction,
    context: TriggerContext,
    index: number
  ): Promise<ActionExecutionResult> {
    const startTime = Date.now();

    try {
      let result: Record<string, unknown> = {};

      switch (action.type) {
        case 'send_email':
          result = await this.executeSendEmail(action as SendEmailAction, context);
          break;

        case 'send_notification':
          result = await this.executeSendNotification(action as SendNotificationAction, context);
          break;

        case 'send_push':
          result = await this.executeSendPush(action as SendPushAction, context);
          break;

        case 'create_task':
          result = await this.executeCreateTask(action as CreateTaskAction, context);
          break;

        case 'update_field':
          result = await this.executeUpdateField(action as UpdateFieldAction, context);
          break;

        case 'change_status':
        case 'change_stage':
          result = await this.executeChangeStatus(action as ChangeStatusAction, context);
          break;

        case 'create_note':
          result = await this.executeCreateNote(action as CreateNoteAction, context);
          break;

        case 'send_webhook':
          result = await this.executeSendWebhook(action as SendWebhookAction, context);
          break;

        case 'delay':
          result = await this.executeDelay(action as DelayAction);
          break;

        case 'condition':
          result = await this.executeCondition(action as ConditionAction, context, index);
          break;

        case 'add_tag':
        case 'remove_tag':
          result = await this.executeTagAction(action, context);
          break;

        case 'assign_to':
          result = await this.executeAssign(action, context);
          break;

        default:
          throw new Error(`Unknown action type: ${(action as { type: string }).type}`);
      }

      return {
        actionType: action.type,
        actionIndex: index,
        status: 'completed',
        result,
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      return {
        actionType: action.type,
        actionIndex: index,
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        executedAt: new Date(),
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Send email action
   */
  private async executeSendEmail(
    action: SendEmailAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const to = this.interpolateValue(action.to, context);
    const subject = this.interpolateValue(action.subject, context);
    const body = this.interpolateValue(action.body, context);

    if (!this.emailProvider) {
      console.warn('[WorkflowEngine] Email provider not initialized, skipping email action');
      return {
        to,
        subject,
        sent: false,
        error: 'Email provider not initialized',
      };
    }

    try {
      const appConfig = getAppConfig();
      const result = await this.emailProvider.send({
        to,
        subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            ${body}
            <p style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6B7280; font-size: 12px;">
              Este email fue enviado automáticamente por un flujo de trabajo en ${appConfig.appName}.
            </p>
          </div>
        `,
        variables: {
          ...context.entity,
          entityType: context.entityType,
          entityId: context.entityId,
        },
        tags: [
          { name: 'type', value: 'workflow-email' },
          { name: 'workflowAction', value: 'send_email' },
          { name: 'entityType', value: context.entityType },
        ],
      });

      if (result.isSuccess) {
        console.log(`[WorkflowEngine] Email sent to ${to}: ${subject}`);
        return {
          to,
          subject,
          sent: true,
          messageId: result.value?.messageId,
        };
      } else {
        console.error(`[WorkflowEngine] Failed to send email to ${to}:`, result.error);
        return {
          to,
          subject,
          sent: false,
          error: result.error,
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[WorkflowEngine] Email error:`, error);
      return {
        to,
        subject,
        sent: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Send notification action
   */
  private async executeSendNotification(
    action: SendNotificationAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const recipientIds = this.resolveRecipients(action.recipientType, action.recipientIds, context);
    const title = this.interpolateValue(action.title, context);
    const body = this.interpolateValue(action.body, context);

    // Create notifications for each recipient
    for (const recipientId of recipientIds) {
      const query = `
        INSERT INTO notifications (
          id, tenant_id, type, priority, recipient_user_id,
          channel, status, title, body, data, action_url,
          metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
        )
      `;

      await this.pool.query(query, [
        uuidv4(),
        context.tenantId,
        'workflow.notification',
        action.priority || 'medium',
        recipientId,
        'in_app',
        'sent',
        title,
        body,
        JSON.stringify({ entityType: context.entityType, entityId: context.entityId }),
        `/${context.entityType}s/${context.entityId}`,
        JSON.stringify({}),
      ]);
    }

    return {
      recipientCount: recipientIds.length,
      title,
      sent: true,
    };
  }

  /**
   * Send push notification action
   */
  private async executeSendPush(
    action: SendPushAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const recipientIds = this.resolveRecipients(action.recipientType, action.recipientIds, context);
    const title = this.interpolateValue(action.title, context);
    const body = this.interpolateValue(action.body, context);

    // TODO: Integrate with push notification service
    console.log(`[Workflow] Send push to ${recipientIds.length} recipients: ${title}`);

    return {
      recipientCount: recipientIds.length,
      title,
      sent: true,
    };
  }

  /**
   * Create task action
   */
  private async executeCreateTask(
    action: CreateTaskAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const title = this.interpolateValue(action.title, context);
    const description = action.description ? this.interpolateValue(action.description, context) : null;
    const assigneeId = this.resolveAssignee(action.assigneeType, action.assigneeId, context);

    // Calculate due date
    let dueDate: Date | null = null;
    if (action.dueInDays) {
      dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + action.dueInDays);
    } else if (action.dueDate) {
      dueDate = new Date(action.dueDate);
    }

    const taskId = uuidv4();
    const query = `
      INSERT INTO tasks (
        id, tenant_id, entity_type, entity_id,
        title, description, assigned_to, due_date,
        priority, task_type, status,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING id
    `;

    await this.pool.query(query, [
      taskId,
      context.tenantId,
      context.entityType,
      context.entityId,
      title,
      description,
      assigneeId,
      dueDate,
      action.priority || 'medium',
      action.taskType || 'workflow_task',
      'pending',
      context.userId || assigneeId,
    ]);

    return {
      taskId,
      title,
      assigneeId,
      dueDate,
    };
  }

  /**
   * Update field action
   */
  private async executeUpdateField(
    action: UpdateFieldAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const value = this.interpolateValue(action.value, context);
    const table = this.getTableForEntityType(context.entityType);
    const column = this.snakeCase(action.field);

    const query = `
      UPDATE ${table}
      SET ${column} = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `;

    await this.pool.query(query, [value, context.entityId, context.tenantId]);

    return {
      field: action.field,
      newValue: value,
    };
  }

  /**
   * Change status/stage action
   */
  private async executeChangeStatus(
    action: ChangeStatusAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const table = this.getTableForEntityType(context.entityType);
    const column = action.type === 'change_status' ? 'status' : 'stage';

    const query = `
      UPDATE ${table}
      SET ${column} = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `;

    await this.pool.query(query, [action.value, context.entityId, context.tenantId]);

    return {
      type: action.type,
      newValue: action.value,
    };
  }

  /**
   * Create note action
   */
  private async executeCreateNote(
    action: CreateNoteAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const content = this.interpolateValue(action.content, context);
    const noteId = uuidv4();

    const query = `
      INSERT INTO notes (
        id, tenant_id, entity_type, entity_id,
        content, content_type, note_type, is_private,
        reactions, mentions, tags,
        created_by, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING id
    `;

    await this.pool.query(query, [
      noteId,
      context.tenantId,
      context.entityType,
      context.entityId,
      content,
      'text',
      action.noteType || 'system',
      action.isPrivate || false,
      JSON.stringify({}),
      JSON.stringify([]),
      JSON.stringify([]),
      context.userId,
    ]);

    return {
      noteId,
      content,
    };
  }

  /**
   * Send webhook action
   */
  private async executeSendWebhook(
    action: SendWebhookAction,
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const url = this.interpolateValue(action.url, context);
    const body = action.body ? this.interpolateObject(action.body, context) : context.entity;

    const response = await fetch(url, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.headers,
      },
      body: action.method !== 'GET' ? JSON.stringify(body) : undefined,
    });

    return {
      url,
      status: response.status,
      success: response.ok,
    };
  }

  /**
   * Delay action
   */
  private async executeDelay(action: DelayAction): Promise<Record<string, unknown>> {
    let durationMs = action.duration * 1000;

    switch (action.unit) {
      case 'minutes':
        durationMs = action.duration * 60 * 1000;
        break;
      case 'hours':
        durationMs = action.duration * 60 * 60 * 1000;
        break;
      case 'days':
        durationMs = action.duration * 24 * 60 * 60 * 1000;
        break;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(durationMs, 60000))); // Cap at 1 minute for now

    return {
      delayedMs: durationMs,
    };
  }

  /**
   * Condition action (branching)
   */
  private async executeCondition(
    action: ConditionAction,
    context: TriggerContext,
    _index: number
  ): Promise<Record<string, unknown>> {
    const conditionsMet = this.evaluateConditions(action.conditions, context.entity);

    const actionsToExecute = conditionsMet ? action.thenActions : (action.elseActions || []);

    // Execute branch actions
    for (let i = 0; i < actionsToExecute.length; i++) {
      await this.executeAction(actionsToExecute[i], context, i);
    }

    return {
      conditionsMet,
      executedBranch: conditionsMet ? 'then' : 'else',
      actionsExecuted: actionsToExecute.length,
    };
  }

  /**
   * Tag action (add/remove)
   */
  private async executeTagAction(
    action: WorkflowAction & { type: 'add_tag' | 'remove_tag'; tags: string[] },
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    const table = this.getTableForEntityType(context.entityType);

    if (action.type === 'add_tag') {
      const query = `
        UPDATE ${table}
        SET tags = (
          SELECT COALESCE(
            CASE
              WHEN tags IS NULL THEN $1::jsonb
              ELSE tags || $1::jsonb
            END,
            '[]'::jsonb
          )
        ),
        updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;
      await this.pool.query(query, [JSON.stringify(action.tags), context.entityId, context.tenantId]);
    } else {
      const query = `
        UPDATE ${table}
        SET tags = (
          SELECT COALESCE(
            (SELECT jsonb_agg(elem) FROM jsonb_array_elements(tags) elem WHERE NOT elem <@ $1::jsonb),
            '[]'::jsonb
          )
        ),
        updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `;
      await this.pool.query(query, [JSON.stringify(action.tags), context.entityId, context.tenantId]);
    }

    return {
      action: action.type,
      tags: action.tags,
    };
  }

  /**
   * Assign action
   */
  private async executeAssign(
    action: WorkflowAction & { type: 'assign_to'; assigneeType: string; assigneeId?: string; teamId?: string },
    context: TriggerContext
  ): Promise<Record<string, unknown>> {
    let assigneeId = action.assigneeId;

    if (action.assigneeType === 'round_robin' && action.teamId) {
      // Get team members and assign in round robin
      const result = await this.pool.query(
        `SELECT user_id FROM tenant_memberships WHERE tenant_id = $1 ORDER BY RANDOM() LIMIT 1`,
        [context.tenantId]
      );
      if (result.isSuccess && result.value?.rows?.[0]) {
        assigneeId = result.value.rows[0].user_id;
      }
    }

    if (!assigneeId) {
      throw new Error('Could not determine assignee');
    }

    const table = this.getTableForEntityType(context.entityType);
    const query = `
      UPDATE ${table}
      SET assigned_to = $1, updated_at = NOW()
      WHERE id = $2 AND tenant_id = $3
    `;

    await this.pool.query(query, [assigneeId, context.entityId, context.tenantId]);

    return {
      assigneeId,
      assigneeType: action.assigneeType,
    };
  }

  /**
   * Evaluate conditions against entity data
   */
  evaluateConditions(conditions: WorkflowCondition[], entity: Record<string, unknown>): boolean {
    if (!conditions || conditions.length === 0) {
      return true;
    }

    let result = this.evaluateCondition(conditions[0], entity);

    for (let i = 1; i < conditions.length; i++) {
      const condition = conditions[i];
      const conditionResult = this.evaluateCondition(condition, entity);

      if (condition.logicalOperator === 'or') {
        result = result || conditionResult;
      } else {
        result = result && conditionResult;
      }
    }

    return result;
  }

  /**
   * Evaluate a single condition
   */
  private evaluateCondition(condition: WorkflowCondition, entity: Record<string, unknown>): boolean {
    const fieldValue = this.getNestedValue(entity, condition.field);
    const conditionValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === conditionValue;
      case 'not_equals':
        return fieldValue !== conditionValue;
      case 'contains':
        return String(fieldValue).includes(String(conditionValue));
      case 'not_contains':
        return !String(fieldValue).includes(String(conditionValue));
      case 'starts_with':
        return String(fieldValue).startsWith(String(conditionValue));
      case 'ends_with':
        return String(fieldValue).endsWith(String(conditionValue));
      case 'greater_than':
        return Number(fieldValue) > Number(conditionValue);
      case 'less_than':
        return Number(fieldValue) < Number(conditionValue);
      case 'greater_than_or_equal':
        return Number(fieldValue) >= Number(conditionValue);
      case 'less_than_or_equal':
        return Number(fieldValue) <= Number(conditionValue);
      case 'is_empty':
        return fieldValue === null || fieldValue === undefined || fieldValue === '';
      case 'is_not_empty':
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';
      case 'in':
        return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(conditionValue) && !conditionValue.includes(fieldValue);
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current: unknown, key) => {
      if (current && typeof current === 'object') {
        return (current as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  /**
   * Interpolate template variables in a value
   */
  private interpolateValue<T>(value: T, context: TriggerContext): T {
    if (typeof value !== 'string') {
      return value;
    }

    return value.replace(/\{\{([^}]+)\}\}/g, (_, path) => {
      const trimmedPath = path.trim();
      // Check context paths first
      if (trimmedPath.startsWith('entity.')) {
        return String(this.getNestedValue(context.entity, trimmedPath.substring(7)) ?? '');
      }
      if (trimmedPath.startsWith('previous.')) {
        return String(this.getNestedValue(context.previousEntity || {}, trimmedPath.substring(9)) ?? '');
      }
      // Direct entity field
      return String(this.getNestedValue(context.entity, trimmedPath) ?? '');
    }) as T;
  }

  /**
   * Interpolate template variables in an object
   */
  private interpolateObject(
    obj: Record<string, unknown>,
    context: TriggerContext
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = this.interpolateValue(value, context);
      } else if (typeof value === 'object' && value !== null) {
        result[key] = this.interpolateObject(value as Record<string, unknown>, context);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Resolve recipients based on type
   */
  private resolveRecipients(
    type: string,
    specificIds: string[] | undefined,
    context: TriggerContext
  ): string[] {
    switch (type) {
      case 'owner':
        return context.entity.ownerId ? [context.entity.ownerId as string] : [];
      case 'assignee':
        return context.entity.assignedTo ? [context.entity.assignedTo as string] : [];
      case 'specific':
        return specificIds || [];
      case 'team':
        // Would need to query team members
        return [];
      default:
        return [];
    }
  }

  /**
   * Resolve assignee based on type
   */
  private resolveAssignee(
    type: string,
    specificId: string | undefined,
    context: TriggerContext
  ): string | null {
    switch (type) {
      case 'owner':
        return (context.entity.ownerId as string) || null;
      case 'assignee':
        return (context.entity.assignedTo as string) || null;
      case 'specific':
        return specificId || null;
      default:
        return null;
    }
  }

  /**
   * Get table name for entity type
   */
  private getTableForEntityType(entityType: string): string {
    const tables: Record<string, string> = {
      lead: 'leads',
      contact: 'lead_contacts',
      opportunity: 'opportunities',
      customer: 'customers',
      task: 'tasks',
      communication: 'lead_communications',
    };
    return tables[entityType] || entityType;
  }

  /**
   * Convert camelCase to snake_case
   */
  private snakeCase(str: string): string {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  /**
   * Save execution record
   */
  private async saveExecution(execution: WorkflowExecution): Promise<void> {
    const query = `
      INSERT INTO workflow_executions (
        id, workflow_id, tenant_id, trigger_entity_type, trigger_entity_id,
        trigger_event, trigger_data, status, actions_executed, total_actions,
        completed_actions, failed_actions, started_at, metadata, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `;

    await this.pool.query(query, [
      execution.id,
      execution.workflowId,
      execution.tenantId,
      execution.triggerEntityType,
      execution.triggerEntityId,
      execution.triggerEvent,
      JSON.stringify(execution.triggerData),
      execution.status,
      JSON.stringify(execution.actionsExecuted),
      execution.totalActions,
      execution.completedActions,
      execution.failedActions,
      execution.startedAt,
      JSON.stringify(execution.metadata),
      execution.createdAt,
    ]);
  }

  /**
   * Update execution record
   */
  private async updateExecution(execution: WorkflowExecution): Promise<void> {
    const query = `
      UPDATE workflow_executions
      SET status = $1, actions_executed = $2, completed_actions = $3,
          failed_actions = $4, error_message = $5, error_details = $6,
          completed_at = $7, duration_ms = $8
      WHERE id = $9
    `;

    await this.pool.query(query, [
      execution.status,
      JSON.stringify(execution.actionsExecuted),
      execution.completedActions,
      execution.failedActions,
      execution.errorMessage,
      execution.errorDetails ? JSON.stringify(execution.errorDetails) : null,
      execution.completedAt,
      execution.durationMs,
      execution.id,
    ]);
  }
}
