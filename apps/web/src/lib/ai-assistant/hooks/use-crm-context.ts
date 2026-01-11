'use client';

/**
 * CRM Context Hook
 *
 * Detects the current CRM page/entity and provides context-aware
 * information and suggested actions for the AI assistant.
 *
 * @module lib/ai-assistant/hooks/use-crm-context
 */

import * as React from 'react';
import { usePathname, useParams } from 'next/navigation';

// ============================================
// Types
// ============================================

export type CrmEntityType =
  | 'lead'
  | 'opportunity'
  | 'customer'
  | 'task'
  | 'quote'
  | 'service'
  | 'workflow'
  | 'campaign'
  | 'dashboard'
  | 'kanban'
  | 'calendar'
  | 'email'
  | 'analytics'
  | 'settings'
  | 'assistant'
  | null;

export interface CrmContextEntity {
  type: CrmEntityType;
  id: string | null;
  isDetailView: boolean;
  isListView: boolean;
}

export interface SuggestedAction {
  label: string;
  prompt: string;
  icon: string;
  priority: number;
}

export interface CrmContext {
  /** Current entity being viewed */
  entity: CrmContextEntity;
  /** Current page path */
  path: string;
  /** Context-aware suggested actions */
  suggestedActions: SuggestedAction[];
  /** Context string to send to AI */
  contextPrompt: string | null;
  /** Whether user is in a CRM entity page */
  hasEntityContext: boolean;
}

// ============================================
// Entity Detection
// ============================================

const ENTITY_PATTERNS: Record<string, CrmEntityType> = {
  '/app/leads': 'lead',
  '/app/opportunities': 'opportunity',
  '/app/customers': 'customer',
  '/app/tasks': 'task',
  '/app/quotes': 'quote',
  '/app/services': 'service',
  '/app/workflows': 'workflow',
  '/app/campaigns': 'campaign',
  '/app/dashboard': 'dashboard',
  '/app/kanban': 'kanban',
  '/app/calendar': 'calendar',
  '/app/email': 'email',
  '/app/analytics': 'analytics',
  '/app/settings': 'settings',
  '/app/assistant': 'assistant',
};

function detectEntityType(pathname: string): CrmEntityType {
  // Check for specific patterns first
  for (const [pattern, type] of Object.entries(ENTITY_PATTERNS)) {
    if (pathname.startsWith(pattern)) {
      return type;
    }
  }
  return null;
}

function detectEntityId(pathname: string, params: Record<string, string | string[] | undefined>): string | null {
  // Check for dynamic route params
  if (params.leadId && typeof params.leadId === 'string') return params.leadId;
  if (params.opportunityId && typeof params.opportunityId === 'string') return params.opportunityId;
  if (params.customerId && typeof params.customerId === 'string') return params.customerId;
  if (params.taskId && typeof params.taskId === 'string') return params.taskId;
  if (params.serviceId && typeof params.serviceId === 'string') return params.serviceId;
  if (params.workflowId && typeof params.workflowId === 'string') return params.workflowId;
  if (params.id && typeof params.id === 'string') return params.id;

  // Check for UUID pattern in pathname
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const match = pathname.match(uuidPattern);
  return match ? match[0] : null;
}

// ============================================
// Suggested Actions by Entity
// ============================================

const BASE_ACTIONS: SuggestedAction[] = [
  { label: 'Mis tareas pendientes', prompt: 'Muéstrame mis tareas pendientes de hoy', icon: '✅', priority: 10 },
  { label: 'Resumen del día', prompt: '¿Cuál es el resumen de mi actividad de hoy?', icon: '📊', priority: 9 },
];

