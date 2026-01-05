/**
 * Human-in-the-Loop Confirmation Types
 * Types for the confirmation gate system that requires user approval for critical actions
 */

import {
  AIEntityType,
  AIOperation,
  ActionImpact,
  AIUserContext,
} from './common.types';
import { PlannedAction } from './orchestrator.types';

// ============================================================================
// Confirmation Request Types
// ============================================================================

/**
 * Confirmation request status
 */
export type ConfirmationStatus =
  | 'pending'
  | 'confirmed'
  | 'denied'
  | 'expired'
  | 'cancelled';

/**
 * Confirmation request
 * Represents a pending action that requires user confirmation
 */
export interface ConfirmationRequest {
  /** Unique confirmation ID */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** User who initiated the action */
  userId: string;

  /** Conversation ID */
  conversationId: string;

  /** The action awaiting confirmation */
  action: PlannedAction;

  /** Current status */
  status: ConfirmationStatus;

  /** Human-readable title */
  title: string;

  /** Detailed description of what will happen */
  description: string;

  /** Impact level */
  impact: ActionImpact;

  /** Entity being affected */
  affectedEntity: {
    type: AIEntityType;
    id?: string;
    name?: string;
  };

  /** What changes will be made */
  changes?: ConfirmationChange[];

  /** Warning messages */
  warnings?: string[];

  /** Options presented to the user */
  options: ConfirmationOptions;

  /** Created timestamp */
  createdAt: Date;

  /** Expires at timestamp */
  expiresAt: Date;

  /** Resolved at timestamp (if resolved) */
  resolvedAt?: Date;

  /** Resolution details (if resolved) */
  resolution?: ConfirmationResolution;
}

/**
 * Change that will be made
 */
export interface ConfirmationChange {
  /** Field or aspect being changed */
  field: string;

  /** Human-readable label */
  label: string;

  /** Previous value (if updating) */
  previousValue?: unknown;

  /** New value */
  newValue: unknown;

  /** Is this a destructive change */
  destructive: boolean;
}

/**
 * Options for confirmation
 */
export interface ConfirmationOptions {
  /** Confirm button text */
  confirmLabel: string;

  /** Cancel button text */
  cancelLabel: string;

  /** Optional modify button (to change parameters) */
  modifyLabel?: string;

  /** Allow modification of parameters */
  allowModify: boolean;

  /** Modifiable fields (if allowModify is true) */
  modifiableFields?: string[];

  /** Default option */
  defaultOption: 'confirm' | 'cancel';

  /** Require typing confirmation phrase for high-impact actions */
  requireTypedConfirmation?: {
    phrase: string;
    instruction: string;
  };
}

/**
 * Resolution of a confirmation
 */
export interface ConfirmationResolution {
  /** How it was resolved */
  outcome: 'confirmed' | 'denied' | 'expired' | 'cancelled';

  /** Who resolved it (user ID) */
  resolvedBy: string;

  /** Timestamp */
  resolvedAt: Date;

  /** Modified parameters (if modified) */
  modifiedParameters?: Record<string, unknown>;

  /** Typed confirmation phrase (if required) */
  typedPhrase?: string;

  /** User's comment */
  comment?: string;
}

// ============================================================================
// Confirmation Response Types
// ============================================================================

/**
 * User's confirmation response
 */
export interface ConfirmationResponse {
  /** Confirmation request ID */
  confirmationId: string;

  /** User's decision */
  decision: 'confirm' | 'deny' | 'modify';

  /** Modified parameters (if decision is 'modify') */
  modifiedParameters?: Record<string, unknown>;

  /** Typed confirmation phrase (if required) */
  typedPhrase?: string;

  /** User's comment */
  comment?: string;
}

/**
 * Result of processing a confirmation
 */
export interface ConfirmationResult {
  /** The confirmation request */
  request: ConfirmationRequest;

  /** Whether the action was approved */
  approved: boolean;

  /** If approved, the execution result */
  executionResult?: unknown;

  /** If denied or failed, the reason */
  reason?: string;

  /** Next steps message */
  message: string;
}

// ============================================================================
// Confirmation Policy Types
// ============================================================================

/**
 * Policy that determines when confirmation is required
 */
export interface ConfirmationPolicy {
  /** Policy ID */
  id: string;

  /** Policy name */
  name: string;

  /** Policy description */
  description: string;

  /** Entity types this policy applies to */
  entityTypes: AIEntityType[];

  /** Operations this policy applies to */
  operations: AIOperation[];

  /** Conditions that must be met for confirmation to be required */
  conditions: ConfirmationCondition[];

  /** Impact level of actions matching this policy */
  impact: ActionImpact;

  /** Custom confirmation message */
  confirmationMessage?: string;

  /** Policy is active */
  enabled: boolean;

  /** Priority (higher = evaluated first) */
  priority: number;
}

/**
 * Condition for a confirmation policy
 */
export interface ConfirmationCondition {
  /** Condition type */
  type: ConfirmationConditionType;

  /** Condition parameters */
  params: Record<string, unknown>;
}

/**
 * Types of confirmation conditions
 */
export type ConfirmationConditionType =
  // Always require confirmation for this action
  | 'always'
  // Require confirmation if value exceeds threshold
  | 'value_exceeds'
  // Require confirmation if affecting multiple records
  | 'bulk_operation'
  // Require confirmation if entity is in certain status
  | 'entity_status'
  // Require confirmation if entity belongs to certain owner
  | 'entity_owner'
  // Require confirmation based on user role
  | 'user_role'
  // Require confirmation for irreversible actions
  | 'irreversible'
  // Require confirmation if entity has dependencies
  | 'has_dependencies'
  // Custom condition (evaluated via callback)
  | 'custom';

