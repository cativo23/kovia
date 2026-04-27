# Requirements — Kovia v2.1: Polish & Hardening

**Milestone:** v2.1
**Status:** Active
**Last updated:** 2026-04-23
**Theme:** Pay down what v2.0 surfaced. No new features. Make vitest trustworthy, codify discipline learned the hard way, close v2.0 spec gaps.

---

## v2.1 Requirements

### TEST — Test Suite Trustworthiness

- [x] **TEST-01:** All existing vitest specs pass on `main` (no xfail, no skip-because-legacy)
- [x] **TEST-02:** `ApplicationsService` has a real-DB integration spec covering adopter-self read paths, RLS boundary, and withdraw/resubmit flow (B1/B2 regression coverage)
- [x] **TEST-03:** `EventsService` has a real-DB integration spec that asserts adopter notifications are actually created when events fire (B3 regression coverage — would have caught the silent drop)
- [x] **TEST-04:** Vitest runs as a pre-commit hook OR CI gate — a spec regression blocks the commit/PR

### PATTERN — Discipline Codification

- [ ] **PATTERN-01:** PATTERNS.md documents the `rlsPrisma` / `rlsBypassPrisma` naming rule with the B1 post-mortem as rationale
- [ ] **PATTERN-02:** PATTERNS.md documents the "runtime smoke test over code-inspection" rule for handlers that touch multi-relation Prisma includes (B3 lesson)
- [ ] **PATTERN-03:** Any service that injects both `PrismaService` and `PublicPrismaService` is documented as requiring a real-DB integration spec (mandate)
- [x] **PATTERN-04:** Codebase-wide rename: no `publicPrisma` identifier remains; all RLS-bypass clients use the typed `PublicPrismaService` and are named `rlsBypassPrisma` (or the documented convention)

### POLISH — v2.0 Carry-forward

- [x] **POLISH-01:** D-15 resolved — either org-member fan-out on application events is implemented, OR CONTEXT/REQUIREMENTS text updated to match the webhook+email-only reality (not both silently disagreeing) (resolved 2026-04-27 via docs-only correction; webhook+email-only is intended behavior)
- [ ] **POLISH-02:** `.planning/phases/07-bull-board-queue-observability/07-VERIFICATION.md` and `.planning/phases/10-adopter-dashboard/10-VERIFICATION.md` exist (artifact parity with 06/08/09)
- [x] **POLISH-03:** Phase-9 i18n rot fixed — demote tooltip copy refined (per 09-03-SUMMARY followup list) (resolved 2026-04-27: added `lastAdminDemoteTooltip` key, role-dropdown uses "degradar" copy)
- [x] **POLISH-04:** Nest SWC `watchAssets` picks up new `.hbs` templates in dev (DX) (resolved 2026-04-27: moved flag to top-level `compilerOptions.watchAssets`)
- [x] **POLISH-05:** Broken sidebar links fixed or removed: `/org/dashboard/adoptantes`, `/org/dashboard/perfil` (resolved 2026-04-27: stub pages created)
- [x] **POLISH-06:** OAuth redirect preservation handles `/login?redirect=/x` — sessionStorage captures the full intended path, not just `/login` (resolved 2026-04-27: `loginWithGoogle` uses `route.path` check + extracts `redirect` query param)

---

## Future Requirements (Deferred to v3.0+)

- n8n Docker Compose integration
- Per-org webhook configuration
- WhatsApp notifications via n8n
- ROLES-04 VIEWER persona (still D-02 deferred until a real read-only need materializes)
- Real-Google-creds Phase 8 UAT (blocked on production credentials — environment issue, not code)
- AI-based matching
- Mobile app
- Payment/donation system
- Search by location/org
- Org self-service onboarding
- Adopter profile editing
- Multi-org user switching

## Out of Scope for v2.1

- New user-facing features (this is explicitly a hardening milestone)
- Schema migrations that aren't required by a POLISH/TEST/PATTERN item
- Infrastructure work (n8n, Docker topology) — belongs in v3.0

---

## Traceability

| REQ-ID     | Phase | Status  |
|------------|-------|---------|
| TEST-01    | Phase 11 | Complete |
| TEST-02    | Phase 11 | Complete |
| TEST-03    | Phase 11 | Complete |
| TEST-04    | Phase 11 | Complete |
| PATTERN-01 | Phase 12 | Complete |
| PATTERN-02 | Phase 12 | Complete |
| PATTERN-03 | Phase 12 | Complete |
| PATTERN-04 | Phase 12 | Complete |
| POLISH-01  | Phase 13 | Complete |
| POLISH-02  | Phase 12 | Complete |
| POLISH-03  | Phase 13 | Complete |
| POLISH-04  | Phase 13 | Complete |
| POLISH-05  | Phase 13 | Complete |
| POLISH-06  | Phase 13 | Complete |
