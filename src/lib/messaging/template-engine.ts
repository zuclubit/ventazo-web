// ============================================
// FASE 5.9 — Template Engine
// Handlebars-style variable substitution
// ============================================

import type { MessageTemplate, TemplateVariable } from './types';

// ============================================
// Types
// ============================================

export interface TemplateContext {
  [key: string]: unknown;
}

export interface RenderResult {
  subject?: string;
  body: string;
  errors: string[];
}

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  variables: string[];
}

// ============================================
// Template Engine
// ============================================

export class TemplateEngine {
  private variablePattern = /\{\{([^}]+)\}\}/g;
  private conditionalPattern = /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;
  private loopPattern = /\{\{#each\s+([^}]+)\}\}([\s\S]*?)\{\{\/each\}\}/g;
  private helperPattern = /\{\{([a-zA-Z]+)\s+([^}]+)\}\}/g;

  // ============================================
  // Core Rendering
  // ============================================

  render(template: string, context: TemplateContext): RenderResult {
    const errors: string[] = [];
    let result = template;

    try {
      // Process conditionals first
      result = this.processConditionals(result, context);

      // Process loops
      result = this.processLoops(result, context);

      // Process helpers
      result = this.processHelpers(result, context);

      // Process simple variables
      result = this.processVariables(result, context, errors);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : 'Unknown error during rendering');
    }

    return { body: result, errors };
  }

  renderTemplate(
    template: MessageTemplate,
    context: TemplateContext
  ): RenderResult {
    const errors: string[] = [];
    let subject: string | undefined;

    // Render subject if present
    if (template.subjectTemplate) {
      const subjectResult = this.render(template.subjectTemplate, context);
      subject = subjectResult.body;
      errors.push(...subjectResult.errors.map((e) => `[Subject] ${e}`));
    }

    // Render body
    const bodyResult = this.render(template.bodyTemplate, context);
    const body = bodyResult.body;
    errors.push(...bodyResult.errors.map((e) => `[Body] ${e}`));

    return { subject, body, errors };
  }

  // ============================================
  // Variable Processing
  // ============================================

  private processVariables(
    template: string,
    context: TemplateContext,
    errors: string[]
  ): string {
    return template.replace(this.variablePattern, (match, path: string) => {
      const trimmedPath = path.trim();
      const value = this.getValueByPath(context, trimmedPath);

      if (value === undefined) {
        errors.push(`Variable not found: ${trimmedPath}`);
        return match; // Keep original if not found
      }

      return this.formatValue(value);
    });
  }

  private getValueByPath(context: TemplateContext, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = context;

    for (const part of parts) {
      if (current === null || current === undefined) {
        return undefined;
      }

      if (typeof current === 'object' && part in (current as Record<string, unknown>)) {
        current = (current as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return current;
  }

  private formatValue(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (value instanceof Date) {
      return this.formatDate(value);
    }

    if (typeof value === 'number') {
      return this.formatNumber(value);
    }

    if (typeof value === 'boolean') {
      return value ? 'Sí' : 'No';
    }

    if (Array.isArray(value)) {
      return value.map((v) => this.formatValue(v)).join(', ');
    }

    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value);
    }

    // At this point value is a primitive (string, number, bigint, symbol)
    if (typeof value === 'string') {
      return value;
    }
    if (typeof value === 'number' || typeof value === 'bigint') {
      return value.toString();
    }
    return '';
  }

  // ============================================
  // Conditional Processing
  // ============================================

  private processConditionals(template: string, context: TemplateContext): string {
    return template.replace(this.conditionalPattern, (_match, condition: string, content: string) => {
      const trimmedCondition = condition.trim();
      const value = this.getValueByPath(context, trimmedCondition);

      if (this.isTruthy(value)) {
        return content;
      }

      return '';
    });
  }

  private isTruthy(value: unknown): boolean {
    if (value === null || value === undefined) {
      return false;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    if (typeof value === 'number') {
      return value !== 0;
    }

    if (typeof value === 'string') {
      return value.length > 0;
    }

    if (Array.isArray(value)) {
      return value.length > 0;
    }

    return true;
  }

  // ============================================
  // Loop Processing
  // ============================================

  private processLoops(template: string, context: TemplateContext): string {
    return template.replace(this.loopPattern, (_match, arrayPath: string, content: string) => {
      const trimmedPath = arrayPath.trim();
      const array = this.getValueByPath(context, trimmedPath);

      if (!Array.isArray(array)) {
        return '';
      }

      return array
        .map((item, index) => {
          const itemContext = {
            ...context,
            this: item,
            '@index': index,
            '@first': index === 0,
            '@last': index === array.length - 1,
          };
          return this.processVariables(content, itemContext, []);
        })
        .join('');
    });
  }

  // ============================================
  // Helper Processing
  // ============================================

  private processHelpers(template: string, context: TemplateContext): string {
    return template.replace(this.helperPattern, (match, helper: string, args: string) => {
      const trimmedArgs = args.trim();

      switch (helper.toLowerCase()) {
        case 'uppercase':
          return this.helperUppercase(this.getValueByPath(context, trimmedArgs));

        case 'lowercase':
          return this.helperLowercase(this.getValueByPath(context, trimmedArgs));

        case 'capitalize':
          return this.helperCapitalize(this.getValueByPath(context, trimmedArgs));

        case 'currency':
          return this.helperCurrency(this.getValueByPath(context, trimmedArgs));

        case 'date':
          return this.helperDate(this.getValueByPath(context, trimmedArgs));

        case 'time':
          return this.helperTime(this.getValueByPath(context, trimmedArgs));

        case 'datetime':
          return this.helperDateTime(this.getValueByPath(context, trimmedArgs));

        case 'number':
          return this.helperNumber(this.getValueByPath(context, trimmedArgs));

        case 'percent':
          return this.helperPercent(this.getValueByPath(context, trimmedArgs));

        default:
          return match; // Keep original if helper not found
      }
    });
  }

  // ============================================
  // Helper Functions
  // ============================================

  private helperUppercase(value: unknown): string {
    const str = typeof value === 'string' ? value : (value?.toString() ?? '');
    return str.toUpperCase();
  }

  private helperLowercase(value: unknown): string {
    const str = typeof value === 'string' ? value : (value?.toString() ?? '');
    return str.toLowerCase();
  }

  private helperCapitalize(value: unknown): string {
    const str = typeof value === 'string' ? value : (value?.toString() ?? '');
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }

  private helperCurrency(value: unknown): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';

    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
    }).format(num);
  }

  private helperDate(value: unknown): string {
    const date = this.parseDate(value);
    if (!date) return '';
    return this.formatDate(date);
  }

  private helperTime(value: unknown): string {
    const date = this.parseDate(value);
    if (!date) return '';
    return this.formatTime(date);
  }

  private helperDateTime(value: unknown): string {
    const date = this.parseDate(value);
    if (!date) return '';
    return `${this.formatDate(date)} ${this.formatTime(date)}`;
  }

  private helperNumber(value: unknown): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';
    return this.formatNumber(num);
  }

  private helperPercent(value: unknown): string {
    const num = typeof value === 'number' ? value : parseFloat(String(value));
    if (isNaN(num)) return '';
    return `${num.toFixed(1)}%`;
  }

  // ============================================
  // Formatting Utilities
  // ============================================

  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  }

  private formatTime(date: Date): string {
    return new Intl.DateTimeFormat('es-MX', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  private formatNumber(num: number): string {
    return new Intl.NumberFormat('es-MX').format(num);
  }

  private parseDate(value: unknown): Date | null {
    if (value instanceof Date) {
      return value;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      const date = new Date(value);
      return isNaN(date.getTime()) ? null : date;
    }

    return null;
  }

  // ============================================
  // Variable Extraction
  // ============================================

  extractVariables(template: string): string[] {
    const variables = new Set<string>();

    // Simple variables
    let match: RegExpExecArray | null;
    const varPattern = new RegExp(this.variablePattern.source, 'g');
    while ((match = varPattern.exec(template)) !== null) {
      const variable = match[1]?.trim();
      if (variable && !variable.startsWith('#') && !variable.startsWith('/')) {
        variables.add(variable);
      }
    }

    // Variables in conditionals
    const condPattern = new RegExp(this.conditionalPattern.source, 'g');
    while ((match = condPattern.exec(template)) !== null) {
      const condition = match[1]?.trim();
      const content = match[2];
      if (condition) {
        variables.add(condition);
      }
      // Also extract variables from the content
      if (content) {
        this.extractVariables(content).forEach((v) => variables.add(v));
      }
    }

    // Variables in loops
    const loopPattern = new RegExp(this.loopPattern.source, 'g');
    while ((match = loopPattern.exec(template)) !== null) {
      const loopVar = match[1]?.trim();
      if (loopVar) {
        variables.add(loopVar);
      }
    }

    return Array.from(variables);
  }

  // ============================================
  // Validation
  // ============================================

  validate(template: string): TemplateValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const variables = this.extractVariables(template);

    // Check for unclosed tags
    const openTags = (template.match(/\{\{#/g) ?? []).length;
    const closeTags = (template.match(/\{\{\//g) ?? []).length;

    if (openTags !== closeTags) {
      errors.push(`Mismatched block tags: ${openTags} opening, ${closeTags} closing`);
    }

    // Check for empty variables
    if (template.includes('{{}}')) {
      errors.push('Empty variable placeholder found');
    }

    // Check for deeply nested paths (warning)
    for (const variable of variables) {
      if (variable.split('.').length > 4) {
        warnings.push(`Deeply nested variable: ${variable}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      variables,
    };
  }

  // ============================================
  // Template Conversion
  // ============================================

  convertFromVariableList(variables: TemplateVariable[]): TemplateContext {
    const context: TemplateContext = {};

    for (const variable of variables) {
      const parts = variable.name.split('.');
      let current = context;

      for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part && !(part in current)) {
          current[part] = {};
        }
        if (part) {
          current = current[part] as TemplateContext;
        }
      }

      const lastPart = parts[parts.length - 1];
      if (lastPart) {
        current[lastPart] = variable.defaultValue ?? this.getDefaultForType(variable.type);
      }
    }

    return context;
  }

  private getDefaultForType(type: TemplateVariable['type']): unknown {
    switch (type) {
      case 'text':
        return '[Texto]';
      case 'number':
        return 0;
      case 'date':
        return new Date().toISOString();
      case 'boolean':
        return false;
      case 'entity':
        return { id: '[ID]', name: '[Nombre]' };
      default:
        return '';
    }
  }
}

// ============================================
// Singleton Instance
// ============================================

let engineInstance: TemplateEngine | null = null;

export function getTemplateEngine(): TemplateEngine {
  if (!engineInstance) {
    engineInstance = new TemplateEngine();
  }
  return engineInstance;
}

// ============================================
// Quick Helper Functions
// ============================================

export function renderTemplate(template: string, context: TemplateContext): string {
  const engine = getTemplateEngine();
  const result = engine.render(template, context);
  return result.body;
}

export function extractTemplateVariables(template: string): string[] {
  const engine = getTemplateEngine();
  return engine.extractVariables(template);
}

export function validateTemplate(template: string): TemplateValidationResult {
  const engine = getTemplateEngine();
  return engine.validate(template);
}
