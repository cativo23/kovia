import 'reflect-metadata';
import { getQueueMetadata } from './metadata-reader';
import { QueueableMail } from './queueable-mail';
import { Queue, Tries, Backoff } from './decorators';

// ── Minimal stub mails for foundation tests ──────────────────────────────────

@Queue('emails-transactional')
@Tries(6)
@Backoff({ type: 'exponential', delay: 30_000 })
class StubTransactionalMail extends QueueableMail {
  readonly template = 'stub-transactional';
  readonly subject = 'stub';
  constructor(readonly to: string, readonly context: { firstName: string }) {
    super();
  }
}

@Queue('emails-auth')
@Tries(5)
@Backoff({ type: 'exponential', delay: 10_000 })
class StubAuthMail extends QueueableMail {
  readonly template = 'stub-auth';
  readonly subject = 'stub';
  constructor(readonly to: string, readonly context: { firstName: string }) {
    super();
  }
}

// ── Task 1: Foundation tests ──────────────────────────────────────────────────

describe('getQueueMetadata', () => {
  it('returns emails-auth queue for @Queue("emails-auth") mail', () => {
    const mail = new StubAuthMail('a@b.com', { firstName: 'Ana' });
    expect(getQueueMetadata(mail).queue).toBe('emails-auth');
  });

  it('returns attempts=5 for @Tries(5) mail', () => {
    const mail = new StubAuthMail('a@b.com', { firstName: 'Ana' });
    expect(getQueueMetadata(mail).attempts).toBe(5);
  });

  it('returns emails-transactional queue for @Queue("emails-transactional") mail', () => {
    const mail = new StubTransactionalMail('a@b.com', { firstName: 'Ana' });
    expect(getQueueMetadata(mail).queue).toBe('emails-transactional');
  });

  it('returns attempts=6 for @Tries(6) mail', () => {
    const mail = new StubTransactionalMail('a@b.com', { firstName: 'Ana' });
    expect(getQueueMetadata(mail).attempts).toBe(6);
  });

  it('returns default queue=emails-auth when no @Queue decorator', () => {
    const mail = new QueueableMail();
    expect(getQueueMetadata(mail).queue).toBe('emails-auth');
  });

  it('returns default attempts=5 when no @Tries decorator', () => {
    const mail = new QueueableMail();
    expect(getQueueMetadata(mail).attempts).toBe(5);
  });

  it('returns default backoff.delay=10000 when no @Backoff decorator', () => {
    const mail = new QueueableMail();
    expect(getQueueMetadata(mail).backoff.delay).toBe(10_000);
  });

  it('returns backoff.delay=30000 for @Backoff transactional mail', () => {
    const mail = new StubTransactionalMail('a@b.com', { firstName: 'Ana' });
    expect(getQueueMetadata(mail).backoff.delay).toBe(30_000);
  });
});
