import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AuditService } from '../audit/audit.service';

interface CreateAnimalInput {
  name: string;
  description?: string;
  speciesId: string;
  breed?: string;
  gender?: string;
  ageMonths?: number;
  size?: string;
  energyLevel?: string;
  goodWithKids?: boolean;
  goodWithDogs?: boolean;
  goodWithCats?: boolean;
  goodWithOtherPets?: boolean;
  specialNeeds?: string;
  vaccinated?: boolean;
  sterilized?: boolean;
  trained?: boolean;
}

interface AnimalQueryInput {
  page?: number;
  limit?: number;
  species?: string;
  size?: string;
  ageMin?: number;
  ageMax?: number;
  energyLevel?: string;
  organization?: string;
  search?: string;
  status?: string;
}

interface PhotoInput {
  url: string;
  key: string;
  caption?: string;
}

@Injectable()
export class AnimalsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    private readonly publicPrisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
  ) {}

  async create(dto: CreateAnimalInput, userId: string) {
    const animal = await this.prismaRls.animal.create({
      data: {
        name: dto.name,
        description: dto.description,
        speciesId: dto.speciesId,
        breed: dto.breed,
        gender: dto.gender,
        ageMonths: dto.ageMonths,
        size: dto.size,
        energyLevel: dto.energyLevel,
        goodWithKids: dto.goodWithKids,
        goodWithDogs: dto.goodWithDogs,
        goodWithCats: dto.goodWithCats,
        goodWithOtherPets: dto.goodWithOtherPets,
        specialNeeds: dto.specialNeeds,
        vaccinated: dto.vaccinated,
        sterilized: dto.sterilized,
        trained: dto.trained,
      },
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
      },
    });

    await this.auditService.log('animal.create', userId, {
      animalId: animal.id,
      name: animal.name,
    });

    return animal;
  }

  async update(id: string, dto: Partial<CreateAnimalInput>, userId: string) {
    const animal = await this.prismaRls.animal.update({
      where: { id },
      data: dto,
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
      },
    });

    await this.auditService.log('animal.update', userId, {
      animalId: id,
    });

    return animal;
  }

  async findById(id: string) {
    const animal = await this.publicPrisma.animal.findUnique({
      where: { id },
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
      },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    return animal;
  }

  async findByIdForOrg(id: string) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id },
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
      },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    return animal;
  }

  async findAllByOrg(query: AnimalQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.status) {
      where.status = query.status;
    }

    const [data, total] = await Promise.all([
      this.prismaRls.animal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          species: true,
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      this.prismaRls.animal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findPublic(query: AnimalQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'AVAILABLE',
    };

    if (query.species) {
      where.species = { slug: query.species };
    }

    if (query.size) {
      where.size = query.size;
    }

    if (query.energyLevel) {
      where.energyLevel = query.energyLevel;
    }

    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      where.ageMonths = {};
      if (query.ageMin !== undefined) {
        where.ageMonths.gte = query.ageMin;
      }
      if (query.ageMax !== undefined) {
        where.ageMonths.lte = query.ageMax;
      }
    }

    if (query.organization) {
      where.organization = { slug: query.organization };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.publicPrisma.animal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          species: true,
          organization: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      this.publicPrisma.animal.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOrgSlug(slug: string, query: AnimalQueryInput) {
    return this.findPublic({ ...query, organization: slug });
  }

  async updateStatus(id: string, status: string, userId: string) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    // Validate transitions
    const validTransitions: Record<string, string[]> = {
      AVAILABLE: ['IN_PROCESS', 'ADOPTED'],
      IN_PROCESS: ['AVAILABLE', 'ADOPTED'],
      ADOPTED: ['AVAILABLE'],
      ARCHIVED: ['AVAILABLE'],
    };

    const allowed = validTransitions[animal.status] || [];
    if (!allowed.includes(status)) {
      throw new BadRequestException(
        `Cannot transition from ${animal.status} to ${status}`,
      );
    }

    const updated = await this.prismaRls.animal.update({
      where: { id },
      data: { status },
      include: { species: true },
    });

    await this.auditService.log('animal.status_change', userId, {
      animalId: id,
      oldStatus: animal.status,
      newStatus: status,
    });

    return updated;
  }

  async archive(id: string, userId: string) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    const updated = await this.prismaRls.animal.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        archivedAt: new Date(),
      },
    });

    await this.auditService.log('animal.archive', userId, {
      animalId: id,
      name: animal.name,
    });

    return updated;
  }

  async restore(id: string, userId: string) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    const updated = await this.prismaRls.animal.update({
      where: { id },
      data: {
        status: 'AVAILABLE',
        archivedAt: null,
      },
    });

    await this.auditService.log('animal.restore', userId, {
      animalId: id,
      name: animal.name,
    });

    return updated;
  }

  async hardDelete(id: string, userId: string) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id },
      include: { photos: true },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    // Delete photos from S3
    for (const photo of animal.photos) {
      try {
        await this.uploadService.deleteObject(photo.key);
      } catch {
        // Log but don't block deletion
      }
    }

    await this.prismaRls.animal.delete({
      where: { id },
    });

    await this.auditService.log('animal.delete', userId, {
      animalId: id,
      name: animal.name,
    });
  }

  async addPhotos(animalId: string, photos: PhotoInput[]) {
    const animal = await this.prismaRls.animal.findUnique({
      where: { id: animalId },
      include: { photos: true },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${animalId} not found`);
    }

    // Get current max position
    const existingPhotos = await this.prismaRls.animalPhoto.findMany({
      where: { animalId },
      orderBy: { position: 'desc' },
      take: 1,
    });
    const startPosition = existingPhotos.length > 0 ? existingPhotos[0].position + 1 : 0;

    const createdPhotos = [];
    for (let i = 0; i < photos.length; i++) {
      const photo = await this.prismaRls.animalPhoto.create({
        data: {
          animalId,
          url: photos[i].url,
          key: photos[i].key,
          caption: photos[i].caption,
          position: startPosition + i,
        },
      });
      createdPhotos.push(photo);
    }

    // Set first photo as cover if no cover set
    if (!animal.coverPhotoId && createdPhotos.length > 0) {
      await this.prismaRls.animal.update({
        where: { id: animalId },
        data: { coverPhotoId: createdPhotos[0].id },
      });
    }

    return createdPhotos;
  }

  async removePhoto(animalId: string, photoId: string) {
    const photo = await this.prismaRls.animalPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.animalId !== animalId) {
      throw new NotFoundException('Photo not found');
    }

    // Delete from S3
    try {
      await this.uploadService.deleteObject(photo.key);
    } catch {
      // Log but don't block
    }

    await this.prismaRls.animalPhoto.delete({
      where: { id: photoId },
    });

    // If removed photo was cover, set next photo or null
    const animal = await this.prismaRls.animal.findUnique({
      where: { id: animalId },
    });

    if (animal?.coverPhotoId === photoId) {
      const nextPhoto = await this.prismaRls.animalPhoto.findMany({
        where: { animalId },
        orderBy: { position: 'asc' },
        take: 1,
      });

      await this.prismaRls.animal.update({
        where: { id: animalId },
        data: { coverPhotoId: nextPhoto.length > 0 ? nextPhoto[0].id : null },
      });
    }
  }

  async setCoverPhoto(animalId: string, photoId: string) {
    const photo = await this.prismaRls.animalPhoto.findUnique({
      where: { id: photoId },
    });

    if (!photo || photo.animalId !== animalId) {
      throw new BadRequestException('Photo does not belong to this animal');
    }

    await this.prismaRls.animal.update({
      where: { id: animalId },
      data: { coverPhotoId: photoId },
    });
  }

  async reorderPhotos(animalId: string, photoIds: string[]) {
    for (let i = 0; i < photoIds.length; i++) {
      await this.prismaRls.animalPhoto.update({
        where: { id: photoIds[i] },
        data: { position: i },
      });
    }
  }

  async getStats(orgId?: string) {
    const prisma = orgId ? this.publicPrisma : this.prismaRls;
    const where = orgId ? { organizationId: orgId } : {};

    const [total, available, inProcess, adopted, archived] = await Promise.all([
      prisma.animal.count({ where }),
      prisma.animal.count({ where: { ...where, status: 'AVAILABLE' } }),
      prisma.animal.count({ where: { ...where, status: 'IN_PROCESS' } }),
      prisma.animal.count({ where: { ...where, status: 'ADOPTED' } }),
      prisma.animal.count({ where: { ...where, status: 'ARCHIVED' } }),
    ]);

    return { total, available, inProcess, adopted, archived };
  }
}
