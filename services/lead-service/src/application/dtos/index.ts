export type {
  CreateLeadDTO,
  UpdateLeadDTO,
  LeadResponseDTO,
  PaginatedLeadsResponseDTO,
  LeadStatsDTO,
} from './lead.dto';
export { LeadMapper } from './lead.dto';

// Alias for backward compatibility
export type { LeadResponseDTO as LeadDTO } from './lead.dto';
