import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnimalsService } from './animals.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

const mockPrismaRls = {
  animal: {
    create: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  animalPhoto: {
    create: vi.fn(),
    createMany: vi.fn(),
    findUnique: vi.fn(),
    findMany: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

const mockPublicPrisma = {
  animal: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
};

const mockUploadService = {
  deleteObject: vi.fn(),
};

const mockAuditService = {
  log: vi.fn(),
};

describe('AnimalsService', () => {
  let service: AnimalsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AnimalsService(
      mockPrismaRls as any,
      mockPublicPrisma as any,
      mockUploadService as any,
      mockAuditService as any,
    );
  });

  describe('create', () => {
    it('should create animal with all profile fields and return it with species', async () => {
      const dto = {
        name: 'Max',
        speciesId: 'species-1',
        breed: 'Labrador',
        gender: 'MALE' as const,
        ageMonths: 24,
        size: 'LARGE' as const,
        energyLevel: 'HIGH' as const,
        goodWithKids: true,
        goodWithDogs: true,
        goodWithCats: false,
        goodWithOtherPets: false,
        vaccinated: true,
        sterilized: false,
        trained: true,
      };

      const createdAnimal = {
        id: 'animal-1',
        ...dto,
        status: 'AVAILABLE',
        organizationId: 'org-1',
        species: { id: 'species-1', name: 'Perro', slug: 'perro' },
      };

      mockPrismaRls.animal.create.mockResolvedValue(createdAnimal);

      const result = await service.create(dto, 'user-1');

      expect(result).toEqual(createdAnimal);
      expect(mockPrismaRls.animal.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Max',
            speciesId: 'species-1',
          }),
          include: expect.objectContaining({
            species: true,
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'animal.create',
        'user-1',
        expect.any(Object),
      );
    });
  });

  describe('findAllByOrg', () => {
    it('should return paginated animals for the org (any status)', async () => {
      const animals = [
        { id: 'a-1', name: 'Max', status: 'AVAILABLE' },
        { id: 'a-2', name: 'Luna', status: 'ADOPTED' },
      ];
      mockPrismaRls.animal.findMany.mockResolvedValue(animals);
      mockPrismaRls.animal.count.mockResolvedValue(2);

      const result = await service.findAllByOrg({ page: 1, limit: 12 });

      expect(result.data).toEqual(animals);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(12);
      expect(result.totalPages).toBe(1);
    });
  });

  describe('findPublic', () => {
    it('should return only AVAILABLE animals with pagination', async () => {
      const animals = [
        { id: 'a-1', name: 'Max', status: 'AVAILABLE' },
      ];
      mockPublicPrisma.animal.findMany.mockResolvedValue(animals);
      mockPublicPrisma.animal.count.mockResolvedValue(1);

      const result = await service.findPublic({ page: 1, limit: 12 });

      expect(result.data).toEqual(animals);
      expect(mockPublicPrisma.animal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'AVAILABLE',
          }),
        }),
      );
    });

    it('should filter by species, size, ageMin, ageMax, and search', async () => {
      mockPublicPrisma.animal.findMany.mockResolvedValue([]);
      mockPublicPrisma.animal.count.mockResolvedValue(0);

      await service.findPublic({
        page: 1,
        limit: 12,
        species: 'perro',
        size: 'LARGE',
        ageMin: 6,
        ageMax: 24,
        search: 'max',
      });

      expect(mockPublicPrisma.animal.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'AVAILABLE',
            species: expect.objectContaining({ slug: 'perro' }),
            size: 'LARGE',
            ageMonths: expect.objectContaining({ gte: 6, lte: 24 }),
          }),
        }),
      );
    });
  });

  describe('updateStatus', () => {
    it('should transition status correctly', async () => {
      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        status: 'AVAILABLE',
      });
      mockPrismaRls.animal.update.mockResolvedValue({
        id: 'a-1',
        status: 'IN_PROCESS',
      });

      const result = await service.updateStatus('a-1', 'IN_PROCESS', 'user-1');

      expect(result.status).toBe('IN_PROCESS');
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'animal.status_change',
        'user-1',
        expect.objectContaining({
          oldStatus: 'AVAILABLE',
          newStatus: 'IN_PROCESS',
        }),
      );
    });

    it('should allow reverting from ADOPTED to AVAILABLE', async () => {
      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        status: 'ADOPTED',
      });
      mockPrismaRls.animal.update.mockResolvedValue({
        id: 'a-1',
        status: 'AVAILABLE',
      });

      const result = await service.updateStatus('a-1', 'AVAILABLE', 'user-1');

      expect(result.status).toBe('AVAILABLE');
    });
  });

  describe('archive', () => {
    it('should set status to ARCHIVED and archivedAt', async () => {
      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        status: 'AVAILABLE',
      });
      mockPrismaRls.animal.update.mockResolvedValue({
        id: 'a-1',
        status: 'ARCHIVED',
        archivedAt: new Date(),
      });

      const result = await service.archive('a-1', 'user-1');

      expect(result.status).toBe('ARCHIVED');
      expect(mockPrismaRls.animal.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'ARCHIVED',
            archivedAt: expect.any(Date),
          }),
        }),
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'animal.archive',
        'user-1',
        expect.any(Object),
      );
    });
  });

  describe('hardDelete', () => {
    it('should remove animal and call deleteObject for each photo', async () => {
      const photos = [
        { id: 'p-1', key: 'animals/uuid1/photo1.jpg' },
        { id: 'p-2', key: 'animals/uuid2/photo2.jpg' },
      ];
      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        name: 'Max',
        photos,
      });
      mockPrismaRls.animal.delete.mockResolvedValue({ id: 'a-1' });

      await service.hardDelete('a-1', 'user-1');

      expect(mockUploadService.deleteObject).toHaveBeenCalledTimes(2);
      expect(mockUploadService.deleteObject).toHaveBeenCalledWith('animals/uuid1/photo1.jpg');
      expect(mockUploadService.deleteObject).toHaveBeenCalledWith('animals/uuid2/photo2.jpg');
      expect(mockPrismaRls.animal.delete).toHaveBeenCalledWith({
        where: { id: 'a-1' },
      });
      expect(mockAuditService.log).toHaveBeenCalledWith(
        'animal.delete',
        'user-1',
        expect.any(Object),
      );
    });
  });

  describe('addPhotos', () => {
    it('should create AnimalPhoto records with position', async () => {
      const photos = [
        { url: 'http://minio/photo1.jpg', key: 'animals/u/photo1.jpg' },
        { url: 'http://minio/photo2.jpg', key: 'animals/u/photo2.jpg', caption: 'cute' },
      ];

      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        coverPhotoId: null,
        photos: [],
      });
      mockPrismaRls.animalPhoto.findMany.mockResolvedValue([]);
      mockPrismaRls.animalPhoto.create
        .mockResolvedValueOnce({ id: 'p-1', ...photos[0], position: 0 })
        .mockResolvedValueOnce({ id: 'p-2', ...photos[1], position: 1 });
      mockPrismaRls.animal.update.mockResolvedValue({ id: 'a-1', coverPhotoId: 'p-1' });

      const result = await service.addPhotos('a-1', photos);

      expect(result).toHaveLength(2);
      expect(mockPrismaRls.animalPhoto.create).toHaveBeenCalledTimes(2);
    });
  });

  describe('removePhoto', () => {
    it('should delete photo and call UploadService.deleteObject', async () => {
      mockPrismaRls.animalPhoto.findUnique.mockResolvedValue({
        id: 'p-1',
        animalId: 'a-1',
        key: 'animals/u/photo.jpg',
      });
      mockPrismaRls.animal.findUnique.mockResolvedValue({
        id: 'a-1',
        coverPhotoId: 'p-2',
      });
      mockPrismaRls.animalPhoto.delete.mockResolvedValue({ id: 'p-1' });

      await service.removePhoto('a-1', 'p-1');

      expect(mockUploadService.deleteObject).toHaveBeenCalledWith('animals/u/photo.jpg');
      expect(mockPrismaRls.animalPhoto.delete).toHaveBeenCalledWith({
        where: { id: 'p-1' },
      });
    });
  });

  describe('setCoverPhoto', () => {
    it('should update animal coverPhotoId', async () => {
      mockPrismaRls.animalPhoto.findUnique.mockResolvedValue({
        id: 'p-1',
        animalId: 'a-1',
      });
      mockPrismaRls.animal.update.mockResolvedValue({
        id: 'a-1',
        coverPhotoId: 'p-1',
      });

      await service.setCoverPhoto('a-1', 'p-1');

      expect(mockPrismaRls.animal.update).toHaveBeenCalledWith({
        where: { id: 'a-1' },
        data: { coverPhotoId: 'p-1' },
      });
    });
  });

  describe('reorderPhotos', () => {
    it('should update position values', async () => {
      const photoIds = ['p-2', 'p-1', 'p-3'];

      await service.reorderPhotos('a-1', photoIds);

      expect(mockPrismaRls.animalPhoto.update).toHaveBeenCalledTimes(3);
      expect(mockPrismaRls.animalPhoto.update).toHaveBeenCalledWith({
        where: { id: 'p-2' },
        data: { position: 0 },
      });
      expect(mockPrismaRls.animalPhoto.update).toHaveBeenCalledWith({
        where: { id: 'p-1' },
        data: { position: 1 },
      });
      expect(mockPrismaRls.animalPhoto.update).toHaveBeenCalledWith({
        where: { id: 'p-3' },
        data: { position: 2 },
      });
    });
  });
});
