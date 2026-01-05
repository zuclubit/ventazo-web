/**
 * AI Tool Registry Types
 * Types for the tool registry and tool execution system
 */

import { Permission } from '../../auth/types';
import {
  AIEntityType,
  AIOperation,
  ActionImpact,
  ActionResultStatus,
  AIUserContext,
  AIConversationContext,
  JSONSchema,
  AIResult,
} from './common.types';

// ============================================================================
// Tool Definition Types
// ============================================================================

/**
 * Tool category for organization
 */
export type ToolCategory =
  | 'lead_management'
  | 'customer_management'
  | 'opportunity_management'
  | 'task_management'
  | 'quote_management'
  | 'search'
  | 'analytics'
  | 'communication'
  | 'workflow'
  | 'system';

/**
 * Tool definition
 * Describes a callable tool that the AI can use
 */
export interface Tool {
  /** Unique tool identifier (e.g., 'lead.create') */
  name: string;

  /** Human-readable display name */
  displayName: string;

  /** Description for the AI to understand when to use this tool */
  description: string;

  /** Tool category */
  category: ToolCategory;

  /** Entity type this tool operates on */
  entityType: AIEntityType;

  /** Operation type */
  operation: AIOperation;

  /** Required permissions to execute this tool */
  requiredPermissions: Permission[];

  /** JSON Schema for parameters */
  parameters: JSONSchema;

  /** Whether this tool requires user confirmation */
  requiresConfirmation: boolean;

  /** Impact level of this tool */
  impact: ActionImpact;

  /** Whether this tool can be executed in parallel with others */
  parallelizable: boolean;

  /** Maximum execution time in ms (for timeout) */
  maxExecutionTimeMs: number;

  /** Whether this tool is enabled */
  enabled: boolean;

  /** Rate limit (executions per minute per user) */
  rateLimit?: number;

  /** Examples for the AI */
  examples?: ToolExample[];

  /** Execute the tool */
  execute: ToolExecutor;
}

/**
 * Tool example for AI understanding
 */
export interface ToolExample {
  /** User input that would trigger this tool */
  userInput: string;

  /** Expected parameters extracted */
  parameters: Record<string, unknown>;

  /** Expected result description */
  expectedResult: string;
}

/**
 * Tool executor function type
 */
export type ToolExecutor = (
  params: unknown,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

/**
 * Context provided to tool during execution
 */
export interface ToolExecutionContext {
  /** User context */
  user: AIUserContext;

  /** Conversation context */
  conversation: AIConversationContext;

  /** Correlation ID for tracing */
  correlationId: string;

  /** Request ID */
  requestId: string;

  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
}

/**
 * Result of tool execution
 */
export interface ToolExecutionResult {
  /** Execution status */
  status: ActionResultStatus;

  /** Result data */
  data?: unknown;

  /** Human-readable summary of what happened */
  summary?: string;

  /** Affected entity if applicable */
  affectedEntity?: {
    type: AIEntityType;
    id: string;
    name?: string;
    action?: string;
  };

  /** Related entities if applicable */
  relatedEntities?: Array<{
    type: AIEntityType;
    id: string;
    name?: string;
    relationship: string;
  }>;

  /** Suggestions for follow-up */
  suggestions?: string[];

  /** Warnings if any */
  warnings?: string[];

  /** Execution duration in milliseconds */
  durationMs?: number;

  /** Error details if failed */
  error?: {
    code: string;
    message: string;
    userMessage?: string;
  };
}

// ============================================================================
// Tool Registration Types
// ============================================================================

/**
 * Tool registration options
 */
export interface ToolRegistrationOptions {
  /** Override existing tool with same name */
  override?: boolean;

  /** Enable the tool immediately */
  enabled?: boolean;
}

/**
 * Tool metadata for discovery
 */
export interface ToolMetadata {
  name: string;
  displayName: string;
  description: string;
  category: ToolCategory;
  entityType: AIEntityType;
  operation: AIOperation;
  requiredPermissions: Permission[];
  requiresConfirmation: boolean;
  impact: ActionImpact;
  enabled: boolean;
}

// ============================================================================
// Simplified Tool Types (for MVP implementation)
// ============================================================================

/**
 * Simplified tool category for the MVP implementation
 */
export type SimplifiedToolCategory =
  | 'lead'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'quote'
  | 'contact'
  | 'activity'
  | 'search'
  | 'analytics'
  | 'admin';

/**
 * Risk level for tool operations
 */
export type ToolRiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Simplified tool definition for the MVP
 */
export interface ToolDefinition {
  /** Unique tool name (e.g., 'lead.create') */
  name: string;

  /** Description for AI */
  description: string;

  /** Tool category */
  category: SimplifiedToolCategory;

  /** JSON Schema for parameters */
  parameters: Record<string, unknown>;

  /** Required permissions */
  requiredPermissions?: string[];

  /** Whether confirmation is required */
  confirmationRequired: boolean;

  /** Risk level */
  riskLevel: ToolRiskLevel;
}

/**
 * Registered tool with metadata
 */
export interface RegisteredTool extends ToolDefinition {
  /** When the tool was registered */
  registeredAt: Date;

  /** Usage count */
  usageCount: number;

  /** Last used timestamp */
  lastUsed?: Date;
}

// ============================================================================
// Tool Registry Interface
// ============================================================================

/**
 * Tool Registry interface (MVP version)
 * Manages registration and discovery of tools
 */
export interface IToolRegistry {
  /**
   * Register a new tool
   */
  register(tool: ToolDefinition): void;

  /**
   * Unregister a tool
   */
  unregister(name: string): void;

  /**
   * Get a tool by name
   */
  get(name: string): RegisteredTool | undefined;

  /**
   * List all registered tools
   */
  list(): RegisteredTool[];

  /**
   * List tools by category
   */
  listByCategory(category: SimplifiedToolCategory): RegisteredTool[];

  /**
   * Check if user can execute a tool
   */
  canExecute(toolName: string, user: AIUserContext): boolean;

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
  }>;
}

