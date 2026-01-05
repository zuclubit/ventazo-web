// ============================================
// FASE 6.3 — Conversation Intelligence Engine
// Core conversation analysis and coaching logic
// ============================================

import type {
  ConversationAnalysis,
  SentimentAnalysis,
  SentimentType,
  EmotionDetection,
  IntentDetection,
  IntentCategory,
  TopicDetection,
  ActionItem,
  ConversationSignal,
  ConversationInsight,
  InsightType,
  ConversationRecommendation,
  CoachingSession,
  CoachingFeedback,
  CoachingRecommendation,
  SkillAssessment,
  SalesSkill,
  ConversationType,
  KeywordExtraction,
  EntityExtraction,
  MentionExtraction,
  EngagementMetrics,
  QualityMetrics,
  Question,
  Commitment,
  RiskIndicator,
  OpportunityIndicator,
} from './types';

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// Sentiment Analysis Engine
// ============================================

const sentimentKeywords: Record<SentimentType, string[]> = {
  positive: [
    'excelente', 'perfecto', 'genial', 'fantástico', 'increíble', 'maravilloso',
    'gracias', 'encantado', 'satisfecho', 'feliz', 'contento', 'impresionado',
    'great', 'excellent', 'amazing', 'wonderful', 'perfect', 'love', 'happy',
  ],
  negative: [
    'terrible', 'horrible', 'malo', 'pésimo', 'decepcionado', 'frustrado',
    'molesto', 'enojado', 'problema', 'error', 'falla', 'queja', 'cancelar',
    'bad', 'terrible', 'awful', 'disappointed', 'frustrated', 'angry', 'cancel',
  ],
  neutral: [
    'ok', 'bien', 'normal', 'regular', 'aceptable', 'entendido', 'información',
    'okay', 'fine', 'alright', 'understood', 'information', 'question',
  ],
  mixed: [],
};

export function analyzeSentiment(text: string): SentimentAnalysis {
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  let positiveCount = 0;
  let negativeCount = 0;
  let neutralCount = 0;

  for (const word of words) {
    if (sentimentKeywords.positive.some(kw => word.includes(kw))) positiveCount++;
    if (sentimentKeywords.negative.some(kw => word.includes(kw))) negativeCount++;
    if (sentimentKeywords.neutral.some(kw => word.includes(kw))) neutralCount++;
  }

  const total = positiveCount + negativeCount + neutralCount || 1;
  const positiveScore = positiveCount / total;
  const negativeScore = negativeCount / total;
  const neutralScore = 1 - positiveScore - negativeScore;

  // Determine overall sentiment
  let overall: SentimentType;
  let score: number;

  if (positiveScore > 0.5) {
    overall = 'positive';
    score = 0.5 + positiveScore * 0.5;
  } else if (negativeScore > 0.5) {
    overall = 'negative';
    score = -(0.5 + negativeScore * 0.5);
  } else if (positiveScore > 0.2 && negativeScore > 0.2) {
    overall = 'mixed';
    score = 0;
  } else {
    overall = 'neutral';
    score = 0;
  }

  // Calculate confidence based on keyword matches
  const confidence = Math.min(0.95, 0.6 + (positiveCount + negativeCount) * 0.05);

  // Detect emotions
  const emotions: EmotionDetection = {
    joy: positiveScore * 0.8,
    trust: positiveScore * 0.6,
    anticipation: 0.3,
    surprise: 0.1,
    sadness: negativeScore * 0.5,
    fear: negativeScore * 0.3,
    anger: negativeScore * 0.7,
    disgust: negativeScore * 0.4,
    dominant: positiveScore > negativeScore ? 'joy' : negativeScore > 0.3 ? 'anger' : 'neutral',
  };

  return {
    overall,
    score,
    confidence,
    positive: positiveScore,
    negative: negativeScore,
    neutral: neutralScore,
    emotions,
  };
}

// ============================================
// Intent Detection Engine
// ============================================

