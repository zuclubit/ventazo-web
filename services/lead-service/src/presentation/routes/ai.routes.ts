/**
 * AI Routes (Refactored)
 *
 * REST API endpoints for AI-powered features.
 * All AI logic is delegated to the Bot Management System.
 * The CRM is AI-agnostic.
 *
 * @module presentation/routes/ai.routes
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AIService, BotUserContext } from '../../infrastructure/ai';

// ============================================
// Validation Schemas
// ============================================

const agentRequestSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const confirmationSchema = z.object({
  requestId: z.string().uuid(),
  decision: z.enum(['confirm', 'cancel', 'modify']),
  modifications: z.record(z.unknown()).optional(),
});

const leadScoreSchema = z.object({
  leadData: z.record(z.unknown()),
});

const sentimentSchema = z.object({
  text: z.string().min(1).max(10000),
});

const emailGenerateSchema = z.object({
  type: z.enum(['followup', 'intro', 'proposal', 'thankyou', 'reminder']),
  context: z.object({
    recipientName: z.string().min(1),
    recipientCompany: z.string().optional(),
    senderName: z.string().min(1),
    subject: z.string().optional(),
    previousInteractions: z.array(z.string()).optional(),
    customInstructions: z.string().optional(),
  }),
});

// ============================================
// Helper Functions
// ============================================

function getUserContext(request: FastifyRequest): BotUserContext {
  const headers = request.headers;
  const user = (request as unknown as { user?: Record<string, unknown> }).user || {};

  return {
    userId: (headers['x-user-id'] as string) || (user.sub as string) || '',
    email: (headers['x-user-email'] as string) || (user.email as string) || '',
    displayName: (headers['x-user-name'] as string) || (user.name as string) || 'User',
    role: (headers['x-user-role'] as string) || (user.role as string) || 'user',
    permissions: ((headers['x-user-permissions'] as string) || '').split(',').filter(Boolean),
    tenantId: (headers['x-tenant-id'] as string) || '',
    timezone: (headers['x-user-timezone'] as string) || undefined,
    locale: (headers['x-user-locale'] as string) || 'es',
  };
}

function getTenantContext(request: FastifyRequest): { tenantId: string; userId: string } {
  return {
    tenantId: (request.headers['x-tenant-id'] as string) || 'default',
    userId: (request.headers['x-user-id'] as string) || 'system',
  };
}

// ============================================
// Routes
// ============================================

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const aiService = container.resolve(AIService);

  // ============================================
  // Health Check
  // ============================================

  fastify.get('/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const isAvailable = aiService.isAvailable();

    if (!isAvailable) {
      return reply.status(503).send({
        status: 'unavailable',
        message: 'Bot Management System not configured',
      });
    }

    const isHealthy = await aiService.healthCheck();

    if (!isHealthy) {
      return reply.status(503).send({
        status: 'unhealthy',
        message: 'Bot Management System not responding',
      });
    }

    return reply.send({
      status: 'healthy',
      message: 'AI services available via Bot Management System',
      timestamp: new Date().toISOString(),
    });
  });

  // ============================================
  // Agent (Conversational AI)
  // ============================================

  /**
   * POST /agent - Process message through AI agent
   * Delegates to Bot Management System
   */
  fastify.post('/agent', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserContext(request);

    if (!user.userId || !user.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User context required',
      });
    }

    const validation = agentRequestSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.processAgentMessage(
      validation.data.message,
      user,
      validation.data.conversationId,
      validation.data.metadata
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  /**
   * POST /agent/confirm - Handle confirmation response
   */
  fastify.post('/agent/confirm', async (request: FastifyRequest, reply: FastifyReply) => {
    const user = getUserContext(request);

    if (!user.userId || !user.tenantId) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'User context required',
      });
    }

    const validation = confirmationSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.handleConfirmation(
      validation.data.requestId,
      validation.data.decision,
      user,
      validation.data.modifications
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Lead Scoring
  // ============================================

  /**
   * POST /leads/score - AI-powered lead scoring
   * Delegates to Bot Management System
   */
  fastify.post('/leads/score', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getTenantContext(request);

    const validation = leadScoreSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.scoreLead(
      validation.data.leadData,
      context.tenantId,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Sentiment Analysis
  // ============================================

  /**
   * POST /sentiment - Analyze text sentiment
   * Delegates to Bot Management System
   */
  fastify.post('/sentiment', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getTenantContext(request);

    const validation = sentimentSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.analyzeSentiment(
      validation.data.text,
      context.tenantId,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Email Generation
  // ============================================

  /**
   * POST /emails/generate - Generate email content
   * Delegates to Bot Management System
   */
  fastify.post('/emails/generate', async (request: FastifyRequest, reply: FastifyReply) => {
    const context = getTenantContext(request);

    const validation = emailGenerateSchema.safeParse(request.body);
    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.generateEmail(
      validation.data.type,
      {
        recipientName: validation.data.context.recipientName,
        recipientCompany: validation.data.context.recipientCompany,
        senderName: validation.data.context.senderName,
        subject: validation.data.context.subject,
        previousInteractions: validation.data.context.previousInteractions,
        customInstructions: validation.data.context.customInstructions,
      },
      context.tenantId,
      context.userId
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });
};

export default aiRoutes;
