import {
  Controller,
  Post,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { UploadService } from './upload.service';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
];

@ApiTags('Upload')
@ApiBearerAuth()
@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post('presigned-url')
  @Roles('ORG_ADMIN', 'ADOPTER')
  @ApiOperation({ summary: 'Generate presigned URL for photo upload' })
  async getPresignedUrl(
    @Body() body: { filename: string; contentType: string },
  ) {
    if (!body.filename || body.filename.length > 255) {
      throw new BadRequestException('Filename is required and must be 255 characters or less');
    }

    if (!ALLOWED_CONTENT_TYPES.includes(body.contentType)) {
      throw new BadRequestException(
        `Content type must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`,
      );
    }

    const { url, key } = await this.uploadService.getPresignedUrl(
      body.filename,
      body.contentType,
      (body as any).folder,
    );
    return { url, key, publicUrl: this.uploadService.getPublicUrl(key) };
  }
}
