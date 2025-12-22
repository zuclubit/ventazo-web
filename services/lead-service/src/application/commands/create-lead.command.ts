import { ICommand } from '../common';

/**
 * Command to create a new lead
 */
export class CreateLeadCommand implements ICommand {
  readonly type = 'CreateLeadCommand';

  constructor(
    public readonly tenantId: string,
    public readonly fullName: string,
    public readonly email: string,
    public readonly source: string,
    public readonly companyName?: string,
    public readonly jobTitle?: string,
    public readonly phone?: string,
    public readonly website?: string,
    public readonly industry?: string,
    public readonly employeeCount?: number,
    public readonly annualRevenue?: number,
    public readonly stageId?: string,
    public readonly ownerId?: string,
    public readonly notes?: string,
    public readonly tags?: string[],
    public readonly customFields?: Record<string, unknown>,
    // Email notification fields
    public readonly ownerEmail?: string,
    public readonly ownerName?: string
  ) {}
}
