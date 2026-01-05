/**
 * Cloudflare Turnstile Verification Service
 * Validates CAPTCHA tokens from the frontend (P0.2)
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';

/**
 * Turnstile verification request
 */
export interface TurnstileVerifyRequest {
  /** The response token from the frontend */
  token: string;
  /** The IP address of the user (optional but recommended) */
  remoteip?: string;
  /** idempotency key (optional) */
  idempotencyKey?: string;
}

/**
 * Turnstile verification response
 */
export interface TurnstileVerifyResponse {
  /** Whether the verification was successful */
  success: boolean;
  /** Error codes if verification failed */
  errorCodes?: string[];
  /** Challenge timestamp */
  challengeTs?: string;
  /** Hostname of the site */
  hostname?: string;
  /** Action if specified during render */
  action?: string;
  /** cData if specified during render */
  cdata?: string;
}

/**
 * Cloudflare siteverify API response
 */
interface CloudflareSiteVerifyResponse {
  success: boolean;
  'error-codes'?: string[];
  challenge_ts?: string;
  hostname?: string;
  action?: string;
  cdata?: string;
}

/**
 * Error code descriptions
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  'missing-input-secret': 'The secret parameter was not passed',
  'invalid-input-secret': 'The secret parameter was invalid or did not exist',
  'missing-input-response': 'The response parameter was not passed',
  'invalid-input-response': 'The response parameter is invalid or has expired',
  'bad-request': 'The request was rejected because it was malformed',
  'timeout-or-duplicate': 'The response parameter has already been validated before',
  'internal-error': 'An internal error happened while validating the response',
};

@injectable()
export class TurnstileService {
  private readonly secretKey: string;
  private readonly verifyUrl = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
  private readonly enabled: boolean;

  constructor() {
    this.secretKey = process.env.TURNSTILE_SECRET_KEY || '';
    this.enabled = process.env.ENABLE_TURNSTILE === 'true';

    if (this.enabled && !this.secretKey) {
      console.warn('[TurnstileService] TURNSTILE_SECRET_KEY not configured');
    }
  }

  /**
   * Check if Turnstile verification is enabled
   */
  isEnabled(): boolean {
    return this.enabled && !!this.secretKey;
  }

  /**
   * Verify a Turnstile token
   */
  async verify(request: TurnstileVerifyRequest): Promise<Result<TurnstileVerifyResponse>> {
    // Skip verification if disabled (development)
    if (!this.isEnabled()) {
      console.log('[TurnstileService] Turnstile disabled, skipping verification');
      return Result.ok({
        success: true,
        challengeTs: new Date().toISOString(),
        hostname: 'localhost',
      });
    }

    const { token, remoteip, idempotencyKey } = request;

    if (!token) {
      return Result.fail('Token is required');
    }

    try {
      const formData = new URLSearchParams();
      formData.append('secret', this.secretKey);
      formData.append('response', token);

      if (remoteip) {
        formData.append('remoteip', remoteip);
      }

      if (idempotencyKey) {
        formData.append('idempotency_key', idempotencyKey);
      }

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        return Result.fail(`Turnstile API error: ${response.status} ${response.statusText}`);
      }

      const data: CloudflareSiteVerifyResponse = await response.json();

      const result: TurnstileVerifyResponse = {
        success: data.success,
        errorCodes: data['error-codes'],
        challengeTs: data.challenge_ts,
        hostname: data.hostname,
        action: data.action,
        cdata: data.cdata,
      };

      if (!data.success) {
        const errorMessages = data['error-codes']?.map(
          (code) => ERROR_CODE_MESSAGES[code] || code
        ) || ['Unknown error'];

        console.warn('[TurnstileService] Verification failed:', errorMessages);
      }

      return Result.ok(result);
    } catch (error) {
      console.error('[TurnstileService] Verification error:', error);
      return Result.fail(
        `Turnstile verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Get human-readable error message
   */
  getErrorMessage(errorCodes: string[]): string {
    if (!errorCodes || errorCodes.length === 0) {
      return 'Verification failed';
    }

    const messages = errorCodes.map(
      (code) => ERROR_CODE_MESSAGES[code] || `Unknown error: ${code}`
    );

    return messages.join('. ');
  }
}
