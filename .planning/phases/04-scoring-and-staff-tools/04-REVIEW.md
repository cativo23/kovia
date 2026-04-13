---
phase: 04-scoring-and-staff-tools
reviewed: 2026-04-11T08:30:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - backend/prisma/migrations/20260411080000_phase4_scoring/migration.sql
  - backend/prisma/schema.prisma
  - backend/src/adopters/adopters.controller.ts
  - backend/src/adopters/adopters.module.ts
  - backend/src/adopters/adopters.service.spec.ts
  - backend/src/adopters/adopters.service.ts
  - backend/src/app.module.ts
  - backend/src/application-notes/application-notes.controller.ts
  - backend/src/application-notes/application-notes.module.ts
  - backend/src/application-notes/application-notes.service.spec.ts
  - backend/src/application-notes/application-notes.service.ts
  - backend/src/application-notes/dto/create-note.dto.ts
  - backend/src/applications/applications.controller.ts
  - backend/src/applications/applications.module.ts
  - backend/src/applications/applications.service.ts
  - backend/src/scoring/engine.spec.ts
  - backend/src/scoring/engine.ts
  - backend/src/scoring/engine.types.ts
  - backend/src/scoring/scoring.module.ts
  - backend/src/scoring/scoring.processor.ts
  - backend/src/scoring/scoring.service.ts
  - docker-compose.yml
  - frontend/app/components/applications/ApplicantHistorySummary.vue
  - frontend/app/components/applications/ApplicationStatusBadge.vue
  - frontend/app/components/applications/InternalNotes.vue
  - frontend/app/components/applications/RedFlagsAlert.vue
  - frontend/app/components/applications/RiskBadge.vue
  - frontend/app/components/applications/ScorePanel.vue
  - frontend/app/composables/useRelativeTime.ts
  - frontend/app/layouts/org.vue
  - frontend/app/pages/org/dashboard/adoptantes/[userId].vue
  - frontend/app/pages/org/dashboard/aplicaciones/[id].vue
  - frontend/app/pages/org/dashboard/aplicaciones/index.vue
  - frontend/i18n/locales/es-SV.json
  - frontend/nuxt.config.ts
findings:
  critical: 3
  warning: 5
  info: 4
  total: 12
status: issues_found
---

# Phase 04: Code Review Report

**Reviewed:** 2026-04-11T08:30:00Z
**Depth:** standard
**Files Reviewed:** 34
**Status:** issues_found

## Summary

Phase 4 introduces a scoring engine, internal notes, adopter history, and staff workflow tooling. The overall architecture is sound: the pure scoring engine is well-separated from persistence, RLS policies are correctly extended for the new table, and the cross-org data projection logic in `AdoptersService` properly limits what is visible from other organizations.

Three critical issues were found. Two relate to a race condition in the `ScoringProcessor`/`ScoringService` where the `set_config('app.is_admin', 'true', true)` call and the subsequent `UPDATE` are not wrapped in a transaction, creating a window where the config may not apply or may be cleared between statements. The third is an authorization gap in `AdoptersController`: any authenticated org member can query any adopter's cross-org history by guessing a `userId`, with no check that the requested user has ever applied to the requesting organization.

Five warnings are present, the most significant being that `adopterHistory.returnCount` is fetched and passed to the scoring engine but never consumed by any scoring or flag logic inside the engine — the field exists in `ScoringInput` but is silently ignored.

---

## Critical Issues

### CR-01: Non-atomic RLS admin bypass in ScoringProcessor and ScoringService

**Files:** `backend/src/scoring/scoring.processor.ts:53-57`, `backend/src/scoring/scoring.service.ts:48-53`

**Issue:** The RLS bypass pattern uses two separate database calls:
```typescript
await this.publicPrisma.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;
await this.publicPrisma.adoptionApplication.update({ ... });
```
The `set_config` with `is_local=true` (the third argument) only persists for the current transaction. Because Prisma uses a connection pool and these are two independent statements (not wrapped in `$transaction`), there is no guarantee they execute on the same connection or within the same transaction. If the connection is recycled between the two calls, the `UPDATE` will execute without the admin flag set and will be blocked by the `system_score_write` RLS policy, silently failing or throwing an error. The same pattern exists in both files.

