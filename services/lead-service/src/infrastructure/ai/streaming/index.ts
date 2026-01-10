/**
 * AI Streaming Module
 *
 * Server-Sent Events (SSE) streaming for AI chat responses.
 * Proxies SSE streams from Bot Management System to frontend.
 *
 * @module infrastructure/ai/streaming
 */

// Types
export * from './types';

// SSE Writer (for internal use if needed)
export { SSEWriter, createSSEWriter, mapErrorToSSE } from './sse-writer';
