import { DomainEvent } from './types';

/**
 * Base class for all Aggregate Roots
 * An aggregate is a cluster of domain objects that can be treated as a single unit
 */
export abstract class AggregateRoot {
  private domainEvents: DomainEvent[] = [];

  /**
   * Get all domain events that have been raised
   */
  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  /**
   * Add a domain event to be published
   */
  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  /**
   * Clear all domain events (called after publishing)
   */
  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  /**
   * Get the number of unpublished events
   */
  getUnpublishedEventCount(): number {
    return this.domainEvents.length;
  }

  /**
   * Check if aggregate has unpublished events
   */
  hasUnpublishedEvents(): boolean {
    return this.domainEvents.length > 0;
  }
}
