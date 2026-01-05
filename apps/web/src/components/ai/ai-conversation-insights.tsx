'use client';

// ============================================
// FASE 6.3 — AI Conversation Insights UI
// Component for displaying conversation analysis
// ============================================

import * as React from 'react';

import {
  MessageSquare,
  Mail,
  Phone,
  ThumbsUp,
  ThumbsDown,
  Minus,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
  Activity,
  User,
  Lightbulb,
  RefreshCw,
  FileText,
  BarChart2,
  Zap,
  Heart,
  AlertTriangle,
} from 'lucide-react';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useAnalyzeConversation,
  formatIntent,
  formatTopic,
  type ConversationAnalysis,
  type SentimentAnalysis,
  type IntentDetection,
  type TopicDetection,
  type ActionItem,
  type ConversationSignal,
  type ConversationInsight,
  type ConversationRecommendation,
  type SentimentType,
  type ConversationType,
  type InsightType,
} from '@/lib/conversation-intelligence';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface AIConversationInsightsProps {
  analysis: ConversationAnalysis | null;
  onRefresh?: () => void;
  className?: string;
}

interface ConversationInputProps {
  tenantId: string;
  onAnalysisComplete?: (analysis: ConversationAnalysis) => void;
  className?: string;
}

// ============================================
// Helper Components
// ============================================

function SentimentIcon({ sentiment }: { sentiment: SentimentType }) {
  if (sentiment === 'positive') return <ThumbsUp className="h-4 w-4 text-green-500" />;
  if (sentiment === 'negative') return <ThumbsDown className="h-4 w-4 text-red-500" />;
  if (sentiment === 'mixed') return <Activity className="h-4 w-4 text-yellow-500" />;
  return <Minus className="h-4 w-4 text-gray-500" />;
}

function SentimentBadge({ sentiment, score }: { sentiment: SentimentType; score?: number }) {
  const colors: Record<SentimentType, string> = {
    positive: 'bg-green-100 text-green-800',
    negative: 'bg-red-100 text-red-800',
    neutral: 'bg-gray-100 text-gray-800',
    mixed: 'bg-yellow-100 text-yellow-800',
  };

  const labels: Record<SentimentType, string> = {
    positive: 'Positivo',
    negative: 'Negativo',
    neutral: 'Neutral',
    mixed: 'Mixto',
  };

  return (
    <Badge className={cn('gap-1', colors[sentiment])} variant="outline">
      <SentimentIcon sentiment={sentiment} />
      {labels[sentiment]}
      {score !== undefined && <span className="ml-1">{(score * 100).toFixed(0)}%</span>}
    </Badge>
  );
}

function SignalIcon({ type }: { type: ConversationSignal['type'] }) {
  switch (type) {
    case 'buying': return <Target className="h-4 w-4 text-green-500" />;
    case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />;
    case 'opportunity': return <TrendingUp className="h-4 w-4 text-blue-500" />;
    case 'objection': return <AlertCircle className="h-4 w-4 text-orange-500" />;
    case 'urgency': return <Zap className="h-4 w-4 text-red-500" />;
    default: return <Activity className="h-4 w-4 text-gray-500" />;
  }
}