const intentPatterns: Record<IntentCategory, RegExp[]> = {
  purchase: [/comprar/i, /adquirir/i, /precio/i, /cotización/i, /buy/i, /purchase/i, /pricing/i],
  support: [/ayuda/i, /soporte/i, /problema/i, /error/i, /help/i, /support/i, /issue/i],
  inquiry: [/información/i, /pregunta/i, /cómo/i, /qué es/i, /question/i, /what is/i, /how/i],
  complaint: [/queja/i, /reclamo/i, /insatisfecho/i, /complaint/i, /unsatisfied/i],
  feedback: [/sugerencia/i, /opinión/i, /feedback/i, /suggestion/i],
  cancellation: [/cancelar/i, /baja/i, /terminar/i, /cancel/i, /terminate/i],
  renewal: [/renovar/i, /extender/i, /renew/i, /extend/i],
  upsell: [/upgrade/i, /mejorar/i, /ampliar/i, /increase/i],
  referral: [/recomendar/i, /referir/i, /recommend/i, /refer/i],
  scheduling: [/reunión/i, /agenda/i, /meeting/i, /schedule/i, /appointment/i],
  negotiation: [/negociar/i, /descuento/i, /oferta/i, /negotiate/i, /discount/i],
  other: [],
};

export function detectIntents(text: string): IntentDetection[] {
  const intents: IntentDetection[] = [];
  const lowerText = text.toLowerCase();

  for (const [category, patterns] of Object.entries(intentPatterns)) {
    if (category === 'other') continue;

    const matches = patterns.filter(pattern => pattern.test(lowerText));
    if (matches.length > 0) {
      const confidence = Math.min(0.95, 0.6 + matches.length * 0.1);
      intents.push({
        intent: category,
        confidence,
        category: category as IntentCategory,
        evidence: extractContext(text, matches[0]!),
      });
    }
  }

  return intents.sort((a, b) => b.confidence - a.confidence);
}

function extractContext(text: string, pattern: RegExp): string {
  const match = text.match(new RegExp(`.{0,50}${pattern.source}.{0,50}`, 'i'));
  return match ? match[0]!.trim() : '';
}

// ============================================
// Topic Detection Engine
// ============================================

const topicKeywords: Record<string, string[]> = {
  producto: ['producto', 'servicio', 'funcionalidad', 'característica', 'product', 'feature'],
  precios: ['precio', 'costo', 'tarifa', 'plan', 'price', 'cost', 'pricing'],
  técnico: ['técnico', 'integración', 'api', 'error', 'technical', 'integration'],
  facturación: ['factura', 'pago', 'cobro', 'invoice', 'payment', 'billing'],
  contrato: ['contrato', 'acuerdo', 'términos', 'contract', 'agreement', 'terms'],
  soporte: ['soporte', 'ayuda', 'ticket', 'support', 'help'],
};

export function detectTopics(text: string): TopicDetection[] {
  const topics: TopicDetection[] = [];
  const lowerText = text.toLowerCase();
  const words = lowerText.split(/\s+/);

  for (const [topic, keywords] of Object.entries(topicKeywords)) {
    const matches = keywords.filter(kw => words.some(w => w.includes(kw)));
    if (matches.length > 0) {
      const relevance = Math.min(1, matches.length * 0.3);
      topics.push({
        topic,
        confidence: Math.min(0.95, 0.6 + matches.length * 0.1),
        relevance,
        mentions: matches.length,
        segments: matches,
      });
    }
  }

  return topics.sort((a, b) => b.relevance - a.relevance);
}

// ============================================
// Action Item Extraction
// ============================================

export function extractActionItems(text: string, participants: string[]): ActionItem[] {
  const actionItems: ActionItem[] = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim());

  const actionPatterns = [
    /(?:voy a|vamos a|necesito|hay que|debemos|tengo que)/i,
    /(?:will|going to|need to|have to|must|should)/i,
    /(?:enviar|llamar|revisar|preparar|programar|confirmar)/i,
    /(?:send|call|review|prepare|schedule|confirm)/i,
  ];

  for (const sentence of sentences) {
    const isAction = actionPatterns.some(pattern => pattern.test(sentence));
    if (isAction && sentence.length > 10) {
      // Try to extract due date
      const dateMatch = sentence.match(/(?:mañana|próxima semana|lunes|martes|miércoles|jueves|viernes|tomorrow|next week|monday|tuesday|wednesday|thursday|friday)/i);

      let dueDate: string | undefined;
      if (dateMatch) {
        const now = new Date();
        if (/mañana|tomorrow/i.test(dateMatch[0])) {
          now.setDate(now.getDate() + 1);
        } else if (/próxima semana|next week/i.test(dateMatch[0])) {
          now.setDate(now.getDate() + 7);
        }
        dueDate = now.toISOString();
      }

      actionItems.push({
        id: generateId(),
        text: sentence.trim(),
        assignee: participants[0],
        dueDate,
        priority: /urgent|urgente|asap|hoy|today/i.test(sentence) ? 'high' : 'medium',
        status: 'pending',
        source: sentence.trim(),
        confidence: 0.7,
      });
    }
  }

  return actionItems;
}

