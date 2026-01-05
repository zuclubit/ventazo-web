// ============================================
// AI Module - FASE 6.0
// Central exports for AI functionality
// ============================================

// Types
export * from './types';

// Provider Layer
export {
  callLLM,
  callEmbedding,
  isProviderAvailable,
  getAvailableProviders,
  getDefaultProvider,
} from './provider';
export type { LLMMessage, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse } from './provider';

// Engine Functions
export {
  generateLeadSummary,
  generateNoteSummary,
  classifyLead,
  scoreLead,
  predictStageChange,
  predictConversion,
  generateInsights,
  enrichLead,
  scoreLeadsBatch,
} from './engine';
export type { Lead, Note, EngineOptions } from './engine';

// React Query Hooks
export {
  // Query Keys
  aiQueryKeys,
  // Query Hooks
  useLeadSummary,
  useNoteSummary,
  useLeadScore,
  useLeadClassification,
  useStagePrediction,
  useConversionPrediction,
  useInsights,
  useEnrichment,
  // Mutation Hooks
  useGenerateLeadSummaryMutation,
  useScoreLeadMutation,
  useClassifyLeadMutation,
  useEnrichLeadMutation,
  useGenerateInsightsMutation,
  useBatchScoreLeadsMutation,
  // Utility Hooks
  useInvalidateAIQueries,
  // Simplified Hooks (FASE 6.1)
  useAIScore,
  useAISummary,
  useAIClassify,
  useAIPrediction,
  useAIInsights,
} from './hooks';

// Context & Data Preparation
export {
  CRMContextBuilder,
  prepareLeadForAI,
  prepareOpportunityForAI,
  prepareCustomerForAI,
  prepareTaskForAI,
  prepareNotesForAI,
  estimateTokens,
  getMaxContextTokens,
  truncateToTokenLimit,
  sanitizeForAI,
  containsSensitiveData,
} from './context';

// Security & Ethics
export {
  // Rate Limiting
  checkRateLimit,
  recordRequest,
  getRateLimitStatus,
  // Content Policy
  validateInput,
  sanitizeOutput,
  // Prompt Injection Protection
  detectPromptInjection,
  sanitizeInput,
  // Audit Logging
  logAIOperation,
  getAuditLog,
  getUsageStats,
} from './security';
export type { RateLimitConfig, ContentPolicy, AuditLogEntry } from './security';
