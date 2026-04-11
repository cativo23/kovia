---
phase: 03-adoption-applications
plan: "03"
subsystem: frontend-staff-applications
tags: [vue, nuxt, staff-dashboard, applications, state-machine]
dependency_graph:
  requires: [03-01]
  provides: [staff-application-queue, staff-application-detail, org-nav-aplicaciones]
  affects: [frontend/app/layouts/org.vue, frontend/i18n/locales/es-SV.json]
tech_stack:
  added: []
  patterns: [UTable-slot-templates, UModal-confirmation, Teleport-lightbox, reactive-status-update]
key_files:
  created:
    - frontend/app/pages/org/dashboard/aplicaciones/index.vue
    - frontend/app/pages/org/dashboard/aplicaciones/[id].vue
    - frontend/app/components/applications/ApplicationStatusBadge.vue
  modified:
    - frontend/app/layouts/org.vue
    - frontend/i18n/locales/es-SV.json
decisions:
  - ApplicationStatusBadge created in plan 03 (not 02) since both wave-2 plans run in parallel; badge is a shared component used by both
  - UTable @select event removed in favor of explicit UButton link in actions column to avoid type mismatch with Nuxt UI v3 event signature
  - Score column renders static placeholder (—) per D-20; Phase 4 will populate with scoring algorithm
metrics:
  duration_minutes: 25
  completed_date: "2026-04-10"
  tasks_completed: 2
  files_created: 3
  files_modified: 2
requirements_fulfilled: [ADOP-05, ADOP-06]
---

# Phase 03 Plan 03: Staff Application Queue and Detail Pages Summary

Staff-facing application management UI: filterable queue table in org dashboard and full detail view with state machine transition controls, modal confirmations, and org layout nav update.

## What Was Built

### Task 1: Staff Application Queue Page + Org Layout Nav Update

**`frontend/app/pages/org/dashboard/aplicaciones/index.vue`**
- `definePageMeta({ layout: 'org', middleware: ['auth', 'org'] })`
- Header with "Solicitudes" heading
- Filter row with 3 controls: animal USelectMenu (searchable, populated from GET /animals/org), status USelectMenu (7 statuses), date range pair of UInput[type=date]
- Debounced filter change (300ms) triggers page=1 refetch
- UCard wrapping UTable with 6 columns: adopter (name), animal (thumbnail + name), submittedAt (formatted date), score (— placeholder with text-gray-400 italic), status (ApplicationStatusBadge), actions (Ver detalle UButton link)
- Empty state with i-lucide-clipboard-list icon per D-20
- UPagination below table
- Fetches from `/applications/org` with query params

**`frontend/app/layouts/org.vue`** — Added Aplicaciones nav item:
```typescript
{ to: '/org/dashboard/aplicaciones', label: t('org.nav.applications'), icon: 'i-lucide-clipboard-list' }
```

**`frontend/app/components/applications/ApplicationStatusBadge.vue`**
- Badge component for all 7 ApplicationStatus values (ENVIADA, REVISANDO, APROBADA, RECHAZADA, SEGUIMIENTO, ADOPTADA, RETIRADA)
- Color mapping: info/warning/success/error/neutral per status
- `size` prop typed to UBadge union `'xs' | 'sm' | 'md' | 'lg' | 'xl'`

**`frontend/i18n/locales/es-SV.json`** — Added `applications.*` keys: status labels, queue UI strings, detail labels, transition labels.

### Task 2: Staff Application Detail Page

**`frontend/app/pages/org/dashboard/aplicaciones/[id].vue`**
- `definePageMeta({ layout: 'org', middleware: ['auth', 'org'] })`
- Back link to `/org/dashboard/aplicaciones`
- Two-column layout: `grid grid-cols-1 md:grid-cols-3 gap-6`
- **Left column (md:col-span-2):** 5 UCard sections
  1. Info personal (name, email, phone, occupation, birthDate)
  2. Vivienda y convivencia (housingType, ownership, petPermission, exteriorSpace, adults, children, currentPets)
  3. Experiencia y estilo de vida (speciesExperience, previousPets, hoursAlone, activityLevel, adoptionReason)
  4. Fotos del hogar (2-column photo grid with Teleport lightbox click-to-enlarge)
  5. Informacion adicional (socialMedia link + additionalContext, shown only if present)
