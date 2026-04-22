import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-transactional')
@Tries(6)
@Backoff({ type: 'exponential', delay: 30_000 })
export class StatusChangedMail extends QueueableMail {
  readonly template = 'status-changed';
  readonly subject = 'El estado de tu solicitud ha cambiado';

  constructor(
    readonly to: string,
    readonly context: { firstName: string; animalName: string; newStatus: string },
  ) {
    super();
  }
}