/**
 * Full Tool Registry interface (for future enhancement)
 * Extended interface with additional functionality
 */
export interface IFullToolRegistry extends IToolRegistry {
  /**
   * Get all registered tools
   */
  getAll(): Tool[];

  /**
   * Get tools by category (full Tool type)
   */
  getByCategory(category: ToolCategory): Tool[];

  /**
   * Get tools by entity type
   */
  getByEntityType(entityType: AIEntityType): Tool[];

  /**
   * Get tools accessible to a user (based on permissions)
   */
  getAccessibleTools(user: AIUserContext): Tool[];

  /**
   * Get tool metadata (for LLM context)
   */
  getToolsMetadata(user: AIUserContext): ToolMetadata[];

  /**
   * Enable/disable a tool
   */
  setEnabled(toolName: string, enabled: boolean): void;
}

// ============================================================================
// Tool Executor Interface
// ============================================================================

/**
 * Tool Executor interface
 * Handles the execution of tools with validation and security
 */
export interface IToolExecutor {
  /**
   * Execute a tool with full validation and security checks
   */
  execute(
    toolName: string,
    parameters: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;

  /**
   * Validate parameters against tool schema
   */
  validateParameters(
    toolName: string,
    parameters: Record<string, unknown>
  ): AIResult<Record<string, unknown>>;

  /**
   * Check if user has permission to execute tool
   */
  checkPermission(
    toolName: string,
    user: AIUserContext
  ): AIResult<void>;
}

// ============================================================================
// Tool Builder (Fluent API)
// ============================================================================

/**
 * Tool builder for fluent tool creation
 */
export interface ToolBuilder {
  /** Set tool name */
  name(name: string): ToolBuilder;

  /** Set display name */
  displayName(name: string): ToolBuilder;

  /** Set description */
  description(description: string): ToolBuilder;

  /** Set category */
  category(category: ToolCategory): ToolBuilder;

  /** Set entity type */
  entityType(type: AIEntityType): ToolBuilder;

  /** Set operation */
  operation(operation: AIOperation): ToolBuilder;

  /** Add required permission */
  requirePermission(permission: Permission): ToolBuilder;

  /** Set parameters schema */
  parameters(schema: JSONSchema): ToolBuilder;

  /** Add parameter */
  addParameter(
    name: string,
    schema: JSONSchema['properties'][string],
    required?: boolean
  ): ToolBuilder;

  /** Require confirmation */
  requireConfirmation(impact?: ActionImpact): ToolBuilder;

  /** Set as parallelizable */
  parallelizable(value?: boolean): ToolBuilder;

  /** Set max execution time */
  maxExecutionTime(ms: number): ToolBuilder;

  /** Set rate limit */
  rateLimit(perMinute: number): ToolBuilder;

