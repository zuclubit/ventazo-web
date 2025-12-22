/**
 * Advanced Permissions Module
 *
 * Exports for permission management:
 * - Permission service (RBAC + ABAC + Field/Record Level)
 * - Permission routes
 * - Permission types
 */

export * from './types';
export { PermissionService } from './permission.service';
export { permissionRoutes } from './permission.routes';
