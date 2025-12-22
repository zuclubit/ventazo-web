import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { SearchService } from './search.service';
import { SearchEntityType } from './types';
import { LeadStatusEnum } from '../../domain/value-objects';

// Mock DatabasePool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
};

describe('SearchService', () => {
  let searchService: SearchService;

  beforeEach(() => {
    vi.clearAllMocks();
    searchService = new SearchService(mockPool as any);
  });

  describe('search', () => {
    it('should perform full-text search across leads', async () => {
      // Mock count query for leads
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ total: '2' }] })
      );

      // Mock data query for leads
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'lead-1',
              company_name: 'Acme Corp',
              email: 'contact@acme.com',
              phone: '+1234567890',
              status: LeadStatusEnum.NEW,
              score: 75,
              source: 'website',
              industry: 'Technology',
              owner_id: 'user-1',
              created_at: new Date().toISOString(),
              relevance_score: '0.95',
            },
            {
              id: 'lead-2',
              company_name: 'Tech Corp',
              email: 'info@tech.com',
              phone: null,
              status: LeadStatusEnum.QUALIFIED,
              score: 85,
              source: 'referral',
              industry: 'Software',
              owner_id: 'user-2',
              created_at: new Date().toISOString(),
              relevance_score: '0.80',
            },
          ],
        })
      );

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Acme',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
      });

      expect(result.isSuccess).toBe(true);
      const searchResults = result.getValue();
      expect(searchResults.items.length).toBe(2);
      expect(searchResults.total).toBe(2);
      expect(searchResults.query).toBe('Acme');
    });

    it('should search across all entity types when ALL is specified', async () => {
      // Mock leads count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));
      // Mock leads data
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'lead-1',
              company_name: 'Acme Corp',
              email: 'contact@acme.com',
              phone: null,
              status: LeadStatusEnum.NEW,
              score: 75,
              source: 'website',
              industry: null,
              owner_id: null,
              created_at: new Date().toISOString(),
              relevance_score: '0.9',
            },
          ],
        })
      );

      // Mock contacts count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));
      // Mock contacts data
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'contact-1',
              lead_id: 'lead-1',
              first_name: 'John',
              last_name: 'Doe',
              email: 'john@acme.com',
              phone: null,
              job_title: 'CTO',
              department: 'Engineering',
              is_primary: true,
              created_at: new Date().toISOString(),
              relevance_score: '0.85',
            },
          ],
        })
      );

      // Mock communications count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '0' }] }));
      // Mock communications data
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      // Mock facets queries
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ status: LeadStatusEnum.NEW, count: '1' }] })
      );
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ source: 'website', count: '1' }] })
      );
      mockQuery.mockResolvedValueOnce(
        Result.ok({ rows: [{ industry: 'Technology', count: '1' }] })
      );

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Acme',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.ALL],
      });

      expect(result.isSuccess).toBe(true);
      const searchResults = result.getValue();
      expect(searchResults.items.length).toBe(2);
      expect(searchResults.total).toBe(2);
      expect(searchResults.facets).toBeDefined();
    });

    it('should apply filters to search', async () => {
      // Mock count query
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));

      // Mock data query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'lead-1',
              company_name: 'Acme Corp',
              email: 'contact@acme.com',
              phone: null,
              status: LeadStatusEnum.QUALIFIED,
              score: 80,
              source: 'website',
              industry: null,
              owner_id: 'user-1',
              created_at: new Date().toISOString(),
              relevance_score: '0.9',
            },
          ],
        })
      );

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Acme',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
        status: [LeadStatusEnum.QUALIFIED],
        minScore: 70,
        ownerId: 'user-1',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.getValue().items.length).toBe(1);
      expect(result.getValue().items[0]).toHaveProperty('status', LeadStatusEnum.QUALIFIED);
    });

    it('should handle fuzzy search', async () => {
      // Mock count query
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));

      // Mock data query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'lead-1',
              company_name: 'Acme Corporation',
              email: 'contact@acme.com',
              phone: null,
              status: LeadStatusEnum.NEW,
              score: 75,
              source: 'website',
              industry: null,
              owner_id: null,
              created_at: new Date().toISOString(),
              relevance_score: '0.7',
            },
          ],
        })
      );

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Acm',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
        fuzzy: true,
      });

      expect(result.isSuccess).toBe(true);
      // With fuzzy search, partial matches should work
      expect(result.getValue().items.length).toBe(1);
    });

    it('should return empty results when count query fails', async () => {
      // When the count query returns a failure, searchLeads returns Result.fail
      // but the outer search method continues and returns partial results
      mockQuery.mockResolvedValueOnce(Result.fail('Database connection failed'));

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'test',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
      });

      // The search continues even if one entity type fails
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().total).toBe(0);
    });

    it('should handle searchLeads internal error gracefully', async () => {
      // When searchLeads throws internally, it catches and returns Result.fail
      // The outer search method checks isSuccess and skips failed results
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'test',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
      });

      // Search continues, just with 0 results from leads
      expect(result.isSuccess).toBe(true);
      expect(result.getValue().items).toHaveLength(0);
    });

    it('should paginate results correctly', async () => {
      // Mock count query
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '50' }] }));

      // Mock data query with 10 items for page 2
      const items = Array.from({ length: 10 }, (_, i) => ({
        id: `lead-${i + 10}`,
        company_name: `Company ${i + 10}`,
        email: `company${i + 10}@test.com`,
        phone: null,
        status: LeadStatusEnum.NEW,
        score: 50,
        source: 'website',
        industry: null,
        owner_id: null,
        created_at: new Date().toISOString(),
        relevance_score: '0.5',
      }));

      mockQuery.mockResolvedValueOnce(Result.ok({ rows: items }));

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Company',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
        page: 2,
        limit: 10,
      });

      expect(result.isSuccess).toBe(true);
      const searchResults = result.getValue();
      expect(searchResults.page).toBe(2);
      expect(searchResults.limit).toBe(10);
      expect(searchResults.totalPages).toBe(5);
    });
  });

  describe('getAutocompleteSuggestions', () => {
    it('should return autocomplete suggestions for leads', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { id: 'lead-1', company_name: 'Acme Corp', email: 'contact@acme.com' },
            { id: 'lead-2', company_name: 'Acme Industries', email: 'info@acme-ind.com' },
          ],
        })
      );

      const result = await searchService.getAutocompleteSuggestions(
        'tenant-123',
        'Acme',
        [SearchEntityType.LEAD],
        5
      );

      expect(result.isSuccess).toBe(true);
      const suggestions = result.getValue();
      expect(suggestions.length).toBe(2);
      expect(suggestions[0].text).toBe('Acme Corp');
      expect(suggestions[0].type).toBe(SearchEntityType.LEAD);
    });

    it('should return empty array for short queries', async () => {
      const result = await searchService.getAutocompleteSuggestions(
        'tenant-123',
        'A',
        undefined,
        5
      );

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual([]);
    });

    it('should include contacts in suggestions when ALL', async () => {
      // Mock leads query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [{ id: 'lead-1', company_name: 'Acme Corp', email: 'contact@acme.com' }],
        })
      );

      // Mock contacts query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'contact-1',
              first_name: 'John',
              last_name: 'Ackerman',
              email: 'john@acme.com',
              job_title: 'CEO',
            },
          ],
        })
      );

      const result = await searchService.getAutocompleteSuggestions(
        'tenant-123',
        'Ac',
        [SearchEntityType.ALL],
        10
      );

      expect(result.isSuccess).toBe(true);
      const suggestions = result.getValue();
      expect(suggestions.length).toBe(2);
      expect(suggestions.some((s) => s.type === SearchEntityType.LEAD)).toBe(true);
      expect(suggestions.some((s) => s.type === SearchEntityType.CONTACT)).toBe(true);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const result = await searchService.getAutocompleteSuggestions(
        'tenant-123',
        'test',
        undefined,
        5
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Autocomplete failed');
    });
  });

  describe('getRecentSearches', () => {
    it('should return recent searches for user', async () => {
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'search-1',
              query: 'Acme',
              entity_types: [SearchEntityType.ALL],
              result_count: 5,
              searched_at: new Date().toISOString(),
            },
            {
              id: 'search-2',
              query: 'Technology',
              entity_types: [SearchEntityType.LEAD],
              result_count: 10,
              searched_at: new Date().toISOString(),
            },
          ],
        })
      );

      const result = await searchService.getRecentSearches('tenant-123', 'user-1', 10);

      expect(result.isSuccess).toBe(true);
      const searches = result.getValue();
      expect(searches.length).toBe(2);
      expect(searches[0].query).toBe('Acme');
    });

    it('should return empty array on error', async () => {
      mockQuery.mockResolvedValueOnce(Result.fail('Table not found'));

      const result = await searchService.getRecentSearches('tenant-123', 'user-1', 10);

      expect(result.isSuccess).toBe(true);
      expect(result.getValue()).toEqual([]);
    });
  });

  describe('saveSearch', () => {
    it('should save a search successfully', async () => {
      const now = new Date();
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'saved-1',
              name: 'My Saved Search',
              options: JSON.stringify({ query: 'Acme', tenantId: 'tenant-123' }),
              is_public: false,
              created_at: now.toISOString(),
              updated_at: now.toISOString(),
            },
          ],
        })
      );

      const result = await searchService.saveSearch(
        'tenant-123',
        'user-1',
        'My Saved Search',
        { query: 'Acme', tenantId: 'tenant-123' },
        false
      );

      expect(result.isSuccess).toBe(true);
      const saved = result.getValue();
      expect(saved.name).toBe('My Saved Search');
      expect(saved.isPublic).toBe(false);
    });

    it('should fail when database returns error', async () => {
      mockQuery.mockResolvedValueOnce(Result.fail('Insert failed'));

      const result = await searchService.saveSearch(
        'tenant-123',
        'user-1',
        'My Search',
        { query: 'test', tenantId: 'tenant-123' },
        false
      );

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to save search');
    });
  });

  describe('getIndexStatus', () => {
    it('should return index status for all entity types', async () => {
      // Mock leads count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ count: '100' }] }));
      // Mock contacts count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ count: '250' }] }));
      // Mock communications count
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ count: '500' }] }));

      const result = await searchService.getIndexStatus('tenant-123');

      expect(result.isSuccess).toBe(true);
      const status = result.getValue();
      expect(status.leadsIndexed).toBe(100);
      expect(status.contactsIndexed).toBe(250);
      expect(status.communicationsIndexed).toBe(500);
      expect(status.indexHealthy).toBe(true);
    });

    it('should return 0 counts on query failures', async () => {
      // Mock all queries to fail
      mockQuery.mockResolvedValueOnce(Result.fail('Query failed'));
      mockQuery.mockResolvedValueOnce(Result.fail('Query failed'));
      mockQuery.mockResolvedValueOnce(Result.fail('Query failed'));

      const result = await searchService.getIndexStatus('tenant-123');

      expect(result.isSuccess).toBe(true);
      const status = result.getValue();
      expect(status.leadsIndexed).toBe(0);
      expect(status.contactsIndexed).toBe(0);
      expect(status.communicationsIndexed).toBe(0);
    });

    it('should handle database errors', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Connection lost'));

      const result = await searchService.getIndexStatus('tenant-123');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Failed to get index status');
    });
  });

  describe('search with date filters', () => {
    it('should filter by date range', async () => {
      const dateFrom = new Date('2024-01-01');
      const dateTo = new Date('2024-12-31');

      // Mock count query
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [{ total: '1' }] }));

      // Mock data query
      mockQuery.mockResolvedValueOnce(
        Result.ok({
          rows: [
            {
              id: 'lead-1',
              company_name: 'Acme Corp',
              email: 'contact@acme.com',
              phone: null,
              status: LeadStatusEnum.NEW,
              score: 75,
              source: 'website',
              industry: null,
              owner_id: null,
              created_at: new Date('2024-06-15').toISOString(),
              relevance_score: '0.9',
            },
          ],
        })
      );

      // Mock search history log
      mockQuery.mockResolvedValueOnce(Result.ok({ rows: [] }));

      const result = await searchService.search({
        query: 'Acme',
        tenantId: 'tenant-123',
        entityTypes: [SearchEntityType.LEAD],
        dateFrom,
        dateTo,
      });

      expect(result.isSuccess).toBe(true);
      // Verify date filters were applied
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('created_at'),
        expect.arrayContaining([dateFrom])
      );
    });
  });
});
