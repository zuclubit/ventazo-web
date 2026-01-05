/**
 * Google Gemini Provider
 * Integration with Google Gemini API for AI-powered features
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

interface GeminiConfig {
  apiKey: string;
  defaultModel?: string;
  defaultEmbeddingModel?: string;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

interface GeminiChatResponse {
  candidates: Array<{
    content: {
      role: string;
      parts: Array<{ text: string }>;
    };
    finishReason: string;
    index: number;
  }>;
  usageMetadata: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion: string;
}

interface GeminiEmbeddingResponse {
  embedding: {
    values: number[];
  };
}

interface GeminiBatchEmbeddingResponse {
  embeddings: Array<{
    values: number[];
  }>;
}

export class GeminiProvider implements IAIProvider {
  readonly name: AIProvider = 'gemini';
  private apiKey: string | null = null;
  private defaultModel: string;
  private defaultEmbeddingModel: string;
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor() {
    this.defaultModel = 'gemini-1.5-pro';
    this.defaultEmbeddingModel = 'text-embedding-004';
  }

  /**
   * Initialize with configuration
   */
  initialize(config: GeminiConfig): void {
    this.apiKey = config.apiKey;
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
    body: Record<string, unknown>,
    method: string = 'POST'
  ): Promise<T> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured');
    }

    const url = `${this.baseUrl}${endpoint}?key=${this.apiKey}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({})) as { error?: { message?: string } };
      throw new Error(
        `Gemini API error: ${response.status} - ${errorData.error?.message || response.statusText}`
      );
    }

    return response.json() as Promise<T>;
  }

  /**
   * Convert messages to Gemini format
   */
  private convertMessages(messages: ChatMessage[]): {
    contents: GeminiContent[];
    systemInstruction?: { parts: Array<{ text: string }> };
  } {
    const systemMessages = messages.filter((m) => m.role === 'system');
    const conversationMessages = messages.filter((m) => m.role !== 'system');

    const contents: GeminiContent[] = conversationMessages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const result: {
      contents: GeminiContent[];
      systemInstruction?: { parts: Array<{ text: string }> };
    } = { contents };

    if (systemMessages.length > 0) {
      result.systemInstruction = {
        parts: [{ text: systemMessages.map((m) => m.content).join('\n\n') }],
      };
    }

    return result;
  }

  /**
   * Chat completion
   */
  async chat(
    messages: ChatMessage[],
    options: ChatCompletionOptions = {}
  ): Promise<ChatCompletionResponse> {
    const model = options.model || this.defaultModel;
    const { contents, systemInstruction } = this.convertMessages(messages);

    const body: Record<string, unknown> = {
      contents,
      generationConfig: {},
    };

    if (systemInstruction) {
      body.systemInstruction = systemInstruction;
    }

    const generationConfig: Record<string, unknown> = {};

    if (options.temperature !== undefined) {
      generationConfig.temperature = options.temperature;
    }
    if (options.maxTokens !== undefined) {
      generationConfig.maxOutputTokens = options.maxTokens;
    }
    if (options.topP !== undefined) {
      generationConfig.topP = options.topP;
    }
    if (options.stop) {
      generationConfig.stopSequences = options.stop;
    }

    if (Object.keys(generationConfig).length > 0) {
      body.generationConfig = generationConfig;
    }

    const response = await this.request<GeminiChatResponse>(
      `/models/${model}:generateContent`,
      body
    );

    const candidate = response.candidates[0];
    const content = candidate?.content?.parts?.map((p) => p.text).join('') || '';

    return {
      content,
      finishReason: candidate?.finishReason || 'unknown',
      usage: {
        promptTokens: response.usageMetadata?.promptTokenCount || 0,
        completionTokens: response.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: response.usageMetadata?.totalTokenCount || 0,
      },
      model: response.modelVersion || model,
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
    const model = options.model || this.defaultEmbeddingModel;

    const body = {
      model: `models/${model}`,
      content: {
        parts: [{ text }],
      },
    };

    const response = await this.request<GeminiEmbeddingResponse>(
      `/models/${model}:embedContent`,
      body
    );

    // Estimate tokens (Gemini doesn't return token count for embeddings)
    const estimatedTokens = Math.ceil(text.length / 4);

    return {
      embedding: response.embedding?.values || [],
      model,
      usage: {
        promptTokens: estimatedTokens,
        totalTokens: estimatedTokens,
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
    const model = options.model || this.defaultEmbeddingModel;

    const body = {
      model: `models/${model}`,
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: {
          parts: [{ text }],
        },
      })),
    };

    const response = await this.request<GeminiBatchEmbeddingResponse>(
      `/models/${model}:batchEmbedContents`,
      body
    );

    return response.embeddings.map((embedding, index) => {
      const estimatedTokens = Math.ceil(texts[index].length / 4);
      return {
        embedding: embedding.values || [],
        model,
        usage: {
          promptTokens: estimatedTokens,
          totalTokens: estimatedTokens,
        },
        provider: this.name,
      };
    });
  }

  /**
   * Estimate tokens in text (approximate)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
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
    // Pricing per 1M characters (converted to approximate tokens)
    // Gemini pricing is per character, not token
    const pricing: Record<string, { input: number; output: number }> = {
      'gemini-1.5-pro': { input: 0.00125, output: 0.005 }, // $1.25/$5 per 1M chars
      'gemini-1.5-flash': { input: 0.000075, output: 0.0003 }, // $0.075/$0.30 per 1M chars
      'gemini-1.0-pro': { input: 0.0005, output: 0.0015 },
      'text-embedding-004': { input: 0.00001, output: 0 },
    };

    const modelPricing = pricing[model] || pricing['gemini-1.5-flash'];

    // Convert tokens to approximate characters (4 chars per token)
    const inputChars = promptTokens * 4;
    const outputChars = completionTokens * 4;

    const inputCost = (inputChars / 1_000_000) * (modelPricing.input * 1_000_000);
    const outputCost = (outputChars / 1_000_000) * (modelPricing.output * 1_000_000);

    return inputCost + outputCost;
  }

  /**
   * Count tokens using Gemini API
   */
  async countTokens(text: string, model?: string): Promise<number> {
    const modelName = model || this.defaultModel;

    const body = {
      contents: [
        {
          parts: [{ text }],
        },
      ],
    };

    interface TokenCountResponse {
      totalTokens: number;
    }

    const response = await this.request<TokenCountResponse>(
      `/models/${modelName}:countTokens`,
      body
    );

    return response.totalTokens;
  }
}
