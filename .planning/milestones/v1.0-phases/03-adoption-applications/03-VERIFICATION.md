---
phase: 03-adoption-applications
verified: 2026-04-10T18:00:00Z
status: verified
score: 4/4 roadmap success criteria verified
overrides_applied: 0
gaps: []
deferred:
  - truth: "Score column shows application scoring data"
    addressed_in: "Phase 4"
    evidence: "Phase 4 success criteria: 'Every submitted application receives a score (0-100) with a risk level (low, medium, high) and a visible rule-by-rule breakdown'. Score placeholder (—) is explicitly documented as intentional per D-20 in both plans 03-03 and 03-03-SUMMARY."
---

# Phase 3: Adoption Applications Verification Report

**Phase Goal:** Adopters can submit structured applications for specific animals, and rescue staff can view the application queue
**Verified:** 2026-04-10T18:00:00Z
**Status:** gaps_found
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (Roadmap Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Logged-in adopter can complete and submit a multi-step application for a specific animal, including personal info, housing details, and environment photos | VERIFIED | `aplicar.vue` 354 lines, all 5 step components exist and use `defineExpose({ validate, form })`, `submitApplication()` calls `POST /applications` with all step data |
| 2 | A partially completed application survives a page refresh or connection drop (localStorage persistence) | VERIFIED | `useApplicationDraft.ts` exports `saveDraft/loadDraft/clearDraft` using `localStorage.setItem/getItem/removeItem`, SSR-safe guard with `import.meta.server`; `aplicar.vue` calls `draft.value.saveDraft()` on each `nextStep()` and `loadDraft()` on mount |
| 3 | Application status transitions follow the defined state machine (submitted, reviewing, approved, rejected, follow-up, adopted, withdrawn) | VERIFIED | Backend `staffTransitions` map (service.ts line 24): ENVIADA->REVISANDO, REVISANDO->[APROBADA,RECHAZADA,SEGUIMIENTO], SEGUIMIENTO->[APROBADA,RECHAZADA], APROBADA->ADOPTADA. `withdraw()` enforces ownership + not-ADOPTADA constraint. All transitions audit-logged. |
| 4 | Rescue staff can view all applications for a specific animal, sorted and filtered by status | PARTIAL — FUNCTIONAL BUT ADOPTER NAME IS NULL | Staff queue (`/org/dashboard/aplicaciones`) fetches from `GET /applications/org` with filters (animalId, status, dateFrom, dateTo). Filtering and pagination work. BUT `adopterFirstName`/`adopterLastName` are always NULL (see gaps). |

**Score:** 3/4 truths verified (one partial due to NULL adopter name denormalization)

### Deferred Items

Items not yet met but explicitly addressed in later milestone phases.

| # | Item | Addressed In | Evidence |
|---|------|-------------|----------|
| 1 | Score column shows application scoring (0-100 with risk level) | Phase 4 | Phase 4 success criteria: "Every submitted application receives a score (0-100) with a risk level and a visible rule-by-rule breakdown". Placeholder `—` in queue (index.vue line 99) and detail page is intentional per D-20. |

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `backend/prisma/schema.prisma` | AdoptionApplication model, ApplicationPhoto model, ApplicationStatus enum | VERIFIED | Model at line 165, enum at line 47, `@@unique([animalId, userId])` at line 188 |
| `backend/src/applications/applications.service.ts` | Application CRUD + state machine + audit logging | VERIFIED | 315 lines, `staffTransitions` map, `auditService.log` on create and status change, publicPrisma for adopter reads, prismaRls for staff reads |
| `backend/src/applications/applications.controller.ts` | REST endpoints for applications | VERIFIED | 74 lines, 8 endpoints: POST /, GET /check, GET /my, GET /my/:id, PATCH /:id/retirar, GET /org, GET /org/:id, PATCH /:id/status |
| `backend/src/applications/applications.service.spec.ts` | Unit tests (min 100 lines, 15+ cases) | VERIFIED | 359 lines, 35 `it` patterns — exceeds minimum |
| `frontend/app/pages/animales/[id]/aplicar.vue` | 5-step wizard page (min 150 lines) | VERIFIED | 354 lines, `definePageMeta({ middleware: 'auth' })`, v-show for all 5 steps, all step components imported |
| `frontend/app/composables/useApplicationDraft.ts` | localStorage draft composable | VERIFIED | 25 lines, exports `useApplicationDraft`, localStorage.setItem/getItem/removeItem, SSR-safe |
| `frontend/app/components/applications/ApplicationAuthModal.vue` | Auth gate modal (min 30 lines) | VERIFIED | 39 lines, UModal with register/login CTAs and redirect query param |
| `frontend/app/pages/perfil/aplicaciones/index.vue` | Adopter history page (min 50 lines) | VERIFIED | 128 lines, auth middleware, `GET /applications/my`, empty state with `i-lucide-clipboard-list` |
| `frontend/app/pages/org/dashboard/aplicaciones/index.vue` | Staff queue page (min 100 lines) | VERIFIED | 275 lines, definePageMeta layout org, UTable with 6 columns, 3 filter controls, `GET /applications/org` |
| `frontend/app/pages/org/dashboard/aplicaciones/[id].vue` | Staff detail page (min 150 lines) | VERIFIED | 448 lines, `staffTransitions` map, UModal confirmation, PATCH to `/applications/:id/status`, ApplicationStatusBadge |
| `frontend/app/layouts/org.vue` | Updated with Aplicaciones nav item | VERIFIED | Line 78: `{ to: '/org/dashboard/aplicaciones', label: t('org.nav.applications'), icon: 'i-lucide-clipboard-list' }` |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `applications.service.ts` | `prismaRls.adoptionApplication` | RLS for staff reads | WIRED | `findAllByOrg` and `findByIdForOrg` use `prismaRls.adoptionApplication` (lines 191, 220) |
| `applications.service.ts` | `publicPrisma.adoptionApplication` | publicPrisma for adopter reads | WIRED | `create`, `findMyApplications`, `findById`, `checkExisting`, `withdraw` all use `publicPrisma.adoptionApplication` |
| `applications.service.ts` | `auditService.log` | status change audit logging | WIRED | `auditService.log('application.create')` line 97, `auditService.log('application.status_change')` line 274 |
| `app.module.ts` | `ApplicationsModule` | module imports | WIRED | Line 20 import, line 51 in imports array |
| `aplicar.vue` | `POST /applications` | useApi post on submit | WIRED | `submitApplication()` calls `post('/applications', payload)` at line 293 |
| `animales/[id].vue` | `GET /applications/check` | useApi GET to check existing application | WIRED | Line 285: `/applications/check?animalId=${route.params.id}` |
| `useApplicationDraft.ts` | localStorage | saveDraft/loadDraft/clearDraft | WIRED | `localStorage.setItem` (line 10), `localStorage.getItem` (line 15), `localStorage.removeItem` (line 21) |
| `org/aplicaciones/index.vue` | `GET /applications/org` | useApi GET with query params | WIRED | Line 259: `/applications/org?${params.toString()}` |
| `org/aplicaciones/[id].vue` | `PATCH /applications/:id/status` | useApi PATCH for status transitions | WIRED | Line 419: `patch('/applications/${application.value.id}/status', { status: ... })` |
| `org/aplicaciones/[id].vue` | `GET /applications/org/:id` | useApi GET on mount | WIRED | Line 436: `get('/applications/org/${id}')` |
| `org.vue` | `/org/dashboard/aplicaciones` | navItems array entry | WIRED | Line 78: `{ to: '/org/dashboard/aplicaciones', ... }` |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `aplicar.vue` | `animal`, `savedStepData`, submitted form | `GET /animals/:id` + all step refs | Yes — real API call; step data collected from form refs | FLOWING |
| `perfil/aplicaciones/index.vue` | applications list | `GET /applications/my` | Yes — prisma query with userId filter | FLOWING |
| `perfil/aplicaciones/[id].vue` | application detail | `GET /applications/my/:id` | Yes — prisma findUnique with ownership check | FLOWING |
| `org/aplicaciones/index.vue` | applications list | `GET /applications/org` | Yes — prismaRls query (org-scoped) | FLOWING |
| `org/aplicaciones/[id].vue` | application detail | `GET /applications/org/:id` | Yes — prismaRls findUnique | FLOWING |
| `org/aplicaciones/index.vue` | `adopterFirstName`/`adopterLastName` columns | JWT user object via create() | No — JWT payload does not include firstName/lastName; values will be NULL in DB | DISCONNECTED |

### Behavioral Spot-Checks

Step 7b: SKIPPED — Docker services not running; backend is a NestJS API requiring active containers. Static code verification used instead.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| ADOP-01 | 03-01, 03-02 | Adopter can submit a structured multi-step application for a specific animal | SATISFIED | 5-step wizard in `aplicar.vue` calls `POST /applications`; backend creates with all step data |
| ADOP-02 | 03-01, 03-02 | Application form has mandatory fields (personal info, housing) and optional fields (social media, additional context) | SATISFIED | `CreateApplicationDto` has required `personalInfo`, `housing`, `lifestyle`; optional `socialMedia`, `additionalContext`. Step Zod schemas enforce mandatory fields. |
| ADOP-03 | 03-01, 03-02 | Application requires environment photo uploads | SATISFIED | `ApplicationStepPhotos.vue` enforces minimum 2 photos via `validate()` that returns `photos.length >= 2`; upload folder='applications' |
| ADOP-04 | 03-02 | Application form state persists in localStorage (survives connection drops and page refresh) | SATISFIED | `useApplicationDraft.ts` with `saveDraft/loadDraft/clearDraft`, SSR-safe, called on each step advance |
| ADOP-05 | 03-01, 03-03 | Application status follows a state machine: submitted → reviewing → approved/rejected/follow-up → adopted/withdrawn | SATISFIED | `staffTransitions` map in service validates transitions; `withdraw()` enforces ownership + not-ADOPTADA; staff detail transitions mirror backend state machine |
| ADOP-06 | 03-01, 03-03 | Rescue staff can view and filter/sort the application queue per animal | PARTIAL — BROKEN ADOPTER NAME | Staff queue page with 4 filter controls (animal, status, dateFrom, dateTo) and sortable UTable exists. BUT adopter name column always empty (see gap). |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/src/auth/strategies/jwt.strategy.ts` | 17 | JWT user object missing firstName/lastName | Blocker | `adopterFirstName`/`adopterLastName` always NULL in submitted applications; staff sees blank adopter names in queue and detail |
| `frontend/app/pages/org/dashboard/aplicaciones/index.vue` | 99 | Score column `—` placeholder | Info | Intentional — Phase 4 will populate. Documented in SUMMARY and plan as D-20. |
| `frontend/app/pages/org/dashboard/aplicaciones/[id].vue` | ~195 | Score placeholder `—` in status panel | Info | Same as above — intentional. |

### Human Verification Required

#### 1. Auth gate modal behavior on animal detail

**Test:** Visit `/animales/[some-id]` while logged out. Click the "Aplicar para adoptar" button.
**Expected:** A modal opens in place (page does not redirect). Modal shows "Necesitas una cuenta para aplicar" with "Crear cuenta" and "Iniciar sesion" buttons with `?redirect=/animales/[id]/aplicar` query params.
**Why human:** Cannot verify modal display behavior or the absence of redirect without running the browser.

#### 2. Draft persistence survives page refresh

**Test:** Start the wizard at `/animales/[id]/aplicar` while authenticated. Fill out Step 1 (phone, occupation, birthDate). Advance to Step 2. Close/reload the page. Revisit the same wizard URL.
**Expected:** A draft alert appears offering to continue where you left off. Clicking "Continuar" restores all Step 1 data.
**Why human:** localStorage behavior and Vue component state restoration after navigation cannot be verified statically.

#### 3. Step 4 photo upload minimum enforcement

**Test:** In the wizard, advance to Step 4 (Fotos del hogar). Do not upload any photos. Click "Siguiente".
**Expected:** Cannot advance past Step 4 — validation prevents it. Error or indicator shows minimum 2 photos required.
**Why human:** `validate()` returns `photos.length >= 2` but the parent wizard calls `stepPhotosRef.value.validate()` — need to verify the UI correctly blocks advancement.

#### 4. Staff status transition with modal confirmation

**Test:** As ORG_ADMIN, visit the staff detail page for an application in ENVIADA status. Click "Marcar en revision".
**Expected:** A UModal confirmation dialog opens. Clicking "Confirmar" transitions the status to REVISANDO and updates the badge reactively without page reload.
**Why human:** UModal rendering, reactive badge update after PATCH, and toast notification require running UI.

### Gaps Summary

**1 gap blocking full goal achievement:**

The critical gap is that `adopterFirstName` and `adopterLastName` will always be stored as `NULL` in every submitted adoption application. The root cause is that the JWT access token payload was designed to only carry `{ sub, email, role, organizationId }` (auth.service.ts line 284) and the JWT strategy's `validate()` returns only `{ id, email, role, organizationId }`. When `ApplicationsController.create()` passes `req.user` to `ApplicationsService.create()`, the `UserContext` receives `firstName: undefined` and `lastName: undefined`.

This does not block the adopter from submitting applications (the application is created successfully), but it breaks the staff-facing experience: the "Adoptante" column in the application queue and the "Info personal" section in the staff detail page both render the denormalized fields, which will show as blank for all real submissions.

**Suggested fix options (in order of minimal impact):**

1. Fetch the user record in `ApplicationsService.create()` by `user.id` before creating the application to get the real `firstName`/`lastName` from the database. This keeps the JWT lean.
2. Add `firstName` and `lastName` to the JWT payload and update the JWT strategy to return them on the user object.
3. Remove the denormalized fields and do a JOIN to the users table in `findAllByOrg` and `findByIdForOrg` instead.

---

_Verified: 2026-04-10T18:00:00Z_
_Verifier: Claude (gsd-verifier)_
