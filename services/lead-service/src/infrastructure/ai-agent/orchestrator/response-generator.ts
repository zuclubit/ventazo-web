/**
 * Response Generator
 * Generates natural language responses from execution results using LLM
 */

import { injectable } from 'tsyringe';
import {
  ClassifiedIntent,
  ExecutedAction,
  AIConversationContext,
  AIUserContext,
  AIMessage,
} from '../types';
import { AIService } from '../../ai';

/**
 * Response generation prompt template
 */
const RESPONSE_PROMPT = `Eres un asistente de CRM amigable y profesional llamado "Asistente Ventazo".
Tu trabajo es comunicar los resultados de las acciones al usuario de forma clara y concisa.

PERSONALIDAD:
- Profesional pero amigable
- Conciso pero completo
- Usa emojis con moderación (✅, ⚠️, 📊, etc.)
- Responde en español
- Trata al usuario de "tú"

INTENT ORIGINAL:
- Tipo: {intent_type}
- Entidad: {intent_entity}
- Operación: {intent_operation}

ACCIONES EJECUTADAS:
{executed_actions}

HISTORIAL RECIENTE:
{conversation_history}

CONTEXTO DEL USUARIO:
- Nombre: {user_name}

INSTRUCCIONES:
1. Resume lo que se hizo de forma clara
2. Menciona los resultados específicos (IDs, nombres, valores)
3. Si hubo errores, explícalos de forma amigable
4. Sugiere próximos pasos si es apropiado
5. Mantén la respuesta corta (2-4 oraciones máximo)

Genera la respuesta directamente, sin formato JSON ni markdown especial.`;

const CLARIFICATION_PROMPT = `Eres un asistente de CRM amigable.
Necesitas pedir clarificación al usuario de forma natural.

INTENT PARCIAL:
- Tipo: {intent_type}
- Entidad detectada: {intent_entity}
- Operación detectada: {intent_operation}
- Confianza: {intent_confidence}
- Pregunta sugerida: {clarification_question}

HISTORIAL:
{conversation_history}

USUARIO: {user_name}

Genera una pregunta de clarificación amigable y específica.
Ofrece opciones si es posible.
Mantén un tono conversacional.`;

const ERROR_PROMPT = `Eres un asistente de CRM amigable.
Ocurrió un error y necesitas comunicarlo al usuario de forma amigable.

ERROR:
{error_message}

CONTEXTO:
{error_context}

USUARIO: {user_name}

Genera un mensaje de error amigable que:
1. Reconozca el problema sin ser técnico
2. Sugiera alternativas o próximos pasos
3. Mantenga un tono positivo
4. Sea breve (1-2 oraciones)`;

const GREETING_RESPONSES = [
  '¡Hola {user_name}! 👋 Soy tu asistente Ventazo. ¿En qué puedo ayudarte hoy?',
  '¡Hola {user_name}! ¿Cómo puedo asistirte con tu CRM hoy?',
  '¡Buenos días, {user_name}! Estoy aquí para ayudarte. ¿Qué necesitas?',
];

const HELP_RESPONSE = `¡Claro! 🚀 Aquí hay algunas cosas que puedo hacer por ti:

**Leads y Clientes:**
• "Crea un lead para [empresa]"
• "Muéstrame los leads de hoy"
• "Busca el cliente [nombre]"

**Oportunidades:**
• "¿Cuántas oportunidades tengo abiertas?"
• "Muéstrame el pipeline de ventas"

**Tareas:**
• "Crea una tarea de seguimiento para [lead]"
• "¿Qué tareas tengo pendientes?"
• "Marca la tarea [X] como completada"

**Cotizaciones:**
• "Crea una cotización para [cliente]"
• "Envía la cotización [X]"

¿Por dónde empezamos?`;

/**
 * Response Generator implementation
 */
@injectable()
export class ResponseGenerator {
  constructor(private aiService: AIService) {}

