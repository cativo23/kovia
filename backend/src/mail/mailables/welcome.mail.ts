import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
export class WelcomeMail extends QueueableMail {
  readonly template = 'welcome';
  readonly subject = 'Bienvenido/a a Kovia';

  constructor(
    readonly to: string,
    readonly context: { firstName: string },
  ) {
    super();
  }
}
