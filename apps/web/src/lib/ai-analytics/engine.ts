// ============================================
// FASE 6.3 — AI Predictive Analytics Engine
// Core forecasting and prediction logic
// ============================================

import type {
  Forecast,
  ForecastType,
  ForecastPeriod,
  ForecastModel,
  ForecastDataPoint,
  ForecastMetrics,
  ForecastFactor,
  RevenueForecast,
  PipelineForecast,
  PipelineStageForecast,
  ConversionRateForecast,
  PipelineVelocity,
  DealForecast,
  DealProbability,
  DealSignal,
  DealRiskFactor,
  DealRecommendation,
  LeadForecast,
  LeadsBySource,
  LeadQualityDistribution,
  LeadConversionFunnel,
  ChurnPrediction,
  ChurnRiskFactor,
  RetentionAction,
  TrendAnalysis,
  TrendDataPoint,
  TrendAnomaly,
  TrendCorrelation,
  SeasonalityPattern,
  ConfidenceLevel,
  ForecastConfig,
} from './types';

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function calculateConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'very_high';
  if (score >= 0.70) return 'high';
  if (score >= 0.50) return 'medium';
  return 'low';
}

function calculateTrend(current: number, previous: number): 'up' | 'down' | 'stable' {
  const change = ((current - previous) / previous) * 100;
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'stable';
}

function calculateChangePercent(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ============================================
// Statistical Helpers
// ============================================

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function standardDeviation(values: number[]): number {
  if (values.length === 0) return 0;
  const avg = mean(values);
  const squareDiffs = values.map(v => Math.pow(v - avg, 2));
  return Math.sqrt(mean(squareDiffs));
}

function linearRegression(data: { x: number; y: number }[]): { slope: number; intercept: number; r2: number } {
  const n = data.length;
  if (n === 0) return { slope: 0, intercept: 0, r2: 0 };

  const sumX = data.reduce((sum, p) => sum + p.x, 0);
  const sumY = data.reduce((sum, p) => sum + p.y, 0);
  const sumXY = data.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumX2 = data.reduce((sum, p) => sum + p.x * p.x, 0);
  const sumY2 = data.reduce((sum, p) => sum + p.y * p.y, 0);

  const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  // Calculate R²
  const yMean = sumY / n;
  const ssTotal = data.reduce((sum, p) => sum + Math.pow(p.y - yMean, 2), 0);
  const ssResidual = data.reduce((sum, p) => sum + Math.pow(p.y - (slope * p.x + intercept), 2), 0);
  const r2 = ssTotal === 0 ? 0 : 1 - ssResidual / ssTotal;

  return { slope, intercept, r2 };
}

function exponentialSmoothing(data: number[], alpha: number = 0.3): number[] {
  if (data.length === 0) return [];
  const smoothed: number[] = [data[0]!];

  for (let i = 1; i < data.length; i++) {
    smoothed.push(alpha * data[i]! + (1 - alpha) * smoothed[i - 1]!);
  }

  return smoothed;
}

function movingAverage(data: number[], window: number): number[] {
  if (data.length < window) return data;
  const result: number[] = [];

  for (let i = window - 1; i < data.length; i++) {
    const windowData = data.slice(i - window + 1, i + 1);
    result.push(mean(windowData));
  }

  return result;
}

function detectSeasonality(data: number[], period: number): SeasonalityPattern | undefined {
  if (data.length < period * 2) return undefined;

  const pattern: number[] = [];
  for (let i = 0; i < period; i++) {
    const values: number[] = [];
    for (let j = i; j < data.length; j += period) {
      values.push(data[j]!);
    }
    pattern.push(mean(values));
  }

  // Calculate seasonality strength
  const overallMean = mean(data);
  const seasonalVariance = mean(pattern.map(p => Math.pow(p - overallMean, 2)));
  const totalVariance = mean(data.map(d => Math.pow(d - overallMean, 2)));
  const strength = totalVariance === 0 ? 0 : seasonalVariance / totalVariance;

  if (strength < 0.1) return undefined;

  return {
    type: period === 7 ? 'weekly' : period === 30 ? 'monthly' : period === 90 ? 'quarterly' : 'yearly',
    pattern,
    strength,
    description: `Detected ${period}-day seasonal pattern with ${(strength * 100).toFixed(1)}% strength`,
  };
}

function detectAnomalies(data: TrendDataPoint[], threshold: number = 2): TrendAnomaly[] {
  const values = data.map(d => d.value);
  const avg = mean(values);
  const std = standardDeviation(values);

  const anomalies: TrendAnomaly[] = [];

  for (const point of data) {
    const zScore = std === 0 ? 0 : Math.abs(point.value - avg) / std;
    if (zScore > threshold) {
      anomalies.push({
        date: point.date,
        value: point.value,
        expectedValue: avg,
        deviation: zScore,
        severity: zScore > 3 ? 'high' : zScore > 2.5 ? 'medium' : 'low',
        possibleCauses: generateAnomalyCauses(point.value, avg),
      });
    }
  }

  return anomalies;
}

function generateAnomalyCauses(value: number, expected: number): string[] {
  const causes: string[] = [];
  const isHigh = value > expected;

  if (isHigh) {
    causes.push('Posible campaña de marketing exitosa');
    causes.push('Evento estacional o promoción');
    causes.push('Nuevo cliente importante');
  } else {
    causes.push('Posible problema operacional');
    causes.push('Pérdida de cliente clave');
    causes.push('Factores externos del mercado');
  }

  return causes;
}

// ============================================
// Forecast Metrics Calculator
// ============================================

function calculateForecastMetrics(
  actual: number[],
  predicted: number[]
): ForecastMetrics {
  if (actual.length === 0 || predicted.length === 0) {
    return { mape: 0, rmse: 0, mae: 0, r2: 0, accuracy: 0 };
  }

  const n = Math.min(actual.length, predicted.length);
  let sumAbsError = 0;
  let sumSquaredError = 0;
  let sumAbsPercentError = 0;
  let validPercentCount = 0;

  for (let i = 0; i < n; i++) {
    const error = actual[i]! - predicted[i]!;
    sumAbsError += Math.abs(error);
    sumSquaredError += error * error;

    if (actual[i] !== 0) {
      sumAbsPercentError += Math.abs(error / actual[i]!);
      validPercentCount++;
    }
  }

  const mae = sumAbsError / n;
  const rmse = Math.sqrt(sumSquaredError / n);
  const mape = validPercentCount > 0 ? (sumAbsPercentError / validPercentCount) * 100 : 0;

  // Calculate R²
  const actualMean = mean(actual.slice(0, n));
  const ssTotal = actual.slice(0, n).reduce((sum, v) => sum + Math.pow(v - actualMean, 2), 0);
  const ssResidual = sumSquaredError;
  const r2 = ssTotal === 0 ? 0 : Math.max(0, 1 - ssResidual / ssTotal);

  const accuracy = Math.max(0, 100 - mape);

  return { mape, rmse, mae, r2, accuracy };
}

// ============================================
// Forecast Data Generation
// ============================================

function generateHistoricalData(
  days: number,
  baseValue: number,
  volatility: number = 0.1,
  trend: number = 0.001
): ForecastDataPoint[] {
  const data: ForecastDataPoint[] = [];
  const now = new Date();
  let value = baseValue;

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    // Add some randomness and trend
    const randomFactor = 1 + (Math.random() - 0.5) * volatility * 2;
    const trendFactor = 1 + trend * (days - i);
    value = baseValue * randomFactor * trendFactor;

    data.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.round(value * 100) / 100,
      lowerBound: value * 0.95,
      upperBound: value * 1.05,
      confidence: 1,
      isActual: true,
      isPredicted: false,
    });
  }

  return data;
}

