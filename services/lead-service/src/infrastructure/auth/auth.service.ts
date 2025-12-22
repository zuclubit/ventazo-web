/**
 * Authentication Service
 * Handles user authentication, tenant memberships, and user management
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { createClient, SupabaseClient, User as SupabaseUser } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import {
  UserRole,
  Permission,
  AuthUser,
  TenantMembership,
  getPermissionsForRole,
} from './index';
import { getAuthConfig, getResendConfig, getAppConfig } from '../../config/environment';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';

/**
 * User profile data
 */
export interface UserProfile {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Tenant data
 */
export interface Tenant {
  id: string;
  name: string;
  slug: string;
  plan: string;
  isActive: boolean;
  settings: Record<string, unknown>;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create user request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  fullName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Invite user request
 */
export interface InviteUserRequest {
  email: string;
  role: UserRole;
  fullName?: string;
}

/**
 * Create tenant request
 */
export interface CreateTenantRequest {
  name: string;
  slug: string;
  plan?: string;
  settings?: Record<string, unknown>;
  ownerUserId: string;
}

/**
 * Update membership request
 */
export interface UpdateMembershipRequest {
  role?: UserRole;
  isActive?: boolean;
}

/**
 * Membership with user details
 */
export interface MembershipWithUser extends TenantMembership {
  user: {
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  };
}

/**
 * User with memberships
 */
export interface UserWithMemberships extends UserProfile {
  memberships: Array<{
    tenantId: string;
    tenantName: string;
    tenantSlug: string;
    tenantPlan?: string;
    tenantIsActive?: boolean;
    role: UserRole;
    isActive: boolean;
  }>;
}

@injectable()
export class AuthService {
  private supabaseAdmin: SupabaseClient | null = null;
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeEmailProvider();
  }

