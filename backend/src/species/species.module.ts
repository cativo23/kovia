import { Module } from '@nestjs/common';
import { SpeciesService } from './species.service';
import { SpeciesController } from './species.controller';

@Module({
  controllers: [SpeciesController],
  providers: [SpeciesService],
  exports: [SpeciesService],
})
export class SpeciesModule {}
