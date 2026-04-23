---
phase: 08-google-oauth
plan: "02"
subsystem: auth
tags: [tdd, green-phase, google-oauth, auth-service, strategy-refactor, bug-fix]
dependency_graph:
  requires:
    - 08-01 (RED tests for loginWithGoogle and GoogleStrategy delegation)
  provides:
    - AuthService.loginWithGoogle() public method (GREEN)
    - GoogleStrategy refactored as thin delegator to AuthService
    - googleCallback controller fixed (isActive bug removed, URLSearchParams outcome flags)
    - GOOGLE_CALLBACK_URL env var documented in .env.example
  affects:
    - backend/src/auth/auth.service.ts
    - backend/src/auth/strategies/google.strategy.ts
    - backend/src/auth/auth.controller.ts
    - .env.example
tech_stack:
  added:
    - Profile type from passport-google-oauth20 (imported in auth.service.ts)
  patterns:
    - TDD GREEN phase — implementation written to satisfy RED tests
    - forwardRef() preemptive DI guard for GoogleStrategy → AuthService injection
    - URLSearchParams for outcome-flagged OAuth redirect
    - D-02 fix pattern: read isActive from DB, never override in controller
key_files:
  created: []
  modified:
    - backend/src/auth/auth.service.ts
    - backend/src/auth/strategies/google.strategy.ts
    - backend/src/auth/auth.controller.ts
    - .env.example
decisions:
  - loginWithGoogle() is implemented after resendVerification() and before getProfile() to maintain logical grouping
  - forwardRef(() => AuthService) applied preemptively in GoogleStrategy per RESEARCH.md Pitfall 1 — harmless if no cycle, required if cycle detected at boot
  - WelcomeMail dispatched only in the create branch; link branch explicitly skips to prevent double-send (T-08-P02-06 mitigated)
  - isActive checked from DB value after all user resolution branches (T-08-P02-01 mitigated)
  - callbackURL uses config.getOrThrow (fails fast at boot if missing) rather than config.get with fallback (T-08-P02-05 mitigated)
metrics:
  duration_minutes: 15
  completed_date: "2026-04-23"
  tasks_completed: 2
  files_modified: 4
---

# Phase 08 Plan 02: Google OAuth GREEN Phase Summary

**One-liner:** Implemented AuthService.loginWithGoogle() with all 5 user-flow branches, refactored GoogleStrategy to a one-liner delegator, fixed the isActive override bug in the controller, and added GOOGLE_CALLBACK_URL env var — all 7 RED tests from Plan 01 now GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Implement AuthService.loginWithGoogle() — GREEN phase | 94b555e | backend/src/auth/auth.service.ts |
| 2 | Refactor GoogleStrategy + fix controller bug + add env var | 5d42106 | backend/src/auth/strategies/google.strategy.ts, backend/src/auth/auth.controller.ts, .env.example |

## What Was Done

### Task 1 — AuthService.loginWithGoogle() implementation

Added the `loginWithGoogle(profile: Profile)` method to `AuthService` between `resendVerification()` and `getProfile()`. The method implements all 5 user-flow branches:

1. **Returning user (googleId match):** `prisma.user.findFirst({ where: { googleId } })` — no DB writes, no WelcomeMail. Returns `{ isNew: false, isLinked: false, accessToken, refreshToken }`.
2. **Link branch (email match, no googleId):** `prisma.user.update({ data: { googleId, emailVerified: true } })` — no WelcomeMail. Returns `{ isNew: false, isLinked: true, ... }`.
3. **Create branch (new user):** `prisma.user.create(...)` with first-user PLATFORM_ADMIN / ADOPTER role logic; WelcomeMail dispatched after create. Returns `{ isNew: true, isLinked: false, ... }`.
4. **Deactivated user (any branch):** `if (!user.isActive) throw ForbiddenException(...)` — D-02 fix reads DB value, never overridden.
5. **No email in profile:** throws `UnauthorizedException('Google profile missing email')`.

Also added `import { Profile } from 'passport-google-oauth20'` to the imports.

**Result:** All 25 auth.service.spec.ts tests pass (20 pre-existing + 5 loginWithGoogle GREEN).

### Task 2 — GoogleStrategy refactor + controller fix + .env.example

**GoogleStrategy:** Replaced entire 71-line file. PrismaService injection removed; AuthService injected with `@Inject(forwardRef(() => AuthService))`. `validate()` reduced to a one-liner: `return this.authService.loginWithGoogle(profile)`. `callbackURL` now reads from `config.getOrThrow<string>('GOOGLE_CALLBACK_URL')` — fails fast at boot if env var missing.

**AuthController.googleCallback():** Removed the `isActive: true` override bug. `req.user` is now `{ accessToken, refreshToken, isNew, isLinked }` (set by GoogleStrategy's validate return). Builds `URLSearchParams` with `token` + optional `new=true` / `linked=true` outcome flags.

**.env.example:** Added `GOOGLE_CALLBACK_URL=http://localhost:3000/auth/google/callback` to the Google OAuth block.

**Result:** Both google.strategy.spec.ts delegation tests pass. All 27 auth tests GREEN.

## Verification

```
Test Files: 2 passed
Tests: 27 passed (25 auth.service + 2 google.strategy)
- auth.service.spec.ts: 25 PASS (20 pre-existing + 5 loginWithGoogle GREEN)
- google.strategy.spec.ts: 2 PASS (delegation tests GREEN)
```

Spot-checks:
- `grep PrismaService google.strategy.ts` → 0 lines
- `grep "isActive: true" auth.controller.ts` → 0 lines
- `grep URLSearchParams auth.controller.ts` → 1 line
- `grep GOOGLE_CALLBACK_URL .env.example` → 1 line with dev default

## Deviations from Plan

None — plan executed exactly as written. The `forwardRef()` approach was already specified in the plan and confirmed harmless after successful test run.

## Known Stubs

None — all implemented paths are wired. `loginWithGoogle()` reads from and writes to the real DB via PrismaService mock in tests. The Google OAuth credentials (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`) are env-var-driven; leaving them empty in `.env.example` is intentional and documented.

## Threat Surface Scan

No new network endpoints, auth paths, file access patterns, or schema changes introduced beyond what the plan's threat model covers. The `googleCallback` endpoint existed before this plan; this plan fixed its implementation. All T-08-P02 mitigations applied:

- T-08-P02-01 (isActive override): Fixed — DB value read, ForbiddenException thrown if inactive
- T-08-P02-05 (hardcoded callbackURL): Fixed — config.getOrThrow reads from env
- T-08-P02-06 (WelcomeMail double-send): Fixed — only dispatched in create branch
- T-08-P02-07 (circular dep): Mitigated — forwardRef applied preemptively

## TDD Gate Compliance

RED gate: Plan 01 (commits 649fa49, 1b362f7) — 7 failing tests established before implementation.
GREEN gate: This plan (commits 94b555e, 5d42106) — all 7 RED tests now pass.

## Self-Check: PASSED

- [x] backend/src/auth/auth.service.ts exists and modified (loginWithGoogle method present)
- [x] backend/src/auth/strategies/google.strategy.ts exists and replaced (PrismaService gone, AuthService injected)
- [x] backend/src/auth/auth.controller.ts exists and modified (isActive bug removed, URLSearchParams present)
- [x] .env.example exists and modified (GOOGLE_CALLBACK_URL present)
- [x] Commit 94b555e exists (Task 1)
- [x] Commit 5d42106 exists (Task 2)
- [x] All 27 auth tests GREEN
- [x] 0 lines of `isActive: true` in controller
- [x] 0 lines of `PrismaService` in google.strategy.ts
