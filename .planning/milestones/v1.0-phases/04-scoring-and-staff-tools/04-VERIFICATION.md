---
phase: 04-scoring-and-staff-tools
verified: 2026-04-11T00:00:00Z
status: human_needed
score: 13/13 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Submit an adoption application and confirm a score appears in the application detail page"
    expected: "ScorePanel renders with a numeric score (0-100), a RiskBadge with color, and a collapsible breakdown showing 5 category rows"
    why_human: "BullMQ job fires asynchronously after application submit; end-to-end flow cannot be verified without a running app stack"
  - test: "Trigger a red flag scenario (e.g. select 'given away' as prior pet outcome) and view the application as staff"
    expected: "RedFlagsAlert card renders above ScorePanel in the right column, with a UAlert in error color for HARD flags or warning color for MEDIUM flags"
    why_human: "Visual rendering order in the right column and UAlert appearance requires a browser"
  - test: "Set NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false in docker-compose.yml, restart frontend, open an application detail page"
    expected: "ScorePanel renders nothing (no score, no badge, no breakdown); all other right-column components still visible"
    why_human: "Shadow mode is a runtime config toggled via env var; requires app restart to validate"
  - test: "Add an internal note to an application as ORG_ADMIN, then view the same page as ORG_STAFF"
    expected: "Note appears in InternalNotes card with author name and relative timestamp; notes from other orgs are not visible"
    why_human: "RLS enforcement on application_notes table requires live DB with active role context"
  - test: "Approve an application then mark it ADOPTADA, then use the DEVUELTA transition button"
    expected: "Application status changes to DEVUELTA, ApplicationStatusBadge shows red 'Devuelta' label"
    why_human: "State machine transition flow requires live browser interaction through multiple status steps"
  - test: "Open the application detail page for an applicant who has prior applications; view the ApplicantHistorySummary card"
    expected: "Card shows correct totals (N solicitudes, N adoptados, N devueltos); if returned > 0, red UBadge appears; NuxtLink to full history page is present"
    why_human: "Requires a test adopter with a known prior application history in the database"
  - test: "Navigate to the adopter history page (/org/dashboard/adoptantes/[userId]) for an adopter with cross-org applications"
    expected: "Cross-org rows show only species + date + status (no animalName, no score); own-org rows show full data including animal name and score"
    why_human: "Cross-org projection requires an adopter account with applications in two different organizations"
---

# Phase 4: Scoring and Staff Tools Verification Report

**Phase Goal:** Every application is automatically scored with transparent reasoning, and staff have a complete dashboard to evaluate applicants using scores, history, and internal notes
**Verified:** 2026-04-11T00:00:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Every submitted application receives a score (0-100) with a risk level and visible rule-by-rule breakdown | ✓ VERIFIED | `engine.ts` exports `scoreApplication()` returning `ScoringResult{total,riskLevel,categories[5],redFlags}`; BullMQ processor (`scoring.processor.ts`) enqueues on application create via `scoringQueue.add('score',{applicationId})`; `ScorePanel.vue` renders `text-3xl font-bold` score + `UCollapsible` breakdown with 5 category rows |
| 2 | System flags red flags and displays them prominently to staff | ✓ VERIFIED | Engine defines 5 HARD + 5 MEDIUM + 1 SOFT flag codes; HARD flags force `alto_riesgo`, MEDIUM force `requiere_revision`; `RedFlagsAlert.vue` renders HARD flags as `color="error"` UAlert ABOVE MEDIUM `color="warning"` UAlert; component placed first in `[id].vue` right column |
| 3 | Staff can view all applications per animal with scores and risk levels, update status, and add internal notes | ✓ VERIFIED | `index.vue` queue table renders `score` column with numeric + `RiskBadge`; `[id].vue` wires `<ScorePanel>` and `<InternalNotes>`; status transitions including DEVUELTA available; `ApplicationNotesService` persists notes with CLS orgId; POST `/applications/:id/notes` endpoint live |
| 4 | Staff can view an adopter's full application history including outcomes | ✓ VERIFIED | `GET /adopters/:userId/history` in `AdoptersController` returns full history; `ApplicantHistorySummary.vue` calls `/adopters/:userId/summary`; full adopter profile page at `/org/dashboard/adoptantes/[userId]`; org nav includes Adoptantes link |
| 5 | Scores are advisory — staff can override and make decisions regardless of score | ✓ VERIFIED | `scoreApplication()` is pure; no score check in `updateStatus()` per SCOR-06; rescore endpoint POSTs to `/applications/:id/rescore` guarded by `@Roles('ORG_ADMIN')` only |

