import { ICommand } from '../common';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Update data for a single lead in bulk operation
 */
export interface BulkLeadUpdateData {
  leadId: string;
  companyName?: string;
  email?: string;
  phone?: string;
  website?: string;
  industry?: string;
  employeeCount?: number;
  annualRevenue?: number;
  notes?: string;
  customFields?: Record<string, unknown>;
}

/**
 * Command to update multiple leads in a single operation
 */
export class BulkUpdateLeadsCommand implements ICommand {
  readonly type = 'BulkUpdateLeadsCommand';

  constructor(
    public readonly tenantId: string,
    public readonly updates: BulkLeadUpdateData[],
    public readonly updatedBy: string
  ) {}
}

/**
 * Command to assign multiple leads to an owner
 */
export class BulkAssignLeadsCommand implements ICommand {
  readonly type = 'BulkAssignLeadsCommand';

  constructor(
    public readonly tenantId: string,
    public readonly leadIds: string[],
    public readonly newOwnerId: string,
    public readonly assignedBy: string
  ) {}
}

/**
 * Command to change status of multiple leads
 */
export class BulkChangeStatusCommand implements ICommand {
  readonly type = 'BulkChangeStatusCommand';

  constructor(
    public readonly tenantId: string,
    public readonly leadIds: string[],
    public readonly newStatus: LeadStatusEnum,
    public readonly changedBy: string,
    public readonly reason?: string
  ) {}
}

/**
 * Command to delete multiple leads
 */
export class BulkDeleteLeadsCommand implements ICommand {
  readonly type = 'BulkDeleteLeadsCommand';

  constructor(
    public readonly tenantId: string,
    public readonly leadIds: string[],
    public readonly deletedBy: string,
    public readonly hardDelete?: boolean
  ) {}
}
