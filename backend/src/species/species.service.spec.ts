import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SpeciesService } from './species.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

const mockPrisma = {
  species: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};

describe('SpeciesService', () => {
  let service: SpeciesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SpeciesService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('should return all species sorted by name', async () => {
      const species = [
        { id: '1', name: 'Gato', slug: 'gato', createdAt: new Date() },
        { id: '2', name: 'Perro', slug: 'perro', createdAt: new Date() },
      ];
      mockPrisma.species.findMany.mockResolvedValue(species);

      const result = await service.findAll();

      expect(result).toEqual(species);
      expect(mockPrisma.species.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });
  });

  describe('create', () => {
    it('should generate slug and create species', async () => {
      const created = { id: '1', name: 'Perro', slug: 'perro', createdAt: new Date() };
      mockPrisma.species.create.mockResolvedValue(created);

      const result = await service.create({ name: 'Perro' });

      expect(result).toEqual(created);
      expect(mockPrisma.species.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Perro',
          slug: 'perro',
        }),
      });
    });

    it('should throw ConflictException if name already exists', async () => {
      mockPrisma.species.create.mockRejectedValue({
        code: 'P2002',
        meta: { target: ['name'] },
      });

      await expect(service.create({ name: 'Perro' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('findById', () => {
    it('should return species by ID', async () => {
      const species = { id: '1', name: 'Gato', slug: 'gato' };
      mockPrisma.species.findUnique.mockResolvedValue(species);

      const result = await service.findById('1');

      expect(result).toEqual(species);
    });

    it('should throw NotFoundException if not found', async () => {
      mockPrisma.species.findUnique.mockResolvedValue(null);

      await expect(service.findById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete species if no animals reference it', async () => {
      mockPrisma.species.findUnique.mockResolvedValue({
        id: '1',
        name: 'Gato',
        _count: { animals: 0 },
      });
      mockPrisma.species.delete.mockResolvedValue({ id: '1' });

      await service.delete('1');

      expect(mockPrisma.species.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
    });

    it('should throw ConflictException if animals reference species', async () => {
      mockPrisma.species.findUnique.mockResolvedValue({
        id: '1',
        name: 'Gato',
        _count: { animals: 5 },
      });

      await expect(service.delete('1')).rejects.toThrow(ConflictException);
    });
  });
});
