# Roadmap: Kovia

## Milestones

- ✅ **v1.0 MVP** — Phases 1–5 (shipped 2026-04-21)
- 🔄 **v2.0 Automation, Auth & Adopter Experience** — Phases 6–10 (active)

## Phases

<details>
<summary>✅ v1.0 MVP (Phases 1–5) — SHIPPED 2026-04-21</summary>

- [x] Phase 1: Foundation (5/5 plans) — completed 2026-04-09
- [x] Phase 2: Animals and Public Listings (6/6 plans) — completed 2026-04-10
- [x] Phase 3: Adoption Applications (3/3 plans) — completed 2026-04-21
- [x] Phase 4: Scoring and Staff Tools (3/3 plans) — completed 2026-04-21
- [x] Phase 5: Notifications and Automation (2/2 plans) — completed 2026-04-21

Full details: `.planning/milestones/v1.0-ROADMAP.md`

</details>

### v2.0 — Automation, Auth & Adopter Experience

- [ ] **Phase 6: Queue Infrastructure & Email Jobs** — Emails sent as queued BullMQ jobs with typed Mailable classes and exponential backoff
- [ ] **Phase 7: Bull Board & Queue Observability** — Platform admin can monitor and manage all job queues from a protected dashboard
- [ ] **Phase 8: Google OAuth** — Users can authenticate with Google, with account linking for existing email accounts
- [ ] **Phase 9: Multi-Role Permissions** — Org admins can invite team members with granular STAFF/VIEWER roles enforced across the application
- [ ] **Phase 10: Adopter Dashboard** — Adopters can track all their applications, notifications, and history in one place

---

## Phase Details

### Phase 6: Queue Infrastructure & Email Jobs
**Goal**: All transactional emails are sent asynchronously as typed, retryable BullMQ jobs
**Depends on**: Phase 5 (BullMQ + Redis already running; webhook outbox pattern already established)
**Requirements**: QUEUE-01, QUEUE-02, QUEUE-03
**Success Criteria** (what must be TRUE):
  1. Submitting an application triggers a queued email job — the HTTP response does not wait for email delivery
  2. Each email type (welcome, application submitted, status changed) is a distinct Mailable class with its own template and data
  3. A job that fails (e.g., SMTP timeout) is automatically retried with exponential backoff up to the configured max attempts
  4. Failed jobs that exhaust retries appear in the BullMQ failed set and do not crash the worker process
**Plans**: 3 plans

Plans:
- [x] 06-01-PLAN.md — Mailable type system: Queueable interface, decorators, QueueableMail base, metadata reader, all 6 Mailable subclasses
- [x] 06-02-PLAN.md — BullMQ infrastructure: MailDispatcher, BaseMailProcessor hierarchy, MailModule with two named queues
- [x] 06-03-PLAN.md — Integration wiring: AuthService migration, EventsService email dispatches, NotificationsModule, 3 new Handlebars templates

### Phase 7: Bull Board & Queue Observability
**Goal**: Platform admin can observe all job queues, inspect failures, and manually retry jobs from a protected web UI
**Depends on**: Phase 6 (email queue must exist to be monitored)
**Requirements**: QUEUE-04, QUEUE-05
**Success Criteria** (what must be TRUE):
  1. Navigating to `/admin/queues` shows the Bull Board UI protected by HTTP basic auth — unauthenticated requests are rejected
  2. Both the `webhook` and `email` queues appear in the dashboard with live job counts (waiting, active, completed, failed)
  3. A failed job shows its error message and stack trace in the dashboard detail view
  4. Admin can click "Retry" on a failed job and see it move back to the active queue
**Plans**: TBD
**UI hint**: yes

### Phase 8: Google OAuth
**Goal**: Users can sign in or register with Google, with automatic account linking when the Google email matches an existing account
**Depends on**: Phase 6 (email queue needed for welcome email on new account creation via OAuth)
**Requirements**: AUTH-06, AUTH-07, AUTH-08
**Success Criteria** (what must be TRUE):
  1. A new visitor can click "Continuar con Google" on the login page and land on their adopter dashboard after Google authentication — no manual form fill required
  2. A new Google sign-in with no existing account automatically creates an adopter account using the Google profile data
  3. A user with an existing email/password account who signs in with the same Google email is logged into their existing account — no duplicate account is created
  4. After OAuth callback, the user session behaves identically to a regular email/password login (JWT + refresh cookie, same protected routes accessible)
**Plans**: TBD
**UI hint**: yes

### Phase 9: Multi-Role Permissions
**Goal**: Org admins can build a team with granular STAFF and VIEWER roles, enforced across all rescue operations
**Depends on**: Phase 8 (auth must be stable; Google OAuth users may need org roles)
**Requirements**: ROLES-01, ROLES-02, ROLES-03, ROLES-04, ROLES-05
**Success Criteria** (what must be TRUE):
  1. Org admin can invite a person by email, assigning them STAFF or VIEWER role — the invitee receives an invitation and lands in the team member list after accepting
  2. Org admin can change a team member's role or remove them from the team settings page
  3. A STAFF user can create/edit animals and process applications; action buttons are visible and functional
  4. A VIEWER user can browse animals and applications but create/edit/process action buttons are absent from the UI and the backend rejects those requests with 403
  5. Org admin can view the full team member list with each member's name, email, role, and join date
**Plans**: TBD
**UI hint**: yes

### Phase 10: Adopter Dashboard
**Goal**: Adopters have a dedicated space to track every application they have ever submitted, with status visibility and the ability to withdraw pending ones
**Depends on**: Phase 8 (Google OAuth — auth must be stable for adopter sessions), Phase 9 (RBAC guard updated — no role conflicts)
**Requirements**: ADOPTER-01, ADOPTER-02, ADOPTER-03, ADOPTER-04
**Success Criteria** (what must be TRUE):
  1. An adopter logging in sees a dashboard listing all their submitted applications with animal name, organization, submission date, and current status
  2. Clicking any application row opens the full application detail — the adopter can review what they submitted
  3. The adopter's notification history is accessible from the dashboard — all past status-change notifications appear in chronological order
  4. A pending application shows a "Retirar solicitud" button; clicking it withdraws the application and removes it from the active queue visible to the rescue
**Plans**: TBD
**UI hint**: yes

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation | v1.0 | 5/5 | Complete | 2026-04-09 |
| 2. Animals and Public Listings | v1.0 | 6/6 | Complete | 2026-04-10 |
| 3. Adoption Applications | v1.0 | 3/3 | Complete | 2026-04-21 |
| 4. Scoring and Staff Tools | v1.0 | 3/3 | Complete | 2026-04-21 |
| 5. Notifications and Automation | v1.0 | 2/2 | Complete | 2026-04-21 |
| 6. Queue Infrastructure & Email Jobs | v2.0 | 0/3 | Not started | - |
| 7. Bull Board & Queue Observability | v2.0 | 0/? | Not started | - |
| 8. Google OAuth | v2.0 | 0/? | Not started | - |
| 9. Multi-Role Permissions | v2.0 | 0/? | Not started | - |
| 10. Adopter Dashboard | v2.0 | 0/? | Not started | - |
