import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { WebhookService } from './webhook.service';
import { WebhookProcessor } from './webhook.processor';
import { EventsService } from './events.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({ name: 'webhook' }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    WebhookService,
    WebhookProcessor,
    EventsService,
  ],
  exports: [NotificationsService, EventsService],
})
export class NotificationsModule {}
