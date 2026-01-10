/**
 * Bot Gateway Implementation
 *
 * Clean gateway to the Bot Management System.
 * Uses HMAC-based service-to-service authentication.
 *
 * This is the ONLY component in the CRM that talks to AI services.
 * The CRM is completely AI-agnostic.
 *
 * @module infrastructure/bot-gateway/bot-gateway
 */

import * as crypto from 'crypto';
import { injectable } from 'tsyringe';
import type {
  IBotGateway,
  BotGatewayConfig,
  BotAgentRequest,
  BotAgentResponse,
  BotConfirmationDecision,
  BotLeadScoreRequest,
  BotLeadScoreResponse,
  BotSentimentRequest,
  BotSentimentResponse,
  BotEmailRequest,
  BotEmailResponse,
  BotStreamRequest,
} from './types';

// ============================================
// Constants
// ============================================

const DEFAULT_TIMEOUT = 30000;

// ============================================
// Bot Gateway Implementation
// ============================================

@injectable()
export class BotGateway implements IBotGateway {
  private config: BotGatewayConfig | null = null;

  /**
   * Initialize the gateway with configuration
   */
  initialize(config: BotGatewayConfig): void {
    this.config = {
      ...config,
      timeout: config.timeout || DEFAULT_TIMEOUT,
    };
  }

  /**
   * Check if gateway is ready
   */
  isReady(): boolean {
    return !!(this.config?.apiUrl && this.config?.sharedSecret);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    if (!this.isReady()) return false;

    try {
      const response = await fetch(`${this.config!.apiUrl}/v1/crm/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Process an agent request (non-streaming)
   */
  async processAgentRequest(
    request: BotAgentRequest,
    toolCallbackUrl?: string
  ): Promise<BotAgentResponse> {
    return this.request<BotAgentResponse>(
      '/v1/crm/agent',
      request,
      { callbackUrl: toolCallbackUrl }
    );
  }

  /**
   * Handle confirmation decision
   */
  async handleConfirmation(decision: BotConfirmationDecision): Promise<BotAgentResponse> {
    return this.request<BotAgentResponse>('/v1/crm/agent/confirm', decision);
  }

  /**
   * Score a lead
   */
  async scoreLead(request: BotLeadScoreRequest): Promise<BotLeadScoreResponse> {
    return this.request<BotLeadScoreResponse>('/v1/crm/lead/score', request);
  }

  /**
   * Analyze sentiment
   */
  async analyzeSentiment(request: BotSentimentRequest): Promise<BotSentimentResponse> {
    return this.request<BotSentimentResponse>('/v1/crm/sentiment/analyze', request);
  }

  /**
   * Generate email
   */
  async generateEmail(request: BotEmailRequest): Promise<BotEmailResponse> {
    return this.request<BotEmailResponse>('/v1/crm/email/generate', request);
  }

  /**
   * Create streaming request (returns Response with SSE stream)
   */
  async createStreamRequest(request: BotStreamRequest): Promise<Response> {
    this.ensureReady();

    const { signature, timestamp } = this.generateSignature(request);

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'text/event-stream',
      'x-crm-signature': signature,
      'x-crm-timestamp': timestamp,
    };

    const response = await fetch(`${this.config!.apiUrl}/v1/crm/stream/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`Bot stream request failed: ${(error as { message?: string }).message || response.statusText}`);
    }

    return response;
  }

  // ============================================
  // Private Methods
  // ============================================

  /**
   * Ensure gateway is ready
   */
  private ensureReady(): void {
    if (!this.isReady()) {
      throw new Error('BotGateway not initialized. Call initialize() first.');
    }
  }

  /**
   * Generate HMAC signature for authentication
   */
  private generateSignature(body: unknown): { signature: string; timestamp: string } {
    const timestamp = Date.now().toString();
    const payload = `${timestamp}.${JSON.stringify(body)}`;
    const signature = crypto
      .createHmac('sha256', this.config!.sharedSecret)
      .update(payload)
      .digest('hex');
    return { signature, timestamp };
  }

  /**
   * Make authenticated request to Bot Management System
   */
  private async request<T>(
    endpoint: string,
    body: unknown,
    options?: { callbackUrl?: string }
  ): Promise<T> {
    this.ensureReady();

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
    const timeoutId = setTimeout(() => controller.abort(), this.config!.timeout);

    try {
      const response = await fetch(`${this.config!.apiUrl}${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`Bot request failed: ${(error as { message?: string }).message || response.statusText}`);
      }

      return response.json() as Promise<T>;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error(`Bot request timed out after ${this.config!.timeout}ms`);
      }
      throw error;
    }
  }
}

// ============================================
// Singleton Factory
// ============================================

let gatewayInstance: BotGateway | null = null;

/**
 * Get the BotGateway singleton instance
 */
export function getBotGateway(): BotGateway {
  if (!gatewayInstance) {
    gatewayInstance = new BotGateway();
  }
  return gatewayInstance;
}

/**
 * Initialize the BotGateway singleton
 */
export function initializeBotGateway(config: BotGatewayConfig): BotGateway {
  const gateway = getBotGateway();
  gateway.initialize(config);
  return gateway;
}
