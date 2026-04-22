import { Module } from '@nestjs/common';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
