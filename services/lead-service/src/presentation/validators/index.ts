export {
  createLeadSchema,
  updateLeadSchema,
  listLeadsQuerySchema,
  idParamSchema,
  qualifyLeadSchema,
  type CreateLeadInput,
  type UpdateLeadInput,
  type ListLeadsQuery,
  type IdParam,
  type QualifyLeadInput,
} from './lead.validator';

// Advanced validation utilities
export {
  // Phone schemas
  phoneSchema,
  requiredPhoneSchema,
  e164PhoneSchema,
  // URL schemas
  websiteSchema,
  linkedinUrlSchema,
  // Email schemas
  emailSchema,
  optionalEmailSchema,
  // Field schemas
  companyNameSchema,
  industrySchema,
  strictIndustrySchema,
  industryValues,
  currencyAmountSchema,
  employeeCountSchema,
  uuidSchema,
  optionalUuidSchema,
  timezoneSchema,
  dateRangeSchema,
  scoreSchema,
  paginationSchema,
  notesSchema,
  tagsSchema,
  customFieldsSchema,
  addressSchema,
  socialLinksSchema,
  taxIdSchema,
  // Utility functions
  formatPhoneNumber,
  normalizeUrl,
  isBusinessEmail,
  // Types
  type AddressInput,
  type SocialLinksInput,
  type PaginationInput,
  type DateRangeInput,
} from './validation-utils';
