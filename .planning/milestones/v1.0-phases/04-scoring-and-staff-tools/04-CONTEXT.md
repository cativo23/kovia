# Phase 4: Scoring and Staff Tools - Context

**Gathered:** 2026-04-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 4 delivers:
1. A rule-based scoring engine (0-100) that automatically scores every submitted adoption application with transparent category breakdown and red flag detection.
2. Enhanced staff tools: score visibility in the application detail, internal notes per application, adopter history (summary inline + full history page).
3. Schema migration to add `DEVUELTA` status for tracking returned animals (prerequisite for red flag scoring).

This phase does NOT add notifications, webhooks, or any n8n integration (Phase 5).

</domain>

<decisions>
## Implementation Decisions

### Scoring Engine — Rules & Weights

- **D-01:** 5-category additive scoring system (0-100 total):
  - **Vivienda y ambiente** — 25 pts
  - **Composición del hogar** — 20 pts (animal compatibility with children/current pets)
  - **Experiencia e historial** — 20 pts
  - **Compatibilidad de estilo de vida** — 20 pts
  - **Señales de compromiso** — 15 pts

- **D-02:** Red flags are **overrides**, NOT score deductions. A red flag forces risk level to `alto` (or `requiere_revision`) regardless of numeric score. Staff see them as always-visible alert blocks above the score display.

- **D-03:** Red flag conditions (hard = forces `alto_riesgo`; medium = forces `requiere_revision`):
  - HARD: Renter without stated pet permission
  - HARD: Children present + `animal.goodWithKids = false`
  - HARD: Current dogs + `animal.goodWithDogs = false`
  - HARD: Current cats + `animal.goodWithCats = false`
  - HARD: Adoption reason contains "breeding/cría", "pelea", "fighting"
  - MEDIUM: Prior pets listed as surrendered/abandoned
  - MEDIUM: Adoption reason is "regalo" (gift for third party)
  - MEDIUM: Exotic species (rabbit, bird, reptile) + zero experience with that species
  - MEDIUM: Applicant age < 21 (derived from `personalInfo.birthDate`)
  - MEDIUM: Dog + hours alone > 10h/day
  - SOFT (flag only, no override): Activity mismatch ≥ 2 levels for dogs

- **D-04:** Category 1 — Vivienda y ambiente (25 pts):
  - Housing type: house=8, farm/finca=10, apartment=5 (cats/birds/rabbits get apartment=7 since indoor species)
  - Ownership: owned=7, rented+permission=5, rented+no permission=0 (also RED FLAG)
  - Outdoor space: has space=5, no space=0 (cats/birds/rabbits: no outdoor=3)
  - Photos (min 2 required): 3+ clear photos=3, 2 photos=0 (overlap with commitment; here assessing quality)
  - Species-specific cap: large dog + apartment + no outdoor → cap category at 8 max

- **D-05:** Category 2 — Composición del hogar (20 pts):
  - Children (8 pts): no children OR animal.goodWithKids=true=8; children+goodWithKids=false=0 (RED FLAG); children+null=4
  - Dogs compatibility (6 pts): no dogs+goodWithDogs=false=6; no dogs+true=4; has dogs+true=6; has dogs+false=0 (RED FLAG); null=3
  - Cats compatibility (6 pts): same logic as dogs using goodWithCats

- **D-06:** Category 3 — Experiencia e historial (20 pts):
  - Prior pets: had pets=5, first-time=2
  - What happened to prior pets: still have them / natural death / old age=6; rehomed=2; ran away=1; no prior pets (N/A)=3; surrendered/abandoned=0 (RED FLAG)
  - Species experience: experience with animal.species=6, no experience=2; exotic+no experience=0 (RED FLAG)
  - Adults in household: 3+=3, 2=2, 1=1

- **D-07:** Category 4 — Compatibilidad de estilo de vida (20 pts):
  - Hours alone vs species thresholds: dogs ideal <6h=8, acceptable <8h=5, >8h=1 (>10h RED FLAG); cats <10h=8, <12h=5; others <8h=8, <10h=5
  - Activity level match (applicant vs animal.energyLevel): exact match=6, one step apart=3, two steps apart=0
  - Adoption reason keywords: positive signals (companionship, family, responsibly, love animals)=6; neutral/generic=3; concerning (gift, breeding, guard, fighting)=0 (some RED FLAG)

