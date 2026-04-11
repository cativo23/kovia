import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AdoptersService } from './adopters.service';

const makeApp = (overrides: Record<string, any> = {}) => ({
  id: 'app-1',
  userId: 'user-1',
  organizationId: 'org-current',
  status: 'ENVIADA',
  submittedAt: new Date('2026-01-15'),
  updatedAt: new Date('2026-01-16'),
  score: 85,
  animal: {
    name: 'Max',
    species: { name: 'Perro' },
  },
  ...overrides,
});

// Mock publicPrisma
const mockPublicPrisma = {
  adoptionApplication: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

// Mock ClsService
const mockCls = {
  get: vi.fn(),
};

describe('AdoptersService', () => {
  let service: AdoptersService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCls.get.mockReturnValue('org-current');
    service = new AdoptersService(mockPublicPrisma as any, mockCls as any);
  });

  describe('getHistory', () => {
    it('returns full data for current org applications (isOwnOrg=true, score included, animalName included)', async () => {
      const app = makeApp({ organizationId: 'org-current', score: 80, status: 'ADOPTADA' });
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue([app]);

      const result = await service.getHistory('user-1');

      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].isOwnOrg).toBe(true);
      expect(result.applications[0].animalName).toBe('Max');
      expect(result.applications[0].score).toBe(80);
    });

    it('returns only summaries for other org applications (isOwnOrg=false, score=null, animalName=null)', async () => {
      const app = makeApp({ organizationId: 'org-other', score: 72, status: 'RECHAZADA' });
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue([app]);

      const result = await service.getHistory('user-1');

      expect(result.applications).toHaveLength(1);
      expect(result.applications[0].isOwnOrg).toBe(false);
      expect(result.applications[0].animalName).toBeNull();
      expect(result.applications[0].score).toBeNull();
      // Species is still visible cross-org
      expect(result.applications[0].animalSpecies).toBe('Perro');
    });

    it('computes summary counts correctly (total, adopted, returned)', async () => {
      const apps = [
        makeApp({ id: 'a1', status: 'ADOPTADA', organizationId: 'org-current' }),
        makeApp({ id: 'a2', status: 'DEVUELTA', organizationId: 'org-current' }),
        makeApp({ id: 'a3', status: 'RECHAZADA', organizationId: 'org-current' }),
      ];
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue(apps);

      const result = await service.getHistory('user-1');

      expect(result.summary.totalApplications).toBe(3);
      expect(result.summary.adopted).toBe(1);
      expect(result.summary.returned).toBe(1);
    });

    it('counts DEVUELTA status in returned', async () => {
      const apps = [
        makeApp({ id: 'a1', status: 'DEVUELTA', organizationId: 'org-current' }),
        makeApp({ id: 'a2', status: 'DEVUELTA', organizationId: 'org-other' }),
        makeApp({ id: 'a3', status: 'ADOPTADA', organizationId: 'org-current' }),
      ];
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue(apps);

      const result = await service.getHistory('user-1');

      expect(result.summary.returned).toBe(2);
      expect(result.summary.adopted).toBe(1);
    });

    it('returns applications in descending submittedAt order (most recent first)', async () => {
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue([
        makeApp({ id: 'a1', submittedAt: new Date('2026-03-01'), organizationId: 'org-current' }),
        makeApp({ id: 'a2', submittedAt: new Date('2026-01-01'), organizationId: 'org-current' }),
      ]);

      const result = await service.getHistory('user-1');

      // Verify the query was called with desc order
      expect(mockPublicPrisma.adoptionApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { submittedAt: 'desc' },
        }),
      );
      // First result is most recent
      expect(result.applications[0].id).toBe('a1');
    });

    it('uses cls.get("orgId") to determine current org context', async () => {
      mockCls.get.mockReturnValue('org-specific');
      mockPublicPrisma.adoptionApplication.findMany.mockResolvedValue([
        makeApp({ organizationId: 'org-specific', score: 90 }),
      ]);

      const result = await service.getHistory('user-1');

      expect(mockCls.get).toHaveBeenCalledWith('orgId');
      expect(result.applications[0].isOwnOrg).toBe(true);
    });
  });

  describe('getSummary', () => {
    it('returns correct counts (totalApplications, adopted, returned)', async () => {
      mockPublicPrisma.adoptionApplication.count
        .mockResolvedValueOnce(5) // total
        .mockResolvedValueOnce(2) // adopted
        .mockResolvedValueOnce(1); // returned

      const result = await service.getSummary('user-1');

      expect(result.totalApplications).toBe(5);
      expect(result.adopted).toBe(2);
      expect(result.returned).toBe(1);
    });

    it('queries count with correct userId filter', async () => {
      mockPublicPrisma.adoptionApplication.count.mockResolvedValue(0);

      await service.getSummary('user-xyz');

      expect(mockPublicPrisma.adoptionApplication.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ userId: 'user-xyz' }) }),
      );
    });

    it('queries ADOPTADA and DEVUELTA status counts separately', async () => {
      mockPublicPrisma.adoptionApplication.count.mockResolvedValue(0);

      await service.getSummary('user-1');

      expect(mockPublicPrisma.adoptionApplication.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'ADOPTADA' } }),
      );
      expect(mockPublicPrisma.adoptionApplication.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 'user-1', status: 'DEVUELTA' } }),
      );
    });
  });
});
