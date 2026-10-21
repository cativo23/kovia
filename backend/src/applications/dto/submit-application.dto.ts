import {
  IsArray,
  IsDefined,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * SubmitExtraAnswerDto — one extras answer in the new apply wizard.
 *
 * The `answer` field is typed as `any` because class-validator cannot enforce
 * a string|number|boolean union at the DTO layer. Type validation per-question
 * happens inside ApplicationsService.create() when the answer is matched against
 * the ExtrasTemplate question's `type` field.
 */
export class SubmitExtraAnswerDto {
  @IsString()
  @IsNotEmpty()
  questionId: string;

  /**
   * answer accepts string | number | boolean — validated in service layer
   * against the ExtrasTemplate question type (D-08).
   */
  @IsDefined()
  answer: string | number | boolean;
}

/**
 * SubmitApplicationDto — request body for POST /api/v1/applications.
 *
 * Replaces the legacy CreateApplicationDto for new applications (Phase 16 Wave 3).
 * Does NOT include personalInfo, housing, lifestyle, or photos — those fields
 * are frozen server-side from AdopterProfile at submission time (D-04, D-14).
 *
 * co-aplicante fields (nombre + email) are required per D-10.
 */
export class SubmitApplicationDto {
  @IsUUID()
  animalId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SubmitExtraAnswerDto)
  extraAnswers: SubmitExtraAnswerDto[];

  @IsString()
  @IsNotEmpty()
  coAplicanteNombre: string;

  @IsEmail()
  coAplicanteEmail: string;

  @IsOptional()
  @IsString()
  coAplicantePhone?: string;
}
