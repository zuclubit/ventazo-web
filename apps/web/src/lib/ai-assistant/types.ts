// ============================================
// AI Assistant Types - Ventazo CRM
// Integration with zuclubit-bot-helper
// ============================================

/**
 * User context for AI requests
 */
export interface AIUserContext {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  timezone?: string;
  locale?: string;
}

/**
 * Chat message structure
 */
export interface AIChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

/**
 * Tool execution result
 */
export interface AIToolExecution {
  name: string;
  parameters: Record<string, unknown>;
  result?: unknown;
  status: 'pending' | 'success' | 'error';
  errorMessage?: string;
}

/**
 * Confirmation request for high-impact actions
 */
export interface AIConfirmationRequest {
  requestId: string;
  action: string;
  description: string;
  parameters: Record<string, unknown>;
  isHighImpact: boolean;
}

// ============================================
// Agent Request/Response Types
// ============================================

export interface AIAgentRequest {
  message: string;
  conversationId?: string;
  user: AIUserContext;
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface AIAgentResponse {
  response: string;
  conversationId: string;
  toolExecutions?: AIToolExecution[];
  confirmationRequired?: AIConfirmationRequest;
  suggestedActions?: string[];
  metadata?: {
    model: string;
    provider: string;
    tokensUsed?: number;
    processingTimeMs?: number;
  };
}

// ============================================
// Sentiment Analysis Types
// ============================================

export interface AISentimentRequest {
  text: string;
  tenantId: string;
}

export interface AISentimentResponse {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number; // 0 to 1
  keywords: string[];
  emotions?: {
    joy?: number;
    sadness?: number;
    anger?: number;
    fear?: number;
    surprise?: number;
  };
}

// ============================================
// Lead Scoring Types
// ============================================

export interface AILeadScoreRequest {
  leadData: Record<string, unknown>;
  tenantId: string;
}

export interface AILeadScoreFactor {
  factor: string;
  impact: 'positive' | 'negative' | 'neutral';
  weight: number;
  explanation: string;
}

export interface AILeadScoreResponse {
  score: number; // 0 to 100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: AILeadScoreFactor[];
  recommendations: string[];
  predictedConversion: number; // 0 to 1
  qualityTier: 'hot' | 'warm' | 'cold';
}

// ============================================
// Email Generation Types
// ============================================

export type AIEmailType = 'followup' | 'intro' | 'proposal' | 'thankyou' | 'reminder';

export interface AIEmailContext {
  recipientName: string;
  recipientCompany?: string;
  senderName: string;
  subject?: string;
  previousInteractions?: string[];
  customInstructions?: string;
}

export interface AIEmailRequest {
  type: AIEmailType;
  context: AIEmailContext;
  tenantId: string;
}

export interface AIEmailResponse {
  subject: string;
  body: string;
  tone: string;
  suggestedFollowUp?: string;
}

// ============================================
// Chat Types
// ============================================

export interface AIChatRequest {
  messages: AIChatMessage[];
  tenantId: string;
  preferredProvider?: string;
  preferredModel?: string;
}

export interface AIChatResponse {
  message: string;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

// ============================================
// Confirmation Types
// ============================================

export interface AIConfirmationResponse {
  requestId: string;
  decision: 'confirm' | 'cancel' | 'modify';
  modifications?: Record<string, unknown>;
}

// ============================================
// Assistant Settings Types
// ============================================

export interface AIAssistantSettings {
  enabled: boolean;
  preferredProvider: 'openai' | 'anthropic' | 'groq' | 'google' | 'mistral' | 'auto';
  preferredModel?: string;
  language: 'es' | 'en';
  autoSuggestions: boolean;
  emailAssistance: boolean;
  leadScoring: boolean;
  sentimentAnalysis: boolean;
}

export const DEFAULT_AI_SETTINGS: AIAssistantSettings = {
  enabled: true,
  preferredProvider: 'auto',
  language: 'es',
  autoSuggestions: true,
  emailAssistance: true,
  leadScoring: true,
  sentimentAnalysis: true,
};

// ============================================
// Health Check Types
// ============================================

export interface AIHealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  service: string;
  timestamp: string;
  providers?: {
    name: string;
    available: boolean;
  }[];
}
