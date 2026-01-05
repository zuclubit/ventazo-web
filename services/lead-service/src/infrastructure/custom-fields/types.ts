/**
 * Custom Fields & Metadata System Types
 * Allows dynamic extension of entity data models
 */

/**
 * Field data types
 */
export type CustomFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'time'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'radio'
  | 'checkbox'
  | 'email'
  | 'phone'
  | 'url'
  | 'lookup'
  | 'user'
  | 'formula'
  | 'rollup'
  | 'autonumber'
  | 'rich_text'
  | 'file'
  | 'image'
  | 'location'
  | 'rating'
  | 'color'
  | 'json';

/**
 * Entities that support custom fields
 */
export type CustomFieldEntity =
  | 'lead'
  | 'contact'
  | 'account'
  | 'opportunity'
  | 'customer'
  | 'task'
  | 'note'
  | 'deal'
  | 'product'
  | 'quote'
  | 'contract'
  | 'campaign';

/**
 * Validation rule types
 */
export type ValidationRuleType =
  | 'required'
  | 'min_length'
  | 'max_length'
  | 'min_value'
  | 'max_value'
  | 'regex'
  | 'unique'
  | 'custom'
  | 'email'
  | 'url'
  | 'phone'
  | 'date_range'
  | 'depends_on'
  | 'forbidden_values'
  | 'allowed_values';

/**
 * Validation rule definition
 */
export interface ValidationRule {
  type: ValidationRuleType;
  value?: unknown;
  message?: string;
  condition?: FieldCondition;
}

/**
 * Condition for conditional validation/visibility
 */
export interface FieldCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'contains' | 'is_empty' | 'is_not_empty' | 'greater_than' | 'less_than';
  value?: unknown;
}

/**
 * Select/multiselect option
 */
export interface SelectOption {
  value: string;
  label: string;
  color?: string;
  icon?: string;
  description?: string;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
}

/**
 * Formula field configuration
 */
export interface FormulaConfig {
  expression: string;
  return_type: 'text' | 'number' | 'boolean' | 'date';
  referenced_fields: string[];
}

/**
 * Rollup field configuration
 */
export interface RollupConfig {
  related_entity: CustomFieldEntity;
  related_field: string;
  aggregation: 'sum' | 'avg' | 'min' | 'max' | 'count' | 'count_distinct';
  filter?: Record<string, unknown>;
}

/**
 * Lookup field configuration
 */
export interface LookupConfig {
  related_entity: CustomFieldEntity;
  display_field: string;
  search_fields: string[];
  filter?: Record<string, unknown>;
  allow_multiple?: boolean;
}

/**
 * Autonumber configuration
 */
export interface AutonumberConfig {
  prefix?: string;
  suffix?: string;
  start_number?: number;
  increment?: number;
  padding?: number;
  format?: string; // e.g., "{YYYY}-{MM}-{####}"
}

/**
 * Custom field definition
 */
