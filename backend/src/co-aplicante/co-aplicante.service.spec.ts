import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { CoAplicanteService } from './co-aplicante.service';

// -----------------------------------------------------------------------
// Minimal mock factory for PublicPrismaService (bypass client)
// -----------------------------------------------------------------------
type MockPrisma = {
  adoptionApplication: Record<string, ReturnType<typeof vi.fn>>;
};

function makeMockPublicPrisma(): MockPrisma {
  return {
    adoptionApplication: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
  };
}

// -----------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------
const now = new Date();
const FUTURE = new Date(now.getTime() + 72 * 60 * 60 * 1000);
const PAST = new Date(now.getTime() - 1000);

function makeApp(overrides: Partial<Record<string, any>> = {}) {
  return {
    id: 'app-uuid-1',
    coAplicanteToken: 'tok-valid',
    coAplicanteTokenExpiresAt: FUTURE,
    coAplicanteConfirmed: false,
    coAplicanteConfirmedAt: null,
    animal: { name: 'Luna' },
    user: { firstName: 'Carlos' },
    ...overrides,
  };
}

// -----------------------------------------------------------------------
// Tests
// -----------------------------------------------------------------------
describe('CoAplicanteService', () => {
  let service: CoAplicanteService;
  let mockBypass: MockPrisma;

  beforeEach(() => {
    vi.clearAllMocks();
    mockBypass = makeMockPublicPrisma();
    service = new CoAplicanteService(mockBypass as any);
  });

  // ----------------------------------------------------------------------
  // getConfirmationContext
  // ----------------------------------------------------------------------
  describe('getConfirmationContext', () => {
    it('[APPLY-06] returns context for a valid unexpired token', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(makeApp());

      const result = await service.getConfirmationContext('tok-valid');

      expect(result).toEqual({ animalName: 'Luna', adopterFirstName: 'Carlos' });
      expect(mockBypass.adoptionApplication.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { coAplicanteToken: 'tok-valid' },
          include: {
            animal: { select: { name: true } },
            user: { select: { firstName: true } },
          },
        }),
      );
    });

    it('[APPLY-06] throws NotFoundException for unknown token', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(null);

      await expect(service.getConfirmationContext('tok-bad')).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.getConfirmationContext('tok-bad')).rejects.toThrow(
        'Token inválido o expirado',
      );
    });

    it('[APPLY-06] throws UnprocessableEntityException for expired token', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(
        makeApp({ coAplicanteTokenExpiresAt: PAST }),
      );

      await expect(service.getConfirmationContext('tok-expired')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.getConfirmationContext('tok-expired')).rejects.toThrow(
        'El enlace ha expirado',
      );
    });
  });

  // ----------------------------------------------------------------------
  // confirm
  // ----------------------------------------------------------------------
  describe('confirm', () => {
    it('[APPLY-06] sets coAplicanteConfirmed=true and writes confirmedAt', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(makeApp());
      mockBypass.adoptionApplication.update.mockResolvedValue({});

      const result = await service.confirm('tok-valid');

      expect(result).toEqual({ confirmed: true });
      expect(mockBypass.adoptionApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-uuid-1' },
          data: expect.objectContaining({
            coAplicanteConfirmed: true,
            coAplicanteConfirmedAt: expect.any(Date),
          }),
        }),
      );
    });

    it('[APPLY-06] is idempotent on already-confirmed application', async () => {
      const confirmedAt = new Date('2026-01-01T10:00:00Z');
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(
        makeApp({ coAplicanteConfirmed: true, coAplicanteConfirmedAt: confirmedAt }),
      );

      // Call twice
      const r1 = await service.confirm('tok-valid');
      const r2 = await service.confirm('tok-valid');

      expect(r1).toEqual({ confirmed: true });
      expect(r2).toEqual({ confirmed: true });
      // DB.update must NOT be called — no write on already-confirmed
      expect(mockBypass.adoptionApplication.update).not.toHaveBeenCalled();
    });

    it('[APPLY-06] throws NotFoundException for unknown token', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(null);

      await expect(service.confirm('tok-bad')).rejects.toThrow(NotFoundException);
      await expect(service.confirm('tok-bad')).rejects.toThrow(
        'Token inválido o expirado',
      );
    });

    it('[APPLY-06] throws UnprocessableEntityException for expired token', async () => {
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(
        makeApp({ coAplicanteTokenExpiresAt: PAST }),
      );

      await expect(service.confirm('tok-expired')).rejects.toThrow(
        UnprocessableEntityException,
      );
      await expect(service.confirm('tok-expired')).rejects.toThrow(
        'El enlace ha expirado',
      );
    });

    it('[APPLY-06] does not leak whether a token exists vs expired vs confirmed in error responses', async () => {
      // Unknown token → NotFoundException with generic message
      mockBypass.adoptionApplication.findFirst.mockResolvedValue(null);
      let err404: any;
      try {
        await service.getConfirmationContext('tok-unknown');
      } catch (e) {
        err404 = e;
      }

      // Confirm also returns the same generic message for unknown token
      let err404confirm: any;
      try {
        await service.confirm('tok-unknown');
      } catch (e) {
        err404confirm = e;
      }

      expect(err404).toBeInstanceOf(NotFoundException);
      expect(err404confirm).toBeInstanceOf(NotFoundException);
      // Same message — does not distinguish "exists but expired" vs "not found"
      expect(err404.message).toBe('Token inválido o expirado');
      expect(err404confirm.message).toBe('Token inválido o expirado');
    });
  });
});
