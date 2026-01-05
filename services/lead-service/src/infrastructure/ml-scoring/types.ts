/**
 * ML-based Lead Scoring Types
 * Machine learning powered lead scoring and prioritization
 */

/**
 * Feature types for ML scoring
 */
export interface LeadFeatures {
  // Demographic features
  companySize?: string;
  industry?: string;
  jobTitle?: string;
  location?: string;

  // Behavioral features
  emailOpens: number;
  emailClicks: number;
  websiteVisits: number;
  pageViews: number;
  formSubmissions: number;
  contentDownloads: number;
  webinarAttendance: number;
  demoRequests: number;

  // Engagement features
  daysSinceFirstTouch: number;
  daysSinceLastActivity: number;
  totalTouchpoints: number;
  averageSessionDuration: number;
  socialEngagements: number;

  // Firmographic features
  revenue?: number;
  employeeCount?: number;
  fundingStage?: string;
  techStack?: string[];

  // Intent signals
  pricingPageViews: number;
  competitorMentions: number;
  searchKeywords?: string[];

  // Historical features
  previousPurchases: number;
  lifetimeValue: number;
  referralSource?: string;
}

/**
 * ML model types
 */
export type MLModelType =
  | 'logistic_regression'
  | 'random_forest'
  | 'gradient_boosting'
  | 'neural_network'
  | 'ensemble';

/**
 * Model configuration
 */
export interface MLModelConfig {
  id: string;
  name: string;
  type: MLModelType;
  version: string;
  parameters: Record<string, unknown>;
  features: string[];
  targetVariable: string;
  threshold: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  trainedAt?: Date;
  accuracy?: number;
  precision?: number;
  recall?: number;
  f1Score?: number;
  auc?: number;
}

/**
 * Score prediction result
 */
export interface ScorePrediction {
  leadId: string;
  score: number;
  probability: number;
  confidence: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  factors: ScoreFactor[];
  modelId: string;
  modelVersion: string;
  predictedAt: Date;
  expiresAt: Date;
}

/**
 * Factor contributing to score
 */
export interface ScoreFactor {
  name: string;
  displayName: string;
  value: unknown;
  impact: number; // Positive or negative impact on score
  weight: number;
  category: 'demographic' | 'behavioral' | 'firmographic' | 'intent' | 'engagement';
  description: string;
}

/**
 * Scoring rule for rule-based scoring component
 */
export interface ScoringRule {
  id: string;
  name: string;
  description: string;
  condition: RuleCondition;
  points: number;
  category: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Rule condition
 */
export interface RuleCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in' | 'between' | 'exists' | 'not_exists';
  value: unknown;
  logic?: 'and' | 'or';
  nested?: RuleCondition[];
}

/**
 * Training data record
 */
export interface TrainingRecord {
  id: string;
  leadId: string;
  features: LeadFeatures;
  outcome: 'converted' | 'lost' | 'pending';
  conversionTime?: number; // Days to conversion
  actualValue?: number;
  recordedAt: Date;
}

/**
 * Model training job
 */
export interface TrainingJob {
  id: string;
  modelId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  datasetSize: number;
  startedAt?: Date;
  completedAt?: Date;
  metrics?: ModelMetrics;
  error?: string;
  logs: TrainingLog[];
}

/**
 * Training log entry
 */
export interface TrainingLog {
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
  message: string;
  data?: Record<string, unknown>;
}

/**
 * Model performance metrics
 */
export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  auc: number;
  confusionMatrix: ConfusionMatrix;
  featureImportance: FeatureImportance[];
  calibrationCurve: CalibrationPoint[];
  rocCurve: ROCPoint[];
  precisionRecallCurve: PRPoint[];
}

/**
 * Confusion matrix
 */
export interface ConfusionMatrix {
  truePositives: number;
  trueNegatives: number;
  falsePositives: number;
  falseNegatives: number;
}

/**
 * Feature importance
 */
export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative' | 'neutral';
}

/**
 * Calibration point
 */
export interface CalibrationPoint {
  predictedProbability: number;
  actualProbability: number;
  count: number;
}

/**
 * ROC curve point
 */
export interface ROCPoint {
  fpr: number; // False positive rate
  tpr: number; // True positive rate
  threshold: number;
}

/**
 * Precision-Recall curve point
 */
