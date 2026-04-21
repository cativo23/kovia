---
phase: 02-animals-and-public-listings
plan: "06"
subsystem: ui
tags: [nuxt, vue, i18n, intlify, animal-card]

# Dependency graph
requires:
  - phase: 02-animals-and-public-listings
    provides: AnimalCard.vue component and es-SV.json locale file with sizeOptions keys

provides:
  - AnimalCard.vue renders localized size labels (Pequeno/Mediano/Grande/Extra grande) instead of raw i18n keys
affects:
  - Public /animales listing page
  - Org /org/:slug landing page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Use animals.form.sizeOptions.<key> (not animals.form.size.<key>) for size label lookups in all Vue components"

key-files:
  created: []
  modified:
    - frontend/app/components/animals/AnimalCard.vue

key-decisions:
  - "No new i18n keys added — existing sizeOptions keys were sufficient; only the lookup path was wrong"

patterns-established:
  - "AnimalCard uses sizeOptions path consistent with AnimalForm and animal detail page"

requirements-completed: [LIST-01, LIST-05]

# Metrics
duration: 5min
completed: 2026-04-21
---

# Phase 02 Plan 06: i18n Size Label Fix Summary

**Fixed raw i18n key display on animal cards by correcting `animals.form.size.*` to `animals.form.sizeOptions.*` in AnimalCard.vue grid and list modes**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-21T00:00:00Z
- **Completed:** 2026-04-21T00:05:00Z
- **Tasks:** 1
- **Files modified:** 1

## Accomplishments
- `/animales` and `/org/:slug` now render "Pequeno/Mediano/Grande/Extra grande" instead of raw keys like `animals.form.size.large`
- Eliminated `[intlify] Not found 'animals.form.size.*'` warnings from Nuxt log
- Both grid mode (line 50) and list mode (line 115) corrected; no other files needed changes

## Task Commits

Each task was committed atomically:

1. **Task 1: Correct the i18n key path in AnimalCard.vue (grid + list modes)** - `0f28f43` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `frontend/app/components/animals/AnimalCard.vue` - Changed `animals.form.size.` to `animals.form.sizeOptions.` in two template locations

## Decisions Made
None - followed plan as specified. Keys already existed under `sizeOptions` in es-SV.json; only the component's lookup path was wrong.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. The fix was surgical — two character-range substitutions in a single file.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Animal size labels now display correctly in all public-facing listing contexts
- No blockers introduced; this was a gap-closure fix for UAT Gap 3

---
*Phase: 02-animals-and-public-listings*
*Completed: 2026-04-21*
