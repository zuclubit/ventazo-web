// ============================================
// FASE 6.3 — Conversation Intelligence Types
// Type definitions for email analysis, call transcription, and coaching
// ============================================

// ============================================
// Conversation Types
// ============================================

export type ConversationType = 'email' | 'call' | 'meeting' | 'chat' | 'note';
export type ConversationDirection = 'inbound' | 'outbound' | 'internal';
export type SentimentType = 'positive' | 'negative' | 'neutral' | 'mixed';
export type UrgencyLevel = 'low' | 'medium' | 'high' | 'urgent';

export interface Conversation {
  id: string;
  tenantId: string;
  type: ConversationType;
  direction: ConversationDirection;

  // Participants
  participants: ConversationParticipant[];
  leadId?: string;
  customerId?: string;
  dealId?: string;
  assignedUserId?: string;

  // Content
  subject?: string;
  content: string;
  summary?: string;
  transcription?: string;

  // Timing
  timestamp: string;
  duration?: number; // seconds for calls
  responseTime?: number; // seconds

  // Analysis
  analysis?: ConversationAnalysis;

  // Metadata
  source: string;
  externalId?: string;
  threadId?: string;
  attachments?: Attachment[];

  createdAt: string;
  updatedAt: string;
}

export interface ConversationParticipant {
  type: 'user' | 'lead' | 'customer' | 'external';
  id?: string;
  name: string;
  email?: string;
  phone?: string;
  role?: 'sender' | 'recipient' | 'cc' | 'participant';
}

export interface Attachment {
  id: string;
  name: string;
  type: string;
  size: number;
  url?: string;
}

// ============================================
// Conversation Analysis Types
// ============================================

export interface ConversationAnalysis {
  id: string;
  tenantId?: string;
  conversationId: string;

  // Sentiment
  sentiment: SentimentAnalysis;

  // Intent & Topics
  intents: IntentDetection[];
  topics: TopicDetection[];
  keywords: KeywordExtraction[];

  // Entities
  entities: EntityExtraction[];
  mentions: MentionExtraction[];

  // Quality & Engagement
  engagement: EngagementMetrics;
  quality: QualityMetrics;

  // Action Items
  actionItems: ActionItem[];
  questions: Question[];
  commitments: Commitment[];

  // Risk & Opportunity
  signals: ConversationSignal[];
  riskIndicators: RiskIndicator[];
  opportunityIndicators: OpportunityIndicator[];

  // AI Insights
  insights: ConversationInsight[];
  recommendations: ConversationRecommendation[];

  // Metadata
  analyzedAt: string;
  confidence: number;
  modelVersion: string;
}

// ============================================
// Sentiment Analysis Types
// ============================================

export interface SentimentAnalysis {
  overall: SentimentType;
  score: number; // -1 to 1
  confidence: number;

  // Breakdown
  positive: number;
  negative: number;
  neutral: number;

  // Progression (for longer conversations)
  progression?: SentimentProgression[];

  // Aspects
  aspects?: AspectSentiment[];

  // Emotions
  emotions?: EmotionDetection;
}

export interface SentimentProgression {
  segment: number;
  timestamp?: string;
  sentiment: SentimentType;
  score: number;
  text?: string;
}

export interface AspectSentiment {
  aspect: string;
  sentiment: SentimentType;
  score: number;
  mentions: number;
}

export interface EmotionDetection {
  joy: number;
  trust: number;
  anticipation: number;
  surprise: number;
  sadness: number;
  fear: number;
  anger: number;
  disgust: number;
  dominant: string;
}

// ============================================
// Intent & Topic Detection Types
// ============================================

export interface IntentDetection {
  intent: string;
  confidence: number;
  category: IntentCategory;
  subIntent?: string;
  evidence?: string;
}

export type IntentCategory =
  | 'purchase'
  | 'inquiry'
  | 'support'
  | 'complaint'
  | 'feedback'
  | 'cancellation'
  | 'renewal'
  | 'upsell'
  | 'referral'
  | 'scheduling'
  | 'negotiation'
  | 'other';