function generatePredictedData(
  historicalData: ForecastDataPoint[],
  horizon: number,
  model: ForecastModel
): ForecastDataPoint[] {
  if (historicalData.length === 0) return [];

  const values = historicalData.map(d => d.value);
  const predicted: ForecastDataPoint[] = [];
  const lastDate = new Date(historicalData[historicalData.length - 1]!.date);

  // Get model parameters
  const regression = linearRegression(values.map((v, i) => ({ x: i, y: v })));
  const smoothed = exponentialSmoothing(values);
  const lastSmoothed = smoothed[smoothed.length - 1] || values[values.length - 1]!;

  for (let i = 1; i <= horizon; i++) {
    const date = new Date(lastDate);
    date.setDate(date.getDate() + i);

    let value: number;
    const baseIndex = values.length + i - 1;

    switch (model) {
      case 'linear':
        value = regression.slope * baseIndex + regression.intercept;
        break;
      case 'exponential':
        value = lastSmoothed * Math.pow(1.01, i);
        break;
      case 'seasonal':
        // Simple seasonal adjustment
        const seasonalIndex = i % 7;
        const seasonalFactor = 1 + (seasonalIndex === 0 || seasonalIndex === 6 ? -0.2 : 0.1);
        value = (regression.slope * baseIndex + regression.intercept) * seasonalFactor;
        break;
      case 'ai_ensemble':
      case 'prophet':
      case 'arima':
      default:
        // Weighted average of methods
        const linearVal = regression.slope * baseIndex + regression.intercept;
        const expVal = lastSmoothed * Math.pow(1.005, i);
        value = linearVal * 0.6 + expVal * 0.4;
        break;
    }

    // Confidence decreases with distance
    const confidence = Math.max(0.5, 1 - i * 0.02);
    const uncertaintyFactor = 1 + (1 - confidence) * 0.5;

    predicted.push({
      date: date.toISOString().split('T')[0]!,
      value: Math.round(Math.max(0, value) * 100) / 100,
      lowerBound: Math.round(value / uncertaintyFactor * 100) / 100,
      upperBound: Math.round(value * uncertaintyFactor * 100) / 100,
      confidence,
      isActual: false,
      isPredicted: true,
    });
  }

  return predicted;
}