// ============================================
// Signal Detection
// ============================================

export function detectSignals(
  text: string,
  sentiment: SentimentAnalysis,
  intents: IntentDetection[]
): ConversationSignal[] {
  const signals: ConversationSignal[] = [];

  // Buying signals
  if (intents.some(i => i.category === 'purchase')) {
    signals.push({
      type: 'buying',
      signal: 'Interés de compra detectado',
      strength: 'strong',
      evidence: 'Cliente muestra intención de adquirir',
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    });
  }

  // Risk signals (churn)
  if (intents.some(i => i.category === 'cancellation') || sentiment.overall === 'negative') {
    signals.push({
      type: 'risk',
      signal: 'Riesgo de cancelación',
      strength: sentiment.overall === 'negative' ? 'strong' : 'moderate',
      evidence: 'Cliente expresa insatisfacción o intención de cancelar',
      confidence: 0.7,
      timestamp: new Date().toISOString(),
    });
  }

  // Opportunity signals (upsell)
  if (intents.some(i => i.category === 'upsell')) {
    signals.push({
      type: 'opportunity',
      signal: 'Oportunidad de upsell',
      strength: 'moderate',
      evidence: 'Cliente interesado en más funcionalidades',
      confidence: 0.6,
      timestamp: new Date().toISOString(),
    });
  }

  // Objection signals
  if (text.match(/pero|sin embargo|caro|expensive|but|however/i)) {
    signals.push({
      type: 'objection',
      signal: 'Objeción detectada',
      strength: 'moderate',
      evidence: 'Cliente presenta resistencia o preocupaciones',
      confidence: 0.7,
      timestamp: new Date().toISOString(),
    });
  }

  // Urgency signals
  if (text.match(/urgente|urgent|asap|pronto|rápido|quick/i)) {
    signals.push({
      type: 'urgency',
      signal: 'Urgencia detectada',
      strength: 'strong',
      evidence: 'Cliente indica necesidad inmediata',
      confidence: 0.8,
      timestamp: new Date().toISOString(),
    });
  }

  return signals;
}

// ============================================
// Insight Generation
// ============================================

export function generateInsights(
  sentiment: SentimentAnalysis,
  intents: IntentDetection[],
  topics: TopicDetection[],
  signals: ConversationSignal[]
): ConversationInsight[] {
  const insights: ConversationInsight[] = [];

  // Sentiment insight
  insights.push({
    id: generateId(),
    type: 'behavior',
    title: `Sentimiento ${sentiment.overall === 'positive' ? 'positivo' : sentiment.overall === 'negative' ? 'negativo' : 'neutral'}`,
    description: `El tono general de la conversación es ${sentiment.overall}. Emoción dominante: ${sentiment.emotions?.dominant || 'neutral'}`,
    importance: sentiment.overall === 'negative' ? 'high' : 'medium',
    confidence: sentiment.confidence,
    evidence: [],
  });

  // Intent insight
  if (intents.length > 0) {
    const primaryIntent = intents[0]!;
    insights.push({
      id: generateId(),
      type: 'pattern',
      title: `Intención principal: ${formatIntent(primaryIntent.category)}`,
      description: `El cliente muestra intención de ${formatIntent(primaryIntent.category).toLowerCase()}`,
      importance: ['purchase', 'cancellation'].includes(primaryIntent.category) ? 'high' : 'medium',
      confidence: primaryIntent.confidence,
    });
  }

  // Topic insight
  if (topics.length > 0) {
    const topTopics = topics.slice(0, 3).map(t => formatTopic(t.topic));
    insights.push({
      id: generateId(),
      type: 'trend',
      title: 'Temas principales',
      description: `La conversación se centra en: ${topTopics.join(', ')}`,
      importance: 'low',
      confidence: topics[0]?.confidence || 0.5,
    });
  }

  // Signal-based insights
  const buyingSignal = signals.find(s => s.type === 'buying');
  if (buyingSignal) {
    insights.push({
      id: generateId(),
      type: 'opportunity',
      title: 'Señal de compra detectada',
      description: 'El cliente muestra interés activo en realizar una compra',
      importance: 'high',
      confidence: buyingSignal.confidence,
    });
  }

  const riskSignal = signals.find(s => s.type === 'risk');
  if (riskSignal) {
    insights.push({
      id: generateId(),
      type: 'risk',
      title: 'Riesgo identificado',
      description: 'El cliente muestra señales de posible cancelación',
      importance: 'high',
      confidence: riskSignal.confidence,
    });
  }

  return insights;
}

