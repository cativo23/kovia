# Milestones: Kovia

## v1.0 — MVP

**Shipped:** 2026-04-21
**Phases:** 1–5 | **Plans:** 19
**Files changed:** 324 | **Lines added:** ~81,500
**Timeline:** 2026-04-08 → 2026-04-21 (13 days) | **Commits:** 134

### Delivered

A fully operational multi-tenant pet adoption platform, built greenfield with Docker-only development. Rescue organizations can manage animals, review scored applications, track adopter history, and trigger external automation via webhooks — all with tenant isolation enforced at the database level from day one.

### Key Accomplishments

1. Multi-tenant foundation: Docker Compose stack (NestJS 11, Nuxt 4, Prisma 7, PostgreSQL RLS, Redis, MinIO, Mailpit) with Spanish-first i18n and org onboarding via admin-controlled invite flow
2. Animal management with SSR public listings: full CRUD, presigned URL photo uploads, status lifecycle, URL-driven filtered listings with OG tags
3. Adoption application system: 5-step wizard with Zod validation, localStorage draft persistence, 7-state machine, staff application queue
4. Rule-based scoring engine: 50+ TDD tests, 0–100 score with risk level, transparent rule breakdown, red flag detection, internal staff notes, applicant history with cross-org projection
5. Notifications and automation: in-app notification bell, webhook outbox with BullMQ exponential backoff and idempotency keys — n8n-ready

### Known Deferred Items at Close: 4 (see STATE.md Deferred Items)

- Phase 02 UAT: 2 pending scenarios (partial)
- Phase 01/02/04 verification artifacts: human_needed / gaps_found statuses

### Known Gaps

- AUTH-05 (Google OAuth): route partially wired but not implemented — moved to v2

### Archive

- `.planning/milestones/v1.0-ROADMAP.md` — full phase details
- `.planning/milestones/v1.0-REQUIREMENTS.md` — all requirements with final status
