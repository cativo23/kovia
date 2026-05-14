import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { computeGuidance, type AdoptionCategory } from './guidance';
import type {
  PublicAnimalDto,
  PaginatedPublicAnimalList,
} from './dto/public-animal.dto';
import type { PublicAnimalDetailDto } from './dto/public-animal-detail.dto';

/**
 * Inbound query shape — accepts the same filter/pagination args as the
 * existing `AnimalsService.findPublic`. Reused via the
 * `public-animal-query.dto.ts` re-export at the HTTP boundary.
 */
interface PublicAnimalQueryInput {
  page?: number;
  limit?: number;
  species?: string;
  size?: string;
  ageMin?: number;
  ageMax?: number;
  energyLevel?: string;
  organization?: string;
  search?: string;
}

/**
 * PublicAnimalsService — Phase 15-03 dedicated public boundary.
 *
 * Dual-client injection per CLAUDE.md PATTERN-01 (NEW service — uses
 * canonical `rlsPrisma` / `rlsBypassPrisma` names):
 *   - `rlsBypassPrisma` (PublicPrismaService) for public reads (no tenant
 *     identity available).
 *   - `rlsPrisma` (@Inject(PRISMA_RLS)) for the authenticated ack write
 *     (adopter_insert_own_acks policy gates the upsert).
 *
 * `toPublicDto` performs explicit field-by-field mapping — NEVER spreads
 * the full animal row — so a future column added to `Animal` cannot leak
 * via the public surface (T-15-01 mitigation).
 *
 * PATTERN-03: sibling `*.integration.spec.ts` ships in this same plan;
 * `backend/scripts/check-integration-specs.ts` enforces the link.
 */
@Injectable()
export class PublicAnimalsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly rlsPrisma: any,
    private readonly rlsBypassPrisma: PublicPrismaService,
  ) {}

  /**
   * GET /public/animals
   * Filters: dossierComplete=true (D-07 fail-closed) AND status=AVAILABLE
   * plus the optional species / size / age / energy / search filters.
   */
  async findPublic(
    query: PublicAnimalQueryInput,
  ): Promise<PaginatedPublicAnimalList> {
    const page = query.page || 1;
    const limit = query.limit || 12;
    const skip = (page - 1) * limit;

    const where: any = {
      status: 'AVAILABLE',
      dossierComplete: true,
    };

    if (query.species) where.species = { slug: query.species };
    if (query.size) where.size = query.size;
    if (query.energyLevel) where.energyLevel = query.energyLevel;
    if (query.ageMin !== undefined || query.ageMax !== undefined) {
      where.ageMonths = {};
      if (query.ageMin !== undefined) where.ageMonths.gte = query.ageMin;
      if (query.ageMax !== undefined) where.ageMonths.lte = query.ageMax;
    }
    if (query.organization) where.organization = { slug: query.organization };
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [rows, total] = await Promise.all([
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
          photos: { orderBy: { position: 'asc' } },
        },
      }),
      this.rlsBypassPrisma.animal.count({ where }),
    ]);

    return {
      data: rows.map((r: any) => this.toPublicDto(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * GET /public/animals/:id
   * 404 when the animal does not exist OR `dossierComplete=false` (D-07
   * fail-closed semantically also 404s incomplete dossiers from public —
   * the existence of the row is a leak the refugio hasn't authorized).
   * Also 404 when status !== AVAILABLE so adopted/archived rows stay
   * private until the org explicitly re-lists them.
   */
  async findById(id: string): Promise<PublicAnimalDetailDto> {
    const animal: any = await this.rlsBypassPrisma.animal.findUnique({
      where: { id },
      include: {
        species: true,
        organization: {
          select: { id: true, name: true, slug: true, logoUrl: true },
        },
        photos: { orderBy: { position: 'asc' } },
      },
    });

    if (
      !animal ||
      !animal.dossierComplete ||
      animal.status !== 'AVAILABLE'
    ) {
      throw new NotFoundException(`Animal with ID ${id} not found`);
    }

    return this.toPublicDetailDto(animal);
  }

  /**
   * POST /public/animals/:id/acknowledge-dossier
   * Authenticated adopter records that they've read the dossier at the
   * current `dossierVersion`. Upsert is idempotent on `(userId, animalId)`.
   * Stale (version-mismatch) acks are rejected later by DossierAckGuard
   * at apply-time (Phase 16 binds it).
   *
   * 404 if the animal does not exist or has `dossierComplete=false` —
   * adopters can't ack a dossier that isn't published yet.
   */
  async acknowledgeDossier(
    animalId: string,
    userId: string,
  ): Promise<{ ackedAt: Date; dossierVersion: number }> {
    const animal: any = await this.rlsBypassPrisma.animal.findUnique({
      where: { id: animalId },
      select: { id: true, dossierVersion: true, dossierComplete: true },
    });

    if (!animal || !animal.dossierComplete) {
      throw new NotFoundException(`Animal with ID ${animalId} not found`);
    }

    const ack: any = await this.rlsPrisma.dossierAcknowledgment.upsert({
      where: { userId_animalId: { userId, animalId } },
      create: { userId, animalId, dossierVersion: animal.dossierVersion },
      update: {
        ackedAt: new Date(),
        dossierVersion: animal.dossierVersion,
      },
    });

    return { ackedAt: ack.ackedAt, dossierVersion: ack.dossierVersion };
  }

  /**
   * Listing mapper — explicit field-by-field copy. Does NOT spread the
   * full animal row (T-15-01 mitigation: prevents future column drift
   * from leaking via the public surface).
   */
  private toPublicDto(animal: any): PublicAnimalDto {
    return {
      id: animal.id,
      name: animal.name,
      breed: animal.breed ?? null,
      gender: animal.gender ?? null,
      ageMonths: animal.ageMonths ?? null,
      size: animal.size ?? null,
      energyLevel: animal.energyLevel ?? null,
      guidance: computeGuidance(animal.adoptionCategory as AdoptionCategory),
      species: {
        id: animal.species.id,
        name: animal.species.name,
        slug: animal.species.slug,
      },
      organization: {
        id: animal.organization.id,
        name: animal.organization.name,
        slug: animal.organization.slug,
        logoUrl: animal.organization.logoUrl ?? null,
      },
      photos: (animal.photos ?? []).map((p: any) => ({
        id: p.id,
        url: p.url,
        caption: p.caption ?? null,
        position: p.position,
      })),
      createdAt:
        animal.createdAt instanceof Date
          ? animal.createdAt.toISOString()
          : animal.createdAt,
    };
  }

  /**
   * Detail mapper — same explicit field-by-field copy, plus dossier
   * fields visible only on the detail surface.
   */
  private toPublicDetailDto(animal: any): PublicAnimalDetailDto {
    const base = this.toPublicDto(animal);
    return {
      ...base,
      behavioralEvaluation: animal.behavioralEvaluation ?? null,
      medicalHistory: animal.medicalHistory ?? null,
      monthlyCostUsdMin: animal.monthlyCostUsdMin ?? null,
      monthlyCostUsdMax: animal.monthlyCostUsdMax ?? null,
      knownTriggers: Array.isArray(animal.knownTriggers)
        ? animal.knownTriggers
        : [],
      shelterEntryDate:
        animal.shelterEntryDate instanceof Date
          ? animal.shelterEntryDate.toISOString()
          : (animal.shelterEntryDate ?? null),
      dossierVersion: animal.dossierVersion,
    };
  }
}
