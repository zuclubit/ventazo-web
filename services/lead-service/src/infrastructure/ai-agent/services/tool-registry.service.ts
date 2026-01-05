/**
 * Tool Registry Service
 * Manages the registration and lookup of AI tools
 */

import { injectable } from 'tsyringe';
import {
  IToolRegistry,
  RegisteredTool,
  SimplifiedToolCategory,
  ToolDefinition,
} from '../types/tool.types';
import { AIUserContext } from '../types/common.types';

// Type alias for internal use
type ToolCategory = SimplifiedToolCategory;

/**
 * Tool Registry implementation
 */
@injectable()
export class ToolRegistryService implements IToolRegistry {
  private tools: Map<string, RegisteredTool> = new Map();
  private toolsByCategory: Map<ToolCategory, Set<string>> = new Map();

  constructor() {
    // Initialize category sets
    const categories: ToolCategory[] = [
      'lead',
      'customer',
      'opportunity',
      'task',
      'quote',
      'contact',
      'activity',
      'search',
      'analytics',
      'admin',
    ];
    categories.forEach((cat) => this.toolsByCategory.set(cat, new Set()));

    // Register default tools
    this.registerDefaultTools();
  }

  /**
   * Register a tool
   */
  register(tool: ToolDefinition): void {
    const registered: RegisteredTool = {
      ...tool,
      registeredAt: new Date(),
      usageCount: 0,
      lastUsed: undefined,
    };

    this.tools.set(tool.name, registered);
    this.toolsByCategory.get(tool.category)?.add(tool.name);
  }

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * List all registered tools
   */
  list(): RegisteredTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * List tools by category
   */
  listByCategory(category: ToolCategory): RegisteredTool[] {
    const toolNames = this.toolsByCategory.get(category) || new Set();
    return Array.from(toolNames)
      .map((name) => this.tools.get(name))
      .filter((t): t is RegisteredTool => t !== undefined);
  }

  /**
   * Check if user can execute a tool
   */
  canExecute(toolName: string, user: AIUserContext): boolean {
    const tool = this.tools.get(toolName);
    if (!tool) return false;

    // If no specific permissions required, allow
    if (!tool.requiredPermissions || tool.requiredPermissions.length === 0) {
      return true;
    }

    // Check if user has at least one required permission
    // Permission strings from tool definition need to be compared with user Permission enum values
    return tool.requiredPermissions.some((perm) =>
      user.permissions.some((userPerm) => userPerm === perm || String(userPerm) === perm)
    );
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): void {
    const tool = this.tools.get(name);
    if (tool) {
      this.tools.delete(name);
      this.toolsByCategory.get(tool.category)?.delete(name);
    }
  }

