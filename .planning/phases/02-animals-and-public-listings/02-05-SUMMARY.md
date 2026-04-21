---
phase: 02-animals-and-public-listings
plan: "05"
subsystem: frontend-photo-management
tags: [bug-fix, optimistic-update, tdd, reorder, drag-drop]
dependency_graph:
  requires: []
  provides: [photo-reorder-persistence]
  affects: [frontend/app/pages/org/dashboard/animales/[id]/editar.vue, frontend/app/components/animals/PhotoUploader.vue]
tech_stack:
  added: []
  patterns: [optimistic-update-with-rollback]
key_files:
  created:
    - frontend/tests/unit/pages/animals/editar-reorder.spec.ts
  modified:
    - frontend/app/pages/org/dashboard/animales/[id]/editar.vue
    - backend/src/animals/animals.service.spec.ts
decisions:
  - Edit page owns source of truth for photo order — optimistic local update before PATCH, rollback on failure
  - PhotoUploader emit contract already correct — no component changes needed
metrics:
  duration: "~10 minutes"
  completed: "2026-04-21"
  tasks_completed: 3
  files_changed: 3
---

# Phase 02 Plan 05: Photo Drag-to-Reorder Snap-Back Fix Summary

**One-liner:** Optimistic local state update in the animal edit page fixes photo drag-to-reorder snap-back by mutating `animal.value.photos` before awaiting PATCH, with rollback on failure.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Failing spec for optimistic reorder | 157af86 | frontend/tests/unit/pages/animals/editar-reorder.spec.ts |
| 1 (GREEN) | Fix reorder state ownership on edit page | d4a9f0f | frontend/app/pages/org/dashboard/animales/[id]/editar.vue |
| 2 | Verify PhotoUploader emit contract | (no commit — no change needed) | frontend/app/components/animals/PhotoUploader.vue |
| 3 (RED+GREEN) | Backend regression tests for reorderPhotos edge cases | f929fbc | backend/src/animals/animals.service.spec.ts |

## Root Cause

Two-part frontend bug:

1. `PhotoUploader.vue:handlePhotoDrop` correctly emits `reorder` with the new photo ID order, but never mutates the visible list. The component re-renders from `props.photos` (read-only), so after the drop event the UI snaps back to the incoming prop order.

2. `editar.vue:reorderExistingPhotos` called PATCH but never updated `animal.value.photos`. Even after a successful backend write, the computed `existingPhotos` derived from `animal.value.photos` still had the old `position` values.

## Fix

Replaced `reorderExistingPhotos` in `editar.vue` with an optimistic version:
- Snapshots `animal.value.photos` as `previousPhotos` before mutating
- Rebuilds `reordered` array in the new order with updated `position` fields using a `Map` for O(1) lookup
- Sets `animal.value.photos = reordered` immediately — the `existingPhotos` computed re-derives and PhotoUploader re-renders in the new order
- On PATCH failure: restores `animal.value.photos = previousPhotos` and shows error toast
- Defensive handling: any photos missing from `photoIds` are appended in original relative order

## Deviations from Plan

### Task 2 — No Change Needed (as planned)
The plan explicitly stated "Do not modify PhotoUploader.vue if the emit is already correct." Code review confirmed:
- Line 337-346: existing-photo reorder branch creates `[...props.photos]`, splices to new order, maps IDs, and emits `reorder` with the correct new order.
- Conclusion: **PhotoUploader emit contract verified; parent-side fix in Task 1 is sufficient.**

No other deviations.

## Verification

**Acceptance criteria passed:**
- `grep -c "previousPhotos" editar.vue` → 4 (>= 2 required)
- `grep -c "animal.value.photos = reordered" editar.vue` → 1 (exactly 1 required)
- `grep -c "animal.value.photos = previousPhotos" editar.vue` → 1 (exactly 1 required)
- `grep -q "emit('reorder'" PhotoUploader.vue` → passes
- Backend `reorderPhotos` tests: 3 passed (existing + 2 new regression cases)
- `nuxi typecheck` on `editar.vue`: no errors in the modified file (pre-existing type errors in other files are out of scope)

## Known Stubs

None.

## Threat Flags

No new trust boundaries introduced. The fix is entirely a frontend state-management bug. Backend endpoint unchanged.

## TDD Gate Compliance

| Gate | Commit | Status |
|------|--------|--------|
| RED (test) | 157af86 | Present |
| GREEN (feat) | d4a9f0f | Present |
| RED (backend test) | f929fbc | Present (combined RED+GREEN — implementation already correct) |

## Self-Check: PASSED

All files created/modified confirmed on disk. All commits (157af86, d4a9f0f, f929fbc) confirmed in git log.
