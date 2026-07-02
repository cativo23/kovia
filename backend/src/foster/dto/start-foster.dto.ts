import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * StartFosterDto — starts a FosterPeriod for an application.
 *
 * D-11: Whitelisted fields only. No PII captured (see schema.prisma FosterPeriod model).
 * class-validator forbidNonWhitelisted ensures unknown fields are stripped.
 */
export class StartFosterDto {
  @ApiProperty({ description: 'Application ID to start a foster period for' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiPropertyOptional({
    description: 'ISO date-time string for foster start (defaults to now if omitted)',
  })
  @IsOptional()
  @IsDateString()
  startedAt?: string;
}
