import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * D-12: Foster outcome paths — counselor records outcome at end of 14d.
 * PROCEED → application eligible for APPROVED (Plan 04 gate).
 * REJECTED → application moves to REJECTED.
 * String enum aligned with FosterOutcome in schema.prisma.
 */
export enum FosterOutcome {
  PROCEED = 'PROCEED',
  REJECTED = 'REJECTED',
}

/**
 * CompleteFosterDto — completes a FosterPeriod with outcome + optional notes.
 *
 * D-11: Whitelisted DTO. No PII fields accepted (no ID/national-id capture — v3.1+ scope).
 * class-validator forbidNonWhitelisted enforced at the controller level via
 * global ValidationPipe with whitelist: true, forbidNonWhitelisted: true.
 */
export class CompleteFosterDto {
  @ApiProperty({
    enum: FosterOutcome,
    description: 'Foster outcome: PROCEED (adoption eligible) or REJECTED (application rejected)',
  })
  @IsEnum(FosterOutcome)
  outcome: FosterOutcome;

  @ApiPropertyOptional({
    description: 'ISO date-time string for foster end (defaults to now if omitted)',
  })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({
    description: 'Optional counselor notes about the foster period',
  })
  @IsOptional()
  @IsString()
  counselorNotes?: string;
}
