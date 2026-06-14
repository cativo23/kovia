# Phase 10: Adopter Dashboard - Context

**Gathered:** 2026-04-23
**Status:** Ready for planning

<domain>
## Phase Boundary

Give adopters (role `ADOPTER`) a dedicated hub at `/panel` to track every application they have submitted across organizations, review details, see notification history, and withdraw pending applications. Staff/admin roles are out of scope — this is the adopter-facing workspace.

**Important context:** Most backend and page scaffolding already exists from Phases 3–5:
- Backend: `GET /applications/my`, `GET /applications/my/:id`, `PATCH /applications/:id/retirar`, `RETIRADA` status, `emitApplicationWithdrawn` event (in-app notif + webhook)
- Frontend: `/perfil/aplicaciones` list + `[id]` detail pages, `/notificaciones` page, `useNotifications` composable
- Phase 10 is **glue + enrichment**, not green-field construction.

**Out of scope for this phase:** AI-based suggestions, status-change timeline as its own audit table (reuse AuditLog), per-org webhook config (Phase 6 territory), ORG_VIEWER role visibility.

</domain>

<decisions>
## Implementation Decisions

### Dashboard Structure & Navigation

- **D-01:** New aggregator route **`/panel`** is the adopter hub. Summary stat cards at top, recent applications section, recent notifications section, CTAs. `/perfil/aplicaciones` stays as the full list page (linked from `/panel`).
- **D-02:** New header nav entry **"Mi panel"** visible only when `role === 'ADOPTER'`. Follows the pattern established in Phase 9 ("Equipo" for ORG_ADMIN).
- **D-03:** Post-login redirect: `ADOPTER` → `/panel`, `ORG_ADMIN`/`ORG_STAFF` → `/org/dashboard` (current behavior). Unauth users keep landing at `/`.
- **D-04:** Route guard on `/panel`: require auth + `role === 'ADOPTER'`. Staff/admin accessing it get redirected to `/org/dashboard`.

### Application List Enrichment

- **D-05:** Each application row on `/panel` recent list and on `/perfil/aplicaciones` shows **organization name + small logo/avatar**. Org info must be included in the `GET /applications/my` payload (see D-16).
- **D-06:** Replace flat list with **two tabs on `/perfil/aplicaciones`**: `Activas` (statuses `ENVIADA`, `REVISANDO`, `APROBADA`, `SEGUIMIENTO`) and `Histórico` (`ADOPTADA`, `RECHAZADA`, `RETIRADA`, `DEVUELTA`). Default sort newest `submittedAt` first. No multi-filter bar for MVP.
- **D-07:** **Do not surface score or risk level to adopters** — these are internal rescue signals. Adopters see only the status badge. Prevents gaming and confused expectations.

### Notification History Integration (ADOPTER-03)

- **D-08:** On `/panel`, render an inline **"Actividad reciente"** card showing the latest 5 notifications chronologically (reusing `useNotifications`). "Ver todas" link to existing `/notificaciones` page.
- **D-09:** Show **all notification types**, not filtered to status-change only. The adopter already gets welcome/system notifications today; hiding them creates confusion. ADOPTER-03's "status-change" phrasing is satisfied because status-change events dominate the feed in practice.
- **D-10:** Clicking a notification **deep-links to the application detail** (`/perfil/aplicaciones/:applicationId`) when `notification.metadata.applicationId` is present. Click also marks as read. For notifications without an applicationId, click just marks as read.

### Withdraw UX (ADOPTER-04)

- **D-11: Allowed statuses** — Adopter can withdraw only when status is `ENVIADA` or `REVISANDO`. Once the org has moved to `APROBADA`/`SEGUIMIENTO`/`ADOPTADA`/`RECHAZADA`/`DEVUELTA`, the button is hidden and the backend rejects it. Backend currently only blocks `ADOPTADA` — **must be tightened** (see D-17).
- **D-12: Confirmation** — Simple `UModal` confirm: *"¿Seguro que quieres retirar tu solicitud para {animal.name}? Esta acción no se puede deshacer."* with `Cancelar` / `Retirar` buttons. No typed-name gate — lower stakes than Phase 9's member removal.
- **D-13: Post-withdraw UI** — Application stays visible and moves from `Activas` → `Histórico` tab with a gray `RETIRADA` badge. Toast `"Solicitud retirada"` on success. Preserves audit trail for the adopter.
- **D-14: Resubmit policy** — Adopter can re-apply to the same animal after withdrawing. Update `checkExisting` to treat `RETIRADA` as "no active application." Common scenario: mistaken withdraw or changed circumstances.
- **D-15: Existing event plumbing is reused** — `eventsService.emitApplicationWithdrawn(id)` fires an in-app notification to the ADOPTER (`NotificationType.WITHDRAWN`) and emits the `application.withdrawn` webhook for org-side outbound (email + webhook). Org admins/staff do NOT receive an in-app DB notification — this is intentional behavior, not a regression. No new event wiring is needed for the adopter-facing withdraw flow. **(Corrected 2026-04-27 per POLISH-01: the original wording incorrectly claimed in-app fan-out to org admins; verified against `backend/src/notifications/events.service.ts` where every `emitApplicationX` targets `context.adopterId` only.)**

