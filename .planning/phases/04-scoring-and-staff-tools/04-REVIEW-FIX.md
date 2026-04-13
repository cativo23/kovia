---
phase: 04-scoring-and-staff-tools
fixed_at: 2026-04-11T09:00:00Z
review_path: .planning/phases/04-scoring-and-staff-tools/04-REVIEW.md
iteration: 1
findings_in_scope: 8
fixed: 8
skipped: 0
status: all_fixed
---

# Phase 04: Code Review Fix Report

**Fixed at:** 2026-04-11T09:00:00Z
**Source review:** .planning/phases/04-scoring-and-staff-tools/04-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 8 (3 critical, 5 warning)
- Fixed: 8
- Skipped: 0

## Fixed Issues

### CR-01: Non-atomic RLS admin bypass in ScoringProcessor and ScoringService

**Files modified:** `backend/src/scoring/scoring.processor.ts`, `backend/src/scoring/scoring.service.ts`
**Commit:** 4f1273f
**Applied fix:** Wrapped the `$executeRaw` set_config call and `adoptionApplication.update` in a Prisma interactive `$transaction` in both files, ensuring both statements execute on the same connection within the same transaction and the `app.is_admin` session config is guaranteed to be in effect for the UPDATE.

---

### CR-02: Missing organization membership check in AdoptersController

**Files modified:** `backend/src/adopters/adopters.service.ts`
**Commit:** 0fbebeb
**Applied fix:** Added `NotFoundException` import and an authorization guard at the top of both `getHistory` and `getSummary`: counts applications for the requested `userId` scoped to `currentOrgId`, and throws `NotFoundException('Adopter not found in this organization')` if the count is zero. This prevents cross-org adopter enumeration.

---

### CR-03: `admin_notes_bypass` RLS policy missing FOR clause

**Files modified:** `backend/prisma/migrations/20260411080000_phase4_scoring/migration.sql`, `backend/prisma/migrations/20260411090000_fix_admin_notes_bypass_policy/migration.sql` (new)
**Commit:** 8fa56cc
**Applied fix:** Updated the original migration SQL to use `FOR ALL ... WITH CHECK` making the intent explicit. Also created a new corrective migration (`20260411090000_fix_admin_notes_bypass_policy`) that drops and recreates the policy with `FOR ALL USING ... WITH CHECK` so any already-provisioned database is also corrected on next `prisma migrate deploy`.

---

### WR-01: adopterHistory.returnCount is fetched but never used by the engine

**Files modified:** `backend/src/scoring/engine.ts`
**Commit:** 831abfa
**Applied fix:** Added a `MEDIUM` severity red flag `repeat_return` at the end of `detectRedFlags`: when `input.adopterHistory.returnCount >= 2`, a flag is pushed with a Spanish message naming the count. This makes `returnCount` actively consumed by scoring logic and applies the `requiere_revision` override for repeat returners.
**Note:** requires human verification — logic threshold (>= 2 returns triggers medium flag) should be confirmed against product intent.

---

### WR-02: `ApplicationsService.withdraw` uses prismaRls instead of publicPrisma

**Files modified:** `backend/src/applications/applications.service.ts`
**Commit:** d5a4857
**Applied fix:** Replaced both `this.prismaRls.adoptionApplication` calls in `withdraw` (the `findUnique` and the `update`) with `this.publicPrisma.adoptionApplication`, matching the comment that was already present on the method ("Use publicPrisma — adopter has no org context").

---

### WR-03: `useRelativeTime` breaks at week or month granularity

**Files modified:** `frontend/app/composables/useRelativeTime.ts`
**Commit:** 346c536
**Applied fix:** Added two additional threshold buckets before the final fallback: `absDiff < 604800` (7 days) formats as days, `absDiff < 2592000` (30 days) formats as weeks, and the final `return` formats as months. This caps large day counts and provides natural language output for old notes.

---

### WR-04: `softFlagsForCategory` ignores the `_categoryName` parameter

**Files modified:** `frontend/app/components/applications/ScorePanel.vue`
**Commit:** e9e2867
**Applied fix:** Replaced the misleading `softFlagsForCategory(_categoryName)` function (which ignored its parameter and returned all soft flags on every loop iteration) with a `softFlags` computed property. Moved the soft flags display block outside the `v-for` category loop so it renders once after the breakdown list, eliminating duplication.

---

### WR-05: `ApplicationStatus` type missing `DEVUELTA`

**Files modified:** `frontend/app/pages/org/dashboard/aplicaciones/index.vue`
**Commit:** f41094a
**Applied fix:** Added `| 'DEVUELTA'` to the local `ApplicationStatus` union type and added `{ label: t('applications.status.devuelta'), value: 'DEVUELTA' }` to the `statusOptions` computed array. The i18n key `applications.status.devuelta` already existed in `es-SV.json`.

---

_Fixed: 2026-04-11T09:00:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
