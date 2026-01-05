// ============================================
// AI Engine Tests - FASE 6.0
// ============================================

import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  classifyLead,
  enrichLead,
  generateInsights,
  generateLeadSummary,
  generateNoteSummary,
  predictConversion,
  predictStageChange,
  scoreLead,
} from '../engine';
import * as provider from '../provider';
import { AIErrorCode, type AIProvider } from '../types';

// Mock the provider module
vi.mock('../provider', () => ({
  callLLM: vi.fn(),
  getDefaultProvider: vi.fn(() => 'openai'),
}));

// Helper to create mock LLM response
const createMockLLMResponse = (content: string, overrides?: {
  provider?: AIProvider;
  model?: string;
  latencyMs?: number;
}) => ({
  success: true as const,
  data: {
    content,
    finishReason: 'stop' as const,
    usage: { promptTokens: 100, completionTokens: 100, totalTokens: 200 },
  },
  metadata: {
    provider: overrides?.provider ?? ('openai' as AIProvider),
    model: overrides?.model || 'gpt-4',
    tokensUsed: { prompt: 100, completion: 100, total: 200 },
    latencyMs: overrides?.latencyMs || 1000,
    cached: false,
    timestamp: new Date().toISOString(),
  },
});

// Helper to create error response
const createErrorResponse = (message: string) => ({
  success: false as const,
  error: {
    code: AIErrorCode.PROVIDER_ERROR,
    message,
    retryable: true,
  },
  metadata: {
    provider: 'openai' as AIProvider,
    model: 'gpt-4',
    tokensUsed: { prompt: 0, completion: 0, total: 0 },
    latencyMs: 100,
    cached: false,
    timestamp: new Date().toISOString(),
  },
});