// ============================================
// Revenue Forecast Engine
// ============================================

export interface CreateRevenueForecastParams {
  tenantId: string;
  name: string;
  description?: string;
  period: ForecastPeriod;
  model?: ForecastModel;
  forecastHorizon?: number;
  currency?: string;
  historicalDays?: number;
}

export function createRevenueForecast(params: CreateRevenueForecastParams): RevenueForecast {
  const {
    tenantId,
    name,
    description,
    period,
    model = 'ai_ensemble',
    forecastHorizon = 30,
    currency = 'USD',
    historicalDays = 90,
  } = params;

  // Generate mock historical data
  const baseRevenue = 100000; // $100k base
  const historicalData = generateHistoricalData(historicalDays, baseRevenue, 0.15, 0.002);
  const predictedData = generatePredictedData(historicalData, forecastHorizon, model);

  const currentValue = historicalData[historicalData.length - 1]?.value || 0;
  const predictedValue = predictedData[predictedData.length - 1]?.value || 0;
  const previousValue = historicalData[historicalData.length - 8]?.value || currentValue;

  // Calculate metrics using historical data for validation
  const splitIndex = Math.floor(historicalData.length * 0.8);
  const trainingData = historicalData.slice(0, splitIndex);
  const validationData = historicalData.slice(splitIndex);
  const validationPredicted = generatePredictedData(trainingData, validationData.length, model);
  const metrics = calculateForecastMetrics(
    validationData.map(d => d.value),
    validationPredicted.map(d => d.value)
  );

  const now = new Date().toISOString();

  return {
    id: generateId(),
    tenantId,
    type: 'revenue',
    period,
    model,
    name,
    description,
    startDate: historicalData[0]?.date || now,
    endDate: predictedData[predictedData.length - 1]?.date || now,
    forecastHorizon,
    historicalData,
    predictedData,
    currentValue,
    predictedValue,
    changePercent: calculateChangePercent(predictedValue, currentValue),
    trend: calculateTrend(currentValue, previousValue),
    metrics,
    confidence: calculateConfidenceLevel(metrics.accuracy / 100),
    confidenceScore: metrics.accuracy / 100,
    createdAt: now,
    updatedAt: now,
    lastTrainedAt: now,
    currency,
    aiInsights: [
      `Tendencia de ingresos ${calculateTrend(currentValue, previousValue) === 'up' ? 'positiva' : 'estable'} detectada`,
      `Proyección de ${((predictedValue - currentValue) / currentValue * 100).toFixed(1)}% de cambio en los próximos ${forecastHorizon} días`,
      'Los fines de semana muestran menor actividad comercial',
    ],
    aiRecommendations: [
      'Considerar aumentar esfuerzos de ventas en días con menor rendimiento',
      'Revisar estrategias de pricing para maximizar ingresos',
      'Monitorear métricas de conversión para identificar oportunidades',
    ],
    factors: [
      { name: 'Tendencia histórica', impact: 'positive', weight: 0.4, description: 'Crecimiento sostenido en los últimos 90 días' },
      { name: 'Estacionalidad', impact: 'neutral', weight: 0.2, description: 'Patrones semanales identificados' },
      { name: 'Volumen de leads', impact: 'positive', weight: 0.25, description: 'Aumento en generación de leads' },
      { name: 'Tasa de conversión', impact: 'neutral', weight: 0.15, description: 'Conversión estable' },
    ],
    segments: [
      { name: 'Enterprise', currentValue: currentValue * 0.5, predictedValue: predictedValue * 0.52, changePercent: 4, confidence: 0.85 },
      { name: 'SMB', currentValue: currentValue * 0.35, predictedValue: predictedValue * 0.33, changePercent: -5.7, confidence: 0.78 },
      { name: 'Startup', currentValue: currentValue * 0.15, predictedValue: predictedValue * 0.15, changePercent: 0, confidence: 0.72 },
    ],
    byProduct: [
      { category: 'Producto A', currentValue: currentValue * 0.4, predictedValue: predictedValue * 0.42, percentage: 42 },
      { category: 'Producto B', currentValue: currentValue * 0.35, predictedValue: predictedValue * 0.33, percentage: 33 },
      { category: 'Servicios', currentValue: currentValue * 0.25, predictedValue: predictedValue * 0.25, percentage: 25 },
    ],
    byRegion: [
      { category: 'LATAM', currentValue: currentValue * 0.45, predictedValue: predictedValue * 0.47, percentage: 47 },
      { category: 'NA', currentValue: currentValue * 0.35, predictedValue: predictedValue * 0.33, percentage: 33 },
      { category: 'EMEA', currentValue: currentValue * 0.2, predictedValue: predictedValue * 0.2, percentage: 20 },
    ],
  };
}

// ============================================
// Pipeline Forecast Engine
// ============================================

export interface CreatePipelineForecastParams {
  tenantId: string;
  name: string;
  description?: string;
  period: ForecastPeriod;
  model?: ForecastModel;
  forecastHorizon?: number;
  stages?: string[];
}

