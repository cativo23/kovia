---
phase: 02-animals-and-public-listings
reviewed: 2026-04-21T00:00:00Z
depth: standard
files_reviewed: 50
files_reviewed_list:
  - backend/Dockerfile
  - backend/package.json
  - backend/prisma.config.ts
  - backend/prisma/migrations/20260410012352_animals_species/migration.sql
  - backend/prisma/schema.prisma
  - backend/prisma/seed.ts
  - backend/src/animals/animals.controller.ts
  - backend/src/animals/animals.module.ts
  - backend/src/animals/animals.service.spec.ts
  - backend/src/animals/animals.service.ts
  - backend/src/animals/dto/animal-query.dto.ts
  - backend/src/animals/dto/create-animal.dto.ts
  - backend/src/animals/dto/update-animal.dto.ts
  - backend/src/animals/dto/update-status.dto.ts
  - backend/src/app.module.ts
  - backend/src/species/species.controller.ts
  - backend/src/species/species.module.ts
  - backend/src/species/species.service.ts
  - backend/src/upload/upload.controller.ts
  - backend/src/upload/upload.module.ts
  - backend/src/upload/upload.service.ts
  - backend/tsconfig.seed.json
  - docker-compose.yml
  - frontend/app/components/animals/AnimalCard.vue
  - frontend/app/components/animals/AnimalFilters.vue
  - frontend/app/components/animals/AnimalForm.vue
  - frontend/app/components/animals/AnimalGrid.vue
  - frontend/app/components/animals/EmptyAnimals.vue
  - frontend/app/components/animals/PhotoGallery.vue
  - frontend/app/components/animals/PhotoUploader.vue
  - frontend/app/components/animals/StatsCards.vue
  - frontend/app/components/animals/StatusBadge.vue
  - frontend/app/components/brand/BrandHeader.vue
  - frontend/app/layouts/admin.vue
  - frontend/app/layouts/default.vue
  - frontend/app/layouts/org.vue
  - frontend/app/middleware/org.ts
  - frontend/app/pages/admin/species.vue
  - frontend/app/pages/animales/index.vue
  - frontend/app/pages/index.vue
  - frontend/app/pages/org/dashboard/animales/[id]/editar.vue
  - frontend/app/pages/org/dashboard/animales/index.vue
  - frontend/app/pages/org/dashboard/animales/nuevo.vue
  - frontend/app/pages/org/dashboard/index.vue
  - frontend/app/pages/org/[slug].vue
  - frontend/i18n/locales/es-SV.json
  - frontend/tests/e2e/animals.spec.ts
  - frontend/tests/setup.ts
  - frontend/tests/unit/components/animals/StatusBadge.spec.ts
  - frontend/tests/unit/pages/animals/editar-reorder.spec.ts
  - frontend/vitest.config.ts
findings:
  critical: 2
  warning: 6
  info: 5
  total: 13
status: issues_found
---

# Phase 02: Code Review Report

**Reviewed:** 2026-04-21
**Depth:** standard
**Files Reviewed:** 50
**Status:** issues_found

## Summary

This phase introduces animals CRUD, species management, photo upload via presigned S3 URLs, and public listing pages. The architecture is sound — RLS via dual Prisma clients, the CLS-based tenant interceptor for org scoping, and a well-structured wizard for animal creation.

Two critical findings: the `AnimalsService` constructor signature does not match how it is instantiated in tests (missing `cls` parameter), and the presigned-URL endpoint accepts a caller-controlled `folder` path with no validation, enabling path traversal in S3 object keys. Six warnings cover behavioral gaps including broken boolean logic in the create wizard, silent S3 deletion failures that lose error context, a missing `@IsNotEmpty()` constraint on the species `name` field, and a stale `coverPhotoId` that can silently go out of sync on the edit page. Five info items cover code duplication, magic values, and minor conventions.

---

## Critical Issues

### CR-01: `AnimalsService` constructor arity mismatch — tests always pass `undefined` for `cls`

**File:** `backend/src/animals/animals.service.ts:52-59` and `backend/src/animals/animals.service.spec.ts:46-51`

**Issue:** The service constructor declares five parameters (`prismaRls`, `publicPrisma`, `uploadService`, `auditService`, `cls`). The spec instantiates it with only four arguments:

