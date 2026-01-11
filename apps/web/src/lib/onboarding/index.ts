// ============================================
// Onboarding Module Exports - FASE 3
// ============================================

// Types
export * from './types';

// Service (SSO-only - no signupUser, auth handled via /api/auth/callback/zuclubit-sso)
export {
  getOnboardingStatus,
  updateOnboardingProgress,
  createTenant,
  getTenantSettings,
  updateTenantBranding,
  updateTenantModules,
  updateBusinessHours,
  // Invitation functions (via Backend API)
  sendInvitations,
  getPendingInvitations,
  cancelInvitation,
  acceptInvitation,
  getInvitationByToken,
  resendInvitation,
  getMyInvitations,
  // Tenant functions
  getUserTenants,
  // Audit functions
  logAuditEvent,
  logUserSignup,
  logOnboardingCompleted,
  type OnboardingAuditAction,
} from './onboarding-service';
