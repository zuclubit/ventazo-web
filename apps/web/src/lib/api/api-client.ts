// ============================================
// API Client - FASE 2 (Production Ready)
// With interceptors, retry, and token refresh
// ============================================

import { type z } from 'zod';

import {
  getValidAccessToken,
  clearTokens,
} from '@/lib/auth/token-manager';

// ============================================
// Configuration
// ============================================

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000';
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;
const RETRY_STATUS_CODES = [408, 500, 502, 503, 504];

// ============================================
// Error Types
// ============================================

export class ApiError extends Error {
  constructor(
    public status: number,
    public statusText: string,
    public data?: unknown,
    public code?: string
  ) {
    super(ApiError.formatMessage(status, statusText, data));
    this.name = 'ApiError';
  }

  static formatMessage(
    status: number,
    statusText: string,
    data?: unknown
  ): string {
    if (data && typeof data === 'object' && 'message' in data) {
      return String((data as { message: unknown }).message);
    }
    return `API Error: ${status} ${statusText}`;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isForbidden(): boolean {
    return this.status === 403;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isValidationError(): boolean {
    return this.status === 400 || this.status === 422;
  }

  get isServerError(): boolean {
    return this.status >= 500;
  }

  get isRetryable(): boolean {
    return RETRY_STATUS_CODES.includes(this.status);
  }
}

export class NetworkError extends Error {
  public readonly originalError?: Error;

  constructor(message: string, cause?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = cause;
  }
}

export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: z.ZodError
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

// ============================================
// Types
// ============================================

export interface RequestConfig extends Omit<RequestInit, 'body'> {
  params?: Record<string, string | number | boolean | undefined>;
  tenantId?: string;
  skipAuth?: boolean;
  skipTenant?: boolean;
  retries?: number;
  timeout?: number;
}

export interface ApiResponse<T> {
  data: T;
  message?: string;
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
    totalPages?: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

// Request interceptor type
type RequestInterceptor = (
  url: string,
  config: RequestInit
) => Promise<{ url: string; config: RequestInit }>;

// Response interceptor type
type ResponseInterceptor = (response: Response) => Promise<Response>;

// Error interceptor type
type ErrorInterceptor = (error: ApiError) => Promise<void>;

// ============================================
// Helpers
// ============================================

/**
 * Build URL with query parameters
 * Properly handles base URL with path prefix (e.g., /api/v1)
 */
function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>
): string {
  let fullUrl: string;

  if (endpoint.startsWith('http')) {
    // Absolute URL - use as-is
    fullUrl = endpoint;
  } else {
    // Relative URL - concatenate with base URL properly
    // Remove trailing slash from base and leading slash from endpoint to avoid double slashes
    const baseWithoutTrailingSlash = API_BASE_URL.replace(/\/$/, '');
    const endpointWithLeadingSlash = endpoint.startsWith('/')
      ? endpoint
      : `/${endpoint}`;
    fullUrl = `${baseWithoutTrailingSlash}${endpointWithLeadingSlash}`;
  }

  const url = new URL(fullUrl);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });
  }

  return url.toString();
}

/**
 * Sleep for exponential backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Calculate exponential backoff delay
 */
function getBackoffDelay(attempt: number): number {
  return Math.min(RETRY_DELAY_MS * Math.pow(2, attempt), 30000);
}

// ============================================
// Interceptors Storage
// ============================================

const requestInterceptors: RequestInterceptor[] = [];
const responseInterceptors: ResponseInterceptor[] = [];
const errorInterceptors: ErrorInterceptor[] = [];

// ============================================
// Add Interceptors
// ============================================

export function addRequestInterceptor(interceptor: RequestInterceptor): void {
  requestInterceptors.push(interceptor);
}

export function addResponseInterceptor(interceptor: ResponseInterceptor): void {
  responseInterceptors.push(interceptor);
}

export function addErrorInterceptor(interceptor: ErrorInterceptor): void {
  errorInterceptors.push(interceptor);
}

