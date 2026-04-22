import { QueueableMail } from './queueable-mail';
import { QUEUE_META, TRIES_META, BACKOFF_META } from './decorators';

export interface QueueMetadata {
  queue: string;
  attempts: number;
  backoff: { type: 'exponential' | 'fixed'; delay: number };
}

/**
 * getQueueMetadata — reads @Queue/@Tries/@Backoff decorator metadata from
 * a QueueableMail instance. Returns defaults if decorators are absent.
 *
 * Single indirection layer: if config strategy changes, update here only.
 */
export function getQueueMetadata(mail: QueueableMail): QueueMetadata {
  const ctor = mail.constructor;
  return {
    queue: Reflect.getMetadata(QUEUE_META, ctor) ?? 'emails-auth',
    attempts: Reflect.getMetadata(TRIES_META, ctor) ?? 5,
    backoff: Reflect.getMetadata(BACKOFF_META, ctor) ?? { type: 'exponential', delay: 10_000 },
  };
}
