---
phase: 03-adoption-applications
reviewed: 2026-04-10T00:00:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - backend/prisma/migrations/20260411042344_adoption_applications/migration.sql
  - backend/prisma/schema.prisma
  - backend/src/app.module.ts
  - backend/src/applications/applications.controller.ts
  - backend/src/applications/applications.module.ts
  - backend/src/applications/applications.service.spec.ts
  - backend/src/applications/applications.service.ts
  - backend/src/applications/dto/application-query.dto.ts
  - backend/src/applications/dto/create-application.dto.ts
  - backend/src/applications/dto/update-application-status.dto.ts
  - backend/src/upload/upload.service.spec.ts
  - backend/src/upload/upload.service.ts
  - frontend/app/components/animals/PhotoUploader.vue
  - frontend/app/components/applications/ApplicationAuthModal.vue
  - frontend/app/components/applications/ApplicationStatusBadge.vue
  - frontend/app/components/applications/ApplicationStepHousing.vue
  - frontend/app/components/applications/ApplicationStepLifestyle.vue
  - frontend/app/components/applications/ApplicationStepPersonal.vue
  - frontend/app/components/applications/ApplicationStepPhotos.vue
  - frontend/app/components/applications/ApplicationStepReview.vue
  - frontend/app/composables/useApplicationDraft.ts
  - frontend/app/layouts/org.vue
  - frontend/app/pages/animales/[id].vue
  - frontend/app/pages/animales/[id]/aplicar.vue
  - frontend/app/pages/org/dashboard/aplicaciones/[id].vue
  - frontend/app/pages/org/dashboard/aplicaciones/index.vue
  - frontend/app/pages/perfil/aplicaciones/[id].vue
  - frontend/app/pages/perfil/aplicaciones/index.vue
  - frontend/i18n/locales/es-SV.json
findings:
  critical: 4
  warning: 5
  info: 5
  total: 14
status: issues_found
---

# Phase 03: Code Review Report

**Reviewed:** 2026-04-10
**Depth:** standard
**Files Reviewed:** 28 (+ i18n JSON)
**Status:** issues_found

## Summary

This phase implements the adoption applications feature end-to-end: Prisma migration, NestJS service/controller/DTOs, a 5-step Vue wizard with draft persistence, photo uploads, and org-side queue + detail pages.

The backend service logic is solid — status transitions, RLS separation (publicPrisma vs prismaRls), ownership checks, and audit logging are all correctly implemented and well-tested. The migration and schema are structurally sound.

Four critical issues were found that will cause visible runtime breakage: a duplicate JSON key that silently destroys all org dashboard i18n strings, a field name mismatch that causes the org detail page to render all housing/lifestyle data as blank, an unguarded `JSON.parse` that can crash the wizard page, and a missing date field (`createdAt` vs `submittedAt`) that causes the adopter history list to show "Invalid Date". These need fixes before the feature can be considered functional.

---

## Critical Issues

### CR-01: Duplicate top-level `"applications"` key in es-SV.json silently drops org dashboard strings

**File:** `frontend/i18n/locales/es-SV.json:443` and `:529`

**Issue:** The JSON file defines the `"applications"` key twice at the root level. JSON parsers silently use the last definition; the first block (lines 443–513) containing `queue`, `detail.backToQueue`, `detail.score`, `transitions.*` and `detail.personalInfo` (org-flavored) is completely overwritten by the second block. At runtime, all `$t('applications.queue.*')` and `$t('applications.transitions.*')` calls used by `org/dashboard/aplicaciones/index.vue` and `org/dashboard/aplicaciones/[id].vue` will return their key strings verbatim rather than translated text.

**Fix:** Merge the two blocks into one. Move the keys from the first block (`queue`, `transitions`, and the org-flavored `detail` sub-keys) into the single `"applications"` object. The second block (lines 529–677) should absorb the first. For example:

```json
"applications": {
  "applyButton": "Aplicar para adoptar",
  "viewApplication": "Ver solicitud",
  "notAvailableTooltip": "Este animal ya no esta disponible",
  "status": { ... },
  "authModal": { ... },
  "draft": { ... },
  "wizard": { ... },
  "success": { ... },
  "errors": { ... },
  "steps": { ... },
  "review": { ... },
  "history": { ... },
  "detail": { ... },
  "queue": {
    "heading": "Solicitudes",
    ...
  },
  "transitions": {
    "reviewing": "Marcar en revision",
    ...
  }
}
```