// ============================================
// Default Error Interceptor (401 handling)
// ============================================

// Flag to prevent redirect loops
let isRedirecting = false;

addErrorInterceptor(async (error) => {
  if (error.isUnauthorized && !isRedirecting) {
    isRedirecting = true;
    clearTokens();

    // Redirect to login if in browser
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}&error=session_expired`;
    }

    // Reset flag after a delay
    setTimeout(() => {
      isRedirecting = false;
    }, 5000);
  }
});

// ============================================
// Tenant ID Getter (for interceptor)
// ============================================

let getTenantIdFromStore: (() => string | null) | null = null;

/**
 * Register the tenant store getter for the request interceptor.
 * Called from providers.tsx on app initialization.
 */
export function registerTenantGetter(getter: () => string | null): void {
  getTenantIdFromStore = getter;
}

// ============================================
// Default Request Interceptor (Tenant Header)
// ============================================

addRequestInterceptor(async (url, config) => {
  // If tenant header already set, don't override
  const headers = config.headers as Record<string, string> | undefined;
  if (headers?.['x-tenant-id']) {
    return { url, config };
  }

  // Get tenant from store if available
  if (getTenantIdFromStore) {
    const tenantId = getTenantIdFromStore();
    if (tenantId) {
      return {
        url,
        config: {
          ...config,
          headers: {
            ...headers,
            'x-tenant-id': tenantId,
          },
        },
      };
    }
  }

  return { url, config };
});

// ============================================
// Core Fetch Function
// ============================================

async function fetchWithInterceptors<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    params,
    tenantId,
    skipAuth = false,
    skipTenant = false,
    retries = MAX_RETRIES,
    timeout = 30000,
    headers: customHeaders,
    ...fetchConfig
  } = config;

  let url = buildUrl(endpoint, params);

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(customHeaders as Record<string, string>),
  };

  // Add auth header if not skipped
  if (!skipAuth) {
    const token = await getValidAccessToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  }

  // Add tenant header if not skipped and available
  if (!skipTenant && tenantId) {
    headers['x-tenant-id'] = tenantId;
  }

  let requestConfig: RequestInit = {
    ...fetchConfig,
    headers,
  };

  // Run request interceptors
  for (const interceptor of requestInterceptors) {
    const result = await interceptor(url, requestConfig);
    url = result.url;
    requestConfig = result.config;
  }

  // Retry logic
  let lastError: Error | null = null;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...requestConfig,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Run response interceptors
      let processedResponse = response;
      for (const interceptor of responseInterceptors) {
        processedResponse = await interceptor(processedResponse);
      }

      // Handle non-2xx responses
      if (!processedResponse.ok) {
        let errorData: unknown;
        try {
          errorData = await processedResponse.json();
        } catch {
          try {
            errorData = await processedResponse.text();
          } catch {
            errorData = undefined;
          }
        }

        const apiError = new ApiError(
          processedResponse.status,
          processedResponse.statusText,
          errorData,
          typeof errorData === 'object' && errorData && 'code' in errorData
            ? String((errorData as { code: unknown }).code)
            : undefined
        );

        // Run error interceptors
        for (const interceptor of errorInterceptors) {
          await interceptor(apiError);
        }

        // Retry if retryable
        if (apiError.isRetryable && attempt < retries) {
          const delay = getBackoffDelay(attempt);
          console.warn(
            `Request failed with ${processedResponse.status}, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
          );
          await sleep(delay);
          continue;
        }

        throw apiError;
      }

      // Handle empty responses
      if (processedResponse.status === 204) {
        return {} as T;
      }

      // Parse JSON response
      const data = await processedResponse.json();
      return data;
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry on abort/timeout
      if (lastError.name === 'AbortError') {
        throw new NetworkError('Request timeout', lastError);
      }

      // Retry on network errors
      if (attempt < retries) {
        const delay = getBackoffDelay(attempt);
        console.warn(
          `Network error, retrying in ${delay}ms (attempt ${attempt + 1}/${retries})`
        );
        await sleep(delay);
        continue;
      }
    }
  }

  throw new NetworkError('Network request failed after retries', lastError ?? undefined);
}

