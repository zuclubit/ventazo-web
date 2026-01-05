/**
 * Intent Classifier
 * Classifies user messages into intents using LLM-based analysis
 */

import { injectable } from 'tsyringe';
import {
  ClassifiedIntent,
  IntentType,
  AIConversationContext,
  AIUserContext,
  AIEntityType,
  AIOperation,
} from '../types';
import { AIService } from '../../ai';

/**
 * Intent classification prompt template
 */
const CLASSIFICATION_PROMPT = `Eres un clasificador de intenciones para un CRM empresarial.
Tu trabajo es analizar el mensaje del usuario y determinar qué quiere hacer.

ENTIDADES DISPONIBLES:
- lead: Prospectos o leads de ventas
- customer: Clientes existentes
- opportunity: Oportunidades de negocio
- task: Tareas pendientes
- quote: Cotizaciones
- contact: Contactos de leads/clientes
- activity: Actividades (llamadas, reuniones, etc.)
- pipeline: Pipelines de ventas

OPERACIONES DISPONIBLES:
- create: Crear nuevo registro
- read: Consultar información
- update: Actualizar registro existente
- delete: Eliminar registro
- list: Listar múltiples registros
- search: Buscar registros
- assign: Asignar a usuario
- qualify: Calificar lead
- convert: Convertir lead a cliente
- complete: Completar tarea
- send: Enviar (ej: cotización)
- schedule: Programar actividad

TIPOS DE INTENCIÓN:
- query: El usuario quiere información (ej: "¿cuántos leads tengo?", "muéstrame el cliente X")
- action: El usuario quiere realizar una acción (ej: "crea un lead", "marca la tarea como completada")
- clarification: El usuario está aclarando algo previo
- confirmation: El usuario está confirmando o negando una acción
- greeting: El usuario está saludando
- help: El usuario necesita ayuda
- feedback: El usuario está dando feedback
- unknown: No se puede determinar

HISTORIAL DE CONVERSACIÓN:
{conversation_history}

MENSAJE DEL USUARIO:
{user_message}

CONTEXTO DEL USUARIO:
- Nombre: {user_name}
- Rol: {user_role}
- Vista actual: {current_view}

Responde SOLO con un JSON válido (sin markdown):
{
  "type": "query|action|clarification|confirmation|greeting|help|feedback|unknown",
  "confidence": 0.0-1.0,
  "entity": "lead|customer|opportunity|task|quote|contact|activity|pipeline|null",
  "operation": "create|read|update|delete|list|search|assign|qualify|convert|complete|send|schedule|null",
  "parameters": { ... parámetros extraídos ... },
  "needsClarification": true|false,
  "clarificationQuestion": "pregunta si necesita aclaración o null"
}`;

/**
 * Intent Classifier implementation
 */
@injectable()
export class IntentClassifier {
  constructor(private aiService: AIService) {}