---

### CR-02: Org detail page reads `housingInfo` / `lifestyleInfo` but API returns `housing` / `lifestyle`

**File:** `frontend/app/pages/org/dashboard/aplicaciones/[id].vue:58-120`

**Issue:** The `Application` interface on this page declares `housingInfo: Record<string, any> | null` and `lifestyleInfo: Record<string, any> | null`. However, `ApplicationsService.findByIdForOrg` returns the raw Prisma `AdoptionApplication` record, which uses the schema field names `housing` and `lifestyle`. Every `application.housingInfo.*` and `application.lifestyleInfo.*` access in the template evaluates to `undefined`, so the entire Housing and Lifestyle cards render as blank `—` dashes for org staff.

**Fix:** Either rename the interface fields to match the Prisma model, or transform the response in the service. The simplest fix is to update the interface and template:

```typescript
// In the interface
interface Application {
  // ...
  housing: Record<string, any> | null    // was: housingInfo
  lifestyle: Record<string, any> | null  // was: lifestyleInfo
  // ...
}
```

Then update all template references: `application.housingInfo` → `application.housing`, `application.lifestyleInfo` → `application.lifestyle`.

Note also that `application.housingInfo?.petPermission` is rendered with `$t('common.yes') / $t('common.no')` using a boolean coercion (line 68), but `petPermission` is stored as a Spanish string (`'Si'`, `'No'`, `'No aplica'`). The boolean coercion will incorrectly render `'No'` (truthy string) as "Si". After the rename, also remove the boolean coercion and render the string value directly.

---

### CR-03: `useApplicationDraft.loadDraft()` uses `JSON.parse` without try/catch — crashes wizard on corrupt data

**File:** `frontend/app/composables/useApplicationDraft.ts:14`

**Issue:** `localStorage.getItem(key)` can return malformed JSON (corrupted storage, version mismatch, browser extension interference). `JSON.parse(raw)` throws a `SyntaxError` that is not caught. In `aplicar.vue`, `draft.value.loadDraft()` is called in `onMounted` (line 349). An uncaught error there will leave the page in a broken state (spinner or blank).

**Fix:**

```typescript
function loadDraft(): { steps: Record<string, any>; currentStep: number; savedAt: number } | null {
  if (import.meta.server) return null
  const raw = localStorage.getItem(key)
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    localStorage.removeItem(key) // discard corrupted draft
    return null
  }
}
```

---

### CR-04: Adopter history list uses `app.createdAt` but the API returns `submittedAt`

**File:** `frontend/app/pages/perfil/aplicaciones/index.vue:63` and `91-93`

**Issue:** The `ApplicationListItem` interface defines `createdAt: string`, and `formatDate(app.createdAt)` is called in the template. The `AdoptionApplication` Prisma model does not have a `createdAt` field — it has `submittedAt`. The `findMyApplications` service method returns raw Prisma records, so `app.createdAt` is always `undefined`, and `new Date(undefined).toLocaleDateString(...)` renders as `"Invalid Date"` in the UI.

**Fix:** Update the interface and template to use `submittedAt`:

```typescript
interface ApplicationListItem {
  id: string
  status: string
  submittedAt: string   // was: createdAt
  animal: { name: string; coverPhoto?: { url: string } | null } | null
}
```

And in the template:
```html
{{ formatDate(app.submittedAt) }}   <!-- was: app.createdAt -->
```

---

## Warnings

### WR-01: `ApplicationQueryDto.status` accepts arbitrary strings — invalid values reach Prisma and produce 500

**File:** `backend/src/applications/dto/application-query.dto.ts:22-24`

**Issue:** `status` is decorated only with `@IsOptional()` and `@IsString()`. Any arbitrary string (e.g., `?status=INVALID`) passes DTO validation and is forwarded into `where.status` for both `prismaRls.adoptionApplication.findMany` and `.count`. Prisma will reject an unknown `ApplicationStatus` enum value with a database error, producing a 500 response instead of a 400.

**Fix:**

```typescript
import { IsOptional, IsString, IsIn, IsInt, Min } from 'class-validator'
import { ApplicationStatus } from '../../generated/prisma'

// In ApplicationQueryDto:
@IsOptional()
@IsIn(['ENVIADA', 'REVISANDO', 'APROBADA', 'RECHAZADA', 'SEGUIMIENTO', 'ADOPTADA', 'RETIRADA'])
status?: string;
```

