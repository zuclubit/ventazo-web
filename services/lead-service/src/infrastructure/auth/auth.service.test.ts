/**
 * AuthService Unit Tests
 */

import 'reflect-metadata';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Result } from '@zuclubit/domain';
import { AuthService, UserRole, Permission, getPermissionsForRole } from './index';

// Mock DatabasePool
const mockPool = {
  query: vi.fn(),
};

// Mock Supabase client
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      admin: {
        createUser: vi.fn(),
        deleteUser: vi.fn(),
      },
      resetPasswordForEmail: vi.fn(),
    },
  })),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(mockPool as any);
  });

  describe('getTenantMembership', () => {
    it('should return membership when found', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.MANAGER,
        invitedBy: 'admin-1',
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.getTenantMembership('user-1', 'tenant-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockMembership);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM tenant_memberships'),
        ['user-1', 'tenant-1']
      );
    });

    it('should return null when membership not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await authService.getTenantMembership('user-1', 'tenant-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });

    it('should handle query errors', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.fail('Database error')
      );

      const result = await authService.getTenantMembership('user-1', 'tenant-1');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('Database error');
    });
  });

  describe('getUserById', () => {
    it('should return user profile when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        phone: null,
        isActive: true,
        lastLoginAt: new Date(),
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockUser], rowCount: 1 })
      );

      const result = await authService.getUserById('user-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockUser);
    });

    it('should return null when user not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await authService.getUserById('nonexistent');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBeNull();
    });
  });

  describe('getUserByEmail', () => {
    it('should return user profile when found', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Test User',
        avatarUrl: null,
        phone: null,
        isActive: true,
        lastLoginAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockUser], rowCount: 1 })
      );

      const result = await authService.getUserByEmail('test@example.com');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockUser);
    });
  });

  describe('updateLastLogin', () => {
    it('should update last login timestamp', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 1 })
      );

      const result = await authService.updateLastLogin('user-1');

      expect(result.isSuccess).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET last_login_at'),
        expect.arrayContaining(['user-1'])
      );
    });
  });

  describe('getTenantById', () => {
    it('should return tenant when found', async () => {
      const mockTenant = {
        id: 'tenant-1',
        name: 'Test Company',
        slug: 'test-company',
        plan: 'pro',
        isActive: true,
        settings: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockTenant], rowCount: 1 })
      );

      const result = await authService.getTenantById('tenant-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toEqual(mockTenant);
    });
  });

  describe('getTenantBySlug', () => {
    it('should return tenant when found by slug', async () => {
      const mockTenant = {
        id: 'tenant-1',
        name: 'Test Company',
        slug: 'test-company',
        plan: 'pro',
        isActive: true,
        settings: {},
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockTenant], rowCount: 1 })
      );

      const result = await authService.getTenantBySlug('test-company');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.slug).toBe('test-company');
    });
  });

  describe('addMember', () => {
    it('should add a new member to tenant', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.SALES_REP,
        invitedBy: 'admin-1',
        invitedAt: new Date(),
        acceptedAt: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.addMember(
        'tenant-1',
        'user-1',
        UserRole.SALES_REP,
        'admin-1'
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value?.role).toBe(UserRole.SALES_REP);
    });
  });

  describe('acceptInvitation', () => {
    it('should accept invitation and set acceptedAt', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.SALES_REP,
        invitedBy: 'admin-1',
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.acceptInvitation('membership-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.acceptedAt).toBeDefined();
    });

    it('should fail when invitation not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await authService.acceptInvitation('nonexistent');

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('not found');
    });
  });

  describe('updateMembership', () => {
    it('should update role', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.MANAGER,
        invitedBy: 'admin-1',
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.updateMembership('membership-1', {
        role: UserRole.MANAGER,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.role).toBe(UserRole.MANAGER);
    });

    it('should update isActive status', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.SALES_REP,
        invitedBy: 'admin-1',
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.updateMembership('membership-1', {
        isActive: false,
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.isActive).toBe(false);
    });

    it('should fail when no updates provided', async () => {
      const result = await authService.updateMembership('membership-1', {});

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('No updates provided');
    });
  });

  describe('removeMember', () => {
    it('should remove member from tenant', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 1 })
      );

      const result = await authService.removeMember('membership-1');

      expect(result.isSuccess).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM tenant_memberships'),
        ['membership-1']
      );
    });
  });

  describe('getTenantMembers', () => {
    it('should return all active members', async () => {
      const mockMembers = [
        {
          id: 'membership-1',
          userId: 'user-1',
          tenantId: 'tenant-1',
          role: UserRole.OWNER,
          invitedBy: null,
          invitedAt: new Date(),
          acceptedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            email: 'owner@example.com',
            fullName: 'Owner User',
            avatarUrl: null,
          },
        },
        {
          id: 'membership-2',
          userId: 'user-2',
          tenantId: 'tenant-1',
          role: UserRole.SALES_REP,
          invitedBy: 'user-1',
          invitedAt: new Date(),
          acceptedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          user: {
            email: 'sales@example.com',
            fullName: 'Sales Rep',
            avatarUrl: null,
          },
        },
      ];

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: mockMembers, rowCount: 2 })
      );

      const result = await authService.getTenantMembers('tenant-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value).toHaveLength(2);
      expect(result.value?.[0].role).toBe(UserRole.OWNER);
    });

    it('should include inactive members when requested', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      await authService.getTenantMembers('tenant-1', { includeInactive: true });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.not.stringContaining('AND tm.is_active = true'),
        ['tenant-1']
      );
    });
  });

  describe('hasPermission', () => {
    it('should return true when user has permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.ADMIN,
        invitedBy: null,
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.hasPermission(
        'user-1',
        'tenant-1',
        Permission.LEAD_CREATE
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(true);
    });

    it('should return false when user lacks permission', async () => {
      const mockMembership = {
        id: 'membership-1',
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: UserRole.VIEWER,
        invitedBy: null,
        invitedAt: new Date(),
        acceptedAt: new Date(),
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockMembership], rowCount: 1 })
      );

      const result = await authService.hasPermission(
        'user-1',
        'tenant-1',
        Permission.LEAD_CREATE
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });

    it('should return false when membership not found', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [], rowCount: 0 })
      );

      const result = await authService.hasPermission(
        'user-1',
        'tenant-1',
        Permission.LEAD_CREATE
      );

      expect(result.isSuccess).toBe(true);
      expect(result.value).toBe(false);
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile fields', async () => {
      const mockUser = {
        id: 'user-1',
        email: 'test@example.com',
        fullName: 'Updated Name',
        avatarUrl: null,
        phone: '+1234567890',
        isActive: true,
        lastLoginAt: null,
        metadata: {},
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPool.query.mockResolvedValueOnce(
        Result.ok({ rows: [mockUser], rowCount: 1 })
      );

      const result = await authService.updateUserProfile('user-1', {
        fullName: 'Updated Name',
        phone: '+1234567890',
      });

      expect(result.isSuccess).toBe(true);
      expect(result.value?.fullName).toBe('Updated Name');
      expect(result.value?.phone).toBe('+1234567890');
    });

    it('should fail when no updates provided', async () => {
      const result = await authService.updateUserProfile('user-1', {});

      expect(result.isFailure).toBe(true);
      expect(result.error).toContain('No updates provided');
    });
  });

  describe('countMembersByRole', () => {
    it('should return member counts by role', async () => {
      mockPool.query.mockResolvedValueOnce(
        Result.ok({
          rows: [
            { role: UserRole.OWNER, count: '1' },
            { role: UserRole.ADMIN, count: '2' },
            { role: UserRole.SALES_REP, count: '5' },
          ],
          rowCount: 3,
        })
      );

      const result = await authService.countMembersByRole('tenant-1');

      expect(result.isSuccess).toBe(true);
      expect(result.value?.[UserRole.OWNER]).toBe(1);
      expect(result.value?.[UserRole.ADMIN]).toBe(2);
      expect(result.value?.[UserRole.SALES_REP]).toBe(5);
      expect(result.value?.[UserRole.VIEWER]).toBe(0);
    });
  });
});

