import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PublicPrismaService } from '../prisma/public-prisma.service';

/**
 * Co-aplicante confirmation service.
 *
 * PATTERN-01 (CLAUDE.md): only rlsBypassPrisma is injected.
 * Co-aplicante is NOT a Kovia user — there is no JWT session, no CLS userId,
 * and therefore no RLS context. The bypass client is the only viable option.
 *
 * PATTERN-03 NOTE: This service is single-client (bypass only). The CI enforcer
 * (backend/scripts/check-integration-specs.ts) only fires for DUAL-client
 * services that inject BOTH PRISMA_RLS AND PublicPrismaService. A sibling
 * integration spec is OPTIONAL here; Plan 06 extends the applications integration
 * spec to cover the end-to-end token flow.
 */
@Injectable()
export class CoAplicanteService {
  constructor(
    // Co-aplicante is not a Kovia user — no RLS context available.
    // rlsBypassPrisma (PublicPrismaService) is the only client needed.
    private readonly rlsBypassPrisma: PublicPrismaService,
  ) {}

  /**
   * Returns the confirmation page context for a valid, unexpired token.
   *
   * Error messages are intentionally generic (T-16-05-03):
   *   - null lookup  → NotFoundException('Token inválido o expirado')
   *   - expired      → UnprocessableEntityException('El enlace ha expirado')
   * The same messages are used in confirm() to prevent enumeration attacks.
   */
  async getConfirmationContext(
    token: string,
  ): Promise<{ animalName: string; adopterFirstName: string }> {
    const app = await this.rlsBypassPrisma.adoptionApplication.findFirst({
      where: { coAplicanteToken: token },
      include: {
        animal: { select: { name: true } },
        user: { select: { firstName: true } },
      },
    });

    if (!app) {
      throw new NotFoundException('Token inválido o expirado');
    }

    if (app.coAplicanteTokenExpiresAt && app.coAplicanteTokenExpiresAt < new Date()) {
      throw new UnprocessableEntityException('El enlace ha expirado');
    }

    return {
      animalName: app.animal.name,
      adopterFirstName: app.user.firstName ?? '',
    };
  }

  /**
   * Confirms co-aplicante participation by flipping the boolean flag.
   *
   * Idempotent (T-16-05-04): calling twice is a no-op — returns { confirmed: true }
   * on both calls without a second DB write. The original confirmedAt timestamp
   * is preserved.
   *
   * Uses the same lookup + expiry validation as getConfirmationContext to ensure
   * error message uniformity (T-16-05-03 — no enumeration).
   */
  async confirm(token: string): Promise<{ confirmed: true }> {
    const app = await this.rlsBypassPrisma.adoptionApplication.findFirst({
      where: { coAplicanteToken: token },
    });

    if (!app) {
      throw new NotFoundException('Token inválido o expirado');
    }

    if (app.coAplicanteTokenExpiresAt && app.coAplicanteTokenExpiresAt < new Date()) {
      throw new UnprocessableEntityException('El enlace ha expirado');
    }

    // Idempotent: already confirmed — no second write
    if (app.coAplicanteConfirmed === true) {
      return { confirmed: true };
    }

    await this.rlsBypassPrisma.adoptionApplication.update({
      where: { id: app.id },
      data: {
        coAplicanteConfirmed: true,
        coAplicanteConfirmedAt: new Date(),
      },
    });

    return { confirmed: true };
  }
}
