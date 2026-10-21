import { Module } from '@nestjs/common';
import { DossierAckGuard } from './dossier-ack.guard';
import { PublicAnimalsController } from './public-animals.controller';
import { PublicAnimalsService } from './public-animals.service';

/**
 * PublicAnimalsModule — Phase 15-03.
 *
 * Wires the dedicated public boundary (controller + service + DTOs +
 * server-side guidance utility). Also registers DossierAckGuard as a
 * provider and EXPORTS it so Phase 16's apply module can import this
 * module and bind the guard to its apply endpoint via @UseGuards
 * (D-09 — Phase 15 ships the class fully implemented and unit-tested,
 * Phase 16 owns the binding).
 */
@Module({
  imports: [],
  controllers: [PublicAnimalsController],
  providers: [PublicAnimalsService, DossierAckGuard],
  exports: [PublicAnimalsService, DossierAckGuard],
})
export class PublicAnimalsModule {}