```ts
// animals.service.spec.ts:46-51
service = new AnimalsService(
  mockPrismaRls as any,
  mockPublicPrisma as any,
  mockUploadService as any,
  mockAuditService as any,   // <-- cls is never passed
);
```

`this.cls` is `undefined` at runtime in every test. Any test that exercises `create()`, which calls `this.cls.get('organizationId')`, will throw a `TypeError: Cannot read properties of undefined`. This means the `create` test (line 55) passes only because `mockPrismaRls.animal.create` is mocked before `cls.get` is reached — but only if NestJS dependency injection is not involved. In a direct constructor call the crash surfaces immediately in any non-mocked code path that reaches line 62.

**Fix:**
```ts
// animals.service.spec.ts — add cls mock
const mockCls = {
  get: vi.fn().mockReturnValue('org-1'),
};

service = new AnimalsService(
  mockPrismaRls as any,
  mockPublicPrisma as any,
  mockUploadService as any,
  mockAuditService as any,
  mockCls as any,
);
```

---

### CR-02: Unvalidated `folder` parameter in presigned-URL endpoint — S3 path traversal

**File:** `backend/src/upload/upload.controller.ts:42-43`

**Issue:** The `folder` parameter is read from the request body via a type-cast that bypasses DTO validation:

```ts
const { url, key } = await this.uploadService.getPresignedUrl(
  body.filename,
  body.contentType,
  (body as any).folder,   // <-- no validation on this value
);
```

A caller with `ORG_ADMIN` or `ADOPTER` role can supply any string for `folder`, including `../../../etc` or any arbitrary prefix. The resulting S3 key (`${folder}/${uuid}/${filename}`) will use the attacker-controlled prefix verbatim. While S3 object keys are not the same as filesystem paths, this allows: (a) writing objects outside the intended `animals/` or `applications/` prefixes, (b) overwriting keys in buckets that rely on prefix-based ACLs, and (c) abusing the public bucket policy to host content under unexpected paths.

**Fix:** Add `folder` to the DTO with an allowlist:
```ts
// In the controller body DTO (or a new PresignedUrlDto)
const ALLOWED_FOLDERS = ['animals', 'applications'] as const;

@IsOptional()
@IsEnum(ALLOWED_FOLDERS)
folder?: 'animals' | 'applications';
```
Then replace `(body as any).folder` with the typed field.

---

## Warnings

### WR-01: Boolean `false` values from step 2 are silently dropped in the create wizard

**File:** `frontend/app/pages/org/dashboard/animales/nuevo.vue:185-192`

**Issue:** The create payload is built using truthy checks for boolean fields:

```ts
if (charData.goodWithKids) payload.goodWithKids = charData.goodWithKids
if (charData.goodWithDogs) payload.goodWithDogs = charData.goodWithDogs
if (charData.goodWithCats) payload.goodWithCats = charData.goodWithCats
if (charData.goodWithOtherPets) payload.goodWithOtherPets = charData.goodWithOtherPets
if (charData.vaccinated) payload.vaccinated = charData.vaccinated
if (charData.sterilized) payload.sterilized = charData.sterilized
if (charData.trained) payload.trained = charData.trained
```

When a user explicitly leaves all boxes unchecked (the default state), none of these fields are included in the POST body. The backend schema defaults are all `false`, so the net result is correct for a freshly created animal — but if the user checks a box, goes to the next step, then returns and unchecks it, the final value sent will be the DB default rather than the explicit `false`. This is a latent bug that will surface as a data correctness issue when the edit-then-uncheck path is exercised.

**Fix:** Use explicit `!= null` / `!== undefined` checks instead of truthiness:
```ts
if (charData.goodWithKids != null) payload.goodWithKids = charData.goodWithKids
if (charData.vaccinated != null) payload.vaccinated = charData.vaccinated
// etc.
```

---

### WR-02: Silent swallow of S3 `deleteObject` errors loses stack trace and leaves orphaned keys

**File:** `backend/src/animals/animals.service.ts:356-359` and `backend/src/animals/animals.service.ts:426-429`

**Issue:** Photo deletion errors during `hardDelete` and `removePhoto` are caught and silently discarded:

```ts
try {
  await this.uploadService.deleteObject(photo.key);
} catch {
  // Log but don't block
}
```