export function formatIntent(intent: IntentCategory): string {
  const labels: Record<IntentCategory, string> = {
    purchase: 'Compra',
    support: 'Soporte',
    inquiry: 'Consulta',
    complaint: 'Queja',
    feedback: 'Feedback',
    cancellation: 'Cancelación',
    renewal: 'Renovación',
    upsell: 'Upgrade',
    referral: 'Referencia',
    scheduling: 'Agendamiento',
    negotiation: 'Negociación',
    other: 'Otro',
  };
  return labels[intent] || intent;
}

export function formatTopic(topic: string): string {
  const labels: Record<string, string> = {
    producto: 'Producto',
    precios: 'Precios',
    técnico: 'Técnico',
    facturación: 'Facturación',
    contrato: 'Contrato',
    soporte: 'Soporte',
  };
  return labels[topic] || topic;
}

// ============================================
// Recommendation Generation
// ============================================

export function generateRecommendations(
  sentiment: SentimentAnalysis,
  intents: IntentDetection[],
  signals: ConversationSignal[]
): ConversationRecommendation[] {
  const recommendations: ConversationRecommendation[] = [];

  // Based on sentiment
  if (sentiment.overall === 'negative') {
    recommendations.push({
      id: generateId(),
      action: 'Escalar a supervisor',
      reasoning: 'Sentimiento negativo detectado - requiere atención inmediata',
      priority: 'high',
      category: 'escalation',
      expectedOutcome: 'Reducir riesgo de churn y mejorar satisfacción',
      automatable: false,
    });
  }

  // Based on intents
  const primaryIntent = intents[0];
  if (primaryIntent) {
    switch (primaryIntent.category) {
      case 'purchase':
        recommendations.push({
          id: generateId(),
          action: 'Proceder con cierre',
          reasoning: 'Cliente muestra señales claras de compra',
          priority: 'high',
          category: 'follow_up',
          expectedOutcome: 'Alta probabilidad de conversión',
          automatable: false,
        });
        break;
      case 'cancellation':
        recommendations.push({
          id: generateId(),
          action: 'Activar protocolo de retención',
          reasoning: 'Cliente indica intención de cancelar',
          priority: 'urgent',
          category: 'escalation',
          expectedOutcome: 'Prevenir churn',
          automatable: true,
        });
        break;
      case 'upsell':
        recommendations.push({
          id: generateId(),
          action: 'Presentar opciones de upgrade',
          reasoning: 'Cliente interesado en expandir',
          priority: 'medium',
          category: 'follow_up',
          expectedOutcome: 'Incrementar valor del cliente',
          automatable: false,
        });
        break;
    }
  }

  // Add follow-up recommendation
  recommendations.push({
    id: generateId(),
    action: 'Programar seguimiento',
    reasoning: 'Mantener momentum de la conversación',
    priority: 'low',
    category: 'follow_up',
    expectedOutcome: 'Continuar relación con el cliente',
    automatable: true,
  });

  return recommendations;
}

// ============================================
// Full Conversation Analysis
// ============================================

export interface AnalyzeConversationParams {
  tenantId: string;
  conversationId?: string;
  type?: ConversationType;
  content: string;
  participants: string[];
  metadata?: Record<string, unknown>;
}

export function analyzeConversation(params: AnalyzeConversationParams): ConversationAnalysis {
  const { tenantId, conversationId, content, participants } = params;

  // Run all analysis components
  const sentiment = analyzeSentiment(content);
  const intents = detectIntents(content);
  const topics = detectTopics(content);
  const signals = detectSignals(content, sentiment, intents);
  const actionItems = extractActionItems(content, participants);
  const insights = generateInsights(sentiment, intents, topics, signals);
  const recommendations = generateRecommendations(sentiment, intents, signals);

  // Extract keywords
  const keywords = extractKeywords(content);

  // Extract entities
  const entities = extractEntities(content);

  // Generate engagement metrics
  const engagement = generateEngagementMetrics(content);

  // Generate quality metrics
  const quality = generateQualityMetrics(content, sentiment);

  return {
    id: generateId(),
    tenantId,
    conversationId: conversationId || generateId(),
    sentiment,
    intents,
    topics,
    keywords,
    entities,
    mentions: [],
    engagement,
    quality,
    actionItems,
    questions: extractQuestions(content),
    commitments: [],
    signals,
    riskIndicators: generateRiskIndicators(sentiment, signals),
    opportunityIndicators: generateOpportunityIndicators(signals),
    insights,
    recommendations,
    analyzedAt: new Date().toISOString(),
    confidence: calculateOverallConfidence(sentiment, intents, topics),
    modelVersion: '1.0.0',
  };
}

