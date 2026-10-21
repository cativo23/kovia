import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { FosterService } from './foster.service.js';
import { FosterOutcome } from './dto/complete-foster.dto.js';

const mockRlsPrisma = {
  fosterPeriod: {
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  adoptionApplication: {
    findUnique: vi.fn(),
  },
};

const mockCls = {
  get: vi.fn(),
};

describe('FosterService', () => {
  let service: FosterService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FosterService(mockRlsPrisma as any, mockCls as any);
  });

  describe('start()', () => {
    it('creates a FosterPeriod row with outcome null', async () => {
      const applicationId = 'app-foster-uuid-1';
      const startedAt = new Date('2026-08-01T08:00:00Z');

      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: applicationId,
        status: 'IN_FOSTER',
      });
      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue(null);
      mockRlsPrisma.fosterPeriod.create.mockResolvedValue({
        id: 'foster-uuid-1',
        applicationId,
        startedAt,
        endedAt: null,
        outcome: null,
        counselorNotes: null,
        counselorId: 'counselor-uuid-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      const result = await service.start({
        applicationId,
        startedAt: startedAt.toISOString(),
      });

      expect(result.outcome).toBeNull();
      expect(result.endedAt).toBeNull();
      expect(mockRlsPrisma.fosterPeriod.create).toHaveBeenCalledOnce();
    });

    it('throws NotFoundException when application does not exist', async () => {
      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.start({
          applicationId: 'nonexistent',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when a FosterPeriod already exists for this application', async () => {
      mockRlsPrisma.adoptionApplication.findUnique.mockResolvedValue({
        id: 'app-foster-uuid-2',
        status: 'IN_FOSTER',
      });
      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue({
        id: 'foster-existing',
        applicationId: 'app-foster-uuid-2',
      });

      await expect(
        service.start({ applicationId: 'app-foster-uuid-2' }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('complete()', () => {
    it('sets outcome=PROCEED and endedAt when completing with PROCEED', async () => {
      const fosterPeriodId = 'foster-uuid-3';
      const applicationId = 'app-foster-uuid-3';
      const now = new Date();

      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue({
        id: fosterPeriodId,
        applicationId,
        outcome: null,
        endedAt: null,
      });
      mockRlsPrisma.fosterPeriod.update.mockResolvedValue({
        id: fosterPeriodId,
        applicationId,
        outcome: FosterOutcome.PROCEED,
        endedAt: now,
        counselorNotes: null,
      });
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      const result = await service.complete(fosterPeriodId, {
        outcome: FosterOutcome.PROCEED,
      });

      expect(result.outcome).toBe(FosterOutcome.PROCEED);
      expect(result.endedAt).not.toBeNull();
    });

    it('sets outcome=REJECTED and records rejection', async () => {
      const fosterPeriodId = 'foster-uuid-4';
      const applicationId = 'app-foster-uuid-4';

      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue({
        id: fosterPeriodId,
        applicationId,
        outcome: null,
        endedAt: null,
      });
      mockRlsPrisma.fosterPeriod.update.mockResolvedValue({
        id: fosterPeriodId,
        applicationId,
        outcome: FosterOutcome.REJECTED,
        endedAt: new Date(),
        counselorNotes: 'Animal and adopter incompatible',
      });
      mockCls.get.mockReturnValue({ id: 'counselor-uuid-1' });

      const result = await service.complete(fosterPeriodId, {
        outcome: FosterOutcome.REJECTED,
        counselorNotes: 'Animal and adopter incompatible',
      });

      expect(result.outcome).toBe(FosterOutcome.REJECTED);
      expect(mockRlsPrisma.fosterPeriod.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            outcome: FosterOutcome.REJECTED,
          }),
        }),
      );
    });

    it('throws NotFoundException when foster period does not exist', async () => {
      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue(null);

      await expect(
        service.complete('nonexistent-foster', { outcome: FosterOutcome.PROCEED }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when foster period is already completed', async () => {
      mockRlsPrisma.fosterPeriod.findUnique.mockResolvedValue({
        id: 'foster-already-done',
        applicationId: 'app-uuid-5',
        outcome: FosterOutcome.PROCEED, // already completed
        endedAt: new Date(),
      });

      await expect(
        service.complete('foster-already-done', { outcome: FosterOutcome.PROCEED }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
