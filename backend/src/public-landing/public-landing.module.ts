import { CacheModule } from '@nestjs/cache-manager';
import { Module } from '@nestjs/common';
import { PublicLandingController } from './public-landing.controller';
import { PublicLandingService } from './public-landing.service';

/**
 * PublicLandingModule — Phase 15-04.
 *
 * Wires the bento landing endpoint. Registers the in-memory cache store
 * via `CacheModule.register({ ttl: 60_000 })` per D-12 + RESEARCH
 * §608-624. The cache TTL ms unit matches cache-manager v7 — older v5
 * docs use seconds, hence the explicit `60_000` literal here.
 */
@Module({
  imports: [CacheModule.register({ ttl: 60_000 })],
  controllers: [PublicLandingController],
  providers: [PublicLandingService],
  exports: [PublicLandingService],
})
export class PublicLandingModule {}
