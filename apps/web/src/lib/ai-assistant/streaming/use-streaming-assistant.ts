'use client';

/**
 * Streaming Assistant Hook
 *
 * Drop-in replacement for useAIAssistant that uses SSE streaming
 * for real-time token-by-token responses.
 *
 * API is compatible with the original useAIAssistant hook for easy migration.
 *
 * @module lib/ai-assistant/streaming/use-streaming-assistant
 */

import * as React from 'react';

import type { AIChatMessage } from '../types';
import type { ConversationMessage } from '../hooks';
import { useStreamingChat } from './use-streaming-chat';

// ============================================
// Types (Compatible with useAIAssistant)
// ============================================

/** Tool execution result */
export interface ToolExecution {
  id: string;
  name: string;
  parameters: Record<string, unknown>;
  status: 'pending' | 'executing' | 'success' | 'error';
  result?: unknown;
  error?: string;
  executionTimeMs?: number;
}

/** Context to pass to the AI for entity-aware responses */
export interface CrmContextInfo {
  entityType?: 'lead' | 'customer' | 'opportunity' | 'task' | 'quote';
  entityId?: string;
  contextPrompt?: string | null;
}

export interface UseStreamingAssistantReturn {
  /** Message history */
  messages: AIChatMessage[];
  /** Conversation ID */
  conversationId: string | null;
  /** Whether currently loading/streaming */
  isLoading: boolean;
  /** Whether streaming token-by-token */
  isStreaming: boolean;
  /** Whether executing tools */
  isExecutingTools: boolean;
  /** Whether loading existing conversation */
  isLoadingConversation: boolean;
  /** Current error */
  error: Error | null;
  /** Pending confirmation request */
  pendingConfirmation: {
    requestId: string;
    action: string;
    description: string;
  } | null;
  /** Executed tool actions */
  executedActions: ToolExecution[];
  /** Send a message (starts streaming) */
  sendMessage: (message: string, context?: CrmContextInfo) => Promise<void>;
  /** Confirm/cancel pending action */
  confirmAction: (
    decision: 'confirm' | 'cancel' | 'modify',
    modifications?: Record<string, unknown>
  ) => Promise<void>;
  /** Clear conversation */
  clearConversation: () => void;
  /** Start new conversation */
  startNewConversation: () => void;
  /** Cancel current stream */
  cancelStream: () => void;
  /** Load an existing conversation */
  loadConversation: (id: string) => Promise<void>;
  /** Set conversation ID without loading */
  setActiveConversation: (id: string | null) => void;
}

// ============================================
// Hook Implementation
// ============================================

