// ============================================
// AI Engine - FASE 6.0
// Main AI engine functions for CRM operations
// ============================================

import { callLLM, getDefaultProvider } from './provider';
import {
  AIErrorCode,
  type AIConversionPrediction,
  type AIEnrichment,
  type AIInsight,
  type AILeadClassification,
  type AILeadScore,
  type AILeadSummary,
  type AINoteSummary,
  type AIPrediction,
  type AIProvider,
  type AIRecommendedAction,
  type AIRequestOptions,
  type AIResponse,
  type AIScoreFactor,
  type AIStageChangePrediction,
  type CRMContext,
} from './types';

// ============================================
// Types for Engine Operations
// ============================================

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  notes?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author?: string;
  type?: string;
}

interface EngineOptions extends AIRequestOptions {
  provider?: AIProvider;
  temperature?: number;
  maxTokens?: number;
}

// ============================================
// Prompt Templates
// ============================================

const PROMPTS = {
  leadSummary: {
    system: `You are an AI assistant specialized in CRM operations. Your task is to analyze lead information and provide concise, actionable summaries. Focus on key business insights, potential value, and recommended next steps. Always respond in valid JSON format.`,
    user: (text: string) => `Analyze the following lead information and provide a summary:

${text}

Respond with a JSON object containing:
{
  "summary": "A concise 2-3 sentence summary of the lead",
  "keyPoints": ["array of 3-5 key points about this lead"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed",
  "urgency": "low" | "medium" | "high" | "critical",
  "nextActions": [
    {
      "action": "recommended action",
      "priority": "low" | "medium" | "high",
      "reasoning": "why this action is recommended",
      "dueWithinDays": number or null
    }
  ],
  "confidence": 0.0 to 1.0
}`,
  },

  noteSummary: {
    system: `You are an AI assistant specialized in summarizing CRM notes and communications. Extract key themes, action items, and overall sentiment from the provided notes. Always respond in valid JSON format.`,
    user: (notes: Note[]) => `Summarize the following notes:

${notes.map((n, i) => `Note ${i + 1} (${n.createdAt}${n.author ? ` by ${n.author}` : ''}):
${n.content}`).join('\n\n')}

Respond with a JSON object containing:
{
  "summary": "A concise summary of all notes",
  "topics": ["main topics discussed"],
  "actionItems": ["extracted action items"],
  "sentiment": "positive" | "neutral" | "negative" | "mixed"
}`,
  },

  leadClassification: {
    system: `You are an AI assistant specialized in lead classification and qualification. Analyze lead data to determine industry, company size, buyer persona, and intent level. Always respond in valid JSON format.`,
    user: (text: string) => `Classify the following lead information:

${text}

Respond with a JSON object containing:
{
  "primaryLabel": "main classification label",
  "labels": [
    {"label": "category", "probability": 0.0 to 1.0, "description": "explanation"}
  ],
  "industry": "detected industry",
  "companySize": "startup" | "small" | "medium" | "large" | "enterprise",
  "buyerPersona": "detected buyer persona type",
  "intentLevel": "low" | "medium" | "high",
  "interests": ["detected interests"],
  "confidence": 0.0 to 1.0
}`,
  },

  leadScoring: {
    system: `You are an AI assistant specialized in lead scoring and qualification. Analyze lead data to determine a quality score from 0-100, identify scoring factors, and provide recommendations. Always respond in valid JSON format.`,
    user: (lead: Lead) => `Score the following lead:

Name: ${lead.firstName || ''} ${lead.lastName || ''}
Email: ${lead.email || 'N/A'}
Company: ${lead.company || 'N/A'}
Title: ${lead.title || 'N/A'}
Source: ${lead.source || 'N/A'}
Status: ${lead.status || 'N/A'}
Current Score: ${lead.score ?? 'N/A'}
Notes: ${lead.notes || 'N/A'}
Custom Fields: ${JSON.stringify(lead.customFields || {})}

Respond with a JSON object containing:
{
  "score": 0 to 100,
  "grade": "A" | "B" | "C" | "D" | "F",
  "factors": [
    {
      "name": "factor name",
      "weight": 0.0 to 1.0,
      "value": 0 to 100,
      "impact": "positive" | "negative" | "neutral",
      "explanation": "why this factor matters"
    }
  ],
  "recommendation": "pursue" | "nurture" | "archive" | "convert",
  "explanations": ["reasons for the score and recommendation"],
  "confidence": 0.0 to 1.0
}`,
  },

  stagePreiction: {
    system: `You are an AI assistant specialized in sales pipeline analysis. Predict the next likely stage for a lead based on their current data and history. Always respond in valid JSON format.`,
    user: (lead: Lead, stageHistory?: Array<{ stage: string; enteredAt: string }>) => `Predict the next stage for this lead:

Current Status: ${lead.status || 'unknown'}
Lead Data: ${JSON.stringify(lead, null, 2)}
${stageHistory ? `Stage History: ${JSON.stringify(stageHistory, null, 2)}` : ''}

Respond with a JSON object containing:
{
  "currentStage": "current stage",
  "predictedStage": "predicted next stage",
  "probability": 0.0 to 1.0,
  "timeframe": "days" | "weeks" | "months",
  "estimatedDays": number,
  "factors": ["factors influencing this prediction"]
}`,
  },

  conversionPrediction: {
    system: `You are an AI assistant specialized in conversion prediction. Analyze lead data to predict likelihood of conversion and potential value. Always respond in valid JSON format.`,
    user: (lead: Lead) => `Predict conversion for this lead:

${JSON.stringify(lead, null, 2)}

Respond with a JSON object containing:
{
  "willConvert": boolean,
  "probability": 0.0 to 1.0,
  "timeframeDays": number,
  "potentialValue": estimated monetary value,
  "riskFactors": ["factors that might prevent conversion"],
  "positiveIndicators": ["factors that support conversion"]
}`,
  },

  insights: {
    system: `You are an AI assistant specialized in generating actionable CRM insights. Analyze the provided context to identify trends, opportunities, risks, and recommendations. Always respond in valid JSON format.`,
    user: (context: CRMContext) => `Generate insights from this CRM context:

Entity Type: ${context.entityType}
Entity ID: ${context.entityId}
${context.relatedData?.notes ? `Notes: ${JSON.stringify(context.relatedData.notes)}` : ''}
${context.relatedData?.activities ? `Activities: ${JSON.stringify(context.relatedData.activities)}` : ''}
${context.pipelineContext ? `Pipeline: ${JSON.stringify(context.pipelineContext)}` : ''}

Respond with a JSON array of insights:
[
  {
    "type": "trend" | "anomaly" | "opportunity" | "risk" | "pattern" | "recommendation" | "alert",
    "category": "leads" | "opportunities" | "customers" | "pipeline" | "performance" | "engagement",
    "title": "insight title",
    "description": "detailed description",
    "impact": "low" | "medium" | "high",
    "actionable": boolean,
    "suggestedActions": [{"action": "what to do", "priority": "low" | "medium" | "high", "reasoning": "why"}],
    "confidence": 0.0 to 1.0
  }
]`,
  },

  enrichment: {
    system: `You are an AI assistant specialized in lead data enrichment. Analyze the provided lead data and suggest additional fields or corrections based on available information. Always respond in valid JSON format.`,
    user: (lead: Lead) => `Enrich this lead data:

${JSON.stringify(lead, null, 2)}

Respond with a JSON object containing:
{
  "enrichedFields": [
    {
      "fieldName": "field name",
      "originalValue": "original or null",
      "enrichedValue": "suggested value",
      "confidence": 0.0 to 1.0,
      "source": "how this was inferred"
    }
  ],
  "suggestedFields": [
    {
      "fieldName": "new field to add",
      "suggestedValue": "value",
      "confidence": 0.0 to 1.0,
      "reasoning": "why add this field"
    }
  ],
  "confidence": 0.0 to 1.0,
  "sources": ["data sources used"]
}`,
  },
};

