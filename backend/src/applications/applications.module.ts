import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UploadModule } from '../upload/upload.module';
import { AuditModule } from '../audit/audit.module';
import { ScoringModule } from '../scoring/scoring.module';

@Module({
  imports: [
    PrismaModule,
    UploadModule,
    AuditModule,
    ScoringModule,
    BullModule.registerQueue({ name: 'scoring' }),
  ],
  controllers: [ApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