  /**
   * Generate a response message from execution results
   */
  async generate(
    intent: ClassifiedIntent,
    executedActions: ExecutedAction[],
    context: AIConversationContext,
    user: AIUserContext
  ): Promise<AIMessage> {
    // Handle special intent types first
    if (intent.type === 'greeting') {
      return this.generateGreeting(user);
    }

    if (intent.type === 'help') {
      return this.generateHelp(user);
    }

    if (intent.type === 'feedback') {
      return this.generateFeedbackAck(user);
    }

    // If no actions were executed, generate based on intent type
    if (executedActions.length === 0) {
      if (intent.needsClarification) {
        return this.generateClarification(intent, context, user);
      }
      return this.generateNoActionResponse(intent, user);
    }

    try {
      // Build the response prompt
      const prompt = this.buildResponsePrompt(intent, executedActions, context, user);

      // Call AI service for response generation
      const result = await this.aiService.chat(
        user.tenantId,
        user.userId,
        [
          {
            role: 'system',
            content: 'Eres el asistente Ventazo. Genera respuestas claras y concisas.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.7,
          maxTokens: 300,
        }
      );

      if (result.isFailure) {
        return this.generateFallbackResponse(intent, executedActions, user);
      }

      return {
        id: this.generateId(),
        role: 'assistant',
        content: result.value.content,
        createdAt: new Date(),
      };
    } catch (error) {
      console.error('Response generation failed:', error);
      return this.generateFallbackResponse(intent, executedActions, user);
    }
  }

  /**
   * Generate an error response
   */
  async generateError(
    error: Error,
    context: AIConversationContext,
    user?: AIUserContext
  ): Promise<AIMessage> {
    const errorMessage = error.message;
    const errorContext = context.messages
      .slice(-2)
      .map((m) => m.content)
      .join(' -> ');

    try {
      const prompt = ERROR_PROMPT
        .replace('{error_message}', errorMessage)
        .replace('{error_context}', errorContext)
        .replace('{user_name}', user?.userName || 'Usuario');

      const result = await this.aiService.chat(
        user?.tenantId || context.tenantId,
        user?.userId || context.userId,
        [
          {
            role: 'system',
            content: 'Genera un mensaje de error amigable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.5,
          maxTokens: 150,
        }
      );

      if (result.isFailure) {
        return this.generateFallbackError(error, user);
      }

      return {
        id: this.generateId(),
        role: 'assistant',
        content: result.value.content,
        createdAt: new Date(),
      };
    } catch {
      return this.generateFallbackError(error, user);
    }
  }

  /**
   * Generate a clarification request
   */
  async generateClarification(
    intent: ClassifiedIntent,
    context: AIConversationContext,
    user?: AIUserContext
  ): Promise<AIMessage> {
    // If we already have a clarification question, use it
    if (intent.clarificationQuestion) {
      return {
        id: this.generateId(),
        role: 'assistant',
        content: intent.clarificationQuestion,
        createdAt: new Date(),
      };
    }

    try {
      const conversationHistory = context.messages
        .slice(-3)
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n');

      const prompt = CLARIFICATION_PROMPT
        .replace('{intent_type}', intent.type)
        .replace('{intent_entity}', intent.entity || 'desconocida')
        .replace('{intent_operation}', intent.operation || 'desconocida')
        .replace('{intent_confidence}', intent.confidence.toString())
        .replace('{clarification_question}', intent.clarificationQuestion || '')
        .replace('{conversation_history}', conversationHistory || '(Sin historial)')
        .replace('{user_name}', user?.userName || 'Usuario');

      const result = await this.aiService.chat(
        user?.tenantId || context.tenantId,
        user?.userId || context.userId,
        [
          {
            role: 'system',
            content: 'Genera una pregunta de clarificación amigable.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        {
          temperature: 0.6,
          maxTokens: 150,
        }
      );

      if (result.isFailure) {
        return {
          id: this.generateId(),
          role: 'assistant',
          content: '¿Podrías darme más detalles sobre lo que necesitas?',
          createdAt: new Date(),
        };
      }

      return {
        id: this.generateId(),
        role: 'assistant',
        content: result.value.content,
        createdAt: new Date(),
      };
    } catch {
      return {
        id: this.generateId(),
        role: 'assistant',
        content: '¿Podrías darme más detalles sobre lo que necesitas?',
        createdAt: new Date(),
      };
    }
  }

  /**
   * Build the response generation prompt
   */
  private buildResponsePrompt(
    intent: ClassifiedIntent,
    executedActions: ExecutedAction[],
    context: AIConversationContext,
    user: AIUserContext
  ): string {
    // Format executed actions
    const actionsDescription = executedActions
      .map((action) => {
        const status = action.status === 'success' ? '✅' : '❌';
        const result = action.result
          ? `Resultado: ${JSON.stringify(action.result, null, 2)}`
          : '';
        const error = action.error ? `Error: ${action.error.message}` : '';
        return `${status} ${action.toolName}\n  ${result || error}`;
      })
      .join('\n\n');

    // Build conversation history
    const history = context.messages
      .slice(-3)
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    return RESPONSE_PROMPT
      .replace('{intent_type}', intent.type)
      .replace('{intent_entity}', intent.entity || 'general')
      .replace('{intent_operation}', intent.operation || 'consulta')
      .replace('{executed_actions}', actionsDescription)
      .replace('{conversation_history}', history || '(Sin historial)')
      .replace('{user_name}', user.userName);
  }

  /**
   * Generate greeting response
   */
  private generateGreeting(user: AIUserContext): AIMessage {
    const template =
      GREETING_RESPONSES[Math.floor(Math.random() * GREETING_RESPONSES.length)];
    const content = template.replace('{user_name}', user.userName);

    return {
      id: this.generateId(),
      role: 'assistant',
      content,
      createdAt: new Date(),
    };
  }

  /**
   * Generate help response
   */
  private generateHelp(user: AIUserContext): AIMessage {
    return {
      id: this.generateId(),
      role: 'assistant',
      content: HELP_RESPONSE,
      createdAt: new Date(),
    };
  }

  /**
   * Generate feedback acknowledgment
   */
  private generateFeedbackAck(user: AIUserContext): AIMessage {
    return {
      id: this.generateId(),
      role: 'assistant',
      content: `¡Gracias por tu feedback, ${user.userName}! Lo tendremos en cuenta para mejorar. 🙏`,
      createdAt: new Date(),
    };
  }

  /**
   * Generate response when no action was executed
   */
  private generateNoActionResponse(
    intent: ClassifiedIntent,
    user: AIUserContext
  ): AIMessage {
    let content: string;

    switch (intent.type) {
      case 'query':
        content = 'Déjame buscar esa información para ti...';
        break;
      case 'unknown':
        content =
          'No estoy seguro de entender. ¿Podrías reformular tu solicitud o escribir "ayuda" para ver lo que puedo hacer?';
        break;
      default:
        content = `Entendido, ${user.userName}. ¿Hay algo más en lo que pueda ayudarte?`;
    }

    return {
      id: this.generateId(),
      role: 'assistant',
      content,
      createdAt: new Date(),
    };
  }

  /**
   * Generate fallback response when AI fails
   */
  private generateFallbackResponse(
    intent: ClassifiedIntent,
    executedActions: ExecutedAction[],
    user: AIUserContext
  ): AIMessage {
    const successCount = executedActions.filter((a) => a.status === 'success').length;
    const failCount = executedActions.filter((a) => a.status === 'failure').length;

    let content: string;
    const userName = user.displayName || user.userName || 'Usuario';

    if (successCount > 0 && failCount === 0) {
      content = `✅ ¡Listo, ${userName}! Se completaron ${successCount} acción(es) correctamente.`;
    } else if (failCount > 0 && successCount === 0) {
      content = `⚠️ Lo siento, ${userName}. Hubo problemas al ejecutar tu solicitud. ¿Podrías intentarlo de nuevo?`;
    } else if (successCount > 0 && failCount > 0) {
      content = `✅ Se completaron ${successCount} acción(es), pero ⚠️ ${failCount} tuvieron problemas.`;
    } else {
      content = `Entendido, ${userName}. ¿En qué más puedo ayudarte?`;
    }

    return {
      id: this.generateId(),
      role: 'assistant',
      content,
      createdAt: new Date(),
    };
  }

  /**
   * Generate fallback error response
   */
  private generateFallbackError(error: Error, user?: AIUserContext): AIMessage {
    return {
      id: this.generateId(),
      role: 'assistant',
      content: `⚠️ Lo siento${user ? `, ${user.userName}` : ''}, ocurrió un error. Por favor intenta de nuevo o contacta a soporte si el problema persiste.`,
      createdAt: new Date(),
    };
  }

  /**
   * Generate a unique ID
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
