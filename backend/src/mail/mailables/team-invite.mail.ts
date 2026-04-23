import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
export class TeamInviteMail extends QueueableMail {
  readonly template = 'team-invite';
  readonly subject = 'Has sido invitado a unirte al equipo';

  constructor(
    readonly to: string,
    readonly context: {
      orgName: string;
      inviterName: string;
      roleLabel: string;
      inviteUrl: string;
    },
  ) {
    super();
  }
}
