// ============================================
// AI Hooks - FASE 6.0
// FASE 6.4 — Updated to connect to real backend endpoints
// React Query hooks for AI operations
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api';

import type {
  AIConversionPrediction,
  AIEnrichment,
  AIInsight,
  AILeadClassification,
  AILeadScore,
  AILeadSummary,
  AINoteSummary,
  AIPrediction,
  AIProvider,
  AIStageChangePrediction,
  CRMContext,
} from './types';

// ============================================
// Types
// ============================================

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  notes?: string;
  customFields?: Record<string, unknown>;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author?: string;
}

interface AIOptions {
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
  model?: string;
}

interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  metadata?: {
    provider: AIProvider;
    model: string;
    tokensUsed: { prompt: number; completion: number; total: number };
    latencyMs: number;
  };
}

// FASE 6.4 — Backend AI endpoint types
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LeadScoreFactors {
  email?: boolean;
  phone?: boolean;
  company?: boolean;
  title?: boolean;
  website?: boolean;
  socialProfiles?: boolean;
  recentActivity?: boolean;
  emailOpens?: number;
  linkClicks?: number;
  websiteVisits?: number;
  formSubmissions?: number;
  meetingsScheduled?: number;
  industryMatch?: boolean;
  companySize?: string;
  budget?: string;
  timeline?: string;
  decisionMaker?: boolean;
}

interface EmailGenerationOptions {
  type: 'follow_up' | 'introduction' | 'proposal' | 'thank_you' | 'meeting_request' | 'custom';
  tone: 'formal' | 'friendly' | 'professional' | 'casual';
  length: 'short' | 'medium' | 'long';
  includeCallToAction?: boolean;
  customInstructions?: string;
}

// ============================================
// Query Keys
// ============================================

export const aiQueryKeys = {
  all: ['ai'] as const,
  summary: (type: string, id: string) => [...aiQueryKeys.all, 'summary', type, id] as const,
  score: (leadId: string) => [...aiQueryKeys.all, 'score', leadId] as const,
  classification: (text: string) => [...aiQueryKeys.all, 'classify', text.slice(0, 50)] as const,
  prediction: (type: string, leadId: string) => [...aiQueryKeys.all, 'predict', type, leadId] as const,
  insights: (entityType: string, entityId: string) => [...aiQueryKeys.all, 'insights', entityType, entityId] as const,
  enrichment: (leadId: string) => [...aiQueryKeys.all, 'enrich', leadId] as const,
  // FASE 6.4 — New query keys for backend endpoints
  chat: (conversationId?: string) => [...aiQueryKeys.all, 'chat', conversationId] as const,
  conversations: () => [...aiQueryKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...aiQueryKeys.all, 'conversation', id] as const,
  sentiment: (text: string) => [...aiQueryKeys.all, 'sentiment', text.slice(0, 50)] as const,
  usage: (startDate?: string, endDate?: string) => [...aiQueryKeys.all, 'usage', startDate, endDate] as const,
  knowledge: (query?: string) => [...aiQueryKeys.all, 'knowledge', query] as const,
};

// ============================================
// API Functions - FASE 6.4 Updated to use /api/v1/ai
// Now using centralized apiClient for proper auth and tenant headers
// ============================================

const AI_BASE_URL = '/ai';

const fetchAPI = async <T>(endpoint: string, body: unknown, method: 'POST' | 'GET' = 'POST'): Promise<T> => {
  const url = `${AI_BASE_URL}/${endpoint}`;

  if (method === 'GET') {
    // For GET requests, pass params as query string
    const params = body as Record<string, string> | null;
    return apiClient.get<T>(url, params ? { params } : undefined);
  }

  // For POST requests
  return apiClient.post<T>(url, body);
};

