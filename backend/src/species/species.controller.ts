import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { SpeciesService } from './species.service';

@ApiTags('Species')
@Controller()
export class SpeciesController {
  constructor(private readonly speciesService: SpeciesService) {}

  @Get('species')
  @Public()
  @ApiOperation({ summary: 'List all species (public)' })
  findAll() {
    return this.speciesService.findAll();
  }

  @Post('admin/species')
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new species' })
  create(@Body() body: { name: string }) {
    return this.speciesService.create(body);
  }

  @Patch('admin/species/:id')
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update a species' })
  update(@Param('id') id: string, @Body() body: { name: string }) {
    return this.speciesService.update(id, body);
  }

  @Delete('admin/species/:id')
  @Roles('PLATFORM_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete a species' })
  delete(@Param('id') id: string) {
    return this.speciesService.delete(id);
  }
}
