// ============================================
// FASE 6.3 — Conversation Intelligence
// Main exports
// ============================================

// Types
export * from './types';

// Engine
export {
  // Main Analysis
  analyzeConversation,
  type AnalyzeConversationParams,

  // Email Analysis
  analyzeEmailThread,
  type AnalyzeEmailThreadParams,
  type EmailMessage,
  type EmailThread,

  // Call Analysis
  analyzeCall,
  type AnalyzeCallParams,
  type CallAnalysisResult,

  // Coaching
  createCoachingSession,
  type CreateCoachingSessionParams,
  type CoachingSessionExtended,

  // Summary
  generateConversationSummary,
  type ConversationSummary,

  // Individual Analyzers
  analyzeSentiment,
  detectIntents,
  detectTopics,
  extractActionItems,
  detectSignals,
  generateInsights,
  generateRecommendations,
  extractKeyPhrases,

  // Formatters
  formatIntent,
  formatTopic,
} from './engine';

// Hooks
export {
  // Query Keys
  conversationIntelligenceQueryKeys,

  // Conversation Analysis Hooks
  useConversationAnalysis,
  useAnalyzeConversation,
  useBatchAnalyzeConversations,

  // Sentiment Analysis Hooks
  useSentimentAnalysis,
  useAnalyzeSentiment,

  // Intent Detection Hooks
  useIntentDetection,
  useDetectIntents,

  // Topic Detection Hooks
  useTopicDetection,
  useDetectTopics,

  // Email Thread Hooks
  useEmailThreadAnalysis,
  useAnalyzeEmailThread,

  // Call Analysis Hooks
  useCallAnalysis,
  useAnalyzeCall,

  // Coaching Session Hooks
  useCoachingSession,
  useCreateCoachingSession,
  useAgentCoachingSessions,

  // Summary Hooks
  useConversationSummary,
  useGenerateConversationSummary,

  // Real-time Analysis Hook
  useRealtimeAnalysis,

  // Combined Hooks
  useConversationIntelligence,
  useCoachingDashboard,

  // Invalidation Helpers
  useInvalidateConversationAnalysis,
  useInvalidateEmailThreads,
  useInvalidateCalls,
  useInvalidateCoaching,
} from './hooks';
