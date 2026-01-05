'use client';

/**
 * Search Hooks
 * React hooks for global search functionality
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api/api-client';
import { useDebouncedValue } from '@/lib/performance';
import type {
  SearchOptions,
  SearchResults,
  SearchResultItem,
  AutocompleteSuggestion,
  RecentSearch,
  SavedSearch,
  SearchEntityType,
  SearchLocale,
  SearchTranslations,
} from './types';
import { searchI18n } from './types';

// ============================================
// Query Keys
// ============================================

export const searchQueryKeys = {
  all: ['search'] as const,
  results: (query: string, options?: Partial<SearchOptions>) =>
    [...searchQueryKeys.all, 'results', query, options] as const,
  autocomplete: (query: string, entityTypes?: SearchEntityType[]) =>
    [...searchQueryKeys.all, 'autocomplete', query, entityTypes] as const,
  recent: () => [...searchQueryKeys.all, 'recent'] as const,
  saved: () => [...searchQueryKeys.all, 'saved'] as const,
};

// ============================================
// API Functions
// ============================================

type ApiParams = Record<string, string | number | boolean | undefined>;

async function searchApi(options: SearchOptions): Promise<SearchResults> {
  const params: ApiParams = {
    q: options.query,
    page: options.page,
    limit: options.limit,
    sortBy: options.sortBy,
    sortOrder: options.sortOrder,
    fuzzy: options.fuzzy,
  };

  if (options.entityTypes?.length) {
    params['entityTypes'] = options.entityTypes.join(',');
  }
  if (options.status?.length) {
    params['status'] = options.status.join(',');
  }
  if (options.source?.length) {
    params['source'] = options.source.join(',');
  }
  if (options.industry?.length) {
    params['industry'] = options.industry.join(',');
  }
  if (options.minScore !== undefined) {
    params['minScore'] = options.minScore;
  }
  if (options.maxScore !== undefined) {
    params['maxScore'] = options.maxScore;
  }

  return apiClient.get<SearchResults>('/search', { params });
}

async function autocompleteApi(
  query: string,
  entityTypes?: SearchEntityType[],
  limit: number = 10
): Promise<AutocompleteSuggestion[]> {
  const params: ApiParams = {
    q: query,
    limit,
  };

  if (entityTypes?.length) {
    params['entityTypes'] = entityTypes.join(',');
  }

  const response = await apiClient.get<{ suggestions: AutocompleteSuggestion[]; query: string }>(
    '/search/autocomplete',
    { params }
  );

  return response.suggestions || [];
}

async function getRecentSearchesApi(): Promise<RecentSearch[]> {
  const response = await apiClient.get<{ searches: RecentSearch[]; count: number }>('/search/recent');
  return response.searches || [];
}

async function saveSearchApi(
  name: string,
  options: SearchOptions,
  isPublic: boolean = false
): Promise<SavedSearch> {
  return apiClient.post<SavedSearch>('/search/saved', {
    name,
    options,
    isPublic,
  });
}

// ============================================
// useGlobalSearch Hook
// ============================================

interface UseGlobalSearchOptions {
  debounceMs?: number;
  minQueryLength?: number;
  autoSearch?: boolean;
  entityTypes?: SearchEntityType[];
  limit?: number;
}

interface UseGlobalSearchReturn {
  // State
  query: string;
  setQuery: (query: string) => void;
  debouncedQuery: string;
  isSearching: boolean;
  results: SearchResultItem[];
  totalResults: number;
  error: Error | null;

  // Actions
  search: (options?: Partial<SearchOptions>) => void;
  clearResults: () => void;
  refetch: () => void;

  // Metadata
  executionTimeMs: number;
  page: number;
  totalPages: number;
}

export function useGlobalSearch(
  options: UseGlobalSearchOptions = {}
): UseGlobalSearchReturn {
  const {
    debounceMs = 300,
    minQueryLength = 2,
    autoSearch = true,
    entityTypes,
    limit = 20,
  } = options;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, debounceMs);
  const [manualSearchOptions, setManualSearchOptions] = useState<Partial<SearchOptions> | null>(null);

  const shouldSearch = debouncedQuery.length >= minQueryLength;

  const searchOptions: SearchOptions = useMemo(
    () => ({
      query: debouncedQuery,
      entityTypes,
      limit,
      fuzzy: true,
      ...manualSearchOptions,
    }),
    [debouncedQuery, entityTypes, limit, manualSearchOptions]
  );

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: searchQueryKeys.results(debouncedQuery, searchOptions),
    queryFn: () => searchApi(searchOptions),
    enabled: autoSearch && shouldSearch,
    staleTime: 30000, // 30 seconds
    gcTime: 60000, // 1 minute
  });

  const search = useCallback(
    (opts?: Partial<SearchOptions>) => {
      setManualSearchOptions(opts || null);
      if (opts?.query) {
        setQuery(opts.query);
      }
    },
    []
  );

  const clearResults = useCallback(() => {
    setQuery('');
    setManualSearchOptions(null);
  }, []);

  return {
    query,
    setQuery,
    debouncedQuery,
    isSearching: isLoading,
    results: data?.items || [],
    totalResults: data?.total || 0,
    error: error as Error | null,
    search,
    clearResults,
    refetch,
    executionTimeMs: data?.executionTimeMs || 0,
    page: data?.page || 1,
    totalPages: data?.totalPages || 0,
  };
}

// ============================================
// useSearchAutocomplete Hook
// ============================================

interface UseSearchAutocompleteOptions {
  debounceMs?: number;
  minQueryLength?: number;
  limit?: number;
  entityTypes?: SearchEntityType[];
}

interface UseSearchAutocompleteReturn {
  query: string;
  setQuery: (query: string) => void;
  suggestions: AutocompleteSuggestion[];
  isLoading: boolean;
  error: Error | null;
  clearSuggestions: () => void;
}

export function useSearchAutocomplete(
  options: UseSearchAutocompleteOptions = {}
): UseSearchAutocompleteReturn {
  const {
    debounceMs = 200,
    minQueryLength = 2,
    limit = 10,
    entityTypes,
  } = options;

  const [query, setQuery] = useState('');
  const debouncedQuery = useDebouncedValue(query, debounceMs);

  const shouldFetch = debouncedQuery.length >= minQueryLength;

  const { data, isLoading, error } = useQuery({
    queryKey: searchQueryKeys.autocomplete(debouncedQuery, entityTypes),
    queryFn: () => autocompleteApi(debouncedQuery, entityTypes, limit),
    enabled: shouldFetch,
    staleTime: 60000, // 1 minute
  });

  const clearSuggestions = useCallback(() => {
    setQuery('');
  }, []);

  return {
    query,
    setQuery,
    suggestions: data || [],
    isLoading,
    error: error as Error | null,
    clearSuggestions,
  };
}

// ============================================
// useRecentSearches Hook
// ============================================

interface UseRecentSearchesReturn {
  recentSearches: RecentSearch[];
  isLoading: boolean;
  error: Error | null;
  clearRecent: () => void;
  refetch: () => void;
}

export function useRecentSearches(): UseRecentSearchesReturn {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: searchQueryKeys.recent(),
    queryFn: getRecentSearchesApi,
    staleTime: 300000, // 5 minutes
  });

  const clearRecent = useCallback(() => {
    queryClient.setQueryData(searchQueryKeys.recent(), []);
  }, [queryClient]);

  return {
    recentSearches: data || [],
    isLoading,
    error: error as Error | null,
    clearRecent,
    refetch,
  };
}

// ============================================
// useSaveSearch Hook
// ============================================

interface UseSaveSearchReturn {
  saveSearch: (name: string, options: SearchOptions, isPublic?: boolean) => void;
  isSaving: boolean;
  error: Error | null;
}

export function useSaveSearch(): UseSaveSearchReturn {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: ({
      name,
      options,
      isPublic,
    }: {
      name: string;
      options: SearchOptions;
      isPublic?: boolean;
    }) => saveSearchApi(name, options, isPublic),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: searchQueryKeys.saved() });
    },
  });

  const saveSearch = useCallback(
    (name: string, options: SearchOptions, isPublic: boolean = false) => {
      mutation.mutate({ name, options, isPublic });
    },
    [mutation]
  );

  return {
    saveSearch,
    isSaving: mutation.isPending,
    error: mutation.error as Error | null,
  };
}

// ============================================
// useSearchLocale Hook
// ============================================

interface UseSearchLocaleReturn {
  locale: SearchLocale;
  t: SearchTranslations;
  setLocale: (locale: SearchLocale) => void;
}

export function useSearchLocale(
  initialLocale: SearchLocale = 'es'
): UseSearchLocaleReturn {
  const [locale, setLocale] = useState<SearchLocale>(initialLocale);

  const t = useMemo(
    () => searchI18n[locale] as SearchTranslations,
    [locale]
  );

  return {
    locale,
    t,
    setLocale,
  };
}

// ============================================
// useSearchKeyboard Hook
// ============================================

interface UseSearchKeyboardOptions {
  onOpen?: () => void;
  onClose?: () => void;
  onNavigate?: (direction: 'up' | 'down') => void;
  onSelect?: () => void;
  enabled?: boolean;
}

export function useSearchKeyboard(options: UseSearchKeyboardOptions = {}): void {
  const { onOpen, onClose, onNavigate, onSelect, enabled = true } = options;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd+K or Ctrl+K to open
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen?.();
        return;
      }

      // Escape to close
      if (e.key === 'Escape') {
        onClose?.();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        onNavigate?.('down');
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        onNavigate?.('up');
        return;
      }

      // Enter to select
      if (e.key === 'Enter') {
        onSelect?.();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled, onOpen, onClose, onNavigate, onSelect]);
}

// ============================================
// Helper: Get entity icon and color
// ============================================

export function getEntityDisplayInfo(type: string): {
  label: string;
  labelEn: string;
  color: string;
  bgColor: string;
} {
  const entityInfo: Record<string, { label: string; labelEn: string; color: string; bgColor: string }> = {
    lead: {
      label: 'Lead',
      labelEn: 'Lead',
      color: '#3b82f6',
      bgColor: '#3b82f610',
    },
    contact: {
      label: 'Contacto',
      labelEn: 'Contact',
      color: '#10b981',
      bgColor: '#10b98110',
    },
    customer: {
      label: 'Cliente',
      labelEn: 'Customer',
      color: '#8b5cf6',
      bgColor: '#8b5cf610',
    },
    opportunity: {
      label: 'Oportunidad',
      labelEn: 'Opportunity',
      color: '#f97316',
      bgColor: '#f9731610',
    },
    task: {
      label: 'Tarea',
      labelEn: 'Task',
      color: '#06b6d4',
      bgColor: '#06b6d410',
    },
    communication: {
      label: 'Comunicacion',
      labelEn: 'Communication',
      color: '#ec4899',
      bgColor: '#ec489910',
    },
  };

  return (
    entityInfo[type] || {
      label: type,
      labelEn: type,
      color: '#64748b',
      bgColor: '#64748b10',
    }
  );
}
