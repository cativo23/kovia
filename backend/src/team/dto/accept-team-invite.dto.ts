import { IsString, Length, IsHexadecimal } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AcceptTeamInviteDto {
  @ApiProperty({ example: 'a1b2c3d4e5f6...' })
  @IsString()
  @IsHexadecimal()
  @Length(64, 64)
  token!: string;
}
