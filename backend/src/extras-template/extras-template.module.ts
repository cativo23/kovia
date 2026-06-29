import { Module } from '@nestjs/common';
import { ExtrasTemplateController } from './extras-template.controller';
import { ExtrasTemplateService } from './extras-template.service';

/**
 * ExtrasTemplateModule — Phase 16 Plan 04 (APPLY-03 + APPLY-05).
 *
 * Exports `ExtrasTemplateService` so Plan 06's `ApplicationsService` can call:
 *   - `findForAnimal()` for the adopter-safe template (criticality stripped)
 *   - `findForAnimalRaw()` for internal questionText freeze at answer time (D-08)
 *
 * Single-client module: PrismaModule is @Global, no explicit import needed.
 * No BullModule import — extras template reads are synchronous queries.
 *
 * Analog: backend/src/public-animals/public-animals.module.ts
 */
@Module({
  imports: [],
  controllers: [ExtrasTemplateController],
  providers: [ExtrasTemplateService],
  exports: [ExtrasTemplateService],
})
export class ExtrasTemplateModule {}
