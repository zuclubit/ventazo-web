/**
 * MessengerService Unit Tests
 * Tests for Facebook Messenger integration including OAuth, webhooks, and messaging
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import crypto from 'crypto';
import { Result } from '@zuclubit/domain';

// Mock crypto for consistent tests
vi.mock('crypto', async () => {
  const actual = await vi.importActual<typeof import('crypto')>('crypto');
  return {
    ...actual,
    createHmac: vi.fn(() => ({
      update: vi.fn().mockReturnThis(),
      digest: vi.fn().mockReturnValue('valid_signature_hex'),
    })),
  };
});

// Mock the MessengerProvider
vi.mock('./messenger.provider', () => ({
  MessengerProvider: vi.fn().mockImplementation((config) => ({
    pageId: config.pageId,
    sendTextMessage: vi.fn().mockResolvedValue({
      recipient_id: 'user-psid',
      message_id: 'mid.123',
    }),
    sendAttachment: vi.fn().mockResolvedValue({
      recipient_id: 'user-psid',
      message_id: 'mid.124',
    }),
    sendTemplate: vi.fn().mockResolvedValue({
      recipient_id: 'user-psid',
      message_id: 'mid.125',
    }),
    getUserProfile: vi.fn().mockResolvedValue({
      first_name: 'John',
      last_name: 'Doe',
      profile_pic: 'https://example.com/pic.jpg',
    }),
    setTypingOn: vi.fn().mockResolvedValue({ recipient_id: 'user-psid' }),
    setTypingOff: vi.fn().mockResolvedValue({ recipient_id: 'user-psid' }),
    markSeen: vi.fn().mockResolvedValue({ recipient_id: 'user-psid' }),
  })),
}));

// Mock fetch for API calls
global.fetch = vi.fn();

// Mock DatabasePool
const mockPool = {
  query: vi.fn(),
};

// Mock NATS client
const mockNats = {
  publish: vi.fn(),
  subscribe: vi.fn(),
};

// Import after mocks
import { MessengerService } from './messenger.service';

describe('MessengerService', () => {
  let messengerService: MessengerService;

  const mockTenantId = 'tenant-123';
  const mockPageId = 'page-456';
  const mockPageToken = 'encrypted:token:value';
  const mockUserId = 'user-789';

  beforeEach(() => {
    vi.clearAllMocks();

    // Reset fetch mock
    (global.fetch as any).mockReset();

    // Setup default pool responses
    mockPool.query.mockResolvedValue(Result.ok({ rows: [], rowCount: 0 }));

    messengerService = new MessengerService(mockPool as any, mockNats as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // OAuth Flow Tests
  // ============================================

  describe('OAuth Flow', () => {
    describe('generateOAuthUrl', () => {
      it('should generate valid OAuth URL with all required parameters', async () => {
        const callbackUrl = 'https://app.example.com/callback';

        const result = await messengerService.generateOAuthUrl(
          mockTenantId,
          callbackUrl,
          mockUserId
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value).toContain('https://www.facebook.com/v21.0/dialog/oauth');
        expect(result.value).toContain('client_id=');
        expect(result.value).toContain('redirect_uri=');
        expect(result.value).toContain('scope=');
        expect(result.value).toContain('state=');
      });

      it('should include required permissions in scope', async () => {
        const result = await messengerService.generateOAuthUrl(
          mockTenantId,
          'https://app.example.com/callback',
          mockUserId
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value).toContain('pages_messaging');
        expect(result.value).toContain('pages_show_list');
        expect(result.value).toContain('pages_read_engagement');
      });

      it('should encode state with tenant and user info', async () => {
        const result = await messengerService.generateOAuthUrl(
          mockTenantId,
          'https://app.example.com/callback',
          mockUserId
        );

        expect(result.isSuccess).toBe(true);
        // State should be base64 encoded JSON
        const urlParams = new URL(result.value!).searchParams;
        const state = urlParams.get('state');
        expect(state).toBeTruthy();
      });
    });

    describe('exchangeCodeForToken', () => {
      it('should exchange authorization code for access token', async () => {
        const mockTokenResponse = {
          access_token: 'short_lived_token',
          token_type: 'bearer',
          expires_in: 3600,
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockTokenResponse),
        });

        const result = await messengerService.exchangeCodeForToken(
          'auth_code_123',
          'https://app.example.com/callback'
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe('short_lived_token');
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('oauth/access_token'),
          expect.any(Object)
        );
      });

      it('should handle invalid authorization code', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            error: {
              message: 'Invalid authorization code',
              code: 100,
            },
          }),
        });

        const result = await messengerService.exchangeCodeForToken(
          'invalid_code',
          'https://app.example.com/callback'
        );

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Invalid authorization code');
      });
    });

    describe('getLongLivedToken', () => {
      it('should exchange short-lived token for long-lived token', async () => {
        const mockLongLivedResponse = {
          access_token: 'long_lived_token_xxx',
          token_type: 'bearer',
          expires_in: 5184000, // 60 days
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockLongLivedResponse),
        });

        const result = await messengerService.getLongLivedToken('short_token');

        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe('long_lived_token_xxx');
      });

      it('should handle expired short-lived token', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            error: {
              message: 'Error validating access token',
              code: 190,
            },
          }),
        });

        const result = await messengerService.getLongLivedToken('expired_token');

        expect(result.isFailure).toBe(true);
      });
    });

    describe('getUserPages', () => {
      it('should fetch all pages user has access to', async () => {
        const mockPagesResponse = {
          data: [
            { id: 'page-1', name: 'My Business', access_token: 'page_token_1' },
            { id: 'page-2', name: 'My Second Page', access_token: 'page_token_2' },
          ],
          paging: {},
        };

        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve(mockPagesResponse),
        });

        const result = await messengerService.getUserPages('user_token');

        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(2);
        expect(result.value![0].name).toBe('My Business');
      });

      it('should return empty array when user has no pages', async () => {
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ data: [] }),
        });

        const result = await messengerService.getUserPages('user_token');

        expect(result.isSuccess).toBe(true);
        expect(result.value).toHaveLength(0);
      });
    });

    describe('savePageConnection', () => {
      it('should save page connection with encrypted token', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [{ id: 'conn-1' }], rowCount: 1 })
        );

        const result = await messengerService.savePageConnection(
          mockTenantId,
          mockPageId,
          'My Business Page',
          'page_access_token',
          mockUserId,
          true
        );

        expect(result.isSuccess).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('INSERT INTO messenger_page_connections'),
          expect.arrayContaining([mockTenantId, mockPageId, 'My Business Page'])
        );
      });

      it('should update existing connection for same tenant-page combo', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [{ id: 'conn-1' }], rowCount: 1 })
        );

        const result = await messengerService.savePageConnection(
          mockTenantId,
          mockPageId,
          'Updated Page Name',
          'new_token',
          mockUserId,
          false
        );

        expect(result.isSuccess).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('ON CONFLICT'),
          expect.any(Array)
        );
      });
    });

    describe('disconnectPage', () => {
      it('should remove page connection from database', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 1 })
        );

        const result = await messengerService.disconnectPage(
          mockTenantId,
          mockPageId
        );

        expect(result.isSuccess).toBe(true);
        expect(mockPool.query).toHaveBeenCalledWith(
          expect.stringContaining('DELETE FROM messenger_page_connections'),
          [mockTenantId, mockPageId]
        );
      });

      it('should clear provider cache after disconnect', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 1 })
        );

        await messengerService.disconnectPage(mockTenantId, mockPageId);

        // Subsequent calls should fetch fresh config
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 0 })
        );

        const provider = await (messengerService as any).getProviderForTenant(mockTenantId);
        expect(provider).toBeNull();
      });
    });
  });

  // ============================================
  // Webhook Verification Tests
  // ============================================

  describe('Webhook Verification', () => {
    describe('verifyWebhookChallenge', () => {
      it('should return challenge when verify token matches', async () => {
        const verifyToken = process.env.MESSENGER_VERIFY_TOKEN || 'test_verify_token';
        const challenge = 'challenge_12345';

        const result = await messengerService.verifyWebhookChallenge(
          'subscribe',
          verifyToken,
          challenge
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(challenge);
      });

      it('should fail when verify token does not match', async () => {
        const result = await messengerService.verifyWebhookChallenge(
          'subscribe',
          'wrong_token',
          'challenge_12345'
        );

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Verification failed');
      });

      it('should fail when mode is not subscribe', async () => {
        const result = await messengerService.verifyWebhookChallenge(
          'unsubscribe',
          process.env.MESSENGER_VERIFY_TOKEN || 'test_verify_token',
          'challenge_12345'
        );

        expect(result.isFailure).toBe(true);
      });
    });

    describe('verifyWebhookSignature', () => {
      it('should verify valid HMAC-SHA256 signature', async () => {
        const payload = JSON.stringify({ object: 'page', entry: [] });
        const appSecret = process.env.MESSENGER_APP_SECRET || 'test_secret';

        // Create expected signature
        const hmac = crypto.createHmac('sha256', appSecret);
        hmac.update(payload);
        const expectedSignature = `sha256=${hmac.digest('hex')}`;

        const result = await messengerService.verifyWebhookSignature(
          payload,
          expectedSignature
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value).toBe(true);
      });

      it('should reject invalid signature', async () => {
        const payload = JSON.stringify({ object: 'page', entry: [] });

        const result = await messengerService.verifyWebhookSignature(
          payload,
          'sha256=invalid_signature'
        );

        expect(result.value).toBe(false);
      });

      it('should reject missing signature', async () => {
        const payload = JSON.stringify({ object: 'page', entry: [] });

        const result = await messengerService.verifyWebhookSignature(
          payload,
          ''
        );

        expect(result.value).toBe(false);
      });

      it('should reject malformed signature format', async () => {
        const payload = JSON.stringify({ object: 'page', entry: [] });

        const result = await messengerService.verifyWebhookSignature(
          payload,
          'not_sha256_format'
        );

        expect(result.value).toBe(false);
      });
    });
  });

  // ============================================
  // Webhook Processing Tests
  // ============================================

  describe('Webhook Processing', () => {
    describe('processWebhook', () => {
      it('should process incoming message webhook', async () => {
        // Mock getting tenant for page
        mockPool.query.mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: mockTenantId,
              page_id: mockPageId,
              page_token: mockPageToken,
            }],
            rowCount: 1,
          })
        );

        const webhookPayload = {
          object: 'page',
          entry: [{
            id: mockPageId,
            time: Date.now(),
            messaging: [{
              sender: { id: 'user-psid' },
              recipient: { id: mockPageId },
              timestamp: Date.now(),
              message: {
                mid: 'mid.123',
                text: 'Hello from customer',
              },
            }],
          }],
        };

        const result = await messengerService.processWebhook(webhookPayload);

        expect(result.isSuccess).toBe(true);
      });

      it('should process message read event', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: mockTenantId,
              page_id: mockPageId,
              page_token: mockPageToken,
            }],
            rowCount: 1,
          })
        );

        const webhookPayload = {
          object: 'page',
          entry: [{
            id: mockPageId,
            time: Date.now(),
            messaging: [{
              sender: { id: 'user-psid' },
              recipient: { id: mockPageId },
              timestamp: Date.now(),
              read: {
                watermark: Date.now(),
              },
            }],
          }],
        };

        const result = await messengerService.processWebhook(webhookPayload);

        expect(result.isSuccess).toBe(true);
      });

      it('should process delivery event', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: mockTenantId,
              page_id: mockPageId,
              page_token: mockPageToken,
            }],
            rowCount: 1,
          })
        );

        const webhookPayload = {
          object: 'page',
          entry: [{
            id: mockPageId,
            time: Date.now(),
            messaging: [{
              sender: { id: mockPageId },
              recipient: { id: 'user-psid' },
              timestamp: Date.now(),
              delivery: {
                mids: ['mid.123'],
                watermark: Date.now(),
              },
            }],
          }],
        };

        const result = await messengerService.processWebhook(webhookPayload);

        expect(result.isSuccess).toBe(true);
      });

      it('should handle unknown page gracefully', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 0 })
        );

        const webhookPayload = {
          object: 'page',
          entry: [{
            id: 'unknown-page',
            time: Date.now(),
            messaging: [{
              sender: { id: 'user-psid' },
              recipient: { id: 'unknown-page' },
              timestamp: Date.now(),
              message: { mid: 'mid.123', text: 'Hello' },
            }],
          }],
        };

        const result = await messengerService.processWebhook(webhookPayload);

        // Should succeed but not process (no tenant found)
        expect(result.isSuccess).toBe(true);
      });

      it('should reject non-page webhooks', async () => {
        const webhookPayload = {
          object: 'user',
          entry: [],
        };

        const result = await messengerService.processWebhook(webhookPayload);

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('Not a page webhook');
      });
    });
  });

  // ============================================
  // Message Sending Tests
  // ============================================

  describe('Message Sending', () => {
    beforeEach(() => {
      // Setup tenant config in database
      mockPool.query.mockResolvedValue(
        Result.ok({
          rows: [{
            tenant_id: mockTenantId,
            page_id: mockPageId,
            page_token: mockPageToken,
            page_name: 'Test Page',
          }],
          rowCount: 1,
        })
      );
    });

    describe('sendMessage', () => {
      it('should send text message successfully', async () => {
        const result = await messengerService.sendMessage(
          mockTenantId,
          'user-psid',
          'Hello from Ventazo!'
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value?.messageId).toBeTruthy();
      });

      it('should fail when tenant not configured', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 0 })
        );

        const result = await messengerService.sendMessage(
          'unconfigured-tenant',
          'user-psid',
          'Hello'
        );

        expect(result.isFailure).toBe(true);
        expect(result.error).toContain('not configured');
      });
    });

    describe('sendBulkMessages', () => {
      it('should send messages to multiple recipients', async () => {
        const recipients = ['psid-1', 'psid-2', 'psid-3'];

        const result = await messengerService.sendBulkMessages(
          mockTenantId,
          recipients,
          'Bulk message content'
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value?.sent).toBe(3);
        expect(result.value?.failed).toBe(0);
      });

      it('should handle partial failures', async () => {
        // Mock provider that fails on second call
        const mockProvider = {
          sendTextMessage: vi
            .fn()
            .mockResolvedValueOnce({ message_id: 'mid.1' })
            .mockRejectedValueOnce(new Error('Rate limited'))
            .mockResolvedValueOnce({ message_id: 'mid.3' }),
        };

        (messengerService as any).providerCache.set(mockTenantId, {
          provider: mockProvider,
          expiresAt: Date.now() + 60000,
        });

        const recipients = ['psid-1', 'psid-2', 'psid-3'];

        const result = await messengerService.sendBulkMessages(
          mockTenantId,
          recipients,
          'Bulk message'
        );

        expect(result.isSuccess).toBe(true);
        expect(result.value?.sent).toBe(2);
        expect(result.value?.failed).toBe(1);
      });
    });
  });

  // ============================================
  // Health Status Tests
  // ============================================

  describe('Health Status', () => {
    describe('getHealthStatus', () => {
      it('should return connected status for configured tenant', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: mockTenantId,
              page_id: mockPageId,
              page_name: 'Test Business Page',
              is_active: true,
              last_webhook_at: new Date().toISOString(),
            }],
            rowCount: 1,
          })
        );

        // Mock token validation
        (global.fetch as any).mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ id: mockPageId }),
        });

        const result = await messengerService.getHealthStatus(mockTenantId);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.connected).toBe(true);
        expect(result.value?.tokenStatus).toBe('valid');
        expect(result.value?.pageName).toBe('Test Business Page');
      });

      it('should return not_configured for unconfigured tenant', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({ rows: [], rowCount: 0 })
        );

        const result = await messengerService.getHealthStatus('unconfigured-tenant');

        expect(result.isSuccess).toBe(true);
        expect(result.value?.connected).toBe(false);
        expect(result.value?.tokenStatus).toBe('not_configured');
      });

      it('should detect expired token', async () => {
        mockPool.query.mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: mockTenantId,
              page_id: mockPageId,
              page_name: 'Test Page',
              is_active: true,
            }],
            rowCount: 1,
          })
        );

        // Mock token validation failure
        (global.fetch as any).mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({
            error: { code: 190, message: 'Token expired' },
          }),
        });

        const result = await messengerService.getHealthStatus(mockTenantId);

        expect(result.isSuccess).toBe(true);
        expect(result.value?.tokenStatus).toBe('expired');
      });
    });
  });

  // ============================================
  // Multi-tenant Provider Cache Tests
  // ============================================

  describe('Provider Cache', () => {
    it('should cache provider for tenant', async () => {
      mockPool.query.mockResolvedValue(
        Result.ok({
          rows: [{
            tenant_id: mockTenantId,
            page_id: mockPageId,
            page_token: mockPageToken,
          }],
          rowCount: 1,
        })
      );

      // First call should query database
      await (messengerService as any).getProviderForTenant(mockTenantId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);

      // Second call should use cache
      await (messengerService as any).getProviderForTenant(mockTenantId);
      expect(mockPool.query).toHaveBeenCalledTimes(1);
    });

    it('should refresh cache after TTL expires', async () => {
      mockPool.query.mockResolvedValue(
        Result.ok({
          rows: [{
            tenant_id: mockTenantId,
            page_id: mockPageId,
            page_token: mockPageToken,
          }],
          rowCount: 1,
        })
      );

      // First call
      await (messengerService as any).getProviderForTenant(mockTenantId);

      // Manually expire the cache
      const cache = (messengerService as any).providerCache;
      const cached = cache.get(mockTenantId);
      if (cached) {
        cached.expiresAt = Date.now() - 1000;
      }

      // Second call should query database again
      await (messengerService as any).getProviderForTenant(mockTenantId);
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should isolate providers between tenants', async () => {
      const tenant1 = 'tenant-1';
      const tenant2 = 'tenant-2';

      mockPool.query
        .mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: tenant1,
              page_id: 'page-1',
              page_token: 'token-1',
            }],
            rowCount: 1,
          })
        )
        .mockResolvedValueOnce(
          Result.ok({
            rows: [{
              tenant_id: tenant2,
              page_id: 'page-2',
              page_token: 'token-2',
            }],
            rowCount: 1,
          })
        );

      const provider1 = await (messengerService as any).getProviderForTenant(tenant1);
      const provider2 = await (messengerService as any).getProviderForTenant(tenant2);

      expect(provider1.pageId).toBe('page-1');
      expect(provider2.pageId).toBe('page-2');
      expect(provider1).not.toBe(provider2);
    });
  });
});