  /**
   * Classify the intent of a user message
   */
  async classify(
    message: string,
    context: AIConversationContext,
    user: AIUserContext
  ): Promise<ClassifiedIntent> {
    try {
      // Build conversation history
      const conversationHistory = this.buildConversationHistory(context);

      // Build the classification prompt
      const prompt = CLASSIFICATION_PROMPT
        .replace('{conversation_history}', conversationHistory)
        .replace('{user_message}', message)
        .replace('{user_name}', user.displayName || user.userName || 'Usuario')
        .replace('{user_role}', user.role)
        .replace('{current_view}', String(context.metadata?.currentView || 'dashboard'));

      // Call AI service
      const result = await this.aiService.chat(
        user.tenantId,
        user.userId,
        [
          {
            role: 'system',
            content: 'Eres un clasificador de intenciones. Responde SOLO con JSON válido, sin markdown ni explicaciones.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.1, // Low temperature for consistent classification
          maxTokens: 500,
        }
      );

      if (result.isFailure) {
        // Return unknown intent on AI failure
        return this.createUnknownIntent(message);
      }

      // Parse the response
      const parsed = this.parseClassificationResponse(result.value.content);

      // Validate and enhance the classification
      return this.validateAndEnhance(parsed, message, context);
    } catch (error) {
      console.error('Intent classification failed:', error);
      return this.createUnknownIntent(message);
    }
  }

  /**
   * Build conversation history string for context
   */
  private buildConversationHistory(context: AIConversationContext): string {
    if (!context.messages || context.messages.length === 0) {
      return '(Sin historial previo)';
    }

    // Get last 5 messages for context
    const recentMessages = context.messages.slice(-5);

    return recentMessages
      .map((msg) => `${msg.role === 'user' ? 'Usuario' : 'Asistente'}: ${msg.content}`)
      .join('\n');
  }

  /**
   * Parse the AI classification response
   */
  private parseClassificationResponse(response: string): ClassifiedIntent {
    try {
      // Clean up the response (remove markdown if present)
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

      return {
        type: this.validateIntentType(parsed.type),
        confidence: Math.min(1, Math.max(0, parsed.confidence || 0.5)),
        entity: this.validateEntity(parsed.entity),
        operation: this.validateOperation(parsed.operation),
        parameters: parsed.parameters || {},
        needsClarification: Boolean(parsed.needsClarification),
        clarificationQuestion: parsed.clarificationQuestion || undefined,
      };
    } catch (error) {
      console.error('Failed to parse classification response:', error, response);
      return {
        type: 'unknown',
        confidence: 0.3,
        parameters: {},
        needsClarification: true,
        clarificationQuestion: 'No entendí bien tu solicitud. ¿Podrías reformularla?',
      };
    }
  }

  /**
   * Validate intent type
   */
  private validateIntentType(type: string): IntentType {
    const validTypes: IntentType[] = [
      'query',
      'action',
      'clarification',
      'confirmation',
      'greeting',
      'help',
      'feedback',
      'unknown',
    ];
    return validTypes.includes(type as IntentType) ? (type as IntentType) : 'unknown';
  }

  /**
   * Validate entity type
   */
  private validateEntity(entity: string | null): AIEntityType | undefined {
    if (!entity) return undefined;

    const validEntities: AIEntityType[] = [
      'lead',
      'customer',
      'opportunity',
      'task',
      'quote',
      'contact',
      'activity',
      'pipeline',
    ];
    return validEntities.includes(entity as AIEntityType)
      ? (entity as AIEntityType)
      : undefined;
  }

  /**
   * Validate operation type
   */
  private validateOperation(operation: string | null): AIOperation | undefined {
    if (!operation) return undefined;

    const validOperations: AIOperation[] = [
      'create',
      'read',
      'update',
      'delete',
      'list',
      'search',
      'assign',
      'qualify',
      'convert',
      'complete',
      'send',
      'cancel',
      'analyze',
    ];
    return validOperations.includes(operation as AIOperation)
      ? (operation as AIOperation)
      : undefined;
  }

  /**
   * Validate and enhance the classification
   */
  private validateAndEnhance(
    intent: ClassifiedIntent,
    originalMessage: string,
    context: AIConversationContext
  ): ClassifiedIntent {
    // If low confidence and it's an action, request clarification
    if (intent.type === 'action' && intent.confidence < 0.7 && !intent.needsClarification) {
      intent.needsClarification = true;
      intent.clarificationQuestion = this.generateClarificationQuestion(intent);
    }

    // Check for quick patterns
    const lowerMessage = originalMessage.toLowerCase().trim();

    // Greeting patterns
    if (this.isGreeting(lowerMessage)) {
      return {
        type: 'greeting',
        confidence: 0.95,
        parameters: {},
        needsClarification: false,
      };
    }

    // Help patterns
    if (this.isHelpRequest(lowerMessage)) {
      return {
        type: 'help',
        confidence: 0.95,
        parameters: {},
        needsClarification: false,
      };
    }

    // Confirmation patterns
    if (this.isConfirmation(lowerMessage)) {
      return {
        type: 'confirmation',
        confidence: 0.95,
        parameters: { confirmed: true },
        needsClarification: false,
      };
    }

    // Denial patterns
    if (this.isDenial(lowerMessage)) {
      return {
        type: 'confirmation',
        confidence: 0.95,
        parameters: { confirmed: false },
        needsClarification: false,
      };
    }

    return intent;
  }

  /**
   * Generate a clarification question based on the partial intent
   */
  private generateClarificationQuestion(intent: ClassifiedIntent): string {
    if (intent.entity && !intent.operation) {
      return `¿Qué te gustaría hacer con ${this.getEntityLabel(intent.entity)}?`;
    }
    if (intent.operation && !intent.entity) {
      return `¿En qué tipo de registro te gustaría ${this.getOperationLabel(intent.operation)}?`;
    }
    return '¿Podrías darme más detalles sobre lo que necesitas?';
  }

  /**
   * Get human-readable entity label
   */
  private getEntityLabel(entity: AIEntityType): string {
    const labels: Record<AIEntityType, string> = {
      lead: 'el lead',
      customer: 'el cliente',
      opportunity: 'la oportunidad',
      task: 'la tarea',
      quote: 'la cotización',
      contact: 'el contacto',
      activity: 'la actividad',
      pipeline: 'el pipeline',
      note: 'la nota',
      campaign: 'la campaña',
    };
    return labels[entity] || entity;
  }

  /**
   * Get human-readable operation label
   */
  private getOperationLabel(operation: AIOperation): string {
    const labels: Record<AIOperation, string> = {
      create: 'crear',
      read: 'ver',
      update: 'actualizar',
      delete: 'eliminar',
      list: 'listar',
      search: 'buscar',
      assign: 'asignar',
      qualify: 'calificar',
      convert: 'convertir',
      complete: 'completar',
      send: 'enviar',
      cancel: 'cancelar',
      analyze: 'analizar',
    };
    return labels[operation] || operation;
  }

  /**
   * Check if message is a greeting
   */
  private isGreeting(message: string): boolean {
    const greetings = [
      'hola',
      'buenos días',
      'buenas tardes',
      'buenas noches',
      'hey',
      'hi',
      'hello',
      'qué tal',
      'saludos',
    ];
    return greetings.some((g) => message.startsWith(g) || message === g);
  }

  /**
   * Check if message is a help request
   */
  private isHelpRequest(message: string): boolean {
    const helpPatterns = [
      'ayuda',
      'help',
      '?',
      'qué puedes hacer',
      'cómo funciona',
      'no entiendo',
      'necesito ayuda',
    ];
    return helpPatterns.some((p) => message.includes(p));
  }

  /**
   * Check if message is a confirmation
   */
  private isConfirmation(message: string): boolean {
    const confirmPatterns = [
      'sí',
      'si',
      'yes',
      'confirmar',
      'confirmo',
      'adelante',
      'ok',
      'okay',
      'dale',
      'hazlo',
      'procede',
      'correcto',
      'afirmativo',
    ];
    return confirmPatterns.some((p) => message === p || message.startsWith(p + ' '));
  }

  /**
   * Check if message is a denial
   */
  private isDenial(message: string): boolean {
    const denyPatterns = [
      'no',
      'cancelar',
      'cancela',
      'cancelo',
      'deny',
      'negar',
      'olvidalo',
      'olvídalo',
      'dejalo',
      'déjalo',
      'no gracias',
    ];
    return denyPatterns.some((p) => message === p || message.startsWith(p + ' '));
  }

  /**
   * Create an unknown intent fallback
   */
  private createUnknownIntent(message: string): ClassifiedIntent {
    return {
      type: 'unknown',
      confidence: 0.3,
      parameters: { originalMessage: message },
      needsClarification: true,
      clarificationQuestion:
        'No estoy seguro de entender. ¿Podrías reformular tu solicitud o decirme "ayuda" para ver lo que puedo hacer?',
    };
  }
}