function extractKeywords(text: string): KeywordExtraction[] {
  const words = text.toLowerCase()
    .replace(/[^\w\sáéíóúñ]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 4);

  const frequency: Record<string, number> = {};
  for (const word of words) {
    frequency[word] = (frequency[word] || 0) + 1;
  }

  return Object.entries(frequency)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword, freq]) => ({
      keyword,
      frequency: freq,
      relevance: Math.min(1, freq / 5),
    }));
}

function extractEntities(text: string): EntityExtraction[] {
  const entities: EntityExtraction[] = [];

  // Extract emails
  const emails = text.match(/[\w.-]+@[\w.-]+\.\w+/g);
  if (emails) {
    for (const email of emails) {
      entities.push({ type: 'email', value: email, confidence: 0.95 });
    }
  }

  // Extract prices
  const prices = text.match(/\$[\d,]+(\.\d{2})?/g);
  if (prices) {
    for (const price of prices) {
      entities.push({ type: 'price', value: price, confidence: 0.9 });
    }
  }

  // Extract dates
  const dates = text.match(/\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}/g);
  if (dates) {
    for (const date of dates) {
      entities.push({ type: 'date', value: date, confidence: 0.85 });
    }
  }

  return entities;
}

function extractQuestions(text: string): Question[] {
  const sentences = text.split(/[.!]+/).filter(s => s.includes('?'));
  return sentences.map(q => ({
    id: generateId(),
    text: q.trim(),
    askedBy: 'unknown',
    answered: false,
    importance: 'medium' as const,
  }));
}

function generateEngagementMetrics(text: string): EngagementMetrics {
  const wordCount = text.split(/\s+/).length;
  const questionCount = (text.match(/\?/g) || []).length;

  return {
    score: Math.min(100, wordCount / 5 + questionCount * 10),
    level: wordCount > 200 ? 'high' : wordCount > 50 ? 'medium' : 'low',
    responseRate: 0.8,
    avgResponseTime: 300,
    questionCount,
    interactionCount: Math.ceil(wordCount / 50),
    depth: Math.min(1, wordCount / 500),
    relevance: 0.7,
    personalization: 0.5,
  };
}

function generateQualityMetrics(text: string, sentiment: SentimentAnalysis): QualityMetrics {
  const score = 70 + (sentiment.positive * 20) - (sentiment.negative * 30);

  return {
    score: Math.max(0, Math.min(100, score)),
    grade: score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F',
    clarity: 0.7,
    professionalism: 0.8,
    responsiveness: 0.75,
    helpfulness: 0.7,
    completeness: 0.65,
    issues: [],
  };
}

function generateRiskIndicators(sentiment: SentimentAnalysis, signals: ConversationSignal[]): RiskIndicator[] {
  const indicators: RiskIndicator[] = [];

  if (sentiment.overall === 'negative') {
    indicators.push({
      type: 'negative_sentiment',
      severity: sentiment.negative > 0.7 ? 'high' : 'medium',
      description: 'Sentimiento negativo detectado en la conversación',
      evidence: 'Análisis de sentimiento',
    });
  }

  const riskSignal = signals.find(s => s.type === 'risk');
  if (riskSignal) {
    indicators.push({
      type: 'churn_risk',
      severity: riskSignal.strength === 'strong' ? 'critical' : 'high',
      description: riskSignal.signal,
      evidence: riskSignal.evidence,
    });
  }

  return indicators;
}

function generateOpportunityIndicators(signals: ConversationSignal[]): OpportunityIndicator[] {
  const indicators: OpportunityIndicator[] = [];

  const buyingSignal = signals.find(s => s.type === 'buying');
  if (buyingSignal) {
    indicators.push({
      type: 'purchase_intent',
      potential: buyingSignal.strength === 'strong' ? 'high' : 'medium',
      description: buyingSignal.signal,
      evidence: buyingSignal.evidence,
      nextStep: 'Proceder con propuesta comercial',
    });
  }

  const opportunitySignal = signals.find(s => s.type === 'opportunity');
  if (opportunitySignal) {
    indicators.push({
      type: 'upsell',
      potential: opportunitySignal.strength === 'strong' ? 'high' : 'medium',
      description: opportunitySignal.signal,
      evidence: opportunitySignal.evidence,
      nextStep: 'Presentar opciones de upgrade',
    });
  }

  return indicators;
}

