import { Controller, Post, Patch, Body, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator.js';
import { EncuentroService } from './encuentro.service.js';
import { CreateEncuentroDto } from './dto/create-encuentro.dto.js';
import { CompleteEncuentroDto } from './dto/complete-encuentro.dto.js';

/**
 * EncuentroController — counselor-facing endpoints for scheduling and completing encuentros.
 *
 * D-08: All endpoints require ORG_STAFF or ORG_ADMIN (no new RBAC role).
 * D-05: Presencial-only (no modality field).
 */
@ApiTags('Encuentro')
@Controller('encuentros')
export class EncuentroController {
  constructor(private readonly encuentroService: EncuentroService) {}

  /**
   * POST /encuentros — schedule an encuentro for an application.
   * D-06: Creates the encuentro with completedAt=null (not yet gate-satisfying).
   */
  @Post()
  @Roles('ORG_STAFF', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Schedule an encuentro for an adoption application' })
  schedule(@Body() dto: CreateEncuentroDto) {
    return this.encuentroService.schedule(dto);
  }

  /**
   * PATCH /encuentros/:id/completar — complete an encuentro with observations.
   * D-07: Records recomendación + optional notes + optional alert signals.
   * D-09: hasCategoryExperience=false + complex category → sets fosterRequired on application.
   */
  @Patch(':id/completar')
  @Roles('ORG_STAFF', 'ORG_ADMIN')
  @ApiOperation({ summary: 'Complete an encuentro with counselor observations' })
  complete(@Param('id') id: string, @Body() dto: CompleteEncuentroDto) {
    return this.encuentroService.complete(id, dto);
  }
}
