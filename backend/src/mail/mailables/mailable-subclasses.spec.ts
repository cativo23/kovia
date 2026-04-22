import 'reflect-metadata';
import { getQueueMetadata } from './metadata-reader';
import { VerificationMail } from './verification.mail';
import { ResetPasswordMail } from './reset-password.mail';
import { OrgInviteMail } from './org-invite.mail';
import { WelcomeMail } from './welcome.mail';
import { ApplicationSubmittedMail } from './application-submitted.mail';
import { StatusChangedMail } from './status-changed.mail';

describe('VerificationMail', () => {
  const mail = new VerificationMail('a@b.com', { firstName: 'Ana', verificationUrl: 'https://example.com/verify' });

  it('sets to correctly', () => expect(mail.to).toBe('a@b.com'));
  it('sets template to verification', () => expect(mail.template).toBe('verification'));
  it('sets context with firstName and verificationUrl', () => {
    expect(mail.context.firstName).toBe('Ana');
    expect(mail.context.verificationUrl).toBe('https://example.com/verify');
  });
  it('routes to emails-auth queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-auth'));
  it('has 5 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(5));
  it('has backoff delay 10000', () => expect(getQueueMetadata(mail).backoff.delay).toBe(10_000));
});

describe('ResetPasswordMail', () => {
  const mail = new ResetPasswordMail('b@c.com', { firstName: 'Bob', resetUrl: 'https://example.com/reset' });

  it('sets to correctly', () => expect(mail.to).toBe('b@c.com'));
  it('sets template to reset-password', () => expect(mail.template).toBe('reset-password'));
  it('sets context with firstName and resetUrl', () => {
    expect(mail.context.firstName).toBe('Bob');
    expect(mail.context.resetUrl).toBe('https://example.com/reset');
  });
  it('routes to emails-auth queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-auth'));
  it('has 5 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(5));
  it('has backoff delay 10000', () => expect(getQueueMetadata(mail).backoff.delay).toBe(10_000));
});

describe('OrgInviteMail', () => {
  const mail = new OrgInviteMail('c@d.com', { orgName: 'DameTuPata', inviteUrl: 'https://example.com/invite/xyz' });

  it('sets to correctly', () => expect(mail.to).toBe('c@d.com'));
  it('sets template to org-invite', () => expect(mail.template).toBe('org-invite'));
  it('sets context with orgName and inviteUrl', () => {
    expect(mail.context.orgName).toBe('DameTuPata');
    expect(mail.context.inviteUrl).toBe('https://example.com/invite/xyz');
  });
  it('routes to emails-auth queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-auth'));
  it('has 5 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(5));
});

describe('WelcomeMail', () => {
  const mail = new WelcomeMail('d@e.com', { firstName: 'Diana' });

  it('sets to correctly', () => expect(mail.to).toBe('d@e.com'));
  it('sets template to welcome', () => expect(mail.template).toBe('welcome'));
  it('sets context with firstName', () => expect(mail.context.firstName).toBe('Diana'));
  it('routes to emails-auth queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-auth'));
  it('has 5 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(5));
});

describe('ApplicationSubmittedMail', () => {
  const mail = new ApplicationSubmittedMail('e@f.com', { firstName: 'Eve', animalName: 'Toby', orgName: 'Kovia' });

  it('sets to correctly', () => expect(mail.to).toBe('e@f.com'));
  it('sets template to application-submitted', () => expect(mail.template).toBe('application-submitted'));
  it('sets context with firstName, animalName, orgName', () => {
    expect(mail.context.firstName).toBe('Eve');
    expect(mail.context.animalName).toBe('Toby');
    expect(mail.context.orgName).toBe('Kovia');
  });
  it('routes to emails-transactional queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-transactional'));
  it('has 6 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(6));
  it('has backoff delay 30000', () => expect(getQueueMetadata(mail).backoff.delay).toBe(30_000));
});

describe('StatusChangedMail', () => {
  const mail = new StatusChangedMail('f@g.com', { firstName: 'Frank', animalName: 'Luna', newStatus: 'APROBADA' });

  it('sets to correctly', () => expect(mail.to).toBe('f@g.com'));
  it('sets template to status-changed', () => expect(mail.template).toBe('status-changed'));
  it('sets context with firstName, animalName, newStatus', () => {
    expect(mail.context.firstName).toBe('Frank');
    expect(mail.context.animalName).toBe('Luna');
    expect(mail.context.newStatus).toBe('APROBADA');
  });
  it('routes to emails-transactional queue', () => expect(getQueueMetadata(mail).queue).toBe('emails-transactional'));
  it('has 6 attempts', () => expect(getQueueMetadata(mail).attempts).toBe(6));
  it('has backoff delay 30000', () => expect(getQueueMetadata(mail).backoff.delay).toBe(30_000));
});
