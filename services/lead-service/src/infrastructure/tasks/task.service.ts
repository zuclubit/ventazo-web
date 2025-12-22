import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  TaskDTO,
  CreateTaskRequest,
  UpdateTaskRequest,
  CompleteTaskRequest,
  TaskFilterOptions,
  TaskSortOptions,
  TaskStatistics,
  UpcomingTasksResponse,
  BulkTaskOperation,
  BulkTaskResult,
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskEntityType,
  RecurrenceRule,
  RecurrenceFrequency,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';

/**
 * Task Service
 * Manages tasks, reminders, and follow-ups for leads, customers, and opportunities
 */
@injectable()
export class TaskService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {
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
      }
    }
  }

  /**
   * Create a new task
   */
  async createTask(
    tenantId: string,
    request: CreateTaskRequest,
    createdBy: string
  ): Promise<Result<TaskDTO>> {
    try {
      // Validate at least one entity is linked
      if (!request.leadId && !request.customerId && !request.opportunityId) {
        return Result.fail('Task must be linked to a lead, customer, or opportunity');
      }

      const id = crypto.randomUUID();
      const now = new Date();

      // Note: DB has 'created_by' column, not 'assigned_by'
      const query = `
        INSERT INTO tasks (
          id, tenant_id, lead_id, customer_id, opportunity_id,
          title, description, type, priority, status,
          assigned_to, created_by, due_date, reminder_at,
          is_recurring, recurrence_rule, tags, metadata,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *
      `;

      const values = [
        id,
        tenantId,
        request.leadId || null,
        request.customerId || null,
        request.opportunityId || null,
        request.title,
        request.description || null,
        request.type || TaskType.TASK,
        request.priority || TaskPriority.MEDIUM,
        TaskStatus.PENDING,
        request.assignedTo || null,
        createdBy,
        request.dueDate || null,
        request.reminderAt || null,
        request.isRecurring || false,
        request.recurrenceRule ? JSON.stringify(request.recurrenceRule) : null,
        JSON.stringify(request.tags || []),
        JSON.stringify(request.metadata || {}),
        now,
        now,
      ];

      const result = await this.pool.query(query, values);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const row = result.getValue().rows[0];
      const task = this.mapToDTO(row);

      // Log activity
      await this.logTaskActivity(id, tenantId, 'created', createdBy);

      // Send task assignment email if assigned to someone
      if (this.emailProvider && request.assignedTo && request.assigneeEmail) {
        try {
          const appConfig = getAppConfig();
          await this.emailProvider.send({
            to: request.assigneeEmail,
            subject: `Nueva tarea asignada: ${task.title}`,
            template: EmailTemplate.TASK_ASSIGNED,
            variables: {
              assigneeName: request.assigneeName || 'Usuario',
              taskTitle: task.title,
              taskDescription: task.description || 'Sin descripción',
              taskPriority: task.priority,
              taskDueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-ES') : 'Sin fecha límite',
              assignedBy: createdBy,
              actionUrl: `${appConfig.appUrl}/tasks/${task.id}`,
            },
            tags: [
              { name: 'type', value: 'task-assigned' },
              { name: 'taskId', value: task.id },
            ],
          });
          console.log(`[TaskService] Task assignment email sent to ${request.assigneeEmail}`);
        } catch (emailError) {
          console.error('[TaskService] Failed to send task assignment email:', emailError);
        }
      }

      // Send SMS notification to assignee if phone is configured
      if (request.assigneePhone) {
        try {
          const messagingService = getMessagingService();
          if (messagingService.isSmsAvailable()) {
            const appConfig = getAppConfig();
            await messagingService.sendTemplate(
              request.assigneePhone,
              MessageTemplate.TASK_ASSIGNED,
              {
                taskTitle: task.title,
                dueDate: task.dueDate ? new Date(task.dueDate).toLocaleDateString('es-MX') : 'Sin fecha',
                actionUrl: `${appConfig.appUrl}/tasks/${task.id}`,
              },
              'sms',
              { entityType: 'task', entityId: task.id }
            );
            console.log(`[TaskService] Task assignment SMS sent to ${request.assigneePhone}`);
          }
        } catch (smsError) {
          console.error('[TaskService] Failed to send task assignment SMS:', smsError);
        }
      }

      return Result.ok(task);
    } catch (error) {
      return Result.fail(`Failed to create task: ${(error as Error).message}`);
    }
  }

  /**
   * Get task by ID
   */
  async getTaskById(
    taskId: string,
    tenantId: string
  ): Promise<Result<TaskDTO | null>> {
    try {
      // assigned_to is varchar, users.id is uuid - need to cast safely
      const query = `
        SELECT t.*, u.full_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON (t.assigned_to IS NOT NULL AND t.assigned_to::uuid = u.id)
        WHERE t.id = $1 AND t.tenant_id = $2
      `;

      const result = await this.pool.query(query, [taskId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;

      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get task: ${(error as Error).message}`);
    }
  }

  /**
   * Get tasks with filtering and pagination
   */
  async getTasks(
    tenantId: string,
    filters?: TaskFilterOptions,
    sort?: TaskSortOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ tasks: TaskDTO[]; total: number; page: number; totalPages: number }>> {
    try {
      let whereClause = 'WHERE t.tenant_id = $1';
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters?.status) {
        const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
        whereClause += ` AND t.status = ANY($${paramIndex++})`;
        values.push(statuses);
      } else if (!filters?.includeCompleted) {
        whereClause += ` AND t.status NOT IN ('completed', 'cancelled')`;
      }

      if (filters?.priority) {
        const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
        whereClause += ` AND t.priority = ANY($${paramIndex++})`;
        values.push(priorities);
      }

      if (filters?.type) {
        const types = Array.isArray(filters.type) ? filters.type : [filters.type];
        whereClause += ` AND t.type = ANY($${paramIndex++})`;
        values.push(types);
      }

      if (filters?.assignedTo) {
        whereClause += ` AND t.assigned_to = $${paramIndex++}`;
        values.push(filters.assignedTo);
      }

      if (filters?.leadId) {
        whereClause += ` AND t.lead_id = $${paramIndex++}`;
        values.push(filters.leadId);
      }

      if (filters?.customerId) {
        whereClause += ` AND t.customer_id = $${paramIndex++}`;
        values.push(filters.customerId);
      }

      if (filters?.opportunityId) {
        whereClause += ` AND t.opportunity_id = $${paramIndex++}`;
        values.push(filters.opportunityId);
      }

      if (filters?.dueDateFrom) {
        whereClause += ` AND t.due_date >= $${paramIndex++}`;
        values.push(filters.dueDateFrom);
      }

      if (filters?.dueDateTo) {
        whereClause += ` AND t.due_date <= $${paramIndex++}`;
        values.push(filters.dueDateTo);
      }

      if (filters?.isOverdue) {
        whereClause += ` AND t.due_date < NOW() AND t.status NOT IN ('completed', 'cancelled')`;
      }

      if (filters?.searchTerm) {
        whereClause += ` AND (t.title ILIKE $${paramIndex++} OR t.description ILIKE $${paramIndex++})`;
        const searchPattern = `%${filters.searchTerm}%`;
        values.push(searchPattern, searchPattern);
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM tasks t ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure) {
        return Result.fail(`Count query failed: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total as string, 10);

      // Get data with sorting and pagination
      const sortColumn = this.getSortColumn(sort?.sortBy || 'dueDate');
      const sortOrder = sort?.sortOrder === 'desc' ? 'DESC' : 'ASC';
      const offset = (page - 1) * limit;

      const dataQuery = `
        SELECT t.*, u.full_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON (t.assigned_to IS NOT NULL AND t.assigned_to::uuid = u.id)
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder} NULLS LAST
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      if (dataResult.isFailure) {
        return Result.fail(`Data query failed: ${dataResult.error}`);
      }

      const tasks = dataResult.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapToDTO(row)
      );

      return Result.ok({
        tasks,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return Result.fail(`Failed to get tasks: ${(error as Error).message}`);
    }
  }

  /**
   * Get upcoming tasks for a user
   */
  async getUpcomingTasks(
    tenantId: string,
    userId: string
  ): Promise<Result<UpcomingTasksResponse>> {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dayAfterTomorrow = new Date(today);
      dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
      const endOfWeek = new Date(today);
      endOfWeek.setDate(endOfWeek.getDate() + 7);

      const baseQuery = `
        SELECT t.*, u.full_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON (t.assigned_to IS NOT NULL AND t.assigned_to::uuid = u.id)
        WHERE t.tenant_id = $1
        AND t.assigned_to = $2
        AND t.status NOT IN ('completed', 'cancelled')
      `;

      // Overdue tasks
      const overdueResult = await this.pool.query(
        `${baseQuery} AND t.due_date < $3 ORDER BY t.due_date ASC`,
        [tenantId, userId, today]
      );

      // Today's tasks
      const todayResult = await this.pool.query(
        `${baseQuery} AND t.due_date >= $3 AND t.due_date < $4 ORDER BY t.due_date ASC`,
        [tenantId, userId, today, tomorrow]
      );

      // Tomorrow's tasks
      const tomorrowResult = await this.pool.query(
        `${baseQuery} AND t.due_date >= $3 AND t.due_date < $4 ORDER BY t.due_date ASC`,
        [tenantId, userId, tomorrow, dayAfterTomorrow]
      );

      // This week's tasks (excluding today and tomorrow)
      const weekResult = await this.pool.query(
        `${baseQuery} AND t.due_date >= $3 AND t.due_date < $4 ORDER BY t.due_date ASC`,
        [tenantId, userId, dayAfterTomorrow, endOfWeek]
      );

      return Result.ok({
        overdue: overdueResult.isSuccess
          ? overdueResult.getValue().rows.map((r: Record<string, unknown>) => this.mapToDTO(r))
          : [],
        today: todayResult.isSuccess
          ? todayResult.getValue().rows.map((r: Record<string, unknown>) => this.mapToDTO(r))
          : [],
        tomorrow: tomorrowResult.isSuccess
          ? tomorrowResult.getValue().rows.map((r: Record<string, unknown>) => this.mapToDTO(r))
          : [],
        thisWeek: weekResult.isSuccess
          ? weekResult.getValue().rows.map((r: Record<string, unknown>) => this.mapToDTO(r))
          : [],
      });
    } catch (error) {
      return Result.fail(`Failed to get upcoming tasks: ${(error as Error).message}`);
    }
  }

  /**
   * Update a task
   */
  async updateTask(
    taskId: string,
    tenantId: string,
    request: UpdateTaskRequest,
    updatedBy: string
  ): Promise<Result<TaskDTO>> {
    try {
      // Get current task
      const currentResult = await this.getTaskById(taskId, tenantId);
      if (currentResult.isFailure) {
        return Result.fail(currentResult.error as string);
      }

      const current = currentResult.getValue();
      if (!current) {
        return Result.fail('Task not found');
      }

      // Build dynamic update
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;
      const changes: Record<string, { from: unknown; to: unknown }> = {};

      if (request.title !== undefined) {
        setClauses.push(`title = $${paramIndex++}`);
        values.push(request.title);
        changes['title'] = { from: current.title, to: request.title };
      }

      if (request.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        values.push(request.description);
        changes['description'] = { from: current.description, to: request.description };
      }

      if (request.type !== undefined) {
        setClauses.push(`type = $${paramIndex++}`);
        values.push(request.type);
        changes['type'] = { from: current.type, to: request.type };
      }

      if (request.priority !== undefined) {
        setClauses.push(`priority = $${paramIndex++}`);
        values.push(request.priority);
        changes['priority'] = { from: current.priority, to: request.priority };
      }

      if (request.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(request.status);
        changes['status'] = { from: current.status, to: request.status };

        if (request.status === TaskStatus.COMPLETED) {
          setClauses.push(`completed_at = NOW()`);
        }
      }

      if (request.assignedTo !== undefined) {
        setClauses.push(`assigned_to = $${paramIndex++}`);
        values.push(request.assignedTo);
        changes['assignedTo'] = { from: current.assignedTo, to: request.assignedTo };
      }

      if (request.dueDate !== undefined) {
        setClauses.push(`due_date = $${paramIndex++}`);
        values.push(request.dueDate);
        changes['dueDate'] = { from: current.dueDate, to: request.dueDate };
      }

      if (request.reminderAt !== undefined) {
        setClauses.push(`reminder_at = $${paramIndex++}`);
        values.push(request.reminderAt);
        changes['reminderAt'] = { from: current.reminderAt, to: request.reminderAt };
      }

      if (request.isRecurring !== undefined) {
        setClauses.push(`is_recurring = $${paramIndex++}`);
        values.push(request.isRecurring);
      }

      if (request.recurrenceRule !== undefined) {
        setClauses.push(`recurrence_rule = $${paramIndex++}`);
        values.push(request.recurrenceRule ? JSON.stringify(request.recurrenceRule) : null);
      }

      if (request.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(JSON.stringify(request.tags));
      }

      if (request.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(request.metadata));
      }

      if (setClauses.length === 1) {
        return Result.ok(current); // No changes
      }

      values.push(taskId, tenantId);

      const query = `
        UPDATE tasks
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `;

      const result = await this.pool.query(query, values);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Task not found');
      }

      // Log activity
      await this.logTaskActivity(taskId, tenantId, 'updated', updatedBy, changes);

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update task: ${(error as Error).message}`);
    }
  }

  /**
   * Complete a task
   */
  async completeTask(
    taskId: string,
    tenantId: string,
    request: CompleteTaskRequest,
    completedBy: string
  ): Promise<Result<TaskDTO>> {
    try {
      // Note: 'outcome' column doesn't exist in actual database
      const query = `
        UPDATE tasks
        SET status = 'completed', completed_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('completed', 'cancelled')
        RETURNING *
      `;

      const result = await this.pool.query(query, [taskId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Task not found or already completed');
      }

      const completedTask = this.mapToDTO(rows[0]);

      // Handle recurring tasks
      if (completedTask.isRecurring && completedTask.recurrenceRule) {
        await this.createNextRecurringTask(completedTask, tenantId, completedBy);
      }

      // Create follow-up if requested
      if (request.createFollowUp && request.followUpDate) {
        await this.createTask(
          tenantId,
          {
            leadId: completedTask.leadId,
            customerId: completedTask.customerId,
            opportunityId: completedTask.opportunityId,
            title: request.followUpTitle || `Follow-up: ${completedTask.title}`,
            type: TaskType.FOLLOW_UP,
            priority: completedTask.priority,
            assignedTo: completedTask.assignedTo,
            dueDate: request.followUpDate,
            metadata: { previousTaskId: taskId },
          },
          completedBy
        );
      }

      // Log activity
      await this.logTaskActivity(taskId, tenantId, 'completed', completedBy);

      return Result.ok(completedTask);
    } catch (error) {
      return Result.fail(`Failed to complete task: ${(error as Error).message}`);
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(
    taskId: string,
    tenantId: string,
    reason: string,
    cancelledBy: string
  ): Promise<Result<TaskDTO>> {
    try {
      // Note: 'outcome' column doesn't exist in actual database
      // The cancellation reason is logged in activity tracking
      const query = `
        UPDATE tasks
        SET status = 'cancelled', updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status NOT IN ('completed', 'cancelled')
        RETURNING *
      `;

      const result = await this.pool.query(query, [taskId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Task not found or already cancelled');
      }

      // Log activity
      await this.logTaskActivity(taskId, tenantId, 'cancelled', cancelledBy, { reason });

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to cancel task: ${(error as Error).message}`);
    }
  }

  /**
   * Delete a task
   */
  async deleteTask(
    taskId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM tasks
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;

      const result = await this.pool.query(query, [taskId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      if (result.getValue().rows.length === 0) {
        return Result.fail('Task not found');
      }

      // Log activity
      await this.logTaskActivity(taskId, tenantId, 'deleted', deletedBy);

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete task: ${(error as Error).message}`);
    }
  }

  /**
   * Get task statistics
   */
  async getTaskStatistics(
    tenantId: string,
    userId?: string
  ): Promise<Result<TaskStatistics>> {
    try {
      let userFilter = '';
      const values: unknown[] = [tenantId];

      if (userId) {
        userFilter = ' AND assigned_to = $2';
        values.push(userId);
      }

      // Get counts by status
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM tasks
        WHERE tenant_id = $1 ${userFilter}
        GROUP BY status
      `;

      // Get counts by priority
      const priorityQuery = `
        SELECT priority, COUNT(*) as count
        FROM tasks
        WHERE tenant_id = $1 ${userFilter}
        GROUP BY priority
      `;

      // Get counts by type
      const typeQuery = `
        SELECT type, COUNT(*) as count
        FROM tasks
        WHERE tenant_id = $1 ${userFilter}
        GROUP BY type
      `;

      // Get overdue and due counts
      const dueCounts = `
        SELECT
          SUM(CASE WHEN due_date < NOW() AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as overdue,
          SUM(CASE WHEN DATE(due_date) = CURRENT_DATE AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_today,
          SUM(CASE WHEN due_date >= CURRENT_DATE AND due_date < CURRENT_DATE + INTERVAL '7 days' AND status NOT IN ('completed', 'cancelled') THEN 1 ELSE 0 END) as due_this_week,
          SUM(CASE WHEN completed_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 ELSE 0 END) as completed_this_week
        FROM tasks
        WHERE tenant_id = $1 ${userFilter}
      `;

      // Get completion metrics
      const completionQuery = `
        SELECT
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) as total,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) FILTER (WHERE status = 'completed') as avg_completion_hours
        FROM tasks
        WHERE tenant_id = $1 ${userFilter} AND created_at >= CURRENT_DATE - INTERVAL '30 days'
      `;

      const [statusResult, priorityResult, typeResult, dueResult, completionResult] =
        await Promise.all([
          this.pool.query(statusQuery, values),
          this.pool.query(priorityQuery, values),
          this.pool.query(typeQuery, values),
          this.pool.query(dueCounts, values),
          this.pool.query(completionQuery, values),
        ]);

      // Build status counts
      const byStatus = {
        pending: 0,
        inProgress: 0,
        completed: 0,
        cancelled: 0,
        deferred: 0,
      };

      if (statusResult.isSuccess) {
        for (const row of statusResult.getValue().rows) {
          const status = row.status as string;
          const count = parseInt(row.count as string, 10);
          if (status === 'pending') byStatus.pending = count;
          if (status === 'in_progress') byStatus.inProgress = count;
          if (status === 'completed') byStatus.completed = count;
          if (status === 'cancelled') byStatus.cancelled = count;
          if (status === 'deferred') byStatus.deferred = count;
        }
      }

      // Build priority counts
      const byPriority = { low: 0, medium: 0, high: 0, urgent: 0 };
      if (priorityResult.isSuccess) {
        for (const row of priorityResult.getValue().rows) {
          const priority = row.priority as string;
          const count = parseInt(row.count as string, 10);
          if (priority in byPriority) {
            byPriority[priority as keyof typeof byPriority] = count;
          }
        }
      }

      // Build type counts
      const byType: Record<string, number> = {};
      if (typeResult.isSuccess) {
        for (const row of typeResult.getValue().rows) {
          byType[row.type as string] = parseInt(row.count as string, 10);
        }
      }

      // Get due counts
      const dueRow = dueResult.isSuccess ? dueResult.getValue().rows[0] : {};
      const overdue = parseInt((dueRow.overdue as string) || '0', 10);
      const dueToday = parseInt((dueRow.due_today as string) || '0', 10);
      const dueThisWeek = parseInt((dueRow.due_this_week as string) || '0', 10);
      const completedThisWeek = parseInt((dueRow.completed_this_week as string) || '0', 10);

      // Get completion metrics
      const completionRow = completionResult.isSuccess ? completionResult.getValue().rows[0] : {};
      const completed = parseInt((completionRow.completed as string) || '0', 10);
      const total = parseInt((completionRow.total as string) || '0', 10);
      const avgHours = parseFloat((completionRow.avg_completion_hours as string) || '0');

      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return Result.ok({
        total: Object.values(byStatus).reduce((a, b) => a + b, 0),
        byStatus,
        byPriority,
        byType,
        overdue,
        dueToday,
        dueThisWeek,
        completedThisWeek,
        completionRate,
        averageCompletionTime: Math.round(avgHours * 100) / 100,
      });
    } catch (error) {
      return Result.fail(`Failed to get task statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk task operations
   */
  async bulkOperation(
    tenantId: string,
    operation: BulkTaskOperation,
    performedBy: string
  ): Promise<Result<BulkTaskResult>> {
    try {
      const successful: string[] = [];
      const failed: { taskId: string; error: string }[] = [];

      for (const taskId of operation.taskIds) {
        try {
          let result: Result<unknown>;

          switch (operation.action) {
            case 'complete':
              result = await this.completeTask(taskId, tenantId, {}, performedBy);
              break;
            case 'cancel':
              result = await this.cancelTask(taskId, tenantId, 'Bulk cancelled', performedBy);
              break;
            case 'defer':
              if (!operation.deferTo) {
                failed.push({ taskId, error: 'Defer date required' });
                continue;
              }
              result = await this.updateTask(
                taskId,
                tenantId,
                { dueDate: operation.deferTo, status: TaskStatus.DEFERRED },
                performedBy
              );
              break;
            case 'reassign':
              if (!operation.assignTo) {
                failed.push({ taskId, error: 'Assignee required' });
                continue;
              }
              result = await this.updateTask(
                taskId,
                tenantId,
                { assignedTo: operation.assignTo },
                performedBy
              );
              break;
            case 'delete':
              result = await this.deleteTask(taskId, tenantId, performedBy);
              break;
            default:
              failed.push({ taskId, error: 'Unknown action' });
              continue;
          }

          if (result.isSuccess) {
            successful.push(taskId);
          } else {
            failed.push({ taskId, error: result.error as string });
          }
        } catch (error) {
          failed.push({ taskId, error: (error as Error).message });
        }
      }

      return Result.ok({ successful, failed });
    } catch (error) {
      return Result.fail(`Bulk operation failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get tasks by entity (lead, customer, or opportunity)
   */
  async getTasksByEntity(
    tenantId: string,
    entityType: TaskEntityType,
    entityId: string,
    includeCompleted: boolean = false
  ): Promise<Result<TaskDTO[]>> {
    try {
      const entityColumn =
        entityType === TaskEntityType.LEAD
          ? 'lead_id'
          : entityType === TaskEntityType.CUSTOMER
            ? 'customer_id'
            : 'opportunity_id';

      let query = `
        SELECT t.*, u.full_name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON (t.assigned_to IS NOT NULL AND t.assigned_to::uuid = u.id)
        WHERE t.tenant_id = $1 AND t.${entityColumn} = $2
      `;

      if (!includeCompleted) {
        query += ` AND t.status NOT IN ('completed', 'cancelled')`;
      }

      query += ` ORDER BY t.due_date ASC NULLS LAST, t.priority DESC`;

      const result = await this.pool.query(query, [tenantId, entityId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const tasks = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapToDTO(row)
      );

      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(`Failed to get tasks: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private mapToDTO(row: Record<string, unknown>): TaskDTO {
    const now = new Date();
    const dueDate = row.due_date ? new Date(row.due_date as string) : undefined;
    const isOverdue =
      dueDate &&
      dueDate < now &&
      row.status !== TaskStatus.COMPLETED &&
      row.status !== TaskStatus.CANCELLED;

    const daysUntilDue = dueDate
      ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;

    // Determine entity type
    let entityType: TaskEntityType | undefined;
    if (row.lead_id) entityType = TaskEntityType.LEAD;
    else if (row.customer_id) entityType = TaskEntityType.CUSTOMER;
    else if (row.opportunity_id) entityType = TaskEntityType.OPPORTUNITY;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      leadId: row.lead_id as string | undefined,
      customerId: row.customer_id as string | undefined,
      opportunityId: row.opportunity_id as string | undefined,
      entityType,
      title: row.title as string,
      description: row.description as string | undefined,
      type: row.type as TaskType,
      priority: row.priority as TaskPriority,
      status: row.status as TaskStatus,
      assignedTo: row.assigned_to as string | undefined,
      assignedBy: row.created_by as string | undefined, // DB uses 'created_by' instead of 'assigned_by'
      assignedToName: row.assigned_to_name as string | undefined,
      dueDate,
      reminderAt: row.reminder_at ? new Date(row.reminder_at as string) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      isRecurring: row.is_recurring as boolean,
      recurrenceRule: row.recurrence_rule as RecurrenceRule | undefined,
      nextTaskId: row.next_task_id as string | undefined,
      outcome: row.outcome as string | undefined,
      tags: (row.tags as string[]) || [],
      metadata: (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      isOverdue,
      daysUntilDue,
    };
  }

  private getSortColumn(sortBy: string): string {
    const columns: Record<string, string> = {
      dueDate: 't.due_date',
      priority: 't.priority',
      createdAt: 't.created_at',
      updatedAt: 't.updated_at',
      status: 't.status',
    };
    return columns[sortBy] || 't.due_date';
  }

  private async createNextRecurringTask(
    task: TaskDTO,
    tenantId: string,
    createdBy: string
  ): Promise<void> {
    if (!task.recurrenceRule || !task.dueDate) return;

    const nextDueDate = this.calculateNextDueDate(task.dueDate, task.recurrenceRule);

    // Check if we should create next task (count limit or until date)
    if (task.recurrenceRule.until && nextDueDate > task.recurrenceRule.until) {
      return;
    }

    const nextTaskResult = await this.createTask(
      tenantId,
      {
        leadId: task.leadId,
        customerId: task.customerId,
        opportunityId: task.opportunityId,
        title: task.title,
        description: task.description,
        type: task.type,
        priority: task.priority,
        assignedTo: task.assignedTo,
        dueDate: nextDueDate,
        isRecurring: true,
        recurrenceRule: task.recurrenceRule,
        tags: task.tags,
        metadata: { ...task.metadata, previousTaskId: task.id },
      },
      createdBy
    );

    if (nextTaskResult.isSuccess) {
      // Update current task with next task reference
      await this.pool.query(
        'UPDATE tasks SET next_task_id = $1 WHERE id = $2',
        [nextTaskResult.getValue().id, task.id]
      );
    }
  }

  private calculateNextDueDate(currentDueDate: Date, rule: RecurrenceRule): Date {
    const next = new Date(currentDueDate);
    const interval = rule.interval || 1;

    switch (rule.frequency) {
      case RecurrenceFrequency.DAILY:
        next.setDate(next.getDate() + interval);
        break;
      case RecurrenceFrequency.WEEKLY:
        next.setDate(next.getDate() + 7 * interval);
        break;
      case RecurrenceFrequency.BIWEEKLY:
        next.setDate(next.getDate() + 14 * interval);
        break;
      case RecurrenceFrequency.MONTHLY:
        next.setMonth(next.getMonth() + interval);
        break;
      case RecurrenceFrequency.QUARTERLY:
        next.setMonth(next.getMonth() + 3 * interval);
        break;
      case RecurrenceFrequency.YEARLY:
        next.setFullYear(next.getFullYear() + interval);
        break;
    }

    return next;
  }

  private async logTaskActivity(
    taskId: string,
    tenantId: string,
    action: string,
    userId: string,
    changes?: Record<string, unknown>
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO activity_logs (id, tenant_id, user_id, entity_type, entity_id, action, changes, created_at)
        VALUES ($1, $2, $3, 'task', $4, $5, $6, NOW())
      `;

      await this.pool.query(query, [
        crypto.randomUUID(),
        tenantId,
        userId,
        taskId,
        action,
        JSON.stringify(changes || {}),
      ]);
    } catch {
      // Log error but don't fail the main operation
      console.error('Failed to log task activity');
    }
  }
}