export function useStreamingAssistant(
  initialConversationId?: string
): UseStreamingAssistantReturn {
  // Local message state
  const [messages, setMessages] = React.useState<AIChatMessage[]>([]);
  const [conversationId, setConversationId] = React.useState<string | null>(
    initialConversationId || null
  );
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoadingConversation, setIsLoadingConversation] = React.useState(false);

  // Use streaming hook
  const streaming = useStreamingChat(conversationId || undefined, {
    onToken: (_token, _index, content) => {
      // Update last message with new content
      setMessages((prev) => {
        const newMessages = [...prev];
        const lastMessage = newMessages[newMessages.length - 1];
        if (lastMessage && lastMessage.role === 'assistant') {
          newMessages[newMessages.length - 1] = {
            ...lastMessage,
            content,
          };
        }
        return newMessages;
      });
    },
    onMetadata: (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    },
    onDone: (data) => {
      if (data.conversationId) {
        setConversationId(data.conversationId);
      }
    },
    onError: (data) => {
      setError(new Error(data.message));
    },
  });

  // Convert pending confirmation
  const pendingConfirmation = React.useMemo(() => {
    if (!streaming.state.confirmation) return null;
    return {
      requestId: streaming.state.confirmation.requestId,
      action: streaming.state.confirmation.action,
      description: streaming.state.confirmation.description,
    };
  }, [streaming.state.confirmation]);

  // Send message
  const sendMessage = React.useCallback(
    async (message: string, context?: CrmContextInfo) => {
      setError(null);

      // Add user message immediately
      const userMessage: AIChatMessage = {
        role: 'user',
        content: message,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      // Add empty assistant message for streaming
      const assistantMessage: AIChatMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);

      // Build request with optional context
      const request: { message: string; context?: { entityType?: string; entityId?: string; data?: Record<string, unknown> }; systemPrompt?: string } = {
        message,
      };

      // Add CRM context if provided
      if (context) {
        if (context.entityType || context.entityId) {
          request.context = {
            entityType: context.entityType,
            entityId: context.entityId,
          };
        }
        // Add context prompt as additional system instructions
        if (context.contextPrompt) {
          request.systemPrompt = context.contextPrompt;
        }
      }

      // Start streaming
      streaming.sendMessage(request);
    },
    [streaming]
  );

  // Confirm action
  const confirmAction = React.useCallback(
    async (
      decision: 'confirm' | 'cancel' | 'modify',
      modifications?: Record<string, unknown>
    ) => {
      streaming.confirmAction(decision, modifications);
    },
    [streaming]
  );

  // Clear conversation
  const clearConversation = React.useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);
    streaming.reset();
  }, [streaming]);

  // Start new conversation
  const startNewConversation = React.useCallback(() => {
    clearConversation();

    // Add welcome message
    const welcomeMessage: AIChatMessage = {
      role: 'assistant',
      content:
        '¡Hola! Soy tu asistente de IA con respuestas en tiempo real. Puedo ayudarte con:\n\n' +
        '• Gestionar leads y oportunidades\n' +
        '• Analizar el sentimiento de mensajes\n' +
        '• Generar emails profesionales\n' +
        '• Responder preguntas sobre tu CRM\n\n' +
        '¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  }, [clearConversation]);

  // Cancel stream
  const cancelStream = React.useCallback(() => {
    streaming.cancel();
  }, [streaming]);

  // Load existing conversation
  const loadConversation = React.useCallback(async (id: string) => {
    setIsLoadingConversation(true);
    setError(null);

    try {
      const response = await fetch(`/api/ai/conversations/${id}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Error al cargar la conversación');
      }

      const data = await response.json();

      // Convert messages to AIChatMessage format
      const loadedMessages: AIChatMessage[] = data.messages.map(
        (msg: ConversationMessage) => ({
          role: msg.role.toLowerCase() as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.createdAt,
        })
      );

      setMessages(loadedMessages);
      setConversationId(id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Error desconocido'));
    } finally {
      setIsLoadingConversation(false);
    }
  }, []);

  // Set active conversation without loading
  const setActiveConversation = React.useCallback((id: string | null) => {
    setConversationId(id);
    if (!id) {
      setMessages([]);
    }
  }, []);

  // Convert tool calls to executed actions array
  const executedActions = React.useMemo((): ToolExecution[] => {
    const actions: ToolExecution[] = [];
    streaming.state.toolCalls.forEach((tool, id) => {
      let params: Record<string, unknown> = {};
      try {
        params = tool.arguments ? JSON.parse(tool.arguments) : {};
      } catch {
        params = { raw: tool.arguments };
      }

      // Map tool status: use-streaming-chat uses 'done'/'error', we need 'success'/'error'
      let status: ToolExecution['status'];
      if (tool.status === 'done') {
        status = 'success';
      } else if (tool.status === 'error') {
        status = 'error';
      } else if (tool.status === 'pending') {
        status = 'pending';
      } else {
        status = 'executing';
      }

      // Result structure: tool.result is the raw result, tool.error is the error string
      // For nested result data, check if result has a data property
      const resultData = tool.result && typeof tool.result === 'object' && 'data' in tool.result
        ? (tool.result as { data: unknown }).data
        : tool.result;
      const errorMsg = tool.error || (tool.result && typeof tool.result === 'object' && 'error' in tool.result
        ? (tool.result as { error: string }).error
        : undefined);
      const execTime = tool.result && typeof tool.result === 'object' && 'executionTimeMs' in tool.result
        ? (tool.result as { executionTimeMs: number }).executionTimeMs
        : undefined;

      actions.push({
        id,
        name: tool.name,
        parameters: params,
        status,
        result: resultData,
        error: errorMsg,
        executionTimeMs: execTime,
      });
    });
    return actions;
  }, [streaming.state.toolCalls]);

  const isExecutingTools = streaming.state.status === 'tool_calling';

  return {
    messages,
    conversationId,
    isLoading: streaming.isStreaming,
    isStreaming: streaming.state.status === 'streaming',
    isExecutingTools,
    isLoadingConversation,
    error,
    pendingConfirmation,
    executedActions,
    sendMessage,
    confirmAction,
    clearConversation,
    startNewConversation,
    cancelStream,
    loadConversation,
    setActiveConversation,
  };
}
