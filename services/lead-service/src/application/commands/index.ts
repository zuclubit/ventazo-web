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

// Convert Lead to Customer
export { ConvertLeadCommand } from './convert-lead.command';
export { ConvertLeadHandler, type ConvertLeadResult } from './convert-lead.handler';

// Bulk Operations
export { BulkCreateLeadsCommand, type BulkLeadData } from './bulk-create-leads.command';
export { BulkCreateLeadsHandler, type BulkCreateLeadsResult, type BulkLeadResult } from './bulk-create-leads.handler';
export {
  BulkUpdateLeadsCommand,
  BulkAssignLeadsCommand,
  BulkChangeStatusCommand,
  BulkDeleteLeadsCommand,
  type BulkLeadUpdateData,
} from './bulk-update-leads.command';
export {
  BulkUpdateLeadsHandler,
  BulkAssignLeadsHandler,
  BulkChangeStatusHandler,
  BulkDeleteLeadsHandler,
  type BulkOperationResult,
  type BulkOperationSummary,
} from './bulk-update-leads.handler';