The comment says "log" but nothing is actually logged. If S3 is unreachable or the key is already gone, the photo record is deleted from the DB but the S3 object may persist (or the error is invisible). Over time this can produce orphaned objects in the bucket with no visibility.

**Fix:** Log the error to at least a warning level before continuing:
```ts
} catch (err) {
  // Non-fatal: deletion proceeds, but log for observability
  console.warn(`[animals] Failed to delete S3 object ${photo.key}:`, err);
}
```
Ideally inject a `Logger` (NestJS built-in) instead of `console.warn`.

---

### WR-03: `species.create` / `species.update` accept empty-string name

**File:** `backend/src/species/species.controller.ts:31` and `backend/src/species/species.service.ts:36`

**Issue:** The controller body type is `{ name: string }` with no DTO class and no validation pipe applied. NestJS's global `ValidationPipe` (if configured globally) will not validate plain interfaces — it only validates class instances decorated with class-validator annotations. A POST to `/admin/species` with `{ "name": "" }` or `{ "name": "   " }` will create a species with an empty or whitespace-only name and a derived empty slug, violating the `UNIQUE` constraint on `species_slug_key` for repeated calls.

**Fix:** Introduce a `CreateSpeciesDto`:
```ts
export class CreateSpeciesDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;
}
```
And use it in the controller:
```ts
create(@Body() body: CreateSpeciesDto) {
```

---

### WR-04: `saveAnimal` in editar.vue silently skips fields whose value is `false` or `0`

**File:** `frontend/app/pages/org/dashboard/animales/[id]/editar.vue:189-193`

**Issue:** The payload builder for the edit form uses `!== ''` and `!== null` but also `!== undefined`, which correctly excludes empty strings from cleared optional selects — but the `!== ''` check inadvertently passes `false` boolean values through (that is correct) while numeric `0` for `ageMonths` is correctly kept. However, the combined condition `value !== '' && value !== null && value !== undefined` will drop `false` for any field where the form initializes to `false` and the user does not change it. More specifically: if an animal has `vaccinated: true` and the user explicitly unchecks it to `false`, the falsy check `value !== ''` is still true so `false` is included — but the logic is fragile and inconsistent with the create page (WR-01). The real concern is `ageMonths: 0` (newborn) being dropped because `0` is falsy in an `if (value)` style check, but the current loop uses strict equality which handles `0` correctly. This is a latent risk rather than an active bug, but the inconsistency between the create and edit pages will cause confusion.

**Fix:** Align both pages on explicit null/undefined exclusion only (not falsiness), and document the intent:
```ts
// Only skip truly absent values; never skip false or 0
if (value !== undefined && value !== null && value !== '') {
  payload[field] = value
}
```

---

### WR-05: `AnimalQueryDto.ageMax` has no `@Min(0)` — negative values reach the database

**File:** `backend/src/animals/dto/animal-query.dto.ts:62-64`

**Issue:** `ageMin` is decorated with `@Min(0)` to prevent negative ages, but `ageMax` has only `@Max(360)` with no corresponding `@Min(0)`. A request with `?ageMax=-1` will pass validation and produce a Prisma `ageMonths: { lte: -1 }` filter, returning zero results silently instead of returning a 400. This is also a logic gap because `ageMin` validation would accept `0` while `ageMax` could be `-1`, an impossible range.

**Fix:**
```ts
@IsOptional()
@Type(() => Number)
@IsInt()
@Min(0)        // <-- add this
@Max(360)
ageMax?: number;
```

---

### WR-06: `reorderPhotos` in `AnimalsService` does not verify that photoIds belong to the given animal

**File:** `backend/src/animals/animals.service.ts:469-476`

**Issue:** The reorder endpoint accepts an array of photo IDs and blindly updates each one's `position`. There is no check that the supplied photo IDs actually belong to `animalId`. An authenticated org admin could supply photo IDs from a different animal in their org (or, more critically, from an animal owned by another org if RLS is bypassed). The RLS policies on `animal_photos` grant `app_user` full access without org-scoping, meaning an org admin could reorder photos on any animal they can reference.

