// ============================================
// AI Context & Data Preparation - FASE 6.0
// Utilities for preparing CRM data for AI operations
// ============================================

import type {
  CRMContext,
  AIProvider,
} from './types';

// ============================================
// Types
// ============================================

interface Lead {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  company?: string;
  title?: string;
  phone?: string;
  source?: string;
  status?: string;
  score?: number;
  notes?: string;
  customFields?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}

interface Opportunity {
  id: string;
  name: string;
  value?: number;
  stage?: string;
  probability?: number;
  expectedCloseDate?: string;
  leadId?: string;
  customerId?: string;
  notes?: string;
}

interface Customer {
  id: string;
  name: string;
  email?: string;
  company?: string;
  phone?: string;
  lifetimeValue?: number;
  status?: string;
  customFields?: Record<string, unknown>;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  status?: string;
  priority?: string;
  assigneeId?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
}

interface Note {
  id: string;
  content: string;
  createdAt: string;
  author?: string;
  type?: string;
}

interface Activity {
  type: string;
  description: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

interface Communication {
  channel: 'email' | 'phone' | 'chat' | 'meeting' | 'other';
  summary: string;
  createdAt: string;
  direction?: 'inbound' | 'outbound';
}

interface StageHistory {
  stage: string;
  enteredAt: string;
  exitedAt?: string;
  durationDays?: number;
}

// ============================================
// Context Builder
// ============================================

export class CRMContextBuilder {
  private context: Partial<CRMContext> = {};

  /**
   * Set basic context identifiers
   */
  setIdentifiers(tenantId: string, userId: string): this {
    this.context.tenantId = tenantId;
    this.context.userId = userId;
    return this;
  }

  /**
   * Set the entity being analyzed
   */
  setEntity(type: CRMContext['entityType'], id: string): this {
    this.context.entityType = type;
    this.context.entityId = id;
    return this;
  }

  /**
   * Add notes to context
   */
  addNotes(notes: Note[]): this {
    if (!this.context.relatedData) {
      this.context.relatedData = {};
    }
    this.context.relatedData.notes = notes.map((n) => ({
      id: n.id,
      content: n.content,
      createdAt: n.createdAt,
    }));
    return this;
  }

  /**
   * Add activities to context
   */
  addActivities(activities: Activity[]): this {
    if (!this.context.relatedData) {
      this.context.relatedData = {};
    }
    this.context.relatedData.activities = activities;
    return this;
  }

  /**
   * Add communications to context
   */
  addCommunications(communications: Communication[]): this {
    if (!this.context.relatedData) {
      this.context.relatedData = {};
    }
    this.context.relatedData.communications = communications.map((c) => ({
      channel: c.channel,
      summary: c.summary,
      createdAt: c.createdAt,
    }));
    return this;
  }

