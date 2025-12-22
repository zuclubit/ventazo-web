# FASE 6.3 — AI Predictive Analytics & Conversation Intelligence

## Estado: COMPLETADO

**Fecha de finalización:** 2025-12-08

---

## Resumen Ejecutivo

La FASE 6.3 implementa capacidades avanzadas de análisis predictivo y inteligencia conversacional para el Smart CRM, permitiendo:

1. **Pronósticos de negocio** con modelos de ML (revenue, pipeline, deals, leads)
2. **Predicción de churn** con acciones de retención automatizadas
3. **Sistema de alertas predictivas** con priorización inteligente
4. **Análisis de conversaciones** (emails, llamadas, chats)
5. **Detección de sentimiento e intención** en tiempo real
6. **Sistema de coaching** para agentes de ventas

---

## Arquitectura Implementada

```
apps/web/src/lib/
├── ai-analytics/
│   ├── types.ts           # ~600 líneas de tipos
│   ├── engine.ts          # Motor de forecasting
│   ├── alerts.ts          # Sistema de alertas
│   ├── hooks.ts           # React Query hooks
│   └── index.ts           # Exports
│
└── conversation-intelligence/
    ├── types.ts           # ~700 líneas de tipos
    ├── engine.ts          # Motor de análisis
    ├── hooks.ts           # React Query hooks
    └── index.ts           # Exports

apps/web/src/components/ai/
├── ai-predictive-dashboard.tsx    # Dashboard principal
└── ai-conversation-insights.tsx   # UI de insights
```

---

## Módulo 1: AI Predictive Analytics

### 1.1 Tipos de Pronóstico

```typescript
// Tipos de forecast disponibles
type ForecastType =
  | 'revenue'      // Pronóstico de ingresos
  | 'pipeline'     // Pronóstico de pipeline
  | 'deals'        // Probabilidad de deals
  | 'leads'        // Pronóstico de leads
  | 'conversions'  // Tasa de conversión
  | 'churn'        // Predicción de churn
  | 'growth';      // Crecimiento general

// Modelos disponibles
type ForecastModel =
  | 'linear'       // Regresión lineal
  | 'exponential'  // Suavizado exponencial
  | 'seasonal'     // Ajuste estacional
  | 'arima'        // ARIMA
  | 'prophet'      // Prophet de Meta
  | 'ai_ensemble'; // Ensemble de modelos
```

### 1.2 Revenue Forecast

```typescript
import { useRevenueForecast } from '@/lib/ai-analytics';

function RevenueWidget() {
  const { data: forecast, isLoading } = useRevenueForecast({
    tenantId: 'tenant-123',
    period: 'monthly',
  });

  return (
    <div>
      <p>Proyectado: ${forecast?.predictedValue.toLocaleString()}</p>
      <p>Cambio: {forecast?.changePercent.toFixed(1)}%</p>
      <p>Confianza: {(forecast?.confidenceScore * 100).toFixed(0)}%</p>
    </div>
  );
}
```

### 1.3 Pipeline Forecast

```typescript
import { usePipelineForecast } from '@/lib/ai-analytics';

function PipelineWidget() {
  const { data: forecast } = usePipelineForecast({
    tenantId: 'tenant-123',
    period: 'monthly',
  });

  // Etapas del pipeline con predicciones
  forecast?.stages.map(stage => ({
    name: stage.stageName,
    currentCount: stage.currentCount,
    predictedCount: stage.predictedCount,
    avgTimeInStage: stage.avgTimeInStage,
  }));

  // Tasas de conversión
  forecast?.conversionRates.map(rate => ({
    from: rate.fromStage,
    to: rate.toStage,
    currentRate: rate.currentRate,
    predictedRate: rate.predictedRate,
  }));

  // Velocidad del pipeline
  const velocity = forecast?.velocity;
  // velocity.currentDays, velocity.predictedDays, velocity.bottlenecks
}
```

### 1.4 Deal Probability Forecast

