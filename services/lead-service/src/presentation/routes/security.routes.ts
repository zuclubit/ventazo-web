/**
 * Security Routes
 * API endpoints for security management (2FA, sessions, policies)
 *
 * @module presentation/routes/security.routes
 */

import { FastifyInstance, FastifyPluginOptions, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';

import { getTenantId, getUserId, getSessionId } from '../middlewares/tenant.middleware';
import { validate } from '../middlewares/validation.middleware';
import { HttpError } from '../middlewares/error-handler.middleware';
import { SecurityService } from '../../infrastructure/security';
import { requireRole } from '../middlewares/auth.middleware';
import { UserRole } from '../../infrastructure/auth';

// ============================================
// Validation Schemas
// ============================================

const enable2FASchema = z.object({
  method: z.enum(['totp', 'sms', 'email']).default('totp'),
});

const verify2FASchema = z.object({
  code: z.string().min(6).max(8),
  setupToken: z.string().optional(),
});

const disable2FASchema = z.object({
  code: z.string().min(6).max(8),
  password: z.string().min(1),
});

const sessionIdParamsSchema = z.object({
  sessionId: z.string().uuid(),
});

const updatePasswordPolicySchema = z.object({
  minLength: z.number().min(6).max(128).optional(),
  requireUppercase: z.boolean().optional(),
  requireLowercase: z.boolean().optional(),
  requireNumbers: z.boolean().optional(),
  requireSpecialChars: z.boolean().optional(),
  maxAge: z.number().min(0).max(365).optional(),
  preventReuse: z.number().min(0).max(24).optional(),
  lockoutThreshold: z.number().min(1).max(10).optional(),
  lockoutDuration: z.number().min(1).max(1440).optional(),
});

const updateSessionSettingsSchema = z.object({
  sessionTimeout: z.number().min(5).max(1440).optional(),
  allowRememberMe: z.boolean().optional(),
  maxConcurrentSessions: z.number().min(1).max(20).optional(),
  requireReauthForSensitive: z.boolean().optional(),
});

// ============================================
// JSON Schemas for OpenAPI
// ============================================

const TwoFactorStatusSchema = {
  $id: 'TwoFactorStatus',
  type: 'object',
  properties: {
    isEnabled: { type: 'boolean' },
    method: { type: 'string', enum: ['totp', 'sms', 'email'] },
    verifiedAt: { type: 'string', format: 'date-time', nullable: true },
    hasBackupCodes: { type: 'boolean' },
  },
};

const Enable2FAResponseSchema = {
  $id: 'Enable2FAResponse',
  type: 'object',
  properties: {
    secret: { type: 'string' },
    qrCodeUrl: { type: 'string' },
    backupCodes: { type: 'array', items: { type: 'string' } },
    setupToken: { type: 'string' },
  },
};

const SessionSchema = {
  $id: 'UserSession',
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    device: { type: 'string' },
    location: { type: 'string' },
    ipAddress: { type: 'string' },
    lastActive: { type: 'string' },
    createdAt: { type: 'string', format: 'date-time' },
    isCurrent: { type: 'boolean' },
  },
};

const SecurityStatsSchema = {
  $id: 'SecurityStats',
  type: 'object',
  properties: {
    accountStatus: { type: 'string', enum: ['secure', 'at_risk', 'compromised'] },
    twoFactorEnabled: { type: 'boolean' },
    activeSessions: { type: 'integer' },
    lastLoginAt: { type: 'string', format: 'date-time', nullable: true },
    lastLoginIp: { type: 'string', nullable: true },
    lastLoginLocation: { type: 'string', nullable: true },
    passwordLastChanged: { type: 'string', format: 'date-time', nullable: true },
    recentSecurityEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          description: { type: 'string' },
          ipAddress: { type: 'string', nullable: true },
          location: { type: 'string', nullable: true },
          timestamp: { type: 'string', format: 'date-time' },
          success: { type: 'boolean' },
        },
      },
    },
  },
};

const PasswordPolicySchema = {
  $id: 'PasswordPolicy',
  type: 'object',
  properties: {
    minLength: { type: 'integer' },
    requireUppercase: { type: 'boolean' },
    requireLowercase: { type: 'boolean' },
    requireNumbers: { type: 'boolean' },
    requireSpecialChars: { type: 'boolean' },
    maxAge: { type: 'integer' },
    preventReuse: { type: 'integer' },
    lockoutThreshold: { type: 'integer' },
    lockoutDuration: { type: 'integer' },
  },
};

const SessionSettingsSchema = {
  $id: 'SessionSettings',
  type: 'object',
  properties: {
    sessionTimeout: { type: 'integer' },
    allowRememberMe: { type: 'boolean' },
    maxConcurrentSessions: { type: 'integer' },
    requireReauthForSensitive: { type: 'boolean' },
  },
};

// ============================================
// Routes
// ============================================

