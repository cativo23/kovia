import { Controller, Get, Post, Param } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CoAplicanteService } from './co-aplicante.service';

/**
 * Public confirmation endpoint — no authentication required.
 *
 * Pattern mirrors team-accept.controller.ts: this controller lives outside any
 * class-level @Roles so the JwtAuthGuard IS_PUBLIC_KEY check can bypass JWT
 * entirely on a per-method basis.
 *
 * The Public decorator is applied at the METHOD level (not the class level) to prevent
 * accidental future endpoints from leaking without auth (16-PATTERNS.md).
 */
@ApiTags('CoAplicante')
@Controller('co-aplicante')
export class CoAplicanteController {
  constructor(private readonly coAplicanteService: CoAplicanteService) {}

  @Get('confirmar/:token')
  @Public()
  @ApiOperation({ summary: 'Render confirmation page data — no auth' })
  getConfirmationContext(@Param('token') token: string) {
    return this.coAplicanteService.getConfirmationContext(token);
  }

  @Post('confirmar/:token')
  @Public()
  @ApiOperation({ summary: 'Confirm co-aplicante participation — no auth' })
  confirm(@Param('token') token: string) {
    return this.coAplicanteService.confirm(token);
  }
}