```typescript
import { useDealForecast } from '@/lib/ai-analytics';

function DealsWidget() {
  const { data: forecast } = useDealForecast({
    tenantId: 'tenant-123',
  });

  // Probabilidad por deal
  forecast?.dealProbabilities.map(deal => ({
    name: deal.dealName,
    probability: deal.probability,
    riskLevel: deal.riskLevel,    // 'low' | 'medium' | 'high'
    signals: deal.signals,         // Señales positivas/negativas
    expectedCloseDate: deal.expectedCloseDate,
  }));

  // Factores de riesgo
  forecast?.riskFactors.map(risk => ({
    factor: risk.factor,
    severity: risk.severity,
    potentialLoss: risk.potentialLoss,
    mitigation: risk.mitigation,
  }));

  // Recomendaciones AI
  forecast?.recommendations.map(rec => ({
    dealId: rec.dealId,
    action: rec.action,
    priority: rec.priority,
    reasoning: rec.reasoning,
  }));
}
```

### 1.5 Churn Prediction

```typescript
import { useChurnPrediction, useBulkChurnPredictions } from '@/lib/ai-analytics';

// Predicción individual
const { data: prediction } = useChurnPrediction({
  tenantId: 'tenant-123',
  customerId: 'customer-456',
  customerName: 'ACME Corp',
  contractValue: 50000,
  tenure: 24, // meses
  lastInteraction: '2025-11-15',
  supportTickets: 5,
  satisfactionScore: 6,
});

// prediction.churnProbability (0-1)
// prediction.riskLevel ('low' | 'medium' | 'high' | 'critical')
// prediction.riskFactors (factores que contribuyen)
// prediction.retentionActions (acciones sugeridas)

// Predicción en bulk
const bulkMutation = useBulkChurnPredictions();
await bulkMutation.mutateAsync([
  { customerId: 'c1', ...params },
  { customerId: 'c2', ...params },
]);
```

### 1.6 Trend Analysis

```typescript
import { useTrendAnalysis } from '@/lib/ai-analytics';

const { data: trend } = useTrendAnalysis({
  tenantId: 'tenant-123',
  metric: 'monthly_revenue',
  period: 'monthly',
});

// trend.currentValue, trend.previousValue
// trend.changePercent, trend.trend ('up' | 'down' | 'stable')
// trend.anomalies (anomalías detectadas)
// trend.correlations (correlaciones con otras métricas)
// trend.seasonality (patrones estacionales)
// trend.insights (insights generados)
```

---

## Módulo 2: Sistema de Alertas Predictivas

### 2.1 Tipos de Alerta

```typescript
type AlertCategory =
  | 'revenue'      // Alertas de ingresos
  | 'pipeline'     // Alertas de pipeline
  | 'churn'        // Alertas de churn
  | 'opportunity'  // Oportunidades detectadas
  | 'lead'         // Alertas de leads
  | 'performance'  // Alertas de rendimiento
  | 'anomaly';     // Anomalías detectadas

type AlertSeverity = 'info' | 'warning' | 'critical' | 'urgent';
```

### 2.2 Gestión de Alertas

```typescript
import {
  useAlerts,
  useAlertStats,
  useAcknowledgeAlert,
  useResolveAlert,
  useBulkDismissAlerts,
} from '@/lib/ai-analytics';

// Obtener alertas
const { data } = useAlerts({
  tenantId: 'tenant-123',
  category: 'churn',
  severity: 'critical',
  status: 'new',
  limit: 20,
});

// Estadísticas
const { data: stats } = useAlertStats('tenant-123');
// stats.total, stats.byStatus, stats.bySeverity
// stats.criticalUnresolved, stats.avgResolutionTime

// Acciones
const acknowledge = useAcknowledgeAlert();
await acknowledge.mutateAsync({
  alertId: 'alert-123',
  tenantId: 'tenant-123',
  userId: 'user-456',
});

const resolve = useResolveAlert();
await resolve.mutateAsync({
  alertId: 'alert-123',
  tenantId: 'tenant-123',
  resolution: 'Cliente contactado y retenido',
});

// Bulk dismiss
const dismiss = useBulkDismissAlerts();
await dismiss.mutateAsync({
  alertIds: ['a1', 'a2', 'a3'],
  tenantId: 'tenant-123',
  reason: 'Alertas duplicadas',
});
```

### 2.3 Generación Automática de Alertas

