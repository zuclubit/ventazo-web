/**
 * Invitation Routes
 * Handles team invitations with token-based acceptance
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { toJsonSchema } from '../../utils/zod-schema';
import {
  InvitationService,
  InvitationStatus,
  UserRole,
  Permission,
  type CreateInvitationRequest,
  type BulkInvitationRequest,
} from '../../infrastructure/auth';
import {
  authenticate,
  authenticateWithoutTenant,
  optionalAuthenticate,
  requirePermission,
  getAuthUser,
} from '../middlewares/auth.middleware';

// Validation schemas
const createInvitationSchema = z.object({
  email: z.string().email('Valid email required'),
  role: z.nativeEnum(UserRole),
  fullName: z.string().optional(),
  message: z.string().max(500).optional(),
});

const bulkInvitationSchema = z.object({
  invitations: z.array(createInvitationSchema).min(1).max(50),
});

const acceptInvitationSchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

const acceptInvitationWithSignupSchema = z.object({
  token: z.string().min(1, 'El token es requerido'),
  password: z.string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(128, 'La contraseña no puede tener más de 128 caracteres'),
  fullName: z.string()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(100, 'El nombre no puede tener más de 100 caracteres'),
  phone: z.string()
    .regex(/^[\d\s\-+()]+$/, 'Número de teléfono inválido')
    .optional(),
});

const uuidParamSchema = z.object({
  id: z.string().uuid(),
});

// Empty body schema for endpoints that don't require body but may receive Content-Type header
const emptyBodySchema = z.object({}).optional();

/**
 * Invitation routes plugin
 */
