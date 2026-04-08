# Roadmap: Kovia

## Overview

Kovia delivers a multi-tenant pet adoption platform in five phases following the dependency chain: authentication and tenancy first (everything depends on it), then animal content and public listings (first visible output), then the adoption application flow (adopter-facing), then scoring and staff tools (staff-facing evaluation layer), and finally notifications and automation (wraps the experience with event-driven communication). Each phase produces a demonstrable increment: login works, public site works, applications work, staff evaluation works, automation works.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Auth, organization management, multi-tenant isolation, and dev infrastructure
- [ ] **Phase 2: Animals and Public Listings** - Animal profiles, photo uploads, SSR public listings, and org landing pages
- [ ] **Phase 3: Adoption Applications** - Multi-step application form, photo uploads, state machine, and application queue
- [ ] **Phase 4: Scoring and Staff Tools** - Rule-based scoring engine, staff dashboard, internal notes, and applicant history
- [ ] **Phase 5: Notifications and Automation** - In-app notifications, webhook outbox, and n8n integration

## Phase Details

### Phase 1: Foundation
**Goal**: Users can create accounts (email/password or Google OAuth), organizations can onboard via admin invite, and all data is tenant-isolated from day one
**Depends on**: Nothing (first phase)
**Requirements**: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ORG-01, ORG-02, ORG-03, ORG-04, INFR-01, INFR-02, INFR-03
**Success Criteria** (what must be TRUE):
  1. User can sign up, verify email, log in, and stay logged in across browser refreshes
  2. User can reset a forgotten password via email link
  3. Platform admin can invite an organization, org admin onboards via invite link, and the org has a profile page
  4. Data created by one organization is invisible to another organization (RLS enforced)
  5. The entire stack runs locally via `docker compose up` with Spanish as the default UI language
**Plans**: 5 plans

Plans:
- [ ] 01-01-PLAN.md — Docker Compose infrastructure, NestJS + Nuxt scaffold, Prisma schema with RLS
- [ ] 01-02-PLAN.md — Auth backend: register, verify, login, reset, refresh, Google OAuth, email queue
- [ ] 01-03-PLAN.md — Auth frontend: pages, Pinia store, API client, layouts, i18n, frontend unit tests
- [ ] 01-04-PLAN.md — Org management, admin panel, invite flow, audit log, RLS integration tests
- [ ] 01-05-PLAN.md — E2E tests: Playwright auth flows (frontend) + backend auth E2E specs

### Phase 2: Animals and Public Listings
**Goal**: Rescue staff can manage animal profiles with photos, and anyone on the internet can browse available animals without an account
**Depends on**: Phase 1
**Requirements**: ANIM-01, ANIM-02, ANIM-03, ANIM-04, LIST-01, LIST-02, LIST-03, LIST-04, LIST-05, DASH-01
**Success Criteria** (what must be TRUE):
  1. Rescue staff can create an animal profile with species, breed, age, size, energy level, compatibility attributes, and multiple photos
  2. Rescue staff can transition an animal through the status lifecycle (available, in process, adopted) from the dashboard
  3. A visitor without an account can browse and filter animals by species, size, age, and organization
  4. Public animal listing pages are server-side rendered and include Open Graph meta tags (verifiable via curl/view-source)
  5. Each organization has a public landing page showing only their available animals
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Adoption Applications
**Goal**: Adopters can submit structured applications for specific animals, and rescue staff can view the application queue
**Depends on**: Phase 2
**Requirements**: ADOP-01, ADOP-02, ADOP-03, ADOP-04, ADOP-05, ADOP-06
**Success Criteria** (what must be TRUE):
  1. Logged-in adopter can complete and submit a multi-step application for a specific animal, including personal info, housing details, and environment photos
  2. A partially completed application survives a page refresh or connection drop (localStorage persistence)
  3. Application status transitions follow the defined state machine (submitted, reviewing, approved, rejected, follow-up, adopted, withdrawn)
  4. Rescue staff can view all applications for a specific animal, sorted and filtered by status
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Scoring and Staff Tools
**Goal**: Every application is automatically scored with transparent reasoning, and staff have a complete dashboard to evaluate applicants using scores, history, and internal notes
**Depends on**: Phase 3
**Requirements**: SCOR-01, SCOR-02, SCOR-03, SCOR-04, SCOR-05, SCOR-06, DASH-02, DASH-03, DASH-04, DASH-05, HIST-01, HIST-02, HIST-03
**Success Criteria** (what must be TRUE):
  1. Every submitted application receives a score (0-100) with a risk level (low, medium, high) and a visible rule-by-rule breakdown
  2. System flags red flags (incomplete info, inconsistencies, past returns) and displays them prominently to staff
  3. Staff can view all applications per animal with scores and risk levels, update application status, and add internal notes visible only within their org
  4. Staff can view an adopter's full application history across past applications to their org, including adoption outcomes (successful, returned, withdrawn)
  5. Scores are advisory -- staff can approve a low-scoring applicant or reject a high-scoring one
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: Notifications and Automation
**Goal**: Adopters are notified of status changes in-app, and external automation (email, WhatsApp via n8n) is triggered reliably via webhooks
**Depends on**: Phase 4
**Requirements**: NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. Adopter sees an in-app notification when their application status changes
  2. Key actions (application submitted, status changed) fire webhook events to a configured n8n endpoint
  3. Webhook delivery is reliable: uses outbox pattern with idempotency keys and retries with exponential backoff (no lost events)
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 3/5 | In Progress|  |
| 2. Animals and Public Listings | 0/3 | Not started | - |
| 3. Adoption Applications | 0/2 | Not started | - |
| 4. Scoring and Staff Tools | 0/3 | Not started | - |
| 5. Notifications and Automation | 0/2 | Not started | - |
