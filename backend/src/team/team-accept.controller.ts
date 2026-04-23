import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { TeamService } from './team.service';
import { AcceptTeamInviteDto } from './dto/accept-team-invite.dto';

/**
 * Public validate + authenticated accept endpoints for team invites.
 * Lives outside TeamController because TeamController has class-level
 * @Roles('ORG_ADMIN') which would block invitees (still ADOPTER at accept time).
 */
@ApiTags('Team Invites (public)')
@Controller('team/invites')
export class TeamAcceptController {
  constructor(private readonly teamService: TeamService) {}

  @Post('validate')
  @Public()
  @ApiOperation({ summary: 'Validate a team invite token (pre-auth lookup)' })
  validate(@Body() dto: AcceptTeamInviteDto) {
    return this.teamService.validateToken(dto.token);
  }

  @Post('accept')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Accept team invite — upgrades current user role/orgId in place and re-issues access token',
  })
  accept(@Body() dto: AcceptTeamInviteDto, @CurrentUser('id') userId: string) {
    return this.teamService.acceptInvite(dto.token, userId);
  }
}