- **D-08:** Category 5 — Señales de compromiso (15 pts):
  - Photos: 3+ clear=5, 2 photos=3
  - Social media link provided: yes=3, no=0
  - Additional context (additionalContext field): >50 chars thoughtful=4, brief/empty=1
  - All required fields filled: all complete=3, missing optional only=2, missing recommended=0

- **D-09:** Risk thresholds (4 levels):
  - 80-100: `bajo_riesgo` — auto-recommend approval, staff confirms
  - 60-79: `riesgo_moderado` — standard review
  - 40-59: `requiere_revision` — detailed review, may need more info
  - 0-39: `alto_riesgo` — likely decline, senior staff review
  - Red flag overrides can downgrade any tier; never upgrade

- **D-10:** Shadow mode for pilot launch — score is computed and stored in `scoreDetails` but NOT displayed in the staff UI until DameTuPataSV manually enables it (config flag). First 30-50 applications should be reviewed manually; staff decisions compared against computed scores for calibration before activating display.

### Scoring Trigger

- **D-11:** Auto async via BullMQ on application submit — same queue pattern as the existing `mail` queue (WorkerHost processor). Score field shows "Pendiente" in UI until job runs.

- **D-12:** Manual re-score endpoint — `POST /applications/:id/rescore`, ORG_ADMIN only. Allows staff to trigger re-scoring if algorithm weights are updated during the pilot. This endpoint only recomputes `score` and `scoreDetails`; it does not change application status.

- **D-13:** Scoring function must be pure TypeScript — no DB calls inside scoring logic, no external API calls. Input: `{application, animal}`. Output: `{total, riskLevel, categories, redFlags, overridden}`. This ensures determinism and allows unit testing without mocking.

### Score Display in Staff UI

