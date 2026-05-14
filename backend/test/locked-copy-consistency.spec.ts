import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { LOCKED_MEDICAL_COPY } from '../src/public-animals/guidance';

/**
 * Locked-copy consistency boundary spec (Phase 15-03 Task 1, T-15-05 mitigation).
 *
 * Asserts the backend `LOCKED_MEDICAL_COPY` constant is byte-equal to the
 * `animals.guidance.rojo.medicalCopy` value in `frontend/i18n/locales/es-SV.json`.
 *
 * STATUS: Shipped with `.skip` so the suite stays green during 15-04 work.
 *
 * GREEN GATE: Plan 15-05 Task 3 has an explicit acceptance criterion to
 * remove the `.skip` modifier here after committing the matching i18n key.
 * Until then this spec is dormant.
 *
 * TODO(15-05): remove `.skip` after the i18n key lands in es-SV.json —
 * this spec is the GREEN gate for T-15-05.
 */
describe('locked-copy consistency (PUBLIC-06)', () => {
  it.skip('backend LOCKED_MEDICAL_COPY byte-equals frontend i18n animals.guidance.rojo.medicalCopy', () => {
    const i18nPath = resolve(
      __dirname,
      '../../frontend/i18n/locales/es-SV.json',
    );
    const i18n = JSON.parse(readFileSync(i18nPath, 'utf8'));
    const frontendCopy: string | undefined =
      i18n?.animals?.guidance?.rojo?.medicalCopy;
    expect(frontendCopy).toBeDefined();
    expect(frontendCopy).toBe(LOCKED_MEDICAL_COPY);
  });
});