describe('AI Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateLeadSummary', () => {
    it('should generate a lead summary successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        summary: 'High-value enterprise lead from tech sector',
        keyPoints: ['Enterprise customer', 'High budget', 'Quick decision timeline'],
        sentiment: 'positive',
        urgency: 'high',
        nextActions: [
          {
            action: 'Schedule demo',
            priority: 'high',
            reasoning: 'Lead shows strong buying intent',
            dueWithinDays: 3,
          },
        ],
        confidence: 0.85,
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const result = await generateLeadSummary('John Doe, CEO at TechCorp', 'lead-123');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.summary).toBe('High-value enterprise lead from tech sector');
      expect(result.data?.keyPoints).toHaveLength(3);
      expect(result.data?.sentiment).toBe('positive');
      expect(result.data?.urgency).toBe('high');
      expect(result.data?.leadId).toBe('lead-123');
    });

    it('should handle API errors gracefully', async () => {
      vi.mocked(provider.callLLM).mockResolvedValue(
        createErrorResponse('API rate limit exceeded')
      );

      const result = await generateLeadSummary('Test lead', 'lead-456');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toContain('rate limit');
    });
  });

  describe('generateNoteSummary', () => {
    it('should generate a note summary successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        summary: 'Customer expressed interest in premium features',
        topics: ['pricing', 'features', 'timeline'],
        actionItems: ['Send pricing sheet', 'Schedule follow-up'],
        sentiment: 'positive',
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const notes = [
        { id: 'n1', content: 'Call with customer about pricing', createdAt: '2024-01-15' },
        { id: 'n2', content: 'Follow-up email sent', createdAt: '2024-01-16' },
      ];

      const result = await generateNoteSummary(notes);

      expect(result.success).toBe(true);
      expect(result.data?.summary).toBe('Customer expressed interest in premium features');
      expect(result.data?.topics).toHaveLength(3);
      expect(result.data?.actionItems).toHaveLength(2);
    });

    it('should return error for empty notes', async () => {
      const result = await generateNoteSummary([]);

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('No notes provided');
    });
  });

  describe('classifyLead', () => {
    it('should classify a lead successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        primaryLabel: 'Enterprise B2B',
        labels: [
          { label: 'Enterprise', probability: 0.9 },
          { label: 'Technology', probability: 0.85 },
        ],
        industry: 'Technology',
        companySize: 'large',
        buyerPersona: 'IT Decision Maker',
        intentLevel: 'high',
        interests: ['automation', 'integration', 'analytics'],
        confidence: 0.88,
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const result = await classifyLead('TechCorp, 500 employees, looking for CRM');

      expect(result.success).toBe(true);
      expect(result.data?.primaryLabel).toBe('Enterprise B2B');
      expect(result.data?.industry).toBe('Technology');
      expect(result.data?.companySize).toBe('large');
      expect(result.data?.intentLevel).toBe('high');
    });
  });

  describe('scoreLead', () => {
    it('should score a lead successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        score: 85,
        grade: 'A',
        factors: [
          {
            name: 'Company Size',
            weight: 0.3,
            value: 90,
            impact: 'positive',
            explanation: 'Enterprise company with high potential',
          },
          {
            name: 'Engagement',
            weight: 0.25,
            value: 80,
            impact: 'positive',
            explanation: 'Multiple touchpoints recorded',
          },
        ],
        recommendation: 'pursue',
        explanations: ['High-value enterprise lead', 'Strong buying signals'],
        confidence: 0.9,
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const lead = {
        id: 'lead-789',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane@techcorp.com',
        company: 'TechCorp',
        title: 'VP of Engineering',
      };

      const result = await scoreLead(lead);

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(85);
      expect(result.data?.grade).toBe('A');
      expect(result.data?.recommendation).toBe('pursue');
      expect(result.data?.factors).toHaveLength(2);
    });

    it('should clamp score to 0-100 range', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        score: 150, // Invalid score
        grade: 'A',
        factors: [],
        recommendation: 'pursue',
        explanations: [],
        confidence: 0.9,
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const result = await scoreLead({ id: 'lead-test' });

      expect(result.success).toBe(true);
      expect(result.data?.score).toBe(100); // Clamped to max
    });
  });

  describe('predictStageChange', () => {
    it('should predict stage change successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        currentStage: 'qualification',
        predictedStage: 'proposal',
        probability: 0.75,
        timeframe: 'weeks',
        estimatedDays: 14,
        factors: ['High engagement', 'Budget confirmed', 'Decision maker involved'],
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const lead = {
        id: 'lead-stage',
        status: 'qualification',
        company: 'TestCo',
      };

      const result = await predictStageChange(lead);

      expect(result.success).toBe(true);
      expect(result.data?.prediction.predictedStage).toBe('proposal');
      expect(result.data?.prediction.probability).toBe(0.75);
      expect(result.data?.prediction.estimatedDays).toBe(14);
    });
  });

  describe('predictConversion', () => {
    it('should predict conversion successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        willConvert: true,
        probability: 0.8,
        timeframeDays: 30,
        potentialValue: 50000,
        riskFactors: ['Competitor evaluation'],
        positiveIndicators: ['Budget approved', 'Timeline defined'],
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const lead = {
        id: 'lead-convert',
        company: 'ConvertCo',
        score: 80,
      };

      const result = await predictConversion(lead);

      expect(result.success).toBe(true);
      expect(result.data?.prediction.willConvert).toBe(true);
      expect(result.data?.prediction.probability).toBe(0.8);
      expect(result.data?.prediction.potentialValue).toBe(50000);
    });
  });

  describe('generateInsights', () => {
    it('should generate insights successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify([
        {
          type: 'opportunity',
          category: 'leads',
          title: 'Upsell Opportunity',
          description: 'Customer shows interest in premium features',
          impact: 'high',
          actionable: true,
          suggestedActions: [
            {
              action: 'Schedule premium demo',
              priority: 'high',
              reasoning: 'High conversion potential',
            },
          ],
          confidence: 0.85,
        },
      ]));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const context = {
        tenantId: 'tenant-1',
        userId: 'user-1',
        entityType: 'lead' as const,
        entityId: 'lead-insights',
      };

      const result = await generateInsights(context);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0]?.type).toBe('opportunity');
      expect(result.data?.[0]?.impact).toBe('high');
    });
  });

  describe('enrichLead', () => {
    it('should enrich lead data successfully', async () => {
      const mockResponse = createMockLLMResponse(JSON.stringify({
        enrichedFields: [
          {
            fieldName: 'industry',
            originalValue: null,
            enrichedValue: 'Technology',
            confidence: 0.9,
            source: 'Inferred from company name and domain',
          },
        ],
        suggestedFields: [
          {
            fieldName: 'companySize',
            suggestedValue: 'medium',
            confidence: 0.75,
            reasoning: 'Based on typical company patterns',
          },
        ],
        confidence: 0.85,
        sources: ['Domain analysis', 'Company patterns'],
      }));

      vi.mocked(provider.callLLM).mockResolvedValue(mockResponse);

      const lead = {
        id: 'lead-enrich',
        email: 'test@techstartup.com',
        company: 'TechStartup',
      };

      const result = await enrichLead(lead);

      expect(result.success).toBe(true);
      expect(result.data?.enrichedFields).toHaveLength(1);
      expect(result.data?.suggestedFields).toHaveLength(1);
      expect(result.data?.leadId).toBe('lead-enrich');
    });
  });
});