  /**
   * Initialize email provider for sending notifications
   */
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
        console.log('[AuthService] Email provider initialized');
      } else {
        console.warn('[AuthService] Failed to initialize email provider:', result.error);
      }
    }
  }

  /**
   * Get Supabase Admin client
   */
  private getSupabaseAdmin(): SupabaseClient {
    if (!this.supabaseAdmin) {
      const config = getAuthConfig();
      this.supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      });
    }
    return this.supabaseAdmin;
  }

  /**
   * Verify JWT token and get user
   */
  async verifyToken(token: string): Promise<Result<SupabaseUser>> {
    try {
      const supabase = this.getSupabaseAdmin();
      const { data: { user }, error } = await supabase.auth.getUser(token);

      if (error || !user) {
        return Result.fail(error?.message || 'Invalid token');
      }

      return Result.ok(user);
    } catch (error) {
      return Result.fail(`Token verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's membership in a tenant
   */
  async getTenantMembership(
    userId: string,
    tenantId: string
  ): Promise<Result<TenantMembership | null>> {
    try {
      const result = await this.pool.query<TenantMembership>(
        `SELECT
          id,
          user_id as "userId",
          tenant_id as "tenantId",
          role,
          invited_by as "invitedBy",
          invited_at as "invitedAt",
          accepted_at as "acceptedAt",
          is_active as "isActive",
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenant_memberships
        WHERE user_id = $1 AND tenant_id = $2`,
        [userId, tenantId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      const membership = result.value.rows[0] || null;
      return Result.ok(membership);
    } catch (error) {
      return Result.fail(`Failed to get membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get authenticated user context with permissions
   */
  async getAuthUser(
    token: string,
    tenantId: string
  ): Promise<Result<AuthUser>> {
    // Verify token
    const userResult = await this.verifyToken(token);
    if (userResult.isFailure || !userResult.value) {
      return Result.fail(userResult.error || 'Token verification failed');
    }

    const supabaseUser = userResult.value;

    // Get tenant membership
    const membershipResult = await this.getTenantMembership(supabaseUser.id, tenantId);
    if (membershipResult.isFailure) {
      return Result.fail(membershipResult.error || 'Membership lookup failed');
    }

    const membership = membershipResult.value;
    if (!membership) {
      return Result.fail('User is not a member of this tenant');
    }

    if (!membership.isActive) {
      return Result.fail('User membership is inactive');
    }

    // Check if membership is accepted
    if (!membership.acceptedAt) {
      return Result.fail('User has not accepted the invitation');
    }

    const role = membership.role as UserRole;

    const authUser: AuthUser = {
      id: supabaseUser.id,
      email: supabaseUser.email || '',
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {
        fullName: supabaseUser.user_metadata?.full_name as string | undefined,
        avatarUrl: supabaseUser.user_metadata?.avatar_url as string | undefined,
      },
    };

    return Result.ok(authUser);
  }

  /**
   * Create a new user in Supabase Auth
   */
  async createUser(request: CreateUserRequest): Promise<Result<UserProfile>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Create user in Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: request.email,
        password: request.password,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          full_name: request.fullName,
        },
      });

      if (authError || !authData.user) {
        return Result.fail(authError?.message || 'Failed to create user');
      }

      // Create user profile in our database
      const now = new Date();
      const profileResult = await this.pool.query<UserProfile>(
        `INSERT INTO users (id, email, full_name, phone, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           email,
           full_name as "fullName",
           avatar_url as "avatarUrl",
           phone,
           is_active as "isActive",
           last_login_at as "lastLoginAt",
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          authData.user.id,
          request.email,
          request.fullName || null,
          request.phone || null,
          request.metadata || {},
          now,
          now,
        ]
      );

      if (profileResult.isFailure || !profileResult.value) {
        // Rollback: delete user from Supabase
        await supabase.auth.admin.deleteUser(authData.user.id);
        return Result.fail(profileResult.error || 'Failed to create user profile');
      }

      const userProfile = profileResult.value.rows[0];

      // Send welcome email
      if (this.emailProvider) {
        const appConfig = getAppConfig();
        try {
          await this.emailProvider.send({
            to: request.email,
            subject: `¡Bienvenido a ${appConfig.appName}!`,
            template: EmailTemplate.USER_WELCOME,
            variables: {
              userName: request.fullName || request.email.split('@')[0],
              actionUrl: `${appConfig.appUrl}/dashboard`,
            },
            tags: [
              { name: 'type', value: 'user-welcome' },
              { name: 'userId', value: userProfile.id },
            ],
          });
          console.log(`[AuthService] Welcome email sent to ${request.email}`);
        } catch (emailError) {
          // Don't fail user creation if email fails
          console.error('[AuthService] Failed to send welcome email:', emailError);
        }
      }

      return Result.ok(userProfile);
    } catch (error) {
      return Result.fail(`User creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile by ID
   */
  async getUserById(userId: string): Promise<Result<UserProfile | null>> {
    try {
      const result = await this.pool.query<UserProfile>(
        `SELECT
          id,
          email,
          full_name as "fullName",
          avatar_url as "avatarUrl",
          phone,
          is_active as "isActive",
          last_login_at as "lastLoginAt",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM users
        WHERE id = $1`,
        [userId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user profile by email
   */
  async getUserByEmail(email: string): Promise<Result<UserProfile | null>> {
    try {
      const result = await this.pool.query<UserProfile>(
        `SELECT
          id,
          email,
          full_name as "fullName",
          avatar_url as "avatarUrl",
          phone,
          is_active as "isActive",
          last_login_at as "lastLoginAt",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM users
        WHERE email = $1`,
        [email]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user's last login time
   */
  async updateLastLogin(userId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `UPDATE users SET last_login_at = $1, updated_at = $1 WHERE id = $2`,
        [new Date(), userId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || 'Update failed');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to update last login: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create a new tenant
   */
  async createTenant(request: CreateTenantRequest): Promise<Result<Tenant>> {
    try {
      const now = new Date();
      const tenantId = uuidv4();

      // Create tenant
      const tenantResult = await this.pool.query<Tenant>(
        `INSERT INTO tenants (id, name, slug, plan, settings, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           name,
           slug,
           plan,
           is_active as "isActive",
           settings,
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          tenantId,
          request.name,
          request.slug,
          request.plan || 'free',
          request.settings || {},
          now,
          now,
        ]
      );

      if (tenantResult.isFailure || !tenantResult.value) {
        return Result.fail(tenantResult.error || 'Failed to create tenant');
      }

      // Add owner as first member
      const membershipResult = await this.addMember(
        tenantId,
        request.ownerUserId,
        UserRole.OWNER,
        request.ownerUserId
      );

      if (membershipResult.isFailure || !membershipResult.value) {
        // Rollback: delete tenant
        await this.pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        return Result.fail(membershipResult.error || 'Failed to add owner membership');
      }

      // Auto-accept owner membership
      await this.acceptInvitation(membershipResult.value.id);

      return Result.ok(tenantResult.value.rows[0]);
    } catch (error) {
      return Result.fail(`Tenant creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tenant by ID
   */
  async getTenantById(tenantId: string): Promise<Result<Tenant | null>> {
    try {
      const result = await this.pool.query<Tenant>(
        `SELECT
          id,
          name,
          slug,
          plan,
          is_active as "isActive",
          settings,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants
        WHERE id = $1`,
        [tenantId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get tenant by slug
   */
  async getTenantBySlug(slug: string): Promise<Result<Tenant | null>> {
    try {
      const result = await this.pool.query<Tenant>(
        `SELECT
          id,
          name,
          slug,
          plan,
          is_active as "isActive",
          settings,
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM tenants
        WHERE slug = $1`,
        [slug]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows[0] || null);
    } catch (error) {
      return Result.fail(`Failed to get tenant: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add a member to a tenant (invite)
   */
  async addMember(
    tenantId: string,
    userId: string,
    role: UserRole,
    invitedBy: string
  ): Promise<Result<TenantMembership>> {
    try {
      const now = new Date();
      const membershipId = uuidv4();

      const result = await this.pool.query<TenantMembership>(
        `INSERT INTO tenant_memberships
         (id, user_id, tenant_id, role, invited_by, invited_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
        [membershipId, userId, tenantId, role, invitedBy, now, now, now]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to add member');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Invite a user to a tenant (creates user if needed)
   */
  async inviteUser(
    tenantId: string,
    request: InviteUserRequest,
    invitedBy: string
  ): Promise<Result<TenantMembership>> {
    try {
      // Check if user exists
      const existingUser = await this.getUserByEmail(request.email);
      if (existingUser.isFailure) {
        return Result.fail(existingUser.error || 'User lookup failed');
      }

      let userId: string;

      if (existingUser.value) {
        userId = existingUser.value.id;
      } else {
        // Create user with temporary password (they'll need to reset)
        const tempPassword = uuidv4(); // Secure random password
        const createResult = await this.createUser({
          email: request.email,
          password: tempPassword,
          fullName: request.fullName,
        });

        if (createResult.isFailure || !createResult.value) {
          return Result.fail(createResult.error || 'Failed to create user');
        }

        userId = createResult.value.id;

        // Send password reset email via Supabase
        const supabase = this.getSupabaseAdmin();
        await supabase.auth.resetPasswordForEmail(request.email);

        // Also send our custom welcome email with password reset info
        if (this.emailProvider) {
          const appConfig = getAppConfig();
          try {
            await this.emailProvider.sendPasswordReset(request.email, {
              userName: request.fullName || request.email.split('@')[0],
              resetUrl: `${appConfig.appUrl}/auth/reset-password`,
            });
            console.log(`[AuthService] Password reset email sent to ${request.email}`);
          } catch (emailError) {
            console.error('[AuthService] Failed to send password reset email:', emailError);
          }
        }
      }

      // Check if already a member
      const existingMembership = await this.getTenantMembership(userId, tenantId);
      if (existingMembership.isFailure) {
        return Result.fail(existingMembership.error || 'Membership check failed');
      }

      if (existingMembership.value) {
        return Result.fail('User is already a member of this tenant');
      }

      // Add membership
      return this.addMember(tenantId, userId, request.role, invitedBy);
    } catch (error) {
      return Result.fail(`Invitation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Accept an invitation
   */
  async acceptInvitation(membershipId: string): Promise<Result<TenantMembership>> {
    try {
      const result = await this.pool.query<TenantMembership>(
        `UPDATE tenant_memberships
         SET accepted_at = $1, updated_at = $1
         WHERE id = $2
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
        [new Date(), membershipId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to accept invitation');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Invitation not found');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to accept invitation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update membership (role, status)
   */
  async updateMembership(
    membershipId: string,
    update: UpdateMembershipRequest
  ): Promise<Result<TenantMembership>> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (update.role !== undefined) {
        updates.push(`role = $${paramIndex++}`);
        values.push(update.role);
      }

      if (update.isActive !== undefined) {
        updates.push(`is_active = $${paramIndex++}`);
        values.push(update.isActive);
      }

      if (updates.length === 0) {
        return Result.fail('No updates provided');
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(membershipId);

      const result = await this.pool.query<TenantMembership>(
        `UPDATE tenant_memberships
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
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
        values
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to update membership');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Membership not found');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a member from a tenant
   */
  async removeMember(membershipId: string): Promise<Result<void>> {
    try {
      const result = await this.pool.query(
        `DELETE FROM tenant_memberships WHERE id = $1`,
        [membershipId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to remove member');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to remove member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all members of a tenant
   */
  async getTenantMembers(
    tenantId: string,
    options?: { includeInactive?: boolean }
  ): Promise<Result<MembershipWithUser[]>> {
    try {
      const activeFilter = options?.includeInactive ? '' : 'AND tm.is_active = true';

      const result = await this.pool.query<MembershipWithUser>(
        `SELECT
          tm.id,
          tm.user_id as "userId",
          tm.tenant_id as "tenantId",
          tm.role,
          tm.invited_by as "invitedBy",
          tm.invited_at as "invitedAt",
          tm.accepted_at as "acceptedAt",
          tm.is_active as "isActive",
          tm.created_at as "createdAt",
          tm.updated_at as "updatedAt",
          jsonb_build_object(
            'email', u.email,
            'fullName', u.full_name,
            'avatarUrl', u.avatar_url
          ) as user
        FROM tenant_memberships tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.tenant_id = $1 ${activeFilter}
        ORDER BY tm.created_at DESC`,
        [tenantId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      return Result.ok(result.value.rows);
    } catch (error) {
      return Result.fail(`Failed to get members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get user's tenants (memberships)
   */
  async getUserTenants(userId: string): Promise<Result<UserWithMemberships>> {
    try {
      // Get user profile
      const userResult = await this.getUserById(userId);
      if (userResult.isFailure) {
        return Result.fail(userResult.error || 'Failed to get user');
      }

      if (!userResult.value) {
        return Result.fail('User not found');
      }

      // Get memberships with tenant info (including plan)
      const membershipsResult = await this.pool.query<{
        tenantId: string;
        tenantName: string;
        tenantSlug: string;
        tenantPlan: string;
        tenantIsActive: boolean;
        role: UserRole;
        isActive: boolean;
      }>(
        `SELECT
          tm.tenant_id as "tenantId",
          t.name as "tenantName",
          t.slug as "tenantSlug",
          COALESCE(t.plan, 'free') as "tenantPlan",
          t.is_active as "tenantIsActive",
          tm.role,
          tm.is_active as "isActive"
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = $1 AND tm.accepted_at IS NOT NULL
        ORDER BY t.name`,
        [userId]
      );

      if (membershipsResult.isFailure || !membershipsResult.value) {
        return Result.fail(membershipsResult.error || 'Failed to get memberships');
      }

      return Result.ok({
        ...userResult.value,
        memberships: membershipsResult.value.rows,
      });
    } catch (error) {
      return Result.fail(`Failed to get user tenants: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pending invitations for a user
   */
  async getPendingInvitations(userId: string): Promise<Result<Array<TenantMembership & { tenant: Tenant }>>> {
    try {
      const result = await this.pool.query<TenantMembership & { tenant: Tenant }>(
        `SELECT
          tm.id,
          tm.user_id as "userId",
          tm.tenant_id as "tenantId",
          tm.role,
          tm.invited_by as "invitedBy",
          tm.invited_at as "invitedAt",
          tm.accepted_at as "acceptedAt",
          tm.is_active as "isActive",
          tm.created_at as "createdAt",
          tm.updated_at as "updatedAt",
          jsonb_build_object(
            'id', t.id,
            'name', t.name,
            'slug', t.slug,
            'plan', t.plan
          ) as tenant
        FROM tenant_memberships tm
        JOIN tenants t ON t.id = tm.tenant_id
        WHERE tm.user_id = $1 AND tm.accepted_at IS NULL AND tm.is_active = true
        ORDER BY tm.invited_at DESC`,
        [userId]
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
   * Check if user has specific permission in tenant
   */
  async hasPermission(
    userId: string,
    tenantId: string,
    permission: Permission
  ): Promise<Result<boolean>> {
    const membershipResult = await this.getTenantMembership(userId, tenantId);
    if (membershipResult.isFailure) {
      return Result.fail(membershipResult.error || 'Membership check failed');
    }

    if (!membershipResult.value || !membershipResult.value.isActive) {
      return Result.ok(false);
    }

    const role = membershipResult.value.role as UserRole;
    const permissions = getPermissionsForRole(role);

    return Result.ok(permissions.includes(permission));
  }

  /**
   * Delete user (soft delete or full delete based on flag)
   */
  async deleteUser(userId: string, hardDelete: boolean = false): Promise<Result<void>> {
    try {
      if (hardDelete) {
        // Delete from Supabase Auth
        const supabase = this.getSupabaseAdmin();
        const { error } = await supabase.auth.admin.deleteUser(userId);

        if (error) {
          return Result.fail(error.message);
        }

        // Delete from our database (cascade will handle memberships)
        await this.pool.query('DELETE FROM users WHERE id = $1', [userId]);
      } else {
        // Soft delete - just deactivate
        await this.pool.query(
          'UPDATE users SET is_active = false, updated_at = $1 WHERE id = $2',
          [new Date(), userId]
        );
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete user: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(
    userId: string,
    update: {
      fullName?: string;
      phone?: string;
      avatarUrl?: string;
      metadata?: Record<string, unknown>;
    }
  ): Promise<Result<UserProfile>> {
    try {
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (update.fullName !== undefined) {
        updates.push(`full_name = $${paramIndex++}`);
        values.push(update.fullName);
      }

      if (update.phone !== undefined) {
        updates.push(`phone = $${paramIndex++}`);
        values.push(update.phone);
      }

      if (update.avatarUrl !== undefined) {
        updates.push(`avatar_url = $${paramIndex++}`);
        values.push(update.avatarUrl);
      }

      if (update.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex++}`);
        values.push(update.metadata);
      }

      if (updates.length === 0) {
        return Result.fail('No updates provided');
      }

      updates.push(`updated_at = $${paramIndex++}`);
      values.push(new Date());
      values.push(userId);

      const result = await this.pool.query<UserProfile>(
        `UPDATE users
         SET ${updates.join(', ')}
         WHERE id = $${paramIndex}
         RETURNING
           id,
           email,
           full_name as "fullName",
           avatar_url as "avatarUrl",
           phone,
           is_active as "isActive",
           last_login_at as "lastLoginAt",
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        values
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Update failed');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('User not found');
      }

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to update profile: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Count members by role in a tenant
   */
  async countMembersByRole(tenantId: string): Promise<Result<Record<UserRole, number>>> {
    try {
      const result = await this.pool.query<{ role: UserRole; count: string }>(
        `SELECT role, COUNT(*) as count
         FROM tenant_memberships
         WHERE tenant_id = $1 AND is_active = true AND accepted_at IS NOT NULL
         GROUP BY role`,
        [tenantId]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      const counts: Record<UserRole, number> = {
        [UserRole.OWNER]: 0,
        [UserRole.ADMIN]: 0,
        [UserRole.MANAGER]: 0,
        [UserRole.SALES_REP]: 0,
        [UserRole.VIEWER]: 0,
      };

      for (const row of result.value.rows) {
        counts[row.role] = parseInt(row.count, 10);
      }

      return Result.ok(counts);
    } catch (error) {
      return Result.fail(`Failed to count members: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync user from Supabase to backend database
   * Creates or updates user profile based on Supabase auth data
   */
  async syncUserFromSupabase(data: {
    supabaseUserId: string;
    email: string;
    fullName?: string;
    avatarUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Result<UserProfile>> {
    try {
      const now = new Date();

      // Try to update existing user first
      const updateResult = await this.pool.query<UserProfile>(
        `UPDATE users
         SET
           email = COALESCE($2, email),
           full_name = COALESCE($3, full_name),
           avatar_url = COALESCE($4, avatar_url),
           metadata = COALESCE($5, metadata),
           updated_at = $6
         WHERE id = $1
         RETURNING
           id,
           email,
           full_name as "fullName",
           avatar_url as "avatarUrl",
           phone,
           is_active as "isActive",
           last_login_at as "lastLoginAt",
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          data.supabaseUserId,
          data.email,
          data.fullName || null,
          data.avatarUrl || null,
          data.metadata || {},
          now,
        ]
      );

      if (updateResult.isSuccess && updateResult.value && updateResult.value.rows.length > 0) {
        console.log('[AuthService] User updated:', updateResult.value.rows[0].id);
        return Result.ok(updateResult.value.rows[0]);
      }

      // User doesn't exist, create new one
      console.log('[AuthService] Creating new user in database:', data.supabaseUserId);
      const insertResult = await this.pool.query<UserProfile>(
        `INSERT INTO users (id, email, full_name, avatar_url, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING
           id,
           email,
           full_name as "fullName",
           avatar_url as "avatarUrl",
           phone,
           is_active as "isActive",
           last_login_at as "lastLoginAt",
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          data.supabaseUserId,
          data.email,
          data.fullName || null,
          data.avatarUrl || null,
          data.metadata || {},
          now,
          now,
        ]
      );

      if (insertResult.isFailure || !insertResult.value) {
        console.error('[AuthService] Failed to create user:', insertResult.error);
        return Result.fail(insertResult.error || 'Failed to create user');
      }

      console.log('[AuthService] User created:', insertResult.value.rows[0]?.id);
      return Result.ok(insertResult.value.rows[0]);
    } catch (error) {
      console.error('[AuthService] User sync exception:', error);
      return Result.fail(`User sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if email is available for registration
   */
  async checkEmailAvailability(email: string): Promise<Result<boolean>> {
    try {
      const result = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM users WHERE LOWER(email) = LOWER($1)`,
        [email]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      const count = parseInt(result.value.rows[0].count, 10);
      return Result.ok(count === 0);
    } catch (error) {
      return Result.fail(`Email check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check if tenant slug is available
   */
  async checkSlugAvailability(slug: string): Promise<Result<boolean>> {
    try {
      const result = await this.pool.query<{ count: string }>(
        `SELECT COUNT(*) as count FROM tenants WHERE LOWER(slug) = LOWER($1)`,
        [slug]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Query failed');
      }

      const count = parseInt(result.value.rows[0].count, 10);
      return Result.ok(count === 0);
    } catch (error) {
      return Result.fail(`Slug check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update tenant settings
   */
  async updateTenantSettings(
    tenantId: string,
    settings: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>> {
    try {
      const result = await this.pool.query<{ settings: Record<string, unknown> }>(
        `UPDATE tenants
         SET settings = settings || $2::jsonb, updated_at = $3
         WHERE id = $1
         RETURNING settings`,
        [tenantId, JSON.stringify(settings), new Date()]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Update failed');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Tenant not found');
      }

      return Result.ok(result.value.rows[0].settings);
    } catch (error) {
      return Result.fail(`Settings update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update tenant branding
   */
  async updateTenantBranding(
    tenantId: string,
    branding: Record<string, unknown>
  ): Promise<Result<Record<string, unknown>>> {
    try {
      // Store branding in metadata.branding
      const result = await this.pool.query<{ metadata: Record<string, unknown> }>(
        `UPDATE tenants
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{branding}',
           COALESCE(metadata->'branding', '{}'::jsonb) || $2::jsonb
         ),
         updated_at = $3
         WHERE id = $1
         RETURNING metadata`,
        [tenantId, JSON.stringify(branding), new Date()]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Update failed');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Tenant not found');
      }

      return Result.ok((result.value.rows[0].metadata?.branding as Record<string, unknown>) || {});
    } catch (error) {
      return Result.fail(`Branding update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update tenant modules configuration
   */
  async updateTenantModules(
    tenantId: string,
    modules: Record<string, boolean>
  ): Promise<Result<Record<string, boolean>>> {
    try {
      // Store modules in metadata.modules
      const result = await this.pool.query<{ metadata: Record<string, unknown> }>(
        `UPDATE tenants
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{modules}',
           COALESCE(metadata->'modules', '{}'::jsonb) || $2::jsonb
         ),
         updated_at = $3
         WHERE id = $1
         RETURNING metadata`,
        [tenantId, JSON.stringify(modules), new Date()]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Update failed');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Tenant not found');
      }

      return Result.ok((result.value.rows[0].metadata?.modules as Record<string, boolean>) || {});
    } catch (error) {
      return Result.fail(`Modules update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update tenant business hours
   */
  async updateTenantBusinessHours(
    tenantId: string,
    businessHours: Record<string, { enabled: boolean; start: string; end: string }>
  ): Promise<Result<Record<string, unknown>>> {
    try {
      // Store businessHours in metadata.businessHours
      const result = await this.pool.query<{ metadata: Record<string, unknown> }>(
        `UPDATE tenants
         SET metadata = jsonb_set(
           COALESCE(metadata, '{}'::jsonb),
           '{businessHours}',
           $2::jsonb
         ),
         updated_at = $3
         WHERE id = $1
         RETURNING metadata`,
        [tenantId, JSON.stringify(businessHours), new Date()]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Update failed');
      }

      if (result.value.rows.length === 0) {
        return Result.fail('Tenant not found');
      }

      return Result.ok((result.value.rows[0].metadata?.businessHours as Record<string, unknown>) || {});
    } catch (error) {
      return Result.fail(`Business hours update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create tenant with full configuration (settings, branding, modules)
   * Used during onboarding to create everything in one operation
   */
  async createTenantWithFullConfig(request: {
    name: string;
    slug: string;
    plan?: string;
    ownerUserId: string;
    settings?: Record<string, unknown>;
    branding?: Record<string, unknown>;
    modules?: Record<string, boolean>;
  }): Promise<Result<Tenant & { membership: TenantMembership }>> {
    try {
      const now = new Date();
      const tenantId = uuidv4();

      // Build metadata with branding and modules
      const metadata: Record<string, unknown> = {};
      if (request.branding) {
        metadata.branding = request.branding;
      }
      if (request.modules) {
        metadata.modules = request.modules;
      }

      // Create tenant with all configuration
      const tenantResult = await this.pool.query<Tenant>(
        `INSERT INTO tenants (id, name, slug, plan, settings, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING
           id,
           name,
           slug,
           plan,
           is_active as "isActive",
           settings,
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          tenantId,
          request.name,
          request.slug,
          request.plan || 'free',
          request.settings || {},
          metadata,
          now,
          now,
        ]
      );

      if (tenantResult.isFailure || !tenantResult.value) {
        return Result.fail(tenantResult.error || 'Failed to create tenant');
      }

      // Add owner as first member
      const membershipResult = await this.addMember(
        tenantId,
        request.ownerUserId,
        UserRole.OWNER,
        request.ownerUserId
      );

      if (membershipResult.isFailure || !membershipResult.value) {
        // Rollback: delete tenant
        await this.pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        return Result.fail(membershipResult.error || 'Failed to add owner membership');
      }

      // Auto-accept owner membership
      const acceptResult = await this.acceptInvitation(membershipResult.value.id);
      if (acceptResult.isFailure) {
        // Rollback
        await this.pool.query('DELETE FROM tenant_memberships WHERE id = $1', [membershipResult.value.id]);
        await this.pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
        return Result.fail(acceptResult.error || 'Failed to accept membership');
      }

      return Result.ok({
        ...tenantResult.value.rows[0],
        membership: acceptResult.value!,
      });
    } catch (error) {
      return Result.fail(`Tenant creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============================================
  // Authentication Methods (Login/Register/Logout)
  // ============================================

  /**
   * Sign in with email and password
   * Returns user, session, tenants, and onboarding status for proper redirection
   */
  async signIn(email: string, password: string): Promise<Result<{
    user: UserProfile;
    session: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: number;
    };
    tenants: Array<{
      id: string;
      name: string;
      slug: string;
      role: UserRole;
      plan: 'free' | 'starter' | 'pro' | 'enterprise';
      isActive: boolean;
    }>;
    onboarding: {
      status: 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed';
      currentStep: string;
      completedSteps: string[];
      requiresOnboarding: boolean;
    };
  }>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Sign in with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError || !authData.session || !authData.user) {
        // Map Supabase errors to user-friendly messages
        if (authError?.message?.includes('Invalid login credentials')) {
          return Result.fail('Credenciales invalidas');
        }
        if (authError?.message?.includes('Email not confirmed')) {
          return Result.fail('email_not_confirmed');
        }
        return Result.fail(authError?.message || 'Error al iniciar sesion');
      }

      // Get or create user profile in our database
      let userProfile = await this.getUserByEmail(email);

      if (userProfile.isFailure || !userProfile.value) {
        // User exists in Supabase but not in our DB - sync them
        console.log('[AuthService] Syncing user from Supabase:', authData.user.id, authData.user.email);
        const syncResult = await this.syncUserFromSupabase({
          supabaseUserId: authData.user.id,
          email: authData.user.email!,
          fullName: authData.user.user_metadata?.full_name as string | undefined,
          avatarUrl: authData.user.user_metadata?.avatar_url as string | undefined,
        });

        if (syncResult.isFailure || !syncResult.value) {
          console.error('[AuthService] Sync failed:', syncResult.error);
          return Result.fail('Error al sincronizar usuario');
        }

        console.log('[AuthService] User synced successfully:', syncResult.value.id);
        userProfile = Result.ok(syncResult.value);
      }

      // Update last login
      await this.updateLastLogin(userProfile.value!.id);

      // Get user's tenants
      const tenantsResult = await this.getUserTenants(authData.user.id);
      const memberships = tenantsResult.isSuccess && tenantsResult.value?.memberships
        ? tenantsResult.value.memberships
        : [];

      // Get onboarding status
      const onboardingResult = await this.getOnboardingStatus(authData.user.id);
      const onboardingData = onboardingResult.isSuccess && onboardingResult.value
        ? onboardingResult.value
        : null;

      // Determine if user requires onboarding
      const hasTenants = memberships.length > 0;
      const onboardingStatus = onboardingData?.status || 'not_started';
      const isOnboardingComplete = onboardingStatus === 'completed';

      // User requires onboarding if:
      // 1. No tenants OR
      // 2. Has tenants but onboarding is not completed
      const requiresOnboarding = !hasTenants || !isOnboardingComplete;

      // Determine current step based on state
      let currentStep = 'signup';
      if (onboardingData?.completedSteps && onboardingData.completedSteps.length > 0) {
        const steps = ['signup', 'create-business', 'branding', 'modules', 'business-hours', 'invite-team', 'complete'];
        const completedSet = new Set(onboardingData.completedSteps);
        // Find the first incomplete step
        for (const step of steps) {
          if (!completedSet.has(step)) {
            currentStep = step;
            break;
          }
        }
      } else if (hasTenants && !isOnboardingComplete) {
        // User has tenant but no onboarding record - start from branding
        currentStep = 'branding';
      } else if (!hasTenants) {
        // No tenants - need to create business
        currentStep = 'create-business';
      }

      return Result.ok({
        user: userProfile.value!,
        session: {
          accessToken: authData.session.access_token,
          refreshToken: authData.session.refresh_token,
          expiresIn: authData.session.expires_in || 3600,
          expiresAt: authData.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
        },
        tenants: memberships.map(m => ({
          id: m.tenantId,
          name: m.tenantName || '',
          slug: m.tenantSlug || '',
          role: m.role as UserRole,
          plan: (m.tenantPlan || 'free') as 'free' | 'starter' | 'pro' | 'enterprise',
          isActive: m.tenantIsActive ?? true,
        })),
        onboarding: {
          status: onboardingStatus as 'not_started' | 'profile_created' | 'business_created' | 'setup_completed' | 'team_invited' | 'completed',
          currentStep,
          completedSteps: onboardingData?.completedSteps || [],
          requiresOnboarding,
        },
      });
    } catch (error) {
      return Result.fail(`Login failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Register a new user using Admin API (no rate limits) and send verification via Resend
   */
  async signUp(
    email: string,
    password: string,
    fullName?: string,
    metadata?: Record<string, unknown>
  ): Promise<Result<{
    user: UserProfile;
    session: {
      accessToken: string;
      refreshToken: string;
      expiresIn: number;
      expiresAt: number;
    } | null;
    confirmationRequired: boolean;
  }>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Check if email is already registered
      const existingUser = await this.getUserByEmail(email);
      if (existingUser.isSuccess && existingUser.value) {
        return Result.fail('El correo ya esta registrado');
      }

      // Create user in Supabase Auth using Admin API (bypasses email rate limits)
      // email_confirm: false means the user's email is NOT yet confirmed
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: false, // User needs to verify email
        user_metadata: {
          full_name: fullName,
          ...metadata,
        },
      });

      if (authError || !authData.user) {
        if (authError?.message?.includes('already registered') || authError?.message?.includes('already exists')) {
          return Result.fail('El correo ya esta registrado');
        }
        return Result.fail(authError?.message || 'Error al registrar usuario');
      }

      // Create user profile in our database
      const now = new Date();
      const profileResult = await this.pool.query<UserProfile>(
        `INSERT INTO users (id, email, full_name, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET
           full_name = COALESCE(EXCLUDED.full_name, users.full_name),
           updated_at = EXCLUDED.updated_at
         RETURNING
           id,
           email,
           full_name as "fullName",
           avatar_url as "avatarUrl",
           phone,
           is_active as "isActive",
           last_login_at as "lastLoginAt",
           metadata,
           created_at as "createdAt",
           updated_at as "updatedAt"`,
        [
          authData.user.id,
          email,
          fullName || null,
          metadata || {},
          now,
          now,
        ]
      );

      if (profileResult.isFailure || !profileResult.value || !profileResult.value.rows[0]) {
        return Result.fail('Error al crear perfil de usuario');
      }

      const userProfile = profileResult.value.rows[0];

      // Generate verification token and store in database
      const verificationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, email, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [authData.user.id, verificationToken, email, expiresAt]
      );

      // Send verification email via Resend (no rate limits!)
      if (this.emailProvider && this.emailInitialized) {
        const appConfig = getAppConfig();
        const verificationUrl = `${appConfig.appUrl}/auth/verify-email?token=${verificationToken}`;

        const emailResult = await this.emailProvider.sendEmailVerification(email, {
          userName: fullName || email.split('@')[0],
          verificationUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          console.warn('[AuthService] Failed to send verification email:', emailResult.isFailure ? emailResult.error : emailResult.getValue().error);
          // Don't fail registration if email fails, user can request resend
        } else {
          console.log(`[AuthService] Verification email sent to ${email}`);
        }
      } else {
        console.warn('[AuthService] Email provider not initialized, skipping verification email');
      }

      // User always needs to confirm email with this flow
      return Result.ok({
        user: userProfile,
        session: null, // No session until email is verified
        confirmationRequired: true,
      });
    } catch (error) {
      return Result.fail(`Registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<Result<{ userId: string; email: string }>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Find and validate the token
      const tokenResult = await this.pool.query<{
        id: string;
        user_id: string;
        email: string;
        expires_at: Date;
        used_at: Date | null;
      }>(
        `SELECT id, user_id, email, expires_at, used_at
         FROM email_verification_tokens
         WHERE token = $1`,
        [token]
      );

      if (tokenResult.isFailure || !tokenResult.value?.rows[0]) {
        return Result.fail('Token de verificación inválido');
      }

      const tokenData = tokenResult.value.rows[0];

      // Check if already used
      if (tokenData.used_at) {
        return Result.fail('Este enlace ya fue utilizado');
      }

      // Check if expired
      if (new Date(tokenData.expires_at) < new Date()) {
        return Result.fail('El enlace de verificación ha expirado');
      }

      // Mark token as used
      await this.pool.query(
        `UPDATE email_verification_tokens SET used_at = NOW() WHERE id = $1`,
        [tokenData.id]
      );

      // Update Supabase Auth user to confirm email
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        tokenData.user_id,
        { email_confirm: true }
      );

      if (updateError) {
        console.error('[AuthService] Failed to confirm email in Supabase:', updateError.message);
        return Result.fail('Error al confirmar el correo electrónico');
      }

      console.log(`[AuthService] Email verified for user ${tokenData.user_id}`);

      return Result.ok({
        userId: tokenData.user_id,
        email: tokenData.email,
      });
    } catch (error) {
      return Result.fail(`Email verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<Result<void>> {
    try {
      // Find user by email
      const userResult = await this.getUserByEmail(email);
      if (userResult.isFailure || !userResult.value) {
        return Result.fail('Usuario no encontrado');
      }

      const user = userResult.value;

      // Check if user is already verified
      const supabase = this.getSupabaseAdmin();
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);

      if (authError || !authUser.user) {
        return Result.fail('Usuario no encontrado en el sistema de autenticación');
      }

      if (authUser.user.email_confirmed_at) {
        return Result.fail('El correo ya está verificado');
      }

      // Invalidate existing tokens
      await this.pool.query(
        `UPDATE email_verification_tokens
         SET used_at = NOW()
         WHERE user_id = $1 AND used_at IS NULL`,
        [user.id]
      );

      // Generate new verification token
      const verificationToken = uuidv4();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      await this.pool.query(
        `INSERT INTO email_verification_tokens (user_id, token, email, expires_at)
         VALUES ($1, $2, $3, $4)`,
        [user.id, verificationToken, email, expiresAt]
      );

      // Send verification email via Resend
      if (this.emailProvider && this.emailInitialized) {
        const appConfig = getAppConfig();
        const verificationUrl = `${appConfig.appUrl}/auth/verify-email?token=${verificationToken}`;

        const emailResult = await this.emailProvider.sendEmailVerification(email, {
          userName: user.fullName || email.split('@')[0],
          verificationUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          return Result.fail('Error al enviar el correo de verificación');
        }

        console.log(`[AuthService] Verification email resent to ${email}`);
        return Result.ok();
      } else {
        return Result.fail('Servicio de correo no disponible');
      }
    } catch (error) {
      return Result.fail(`Resend verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken: string): Promise<Result<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  }>> {
    try {
      const supabase = this.getSupabaseAdmin();

      const { data, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      if (error || !data.session) {
        return Result.fail(error?.message || 'Error al refrescar sesion');
      }

      return Result.ok({
        accessToken: data.session.access_token,
        refreshToken: data.session.refresh_token,
        expiresIn: data.session.expires_in || 3600,
        expiresAt: data.session.expires_at || Math.floor(Date.now() / 1000) + 3600,
      });
    } catch (error) {
      return Result.fail(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign out user
   */
  async signOut(accessToken: string): Promise<Result<void>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Get user from token to invalidate their session
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        // Token might already be invalid, which is fine for logout
        return Result.ok(undefined);
      }

      // Sign out the user (invalidates all their sessions)
      const { error } = await supabase.auth.admin.signOut(user.id);

      if (error) {
        // Don't fail logout if there's an error, just log it
        console.warn('[AuthService] Error during sign out:', error.message);
      }

      return Result.ok(undefined);
    } catch (error) {
      // Don't fail logout
      console.warn('[AuthService] Sign out error:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Request password reset using Resend (bypasses Supabase rate limits)
   */
  async requestPasswordReset(email: string): Promise<Result<void>> {
    try {
      // Initialize email provider if needed
      await this.initializeEmailProvider();

      const appConfig = getAppConfig();

      // Find user by email in Supabase
      const supabase = this.getSupabaseAdmin();
      const { data: users, error: listError } = await supabase.auth.admin.listUsers();

      if (listError) {
        console.warn('[AuthService] Error listing users:', listError.message);
        return Result.ok(undefined); // Don't reveal errors
      }

      const user = users.users.find(u => u.email?.toLowerCase() === email.toLowerCase());

      if (!user) {
        // User not found, but don't reveal this
        console.log('[AuthService] Password reset requested for non-existent email');
        return Result.ok(undefined);
      }

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database (using email_verification_tokens table with type indicator)
      try {
        await this.pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, email, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
             token = EXCLUDED.token,
             expires_at = EXCLUDED.expires_at,
             used_at = NULL,
             created_at = NOW()`,
          [user.id, resetToken, email, expiresAt]
        );
      } catch (dbError) {
        // Table might not exist, create it
        console.log('[AuthService] Creating password_reset_tokens table...');
        await this.pool.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL,
            token VARCHAR(255) NOT NULL UNIQUE,
            email VARCHAR(255) NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            used_at TIMESTAMP WITH TIME ZONE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
          )
        `);

        // Retry insert
        await this.pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, email, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
             token = EXCLUDED.token,
             expires_at = EXCLUDED.expires_at,
             used_at = NULL,
             created_at = NOW()`,
          [user.id, resetToken, email, expiresAt]
        );
      }

      // Send email via Resend (no rate limits!)
      if (this.emailProvider && this.emailInitialized) {
        const resetUrl = `${appConfig.appUrl}/reset-password?token=${resetToken}`;

        const emailResult = await this.emailProvider.sendPasswordReset(email, {
          userName: user.user_metadata?.full_name || email.split('@')[0],
          resetUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          console.warn('[AuthService] Failed to send password reset email:',
            emailResult.isFailure ? emailResult.error : emailResult.getValue().error);
        } else {
          console.log(`[AuthService] Password reset email sent to ${email} via Resend`);
        }
      } else {
        // Fallback to Supabase if Resend not available
        console.log('[AuthService] Resend not available, falling back to Supabase');
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${appConfig.appUrl}/reset-password`,
        });
        if (error) {
          console.warn('[AuthService] Supabase password reset error:', error.message);
        }
      }

      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Password reset error:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Resend confirmation email
   */
  async resendConfirmationEmail(email: string): Promise<Result<void>> {
    try {
      const supabase = this.getSupabaseAdmin();
      const appConfig = getAppConfig();

      // Use Supabase's resend method
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: {
          emailRedirectTo: `${appConfig.appUrl}/auth/callback`,
        },
      });

      if (error) {
        // Don't reveal if email exists or already confirmed
        console.warn('[AuthService] Resend confirmation error:', error.message);
      }

      // Always return success to not reveal email status
      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Resend confirmation error:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Update user password
   */
  async updatePassword(accessToken: string, newPassword: string): Promise<Result<void>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Get user from token
      const { data: { user }, error: userError } = await supabase.auth.getUser(accessToken);

      if (userError || !user) {
        return Result.fail('Sesion invalida');
      }

      // Update password
      const { error } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });

      if (error) {
        return Result.fail(error.message || 'Error al actualizar contrasena');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Password update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset password using recovery token from email link
   * Supports both Supabase access_tokens (type=recovery) and our custom UUID tokens
   */
  async resetPasswordWithToken(recoveryToken: string, newPassword: string): Promise<Result<{
    success: boolean;
    email: string;
  }>> {
    try {
      const supabase = this.getSupabaseAdmin();

      // Validate password strength first (server-side validation)
      const passwordValidation = this.validatePasswordStrength(newPassword);
      if (passwordValidation.isFailure) {
        return Result.fail(passwordValidation.error!);
      }

      let userId: string | null = null;
      let userEmail: string = '';

      // Check if it's a UUID token (our custom token from Resend flow)
      const isUuidToken = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(recoveryToken);

      if (isUuidToken) {
        // Validate our custom token from database
        console.log('[AuthService] Validating custom reset token');

        const tokenResult = await this.pool.query<{
          id: string;
          user_id: string;
          email: string;
          expires_at: Date;
          used_at: Date | null;
        }>(
          `SELECT id, user_id, email, expires_at, used_at
           FROM password_reset_tokens
           WHERE token = $1`,
          [recoveryToken]
        );

        if (tokenResult.isFailure || !tokenResult.value?.rows[0]) {
          return Result.fail('El enlace de recuperación es inválido. Por favor solicita uno nuevo.');
        }

        const tokenData = tokenResult.value.rows[0];

        // Check if already used
        if (tokenData.used_at) {
          return Result.fail('Este enlace ya fue utilizado. Por favor solicita uno nuevo.');
        }

        // Check if expired
        if (new Date() > new Date(tokenData.expires_at)) {
          return Result.fail('El enlace de recuperación ha expirado. Por favor solicita uno nuevo.');
        }

        userId = tokenData.user_id;
        userEmail = tokenData.email;

        // Mark token as used
        await this.pool.query(
          `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
          [recoveryToken]
        );

      } else {
        // Try Supabase access_token (recovery type)
        console.log('[AuthService] Validating Supabase recovery token');

        const { data: { user }, error: userError } = await supabase.auth.getUser(recoveryToken);

        if (userError) {
          console.error('[AuthService] Recovery token validation failed:', userError.message);

          if (userError.message.includes('expired') || userError.message.includes('invalid')) {
            return Result.fail('El enlace de recuperación ha expirado o es inválido. Por favor solicita uno nuevo.');
          }

          return Result.fail('Token de recuperación inválido');
        }

        if (!user) {
          return Result.fail('No se pudo verificar el token de recuperación');
        }

        userId = user.id;
        userEmail = user.email || '';
      }

      if (!userId) {
        return Result.fail('No se pudo identificar el usuario');
      }

      // Update the password using admin API
      const { error: updateError } = await supabase.auth.admin.updateUserById(userId, {
        password: newPassword,
      });

      if (updateError) {
        console.error('[AuthService] Password update failed:', updateError.message);
        return Result.fail(updateError.message || 'Error al actualizar la contraseña');
      }

      // Log the password reset for audit purposes
      console.log(`[AuthService] Password reset successful for user: ${userEmail}`);

      // Invalidate all existing sessions for security
      try {
        await supabase.auth.admin.signOut(userId);
      } catch (signOutError) {
        console.warn('[AuthService] Could not invalidate sessions:', signOutError);
      }

      // Send password changed confirmation email
      if (this.emailProvider && this.emailInitialized && userEmail) {
        try {
          const changedAt = new Date().toLocaleString('es-MX', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short',
          });

          await this.emailProvider.sendPasswordChangedConfirmation(userEmail, {
            userName: userEmail.split('@')[0], // Use email prefix as name
            changedAt,
          });
          console.log(`[AuthService] Password change confirmation email sent to: ${userEmail}`);
        } catch (emailError) {
          // Log error but don't fail the password reset
          console.warn('[AuthService] Could not send password change confirmation email:', emailError);
        }
      }

      return Result.ok({
        success: true,
        email: userEmail,
      });
    } catch (error) {
      console.error('[AuthService] Password reset error:', error);
      return Result.fail(`Error al restablecer contraseña: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Validate password strength
   * Must have: 8+ chars, uppercase, lowercase, number, special character
   */
  private validatePasswordStrength(password: string): Result<void> {
    if (!password || password.length < 8) {
      return Result.fail('La contraseña debe tener al menos 8 caracteres');
    }

    if (!/[a-z]/.test(password)) {
      return Result.fail('La contraseña debe contener al menos una letra minúscula');
    }

    if (!/[A-Z]/.test(password)) {
      return Result.fail('La contraseña debe contener al menos una letra mayúscula');
    }

    if (!/\d/.test(password)) {
      return Result.fail('La contraseña debe contener al menos un número');
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
      return Result.fail('La contraseña debe contener al menos un carácter especial');
    }

    return Result.ok(undefined);
  }

  /**
   * Get onboarding status for a user
   * Used to determine if user needs to complete onboarding flow
   */
  async getOnboardingStatus(userId: string): Promise<Result<{
    status: string;
    currentStep: number;
    completedSteps: string[];
    startedAt: Date | null;
    completedAt: Date | null;
  } | null>> {
    try {
      const result = await this.pool.query<{
        id: string;
        userId: string;
        status: string;
        currentStep: number;
        completedSteps: string[];
        startedAt: Date | null;
        completedAt: Date | null;
      }>(
        `SELECT
          id,
          user_id as "userId",
          status,
          current_step as "currentStep",
          completed_steps as "completedSteps",
          started_at as "startedAt",
          completed_at as "completedAt"
        FROM user_onboarding
        WHERE user_id = $1`,
        [userId]
      );

      if (result.isFailure || !result.value) {
        // Table might not exist or query failed - return null (user has no onboarding record)
        console.log('[AuthService] No onboarding record found for user:', userId);
        return Result.ok(null);
      }

      const row = result.value.rows[0];
      if (!row) {
        return Result.ok(null);
      }

      // Handle completedSteps - it might be stored as JSON string or array
      let completedSteps: string[] = [];
      if (row.completedSteps) {
        if (typeof row.completedSteps === 'string') {
          try {
            completedSteps = JSON.parse(row.completedSteps);
          } catch {
            completedSteps = [];
          }
        } else if (Array.isArray(row.completedSteps)) {
          completedSteps = row.completedSteps;
        }
      }

      return Result.ok({
        status: row.status,
        currentStep: row.currentStep,
        completedSteps,
        startedAt: row.startedAt,
        completedAt: row.completedAt,
      });
    } catch (error) {
      // Don't fail login if onboarding table doesn't exist
      console.warn('[AuthService] Failed to get onboarding status:', error);
      return Result.ok(null);
    }
  }

  /**
   * Initialize or update onboarding status for a user
   */
  async initializeOnboarding(userId: string, initialStep: string = 'signup'): Promise<Result<void>> {
    try {
      const now = new Date();

      await this.pool.query(
        `INSERT INTO user_onboarding (id, user_id, status, current_step, completed_steps, started_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, 'not_started', 0, '[]', $2, $2, $2)
         ON CONFLICT (user_id) DO NOTHING`,
        [userId, now]
      );

      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Failed to initialize onboarding:', error);
      return Result.ok(undefined); // Don't fail the main operation
    }
  }

  /**
   * Update onboarding step completion
   */
  async completeOnboardingStep(userId: string, step: string, status: string = 'profile_created'): Promise<Result<void>> {
    try {
      const now = new Date();

      // Get current completed steps
      const currentResult = await this.getOnboardingStatus(userId);
      const completedSteps = currentResult.isSuccess && currentResult.value?.completedSteps
        ? [...currentResult.value.completedSteps]
        : [];

      // Add step if not already completed
      if (!completedSteps.includes(step)) {
        completedSteps.push(step);
      }

      const stepOrder = ['signup', 'create-business', 'branding', 'modules', 'business-hours', 'invite-team', 'complete'];
      const currentStepIndex = stepOrder.indexOf(step);

      await this.pool.query(
        `INSERT INTO user_onboarding (id, user_id, status, current_step, completed_steps, started_at, created_at, updated_at)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $5, $5)
         ON CONFLICT (user_id) DO UPDATE SET
           status = EXCLUDED.status,
           current_step = EXCLUDED.current_step,
           completed_steps = EXCLUDED.completed_steps,
           completed_at = CASE WHEN EXCLUDED.status = 'completed' THEN EXCLUDED.updated_at ELSE user_onboarding.completed_at END,
           updated_at = EXCLUDED.updated_at`,
        [userId, status, currentStepIndex + 1, JSON.stringify(completedSteps), now]
      );

      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Failed to complete onboarding step:', error);
      return Result.ok(undefined); // Don't fail the main operation
    }
  }

  /**
   * Mark onboarding as fully completed
   */
  async markOnboardingComplete(userId: string): Promise<Result<void>> {
    try {
      const now = new Date();

      await this.pool.query(
        `UPDATE user_onboarding
         SET status = 'completed', completed_at = $1, updated_at = $1
         WHERE user_id = $2`,
        [now, userId]
      );

      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Failed to mark onboarding complete:', error);
      return Result.ok(undefined);
    }
  }
}
