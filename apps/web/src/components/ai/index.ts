// ============================================
// AI Components - FASE 6.1 & 6.2
// Export all AI-related UI components
// ============================================

// Badges
export {
  AIBadge,
  IntentBadge,
  scoreToIntent,
  scoreToTemperature,
  TemperatureBadge,
  UrgencyBadge,
} from './ai-badge';

// Score Components
export { AIScore, AIScoreBadge } from './ai-score';

// Summary Component
export { AISummary } from './ai-summary';

// Insight Components
export { AIInsightCard, AIInsightsList } from './ai-insight-card';

// Classification Component
export { AIClassificationCard } from './ai-classification-card';

// Opportunity Prediction Component
export { AIOpportunityPrediction } from './ai-opportunity-prediction';

// Composite Panels
export { AIAssistantPanel } from './ai-assistant-panel';
export { AIDashboardInsights } from './ai-dashboard-insights';
export { AIOpportunityPanel } from './ai-opportunity-panel';

// Command Palette
export {
  AIActionsButton,
  AICommandPalette,
  useAICommandPalette,
} from './ai-command-palette';

// FASE 6.2 — Suggested Actions Panel
export {
  AISuggestedActionsPanel,
  AISuggestionsBadge,
  AISuggestionsSummary,
} from './ai-suggested-actions';

// FASE 6.2 — Workflow Audit Log
export {
  AIWorkflowAuditLog,
  AIAuditLogEntry,
  AIAuditLogStats,
} from './ai-workflow-audit-log';

// Re-export types for convenience
export type { AIBadgeProps } from './ai-badge';
