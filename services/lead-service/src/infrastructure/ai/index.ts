/**
 * AI Infrastructure Module
 *
 * Clean, AI-agnostic exports for the CRM.
 * All AI logic is delegated to the Bot Management System.
 *
 * @module infrastructure/ai
 */

// Service
export { AIService } from './ai.service';

// Types (AI-agnostic, CRM-specific)
export type {
  AILeadScore,
  AISentiment,
  AIGeneratedEmail,
  AIAgentResult,
} from './ai.service';

// Re-export Bot Gateway for direct access
export {
  getBotGateway,
  initializeBotGateway,
  BotGateway,
} from '../bot-gateway';

export type {
  BotUserContext,
  BotAgentRequest,
  BotAgentResponse,
  BotGatewayConfig,
  BotStreamRequest,
  BotLeadScoreRequest,
  BotLeadScoreResponse,
  BotSentimentRequest,
  BotSentimentResponse,
  BotEmailRequest,
  BotEmailResponse,
} from '../bot-gateway';
