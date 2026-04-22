---
phase: 07-bull-board-queue-observability
plan: "03"
subsystem: frontend/admin
tags: [bull-board, admin-sidebar, i18n, nuxt, vue]

# Dependency graph
requires:
  - phase: 07-bull-board-queue-observability-01
    provides: BullBoardAuthMiddleware mounted at /admin/queues accepting ?token= query param
provides:
  - Admin sidebar "Colas de Jobs" external link to Bull Board UI
  - config.public.backendUrl runtimeConfig key for direct backend navigation
affects:
  - frontend/app/layouts/admin.vue

# Tech tracking
tech-stack:
  added: []
  patterns:
    - External <a> element (not NuxtLink) for cross-origin admin tool links
    - config.public.backendUrl for direct backend URL vs config.public.apiUrl proxy

key-files:
  created: []
  modified:
    - frontend/app/layouts/admin.vue
    - frontend/i18n/locales/es-SV.json
    - frontend/nuxt.config.ts

key-decisions:
  - "Used config.public.backendUrl (new key) instead of config.public.apiUrl — apiUrl resolves to /api/v1 proxy, not the direct backend URL needed for Bull Board navigation"
  - "Plain <a> element instead of NuxtLink — NuxtLink cannot navigate cross-origin to backend Express routes"

patterns-established:
  - "External admin tool links use <a :href> with target=_blank + rel=noopener noreferrer"

requirements-completed:
  - QUEUE-04

# Metrics
duration: 5min
completed: 2026-04-22
---

# Phase 07 Plan 03: Bull Board Frontend Link Summary

**"Colas de Jobs" external link in admin sidebar wires the Nuxt admin UI to the backend Bull Board at /admin/queues?token=... using a plain anchor element and short-lived access token**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-22T00:00:00Z
- **Completed:** 2026-04-22T00:05:00Z
- **Tasks:** 1 of 2 (task 2 is a human-verify checkpoint — awaiting verification)
- **Files modified:** 3

## Accomplishments

- Added "Colas de Jobs" link to admin sidebar as a plain `<a>` element (cross-origin, cannot use NuxtLink)
- Added `config.public.backendUrl` to nuxt.config.ts runtimeConfig so the href resolves to the real backend host
- Added `admin.queues.title` i18n key to es-SV.json with value "Colas de Jobs"
- `rel="noopener noreferrer"` applied per T-7-09 threat mitigation

## Task Commits

1. **Task 1: Add Bull Board external link to admin sidebar + i18n key** - `cb8e3ef` (feat)

## Files Created/Modified

- `frontend/app/layouts/admin.vue` - Added `<a>` link after navItems loop + `useRuntimeConfig()` in script setup
- `frontend/i18n/locales/es-SV.json` - Added `admin.queues.title = "Colas de Jobs"`
- `frontend/nuxt.config.ts` - Added `backendUrl` to `runtimeConfig.public` (defaults to `http://localhost:3000`)

## Decisions Made

- **backendUrl vs apiUrl:** `config.public.apiUrl` is `/api/v1` (a Nuxt server proxy). Bull Board is an Express-mounted route on the backend, not proxied through Nuxt. A separate `backendUrl` key pointing directly to the backend host is required.
- **Plain `<a>` element:** NuxtLink only handles same-origin SPA navigation. A plain anchor with `target="_blank"` is the correct pattern for navigating to a different origin (backend).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Used `config.public.backendUrl` instead of `config.public.apiUrl`**
- **Found during:** Task 1 — reading nuxt.config.ts before editing
- **Issue:** Plan interface doc stated `config.public.apiUrl = "http://localhost:3000"` but the actual value is `/api/v1` (Nuxt proxy prefix). Using it would produce a broken href like `/api/v1/admin/queues?token=...` pointing to the Nuxt proxy, not the backend Express route.
- **Fix:** Added `backendUrl: process.env.NUXT_PUBLIC_BACKEND_URL || 'http://localhost:3000'` to `runtimeConfig.public`. Used `config.public.backendUrl` in the href.
- **Files modified:** `frontend/nuxt.config.ts`
- **Verification:** Grep confirms href contains `config.public.backendUrl`
- **Committed in:** cb8e3ef (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in plan's interface assumption)
**Impact on plan:** Necessary correction — using apiUrl would have produced a broken link. No scope creep.

## Issues Encountered

None beyond the runtimeConfig key correction above.

## User Setup Required

If deploying to production, set `NUXT_PUBLIC_BACKEND_URL` to the public backend URL (e.g., `https://api.kovia.app`). Defaults to `http://localhost:3000` for local development.

## Known Stubs

None.

## Threat Flags

No new security surface beyond what is documented in the plan's threat model (T-7-08 through T-7-10).

## Next Phase Readiness

- Human checkpoint (Task 2) is pending — Carlos must verify Bull Board UI loads at `/admin/queues` with valid PLATFORM_ADMIN token, all 4 queues visible, and 401/403 guards working.
- Once checkpoint approved, phase 07 is complete.

## Self-Check: PASSED

- `frontend/app/layouts/admin.vue` — FOUND (modified)
- `frontend/i18n/locales/es-SV.json` — FOUND (modified)
- `frontend/nuxt.config.ts` — FOUND (modified)
- Commit `cb8e3ef` — FOUND

---
*Phase: 07-bull-board-queue-observability*
*Completed: 2026-04-22*