export function createPipelineForecast(params: CreatePipelineForecastParams): PipelineForecast {
  const {
    tenantId,
    name,
    description,
    period,
    model = 'ai_ensemble',
    forecastHorizon = 30,
    stages = ['Prospección', 'Calificación', 'Propuesta', 'Negociación', 'Cierre'],
  } = params;

  const basePipelineValue = 500000;
  const historicalData = generateHistoricalData(90, basePipelineValue, 0.2, 0.001);
  const predictedData = generatePredictedData(historicalData, forecastHorizon, model);

  const currentValue = historicalData[historicalData.length - 1]?.value || 0;
  const predictedValue = predictedData[predictedData.length - 1]?.value || 0;
  const previousValue = historicalData[historicalData.length - 8]?.value || currentValue;

  const metrics = calculateForecastMetrics(
    historicalData.slice(-20).map(d => d.value),
    predictedData.slice(0, 20).map(d => d.value)
  );

  const now = new Date().toISOString();

  // Generate stage forecasts
  const stageForecastData: PipelineStageForecast[] = stages.map((stageName, index) => {
    const stageWeight = [0.3, 0.25, 0.2, 0.15, 0.1][index] || 0.1;
    const currentCount = Math.floor(50 * stageWeight * (1 + Math.random() * 0.3));
    const predictedCount = Math.floor(currentCount * (1 + (Math.random() - 0.3) * 0.2));

    return {
      stageId: `stage-${index + 1}`,
      stageName,
      currentCount,
      predictedCount,
      currentValue: currentValue * stageWeight,
      predictedValue: predictedValue * stageWeight,
      avgTimeInStage: [5, 7, 10, 8, 3][index] || 5,
      predictedTimeInStage: [4, 6, 9, 7, 3][index] || 5,
    };
  });

  // Generate conversion rates
  const conversionRates: ConversionRateForecast[] = [];
  for (let i = 0; i < stages.length - 1; i++) {
    const currentRate = 0.3 + Math.random() * 0.4;
    const predictedRate = currentRate * (0.95 + Math.random() * 0.1);
    conversionRates.push({
      fromStage: stages[i]!,
      toStage: stages[i + 1]!,
      currentRate,
      predictedRate,
      trend: calculateTrend(predictedRate, currentRate),
    });
  }

  // Pipeline velocity
  const velocity: PipelineVelocity = {
    currentDays: 45,
    predictedDays: 42,
    trend: 'faster',
    bottlenecks: ['Negociación - tiempo promedio elevado', 'Propuesta - baja tasa de conversión'],
  };

  return {
    id: generateId(),
    tenantId,
    type: 'pipeline',
    period,
    model,
    name,
    description,
    startDate: historicalData[0]?.date || now,
    endDate: predictedData[predictedData.length - 1]?.date || now,
    forecastHorizon,
    historicalData,
    predictedData,
    currentValue,
    predictedValue,
    changePercent: calculateChangePercent(predictedValue, currentValue),
    trend: calculateTrend(currentValue, previousValue),
    metrics,
    confidence: calculateConfidenceLevel(metrics.accuracy / 100),
    confidenceScore: metrics.accuracy / 100,
    createdAt: now,
    updatedAt: now,
    stages: stageForecastData,
    conversionRates,
    velocity,
    aiInsights: [
      `Pipeline total de ${(currentValue / 1000000).toFixed(2)}M con tendencia ${calculateTrend(currentValue, previousValue) === 'up' ? 'creciente' : 'estable'}`,
      `Velocidad del pipeline mejorando - reducción estimada de ${velocity.currentDays - velocity.predictedDays} días`,
      'Etapa de Negociación identificada como cuello de botella principal',
    ],
    aiRecommendations: [
      'Enfocarse en mejorar conversión en etapa de Propuesta',
      'Reducir tiempo en Negociación mediante templates estandarizados',
      'Aumentar follow-ups en deals estancados más de 7 días',
    ],
    factors: [
      { name: 'Volumen de entrada', impact: 'positive', weight: 0.3, description: 'Leads entrantes aumentando' },
      { name: 'Velocidad de cierre', impact: 'positive', weight: 0.25, description: 'Mejora en tiempo de cierre' },
      { name: 'Tasa de caída', impact: 'negative', weight: 0.25, description: 'Aumento en deals perdidos' },
      { name: 'Valor promedio', impact: 'neutral', weight: 0.2, description: 'ACV estable' },
    ],
  };
}

// ============================================
// Deal Forecast Engine
// ============================================

export interface CreateDealForecastParams {
  tenantId: string;
  name: string;
  description?: string;
  deals?: Array<{
    id: string;
    name: string;
    stage: string;
    value: number;
    daysInPipeline: number;
  }>;
}

