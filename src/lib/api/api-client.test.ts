// ============================================
// API Client Tests - FASE 5.11
// Unit tests for API client
// ============================================

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import {
  ApiError,
  NetworkError,
  ValidationError,
  createApiClient,
  queryKeys,
} from './api-client';

// Mock token manager
vi.mock('@/lib/auth/token-manager', () => ({
  getValidAccessToken: vi.fn(() => Promise.resolve('mock-token')),
  clearTokens: vi.fn(),
}));

describe('ApiError', () => {
  it('creates error with status and message', () => {
    const error = new ApiError(404, 'Not Found');
    expect(error.status).toBe(404);
    expect(error.statusText).toBe('Not Found');
    expect(error.message).toBe('API Error: 404 Not Found');
  });

  it('extracts message from data object', () => {
    const error = new ApiError(400, 'Bad Request', { message: 'Custom error message' });
    expect(error.message).toBe('Custom error message');
  });

  it('identifies unauthorized errors', () => {
    const error = new ApiError(401, 'Unauthorized');
    expect(error.isUnauthorized).toBe(true);
    expect(error.isForbidden).toBe(false);
  });

  it('identifies forbidden errors', () => {
    const error = new ApiError(403, 'Forbidden');
    expect(error.isForbidden).toBe(true);
    expect(error.isUnauthorized).toBe(false);
  });

  it('identifies not found errors', () => {
    const error = new ApiError(404, 'Not Found');
    expect(error.isNotFound).toBe(true);
  });

  it('identifies validation errors', () => {
    expect(new ApiError(400, 'Bad Request').isValidationError).toBe(true);
    expect(new ApiError(422, 'Unprocessable Entity').isValidationError).toBe(true);
  });

  it('identifies server errors', () => {
    expect(new ApiError(500, 'Internal Server Error').isServerError).toBe(true);
    expect(new ApiError(502, 'Bad Gateway').isServerError).toBe(true);
    expect(new ApiError(503, 'Service Unavailable').isServerError).toBe(true);
  });

  it('identifies retryable errors', () => {
    expect(new ApiError(408, 'Request Timeout').isRetryable).toBe(true);
    expect(new ApiError(500, 'Internal Server Error').isRetryable).toBe(true);
    expect(new ApiError(502, 'Bad Gateway').isRetryable).toBe(true);
    expect(new ApiError(503, 'Service Unavailable').isRetryable).toBe(true);
    expect(new ApiError(504, 'Gateway Timeout').isRetryable).toBe(true);
    expect(new ApiError(404, 'Not Found').isRetryable).toBe(false);
  });

  it('stores error code', () => {
    const error = new ApiError(400, 'Bad Request', { code: 'VALIDATION_ERROR' }, 'VALIDATION_ERROR');
    expect(error.code).toBe('VALIDATION_ERROR');
  });
});

describe('NetworkError', () => {
  it('creates error with message', () => {
    const error = new NetworkError('Network request failed');
    expect(error.message).toBe('Network request failed');
    expect(error.name).toBe('NetworkError');
  });

  it('stores original error', () => {
    const originalError = new Error('Connection refused');
    const error = new NetworkError('Network request failed', originalError);
    expect(error.originalError).toBe(originalError);
  });
});

describe('ValidationError', () => {
  it('creates error with zod errors', () => {
    const mockZodError = { issues: [] } as any;
    const error = new ValidationError('Validation failed', mockZodError);
    expect(error.message).toBe('Validation failed');
    expect(error.name).toBe('ValidationError');
    expect(error.errors).toBe(mockZodError);
  });
});

