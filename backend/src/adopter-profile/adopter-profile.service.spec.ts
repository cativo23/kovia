/**
 * AdopterProfileService Unit Tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: PROFILE-01
 *   - AdopterProfile entity (1:1 with User/ADOPTER) with 5 sections
 *   - completionPct computed server-side: returns 0/20/40/60/80/100 based on section completion
 *
 * Analog spec: backend/src/public-animals/public-animals.service.spec.ts
 * (DTO field-strip spec pattern — unit tests without real DB)
 *
 * Downstream plan: 16-02 (schema + service implementation) converts these it.todo
 * blocks into real assertions against AdopterProfileService.
 */

import { describe, it } from 'vitest';

describe('AdopterProfileService', () => {
  describe('computeCompletionPct', () => {
    it.todo('[PROFILE-01] returns 0 for empty profile (all sections null/missing)');

    it.todo('[PROFILE-01] returns 20 when only datos básicos section is complete (phone + occupation + birthDate non-null)');

    it.todo('[PROFILE-01] returns 40 when datos básicos + hogar sections are both complete');

    it.todo('[PROFILE-01] returns 60 when datos básicos + hogar + estilo de vida sections are all complete');

    it.todo('[PROFILE-01] returns 80 when 4 of 5 sections are complete (datos básicos + hogar + estilo de vida + experiencia general)');

    it.todo('[PROFILE-01] returns 100 when all 5 sections are complete including fotos del hogar (photos.length >= 1)');

    it.todo('[PROFILE-01] fotos del hogar section requires photos.length >= 1 (not just profile fields)');
  });

  describe('updateSection', () => {
    it.todo('[PROFILE-01] upserts profile on userId uniqueness — second call updates existing row, does not insert duplicate');

    it.todo('[PROFILE-01] returns full profile with recomputed completionPct after upsert');
  });
});
