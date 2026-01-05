/**
 * Cards Module - Ventazo Design System 2025
 *
 * @description Unified card component system for CRM entities.
 *
 * @components
 * - BaseCard: Foundation card with variants and states
 * - EntityCard: Specialized card for CRM entities
 *
 * @utilities
 * - ScoreBadge, PriorityBadge, StatusBadge
 * - CARD_TOKENS, useCardStates
 * - CardActionButton, CardBadge, CardAvatar
 *
 * @version 1.0.0
 */

// Base Card
export {
  BaseCard,
  CardHeader,
  CardTitle,
  CardSubtitle,
  CardContent,
  CardFooter,
  CardRow,
  baseCardVariants,
  type BaseCardProps,
  type CardHeaderProps,
  type CardFooterProps,
  type CardRowProps,
} from './base-card';

// Entity Card
export {
  EntityCard,
  EntityCardSkeleton,
  ScoreBadge,
  PriorityBadge,
  StatusBadge,
  getInitials,
  formatCurrency,
  getScoreLevel,
  type EntityCardProps,
  type EntityCardSkeletonProps,
  type ScoreBadgeProps,
  type PriorityBadgeProps,
  type StatusBadgeProps,
} from './entity-card';

// Card Utilities
export {
  CARD_TOKENS,
  useCardStates,
  CardLoadingOverlay,
  CardActionButton,
  CardBadge,
  CardAvatar,
  getCardInteractiveClasses,
  formatCardValue,
  getScoreLevel as getScoreLevelUtil,
  SCORE_STYLES,
  type UseCardStatesProps,
  type UseCardStatesReturn,
  type CardActionButtonProps,
  type CardBadgeProps,
  type CardAvatarProps,
  type ScoreLevel,
} from './card-utilities';

// Card Interactions
export {
  useCardInteractions,
  INTERACTION_GUIDELINES,
  type UseCardInteractionsProps,
  type UseCardInteractionsReturn,
} from './use-card-interactions';
