# Requirements: Kovia

**Defined:** 2026-04-08
**Core Value:** The right pets get matched with the right people — every adoption decision is informed by structured data, scoring, and applicant history.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Authentication

- [x] **AUTH-01**: User can sign up with email and password
- [x] **AUTH-02**: User receives email verification after signup
- [x] **AUTH-03**: User can reset password via email link
- [x] **AUTH-04**: User session persists across browser refresh (JWT + refresh tokens)
- [x] **AUTH-05**: User can sign in with OAuth (Google) to simplify onboarding

### Organization Management

- [ ] **ORG-01**: Organization has a profile with name, description, logo, and contact info
- [ ] **ORG-02**: Platform admin can approve or reject organization registration requests
- [ ] **ORG-03**: Each organization has a single admin who manages all org data
- [ ] **ORG-04**: All organization data is isolated via multi-tenant RLS policies

### Animal Management

- [ ] **ANIM-01**: Rescue staff can create, edit, and delete animal profiles
- [ ] **ANIM-02**: Animal profile includes species, breed, age, size, energy level, and compatibility attributes
- [ ] **ANIM-03**: Rescue staff can upload multiple photos per animal (cloud storage with presigned URLs)
- [ ] **ANIM-04**: Animal has a status lifecycle: available → in process → adopted (with manual transitions)

### Adoption Workflow

- [ ] **ADOP-01**: Adopter can submit a structured multi-step application for a specific animal
- [ ] **ADOP-02**: Application form has mandatory fields (personal info, housing) and optional fields (social media, additional context)
- [ ] **ADOP-03**: Application requires environment photo uploads
- [ ] **ADOP-04**: Application form state persists in localStorage (survives connection drops and page refresh)
- [ ] **ADOP-05**: Application status follows a state machine: submitted → reviewing → approved/rejected/follow-up → adopted/withdrawn
- [ ] **ADOP-06**: Rescue staff can view and filter/sort the application queue per animal

### Scoring & Screening

- [ ] **SCOR-01**: System generates a rule-based score (0-100) for each submitted application
- [ ] **SCOR-02**: Score produces a risk level classification: low, medium, or high
- [ ] **SCOR-03**: Score breakdown by rule is visible to rescue staff (transparency)
- [ ] **SCOR-04**: System flags red flags: incomplete info, inconsistencies, past animal returns
- [ ] **SCOR-05**: Scoring rules include: housing situation, pet experience, environment photos, lifestyle fit, compatibility, completeness, and red flags
- [ ] **SCOR-06**: Scores are advisory — staff can override and make final decisions regardless of score

### Staff Dashboard

- [ ] **DASH-01**: Rescue staff can view and manage all animals for their organization
- [ ] **DASH-02**: Rescue staff can view all applications per animal with scores and risk levels
- [ ] **DASH-03**: Rescue staff can update application status from the dashboard
- [ ] **DASH-04**: Rescue staff can add internal notes to any application (visible only within their org)
- [ ] **DASH-05**: Rescue staff can view an adopter's past applications and adoption outcomes

### Public Listings

- [ ] **LIST-01**: Anyone can browse available animals without creating an account
- [ ] **LIST-02**: Public listings can be filtered by species, size, age, and organization
- [ ] **LIST-03**: Public listing pages are server-side rendered for SEO
- [ ] **LIST-04**: Animal detail pages include Open Graph meta tags for social media sharing
- [ ] **LIST-05**: Each organization has a public landing page showing their available animals

### Notifications & Automation

- [ ] **NOTF-01**: Adopter receives in-app notifications when their application status changes
- [ ] **NOTF-02**: System fires webhook events to n8n when key actions occur (application submitted, status changed)
- [ ] **NOTF-03**: Webhook delivery uses outbox pattern with idempotency keys and exponential backoff retry

### Applicant History

- [ ] **HIST-01**: System stores all past applications per adopter across organizations
- [ ] **HIST-02**: Adoption outcomes (successful, returned, withdrawn) are tracked per application
- [ ] **HIST-03**: Past return flags are visible to rescue staff reviewing new applications from the same adopter

### Infrastructure

- [x] **INFR-01**: Application is containerized with Docker and Docker Compose for local development
- [x] **INFR-02**: UI is Spanish-first (es-SV locale) with i18n infrastructure for future languages
- [x] **INFR-03**: Multi-tenant data isolation enforced at database level via PostgreSQL Row-Level Security

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Cross-Organization