export interface CustomFieldDefinition {
  id: string;
  tenant_id: string;
  entity_type: CustomFieldEntity;
  api_name: string;
  display_name: string;
  description?: string;
  field_type: CustomFieldType;
  is_required: boolean;
  is_unique: boolean;
  is_searchable: boolean;
  is_filterable: boolean;
  is_sortable: boolean;
  is_readonly: boolean;
  is_system: boolean;
  is_active: boolean;
  default_value?: unknown;
  placeholder?: string;
  help_text?: string;
  validation_rules: ValidationRule[];
  select_options?: SelectOption[];
  formula_config?: FormulaConfig;
  rollup_config?: RollupConfig;
  lookup_config?: LookupConfig;
  autonumber_config?: AutonumberConfig;
  visibility_condition?: FieldCondition;
  field_group?: string;
  sort_order: number;
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Custom field value storage
 */
export interface CustomFieldValue {
  id: string;
  tenant_id: string;
  entity_type: CustomFieldEntity;
  entity_id: string;
  field_id: string;
  field_api_name: string;
  value: unknown;
  display_value?: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Field group for organizing fields
 */
export interface FieldGroup {
  id: string;
  tenant_id: string;
  entity_type: CustomFieldEntity;
  name: string;
  description?: string;
  is_collapsible: boolean;
  is_collapsed_by_default: boolean;
  sort_order: number;
  created_at: Date;
  updated_at: Date;
}

/**
 * Field layout configuration
 */
export interface FieldLayout {
  id: string;
  tenant_id: string;
  entity_type: CustomFieldEntity;
  name: string;
  description?: string;
  is_default: boolean;
  layout_type: 'create' | 'edit' | 'view' | 'list';
  sections: LayoutSection[];
  created_by: string;
  created_at: Date;
  updated_at: Date;
}

/**
 * Layout section
 */
export interface LayoutSection {
  id: string;
  name: string;
  columns: 1 | 2 | 3 | 4;
  is_collapsible: boolean;
  is_collapsed_by_default: boolean;
  fields: LayoutField[];
  sort_order: number;
}

/**
 * Field placement in layout
 */
export interface LayoutField {
  field_id: string;
  field_api_name: string;
  column: number;
  row: number;
  colspan?: number;
  is_readonly?: boolean;
  is_hidden?: boolean;
}

/**
 * Create field input
 */
export interface CreateCustomFieldInput {
  entity_type: CustomFieldEntity;
  api_name: string;
  display_name: string;
  description?: string;
  field_type: CustomFieldType;
  is_required?: boolean;
  is_unique?: boolean;
  is_searchable?: boolean;
  is_filterable?: boolean;
  is_sortable?: boolean;
  is_readonly?: boolean;
  default_value?: unknown;
  placeholder?: string;
  help_text?: string;
  validation_rules?: ValidationRule[];
  select_options?: SelectOption[];
  formula_config?: FormulaConfig;
  rollup_config?: RollupConfig;
  lookup_config?: LookupConfig;
  autonumber_config?: AutonumberConfig;
  visibility_condition?: FieldCondition;
  field_group?: string;
}

/**
 * Update field input
 */
export interface UpdateCustomFieldInput {
  display_name?: string;
  description?: string;
  is_required?: boolean;
  is_searchable?: boolean;
  is_filterable?: boolean;
  is_sortable?: boolean;
  is_readonly?: boolean;
  is_active?: boolean;
  default_value?: unknown;
  placeholder?: string;
  help_text?: string;
  validation_rules?: ValidationRule[];
  select_options?: SelectOption[];
  formula_config?: FormulaConfig;
  visibility_condition?: FieldCondition;
  field_group?: string;
  sort_order?: number;
}

/**
 * Validation result
 */
export interface ValidationResult {
  is_valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation error
 */
export interface ValidationError {
  field_api_name: string;
  rule_type: ValidationRuleType;
  message: string;
  actual_value?: unknown;
  expected?: unknown;
}

/**
 * Field statistics
 */
export interface FieldStatistics {
  field_id: string;
  total_records: number;
  filled_records: number;
  fill_rate: number;
  unique_values: number;
  top_values?: Array<{ value: unknown; count: number }>;
  numeric_stats?: {
    min: number;
    max: number;
    avg: number;
    sum: number;
    median: number;
  };
  last_updated: Date;
}

/**
 * Field migration request
 */
export interface FieldMigrationRequest {
  source_field_id: string;
  target_field_id: string;
  transformation?: 'copy' | 'move' | 'map';
  value_mapping?: Record<string, unknown>;
  default_for_unmapped?: unknown;
}

/**
 * Default system fields for leads
 */
export const DEFAULT_LEAD_FIELDS: Partial<CustomFieldDefinition>[] = [
  {
    api_name: 'company_size',
    display_name: 'Company Size',
    field_type: 'select',
    is_filterable: true,
    is_searchable: true,
    is_system: false,
    select_options: [
      { value: '1-10', label: '1-10 employees', sort_order: 1 },
      { value: '11-50', label: '11-50 employees', sort_order: 2 },
      { value: '51-200', label: '51-200 employees', sort_order: 3 },
      { value: '201-500', label: '201-500 employees', sort_order: 4 },
      { value: '501-1000', label: '501-1000 employees', sort_order: 5 },
      { value: '1001+', label: '1001+ employees', sort_order: 6 },
    ],
  },
  {
    api_name: 'annual_revenue',
    display_name: 'Annual Revenue',
    field_type: 'currency',
    is_filterable: true,
    is_sortable: true,
    is_system: false,
  },
  {
    api_name: 'industry',
    display_name: 'Industry',
    field_type: 'select',
    is_filterable: true,
    is_searchable: true,
    is_system: false,
    select_options: [
      { value: 'technology', label: 'Technology', sort_order: 1 },
      { value: 'healthcare', label: 'Healthcare', sort_order: 2 },
      { value: 'finance', label: 'Finance', sort_order: 3 },
      { value: 'retail', label: 'Retail', sort_order: 4 },
      { value: 'manufacturing', label: 'Manufacturing', sort_order: 5 },
      { value: 'education', label: 'Education', sort_order: 6 },
      { value: 'government', label: 'Government', sort_order: 7 },
      { value: 'nonprofit', label: 'Non-Profit', sort_order: 8 },
      { value: 'other', label: 'Other', sort_order: 9 },
    ],
  },
  {
    api_name: 'website',
    display_name: 'Website',
    field_type: 'url',
    is_searchable: true,
    is_system: false,
    validation_rules: [{ type: 'url', message: 'Please enter a valid URL' }],
  },
  {
    api_name: 'linkedin_url',
    display_name: 'LinkedIn Profile',
    field_type: 'url',
    is_system: false,
    placeholder: 'https://linkedin.com/in/...',
  },
  {
    api_name: 'lead_source_detail',
    display_name: 'Lead Source Detail',
    field_type: 'text',
    is_searchable: true,
    is_system: false,
    help_text: 'Additional details about the lead source',
  },
  {
    api_name: 'budget_range',
    display_name: 'Budget Range',
    field_type: 'select',
    is_filterable: true,
    is_system: false,
    select_options: [
      { value: 'under_10k', label: 'Under $10K', sort_order: 1 },
      { value: '10k_50k', label: '$10K - $50K', sort_order: 2 },
      { value: '50k_100k', label: '$50K - $100K', sort_order: 3 },
      { value: '100k_500k', label: '$100K - $500K', sort_order: 4 },
      { value: 'over_500k', label: 'Over $500K', sort_order: 5 },
    ],
  },
  {
    api_name: 'decision_timeline',
    display_name: 'Decision Timeline',
    field_type: 'select',
    is_filterable: true,
    is_system: false,
    select_options: [
      { value: 'immediate', label: 'Immediate', sort_order: 1 },
      { value: '1_month', label: 'Within 1 month', sort_order: 2 },
      { value: '3_months', label: 'Within 3 months', sort_order: 3 },
      { value: '6_months', label: 'Within 6 months', sort_order: 4 },
      { value: 'over_6_months', label: 'Over 6 months', sort_order: 5 },
    ],
  },
  {
    api_name: 'competitor_info',
    display_name: 'Competitor Information',
    field_type: 'textarea',
    is_searchable: true,
    is_system: false,
    help_text: 'Any known competitors the lead is evaluating',
  },
  {
    api_name: 'pain_points',
    display_name: 'Pain Points',
    field_type: 'multiselect',
    is_filterable: true,
    is_system: false,
    select_options: [
      { value: 'efficiency', label: 'Efficiency', sort_order: 1 },
      { value: 'cost_reduction', label: 'Cost Reduction', sort_order: 2 },
      { value: 'scalability', label: 'Scalability', sort_order: 3 },
      { value: 'integration', label: 'Integration', sort_order: 4 },
      { value: 'reporting', label: 'Reporting', sort_order: 5 },
      { value: 'compliance', label: 'Compliance', sort_order: 6 },
      { value: 'support', label: 'Support', sort_order: 7 },
    ],
  },
  {
    api_name: 'lead_rating',
    display_name: 'Lead Rating',
    field_type: 'rating',
    is_filterable: true,
    is_sortable: true,
    is_system: false,
  },
  {
    api_name: 'preferred_contact_time',
    display_name: 'Preferred Contact Time',
    field_type: 'select',
    is_system: false,
    select_options: [
      { value: 'morning', label: 'Morning (9AM-12PM)', sort_order: 1 },
      { value: 'afternoon', label: 'Afternoon (12PM-5PM)', sort_order: 2 },
      { value: 'evening', label: 'Evening (5PM-8PM)', sort_order: 3 },
    ],
  },
  {
    api_name: 'timezone',
    display_name: 'Timezone',
    field_type: 'select',
    is_filterable: true,
    is_system: false,
    select_options: [
      { value: 'America/New_York', label: 'Eastern Time (ET)', sort_order: 1 },
      { value: 'America/Chicago', label: 'Central Time (CT)', sort_order: 2 },
      { value: 'America/Denver', label: 'Mountain Time (MT)', sort_order: 3 },
      { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', sort_order: 4 },
      { value: 'Europe/London', label: 'GMT', sort_order: 5 },
      { value: 'Europe/Paris', label: 'Central European Time', sort_order: 6 },
      { value: 'Asia/Tokyo', label: 'Japan Standard Time', sort_order: 7 },
    ],
  },
  {
    api_name: 'custom_score',
    display_name: 'Custom Score',
    field_type: 'number',
    is_filterable: true,
    is_sortable: true,
    is_system: false,
    validation_rules: [
      { type: 'min_value', value: 0, message: 'Score must be positive' },
      { type: 'max_value', value: 100, message: 'Score cannot exceed 100' },
    ],
  },
];
