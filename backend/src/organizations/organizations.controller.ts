import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Res } from '@nestjs/common';
import { Response } from 'express';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { OrganizationsService } from './organizations.service';
import { AuthService } from '../auth/auth.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@ApiTags('Organizations')
@Controller('organizations')
export class OrganizationsController {
  constructor(
    private readonly organizationsService: OrganizationsService,
    private readonly authService: AuthService,
  ) {}

  @Post('validate-invite')
  @Public()
  @ApiOperation({ summary: 'Validate an invite token' })
  validateInvite(@Body('token') token: string) {
    return this.organizationsService.acceptInvite(token);
  }

  @Post('claim-invite')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Claim invite — sets user to ORG_ADMIN and returns new tokens' })
  async claimInvite(
    @Body('token') token: string,
    @CurrentUser() user: { id: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const invite = await this.organizationsService.claimInvite(token, user.id);
    // Re-issue tokens with updated role
    const updatedUser = await this.authService.getProfile(user.id);
    const tokens = await this.authService.login(updatedUser);
    // Set refresh cookie
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('refresh_token', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'strict' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
    return { invite, accessToken: tokens.accessToken };
  }

  @Post()
  @ApiBearerAuth()
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Create organization profile' })
  create(
    @Body() dto: CreateOrganizationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.organizationsService.create(dto, user.id);
  }

  @Patch(':id')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update organization profile' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.organizationsService.update(id, dto, user.id);
  }

  @Get('me')
  @ApiBearerAuth()
  @Roles('ORG_ADMIN')
  @ApiOperation({ summary: 'Get own organization' })
  getOwn(@CurrentUser() user: { id: string }) {
    return this.organizationsService.findByAdminId(user.id);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ summary: 'Get organization public profile' })
  findBySlug(@Param('slug') slug: string) {
    return this.organizationsService.findBySlug(slug);
  }
}
