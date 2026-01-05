import { ICommand } from '../common';

/**
 * Command to update lead information
 */
export class UpdateLeadCommand implements ICommand {
  readonly type = 'UpdateLeadCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly fullName?: string,
    public readonly companyName?: string,
    public readonly jobTitle?: string,
    public readonly email?: string,
    public readonly phone?: string,
    public readonly website?: string,
    public readonly industry?: string,
    public readonly employeeCount?: number,
    public readonly annualRevenue?: number,
    public readonly stageId?: string,
    public readonly notes?: string,
    public readonly tags?: string[]
  ) {}
}
