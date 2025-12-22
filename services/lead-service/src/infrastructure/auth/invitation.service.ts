/**
 * Invitation Service
 * Handles team invitations with tokens, expiration, and email notifications
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { UserRole, TenantMembership } from './types';
import { EmailService } from '../email/email.service';
import { EmailTemplate } from '../email/types';

/**
 * Invitation status enum
 */
export enum InvitationStatus {
  PENDING = 'pending',
  ACCEPTED = 'accepted',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  RESENT = 'resent',
}

/**
 * Invitation data
 */
export interface Invitation {
  id: string;
  tenantId: string;
  email: string;
  role: UserRole;
  token: string;
  status: InvitationStatus;
  invitedBy: string;
  inviterName?: string;
  customMessage?: string;
  expiresAt: Date;
  acceptedAt?: Date;
  acceptedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create invitation request
 */
export interface CreateInvitationRequest {
  email: string;
  role: UserRole;
  fullName?: string;
  message?: string;
}

/**
 * Bulk invitation request
 */
export interface BulkInvitationRequest {
  invitations: CreateInvitationRequest[];
}

/**
 * Bulk invitation result
 */
export interface BulkInvitationResult {
  sent: number;
  failed: Array<{
    email: string;
    error: string;
  }>;
}

/**
 * Invitation with tenant details
 */
export interface InvitationWithTenant extends Invitation {
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
}

@injectable()
export class InvitationService {
  // Default invitation expiration: 7 days
  private readonly INVITATION_EXPIRY_DAYS = 7;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    @inject(EmailService) private readonly emailService: EmailService
  ) {}

