import { ICommand } from '../common';

/**
 * Command to qualify a lead
 */
export class QualifyLeadCommand implements ICommand {
  readonly type = 'QualifyLeadCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly qualifiedBy: string,
    // Email notification fields
    public readonly ownerEmail?: string,
    public readonly ownerName?: string
  ) {}
}
