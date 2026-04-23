import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { TeamService } from './team.service';
import { CreateTeamInviteDto } from './dto/create-team-invite.dto';
import { ChangeRoleDto } from './dto/change-role.dto';

@ApiTags('Team')
@ApiBearerAuth()
@Controller('team')
@Roles('ORG_ADMIN') // D-12: team management is admin-only
export class TeamController {
  constructor(private readonly teamService: TeamService) {}

  @Post('invites')
  @ApiOperation({ summary: 'Create team invite' })
  createInvite(
    @Body() dto: CreateTeamInviteDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('organizationId') orgId: string,
  ) {
    return this.teamService.createInvite(dto, userId, orgId);
  }

  @Get('invites')
  @ApiOperation({ summary: 'List team invites for current org' })
  listInvites(@CurrentUser('organizationId') orgId: string) {
    return this.teamService.listInvites(orgId);
  }

  @Post('invites/:id/resend')
  @ApiOperation({ summary: 'Resend team invite (regenerate token + extend expiry)' })
  resendInvite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.teamService.resendInvite(id, userId);
  }

  @Delete('invites/:id')
  @ApiOperation({ summary: 'Revoke team invite' })
  revokeInvite(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.teamService.revokeInvite(id, userId);
  }

  @Get('members')
  @ApiOperation({ summary: 'List accepted team members for current org' })
  listMembers(@CurrentUser('organizationId') orgId: string) {
    return this.teamService.listMembers(orgId);
  }

  @Patch('members/:userId/role')
  @ApiOperation({ summary: 'Change a team member role (last-admin protected)' })
  changeRole(
    @Param('userId') userId: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser('id') actorId: string,
  ) {
    return this.teamService.changeRole(userId, dto.role, actorId);
  }

  @Delete('members/:userId')
  @ApiOperation({
    summary: 'Remove a team member (D-15: flips to ADOPTER, clears orgId, preserves row)',
  })
  removeMember(
    @Param('userId') userId: string,
    @CurrentUser('id') actorId: string,
  ) {
    return this.teamService.removeMember(userId, actorId);
  }
}