**Fix:** Wrap both statements in a Prisma interactive transaction:
```typescript
await this.publicPrisma.$transaction(async (tx) => {
  await tx.$executeRaw`SELECT set_config('app.is_admin', 'true', true)`;
  await tx.adoptionApplication.update({
    where: { id: applicationId },
    data: { score: result.total, scoreDetails: result as any },
  });
});
```

---

### CR-02: Missing organization membership check in AdoptersController

**File:** `backend/src/adopters/adopters.controller.ts:18-26`

**Issue:** Both `GET /adopters/:userId/history` and `GET /adopters/:userId/summary` are guarded by `JwtAuthGuard` and `RolesGuard` with `ORG_ADMIN`/`ORG_STAFF` roles, but there is no check that the requested `userId` belongs to an adopter who has ever submitted an application to the calling staff member's organization. Any authenticated org admin from any organization can enumerate adopter cross-org history for any user on the platform by guessing or obtaining a valid UUID. The `AdoptersService.getHistory` correctly limits full data to the current org (via CLS `orgId`) but still returns the existence of applications at other orgs, application IDs, statuses (e.g., `RECHAZADA`), and species for all organizations the adopter has ever applied to. This constitutes an information disclosure across organizational boundaries.

**Fix:** In `AdoptersService.getHistory`, verify that the requested user has at least one application belonging to the calling organization before returning any data:
```typescript
async getHistory(userId: string) {
  const currentOrgId = this.cls.get('orgId');

  // Authorization: confirm this adopter has ever applied to the current org
  const ownOrgCount = await this.publicPrisma.adoptionApplication.count({
    where: { userId, organizationId: currentOrgId },
  });
  if (ownOrgCount === 0) {
    throw new NotFoundException('Adopter not found in this organization');
  }
  // ... rest of the method
}
```
Apply the same check in `getSummary`.

---

### CR-03: `admin_notes_bypass` RLS policy missing FOR clause (allows all operations)

**File:** `backend/prisma/migrations/20260411080000_phase4_scoring/migration.sql:32-33`

**Issue:** The `admin_notes_bypass` policy on `application_notes` is defined without a `FOR` clause:
```sql
CREATE POLICY admin_notes_bypass ON "application_notes"
  USING (current_setting('app.is_admin', true) = 'true');
```
In PostgreSQL, a policy without `FOR` defaults to `FOR ALL`, which means it applies to SELECT, INSERT, UPDATE, and DELETE operations. However, for INSERT and UPDATE, a policy using only `USING` (without `WITH CHECK`) does not grant write access — it only controls row visibility for reads. The intent appears to be an admin bypass for reads and writes, but the policy as written does not include a `WITH CHECK` clause, so admin inserts/updates on notes are still restricted. This may be intentional for the admin bypass (notes are only created by org staff) but the missing `FOR` clause makes it ambiguous and could create unexpected behavior if the admin role is ever used to manage notes directly.

**Fix:** Make the intent explicit by scoping the policy to SELECT only, or add `WITH CHECK` if writes are needed:
```sql
-- If admin only needs read bypass:
CREATE POLICY admin_notes_bypass ON "application_notes"
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');

-- If admin needs full bypass:
CREATE POLICY admin_notes_bypass ON "application_notes"
  FOR ALL
  USING (current_setting('app.is_admin', true) = 'true')
  WITH CHECK (current_setting('app.is_admin', true) = 'true');
```

---

## Warnings

### WR-01: adopterHistory.returnCount is fetched but never used by the engine

**Files:** `backend/src/scoring/scoring.processor.ts:27-30`, `backend/src/scoring/scoring.service.ts:23-25`, `backend/src/scoring/engine.ts` (entire file), `backend/src/scoring/engine.types.ts:43-45`

**Issue:** Both `ScoringProcessor.process` and `ScoringService.rescore` fetch `returnCount` and pass it in `adopterHistory: { returnCount }`. The `ScoringInput` type declares this optional field. However, no scoring category function (`scoreViviendaAmbiente`, `scoreComposicionHogar`, etc.) and no `detectRedFlags` function reads `input.adopterHistory`. The field is silently discarded. This means a repeat-return adopter (someone who has returned multiple animals) receives the same score as a first-time applicant, which contradicts the intent of collecting this data.

