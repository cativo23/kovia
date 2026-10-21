import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { PRISMA_RLS } from '../prisma/prisma.module.js';
import { StartFosterDto } from './dto/start-foster.dto.js';
import { CompleteFosterDto } from './dto/complete-foster.dto.js';

@Injectable()
export class FosterService {
  constructor(
    @Inject(PRISMA_RLS) private readonly rlsPrisma: any,
    private readonly cls: ClsService,
  ) {}

  /**
   * start() — creates a FosterPeriod for an application.
   *
   * D-11: Light entity — state + dates + counselor notes + outcome.
   * No PII fields accepted (DTO whitelist; national-id capture is v3.1+ scope).
   * This service does NOT change application status — Plan 04 gates handle that.
   */
  async start(dto: StartFosterDto) {
    const application = await this.rlsPrisma.adoptionApplication.findUnique({
      where: { id: dto.applicationId },
      select: { id: true, status: true },
    });

    if (!application) {
      throw new NotFoundException(`Application ${dto.applicationId} not found`);
    }

    // Prevent duplicate foster periods for the same application (0:1 constraint)
    const existing = await this.rlsPrisma.fosterPeriod.findUnique({
      where: { applicationId: dto.applicationId },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException(
        `A foster period already exists for application ${dto.applicationId}`,
      );
    }

    const user = this.cls.get<{ id: string }>('user');

    return this.rlsPrisma.fosterPeriod.create({
      data: {
        applicationId: dto.applicationId,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : new Date(),
        counselorId: user?.id ?? 'unknown',
      },
    });
  }

  /**
   * complete() — records outcome at end of foster period.
   *
   * D-12: outcome PROCEED → adoption eligible; REJECTED → foster-failed.
   * Application status transition is handled by Plan 04's applications.service gate.
   * This service only records the FosterPeriod outcome.
   */
  async complete(fosterPeriodId: string, dto: CompleteFosterDto) {
    const fosterPeriod = await this.rlsPrisma.fosterPeriod.findUnique({
      where: { id: fosterPeriodId },
      select: {
        id: true,
        applicationId: true,
        outcome: true,
        endedAt: true,
      },
    });

    if (!fosterPeriod) {
      throw new NotFoundException(`FosterPeriod ${fosterPeriodId} not found`);
    }

    if (fosterPeriod.outcome !== null) {
      throw new BadRequestException(
        `FosterPeriod ${fosterPeriodId} is already completed`,
      );
    }

    const user = this.cls.get<{ id: string }>('user');
    const now = new Date();

    return this.rlsPrisma.fosterPeriod.update({
      where: { id: fosterPeriodId },
      data: {
        outcome: dto.outcome,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : now,
        counselorNotes: dto.counselorNotes ?? null,
        counselorId: user?.id ?? 'unknown',
      },
    });
  }
}