export interface TopicDetection {
  topic: string;
  confidence: number;
  relevance: number;
  mentions: number;
  segments?: string[];
}

export interface KeywordExtraction {
  keyword: string;
  frequency: number;
  relevance: number;
  category?: string;
  sentiment?: SentimentType;
}

// ============================================
// Entity & Mention Extraction Types
// ============================================

export interface EntityExtraction {
  type: EntityType;
  value: string;
  confidence: number;
  position?: { start: number; end: number };
  normalized?: string;
  metadata?: Record<string, unknown>;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'product'
  | 'price'
  | 'date'
  | 'time'
  | 'location'
  | 'email'
  | 'phone'
  | 'url'
  | 'competitor'
  | 'feature'
  | 'objection';

export interface MentionExtraction {
  type: 'product' | 'competitor' | 'feature' | 'person';
  name: string;
  sentiment: SentimentType;
  context: string;
  frequency: number;
}

// ============================================
// Quality & Engagement Metrics Types
// ============================================

export interface EngagementMetrics {
  score: number; // 0-100
  level: 'low' | 'medium' | 'high';

  // Indicators
  responseRate: number;
  avgResponseTime: number;
  questionCount: number;
  interactionCount: number;

  // Quality
  depth: number; // conversation depth
  relevance: number;
  personalization: number;
}

export interface QualityMetrics {
  score: number; // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';

  // Components
  clarity: number;
  professionalism: number;
  responsiveness: number;
  helpfulness: number;
  completeness: number;

  // Issues
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion?: string;
  position?: { start: number; end: number };
}

// ============================================
// Action Items & Commitments Types
// ============================================

export interface ActionItem {
  id: string;
  text: string;
  assignee?: string;
  dueDate?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'completed' | 'cancelled';
  source: string; // quote from conversation
  confidence: number;
}

export interface Question {
  id: string;
  text: string;
  askedBy: string;
  answered: boolean;
  answer?: string;
  importance: 'low' | 'medium' | 'high';
  category?: string;
}

export interface Commitment {
  id: string;
  text: string;
  madeBy: string;
  type: 'promise' | 'deadline' | 'deliverable' | 'followup';
  dueDate?: string;
  status: 'pending' | 'fulfilled' | 'broken';
  confidence: number;
}

// ============================================
// Signals & Indicators Types
// ============================================

export interface ConversationSignal {
  type: 'buying' | 'risk' | 'opportunity' | 'objection' | 'urgency';
  signal: string;
  strength: 'weak' | 'moderate' | 'strong';
  evidence: string;
  confidence: number;
  timestamp?: string;
}

export interface RiskIndicator {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  mitigation?: string;
}

export interface OpportunityIndicator {
  type: string;
  potential: 'low' | 'medium' | 'high';
  description: string;
  evidence: string;
  nextStep?: string;
}

// ============================================
// Insights & Recommendations Types
// ============================================

export interface ConversationInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  importance: 'low' | 'medium' | 'high';
  evidence?: string[];
  confidence: number;
}

export type InsightType =
  | 'pattern'
  | 'anomaly'
  | 'trend'
  | 'risk'
  | 'opportunity'
  | 'performance'
  | 'behavior';

export interface ConversationRecommendation {
  id: string;
  action: string;
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  category: 'follow_up' | 'escalation' | 'coaching' | 'process' | 'content';
  expectedOutcome?: string;
  automatable: boolean;
}

// ============================================
// Coaching Types
// ============================================

export interface CoachingSession {
  id: string;
  tenantId: string;
  userId: string;

  // Context
  conversationIds: string[];
  period: { start: string; end: string };

  // Assessment
  overallScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  trend: 'improving' | 'declining' | 'stable';

  // Skills
  skills: SkillAssessment[];

  // Feedback
  strengths: CoachingFeedback[];
  improvements: CoachingFeedback[];

