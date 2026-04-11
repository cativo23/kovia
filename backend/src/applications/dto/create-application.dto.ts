import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsObject,
  IsArray,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PhotoRefDto {
  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  key: string;

  @IsOptional()
  @IsNumber()
  position?: number;
}

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  animalId: string;

  @IsObject()
  personalInfo: Record<string, any>;

  @IsObject()
  housing: Record<string, any>;

  @IsObject()
  lifestyle: Record<string, any>;

  @IsOptional()
  @IsString()
  socialMedia?: string;

  @IsOptional()
  @IsString()
  additionalContext?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhotoRefDto)
  photos?: PhotoRefDto[];
}
