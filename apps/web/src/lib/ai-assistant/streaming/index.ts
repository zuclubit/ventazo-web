/**
 * AI Assistant Streaming Module
 *
 * SSE-based streaming for real-time AI chat responses.
 *
 * @module lib/ai-assistant/streaming
 */

// Types
export * from './types';

// Hooks
export { useStreamingChat } from './use-streaming-chat';
export { useStreamingAssistant } from './use-streaming-assistant';
export type { UseStreamingAssistantReturn } from './use-streaming-assistant';
