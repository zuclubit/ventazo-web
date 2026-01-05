/**
 * AI Service
 * Unified AI service for lead scoring, email generation, and conversational AI
 *
 * Supports multiple providers:
 * - OpenAI: Direct OpenAI API integration
 * - Gemini: Google Gemini API integration
 * - Bot-Helper: Native integration with zuclubit-bot-helper (recommended)
 *
 * Bot-Helper provides:
 * - Multi-provider routing (OpenAI, Anthropic, Groq, Google, Mistral)
 * - Intelligent fallback and cost optimization
 * - CRM-specific tools and actions
 * - Budget management and analytics
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { OpenAIProvider } from './openai.provider';
import { GeminiProvider } from './gemini.provider';
import {
  BotHelperProvider,
  getBotHelperProvider,
  CRMAgentRequest,
  CRMAgentResponse,
  LeadScoreResponse,
  EmailGenerationResponse,
  SentimentAnalysisResponse,
} from './bot-helper.provider';
import { getBotHelperConfig } from '../../config/environment';
import {
  AIProvider,
  IAIProvider,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletionResponse,
  EmbeddingResponse,
  AILeadScore,
  LeadScoringFactors,
  LeadSentiment,
  EmailGenerationOptions,
  GeneratedEmail,
  LeadSummary,
  SmartResponse,
  ConversationAnalysis,
  ProductRecommendation,
  AssistantConversation,
  AssistantMessage,
  KnowledgeDocument,
  KnowledgeSearchResult,
  AIUsageRecord,
} from './types';

@injectable()
export class AIService {
  private providers: Map<AIProvider, IAIProvider> = new Map();
  private defaultProvider: AIProvider = 'openai';
  private botHelperProvider: BotHelperProvider | null = null;

  constructor(private pool: DatabasePool) {
    // Initialize providers
    this.providers.set('openai', new OpenAIProvider());
    this.providers.set('gemini', new GeminiProvider());

    // Configure from environment
    this.configureFromEnv();
  }

  /**
   * Configure providers from environment
   */
  private configureFromEnv(): void {
    const openaiKey = process.env.OPENAI_API_KEY;
    const geminiKey = process.env.GEMINI_API_KEY;

    // Bot-Helper configuration (native integration with zuclubit-bot-helper)
    const botHelperConfig = getBotHelperConfig();
    if (botHelperConfig.isEnabled) {
      this.botHelperProvider = getBotHelperProvider();
      this.botHelperProvider.initialize({
        apiUrl: botHelperConfig.apiUrl,
        sharedSecret: botHelperConfig.sharedSecret,
        timeout: botHelperConfig.timeout,
        preferredProvider: botHelperConfig.preferredProvider,
        preferredModel: botHelperConfig.preferredModel,
      });
      this.providers.set('bot-helper', this.botHelperProvider);
      // Set bot-helper as default when configured
      this.defaultProvider = 'bot-helper';
      console.log('[AIService] Bot-Helper provider initialized as default');
    }

    if (openaiKey) {
      const openai = this.providers.get('openai') as OpenAIProvider;
      openai.initialize({
        apiKey: openaiKey,
        organization: process.env.OPENAI_ORGANIZATION,
        defaultModel: process.env.OPENAI_MODEL,
        defaultEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL,
      });
    }

    if (geminiKey) {
      const gemini = this.providers.get('gemini') as GeminiProvider;
      gemini.initialize({
        apiKey: geminiKey,
        defaultModel: process.env.GEMINI_MODEL,
        defaultEmbeddingModel: process.env.GEMINI_EMBEDDING_MODEL,
      });
    }

    // Override default provider from environment if specified
    if (process.env.DEFAULT_AI_PROVIDER) {
      this.defaultProvider = process.env.DEFAULT_AI_PROVIDER as AIProvider;
    }
  }

  // ==================== Bot-Helper Native Methods ====================

  /**
   * Check if bot-helper integration is available
   */
  isBotHelperAvailable(): boolean {
    return this.botHelperProvider?.isInitialized() ?? false;
  }

  /**
   * Get the bot-helper provider for direct access to CRM-specific methods
   */
  getBotHelper(): BotHelperProvider | null {
    return this.botHelperProvider;
  }

  /**
   * Process CRM agent request with tool execution via bot-helper
   * This is the recommended way to interact with AI for CRM operations
   */
  async processAgentRequest(
    request: CRMAgentRequest,
    toolCallbackUrl?: string
  ): Promise<Result<CRMAgentResponse>> {
    if (!this.botHelperProvider?.isInitialized()) {
      return Result.fail('Bot-Helper provider not initialized');
    }

    try {
      const response = await this.botHelperProvider.processAgentRequest(
        request,
        toolCallbackUrl
      );
      return Result.ok(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Agent request failed: ${message}`);
    }
  }

  /**
   * Handle confirmation response for pending actions
   */
  async handleConfirmation(
    requestId: string,
    decision: 'confirm' | 'cancel' | 'modify',
    modifications?: Record<string, unknown>
  ): Promise<Result<CRMAgentResponse>> {
    if (!this.botHelperProvider?.isInitialized()) {
      return Result.fail('Bot-Helper provider not initialized');
    }

    try {
      const response = await this.botHelperProvider.handleConfirmation(
        requestId,
        decision,
        modifications
      );
      return Result.ok(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Confirmation handling failed: ${message}`);
    }
  }

  /**
   * AI-powered lead scoring via bot-helper
   * Uses CRM context for better scoring accuracy
   */
  async scoreLeadViaBotHelper(
    leadData: Record<string, unknown>,
    tenantId: string
  ): Promise<Result<LeadScoreResponse>> {
    if (!this.botHelperProvider?.isInitialized()) {
      return Result.fail('Bot-Helper provider not initialized');
    }

    try {
      const response = await this.botHelperProvider.scoreLead(leadData, tenantId);
      return Result.ok(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Lead scoring failed: ${message}`);
    }
  }

  /**
   * Generate email content via bot-helper
   */
  async generateEmailViaBotHelper(
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
  ): Promise<Result<EmailGenerationResponse>> {
    if (!this.botHelperProvider?.isInitialized()) {
      return Result.fail('Bot-Helper provider not initialized');
    }

    try {
      const response = await this.botHelperProvider.generateEmail(
        type,
        context,
        tenantId
      );
      return Result.ok(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Email generation failed: ${message}`);
    }
  }

  /**
   * Analyze sentiment via bot-helper
   */
  async analyzeSentimentViaBotHelper(
    text: string,
    tenantId: string
  ): Promise<Result<SentimentAnalysisResponse>> {
    if (!this.botHelperProvider?.isInitialized()) {
      return Result.fail('Bot-Helper provider not initialized');
    }

    try {
      const response = await this.botHelperProvider.analyzeSentiment(text, tenantId);
      return Result.ok(response);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Sentiment analysis failed: ${message}`);
    }
  }

  /**
   * Health check for bot-helper connection
   */
  async checkBotHelperHealth(): Promise<boolean> {
    if (!this.botHelperProvider) {
      return false;
    }
    return this.botHelperProvider.healthCheck();
  }

  /**
   * Get provider
   */
  private getProvider(provider?: AIProvider): IAIProvider {
    const p = this.providers.get(provider || this.defaultProvider);
    if (!p) {
      throw new Error(`AI provider ${provider || this.defaultProvider} not found`);
    }
    return p;
  }

  /**
   * Track AI usage
   */
  private async trackUsage(
    tenantId: string,
    userId: string,
    provider: AIProvider,
    operation: string,
    model: string,
    promptTokens: number,
    completionTokens: number,
    latencyMs: number,
    success: boolean,
    errorMessage?: string
  ): Promise<void> {
    // Calculate cost
    const providerInstance = this.providers.get(provider);
    const cost = providerInstance
      ? (providerInstance as OpenAIProvider | GeminiProvider).calculateCost(
          model,
          promptTokens,
          completionTokens
        )
      : 0;

    const query = `
      INSERT INTO ai_usage (
        tenant_id, user_id, provider, operation, model,
        prompt_tokens, completion_tokens, total_tokens, cost,
        latency_ms, success, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    await this.pool.query(query, [
      tenantId,
      userId,
      provider,
      operation,
      model,
      promptTokens,
      completionTokens,
      promptTokens + completionTokens,
      cost,
      latencyMs,
      success,
      errorMessage || null,
    ]);
  }

  // ==================== Chat Completion ====================

  /**
   * Chat completion
   */
  async chat(
    tenantId: string,
    userId: string,
    messages: ChatMessage[],
    options?: ChatCompletionOptions & { provider?: AIProvider }
  ): Promise<Result<ChatCompletionResponse>> {
    const startTime = Date.now();
    const provider = options?.provider || this.defaultProvider;

    try {
      const p = this.getProvider(provider);
      const response = await p.chat(messages, options);

      await this.trackUsage(
        tenantId,
        userId,
        provider,
        'chat',
        response.model,
        response.usage.promptTokens,
        response.usage.completionTokens,
        Date.now() - startTime,
        true
      );

      return Result.ok(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.trackUsage(
        tenantId,
        userId,
        provider,
        'chat',
        options?.model || 'unknown',
        0,
        0,
        Date.now() - startTime,
        false,
        errorMessage
      );

      return Result.fail(errorMessage);
    }
  }

  /**
   * Generate embedding
   */
  async embed(
    tenantId: string,
    userId: string,
    text: string,
    provider?: AIProvider
  ): Promise<Result<EmbeddingResponse>> {
    const startTime = Date.now();
    const p = provider || this.defaultProvider;

    try {
      const providerInstance = this.getProvider(p);
      const response = await providerInstance.embed(text);

      await this.trackUsage(
        tenantId,
        userId,
        p,
        'embed',
        response.model,
        response.usage.promptTokens,
        0,
        Date.now() - startTime,
        true
      );

      return Result.ok(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      await this.trackUsage(
        tenantId,
        userId,
        p,
        'embed',
        'unknown',
        0,
        0,
        Date.now() - startTime,
        false,
        errorMessage
      );

      return Result.fail(errorMessage);
    }
  }

  // ==================== Lead Scoring ====================

  /**
   * Score lead using AI
   */
  async scoreLeadAI(
    tenantId: string,
    userId: string,
    leadData: {
      name: string;
      email?: string;
      company?: string;
      title?: string;
      source?: string;
      notes?: string;
      interactions?: string[];
    },
    factors: Partial<LeadScoringFactors>
  ): Promise<Result<AILeadScore>> {
    const prompt = this.buildScoringPrompt(leadData, factors);

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert lead scoring assistant. Analyze the provided lead data and scoring factors to determine a lead score from 0-100.

Provide your response in JSON format with the following structure:
{
  "score": number (0-100),
  "confidence": number (0-1),
  "factors": [
    { "factor": string, "impact": "positive" | "negative" | "neutral", "weight": number (0-1) }
  ],
  "recommendation": string,
  "nextBestAction": string
}

Base your scoring on:
- Data completeness (email, phone, company, title)
- Engagement signals (email opens, clicks, website visits)
- Fit criteria (industry, company size, budget, timeline)
- Intent signals (form submissions, meetings, content downloads)`,
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.3,
      maxTokens: 1000,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to score lead');
    }

    try {
      const response = result.value;
      const parsed = JSON.parse(response?.content || '{}') as AILeadScore;
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse AI response');
    }
  }

  /**
   * Build scoring prompt
   */
  private buildScoringPrompt(
    leadData: {
      name: string;
      email?: string;
      company?: string;
      title?: string;
      source?: string;
      notes?: string;
      interactions?: string[];
    },
    factors: Partial<LeadScoringFactors>
  ): string {
    return `
Lead Information:
- Name: ${leadData.name}
- Email: ${leadData.email || 'Not provided'}
- Company: ${leadData.company || 'Not provided'}
- Title: ${leadData.title || 'Not provided'}
- Source: ${leadData.source || 'Unknown'}
- Notes: ${leadData.notes || 'None'}
- Recent Interactions: ${leadData.interactions?.join(', ') || 'None'}

Scoring Factors:
- Has Email: ${factors.email ?? false}
- Has Phone: ${factors.phone ?? false}
- Has Company: ${factors.company ?? false}
- Has Title: ${factors.title ?? false}
- Has Website: ${factors.website ?? false}
- Social Profiles: ${factors.socialProfiles ?? false}
- Recent Activity: ${factors.recentActivity ?? false}
- Email Opens: ${factors.emailOpens ?? 0}
- Link Clicks: ${factors.linkClicks ?? 0}
- Website Visits: ${factors.websiteVisits ?? 0}
- Form Submissions: ${factors.formSubmissions ?? 0}
- Meetings Scheduled: ${factors.meetingsScheduled ?? 0}
- Industry Match: ${factors.industryMatch ?? false}
- Company Size: ${factors.companySize ?? 'Unknown'}
- Budget: ${factors.budget ?? 'Unknown'}
- Timeline: ${factors.timeline ?? 'Unknown'}
- Decision Maker: ${factors.decisionMaker ?? false}

Please analyze and provide a lead score.`;
  }

  // ==================== Sentiment Analysis ====================

  /**
   * Analyze sentiment of lead communications
   */
  async analyzeSentiment(
    tenantId: string,
    userId: string,
    text: string
  ): Promise<Result<LeadSentiment>> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert at analyzing sentiment in business communications.

Analyze the provided text and return a JSON response:
{
  "overall": "positive" | "negative" | "neutral" | "mixed",
  "score": number (-1 to 1, where -1 is very negative and 1 is very positive),
  "confidence": number (0 to 1),
  "aspects": [
    { "aspect": string, "sentiment": "positive" | "negative" | "neutral", "score": number }
  ]
}

Consider aspects like: pricing, product interest, urgency, satisfaction, objections.`,
      },
      {
        role: 'user',
        content: `Analyze the sentiment of this communication:\n\n${text}`,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.2,
      maxTokens: 500,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to analyze sentiment');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '{}') as LeadSentiment;
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse sentiment response');
    }
  }

  // ==================== Email Generation ====================

  /**
   * Generate email for lead
   */
  async generateEmail(
    tenantId: string,
    userId: string,
    leadContext: {
      name: string;
      company?: string;
      title?: string;
      previousInteractions?: string[];
      notes?: string;
    },
    options: EmailGenerationOptions
  ): Promise<Result<GeneratedEmail>> {
    const toneDescriptions: Record<string, string> = {
      formal: 'professional and formal',
      friendly: 'warm and friendly while maintaining professionalism',
      professional: 'business professional',
      casual: 'conversational and casual',
    };

    const typeDescriptions: Record<string, string> = {
      follow_up: 'a follow-up email to continue the conversation',
      introduction: 'an introduction email to establish first contact',
      proposal: 'an email presenting a proposal or offer',
      thank_you: 'a thank you email after a meeting or interaction',
      meeting_request: 'an email requesting a meeting or call',
      custom: 'a custom email based on the instructions',
    };

    const lengthGuidelines: Record<string, string> = {
      short: 'Keep it brief (2-3 paragraphs max)',
      medium: 'Standard length (3-5 paragraphs)',
      long: 'Detailed and comprehensive (5+ paragraphs if needed)',
    };

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are an expert sales copywriter specializing in B2B communications.

Generate ${typeDescriptions[options.type]}.
Tone: ${toneDescriptions[options.tone]}.
Length: ${lengthGuidelines[options.length]}.
${options.includeCallToAction ? 'Include a clear call-to-action.' : ''}

Return JSON:
{
  "subject": string,
  "body": string,
  "callToAction": string (optional),
  "suggestedSendTime": string (ISO datetime, optional)
}

Make the email personalized and relevant to the lead's context.`,
      },
      {
        role: 'user',
        content: `Generate an email for:

Lead Name: ${leadContext.name}
Company: ${leadContext.company || 'Not specified'}
Title: ${leadContext.title || 'Not specified'}
Previous Interactions: ${leadContext.previousInteractions?.join('\n') || 'None'}
Notes: ${leadContext.notes || 'None'}
${options.customInstructions ? `Additional Instructions: ${options.customInstructions}` : ''}`,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.7,
      maxTokens: 1500,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to generate email');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '{}') as GeneratedEmail;
      if (parsed.suggestedSendTime) {
        parsed.suggestedSendTime = new Date(parsed.suggestedSendTime);
      }
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse email response');
    }
  }

  // ==================== Lead Summary ====================

  /**
   * Generate lead summary
   */
  async generateLeadSummary(
    tenantId: string,
    userId: string,
    leadData: {
      name: string;
      email?: string;
      company?: string;
      title?: string;
      source?: string;
      status?: string;
      score?: number;
      notes?: string[];
      activities?: Array<{ type: string; description: string; date: string }>;
      communications?: Array<{ type: string; content: string; date: string }>;
    }
  ): Promise<Result<LeadSummary>> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a sales intelligence assistant. Analyze lead data and provide actionable insights.

Return JSON:
{
  "overview": string (2-3 sentence summary),
  "keyInsights": [string] (3-5 key insights),
  "strengths": [string] (positive indicators),
  "concerns": [string] (potential issues or red flags),
  "recommendedActions": [string] (specific next steps),
  "engagementHistory": string (summary of engagement),
  "nextSteps": string (immediate recommended action)
}`,
      },
      {
        role: 'user',
        content: `Analyze this lead:

Name: ${leadData.name}
Email: ${leadData.email || 'Not provided'}
Company: ${leadData.company || 'Not provided'}
Title: ${leadData.title || 'Not provided'}
Source: ${leadData.source || 'Unknown'}
Status: ${leadData.status || 'Unknown'}
Score: ${leadData.score ?? 'Not scored'}

Notes:
${leadData.notes?.join('\n') || 'None'}

Activities:
${leadData.activities?.map((a) => `- ${a.date}: [${a.type}] ${a.description}`).join('\n') || 'None'}

Communications:
${leadData.communications?.map((c) => `- ${c.date}: [${c.type}] ${c.content.substring(0, 200)}...`).join('\n') || 'None'}`,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.4,
      maxTokens: 1500,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to generate summary');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '{}') as LeadSummary;
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse summary response');
    }
  }

  // ==================== Smart Responses ====================

  /**
   * Generate smart response suggestions
   */
  async suggestResponse(
    tenantId: string,
    userId: string,
    context: {
      message: string;
      leadName?: string;
      conversationHistory?: string[];
      product?: string;
    }
  ): Promise<Result<SmartResponse[]>> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a sales assistant helping craft responses to lead inquiries.

Generate 3 different response options varying in tone and approach.

Return JSON array:
[
  {
    "response": string,
    "confidence": number (0-1, how appropriate this response is),
    "variables": { key: value } (any personalization variables used)
  }
]`,
      },
      {
        role: 'user',
        content: `Message to respond to: "${context.message}"

Lead Name: ${context.leadName || 'Unknown'}
Product/Service: ${context.product || 'Not specified'}
Previous Conversation:
${context.conversationHistory?.join('\n') || 'None'}

Generate 3 response suggestions.`,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.8,
      maxTokens: 2000,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to generate responses');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '[]') as SmartResponse[];
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse response suggestions');
    }
  }

  // ==================== Conversation Analysis ====================

  /**
   * Analyze conversation
   */
  async analyzeConversation(
    tenantId: string,
    userId: string,
    messages: string[]
  ): Promise<Result<ConversationAnalysis>> {
    const chatMessages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a sales conversation analyst. Analyze the conversation and extract insights.

Return JSON:
{
  "summary": string,
  "keyTopics": [string],
  "actionItems": [string],
  "sentiment": {
    "overall": "positive" | "negative" | "neutral" | "mixed",
    "score": number (-1 to 1),
    "confidence": number (0 to 1),
    "aspects": []
  },
  "nextSteps": [string],
  "urgency": "low" | "medium" | "high" | "critical",
  "buyingSignals": [string],
  "objections": [string]
}`,
      },
      {
        role: 'user',
        content: `Analyze this conversation:\n\n${messages.join('\n\n')}`,
      },
    ];

    const result = await this.chat(tenantId, userId, chatMessages, {
      temperature: 0.3,
      maxTokens: 1500,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to analyze conversation');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '{}') as ConversationAnalysis;
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse analysis');
    }
  }

  // ==================== Product Recommendations ====================

  /**
   * Recommend products for lead
   */
  async recommendProducts(
    tenantId: string,
    userId: string,
    leadContext: {
      industry?: string;
      companySize?: string;
      budget?: string;
      needs?: string[];
      previousPurchases?: string[];
    },
    products: Array<{
      id: string;
      name: string;
      description: string;
      category: string;
      price?: number;
    }>
  ): Promise<Result<ProductRecommendation[]>> {
    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a product recommendation engine. Match products to lead needs.

Return JSON array:
[
  {
    "productId": string,
    "productName": string,
    "relevanceScore": number (0-1),
    "reason": string,
    "suggestedPitch": string
  }
]

Rank by relevance. Include top 3-5 recommendations.`,
      },
      {
        role: 'user',
        content: `Lead Context:
Industry: ${leadContext.industry || 'Unknown'}
Company Size: ${leadContext.companySize || 'Unknown'}
Budget: ${leadContext.budget || 'Unknown'}
Needs: ${leadContext.needs?.join(', ') || 'Not specified'}
Previous Purchases: ${leadContext.previousPurchases?.join(', ') || 'None'}

Available Products:
${products.map((p) => `- ${p.id}: ${p.name} (${p.category}) - ${p.description}`).join('\n')}`,
      },
    ];

    const result = await this.chat(tenantId, userId, messages, {
      temperature: 0.4,
      maxTokens: 1500,
    });

    if (result.isFailure) {
      return Result.fail(result.error || 'Failed to generate recommendations');
    }

    try {
      const parsed = JSON.parse(result.value?.content || '[]') as ProductRecommendation[];
      return Result.ok(parsed);
    } catch {
      return Result.fail('Failed to parse recommendations');
    }
  }

  // ==================== AI Assistant ====================

  /**
   * Create assistant conversation
   */
  async createConversation(
    tenantId: string,
    userId: string,
    leadId?: string,
    title?: string
  ): Promise<Result<AssistantConversation>> {
    const query = `
      INSERT INTO ai_conversations (tenant_id, user_id, lead_id, title, messages, context)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      tenantId,
      userId,
      leadId || null,
      title || 'New Conversation',
      JSON.stringify([]),
      JSON.stringify({}),
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to create conversation');
    }

    return Result.ok(this.mapConversationRow(result.value.rows[0]));
  }

  /**
   * Send message to assistant
   */
  async sendMessage(
    tenantId: string,
    userId: string,
    conversationId: string,
    message: string,
    systemPrompt?: string
  ): Promise<Result<AssistantMessage>> {
    // Get conversation
    const convQuery = `SELECT * FROM ai_conversations WHERE id = $1 AND tenant_id = $2`;
    const convResult = await this.pool.query(convQuery, [conversationId, tenantId]);

    if (convResult.isFailure || !convResult.value?.rows?.[0]) {
      return Result.fail('Conversation not found');
    }

    const conversation = this.mapConversationRow(convResult.value.rows[0]);

    // Build messages for AI
    const aiMessages: ChatMessage[] = [];

    if (systemPrompt) {
      aiMessages.push({ role: 'system', content: systemPrompt });
    } else {
      aiMessages.push({
        role: 'system',
        content: `You are a helpful CRM assistant for sales teams. You help with:
- Answering questions about leads and customers
- Providing sales advice and best practices
- Helping draft emails and communications
- Analyzing data and providing insights

Be concise, professional, and helpful.`,
      });
    }

    // Add conversation history
    for (const msg of conversation.messages) {
      aiMessages.push({
        role: msg.role === 'assistant' ? 'assistant' : 'user',
        content: msg.content,
      });
    }

    // Add new message
    aiMessages.push({ role: 'user', content: message });

    // Get AI response
    const result = await this.chat(tenantId, userId, aiMessages, {
      temperature: 0.7,
      maxTokens: 2000,
    });

    if (result.isFailure || !result.value) {
      return Result.fail(result.error || 'Failed to get AI response');
    }

    // Create new messages
    const userMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date(),
    };

    const assistantMessage: AssistantMessage = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: result.value.content,
      metadata: {
        confidence: 0.9,
      },
      createdAt: new Date(),
    };

    // Update conversation
    const updatedMessages = [...conversation.messages, userMessage, assistantMessage];

    const updateQuery = `
      UPDATE ai_conversations SET
        messages = $1,
        updated_at = NOW()
      WHERE id = $2
    `;

    await this.pool.query(updateQuery, [JSON.stringify(updatedMessages), conversationId]);

    return Result.ok(assistantMessage);
  }

  /**
   * Get conversation
   */
  async getConversation(
    tenantId: string,
    conversationId: string
  ): Promise<Result<AssistantConversation>> {
    const query = `SELECT * FROM ai_conversations WHERE id = $1 AND tenant_id = $2`;
    const result = await this.pool.query(query, [conversationId, tenantId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Conversation not found');
    }

    return Result.ok(this.mapConversationRow(result.value.rows[0]));
  }

  /**
   * List conversations
   */
  async listConversations(
    tenantId: string,
    userId?: string,
    leadId?: string,
    limit = 20
  ): Promise<Result<AssistantConversation[]>> {
    let query = `SELECT * FROM ai_conversations WHERE tenant_id = $1`;
    const values: unknown[] = [tenantId];
    let paramCount = 2;

    if (userId) {
      query += ` AND user_id = $${paramCount++}`;
      values.push(userId);
    }

    if (leadId) {
      query += ` AND lead_id = $${paramCount++}`;
      values.push(leadId);
    }

    query += ` ORDER BY updated_at DESC LIMIT $${paramCount}`;
    values.push(limit);

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to list conversations');
    }

    const conversations = result.value.rows.map((row: Record<string, unknown>) =>
      this.mapConversationRow(row)
    );

    return Result.ok(conversations);
  }

  // ==================== Knowledge Base ====================

  /**
   * Add document to knowledge base
   */
  async addDocument(
    tenantId: string,
    userId: string,
    document: Omit<KnowledgeDocument, 'id' | 'tenantId' | 'embedding' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<KnowledgeDocument>> {
    // Generate embedding
    const embeddingResult = await this.embed(tenantId, userId, document.content);

    const query = `
      INSERT INTO knowledge_documents (
        tenant_id, title, content, category, tags, embedding, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      tenantId,
      document.title,
      document.content,
      document.category,
      JSON.stringify(document.tags),
      embeddingResult.isSuccess ? JSON.stringify(embeddingResult.value?.embedding) : null,
      JSON.stringify(document.metadata || {}),
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to add document');
    }

    return Result.ok(this.mapDocumentRow(result.value.rows[0]));
  }

  /**
   * Search knowledge base
   */
  async searchKnowledge(
    tenantId: string,
    userId: string,
    query: string,
    limit = 5
  ): Promise<Result<KnowledgeSearchResult[]>> {
    // Generate query embedding
    const embeddingResult = await this.embed(tenantId, userId, query);

    if (embeddingResult.isFailure || !embeddingResult.value) {
      // Fallback to text search
      const textQuery = `
        SELECT * FROM knowledge_documents
        WHERE tenant_id = $1
        AND (title ILIKE $2 OR content ILIKE $2 OR tags::text ILIKE $2)
        LIMIT $3
      `;

      const result = await this.pool.query(textQuery, [tenantId, `%${query}%`, limit]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to search knowledge base');
      }

      return Result.ok(
        result.value.rows.map((row: Record<string, unknown>) => ({
          document: this.mapDocumentRow(row),
          relevanceScore: 0.5,
          matchedContent: (row.content as string).substring(0, 200),
        }))
      );
    }

    // Vector similarity search (requires pgvector extension)
    const vectorQuery = `
      SELECT *,
        1 - (embedding::vector <=> $2::vector) as similarity
      FROM knowledge_documents
      WHERE tenant_id = $1 AND embedding IS NOT NULL
      ORDER BY embedding::vector <=> $2::vector
      LIMIT $3
    `;

    try {
      const result = await this.pool.query(vectorQuery, [
        tenantId,
        JSON.stringify(embeddingResult.value.embedding),
        limit,
      ]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to search knowledge base');
      }

      return Result.ok(
        result.value.rows.map((row: Record<string, unknown>) => ({
          document: this.mapDocumentRow(row),
          relevanceScore: row.similarity as number,
          matchedContent: (row.content as string).substring(0, 200),
        }))
      );
    } catch {
      // Fallback if pgvector not available
      const textQuery = `
        SELECT * FROM knowledge_documents
        WHERE tenant_id = $1
        AND (title ILIKE $2 OR content ILIKE $2)
        LIMIT $3
      `;

      const result = await this.pool.query(textQuery, [tenantId, `%${query}%`, limit]);

      if (result.isFailure || !result.value?.rows) {
        return Result.fail('Failed to search knowledge base');
      }

      return Result.ok(
        result.value.rows.map((row: Record<string, unknown>) => ({
          document: this.mapDocumentRow(row),
          relevanceScore: 0.5,
          matchedContent: (row.content as string).substring(0, 200),
        }))
      );
    }
  }

  // ==================== Usage Analytics ====================

  /**
   * Get AI usage stats
   */
  async getUsageStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<{
    totalRequests: number;
    totalTokens: number;
    totalCost: number;
    byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
    byOperation: Record<string, { requests: number; tokens: number; cost: number }>;
  }>> {
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const query = `
      SELECT
        provider,
        operation,
        COUNT(*) as requests,
        SUM(total_tokens) as tokens,
        SUM(cost) as cost
      FROM ai_usage
      WHERE tenant_id = $1 AND created_at >= $2 AND created_at <= $3
      GROUP BY provider, operation
    `;

    const result = await this.pool.query(query, [tenantId, start, end]);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to get usage stats');
    }

    let totalRequests = 0;
    let totalTokens = 0;
    let totalCost = 0;
    const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
    const byOperation: Record<string, { requests: number; tokens: number; cost: number }> = {};

    for (const row of result.value.rows) {
      const requests = parseInt(row.requests as string, 10);
      const tokens = parseInt(row.tokens as string, 10) || 0;
      const cost = parseFloat(row.cost as string) || 0;

      totalRequests += requests;
      totalTokens += tokens;
      totalCost += cost;

      const provider = row.provider as string;
      if (!byProvider[provider]) {
        byProvider[provider] = { requests: 0, tokens: 0, cost: 0 };
      }
      byProvider[provider].requests += requests;
      byProvider[provider].tokens += tokens;
      byProvider[provider].cost += cost;

      const operation = row.operation as string;
      if (!byOperation[operation]) {
        byOperation[operation] = { requests: 0, tokens: 0, cost: 0 };
      }
      byOperation[operation].requests += requests;
      byOperation[operation].tokens += tokens;
      byOperation[operation].cost += cost;
    }

    return Result.ok({
      totalRequests,
      totalTokens,
      totalCost,
      byProvider,
      byOperation,
    });
  }

  // ==================== Private Helpers ====================

  private mapConversationRow(row: Record<string, unknown>): AssistantConversation {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      leadId: row.lead_id as string | undefined,
      title: row.title as string | undefined,
      messages:
        typeof row.messages === 'string'
          ? JSON.parse(row.messages)
          : (row.messages as AssistantMessage[]),
      context:
        typeof row.context === 'string'
          ? JSON.parse(row.context)
          : (row.context as Record<string, unknown> | undefined),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapDocumentRow(row: Record<string, unknown>): KnowledgeDocument {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      title: row.title as string,
      content: row.content as string,
      category: row.category as string,
      tags: typeof row.tags === 'string' ? JSON.parse(row.tags) : (row.tags as string[]),
      embedding:
        typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : (row.embedding as number[] | undefined),
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : (row.metadata as Record<string, string> | undefined),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}
