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
 * STATUS: ACTIVE — Phase 15-05 Task 3 removed `.skip` after committing the
 * matching i18n key. Drift on either side now fails CI immediately.
 *
 * Path resolution: under vitest in the api container, `__dirname` is
 * `/app/test`. The frontend i18n directory is bind-mounted read-only at
 * `/frontend/i18n` by docker-compose.yml's `api` service, so this relative
 * path resolves identically on host and in container.
 */
describe('locked-copy consistency (PUBLIC-06)', () => {
  it('backend LOCKED_MEDICAL_COPY byte-equals frontend i18n animals.guidance.rojo.medicalCopy', () => {
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
