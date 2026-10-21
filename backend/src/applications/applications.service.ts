import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PublicPrismaService } from '../prisma/public-prisma.service';
import { UploadService } from '../upload/upload.service';
import { AuditService } from '../audit/audit.service';
import { ClsService } from 'nestjs-cls';
import { SubmitApplicationDto } from './dto/submit-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { EventsService } from '../notifications/events.service';
import { AdopterProfileService } from '../adopter-profile/adopter-profile.service';
import { ExtrasTemplateService } from '../extras-template/extras-template.service';

interface UserContext {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

// D-01 canonical lifecycle ordering (Phase 17).
// IN_FOSTER precedes APPROVED: foster is a pre-approval trial that informs the approval decision.
// APPROVED → IN_REFLECTION starts the 48h reflexión clock (D-03; approvedAt set on APPROVED entry).
// ADOPTED retained as legacy terminal for pre-v3.0 rows only — new flow writes FINALIZED.
const staffTransitions: Record<string, string[]> = {
  SUBMITTED:     ['REVIEWING'],
  REVIEWING:     ['IN_MEETING', 'REJECTED', 'FOLLOW_UP'],
  FOLLOW_UP:     ['IN_MEETING', 'REJECTED'],
  IN_MEETING:    ['IN_FOSTER', 'APPROVED', 'REJECTED'],
  IN_FOSTER:     ['APPROVED', 'REJECTED'],
  APPROVED:      ['IN_REFLECTION'],
  IN_REFLECTION: ['FINALIZED', 'WITHDRAWN'],
  ADOPTED:       ['RETURNED'], // legacy pre-v3.0 rows only
};

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly rlsPrisma: any,
    private readonly rlsBypassPrisma: PublicPrismaService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
    private readonly cls: ClsService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
    private readonly eventsService: EventsService,
    private readonly adopterProfileService: AdopterProfileService,
    private readonly extrasTemplateService: ExtrasTemplateService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * create() — Phase 16 restructured apply flow (APPLY-01, APPLY-02, APPLY-06).
   *
   * Flow (in order):
   *   1. Animal lookup via rlsBypassPrisma (existing pattern)
   *   2. Availability + duplicate checks (existing)
   *   3. NEW — profile completeness gate (422 if completionPct < 100, D-01)
   *   4. NEW — build profileSnapshot server-side (explicit field copy, D-04)
   *   5. NEW — freeze extraAnswers from ExtrasTemplate (questionText verbatim, D-08)
   *   6. NEW — generate 72h co-aplicante UUID token (D-10/D-11)
   *   7. Insert AdoptionApplication row via rlsPrisma
   *   8. Emit APPLICATION_SUBMITTED event (existing — unchanged)
   *   9. NEW — emit co-aplicante confirmation event (D-11)
   *
   * PATTERN-01 (CLAUDE.md): rlsPrisma for the INSERT; rlsBypassPrisma for animal + duplicate lookups.
   * T-16-06-01 mitigation: profileSnapshot built server-side — frontend cannot supply snapshot fields.
   * T-16-06-02 mitigation: questionText frozen from template — frontend-supplied text discarded.
   */
  async create(dto: SubmitApplicationDto, user: UserContext) {
    // Step 1: Animal lookup — includes name and adoptionCategory for template lookup
    const animal = await this.rlsBypassPrisma.animal.findUnique({
      where: { id: dto.animalId },
      select: { id: true, name: true, status: true, organizationId: true, adoptionCategory: true },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${dto.animalId} not found`);
    }

    if (animal.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Animal is not available for adoption (current status: ${animal.status})`,
      );
    }

    // Step 2: Duplicate check — one active (non-WITHDRAWN) application per (animalId, userId).
    // Uses rlsBypassPrisma for consistency with other self-scoped adopter reads (D-19-BE).
    const existing = await this.rlsBypassPrisma.adoptionApplication.findFirst({
      where: {
        animalId: dto.animalId,
        userId: user.id,
        status: { not: 'WITHDRAWN' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'You have already submitted an application for this animal',
      );
    }

    // Step 3: Profile completeness gate (D-01, T-16-06-06 mitigation).
    // Server-side 422 even if the frontend redirect is bypassed.
    const profile = await this.adopterProfileService.getMyProfile(user.id);
    if (profile.completionPct < 100) {
      throw new UnprocessableEntityException(
        'Completá tu perfil antes de aplicar',
      );
    }

    // Step 4: Build profileSnapshot server-side (T-16-06-01 mitigation, D-04).
    // Explicit field-by-field copy — spread is forbidden here to prevent
    // future Prisma column drift from leaking internal fields into the snapshot.
    // photos: URLs only (D-04 — freeze home photos as they existed at apply time).
    const profileSnapshot = {
      phone: profile.phone,
      occupation: profile.occupation,
      birthDate: profile.birthDate,
      city: profile.city,
      housingType: profile.housingType,
      ownership: profile.ownership,
      exteriorSpace: profile.exteriorSpace,
      petPermission: profile.petPermission,
      adults: profile.adults,
      children: profile.children,
      currentPets: profile.currentPets,
      activityLevel: profile.activityLevel,
      hoursAlone: profile.hoursAlone,
      adoptionReason: profile.adoptionReason,
      speciesExperience: profile.speciesExperience,
      previousPets: profile.previousPets,
      additionalContext: profile.additionalContext,
      photos: profile.photos.map((photo) => photo.url),  // D-04: photo URLs only
      completionPct: profile.completionPct,
      snapshotAt: new Date().toISOString(),
    };

    // Step 5: Freeze extraAnswers from the ExtrasTemplate (T-16-06-02 mitigation, D-08).
    // findForAnimalRaw() returns raw questions including criticality (internal only).
    // If no template exists for this animal's category, returns [] — apply proceeds with no extras.
    const rawQuestions = await this.extrasTemplateService.findForAnimalRaw(dto.animalId);
    const frozenExtraAnswers = dto.extraAnswers.map((a) => {
      const q = rawQuestions.find((tq: any) => tq.id === a.questionId);
      if (!q) {
        throw new BadRequestException(`Pregunta inválida: ${a.questionId}`);
      }
      return { questionId: a.questionId, questionText: q.text, answer: a.answer };
    });

    // Step 6: Generate 72h co-aplicante UUID token (D-10/D-11, T-16-06-04 mitigation).
    const coAplicanteToken = randomUUID();
    const coAplicanteTokenExpiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);

    // Step 7: Insert AdoptionApplication row via RLS client so INSERT policy fires.
    // Legacy fields (personalInfo, housing, lifestyle, photos relation) left null for
    // new applications — they remain on the table for backward compat with historical records.
    const application = await this.rlsPrisma.adoptionApplication.create({
      data: {
        animalId: dto.animalId,
        userId: user.id,
        organizationId: animal.organizationId,
        adopterFirstName: user.firstName,
        adopterLastName: user.lastName,
        adopterEmail: user.email,
        profileSnapshot,
        extraAnswers: frozenExtraAnswers,
        coAplicanteNombre: dto.coAplicanteNombre,
        coAplicanteEmail: dto.coAplicanteEmail,
        coAplicantePhone: dto.coAplicantePhone,
        coAplicanteToken,
        coAplicanteTokenExpiresAt,
        coAplicanteConfirmed: false,
      },
    });

    await this.auditService.log('application.create', user.id, {
      applicationId: application.id,
      animalId: dto.animalId,
    });

    // Enqueue scoring job asynchronously
    await this.scoringQueue.add('score', { applicationId: application.id });

    // Step 8: Emit APPLICATION_SUBMITTED event (existing — unchanged).
    await this.eventsService.emitApplicationSubmitted(application.id);

    // Step 9: Emit co-aplicante confirmation event (D-11, T-16-06-07 mitigation).
    // frontendUrl from config ensures HTTPS in staging/prod (Pitfall 7).
    // Post-transaction emit — applicationId is available now.
    const frontendUrl = this.configService.get<string>('FRONTEND_URL', '');
    const confirmationUrl = `${frontendUrl}/confirmar-coapplicante/${coAplicanteToken}`;
    await this.eventsService.emitCoAplicanteConfirmationRequested(application.id, {
      coAplicanteNombre: dto.coAplicanteNombre,
      coAplicanteEmail: dto.coAplicanteEmail,
      coAplicantePhone: dto.coAplicantePhone,
      confirmationUrl,
      expiresAt: coAplicanteTokenExpiresAt,
      animalName: animal.name,
      adopterFirstName: user.firstName,
    });

    return application;
  }

  async findMyApplications(userId: string, query: ApplicationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Use rlsBypassPrisma (RLS-bypass). Authorization enforced via where: { userId } + findById ownership check.
    const [data, total] = await Promise.all([
      this.rlsBypassPrisma.adoptionApplication.findMany({
        where: { userId },
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          animal: {
            include: {
              species: true,
              photos: { orderBy: { position: 'asc' }, take: 1 },
              organization: {
                select: { id: true, name: true, slug: true, logoUrl: true },
              },
            },
          },
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      this.rlsBypassPrisma.adoptionApplication.count({ where: { userId } }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, userId: string) {
    // Use rlsBypassPrisma (RLS-bypass). Ownership enforced via explicit userId check below.
    const application = await this.rlsBypassPrisma.adoptionApplication.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: 'asc' } },
        animal: {
          include: {
            species: true,
            photos: { orderBy: { position: 'asc' }, take: 1 },
            organization: {
              select: { id: true, name: true, slug: true, logoUrl: true },
            },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  async findAllByOrg(query: ApplicationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (query.animalId) {
      where.animalId = query.animalId;
    }

    if (query.status) {
      where.status = query.status;
    }

    if (query.dateFrom || query.dateTo) {
      where.submittedAt = {};
      if (query.dateFrom) {
        where.submittedAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        where.submittedAt.lte = new Date(query.dateTo);
      }
    }

    // Use rlsPrisma — org scoping is enforced via CLS context (app.current_org_id)
    const [data, total] = await Promise.all([
      this.rlsPrisma.adoptionApplication.findMany({
        where,
        skip,
        take: limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          animal: {
            select: {
              id: true,
              name: true,
              photos: { orderBy: { position: 'asc' }, take: 1 },
            },
          },
          photos: { orderBy: { position: 'asc' }, take: 1 },
        },
      }),
      this.rlsPrisma.adoptionApplication.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByIdForOrg(id: string) {
    const application = await this.rlsPrisma.adoptionApplication.findUnique({
      where: { id },
      include: {
        photos: { orderBy: { position: 'asc' } },
        animal: {
          include: {
            species: true,
            photos: { orderBy: { position: 'asc' }, take: 1 },
          },
        },
      },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    return application;
  }

  async checkExisting(animalId: string, userId: string) {
    // D-18-BE: WITHDRAWN rows must not block re-application (D-14).
    // Use rlsBypassPrisma for consistency with the other self-scoped adopter reads (D-19-BE).
    const application = await this.rlsBypassPrisma.adoptionApplication.findFirst({
      where: { animalId, userId, status: { not: 'WITHDRAWN' } },
      select: { id: true },
    });

    if (!application) {
      return { exists: false };
    }

    return { exists: true, applicationId: application.id };
  }

  async findStatusHistory(applicationId: string, userId: string) {
    // Ownership check reuses findById — throws ForbiddenException if caller is not the owner.
    await this.findById(applicationId, userId);
    return this.auditService.findByApplication(applicationId);
  }

  /**
   * validateTransitionPreconditions — gate guard for critical transitions.
   *
   * D-06 (SAFEGUARD-01): APPROVED requires a completed Encuentro (completedAt not null + recomendacion set).
   * D-10 (SAFEGUARD-03): APPROVED requires a FosterPeriod with outcome=PROCEED when fosterRequired=true.
   * D-03 (SAFEGUARD-02): FINALIZED (from IN_REFLECTION) requires approvedAt + 48h elapsed.
   *
   * Each gate rejection is audit-logged for observability.
   */
  private async validateTransitionPreconditions(
    application: any,
    newStatus: string,
    userId: string,
  ): Promise<void> {
    if (newStatus === 'APPROVED') {
      // D-06 gate: completed Encuentro with observations required
      const encuentro = await this.rlsPrisma.encuentro.findFirst({
        where: {
          applicationId: application.id,
          completedAt: { not: null },
          recomendacion: { not: null },
        },
      });
      if (!encuentro) {
        await this.auditService.log('application.gate_rejection', userId, {
          applicationId: application.id,
          gate: 'D-06',
          reason: 'No completed Encuentro with observations',
        });
        throw new UnprocessableEntityException(
          'Application cannot be approved without a completed Encuentro with observations logged (D-06)',
        );
      }

      // D-10 gate: if fosterRequired=true, a FosterPeriod with outcome=PROCEED is required
      if (application.fosterRequired) {
        const fosterPeriod = await this.rlsPrisma.fosterPeriod.findFirst({
          where: {
            applicationId: application.id,
            outcome: 'PROCEED',
          },
        });
        if (!fosterPeriod) {
          await this.auditService.log('application.gate_rejection', userId, {
            applicationId: application.id,
            gate: 'D-10',
            reason: 'fosterRequired=true but no FosterPeriod outcome=PROCEED',
          });
          throw new UnprocessableEntityException(
            'Application cannot be approved: a completed Foster Period with outcome PROCEED is required (D-10)',
          );
        }
      }
    }

    if (newStatus === 'FINALIZED') {
      // D-03 gate: 48h reflexión window must have elapsed since approvedAt
      // approvedAt is set when entering APPROVED (see updateStatus below, Pitfall 6).
      const REFLEXION_MS = 48 * 60 * 60 * 1000;
      if (
        !application.approvedAt ||
        Date.now() < new Date(application.approvedAt).getTime() + REFLEXION_MS
      ) {
        await this.auditService.log('application.gate_rejection', userId, {
          applicationId: application.id,
          gate: 'D-03',
          reason: '48h reflexión window has not elapsed',
          approvedAt: application.approvedAt,
        });
        throw new UnprocessableEntityException(
          'Application cannot be finalized: 48-hour reflexión period has not elapsed (D-03)',
        );
      }
    }
  }

  async updateStatus(id: string, newStatus: string, userId: string) {
    const application = await this.rlsPrisma.adoptionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    const allowed = staffTransitions[application.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${application.status} to ${newStatus}`,
      );
    }

    // Phase 17 gate guard (D-03, D-06, D-10)
    await this.validateTransitionPreconditions(application, newStatus, userId);

    // Stamp approvedAt on APPROVED entry (Pitfall 6: set on APPROVED, not IN_REFLECTION).
    // This drives the 48h reflexión gate (D-03) — do NOT move this to IN_REFLECTION.
    const extraData: Record<string, any> = {};
    if (newStatus === 'APPROVED') {
      extraData.approvedAt = new Date();
    }

    const updated = await this.rlsPrisma.adoptionApplication.update({
      where: { id },
      data: { status: newStatus, ...extraData },
    });

    await this.auditService.log('application.status_change', userId, {
      applicationId: id,
      oldStatus: application.status,
      newStatus,
    });

    // ── Phase 17 — Animal reservation lifecycle side-effects (D-19) ──────────
    // Reserve at the earlier of IN_FOSTER or APPROVED (when !fosterRequired).
    // Release on WITHDRAWN or REJECTED. Set ADOPTED at FINALIZED.
    const animalId = application.animalId;

    if (newStatus === 'IN_FOSTER') {
      // Reserve animal while foster trial is in progress (D-19)
      await this.rlsPrisma.animal.update({
        where: { id: animalId },
        data: { status: 'IN_PROCESS' },
      });
    } else if (newStatus === 'APPROVED' && !application.fosterRequired) {
      // Direct approval path (no foster): reserve now (D-19)
      await this.rlsPrisma.animal.update({
        where: { id: animalId },
        data: { status: 'IN_PROCESS' },
      });
    } else if (newStatus === 'WITHDRAWN' || newStatus === 'REJECTED') {
      // Application ended without adoption — release animal (D-19)
      await this.rlsBypassPrisma.animal.update({
        where: { id: animalId },
        data: { status: 'AVAILABLE' },
      });
    } else if (newStatus === 'FINALIZED') {
      // Adoption committed — mark animal as ADOPTED (D-19)
      await this.rlsPrisma.animal.update({
        where: { id: animalId },
        data: { status: 'ADOPTED' },
      });

      // D-13 (SAFEGUARD-04/05): Create DAY_14 and DAY_60 PostAdoptionCheckIn rows
      const finalizedAt = new Date();
      const day14 = new Date(finalizedAt.getTime() + 14 * 24 * 60 * 60 * 1000);
      const day60 = new Date(finalizedAt.getTime() + 60 * 24 * 60 * 60 * 1000);
      await this.rlsPrisma.postAdoptionCheckIn.createMany({
        data: [
          {
            applicationId: id,
            checkInType: 'DAY_14',
            scheduledFor: day14,
            status: 'PENDING',
          },
          {
            applicationId: id,
            checkInType: 'DAY_60',
            scheduledFor: day60,
            status: 'PENDING',
          },
        ],
      });

      // D-19 sibling auto-close: close other open applications for the same animal
      // to WITHDRAWN (not REJECTED — A7 sin-estigma). Uses rlsBypassPrisma because
      // sibling applications may belong to other tenants/adopters.
      const terminalStatuses = ['WITHDRAWN', 'REJECTED', 'FINALIZED', 'ADOPTED', 'RETURNED'];
      await this.rlsBypassPrisma.adoptionApplication.updateMany({
        where: {
          animalId,
          id: { not: id },
          status: { notIn: terminalStatuses },
        },
        data: { status: 'WITHDRAWN' },
      });
    }

    // Emit event: notification + webhook
    await this.eventsService.emitApplicationStatusChanged(
      id,
      application.status,
      newStatus,
    );

    // RETURNED fires an additional specific event
    if (newStatus === 'RETURNED') {
      await this.eventsService.emitApplicationDevuelta(id);
    }

    return updated;
  }

  async withdraw(id: string, userId: string) {
    // Use rlsBypassPrisma — adopter has no org context
    const application = await this.rlsBypassPrisma.adoptionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Ownership check per D-17
    if (application.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    // D-04/D-17: Adopter may withdraw from SUBMITTED, REVIEWING, or IN_REFLECTION (self-service sin estigma).
    // IN_REFLECTION was added in Phase 17 (D-04). Any other status is a hard reject.
    if (!['SUBMITTED', 'REVIEWING', 'IN_REFLECTION'].includes(application.status)) {
      throw new BadRequestException(
        `Cannot withdraw an application in status ${application.status}`,
      );
    }

    const updated = await this.rlsBypassPrisma.adoptionApplication.update({
      where: { id },
      data: { status: 'WITHDRAWN' },
    });

    // D-19: Release the animal back to AVAILABLE when the adopter withdraws.
    if (application.animalId) {
      await this.rlsBypassPrisma.animal.update({
        where: { id: application.animalId },
        data: { status: 'AVAILABLE' },
      });
    }

    await this.auditService.log('application.withdraw', userId, {
      applicationId: id,
      previousStatus: application.status,
    });

    // Emit event: notification + webhook
    await this.eventsService.emitApplicationWithdrawn(id);

    return updated;
  }
}
