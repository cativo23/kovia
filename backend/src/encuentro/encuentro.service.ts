import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PRISMA_RLS } from '../prisma/prisma.module.js';
import { CreateEncuentroDto } from './dto/create-encuentro.dto.js';
import { CompleteEncuentroDto } from './dto/complete-encuentro.dto.js';

/**
 * Complex categories require the hasCategoryExperience check (D-09).
 * If the adopter has no experience with the animal's category, fosterRequired is set.
 * String literals aligned with AdoptionCategory enum in schema.prisma.
 */
const COMPLEX_CATEGORIES: string[] = [
  'SENIOR',
  'MEDICO_CRONICO',
  'REACTIVO',
  'ESPECIAL',
];

@Injectable()
export class EncuentroService {
  constructor(
    @Inject(PRISMA_RLS) private readonly rlsPrisma: any,
    private readonly cls: ClsService,
  ) {}

  /**
   * schedule() — creates an Encuentro for an application.
   * D-05: presencial-only (no modality field).
   * D-06: completedAt stays null until complete() is called.
   * D-08: caller must be ORG_STAFF or ORG_ADMIN (enforced at controller level).
   */
  async schedule(dto: CreateEncuentroDto) {
    const application = await this.rlsPrisma.adoptionApplication.findUnique({
      where: { id: dto.applicationId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`);
    }

    // Prevent duplicate encuentros for the same application (1:1 constraint)
    const existing = await this.rlsPrisma.encuentro.findUnique({
      where: { applicationId: dto.applicationId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `An encuentro already exists for application ${dto.applicationId}`,
      );
    }

    const user = this.cls.get<{ id: string }>('user');

    return this.rlsPrisma.encuentro.create({
      data: {
        applicationId: dto.applicationId,
        scheduledAt: new Date(dto.scheduledAt),
        location: dto.location ?? null,
        address: dto.address ?? null,
        counselorId: user?.id ?? 'unknown',
      },
    });
  }

  /**
   * complete() — records counselor observations on an existing encuentro (D-07).
   * D-09: if animal category is complex AND hasCategoryExperience=false,
   *       sets application.fosterRequired=true.
   * D-06: sets completedAt; a scheduled-but-not-completed encuentro does NOT satisfy the gate.
   */
  async complete(encuentroId: string, dto: CompleteEncuentroDto) {
    const encuentro = await this.rlsPrisma.encuentro.findUnique({
      where: { id: encuentroId },
      include: {
        application: {
          select: {
            id: true,
            animal: {
              select: { adoptionCategory: true },
            },
          },
        },
      },
    });

    if (!encuentro) {
      throw new NotFoundException(`Encuentro ${encuentroId} not found`);
    }

    if (encuentro.completedAt !== null) {
      throw new BadRequestException(
        `Encuentro ${encuentroId} is already completed`,
      );
    }

    // D-09: determine fosterRequired based on category + experience signal
    const category = encuentro.application?.animal?.adoptionCategory as string | null;
    const isComplexCategory = category !== null && COMPLEX_CATEGORIES.includes(category);
    const fosterRequired =
      isComplexCategory && dto.hasCategoryExperience === false;

    const user = this.cls.get<{ id: string }>('user');
    const now = new Date();

    const updated = await this.rlsPrisma.encuentro.update({
      where: { id: encuentroId },
      data: {
        completedAt: now,
        recomendacion: dto.recomendacion,
        notes: dto.notes ?? null,
        alertSignals: dto.alertSignals ?? null,
        fosterRequired,
        counselorId: user?.id ?? 'unknown',
      },
    });

    // Propagate fosterRequired to the application (D-09)
    if (fosterRequired) {
      await this.rlsPrisma.adoptionApplication.update({
        where: { id: encuentro.applicationId },
        data: { fosterRequired: true },
      });
    }

    return updated;
  }
}