const ENTITY_ACTIONS: Record<CrmEntityType, SuggestedAction[]> = {
  lead: [
    { label: 'Analizar este lead', prompt: 'Analiza este lead y dame recomendaciones', icon: '🔍', priority: 20 },
    { label: 'Crear tarea de seguimiento', prompt: 'Crea una tarea de seguimiento para este lead', icon: '📝', priority: 19 },
    { label: 'Redactar email', prompt: 'Redacta un email de seguimiento para este lead', icon: '✉️', priority: 18 },
    { label: 'Convertir a oportunidad', prompt: '¿Debería convertir este lead en oportunidad?', icon: '🎯', priority: 17 },
  ],
  opportunity: [
    { label: 'Analizar oportunidad', prompt: 'Analiza esta oportunidad y su probabilidad de cierre', icon: '📈', priority: 20 },
    { label: 'Próximos pasos', prompt: '¿Cuáles deberían ser los próximos pasos para esta oportunidad?', icon: '🚀', priority: 19 },
    { label: 'Crear cotización', prompt: 'Ayúdame a crear una cotización para esta oportunidad', icon: '📄', priority: 18 },
    { label: 'Historial de actividad', prompt: 'Muéstrame el historial de actividad de esta oportunidad', icon: '📋', priority: 17 },
  ],
  customer: [
    { label: 'Ver historial', prompt: 'Muéstrame el historial completo de este cliente', icon: '📜', priority: 20 },
    { label: 'Oportunidades activas', prompt: '¿Cuáles son las oportunidades activas con este cliente?', icon: '🎯', priority: 19 },
    { label: 'Programar reunión', prompt: 'Programa una reunión de seguimiento con este cliente', icon: '📅', priority: 18 },
    { label: 'Análisis de valor', prompt: 'Analiza el valor total de este cliente', icon: '💰', priority: 17 },
  ],
  task: [
    { label: 'Completar tarea', prompt: 'Marca esta tarea como completada', icon: '✅', priority: 20 },
    { label: 'Reprogramar', prompt: 'Reprograma esta tarea para mañana', icon: '📅', priority: 19 },
    { label: 'Agregar notas', prompt: 'Agrega notas de seguimiento a esta tarea', icon: '📝', priority: 18 },
    { label: 'Asignar a otro', prompt: 'Reasigna esta tarea a otro miembro del equipo', icon: '👥', priority: 17 },
  ],
  quote: [
    { label: 'Revisar cotización', prompt: 'Revisa esta cotización y sugiere mejoras', icon: '📋', priority: 20 },
    { label: 'Enviar al cliente', prompt: 'Envía esta cotización al cliente por email', icon: '✉️', priority: 19 },
    { label: 'Crear versión', prompt: 'Crea una nueva versión de esta cotización', icon: '📄', priority: 18 },
    { label: 'Convertir a venta', prompt: 'Convierte esta cotización en una venta', icon: '🎉', priority: 17 },
  ],
  service: [
    { label: 'Ver estadísticas', prompt: 'Muéstrame las estadísticas de ventas de este servicio', icon: '📊', priority: 20 },
    { label: 'Clientes que compran', prompt: '¿Qué clientes han comprado este servicio?', icon: '👥', priority: 19 },
    { label: 'Sugerir precio', prompt: 'Sugiere un precio óptimo para este servicio', icon: '💵', priority: 18 },
  ],
  workflow: [
    { label: 'Estado del workflow', prompt: 'Muéstrame el estado actual de este workflow', icon: '📊', priority: 20 },
    { label: 'Optimizar pasos', prompt: 'Sugiere optimizaciones para este workflow', icon: '⚡', priority: 19 },
    { label: 'Ver ejecuciones', prompt: 'Muéstrame las últimas ejecuciones de este workflow', icon: '📋', priority: 18 },
  ],
  campaign: [
    { label: 'Métricas de campaña', prompt: 'Muéstrame las métricas de esta campaña', icon: '📈', priority: 20 },
    { label: 'Leads generados', prompt: '¿Cuántos leads ha generado esta campaña?', icon: '👥', priority: 19 },
    { label: 'ROI estimado', prompt: 'Calcula el ROI de esta campaña', icon: '💰', priority: 18 },
  ],
  dashboard: [
    { label: 'KPIs principales', prompt: 'Muéstrame los KPIs principales de hoy', icon: '📊', priority: 20 },
    { label: 'Leads calientes', prompt: 'Muéstrame los leads más calientes', icon: '🔥', priority: 19 },
    { label: 'Oportunidades a cerrar', prompt: '¿Qué oportunidades están próximas a cerrarse?', icon: '🎯', priority: 18 },
    { label: 'Actividad del equipo', prompt: 'Resumen de la actividad del equipo hoy', icon: '👥', priority: 17 },
  ],
  kanban: [
    { label: 'Resumen del pipeline', prompt: 'Dame un resumen del estado del pipeline', icon: '📊', priority: 20 },
    { label: 'Leads estancados', prompt: '¿Hay leads estancados que necesiten atención?', icon: '⚠️', priority: 19 },
    { label: 'Mover leads', prompt: 'Sugiere qué leads deberían avanzar de etapa', icon: '➡️', priority: 18 },
  ],
  calendar: [
    { label: 'Agenda de hoy', prompt: '¿Qué tengo en mi agenda de hoy?', icon: '📅', priority: 20 },
    { label: 'Programar reunión', prompt: 'Programa una reunión de seguimiento', icon: '🗓️', priority: 19 },
    { label: 'Disponibilidad', prompt: '¿Cuándo tengo disponibilidad esta semana?', icon: '⏰', priority: 18 },
  ],
  email: [
    { label: 'Redactar email', prompt: 'Ayúdame a redactar un email profesional', icon: '✉️', priority: 20 },
    { label: 'Responder email', prompt: 'Sugiere una respuesta a este email', icon: '↩️', priority: 19 },
    { label: 'Emails pendientes', prompt: '¿Tengo emails pendientes de responder?', icon: '📬', priority: 18 },
  ],
  analytics: [
    { label: 'Tendencias', prompt: 'Muéstrame las tendencias de ventas del mes', icon: '📈', priority: 20 },
    { label: 'Rendimiento del equipo', prompt: 'Analiza el rendimiento del equipo de ventas', icon: '👥', priority: 19 },
    { label: 'Proyecciones', prompt: 'Genera proyecciones para el próximo mes', icon: '🔮', priority: 18 },
  ],
  settings: [
    { label: 'Ayuda con configuración', prompt: '¿Cómo configuro las integraciones?', icon: '⚙️', priority: 20 },
    { label: 'Permisos del equipo', prompt: 'Explícame los roles y permisos', icon: '🔐', priority: 19 },
  ],
  assistant: [
    { label: 'Mis leads activos', prompt: 'Muéstrame mis leads activos', icon: '📋', priority: 20 },
    { label: 'Crear tarea', prompt: 'Crea una tarea de seguimiento para mañana', icon: '✅', priority: 19 },
    { label: 'Resumen del día', prompt: '¿Cuál es el resumen de mi día?', icon: '📊', priority: 18 },
    { label: 'Leads calientes', prompt: 'Muéstrame los leads con score mayor a 70', icon: '🔥', priority: 17 },
  ],
};

