import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { ClsModule } from 'nestjs-cls';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
      },
    }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_URL
          ? new URL(process.env.REDIS_URL).hostname
          : 'redis',
        port: process.env.REDIS_URL
          ? parseInt(new URL(process.env.REDIS_URL).port || '6379')
          : 6379,
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
