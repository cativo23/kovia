# Kovia — Smart Pet Adoption Platform

## What This Is

A centralized platform that helps animal rescues and shelters manage adoptions through structured workflows, applicant scoring, and tracking. It replaces the chaos of DMs, spreadsheets, and memory with a system designed to increase responsible adoptions and reduce animal suffering. Built web-first, Spanish-first, with DameTuPataSV (El Salvador) as the pilot organization.

## Core Value

The right pets get matched with the right people — every adoption decision is informed by structured data, scoring, and applicant history.

## Requirements

### Validated

- ✓ Public animal listings browsable without an account — Phase 2
- ✓ Structured adoption application with photos, housing, experience — Phase 3
- ✓ Rule-based applicant scoring (0-100) with risk levels and flags — Phase 4
- ✓ Rescue dashboard to manage animals, applications, and statuses — Phases 2–4
- ✓ Applicant accounts with history across organizations — Phase 4
- ✓ In-app notifications for status changes — Phase 5
- ✓ Webhook events for n8n automation (email + WhatsApp) — Phase 5
- ✓ Multi-tenant with organization isolation — Phase 1
- ✓ Admin-approved organization onboarding — Phase 1
- ✓ Photo uploads for applications and animal listings (cloud storage) — Phases 2–3
- ✓ Internal notes on applications for rescue staff — Phase 4

### Active

(None — all v1.0 requirements shipped)

### Out of Scope

- AI-based matching — deferred post-MVP, rule-based scoring first
- Direct Instagram/WhatsApp API integration — n8n handles external messaging
- Payment/donation system — not part of adoption workflow
- Mobile app — web-first, responsive design sufficient for MVP
- OAuth/social login — deferred to v2 (AUTH-05); email/password sufficient for MVP
- Per-org webhook configuration — global n8n automation managed by admin
- Multi-role permissions within orgs — single admin per org for MVP, roles added later

## Context

- **Pilot org:** DameTuPataSV (El Salvador) — independent rescue handling all pet types (dogs, cats, rabbits, birds, etc.)
- **Language:** Spanish-first UI, English as future addition
- **Problem:** Rescuers are overwhelmed by unstructured DMs, poor applicant tracking, and no way to identify repeat bad adopters. This leads to failed adoptions, animal returns, and rescuer burnout.
- **Scoring factors:** Housing situation, pet experience, environment photos, red flags (past returns, incomplete info, inconsistencies), lifestyle fit (work schedule, activity level), other pets/children compatibility, application completeness, response time
- **Animal model:** Generic across species — each animal has species, breed, age, size, energy level, compatibility attributes, photos, description, and status
- **Notifications:** In-app for adopters + n8n triggers email and WhatsApp externally
- **Public access:** Animal listings are fully public; account required only to submit applications

## Constraints

- **Tech stack:** NestJS 11 (backend), Nuxt 4 (frontend — Nuxt 3 EOL July 2026), PostgreSQL 16, Prisma 7 (ORM)
- **Multi-tenant:** All data isolated by organization_id with PostgreSQL RLS
- **Automation:** n8n via webhooks — no direct messaging API integrations
- **Deployment:** Docker-based, hosting TBD
- **Development:** Host has NO dependencies — all dev tooling runs via Docker (docker run, docker compose). No local Node.js, npm, etc.
- **Testing:** 80%+ code coverage for both frontend and backend. Tests must cover real logic, not pad coverage with non-testable fields.
- **Language:** Spanish-first UI (es-SV locale)
- **Project scaffolding:** All project init commands (nest new, nuxt init, etc.) run via docker run — never assume host has tools installed

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Admin-approved org onboarding | Control platform quality during early growth | ✓ Shipped Phase 1 |
| Adopters must create accounts | Enables applicant history tracking and scoring across orgs | ✓ Shipped Phase 1 |
| Single admin per org (MVP) | Most rescues are 1-person operations; roles added later | ✓ Shipped Phase 1 |
| Spanish-first | Pilot org is in El Salvador; English added post-MVP | ✓ Shipped Phase 1 |
| Global n8n automation | Simpler architecture; per-org config deferred | ✓ Shipped Phase 5 — webhook outbox with BullMQ + exponential backoff |
| Rule-based scoring only | Simpler to build, validate, and debug than AI-based | ✓ Shipped Phase 4 — 50+ tests, transparent rule breakdown |
| Cloud storage for photos | Applications require environment photos; need reliable hosting | ✓ Shipped Phase 2 — MinIO with presigned URLs |
| Generic animal model | Platform supports all pet types, not just dogs/cats | ✓ Shipped Phase 2 |
| Nuxt 4 instead of Nuxt 3 | Nuxt 3 EOL July 2026 — starting greenfield on it would require immediate migration | ✓ Shipped Phase 1 |
| OAuth (Google) | Simplifies adopter onboarding, reduces friction | Moved to v2 — route partially wired but not implemented in v1 |
| Docker-only development | Host has no dependencies — all tooling via Docker | ✓ All phases — never required host Node.js |
| 80%+ test coverage | Both frontend and backend, meaningful tests only | ✓ 28 unit tests (Phase 5), 50+ (Phase 4), full coverage across phases |

---
*Last updated: 2026-04-21 after v1.0 milestone close*
