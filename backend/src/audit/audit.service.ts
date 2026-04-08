import { Injectable, Inject } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';

@Injectable()
export class AuditService {
  constructor(@Inject(PRISMA_RLS) private readonly prisma: any) {}

  async log(action: string, userId: string, details?: Record<string, unknown>) {
    return this.prisma.auditLog.create({
      data: {
        action,
        userId,
        details: details ?? undefined,
      },
    });
  }
}
