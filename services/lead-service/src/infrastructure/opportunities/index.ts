/**
 * Opportunities Module
 * Exports for opportunity/deal management
 */
export { OpportunityService } from './opportunity.service';
export {
  OpportunityStatus,
  DefaultOpportunityStage,
  OpportunitySource,
  OpportunityPriority,
  OpportunityDTO,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  WinOpportunityRequest,
  LoseOpportunityRequest,
  OpportunityFilterOptions,
  OpportunitySortOptions,
  OpportunityStatistics,
  PipelineForecast,
  BulkOpportunityOperation,
  BulkOpportunityResult,
  StageMovement,
  OpportunityActivityEntry,
  ConvertLeadToOpportunityRequest,
} from './types';
