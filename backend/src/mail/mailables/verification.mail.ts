import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
export class VerificationMail extends QueueableMail {
  readonly template = 'verification';
  readonly subject = 'Verifica tu cuenta en Kovia';

  constructor(
    readonly to: string,
    readonly context: { firstName: string; verificationUrl: string },
  ) {
    super();
  }
}
