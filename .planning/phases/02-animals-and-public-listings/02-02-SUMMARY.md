---
phase: 02-animals-and-public-listings
plan: 02
subsystem: ui, frontend
tags: [nuxt, vue, nuxt-ui, i18n, photo-upload, presigned-url, drag-drop, wizard, dashboard]

# Dependency graph
requires:
  - phase: 02-animals-and-public-listings
    plan: 01
    provides: Animals CRUD API, upload presigned URL endpoint, species API, animal status lifecycle
  - phase: 01-foundation
    provides: Auth store (isOrgAdmin), useApi composable, admin layout pattern, i18n setup
provides:
  - Org dashboard layout with sidebar navigation
  - Org middleware protecting /org/dashboard/* routes
  - Dashboard home with stats cards from API
  - Animal list page with status filter, search, pagination, action dropdown
  - Multi-step creation wizard (basic info -> characteristics -> photos)
  - AnimalForm reusable component for create/edit
  - PhotoUploader with drag-and-drop, client-side resize, presigned URL upload
  - Animal edit page with immediate photo operations
  - StatusBadge and StatsCards reusable components
  - Spanish i18n keys for entire animals namespace
affects: [02-03-public-listings, 03-adoption-applications]

# Tech tracking
tech-stack:
  added: []
  patterns: [multi-step-wizard, drag-drop-upload, presigned-url-client-flow, client-side-image-resize]

key-files:
  created:
    - frontend/app/layouts/org.vue
    - frontend/app/middleware/org.ts
    - frontend/app/pages/org/dashboard/index.vue
    - frontend/app/pages/org/dashboard/animales/index.vue
    - frontend/app/pages/org/dashboard/animales/nuevo.vue
    - frontend/app/pages/org/dashboard/animales/[id]/editar.vue
    - frontend/app/components/animals/AnimalForm.vue
    - frontend/app/components/animals/PhotoUploader.vue
    - frontend/app/components/animals/StatusBadge.vue
    - frontend/app/components/animals/StatsCards.vue
    - frontend/tests/unit/components/animals/StatusBadge.spec.ts
  modified:
    - frontend/i18n/locales/es-SV.json
    - frontend/vitest.config.ts
    - frontend/tests/setup.ts

key-decisions:
  - "Org layout clones admin layout pattern with org-specific nav items (Dashboard, Animales, Perfil)"
  - "AnimalForm uses composition API expose (validate, form) for wizard step control instead of full form per step"
  - "PhotoUploader resizes images client-side to max 1200px before upload to reduce bandwidth"
  - "Photo upload uses presigned URL pattern: POST /upload/presigned-url -> PUT to MinIO directly"
  - "Wizard stores form data in parent reactive object, passing between steps via initialData prop"
  - "Edit page photo operations are immediate (not batched) for better UX -- each add/remove/cover/reorder hits API"

patterns-established:
  - "Multi-step wizard: shared reactive state + per-step validation via exposed validate method"
  - "Photo upload flow: resize -> presigned URL -> direct PUT -> save photo record"
  - "Org dashboard layout: sidebar nav + header + slot, matching admin layout structure"
  - "StatusBadge: status-to-color/label mapping via config object pattern"

requirements-completed: [ANIM-01, ANIM-02, ANIM-03, ANIM-04, DASH-01]

# Metrics
duration: 8min
completed: 2026-04-10
---

# Phase 02 Plan 02: Org Dashboard Frontend Summary

**Org dashboard with sidebar layout, animal CRUD table, multi-step creation wizard with drag-and-drop photo upload, and edit page with immediate photo management**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-10T01:34:37Z
- **Completed:** 2026-04-10T01:43:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments
- Org dashboard layout with sidebar navigation (Dashboard, Animales, Perfil) and org middleware
- Dashboard home page with 4 stats cards (total, available, in process, adopted) from API
- Animal list page with status filter tabs, search, pagination, and full action dropdown (edit, status change, archive, restore, delete)
- Multi-step creation wizard (3 steps: basic info, characteristics, photos) with per-step validation
- PhotoUploader with drag-and-drop, client-side image resize, presigned URL upload to MinIO, cover photo selection
- Animal edit page with all form fields and immediate photo operations (add, remove, cover, reorder)
- StatusBadge component with 5 passing unit tests
- 80+ Spanish i18n keys for the animals namespace

## Task Commits

Each task was committed atomically:

1. **Task 1: Org layout, middleware, dashboard home with stats, and animal list page** - `cca1992` (feat)
2. **Task 2: Animal creation wizard, photo uploader, and edit page** - `18ccfa9` (feat)

## Files Created/Modified
- `frontend/app/layouts/org.vue` - Org dashboard layout with sidebar + header + slot
- `frontend/app/middleware/org.ts` - Named middleware checking isAuthenticated + isOrgAdmin
- `frontend/app/pages/org/dashboard/index.vue` - Dashboard home with stats cards and quick links
- `frontend/app/pages/org/dashboard/animales/index.vue` - Animal list with filters, search, pagination, action dropdown
- `frontend/app/pages/org/dashboard/animales/nuevo.vue` - 3-step creation wizard with progress indicator
- `frontend/app/pages/org/dashboard/animales/[id]/editar.vue` - Edit page with form + photo management
- `frontend/app/components/animals/AnimalForm.vue` - Reusable form with basic info + characteristics sections
- `frontend/app/components/animals/PhotoUploader.vue` - Drag-and-drop upload with resize, presigned URL, cover selection
- `frontend/app/components/animals/StatusBadge.vue` - Status-to-color badge component
- `frontend/app/components/animals/StatsCards.vue` - 4-card stats grid with skeleton loading
- `frontend/tests/unit/components/animals/StatusBadge.spec.ts` - 5 unit tests for StatusBadge
- `frontend/i18n/locales/es-SV.json` - Added animals.* and org.* i18n keys
- `frontend/vitest.config.ts` - Added @vitejs/plugin-vue for component test SFC compilation
- `frontend/tests/setup.ts` - Added Vue auto-import stubs (computed, ref, etc.) and definePageMeta stub

## Decisions Made
- Org layout clones admin layout pattern with org-specific nav items to maintain visual consistency
- AnimalForm exposes validate/form via defineExpose for wizard step control (avoids duplicating form state)
- Photo upload resizes to max 1200px client-side using canvas API before uploading (reduces bandwidth)
- Edit page photo operations are immediate (not batched) for real-time feedback
- Age input displayed as years + months pair but stored as total months (ageMonths) matching API
- Wizard form data stored in parent reactive object to persist across step navigation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added @vitejs/plugin-vue to vitest config**
- **Found during:** Task 1 (StatusBadge unit test)
- **Issue:** Vitest could not parse .vue SFC files -- "Install @vitejs/plugin-vue to handle .vue files"
- **Fix:** Added vue() plugin to vitest.config.ts (already available as transitive dependency)
- **Files modified:** frontend/vitest.config.ts
- **Verification:** StatusBadge tests pass (5/5)
- **Committed in:** cca1992 (Task 1 commit)

**2. [Rule 3 - Blocking] Added Vue auto-import stubs to test setup**
- **Found during:** Task 1 (StatusBadge unit test)
- **Issue:** `computed is not defined` in component tests -- Nuxt auto-imports not available in vitest
- **Fix:** Stubbed Vue functions (computed, ref, reactive, watch, onMounted, etc.) as globals in tests/setup.ts
- **Files modified:** frontend/tests/setup.ts
- **Verification:** All component tests pass
- **Committed in:** cca1992 (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 blocking)
**Impact on plan:** Both fixes were necessary infrastructure for running Vue component tests. No scope creep.

## Issues Encountered
- Pre-existing admin middleware test failure (expects `navigateTo('/')` but middleware sends `navigateTo({ path: '/', query: { denied: '1' } })`). Not caused by this plan's changes -- logged as deferred item.

## User Setup Required

None - all infrastructure (MinIO, API) was set up in Plan 01.

## Next Phase Readiness
- Org dashboard fully functional for animal management
- Ready for public listings frontend (Plan 03) which will use the same StatusBadge and animal data structures
- Ready for adoption applications (Phase 03) which will link from public animal detail pages

## Self-Check: PASSED

- All 11 created files verified on disk
- Commit cca1992 verified in git log
- Commit 18ccfa9 verified in git log
- 5/5 StatusBadge unit tests passing
- No new TypeScript errors introduced (pre-existing errors only)

---
*Phase: 02-animals-and-public-listings*
*Completed: 2026-04-10*
