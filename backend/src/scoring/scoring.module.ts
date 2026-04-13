import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScoringProcessor } from './scoring.processor';
import { ScoringService } from './scoring.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scoring' }),
    PrismaModule,
    NotificationsModule,
  ],
  providers: [ScoringProcessor, ScoringService],
  exports: [ScoringService, BullModule.registerQueue({ name: 'scoring' })],
})
export class ScoringModule {}
