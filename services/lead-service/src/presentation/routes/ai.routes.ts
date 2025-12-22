/**
 * AI Routes
 * REST API endpoints for AI-powered features
 */

import { FastifyPluginAsync } from 'fastify';
import { container } from 'tsyringe';
import { z } from 'zod';
import { AIService } from '../../infrastructure/ai';

// Validation schemas
const chatSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant']),
    content: z.string().min(1),
  })).min(1),
  options: z.object({
    model: z.string().optional(),
    temperature: z.number().min(0).max(2).optional(),
    maxTokens: z.number().int().min(1).max(128000).optional(),
    provider: z.enum(['openai', 'gemini']).optional(),
  }).optional(),
});

const scoreLeadSchema = z.object({
  leadData: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    source: z.string().optional(),
    notes: z.string().optional(),
    interactions: z.array(z.string()).optional(),
  }),
  factors: z.object({
    email: z.boolean().optional(),
    phone: z.boolean().optional(),
    company: z.boolean().optional(),
    title: z.boolean().optional(),
    website: z.boolean().optional(),
    socialProfiles: z.boolean().optional(),
    recentActivity: z.boolean().optional(),
    emailOpens: z.number().int().min(0).optional(),
    linkClicks: z.number().int().min(0).optional(),
    websiteVisits: z.number().int().min(0).optional(),
    formSubmissions: z.number().int().min(0).optional(),
    meetingsScheduled: z.number().int().min(0).optional(),
    industryMatch: z.boolean().optional(),
    companySize: z.string().optional(),
    budget: z.string().optional(),
    timeline: z.string().optional(),
    decisionMaker: z.boolean().optional(),
  }).optional(),
});

const generateEmailSchema = z.object({
  leadContext: z.object({
    name: z.string().min(1),
    company: z.string().optional(),
    title: z.string().optional(),
    previousInteractions: z.array(z.string()).optional(),
    notes: z.string().optional(),
  }),
  options: z.object({
    type: z.enum(['follow_up', 'introduction', 'proposal', 'thank_you', 'meeting_request', 'custom']),
    tone: z.enum(['formal', 'friendly', 'professional', 'casual']),
    length: z.enum(['short', 'medium', 'long']),
    includeCallToAction: z.boolean().optional(),
    customInstructions: z.string().max(1000).optional(),
  }),
});

const leadSummarySchema = z.object({
  leadData: z.object({
    name: z.string().min(1),
    email: z.string().email().optional(),
    company: z.string().optional(),
    title: z.string().optional(),
    source: z.string().optional(),
    status: z.string().optional(),
    score: z.number().int().optional(),
    notes: z.array(z.string()).optional(),
    activities: z.array(z.object({
      type: z.string(),
      description: z.string(),
      date: z.string(),
    })).optional(),
    communications: z.array(z.object({
      type: z.string(),
      content: z.string(),
      date: z.string(),
    })).optional(),
  }),
});

const sentimentSchema = z.object({
  text: z.string().min(1).max(10000),
});

const smartResponseSchema = z.object({
  context: z.object({
    message: z.string().min(1),
    leadName: z.string().optional(),
    conversationHistory: z.array(z.string()).optional(),
    product: z.string().optional(),
  }),
});

const conversationAnalysisSchema = z.object({
  messages: z.array(z.string()).min(1),
});

const productRecommendationSchema = z.object({
  leadContext: z.object({
    industry: z.string().optional(),
    companySize: z.string().optional(),
    budget: z.string().optional(),
    needs: z.array(z.string()).optional(),
    previousPurchases: z.array(z.string()).optional(),
  }),
  products: z.array(z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
    category: z.string(),
    price: z.number().optional(),
  })).min(1),
});

const createConversationSchema = z.object({
  leadId: z.string().uuid().optional(),
  title: z.string().max(255).optional(),
});

const sendMessageSchema = z.object({
  message: z.string().min(1).max(10000),
  systemPrompt: z.string().max(5000).optional(),
});

const addDocumentSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  category: z.string().min(1).max(100),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string()).optional(),
});

const searchKnowledgeSchema = z.object({
  query: z.string().min(1).max(500),
  limit: z.coerce.number().int().min(1).max(20).default(5),
});

const usageStatsSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