// Legacy wrapper for backwards compatibility
const fetchAPILegacy = async <T>(endpoint: string, body: unknown): Promise<APIResponse<T>> => {
  try {
    const data = await fetchAPI<T>(endpoint, body);
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

// ============================================
// Lead Summary Hook
// ============================================

interface UseLeadSummaryParams {
  text: string;
  leadId: string;
  options?: AIOptions;
  enabled?: boolean;
}

export const useLeadSummary = ({ text, leadId, options, enabled = true }: UseLeadSummaryParams) => {
  return useQuery({
    queryKey: aiQueryKeys.summary('lead', leadId),
    queryFn: async () => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadSummary>('leads/summary', {
        leadData: { name: text },
        options,
      });
    },
    enabled: enabled && !!text && !!leadId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  });
};

// ============================================
// Note Summary Hook
// ============================================

interface UseNoteSummaryParams {
  notes: Note[];
  options?: AIOptions;
  enabled?: boolean;
}

export const useNoteSummary = ({ notes, options, enabled = true }: UseNoteSummaryParams) => {
  const noteIds = notes.map((n) => n.id).join(',');

  return useQuery({
    queryKey: aiQueryKeys.summary('notes', noteIds),
    queryFn: async () => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AINoteSummary>('leads/summary', {
        leadData: {
          name: 'Notes Summary',
          notes: notes.map(n => n.content),
        },
        options,
      });
    },
    enabled: enabled && notes.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============================================
// Lead Score Hook
// ============================================

interface UseLeadScoreParams {
  lead: Lead;
  options?: AIOptions;
  enabled?: boolean;
}

export const useLeadScore = ({ lead, options, enabled = true }: UseLeadScoreParams) => {
  return useQuery({
    queryKey: aiQueryKeys.score(lead.id),
    queryFn: async () => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadScore>('leads/score', {
        leadData: {
          name: lead.firstName || lead.lastName || lead.id,
          email: lead.email,
          company: lead.company,
          title: lead.title,
          source: lead.source,
          notes: lead.notes,
        },
        factors: {},
      });
    },
    enabled: enabled && !!lead.id,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// ============================================
// Lead Classification Hook
// ============================================

interface UseLeadClassificationParams {
  text: string;
  options?: AIOptions;
  enabled?: boolean;
}

export const useLeadClassification = ({ text, options, enabled = true }: UseLeadClassificationParams) => {
  return useQuery({
    queryKey: aiQueryKeys.classification(text),
    queryFn: async () => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadClassification>('conversations/analyze', {
        messages: [text],
      });
    },
    enabled: enabled && !!text,
    staleTime: 30 * 60 * 1000, // 30 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
};

// ============================================
// Stage Prediction Hook
// ============================================

interface UseStagePredictionParams {
  lead: Lead;
  stageHistory?: Array<{ stage: string; enteredAt: string }>;
  options?: AIOptions;
  enabled?: boolean;
}

export const useStagePrediction = ({
  lead,
  stageHistory,
  options,
  enabled = true,
}: UseStagePredictionParams) => {
  return useQuery({
    queryKey: aiQueryKeys.prediction('stage', lead.id),
    queryFn: async () => {
      // FASE 6.4 — Use chat endpoint for predictions
      return fetchAPI<AIPrediction<AIStageChangePrediction>>('chat', {
        messages: [
          { role: 'system', content: 'You are a sales prediction assistant. Analyze lead stage progression.' },
          { role: 'user', content: `Predict next stage for lead: ${JSON.stringify({ lead, stageHistory })}` },
        ],
        options,
      });
    },
    enabled: enabled && !!lead.id,
    staleTime: 15 * 60 * 1000, // 15 minutes
    gcTime: 60 * 60 * 1000,
  });
};

// ============================================
// Conversion Prediction Hook
// ============================================

interface UseConversionPredictionParams {
  lead: Lead;
  options?: AIOptions;
  enabled?: boolean;
}

export const useConversionPrediction = ({
  lead,
  options,
  enabled = true,
}: UseConversionPredictionParams) => {
  return useQuery({
    queryKey: aiQueryKeys.prediction('conversion', lead.id),
    queryFn: async () => {
      // FASE 6.4 — Use chat endpoint for predictions
      return fetchAPI<AIPrediction<AIConversionPrediction>>('chat', {
        messages: [
          { role: 'system', content: 'You are a sales prediction assistant. Analyze conversion probability.' },
          { role: 'user', content: `Predict conversion probability for lead: ${JSON.stringify(lead)}` },
        ],
        options,
      });
    },
    enabled: enabled && !!lead.id,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

// ============================================
// Insights Hook
// ============================================

interface UseInsightsParams {
  context: CRMContext;
  options?: AIOptions & { maxInsights?: number };
  enabled?: boolean;
}

export const useInsights = ({ context, options, enabled = true }: UseInsightsParams) => {
  return useQuery({
    queryKey: aiQueryKeys.insights(context.entityType, context.entityId),
    queryFn: async () => {
      // FASE 6.4 — Use chat endpoint for insights
      return fetchAPI<AIInsight[]>('chat', {
        messages: [
          { role: 'system', content: `You are a CRM insights analyst. Generate actionable insights for ${context.entityType}.` },
          { role: 'user', content: `Analyze ${context.entityType} ${context.entityId} and provide ${options?.maxInsights || 5} key insights.` },
        ],
        options: { maxTokens: options?.maxInsights ? options.maxInsights * 100 : 500 },
      });
    },
    enabled: enabled && !!context.entityId && !!context.tenantId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============================================
// Enrichment Hook
// ============================================

interface UseEnrichmentParams {
  lead: Lead;
  options?: AIOptions;
  enabled?: boolean;
}

export const useEnrichment = ({ lead, options, enabled = true }: UseEnrichmentParams) => {
  return useQuery({
    queryKey: aiQueryKeys.enrichment(lead.id),
    queryFn: async () => {
      // FASE 6.4 — Use chat endpoint for enrichment
      return fetchAPI<AIEnrichment>('chat', {
        messages: [
          { role: 'system', content: 'You are a lead data enrichment assistant. Suggest additional data points for leads.' },
          { role: 'user', content: `Enrich this lead with additional data suggestions: ${JSON.stringify(lead)}` },
        ],
        options,
      });
    },
    enabled: enabled && !!lead.id,
    staleTime: 60 * 60 * 1000, // 1 hour
    gcTime: 24 * 60 * 60 * 1000, // 24 hours
  });
};

// ============================================
// Mutation Hooks (for on-demand operations)
// ============================================

export const useGenerateLeadSummaryMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      leadId,
      options,
    }: {
      text: string;
      leadId: string;
      options?: AIOptions;
    }) => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadSummary>('leads/summary', {
        leadData: { name: text },
        options,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(aiQueryKeys.summary('lead', variables.leadId), data);
    },
  });
};

export const useScoreLeadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead, options }: { lead: Lead; options?: AIOptions }) => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadScore>('leads/score', {
        leadData: {
          name: lead.firstName || lead.lastName || lead.id,
          email: lead.email,
          company: lead.company,
          title: lead.title,
          source: lead.source,
          notes: lead.notes,
        },
        factors: {},
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(aiQueryKeys.score(variables.lead.id), data);
    },
  });
};

export const useClassifyLeadMutation = () => {
  return useMutation({
    mutationFn: async ({ text }: { text: string; options?: AIOptions }) => {
      // FASE 6.4 — Direct API call to real backend
      return fetchAPI<AILeadClassification>('conversations/analyze', {
        messages: [text],
      });
    },
  });
};

export const useEnrichLeadMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ lead, options }: { lead: Lead; options?: AIOptions }) => {
      // FASE 6.4 — Use chat endpoint for enrichment
      return fetchAPI<AIEnrichment>('chat', {
        messages: [
          { role: 'system', content: 'You are a lead data enrichment assistant.' },
          { role: 'user', content: `Enrich this lead: ${JSON.stringify(lead)}` },
        ],
        options,
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(aiQueryKeys.enrichment(variables.lead.id), data);
    },
  });
};

export const useGenerateInsightsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      context,
      options,
    }: {
      context: CRMContext;
      options?: AIOptions & { maxInsights?: number };
    }) => {
      // FASE 6.4 — Use chat endpoint for insights
      return fetchAPI<AIInsight[]>('chat', {
        messages: [
          { role: 'system', content: `Generate insights for ${context.entityType}` },
          { role: 'user', content: `Analyze ${context.entityType} ${context.entityId}` },
        ],
        options: { maxTokens: options?.maxInsights ? options.maxInsights * 100 : 500 },
      });
    },
    onSuccess: (data, variables) => {
      queryClient.setQueryData(
        aiQueryKeys.insights(variables.context.entityType, variables.context.entityId),
        data
      );
    },
  });
};

