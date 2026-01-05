import { ICommand } from '../common';

/**
 * Command to schedule a follow-up for a lead
 */
export class ScheduleFollowUpCommand implements ICommand {
  readonly type = 'ScheduleFollowUpCommand';

  constructor(
    public readonly leadId: string,
    public readonly tenantId: string,
    public readonly followUpDate: Date,
    public readonly scheduledBy: string
  ) {}
}