export const invitationRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * Create a new invitation
   * POST /api/v1/invitations
   */
  fastify.post('/', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_INVITE),
    ],
    schema: {
      tags: ['Invitations'],
      summary: 'Create invitation',
      description: 'Send a team invitation to an email address',
      body: toJsonSchema(createInvitationSchema),
      response: {
        201: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            role: { type: 'string' },
            status: { type: 'string' },
            expiresAt: { type: 'string' },
            createdAt: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = createInvitationSchema.parse(request.body) as CreateInvitationRequest;

    // Validate role hierarchy
    const roleHierarchy: UserRole[] = [
      UserRole.VIEWER,
      UserRole.SALES_REP,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.OWNER,
    ];

    const inviterRoleIndex = roleHierarchy.indexOf(user.role);
    const inviteeRoleIndex = roleHierarchy.indexOf(body.role);

    if (inviteeRoleIndex > inviterRoleIndex) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Cannot invite a user with a higher role than your own',
      });
    }

    const invitationService = container.resolve(InvitationService);
    const inviterName = user.metadata?.fullName || user.email;

    const result = await invitationService.createInvitation(
      user.tenantId,
      body,
      user.id,
      inviterName
    );

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // Don't expose token in response
    const { token, ...invitationWithoutToken } = result.value!;
    return reply.status(201).send(invitationWithoutToken);
  });

  /**
   * Create bulk invitations
   * POST /api/v1/invitations/bulk
   */
  fastify.post('/bulk', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_INVITE),
    ],
    schema: {
      tags: ['Invitations'],
      summary: 'Create bulk invitations',
      description: 'Send multiple team invitations at once',
      body: toJsonSchema(bulkInvitationSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const body = bulkInvitationSchema.parse(request.body) as BulkInvitationRequest;

    // Validate role hierarchy for all invitations
    const roleHierarchy: UserRole[] = [
      UserRole.VIEWER,
      UserRole.SALES_REP,
      UserRole.MANAGER,
      UserRole.ADMIN,
      UserRole.OWNER,
    ];
    const inviterRoleIndex = roleHierarchy.indexOf(user.role);

    const invalidRoles = body.invitations.filter(inv => {
      const inviteeRoleIndex = roleHierarchy.indexOf(inv.role);
      return inviteeRoleIndex > inviterRoleIndex;
    });

    if (invalidRoles.length > 0) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Cannot invite users with roles higher than your own: ${invalidRoles.map(i => i.email).join(', ')}`,
      });
    }

    const invitationService = container.resolve(InvitationService);
    const inviterName = user.metadata?.fullName || user.email;

    const result = await invitationService.createBulkInvitations(
      user.tenantId,
      body,
      user.id,
      inviterName
    );

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(201).send(result.value);
  });

  /**
   * Get pending invitations for current tenant
   * GET /api/v1/invitations
   */
  fastify.get('/', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_VIEW),
    ],
    schema: {
      tags: ['Invitations'],
      summary: 'List pending invitations',
      description: 'Get all pending invitations for the current tenant',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const invitationService = container.resolve(InvitationService);

    const result = await invitationService.getPendingInvitations(user.tenantId);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // Remove tokens from response
    const invitations = result.value!.map(({ token, ...inv }) => inv);
    return invitations;
  });

  /**
   * Get invitation details by token (public endpoint for acceptance page)
   * GET /api/v1/invitations/token/:token
   */
  fastify.get('/token/:token', {
    schema: {
      tags: ['Invitations'],
      summary: 'Get invitation by token',
      description: 'Get invitation details for acceptance page (public)',
      params: toJsonSchema(z.object({
        token: z.string(),
      })),
    },
  }, async (request, reply) => {
    const { token } = request.params as { token: string };
    const invitationService = container.resolve(InvitationService);

    const result = await invitationService.getInvitationByToken(token);

    if (result.isFailure || !result.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Invalid or expired invitation',
      });
    }

    const invitation = result.value;

    // Check if expired
    if (new Date() > new Date(invitation.expiresAt)) {
      return reply.status(410).send({
        statusCode: 410,
        error: 'Gone',
        message: 'This invitation has expired',
      });
    }

    // Check status
    if (invitation.status === InvitationStatus.ACCEPTED) {
      return reply.status(410).send({
        statusCode: 410,
        error: 'Gone',
        message: 'This invitation has already been accepted',
      });
    }

    if (invitation.status === InvitationStatus.CANCELLED) {
      return reply.status(410).send({
        statusCode: 410,
        error: 'Gone',
        message: 'This invitation has been cancelled',
      });
    }

    // Return invitation without sensitive data
    return {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      status: invitation.status,
      expiresAt: invitation.expiresAt,
      tenant: invitation.tenant,
      inviterName: invitation.inviterName,
      customMessage: invitation.customMessage,
    };
  });

  /**
   * Accept invitation
   * POST /api/v1/invitations/accept
   * Note: Uses authenticateWithoutTenant because user might not have access to any tenant yet
   */
  fastify.post('/accept', {
    preHandler: [authenticateWithoutTenant],
    schema: {
      tags: ['Invitations'],
      summary: 'Accept invitation',
      description: 'Accept a team invitation using token',
      body: toJsonSchema(acceptInvitationSchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { token } = acceptInvitationSchema.parse(request.body);

    const invitationService = container.resolve(InvitationService);

    // Verify invitation email matches authenticated user
    const invitationResult = await invitationService.getInvitationByToken(token);
    if (invitationResult.isFailure || !invitationResult.value) {
      return reply.status(404).send({
        statusCode: 404,
        error: 'Not Found',
        message: 'Invalid or expired invitation',
      });
    }

    if (invitationResult.value.email.toLowerCase() !== user.email.toLowerCase()) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'This invitation was sent to a different email address',
      });
    }

    // Pass user email and fullName to create user record if needed
    const result = await invitationService.acceptInvitation(
      token,
      user.id,
      user.email,
      user.metadata?.fullName
    );

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return {
      message: 'Invitation accepted successfully',
      membership: result.value,
    };
  });

  /**
   * Accept invitation with signup (for new users)
   * POST /api/v1/invitations/accept-signup
   *
   * This endpoint allows new users to create an account and accept
   * an invitation in a single step. No authentication required.
   *
   * The email is automatically verified since the user received the invitation.
   */
  fastify.post('/accept-signup', {
    schema: {
      tags: ['Invitations'],
      summary: 'Accept invitation with signup',
      description: 'Create account and accept invitation in one step (for new users)',
      body: toJsonSchema(acceptInvitationWithSignupSchema),
      response: {
        200: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            user: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                email: { type: 'string' },
                fullName: { type: 'string' },
                avatarUrl: { type: 'string', nullable: true },
                tenantId: { type: 'string' },
                role: { type: 'string' },
              },
            },
            membership: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                userId: { type: 'string' },
                tenantId: { type: 'string' },
                role: { type: 'string' },
              },
            },
            session: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
                expiresIn: { type: 'number' },
                expiresAt: { type: 'number' },
              },
            },
          },
        },
        400: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        410: {
          type: 'object',
          properties: {
            statusCode: { type: 'number' },
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const body = acceptInvitationWithSignupSchema.parse(request.body);
    const invitationService = container.resolve(InvitationService);

    const result = await invitationService.acceptInvitationWithSignup({
      token: body.token,
      password: body.password,
      fullName: body.fullName,
      phone: body.phone,
    });

    if (result.isFailure) {
      // Determine appropriate status code based on error
      const errorMsg = result.error || 'Error al procesar la invitación';

      if (errorMsg.includes('expirada') || errorMsg.includes('cancelada') || errorMsg.includes('aceptada')) {
        return reply.status(410).send({
          statusCode: 410,
          error: 'Gone',
          message: errorMsg,
        });
      }

      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: errorMsg,
      });
    }

    return {
      message: '¡Cuenta creada exitosamente! Bienvenido al equipo.',
      user: result.value!.user,
      membership: result.value!.membership,
      session: result.value!.session,
    };
  });

  /**
   * Resend invitation
   * POST /api/v1/invitations/:id/resend
   */
  fastify.post('/:id/resend', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_INVITE),
    ],
    schema: {
      tags: ['Invitations'],
      summary: 'Resend invitation',
      description: 'Resend an invitation with a new token and expiration',
      params: toJsonSchema(uuidParamSchema),
      body: toJsonSchema(emptyBodySchema),
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const { id } = uuidParamSchema.parse(request.params);

    const invitationService = container.resolve(InvitationService);
    const inviterName = user.metadata?.fullName || user.email;

    const result = await invitationService.resendInvitation(id, inviterName);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // Don't expose token in response
    const { token, ...invitationWithoutToken } = result.value!;
    return invitationWithoutToken;
  });

  /**
   * Cancel invitation
   * DELETE /api/v1/invitations/:id
   */
  fastify.delete('/:id', {
    preHandler: [
      authenticate,
      requirePermission(Permission.USER_MANAGE),
    ],
    schema: {
      tags: ['Invitations'],
      summary: 'Cancel invitation',
      description: 'Cancel a pending invitation',
      params: toJsonSchema(uuidParamSchema),
    },
  }, async (request, reply) => {
    const { id } = uuidParamSchema.parse(request.params);

    const invitationService = container.resolve(InvitationService);
    const result = await invitationService.cancelInvitation(id);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    return reply.status(204).send();
  });

  /**
   * Get invitations for current user's email
   * GET /api/v1/invitations/my-invitations
   */
  fastify.get('/my-invitations', {
    preHandler: [authenticate],
    schema: {
      tags: ['Invitations'],
      summary: 'Get my pending invitations',
      description: 'Get all pending invitations sent to the authenticated user',
    },
  }, async (request, reply) => {
    const user = getAuthUser(request);
    const invitationService = container.resolve(InvitationService);

    const result = await invitationService.getInvitationsForEmail(user.email);

    if (result.isFailure) {
      return reply.status(400).send({
        statusCode: 400,
        error: 'Bad Request',
        message: result.error,
      });
    }

    // Remove tokens from response, but include them for user's own invitations
    // since they need to accept them
    return result.value!.map(inv => ({
      ...inv,
      // Keep token for user's own invitations to allow acceptance
    }));
  });
};
