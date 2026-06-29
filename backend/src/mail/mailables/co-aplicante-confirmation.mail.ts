import { Queue, Tries, Backoff } from './decorators';
import { QueueableMail } from './queueable-mail';

@Queue('emails-transactional')
@Tries(6)
@Backoff({ type: 'exponential', delay: 30_000 })
export class CoAplicanteConfirmationMail extends QueueableMail {
  readonly template = 'co-aplicante-confirmation';
  readonly subject = 'Confirmá tu participación en una solicitud de adopción';

  constructor(
    readonly to: string,
    readonly context: {
      nombre: string;
      confirmationUrl: string;
      animalName?: string;
      adopterFirstName?: string;
    },
  ) {
    super();
  }
}
