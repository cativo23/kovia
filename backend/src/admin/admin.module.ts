import { Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { BullBoardModule } from '@bull-board/nestjs';
import { ExpressAdapter } from '@bull-board/express';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { BullBoardAuthMiddleware } from './bull-board-auth.middleware';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    MailModule,
    JwtModule,
    BullBoardModule.forRoot({
      route: '/admin/queues',
      adapter: ExpressAdapter,
    }),
  ],
  controllers: [AdminController],
  providers: [AdminService, BullBoardAuthMiddleware],
})
export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(BullBoardAuthMiddleware)
      .forRoutes('/admin/queues');
  }
}