**Fix:** Either implement a red flag for repeat returns in `detectRedFlags`:
```typescript
// In detectRedFlags, after existing flags:
if (input.adopterHistory && input.adopterHistory.returnCount >= 2) {
  flags.push({
    severity: 'medium',
    code: 'repeat_return',
    message: `El solicitante ha devuelto ${input.adopterHistory.returnCount} animales anteriormente.`,
  });
}
```
Or, if the field is intentionally deferred, remove the fetch from the processor and service to avoid the false impression that it is active.

---

### WR-02: `ApplicationsService.withdraw` uses prismaRls instead of publicPrisma for adopter context

**File:** `backend/src/applications/applications.service.ts:292-297`

**Issue:** The comment on line 291 explicitly says "Use publicPrisma — adopter has no org context", but the actual implementation uses `this.prismaRls`:
```typescript
// Use publicPrisma — adopter has no org context
const application = await this.prismaRls.adoptionApplication.findUnique({ ... });
```
If `prismaRls` requires an org context to be set in CLS (via `app.current_org_id`), the lookup will fail silently or return null for an adopter (who has no org context), causing a spurious `NotFoundException` on every withdraw attempt. The subsequent `update` on line 310 has the same issue.

**Fix:** Replace both `this.prismaRls` calls in `withdraw` with `this.publicPrisma`:
```typescript
const application = await this.publicPrisma.adoptionApplication.findUnique({
  where: { id },
});
// ...
const updated = await this.publicPrisma.adoptionApplication.update({
  where: { id },
  data: { status: 'RETIRADA' },
});
```

---

### WR-03: `useRelativeTime` breaks at week or month granularity

**File:** `frontend/app/composables/useRelativeTime.ts:1-12`

**Issue:** `formatRelative` formats times as seconds, minutes, hours, or days only. There is no handling for dates beyond 24 hours that would naturally be expressed in weeks or months (e.g., a note from 30 days ago would display as "-30 days" which is technically correct but becomes unwieldy for old notes). More importantly, the implementation does not cap the magnitude: a note from 6 months ago would produce `rtf.format(-180, 'day')` and display as "hace 180 dias", which is a poor user experience.

**Fix:** Add week and month buckets:
```typescript
if (absDiff < 604800) return rtf.format(Math.round(diff / 86400), 'day')
if (absDiff < 2592000) return rtf.format(Math.round(diff / 604800), 'week')
return rtf.format(Math.round(diff / 2592000), 'month')
```

---

### WR-04: `softFlagsForCategory` ignores the `_categoryName` parameter

**File:** `frontend/app/components/applications/ScorePanel.vue:117-120`

**Issue:** The function `softFlagsForCategory` receives a `_categoryName: string` parameter but never uses it. It returns ALL soft flags for every category row, meaning soft flags appear duplicated under every category in the breakdown, rather than only under the relevant one. The intent is clearly per-category attribution.

```typescript
function softFlagsForCategory(_categoryName: string): RedFlag[] {
  if (!props.scoreDetails?.redFlags) return []
  return props.scoreDetails.redFlags.filter(f => f.severity === 'soft')
  // ^ 'soft' filter is correct, but categoryName is ignored
}
```

**Fix:** Either add category-level attribution to the `RedFlag` type and filter by it, or remove the parameter and rename the function to `softFlags` to make clear it returns all soft flags regardless of category:
```typescript
// Option A: rename to reflect actual behavior
const softFlags = computed<RedFlag[]>(() => {
  if (!props.scoreDetails?.redFlags) return []
  return props.scoreDetails.redFlags.filter(f => f.severity === 'soft')
})
// Then display once outside the category loop

// Option B: add categoryName to RedFlag type (requires backend change)
```

---

### WR-05: `ApplicationStatus` type in queue index page is missing `DEVUELTA`

**File:** `frontend/app/pages/org/dashboard/aplicaciones/index.vue:150-158`

