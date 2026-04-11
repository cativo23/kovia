import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

// Mock external AWS deps (pulled in transitively via UploadService)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class { send = vi.fn(); },
  PutObjectCommand: class { constructor(public input: any) {} },
  DeleteObjectCommand: class { constructor(public input: any) {} },
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio/presigned'),
}));

const mockPrismaRls = {
  adoptionApplication: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  applicationPhoto: {
    createMany: vi.fn(),
  },
};

const mockPublicPrisma = {
  animal: {
    findUnique: vi.fn(),
  },
  adoptionApplication: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
    update: vi.fn(),
  },
  applicationPhoto: {
    createMany: vi.fn(),
  },
};

const mockUploadService = {
  getPresignedUrl: vi.fn(),
  deleteObject: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

const mockCls = {
  get: vi.fn(),
  set: vi.fn(),
};

// We'll import ApplicationsService after writing it; for RED phase this will fail to import
// but the tests describe the expected behavior

describe('ApplicationsService', () => {
  let service: any;

  beforeEach(async () => {
    vi.clearAllMocks();
    const { ApplicationsService } = await import('./applications.service');
    service = new ApplicationsService(
      mockPrismaRls as any,
      mockPublicPrisma as any,
      mockUploadService as any,
      mockAuditService as any,
      mockCls as any,
    );
  });

  describe('create', () => {
    const user = {
      id: 'user-1',
      email: 'adopter@example.com',
      firstName: 'Ana',
      lastName: 'Garcia',
    };

    const dto = {
      animalId: 'animal-1',
      personalInfo: { age: 30 },
      housing: { type: 'house' },
      lifestyle: { active: true },
    };

    it('should create application with status ENVIADA and snapshot adopter info', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue({
        id: 'animal-1',
        status: 'AVAILABLE',
        organizationId: 'org-1',
      });
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue(null);
      const created = {
        id: 'app-1',
        animalId: 'animal-1',
        userId: 'user-1',
        organizationId: 'org-1',
        status: 'ENVIADA',
        adopterFirstName: 'Ana',
        adopterLastName: 'Garcia',
        adopterEmail: 'adopter@example.com',
      };
      mockPublicPrisma.adoptionApplication.create.mockResolvedValue(created);

      const result = await service.create(dto, user);

      expect(result.status).toBe('ENVIADA');
      expect(result.adopterFirstName).toBe('Ana');
      expect(result.adopterEmail).toBe('adopter@example.com');
      expect(mockPublicPrisma.adoptionApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            animalId: 'animal-1',
            userId: 'user-1',
            organizationId: 'org-1',
            adopterFirstName: 'Ana',
            adopterLastName: 'Garcia',
            adopterEmail: 'adopter@example.com',
          }),
        }),
      );
    });

    it('should throw ConflictException if application already exists for same animalId+userId', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue({
        id: 'animal-1',
        status: 'AVAILABLE',
        organizationId: 'org-1',
      });
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'existing-app',
      });

      await expect(service.create(dto, user)).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if animal status is not AVAILABLE', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue({
        id: 'animal-1',
        status: 'ADOPTED',
        organizationId: 'org-1',
      });

      await expect(service.create(dto, user)).rejects.toThrow(BadRequestException);
    });

    it('should call auditService.log on successful creation', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue({
        id: 'animal-1',
        status: 'AVAILABLE',
        organizationId: 'org-1',
      });
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue(null);
      mockPublicPrisma.adoptionApplication.create.mockResolvedValue({
        id: 'app-1',
        status: 'ENVIADA',
      });

      await service.create(dto, user);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'application.create',
        'user-1',
        expect.objectContaining({ animalId: 'animal-1' }),
      );
    });
  });

  describe('findMyApplications', () => {
    it('should return only the authenticated user\'s applications using publicPrisma', async () => {
      const apps = [{ id: 'app-1', userId: 'user-1' }];
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue(apps);
      mockPublicPrisma.adoptionApplication.count.mockResolvedValue(1);

      const result = await service.findMyApplications('user-1', { page: 1, limit: 10 });

      expect(result.data).toEqual(apps);
      expect(mockPublicPrisma.adoptionApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ userId: 'user-1' }),
        }),
      );
      // Should NOT use prismaRls for adopter reads
      expect(mockPrismaRls.adoptionApplication.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findAllByOrg', () => {
    it('should use prismaRls for org-scoped results with pagination', async () => {
      const apps = [{ id: 'app-1', organizationId: 'org-1' }];
      mockPrismaRls.adoptionApplication.findMany.mockResolvedValue(apps);
      mockPrismaRls.adoptionApplication.count.mockResolvedValue(1);

      const result = await service.findAllByOrg({ page: 1, limit: 10 });

      expect(result.data).toEqual(apps);
      expect(mockPrismaRls.adoptionApplication.findMany).toHaveBeenCalled();
    });

    it('should filter by animalId when provided', async () => {
      mockPrismaRls.adoptionApplication.findMany.mockResolvedValue([]);
      mockPrismaRls.adoptionApplication.count.mockResolvedValue(0);

      await service.findAllByOrg({ page: 1, limit: 10, animalId: 'animal-1' });

      expect(mockPrismaRls.adoptionApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ animalId: 'animal-1' }),
        }),
      );
    });

    it('should filter by status when provided', async () => {
      mockPrismaRls.adoptionApplication.findMany.mockResolvedValue([]);
      mockPrismaRls.adoptionApplication.count.mockResolvedValue(0);

      await service.findAllByOrg({ page: 1, limit: 10, status: 'REVISANDO' });

      expect(mockPrismaRls.adoptionApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'REVISANDO' }),
        }),
      );
    });
  });

  describe('checkExisting', () => {
    it('should return { exists: true, applicationId } when application found', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({ id: 'app-1' });

      const result = await service.checkExisting('animal-1', 'user-1');

      expect(result.exists).toBe(true);
      expect(result.applicationId).toBe('app-1');
    });

    it('should return { exists: false } when application not found', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue(null);

      const result = await service.checkExisting('animal-1', 'user-1');

      expect(result.exists).toBe(false);
      expect(result.applicationId).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    const validTransitions = [
      ['ENVIADA', 'REVISANDO'],
      ['REVISANDO', 'APROBADA'],
      ['REVISANDO', 'RECHAZADA'],
      ['REVISANDO', 'SEGUIMIENTO'],
      ['SEGUIMIENTO', 'APROBADA'],
      ['APROBADA', 'ADOPTADA'],
    ];

    for (const [from, to] of validTransitions) {
      it(`should allow transition ${from} -> ${to}`, async () => {
        mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
          id: 'app-1',
          status: from,
        });
        mockPrismaRls.adoptionApplication.update.mockResolvedValue({
          id: 'app-1',
          status: to,
        });

        const result = await service.updateStatus('app-1', to, 'staff-1');

        expect(result.status).toBe(to);
      });
    }

    it('should throw BadRequestException for invalid transition ENVIADA -> APROBADA', async () => {
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'ENVIADA',
      });

      await expect(service.updateStatus('app-1', 'APROBADA', 'staff-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call auditService.log on every status change', async () => {
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'ENVIADA',
      });
      mockPrismaRls.adoptionApplication.update.mockResolvedValue({
        id: 'app-1',
        status: 'REVISANDO',
      });

      await service.updateStatus('app-1', 'REVISANDO', 'staff-1');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'application.status_change',
        'staff-1',
        expect.objectContaining({
          applicationId: 'app-1',
          oldStatus: 'ENVIADA',
          newStatus: 'REVISANDO',
        }),
      );
    });
  });

  describe('withdraw', () => {
    it('should throw BadRequestException when status is ADOPTADA', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
        status: 'ADOPTADA',
      });

      await expect(service.withdraw('app-1', 'user-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'other-user',
        status: 'ENVIADA',
      });

      await expect(service.withdraw('app-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    it('should set status to RETIRADA for valid owner', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
        status: 'ENVIADA',
      });
      mockPublicPrisma.adoptionApplication.update.mockResolvedValue({
        id: 'app-1',
        status: 'RETIRADA',
      });

      const result = await service.withdraw('app-1', 'user-1');

      expect(result.status).toBe('RETIRADA');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'application.withdraw',
        'user-1',
        expect.objectContaining({ applicationId: 'app-1' }),
      );
    });
  });
});
