/**
 * Search Types
 * Types for full-text search functionality
 */

import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Search Entity Type
 */
export enum SearchEntityType {
  LEAD = 'lead',
  CONTACT = 'contact',
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
  TASK = 'task',
  COMMUNICATION = 'communication',
  ALL = 'all',
}

/**
 * Search Highlight Options
 */
export interface SearchHighlightOptions {
  startTag?: string;
  stopTag?: string;
  maxLength?: number;
  minLength?: number;
}

/**
 * Search Options
 */
export interface SearchOptions {
  query: string;
  entityTypes?: SearchEntityType[];
  tenantId: string;

  // Filters
  status?: LeadStatusEnum[];
  ownerId?: string;
  source?: string[];
  industry?: string[];
  tags?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  minScore?: number;
  maxScore?: number;

  // Pagination
  page?: number;
  limit?: number;

  // Sorting
  sortBy?: 'relevance' | 'createdAt' | 'updatedAt' | 'score';
  sortOrder?: 'asc' | 'desc';

  // Options
  fuzzy?: boolean;
  highlightResults?: boolean;
  highlightOptions?: SearchHighlightOptions;
}

/**
 * Search Result Item - Lead
 */
export interface LeadSearchResult {
  type: 'lead';
  id: string;
  companyName: string;
  email: string;
  phone?: string | null;
  status: LeadStatusEnum;
  score: number;
  source: string;
  industry?: string | null;
  ownerId?: string | null;
  createdAt: Date;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Search Result Item - Contact
 */
export interface ContactSearchResult {
  type: 'contact';
  id: string;
  leadId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phone?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  isPrimary: boolean;
  createdAt: Date;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Search Result Item - Communication
 */
export interface CommunicationSearchResult {
  type: 'communication';
  id: string;
  leadId: string;
  communicationType: string;
  direction: string;
  subject?: string | null;
  summary?: string | null;
  occurredAt: Date;
  createdBy: string;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Search Result Item - Customer
 */
export interface CustomerSearchResult {
  type: 'customer';
  id: string;
  companyName: string;
  email: string;
  phone?: string | null;
  status: string;
  tier: string;
  industry?: string | null;
  createdAt: Date;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Search Result Item - Opportunity
 */
export interface OpportunitySearchResult {
  type: 'opportunity';
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate?: Date | null;
  createdAt: Date;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Search Result Item - Task
 */
export interface TaskSearchResult {
  type: 'task';
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: Date | null;
  createdAt: Date;
  relevanceScore: number;
  highlights?: {
    field: string;
    snippet: string;
  }[];
}

/**
 * Combined Search Result
 */
export type SearchResultItem =
  | LeadSearchResult
  | ContactSearchResult
  | CommunicationSearchResult
  | CustomerSearchResult
  | OpportunitySearchResult
  | TaskSearchResult;

/**
 * Search Results Response
 */
export interface SearchResults {
  items: SearchResultItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  query: string;
  executionTimeMs: number;
  facets?: SearchFacets;
}

/**
 * Search Facets
 */
export interface SearchFacets {
  entityTypes: { type: SearchEntityType; count: number }[];
  statuses?: { status: LeadStatusEnum; count: number }[];
  sources?: { source: string; count: number }[];
  industries?: { industry: string; count: number }[];
  owners?: { ownerId: string; count: number }[];
}

/**
 * Autocomplete Suggestion
 */
export interface AutocompleteSuggestion {
  type: SearchEntityType;
  id: string;
  text: string;
  subtitle?: string;
  score: number;
}

/**
 * Recent Search
 */
export interface RecentSearch {
  id: string;
  query: string;
  entityTypes: SearchEntityType[];
  resultCount: number;
  searchedAt: Date;
}

/**
 * Saved Search
 */
export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  options: SearchOptions;
  createdBy: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Search Index Status
 */
export interface SearchIndexStatus {
  leadsIndexed: number;
  contactsIndexed: number;
  communicationsIndexed: number;
  lastIndexedAt?: Date;
  indexHealthy: boolean;
}