// ============================================================================
// Confirmation Gate Interface
// ============================================================================

/**
 * Confirmation Gate interface
 * Manages the confirmation workflow
 */
export interface IConfirmationGate {
  /**
   * Check if an action requires confirmation
   */
  requiresConfirmation(
    action: PlannedAction,
    user: AIUserContext
  ): Promise<boolean>;

  /**
   * Create a confirmation request
   */
  createRequest(
    action: PlannedAction,
    user: AIUserContext,
    conversationId: string
  ): Promise<ConfirmationRequest>;

  /**
   * Get a pending confirmation request
   */
  getRequest(confirmationId: string): Promise<ConfirmationRequest | null>;

  /**
   * Get pending confirmations for a user
   */
  getPendingRequests(
    userId: string,
    tenantId: string
  ): Promise<ConfirmationRequest[]>;

  /**
   * Process a confirmation response
   */
  processResponse(
    response: ConfirmationResponse,
    user: AIUserContext
  ): Promise<ConfirmationResult>;

  /**
   * Cancel a confirmation request
   */
  cancel(
    confirmationId: string,
    user: AIUserContext,
    reason?: string
  ): Promise<void>;

  /**
   * Expire old confirmation requests
   */
  expireStaleRequests(): Promise<number>;

  /**
   * Register a confirmation policy
   */
  registerPolicy(policy: ConfirmationPolicy): void;

  /**
   * Get all registered policies
   */
  getPolicies(): ConfirmationPolicy[];
}

// ============================================================================
// Confirmation UI Contract
// ============================================================================

/**
 * Confirmation dialog data (for frontend)
 */
export interface ConfirmationDialogData {
  /** Confirmation ID */
  id: string;

  /** Dialog title */
  title: string;

  /** Dialog message */
  message: string;

  /** Impact badge */
  impact: {
    level: ActionImpact;
    label: string;
    color: string;
  };

  /** Entity information */
  entity: {
    type: string;
    name: string;
    icon: string;
  };

  /** Changes to display */
  changes: Array<{
    label: string;
    before?: string;
    after: string;
    isDestructive: boolean;
  }>;

  /** Warnings */
  warnings: string[];

  /** Buttons */
  buttons: {
    confirm: {
      label: string;
      variant: 'primary' | 'danger';
    };
    cancel: {
      label: string;
      variant: 'secondary';
    };
    modify?: {
      label: string;
      variant: 'secondary';
    };
  };

  /** Typed confirmation requirement */
  typedConfirmation?: {
    required: boolean;
    phrase: string;
    instruction: string;
  };

  /** Time remaining before expiry */
  expiresIn: number;

  /** Allow comments */
  allowComment: boolean;
}

// ============================================================================
// Default Policies
// ============================================================================

/**
 * Default confirmation policies
 */
export const DEFAULT_CONFIRMATION_POLICIES: Omit<ConfirmationPolicy, 'id'>[] = [
  {
    name: 'delete_lead',
    description: 'Require confirmation when deleting leads',
    entityTypes: ['lead'],
    operations: ['delete'],
    conditions: [{ type: 'always', params: {} }],
    impact: 'high',
    confirmationMessage: '¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.',
    enabled: true,
    priority: 100,
  },
  {
    name: 'delete_customer',
    description: 'Require confirmation when deleting customers',
    entityTypes: ['customer'],
    operations: ['delete'],
    conditions: [{ type: 'always', params: {} }],
    impact: 'critical',
    confirmationMessage: '¿Estás seguro de que deseas eliminar este cliente? Se eliminarán todos los datos asociados.',
    enabled: true,
    priority: 100,
  },
  {
    name: 'bulk_delete',
    description: 'Require confirmation for bulk delete operations',
    entityTypes: ['lead', 'customer', 'opportunity', 'task', 'quote'],
    operations: ['delete'],
    conditions: [{ type: 'bulk_operation', params: { minCount: 2 } }],
    impact: 'critical',
    confirmationMessage: 'Vas a eliminar múltiples registros. ¿Deseas continuar?',
    enabled: true,
    priority: 200,
  },
  {
    name: 'high_value_opportunity',
    description: 'Require confirmation for high-value opportunity changes',
    entityTypes: ['opportunity'],
    operations: ['update', 'delete'],
    conditions: [{ type: 'value_exceeds', params: { field: 'value', threshold: 100000 } }],
    impact: 'high',
    confirmationMessage: 'Esta oportunidad tiene un valor alto. ¿Confirmas los cambios?',
    enabled: true,
    priority: 50,
  },
  {
    name: 'send_quote',
    description: 'Require confirmation before sending quotes',
    entityTypes: ['quote'],
    operations: ['send'],
    conditions: [{ type: 'always', params: {} }],
    impact: 'medium',
    confirmationMessage: '¿Deseas enviar esta cotización al cliente?',
    enabled: true,
    priority: 100,
  },
  {
    name: 'convert_lead',
    description: 'Require confirmation when converting leads to customers',
    entityTypes: ['lead'],
    operations: ['convert'],
    conditions: [{ type: 'always', params: {} }],
    impact: 'medium',
    confirmationMessage: '¿Deseas convertir este lead en cliente?',
    enabled: true,
    priority: 100,
  },
];
