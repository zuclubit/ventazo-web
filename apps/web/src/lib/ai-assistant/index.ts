// ============================================
// AI Assistant Module - Ventazo CRM
// Integration with zuclubit-bot-helper
// ============================================

// Types
export type {
  AIUserContext,
  AIChatMessage,
  AIToolExecution,
  AIConfirmationRequest,
  AIAgentRequest,
  AIAgentResponse,
  AISentimentRequest,
  AISentimentResponse,
  AILeadScoreRequest,
  AILeadScoreFactor,
  AILeadScoreResponse,
  AIEmailType,
  AIEmailContext,
  AIEmailRequest,
  AIEmailResponse,
  AIChatRequest,
  AIChatResponse,
  AIConfirmationResponse,
  AIAssistantSettings,
  AIHealthResponse,
} from './types';

export { DEFAULT_AI_SETTINGS } from './types';

// Hooks
export {
  aiAssistantKeys,
  useAIHealth,
  useAIAgent,
  useAIChat,
  useAIConfirmation,
  useAISentiment,
  useAILeadScore,
  useAIEmailGenerate,
  useAIConversations,
  useAISettings,
  useAIAssistant,
} from './hooks';

export type { ConversationSummary, UseAIAssistantReturn } from './hooks';

// Streaming Module
export * from './streaming';