// ============================================
// Batch Scoring Hook
// ============================================

interface BatchScoreResult {
  results: Array<{ leadId: string; score?: AILeadScore; error?: string }>;
  successful: number;
  failed: number;
  totalTimeMs: number;
}

export const useBatchScoreLeadsMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      leads,
      options,
    }: {
      leads: Lead[];
      options?: AIOptions & { concurrency?: number };
    }) => {
      // FASE 6.4 — Score leads sequentially using individual endpoint
      const results: BatchScoreResult['results'] = [];
      const startTime = Date.now();

      for (const lead of leads) {
        try {
          const score = await fetchAPI<AILeadScore>('leads/score', {
            leadData: {
              name: lead.firstName || lead.lastName || lead.id,
              email: lead.email,
              company: lead.company,
            },
            factors: {},
          });
          results.push({ leadId: lead.id, score });
        } catch (error) {
          results.push({ leadId: lead.id, error: error instanceof Error ? error.message : 'Unknown error' });
        }
      }

      return {
        results,
        successful: results.filter(r => r.score).length,
        failed: results.filter(r => r.error).length,
        totalTimeMs: Date.now() - startTime,
      };
    },
    onSuccess: (data) => {
      // Update individual lead scores in cache
      data.results.forEach((result: BatchScoreResult['results'][0]) => {
        if (result.score) {
          queryClient.setQueryData(aiQueryKeys.score(result.leadId), result.score);
        }
      });
    },
  });
};

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to invalidate all AI-related queries
 */
