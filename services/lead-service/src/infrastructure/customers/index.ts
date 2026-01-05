/**
 * Customers Module
 * Exports for customer management
 */
export { CustomerService, CustomerNoteDTO, CustomerActivityDTO } from './customer.service';
export {
  CustomerStatus,
  CustomerType,
  CustomerTier,
  CustomerAddress,
  CustomerDTO,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  ConvertLeadToCustomerRequest,
  CustomerFilterOptions,
  CustomerSortOptions,
  CustomerStatistics,
  CustomerRevenueSummary,
  BulkCustomerOperation,
  BulkCustomerResult,
  CustomerTimelineEntry,
  CustomerHealthScore,
} from './types';
