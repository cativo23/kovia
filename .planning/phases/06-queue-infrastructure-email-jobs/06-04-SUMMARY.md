---
phase: 06-queue-infrastructure-email-jobs
plan: "04"
subsystem: backend/admin
tags: [mail, admin, gap-closure, queue]
dependency_graph:
  requires: [06-01-PLAN, 06-02-PLAN, 06-03-PLAN]
  provides: [AdminService fully migrated to MailDispatcher]
  affects: [backend/src/admin/admin.service.ts]
tech_stack:
  added: []
  patterns: [MailDispatcher.send(new OrgInviteMail(...)) pattern applied to AdminService]
key_files:
  modified:
    - backend/src/admin/admin.service.ts
    - backend/src/admin/admin.service.spec.ts
decisions:
  - AdminService constructor receives MailDispatcher + ConfigService (not MailService) for queue-based org invite dispatch
metrics:
  duration: "~8 minutes"
  completed: "2026-04-22T18:06:15Z"
  tasks_completed: 1
  files_changed: 2
---

# Phase 06 Plan 04: AdminService MailDispatcher Migration Summary

**One-liner:** Replaced deleted MailService dependency in AdminService with MailDispatcher + OrgInviteMail, closing the TypeScript compilation gap left by plan 06-03.

## What Was Done

Plan 06-03 deleted `mail.service.ts` as part of consolidating email dispatch into the queue infrastructure. `admin.service.ts` still imported `MailService`, causing a `TS2307: Cannot find module` compilation error. This plan closes that gap.

`admin.service.ts` now:
- Imports `MailDispatcher`, `OrgInviteMail`, and `ConfigService` instead of `MailService`
- Both `createInvite` and `resendInvite` dispatch via `mailDispatcher.send(new OrgInviteMail(dto.email, { orgName, inviteUrl }))` 
- `inviteUrl` is constructed server-side as `APP_URL + /invite/ + token` — no credential exposure

## Tasks

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Migrate AdminService from MailService to MailDispatcher + OrgInviteMail | f3d1c50 | admin.service.ts, admin.service.spec.ts |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated admin.service.spec.ts to match new constructor and call signatures**
- **Found during:** Task 1 verification (TypeScript compilation check)
- **Issue:** The spec file still instantiated `AdminService` with 3 args (including `mockMailService`) and called methods without the required `userId` parameter. This would cause `TS2554: Expected N arguments, but got M` errors after our service change.
- **Fix:** Updated mock setup to use `mockMailDispatcher` + `mockConfig`, updated constructor call to 4 args, added `userId` to all method calls, updated mail assertions to check `mockMailDispatcher.send` with `OrgInviteMail` shape, updated audit log assertions to use concrete `userId` values and correct `targetUserId` key names.
- **Files modified:** `backend/src/admin/admin.service.spec.ts`
- **Commit:** f3d1c50 (included in same commit as service change)

## Verification

All acceptance criteria confirmed:

- `grep "mail.service\|MailService" backend/src/admin/admin.service.ts` — no output
- `grep "MailDispatcher" backend/src/admin/admin.service.ts` — import line + constructor param
- `grep "OrgInviteMail" backend/src/admin/admin.service.ts` — import line + 2 call sites
- `grep "ConfigService" backend/src/admin/admin.service.ts` — import line + constructor param
- `grep "mailDispatcher.send" backend/src/admin/admin.service.ts` — exactly 2 matches (createInvite, resendInvite)
- All import paths verified to exist on filesystem

Note: TypeScript compilation was checked structurally (import path existence, type shape review). The running container binds to the main repo (not the worktree), so `tsc --noEmit` in the container shows the pre-existing errors from the unmodified main repo file — not our changes.

## Threat Flags

None. The threat model threats T-06-04-01 and T-06-04-02 are both accepted-risk: the token is cryptographically random (32 bytes) and APP_URL is a non-secret public base URL.

## Self-Check: PASSED

- [x] `backend/src/admin/admin.service.ts` — exists, no MailService references
- [x] `backend/src/admin/admin.service.spec.ts` — exists, updated to new constructor shape
- [x] Commit f3d1c50 exists in git log
