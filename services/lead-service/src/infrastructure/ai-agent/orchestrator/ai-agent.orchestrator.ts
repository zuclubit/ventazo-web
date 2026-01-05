/**
 * AI Agent Orchestrator
 * Core orchestration service that coordinates the AI Agent pipeline:
 * Message → Intent Classification → Action Planning → Tool Execution → Response Generation
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { v4 as uuid } from 'uuid';
import {
  IAIAgentOrchestrator,
  AgentInput,
  AgentOutput,
  ClassifiedIntent,
  ActionPlan,
  ExecutedAction,
  AIMessage,
  AIUserContext,
  AIConversationContext,
  AIAgentError,
  AIAgentErrorCode,
  ActionResultStatus,
} from '../types';
import { IntentClassifier } from './intent-classifier';
import { ActionPlanner } from './action-planner';
import { ResponseGenerator } from './response-generator';
import { IToolRegistry, IToolExecutor, ToolExecutionContext } from '../types/tool.types';
import { IConfirmationGate, ConfirmationRequest } from '../types/confirmation.types';
import { IAIAuditLogger } from '../types/audit.types';
import { AIService } from '../../ai';

/**
 * Configuration for the AI Agent Orchestrator
 */
export interface AIAgentConfig {
  /** Maximum messages in conversation context */
  maxContextMessages: number;
  /** Timeout for tool execution in ms */
  toolExecutionTimeout: number;
  /** Whether to require confirmation for high-impact actions */
  requireConfirmationForHighImpact: boolean;
  /** Maximum actions per request */
  maxActionsPerRequest: number;
  /** Default AI model to use */
  defaultModel: string;
  /** Temperature for AI responses */
  temperature: number;
}

const DEFAULT_CONFIG: AIAgentConfig = {
  maxContextMessages: 20,
  toolExecutionTimeout: 30000,
  requireConfirmationForHighImpact: true,
  maxActionsPerRequest: 5,
  defaultModel: 'gpt-4-turbo-preview',
  temperature: 0.7,
};

/**
 * AI Agent Orchestrator Implementation
 */
@injectable()
export class AIAgentOrchestrator implements IAIAgentOrchestrator {
  private config: AIAgentConfig;
  private conversations: Map<string, AIConversationContext> = new Map();

