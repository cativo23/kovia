import { Queueable } from './queueable.interface';

/**
 * QueueableMail — concrete base class for all email Mailables.
 * Mirrors Laravel's Mailable (concrete, not abstract).
 *
 * Context constraint: context values must be primitives only (string | number | boolean).
 * Never pass Prisma model instances — BullMQ serializes to JSON.
 */
export class QueueableMail implements Queueable {
  readonly template: string = '';
  readonly subject: string = '';
  readonly to: string = '';
  readonly context: Record<string, unknown> = {};
}
