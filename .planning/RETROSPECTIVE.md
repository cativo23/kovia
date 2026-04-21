# Retrospective: Kovia

---

## Milestone: v1.0 — MVP

**Shipped:** 2026-04-21
**Phases:** 5 | **Plans:** 19 | **Commits:** 134 | **Timeline:** 13 days

### What Was Built

1. Docker-based full stack from scratch: NestJS 11, Nuxt 4, Prisma 7 + RLS, Redis, MinIO, Mailpit — zero host dependencies
2. Complete auth + multi-tenant org onboarding with admin-controlled invite flow
3. Animal management: CRUD, presigned photo uploads, status lifecycle, SSR public listings with OG tags
4. 5-step adoption application wizard with localStorage persistence and 7-state state machine
5. Rule-based scoring engine (50+ TDD tests), staff notes, applicant history with cross-org projection
6. In-app notification bell + webhook outbox (BullMQ, exponential backoff) — n8n-ready

### What Worked

- **Docker-only dev from day one** — never hit a "works on my machine" problem; all tooling via `docker run`/`docker compose`
- **RLS in Phase 1** — enforcing tenant isolation at the schema level immediately prevented every future data-leak risk; retrofitting would have been painful
- **TDD for the scoring engine** — 50+ tests written before implementation made the engine robust and refactorable without fear
- **Spanish-first i18n from Phase 1** — adding translations after the fact is painful; starting with the locale file meant no debt
- **Conventional commits + phase scoping** — git log is readable history, not noise; easy to bisect bugs to specific plans
- **Gap-closure plans (02-04, 02-05, 02-06)** — treating UAT findings as real plans kept the process honest and the codebase clean

### What Was Inefficient

- **REQUIREMENTS.md checkboxes never updated during execution** — had to reconcile 22 unchecked items at close; automation or a reminder in PLAN templates would help
- **AUTH-05 ambiguity** — the requirement bounced between v1 and out-of-scope multiple times; should have been decided definitively in Phase 1 planning
- **Verification artifact statuses** — three phases left with `human_needed`/`gaps_found`; these accumulated because there was no checkpoint forcing resolution before moving to the next phase
- **Phase 02 UAT partial** — 2 scenarios left open; similar to verification gap, no hard gate prevented moving forward

### Patterns Established

- Anonymous volume for Prisma generated client (`/app/src/generated/prisma`) to survive bind mount restarts
- `publicPrisma` for cross-org queries (no RLS context); `prismaRls` for tenant-scoped writes
- CLS `organizationId` never from request body — always from JWT/interceptor
- Optimistic update + rollback for photo reorder (edit page owns source of truth)
- Shadow mode gate via `NUXT_PUBLIC_SCORING_DISPLAY_ENABLED` for features not ready for end users
- `v-show` not `v-if` for multi-step wizard steps (preserves form state across navigation)
- `defineExpose({ validate, form })` contract for wizard step components

### Key Lessons

- Decide "in scope or not" for each requirement before the milestone starts — ambiguity mid-build is expensive
- Add a verification gate between phases; don't let `human_needed` statuses accumulate
- REQUIREMENTS.md checkboxes should be updated at each phase completion, not just at roadmap creation
- Prisma 7 has meaningful ESM/CJS/adapter-pg constraints that need to be resolved in Phase 1 — document them immediately

### Cost Observations

- Sessions: ~15 across 13 days
- Notable: TDD phase (04-01) was the most efficient — tests as spec meant no rework on the scoring engine

---

## Cross-Milestone Trends

| Metric | v1.0 |
|--------|------|
| Phases | 5 |
| Plans | 19 |
| Days | 13 |
| Commits | 134 |
| Files changed | 324 |
| Lines added | ~81,500 |
| Gap-closure plans | 3 |
