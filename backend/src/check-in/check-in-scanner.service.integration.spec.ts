// backend/src/check-in/check-in-scanner.service.integration.spec.ts
//
// PATTERN-03 scaffold for CheckInScannerService.
//
// CheckInScannerService will inject BOTH @Inject(PRISMA_RLS) AND PublicPrismaService
// (dual-client service) — PATTERN-03 mandates a sibling *.integration.spec.ts that
// EXISTS before the service is written. This file satisfies that requirement at Wave 0
// so PATTERN-03's CI check passes throughout Waves 1–4.
//
// Plan 05 Task 1 un-skips the describe block below and replaces stub bodies with
// real assertions against the live DB (PATTERN-02 runtime smoke: due PENDING row →
// DISPATCHED + webhook_outbox row actually enqueued).
//
// PATTERN-02 mandate (CLAUDE.md): the scanner chains a Prisma include that feeds
// a BullMQ/webhook_outbox emission. A real-DB integration spec is required to
// assert the downstream emission actually occurred — code inspection is not sufficient
// (v2.0 bug B3 precedent).
//
// Run after Plan 05 un-skips:
//   docker compose exec api npm test -- check-in-scanner.service.integration
//
// Wave 0 verification:
//   docker compose exec api npm test -- check-in   // exits 0 (all skipped)
//   docker compose exec api npx tsx scripts/check-integration-specs.ts  // exits 0

import { describe, it } from 'vitest';

// NOTE: Do NOT import CheckInScannerService at module top level here.
// The service does not exist yet (Plan 05 creates it). A top-level import of a
// non-existent module would break the entire Waves 1–4 suite (threat T-17-00).
//
// Plan 05 Task 1 will add the import statement when it un-skips this block.
// TODO(plan 05): import { CheckInScannerService } from './check-in-scanner.service';

describe.skip('CheckInScannerService (Plan 05 Task 1 un-skips)', () => {
  // ---------------------------------------------------------------------------
  // Harness setup — Plan 05 fills these in when un-skipping.
  //
  // Expected shape mirrors applications.service.rls.integration.spec.ts:
  //   - superuser pg.Client for fixture INSERTs (RLS-bypass)
  //   - PrismaService + PublicPrismaService for the SUT
  //   - Real DB PostAdoptionCheckIn rows with status=PENDING and
  //     scheduledFor timestamps in the past (due) or future (not-due)
  // ---------------------------------------------------------------------------

  it('[SAFEGUARD-04] [PATTERN-02] a due PENDING check-in row is claimed → DISPATCHED and webhook_outbox row enqueued', async () => {
    // Scenario:
    //   1. Seed a PostAdoptionCheckIn row: scheduleType=DAY_14, status=PENDING,
    //      scheduledFor=yesterday (due).
    //   2. Call scanner.scanAndDispatch() (or equivalent).
    //   3. Assert the row status changed to DISPATCHED in the DB.
    //   4. Assert a webhook_outbox row was inserted (PATTERN-02 runtime smoke:
    //      the chained include + BullMQ enqueue actually ran).
    //
    // TODO(plan 05): implement after CheckInScannerService is created.
    // expect(row.status).toBe('DISPATCHED');
    // expect(outboxRow).toBeDefined();
    //
    // Stub — Plan 05 replaces with real assertion:
    // expect(true).toBe(false);
  });

  it('[SAFEGUARD-04] second run does not re-dispatch the same row (idempotent)', async () => {
    // Scenario:
    //   1. Row already has status=DISPATCHED from a previous scan.
    //   2. Call scanner.scanAndDispatch() again.
    //   3. Assert the row was NOT re-dispatched (webhook_outbox row count unchanged,
    //      status still DISPATCHED — not re-queued).
    //
    // This proves the scanner is idempotent (D-13: "Not multi-week Redis delayed
    // jobs (fragile/inauditable)" — the DB row IS the durable state).
    //
    // TODO(plan 05): implement.
    // expect(secondRunOutboxCount).toBe(firstRunOutboxCount);
  });
});
