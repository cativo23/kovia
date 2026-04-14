import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventsService } from './events.service';
import { NotificationType } from '../generated/prisma/client';

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

describe('EventsService', () => {
  let service: EventsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new EventsService(
      mockPrisma as any,
      mockNotificationsService as any,
      mockWebhookService as any,
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
});