function calculateOverallConfidence(
  sentiment: SentimentAnalysis,
  intents: IntentDetection[],
  topics: TopicDetection[]
): number {
  const sentimentConf = sentiment.confidence;
  const intentConf = intents.length > 0 ? Math.max(...intents.map(i => i.confidence)) : 0.5;
  const topicConf = topics.length > 0 ? Math.max(...topics.map(t => t.confidence)) : 0.5;

  return (sentimentConf * 0.4 + intentConf * 0.35 + topicConf * 0.25);
}

// ============================================
// Coaching Engine (Simplified)
// ============================================

export interface CreateCoachingSessionParams {
  tenantId: string;
  userId: string;
  agentId?: string; // Alias for userId, used for compatibility
  conversationIds: string[];
  analyses: ConversationAnalysis[];
}

// Extended CoachingSession with agentId for hook compatibility
export interface CoachingSessionExtended extends CoachingSession {
  agentId: string;
  metrics: Array<{ name: string; score: number }>;
}

export function createCoachingSession(params: CreateCoachingSessionParams): CoachingSessionExtended {
  const { tenantId, userId, agentId, conversationIds, analyses } = params;

  // Calculate metrics from analyses
  const skills = calculateSkillAssessments(analyses);
  const strengths = generateStrengths(analyses);
  const improvements = generateImprovements(analyses);
  const recommendations = generateCoachingRecommendations(skills);

  // Calculate overall score
  const overallScore = skills.reduce((sum, s) => sum + s.score, 0) / skills.length;

  // Generate metrics from skills for hook compatibility
  const metrics = skills.map(s => ({
    name: formatSkill(s.skill),
    score: s.score,
  }));

  return {
    id: generateId(),
    tenantId,
    userId,
    agentId: agentId || userId, // Add agentId for hook compatibility
    conversationIds,
    period: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      end: new Date().toISOString(),
    },
    overallScore,
    grade: overallScore >= 90 ? 'A' : overallScore >= 80 ? 'B' : overallScore >= 70 ? 'C' : overallScore >= 60 ? 'D' : 'F',
    trend: 'stable',
    skills,
    strengths,
    improvements,
    recommendations,
    exercises: [],
    metrics, // Add metrics for hook compatibility
    createdAt: new Date().toISOString(),
  };
}

function calculateSkillAssessments(analyses: ConversationAnalysis[]): SkillAssessment[] {
  const skills: SalesSkill[] = [
    'discovery',
    'objection_handling',
    'closing',
    'rapport_building',
    'active_listening',
  ];

  return skills.map(skill => {
    // Calculate score based on analyses
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidence, 0) / analyses.length;
    const score = Math.round(50 + avgConfidence * 50);

    return {
      skill,
      score,
      benchmark: 75,
      trend: score >= 75 ? 'improving' as const : 'stable' as const,
      examples: [],
    };
  });
}

function generateStrengths(analyses: ConversationAnalysis[]): CoachingFeedback[] {
  const strengths: CoachingFeedback[] = [];

  const positiveCount = analyses.filter(a => a.sentiment.overall === 'positive').length;
  if (positiveCount > analyses.length * 0.5) {
    strengths.push({
      category: 'communication',
      feedback: 'Excelente manejo del tono positivo en conversaciones',
      examples: ['Más del 50% de las conversaciones mantienen tono positivo'],
      impact: 'high',
    });
  }

  return strengths;
}

function generateImprovements(analyses: ConversationAnalysis[]): CoachingFeedback[] {
  const improvements: CoachingFeedback[] = [];

  const negativeCount = analyses.filter(a => a.sentiment.overall === 'negative').length;
  if (negativeCount > 0) {
    improvements.push({
      category: 'objection_handling',
      feedback: 'Oportunidad de mejora en manejo de situaciones difíciles',
      examples: [`${negativeCount} conversación(es) con sentimiento negativo detectado`],
      impact: 'medium',
    });
  }

  return improvements;
}

function generateCoachingRecommendations(skills: SkillAssessment[]): CoachingRecommendation[] {
  const recommendations: CoachingRecommendation[] = [];

  for (const skill of skills) {
    if (skill.score < skill.benchmark) {
      recommendations.push({
        id: generateId(),
        type: 'technique',
        title: `Mejorar ${formatSkill(skill.skill)}`,
        description: `El score actual (${skill.score}) está por debajo del benchmark (${skill.benchmark})`,
        priority: skill.score < skill.benchmark - 20 ? 'high' : 'medium',
        expectedOutcome: `+${skill.benchmark - skill.score} puntos en ${formatSkill(skill.skill)}`,
      });
    }
  }

  return recommendations;
}

