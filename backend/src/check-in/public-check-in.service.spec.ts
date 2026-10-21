// backend/src/check-in/public-check-in.service.spec.ts
//
// Unit-spec scaffold for PublicCheckInService.
//
// PublicCheckInService is the no-login token-page backend (SAFEGUARD-04/05, D-14).
// It mirrors the Phase 16 co-aplicante pattern: uses rlsBypassPrisma (single
// bypass client, not dual-client) to look up a PostAdoptionCheckIn by token,
// return the es-SV questions, and store submitted responses.
//
// Plan 05 Task 2 un-skips the describe block and replaces stub bodies with
// real unit assertions (mock-based, no live DB required — same style as
// co-aplicante.service.spec.ts).
//
// Run after Plan 05 un-skips:
//   docker compose exec api npm test -- public-check-in.service.spec
//
// Wave 0 verification:
//   docker compose exec api npm test -- check-in   // exits 0 (all skipped)

import { describe, it } from 'vitest';

// NOTE: Do NOT import PublicCheckInService at module top level here.
// The service does not exist yet (Plan 05 creates it). A top-level import of a
// non-existent module would break the entire Waves 1–4 suite (threat T-17-00).
//
// Plan 05 Task 2 will add the import statement when it un-skips this block:
// TODO(plan 05): import { PublicCheckInService } from './public-check-in.service';

describe.skip('PublicCheckInService (Plan 05 Task 2 un-skips)', () => {
  // ---------------------------------------------------------------------------
  // Harness setup — Plan 05 fills these in when un-skipping.
  //
  // Expected shape mirrors co-aplicante.service.spec.ts:
  //   - makeMockPublicPrisma() factory for rlsBypassPrisma stub
  //   - beforeEach: vi.clearAllMocks(); service = new PublicCheckInService(mockBypass)
  //   - Helper makeCheckInRow(overrides) for fixture shape
  // ---------------------------------------------------------------------------

  // -------------------------------------------------------------------------
  // GET /check-in/:token — getCheckInContext()
  // -------------------------------------------------------------------------

  it('[SAFEGUARD-04] valid unexpired token returns es-SV questions for DAY_14', async () => {
    // Scenario: rlsBypassPrisma.postAdoptionCheckIn.findFirst returns a row with
    // scheduleType=DAY_14, status=PENDING, tokenExpiresAt=FUTURE.
    // Expected: service returns the 3 hardcoded es-SV DAY_14 questions.
    //
    // TODO(plan 05): implement with mock and assert questions array.
    // expect(result.questions.length).toBe(3);
    // expect(result.scheduleType).toBe('DAY_14');
  });

  it('[SAFEGUARD-05] valid unexpired token returns es-SV questions for DAY_60', async () => {
    // Scenario: scheduleType=DAY_60, status=PENDING, tokenExpiresAt=FUTURE.
    // Expected: service returns the deeper DAY_60 question set.
    //
    // TODO(plan 05): implement.
  });

  it('[SAFEGUARD-04] expired token returns generic error (no enumeration — security)', async () => {
    // Scenario: tokenExpiresAt=PAST (or null).
    // Expected: service throws NotFoundException with a generic, non-enumerating
    // error message (does not reveal whether token existed or was merely expired).
    // This guards against token enumeration attacks (T-17-00).
    //
    // TODO(plan 05): assert NotFoundException with generic message.
    // await expect(service.getCheckInContext('tok-expired')).rejects.toThrow(NotFoundException);
  });

  it('[SAFEGUARD-04] unknown / invalid token returns generic error (no enumeration)', async () => {
    // Scenario: rlsBypassPrisma returns null for the token lookup.
    // Expected: same generic NotFoundException as expired case (consistent error
    // prevents distinguishing "token not found" from "token expired").
    //
    // TODO(plan 05): assert NotFoundException.
  });

  // -------------------------------------------------------------------------
  // POST /check-in/:token — submitCheckIn()
  // -------------------------------------------------------------------------

  it('[SAFEGUARD-04] POST with valid token stores responses + marks COMPLETED', async () => {
    // Scenario: valid token, status=PENDING, responses=[{questionId, answer}].
    // Expected: row updated to status=COMPLETED, responses stored.
    // TODO(plan 05): assert update called with status='COMPLETED' and responses.
    // expect(mockBypass.postAdoptionCheckIn.update).toHaveBeenCalledWith(
    //   expect.objectContaining({ data: expect.objectContaining({ status: 'COMPLETED' }) }),
    // );
  });

  it('[SAFEGUARD-04] re-submit on already-COMPLETED row is idempotent (no error)', async () => {
    // Scenario: row already has status=COMPLETED.
    // Expected: service returns successfully (no error) and does NOT overwrite the
    // existing responses — idempotent submission prevents duplicate storage.
    // TODO(plan 05): assert that update is NOT called (or called with same data).
  });
});