  /**
   * Get tools formatted for LLM function calling
   */
  getToolsForLLM(user: AIUserContext): Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }> {
    return this.list()
      .filter((tool) => this.canExecute(tool.name, user))
      .map((tool) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      }));
  }

  /**
   * Register default CRM tools
   */
  private registerDefaultTools(): void {
    // Lead tools
    this.register({
      name: 'lead.create',
      description: 'Crear un nuevo lead en el CRM',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          companyName: {
            type: 'string',
            description: 'Nombre de la empresa',
          },
          contactName: {
            type: 'string',
            description: 'Nombre del contacto',
          },
          email: {
            type: 'string',
            description: 'Email del contacto',
          },
          phone: {
            type: 'string',
            description: 'Teléfono del contacto',
          },
          source: {
            type: 'string',
            description: 'Fuente del lead',
          },
        },
        required: ['companyName'],
      },
      requiredPermissions: ['leads:create'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'lead.read',
      description: 'Obtener información de un lead',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del lead',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['leads:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'lead.list',
      description: 'Listar leads con filtros opcionales',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filtrar por status',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de resultados',
          },
          assignedTo: {
            type: 'string',
            description: 'Filtrar por usuario asignado',
          },
        },
      },
      requiredPermissions: ['leads:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'lead.update',
      description: 'Actualizar un lead existente',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del lead',
          },
          updates: {
            type: 'object',
            description: 'Campos a actualizar',
          },
        },
        required: ['id', 'updates'],
      },
      requiredPermissions: ['leads:update'],
      confirmationRequired: false,
      riskLevel: 'medium',
    });

    this.register({
      name: 'lead.delete',
      description: 'Eliminar un lead',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del lead',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['leads:delete'],
      confirmationRequired: true,
      riskLevel: 'high',
    });

    this.register({
      name: 'lead.qualify',
      description: 'Calificar un lead',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del lead',
          },
          qualifiedBy: {
            type: 'string',
            description: 'Usuario que califica',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['leads:update'],
      confirmationRequired: true,
      riskLevel: 'medium',
    });

    this.register({
      name: 'lead.convert',
      description: 'Convertir un lead en cliente',
      category: 'lead',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del lead',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['leads:update', 'customers:create'],
      confirmationRequired: true,
      riskLevel: 'medium',
    });

    // Customer tools
    this.register({
      name: 'customer.read',
      description: 'Obtener información de un cliente',
      category: 'customer',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID del cliente',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['customers:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'customer.list',
      description: 'Listar clientes',
      category: 'customer',
      parameters: {
        type: 'object',
        properties: {
          tier: {
            type: 'string',
            description: 'Filtrar por tier',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de resultados',
          },
        },
      },
      requiredPermissions: ['customers:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    // Task tools
    this.register({
      name: 'task.create',
      description: 'Crear una nueva tarea',
      category: 'task',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Título de la tarea',
          },
          description: {
            type: 'string',
            description: 'Descripción de la tarea',
          },
          dueDate: {
            type: 'string',
            description: 'Fecha de vencimiento',
          },
          priority: {
            type: 'string',
            description: 'Prioridad: low, medium, high',
          },
          relatedTo: {
            type: 'object',
            description: 'Entidad relacionada {type, id}',
          },
        },
        required: ['title'],
      },
      requiredPermissions: ['tasks:create'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'task.complete',
      description: 'Marcar una tarea como completada',
      category: 'task',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la tarea',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['tasks:update'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'task.list',
      description: 'Listar tareas',
      category: 'task',
      parameters: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            description: 'Filtrar por status',
          },
          assignedTo: {
            type: 'string',
            description: 'Filtrar por usuario asignado',
          },
          dueToday: {
            type: 'boolean',
            description: 'Solo tareas que vencen hoy',
          },
        },
      },
      requiredPermissions: ['tasks:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    // Opportunity tools
    this.register({
      name: 'opportunity.create',
      description: 'Crear una nueva oportunidad',
      category: 'opportunity',
      parameters: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
            description: 'Nombre de la oportunidad',
          },
          value: {
            type: 'number',
            description: 'Valor estimado',
          },
          customerId: {
            type: 'string',
            description: 'ID del cliente',
          },
          leadId: {
            type: 'string',
            description: 'ID del lead (si aplica)',
          },
          stage: {
            type: 'string',
            description: 'Etapa del pipeline',
          },
        },
        required: ['name'],
      },
      requiredPermissions: ['opportunities:create'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    this.register({
      name: 'opportunity.list',
      description: 'Listar oportunidades',
      category: 'opportunity',
      parameters: {
        type: 'object',
        properties: {
          stage: {
            type: 'string',
            description: 'Filtrar por etapa',
          },
          minValue: {
            type: 'number',
            description: 'Valor mínimo',
          },
        },
      },
      requiredPermissions: ['opportunities:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    // Quote tools
    this.register({
      name: 'quote.create',
      description: 'Crear una cotización',
      category: 'quote',
      parameters: {
        type: 'object',
        properties: {
          opportunityId: {
            type: 'string',
            description: 'ID de la oportunidad',
          },
          customerId: {
            type: 'string',
            description: 'ID del cliente',
          },
          items: {
            type: 'array',
            description: 'Items de la cotización',
          },
        },
        required: ['customerId'],
      },
      requiredPermissions: ['quotes:create'],
      confirmationRequired: false,
      riskLevel: 'medium',
    });

    this.register({
      name: 'quote.send',
      description: 'Enviar una cotización al cliente',
      category: 'quote',
      parameters: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'ID de la cotización',
          },
        },
        required: ['id'],
      },
      requiredPermissions: ['quotes:update'],
      confirmationRequired: true,
      riskLevel: 'medium',
    });

    // Search tools
    this.register({
      name: 'search.global',
      description: 'Buscar en todo el CRM',
      category: 'search',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'Texto a buscar',
          },
          entityTypes: {
            type: 'array',
            description: 'Tipos de entidad a buscar',
          },
          limit: {
            type: 'number',
            description: 'Número máximo de resultados',
          },
        },
        required: ['query'],
      },
      requiredPermissions: [],
      confirmationRequired: false,
      riskLevel: 'low',
    });

    // Analytics tools
    this.register({
      name: 'analytics.dashboard',
      description: 'Obtener métricas del dashboard',
      category: 'analytics',
      parameters: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            description: 'Periodo: today, week, month, quarter',
          },
        },
      },
      requiredPermissions: ['analytics:read'],
      confirmationRequired: false,
      riskLevel: 'low',
    });
  }
}
