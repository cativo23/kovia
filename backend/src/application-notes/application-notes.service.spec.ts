import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApplicationNotesService } from './application-notes.service';

// Mock prismaRls
const mockPrismaRls = {
  applicationNote: {
    create: vi.fn(),
    findMany: vi.fn(),
  },
};

// Mock ClsService
const mockCls = {
  get: vi.fn(),
};

describe('ApplicationNotesService', () => {
  let service: ApplicationNotesService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ApplicationNotesService(mockPrismaRls as any, mockCls as any);
  });

  describe('create', () => {
    it('sets organizationId from CLS context, not from body', async () => {
      const orgIdFromCls = 'org-from-cls-123';
      mockCls.get.mockReturnValue(orgIdFromCls);
      mockPrismaRls.applicationNote.create.mockResolvedValue({
        id: 'note-1',
        applicationId: 'app-1',
        organizationId: orgIdFromCls,
        authorId: 'user-1',
        body: 'Test note',
        createdAt: new Date(),
        author: { firstName: 'John', lastName: 'Doe' },
      });

      const dto = { body: 'Test note' };
      await service.create('app-1', dto, 'user-1');

      expect(mockCls.get).toHaveBeenCalledWith('orgId');
      expect(mockPrismaRls.applicationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            organizationId: orgIdFromCls,
          }),
        }),
      );
    });

    it('includes authorId from userId parameter', async () => {
      mockCls.get.mockReturnValue('org-123');
      mockPrismaRls.applicationNote.create.mockResolvedValue({
        id: 'note-1',
        applicationId: 'app-1',
        organizationId: 'org-123',
        authorId: 'user-abc',
        body: 'Test',
        createdAt: new Date(),
        author: { firstName: 'Jane', lastName: 'Smith' },
      });

      await service.create('app-1', { body: 'Test' }, 'user-abc');

      expect(mockPrismaRls.applicationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            authorId: 'user-abc',
          }),
        }),
      );
    });

    it('includes applicationId in the created note', async () => {
      mockCls.get.mockReturnValue('org-123');
      mockPrismaRls.applicationNote.create.mockResolvedValue({
        id: 'note-1',
        applicationId: 'app-xyz',
        organizationId: 'org-123',
        authorId: 'user-1',
        body: 'Body text',
        createdAt: new Date(),
        author: { firstName: 'A', lastName: 'B' },
      });

      await service.create('app-xyz', { body: 'Body text' }, 'user-1');

      expect(mockPrismaRls.applicationNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            applicationId: 'app-xyz',
          }),
        }),
      );
    });
  });

  describe('findByApplication', () => {
    it('returns notes for given applicationId ordered by createdAt desc', async () => {
      const notes = [
        { id: 'note-2', body: 'Second', createdAt: new Date('2026-02-01') },
        { id: 'note-1', body: 'First', createdAt: new Date('2026-01-01') },
      ];
      mockPrismaRls.applicationNote.findMany.mockResolvedValue(notes);

      const result = await service.findByApplication('app-1');

      expect(mockPrismaRls.applicationNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { applicationId: 'app-1' },
          orderBy: { createdAt: 'desc' },
        }),
      );
      expect(result).toEqual(notes);
    });

    it('includes author firstName and lastName in results', async () => {
      mockPrismaRls.applicationNote.findMany.mockResolvedValue([]);

      await service.findByApplication('app-1');

      expect(mockPrismaRls.applicationNote.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: expect.objectContaining({
            author: expect.objectContaining({
              select: { firstName: true, lastName: true },
            }),
          }),
        }),
      );
    });
  });
});
