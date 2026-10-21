import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EncuentroService } from './encuentro.service.js';
import { EncuentroRecomendacion } from './dto/complete-encuentro.dto.js';

// String enum aligned with AdoptionCategory in schema.prisma (codebase convention)
const AdoptionCategory = {
  SALUDABLE_ADULTO: 'SALUDABLE_ADULTO',
  SENIOR: 'SENIOR',
  MEDICO_CRONICO: 'MEDICO_CRONICO',
  REACTIVO: 'REACTIVO',
  ESPECIAL: 'ESPECIAL',
} as const;

const mockRlsPrisma = {
  encuentro: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  adoptionApplication: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
};

const mockCls = {
  get: vi.fn(),
};

describe('EncuentroService', () => {
  let service: EncuentroService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EncuentroService(mockRlsPrisma as any, mockCls as any);
  });

  describe('schedule()', () => {
    it('creates an encuentro with scheduledAt and leaves completedAt null', async () => {
      const applicationId = 'app-uuid-1';
      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: applicationId,
        status: 'IN_MEETING',
      });
      mockRlsPrisma.encuentro.findUnique.mockResolvedValue(null);
      const scheduledAt = new Date('2026-08-01T10:00:00Z');
      mockRlsPrisma.encuentro.create.mockResolvedValue({
        id: 'enc-uuid-1',
        applicationId,
        scheduledAt,
        completedAt: null,
        location: 'Refugio Central',
        address: null,
        recomendacion: null,
        notes: null,
        alertSignals: null,
        fosterRequired: false,
        counselorId: 'counselor-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      const result = await service.schedule({
        applicationId,
        scheduledAt: scheduledAt.toISOString(),
        location: 'Refugio Central',
      });

      expect(result.completedAt).toBeNull();
      expect(result.scheduledAt).toEqual(scheduledAt);
      expect(mockRlsPrisma.encuentro.create).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.schedule({
          applicationId: 'nonexistent',
          scheduledAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when encuentro already exists for this application', async () => {
      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-uuid-1',
        status: 'IN_MEETING',
      });
      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: 'enc-uuid-existing',
        applicationId: 'app-uuid-1',
      });

      await expect(
        service.schedule({
          applicationId: 'app-uuid-1',
          scheduledAt: new Date().toISOString(),
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete()', () => {
    it('sets recomendacion and completedAt when completing an encuentro', async () => {
      const applicationId = 'app-uuid-2';
      const encuentroId = 'enc-uuid-2';
      const now = new Date();

      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: encuentroId,
        applicationId,
        completedAt: null,
        application: {
          id: applicationId,
          animal: { adoptionCategory: AdoptionCategory.SALUDABLE_ADULTO },
        },
      });
      mockRlsPrisma.encuentro.update.mockResolvedValue({
        id: encuentroId,
        applicationId,
        recomendacion: EncuentroRecomendacion.PROCEED,
        completedAt: now,
        notes: 'All good',
        alertSignals: null,
        fosterRequired: false,
      });
      mockRlsPrisma.adoptionApplication.update.mockResolvedValue({});
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      const result = await service.complete(encuentroId, {
        recomendacion: EncuentroRecomendacion.PROCEED,
        notes: 'All good',
        hasCategoryExperience: true,
      });

      expect(result.completedAt).not.toBeNull();
      expect(result.recomendacion).toBe(EncuentroRecomendacion.PROCEED);
      expect(mockRlsPrisma.encuentro.update).toHaveBeenCalledOnce();
    });

    it('sets fosterRequired=true on application when complex category and hasCategoryExperience=false', async () => {
      const applicationId = 'app-uuid-3';
      const encuentroId = 'enc-uuid-3';

      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: encuentroId,
        applicationId,
        completedAt: null,
        application: {
          id: applicationId,
          animal: { adoptionCategory: AdoptionCategory.SENIOR },
        },
      });
      mockRlsPrisma.encuentro.update.mockResolvedValue({
        id: encuentroId,
        applicationId,
        recomendacion: EncuentroRecomendacion.REQUIRES_FOSTER,
        completedAt: new Date(),
        fosterRequired: true,
      });
      mockRlsPrisma.adoptionApplication.update.mockResolvedValue({
        id: applicationId,
        fosterRequired: true,
      });
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      await service.complete(encuentroId, {
        recomendacion: EncuentroRecomendacion.REQUIRES_FOSTER,
        hasCategoryExperience: false,
      });

      // Application must be updated to set fosterRequired=true
      expect(mockRlsPrisma.adoptionApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: applicationId },
          data: expect.objectContaining({ fosterRequired: true }),
        }),
      );
    });

    it('does NOT set fosterRequired when complex category but hasCategoryExperience=true', async () => {
      const applicationId = 'app-uuid-4';
      const encuentroId = 'enc-uuid-4';

      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: encuentroId,
        applicationId,
        completedAt: null,
        application: {
          id: applicationId,
          animal: { adoptionCategory: AdoptionCategory.REACTIVO },
        },
      });
      mockRlsPrisma.encuentro.update.mockResolvedValue({
        id: encuentroId,
        recomendacion: EncuentroRecomendacion.PROCEED,
        completedAt: new Date(),
        fosterRequired: false,
      });
      mockRlsPrisma.adoptionApplication.update.mockResolvedValue({});
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      await service.complete(encuentroId, {
        recomendacion: EncuentroRecomendacion.PROCEED,
        hasCategoryExperience: true,
      });

      // Application should NOT be updated with fosterRequired=true
      expect(mockRlsPrisma.adoptionApplication.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fosterRequired: true }),
        }),
      );
    });

    it('does NOT set fosterRequired for non-complex (SALUDABLE_ADULTO) category even with hasCategoryExperience=false', async () => {
      const applicationId = 'app-uuid-5';
      const encuentroId = 'enc-uuid-5';

      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: encuentroId,
        applicationId,
        completedAt: null,
        application: {
          id: applicationId,
          animal: { adoptionCategory: AdoptionCategory.SALUDABLE_ADULTO },
        },
      });
      mockRlsPrisma.encuentro.update.mockResolvedValue({
        id: encuentroId,
        recomendacion: EncuentroRecomendacion.PROCEED,
        completedAt: new Date(),
        fosterRequired: false,
      });
      mockRlsPrisma.adoptionApplication.update.mockResolvedValue({});
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      await service.complete(encuentroId, {
        recomendacion: EncuentroRecomendacion.PROCEED,
        hasCategoryExperience: false,
      });

      // For non-complex category, fosterRequired stays false — no update with true
      expect(mockRlsPrisma.adoptionApplication.update).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fosterRequired: true }),
        }),
      );
    });

    it('throws NotFoundException when encuentro does not exist', async () => {
      mockRlsPrisma.encuentro.findUnique.mockResolvedValue(null);

      await expect(
        service.complete('nonexistent-enc', {
          recomendacion: EncuentroRecomendacion.PROCEED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when encuentro is already completed', async () => {
      mockRlsPrisma.encuentro.findUnique.mockResolvedValue({
        id: 'enc-already-done',
        applicationId: 'app-uuid-6',
        completedAt: new Date(), // already completed
        application: {
          id: 'app-uuid-6',
          animal: { adoptionCategory: AdoptionCategory.SALUDABLE_ADULTO },
        },
      });

      await expect(
        service.complete('enc-already-done', {
          recomendacion: EncuentroRecomendacion.PROCEED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
