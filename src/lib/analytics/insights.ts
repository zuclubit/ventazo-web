// ============================================
// FASE 5.8 — Analytics Insights Generator
// ============================================

import type {
  CustomerAnalytics,
  Insight,
  LeadAnalytics,
  OpportunityAnalytics,
  OverviewKPIs,
  ServiceAnalytics,
  TaskAnalytics,
  WorkflowAnalytics,
} from './types';

// ============================================
// Insight Generators
// ============================================

let insightCounter = 0;
const generateId = () => `insight-${++insightCounter}`;

export function generateOverviewInsights(data: OverviewKPIs): Insight[] {
  const insights: Insight[] = [];

  // Lead conversion insight
  if (data.leadConversionRate > 0) {
    const isGood = data.leadConversionRate >= 20;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : data.leadConversionRate >= 10 ? 'neutral' : 'warning',
      category: 'leads',
      title: `Tasa de conversión: ${data.leadConversionRate.toFixed(1)}%`,
      description: isGood
        ? 'Tu tasa de conversión de leads está por encima del promedio.'
        : 'Considera mejorar el proceso de calificación de leads.',
      metric: `${data.leadConversionRate.toFixed(1)}%`,
      change: data.leadsChange,
      priority: 1,
    });
  }

  // Pipeline value insight
  if (data.pipelineValue > 0) {
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'opportunities',
      title: `Pipeline: $${formatCurrency(data.pipelineValue)}`,
      description: `Valor total del pipeline con ${data.openOpportunities} oportunidades abiertas.`,
      metric: formatCurrency(data.pipelineValue),
      priority: 2,
    });
  }

  // Win rate insight
  if (data.winRate > 0) {
    const isGood = data.winRate >= 30;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : data.winRate >= 15 ? 'neutral' : 'warning',
      category: 'opportunities',
      title: `Win Rate: ${data.winRate.toFixed(1)}%`,
      description: isGood
        ? 'Excelente tasa de cierre de oportunidades.'
        : 'Revisa las razones de pérdida para mejorar el win rate.',
      metric: `${data.winRate.toFixed(1)}%`,
      priority: 3,
    });
  }

  // Tasks overdue insight
  if (data.tasksOverdue > 0) {
    insights.push({
      id: generateId(),
      type: 'warning',
      category: 'tasks',
      title: `${data.tasksOverdue} tareas vencidas`,
      description: 'Hay tareas que requieren atención inmediata.',
      recommendation: 'Prioriza las tareas vencidas para mantener la productividad.',
      priority: 1,
    });
  }

  // Workflow success rate
  if (data.workflowExecutions > 0) {
    const isGood = data.workflowSuccessRate >= 95;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : data.workflowSuccessRate >= 80 ? 'neutral' : 'warning',
      category: 'workflows',
      title: `Workflows: ${data.workflowSuccessRate.toFixed(0)}% éxito`,
      description: `${data.workflowExecutions} ejecuciones en el período.`,
      metric: `${data.workflowSuccessRate.toFixed(0)}%`,
      priority: 4,
    });
  }

  // New customers insight
  if (data.newCustomers > 0) {
    insights.push({
      id: generateId(),
      type: 'positive',
      category: 'customers',
      title: `${data.newCustomers} nuevos clientes`,
      description: 'Nuevos clientes adquiridos en el período.',
      change: data.customersChange,
      priority: 3,
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

export function generateLeadInsights(data: LeadAnalytics): Insight[] {
  const insights: Insight[] = [];

  // Conversion rate trend
  if (data.conversionRate > 0) {
    const benchmark = 15; // industry average
    const diff = data.conversionRate - benchmark;
    insights.push({
      id: generateId(),
      type: diff >= 0 ? 'positive' : 'warning',
      category: 'leads',
      title: diff >= 0 ? 'Conversión por encima del promedio' : 'Conversión por debajo del promedio',
      description: `Tu tasa de conversión es ${Math.abs(diff).toFixed(1)}% ${diff >= 0 ? 'superior' : 'inferior'} al benchmark de la industria.`,
      metric: `${data.conversionRate.toFixed(1)}%`,
      priority: 1,
    });
  }

  // Best lead source
  if (data.bySource.length > 0) {
    const bestSource = data.bySource.reduce((a, b) => (a.conversionRate > b.conversionRate ? a : b));
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'leads',
      title: `Mejor fuente: ${bestSource.source}`,
      description: `${bestSource.source} tiene la mejor tasa de conversión (${bestSource.conversionRate.toFixed(1)}%).`,
      recommendation: 'Considera invertir más en esta fuente de leads.',
      priority: 2,
    });
  }

  // Average conversion time
  if (data.avgConversionTime > 0) {
    const isGood = data.avgConversionTime <= 14;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : 'neutral',
      category: 'leads',
      title: `Tiempo promedio: ${data.avgConversionTime.toFixed(0)} días`,
      description: isGood
        ? 'El ciclo de conversión está optimizado.'
        : 'Considera automatizar el seguimiento para reducir el tiempo.',
      priority: 3,
    });
  }

  // Funnel bottleneck
  if (data.funnel.length > 1) {
    const worstStage = data.funnel.reduce((a, b) => (a.conversionRate < b.conversionRate ? a : b));
    if (worstStage.conversionRate < 50) {
      insights.push({
        id: generateId(),
        type: 'warning',
        category: 'leads',
        title: `Cuello de botella: ${worstStage.stageName}`,
        description: `Solo ${worstStage.conversionRate.toFixed(0)}% de leads avanzan de esta etapa.`,
        recommendation: 'Revisa el proceso en esta etapa del funnel.',
        priority: 1,
      });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

export function generateOpportunityInsights(data: OpportunityAnalytics): Insight[] {
  const insights: Insight[] = [];

  // Win rate analysis
  if (data.winRate > 0) {
    insights.push({
      id: generateId(),
      type: data.winRate >= 25 ? 'positive' : 'neutral',
      category: 'opportunities',
      title: `Win rate: ${data.winRate.toFixed(1)}%`,
      description:
        data.winRate >= 25
          ? 'Tu equipo tiene un buen desempeño cerrando oportunidades.'
          : 'Hay oportunidad de mejorar la tasa de cierre.',
      metric: `${data.winRate.toFixed(1)}%`,
      priority: 1,
    });
  }

  // Average deal size
  if (data.avgWonDealSize > 0) {
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'opportunities',
      title: `Ticket promedio: $${formatCurrency(data.avgWonDealSize)}`,
      description: 'Valor promedio de las oportunidades ganadas.',
      priority: 2,
    });
  }

  // Top loss reason
  const topReason = data.lossReasons[0];
  if (topReason) {
    insights.push({
      id: generateId(),
      type: 'warning',
      category: 'opportunities',
      title: `Principal razón de pérdida: ${topReason.reason}`,
      description: `${topReason.percentage.toFixed(0)}% de las oportunidades perdidas por esta razón.`,
      recommendation: 'Analiza cómo mitigar esta objeción.',
      priority: 1,
    });
  }

  // Sales cycle
  if (data.avgSalesCycle > 0) {
    const isGood = data.avgSalesCycle <= 30;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : 'neutral',
      category: 'opportunities',
      title: `Ciclo de venta: ${data.avgSalesCycle.toFixed(0)} días`,
      description: isGood ? 'Ciclo de venta optimizado.' : 'Considera acelerar las etapas del pipeline.',
      priority: 3,
    });
  }

  // Pipeline stage with most value
  if (data.pipeline.length > 0) {
    const topStage = data.pipeline.reduce((a, b) => (a.value > b.value ? a : b));
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'opportunities',
      title: `Mayor valor en: ${topStage.stageName}`,
      description: `$${formatCurrency(topStage.value)} concentrados en esta etapa.`,
      priority: 4,
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

export function generateTaskInsights(data: TaskAnalytics): Insight[] {
  const insights: Insight[] = [];

  // Completion rate
  if (data.completionRate > 0) {
    const isGood = data.completionRate >= 80;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : data.completionRate >= 60 ? 'neutral' : 'warning',
      category: 'tasks',
      title: `Tasa de completado: ${data.completionRate.toFixed(0)}%`,
      description: isGood
        ? 'El equipo mantiene una buena productividad.'
        : 'Considera revisar la carga de trabajo del equipo.',
      metric: `${data.completionRate.toFixed(0)}%`,
      priority: 1,
    });
  }

  // Overdue tasks
  if (data.overdueTasks > 0) {
    const percentage = (data.overdueTasks / data.totalTasks) * 100;
    insights.push({
      id: generateId(),
      type: percentage > 20 ? 'negative' : 'warning',
      category: 'tasks',
      title: `${data.overdueTasks} tareas vencidas`,
      description: `${percentage.toFixed(0)}% del total de tareas están vencidas.`,
      recommendation: 'Prioriza la resolución de tareas vencidas.',
      priority: 1,
    });
  }

  // Top performer
  if (data.byOwner.length > 0) {
    const topPerformer = data.byOwner.reduce((a, b) => (a.completionRate > b.completionRate ? a : b));
    if (topPerformer.completionRate > 0) {
      insights.push({
        id: generateId(),
        type: 'positive',
        category: 'tasks',
        title: `Top performer: ${topPerformer.userName}`,
        description: `${topPerformer.completionRate.toFixed(0)}% de completado con ${topPerformer.completedTasks} tareas.`,
        priority: 3,
      });
    }
  }

  // Priority distribution
  if (data.byPriority.length > 0) {
    const urgent = data.byPriority.find((p) => p.priority === 'urgent');
    if (urgent && urgent.count > 5) {
      insights.push({
        id: generateId(),
        type: 'warning',
        category: 'tasks',
        title: `${urgent.count} tareas urgentes`,
        description: 'Alta concentración de tareas urgentes pendientes.',
        recommendation: 'Revisa la priorización de tareas.',
        priority: 2,
      });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

export function generateServiceInsights(data: ServiceAnalytics): Insight[] {
  const insights: Insight[] = [];

  // Top category
  const topCategory = data.byCategory[0];
  if (topCategory) {
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'services',
      title: `Categoría líder: ${topCategory.categoryName}`,
      description: `${topCategory.percentage.toFixed(0)}% de los servicios pertenecen a esta categoría.`,
      priority: 1,
    });
  }

  // Service type distribution
  if (data.byType.length > 0) {
    const services = data.byType.find((t) => t.type === 'service');
    const products = data.byType.find((t) => t.type === 'product');
    if (services && products) {
      insights.push({
        id: generateId(),
        type: 'info',
        category: 'services',
        title: `Mix: ${services.percentage.toFixed(0)}% servicios, ${products.percentage.toFixed(0)}% productos`,
        description: 'Distribución entre servicios y productos en el catálogo.',
        priority: 2,
      });
    }
  }

  // Top revenue potential
  const topRevenue = data.revenueByCategory[0];
  if (topRevenue) {
    insights.push({
      id: generateId(),
      type: 'positive',
      category: 'services',
      title: `Mayor potencial: ${topRevenue.category}`,
      description: `${topRevenue.percentage.toFixed(0)}% del revenue potencial del catálogo.`,
      priority: 2,
    });
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

export function generateWorkflowInsights(data: WorkflowAnalytics): Insight[] {
  const insights: Insight[] = [];

  // Success rate
  if (data.totalExecutions > 0) {
    const isGood = data.successRate >= 95;
    insights.push({
      id: generateId(),
      type: isGood ? 'positive' : data.successRate >= 80 ? 'neutral' : 'warning',
      category: 'workflows',
      title: `Tasa de éxito: ${data.successRate.toFixed(1)}%`,
      description: isGood
        ? 'Los workflows funcionan correctamente.'
        : 'Revisa los workflows con fallos frecuentes.',
      metric: `${data.successRate.toFixed(1)}%`,
      priority: 1,
    });
  }

  // Most used trigger
  const topTrigger = data.byTrigger[0];
  if (topTrigger) {
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'workflows',
      title: `Trigger más usado: ${topTrigger.triggerLabel}`,
      description: `${topTrigger.percentage.toFixed(0)}% de las automatizaciones usan este trigger.`,
      priority: 2,
    });
  }

  // Most used action
  const topAction = data.byAction[0];
  if (topAction) {
    insights.push({
      id: generateId(),
      type: 'info',
      category: 'workflows',
      title: `Acción más usada: ${topAction.actionLabel}`,
      description: `${topAction.percentage.toFixed(0)}% de las acciones ejecutadas.`,
      priority: 3,
    });
  }

  // Failed workflows
  if (data.failedExecutions > 0) {
    const failureRate = (data.failedExecutions / data.totalExecutions) * 100;
    if (failureRate > 5) {
      insights.push({
        id: generateId(),
        type: 'warning',
        category: 'workflows',
        title: `${data.failedExecutions} ejecuciones fallidas`,
        description: `${failureRate.toFixed(1)}% de las ejecuciones han fallado.`,
        recommendation: 'Revisa los logs de error para identificar problemas.',
        priority: 1,
      });
    }
  }

  return insights.sort((a, b) => a.priority - b.priority);
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toFixed(0);
}

// ============================================
// Combined Insights Generator
// ============================================

export function generateAllInsights(data: {
  overview?: OverviewKPIs;
  leads?: LeadAnalytics;
  opportunities?: OpportunityAnalytics;
  customers?: CustomerAnalytics;
  tasks?: TaskAnalytics;
  services?: ServiceAnalytics;
  workflows?: WorkflowAnalytics;
}): Insight[] {
  let allInsights: Insight[] = [];

  if (data.overview) {
    allInsights = [...allInsights, ...generateOverviewInsights(data.overview)];
  }
  if (data.leads) {
    allInsights = [...allInsights, ...generateLeadInsights(data.leads)];
  }
  if (data.opportunities) {
    allInsights = [...allInsights, ...generateOpportunityInsights(data.opportunities)];
  }
  if (data.tasks) {
    allInsights = [...allInsights, ...generateTaskInsights(data.tasks)];
  }
  if (data.services) {
    allInsights = [...allInsights, ...generateServiceInsights(data.services)];
  }
  if (data.workflows) {
    allInsights = [...allInsights, ...generateWorkflowInsights(data.workflows)];
  }

  // Sort by priority and return top insights
  return allInsights.sort((a, b) => a.priority - b.priority).slice(0, 10);
}
