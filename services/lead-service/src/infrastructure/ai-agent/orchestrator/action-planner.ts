/**
 * Action Planner
 * Creates execution plans from classified intents using LLM-based reasoning
 */

import { injectable, inject } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import {
  ClassifiedIntent,
  ActionPlan,
  PlannedAction,
  AIConversationContext,
  AIUserContext,
  ActionImpact,
} from '../types';
import { IToolRegistry, RegisteredTool } from '../types/tool.types';
import { AIService } from '../../ai';

/**
 * Action planning prompt template
 */
const PLANNING_PROMPT = `Eres un planificador de acciones para un CRM empresarial.
Dado el intent del usuario, debes crear un plan de acciones usando las herramientas disponibles.

HERRAMIENTAS DISPONIBLES:
{available_tools}

INTENT DEL USUARIO:
- Tipo: {intent_type}
- Entidad: {intent_entity}
- Operación: {intent_operation}
- Parámetros extraídos: {intent_parameters}
- Confianza: {intent_confidence}

HISTORIAL RECIENTE:
{conversation_history}

CONTEXTO DEL USUARIO:
- Nombre: {user_name}
- Rol: {user_role}
- Permisos: {user_permissions}

REGLAS DE PLANIFICACIÓN:
1. Usa SOLO las herramientas disponibles listadas arriba
2. Respeta las dependencias (algunas acciones requieren otras primero)
3. Las acciones destructivas (delete) siempre requieren confirmación
4. Los cambios de alto valor requieren confirmación
5. Minimiza el número de acciones necesarias
6. Si faltan parámetros obligatorios, indica que se necesita clarificación

Responde SOLO con un JSON válido (sin markdown):
{
  "actions": [
    {
      "sequence": 1,
      "toolName": "nombre_herramienta",
      "parameters": { ... parámetros ... },
      "rationale": "razón de esta acción",
      "dependsOn": [],
      "requiresConfirmation": true|false,
      "impact": "low|medium|high|critical"
    }
  ],
  "requiresConfirmation": true|false,
  "estimatedTimeMs": 1000,
  "confidence": 0.0-1.0,
  "missingParameters": ["lista de parámetros faltantes si hay"]
}`;

/**
 * Action Planner implementation
 */
@injectable()
export class ActionPlanner {
  constructor(
    private aiService: AIService,
    @inject('IToolRegistry') private toolRegistry: IToolRegistry
  ) {}

