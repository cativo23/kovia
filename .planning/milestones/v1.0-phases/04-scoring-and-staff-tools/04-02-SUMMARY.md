---
phase: 04-scoring-and-staff-tools
plan: 02
subsystem: frontend
tags: [scoring, vue, nuxt, i18n, shadow-mode, internal-notes, devuelta]
dependency_graph:
  requires:
    - "04-01 (scoring engine, notes API, DEVUELTA backend)"
  provides:
    - ScorePanel component with shadow mode gate and collapsible breakdown
    - RedFlagsAlert component for HARD/MEDIUM flags
    - RiskBadge component with 4 risk level color mappings
    - InternalNotes component with append-only notes via API
    - DEVUELTA transition from ADOPTADA status in detail page
    - Queue table score column with numeric score + RiskBadge
    - Shadow mode config (NUXT_PUBLIC_SCORING_DISPLAY_ENABLED)
  affects:
    - frontend/app/pages/org/dashboard/aplicaciones/[id].vue (right column restructured)
    - frontend/app/pages/org/dashboard/aplicaciones/index.vue (score column updated)
    - frontend/app/components/applications/ApplicationStatusBadge.vue (DEVUELTA added)
    - frontend/nuxt.config.ts (scoringDisplayEnabled in runtimeConfig.public)
    - docker-compose.yml (NUXT_PUBLIC_SCORING_DISPLAY_ENABLED env var)
    - frontend/i18n/locales/es-SV.json (scoring, notes, devuelta keys added)
tech_stack:
  added:
    - Intl.RelativeTimeFormat (useRelativeTime composable, no external dep)
  patterns:
    - Shadow mode gate via useRuntimeConfig().public.scoringDisplayEnabled
    - UCollapsible for score breakdown (Nuxt UI component)
    - useRelativeTime() composable for note timestamps
    - onRescored emit pattern for reactive score updates from ScorePanel
key_files:
  created:
    - frontend/app/components/applications/ScorePanel.vue
    - frontend/app/components/applications/RedFlagsAlert.vue
    - frontend/app/components/applications/RiskBadge.vue
    - frontend/app/components/applications/InternalNotes.vue
    - frontend/app/composables/useRelativeTime.ts
  modified:
    - frontend/app/components/applications/ApplicationStatusBadge.vue
    - frontend/app/pages/org/dashboard/aplicaciones/[id].vue
    - frontend/app/pages/org/dashboard/aplicaciones/index.vue
    - frontend/nuxt.config.ts
    - frontend/i18n/locales/es-SV.json
    - docker-compose.yml
