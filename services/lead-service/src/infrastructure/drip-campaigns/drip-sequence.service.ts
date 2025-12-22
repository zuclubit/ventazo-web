/**
 * Drip Sequence Service
 *
 * Manages automated email/messaging sequences
 * Refactored to use DatabasePool with pool.query() pattern
 */

import { injectable } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import type {
  DripSequence,
  SequenceStep,
  SequenceEnrollment,
  StepExecution,
  SequenceAnalytics,
  SequenceSettings,
  StepContent,
  StepDelay,
  StepCondition,
  ABSplitConfig,
  StepAction,
  SequenceSearchFilters,
  EnrollmentSearchFilters,
  BulkEnrollmentRequest,
  BulkEnrollmentResult,
  SequenceDashboard,
  SequenceStatus,
  SequenceType,
  EnrollmentStatus,
  EnrollmentTriggerType,
  StepType,
  SequenceCondition,
} from './types';

// Row types for database results
interface SequenceRow {
  id: string;
  tenant_id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  enrollment_trigger: string;
  enrollment_conditions?: any;
  allow_reenrollment: boolean;
  reenrollment_cooldown_days?: number;
  exit_conditions?: any;
  goal_conditions?: any;
  settings: any;
  total_enrolled: number;
  active_enrollments: number;
  completed_count: number;
  conversion_count: number;
  tags: string[];
  folder_id?: string;
  owner_id: string;
  owner_name?: string;
  created_at: Date;
  updated_at: Date;
  created_by: string;
  published_at?: Date;
  archived_at?: Date;
}

interface StepRow {
  id: string;
  sequence_id: string;
  tenant_id: string;
  order_num: number;
  name: string;
  type: string;
  content?: any;
  delay?: any;
  condition?: any;
  ab_split?: any;
  action?: any;
  next_step_id?: string;
  true_branch_step_id?: string;
  false_branch_step_id?: string;
  is_active: boolean;
  sent?: number;
  delivered?: number;
  opened?: number;
  clicked?: number;
  replied?: number;
  bounced?: number;
  unsubscribed?: number;
  converted?: number;
  created_at: Date;
  updated_at: Date;
}

interface EnrollmentRow {
  id: string;
  sequence_id: string;
  tenant_id: string;
  contact_id: string;
  contact_email?: string;
  contact_name?: string;
  status: string;
  current_step_id?: string;
  current_step_order?: number;
  steps_completed: number;
  total_steps: number;
  percent_complete: number;
  enrolled_at: Date;
  next_step_at?: Date;
  paused_at?: Date;
  completed_at?: Date;
  unenrolled_at?: Date;
  total_sent: number;
  total_opened: number;
  total_clicked: number;
  total_replied: number;
  exit_reason?: string;
  goal_reached?: boolean;
  enrollment_source: string;
  enrolled_by?: string;
  enrollment_data?: any;
  created_at: Date;
  updated_at: Date;
}

@injectable()
export class DripSequenceService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(private pool: DatabasePool) {
    this.initializeEmailProvider().catch(err => {
      console.error('[DripSequenceService] Failed to initialize email provider:', err);
    });
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;

