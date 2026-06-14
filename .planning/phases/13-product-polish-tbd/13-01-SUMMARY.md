---
phase: 13-product-polish-tbd
plan: "01"
subsystem: documentation, backend-config
tags: [polish, docs, nest-cli, watchAssets, POLISH-01, POLISH-04, D-15-correction]
dependency_graph:
  requires: []
  provides: [POLISH-01-resolved, POLISH-04-resolved, 10-CONTEXT-corrected, nest-cli-watchAssets-fixed]
  affects: [phase-10-documentation, backend-dev-dx]
tech_stack:
  added: []
  patterns: []
key_files:
  created: []
  modified:
    - .planning/phases/10-adopter-dashboard/10-CONTEXT.md
    - .planning/phases/10-adopter-dashboard/10-VERIFICATION.md
    - .planning/REQUIREMENTS.md
    - backend/nest-cli.json
decisions:
  - "POLISH-01: webhook+email-only is the intended behavior for org-side application events; no in-app fan-out to org admins/staff; Phase 10 CONTEXT.md D-15 corrected accordingly"
  - "POLISH-04: SWC builder reads top-level compilerOptions.watchAssets for new-file ADD events; per-asset watchAssets is tsc-only and ignored by SWC for new-file detection"
metrics:
  duration: "~10 minutes"
  completed: "2026-04-27"
  tasks_completed: 2
  tasks_total: 2
---

# Phase 13 Plan 01: POLISH-01 and POLISH-04 — Documentation Reconciliation and watchAssets Fix Summary

Closed two v2.1 polish items — one docs-only correction to remove a false claim about in-app notification fan-out to org admins, one config flag relocation to fix NestJS SWC dev-server asset watching for new `.hbs` templates.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Fix POLISH-01 D-15 documentation reconciliation | `3ccbdbc` | `.planning/phases/10-adopter-dashboard/10-CONTEXT.md`, `.planning/phases/10-adopter-dashboard/10-VERIFICATION.md`, `.planning/REQUIREMENTS.md` |
| 2 | POLISH-04 — Move watchAssets to top-level compilerOptions | `a4ee3db` | `backend/nest-cli.json` |

## Changes Made

### Task 1 — POLISH-01: D-15 Documentation Reconciliation

**Files changed:** 3 docs files

**Problem:** Phase 10 D-15 in `10-CONTEXT.md` incorrectly stated that `emitApplicationWithdrawn` fires an in-app notification "to org admins via NotificationType.WITHDRAWN template". The actual behavior (verified in `backend/src/notifications/events.service.ts`) is that all `emitApplicationX` calls target `context.adopterId` only — org staff receive webhook + email outbound, not in-app DB notifications.

**Changes:**
- `10-CONTEXT.md` D-15 entry: replaced false fan-out claim with accurate description: ADOPTER receives in-app notification, org-side is webhook + email via the webhook emitter. Added correction note dated 2026-04-27.
- `10-CONTEXT.md` canonical refs line ~101: updated to clarify "adopter side" for emitApplicationWithdrawn.
- `10-CONTEXT.md` specifics section: replaced "rescue-receives-notification" with "adopter-receives-in-app + webhook-fires" to match reality.
- `10-VERIFICATION.md` Known Limitations item 1: updated deferral note to record resolution — webhook-only is the intended behavior, no production code change.
- `REQUIREMENTS.md` line 28: POLISH-01 checkbox changed from `[ ]` to `[x]`, appended resolution note dated 2026-04-27.
- `REQUIREMENTS.md` traceability table: POLISH-01 row status changed from `Pending` to `Complete`.

**No backend source files were modified.** `events.service.ts` and `09-CONTEXT.md` are untouched.

### Task 2 — POLISH-04: nest-cli.json watchAssets Fix

**File changed:** `backend/nest-cli.json`

**Problem:** The NestJS SWC builder reads `compilerOptions.watchAssets` at the top level for new-file ADD events. The per-asset `watchAssets: true` entry is recognized by the tsc builder but ignored by SWC for new-file detection — only file-modification events propagate from per-asset config. This meant that dropping a new `.hbs` template under `backend/src/mail/templates/` while `nest start --watch` was running would NOT automatically appear in `dist/` without restarting the dev server.

**Change:** Moved `watchAssets: true` from the inner asset entry to the top-level `compilerOptions`. The asset entry now has only `include` and `outDir` keys.

**Verification:** `python3` assertion confirms `compilerOptions.watchAssets === true` and asset entry has no `watchAssets` key. `python3 -m json.tool` confirms valid JSON.

**Manual verification note for POLISH-04:** The watcher behavior for new-file ADD events should be smoke-tested by a developer:
1. `docker compose exec api npm run start:dev`
2. Drop a new file under `backend/src/mail/templates/` (e.g., `test.hbs`)
3. Confirm the file appears in `dist/mail/templates/` without restarting the dev server

Auto-verification in this plan covers config shape only. The runtime behavior requires a live dev server.

## Decisions Made

1. **POLISH-01 decision:** Webhook + email is the intended behavior for org-side application events. The v2.0 D-15 wording was a documentation error, not a feature gap. No in-app fan-out implementation is needed or planned. Phase 10 CONTEXT.md corrected accordingly.

2. **POLISH-04 mechanism:** The SWC builder's `watchAssets` for new-file detection requires a top-level flag in `compilerOptions`, not per-asset configuration. Per-asset `watchAssets` is a tsc-builder-only feature.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None — this plan makes no changes to network endpoints, auth paths, or data schema.

## Self-Check: PASSED

- Task 1 commit `3ccbdbc` exists: verified
- Task 2 commit `a4ee3db` exists: verified
- `.planning/phases/10-adopter-dashboard/10-CONTEXT.md` — phrase "in-app notification (to org admins" count: 0 (correct)
- `.planning/phases/10-adopter-dashboard/10-CONTEXT.md` — phrase "rescue-receives-notification" count: 0 (correct)
- `.planning/phases/10-adopter-dashboard/10-CONTEXT.md` — phrase "Corrected 2026-04-27 per POLISH-01" count: 1 (correct)
- `.planning/phases/10-adopter-dashboard/10-VERIFICATION.md` — "Resolved in Phase 13 as **POLISH-01**" count: 1 (correct)
- `.planning/REQUIREMENTS.md` — `[x] **POLISH-01:**` matched (correct)
- `.planning/REQUIREMENTS.md` — `| POLISH-01  | Phase 13 | Complete |` matched (correct)
- `backend/nest-cli.json` — `compilerOptions.watchAssets === true` (correct)
- `backend/nest-cli.json` — asset entry `watchAssets` key absent (correct)
- `backend/src/` — no changes from this plan (correct)
