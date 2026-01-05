import { IQuery } from '../common';
import { LeadResponseDTO } from '../dtos';

/**
 * Query to get leads with overdue follow-ups
 */
export class GetOverdueFollowUpsQuery implements IQuery<LeadResponseDTO[]> {
  readonly type = 'GetOverdueFollowUpsQuery';

  constructor(
    public readonly tenantId: string,
    public readonly ownerId?: string
  ) {}
}