    try {
      const config = getResendConfig();
      if (config.isEnabled) {
        this.emailProvider = new ResendProvider();
        const result = await this.emailProvider.initialize({
          apiKey: config.apiKey,
          defaultFrom: config.fromEmail,
          defaultFromName: config.fromName,
        });
        if (result.isSuccess) {
          this.emailInitialized = true;
          console.log('[DripSequenceService] Email provider initialized successfully');
        }
      }
    } catch (error) {
      console.error('[DripSequenceService] Email initialization error:', error);
    }
  }

  // ============================================================================
  // Sequence CRUD
  // ============================================================================

  async createSequence(
    tenantId: string,
    input: {
      name: string;
      description?: string;
      type: SequenceType;
      enrollmentTrigger: EnrollmentTriggerType;
      enrollmentConditions?: SequenceCondition[];
      allowReenrollment?: boolean;
      reenrollmentCooldownDays?: number;
      exitConditions?: SequenceCondition[];
      goalConditions?: SequenceCondition[];
      settings?: Partial<SequenceSettings>;
      tags?: string[];
      folderId?: string;
    },
    userId: string
  ): Promise<Result<DripSequence>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const defaultSettings: SequenceSettings = {
        timezone: 'UTC',
        businessHoursOnly: false,
        trackOpens: true,
        trackClicks: true,
        pauseOnReply: false,
        pauseOnBounce: true,
        pauseOnUnsubscribe: true,
        excludeUnsubscribed: true,
        respectGlobalSuppressions: true,
        ...input.settings,
      };

      const result = await this.pool.query<SequenceRow>(`
        INSERT INTO drip_sequences (
          id, tenant_id, name, description, type, status, enrollment_trigger,
          enrollment_conditions, allow_reenrollment, reenrollment_cooldown_days,
          exit_conditions, goal_conditions, settings, total_enrolled, active_enrollments,
          completed_count, conversion_count, tags, folder_id, owner_id,
          created_at, updated_at, created_by
        ) VALUES (
          $1, $2, $3, $4, $5, 'draft', $6, $7, $8, $9, $10, $11, $12, 0, 0, 0, 0, $13, $14, $15, $16, $16, $15
        ) RETURNING *
      `, [
        id, tenantId, input.name, input.description, input.type, input.enrollmentTrigger,
        JSON.stringify(input.enrollmentConditions || []), input.allowReenrollment || false,
        input.reenrollmentCooldownDays, JSON.stringify(input.exitConditions || []),
        JSON.stringify(input.goalConditions || []), JSON.stringify(defaultSettings),
        input.tags || [], input.folderId, userId, now
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to create sequence');
      }

      return Result.ok(this.mapRowToSequence(result.getValue().rows[0], []));
    } catch (error) {
      return Result.fail(`Failed to create sequence: ${error}`);
    }
  }

  async getSequence(tenantId: string, sequenceId: string): Promise<Result<DripSequence>> {
    try {
      const result = await this.pool.query<SequenceRow>(`
        SELECT * FROM drip_sequences WHERE id = $1 AND tenant_id = $2
      `, [sequenceId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Sequence not found');
      }

      const stepsResult = await this.pool.query<StepRow>(`
        SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY order_num ASC
      `, [sequenceId]);

      const steps = stepsResult.isSuccess
        ? stepsResult.getValue().rows.map(this.mapRowToStep.bind(this))
        : [];

      return Result.ok(this.mapRowToSequence(rows[0], steps));
    } catch (error) {
      return Result.fail(`Failed to get sequence: ${error}`);
    }
  }

  async updateSequence(
    tenantId: string,
    sequenceId: string,
    input: Partial<{
      name: string;
      description: string;
      status: SequenceStatus;
      enrollmentTrigger: EnrollmentTriggerType;
      enrollmentConditions: SequenceCondition[];
      allowReenrollment: boolean;
      reenrollmentCooldownDays: number;
      exitConditions: SequenceCondition[];
      goalConditions: SequenceCondition[];
      settings: Partial<SequenceSettings>;
      tags: string[];
      folderId: string;
    }>
  ): Promise<Result<DripSequence>> {
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [sequenceId, tenantId];
      let paramIndex = 3;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        updates.push(`description = $${paramIndex++}`);
        values.push(input.description);
      }
      if (input.status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        values.push(input.status);
        if (input.status === 'active') {
          updates.push(`published_at = COALESCE(published_at, NOW())`);
        } else if (input.status === 'archived') {
          updates.push(`archived_at = NOW()`);
        }
      }
      if (input.enrollmentTrigger !== undefined) {
        updates.push(`enrollment_trigger = $${paramIndex++}`);
        values.push(input.enrollmentTrigger);
      }
      if (input.enrollmentConditions !== undefined) {
        updates.push(`enrollment_conditions = $${paramIndex++}`);
        values.push(JSON.stringify(input.enrollmentConditions));
      }
      if (input.allowReenrollment !== undefined) {
        updates.push(`allow_reenrollment = $${paramIndex++}`);
        values.push(input.allowReenrollment);
      }
      if (input.settings !== undefined) {
        updates.push(`settings = settings || $${paramIndex++}::jsonb`);
        values.push(JSON.stringify(input.settings));
      }
      if (input.tags !== undefined) {
        updates.push(`tags = $${paramIndex++}`);
        values.push(input.tags);
      }

      const result = await this.pool.query<SequenceRow>(`
        UPDATE drip_sequences SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *
      `, values);

      if (result.isFailure) {
        return Result.fail(result.error || 'Update failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Sequence not found');
      }

      const stepsResult = await this.pool.query<StepRow>(`
        SELECT * FROM sequence_steps WHERE sequence_id = $1 ORDER BY order_num ASC
      `, [sequenceId]);

      const steps = stepsResult.isSuccess
        ? stepsResult.getValue().rows.map(this.mapRowToStep.bind(this))
        : [];

      return Result.ok(this.mapRowToSequence(rows[0], steps));
    } catch (error) {
      return Result.fail(`Failed to update sequence: ${error}`);
    }
  }

  async deleteSequence(tenantId: string, sequenceId: string): Promise<Result<void>> {
    try {
      await this.pool.query(`DELETE FROM sequence_enrollments WHERE sequence_id = $1`, [sequenceId]);
      await this.pool.query(`DELETE FROM sequence_steps WHERE sequence_id = $1`, [sequenceId]);
      await this.pool.query(`DELETE FROM drip_sequences WHERE id = $1 AND tenant_id = $2`, [sequenceId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete sequence: ${error}`);
    }
  }

  async listSequences(
    tenantId: string,
    filters: SequenceSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ sequences: DripSequence[]; total: number; page: number; limit: number; hasMore: boolean }>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (filters.search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        values.push(`%${filters.search}%`);
        paramIndex++;
      }
      if (filters.type && filters.type.length > 0) {
        conditions.push(`type = ANY($${paramIndex++})`);
        values.push(filters.type);
      }
      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex++})`);
        values.push(filters.status);
      }
      if (filters.ownerId) {
        conditions.push(`owner_id = $${paramIndex++}`);
        values.push(filters.ownerId);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;

      const countResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM drip_sequences WHERE ${whereClause}
      `, values);

      const total = countResult.isSuccess ? parseInt(countResult.getValue().rows[0]?.count || '0', 10) : 0;

      const result = await this.pool.query<SequenceRow>(`
        SELECT * FROM drip_sequences WHERE ${whereClause}
        ORDER BY updated_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, [...values, limit, offset]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const sequences = result.getValue().rows.map((row) => this.mapRowToSequence(row, []));

      return Result.ok({
        sequences,
        total,
        page,
        limit,
        hasMore: offset + sequences.length < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list sequences: ${error}`);
    }
  }

  // ============================================================================
  // Step Operations
  // ============================================================================

  async addStep(
    tenantId: string,
    sequenceId: string,
    input: {
      name: string;
      type: StepType;
      order?: number;
      content?: StepContent;
      delay?: StepDelay;
      condition?: StepCondition;
      abSplit?: ABSplitConfig;
      action?: StepAction;
      nextStepId?: string;
    }
  ): Promise<Result<SequenceStep>> {
    try {
      const id = uuidv4();
      const now = new Date();

      let order = input.order;
      if (order === undefined) {
        const maxResult = await this.pool.query<{ max_order: number }>(`
          SELECT COALESCE(MAX(order_num), 0) as max_order FROM sequence_steps WHERE sequence_id = $1
        `, [sequenceId]);
        order = (maxResult.isSuccess ? maxResult.getValue().rows[0]?.max_order : 0) + 1;
      }

      const result = await this.pool.query<StepRow>(`
        INSERT INTO sequence_steps (
          id, sequence_id, tenant_id, order_num, name, type, content, delay, condition,
          ab_split, action, next_step_id, is_active, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, $13, $13
        ) RETURNING *
      `, [
        id, sequenceId, tenantId, order, input.name, input.type,
        input.content ? JSON.stringify(input.content) : null,
        input.delay ? JSON.stringify(input.delay) : null,
        input.condition ? JSON.stringify(input.condition) : null,
        input.abSplit ? JSON.stringify(input.abSplit) : null,
        input.action ? JSON.stringify(input.action) : null,
        input.nextStepId, now
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to add step');
      }

      return Result.ok(this.mapRowToStep(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to add step: ${error}`);
    }
  }

  async updateStep(
    tenantId: string,
    stepId: string,
    input: Partial<{
      name: string;
      type: StepType;
      order: number;
      content: StepContent;
      delay: StepDelay;
      condition: StepCondition;
      abSplit: ABSplitConfig;
      action: StepAction;
      nextStepId: string;
      isActive: boolean;
    }>
  ): Promise<Result<SequenceStep>> {
    try {
      const updates: string[] = ['updated_at = NOW()'];
      const values: any[] = [stepId, tenantId];
      let paramIndex = 3;

      if (input.name !== undefined) {
        updates.push(`name = $${paramIndex++}`);
        values.push(input.name);
      }
      if (input.type !== undefined) {
        updates.push(`type = $${paramIndex++}`);
        values.push(input.type);
      }
      if (input.order !== undefined) {
        updates.push(`order_num = $${paramIndex++}`);
        values.push(input.order);
      }
      if (input.content !== undefined) {
        updates.push(`content = $${paramIndex++}`);
        values.push(JSON.stringify(input.content));
      }
      if (input.delay !== undefined) {
        updates.push(`delay = $${paramIndex++}`);
        values.push(JSON.stringify(input.delay));
      }
      if (input.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(input.isActive);
      }

      const result = await this.pool.query<StepRow>(`
        UPDATE sequence_steps SET ${updates.join(', ')} WHERE id = $1 AND tenant_id = $2 RETURNING *
      `, values);

      if (result.isFailure) {
        return Result.fail(result.error || 'Update failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Step not found');
      }

      return Result.ok(this.mapRowToStep(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update step: ${error}`);
    }
  }

  async deleteStep(tenantId: string, stepId: string): Promise<Result<void>> {
    try {
      await this.pool.query(`DELETE FROM sequence_steps WHERE id = $1 AND tenant_id = $2`, [stepId, tenantId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete step: ${error}`);
    }
  }

  // ============================================================================
  // Enrollment Operations
  // ============================================================================

  async enrollContact(
    tenantId: string,
    sequenceId: string,
    contactId: string,
    options?: {
      contactEmail?: string;
      contactName?: string;
      enrollmentSource?: EnrollmentTriggerType;
      enrolledBy?: string;
      enrollmentData?: Record<string, unknown>;
    }
  ): Promise<Result<SequenceEnrollment>> {
    try {
      const existingResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM sequence_enrollments
        WHERE sequence_id = $1 AND contact_id = $2 AND status = 'active'
      `, [sequenceId, contactId]);

      if (existingResult.isSuccess && parseInt(existingResult.getValue().rows[0]?.count || '0', 10) > 0) {
        return Result.fail('Contact is already enrolled in this sequence');
      }

      const stepsResult = await this.pool.query<StepRow>(`
        SELECT * FROM sequence_steps WHERE sequence_id = $1 AND is_active = true ORDER BY order_num ASC LIMIT 1
      `, [sequenceId]);

      const firstStep = stepsResult.isSuccess ? stepsResult.getValue().rows[0] : null;

      const totalStepsResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM sequence_steps WHERE sequence_id = $1 AND is_active = true
      `, [sequenceId]);

      const totalSteps = totalStepsResult.isSuccess ? parseInt(totalStepsResult.getValue().rows[0]?.count || '0', 10) : 0;

      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<EnrollmentRow>(`
        INSERT INTO sequence_enrollments (
          id, sequence_id, tenant_id, contact_id, contact_email, contact_name,
          status, current_step_id, current_step_order, steps_completed, total_steps,
          percent_complete, enrolled_at, next_step_at, total_sent, total_opened,
          total_clicked, total_replied, enrollment_source, enrolled_by, enrollment_data,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, 'active', $7, $8, 0, $9, 0, $10, $10, 0, 0, 0, 0, $11, $12, $13, $10, $10
        ) RETURNING *
      `, [
        id, sequenceId, tenantId, contactId, options?.contactEmail, options?.contactName,
        firstStep?.id, firstStep?.order_num || 1, totalSteps, now,
        options?.enrollmentSource || 'manual', options?.enrolledBy,
        options?.enrollmentData ? JSON.stringify(options.enrollmentData) : null
      ]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to enroll contact');
      }

      await this.pool.query(`
        UPDATE drip_sequences
        SET total_enrolled = total_enrolled + 1, active_enrollments = active_enrollments + 1, updated_at = NOW()
        WHERE id = $1
      `, [sequenceId]);

      return Result.ok(this.mapRowToEnrollment(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(`Failed to enroll contact: ${error}`);
    }
  }

  async bulkEnroll(tenantId: string, request: BulkEnrollmentRequest): Promise<Result<BulkEnrollmentResult>> {
    try {
      const result: BulkEnrollmentResult = {
        sequenceId: request.sequenceId,
        totalRequested: request.contactIds.length,
        successfulEnrollments: 0,
        failedEnrollments: 0,
        skippedAlreadyEnrolled: 0,
        skippedSuppressed: 0,
        enrollmentIds: [],
        errors: [],
      };

      for (const contactId of request.contactIds) {
        const enrollResult = await this.enrollContact(tenantId, request.sequenceId, contactId, {
          enrollmentSource: 'api',
          enrollmentData: request.enrollmentData,
        });

        if (enrollResult.isSuccess) {
          result.successfulEnrollments++;
          result.enrollmentIds.push(enrollResult.getValue().id);
        } else {
          if (enrollResult.error?.includes('already enrolled')) {
            result.skippedAlreadyEnrolled++;
          } else {
            result.failedEnrollments++;
            result.errors!.push({ contactId, reason: enrollResult.error || 'Unknown error' });
          }
        }
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to bulk enroll: ${error}`);
    }
  }

  async unenrollContact(tenantId: string, enrollmentId: string, reason?: string): Promise<Result<SequenceEnrollment>> {
    try {
      const result = await this.pool.query<EnrollmentRow>(`
        UPDATE sequence_enrollments
        SET status = 'unenrolled', unenrolled_at = NOW(), exit_reason = $3, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 RETURNING *
      `, [enrollmentId, tenantId, reason || 'Manual unenrollment']);

      if (result.isFailure) {
        return Result.fail(result.error || 'Unenroll failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Enrollment not found');
      }

      await this.pool.query(`
        UPDATE drip_sequences SET active_enrollments = active_enrollments - 1, updated_at = NOW()
        WHERE id = $1 AND active_enrollments > 0
      `, [rows[0].sequence_id]);

      return Result.ok(this.mapRowToEnrollment(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to unenroll contact: ${error}`);
    }
  }

  async pauseEnrollment(tenantId: string, enrollmentId: string): Promise<Result<SequenceEnrollment>> {
    try {
      const result = await this.pool.query<EnrollmentRow>(`
        UPDATE sequence_enrollments
        SET status = 'paused', paused_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'active' RETURNING *
      `, [enrollmentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Pause failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Enrollment not found or not active');
      }

      return Result.ok(this.mapRowToEnrollment(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to pause enrollment: ${error}`);
    }
  }

  async resumeEnrollment(tenantId: string, enrollmentId: string): Promise<Result<SequenceEnrollment>> {
    try {
      const result = await this.pool.query<EnrollmentRow>(`
        UPDATE sequence_enrollments
        SET status = 'active', paused_at = NULL, updated_at = NOW()
        WHERE id = $1 AND tenant_id = $2 AND status = 'paused' RETURNING *
      `, [enrollmentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Resume failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Enrollment not found or not paused');
      }

      return Result.ok(this.mapRowToEnrollment(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to resume enrollment: ${error}`);
    }
  }

  async getEnrollment(tenantId: string, enrollmentId: string): Promise<Result<SequenceEnrollment>> {
    try {
      const result = await this.pool.query<EnrollmentRow>(`
        SELECT * FROM sequence_enrollments WHERE id = $1 AND tenant_id = $2
      `, [enrollmentId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Enrollment not found');
      }

      return Result.ok(this.mapRowToEnrollment(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get enrollment: ${error}`);
    }
  }

  async listEnrollments(
    tenantId: string,
    filters: EnrollmentSearchFilters = {},
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ enrollments: SequenceEnrollment[]; total: number; page: number; limit: number; hasMore: boolean }>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const values: any[] = [tenantId];
      let paramIndex = 2;

      if (filters.sequenceId) {
        conditions.push(`sequence_id = $${paramIndex++}`);
        values.push(filters.sequenceId);
      }
      if (filters.contactId) {
        conditions.push(`contact_id = $${paramIndex++}`);
        values.push(filters.contactId);
      }
      if (filters.status && filters.status.length > 0) {
        conditions.push(`status = ANY($${paramIndex++})`);
        values.push(filters.status);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * limit;

      const countResult = await this.pool.query<{ count: string }>(`
        SELECT COUNT(*) as count FROM sequence_enrollments WHERE ${whereClause}
      `, values);

      const total = countResult.isSuccess ? parseInt(countResult.getValue().rows[0]?.count || '0', 10) : 0;

      const result = await this.pool.query<EnrollmentRow>(`
        SELECT * FROM sequence_enrollments WHERE ${whereClause}
        ORDER BY enrolled_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `, [...values, limit, offset]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const enrollments = result.getValue().rows.map((row) => this.mapRowToEnrollment(row));

      return Result.ok({
        enrollments,
        total,
        page,
        limit,
        hasMore: offset + enrollments.length < total,
      });
    } catch (error) {
      return Result.fail(`Failed to list enrollments: ${error}`);
    }
  }

  // ============================================================================
  // Analytics
  // ============================================================================

  async getSequenceAnalytics(
    tenantId: string,
    sequenceId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'all_time' = 'all_time'
  ): Promise<Result<SequenceAnalytics>> {
    try {
      let periodStart: Date | undefined;
      const now = new Date();

      switch (period) {
        case 'day':
          periodStart = new Date(now);
          periodStart.setHours(0, 0, 0, 0);
          break;
        case 'week':
          periodStart = new Date(now);
          periodStart.setDate(periodStart.getDate() - 7);
          break;
        case 'month':
          periodStart = new Date(now);
          periodStart.setMonth(periodStart.getMonth() - 1);
          break;
        case 'quarter':
          periodStart = new Date(now);
          periodStart.setMonth(periodStart.getMonth() - 3);
          break;
      }

      const dateFilter = periodStart ? 'AND enrolled_at >= $3' : '';
      const dateParams = periodStart ? [sequenceId, tenantId, periodStart] : [sequenceId, tenantId];

      const result = await this.pool.query<{
        total: string;
        active: string;
        completed: string;
        total_sent: string;
        total_opened: string;
        total_clicked: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COALESCE(SUM(total_sent), 0) as total_sent,
          COALESCE(SUM(total_opened), 0) as total_opened,
          COALESCE(SUM(total_clicked), 0) as total_clicked
        FROM sequence_enrollments WHERE sequence_id = $1 AND tenant_id = $2 ${dateFilter}
      `, dateParams);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      const data = result.getValue().rows[0];
      const totalSent = parseInt(data.total_sent || '0', 10);
      const totalOpened = parseInt(data.total_opened || '0', 10);
      const totalClicked = parseInt(data.total_clicked || '0', 10);
      const totalEnrollments = parseInt(data.total || '0', 10);
      const completedEnrollments = parseInt(data.completed || '0', 10);

      return Result.ok({
        sequenceId,
        tenantId,
        period,
        periodStart,
        periodEnd: now,
        totalEnrollments,
        activeEnrollments: parseInt(data.active || '0', 10),
        completedEnrollments,
        unenrolledCount: 0,
        totalSent,
        totalDelivered: totalSent,
        totalOpened,
        totalClicked,
        totalReplied: 0,
        totalBounced: 0,
        totalUnsubscribed: 0,
        deliveryRate: totalSent > 0 ? 100 : 0,
        openRate: totalSent > 0 ? (totalOpened / totalSent) * 100 : 0,
        clickRate: totalSent > 0 ? (totalClicked / totalSent) * 100 : 0,
        replyRate: 0,
        bounceRate: 0,
        unsubscribeRate: 0,
        completionRate: totalEnrollments > 0 ? (completedEnrollments / totalEnrollments) * 100 : 0,
        totalConversions: 0,
        conversionRate: 0,
        calculatedAt: now,
      });
    } catch (error) {
      return Result.fail(`Failed to get analytics: ${error}`);
    }
  }

  async getDashboard(tenantId: string): Promise<Result<SequenceDashboard>> {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      const seqResult = await this.pool.query<{
        total: string;
        active: string;
        draft: string;
        paused: string;
      }>(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE status = 'draft') as draft,
          COUNT(*) FILTER (WHERE status = 'paused') as paused
        FROM drip_sequences WHERE tenant_id = $1
      `, [tenantId]);

      const enrollResult = await this.pool.query<{
        active: string;
        today: string;
      }>(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'active') as active,
          COUNT(*) FILTER (WHERE enrolled_at >= $2) as today
        FROM sequence_enrollments WHERE tenant_id = $1
      `, [tenantId, startOfDay]);

      const seqData = seqResult.isSuccess ? seqResult.getValue().rows[0] : { total: '0', active: '0', draft: '0', paused: '0' };
      const enrollData = enrollResult.isSuccess ? enrollResult.getValue().rows[0] : { active: '0', today: '0' };

      return Result.ok({
        tenantId,
        totalSequences: parseInt(seqData.total || '0', 10),
        activeSequences: parseInt(seqData.active || '0', 10),
        draftSequences: parseInt(seqData.draft || '0', 10),
        pausedSequences: parseInt(seqData.paused || '0', 10),
        totalActiveEnrollments: parseInt(enrollData.active || '0', 10),
        enrollmentsToday: parseInt(enrollData.today || '0', 10),
        completionsToday: 0,
        avgOpenRate: 0,
        avgClickRate: 0,
        avgCompletionRate: 0,
        avgConversionRate: 0,
        topPerformingSequences: [],
        lowPerformingSequences: [],
        upcomingSteps: [],
        recentEnrollments: [],
        recentCompletions: [],
      });
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  // ============================================================================
  // Step Execution (Email Sending)
  // ============================================================================

  /**
   * Execute a sequence step for an enrollment
   * This method sends the actual email for email-type steps
   */
  async executeStep(
    tenantId: string,
    enrollmentId: string,
    stepId: string
  ): Promise<Result<StepExecution>> {
    try {
      // Get enrollment
      const enrollmentResult = await this.getEnrollment(tenantId, enrollmentId);
      if (enrollmentResult.isFailure) {
        return Result.fail(enrollmentResult.error || 'Enrollment not found');
      }
      const enrollment = enrollmentResult.getValue();

      // Get step
      const stepResult = await this.pool.query<StepRow>(`
        SELECT * FROM sequence_steps WHERE id = $1 AND tenant_id = $2
      `, [stepId, tenantId]);

      if (stepResult.isFailure || stepResult.getValue().rows.length === 0) {
        return Result.fail('Step not found');
      }

      const step = this.mapRowToStep(stepResult.getValue().rows[0]);
      const executionId = uuidv4();
      const now = new Date();

      // Execute based on step type
      if (step.type === 'email' && step.content) {
        if (!this.emailProvider) {
          console.warn('[DripSequenceService] Email provider not initialized, skipping email send');
          return Result.fail('Email provider not configured');
        }

        if (!enrollment.contactEmail) {
          return Result.fail('Contact email not available');
        }

        try {
          const appConfig = getAppConfig();
          const content = step.content;

          // Replace variables in subject and body
          const variables: Record<string, string> = {
            contactName: enrollment.contactName || 'Cliente',
            contactEmail: enrollment.contactEmail,
            sequenceId: enrollment.sequenceId,
            stepName: step.name,
            unsubscribeUrl: `${appConfig.appUrl}/unsubscribe/${enrollment.id}`,
            ...enrollment.enrollmentData as Record<string, string>,
          };

          // Send email
          const emailResult = await this.emailProvider.send({
            to: enrollment.contactEmail,
            subject: this.replaceVariables(content.subject || step.name, variables),
            template: EmailTemplate.DRIP_CAMPAIGN_EMAIL,
            variables: {
              ...variables,
              emailBody: this.replaceVariables(content.body || '', variables),
              previewText: content.previewText || '',
            },
            tags: [
              { name: 'type', value: 'drip-sequence' },
              { name: 'sequenceId', value: enrollment.sequenceId },
              { name: 'stepId', value: step.id },
              { name: 'enrollmentId', value: enrollment.id },
            ],
          });

          if (emailResult.isFailure) {
            console.error(`[DripSequenceService] Failed to send drip email: ${emailResult.error}`);

            // Log execution as failed
            await this.pool.query(`
              INSERT INTO step_executions (id, enrollment_id, step_id, tenant_id, status, error, executed_at, created_at, updated_at)
              VALUES ($1, $2, $3, $4, 'failed', $5, $6, $6, $6)
            `, [executionId, enrollmentId, stepId, tenantId, emailResult.error, now]);

            return Result.fail(emailResult.error || 'Failed to send email');
          }

          console.log(`[DripSequenceService] Drip email sent to ${enrollment.contactEmail} for step ${step.name}`);

          // Update step metrics
          await this.pool.query(`
            UPDATE sequence_steps SET sent = COALESCE(sent, 0) + 1, updated_at = NOW() WHERE id = $1
          `, [stepId]);

          // Update enrollment metrics
          await this.pool.query(`
            UPDATE sequence_enrollments
            SET total_sent = total_sent + 1,
                steps_completed = steps_completed + 1,
                percent_complete = CASE WHEN total_steps > 0 THEN ((steps_completed + 1)::decimal / total_steps * 100) ELSE 0 END,
                updated_at = NOW()
            WHERE id = $1
          `, [enrollmentId]);

          // Log successful execution
          await this.pool.query(`
            INSERT INTO step_executions (id, enrollment_id, step_id, tenant_id, status, executed_at, created_at, updated_at)
            VALUES ($1, $2, $3, $4, 'sent', $5, $5, $5)
          `, [executionId, enrollmentId, stepId, tenantId, now]);

          return Result.ok({
            id: executionId,
            enrollmentId,
            stepId,
            tenantId,
            status: 'sent' as const,
            executedAt: now,
            createdAt: now,
            updatedAt: now,
          });

        } catch (emailError) {
          console.error('[DripSequenceService] Email execution error:', emailError);
          return Result.fail(`Email execution failed: ${emailError}`);
        }
      }

      // For non-email steps (action, condition, wait), just log execution
      await this.pool.query(`
        INSERT INTO step_executions (id, enrollment_id, step_id, tenant_id, status, executed_at, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'completed', $5, $5, $5)
      `, [executionId, enrollmentId, stepId, tenantId, now]);

      return Result.ok({
        id: executionId,
        enrollmentId,
        stepId,
        tenantId,
        status: 'completed' as const,
        executedAt: now,
        createdAt: now,
        updatedAt: now,
      });

    } catch (error) {
      return Result.fail(`Failed to execute step: ${error}`);
    }
  }

  /**
   * Process pending steps for all active enrollments
   * This should be called by a scheduler/cron job
   */
  async processPendingSteps(tenantId: string): Promise<Result<{ processed: number; errors: number }>> {
    try {
      // Find enrollments with steps due for execution
      const result = await this.pool.query<EnrollmentRow>(`
        SELECT * FROM sequence_enrollments
        WHERE tenant_id = $1
          AND status = 'active'
          AND next_step_at <= NOW()
          AND current_step_id IS NOT NULL
        ORDER BY next_step_at ASC
        LIMIT 100
      `, [tenantId]);

      if (result.isFailure) {
        return Result.fail(result.error || 'Query failed');
      }

      let processed = 0;
      let errors = 0;

      for (const row of result.getValue().rows) {
        const enrollment = this.mapRowToEnrollment(row);

        if (enrollment.currentStepId) {
          const executeResult = await this.executeStep(tenantId, enrollment.id, enrollment.currentStepId);

          if (executeResult.isSuccess) {
            processed++;

            // Move to next step
            await this.advanceToNextStep(tenantId, enrollment.id);
          } else {
            errors++;
            console.error(`[DripSequenceService] Failed to process step for enrollment ${enrollment.id}: ${executeResult.error}`);
          }
        }
      }

      return Result.ok({ processed, errors });
    } catch (error) {
      return Result.fail(`Failed to process pending steps: ${error}`);
    }
  }

  /**
   * Advance enrollment to the next step in the sequence
   */
  private async advanceToNextStep(tenantId: string, enrollmentId: string): Promise<Result<void>> {
    try {
      // Get current enrollment
      const enrollmentResult = await this.getEnrollment(tenantId, enrollmentId);
      if (enrollmentResult.isFailure) {
        return Result.fail(enrollmentResult.error || 'Enrollment not found');
      }
      const enrollment = enrollmentResult.getValue();

      if (!enrollment.currentStepId) {
        return Result.fail('No current step');
      }

      // Get current step to find next step
      const currentStepResult = await this.pool.query<StepRow>(`
        SELECT * FROM sequence_steps WHERE id = $1
      `, [enrollment.currentStepId]);

      if (currentStepResult.isFailure || currentStepResult.getValue().rows.length === 0) {
        return Result.fail('Current step not found');
      }

      const currentStep = currentStepResult.getValue().rows[0];

      // Find next step (by order or explicit next_step_id)
      let nextStepQuery = '';
      let nextStepParams: unknown[] = [];

      if (currentStep.next_step_id) {
        nextStepQuery = `SELECT * FROM sequence_steps WHERE id = $1 AND is_active = true`;
        nextStepParams = [currentStep.next_step_id];
      } else {
        nextStepQuery = `
          SELECT * FROM sequence_steps
          WHERE sequence_id = $1 AND order_num > $2 AND is_active = true
          ORDER BY order_num ASC LIMIT 1
        `;
        nextStepParams = [enrollment.sequenceId, currentStep.order_num];
      }

      const nextStepResult = await this.pool.query<StepRow>(nextStepQuery, nextStepParams);

      if (nextStepResult.isSuccess && nextStepResult.getValue().rows.length > 0) {
        const nextStep = nextStepResult.getValue().rows[0];

        // Calculate next execution time based on step delay
        const delay = nextStep.delay ? (typeof nextStep.delay === 'string' ? JSON.parse(nextStep.delay) : nextStep.delay) : null;
        const nextStepAt = this.calculateNextStepTime(delay);

        await this.pool.query(`
          UPDATE sequence_enrollments
          SET current_step_id = $1, current_step_order = $2, next_step_at = $3, updated_at = NOW()
          WHERE id = $4
        `, [nextStep.id, nextStep.order_num, nextStepAt, enrollmentId]);
      } else {
        // No more steps - mark as completed
        await this.pool.query(`
          UPDATE sequence_enrollments
          SET status = 'completed', completed_at = NOW(), current_step_id = NULL, next_step_at = NULL, updated_at = NOW()
          WHERE id = $1
        `, [enrollmentId]);

        // Update sequence completion count
        await this.pool.query(`
          UPDATE drip_sequences
          SET completed_count = completed_count + 1, active_enrollments = active_enrollments - 1, updated_at = NOW()
          WHERE id = $1 AND active_enrollments > 0
        `, [enrollment.sequenceId]);
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to advance to next step: ${error}`);
    }
  }

  private calculateNextStepTime(delay: StepDelay | null): Date {
    const now = new Date();
    if (!delay) {
      return now; // Execute immediately if no delay
    }

    const delayMs = this.getDelayInMs(delay);
    return new Date(now.getTime() + delayMs);
  }

  private getDelayInMs(delay: StepDelay): number {
    const value = delay.value || 0;
    switch (delay.unit) {
      case 'minutes': return value * 60 * 1000;
      case 'hours': return value * 60 * 60 * 1000;
      case 'days': return value * 24 * 60 * 60 * 1000;
      case 'weeks': return value * 7 * 24 * 60 * 60 * 1000;
      default: return 0;
    }
  }

  private replaceVariables(text: string, variables: Record<string, string>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key] !== undefined ? variables[key] : match;
    });
  }

  // ============================================================================
  // Helper Methods
  // ============================================================================

  private mapRowToSequence(row: SequenceRow, steps: SequenceStep[]): DripSequence {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      type: row.type as SequenceType,
      status: row.status as SequenceStatus,
      enrollmentTrigger: row.enrollment_trigger as EnrollmentTriggerType,
      enrollmentConditions: typeof row.enrollment_conditions === 'string'
        ? JSON.parse(row.enrollment_conditions)
        : (row.enrollment_conditions || []),
      allowReenrollment: row.allow_reenrollment,
      reenrollmentCooldownDays: row.reenrollment_cooldown_days,
      exitConditions: typeof row.exit_conditions === 'string'
        ? JSON.parse(row.exit_conditions)
        : (row.exit_conditions || []),
      goalConditions: typeof row.goal_conditions === 'string'
        ? JSON.parse(row.goal_conditions)
        : (row.goal_conditions || []),
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      steps,
      totalEnrolled: row.total_enrolled,
      activeEnrollments: row.active_enrollments,
      completedCount: row.completed_count,
      conversionCount: row.conversion_count,
      conversionRate: row.total_enrolled > 0 ? (row.conversion_count / row.total_enrolled) * 100 : undefined,
      tags: row.tags || [],
      folderId: row.folder_id,
      ownerId: row.owner_id,
      ownerName: row.owner_name,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      publishedAt: row.published_at,
      archivedAt: row.archived_at,
    };
  }

  private mapRowToStep(row: StepRow): SequenceStep {
    return {
      id: row.id,
      sequenceId: row.sequence_id,
      tenantId: row.tenant_id,
      order: row.order_num,
      name: row.name,
      type: row.type as StepType,
      content: row.content ? (typeof row.content === 'string' ? JSON.parse(row.content) : row.content) : undefined,
      delay: row.delay ? (typeof row.delay === 'string' ? JSON.parse(row.delay) : row.delay) : undefined,
      condition: row.condition ? (typeof row.condition === 'string' ? JSON.parse(row.condition) : row.condition) : undefined,
      abSplit: row.ab_split ? (typeof row.ab_split === 'string' ? JSON.parse(row.ab_split) : row.ab_split) : undefined,
      action: row.action ? (typeof row.action === 'string' ? JSON.parse(row.action) : row.action) : undefined,
      nextStepId: row.next_step_id,
      trueBranchStepId: row.true_branch_step_id,
      falseBranchStepId: row.false_branch_step_id,
      isActive: row.is_active,
      sent: row.sent,
      delivered: row.delivered,
      opened: row.opened,
      clicked: row.clicked,
      replied: row.replied,
      bounced: row.bounced,
      unsubscribed: row.unsubscribed,
      converted: row.converted,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private mapRowToEnrollment(row: EnrollmentRow): SequenceEnrollment {
    return {
      id: row.id,
      sequenceId: row.sequence_id,
      tenantId: row.tenant_id,
      contactId: row.contact_id,
      contactEmail: row.contact_email,
      contactName: row.contact_name,
      status: row.status as EnrollmentStatus,
      currentStepId: row.current_step_id,
      currentStepOrder: row.current_step_order,
      stepsCompleted: row.steps_completed,
      totalSteps: row.total_steps,
      percentComplete: row.percent_complete,
      enrolledAt: row.enrolled_at,
      nextStepAt: row.next_step_at,
      pausedAt: row.paused_at,
      completedAt: row.completed_at,
      unenrolledAt: row.unenrolled_at,
      totalSent: row.total_sent,
      totalOpened: row.total_opened,
      totalClicked: row.total_clicked,
      totalReplied: row.total_replied,
      exitReason: row.exit_reason,
      goalReached: row.goal_reached,
      enrollmentSource: row.enrollment_source as EnrollmentTriggerType,
      enrolledBy: row.enrolled_by,
      enrollmentData: row.enrollment_data
        ? (typeof row.enrollment_data === 'string' ? JSON.parse(row.enrollment_data) : row.enrollment_data)
        : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}
