import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEncuentroDto {
  @ApiProperty({ description: 'Application ID to schedule encuentro for' })
  @IsString()
  @IsNotEmpty()
  applicationId: string;

  @ApiProperty({ description: 'ISO date-time string for the scheduled encuentro' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Location name (e.g., shelter name)' })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiPropertyOptional({ description: 'Physical address for the encuentro' })
  @IsOptional()
  @IsString()
  address?: string;
}