function InsightIcon({ type }: { type: InsightType }) {
  switch (type) {
    case 'pattern': return <BarChart2 className="h-4 w-4" />;
    case 'anomaly': return <AlertTriangle className="h-4 w-4" />;
    case 'trend': return <TrendingUp className="h-4 w-4" />;
    case 'risk': return <AlertCircle className="h-4 w-4" />;
    case 'opportunity': return <Target className="h-4 w-4" />;
    case 'performance': return <Activity className="h-4 w-4" />;
    case 'behavior': return <Heart className="h-4 w-4" />;
    default: return <Lightbulb className="h-4 w-4" />;
  }
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-2">
            <Progress className="w-16 h-1.5" value={percentage} />
            <span className="text-xs text-muted-foreground">{percentage}%</span>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p>Confianza del análisis: {percentage}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Section Components
// ============================================

function SentimentSection({ sentiment }: { sentiment: SentimentAnalysis }) {
  // Convert sentiment breakdown to displayable scores
  const sentimentScores = [
    { label: 'Positivo', score: sentiment.positive },
    { label: 'Negativo', score: sentiment.negative },
    { label: 'Neutral', score: sentiment.neutral },
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Análisis de Sentimiento</CardTitle>
          <SentimentBadge score={Math.abs(sentiment.score)} sentiment={sentiment.overall} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sentiment Scores */}
        <div className="space-y-2">
          {sentimentScores.map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <span className="text-sm">{item.label}</span>
              <div className="flex items-center gap-2">
                <Progress className="w-24 h-2" value={item.score * 100} />
                <span className="text-xs text-muted-foreground w-10 text-right">
                  {(item.score * 100).toFixed(0)}%
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Emotions */}
        {sentiment.emotions && (
          <div>
            <p className="text-sm font-medium mb-2">Emociones Detectadas</p>
            <div className="flex flex-wrap gap-1">
              {sentiment.emotions.dominant && (
                <Badge className="text-xs" variant="secondary">
                  {sentiment.emotions.dominant}
                </Badge>
              )}
              {sentiment.emotions.joy > 0.3 && (
                <Badge className="text-xs" variant="outline">Alegría</Badge>
              )}
              {sentiment.emotions.trust > 0.3 && (
                <Badge className="text-xs" variant="outline">Confianza</Badge>
              )}
              {sentiment.emotions.anticipation > 0.3 && (
                <Badge className="text-xs" variant="outline">Anticipación</Badge>
              )}
              {sentiment.emotions.anger > 0.3 && (
                <Badge className="text-xs" variant="outline">Enojo</Badge>
              )}
              {sentiment.emotions.fear > 0.3 && (
                <Badge className="text-xs" variant="outline">Miedo</Badge>
              )}
              {sentiment.emotions.sadness > 0.3 && (
                <Badge className="text-xs" variant="outline">Tristeza</Badge>
              )}
            </div>
          </div>
        )}

        {/* Progression */}
        {sentiment.progression && sentiment.progression.length > 0 && (
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Progresión:</span>
            <div className="flex items-center gap-1">
              {sentiment.progression.map((p, idx) => (
                <div key={idx} className="flex items-center gap-1">
                  <SentimentIcon sentiment={p.sentiment} />
                  {idx < sentiment.progression!.length - 1 && (
                    <span className="text-muted-foreground">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntentsSection({ intents }: { intents: IntentDetection[] }) {
  if (intents.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Intenciones Detectadas</CardTitle>
        <CardDescription>
          {intents.length} intención(es) identificada(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {intents.map((intent, idx) => (
            <div key={idx} className="flex items-start justify-between p-3 bg-muted rounded-lg">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-primary" />
                  <span className="font-medium">{formatIntent(intent.category)}</span>
                </div>
                {intent.evidence && (
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    &quot;{intent.evidence}&quot;
                  </p>
                )}
                {intent.subIntent && (
                  <Badge className="text-xs" variant="outline">
                    {intent.subIntent}
                  </Badge>
                )}
              </div>
              <ConfidenceMeter confidence={intent.confidence} />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TopicsSection({ topics }: { topics: TopicDetection[] }) {
  if (topics.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Temas de Conversación</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {topics.map((topic, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{formatTopic(topic.topic)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="text-xs" variant="outline">
                  {topic.mentions} mención(es)
                </Badge>
                <Progress className="w-16 h-1.5" value={topic.relevance * 100} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function SignalsSection({ signals }: { signals: ConversationSignal[] }) {
  if (signals.length === 0) return null;

  // Sort by strength mapping
  const strengthOrder: Record<string, number> = { strong: 3, moderate: 2, weak: 1 };
  const sortedSignals = [...signals].sort(
    (a, b) => (strengthOrder[b.strength] || 0) - (strengthOrder[a.strength] || 0)
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Señales Detectadas</CardTitle>
        <CardDescription>
          Indicadores importantes para seguimiento
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {sortedSignals.map((signal, idx) => (
            <div
              key={idx}
              className={cn(
                'flex items-start gap-3 p-3 rounded-lg border',
                signal.type === 'buying' || signal.type === 'opportunity' ? 'bg-green-50 border-green-200' :
                signal.type === 'risk' || signal.type === 'objection' ? 'bg-red-50 border-red-200' :
                'bg-muted'
              )}
            >
              <SignalIcon type={signal.type} />
              <div className="flex-1">
                <p className="font-medium text-sm">{signal.signal}</p>
                {signal.evidence && (
                  <p className="text-xs text-muted-foreground mt-1">{signal.evidence}</p>
                )}
              </div>
              <div className="text-right">
                <Badge className="text-xs" variant="outline">
                  {signal.strength}
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function ActionItemsSection({ actionItems }: { actionItems: ActionItem[] }) {
  if (actionItems.length === 0) return null;

  const priorityColors: Record<string, string> = {
    high: 'text-red-600 bg-red-50',
    medium: 'text-yellow-600 bg-yellow-50',
    low: 'text-blue-600 bg-blue-50',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Acciones Pendientes</CardTitle>
        <CardDescription>
          {actionItems.length} acción(es) extraída(s) de la conversación
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {actionItems.map((item) => (
            <div key={item.id} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className={cn('p-1 rounded', item.status === 'completed' ? 'bg-green-100' : 'bg-gray-100')}>
                {item.status === 'completed' ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <Clock className="h-4 w-4 text-gray-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm">{item.text}</p>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  {item.assignee && (
                    <>
                      <User className="h-3 w-3" />
                      <span>{item.assignee}</span>
                    </>
                  )}
                  {item.dueDate && (
                    <>
                      <Clock className="h-3 w-3 ml-2" />
                      <span>{new Date(item.dueDate).toLocaleDateString()}</span>
                    </>
                  )}
                </div>
              </div>
              <Badge
                className={cn('text-xs', priorityColors[item.priority] || '')}
                variant="outline"
              >
                {item.priority}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function InsightsSection({ insights }: { insights: ConversationInsight[] }) {
  if (insights.length === 0) return null;

  const importanceColors: Record<string, string> = {
    high: 'border-red-300 bg-red-50',
    medium: 'border-yellow-300 bg-yellow-50',
    low: 'border-gray-200',
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          Insights AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {insights.map((insight, idx) => (
            <div
              key={idx}
              className={cn(
                'p-3 rounded-lg border',
                importanceColors[insight.importance] || ''
              )}
            >
              <div className="flex items-start gap-2">
                <InsightIcon type={insight.type} />
                <div className="flex-1">
                  <p className="font-medium text-sm">{insight.title}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {insight.description}
                  </p>
                  {insight.evidence && insight.evidence.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {insight.evidence.map((e, i) => (
                        <Badge key={i} className="text-xs" variant="outline">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <ConfidenceMeter confidence={insight.confidence} />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsSection({ recommendations }: { recommendations: ConversationRecommendation[] }) {
  if (recommendations.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Recomendaciones</CardTitle>
        <CardDescription>
          Acciones sugeridas basadas en el análisis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion collapsible className="w-full" type="single">
          {recommendations.map((rec) => (
            <AccordionItem key={rec.id} value={rec.id}>
              <AccordionTrigger className="text-sm">
                <div className="flex items-center gap-2">
                  <Badge
                    className={cn(
                      'text-xs',
                      rec.priority === 'urgent' ? 'text-red-600' :
                      rec.priority === 'high' ? 'text-orange-600' :
                      rec.priority === 'medium' ? 'text-yellow-600' :
                      'text-gray-600'
                    )}
                    variant="outline"
                  >
                    {rec.priority}
                  </Badge>
                  {rec.action}
                </div>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 pt-2">
                  <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                  {rec.expectedOutcome && (
                    <div className="flex items-center gap-2 text-sm">
                      <TrendingUp className="h-4 w-4 text-green-500" />
                      <span>Impacto esperado: {rec.expectedOutcome}</span>
                    </div>
                  )}
                  {rec.automatable && (
                    <Badge className="text-xs" variant="secondary">
                      Automatizable
                    </Badge>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function AIConversationInsights({
  analysis,
  onRefresh,
  className,
}: AIConversationInsightsProps) {
  if (!analysis) {
    return (
      <Card className={cn('', className)}>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No hay análisis disponible</p>
            <p className="text-sm mt-1">Selecciona una conversación para analizar</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Análisis de Conversación</h3>
            <p className="text-xs text-muted-foreground">
              {new Date(analysis.analyzedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ConfidenceMeter confidence={analysis.confidence} />
          {onRefresh && (
            <Button size="icon" variant="ghost" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <Tabs className="space-y-4" defaultValue="overview">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="signals">Señales</TabsTrigger>
          <TabsTrigger value="actions">Acciones</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
        </TabsList>

        <TabsContent className="space-y-4" value="overview">
          <SentimentSection sentiment={analysis.sentiment} />
          <div className="grid gap-4 md:grid-cols-2">
            <IntentsSection intents={analysis.intents} />
            <TopicsSection topics={analysis.topics} />
          </div>
        </TabsContent>

        <TabsContent value="signals">
          <SignalsSection signals={analysis.signals} />
        </TabsContent>

        <TabsContent value="actions">
          <ActionItemsSection actionItems={analysis.actionItems} />
        </TabsContent>

        <TabsContent className="space-y-4" value="insights">
          <InsightsSection insights={analysis.insights} />
          <RecommendationsSection recommendations={analysis.recommendations} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================
// Conversation Input Component
// ============================================

export function ConversationAnalyzer({
  tenantId,
  onAnalysisComplete,
  className,
}: ConversationInputProps) {
  const [content, setContent] = React.useState('');
  const [type, setType] = React.useState<ConversationType>('email');
  const analyzeMutation = useAnalyzeConversation();

  const handleAnalyze = async () => {
    if (!content.trim()) return;

    try {
      const analysis = await analyzeMutation.mutateAsync({
        tenantId,
        type,
        content,
        participants: ['user', 'agent'],
      });

      if (onAnalysisComplete) {
        onAnalysisComplete(analysis);
      }
    } catch (error) {
      console.error('Error analyzing conversation:', error);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>Analizar Conversación</CardTitle>
        <CardDescription>
          Pega el contenido de una conversación para obtener insights
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={type === 'email' ? 'default' : 'outline'}
            onClick={() => setType('email')}
          >
            <Mail className="h-4 w-4 mr-2" />
            Email
          </Button>
          <Button
            size="sm"
            variant={type === 'call' ? 'default' : 'outline'}
            onClick={() => setType('call')}
          >
            <Phone className="h-4 w-4 mr-2" />
            Llamada
          </Button>
          <Button
            size="sm"
            variant={type === 'chat' ? 'default' : 'outline'}
            onClick={() => setType('chat')}
          >
            <MessageSquare className="h-4 w-4 mr-2" />
            Chat
          </Button>
        </div>

        <textarea
          className="w-full h-48 p-3 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder="Pega aquí el contenido de la conversación..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <Button
          className="w-full"
          disabled={!content.trim() || analyzeMutation.isPending}
          onClick={handleAnalyze}
        >
          {analyzeMutation.isPending ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Activity className="h-4 w-4 mr-2" />
              Analizar Conversación
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default AIConversationInsights;
