import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TeamService } from './team.service';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

type MockPrisma = {
  teamInvite: Record<string, ReturnType<typeof vi.fn>>;
  user: Record<string, ReturnType<typeof vi.fn>>;
  adoptionApplication: Record<string, ReturnType<typeof vi.fn>>;
  organization: Record<string, ReturnType<typeof vi.fn>>;
  $transaction: ReturnType<typeof vi.fn>;
};

function makeMockPrisma(): MockPrisma {
  const mock: MockPrisma = {
    teamInvite: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    adoptionApplication: {
      findFirst: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
    },
    $transaction: vi.fn(),
  };
  // Default transaction harness: invokes callback with the mock itself so
  // tx.user.* / tx.teamInvite.* resolve to the same mocks.
  mock.$transaction.mockImplementation(async (cb: any, _opts?: any) => {
    if (typeof cb === 'function') {
      return cb(mock);
    }
    return cb;
  });
  return mock;
}

describe('TeamService', () => {
  let service: TeamService;
  let mockPrisma: MockPrisma;
  let mockPublicPrisma: MockPrisma;
  const mockAuditService = { log: vi.fn() };
  const mockMailDispatcher = { send: vi.fn() };
  const mockConfig = { get: vi.fn().mockReturnValue('https://app.kovia.com') };
  const mockAuthService = {
    generateTokens: vi
      .fn()
      .mockResolvedValue({ accessToken: 'new.jwt.token', refreshToken: 'rt' }),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = makeMockPrisma();
    mockPublicPrisma = makeMockPrisma();
    mockConfig.get.mockReturnValue('https://app.kovia.com');
    mockAuthService.generateTokens.mockResolvedValue({
      accessToken: 'new.jwt.token',
      refreshToken: 'rt',
    });
    service = new TeamService(
      mockPrisma as any,
      mockPublicPrisma as any,
      mockAuditService as any,
      mockMailDispatcher as any,
      mockConfig as any,
      mockAuthService as any,
    );
  });

  describe('createInvite', () => {
    it('creates TeamInvite row, dispatches TeamInviteMail, logs audit', async () => {
      mockPrisma.teamInvite.findFirst.mockResolvedValue(null);
      mockPublicPrisma.user.findUnique.mockResolvedValue(null);
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);
      mockPrisma.teamInvite.create.mockResolvedValue({
        id: 'inv-1',
        orgId: 'org-1',
        email: 'new@team.com',
        role: 'ORG_STAFF',
        token: 'tok',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        acceptedAt: null,
        invitedById: 'admin-1',
        createdAt: new Date(),
      });
      mockPublicPrisma.organization.findUnique.mockResolvedValue({ name: 'DameTuPata' });
      mockPublicPrisma.user.findUnique
        .mockResolvedValueOnce(null) // invitee lookup
        .mockResolvedValueOnce({ firstName: 'Ana', lastName: 'Admin' }); // inviter lookup

      const result = await service.createInvite(
        { email: 'new@team.com', role: 'ORG_STAFF' },
        'admin-1',
        'org-1',
      );

      expect(result).toBeDefined();
      expect(mockPrisma.teamInvite.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orgId: 'org-1',
            email: 'new@team.com',
            role: 'ORG_STAFF',
            invitedById: 'admin-1',
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockMailDispatcher.send).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'new@team.com',
          context: expect.objectContaining({
            orgName: 'DameTuPata',
            roleLabel: 'Staff',
            inviteUrl: expect.stringContaining('/team/accept/'),
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_invite_created',
        'admin-1',
        expect.objectContaining({ email: 'new@team.com', role: 'ORG_STAFF' }),
      );
    });

    it('throws 409 when a pending invite already exists for (orgId, email)', async () => {
      mockPrisma.teamInvite.findFirst.mockResolvedValue({
        id: 'existing',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });

      await expect(
        service.createInvite(
          { email: 'new@team.com', role: 'ORG_STAFF' },
          'admin-1',
          'org-1',
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('throws D-06 conflict of interest 409 with Spanish copy when invitee has pending adoption application at the inviting org', async () => {
      mockPrisma.teamInvite.findFirst.mockResolvedValue(null);
      mockPublicPrisma.user.findUnique.mockResolvedValue({ id: 'user-X', email: 'applicant@team.com' });
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue({
        id: 'app-1',
        userId: 'user-X',
        organizationId: 'org-1',
        status: 'ENVIADA',
      });

      await expect(
        service.createInvite(
          { email: 'applicant@team.com', role: 'ORG_STAFF' },
          'admin-1',
          'org-1',
        ),
      ).rejects.toThrow(
        /este usuario tiene una solicitud pendiente en tu organización — resuélvela antes de invitarlo/,
      );
    });

    it('does NOT throw D-06 when invitee only has terminal-status applications', async () => {
      mockPrisma.teamInvite.findFirst.mockResolvedValue(null);
      mockPublicPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'user-X', email: 'past@team.com' })
        .mockResolvedValueOnce({ firstName: 'Ana', lastName: 'Admin' });
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null); // no pending
      mockPrisma.teamInvite.create.mockResolvedValue({
        id: 'inv-2',
        orgId: 'org-1',
        email: 'past@team.com',
        role: 'ORG_STAFF',
        token: 'tok',
        expiresAt: new Date(Date.now() + 7 * 86400000),
        acceptedAt: null,
        invitedById: 'admin-1',
        createdAt: new Date(),
      });
      mockPublicPrisma.organization.findUnique.mockResolvedValue({ name: 'DameTuPata' });

      const result = await service.createInvite(
        { email: 'past@team.com', role: 'ORG_STAFF' },
        'admin-1',
        'org-1',
      );

      expect(result).toBeDefined();
    });
  });

  describe('listInvites', () => {
    it('returns invites with computed status, ordered by createdAt desc', async () => {
      const now = new Date();
      mockPrisma.teamInvite.findMany.mockResolvedValue([
        { id: '1', acceptedAt: null, expiresAt: new Date(now.getTime() + 86400000) },
        { id: '2', acceptedAt: now, expiresAt: new Date(now.getTime() + 86400000) },
        { id: '3', acceptedAt: null, expiresAt: new Date(now.getTime() - 86400000) },
      ]);

      const result = await service.listInvites('org-1');

      expect(result).toHaveLength(3);
      expect(result[0].status).toBe('pending');
      expect(result[1].status).toBe('accepted');
      expect(result[2].status).toBe('expired');
      expect(mockPrisma.teamInvite.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { orgId: 'org-1' }, orderBy: { createdAt: 'desc' } }),
      );
    });

    it('returns empty array when no invites exist', async () => {
      mockPrisma.teamInvite.findMany.mockResolvedValue([]);
      const result = await service.listInvites('org-1');
      expect(result).toEqual([]);
    });
  });

  describe('resendInvite', () => {
    it('regenerates token, extends expiry 7d, re-dispatches mail, audits team_invite_resent', async () => {
      mockPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        orgId: 'org-1',
        email: 'new@team.com',
        role: 'ORG_STAFF',
        invitedById: 'admin-1',
      });
      mockPrisma.teamInvite.update.mockResolvedValue({
        id: 'inv-1',
        orgId: 'org-1',
        email: 'new@team.com',
        token: 'new-tok',
        expiresAt: new Date(),
      });
      mockPublicPrisma.organization.findUnique.mockResolvedValue({ name: 'DameTuPata' });
      mockPublicPrisma.user.findUnique.mockResolvedValue({ firstName: 'Ana', lastName: 'Admin' });

      const result = await service.resendInvite('inv-1', 'admin-1');

      expect(result).toBeDefined();
      expect(mockPrisma.teamInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({
            token: expect.any(String),
            expiresAt: expect.any(Date),
          }),
        }),
      );
      expect(mockMailDispatcher.send).toHaveBeenCalled();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_invite_resent',
        'admin-1',
        expect.objectContaining({ inviteId: 'inv-1' }),
      );
    });

    it('throws NotFoundException if invite does not exist', async () => {
      mockPrisma.teamInvite.findUnique.mockResolvedValue(null);
      await expect(service.resendInvite('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('revokeInvite', () => {
    it('deletes invite and audits team_invite_revoked', async () => {
      mockPrisma.teamInvite.findUnique.mockResolvedValue({ id: 'inv-1' });
      mockPrisma.teamInvite.delete.mockResolvedValue({ id: 'inv-1' });

      await service.revokeInvite('inv-1', 'admin-1');

      expect(mockPrisma.teamInvite.delete).toHaveBeenCalledWith({ where: { id: 'inv-1' } });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_invite_revoked',
        'admin-1',
        expect.objectContaining({ inviteId: 'inv-1' }),
      );
    });

    it('throws NotFoundException when invite missing', async () => {
      mockPrisma.teamInvite.findUnique.mockResolvedValue(null);
      await expect(service.revokeInvite('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('validateToken', () => {
    it('returns invite metadata for a valid token', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'new@team.com',
        role: 'ORG_STAFF',
        orgId: 'org-1',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        org: { name: 'DameTuPata' },
      });

      const result = await service.validateToken('a'.repeat(64));

      expect(result).toEqual(
        expect.objectContaining({
          id: 'inv-1',
          email: 'new@team.com',
          role: 'ORG_STAFF',
          orgName: 'DameTuPata',
        }),
      );
    });

    it('throws NotFoundException for unknown token', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue(null);
      await expect(service.validateToken('bad')).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when acceptedAt is set', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: new Date(),
        org: { name: 'X' },
      });
      await expect(service.validateToken('t')).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when expired', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        expiresAt: new Date(Date.now() - 86400000),
        acceptedAt: null,
        org: { name: 'X' },
      });
      await expect(service.validateToken('t')).rejects.toThrow(BadRequestException);
    });
  });

  describe('acceptInvite', () => {
    it('upgrades in place, marks invite accepted, audits, returns freshly issued accessToken', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'adopter@t.com',
        role: 'ORG_STAFF',
        orgId: 'org-1',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        org: { name: 'DameTuPata' },
      });
      mockPublicPrisma.user.findUnique
        .mockResolvedValueOnce({ id: 'u-1', email: 'adopter@t.com', role: 'ADOPTER', orgId: null })
        .mockResolvedValueOnce({
          id: 'u-1',
          email: 'adopter@t.com',
          role: 'ORG_STAFF',
          orgId: 'org-1',
        });
      mockPublicPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_STAFF',
        orgId: 'org-1',
      });
      mockPublicPrisma.teamInvite.update.mockResolvedValue({ id: 'inv-1', acceptedAt: new Date() });

      const result = await service.acceptInvite('a'.repeat(64), 'u-1');

      expect(result).toEqual(expect.objectContaining({ accessToken: 'new.jwt.token' }));
      expect(mockPublicPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({ role: 'ORG_STAFF', orgId: 'org-1' }),
        }),
      );
      expect(mockPublicPrisma.teamInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'inv-1' },
          data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_invite_accepted',
        'u-1',
        expect.objectContaining({ inviteId: 'inv-1' }),
      );
      expect(mockAuthService.generateTokens).toHaveBeenCalled();
    });

    it('throws BadRequestException when invitee email does not match current user email', async () => {
      mockPublicPrisma.teamInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'someone@else.com',
        role: 'ORG_STAFF',
        orgId: 'org-1',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: null,
        org: { name: 'DameTuPata' },
      });
      mockPublicPrisma.user.findUnique.mockResolvedValueOnce({
        id: 'u-1',
        email: 'different@t.com',
      });

      await expect(service.acceptInvite('a'.repeat(64), 'u-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('listMembers', () => {
    it('returns users where orgId matches, ordered by createdAt desc', async () => {
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'u-1', email: 'a@t.com', role: 'ORG_ADMIN', firstName: 'Ana', lastName: 'A' },
      ]);

      const result = await service.listMembers('org-1');

      expect(result).toHaveLength(1);
      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orgId: 'org-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
    });

    it('returns empty array when no members', async () => {
      mockPrisma.user.findMany.mockResolvedValue([]);
      expect(await service.listMembers('org-1')).toEqual([]);
    });
  });

  describe('changeRole', () => {
    it('changes role and logs audit', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_STAFF',
        orgId: 'org-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_ADMIN',
        orgId: 'org-1',
      });
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.changeRole('u-1', 'ORG_ADMIN', 'admin-1');

      expect(result).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({ role: 'ORG_ADMIN' }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_role_changed',
        'admin-1',
        expect.objectContaining({ targetUserId: 'u-1', to: 'ORG_ADMIN' }),
      );
    });

    it('rejects demotion of the last ORG_ADMIN with 409 Spanish copy', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_ADMIN',
        orgId: 'org-1',
      });
      mockPrisma.user.count.mockResolvedValue(1);
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      await expect(service.changeRole('u-1', 'ORG_STAFF', 'admin-1')).rejects.toThrow(
        /no puedes remover al único administrador/,
      );
    });

    it('allows demotion when another ORG_ADMIN exists in the org', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_ADMIN',
        orgId: 'org-1',
      });
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', role: 'ORG_STAFF', orgId: 'org-1' });
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.changeRole('u-1', 'ORG_STAFF', 'admin-1');
      expect(result).toBeDefined();
    });

    it('throws NotFoundException when target user missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      await expect(service.changeRole('nope', 'ORG_STAFF', 'admin-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('removeMember', () => {
    it('flips role to ADOPTER, clears orgId, preserves User row (D-15), audits', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_STAFF',
        orgId: 'org-1',
      });
      mockPrisma.user.update.mockResolvedValue({
        id: 'u-1',
        role: 'ADOPTER',
        orgId: null,
      });
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      const result = await service.removeMember('u-1', 'admin-1');

      expect(result).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'u-1' },
          data: expect.objectContaining({ role: 'ADOPTER', orgId: null }),
        }),
      );
      expect(mockPrisma.user.delete).not.toHaveBeenCalled?.();
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'team_member_removed',
        'admin-1',
        expect.objectContaining({ targetUserId: 'u-1', previousRole: 'ORG_STAFF' }),
      );
    });

    it('rejects removal of the last ORG_ADMIN with 409 Spanish copy', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'u-1',
        role: 'ORG_ADMIN',
        orgId: 'org-1',
      });
      mockPrisma.user.count.mockResolvedValue(1);
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      await expect(service.removeMember('u-1', 'admin-1')).rejects.toThrow(
        /no puedes remover al único administrador/,
      );
    });

    it('throws NotFoundException when target user missing', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPublicPrisma.$transaction.mockImplementation(async (cb: any) => cb(mockPrisma));

      await expect(service.removeMember('nope', 'admin-1')).rejects.toThrow(NotFoundException);
    });
  });
});
