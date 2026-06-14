/**
 * ExtrasAnswer DTOs for storing extras answers on AdoptionApplication (D-08).
 *
 * `ExtrasAnswerItemDto.questionText` is deliberately required and captures the
 * question text verbatim from the ExtrasTemplate at answer time. This "text freeze"
 * ensures that future template edits (Phase 18 config UI) do not retroactively
 * alter the question phrasing visible on historical application records.
 *
 * Analog: backend/src/applications/dto/create-application.dto.ts (class-validator pattern).
 */

import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExtrasAnswerItemDto {
  @IsString()
  @IsNotEmpty()
  questionId!: string;

  /**
   * Question text copied verbatim from ExtrasTemplate.questions[].text at answer time.
   * Frozen so that Phase 18 template edits do not alter historical application records (D-08).
   */
  @IsString()
  @IsNotEmpty()
  questionText!: string;

  /**
   * The adopter's answer. Type validation (string/number/boolean per question.type) is
   * delegated to ApplicationsService in Plan 06 — this DTO accepts any non-empty value.
   */
  @IsNotEmpty()
  answer!: string | number | boolean;
}

export class ExtrasAnswersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtrasAnswerItemDto)
  answers!: ExtrasAnswerItemDto[];
}
