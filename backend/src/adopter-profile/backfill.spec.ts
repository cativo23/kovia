/**
 * Backfill Script Unit Tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: PROFILE-03
 *   - Migration from existing AdoptionApplication-embedded adopter data
 *     preserves historical applications without touching them.
 *   - Backfill script reads most-recent non-WITHDRAWN application per adopter,
 *     extracts personalInfo/housing/lifestyle blobs, maps to AdopterProfile.
 *
 * Pitfall references (from 16-RESEARCH.md):
 *   - Pitfall 1: Backfill script creates duplicate AdopterProfile rows on re-run
 *     (fix: use upsert with empty update clause)
 *   - Pitfall 2: Legacy blobs with missing/null fields produce incomplete profiles
 *     (fix: log count of adopters with completionPct < 100 after backfill)
 *
 * Analog spec: backend/src/adopters/adopters.service.integration.spec.ts
 *
 * Downstream plan: 16-03 (backfill script implementation) converts these it.todo
 * blocks into real assertions.
 */

import { describe, it } from 'vitest';

describe('backfill-adopter-profiles', () => {
  it.todo('[PROFILE-03] maps personalInfo/housing/lifestyle blob fields to AdopterProfile columns — phone, occupation, birthDate, housingType, ownership, activityLevel, speciesExperience are set correctly');

  it.todo('[PROFILE-03] upsert is idempotent — re-running the backfill script inserts 0 new rows when all adopters already have an AdopterProfile');

  it.todo('[PROFILE-03] logs count of adopters with completionPct < 100 after backfill completes (supports ops support for partial-blob adopters)');

  it.todo('[PROFILE-03] skips adopters without any non-WITHDRAWN application — those adopters receive no AdopterProfile row from the backfill');
});