  constructor(
    private pool: DatabasePool,
    private aiService: AIService,
    private intentClassifier: IntentClassifier,
    private actionPlanner: ActionPlanner,
    private responseGenerator: ResponseGenerator,
    @inject('IToolRegistry') private toolRegistry: IToolRegistry,
    @inject('IToolExecutor') private toolExecutor: IToolExecutor,
    @inject('IConfirmationGate') private confirmationGate: IConfirmationGate,
    @inject('IAIAuditLogger') private auditLogger: IAIAuditLogger,
    config?: Partial<AIAgentConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Process an incoming message from the user
   */
  async processMessage(input: AgentInput): Promise<AgentOutput> {
    const startTime = Date.now();
    const requestId = uuid();

    try {
      // 1. Initialize or get conversation context
      const context = await this.getOrCreateConversation(input);

      // 2. Log message received
      await this.auditLogger.logMessageReceived(
        context.conversationId,
        requestId,
        input.message
      );

      // 3. Add user message to context
      context.messages.push(input.message);

      // 4. Classify intent
      const intent = await this.intentClassifier.classify(
        input.message.content,
        context,
        input.user
      );

      await this.auditLogger.logIntentClassified(
        context.conversationId,
        requestId,
        intent,
        input.message.content
      );

      // 5. Handle clarification if needed
      if (intent.needsClarification) {
        const clarificationResponse = await this.handleClarification(
          intent,
          context,
          input.user
        );
        return this.buildOutput(
          clarificationResponse,
          context,
          [],
          null,
          Date.now() - startTime
        );
      }

      // 6. Plan actions based on intent
      const plan = await this.actionPlanner.plan(intent, context, input.user);

      await this.auditLogger.logActionPlanned(
        context.conversationId,
        requestId,
        plan.id,
        plan.actions.map((a) => a.toolName),
        plan.requiresConfirmation
      );

      // 7. Handle confirmation if required
      if (plan.requiresConfirmation) {
        const confirmationRequest = await this.requestConfirmation(
          plan,
          context,
          input.user
        );

        return this.buildOutput(
          await this.buildConfirmationMessage(confirmationRequest),
          context,
          [],
          confirmationRequest,
          Date.now() - startTime
        );
      }

      // 8. Execute actions
      const executedActions = await this.executeActions(
        plan,
        context,
        input.user,
        requestId
      );

      // 9. Generate response
      const response = await this.responseGenerator.generate(
        intent,
        executedActions,
        context,
        input.user
      );

      // 10. Add assistant message to context
      const assistantMessage: AIMessage = {
        id: uuid(),
        role: 'assistant',
        content: response.content,
        toolCalls: executedActions.map((a) => ({
          id: uuid(),
          toolName: a.toolName,
          arguments: a.parameters,
        })),
        createdAt: new Date(),
      };
      context.messages.push(assistantMessage);

      // 11. Persist conversation
      await this.persistConversation(context);

      // 12. Log message sent
      await this.auditLogger.logMessageSent(
        context.conversationId,
        requestId,
        assistantMessage
      );

      return this.buildOutput(
        assistantMessage,
        context,
        executedActions,
        null,
        Date.now() - startTime
      );
    } catch (error) {
      // Log error
      const conversationId = input.conversationId || 'unknown';
      await this.auditLogger.logError(
        conversationId,
        requestId,
        error instanceof Error ? error : new Error(String(error))
      );

      // Return error response
      return this.buildErrorOutput(
        error,
        input.conversationId,
        Date.now() - startTime
      );
    }
  }

  /**
   * Process a confirmation response from the user
   */
  async processConfirmation(
    confirmationId: string,
    confirmed: boolean,
    user: AIUserContext
  ): Promise<AgentOutput> {
    const startTime = Date.now();
    const requestId = uuid();

    try {
      // 1. Get the confirmation request
      const confirmationRequest = await this.confirmationGate.getRequest(confirmationId);

      if (!confirmationRequest) {
        throw new AIAgentError(
          AIAgentErrorCode.CONFIRMATION_ERROR,
          `Confirmation request ${confirmationId} not found`
        );
      }

      // 2. Verify user
      if (confirmationRequest.userId !== user.userId) {
        throw new AIAgentError(
          AIAgentErrorCode.PERMISSION_DENIED,
          'Only the original user can confirm this action'
        );
      }

      // 3. Get conversation context
      const context = this.conversations.get(confirmationRequest.conversationId);
      if (!context) {
        throw new AIAgentError(
          AIAgentErrorCode.CONVERSATION_NOT_FOUND,
          `Conversation ${confirmationRequest.conversationId} not found`
        );
      }

      // 4. Process the confirmation
      const result = await this.confirmationGate.processResponse(
        {
          confirmationId,
          decision: confirmed ? 'confirm' : 'deny',
        },
        user
      );

      // 5. Log confirmation
      await this.auditLogger.logConfirmationReceived(
        confirmationRequest.conversationId,
        requestId,
        confirmationId,
        result.request.resolution!
      );

      if (!result.approved) {
        // Action was denied
        const deniedMessage: AIMessage = {
          id: uuid(),
          role: 'assistant',
          content: result.message,
          createdAt: new Date(),
        };
        context.messages.push(deniedMessage);

        return this.buildOutput(
          deniedMessage,
          context,
          [],
          null,
          Date.now() - startTime
        );
      }

      // 6. Create intent from the confirmed action
      const intent: ClassifiedIntent = {
        type: 'action',
        confidence: 1.0,
        entity: confirmationRequest.action.affectedEntity?.type,
        operation: undefined, // Operation is inferred from toolName
        parameters: confirmationRequest.action.parameters,
        needsClarification: false,
      };

      // 7. Execute the confirmed action
      const plan: ActionPlan = {
        id: uuid(),
        intent,
        actions: [confirmationRequest.action],
        estimatedTimeMs: 1000,
        confidence: 1.0,
        requiresConfirmation: false,
        createdAt: new Date(),
      };

      const executedActions = await this.executeActions(
        plan,
        context,
        user,
        requestId
      );

      const response = await this.responseGenerator.generate(
        intent,
        executedActions,
        context,
        user
      );

      const assistantMessage: AIMessage = {
        id: uuid(),
        role: 'assistant',
        content: response.content,
        createdAt: new Date(),
      };
      context.messages.push(assistantMessage);

      await this.persistConversation(context);

      return this.buildOutput(
        assistantMessage,
        context,
        executedActions,
        null,
        Date.now() - startTime
      );
    } catch (error) {
      return this.buildErrorOutput(error, undefined, Date.now() - startTime);
    }
  }

  /**
   * Cancel a pending confirmation
   */
  async cancelConfirmation(
    confirmationId: string,
    user: AIUserContext
  ): Promise<void> {
    await this.confirmationGate.cancel(confirmationId, user, 'User cancelled');
  }

  /**
   * Get conversation history
   */
  async getConversationHistory(
    conversationId: string,
    user: AIUserContext
  ): Promise<AIMessage[]> {
    // Try memory first
    const cached = this.conversations.get(conversationId);
    if (cached && cached.tenantId === user.tenantId) {
      return cached.messages;
    }

    // Load from database
    const result = await this.pool.query(
      `SELECT messages FROM ai_agent_conversations
       WHERE id = $1 AND tenant_id = $2`,
      [conversationId, user.tenantId]
    );

    if (result.isFailure || !result.value?.rows?.[0]) {
      return [];
    }

    const messages = JSON.parse(result.value.rows[0].messages as string);
    return messages;
  }

  /**
   * Clear conversation
   */
  async clearConversation(
    conversationId: string,
    user: AIUserContext
  ): Promise<void> {
    // Remove from memory
    this.conversations.delete(conversationId);

    // Mark as cleared in database
    await this.pool.query(
      `UPDATE ai_agent_conversations
       SET status = 'cleared', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2`,
      [conversationId, user.tenantId]
    );

    // Log conversation end
    await this.auditLogger.logConversationEnd(conversationId, 'user_ended', {
      messageCount: 0,
      actionsExecuted: 0,
    });
  }

  // ==================== Private Methods ====================

  /**
   * Get or create conversation context
   */
  private async getOrCreateConversation(
    input: AgentInput
  ): Promise<AIConversationContext> {
    // Check if continuing existing conversation
    if (input.conversationId) {
      const existing = this.conversations.get(input.conversationId);
      if (existing) {
        return existing;
      }

      // Try to load from database
      const loaded = await this.loadConversation(input.conversationId, input.user);
      if (loaded) {
        this.conversations.set(input.conversationId, loaded);
        return loaded;
      }
    }

    // Create new conversation
    const conversationId = input.conversationId || uuid();
    const context: AIConversationContext = {
      conversationId,
      tenantId: input.user.tenantId,
      userId: input.user.userId,
      startedAt: new Date(),
      messages: [],
      metadata: input.metadata || {},
      pendingConfirmation: null,
    };

    this.conversations.set(conversationId, context);

    // Log conversation start
    await this.auditLogger.logConversationStart(
      conversationId,
      input.user,
      input.source || 'chat',
      input.message.content
    );

    return context;
  }

  /**
   * Load conversation from database
   */
  private async loadConversation(
    conversationId: string,
    user: AIUserContext
  ): Promise<AIConversationContext | null> {
    const result = await this.pool.query(
      `SELECT * FROM ai_agent_conversations
       WHERE id = $1 AND tenant_id = $2 AND status = 'active'`,
      [conversationId, user.tenantId]
    );

    if (result.isFailure || !result.value?.rows?.[0]) {
      return null;
    }

    const row = result.value.rows[0];
    return {
      conversationId: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      startedAt: new Date(row.started_at as string),
      messages: JSON.parse(row.messages as string),
      metadata: JSON.parse(row.metadata as string || '{}'),
      pendingConfirmation: row.pending_confirmation
        ? JSON.parse(row.pending_confirmation as string)
        : null,
    };
  }

  /**
   * Persist conversation to database
   */
  private async persistConversation(
    context: AIConversationContext
  ): Promise<void> {
    // Keep only last N messages to avoid bloat
    const messagesToPersist = context.messages.slice(-this.config.maxContextMessages);

    await this.pool.query(
      `INSERT INTO ai_agent_conversations (
        id, tenant_id, user_id, started_at, messages, metadata,
        pending_confirmation, status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'active', NOW())
      ON CONFLICT (id) DO UPDATE SET
        messages = $5,
        metadata = $6,
        pending_confirmation = $7,
        updated_at = NOW()`,
      [
        context.conversationId,
        context.tenantId,
        context.userId,
        context.startedAt,
        JSON.stringify(messagesToPersist),
        JSON.stringify(context.metadata),
        context.pendingConfirmation
          ? JSON.stringify(context.pendingConfirmation)
          : null,
      ]
    );
  }

  /**
   * Handle clarification request
   */
  private async handleClarification(
    intent: ClassifiedIntent,
    context: AIConversationContext,
    user: AIUserContext
  ): Promise<AIMessage> {
    const clarificationMessage: AIMessage = {
      id: uuid(),
      role: 'assistant',
      content: intent.clarificationQuestion || '¿Podrías darme más detalles sobre lo que necesitas?',
      createdAt: new Date(),
    };

    context.messages.push(clarificationMessage);
    await this.persistConversation(context);

    return clarificationMessage;
  }

  /**
   * Request confirmation for an action plan
   */
  private async requestConfirmation(
    plan: ActionPlan,
    context: AIConversationContext,
    user: AIUserContext
  ): Promise<ConfirmationRequest> {
    // Create confirmation for the first action requiring it
    const actionNeedingConfirmation = plan.actions.find((a) => a.requiresConfirmation);

    if (!actionNeedingConfirmation) {
      throw new AIAgentError(
        AIAgentErrorCode.INTERNAL_ERROR,
        'No action requiring confirmation found in plan'
      );
    }

    const confirmationRequest = await this.confirmationGate.createRequest(
      actionNeedingConfirmation,
      user,
      context.conversationId
    );

    // Store pending confirmation
    context.pendingConfirmation = confirmationRequest;
    await this.persistConversation(context);

    // Log confirmation request
    await this.auditLogger.logConfirmationRequested(
      context.conversationId,
      uuid(),
      confirmationRequest
    );

    return confirmationRequest;
  }

  /**
   * Build confirmation message for the user
   */
  private async buildConfirmationMessage(
    request: ConfirmationRequest
  ): Promise<AIMessage> {
    let message = `${request.title}\n\n${request.description}`;

    if (request.changes && request.changes.length > 0) {
      message += '\n\n**Cambios:**\n';
      for (const change of request.changes) {
        if (change.previousValue !== undefined) {
          message += `- ${change.label}: ${change.previousValue} → ${change.newValue}`;
        } else {
          message += `- ${change.label}: ${change.newValue}`;
        }
        if (change.destructive) {
          message += ' ⚠️';
        }
        message += '\n';
      }
    }

    if (request.warnings && request.warnings.length > 0) {
      message += '\n**Advertencias:**\n';
      for (const warning of request.warnings) {
        message += `- ⚠️ ${warning}\n`;
      }
    }

    message += `\n¿Deseas continuar? (confirmar/cancelar)`;

    return {
      id: uuid(),
      role: 'assistant',
      content: message,
      metadata: {
        confirmationId: request.id,
        confirmationType: 'action_confirmation',
        expiresAt: request.expiresAt.toISOString(),
      },
      createdAt: new Date(),
    };
  }

  /**
   * Execute actions in the plan
   */
  private async executeActions(
    plan: ActionPlan,
    context: AIConversationContext,
    user: AIUserContext,
    requestId: string
  ): Promise<ExecutedAction[]> {
    const executedActions: ExecutedAction[] = [];

    for (const action of plan.actions) {
      const startedAt = new Date();

      // Check if user can execute this tool
      if (!this.toolRegistry.canExecute(action.toolName, user)) {
        await this.auditLogger.logPermissionDenied(
          context.conversationId,
          requestId,
          action.toolName,
          [],
          user
        );

        executedActions.push({
          sequence: action.sequence,
          toolName: action.toolName,
          parameters: action.parameters,
          status: 'failure',
          error: {
            code: 'PERMISSION_DENIED',
            message: `No tienes permisos para ejecutar ${action.toolName}`,
            userMessage: `No tienes permisos para realizar esta acción`,
          },
          durationMs: Date.now() - startedAt.getTime(),
          executedAt: startedAt,
        });
        continue;
      }

      // Execute the tool
      try {
        const executionContext: ToolExecutionContext = {
          user,
          conversation: context,
          correlationId: context.conversationId,
          requestId,
        };

        const result = await this.toolExecutor.execute(
          action.toolName,
          action.parameters,
          executionContext
        );

        const executedAction: ExecutedAction = {
          sequence: action.sequence,
          toolName: action.toolName,
          parameters: action.parameters,
          status: result.status,
          result: result.data,
          affectedEntity: result.affectedEntity
            ? {
                type: result.affectedEntity.type,
                id: result.affectedEntity.id || '',
                action: (result.affectedEntity.action as 'created' | 'updated' | 'deleted' | 'read') || 'read',
              }
            : undefined,
          durationMs: Date.now() - startedAt.getTime(),
          executedAt: startedAt,
        };

        executedActions.push(executedAction);

        // Log action executed
        await this.auditLogger.logActionExecuted(
          context.conversationId,
          requestId,
          executedAction,
          user
        );
      } catch (error) {
        const executedAction: ExecutedAction = {
          sequence: action.sequence,
          toolName: action.toolName,
          parameters: action.parameters,
          status: 'failure',
          error: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : String(error),
            userMessage: 'Ocurrió un error al ejecutar la acción',
          },
          durationMs: Date.now() - startedAt.getTime(),
          executedAt: startedAt,
        };

        executedActions.push(executedAction);

        await this.auditLogger.logError(
          context.conversationId,
          requestId,
          error instanceof Error ? error : new Error(String(error)),
          { toolName: action.toolName, parameters: action.parameters }
        );
      }
    }

    return executedActions;
  }

