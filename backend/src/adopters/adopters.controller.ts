import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AdoptersService } from './adopters.service';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

@Controller('adopters')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ORG_ADMIN', 'ORG_STAFF')
export class AdoptersController {
  constructor(private readonly adoptersService: AdoptersService) {}

  @Get(':userId/history')
  async getHistory(@Param('userId') userId: string) {
    return this.adoptersService.getHistory(userId);
  }

  @Get(':userId/summary')
  async getSummary(@Param('userId') userId: string) {
    return this.adoptersService.getSummary(userId);
  }
}
