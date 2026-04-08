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
} from '@nestjs/common';
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
  constructor(private readonly adminService: AdminService) {}

  @Post('invites')
  @ApiOperation({ summary: 'Create org invite' })
  createInvite(@Body() dto: CreateInviteDto) {
    return this.adminService.createInvite(dto);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List all invites' })
  listInvites() {
    return this.adminService.listInvites();
  }

  @Post('invites/:id/resend')
  @ApiOperation({ summary: 'Resend invite email' })
  resendInvite(@Param('id') id: string) {
    return this.adminService.resendInvite(id);
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
  updateOrgStatus(@Param('id') id: string, @Body() dto: UpdateOrgStatusDto) {
    return this.adminService.updateOrgStatus(id, dto.status);
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users (paginated)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  listUsers(
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return this.adminService.listUsers({ page, limit });
  }

  @Patch('users/:id/status')
  @ApiOperation({ summary: 'Update user active status' })
  updateUserStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    if (dto.isActive) {
      return this.adminService.reactivateUser(id);
    }
    return this.adminService.deactivateUser(id);
  }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Permanently delete user' })
  deleteUser(@Param('id') id: string) {
    return this.adminService.deleteUser(id);
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