- **XORG-01**: Adopter reputation visible across organizations (aggregate adoption/return counts only)
- **XORG-02**: Internal notes and individual scores never shared across organizations

### Advanced Scoring

- **ASCR-01**: Per-organization configurable scoring weights
- **ASCR-02**: AI-assisted scoring suggestions

### Enhanced Dashboard

- **EDSH-01**: Dashboard analytics (approval rates, time-to-adopt, application volume)
- **EDSH-02**: Bulk application actions (approve/reject multiple)

### Permissions

- **PERM-01**: Multi-role support within organizations (admin, volunteer, reviewer)
- **PERM-02**: Role-based access control for dashboard features

### Additional Auth

- **AAUT-01**: Magic link login (passwordless)
- **AAUT-02**: Additional OAuth providers (Facebook, Apple)

## Out of Scope

| Feature | Reason |
|---------|--------|
| AI-based matching | Deferred post-MVP — rule-based scoring first, validate with real data |
| Direct Instagram/WhatsApp API | n8n handles external messaging — avoids API complexity and costs |
| Payment/donation system | PCI compliance burden, not part of adoption decision workflow |
| Mobile native app | Responsive web sufficient for MVP — mobile app post-validation |
| Medical records | Different domain (veterinary) — avoid scope creep |
| Built-in chat | WhatsApp already exists in target market — don't compete |
| Volunteer management | Not core to adoption workflow — defer to v2+ |
| Foster matching | Different workflow from direct adoption — separate product concern |
| Petfinder/external syndication | Market focus is Latin America where Petfinder isn't relevant |
| Per-org webhook configuration | Global n8n automation managed by platform admin for MVP |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 1 | Complete |
| AUTH-02 | Phase 1 | Complete |
| AUTH-03 | Phase 1 | Complete |
| AUTH-04 | Phase 1 | Complete |
| AUTH-05 | Phase 1 | Complete |
| ORG-01 | Phase 1 | Pending |
| ORG-02 | Phase 1 | Pending |
| ORG-03 | Phase 1 | Pending |
| ORG-04 | Phase 1 | Pending |
| ANIM-01 | Phase 2 | Pending |
| ANIM-02 | Phase 2 | Pending |
| ANIM-03 | Phase 2 | Pending |
| ANIM-04 | Phase 2 | Pending |
| ADOP-01 | Phase 3 | Pending |
| ADOP-02 | Phase 3 | Pending |
| ADOP-03 | Phase 3 | Pending |
| ADOP-04 | Phase 3 | Pending |
| ADOP-05 | Phase 3 | Pending |
| ADOP-06 | Phase 3 | Pending |
| SCOR-01 | Phase 4 | Pending |
| SCOR-02 | Phase 4 | Pending |
| SCOR-03 | Phase 4 | Pending |
| SCOR-04 | Phase 4 | Pending |
| SCOR-05 | Phase 4 | Pending |
| SCOR-06 | Phase 4 | Pending |
| DASH-01 | Phase 2 | Pending |
| DASH-02 | Phase 4 | Pending |
| DASH-03 | Phase 4 | Pending |
| DASH-04 | Phase 4 | Pending |
| DASH-05 | Phase 4 | Pending |
| LIST-01 | Phase 2 | Pending |
| LIST-02 | Phase 2 | Pending |
| LIST-03 | Phase 2 | Pending |
| LIST-04 | Phase 2 | Pending |
| LIST-05 | Phase 2 | Pending |
| NOTF-01 | Phase 5 | Pending |
| NOTF-02 | Phase 5 | Pending |
| NOTF-03 | Phase 5 | Pending |
| HIST-01 | Phase 4 | Pending |
| HIST-02 | Phase 4 | Pending |
| HIST-03 | Phase 4 | Pending |
| INFR-01 | Phase 1 | Complete |
| INFR-02 | Phase 1 | Complete |
| INFR-03 | Phase 1 | Complete |

**Coverage:**
- v1 requirements: 44 total
- Mapped to phases: 44
- Unmapped: 0

---
*Requirements defined: 2026-04-08*
*Last updated: 2026-04-08 after roadmap creation*
