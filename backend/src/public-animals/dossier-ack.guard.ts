import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
} from '@nestjs/common';
import { PRISMA_RLS } from '../prisma/prisma.module';

/**
 * DossierAckGuard — Phase 15-03, T-15-02 + T-15-Stale-Ack mitigation.
 *
 * Phase 15 ships the class fully implemented + unit-tested. Phase 16 binds
 * it to the apply endpoint via `@UseGuards(DossierAckGuard)` (additive — the
 * binding is in the Phase 16 PR's diff, not silently dropped).
 *
 * Predicate: a user can pass this gate iff
 *   1. A `DossierAcknowledgment` row exists for `(userId, animalId)`.
 *   2. The stored `ack.dossierVersion` equals the current
 *      `animal.dossierVersion`. Any subsequent edit on the dossier (via
 *      `AnimalsService.update`) bumps the version (D-09), invalidating
 *      stale acks until the user re-reads + re-acks.
 *
 * PATTERN-01: uses `rlsPrisma` (NEW class — not the grandfathered
 * `prismaRls`). The single `findUnique` is RLS-aware so the `userId`
 * predicate is also enforced at the row-policy layer (`adopter_read_own_acks`).
 */
@Injectable()
export class DossierAckGuard implements CanActivate {
  constructor(@Inject(PRISMA_RLS) private readonly rlsPrisma: any) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const userId: string | undefined = req?.user?.id;
    // Accept both `:animalId` and `:id` route param shapes so Phase 16 can
    // pick whichever naming feels right for the apply route (currently
    // `POST /animals/:id/apply` in the codebase). Body fallback covers
    // hypothetical multi-resource routes where animalId is in the payload.
    const animalId: string | undefined =
      req?.params?.animalId ?? req?.params?.id ?? req?.body?.animalId;

    if (!userId || !animalId) {
      throw new ForbiddenException('Acknowledgment required');
    }

    const ack = await this.rlsPrisma.dossierAcknowledgment.findUnique({
      where: { userId_animalId: { userId, animalId } },
      include: { animal: { select: { dossierVersion: true } } },
    });

    if (!ack) {
      throw new ForbiddenException(
        'Debes reconocer haber leído el dossier antes de aplicar.',
      );
    }
    if (ack.dossierVersion !== ack.animal.dossierVersion) {
      throw new ForbiddenException(
        'El dossier fue actualizado. Volvé a leerlo y reconocer.',
      );
    }
    return true;
  }
}