function formatSkill(skill: SalesSkill): string {
  const labels: Record<SalesSkill, string> = {
    discovery: 'Descubrimiento',
    objection_handling: 'Manejo de Objeciones',
    closing: 'Cierre',
    rapport_building: 'Construcción de Rapport',
    active_listening: 'Escucha Activa',
    value_articulation: 'Articulación de Valor',
    negotiation: 'Negociación',
    time_management: 'Gestión del Tiempo',
    follow_up: 'Seguimiento',
    product_knowledge: 'Conocimiento del Producto',
  };
  return labels[skill] || skill;
}

// ============================================
// Email Thread Analysis
// ============================================

export interface EmailMessage {
  id: string;
  from: string;
  to: string[];
  subject: string;
  body: string;
  timestamp: string;
}

export interface AnalyzeEmailThreadParams {
  tenantId: string;
  threadId?: string;
  messages: EmailMessage[];
  metadata?: Record<string, unknown>;
}

export interface EmailThread {
  id: string;
  tenantId: string;
  threadId: string;
  messages: EmailMessage[];
  analysis: ConversationAnalysis;
  summary: string;
  participantSentiments: Array<{ participant: string; sentiment: SentimentType }>;
  keyDecisions: string[];
  pendingActions: ActionItem[];
  createdAt: string;
}

export function analyzeEmailThread(params: AnalyzeEmailThreadParams): EmailThread {
  const { tenantId, threadId, messages, metadata } = params;

  // Combine all message bodies for analysis
  const combinedContent = messages.map(m => `From: ${m.from}\n${m.body}`).join('\n\n---\n\n');
  const participants = Array.from(new Set(messages.flatMap(m => [m.from, ...m.to])));

  // Perform analysis on combined content
  const analysis = analyzeConversation({
    tenantId,
    conversationId: threadId,
    type: 'email',
    content: combinedContent,
    participants,
    metadata,
  });

  // Calculate participant sentiments
  const participantSentiments = participants.map(participant => {
    const participantMessages = messages.filter(m => m.from === participant);
    const combinedParticipantContent = participantMessages.map(m => m.body).join(' ');
    const sentiment = analyzeSentiment(combinedParticipantContent);
    return { participant, sentiment: sentiment.overall };
  });

  // Extract key decisions (simplified)
  const keyDecisions = analysis.actionItems
    .filter(a => a.priority === 'high')
    .map(a => a.text);

  return {
    id: generateId(),
    tenantId,
    threadId: threadId || generateId(),
    messages,
    analysis,
    summary: generateThreadSummary(messages, analysis),
    participantSentiments,
    keyDecisions,
    pendingActions: analysis.actionItems.filter(a => a.status === 'pending'),
    createdAt: new Date().toISOString(),
  };
}

function generateThreadSummary(messages: EmailMessage[], analysis: ConversationAnalysis): string {
  const participantCount = Array.from(new Set(messages.flatMap(m => [m.from, ...m.to]))).length;
  const messageCount = messages.length;
  const topTopic = analysis.topics[0]?.topic || 'general';
  const sentiment = analysis.sentiment.overall;

  return `Hilo de ${messageCount} mensaje(s) entre ${participantCount} participante(s). ` +
    `Tema principal: ${formatTopic(topTopic)}. ` +
    `Tono general: ${sentiment}. ` +
    `${analysis.actionItems.length} acción(es) identificada(s).`;
}

// ============================================
// Call Analysis
// ============================================

export interface AnalyzeCallParams {
  tenantId: string;
  callId?: string;
  transcript: string;
  duration: number; // seconds
  participants: string[];
  metadata?: Record<string, unknown>;
}

export interface CallAnalysisResult {
  id: string;
  tenantId: string;
  callId: string;
  duration: number;
  analysis: ConversationAnalysis;
  talkRatio: { user: number; prospect: number };
  keyMoments: Array<{ timestamp: number; type: string; description: string }>;
  objections: string[];
  followUpItems: ActionItem[];
  createdAt: string;
}

