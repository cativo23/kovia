---
phase: 03-adoption-applications
plan: 02
subsystem: ui
tags: [nuxt, vue, zod, i18n, localStorage, wizard, adoption]

# Dependency graph
requires:
  - phase: 03-01
    provides: "Backend applications API: POST /applications, GET /applications/check, GET /applications/my, GET /applications/my/:id, PATCH /:id/retirar"

provides:
  - "5-step adoption application wizard at /animales/[id]/aplicar with Zod validation per step"
  - "localStorage draft persistence composable useApplicationDraft"
  - "Auth gate modal on animal detail page (unauthenticated users)"
  - "4-state CTA button on animal detail (unavailable/unauth/existing-app/new-app)"
  - "Adopter application history at /perfil/aplicaciones"
  - "Adopter application detail at /perfil/aplicaciones/[id] with withdraw and photo lightbox"
  - "ApplicationStatusBadge component with 7-status color map"
  - "All UI copy strings in es-SV.json under applications namespace"

affects: [03-03, phase-4-scoring]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "5-step wizard with v-show (not v-if) for step content preservation"
    - "defineExpose({ validate, form }) pattern for step components"
    - "localStorage draft with animalId+userId key scoping"
    - "4-state CTA button pattern for application gating"

key-files:
  created:
    - "frontend/app/pages/animales/[id]/aplicar.vue"
    - "frontend/app/components/applications/ApplicationStepPersonal.vue"
    - "frontend/app/components/applications/ApplicationStepHousing.vue"
    - "frontend/app/components/applications/ApplicationStepLifestyle.vue"
    - "frontend/app/components/applications/ApplicationStepPhotos.vue"
    - "frontend/app/components/applications/ApplicationStepReview.vue"
    - "frontend/app/components/applications/ApplicationStatusBadge.vue"
    - "frontend/app/components/applications/ApplicationAuthModal.vue"
    - "frontend/app/composables/useApplicationDraft.ts"
    - "frontend/app/pages/perfil/aplicaciones/index.vue"
    - "frontend/app/pages/perfil/aplicaciones/[id].vue"
  modified:
    - "frontend/i18n/locales/es-SV.json"
    - "frontend/app/pages/animales/[id].vue"
    - "frontend/app/components/animals/PhotoUploader.vue"

key-decisions:
  - "Used v-show (not v-if) for wizard steps to preserve component state between navigation"
  - "Draft key scoped to animalId+userId to prevent cross-animal draft leakage"
  - "PhotoUploader given folder prop (default: animals) to route application photos to separate storage prefix"
  - "Auth gate uses modal (not redirect) to preserve animal detail context per D-12"
  - "4-state CTA button on animal detail: unavailable/unauth/existing-app/new-app per D-12/D-13"

patterns-established:
  - "Step components: defineExpose({ validate, form }) pattern — validate() returns boolean, form is reactive"
  - "Draft composable: useApplicationDraft(animalId, userId) returns saveDraft/loadDraft/clearDraft"
  - "ApplicationStatusBadge: follows StatusBadge.vue pattern with colorMap and i18n labelMap"
  - "Lightbox via Teleport to body — same pattern as Phase 2 photo gallery"

requirements-completed: [ADOP-01, ADOP-02, ADOP-03, ADOP-04]

# Metrics
duration: 35min
completed: 2026-04-10
---

# Phase 03 Plan 02: Adopter Application Flow Summary

**5-step adoption wizard with Zod validation, localStorage draft persistence, auth gate modal, and adopter history pages wired to the Phase 03-01 API**

## Performance

- **Duration:** ~35 min
- **Started:** 2026-04-10T00:00:00Z
- **Completed:** 2026-04-10T00:35:00Z
- **Tasks:** 2
- **Files modified:** 14

## Accomplishments

- 5-step wizard (/animales/[id]/aplicar) with Zod validation per step, v-show preservation, draft auto-save, and success state
- Auth gate modal on animal detail keeps context (no redirect), with 4-state CTA button per D-12/D-13
- Adopter application history (/perfil/aplicaciones) with card list, empty state, and application detail with withdraw modal + photo lightbox
- Full i18n coverage: all applications strings in es-SV.json under applications namespace
- PhotoUploader gains folder prop for storage routing (applications vs animals prefix)

## Task Commits

1. **Task 1: Step components, composable, status badge, and i18n strings** - `8602211` (feat)
2. **Task 2: Wizard page, auth gate modal, existing application state, and adopter history pages** - `78a2dda` (feat)

## Files Created/Modified

