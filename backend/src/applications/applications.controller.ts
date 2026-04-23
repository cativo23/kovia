import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
} from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ScoringService } from '../scoring/scoring.service';
import { CreateApplicationDto } from './dto/create-application.dto';
import { UpdateApplicationStatusDto } from './dto/update-application-status.dto';
import { ApplicationQueryDto } from './dto/application-query.dto';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applicationsService: ApplicationsService,
    private readonly scoringService: ScoringService,
  ) {}

  @Post()
  @Roles('ADOPTER')
  async create(@Body() dto: CreateApplicationDto, @Req() req: any) {
    return this.applicationsService.create(dto, req.user);
  }

  @Get('check')
  async checkExisting(
    @Query('animalId') animalId: string,
    @Req() req: any,
  ) {
    return this.applicationsService.checkExisting(animalId, req.user.id);
  }

  @Get('my')
  async findMyApplications(
    @Req() req: any,
    @Query() query: ApplicationQueryDto,
  ) {
    return this.applicationsService.findMyApplications(req.user.id, query);
  }

  @Get('my/:id')
  async findMyApplication(@Param('id') id: string, @Req() req: any) {
    return this.applicationsService.findById(id, req.user.id);
  }

  @Get('my/:id/history')
  async findMyApplicationHistory(@Param('id') id: string, @Req() req: any) {
    return this.applicationsService.findStatusHistory(id, req.user.id);
  }

  @Patch(':id/retirar')
  @Roles('ADOPTER')
  async withdraw(@Param('id') id: string, @Req() req: any) {
    return this.applicationsService.withdraw(id, req.user.id);
  }

  @Get('org')
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async findOrgApplications(@Query() query: ApplicationQueryDto) {
    return this.applicationsService.findAllByOrg(query);
  }

  @Get('org/:id')
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async findOrgApplication(@Param('id') id: string) {
    return this.applicationsService.findByIdForOrg(id);
  }

  @Patch(':id/status')
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateApplicationStatusDto,
    @Req() req: any,
  ) {
    return this.applicationsService.updateStatus(id, dto.status, req.user.id);
  }

  @Post(':id/rescore')
  @Roles('ORG_ADMIN', 'ORG_STAFF')
  async rescore(@Param('id') id: string) {
    const result = await this.scoringService.rescore(id);
    return { score: result.total, scoreDetails: result };
  }
}
