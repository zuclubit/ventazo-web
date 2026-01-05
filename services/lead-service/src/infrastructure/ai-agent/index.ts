/**
 * AI Agent Module
 * Central export for the AI Agent framework
 *
 * This module provides:
 * - AI Agent Orchestrator: Core pipeline for processing user requests
 * - Intent Classifier: Classifies user messages into intents
 * - Action Planner: Creates execution plans from intents
 * - Response Generator: Generates natural language responses
 * - Tool Registry: Manages available tools/functions
 * - Confirmation Gate: Human-in-the-loop confirmation system
 * - Audit Logger: Comprehensive AI action auditing
 */

// Types
export * from './types';

// Orchestrator components
export {
  AIAgentOrchestrator,
  AIAgentConfig,
  IntentClassifier,
  ActionPlanner,
  ResponseGenerator,
} from './orchestrator';

// Services
export {
  ToolRegistryService,
  ToolExecutorService,
  ConfirmationGateService,
  AIAuditLoggerService,
} from './services';
