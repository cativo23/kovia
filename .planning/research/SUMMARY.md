# Project Research Summary

**Project:** Kovia — Smart Pet Adoption Platform
**Domain:** Multi-tenant SaaS / Animal Welfare CRM
**Researched:** 2026-04-08
**Confidence:** HIGH

## Executive Summary

Kovia is a multi-tenant adoption management platform targeting Latin American animal rescue organizations, with DameTuPataSV (El Salvador) as the pilot. It sits in a well-understood SaaS domain (CRM + workflow management) but with three genuine differentiators no competitor currently offers: rule-based applicant scoring with transparent reasoning, cross-organization applicant reputation tracking, and Spanish-first UX for a completely underserved market.

The recommended stack is NestJS 11 + Prisma 7 + PostgreSQL 16 (backend), Nuxt 4 + Nuxt UI v4 (frontend), with multi-tenant isolation enforced at both the application layer and PostgreSQL Row-Level Security. **Nuxt 4 must be used instead of Nuxt 3** — Nuxt 3 reaches end-of-life in July 2026, three months from now. The architecture follows a modular monolith with domain events, presigned URL file uploads, and an outbox-pattern webhook system feeding n8n.

The dominant risks are: (1) cross-tenant data leakage if RLS is not implemented from day one — unrecoverable without a full audit; (2) scoring rules that encode biases and auto-reject qualified adopters, eroding trust; and (3) photo upload failures on poor mobile connections in El Salvador destroying partially-completed applications. All three must be addressed architecturally in Phase 1 or Phase 2.

## Key Findings

### Recommended Stack

The stack builds on the user's chosen NestJS + PostgreSQL + Nuxt foundation with specific library recommendations verified against current releases.

**Core technologies:**
- **NestJS 11** (SWC compiler): Backend framework — 20x faster builds, mature module ecosystem
- **Prisma 7**: ORM — TypeScript-native rewrite, ESM-first, strong multi-tenant support via `@casl/prisma`
- **PostgreSQL 16**: Database — RLS-capable, proven multi-tenant patterns
- **Nuxt 4.2** (NOT Nuxt 3): Frontend — Nuxt 3 EOL July 2026, must use Nuxt 4 for greenfield
- **Nuxt UI v4**: Component library — 125+ Tailwind CSS v4 components, built-in i18n and form validation
- **`@nuxtjs/i18n` v10**: Internationalization — Spanish-first (`es-SV` locale)
- **CASL + `@casl/prisma`**: Authorization — query-level enforcement tied to tenant context
- **S3-compatible storage** (MinIO dev / Cloudflare R2 prod): Photo uploads — presigned URL pattern, zero code change between environments
- **`@nestjs/event-emitter`**: Domain events — decouples webhook dispatch from business logic
- **class-validator**: Validation — required for `@nestjs/swagger` auto-generation (not Zod on backend)

### Expected Features

**Must have (table stakes):**
- Animal profile management with photos, attributes, status lifecycle
- Structured adoption application form with environment photos
- Application status tracking (submitted → reviewing → approved/rejected → adopted)
- Staff dashboard with application queue and internal notes
- Multi-tenant organization isolation
- Admin-approved org onboarding
- Public animal listings (SEO-friendly SSR)

**Should have (competitive differentiators):**
- Rule-based applicant scoring (0-100) with risk levels — **no competitor offers this**
- Score transparency (rule breakdown visible to staff)
- Cross-org applicant reputation — **no competitor shares data across orgs**
- Spanish-first UI — **zero competitors serve this market**