  /** Add example */
  addExample(example: ToolExample): ToolBuilder;

  /** Set executor function */
  executor(fn: ToolExecutor): ToolBuilder;

  /** Build the tool */
  build(): Tool;
}

// ============================================================================
// Pre-built Tool Types (for specific domains)
// ============================================================================

/**
 * Lead tool parameters
 */
export namespace LeadToolParams {
  export interface Create {
    companyName: string;
    contactName?: string;
    email?: string;
    phone?: string;
    source?: string;
    notes?: string;
    customFields?: Record<string, unknown>;
  }

  export interface Update {
    leadId: string;
    companyName?: string;
    contactName?: string;
    email?: string;
    phone?: string;
    status?: string;
    notes?: string;
    customFields?: Record<string, unknown>;
  }

  export interface Delete {
    leadId: string;
    reason?: string;
  }

  export interface Get {
    leadId: string;
  }

  export interface Search {
    query?: string;
    status?: string[];
    source?: string[];
    minScore?: number;
    maxScore?: number;
    assignedTo?: string;
    createdAfter?: string;
    createdBefore?: string;
    limit?: number;
    offset?: number;
  }

  export interface Qualify {
    leadId: string;
    qualifiedBy?: string;
    notes?: string;
  }

  export interface Assign {
    leadId: string;
    assigneeId: string;
    notes?: string;
  }

  export interface UpdateScore {
    leadId: string;
    score: number;
    reason?: string;
  }
}

/**
 * Task tool parameters
 */
export namespace TaskToolParams {
  export interface Create {
    title: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigneeId?: string;
    relatedEntity?: {
      type: AIEntityType;
      id: string;
    };
  }

  export interface Update {
    taskId: string;
    title?: string;
    description?: string;
    dueDate?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assigneeId?: string;
  }

  export interface Complete {
    taskId: string;
    completionNotes?: string;
  }

  export interface Delete {
    taskId: string;
    reason?: string;
  }

  export interface Search {
    query?: string;
    status?: string[];
    priority?: string[];
    assigneeId?: string;
    dueAfter?: string;
    dueBefore?: string;
    limit?: number;
  }
}

/**
 * Opportunity tool parameters
 */
export namespace OpportunityToolParams {
  export interface Create {
    name: string;
    value: number;
    currency?: string;
    stage?: string;
    probability?: number;
    expectedCloseDate?: string;
    customerId?: string;
    leadId?: string;
    notes?: string;
  }

  export interface Update {
    opportunityId: string;
    name?: string;
    value?: number;
    stage?: string;
    probability?: number;
    expectedCloseDate?: string;
    notes?: string;
  }

  export interface UpdateStage {
    opportunityId: string;
    stage: string;
    notes?: string;
  }

  export interface Win {
    opportunityId: string;
    actualValue?: number;
    notes?: string;
  }

  export interface Lose {
    opportunityId: string;
    lossReason: string;
    notes?: string;
  }

  export interface Search {
    query?: string;
    stage?: string[];
    minValue?: number;
    maxValue?: number;
    closeDateAfter?: string;
    closeDateBefore?: string;
    limit?: number;
  }
}

/**
 * Quote tool parameters
 */
export namespace QuoteToolParams {
  export interface Create {
    opportunityId?: string;
    customerId?: string;
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    validUntil?: string;
    notes?: string;
    terms?: string;
  }

  export interface Update {
    quoteId: string;
    items?: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      discount?: number;
    }>;
    validUntil?: string;
    notes?: string;
    discount?: number;
  }

  export interface Send {
    quoteId: string;
    recipientEmail: string;
    message?: string;
  }

  export interface Accept {
    quoteId: string;
    acceptedBy?: string;
    signature?: string;
  }

  export interface Get {
    quoteId: string;
  }
}

/**
 * Search tool parameters
 */
export namespace SearchToolParams {
  export interface GlobalSearch {
    query: string;
    entityTypes?: AIEntityType[];
    limit?: number;
    includeArchived?: boolean;
  }
}

/**
 * Analytics tool parameters
 */
export namespace AnalyticsToolParams {
  export interface GetDashboard {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
  }

  export interface GetPipelineStats {
    pipelineId?: string;
  }

  export interface GetLeadStats {
    period?: 'today' | 'week' | 'month' | 'quarter' | 'year';
    groupBy?: 'status' | 'source' | 'assignee';
  }
}
