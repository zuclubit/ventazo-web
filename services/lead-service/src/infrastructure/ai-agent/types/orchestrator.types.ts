/**
 * AI Agent Orchestrator Types
 * Core types for the AI Agent orchestration layer
 */

import {
  AIEntityType,
  AIOperation,
  AIUserContext,
  AIConversationContext,
  AIMessage,
  AIToolCall,
  AIToolResult,
  ActionResultStatus,
  ActionImpact,
} from './common.types';

// Forward declaration - ConfirmationRequest is imported below
// to avoid circular dependency issues
import type { ConfirmationRequest } from './confirmation.types';

// ============================================================================
// Input/Output Types
// ============================================================================

/**
 * Input to the AI Agent Orchestrator
 */
export interface AgentInput {
  /** Unique request identifier */
  requestId?: string;

  /** User's message (as AIMessage object) */
  message: AIMessage;

  /** Conversation context (optional for first message) */
  conversationId?: string;

  /** User context */
  user: AIUserContext;

  /** Additional context hints */
  hints?: AgentInputHints;

  /** Request timestamp */
  timestamp?: Date;

  /** Source of the request */
  source?: AgentInputSource;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Hints to help the agent process the request
 */
export interface AgentInputHints {
  /** Entity the user is currently viewing */
  currentEntity?: {
    type: AIEntityType;
    id: string;
  };

  /** Recent entities the user has interacted with */
  recentEntities?: Array<{
    type: AIEntityType;
    id: string;
    interactedAt: Date;
  }>;

  /** User's current page/view */
  currentView?: string;

  /** Preferred response format */
  preferredFormat?: 'brief' | 'detailed' | 'structured';
}

/**
 * Source of the agent request
 */
export type AgentInputSource =
  | 'web_chat'
  | 'mobile_chat'
  | 'slack_bot'
  | 'api'
  | 'voice'
  | 'internal';

/**
 * Output from the AI Agent Orchestrator
 */
export interface AgentOutput {
  /** Request identifier (matches input) */
  requestId?: string;

  /** Conversation identifier */
  conversationId: string;

  /** Response message to the user */
  message: AIMessage;

  /** Actions that were executed */
  actions: ExecutedAction[];

  /** Whether confirmation is required */
  confirmationRequired: boolean;

  /** Confirmation request if required */
  confirmationRequest?: ConfirmationRequest;

  /** Suggested follow-up actions (as strings for simple display) */
  suggestions?: string[];

  /** Pending confirmations if any (for complex multi-action flows) */
  pendingConfirmations?: PendingConfirmation[];

  /** Suggested follow-up actions (structured) */
  suggestedActions?: SuggestedAction[];

  /** Entities referenced in response */
  referencedEntities?: ReferencedEntity[];

  /** Response metadata */
  metadata: AgentOutputMetadata;
}

/**
 * Metadata about the agent's response
 */
export interface AgentOutputMetadata {
  /** Total processing time in ms */
  processingTimeMs: number;

  /** Intent classification result */
  intent?: ClassifiedIntent;

  /** Number of tools/actions executed successfully */
  toolsExecuted?: number;

  /** Number of actions executed (alias for toolsExecuted) */
  actionsExecuted?: number;

  /** Number of actions that failed */
  actionsFailed?: number;

  /** Model used for generation */
  model?: string;

  /** Token usage */
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };

  /** Conversation turn number */
  turnNumber?: number;

  /** Error information if an error occurred */
  error?: {
    code: string;
    message: string;
  };
}

// ============================================================================
// Intent Classification Types
// ============================================================================

/**
 * Intent type categories
 */
export type IntentType =
  | 'query'           // User wants information
  | 'action'          // User wants to perform an action
  | 'clarification'   // User is clarifying previous request
  | 'confirmation'    // User is confirming/denying an action
  | 'greeting'        // User is greeting
  | 'help'            // User needs help
  | 'feedback'        // User is providing feedback
  | 'unknown';        // Could not determine intent

/**
 * Classified intent from user message
 */
export interface ClassifiedIntent {
  /** Primary intent type */
  type: IntentType;

  /** Confidence score (0-1) */
  confidence: number;

  /** Target entity type if applicable */
  entity?: AIEntityType;

  /** Target operation if applicable */
  operation?: AIOperation;

  /** Extracted parameters */
  parameters: Record<string, unknown>;

  /** Alternative interpretations */
  alternatives?: Array<{
    type: IntentType;
    confidence: number;
    entity?: AIEntityType;
    operation?: AIOperation;
  }>;

  /** Whether clarification is needed */
  needsClarification: boolean;

  /** Clarification question if needed */
  clarificationQuestion?: string;
}

// ============================================================================
// Action Planning Types
// ============================================================================

/**
 * Action plan created by the planner
 */
export interface ActionPlan {
  /** Plan identifier */
  id: string;

  /** Original intent */
  intent: ClassifiedIntent;

  /** Planned actions in execution order */
  actions: PlannedAction[];