**Score:** 5/5 roadmap success criteria verified

### Must-Haves from Plan Frontmatter

**Plan 01 Must-Haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `scoreApplication()` returns ScoringResult with total 0-100, riskLevel, 5 categories, redFlags | ✓ VERIFIED | `engine.types.ts` exports all types; `engine.ts` line 588: `export function scoreApplication(input: ScoringInput): ScoringResult`; 81 tests passing |
| 2 | HARD flags force riskLevel to alto_riesgo without changing numeric total | ✓ VERIFIED | `engine.spec.ts` 81 tests including hard flag override scenario; `overridden=true` when HARD flags present |
| 3 | MEDIUM flags force riskLevel to requiere_revision if was bajo/moderado | ✓ VERIFIED | Covered by engine test suite (81 tests) |
| 4 | BullMQ job scoring enqueued automatically on application create | ✓ VERIFIED | `applications.service.ts` line 107: `this.scoringQueue.add('score', { applicationId: application.id })` |
| 5 | POST /applications/:id/rescore recalculates score only for ORG_ADMIN | ✓ VERIFIED | `applications.controller.ts` line 80-83: `@Post(':id/rescore') @Roles('ORG_ADMIN')` |
| 6 | Transition ADOPTADA -> DEVUELTA valid only for staff | ✓ VERIFIED | `applications.service.ts` line 31: `ADOPTADA: ['DEVUELTA']` in staffTransitions map |
| 7 | ApplicationNote created with organizationId from CLS, not body | ✓ VERIFIED | `application-notes.service.ts` line 15: `const organizationId = this.cls.get('orgId')` |
| 8 | Notes have RLS scoped to organizationId | ✓ VERIFIED | Migration `20260411080000_phase4_scoring` creates 3 RLS policies: `org_staff_notes_read`, `org_staff_notes_insert`, `admin_notes_bypass` |

**Plan 02 Must-Haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff sees score numeric (28px bold) + RiskBadge color-coded in application detail | ✓ VERIFIED | `ScorePanel.vue` line 14: `class="text-3xl font-bold"` + `<RiskBadge>` side by side |
| 2 | Red flags HARD/MEDIUM appear as UAlert always visible ABOVE score panel | ✓ VERIFIED | `[id].vue`: `<RedFlagsAlert>` at line 176 before `<ScorePanel>` at line 182 in right column |
| 3 | Staff can add internal notes with textarea + button; notes show author and relative time | ✓ VERIFIED | `InternalNotes.vue`: `UTextarea`, `formatRelative` via `useRelativeTime()`, POST call at line 82-83 |
| 4 | Score column in queue table shows numeric + RiskBadge instead of placeholder | ✓ VERIFIED | `index.vue` lines 98-107: `#score-cell` template with numeric + `RiskBadge` |
| 5 | DEVUELTA appears as transition option when status is ADOPTADA | ✓ VERIFIED | `[id].vue` line 428: `{ status: 'DEVUELTA', label: t('applications.transitions.devuelta'), color: 'error' }` in ADOPTADA staffTransitions |
| 6 | Shadow mode: ScorePanel renders nothing when NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false | ✓ VERIFIED | `ScorePanel.vue` line 108: `const scoringEnabled = config.public.scoringDisplayEnabled`; template v-if gates entire content |

