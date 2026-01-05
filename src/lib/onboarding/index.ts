// ============================================
// Onboarding Module Exports - FASE 3
// ============================================

// Types
export * from './types';

// Service
export {
  signupUser,
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
