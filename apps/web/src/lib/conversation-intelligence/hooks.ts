// ============================================
// FASE 6.3 — Conversation Intelligence Hooks
// React Query hooks for conversation analysis
// ============================================

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  analyzeConversation,
  analyzeEmailThread,
  analyzeCall,
  createCoachingSession,
  generateConversationSummary,
  analyzeSentiment,
  detectIntents,
  detectTopics,
  type AnalyzeConversationParams,
  type AnalyzeEmailThreadParams,
  type AnalyzeCallParams,
  type CreateCoachingSessionParams,
  type EmailThread,
  type CallAnalysisResult,
  type ConversationSummary,
  type CoachingSessionExtended,
} from './engine';

import type {
  ConversationAnalysis,
  CoachingSession,
  SentimentAnalysis,
  IntentDetection,
  TopicDetection,
  ConversationType,
} from './types';

// ============================================
// Query Keys
// ============================================

export const conversationIntelligenceQueryKeys = {
  all: ['conversation-intelligence'] as const,

  // Conversation Analysis
  conversations: (tenantId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'conversations', tenantId] as const,
  conversation: (conversationId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'conversation', conversationId] as const,
  conversationAnalysis: (conversationId: string) =>
    [...conversationIntelligenceQueryKeys.conversation(conversationId), 'analysis'] as const,

  // Email Threads
  emailThreads: (tenantId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'emails', tenantId] as const,
  emailThread: (threadId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'email-thread', threadId] as const,

  // Calls
  calls: (tenantId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'calls', tenantId] as const,
  call: (callId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'call', callId] as const,

  // Coaching
  coachingSessions: (tenantId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'coaching', tenantId] as const,
  coachingSession: (sessionId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'coaching-session', sessionId] as const,
  agentCoaching: (agentId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'agent-coaching', agentId] as const,

  // Summaries
  summary: (conversationId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'summary', conversationId] as const,

  // Batch Analysis
  batchAnalysis: (batchId: string) =>
    [...conversationIntelligenceQueryKeys.all, 'batch', batchId] as const,
};

// ============================================
// Conversation Analysis Hooks
// ============================================

export function useConversationAnalysis(
  params: AnalyzeConversationParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.conversationAnalysis(params.conversationId || 'new'),
    queryFn: () => analyzeConversation(params),
    enabled: options?.enabled !== false && !!params.content,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 60 * 60 * 1000, // 1 hour
  });
}

export function useAnalyzeConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AnalyzeConversationParams) => {
      return Promise.resolve(analyzeConversation(params));
    },
    onSuccess: (analysis) => {
      queryClient.setQueryData(
        conversationIntelligenceQueryKeys.conversationAnalysis(analysis.conversationId),
        analysis
      );
      if (analysis.tenantId) {
        void queryClient.invalidateQueries({
          queryKey: conversationIntelligenceQueryKeys.conversations(analysis.tenantId),
        });
      }
    },
  });
}

export function useBatchAnalyzeConversations() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (conversations: AnalyzeConversationParams[]) => {
      return conversations.map(c => analyzeConversation(c));
    },
    onSuccess: (analyses) => {
      for (const analysis of analyses) {
        queryClient.setQueryData(
          conversationIntelligenceQueryKeys.conversationAnalysis(analysis.conversationId),
          analysis
        );
      }
    },
  });
}

// ============================================
// Sentiment Analysis Hooks
// ============================================

export function useSentimentAnalysis(text: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...conversationIntelligenceQueryKeys.all, 'sentiment', text.slice(0, 50)],
    queryFn: () => analyzeSentiment(text),
    enabled: options?.enabled !== false && !!text,
    staleTime: 30 * 60 * 1000, // 30 minutes
  });
}

export function useAnalyzeSentiment() {
  return useMutation({
    mutationFn: (text: string) => {
      return Promise.resolve(analyzeSentiment(text));
    },
  });
}

// ============================================
// Intent Detection Hooks
// ============================================

export function useIntentDetection(text: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...conversationIntelligenceQueryKeys.all, 'intents', text.slice(0, 50)],
    queryFn: () => detectIntents(text),
    enabled: options?.enabled !== false && !!text,
    staleTime: 30 * 60 * 1000,
  });
}

export function useDetectIntents() {
  return useMutation({
    mutationFn: (text: string) => {
      return Promise.resolve(detectIntents(text));
    },
  });
}

// ============================================
// Topic Detection Hooks
// ============================================

export function useTopicDetection(text: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [...conversationIntelligenceQueryKeys.all, 'topics', text.slice(0, 50)],
    queryFn: () => detectTopics(text),
    enabled: options?.enabled !== false && !!text,
    staleTime: 30 * 60 * 1000,
  });
}

