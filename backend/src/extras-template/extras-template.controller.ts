import { Controller, Get, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { ExtrasTemplateService } from './extras-template.service';
import type { PublicExtrasTemplateDto } from './dto/public-extras-template.dto';

/**
 * ExtrasTemplateController — Phase 16 Plan 04 (APPLY-03 + APPLY-05).
 *
 * Single adopter-facing endpoint: GET /extras-templates/:animalId
 *
 * Auth: requires JWT — NOT @Public. Adopters, org staff, and org admins can
 * call this endpoint. Org staff and org admins may use it for template preview.
 *
 * The `findForAnimalRaw` method on the service is intentionally NOT exposed
 * here — it is internal-only for Plan 06 ApplicationsService to freeze
 * `questionText` into `extraAnswers` at write time (D-08).
 *
 * Analog: backend/src/public-animals/public-animals.controller.ts
 */
@ApiTags('ExtrasTemplate')
@Controller('extras-templates')
export class ExtrasTemplateController {
  constructor(
    private readonly extrasTemplateService: ExtrasTemplateService,
  ) {}

  @Get(':animalId')
  @Roles('ADOPTER', 'ORG_ADMIN', 'ORG_STAFF', 'PLATFORM_ADMIN')
  @ApiOperation({
    summary:
      'Get extras questions for an animal — criticality stripped for adopters',
  })
  findForAnimal(
    @Param('animalId') animalId: string,
  ): Promise<PublicExtrasTemplateDto> {
    return this.extrasTemplateService.findForAnimal(animalId);
  }
}
