// ============================================
// AI Provider Layer - FASE 6.0
// Abstraction for multiple AI providers
// ============================================

import {
  AIErrorCode,
  type AIError,
  type AIProvider,
  type AIRequestOptions,
  type AIResponse,
  type AIResponseMetadata,
} from './types';

// ============================================
// Environment Configuration
// ============================================

interface AIProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  organizationId?: string;
  defaultModel: string;
  maxRetries: number;
  timeout: number;
}

const getProviderConfig = (provider: AIProvider): AIProviderConfig => {
  switch (provider) {
    case 'openai':
      return {
        apiKey: process.env['OPENAI_API_KEY'],
        baseUrl: process.env['OPENAI_BASE_URL'] || 'https://api.openai.com/v1',
        organizationId: process.env['OPENAI_ORG_ID'],
        defaultModel: 'gpt-4-turbo-preview',
        maxRetries: 3,
        timeout: 30000,
      };
    case 'anthropic':
      return {
        apiKey: process.env['ANTHROPIC_API_KEY'],
        baseUrl: process.env['ANTHROPIC_BASE_URL'] || 'https://api.anthropic.com/v1',
        defaultModel: 'claude-3-sonnet-20240229',
        maxRetries: 3,
        timeout: 60000,
      };
    case 'groq':
      return {
        apiKey: process.env['GROQ_API_KEY'],
        baseUrl: 'https://api.groq.com/openai/v1',
        defaultModel: 'mixtral-8x7b-32768',
        maxRetries: 3,
        timeout: 15000,
      };
    case 'azure-openai':
      return {
        apiKey: process.env['AZURE_OPENAI_API_KEY'],
        baseUrl: process.env['AZURE_OPENAI_ENDPOINT'],
        defaultModel: process.env['AZURE_OPENAI_DEPLOYMENT'] || 'gpt-4',
        maxRetries: 3,
        timeout: 30000,
      };
    case 'local':
      return {
        baseUrl: process.env['LOCAL_LLM_URL'] || 'http://localhost:11434/api',
        defaultModel: 'llama2',
        maxRetries: 2,
        timeout: 60000,
      };
    default:
      throw new Error(`Unknown AI provider: ${String(provider)}`);
  }
};

// ============================================
// Request/Response Types
// ============================================

interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMRequest {
  messages: LLMMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  responseFormat?: { type: 'text' | 'json_object' };
}

interface LLMResponse {
  content: string;
  finishReason: 'stop' | 'length' | 'content_filter' | 'error';
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

interface EmbeddingRequest {
  input: string | string[];
  model?: string;
}

interface EmbeddingResponse {
  embeddings: number[][];
  usage: {
    totalTokens: number;
  };
}

// ============================================
// Error Handling
// ============================================

const createAIError = (
  code: AIErrorCode,
  message: string,
  provider?: AIProvider,
  retryable = false,
  details?: Record<string, unknown>
): AIError => ({
  code,
  message,
  provider,
  retryable,
  details,
});

const handleProviderError = (error: unknown, provider: AIProvider): AIError => {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return createAIError(
        AIErrorCode.RATE_LIMIT,
        'Rate limit exceeded. Please try again later.',
        provider,
        true
      );
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return createAIError(
        AIErrorCode.TIMEOUT,
        'Request timed out. Please try again.',
        provider,
        true
      );
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return createAIError(
        AIErrorCode.AUTHENTICATION_ERROR,
        'Authentication failed. Check API key configuration.',
        provider,
        false
      );
    }

    if (message.includes('content_filter') || message.includes('flagged')) {
      return createAIError(
        AIErrorCode.CONTENT_FILTER,
        'Content was flagged by safety filters.',
        provider,
        false
      );
    }

    if (message.includes('quota') || message.includes('insufficient')) {
      return createAIError(
        AIErrorCode.QUOTA_EXCEEDED,
        'API quota exceeded.',
        provider,
        false
      );
    }

    return createAIError(
      AIErrorCode.PROVIDER_ERROR,
      error.message,
      provider,
      true,
      { originalError: error.name }
    );
  }

  return createAIError(
    AIErrorCode.UNKNOWN_ERROR,
    'An unknown error occurred',
    provider,
    false
  );
};

// ============================================
// Retry Logic
// ============================================

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if error is retryable
      const aiError = handleProviderError(error, 'openai');
      if (!aiError.retryable || attempt === maxRetries) {
        throw error;
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await sleep(delay);
    }
  }

  throw lastError;
};

// ============================================
// Provider Implementations
// ============================================

