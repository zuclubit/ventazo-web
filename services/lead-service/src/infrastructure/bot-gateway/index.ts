/**
 * Bot Gateway Module
 *
 * Clean interface for CRM to communicate with the Bot Management System.
 * The CRM is AI-agnostic - all AI logic lives in the Bot Management System.
 *
 * @module infrastructure/bot-gateway
 */

// Types
export type {
  // Core contracts
  BotUserContext,
  BotAgentRequest,
  BotAgentResponse,
  BotPlannedAction,
  BotExecutedAction,
  BotConfirmationRequest,
  BotConfirmationDecision,
  // Streaming contracts
  BotStreamRequest,
  BotStreamEventType,
  BotStreamEvent,
  BotTokenEvent,
  BotMetadataEvent,
  BotToolStartEvent,
  BotToolEndEvent,
  BotDoneEvent,
  BotErrorEvent,
  // Feature contracts
  BotLeadScoreRequest,
  BotLeadScoreResponse,
  BotSentimentRequest,
  BotSentimentResponse,
  BotEmailRequest,
  BotEmailResponse,
  // Configuration
  BotGatewayConfig,
  IBotGateway,
} from './types';

// Implementation
export { BotGateway, getBotGateway, initializeBotGateway } from './bot-gateway';