- **D-14:** Score display location: right column of `aplicaciones/[id].vue`, inside the existing status UCard (or a new adjacent UCard). Shows:
  - Score number (bold, large) + risk level badge (color-coded)
  - "Pendiente" label if score is null (job hasn't run yet)
  - `UCollapsible` "Ver desglose" expands to show 5 category scores with points earned/max

- **D-15:** Red flags display: always-visible alert block (UAlert, orange/red) ABOVE the score, never inside the collapsible. Staff must see flags without interaction. If no red flags, block is hidden.

- **D-16:** Queue table (`aplicaciones/index.vue`) score column: show numeric score + risk badge. If null: "—". This replaces the D-20 placeholder from Phase 3.

### Internal Notes

- **D-17:** New `ApplicationNote` Prisma model:
  ```
  id, applicationId (FK), organizationId (FK), authorId (FK to User), body (text), createdAt
  ```
  RLS policy: read/write scoped to `organizationId = app.current_org_id`. Notes NOT visible to adopters, NOT visible cross-org.

- **D-18:** Notes UX: UCard "Notas internas" in the right column of `[id].vue`, below the score panel. Textarea + "Agregar nota" button. List of existing notes with author name, relative date (e.g., "hace 2 horas"). No threading, no editing — append-only for MVP.

### Applicant History

- **D-19:** Inline summary card in `[id].vue`: compact UCard showing adopter's totals: N solicitudes enviadas, N adoptados, N devueltos. Any `DEVUELTA` outcome = red badge. Button "Ver historial completo" → navigates to adopter profile.

- **D-20:** Adopter profile page: `/org/dashboard/adoptantes/[userId]`. Shows full list of past applications across all orgs (where permitted by RLS), outcomes, and any flags. This is a new route and new BE endpoint `GET /adopters/:userId/history`.

- **D-21:** Cross-org visibility for history: staff can see past applications from OTHER orgs only as outcome summaries (status, animal species, outcome date) — NOT the full application content. RLS enforces this. Full application data only visible to the org it belongs to.

### Tracking Returned Animals — Schema Change

- **D-22:** Add `DEVUELTA` to `ApplicationStatus` PostgreSQL enum via a new migration (`ALTER TYPE "ApplicationStatus" ADD VALUE 'DEVUELTA' AFTER 'ADOPTADA'`). This is a non-destructive migration.

- **D-23:** State machine update: `ADOPTADA → DEVUELTA` is a valid staff-only transition. Add to `staffTransitions` map in `applications.service.ts`. Update RLS `org_staff_update` policy to allow this transition.

- **D-24:** `@@unique([animalId, userId])` constraint note: if an animal is re-listed after a return and the same adopter tries to apply again, the unique constraint blocks them. For Phase 4, this is acceptable. A follow-on migration (Phase 5 or later) may need to relax this constraint or add soft-delete semantics.

### Claude's Discretion
- Exact keyword list for adoption reason parsing (positive/neutral/concerning signals)
- Specific wording of flag messages shown in the UAlert blocks (in Spanish)
- How "Pendiente" is styled in the queue table while score is being computed
- Whether `applicaciones/index.vue` score column sorts by score (reasonable default: yes)
- BullMQ queue name for scoring (suggest: `scoring`)
- Internal structure of `scoreDetails` JSON (follow the ScoringResult interface from the engine design)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 4 Requirements
- `.planning/REQUIREMENTS.md` §SCOR-01 through SCOR-06 — scoring requirements
- `.planning/REQUIREMENTS.md` §DASH-02 through DASH-05 — staff dashboard requirements
- `.planning/REQUIREMENTS.md` §HIST-01 through HIST-03 — applicant history requirements

### Existing Application Infrastructure (Phase 3)
- `backend/src/applications/applications.service.ts` — state machine, staffTransitions map, status validation
- `backend/prisma/schema.prisma` — AdoptionApplication model with score/scoreDetails fields
- `frontend/app/pages/org/dashboard/aplicaciones/[id].vue` — application detail page (2-col layout)
- `frontend/app/pages/org/dashboard/aplicaciones/index.vue` — queue table (D-20 score placeholder)

### Existing Queue Pattern (Phase 1 — to replicate)
- `backend/src/mail/mail.processor.ts` — WorkerHost processor pattern to replicate for scoring
- `backend/src/app.module.ts` — BullMQ module registration

### Phase 3 Context (decisions that carry forward)
- `.planning/phases/03-adoption-applications/03-CONTEXT.md` — D-15 state machine, D-16/D-17 staff transitions, D-19/D-20 queue table columns

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `UCollapsible` (Nuxt UI v4) — available for score breakdown panel, no extra dependency
- `UAlert` (Nuxt UI v4) — for red flag display
- `UBadge` (Nuxt UI v4) — risk level color-coded badge
- `MailProcessor` in `backend/src/mail/` — WorkerHost pattern to replicate for ScoringProcessor
- Existing `applications.service.ts` staffTransitions map — extend for DEVUELTA transition
- Existing RLS policy `org_staff_update` — extend for DEVUELTA transition

### Established Patterns
- Application detail page: 2-column layout, right column = decision workspace (status, transitions, animal summary)
- BullMQ queue pattern: register queue module → define processor class extending WorkerHost → inject queue in service → `queue.add()`
- RLS: org-scoped via `app.current_org_id` — apply same pattern to ApplicationNote model
- State machine validation in service layer with AuditLog entries on every transition

### Integration Points
- Scoring engine connects to: applications.service.ts (enqueue on submit), ScoringProcessor (run engine), AdoptionApplication (write score/scoreDetails), new re-score endpoint
- Notes connect to: new ApplicationNote model + controller + [id].vue right column
- Adopter history connects to: new adopter endpoint + new [userId].vue page + summary card in [id].vue
- DEVUELTA connects to: schema migration + staffTransitions + RLS policy + state buttons in [id].vue

</code_context>

<specifics>
## Specific Ideas

- Scoring functions must be **pure TypeScript** with no side effects — deterministic, testable with simple unit tests (50+ cases covering species combos and edge cases without any mocking).
- Shadow mode is a config flag, not a hard-coded feature — it should be easy to toggle on/off without a deployment.
- The TypeScript interface for scoring output should be:
  ```typescript
  interface ScoringResult {
    total: number;          // 0-100
    riskLevel: RiskLevel;   // bajo_riesgo | riesgo_moderado | requiere_revision | alto_riesgo
    categories: CategoryScore[];
    redFlags: RedFlag[];
    overridden: boolean;    // true if red flags changed the risk level
  }
  ```
- Per the Opus agent research: for animals with all-null compatibility flags (goodWithKids/Dogs/Cats = null), household composition category defaults to 50% of available points — system doesn't know, so it doesn't penalize.

</specifics>

<deferred>
## Deferred Ideas

- Relaxing `@@unique([animalId, userId])` constraint for re-adoption scenarios — Phase 5 or later
- Per-category weight tuning UI for org admins — post-MVP
- Shadow mode dashboard showing staff decisions vs computed scores — post-MVP
- Exotic species scoring calibration beyond the initial keyword list — Phase 5 / ongoing

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-scoring-and-staff-tools*
*Context gathered: 2026-04-11*
