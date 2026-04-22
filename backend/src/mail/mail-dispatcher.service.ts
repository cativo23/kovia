import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { QueueableMail } from './mailables/queueable-mail';
import { getQueueMetadata } from './mailables/metadata-reader';

@Injectable()
export class MailDispatcher {
  constructor(
    @InjectQueue('emails-auth') private readonly authQueue: Queue,
    @InjectQueue('emails-transactional') private readonly txQueue: Queue,
  ) {}

  async send(mail: QueueableMail): Promise<void> {
    const meta = getQueueMetadata(mail);
    if (meta.queue !== 'emails-auth' && meta.queue !== 'emails-transactional') {
      throw new Error(
        `Unknown mail queue: "${meta.queue}". Check @Queue decorator on ${mail.constructor.name}.`,
      );
    }
    const queue = meta.queue === 'emails-auth' ? this.authQueue : this.txQueue;
    await queue.add(
      mail.constructor.name,
      {
        to: mail.to,
        subject: mail.subject,
        template: mail.template,
        context: mail.context,
      },
      {
        attempts: meta.attempts,
        backoff: meta.backoff,
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    );
  }
}
