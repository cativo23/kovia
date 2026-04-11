import { Injectable, Inject } from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AuditService } from '../audit/audit.service';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ApplicationsService {
  constructor(
    @Inject(PRISMA_RLS) private readonly prismaRls: any,
    private readonly publicPrisma: PrismaService,
    private readonly uploadService: UploadService,
    private readonly auditService: AuditService,
    private readonly cls: ClsService,
  ) {}
}
