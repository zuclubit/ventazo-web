import { IQuery } from '../common';
import { LeadResponseDTO } from '../dtos';

/**
 * Query to get a lead by ID
 */
export class GetLeadByIdQuery implements IQuery<LeadResponseDTO | null> {
  readonly type = 'GetLeadByIdQuery';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string
  ) {}
}
