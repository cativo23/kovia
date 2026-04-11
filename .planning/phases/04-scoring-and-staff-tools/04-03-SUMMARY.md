---
phase: 04-scoring-and-staff-tools
plan: 03
subsystem: fullstack
tags: [adopters, history, cross-org, privacy, rls, vue, nuxt, nestjs]
dependency_graph:
  requires:
    - "04-01 (DEVUELTA status, publicPrisma pattern, CLS orgId)"
    - "04-02 (ApplicationStatusBadge, [id].vue right column structure)"
  provides:
    - AdoptersModule (service + controller + unit tests)
    - GET /adopters/:userId/history — full history with cross-org projection
    - GET /adopters/:userId/summary — lightweight count for inline card
    - ApplicantHistorySummary component (inline summary card in [id].vue)
    - Adopter profile page at /org/dashboard/adoptantes/[userId]
    - Org nav Adoptantes link
  affects:
    - frontend/app/pages/org/dashboard/aplicaciones/[id].vue (ApplicantHistorySummary wired in)
    - frontend/app/layouts/org.vue (Adoptantes nav item added)
    - frontend/i18n/locales/es-SV.json (adoptantes namespace + org.nav.adopters)
    - backend/src/app.module.ts (AdoptersModule registered)
tech_stack:
  added: []
  patterns:
    - publicPrisma (no RLS) for cross-org queries — same as ScoringProcessor pattern
    - CLS orgId for current-org context determination
    - Cross-org projection: full data for own org, outcome summaries only for others (D-21)
    - Silent error handling in summary card (non-critical feature)
key_files:
  created:
    - backend/src/adopters/adopters.service.ts
    - backend/src/adopters/adopters.controller.ts
    - backend/src/adopters/adopters.module.ts
    - backend/src/adopters/adopters.service.spec.ts
    - frontend/app/components/applications/ApplicantHistorySummary.vue
    - frontend/app/pages/org/dashboard/adoptantes/[userId].vue
  modified:
    - backend/src/app.module.ts (AdoptersModule import)
    - frontend/app/pages/org/dashboard/aplicaciones/[id].vue (ApplicantHistorySummary wired)
    - frontend/app/layouts/org.vue (Adoptantes nav item)
    - frontend/i18n/locales/es-SV.json (adoptantes namespace + adopters nav key)
decisions:
  - Used publicPrisma (no RLS) for cross-org history queries per D-21 threat model — RLS would scope to current org only
  - ApplicantHistorySummary fails silently on error (non-critical UI element; main page still functions)
  - Cross-org applications show animalSpecies but not animalName or score per T-04-10 threat mitigation
  - Both /history and /summary endpoints guarded with ORG_ADMIN + ORG_STAFF roles per T-04-11
metrics:
  duration: ~20 minutes
  completed_date: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 6
  files_modified: 4
---

# Phase 04 Plan 03: Adopter History Backend + UI Summary

AdoptersModule with cross-org projected history endpoint, ApplicantHistorySummary inline card, full adopter profile page, and org nav update.

## What Was Built

### Task 1: Adopters Backend Module

**AdoptersService:**
- `getHistory(userId)`: queries all applications across all orgs via `publicPrisma` (bypasses RLS), projects full data for own org (`isOwnOrg=true`: animalName, score included) and outcome summaries for other orgs (`isOwnOrg=false`: animalName=null, score=null per D-21). Returns `{ summary, applications }`.
- `getSummary(userId)`: runs 3 parallel `count` queries for total/adopted/returned — lightweight endpoint for the inline card.

**AdoptersController:**
- `GET /adopters/:userId/history` — full history with cross-org projection
- `GET /adopters/:userId/summary` — lightweight counts
- Both guarded with `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles('ORG_ADMIN', 'ORG_STAFF')` per T-04-11

**9 unit tests passing:**
- getHistory: full data for own org (isOwnOrg=true, animalName, score)
- getHistory: outcome-only for other orgs (isOwnOrg=false, animalName=null, score=null)
- getHistory: summary counts (total, adopted, returned)
- getHistory: DEVUELTA counted in returned
- getHistory: descending submittedAt order verified
- getHistory: cls.get('orgId') used for org context
- getSummary: correct count values
- getSummary: userId filter applied
- getSummary: ADOPTADA and DEVUELTA queried separately

### Task 2: Frontend UI

**ApplicantHistorySummary.vue** — UCard component placed in right column of [id].vue:
- Fetches `GET /adopters/${userId}/summary` on mount
- Displays `N solicitudes · N adoptados · N devueltos` summary line
- Red `color="error"` UBadge when `summary.returned > 0`
- NuxtLink to full history page `/org/dashboard/adoptantes/${userId}`
- Loading spinner during fetch; silent error handling (non-critical)

**[userId].vue** — Full adopter history page at `/org/dashboard/adoptantes/[userId]`:
- Layout: `org`, middleware: `['auth', 'org']`
- 3 stats UCards (total / adoptados / devueltos with red color for non-zero)
- Applications list with cross-org projection gate: own-org shows `animalName`, cross-org shows `animalSpecies` + "(otra organizacion)" label
- Score shown only when `app.isOwnOrg && app.score !== null`
- `ApplicationStatusBadge` on every row
- Redirects to aplicaciones list on load error

**[id].vue** — Plan 03 placeholder replaced:
```html
<ApplicantHistorySummary
  v-if="application.userId"
  :user-id="application.userId"
/>
```

**org.vue** — Adoptantes nav item added between Aplicaciones and Perfil with `i-lucide-users` icon.

**es-SV.json** — Added `adoptantes` namespace (10 keys) + `org.nav.adopters` key.

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 5b0b471 | feat | adopters backend module — history endpoint, cross-org projection, unit tests |
| 5b64763 | feat | adopter history UI — summary card, profile page, nav update, i18n |

## Deviations from Plan

None — plan executed exactly as written.

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-10 Cross-org data disclosure | Mitigated — service projects to `{ status, animalSpecies, submittedAt }` only for `organizationId != currentOrgId`; animalName and score stripped |
| T-04-11 Non-staff history access | Mitigated — `@Roles('ORG_ADMIN', 'ORG_STAFF')` on both controller endpoints |
| T-04-12 Unauthenticated profile page | Mitigated — `middleware: ['auth', 'org']` on [userId].vue; API returns 401/403 |

## Known Stubs

None. All functionality is wired end-to-end:
- ApplicantHistorySummary calls real `/adopters/:userId/summary` endpoint
- [userId].vue calls real `/adopters/:userId/history` endpoint
- Backend uses publicPrisma with real DB queries

## Self-Check: PASSED

Files created:
- backend/src/adopters/adopters.service.ts: EXISTS
- backend/src/adopters/adopters.controller.ts: EXISTS
- backend/src/adopters/adopters.module.ts: EXISTS
- backend/src/adopters/adopters.service.spec.ts: EXISTS
- frontend/app/components/applications/ApplicantHistorySummary.vue: EXISTS
- frontend/app/pages/org/dashboard/adoptantes/[userId].vue: EXISTS

Commits verified:
- 5b0b471: feat(04-03) adopters backend module
- 5b64763: feat(04-03) adopter history UI

Tests: 9/9 passing (adopters.service.spec.ts)
TypeScript: No errors in adopters module