// ============================================
// Helper Functions
// ============================================

const parseJSONResponse = <T>(content: string): T => {
  // Try to extract JSON from the response
  const jsonMatch = content.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
  if (!jsonMatch) {
    throw new Error('No valid JSON found in response');
  }
  return JSON.parse(jsonMatch[0]) as T;
};

const generateId = (): string => {
  return `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// ============================================
// Main Engine Functions
// ============================================

/**
 * Generate a summary for a lead based on text content
 */
export const generateLeadSummary = async (
  text: string,
  leadId: string,
  options: EngineOptions = {}
): Promise<AIResponse<AILeadSummary>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.leadSummary.system },
        { role: 'user', content: PROMPTS.leadSummary.user(text) },
      ],
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to generate lead summary',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<{
      summary: string;
      keyPoints: string[];
      sentiment: AILeadSummary['sentiment'];
      urgency: AILeadSummary['urgency'];
      nextActions: AIRecommendedAction[];
      confidence: number;
    }>(response.data.content);

    return {
      success: true,
      data: {
        id: generateId(),
        leadId,
        summary: parsed.summary,
        keyPoints: parsed.keyPoints,
        sentiment: parsed.sentiment,
        urgency: parsed.urgency,
        nextActions: parsed.nextActions,
        confidence: parsed.confidence,
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Generate a summary for a collection of notes
 */
export const generateNoteSummary = async (
  notes: Note[],
  options: EngineOptions = {}
): Promise<AIResponse<AINoteSummary>> => {
  const provider = options.provider || getDefaultProvider();

  if (notes.length === 0) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'No notes provided for summary',
        retryable: false,
      },
      metadata: {
        provider,
        model: 'unknown',
        tokensUsed: { prompt: 0, completion: 0, total: 0 },
        latencyMs: 0,
        cached: false,
        timestamp: new Date().toISOString(),
      },
    };
  }

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.noteSummary.system },
        { role: 'user', content: PROMPTS.noteSummary.user(notes) },
      ],
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to generate note summary',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<{
      summary: string;
      topics: string[];
      actionItems: string[];
      sentiment: AINoteSummary['sentiment'];
    }>(response.data.content);

    return {
      success: true,
      data: {
        id: generateId(),
        noteIds: notes.map((n) => n.id),
        summary: parsed.summary,
        topics: parsed.topics,
        actionItems: parsed.actionItems,
        sentiment: parsed.sentiment,
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Classify a lead based on text content
 */
export const classifyLead = async (
  text: string,
  options: EngineOptions = {}
): Promise<AIResponse<AILeadClassification>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.leadClassification.system },
        { role: 'user', content: PROMPTS.leadClassification.user(text) },
      ],
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to classify lead',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<{
      primaryLabel: string;
      labels: Array<{ label: string; probability: number; description?: string }>;
      industry: string;
      companySize: AILeadClassification['companySize'];
      buyerPersona: string;
      intentLevel: AILeadClassification['intentLevel'];
      interests: string[];
      confidence: number;
    }>(response.data.content);

    return {
      success: true,
      data: {
        id: generateId(),
        input: text,
        primaryLabel: parsed.primaryLabel,
        labels: parsed.labels,
        industry: parsed.industry,
        companySize: parsed.companySize,
        buyerPersona: parsed.buyerPersona,
        intentLevel: parsed.intentLevel,
        interests: parsed.interests,
        confidence: parsed.confidence,
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Score a lead based on its data
 */
export const scoreLead = async (
  lead: Lead,
  options: EngineOptions = {}
): Promise<AIResponse<AILeadScore>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.leadScoring.system },
        { role: 'user', content: PROMPTS.leadScoring.user(lead) },
      ],
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to score lead',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<{
      score: number;
      grade: AILeadScore['grade'];
      factors: AIScoreFactor[];
      recommendation: AILeadScore['recommendation'];
      explanations: string[];
      confidence: number;
    }>(response.data.content);

    return {
      success: true,
      data: {
        leadId: lead.id,
        score: Math.max(0, Math.min(100, parsed.score)),
        grade: parsed.grade,
        factors: parsed.factors,
        recommendation: parsed.recommendation,
        explanations: parsed.explanations,
        confidence: parsed.confidence,
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Predict the next stage change for a lead
 */
export const predictStageChange = async (
  lead: Lead,
  stageHistory?: Array<{ stage: string; enteredAt: string }>,
  options: EngineOptions = {}
): Promise<AIResponse<AIPrediction<AIStageChangePrediction>>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.stagePreiction.system },
        { role: 'user', content: PROMPTS.stagePreiction.user(lead, stageHistory) },
      ],
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to predict stage change',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<AIStageChangePrediction>(response.data.content);

    return {
      success: true,
      data: {
        prediction: parsed,
        probability: parsed.probability,
        alternatives: [],
        confidence: parsed.probability,
        reasoning: parsed.factors.join('; '),
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Predict conversion likelihood for a lead
 */
export const predictConversion = async (
  lead: Lead,
  options: EngineOptions = {}
): Promise<AIResponse<AIPrediction<AIConversionPrediction>>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.conversionPrediction.system },
        { role: 'user', content: PROMPTS.conversionPrediction.user(lead) },
      ],
      temperature: options.temperature ?? 0.3,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to predict conversion',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<AIConversionPrediction>(response.data.content);

    return {
      success: true,
      data: {
        prediction: parsed,
        probability: parsed.probability,
        alternatives: [],
        confidence: parsed.probability,
        reasoning: [...parsed.positiveIndicators, ...parsed.riskFactors.map((r) => `Risk: ${r}`)].join('; '),
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Generate insights from CRM context
 */
export const generateInsights = async (
  context: CRMContext,
  options: EngineOptions = {}
): Promise<AIResponse<AIInsight[]>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.insights.system },
        { role: 'user', content: PROMPTS.insights.user(context) },
      ],
      temperature: options.temperature ?? 0.4,
      maxTokens: options.maxTokens ?? 2048,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to generate insights',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<Array<{
      type: AIInsight['type'];
      category: AIInsight['category'];
      title: string;
      description: string;
      impact: AIInsight['impact'];
      actionable: boolean;
      suggestedActions: AIRecommendedAction[];
      confidence: number;
    }>>(response.data.content);

    const insights: AIInsight[] = parsed.map((insight) => ({
      id: generateId(),
      type: insight.type,
      category: insight.category,
      title: insight.title,
      description: insight.description,
      impact: insight.impact,
      actionable: insight.actionable,
      suggestedActions: insight.suggestedActions,
      relatedEntities: [
        {
          type: context.entityType,
          id: context.entityId,
          name: context.entityId,
          relevance: 1,
        },
      ],
      confidence: insight.confidence,
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      generatedAt: new Date().toISOString(),
    }));

    return {
      success: true,
      data: insights,
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

/**
 * Enrich lead data with AI-inferred fields
 */
export const enrichLead = async (
  lead: Lead,
  options: EngineOptions = {}
): Promise<AIResponse<AIEnrichment>> => {
  const provider = options.provider || getDefaultProvider();

  const response = await callLLM(
    provider,
    {
      messages: [
        { role: 'system', content: PROMPTS.enrichment.system },
        { role: 'user', content: PROMPTS.enrichment.user(lead) },
      ],
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 1024,
      responseFormat: { type: 'json_object' },
    },
    options
  );

  if (!response.success || !response.data) {
    return {
      success: false,
      error: response.error || {
        code: AIErrorCode.UNKNOWN_ERROR,
        message: 'Failed to enrich lead',
        retryable: true,
      },
      metadata: response.metadata,
    };
  }

  try {
    const parsed = parseJSONResponse<{
      enrichedFields: AIEnrichment['enrichedFields'];
      suggestedFields: AIEnrichment['suggestedFields'];
      confidence: number;
      sources: string[];
    }>(response.data.content);

    return {
      success: true,
      data: {
        leadId: lead.id,
        enrichedFields: parsed.enrichedFields,
        suggestedFields: parsed.suggestedFields,
        confidence: parsed.confidence,
        sources: parsed.sources,
        generatedAt: new Date().toISOString(),
      },
      metadata: response.metadata,
    };
  } catch (error) {
    return {
      success: false,
      error: {
        code: AIErrorCode.INVALID_INPUT,
        message: 'Failed to parse AI response',
        retryable: false,
        details: { parseError: error instanceof Error ? error.message : 'Unknown error' },
      },
      metadata: response.metadata,
    };
  }
};

// ============================================
// Batch Operations
// ============================================

/**
 * Score multiple leads in batch
 */
export const scoreLeadsBatch = async (
  leads: Lead[],
  options: EngineOptions & { concurrency?: number } = {}
): Promise<{
  results: Array<{ leadId: string; score?: AILeadScore; error?: string }>;
  successful: number;
  failed: number;
  totalTimeMs: number;
}> => {
  const startTime = Date.now();
  const concurrency = options.concurrency || 3;
  const results: Array<{ leadId: string; score?: AILeadScore; error?: string }> = [];

  // Process in batches
  for (let i = 0; i < leads.length; i += concurrency) {
    const batch = leads.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(async (lead) => {
        const result = await scoreLead(lead, options);
        return {
          leadId: lead.id,
          score: result.success ? result.data : undefined,
          error: result.success ? undefined : result.error?.message,
        };
      })
    );
    results.push(...batchResults);
  }

  return {
    results,
    successful: results.filter((r) => r.score).length,
    failed: results.filter((r) => r.error).length,
    totalTimeMs: Date.now() - startTime,
  };
};

// ============================================
// Exports
// ============================================

export type { Lead, Note, EngineOptions };
