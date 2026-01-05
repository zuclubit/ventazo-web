/**
 * Bot Helper Provider
 *
 * Native integration with zuclubit-bot-helper for AI services.
 * Uses HMAC-based service-to-service authentication for secure communication.
 *
 * This provider replaces/augments OpenAI/Gemini with the multi-provider
 * intelligence from bot-helper, enabling:
 * - Intelligent provider routing (cost, speed, capability)
 * - Multi-provider fallback
 * - Budget management
 * - Telemetry and analytics
 * - CRM-specific tool execution
 */

import * as crypto from 'crypto';
import {
  IAIProvider,
  AIProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingResponse,
  EmbeddingOptions,
} from './types';

/**
 * Configuration for bot-helper connection
 */
export interface BotHelperConfig {
  /** Bot-helper API URL */
  apiUrl: string;
  /** Shared secret for HMAC authentication */
  sharedSecret: string;
  /** Request timeout in ms */
  timeout?: number;
  /** Default preferred provider (optional - let bot-helper decide) */
  preferredProvider?: 'openai' | 'anthropic' | 'groq' | 'google' | 'mistral';
  /** Default preferred model (optional) */
  preferredModel?: string;
}

/**
 * CRM-specific request types for bot-helper integration
 */
export interface CRMAgentRequest {
  message: string;
  conversationId?: string;
  user: {
    userId: string;
    email: string;
    displayName: string;
    role: string;
    permissions: string[];
    timezone?: string;
    locale?: string;
  };
  tenantId: string;
  metadata?: Record<string, unknown>;
}

export interface CRMAgentResponse {
  response: string;
  conversationId: string;
  plannedActions?: Array<{
    sequence: number;
    toolName: string;
    parameters: Record<string, unknown>;
    rationale: string;
    requiresConfirmation: boolean;
    impact: 'low' | 'medium' | 'high' | 'critical';
  }>;
  executedActions?: Array<{
    sequence: number;
    toolName: string;
    success: boolean;
    result?: unknown;
    error?: string;
    executionTimeMs: number;
  }>;
  requiresConfirmation: boolean;
  confirmationRequest?: {
    id: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
    expiresAt: Date;
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    provider: string;
    model: string;
  };
}

export interface LeadScoreResponse {
  score: number;
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  recommendation: string;
}

export interface EmailGenerationResponse {
  subject: string;
  body: string;
}

export interface SentimentAnalysisResponse {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  keywords: string[];
  summary: string;
}

/**
 * Bot Helper Provider Implementation
 */
export class BotHelperProvider implements IAIProvider {
  name: AIProvider = 'openai'; // Report as openai for compatibility with existing code
  private config: BotHelperConfig;
  private initialized = false;

  constructor() {
    this.config = {
      apiUrl: '',
      sharedSecret: '',
      timeout: 30000,
    };
  }

  /**
   * Initialize the provider with configuration
   */
  initialize(config: BotHelperConfig): void {
    this.config = {
      ...config,
      timeout: config.timeout || 30000,
    };
    this.initialized = true;
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized && !!this.config.apiUrl && !!this.config.sharedSecret;
  }

  /**
   * Generate HMAC signature for authentication
   */
  private generateSignature(body: unknown): { signature: string; timestamp: string } {
    const timestamp = Date.now().toString();
    const payload = `${timestamp}.${JSON.stringify(body)}`;
    const signature = crypto
      .createHmac('sha256', this.config.sharedSecret)
      .update(payload)
      .digest('hex');
    return { signature, timestamp };
  }

  /**
   * Make authenticated request to bot-helper
   */
  private async request<T>(
    endpoint: string,
    body: unknown,
    options?: { callbackUrl?: string }
  ): Promise<T> {
    if (!this.isInitialized()) {
      throw new Error('BotHelperProvider not initialized. Call initialize() first.');
    }

    const { signature, timestamp } = this.generateSignature(body);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'x-crm-signature': signature,
      'x-crm-timestamp': timestamp,
    };

