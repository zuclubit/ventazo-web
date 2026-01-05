import { IQuery } from '../common';
import { LeadStatsDTO } from '../dtos';

/**
 * Query to get lead statistics for a tenant
 */
export class GetLeadStatsQuery implements IQuery<LeadStatsDTO> {
  readonly type = 'GetLeadStatsQuery';

  constructor(public readonly tenantId: string) {}
}