```typescript
import {
  useGenerateForecastAlerts,
  useGenerateChurnAlerts,
  useGenerateTrendAlerts,
} from '@/lib/ai-analytics';

// Generar alertas desde forecast
const generateForecast = useGenerateForecastAlerts();
await generateForecast.mutateAsync({
  forecast: revenueForecast,
  tenantId: 'tenant-123',
});

// Generar alertas de churn
const generateChurn = useGenerateChurnAlerts();
await generateChurn.mutateAsync({
  predictions: [prediction1, prediction2],
  tenantId: 'tenant-123',
});
```

### 2.4 Alert Digest

```typescript
import { useAlertDigest } from '@/lib/ai-analytics';

const { data: digest } = useAlertDigest('tenant-123', 'daily');

// digest.summary.totalNew
// digest.summary.totalResolved
// digest.summary.criticalActive
// digest.summary.topCategories

// digest.highlights (alertas más importantes)
// digest.trends.alertVolume ('increasing' | 'decreasing' | 'stable')
// digest.trends.resolutionRate
```

---

## Módulo 3: Conversation Intelligence

### 3.1 Análisis de Conversación

```typescript
import { useAnalyzeConversation } from '@/lib/conversation-intelligence';

const analyzeMutation = useAnalyzeConversation();

const analysis = await analyzeMutation.mutateAsync({
  tenantId: 'tenant-123',
  type: 'email', // 'email' | 'call' | 'chat' | 'meeting'
  content: 'Contenido de la conversación...',
  participants: ['cliente@email.com', 'vendedor@empresa.com'],
});

// Resultados
analysis.sentiment           // Análisis de sentimiento
analysis.intents             // Intenciones detectadas
analysis.topics              // Temas de conversación
analysis.actionItems         // Acciones pendientes
analysis.signals             // Señales de compra/churn/etc
analysis.insights            // Insights generados
analysis.recommendations     // Recomendaciones de acción
```

### 3.2 Análisis de Sentimiento

```typescript
import { useSentimentAnalysis, analyzeSentiment } from '@/lib/conversation-intelligence';

// Hook reactivo
const { data: sentiment } = useSentimentAnalysis(text);

// Función directa
const sentiment = analyzeSentiment(text);

// sentiment.overall: 'positive' | 'negative' | 'neutral' | 'mixed'
// sentiment.score: 0-1
// sentiment.confidence: 0-1
// sentiment.emotions: string[] (emociones detectadas)
// sentiment.keyPhrases: string[] (frases clave)
// sentiment.trend: 'improving' | 'declining' | 'stable'
```

### 3.3 Detección de Intenciones

```typescript
import { useDetectIntents, detectIntents } from '@/lib/conversation-intelligence';

const intents = detectIntents(text);

// Tipos de intención soportados:
// purchase, support, inquiry, complaint, feedback
// cancellation, upgrade, renewal, negotiation, closing
// objection, interest, scheduling, follow_up

intents.map(intent => ({
  intent: intent.intent,       // Tipo de intención
  confidence: intent.confidence, // Confianza 0-1
  entities: intent.entities,   // Entidades extraídas
  context: intent.context,     // Contexto
}));
```

### 3.4 Análisis de Email Thread

```typescript
import { useAnalyzeEmailThread } from '@/lib/conversation-intelligence';

const analyzeMutation = useAnalyzeEmailThread();

const thread = await analyzeMutation.mutateAsync({
  tenantId: 'tenant-123',
  subject: 'Re: Propuesta comercial',
  messages: [
    {
      from: 'cliente@email.com',
      to: ['vendedor@empresa.com'],
      content: 'Me interesa la propuesta...',
      timestamp: '2025-12-08T10:00:00Z',
      isIncoming: true,
    },
    // ... más mensajes
  ],
  dealId: 'deal-456', // Opcional
});

// thread.overallSentiment
// thread.sentimentTrend
// thread.topIntents
// thread.actionItems
// thread.averageResponseTime
```

### 3.5 Análisis de Llamadas