**Defer (v2+):**
- Built-in chat (WhatsApp already exists, don't compete)
- Payment/donation system (PCI compliance burden)
- Medical records (different domain entirely)
- Native mobile app (responsive web covers 90%)
- Volunteer management, foster matching, Petfinder syndication (scope traps)

### Architecture Approach

Modular monolith with 6 bounded-context NestJS modules communicating via domain events. Hybrid-rendered Nuxt 4 frontend (SSR for public listings, SPA for dashboards). S3-compatible presigned URL file uploads. Outbox-pattern webhook system for reliable n8n delivery.

**Major components:**
1. **Auth Module** — JWT authentication, session management, tenant context injection
2. **Organization Module** — Org CRUD, admin approval, tenant settings
3. **Animal Module** — Animal profiles, status lifecycle, photo management
4. **Adoption Module** — Application form, state machine, staff workflow
5. **Scoring Module** — Strategy-pattern rule engine (7 weighted rules), risk classification
6. **Notification Module** — In-app notifications, outbox-based webhook dispatch to n8n

**Scoring engine design:** Strategy pattern with independent rule classes. Weights: Housing 0.20, Experience 0.15, Environment 0.15, Lifestyle 0.15, Compatibility 0.15, Completeness 0.10, Red Flags 0.10. Hardcoded for MVP, per-org configuration in later phase.

**Multi-tenancy:** `SET app.current_org` session variable + RLS policies on every tenant-scoped table. App connects as non-owner role so RLS is always active. Application-level filtering as first line, RLS as defense-in-depth.

### Critical Pitfalls

1. **Cross-tenant data leakage** — Implement RLS from Phase 1, first migration. App must never connect as table owner or superuser (both bypass RLS). Write cross-tenant integration tests immediately.
2. **Scoring bias rejects good adopters** — Scores must be advisory only, never auto-reject. Show rule breakdown to staff. Staff override capability from day one. Calibrate weights with DameTuPataSV.
3. **Photo upload fails on poor connectivity** — Use resumable/chunked uploads, client-side compression, decouple photo upload from form submission, persist form state in localStorage.
4. **Spanish as afterthought** — Spanish must be DEFAULT development locale (`es-SV`), not a translation layer. Spanish text is 20-30% longer — use flexible layouts, not fixed widths.
5. **Webhook delivery without idempotency** — Every webhook needs UUID idempotency key + sequence number. Outbox pattern with exponential backoff. Never fire webhooks synchronously in request handlers.
6. **Cross-org privacy violation** — Internal notes must NEVER cross org boundaries. Platform-shared data limited to aggregate adoption/return counts only.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Foundation — Auth, Tenancy, Infrastructure
**Rationale:** RLS must exist before any multi-tenant data is stored (retrofitting is a full audit). i18n must be Spanish-first before any UI component is built. This is the critical path everything depends on.
**Delivers:** NestJS + Nuxt 4 monorepo, JWT auth, multi-tenant org isolation with RLS, Spanish-first i18n scaffolding, Docker Compose dev environment, org onboarding with admin approval, applicant account creation.
**Addresses:** Multi-tenant isolation, org management, auth (table stakes)
**Avoids:** Cross-tenant leakage, i18n-as-afterthought, Nuxt 3 EOL

### Phase 2: Core Content — Animals, Files, Public Listings
**Rationale:** Public SSR listings are the first visible output and validate SEO architecture. File upload infrastructure must exist before the adoption application form.
**Delivers:** Animal CRUD with status lifecycle, S3/MinIO presigned upload pipeline with thumbnail generation, public SSR animal listings with SEO meta tags, photo galleries.
**Addresses:** Animal management, photo management, public listings (table stakes)
**Avoids:** Server-proxied file uploads, missing thumbnails

### Phase 3: Core Workflow — Adoption Applications and Scoring
**Rationale:** This is the primary differentiator. Application state machine and scoring engine belong together — application triggers scoring synchronously. Scoring transparency must be a design constraint from the start.
**Delivers:** Multi-step adoption application form (localStorage persistence, upload-first photos), application state machine, scoring engine with 7 rules and risk classification, staff dashboard with application queue, internal notes.
**Addresses:** Adoption workflow, scoring engine, staff dashboard (differentiators)
**Avoids:** Scoring bias (advisory scores + rule breakdown + staff override), photo upload failures on poor connectivity

### Phase 4: Notifications and Automation
**Rationale:** Staff workflow must be solid before adding notification layer. With application state machine in place, this phase wraps the adopter experience and implements reliable webhook delivery.
**Delivers:** Adopter portal (application history, status timeline), in-app notification system, webhook outbox poller with idempotency and exponential backoff, n8n integration for WhatsApp/email automation.
**Addresses:** Notifications, webhook events, adopter experience
**Avoids:** Webhook delivery without idempotency, synchronous webhook dispatch

### Phase 5: Cross-Org Features and Polish
**Rationale:** Cross-org reputation only becomes useful when a second org onboards. Build after pilot validation with DameTuPataSV.
**Delivers:** Cross-org applicant reputation view (aggregate counts only, never notes/scores), configurable scoring weights per org, dashboard analytics, bulk application actions.
**Addresses:** Cross-org reputation, configurable scoring (differentiators)
**Avoids:** Cross-org privacy violations

### Phase Ordering Rationale

- **Foundation → Content → Workflow** follows the dependency chain: auth/tenancy is needed for everything, animals are needed for applications, applications are needed for scoring.
- **Notifications after workflow** because you need a working state machine to trigger events against.
- **Cross-org last** because it only has value with 2+ organizations — build after pilot validation.
- Each phase produces a demonstrable increment: Phase 1 = login works, Phase 2 = public site works, Phase 3 = adoptions work, Phase 4 = automation works, Phase 5 = multi-org works.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 3:** Scoring criteria for Latin American adoption context — sparse documentation, needs DameTuPataSV input
- **Phase 5:** Cross-org privacy/consent model — legal dimensions for Latin American users

Phases with standard patterns (skip research):
- **Phase 1:** NestJS + Prisma + RLS extensively documented
- **Phase 2:** S3 presigned URLs + Nuxt SSR well-documented
- **Phase 4:** Outbox pattern + EventEmitter2 standard

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All versions verified against npm registry and official sources 2026-04-08. Critical: Nuxt 4 not Nuxt 3. |
| Features | MEDIUM-HIGH | Competitor analysis solid. Scoring weights need real-world validation with DameTuPataSV. |
| Architecture | HIGH | RLS, presigned URLs, outbox pattern verified against AWS/Crunchy Data production documentation. |
| Pitfalls | HIGH | Six critical pitfalls with phase mappings and recovery cost estimates. |

**Overall confidence:** HIGH

### Gaps to Address

- **Scoring rule weights:** Defaults are educated guesses. Plan calibration sprint after first real applications from DameTuPataSV.
- **Prisma + RLS interaction:** Prisma doesn't natively manage RLS policies. Must be written as raw SQL migrations — needs phase-specific attention.
- **Cloud storage provider:** Cloudflare R2 vs AWS S3 cost comparison for photo-heavy platform. R2's zero egress fees likely win.
- **tus vs chunked uploads:** Decision needed in Phase 3 based on actual connection quality of pilot users in El Salvador.
- **n8n workflow design:** Standardized event payload schema needed in Phase 4 for DameTuPataSV's specific WhatsApp/email needs.

---
*Research completed: 2026-04-08*
*Ready for roadmap: yes*
