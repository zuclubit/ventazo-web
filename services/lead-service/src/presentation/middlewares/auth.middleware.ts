/**
 * Authentication Middleware for Fastify
 * JWT verification and user context extraction with database-backed role lookup
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  AuthUser,
  UserRole,
  Permission,
  AuthContext,
  getPermissionsForRole,
} from '../../infrastructure/auth';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { getAuthConfig } from '../../config/environment';

// Extend FastifyRequest to include auth context
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    supabaseUser?: {
      id: string;
      email: string;
      app_metadata: Record<string, unknown>;
      user_metadata: Record<string, unknown>;
    };
  }
}

// Supabase client singleton
let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!supabaseAdmin) {
    const config = getAuthConfig();
    supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseAdmin;
}

/**
 * Extract Bearer token from Authorization header
 */
function extractToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) return null;
  return token;
}

/**
 * Get AuthService instance (lazy load to avoid circular dependency issues)
 */
function getAuthService(): AuthService | null {
  try {
    return container.resolve(AuthService);
  } catch {
    // Service not registered yet (during startup or testing)
    return null;
  }
}

/**
 * Authentication hook - Validates JWT and extracts user
 * Use as preHandler on protected routes
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization);

  if (!token) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify JWT and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired token',
      });
    }

    // Store Supabase user on request for later use
    request.supabaseUser = {
      id: user.id,
      email: user.email || '',
      app_metadata: user.app_metadata || {},
      user_metadata: user.user_metadata || {},
    };

    // Get tenant ID from header
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'X-Tenant-Id header is required',
      });
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Invalid tenant ID format',
      });
    }

    // Try to get role from database via AuthService
    let role: UserRole = UserRole.SALES_REP;
    const authService = getAuthService();

    if (authService) {
      const membershipResult = await authService.getTenantMembership(user.id, tenantId);

      if (membershipResult.isSuccess && membershipResult.value) {
        const membership = membershipResult.value;

        // Check if membership is active and accepted
        if (!membership.isActive) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Your account is inactive in this tenant',
          });
        }

        if (!membership.acceptedAt) {
          return reply.status(403).send({
            statusCode: 403,
            error: 'Forbidden',
            message: 'Please accept the invitation to access this tenant',
          });
        }

        role = membership.role as UserRole;
      } else if (membershipResult.isSuccess && !membershipResult.value) {
        // No membership found - user not in this tenant
        return reply.status(403).send({
          statusCode: 403,
          error: 'Forbidden',
          message: 'You are not a member of this tenant',
        });
      }
      // If lookup failed, fall back to metadata role
    }

    // Fallback: use role from app_metadata if database lookup didn't work
    if (!authService) {
      const roleFromMetadata = user.app_metadata?.role as string | undefined;
      if (roleFromMetadata && Object.values(UserRole).includes(roleFromMetadata as UserRole)) {
        role = roleFromMetadata as UserRole;
      }
    }

    // Create authenticated user context
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {
        fullName: user.user_metadata?.full_name as string | undefined,
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      },
    };

    // Attach auth context to request
    request.auth = new AuthContext(authUser);

    // Update last login (fire and forget)
    if (authService) {
      authService.updateLastLogin(user.id).catch(() => {
        // Silently ignore errors updating last login
      });
    }
  } catch (error) {
    request.log.error(error, 'Authentication error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Authentication without tenant requirement
 * Used for onboarding endpoints where user creates their first tenant
 */
export async function authenticateWithoutTenant(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization);

  if (!token) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header',
    });
  }

  try {
    const supabase = getSupabaseAdmin();

    // Verify JWT and get user
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: error?.message || 'Invalid or expired token',
      });
    }

    // Store Supabase user on request for later use
    request.supabaseUser = {
      id: user.id,
      email: user.email || '',
      app_metadata: user.app_metadata || {},
      user_metadata: user.user_metadata || {},
    };

    // Create authenticated user context WITHOUT tenant
    // This is used for onboarding where user doesn't have a tenant yet
    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      tenantId: '', // Empty - user doesn't have a tenant yet
      role: UserRole.OWNER, // Will be owner of the new tenant
      permissions: getPermissionsForRole(UserRole.OWNER),
      metadata: {
        fullName: user.user_metadata?.full_name as string | undefined,
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      },
    };

    // Attach auth context to request
    request.auth = new AuthContext(authUser);
  } catch (error) {
    request.log.error(error, 'Authentication error');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Optional authentication - Does not fail if no token
 * Useful for endpoints that behave differently for authenticated vs anonymous users
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const token = extractToken(request.headers.authorization);

  if (!token) {
    return; // Continue without auth
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return; // Invalid token, continue without auth
    }

    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return; // No tenant, continue without auth
    }

    const roleFromMetadata = user.app_metadata?.role as string | undefined;
    const role = (roleFromMetadata as UserRole) || UserRole.VIEWER;

    const authUser: AuthUser = {
      id: user.id,
      email: user.email || '',
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {
        fullName: user.user_metadata?.full_name as string | undefined,
        avatarUrl: user.user_metadata?.avatar_url as string | undefined,
      },
    };

    request.auth = new AuthContext(authUser);
  } catch {
    // Silently continue without auth on any error
  }
}

/**
 * Factory function to create permission check middleware
 * Usage: requirePermission(Permission.LEAD_CREATE)
 */
export function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.auth) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const hasPermission = request.auth.hasAnyPermission(permissions);

    if (!hasPermission) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient permissions. Required: ${permissions.join(' or ')}`,
      });
    }
  };
}

/**
 * Factory function to require all specified permissions
 */
export function requireAllPermissions(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.auth) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const hasAllPermissions = request.auth.hasAllPermissions(permissions);

    if (!hasAllPermissions) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient permissions. Required all: ${permissions.join(', ')}`,
      });
    }
  };
}

/**
 * Factory function to require minimum role level
 */
export function requireRole(...roles: UserRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.auth) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    const hasRole = roles.includes(request.auth.user.role);

    if (!hasRole) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient role. Required: ${roles.join(' or ')}`,
      });
    }
  };
}

/**
 * Get authenticated user from request (throws if not authenticated)
 */
export function getAuthUser(request: FastifyRequest): AuthUser {
  if (!request.auth) {
    throw new Error('User not authenticated');
  }
  return request.auth.user;
}

/**
 * Get authenticated user from request (returns null if not authenticated)
 */
export function getAuthUserOrNull(request: FastifyRequest): AuthUser | null {
  return request.auth?.user || null;
}