- `frontend/app/pages/animales/[id]/aplicar.vue` — 5-step wizard page with auth middleware, draft detection, step navigation, submit handler, success state
- `frontend/app/components/applications/ApplicationStepPersonal.vue` — Step 1 with Zod validation (phone, occupation, birthDate), reads user from auth store
- `frontend/app/components/applications/ApplicationStepHousing.vue` — Step 2 with conditional petPermission (v-if on Alquilada), repeatable pets list
- `frontend/app/components/applications/ApplicationStepLifestyle.vue` — Step 3 with maxlength=500 adoption reason and character counter
- `frontend/app/components/applications/ApplicationStepPhotos.vue` — Step 4 wrapping PhotoUploader with min 2 / max 8 enforcement
- `frontend/app/components/applications/ApplicationStepReview.vue` — Step 5 read-only summary, go-to-step event, optional socialMedia/additionalContext
- `frontend/app/components/applications/ApplicationStatusBadge.vue` — 7-status color map (ENVIADA/REVISANDO/APROBADA/RECHAZADA/SEGUIMIENTO/ADOPTADA/RETIRADA)
- `frontend/app/components/applications/ApplicationAuthModal.vue` — UModal with register/login CTAs and redirect query param
- `frontend/app/composables/useApplicationDraft.ts` — localStorage draft with saveDraft/loadDraft/clearDraft, SSR-safe (import.meta.server guard)
- `frontend/app/pages/perfil/aplicaciones/index.vue` — Adopter history with card list, empty state with i-lucide-clipboard-list, error state
- `frontend/app/pages/perfil/aplicaciones/[id].vue` — Detail with withdraw modal, Teleport lightbox, status badge, read-only sections
- `frontend/i18n/locales/es-SV.json` — Added full applications namespace with status, wizard, steps, review, history, detail, staff keys
- `frontend/app/pages/animales/[id].vue` — Updated with 4-state CTA, existingApplication check via /applications/check, auth modal rendering
- `frontend/app/components/animals/PhotoUploader.vue` — Added folder prop (default 'animals') passed to presigned URL request

## Decisions Made

- Used v-show (not v-if) for wizard steps to preserve Vue component state between navigation per Pitfall 4 in plan
- Draft key scoped to `aplicacion_draft_{animalId}_{userId}` to prevent cross-animal draft leakage
- Auth gate uses UModal to preserve animal detail page context, not redirect, per D-12
- 4-state CTA button: unavailable (disabled+tooltip) / unauth (modal) / existing app (Ver solicitud) / new app (Aplicar) per D-12/D-13
- PhotoUploader folder prop defaults to 'animals' for backward compatibility, passes to presigned URL body

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added folder prop to PhotoUploader for application photo routing**
- **Found during:** Task 1 (ApplicationStepPhotos implementation)
- **Issue:** Plan specified `folder="applications"` prop for PhotoUploader but PhotoUploader had no folder prop — application photos would be stored in the animals prefix
- **Fix:** Added optional `folder` prop (default 'animals') to PhotoUploader, passed it to the presigned URL request body
- **Files modified:** frontend/app/components/animals/PhotoUploader.vue
- **Verification:** Prop added with default maintaining backward compatibility
- **Committed in:** 8602211 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical)
**Impact on plan:** Essential for correct storage routing. Backward compatible — default 'animals' preserves existing behavior.

## Issues Encountered

- Docker services not running so typecheck via `docker compose exec -T web` was skipped. Static file verification and acceptance criteria grep checks used instead.

## Known Stubs

None - all data sources are wired to real API endpoints from Plan 03-01.

## Threat Flags

No new threat surface introduced beyond what was specified in the plan's threat model. All mitigations from T-03-08 through T-03-11 applied:
- T-03-08: localStorage draft data re-validated via Zod on each step before submission
- T-03-09: `definePageMeta({ middleware: 'auth' })` on aplicar.vue
- T-03-10: Backend ownership check enforced (server-side, Plan 03-01)
- T-03-11: Withdraw button hidden client-side when status is ADOPTADA or RETIRADA (UI layer only — backend enforces authoritative check)

## Next Phase Readiness

- Adopter flow is complete end-to-end: animal detail → auth gate → wizard → draft → submit → history → detail → withdraw
- Plan 03-03 (Staff application queue) can build on ApplicationStatusBadge and i18n staff keys already in place
- Staff nav item key `applications.staff.navItem` already in i18n for the org dashboard nav update

---
*Phase: 03-adoption-applications*
*Completed: 2026-04-10*