**Fix:** Validate ownership before bulk-updating:
```ts
async reorderPhotos(animalId: string, photoIds: string[]) {
  // Verify all photos belong to this animal
  const count = await this.prismaRls.animalPhoto.count({
    where: { id: { in: photoIds }, animalId },
  });
  if (count !== photoIds.length) {
    throw new BadRequestException('One or more photo IDs do not belong to this animal');
  }
  for (let i = 0; i < photoIds.length; i++) {
    await this.prismaRls.animalPhoto.update({
      where: { id: photoIds[i] },
      data: { position: i },
    });
  }
}
```

---

## Info

### IN-01: `AnimalPublic` interface duplicated across three components

**File:** `frontend/app/components/animals/AnimalCard.vue:124-154`, `frontend/app/components/animals/AnimalGrid.vue:57-87`

**Issue:** The `AnimalPublic` and `AnimalPhoto` interface definitions are copy-pasted verbatim in `AnimalCard.vue` and `AnimalGrid.vue`. A third implicit version lives in `animales/index.vue` as `any`. Any schema change to the API response must be updated in all three places.

**Fix:** Extract to a shared types file, e.g. `frontend/app/types/animal.ts`, and import from there.

---

### IN-02: Hardcoded dev credentials in `docker-compose.yml`

**File:** `docker-compose.yml:14-15`

**Issue:** JWT secrets are committed as plain strings:
```yaml
JWT_ACCESS_SECRET: dev-access-secret-kovia-2026
JWT_REFRESH_SECRET: dev-refresh-secret-kovia-2026
```
This is documented as dev-only and acceptable for local development, but the values are weak and predictable. If this file is ever deployed to a non-local environment without overriding these variables, tokens can be forged.

**Fix:** Replace with a reference to a `.env.example` file and document that production deployments must override these. Consider adding a comment similar to the one in `seed.ts` about not using dev values in staging/prod.

---

### IN-03: `formatAge` in `AnimalCard.vue` uses unaccented Spanish without i18n

**File:** `frontend/app/components/animals/AnimalCard.vue:170-176`

**Issue:** Age formatting returns hardcoded Spanish strings (`'Recien nacido'`, `'mes'`, `'meses'`, `'ano'`, `'anos'`) instead of calling `$t()`. The rest of the component uses `$t` consistently. These strings will not be translatable if the app adds a second locale.

**Fix:** Add corresponding i18n keys (or reuse the existing `animals.age.*` keys used in `org/dashboard/animales/index.vue`) and call `t('animals.age.newborn')` etc.

---

### IN-04: `setCover` in `PhotoUploader.vue` does not clear `isCover` on existing (prop-passed) photos

**File:** `frontend/app/components/animals/PhotoUploader.vue:288-300`

**Issue:** When setting a cover photo, only `localPhotos` are iterated to clear the `isCover` flag:
```ts
localPhotos.value.forEach(p => p.isCover = false)
```
`props.photos` (existing, server-persisted photos) are not mutated. The UI will show two photos as "cover" simultaneously if the user first marks an existing photo as cover, then marks a newly uploaded one. The API call `emit('setCover', photo.id)` is correct, but the visual state is wrong until the parent reloads.

**Fix:** The component already knows about `allPhotos` (line 153). Clear cover on all photos before setting the new one — but since props are read-only, rely on the parent's `setExistingCover` handler to reload `animal.value.photos`, which will flow back through the `existingPhotos` computed. Document this contract in a comment, or emit a `coverChanged` event and let the parent update prop state.

---

### IN-05: E2E test hardcodes admin credentials that differ from seed defaults

**File:** `frontend/tests/e2e/animals.spec.ts:77-78` and `backend/prisma/seed.ts:24`

**Issue:** The E2E test falls back to `admin@kovia.dev` / `Admin1234!` as admin credentials, but the seed script creates `admin@kovia.local` / `admin123!`. If the test environment uses only the seed data, `beforeAll` will fail to authenticate as admin and all tests requiring API setup will be skipped silently. The mismatch is masked by the `try/catch` in `beforeAll` which swallows the error and logs a warning.

**Fix:** Align the E2E fallback credentials with the seed defaults, or ensure `ADMIN_EMAIL` / `ADMIN_PASSWORD` env vars are set in the test environment:
```ts
email: process.env.ADMIN_EMAIL || 'admin@kovia.local',   // match seed.ts
password: process.env.ADMIN_PASSWORD || 'admin123!',
```

---

_Reviewed: 2026-04-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
