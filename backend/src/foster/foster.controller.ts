import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { FosterService } from './foster.service.js';
import { StartFosterDto } from './dto/start-foster.dto.js';
import { CompleteFosterDto } from './dto/complete-foster.dto.js';

/**
 * FosterController — counselor-facing endpoints for managing FosterPeriods.
 *
 * D-08: All endpoints require ORG_STAFF or ORG_ADMIN (no new RBAC role).
 * D-11: No PII captured (no DUI/document/identity fields in DTOs).
 */
@ApiTags('Foster')
@Controller('foster-periods')
export class FosterController {
  constructor(private readonly fosterService: FosterService) {}

  /**
   * POST /foster-periods — start a foster period for an application.
   */
  @Post()
  @Roles('ORG_STAFF', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Start a foster period for an adoption application' })
  start(@Body() dto: StartFosterDto) {
    return this.fosterService.start(dto);
  }

  /**
   * PATCH /foster-periods/:id/completar — complete a foster period with outcome.
   * D-12: outcome PROCEED (eligible for approval) or REJECTED (application rejected).
   */
  @Patch(':id/completar')
  @Roles('ORG_STAFF', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Complete a foster period with outcome' })
  complete(@Param('id') id: string, @Body() dto: CompleteFosterDto) {
    return this.fosterService.complete(id, dto);
  }
}