// ============================================
// API Client Factory
// ============================================

export interface ApiClientInstance {
  get: <T>(endpoint: string, config?: RequestConfig) => Promise<T>;
  post: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  put: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  patch: <T>(endpoint: string, data?: unknown, config?: RequestConfig) => Promise<T>;
  delete: <T>(endpoint: string, config?: RequestConfig) => Promise<T>;
}

export function createApiClient(defaultTenantId?: string): ApiClientInstance {
  const getTenantId = (config?: RequestConfig): string | undefined => {
    return config?.tenantId ?? defaultTenantId;
  };

  return {
    get: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'GET',
        tenantId: getTenantId(config),
      }),

    post: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'POST',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    put: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'PUT',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    patch: <T>(
      endpoint: string,
      data?: unknown,
      config?: RequestConfig
    ): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'PATCH',
        body: data ? JSON.stringify(data) : undefined,
        tenantId: getTenantId(config),
      } as RequestConfig & { body?: string }),

    delete: <T>(endpoint: string, config?: RequestConfig): Promise<T> =>
      fetchWithInterceptors<T>(endpoint, {
        ...config,
        method: 'DELETE',
        tenantId: getTenantId(config),
      }),
  };
}

// ============================================
// Default Client Instance
// ============================================

export const apiClient = createApiClient();

// ============================================
// Query Keys Factory
// ============================================

export const queryKeys = {
  // Auth
  auth: {
    user: ['auth', 'user'] as const,
    tenants: ['auth', 'tenants'] as const,
    session: ['auth', 'session'] as const,
  },
  // Leads
  leads: {
    all: ['leads'] as const,
    lists: () => [...queryKeys.leads.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.leads.lists(), filters] as const,
    details: () => [...queryKeys.leads.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.leads.details(), id] as const,
    stats: () => [...queryKeys.leads.all, 'stats'] as const,
    activities: (id: string) =>
      [...queryKeys.leads.detail(id), 'activities'] as const,
  },
  // Opportunities
  opportunities: {
    all: ['opportunities'] as const,
    lists: () => [...queryKeys.opportunities.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.opportunities.lists(), filters] as const,
    details: () => [...queryKeys.opportunities.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.opportunities.details(), id] as const,
  },
  // Customers
  customers: {
    all: ['customers'] as const,
    lists: () => [...queryKeys.customers.all, 'list'] as const,
    list: (filters: Record<string, unknown>) =>
      [...queryKeys.customers.lists(), filters] as const,
    details: () => [...queryKeys.customers.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.customers.details(), id] as const,
  },
  // Pipelines
  pipelines: {
    all: ['pipelines'] as const,
    lists: () => [...queryKeys.pipelines.all, 'list'] as const,
    details: () => [...queryKeys.pipelines.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.pipelines.details(), id] as const,
    stages: (id: string) =>
      [...queryKeys.pipelines.detail(id), 'stages'] as const,
  },
  // Teams
  teams: {
    all: ['teams'] as const,
    lists: () => [...queryKeys.teams.all, 'list'] as const,
    details: () => [...queryKeys.teams.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.teams.details(), id] as const,
    members: (id: string) =>
      [...queryKeys.teams.detail(id), 'members'] as const,
  },
  // Users
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    current: () => [...queryKeys.users.all, 'current'] as const,
  },
  // Analytics
  analytics: {
    all: ['analytics'] as const,
    dashboard: () => [...queryKeys.analytics.all, 'dashboard'] as const,
    reports: () => [...queryKeys.analytics.all, 'reports'] as const,
    report: (id: string) => [...queryKeys.analytics.reports(), id] as const,
  },
} as const;

// ============================================
// Exports
// ============================================

export { API_BASE_URL };
