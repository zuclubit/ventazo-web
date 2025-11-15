import { ICommand } from '../common';

/**
 * Command to create a new lead
 * Encapsulates all data needed to create a lead
 */
export class CreateLeadCommand implements ICommand {
  readonly type = 'CreateLeadCommand';

  constructor(
    public readonly tenantId: string,
    public readonly companyName: string,
    public readonly email: string,
    public readonly source: string,
    public readonly phone?: string,
    public readonly website?: string,
    public readonly industry?: string,
    public readonly employeeCount?: number,
    public readonly annualRevenue?: number,
    public readonly notes?: string,
    public readonly customFields?: Record<string, unknown>
  ) {}
}
