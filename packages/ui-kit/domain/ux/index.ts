/**
 * @fileoverview UX Domain Module
 *
 * Expone los conceptos de experiencia de usuario del sistema.
 * Define estados, roles, intenciones y decisiones de UX.
 *
 * @module ui-kit/domain/ux
 */

// Value Objects
export * from './value-objects';

// Entities
export * from './entities';

// Principal re-exports
export { UIState, UIStateMachine } from './value-objects/UIState';
export { UIRole, RolePair } from './value-objects/UIRole';
export { ComponentIntent } from './value-objects/ComponentIntent';
export { UXDecision } from './entities/UXDecision';
