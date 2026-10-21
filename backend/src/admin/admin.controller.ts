import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { CreateInviteDto } from './dto/create-invite.dto';
import { UpdateOrgStatusDto } from './dto/update-org-status.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';

@ApiTags('Admin')
@ApiBearerAuth()
@Controller('admin')
@Roles('PLATFORM_ADMIN')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Relay endpoint that exchanges a Bearer JWT for a short-lived HttpOnly cookie,
   * then returns { ok: true }. The frontend fetches this via its API client (which
   * sends the Authorization header), then navigates to /admin/queues in a new tab.
   * This prevents the access token from ever appearing as a URL query parameter.
   */
  @Get('queues-access')
  @ApiOperation({ summary: 'Exchange Bearer token for bb_token cookie, enabling cookieless Bull Board access' })
  queuesBoardAccess(@Req() req: Request, @Res() res: Response): void {
    const authHeader = req.headers['authorization'] as string | undefined;
    // Guard already validated the JWT; we just need the raw token value for the cookie.
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const isProduction = this.config.get<string>('NODE_ENV') === 'production';

    res.cookie('bb_token', token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'strict',
      path: '/admin/queues',
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.json({ ok: true });
  }

  @Post('invites')
  @ApiOperation({ summary: 'Create org invite' })
  createInvite(@Body() dto: CreateInviteDto, @CurrentUser('id') userId: string) {
    return this.adminService.createInvite(dto, userId);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List all invites' })
  listInvites() {
    return this.adminService.listInvites();
  }

  @Post('invites/:id/resend')
  @ApiOperation({ summary: 'Resend invite email' })
  resendInvite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.adminService.resendInvite(id, userId);
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Delete invite' })
  deleteInvite(@Param('id') id: string) {
    return this.adminService.deleteInvite(id);
  }

  @Get('orgs')
  @ApiOperation({ summary: 'List all organizations' })
  listOrgs() {
    return this.adminService.listOrgs();
  }

  @Patch('orgs/:id/status')
  @ApiOperation({ summary: 'Update organization status' })
  updateOrgStatus(@Param('id') id: string, @Body() dto: UpdateOrgStatusDto, @CurrentUser('id') userId: string) {
    return this.adminService.updateOrgStatus(id, dto.status, userId);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('search') search?: string,
  ) {
    return this.adminService.listUsers({ page, limit, search });
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user active status' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
    @CurrentUser('id') userId: string,
  ) {
    if (dto.isActive) {
      return this.adminService.reactivateUser(id, userId);
    }
    return this.adminService.deactivateUser(id, userId);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete user' })
  deleteUser(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.adminService.deleteUser(id, userId);
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  getStats() {
    return this.adminService.getStats();
  }

  @Get('audit')
  @ApiOperation({ summary: 'Get audit log (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAuditLog(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.getAuditLog({ page, limit });
  }
}
