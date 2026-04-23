import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(action: string, userId: string, details?: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: {
        action,
        userId,
        details: details ?? undefined,
      },
    });
  }

  /**
   * Fetch audit entries for an application's lifecycle events in chronological order.
   *
   * Action strings match the canonical AuditLog convention (grep-confirmed in
   * applications.service.ts): `application.create`, `application.status_change`
   * (NOT `status_changed`), `application.withdraw`.
   *
   * Caller is responsible for ownership enforcement (see
   * `ApplicationsService.findStatusHistory` which gates via `findById`).
   */
  async findByApplication(applicationId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'application.create',
            'application.status_change',
            'application.withdraw',
          ],
        },
        details: { path: ['applicationId'], equals: applicationId },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    });
  }
}
