---
gsd_state_version: 1.0
milestone: v2.0
milestone_name: Automation, Auth & Adopter Experience
status: defining_requirements
stopped_at: Milestone v2.0 started — defining requirements
last_updated: "2026-04-21T00:00:00.000Z"
progress:
  total_phases: 0
  completed_phases: 0
  total_plans: 0
  completed_plans: 0
  percent: 0
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-04-21)

**Core value:** The right pets get matched with the right people — every adoption decision is informed by structured data, scoring, and applicant history.
**Current focus:** Milestone v2.0 — Automation, Auth & Adopter Experience

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-04-21 — Milestone v2.0 started

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
- [v2.0]: n8n will run as a Docker Compose service — not an external dependency
- [v2.0]: Per-org webhook config is a prerequisite for n8n to be useful across multiple orgs
- [v2.0]: Google OAuth route is partially wired from v1.0 (AUTH-05)

### Pending Todos

None yet.

### Blockers/Concerns

None.

## Deferred Items

| Category | Item | Status |
|----------|------|--------|
| v2.0 | n8n Docker Compose + real flows | planned |
| v2.0 | Per-org webhook configuration | planned |
| v2.0 | Google OAuth (AUTH-05) | planned |
| v2.0 | Multi-role permissions within orgs | planned |
| v2.0 | Adopter dashboard | planned |