  // Actions
  recommendations: CoachingRecommendation[];
  exercises: CoachingExercise[];

  // Progress
  previousScore?: number;
  goalsProgress?: GoalProgress[];

  createdAt: string;
}

export interface SkillAssessment {
  skill: SalesSkill;
  score: number;
  benchmark: number;
  trend: 'improving' | 'declining' | 'stable';
  examples: SkillExample[];
}

export type SalesSkill =
  | 'discovery'
  | 'objection_handling'
  | 'closing'
  | 'rapport_building'
  | 'active_listening'
  | 'value_articulation'
  | 'negotiation'
  | 'time_management'
  | 'follow_up'
  | 'product_knowledge';

export interface SkillExample {
  type: 'positive' | 'negative';
  text: string;
  conversationId: string;
  feedback: string;
  improvement?: string;
}

export interface CoachingFeedback {
  category: string;
  feedback: string;
  examples: string[];
  impact: 'low' | 'medium' | 'high';
}

export interface CoachingRecommendation {
  id: string;
  type: 'behavior' | 'technique' | 'knowledge' | 'process';
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  resources?: CoachingResource[];
  expectedOutcome: string;
}

export interface CoachingExercise {
  id: string;
  title: string;
  description: string;
  skill: SalesSkill;
  duration: number; // minutes
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  instructions: string[];
  completed: boolean;
}

export interface CoachingResource {
  type: 'video' | 'article' | 'template' | 'script' | 'example';
  title: string;
  url?: string;
  content?: string;
  duration?: number;
}

export interface GoalProgress {
  goalId: string;
  goal: string;
  target: number;
  current: number;
  progress: number; // percentage
  dueDate: string;
  status: 'on_track' | 'at_risk' | 'behind' | 'completed';
}

// ============================================
// Email Intelligence Types
// ============================================

export interface EmailAnalysis extends ConversationAnalysis {
  // Email-specific
  emailMetrics: EmailMetrics;
  threadAnalysis?: ThreadAnalysis;
  templateMatch?: TemplateMatch;
  suggestedReply?: SuggestedReply;
}

export interface EmailMetrics {
  wordCount: number;
  readingTime: number; // seconds
  formality: 'casual' | 'neutral' | 'formal';
  complexity: 'simple' | 'moderate' | 'complex';
  hasAttachments: boolean;
  hasLinks: boolean;
  hasMeeting: boolean;
  hasPricing: boolean;
}

export interface ThreadAnalysis {
  threadId: string;
  messageCount: number;
  participants: string[];
  duration: number; // days
  sentiment: SentimentProgression[];
  summary: string;
  keyDecisions: string[];
  pendingItems: string[];
}

export interface TemplateMatch {
  templateId: string;
  templateName: string;
  matchScore: number;
  suggestedTemplate?: string;
  customizations?: string[];
}

export interface SuggestedReply {
  id: string;
  content: string;
  tone: 'formal' | 'friendly' | 'neutral';
  purpose: 'answer' | 'follow_up' | 'close' | 'nurture';
  confidence: number;
  personalization: string[];
}

// ============================================
// Call Intelligence Types
// ============================================

export interface CallAnalysis extends ConversationAnalysis {
  // Call-specific
  callMetrics: CallMetrics;
  speakerAnalysis: SpeakerAnalysis[];
  talkTracks: TalkTrack[];
  transcriptSegments: TranscriptSegment[];
}

export interface CallMetrics {
  duration: number; // seconds
  talkTime: { user: number; prospect: number };
  talkRatio: number; // user talk time / total
  silenceTime: number;
  interruptionCount: number;
  questionsAsked: number;
  questionsAnswered: number;
  objectionCount: number;
  monologueMax: number; // longest monologue in seconds
  pacing: 'slow' | 'moderate' | 'fast';
}

export interface SpeakerAnalysis {
  speaker: string;
  talkTime: number;
  talkPercentage: number;
  avgSentenceLength: number;
  questionsAsked: number;
  sentiment: SentimentType;
  emotions: EmotionDetection;
  keyPhrases: string[];
}

