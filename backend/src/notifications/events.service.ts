import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NOTIFICATION_TEMPLATES } from './notifications.service';
import { WebhookService } from './webhook.service';
import { NotificationType } from '../generated/prisma/client';
import { MailDispatcher } from '../mail/mail-dispatcher.service';
import { ApplicationSubmittedMail } from '../mail/mailables/application-submitted.mail';
import { StatusChangedMail } from '../mail/mailables/status-changed.mail';

/**
 * EventsService — centralized event emission service.
 * Called from ApplicationsService, ApplicationNotesService, and ScoringProcessor
 * to emit notifications and webhooks atomically.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly webhookService: WebhookService,
    private readonly mailDispatcher: MailDispatcher,
  ) {}

  async emitApplicationSubmitted(applicationId: string) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.APPLICATION_SUBMITTED;
    const title = template.title;
    const body = template.bodyFn({ animalName: context.animalName });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.APPLICATION_SUBMITTED,
      title,
      body,
      applicationId,
      'application.submitted',
      {
        applicationId,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        metadata: { animalName: context.animalName },
      },
    );

    // Dispatch email — AFTER $transaction commits (D-11 convention)
    if (!context.adopterEmail) {
      this.logger.warn(`Skipping email dispatch: no email for adopter ${context.adopterId}`);
      return;
    }
    await this.mailDispatcher.send(
      new ApplicationSubmittedMail(context.adopterEmail, {
        firstName: context.adopterFirstName,
        animalName: context.animalName,
        orgName: context.orgName,
      }),
    );
  }

  async emitApplicationStatusChanged(
    applicationId: string,
    previousStatus: string,
    newStatus: string,
  ) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.STATUS_CHANGED;
    const title = template.title;
    const body = template.bodyFn({
      animalName: context.animalName,
      newStatus,
    });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.STATUS_CHANGED,
      title,
      body,
      applicationId,
      'application.status_changed',
      {
        applicationId,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        status: newStatus,
        previousStatus,
        metadata: { animalName: context.animalName },
      },
    );

    // Dispatch email — AFTER $transaction commits (D-11 convention)
    if (!context.adopterEmail) {
      this.logger.warn(`Skipping email dispatch: no email for adopter ${context.adopterId}`);
      return;
    }
    await this.mailDispatcher.send(
      new StatusChangedMail(context.adopterEmail, {
        firstName: context.adopterFirstName,
        animalName: context.animalName,
        newStatus,
      }),
    );
  }

  async emitNoteAdded(applicationId: string, noteId: string) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.NOTE_ADDED;
    const title = template.title;
    const body = template.bodyFn({ animalName: context.animalName });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.NOTE_ADDED,
      title,
      body,
      applicationId,
      'application.note_added',
      {
        applicationId,
        noteId,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        metadata: { animalName: context.animalName },
      },
    );
  }

  async emitApplicationScored(
    applicationId: string,
    score: number,
    riskLevel: string,
  ) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.SCORED;
    const title = template.title;
    const body = template.bodyFn({ animalName: context.animalName });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.SCORED,
      title,
      body,
      applicationId,
      'application.scored',
      {
        applicationId,
        score,
        riskLevel,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        metadata: { animalName: context.animalName },
      },
    );
  }

  async emitApplicationWithdrawn(applicationId: string) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.WITHDRAWN;
    const title = template.title;
    const body = template.bodyFn({ animalName: context.animalName });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.WITHDRAWN,
      title,
      body,
      applicationId,
      'application.withdrawn',
      {
        applicationId,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        metadata: { animalName: context.animalName },
      },
    );
  }

  async emitApplicationDevuelta(applicationId: string) {
    const context = await this.fetchApplicationContext(applicationId);
    if (!context) return;

    const template = NOTIFICATION_TEMPLATES.DEVUELTA;
    const title = template.title;
    const body = template.bodyFn({ animalName: context.animalName });

    await this.emitAndEnqueue(
      context.adopterId,
      NotificationType.DEVUELTA,
      title,
      body,
      applicationId,
      'application.devuelta',
      {
        applicationId,
        adopterId: context.adopterId,
        animalId: context.animalId,
        organizationId: context.organizationId,
        metadata: { animalName: context.animalName },
      },
    );
  }

  private async emitAndEnqueue(
    adopterId: string,
    type: NotificationType,
    title: string,
    body: string,
    applicationId: string,
    eventType: string,
    webhookData: object,
  ) {
    // Batch transaction: set_config + create run on same PG connection.
    // Interactive transactions (async callback) break with @prisma/adapter-pg
    // because it splits operations into separate PG transactions.
    const [, notification] = await this.prisma.$transaction([
      this.prisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
      this.prisma.notification.create({
        data: { userId: adopterId, type, title, body, applicationId },
      }),
    ]);

    // Enqueue webhook (uses its own transaction)
    await this.webhookService.enqueue(eventType, webhookData);

    this.logger.debug(`Event emitted: ${eventType} (application: ${applicationId})`);
  }

  private async fetchApplicationContext(applicationId: string) {
    try {
      const [, app] = await this.prisma.$transaction([
        this.prisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`,
        this.prisma.adoptionApplication.findUnique({
          where: { id: applicationId },
          include: {
            animal: { select: { name: true } },
            user: { select: { email: true, firstName: true } },
            organization: { select: { name: true } },
          },
        }),
      ]);

      if (!app) return null;

      return {
        adopterId: app.userId,
        animalId: app.animalId,
        organizationId: app.organizationId,
        animalName: (app.animal as any)?.name ?? 'mascota',
        adopterEmail: (app.user as any)?.email ?? '',
        adopterFirstName: (app.user as any)?.firstName ?? '',
        orgName: (app.organization as any)?.name ?? '',
      };
    } catch (error: unknown) {
      this.logger.error(
        `fetchApplicationContext failed for application ${applicationId}: ${(error as Error).message}`,
        (error as Error).stack,
      );
      return null;
    }
  }
}