---

### WR-02: `draft` composable instantiated inside `computed()` — Vue anti-pattern

**File:** `frontend/app/pages/animales/[id]/aplicar.vue:194`

**Issue:** `const draft = computed(() => useApplicationDraft(animalId.value, userId.value))` calls a composable from inside a `computed()` getter. Vue composables must only be called at the top level of `setup()`. This works only because `useApplicationDraft` has no reactive internals, but it is fragile and will break if the composable is ever updated to use `ref`, `watch`, or `onMounted`. Vue may also emit warnings in dev mode.

**Fix:** Move the draft initialization to the top level of setup, using a `watchEffect` or `watch` to react to `animalId`/`userId` changes:

```typescript
// Top-level in setup:
const draft = computed(() => {
  // only compute the key, don't call the composable here
})

// OR: call once and rebuild if deps change
const draftComposable = useApplicationDraft(animalId.value, userId.value)
// Since animalId is from the route and userId from auth, they are stable per page load
```

If the IDs are stable for the lifetime of the page (they are — route param + logged-in user), the simplest fix is:

```typescript
const { saveDraft, loadDraft, clearDraft } = useApplicationDraft(
  route.params.id as string,
  authStore.user?.id ?? 'guest',
)
```

And remove the `draft` computed ref entirely, using `saveDraft`/`loadDraft`/`clearDraft` directly.

---

### WR-03: Public URL for uploaded photos derived by stripping presigned URL query string — may be wrong host

**File:** `frontend/app/components/animals/PhotoUploader.vue:256`

**Issue:** After uploading to MinIO via a presigned URL, the public URL is computed as `presignedUrl.split('?')[0]`. Presigned URLs are generated by `s3Public` which is configured with `S3_PUBLIC_ENDPOINT` (defaulting to `http://localhost:9000`). In production, `S3_PUBLIC_ENDPOINT` and `S3_PUBLIC_URL` may point to different hostnames (e.g., a CDN in front of MinIO). The `UploadService.getPublicUrl(key)` method exists precisely to produce the correct URL from `S3_PUBLIC_URL`. The current approach bypasses it and may store the wrong hostname in the database.

**Fix:** Have the presigned-URL API response also return the `publicUrl`:

```typescript
// In UploadController.getPresignedUrl:
const { url, key } = await this.uploadService.getPresignedUrl(filename, contentType, folder)
return { url, key, publicUrl: this.uploadService.getPublicUrl(key) }
```

Then in `PhotoUploader.vue`:
```typescript
const { url: presignedUrl, key, publicUrl } = await post<{ url: string; key: string; publicUrl: string }>(
  '/upload/presigned-url',
  { filename: file.name, contentType: file.type, folder: props.folder }
)
// Use publicUrl instead of presignedUrl.split('?')[0]
```

---

### WR-04: Housing/lifestyle option values are hardcoded untranslated Spanish strings stored in JSON columns

**File:** `frontend/app/components/applications/ApplicationStepHousing.vue:141-165`

**Issue:** `housingTypeOptions`, `ownershipOptions`, `petPermissionOptions`, and `exteriorSpaceOptions` are hardcoded Spanish string values (e.g., `'Casa'`, `'Alquilada'`, `'Si'`). These strings are submitted to the API and persisted verbatim in the `housing` JSONB column. This creates a coupling between locale and stored data: if the UI language ever changes, existing records become unreadable; querying/filtering by housing type is impossible without hardcoding these Spanish strings in backend queries.

**Fix:** Use locale-agnostic enum-style keys as the stored values (e.g., `'HOUSE'`, `'RENTED'`, `'YES'`) and translate them only for display. The i18n file already has this pattern for `AnimalStatus`. Apply the same convention here:

```typescript
const housingTypeOptions = computed(() => [
  { label: t('applications.steps.housing.types.house'), value: 'HOUSE' },
  { label: t('applications.steps.housing.types.apartment'), value: 'APARTMENT' },
  // ...
])
```

---

### WR-05: `withdraw` endpoint has no `@Roles` decorator — ORG_ADMIN can call it

**File:** `backend/src/applications/applications.controller.ts:48-51`