export function createDealForecast(params: CreateDealForecastParams): DealForecast {
  const {
    tenantId,
    name,
    description,
    deals = [],
  } = params;

  // Generate mock deals if none provided
  const mockDeals = deals.length > 0 ? deals : [
    { id: 'deal-1', name: 'Enterprise Corp', stage: 'Negociación', value: 150000, daysInPipeline: 45 },
    { id: 'deal-2', name: 'Tech Startup Inc', stage: 'Propuesta', value: 35000, daysInPipeline: 20 },
    { id: 'deal-3', name: 'Global Services', stage: 'Calificación', value: 80000, daysInPipeline: 10 },
    { id: 'deal-4', name: 'SMB Solutions', stage: 'Prospección', value: 15000, daysInPipeline: 5 },
    { id: 'deal-5', name: 'Mega Industries', stage: 'Negociación', value: 250000, daysInPipeline: 60 },
  ];

  // Generate deal probabilities
  const dealProbabilities: DealProbability[] = mockDeals.map(deal => {
    const stageWeights: Record<string, number> = {
      'Prospección': 0.1,
      'Calificación': 0.25,
      'Propuesta': 0.5,
      'Negociación': 0.75,
      'Cierre': 0.9,
    };

    const baseProbability = stageWeights[deal.stage] || 0.3;
    const agePenalty = Math.min(0.3, deal.daysInPipeline * 0.005);
    const probability = Math.max(0.1, baseProbability - agePenalty);

    const signals: DealSignal[] = [];
    if (deal.daysInPipeline > 30) {
      signals.push({
        type: 'negative',
        signal: 'Deal estancado - más de 30 días en pipeline',
        weight: 0.3,
        timestamp: new Date().toISOString(),
      });
    }
    if (deal.value > 100000) {
      signals.push({
        type: 'positive',
        signal: 'Deal de alto valor',
        weight: 0.2,
        timestamp: new Date().toISOString(),
      });
    }
    if (probability > 0.6) {
      signals.push({
        type: 'positive',
        signal: 'Alta probabilidad de cierre',
        weight: 0.25,
        timestamp: new Date().toISOString(),
      });
    }

    const expectedClose = new Date();
    expectedClose.setDate(expectedClose.getDate() + Math.floor(30 * (1 - probability)));

    return {
      dealId: deal.id,
      dealName: deal.name,
      currentStage: deal.stage,
      value: deal.value,
      probability,
      expectedCloseDate: expectedClose.toISOString().split('T')[0]!,
      daysInPipeline: deal.daysInPipeline,
      riskLevel: probability < 0.3 ? 'high' : probability < 0.5 ? 'medium' : 'low',
      signals,
    };
  });

  // Calculate risk factors
  const riskFactors: DealRiskFactor[] = [
    {
      factor: 'Deals estancados',
      severity: 'medium',
      affectedDeals: dealProbabilities.filter(d => d.daysInPipeline > 30).length,
      potentialLoss: dealProbabilities.filter(d => d.daysInPipeline > 30).reduce((sum, d) => sum + d.value, 0),
      mitigation: 'Implementar cadencia de follow-up automatizada',
    },
    {
      factor: 'Baja probabilidad de cierre',
      severity: 'high',
      affectedDeals: dealProbabilities.filter(d => d.probability < 0.3).length,
      potentialLoss: dealProbabilities.filter(d => d.probability < 0.3).reduce((sum, d) => sum + d.value, 0),
      mitigation: 'Revisar calificación de deals y priorizar recursos',
    },
  ];

  // Generate recommendations
  const recommendations: DealRecommendation[] = dealProbabilities
    .filter(d => d.riskLevel === 'high' || d.daysInPipeline > 30)
    .map(deal => ({
      dealId: deal.dealId,
      action: deal.daysInPipeline > 45
        ? 'Escalar a gerencia para revisión urgente'
        : 'Programar llamada de seguimiento',
      priority: deal.riskLevel === 'high' ? 'urgent' as const : 'high' as const,
      expectedImpact: `Potencial recuperación de ${(deal.value / 1000).toFixed(0)}K`,
      reasoning: `Deal ${deal.dealName} lleva ${deal.daysInPipeline} días en pipeline con ${(deal.probability * 100).toFixed(0)}% probabilidad`,
    }));

  const totalValue = dealProbabilities.reduce((sum, d) => sum + d.value, 0);
  const weightedValue = dealProbabilities.reduce((sum, d) => sum + d.value * d.probability, 0);

  const historicalData = generateHistoricalData(30, totalValue, 0.1, 0);
  const predictedData = generatePredictedData(historicalData, 30, 'linear');

  const now = new Date().toISOString();

  return {
    id: generateId(),
    tenantId,
    type: 'deals',
    period: 'monthly',
    model: 'ai_ensemble',
    name,
    description,
    startDate: historicalData[0]?.date || now,
    endDate: predictedData[predictedData.length - 1]?.date || now,
    forecastHorizon: 30,
    historicalData,
    predictedData,
    currentValue: totalValue,
    predictedValue: weightedValue,
    changePercent: calculateChangePercent(weightedValue, totalValue),
    trend: 'stable',
    metrics: { mape: 15, rmse: 5000, mae: 4000, r2: 0.75, accuracy: 85 },
    confidence: 'high',
    confidenceScore: 0.85,
    createdAt: now,
    updatedAt: now,
    dealProbabilities,
    expectedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]!,
    riskFactors,
    recommendations,
    aiInsights: [
      `${dealProbabilities.length} deals activos con valor total de ${(totalValue / 1000).toFixed(0)}K`,
      `Valor ponderado por probabilidad: ${(weightedValue / 1000).toFixed(0)}K`,
      `${riskFactors[0]?.affectedDeals || 0} deals identificados como riesgo alto`,
    ],
    aiRecommendations: recommendations.slice(0, 3).map(r => r.action),
  };
}

