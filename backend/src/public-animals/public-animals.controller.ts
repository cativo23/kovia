import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PublicAnimalQueryDto } from './dto/public-animal-query.dto';
import { PublicAnimalsService } from './public-animals.service';

/**
 * Public animal surface — Phase 15-03.
 *
 * Three routes:
 *   GET  /public/animals               (@Public, paginated listing)
 *   GET  /public/animals/:id           (@Public, detail page)
 *   POST /public/animals/:id/acknowledge-dossier
 *                                      (@Roles ADOPTER+, persists ack)
 *
 * The @Public decorator bypasses the global JwtAuthGuard so the listing
 * and detail routes work without a token. The ack POST is intentionally
 * NOT @Public — the global guard authenticates, and @Roles authorizes
 * the adopter / org-admin roles allowed to acknowledge a dossier (PUBLIC-05).
 */
@ApiTags('PublicAnimals')
@Controller('public/animals')
export class PublicAnimalsController {
  constructor(private readonly publicAnimalsService: PublicAnimalsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: 'Public listing — only animals with dossierComplete=true AVAILABLE',
  })
  findPublic(@Query() query: PublicAnimalQueryDto) {
    return this.publicAnimalsService.findPublic(query);
  }

  @Get(':id')
  @Public()
  @ApiOperation({
    summary: 'Public detail — 404 when dossier incomplete or not AVAILABLE (D-07)',
  })
  findOne(@Param('id') id: string) {
    return this.publicAnimalsService.findById(id);
  }

  @Post(':id/acknowledge-dossier')
  @Roles('ADOPTER', 'ORG_ADMIN', 'ORG_STAFF', 'PLATFORM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Record adopter ack of current dossierVersion (idempotent upsert)',
  })
  acknowledgeDossier(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() _body: Record<string, never>,
  ) {
    return this.publicAnimalsService.acknowledgeDossier(id, userId);
  }
}
