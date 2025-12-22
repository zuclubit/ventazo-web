import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  SearchOptions,
  SearchResults,
  SearchResultItem,
  SearchEntityType,
  LeadSearchResult,
  ContactSearchResult,
  CommunicationSearchResult,
  AutocompleteSuggestion,
  SearchFacets,
  SearchIndexStatus,
  SavedSearch,
  RecentSearch,
} from './types';
import { LeadStatusEnum } from '../../domain/value-objects';

/**
 * Search Service
 * Provides full-text search capabilities using PostgreSQL's native search
 */
@injectable()
export class SearchService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Perform full-text search across entities
   */
  async search(options: SearchOptions): Promise<Result<SearchResults>> {
    const startTime = Date.now();

    try {
      const page = options.page || 1;
      const limit = Math.min(options.limit || 20, 100);
      const offset = (page - 1) * limit;
      const entityTypes = options.entityTypes || [SearchEntityType.ALL];
      const searchAll = entityTypes.includes(SearchEntityType.ALL);

      // Normalize the search query
      const normalizedQuery = this.normalizeSearchQuery(options.query, options.fuzzy);

      const results: SearchResultItem[] = [];
      let totalCount = 0;

      // Search leads
      if (searchAll || entityTypes.includes(SearchEntityType.LEAD)) {
        const leadsResult = await this.searchLeads(options, normalizedQuery, limit, offset);
        if (leadsResult.isSuccess) {
          results.push(...leadsResult.getValue().items);
          totalCount += leadsResult.getValue().total;
        }
      }

      // Search contacts
      if (searchAll || entityTypes.includes(SearchEntityType.CONTACT)) {
        const contactsResult = await this.searchContacts(options, normalizedQuery, limit, offset);
        if (contactsResult.isSuccess) {
          results.push(...contactsResult.getValue().items);
          totalCount += contactsResult.getValue().total;
        }
      }

      // Search communications
      if (searchAll || entityTypes.includes(SearchEntityType.COMMUNICATION)) {
        const commsResult = await this.searchCommunications(options, normalizedQuery, limit, offset);
        if (commsResult.isSuccess) {
          results.push(...commsResult.getValue().items);
          totalCount += commsResult.getValue().total;
        }
      }

      // Sort combined results by relevance
      if (options.sortBy === 'relevance' || !options.sortBy) {
        results.sort((a, b) => b.relevanceScore - a.relevanceScore);
      }

      // Apply pagination to combined results
      const paginatedResults = results.slice(0, limit);

      // Get facets if searching all
      let facets: SearchFacets | undefined;
      if (searchAll) {
        const facetsResult = await this.getFacets(options.tenantId, normalizedQuery);
        if (facetsResult.isSuccess) {
          facets = facetsResult.getValue();
        }
      }

      // Log recent search
      await this.logRecentSearch(options.tenantId, options.query, entityTypes, totalCount);

      const executionTimeMs = Date.now() - startTime;

      return Result.ok({
        items: paginatedResults,
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        query: options.query,
        executionTimeMs,
        facets,
      });
    } catch (error) {
      return Result.fail(`Search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Search leads
   */
  private async searchLeads(
    options: SearchOptions,
    tsQuery: string,
    limit: number,
    offset: number
  ): Promise<Result<{ items: LeadSearchResult[]; total: number }>> {
    try {
      let whereClause = `
        WHERE tenant_id = $1
        AND (
          to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(industry, '') || ' ' || COALESCE(notes, ''))
          @@ to_tsquery('english', $2)
          OR company_name ILIKE $3
          OR email ILIKE $3
          OR phone ILIKE $3
        )
      `;

      const values: unknown[] = [options.tenantId, tsQuery, `%${options.query}%`];
      let paramIndex = 4;

      // Apply filters
      if (options.status && options.status.length > 0) {
        whereClause += ` AND status = ANY($${paramIndex++})`;
        values.push(options.status);
      }

      if (options.ownerId) {
        whereClause += ` AND owner_id = $${paramIndex++}`;
        values.push(options.ownerId);
      }

      if (options.source && options.source.length > 0) {
        whereClause += ` AND source = ANY($${paramIndex++})`;
        values.push(options.source);
      }

      if (options.industry && options.industry.length > 0) {
        whereClause += ` AND industry = ANY($${paramIndex++})`;
        values.push(options.industry);
      }

      if (options.minScore !== undefined) {
        whereClause += ` AND score >= $${paramIndex++}`;
        values.push(options.minScore);
      }

      if (options.maxScore !== undefined) {
        whereClause += ` AND score <= $${paramIndex++}`;
        values.push(options.maxScore);
      }

      if (options.dateFrom) {
        whereClause += ` AND created_at >= $${paramIndex++}`;
        values.push(options.dateFrom);
      }

      if (options.dateTo) {
        whereClause += ` AND created_at <= $${paramIndex++}`;
        values.push(options.dateTo);
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM leads ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure) {
        return Result.fail(`Count query failed: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total as string, 10);

      // Get results with relevance score
      const dataQuery = `
        SELECT
          id, company_name, email, phone, status, score, source, industry, owner_id, created_at,
          ts_rank(
            to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(phone, '') || ' ' || COALESCE(industry, '') || ' ' || COALESCE(notes, '')),
            to_tsquery('english', $2)
          ) as relevance_score
        FROM leads
        ${whereClause}
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      if (dataResult.isFailure) {
        return Result.fail(`Data query failed: ${dataResult.error}`);
      }

      const items: LeadSearchResult[] = dataResult.getValue().rows.map((row: Record<string, unknown>) => ({
        type: 'lead' as const,
        id: row.id as string,
        companyName: row.company_name as string,
        email: row.email as string,
        phone: row.phone as string | null,
        status: row.status as LeadStatusEnum,
        score: row.score as number,
        source: row.source as string,
        industry: row.industry as string | null,
        ownerId: row.owner_id as string | null,
        createdAt: new Date(row.created_at as string),
        relevanceScore: parseFloat(row.relevance_score as string) || 0,
      }));

      return Result.ok({ items, total });
    } catch (error) {
      return Result.fail(`Lead search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Search contacts
   */
  private async searchContacts(
    options: SearchOptions,
    tsQuery: string,
    limit: number,
    offset: number
  ): Promise<Result<{ items: ContactSearchResult[]; total: number }>> {
    try {
      const whereClause = `
        WHERE tenant_id = $1
        AND (
          to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(job_title, '') || ' ' || COALESCE(department, ''))
          @@ to_tsquery('english', $2)
          OR first_name ILIKE $3
          OR last_name ILIKE $3
          OR email ILIKE $3
          OR job_title ILIKE $3
        )
      `;

      const values: unknown[] = [options.tenantId, tsQuery, `%${options.query}%`];

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM lead_contacts ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure) {
        return Result.fail(`Count query failed: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total as string, 10);

      // Get results
      const dataQuery = `
        SELECT
          id, lead_id, first_name, last_name, email, phone, job_title, department, is_primary, created_at,
          ts_rank(
            to_tsvector('english', COALESCE(first_name, '') || ' ' || COALESCE(last_name, '') || ' ' || COALESCE(email, '') || ' ' || COALESCE(job_title, '') || ' ' || COALESCE(department, '')),
            to_tsquery('english', $2)
          ) as relevance_score
        FROM lead_contacts
        ${whereClause}
        ORDER BY relevance_score DESC, created_at DESC
        LIMIT $4 OFFSET $5
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      if (dataResult.isFailure) {
        return Result.fail(`Data query failed: ${dataResult.error}`);
      }

      const items: ContactSearchResult[] = dataResult.getValue().rows.map((row: Record<string, unknown>) => ({
        type: 'contact' as const,
        id: row.id as string,
        leadId: row.lead_id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        fullName: `${row.first_name} ${row.last_name}`,
        email: row.email as string,
        phone: row.phone as string | null,
        jobTitle: row.job_title as string | null,
        department: row.department as string | null,
        isPrimary: row.is_primary as boolean,
        createdAt: new Date(row.created_at as string),
        relevanceScore: parseFloat(row.relevance_score as string) || 0,
      }));

      return Result.ok({ items, total });
    } catch (error) {
      return Result.fail(`Contact search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Search communications
   */
  private async searchCommunications(
    options: SearchOptions,
    tsQuery: string,
    limit: number,
    offset: number
  ): Promise<Result<{ items: CommunicationSearchResult[]; total: number }>> {
    try {
      const whereClause = `
        WHERE tenant_id = $1
        AND (
          to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(body, '') || ' ' || COALESCE(summary, ''))
          @@ to_tsquery('english', $2)
          OR subject ILIKE $3
          OR body ILIKE $3
          OR summary ILIKE $3
        )
      `;

      const values: unknown[] = [options.tenantId, tsQuery, `%${options.query}%`];

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM lead_communications ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure) {
        return Result.fail(`Count query failed: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total as string, 10);

      // Get results
      const dataQuery = `
        SELECT
          id, lead_id, communication_type, direction, subject, summary, occurred_at, created_by,
          ts_rank(
            to_tsvector('english', COALESCE(subject, '') || ' ' || COALESCE(body, '') || ' ' || COALESCE(summary, '')),
            to_tsquery('english', $2)
          ) as relevance_score
        FROM lead_communications
        ${whereClause}
        ORDER BY relevance_score DESC, occurred_at DESC
        LIMIT $4 OFFSET $5
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      if (dataResult.isFailure) {
        return Result.fail(`Data query failed: ${dataResult.error}`);
      }

      const items: CommunicationSearchResult[] = dataResult.getValue().rows.map((row: Record<string, unknown>) => ({
        type: 'communication' as const,
        id: row.id as string,
        leadId: row.lead_id as string,
        communicationType: row.communication_type as string,
        direction: row.direction as string,
        subject: row.subject as string | null,
        summary: row.summary as string | null,
        occurredAt: new Date(row.occurred_at as string),
        createdBy: row.created_by as string,
        relevanceScore: parseFloat(row.relevance_score as string) || 0,
      }));

      return Result.ok({ items, total });
    } catch (error) {
      return Result.fail(`Communication search failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get autocomplete suggestions
   */
  async getAutocompleteSuggestions(
    tenantId: string,
    query: string,
    entityTypes?: SearchEntityType[],
    limit: number = 10
  ): Promise<Result<AutocompleteSuggestion[]>> {
    try {
      if (query.length < 2) {
        return Result.ok([]);
      }

      const suggestions: AutocompleteSuggestion[] = [];
      const searchAll = !entityTypes || entityTypes.includes(SearchEntityType.ALL);
      const searchPattern = `${query}%`;

      // Leads autocomplete
      if (searchAll || entityTypes?.includes(SearchEntityType.LEAD)) {
        const leadQuery = `
          SELECT id, company_name, email
          FROM leads
          WHERE tenant_id = $1
          AND (company_name ILIKE $2 OR email ILIKE $2)
          LIMIT $3
        `;

        const leadResult = await this.pool.query(leadQuery, [tenantId, searchPattern, limit]);

        if (leadResult.isSuccess) {
          for (const row of leadResult.getValue().rows) {
            suggestions.push({
              type: SearchEntityType.LEAD,
              id: row.id as string,
              text: row.company_name as string,
              subtitle: row.email as string,
              score: 1,
            });
          }
        }
      }

      // Contacts autocomplete
      if (searchAll || entityTypes?.includes(SearchEntityType.CONTACT)) {
        const contactQuery = `
          SELECT id, first_name, last_name, email, job_title
          FROM lead_contacts
          WHERE tenant_id = $1
          AND (
            first_name ILIKE $2 OR
            last_name ILIKE $2 OR
            email ILIKE $2
          )
          LIMIT $3
        `;

        const contactResult = await this.pool.query(contactQuery, [tenantId, searchPattern, limit]);

        if (contactResult.isSuccess) {
          for (const row of contactResult.getValue().rows) {
            suggestions.push({
              type: SearchEntityType.CONTACT,
              id: row.id as string,
              text: `${row.first_name} ${row.last_name}`,
              subtitle: row.job_title ? `${row.job_title} - ${row.email}` : row.email as string,
              score: 0.9,
            });
          }
        }
      }

      // Sort by score and limit
      suggestions.sort((a, b) => b.score - a.score);
      return Result.ok(suggestions.slice(0, limit));
    } catch (error) {
      return Result.fail(`Autocomplete failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get search facets
   */
  private async getFacets(tenantId: string, tsQuery: string): Promise<Result<SearchFacets>> {
    try {
      // Status facets
      const statusQuery = `
        SELECT status, COUNT(*) as count
        FROM leads
        WHERE tenant_id = $1
        AND (
          to_tsvector('english', COALESCE(company_name, '') || ' ' || COALESCE(email, ''))
          @@ to_tsquery('english', $2)
          OR company_name ILIKE '%' || $2 || '%'
        )
        GROUP BY status
      `;

      const statusResult = await this.pool.query(statusQuery, [tenantId, tsQuery.replace(/[&|!:*]/g, '')]);

      const statuses = statusResult.isSuccess
        ? statusResult.getValue().rows.map((row: Record<string, unknown>) => ({
            status: row.status as LeadStatusEnum,
            count: parseInt(row.count as string, 10),
          }))
        : [];

      // Source facets
      const sourceQuery = `
        SELECT source, COUNT(*) as count
        FROM leads
        WHERE tenant_id = $1
        GROUP BY source
        ORDER BY count DESC
        LIMIT 10
      `;

      const sourceResult = await this.pool.query(sourceQuery, [tenantId]);

      const sources = sourceResult.isSuccess
        ? sourceResult.getValue().rows.map((row: Record<string, unknown>) => ({
            source: row.source as string,
            count: parseInt(row.count as string, 10),
          }))
        : [];

      // Industry facets
      const industryQuery = `
        SELECT industry, COUNT(*) as count
        FROM leads
        WHERE tenant_id = $1 AND industry IS NOT NULL
        GROUP BY industry
        ORDER BY count DESC
        LIMIT 10
      `;

      const industryResult = await this.pool.query(industryQuery, [tenantId]);

      const industries = industryResult.isSuccess
        ? industryResult.getValue().rows.map((row: Record<string, unknown>) => ({
            industry: row.industry as string,
            count: parseInt(row.count as string, 10),
          }))
        : [];

      return Result.ok({
        entityTypes: [
          { type: SearchEntityType.LEAD, count: 0 },
          { type: SearchEntityType.CONTACT, count: 0 },
          { type: SearchEntityType.COMMUNICATION, count: 0 },
        ],
        statuses,
        sources,
        industries,
      });
    } catch (error) {
      return Result.fail(`Facets failed: ${(error as Error).message}`);
    }
  }

  /**
   * Get recent searches for a user
   */
  async getRecentSearches(
    tenantId: string,
    userId: string,
    limit: number = 10
  ): Promise<Result<RecentSearch[]>> {
    try {
      const query = `
        SELECT id, query, entity_types, result_count, searched_at
        FROM search_history
        WHERE tenant_id = $1 AND user_id = $2
        ORDER BY searched_at DESC
        LIMIT $3
      `;

      const result = await this.pool.query(query, [tenantId, userId, limit]);

      if (result.isFailure) {
        return Result.ok([]); // Return empty if table doesn't exist
      }

      const searches = result.getValue().rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        query: row.query as string,
        entityTypes: row.entity_types as SearchEntityType[],
        resultCount: row.result_count as number,
        searchedAt: new Date(row.searched_at as string),
      }));

      return Result.ok(searches);
    } catch {
      return Result.ok([]); // Return empty on any error
    }
  }

  /**
   * Save a search for later use
   */
  async saveSearch(
    tenantId: string,
    userId: string,
    name: string,
    options: SearchOptions,
    isPublic: boolean = false
  ): Promise<Result<SavedSearch>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      const query = `
        INSERT INTO saved_searches (id, tenant_id, user_id, name, options, is_public, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        userId,
        name,
        JSON.stringify(options),
        isPublic,
        now,
        now,
      ]);

      if (result.isFailure) {
        return Result.fail(`Failed to save search: ${result.error}`);
      }

      const row = result.getValue().rows[0];

      return Result.ok({
        id: row.id as string,
        name: row.name as string,
        options: JSON.parse(row.options as string),
        createdBy: userId,
        isPublic: row.is_public as boolean,
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
      });
    } catch (error) {
      return Result.fail(`Failed to save search: ${(error as Error).message}`);
    }
  }

  /**
   * Get index status
   */
  async getIndexStatus(tenantId: string): Promise<Result<SearchIndexStatus>> {
    try {
      const leadsQuery = `SELECT COUNT(*) as count FROM leads WHERE tenant_id = $1`;
      const contactsQuery = `SELECT COUNT(*) as count FROM lead_contacts WHERE tenant_id = $1`;
      const commsQuery = `SELECT COUNT(*) as count FROM lead_communications WHERE tenant_id = $1`;

      const [leadsResult, contactsResult, commsResult] = await Promise.all([
        this.pool.query(leadsQuery, [tenantId]),
        this.pool.query(contactsQuery, [tenantId]),
        this.pool.query(commsQuery, [tenantId]),
      ]);

      return Result.ok({
        leadsIndexed: leadsResult.isSuccess
          ? parseInt(leadsResult.getValue().rows[0].count as string, 10)
          : 0,
        contactsIndexed: contactsResult.isSuccess
          ? parseInt(contactsResult.getValue().rows[0].count as string, 10)
          : 0,
        communicationsIndexed: commsResult.isSuccess
          ? parseInt(commsResult.getValue().rows[0].count as string, 10)
          : 0,
        indexHealthy: true,
      });
    } catch (error) {
      return Result.fail(`Failed to get index status: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private normalizeSearchQuery(query: string, fuzzy?: boolean): string {
    // Remove special characters and split into terms
    const terms = query
      .replace(/[^\w\s@.-]/g, '')
      .trim()
      .split(/\s+/)
      .filter((term) => term.length > 0);

    if (terms.length === 0) {
      return '';
    }

    // Build PostgreSQL tsquery
    if (fuzzy) {
      // Use prefix matching for fuzzy search
      return terms.map((term) => `${term}:*`).join(' & ');
    }

    return terms.join(' & ');
  }

  private async logRecentSearch(
    tenantId: string,
    query: string,
    entityTypes: SearchEntityType[],
    resultCount: number
  ): Promise<void> {
    try {
      const logQuery = `
        INSERT INTO search_history (id, tenant_id, query, entity_types, result_count, searched_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT DO NOTHING
      `;

      await this.pool.query(logQuery, [
        crypto.randomUUID(),
        tenantId,
        query,
        entityTypes,
        resultCount,
      ]);
    } catch {
      // Silently fail - logging is not critical
    }
  }
}