  /**
   * Build agent output
   */
  private buildOutput(
    message: AIMessage,
    context: AIConversationContext,
    actions: ExecutedAction[],
    confirmationRequest: ConfirmationRequest | null,
    durationMs: number
  ): AgentOutput {
    return {
      message,
      conversationId: context.conversationId,
      actions,
      confirmationRequired: confirmationRequest !== null,
      confirmationRequest: confirmationRequest || undefined,
      suggestions: this.generateSuggestions(actions),
      metadata: {
        processingTimeMs: durationMs,
        actionsExecuted: actions.filter((a) => a.status === 'success').length,
        actionsFailed: actions.filter((a) => a.status === 'failure').length,
      },
    };
  }

  /**
   * Build error output
   */
  private buildErrorOutput(
    error: unknown,
    conversationId: string | undefined,
    durationMs: number
  ): AgentOutput {
    const isAIAgentError = error instanceof AIAgentError;
    const errorMessage = isAIAgentError
      ? (error as AIAgentError).userMessage || error.message
      : 'Ha ocurrido un error procesando tu solicitud. Por favor, intenta de nuevo.';

    const message: AIMessage = {
      id: uuid(),
      role: 'assistant',
      content: errorMessage,
      createdAt: new Date(),
    };

    return {
      message,
      conversationId: conversationId || uuid(),
      actions: [],
      confirmationRequired: false,
      suggestions: ['Intenta reformular tu solicitud', 'Escribe "ayuda" para ver lo que puedo hacer'],
      metadata: {
        processingTimeMs: durationMs,
        actionsExecuted: 0,
        actionsFailed: 0,
        error: {
          code: isAIAgentError ? (error as AIAgentError).code : 'UNKNOWN_ERROR',
          message: error instanceof Error ? error.message : String(error),
        },
      },
    };
  }

  /**
   * Generate follow-up suggestions based on executed actions
   */
  private generateSuggestions(actions: ExecutedAction[]): string[] {
    const suggestions: string[] = [];

    for (const action of actions) {
      if (action.status === 'success') {
        // Add contextual suggestions based on what was done
        if (action.toolName.includes('lead.create')) {
          suggestions.push('¿Quieres agregar una tarea de seguimiento?');
          suggestions.push('¿Deseas asignar este lead a alguien?');
        } else if (action.toolName.includes('lead.qualify')) {
          suggestions.push('¿Quieres crear una oportunidad para este lead?');
        } else if (action.toolName.includes('opportunity.create')) {
          suggestions.push('¿Deseas crear una cotización?');
        } else if (action.toolName.includes('task.complete')) {
          suggestions.push('¿Hay alguna otra tarea pendiente?');
        }
      }
    }

    // Add generic suggestions if none were added
    if (suggestions.length === 0) {
      suggestions.push('¿En qué más puedo ayudarte?');
    }

    return suggestions.slice(0, 3); // Max 3 suggestions
  }
}
