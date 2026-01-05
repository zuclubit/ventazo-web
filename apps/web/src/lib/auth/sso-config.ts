/**
 * SSO Configuration for Zuclubit Smart CRM
 *
 * Centralized configuration for SSO authentication with zuclubit-sso
 *
 * Features:
 * - OIDC/OAuth2 configuration
 * - JWKS validation for RS256 tokens
 * - SSO-only mode (no legacy auth)
 */

/**
 * SSO Configuration
 */
export interface SSOConfig {
  issuerUrl: string;
  jwksUri: string;
  clientId: string;
  clientSecret: string;
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

  return {
    issuerUrl,
    jwksUri: process.env['SSO_JWKS_URI'] || `${issuerUrl}/.well-known/jwks.json`,
    clientId: process.env['SSO_CLIENT_ID'] || 'ventazo',
    clientSecret: process.env['SSO_CLIENT_SECRET'] || '',
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
