/**
 * AI Agent Module
 *
 * NOTE: AI Agent orchestration has been moved to the Bot Management System.
 * The CRM no longer contains:
 * - AI Agent Orchestrator
 * - Intent Classifier
 * - Action Planner
 * - Response Generator
 *
 * These services remain for local tool execution and auditing:
 * - Tool Registry: Manages available tools/functions
 * - Tool Executor: Executes tools locally
 * - Confirmation Gate: Human-in-the-loop confirmation system
 * - Audit Logger: Comprehensive AI action auditing
 *
 * All AI logic is delegated to the Bot Management System via BotGateway.
 */

// Types (kept for tool definitions)
export * from './types';

// Services (for local tool execution and auditing)
export {
  ToolRegistryService,
  ToolExecutorService,
  ConfirmationGateService,
  AIAuditLoggerService,
} from './services';
