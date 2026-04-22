import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
export class ResetPasswordMail extends QueueableMail {
  readonly template = 'reset-password';
  readonly subject = 'Restablece tu contrasena en Kovia';

  constructor(
    readonly to: string,
    readonly context: { firstName: string; resetUrl: string },
  ) {
    super();
  }
}