  /**
   * Create an action plan for a classified intent
   */
  async plan(
    intent: ClassifiedIntent,
    context: AIConversationContext,
    user: AIUserContext
  ): Promise<ActionPlan> {
    // Handle non-action intents
    if (intent.type !== 'action' && intent.type !== 'query') {
      return this.createEmptyPlan(intent);
    }

    try {
      // Get available tools for user
      const availableTools = await this.getAvailableTools(user);

      if (availableTools.length === 0) {
        return this.createEmptyPlan(intent, 'No hay herramientas disponibles para tu rol');
      }

      // Build the planning prompt
      const prompt = this.buildPlanningPrompt(intent, context, user, availableTools);

      // Call AI service for planning
      const result = await this.aiService.chat(
        user.tenantId,
        user.userId,
        [
          {
            role: 'system',
            content: 'Eres un planificador de acciones de CRM. Responde SOLO con JSON válido, sin markdown ni explicaciones.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.2, // Low temperature for consistent planning
          maxTokens: 1000,
        }
      );

      if (result.isFailure) {
        return this.createFallbackPlan(intent, context, user);
      }

      // Parse and validate the plan
      const plan = this.parsePlanningResponse(result.value.content, intent);

      // Validate the plan
      const validation = await this.validate(plan, context, user);
      if (!validation.valid) {
        console.warn('Plan validation failed:', validation.errors);
        return this.createFallbackPlan(intent, context, user);
      }

      return plan;
    } catch (error) {
      console.error('Action planning failed:', error);
      return this.createFallbackPlan(intent, context, user);
    }
  }

  /**
   * Validate that a plan is executable
   */
  async validate(
    plan: ActionPlan,
    context: AIConversationContext,
    user?: AIUserContext
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check each action
    for (const action of plan.actions) {
      // Check if tool exists
      const tool = this.toolRegistry.get(action.toolName);
      if (!tool) {
        errors.push(`Herramienta "${action.toolName}" no encontrada`);
        continue;
      }

      // Check permissions
      if (user && !this.toolRegistry.canExecute(action.toolName, user)) {
        errors.push(`Sin permisos para ejecutar "${action.toolName}"`);
      }

      // Check required parameters
      const missingParams = this.checkRequiredParameters(tool, action.parameters);
      if (missingParams.length > 0) {
        errors.push(
          `Parámetros faltantes para "${action.toolName}": ${missingParams.join(', ')}`
        );
      }

      // Check dependencies
      for (const dep of action.dependsOn) {
        if (!plan.actions.find((a) => a.sequence === dep)) {
          errors.push(`Dependencia inválida: acción ${dep} no existe`);
        }
        if (dep >= action.sequence) {
          errors.push(`Dependencia circular: acción ${action.sequence} depende de ${dep}`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get available tools for user
   */
  private async getAvailableTools(user: AIUserContext): Promise<RegisteredTool[]> {
    const allTools = this.toolRegistry.list();
    return allTools.filter((tool) => this.toolRegistry.canExecute(tool.name, user));
  }

  /**
   * Build the planning prompt
   */
  private buildPlanningPrompt(
    intent: ClassifiedIntent,
    context: AIConversationContext,
    user: AIUserContext,
    tools: RegisteredTool[]
  ): string {
    // Format available tools
    const toolsDescription = tools
      .map((t) => {
        const params = Object.entries(t.parameters.properties || {})
          .map(([name, schema]) => {
            const requiredParams = t.parameters.required as string[] | undefined;
            const required = requiredParams?.includes(name) ? '(requerido)' : '(opcional)';
            return `    - ${name} ${required}: ${(schema as { description?: string }).description || ''}`;
          })
          .join('\n');
        return `- ${t.name}: ${t.description}\n  Parámetros:\n${params}`;
      })
      .join('\n\n');

    // Build conversation history
    const history = context.messages
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    return PLANNING_PROMPT
      .replace('{available_tools}', toolsDescription)
      .replace('{intent_type}', intent.type)
      .replace('{intent_entity}', intent.entity || 'ninguna')
      .replace('{intent_operation}', intent.operation || 'ninguna')
      .replace('{intent_parameters}', JSON.stringify(intent.parameters))
      .replace('{intent_confidence}', intent.confidence.toString())
      .replace('{conversation_history}', history || '(Sin historial)')
      .replace('{user_name}', user.displayName || user.userName || 'Usuario')
      .replace('{user_role}', user.role)
      .replace('{user_permissions}', user.permissions.join(', ') || 'básicos');
  }

  /**
   * Parse the AI planning response
   */
  private parsePlanningResponse(response: string, intent: ClassifiedIntent): ActionPlan {
    try {
      // Clean up the response
      let cleaned = response.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.slice(7);
      }
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3);
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3);
      }
      cleaned = cleaned.trim();

      const parsed = JSON.parse(cleaned);

      // Build the action plan
      const actions: PlannedAction[] = (parsed.actions || []).map(
        (action: {
          sequence: number;
          toolName: string;
          parameters: Record<string, unknown>;
          rationale: string;
          dependsOn: number[];
          requiresConfirmation: boolean;
          impact: string;
          affectedEntity?: { type: string; id?: string };
        }) => ({
          sequence: action.sequence,
          toolName: action.toolName,
          parameters: action.parameters || {},
          rationale: action.rationale || '',
          dependsOn: action.dependsOn || [],
          requiresConfirmation: Boolean(action.requiresConfirmation),
          impact: this.validateImpact(action.impact),
          affectedEntity: action.affectedEntity,
        })
      );

      return {
        id: uuid(),
        intent,
        actions,
        estimatedTimeMs: parsed.estimatedTimeMs || 1000,
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.7)),
        requiresConfirmation: actions.some((a) => a.requiresConfirmation),
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Failed to parse planning response:', error, response);
      throw error;
    }
  }

  /**
   * Validate action impact level
   */
  private validateImpact(impact: string): ActionImpact {
    const validImpacts: ActionImpact[] = ['low', 'medium', 'high', 'critical'];
    return validImpacts.includes(impact as ActionImpact)
      ? (impact as ActionImpact)
      : 'low';
  }

  /**
   * Check required parameters for a tool
   */
  private checkRequiredParameters(
    tool: RegisteredTool,
    parameters: Record<string, unknown>
  ): string[] {
    const required = (tool.parameters.required as string[]) || [];
    return required.filter((param: string) => !(param in parameters) || parameters[param] === undefined);
  }

  /**
   * Create an empty plan (for non-action intents)
   */
  private createEmptyPlan(intent: ClassifiedIntent, reason?: string): ActionPlan {
    return {
      id: uuid(),
      intent,
      actions: [],
      estimatedTimeMs: 0,
      confidence: 1.0,
      requiresConfirmation: false,
      createdAt: new Date(),
    };
  }

  /**
   * Create a fallback plan using heuristics
   */
  private createFallbackPlan(
    intent: ClassifiedIntent,
    context: AIConversationContext,
    user: AIUserContext
  ): ActionPlan {
    const actions: PlannedAction[] = [];

    // Try to map intent to tool directly
    if (intent.entity && intent.operation) {
      const toolName = `${intent.entity}.${intent.operation}`;
      const tool = this.toolRegistry.get(toolName);

      if (tool && this.toolRegistry.canExecute(toolName, user)) {
        const isDestructive = intent.operation === 'delete';
        const isHighValue =
          intent.entity === 'opportunity' &&
          intent.parameters.value &&
          Number(intent.parameters.value) > 100000;

        actions.push({
          sequence: 1,
          toolName,
          parameters: intent.parameters,
          rationale: `Ejecutar ${intent.operation} en ${intent.entity}`,
          dependsOn: [],
          requiresConfirmation: isDestructive || isHighValue,
          impact: isDestructive ? 'high' : isHighValue ? 'high' : 'medium',
          affectedEntity: {
            type: intent.entity,
            id: intent.parameters.id as string | undefined,
          },
        });
      }
    }

    return {
      id: uuid(),
      intent,
      actions,
      estimatedTimeMs: actions.length * 1000,
      confidence: 0.5, // Lower confidence for fallback
      requiresConfirmation: actions.some((a) => a.requiresConfirmation),
      createdAt: new Date(),
    };
  }
}
