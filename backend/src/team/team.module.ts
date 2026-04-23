import { Module, forwardRef } from '@nestjs/common';
import { TeamService } from './team.service';
import { TeamController } from './team.controller';
import { TeamAcceptController } from './team-accept.controller';
import { MailModule } from '../mail/mail.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [MailModule, forwardRef(() => AuthModule)],
  controllers: [TeamController, TeamAcceptController],
  providers: [TeamService],
})
export class TeamModule {}
