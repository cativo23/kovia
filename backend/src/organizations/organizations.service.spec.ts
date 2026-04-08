import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OrganizationsService } from './organizations.service';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';

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

describe('OrganizationsService', () => {
  let service: OrganizationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new OrganizationsService(mockPrisma as any);
  });

  describe('acceptInvite', () => {
    it('should validate token and return invite data', async () => {
      const futureDate = new Date(Date.now() + 86400000 * 3);
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
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
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
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
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
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
      mockPrisma.orgInvite.findUnique.mockResolvedValue(null);

      await expect(service.acceptInvite('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create org with slug, link admin, and update user role', async () => {
      mockPrisma.organization.findFirst.mockResolvedValue(null);
      mockPrisma.organization.create.mockResolvedValue({
        id: 'org-1',
        name: 'Test Org',
        slug: 'test-org',
        status: 'ACTIVE',
        adminId: 'u-1',
      });
      mockPrisma.user.update.mockResolvedValue({ id: 'u-1', role: 'ORG_ADMIN' });
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.orgInvite.update.mockResolvedValue({});

      const result = await service.create(
        {
          name: 'Test Org',
          description: 'A test organization',
          contactEmail: 'contact@test.com',
        },
        'u-1',
        'tok',
      );

      expect(result).toBeDefined();
      expect(result.slug).toBe('test-org');
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
      mockPrisma.user.update.mockResolvedValue({});
      mockPrisma.orgInvite.findUnique.mockResolvedValue({
        id: 'inv-1',
        token: 'tok',
        acceptedAt: null,
        expiresAt: new Date(Date.now() + 86400000),
      });
      mockPrisma.orgInvite.update.mockResolvedValue({});

      const result = await service.create(
        { name: 'Test Org', contactEmail: 'c@t.com' },
        'u-1',
        'tok',
      );

      expect(result.slug).toMatch(/^test-org-/);
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
    it('should return org public profile', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
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
      mockPrisma.organization.findUnique.mockResolvedValue(null);

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
