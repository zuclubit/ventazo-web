import { IQuery } from '../common';
import { LeadDTO } from '../dtos';

/**
 * Query to get a lead by ID
 */
export class GetLeadByIdQuery implements IQuery<LeadDTO | null> {
  readonly type = 'GetLeadByIdQuery';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string
  ) {}
}
