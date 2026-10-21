import { IsEnum, IsOptional, IsString, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * D-07: Recomendación dropdown values. Aligned with EncuentroRecomendacion enum in schema.prisma.
 * String enum defined locally per codebase convention (no generated Prisma enum import).
 */
export enum EncuentroRecomendacion {
  PROCEED = 'PROCEED',
  REQUIRES_FOSTER = 'REQUIRES_FOSTER',
  DO_NOT_PROCEED = 'DO_NOT_PROCEED',
}

export class CompleteEncuentroDto {
  @ApiProperty({
    enum: EncuentroRecomendacion,
    description: 'Counselor recomendación: PROCEED | REQUIRES_FOSTER | DO_NOT_PROCEED',
  })
  @IsEnum(EncuentroRecomendacion)
  recomendacion: EncuentroRecomendacion;

  @ApiPropertyOptional({ description: 'Optional counselor notes' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ description: 'Optional alert signals observed' })
  @IsOptional()
  @IsString()
  alertSignals?: string;

  /**
   * D-09: Has the adopter had prior experience with animals in this category?
   * Only meaningful for complex categories (SENIOR/MEDICO_CRONICO/REACTIVO/ESPECIAL).
   * When false + complex category → sets application.fosterRequired=true.
   */
  @ApiPropertyOptional({
    description:
      'Has the adopter had prior experience with animals in this category? Only evaluated for complex-category animals.',
  })
  @IsOptional()
  @IsBoolean()
  hasCategoryExperience?: boolean;
}
