import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AnimalsService } from './animals.service';
import { CreateAnimalDto } from './dto/create-animal.dto';
import { UpdateAnimalDto } from './dto/update-animal.dto';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AnimalQueryDto } from './dto/animal-query.dto';

@ApiTags('Animals')
@Controller('animals')
export class AnimalsController {
  constructor(private readonly animalsService: AnimalsService) {}

  // ─── Public Endpoints ───────────────────────────────────────

  @Get()
  @Public()
  @ApiOperation({ summary: 'Public animal listing with filters and pagination' })
  findPublic(@Query() query: AnimalQueryDto) {
    return this.animalsService.findPublic(query);
  }

  @Get('by-org/:slug')
  @Public()
  @ApiOperation({ summary: 'Animals by organization slug (for org landing page)' })
  findByOrgSlug(
    @Param('slug') slug: string,
    @Query() query: AnimalQueryDto,
  ) {
    return this.animalsService.findByOrgSlug(slug, query);
  }

  // ─── Org-scoped Endpoints (require auth + ORG_ADMIN) ───────

  @Get('org')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List org animals with query filters' })
  findOrgAnimals(@Query() query: AnimalQueryDto) {
    return this.animalsService.findAllByOrg(query);
  }

  @Get('org/stats')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Org dashboard animal stats' })
  getOrgStats() {
    return this.animalsService.getStats();
  }

  @Get('org/:id')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get single animal for editing (org-scoped)' })
  findOneForOrg(@Param('id') id: string) {
    return this.animalsService.findByIdForOrg(id);
  }

  @Post()
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new animal' })
  create(
    @Body() dto: CreateAnimalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.create(dto, userId);
  }

  @Patch(':id')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update animal profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAnimalDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.update(id, dto, userId);
  }

  @Patch(':id/status')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change animal status' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.updateStatus(id, dto.status, userId);
  }

  @Patch(':id/archive')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Archive animal' })
  archive(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.archive(id, userId);
  }

  @Patch(':id/restore')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Restore archived animal' })
  restore(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.restore(id, userId);
  }

  @Delete(':id')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Hard delete animal and photos' })
  remove(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.animalsService.hardDelete(id, userId);
  }

  // ─── Photo Management ──────────────────────────────────────

  @Post(':id/photos')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add photos to animal' })
  addPhotos(
    @Param('id') id: string,
    @Body() body: { photos: { url: string; key: string; caption?: string }[] },
  ) {
    return this.animalsService.addPhotos(id, body.photos);
  }

  @Delete(':id/photos/:photoId')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove a photo from animal' })
  removePhoto(
    @Param('id') id: string,
    @Param('photoId') photoId: string,
  ) {
    return this.animalsService.removePhoto(id, photoId);
  }

  @Patch(':id/photos/cover')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Set cover photo' })
  setCoverPhoto(
    @Param('id') id: string,
    @Body() body: { photoId: string },
  ) {
    return this.animalsService.setCoverPhoto(id, body.photoId);
  }

  @Patch(':id/photos/reorder')
  @Roles('ORG_ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Reorder photos' })
  reorderPhotos(
    @Param('id') id: string,
    @Body() body: { photoIds: string[] },
  ) {
    return this.animalsService.reorderPhotos(id, body.photoIds);
  }

  // ─── Public Detail (must be after param routes) ────────────

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Public animal detail' })
  findOne(@Param('id') id: string) {
    return this.animalsService.findById(id);
  }
}
