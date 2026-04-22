import { Logger } from '@nestjs/common';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

type MailJobData = {
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
};

abstract class BaseMailProcessor extends WorkerHost {
  protected readonly logger = new Logger(this.constructor.name);

  constructor(protected readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job<MailJobData>): Promise<void> {
    const { to, subject, template, context } = job.data;
    await this.mailerService.sendMail({ to, subject, template, context });
    this.logger.debug(`Mail sent: ${job.name} → ${to}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job<MailJobData>, error: Error): void {
    this.logger.error(
      `Mail job failed: ${job.name} → ${job.data?.to} — ${error.message}`,
    );
  }
}

@Processor('emails-auth', { concurrency: 5 })
export class AuthMailProcessor extends BaseMailProcessor {
  constructor(mailerService: MailerService) {
    super(mailerService);
  }
}

@Processor('emails-transactional', { concurrency: 3 })
export class TransactionalMailProcessor extends BaseMailProcessor {
  constructor(mailerService: MailerService) {
    super(mailerService);
  }
}
