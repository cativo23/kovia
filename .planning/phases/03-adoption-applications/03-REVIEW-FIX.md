---
phase: 03-adoption-applications
fixed_at: 2026-04-10T00:00:00Z
review_path: .planning/phases/03-adoption-applications/03-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 8
skipped: 1
status: partial
---

# Phase 03: Code Review Fix Report

**Fixed at:** 2026-04-10
**Source review:** .planning/phases/03-adoption-applications/03-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 9 (CR-01 through CR-04, WR-01 through WR-05)
- Fixed: 8
- Skipped: 1

## Fixed Issues

### CR-01: Duplicate top-level `"applications"` key in es-SV.json

**Files modified:** `frontend/i18n/locales/es-SV.json`
**Commit:** `103cac9`
**Applied fix:** Removed the first duplicate `"applications"` block (lines 443–513). Merged all its unique keys — `queue`, `transitions`, and org-specific `detail` sub-keys (`backToQueue`, `score`, `scorePlaceholder`, `statusPanel`, `animalSummary`, `phone`, `occupation`, `birthDate`, `housingType`, `ownership`, `petPermission`, `exteriorSpace`, `adults`, `children`, `currentPets`, `noPets`, `speciesExperience`, `previousPets`, `hoursAlone`, `activityLevel`, `adoptionReason`, `socialMedia`, `additionalContext`, `notFound`) — into the surviving second `"applications"` block. JSON validated with `node -e JSON.parse`.

---

### CR-02: Org detail page reads `housingInfo`/`lifestyleInfo` but API returns `housing`/`lifestyle`

**Files modified:** `frontend/app/pages/org/dashboard/aplicaciones/[id].vue`
**Commit:** `2630365`
**Applied fix:** Renamed `housingInfo` → `housing` and `lifestyleInfo` → `lifestyle` in the `Application` interface. Updated all template bindings (`application.housingInfo.*` → `application.housing.*`, `application.lifestyleInfo.*` → `application.lifestyle.*`). Also removed the boolean coercions on `petPermission` and `exteriorSpace` (which stored Spanish strings like `'Si'`/`'No'` and would incorrectly render `'No'` as "Si") — the raw string values are now rendered directly.

---

### CR-03: `useApplicationDraft.loadDraft()` unguarded `JSON.parse` crashes wizard on corrupt data

**Files modified:** `frontend/app/composables/useApplicationDraft.ts`
**Commit:** `e0a67df`
**Applied fix:** Wrapped `JSON.parse(raw)` in a `try/catch` block. On `SyntaxError`, the corrupted draft key is removed from `localStorage` and `null` is returned — matching the reviewer's suggested implementation exactly.

---

### CR-04: Adopter history list uses `app.createdAt` but API returns `submittedAt`

**Files modified:** `frontend/app/pages/perfil/aplicaciones/index.vue`
**Commit:** `91031be`
**Applied fix:** Renamed `createdAt: string` → `submittedAt: string` in the `ApplicationListItem` interface. Updated the template binding from `formatDate(app.createdAt)` → `formatDate(app.submittedAt)`.

---

### WR-01: `ApplicationQueryDto.status` accepts arbitrary strings

**Files modified:** `backend/src/applications/dto/application-query.dto.ts`
**Commit:** `e76c78b`
**Applied fix:** Added `IsIn` to the import from `class-validator`. Replaced `@IsString()` with `@IsIn(['ENVIADA', 'REVISANDO', 'APROBADA', 'RECHAZADA', 'SEGUIMIENTO', 'ADOPTADA', 'RETIRADA'])` on the `status` field, so invalid enum values are rejected with a 400 before reaching Prisma.

---

### WR-02: `draft` composable instantiated inside `computed()` — Vue anti-pattern

**Files modified:** `frontend/app/pages/animales/[id]/aplicar.vue`
**Commit:** `d467801`
**Applied fix:** Removed `const draft = computed(() => useApplicationDraft(...))`. Replaced with a top-level destructured call `const { saveDraft, loadDraft, clearDraft } = useApplicationDraft(route.params.id as string, authStore.user?.id ?? 'guest')`. Updated all four call sites (`draft.value.saveDraft`, `draft.value.loadDraft` x2, `draft.value.clearDraft`) to use the directly destructured functions.

---

### WR-03: Public URL derived by stripping presigned URL query string — may be wrong host

**Files modified:** `backend/src/upload/upload.controller.ts`, `frontend/app/components/animals/PhotoUploader.vue`
**Commit:** `8d2dc72`
**Applied fix:** Updated `UploadController.getPresignedUrl` to call `this.uploadService.getPublicUrl(key)` and include `publicUrl` in the response. Updated `PhotoUploader.vue` to destructure `publicUrl` from the API response type (`{ url: string; key: string; publicUrl: string }`) and use it directly instead of `presignedUrl.split('?')[0]`.

---

### WR-05: `withdraw` endpoint has no `@Roles` decorator

**Files modified:** `backend/src/applications/applications.controller.ts`
**Commit:** `e777fd4`
**Applied fix:** Added `@Roles('ADOPTER')` decorator to the `PATCH /:id/retirar` endpoint, restricting it to adopters only and aligning with the feature intent.

---

## Skipped Issues

### WR-04: Housing/lifestyle option values are hardcoded untranslated Spanish strings stored in JSON columns

**File:** `frontend/app/components/applications/ApplicationStepHousing.vue:141-165`
**Reason:** Scope too large for atomic safe fix — requires changes across multiple components and has data migration implications. The refactor requires: (1) changing stored enum values in `ApplicationStepHousing.vue` from Spanish strings (`'Casa'`, `'Alquilada'`, `'Si'`) to locale-agnostic keys (`'HOUSE'`, `'RENTED'`, `'YES'`); (2) adding i18n translations for all new enum keys; (3) updating the template conditional `form.ownership === 'Alquilada'` to `form.ownership === 'RENTED'`; (4) updating `ApplicationStepReview.vue` to translate stored enum keys back to display labels; (5) considering existing DB records that store the Spanish strings. Any partial application would leave the wizard in a broken state. This is a planned migration that warrants its own focused iteration.
**Original issue:** `housingTypeOptions`, `ownershipOptions`, `petPermissionOptions`, and `exteriorSpaceOptions` use Spanish strings as both label and stored value, creating locale/data coupling and preventing backend filtering by housing type.

---

_Fixed: 2026-04-10_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
