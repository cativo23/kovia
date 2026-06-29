import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsService } from './events.service';
import { NotificationType } from '../generated/prisma/client';
import { CoAplicanteConfirmationMail } from '../mail/mailables/co-aplicante-confirmation.mail';

const mockPrisma = {
  $transaction: vi.fn(async (args) => {
    // Support both batch (array) and interactive (callback) transactions
    if (Array.isArray(args)) return Promise.all(args);
    return args(mockPrisma);
  }),
  $executeRaw: vi.fn(),
  adoptionApplication: {
    findUnique: vi.fn(),
  },
  notification: {
    create: vi.fn(),
  },
};

const mockNotificationsService = {
  createForAdopter: vi.fn(),
};

const mockWebhookService = {
  enqueue: vi.fn(),
};

const mockMailDispatcher = {
  send: vi.fn().mockResolvedValue(undefined),
};

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventsService(
      mockPrisma as any,
      mockNotificationsService as any,
      mockWebhookService as any,
      mockMailDispatcher as any,
    );

    // Default mock for fetching application context
    mockPrisma.adoptionApplication.findUnique.mockResolvedValue({
      id: 'app-1',
      userId: 'user-1',
      animalId: 'animal-1',
      organizationId: 'org-1',
      animal: { name: 'Max' },
    });
    mockPrisma.notification.create.mockResolvedValue({ id: 'notif-1' });
  });

  describe('emitApplicationSubmitted', () => {
    it('creates notification and enqueues webhook', async () => {
      await service.emitApplicationSubmitted('app-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          type: NotificationType.APPLICATION_SUBMITTED,
          applicationId: 'app-1',
        }),
      });
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'application.submitted',
        expect.objectContaining({
          applicationId: 'app-1',
          adopterId: 'user-1',
        }),
      );
    });
  });

  describe('emitApplicationStatusChanged', () => {
    it('creates notification with status info', async () => {
      await service.emitApplicationStatusChanged('app-1', 'ENVIADA', 'APROBADA');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.STATUS_CHANGED,
        }),
      });
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'application.status_changed',
        expect.objectContaining({
          status: 'APROBADA',
          previousStatus: 'ENVIADA',
        }),
      );
    });
  });

  describe('emitNoteAdded', () => {
    it('creates notification and enqueues webhook', async () => {
      await service.emitNoteAdded('app-1', 'note-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.NOTE_ADDED,
        }),
      });
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'application.note_added',
        expect.objectContaining({ noteId: 'note-1' }),
      );
    });
  });

  describe('emitApplicationScored', () => {
    it('creates notification with score info', async () => {
      await service.emitApplicationScored('app-1', 85, 'bajo_riesgo');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.SCORED,
        }),
      });
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'application.scored',
        expect.objectContaining({ score: 85, riskLevel: 'bajo_riesgo' }),
      );
    });
  });

  describe('emitApplicationWithdrawn', () => {
    it('creates notification and enqueues webhook', async () => {
      await service.emitApplicationWithdrawn('app-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.WITHDRAWN,
        }),
      });
    });
  });

  describe('emitApplicationDevuelta', () => {
    it('creates notification and enqueues webhook', async () => {
      await service.emitApplicationDevuelta('app-1');

      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: NotificationType.DEVUELTA,
        }),
      });
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'application.devuelta',
        expect.any(Object),
      );
    });
  });

  describe('fetchApplicationContext', () => {
    it('returns null when application not found', async () => {
      mockPrisma.adoptionApplication.findUnique.mockResolvedValue(null);

      // emitApplicationSubmitted will silently return
      await service.emitApplicationSubmitted('nonexistent');

      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('emitCoAplicanteConfirmationRequested', () => {
    const coAplicantePayload = {
      coAplicanteNombre: 'María García',
      coAplicanteEmail: 'maria@example.com',
      coAplicantePhone: '+50312345678',
      confirmationUrl: 'https://kovia.app/confirmar-coapplicante/some-uuid',
      expiresAt: new Date('2026-07-01T00:00:00Z'),
      animalName: 'Firulais',
      adopterFirstName: 'Juan',
    };

    it('[APPLY-06] emitCoAplicanteConfirmationRequested calls webhookService.enqueue with co_aplicante.confirmation_requested eventType', async () => {
      mockWebhookService.enqueue.mockResolvedValue(undefined);

      await service.emitCoAplicanteConfirmationRequested('app-co-1', coAplicantePayload);

      expect(mockWebhookService.enqueue).toHaveBeenCalledOnce();
      expect(mockWebhookService.enqueue).toHaveBeenCalledWith(
        'co_aplicante.confirmation_requested',
        expect.objectContaining({
          applicationId: 'app-co-1',
          coAplicanteNombre: 'María García',
          coAplicanteEmail: 'maria@example.com',
          confirmationUrl: 'https://kovia.app/confirmar-coapplicante/some-uuid',
        }),
      );
    });

    it('[APPLY-06] emitCoAplicanteConfirmationRequested calls mailDispatcher.send with CoAplicanteConfirmationMail to coAplicanteEmail', async () => {
      mockWebhookService.enqueue.mockResolvedValue(undefined);

      await service.emitCoAplicanteConfirmationRequested('app-co-1', coAplicantePayload);

      expect(mockMailDispatcher.send).toHaveBeenCalledOnce();
      const sentMail = mockMailDispatcher.send.mock.calls[0][0];
      expect(sentMail).toBeInstanceOf(CoAplicanteConfirmationMail);
      expect(sentMail.to).toBe('maria@example.com');
    });

    it('[APPLY-06] emitCoAplicanteConfirmationRequested does NOT call emitAndEnqueue helper (no notification row for co-aplicante)', async () => {
      mockWebhookService.enqueue.mockResolvedValue(undefined);

      await service.emitCoAplicanteConfirmationRequested('app-co-1', coAplicantePayload);

      // emitAndEnqueue always creates a notification row via prisma.notification.create —
      // asserting it was never called proves no notification row was created for the co-aplicante.
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
    });
  });
});