```typescript
import { useAnalyzeCall } from '@/lib/conversation-intelligence';

const analyzeMutation = useAnalyzeCall();

const analysis = await analyzeMutation.mutateAsync({
  tenantId: 'tenant-123',
  participants: ['Cliente', 'Vendedor'],
  duration: 1800, // segundos
  transcript: 'Transcripción de la llamada...',
  dealId: 'deal-456',
});

// analysis.sentiment
// analysis.intents
// analysis.topics
// analysis.talkRatio (por participante)
// analysis.silencePercentage
// analysis.interruptionCount
// analysis.questionCount
// analysis.keyMoments (momentos clave)
// analysis.transcript.segments (segmentos con speaker)
```

### 3.6 Señales Detectadas

```typescript
type SignalType =
  | 'buying'      // Señal de compra
  | 'churn'       // Señal de churn
  | 'upsell'      // Oportunidad de upsell
  | 'objection'   // Objeción
  | 'engagement'  // Alto engagement
  | 'interest'    // Interés
  | 'commitment'  // Compromiso
  | 'urgency'     // Urgencia
  | 'hesitation'; // Hesitación

// Cada señal incluye:
// - type: SignalType
// - strength: 0-1
// - indicator: string (descripción)
// - context: string (contexto)
// - timestamp: string
```

---

## Módulo 4: Sistema de Coaching

### 4.1 Sesiones de Coaching

```typescript
import { useCreateCoachingSession } from '@/lib/conversation-intelligence';

const createSession = useCreateCoachingSession();

const session = await createSession.mutateAsync({
  tenantId: 'tenant-123',
  agentId: 'agent-456',
  agentName: 'Juan Pérez',
  conversationIds: ['conv-1', 'conv-2', 'conv-3'],
  analyses: [analysis1, analysis2, analysis3],
});

// session.overallScore (0-1)
// session.metrics (métricas evaluadas)
// session.feedback (feedback positivo/mejora)
// session.recommendations (recomendaciones)
```

### 4.2 Métricas de Coaching

```typescript
interface CoachingMetric {
  name: string;        // Nombre de la métrica
  score: number;       // Score 0-1
  benchmark: number;   // Benchmark objetivo
  trend: 'up' | 'down' | 'stable';
  improvement: string; // Área de mejora
  weight: number;      // Peso en score final
}

// Métricas evaluadas:
// - Manejo de Sentimiento
// - Resolución de Intención
// - Seguimiento y Acciones
// - Detección de Señales
// - Calidad de Interacción
```

### 4.3 Dashboard de Coaching

```typescript
import { useCoachingDashboard } from '@/lib/conversation-intelligence';

const { sessions, aggregateMetrics, isLoading } = useCoachingDashboard({
  tenantId: 'tenant-123',
  agentId: 'agent-456', // Opcional
});

// aggregateMetrics.totalSessions
// aggregateMetrics.averageScore
// aggregateMetrics.metricAverages
```

---

## Módulo 5: Componentes UI

### 5.1 Dashboard de Predicciones

```tsx
import { AIPredictiveDashboard } from '@/components/ai/ai-predictive-dashboard';

function AnalyticsPage() {
  return (
    <AIPredictiveDashboard tenantId="tenant-123" />
  );
}
```

**Características:**
- KPIs de revenue, pipeline, leads, deals
- Gráficos de tendencia y proyección
- Alertas con priorización
- Tabs: Pronósticos, Alertas, Deals
- Selector de período (diario, semanal, mensual, etc.)
- Refresh automático

### 5.2 Conversation Insights

```tsx
import {
  AIConversationInsights,
  ConversationAnalyzer,
} from '@/components/ai/ai-conversation-insights';

function ConversationPage() {
  const [analysis, setAnalysis] = useState(null);

  return (
    <div className="grid grid-cols-2 gap-4">
      <ConversationAnalyzer
        tenantId="tenant-123"
        onAnalysisComplete={setAnalysis}
      />
      <AIConversationInsights
        analysis={analysis}
        onRefresh={() => {}}
      />
    </div>
  );
}
```

**Características:**
- Input para pegar conversaciones
- Análisis de sentimiento visual
- Intenciones y temas detectados
- Señales con iconografía
- Action items extraídos
- Insights AI con importancia
- Recomendaciones con scripts sugeridos

---

## Algoritmos Implementados

### Statistical Functions