// ============================================
// Lead Forecast Engine
// ============================================

export interface CreateLeadForecastParams {
  tenantId: string;
  name: string;
  description?: string;
  period: ForecastPeriod;
  model?: ForecastModel;
  forecastHorizon?: number;
}

export function createLeadForecast(params: CreateLeadForecastParams): LeadForecast {
  const {
    tenantId,
    name,
    description,
    period,
    model = 'ai_ensemble',
    forecastHorizon = 30,
  } = params;

  const baseLeads = 200;
  const historicalData = generateHistoricalData(90, baseLeads, 0.25, 0.003);
  const predictedData = generatePredictedData(historicalData, forecastHorizon, model);

  const currentValue = historicalData[historicalData.length - 1]?.value || 0;
  const predictedValue = predictedData[predictedData.length - 1]?.value || 0;
  const previousValue = historicalData[historicalData.length - 8]?.value || currentValue;

  const metrics = calculateForecastMetrics(
    historicalData.slice(-20).map(d => d.value),
    predictedData.slice(0, 20).map(d => d.value)
  );

  // Lead sources
  const bySource: LeadsBySource[] = [
    { source: 'Orgánico', currentCount: Math.floor(currentValue * 0.35), predictedCount: Math.floor(predictedValue * 0.38), conversionRate: 0.15, costPerLead: 0, roi: 999 },
    { source: 'Paid Ads', currentCount: Math.floor(currentValue * 0.3), predictedCount: Math.floor(predictedValue * 0.28), conversionRate: 0.12, costPerLead: 45, roi: 3.5 },
    { source: 'Referidos', currentCount: Math.floor(currentValue * 0.2), predictedCount: Math.floor(predictedValue * 0.22), conversionRate: 0.25, costPerLead: 20, roi: 8 },
    { source: 'Eventos', currentCount: Math.floor(currentValue * 0.15), predictedCount: Math.floor(predictedValue * 0.12), conversionRate: 0.18, costPerLead: 150, roi: 2 },
  ];

  // Quality distribution
  const qualityDistribution: LeadQualityDistribution = {
    hot: { current: Math.floor(currentValue * 0.15), predicted: Math.floor(predictedValue * 0.18) },
    warm: { current: Math.floor(currentValue * 0.35), predicted: Math.floor(predictedValue * 0.37) },
    cold: { current: Math.floor(currentValue * 0.5), predicted: Math.floor(predictedValue * 0.45) },
  };

  // Conversion funnel
  const conversionFunnel: LeadConversionFunnel = {
    stages: [
      { name: 'Visitante', count: Math.floor(currentValue * 10), conversionRate: 0.1, dropOffRate: 0.9 },
      { name: 'Lead', count: Math.floor(currentValue), conversionRate: 0.3, dropOffRate: 0.7 },
      { name: 'MQL', count: Math.floor(currentValue * 0.3), conversionRate: 0.5, dropOffRate: 0.5 },
      { name: 'SQL', count: Math.floor(currentValue * 0.15), conversionRate: 0.6, dropOffRate: 0.4 },
      { name: 'Cliente', count: Math.floor(currentValue * 0.09), conversionRate: 1, dropOffRate: 0 },
    ],
    overallConversionRate: 0.09,
    predictedConversionRate: 0.11,
    avgTimeToConvert: 25,
  };

  const now = new Date().toISOString();

  return {
    id: generateId(),
    tenantId,
    type: 'leads',
    period,
    model,
    name,
    description,
    startDate: historicalData[0]?.date || now,
    endDate: predictedData[predictedData.length - 1]?.date || now,
    forecastHorizon,
    historicalData,
    predictedData,
    currentValue: Math.floor(currentValue),
    predictedValue: Math.floor(predictedValue),
    changePercent: calculateChangePercent(predictedValue, currentValue),
    trend: calculateTrend(currentValue, previousValue),
    metrics,
    confidence: calculateConfidenceLevel(metrics.accuracy / 100),
    confidenceScore: metrics.accuracy / 100,
    createdAt: now,
    updatedAt: now,
    bySource,
    qualityDistribution,
    conversionFunnel,
    aiInsights: [
      `Generación de ${Math.floor(currentValue)} leads mensuales con tendencia ${calculateTrend(currentValue, previousValue) === 'up' ? 'creciente' : 'estable'}`,
      `Mejor fuente: Referidos con ${(bySource[2]?.conversionRate || 0) * 100}% de conversión`,
      `${qualityDistribution.hot.current} leads calientes listos para ventas`,
    ],
    aiRecommendations: [
      'Invertir más en programa de referidos - mayor ROI',
      'Optimizar campañas de Paid Ads - conversión por debajo del promedio',
      'Implementar nurturing para leads fríos - representan 50% del pipeline',
    ],
    factors: [
      { name: 'Campañas activas', impact: 'positive', weight: 0.3, description: '5 campañas activas generando leads' },
      { name: 'SEO', impact: 'positive', weight: 0.25, description: 'Tráfico orgánico en crecimiento' },
      { name: 'Estacionalidad', impact: 'neutral', weight: 0.2, description: 'Q4 típicamente más alto' },
      { name: 'Competencia', impact: 'negative', weight: 0.25, description: 'Aumento en costos de ads' },
    ],
  };
}

