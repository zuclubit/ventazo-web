// ============================================
// In-Memory Audit Storage Adapter
// Phase 5: Regulatory & Compliance Layer
// ============================================

import type {
  AuditEntry,
  AuditQuery,
  RetentionPolicy,
  AuditEntryId,
} from '../../domain/specification/types';
import type { IAuditStoragePort } from './AuditTrailService';

/**
 * In-Memory Audit Storage
 *
 * This adapter stores audit entries in memory.
 * Suitable for testing, development, and short-lived processes.
 *
 * For production use, implement a persistent storage adapter
 * (e.g., PostgreSQL, MongoDB, S3, etc.).
 */
export class InMemoryAuditStorage implements IAuditStoragePort {
  private entries: AuditEntry[] = [];
  private readonly maxEntries: number;

  constructor(options?: { maxEntries?: number }) {
    this.maxEntries = options?.maxEntries ?? 10000;
  }

  // ============================================
  // Write Operations
  // ============================================

  async write(entry: AuditEntry): Promise<void> {
    this.entries.push(entry);

    // Enforce max entries limit (FIFO eviction)
    if (this.entries.length > this.maxEntries) {
      this.entries.shift();
    }
  }

  async writeBatch(entries: ReadonlyArray<AuditEntry>): Promise<void> {
    for (const entry of entries) {
      await this.write(entry);
    }
  }

  // ============================================
  // Read Operations
  // ============================================

  async getById(id: AuditEntryId): Promise<AuditEntry | null> {
    return this.entries.find(e => e.id === id) ?? null;
  }

  async query(query: AuditQuery): Promise<ReadonlyArray<AuditEntry>> {
    let filtered = [...this.entries];

    // Filter by date range (support both from/to and start/end)
    if (query.dateRange) {
      const fromStr = query.dateRange.from ?? query.dateRange.start;
      const toStr = query.dateRange.to ?? query.dateRange.end;

      if (fromStr && toStr) {
        const from = new Date(fromStr).getTime();
        const to = new Date(toStr).getTime();

        filtered = filtered.filter(e => {
          const timestamp = new Date(e.timestamp).getTime();
          return timestamp >= from && timestamp <= to;
        });
      }
    }

    // Filter by types (category or type field)
    if (query.types && query.types.length > 0) {
      filtered = filtered.filter(e => {
        const entryType = e.type ?? e.category;
        return entryType && query.types?.includes(entryType);
      });
    }

    // Filter by severity levels
    if (query.severityLevels && query.severityLevels.length > 0) {
      filtered = filtered.filter(e =>
        query.severityLevels?.includes(e.severity)
      );
    }

    // Filter by actor
    if (query.actorId) {
      filtered = filtered.filter(e => e.actor?.id === query.actorId);
    }

    // Filter by resource
    if (query.resourceId) {
      filtered = filtered.filter(e => e.resource?.id === query.resourceId);
    }

    // Filter by correlation ID
    if (query.correlationId) {
      filtered = filtered.filter(e => e.correlationId === query.correlationId);
    }

    // Full-text search in action and details
    if (query.searchText) {
      const searchLower = query.searchText.toLowerCase();
      filtered = filtered.filter(
        e =>
          (e.action?.toLowerCase().includes(searchLower) ?? false) ||
          JSON.stringify(e.details ?? {}).toLowerCase().includes(searchLower)
      );
    }

    // Sort by timestamp (most recent first by default)
    filtered.sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime();
      const timeB = new Date(b.timestamp).getTime();

      if (query.sortOrder === 'asc') {
        return timeA - timeB;
      }
      return timeB - timeA;
    });

    // Apply pagination (support both offset/limit and page/pageSize)
    const offset = query.pagination?.offset ??
      ((query.pagination?.page ?? 0) * (query.pagination?.pageSize ?? 100));
    const limit = query.pagination?.limit ?? query.pagination?.pageSize ?? 100;

    return filtered.slice(offset, offset + limit);
  }

  async count(query: Omit<AuditQuery, 'pagination'>): Promise<number> {
    const results = await this.query({ ...query, pagination: undefined });
    return results.length;
  }

  // ============================================
  // Maintenance Operations
  // ============================================

  async purge(retentionPolicy: RetentionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionPolicy.maxRetentionDays);

    const cutoffTime = cutoffDate.getTime();
    const originalCount = this.entries.length;

    this.entries = this.entries.filter(e => {
      const entryTime = new Date(e.timestamp).getTime();
      return entryTime >= cutoffTime;
    });

    return originalCount - this.entries.length;
  }

  async clear(): Promise<void> {
    this.entries = [];
  }

  // ============================================
  // Utility Methods
  // ============================================

  getEntryCount(): number {
    return this.entries.length;
  }

  getAllEntries(): ReadonlyArray<AuditEntry> {
    return [...this.entries];
  }

  getEntriesBySeverity(severity: string): ReadonlyArray<AuditEntry> {
    return this.entries.filter(e => e.severity === severity);
  }

  getEntriesByType(type: string): ReadonlyArray<AuditEntry> {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Export all entries as JSON
   */
  exportAsJSON(): string {
    return JSON.stringify(this.entries, null, 2);
  }

  /**
   * Import entries from JSON
   */
  importFromJSON(json: string): void {
    const imported = JSON.parse(json) as AuditEntry[];
    this.entries.push(...imported);
  }
}

// ============================================
// Factory Function
// ============================================

export function createInMemoryAuditStorage(options?: {
  maxEntries?: number;
}): InMemoryAuditStorage {
  return new InMemoryAuditStorage(options);
}
