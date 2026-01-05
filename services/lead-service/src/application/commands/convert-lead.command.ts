import { ICommand } from '../common';

/**
 * Command to convert a qualified lead to a customer
 */
export class ConvertLeadCommand implements ICommand {
  readonly type = 'ConvertLeadCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly convertedBy: string,
    public readonly contractValue?: number,
    public readonly contractStartDate?: Date,
    public readonly contractEndDate?: Date,
    public readonly notes?: string,
    // Email notification fields
    public readonly ownerEmail?: string,
    public readonly ownerName?: string
  ) {}
}
