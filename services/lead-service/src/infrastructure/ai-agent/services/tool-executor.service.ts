/**
 * Tool Executor Service
 * Executes AI tools by delegating to the appropriate domain services
 */

import { injectable, inject } from 'tsyringe';
import {
  IToolExecutor,
  IToolRegistry,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../types/tool.types';
import { ActionResultStatus, AIUserContext, AIResult, AIAgentError, AIAgentErrorCode } from '../types/common.types';

/**
 * Tool execution handler function type
 */
type ToolHandler = (
  parameters: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

/**
 * Tool Executor implementation
 */
@injectable()
export class ToolExecutorService implements IToolExecutor {
  private handlers: Map<string, ToolHandler> = new Map();
  private executionTimeout: number = 30000; // 30 seconds

  constructor(
    @inject('IToolRegistry') private toolRegistry: IToolRegistry
  ) {
    // Register default handlers
    this.registerDefaultHandlers();
  }

  /**
   * Execute a tool with parameters
   */
  async execute(
    toolName: string,
    parameters: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult> {
    const startTime = Date.now();

    try {
      // Validate tool exists
      const tool = this.toolRegistry.get(toolName);
      if (!tool) {
        return this.createErrorResult(
          'TOOL_NOT_FOUND',
          `Herramienta "${toolName}" no encontrada`,
          startTime
        );
      }

      // Check permissions
      if (!this.toolRegistry.canExecute(toolName, context.user)) {
        return this.createErrorResult(
          'PERMISSION_DENIED',
          `Sin permisos para ejecutar "${toolName}"`,
          startTime
        );
      }

      // Validate parameters
      const validation = this.validateParametersInternal(tool.parameters, parameters);
      if (!validation.valid) {
        return this.createErrorResult(
          'INVALID_PARAMETERS',
          `Parámetros inválidos: ${validation.errors.join(', ')}`,
          startTime
        );
      }

      // Get handler
      const handler = this.handlers.get(toolName);
      if (!handler) {
        return this.createErrorResult(
          'NO_HANDLER',
          `No hay handler registrado para "${toolName}"`,
          startTime
        );
      }

      // Execute with timeout
      const result = await this.executeWithTimeout(
        handler(parameters, context),
        this.executionTimeout
      );

      return {
        ...result,
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      console.error(`Tool execution failed for ${toolName}:`, error);
      return this.createErrorResult(
        'EXECUTION_ERROR',
        error instanceof Error ? error.message : 'Error desconocido',
        startTime
      );
    }
  }

  /**
   * Register a tool handler
   */
  registerHandler(toolName: string, handler: ToolHandler): void {
    this.handlers.set(toolName, handler);
  }

  /**
   * Validate parameters against tool schema (IToolExecutor interface)
   */
  validateParameters(
    toolName: string,
    parameters: Record<string, unknown>
  ): AIResult<Record<string, unknown>> {
    const tool = this.toolRegistry.get(toolName);
    if (!tool) {
      return {
        success: false,
        error: new AIAgentError(
          AIAgentErrorCode.TOOL_NOT_FOUND,
          `Tool "${toolName}" not found`
        ),
      };
    }

    const validation = this.validateParametersInternal(tool.parameters, parameters);
    if (!validation.valid) {
      return {
        success: false,
        error: new AIAgentError(
          AIAgentErrorCode.INVALID_PARAMETERS,
          validation.errors.join(', ')
        ),
      };
    }

    return {
      success: true,
      data: parameters,
    };
  }

  /**
   * Check if user has permission to execute tool (IToolExecutor interface)
   */
  checkPermission(
    toolName: string,
    user: AIUserContext
  ): AIResult<void> {
    if (!this.toolRegistry.canExecute(toolName, user)) {
      return {
        success: false,
        error: new AIAgentError(
          AIAgentErrorCode.PERMISSION_DENIED,
          `User does not have permission to execute "${toolName}"`
        ),
      };
    }

    return {
      success: true,
      data: undefined,
    };
  }

  /**
   * Validate parameters against schema (internal method)
   */
  private validateParametersInternal(
    schema: Record<string, unknown>,
    parameters: Record<string, unknown>
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const required = (schema.required as string[]) || [];

    // Check required parameters
    for (const param of required) {
      if (!(param in parameters) || parameters[param] === undefined) {
        errors.push(`Parámetro requerido "${param}" faltante`);
      }
    }

    // Type validation could be more extensive here
    // For now, just check required params

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Tool execution timeout'));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Create error result
   */
  private createErrorResult(
    code: string,
    message: string,
    startTime: number
  ): ToolExecutionResult {
    return {
      status: 'failure',
      error: {
        code,
        message,
        userMessage: message,
      },
      durationMs: Date.now() - startTime,
    };
  }

  /**
   * Register default handlers
   * These are placeholder implementations that should be replaced
   * with actual service integrations
   */
  private registerDefaultHandlers(): void {
    // Lead handlers
    this.registerHandler('lead.create', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: `lead_${Date.now()}`,
          ...params,
          createdAt: new Date().toISOString(),
        },
        summary: `Lead "${params.companyName}" creado exitosamente`,
        affectedEntity: {
          type: 'lead',
          id: `lead_${Date.now()}`,
          action: 'created',
        },
      };
    });

    this.registerHandler('lead.read', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          companyName: 'Demo Company',
          status: 'new',
        },
        summary: `Lead encontrado`,
      };
    });

    this.registerHandler('lead.list', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          leads: [],
          total: 0,
        },
        summary: `0 leads encontrados`,
      };
    });

    this.registerHandler('lead.update', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          updated: true,
        },
        summary: `Lead actualizado exitosamente`,
        affectedEntity: {
          type: 'lead',
          id: params.id as string,
          action: 'updated',
        },
      };
    });

    this.registerHandler('lead.delete', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          deleted: true,
        },
        summary: `Lead eliminado exitosamente`,
        affectedEntity: {
          type: 'lead',
          id: params.id as string,
          action: 'deleted',
        },
      };
    });

    this.registerHandler('lead.qualify', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          status: 'qualified',
        },
        summary: `Lead calificado exitosamente`,
        affectedEntity: {
          type: 'lead',
          id: params.id as string,
          action: 'updated',
        },
      };
    });

    this.registerHandler('lead.convert', async (params, ctx) => {
      // TODO: Integrate with LeadService
      return {
        status: 'success' as ActionResultStatus,
        data: {
          leadId: params.id,
          customerId: `customer_${Date.now()}`,
        },
        summary: `Lead convertido a cliente exitosamente`,
        affectedEntity: {
          type: 'customer',
          id: `customer_${Date.now()}`,
          action: 'created',
        },
      };
    });

    // Customer handlers
    this.registerHandler('customer.read', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          companyName: 'Demo Customer',
          tier: 'standard',
        },
        summary: `Cliente encontrado`,
      };
    });

    this.registerHandler('customer.list', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          customers: [],
          total: 0,
        },
        summary: `0 clientes encontrados`,
      };
    });

    // Task handlers
    this.registerHandler('task.create', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: `task_${Date.now()}`,
          ...params,
          createdAt: new Date().toISOString(),
        },
        summary: `Tarea "${params.title}" creada exitosamente`,
        affectedEntity: {
          type: 'task',
          id: `task_${Date.now()}`,
          action: 'created',
        },
      };
    });

    this.registerHandler('task.complete', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          status: 'completed',
          completedAt: new Date().toISOString(),
        },
        summary: `Tarea completada exitosamente`,
        affectedEntity: {
          type: 'task',
          id: params.id as string,
          action: 'updated',
        },
      };
    });

    this.registerHandler('task.list', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          tasks: [],
          total: 0,
        },
        summary: `0 tareas encontradas`,
      };
    });

    // Opportunity handlers
    this.registerHandler('opportunity.create', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: `opp_${Date.now()}`,
          ...params,
          createdAt: new Date().toISOString(),
        },
        summary: `Oportunidad "${params.name}" creada exitosamente`,
        affectedEntity: {
          type: 'opportunity',
          id: `opp_${Date.now()}`,
          action: 'created',
        },
      };
    });

    this.registerHandler('opportunity.list', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          opportunities: [],
          total: 0,
        },
        summary: `0 oportunidades encontradas`,
      };
    });

    // Quote handlers
    this.registerHandler('quote.create', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: `quote_${Date.now()}`,
          ...params,
          createdAt: new Date().toISOString(),
        },
        summary: `Cotización creada exitosamente`,
        affectedEntity: {
          type: 'quote',
          id: `quote_${Date.now()}`,
          action: 'created',
        },
      };
    });

    this.registerHandler('quote.send', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          id: params.id,
          status: 'sent',
          sentAt: new Date().toISOString(),
        },
        summary: `Cotización enviada exitosamente`,
        affectedEntity: {
          type: 'quote',
          id: params.id as string,
          action: 'updated',
        },
      };
    });

    // Search handlers
    this.registerHandler('search.global', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          results: [],
          total: 0,
          query: params.query,
        },
        summary: `0 resultados para "${params.query}"`,
      };
    });

    // Analytics handlers
    this.registerHandler('analytics.dashboard', async (params, ctx) => {
      return {
        status: 'success' as ActionResultStatus,
        data: {
          period: params.period || 'month',
          metrics: {
            totalLeads: 0,
            newLeads: 0,
            totalCustomers: 0,
            totalOpportunities: 0,
            pipelineValue: 0,
            wonDeals: 0,
            conversionRate: 0,
          },
        },
        summary: `Métricas del dashboard obtenidas`,
      };
    });
  }
}
