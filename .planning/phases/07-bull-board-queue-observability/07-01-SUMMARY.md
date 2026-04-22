---
phase: 07-bull-board-queue-observability
plan: "01"
subsystem: backend/admin
tags: [bull-board, queue-observability, auth-middleware, nestjs, tdd]
dependency_graph:
  requires: []
  provides:
    - BullBoardAuthMiddleware (JWT + role-check Express middleware for /admin/queues)
    - BullBoardModule.forRoot mounted at /admin/queues with ExpressAdapter
  affects:
    - backend/src/admin/admin.module.ts
tech_stack:
  added:
    - "@bull-board/nestjs@6.21.3"
    - "@bull-board/api@6.21.3"
  patterns:
    - NestJS MiddlewareConsumer auth gate for middleware-mounted Express routes
    - TDD RED/GREEN cycle for security middleware
key_files:
  created:
    - backend/src/admin/bull-board-auth.middleware.ts
    - backend/src/admin/bull-board-auth.middleware.spec.ts
  modified:
    - backend/src/admin/admin.module.ts
    - backend/package.json
    - backend/package-lock.json
decisions:
  - key: BullBoardAuthMiddleware via MiddlewareConsumer (not forRoot middleware option)
    rationale: JwtService requires NestJS DI; the forRoot middleware option runs Express-layer only with no DI support
  - key: "?token= query param fallback accepted in middleware"
    rationale: Access token lives in Pinia memory (not cookie); direct browser navigation cannot send Bearer headers; query param is the pragmatic approach for an internal admin tool (documented as intentional per RESEARCH.md Pitfall 3 / T-7-03)
  - key: JwtModule (no forRoot config) imported in AdminModule
    rationale: Provides JwtService for DI into BullBoardAuthMiddleware; ConfigService is globally provided by AppModule
metrics:
  duration: "2 minutes"
  completed: "2026-04-22"
  tasks_completed: 2
  files_changed: 5
---

# Phase 07 Plan 01: Bull Board Auth Middleware Summary

Bull Board JWT auth middleware implemented and wired — @bull-board/nestjs installed, BullBoardAuthMiddleware guards /admin/queues with JWT verification + PLATFORM_ADMIN role check, all 5 unit tests GREEN.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Install packages + write RED spec | 9ecbd03 | package.json, package-lock.json, bull-board-auth.middleware.spec.ts |
| 2 | Implement BullBoardAuthMiddleware (GREEN) + wire AdminModule | 894c294 | bull-board-auth.middleware.ts, admin.module.ts |

## Verification

- `npx vitest run src/admin/bull-board-auth.middleware.spec.ts` — 5/5 PASS
- `npx vitest run src/admin/` — 20/20 PASS (includes admin.service.spec.ts)
- Pre-existing failures in 5 other spec files (auth, adopters, animals, applications, organizations) are out-of-scope and unrelated to this plan's changes

## TDD Gate Compliance

- RED gate: commit `9ecbd03` — `test(07-01): add failing RED spec for BullBoardAuthMiddleware`
- GREEN gate: commit `894c294` — `feat(07-01): implement BullBoardAuthMiddleware and wire AdminModule`
- Both gates present and in correct order

## Deviations from Plan

**1. [Rule 3 - Blocking] npm install failed due to root-owned node_modules**
- **Found during:** Task 1
- **Issue:** The `backend/node_modules/` directory is owned by root (Docker-managed). Direct `npm install` from host failed with EACCES.
- **Fix:** Ran `npm install` via `docker exec kovia-api-1` and copied updated `package.json` / `package-lock.json` back to worktree. Test execution also routed through Docker (`docker exec kovia-api-1 npx vitest run`).
- **Files modified:** None beyond what the plan specified
- **Commit:** Included in 9ecbd03

No other deviations — plan executed as written.

## Known Stubs

None.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model (T-7-01 through T-7-05).

## Self-Check: PASSED

- `backend/src/admin/bull-board-auth.middleware.ts` — FOUND
- `backend/src/admin/bull-board-auth.middleware.spec.ts` — FOUND
- `backend/src/admin/admin.module.ts` — FOUND (modified)
- Commit `9ecbd03` — FOUND
- Commit `894c294` — FOUND
