---
phase: 08-google-oauth
plan: "01"
subsystem: auth
tags: [tdd, red-phase, google-oauth, auth-service, spec-fix]
dependency_graph:
  requires: []
  provides:
    - auth.service.spec.ts with MailDispatcher mock and RED loginWithGoogle tests
    - google.strategy.spec.ts with AuthService delegation tests (RED)
  affects:
    - backend/src/auth/auth.service.spec.ts
    - backend/src/auth/strategies/google.strategy.spec.ts
tech_stack:
  added: []
  patterns:
    - TDD RED phase — tests written before implementation
    - MailDispatcher mock pattern (send vi.fn()) replacing MailService mock
    - AuthService delegation test pattern for strategy specs
key_files:
  modified:
    - backend/src/auth/auth.service.spec.ts
    - backend/src/auth/strategies/google.strategy.spec.ts
decisions:
  - mockMailDispatcher replaces mockMailService — spec must match actual service (MailDispatcher, not MailService)
  - google.strategy.spec.ts tests delegation only — no PrismaService, no DB assertions; those belong in auth.service.spec.ts
  - mockPrisma.organization.findFirst added to cover generateTokens() ORG_ADMIN branch used by all auth flows
metrics:
  duration_minutes: 9
  completed_date: "2026-04-23"
  tasks_completed: 2
  files_modified: 2
---

# Phase 08 Plan 01: loginWithGoogle TDD Spec Setup Summary

**One-liner:** Fixed stale MailService mock drift in auth.service.spec.ts and established RED test coverage for loginWithGoogle() and GoogleStrategy delegation before any implementation.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix auth.service.spec.ts mock drift and add RED loginWithGoogle tests | 649fa49 | backend/src/auth/auth.service.spec.ts |
| 2 | Rewrite google.strategy.spec.ts to test AuthService delegation | 1b362f7 | backend/src/auth/strategies/google.strategy.spec.ts |

## What Was Done

### Task 1 — auth.service.spec.ts mock drift fix + RED loginWithGoogle tests

The spec file imported `MailService` but `AuthService` was refactored to use `MailDispatcher` in a previous phase. This stale mock caused silent test failures because the wrong provider was being injected. Fixed by:

- Replacing `import { MailService }` with `import { MailDispatcher }` + `WelcomeMail` + `VerificationMail` + `ResetPasswordMail`
- Replacing `mockMailService = { sendVerificationEmail, sendResetPasswordEmail }` with `mockMailDispatcher = { send: vi.fn() }`
- Updating all existing test assertions to use `mockMailDispatcher.send` with `expect.any(VerificationMail)` / `expect.any(ResetPasswordMail)`
- Adding `mockConfigService.getOrThrow` (service uses this for JWT secrets, not just `.get`)
- Adding missing `mockPrisma` entries: `user.findFirst`, `user.create`, `refreshToken.create`, `organization.findFirst`
- Adding 5 RED loginWithGoogle describe block tests covering: new user creation, returning user, account linking, deactivated user (ForbiddenException), no-email profile (UnauthorizedException)

**Result:** 20 pre-existing tests PASS, 5 loginWithGoogle tests FAIL with `service.loginWithGoogle is not a function` — correct RED state.

### Task 2 — google.strategy.spec.ts rewrite

The original spec tested `validate()` by mocking `PrismaService` directly and asserting on DB calls (`user.create`, `user.update`, etc.). After Plan 02 refactors `GoogleStrategy` to delegate to `AuthService.loginWithGoogle()`, those assertions will be wrong. Replaced the entire spec with:

- `mockAuthService = { loginWithGoogle: vi.fn() }` injected via NestJS testing module
- `mockConfigService` with both `.get` and `.getOrThrow`
- 2 delegation tests: "should delegate with profile" and "should propagate errors"

**Result:** Both tests FAIL because `GoogleStrategy` still injects `PrismaService` — Nest DI rejects the module. Correct RED state for Plan 02 to fix.

## Verification

```
Test Files: 2 failed
Tests: 7 failed | 20 passed (27)
- auth.service.spec.ts: 20 PASS (pre-existing), 5 FAIL (loginWithGoogle RED)
- google.strategy.spec.ts: 2 FAIL (RED — strategy not yet refactored)
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing mock] Added mockConfigService.getOrThrow**
- **Found during:** Task 1 — existing verifyEmail and resetPassword tests would fail because auth.service.ts calls `config.getOrThrow()` not just `config.get()`
- **Fix:** Added `getOrThrow: vi.fn()` to `mockConfigService` with same config map pattern
- **Files modified:** backend/src/auth/auth.service.spec.ts

**2. [Rule 1 - Bug] Updated existing verifyEmail, login, resetPassword, refreshTokens test setup**
- **Found during:** Task 1 — after switching to `deleteMany + create` pattern (matching actual generateTokens), existing tests that used `refreshToken.upsert` needed `deleteMany` and `create` mocks added to pass
- **Fix:** Added `mockPrisma.refreshToken.deleteMany`, `mockPrisma.refreshToken.create`, and `mockPrisma.organization.findFirst` setup calls in affected describe blocks
- **Files modified:** backend/src/auth/auth.service.spec.ts

## Known Stubs

None — this is a TDD RED phase plan. No implementation code was written. Stubs are intentional: `loginWithGoogle` does not exist yet (Plan 02 adds it), and `GoogleStrategy.validate()` still delegates to PrismaService (Plan 02 refactors it).

## TDD Gate Compliance

RED gate: Both spec files have failing tests that describe the correct behavior.
GREEN gate: Not yet — Plan 02 implements `loginWithGoogle()` in `AuthService` and refactors `GoogleStrategy`.

## Self-Check: PASSED

- [x] backend/src/auth/auth.service.spec.ts exists and modified
- [x] backend/src/auth/strategies/google.strategy.spec.ts exists and modified
- [x] Commit 649fa49 exists (Task 1)
- [x] Commit 1b362f7 exists (Task 2)
- [x] Zero MailService references in auth.service.spec.ts
- [x] 5 loginWithGoogle tests present (RED)
- [x] 2 google strategy delegation tests present (RED)
- [x] 20 pre-existing tests continue to PASS
