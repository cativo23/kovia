import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ScoringProcessor } from './scoring.processor';
import { ScoringService } from './scoring.service';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'scoring' }),
    BullBoardModule.forFeature({
      name: 'scoring',
      adapter: BullMQAdapter,
    }),
    PrismaModule,
    NotificationsModule,
  ],
  providers: [ScoringProcessor, ScoringService],
  exports: [ScoringService],
})
export class ScoringModule {}
