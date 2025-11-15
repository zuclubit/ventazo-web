import { ICommand } from '../common';

/**
 * Command to assign a lead to an owner
 */
export class AssignLeadCommand implements ICommand {
  readonly type = 'AssignLeadCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly ownerId: string,
    public readonly assignedBy: string
  ) {}
}
