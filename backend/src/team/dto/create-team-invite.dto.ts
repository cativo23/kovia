import { IsEmail, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTeamInviteDto {
  @ApiProperty({ example: 'colaborador@correo.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ enum: ['ORG_STAFF'], example: 'ORG_STAFF' })
  @IsIn(['ORG_STAFF']) // D-02 defers ORG_VIEWER; only STAFF accepted this phase
  role!: 'ORG_STAFF';
}
