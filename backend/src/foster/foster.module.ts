import { Module } from '@nestjs/common';
import { FosterController } from './foster.controller.js';
import { FosterService } from './foster.service.js';

/**
 * FosterModule — counselor-facing foster period management (SAFEGUARD-03).
 *
 * Single-client module (rlsPrisma only) — PATTERN-03 integration spec not required.
 * PrismaModule is @Global and exports the PRISMA_RLS token.
 *
 * D-11: Light scope — no PII captured; FosterPeriod stores only state + dates + notes + outcome.
 */
@Module({
  imports: [],
  controllers: [FosterController],
  providers: [FosterService],
  exports: [FosterService],
})
export class FosterModule {}
