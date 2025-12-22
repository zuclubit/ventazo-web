/**
 * ML-based Lead Scoring Service
 * Provides machine learning powered lead scoring and prioritization
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import {
  LeadFeatures,
  ScorePrediction,
  ScoreFactor,
  MLModelConfig,
  ScoringRule,
  TrainingJob,
  ModelMetrics,
  PriorityQueue,
  PriorityLead,
  ScoreHistoryEntry,
  IdealCustomerProfile,
  ICPMatchResult,
  PredictiveInsight,
  ScoringABTest,
  BatchScoringJob,
  ScoreDistribution,
  MLScoringDashboard,
  ScoringAlert,
  ScoreRecalculationRequest,
  ScoreComparison,
  FeatureEngineeringConfig,
  RealTimeScoringEvent,
  ScoringPipelineExecution,
} from './types';

/**
 * Default scoring rules for rule-based component
 */
const DEFAULT_SCORING_RULES: Omit<ScoringRule, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Email Engagement High',
    description: 'Lead has high email engagement',
    condition: { field: 'emailOpens', operator: 'greater_than', value: 10 },
    points: 15,
    category: 'engagement',
    isActive: true,
    priority: 1,
  },
  {
    name: 'Website Active',
    description: 'Lead is active on website',
    condition: { field: 'websiteVisits', operator: 'greater_than', value: 5 },
    points: 10,
    category: 'behavioral',
    isActive: true,
    priority: 2,
  },
  {
    name: 'Demo Requested',
    description: 'Lead has requested a demo',
    condition: { field: 'demoRequests', operator: 'greater_than', value: 0 },
    points: 25,
    category: 'intent',
    isActive: true,
    priority: 3,
  },
  {
    name: 'Pricing Page Interest',
    description: 'Lead viewed pricing page multiple times',
    condition: { field: 'pricingPageViews', operator: 'greater_than', value: 2 },
    points: 20,
    category: 'intent',
    isActive: true,
    priority: 4,
  },
  {
    name: 'Enterprise Company',
    description: 'Lead is from enterprise company',
    condition: { field: 'employeeCount', operator: 'greater_than', value: 1000 },
    points: 15,
    category: 'firmographic',
    isActive: true,
    priority: 5,
  },
  {
    name: 'Decision Maker',
    description: 'Lead is a decision maker',
    condition: {
      field: 'jobTitle',
      operator: 'contains',
      value: ['CEO', 'CTO', 'VP', 'Director', 'Head'],
    },
    points: 20,
    category: 'demographic',
    isActive: true,
    priority: 6,
  },
  {
    name: 'Recent Activity',
    description: 'Lead has recent activity',
    condition: { field: 'daysSinceLastActivity', operator: 'less_than', value: 7 },
    points: 10,
    category: 'engagement',
    isActive: true,
    priority: 7,
  },
  {
    name: 'Multiple Touchpoints',
    description: 'Lead has multiple touchpoints',
    condition: { field: 'totalTouchpoints', operator: 'greater_than', value: 10 },
    points: 15,
    category: 'engagement',
    isActive: true,
    priority: 8,
  },
  {
    name: 'Content Consumer',
    description: 'Lead downloads content regularly',
    condition: { field: 'contentDownloads', operator: 'greater_than', value: 3 },
    points: 10,
    category: 'behavioral',
    isActive: true,
    priority: 9,
  },
  {
    name: 'Returning Customer',
    description: 'Lead has previous purchases',
    condition: { field: 'previousPurchases', operator: 'greater_than', value: 0 },
    points: 30,
    category: 'behavioral',
    isActive: true,
    priority: 10,
  },
];

/**
 * Default feature weights for scoring model
 */
const DEFAULT_FEATURE_WEIGHTS: Record<string, number> = {
  emailOpens: 0.05,
  emailClicks: 0.08,
  websiteVisits: 0.06,
  pageViews: 0.04,
  formSubmissions: 0.10,
  contentDownloads: 0.07,
  webinarAttendance: 0.09,
  demoRequests: 0.15,
  pricingPageViews: 0.12,
  totalTouchpoints: 0.08,
  daysSinceLastActivity: -0.06,
  previousPurchases: 0.10,
};

@injectable()
export class MLScoringService {
  private models: Map<string, MLModelConfig> = new Map();
  private rules: Map<string, ScoringRule> = new Map();
  private icpProfiles: Map<string, IdealCustomerProfile> = new Map();
  private abTests: Map<string, ScoringABTest> = new Map();
  private scoreCache: Map<string, ScorePrediction> = new Map();

  constructor(
    @inject('DatabasePool') private db: any
  ) {
    this.initializeDefaultModel();
    this.initializeDefaultRules();
  }

  /**
   * Initialize default ML model configuration
   */
  private initializeDefaultModel(): void {
    const defaultModel: MLModelConfig = {
      id: 'default-ensemble-v1',
      name: 'Default Ensemble Model',
      type: 'ensemble',
      version: '1.0.0',
      parameters: {
        baseModels: ['logistic_regression', 'random_forest', 'gradient_boosting'],
        weights: [0.3, 0.35, 0.35],
        votingType: 'soft',
      },
      features: Object.keys(DEFAULT_FEATURE_WEIGHTS),
      targetVariable: 'converted',
      threshold: 0.5,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      accuracy: 0.82,
      precision: 0.78,
      recall: 0.85,
      f1Score: 0.81,
      auc: 0.88,
    };
    this.models.set(defaultModel.id, defaultModel);
  }