  /**
   * Add pipeline context
   */
  setPipelineContext(
    currentStage: string,
    stageHistory: StageHistory[],
    createdAt: string
  ): this {
    const daysInPipeline = Math.floor(
      (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    this.context.pipelineContext = {
      currentStage,
      stageHistory: stageHistory.map((s) => ({
        stage: s.stage,
        enteredAt: s.enteredAt,
      })),
      daysInPipeline,
    };
    return this;
  }

  /**
   * Add user context
   */
  setUserContext(recentActions: string[], preferences?: Record<string, unknown>): this {
    this.context.userContext = {
      recentActions,
      preferences: preferences || {},
    };
    return this;
  }

  /**
   * Build the final context
   */
  build(): CRMContext {
    if (!this.context.tenantId || !this.context.userId) {
      throw new Error('Context must have tenantId and userId');
    }
    if (!this.context.entityType || !this.context.entityId) {
      throw new Error('Context must have entityType and entityId');
    }

    return this.context as CRMContext;
  }
}

// ============================================
// Data Preparation Functions
// ============================================

/**
 * Prepare lead data for AI processing
 */
export const prepareLeadForAI = (lead: Lead): string => {
  const parts: string[] = [];

  if (lead.firstName || lead.lastName) {
    parts.push(`Name: ${[lead.firstName, lead.lastName].filter(Boolean).join(' ')}`);
  }
  if (lead.email) {
    parts.push(`Email: ${lead.email}`);
  }
  if (lead.company) {
    parts.push(`Company: ${lead.company}`);
  }
  if (lead.title) {
    parts.push(`Title: ${lead.title}`);
  }
  if (lead.phone) {
    parts.push(`Phone: ${lead.phone}`);
  }
  if (lead.source) {
    parts.push(`Source: ${lead.source}`);
  }
  if (lead.status) {
    parts.push(`Status: ${lead.status}`);
  }
  if (lead.score !== undefined) {
    parts.push(`Current Score: ${lead.score}`);
  }
  if (lead.notes) {
    parts.push(`Notes: ${lead.notes}`);
  }
  if (lead.customFields && Object.keys(lead.customFields).length > 0) {
    parts.push(`Custom Fields: ${JSON.stringify(lead.customFields)}`);
  }
  if (lead.createdAt) {
    parts.push(`Created: ${new Date(lead.createdAt).toLocaleDateString()}`);
  }

  return parts.join('\n');
};

/**
 * Prepare opportunity data for AI processing
 */
export const prepareOpportunityForAI = (opportunity: Opportunity): string => {
  const parts: string[] = [];

  parts.push(`Opportunity: ${opportunity.name}`);
  if (opportunity.value !== undefined) {
    parts.push(`Value: $${opportunity.value.toLocaleString()}`);
  }
  if (opportunity.stage) {
    parts.push(`Stage: ${opportunity.stage}`);
  }
  if (opportunity.probability !== undefined) {
    parts.push(`Probability: ${opportunity.probability}%`);
  }
  if (opportunity.expectedCloseDate) {
    parts.push(`Expected Close: ${new Date(opportunity.expectedCloseDate).toLocaleDateString()}`);
  }
  if (opportunity.notes) {
    parts.push(`Notes: ${opportunity.notes}`);
  }

  return parts.join('\n');
};

/**
 * Prepare customer data for AI processing
 */
export const prepareCustomerForAI = (customer: Customer): string => {
  const parts: string[] = [];

  parts.push(`Customer: ${customer.name}`);
  if (customer.email) {
    parts.push(`Email: ${customer.email}`);
  }
  if (customer.company) {
    parts.push(`Company: ${customer.company}`);
  }
  if (customer.phone) {
    parts.push(`Phone: ${customer.phone}`);
  }
  if (customer.lifetimeValue !== undefined) {
    parts.push(`Lifetime Value: $${customer.lifetimeValue.toLocaleString()}`);
  }
  if (customer.status) {
    parts.push(`Status: ${customer.status}`);
  }
  if (customer.customFields && Object.keys(customer.customFields).length > 0) {
    parts.push(`Custom Fields: ${JSON.stringify(customer.customFields)}`);
  }

  return parts.join('\n');
};

/**
 * Prepare task data for AI processing
 */
export const prepareTaskForAI = (task: Task): string => {
  const parts: string[] = [];

  parts.push(`Task: ${task.title}`);
  if (task.description) {
    parts.push(`Description: ${task.description}`);
  }
  if (task.dueDate) {
    parts.push(`Due: ${new Date(task.dueDate).toLocaleDateString()}`);
  }
  if (task.status) {
    parts.push(`Status: ${task.status}`);
  }
  if (task.priority) {
    parts.push(`Priority: ${task.priority}`);
  }

  return parts.join('\n');
};

/**
 * Combine multiple notes into a single text for AI processing
 */
export const prepareNotesForAI = (notes: Note[]): string => {
  if (notes.length === 0) return '';

  return notes
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((note, index) => {
      const date = new Date(note.createdAt).toLocaleDateString();
      const author = note.author ? ` by ${note.author}` : '';
      return `[Note ${index + 1}] ${date}${author}:\n${note.content}`;
    })
    .join('\n\n');
};

// ============================================
// Token Estimation
// ============================================

/**
 * Estimate token count for a text (rough approximation)
 * Uses ~4 characters per token as a general rule
 */
export const estimateTokens = (text: string): number => {
  return Math.ceil(text.length / 4);
};

/**
 * Get max tokens for a provider/model
 */
export const getMaxContextTokens = (provider: AIProvider, model?: string): number => {
  const defaults: Record<AIProvider, number> = {
    openai: 128000, // GPT-4 Turbo
    anthropic: 200000, // Claude 3
    groq: 32768, // Mixtral
    'azure-openai': 128000,
    local: 4096,
  };

  // Specific model overrides
  if (model) {
    if (model.includes('gpt-3.5')) return 16385;
    if (model.includes('gpt-4-32k')) return 32768;
    if (model.includes('claude-2')) return 100000;
  }

  return defaults[provider] || 4096;
};

/**
 * Truncate text to fit within token limit
 */
export const truncateToTokenLimit = (text: string, maxTokens: number): string => {
  const estimatedTokens = estimateTokens(text);
  if (estimatedTokens <= maxTokens) return text;

  // Truncate with some margin
  const targetChars = maxTokens * 4 - 100;
  return text.slice(0, targetChars) + '... [truncated]';
};

// ============================================
// Data Sanitization
// ============================================

/**
 * Remove PII from text for AI processing
 */
export const sanitizeForAI = (
  text: string,
  options: {
    removeEmails?: boolean;
    removePhones?: boolean;
    removeSSN?: boolean;
    removeCreditCards?: boolean;
  } = {}
): string => {
  let sanitized = text;

  if (options.removeEmails !== false) {
    sanitized = sanitized.replace(
      /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
      '[EMAIL]'
    );
  }

  if (options.removePhones !== false) {
    sanitized = sanitized.replace(
      /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
      '[PHONE]'
    );
  }

  if (options.removeSSN !== false) {
    sanitized = sanitized.replace(/\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/g, '[SSN]');
  }

  if (options.removeCreditCards !== false) {
    sanitized = sanitized.replace(/\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/g, '[CARD]');
  }

  return sanitized;
};

/**
 * Validate that text doesn't contain sensitive data
 */
export const containsSensitiveData = (text: string): {
  hasSensitiveData: boolean;
  types: string[];
} => {
  const types: string[] = [];

  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text)) {
    types.push('email');
  }

  if (/(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/.test(text)) {
    types.push('phone');
  }

  if (/\d{3}[-.\s]?\d{2}[-.\s]?\d{4}/.test(text)) {
    types.push('ssn');
  }

  if (/\d{4}[-.\s]?\d{4}[-.\s]?\d{4}[-.\s]?\d{4}/.test(text)) {
    types.push('credit_card');
  }

  return {
    hasSensitiveData: types.length > 0,
    types,
  };
};

// ============================================
// Exports
// ============================================

export type {
  Lead,
  Opportunity,
  Customer,
  Task,
  Note,
  Activity,
  Communication,
  StageHistory,
};