export interface PRPoint {
  precision: number;
  recall: number;
  threshold: number;
}

/**
 * Lead priority queue
 */
export interface PriorityQueue {
  id: string;
  name: string;
  description: string;
  criteria: PriorityCriteria;
  leads: PriorityLead[];
  lastUpdated: Date;
}

/**
 * Priority criteria
 */
export interface PriorityCriteria {
  minScore: number;
  maxAge: number; // Days
  includeGrades: string[];
  excludeStatuses: string[];
  customFilters: Record<string, unknown>;
  sortBy: 'score' | 'probability' | 'recency' | 'value';
  sortOrder: 'asc' | 'desc';
}

/**
 * Lead in priority queue
 */
export interface PriorityLead {
  leadId: string;
  score: number;
  probability: number;
  grade: string;
  rank: number;
  daysSinceLastActivity: number;
  estimatedValue: number;
  nextBestAction: string;
  urgencyLevel: 'critical' | 'high' | 'medium' | 'low';
}

/**
 * Score decay configuration
 */
export interface ScoreDecayConfig {
  enabled: boolean;
  decayRate: number; // Percentage per day
  minScore: number;
  exemptStatuses: string[];
  recalculateOnActivity: boolean;
}

/**
 * Score history entry
 */
export interface ScoreHistoryEntry {
  id: string;
  leadId: string;
  score: number;
  previousScore: number;
  change: number;
  changeReason: string;
  factors: ScoreFactor[];
  recordedAt: Date;
}

/**
 * Ideal Customer Profile (ICP)
 */