export function useDetectTopics() {
  return useMutation({
    mutationFn: (text: string) => {
      return Promise.resolve(detectTopics(text));
    },
  });
}

// ============================================
// Email Thread Hooks
// ============================================

export function useEmailThreadAnalysis(
  params: AnalyzeEmailThreadParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.emailThread(params.threadId || 'new'),
    queryFn: () => analyzeEmailThread(params),
    enabled: options?.enabled !== false && params.messages.length > 0,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useAnalyzeEmailThread() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AnalyzeEmailThreadParams) => {
      return Promise.resolve(analyzeEmailThread(params));
    },
    onSuccess: (thread) => {
      queryClient.setQueryData(
        conversationIntelligenceQueryKeys.emailThread(thread.id),
        thread
      );
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.emailThreads(thread.tenantId),
      });
    },
  });
}

// ============================================
// Call Analysis Hooks
// ============================================

export function useCallAnalysis(
  params: AnalyzeCallParams,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.call(params.callId || 'new'),
    queryFn: () => analyzeCall(params),
    enabled: options?.enabled !== false && !!params.transcript,
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });
}

export function useAnalyzeCall() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: AnalyzeCallParams) => {
      return Promise.resolve(analyzeCall(params));
    },
    onSuccess: (analysis) => {
      queryClient.setQueryData(
        conversationIntelligenceQueryKeys.call(analysis.callId),
        analysis
      );
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.calls(analysis.tenantId),
      });
    },
  });
}

// ============================================
// Coaching Session Hooks
// ============================================

export function useCoachingSession(sessionId: string, options?: { enabled?: boolean }) {
  // Since we don't have a store, this would need to be backed by an actual API
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.coachingSession(sessionId),
    queryFn: async (): Promise<CoachingSession | null> => {
      // Placeholder - in production this would fetch from API
      return null;
    },
    enabled: options?.enabled !== false && !!sessionId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateCoachingSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: CreateCoachingSessionParams) => {
      return Promise.resolve(createCoachingSession(params));
    },
    onSuccess: (session) => {
      queryClient.setQueryData(
        conversationIntelligenceQueryKeys.coachingSession(session.id),
        session
      );
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.coachingSessions(session.tenantId),
      });
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.agentCoaching(session.agentId),
      });
    },
  });
}

export function useAgentCoachingSessions(
  tenantId: string,
  agentId: string,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.agentCoaching(agentId),
    queryFn: async (): Promise<CoachingSession[]> => {
      // Placeholder - in production this would fetch from API
      return [];
    },
    enabled: options?.enabled !== false && !!agentId,
    staleTime: 5 * 60 * 1000,
  });
}

// ============================================
// Summary Generation Hooks
// ============================================

export function useConversationSummary(
  analysis: ConversationAnalysis | null,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: conversationIntelligenceQueryKeys.summary(analysis?.conversationId || 'none'),
    queryFn: () => {
      if (!analysis) throw new Error('No analysis provided');
      return generateConversationSummary(analysis);
    },
    enabled: options?.enabled !== false && !!analysis,
    staleTime: 30 * 60 * 1000,
  });
}

export function useGenerateConversationSummary() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (analysis: ConversationAnalysis) => {
      return Promise.resolve(generateConversationSummary(analysis));
    },
    onSuccess: (summary) => {
      queryClient.setQueryData(
        conversationIntelligenceQueryKeys.summary(summary.conversationId),
        summary
      );
    },
  });
}

// ============================================
// Real-time Analysis Hook
// ============================================

interface UseRealtimeAnalysisParams {
  tenantId: string;
  type: ConversationType;
  onSentimentChange?: (sentiment: SentimentAnalysis) => void;
  onIntentDetected?: (intents: IntentDetection[]) => void;
  onTopicDetected?: (topics: TopicDetection[]) => void;
  enabled?: boolean;
}

export function useRealtimeAnalysis({
  tenantId,
  type,
  onSentimentChange,
  onIntentDetected,
  onTopicDetected,
  enabled = true,
}: UseRealtimeAnalysisParams) {
  const analyzeMutation = useAnalyzeConversation();

  const analyzeIncrementally = (content: string, participants: string[]) => {
    if (!enabled) return;

    // Analyze sentiment
    const sentiment = analyzeSentiment(content);
    if (onSentimentChange) {
      onSentimentChange(sentiment);
    }

    // Detect intents
    const intents = detectIntents(content);
    if (onIntentDetected && intents.length > 0) {
      onIntentDetected(intents);
    }

    // Detect topics
    const topics = detectTopics(content);
    if (onTopicDetected && topics.length > 0) {
      onTopicDetected(topics);
    }

    // Return full analysis
    return analyzeMutation.mutateAsync({
      tenantId,
      type,
      content,
      participants,
    });
  };

  return {
    analyzeIncrementally,
    isAnalyzing: analyzeMutation.isPending,
    lastAnalysis: analyzeMutation.data,
    error: analyzeMutation.error,
  };
}