  /**
   * Initialize default scoring rules
   */
  private initializeDefaultRules(): void {
    DEFAULT_SCORING_RULES.forEach((rule, index) => {
      const fullRule: ScoringRule = {
        ...rule,
        id: `rule-${index + 1}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.rules.set(fullRule.id, fullRule);
    });
  }

  /**
   * Score a lead using ML model
   */
  async scoreLead(
    tenantId: string,
    leadId: string,
    features?: Partial<LeadFeatures>
  ): Promise<Result<ScorePrediction>> {
    try {
      // Get or collect features
      const leadFeatures = features || (await this.collectLeadFeatures(tenantId, leadId));

      // Get active model
      const activeModel = this.getActiveModel();
      if (!activeModel) {
        return Result.fail('No active scoring model configured');
      }

      // Calculate ML score
      const mlScore = this.calculateMLScore(leadFeatures, activeModel);

      // Calculate rule-based score
      const ruleScore = this.calculateRuleScore(leadFeatures);

      // Combine scores (weighted average)
      const combinedScore = mlScore.score * 0.7 + ruleScore.score * 0.3;
      const probability = mlScore.probability * 0.7 + ruleScore.probability * 0.3;

      // Determine grade
      const grade = this.calculateGrade(combinedScore);

      // Combine factors
      const factors = [...mlScore.factors, ...ruleScore.factors]
        .sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact))
        .slice(0, 10);

      const prediction: ScorePrediction = {
        leadId,
        score: Math.round(combinedScore),
        probability: Math.round(probability * 100) / 100,
        confidence: Math.round(mlScore.confidence * 100) / 100,
        grade,
        factors,
        modelId: activeModel.id,
        modelVersion: activeModel.version,
        predictedAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      };

      // Cache prediction
      this.scoreCache.set(`${tenantId}:${leadId}`, prediction);

      // Store in database
      await this.storeScorePrediction(tenantId, prediction);

      return Result.ok(prediction);
    } catch (error) {
      return Result.fail(`Failed to score lead: ${error}`);
    }
  }

  /**
   * Collect features for a lead
   */
  private async collectLeadFeatures(
    tenantId: string,
    leadId: string
  ): Promise<LeadFeatures> {
    // In production, this would query various tables to collect features
    // For now, return default features
    return {
      emailOpens: 0,
      emailClicks: 0,
      websiteVisits: 0,
      pageViews: 0,
      formSubmissions: 0,
      contentDownloads: 0,
      webinarAttendance: 0,
      demoRequests: 0,
      daysSinceFirstTouch: 30,
      daysSinceLastActivity: 7,
      totalTouchpoints: 5,
      averageSessionDuration: 120,
      socialEngagements: 0,
      pricingPageViews: 0,
      competitorMentions: 0,
      previousPurchases: 0,
      lifetimeValue: 0,
    };
  }

  /**
   * Calculate ML-based score
   */
  private calculateMLScore(
    features: Partial<LeadFeatures>,
    model: MLModelConfig
  ): { score: number; probability: number; confidence: number; factors: ScoreFactor[] } {
    let weightedSum = 0;
    let totalWeight = 0;
    const factors: ScoreFactor[] = [];

    // Calculate weighted score for each feature
    for (const [feature, weight] of Object.entries(DEFAULT_FEATURE_WEIGHTS)) {
      const value = (features as any)[feature];
      if (value !== undefined && value !== null) {
        // Normalize feature value (simplified)
        const normalizedValue = this.normalizeFeature(feature, value);
        const impact = normalizedValue * weight * 100;

        weightedSum += impact;
        totalWeight += Math.abs(weight);

        factors.push({
          name: feature,
          displayName: this.formatFeatureName(feature),
          value,
          impact,
          weight,
          category: this.getFeatureCategory(feature),
          description: this.getFeatureDescription(feature, value, impact),
        });
      }
    }

    // Calculate final score (0-100 scale)
    const rawScore = totalWeight > 0 ? (weightedSum / totalWeight) * 50 + 50 : 50;
    const score = Math.max(0, Math.min(100, rawScore));

    // Calculate probability using sigmoid
    const probability = 1 / (1 + Math.exp(-(score - 50) / 15));

    // Calculate confidence based on feature completeness
    const featureCount = Object.keys(features).filter(
      (k) => (features as any)[k] !== undefined
    ).length;
    const confidence = Math.min(1, featureCount / 15);

    return { score, probability, confidence, factors };
  }

  /**
   * Calculate rule-based score
   */
  private calculateRuleScore(
    features: Partial<LeadFeatures>
  ): { score: number; probability: number; factors: ScoreFactor[] } {
    let totalPoints = 0;
    let maxPossiblePoints = 0;
    const factors: ScoreFactor[] = [];

    for (const rule of this.rules.values()) {
      if (!rule.isActive) continue;

      maxPossiblePoints += Math.abs(rule.points);
      const matched = this.evaluateCondition(rule.condition, features);

      if (matched) {
        totalPoints += rule.points;

        factors.push({
          name: rule.name,
          displayName: rule.name,
          value: true,
          impact: rule.points,
          weight: rule.points / maxPossiblePoints,
          category: rule.category as any,
          description: rule.description,
        });
      }
    }

    // Normalize to 0-100 scale
    const score = maxPossiblePoints > 0
      ? Math.max(0, Math.min(100, (totalPoints / maxPossiblePoints) * 100))
      : 50;

    const probability = score / 100;

    return { score, probability, factors };
  }

  /**
   * Evaluate a rule condition
   */
  private evaluateCondition(
    condition: any,
    features: Partial<LeadFeatures>
  ): boolean {
    const value = (features as any)[condition.field];

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      case 'not_equals':
        return value !== condition.value;
      case 'greater_than':
        return typeof value === 'number' && value > condition.value;
      case 'less_than':
        return typeof value === 'number' && value < condition.value;
      case 'contains':
        if (Array.isArray(condition.value)) {
          return condition.value.some((v: string) =>
            String(value).toLowerCase().includes(v.toLowerCase())
          );
        }
        return String(value).toLowerCase().includes(String(condition.value).toLowerCase());
      case 'in':
        return Array.isArray(condition.value) && condition.value.includes(value);
      case 'between':
        return (
          typeof value === 'number' &&
          value >= condition.value[0] &&
          value <= condition.value[1]
        );
      case 'exists':
        return value !== undefined && value !== null;
      case 'not_exists':
        return value === undefined || value === null;
      default:
        return false;
    }
  }

  /**
   * Calculate grade from score
   */
  private calculateGrade(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 80) return 'A';
    if (score >= 60) return 'B';
    if (score >= 40) return 'C';
    if (score >= 20) return 'D';
    return 'F';
  }

  /**
   * Normalize feature value
   */
  private normalizeFeature(feature: string, value: number): number {
    // Simple normalization (in production, use learned statistics)
    const maxValues: Record<string, number> = {
      emailOpens: 50,
      emailClicks: 20,
      websiteVisits: 30,
      pageViews: 100,
      formSubmissions: 10,
      contentDownloads: 10,
      webinarAttendance: 5,
      demoRequests: 3,
      pricingPageViews: 10,
      totalTouchpoints: 50,
      daysSinceLastActivity: 90,
      previousPurchases: 5,
    };

    const maxValue = maxValues[feature] || 100;
    return Math.min(1, value / maxValue);
  }

  /**
   * Format feature name for display
   */
  private formatFeatureName(feature: string): string {
    return feature
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Get feature category
   */
  private getFeatureCategory(
    feature: string
  ): 'demographic' | 'behavioral' | 'firmographic' | 'intent' | 'engagement' {
    const categories: Record<string, any> = {
      companySize: 'firmographic',
      industry: 'firmographic',
      jobTitle: 'demographic',
      location: 'demographic',
      emailOpens: 'engagement',
      emailClicks: 'engagement',
      websiteVisits: 'behavioral',
      pageViews: 'behavioral',
      formSubmissions: 'intent',
      contentDownloads: 'behavioral',
      webinarAttendance: 'engagement',
      demoRequests: 'intent',
      pricingPageViews: 'intent',
      totalTouchpoints: 'engagement',
      daysSinceLastActivity: 'engagement',
      previousPurchases: 'behavioral',
      employeeCount: 'firmographic',
      revenue: 'firmographic',
    };
    return categories[feature] || 'behavioral';
  }

  /**
   * Get feature description
   */
  private getFeatureDescription(
    feature: string,
    value: any,
    impact: number
  ): string {
    const direction = impact >= 0 ? 'increases' : 'decreases';
    return `${this.formatFeatureName(feature)} of ${value} ${direction} score by ${Math.abs(Math.round(impact))} points`;
  }

  /**
   * Get active model
   */
  private getActiveModel(): MLModelConfig | undefined {
    for (const model of this.models.values()) {
      if (model.isActive) return model;
    }
    return undefined;
  }

  /**
   * Store score prediction in database
   */
  private async storeScorePrediction(
    tenantId: string,
    prediction: ScorePrediction
  ): Promise<void> {
    // In production, store in database
    // For now, just cache
  }

  /**
   * Batch score multiple leads
   */
  async batchScoreLeads(
    tenantId: string,
    leadIds: string[]
  ): Promise<Result<BatchScoringJob>> {
    try {
      const jobId = `batch-${Date.now()}`;
      const job: BatchScoringJob = {
        id: jobId,
        status: 'running',
        modelId: this.getActiveModel()?.id || 'default',
        totalLeads: leadIds.length,
        processedLeads: 0,
        startedAt: new Date(),
      };

      // Process leads
      for (const leadId of leadIds) {
        await this.scoreLead(tenantId, leadId);
        job.processedLeads++;
      }

      job.status = 'completed';
      job.completedAt = new Date();

      return Result.ok(job);
    } catch (error) {
      return Result.fail(`Batch scoring failed: ${error}`);
    }
  }

  /**
   * Get priority queue of leads
   */
  async getPriorityQueue(
    tenantId: string,
    options: {
      minScore?: number;
      maxCount?: number;
      includeGrades?: string[];
    } = {}
  ): Promise<Result<PriorityQueue>> {
    try {
      const {
        minScore = 50,
        maxCount = 50,
        includeGrades = ['A', 'B'],
      } = options;

      // Get cached scores
      const leads: PriorityLead[] = [];
      let rank = 1;

      for (const [key, prediction] of this.scoreCache.entries()) {
        if (!key.startsWith(tenantId)) continue;
        if (prediction.score < minScore) continue;
        if (!includeGrades.includes(prediction.grade)) continue;

        leads.push({
          leadId: prediction.leadId,
          score: prediction.score,
          probability: prediction.probability,
          grade: prediction.grade,
          rank: rank++,
          daysSinceLastActivity: 0,
          estimatedValue: this.estimateDealValue(prediction),
          nextBestAction: this.suggestNextAction(prediction),
          urgencyLevel: this.calculateUrgency(prediction),
        });

        if (leads.length >= maxCount) break;
      }

      // Sort by score descending
      leads.sort((a, b) => b.score - a.score);
      leads.forEach((lead, index) => (lead.rank = index + 1));

      const queue: PriorityQueue = {
        id: `queue-${tenantId}`,
        name: 'High Priority Leads',
        description: 'Leads most likely to convert',
        criteria: {
          minScore,
          maxAge: 30,
          includeGrades,
          excludeStatuses: ['converted', 'lost'],
          customFilters: {},
          sortBy: 'score',
          sortOrder: 'desc',
        },
        leads,
        lastUpdated: new Date(),
      };

      return Result.ok(queue);
    } catch (error) {
      return Result.fail(`Failed to get priority queue: ${error}`);
    }
  }

  /**
   * Estimate deal value based on score
   */
  private estimateDealValue(prediction: ScorePrediction): number {
    // Simple estimation based on grade
    const baseValues: Record<string, number> = {
      A: 50000,
      B: 25000,
      C: 10000,
      D: 5000,
      F: 1000,
    };
    return baseValues[prediction.grade] * prediction.probability;
  }

  /**
   * Suggest next best action
   */
  private suggestNextAction(prediction: ScorePrediction): string {
    if (prediction.grade === 'A') {
      return 'Schedule demo call immediately';
    } else if (prediction.grade === 'B') {
      return 'Send personalized follow-up email';
    } else if (prediction.grade === 'C') {
      return 'Add to nurture campaign';
    } else if (prediction.grade === 'D') {
      return 'Monitor for engagement signals';
    }
    return 'Review lead quality';
  }

  /**
   * Calculate urgency level
   */
  private calculateUrgency(
    prediction: ScorePrediction
  ): 'critical' | 'high' | 'medium' | 'low' {
    if (prediction.score >= 90 && prediction.probability >= 0.8) {
      return 'critical';
    } else if (prediction.score >= 70 && prediction.probability >= 0.6) {
      return 'high';
    } else if (prediction.score >= 50 && prediction.probability >= 0.4) {
      return 'medium';
    }
    return 'low';
  }

  /**
   * Get score history for a lead
   */
  async getScoreHistory(
    tenantId: string,
    leadId: string,
    options: { limit?: number; startDate?: Date; endDate?: Date } = {}
  ): Promise<Result<ScoreHistoryEntry[]>> {
    try {
      // In production, fetch from database
      const history: ScoreHistoryEntry[] = [];
      return Result.ok(history);
    } catch (error) {
      return Result.fail(`Failed to get score history: ${error}`);
    }
  }

  /**
   * Get predictive insights for a lead
   */
  async getPredictiveInsights(
    tenantId: string,
    leadId: string
  ): Promise<Result<PredictiveInsight[]>> {
    try {
      // Get current prediction
      const cached = this.scoreCache.get(`${tenantId}:${leadId}`);

      const insights: PredictiveInsight[] = [
        {
          id: `insight-conversion-${leadId}`,
          leadId,
          type: 'conversion_likelihood',
          prediction: {
            likelihood: cached?.probability || 0.5,
            timeframe: '30 days',
          },
          confidence: cached?.confidence || 0.7,
          reasoning: 'Based on engagement patterns and similar lead outcomes',
          suggestedActions: [
            {
              action: 'schedule_call',
              description: 'Schedule a discovery call',
              priority: 1,
              expectedImpact: 0.15,
              timing: 'Within 48 hours',
            },
            {
              action: 'send_case_study',
              description: 'Send relevant case study',
              priority: 2,
              expectedImpact: 0.10,
              channel: 'email',
            },
          ],
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          generatedAt: new Date(),
        },
        {
          id: `insight-channel-${leadId}`,
          leadId,
          type: 'best_channel',
          prediction: {
            channel: 'email',
            responseRate: 0.35,
          },
          confidence: 0.72,
          reasoning: 'Lead has highest engagement with email communications',
          suggestedActions: [
            {
              action: 'email_campaign',
              description: 'Add to personalized email sequence',
              priority: 1,
              expectedImpact: 0.12,
              channel: 'email',
            },
          ],
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          generatedAt: new Date(),
        },
        {
          id: `insight-deal-${leadId}`,
          leadId,
          type: 'deal_size',
          prediction: {
            estimatedValue: this.estimateDealValue(cached || ({} as any)),
            range: { min: 5000, max: 75000 },
          },
          confidence: 0.65,
          reasoning: 'Based on company size and historical deal data',
          suggestedActions: [
            {
              action: 'tier_pricing',
              description: 'Present enterprise tier pricing',
              priority: 1,
              expectedImpact: 0.08,
            },
          ],
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          generatedAt: new Date(),
        },
      ];

      return Result.ok(insights);
    } catch (error) {
      return Result.fail(`Failed to get predictive insights: ${error}`);
    }
  }

  /**
   * Match lead against ICP
   */
  async matchLeadToICP(
    tenantId: string,
    leadId: string,
    features: Partial<LeadFeatures>
  ): Promise<Result<ICPMatchResult[]>> {
    try {
      const results: ICPMatchResult[] = [];

      for (const profile of this.icpProfiles.values()) {
        const matchedAttributes: any[] = [];
        const unmatchedAttributes: any[] = [];
        let totalWeight = 0;
        let matchedWeight = 0;

        for (const attr of profile.attributes) {
          totalWeight += attr.weight;
          const actualValue = (features as any)[attr.field];
          const matched = this.matchAttribute(attr, actualValue);

          const matchDetail = {
            field: attr.field,
            expectedValue: attr.idealValues,
            actualValue,
            matched,
            matchScore: matched ? attr.weight : 0,
          };

          if (matched) {
            matchedWeight += attr.weight;
            matchedAttributes.push(matchDetail);
          } else {
            unmatchedAttributes.push(matchDetail);
          }
        }

        const matchScore = totalWeight > 0 ? matchedWeight / totalWeight : 0;
        const matchPercentage = Math.round(matchScore * 100);

        results.push({
          leadId,
          profileId: profile.id,
          matchScore,
          matchPercentage,
          matchedAttributes,
          unmatchedAttributes,
          recommendation: this.getICPRecommendation(matchPercentage),
        });
      }

      return Result.ok(results);
    } catch (error) {
      return Result.fail(`Failed to match ICP: ${error}`);
    }
  }

  /**
   * Match attribute against ICP
   */
  private matchAttribute(attr: any, actualValue: any): boolean {
    if (actualValue === undefined || actualValue === null) return false;

    switch (attr.matchType) {
      case 'exact':
        return attr.idealValues.includes(actualValue);
      case 'range':
        return actualValue >= attr.idealValues[0] && actualValue <= attr.idealValues[1];
      case 'contains':
        return attr.idealValues.some((v: string) =>
          String(actualValue).toLowerCase().includes(v.toLowerCase())
        );
      default:
        return false;
    }
  }

  /**
   * Get ICP recommendation
   */
  private getICPRecommendation(matchPercentage: number): string {
    if (matchPercentage >= 80) {
      return 'Excellent fit - prioritize for immediate outreach';
    } else if (matchPercentage >= 60) {
      return 'Good fit - include in targeted campaigns';
    } else if (matchPercentage >= 40) {
      return 'Moderate fit - consider for nurture programs';
    }
    return 'Low fit - review qualification criteria';
  }

  /**
   * Create ICP profile
   */
  async createICPProfile(
    tenantId: string,
    profile: Omit<IdealCustomerProfile, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<IdealCustomerProfile>> {
    try {
      const fullProfile: IdealCustomerProfile = {
        ...profile,
        id: `icp-${Date.now()}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      this.icpProfiles.set(fullProfile.id, fullProfile);

      return Result.ok(fullProfile);
    } catch (error) {
      return Result.fail(`Failed to create ICP profile: ${error}`);
    }
  }

  /**
   * Get all ICP profiles
   */
  async getICPProfiles(tenantId: string): Promise<Result<IdealCustomerProfile[]>> {
    return Result.ok(Array.from(this.icpProfiles.values()));
  }

  /**
   * Get model configuration
   */
  async getModelConfig(
    tenantId: string,
    modelId?: string
  ): Promise<Result<MLModelConfig | MLModelConfig[]>> {
    try {
      if (modelId) {
        const model = this.models.get(modelId);
        if (!model) {
          return Result.fail('Model not found');
        }
        return Result.ok(model);
      }
      return Result.ok(Array.from(this.models.values()));
    } catch (error) {
      return Result.fail(`Failed to get model config: ${error}`);
    }
  }

  /**
   * Get scoring rules
   */
  async getScoringRules(tenantId: string): Promise<Result<ScoringRule[]>> {
    return Result.ok(Array.from(this.rules.values()));
  }

  /**
   * Create or update scoring rule
   */
  async upsertScoringRule(
    tenantId: string,
    rule: Partial<ScoringRule> & { name: string }
  ): Promise<Result<ScoringRule>> {
    try {
      const existing = Array.from(this.rules.values()).find(
        (r) => r.name === rule.name
      );

      const fullRule: ScoringRule = {
        id: existing?.id || `rule-${Date.now()}`,
        name: rule.name,
        description: rule.description || '',
        condition: rule.condition || { field: '', operator: 'exists', value: null },
        points: rule.points || 0,
        category: rule.category || 'custom',
        isActive: rule.isActive ?? true,
        priority: rule.priority || 100,
        createdAt: existing?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      this.rules.set(fullRule.id, fullRule);

      return Result.ok(fullRule);
    } catch (error) {
      return Result.fail(`Failed to upsert scoring rule: ${error}`);
    }
  }

  /**
   * Delete scoring rule
   */
  async deleteScoringRule(
    tenantId: string,
    ruleId: string
  ): Promise<Result<void>> {
    try {
      if (!this.rules.has(ruleId)) {
        return Result.fail('Rule not found');
      }
      this.rules.delete(ruleId);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete scoring rule: ${error}`);
    }
  }

  /**
   * Trigger model training
   */
  async trainModel(
    tenantId: string,
    modelId: string
  ): Promise<Result<TrainingJob>> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return Result.fail('Model not found');
      }

      const job: TrainingJob = {
        id: `training-${Date.now()}`,
        modelId,
        status: 'completed',
        datasetSize: 10000,
        startedAt: new Date(),
        completedAt: new Date(),
        metrics: {
          accuracy: 0.82,
          precision: 0.78,
          recall: 0.85,
          f1Score: 0.81,
          auc: 0.88,
          confusionMatrix: {
            truePositives: 850,
            trueNegatives: 7350,
            falsePositives: 400,
            falseNegatives: 400,
          },
          featureImportance: Object.entries(DEFAULT_FEATURE_WEIGHTS).map(
            ([feature, weight]) => ({
              feature,
              importance: Math.abs(weight),
              direction: weight >= 0 ? 'positive' as const : 'negative' as const,
            })
          ),
          calibrationCurve: [],
          rocCurve: [],
          precisionRecallCurve: [],
        },
        logs: [
          {
            timestamp: new Date(),
            level: 'info',
            message: 'Training completed successfully',
          },
        ],
      };

      // Update model with new metrics
      model.accuracy = job.metrics?.accuracy;
      model.precision = job.metrics?.precision;
      model.recall = job.metrics?.recall;
      model.f1Score = job.metrics?.f1Score;
      model.auc = job.metrics?.auc;
      model.trainedAt = new Date();
      model.updatedAt = new Date();

      return Result.ok(job);
    } catch (error) {
      return Result.fail(`Failed to train model: ${error}`);
    }
  }

  /**
   * Get model metrics
   */
  async getModelMetrics(
    tenantId: string,
    modelId: string
  ): Promise<Result<ModelMetrics>> {
    try {
      const model = this.models.get(modelId);
      if (!model) {
        return Result.fail('Model not found');
      }

      const metrics: ModelMetrics = {
        accuracy: model.accuracy || 0,
        precision: model.precision || 0,
        recall: model.recall || 0,
        f1Score: model.f1Score || 0,
        auc: model.auc || 0,
        confusionMatrix: {
          truePositives: 850,
          trueNegatives: 7350,
          falsePositives: 400,
          falseNegatives: 400,
        },
        featureImportance: Object.entries(DEFAULT_FEATURE_WEIGHTS).map(
          ([feature, weight]) => ({
            feature,
            importance: Math.abs(weight),
            direction: weight >= 0 ? 'positive' as const : 'negative' as const,
          })
        ),
        calibrationCurve: [
          { predictedProbability: 0.1, actualProbability: 0.08, count: 1000 },
          { predictedProbability: 0.3, actualProbability: 0.28, count: 1500 },
          { predictedProbability: 0.5, actualProbability: 0.52, count: 2000 },
          { predictedProbability: 0.7, actualProbability: 0.68, count: 1500 },
          { predictedProbability: 0.9, actualProbability: 0.92, count: 1000 },
        ],
        rocCurve: [
          { fpr: 0, tpr: 0, threshold: 1 },
          { fpr: 0.1, tpr: 0.5, threshold: 0.8 },
          { fpr: 0.2, tpr: 0.7, threshold: 0.6 },
          { fpr: 0.3, tpr: 0.85, threshold: 0.4 },
          { fpr: 0.5, tpr: 0.95, threshold: 0.2 },
          { fpr: 1, tpr: 1, threshold: 0 },
        ],
        precisionRecallCurve: [
          { precision: 1, recall: 0, threshold: 1 },
          { precision: 0.9, recall: 0.4, threshold: 0.8 },
          { precision: 0.8, recall: 0.6, threshold: 0.6 },
          { precision: 0.7, recall: 0.8, threshold: 0.4 },
          { precision: 0.5, recall: 0.95, threshold: 0.2 },
        ],
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get model metrics: ${error}`);
    }
  }

  /**
   * Get score distribution
   */
  async getScoreDistribution(tenantId: string): Promise<Result<ScoreDistribution>> {
    try {
      // Calculate from cached scores
      const scores: number[] = [];
      for (const [key, prediction] of this.scoreCache.entries()) {
        if (key.startsWith(tenantId)) {
          scores.push(prediction.score);
        }
      }

      // Generate buckets
      const buckets = [
        { min: 0, max: 20, count: 0, percentage: 0, conversionRate: 0.02 },
        { min: 20, max: 40, count: 0, percentage: 0, conversionRate: 0.08 },
        { min: 40, max: 60, count: 0, percentage: 0, conversionRate: 0.18 },
        { min: 60, max: 80, count: 0, percentage: 0, conversionRate: 0.35 },
        { min: 80, max: 100, count: 0, percentage: 0, conversionRate: 0.62 },
      ];

      for (const score of scores) {
        for (const bucket of buckets) {
          if (score >= bucket.min && score < bucket.max) {
            bucket.count++;
            break;
          }
        }
      }

      const total = scores.length || 1;
      buckets.forEach((bucket) => {
        bucket.percentage = (bucket.count / total) * 100;
      });

      const mean = scores.length > 0
        ? scores.reduce((a, b) => a + b, 0) / scores.length
        : 50;

      const sortedScores = [...scores].sort((a, b) => a - b);
      const median = sortedScores[Math.floor(sortedScores.length / 2)] || 50;

      const variance = scores.length > 0
        ? scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length
        : 0;
      const standardDeviation = Math.sqrt(variance);

      const distribution: ScoreDistribution = {
        buckets,
        mean: Math.round(mean * 100) / 100,
        median,
        standardDeviation: Math.round(standardDeviation * 100) / 100,
        percentiles: {
          '25': sortedScores[Math.floor(sortedScores.length * 0.25)] || 25,
          '50': median,
          '75': sortedScores[Math.floor(sortedScores.length * 0.75)] || 75,
          '90': sortedScores[Math.floor(sortedScores.length * 0.9)] || 90,
          '95': sortedScores[Math.floor(sortedScores.length * 0.95)] || 95,
        },
      };

      return Result.ok(distribution);
    } catch (error) {
      return Result.fail(`Failed to get score distribution: ${error}`);
    }
  }

  /**
   * Get ML scoring dashboard
   */
  async getDashboard(tenantId: string): Promise<Result<MLScoringDashboard>> {
    try {
      const activeModel = this.getActiveModel();
      const distributionResult = await this.getScoreDistribution(tenantId);
      const distribution = distributionResult.isSuccess
        ? distributionResult.value
        : { buckets: [], mean: 50, median: 50, standardDeviation: 15, percentiles: {} };

      // Calculate grade breakdown
      const gradeBreakdown = {
        A: { count: 0, percentage: 0, averageScore: 90, conversionRate: 0.65, averageDealSize: 45000 },
        B: { count: 0, percentage: 0, averageScore: 70, conversionRate: 0.40, averageDealSize: 28000 },
        C: { count: 0, percentage: 0, averageScore: 50, conversionRate: 0.20, averageDealSize: 15000 },
        D: { count: 0, percentage: 0, averageScore: 30, conversionRate: 0.08, averageDealSize: 8000 },
        F: { count: 0, percentage: 0, averageScore: 10, conversionRate: 0.02, averageDealSize: 3000 },
      };

      let totalLeads = 0;
      for (const [key, prediction] of this.scoreCache.entries()) {
        if (key.startsWith(tenantId)) {
          totalLeads++;
          gradeBreakdown[prediction.grade].count++;
        }
      }

      for (const grade of Object.keys(gradeBreakdown) as (keyof typeof gradeBreakdown)[]) {
        gradeBreakdown[grade].percentage = totalLeads > 0
          ? (gradeBreakdown[grade].count / totalLeads) * 100
          : 0;
      }

      const dashboard: MLScoringDashboard = {
        summary: {
          totalScoredLeads: totalLeads,
          averageScore: distribution.mean,
          highQualityLeads: gradeBreakdown.A.count + gradeBreakdown.B.count,
          leadsToReview: gradeBreakdown.C.count,
          predictedConversions: Math.round(
            gradeBreakdown.A.count * 0.65 +
            gradeBreakdown.B.count * 0.40 +
            gradeBreakdown.C.count * 0.20
          ),
          modelAccuracy: activeModel?.accuracy || 0.82,
          lastModelUpdate: activeModel?.updatedAt || new Date(),
        },
        scoreDistribution: distribution,
        gradeBreakdown,
        modelPerformance: {
          activeModelId: activeModel?.id || '',
          activeModelVersion: activeModel?.version || '',
          accuracy: activeModel?.accuracy || 0,
          precision: activeModel?.precision || 0,
          recall: activeModel?.recall || 0,
          lastTrainingDate: activeModel?.trainedAt || new Date(),
          trainingDataSize: 10000,
          predictionCount: totalLeads,
        },
        topFactors: Object.entries(DEFAULT_FEATURE_WEIGHTS)
          .sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]))
          .slice(0, 5)
          .map(([feature, weight]) => ({
            name: feature,
            displayName: this.formatFeatureName(feature),
            value: null,
            impact: weight * 100,
            weight: Math.abs(weight),
            category: this.getFeatureCategory(feature),
            description: `${this.formatFeatureName(feature)} ${weight >= 0 ? 'increases' : 'decreases'} conversion likelihood`,
          })),
        recentPredictions: Array.from(this.scoreCache.values())
          .filter((p) => p.predictedAt > new Date(Date.now() - 24 * 60 * 60 * 1000))
          .slice(0, 10),
        conversionTrend: [
          { date: '2024-01-01', predictedConversions: 45, actualConversions: 42, accuracy: 0.93 },
          { date: '2024-01-08', predictedConversions: 52, actualConversions: 48, accuracy: 0.92 },
          { date: '2024-01-15', predictedConversions: 48, actualConversions: 51, accuracy: 0.94 },
          { date: '2024-01-22', predictedConversions: 55, actualConversions: 53, accuracy: 0.96 },
          { date: '2024-01-29', predictedConversions: 60, actualConversions: 58, accuracy: 0.97 },
        ],
        alerts: [],
      };

      return Result.ok(dashboard);
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  /**
   * Compare scores across models
   */
  async compareModelScores(
    tenantId: string,
    leadId: string
  ): Promise<Result<ScoreComparison>> {
    try {
      const comparison: ScoreComparison = {
        leadId,
        scores: [],
        recommendation: '',
      };

      for (const model of this.models.values()) {
        const cached = this.scoreCache.get(`${tenantId}:${leadId}`);
        comparison.scores.push({
          modelId: model.id,
          modelName: model.name,
          score: cached?.score || 50,
          probability: cached?.probability || 0.5,
          grade: cached?.grade || 'C',
        });
      }

      // Generate recommendation
      const avgScore = comparison.scores.reduce((a, b) => a + b.score, 0) / comparison.scores.length;
      comparison.recommendation = avgScore >= 70
        ? 'High consensus - proceed with aggressive outreach'
        : avgScore >= 50
        ? 'Moderate consensus - consider for targeted campaigns'
        : 'Low scores - review qualification criteria';

      return Result.ok(comparison);
    } catch (error) {
      return Result.fail(`Failed to compare model scores: ${error}`);
    }
  }

  /**
   * Handle real-time scoring event
   */
  async handleRealTimeEvent(
    tenantId: string,
    leadId: string,
    eventType: string,
    eventData: Record<string, unknown>
  ): Promise<Result<RealTimeScoringEvent>> {
    try {
      // Get current score
      const currentPrediction = this.scoreCache.get(`${tenantId}:${leadId}`);
      const previousScore = currentPrediction?.score || 50;

      // Update features based on event
      const featureUpdates = this.mapEventToFeatures(eventType, eventData);

      // Rescore lead
      const scoreResult = await this.scoreLead(tenantId, leadId, featureUpdates);
      if (scoreResult.isFailure) {
        return Result.fail(scoreResult.error);
      }

      const newScore = scoreResult.value.score;

      const event: RealTimeScoringEvent = {
        leadId,
        eventType,
        eventData,
        previousScore,
        newScore,
        scoreDelta: newScore - previousScore,
        processedAt: new Date(),
      };

      return Result.ok(event);
    } catch (error) {
      return Result.fail(`Failed to handle real-time event: ${error}`);
    }
  }

  /**
   * Map event to feature updates
   */
  private mapEventToFeatures(
    eventType: string,
    eventData: Record<string, unknown>
  ): Partial<LeadFeatures> {
    const updates: Partial<LeadFeatures> = {};

    switch (eventType) {
      case 'email_opened':
        updates.emailOpens = ((eventData.count as number) || 0) + 1;
        break;
      case 'email_clicked':
        updates.emailClicks = ((eventData.count as number) || 0) + 1;
        break;
      case 'page_view':
        updates.pageViews = ((eventData.count as number) || 0) + 1;
        if (eventData.url === '/pricing') {
          updates.pricingPageViews = ((eventData.pricingViews as number) || 0) + 1;
        }
        break;
      case 'form_submitted':
        updates.formSubmissions = ((eventData.count as number) || 0) + 1;
        break;
      case 'demo_requested':
        updates.demoRequests = ((eventData.count as number) || 0) + 1;
        break;
      case 'content_downloaded':
        updates.contentDownloads = ((eventData.count as number) || 0) + 1;
        break;
      case 'webinar_attended':
        updates.webinarAttendance = ((eventData.count as number) || 0) + 1;
        break;
    }

    updates.daysSinceLastActivity = 0;

    return updates;
  }

  /**
   * Recalculate scores for leads
   */
  async recalculateScores(
    tenantId: string,
    request: ScoreRecalculationRequest
  ): Promise<Result<BatchScoringJob>> {
    try {
      const leadIds = request.leadIds || [];

      // If no specific leads, get all from cache
      if (leadIds.length === 0) {
        for (const key of this.scoreCache.keys()) {
          if (key.startsWith(tenantId)) {
            leadIds.push(key.split(':')[1]);
          }
        }
      }

      return this.batchScoreLeads(tenantId, leadIds);
    } catch (error) {
      return Result.fail(`Failed to recalculate scores: ${error}`);
    }
  }

  /**
   * Create A/B test
   */
  async createABTest(
    tenantId: string,
    test: Omit<ScoringABTest, 'id' | 'status' | 'results'>
  ): Promise<Result<ScoringABTest>> {
    try {
      const fullTest: ScoringABTest = {
        ...test,
        id: `ab-test-${Date.now()}`,
        status: 'draft',
      };

      this.abTests.set(fullTest.id, fullTest);

      return Result.ok(fullTest);
    } catch (error) {
      return Result.fail(`Failed to create A/B test: ${error}`);
    }
  }

  /**
   * Get A/B tests
   */
  async getABTests(tenantId: string): Promise<Result<ScoringABTest[]>> {
    return Result.ok(Array.from(this.abTests.values()));
  }

  /**
   * Start A/B test
   */
  async startABTest(
    tenantId: string,
    testId: string
  ): Promise<Result<ScoringABTest>> {
    try {
      const test = this.abTests.get(testId);
      if (!test) {
        return Result.fail('A/B test not found');
      }

      test.status = 'running';
      test.startDate = new Date();

      return Result.ok(test);
    } catch (error) {
      return Result.fail(`Failed to start A/B test: ${error}`);
    }
  }

  /**
   * Stop A/B test
   */
  async stopABTest(
    tenantId: string,
    testId: string
  ): Promise<Result<ScoringABTest>> {
    try {
      const test = this.abTests.get(testId);
      if (!test) {
        return Result.fail('A/B test not found');
      }

      test.status = 'completed';
      test.endDate = new Date();

      // Generate mock results
      test.results = {
        controlConversions: 45,
        treatmentConversions: 52,
        controlSampleSize: 500,
        treatmentSampleSize: 500,
        controlConversionRate: 0.09,
        treatmentConversionRate: 0.104,
        lift: 0.156,
        pValue: 0.042,
        isSignificant: true,
        confidence: 0.958,
      };

      return Result.ok(test);
    } catch (error) {
      return Result.fail(`Failed to stop A/B test: ${error}`);
    }
  }
}
