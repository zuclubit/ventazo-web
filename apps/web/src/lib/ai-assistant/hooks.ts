'use client';

import * as React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { useTenantValidation } from '@/lib/tenant';
import { useAuthStore } from '@/store/auth.store';

import type {
  AIAgentRequest,
  AIAgentResponse,
  AISentimentRequest,
  AISentimentResponse,
  AILeadScoreRequest,
  AILeadScoreResponse,
  AIEmailRequest,
  AIEmailResponse,
  AIChatRequest,
  AIChatResponse,
  AIConfirmationResponse,
  AIHealthResponse,
  AIAssistantSettings,
  AIChatMessage,
  DEFAULT_AI_SETTINGS,
} from './types';

// ============================================
// AI API Client (separate from main API)
// ============================================

const AI_API_BASE = '/api/ai';

/**
 * Fetch wrapper for AI API calls
 */
async function aiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${AI_API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(
      (errorData as { message?: string }).message ||
        `AI API Error: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

// ============================================
// Query Keys
// ============================================

export const aiAssistantKeys = {
  all: ['ai-assistant'] as const,
  health: () => [...aiAssistantKeys.all, 'health'] as const,
  conversations: () => [...aiAssistantKeys.all, 'conversations'] as const,
  conversation: (id: string) => [...aiAssistantKeys.conversations(), id] as const,
  settings: () => [...aiAssistantKeys.all, 'settings'] as const,
  history: () => [...aiAssistantKeys.all, 'history'] as const,
};

// ============================================
// Health Check Hook
// ============================================

/**
 * Hook to check AI service health
 */
export function useAIHealth() {
  return useQuery({
    queryKey: aiAssistantKeys.health(),
    queryFn: async () => {
      const response = await aiFetch<AIHealthResponse>('/health');
      return response;
    },
    staleTime: 30000, // 30 seconds
    retry: 1,
  });
}

// ============================================
// Agent/Chat Hooks
// ============================================

/**
 * Hook to send messages to the AI agent
 */
export function useAIAgent() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      message,
      conversationId,
      metadata,
    }: {
      message: string;
      conversationId?: string;
      metadata?: Record<string, unknown>;
    }) => {
      if (!user || !tenantId) {
        throw new Error('User context required');
      }

      const request: AIAgentRequest = {
        message,
        conversationId,
        tenantId,
        user: {
          userId: user.id,
          email: user.email,
          displayName: user.fullName || user.email,
          role: user.role || 'member',
          permissions: user.permissions || [],
          locale: 'es-MX',
        },
        metadata,
      };

      const response = await aiFetch<AIAgentResponse>('/agent', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
    onSuccess: (data) => {
      // Invalidate conversation history
      if (data.conversationId) {
        void queryClient.invalidateQueries({
          queryKey: aiAssistantKeys.conversation(data.conversationId),
        });
      }
      void queryClient.invalidateQueries({ queryKey: aiAssistantKeys.history() });
    },
  });
}

/**
 * Hook for simple chat without tools
 */
export function useAIChat() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      messages,
      preferredProvider,
      preferredModel,
    }: {
      messages: AIChatMessage[];
      preferredProvider?: string;
      preferredModel?: string;
    }) => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const request: AIChatRequest = {
        messages,
        tenantId,
        preferredProvider,
        preferredModel,
      };

      const response = await aiFetch<AIChatResponse>('/chat', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
  });
}

/**
 * Hook to confirm or cancel a pending action
 */
export function useAIConfirmation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: AIConfirmationResponse) => {
      const response = await aiFetch<AIAgentResponse>('/agent/confirm', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiAssistantKeys.history() });
    },
  });
}

// ============================================
// Sentiment Analysis Hook
// ============================================

/**
 * Hook to analyze text sentiment
 */
export function useAISentiment() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (text: string) => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const request: AISentimentRequest = {
        text,
        tenantId,
      };

      const response = await aiFetch<AISentimentResponse>('/sentiment/analyze', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
  });
}

// ============================================
// Lead Scoring Hook
// ============================================

/**
 * Hook to score a lead using AI
 */
export function useAILeadScore() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async (leadData: Record<string, unknown>) => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const request: AILeadScoreRequest = {
        leadData,
        tenantId,
      };

      const response = await aiFetch<AILeadScoreResponse>('/lead/score', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
  });
}

// ============================================
// Email Generation Hook
// ============================================

/**
 * Hook to generate email content
 */
export function useAIEmailGenerate() {
  const { tenantId } = useTenantValidation();

  return useMutation({
    mutationFn: async ({
      type,
      context,
    }: Omit<AIEmailRequest, 'tenantId'>) => {
      if (!tenantId) {
        throw new Error('Tenant ID required');
      }

      const request: AIEmailRequest = {
        type,
        context,
        tenantId,
      };

      const response = await aiFetch<AIEmailResponse>('/email/generate', {
        method: 'POST',
        body: JSON.stringify(request),
      });
      return response;
    },
  });
}

// ============================================
// Conversation History Hook
// ============================================

export interface ConversationSummary {
  id: string;
  title: string;
  lastMessage: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * Hook to get conversation history
 */
export function useAIConversations() {
  const { isValid, tenantId } = useTenantValidation();

  return useQuery({
    queryKey: aiAssistantKeys.conversations(),
    queryFn: async () => {
      const response = await aiFetch<{
        data: ConversationSummary[];
        meta: { total: number };
      }>('/conversations');
      return response;
    },
    enabled: isValid && !!tenantId,
  });
}

// ============================================
// Settings Hook
// ============================================

/**
 * Hook to manage AI Assistant settings
 */
export function useAISettings() {
  const queryClient = useQueryClient();
  const { isValid, tenantId } = useTenantValidation();

  const query = useQuery({
    queryKey: aiAssistantKeys.settings(),
    queryFn: async () => {
      try {
        const response = await aiFetch<AIAssistantSettings>('/settings');
        return response;
      } catch {
        // Return defaults if settings don't exist
        return {
          enabled: true,
          preferredProvider: 'auto' as const,
          language: 'es' as const,
          autoSuggestions: true,
          emailAssistance: true,
          leadScoring: true,
          sentimentAnalysis: true,
        };
      }
    },
    enabled: isValid && !!tenantId,
  });

  const mutation = useMutation({
    mutationFn: async (settings: Partial<AIAssistantSettings>) => {
      const response = await aiFetch<AIAssistantSettings>('/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      return response;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: aiAssistantKeys.settings() });
    },
  });

  return {
    settings: query.data,
    isLoading: query.isLoading,
    error: query.error,
    updateSettings: mutation.mutateAsync,
    isUpdating: mutation.isPending,
  };
}

// ============================================
// Combined Hook for Assistant Page
// ============================================

export interface UseAIAssistantReturn {
  // State
  messages: AIChatMessage[];
  conversationId: string | null;
  isLoading: boolean;
  error: Error | null;
  pendingConfirmation: AIAgentResponse['confirmationRequired'] | null;

  // Actions
  sendMessage: (message: string) => Promise<void>;
  confirmAction: (decision: 'confirm' | 'cancel' | 'modify', modifications?: Record<string, unknown>) => Promise<void>;
  clearConversation: () => void;
  startNewConversation: () => void;
}

/**
 * Combined hook for the AI Assistant interface
 */
export function useAIAssistant(): UseAIAssistantReturn {
  const [messages, setMessages] = React.useState<AIChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [pendingConfirmation, setPendingConfirmation] = React.useState<
    AIAgentResponse['confirmationRequired'] | null
  >(null);

  const agentMutation = useAIAgent();
  const confirmMutation = useAIConfirmation();

  const sendMessage = React.useCallback(
    async (message: string) => {
      // Add user message to state immediately
      const userMessage: AIChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const response = await agentMutation.mutateAsync({
          message,
          conversationId: conversationId ?? undefined,
        });

        // Update conversation ID
        if (response.conversationId) {
          setConversationId(response.conversationId);
        }

        // Add assistant response
        const assistantMessage: AIChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Handle confirmation request
        if (response.confirmationRequired) {
          setPendingConfirmation(response.confirmationRequired);
        }
      } catch (error) {
        // Add error message
        const errorMessage: AIChatMessage = {
          role: 'assistant',
          content: 'Lo siento, ocurrió un error al procesar tu mensaje. Por favor, intenta de nuevo.',
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, errorMessage]);
        throw error;
      }
    },
    [agentMutation, conversationId]
  );

  const confirmAction = React.useCallback(
    async (
      decision: 'confirm' | 'cancel' | 'modify',
      modifications?: Record<string, unknown>
    ) => {
      if (!pendingConfirmation) return;

      try {
        const response = await confirmMutation.mutateAsync({
          requestId: pendingConfirmation.requestId,
          decision,
          modifications,
        });

        // Add confirmation response
        const confirmMessage: AIChatMessage = {
          role: 'assistant',
          content: response.response,
          timestamp: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, confirmMessage]);

        // Clear pending confirmation
        setPendingConfirmation(null);
      } catch (error) {
        throw error;
      }
    },
    [confirmMutation, pendingConfirmation]
  );

  const clearConversation = React.useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setPendingConfirmation(null);
  }, []);

  const startNewConversation = React.useCallback(() => {
    clearConversation();
    // Add welcome message
    const welcomeMessage: AIChatMessage = {
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente de IA. Puedo ayudarte con:\n\n' +
        '• Gestionar leads y oportunidades\n' +
        '• Analizar el sentimiento de mensajes\n' +
        '• Generar emails profesionales\n' +
        '• Responder preguntas sobre tu CRM\n\n' +
        '¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, [clearConversation]);

  return {
    messages,
    conversationId,
    isLoading: agentMutation.isPending || confirmMutation.isPending,
    error: agentMutation.error || confirmMutation.error,
    pendingConfirmation,
    sendMessage,
    confirmAction,
    clearConversation,
    startNewConversation,
  };
}
