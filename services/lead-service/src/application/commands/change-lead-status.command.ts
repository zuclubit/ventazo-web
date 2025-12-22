import { ICommand } from '../common';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Command to change lead status
 */
export class ChangeLeadStatusCommand implements ICommand {
  readonly type = 'ChangeLeadStatusCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly newStatus: LeadStatusEnum,
    public readonly changedBy: string,
    public readonly ownerPhone?: string
  ) {}
}