export async function securityRoutes(
  server: FastifyInstance,
  _options: FastifyPluginOptions
): Promise<void> {
  const securityService = container.resolve(SecurityService);

  // Register schemas
  const schemas = [
    TwoFactorStatusSchema,
    Enable2FAResponseSchema,
    SessionSchema,
    SecurityStatsSchema,
    PasswordPolicySchema,
    SessionSettingsSchema,
  ];

  for (const schema of schemas) {
    if (!server.getSchema(schema.$id)) {
      server.addSchema(schema);
    }
  }

  // ============================================
  // TWO-FACTOR AUTHENTICATION
  // ============================================

  /**
   * GET /security/2fa/status - Get 2FA status
   */
  server.get(
    '/2fa/status',
    {
      schema: {
        description: 'Get two-factor authentication status for the current user',
        tags: ['Security'],
        response: {
          200: { $ref: 'TwoFactorStatus' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.get2FAStatus(userId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * POST /security/2fa/enable - Initialize 2FA setup
   */
  server.post<{ Body: z.infer<typeof enable2FASchema> }>(
    '/2fa/enable',
    {
      preHandler: validate({ body: enable2FASchema }),
      schema: {
        description: 'Initialize two-factor authentication setup',
        tags: ['Security'],
        body: {
          type: 'object',
          properties: {
            method: { type: 'string', enum: ['totp', 'sms', 'email'], default: 'totp' },
          },
        },
        response: {
          200: { $ref: 'Enable2FAResponse' },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof enable2FASchema> }>, reply: FastifyReply) => {
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // Get user email from request context or database
      const email = (request as unknown as { user?: { email?: string } }).user?.email || 'user@example.com';

      const result = await securityService.enable2FA(userId, email, request.body.method);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * POST /security/2fa/verify - Verify and activate 2FA
   */
  server.post<{ Body: z.infer<typeof verify2FASchema> }>(
    '/2fa/verify',
    {
      preHandler: validate({ body: verify2FASchema }),
      schema: {
        description: 'Verify 2FA code and activate two-factor authentication',
        tags: ['Security'],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 8 },
            setupToken: { type: 'string' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              backupCodes: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof verify2FASchema> }>, reply: FastifyReply) => {
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const { code, setupToken } = request.body;
      const result = await securityService.verify2FA(userId, code, setupToken);

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * POST /security/2fa/disable - Disable 2FA
   */
  server.post<{ Body: z.infer<typeof disable2FASchema> }>(
    '/2fa/disable',
    {
      preHandler: validate({ body: disable2FASchema }),
      schema: {
        description: 'Disable two-factor authentication',
        tags: ['Security'],
        body: {
          type: 'object',
          required: ['code', 'password'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 8 },
            password: { type: 'string', minLength: 1 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: z.infer<typeof disable2FASchema> }>, reply: FastifyReply) => {
      const userId = getUserId(request);
      const tenantId = getTenantId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.disable2FA(userId, tenantId, request.body.code);

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send({ success: true });
    }
  );

  /**
   * POST /security/2fa/backup-codes/regenerate - Regenerate backup codes
   */
  server.post<{ Body: { code: string } }>(
    '/2fa/backup-codes/regenerate',
    {
      schema: {
        description: 'Regenerate 2FA backup codes',
        tags: ['Security'],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', minLength: 6, maxLength: 8 },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              backupCodes: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
    },
    async (request: FastifyRequest<{ Body: { code: string } }>, reply: FastifyReply) => {
      const userId = getUserId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.regenerateBackupCodes(userId, request.body.code);

      if (result.isFailure) {
        throw new HttpError(400, 'Bad Request', result.getError());
      }

      return reply.status(200).send({ backupCodes: result.getValue() });
    }
  );

  // ============================================
  // SESSION MANAGEMENT
  // ============================================

  /**
   * GET /security/sessions - List active sessions
   */
  server.get(
    '/sessions',
    {
      schema: {
        description: 'Get all active sessions for the current user',
        tags: ['Security'],
        response: {
          200: {
            type: 'object',
            properties: {
              sessions: {
                type: 'array',
                items: { $ref: 'UserSession' },
              },
              currentSessionId: { type: 'string' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const currentSessionId = getSessionId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.getActiveSessions(userId, tenantId, currentSessionId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * DELETE /security/sessions/:sessionId - Revoke a session
   */
  server.delete<{ Params: z.infer<typeof sessionIdParamsSchema> }>(
    '/sessions/:sessionId',
    {
      preHandler: validate({ params: sessionIdParamsSchema }),
      schema: {
        description: 'Revoke a specific session',
        tags: ['Security'],
        params: {
          type: 'object',
          required: ['sessionId'],
          properties: {
            sessionId: { type: 'string', format: 'uuid' },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Params: z.infer<typeof sessionIdParamsSchema> }>,
      reply: FastifyReply
    ) => {
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const currentSessionId = getSessionId(request);
      const { sessionId } = request.params;

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      // Don't allow revoking current session
      if (sessionId === currentSessionId) {
        throw new HttpError(400, 'Bad Request', 'Cannot revoke current session. Use logout instead.');
      }

      const result = await securityService.revokeSession(sessionId, userId, tenantId, userId);

      if (result.isFailure) {
        throw new HttpError(404, 'Not Found', result.getError());
      }

      return reply.status(200).send({ success: true });
    }
  );

  /**
   * DELETE /security/sessions - Revoke all sessions except current
   */
  server.delete(
    '/sessions',
    {
      schema: {
        description: 'Revoke all sessions except the current one',
        tags: ['Security'],
        response: {
          200: {
            type: 'object',
            properties: {
              revokedCount: { type: 'integer' },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const tenantId = getTenantId(request);
      const currentSessionId = getSessionId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.revokeAllSessions(
        userId,
        tenantId,
        currentSessionId || '',
        userId
      );

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send({ revokedCount: result.getValue() });
    }
  );

  // ============================================
  // SECURITY STATS
  // ============================================

  /**
   * GET /security/stats - Get security statistics
   */
  server.get(
    '/stats',
    {
      schema: {
        description: 'Get security statistics for the current user',
        tags: ['Security'],
        response: {
          200: { $ref: 'SecurityStats' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const userId = getUserId(request);
      const tenantId = getTenantId(request);

      if (!userId) {
        throw new HttpError(401, 'Unauthorized', 'User ID is required');
      }

      const result = await securityService.getSecurityStats(userId, tenantId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ============================================
  // PASSWORD POLICY (Admin Only)
  // ============================================

  /**
   * GET /security/password-policy - Get password policy
   */
  server.get(
    '/password-policy',
    {
      schema: {
        description: 'Get password policy for the tenant',
        tags: ['Security'],
        response: {
          200: { $ref: 'PasswordPolicy' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await securityService.getPasswordPolicy(tenantId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * PATCH /security/password-policy - Update password policy (Admin only)
   */
  server.patch<{ Body: z.infer<typeof updatePasswordPolicySchema> }>(
    '/password-policy',
    {
      preHandler: [
        requireRole(UserRole.OWNER, UserRole.ADMIN),
        validate({ body: updatePasswordPolicySchema }),
      ],
      schema: {
        description: 'Update password policy for the tenant (Admin only)',
        tags: ['Security'],
        body: {
          type: 'object',
          properties: {
            minLength: { type: 'integer', minimum: 6, maximum: 128 },
            requireUppercase: { type: 'boolean' },
            requireLowercase: { type: 'boolean' },
            requireNumbers: { type: 'boolean' },
            requireSpecialChars: { type: 'boolean' },
            maxAge: { type: 'integer', minimum: 0, maximum: 365 },
            preventReuse: { type: 'integer', minimum: 0, maximum: 24 },
            lockoutThreshold: { type: 'integer', minimum: 1, maximum: 10 },
            lockoutDuration: { type: 'integer', minimum: 1, maximum: 1440 },
          },
        },
        response: {
          200: { $ref: 'PasswordPolicy' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof updatePasswordPolicySchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);

      const result = await securityService.updatePasswordPolicy(tenantId, request.body);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  // ============================================
  // SESSION SETTINGS (Admin Only)
  // ============================================

  /**
   * GET /security/session-settings - Get session settings
   */
  server.get(
    '/session-settings',
    {
      schema: {
        description: 'Get session settings for the tenant',
        tags: ['Security'],
        response: {
          200: { $ref: 'SessionSettings' },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = getTenantId(request);

      const result = await securityService.getSessionSettings(tenantId);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );

  /**
   * PATCH /security/session-settings - Update session settings (Admin only)
   */
  server.patch<{ Body: z.infer<typeof updateSessionSettingsSchema> }>(
    '/session-settings',
    {
      preHandler: [
        requireRole(UserRole.OWNER, UserRole.ADMIN),
        validate({ body: updateSessionSettingsSchema }),
      ],
      schema: {
        description: 'Update session settings for the tenant (Admin only)',
        tags: ['Security'],
        body: {
          type: 'object',
          properties: {
            sessionTimeout: { type: 'integer', minimum: 5, maximum: 1440 },
            allowRememberMe: { type: 'boolean' },
            maxConcurrentSessions: { type: 'integer', minimum: 1, maximum: 20 },
            requireReauthForSensitive: { type: 'boolean' },
          },
        },
        response: {
          200: { $ref: 'SessionSettings' },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: z.infer<typeof updateSessionSettingsSchema> }>,
      reply: FastifyReply
    ) => {
      const tenantId = getTenantId(request);

      const result = await securityService.updateSessionSettings(tenantId, request.body);

      if (result.isFailure) {
        throw new HttpError(500, 'Internal Server Error', result.getError());
      }

      return reply.status(200).send(result.getValue());
    }
  );
}

export default securityRoutes;
