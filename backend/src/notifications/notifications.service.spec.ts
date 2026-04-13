import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NotificationsService, NOTIFICATION_TEMPLATES } from './notifications.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';

const mockPrisma = {
  $transaction: vi.fn((fn) => fn(mockPrisma)),
  $executeRaw: vi.fn(),
  notification: {
    create: vi.fn(),
  },
};

const mockPrismaRls = {
  notification: {
    findMany: vi.fn(),
    count: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
  },
};

describe('NotificationsService', () => {
  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(mockPrisma as any, mockPrismaRls as any);
  });

  describe('createForAdopter', () => {
    it('creates notification with admin bypass', async () => {
      mockPrisma.notification.create.mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: 'STATUS_CHANGED',
        title: 'Estado actualizado',
        body: 'Para Max',
        applicationId: 'app-1',
        isRead: false,
        createdAt: new Date(),
      });

      await service.createForAdopter(
        'user-1',
        'STATUS_CHANGED',
        'Estado actualizado',
        'Para Max',
        'app-1',
      );

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          type: 'STATUS_CHANGED',
          title: 'Estado actualizado',
          body: 'Para Max',
          applicationId: 'app-1',
        },
      });
    });
  });

  describe('findByUser', () => {
    it('returns notifications ordered by createdAt desc', async () => {
      const notifications = [
        { id: 'n-2', title: 'Newer', createdAt: new Date('2026-04-13') },
        { id: 'n-1', title: 'Older', createdAt: new Date('2026-04-12') },
      ];
      mockPrismaRls.notification.findMany.mockResolvedValue(notifications);

      const result = await service.findByUser('user-1');

      expect(mockPrismaRls.notification.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      expect(result).toEqual(notifications);
    });

    it('respects custom limit', async () => {
      mockPrismaRls.notification.findMany.mockResolvedValue([]);

      await service.findByUser('user-1', 5);

      expect(mockPrismaRls.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('countUnreadByUser', () => {
    it('returns count where isRead is false', async () => {
      mockPrismaRls.notification.count.mockResolvedValue(3);

      const result = await service.countUnreadByUser('user-1');

      expect(mockPrismaRls.notification.count).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
      });
      expect(result).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('updates isRead to true when user owns notification', async () => {
      mockPrismaRls.notification.findUnique.mockResolvedValue({
        id: 'n-1',
        userId: 'user-1',
        isRead: false,
      });
      mockPrismaRls.notification.update.mockResolvedValue({
        id: 'n-1',
        isRead: true,
      });

      const result = await service.markAsRead('n-1', 'user-1');

      expect(result.isRead).toBe(true);
    });

    it('throws ForbiddenException when user does not own notification', async () => {
      mockPrismaRls.notification.findUnique.mockResolvedValue({
        id: 'n-1',
        userId: 'user-2',
      });

      await expect(service.markAsRead('n-1', 'user-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws NotFoundException when notification not found', async () => {
      mockPrismaRls.notification.findUnique.mockResolvedValue(null);

      await expect(service.markAsRead('n-1', 'user-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('markAllAsRead', () => {
    it('updates all unread notifications for user', async () => {
      mockPrismaRls.notification.updateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead('user-1');

      expect(mockPrismaRls.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 'user-1', isRead: false },
        data: { isRead: true },
      });
      expect(result).toBe(3);
    });
  });

  describe('NOTIFICATION_TEMPLATES', () => {
    it('has all 6 notification types', () => {
      expect(Object.keys(NOTIFICATION_TEMPLATES)).toHaveLength(6);
    });

    it('each template has title and bodyFn', () => {
      for (const [, template] of Object.entries(NOTIFICATION_TEMPLATES)) {
        expect(template).toHaveProperty('title');
        expect(template).toHaveProperty('bodyFn');
        expect(typeof template.bodyFn).toBe('function');
      }
    });

    it('STATUS_CHANGED template interpolates animalName and newStatus', () => {
      const template = NOTIFICATION_TEMPLATES.STATUS_CHANGED;
      const body = template.bodyFn({ animalName: 'Max', newStatus: 'APROBADA' });
      expect(body).toContain('Max');
      expect(body).toContain('APROBADA');
    });
  });
});
