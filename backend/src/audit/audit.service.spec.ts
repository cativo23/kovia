import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  let service: AuditService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      auditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };
    service = new AuditService(prisma);
  });

  describe('log', () => {
    it('should persist an audit entry with action, userId, and details', async () => {
      await service.log('application.create', 'user-1', { applicationId: 'app-1' });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          action: 'application.create',
          userId: 'user-1',
          details: { applicationId: 'app-1' },
        },
      });
    });
  });

  describe('findByApplication', () => {
    it('should query audit entries filtered by applicationId and the three application.* actions, ordered asc', async () => {
      const entries = [
        { id: 'a1', action: 'application.create', createdAt: new Date('2026-01-01') },
      ];
      prisma.auditLog.findMany.mockResolvedValue(entries);

      const result = await service.findByApplication('app-1');

      expect(result).toEqual(entries);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith({
        where: {
          action: {
            in: [
              'application.create',
              'application.status_change',
              'application.withdraw',
            ],
          },
          details: { path: ['applicationId'], equals: 'app-1' },
        },
        orderBy: { createdAt: 'asc' },
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      });
    });

    it('should NOT include the typo action application.status_changed (past tense)', async () => {
      prisma.auditLog.findMany.mockResolvedValue([]);
      await service.findByApplication('app-1');

      const call = prisma.auditLog.findMany.mock.calls[0][0];
      expect(call.where.action.in).not.toContain('application.status_changed');
      expect(call.where.action.in).toContain('application.status_change');
    });
  });
});
