/**
 * Confirmation Gate Service
 * Manages Human-in-the-Loop confirmation workflow
 */

import { injectable } from 'tsyringe';
import { v4 as uuid } from 'uuid';
import {
  IConfirmationGate,
  ConfirmationRequest,
  ConfirmationResponse,
  ConfirmationResult,
  ConfirmationPolicy,
  ConfirmationStatus,
  DEFAULT_CONFIRMATION_POLICIES,
} from '../types/confirmation.types';
import { PlannedAction } from '../types/orchestrator.types';
import { AIUserContext, ActionImpact, AIEntityType, AIOperation } from '../types/common.types';

/**
 * Confirmation Gate implementation
 */
@injectable()
export class ConfirmationGateService implements IConfirmationGate {
  private pendingRequests: Map<string, ConfirmationRequest> = new Map();
  private policies: ConfirmationPolicy[] = [];
  private expirationTimeMs: number = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Register default policies
    this.registerDefaultPolicies();

    // Start expiration cleanup
    this.startExpirationCleanup();
  }

  /**
   * Check if an action requires confirmation
   */
  async requiresConfirmation(
    action: PlannedAction,
    user: AIUserContext
  ): Promise<boolean> {
    // Check if action already has confirmation flag
    if (action.requiresConfirmation) {
      return true;
    }

    // Check against policies
    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      // Check entity type match
      const entityType = action.affectedEntity?.type;
      if (entityType && !policy.entityTypes.includes(entityType as AIEntityType)) {
        continue;
      }

      // Check operation match
      // Note: We need to extract operation from toolName
      const operation = this.extractOperation(action.toolName);
      if (!policy.operations.includes(operation as AIOperation)) {
        continue;
      }

      // Check conditions
      const conditionsMet = await this.evaluateConditions(
        policy.conditions,
        action,
        user
      );

      if (conditionsMet) {
        return true;
      }
    }

    return false;
  }

  /**
   * Create a confirmation request
   */
  async createRequest(
    action: PlannedAction,
    user: AIUserContext,
    conversationId: string
  ): Promise<ConfirmationRequest> {
    const id = uuid();
    const expiresAt = new Date(Date.now() + this.expirationTimeMs);

    // Find matching policy for custom message
    const matchingPolicy = this.findMatchingPolicy(action);

    const request: ConfirmationRequest = {
      id,
      tenantId: user.tenantId,
      userId: user.userId,
      conversationId,
      action,
      status: 'pending',
      title: this.generateTitle(action),
      description: matchingPolicy?.confirmationMessage || this.generateDescription(action),
      impact: action.impact,
      affectedEntity: {
        type: (action.affectedEntity?.type as AIEntityType) || 'lead',
        id: action.affectedEntity?.id as string | undefined,
      },
      changes: this.extractChanges(action),
      warnings: this.generateWarnings(action),
      options: {
        confirmLabel: this.getConfirmLabel(action.impact),
        cancelLabel: 'Cancelar',
        allowModify: false,
        defaultOption: 'cancel',
        requireTypedConfirmation:
          action.impact === 'critical'
            ? {
                phrase: 'CONFIRMAR',
                instruction: 'Escribe CONFIRMAR para proceder',
              }
            : undefined,
      },
      createdAt: new Date(),
      expiresAt,
    };

    this.pendingRequests.set(id, request);

    return request;
  }

  /**
   * Get a pending confirmation request
   */
  async getRequest(confirmationId: string): Promise<ConfirmationRequest | null> {
    return this.pendingRequests.get(confirmationId) || null;
  }

  /**
   * Get pending confirmations for a user
   */
  async getPendingRequests(
    userId: string,
    tenantId: string
  ): Promise<ConfirmationRequest[]> {
    const pending: ConfirmationRequest[] = [];

    for (const request of this.pendingRequests.values()) {
      if (
        request.userId === userId &&
        request.tenantId === tenantId &&
        request.status === 'pending'
      ) {
        pending.push(request);
      }
    }

    return pending;
  }

  /**
   * Process a confirmation response
   */
  async processResponse(
    response: ConfirmationResponse,
    user: AIUserContext
  ): Promise<ConfirmationResult> {
    const request = this.pendingRequests.get(response.confirmationId);

    if (!request) {
      throw new Error(`Confirmation request ${response.confirmationId} not found`);
    }

    if (request.status !== 'pending') {
      throw new Error(`Confirmation request is already ${request.status}`);
    }

    if (request.userId !== user.userId) {
      throw new Error('Only the original user can respond to this confirmation');
    }

    // Check expiration
    if (new Date() > request.expiresAt) {
      request.status = 'expired';
      request.resolvedAt = new Date();
      return {
        request,
        approved: false,
        reason: 'La solicitud de confirmación ha expirado',
        message: 'La solicitud ha expirado. Por favor, intenta de nuevo.',
      };
    }

    // Process decision
    const approved = response.decision === 'confirm';

    request.status = approved ? 'confirmed' : 'denied';
    request.resolvedAt = new Date();
    request.resolution = {
      outcome: approved ? 'confirmed' : 'denied',
      resolvedBy: user.userId,
      resolvedAt: new Date(),
      modifiedParameters: response.modifiedParameters,
      typedPhrase: response.typedPhrase,
      comment: response.comment,
    };

    // Validate typed confirmation if required
    if (request.options.requireTypedConfirmation && approved) {
      if (
        response.typedPhrase?.toUpperCase() !==
        request.options.requireTypedConfirmation.phrase.toUpperCase()
      ) {
        request.status = 'denied';
        request.resolution.outcome = 'denied';
        return {
          request,
          approved: false,
          reason: 'Frase de confirmación incorrecta',
          message: 'La frase de confirmación no coincide. Acción cancelada.',
        };
      }
    }

    return {
      request,
      approved,
      message: approved
        ? 'Acción confirmada. Procediendo con la ejecución.'
        : 'Acción cancelada.',
    };
  }

  /**
   * Cancel a confirmation request
   */
  async cancel(
    confirmationId: string,
    user: AIUserContext,
    reason?: string
  ): Promise<void> {
    const request = this.pendingRequests.get(confirmationId);

    if (!request) {
      throw new Error(`Confirmation request ${confirmationId} not found`);
    }

    if (request.userId !== user.userId && user.role !== 'admin') {
      throw new Error('Only the original user or admin can cancel this confirmation');
    }

    request.status = 'cancelled';
    request.resolvedAt = new Date();
    request.resolution = {
      outcome: 'cancelled',
      resolvedBy: user.userId,
      resolvedAt: new Date(),
      comment: reason,
    };
  }

  /**
   * Expire stale confirmation requests
   */
  async expireStaleRequests(): Promise<number> {
    const now = new Date();
    let expiredCount = 0;

    for (const request of this.pendingRequests.values()) {
      if (request.status === 'pending' && now > request.expiresAt) {
        request.status = 'expired';
        request.resolvedAt = now;
        request.resolution = {
          outcome: 'expired',
          resolvedBy: 'system',
          resolvedAt: now,
        };
        expiredCount++;
      }
    }

    // Clean up old resolved requests (older than 1 hour)
    const cutoff = new Date(Date.now() - 60 * 60 * 1000);
    for (const [id, request] of this.pendingRequests) {
      if (request.resolvedAt && request.resolvedAt < cutoff) {
        this.pendingRequests.delete(id);
      }
    }

    return expiredCount;
  }

  /**
   * Register a confirmation policy
   */
  registerPolicy(policy: ConfirmationPolicy): void {
    // Remove existing policy with same name
    this.policies = this.policies.filter((p) => p.name !== policy.name);
    this.policies.push(policy);
    // Sort by priority (higher first)
    this.policies.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered policies
   */
  getPolicies(): ConfirmationPolicy[] {
    return [...this.policies];
  }

  // ==================== Private Methods ====================

  /**
   * Extract operation from tool name (e.g., 'lead.delete' -> 'delete')
   */
  private extractOperation(toolName: string): string {
    const parts = toolName.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : toolName;
  }

  /**
   * Find matching policy for action
   */
  private findMatchingPolicy(action: PlannedAction): ConfirmationPolicy | undefined {
    const operation = this.extractOperation(action.toolName);
    const entityType = action.affectedEntity?.type;

    for (const policy of this.policies) {
      if (!policy.enabled) continue;

      if (entityType && policy.entityTypes.includes(entityType as AIEntityType)) {
        if (policy.operations.includes(operation as AIOperation)) {
          return policy;
        }
      }
    }

    return undefined;
  }

  /**
   * Evaluate policy conditions
   */
  private async evaluateConditions(
    conditions: { type: string; params: Record<string, unknown> }[],
    action: PlannedAction,
    user: AIUserContext
  ): Promise<boolean> {
    for (const condition of conditions) {
      const met = await this.evaluateCondition(condition, action, user);
      if (!met) return false;
    }
    return true;
  }

  /**
   * Evaluate a single condition
   */
  private async evaluateCondition(
    condition: { type: string; params: Record<string, unknown> },
    action: PlannedAction,
    user: AIUserContext
  ): Promise<boolean> {
    switch (condition.type) {
      case 'always':
        return true;

      case 'value_exceeds':
        const value = action.parameters[condition.params.field as string];
        const threshold = condition.params.threshold as number;
        return typeof value === 'number' && value > threshold;

      case 'bulk_operation':
        const ids = action.parameters.ids as unknown[] | undefined;
        const count = (action.parameters.count as number) || ids?.length || 1;
        const minCount = (condition.params.minCount as number) || 2;
        return count >= minCount;

      case 'irreversible':
        const operation = this.extractOperation(action.toolName);
        return operation === 'delete';

      default:
        return false;
    }
  }

  /**
   * Generate confirmation title
   */
  private generateTitle(action: PlannedAction): string {
    const operation = this.extractOperation(action.toolName);
    const entityType = action.affectedEntity?.type || 'registro';

    const operationLabels: Record<string, string> = {
      delete: 'Eliminar',
      update: 'Actualizar',
      create: 'Crear',
      send: 'Enviar',
      convert: 'Convertir',
      qualify: 'Calificar',
    };

    const entityLabels: Record<string, string> = {
      lead: 'lead',
      customer: 'cliente',
      opportunity: 'oportunidad',
      task: 'tarea',
      quote: 'cotización',
    };

    const opLabel = operationLabels[operation] || operation;
    const entityLabel = entityLabels[entityType] || entityType;

    return `¿${opLabel} ${entityLabel}?`;
  }

  /**
   * Generate confirmation description
   */
  private generateDescription(action: PlannedAction): string {
    return action.rationale || `Esta acción requiere tu confirmación.`;
  }

  /**
   * Extract changes from action for display
   */
  private extractChanges(action: PlannedAction): {
    field: string;
    label: string;
    previousValue?: unknown;
    newValue: unknown;
    destructive: boolean;
  }[] {
    const changes: {
      field: string;
      label: string;
      previousValue?: unknown;
      newValue: unknown;
      destructive: boolean;
    }[] = [];

    const operation = this.extractOperation(action.toolName);

    if (operation === 'delete') {
      changes.push({
        field: 'status',
        label: 'Estado',
        previousValue: 'Activo',
        newValue: 'Eliminado',
        destructive: true,
      });
    }

    // Add more change extraction logic as needed

    return changes;
  }

  /**
   * Generate warning messages
   */
  private generateWarnings(action: PlannedAction): string[] {
    const warnings: string[] = [];
    const operation = this.extractOperation(action.toolName);

    if (operation === 'delete') {
      warnings.push('Esta acción no se puede deshacer');
    }

    if (action.impact === 'critical') {
      warnings.push('Esta es una acción de alto impacto');
    }

    return warnings;
  }

  /**
   * Get confirm button label based on impact
   */
  private getConfirmLabel(impact: ActionImpact): string {
    switch (impact) {
      case 'critical':
        return 'Confirmar eliminación';
      case 'high':
        return 'Sí, proceder';
      default:
        return 'Confirmar';
    }
  }

  /**
   * Register default policies
   */
  private registerDefaultPolicies(): void {
    DEFAULT_CONFIRMATION_POLICIES.forEach((policy) => {
      this.registerPolicy({
        ...policy,
        id: uuid(),
      });
    });
  }

  /**
   * Start periodic expiration cleanup
   */
  private startExpirationCleanup(): void {
    // Run every minute
    setInterval(() => {
      this.expireStaleRequests().catch(console.error);
    }, 60 * 1000);
  }
}