**Issue:** `PATCH /:id/retirar` has no `@Roles` guard. Although the service-level ownership check (`application.userId !== userId`) prevents an org admin from withdrawing another user's application, an ORG_ADMIN *who is also an adopter* can withdraw applications they submitted. More importantly, the missing role restriction contradicts the feature intent (only adopters should withdraw) and allows unintended API surface for org admins.

**Fix:**

```typescript
@Patch(':id/retirar')
@Roles('ADOPTER')
async withdraw(@Param('id') id: string, @Req() req: any) {
  return this.applicationsService.withdraw(id, req.user.id)
}
```

---

## Info

### IN-01: `UploadService` injected into `ApplicationsService` but never used

**File:** `backend/src/applications/applications.service.ts:11-12`, `38`

**Issue:** `UploadService` is imported, listed in `applications.module.ts` imports, and injected via the constructor, but no method on it is ever called in `ApplicationsService`. This is dead dependency injection.

**Fix:** Remove `UploadService` from the constructor and from `ApplicationsModule` imports unless photo deletion (e.g., on application withdrawal) is planned for a subsequent iteration. If so, add a TODO comment explaining the intent.

```typescript
// Remove from constructor:
// private readonly uploadService: UploadService,

// Remove from ApplicationsModule imports:
// UploadModule,
```

---

### IN-02: `ApplicationStepHousing.vue` imports `z` from zod but uses manual validation

**File:** `frontend/app/components/applications/ApplicationStepHousing.vue:136`

**Issue:** `import { z } from 'zod'` is present but `z` is never used. The component implements validation manually via `errors.value` assignments, unlike `ApplicationStepPersonal` and `ApplicationStepLifestyle` which use `z.object().safeParse()`. The import is dead code.

**Fix:** Remove the unused import: `import { z } from 'zod'`. Optionally, refactor `validate()` to use a Zod schema for consistency with the other step components.

---

### IN-03: `AdoptionApplication` schema has no `@relation` for `organizationId` to `Organization`

**File:** `backend/prisma/schema.prisma:165-190`

**Issue:** `organizationId String` is stored on `AdoptionApplication` but there is no `organization Organization @relation(...)` defined. The migration SQL also adds no foreign key constraint on `organizationId` to the `organizations` table. This means: (1) an application can reference a deleted/non-existent organization without a DB error; (2) Prisma's `include: { organization: true }` is unavailable; (3) there is no index on `organizationId`, which may slow org-scoped queries (though this is secondary to correctness).

**Fix:** Add the relation and an index to the schema:

```prisma
model AdoptionApplication {
  // ...
  organizationId    String
  organization      Organization @relation(fields: [organizationId], references: [id])
  // ...
}

model Organization {
  // ...
  applications  AdoptionApplication[]
}
```

This requires a new migration. The missing FK constraint is a data integrity gap.

---

### IN-04: Hardcoded Spanish strings outside i18n in two template files

**Files:**
- `frontend/app/pages/org/dashboard/aplicaciones/[id].vue:144` (`"Sin fotos"`), `:208` (`"Sin acciones disponibles"`)
- `frontend/app/pages/animales/[id].vue:103` (`"Sin informacion de compatibilidad"`)

**Issue:** These strings bypass the i18n system, making future locale additions harder.

**Fix:** Add keys to `es-SV.json` and replace with `$t()` calls:

```html
<!-- [id].vue (org) line 144 -->
{{ $t('applications.detail.noPhotos') }}

<!-- [id].vue (org) line 208 -->
{{ $t('applications.detail.noActions') }}

<!-- animales/[id].vue line 103 -->
{{ $t('detail.noCompatibility') }}
```

---

### IN-05: `perfil/aplicaciones/index.vue` has a defensive double-unwrap that masks API contract

**File:** `frontend/app/pages/perfil/aplicaciones/index.vue:109`

**Issue:** `applications.value = result.data || (result as any) || []` attempts to handle both a paginated `{ data: [...] }` response and a raw array fallback via a type cast to `any`. The `findMyApplications` service always returns `{ data, total, page, limit, totalPages }`, so `result.data` will always be the correct path. The `(result as any)` fallback is dead code that suppresses TypeScript's type safety and obscures any future API contract change.

**Fix:**

```typescript
const result = await get<{ data: ApplicationListItem[]; total: number }>('/applications/my')
applications.value = result.data
```

---

_Reviewed: 2026-04-10_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
