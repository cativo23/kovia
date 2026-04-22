---
phase: 07-bull-board-queue-observability
plan: "02"
subsystem: backend/queues
tags: [bull-board, queue-observability, bullmq, nestjs, tdd]
dependency_graph:
  requires:
    - "07-01"  # BullBoardModule.forRoot and BullBoardAuthMiddleware
  provides:
    - BullBoardModule.forFeature for 'webhook' queue in NotificationsModule
    - BullBoardModule.forFeature for 'emails-auth' queue in MailModule
    - BullBoardModule.forFeature for 'emails-transactional' queue in MailModule
    - BullBoardModule.forFeature for 'scoring' queue in ScoringModule
  affects:
    - backend/src/notifications/notifications.module.ts
    - backend/src/mail/mail.module.ts
    - backend/src/scoring/scoring.module.ts
tech_stack:
  added: []
  patterns:
    - BullBoardModule.forFeature co-located with BullModule.registerQueue in the canonical queue-owner module
    - TDD RED/GREEN cycle for source-level module registration verification
key_files:
  created:
    - backend/src/notifications/notifications.module.spec.ts
    - backend/src/mail/mail.module.spec.ts
    - backend/src/scoring/scoring.module.spec.ts
  modified:
    - backend/src/notifications/notifications.module.ts
    - backend/src/mail/mail.module.ts
    - backend/src/scoring/scoring.module.ts
decisions:
  - key: forFeature placed in canonical queue-owner modules only
    rationale: DI rule — forFeature in a different module from registerQueue causes "No provider for BullMQ queue 'X'" error at startup; each adapter must be co-located with its registerQueue call
  - key: ScoringModule receives forFeature, not ApplicationsModule (which imports ScoringModule)
    rationale: ApplicationsModule only consumes ScoringModule — it does not own the scoring queue registration
metrics:
  duration: "5 minutes"
  completed: "2026-04-22"
  tasks_completed: 1
  files_changed: 6
---

# Phase 07 Plan 02: BullMQAdapter forFeature Queue Registrations Summary

All 4 BullMQ queues wired to Bull Board via forFeature — webhook, emails-auth, emails-transactional, and scoring adapters registered in their canonical owner modules so the Bull Board dashboard at /admin/queues shows live job counts for every queue.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing specs for forFeature registrations | 46688c5 | notifications.module.spec.ts, mail.module.spec.ts, scoring.module.spec.ts |
| 1 (GREEN) | Register BullMQAdapter forFeature in all 3 feature modules | ecd1214 | notifications.module.ts, mail.module.ts, scoring.module.ts |

## Verification

- `npx vitest run src/notifications/notifications.module.spec.ts src/mail/mail.module.spec.ts src/scoring/scoring.module.spec.ts` — 11/11 PASS
- `npx tsc --noEmit` — no errors in any of the 3 modified files
- `grep -r "BullBoardModule.forFeature" backend/src --include="*.ts" -l` — returns notifications.module.ts, mail.module.ts, scoring.module.ts (3 files, all expected)
- `grep "BullMQAdapter" backend/src/admin --include="*.ts"` — empty (no leakage into admin module)
- Pre-existing failures in 5 spec files (auth, adopters, animals, applications, organizations) are unchanged and out-of-scope

## TDD Gate Compliance

- RED gate: commit `46688c5` — `test(07-02): add failing RED specs for BullBoardModule.forFeature registrations`
- GREEN gate: commit `ecd1214` — `feat(07-02): register BullMQAdapter forFeature in all 3 feature modules`
- Both gates present and in correct order

## Deviations from Plan

**1. [Rule 3 - Blocking] Worktree files not visible to docker container**
- **Found during:** Task 1 (RED phase)
- **Issue:** The docker container (kovia-api-1) mounts `/home/cativo23/projects/personal/kovia/backend` as `/app`, but this agent runs in a git worktree at `.claude/worktrees/agent-a9769a63/`. Spec files created in the worktree were not visible in the container.
- **Fix:** Temporarily copied spec files and modified module files to the main backend path for docker test execution, then restored the main repo to its original state after confirming GREEN. Worktree commits contain the correct source of truth.
- **Files modified:** None beyond what the plan specified

No other deviations — plan executed as written.

## Known Stubs

None.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model (T-7-06, T-7-07). No new network endpoints, auth paths, or file access patterns introduced — forFeature is additive display-only registration.

## Self-Check: PASSED

- `backend/src/notifications/notifications.module.ts` — FOUND, contains BullBoardModule.forFeature for 'webhook'
- `backend/src/mail/mail.module.ts` — FOUND, contains BullBoardModule.forFeature x2 for email queues
- `backend/src/scoring/scoring.module.ts` — FOUND, contains BullBoardModule.forFeature for 'scoring'
- `backend/src/notifications/notifications.module.spec.ts` — FOUND
- `backend/src/mail/mail.module.spec.ts` — FOUND
- `backend/src/scoring/scoring.module.spec.ts` — FOUND
- Commit `46688c5` — FOUND (RED gate)
- Commit `ecd1214` — FOUND (GREEN gate)
