import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsInt,
  IsBoolean,
  IsArray,
  IsDate,
  ArrayMaxSize,
  MinLength,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

enum AnimalGender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  UNKNOWN = 'UNKNOWN',
}

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

// Local enum copy — DO NOT import from @prisma/client (brittle, per 15-RESEARCH §Primary)
enum AdoptionCategory {
  SALUDABLE_ADULTO = 'SALUDABLE_ADULTO',
  SENIOR = 'SENIOR',
  MEDICO_CRONICO = 'MEDICO_CRONICO',
  REACTIVO = 'REACTIVO',
  ESPECIAL = 'ESPECIAL',
}

export class CreateAnimalDto {
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsUUID()
  speciesId: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  breed?: string;

  @IsOptional()
  @IsEnum(AnimalGender)
  gender?: AnimalGender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(360)
  ageMonths?: number;

  @IsOptional()
  @IsEnum(AnimalSize)
  size?: AnimalSize;

  @IsOptional()
  @IsEnum(EnergyLevel)
  energyLevel?: EnergyLevel;

  @IsOptional()
  @IsBoolean()
  goodWithKids?: boolean;

  @IsOptional()
  @IsBoolean()
  goodWithDogs?: boolean;

  @IsOptional()
  @IsBoolean()
  goodWithCats?: boolean;

  @IsOptional()
  @IsBoolean()
  goodWithOtherPets?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  specialNeeds?: string;

  @IsOptional()
  @IsBoolean()
  vaccinated?: boolean;

  @IsOptional()
  @IsBoolean()
  sterilized?: boolean;

  @IsOptional()
  @IsBoolean()
  trained?: boolean;

  // ── Phase 15 dossier fields (per D-05 / 15-02 plan) ───────────────────────
  // The server-computed completion-flag + monotonic-version columns are
  // intentionally NOT declared on this DTO. They live on the database and are
  // managed by AnimalsService.update; the ValidationPipe rejects unknown keys
  // via forbidNonWhitelisted at the HTTP boundary, and the service strips them
  // from any inbound payload as a runtime hardening (T-15-06 / T-15-Stale).

  @IsOptional()
  @IsEnum(AdoptionCategory)
  adoptionCategory?: AdoptionCategory;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  behavioralEvaluation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  medicalHistory?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  monthlyCostUsdMin?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(10000)
  monthlyCostUsdMax?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  knownTriggers?: string[];

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  shelterEntryDate?: Date;
}