decisions:
  - Shadow mode implemented purely client-side: score data still returned by API but ScorePanel renders nothing when scoringDisplayEnabled=false (T-04-07)
  - DEVUELTA transition only added to staffTransitions map (not adopter-facing), relying on server-side guard for actual enforcement (T-04-04)
  - Note body rendered as text interpolation (not v-html) to prevent XSS (T-04-08)
  - Re-score button conditioned on authStore.isOrgAdmin getter matching ORG_ADMIN role (T-04-09)
  - softFlagsForCategory shows all soft flags below every category (plan did not specify per-category mapping, soft flags don't carry category info in the type)
metrics:
  duration: ~30 minutes
  completed_date: "2026-04-11"
  tasks_completed: 2
  tasks_total: 2
  files_created: 5
  files_modified: 6
---

# Phase 04 Plan 02: Staff UI Components (Scoring Display) Summary

4 new Vue components (ScorePanel, RedFlagsAlert, RiskBadge, InternalNotes) wired into the application detail page with shadow mode config, DEVUELTA transition, and queue table score column.

## What Was Built

### Task 1: ScorePanel, RedFlagsAlert, RiskBadge + shadow mode + DEVUELTA badge

**RiskBadge.vue** — UBadge wrapper mapping 4 risk levels to Nuxt UI colors:
- `bajo_riesgo` → `success`
- `riesgo_moderado` → `info`
- `requiere_revision` → `warning`
- `alto_riesgo` → `error`

**RedFlagsAlert.vue** — Renders HARD flags (color=error) above MEDIUM flags (color=warning) as UAlert blocks. SOFT flags are not rendered here (they appear in ScorePanel breakdown). Renders nothing when no hard/medium flags present.

**ScorePanel.vue** — Shadow mode gate checks `useRuntimeConfig().public.scoringDisplayEnabled`. When false, renders nothing. When true and score is null, shows "Pendiente de evaluacion" italic text. When score present:
- Score number in `text-3xl font-bold` + RiskBadge side by side
- UCollapsible with "Ver desglose" / "Ocultar desglose" toggle showing 5 category rows with `points/maxPoints pts`
- Soft flag messages shown below categories
- Re-score button visible only to ORG_ADMIN (via `authStore.isOrgAdmin`), POSTs to `/applications/:id/rescore`, emits `rescored` event with new score/scoreDetails

**useRelativeTime.ts** — Pure composable using `Intl.RelativeTimeFormat('es')` for Spanish relative time (seconds/minutes/hours/days).

**ApplicationStatusBadge.vue** — Added `DEVUELTA` to type union and statusConfig with `color: 'error'`.

**Shadow mode config:**
- `nuxt.config.ts`: `scoringDisplayEnabled: process.env.NUXT_PUBLIC_SCORING_DISPLAY_ENABLED === 'true'`
- `docker-compose.yml`: `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED: 'true'` in frontend service

**i18n:** Added `scoring` namespace (panelHeading, pending, breakdown, breakdownHide, rescore, rescoring, rescoreError, queueColumn, risk.*, flags.*), `notes` namespace (heading, empty, placeholder, add, error), and `devuelta` status/transition keys.

### Task 2: InternalNotes + wire all components into [id].vue + queue score column + DEVUELTA transition

**InternalNotes.vue** — UCard with:
- Notes list (newest first, loaded on mount via GET `/applications/:id/notes`) showing body + author name + relative timestamp
- Empty state with italic message
- UTextarea + UButton add form; POST `/applications/:id/notes` on submit; prepends new note; clears textarea on success; error toast on failure

**[id].vue restructured right column** (new order):
1. `<RedFlagsAlert>` — only when `scoreDetails.redFlags.length > 0`
2. `<ScorePanel>` — score + breakdown + rescore
3. Status panel (existing, **old score placeholder `<div>` removed**)
4. Comment placeholder for Plan 03 ApplicantHistorySummary
5. `<InternalNotes>`
6. Animal summary (moved to last)

**DEVUELTA transition** added to `staffTransitions`:
```typescript
ADOPTADA: [
  { status: 'DEVUELTA', label: t('applications.transitions.devuelta'), color: 'error' },
],
```

**`onRescored` handler** — updates `application.value.score` and `application.value.scoreDetails` reactively from ScorePanel emit.

**index.vue score column** — replaced placeholder dash with:
```html
<div class="flex items-center gap-2">
  <span class="text-sm font-medium">{{ row.original.score }}</span>
  <RiskBadge :risk-level="row.original.scoreDetails.riskLevel" />
</div>
```
Column header now uses `t('scoring.queueColumn')` = "Puntaje".

## Commits

| Hash | Type | Description |
|------|------|-------------|
| 532364e | feat | ScorePanel, RedFlagsAlert, RiskBadge + shadow mode config + DEVUELTA badge |
| 12cff7b | feat | InternalNotes + wire scoring UI into detail page + queue score column |

## Deviations from Plan

### Auto-fixed Issues

None significant. One design clarification made:

**1. [Design Clarification] softFlagsForCategory shows soft flags under all categories**
- **Found during:** Task 1 implementation
- **Issue:** The `RedFlag` type from Plan 01 has `severity` and `code` but no `categoryName` field, making per-category soft flag assignment impossible without mapping by code convention
- **Decision:** Soft flags are shown below all category rows (if any soft flags exist). This is a minor UX difference from the spec which said "relevant category" — but the data model doesn't carry category affiliation for flags
- **No files impacted beyond original scope**

## Threat Mitigations Applied

| Threat ID | Status |
|-----------|--------|
| T-04-07 ScorePanel shadow mode bypass | Mitigated — `useRuntimeConfig().public.scoringDisplayEnabled` gate in ScorePanel.vue |
| T-04-08 Note body XSS | Mitigated — `{{ note.body }}` text interpolation, Vue auto-escapes, no v-html used |
| T-04-09 Rescore button elevation | Mitigated — button only visible when `authStore.isOrgAdmin` is true; server enforces @Roles guard regardless |

## Known Stubs

None. All functionality is wired end-to-end (pending backend being live):
- ScorePanel reads `score`/`scoreDetails` from the application object (populated by Plan 01 scoring engine)
- InternalNotes calls real GET/POST `/applications/:id/notes` endpoints (built in Plan 01)
- Re-score button calls real POST `/applications/:id/rescore` endpoint (built in Plan 01)

## Self-Check: PASSED
