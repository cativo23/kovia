import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdminService } from './admin.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  orgInvite: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  organization: {
    findMany: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

const mockAuditService = {
  log: vi.fn(),
};

const mockMailDispatcher = {
  send: vi.fn(),
};

const mockConfig = {
  get: vi.fn().mockReturnValue('https://app.kovia.com'),
};

describe('AdminService', () => {
  let service: AdminService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AdminService(
      mockPrisma as any,
      mockAuditService as any,
      mockMailDispatcher as any,
      mockConfig as any,
    );
  });

  describe('createInvite', () => {
    it('should generate invite with token, 7-day expiry, queue email, and log audit', async () => {
      mockPrisma.orgInvite.findFirst.mockResolvedValue(null);
      mockPrisma.orgInvite.create.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        orgName: 'Test Org',
        token: 'some-token',
        expiresAt: new Date(),
        acceptedAt: null,
        createdAt: new Date(),
      });

      const result = await service.createInvite({
        email: 'org@test.com',
        orgName: 'Test Org',
      }, 'user-1');

      expect(result).toBeDefined();
      expect(result.email).toBe('org@test.com');
      expect(mockPrisma.orgInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'org@test.com',
            orgName: 'Test Org',
          }),
        }),
      );
      expect(mockMailDispatcher.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'org@test.com',
          context: expect.objectContaining({
            orgName: 'Test Org',
            inviteUrl: expect.stringContaining('/invite/'),
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'org_invited',
        expect.any(String),
        expect.objectContaining({ email: 'org@test.com' }),
      );
    });

    it('should reject duplicate email for pending invite', async () => {
      mockPrisma.orgInvite.findFirst.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        service.createInvite({ email: 'org@test.com', orgName: 'Org' }, 'user-1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('listInvites', () => {
    it('should return all invites with computed status', async () => {
      const now = new Date();
      mockPrisma.orgInvite.findMany.mockResolvedValue([
        {
          id: '1',
          email: 'a@a.com',
          orgName: 'Org A',
          token: 'tok1',
          expiresAt: new Date(now.getTime() + 86400000),
          acceptedAt: null,
          createdAt: now,
        },
        {
          id: '2',
          email: 'b@b.com',
          orgName: 'Org B',
          token: 'tok2',
          expiresAt: new Date(now.getTime() + 86400000),
          acceptedAt: now,
          createdAt: now,
        },
        {
          id: '3',
          email: 'c@c.com',
          orgName: 'Org C',
          token: 'tok3',
          expiresAt: new Date(now.getTime() - 86400000),
          acceptedAt: null,
          createdAt: now,
        },
      ]);

      const result = await service.listInvites();

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('accepted');
      expect(result[2].status).toBe('expired');
    });
  });

  describe('resendInvite', () => {
    it('should regenerate token, reset expiry, re-queue email, and log audit', async () => {
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        orgName: 'Test Org',
        token: 'old-token',
        expiresAt: new Date(),
        acceptedAt: null,
      });
      mockPrisma.orgInvite.update.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        orgName: 'Test Org',
        token: 'new-token',
        expiresAt: new Date(),
        acceptedAt: null,
      });

      const result = await service.resendInvite('inv-1', 'user-1');

      expect(result).toBeDefined();
      expect(mockPrisma.orgInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockMailDispatcher.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'org@test.com',
          context: expect.objectContaining({
            orgName: 'Test Org',
            inviteUrl: expect.stringContaining('/invite/'),
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'invite_resent',
        'user-1',
        expect.objectContaining({ inviteId: 'inv-1' }),
      );
    });
  });

  describe('deleteInvite', () => {
    it('should delete pending invite', async () => {
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        acceptedAt: null,
      });
      mockPrisma.orgInvite.delete.mockResolvedValue({ id: 'inv-1' });

      await service.deleteInvite('inv-1');

      expect(mockPrisma.orgInvite.delete).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
      });
    });
  });

  describe('listOrgs', () => {
    it('should return all orgs with admin info and status', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([
        {
          id: 'org-1',
          name: 'Org 1',
          slug: 'org-1',
          status: 'ACTIVE',
          admin: { id: 'u-1', email: 'admin@org1.com', firstName: 'Admin' },
          createdAt: new Date(),
        },
      ]);

      const result = await service.listOrgs();

      expect(result).toHaveLength(1);
      expect(result[0].admin).toBeDefined();
      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({ admin: true }),
        }),
      );
    });
  });

  describe('updateOrgStatus', () => {
    it('should deactivate org and log audit', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        status: 'DEACTIVATED',
      });

      await service.updateOrgStatus('org-1', 'DEACTIVATED', 'user-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { status: 'DEACTIVATED' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'org_deactivated',
        'user-1',
        expect.objectContaining({ orgId: 'org-1' }),
      );
    });

    it('should reactivate org and log audit', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        status: 'ACTIVE',
      });

      await service.updateOrgStatus('org-1', 'ACTIVE', 'user-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { status: 'ACTIVE' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'org_reactivated',
        'user-1',
        expect.objectContaining({ orgId: 'org-1' }),
      );
    });
  });

  describe('listUsers', () => {
    it('should return paginated users with role and status', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'u-1',
          email: 'user@test.com',
          role: 'ADOPTER',
          isActive: true,
          firstName: 'Test',
          lastName: 'User',
          createdAt: new Date(),
        },
      ]);
      mockPrisma.user.count.mockResolvedValue(1);

      const result = await service.listUsers({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        }),
      );
    });
  });

  describe('deactivateUser', () => {
    it('should set user isActive=false and log audit', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        isActive: false,
      });

      await service.deactivateUser('u-1', 'user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { isActive: false },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user_deactivated',
        'user-1',
        expect.objectContaining({ targetUserId: 'u-1' }),
      );
    });
  });

  describe('reactivateUser', () => {
    it('should set user isActive=true and log audit', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        isActive: true,
      });

      await service.reactivateUser('u-1', 'user-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { isActive: true },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user_reactivated',
        'user-1',
        expect.objectContaining({ targetUserId: 'u-1' }),
      );
    });
  });

  describe('deleteUser', () => {
    it('should permanently delete user and log audit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', email: 'u@t.com' });
      mockPrisma.user.delete.mockResolvedValue({ id: 'u-1' });

      await service.deleteUser('u-1', 'user-1');

      expect(mockPrisma.user.delete).toHaveBeenCalledWith({
        where: { id: 'u-1' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'user_deleted',
        'user-1',
        expect.objectContaining({ targetUserId: 'u-1' }),
      );
    });

    it('should throw if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.deleteUser('nonexistent', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getStats', () => {
    it('should return aggregate counts', async () => {
      mockPrisma.user.count.mockResolvedValue(10);
      mockPrisma.organization.findMany.mockResolvedValue([
        { status: 'ACTIVE' },
        { status: 'ACTIVE' },
        { status: 'DEACTIVATED' },
      ]);
      mockPrisma.orgInvite.findMany.mockResolvedValue([
        { acceptedAt: null, expiresAt: new Date(Date.now() + 86400000) },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(5);

      const stats = await service.getStats();

      expect(stats.totalUsers).toBe(10);
      expect(stats.activeOrgs).toBe(2);
      expect(stats.inactiveOrgs).toBe(1);
      expect(stats.pendingInvites).toBe(1);
      expect(stats.recentActivity).toBe(5); // auditLog.count returns number directly
    });
  });

  describe('getAuditLog', () => {
    it('should return paginated audit entries', async () => {
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'al-1',
          action: 'org_invited',
          userId: 'u-1',
          user: { firstName: 'Admin', lastName: 'User', email: 'admin@test.com' },
          details: {},
          createdAt: new Date(),
        },
      ]);
      mockPrisma.auditLog.count.mockResolvedValue(1);

      const result = await service.getAuditLog({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });
});
