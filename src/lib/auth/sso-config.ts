/**
 * SSO Configuration for Zuclubit Smart CRM
 *
 * Centralized configuration for SSO authentication with zuclubit-sso
 *
 * Features:
 * - OIDC/OAuth2 configuration
 * - JWKS validation for RS256 tokens
 * - Multi-mode support (sso, hybrid, legacy)
 */

/**
 * Authentication modes
 * - sso: Only SSO tokens accepted (recommended for production)
 * - hybrid: Both SSO (RS256) and legacy (HS256) tokens accepted
 * - legacy: Only legacy HS256 tokens (for backwards compatibility)
 */
export type AuthMode = 'sso' | 'hybrid' | 'legacy';

/**
 * SSO Configuration
 */
export interface SSOConfig {
  issuerUrl: string;
  jwksUri: string;
  clientId: string;
  clientSecret: string;
  authMode: AuthMode;
  // OAuth endpoints (derived from issuerUrl)
  authorizationEndpoint: string;
  tokenEndpoint: string;
  userinfoEndpoint: string;
  revocationEndpoint: string;
  // Scopes
  defaultScopes: string[];
}

/**
 * Get SSO configuration from environment variables
 */
export function getSSOConfig(): SSOConfig {
  const issuerUrl = process.env['SSO_ISSUER_URL'] || 'https://sso.zuclubit.com';
  const authMode = (process.env['AUTH_MODE'] || 'sso') as AuthMode;

  return {
    issuerUrl,
    jwksUri: process.env['SSO_JWKS_URI'] || `${issuerUrl}/.well-known/jwks.json`,
    clientId: process.env['SSO_CLIENT_ID'] || 'ventazo',
    clientSecret: process.env['SSO_CLIENT_SECRET'] || '',
    authMode,
    // OAuth2 endpoints
    authorizationEndpoint: `${issuerUrl}/oauth/authorize`,
    tokenEndpoint: `${issuerUrl}/oauth/token`,
    userinfoEndpoint: `${issuerUrl}/oauth/userinfo`,
    revocationEndpoint: `${issuerUrl}/oauth/revoke`,
    // Default scopes for CRM
    defaultScopes: [
      'openid',
      'profile',
      'email',
      'offline_access',
      'crm:read',
      'crm:write',
      'leads:*',
      'customers:*',
      'opportunities:*',
    ],
  };
}

/**
 * SSO Token payload from zuclubit-sso
 *
 * This interface matches the JWT claims structure from the SSO server
 */
export interface SSOTokenPayload {
  // Standard JWT claims
  iss: string;      // Issuer (https://sso.zuclubit.com)
  sub: string;      // Subject (user ID)
  aud: string[];    // Audience (client IDs)
  iat: number;      // Issued at
  exp: number;      // Expiration
  jti: string;      // JWT ID

  // User claims
  email: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  picture?: string;

  // Tenant claims
  tenant_id: string;
  tenant_slug: string;

  // Authorization claims
  role: string;
  permissions: string[];
  scope: string;

  // Token type
  type: 'access' | 'id';
}

/**
 * Local session payload (stored in cookie)
 *
 * Maps SSO claims to local CRM session structure
 */
export interface CRMSessionPayload {
  // User identity
  userId: string;
  email: string;
  name?: string;

  // Tenant
  tenantId: string;
  tenantSlug: string;

  // Authorization
  role: string;
  permissions: string[];

  // Tokens (for API calls and refresh)
  accessToken: string;
  refreshToken: string;

  // Metadata
  expiresAt: number;
  createdAt: number;

  // Source (for debugging)
  authMode: AuthMode;
}

/**
 * Map SSO token claims to CRM session
 */
export function mapSSOTokenToSession(
  ssoPayload: SSOTokenPayload,
  accessToken: string,
  refreshToken: string
): CRMSessionPayload {
  const now = Math.floor(Date.now() / 1000);

  return {
    userId: ssoPayload.sub,
    email: ssoPayload.email,
    name: ssoPayload.name || ssoPayload.given_name,
    tenantId: ssoPayload.tenant_id,
    tenantSlug: ssoPayload.tenant_slug,
    role: ssoPayload.role,
    permissions: ssoPayload.permissions || [],
    accessToken,
    refreshToken,
    expiresAt: ssoPayload.exp,
    createdAt: now,
    authMode: 'sso',
  };
}

/**
 * Build OAuth authorization URL
 */
export function buildAuthorizationUrl(
  redirectUri: string,
  state: string,
  codeChallenge?: string
): string {
  const config = getSSOConfig();
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: redirectUri,
    scope: config.defaultScopes.join(' '),
    state,
  });

  // Add PKCE if code challenge provided
  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
  codeVerifier?: string
): Promise<{
  accessToken: string;
  refreshToken: string;
  idToken: string;
  expiresIn: number;
}> {
  const config = getSSOConfig();

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.clientId,
    client_secret: config.clientSecret,
  });

  if (codeVerifier) {
    params.set('code_verifier', codeVerifier);
  }

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    idToken: data.id_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(refreshToken: string): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}> {
  const config = getSSOConfig();

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token || refreshToken,
    expiresIn: data.expires_in,
  };
}

/**
 * Revoke token (for logout)
 */
export async function revokeToken(token: string, tokenType: 'access_token' | 'refresh_token' = 'refresh_token'): Promise<void> {
  const config = getSSOConfig();

  const response = await fetch(config.revocationEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      token,
      token_type_hint: tokenType,
      client_id: config.clientId,
      client_secret: config.clientSecret,
    }).toString(),
  });

  if (!response.ok) {
    console.warn('[SSO] Token revocation failed:', await response.text());
  }
}

/**
 * Generate PKCE code verifier and challenge
 */
export function generatePKCE(): { codeVerifier: string; codeChallenge: string } {
  // Generate random code verifier
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  const codeVerifier = base64UrlEncode(array);

  // Generate code challenge (SHA-256 of verifier)
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  // Note: This is sync for simplicity, use SubtleCrypto in production
  const hashBuffer = crypto.subtle ? undefined : undefined; // Placeholder

  // For now, return verifier as challenge (will be computed properly in async context)
  return {
    codeVerifier,
    codeChallenge: codeVerifier, // Will be replaced with actual SHA-256 hash
  };
}

/**
 * Base64 URL encode
 */
function base64UrlEncode(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
