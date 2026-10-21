import { Module } from '@nestjs/common';
import { EncuentroController } from './encuentro.controller.js';
import { EncuentroService } from './encuentro.service.js';

/**
 * EncuentroModule — counselor-facing encuentro scheduling + completion (SAFEGUARD-01).
 *
 * Single-client module (rlsPrisma only) — PATTERN-03 integration spec not required.
 * PrismaModule is @Global and exports the PRISMA_RLS token.
 */
@Module({
  imports: [],
  controllers: [EncuentroController],
  providers: [EncuentroService],
  exports: [EncuentroService],
})
export class EncuentroModule {}
