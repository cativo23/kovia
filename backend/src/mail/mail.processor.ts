import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class MailProcessor extends WorkerHost {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async process(job: Job) {
    const { to, subject, template, context } = job.data;

    await this.mailerService.sendMail({
      to,
      subject,
      template,
      context,
    });
  }
}
