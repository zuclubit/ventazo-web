/**
 * Authentication Middleware for Fastify
 * Native JWT verification and user context extraction with database-backed role lookup
 * No Supabase Auth dependency
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import {
  AuthUser,
  UserRole,
  Permission,
  AuthContext,
  getPermissionsForRole,
} from '../../infrastructure/auth';
import { AuthService } from '../../infrastructure/auth/auth.service';
import { JwtService, TokenPayload } from '../../infrastructure/auth/jwt.service';

// Native JWT service singleton
let jwtService: JwtService | null = null;

function getJwtService(): JwtService {
  if (!jwtService) {
    jwtService = new JwtService();
  }
  return jwtService;
}

// Extend FastifyRequest to include auth context
declare module 'fastify' {
  interface FastifyRequest {
    auth?: AuthContext;
    tokenPayload?: TokenPayload;
  }
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
 * Authentication hook - Validates JWT and extracts user (Native JWT)
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
    const jwt = getJwtService();

    // Verify JWT using native service
    const verifyResult = await jwt.verifyAccessToken(token);

    if (verifyResult.isFailure || !verifyResult.value) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: verifyResult.error || 'Invalid or expired token',
      });
    }

    const tokenPayload = verifyResult.value;

    // Store token payload on request for later use
    request.tokenPayload = tokenPayload;

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

    const userId = tokenPayload.sub!;

    // Try to get role from database via AuthService
    let role: UserRole = UserRole.SALES_REP;
    let userFullName: string | undefined;
    let userAvatarUrl: string | undefined;
    const authService = getAuthService();

    if (authService) {
      const membershipResult = await authService.getTenantMembership(userId, tenantId);

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

      // Get user profile for metadata
      const userResult = await authService.getUserById(userId);
      if (userResult.isSuccess && userResult.value) {
        userFullName = userResult.value.fullName || undefined;
        userAvatarUrl = userResult.value.avatarUrl || undefined;
      }
    }

    // Fallback: use role from token if database lookup didn't work
    if (!authService && tokenPayload.role) {
      if (Object.values(UserRole).includes(tokenPayload.role as UserRole)) {
        role = tokenPayload.role as UserRole;
      }
    }

    // Create authenticated user context
    const authUser: AuthUser = {
      id: userId,
      email: tokenPayload.email,
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {
        fullName: userFullName,
        avatarUrl: userAvatarUrl,
      },
    };

    // Attach auth context to request
    request.auth = new AuthContext(authUser);

    // Update last login (fire and forget)
    if (authService) {
      authService.updateLastLogin(userId).catch(() => {
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
 * Authentication without tenant requirement (Native JWT)
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
    const jwt = getJwtService();

    // Verify JWT using native service
    const verifyResult = await jwt.verifyAccessToken(token);

    if (verifyResult.isFailure || !verifyResult.value) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: verifyResult.error || 'Invalid or expired token',
      });
    }

    const tokenPayload = verifyResult.value;

    // Store token payload on request for later use
    request.tokenPayload = tokenPayload;

    // Get user profile for metadata
    let userFullName: string | undefined;
    let userAvatarUrl: string | undefined;
    const authService = getAuthService();

    if (authService) {
      const userResult = await authService.getUserById(tokenPayload.sub!);
      if (userResult.isSuccess && userResult.value) {
        userFullName = userResult.value.fullName || undefined;
        userAvatarUrl = userResult.value.avatarUrl || undefined;
      }
    }

    // Create authenticated user context WITHOUT tenant
    // This is used for onboarding where user doesn't have a tenant yet
    const authUser: AuthUser = {
      id: tokenPayload.sub!,
      email: tokenPayload.email,
      tenantId: '', // Empty - user doesn't have a tenant yet
      role: UserRole.OWNER, // Will be owner of the new tenant
      permissions: getPermissionsForRole(UserRole.OWNER),
      metadata: {
        fullName: userFullName,
        avatarUrl: userAvatarUrl,
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
 * Internal API Key authentication - For secure server-to-server communication
 * Used for the /oauth/exchange endpoint where frontend server sends verified OAuth user data
 *
 * SECURITY: This replaces the previous authenticateOAuth which required SUPABASE_JWT_SECRET.
 * Now we use a simple API key since the frontend server (Next.js) has already verified
 * the OAuth flow via Supabase's exchangeCodeForSession() - a secure server-to-server call.
 *
 * The INTERNAL_API_KEY should be:
 * - At least 32 characters
 * - Shared only between frontend server and backend server
 * - Never exposed to client-side JavaScript
 */
export async function authenticateInternalAPI(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Get API key from header
  const apiKey = request.headers['x-internal-api-key'] as string;

  if (!apiKey) {
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Missing internal API key',
    });
  }

  // Validate API key
  const expectedApiKey = process.env.INTERNAL_API_KEY;

  if (!expectedApiKey) {
    request.log.error('INTERNAL_API_KEY not configured');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Server-to-server authentication not configured',
    });
  }

  // SECURITY: Minimum key length validation
  if (expectedApiKey.length < 32) {
    request.log.error('INTERNAL_API_KEY is too short (minimum 32 characters)');
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Server configuration error',
    });
  }

  // Constant-time comparison to prevent timing attacks
  if (!timingSafeEqual(apiKey, expectedApiKey)) {
    request.log.warn('Invalid internal API key attempt');
    return reply.status(401).send({
      statusCode: 401,
      error: 'Unauthorized',
      message: 'Invalid API key',
    });
  }

  // API key is valid - the actual user context will be created from request body
  // in the route handler (since the verified user data comes from the frontend server)
  request.log.info('Internal API authentication successful');
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Optional authentication - Does not fail if no token (Native JWT)
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
    const jwt = getJwtService();
    const verifyResult = await jwt.verifyAccessToken(token);

    if (verifyResult.isFailure || !verifyResult.value) {
      return; // Invalid token, continue without auth
    }

    const tokenPayload = verifyResult.value;
    const tenantId = request.headers['x-tenant-id'] as string;
    if (!tenantId) {
      return; // No tenant, continue without auth
    }

    // Use role from token or fallback to VIEWER
    const role = (tokenPayload.role as UserRole) || UserRole.VIEWER;

    const authUser: AuthUser = {
      id: tokenPayload.sub!,
      email: tokenPayload.email,
      tenantId,
      role,
      permissions: getPermissionsForRole(role),
      metadata: {},
    };

    request.tokenPayload = tokenPayload;
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