export const useInvalidateAIQueries = () => {
  const queryClient = useQueryClient();

  return {
    invalidateAll: () => queryClient.invalidateQueries({ queryKey: aiQueryKeys.all }),
    invalidateSummary: (type: string, id: string) =>
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.summary(type, id) }),
    invalidateScore: (leadId: string) =>
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.score(leadId) }),
    invalidateInsights: (entityType: string, entityId: string) =>
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.insights(entityType, entityId) }),
    invalidateEnrichment: (leadId: string) =>
      queryClient.invalidateQueries({ queryKey: aiQueryKeys.enrichment(leadId) }),
  };
};

// ============================================
// Simplified Hooks for UI Components - FASE 6.1
// FASE 6.4 — Updated to use real backend endpoints
// ============================================

/**
 * Simplified hook for AI Score by lead ID
 * FASE 6.4 — Connected to /api/v1/ai/leads/score
 */
export const useAIScore = (leadId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: aiQueryKeys.score(leadId),
    queryFn: async () => {
      // Call real backend endpoint
      return fetchAPI<AILeadScore>('leads/score', {
        leadData: { name: leadId }, // Backend expects leadData object
        factors: {},
      });
    },
    enabled: options?.enabled !== false && !!leadId,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

/**
 * Simplified hook for AI Summary by lead ID
 * FASE 6.4 — Connected to /api/v1/ai/leads/summary
 */
export const useAISummary = (leadId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: aiQueryKeys.summary('lead', leadId),
    queryFn: async () => {
      // Call real backend endpoint
      return fetchAPI<AILeadSummary>('leads/summary', {
        leadData: { name: leadId },
      });
    },
    enabled: options?.enabled !== false && !!leadId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

/**
 * Simplified hook for AI Classification by lead ID
 * FASE 6.4 — Connected to /api/v1/ai/conversations/analyze
 */
export const useAIClassify = (leadId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: [...aiQueryKeys.all, 'classify', 'lead', leadId] as const,
    queryFn: async () => {
      // Call real backend endpoint
      return fetchAPI<AILeadClassification>('conversations/analyze', {
        messages: [`Lead ID: ${leadId}`],
      });
    },
    enabled: options?.enabled !== false && !!leadId,
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

/**
 * Simplified hook for AI Predictions by opportunity ID
 */
export const useAIPrediction = (
  opportunityId: string,
  type: 'stage' | 'conversion' = 'conversion',
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: [...aiQueryKeys.all, 'predict', type, opportunityId] as const,
    queryFn: async () => {
      // Use chat endpoint for predictions
      return fetchAPI<AIPrediction<AIStageChangePrediction | AIConversionPrediction>>('chat', {
        messages: [
          { role: 'system', content: `Analyze ${type} prediction for opportunity ${opportunityId}` },
          { role: 'user', content: `Predict ${type} for this opportunity` },
        ],
      });
    },
    enabled: options?.enabled !== false && !!opportunityId,
    staleTime: 15 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
};

/**
 * Simplified hook for AI Insights by entity
 */
export const useAIInsights = (
  entityType: 'lead' | 'opportunity' | 'customer' | 'dashboard',
  entityId: string,
  options?: { enabled?: boolean; maxInsights?: number }
) => {
  return useQuery({
    queryKey: aiQueryKeys.insights(entityType, entityId),
    queryFn: async () => {
      // Use chat endpoint for insights
      return fetchAPI<AIInsight[]>('chat', {
        messages: [
          { role: 'system', content: `Generate insights for ${entityType}` },
          { role: 'user', content: `Analyze ${entityType} ${entityId} and provide actionable insights` },
        ],
      });
    },
    enabled: options?.enabled !== false && !!entityId,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
};

// ============================================
// FASE 6.4 — New Hooks for Real Backend Endpoints
// ============================================

/**
 * Hook for AI Chat completion
 * Connected to POST /api/v1/ai/chat
 */
export const useAIChat = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      messages,
      options,
    }: {
      messages: ChatMessage[];
      options?: AIOptions;
    }) => {
      return fetchAPI<{ content: string; usage: { promptTokens: number; completionTokens: number; totalTokens: number } }>('chat', {
        messages,
        options,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.all });
    },
  });
};