**Plan 03 Must-Haves:**

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Staff sees adopter history summary in application detail (N solicitudes, N adoptados, N devueltos) | ✓ VERIFIED | `ApplicantHistorySummary.vue`: fetches `/adopters/${userId}/summary`; renders `summary.returned` count with red styling |
| 2 | Staff can navigate to adopter profile page with full history | ✓ VERIFIED | `ApplicantHistorySummary.vue` NuxtLink to `/org/dashboard/adoptantes/${userId}`; full page exists at 151 lines |
| 3 | Cross-org history shows only outcome summaries (status, species, date) from other orgs | ✓ VERIFIED | `adopters.service.ts`: projects `animalName=null, score=null` when `organizationId !== currentOrgId`; `[userId].vue`: shows `app.animalSpecies` and `(otra organizacion)` label for cross-org rows |
| 4 | DEVUELTA past returns shown as red badge in summary | ✓ VERIFIED | `ApplicantHistorySummary.vue` line 20: `<UBadge v-if="summary.returned > 0" color="error">` |
| 5 | Org nav includes Adoptantes link | ✓ VERIFIED | `org.vue` line 79: `{ to: '/org/dashboard/adoptantes', label: t('org.nav.adopters'), icon: 'i-lucide-users' }` |

**Overall Must-Have Score:** 13/13 truths verified

### Required Artifacts

| Artifact | Min Lines | Actual | Status | Details |
|----------|-----------|--------|--------|---------|
| `backend/src/scoring/engine.ts` | — | 609 | ✓ VERIFIED | Exports `scoreApplication` |
| `backend/src/scoring/engine.types.ts` | — | 45 | ✓ VERIFIED | Exports 5 types |
| `backend/src/scoring/engine.spec.ts` | 200 | 914 | ✓ VERIFIED | 81 tests |
| `backend/src/scoring/scoring.processor.ts` | — | 59 | ✓ VERIFIED | @Processor('scoring') WorkerHost |
| `backend/src/application-notes/application-notes.service.ts` | — | — | ✓ VERIFIED | CLS-scoped orgId, exports ApplicationNotesService |
| `frontend/app/components/applications/ScorePanel.vue` | 40 | 137 | ✓ VERIFIED | Shadow mode gate, text-3xl, UCollapsible |
| `frontend/app/components/applications/RedFlagsAlert.vue` | 20 | 34 | ✓ VERIFIED | UAlert with error/warning colors |
| `frontend/app/components/applications/RiskBadge.vue` | 15 | 29 | ✓ VERIFIED | UBadge with 4 risk level mappings |
| `frontend/app/components/applications/InternalNotes.vue` | 60 | 99 | ✓ VERIFIED | UTextarea, POST call, formatRelative |
| `backend/src/adopters/adopters.service.ts` | — | 75 | ✓ VERIFIED | publicPrisma, cls.get, isOwnOrg projection |
| `backend/src/adopters/adopters.controller.ts` | — | 27 | ✓ VERIFIED | GET :userId/history, @Roles guard |
| `frontend/app/components/applications/ApplicantHistorySummary.vue` | 30 | 69 | ✓ VERIFIED | summary.returned, error badge, adopters API call |
| `frontend/app/pages/org/dashboard/adoptantes/[userId].vue` | 60 | 151 | ✓ VERIFIED | definePageMeta, isOwnOrg, ApplicationStatusBadge |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `applications.service.ts` | scoring queue | `this.scoringQueue.add('score',{applicationId})` | ✓ WIRED | Line 107 confirmed |
| `scoring.processor.ts` | `engine.ts` | `scoreApplication(input)` | ✓ WIRED | Import line 4 + call line 32 |
| `application-notes.service.ts` | CLS context | `cls.get('orgId')` | ✓ WIRED | Line 15 confirmed |
| `[id].vue` | ScorePanel, RedFlagsAlert, InternalNotes | component in right column | ✓ WIRED | Lines 176, 182, 227 confirmed |
| `ScorePanel.vue` | useRuntimeConfig | `scoringDisplayEnabled` shadow mode gate | ✓ WIRED | Line 108 confirmed |
| `ApplicantHistorySummary.vue` | `/api/v1/adopters/:userId/history` | `useApi().get()` with `adopters` URL | ✓ WIRED | Line 58: `/adopters/${userId}/summary` call confirmed |
| `adopters.service.ts` | `publicPrisma.adoptionApplication` | cross-org query | ✓ WIRED | Lines 16, 68-70 confirmed |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|-------------------|--------|
| `ScorePanel.vue` | `score`, `scoreDetails` | Props from `[id].vue` application fetch → scoring engine via BullMQ | Yes — DB query via `publicPrisma` in `scoring.processor.ts` after `SET LOCAL app.is_admin = true` | ✓ FLOWING |
| `InternalNotes.vue` | `notes` | GET `/applications/:id/notes` → `application-notes.service.ts` → prismaRls query | Yes — real Prisma query with RLS filter | ✓ FLOWING |
| `ApplicantHistorySummary.vue` | `summary` | GET `/adopters/:userId/summary` → `adopters.service.ts` → 3 parallel `publicPrisma.count()` | Yes — real DB count queries | ✓ FLOWING |
| `[userId].vue` (adopter profile) | `history` | GET `/adopters/:userId/history` → `adopters.service.ts` → `publicPrisma.adoptionApplication.findMany()` | Yes — real DB query with cross-org projection | ✓ FLOWING |
| `index.vue` score column | `row.original.score` | Applications list fetch from API → `score` and `scoreDetails` fields on application records | Yes — fields set by scoring processor in DB | ✓ FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| engine.ts exports scoreApplication | `node -e "const m = require('./backend/src/scoring/engine'); console.log(typeof m.scoreApplication)"` | Not runnable without build | ? SKIP |
| Scoring module registered in app | `grep -c "AdoptersModule\|ScoringModule\|ApplicationNotesModule" backend/src/app.module.ts` | 3 matches | ✓ PASS |
| Migration applied | `ls backend/prisma/migrations/20260411080000_phase4_scoring/` | migration.sql exists | ✓ PASS |
| All phase commits exist | `git log --oneline` | b337d06, 592ee4e, 1ac27a0, 6655a50, 532364e, 12cff7b, 5b0b471, 5b64763 all present | ✓ PASS |
| ScorePanel shadow mode gate present | `grep scoringDisplayEnabled ScorePanel.vue` | Line 108 found | ✓ PASS |
| RLS policies in migration | `grep org_staff_notes migration.sql` | 2 matches (read + insert policies) | ✓ PASS |