export interface IdealCustomerProfile {
  id: string;
  name: string;
  description: string;
  attributes: ICPAttribute[];
  weight: number;
  isActive: boolean;
  matchThreshold: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * ICP attribute
 */
export interface ICPAttribute {
  field: string;
  idealValues: unknown[];
  weight: number;
  matchType: 'exact' | 'range' | 'contains' | 'similarity';
}

/**
 * ICP match result
 */
export interface ICPMatchResult {
  leadId: string;
  profileId: string;
  matchScore: number;
  matchPercentage: number;
  matchedAttributes: AttributeMatch[];
  unmatchedAttributes: AttributeMatch[];
  recommendation: string;
}

/**
 * Attribute match detail
 */
export interface AttributeMatch {
  field: string;
  expectedValue: unknown;
  actualValue: unknown;
  matched: boolean;
  matchScore: number;
}

/**
 * Predictive insight
 */
export interface PredictiveInsight {
  id: string;
  leadId: string;
  type: 'conversion_likelihood' | 'best_channel' | 'optimal_timing' | 'deal_size' | 'churn_risk';
  prediction: unknown;
  confidence: number;
  reasoning: string;
  suggestedActions: SuggestedAction[];
  validUntil: Date;
  generatedAt: Date;
}

/**
 * Suggested action from ML model
 */
export interface SuggestedAction {
  action: string;
  description: string;
  priority: number;
  expectedImpact: number;
  channel?: string;
  timing?: string;
}

/**
 * A/B test for scoring models
 */
export interface ScoringABTest {
  id: string;
  name: string;
  description: string;
  controlModelId: string;
  treatmentModelId: string;
  splitPercentage: number;
  status: 'draft' | 'running' | 'completed' | 'stopped';
  startDate: Date;
  endDate?: Date;
  results?: ABTestResults;
}

/**
 * A/B test results
 */
export interface ABTestResults {
  controlConversions: number;
  treatmentConversions: number;
  controlSampleSize: number;
  treatmentSampleSize: number;
  controlConversionRate: number;
  treatmentConversionRate: number;
  lift: number;
  pValue: number;
  isSignificant: boolean;
  confidence: number;
}

/**
 * Batch scoring job
 */
export interface BatchScoringJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  modelId: string;
  totalLeads: number;
  processedLeads: number;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

/**
 * Score distribution analytics
 */
export interface ScoreDistribution {
  buckets: ScoreBucket[];
  mean: number;
  median: number;
  standardDeviation: number;
  percentiles: Record<string, number>;
}

/**
 * Score bucket
 */
export interface ScoreBucket {
  min: number;
  max: number;
  count: number;
  percentage: number;
  conversionRate: number;
}

/**
 * ML Scoring dashboard
 */
export interface MLScoringDashboard {
  summary: ScoringDashboardSummary;
  scoreDistribution: ScoreDistribution;
  gradeBreakdown: GradeBreakdown;
  modelPerformance: ModelPerformanceSummary;
  topFactors: ScoreFactor[];
  recentPredictions: ScorePrediction[];
  conversionTrend: ConversionTrendPoint[];
  alerts: ScoringAlert[];
}

/**
 * Scoring dashboard summary
 */
export interface ScoringDashboardSummary {
  totalScoredLeads: number;
  averageScore: number;
  highQualityLeads: number;
  leadsToReview: number;
  predictedConversions: number;
  modelAccuracy: number;
  lastModelUpdate: Date;
}

/**
 * Grade breakdown
 */
export interface GradeBreakdown {
  A: GradeStats;
  B: GradeStats;
  C: GradeStats;
  D: GradeStats;
  F: GradeStats;
}

/**
 * Grade statistics
 */
export interface GradeStats {
  count: number;
  percentage: number;
  averageScore: number;
  conversionRate: number;
  averageDealSize: number;
}

/**
 * Model performance summary
 */
export interface ModelPerformanceSummary {
  activeModelId: string;
  activeModelVersion: string;
  accuracy: number;
  precision: number;
  recall: number;
  lastTrainingDate: Date;
  trainingDataSize: number;
  predictionCount: number;
}

/**
 * Conversion trend point
 */
export interface ConversionTrendPoint {
  date: string;
  predictedConversions: number;
  actualConversions: number;
  accuracy: number;
}

/**
 * Scoring alert
 */
export interface ScoringAlert {
  id: string;
  type: 'model_drift' | 'low_accuracy' | 'data_quality' | 'high_volume' | 'anomaly';
  severity: 'critical' | 'warning' | 'info';
  message: string;
  createdAt: Date;
  acknowledged: boolean;
}

/**
 * Lead enrichment for scoring
 */
export interface LeadEnrichmentForScoring {
  leadId: string;
  enrichedFeatures: Partial<LeadFeatures>;
  enrichmentSource: string;
  enrichedAt: Date;
  confidence: number;
}

/**
 * Score recalculation request
 */
export interface ScoreRecalculationRequest {
  leadIds?: string[];
  filters?: Record<string, unknown>;
  modelId?: string;
  force?: boolean;
  async?: boolean;
}

/**
 * Score comparison
 */
export interface ScoreComparison {
  leadId: string;
  scores: {
    modelId: string;
    modelName: string;
    score: number;
    probability: number;
    grade: string;
  }[];
  recommendation: string;
}

/**
 * Feature engineering configuration
 */
export interface FeatureEngineeringConfig {
  id: string;
  name: string;
  transformations: FeatureTransformation[];
  aggregations: FeatureAggregation[];
  derivedFeatures: DerivedFeature[];
  isActive: boolean;
}

/**
 * Feature transformation
 */
export interface FeatureTransformation {
  sourceField: string;
  targetField: string;
  type: 'normalize' | 'standardize' | 'log' | 'one_hot' | 'label_encode' | 'bin';
  parameters: Record<string, unknown>;
}

/**
 * Feature aggregation
 */
export interface FeatureAggregation {
  sourceField: string;
  targetField: string;
  aggregationType: 'sum' | 'avg' | 'count' | 'max' | 'min' | 'std';
  timeWindow?: string;
  groupBy?: string[];
}

/**
 * Derived feature
 */
export interface DerivedFeature {
  name: string;
  expression: string;
  dependencies: string[];
}

/**
 * Real-time scoring event
 */
export interface RealTimeScoringEvent {
  leadId: string;
  eventType: string;
  eventData: Record<string, unknown>;
  previousScore: number;
  newScore: number;
  scoreDelta: number;
  processedAt: Date;
}

/**
 * Scoring pipeline stage
 */
export interface ScoringPipelineStage {
  name: string;
  type: 'data_collection' | 'feature_engineering' | 'model_inference' | 'post_processing' | 'storage';
  status: 'pending' | 'running' | 'completed' | 'failed';
  duration?: number;
  error?: string;
}

/**
 * Scoring pipeline execution
 */
export interface ScoringPipelineExecution {
  id: string;
  leadId: string;
  stages: ScoringPipelineStage[];
  startedAt: Date;
  completedAt?: Date;
  result?: ScorePrediction;
  error?: string;
}