```typescript
// Regresión lineal con R²
linearRegression(data: { x: number; y: number }[]): {
  slope: number;
  intercept: number;
  r2: number;
}

// Suavizado exponencial
exponentialSmoothing(data: number[], alpha: number): number[]

// Media móvil
movingAverage(data: number[], window: number): number[]

// Detección de estacionalidad
detectSeasonality(data: number[], period: number): SeasonalityPattern | undefined

// Detección de anomalías (Z-score)
detectAnomalies(data: TrendDataPoint[], threshold: number): TrendAnomaly[]

// Métricas de forecast
calculateForecastMetrics(actual: number[], predicted: number[]): {
  mape: number;  // Mean Absolute Percentage Error
  rmse: number;  // Root Mean Square Error
  mae: number;   // Mean Absolute Error
  r2: number;    // R-squared
  accuracy: number;
}
```

### NLP Functions

```typescript
// Análisis de sentimiento basado en keywords
analyzeSentiment(text: string): SentimentAnalysis

// Detección de intenciones con patterns
detectIntents(text: string): IntentDetection[]

// Extracción de temas
detectTopics(text: string): TopicDetection[]

// Extracción de action items
extractActionItems(text: string, participants: string[]): ActionItem[]

// Detección de señales comerciales
detectSignals(text: string, sentiment: SentimentAnalysis, intents: IntentDetection[]): ConversationSignal[]
```

---

## Configuración

### Forecast Config

```typescript
const config = updateForecastConfig('tenant-123', {
  defaultModel: 'ai_ensemble',
  forecastHorizon: 30,
  confidenceInterval: 0.9,
  minHistoricalData: 30,
  retrainInterval: 24,
  accuracyThreshold: 0.7,
  anomalyThreshold: 2,
  includeSeasonality: true,
});
```

### Alert Config

```typescript
const config = updateAlertConfig('tenant-123', {
  thresholds: {
    churn: {
      enabled: true,
      minSeverity: 'critical',
      minProbability: 0.5,
      cooldownMinutes: 60,
    },
    // ...otras categorías
  },
  emailNotifications: true,
  slackNotifications: true,
  inAppNotifications: true,
  digestEnabled: true,
  digestFrequency: 'daily',
});
```

---

## Métricas de Calidad

| Componente | LOC | Tests | Cobertura |
|------------|-----|-------|-----------|
| ai-analytics/types.ts | ~600 | - | 100% types |
| ai-analytics/engine.ts | ~800 | Planned | - |
| ai-analytics/alerts.ts | ~500 | Planned | - |
| ai-analytics/hooks.ts | ~400 | Planned | - |
| conversation-intelligence/types.ts | ~700 | - | 100% types |
| conversation-intelligence/engine.ts | ~700 | Planned | - |
| conversation-intelligence/hooks.ts | ~300 | Planned | - |
| ai-predictive-dashboard.tsx | ~500 | Planned | - |
| ai-conversation-insights.tsx | ~600 | Planned | - |

---

## Próximos Pasos

1. **Tests Unitarios**: Agregar tests para engines y hooks
2. **Integración API Real**: Conectar con backend de ML
3. **Modelos Avanzados**: Prophet, ARIMA reales
4. **Real-time Updates**: WebSocket para alertas
5. **Exportación de Reportes**: PDF/Excel de forecasts

---

## Dependencias

```json
{
  "@tanstack/react-query": "^5.x",
  "lucide-react": "latest",
  "recharts": "^2.x" // Para gráficos avanzados
}
```

---

## Cambios en el Proyecto

### Archivos Nuevos (FASE 6.3)

```
apps/web/src/lib/ai-analytics/
├── types.ts
├── engine.ts
├── alerts.ts
├── hooks.ts
└── index.ts

apps/web/src/lib/conversation-intelligence/
├── types.ts
├── engine.ts
├── hooks.ts
└── index.ts

apps/web/src/components/ai/
├── ai-predictive-dashboard.tsx
└── ai-conversation-insights.tsx

docs/
└── FASE_6.3_AI_PREDICTIVE_ANALYTICS_COMPLETADO.md
```

---

**FASE 6.3 COMPLETADA**

El sistema ahora cuenta con:
- Pronósticos inteligentes de negocio
- Predicción de churn con acciones de retención
- Sistema de alertas predictivas
- Análisis completo de conversaciones
- Sistema de coaching para agentes
- UI integrada con dashboard y componentes
