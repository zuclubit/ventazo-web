/**
 * AI Service Types
 * Types for AI-powered features using OpenAI and Google Gemini
 */

/**
 * AI Provider type
 */
export type AIProvider = 'openai' | 'gemini' | 'bot-helper';

/**
 * Chat message role
 */
export type MessageRole = 'system' | 'user' | 'assistant';

/**
 * Chat message
 */
export interface ChatMessage {
  role: MessageRole;
  content: string;
}

/**
 * Chat completion options
 */
export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stop?: string[];
}

/**
 * Chat completion response
 */
export interface ChatCompletionResponse {
  content: string;
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  model: string;
  provider: AIProvider;
}

/**
 * Embedding options
 */
export interface EmbeddingOptions {
  model?: string;
}

/**
 * Embedding response
 */
export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  usage: {
    promptTokens: number;
    totalTokens: number;
  };
  provider: AIProvider;
}

/**
 * Lead scoring factors
 */
export interface LeadScoringFactors {
  email: boolean;
  phone: boolean;
  company: boolean;
  title: boolean;
  website: boolean;
  socialProfiles: boolean;
  recentActivity: boolean;
  emailOpens: number;
  linkClicks: number;
  websiteVisits: number;
  formSubmissions: number;
  meetingsScheduled: number;
  industryMatch: boolean;
  companySize: string;
  budget: string;
  timeline: string;
  decisionMaker: boolean;
}

/**
 * AI Lead Score
 */
export interface AILeadScore {
  score: number;
  confidence: number;
  factors: {
    factor: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }[];
  recommendation: string;
  nextBestAction: string;
}

/**
 * Lead sentiment analysis
 */
export interface LeadSentiment {
  overall: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number; // -1 to 1
  confidence: number;
  aspects: {
    aspect: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  }[];
}

/**
 * Email generation options
 */
export interface EmailGenerationOptions {
  type: 'follow_up' | 'introduction' | 'proposal' | 'thank_you' | 'meeting_request' | 'custom';
  tone: 'formal' | 'friendly' | 'professional' | 'casual';
  length: 'short' | 'medium' | 'long';
  includeCallToAction?: boolean;
  customInstructions?: string;
}

/**
 * Generated email
 */
export interface GeneratedEmail {
  subject: string;
  body: string;
  callToAction?: string;
  suggestedSendTime?: Date;
}

/**
 * Lead summary
 */
export interface LeadSummary {
  overview: string;
  keyInsights: string[];
  strengths: string[];
  concerns: string[];
  recommendedActions: string[];
  engagementHistory: string;
  nextSteps: string;
}

/**
 * Response template
 */
export interface ResponseTemplate {
  id: string;
  name: string;
  category: string;
  content: string;
  variables: string[];
  suggestedUseCase: string;
}

/**
 * Smart response suggestion
 */
export interface SmartResponse {
  response: string;
  confidence: number;
  templateUsed?: string;
  variables?: Record<string, string>;
}

/**
 * Conversation analysis
 */
export interface ConversationAnalysis {
  summary: string;
  keyTopics: string[];
  actionItems: string[];
  sentiment: LeadSentiment;
  nextSteps: string[];
  urgency: 'low' | 'medium' | 'high' | 'critical';
  buyingSignals: string[];
  objections: string[];
}

/**
 * Product recommendation
 */
export interface ProductRecommendation {
  productId: string;
  productName: string;
  relevanceScore: number;
  reason: string;
  suggestedPitch: string;
}

/**
 * AI assistant message
 */
export interface AssistantMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata?: {
    source?: string;
    confidence?: number;
    citations?: string[];
  };
  createdAt: Date;
}

/**
 * AI assistant conversation
 */
export interface AssistantConversation {
  id: string;
  tenantId: string;
  userId: string;
  leadId?: string;
  title?: string;
  messages: AssistantMessage[];
  context?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Knowledge base document
 */
export interface KnowledgeDocument {
  id: string;
  tenantId: string;
  title: string;
  content: string;
  category: string;
  tags: string[];
  embedding?: number[];
  metadata?: Record<string, string>;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Knowledge search result
 */
export interface KnowledgeSearchResult {
  document: KnowledgeDocument;
  relevanceScore: number;
  matchedContent: string;
}

/**
 * AI usage tracking
 */
export interface AIUsageRecord {
  id: string;
  tenantId: string;
  userId: string;
  provider: AIProvider;
  operation: string;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  success: boolean;
  errorMessage?: string;
  createdAt: Date;
}

/**
 * AI provider interface
 */
export interface IAIProvider {
  name: AIProvider;

  // Chat completion
  chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse>;

  // Generate embeddings
  embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse>;

  // Batch embeddings
  embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse[]>;
}
