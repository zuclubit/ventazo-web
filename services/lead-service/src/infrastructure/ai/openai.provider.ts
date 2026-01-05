/**
 * OpenAI Provider
 * Integration with OpenAI API for AI-powered features
 */

import {
  IAIProvider,
  AIProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingOptions,
  EmbeddingResponse,
} from './types';

interface OpenAIConfig {
  apiKey: string;
  organization?: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

interface OpenAIEmbeddingResponse {
  object: string;
  data: Array<{
    object: string;
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements IAIProvider {
  readonly name: AIProvider = 'openai';
  private apiKey: string | null = null;
  private organization: string | null = null;
  private defaultModel: string;
  private defaultEmbeddingModel: string;
  private baseUrl = 'https://api.openai.com/v1';

  constructor() {
    this.defaultModel = 'gpt-4-turbo-preview';
    this.defaultEmbeddingModel = 'text-embedding-3-small';
  }

  /**
   * Initialize with configuration
   */
  initialize(config: OpenAIConfig): void {
    this.apiKey = config.apiKey;
    this.organization = config.organization || null;
    if (config.defaultModel) {
      this.defaultModel = config.defaultModel;
    }
    if (config.defaultEmbeddingModel) {
      this.defaultEmbeddingModel = config.defaultEmbeddingModel;
    }
  }

  /**
   * Check if provider is configured
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Make API request
   */
  private async request<T>(
    endpoint: string,
    body: Record<string, unknown>
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`,
    };

    if (this.organization) {
      headers['OpenAI-Organization'] = this.organization;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(
        `OpenAI API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Chat completion
   */
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    const openaiMessages: OpenAIMessage[] = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const body: Record<string, unknown> = {
      model: options.model || this.defaultModel,
      messages: openaiMessages,
    };

    if (options.temperature !== undefined) {
      body.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      body.max_tokens = options.maxTokens;
    }
    if (options.topP !== undefined) {
      body.top_p = options.topP;
    }
    if (options.frequencyPenalty !== undefined) {
      body.frequency_penalty = options.frequencyPenalty;
    }
    if (options.presencePenalty !== undefined) {
      body.presence_penalty = options.presencePenalty;
    }
    if (options.stop) {
      body.stop = options.stop;
    }

    const response = await this.request<OpenAIChatResponse>('/chat/completions', body);

    const choice = response.choices[0];

    return {
      content: choice?.message?.content || '',
      finishReason: choice?.finish_reason || 'unknown',
      usage: {
        promptTokens: response.usage.prompt_tokens,
        completionTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
      provider: this.name,
    };
  }

  /**
   * Generate embedding
   */
  async embed(
    text: string,
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResponse> {
    const body = {
      model: options.model || this.defaultEmbeddingModel,
      input: text,
    };

    const response = await this.request<OpenAIEmbeddingResponse>('/embeddings', body);

    return {
      embedding: response.data[0]?.embedding || [],
      model: response.model,
      usage: {
        promptTokens: response.usage.prompt_tokens,
        totalTokens: response.usage.total_tokens,
      },
      provider: this.name,
    };
  }

  /**
   * Batch embedding
   */
  async embedBatch(
    texts: string[],
    options: EmbeddingOptions = {}
  ): Promise<EmbeddingResponse[]> {
    const body = {
      model: options.model || this.defaultEmbeddingModel,
      input: texts,
    };

    const response = await this.request<OpenAIEmbeddingResponse>('/embeddings', body);

    return response.data.map((item) => ({
      embedding: item.embedding,
      model: response.model,
      usage: {
        promptTokens: Math.round(response.usage.prompt_tokens / texts.length),
        totalTokens: Math.round(response.usage.total_tokens / texts.length),
      },
      provider: this.name,
    }));
  }

  /**
   * Estimate tokens in text (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token for English
    return Math.ceil(text.length / 4);
  }

  /**
   * Calculate cost for usage
   */
  calculateCost(
    model: string,
    promptTokens: number,
    completionTokens: number
  ): number {
    // Pricing per 1K tokens (as of 2024)
    const pricing: Record<string, { input: number; output: number }> = {
      'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 },
      'gpt-4': { input: 0.03, output: 0.06 },
      'gpt-4-32k': { input: 0.06, output: 0.12 },
      'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
      'gpt-3.5-turbo-16k': { input: 0.003, output: 0.004 },
      'text-embedding-3-small': { input: 0.00002, output: 0 },
      'text-embedding-3-large': { input: 0.00013, output: 0 },
      'text-embedding-ada-002': { input: 0.0001, output: 0 },
    };

    const modelPricing = pricing[model] || pricing['gpt-3.5-turbo'];
    const inputCost = (promptTokens / 1000) * modelPricing.input;
    const outputCost = (completionTokens / 1000) * modelPricing.output;

    return inputCost + outputCost;
  }
}
