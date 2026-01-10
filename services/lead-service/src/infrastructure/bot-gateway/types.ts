/**
 * Bot Gateway Types
 *
 * Clean contracts for communication with the Bot Management System.
 * The CRM is AI-agnostic - all AI logic lives in the Bot Management System.
 *
 * @module infrastructure/bot-gateway/types
 */

// ============================================
// Core Request/Response Contracts
// ============================================

/**
 * User context for bot requests
 */
export interface BotUserContext {
  userId: string;
  email: string;
  displayName: string;
  role: string;
  permissions: string[];
  tenantId: string;
  timezone?: string;
  locale?: string;
}

/**
 * Request to the Bot Management System for agent processing
 */
export interface BotAgentRequest {
  /** User message */
  message: string;
  /** Conversation ID for context continuity */
  conversationId?: string;
  /** User context */
  user: BotUserContext;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** Source of the request (chat, voice, api) */
  source?: string;
}

/**
 * Planned action from the bot
 */
export interface BotPlannedAction {
  sequence: number;
  toolName: string;
  parameters: Record<string, unknown>;
  rationale: string;
  requiresConfirmation: boolean;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Executed action result
 */
export interface BotExecutedAction {
  sequence: number;
  toolName: string;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

/**
 * Confirmation request from the bot
 */
export interface BotConfirmationRequest {
  id: string;
  title: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  expiresAt: string;
  action: BotPlannedAction;
}

/**
 * Response from the Bot Management System
 */
export interface BotAgentResponse {
  /** AI-generated response text */
  response: string;
  /** Conversation ID for context continuity */
  conversationId: string;
  /** Actions that were planned */
  plannedActions?: BotPlannedAction[];
  /** Actions that were executed */
  executedActions?: BotExecutedAction[];
  /** Whether user confirmation is required */
  requiresConfirmation: boolean;
  /** Confirmation request details if required */
  confirmationRequest?: BotConfirmationRequest;
  /** Usage metrics (for analytics only, CRM doesn't process this) */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    provider: string;
    model: string;
  };
  /** Follow-up suggestions */
  suggestions?: string[];
}

// ============================================
// Streaming Contracts
// ============================================

/**
 * Request for streaming chat
 */
export interface BotStreamRequest {
  message: string;
  conversationId?: string;
  user: BotUserContext;
  metadata?: Record<string, unknown>;
}

/**
 * SSE event types from Bot Management System
 */
export type BotStreamEventType =
  | 'token'
  | 'metadata'
  | 'tool_start'
  | 'tool_args'
  | 'tool_end'
  | 'confirmation'
  | 'usage'
  | 'done'
  | 'error'
  | 'ping';

/**
 * Base stream event
 */
export interface BotStreamEvent<T = unknown> {
  type: BotStreamEventType;
  data: T;
}

/**
 * Token event data
 */
export interface BotTokenEvent {
  /** Token content */
  t: string;
  /** Token index */
  i: number;
}

/**
 * Metadata event data
 */
export interface BotMetadataEvent {
  conversationId?: string;
  requestId: string;
}

/**
 * Tool start event data
 */
export interface BotToolStartEvent {
  id: string;
  name: string;
  index: number;
}

/**
 * Tool end event data
 */
export interface BotToolEndEvent {
  id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * Done event data
 */
export interface BotDoneEvent {
  conversationId: string;
  finishReason: string;
}

/**
 * Error event data
 */
export interface BotErrorEvent {
  code: string;
  message: string;
  retryable: boolean;
  requestId: string;
}

// ============================================
// Specialized Feature Contracts
// ============================================

/**
 * Lead scoring request
 */
export interface BotLeadScoreRequest {
  leadData: Record<string, unknown>;
  tenantId: string;
}

/**
 * Lead scoring response
 */
export interface BotLeadScoreResponse {
  score: number;
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  recommendation: string;
  nextBestAction?: string;
}

/**
 * Sentiment analysis request
 */
export interface BotSentimentRequest {
  text: string;
  tenantId: string;
}

/**
 * Sentiment analysis response
 */
export interface BotSentimentResponse {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  confidence: number;
  keywords?: string[];
  summary?: string;
}

/**
 * Email generation request
 */
export interface BotEmailRequest {
  type: 'followup' | 'intro' | 'proposal' | 'thankyou' | 'reminder';
  context: {
    recipientName: string;
    recipientCompany?: string;
    senderName: string;
    subject?: string;
    previousInteractions?: string[];
    customInstructions?: string;
  };
  tenantId: string;
}

/**
 * Email generation response
 */
export interface BotEmailResponse {
  subject: string;
  body: string;
  callToAction?: string;
  suggestedSendTime?: string;
}

/**
 * Confirmation decision request
 */
export interface BotConfirmationDecision {
  requestId: string;
  decision: 'confirm' | 'cancel' | 'modify';
  modifications?: Record<string, unknown>;
}

// ============================================
// Gateway Configuration
// ============================================

/**
 * Bot Gateway configuration
 */
export interface BotGatewayConfig {
  /** Bot Management System API URL */
  apiUrl: string;
  /** Shared secret for HMAC authentication */
  sharedSecret: string;
  /** Request timeout in ms */
  timeout?: number;
}

// ============================================
// Gateway Interface
// ============================================

/**
 * Bot Gateway Interface
 *
 * This is the ONLY interface the CRM uses to interact with AI.
 * All AI logic, prompts, and provider routing is handled by the Bot Management System.
 */
export interface IBotGateway {
  /**
   * Initialize the gateway with configuration
   */
  initialize(config: BotGatewayConfig): void;

  /**
   * Check if gateway is ready
   */
  isReady(): boolean;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;

  /**
   * Process an agent request (non-streaming)
   */
  processAgentRequest(
    request: BotAgentRequest,
    toolCallbackUrl?: string
  ): Promise<BotAgentResponse>;

  /**
   * Handle confirmation decision
   */
  handleConfirmation(decision: BotConfirmationDecision): Promise<BotAgentResponse>;

  /**
   * Score a lead
   */
  scoreLead(request: BotLeadScoreRequest): Promise<BotLeadScoreResponse>;

  /**
   * Analyze sentiment
   */
  analyzeSentiment(request: BotSentimentRequest): Promise<BotSentimentResponse>;

  /**
   * Generate email
   */
  generateEmail(request: BotEmailRequest): Promise<BotEmailResponse>;

  /**
   * Create streaming request (returns Response with SSE stream)
   */
  createStreamRequest(request: BotStreamRequest): Promise<Response>;
}
