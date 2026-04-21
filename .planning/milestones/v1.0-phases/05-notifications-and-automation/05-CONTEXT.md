# Phase 5: Notifications and Automation - Context

**Gathered:** 2026-04-13
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers two capabilities:

1. **In-app notifications** — Adopters see a notification bell in the navbar listing their application status changes. Notifications are adopter-only; staff do not receive in-app notifications.

2. **Webhook outbox for n8n** — Key application events fire reliable webhook events to a configured n8n endpoint using the outbox pattern with idempotency keys and exponential backoff retry via BullMQ.

Scope is limited to notifications and webhook delivery. No email/WhatsApp content generation happens here — n8n handles that externally. No real-time push (SSE/WS) — simple polling on page load and bell click.
</domain>

<decisions>
## Implementation Decisions

### In-App Notification UI
- **D-01:** Bell icon in navbar + dropdown/list page for viewing all notifications
- **D-02:** No real-time push (SSE/WS) — use polling on page load and when user opens the bell
- **D-03:** Notifications are adopter-only — staff do not receive in-app notifications
- **D-04:** Notifications are generated for the adopter when their application status changes

### Webhook Delivery
- **D-05:** Outbox pattern — events write to a `webhook_outbox` table synchronously during the triggering action
- **D-06:** BullMQ worker processes the outbox queue with retries and exponential backoff
- **D-07:** Global single n8n endpoint configured via environment variable (consistent with "global n8n automation" key decision)
- **D-08:** Idempotency keys included in webhook payloads so n8n can deduplicate on its end

### Event Triggers
- **D-09:** Webhooks fire for these events:
  - Application submitted
  - Application status changed
  - Internal note added to application
  - Application scored (scoring engine completion)
  - Application withdrawn (adopter cancels)
  - Application returned (DEVUELTA status)
- **D-10:** Each event produces a consistent payload schema with application ID, adopter ID, org ID, event type, timestamp, and relevant metadata

### Notification Model
- **D-11:** A `Notification` Prisma model stores in-app notifications per adopter
- **D-12:** Notifications are created automatically when application status changes (same event that triggers webhooks)
- **D-13:** Spanish-first UI — all notification templates in Spanish (es-SV)

### Architecture
- **D-14:** Events are emitted synchronously within the application service methods (status transition, submit, score, note)
- **D-15:** Both notification creation and outbox insertion happen within the same Prisma `$transaction` as the triggering action (no lost events)
- **D-16:** No new microservice — notification and webhook logic lives in the existing backend modules

### Claude's Discretion
- Notification read/mark-as-read UX details (single mark, mark all as read)
- Exact outbox retry schedule (suggest: 30s, 2m, 10m, 30m, 2h, 6h)
- Bell icon visual design and interaction details
- Whether to add a notification preferences/settings UI (defer to v2 unless trivial)
</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — NOTF-01, NOTF-02, NOTF-03 (in-app notifications, webhook events, outbox pattern)

### Existing Architecture
- `backend/src/applications/applications.module.ts` — BullModule already registered, applications service is where events will be emitted
- `backend/src/scoring/scoring.module.ts` — BullMQ scoring processor — scoring completion is a webhook trigger event
- `backend/src/app.module.ts` — BullModule.forRoot configuration (Redis connection)
- `backend/prisma/schema.prisma` — Current schema for ApplicationStatus enum, AdoptionApplication model (extend with Notification relation)

### Roadmap
- `.planning/ROADMAP.md` — Phase 5 goal and success criteria
</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **BullMQ + Redis** — Already configured in app.module.ts with Redis connection. Used by scoring processor. Reuse for webhook worker.
- **Application service** — Already has status transition logic, state machine, and Prisma transactions. Events should be emitted here.
- **Scoring processor** — Already uses BullMQ to process scores asynchronously. Scoring completion event should trigger notification + webhook.

### Established Patterns
- **Prisma $transaction** — Used for multi-step operations (status changes, scoring). Notifications and outbox entries should be part of the same transaction.
- **Module pattern** — Each feature (applications, scoring, mail) has its own module with BullModule.registerQueue. New notification/webhook modules should follow this.
- **RLS policies** — All models have organization_id isolation. Notifications are user-scoped (adopter_id), outbox is system-scoped.

### Integration Points
- **Navbar component** — Bell icon needs to be added to the authenticated layout navbar
- **Adopter layout** — /notifications page needs to be added to adopter navigation
- **Application status transitions** — Existing status change methods in ApplicationsService need to emit events
- **Scoring processor** — After scoring completes, needs to emit score-ready event
</code_context>

<specifics>
## Specific Ideas

- Bell icon should be visible in the adopter layout, not just staff dashboard
- Notification list should be filterable by application (e.g., "your application for Max was approved")
- Webhook payload should be consistent across all event types so n8n workflows don't break on schema changes
- Consider a dead-letter mechanism for outbox entries that fail all retries
</specifics>

<deferred>
## Deferred Ideas

- Staff notification alerts — deferred to v2 (staff currently manage via dashboard polling)
- Per-org webhook configuration — global n8n only (key decision)
- Notification preferences/settings UI — defer to v2
- Push notifications (browser native) — defer to v2
- Email content generation — n8n handles this, not the platform
</deferred>

---

*Phase: 05-notifications-and-automation*
*Context gathered: 2026-04-13*