// ============================================
// Churn Prediction Engine
// ============================================

export interface CreateChurnPredictionParams {
  tenantId: string;
  customerId: string;
  customerName: string;
  contractValue: number;
  tenure: number;
  lastInteraction: string;
  supportTickets?: number;
  satisfactionScore?: number;
}

export function createChurnPrediction(params: CreateChurnPredictionParams): ChurnPrediction {
  const {
    tenantId,
    customerId,
    customerName,
    contractValue,
    tenure,
    lastInteraction,
    supportTickets = 0,
    satisfactionScore,
  } = params;

  // Calculate days since last interaction
  const daysSinceInteraction = Math.floor(
    (Date.now() - new Date(lastInteraction).getTime()) / (1000 * 60 * 60 * 24)
  );

  // Calculate risk factors
  const riskFactors: ChurnRiskFactor[] = [];
  let totalRisk = 0;

  // Interaction recency
  if (daysSinceInteraction > 30) {
    const impact = Math.min(0.4, daysSinceInteraction * 0.01);
    riskFactors.push({
      factor: 'Baja interacción reciente',
      impact,
      description: `${daysSinceInteraction} días desde última interacción`,
      trend: 'declining',
    });
    totalRisk += impact;
  }

  // Support tickets
  if (supportTickets > 3) {
    const impact = Math.min(0.3, supportTickets * 0.05);
    riskFactors.push({
      factor: 'Alto volumen de soporte',
      impact,
      description: `${supportTickets} tickets en los últimos 90 días`,
      trend: supportTickets > 5 ? 'declining' : 'stable',
    });
    totalRisk += impact;
  }

  // Satisfaction score
  if (satisfactionScore !== undefined && satisfactionScore < 7) {
    const impact = Math.min(0.35, (10 - satisfactionScore) * 0.05);
    riskFactors.push({
      factor: 'NPS/Satisfacción bajo',
      impact,
      description: `Score de ${satisfactionScore}/10`,
      trend: 'declining',
    });
    totalRisk += impact;
  }

  // Tenure (short tenure = higher risk)
  if (tenure < 6) {
    const impact = Math.min(0.2, (6 - tenure) * 0.03);
    riskFactors.push({
      factor: 'Cliente nuevo',
      impact,
      description: `Solo ${tenure} meses como cliente`,
      trend: 'stable',
    });
    totalRisk += impact;
  }

  // Cap churn probability
  const churnProbability = Math.min(0.95, Math.max(0.05, totalRisk));
  const riskLevel: 'low' | 'medium' | 'high' | 'critical' =
    churnProbability >= 0.7 ? 'critical' :
    churnProbability >= 0.5 ? 'high' :
    churnProbability >= 0.3 ? 'medium' : 'low';

  // Calculate scores
  const engagementScore = Math.max(0, 100 - daysSinceInteraction * 2);
  const healthScore = Math.max(0, 100 - churnProbability * 100);

  // Generate retention actions
  const retentionActions: RetentionAction[] = [];

  if (daysSinceInteraction > 14) {
    retentionActions.push({
      action: 'Programar llamada de check-in',
      priority: daysSinceInteraction > 30 ? 'urgent' : 'high',
      expectedImpact: 0.15,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (supportTickets > 3) {
    retentionActions.push({
      action: 'Escalamiento a Customer Success',
      priority: 'high',
      expectedImpact: 0.2,
      dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  if (churnProbability > 0.5) {
    retentionActions.push({
      action: 'Ofrecer descuento o upgrade',
      priority: 'urgent',
      expectedImpact: 0.25,
      cost: contractValue * 0.1,
    });
  }

  retentionActions.push({
    action: 'Enviar encuesta de satisfacción',
    priority: 'medium',
    expectedImpact: 0.05,
  });

  // Calculate predicted churn date
  const predictedChurnDate = churnProbability > 0.5
    ? new Date(Date.now() + (90 - churnProbability * 60) * 24 * 60 * 60 * 1000).toISOString()
    : undefined;

  return {
    id: generateId(),
    tenantId,
    customerId,
    customerName,
    churnProbability,
    riskLevel,
    predictedChurnDate,
    riskFactors,
    healthScore,
    engagementScore,
    satisfactionScore,
    contractValue,
    lifetimeValue: contractValue * tenure,
    tenure,
    lastInteraction,
    supportTickets,
    retentionActions,
    calculatedAt: new Date().toISOString(),
    confidence: 0.75 + Math.random() * 0.15,
  };
}

// ============================================
// Trend Analysis Engine
// ============================================

export interface CreateTrendAnalysisParams {
  tenantId: string;
  metric: string;
  period: ForecastPeriod;
  data?: TrendDataPoint[];
}

export function createTrendAnalysis(params: CreateTrendAnalysisParams): TrendAnalysis {
  const { tenantId, metric, period, data } = params;

  // Generate or use provided data
  const trendData: TrendDataPoint[] = data || generateHistoricalData(90, 1000, 0.15, 0.002)
    .map(d => ({
      date: d.date,
      value: d.value,
      isAnomaly: false,
      annotation: undefined,
    }));

  const values = trendData.map(d => d.value);
  const currentValue = values[values.length - 1] || 0;
  const previousValue = values[values.length - 8] || currentValue;

  // Calculate moving average
  const ma = movingAverage(values, 7);

  // Detect seasonality
  const seasonality = detectSeasonality(values, 7);

  // Detect anomalies
  const anomalies = detectAnomalies(trendData);

  // Mark anomalies in data
  for (const anomaly of anomalies) {
    const point = trendData.find(d => d.date === anomaly.date);
    if (point) {
      point.isAnomaly = true;
      point.annotation = `Anomalía: ${anomaly.deviation.toFixed(1)}σ`;
    }
  }

  // Calculate correlations (mock data)
  const correlations: TrendCorrelation[] = [
    { metric: 'Marketing Spend', correlation: 0.72, lag: 7, description: 'Correlación positiva con gasto en marketing (7 días lag)' },
    { metric: 'Website Traffic', correlation: 0.85, lag: 1, description: 'Alta correlación con tráfico web' },
    { metric: 'Economic Index', correlation: -0.3, lag: 30, description: 'Correlación negativa leve con índice económico' },
  ];

  // Linear regression for prediction
  const regression = linearRegression(values.map((v, i) => ({ x: i, y: v })));
  const predictedChange = regression.slope * 30; // 30-day prediction
  const predictedTrend = predictedChange > currentValue * 0.05 ? 'up' :
                         predictedChange < -currentValue * 0.05 ? 'down' : 'stable';

  // Generate insights
  const insights: string[] = [
    `Tendencia ${calculateTrend(currentValue, previousValue) === 'up' ? 'alcista' : 'estable'} en ${metric}`,
  ];

  if (seasonality) {
    insights.push(seasonality.description);
  }

  if (anomalies.length > 0) {
    insights.push(`${anomalies.length} anomalía(s) detectada(s) en el período`);
  }

  if (correlations[0] && Math.abs(correlations[0].correlation) > 0.7) {
    insights.push(`Alta correlación con ${correlations[0].metric}`);
  }

  return {
    id: generateId(),
    tenantId,
    metric,
    period,
    currentValue,
    previousValue,
    changePercent: calculateChangePercent(currentValue, previousValue),
    trend: calculateTrend(currentValue, previousValue),
    dataPoints: trendData,
    movingAverage: ma,
    seasonality,
    anomalies,
    correlations,
    insights,
    predictedTrend,
    predictedChange,
    confidence: regression.r2,
    createdAt: new Date().toISOString(),
  };
}

// ============================================
// Configuration Management
// ============================================

const defaultConfig: ForecastConfig = {
  tenantId: '',
  defaultModel: 'ai_ensemble',
  forecastHorizon: 30,
  confidenceInterval: 0.9,
  minHistoricalData: 30,
  retrainInterval: 24,
  accuracyThreshold: 0.7,
  anomalyThreshold: 2,
  includeSeasonality: true,
  includeExternalFactors: false,
  updatedAt: new Date().toISOString(),
};

const configStore: Map<string, ForecastConfig> = new Map();

export function getForecastConfig(tenantId: string): ForecastConfig {
  return configStore.get(tenantId) || { ...defaultConfig, tenantId };
}

export function updateForecastConfig(
  tenantId: string,
  updates: Partial<Omit<ForecastConfig, 'tenantId'>>
): ForecastConfig {
  const current = getForecastConfig(tenantId);
  const updated: ForecastConfig = {
    ...current,
    ...updates,
    tenantId,
    updatedAt: new Date().toISOString(),
  };
  configStore.set(tenantId, updated);
  return updated;
}

// ============================================
// Export All
// ============================================

export {
  generateHistoricalData,
  generatePredictedData,
  calculateForecastMetrics,
  calculateConfidenceLevel,
  calculateTrend,
  calculateChangePercent,
  mean,
  standardDeviation,
  linearRegression,
  exponentialSmoothing,
  movingAverage,
  detectSeasonality,
  detectAnomalies,
};
