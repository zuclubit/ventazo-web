// ============================================
// AI Engine Types - FASE 6.0
// Type definitions for AI features
// ============================================

// ============================================
// Core AI Types
// ============================================

/**
 * AI Provider types supported by the engine
 */
export type AIProvider = 'openai' | 'anthropic' | 'groq' | 'azure-openai' | 'local';

/**
 * AI Model configuration
 */
export interface AIModelConfig {
  provider: AIProvider;
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

/**
 * AI Request options
 */
export interface AIRequestOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  signal?: AbortSignal;
}

/**
 * Base AI Response wrapper
 */
export interface AIResponse<T> {
  success: boolean;
  data?: T;
  error?: AIError;
  metadata: AIResponseMetadata;
}

/**
 * AI Response metadata
 */
export interface AIResponseMetadata {
  provider: AIProvider;
  model: string;
  tokensUsed: {
    prompt: number;
    completion: number;
    total: number;
  };
  latencyMs: number;
  cached: boolean;
  timestamp: string;
}

// ============================================
// AI Error Types
// ============================================

/**
 * AI Error codes
 */
export enum AIErrorCode {
  PROVIDER_ERROR = 'PROVIDER_ERROR',
  RATE_LIMIT = 'RATE_LIMIT',
  TIMEOUT = 'TIMEOUT',
  INVALID_INPUT = 'INVALID_INPUT',
  CONTENT_FILTER = 'CONTENT_FILTER',
  MODEL_UNAVAILABLE = 'MODEL_UNAVAILABLE',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
}

/**
 * AI Error object
 */
export interface AIError {
  code: AIErrorCode;
  message: string;
  provider?: AIProvider;
  retryable: boolean;
  details?: Record<string, unknown>;
}

// ============================================
// Lead Summary Types
// ============================================

/**
 * AI-generated lead summary
 */
export interface AILeadSummary {
  id: string;
  leadId: string;
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  nextActions: AIRecommendedAction[];
  topics?: string[];
  confidence: number; // 0-1
  generatedAt: string;
}

/**
 * AI-generated note summary
 */
export interface AINoteSummary {
  id: string;
  noteIds: string[];
  summary: string;
  topics: string[];
  actionItems: string[];
  sentiment: 'positive' | 'neutral' | 'negative' | 'mixed';
  generatedAt: string;
}

/**
 * Recommended action from AI
 */
export interface AIRecommendedAction {
  action: string;
  priority: 'low' | 'medium' | 'high';
  reasoning: string;
  dueWithinDays?: number;
}

// ============================================
// Lead Scoring Types
// ============================================

/**
 * AI Lead Score result
 */
export interface AILeadScore {
  leadId: string;
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: AIScoreFactor[];
  recommendation: 'pursue' | 'nurture' | 'archive' | 'convert';
  confidence: number; // 0-1
  explanations: string[];
  previousScore?: number;
  generatedAt: string;
}

/**
 * Individual scoring factor
 */
export interface AIScoreFactor {
  name: string;
  weight: number;
  value: number;
  impact: 'positive' | 'negative' | 'neutral';
  explanation: string;
}

// ============================================
// Prediction Types
// ============================================

/**
 * Generic AI Prediction wrapper
 */
export interface AIPrediction<T> {
  prediction: T;
  probability: number; // 0-1
  alternatives: Array<{
    value: T;
    probability: number;
  }>;
  confidence: number; // 0-1
  reasoning: string;
  generatedAt: string;
}

/**
 * Stage change prediction
 */
export interface AIStageChangePrediction {
  currentStage: string;
  predictedStage: string;
  probability: number;
  timeframe: 'days' | 'weeks' | 'months';
  estimatedDays: number;
  factors: string[];
}

/**
 * Conversion prediction
 */
export interface AIConversionPrediction {
  willConvert: boolean;
  probability: number;
  timeframeDays: number;
  potentialValue: number;
  riskFactors: string[];
  positiveIndicators: string[];
}

// ============================================
// Insight Types
// ============================================

/**
 * AI-generated insight
 */
export interface AIInsight {
  id: string;
  type: AIInsightType;
  category: AIInsightCategory;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high';
  actionable: boolean;
  suggestedActions: AIRecommendedAction[];
  relatedEntities: AIRelatedEntity[];
  confidence: number;
  validUntil: string;
  generatedAt: string;
}

