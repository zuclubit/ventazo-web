// ============================================
// Security Utilities - FASE 5.12
// Centralized security hardening for GA release
// ============================================

// ============================================
// XSS Prevention
// ============================================

/**
 * HTML entities for escaping
 */
const HTML_ENTITIES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;',
  '=': '&#x3D;',
};

/**
 * Escape HTML to prevent XSS attacks
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/[&<>"'`=/]/g, (char) => HTML_ENTITIES[char] || char);
}

/**
 * Sanitize rich text content
 * Allows only safe HTML tags and attributes
 */
export function sanitizeRichText(html: string): string {
  if (!html || typeof html !== 'string') return '';

  // Allowed tags (whitelist approach)
  const allowedTags = new Set([
    'p', 'br', 'b', 'i', 'u', 's', 'strong', 'em',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'ul', 'ol', 'li',
    'blockquote', 'code', 'pre',
    'a', 'span', 'div',
  ]);

  // Allowed attributes per tag
  const allowedAttributes: Record<string, Set<string>> = {
    a: new Set(['href', 'title', 'target', 'rel']),
    span: new Set(['class']),
    div: new Set(['class']),
    code: new Set(['class']),
    pre: new Set(['class']),
  };

  // Create a temporary element to parse HTML
  if (typeof document === 'undefined') {
    // Server-side: basic sanitization
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=/gi, 'data-removed=')
      .replace(/javascript:/gi, '');
  }

  const temp = document.createElement('div');
  temp.innerHTML = html;

  function sanitizeNode(node: Node): void {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as Element;
      const tagName = element.tagName.toLowerCase();

      // Remove disallowed tags
      if (!allowedTags.has(tagName)) {
        element.replaceWith(...Array.from(element.childNodes));
        return;
      }

      // Remove disallowed attributes
      const allowedAttrs = allowedAttributes[tagName] || new Set();
      Array.from(element.attributes).forEach((attr) => {
        if (!allowedAttrs.has(attr.name.toLowerCase())) {
          element.removeAttribute(attr.name);
        }
      });

      // Sanitize href attributes
      if (tagName === 'a') {
        const href = element.getAttribute('href');
        if (href) {
          // Only allow http, https, mailto, and tel protocols
          if (!/^(https?:|mailto:|tel:|#|\/)/i.test(href)) {
            element.removeAttribute('href');
          }
          // Force external links to have security attributes
          if (href.startsWith('http')) {
            element.setAttribute('target', '_blank');
            element.setAttribute('rel', 'noopener noreferrer');
          }
        }
      }
    }

    // Recursively sanitize children
    Array.from(node.childNodes).forEach(sanitizeNode);
  }

  Array.from(temp.childNodes).forEach(sanitizeNode);
  return temp.innerHTML;
}

/**
 * Sanitize plain text input
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  // eslint-disable-next-line no-control-regex
  const controlCharsRegex = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;
  return text
    .trim()
    .replace(controlCharsRegex, '') // Remove control characters
    .slice(0, 10000); // Limit length
}

/**
 * Sanitize text for safe display in UI
 * Use this when rendering user-generated content
 */
export function sanitizeForDisplay(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';
  return escapeHtml(sanitizeText(text));
}

/**
 * Sanitize URL
 */
export function sanitizeUrl(url: string): string {
  if (!url || typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    return parsed.toString();
  } catch {
    // If it's a relative URL, sanitize it
    if (url.startsWith('/')) {
      return url.replace(/[^\w\-./]/g, '');
    }
    return '';
  }
}

// ============================================
// Tenant Validation
// ============================================

/**
 * UUID v4 regex pattern
 */
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate tenant ID format
 */
export function isValidTenantId(tenantId: unknown): tenantId is string {
  return typeof tenantId === 'string' && UUID_PATTERN.test(tenantId);
}

/**
 * Validate user ID format
 */
export function isValidUserId(userId: unknown): userId is string {
  return typeof userId === 'string' && UUID_PATTERN.test(userId);
}

/**
 * Validate entity ID format
 */
export function isValidEntityId(id: unknown): id is string {
  return typeof id === 'string' && UUID_PATTERN.test(id);
}

/**
 * Tenant context validation result
 */
export interface TenantValidationResult {
  isValid: boolean;
  tenantId: string | null;
  error?: string;
}

/**
 * Validate tenant context for API requests
 */
export function validateTenantContext(
  requestTenantId: string | undefined | null,
  userTenantId: string | undefined | null
): TenantValidationResult {
  // No tenant provided
  if (!requestTenantId) {
    return {
      isValid: false,
      tenantId: null,
      error: 'Tenant ID is required',
    };
  }

  // Invalid format
  if (!isValidTenantId(requestTenantId)) {
    return {
      isValid: false,
      tenantId: null,
      error: 'Invalid tenant ID format',
    };
  }

  // User must belong to the tenant
  if (userTenantId && requestTenantId !== userTenantId) {
    return {
      isValid: false,
      tenantId: null,
      error: 'Access denied: tenant mismatch',
    };
  }

  return {
    isValid: true,
    tenantId: requestTenantId,
  };
}

