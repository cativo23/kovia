# Phase 5: Notifications and Automation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-13
**Phase:** 05-notifications-and-automation
**Areas discussed:** In-App Notification UI, Webhook Delivery, Event Triggers, Notification Scope

---

## In-App Notification UI

| Option | Description | Selected |
|--------|-------------|----------|
| Bell icon + list | Notification bell in navbar, dropdown/list page showing all unread notifications. Simple polling on page load. No SSE/WS complexity. | ✓ |
| Bell icon + real-time | Bell icon with SSE or WebSocket for real-time push. More complex but instant updates without refresh. | |
| Dedicated page only | No bell icon — just a /notifications page in the adopter dashboard. User navigates to check. | |

**User's choice:** Bell icon + list (recommended)
**Notes:** Polling-based approach. Real-time push deferred.

## Webhook Delivery

| Option | Description | Selected |
|--------|-------------|----------|
| Outbox table + BullMQ worker | Events write to webhook_outbox table synchronously. A BullMQ worker processes them with retries + backoff. Reuses existing BullMQ/Redis infrastructure. | ✓ |
| Outbox table + cron job | Outbox table processed by a scheduled cron job. Simpler but less real-time. | |
| Direct fire-and-forget | Fire webhooks directly on event with a single retry. No outbox table. Fastest but least reliable. | |

**User's choice:** Outbox table + BullMQ worker (recommended)
**Notes:** Reuses existing BullMQ/Redis setup from Phase 4.

## Event Triggers

| Option | Description | Selected |
|--------|-------------|----------|
| Application submitted | When an adopter submits a new application | ✓ |
| Application status changed | When staff changes status | ✓ |
| Internal note added | When staff adds an internal note | ✓ |
| Application scored | When scoring engine completes | ✓ |
| Application withdrawn | When adopter withdraws | ✓ (Claude addition) |
| Application returned (DEVUELTA) | When application is returned | ✓ (Claude addition) |

**User's choice:** All events selected, plus two additional events (withdrawn, DEVUELTA) confirmed by user ("ok").

## Notification Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Adopter-only | Notifications are only for adopters about their own application status changes. Staff don't need in-app notifications. | ✓ |
| Adopter + staff alerts | Adopter notifications PLUS staff get notified when new applications arrive or scores are ready. | |

**User's choice:** Adopter-only (recommended)

## Claude's Discretion

- Notification read/mark-as-read UX details
- Exact outbox retry schedule (suggest: 30s, 2m, 10m, 30m, 2h, 6h)
- Bell icon visual design and interaction details
- Notification preferences/settings UI (defer to v2 unless trivial)

## Deferred Ideas

- Staff notification alerts — v2
- Per-org webhook configuration — out of scope (key decision: global n8n)
- Push notifications (browser native) — v2
- Email content generation — n8n responsibility
