import { ContactType, ContactRole, ContactPreferences } from '../../domain/value-objects';

/**
 * Contact DTO for API responses
 */
export interface ContactDTO {
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string | null;
  mobilePhone: string | null;
  jobTitle: string | null;
  department: string | null;
  type: ContactType;
  role: ContactRole | null;
  isPrimary: boolean;
  preferences: ContactPreferences | null;
  linkedInUrl: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create Contact Request
 */
export interface CreateContactRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  jobTitle?: string;
  department?: string;
  type?: ContactType;
  role?: ContactRole;
  isPrimary?: boolean;
  preferences?: ContactPreferences;
  linkedInUrl?: string;
  notes?: string;
}

/**
 * Update Contact Request
 */
export interface UpdateContactRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string | null;
  mobilePhone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  type?: ContactType;
  role?: ContactRole | null;
  isPrimary?: boolean;
  preferences?: ContactPreferences | null;
  linkedInUrl?: string | null;
  notes?: string | null;
}

/**
 * Contact Filter Options
 */
export interface ContactFilterOptions {
  type?: ContactType;
  role?: ContactRole;
  isPrimary?: boolean;
  searchTerm?: string;
}

/**
 * Contact History Entry
 */
export interface ContactHistoryEntry {
  id: string;
  contactId: string;
  action: 'created' | 'updated' | 'deleted' | 'set_primary' | 'unset_primary';
  changes: Record<string, { old: unknown; new: unknown }>;
  performedBy: string;
  performedAt: Date;
}

/**
 * Bulk Contact Operation Result
 */
export interface BulkContactResult {
  success: boolean;
  contactId?: string;
  error?: string;
  data?: ContactDTO;
}

/**
 * Bulk Contact Import Request
 */
export interface BulkContactImportRequest {
  contacts: CreateContactRequest[];
  skipDuplicates?: boolean;
}

/**
 * Bulk Contact Import Result
 */
export interface BulkContactImportResult {
  total: number;
  successful: number;
  failed: number;
  duplicates: number;
  results: BulkContactResult[];
}
