import { Injectable } from '@nestjs/common';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { computeGuidance, type AdoptionCategory } from '../public-animals/guidance';
import type { PublicAnimalDto } from '../public-animals/dto/public-animal.dto';
import type {
  AdoptionStoryPublic,
  MarqueeAdopter,
  PublicLandingStats,
  VerifiedRefugio,
} from './dto/public-landing.dto';
import { computeLayoutVariant } from './landing-stats.helpers';

/**
 * PublicLandingService — Phase 15-04.
 *
 * Single source of truth backing `GET /public/landing-stats`. Per D-12,
 * the entire bento payload ships in one round trip and the
 * Day-1↔Year-2 hero variant is computed server-side at the locked
 * threshold (totalAdoptions ≥ 500 AND verifiedRefugiosCount ≥ 10).
 *
 * **PATTERN-01 naming:** uses `rlsBypassPrisma` (PublicPrismaService).
 * Public visitors have NO tenant identity — this endpoint is fully
 * read-only and never needs `rlsPrisma`. The PATTERN-03 enforcer in
 * `backend/scripts/check-integration-specs.ts` requires DUAL imports
 * (PRISMA_RLS + PublicPrismaService) to trigger, so this service won't
 * be flagged; per plan D-17 a sibling integration spec ships anyway
 * because the privacy projection (D-15) and threshold semantics (D-12)
 * are the high-value contracts.
 *
 * **Privacy (D-15, T-15-04):** `marqueeAdopters` is explicitly mapped
 * field-by-field to `{ firstName, city, animalName }` — never spreads
 * the AdoptionApplication row. The integration spec asserts
 * `Object.keys(adopter).sort() === ['animalName','city','firstName']`.
 */
@Injectable()
export class PublicLandingService {
  constructor(private readonly rlsBypassPrisma: PublicPrismaService) {}

  async getStats(): Promise<PublicLandingStats> {
    const [
      availableCount,
      verifiedRefugiosCount,
      totalAdoptions,
      featuredAnimalRaw,
      storiesRaw,
      verifiedRefugiosRaw,
      marqueeRaw,
    ] = await Promise.all([
      this.rlsBypassPrisma.animal.count({
        where: { status: 'AVAILABLE', dossierComplete: true },
      }),
      this.rlsBypassPrisma.organization.count({
        where: { verifiedAt: { not: null } },
      }),
      this.rlsBypassPrisma.adoptionApplication.count({
        where: { status: 'ADOPTADA' },
      }),
      this.rlsBypassPrisma.animal.findFirst({
        where: { status: 'AVAILABLE', dossierComplete: true },
        orderBy: { createdAt: 'desc' },
        include: {
          species: true,
          organization: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
          photos: { orderBy: { position: 'asc' } },
        },
      }),
      this.rlsBypassPrisma.adoptionStory.findMany({
        where: { publishedAt: { not: null } },
        orderBy: { publishedAt: 'desc' },
        take: 3,
      }),
      this.rlsBypassPrisma.organization.findMany({
        where: { verifiedAt: { not: null } },
        orderBy: { verifiedAt: 'desc' },
        take: 10,
        select: {
          id: true,
          name: true,
          logoUrl: true,
          verifiedAt: true,
        },
      }),
      this.rlsBypassPrisma.adoptionApplication.findMany({
        where: { status: 'ADOPTADA', adopterFirstName: { not: null } },
        orderBy: { updatedAt: 'desc' },
        take: 20,
        select: {
          adopterFirstName: true,
          adopterCity: true,
          animal: { select: { name: true } },
        },
      }),
    ]);

    return {
      availableCount,
      verifiedRefugiosCount,
      totalAdoptions,
      layoutVariant: computeLayoutVariant({
        totalAdoptions,
        verifiedRefugiosCount,
      }),
      featuredAnimal: featuredAnimalRaw
        ? this.toPublicAnimalDto(featuredAnimalRaw)
        : null,
      stories: storiesRaw.map((s: any) => this.toAdoptionStoryPublic(s)),
      verifiedRefugios: verifiedRefugiosRaw.map((o: any) =>
        this.toVerifiedRefugio(o),
      ),
      marqueeAdopters: this.toMarqueeAdopters(marqueeRaw),
    };
  }

  /**
   * Featured animal listing-shape mapper. Mirrors `PublicAnimalsService.
   * toPublicDto` field-by-field rather than importing the private method —
   * keeps this service free of a circular dep on PublicAnimalsModule and
   * keeps the explicit no-spread guarantee intact (T-15-01 mitigation).
   */
  private toPublicAnimalDto(animal: any): PublicAnimalDto {
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

  private toAdoptionStoryPublic(story: any): AdoptionStoryPublic {
    return {
      id: story.id,
      adopterFirstName: story.adopterFirstName,
      city: story.city,
      testimonial: story.testimonial,
      photoUrl: story.photoUrl ?? null,
      publishedAt:
        story.publishedAt instanceof Date
          ? story.publishedAt.toISOString()
          : story.publishedAt,
    };
  }

  /**
   * Verified-refugio mapper. `foundedYear` is NOT a column on
   * `Organization` in the current schema — keeps the response shape
   * stable for the frontend by returning `null` rather than omitting the
   * key. If a future migration adds the column, swap to
   * `org.foundedYear ?? null` and update the integration spec.
   */
  private toVerifiedRefugio(org: any): VerifiedRefugio {
    return {
      id: org.id,
      name: org.name,
      logoUrl: org.logoUrl ?? null,
      foundedYear: null,
      verifiedAt:
        org.verifiedAt instanceof Date
          ? org.verifiedAt.toISOString()
          : org.verifiedAt,
    };
  }

  /**
   * Privacy-safe marquee projection (D-15, T-15-04).
   *
   * - Filters rows where `adopterCity` or `animal.name` is null/empty
   *   (incomplete data isn't useful and could leak partial info).
   * - Explicit field copy — NEVER spread `row`. Adding a column to
   *   AdoptionApplication later cannot leak through this projection.
   * - Returns `[]` when zero rows match → frontend hides the block
   *   (D-15 Day-1 zero-adoptions handling).
   */
  private toMarqueeAdopters(rows: any[]): MarqueeAdopter[] {
    return rows
      .filter(
        (r) =>
          r.adopterFirstName &&
          r.adopterCity &&
          r.animal?.name,
      )
      .map((r) => ({
        firstName: r.adopterFirstName,
        city: r.adopterCity,
        animalName: r.animal.name,
      }));
  }
}
