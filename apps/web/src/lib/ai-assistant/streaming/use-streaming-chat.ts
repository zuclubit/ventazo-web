'use client';

/**
 * Streaming Chat Hook
 *
 * React hook for consuming SSE streaming responses from the AI backend.
 * Provides real-time token-by-token updates with cancellation support.
 *
 * @module lib/ai-assistant/streaming/use-streaming-chat
 */

import * as React from 'react';

import type {
  StreamChatRequest,
  StreamState,
  StreamEventHandlers,
  UseStreamingChatReturn,
  TokenEventData,
  MetadataEventData,
  ToolStartEventData,
  ToolArgsEventData,
  ToolEndEventData,
  ConfirmationEventData,
  UsageEventData,
  DoneEventData,
  ErrorEventData,
  SSEEventType,
} from './types';

// ============================================
// Constants
// ============================================

const STREAM_ENDPOINT = '/api/ai/stream/chat';

// ============================================
// Initial State
// ============================================

const createInitialState = (): StreamState => ({
  status: 'idle',
  content: '',
  tokenCount: 0,
  toolCalls: new Map(),
});

// ============================================
// Main Hook
// ============================================

export function useStreamingChat(
  conversationId?: string,
  handlers?: StreamEventHandlers
): UseStreamingChatReturn {
  // State
  const [state, setState] = React.useState<StreamState>(createInitialState);

  // Refs for stable values in callbacks
  const abortControllerRef = React.useRef<AbortController | null>(null);
  const conversationIdRef = React.useRef(conversationId);
  const handlersRef = React.useRef(handlers);

  // Keep refs updated
  React.useEffect(() => {
    conversationIdRef.current = conversationId;
    handlersRef.current = handlers;
  }, [conversationId, handlers]);

  // ============================================
  // Process SSE Events
  // ============================================

  const processEvent = React.useCallback((eventType: SSEEventType, data: unknown) => {
    switch (eventType) {
      case 'token': {
        const tokenData = data as TokenEventData;
        setState((prev) => ({
          ...prev,
          content: prev.content + tokenData.t,
          tokenCount: tokenData.i + 1,
        }));
        handlersRef.current?.onToken?.(
          tokenData.t,
          tokenData.i,
          state.content + tokenData.t
        );
        break;
      }

      case 'metadata': {
        const metaData = data as MetadataEventData;
        setState((prev) => ({
          ...prev,
          status: 'streaming',
          model: metaData.model,
          provider: metaData.provider,
          conversationId: metaData.conversationId || prev.conversationId,
          requestId: metaData.requestId,
        }));
        handlersRef.current?.onMetadata?.(metaData);
        break;
      }

      case 'tool_start': {
        const toolData = data as ToolStartEventData;
        setState((prev) => {
          const newToolCalls = new Map(prev.toolCalls);
          newToolCalls.set(toolData.id, {
            id: toolData.id,
            name: toolData.name,
            arguments: '',
            status: 'pending',
          });
          return {
            ...prev,
            status: 'tool_calling',
            toolCalls: newToolCalls,
          };
        });
        handlersRef.current?.onToolStart?.(toolData);
        break;
      }

      case 'tool_args': {
        const argsData = data as ToolArgsEventData;
        setState((prev) => {
          const newToolCalls = new Map(prev.toolCalls);
          const existing = newToolCalls.get(argsData.id);
          if (existing) {
            newToolCalls.set(argsData.id, {
              ...existing,
              arguments: existing.arguments + argsData.delta,
            });
          }
          return { ...prev, toolCalls: newToolCalls };
        });
        break;
      }

      case 'tool_end': {
        const endData = data as ToolEndEventData;
        setState((prev) => {
          const newToolCalls = new Map(prev.toolCalls);
          const existing = newToolCalls.get(endData.id);
          if (existing) {
            newToolCalls.set(endData.id, {
              ...existing,
              status: endData.success ? 'done' : 'error',
              result: endData.result,
              error: endData.error,
            });
          }
          return { ...prev, toolCalls: newToolCalls };
        });
        handlersRef.current?.onToolEnd?.(endData);
        break;
      }

      case 'confirmation': {
        const confirmData = data as ConfirmationEventData;
        setState((prev) => ({
          ...prev,
          status: 'confirming',
          confirmation: confirmData,
        }));
        handlersRef.current?.onConfirmation?.(confirmData);
        break;
      }

      case 'usage': {
        const usageData = data as UsageEventData;
        setState((prev) => ({ ...prev, usage: usageData }));
        handlersRef.current?.onUsage?.(usageData);
        break;
      }

      case 'done': {
        const doneData = data as DoneEventData;
        setState((prev) => ({
          ...prev,
          status: 'done',
          conversationId: doneData.conversationId,
          finishReason: doneData.finishReason,
        }));
        handlersRef.current?.onDone?.(doneData);
        break;
      }

      case 'error': {
        const errorData = data as ErrorEventData;
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: errorData,
        }));
        handlersRef.current?.onError?.(errorData);
        break;
      }

      case 'ping':
        // Keep-alive, no action needed
        break;
    }
  }, [state.content]);

  // ============================================
  // Stream Reader
  // ============================================

  const readStream = React.useCallback(async (
    response: Response,
    signal: AbortSignal
  ) => {
    const reader = response.body?.getReader();
    if (!reader) throw new Error('Response body is null');

    const decoder = new TextDecoder();
    let buffer = '';
    let currentEvent: SSEEventType = 'token';

    try {
      while (true) {
        if (signal.aborted) {
          reader.cancel();
          break;
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Process complete lines
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          // Event type line
          if (trimmed.startsWith('event:')) {
            currentEvent = trimmed.slice(6).trim() as SSEEventType;
            continue;
          }

          // Data line
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5).trim());
              processEvent(currentEvent, data);
            } catch {
              // Ignore parse errors
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }, [processEvent]);

  // ============================================
  // Send Message
  // ============================================

  const sendMessage = React.useCallback(async (
    request: Omit<StreamChatRequest, 'conversationId'>
  ) => {
    // Cancel any existing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // Reset state
    setState({
      ...createInitialState(),
      status: 'connecting',
      conversationId: conversationIdRef.current,
    });

    try {
      const response = await fetch(STREAM_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
        },
        body: JSON.stringify({
          ...request,
          conversationId: conversationIdRef.current,
        }),
        signal: controller.signal,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          (errorData as { message?: string }).message ||
            `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Start reading stream
      await readStream(response, controller.signal);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        setState((prev) => ({ ...prev, status: 'cancelled' }));
      } else {
        setState((prev) => ({
          ...prev,
          status: 'error',
          error: {
            code: 'INTERNAL_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
            retryable: true,
            requestId: prev.requestId || 'unknown',
          },
        }));
      }
    } finally {
      if (abortControllerRef.current === controller) {
        abortControllerRef.current = null;
      }
    }
  }, [readStream]);

  // ============================================
  // Cancel
  // ============================================

  const cancel = React.useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState((prev) => ({ ...prev, status: 'cancelled' }));
    }
  }, []);

  // ============================================
  // Confirm Action
  // ============================================

  const confirmAction = React.useCallback(async (
    decision: 'confirm' | 'cancel' | 'modify',
    modifications?: Record<string, unknown>
  ) => {
    if (!state.confirmation?.requestId) return;

    try {
      const response = await fetch('/api/ai/agent/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: state.confirmation.requestId,
          decision,
          modifications,
        }),
        credentials: 'include',
      });

      const data = await response.json();

      setState((prev) => ({
        ...prev,
        status: 'done',
        confirmation: undefined,
        content: prev.content + '\n\n' + data.response,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        status: 'error',
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Confirmation failed',
          retryable: true,
          requestId: prev.requestId || 'unknown',
        },
      }));
    }
  }, [state.confirmation?.requestId]);

  // ============================================
  // Reset
  // ============================================

  const reset = React.useCallback(() => {
    cancel();
    setState(createInitialState());
  }, [cancel]);

  // ============================================
  // Cleanup on unmount
  // ============================================

  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // ============================================
  // Return
  // ============================================

  return {
    state,
    isStreaming: state.status === 'connecting' || state.status === 'streaming' || state.status === 'tool_calling',
    isPendingConfirmation: state.status === 'confirming',
    sendMessage,
    cancel,
    confirmAction,
    reset,
  };
}