const callOpenAI = async (
  request: LLMRequest,
  config: AIProviderConfig,
  options: AIRequestOptions
): Promise<LLMResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || config.timeout
  );

  try {
    const response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        ...(config.organizationId && { 'OpenAI-Organization': config.organizationId }),
      },
      body: JSON.stringify({
        model: request.model || config.defaultModel,
        messages: request.messages,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? 2048,
        top_p: request.topP ?? 1,
        frequency_penalty: request.frequencyPenalty ?? 0,
        presence_penalty: request.presencePenalty ?? 0,
        ...(request.responseFormat && { response_format: request.responseFormat }),
      }),
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: { message?: string } })?.error?.message ||
          `OpenAI API error: ${response.status}`
      );
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
    };

    return {
      content: data.choices[0]?.message?.content || '',
      finishReason: data.choices[0]?.finish_reason as LLMResponse['finishReason'],
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0,
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const callAnthropic = async (
  request: LLMRequest,
  config: AIProviderConfig,
  options: AIRequestOptions
): Promise<LLMResponse> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeout || config.timeout
  );

  try {
    // Extract system message
    const systemMessage = request.messages.find((m) => m.role === 'system');
    const otherMessages = request.messages.filter((m) => m.role !== 'system');

    const response = await fetch(`${config.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey || '',
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: request.model || config.defaultModel,
        max_tokens: request.maxTokens ?? 2048,
        ...(systemMessage && { system: systemMessage.content }),
        messages: otherMessages.map((m) => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        })),
      }),
      signal: options.signal || controller.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        (errorData as { error?: { message?: string } })?.error?.message ||
          `Anthropic API error: ${response.status}`
      );
    }

    const data = await response.json() as {
      content: Array<{ text: string }>;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    return {
      content: data.content[0]?.text || '',
      finishReason: data.stop_reason === 'end_turn' ? 'stop' : 'length',
      usage: {
        promptTokens: data.usage?.input_tokens || 0,
        completionTokens: data.usage?.output_tokens || 0,
        totalTokens: (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0),
      },
    };
  } finally {
    clearTimeout(timeoutId);
  }
};

const callGroq = async (
  request: LLMRequest,
  config: AIProviderConfig,
  options: AIRequestOptions
): Promise<LLMResponse> => {
  // Groq uses OpenAI-compatible API
  return callOpenAI(request, config, options);
};

// ============================================
// Main Provider API
// ============================================

/**
 * Call LLM with the specified provider
 */
export const callLLM = async (
  provider: AIProvider,
  request: LLMRequest,
  options: AIRequestOptions = {}
): Promise<AIResponse<LLMResponse>> => {
  const startTime = Date.now();
  const config = getProviderConfig(provider);

  if (!config.apiKey && provider !== 'local') {
    return {
      success: false,
      error: createAIError(
        AIErrorCode.AUTHENTICATION_ERROR,
        `API key not configured for ${provider}`,
        provider,
        false
      ),
      metadata: createMetadata(provider, request.model || config.defaultModel, 0, startTime),
    };
  }

  try {
    const maxRetries = options.retries ?? config.maxRetries;

    const response = await withRetry(async () => {
      switch (provider) {
        case 'openai':
        case 'azure-openai':
          return callOpenAI(request, config, options);
        case 'anthropic':
          return callAnthropic(request, config, options);
        case 'groq':
          return callGroq(request, config, options);
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }
    }, maxRetries);

    return {
      success: true,
      data: response,
      metadata: createMetadata(
        provider,
        request.model || config.defaultModel,
        response.usage.totalTokens,
        startTime
      ),
    };
  } catch (error) {
    return {
      success: false,
      error: handleProviderError(error, provider),
      metadata: createMetadata(provider, request.model || config.defaultModel, 0, startTime),
    };
  }
};

/**
 * Call embedding API
 */
export const callEmbedding = async (
  provider: AIProvider,
  request: EmbeddingRequest,
  options: AIRequestOptions = {}
): Promise<AIResponse<EmbeddingResponse>> => {
  const startTime = Date.now();
  const config = getProviderConfig(provider);

  if (!config.apiKey && provider !== 'local') {
    return {
      success: false,
      error: createAIError(
        AIErrorCode.AUTHENTICATION_ERROR,
        `API key not configured for ${provider}`,
        provider,
        false
      ),
      metadata: createMetadata(provider, request.model || 'text-embedding-3-small', 0, startTime),
    };
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      options.timeout || config.timeout
    );

    try {
      const response = await fetch(`${config.baseUrl}/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || 'text-embedding-3-small',
          input: request.input,
        }),
        signal: options.signal || controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Embedding API error: ${response.status}`);
      }

      const data = await response.json() as {
        data: Array<{ embedding: number[] }>;
        usage: { total_tokens: number };
      };

      return {
        success: true,
        data: {
          embeddings: data.data.map((d) => d.embedding),
          usage: {
            totalTokens: data.usage?.total_tokens || 0,
          },
        },
        metadata: createMetadata(
          provider,
          request.model || 'text-embedding-3-small',
          data.usage?.total_tokens || 0,
          startTime
        ),
      };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error) {
    return {
      success: false,
      error: handleProviderError(error, provider),
      metadata: createMetadata(provider, request.model || 'text-embedding-3-small', 0, startTime),
    };
  }
};

/**
 * Check provider availability
 */
export const isProviderAvailable = (provider: AIProvider): boolean => {
  try {
    const config = getProviderConfig(provider);
    return provider === 'local' || !!config.apiKey;
  } catch {
    return false;
  }
};

/**
 * Get available providers
 */
export const getAvailableProviders = (): AIProvider[] => {
  const providers: AIProvider[] = ['openai', 'anthropic', 'groq', 'azure-openai', 'local'];
  return providers.filter(isProviderAvailable);
};

/**
 * Get default provider
 */
export const getDefaultProvider = (): AIProvider => {
  const available = getAvailableProviders();
  if (available.length === 0) {
    throw new Error('No AI providers available. Configure at least one API key.');
  }
  // Priority: OpenAI > Anthropic > Groq > Azure > Local
  const priority: AIProvider[] = ['openai', 'anthropic', 'groq', 'azure-openai', 'local'];
  return priority.find((p) => available.includes(p)) || available[0]!;
};

// ============================================
// Helper Functions
// ============================================

const createMetadata = (
  provider: AIProvider,
  model: string,
  totalTokens: number,
  startTime: number
): AIResponseMetadata => ({
  provider,
  model,
  tokensUsed: {
    prompt: 0,
    completion: 0,
    total: totalTokens,
  },
  latencyMs: Date.now() - startTime,
  cached: false,
  timestamp: new Date().toISOString(),
});

// ============================================
// Exports
// ============================================

export type { LLMMessage, LLMRequest, LLMResponse, EmbeddingRequest, EmbeddingResponse };
