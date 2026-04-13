import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService, NOTIFICATION_TEMPLATES } from './notifications.service';
import { WebhookService } from './webhook.service';
import { NotificationType } from '../generated/prisma/client';

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
    // Use publicPrisma with admin bypass for atomic notification + outbox creation
    await this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;

      // Create notification
      await tx.notification.create({
        data: { userId: adopterId, type, title, body, applicationId },
      });
    });

    // Enqueue webhook (uses its own transaction)
    await this.webhookService.enqueue(eventType, webhookData);

    this.logger.debug(`Event emitted: ${eventType} (application: ${applicationId})`);
  }

  private async fetchApplicationContext(applicationId: string) {
    try {
      const app = await this.prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;
        return tx.adoptionApplication.findUnique({
          where: { id: applicationId },
          include: { animal: { select: { name: true } } },
        });
      });

      if (!app) return null;

      return {
        adopterId: app.userId,
        animalId: app.animalId,
        organizationId: app.organizationId,
        animalName: (app.animal as any)?.name ?? 'mascota',
      };
    } catch {
      return null;
    }
  }
}
