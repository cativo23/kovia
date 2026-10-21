import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import type { PublicProfileResponseDto } from './dto/public-profile-response.dto';
import type { UpdateProfileSectionDto } from './dto/update-profile-section.dto';

/**
 * AdopterProfileService — Phase 16 PROFILE-01.
 *
 * Single-client by default (rlsPrisma only), per RESEARCH.md Open Question 2.
 * All profile reads/writes are RLS-scoped through the adopter's CLS context.
 *
 * PATTERN-01 (CLAUDE.md): client named `rlsPrisma` — @Inject(PRISMA_RLS).
 *
 * Exports getMyProfile() as the public API consumed by Plan 06's
 * ApplicationsService.create() (profileSnapshot freeze).
 */
@Injectable()
export class AdopterProfileService {
  constructor(
    @Inject(PRISMA_RLS) private readonly rlsPrisma: any,
  ) {}

  /**
   * GET /profile/me — returns the authenticated adopter's profile.
   *
   * Auto-creates a stub profile row on first call (upsert with empty create),
   * so Mi Perfil first visit returns completionPct=0 instead of 404.
   */
  async getMyProfile(userId: string): Promise<PublicProfileResponseDto> {
    const profile = await this.rlsPrisma.adopterProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { photos: { orderBy: { position: 'asc' } } },
    });
    return this.toProfileResponseDto(profile);
  }

  /**
   * PATCH /profile/section/:section — upserts one section atomically.
   *
   * Whitelists fields by dto.section before the upsert so a client cannot
   * write fields from a different section (T-16-03-05 mitigation).
   */
  async updateSection(
    userId: string,
    dto: UpdateProfileSectionDto,
  ): Promise<PublicProfileResponseDto> {
    const sectionData = this.extractSectionFields(dto);

    const profile = await this.rlsPrisma.adopterProfile.upsert({
      where: { userId },
      create: { userId, ...sectionData },
      update: sectionData,
      include: { photos: { orderBy: { position: 'asc' } } },
    });

    return this.toProfileResponseDto(profile);
  }

  /**
   * POST /profile/photos — appends a ProfilePhoto row.
   *
   * Enforces D-03 max of 5 photos per profile.
   */
  async addPhoto(
    userId: string,
    key: string,
    url: string,
  ): Promise<{ id: string; url: string; key: string; position: number }> {
    const profile = await this.rlsPrisma.adopterProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
      include: { photos: true },
    });

    if (profile.photos.length >= 5) {
      throw new BadRequestException(
        'No se pueden agregar más de 5 fotos al perfil.',
      );
    }

    const maxPosition = profile.photos.length > 0
      ? Math.max(...profile.photos.map((p: any) => p.position))
      : -1;

    const photo = await this.rlsPrisma.profilePhoto.create({
      data: {
        profileId: profile.id,
        key,
        url,
        position: maxPosition + 1,
      },
    });

    return {
      id: photo.id,
      url: photo.url,
      key: photo.key,
      position: photo.position,
    };
  }

  /**
   * DELETE /profile/photos/:photoId — removes a photo iff it belongs to
   * the authenticated user's profile (T-16-03-03 mitigation).
   *
   * Throws NotFoundException to avoid leaking existence of other adopters'
   * photos even when they exist.
   */
  async removePhoto(userId: string, photoId: string): Promise<void> {
    const photo = await this.rlsPrisma.profilePhoto.findUnique({
      where: { id: photoId },
      include: { profile: true },
    });

    if (!photo || photo.profile.userId !== userId) {
      throw new NotFoundException(`Foto no encontrada.`);
    }

    await this.rlsPrisma.profilePhoto.delete({ where: { id: photoId } });
  }

  /**
   * computeCompletionPct — server-side completeness formula (D-17).
   *
   * Returns 0/20/40/60/80/100 — one section = 20%.
   *
   * Section requirements:
   *   1. datos básicos: phone + occupation + birthDate all non-null
   *   2. hogar: housingType + ownership + adults !== null
   *   3. estilo de vida: activityLevel + hoursAlone !== null + adoptionReason
   *   4. experiencia general: speciesExperience !== null (boolean is sufficient)
   *   5. fotos del hogar: photos.length >= 1
   */
  private computeCompletionPct(
    profile: any & { photos: any[] },
  ): number {
    let complete = 0;

    // Section 1: datos básicos
    if (profile.phone && profile.occupation && profile.birthDate) complete++;

    // Section 2: hogar
    if (
      profile.housingType &&
      profile.ownership &&
      profile.adults !== null &&
      profile.adults !== undefined
    )
      complete++;

    // Section 3: estilo de vida
    if (
      profile.activityLevel &&
      profile.hoursAlone !== null &&
      profile.hoursAlone !== undefined &&
      profile.adoptionReason
    )
      complete++;

    // Section 4: experiencia general
    if (
      profile.speciesExperience !== null &&
      profile.speciesExperience !== undefined
    )
      complete++;

    // Section 5: fotos del hogar
    if (profile.photos.length >= 1) complete++;

    return Math.round((complete / 5) * 100);
  }

  /**
   * toProfileResponseDto — explicit field-by-field copy (no spread).
   * T-16-03-04 mitigation: prevents future Prisma column drift from leaking.
   */
  private toProfileResponseDto(profile: any): PublicProfileResponseDto {
    return {
      id: profile.id,

      // Section 1
      phone: profile.phone ?? null,
      occupation: profile.occupation ?? null,
      birthDate: profile.birthDate
        ? profile.birthDate instanceof Date
          ? profile.birthDate.toISOString().split('T')[0]
          : profile.birthDate
        : null,
      city: profile.city ?? null,

      // Section 2
      housingType: profile.housingType ?? null,
      ownership: profile.ownership ?? null,
      exteriorSpace: profile.exteriorSpace ?? null,
      petPermission: profile.petPermission ?? null,
      adults: profile.adults ?? null,
      children: profile.children ?? null,
      currentPets: Array.isArray(profile.currentPets)
        ? profile.currentPets
        : profile.currentPets != null
          ? profile.currentPets
          : null,

      // Section 3
      activityLevel: profile.activityLevel ?? null,
      hoursAlone: profile.hoursAlone ?? null,
      adoptionReason: profile.adoptionReason ?? null,

      // Section 4
      speciesExperience: profile.speciesExperience ?? null,
      previousPets: Array.isArray(profile.previousPets)
        ? profile.previousPets
        : profile.previousPets != null
          ? profile.previousPets
          : null,
      additionalContext: profile.additionalContext ?? null,

      // Section 5
      photos: (profile.photos ?? []).map((p: any) => ({
        id: p.id,
        url: p.url,
        key: p.key,
        position: p.position,
      })),

      completionPct: this.computeCompletionPct(profile),
    };
  }

  /**
   * extractSectionFields — whitelists DTO fields by section name.
   * Only fields for the active section are extracted; others are dropped.
   * This prevents T-16-03-05: cross-section bypass via API.
   */
  private extractSectionFields(dto: UpdateProfileSectionDto): Record<string, any> {
    switch (dto.section) {
      case 'datos-basicos':
        return {
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.occupation !== undefined && { occupation: dto.occupation }),
          ...(dto.birthDate !== undefined && { birthDate: new Date(dto.birthDate) }),
          ...(dto.city !== undefined && { city: dto.city }),
        };

      case 'hogar':
        return {
          ...(dto.housingType !== undefined && { housingType: dto.housingType }),
          ...(dto.ownership !== undefined && { ownership: dto.ownership }),
          ...(dto.exteriorSpace !== undefined && { exteriorSpace: dto.exteriorSpace }),
          ...(dto.petPermission !== undefined && { petPermission: dto.petPermission }),
          ...(dto.adults !== undefined && { adults: dto.adults }),
          ...(dto.children !== undefined && { children: dto.children }),
          ...(dto.currentPets !== undefined && { currentPets: dto.currentPets }),
        };

      case 'estilo-de-vida':
        return {
          ...(dto.activityLevel !== undefined && { activityLevel: dto.activityLevel }),
          ...(dto.hoursAlone !== undefined && { hoursAlone: dto.hoursAlone }),
          ...(dto.adoptionReason !== undefined && { adoptionReason: dto.adoptionReason }),
        };

      case 'experiencia':
        return {
          ...(dto.speciesExperience !== undefined && { speciesExperience: dto.speciesExperience }),
          ...(dto.previousPets !== undefined && { previousPets: dto.previousPets }),
          ...(dto.additionalContext !== undefined && { additionalContext: dto.additionalContext }),
        };

      case 'fotos':
        // Photo management is handled by addPhoto/removePhoto — no profile fields for this section
        return {};

      default:
        return {};
    }
  }
}