describe('createApiClient', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it('creates client with all HTTP methods', () => {
    const client = createApiClient();
    expect(typeof client.get).toBe('function');
    expect(typeof client.post).toBe('function');
    expect(typeof client.put).toBe('function');
    expect(typeof client.patch).toBe('function');
    expect(typeof client.delete).toBe('function');
  });

  it('makes GET request with correct headers', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: 'test' }),
    });

    const client = createApiClient();
    await client.get('/api/test');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
          Accept: 'application/json',
        }),
      })
    );
  });

  it('makes POST request with body', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ id: '123' }),
    });

    const client = createApiClient();
    await client.post('/api/test', { name: 'Test' });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/test'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ name: 'Test' }),
      })
    );
  });

  it('includes tenant ID header when provided', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const client = createApiClient('tenant-123');
    await client.get('/api/test');

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-tenant-id': 'tenant-123',
        }),
      })
    );
  });

  it('skips auth header when specified', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({}),
    });

    const client = createApiClient();
    await client.get('/api/test', { skipAuth: true });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.any(String),
        }),
      })
    );
  });

  it('handles 204 No Content response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 204,
    });

    const client = createApiClient();
    const result = await client.delete('/api/test/123');

    expect(result).toEqual({});
  });

  it('throws ApiError on non-2xx response', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: async () => ({ message: 'Resource not found' }),
    });

    const client = createApiClient();

    await expect(client.get('/api/test/123')).rejects.toThrow(ApiError);
  });

  it('builds URL with query parameters', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    const client = createApiClient();
    await client.get('/api/test', {
      params: { page: 1, limit: 10, search: 'test' },
    });

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('page=1'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('limit=10'),
      expect.any(Object)
    );
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('search=test'),
      expect.any(Object)
    );
  });

  it('filters undefined params', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ data: [] }),
    });

    const client = createApiClient();
    await client.get('/api/test', {
      params: { page: 1, filter: undefined },
    });

    const calledUrl = fetchMock.mock.calls[0]?.[0] as string | undefined;
    expect(calledUrl).toContain('page=1');
    expect(calledUrl).not.toContain('filter');
  });
});

describe('queryKeys', () => {
  describe('auth keys', () => {
    it('generates correct user key', () => {
      expect(queryKeys.auth.user).toEqual(['auth', 'user']);
    });

    it('generates correct tenants key', () => {
      expect(queryKeys.auth.tenants).toEqual(['auth', 'tenants']);
    });

    it('generates correct session key', () => {
      expect(queryKeys.auth.session).toEqual(['auth', 'session']);
    });
  });

  describe('leads keys', () => {
    it('generates correct all key', () => {
      expect(queryKeys.leads.all).toEqual(['leads']);
    });

    it('generates correct lists key', () => {
      expect(queryKeys.leads.lists()).toEqual(['leads', 'list']);
    });

    it('generates correct list key with filters', () => {
      const filters = { status: 'new', page: 1 };
      expect(queryKeys.leads.list(filters)).toEqual(['leads', 'list', filters]);
    });

    it('generates correct detail key', () => {
      expect(queryKeys.leads.detail('lead-123')).toEqual(['leads', 'detail', 'lead-123']);
    });

    it('generates correct stats key', () => {
      expect(queryKeys.leads.stats()).toEqual(['leads', 'stats']);
    });

    it('generates correct activities key', () => {
      expect(queryKeys.leads.activities('lead-123')).toEqual([
        'leads',
        'detail',
        'lead-123',
        'activities',
      ]);
    });
  });

  describe('opportunities keys', () => {
    it('generates correct all key', () => {
      expect(queryKeys.opportunities.all).toEqual(['opportunities']);
    });

    it('generates correct detail key', () => {
      expect(queryKeys.opportunities.detail('opp-123')).toEqual([
        'opportunities',
        'detail',
        'opp-123',
      ]);
    });
  });

  describe('customers keys', () => {
    it('generates correct all key', () => {
      expect(queryKeys.customers.all).toEqual(['customers']);
    });

    it('generates correct detail key', () => {
      expect(queryKeys.customers.detail('cust-123')).toEqual([
        'customers',
        'detail',
        'cust-123',
      ]);
    });
  });

  describe('teams keys', () => {
    it('generates correct all key', () => {
      expect(queryKeys.teams.all).toEqual(['teams']);
    });

    it('generates correct members key', () => {
      expect(queryKeys.teams.members('team-123')).toEqual([
        'teams',
        'detail',
        'team-123',
        'members',
      ]);
    });
  });

  describe('analytics keys', () => {
    it('generates correct dashboard key', () => {
      expect(queryKeys.analytics.dashboard()).toEqual(['analytics', 'dashboard']);
    });

    it('generates correct report key', () => {
      expect(queryKeys.analytics.report('report-123')).toEqual([
        'analytics',
        'reports',
        'report-123',
      ]);
    });
  });
});