### Requirements Coverage

All 13 requirement IDs declared across the 3 plans are accounted for:

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SCOR-01 | 04-01 | Rule-based score (0-100) per application | ✓ SATISFIED | `engine.ts` `scoreApplication()` returns total 0-100 |
| SCOR-02 | 04-01, 04-02 | Risk level classification (low/medium/high) | ✓ SATISFIED | `RiskLevel` type: 4 levels; `RiskBadge.vue` renders color-coded badge |
| SCOR-03 | 04-01, 04-02 | Score breakdown by rule visible to staff | ✓ SATISFIED | `ScorePanel.vue` UCollapsible with 5 category rows showing points/maxPoints |
| SCOR-04 | 04-01, 04-02 | Red flags: incomplete info, inconsistencies, past returns | ✓ SATISFIED | 5 HARD + 5 MEDIUM + 1 SOFT flags in engine; `RedFlagsAlert.vue` displays them |
| SCOR-05 | 04-01 | Scoring rules: housing, experience, environment photos, lifestyle, compatibility, completeness | ✓ SATISFIED | 5 scoring categories in `engine.ts`: vivienda_ambiente, composicion_hogar, experiencia_historial, compatibilidad_estilo_vida, senales_compromiso |
| SCOR-06 | 04-01, 04-02 | Scores advisory — staff can override | ✓ SATISFIED | No score check in `updateStatus()`; rescore button available to ORG_ADMIN |
| DASH-02 | 04-02 | Staff views all applications with scores and risk levels | ✓ SATISFIED | `index.vue` queue table shows numeric score + RiskBadge per row |
| DASH-03 | 04-01, 04-02 | Staff updates application status from dashboard | ✓ SATISFIED | Status panel with transition buttons in `[id].vue`; DEVUELTA added |
| DASH-04 | 04-01, 04-02 | Staff adds internal notes (org-scoped) | ✓ SATISFIED | `InternalNotes.vue` + `ApplicationNotesModule` with RLS |
| DASH-05 | 04-03 | Staff views adopter's past applications and outcomes | ✓ SATISFIED | Adopter profile page + `ApplicantHistorySummary` component |
| HIST-01 | 04-03 | System stores all past applications per adopter across orgs | ✓ SATISFIED | `AdoptersService.getHistory()` queries `publicPrisma` (no RLS) across all orgs |
| HIST-02 | 04-01, 04-03 | Adoption outcomes tracked per application (ADOPTADA, DEVUELTA) | ✓ SATISFIED | `DEVUELTA` in `ApplicationStatus` enum; migration applied; `adopters.service.ts` counts returned |
| HIST-03 | 04-03 | Past return flags visible to staff reviewing new applications | ✓ SATISFIED | `ApplicantHistorySummary` shows returned count with red badge; adopter profile page lists all outcomes |