// ============================================
// Context Prompt Generation
// ============================================

function generateContextPrompt(entity: CrmContextEntity): string | null {
  if (!entity.type || entity.type === 'assistant') return null;

  const entityLabels: Record<CrmEntityType, string> = {
    lead: 'un lead',
    opportunity: 'una oportunidad',
    customer: 'un cliente',
    task: 'una tarea',
    quote: 'una cotización',
    service: 'un servicio',
    workflow: 'un workflow',
    campaign: 'una campaña',
    dashboard: 'el dashboard',
    kanban: 'el kanban de leads',
    calendar: 'el calendario',
    email: 'la bandeja de email',
    analytics: 'los reportes de análisis',
    settings: 'la configuración',
    assistant: '',
  };

  const label = entityLabels[entity.type as CrmEntityType] || entity.type;

  if (entity.isDetailView && entity.id) {
    return `El usuario está viendo ${label} específico con ID: ${entity.id}. Puedes usar las herramientas CRM para obtener información detallada de esta entidad.`;
  }

  if (entity.isListView) {
    return `El usuario está en la vista de lista de ${label}s. Puedes ayudarle a buscar, filtrar o realizar acciones sobre múltiples ${label}s.`;
  }

  return `El usuario está en la sección de ${label}.`;
}

// ============================================
// Hook Implementation
// ============================================

export function useCrmContext(): CrmContext {
  const pathname = usePathname();
  const params = useParams();

  const context = React.useMemo((): CrmContext => {
    const entityType = detectEntityType(pathname);
    const entityId = detectEntityId(pathname, params);

    const entity: CrmContextEntity = {
      type: entityType,
      id: entityId,
      isDetailView: !!entityId,
      isListView: !entityId && !!entityType && !['dashboard', 'kanban', 'calendar', 'email', 'assistant', 'settings'].includes(entityType),
    };

    // Get entity-specific actions
    const entityActions = entityType && entityType !== 'assistant'
      ? ENTITY_ACTIONS[entityType] || []
      : ENTITY_ACTIONS.assistant;

    // Combine and sort by priority
    const allActions = [...entityActions, ...BASE_ACTIONS];
    const sortedActions = allActions.sort((a, b) => b.priority - a.priority).slice(0, 4);

    return {
      entity,
      path: pathname,
      suggestedActions: sortedActions,
      contextPrompt: generateContextPrompt(entity),
      hasEntityContext: !!entityType && entityType !== 'assistant',
    };
  }, [pathname, params]);

  return context;
}

export default useCrmContext;