// ============================================
// Combined Hooks
// ============================================

interface UseConversationIntelligenceParams {
  tenantId: string;
  entityType: 'lead' | 'deal' | 'customer';
  entityId: string;
  enabled?: boolean;
}

export function useConversationIntelligence({
  tenantId,
  entityType,
  entityId,
  enabled = true,
}: UseConversationIntelligenceParams) {
  // In a real implementation, these would fetch conversations from the API
  const emailThreadsQuery = useQuery({
    queryKey: [...conversationIntelligenceQueryKeys.emailThreads(tenantId), entityType, entityId],
    queryFn: async (): Promise<EmailThread[]> => {
      // Placeholder - fetch email threads related to entity
      return [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const callsQuery = useQuery({
    queryKey: [...conversationIntelligenceQueryKeys.calls(tenantId), entityType, entityId],
    queryFn: async (): Promise<CallAnalysisResult[]> => {
      // Placeholder - fetch calls related to entity
      return [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  return {
    emailThreads: emailThreadsQuery.data || [],
    calls: callsQuery.data || [],
    isLoading: emailThreadsQuery.isLoading || callsQuery.isLoading,
    isError: emailThreadsQuery.isError || callsQuery.isError,
    refetch: () => {
      void emailThreadsQuery.refetch();
      void callsQuery.refetch();
    },
  };
}

// ============================================
// Coaching Dashboard Hook
// ============================================

interface UseCoachingDashboardParams {
  tenantId: string;
  agentId?: string;
  enabled?: boolean;
}

export function useCoachingDashboard({
  tenantId,
  agentId,
  enabled = true,
}: UseCoachingDashboardParams) {
  const sessionsQuery = useQuery({
    queryKey: agentId
      ? conversationIntelligenceQueryKeys.agentCoaching(agentId)
      : conversationIntelligenceQueryKeys.coachingSessions(tenantId),
    queryFn: async (): Promise<CoachingSessionExtended[]> => {
      // Placeholder - fetch coaching sessions
      return [];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  // Calculate aggregate metrics
  const aggregateMetrics = sessionsQuery.data?.reduce(
    (acc, session) => {
      acc.totalSessions++;
      acc.averageScore += session.overallScore;

      for (const metric of session.metrics) {
        if (!acc.metricAverages[metric.name]) {
          acc.metricAverages[metric.name] = { total: 0, count: 0 };
        }
        acc.metricAverages[metric.name]!.total += metric.score;
        acc.metricAverages[metric.name]!.count++;
      }

      return acc;
    },
    {
      totalSessions: 0,
      averageScore: 0,
      metricAverages: {} as Record<string, { total: number; count: number }>,
    }
  );

  if (aggregateMetrics && aggregateMetrics.totalSessions > 0) {
    aggregateMetrics.averageScore /= aggregateMetrics.totalSessions;
  }

  return {
    sessions: sessionsQuery.data || [],
    aggregateMetrics,
    isLoading: sessionsQuery.isLoading,
    isError: sessionsQuery.isError,
    refetch: () => void sessionsQuery.refetch(),
  };
}

// ============================================
// Invalidation Helpers
// ============================================

export function useInvalidateConversationAnalysis() {
  const queryClient = useQueryClient();

  return (conversationId?: string) => {
    if (conversationId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.conversationAnalysis(conversationId),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.all,
      });
    }
  };
}

export function useInvalidateEmailThreads() {
  const queryClient = useQueryClient();

  return (tenantId?: string, threadId?: string) => {
    if (threadId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.emailThread(threadId),
      });
    } else if (tenantId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.emailThreads(tenantId),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: [...conversationIntelligenceQueryKeys.all, 'emails'],
      });
    }
  };
}

export function useInvalidateCalls() {
  const queryClient = useQueryClient();

  return (tenantId?: string, callId?: string) => {
    if (callId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.call(callId),
      });
    } else if (tenantId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.calls(tenantId),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: [...conversationIntelligenceQueryKeys.all, 'calls'],
      });
    }
  };
}

export function useInvalidateCoaching() {
  const queryClient = useQueryClient();

  return (tenantId?: string, agentId?: string) => {
    if (agentId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.agentCoaching(agentId),
      });
    } else if (tenantId) {
      void queryClient.invalidateQueries({
        queryKey: conversationIntelligenceQueryKeys.coachingSessions(tenantId),
      });
    } else {
      void queryClient.invalidateQueries({
        queryKey: [...conversationIntelligenceQueryKeys.all, 'coaching'],
      });
    }
  };
}
