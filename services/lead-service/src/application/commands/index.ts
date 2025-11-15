// Create Lead
export { CreateLeadCommand } from './create-lead.command';
export { CreateLeadHandler, type CreateLeadResult } from './create-lead.handler';

// Update Lead
export { UpdateLeadCommand } from './update-lead.command';
export { UpdateLeadHandler } from './update-lead.handler';

// Change Lead Status
export { ChangeLeadStatusCommand } from './change-lead-status.command';
export { ChangeLeadStatusHandler } from './change-lead-status.handler';

// Update Lead Score
export { UpdateLeadScoreCommand } from './update-lead-score.command';
export { UpdateLeadScoreHandler } from './update-lead-score.handler';

// Assign Lead
export { AssignLeadCommand } from './assign-lead.command';
export { AssignLeadHandler } from './assign-lead.handler';

// Qualify Lead
export { QualifyLeadCommand } from './qualify-lead.command';
export { QualifyLeadHandler } from './qualify-lead.handler';

// Schedule Follow-up
export { ScheduleFollowUpCommand } from './schedule-follow-up.command';
export { ScheduleFollowUpHandler } from './schedule-follow-up.handler';