/**
 * Insight type
 */
export type AIInsightType =
  | 'trend'
  | 'anomaly'
  | 'opportunity'
  | 'risk'
  | 'pattern'
  | 'recommendation'
  | 'alert';

/**
 * Insight category
 */
export type AIInsightCategory =
  | 'leads'
  | 'opportunities'
  | 'customers'
  | 'pipeline'
  | 'performance'
  | 'engagement';

/**
 * Related entity reference
 */
export interface AIRelatedEntity {
  type: 'lead' | 'opportunity' | 'customer' | 'task' | 'user';
  id: string;
  name: string;
  relevance: number; // 0-1
}

// ============================================
// Classification Types
// ============================================

/**
 * AI Classification result
 */
export interface AIClassification {
  id: string;
  input: string;
  labels: AIClassificationLabel[];
  primaryLabel: string;
  confidence: number;
  generatedAt: string;
}

/**
 * Classification label
 */
export interface AIClassificationLabel {
  label: string;
  probability: number;
  description?: string;
}

/**
 * Lead classification result
 */
export interface AILeadClassification extends AIClassification {
  industry: string;
  companySize: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  buyerPersona: string;
  intentLevel: 'low' | 'medium' | 'high';
  interests: string[];
}

// ============================================
// Enrichment Types
// ============================================

/**
 * AI Field Enrichment result
 */
export interface AIEnrichment {
  leadId: string;
  enrichedFields: AIEnrichedField[];
  suggestedFields: AISuggestedField[];
  confidence: number;
  sources: string[];
  generatedAt: string;
}

/**
 * Enriched field
 */
export interface AIEnrichedField {
  fieldName: string;
  originalValue: string | null;
  enrichedValue: string;
  confidence: number;
  source: string;
}

/**
 * Suggested field to add
 */
export interface AISuggestedField {
  fieldName: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
}

// ============================================
// Context Types
// ============================================

/**
 * CRM Context for AI operations
 */
export interface CRMContext {
  tenantId: string;
  userId: string;
  entityType: 'lead' | 'opportunity' | 'customer' | 'task';
  entityId: string;
  relatedData?: {
    notes?: Array<{ id: string; content: string; createdAt: string }>;
    activities?: Array<{ type: string; description: string; createdAt: string }>;
    communications?: Array<{ channel: string; summary: string; createdAt: string }>;
  };
  pipelineContext?: {
    currentStage: string;
    stageHistory: Array<{ stage: string; enteredAt: string }>;
    daysInPipeline: number;
  };
  userContext?: {
    recentActions: string[];
    preferences: Record<string, unknown>;
  };
}

// ============================================
// Prompt Types
// ============================================

/**
 * AI Prompt template
 */
export interface AIPromptTemplate {
  id: string;
  name: string;
  category: string;
  systemPrompt: string;
  userPromptTemplate: string;
  variables: string[];
  outputFormat: 'text' | 'json' | 'markdown';
  expectedSchema?: Record<string, unknown>;
}

/**
 * Prompt execution request
 */
export interface AIPromptRequest {
  templateId?: string;
  systemPrompt?: string;
  userPrompt: string;
  variables?: Record<string, string>;
  options?: AIRequestOptions;
}

// ============================================
// Batch Processing Types
// ============================================

/**
 * Batch AI operation request
 */
export interface AIBatchRequest<T> {
  items: T[];
  operation: string;
  options?: AIRequestOptions;
  concurrency?: number;
}

/**
 * Batch AI operation result
 */
export interface AIBatchResult<T, R> {
  total: number;
  successful: number;
  failed: number;
  results: Array<{
    input: T;
    output?: R;
    error?: AIError;
  }>;
  processingTimeMs: number;
}

// ============================================
// Usage & Metrics Types
// ============================================

/**
 * AI Usage metrics
 */
export interface AIUsageMetrics {
  tenantId: string;
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalTokens: number;
  averageLatencyMs: number;
  byOperation: Record<string, {
    count: number;
    tokens: number;
    averageLatencyMs: number;
  }>;
  byProvider: Record<AIProvider, {
    count: number;
    tokens: number;
  }>;
}

// Types are exported via their declarations above
