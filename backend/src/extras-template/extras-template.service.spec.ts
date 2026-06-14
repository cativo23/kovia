/**
 * ExtrasTemplateService Unit Tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: APPLY-03 + APPLY-05
 *   - APPLY-03: ExtrasTemplate per refugio per category — question banks configurable once,
 *     reused per category. findForAnimal() must return empty questions (not throw) when
 *     no template exists for the animal's adoptionCategory.
 *   - APPLY-05: Criticality tags (CRÍTICA/IMPORTANTE/OPCIONAL) must NEVER appear in
 *     adopter-facing API responses. PublicExtrasQuestionDto strips the `criticality`
 *     field at the serializer layer.
 *
 * D-09: The `criticality` field in template questions JSON is NEVER included in any
 *   adopter-facing API response. A dedicated adopter-facing extras DTO strips it.
 *
 * 16-RESEARCH.md Pattern 2: DTO-layer criticality strip — use PublicExtrasQuestionDto
 *   that omits criticality; verified by JSON.stringify assertion.
 *
 * Analog spec: backend/src/public-animals/public-animals.service.spec.ts
 *
 * Downstream plan: 16-04 (ExtrasTemplate service implementation) converts these
 * it.todo blocks into real assertions.
 */

import { describe, expect, it } from 'vitest';

describe('ExtrasTemplateService', () => {
  describe('findForAnimal', () => {
    it.todo('[APPLY-03] returns empty questions array when no ExtrasTemplate exists for the animal\'s adoptionCategory (does not throw NotFoundException)');

    it.todo('[APPLY-05] strips criticality from PublicExtrasQuestionDto response — criticality field must not appear in the returned DTO');

    it.todo('[APPLY-05] includes expected public fields: id, text, type, options, required, placeholder in PublicExtrasQuestionDto');

    it.todo('[APPLY-05] JSON.stringify of the public response does not contain the string "criticality"');
  });

  // Regression lock: this test MUST fail until Plan 16-04 implements the criticality strip.
  // It is intentionally failing to turn CI red for Wave 0.
  it('placeholder until implemented', () => {
    expect.fail('Phase 16 implementation pending — APPLY-05 criticality strip');
  });
});
