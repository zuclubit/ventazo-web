/**
 * @fileoverview Token Entities Index
 * @module ui-kit/domain/tokens/entities
 */

export { TokenCollection } from './TokenCollection';
export type {
  TokenFilter,
  TokenHierarchy,
  CollectionStats,
  ValidationError,
  ValidationWarning,
} from './TokenCollection';

// NOTE: ExportOptions and ValidationResult are NOT re-exported here to avoid
// ambiguity with domain/types and application/ports definitions.
// Import directly from './TokenCollection' if you need the collection-specific types.