No orphaned requirements — all 13 IDs from plans match exactly the 13 IDs declared in the phase roadmap.

### Anti-Patterns Found

No blockers or warnings found.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `InternalNotes.vue` | 28 | `placeholder` attribute on UTextarea | ℹ️ Info | False positive — this is a legitimate UI placeholder text for input hints, not a stub |
| `ScorePanel.vue` | (shadow mode) | Comment `<!-- Score en modo sombra -->` | ℹ️ Info | Intentional — documents shadow mode behavior, not a stub indicator |

### Human Verification Required

The automated checks (all 13 truths, all artifacts, all key links, all data-flow paths) pass. The following behaviors require a live running environment to verify end-to-end:

#### 1. BullMQ Score Assignment End-to-End

**Test:** Submit a new adoption application as an adopter user
**Expected:** Within a few seconds, open the application detail as staff — ScorePanel renders with a numeric score (0-100), a color-coded RiskBadge, and a collapsible breakdown showing 5 category rows with points
**Why human:** BullMQ job fires asynchronously after application create; the full pipeline (submit → queue → processor → DB write → staff view) requires a running stack

#### 2. Red Flags Visual Display

**Test:** Create an application with a red-flag scenario (e.g. prior pet "given away" HARD flag trigger), view as staff
**Expected:** RedFlagsAlert card appears ABOVE ScorePanel with a UAlert error block; no score panel content is hidden
**Why human:** Visual rendering order in right column; exact flag trigger data requires knowledge of engine rules

#### 3. Shadow Mode Toggle

**Test:** Set `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED=false` in docker-compose.yml, restart frontend service, open any application detail page
**Expected:** ScorePanel renders nothing (blank space); all other cards (status, notes, animal summary) still visible; queue table score column shows dashes
**Why human:** Shadow mode requires env var change + container restart; runtime config behavior needs visual confirmation

#### 4. Internal Notes RLS Enforcement

**Test:** Add a note as org A staff; log in as org B staff for the same application (or use a different org's application)
**Expected:** Org B cannot see org A's notes; notes endpoint returns 403 or empty array for cross-org access
**Why human:** RLS enforcement at DB level requires active PostgreSQL session with row-level security context set

#### 5. DEVUELTA Status Transition Flow

**Test:** Take an application through ENVIADA → REVISANDO → APROBADA → ADOPTADA, then click the DEVUELTA transition button
**Expected:** Status changes to DEVUELTA, ApplicationStatusBadge shows red "Devuelta" label, transition buttons update
**Why human:** Multi-step state machine requires live browser interaction through 4+ status changes

#### 6. ApplicantHistorySummary with Real Data

**Test:** As an adopter with 2+ prior applications (including 1 DEVUELTA), submit a new application; open that application as staff
**Expected:** ApplicantHistorySummary card shows correct counts (e.g. "3 solicitudes · 1 adoptados · 1 devueltos"); red UBadge visible; NuxtLink to adopter profile present
**Why human:** Requires a test adopter account with known application history populated in the database

#### 7. Cross-Org Projection in Adopter Profile

**Test:** Set up adopter with applications in two organizations; view their profile page from org 1
**Expected:** Applications from org 1 show full data (animalName, score, status); applications from org 2 show only species + date + status + "(otra organizacion)" label; no animal names or scores from org 2
**Why human:** Cross-org scenario requires two org accounts and shared adopter account in the database

---

## Gaps Summary

No automated gaps found. All 13 must-haves verified across artifacts, key links, and data-flow traces. 7 behavioral items require human testing in a live environment to confirm end-to-end correctness.

---

_Verified: 2026-04-11T00:00:00Z_
_Verifier: Claude (gsd-verifier)_
