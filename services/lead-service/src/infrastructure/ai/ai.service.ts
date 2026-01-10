/**
 * AI Service (Refactored)
 *
 * Thin wrapper over BotGateway for AI-powered CRM features.
 * This service does NOT contain any:
 * - Direct LLM calls
 * - Prompts or prompt templates
 * - Provider routing logic
 * - Model knowledge
 *
 * All AI logic is delegated to the Bot Management System.
 *
 * @module infrastructure/ai/ai.service
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import {
  BotGateway,
  getBotGateway,
  BotAgentRequest,
  BotAgentResponse,
  BotUserContext,
} from '../bot-gateway';
import { getBotHelperConfig } from '../../config/environment';

// ============================================
// Types (Simplified, AI-agnostic)
// ============================================

export interface AILeadScore {
  score: number;
  factors: Array<{
    name: string;
    impact: 'positive' | 'negative' | 'neutral';
    weight: number;
  }>;
  recommendation: string;
  nextBestAction?: string;
}

export interface AISentiment {
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  score: number;
  confidence: number;
  keywords?: string[];
  summary?: string;
}

export interface AIGeneratedEmail {
  subject: string;
  body: string;
  callToAction?: string;
  suggestedSendTime?: string;
}

export interface AIAgentResult {
  response: string;
  conversationId: string;
  requiresConfirmation: boolean;
  confirmationRequest?: {
    id: string;
    title: string;
    description: string;
    impact: 'low' | 'medium' | 'high' | 'critical';
  };
  suggestions?: string[];
}

// ============================================
// AI Service Implementation
// ============================================

@injectable()
export class AIService {
  private botGateway: BotGateway;
  private initialized = false;

  constructor(private pool: DatabasePool) {
    this.botGateway = getBotGateway();
    this.initializeFromEnv();
  }

  /**
   * Initialize from environment variables
   */
  private initializeFromEnv(): void {
    const config = getBotHelperConfig();
    if (config.isEnabled) {
      this.botGateway.initialize({
        apiUrl: config.apiUrl,
        sharedSecret: config.sharedSecret,
        timeout: config.timeout,
      });
      this.initialized = true;
      console.log('[AIService] Initialized with Bot Management System');
    }
  }

  /**
   * Check if AI services are available
   */
  isAvailable(): boolean {
    return this.initialized && this.botGateway.isReady();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return this.botGateway.healthCheck();
  }

  // ============================================
  // Agent (Conversational AI)
  // ============================================

  /**
   * Process a message through the AI agent
   */
  async processAgentMessage(
    message: string,
    user: BotUserContext,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<Result<AIAgentResult>> {
    if (!this.isAvailable()) {
      return Result.fail('AI services not available');
    }

    try {
      const request: BotAgentRequest = {
        message,
        conversationId,
        user,
        metadata,
      };

      const response = await this.botGateway.processAgentRequest(request);

      // Track usage
      await this.trackUsage(user.tenantId, user.userId, 'agent', response);

      return Result.ok({
        response: response.response,
        conversationId: response.conversationId,
        requiresConfirmation: response.requiresConfirmation,
        confirmationRequest: response.confirmationRequest
          ? {
              id: response.confirmationRequest.id,
              title: response.confirmationRequest.title,
              description: response.confirmationRequest.description,
              impact: response.confirmationRequest.impact,
            }
          : undefined,
        suggestions: response.suggestions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Agent processing failed: ${message}`);
    }
  }

  /**
   * Handle confirmation response
   */
  async handleConfirmation(
    requestId: string,
    decision: 'confirm' | 'cancel' | 'modify',
    user: BotUserContext,
    modifications?: Record<string, unknown>
  ): Promise<Result<AIAgentResult>> {
    if (!this.isAvailable()) {
      return Result.fail('AI services not available');
    }

    try {
      const response = await this.botGateway.handleConfirmation({
        requestId,
        decision,
        modifications,
      });

      await this.trackUsage(user.tenantId, user.userId, 'confirmation', response);

      return Result.ok({
        response: response.response,
        conversationId: response.conversationId,
        requiresConfirmation: response.requiresConfirmation,
        suggestions: response.suggestions,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Confirmation handling failed: ${message}`);
    }
  }

  // ============================================
  // Lead Scoring
  // ============================================

  /**
   * Score a lead using AI
   */
  async scoreLead(
    leadData: Record<string, unknown>,
    tenantId: string,
    userId: string
  ): Promise<Result<AILeadScore>> {
    if (!this.isAvailable()) {
      return Result.fail('AI services not available');
    }

    try {
      const response = await this.botGateway.scoreLead({
        leadData,
        tenantId,
      });

      await this.trackSimpleUsage(tenantId, userId, 'lead_scoring');

      return Result.ok({
        score: response.score,
        factors: response.factors,
        recommendation: response.recommendation,
        nextBestAction: response.nextBestAction,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Lead scoring failed: ${message}`);
    }
  }

  // ============================================
  // Sentiment Analysis
  // ============================================

  /**
   * Analyze sentiment of text
   */
  async analyzeSentiment(
    text: string,
    tenantId: string,
    userId: string
  ): Promise<Result<AISentiment>> {
    if (!this.isAvailable()) {
      return Result.fail('AI services not available');
    }

    try {
      const response = await this.botGateway.analyzeSentiment({
        text,
        tenantId,
      });

      await this.trackSimpleUsage(tenantId, userId, 'sentiment_analysis');

      return Result.ok({
        sentiment: response.sentiment,
        score: response.score,
        confidence: response.confidence,
        keywords: response.keywords,
        summary: response.summary,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Sentiment analysis failed: ${message}`);
    }
  }

  // ============================================
  // Email Generation
  // ============================================

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
    tenantId: string,
    userId: string
  ): Promise<Result<AIGeneratedEmail>> {
    if (!this.isAvailable()) {
      return Result.fail('AI services not available');
    }

    try {
      const response = await this.botGateway.generateEmail({
        type,
        context,
        tenantId,
      });

      await this.trackSimpleUsage(tenantId, userId, 'email_generation');

      return Result.ok({
        subject: response.subject,
        body: response.body,
        callToAction: response.callToAction,
        suggestedSendTime: response.suggestedSendTime,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Email generation failed: ${message}`);
    }
  }

  // ============================================
  // Streaming
  // ============================================

  /**
   * Create a streaming chat request
   * Returns a Response object with SSE stream
   */
  async createStreamingChat(
    message: string,
    user: BotUserContext,
    conversationId?: string,
    metadata?: Record<string, unknown>
  ): Promise<Response> {
    if (!this.isAvailable()) {
      throw new Error('AI services not available');
    }

    return this.botGateway.createStreamRequest({
      message,
      conversationId,
      user,
      metadata,
    });
  }

  // ============================================
  // Usage Tracking (Internal)
  // ============================================

  /**
   * Track AI usage with full metrics
   */
  private async trackUsage(
    tenantId: string,
    userId: string,
    operation: string,
    response: BotAgentResponse
  ): Promise<void> {
    if (!response.usage) return;

    try {
      const query = `
        INSERT INTO ai_usage (
          tenant_id, user_id, provider, operation, model,
          prompt_tokens, completion_tokens, total_tokens,
          success, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `;

      await this.pool.query(query, [
        tenantId,
        userId,
        response.usage.provider,
        operation,
        response.usage.model,
        response.usage.promptTokens,
        response.usage.completionTokens,
        response.usage.totalTokens,
        true,
      ]);
    } catch (error) {
      console.error('[AIService] Failed to track usage:', error);
    }
  }

  /**
   * Track simple usage (no token details)
   */
  private async trackSimpleUsage(
    tenantId: string,
    userId: string,
    operation: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO ai_usage (
          tenant_id, user_id, provider, operation,
          success, created_at
        )
        VALUES ($1, $2, 'bot-helper', $3, $4, NOW())
      `;

      await this.pool.query(query, [tenantId, userId, operation, true]);
    } catch (error) {
      console.error('[AIService] Failed to track usage:', error);
    }
  }
}