export interface TalkTrack {
  id: string;
  name: string;
  used: boolean;
  effectiveness: number;
  timing?: { start: number; end: number };
  feedback?: string;
}

export interface TranscriptSegment {
  id: string;
  speaker: string;
  text: string;
  startTime: number;
  endTime: number;
  sentiment: SentimentType;
  highlights?: TranscriptHighlight[];
}

export interface TranscriptHighlight {
  type: 'objection' | 'buying_signal' | 'question' | 'commitment' | 'risk';
  text: string;
  start: number;
  end: number;
  notes?: string;
}

// ============================================
// Team Analytics Types
// ============================================

export interface TeamConversationAnalytics {
  tenantId: string;
  period: { start: string; end: string };

  // Volume
  totalConversations: number;
  byType: Record<ConversationType, number>;
  byUser: UserConversationStats[];

  // Quality
  avgQualityScore: number;
  avgSentiment: number;
  avgEngagement: number;

  // Performance
  avgResponseTime: number;
  resolutionRate: number;
  escalationRate: number;

  // Insights
  topTopics: TopicDetection[];
  commonObjections: string[];
  winningPatterns: string[];
  improvementAreas: string[];

  // Trends
  trends: ConversationTrend[];
}

export interface UserConversationStats {
  userId: string;
  userName: string;
  conversationCount: number;
  avgQuality: number;
  avgSentiment: number;
  avgResponseTime: number;
  skills: Record<SalesSkill, number>;
  rank: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface ConversationTrend {
  metric: string;
  dataPoints: Array<{ date: string; value: number }>;
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
}

// ============================================
// Configuration Types
// ============================================

export interface ConversationIntelligenceConfig {
  tenantId: string;

  // Analysis settings
  enableSentimentAnalysis: boolean;
  enableTopicExtraction: boolean;
  enableEntityExtraction: boolean;
  enableCoaching: boolean;

  // Thresholds
  minConfidence: number;
  sentimentThreshold: number;

  // Integrations
  emailSyncEnabled: boolean;
  callRecordingEnabled: boolean;
  transcriptionEnabled: boolean;

  // Coaching
  coachingFrequency: 'daily' | 'weekly' | 'monthly';
  coachingAutoAssign: boolean;

  // Privacy
  anonymizeData: boolean;
  retentionDays: number;

  updatedAt: string;
}

// ============================================
// Export Labels & Constants
// ============================================

export const CONVERSATION_TYPE_LABELS: Record<ConversationType, string> = {
  email: 'Email',
  call: 'Llamada',
  meeting: 'Reunión',
  chat: 'Chat',
  note: 'Nota',
};

export const SENTIMENT_TYPE_LABELS: Record<SentimentType, string> = {
  positive: 'Positivo',
  negative: 'Negativo',
  neutral: 'Neutral',
  mixed: 'Mixto',
};

export const INTENT_CATEGORY_LABELS: Record<IntentCategory, string> = {
  purchase: 'Compra',
  inquiry: 'Consulta',
  support: 'Soporte',
  complaint: 'Queja',
  feedback: 'Feedback',
  cancellation: 'Cancelación',
  renewal: 'Renovación',
  upsell: 'Upsell',
  referral: 'Referido',
  scheduling: 'Agendamiento',
  negotiation: 'Negociación',
  other: 'Otro',
};

export const SALES_SKILL_LABELS: Record<SalesSkill, string> = {
  discovery: 'Descubrimiento',
  objection_handling: 'Manejo de Objeciones',
  closing: 'Cierre',
  rapport_building: 'Construcción de Rapport',
  active_listening: 'Escucha Activa',
  value_articulation: 'Articulación de Valor',
  negotiation: 'Negociación',
  time_management: 'Gestión del Tiempo',
  follow_up: 'Seguimiento',
  product_knowledge: 'Conocimiento de Producto',
};

export const URGENCY_LEVEL_LABELS: Record<UrgencyLevel, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};
