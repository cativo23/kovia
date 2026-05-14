import { CacheInterceptor, CacheKey, CacheTTL } from '@nestjs/cache-manager';
import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import type { PublicLandingStats } from './dto/public-landing.dto';
import { PublicLandingService } from './public-landing.service';

/**
 * GET /public/landing-stats — Phase 15-04.
 *
 * Returns the entire bento landing payload in ONE round trip per D-12.
 * Single cache key (no per-user variance — the route is `@Public()`),
 * 60-second TTL. The in-memory cache absorbs traffic spikes without
 * introducing Redis (RESEARCH §608-624, UI-SPEC §Performance).
 */
@ApiTags('PublicLanding')
@Controller('public/landing-stats')
export class PublicLandingController {
  constructor(
    private readonly publicLandingService: PublicLandingService,
  ) {}

  @Get()
  @Public()
  @UseInterceptors(CacheInterceptor)
  @CacheKey('landing-stats')
  @CacheTTL(60_000)
  @ApiOperation({
    summary:
      'Public landing bento payload (single round trip per D-12; 60s cache)',
  })
  getStats(): Promise<PublicLandingStats> {
    return this.publicLandingService.getStats();
  }
}