// ============================================
// Input Validation Utilities
// ============================================

/**
 * Email validation
 */
export function isValidEmail(email: unknown): email is string {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

/**
 * Phone validation (flexible international format)
 */
export function isValidPhone(phone: unknown): phone is string {
  if (typeof phone !== 'string') return false;
  const phoneRegex = /^\+?[\d\s\-().]{7,20}$/;
  return phoneRegex.test(phone);
}

/**
 * Validate numeric range
 */
export function isInRange(value: number, min: number, max: number): boolean {
  return typeof value === 'number' && !isNaN(value) && value >= min && value <= max;
}

/**
 * Validate string length
 */
export function isValidLength(
  str: unknown,
  minLength: number,
  maxLength: number
): str is string {
  return typeof str === 'string' && str.length >= minLength && str.length <= maxLength;
}

// ============================================
// CSRF Protection
// ============================================

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for older environments
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * CSRF token storage key
 */
const CSRF_TOKEN_KEY = 'csrf_token';

/**
 * Store CSRF token
 */
export function storeCsrfToken(token: string): void {
  if (typeof sessionStorage !== 'undefined') {
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
  }
}

/**
 * Retrieve CSRF token
 */
export function getCsrfToken(): string | null {
  if (typeof sessionStorage !== 'undefined') {
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
  }
  return null;
}

/**
 * Validate CSRF token
 */
export function validateCsrfToken(token: string | null): boolean {
  if (!token) return false;
  const storedToken = getCsrfToken();
  return storedToken === token;
}

// ============================================
// Rate Limiting (Client-side)
// ============================================

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Check if action is rate limited
 */
export function isRateLimited(
  key: string,
  maxRequests: number,
  windowMs: number
): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  if (!entry || entry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return false;
  }

  if (entry.count >= maxRequests) {
    return true;
  }

  entry.count++;
  return false;
}

/**
 * Get remaining requests
 */
export function getRateLimitRemaining(
  key: string,
  maxRequests: number
): number {
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetAt <= Date.now()) {
    return maxRequests;
  }
  return Math.max(0, maxRequests - entry.count);
}

/**
 * Clear rate limit for a key
 */
export function clearRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

// ============================================
// Secure Data Handling
// ============================================

/**
 * Mask sensitive data (e.g., email, phone)
 */
export function maskEmail(email: string): string {
  if (!email || typeof email !== 'string') return '';
  const parts = email.split('@');
  const local = parts[0];
  const domain = parts[1];
  if (!domain || !local) return '***@***';
  const maskedLocal = local.length > 2
    ? `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}`
    : '***';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mask phone number
 */
export function maskPhone(phone: string): string {
  if (!phone || typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `${'*'.repeat(digits.length - 4)}${digits.slice(-4)}`;
}

/**
 * Mask credit card number
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber || typeof cardNumber !== 'string') return '';
  const digits = cardNumber.replace(/\D/g, '');
  if (digits.length < 4) return '****';
  return `****-****-****-${digits.slice(-4)}`;
}

// ============================================
// Content Security Policy Helpers
// ============================================

/**
 * Generate nonce for inline scripts
 */
export function generateNonce(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).substring(2, 18);
}

// ============================================
// Security Headers (for middleware)
// ============================================

export const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
} as const;

// ============================================
// Audit Logging Types
// ============================================

export interface SecurityEvent {
  type: 'auth' | 'access' | 'data' | 'error';
  action: string;
  userId?: string;
  tenantId?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

/**
 * Create security event
 */
export function createSecurityEvent(
  type: SecurityEvent['type'],
  action: string,
  details?: Partial<Omit<SecurityEvent, 'type' | 'action' | 'timestamp'>>
): SecurityEvent {
  return {
    type,
    action,
    ...details,
    timestamp: Date.now(),
  };
}

/**
 * Log security event (placeholder for actual implementation)
 */
export function logSecurityEvent(event: SecurityEvent): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.log('[Security Event]', event);
  }
  // In production, this would send to a logging service
}

// ============================================
// Safe JSON Parsing
// ============================================

/**
 * Safely parse JSON with validation
 */
export function safeJsonParse<T>(
  json: string,
  validator?: (data: unknown) => data is T
): T | null {
  try {
    const parsed = JSON.parse(json);
    if (validator && !validator(parsed)) {
      return null;
    }
    return parsed as T;
  } catch {
    return null;
  }
}

/**
 * Safely stringify with circular reference handling
 */
export function safeJsonStringify(
  value: unknown,
  space?: number
): string | null {
  const seen = new WeakSet<object>();
  try {
    return JSON.stringify(
      value,
      (_key, val: unknown) => {
        if (typeof val === 'object' && val !== null) {
          if (seen.has(val)) {
            return '[Circular]';
          }
          seen.add(val);
        }
        return val;
      },
      space
    );
  } catch {
    return null;
  }
}
