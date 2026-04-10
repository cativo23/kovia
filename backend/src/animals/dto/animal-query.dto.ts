import {
  IsOptional,
  IsString,
  IsInt,
  IsEnum,
  Min,
  Max,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';

enum AnimalSize {
  SMALL = 'SMALL',
  MEDIUM = 'MEDIUM',
  LARGE = 'LARGE',
  EXTRA_LARGE = 'EXTRA_LARGE',
}

enum EnergyLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

enum AnimalStatus {
  AVAILABLE = 'AVAILABLE',
  IN_PROCESS = 'IN_PROCESS',
  ADOPTED = 'ADOPTED',
  ARCHIVED = 'ARCHIVED',
}

export class AnimalQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number = 12;

  @IsOptional()
  @IsString()
  species?: string;

  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  ageMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Max(360)
  ageMax?: number;

  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;

  @IsOptional()
  @IsString()
  organization?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  search?: string;

  @IsOptional()
  @IsEnum(AnimalStatus)
  status?: AnimalStatus;
}
