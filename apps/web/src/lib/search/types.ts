/**
 * Search Types - Frontend
 * Types for global search functionality
 */

// ============================================
// Entity Types
// ============================================

export enum SearchEntityType {
  LEAD = 'lead',
  CONTACT = 'contact',
  CUSTOMER = 'customer',
  OPPORTUNITY = 'opportunity',
  TASK = 'task',
  COMMUNICATION = 'communication',
  ALL = 'all',
}

// ============================================
// Search Options
// ============================================

export interface SearchOptions {
  query: string;
  entityTypes?: SearchEntityType[];

  // Filters
  status?: string[];
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
}

// ============================================
// Search Results
// ============================================

export interface LeadSearchResult {
  type: 'lead';
  id: string;
  companyName: string;
  email: string;
  phone?: string | null;
  status: string;
  score: number;
  source: string;
  industry?: string | null;
  ownerId?: string | null;
  createdAt: string;
  relevanceScore: number;
}

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
  createdAt: string;
  relevanceScore: number;
}

export interface CustomerSearchResult {
  type: 'customer';
  id: string;
  companyName: string;
  email: string;
  phone?: string | null;
  status: string;
  tier: string;
  industry?: string | null;
  createdAt: string;
  relevanceScore: number;
}

export interface OpportunitySearchResult {
  type: 'opportunity';
  id: string;
  name: string;
  value: number;
  stage: string;
  probability: number;
  expectedCloseDate?: string | null;
  createdAt: string;
  relevanceScore: number;
}

export interface TaskSearchResult {
  type: 'task';
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  dueDate?: string | null;
  createdAt: string;
  relevanceScore: number;
}

export interface CommunicationSearchResult {
  type: 'communication';
  id: string;
  leadId: string;
  communicationType: string;
  direction: string;
  subject?: string | null;
  summary?: string | null;
  occurredAt: string;
  createdBy: string;
  relevanceScore: number;
}

export type SearchResultItem =
  | LeadSearchResult
  | ContactSearchResult
  | CustomerSearchResult
  | OpportunitySearchResult
  | TaskSearchResult
  | CommunicationSearchResult;

// ============================================
// Search Response
// ============================================

export interface SearchFacets {
  entityTypes: { type: SearchEntityType; count: number }[];
  statuses?: { status: string; count: number }[];
  sources?: { source: string; count: number }[];
  industries?: { industry: string; count: number }[];
}

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

// ============================================
// Autocomplete
// ============================================

export interface AutocompleteSuggestion {
  type: SearchEntityType;
  id: string;
  text: string;
  subtitle?: string;
  score: number;
}

// ============================================
// Recent & Saved Searches
// ============================================

export interface RecentSearch {
  id: string;
  query: string;
  entityTypes: SearchEntityType[];
  resultCount: number;
  searchedAt: string;
}

export interface SavedSearch {
  id: string;
  name: string;
  description?: string;
  options: SearchOptions;
  createdBy: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Search State
// ============================================

export interface SearchState {
  query: string;
  isOpen: boolean;
  isLoading: boolean;
  results: SearchResultItem[];
  suggestions: AutocompleteSuggestion[];
  recentSearches: RecentSearch[];
  selectedIndex: number;
  activeFilter: SearchEntityType;
  error: string | null;
}

// ============================================
// i18n Keys
// ============================================

export const searchI18n = {
  es: {
    placeholder: 'Buscar leads, clientes, oportunidades...',
    placeholderShort: 'Buscar...',
    noResults: 'Sin resultados',
    noResultsFor: 'Sin resultados para',
    tryOtherKeywords: 'Intenta con otras palabras clave',
    recentSearches: 'Búsquedas recientes',
    suggestions: 'Sugerencias',
    filters: 'Filtros',
    all: 'Todo',
    leads: 'Leads',
    contacts: 'Contactos',
    customers: 'Clientes',
    opportunities: 'Oportunidades',
    tasks: 'Tareas',
    communications: 'Comunicaciones',
    navigate: 'navegar',
    select: 'seleccionar',
    close: 'cerrar',
    open: 'abrir búsqueda',
    clearRecent: 'Limpiar recientes',
    searchIn: 'Buscar en',
    resultsFound: 'resultados encontrados',
    resultFound: 'resultado encontrado',
    searching: 'Buscando...',
    pressToSearch: 'Presiona Enter para buscar',
    typeToSearch: 'Escribe para buscar',
    viewAll: 'Ver todos',
    quickActions: 'Acciones rápidas',
    goToLead: 'Ir a lead',
    goToCustomer: 'Ir a cliente',
    goToOpportunity: 'Ir a oportunidad',
    goToTask: 'Ir a tarea',
    score: 'Score',
    status: 'Estado',
    created: 'Creado',
  },
  en: {
    placeholder: 'Search leads, customers, opportunities...',
    placeholderShort: 'Search...',
    noResults: 'No results',
    noResultsFor: 'No results for',
    tryOtherKeywords: 'Try other keywords',
    recentSearches: 'Recent searches',
    suggestions: 'Suggestions',
    filters: 'Filters',
    all: 'All',
    leads: 'Leads',
    contacts: 'Contacts',
    customers: 'Customers',
    opportunities: 'Opportunities',
    tasks: 'Tasks',
    communications: 'Communications',
    navigate: 'navigate',
    select: 'select',
    close: 'close',
    open: 'open search',
    clearRecent: 'Clear recent',
    searchIn: 'Search in',
    resultsFound: 'results found',
    resultFound: 'result found',
    searching: 'Searching...',
    pressToSearch: 'Press Enter to search',
    typeToSearch: 'Type to search',
    viewAll: 'View all',
    quickActions: 'Quick actions',
    goToLead: 'Go to lead',
    goToCustomer: 'Go to customer',
    goToOpportunity: 'Go to opportunity',
    goToTask: 'Go to task',
    score: 'Score',
    status: 'Status',
    created: 'Created',
  },
} as const;

export type SearchLocale = keyof typeof searchI18n;
export type SearchTranslations = typeof searchI18n.es;
