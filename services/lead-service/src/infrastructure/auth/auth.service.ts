/**
 * Authentication Service
 * Handles user authentication, tenant memberships, and user management
 * Native JWT authentication (no Supabase Auth dependency)
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
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
import { JwtService, TokenPayload } from './jwt.service';
import { PasswordService } from './password.service';

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

// Account lockout configuration
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 15;

// Performance optimization: Tenant cache configuration
// See: docs/PERFORMANCE_REMEDIATION_LOG.md - P1.1 Login Optimization
const TENANT_CACHE_TTL_MS = 300_000; // 5 minutes
const TENANT_CACHE_MAX_SIZE = 1000; // Max users to cache

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@injectable()
export class AuthService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;
  private jwtService: JwtService;
  private passwordService: PasswordService;

  // Performance optimization: In-memory tenant cache to reduce login latency
  // Reduces login time by ~100-150ms by avoiding repeated DB queries
  private tenantCache = new Map<string, CacheEntry<UserWithMemberships>>();

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.jwtService = new JwtService();
    this.passwordService = new PasswordService();
    this.initializeEmailProvider();

    // Periodic cache cleanup to prevent memory leaks
    setInterval(() => this.cleanupTenantCache(), 60_000); // Every minute
  }

  /**
   * Clean up expired cache entries
   * Performance optimization: Prevents memory buildup
   */
  private cleanupTenantCache(): void {
    const now = Date.now();
    let cleaned = 0;
    for (const [key, entry] of this.tenantCache.entries()) {
      if (entry.expiresAt < now) {
        this.tenantCache.delete(key);
        cleaned++;
      }
    }
    // Enforce max size by removing oldest entries
    if (this.tenantCache.size > TENANT_CACHE_MAX_SIZE) {
      const entriesToRemove = this.tenantCache.size - TENANT_CACHE_MAX_SIZE;
      const keys = Array.from(this.tenantCache.keys()).slice(0, entriesToRemove);
      keys.forEach(k => this.tenantCache.delete(k));
      cleaned += entriesToRemove;
    }
    if (cleaned > 0) {
      console.log(`[AuthService] Cleaned ${cleaned} expired tenant cache entries`);
    }
  }

  /**
   * Invalidate tenant cache for a user
   * Call this when memberships are created, updated, or deleted
   */
  invalidateTenantCache(userId: string): void {
    this.tenantCache.delete(userId);
  }

  /**
   * Invalidate all tenant cache entries for a tenant
   * Call this when tenant data changes (name, plan, etc.)
   */
  invalidateTenantCacheForTenant(tenantId: string): void {
    for (const [userId, entry] of this.tenantCache.entries()) {
      if (entry.data.memberships?.some(m => m.tenantId === tenantId)) {
        this.tenantCache.delete(userId);
      }
    }
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
   * Verify JWT token and get user (Native JWT)
   * Returns the token payload with user information
   */
  async verifyToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const verifyResult = await this.jwtService.verifyAccessToken(token);

      if (verifyResult.isFailure || !verifyResult.value) {
        return Result.fail(verifyResult.error || 'Invalid token');
      }

      return Result.ok(verifyResult.value);
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
   * Get authenticated user context with permissions (Native JWT)
   */
  async getAuthUser(
    token: string,
    tenantId: string
  ): Promise<Result<AuthUser>> {
    // Verify token
    const tokenResult = await this.verifyToken(token);
    if (tokenResult.isFailure || !tokenResult.value) {
      return Result.fail(tokenResult.error || 'Token verification failed');
    }

    const tokenPayload = tokenResult.value;
    const userId = tokenPayload.sub!;

    // Get tenant membership
    const membershipResult = await this.getTenantMembership(userId, tenantId);
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

    // Get user profile for additional metadata
    const userProfile = await this.getUserById(userId);

    const authUser: AuthUser = {
      id: userId,
      email: tokenPayload.email,
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {
        fullName: userProfile.value?.fullName || undefined,
        avatarUrl: userProfile.value?.avatarUrl || undefined,
      },
    };

    return Result.ok(authUser);
  }

  /**
   * Create a new user (Native - no Supabase Auth)
   */
  async createUser(request: CreateUserRequest): Promise<Result<UserProfile>> {
    try {
      // Validate password complexity
      const passwordValidation = this.passwordService.validatePasswordComplexity(request.password);
      if (!passwordValidation.isValid) {
        return Result.fail(passwordValidation.errors[0]);
      }

      // Hash password
      const hashResult = await this.passwordService.hashPassword(request.password);
      if (hashResult.isFailure || !hashResult.value) {
        return Result.fail(hashResult.error || 'Failed to hash password');
      }

      const passwordHash = hashResult.value;
      const userId = uuidv4();
      const now = new Date();

      // Create user profile in our database with password hash
      const profileResult = await this.pool.query<UserProfile>(
        `INSERT INTO users (id, email, password_hash, full_name, phone, metadata, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
          userId,
          request.email.toLowerCase(),
          passwordHash,
          request.fullName || null,
          request.phone || null,
          request.metadata || {},
          false, // email_verified - false until verified
          now,
          now,
        ]
      );

      if (profileResult.isFailure || !profileResult.value) {
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

      // Performance optimization: Invalidate tenant cache for proactive cache freshness
      this.invalidateTenantCache(userId);

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to add member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create tenant from SSO - creates a new tenant using SSO-provided ID
   * Used when SSO assigns a tenant that doesn't exist in our backend yet.
   * This maintains the same tenant ID between SSO and backend.
   */
  async createTenantFromSSO(
    tenantId: string,
    name: string,
    slug: string
  ): Promise<Result<Tenant>> {
    try {
      const now = new Date();

      // Check if tenant already exists (maybe created by another user)
      const existingResult = await this.getTenantById(tenantId);
      if (existingResult.isSuccess && existingResult.value) {
        console.log(`[AuthService] SSO tenant already exists: ${tenantId}`);
        return Result.ok(existingResult.value);
      }

      // Ensure unique slug (append random suffix if needed)
      let finalSlug = slug;
      const slugCheck = await this.checkSlugAvailability(slug);
      if (slugCheck.isSuccess && !slugCheck.value) {
        // Slug taken, append random suffix
        finalSlug = `${slug}-${Date.now().toString(36)}`;
      }

      // Create tenant with SSO-provided ID (instead of generating new UUID)
      const tenantResult = await this.pool.query<Tenant>(
        `INSERT INTO tenants (id, name, slug, plan, settings, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           updated_at = EXCLUDED.updated_at
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
          name,
          finalSlug,
          'free',
          {},
          { source: 'sso' },
          now,
          now,
        ]
      );

      if (tenantResult.isFailure || !tenantResult.value) {
        return Result.fail(tenantResult.error || 'Failed to create SSO tenant');
      }

      const tenant = tenantResult.value.rows[0];
      console.log(`[AuthService] SSO tenant created: ${tenant.id} (${tenant.name})`);

      return Result.ok(tenant);
    } catch (error) {
      console.error('[AuthService] SSO tenant creation failed:', error);
      return Result.fail(`SSO tenant creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create membership from SSO - used when SSO system assigns a user to a tenant
   * Unlike addMember, this creates an already-accepted membership since it's
   * trusted data from the SSO system.
   */
  async createMembershipFromSSO(
    tenantId: string,
    userId: string,
    role: UserRole
  ): Promise<Result<TenantMembership>> {
    try {
      const now = new Date();
      const membershipId = uuidv4();

      // Check if membership already exists
      const existingResult = await this.getTenantMembership(userId, tenantId);
      if (existingResult.isSuccess && existingResult.value) {
        // Membership exists, just return it
        return Result.ok(existingResult.value);
      }

      // Create membership with acceptedAt set (SSO users are pre-accepted)
      const result = await this.pool.query<TenantMembership>(
        `INSERT INTO tenant_memberships
         (id, user_id, tenant_id, role, invited_by, invited_at, accepted_at, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (user_id, tenant_id) DO UPDATE SET
           role = EXCLUDED.role,
           is_active = TRUE,
           accepted_at = COALESCE(tenant_memberships.accepted_at, EXCLUDED.accepted_at),
           updated_at = EXCLUDED.updated_at
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
        [membershipId, userId, tenantId, role, userId, now, now, true, now, now]
      );

      if (result.isFailure || !result.value) {
        return Result.fail(result.error || 'Failed to create SSO membership');
      }

      // Invalidate cache
      this.invalidateTenantCache(userId);

      return Result.ok(result.value.rows[0]);
    } catch (error) {
      return Result.fail(`Failed to create SSO membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      const membership = result.value.rows[0];

      // Performance optimization: Invalidate tenant cache on membership change
      this.invalidateTenantCache(membership.userId);

      return Result.ok(membership);
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

      const membership = result.value.rows[0];

      // Performance optimization: Invalidate tenant cache on membership change
      this.invalidateTenantCache(membership.userId);

      return Result.ok(membership);
    } catch (error) {
      return Result.fail(`Failed to update membership: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Remove a member from a tenant
   */
  async removeMember(membershipId: string): Promise<Result<void>> {
    try {
      // First get the userId for cache invalidation
      const result = await this.pool.query<{ userId: string }>(
        `DELETE FROM tenant_memberships WHERE id = $1 RETURNING user_id as "userId"`,
        [membershipId]
      );

      if (result.isFailure) {
        return Result.fail(result.error || 'Failed to remove member');
      }

      // Performance optimization: Invalidate tenant cache
      if (result.value && result.value.rows.length > 0) {
        this.invalidateTenantCache(result.value.rows[0].userId);
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
          CASE
            WHEN tm.is_active = false THEN 'suspended'
            WHEN tm.accepted_at IS NULL THEN 'pending'
            ELSE 'active'
          END as status,
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
   * Performance optimization: Uses in-memory cache with 5-min TTL
   * See: docs/PERFORMANCE_REMEDIATION_LOG.md - P1.1 Login Optimization
   */
  async getUserTenants(userId: string): Promise<Result<UserWithMemberships>> {
    try {
      // Performance optimization: Check cache first
      const cached = this.tenantCache.get(userId);
      if (cached && cached.expiresAt > Date.now()) {
        return Result.ok(cached.data);
      }

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

      const result: UserWithMemberships = {
        ...userResult.value,
        memberships: membershipsResult.value.rows,
      };

      // Performance optimization: Store in cache
      this.tenantCache.set(userId, {
        data: result,
        expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
      });

      return Result.ok(result);
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
        // Insert failed - might be duplicate email, try to find existing user
        console.log('[AuthService] Insert failed, checking for existing user by email...');
        const existingUser = await this.getUserByEmail(data.email);
        if (existingUser.isSuccess && existingUser.value) {
          console.log('[AuthService] Found existing user by email:', existingUser.value.id);
          // Return the existing user (the SSO user ID doesn't match, but email does)
          return Result.ok(existingUser.value);
        }
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
  // Native JWT Authentication (no Supabase dependency)
  // ============================================

  /**
   * Sign in with email and password (Native JWT)
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
      const normalizedEmail = email.toLowerCase().trim();

      // Get user from database with password hash
      const userResult = await this.pool.query<UserProfile & { passwordHash: string | null; emailVerified: boolean; failedLoginAttempts: number; lockedUntil: Date | null }>(
        `SELECT
          id,
          email,
          password_hash as "passwordHash",
          full_name as "fullName",
          avatar_url as "avatarUrl",
          phone,
          is_active as "isActive",
          email_verified as "emailVerified",
          failed_login_attempts as "failedLoginAttempts",
          locked_until as "lockedUntil",
          last_login_at as "lastLoginAt",
          metadata,
          created_at as "createdAt",
          updated_at as "updatedAt"
        FROM users
        WHERE LOWER(email) = $1`,
        [normalizedEmail]
      );

      if (userResult.isFailure || !userResult.value || userResult.value.rows.length === 0) {
        return Result.fail('Credenciales invalidas');
      }

      const user = userResult.value.rows[0];

      // Check if account is locked
      if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
        const remainingMinutes = Math.ceil((new Date(user.lockedUntil).getTime() - Date.now()) / 60000);
        return Result.fail(`Cuenta bloqueada. Intenta de nuevo en ${remainingMinutes} minutos.`);
      }

      // Check if user is active
      if (!user.isActive) {
        return Result.fail('Cuenta desactivada. Contacta al administrador.');
      }

      // Check if password hash exists (migration from Supabase)
      if (!user.passwordHash) {
        return Result.fail('Cuenta requiere restablecimiento de contraseña');
      }

      // Verify password
      const passwordValid = await this.passwordService.verifyPassword(password, user.passwordHash);
      if (passwordValid.isFailure || !passwordValid.value) {
        // Increment failed attempts
        await this.incrementFailedLoginAttempts(user.id);
        return Result.fail('Credenciales invalidas');
      }

      // Check email verification (optional - can be made strict)
      if (!user.emailVerified) {
        return Result.fail('email_not_confirmed');
      }

      // PERFORMANCE OPTIMIZATION: Parallelize post-authentication operations
      // This reduces login time by ~60-80ms by running independent operations concurrently
      // See: docs/PERFORMANCE_OPTIMIZATION_PLAN_V2.md - Section 1.2

      // 1. Combined: Reset failed attempts + Update last login (single query)
      // Runs in parallel with tenant/onboarding fetches
      const updateLoginPromise = this.resetAttemptsAndUpdateLogin(user.id);

      // 2. Parallel fetch: Get tenants and onboarding status concurrently
      const [tenantsResult, onboardingResult] = await Promise.all([
        this.getUserTenants(user.id),
        this.getOnboardingStatus(user.id),
      ]);

      // Wait for login update to complete (fire-and-forget would be unsafe)
      await updateLoginPromise;

      const memberships = tenantsResult.isSuccess && tenantsResult.value?.memberships
        ? tenantsResult.value.memberships
        : [];

      // Get default tenant for token (first active tenant)
      const defaultTenant = memberships.find(m => m.isActive);

      // Generate JWT tokens (depends on tenant info, cannot be parallelized further)
      const tokenResult = await this.jwtService.generateTokenPair(
        user.id,
        user.email,
        defaultTenant?.tenantId,
        defaultTenant?.role
      );

      if (tokenResult.isFailure || !tokenResult.value) {
        return Result.fail('Error al generar tokens de sesión');
      }

      const tokens = tokenResult.value;

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

      // Build user profile response (without password hash)
      const userProfile: UserProfile = {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        avatarUrl: user.avatarUrl,
        phone: user.phone,
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt,
        metadata: user.metadata,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      return Result.ok({
        user: userProfile,
        session: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          expiresIn: tokens.expiresIn,
          expiresAt: tokens.expiresAt,
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
   * Increment failed login attempts for account lockout
   */
  private async incrementFailedLoginAttempts(userId: string): Promise<void> {
    try {
      const now = new Date();
      await this.pool.query(
        `UPDATE users
         SET
           failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
           locked_until = CASE
             WHEN COALESCE(failed_login_attempts, 0) + 1 >= $2
             THEN $3
             ELSE locked_until
           END,
           updated_at = $4
         WHERE id = $1`,
        [
          userId,
          MAX_FAILED_ATTEMPTS,
          new Date(now.getTime() + LOCKOUT_DURATION_MINUTES * 60 * 1000),
          now,
        ]
      );
    } catch (error) {
      console.error('[AuthService] Failed to increment login attempts:', error);
    }
  }

  /**
   * Reset failed login attempts after successful login
   */
  private async resetFailedLoginAttempts(userId: string): Promise<void> {
    try {
      await this.pool.query(
        `UPDATE users
         SET failed_login_attempts = 0, locked_until = NULL, updated_at = $2
         WHERE id = $1`,
        [userId, new Date()]
      );
    } catch (error) {
      console.error('[AuthService] Failed to reset login attempts:', error);
    }
  }

  /**
   * Combined: Reset failed attempts + Update last login in single query
   * PERFORMANCE: Reduces 2 DB round-trips to 1 (~30-60ms saved)
   */
  private async resetAttemptsAndUpdateLogin(userId: string): Promise<void> {
    try {
      const now = new Date();
      await this.pool.query(
        `UPDATE users
         SET failed_login_attempts = 0,
             locked_until = NULL,
             last_login_at = $2,
             updated_at = $2
         WHERE id = $1`,
        [userId, now]
      );
    } catch (error) {
      console.error('[AuthService] Failed to reset attempts and update login:', error);
    }
  }

  /**
   * Register a new user (Native - no Supabase Auth)
   * Creates user with password hash directly in database
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
      const normalizedEmail = email.toLowerCase().trim();

      // Check if email is already registered
      const existingUser = await this.getUserByEmail(normalizedEmail);
      if (existingUser.isSuccess && existingUser.value) {
        return Result.fail('El correo ya esta registrado');
      }

      // Validate password complexity
      const passwordValidation = this.passwordService.validatePasswordComplexity(password);
      if (!passwordValidation.isValid) {
        return Result.fail(passwordValidation.errors[0]);
      }

      // Hash password
      const hashResult = await this.passwordService.hashPassword(password);
      if (hashResult.isFailure || !hashResult.value) {
        return Result.fail(hashResult.error || 'Error al procesar contraseña');
      }

      const passwordHash = hashResult.value;
      const userId = uuidv4();
      const now = new Date();

      // Create user profile in our database with password hash
      const profileResult = await this.pool.query<UserProfile>(
        `INSERT INTO users (id, email, password_hash, full_name, metadata, email_verified, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
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
          userId,
          normalizedEmail,
          passwordHash,
          fullName || null,
          metadata || {},
          false, // email_verified = false until verified
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
        [userId, verificationToken, normalizedEmail, expiresAt]
      );

      // Send verification email via Resend (no rate limits!)
      if (this.emailProvider && this.emailInitialized) {
        const appConfig = getAppConfig();
        const verificationUrl = `${appConfig.appUrl}/auth/verify-email?token=${verificationToken}`;

        const emailResult = await this.emailProvider.sendEmailVerification(normalizedEmail, {
          userName: fullName || normalizedEmail.split('@')[0],
          verificationUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          console.warn('[AuthService] Failed to send verification email:', emailResult.isFailure ? emailResult.error : emailResult.getValue().error);
          // Don't fail registration if email fails, user can request resend
        } else {
          console.log(`[AuthService] Verification email sent to ${normalizedEmail}`);
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
   * Verify email with token (Native - no Supabase)
   */
  async verifyEmail(token: string): Promise<Result<{ userId: string; email: string }>> {
    try {
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

      // Update user's email_verified flag in our database
      const now = new Date();
      await this.pool.query(
        `UPDATE users
         SET email_verified = true, email_verified_at = $2, updated_at = $2
         WHERE id = $1`,
        [tokenData.user_id, now]
      );

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
   * Resend verification email (Native - no Supabase)
   */
  async resendVerificationEmail(email: string): Promise<Result<void>> {
    try {
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email and check verification status
      const userResult = await this.pool.query<{ id: string; email: string; fullName: string | null; emailVerified: boolean }>(
        `SELECT id, email, full_name as "fullName", email_verified as "emailVerified"
         FROM users
         WHERE LOWER(email) = $1`,
        [normalizedEmail]
      );

      if (userResult.isFailure || !userResult.value?.rows[0]) {
        return Result.fail('Usuario no encontrado');
      }

      const user = userResult.value.rows[0];

      // Check if user is already verified
      if (user.emailVerified) {
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
        [user.id, verificationToken, normalizedEmail, expiresAt]
      );

      // Send verification email via Resend
      if (this.emailProvider && this.emailInitialized) {
        const appConfig = getAppConfig();
        const verificationUrl = `${appConfig.appUrl}/auth/verify-email?token=${verificationToken}`;

        const emailResult = await this.emailProvider.sendEmailVerification(normalizedEmail, {
          userName: user.fullName || normalizedEmail.split('@')[0],
          verificationUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          return Result.fail('Error al enviar el correo de verificación');
        }

        console.log(`[AuthService] Verification email resent to ${normalizedEmail}`);
        return Result.ok();
      } else {
        return Result.fail('Servicio de correo no disponible');
      }
    } catch (error) {
      return Result.fail(`Resend verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Refresh access token (Native JWT)
   */
  async refreshToken(refreshToken: string): Promise<Result<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    expiresAt: number;
  }>> {
    try {
      // Verify the refresh token
      const verifyResult = await this.jwtService.verifyRefreshToken(refreshToken);
      if (verifyResult.isFailure || !verifyResult.value) {
        return Result.fail(verifyResult.error || 'Refresh token invalido');
      }

      const payload = verifyResult.value;

      // Get user to fetch latest tenant info
      const tenantsResult = await this.getUserTenants(payload.sub!);
      const defaultTenant = tenantsResult.isSuccess && tenantsResult.value?.memberships
        ? tenantsResult.value.memberships.find(m => m.isActive)
        : undefined;

      // Generate new token pair
      const tokenResult = await this.jwtService.generateTokenPair(
        payload.sub!,
        payload.email,
        defaultTenant?.tenantId,
        defaultTenant?.role
      );

      if (tokenResult.isFailure || !tokenResult.value) {
        return Result.fail('Error al generar nuevos tokens');
      }

      return Result.ok({
        accessToken: tokenResult.value.accessToken,
        refreshToken: tokenResult.value.refreshToken,
        expiresIn: tokenResult.value.expiresIn,
        expiresAt: tokenResult.value.expiresAt,
      });
    } catch (error) {
      return Result.fail(`Token refresh failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sign out user (Native JWT)
   * Note: With stateless JWT, we just acknowledge the logout.
   * For true session invalidation, implement token blacklisting or short-lived tokens.
   */
  async signOut(accessToken: string): Promise<Result<void>> {
    try {
      // Verify the token to get user ID for logging
      const tokenResult = await this.jwtService.verifyAccessToken(accessToken);

      if (tokenResult.isSuccess && tokenResult.value) {
        console.log(`[AuthService] User ${tokenResult.value.sub} signed out`);
      }

      // With stateless JWT, there's no server-side session to invalidate
      // The client should discard the tokens
      // For enhanced security, consider implementing token blacklisting in Redis

      return Result.ok(undefined);
    } catch (error) {
      // Don't fail logout
      console.warn('[AuthService] Sign out error:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Request password reset (Native - no Supabase)
   */
  async requestPasswordReset(email: string): Promise<Result<void>> {
    try {
      // Initialize email provider if needed
      await this.initializeEmailProvider();

      const appConfig = getAppConfig();
      const normalizedEmail = email.toLowerCase().trim();

      // Find user by email in our database
      const userResult = await this.pool.query<{ id: string; email: string; fullName: string | null }>(
        `SELECT id, email, full_name as "fullName"
         FROM users
         WHERE LOWER(email) = $1 AND is_active = true`,
        [normalizedEmail]
      );

      if (userResult.isFailure || !userResult.value?.rows[0]) {
        // User not found, but don't reveal this
        console.log('[AuthService] Password reset requested for non-existent email');
        return Result.ok(undefined);
      }

      const user = userResult.value.rows[0];

      // Generate reset token
      const resetToken = uuidv4();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token in database
      try {
        await this.pool.query(
          `INSERT INTO password_reset_tokens (user_id, token, email, expires_at)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (email) DO UPDATE SET
             token = EXCLUDED.token,
             expires_at = EXCLUDED.expires_at,
             used_at = NULL,
             created_at = NOW()`,
          [user.id, resetToken, normalizedEmail, expiresAt]
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
          [user.id, resetToken, normalizedEmail, expiresAt]
        );
      }

      // Send email via Resend
      if (this.emailProvider && this.emailInitialized) {
        const resetUrl = `${appConfig.appUrl}/reset-password?token=${resetToken}`;

        const emailResult = await this.emailProvider.sendPasswordReset(normalizedEmail, {
          userName: user.fullName || normalizedEmail.split('@')[0],
          resetUrl,
        });

        if (emailResult.isFailure || !emailResult.getValue().success) {
          console.warn('[AuthService] Failed to send password reset email:',
            emailResult.isFailure ? emailResult.error : emailResult.getValue().error);
        } else {
          console.log(`[AuthService] Password reset email sent to ${normalizedEmail} via Resend`);
        }
      } else {
        console.warn('[AuthService] Email provider not available for password reset');
      }

      return Result.ok(undefined);
    } catch (error) {
      console.warn('[AuthService] Password reset error:', error);
      return Result.ok(undefined);
    }
  }

  /**
   * Resend confirmation email (uses native verification flow)
   */
  async resendConfirmationEmail(email: string): Promise<Result<void>> {
    // Delegate to resendVerificationEmail which is already native
    return this.resendVerificationEmail(email);
  }

  /**
   * Update user password (Native - no Supabase)
   */
  async updatePassword(accessToken: string, newPassword: string): Promise<Result<void>> {
    try {
      // Verify the access token
      const tokenResult = await this.jwtService.verifyAccessToken(accessToken);
      if (tokenResult.isFailure || !tokenResult.value) {
        return Result.fail('Sesion invalida');
      }

      const userId = tokenResult.value.sub!;

      // Validate password complexity
      const passwordValidation = this.passwordService.validatePasswordComplexity(newPassword);
      if (!passwordValidation.isValid) {
        return Result.fail(passwordValidation.errors[0]);
      }

      // Hash the new password
      const hashResult = await this.passwordService.hashPassword(newPassword);
      if (hashResult.isFailure || !hashResult.value) {
        return Result.fail('Error al procesar la nueva contraseña');
      }

      // Update password in database
      const now = new Date();
      await this.pool.query(
        `UPDATE users
         SET password_hash = $2, updated_at = $3
         WHERE id = $1`,
        [userId, hashResult.value, now]
      );

      console.log(`[AuthService] Password updated for user ${userId}`);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Password update failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reset password using recovery token from email link (Native - no Supabase)
   * Uses our custom UUID tokens only
   */
  async resetPasswordWithToken(recoveryToken: string, newPassword: string): Promise<Result<{
    success: boolean;
    email: string;
  }>> {
    try {
      // Validate password complexity
      const passwordValidation = this.passwordService.validatePasswordComplexity(newPassword);
      if (!passwordValidation.isValid) {
        return Result.fail(passwordValidation.errors[0]);
      }

      // Validate our custom token from database
      console.log('[AuthService] Validating password reset token');

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

      const userId = tokenData.user_id;
      const userEmail = tokenData.email;

      // Mark token as used
      await this.pool.query(
        `UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1`,
        [recoveryToken]
      );

      // Hash the new password
      const hashResult = await this.passwordService.hashPassword(newPassword);
      if (hashResult.isFailure || !hashResult.value) {
        return Result.fail('Error al procesar la nueva contraseña');
      }

      // Update the password in our database
      const now = new Date();
      await this.pool.query(
        `UPDATE users
         SET password_hash = $2, updated_at = $3
         WHERE id = $1`,
        [userId, hashResult.value, now]
      );

      // Log the password reset for audit purposes
      console.log(`[AuthService] Password reset successful for user: ${userEmail}`);

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