### Dashboard Summary Widgets

- **D-18:** Three stat cards across the top of `/panel`: **Activas** (count of ENVIADA+REVISANDO+APROBADA+SEGUIMIENTO), **Adoptadas** (ADOPTADA), **Históricas** (RECHAZADA+RETIRADA+DEVUELTA). Cards are clickable and filter `/perfil/aplicaciones` to the matching tab. No scoring exposed.
- **D-19:** Empty state (zero applications) — friendly illustration + copy *"¡Aún no has aplicado! Explora los animales disponibles"* + primary button to `/animales`. Matches existing `/perfil/aplicaciones` empty-state tone.

### Application Detail Page Updates

- **D-20:** `/perfil/aplicaciones/[id].vue` header gets **organization name + logo** displayed prominently. Backend must include `animal.organization` in `findById` response (see D-16).
- **D-21:** "Retirar solicitud" button appears in the detail header **only when** status ∈ {`ENVIADA`, `REVISANDO`}. Same modal confirm flow as D-12. On success: redirect back to `/perfil/aplicaciones?tab=historico` with toast.
- **D-22:** Add a **"Historial de estados"** timeline section to the detail page. Data source: **AuditLog** entries scoped to this applicationId (`application.status_changed`, `application.withdraw` actions). Render chronologically. If no audit entries beyond creation, show just "Enviada el {submittedAt}".

### Backend API Changes

- **D-16:** `GET /applications/my` and `GET /applications/my/:id` must **include `animal.organization`** (id, name, logoUrl or slug) in the response. Required for D-05, D-20.
- **D-17:** Tighten `ApplicationsService.withdraw()` status guard: reject with `BadRequestException` if status is anything other than `ENVIADA` or `REVISANDO`. Current implementation only blocks `ADOPTADA`.
- **D-18-BE:** Update `ApplicationsService.checkExisting()` to treat `RETIRADA` as "no active application" — enables D-14.
- **D-19-BE: RLS bug to resolve** — `findMyApplications` and `findById` currently use `this.prismaRls` despite the inline comment saying "Use publicPrisma — adopter has no org context" (contradicting the code). `withdraw()` correctly uses `publicPrisma`. Planner/researcher must determine whether these two methods should switch to `publicPrisma` (likely yes — adopters have no org context to drive RLS) and fix during this phase to avoid surprises when we add `organization` includes. Cross-reference Phase 9 (`refactor(09-02): rename publicPrisma field to rlsPrisma`) — the field may have been renamed again.

### Claude's Discretion

- Exact Vue component split for `/panel` (single `panel/index.vue` vs. several sub-components) — planner decides based on existing admin dashboard patterns.
- Spanish copy for toasts, empty states, modal text, and i18n keys — follow existing `applications.*` / `common.*` / `notifications.*` key conventions.
- Stat card visual treatment (UKbd vs UCard vs custom) — follow `org/dashboard` stats pattern.
- Timeline visualization component (UTimeline if available, or ad-hoc) — planner decides.
- Icon choices for nav entry, empty state, stat cards — follow lucide conventions already used.

### Folded Todos

None — no relevant pending todos matched this phase.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — search for `ADOPTER-01..04` requirement definitions
- `.planning/ROADMAP.md` — Phase 10 goal and success criteria
- `.planning/PROJECT.md` — Spanish-first constraint, tech stack, test coverage requirements

### Prior Phase Context (decisions that constrain this phase)
- `.planning/phases/03-adoption-applications/03-CONTEXT.md` — existing `/perfil/aplicaciones` scaffolding, application status model, `checkExisting` contract
- `.planning/phases/05-notifications/` (if exists) — `useNotifications` composable, `NotificationType` enum, event emission pattern
- `.planning/phases/08-google-oauth/08-CONTEXT.md` — auth session stability assumptions
- `.planning/phases/09-multi-role-permissions/09-CONTEXT.md` — `ORG_STAFF` role flip, nav entry pattern ("Equipo"), `publicPrisma` / `rlsPrisma` field rename

### Existing Code (MUST read before implementing)
- `backend/src/applications/applications.controller.ts` — existing adopter routes (`/applications/my`, `/applications/my/:id`, `/applications/:id/retirar`)
- `backend/src/applications/applications.service.ts` — `findMyApplications`, `findById`, `withdraw`, `checkExisting` — D-16/17/18-BE/19-BE all touch this file
- `backend/src/notifications/events.service.ts` — `emitApplicationWithdrawn` already wired for the ADOPTER side (D-15; org-side is webhook + email only)
- `backend/src/notifications/notifications.service.ts` — `NotificationType.WITHDRAWN` template
- `backend/prisma/schema.prisma` — `ApplicationStatus` enum (Spanish values: ENVIADA/REVISANDO/APROBADA/RECHAZADA/SEGUIMIENTO/ADOPTADA/RETIRADA/DEVUELTA)
- `frontend/app/pages/perfil/aplicaciones/index.vue` — existing list page (to be enriched per D-05, D-06)
- `frontend/app/pages/perfil/aplicaciones/[id].vue` — existing detail page (to be enriched per D-20, D-21, D-22)
- `frontend/app/pages/notificaciones/index.vue` — full notification page (link target from dashboard)
- `frontend/app/composables/useNotifications.ts` — reuse for dashboard notification section
- `frontend/app/components/applications/ApplicationStatusBadge.vue` — reuse for status badges
- `frontend/app/layouts/default.vue` — add "Mi panel" header entry (D-02)
- `frontend/app/middleware/auth.ts` + role-checking middleware — pattern for D-04 route guard
- `frontend/app/stores/auth.ts` — source of truth for `role` check

