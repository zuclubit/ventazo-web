/**
 * Authentication Module Exports
 */

export {
  UserRole,
  Permission,
  ROLE_PERMISSIONS,
  type JWTPayload,
  type AuthUser,
  type TenantMembership,
  type IAuthContext,
} from './types';

export { AuthContext, getPermissionsForRole, createAuthUser } from './auth-context';

export {
  AuthService,
  type UserProfile,
  type Tenant,
  type CreateUserRequest,
  type InviteUserRequest,
  type CreateTenantRequest,
  type UpdateMembershipRequest,
  type MembershipWithUser,
  type UserWithMemberships,
} from './auth.service';

export {
  InvitationService,
  InvitationStatus,
  type Invitation,
  type CreateInvitationRequest,
  type BulkInvitationRequest,
  type BulkInvitationResult,
  type InvitationWithTenant,
} from './invitation.service';

export {
  OnboardingService,
  type OnboardingStatus,
  type OnboardingStep,
  type UserOnboarding,
  type AuditLogEntry,
  type OnboardingAuditAction,
} from './onboarding.service';

export {
  OTPService,
  type OTPPurpose,
  type GenerateOTPRequest,
  type GenerateOTPResponse,
  type VerifyOTPRequest,
  type VerifyOTPResponse,
} from './otp.service';

export {
  TurnstileService,
  type TurnstileVerifyRequest,
  type TurnstileVerifyResponse,
} from './turnstile.service';
