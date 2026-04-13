# Phase 1: Foundation - Context

**Gathered:** 2026-04-08
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create accounts (email/password or Google OAuth), verify their email, and reset their password. Platform admin can invite organizations, manage users, and view platform stats. Invited orgs fill out their profile and are immediately active. All data is tenant-isolated via PostgreSQL RLS. The entire stack runs locally via Docker Compose with Spanish as the default UI language.

Requirements: AUTH-01, AUTH-02, AUTH-03, AUTH-04, AUTH-05, ORG-01, ORG-02, ORG-03, ORG-04, INFR-01, INFR-02, INFR-03

</domain>

<decisions>
## Implementation Decisions

### Auth Experience
- Magic link redirect for email verification: user clicks link in email, automatically verified + logged in
- Magic link redirect for password reset: user clicks link, lands on "set new password" form
- Google OAuth is prominent and equal to email/password — both are first-class signup/login options
- Single login page for all roles (adopters and org admins) — route based on role after login
- Everyone starts as an adopter by default — org admin role acquired through invite flow, not signup
- Profile data for OAuth users collected at first application, not during signup (no friction at onboarding)
- Expired verification/reset links show "link expired" with a one-click "send new link" button (auto-resend)
- Token storage: Claude's discretion, prioritize most secure approach for web

### Org Onboarding
- Invite-only model: platform admin invites orgs (no self-registration)
- Flow: admin generates invite link → org admin clicks link → creates account → fills org profile → immediately active
- Org profile fields: name, description, logo, contact email, phone, social media links (Instagram, Facebook, WhatsApp)
- Invite links expire after 7 days, resendable from admin panel
- Org can be soft-deactivated by platform admin (animals hidden from public listings, data preserved, reactivatable)
- Strictly one admin per org for MVP (multi-role deferred to v2 per PERM-01, PERM-02)

### Platform Admin
- Separate `/admin` route with its own layout
- First registered user automatically becomes platform admin
- Admin dashboard shows: org list (active/inactive), pending invites, platform stats (total users, animals, applications, recent activity)
- Separate roles: platform admin manages the platform, cannot impersonate or access org dashboards — must use a separate org admin account for DameTuPataSV
- Full user management: view all adopters, soft-deactivate (reversible), permanent delete (with confirmation)
- Deactivating a user auto-withdraws their active applications (marked "withdrawn — user deactivated")
- Basic activity audit log for admin actions: org invited, org activated/deactivated, user deactivated/deleted

### Project Structure
- Flat monorepo: `/backend` (NestJS 11 + Prisma 7) and `/frontend` (Nuxt 4) at project root
- Docker Compose services: API, Web, PostgreSQL 16, Redis, Mailpit (email catcher for dev)
- Vitest as test runner for both frontend and backend
- Playwright for E2E tests from Phase 1 (covering auth flows)
- Swagger/OpenAPI via NestJS decorators at `/api/docs`
- Nuxt UI (Tailwind-based) as component library
- Pinia for frontend state management
- 80%+ code coverage for both FE/BE (meaningful tests, no padding)

### Email Templates
- Warm and friendly tone in Spanish: "¡Hola! Verificá tu cuenta para empezar a adoptar."
- Simple branded HTML: logo at top, clean layout, brand colors — not overly designed
- All emails in Spanish (es-SV) for MVP — English added when platform expands
- Org invite email is contextual: explains what Kovia is, that they've been invited, and step-by-step instructions

### Claude's Discretion
- JWT token storage strategy (prioritize security)
- Email template HTML implementation details
- Loading states and error handling UX
- i18n key structure and translation file format
- RLS policy implementation details
- Redis usage patterns (sessions, cache, queues)

</decisions>

<specifics>
## Specific Ideas

- Org onboarding is invite-only because the platform admin (user) personally vets each organization before inviting them — no approval queue needed
- User said "You choose the most secure please" for token storage — security is the top priority for auth implementation
- Platform admin is also the org admin for DameTuPataSV but uses separate accounts/roles — no super-admin blurring
- Mailpit chosen for dev email catching so verification/reset flows can be tested visually without real email sending

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- None — greenfield project, no existing code

### Established Patterns
- None yet — Phase 1 establishes all foundational patterns

### Integration Points
- Docker Compose is the entry point: `docker compose up` starts everything
- All project scaffolding must happen via `docker run` (host has no Node.js, npm, etc.)
- PostgreSQL RLS policies must be established in first migration — retrofitting requires full audit (per STATE.md)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-04-08*
