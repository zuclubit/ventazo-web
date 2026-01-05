/**
 * Onboarding Service
 * Handles user onboarding progress tracking and audit logging
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';

/**
 * Onboarding status types
 */
export type OnboardingStatus =
  | 'not_started'
  | 'profile_created'
  | 'business_created'
  | 'setup_completed'
  | 'team_invited'
  | 'completed';

/**
 * Onboarding step names
 */
export type OnboardingStep =
  | 'signup'
  | 'create-business'
  | 'branding'
  | 'modules'
  | 'business-hours'
  | 'invite-team'
  | 'complete';

/**
 * User onboarding record
 */
export interface UserOnboarding {
  id: string;
  userId: string;
  status: OnboardingStatus;
  currentStep: number;
  completedSteps: string[];
  metadata: Record<string, unknown>;
  startedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Audit log entry
 */
export interface AuditLogEntry {
  id: string;
  tenantId: string | null;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown>;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Onboarding audit actions
 */
export type OnboardingAuditAction =
  | 'user_signup'
  | 'tenant_created'
  | 'branding_updated'
  | 'modules_updated'
  | 'business_hours_updated'
  | 'invitation_sent'
  | 'invitation_accepted'
  | 'invitation_cancelled'
  | 'onboarding_completed'
  | 'user_login'
  | 'tenant_switched';

@injectable()
export class OnboardingService {
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
        console.log('[OnboardingService] Email provider initialized');
      }
    }
  }

  /**
   * Get onboarding status for a user
   */
  async getOnboardingStatus(userId: string): Promise<Result<UserOnboarding | null>> {
    try {
      const result = await this.pool.query<UserOnboarding>(
        `SELECT
          id,
          user_id as "userId",
          status,
          current_step as "currentStep",
          completed_steps as "completedSteps",
          metadata,
          started_at as "startedAt",
          completed_at as "completedAt",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM user_onboarding
        WHERE user_id = $1`,
        [userId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get onboarding status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Initialize onboarding for a new user
   */
  async initializeOnboarding(userId: string): Promise<Result<UserOnboarding>> {
    try {
      const now = new Date();
      const id = uuidv4();

      const result = await this.pool.query<UserOnboarding>(
        `INSERT INTO user_onboarding (id, user_id, status, current_step, completed_steps, metadata, started_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at
         RETURNING
           id,
           user_id as "userId",
           status,
           current_step as "currentStep",
           completed_steps as "completedSteps",
           metadata,
           started_at as "startedAt",
           completed_at as "completedAt",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          id,
          userId,
          'not_started',
          0,
          JSON.stringify([]),
          JSON.stringify({}),
          now,
          now,
          now,
        ]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to initialize onboarding');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to initialize onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update onboarding progress
   */
  async updateOnboardingProgress(
    userId: string,
    status: OnboardingStatus,
    currentStep: number,
    completedSteps: string[]
  ): Promise<Result<UserOnboarding>> {
    try {
      const now = new Date();
      const isCompleted = status === 'completed';

      const result = await this.pool.query<UserOnboarding>(
        `INSERT INTO user_onboarding (id, user_id, status, current_step, completed_steps, metadata, started_at, completed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status,
           current_step = EXCLUDED.current_step,
           completed_steps = EXCLUDED.completed_steps,
           completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN EXCLUDED.updated_at ELSE user_onboarding.completed_at END,
           updated_at = EXCLUDED.updated_at
         RETURNING
           id,
           user_id as "userId",
           status,
           current_step as "currentStep",
           completed_steps as "completedSteps",
           metadata,
           started_at as "startedAt",
           completed_at as "completedAt",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          uuidv4(),
          userId,
          status,
          currentStep,
          JSON.stringify(completedSteps),
          JSON.stringify({}),
          now,
          isCompleted ? now : null,
          now,
          now,
        ]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to update onboarding progress');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Complete a specific step
   */
  async completeStep(userId: string, step: OnboardingStep): Promise<Result<UserOnboarding>> {
    try {
      // First get current onboarding status
      const currentResult = await this.getOnboardingStatus(userId);
      if (currentResult.isFailure) {
        return Result.fail(currentResult.error || 'Failed to get current status');
      }

      const current = currentResult.value;
      const completedSteps = current?.completedSteps || [];

      // Add step if not already completed
      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      // Determine new status based on completed steps
      const stepOrder: OnboardingStep[] = [
        'signup',
        'create-business',
        'branding',
        'modules',
        'business-hours',
        'invite-team',
        'complete',
      ];

      let newStatus: OnboardingStatus = 'not_started';
      const currentStepIndex = stepOrder.indexOf(step);

      if (step === 'complete' || completedSteps.includes('complete')) {
        newStatus = 'completed';
      } else if (step === 'invite-team' || completedSteps.includes('invite-team')) {
        newStatus = 'team_invited';
      } else if (step === 'business-hours' || step === 'modules' || step === 'branding') {
        newStatus = 'setup_completed';
      } else if (step === 'create-business') {
        newStatus = 'business_created';
      } else if (step === 'signup') {
        newStatus = 'profile_created';
      }

      return this.updateOnboardingProgress(userId, newStatus, currentStepIndex + 1, completedSteps);
    } catch (error) {
      return Result.fail(`Failed to complete step: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Mark onboarding as completed
   */
  async completeOnboarding(
    userId: string,
    tenantId?: string,
    userEmail?: string,
    userName?: string,
    tenantName?: string
  ): Promise<Result<UserOnboarding>> {
    try {
      const result = await this.completeStep(userId, 'complete');

      // Log audit event if tenant is specified
      if (tenantId && result.isSuccess) {
        await this.logAuditEvent(
          tenantId,
          userId,
          'onboarding_completed',
          'user_onboarding',
          userId,
          {
            completedAt: new Date().toISOString(),
          }
        );
      }

      // Send onboarding completion email
      if (result.isSuccess && this.emailProvider && userEmail) {
        try {
          const appConfig = getAppConfig();
          await this.emailProvider.send({
            to: userEmail,
            subject: '¡Bienvenido a Zuclubit CRM! Tu configuración está completa',
            template: EmailTemplate.ONBOARDING_COMPLETE,
            variables: {
              userName: userName || 'Usuario',
              tenantName: tenantName || 'Tu empresa',
              dashboardUrl: `${appConfig.appUrl}/dashboard`,
              supportEmail: 'support@zuclubit.com',
            },
            tags: [
              { name: 'type', value: 'onboarding-complete' },
              { name: 'userId', value: userId },
            ],
          });
          console.log(`[OnboardingService] Onboarding completion email sent to ${userEmail}`);
        } catch (emailError) {
          console.error('[OnboardingService] Failed to send onboarding completion email:', emailError);
        }
      }

      return result;
    } catch (error) {
      return Result.fail(`Failed to complete onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log an audit event
   */
  async logAuditEvent(
    tenantId: string | null,
    userId: string,
    action: OnboardingAuditAction | string,
    entityType: string,
    entityId: string,
    newValues: Record<string, unknown>,
    metadata?: Record<string, unknown>,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Result<AuditLogEntry>> {
    try {
      const id = uuidv4();
      const now = new Date();

      const result = await this.pool.query<AuditLogEntry>(
        `INSERT INTO audit_logs (id, tenant_id, user_id, action, entity_type, entity_id, new_values, metadata, ip_address, user_agent, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING
           id,
           tenant_id as "tenantId",
           user_id as "userId",
           action,
           entity_type as "entityType",
           entity_id as "entityId",
           old_values as "oldValues",
           new_values as "newValues",
           metadata,
           ip_address as "ipAddress",
           user_agent as "userAgent",
           created_at as "createdAt"`,
        [
          id,
          tenantId,
          userId,
          action,
          entityType,
          entityId,
          JSON.stringify(newValues),
          JSON.stringify({
            ...metadata,
            source: 'backend_api',
            timestamp: now.toISOString(),
          }),
          ipAddress || null,
          userAgent || null,
          now,
        ]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to log audit event');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error('Failed to log audit event:', error);
      return Result.fail(`Audit log failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Log user signup
   */
  async logUserSignup(userId: string, email: string): Promise<Result<AuditLogEntry>> {
    return this.logAuditEvent(null, userId, 'user_signup', 'user', userId, {
      email,
      signupAt: new Date().toISOString(),
    });
  }

  /**
   * Log tenant creation
   */
  async logTenantCreated(
    tenantId: string,
    userId: string,
    tenantData: { name: string; type?: string }
  ): Promise<Result<AuditLogEntry>> {
    return this.logAuditEvent(tenantId, userId, 'tenant_created', 'tenant', tenantId, {
      tenantName: tenantData.name,
      businessType: tenantData.type,
      createdAt: new Date().toISOString(),
    });
  }

  /**
   * Log onboarding completion
   */
  async logOnboardingCompleted(
    tenantId: string,
    userId: string,
    modulesEnabled: string[]
  ): Promise<Result<AuditLogEntry>> {
    return this.logAuditEvent(tenantId, userId, 'onboarding_completed', 'user_onboarding', userId, {
      completedAt: new Date().toISOString(),
      modulesEnabled,
    });
  }

  /**
   * Log user login
   */
  async logUserLogin(
    tenantId: string | null,
    userId: string,
    ipAddress?: string,
    userAgent?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.logAuditEvent(
      tenantId,
      userId,
      'user_login',
      'user',
      userId,
      { loginAt: new Date().toISOString() },
      {},
      ipAddress,
      userAgent
    );
  }

  /**
   * Get audit logs for a user or tenant
   */
  async getAuditLogs(
    options: {
      tenantId?: string;
      userId?: string;
      action?: string;
      entityType?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ logs: AuditLogEntry[]; total: number }>> {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (options.tenantId) {
        conditions.push(`tenant_id = $${paramIndex++}`);
        params.push(options.tenantId);
      }

      if (options.userId) {
        conditions.push(`user_id = $${paramIndex++}`);
        params.push(options.userId);
      }

      if (options.action) {
        conditions.push(`action = $${paramIndex++}`);
        params.push(options.action);
      }

      if (options.entityType) {
        conditions.push(`entity_type = $${paramIndex++}`);
        params.push(options.entityType);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
      const limit = options.limit || 50;
      const offset = options.offset || 0;

      // Get total count
      const countResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM audit_logs ${whereClause}`,
        params
      );

      if (countResult.isFailure || !countResult.value) {
        return Result.fail(countResult.error || 'Count query failed');
      }

      const total = parseInt(countResult.value.rows[0].count, 10);

      // Get logs
      const logsResult = await this.pool.query<AuditLogEntry>(
        `SELECT
          id,
          tenant_id as "tenantId",
          user_id as "userId",
          action,
          entity_type as "entityType",
          entity_id as "entityId",
          old_values as "oldValues",
          new_values as "newValues",
          metadata,
          ip_address as "ipAddress",
          user_agent as "userAgent",
          created_at as "createdAt"
        FROM audit_logs
        ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
        [...params, limit, offset]
      );

      if (logsResult.isFailure || !logsResult.value) {
        return Result.fail(logsResult.error || 'Logs query failed');
      }

      return Result.ok({
        logs: logsResult.value.rows,
        total,
      });
    } catch (error) {
      return Result.fail(`Failed to get audit logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
