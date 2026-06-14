/**
 * Adopter-facing extras template DTOs (Phase 16 Plan 04 — APPLY-05 / D-09).
 *
 * `PublicExtrasQuestionDto` is an explicit TypeScript interface that omits the
 * `criticality` field at the type level. This is a deliberate, three-layer
 * enforcement of APPLY-05:
 *
 *   Layer 1 (type-level): The `criticality` field is ABSENT from this interface.
 *   Layer 2 (impl-level): `ExtrasTemplateService.toPublicQuestion()` uses an explicit
 *     field-by-field copy — never a spread — so the field cannot leak accidentally.
 *   Layer 3 (test-level): `extras-template.service.spec.ts` JSON.stringify-asserts
 *     that the string "criticality" does not appear in the serialized response.
 *
 * Analog: backend/src/public-animals/dto/public-animal.dto.ts (T-15-01 pattern).
 */

export interface PublicExtrasQuestionDto {
  id: string;
  text: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  options?: string[];
  required: boolean;
  placeholder?: string;
  // criticality: 'CRITICA' | 'IMPORTANTE' | 'OPCIONAL' — INTENTIONALLY OMITTED (APPLY-05 / D-09)
}

export interface PublicExtrasTemplateDto {
  questions: PublicExtrasQuestionDto[];
}