  /**
   * Generate a secure invitation token
   */
  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Calculate expiration date
   */
  private getExpirationDate(days: number = this.INVITATION_EXPIRY_DAYS): Date {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  /**
   * Get role display name
   */
  private getRoleName(role: UserRole): string {
    const roleNames: Record<UserRole, string> = {
      [UserRole.OWNER]: 'Owner',
      [UserRole.ADMIN]: 'Administrator',
      [UserRole.MANAGER]: 'Manager',
      [UserRole.SALES_REP]: 'Sales Representative',
      [UserRole.VIEWER]: 'Viewer',
    };
    return roleNames[role] || role;
  }

  /**
   * Create a new invitation
   */
  async createInvitation(
    tenantId: string,
    request: CreateInvitationRequest,
    invitedBy: string,
    inviterName: string
  ): Promise<Result<Invitation>> {
    try {
      // Check if user is already a member
      const existingMemberResult = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM tenant_memberships
         WHERE tenant_id = $1 AND user_id IN (
           SELECT id FROM users WHERE LOWER(email) = LOWER($2)
         )`,
        [tenantId, request.email]
      );

      if (existingMemberResult.isSuccess && existingMemberResult.value) {
        const count = parseInt(existingMemberResult.value.rows[0].count, 10);
        if (count > 0) {
          return Result.fail('User is already a member of this tenant');
        }
      }

      // Check for existing pending invitation
      const existingInviteResult = await this.pool.query<Invitation>(
        `SELECT * FROM user_invitations
         WHERE tenant_id = $1 AND LOWER(email) = LOWER($2) AND status = 'pending'
         AND expires_at > NOW()`,
        [tenantId, request.email]
      );

      if (existingInviteResult.isSuccess && existingInviteResult.value?.rows.length) {
        return Result.fail('A pending invitation already exists for this email');
      }

      const now = new Date();
      const invitationId = uuidv4();
      const token = this.generateToken();
      const expiresAt = this.getExpirationDate();

      // Create invitation record
      const result = await this.pool.query<Invitation>(
        `INSERT INTO user_invitations
         (id, tenant_id, email, role, token, status, invited_by, custom_message, expires_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING
           id,
           tenant_id as "tenantId",
           email,
           role,
           token,
           status,
           invited_by as "invitedBy",
           custom_message as "customMessage",
           expires_at as "expiresAt",
           accepted_at as "acceptedAt",
           accepted_by as "acceptedBy",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          invitationId,
          tenantId,
          request.email.toLowerCase(),
          request.role,
          token,
          InvitationStatus.PENDING,
          invitedBy,
          request.message || null,
          expiresAt,
          now,
          now,
        ]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to create invitation');
      }

      const invitation = result.value.rows[0];

      // Get tenant name for email
      const tenantResult = await this.pool.query<{ name: string }>(
        `SELECT name FROM tenants WHERE id = $1`,
        [tenantId]
      );

      const tenantName = tenantResult.value?.rows[0]?.name || 'Unknown';

      // Send invitation email
      await this.sendInvitationEmail(invitation, {
        tenantName,
        inviterName,
        inviteeName: request.fullName,
      });

      return Result.ok(invitation);
    } catch (error) {
      return Result.fail(`Invitation creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create multiple invitations at once
   */
  async createBulkInvitations(
    tenantId: string,
    request: BulkInvitationRequest,
    invitedBy: string,
    inviterName: string
  ): Promise<Result<BulkInvitationResult>> {
    const result: BulkInvitationResult = {
      sent: 0,
      failed: [],
    };

    for (const invitation of request.invitations) {
      const inviteResult = await this.createInvitation(
        tenantId,
        invitation,
        invitedBy,
        inviterName
      );

      if (inviteResult.isSuccess) {
        result.sent++;
      } else {
        result.failed.push({
          email: invitation.email,
          error: inviteResult.error || 'Unknown error',
        });
      }
    }

    return Result.ok(result);
  }

  /**
   * Get invitation by token
   */
  async getInvitationByToken(token: string): Promise<Result<InvitationWithTenant | null>> {
    try {
      const result = await this.pool.query<InvitationWithTenant>(
        `SELECT
          i.id,
          i.tenant_id as "tenantId",
          i.email,
          i.role,
          i.token,
          i.status,
          i.invited_by as "invitedBy",
          i.custom_message as "customMessage",
          i.expires_at as "expiresAt",
          i.accepted_at as "acceptedAt",
          i.accepted_by as "acceptedBy",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug
          ) as tenant
        FROM user_invitations i
        JOIN tenants t ON t.id = i.tenant_id
        WHERE i.token = $1`,
        [token]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitation by ID
   */
  async getInvitationById(invitationId: string): Promise<Result<Invitation | null>> {
    try {
      const result = await this.pool.query<Invitation>(
        `SELECT
          id,
          tenant_id as "tenantId",
          email,
          role,
          token,
          status,
          invited_by as "invitedBy",
          custom_message as "customMessage",
          expires_at as "expiresAt",
          accepted_at as "acceptedAt",
          accepted_by as "acceptedBy",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM user_invitations
        WHERE id = $1`,
        [invitationId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept invitation by token
   */
  async acceptInvitation(
    token: string,
    userId: string
  ): Promise<Result<TenantMembership>> {
    try {
      // Get invitation
      const invitationResult = await this.getInvitationByToken(token);
      if (invitationResult.isFailure || !invitationResult.value) {
        return Result.fail('Invalid or expired invitation token');
      }

      const invitation = invitationResult.value;

      // Check if expired
      if (new Date() > new Date(invitation.expiresAt)) {
        // Update status to expired
        await this.pool.query(
          `UPDATE user_invitations SET status = $1, updated_at = $2 WHERE id = $3`,
          [InvitationStatus.EXPIRED, new Date(), invitation.id]
        );
        return Result.fail('This invitation has expired');
      }

      // Check if already accepted
      if (invitation.status === InvitationStatus.ACCEPTED) {
        return Result.fail('This invitation has already been accepted');
      }

      // Check if cancelled
      if (invitation.status === InvitationStatus.CANCELLED) {
        return Result.fail('This invitation has been cancelled');
      }

      const now = new Date();
      const membershipId = uuidv4();

      // Create tenant membership
      const membershipResult = await this.pool.query<TenantMembership>(
        `INSERT INTO tenant_memberships
         (id, user_id, tenant_id, role, invited_by, invited_at, accepted_at, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING
           id,
           user_id as "userId",
           tenant_id as "tenantId",
           role,
           invited_by as "invitedBy",
           invited_at as "invitedAt",
           accepted_at as "acceptedAt",
           is_active as "isActive",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          membershipId,
          userId,
          invitation.tenantId,
          invitation.role,
          invitation.invitedBy,
          invitation.createdAt,
          now,
          true,
          now,
          now,
        ]
      );

      if (membershipResult.isFailure || !membershipResult.value) {
        return Result.fail(membershipResult.error || 'Failed to create membership');
      }

      // Update invitation status
      await this.pool.query(
        `UPDATE user_invitations
         SET status = $1, accepted_at = $2, accepted_by = $3, updated_at = $4
         WHERE id = $5`,
        [InvitationStatus.ACCEPTED, now, userId, now, invitation.id]
      );

      // Send notification to inviter
      await this.sendAcceptedNotification(invitation, userId);

      return Result.ok(membershipResult.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resend invitation
   */
  async resendInvitation(
    invitationId: string,
    inviterName: string
  ): Promise<Result<Invitation>> {
    try {
      const invitationResult = await this.getInvitationById(invitationId);
      if (invitationResult.isFailure || !invitationResult.value) {
        return Result.fail('Invitation not found');
      }

      const invitation = invitationResult.value;

      if (invitation.status === InvitationStatus.ACCEPTED) {
        return Result.fail('Cannot resend an accepted invitation');
      }

      if (invitation.status === InvitationStatus.CANCELLED) {
        return Result.fail('Cannot resend a cancelled invitation');
      }

      const now = new Date();
      const newToken = this.generateToken();
      const newExpiresAt = this.getExpirationDate();

      // Update invitation with new token and expiration
      const result = await this.pool.query<Invitation>(
        `UPDATE user_invitations
         SET token = $1, expires_at = $2, status = $3, updated_at = $4
         WHERE id = $5
         RETURNING
           id,
           tenant_id as "tenantId",
           email,
           role,
           token,
           status,
           invited_by as "invitedBy",
           custom_message as "customMessage",
           expires_at as "expiresAt",
           accepted_at as "acceptedAt",
           accepted_by as "acceptedBy",
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [newToken, newExpiresAt, InvitationStatus.PENDING, now, invitationId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to resend invitation');
      }

      const updatedInvitation = result.value.rows[0];

      // Get tenant name for email
      const tenantResult = await this.pool.query<{ name: string }>(
        `SELECT name FROM tenants WHERE id = $1`,
        [invitation.tenantId]
      );

      const tenantName = tenantResult.value?.rows[0]?.name || 'Unknown';

      // Resend email
      await this.sendInvitationEmail(updatedInvitation, {
        tenantName,
        inviterName,
      });

      return Result.ok(updatedInvitation);
    } catch (error) {
      return Result.fail(`Failed to resend invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Cancel invitation
   */
  async cancelInvitation(invitationId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `UPDATE user_invitations
         SET status = $1, updated_at = $2
         WHERE id = $3 AND status = 'pending'`,
        [InvitationStatus.CANCELLED, new Date(), invitationId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to cancel invitation');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to cancel invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending invitations for a tenant
   */
  async getPendingInvitations(tenantId: string): Promise<Result<Invitation[]>> {
    try {
      const result = await this.pool.query<Invitation>(
        `SELECT
          i.id,
          i.tenant_id as "tenantId",
          i.email,
          i.role,
          i.token,
          i.status,
          i.invited_by as "invitedBy",
          u.full_name as "inviterName",
          i.custom_message as "customMessage",
          i.expires_at as "expiresAt",
          i.accepted_at as "acceptedAt",
          i.accepted_by as "acceptedBy",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt"
        FROM user_invitations i
        LEFT JOIN users u ON u.id = i.invited_by
        WHERE i.tenant_id = $1 AND i.status = 'pending'
        ORDER BY i.created_at DESC`,
        [tenantId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(`Failed to get invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get invitations for a user email (pending invitations they can accept)
   */
  async getInvitationsForEmail(email: string): Promise<Result<InvitationWithTenant[]>> {
    try {
      const result = await this.pool.query<InvitationWithTenant>(
        `SELECT
          i.id,
          i.tenant_id as "tenantId",
          i.email,
          i.role,
          i.token,
          i.status,
          i.invited_by as "invitedBy",
          u.full_name as "inviterName",
          i.custom_message as "customMessage",
          i.expires_at as "expiresAt",
          i.created_at as "createdAt",
          i.updated_at as "updatedAt",
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug
          ) as tenant
        FROM user_invitations i
        JOIN tenants t ON t.id = i.tenant_id
        LEFT JOIN users u ON u.id = i.invited_by
        WHERE LOWER(i.email) = LOWER($1)
          AND i.status = 'pending'
          AND i.expires_at > NOW()
        ORDER BY i.created_at DESC`,
        [email]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(`Failed to get invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send invitation email
   */
  private async sendInvitationEmail(
    invitation: Invitation,
    context: {
      tenantName: string;
      inviterName: string;
      inviteeName?: string;
    }
  ): Promise<void> {
    const appUrl = process.env.APP_URL || 'http://localhost:3001';
    const acceptUrl = `${appUrl}/invite/accept?token=${invitation.token}`;

    await this.emailService.send({
      to: invitation.email,
      subject: `You've been invited to join ${context.tenantName}`,
      template: EmailTemplate.TEAM_INVITATION,
      variables: {
        tenantName: context.tenantName,
        inviterName: context.inviterName,
        inviteeName: context.inviteeName,
        roleName: this.getRoleName(invitation.role as UserRole),
        customMessage: invitation.customMessage,
        acceptUrl,
        expiresAt: new Date(invitation.expiresAt).toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
        appName: process.env.APP_NAME || 'Zuclubit CRM',
        supportEmail: process.env.SUPPORT_EMAIL || 'support@zuclubit.com',
        currentYear: new Date().getFullYear(),
      },
    });
  }

  /**
   * Send notification when invitation is accepted
   */
  private async sendAcceptedNotification(
    invitation: InvitationWithTenant,
    acceptedByUserId: string
  ): Promise<void> {
    try {
      // Get inviter info
      const inviterResult = await this.pool.query<{ email: string; full_name: string }>(
        `SELECT email, full_name FROM users WHERE id = $1`,
        [invitation.invitedBy]
      );

      // Get accepter info
      const accepterResult = await this.pool.query<{ email: string; full_name: string }>(
        `SELECT email, full_name FROM users WHERE id = $1`,
        [acceptedByUserId]
      );

      if (!inviterResult.value?.rows[0] || !accepterResult.value?.rows[0]) {
        return;
      }

      const inviter = inviterResult.value.rows[0];
      const accepter = accepterResult.value.rows[0];

      const appUrl = process.env.APP_URL || 'http://localhost:3001';

      await this.emailService.send({
        to: inviter.email,
        subject: `${accepter.full_name || invitation.email} has joined ${invitation.tenant.name}`,
        template: EmailTemplate.INVITATION_ACCEPTED,
        variables: {
          tenantName: invitation.tenant.name,
          inviterName: inviter.full_name || 'Team Admin',
          inviteeName: accepter.full_name || invitation.email,
          inviteeEmail: invitation.email,
          inviteeInitials: this.getInitials(accepter.full_name || invitation.email),
          roleName: this.getRoleName(invitation.role as UserRole),
          actionUrl: `${appUrl}/settings/team`,
          appName: process.env.APP_NAME || 'Zuclubit CRM',
          currentYear: new Date().getFullYear(),
        },
      });
    } catch (error) {
      // Log but don't fail the main operation
      console.error('Failed to send acceptance notification:', error);
    }
  }

  /**
   * Get initials from name
   */
  private getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  /**
   * Expire old invitations (cleanup job)
   */
  async expireOldInvitations(): Promise<Result<number>> {
    try {
      const result = await this.pool.query<{ count: string }>(
        `UPDATE user_invitations
         SET status = $1, updated_at = $2
         WHERE status = 'pending' AND expires_at < NOW()
         RETURNING id`,
        [InvitationStatus.EXPIRED, new Date()]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to expire invitations');
      }

      return Result.ok(result.value.rows.length);
    } catch (error) {
      return Result.fail(`Failed to expire invitations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
