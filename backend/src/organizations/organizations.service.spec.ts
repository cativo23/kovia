import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsService } from './organizations.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

// RLS-bound Prisma (writes; read-after-write via tenant context)
const mockPrisma = {
  orgInvite: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};

// Public (RLS-bypass) Prisma — used for pre-auth lookups: acceptInvite, findBySlug
const mockPublicPrisma = {
  orgInvite: {
    findUnique: vi.fn(),
  },
  organization: {
    findUnique: vi.fn(),
  },
};

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService(
      mockPrisma as any,
      mockPublicPrisma as any,
    );
  });

  describe('acceptInvite', () => {
    // acceptInvite reads from rlsBypassPrisma (pre-auth lookup, RLS-bypass per D-09 phase 09)
    it('should validate token and return invite data', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 3);
      mockPublicPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        orgName: 'Test Org',
        token: 'valid-token',
        expiresAt: futureDate,
        acceptedAt: null,
      });

      const result = await service.acceptInvite('valid-token');

      expect(result).toBeDefined();
      expect(result.email).toBe('org@test.com');
      expect(result.orgName).toBe('Test Org');
    });

    it('should reject expired token', async () => {
      const pastDate = new Date(Date.now() - 86400000);
      mockPublicPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        orgName: 'Test Org',
        token: 'expired-token',
        expiresAt: pastDate,
        acceptedAt: null,
      });

      await expect(service.acceptInvite('expired-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject already accepted invite', async () => {
      mockPublicPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        email: 'org@test.com',
        token: 'used-token',
        expiresAt: new Date(Date.now() + 86400000),
        acceptedAt: new Date(),
      });

      await expect(service.acceptInvite('used-token')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if token not found', async () => {
      mockPublicPrisma.orgInvite.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvite('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    // Production `create(dto, userId)` only persists the org. The legacy spec
    // asserted user-role + invite-update side effects which actually live in
    // `claimInvite`; that scenario now has its own `describe('claimInvite')`
    // block below.
    it('should create org with generated slug and link admin', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        status: 'ACTIVE',
        adminId: 'u-1',
      });

      const result = await service.create(
        {
          name: 'Test Org',
          description: 'A test organization',
          contactEmail: 'contact@test.com',
        },
        'u-1',
      );

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-org');
      expect(mockPrisma.organization.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Test Org',
            slug: 'test-org',
            adminId: 'u-1',
          }),
        }),
      );
    });

    it('should generate unique slug from name', async () => {
      // First check finds existing slug, second check with suffix finds nothing
      mockPrisma.organization.findFirst
        .mockResolvedValueOnce({ slug: 'test-org' })
        .mockResolvedValueOnce(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org-1',
        adminId: 'u-1',
      });

      const result = await service.create(
        { name: 'Test Org', contactEmail: 'c@t.com' },
        'u-1',
      );

      expect(result.slug).toMatch(/^test-org-/);
    });
  });

  describe('claimInvite', () => {
    it('should set user role to ORG_ADMIN and mark invite accepted', async () => {
      mockPublicPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', role: 'ORG_ADMIN' });
      mockPrisma.orgInvite.update.mockResolvedValue({});

      const result = await service.claimInvite('tok', 'u-1');

      expect(result).toBeDefined();
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { role: 'ORG_ADMIN' },
      });
      expect(mockPrisma.orgInvite.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { token: 'tok' },
          data: expect.objectContaining({ acceptedAt: expect.any(Date) }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update org profile fields for org admin', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        adminId: 'u-1',
      });
      mockPrisma.organization.update.mockResolvedValue({
        id: 'org-1',
        description: 'Updated description',
      });

      const result = await service.update(
        'org-1',
        { description: 'Updated description' },
        'u-1',
      );

      expect(result.description).toBe('Updated description');
    });

    it('should reject update from non-admin user', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        adminId: 'u-1',
      });

      await expect(
        service.update('org-1', { description: 'hack' }, 'u-2'),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('findBySlug', () => {
    // findBySlug reads from rlsBypassPrisma (anonymous public org pages).
    it('should return org public profile', async () => {
      mockPublicPrisma.organization.findUnique.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        description: 'A great org',
        logoUrl: 'https://example.com/logo.png',
        contactEmail: 'c@t.com',
        phone: '+503 1234 5678',
        instagram: '@testorg',
        facebook: 'testorg',
        whatsapp: '+50312345678',
        status: 'ACTIVE',
      });

      const result = await service.findBySlug('test-org');

      expect(result).toBeDefined();
      expect(result.name).toBe('Test Org');
      expect(result.slug).toBe('test-org');
    });

    it('should throw if org not found', async () => {
      mockPublicPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findBySlug('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findByAdminId', () => {
    it('should return org for the admin user', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue({
        id: 'org-1',
        name: 'My Org',
        adminId: 'u-1',
      });

      const result = await service.findByAdminId('u-1');

      expect(result).toBeDefined();
      expect(result.adminId).toBe('u-1');
    });
  });
});