/**
 * Hook for AI Sentiment Analysis
 * Connected to POST /api/v1/ai/sentiment
 */
export const useAISentiment = () => {
  return useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      return fetchAPI<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number; keywords: string[] }>('sentiment', {
        text,
      });
    },
  });
};

/**
 * Hook to get sentiment analysis (query version)
 */
export const useAISentimentQuery = (text: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: aiQueryKeys.sentiment(text),
    queryFn: async () => {
      return fetchAPI<{ sentiment: 'positive' | 'negative' | 'neutral'; score: number; keywords: string[] }>('sentiment', {
        text,
      });
    },
    enabled: options?.enabled !== false && !!text && text.length > 0,
    staleTime: 30 * 60 * 1000,
  });
};

/**
 * Hook for AI Email Generation
 * Connected to POST /api/v1/ai/emails/generate
 */
export const useAIGenerateEmail = () => {
  return useMutation({
    mutationFn: async ({
      leadContext,
      options,
    }: {
      leadContext: { name: string; company?: string; title?: string; previousInteractions?: string[]; notes?: string };
      options: EmailGenerationOptions;
    }) => {
      return fetchAPI<{ subject: string; body: string; suggestions: string[] }>('emails/generate', {
        leadContext,
        options,
      });
    },
  });
};

/**
 * Hook for AI Smart Response Suggestions
 * Connected to POST /api/v1/ai/responses/suggest
 */
export const useAISmartResponse = () => {
  return useMutation({
    mutationFn: async ({
      context,
    }: {
      context: { message: string; leadName?: string; conversationHistory?: string[]; product?: string };
    }) => {
      return fetchAPI<{ suggestions: string[]; tone: string; sentiment: string }>('responses/suggest', {
        context,
      });
    },
  });
};

/**
 * Hook for AI Conversation Analysis
 * Connected to POST /api/v1/ai/conversations/analyze
 */
export const useAIAnalyzeConversation = () => {
  return useMutation({
    mutationFn: async ({ messages }: { messages: string[] }) => {
      return fetchAPI<{ summary: string; sentiment: string; topics: string[]; actionItems: string[] }>('conversations/analyze', {
        messages,
      });
    },
  });
};

/**
 * Hook for AI Product Recommendations
 * Connected to POST /api/v1/ai/products/recommend
 */
export const useAIProductRecommendations = () => {
  return useMutation({
    mutationFn: async ({
      leadContext,
      products,
    }: {
      leadContext: { industry?: string; companySize?: string; budget?: string; needs?: string[]; previousPurchases?: string[] };
      products: Array<{ id: string; name: string; description: string; category: string; price?: number }>;
    }) => {
      return fetchAPI<{ recommendations: Array<{ productId: string; score: number; reasoning: string }> }>('products/recommend', {
        leadContext,
        products,
      });
    },
  });
};

