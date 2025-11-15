import { ICommand } from '../common';

/**
 * Command to update lead score
 */
export class UpdateLeadScoreCommand implements ICommand {
  readonly type = 'UpdateLeadScoreCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly newScore: number,
    public readonly reason?: string
  ) {}
}
