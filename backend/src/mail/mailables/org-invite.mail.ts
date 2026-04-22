import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
export class OrgInviteMail extends QueueableMail {
  readonly template = 'org-invite';
  readonly subject = 'Has sido invitado a unirte a Kovia';

  constructor(
    readonly to: string,
    readonly context: { orgName: string; inviteUrl: string },
  ) {
    super();
  }
}