- **Right column (md:col-span-1):** 2 UCard panels
  1. Status panel: ApplicationStatusBadge, score placeholder (— gray/italic), transition buttons
  2. Animal summary: thumbnail, name linked to public animal page, species, AnimalsStatusBadge
- `staffTransitions` map with keys ENVIADA, REVISANDO, SEGUIMIENTO, APROBADA
- All transitions open UModal confirmation before PATCH call
- On success: `application.value.status` updated reactively (no full refetch), success toast shown
- Error handling: 404 → redirect to queue with error toast
- Fetches from `/applications/org/${id}`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed UTable @select event type mismatch**
- **Found during:** Task 1 typecheck
- **Issue:** `@select` event handler typed as `(row: { original })` but Nuxt UI v3 UTable emits `(event: Event, row: TableRow)` — type incompatibility
- **Fix:** Removed `@select` handler; navigation handled exclusively by "Ver detalle" UButton link in actions column (already present per spec)
- **Files modified:** `frontend/app/pages/org/dashboard/aplicaciones/index.vue`
- **Commit:** a7160b8

**2. [Rule 2 - Missing functionality] Created ApplicationStatusBadge in plan 03**
- **Found during:** Task 1 implementation
- **Issue:** Plan 02 (parallel wave-2 sibling) is responsible for creating `ApplicationStatusBadge.vue`, but both plans run concurrently — plan 03 would fail typecheck without the component
- **Fix:** Created `ApplicationStatusBadge.vue` in this plan. Plan 02 may also create it; merge resolution will keep one version. Size prop typed correctly as union to avoid TS2322.
- **Files modified:** `frontend/app/components/applications/ApplicationStatusBadge.vue`
- **Commit:** a7160b8

**3. [Rule 1 - Bug] Fixed ApplicationStatusBadge size prop type**
- **Found during:** Task 2 typecheck
- **Issue:** `size?: string` too broad — UBadge expects specific union `'xs' | 'sm' | 'md' | 'lg' | 'xl'`
- **Fix:** Narrowed prop type to the correct union
- **Files modified:** `frontend/app/components/applications/ApplicationStatusBadge.vue`
- **Commit:** 7ea04ed

**4. [Rule 1 - Bug] Fixed lightbox image src possibly undefined**
- **Found during:** Task 2 typecheck
- **Issue:** `application.photos[lightboxIndex].url` flagged as TS2532 (object possibly undefined) despite v-if guard — Vue template type narrowing doesn't propagate through `application` ref
- **Fix:** Used `application?.photos?.[lightboxIndex]?.url` optional chaining
- **Files modified:** `frontend/app/pages/org/dashboard/aplicaciones/[id].vue`
- **Commit:** 7ea04ed

## Pre-existing Issues (Out of Scope)

The following typecheck errors existed before this plan and were not introduced by our changes:
- `app/composables/useApi.ts` — FetchOptions responseType mismatch
- `app/pages/admin/users.vue` — string/undefined type mismatch
- `app/plugins/api.ts` — Headers cast issue
- `nuxt.config.ts` — i18n `lazy` option unknown

Logged to deferred-items for future resolution.

## Known Stubs

| Stub | File | Line | Reason |
|------|------|------|--------|
| Score column `—` | `frontend/app/pages/org/dashboard/aplicaciones/index.vue` | ~75 | Phase 4 scoring algorithm not yet built; placeholder per D-20 |
| Score indicator `—` | `frontend/app/pages/org/dashboard/aplicaciones/[id].vue` | ~195 | Phase 4 scoring algorithm not yet built; placeholder per D-20 |

Both stubs are intentional per plan spec and do not prevent the plan's goal (application management) from being achieved.

## Threat Flags

None — all new endpoints consumed are backend-validated (RLS org scoping for GET /applications/org, @Roles guard for PATCH /status). Frontend transition map mirrors backend state machine but backend is authoritative.

## Commits

- `a7160b8` — feat(03-03): staff application queue page, nav update, ApplicationStatusBadge
- `7ea04ed` — feat(03-03): staff application detail page with status transitions and modal confirmation

## Self-Check: PASSED

- FOUND: frontend/app/pages/org/dashboard/aplicaciones/index.vue
- FOUND: frontend/app/pages/org/dashboard/aplicaciones/[id].vue
- FOUND: frontend/app/components/applications/ApplicationStatusBadge.vue
- FOUND commit: a7160b8
- FOUND commit: 7ea04ed
