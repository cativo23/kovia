import {
  IsIn,
  IsOptional,
  IsString,
  IsDateString,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
} from 'class-validator';

/**
 * UpdateProfileSectionDto — request body for PATCH /profile/section/:section.
 *
 * The `section` field is injected by the controller from the URL path param
 * (the client doesn't need to send it in the body — the controller merges it).
 *
 * Service whitelists fields by dto.section before the upsert, so cross-section
 * field bleed is impossible (T-16-03-05 mitigation).
 */
export class UpdateProfileSectionDto {
  @IsIn(['datos-basicos', 'hogar', 'estilo-de-vida', 'experiencia', 'fotos'])
  section!: string;

  // Section 1: datos-basicos
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  occupation?: string;

  @IsOptional()
  @IsDateString()
  birthDate?: string;

  @IsOptional()
  @IsString()
  city?: string;

  // Section 2: hogar
  @IsOptional()
  @IsString()
  housingType?: string;

  @IsOptional()
  @IsString()
  ownership?: string;

  @IsOptional()
  @IsBoolean()
  exteriorSpace?: boolean;

  @IsOptional()
  @IsBoolean()
  petPermission?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  adults?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  children?: number;

  @IsOptional()
  @IsArray()
  currentPets?: any[];

  // Section 3: estilo-de-vida
  @IsOptional()
  @IsString()
  activityLevel?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  hoursAlone?: number;

  @IsOptional()
  @IsString()
  adoptionReason?: string;

  // Section 4: experiencia
  @IsOptional()
  @IsBoolean()
  speciesExperience?: boolean;

  @IsOptional()
  @IsArray()
  previousPets?: any[];

  @IsOptional()
  @IsString()
  additionalContext?: string;
}
