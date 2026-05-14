import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PublicPrismaService } from '../prisma/public-prisma.service';
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
  // Phase 15 dossier fields (per D-05 / 15-02 plan)
  // NOTE: dossierComplete and dossierVersion are deliberately absent —
  // they are server-computed (D-08, D-09).
  adoptionCategory?: string;
  behavioralEvaluation?: string;
  medicalHistory?: string;
  monthlyCostUsdMin?: number;
  monthlyCostUsdMax?: number;
  knownTriggers?: string[];
  shelterEntryDate?: Date;
}

// The 7 dossier-field names that, when present in an update payload, trigger
// a dossierVersion bump (D-09 staleness mechanism).
const DOSSIER_FIELDS = [
  'adoptionCategory',
  'behavioralEvaluation',
  'medicalHistory',
  'monthlyCostUsdMin',
  'monthlyCostUsdMax',
  'knownTriggers',
  'shelterEntryDate',
] as const;

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
    private readonly rlsBypassPrisma: PublicPrismaService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
    private readonly cls: ClsService,
  ) {}

  async create(dto: CreateAnimalInput, userId: string) {
    const organizationId = this.cls.get('organizationId') as string;
    // Build initial data
    const data: any = {
      name: dto.name,
      description: dto.description,
      species: { connect: { id: dto.speciesId } },
      organization: { connect: { id: organizationId } },
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
      // Phase 15 dossier fields — passed straight through; service-side recompute
      // below decides dossierComplete (server-only, never client-controlled).
      adoptionCategory: dto.adoptionCategory,
      behavioralEvaluation: dto.behavioralEvaluation,
      medicalHistory: dto.medicalHistory,
      monthlyCostUsdMin: dto.monthlyCostUsdMin,
      monthlyCostUsdMax: dto.monthlyCostUsdMax,
      knownTriggers: dto.knownTriggers,
      shelterEntryDate: dto.shelterEntryDate,
    };

    const animal = await this.prismaRls.animal.create({
      data,
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
      },
    });

    // If the creating refugio happened to fill the 5 required dossier fields at
    // create-time, flip dossierComplete=true (D-08). dossierVersion stays at the
    // schema default (1) on create; bumps only happen on subsequent updates.
    // Treat a missing/undefined dossierComplete as false (schema default) so
    // we only persist a real flip.
    const complete = this.computeDossierComplete(animal);
    const priorComplete = animal.dossierComplete === true;
    if (complete !== priorComplete) {
      const recomputed = await this.prismaRls.animal.update({
        where: { id: animal.id },
        data: { dossierComplete: complete },
        include: {
          species: true,
          photos: { orderBy: { position: 'asc' } },
        },
      });
      await this.auditService.log('animal.create', userId, {
        animalId: recomputed.id,
        name: recomputed.name,
      });
      return recomputed;
    }

    await this.auditService.log('animal.create', userId, {
      animalId: animal.id,
      name: animal.name,
    });

    return animal;
  }

  async update(id: string, dto: Partial<CreateAnimalInput>, userId: string) {
    // 1. Strip server-computed fields from the inbound payload (defense-in-depth
    //    against T-15-06 / T-15-Dossier-Version-Stale — at the HTTP boundary
    //    ValidationPipe.forbidNonWhitelisted already rejects unknown keys, but
    //    a service-level caller using `any` casts must also be neutered).
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      dossierComplete: _dropDossierComplete,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      dossierVersion: _dropDossierVersion,
      ...safeDto
    } = dto as Partial<CreateAnimalInput> & {
      dossierComplete?: unknown;
      dossierVersion?: unknown;
    };

    // 2. Look up the prior animal to read its current dossierVersion AND its
    //    current dossier-field values (needed by the recompute step below).
    const prev = await this.prismaRls.animal.findUnique({ where: { id } });
    if (!prev) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    // 3. If the incoming payload touches any dossier field, bump dossierVersion
    //    by 1 (D-09). Detection: `in` operator so a caller sending
    //    `behavioralEvaluation: null` (intentional clear-out) also counts as a touch.
    const bumpVersion = this.bumpDossierVersionIfNeeded(safeDto, prev);

    const data: any = { ...safeDto };
    if (bumpVersion) {
      data.dossierVersion = prev.dossierVersion + 1;
    }

    const animal = await this.prismaRls.animal.update({
      where: { id },
      data,
      include: {
        species: true,
        photos: { orderBy: { position: 'asc' } },
      },
    });

    // 4. Server-side recompute of dossierComplete (D-08): authoritative — never
    //    accepts the value from the client. Treat undefined as false (schema default).
    const complete = this.computeDossierComplete(animal);
    const priorComplete = animal.dossierComplete === true;
    if (complete !== priorComplete) {
      const recomputed = await this.prismaRls.animal.update({
        where: { id },
        data: { dossierComplete: complete },
        include: {
          species: true,
          photos: { orderBy: { position: 'asc' } },
        },
      });
      await this.auditService.log('animal.update', userId, { animalId: id });
      return recomputed;
    }

    await this.auditService.log('animal.update', userId, {
      animalId: id,
    });

    return animal;
  }

  /**
   * Detect whether any of the 7 dossier-tracked fields appear in the update
   * payload as an explicit (i.e. `key in dto`) entry. We use `in` (not
   * `!== undefined`) so that an intentional `null` clear-out also counts as a
   * touch — matches D-09 ("any of these fields in the update payload bumps
   * version by 1").
   */
  private bumpDossierVersionIfNeeded(
    dto: Partial<CreateAnimalInput>,
    _prev: { dossierVersion: number },
  ): boolean {
    for (const field of DOSSIER_FIELDS) {
      if (field in dto) return true;
    }
    return false;
  }

  /**
   * Compute dossierComplete from the 5 required fields (D-08):
   * behavioralEvaluation, medicalHistory, monthlyCostUsdMin, adoptionCategory,
   * shelterEntryDate. monthlyCostUsdMax + knownTriggers are optional.
   */
  private computeDossierComplete(animal: {
    behavioralEvaluation: string | null;
    medicalHistory: string | null;
    monthlyCostUsdMin: number | null;
    adoptionCategory: string | null;
    shelterEntryDate: Date | null;
  }): boolean {
    return !!(
      animal.behavioralEvaluation &&
      animal.medicalHistory &&
      animal.monthlyCostUsdMin !== null &&
      animal.monthlyCostUsdMin !== undefined &&
      animal.adoptionCategory &&
      animal.shelterEntryDate
    );
  }

  async findById(id: string) {
    const animal = await this.rlsBypassPrisma.animal.findUnique({
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
      this.rlsBypassPrisma.animal.findMany({
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
      this.rlsBypassPrisma.animal.count({ where }),
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
    const prisma = orgId ? this.rlsBypassPrisma : this.prismaRls;
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
