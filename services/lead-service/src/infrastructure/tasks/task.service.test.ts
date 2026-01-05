import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { TaskService } from './task.service';
import {
  TaskType,
  TaskPriority,
  TaskStatus,
  TaskEntityType,
  RecurrenceFrequency,
} from './types';

// Mock DatabasePool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
};

describe('TaskService', () => {
  let taskService: TaskService;

  beforeEach(() => {
    vi.clearAllMocks();
    taskService = new TaskService(mockPool as any);
  });

  describe('createTask', () => {
    it('should create a task successfully', async () => {
      const now = new Date();

      // Mock task insert
      mockQuery.mockImplementationOnce((_query: string, values: unknown[]) => {
        return Promise.resolve(
          Result.ok({
            rows: [
              {
                id: values[0],
                tenant_id: values[1],
                lead_id: values[2],
                customer_id: null,
                opportunity_id: null,
                title: values[5],
                description: values[6],
                type: values[7],
                priority: values[8],
                status: values[9],
                assigned_to: values[10],
                assigned_by: values[11],
                due_date: values[12],
                reminder_at: values[13],
                is_recurring: values[14],
                recurrence_rule: null,
                tags: values[16],
                metadata: values[17],
                created_at: now,
                updated_at: now,
              },
            ],
          })
        );
      });

      // Mock activity log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.createTask(
        'tenant-123',
        {
          leadId: 'lead-123',
          title: 'Follow up with client',
          description: 'Discuss proposal details',
          type: TaskType.FOLLOW_UP,
          priority: TaskPriority.HIGH,
          assignedTo: 'user-123',
          dueDate: new Date('2025-01-15'),
        },
        'user-456'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().title).toBe('Follow up with client');
      expect(result.getValue().type).toBe(TaskType.FOLLOW_UP);
      expect(result.getValue().priority).toBe(TaskPriority.HIGH);
    });

    it('should fail if no entity is linked', async () => {
      const result = await taskService.createTask(
        'tenant-123',
        {
          title: 'Orphan task',
        },
        'user-123'
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('linked to a lead, customer, or opportunity');
    });
  });

  describe('getTaskById', () => {
    it('should return task when found', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-123',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Call client',
              description: null,
              type: TaskType.CALL,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.PENDING,
              assigned_to: 'user-123',
              assigned_by: 'user-456',
              assigned_to_name: 'John Doe',
              due_date: new Date('2025-01-20'),
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
          ],
        })
      );

      const result = await taskService.getTaskById('task-123', 'tenant-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()?.id).toBe('task-123');
      expect(result.getValue()?.title).toBe('Call client');
      expect(result.getValue()?.assignedToName).toBe('John Doe');
    });

    it('should return null when task not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.getTaskById('task-999', 'tenant-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toBeNull();
    });
  });

  describe('getTasks', () => {
    it('should return tasks with pagination', async () => {
      const now = new Date();

      // Mock count query
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '2' }] }));

      // Mock data query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-1',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Task 1',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.HIGH,
              status: TaskStatus.PENDING,
              assigned_to: 'user-123',
              assigned_by: 'user-456',
              assigned_to_name: null,
              due_date: new Date('2025-01-10'),
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
            {
              id: 'task-2',
              tenant_id: 'tenant-123',
              lead_id: 'lead-456',
              customer_id: null,
              opportunity_id: null,
              title: 'Task 2',
              description: 'Description',
              type: TaskType.EMAIL,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.IN_PROGRESS,
              assigned_to: 'user-123',
              assigned_by: 'user-456',
              assigned_to_name: null,
              due_date: new Date('2025-01-15'),
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: ['important'],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
          ],
        })
      );

      const result = await taskService.getTasks(
        'tenant-123',
        { assignedTo: 'user-123' },
        { sortBy: 'dueDate', sortOrder: 'asc' },
        1,
        10
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().tasks.length).toBe(2);
      expect(result.getValue().total).toBe(2);
      expect(result.getValue().page).toBe(1);
    });

    it('should filter by status', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-1',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Pending Task',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.PENDING,
              assigned_to: null,
              assigned_by: null,
              assigned_to_name: null,
              due_date: null,
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await taskService.getTasks(
        'tenant-123',
        { status: TaskStatus.PENDING }
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().tasks.length).toBe(1);
    });
  });

  describe('completeTask', () => {
    it('should complete a task successfully', async () => {
      const now = new Date();

      // Mock complete update
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-123',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Completed Task',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.COMPLETED,
              assigned_to: 'user-123',
              assigned_by: 'user-456',
              due_date: new Date('2025-01-10'),
              reminder_at: null,
              completed_at: now,
              is_recurring: false,
              recurrence_rule: null,
              outcome: 'Successfully completed',
              tags: [],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
          ],
        })
      );

      // Mock activity log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.completeTask(
        'task-123',
        'tenant-123',
        { outcome: 'Successfully completed' },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(TaskStatus.COMPLETED);
      expect(result.getValue().outcome).toBe('Successfully completed');
    });

    it('should fail if task not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.completeTask(
        'task-999',
        'tenant-123',
        {},
        'user-123'
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('cancelTask', () => {
    it('should cancel a task successfully', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-123',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Cancelled Task',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.LOW,
              status: TaskStatus.CANCELLED,
              assigned_to: null,
              assigned_by: null,
              due_date: null,
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              outcome: 'No longer needed',
              tags: [],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
          ],
        })
      );

      // Mock activity log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.cancelTask(
        'task-123',
        'tenant-123',
        'No longer needed',
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().status).toBe(TaskStatus.CANCELLED);
    });
  });

  describe('deleteTask', () => {
    it('should delete a task successfully', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ id: 'task-123' }] })
      );

      // Mock activity log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.deleteTask(
        'task-123',
        'tenant-123',
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
    });

    it('should fail if task not found', async () => {
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await taskService.deleteTask(
        'task-999',
        'tenant-123',
        'user-123'
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('getTaskStatistics', () => {
    it('should return task statistics', async () => {
      // Mock status counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { status: 'pending', count: '5' },
            { status: 'in_progress', count: '3' },
            { status: 'completed', count: '10' },
          ],
        })
      );

      // Mock priority counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { priority: 'high', count: '4' },
            { priority: 'medium', count: '10' },
            { priority: 'low', count: '4' },
          ],
        })
      );

      // Mock type counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { type: 'task', count: '10' },
            { type: 'call', count: '5' },
            { type: 'email', count: '3' },
          ],
        })
      );

      // Mock due counts
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              overdue: '2',
              due_today: '3',
              due_this_week: '8',
              completed_this_week: '5',
            },
          ],
        })
      );

      // Mock completion metrics
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              completed: '10',
              total: '15',
              avg_completion_hours: '24.5',
            },
          ],
        })
      );

      const result = await taskService.getTaskStatistics('tenant-123');

      expect(result.isSuccess).toBe(true);
      const stats = result.getValue();
      expect(stats.byStatus.pending).toBe(5);
      expect(stats.byStatus.completed).toBe(10);
      expect(stats.overdue).toBe(2);
      expect(stats.dueToday).toBe(3);
      expect(stats.completionRate).toBe(67); // 10/15 * 100
    });
  });

  describe('getTasksByEntity', () => {
    it('should return tasks for a lead', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-1',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Lead Task 1',
              description: null,
              type: TaskType.FOLLOW_UP,
              priority: TaskPriority.HIGH,
              status: TaskStatus.PENDING,
              assigned_to: 'user-123',
              assigned_by: null,
              assigned_to_name: 'John',
              due_date: new Date('2025-01-10'),
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: now,
              updated_at: now,
            },
          ],
        })
      );

      const result = await taskService.getTasksByEntity(
        'tenant-123',
        TaskEntityType.LEAD,
        'lead-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().length).toBe(1);
      expect(result.getValue()[0].leadId).toBe('lead-123');
    });
  });

  describe('bulkOperation', () => {
    it('should complete multiple tasks', async () => {
      // Mock first task complete
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-1',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Task 1',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.COMPLETED,
              assigned_to: null,
              assigned_by: null,
              due_date: null,
              reminder_at: null,
              completed_at: new Date(),
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] })); // activity log

      // Mock second task complete
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-2',
              tenant_id: 'tenant-123',
              lead_id: 'lead-456',
              customer_id: null,
              opportunity_id: null,
              title: 'Task 2',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.MEDIUM,
              status: TaskStatus.COMPLETED,
              assigned_to: null,
              assigned_by: null,
              due_date: null,
              reminder_at: null,
              completed_at: new Date(),
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] })); // activity log

      const result = await taskService.bulkOperation(
        'tenant-123',
        {
          taskIds: ['task-1', 'task-2'],
          action: 'complete',
        },
        'user-123'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().successful.length).toBe(2);
      expect(result.getValue().failed.length).toBe(0);
    });
  });

  describe('isOverdue calculation', () => {
    it('should correctly identify overdue tasks', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5); // 5 days ago

      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'task-123',
              tenant_id: 'tenant-123',
              lead_id: 'lead-123',
              customer_id: null,
              opportunity_id: null,
              title: 'Overdue Task',
              description: null,
              type: TaskType.TASK,
              priority: TaskPriority.HIGH,
              status: TaskStatus.PENDING,
              assigned_to: null,
              assigned_by: null,
              due_date: pastDate,
              reminder_at: null,
              completed_at: null,
              is_recurring: false,
              recurrence_rule: null,
              tags: [],
              metadata: {},
              created_at: new Date(),
              updated_at: new Date(),
            },
          ],
        })
      );

      const result = await taskService.getTaskById('task-123', 'tenant-123');

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()?.isOverdue).toBe(true);
      expect(result.getValue()?.daysUntilDue).toBeLessThan(0);
    });
  });
});
