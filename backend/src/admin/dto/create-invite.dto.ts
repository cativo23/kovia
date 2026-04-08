import { IsEmail, IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInviteDto {
  @ApiProperty({ example: 'org@example.com', description: 'Email of the org admin to invite' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'DameTuPataSV', description: 'Name of the organization' })
  @IsString()
  @IsNotEmpty()
  orgName: string;
}
