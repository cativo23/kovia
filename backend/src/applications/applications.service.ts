import {
  Injectable,
  Inject,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AuditService } from '../audit/audit.service';
import { ClsService } from 'nestjs-cls';
import { CreateApplicationDto } from './dto/create-application.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { EventsService } from '../notifications/events.service';

interface UserContext {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

const staffTransitions: Record<string, string[]> = {
  ENVIADA: ['REVISANDO'],
  REVISANDO: ['APROBADA', 'RECHAZADA', 'SEGUIMIENTO'],
  SEGUIMIENTO: ['APROBADA', 'RECHAZADA'],
  APROBADA: ['ADOPTADA'],
  ADOPTADA: ['DEVUELTA'],
};

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    private readonly publicPrisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
    private readonly cls: ClsService,
    @InjectQueue('scoring') private readonly scoringQueue: Queue,
    private readonly eventsService: EventsService,
  ) {}

  async create(dto: CreateApplicationDto, user: UserContext) {
    // Lookup animal to get organizationId and verify availability
    const animal = await this.publicPrisma.animal.findUnique({
      where: { id: dto.animalId },
    });

    if (!animal) {
      throw new NotFoundException(`Animal with ID ${dto.animalId} not found`);
    }

    if (animal.status !== 'AVAILABLE') {
      throw new BadRequestException(
        `Animal is not available for adoption (current status: ${animal.status})`,
      );
    }

    // Check uniqueness: one active (non-RETIRADA) application per animalId+userId.
    // Use publicPrisma (RLS-bypass) with explicit userId filter for consistency with
    // other self-scoped adopter reads (D-19-BE) and to allow resubmit after withdraw (D-14/D-18-BE).
    const existing = await this.publicPrisma.adoptionApplication.findFirst({
      where: {
        animalId: dto.animalId,
        userId: user.id,
        status: { not: 'RETIRADA' },
      },
      select: { id: true },
    });

    if (existing) {
      throw new ConflictException(
        'You have already submitted an application for this animal',
      );
    }

    // Create application using RLS client so app.current_user_id is set for INSERT policy
    const application = await this.prismaRls.adoptionApplication.create({
      data: {
        animalId: dto.animalId,
        userId: user.id,
        organizationId: animal.organizationId,
        personalInfo: dto.personalInfo,
        housing: dto.housing,
        lifestyle: dto.lifestyle,
        socialMedia: dto.socialMedia,
        additionalContext: dto.additionalContext,
        adopterFirstName: user.firstName,
        adopterLastName: user.lastName,
        adopterEmail: user.email,
      },
    });

    // Create photo records if provided
    if (dto.photos && dto.photos.length > 0) {
      await this.prismaRls.applicationPhoto.createMany({
        data: dto.photos.map((photo, idx) => ({
          applicationId: application.id,
          url: photo.url,
          key: photo.key,
          position: photo.position ?? idx,
        })),
      });
    }

    await this.auditService.log('application.create', user.id, {
      applicationId: application.id,
      animalId: dto.animalId,
    });

    // Enqueue scoring job asynchronously
    await this.scoringQueue.add('score', { applicationId: application.id });

    // Emit event: notification + webhook
    await this.eventsService.emitApplicationSubmitted(application.id);

    return application;
  }

  async findMyApplications(userId: string, query: ApplicationQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    // Use publicPrisma (RLS-bypass). Authorization enforced via where: { userId } + findById ownership check.
    const [data, total] = await Promise.all([
      this.publicPrisma.adoptionApplication.findMany({
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
      this.publicPrisma.adoptionApplication.count({ where: { userId } }),
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
    // Use publicPrisma (RLS-bypass). Ownership enforced via explicit userId check below.
    const application = await this.publicPrisma.adoptionApplication.findUnique({
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

    // Use prismaRls — org scoping is enforced via CLS context (app.current_org_id)
    const [data, total] = await Promise.all([
      this.prismaRls.adoptionApplication.findMany({
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
      this.prismaRls.adoptionApplication.count({ where }),
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
    const application = await this.prismaRls.adoptionApplication.findUnique({
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
    // D-18-BE: RETIRADA rows must not block re-application (D-14).
    // Use publicPrisma for consistency with the other self-scoped adopter reads (D-19-BE).
    const application = await this.publicPrisma.adoptionApplication.findFirst({
      where: { animalId, userId, status: { not: 'RETIRADA' } },
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

  async updateStatus(id: string, newStatus: string, userId: string) {
    const application = await this.prismaRls.adoptionApplication.findUnique({
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

    const updated = await this.prismaRls.adoptionApplication.update({
      where: { id },
      data: { status: newStatus },
    });

    await this.auditService.log('application.status_change', userId, {
      applicationId: id,
      oldStatus: application.status,
      newStatus,
    });

    // Emit event: notification + webhook
    await this.eventsService.emitApplicationStatusChanged(
      id,
      application.status,
      newStatus,
    );

    // DEVUELTA fires an additional specific event
    if (newStatus === 'DEVUELTA') {
      await this.eventsService.emitApplicationDevuelta(id);
    }

    return updated;
  }

  async withdraw(id: string, userId: string) {
    // Use publicPrisma — adopter has no org context
    const application = await this.publicPrisma.adoptionApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException(`Application with ID ${id} not found`);
    }

    // Ownership check per D-17
    if (application.userId !== userId) {
      throw new ForbiddenException('You can only withdraw your own applications');
    }

    // D-17: Adopter may only withdraw from ENVIADA or REVISANDO. Any other status is a hard reject.
    if (!['ENVIADA', 'REVISANDO'].includes(application.status)) {
      throw new BadRequestException(
        `No puedes retirar una solicitud en estado ${application.status}`,
      );
    }

    const updated = await this.publicPrisma.adoptionApplication.update({
      where: { id },
      data: { status: 'RETIRADA' },
    });

    await this.auditService.log('application.withdraw', userId, {
      applicationId: id,
      previousStatus: application.status,
    });

    // Emit event: notification + webhook
    await this.eventsService.emitApplicationWithdrawn(id);

    return updated;
  }
}
