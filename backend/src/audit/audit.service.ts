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
}