    if (options?.callbackUrl) {
      headers['x-crm-callback-url'] = options.callbackUrl;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(`${this.config.apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Bot-helper request failed: ${error.message || response.statusText}`);
      }

      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Bot-helper request timed out after ${this.config.timeout}ms`);
      }
      throw error;
    }
  }

  // ==================== IAIProvider Implementation ====================

  /**
   * Chat completion using bot-helper's multi-provider infrastructure
   */
  async chat(
    messages: ChatMessage[],
    options?: ChatCompletionOptions
  ): Promise<ChatCompletionResponse> {
    const response = await this.request<{
      content: string;
      provider: string;
      model: string;
      totalTokens: number;
    }>('/v1/crm/chat', {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
      })),
      tenantId: 'default', // Will be overridden by the service
      preferredProvider: this.config.preferredProvider,
      preferredModel: options?.model || this.config.preferredModel,
    });

    return {
      content: response.content,
      finishReason: 'stop',
      usage: {
        promptTokens: Math.floor(response.totalTokens * 0.7),
        completionTokens: Math.floor(response.totalTokens * 0.3),
        totalTokens: response.totalTokens,
      },
      model: response.model,
      provider: response.provider as AIProvider,
    };
  }

  /**
   * Generate embeddings
   * Note: Falls back to direct OpenAI for embeddings as bot-helper
   * currently routes these through its own embedding service
   */
  async embed(
    text: string,
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse> {
    // For embeddings, we can use bot-helper's embedding endpoint
    // or fall back to direct provider call
    // TODO: Add embedding endpoint to bot-helper CRM integration
    throw new Error('Embeddings not yet implemented in bot-helper integration. Use direct provider.');
  }

  /**
   * Batch embeddings
   */
  async embedBatch(
    texts: string[],
    options?: EmbeddingOptions
  ): Promise<EmbeddingResponse[]> {
    // TODO: Add batch embedding endpoint to bot-helper CRM integration
    throw new Error('Batch embeddings not yet implemented in bot-helper integration. Use direct provider.');
  }

  // ==================== CRM-Specific Methods ====================

  /**
   * Process CRM agent request with tool execution
   */
  async processAgentRequest(
    request: CRMAgentRequest,
    toolCallbackUrl?: string
  ): Promise<CRMAgentResponse> {
    return this.request<CRMAgentResponse>(
      '/v1/crm/agent',
      request,
      { callbackUrl: toolCallbackUrl }
    );
  }

  /**
   * Handle confirmation response
   */
  async handleConfirmation(
    requestId: string,
    decision: 'confirm' | 'cancel' | 'modify',
    modifications?: Record<string, unknown>
  ): Promise<CRMAgentResponse> {
    return this.request<CRMAgentResponse>('/v1/crm/agent/confirm', {
      requestId,
      decision,
      modifications,
    });
  }

  /**
   * AI-powered lead scoring
   */
  async scoreLead(
    leadData: Record<string, unknown>,
    tenantId: string
  ): Promise<LeadScoreResponse> {
    return this.request<LeadScoreResponse>('/v1/crm/lead/score', {
      leadData,
      tenantId,
    });
  }

  /**
   * Generate email content
   */
  async generateEmail(
    type: 'followup' | 'intro' | 'proposal' | 'thankyou' | 'reminder',
    context: {
      recipientName: string;
      recipientCompany?: string;
      senderName: string;
      subject?: string;
      previousInteractions?: string[];
      customInstructions?: string;
    },
    tenantId: string
  ): Promise<EmailGenerationResponse> {
    return this.request<EmailGenerationResponse>('/v1/crm/email/generate', {
      type,
      context,
      tenantId,
    });
  }

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    text: string,
    tenantId: string
  ): Promise<SentimentAnalysisResponse> {
    return this.request<SentimentAnalysisResponse>('/v1/crm/sentiment/analyze', {
      text,
      tenantId,
    });
  }

  /**
   * Calculate cost (returns 0 as bot-helper handles cost tracking)
   */
  calculateCost(model: string, promptTokens: number, completionTokens: number): number {
    // Bot-helper handles cost tracking internally
    return 0;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.apiUrl}/v1/crm/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

/**
 * Singleton instance for convenience
 */
let botHelperInstance: BotHelperProvider | null = null;

export function getBotHelperProvider(): BotHelperProvider {
  if (!botHelperInstance) {
    botHelperInstance = new BotHelperProvider();
  }
  return botHelperInstance;
}

export function initializeBotHelper(config: BotHelperConfig): BotHelperProvider {
  const provider = getBotHelperProvider();
  provider.initialize(config);
  return provider;
}
