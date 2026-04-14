import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WebhookService } from './webhook.service';

const mockWebhookQueue = {
  add: vi.fn(),
};

const mockPrisma = {
  $transaction: vi.fn((args) => {
    if (Array.isArray(args)) return Promise.all(args);
    return args(mockPrisma);
  }),
  $executeRaw: vi.fn(),
  webhookOutbox: {
    create: vi.fn(),
  },
};

const mockConfig = {
  get: vi.fn(),
};

describe('WebhookService', () => {
  let service: WebhookService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new WebhookService(
      mockWebhookQueue as any,
      mockPrisma as any,
      mockConfig as any,
    );
  });

  describe('buildPayload', () => {
    it('creates consistent payload schema', () => {
      const payload = service.buildPayload('application.submitted', {
        applicationId: 'app-1',
      });

      expect(payload.id).toMatch(/^evt_/);
      expect(payload.type).toBe('application.submitted');
      expect(payload.timestamp).toMatch(/\d{4}-\d{2}-\d{2}/);
      expect(payload.data).toEqual({ applicationId: 'app-1' });
    });
  });

  describe('enqueue', () => {
    it('skips silently when N8N_WEBHOOK_URL is empty', async () => {
      mockConfig.get.mockReturnValue('');

      await service.enqueue('application.submitted', {});

      expect(mockPrisma.webhookOutbox.create).not.toHaveBeenCalled();
      expect(mockWebhookQueue.add).not.toHaveBeenCalled();
    });

    it('creates outbox record and enqueues job when URL is set', async () => {
      mockConfig.get.mockReturnValue('https://n8n.example.com/webhook');
      mockPrisma.webhookOutbox.create.mockResolvedValue({
        id: 'outbox-1',
        eventType: 'application.submitted',
        idempotencyKey: 'key-1',
      });

      await service.enqueue('application.submitted', { applicationId: 'app-1' });

      expect(mockPrisma.webhookOutbox.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventType: 'application.submitted',
          status: 'PENDING',
        }),
      });
      expect(mockWebhookQueue.add).toHaveBeenCalledWith(
        'application.submitted',
        { outboxId: 'outbox-1' },
        expect.objectContaining({
          attempts: 6,
        }),
      );
    });

    it('generates unique idempotencyKey', async () => {
      mockConfig.get.mockReturnValue('https://n8n.example.com/webhook');
      mockPrisma.webhookOutbox.create.mockResolvedValue({
        id: 'outbox-1',
        eventType: 'application.submitted',
        idempotencyKey: 'test-key',
      });

      await service.enqueue('application.submitted', {});

      expect(mockPrisma.webhookOutbox.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            idempotencyKey: expect.any(String),
          }),
        }),
      );
    });
  });
});
