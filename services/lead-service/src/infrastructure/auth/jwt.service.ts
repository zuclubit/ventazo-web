/**
 * Native JWT Service
 * Handles JWT token generation and validation without Supabase dependency
 */

import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { getAuthConfig } from '../../config/environment';

// ============================================
// Types
// ============================================

export interface TokenPayload extends JWTPayload {
  sub: string;       // User ID
  email: string;
  tenantId?: string;
  role?: string;
  type: 'access' | 'refresh';
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;      // seconds
  expiresAt: number;      // Unix timestamp
}

export interface RefreshTokenData {
  userId: string;
  email: string;
  tokenId: string;
}

// ============================================
// Configuration
// ============================================

const ACCESS_TOKEN_EXPIRY = '1h';       // 1 hour
const REFRESH_TOKEN_EXPIRY = '7d';      // 7 days
const ACCESS_TOKEN_EXPIRY_SECONDS = 3600;
const REFRESH_TOKEN_EXPIRY_SECONDS = 604800;

// ============================================
// JWT Service
// ============================================

@injectable()
export class JwtService {
  private secretKey: Uint8Array;
  private issuer: string;

  constructor() {
    const config = getAuthConfig();
    const secret = config.jwtSecret || process.env['JWT_SECRET'];

    // SECURITY: Enforce proper secret configuration
    if (!secret) {
      if (process.env['NODE_ENV'] === 'production') {
        throw new Error(
          '[JwtService] CRITICAL: JWT_SECRET is required in production. ' +
          'Set a strong random secret with at least 32 characters.'
        );
      }
      // Development fallback with warning
      console.warn('[JwtService] JWT_SECRET not set. Using development fallback.');
      this.secretKey = new TextEncoder().encode('zuclubit-dev-jwt-secret-not-for-production-use');
    } else {
      if (secret.length < 32) {
        throw new Error('[JwtService] JWT_SECRET must be at least 32 characters.');
      }
      this.secretKey = new TextEncoder().encode(secret);
    }

    this.issuer = config.jwtIssuer || 'zuclubit-crm';
  }

  /**
   * Generate access and refresh token pair
   */
  async generateTokenPair(
    userId: string,
    email: string,
    tenantId?: string,
    role?: string
  ): Promise<Result<TokenPair>> {
    try {
      const now = Math.floor(Date.now() / 1000);
      const tokenId = crypto.randomUUID();

      // Generate access token
      const accessToken = await new SignJWT({
        sub: userId,
        email,
        tenantId,
        role,
        type: 'access',
        jti: tokenId,
      } as TokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(this.issuer)
        .setExpirationTime(ACCESS_TOKEN_EXPIRY)
        .sign(this.secretKey);

      // Generate refresh token
      const refreshToken = await new SignJWT({
        sub: userId,
        email,
        type: 'refresh',
        jti: crypto.randomUUID(),
      } as TokenPayload)
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuedAt()
        .setIssuer(this.issuer)
        .setExpirationTime(REFRESH_TOKEN_EXPIRY)
        .sign(this.secretKey);

      return Result.ok({
        accessToken,
        refreshToken,
        expiresIn: ACCESS_TOKEN_EXPIRY_SECONDS,
        expiresAt: now + ACCESS_TOKEN_EXPIRY_SECONDS,
      });
    } catch (error) {
      return Result.fail(`Failed to generate tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify and decode an access token
   */
  async verifyAccessToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: this.issuer,
      });

      const tokenPayload = payload as TokenPayload;

      // Ensure it's an access token
      if (tokenPayload.type !== 'access') {
        return Result.fail('Invalid token type');
      }

      return Result.ok(tokenPayload);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'JWTExpired') {
          return Result.fail('Token expired');
        }
        if (error.name === 'JWTClaimValidationFailed') {
          return Result.fail('Invalid token claims');
        }
      }
      return Result.fail('Invalid token');
    }
  }

  /**
   * Verify and decode a refresh token
   */
  async verifyRefreshToken(token: string): Promise<Result<TokenPayload>> {
    try {
      const { payload } = await jwtVerify(token, this.secretKey, {
        issuer: this.issuer,
      });

      const tokenPayload = payload as TokenPayload;

      // Ensure it's a refresh token
      if (tokenPayload.type !== 'refresh') {
        return Result.fail('Invalid token type');
      }

      return Result.ok(tokenPayload);
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'JWTExpired') {
          return Result.fail('Refresh token expired');
        }
      }
      return Result.fail('Invalid refresh token');
    }
  }

  /**
   * Refresh tokens using a valid refresh token
   */
  async refreshTokens(
    refreshToken: string,
    tenantId?: string,
    role?: string
  ): Promise<Result<TokenPair>> {
    const verifyResult = await this.verifyRefreshToken(refreshToken);

    if (verifyResult.isFailure) {
      return Result.fail(verifyResult.error || 'Invalid refresh token');
    }

    const payload = verifyResult.value!;

    // Generate new token pair
    return this.generateTokenPair(
      payload.sub!,
      payload.email,
      tenantId,
      role
    );
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token: string): TokenPayload | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;

      const payload = JSON.parse(Buffer.from(parts[1]!, 'base64').toString());
      return payload as TokenPayload;
    } catch {
      return null;
    }
  }
}

export default JwtService;