**Issue:** The local `ApplicationStatus` type in the queue index page does not include `DEVUELTA`:
```typescript
type ApplicationStatus =
  | 'ENVIADA'
  | 'REVISANDO'
  | 'APROBADA'
  | 'RECHAZADA'
  | 'SEGUIMIENTO'
  | 'ADOPTADA'
  | 'RETIRADA'
  // DEVUELTA is missing
```
The `statusOptions` computed in the same file (lines 210-218) also omits `DEVUELTA` as a filter option. If an application has status `DEVUELTA`, the `ApplicationStatusBadge` component receives a value not in the local type, which TypeScript would flag, and the queue status filter cannot be used to find returned animals.

**Fix:** Add `DEVUELTA` to both the type and the `statusOptions` array:
```typescript
type ApplicationStatus =
  | 'ENVIADA' | 'REVISANDO' | 'APROBADA' | 'RECHAZADA'
  | 'SEGUIMIENTO' | 'ADOPTADA' | 'RETIRADA' | 'DEVUELTA'

// In statusOptions:
{ label: t('applications.status.devuelta'), value: 'DEVUELTA' },
```

---

## Info

### IN-01: Docker compose contains hardcoded default secrets

**File:** `docker-compose.yml:14-15`

**Issue:** The compose file contains hardcoded JWT secrets (`dev-access-secret-kovia-2026`, `dev-refresh-secret-kovia-2026`) and object storage credentials (`minioadmin`/`minioadmin`). These are development-only values and the file is clearly labeled as a dev compose file, but they should not be committed to version control without a prominent note or `.env` extraction.

**Fix:** Move secrets to a `.env` file and reference them via interpolation:
```yaml
JWT_ACCESS_SECRET: ${JWT_ACCESS_SECRET:-dev-access-secret-kovia-2026}
JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET:-dev-refresh-secret-kovia-2026}
```

---

### IN-02: `AdoptersService` uses `publicPrisma` without RLS for cross-org queries — comment could be misleading

**File:** `backend/src/adopters/adopters.service.ts:15-24`

**Issue:** The comment says "Fetch ALL applications for this adopter across ALL orgs using publicPrisma (no RLS)" which is accurate for the intent. However, using `PrismaService` directly as the "public" client in both `AdoptersService` and `ScoringProcessor` creates an implicit contract: callers must ensure they handle authorization manually. This is done correctly here, but the constructor parameter name `publicPrisma` in `AdoptersService` refers to a `PrismaService` (the standard injected Prisma), not the RLS-bypassing variant. This naming is consistent with other services but worth documenting.

**Fix:** No code change required. Consider adding a module-level comment or JSDoc block clarifying the authorization model for `getHistory`.

---

### IN-03: `ApplicationNotesController` does not validate that `applicationId` belongs to the org before creating or reading notes

**File:** `backend/src/application-notes/application-notes.controller.ts:22-36`

**Issue:** The `create` and `findAll` endpoints rely entirely on RLS (via `prismaRls`) to scope note operations to the current org. RLS will prevent reading or inserting notes for applications outside the org, but an org staff member who knows a valid `applicationId` from a different org will receive a generic empty result (for GET) or a Prisma error (for POST) rather than a 404 or 403. This is not a security vulnerability since RLS enforces the boundary, but it leaks existence — an empty note list vs. a 403 has different meaning. The behavior is consistent with how `findByIdForOrg` works for applications, so this is an acceptable design tradeoff.

**Fix:** No change required; document the design intent. Optionally add an explicit org-membership check before the Prisma call for clarity.

---

### IN-04: Magic number `50` in `scoresenalesCompromiso` for `additionalContext` length threshold

**File:** `backend/src/scoring/engine.ts:391-394`

**Issue:** The threshold `additionalContext.length > 50` is a magic number with no named constant or comment explaining why 50 characters was chosen as the threshold between "minimal response" (1 pt) and "substantive response" (4 pts).

**Fix:** Extract to a named constant at the top of the file:
```typescript
const ADDITIONAL_CONTEXT_MEANINGFUL_LENGTH = 50; // minimum chars for full commitment points
```

---

_Reviewed: 2026-04-11T08:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