/**
 * Hook for AI Assistant Conversations
 * Connected to GET/POST /api/v1/ai/assistant/conversations
 */
export const useAIAssistantConversations = (options?: { leadId?: string; limit?: number }) => {
  return useQuery({
    queryKey: aiQueryKeys.conversations(),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options?.leadId) params.set('leadId', options.leadId);
      if (options?.limit) params.set('limit', String(options.limit));

      const queryString = params.toString();
      return fetchAPI<Array<{ id: string; title: string; leadId?: string; createdAt: string; updatedAt: string }>>(
        `assistant/conversations${queryString ? '?' + queryString : ''}`,
        null,
        'GET'
      );
    },
    staleTime: 60 * 1000,
  });
};

/**
 * Hook to create a new AI Assistant conversation
 */
export const useAICreateConversation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, title }: { leadId?: string; title?: string }) => {
      return fetchAPI<{ id: string; title: string; leadId?: string; createdAt: string }>('assistant/conversations', {
        leadId,
        title,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.conversations() });
    },
  });
};

/**
 * Hook to get a specific AI Assistant conversation
 */
export const useAIConversation = (conversationId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: aiQueryKeys.conversation(conversationId),
    queryFn: async () => {
      return fetchAPI<{
        id: string;
        title: string;
        leadId?: string;
        messages: Array<{ role: 'user' | 'assistant'; content: string; timestamp: string }>;
        createdAt: string;
        updatedAt: string;
      }>(`assistant/conversations/${conversationId}`, null, 'GET');
    },
    enabled: options?.enabled !== false && !!conversationId,
    staleTime: 30 * 1000,
  });
};

/**
 * Hook to send a message to AI Assistant
 */
export const useAISendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      conversationId,
      message,
      systemPrompt,
    }: {
      conversationId: string;
      message: string;
      systemPrompt?: string;
    }) => {
      return fetchAPI<{ role: 'assistant'; content: string; timestamp: string }>(`assistant/conversations/${conversationId}/messages`, {
        message,
        systemPrompt,
      });
    },
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.conversation(variables.conversationId) });
    },
  });
};

/**
 * Hook for AI Knowledge Base Search
 * Connected to GET /api/v1/ai/knowledge/search
 */
export const useAIKnowledgeSearch = (query: string, options?: { limit?: number; enabled?: boolean }) => {
  return useQuery({
    queryKey: aiQueryKeys.knowledge(query),
    queryFn: async () => {
      return fetchAPI<Array<{ id: string; title: string; content: string; score: number; category: string }>>(
        `knowledge/search?query=${encodeURIComponent(query)}&limit=${options?.limit || 5}`,
        null,
        'GET'
      );
    },
    enabled: options?.enabled !== false && !!query && query.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * Hook to add a document to Knowledge Base
 */
export const useAIAddDocument = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      title,
      content,
      category,
      tags,
      metadata,
    }: {
      title: string;
      content: string;
      category: string;
      tags?: string[];
      metadata?: Record<string, string>;
    }) => {
      return fetchAPI<{ id: string; title: string; category: string; createdAt: string }>('knowledge/documents', {
        title,
        content,
        category,
        tags: tags || [],
        metadata,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiQueryKeys.knowledge() });
    },
  });
};

/**
 * Hook for AI Usage Statistics
 * Connected to GET /api/v1/ai/usage
 */
export const useAIUsageStats = (dateRange?: { startDate?: string; endDate?: string }) => {
  return useQuery({
    queryKey: aiQueryKeys.usage(dateRange?.startDate, dateRange?.endDate),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (dateRange?.startDate) params.set('startDate', dateRange.startDate);
      if (dateRange?.endDate) params.set('endDate', dateRange.endDate);

      const queryString = params.toString();
      return fetchAPI<{
        totalTokens: number;
        totalRequests: number;
        byEndpoint: Record<string, { requests: number; tokens: number }>;
        byDay: Array<{ date: string; requests: number; tokens: number }>;
      }>(`usage${queryString ? '?' + queryString : ''}`, null, 'GET');
    },
    staleTime: 5 * 60 * 1000,
  });
};
