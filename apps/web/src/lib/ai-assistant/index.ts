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
  useAIConversation,
  useCreateConversation,
  useArchiveConversation,
  useDeleteConversation,
  useAISettings,
  useAIAssistant,
} from './hooks';

export type {
  ConversationSummary,
  ConversationMessage,
  ConversationWithMessages,
  UseAIAssistantReturn,
} from './hooks';

// Streaming Module
export * from './streaming';

// CRM Context Hook
export { useCrmContext } from './hooks/use-crm-context';
export type {
  CrmEntityType,
  CrmContextEntity,
  SuggestedAction,
  CrmContext,
} from './hooks/use-crm-context';
