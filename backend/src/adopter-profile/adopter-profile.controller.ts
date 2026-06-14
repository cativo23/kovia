import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Param,
  Body,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsUrl } from 'class-validator';
import { Roles } from '../common/decorators/roles.decorator';
import { AdopterProfileService } from './adopter-profile.service';
import { UpdateProfileSectionDto } from './dto/update-profile-section.dto';
import type { PublicProfileResponseDto } from './dto/public-profile-response.dto';

/**
 * AddPhotoDto — validates the body for POST /profile/photos.
 * Client first calls POST /upload/presigned-url (folder: 'profiles'),
 * PUTs the image directly to MinIO, then POSTs the resulting key + publicUrl here.
 */
class AddPhotoDto {
  @IsString()
  @IsNotEmpty()
  key!: string;

  @IsUrl()
  url!: string;
}

/**
 * AdopterProfileController — Phase 16 PROFILE-01.
 *
 * All 4 endpoints require @Roles('ADOPTER') — authentication is mandatory for all routes.
 * Controller prefix: 'profile' → /api/v1/profile/...
 */
@ApiTags('AdopterProfile')
@ApiBearerAuth()
@Controller('profile')
export class AdopterProfileController {
  constructor(
    private readonly adopterProfileService: AdopterProfileService,
  ) {}

  /**
   * GET /profile/me
   * Returns the authenticated adopter's profile with completionPct.
   * Auto-creates a stub profile on first call (no 404 for new adopters).
   */
  @Get('me')
  @Roles('ADOPTER')
  @ApiOperation({ summary: 'Get the authenticated adopter\'s profile' })
  async getMyProfile(@Req() req: any): Promise<PublicProfileResponseDto> {
    return this.adopterProfileService.getMyProfile(req.user.id);
  }

  /**
   * PATCH /profile/section/:section
   * Upserts one profile section atomically. Returns the full updated profile.
   * The :section path param is injected into the DTO before service dispatch.
   */
  @Patch('section/:section')
  @Roles('ADOPTER')
  @ApiOperation({ summary: 'Update a profile section (upsert)' })
  async updateSection(
    @Param('section') section: string,
    @Body() dto: UpdateProfileSectionDto,
    @Req() req: any,
  ): Promise<PublicProfileResponseDto> {
    // Merge the path param into the DTO so the service can whitelist by section
    return this.adopterProfileService.updateSection(req.user.id, {
      ...dto,
      section,
    });
  }

  /**
   * POST /profile/photos
   * Appends a ProfilePhoto row after the client has uploaded the file to MinIO.
   * Max 5 photos enforced by the service (D-03).
   */
  @Post('photos')
  @Roles('ADOPTER')
  @ApiOperation({ summary: 'Add a profile photo (after MinIO upload)' })
  async addPhoto(
    @Body() body: AddPhotoDto,
    @Req() req: any,
  ): Promise<{ id: string; url: string; key: string; position: number }> {
    return this.adopterProfileService.addPhoto(req.user.id, body.key, body.url);
  }

  /**
   * DELETE /profile/photos/:photoId
   * Removes a photo iff it belongs to the authenticated adopter's profile.
   * Returns { removed: true } on success; NotFoundException if not owned.
   */
  @Delete('photos/:photoId')
  @Roles('ADOPTER')
  @ApiOperation({ summary: 'Remove a profile photo' })
  async removePhoto(
    @Param('photoId') photoId: string,
    @Req() req: any,
  ): Promise<{ removed: boolean }> {
    await this.adopterProfileService.removePhoto(req.user.id, photoId);
    return { removed: true };
  }
}
