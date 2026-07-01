import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';

// Mock external AWS deps (pulled in transitively via UploadService)
vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: class {
    send = vi.fn();
  },
  PutObjectCommand: class {
    constructor(public input: any) {}
  },
  DeleteObjectCommand: class {
    constructor(public input: any) {}
  },
}));
vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://minio/presigned'),
}));

const mockPrismaRls = {
  adoptionApplication: {
    create: vi.fn(),
    findFirst: vi.fn(),
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
    findFirst: vi.fn(),
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
  findByApplication: vi.fn(),
};

const mockCls = {
  get: vi.fn(),
  set: vi.fn(),
};

const mockScoringQueue = {
  add: vi.fn(),
};

const mockEventsService = {
  emitApplicationSubmitted: vi.fn(),
  emitApplicationStatusChanged: vi.fn(),
  emitApplicationWithdrawn: vi.fn(),
  emitApplicationDevuelta: vi.fn(),
  emitCoAplicanteConfirmationRequested: vi.fn(),
};

const mockAdopterProfileService = {
  getMyProfile: vi.fn().mockResolvedValue({
    id: 'profile-1',
    phone: '+503123',
    occupation: 'Dev',
    birthDate: '1990-01-01',
    city: 'SV',
    housingType: 'HOUSE',
    ownership: 'OWNED',
    exteriorSpace: true,
    petPermission: true,
    adults: 2,
    children: 0,
    currentPets: [],
    activityLevel: 'HIGH',
    hoursAlone: 4,
    adoptionReason: 'Love',
    speciesExperience: true,
    previousPets: [],
    additionalContext: null,
    photos: [],
    completionPct: 100,
  }),
};

const mockExtrasTemplateService = {
  findForAnimalRaw: vi.fn().mockResolvedValue([]),
};

const mockConfigService = {
  get: vi.fn().mockReturnValue('https://kovia.app'),
};

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
      mockScoringQueue as any,
      mockEventsService as any,
      mockAdopterProfileService as any,
      mockExtrasTemplateService as any,
      mockConfigService as any,
    );
  });

  describe('create', () => {
    const user = {
      id: 'user-1',
      email: 'adopter@example.com',
      firstName: 'Ana',
      lastName: 'Garcia',
    };

    // Phase 16 SubmitApplicationDto shape (co-aplicante fields required)
    const dto = {
      animalId: 'animal-1',
      extraAnswers: [],
      coAplicanteNombre: 'María Co-Aplicante',
      coAplicanteEmail: 'co@example.com',
    };

    const availableAnimal = {
      id: 'animal-1',
      name: 'Firulais',
      status: 'AVAILABLE',
      organizationId: 'org-1',
      adoptionCategory: 'SALUDABLE_ADULTO',
    };

    it('should create application with status SUBMITTED and snapshot adopter info', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue(availableAnimal);
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);
      const created = {
        id: 'app-1',
        animalId: 'animal-1',
        userId: 'user-1',
        organizationId: 'org-1',
        status: 'SUBMITTED',
        adopterFirstName: 'Ana',
        adopterLastName: 'Garcia',
        adopterEmail: 'adopter@example.com',
      };
      mockPrismaRls.adoptionApplication.create.mockResolvedValue(created);

      const result = await service.create(dto, user);

      expect(result.status).toBe('SUBMITTED');
      expect(result.adopterFirstName).toBe('Ana');
      expect(result.adopterEmail).toBe('adopter@example.com');
      expect(mockPrismaRls.adoptionApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            animalId: 'animal-1',
            userId: 'user-1',
            organizationId: 'org-1',
            adopterFirstName: 'Ana',
            adopterLastName: 'Garcia',
            adopterEmail: 'adopter@example.com',
            coAplicanteNombre: 'María Co-Aplicante',
            coAplicanteEmail: 'co@example.com',
          }),
        }),
      );
    });

    it('should throw ConflictException if a non-WITHDRAWN application exists for same animalId+userId', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue(availableAnimal);
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue({
        id: 'existing-app',
      });

      await expect(service.create(dto, user)).rejects.toThrow(ConflictException);
    });

    it('should allow re-apply when the only existing application is WITHDRAWN (D-14)', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue(availableAnimal);
      // findFirst returns null because of the `status: { not: 'WITHDRAWN' }` filter
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);
      mockPrismaRls.adoptionApplication.create.mockResolvedValue({
        id: 'app-2',
        status: 'SUBMITTED',
      });

      const result = await service.create(dto, user);

      expect(result.id).toBe('app-2');
      expect(mockPublicPrisma.adoptionApplication.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            animalId: 'animal-1',
            userId: 'user-1',
            status: { not: 'WITHDRAWN' },
          }),
        }),
      );
    });

    it('should throw BadRequestException if animal status is not AVAILABLE', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue({
        ...availableAnimal,
        status: 'ADOPTED',
      });

      await expect(service.create(dto, user)).rejects.toThrow(BadRequestException);
    });

    it('should call auditService.log on successful creation', async () => {
      mockPublicPrisma.animal.findUnique.mockResolvedValue(availableAnimal);
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);
      mockPrismaRls.adoptionApplication.create.mockResolvedValue({
        id: 'app-1',
        status: 'SUBMITTED',
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
    it("should return only the authenticated user's applications using rlsBypassPrisma with explicit userId filter", async () => {
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
      // D-19-BE: must NOT use prismaRls for adopter self-scoped reads
      expect(mockPrismaRls.adoptionApplication.findMany).not.toHaveBeenCalled();
    });

    it('should include animal.organization in the payload (D-16)', async () => {
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue([]);
      mockPublicPrisma.adoptionApplication.count.mockResolvedValue(0);

      await service.findMyApplications('user-1', { page: 1, limit: 10 });

      const call = mockPublicPrisma.adoptionApplication.findMany.mock.calls[0][0];
      expect(call.include.animal.include.organization).toEqual({
        select: { id: true, name: true, slug: true, logoUrl: true },
      });
    });
  });

  describe('findById', () => {
    it('should use rlsBypassPrisma and include animal.organization (D-16 + D-19-BE)', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
        animal: { organization: { id: 'org-1', name: 'Rescue' } },
      });

      const result = await service.findById('app-1', 'user-1');

      expect(result.id).toBe('app-1');
      expect(mockPublicPrisma.adoptionApplication.findUnique).toHaveBeenCalled();
      // Must NOT use prismaRls for adopter read
      expect(mockPrismaRls.adoptionApplication.findUnique).not.toHaveBeenCalled();

      const call = mockPublicPrisma.adoptionApplication.findUnique.mock.calls[0][0];
      expect(call.include.animal.include.organization).toEqual({
        select: { id: true, name: true, slug: true, logoUrl: true },
      });
    });

    it('should throw ForbiddenException when caller is not the application owner', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'other-user',
      });

      await expect(service.findById('app-1', 'user-1')).rejects.toThrow(ForbiddenException);
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

      await service.findAllByOrg({ page: 1, limit: 10, status: 'REVIEWING' });

      expect(mockPrismaRls.adoptionApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'REVIEWING' }),
        }),
      );
    });
  });

  describe('checkExisting', () => {
    it('should return { exists: true, applicationId } when non-WITHDRAWN application exists', async () => {
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue({ id: 'app-1' });

      const result = await service.checkExisting('animal-1', 'user-1');

      expect(result.exists).toBe(true);
      expect(result.applicationId).toBe('app-1');
      expect(mockPublicPrisma.adoptionApplication.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            animalId: 'animal-1',
            userId: 'user-1',
            status: { not: 'WITHDRAWN' },
          }),
        }),
      );
    });

    it('should return { exists: false } when only matching row is WITHDRAWN (D-18-BE)', async () => {
      // findFirst with status filter returns null because the only match is WITHDRAWN
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);

      const result = await service.checkExisting('animal-1', 'user-1');

      expect(result.exists).toBe(false);
      expect(result.applicationId).toBeUndefined();
    });

    it('should return { exists: false } when no application exists at all', async () => {
      mockPublicPrisma.adoptionApplication.findFirst.mockResolvedValue(null);

      const result = await service.checkExisting('animal-1', 'user-1');

      expect(result.exists).toBe(false);
    });
  });

  describe('updateStatus', () => {
    const validTransitions = [
      ['SUBMITTED', 'REVIEWING'],
      ['REVIEWING', 'APPROVED'],
      ['REVIEWING', 'REJECTED'],
      ['REVIEWING', 'FOLLOW_UP'],
      ['FOLLOW_UP', 'APPROVED'],
      ['APPROVED', 'ADOPTED'],
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

    it('should throw BadRequestException for invalid transition SUBMITTED -> APPROVED', async () => {
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'SUBMITTED',
      });

      await expect(service.updateStatus('app-1', 'APPROVED', 'staff-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should call auditService.log on every status change', async () => {
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'SUBMITTED',
      });
      mockPrismaRls.adoptionApplication.update.mockResolvedValue({
        id: 'app-1',
        status: 'REVIEWING',
      });

      await service.updateStatus('app-1', 'REVIEWING', 'staff-1');

      expect(mockAuditService.log).toHaveBeenCalledWith(
        'application.status_change',
        'staff-1',
        expect.objectContaining({
          applicationId: 'app-1',
          oldStatus: 'SUBMITTED',
          newStatus: 'REVIEWING',
        }),
      );
    });
  });

  describe('withdraw', () => {
    const nonWithdrawableStatuses = [
      'APPROVED',
      'FOLLOW_UP',
      'ADOPTED',
      'REJECTED',
      'RETURNED',
    ];

    for (const status of nonWithdrawableStatuses) {
      it(`should throw BadRequestException when status is ${status} (D-17)`, async () => {
        mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
          id: 'app-1',
          userId: 'user-1',
          status,
        });

        await expect(service.withdraw('app-1', 'user-1')).rejects.toThrow(BadRequestException);
      });
    }

    it('should throw ForbiddenException when user is not the owner', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'other-user',
        status: 'SUBMITTED',
      });

      await expect(service.withdraw('app-1', 'user-1')).rejects.toThrow(ForbiddenException);
    });

    for (const status of ['SUBMITTED', 'REVIEWING']) {
      it(`should set status to WITHDRAWN when current status is ${status}`, async () => {
        mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
          id: 'app-1',
          userId: 'user-1',
          status,
        });
        mockPublicPrisma.adoptionApplication.update.mockResolvedValue({
          id: 'app-1',
          status: 'WITHDRAWN',
        });

        const result = await service.withdraw('app-1', 'user-1');

        expect(result.status).toBe('WITHDRAWN');
        expect(mockAuditService.log).toHaveBeenCalledWith(
          'application.withdraw',
          'user-1',
          expect.objectContaining({ applicationId: 'app-1' }),
        );
        expect(mockEventsService.emitApplicationWithdrawn).toHaveBeenCalledWith('app-1');
      });
    }
  });

  // ─── Phase 17 — 48h reflexión gate skeletons (Plan 04 un-skips) ─────────────
  //
  // These skeleton describe.skip blocks are Wave 0 scaffolds (per SAFEGUARD-02).
  // English enum literals (SUBMITTED/REVIEWING/APPROVED/IN_REFLECTION/FINALIZED)
  // per D-02. Plan 04 un-skips the block and fills real assertions.

  describe.skip('Phase 17 — 48h reflexión gate (Plan 04 un-skips)', () => {
    it('[SAFEGUARD-02] FINALIZED blocked before approvedAt + 48h (pure timestamp comparison)', async () => {
      // Setup: application status=IN_REFLECTION, approvedAt=now (gate not elapsed).
      // Expectation: service.finalize() throws UnprocessableEntityException.
      const now = new Date();
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'IN_REFLECTION',
        approvedAt: now, // gate: now + 48h has NOT elapsed
      });

      // TODO(plan 04): call service.finalize() (or updateStatus to FINALIZED) and
      // assert it throws UnprocessableEntityException.
      expect(true).toBe(false); // stub — Plan 04 replaces with real call
    });

    it('[SAFEGUARD-02] FINALIZED allowed after approvedAt + 48h (pure timestamp comparison)', async () => {
      // Setup: application status=IN_REFLECTION, approvedAt=3 days ago.
      // Expectation: finalize succeeds and returns a FINALIZED application.
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      mockPrismaRls.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        status: 'IN_REFLECTION',
        approvedAt: threeDaysAgo, // gate: 48h has elapsed
      });
      mockPrismaRls.adoptionApplication.update.mockResolvedValue({
        id: 'app-1',
        status: 'FINALIZED',
      });

      // TODO(plan 04): call service.finalize() / updateStatus('FINALIZED') and
      // assert result.status === 'FINALIZED'.
      expect(true).toBe(false); // stub — Plan 04 replaces with real call
    });
  });

  describe('findStatusHistory', () => {
    it('should enforce ownership via findById then return audit entries', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'user-1',
      });
      const auditEntries = [
        { id: 'a1', action: 'application.create', createdAt: new Date('2026-01-01') },
        {
          id: 'a2',
          action: 'application.status_change',
          createdAt: new Date('2026-01-02'),
        },
      ];
      mockAuditService.findByApplication.mockResolvedValue(auditEntries);

      const result = await service.findStatusHistory('app-1', 'user-1');

      expect(result).toEqual(auditEntries);
      expect(mockPublicPrisma.adoptionApplication.findUnique).toHaveBeenCalled();
      expect(mockAuditService.findByApplication).toHaveBeenCalledWith('app-1');
    });

    it('should propagate ForbiddenException when caller is not the owner', async () => {
      mockPublicPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-1',
        userId: 'other-user',
      });

      await expect(service.findStatusHistory('app-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockAuditService.findByApplication).not.toHaveBeenCalled();
    });
  });
});