export const aiRoutes: FastifyPluginAsync = async (fastify) => {
  const aiService = container.resolve(AIService);

  // Helper to get tenant and user from request
  const getContext = (request: any) => ({
    tenantId: request.headers['x-tenant-id'] as string || 'default',
    userId: request.headers['x-user-id'] as string || 'system',
  });

  // ============================================
  // Chat & Completion
  // ============================================

  // Chat completion
  fastify.post('/chat', async (request, reply) => {
    const context = getContext(request);
    const validation = chatSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.chat(
      context.tenantId,
      context.userId,
      validation.data.messages,
      validation.data.options
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Lead Intelligence
  // ============================================

  // AI Lead Scoring
  fastify.post('/leads/score', async (request, reply) => {
    const context = getContext(request);
    const validation = scoreLeadSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.scoreLeadAI(
      context.tenantId,
      context.userId,
      validation.data.leadData,
      validation.data.factors || {}
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Lead Summary
  fastify.post('/leads/summary', async (request, reply) => {
    const context = getContext(request);
    const validation = leadSummarySchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.generateLeadSummary(
      context.tenantId,
      context.userId,
      validation.data.leadData
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Sentiment Analysis
  fastify.post('/sentiment', async (request, reply) => {
    const context = getContext(request);
    const validation = sentimentSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.analyzeSentiment(
      context.tenantId,
      context.userId,
      validation.data.text
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Email Generation
  // ============================================

  // Generate Email
  fastify.post('/emails/generate', async (request, reply) => {
    const context = getContext(request);
    const validation = generateEmailSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.generateEmail(
      context.tenantId,
      context.userId,
      validation.data.leadContext,
      validation.data.options
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Smart Response Suggestions
  fastify.post('/responses/suggest', async (request, reply) => {
    const context = getContext(request);
    const validation = smartResponseSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.suggestResponse(
      context.tenantId,
      context.userId,
      validation.data.context
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Conversation Analysis
  // ============================================

  // Analyze Conversation
  fastify.post('/conversations/analyze', async (request, reply) => {
    const context = getContext(request);
    const validation = conversationAnalysisSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.analyzeConversation(
      context.tenantId,
      context.userId,
      validation.data.messages
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Product Recommendations
  // ============================================

  // Recommend Products
  fastify.post('/products/recommend', async (request, reply) => {
    const context = getContext(request);
    const validation = productRecommendationSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.recommendProducts(
      context.tenantId,
      context.userId,
      validation.data.leadContext,
      validation.data.products
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // AI Assistant
  // ============================================

  // Create Conversation
  fastify.post('/assistant/conversations', async (request, reply) => {
    const context = getContext(request);
    const validation = createConversationSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.createConversation(
      context.tenantId,
      context.userId,
      validation.data.leadId,
      validation.data.title
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // List Conversations
  fastify.get('/assistant/conversations', async (request, reply) => {
    const context = getContext(request);
    const { leadId, limit } = request.query as { leadId?: string; limit?: string };

    const result = await aiService.listConversations(
      context.tenantId,
      context.userId,
      leadId,
      limit ? parseInt(limit, 10) : 20
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Get Conversation
  fastify.get('/assistant/conversations/:conversationId', async (request, reply) => {
    const context = getContext(request);
    const { conversationId } = request.params as { conversationId: string };

    const result = await aiService.getConversation(context.tenantId, conversationId);

    if (result.isFailure) {
      return reply.status(404).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // Send Message to Assistant
  fastify.post('/assistant/conversations/:conversationId/messages', async (request, reply) => {
    const context = getContext(request);
    const { conversationId } = request.params as { conversationId: string };
    const validation = sendMessageSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.sendMessage(
      context.tenantId,
      context.userId,
      conversationId,
      validation.data.message,
      validation.data.systemPrompt
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // ============================================
  // Knowledge Base
  // ============================================

  // Add Document
  fastify.post('/knowledge/documents', async (request, reply) => {
    const context = getContext(request);
    const validation = addDocumentSchema.safeParse(request.body);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.addDocument(
      context.tenantId,
      context.userId,
      validation.data
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.status(201).send(result.value);
  });

  // Search Knowledge Base
  fastify.get('/knowledge/search', async (request, reply) => {
    const context = getContext(request);
    const validation = searchKnowledgeSchema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.searchKnowledge(
      context.tenantId,
      context.userId,
      validation.data.query,
      validation.data.limit
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });

  // ============================================
  // Usage & Analytics
  // ============================================

  // Get Usage Stats
  fastify.get('/usage', async (request, reply) => {
    const context = getContext(request);
    const validation = usageStatsSchema.safeParse(request.query);

    if (!validation.success) {
      return reply.status(400).send({
        error: 'Validation error',
        details: validation.error.errors,
      });
    }

    const result = await aiService.getUsageStats(
      context.tenantId,
      validation.data.startDate ? new Date(validation.data.startDate) : undefined,
      validation.data.endDate ? new Date(validation.data.endDate) : undefined
    );

    if (result.isFailure) {
      return reply.status(400).send({ error: result.error });
    }

    return reply.send(result.value);
  });
};
