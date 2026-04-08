import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  constructor(
    @InjectQueue('email') private readonly emailQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async sendVerificationEmail(
    email: string,
    token: string,
    firstName: string,
  ) {
    const appUrl = this.config.get<string>('APP_URL');
    await this.emailQueue.add('verification', {
      to: email,
      subject: 'Verifica tu cuenta en Kovia',
      template: 'verification',
      context: {
        firstName,
        verificationUrl: `${appUrl}/verify-email?token=${token}`,
      },
    });
  }

  async sendResetPasswordEmail(
    email: string,
    token: string,
    firstName: string,
  ) {
    const appUrl = this.config.get<string>('APP_URL');
    await this.emailQueue.add('reset-password', {
      to: email,
      subject: 'Restablece tu contrasena en Kovia',
      template: 'reset-password',
      context: {
        firstName,
        resetUrl: `${appUrl}/reset-password?token=${token}`,
      },
    });
  }

  async sendOrgInviteEmail(
    email: string,
    token: string,
    orgName: string,
  ) {
    const appUrl = this.config.get<string>('APP_URL');
    await this.emailQueue.add('org-invite', {
      to: email,
      subject: `Has sido invitado a unirte a Kovia`,
      template: 'org-invite',
      context: {
        orgName,
        inviteUrl: `${appUrl}/invite?token=${token}`,
      },
    });
  }
}