  /** Estimated total execution time in ms */
  estimatedTimeMs: number;

  /** Plan confidence score */
  confidence: number;

  /** Whether plan requires any confirmations */
  requiresConfirmation: boolean;

  /** Plan created at */
  createdAt: Date;
}

/**
 * Individual planned action
 */
export interface PlannedAction {
  /** Action sequence number */
  sequence: number;

  /** Tool to execute */
  toolName: string;

  /** Tool parameters */
  parameters: Record<string, unknown>;

  /** Why this action is needed */
  rationale: string;

  /** Dependencies on other actions (by sequence) */
  dependsOn: number[];

  /** Whether confirmation is required */
  requiresConfirmation: boolean;

  /** Action impact level */
  impact: ActionImpact;

  /** What entity this affects */
  affectedEntity?: {
    type: AIEntityType;
    id?: string;
  };
}

// ============================================================================
// Execution Types
// ============================================================================

/**
 * Action that was executed
 */
export interface ExecutedAction {
  /** Corresponding planned action sequence */
  sequence: number;

  /** Tool that was executed */
  toolName: string;

  /** Parameters used */
  parameters: Record<string, unknown>;

  /** Execution result */
  status: ActionResultStatus;

  /** Result data if successful */
  result?: unknown;

  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    userMessage: string;
  };

  /** Execution duration in ms */
  durationMs: number;

  /** Entity that was affected */
  affectedEntity?: {
    type: AIEntityType;
    id: string;
    action: 'created' | 'updated' | 'deleted' | 'read';
  };

  /** Executed at timestamp */
  executedAt: Date;
}

/**
 * Pending confirmation for a critical action
 */
export interface PendingConfirmation {
  /** Confirmation request ID */
  confirmationId: string;

  /** Action awaiting confirmation */
  action: PlannedAction;

  /** Human-readable description */
  description: string;

  /** Impact of the action */
  impact: ActionImpact;

  /** What happens if confirmed */
  confirmationMessage: string;

  /** What happens if denied */
  cancellationMessage: string;

  /** Confirmation expires at */
  expiresAt: Date;
}

/**
 * Suggested follow-up action
 */
export interface SuggestedAction {
  /** Suggested action label */
  label: string;

  /** Action description */
  description: string;

  /** Tool to execute if selected */
  toolName: string;

  /** Pre-filled parameters */
  parameters: Record<string, unknown>;

  /** Priority of suggestion (lower = higher priority) */
  priority: number;
}

/**
 * Entity referenced in the response
 */
export interface ReferencedEntity {
  /** Entity type */
  type: AIEntityType;

  /** Entity ID */
  id: string;

  /** Entity name/title */
  name: string;

  /** Link to the entity in the UI */
  link?: string;

  /** Brief summary */
  summary?: string;
}

// ============================================================================
// Orchestrator Interface
// ============================================================================

/**
 * AI Agent Orchestrator interface
 * Main entry point for processing user requests
 */
export interface IAIAgentOrchestrator {
  /**
   * Process a user message and return a response
   */
  processMessage(input: AgentInput): Promise<AgentOutput>;

  /**
   * Process a confirmation response
   */
  processConfirmation(
    confirmationId: string,
    confirmed: boolean,
    user: AIUserContext
  ): Promise<AgentOutput>;

  /**
   * Cancel a pending confirmation
   */
  cancelConfirmation(
    confirmationId: string,
    user: AIUserContext
  ): Promise<void>;

  /**
   * Get conversation history
   */
  getConversationHistory(
    conversationId: string,
    user: AIUserContext
  ): Promise<AIMessage[]>;

  /**
   * Clear conversation context
   */
  clearConversation(
    conversationId: string,
    user: AIUserContext
  ): Promise<void>;
}

/**
 * Intent Classifier interface
 */
export interface IIntentClassifier {
  /**
   * Classify the intent of a user message
   */
  classify(
    message: string,
    context: AIConversationContext
  ): Promise<ClassifiedIntent>;
}

/**
 * Action Planner interface
 */
export interface IActionPlanner {
  /**
   * Create an action plan for an intent
   */
  plan(
    intent: ClassifiedIntent,
    context: AIConversationContext
  ): Promise<ActionPlan>;

  /**
   * Validate that a plan is executable
   */
  validate(
    plan: ActionPlan,
    context: AIConversationContext
  ): Promise<{ valid: boolean; errors: string[] }>;
}

/**
 * Response Generator interface
 */
export interface IResponseGenerator {
  /**
   * Generate a response message from execution results
   */
  generate(
    intent: ClassifiedIntent,
    executedActions: ExecutedAction[],
    context: AIConversationContext
  ): Promise<string>;

  /**
   * Generate an error response
   */
  generateError(
    error: Error,
    context: AIConversationContext
  ): Promise<string>;

  /**
   * Generate a clarification request
   */
  generateClarification(
    intent: ClassifiedIntent,
    context: AIConversationContext
  ): Promise<string>;
}
