import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token (usually from httpOnly cookie)' })
  @IsString()
  refreshToken: string;
}
