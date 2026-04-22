---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: — Automation, Auth & Adopter Experience
status: executing
last_updated: "2026-04-22T20:29:20.195Z"
last_activity: 2026-04-22 -- Phase --phase execution started
progress:
  total_phases: 5
  completed_phases: 1
  total_plans: 7
  completed_plans: 4
  percent: 57
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** The right pets get matched with the right people — every adoption decision is informed by structured data, scoring, and applicant history.
**Current focus:** Phase --phase — 07

## Current Position

Phase: --phase (07) — EXECUTING
Plan: 1 of --name
Status: Executing Phase --phase
Last activity: 2026-04-22 -- Phase --phase execution started

Progress: [░░░░░░░░░░] 0%

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: Nuxt 4 (not Nuxt 3) per research -- Nuxt 3 EOL July 2026
- [Roadmap]: RLS must be implemented in Phase 1 first migration -- retrofitting requires full audit
- [Roadmap]: Spanish (es-SV) as default development locale from Phase 1
- [Phase 01-foundation]: Prisma 7 generated client imported from client.ts (no index.js in generated output)
- [Phase 01-foundation]: SWC builder with typeCheck disabled for Prisma 7 ESM/CJS compatibility
- [Phase 01-foundation]: Redis host port 6380 to avoid host conflict
- [Phase 01-foundation]: Skipped @nuxt/test-utils (workspace: protocol); using vitest + happy-dom directly
- [Phase 01-foundation]: HandlebarsAdapter import from @nestjs-modules/mailer/adapters/ (ESM exports)
- [Phase 01-foundation]: Template dir via process.cwd() to avoid SWC __dirname mismatch
- [Phase 01-foundation]: Auth RLS policies for unauthenticated operations (register, login, verify)
- [Phase 01-foundation]: Access token in Pinia memory only (never localStorage) for security
- [Phase 01-foundation]: Zod for form validation (Standard Schema v1 compatible with Nuxt UI v4)
- [Phase 01-foundation]: Nuxt UI v4 AuthForm component for auth pages with OAuth providers
- [Phase 01-foundation]: Nitro /api/** proxy to backend for same-origin cookies in Docker
- [Phase 01-foundation]: Auth plugin for global session restore on every page load
- [Phase 01-foundation]: Auth store fetchProfile() after login/verify/reset (backend returns accessToken only)
- [Phase 01-foundation]: RLS disabled on platform-level tables (org_invites, audit_logs, organizations) for Prisma 7 driver adapter compatibility
- [Phase 01-foundation]: Tenant middleware converted to NestJS interceptor (runs after JWT guard for user context)
- [Phase 02-animals]: MinIO added to docker-compose with healthcheck, createbuckets init service, and public-read bucket policy
- [Phase 02-animals]: RLS on animals uses app.is_admin for platform admin bypass and app.current_org_id for org scoping
- [Phase 02-animals]: Public animal reads use publicPrisma (no RLS context); org-scoped writes use PRISMA_RLS injection
- [Phase 02-animals]: Species table has no RLS -- platform-level resource managed by admin via publicPrisma
- [Phase 02-animals]: Status transitions validated in service layer with audit logging for every state change
- [Phase 02-animals]: Org layout clones admin layout pattern with org-specific nav (Dashboard, Animales, Perfil)
- [Phase 02-animals]: PhotoUploader resizes images client-side to max 1200px before presigned URL upload
- [Phase 02-animals]: AnimalForm uses defineExpose (validate, form) for wizard step control
- [Phase 02-animals]: Edit page photo operations are immediate (not batched) for real-time UX feedback
- [Phase 02-animals-and-public-listings]: URL-driven filters use navigateTo({ query }) so each filter state is a bookmarkable SSR URL
- [Phase 02-animals-and-public-listings]: PhotoGallery uses Teleport for lightbox overlay to avoid z-index stacking issues
- [Phase 02-animals-and-public-listings]: org/[slug].vue converted from onMounted to useFetch for full SSR support on org landing page
- [v2.0-roadmap]: BullMQ already installed (v5.73.1) — use @bull-board v6.21.0 (not v7, breaking changes)
- [v2.0-roadmap]: RBAC via OrgMembership junction table — no RLS changes needed, role checks are app-layer
- [v2.0-roadmap]: Google OAuth is 95% complete from v1.0 — missing only env credentials and UI button
- [v2.0-roadmap]: Don't encode org role in JWT — query OrgMembership on each request (revocation safety)
- [v2.0-roadmap]: Bull Board protected with express-basic-auth at /admin/queues route

### Pending Todos

- **[OSS-01] Contribute `@TransactionalEventListener` upstream to nestjs-cls** — Tracked in [kovia#1](https://github.com/cativo23/kovia/issues/1). Open issue [Papooch/nestjs-cls#443](https://github.com/Papooch/nestjs-cls/issues/443) requests Spring-like afterCommit dispatch for NestJS+Prisma/TypeORM/MikroORM. Kovia currently uses a convention-based workaround (Phase 6 D-11). Revisit during v3.0 planning.

### Blockers/Concerns

None.

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| v3.0 | n8n Docker Compose + real WhatsApp flows | deferred to v3.0 |
| v3.0 | Per-org webhook configuration | deferred to v3.0 |
| v3.0+ | AI-based matching | deferred post v2.0 |
| v3.0+ | Mobile app | deferred, web-first not yet validated |
