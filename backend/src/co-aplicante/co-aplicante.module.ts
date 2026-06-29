import { Module } from '@nestjs/common';
import { CoAplicanteController } from './co-aplicante.controller';
import { CoAplicanteService } from './co-aplicante.service';

/**
 * CoAplicanteModule — public token confirmation flow.
 *
 * No imports needed: PrismaModule is @Global and exports PublicPrismaService.
 * No exports: this module is consumed only via HTTP (frontend Plan 08 page).
 */
@Module({
  imports: [],
  controllers: [CoAplicanteController],
  providers: [CoAplicanteService],
  exports: [],
})
export class CoAplicanteModule {}