### Data Model References
- `AuditLog` table/service — data source for D-22 status history timeline (search `backend/src/common/audit` or similar)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **`ApplicationStatusBadge`** — already handles all ApplicationStatus values including RETIRADA; reuse everywhere
- **`useNotifications` composable** — provides `notifications`, `unreadCount`, `fetchNotifications`, `markAsRead`; reuse for dashboard recent-activity section
- **`GET /applications/my`, `GET /applications/my/:id`, `PATCH /applications/:id/retirar`** — endpoints exist; only need payload enrichment (org) and status-gate tightening
- **`emitApplicationWithdrawn` + `NotificationType.WITHDRAWN` template** — withdraw event and in-app/webhook notification are wired; no new event needed
- **`UCard`, `UButton`, `UModal`, `UIcon`, `UBadge`** — Nuxt UI component library already in use across the codebase
- **Admin nav pattern** (Phase 9 "Equipo") — direct precedent for adding role-gated header entry "Mi panel"

### Established Patterns
- **Role-based UI gating** — reads `role` from auth store, hides nav entries / redirects via middleware (Phase 9 precedent)
- **Spanish-first copy** — all user-facing strings in i18n keys under `es-SV` locale; action verbs in infinitive or imperative ("Retirar", "Ver", "Explorar")
- **Toast on mutation success** — existing composable/pattern across admin screens
- **Tab navigation** — precedent for two-tab lists (TBD: confirm which component from existing pages)
- **`findById` + ownership check** — backend pattern: fetch, then throw `ForbiddenException` if `userId !== req.user.id`

### Integration Points
- **Header nav (`frontend/app/layouts/default.vue`)** — add "Mi panel" entry
- **Post-login redirect** — wherever login currently redirects (likely `frontend/app/pages/login.vue` or auth store `onLoginSuccess`)
- **Notification click handler** — extend existing behavior to deep-link when metadata.applicationId is present
- **ApplicationsService** — touch points for D-16, D-17, D-18-BE, D-19-BE

### Key Constraints / Gotchas
- **`prismaRls` vs `publicPrisma`** — see D-19-BE; resolve the RLS mismatch before adding org includes
- **Status enum is Spanish** — use `ENVIADA`/`REVISANDO`/`APROBADA`/`ADOPTADA`/`RETIRADA`, not English equivalents
- **Notification metadata schema** — researcher must verify `metadata.applicationId` is reliably present on status-change notifications for D-10 deep-linking

</code_context>

<specifics>
## Specific Ideas

- Carlos asked to verify that withdraw emitting a notification "still works the way it used to" — confirmed: `emitApplicationWithdrawn` in `events.service.ts` fires an in-app notification to the ADOPTER (`NotificationType.WITHDRAWN`) and emits the `application.withdrawn` webhook (which drives rescue-side email + webhook outbound). Rescue staff do NOT receive an in-app DB notification — this matches the legacy v2.0 behavior. Planner should add an E2E test covering adopter → withdraw → adopter-receives-in-app + webhook-fires.
- Dashboard visual hierarchy: hero area with greeting + stats → "Mis solicitudes recientes" (3–5 most recent) → "Actividad reciente" (5 notifications) → browse-animals CTA at the bottom.

</specifics>

<deferred>
## Deferred Ideas

- **Recommended-animals carousel** on empty state — needs recommendation/matching logic we don't have. Revisit when AI matching is on the roadmap.
- **Onboarding checklist** for new adopters — could be its own "adopter onboarding" micro-phase post-MVP.
- **Mobile bottom tab bar** — larger nav refactor. Phase 10 stays with single-column responsive stack. Revisit when a dedicated mobile-polish phase is scoped.
- **Dedicated `/adopter/dashboard` aggregator backend endpoint** — would return counts + recent apps + recent notifications in one call. For MVP, the existing endpoints are enough; revisit if dashboard load times become a problem.
- **Status-change-only notification filter** — strict reading of ADOPTER-03. Deferred because the unfiltered feed is more useful in practice.
- **Grouping applications by organization** — only helpful if adopters commonly apply to many orgs. Revisit when pilot usage data shows multi-org adopters are common.
- **Cooldown-based resubmit** after withdraw — not needed for MVP; D-14 allows immediate resubmit.
- **Adopter-visible score/risk breakdown** — D-07 hides it; if adopters explicitly request transparency later, revisit.

</deferred>

---

*Phase: 10-adopter-dashboard*
*Context gathered: 2026-04-23*