export function analyzeCall(params: AnalyzeCallParams): CallAnalysisResult {
  const { tenantId, callId, transcript, duration, participants, metadata } = params;

  // Perform base analysis
  const analysis = analyzeConversation({
    tenantId,
    conversationId: callId,
    type: 'call',
    content: transcript,
    participants,
    metadata,
  });

  // Calculate talk ratio (simplified - would need speaker diarization for real implementation)
  const lines = transcript.split('\n').filter(l => l.trim());
  const speakerLines: Record<string, number> = {};
  for (const line of lines) {
    const speaker = line.match(/^([^:]+):/)?.[1] || 'unknown';
    speakerLines[speaker] = (speakerLines[speaker] || 0) + 1;
  }
  const totalLines = lines.length || 1;
  const userLines = speakerLines[participants[0] || 'agent'] || totalLines / 2;
  const prospectLines = totalLines - userLines;

  // Extract objections
  const objections = analysis.signals
    .filter(s => s.type === 'objection')
    .map(s => s.evidence);

  // Generate key moments (simplified)
  const keyMoments: Array<{ timestamp: number; type: string; description: string }> = [];
  if (analysis.signals.some(s => s.type === 'buying')) {
    keyMoments.push({
      timestamp: Math.floor(duration * 0.7),
      type: 'buying_signal',
      description: 'Señal de compra detectada',
    });
  }
  if (analysis.signals.some(s => s.type === 'objection')) {
    keyMoments.push({
      timestamp: Math.floor(duration * 0.4),
      type: 'objection',
      description: 'Objeción del cliente',
    });
  }

  return {
    id: generateId(),
    tenantId,
    callId: callId || generateId(),
    duration,
    analysis,
    talkRatio: {
      user: userLines / totalLines,
      prospect: prospectLines / totalLines,
    },
    keyMoments,
    objections,
    followUpItems: analysis.actionItems,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// Conversation Summary
// ============================================

export interface ConversationSummary {
  conversationId: string;
  type: ConversationType;
  summary: string;
  keyPoints: string[];
  sentiment: SentimentType;
  actionRequired: boolean;
  nextSteps: string[];
  generatedAt: string;
}

export function generateConversationSummary(analysis: ConversationAnalysis): ConversationSummary {
  const keyPoints: string[] = [];

  // Add sentiment point
  keyPoints.push(`Tono general ${analysis.sentiment.overall}`);

  // Add main intents
  for (const intent of analysis.intents.slice(0, 2)) {
    keyPoints.push(`Intención: ${formatIntent(intent.category)}`);
  }

  // Add main topics
  for (const topic of analysis.topics.slice(0, 2)) {
    keyPoints.push(`Tema: ${formatTopic(topic.topic)}`);
  }

  // Add signals
  for (const signal of analysis.signals) {
    if (signal.strength === 'strong') {
      keyPoints.push(`Señal ${signal.type}: ${signal.signal}`);
    }
  }

  // Determine if action is required
  const actionRequired = analysis.actionItems.some(a => a.priority === 'high') ||
    analysis.signals.some(s => s.type === 'risk' && s.strength === 'strong');

  // Generate next steps
  const nextSteps = analysis.recommendations
    .filter(r => r.priority === 'high' || r.priority === 'urgent')
    .map(r => r.action);

  // Generate summary text
  const summary = generateSummaryText(analysis);

  return {
    conversationId: analysis.conversationId,
    type: 'email', // Default, could be passed from analysis
    summary,
    keyPoints,
    sentiment: analysis.sentiment.overall,
    actionRequired,
    nextSteps: nextSteps.length > 0 ? nextSteps : ['Continuar seguimiento regular'],
    generatedAt: new Date().toISOString(),
  };
}

function generateSummaryText(analysis: ConversationAnalysis): string {
  const parts: string[] = [];

  // Sentiment
  const sentimentText = analysis.sentiment.overall === 'positive' ? 'positiva' :
    analysis.sentiment.overall === 'negative' ? 'negativa' : 'neutral';
  parts.push(`Conversación con tono ${sentimentText}.`);

  // Main intent
  if (analysis.intents.length > 0) {
    parts.push(`El cliente muestra intención de ${formatIntent(analysis.intents[0]!.category).toLowerCase()}.`);
  }

  // Signals
  const buyingSignal = analysis.signals.find(s => s.type === 'buying');
  const riskSignal = analysis.signals.find(s => s.type === 'risk');
  if (buyingSignal) {
    parts.push(`Se detectaron señales de compra.`);
  }
  if (riskSignal) {
    parts.push(`Atención: se identificaron indicadores de riesgo.`);
  }

  // Action items
  if (analysis.actionItems.length > 0) {
    parts.push(`${analysis.actionItems.length} acción(es) pendiente(s) identificada(s).`);
  }

  return parts.join(' ');
}

// ============================================
// Export All
// ============================================

export { extractKeywords as extractKeyPhrases };
