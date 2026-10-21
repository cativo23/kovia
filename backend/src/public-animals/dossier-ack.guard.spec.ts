import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';
import { DossierAckGuard } from './dossier-ack.guard';

/**
 * DossierAckGuard unit spec (Phase 15-03 Task 2, T-15-02 + T-15-Stale-Ack).
 *
 * Phase 15 ships the class fully implemented; Phase 16 binds it to the
 * apply endpoint via `@UseGuards(DossierAckGuard)`. This spec drives the
 * `canActivate` predicate via mocked rlsPrisma — no DB needed.
 */

function makeCtx(
  user: { id?: string } | undefined,
  params: { id?: string; animalId?: string } | undefined,
  body?: { animalId?: string },
): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user, params, body }),
    }),
  } as unknown as ExecutionContext;
}

// Phase 16 may bind this guard to `POST /animals/:animalId/apply` so the
// guard reads `params.animalId` first. If a future route uses `:id`
// instead, the guard falls back to `params.id` (also tested in the
// happy-path case below).

describe('DossierAckGuard', () => {
  let rlsPrismaMock: {
    dossierAcknowledgment: { findUnique: ReturnType<typeof vi.fn> };
  };
  let guard: DossierAckGuard;

  beforeEach(() => {
    rlsPrismaMock = {
      dossierAcknowledgment: {
        findUnique: vi.fn(),
      },
    };
    guard = new DossierAckGuard(rlsPrismaMock as any);
  });

  it('throws ForbiddenException when req.user is missing', async () => {
    const ctx = makeCtx(undefined, { id: 'animal-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      /Acknowledgment required/,
    );
    expect(rlsPrismaMock.dossierAcknowledgment.findUnique).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when animalId param is missing', async () => {
    const ctx = makeCtx({ id: 'user-1' }, {});
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      /Acknowledgment required/,
    );
    expect(rlsPrismaMock.dossierAcknowledgment.findUnique).not.toHaveBeenCalled();
  });

  it('throws ForbiddenException when no DossierAcknowledgment exists for (userId, animalId)', async () => {
    rlsPrismaMock.dossierAcknowledgment.findUnique.mockResolvedValue(null);
    const ctx = makeCtx({ id: 'user-1' }, { animalId: 'animal-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      /reconocer haber leído el dossier/,
    );
  });

  it('throws ForbiddenException when ack.dossierVersion does not match animal.dossierVersion (stale)', async () => {
    rlsPrismaMock.dossierAcknowledgment.findUnique.mockResolvedValue({
      dossierVersion: 1,
      animal: { dossierVersion: 2 },
    });
    const ctx = makeCtx({ id: 'user-1' }, { animalId: 'animal-1' });
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    await expect(guard.canActivate(ctx)).rejects.toThrow(
      /dossier fue actualizado/,
    );
  });

  it('returns true when ack exists and dossierVersion matches (params.animalId)', async () => {
    rlsPrismaMock.dossierAcknowledgment.findUnique.mockResolvedValue({
      dossierVersion: 3,
      animal: { dossierVersion: 3 },
    });
    const ctx = makeCtx({ id: 'user-1' }, { animalId: 'animal-1' });
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(rlsPrismaMock.dossierAcknowledgment.findUnique).toHaveBeenCalledWith(
      {
        where: { userId_animalId: { userId: 'user-1', animalId: 'animal-1' } },
        include: { animal: { select: { dossierVersion: true } } },
      },
    );
  });
});
