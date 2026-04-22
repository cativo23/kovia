import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailDispatcher } from './mail-dispatcher.service';
import { AuthMailProcessor, TransactionalMailProcessor } from './mail.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'emails-auth' }),
    BullModule.registerQueue({ name: 'emails-transactional' }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('MAIL_HOST', 'mailpit'),
          port: config.get<number>('MAIL_PORT', 1025),
          ignoreTLS: true,
        },
        defaults: {
          from: '"Kovia" <noreply@kovia.app>',
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
    }),
  ],
  providers: [
    MailDispatcher,
    AuthMailProcessor,
    TransactionalMailProcessor,
  ],
  exports: [MailDispatcher],
})
export class MailModule {}
