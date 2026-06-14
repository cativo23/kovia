/**
 * AdopterProfileService Integration Tests — Wave 0 stubs (Phase 16)
 *
 * Requirement lock: PATTERN-03 (CLAUDE.md) — dual-client services require a sibling integration spec
 *   AdopterProfileService injects both @Inject(PRISMA_RLS) (rlsPrisma) and
 *   PublicPrismaService (rlsBypassPrisma), triggering the PATTERN-03 CI gate.
 *
 * Analog spec: backend/src/adopters/adopters.service.integration.spec.ts
 * Harness pattern:
 *   - SUPERUSER_CONNECTION pg pool config (see analog)
 *   - makeClsStub(userId, organizationId?) factory for nestjs-cls
 *   - beforeAll fixture INSERT order: user → organization → adopter_profile
 *   - afterAll FK-safe DELETE order
 *
 * Downstream plan: 16-02 converts these it.todo blocks into real assertions
 * after AdopterProfileService is implemented.
 */

import { describe, it } from 'vitest';

describe('AdopterProfileService (RLS integration)', () => {
  it.todo('[PROFILE-01] RLS isolation — adopter A cannot read adopter B\'s profile (rlsPrisma enforces user_id = app.current_user_id)');

  it.todo('[PROFILE-01] upsert is idempotent on userId uniqueness — re-running updateSection() does not create a second profile row');

  it.todo('[PROFILE-01] photo row is scoped to the profile owner — ProfilePhoto.profileId links back to the correct adopter\'s AdopterProfile');
});
