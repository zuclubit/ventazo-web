/**
 * @fileoverview UX Value Objects Index
 * @module ui-kit/domain/ux/value-objects
 */

export {
  UIState,
  UIStateMachine,
  UI_STATES,
  STATE_PRIORITY,
  STATE_TRANSITIONS,
} from './UIState';

export {
  UIRole,
  RolePair,
  UI_ROLES,
  ROLE_ACCESSIBILITY,
} from './UIRole';

export {
  ComponentIntent,
  COMPONENT_INTENTS,
  INTENT_CATEGORIES,
  INTENT_SEVERITY,
  INTENT_VARIANTS,
} from './ComponentIntent';
export type { IntentCategory, IntentInteractivity } from './ComponentIntent';
