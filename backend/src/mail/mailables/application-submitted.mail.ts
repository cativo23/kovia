import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-transactional')
@Tries(6)
@Backoff({ type: 'exponential', delay: 30_000 })
export class ApplicationSubmittedMail extends QueueableMail {
  readonly template = 'application-submitted';
  readonly subject = 'Tu solicitud de adopcion fue recibida';

  constructor(
    readonly to: string,
    readonly context: { firstName: string; animalName: string; orgName: string },
  ) {
    super();
  }
}