describe('getPermissionsForRole', () => {
  it('should return all permissions for owner', () => {
    const permissions = getPermissionsForRole(UserRole.OWNER);

    expect(permissions).toContain(Permission.LEAD_CREATE);
    expect(permissions).toContain(Permission.LEAD_DELETE);
    expect(permissions).toContain(Permission.USER_MANAGE);
    expect(permissions).toContain(Permission.TENANT_SETTINGS);
    expect(permissions).toContain(Permission.TENANT_BILLING);
  });

  it('should return limited permissions for viewer', () => {
    const permissions = getPermissionsForRole(UserRole.VIEWER);

    expect(permissions).toContain(Permission.LEAD_READ);
    expect(permissions).toContain(Permission.STATS_VIEW);
    expect(permissions).not.toContain(Permission.LEAD_CREATE);
    expect(permissions).not.toContain(Permission.LEAD_DELETE);
  });

  it('should return sales rep permissions without LEAD_READ_ALL', () => {
    const permissions = getPermissionsForRole(UserRole.SALES_REP);

    expect(permissions).toContain(Permission.LEAD_CREATE);
    expect(permissions).toContain(Permission.LEAD_READ);
    expect(permissions).not.toContain(Permission.LEAD_READ_ALL);
    expect(permissions).not.toContain(Permission.LEAD_DELETE);
  });

  it('should return manager permissions with LEAD_READ_ALL', () => {
    const permissions = getPermissionsForRole(UserRole.MANAGER);

    expect(permissions).toContain(Permission.LEAD_READ_ALL);
    expect(permissions).toContain(Permission.LEAD_UPDATE_ALL);
    expect(permissions).toContain(Permission.LEAD_ASSIGN);
    expect(permissions).not.toContain(Permission.LEAD_DELETE);
  });
});
